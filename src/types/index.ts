export type ThirdPlatformType = "QQ" | "WYY" | "XMLY";
export type PlaylistType = "CUSTOM" | "FAVORITE" | "THIRD_PLATFORM" | "ALL";
export type SortType = "ASC" | "DESC";
export type QQLevel = "320" | "flac" | "atmos_51";
export type WyyLevel = "exhigh" | "lossless" | "sky";
export type VipType = "Free" | "Vip" | "Purchse" | "Svip";
export type CacheStatus = "Not-Found" | "Init" | "WaitUpload" | "Uploading" | "Done";
export type SongType = "music" | "sound";
export type SuccessMessage = "成功";

export type PlatformType = ThirdPlatformType | "Netease" | "KuGou" | string;

export interface ApiEnvelope<T> {
  statusCode: string | number;
  result: T;
}

export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  errCode: string;
  timestamp: string;
  path: string;
}

export interface UserResponse {
  id: string;
  userName: string;
  expiredTime: string;
  createTime: string;
  token: string;
  weiXin: string;
  userType: string;
}

export interface User extends UserResponse {
  avatar?: string;
  isVip?: boolean;
  vipExpireTime?: string;
  token: string;
}

export interface CreateUserRequest {
  userName: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface RegisterRequest extends CreateUserRequest {}

export interface LogoutRequest {
  token: string;
}

export type LogLevel = "INFO" | "WARN" | "ERROR";
export type LogAction = "DEFAULT" | "SEARCH";

export interface UserLogItem {
  message: string;
  level: LogLevel;
  action: LogAction;
  version: string;
}

export interface DeviceHeaders extends Record<string, string | undefined> {
  deviceModel?: string;
  systemVersion?: string;
  brand?: string;
}

export interface Song {
  platform: PlatformType;
  songId: string;
  singerId?: string;
  songTitle?: string;
  songImg?: string;
  songUrl?: string;
  songLyric?: string;
  singerName?: string;
  albumId?: string;
  albumTitle?: string;
  isBookmarked?: boolean;
  isBookMarked?: boolean;
  songType?: SongType | string;
  valid?: boolean;
  finalLevel?: QQLevel | WyyLevel | string;
  cacheStatus?: CacheStatus;
  sort?: number;

  // UI compatibility fields
  id?: string;
  name?: string;
  singer?: string;
  cover?: string;
  duration?: number;
  quality?: string;
  isLiked?: boolean;
  rawDetail?: Record<string, unknown>;
}

export interface Singer {
  platform: PlatformType;
  singerId: string;
  singerName: string;
  countOfSong: number;
  countOfAlbum: number;
  singerImg: string;

  // UI compatibility fields
  id?: string;
  name?: string;
  avatar?: string;
  songCount?: number;
  albumCount?: number;
}

export interface Album {
  platform: PlatformType;
  albumId: string;
  albumTitle: string;
  albumImg: string;
  releaseDate: string;
  singerId: string;
  singerName: string;
  desc: string;

  // UI compatibility fields
  id?: string;
  name?: string;
  singer?: string;
  cover?: string;
  songCount?: number;
  publishTime?: string;
}

export interface PlaylistSearchItem {
  platform: PlatformType;
  playListName: string;
  playListId: number | string;
  playListImg: string;
  playCount: number;
  countOfSong: number;
}

export interface PlaylistEntity {
  id: number;
  type: PlaylistType | string;
  playListName: string;
  playListImg: string;
  playListId: string;
  platform: string;
  userId: number;
  createTime: string;
  updateTime: string | null;
}

export interface PlaylistSongEntity {
  id: number;
  playListId: number;
  platform: string;
  userId: number;
  songId: string;
  songTitle: string;
  songImg: string;
  singerName: string;
  albumId: string;
  albumTitle: string;
  songType?: SongType;
  valid: boolean;
  rawDetail: unknown;
  createTime: string;
  updateTime: string | null;
}

export interface Playlist {
  id?: number | string;
  type?: PlaylistType | string;
  playListName?: string;
  playListImg?: string;
  playListId?: number | string;
  platform?: PlatformType;
  userId?: number;
  createTime?: string;
  updateTime?: string | null;

  playCount?: number;
  countOfSong?: number;

  // UI compatibility fields
  name?: string;
  cover?: string;
  songCount?: number;
  creator?: string;
  songs?: Song[];
  isCollected?: boolean;
}

export type PlaylistSong = PlaylistSongEntity;

export interface CreatePlaylistRequest {
  playListName: string;
  image?: string;
}

export interface BookmarkPlaylistRequest {
  playListName: string;
  playListImg: string;
  playListId: string;
  platform: ThirdPlatformType;
}

export interface UnBookmarkPlaylistRequest {
  playListId: string;
  platform: ThirdPlatformType;
}

export interface AddSongRequest {
  playListId?: number;
  platform: ThirdPlatformType;
  songId: string;
  songTitle: string;
  singerName: string;
  songImg?: string;
  songType?: SongType;
  albumId: string;
  albumTitle: string;
  valid: boolean;
  rawDetail: unknown;
  addToFavorite?: boolean;
}

export interface RemoveSongRequest {
  removeSongRefId: string;
  removePlatform: ThirdPlatformType;
  removePlayListId?: number;
  removeFromFavorite?: boolean;
}

export interface ImportSongsRequest {
  url: string;
  platform?: ThirdPlatformType;
}

export interface BookmarkedSongRef {
  platform: string;
  songId: string;
}

export interface SoundAlbum {
  platform: string;
  albumId: string;
  albumTitle: string;
  albumImg: string;
  releaseDate: string;
  countOfSounds: number;
  desc: string;
  vipType: VipType | string;
  isFinished: boolean;
  soundAlbumUpdateAt?: string;

