import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DownloadTask, AudioQuality, Song } from "@/types";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";
import {
  buildAudioFileName,
  buildBrowserDownloadName,
  buildDownloadPathHint,
  getDownloadDirectoryHint,
  guessAudioExtension,
  isSongUrlUsable,
  triggerBlobDownload,
  triggerUrlDownload,
} from "@/lib/download";

const DEFAULT_QUALITY: AudioQuality = "exhigh";
const downloadControllers = new Map<string, AbortController>();

const createTaskId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildSourceKey = (songId: string, platform: unknown) => {
  const normalizedPlatform = String(platform || "QQ").trim().toUpperCase() || "QQ";
  return `${normalizedPlatform}::${songId}`;
};

const resolveSongForDownload = async (song: Song): Promise<Song | null> => {
  if (isSongUrlUsable(song.songUrl)) return song;

  try {
    const detail = await searchApi.getSongDetail(String(song.platform || "QQ"), song.songId);
    if (!isSongUrlUsable(detail.songUrl)) {
      toast.error(`歌曲 ${song.songTitle || song.songId} 暂不支持下载`);
      return null;
    }
    return { ...song, ...detail, songUrl: detail.songUrl };
  } catch (error) {
    console.error("获取下载链接失败:", error);
    toast.error(`获取歌曲下载地址失败：${song.songTitle || song.songId}`);
    return null;
  }
};

interface DownloadState {
  queue: DownloadTask[];
  completed: DownloadTask[];
  currentDownload: DownloadTask | null;
  dailyLimit: number;
  usedCount: number;
  downloadRootHint: string;

  addDownload: (
    task: Omit<DownloadTask, "id" | "progress" | "status" | "createTime">,
  ) => void;
  downloadSong: (song: Song, quality?: AudioQuality) => Promise<void>;
  startNextDownload: () => void;
  startDownloadById: (id: string) => Promise<void>;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearQueue: () => void;
  updateProgress: (id: string, progress: number, downloadedSize?: number, totalSize?: number) => void;
  completeDownload: (id: string, downloadedSize?: number, totalSize?: number) => void;
  failDownload: (id: string, error: string) => void;
  setDailyLimit: (limit: number, used: number) => void;
  incrementUsedCount: () => void;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      queue: [],
      completed: [],
      currentDownload: null,
      dailyLimit: 10,
      usedCount: 0,
      downloadRootHint: getDownloadDirectoryHint(),

      addDownload: (task) => {
        const { usedCount, dailyLimit, queue, completed } = get();
        if (usedCount >= dailyLimit) {
          toast.error("今日下载次数已达上限");
          return;
        }

        const sourceKey = task.sourceKey || `${task.type}::${task.name}`;
        const duplicatedInQueue = queue.some((item) => item.sourceKey === sourceKey);
        if (duplicatedInQueue) {
          toast("该歌曲已在下载队列中");
          return;
        }

        const duplicatedInCompleted = completed.some((item) => item.sourceKey === sourceKey);
        if (duplicatedInCompleted) {
          toast("该歌曲已下载");
          return;
        }

        const newTask: DownloadTask = {
          ...task,
          sourceKey,
          id: createTaskId(),
          progress: 0,
          status: "pending",
          downloadedSize: 0,
          createTime: new Date().toISOString(),
        };

        set((state) => ({ queue: [...state.queue, newTask] }));
        toast.success(`已加入下载队列：${task.name}`);
        get().startNextDownload();
      },

      downloadSong: async (song, quality = DEFAULT_QUALITY) => {
        const resolvedSong = await resolveSongForDownload(song);
        if (!resolvedSong || !isSongUrlUsable(resolvedSong.songUrl)) return;

        const extension = guessAudioExtension(resolvedSong.songUrl);
        const fileName = buildAudioFileName(
          {
            songTitle: resolvedSong.songTitle,
            singerName: resolvedSong.singerName,
          },
          extension,
        );
        const sourceKey = buildSourceKey(resolvedSong.songId, resolvedSong.platform);

        get().addDownload({
          name: resolvedSong.songTitle || resolvedSong.songId,
          type: "song",
          cover: resolvedSong.songImg || resolvedSong.cover || "",
          url: resolvedSong.songUrl,
          quality,
          songId: resolvedSong.songId,
          platform: resolvedSong.platform,
          sourceKey,
          fileName,
          savePath: buildDownloadPathHint(fileName),
        });
      },

