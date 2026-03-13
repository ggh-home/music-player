import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiResponse, User, LoginRequest, LogoutRequest, RegisterRequest, Song, Singer, Album, Playlist, Audiobook, AudioEpisode, UserQuota } from "@/types";

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:6060",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    if (token) {
      config.headers.token = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    if (response.data.statusCode.toString() !== "201" && response.data.statusCode.toString() !== "200") {
      throw new Error(response.data.message || "请求失败");
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("existUser");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 用户相关 API
export const userApi = {
  // 注册
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<User>>("/user/create", data),

  // 登录
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<User>>("/user/login", data),

  // 登出
  logout: (data: LogoutRequest) =>
    apiClient.post<ApiResponse<{ message: string }>>("/user/logout", data),

  // 获取用户信息
  getUserInfo: () =>
    apiClient.get<ApiResponse<User>>("/user/info"),

  // 升级会员（微信支付）
  upgradeVip: () =>
    apiClient.post<ApiResponse<{ payUrl: string; orderId: string }>>("/user/upgrade"),

  // 获取用户限额
  getQuota: () =>
    apiClient.get<ApiResponse<UserQuota>>("/user/quota"),
};

// 搜索相关 API
export const searchApi = {
  // 搜索歌曲
  searchSongs: (keyword: string) =>
    apiClient.get<ApiResponse<Song[]>>(`/search/music/${encodeURIComponent(keyword)}`),

  // 获取歌曲详情
  getSongDetail: (platform: string, id: string) =>
    apiClient.get<ApiResponse<Song>>(`/search/music/detail/${platform}/${id}`),

  // 搜索歌手
  searchSingers: (keyword: string) =>
    apiClient.get<ApiResponse<Singer[]>>(`/search/singer/${encodeURIComponent(keyword)}`),

  // 获取歌手歌曲
  getSingerSongs: (platform: string, id: string) =>
    apiClient.get<ApiResponse<Song[]>>(`/search/artist/songs/${platform}/${id}`),

  // 获取歌手专辑
  getSingerAlbums: (platform: string, id: string) =>
    apiClient.get<ApiResponse<Album[]>>(`/search/artist/albums/${platform}/${id}`),

  // 获取专辑歌曲
  getAlbumSongs: (platform: string, id: string) =>
    apiClient.get<ApiResponse<{ album: Album; songs: Song[] }>>(`/search/album/detail/${platform}/${id}`),

  // 搜索歌单
  searchPlaylists: (keyword: string) =>
    apiClient.get<ApiResponse<Playlist[]>>(`/search/playlist/${encodeURIComponent(keyword)}`),

  // 获取歌单歌曲
  getPlaylistSongs: (platform: string, id: string) =>
    apiClient.get<ApiResponse<{ playlist: Playlist; songs: Song[] }>>(`/search/playlist/songs/${platform}/${id}`),

  // 搜索有声书
  // searchAudiobooks: (keyword: string) =>
  //   apiClient.get<ApiResponse<Audiobook[]>>(`/search/audiobook/${encodeURIComponent(keyword)}`),

  // 获取有声书详情
  getAudiobookDetail: (id: string) =>
    apiClient.get<ApiResponse<{ audiobook: Audiobook; episodes: AudioEpisode[] }>>(`/audiobook/${id}`),

  // 获取有声书音频地址
  getAudiobookUrl: (id: string, episodeId: string) =>
    apiClient.get<ApiResponse<{ url: string; duration: number }>>(`/audiobook/${id}/episode/${episodeId}/url`),
};

// 歌单管理 API
export const playlistApi = {
  // 创建歌单
  createPlaylist: (data: { playListName: string; description?: string }) =>
    apiClient.post<ApiResponse<Playlist>>("/playlist/create", data),

  // 获取我的歌单
  getMyPlaylists: (playListType: string) =>
    apiClient.get<ApiResponse<Playlist[]>>(`/playlist/all/${encodeURIComponent(playListType)}`),

  // 获取收藏的歌单
  getCollectedPlaylists: () =>
    apiClient.get<ApiResponse<Playlist[]>>("/playlist/collected"),

  // 更新歌单
  updatePlaylist: (id: string, data: { name?: string; description?: string }) =>
    apiClient.put<ApiResponse<Playlist>>(`/playlist/${id}`, data),

  // 删除歌单
  deletePlaylist: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/playlist/${id}`),

  // 添加歌曲到歌单
  addSongToPlaylist: (playlistId: string, song: Song) =>
    apiClient.post<ApiResponse<void>>(`/playlist/${playlistId}/songs`, song),

  // 从歌单移除歌曲
  removeSongFromPlaylist: (playlistId: string, songId: string) =>
    apiClient.delete<ApiResponse<void>>(`/playlist/${playlistId}/songs/${songId}`),

  // 收藏歌单
  collectPlaylist: (platform: string, id: string) =>
    apiClient.post<ApiResponse<void>>(`/playlist/collect`, { platform, id }),

  // 取消收藏歌单
  uncollectPlaylist: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/playlist/collect/${id}`),

  // 导入第三方歌单
  importPlaylist: (platform: 'QQ' | 'Netease', url: string) =>
    apiClient.post<ApiResponse<Playlist>>("/playlist/import", { platform, url }),
  // 获取歌单歌曲
  getMyPlaylistsongs: (playListId: string) =>
    apiClient.get<ApiResponse<Playlist[]>>(`/playlist/songs/${encodeURIComponent(playListId)}`),
};

