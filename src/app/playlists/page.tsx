"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, MoreHorizontal, Share2, Pause } from "lucide-react";
import { Song, Playlist } from "@/types";
import { playlistApi, searchApi } from "@/services/api";
import { usePlayerStore, useAuthStore } from "@/stores";
import { formatTime, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PlayerBar } from "@/components/player/PlayerBar";

export default function PlaylistDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { playSong, currentSong, isPlaying } = usePlayerStore();

  // 页面状态
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollected, setIsCollected] = useState(false);

  // 防重复请求：缓存 + 锁 + 重试
  const [songDetailCache, setSongDetailCache] = useState<Record<string, Song>>(
    {},
  );
  const [requestLock, setRequestLock] = useState<Record<string, boolean>>({});
  const [retryRecord, setRetryRecord] = useState<Record<string, number>>({});
  const MAX_RETRY = 2;

  // 加载歌单详情
  useEffect(() => {
    if (id) {
      loadPlaylistDetail();
    }
  }, [id]);

  // 加载歌单数据
  const loadPlaylistDetail = async () => {
    setIsLoading(true);
    try {
      const res = await playlistApi.getMyPlaylists(id);
      const songList = res.data.result || [];
      setSongs(songList);

      setPlaylist({
        id: Number(id),
        name: "我的歌单",
        cover: "",
        description: "自定义歌单",
        creator: "我",
        songCount: songList.length,
        playCount: 0,
      } as Playlist);
    } catch (error) {
      toast.error("加载歌单失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 获取歌曲详情（带缓存/锁/重试）
  const getSongDetail = async (song: Song) => {
    const songId = song.songId;

    if (song.songUrl && song.songLyric !== undefined) return song;
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
    await playSong(fullSong, songs);
  };

  // 收藏/取消收藏歌单
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

  // 判断歌曲是否正在播放
  const isSongPlaying = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
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
      <div className="space-y-6 pb-24">
        {/* 歌单头部 */}
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
              <span>
                {playlist.playCount && playlist.playCount >= 10000
                  ? (playlist.playCount / 10000).toFixed(1)
                  : playlist.playCount || 0}
                万播放
              </span>
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
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 歌曲列表 */}
        <div className="space-y-2">
          <div className="flex items-center px-3 py-2 text-sm text-muted-foreground border-b">
            <span className="w-8 text-center">序号</span>
            <span className="flex-1 px-2">名称</span>
            <span className="w-32 text-left hidden md:block">专辑</span>
            <span className="w-12 hidden md:block text-center">时长</span>
            <span className="w-8 hidden md:block"></span>
          </div>
          {songs.map((song, index) => (
            <div
              key={song.songId}
              className="flex items-center px-3 py-3 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
              onClick={() => handlePlaySong(song)}
            >
              <span className="w-8 text-center text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
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
                <div className="min-w-0">
                  <p className="font-medium truncate">{song.songTitle}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.singerName}
                  </p>
                </div>
              </div>
              <span className="w-32 text-left text-sm text-muted-foreground truncate hidden md:block">
                {song.albumTitle}
              </span>
              <span className="w-12 text-sm text-muted-foreground hidden md:block text-center">
                {formatTime(song.duration)}
              </span>
              <div className="w-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
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
              </div>
            </div>
          ))}
        </div>
      </div>

      <PlayerBar />
    </MainLayout>
  );
}
