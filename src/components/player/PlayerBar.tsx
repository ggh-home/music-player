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
  Mic2,
} from "lucide-react";
import { usePlayerStore, useAuthStore } from "@/stores";
import { likeApi } from "@/services/api";
import toast from "react-hot-toast";
import { LyricPanel } from "@/components/player/LyricPanel";
import type { LyricLine } from "@/components/player/LyricPanel";

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

  // 歌词解析
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  useEffect(() => {
    if (!currentSong) {
      setLyricLines([]);
      return;
    }
    if (currentSong.songLyric) {
      const parsed = parseLRC(currentSong.songLyric);
      setLyricLines(parsed);
    } else {
      setLyricLines([]);
    }
  }, [currentSong]);

  const currentItem = currentType === "song" ? currentSong : currentEpisode;
  const title =
    currentType === "song" ? currentSong?.songTitle : currentEpisode?.name;
  const artist =
    currentType === "song"
      ? currentSong?.singerName
      : currentEpisode?.albumName;

  // 检查是否已喜欢
  // useEffect(() => {
  //   if (currentSong && isAuthenticated) {
  //     likeApi
  //       .checkLiked(currentSong.songId)
  //       .then((res) => setIsLiked(res.data.data))
  //       .catch(() => setIsLiked(false));
  //   }
  // }, [currentSong, isAuthenticated]);

  // =============== 核心修复 1：监听歌曲切换，自动加载并播放 ===============
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.songUrl) return;

    // 切歌时重置进度
    audio.currentTime = 0;
    // 加载新歌曲
    audio.load();

    // 切歌后如果是播放状态，自动播放
    if (isPlaying) {
      audio.play().catch((err) => console.error("自动播放失败", err));
    }
  }, [currentSong, isPlaying]);

  // =============== 播放/暂停控制（简化，避免冲突） ===============
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // 只有当前歌曲已加载才播放
      if (audio.src.includes(currentSong?.songUrl)) {
        audio.play().catch((err) => {
          console.error("播放失败:", err);
          toast.error("播放失败，请检查网络或重试");
          setIsPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong, setIsPlaying]);

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

  // 播放结束
  const handleEnded = () => {
    if (playMode === "single") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      // 自动下一首
      next();
    }
  };

  // 元数据加载完成
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      usePlayerStore.setState({ duration: audioRef.current.duration });
    }
  };

  // 音频错误处理
  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error("音频加载错误:", e.currentTarget.error);
    toast.error("音频加载失败，请重试");
    setIsPlaying(false);
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
    } catch {
      toast.error("操作失败");
    }
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
      <audio
        ref={audioRef}
        src={currentSong?.songUrl || currentEpisode?.url}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />

      {/* 歌词面板 */}
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

      {/* 底部控制栏 */}
      <div className="flex items-center justify-between gap-4">
        {/* 歌曲信息 */}
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
              onClick={() => toast.success("已添加到下载队列")}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 播放控制 */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <PlayModeIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={togglePlayMode}>
                  <span className="text-xs">{playModeText}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prev}
            >
              <SkipBack className="h-5 w-5" />
            </Button>

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

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={next}
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPlaylist(true)}
            >
              <ListMusic className="h-4 w-4" />
            </Button>
          </div>

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
