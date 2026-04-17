import { ClientOs, DownloadFileSuffix, Song } from "@/types";

export const DOWNLOAD_SUB_DIR = "Music-Player";
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

export const buildAudioBaseName = (song: Pick<Song, "songTitle" | "singerName">) => {
  const title = sanitizeFileName(song.songTitle || "未知歌曲");
  const singer = sanitizeFileName(song.singerName || "未知歌手");
  return `${title} - ${singer}`;
};

export const buildPreparedBaseFileName = (song: {
  platform?: string;
  songTitle?: string;
  singerName?: string;
}) => {
  const platform = sanitizeFileName(String(song.platform || "QQ").toUpperCase());
  const title = sanitizeFileName(song.songTitle || "未知歌曲");
  const singer = sanitizeFileName(song.singerName || "未知歌手");
  return `${platform}-${title}-${singer}`;
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

export const guessImageExtension = (url?: string, contentType?: string): string => {
  const lowerType = String(contentType || "").toLowerCase();
  if (lowerType.includes("png")) return "png";
  if (lowerType.includes("webp")) return "webp";
  if (lowerType.includes("gif")) return "gif";
  if (lowerType.includes("bmp")) return "bmp";
  if (lowerType.includes("svg")) return "svg";
  if (lowerType.includes("jpeg") || lowerType.includes("jpg")) return "jpg";

  const cleanUrl = String(url || "").split("?")[0];
  const match = cleanUrl.match(/\.([a-z0-9]{2,5})$/i);
  if (match?.[1]) return match[1].toLowerCase();
  return "jpg";
};

export const getFileSuffixExtension = (fileSuffix: DownloadFileSuffix): string => {
  if (fileSuffix === "no-loss.flac" || fileSuffix === "surround.flac") return "flac";
  return "mp3";
};

export const getLyricSuffixLabel = (fileSuffix: DownloadFileSuffix): string => {
  if (fileSuffix === "no-loss.flac") return "no-loss";
  if (fileSuffix === "surround.flac") return "surround";
  if (fileSuffix === "default.mp3") return "default";
  return "high";
};

export const buildAudioFileName = (
  song: Pick<Song, "songTitle" | "singerName">,
  extension: string,
) => {
  return `${buildAudioBaseName(song)}.${sanitizeFileName(extension || "mp3").toLowerCase()}`;
};

export const buildCoverFileName = (baseFileName: string, extension = "jpg") => {
  return `${sanitizeFileName(baseFileName)}-cover.${sanitizeFileName(extension).toLowerCase()}`;
};

export const buildLyricFileName = (baseFileName: string, fileSuffix: DownloadFileSuffix) => {
  const suffix = getLyricSuffixLabel(fileSuffix);
  return `${sanitizeFileName(baseFileName)}-${suffix}.lrc`;
};

export const buildBrowserDownloadName = (fileName: string) => {
  return sanitizeFileName(fileName);
};

export const buildDownloadPathHint = (fileName: string) => {
  const dir = getDownloadDirectoryHint();
  const separator = detectClientOs() === "windows" ? "\\" : "/";
  return `${dir}${separator}${sanitizeFileName(fileName)}`;
};

export const buildDirectoryPathLabel = (directoryName?: string) => {
  if (!directoryName) return getDownloadDirectoryHint();
  if (directoryName === DOWNLOAD_SUB_DIR) return DOWNLOAD_SUB_DIR;
  return `${directoryName}/${DOWNLOAD_SUB_DIR}`;
};

export const isSongUrlUsable = (value: unknown): value is string => {
  const url = String(value || "").trim();
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (url === PLACEHOLDER_SONG_URL) return false;
  return true;
};

export const isDirectoryAccessSupported = () => {
  if (typeof window === "undefined") return false;
  return typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
};

export const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";

export const triggerBlobDownload = (blob: Blob, downloadName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = buildBrowserDownloadName(downloadName);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

export const triggerUrlDownload = (url: string, downloadName: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildBrowserDownloadName(downloadName);
  anchor.rel = "noopener";
  anchor.target = "_blank";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
