type UserType = 'Free' | 'Vip';
// 用户相关
export interface User {
  id: string;
  userName: string;
  avatar?: string;
  token?: string;
  level?: number;
  isVip?: boolean;
  vipExpireTime?: string;
  createTime: string | null;
  expiredTime: string | null;
  weiXin: string | null;
  userType: UserType | null;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface RegisterRequest {
  userName: string;
  password: string;
  confirmPassword: string;
}

// 限额信息
export interface UserQuota {
  musicPlayCount: number;
  musicPlayLimit: number;
  soundPlayCount: number;
  soundPlayLimit: number;
  downloadCount: number;
  downloadLimit: number;
  losslessCount: number;
  losslessLimit: number;
  cacheCount: number;
  cacheLimit: number;
}

// 歌曲
export interface Song {
  id: string;
  name: string;
  singer: string;
  singerId?: string;
  album?: string;
  albumId?: string;
  cover?: string;
  duration: number;
  platform: 'QQ' | 'Netease' | 'KuGou';
  quality?: string;
  url?: string;
  lyric?: string;
  isLiked?: boolean;
}

// 歌手
export interface Singer {
  id: string;
  name: string;
  avatar?: string;
  platform: 'QQ' | 'Netease' | 'KuGou';
  songCount?: number;
  albumCount?: number;
}

// 专辑
export interface Album {
  id: string;
  name: string;
  singer: string;
  singerId: string;
  cover?: string;
  platform: 'QQ' | 'Netease' | 'KuGou';
  songCount?: number;
  publishTime?: string;
}

// 歌单
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  creator?: string;
  platform?: 'QQ' | 'Netease' | 'KuGou' | 'local';
  songCount: number;
  playCount?: number;
  songs?: Song[];
  isCollected?: boolean;
  createTime?: string;
  updateTime?: string;
}

// 有声书
export interface Audiobook {
  id: string;
  name: string;
  author?: string;
  narrator?: string;
  cover?: string;
  description?: string;
  category?: string;
  episodeCount: number;
  episodes?: AudioEpisode[];
  isCollected?: boolean;
  playProgress?: number;
}

export interface AudioEpisode {
  id: string;
  name: string;
  albumId: string;
  albumName?: string;
  duration: number;
  url?: string;
  playProgress?: number;
  isCached?: boolean;
  skipStart?: number;
  skipEnd?: number;
}

// 搜索历史
export interface SearchHistory {
  id: string;
  keyword: string;
  type: 'song' | 'singer' | 'playlist' | 'audiobook';
  searchTime: string;
}

// 播放模式
export type PlayMode = 'order' | 'random' | 'single' | 'list';

// 音质
export type AudioQuality = 'standard' | 'high' | 'lossless' | 'hires';

// 下载任务
export interface DownloadTask {
  id: string;
  name: string;
  type: 'song' | 'audiobook';
  cover?: string;
  url: string;
  progress: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error';
  quality: AudioQuality;
  totalSize?: number;
  downloadedSize?: number;
  error?: string;
  createTime: string;
}

// 播放列表项
export interface PlayQueueItem {
  id: string;
  type: 'song' | 'audiobook';
  data: Song | AudioEpisode;
}

// 播放器状态
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: PlayMode;
  playbackRate: number;
  quality: AudioQuality;
  showLyric: boolean;
  sleepTimer?: number;
  sleepTimerEnd?: string;
}

// API 响应
export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}
