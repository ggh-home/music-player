import { DBSchema, openDB } from "idb";

const DB_NAME = "music-player-downloads";
const STORE_NAME = "handles";
const ROOT_HANDLE_KEY = "download-root";

interface DownloadHandleDB extends DBSchema {
  handles: {
    key: string;
    value: FileSystemDirectoryHandle;
  };
}

const canUseIndexedDb = () => typeof window !== "undefined" && typeof indexedDB !== "undefined";

const getDb = async () => {
  if (!canUseIndexedDb()) return null;

  return openDB<DownloadHandleDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export const getStoredDownloadRootHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await getDb();
    if (!db) return null;
    return (await db.get(STORE_NAME, ROOT_HANDLE_KEY)) || null;
  } catch (error) {
    console.warn("读取下载目录句柄失败:", error);
    return null;
  }
};

export const setStoredDownloadRootHandle = async (handle: FileSystemDirectoryHandle) => {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE_NAME, handle, ROOT_HANDLE_KEY);
  } catch (error) {
    console.warn("保存下载目录句柄失败:", error);
  }
};

export const clearStoredDownloadRootHandle = async () => {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(STORE_NAME, ROOT_HANDLE_KEY);
  } catch (error) {
    console.warn("清理下载目录句柄失败:", error);
  }
};
