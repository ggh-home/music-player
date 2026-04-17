import { clearStoredDownloadRootHandle, getStoredDownloadRootHandle, setStoredDownloadRootHandle } from "@/lib/download/directoryHandleStore";
import {
  DOWNLOAD_SUB_DIR,
  buildDirectoryPathLabel,
  detectClientOs,
  getDownloadDirectoryHint,
  isAbortError,
  isDirectoryAccessSupported,
  triggerBlobDownload,
  triggerUrlDownload,
} from "@/lib/download";
import { DownloadCapabilityMode, DownloadDirectoryState, PreparedDownloadAsset, PreparedDownloadTask } from "@/types";

type PermissionMode = "read" | "readwrite";
type PermissionCapableHandle = FileSystemHandle & {
  queryPermission?: (descriptor?: { mode?: PermissionMode }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: PermissionMode }) => Promise<PermissionState>;
};

interface SaveAssetsOptions {
  signal?: AbortSignal;
  onProgress?: (value: number, downloadedSize?: number, totalSize?: number) => void;
}

export interface SaveAssetsResult {
  savePathLabel: string;
  totalBytes?: number;
  mode: DownloadCapabilityMode;
}

interface DownloadDirectoryAdapter {
  getState(): Promise<DownloadDirectoryState>;
  selectDirectory(): Promise<DownloadDirectoryState>;
  ensureWritableDirectory(): Promise<DownloadDirectoryState>;
  saveAssets(task: PreparedDownloadTask, options?: SaveAssetsOptions): Promise<SaveAssetsResult>;
}

const getWindowWithPicker = () => window as Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: PermissionMode;
    startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
  }) => Promise<FileSystemDirectoryHandle>;
};

const getStateBase = (): Omit<DownloadDirectoryState, "mode" | "hasPermission" | "isSupported"> => ({
  os: detectClientOs(),
  rootHint: getDownloadDirectoryHint(),
  selectedDirectoryName: undefined,
});

const queryPermission = async (
  handle: FileSystemHandle,
  mode: PermissionMode,
): Promise<PermissionState | "prompt"> => {
  const permissionHandle = handle as PermissionCapableHandle;
  if (typeof permissionHandle.queryPermission !== "function") return "prompt";
  return permissionHandle.queryPermission({ mode });
};

const requestPermission = async (
  handle: FileSystemHandle,
  mode: PermissionMode,
): Promise<PermissionState | "prompt"> => {
  const permissionHandle = handle as PermissionCapableHandle;
  if (typeof permissionHandle.requestPermission !== "function") return "prompt";
  return permissionHandle.requestPermission({ mode });
};

const ensureDirectoryPermission = async (handle: FileSystemDirectoryHandle, mode: PermissionMode) => {
  const current = await queryPermission(handle, mode);
  if (current === "granted") return true;
  const next = await requestPermission(handle, mode);
  return next === "granted";
};

const resolveWritableRootDirectory = async (handle: FileSystemDirectoryHandle) => {
  if (handle.name === DOWNLOAD_SUB_DIR) return handle;
  return handle.getDirectoryHandle(DOWNLOAD_SUB_DIR, { create: true });
};

const readTotalSize = (response: Response) => {
  const totalSizeHeader = response.headers.get("content-length");
  if (!totalSizeHeader) return undefined;
  const totalSize = Number(totalSizeHeader);
  return Number.isFinite(totalSize) ? totalSize : undefined;
};

const downloadAssetAsBlob = async (asset: PreparedDownloadAsset, signal?: AbortSignal) => {
  if (!asset.url) throw new Error(`资源缺少下载地址：${asset.fileName}`);

  const response = await fetch(asset.url, { signal });
  if (!response.ok) {
    throw new Error(`下载失败：HTTP ${response.status}`);
  }

  if (!response.body) {
    const blob = await response.blob();
    return {
      blob,
      totalBytes: blob.size,
      totalSize: blob.size,
    };
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let written = 0;
  const totalSize = readTotalSize(response);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const chunk = new Uint8Array(value);
    written += chunk.byteLength;
    chunks.push(chunk.buffer);
  }

  return {
    blob: new Blob(chunks, {
      type: asset.contentType || response.headers.get("content-type") || "application/octet-stream",
    }),
    totalBytes: written,
    totalSize,
  };
};

