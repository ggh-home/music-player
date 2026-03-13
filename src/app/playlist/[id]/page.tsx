"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, MoreHorizontal, Share2, Clock, Plus } from "lucide-react";
import { Song, Playlist } from "@/types";
import { playlistApi, searchApi } from "@/services/api";
import { usePlayerStore, useAuthStore } from "@/stores";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PlaylistDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { setCurrentSong, setIsPlaying, setPlayQueue, addToQueue } =
    usePlayerStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollected, setIsCollected] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlaylistDetail();
    }
  }, [id]);

  const loadPlaylistDetail = async () => {
    setIsLoading(true);
    try {
      // 1. 适配新接口：返回 result 直接是歌曲数组
      const res = await playlistApi.getMyPlaylistsongs(id);
      const songList = res.data.result || [];
      setSongs(songList);

      // 2. 构造默认歌单基础信息（接口未返回，可替换为真实接口）
      setPlaylist({
        id: Number(id),
        name: "我的歌单",
        cover: "",
        description: "自定义歌单",
        creator: "我",
        songCount: songList.length,
        playCount: 0,
        rawDetail: songList,
      } as Playlist);
    } catch (error) {
      toast.error("加载歌单失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    setPlayQueue(
      songs.map((s) => ({
        id: s.songId,
        type: "song" as const,
        data: s,
      })),
    );
    setCurrentSong(songs[0]);
    setIsPlaying(true);
  };

  // 播放歌曲
  const handlePlay = async (song: Song) => {
    try {
      // 显示加载提示
      toast.loading(`正在加载: ${song.songTitle}`, {
        id: `play-${song.songId}`,
      });

      const songsRes = await searchApi.getSongDetail(
        song.platform,
        song.songId,
      );
      // 创建新的歌曲对象，合并原有属性和新获取的URL/歌词
      const songWithDetail = {
        ...song,
        songUrl: songsRes.data.result.songUrl,
        songLyric: songsRes.data.result.songLyric,
      };
      setCurrentSong(songWithDetail);
      setIsPlaying(true);
      toast.success(`正在播放: ${song.songTitle}`, {
        id: `play-${song.songId}`,
      });
    } catch (error) {
      // 处理错误
      toast.error(`播放失败: ${song.songTitle}`, { id: `play-${song.songId}` });
      console.error("获取歌曲详情失败:", error);
    }
  };

  const handleCollect = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }

    try {
      if (isCollected) {
        await playlistApi.uncollectPlaylist(id);
        setIsCollected(false);
        toast.success("已取消收藏");
      } else {
        await playlistApi.collectPlaylist("local", id);
        setIsCollected(true);
        toast.success("已收藏");
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </MainLayout>
    );
  }

  if (!playlist) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">歌单不存在</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 pb-6 border-b">
          <div className="relative h-48 w-48 rounded-xl overflow-hidden flex-shrink-0 mx-auto md:mx-0">
            {playlist.cover ? (
              <Image
                src={playlist.cover}
                alt={playlist.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-6xl font-bold text-white">
                  {playlist.name?.charAt(0) || "歌"}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-muted-foreground mb-2">歌单</p>
            <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
            <p className="text-muted-foreground mb-4">{playlist.description}</p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
              <span>创建者: {playlist.creator}</span>
              <span>{playlist.songCount}首歌曲</span>
              <span>{(playlist.playCount! / 10000).toFixed(1)}万播放</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Button onClick={handlePlayAll}>
                <Play className="h-4 w-4 mr-2" />
                播放全部
              </Button>
              <Button variant="outline" onClick={handleCollect}>
                <Heart
                  className={cn("h-4 w-4 mr-2", isCollected && "fill-current")}
                />
                {isCollected ? "已收藏" : "收藏"}
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Songs List */}
        <div className="space-y-2">
          <div className="flex items-center px-3 py-2 text-sm text-muted-foreground border-b">
            {/* 序号列：固定宽度+居中 */}
            <span className="w-8 text-center">序号</span>
            {/* 标题列：自适应 */}
            <span className="flex-1 px-2">名称</span>
            {/* 专辑列：固定宽度+左对齐（核心修改） */}
            <span className="w-32 text-left hidden md:block">专辑</span>
            {/* 时长列：固定宽度+居中 */}
            {/* <span className="w-16 text-center hidden md:block">
              <Clock className="h-4 w-4 mx-auto" />
            </span> */}
            {/* 操作列：预留宽度（与列表项对齐） */}
            <span className="w-12 hidden md:block"></span>
          </div>
          {songs.map((song, index) => (
            // ✅ 关键修改：添加 onClick 点击整行播放 + cursor-pointer
            <div
              key={song.songId}
              className="flex items-center px-3 py-3 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
              onClick={() => handlePlay(song)}
            >
              {/* 序号列：固定宽度+居中 */}
              <span className="w-8 text-center text-muted-foreground">
                {index + 1}
              </span>
              {/* 标题列：自适应+最小宽度限制（防止挤压） */}
              <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
                {/* 封面 */}
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  {song.songImg ? (
                    <Image
                      src={song.songImg}
                      alt={song.songTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {/* 歌名+歌手 */}
                <div className="min-w-0">
                  <p className="font-medium truncate">{song.songTitle}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.singerName}
                  </p>
                </div>
              </div>
              {/* 专辑列：固定宽度+左对齐+文本截断（核心修改） */}
              <span className="w-32 text-left text-sm text-muted-foreground truncate hidden md:block">
                {song.albumTitle}
              </span>
              {/* 时长列：固定宽度+居中 */}
              {/* <span className="w-16 text-center text-sm text-muted-foreground hidden md:block">
                {formatTime(song.duration || 0)}
              </span> */}
              {/* 操作列：固定宽度+透明占位（与表头对齐） */}
              <div className="w-12 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                {/* ✅ 关键修改：阻止事件冒泡，避免重复触发 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(song);
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