  // UI compatibility fields
  id?: string;
  name?: string;
  cover?: string;
  description?: string;
  episodeCount?: number;
  playProgress?: number;
  isCollected?: boolean;
  episodes?: AudioEpisode[];
}

export interface BookmarkSoundAlbumRequest {
  platform: string;
  albumId: string;
  albumImg: string;
  albumTitle: string;
  countOfSounds: number;
  desc: string;
  vipType: VipType | string;
  isFinished: boolean;
  soundAlbumUpdateAt: string;
  releaseDate?: string;
}

export interface SoundAlbumEntity {
  id: number;
  platform: string;
  albumId: string;
  albumImg: string;
  albumTitle: string;
  countOfSounds: number;
  desc: string;
  vipType: VipType | string;
  isFinished: boolean;
  soundAlbumUpdateAt: string;
  userId: number;
  createTime: string;
  lastUsedTime: string;
  updateTime: string | null;
}

export interface SavePlayHistoryRequest {
  platform: string;
  soundAlbumId: string;
  songId: string;
  playDuration: number;
  playPosition: number;
  sort?: number;
}

export interface SoundPlayHistoryEntity {
  id: number;
  platform: string;
  soundAlbumId: string;
  songId: string;
  userId: number;
  playDuration: number;
  playPosition: number;
  sort: number;
  percentDesc: string;
  createTime: string;
  lastUsedTime: string;
  updateTime: string | null;
}

export interface ImportSoundsRequest {
  url: string;
}

export interface CacheDetailSoundAlbum {
  platform: string;
  soundAlbumId: string;
  cacheStatus: CacheStatus;
  cacheCheckDate?: string;
  countOfSounds?: number;
  cachedSounds?: number;
  cachingSounds?: number;
}

export interface CacheSoundEntity {
  id: number;
  soundAlbumId: string;
  platform: string;
  songId: string;
  songTitle: string;
  songImg: string;
  singerName: string;
  songUrl: string;
  songLyric: string;
  cachePath: string;
  usedCount: number;
  cacheStatus: CacheStatus;
  createTime: string;
  lastUsedTime: string;
  updateTime: string | null;
  sort: number;
}

export interface UserActionRequest {
  action: string;
}

export interface UserMsgEntity {
  id: number;
  targetUserIds: string;
  targetUserType: string;
  msgTitle: string;
  msgType: string;
  msgContent: string;
  createTime: string;
}

export interface SetCookieRequest {
  passWord: string;
  platform: string;
  cookie: string;
}

// UI compatibility types
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

export interface SearchHistory {
  id: string;
  keyword: string;
  type: "song" | "singer" | "playlist" | "audiobook";
  searchTime: string;
}

export type PlayMode = "order" | "random" | "single" | "list";

export type AudioQuality = QQLevel | WyyLevel;
export type DownloadQueueStatus = "Done" | "Downloading" | "Pause" | "Failed";
export type DownloadCapabilityMode = "directory-access" | "browser-download";
export type ClientOs = "windows" | "macos" | "linux" | "unknown";
export type DownloadFileSuffix =
  | "default.mp3"
  | "high.mp3"
  | "no-loss.flac"
  | "surround.flac"
  | "cover.jpg";

export interface DownloadRequestItem {
  platform: string;
  songId: string;
  songTitle: string;
  singerName: string;
  songImg?: string;
  songType?: SongType;
}

export interface PreparedDownloadAsset {
  kind: "audio" | "cover" | "lyric";
  fileName: string;
  url?: string;
  textContent?: string;
  contentType?: string;
}

export interface PreparedDownloadTask {
  allowDownload: boolean;
  reason?: string;
  songUrl?: string;
  coverUrl?: string;
  lyric?: string;
  finalLevel?: string;
  fileSuffix: DownloadFileSuffix;
  baseFileName: string;
  audioFileName: string;
  coverFileName?: string;
  lyricFileName?: string;
  assets: PreparedDownloadAsset[];
}

export interface DownloadDirectoryState {
  mode: DownloadCapabilityMode;
  os: ClientOs;
  rootHint: string;
  selectedDirectoryName?: string;
  hasPermission: boolean;
  isSupported: boolean;
}

export interface DownloadConfig {
  dailyLimit: number;
  dailySuccessCount: number;
  supportPlatforms: string[];
  defaultDownloadDirName: string;
}

export interface DownloadReportPayload {
  platform: string;
  songId: string;
  status: "SUCCESS" | "FAILED";
  fileSuffix: DownloadFileSuffix;
  os: ClientOs;
  clientType: "web";
}

export interface DownloadTask {
  id: string;
  name: string;
  singerName?: string;
  type: "song" | "audiobook";
  cover?: string;
  url?: string;
  songId?: string;
  platform?: PlatformType;
  songType?: SongType;
  sourceKey?: string;
  fileName?: string;
  fileSuffix?: DownloadFileSuffix;
  finalLevel?: string;
  savePath?: string;
  saveMode?: DownloadCapabilityMode;
  progress: number;
  status: "pending" | "downloading" | "paused" | "completed" | "error";
  quality: AudioQuality;
  totalSize?: number;
  downloadedSize?: number;
  error?: string;
  createTime: string;
}

export interface PlayQueueItem {
  id: string;
  type: "song" | "audiobook";
  data: Song | AudioEpisode;
}

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

// Legacy compatibility shape
export interface ApiResponse<T> {
  statusCode: string | number;
  message?: string;
  data?: T;
  result?: T;
}