const saveTextAssetAsBlob = (asset: PreparedDownloadAsset) => {
  return new Blob([asset.textContent || ""], {
    type: asset.contentType || "text/plain;charset=utf-8",
  });
};

class BrowserDownloadDirectoryAdapter implements DownloadDirectoryAdapter {
  async getState(): Promise<DownloadDirectoryState> {
    return {
      ...getStateBase(),
      mode: "browser-download",
      hasPermission: false,
      isSupported: false,
    };
  }

  async selectDirectory(): Promise<DownloadDirectoryState> {
    return this.getState();
  }

  async ensureWritableDirectory(): Promise<DownloadDirectoryState> {
    return this.getState();
  }

  async saveAssets(task: PreparedDownloadTask, options?: SaveAssetsOptions): Promise<SaveAssetsResult> {
    const audioAsset = task.assets.find((asset) => asset.kind === "audio");
    if (!audioAsset) {
      throw new Error("下载任务缺少音频资源");
    }

    let totalBytes: number | undefined;
    let totalSize: number | undefined;

    try {
      if (!audioAsset.url) throw new Error("音频下载地址缺失");

      const response = await fetch(audioAsset.url, { signal: options?.signal });
      if (!response.ok) {
        throw new Error(`下载失败：HTTP ${response.status}`);
      }

      const detectedTotalSize = readTotalSize(response);

      if (!response.body) {
        const blob = await response.blob();
        triggerBlobDownload(blob, audioAsset.fileName);
        totalBytes = blob.size;
        totalSize = blob.size;
      } else {
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        let downloadedSize = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunk = new Uint8Array(value);
          downloadedSize += chunk.byteLength;
          chunks.push(chunk.buffer);

          const progress = detectedTotalSize
            ? Math.min(99, Math.round((downloadedSize / detectedTotalSize) * 100))
            : 0;
          options?.onProgress?.(progress, downloadedSize, detectedTotalSize);
        }

        const blob = new Blob(chunks, {
          type: audioAsset.contentType || response.headers.get("content-type") || "audio/mpeg",
        });
        triggerBlobDownload(blob, audioAsset.fileName);
        totalBytes = blob.size;
        totalSize = detectedTotalSize || blob.size;
      }
    } catch (error) {
      if (isAbortError(error)) throw error;

      if (!audioAsset.url) throw error;
      triggerUrlDownload(audioAsset.url, audioAsset.fileName);
    }

    for (const asset of task.assets) {
      if (asset.kind === "audio") continue;

      try {
        if (asset.textContent !== undefined) {
          triggerBlobDownload(saveTextAssetAsBlob(asset), asset.fileName);
          continue;
        }

        const { blob } = await downloadAssetAsBlob(asset, options?.signal);
        triggerBlobDownload(blob, asset.fileName);
      } catch (error) {
        if (isAbortError(error)) throw error;
        if (asset.url) {
          triggerUrlDownload(asset.url, asset.fileName);
        }
      }
    }

    options?.onProgress?.(100, totalBytes, totalSize);

    return {
      savePathLabel: getDownloadDirectoryHint(),
      totalBytes,
      mode: "browser-download",
    };
  }
}

class FileSystemAccessDownloadDirectoryAdapter implements DownloadDirectoryAdapter {
  private fallbackAdapter = new BrowserDownloadDirectoryAdapter();

  async getState(): Promise<DownloadDirectoryState> {
    const storedHandle = await getStoredDownloadRootHandle();
    if (!storedHandle) {
      return {
        ...getStateBase(),
        mode: "directory-access",
        hasPermission: false,
        isSupported: true,
      };
    }

    try {
      const permission = await queryPermission(storedHandle, "readwrite");
      return {
        ...getStateBase(),
        mode: "directory-access",
        selectedDirectoryName: storedHandle.name,
        hasPermission: permission === "granted",
        isSupported: true,
      };
    } catch (error) {
      console.warn("读取目录权限失败:", error);
      await clearStoredDownloadRootHandle();
      return {
        ...getStateBase(),
        mode: "directory-access",
        hasPermission: false,
        isSupported: true,
      };
    }
  }

