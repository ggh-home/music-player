import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DownloadTask, AudioQuality } from "@/types";

interface DownloadState {
  // 下载队列
  queue: DownloadTask[];
  
  // 已下载
  completed: DownloadTask[];
  
  // 当前下载
  currentDownload: DownloadTask | null;
  
  // 每日限额
  dailyLimit: number;
  usedCount: number;
  
  // Actions
  addDownload: (task: Omit<DownloadTask, "id" | "progress" | "status" | "createTime">) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearQueue: () => void;
  updateProgress: (id: string, progress: number) => void;
  completeDownload: (id: string) => void;
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

      addDownload: (task) => {
        const { usedCount, dailyLimit, queue } = get();
        if (usedCount >= dailyLimit) {
          alert("今日下载次数已达上限");
          return;
        }
        
        const newTask: DownloadTask = {
          ...task,
          id: Math.random().toString(36).substring(2, 15),
          progress: 0,
          status: "pending",
          createTime: new Date().toISOString(),
        };
        
        // 检查是否已存在
        const exists = queue.some(
          (t) => t.name === task.name && t.type === task.type
        );
        if (exists) {
          alert("该任务已在下载队列中");
          return;
        }
        
        set({ queue: [...queue, newTask] });
      },

      pauseDownload: (id) => {
        const queue = get().queue.map((t) =>
          t.id === id ? { ...t, status: "paused" as const } : t
        );
        set({ queue });
      },

      resumeDownload: (id) => {
        const queue = get().queue.map((t) =>
          t.id === id ? { ...t, status: "downloading" as const } : t
        );
        set({ queue });
      },

      retryDownload: (id) => {
        const queue = get().queue.map((t) =>
          t.id === id ? { ...t, status: "pending" as const, progress: 0, error: undefined } : t
        );
        set({ queue });
      },

      removeDownload: (id) => {
        const queue = get().queue.filter((t) => t.id !== id);
        set({ queue });
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      updateProgress: (id, progress) => {
        const queue = get().queue.map((t) =>
          t.id === id ? { ...t, progress, status: "downloading" as const } : t
        );
        set({ queue });
      },

      completeDownload: (id) => {
        const task = get().queue.find((t) => t.id === id);
        if (task) {
          const completedTask = { ...task, status: "completed" as const, progress: 100 };
          set({
            queue: get().queue.filter((t) => t.id !== id),
            completed: [completedTask, ...get().completed],
          });
        }
      },

      failDownload: (id, error) => {
        const queue = get().queue.map((t) =>
          t.id === id ? { ...t, status: "error" as const, error } : t
        );
        set({ queue });
      },

      setDailyLimit: (limit, used) => {
        set({ dailyLimit: limit, usedCount: used });
      },

      incrementUsedCount: () => {
        set({ usedCount: get().usedCount + 1 });
      },
    }),
    {
      name: "download-storage",
      partialize: (state) => ({ completed: state.completed }),
    }
  )
);
