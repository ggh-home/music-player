"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Repeat, Repeat1, Music } from "lucide-react";
import Image from "next/image";
import { usePlayerStore } from "@/stores/playerStore";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";
import { Song } from "@/types";
import { PlayerBar } from "@/components/player/PlayerBar";
import { formatTime } from "@/lib/utils";

export default function PlayListPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const {
    playSong,
    playAll,
    currentSong,
    isPlaying,
    playMode,
    togglePlayMode,
  } = usePlayerStore();

  // 页面状态
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 防重复请求：缓存 + 锁 + 重试
  const [songDetailCache, setSongDetailCache] = useState<Record<string, Song>>(
    {},
  );
  const [requestLock, setRequestLock] = useState<Record<string, boolean>>({});
  const [retryRecord, setRetryRecord] = useState<Record<string, number>>({});
  const MAX_RETRY = 2;

  // 加载歌单歌曲
  useEffect(() => {
    if (!keyword) return;
    loadSongList();
  }, [keyword]);

  // 加载歌曲列表
  const loadSongList = async () => {
    setIsLoading(true);
    try {
      const res = await searchApi.searchSongs(keyword);
      setSongs(res.data.result || []);

      // 自动播放第一首（可选）
      if (res.data.result?.length) {
        await handlePlayAll();
      }
    } catch (err) {
      toast.error("加载歌单失败");
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取歌曲详情（带缓存/锁/重试）
  const getSongDetail = async (song: Song) => {
    const songId = song.songId;

    if (songDetailCache[songId]) return songDetailCache[songId];
    if (requestLock[songId]) return null;
    const currentRetry = retryRecord[songId] || 0;
    if (currentRetry >= MAX_RETRY) {
      toast.error(`播放失败：${song.songTitle}（已达最大重试次数）`);
      return null;
    }

    setRequestLock((prev) => ({ ...prev, [songId]: true }));
    setRetryRecord((prev) => ({ ...prev, [songId]: currentRetry + 1 }));

    try {
      toast.loading(`加载歌曲：${song.songTitle}`, { id: `load-${songId}` });
      const res = await searchApi.getSongDetail(song.platform, songId);
      const fullSong = {
        ...song,
        songUrl: res.data.result.songUrl,
        songLyric: res.data.result.songLyric,
      };
      setSongDetailCache((prev) => ({ ...prev, [songId]: fullSong }));
      toast.success(`加载完成：${song.songTitle}`, { id: `load-${songId}` });
      return fullSong;
    } catch (err) {
      console.error("获取歌曲详情失败:", err);
      toast.error(
        `加载失败：${song.songTitle}（重试 ${currentRetry + 1}/${MAX_RETRY}）`,
        { id: `load-${songId}` },
      );
      return null;
    } finally {
      setRequestLock((prev) => ({ ...prev, [songId]: false }));
    }
  };

  // 播放单首歌曲（首次播放自动传完整列表）
  const handlePlaySong = async (song: Song) => {
    const fullSong = await getSongDetail(song);
    if (!fullSong) return;
    await playSong(fullSong, songs);
  };

  // 播放全部（自动传完整列表到播放器）
  const handlePlayAll = async () => {
    if (!songs.length) return;
    const fullSong = await getSongDetail(songs[0]);
    if (!fullSong) return;
    await playAll(songs);
  };

  // 判断歌曲是否正在播放
  const isSongPlaying = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
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

          {/* 循环模式切换 */}
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
                      alt={song.songTitle}
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

                <span className="text-sm text-muted-foreground hidden md:block">
                  {formatTime(song.duration)}
                </span>

                {/* 播放/暂停按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySong(song);
                  }}
                >
                  {isSongPlaying(song) ? (
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

      <PlayerBar />
    </MainLayout>
  );
}