  async selectDirectory(): Promise<DownloadDirectoryState> {
    const picker = getWindowWithPicker().showDirectoryPicker;
    if (!picker) return this.fallbackAdapter.getState();

    const handle = await picker({
      id: "music-player-downloads",
      mode: "readwrite",
      startIn: "downloads",
    });

    const hasPermission = await ensureDirectoryPermission(handle, "readwrite");
    if (hasPermission) {
      await setStoredDownloadRootHandle(handle);
    }

    return {
      ...getStateBase(),
      mode: "directory-access",
      selectedDirectoryName: handle.name,
      hasPermission,
      isSupported: true,
    };
  }

  async ensureWritableDirectory(): Promise<DownloadDirectoryState> {
    const handle = await getStoredDownloadRootHandle();
    if (!handle) {
      return this.getState();
    }

    const hasPermission = await ensureDirectoryPermission(handle, "readwrite");
    if (!hasPermission) {
      return {
        ...getStateBase(),
        mode: "directory-access",
        selectedDirectoryName: handle.name,
        hasPermission: false,
        isSupported: true,
      };
    }

    await resolveWritableRootDirectory(handle);

    return {
      ...getStateBase(),
      mode: "directory-access",
      selectedDirectoryName: handle.name,
      hasPermission: true,
      isSupported: true,
    };
  }

  private async writeUrlAsset(
    directoryHandle: FileSystemDirectoryHandle,
    asset: PreparedDownloadAsset,
    options?: SaveAssetsOptions,
  ) {
    if (!asset.url) throw new Error(`资源缺少下载地址：${asset.fileName}`);

    const response = await fetch(asset.url, { signal: options?.signal });
    if (!response.ok) {
      throw new Error(`下载失败：HTTP ${response.status}`);
    }

    const fileHandle = await directoryHandle.getFileHandle(asset.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const totalSize = readTotalSize(response);
    let written = 0;

    try {
      if (!response.body) {
        const blob = await response.blob();
        await writable.write(blob);
        written = blob.size;
      } else {
        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunk = new Uint8Array(value);
          await writable.write(chunk);
          written += chunk.byteLength;

          if (asset.kind === "audio") {
            const progress = totalSize ? Math.min(99, Math.round((written / totalSize) * 100)) : 0;
            options?.onProgress?.(progress, written, totalSize);
          }
        }
      }
    } catch (error) {
      await writable.abort();
      throw error;
    }

    await writable.close();

    if (asset.kind === "audio") {
      options?.onProgress?.(100, written, totalSize);
    }

    return {
      totalBytes: written,
      totalSize,
    };
  }

  private async writeTextAsset(directoryHandle: FileSystemDirectoryHandle, asset: PreparedDownloadAsset) {
    const fileHandle = await directoryHandle.getFileHandle(asset.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(asset.textContent || "");
    await writable.close();
  }

  async saveAssets(task: PreparedDownloadTask, options?: SaveAssetsOptions): Promise<SaveAssetsResult> {
    const state = await this.ensureWritableDirectory();
    if (!state.hasPermission) {
      return this.fallbackAdapter.saveAssets(task, options);
    }

    const handle = await getStoredDownloadRootHandle();
    if (!handle) {
      return this.fallbackAdapter.saveAssets(task, options);
    }

    const writableRoot = await resolveWritableRootDirectory(handle);
    const savePathLabel = buildDirectoryPathLabel(handle.name);
    let totalBytes: number | undefined;

    try {
      for (const asset of task.assets) {
        if (asset.textContent !== undefined) {
          await this.writeTextAsset(writableRoot, asset);
          continue;
        }

        const result = await this.writeUrlAsset(writableRoot, asset, options);
        if (asset.kind === "audio") {
          totalBytes = result.totalBytes;
        }
      }

      return {
        savePathLabel,
        totalBytes,
        mode: "directory-access",
      };
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.warn("写入授权目录失败，回退到浏览器下载:", error);
      return this.fallbackAdapter.saveAssets(task, options);
    }
  }
}

export const downloadDirectoryAdapter: DownloadDirectoryAdapter = isDirectoryAccessSupported()
  ? new FileSystemAccessDownloadDirectoryAdapter()
  : new BrowserDownloadDirectoryAdapter();
