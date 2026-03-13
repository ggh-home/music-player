"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn, formatTime, parseLRC } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  Heart,
  Download,
  ChevronUp,
  ChevronDown,
  Clock,
  Mic2,
} from "lucide-react";
import { usePlayerStore, useAuthStore } from "@/stores";
import { likeApi, downloadApi } from "@/services/api";
import toast from "react-hot-toast";
import { LyricPanel, LyricLine } from "@/components/player/LyricPanel";

export function PlayerBar() {
  const {
    isPlaying,
    currentSong,
    currentEpisode,
    currentType,
    currentTime,
    duration,
    volume,
    isMuted,
    playMode,
    showPlayer,
    showLyric,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setMuted,
    togglePlayMode,
    next,
    prev,
    setShowPlaylist,
    setShowLyric,
  } = usePlayerStore();

  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ====================== 接口歌词自动解析 ======================
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);

  // 切换歌曲时自动加载并解析歌词
  useEffect(() => {
    // 1. 没有当前歌曲 → 清空歌词
    if (!currentSong) {
      setLyricLines([]);
      return;
    }

    // 2. 从你接口返回的 songLyric 直接解析
    if (currentSong.songLyric) {
      // 直接解析接口返回的 LRC 字符串
      const parsed = parseLRC(currentSong.songLyric);
      setLyricLines(parsed);
    } else {
      setLyricLines([]);
    }
  }, [currentSong]); // 监听歌曲切换
  // =============================================================

  const currentItem = currentType === "song" ? currentSong : currentEpisode;
  const title =
    currentType === "song" ? currentSong?.songTitle : currentEpisode?.name;
  const artist =
    currentType === "song"
      ? currentSong?.singerName
      : currentEpisode?.albumName;
  const cover = currentType === "song" ? currentSong?.cover : undefined;

  // 检查是否已喜欢
  useEffect(() => {
    if (currentSong && isAuthenticated) {
      likeApi
        .checkLiked(currentSong.songId)
        .then((res) => setIsLiked(res.data.data))
        .catch(() => setIsLiked(false));
    }
  }, [currentSong, isAuthenticated]);

  // 播放/暂停
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentItem]);

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 时间更新
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // 进度跳转
  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // 喜欢/取消喜欢
  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    if (!currentSong) return;

    try {
      if (isLiked) {
        await likeApi.unlikeSong(currentSong.songId);
        setIsLiked(false);
        toast.success("已取消喜欢");
      } else {
        await likeApi.likeSong(currentSong.songId, currentSong.platform);
        setIsLiked(true);
        toast.success("已添加到喜欢的歌曲");
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  // 下载
  const handleDownload = () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    if (!currentSong) return;
    toast.success("已添加到下载队列");
  };

  // 播放模式图标
  const PlayModeIcon = {
    list: ListMusic,
    order: ListMusic,
    random: Shuffle,
    single: Repeat1,
  }[playMode];

  const playModeText = {
    list: "列表循环",
    order: "顺序播放",
    random: "随机播放",
    single: "单曲循环",
  }[playMode];

  if (!showPlayer || !currentItem) {
    return null;
  }

  return (
    <div className="relative border-t bg-card px-4 py-3">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong?.songUrl || currentEpisode?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (playMode === "single") {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
            }
          } else {
            next();
          }
        }}
        onLoadedMetadata={(e) => {
          const target = e.target as HTMLAudioElement;
          usePlayerStore.setState({ duration: target.duration });
        }}
      />

      {/* 滚动歌词面板 */}
      <div className="relative h-[1vh] max-h-[400px]">
        <LyricPanel
          showLyric={showLyric}
          setShowLyric={setShowLyric}
          currentTime={currentTime}
          lyricLines={lyricLines}
          songTitle={title}
          singerName={artist}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Song Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
          <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted">
            {currentSong?.songImg ? (
              <Image
                src={currentSong.songImg}
                alt={currentSong.songTitle || ""}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Mic2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{title}</p>
            <p className="text-sm text-muted-foreground truncate">{artist}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", isLiked && "text-red-500")}
              onClick={handleLike}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
          <div className="flex items-center gap-2">
            {/* Play Mode */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <PlayModeIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => togglePlayMode()}>
                  <span className="text-xs">{playModeText}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Prev */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prev}
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            {/* Next */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={next}
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            {/* Playlist */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPlaylist(true)}
            >
              <ListMusic className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-muted-foreground w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Extra */}
        <div className="flex items-center gap-2 w-1/4 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMuted(!isMuted)}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => setVolume(v[0])}
            className="w-20"
          />

          {/* 打开歌词按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowLyric(!showLyric)}
          >
            {showLyric ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
