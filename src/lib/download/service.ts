import { searchApi, utilsApi } from "@/services/api";
import {
  AudioQuality,
  DownloadConfig,
  DownloadFileSuffix,
  DownloadReportPayload,
  DownloadRequestItem,
  PreparedDownloadAsset,
  PreparedDownloadTask,
  QQLevel,
  Song,
  WyyLevel,
} from "@/types";
import {
  DOWNLOAD_SUB_DIR,
  buildCoverFileName,
  buildLyricFileName,
  buildPreparedBaseFileName,
  guessImageExtension,
  isSongUrlUsable,
} from "@/lib/download";

const SOUND_LYRIC_PLACEHOLDER = "抱歉，有声书资源没有歌词~";
const QQ_LEVELS: QQLevel[] = ["atmos_51", "flac", "320"];
const WYY_LEVELS: WyyLevel[] = ["sky", "lossless", "exhigh"];

interface PrepareTaskOptions {
  includeCover?: boolean;
  includeLyric?: boolean;
}

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const normalized = String(value ?? "").replace(/[^\d.]/g, "");
  return Number.isFinite(Number(normalized)) ? Number(normalized) : 0;
};

const isQQPlatform = (platform: string) => String(platform).trim().toUpperCase() === "QQ";

const resolveQQPreferredLevel = (quality: AudioQuality): QQLevel => {
  if (quality === "atmos_51" || quality === "sky") return "atmos_51";
  if (quality === "flac" || quality === "lossless") return "flac";
  return "320";
};

const resolveWyyPreferredLevel = (quality: AudioQuality): WyyLevel => {
  if (quality === "sky" || quality === "atmos_51") return "sky";
  if (quality === "lossless" || quality === "flac") return "lossless";
  return "exhigh";
};

const buildLevelCandidates = (platform: string, quality: AudioQuality) => {
  if (isQQPlatform(platform)) {
    const preferred = resolveQQPreferredLevel(quality);
    const startIndex = QQ_LEVELS.indexOf(preferred);
    return QQ_LEVELS.slice(startIndex >= 0 ? startIndex : QQ_LEVELS.length - 1);
  }

  const preferred = resolveWyyPreferredLevel(quality);
  const startIndex = WYY_LEVELS.indexOf(preferred);
  return WYY_LEVELS.slice(startIndex >= 0 ? startIndex : WYY_LEVELS.length - 1);
};

const resolveFileSuffix = (songType: DownloadRequestItem["songType"], finalLevel?: string): DownloadFileSuffix => {
  if (songType === "sound") return "default.mp3";

  const normalized = String(finalLevel || "").toLowerCase();
  if (normalized.includes("sky") || normalized.includes("atmos") || normalized.includes("surround")) {
    return "surround.flac";
  }
  if (normalized.includes("lossless") || normalized.includes("flac")) {
    return "no-loss.flac";
  }
  return "high.mp3";
};

const createAssets = (
  baseFileName: string,
  fileSuffix: DownloadFileSuffix,
  payload: {
    songUrl: string;
    coverUrl?: string;
    lyric?: string;
  },
  options?: PrepareTaskOptions,
): PreparedDownloadAsset[] => {
  const assets: PreparedDownloadAsset[] = [
    {
      kind: "audio",
      fileName: `${baseFileName}-${fileSuffix}`,
      url: payload.songUrl,
      contentType: fileSuffix.endsWith(".flac") ? "audio/flac" : "audio/mpeg",
    },
  ];

  if (options?.includeCover !== false && payload.coverUrl) {
    const coverExt = guessImageExtension(payload.coverUrl);
    assets.push({
      kind: "cover",
      fileName: buildCoverFileName(baseFileName, coverExt),
      url: payload.coverUrl,
      contentType: `image/${coverExt === "jpg" ? "jpeg" : coverExt}`,
    });
  }

  if (options?.includeLyric !== false && payload.lyric) {
    assets.push({
      kind: "lyric",
      fileName: buildLyricFileName(baseFileName, fileSuffix),
      textContent: payload.lyric,
      contentType: "text/plain;charset=utf-8",
    });
  }

  return assets;
};

