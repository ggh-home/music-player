import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Song, AudioEpisode, PlayMode, AudioQuality, PlayQueueItem } from "@/types";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";

const hasSongDetail = (song: Song | null | undefined) =>
  Boolean(song?.songUrl) && song?.songLyric !== undefined;

const isSameSong = (a: Song | null | undefined, b: Song | null | undefined) =>
  Boolean(a && b && a.songId === b.songId && a.platform === b.platform);

const mergeSongDetail = (song: Song, fallback?: Song | null): Song => {
  if (!fallback) return song;

  return {
    ...fallback,
    ...song,
    songUrl: song.songUrl || fallback.songUrl,
    songLyric: song.songLyric ?? fallback.songLyric,
  };
};

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
          const { currentSong, currentIndex, playQueue, songDetailCache } = get();
          const nextSong = mergeSongDetail(
            song,
            isSameSong(song, currentSong) ? currentSong : songDetailCache[song.songId]
          );
          const queueIndex = playQueue.findIndex(
            (item) => item.type === "song" && item.id === nextSong.songId
          );
          const nextIndex =
            queueIndex >= 0 ? queueIndex : isSameSong(nextSong, currentSong) ? currentIndex : -1;

          set((state) => ({
            currentSong: nextSong,
            currentType: "song",
            currentEpisode: null,
            showPlayer: true,
            currentTime: isSameSong(nextSong, state.currentSong) ? state.currentTime : 0,
            duration: isSameSong(nextSong, state.currentSong)
              ? state.duration || nextSong.duration || 0
              : nextSong.duration || 0,
            currentIndex: nextIndex,
            songDetailCache: hasSongDetail(nextSong)
              ? { ...state.songDetailCache, [nextSong.songId]: nextSong }
              : state.songDetailCache,
          }));
        } else {
          set({
            currentSong: null,
            currentType: null,
            currentTime: 0,
            duration: 0,
            currentIndex: -1,
          });
        }
      },

      setCurrentEpisode: (episode) => {
        if (episode) {
          const queueIndex = get().playQueue.findIndex(
            (item) => item.type === "audiobook" && item.id === episode.id
          );
          set({
            currentEpisode: episode,
            currentType: "audiobook",
            currentSong: null,
            showPlayer: true,
            currentTime: episode.playProgress || 0,
            duration: episode.duration || 0,
            currentIndex: queueIndex,
          });
        } else {
          set({
            currentEpisode: null,
            currentType: null,
            currentTime: 0,
            duration: 0,
            currentIndex: -1,
          });
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

      setPlayQueue: (queue) => {
        const { currentType, currentSong, currentEpisode } = get();
        const currentId =
          currentType === "song" ? currentSong?.songId : currentEpisode?.id;
        const nextIndex = currentId ? queue.findIndex((item) => item.id === currentId) : -1;
        set({ playQueue: queue, currentIndex: nextIndex });
      },

      addToQueue: (item) => {
        const queue = [...get().playQueue, item];
        set({ playQueue: queue });
      },

      removeFromQueue: (index) => {
        const { playQueue, currentIndex } = get();
        const queue = [...playQueue];
        if (index < 0 || index >= queue.length) return;
        queue.splice(index, 1);
        if (queue.length === 0) {
          set({
            playQueue: [],
            currentIndex: -1,
            isPlaying: false,
            currentSong: null,
            currentEpisode: null,
            currentType: null,
            showPlayer: false,
            currentTime: 0,
            duration: 0,
          });
          return;
        }

        if (index < currentIndex) {
          set({ playQueue: queue, currentIndex: currentIndex - 1 });
          return;
        }

        if (index > currentIndex) {
          set({ playQueue: queue });
          return;
        }

        const fallbackIndex = Math.min(index, queue.length - 1);
        const fallbackItem = queue[fallbackIndex];

        if (fallbackItem.type === "song") {
          const fallbackSong = fallbackItem.data as Song;
          set({
            playQueue: queue,
            currentIndex: fallbackIndex,
            currentSong: fallbackSong,
            currentEpisode: null,
            currentType: "song",
            currentTime: 0,
            duration: fallbackSong.duration || 0,
            isPlaying: false,
            showPlayer: true,
          });
          return;
        }

        const fallbackEpisode = fallbackItem.data as AudioEpisode;
        set({
          playQueue: queue,
          currentIndex: fallbackIndex,
          currentSong: null,
          currentEpisode: fallbackEpisode,
          currentType: "audiobook",
          currentTime: fallbackEpisode.playProgress || 0,
          duration: fallbackEpisode.duration || 0,
          isPlaying: false,
          showPlayer: true,
        });
      },

      clearQueue: () =>
        set({
          playQueue: [],
          currentIndex: -1,
          isPlaying: false,
          currentSong: null,
          currentEpisode: null,
          currentType: null,
          showPlayer: false,
          currentTime: 0,
          duration: 0,
        }),

      next: () => {
        const { playQueue, currentIndex, playMode, playItemAtIndex } = get();
        if (playQueue.length === 0) return;

        let nextIndex: number;
        if (playMode === "random") {
          if (playQueue.length === 1) {
            nextIndex = 0;
          } else {
            do {
              nextIndex = Math.floor(Math.random() * playQueue.length);
            } while (nextIndex === currentIndex);
          }
        } else if (playMode === "order") {
          if (currentIndex < 0) {
            void playItemAtIndex(0);
            return;
          }
          if (currentIndex >= playQueue.length - 1) {
            set({ isPlaying: false });
            return;
          }
          nextIndex = currentIndex + 1;
        } else {
          nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % playQueue.length;
        }

        void playItemAtIndex(nextIndex);
      },

      prev: () => {
        const { playQueue, currentIndex, playMode, playItemAtIndex } = get();
        if (playQueue.length === 0) return;

        let prevIndex: number;
        if (playMode === "random") {
          if (playQueue.length === 1) {
            prevIndex = 0;
          } else {
            do {
              prevIndex = Math.floor(Math.random() * playQueue.length);
            } while (prevIndex === currentIndex);
          }
        } else if (playMode === "order") {
          prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        } else {
          prevIndex = currentIndex <= 0 ? playQueue.length - 1 : currentIndex - 1;
        }

        void playItemAtIndex(prevIndex);
      },

      playAtIndex: (index) => {
        void get().playItemAtIndex(index);
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
        const { currentSong, songDetailCache, requestLock, retryRecord } = get();
        const songId = song.songId;
        const MAX_RETRY = 2;
        const hydratedSong = mergeSongDetail(
          song,
          isSameSong(song, currentSong) ? currentSong : songDetailCache[songId]
        );

        if (hasSongDetail(hydratedSong)) {
          set((state) => ({
            songDetailCache: { ...state.songDetailCache, [songId]: hydratedSong },
          }));
          return hydratedSong;
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
          const fullSong = mergeSongDetail(
            {
              ...song,
              songUrl: res.data.result.songUrl,
              songLyric: res.data.result.songLyric,
            },
            hydratedSong
          );
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
        const {
          playQueue,
          currentSong,
          currentEpisode,
          isPlaying,
          fetchSongDetail,
          songDetailCache,
        } = get();
        if (index < 0 || index >= playQueue.length) return;

        const item = playQueue[index];

        if (item.type === "audiobook") {
          const episode = item.data as AudioEpisode;
          const isSameEpisode = currentEpisode?.id === episode.id;

          if (isSameEpisode) {
            set({ isPlaying: !isPlaying, showPlayer: true });
            return;
          }

          set({
            currentEpisode: episode,
            currentType: "audiobook",
            currentSong: null,
            currentIndex: index,
            currentTime: episode.playProgress || 0,
            duration: episode.duration || 0,
            isPlaying: true,
            showPlayer: true,
          });
          return;
        }

        let song = mergeSongDetail(
          item.data as Song,
          isSameSong(item.data as Song, currentSong)
            ? currentSong
            : songDetailCache[item.id]
        );

        if (!hasSongDetail(song)) {
          const fullSong = await fetchSongDetail(song);
          if (!fullSong) return;
          song = fullSong;
          const newQueue = [...playQueue];
          newQueue[index] = { ...newQueue[index], data: fullSong };
          set({ playQueue: newQueue });
        }

        if (isSameSong(currentSong, song)) {
          set((state) => ({
            currentSong: song,
            currentIndex: index,
            isPlaying: !state.isPlaying,
            showPlayer: true,
            songDetailCache: hasSongDetail(song)
              ? { ...state.songDetailCache, [song.songId]: song }
              : state.songDetailCache,
          }));
        } else {
          set((state) => ({
            currentSong: song,
            currentType: "song",
            currentEpisode: null,
            currentIndex: index,
            currentTime: 0,
            duration: song.duration || 0,
            isPlaying: true,
            showPlayer: true,
            songDetailCache: hasSongDetail(song)
              ? { ...state.songDetailCache, [song.songId]: song }
              : state.songDetailCache,
          }));
        }
      },

      playSong: async (song, fullPlaylist) => {
        const { setPlayQueue, playItemAtIndex, currentSong, songDetailCache } = get();
        const targetSong = mergeSongDetail(
          song,
          isSameSong(song, currentSong) ? currentSong : songDetailCache[song.songId]
        );
        const nextSongCache = hasSongDetail(targetSong)
          ? { ...songDetailCache, [targetSong.songId]: targetSong }
          : songDetailCache;

        try {
          toast.loading("正在加载播放列表...", { id: "load-playlist" });

          const newPlayQueue: PlayQueueItem[] = fullPlaylist.map((item) => {
            const queueSong = mergeSongDetail(
              item,
              isSameSong(item, targetSong) ? targetSong : nextSongCache[item.songId]
            );

            return {
              id: queueSong.songId,
              type: "song",
              data: queueSong,
            };
          });

          const targetIndex = newPlayQueue.findIndex((item) => item.id === targetSong.songId);
          if (targetIndex === -1) {
            toast.error("歌曲不在播放列表中", { id: "load-playlist" });
            return;
          }

          if (hasSongDetail(targetSong)) {
            set((state) => ({
              songDetailCache: { ...state.songDetailCache, [targetSong.songId]: targetSong },
            }));
          }

          setPlayQueue(newPlayQueue);
          await playItemAtIndex(targetIndex);
          toast.success("开始播放", { id: "load-playlist" });
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
