// 首页推荐歌单的播放列表页，展示搜索关键词对应的歌曲列表，并支持点击歌曲播放
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Repeat, Repeat1, Music } from "lucide-react";
import Image from "next/image";
import { usePlayerStore } from "@/stores";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";
import { Song } from "@/types";
import { PlayerBar } from "@/components/player/PlayerBar";

export default function PlayListPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const {
    setCurrentSong,
    isPlaying,
    currentSong,
    playMode,
    togglePlayMode,
    setPlayQueue,
    togglePlay,
  } = usePlayerStore();

  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 判断当前歌曲是否为正在播放的歌曲
  const isCurrentSongActive = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
  };

  // 加载关键词对应歌曲列表
  useEffect(() => {
    if (!keyword) return;

    const loadSongList = async () => {
      setIsLoading(true);
      try {
        const res = await searchApi.searchSongs(keyword);
        const list = res.data.result || [];
        setSongs(list);

        if (list.length > 0) {
          setPlayQueue(
            list.map((s) => ({ id: s.songId, type: "song", data: s })),
          );

          const firstSong = list[0];
          const detail = await searchApi.getSongDetail(
            firstSong.platform,
            firstSong.songId,
          );

          setCurrentSong({
            ...firstSong,
            songUrl: detail.data.result.songUrl,
            songLyric: detail.data.result.songLyric,
          });
          togglePlay(); // 自动播放
          toast.success(`正在播放：${keyword}`, { duration: 1500 });
        }
      } catch (err) {
        toast.error("歌曲列表加载失败");
        setSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSongList();
  }, [keyword, setCurrentSong, setPlayQueue, togglePlay]);

  // 点击歌曲播放
  const handlePlaySong = async (song: Song) => {
    try {
      // 如果是当前播放歌曲，直接切换暂停/播放
      if (currentSong?.songId === song.songId) {
        togglePlay();
        return;
      }
      // 新歌曲，加载并播放
      const detail = await searchApi.getSongDetail(song.platform, song.songId);
      setCurrentSong({
        ...song,
        songUrl: detail.data.result.songUrl,
        songLyric: detail.data.result.songLyric,
      });
      togglePlay();
    } catch (err) {
      toast.error("播放失败");
    }
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

                {/* 🔥 动态切换播放/暂停按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
                    handlePlaySong(song);
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

      <PlayerBar />
    </MainLayout>
  );
}
