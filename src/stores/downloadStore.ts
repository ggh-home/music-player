import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import {
  AudioQuality,
  DownloadCapabilityMode,
  DownloadQueueStatus,
  DownloadTask,
  Song,
} from "@/types";
import { downloadDirectoryAdapter } from "@/lib/download/directoryAdapter";
import { DownloadLimitReachedError, executeDownloadTask } from "@/lib/download/orchestrator";
import { downloadService } from "@/lib/download/service";
import {
  buildAudioFileName,
  buildDirectoryPathLabel,
  buildDownloadPathHint,
  getDownloadDirectoryHint,
  isAbortError,
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

type DownloadTaskInput = Omit<DownloadTask, "id" | "progress" | "status" | "createTime">;

interface PrepareEnqueueResult {
  nextQueue: DownloadTask[];
  addedTasks: DownloadTask[];
  skippedQueued: number;
  skippedCompleted: number;
  skippedInBatch: number;
}

const createDownloadTaskInput = (
  song: Song,
  quality: AudioQuality,
): DownloadTaskInput => {
  const fileName = buildAudioFileName(
    {
      songTitle: song.songTitle,
      singerName: song.singerName,
    },
    "mp3",
  );
  const sourceKey = buildSourceKey(song.songId, song.platform);

  return {
    name: song.songTitle || song.name || song.songId,
    singerName: song.singerName || song.singer || "",
    type: song.songType === "sound" ? "audiobook" : "song",
    cover: song.songImg || song.cover || "",
    quality,
    songId: song.songId,
    platform: song.platform,
    songType: song.songType === "sound" ? "sound" : "music",
    sourceKey,
    fileName,
    savePath: buildDownloadPathHint(fileName),
  };
};

const prepareEnqueueTasks = (
  queue: DownloadTask[],
  completed: DownloadTask[],
  tasks: DownloadTaskInput[],
): PrepareEnqueueResult => {
  const nextQueue = [...queue];
  const queueKeys = new Set(
    queue.map((task) => task.sourceKey || `${task.type}::${task.name}`),
  );
  const completedKeys = new Set(
    completed.map((task) => task.sourceKey || `${task.type}::${task.name}`),
  );
  const batchKeys = new Set<string>();
  const addedTasks: DownloadTask[] = [];

  let skippedQueued = 0;
  let skippedCompleted = 0;
  let skippedInBatch = 0;

  for (const task of tasks) {
    const sourceKey = task.sourceKey || `${task.type}::${task.name}`;

    if (batchKeys.has(sourceKey)) {
      skippedInBatch += 1;
      continue;
    }
    batchKeys.add(sourceKey);

    if (queueKeys.has(sourceKey)) {
      skippedQueued += 1;
      continue;
    }

    if (completedKeys.has(sourceKey)) {
      skippedCompleted += 1;
      continue;
    }

    const nextTask: DownloadTask = {
      ...task,
      sourceKey,
      id: createTaskId(),
      progress: 0,
      status: "pending",
      downloadedSize: 0,
      createTime: new Date().toISOString(),
    };

    addedTasks.push(nextTask);
    nextQueue.push(nextTask);
    queueKeys.add(sourceKey);
  }

  return {
    nextQueue,
    addedTasks,
    skippedQueued,
    skippedCompleted,
    skippedInBatch,
  };
};

const normalizeTaskForHydration = (task: DownloadTask): DownloadTask => {
  if (task.status !== "downloading") return task;

  return {
    ...task,
    status: "pending",
    progress: 0,
    downloadedSize: 0,
  };
};

const resolveQueueStatus = (queue: DownloadTask[], isQueuePaused: boolean): DownloadQueueStatus => {
  if (isQueuePaused) return "Pause";
  if (queue.some((task) => task.status === "downloading")) return "Downloading";
  if (queue.some((task) => task.status === "error")) return "Failed";
  if (queue.some((task) => task.status === "paused")) return "Pause";
  if (queue.some((task) => task.status === "pending")) return "Pause";
  return "Done";
};

const buildSelectedDirectoryLabel = (selectedDirectoryName?: string) => {
  if (!selectedDirectoryName) return getDownloadDirectoryHint();
  return buildDirectoryPathLabel(selectedDirectoryName);
};

interface DownloadState {
  queue: DownloadTask[];
  completed: DownloadTask[];
  currentDownload: DownloadTask | null;
  dailyLimit: number;
  usedCount: number;
  downloadRootHint: string;
  downloadDirectoryMode: DownloadCapabilityMode;
  selectedDirectoryName?: string;
  hasDirectoryPermission: boolean;
  directoryAccessSupported: boolean;
  downloadQueueTaskStatus: DownloadQueueStatus;
  downloadCover: boolean;
  downloadLyric: boolean;
  isQueuePaused: boolean;

  addDownload: (
    task: DownloadTaskInput,
  ) => void;
  downloadSong: (song: Song, quality?: AudioQuality) => Promise<void>;
  downloadSongs: (songs: Song[], quality?: AudioQuality) => Promise<void>;
  initializeDownloadManager: () => Promise<void>;
  refreshDownloadConfig: () => Promise<void>;
  refreshDownloadCapability: () => Promise<void>;
  selectDownloadDirectory: () => Promise<void>;
  setDownloadCover: (enabled: boolean) => void;
  setDownloadLyric: (enabled: boolean) => void;
  startNextDownload: () => void;
  startDownloadById: (id: string) => Promise<void>;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  retryAllFailed: () => void;
  removeDownload: (id: string) => void;
  clearQueue: () => void;
  updateTask: (id: string, patch: Partial<DownloadTask>) => void;
  updateProgress: (
    id: string,
    progress: number,
    downloadedSize?: number,
    totalSize?: number,
  ) => void;
  completeDownload: (
    id: string,
    patch?: Partial<Pick<DownloadTask, "downloadedSize" | "totalSize" | "fileName" | "fileSuffix" | "finalLevel" | "savePath" | "saveMode" | "url">>,
  ) => void;
  failDownload: (id: string, error: string) => void;
  setDailyLimit: (limit: number, used: number) => void;
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
      downloadDirectoryMode: "browser-download",
      selectedDirectoryName: undefined,
      hasDirectoryPermission: false,
      directoryAccessSupported: false,
      downloadQueueTaskStatus: "Done",
      downloadCover: true,
      downloadLyric: true,
      isQueuePaused: false,

      addDownload: (task) => {
        const { usedCount, dailyLimit, queue, completed } = get();
        if (usedCount >= dailyLimit) {
          toast.error("今日下载次数已达上限");
          return;
        }

        const result = prepareEnqueueTasks(queue, completed, [task]);
        if (result.addedTasks.length === 0) {
          if (result.skippedQueued > 0) {
            toast("该歌曲已在下载队列中");
            return;
          }

          if (result.skippedCompleted > 0) {
            toast("该歌曲已下载");
            return;
          }

          toast("该歌曲已在下载队列中");
          return;
        }

        set((state) => ({
          queue: result.nextQueue,
          downloadQueueTaskStatus: state.currentDownload
            ? "Downloading"
            : resolveQueueStatus(result.nextQueue, state.isQueuePaused),
        }));

        toast.success(`已加入下载队列：${task.name}`);
        get().startNextDownload();
      },

      downloadSong: async (song, quality = DEFAULT_QUALITY) => {
        get().addDownload(createDownloadTaskInput(song, quality));
      },

      downloadSongs: async (songs, quality = DEFAULT_QUALITY) => {
        if (songs.length === 0) return;

        const { usedCount, dailyLimit, queue, completed } = get();
        if (usedCount >= dailyLimit) {
          toast.error("今日下载次数已达上限");
          return;
        }

        const result = prepareEnqueueTasks(
          queue,
          completed,
          songs.map((song) => createDownloadTaskInput(song, quality)),
        );

        if (result.addedTasks.length === 0) {
          toast("待下载歌曲均已在队列中或已下载");
          return;
        }

        set((state) => ({
          queue: result.nextQueue,
          downloadQueueTaskStatus: state.currentDownload
            ? "Downloading"
            : resolveQueueStatus(result.nextQueue, state.isQueuePaused),
        }));

        toast.success(`已加入下载队列：${result.addedTasks.length} 首`);

        const skippedTotal =
          result.skippedQueued + result.skippedCompleted + result.skippedInBatch;
        if (skippedTotal > 0) {
          toast(`已跳过 ${skippedTotal} 首重复或已下载歌曲`);
        }

        get().startNextDownload();
      },

      initializeDownloadManager: async () => {
        await Promise.all([
          get().refreshDownloadCapability(),
          get().refreshDownloadConfig(),
        ]);

        const { currentDownload, queue, isQueuePaused } = get();
        if (currentDownload || isQueuePaused) return;
        if (queue.some((task) => task.status === "pending")) {
          get().startNextDownload();
        }
      },

      refreshDownloadConfig: async () => {
        try {
          const config = await downloadService.getConfig();
          set({
            dailyLimit: config.dailyLimit,
            usedCount: config.dailySuccessCount,
          });
        } catch (error) {
          console.warn("刷新下载配置失败:", error);
        }
      },

      refreshDownloadCapability: async () => {
        try {
          const state = await downloadDirectoryAdapter.getState();
          set({
            downloadDirectoryMode: state.mode,
            selectedDirectoryName: state.selectedDirectoryName,
            hasDirectoryPermission: state.hasPermission,
            directoryAccessSupported: state.isSupported,
            downloadRootHint: state.selectedDirectoryName
              ? buildSelectedDirectoryLabel(state.selectedDirectoryName)
              : state.rootHint,
          });
        } catch (error) {
          console.warn("刷新下载目录能力失败:", error);
          set({
            downloadDirectoryMode: "browser-download",
            selectedDirectoryName: undefined,
            hasDirectoryPermission: false,
            directoryAccessSupported: false,
            downloadRootHint: getDownloadDirectoryHint(),
          });
        }
      },

      selectDownloadDirectory: async () => {
        try {
          const state = await downloadDirectoryAdapter.selectDirectory();
          set({
            downloadDirectoryMode: state.mode,
            selectedDirectoryName: state.selectedDirectoryName,
            hasDirectoryPermission: state.hasPermission,
            directoryAccessSupported: state.isSupported,
            downloadRootHint: state.selectedDirectoryName
              ? buildSelectedDirectoryLabel(state.selectedDirectoryName)
              : state.rootHint,
          });

          if (state.mode === "directory-access" && state.hasPermission) {
            toast.success("下载目录已更新");
          } else if (!state.isSupported) {
            toast("当前浏览器不支持站点内目录写入，将使用浏览器默认下载");
          }
        } catch (error) {
          if (isAbortError(error)) return;
          console.error("选择下载目录失败:", error);
          toast.error("选择下载目录失败");
        }
      },

      setDownloadCover: (enabled) => {
        set({ downloadCover: enabled });
      },

      setDownloadLyric: (enabled) => {
        set({ downloadLyric: enabled });
      },

      startNextDownload: () => {
        const { currentDownload, queue, isQueuePaused } = get();
        if (currentDownload || isQueuePaused) return;

        const nextTask = queue.find((task) => task.status === "pending");
        if (!nextTask) {
          set((state) => ({
            downloadQueueTaskStatus: resolveQueueStatus(state.queue, state.isQueuePaused),
          }));
          return;
        }

        void get().startDownloadById(nextTask.id);
      },

      startDownloadById: async (id) => {
        const { currentDownload, queue, isQueuePaused } = get();
        if (currentDownload && currentDownload.id !== id) return;
        if (isQueuePaused) return;

        const targetTask = queue.find((task) => task.id === id);
        if (!targetTask) return;
        if (targetTask.status === "downloading") return;

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
          currentDownload:
            state.queue.find((task) => task.id === id)
              ? {
                  ...state.queue.find((task) => task.id === id)!,
                  status: "downloading",
                  error: undefined,
                }
              : null,
          downloadQueueTaskStatus: "Downloading",
        }));

        try {
          const latestSettings = get();
          const result = await executeDownloadTask({
            task: targetTask,
            quality: targetTask.quality,
            includeCover: latestSettings.downloadCover,
            includeLyric: latestSettings.downloadLyric,
            signal: controller.signal,
            onProgress: (progress, downloadedSize, totalSize) => {
              get().updateProgress(id, progress, downloadedSize, totalSize);
            },
          });

          set({ dailyLimit: result.dailyLimit });
          get().completeDownload(id, {
            downloadedSize: result.totalBytes,
            totalSize: result.totalBytes,
            fileName: result.preparedTask.audioFileName,
            fileSuffix: result.preparedTask.fileSuffix,
            finalLevel: result.preparedTask.finalLevel,
            savePath: result.savePathLabel,
            saveMode: result.mode,
            url: result.preparedTask.songUrl,
          });
          toast.success(`下载完成：${targetTask.name}`);
        } catch (error) {
          const latestTask = get().queue.find((item) => item.id === id);
          if (!latestTask) return;

          if (controller.signal.aborted && latestTask.status === "paused") {
            return;
          }

          if (error instanceof DownloadLimitReachedError) {
            get().setDailyLimit(error.dailyLimit, error.dailySuccessCount);
            set((state) => ({
              queue: state.queue.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      status: "paused",
                      progress: 0,
                      downloadedSize: 0,
                    }
                  : task,
              ),
              currentDownload: null,
              isQueuePaused: true,
              downloadQueueTaskStatus: "Pause",
            }));
            toast.error(error.message);
            return;
          }

          if (isAbortError(error)) {
            return;
          }

          const message = error instanceof Error ? error.message : "下载失败";
          get().failDownload(id, message);
          toast.error(`下载失败：${targetTask.name}`);
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
              task.id === id
                ? {
                    ...task,
                    status: "paused",
                    progress: 0,
                    downloadedSize: 0,
                  }
                : task,
            ),
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
            downloadQueueTaskStatus: resolveQueueStatus(
              state.queue.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      status: "paused",
                      progress: 0,
                      downloadedSize: 0,
                    }
                  : task,
              ),
              state.isQueuePaused,
            ),
          }));
          controller.abort();
          downloadControllers.delete(id);
          get().startNextDownload();
          return;
        }

        set((state) => ({
          queue: state.queue.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "paused",
                  progress: 0,
                  downloadedSize: 0,
                }
              : task,
          ),
          downloadQueueTaskStatus: resolveQueueStatus(
            state.queue.map((task) =>
              task.id === id
                ? {
                    ...task,
                    status: "paused",
                    progress: 0,
                    downloadedSize: 0,
                  }
                : task,
            ),
            state.isQueuePaused,
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
            totalSize: undefined,
            error: undefined,
          };
          const nextQueue = [...state.queue];
          nextQueue.splice(taskIndex, 1);
          nextQueue.unshift(nextTask);

          return {
            queue: nextQueue,
            isQueuePaused: false,
            downloadQueueTaskStatus: resolveQueueStatus(nextQueue, false),
          };
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
            totalSize: undefined,
            error: undefined,
          };
          const nextQueue = [...state.queue];
          nextQueue.splice(taskIndex, 1);
          nextQueue.unshift(nextTask);

          return {
            queue: nextQueue,
            isQueuePaused: false,
            downloadQueueTaskStatus: resolveQueueStatus(nextQueue, false),
          };
        });

        get().startNextDownload();
      },

      retryAllFailed: () => {
        set((state) => {
          const failedTasks = state.queue.filter((task) => task.status === "error");
          if (failedTasks.length === 0) return state;

          const resetFailedTasks = failedTasks.map((task) => ({
            ...task,
            status: "pending" as const,
            progress: 0,
            downloadedSize: 0,
            totalSize: undefined,
            error: undefined,
          }));
          const otherTasks = state.queue.filter((task) => task.status !== "error");
          const nextQueue = [...resetFailedTasks, ...otherTasks];

          return {
            queue: nextQueue,
            isQueuePaused: false,
            downloadQueueTaskStatus: resolveQueueStatus(nextQueue, false),
          };
        });

        get().startNextDownload();
      },

      removeDownload: (id) => {
        const controller = downloadControllers.get(id);
        if (controller) {
          controller.abort();
          downloadControllers.delete(id);
        }

        set((state) => {
          const nextQueue = state.queue.filter((task) => task.id !== id);
          return {
            queue: nextQueue,
            completed: state.completed.filter((task) => task.id !== id),
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
            downloadQueueTaskStatus: resolveQueueStatus(nextQueue, state.isQueuePaused),
          };
        });

        get().startNextDownload();
      },

      clearQueue: () => {
        get().queue.forEach((task) => {
          const controller = downloadControllers.get(task.id);
          if (controller) {
            controller.abort();
            downloadControllers.delete(task.id);
          }
        });

        set({
          queue: [],
          currentDownload: null,
          isQueuePaused: false,
          downloadQueueTaskStatus: "Done",
        });
      },

      updateTask: (id, patch) => {
        set((state) => ({
          queue: state.queue.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...patch,
                }
              : task,
          ),
          currentDownload:
            state.currentDownload?.id === id
              ? {
                  ...state.currentDownload,
                  ...patch,
                }
              : state.currentDownload,
        }));
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
          downloadQueueTaskStatus: "Downloading",
        }));
      },

      completeDownload: (id, patch) => {
        set((state) => {
          const task = state.queue.find((item) => item.id === id);
          if (!task) return state;

          const completedTask: DownloadTask = {
            ...task,
            ...patch,
            status: "completed",
            progress: 100,
            downloadedSize: patch?.downloadedSize ?? task.downloadedSize,
            totalSize: patch?.totalSize ?? task.totalSize,
          };

          const nextQueue = state.queue.filter((item) => item.id !== id);
          return {
            queue: nextQueue,
            completed: [completedTask, ...state.completed],
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
            usedCount: state.usedCount + 1,
            downloadQueueTaskStatus: resolveQueueStatus(nextQueue, state.isQueuePaused),
          };
        });
      },

      failDownload: (id, error) => {
        set((state) => {
          const nextQueue = state.queue.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "error" as const,
                  error,
                }
              : task,
          );

          return {
            queue: nextQueue,
            currentDownload: state.currentDownload?.id === id ? null : state.currentDownload,
            downloadQueueTaskStatus: resolveQueueStatus(nextQueue, state.isQueuePaused),
          };
        });
      },

      setDailyLimit: (limit, used) => {
        set({ dailyLimit: limit, usedCount: used });
      },
    }),
    {
      name: "download-storage",
      partialize: (state) => ({
        queue: state.queue,
        completed: state.completed,
        dailyLimit: state.dailyLimit,
        usedCount: state.usedCount,
        downloadCover: state.downloadCover,
        downloadLyric: state.downloadLyric,
        downloadRootHint: state.downloadRootHint,
        downloadDirectoryMode: state.downloadDirectoryMode,
        selectedDirectoryName: state.selectedDirectoryName,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<DownloadState> | undefined;
        const hydratedQueue = Array.isArray(typedState?.queue)
          ? typedState.queue.map(normalizeTaskForHydration)
          : currentState.queue;

        return {
          ...currentState,
          ...typedState,
          queue: hydratedQueue,
          completed: Array.isArray(typedState?.completed) ? typedState.completed : currentState.completed,
          currentDownload: null,
          isQueuePaused: false,
          hasDirectoryPermission: false,
          directoryAccessSupported: false,
          downloadQueueTaskStatus: resolveQueueStatus(hydratedQueue, false),
          downloadRootHint: typedState?.downloadRootHint || getDownloadDirectoryHint(),
        };
      },
    },
  ),
);
