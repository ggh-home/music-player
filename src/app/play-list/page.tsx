"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Repeat, Repeat1, Music, Heart, Download } from "lucide-react";
import Image from "next/image";
import { useAuthStore, usePlayerStore, useDownloadStore } from "@/stores";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";
import { Song } from "@/types";
import {
  addSongToHeartPlaylist,
  getSongFavoriteKey,
  loadLikedSongMapBySongList,
  removeSongFromHeartPlaylist,
} from "@/lib/heartPlaylist";

function PlayListPageContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const { isAuthenticated } = useAuthStore();
  const { downloadSong } = useDownloadStore();

  const {
    playSong,
    isPlaying,
    currentSong,
    playMode,
    togglePlayMode,
    setPlayQueue,
  } = usePlayerStore();

  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedSongMap, setLikedSongMap] = useState<Record<string, boolean>>({});
  const [heartPlaylistId, setHeartPlaylistId] = useState<string | null>(null);

  const isCurrentSongActive = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
  };

  const isSongLiked = (song: Song) => {
    return likedSongMap[getSongFavoriteKey(song)] === true;
  };

  const syncLikedStateForSongs = async (songList: Song[]) => {
    if (!songList.length) {
      setLikedSongMap({});
      return;
    }

    if (!isAuthenticated) {
      setHeartPlaylistId(null);
      setLikedSongMap(
        songList.reduce<Record<string, boolean>>((acc, song) => {
          acc[getSongFavoriteKey(song)] = false;
          return acc;
        }, {}),
      );
      return;
    }

    try {
      const { heartPlaylistId: nextPlaylistId, likedSongMap: nextLikedMap } =
        await loadLikedSongMapBySongList(songList);
      setHeartPlaylistId(nextPlaylistId);
      setLikedSongMap(nextLikedMap);
    } catch {
      setLikedSongMap(
        songList.reduce<Record<string, boolean>>((acc, song) => {
          acc[getSongFavoriteKey(song)] = false;
          return acc;
        }, {}),
      );
    }
  };

  // 加载关键词对应歌曲列表
  useEffect(() => {
    if (!keyword) return;

    const loadSongList = async () => {
      setIsLoading(true);
      try {
        const list = await searchApi.searchSongs(keyword);
        setSongs(list);
        await syncLikedStateForSongs(list);

        if (list.length > 0) {
          setPlayQueue(
            list.map((s) => ({ id: s.songId, type: "song", data: s })),
          );

          // 自动播放第一首
          const firstSong = list[0];
          await playSong(firstSong, list);
        }
      } catch (err) {
        toast.error("歌曲列表加载失败");
        setSongs([]);
        setLikedSongMap({});
      } finally {
        setIsLoading(false);
      }
    };

    loadSongList();
  }, [keyword, setPlayQueue, playSong]);

  useEffect(() => {
    if (!songs.length) {
      setLikedSongMap({});
      if (!isAuthenticated) setHeartPlaylistId(null);
      return;
    }
    void syncLikedStateForSongs(songs);
  }, [isAuthenticated]);

  // 点击歌曲播放
  const handlePlaySong = async (song: Song) => {
    await playSong(song, songs);
  };

  const handleToggleSongFavorite = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }

    const songKey = getSongFavoriteKey(song);
    const liked = isSongLiked(song);

    try {
      if (liked) {
        const playlistId = await removeSongFromHeartPlaylist(song, heartPlaylistId);
        if (playlistId) setHeartPlaylistId(playlistId);
        setLikedSongMap((prev) => ({ ...prev, [songKey]: false }));
        toast.success("已取消收藏");
      } else {
        const playlistId = await addSongToHeartPlaylist(song, heartPlaylistId);
        setHeartPlaylistId(playlistId);
        setLikedSongMap((prev) => ({ ...prev, [songKey]: true }));
        toast.success("已收藏到我的红心歌单");
      }
    } catch {
      toast.error("操作失败");
    }
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
      <div className="min-h-screen pb-24 px-4 max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="py-6 border-b mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6" />
            {keyword || "播放列表"}
          </h1>
          <p className="text-muted-foreground mt-1">共 {songs.length} 首歌曲</p>

          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => togglePlayMode()}
          >
            {playMode === "single" ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
            {playMode === "single" ? "单曲循环" : "列表循环"}
          </Button>
        </div>

        {/* 歌曲列表 */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              加载中...
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无歌曲
            </div>
          ) : (
            songs.map((song, idx) => (
              <Card
                key={song.songId}
                className="p-3 flex items-center gap-4 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handlePlaySong(song)}
              >
                <span className="w-6 text-center text-muted-foreground">
                  {idx + 1}
                </span>

                <div className="relative h-12 w-12 rounded overflow-hidden">
                  {song.songImg ? (
                    <Image
                      src={song.songImg}
                      alt={song.songTitle || "song"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex items-center justify-center h-full w-full">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.songTitle}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.singerName} · {song.albumTitle}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleSongFavorite(song);
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isSongLiked(song) ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaySong(song);
                  }}
                >
                  {isCurrentSongActive(song) ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* <PlayerBar /> */}
    </MainLayout>
  );
}

export default function PlayListPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="py-20 text-center text-muted-foreground">播放列表加载中...</div>
        </MainLayout>
      }
    >
      <PlayListPageContent />
    </Suspense>
  );
}
