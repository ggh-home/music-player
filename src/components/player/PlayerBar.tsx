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
  Repeat1,
  Shuffle,
  ListMusic,
  Heart,
  Download,
  ChevronUp,
  ChevronDown,
  Mic2,
  X,
} from "lucide-react";
import { usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import { AudioEpisode, Song } from "@/types";
import {
  addSongToHeartPlaylist,
  getSongFavoriteKey,
  loadLikedSongMapBySongList,
  removeSongFromHeartPlaylist,
} from "@/lib/heartPlaylist";
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
    playbackRate,
    showPlayer,
    showLyric,
    setIsPlaying,
    setCurrentSong,
    setCurrentTime,
    setDuration,
    setVolume,
    setMuted,
    togglePlayMode,
    next,
    prev,
    fetchSongDetail,
    setShowPlaylist,
    setShowLyric,
    showPlaylist,
    playQueue,
    currentIndex,
    playAtIndex,
    removeFromQueue,
  } = usePlayerStore();
  const { downloadSong } = useDownloadStore();

  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  // [收藏功能新增] PlayerBar 当前曲目对应的红心歌单 ID
  const [heartPlaylistId, setHeartPlaylistId] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef(0);
  const latestTimeRef = useRef(0);

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
  const currentSourceUrl =
    currentType === "song" ? currentSong?.songUrl : currentEpisode?.url;
  const coverImage = currentType === "song" ? currentSong?.songImg : undefined;

  // [收藏功能新增 START] 切歌时查询当前曲目是否在“我的红心歌单”
  useEffect(() => {
    if (!isAuthenticated || !currentSong || currentType !== "song") {
      setIsLiked(false);
      if (!isAuthenticated) setHeartPlaylistId(null);
      return;
    }

    let cancelled = false;

    const syncCurrentSongLikeState = async () => {
      try {
        const { heartPlaylistId: nextPlaylistId, likedSongMap } =
          await loadLikedSongMapBySongList([currentSong]);

        if (cancelled) return;

        setHeartPlaylistId(nextPlaylistId);
        setIsLiked(likedSongMap[getSongFavoriteKey(currentSong)] === true);
      } catch {
        if (cancelled) return;
        setIsLiked(false);
      }
    };

    void syncCurrentSongLikeState();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.songId, currentSong?.platform, currentType, isAuthenticated]);
  // [收藏功能新增 END] 切歌时查询当前曲目是否在“我的红心歌单”

  // 兼容直接 setCurrentSong 的场景：缺少 songUrl 时按需补详情
  useEffect(() => {
    if (currentType !== "song" || !currentSong || currentSong.songUrl) return;

    let cancelled = false;

    const loadSongDetail = async () => {
      const fullSong = await fetchSongDetail(currentSong);
      if (!cancelled && fullSong) {
        setCurrentSong(fullSong);
      }
    };

    void loadSongDetail();

    return () => {
      cancelled = true;
    };
  }, [currentSong, currentType, fetchSongDetail, setCurrentSong]);

  // 音源变化时只负责重载资源，不再干预播放状态
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentSourceUrl) {
      audio.pause();
      pendingSeekRef.current = 0;
      setDuration(0);
      setCurrentTime(0);
      setSeekValue(0);
      setIsSeeking(false);
      return;
    }

    pendingSeekRef.current = latestTimeRef.current;
    setDuration(0);
    setSeekValue(latestTimeRef.current);
    audio.load();
  }, [currentSourceUrl, setCurrentTime, setDuration]);

  // 播放/暂停控制单独处理，避免切换时重置进度
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (!currentSourceUrl) return;
      audio.play().catch((err) => {
        if (err.name === "AbortError") return;
        console.error("播放失败:", err);
        toast.error("播放失败，请检查网络或重试");
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSourceUrl, setIsPlaying]);

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 播放速度同步到 audio 元素
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  useEffect(() => {
    latestTimeRef.current = currentTime;
  }, [currentTime]);

  // 时间更新
  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      const nextTime = audioRef.current.currentTime;
      setCurrentTime(nextTime);
      setSeekValue(nextTime);
    }
  };

  // 拖动进度时先更新 UI，释放后再真正 seek
  const handleSeekChange = (value: number[]) => {
    setIsSeeking(true);
    setSeekValue(value[0] ?? 0);
  };

  const handleSeekCommit = (value: number[]) => {
    const nextTime = value[0] ?? 0;
    setIsSeeking(false);
    setSeekValue(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
  };

  // 播放结束
  const handleEnded = () => {
    if (playMode === "single") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.play().catch(() => {});
      }
    } else {
      next();
    }
  };

  // 元数据加载完成
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const nextDuration = Number.isFinite(audioRef.current.duration)
        ? audioRef.current.duration
        : 0;

      setDuration(nextDuration);
      audioRef.current.playbackRate = playbackRate;

      if (pendingSeekRef.current > 0) {
        const nextTime = Math.min(pendingSeekRef.current, nextDuration || pendingSeekRef.current);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        setSeekValue(nextTime);
      }

      pendingSeekRef.current = 0;
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
    if (!currentSong || currentType !== "song") return;

    try {
      if (isLiked) {
        const playlistId = await removeSongFromHeartPlaylist(currentSong, heartPlaylistId);
        if (playlistId) setHeartPlaylistId(playlistId);
        setIsLiked(false);
        toast.success("已取消收藏");
      } else {
        const playlistId = await addSongToHeartPlaylist(currentSong, heartPlaylistId);
        setHeartPlaylistId(playlistId);
        setIsLiked(true);
        toast.success("已收藏到我的红心歌单");
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDownloadCurrentSong = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    if (!currentSong || currentType !== "song") {
      toast.error("当前内容不支持下载");
      return;
    }
    await downloadSong(currentSong);
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
      {showPlaylist && (
        <div className="absolute bottom-full right-4 mb-3 z-40 w-[min(460px,calc(100vw-2rem))] rounded-xl border bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-medium">当前播放列表</p>
              <p className="text-xs text-muted-foreground">{playQueue.length} 项</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPlaylist(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {playQueue.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              当前播放列表为空
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-2">
              {playQueue.map((item, index) => {
                const isSongItem = item.type === "song";
                const song = isSongItem ? (item.data as Song) : null;
                const episode = !isSongItem ? (item.data as AudioEpisode) : null;
                const itemTitle = isSongItem
                  ? song?.songTitle || "未知歌曲"
                  : episode?.name || "未知有声内容";
                const itemSubTitle = isSongItem
                  ? song?.singerName || "未知歌手"
                  : episode?.albumName || "";
                const isCurrent = index === currentIndex;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent",
                      isCurrent && "bg-accent",
                    )}
                    onClick={() => playAtIndex(index)}
                  >
                    <span className="w-5 text-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{itemTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">{itemSubTitle}</p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-primary">{isPlaying ? "播放中" : "已暂停"}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFromQueue(index);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <audio
        ref={audioRef}
        src={currentSourceUrl}
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
            {coverImage ? (
              <Image
                src={coverImage}
                alt={title || ""}
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
              onClick={() => void handleDownloadCurrentSong()}
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
              onClick={() => setShowPlaylist(!showPlaylist)}
            >
              <ListMusic className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-muted-foreground w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[isSeeking ? seekValue : currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekCommit}
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
