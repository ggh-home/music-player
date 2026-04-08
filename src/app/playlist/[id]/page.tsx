"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Disc3, Pause, Play, Download } from "lucide-react";
import { Playlist, Song } from "@/types";
import { playlistApi, searchApi } from "@/services/api";
import { usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";

type PlaylistSource = "my" | "search" | "collected";
type PlaylistPlatform = Song["platform"] | "local";

type PlaylistMeta = {
  id: string;
  name: string;
  cover: string;
  creator: string;
  songCount: number;
  platform: PlaylistPlatform;
  source: PlaylistSource;
};

type LooseSong = Partial<Song> & {
  id?: string | number;
  rawDetail?: Record<string, unknown>;
};

const isMusicPlatform = (value: unknown): value is Song["platform"] => {
  return value === "QQ" || value === "WYY" || value === "XMLY" || value === "Netease";
};

const resolvePlaylistId = (playlist: Partial<Playlist>): string => {
  if (playlist.playListId !== undefined && playlist.playListId !== null) {
    return String(playlist.playListId);
  }
  if (playlist.id !== undefined && playlist.id !== null) {
    return String(playlist.id);
  }
  return "";
};

const resolvePlaylistName = (playlist: Partial<Playlist>, fallback: string): string => {
  return playlist.playListName || playlist.name || fallback;
};

const resolvePlaylistCover = (playlist: Partial<Playlist>, fallback: string): string => {
  return playlist.playListImg || playlist.cover || fallback;
};

const resolvePlaylistCreator = (playlist: Partial<Playlist>, fallback: string): string => {
  return playlist.creator || fallback;
};

const resolvePlaylistSongCount = (playlist: Partial<Playlist>, fallback: number): number => {
  if (typeof playlist.countOfSong === "number") return playlist.countOfSong;
  if (typeof playlist.songCount === "number") return playlist.songCount;
  if (Array.isArray(playlist.songs)) return playlist.songs.length;
  return fallback;
};

const normalizeSong = (input: LooseSong, fallbackPlatform?: Song["platform"]): Song | null => {
  const rawDetail: Record<string, unknown> =
    input.rawDetail && typeof input.rawDetail === "object"
      ? input.rawDetail
      : {};

  const songIdValue =
    input.songId ?? (rawDetail.songId as string | number | undefined) ?? input.id;
  if (songIdValue === undefined || songIdValue === null) {
    return null;
  }

  const platformValue =
    input.platform ?? (rawDetail.platform as unknown) ?? fallbackPlatform;
  const platform: Song["platform"] = isMusicPlatform(platformValue)
    ? platformValue
    : fallbackPlatform || "QQ";

  const songTitle = String(input.songTitle ?? rawDetail.songTitle ?? "未知歌曲");
  const singerName = String(input.singerName ?? rawDetail.singerName ?? "未知歌手");
  const albumTitle = String(input.albumTitle ?? rawDetail.albumTitle ?? "未知专辑");
  const songImg = String(
    input.songImg ?? rawDetail.songImg ?? input.cover ?? "",
  );
  const songUrl = String(input.songUrl ?? rawDetail.songUrl ?? "");

  return {
    singerId: input.singerId,
    albumId: input.albumId,
    cover: typeof input.cover === "string" ? input.cover : undefined,
    duration: typeof input.duration === "number" ? input.duration : 0,
    platform,
    quality: typeof input.quality === "string" ? input.quality : undefined,
    isLiked: Boolean(input.isLiked),
    songId: String(songIdValue),
    songTitle,
    songImg,
    songUrl,
    songLyric: typeof input.songLyric === "string" ? input.songLyric : undefined,
    singerName,
    albumTitle,
    isBookmarked: Boolean(input.isBookmarked ?? rawDetail.isBookmarked ?? false),
    songType:
      input.songType === "music" || input.songType === "sound"
        ? input.songType
        : undefined,
    valid: typeof input.valid === "boolean" ? input.valid : true,
    rawDetail: {
      valid: Boolean(rawDetail.valid ?? input.valid ?? true),
      songId: String(rawDetail.songId ?? songIdValue),
      albumId: Number(rawDetail.albumId ?? input.albumId ?? 0),
      songImg,
      songUrl,
      platform: String(rawDetail.platform ?? platform),
      songTitle: String(rawDetail.songTitle ?? songTitle),
      albumTitle: String(rawDetail.albumTitle ?? albumTitle),
      singerName: String(rawDetail.singerName ?? singerName),
      isBookmarked: Boolean(rawDetail.isBookmarked ?? input.isBookmarked ?? false),
    },
  };
};

const normalizePlaylistMeta = (
  input: Partial<Playlist> | null | undefined,
  fallback: PlaylistMeta,
): PlaylistMeta => {
  if (!input) {
    return fallback;
  }

  return {
    id: resolvePlaylistId(input) || fallback.id,
    name: resolvePlaylistName(input, fallback.name),
    cover: resolvePlaylistCover(input, fallback.cover),
    creator: resolvePlaylistCreator(input, fallback.creator),
    songCount: resolvePlaylistSongCount(input, fallback.songCount),
    platform:
      isMusicPlatform(input.platform) || input.platform === "local"
        ? (input.platform as PlaylistPlatform)
        : fallback.platform,
    source: fallback.source,
  };
};

export default function PlaylistSongsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const playlistId = useMemo(() => {
    const raw = params?.id;
    return raw ? decodeURIComponent(raw) : "";
  }, [params]);

  const source = (searchParams.get("source") || "my") as PlaylistSource;
  const platformFromQuery = searchParams.get("platform");
  const fallbackPlatform = isMusicPlatform(platformFromQuery)
    ? platformFromQuery
    : undefined;

  const fallbackName = searchParams.get("name") || "歌单";
  const fallbackCover = searchParams.get("cover") || "";
  const fallbackCreator = searchParams.get("creator") || "未知创建者";
  const fallbackSongCount = Number(searchParams.get("songCount") || "0") || 0;

  const { playSong, playAll, currentSong, isPlaying } = usePlayerStore();
  const { downloadSong } = useDownloadStore();
  const { isAuthenticated } = useAuthStore();

  const [playlistMeta, setPlaylistMeta] = useState<PlaylistMeta | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadLocalPlaylistMeta = useCallback(async (id: string) => {
    const found = await playlistApi.findPlaylistById(id, ["CUSTOM", "FAVORITE", "ALL"]);
    return found || null;
  }, []);

  const loadPlaylistDetail = useCallback(async () => {
    if (!playlistId) {
      setPlaylistMeta(null);
      setSongs([]);
      setIsLoading(false);
      setErrorMsg("歌单 ID 无效");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const fallbackMeta: PlaylistMeta = {
      id: playlistId,
      name: fallbackName,
      cover: fallbackCover,
      creator: fallbackCreator,
      songCount: fallbackSongCount,
      platform: fallbackPlatform || "local",
      source,
    };

    let loaded = false;
    let lastError: unknown = null;

    try {
      const applyResult = (
        metaInput: Partial<Playlist> | null | undefined,
        songsInput: unknown[],
        platformHint?: Song["platform"],
      ) => {
        const sourceSongs = Array.isArray(songsInput) ? songsInput : [];
        const normalizedSongs = sourceSongs
          .map((song) => normalizeSong(song as LooseSong, platformHint || fallbackPlatform))
          .filter((song): song is Song => song !== null);

        setSongs(normalizedSongs);

        const normalizedMeta = normalizePlaylistMeta(metaInput, {
          ...fallbackMeta,
          platform: platformHint || fallbackMeta.platform,
          songCount: normalizedSongs.length || fallbackMeta.songCount,
        });

        setPlaylistMeta({
          ...normalizedMeta,
          songCount: normalizedSongs.length || normalizedMeta.songCount,
        });
      };

      const tryLoadFromSearch = async () => {
        if (!fallbackPlatform) return false;
        const songs = await searchApi.getPlaylistSongs(fallbackPlatform, playlistId);
        applyResult(null, songs, fallbackPlatform);
        return true;
      };

      const tryLoadFromLocal = async () => {
        const localSongs = await playlistApi.getPlaylistSongs(playlistId);
        const localMeta = await loadLocalPlaylistMeta(playlistId);
        applyResult(localMeta || null, localSongs, fallbackPlatform);
        return true;
      };

      if (source === "search" && fallbackPlatform) {
        try {
          loaded = await tryLoadFromSearch();
        } catch (error) {
          lastError = error;
        }
        if (!loaded) {
          loaded = await tryLoadFromLocal();
        }
      } else {
        try {
          loaded = await tryLoadFromLocal();
        } catch (error) {
          lastError = error;
        }
        if (!loaded && fallbackPlatform) {
          loaded = await tryLoadFromSearch();
        }
      }

      if (!loaded) {
        throw lastError || new Error("歌单加载失败");
      }
    } catch (error) {
      console.error("加载歌单详情失败:", error);
      setPlaylistMeta(fallbackMeta);
      setSongs([]);
      setErrorMsg("歌单加载失败，请稍后重试");
      toast.error("歌单加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [
    playlistId,
    fallbackName,
    fallbackCover,
    fallbackCreator,
    fallbackSongCount,
    fallbackPlatform,
    source,
    loadLocalPlaylistMeta,
  ]);

  useEffect(() => {
    void loadPlaylistDetail();
  }, [loadPlaylistDetail]);

  const handlePlaySong = async (song: Song) => {
    if (!songs.length) return;
    await playSong(song, songs);
  };

  const handlePlayAll = async () => {
    if (!songs.length) {
      toast.error("歌单暂无歌曲");
      return;
    }
    await playAll(songs);
  };

  const isCurrentSongPlaying = (song: Song) => {
    return (
      currentSong?.songId === song.songId &&
      currentSong?.platform === song.platform &&
      isPlaying
    );
  };

  const handleDownloadSong = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    await downloadSong(song);
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/playlists")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground">返回歌单列表</p>
        </div>

        {isLoading ? (
          <div className="flex h-[45vh] items-center justify-center text-muted-foreground">
            加载歌单中...
          </div>
        ) : !playlistMeta ? (
          <div className="flex h-[45vh] items-center justify-center text-muted-foreground">
            歌单不存在
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-6 rounded-2xl border bg-card p-5 md:flex-row md:p-6">
              <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                {playlistMeta.cover ? (
                  <Image
                    src={playlistMeta.cover}
                    alt={playlistMeta.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700">
                    <Disc3 className="h-14 w-14 text-white" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">歌单详情</p>
                  <h1 className="mt-1 text-3xl font-bold">{playlistMeta.name}</h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    创建者：{playlistMeta.creator} · {songs.length || playlistMeta.songCount} 首
                  </p>
                  {errorMsg && (
                    <p className="mt-2 text-sm text-red-500">{errorMsg}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => void handlePlayAll()} disabled={songs.length === 0}>
                    <Play className="mr-2 h-4 w-4" />
                    播放全部
                  </Button>
                  <Button variant="outline" onClick={() => void loadPlaylistDetail()}>
                    刷新歌曲
                  </Button>
                </div>
              </div>
            </section>

            {songs.length === 0 ? (
              <section className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                该歌单暂无歌曲
              </section>
            ) : (
              <section className="space-y-2">
                <div className="flex items-center px-3 py-2 text-xs text-muted-foreground">
                  <span className="w-10 text-center">#</span>
                  <span className="flex-1">歌曲</span>
                  <span className="hidden w-40 md:block">专辑</span>
                  <span className="hidden w-16 text-center md:block">时长</span>
                  <span className="w-12" />
                </div>

                {songs.map((song, index) => (
                  <div
                    key={`${song.platform}-${song.songId}-${index}`}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent"
                    onClick={() => void handlePlaySong(song)}
                  >
                    <span className="w-10 text-center text-sm text-muted-foreground">
                      {index + 1}
                    </span>

                    <div className="relative h-10 w-10 overflow-hidden rounded bg-muted">
                      {song.songImg ? (
                        <Image
                          src={song.songImg}
                          alt={song.songTitle || "song"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{song.songTitle}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {song.singerName}
                      </p>
                    </div>

                    <span className="hidden w-40 truncate text-sm text-muted-foreground md:block">
                      {song.albumTitle || "-"}
                    </span>

                    <span className="hidden w-16 text-center text-sm text-muted-foreground md:block">
                      {song.duration ? formatTime(song.duration) : "--:--"}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownloadSong(song);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handlePlaySong(song);
                      }}
                    >
                      {isCurrentSongPlaying(song) ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
