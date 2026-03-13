"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Play, Heart, MoreHorizontal } from "lucide-react";
import { Song } from "@/types";
import { likeApi } from "@/services/api";
import { usePlayerStore, useAuthStore } from "@/stores";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LikedSongsPage() {
  const { isAuthenticated } = useAuthStore();
  const { setCurrentSong, setIsPlaying, addToQueue } = usePlayerStore();
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadLikedSongs();
    }
  }, [isAuthenticated]);

  const loadLikedSongs = async () => {
    setIsLoading(true);
    try {
      const res = await likeApi.getLikedSongs();
      setLikedSongs(res.data.data || []);
    } catch (error) {
      toast.error("加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleUnlike = async (songId: string) => {
    try {
      await likeApi.unlikeSong(songId);
      setLikedSongs(likedSongs.filter((s) => s.songId !== songId));
      toast.success("已取消喜欢");
    } catch (error) {
      toast.error("操作失败");
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">请先登录查看喜欢的歌曲</p>
          <Button asChild>
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end gap-6 pb-6 border-b">
          <div className="h-40 w-40 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Heart className="h-20 w-20 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">歌单</p>
            <h1 className="text-4xl font-bold mb-4">我喜欢的音乐</h1>
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">{likedSongs.length}首歌曲</p>
              {likedSongs.length > 0 && (
                <Button onClick={() => handlePlay(likedSongs[0])}>
                  <Play className="h-4 w-4 mr-2" />
                  播放全部
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Songs List */}
        {isLoading ? (
          <div className="text-center py-12">加载中...</div>
        ) : likedSongs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            还没有喜欢的歌曲，去发现音乐吧
          </div>
        ) : (
          <div className="space-y-2">
            {likedSongs.map((song, index) => (
              <div
                key={song.songId}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <span className="text-muted-foreground w-6 text-center">
                  {index + 1}
                </span>
                <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                  {song.cover ? (
                    <Image
                      src={song.cover}
                      alt={song.songTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.songTitle}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.singerName}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatTime(song.duration)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePlay(song)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => handleUnlike(song.songId)}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