const normalizePreparedTask = (
  input: DownloadRequestItem,
  payload: {
    songUrl: string;
    coverUrl?: string;
    lyric?: string;
    finalLevel?: string;
  },
  options?: PrepareTaskOptions,
): PreparedDownloadTask => {
  const baseFileName = buildPreparedBaseFileName(input);
  const fileSuffix = resolveFileSuffix(input.songType, payload.finalLevel);
  const coverFileName = payload.coverUrl
    ? buildCoverFileName(baseFileName, guessImageExtension(payload.coverUrl))
    : undefined;
  const lyricFileName = payload.lyric ? buildLyricFileName(baseFileName, fileSuffix) : undefined;

  return {
    allowDownload: true,
    songUrl: payload.songUrl,
    coverUrl: payload.coverUrl,
    lyric: payload.lyric,
    finalLevel: payload.finalLevel,
    fileSuffix,
    baseFileName,
    audioFileName: `${baseFileName}-${fileSuffix}`,
    coverFileName,
    lyricFileName,
    assets: createAssets(baseFileName, fileSuffix, payload, options),
  };
};

const resolveMusicDetailForDownload = async (
  input: DownloadRequestItem,
  quality: AudioQuality,
): Promise<Song | null> => {
  const candidates = buildLevelCandidates(input.platform, quality);

  for (const level of candidates) {
    try {
      const detail = await searchApi.getSongDetail(input.platform, input.songId, level);
      if (isSongUrlUsable(detail.songUrl)) {
        return detail;
      }
    } catch (error) {
      console.warn("获取下载详情失败，尝试降级音质:", error);
    }
  }

  return null;
};

export const downloadService = {
  async getConfig(): Promise<DownloadConfig> {
    const [dailyLimitRaw, dailySuccessCount] = await Promise.all([
      utilsApi.getDownloadLimit(),
      utilsApi.countUserActionByDay("DOWNLOAD-SUCCESS"),
    ]);

    return {
      dailyLimit: toNumber(dailyLimitRaw),
      dailySuccessCount: toNumber(dailySuccessCount),
      supportPlatforms: ["QQ", "WYY", "XMLY"],
      defaultDownloadDirName: DOWNLOAD_SUB_DIR,
    };
  },

  async prepareTask(
    input: DownloadRequestItem,
    quality: AudioQuality,
    options?: PrepareTaskOptions,
  ): Promise<PreparedDownloadTask> {
    if (input.songType === "sound") {
      const detail = await searchApi.getSoundDetail(input.platform, input.songId);
      if (!isSongUrlUsable(detail.songUrl)) {
        return {
          allowDownload: false,
          reason: "当前有声资源暂不支持下载",
          fileSuffix: "default.mp3",
          baseFileName: buildPreparedBaseFileName(input),
          audioFileName: "",
          assets: [],
        };
      }

      return normalizePreparedTask(
        input,
        {
          songUrl: detail.songUrl,
          coverUrl: input.songImg,
          lyric: options?.includeLyric === false ? undefined : SOUND_LYRIC_PLACEHOLDER,
          finalLevel: "default",
        },
        options,
      );
    }

    const detail = await resolveMusicDetailForDownload(input, quality);
    if (!detail || !isSongUrlUsable(detail.songUrl)) {
      return {
        allowDownload: false,
        reason: "当前歌曲暂不支持下载",
        fileSuffix: "high.mp3",
        baseFileName: buildPreparedBaseFileName(input),
        audioFileName: "",
        assets: [],
      };
    }

    return normalizePreparedTask(
      input,
      {
        songUrl: detail.songUrl,
        coverUrl: detail.songImg || input.songImg,
        lyric: detail.songLyric,
        finalLevel: String(detail.finalLevel || ""),
      },
      options,
    );
  },

  async reportResult(payload: DownloadReportPayload): Promise<void> {
    if (payload.status !== "SUCCESS") return;
    await utilsApi.userAction({ action: "DOWNLOAD-SUCCESS" });
  },
};
