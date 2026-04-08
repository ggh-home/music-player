"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Play, Heart, Download } from "lucide-react";
import { Song, PlaylistSongEntity } from "@/types";
import { likeApi } from "@/services/api";
import { usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import toast from "react-hot-toast";
import Link from "next/link";
import { getSongFavoriteKey } from "@/lib/heartPlaylist";

export default function LikedSongsPage() {
  // 全局状态
  const { isAuthenticated } = useAuthStore();
  const { playSong } = usePlayerStore();
  const { downloadSong } = useDownloadStore();

  // 本地状态
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 登录后自动加载收藏歌曲
  useEffect(() => {
    isAuthenticated && loadLikedSongs();
  }, [isAuthenticated]);

  // ============== 核心：加载喜欢的歌曲 ==============
  const loadLikedSongs = async () => {
    setIsLoading(true);
    try {
      const songs = await likeApi.getLikedSongs();
      setLikedSongs(songs);
    } catch (error) {
      toast.error("加载喜欢的歌曲失败");
      console.error("加载收藏歌曲异常：", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============== 工具函数：简化版（接口数据完整，无需冗余判断） ==============
  const getSongInfo = (song: Song) => {
    return {
      title: song.songTitle || "未知歌曲",
      singer: song.singerName || "未知歌手",
      album: song.albumTitle || "未知专辑",
      cover: song.songImg || "",
    };
  };

  // ============== 交互函数 ==============
  // 播放歌曲
  const handlePlay = async (song: Song) => {
    await playSong(song, likedSongs);
  };

  const handleDownloadSong = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    await downloadSong(song);
  };

  // 取消收藏
  const handleUnlike = async (song: Song) => {
    try {
      await likeApi.unlikeSong(song.songId, String(song.platform));
      // 本地更新列表
      const targetKey = getSongFavoriteKey(song);
      setLikedSongs((prev) =>
        prev.filter((item) => getSongFavoriteKey(item) !== targetKey),
      );
      toast.success("已取消喜欢");
    } catch (error) {
      toast.error("取消收藏失败");
      console.error("取消收藏异常：", error);
    }
  };

  // ============== 未登录拦截 ==============
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

  // ============== 页面渲染 ==============
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 歌单头部 */}
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

        {/* 歌曲列表 */}
        {isLoading ? (
          <div className="text-center py-12">加载中...</div>
        ) : likedSongs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            还没有喜欢的歌曲，去发现音乐吧
          </div>
        ) : (
          <div className="space-y-2">
            {likedSongs.map((song, index) => {
              const { title, singer, album, cover } = getSongInfo(song);
              return (
                <div
                  key={`${song.platform}-${song.songId}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
                >
                  <span className="text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>

                  {/* 歌曲封面 */}
                  <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <Play className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* 歌曲信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {singer} · {album}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handleDownloadSong(song)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handlePlay(song)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleUnlike(song)}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