      startNextDownload: () => {
        const { currentDownload, queue } = get();
        if (currentDownload) return;

        const nextTask = queue.find((task) => task.status === "pending");
        if (!nextTask) return;

        void get().startDownloadById(nextTask.id);
      },

      startDownloadById: async (id) => {
        const { currentDownload, queue } = get();
        if (currentDownload && currentDownload.id !== id) return;

        const targetTask = queue.find((task) => task.id === id);
        if (!targetTask) return;

        if (targetTask.status === "downloading") return;
        if (!isSongUrlUsable(targetTask.url)) {
          get().failDownload(id, "下载链接无效");
          get().startNextDownload();
          return;
        }

        const controller = new AbortController();
        downloadControllers.set(id, controller);

        set((state) => ({
          queue: state.queue.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "downloading",
                  error: undefined,
                }
              : task,
          ),
          currentDownload: state.queue.find((task) => task.id === id) || null,
        }));

        const task = get().queue.find((item) => item.id === id);
        const fallbackFileName =
          task?.fileName || buildAudioFileName({ songTitle: task?.name, singerName: "" }, "mp3");

        try {
          const response = await fetch(task?.url || "", {
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const contentType = response.headers.get("content-type") || "";
          const totalSizeHeader = response.headers.get("content-length");
          const totalSize = totalSizeHeader ? Number(totalSizeHeader) : undefined;
          const extension = guessAudioExtension(task?.url, contentType);
          const fileName =
            task?.fileName ||
            buildAudioFileName(
              {
                songTitle: task?.name,
                singerName: "",
              },
              extension,
            );

          if (!response.body) {
            const blob = await response.blob();
            triggerBlobDownload(blob, buildBrowserDownloadName(fileName));
            get().completeDownload(id, blob.size, blob.size);
            toast.success(`下载完成：${task?.name || fileName}`);
            return;
          }

          const reader = response.body.getReader();
          const chunks: BlobPart[] = [];
          let downloadedSize = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            const chunk = new Uint8Array(value);
            chunks.push(chunk.buffer);
            downloadedSize += chunk.byteLength;

            const progress = totalSize
              ? Math.min(99, Math.round((downloadedSize / totalSize) * 100))
              : 0;
            get().updateProgress(id, progress, downloadedSize, totalSize);
          }

          const blob = new Blob(chunks, {
            type: contentType || "audio/mpeg",
          });
          triggerBlobDownload(blob, buildBrowserDownloadName(fileName));
          get().completeDownload(id, blob.size, totalSize || blob.size);
          toast.success(`下载完成：${task?.name || fileName}`);
        } catch (error) {
          const latestTask = get().queue.find((item) => item.id === id);
          if (!latestTask) return;

          if (controller.signal.aborted && latestTask.status === "paused") {
            return;
          }

          // 某些跨域场景无法 fetch blob，兜底改为浏览器直链下载。
          try {
            triggerUrlDownload(latestTask.url, buildBrowserDownloadName(latestTask.fileName || fallbackFileName));
            get().completeDownload(id);
            toast.success(`已触发浏览器下载：${latestTask.name}`);
          } catch (fallbackError) {
            console.error("下载失败:", error, fallbackError);
            const message = error instanceof Error ? error.message : "下载失败";
            get().failDownload(id, message);
            toast.error(`下载失败：${latestTask.name}`);
          }
        } finally {
          downloadControllers.delete(id);
          set((state) => ({
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
          }));
          get().startNextDownload();
        }
      },

      pauseDownload: (id) => {
        const controller = downloadControllers.get(id);
        if (controller) {
          set((state) => ({
            queue: state.queue.map((task) =>
              task.id === id ? { ...task, status: "paused" } : task,
            ),
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
          }));
          controller.abort();
          downloadControllers.delete(id);
          get().startNextDownload();
          return;
        }

        set((state) => ({
          queue: state.queue.map((task) =>
            task.id === id ? { ...task, status: "paused" } : task,
          ),
        }));
      },

      resumeDownload: (id) => {
        set((state) => {
          const taskIndex = state.queue.findIndex((task) => task.id === id);
          if (taskIndex < 0) return state;

          const nextTask = {
            ...state.queue[taskIndex],
            status: "pending" as const,
            progress: 0,
            downloadedSize: 0,
            error: undefined,
          };
          const nextQueue = [...state.queue];
          nextQueue.splice(taskIndex, 1);
          nextQueue.unshift(nextTask);
          return { queue: nextQueue };
        });

        get().startNextDownload();
      },

      retryDownload: (id) => {
        set((state) => {
          const taskIndex = state.queue.findIndex((task) => task.id === id);
          if (taskIndex < 0) return state;

          const nextTask = {
            ...state.queue[taskIndex],
            status: "pending" as const,
            progress: 0,
            downloadedSize: 0,
            error: undefined,
          };
          const nextQueue = [...state.queue];
          nextQueue.splice(taskIndex, 1);
          nextQueue.unshift(nextTask);
          return { queue: nextQueue };
        });

        get().startNextDownload();
      },

      removeDownload: (id) => {
        const controller = downloadControllers.get(id);
        if (controller) {
          controller.abort();
          downloadControllers.delete(id);
        }

        set((state) => ({
          queue: state.queue.filter((task) => task.id !== id),
          completed: state.completed.filter((task) => task.id !== id),
          currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
        }));

        get().startNextDownload();
      },

      clearQueue: () => {
        const { queue } = get();
        queue.forEach((task) => {
          const controller = downloadControllers.get(task.id);
          if (controller) {
            controller.abort();
            downloadControllers.delete(task.id);
          }
        });

        set({
          queue: [],
          currentDownload: null,
        });
      },

      updateProgress: (id, progress, downloadedSize, totalSize) => {
        set((state) => ({
          queue: state.queue.map((task) =>
            task.id === id
              ? {
                  ...task,
                  progress,
                  downloadedSize: downloadedSize ?? task.downloadedSize,
                  totalSize: totalSize ?? task.totalSize,
                  status: "downloading",
                }
              : task,
          ),
          currentDownload:
            state.currentDownload?.id === id
              ? {
                  ...state.currentDownload,
                  progress,
                  downloadedSize: downloadedSize ?? state.currentDownload.downloadedSize,
                  totalSize: totalSize ?? state.currentDownload.totalSize,
                  status: "downloading",
                }
              : state.currentDownload,
        }));
      },

      completeDownload: (id, downloadedSize, totalSize) => {
        set((state) => {
          const task = state.queue.find((item) => item.id === id);
          if (!task) return state;

          const completedTask: DownloadTask = {
            ...task,
            status: "completed",
            progress: 100,
            downloadedSize: downloadedSize ?? task.downloadedSize,
            totalSize: totalSize ?? task.totalSize,
          };

          return {
            queue: state.queue.filter((item) => item.id !== id),
            completed: [completedTask, ...state.completed],
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
            usedCount: state.usedCount + 1,
          };
        });
      },

      failDownload: (id, error) => {
        set((state) => ({
          queue: state.queue.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "error",
                  error,
                }
              : task,
          ),
          currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
        }));
      },

      setDailyLimit: (limit, used) => {
        set({ dailyLimit: limit, usedCount: used });
      },

      incrementUsedCount: () => {
        set((state) => ({ usedCount: state.usedCount + 1 }));
      },
    }),
    {
      name: "download-storage",
      partialize: (state) => ({
        queue: state.queue,
        completed: state.completed,
        dailyLimit: state.dailyLimit,
        usedCount: state.usedCount,
      }),
    },
  ),
);
