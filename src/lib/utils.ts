import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化时间（秒 -> mm:ss）
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 格式化时间（秒 -> hh:mm:ss）
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 格式化数字
export function formatNumber(num: number): string {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + "亿";
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toString();
}

// 防抖
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// 节流
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 本地存储封装
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage set error:", error);
    }
  },
  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Storage remove error:", error);
    }
  },
};

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 歌词行类型
 */
export interface LyricLine {
  time: number;    // 时间（秒，支持小数，如 85.23）
  text: string;    // 歌词内容
}

/**
 * 解析 LRC 歌词文本 → 标准歌词数组
 * @param lrcText LRC 格式原始字符串
 * @returns 按时间升序排列的 LyricLine[]
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText || typeof lrcText !== "string") return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];

  // 匹配 [01:23.45] 或 [01:23]
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?]/g;

  for (const line of lines) {
    const trimLine = line.trim();
    if (!trimLine) continue;

    // 提取所有时间标签
    const timeMatches: RegExpExecArray[] = [];
    timeRegex.lastIndex = 0;
    let matchResult: RegExpExecArray | null = null;
    while ((matchResult = timeRegex.exec(trimLine)) !== null) {
      timeMatches.push(matchResult);
    }
    if (timeMatches.length === 0) continue;

    // 提取歌词文本（去掉所有时间标签）
    const text = trimLine.replace(timeRegex, "").trim();
    if (!text) continue;

    // 把每个时间标签转成秒
    for (const match of timeMatches) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
      const time = min * 60 + sec + ms / 1000;

      result.push({ time, text });
    }
  }

  // 按时间从小到大排序
  return result.sort((a, b) => a.time - b.time);
}