// 有声书 API
export const audiobookApi = {
  // 收藏有声书
  collectAudiobook: (id: string) =>
    apiClient.post<ApiResponse<void>>("/audiobook/collect", { id }),

  // 取消收藏有声书
  uncollectAudiobook: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/audiobook/collect/${id}`),

  // 获取收藏的有声书
  getCollectedAudiobooks: () =>
    apiClient.get<ApiResponse<Audiobook[]>>("/audiobook/collected"),

  // 更新播放进度
  updateProgress: (id: string, episodeId: string, progress: number) =>
    apiClient.post<ApiResponse<void>>("/audiobook/progress", { id, episodeId, progress }),

  // 缓存音频
  cacheAudio: (id: string, episodeId: string) =>
    apiClient.post<ApiResponse<void>>("/audiobook/cache", { id, episodeId }),

  // 获取缓存的音频
  getCachedAudios: () =>
    apiClient.get<ApiResponse<AudioEpisode[]>>("/audiobook/cached"),

  // 删除缓存
  deleteCache: (episodeId: string) =>
    apiClient.delete<ApiResponse<void>>(`/audiobook/cache/${episodeId}`),
};

// 下载相关 API
export const downloadApi = {
  // 获取下载队列
  getDownloadQueue: () =>
    apiClient.get<ApiResponse<unknown[]>>("/download/queue"),

  // 添加下载任务
  addDownload: (data: { id: string; type: string; quality: string }) =>
    apiClient.post<ApiResponse<void>>("/download", data),

  // 暂停下载
  pauseDownload: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/download/${id}/pause`),

  // 继续下载
  resumeDownload: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/download/${id}/resume`),

  // 重试下载
  retryDownload: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/download/${id}/retry`),

  // 删除下载任务
  deleteDownload: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/download/${id}`),

  // 清空下载队列
  clearDownloads: () =>
    apiClient.delete<ApiResponse<void>>("/download/clear"),

  // 获取已下载列表
  getDownloaded: () =>
    apiClient.get<ApiResponse<unknown[]>>("/download/completed"),
};

// 喜欢/收藏 API
export const likeApi = {
  // 喜欢歌曲
  likeSong: (songId: string, platform: string) =>
    apiClient.post<ApiResponse<void>>("/like/song", { songId, platform }),

  // 取消喜欢
  unlikeSong: (songId: string) =>
    apiClient.delete<ApiResponse<void>>(`/like/song/${songId}`),

  // 获取喜欢的歌曲
  getLikedSongs: () =>
    apiClient.get<ApiResponse<Song[]>>("/like/songs"),

  // 检查是否已喜欢
  checkLiked: (songId: string) =>
    apiClient.get<ApiResponse<boolean>>(`/like/song/${songId}/check`),
};

export default apiClient;
