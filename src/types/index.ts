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

export interface LogoutRequest {
  token: string;
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
type SongType = 'music' | 'sound';

export interface Song {
  singerId?: string;
  albumId?: string;
  cover?: string;
  duration: number;
  platform: 'QQ' | 'Netease' | 'KuGou';
  quality?: string;
  isLiked?: boolean;
  songId: string;
  songTitle: string;
  songImg: string;
  songUrl: string;
  songLyric?: string;
  singerName: string;
  albumTitle: string;
  isBookmarked: boolean;
  songType?: SongType;
  valid: boolean;
  rawDetail: {
    valid: boolean;
    songId: string;
    albumId: number;
    songImg: string;
    songUrl: string;
    platform: string;
    songTitle: string;
    albumTitle: string;
    singerName: string;
    isBookmarked: boolean;
  };
}

// 歌手
export interface Singer {
  avatar?: string;
  platform: 'QQ' | 'Netease' | 'KuGou';
  songCount?: number;
  albumCount?: number;

  singerId: string;
  singerName: string;
  countOfSong: number;
  countOfAlbum: number;
  singerImg: string;
}

// 专辑
export interface Album {
  id: string;
  name: string;
  singer: string;
  cover?: string;
  platform: 'QQ' | 'Netease' | 'KuGou';
  songCount?: number;
  publishTime?: string;
  // platform: string;
  albumId: string;
  albumTitle: string;
  albumImg: string;
  releaseDate: string;
  singerId: string;
  singerName: string;
  desc: string;
}

// 歌单
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  creator?: string;
  platform?: 'QQ' | 'Netease' | 'local';
  songCount: number;
  playCount?: number;
  songs?: Song[];
  isCollected?: boolean;
  createTime?: string;
  updateTime?: string;
  playListName: string;
  playListId: number;
  playListImg: string;
  countOfSong: number;
}

export interface PlaylistSong {
  id: string;
  platform?: 'QQ' | 'Netease' | 'local';
  playListId?: string;
  userId: number;
  songId: string;
  songTitle: string;
  singerName: string;
  albumId: string;
  albumTitle: string;
  songImg: string;
  songType?: SongType;
  valid: boolean;
  rawDetail: any;
  createTime: Date;
  updateTime: Date;
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
// 音频集数
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
  statusCode: number;
  message: string;
  data: T;
  result: T; // 兼容部分接口使用 result 字段返回数据
}
