import { Song } from "@/types";

export type ClientOs = "windows" | "macos" | "linux" | "unknown";

const DOWNLOAD_SUB_DIR = "Music-Player";
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;
const PLACEHOLDER_SONG_URL = "http://music.yangjian.tech";

export const detectClientOs = (): ClientOs => {
  if (typeof navigator === "undefined") return "unknown";

  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform = String(nav.userAgentData?.platform || navigator.platform || "").toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes("win") || userAgent.includes("windows")) return "windows";
  if (platform.includes("mac") || userAgent.includes("mac os")) return "macos";
  if (platform.includes("linux") || userAgent.includes("linux")) return "linux";
  return "unknown";
};

export const getDownloadDirectoryHint = (): string => {
  const os = detectClientOs();
  if (os === "windows") return `C:\\Users\\<用户名>\\Downloads\\${DOWNLOAD_SUB_DIR}`;
  return `~/Downloads/${DOWNLOAD_SUB_DIR}`;
};

export const sanitizeFileName = (value: string): string => {
  const next = value.replace(INVALID_FILENAME_CHARS, "_").replace(/\s+/g, " ").trim();
  return next || "unknown";
};

export const guessAudioExtension = (url?: string, contentType?: string): string => {
  const lowerType = String(contentType || "").toLowerCase();
  if (lowerType.includes("flac")) return "flac";
  if (lowerType.includes("wav")) return "wav";
  if (lowerType.includes("ogg")) return "ogg";
  if (lowerType.includes("aac")) return "aac";
  if (lowerType.includes("m4a") || lowerType.includes("mp4")) return "m4a";
  if (lowerType.includes("mpeg") || lowerType.includes("mp3")) return "mp3";

  const cleanUrl = String(url || "").split("?")[0];
  const match = cleanUrl.match(/\.([a-z0-9]{2,5})$/i);
  if (match?.[1]) return match[1].toLowerCase();
  return "mp3";
};

export const buildAudioFileName = (song: Pick<Song, "songTitle" | "singerName">, extension: string) => {
  const title = sanitizeFileName(song.songTitle || "未知歌曲");
  const singer = sanitizeFileName(song.singerName || "未知歌手");
  const ext = sanitizeFileName(extension || "mp3").toLowerCase();
  return `${title} - ${singer}.${ext}`;
};

export const buildBrowserDownloadName = (fileName: string) => {
  return `${DOWNLOAD_SUB_DIR}/${sanitizeFileName(fileName)}`;
};

export const buildDownloadPathHint = (fileName: string) => {
  const dir = getDownloadDirectoryHint();
  const separator = detectClientOs() === "windows" ? "\\" : "/";
  return `${dir}${separator}${sanitizeFileName(fileName)}`;
};

export const isSongUrlUsable = (value: unknown): value is string => {
  const url = String(value || "").trim();
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (url === PLACEHOLDER_SONG_URL) return false;
  return true;
};

export const triggerBlobDownload = (blob: Blob, downloadName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = downloadName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

export const triggerUrlDownload = (url: string, downloadName: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.rel = "noopener";
  anchor.target = "_blank";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
