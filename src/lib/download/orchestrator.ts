import { downloadDirectoryAdapter } from "@/lib/download/directoryAdapter";
import { downloadService } from "@/lib/download/service";
import { detectClientOs } from "@/lib/download";
import { AudioQuality, DownloadTask, PreparedDownloadTask } from "@/types";

export class DownloadLimitReachedError extends Error {
  dailyLimit: number;
  dailySuccessCount: number;

  constructor(dailyLimit: number, dailySuccessCount: number) {
    super("今日下载次数已达上限");
    this.name = "DownloadLimitReachedError";
    this.dailyLimit = dailyLimit;
    this.dailySuccessCount = dailySuccessCount;
  }
}

interface ExecuteDownloadTaskOptions {
  task: DownloadTask;
  quality: AudioQuality;
  includeCover?: boolean;
  includeLyric?: boolean;
  signal?: AbortSignal;
  onProgress?: (value: number, downloadedSize?: number, totalSize?: number) => void;
}

export interface ExecuteDownloadTaskResult {
  preparedTask: PreparedDownloadTask;
  savePathLabel: string;
  totalBytes?: number;
  mode: "directory-access" | "browser-download";
  dailyLimit: number;
  dailySuccessCount: number;
}

export const executeDownloadTask = async (
  options: ExecuteDownloadTaskOptions,
): Promise<ExecuteDownloadTaskResult> => {
  const config = await downloadService.getConfig();
  if (config.dailySuccessCount >= config.dailyLimit) {
    throw new DownloadLimitReachedError(config.dailyLimit, config.dailySuccessCount);
  }

  const request = {
    platform: String(options.task.platform || "QQ"),
    songId: String(options.task.songId || ""),
    songTitle: options.task.name,
    singerName: options.task.singerName || "",
    songImg: options.task.cover,
    songType:
      options.task.songType ||
      (options.task.type === "audiobook" ? "sound" : "music"),
  } as const;

  const preparedTask = await downloadService.prepareTask(request, options.quality, {
    includeCover: options.includeCover,
    includeLyric: options.includeLyric,
  });

  if (!preparedTask.allowDownload) {
    throw new Error(preparedTask.reason || "当前资源暂不支持下载");
  }

  const saveResult = await downloadDirectoryAdapter.saveAssets(preparedTask, {
    signal: options.signal,
    onProgress: options.onProgress,
  });

  try {
    await downloadService.reportResult({
      platform: request.platform,
      songId: request.songId,
      status: "SUCCESS",
      fileSuffix: preparedTask.fileSuffix,
      os: detectClientOs(),
      clientType: "web",
    });
  } catch (error) {
    console.warn("上报下载成功失败:", error);
  }

  return {
    preparedTask,
    savePathLabel: saveResult.savePathLabel,
    totalBytes: saveResult.totalBytes,
    mode: saveResult.mode,
    dailyLimit: config.dailyLimit,
    dailySuccessCount: config.dailySuccessCount + 1,
  };
};
