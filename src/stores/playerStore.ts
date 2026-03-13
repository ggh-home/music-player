import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Song, AudioEpisode, PlayMode, AudioQuality, PlayQueueItem } from "@/types";

interface PlayerState {
  // 播放状态
  isPlaying: boolean;
  currentSong: Song | null;
  currentEpisode: AudioEpisode | null;
  currentType: "song" | "audiobook" | null;

  // 播放进度
  currentTime: number;
  duration: number;
  buffered: number;

  // 播放器设置
  volume: number;
  isMuted: boolean;
  playMode: PlayMode;
  playbackRate: number;
  quality: AudioQuality;

  // 播放队列
  playQueue: PlayQueueItem[];
  currentIndex: number;

  // 显示状态
  showPlayer: boolean;
  showLyric: boolean;
  showPlaylist: boolean;
  isFullscreen: boolean;

  // 定时关闭
  sleepTimer: number | null;
  sleepTimerEnd: number | null;

  // 歌词
  currentLyric: string;
  lyrics: { time: number; text: string }[];
  currentLyricIndex: number;

  // 有声书设置
  skipStart: number;
  skipEnd: number;

  // Actions
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
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
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
        const { playQueue, currentIndex, playMode } = get();
        if (playQueue.length === 0) return;

        let nextIndex: number;
        if (playMode === "random") {
          nextIndex = Math.floor(Math.random() * playQueue.length);
        } else {
          nextIndex = (currentIndex + 1) % playQueue.length;
        }

        const nextItem = playQueue[nextIndex];
        if (nextItem.type === "song") {
          set({
            currentSong: nextItem.data as Song,
            currentEpisode: null,
            currentType: "song",
            currentIndex: nextIndex,
            currentTime: 0,
          });
        } else {
          set({
            currentEpisode: nextItem.data as AudioEpisode,
            currentSong: null,
            currentType: "audiobook",
            currentIndex: nextIndex,
            currentTime: (nextItem.data as AudioEpisode).playProgress || 0,
          });
        }
      },

      prev: () => {
        const { playQueue, currentIndex, playMode } = get();
        if (playQueue.length === 0) return;

        let prevIndex: number;
        if (playMode === "random") {
          prevIndex = Math.floor(Math.random() * playQueue.length);
        } else {
          prevIndex = currentIndex <= 0 ? playQueue.length - 1 : currentIndex - 1;
        }

        const prevItem = playQueue[prevIndex];
        if (prevItem.type === "song") {
          set({
            currentSong: prevItem.data as Song,
            currentEpisode: null,
            currentType: "song",
            currentIndex: prevIndex,
            currentTime: 0,
          });
        } else {
          set({
            currentEpisode: prevItem.data as AudioEpisode,
            currentSong: null,
            currentType: "audiobook",
            currentIndex: prevIndex,
            currentTime: (prevItem.data as AudioEpisode).playProgress || 0,
          });
        }
      },

      playAtIndex: (index) => {
        const { playQueue } = get();
        if (index < 0 || index >= playQueue.length) return;

        const item = playQueue[index];
        if (item.type === "song") {
          set({
            currentSong: item.data as Song,
            currentEpisode: null,
            currentType: "song",
            currentIndex: index,
            currentTime: 0,
            isPlaying: true,
          });
        } else {
          set({
            currentEpisode: item.data as AudioEpisode,
            currentSong: null,
            currentType: "audiobook",
            currentIndex: index,
            currentTime: (item.data as AudioEpisode).playProgress || 0,
            isPlaying: true,
          });
        }
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
