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
import toast from "react-hot-toast";

export default function PlaylistDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { setCurrentSong, setIsPlaying, setPlayQueue, addToQueue } = usePlayerStore();
  
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
      // 尝试从 API 加载歌单详情
      // const res = await playlistApi.getPlaylistDetail(id);
      // setPlaylist(res.data.data.playlist);
      // setSongs(res.data.data.songs);
      
      // 模拟数据
      setPlaylist({
        id,
        name: "精选歌单",
        description: "这是一个精选歌单",
        cover: "https://picsum.photos/400/400?random=1",
        creator: "用户",
        songCount: 10,
        playCount: 10000,
        createTime: "2024-01-01",
      });
      
      setSongs([
        { id: "1", name: "夜曲", singer: "周杰伦", duration: 226, platform: "QQ" },
        { id: "2", name: "晴天", singer: "周杰伦", duration: 269, platform: "QQ" },
        { id: "3", name: "七里香", singer: "周杰伦", duration: 299, platform: "QQ" },
        { id: "4", name: "稻香", singer: "周杰伦", duration: 223, platform: "QQ" },
        { id: "5", name: "青花瓷", singer: "周杰伦", duration: 239, platform: "QQ" },
      ]);
    } catch (error) {
      toast.error("加载歌单失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    setPlayQueue(songs.map((s) => ({ id: s.id, type: "song" as const, data: s })));
    setCurrentSong(songs[0]);
    setIsPlaying(true);
  };

  const handlePlay = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
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
              <Image src={playlist.cover} alt={playlist.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-6xl font-bold text-white">{playlist.name[0]}</span>
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
                <Heart className={cn("h-4 w-4 mr-2", isCollected && "fill-current")} />
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
          <div className="flex items-center gap-4 px-3 py-2 text-sm text-muted-foreground border-b">
            <span className="w-8">#</span>
            <span className="flex-1">标题</span>
            <span className="w-24 hidden md:block">专辑</span>
            <span className="w-16">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          {songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <span className="text-muted-foreground w-8 text-center">{index + 1}</span>
              <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                {song.cover ? (
                  <Image src={song.cover} alt={song.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.name}</p>
                <p className="text-sm text-muted-foreground truncate">{song.singer}</p>
              </div>
              <span className="w-24 text-sm text-muted-foreground truncate hidden md:block">
                {song.album}
              </span>
              <span className="w-16 text-sm text-muted-foreground">{formatTime(song.duration)}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePlay(song)}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

import { cn } from "@/lib/utils";
