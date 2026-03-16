import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Song, AudioEpisode, PlayMode, AudioQuality, PlayQueueItem } from "@/types";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";

interface PlayerState {
  isPlaying: boolean;
  currentSong: Song | null;
  currentEpisode: AudioEpisode | null;
  currentType: "song" | "audiobook" | null;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  playMode: PlayMode;
  playbackRate: number;
  quality: AudioQuality;
  playQueue: PlayQueueItem[];
  currentIndex: number;
  showPlayer: boolean;
  showLyric: boolean;
  showPlaylist: boolean;
  isFullscreen: boolean;
  sleepTimer: number | null;
  sleepTimerEnd: number | null;
  currentLyric: string;
  lyrics: { time: number; text: string }[];
  currentLyricIndex: number;
  skipStart: number;
  skipEnd: number;

  // 新增
  songDetailCache: Record<string, Song>;
  requestLock: Record<string, boolean>;
  retryRecord: Record<string, number>;

  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentSong: (song: Song | null) => void;
  setCurrentEpisode: (episode: AudioEpisode | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  setPlayMode: (mode: PlayMode) => void;
  togglePlayMode: () => void;
  setPlaybackRate: (rate: number) => void;
  setQuality: (quality: AudioQuality) => void;
  setPlayQueue: (queue: PlayQueueItem[]) => void;
  addToQueue: (item: PlayQueueItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  next: () => void;
  prev: () => void;
  playAtIndex: (index: number) => void;
  togglePlay: () => void;
  setShowPlayer: (show: boolean) => void;
  setShowLyric: (show: boolean) => void;
  setShowPlaylist: (show: boolean) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  setLyrics: (lyrics: { time: number; text: string }[]) => void;
  setCurrentLyricIndex: (index: number) => void;
  setSkipStart: (seconds: number) => void;
  setSkipEnd: (seconds: number) => void;

  // 新增核心方法
  fetchSongDetail: (song: Song) => Promise<Song | null>;
  playItemAtIndex: (index: number) => Promise<void>;
  playSong: (song: Song, fullPlaylist: Song[]) => Promise<void>;
  playAll: (fullPlaylist: Song[]) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // 原有初始状态
      isPlaying: false,
      currentSong: null,
      currentEpisode: null,
      currentType: null,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: 0.7,
      isMuted: false,
      playMode: "list",
      playbackRate: 1,
      quality: "high",
      playQueue: [],
      currentIndex: -1,
      showPlayer: false,
      showLyric: false,
      showPlaylist: false,
      isFullscreen: false,
      sleepTimer: null,
      sleepTimerEnd: null,
      currentLyric: "",
      lyrics: [],
      currentLyricIndex: -1,
      skipStart: 0,
      skipEnd: 0,

      songDetailCache: {},
      requestLock: {},
      retryRecord: {},

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      setCurrentSong: (song) => {
        if (song) {
          set({
            currentSong: song,
            currentType: "song",
            currentEpisode: null,
            showPlayer: true,
            currentTime: 0,
            duration: song.duration || 0,
          });
        } else {
          set({ currentSong: null, currentType: null });
        }
      },

      setCurrentEpisode: (episode) => {
        if (episode) {
          set({
            currentEpisode: episode,
            currentType: "audiobook",
            currentSong: null,
            showPlayer: true,
            currentTime: episode.playProgress || 0,
          });
        } else {
          set({ currentEpisode: null, currentType: null });
        }
      },

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setBuffered: (buffered) => set({ buffered }),

      setVolume: (volume) => {
        set({ volume, isMuted: volume === 0 });
      },

      setMuted: (isMuted) => set({ isMuted }),

      setPlayMode: (mode) => set({ playMode: mode }),

      togglePlayMode: () => {
        const modes: PlayMode[] = ["list", "random", "single", "order"];
        const currentIndex = modes.indexOf(get().playMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        set({ playMode: nextMode });
      },

      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setQuality: (quality) => set({ quality }),

      setPlayQueue: (queue) => set({ playQueue: queue, currentIndex: queue.length > 0 ? 0 : -1 }),

      addToQueue: (item) => {
        const queue = [...get().playQueue, item];
        set({ playQueue: queue });
      },

      removeFromQueue: (index) => {
        const queue = [...get().playQueue];
        queue.splice(index, 1);
        const newIndex = get().currentIndex;
        if (index < newIndex) {
          set({ playQueue: queue, currentIndex: newIndex - 1 });
        } else if (index === newIndex) {
          set({ playQueue: queue, currentIndex: -1, isPlaying: false });
        } else {
          set({ playQueue: queue });
        }
      },

      clearQueue: () => set({ playQueue: [], currentIndex: -1 }),

      next: () => {
        const { playQueue, currentIndex, playMode, playItemAtIndex } = get();
        if (playQueue.length === 0) return;

        let nextIndex: number;
        if (playMode === "random") {
          nextIndex = Math.floor(Math.random() * playQueue.length);
        } else {
          nextIndex = (currentIndex + 1) % playQueue.length;
        }

        // 🔧 直接调用切歌方法，自动播放
        playItemAtIndex(nextIndex);
      },

      prev: () => {
        const { playQueue, currentIndex, playMode, playItemAtIndex } = get();
        if (playQueue.length === 0) return;

        let prevIndex: number;
        if (playMode === "random") {
          prevIndex = Math.floor(Math.random() * playQueue.length);
        } else {
          prevIndex = currentIndex <= 0 ? playQueue.length - 1 : currentIndex - 1;
        }

        // 🔧 直接调用切歌方法，自动播放
        playItemAtIndex(prevIndex);
      },

      playAtIndex: (index) => {
        get().playItemAtIndex(index);
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      setShowPlayer: (show) => set({ showPlayer: show }),
      setShowLyric: (show) => set({ showLyric: show }),
      setShowPlaylist: (show) => set({ showPlaylist: show }),
      setIsFullscreen: (isFullscreen) => set({ isFullscreen }),

      setSleepTimer: (minutes) => {
        if (minutes) {
          const endTime = Date.now() + minutes * 60 * 1000;
          set({ sleepTimer: minutes, sleepTimerEnd: endTime });
        } else {
          set({ sleepTimer: null, sleepTimerEnd: null });
        }
      },

      setLyrics: (lyrics) => set({ lyrics }),
      setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),

      setSkipStart: (seconds) => set({ skipStart: seconds }),
      setSkipEnd: (seconds) => set({ skipEnd: seconds }),

      // ========== 新增核心方法 ==========
      fetchSongDetail: async (song) => {
        const { songDetailCache, requestLock, retryRecord } = get();
        const songId = song.songId;
        const MAX_RETRY = 2;

        if (songDetailCache[songId]) {
          return songDetailCache[songId];
        }
        if (requestLock[songId]) {
          return null;
        }
        const currentRetry = retryRecord[songId] || 0;
        if (currentRetry >= MAX_RETRY) {
          toast.error(`歌曲 ${song.songTitle} 播放失败，已达最大重试次数`);
          return null;
        }

        set((state) => ({
          requestLock: { ...state.requestLock, [songId]: true },
          retryRecord: { ...state.retryRecord, [songId]: currentRetry + 1 },
        }));

        try {
          toast.loading(`正在加载: ${song.songTitle}`, { id: `fetch-${songId}` });
          const res = await searchApi.getSongDetail(song.platform, songId);
          const fullSong: Song = {
            ...song,
            songUrl: res.data.result.songUrl,
            songLyric: res.data.result.songLyric,
          };
          set((state) => ({
            songDetailCache: { ...state.songDetailCache, [songId]: fullSong },
          }));
          toast.success(`加载完成: ${song.songTitle}`, { id: `fetch-${songId}` });
          return fullSong;
        } catch (error) {
          console.error("获取歌曲详情失败", error);
          toast.error(`加载失败: ${song.songTitle}（重试 ${currentRetry + 1}/${MAX_RETRY}）`, {
            id: `fetch-${songId}`,
          });
          return null;
        } finally {
          set((state) => ({
            requestLock: { ...state.requestLock, [songId]: false },
          }));
        }
      },

      playItemAtIndex: async (index) => {
        const { playQueue, currentSong, isPlaying, fetchSongDetail } = get();
        if (index < 0 || index >= playQueue.length) return;

        const item = playQueue[index];
        if (item.type !== "song") return; // 有声书暂不处理

        let song = item.data as Song;

        // 🔧 优化1：如果歌曲没有 songUrl，先强制加载详情
        if (!song.songUrl) {
          const fullSong = await fetchSongDetail(song);
          if (!fullSong) return; // 加载失败则不播放
          song = fullSong;
          // 更新队列中的歌曲信息（同步缓存）
          const newQueue = [...playQueue];
          newQueue[index] = { ...newQueue[index], data: fullSong };
          set({ playQueue: newQueue });
        }

        // 🔧 优化2：判断是否为「同一首歌（且 URL 相同）」
        const isSameSong = currentSong?.songId === song.songId && currentSong?.songUrl === song.songUrl;

        if (isSameSong) {
          // 同一首歌：切换暂停/播放（保留原有逻辑）
          set({ isPlaying: !isPlaying, showPlayer: true });
        } else {
          // 新歌曲：强制设置为播放状态（核心修复！）
          set({
            currentSong: song,
            currentType: "song",
            currentEpisode: null,
            currentIndex: index,
            currentTime: 0, // 重置播放进度
            duration: song.duration || 0,
            isPlaying: true, // 🔧 强制自动播放，无需手动点
            showPlayer: true, // 确保显示播放器
          });
        }
      },

      playSong: async (song, fullPlaylist) => {
        const { setPlayQueue, playItemAtIndex } = get();

        try {
          toast.loading("正在加载播放列表...", { id: "load-playlist" });

          // 批量加载所有歌曲的 songUrl 和 songLyric
          const filledPlaylist = await Promise.all(
            fullPlaylist.map(async (item) => {
              // 跳过已缓存的歌曲（提升性能）
              const cachedSong = get().songDetailCache[item.songId];
              if (cachedSong) {
                return cachedSong;
              }
              try {
                const res = await searchApi.getSongDetail(item.platform, item.songId);
                const detail = res.data?.result;
                return {
                  ...item,
                  songUrl: detail?.songUrl ?? "",
                  songLyric: detail?.songLyric ?? "",
                };
              } catch (err) {
                console.warn(`歌曲 ${item.songTitle} 加载失败`, err);
                return item;
              }
            })
          );

          // 构建播放队列
          const newPlayQueue: PlayQueueItem[] = filledPlaylist.map((s) => ({
            id: s.songId,
            type: "song",
            data: s,
          }));

          const targetIndex = newPlayQueue.findIndex((item) => item.id === song.songId);
          if (targetIndex === -1) {
            toast.error("歌曲不在播放列表中", { id: "load-playlist" });
            return;
          }

          // 先设置队列，再触发播放（核心：顺序不能反）
          setPlayQueue(newPlayQueue);
          toast.success("播放列表加载完成", { id: "load-playlist" });

          // 🔧 强制触发自动播放，无需手动操作
          await playItemAtIndex(targetIndex);
        } catch (error) {
          console.error("播放列表加载失败", error);
          toast.error("加载播放信息失败", { id: "load-playlist" });
        }
      },

      playAll: async (fullPlaylist) => {
        if (!fullPlaylist.length) return;
        const { playSong } = get();
        await playSong(fullPlaylist[0], fullPlaylist);
      },
    }),
    {
      name: "player-storage",
      partialize: (state) => ({
        volume: state.volume,
        playMode: state.playMode,
        playbackRate: state.playbackRate,
        quality: state.quality,
        skipStart: state.skipStart,
        skipEnd: state.skipEnd,
      }),
    }
  )
);