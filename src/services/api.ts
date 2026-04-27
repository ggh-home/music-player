import {
  AddSongRequest,
  Album,
  ApiErrorPayload,
  AudioEpisode,
  BookmarkedSongRef,
  BookmarkPlaylistRequest,
  BookmarkSoundAlbumRequest,
  CacheDetailSoundAlbum,
  CacheSoundEntity,
  CreatePlaylistRequest,
  CreateUserRequest,
  DeviceHeaders,
  ImportSongsRequest,
  ImportSoundsRequest,
  LoginRequest,
  Playlist,
  PlaylistEntity,
  PlaylistSearchItem,
  PlaylistSongEntity,
  PlaylistType,
  QQLevel,
  RegisterRequest,
  RemoveSongRequest,
  SetCookieRequest,
  Singer,
  Song,
  SortType,
  SoundAlbum,
  SoundAlbumEntity,
  SoundPlayHistoryEntity,
  SuccessMessage,
  ThirdPlatformType,
  UnBookmarkPlaylistRequest,
  User,
  UserActionRequest,
  UserLogItem,
  UserMsgEntity,
  UserQuota,
  UserResponse,
  VipType,
  WyyLevel,
} from "@/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type QueryValue = string | number | boolean | null | undefined;
export const AUTH_EXPIRED_EVENT = "music-player:auth-expired";

interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string | undefined>;
  auth?: boolean;
  raw?: boolean;
}

let lastAuthExpiredDispatchAt = 0;

const normalizeErrorMessage = (message: string | string[] | undefined): string => {
  if (Array.isArray(message)) return message.join(", ");
  return message || "登录已过期，请重新登录~";
};

const notifyAuthExpired = (message: string | string[] | undefined) => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastAuthExpiredDispatchAt < 1500) return;
  lastAuthExpiredDispatchAt = now;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("existUser");

  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { message: normalizeErrorMessage(message) },
    }),
  );
};

export interface MusicApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | null | undefined;
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface MusicApi {
  user: {
    create: (data: CreateUserRequest, headers?: DeviceHeaders) => Promise<SuccessMessage>;
    login: (data: LoginRequest) => Promise<UserResponse>;
    logout: (token?: string) => Promise<SuccessMessage>;
    addLogs: (logs: UserLogItem[], headers?: DeviceHeaders) => Promise<void>;
    currentUserInfo: () => Promise<UserResponse>;
    updateVip: (weixinId: string) => Promise<UserResponse>;
  };
  search: {
    searchMusic: (keyword: string, pageNum?: number) => Promise<Song[]>;
    searchSinger: (keyword: string, pageNum?: number) => Promise<Singer[]>;
    searchSoundAlbum: (keyword: string, pageNum?: number) => Promise<SoundAlbum[]>;
    searchSoundList: (
      platform: string,
      soundAlbum: SoundAlbum,
      params?: { sort?: SortType; pageNum?: number; pageSize?: number },
    ) => Promise<Song[]>;
    getArtistSongs: (platform: string, singerId: string, pageNum?: number) => Promise<Song[]>;
    getArtistAlbums: (platform: string, singerId: string, pageNum?: number) => Promise<Album[]>;
    getAlbumDetail: (platform: string, albumId: string) => Promise<Song[]>;
    searchPlaylist: (keyword: string, pageNum?: number) => Promise<PlaylistSearchItem[]>;
    getPlaylistSongs: (
      platform: string,
      playListId: string,
      pageNum?: number,
      pageSize?: number,
    ) => Promise<Song[]>;
    getMusicDetail: (platform: string, songId: string, level?: QQLevel | WyyLevel) => Promise<Song>;
    getSoundDetail: (platform: string, soundId: string) => Promise<Partial<Song>>;
    setMusicCookie: (payload: SetCookieRequest) => Promise<void>;
  };
  playlist: {
    getAll: (playListType: PlaylistType | string) => Promise<PlaylistEntity[]>;
    create: (payload: CreatePlaylistRequest) => Promise<SuccessMessage>;
    bookmark: (payload: BookmarkPlaylistRequest) => Promise<SuccessMessage>;
    unBookmark: (payload: UnBookmarkPlaylistRequest) => Promise<SuccessMessage>;
    delete: (id: number) => Promise<boolean>;
    removeSong: (payload: RemoveSongRequest) => Promise<boolean>;
    addSong: (payload: AddSongRequest) => Promise<SuccessMessage>;
    getSongs: (playListId: number | string) => Promise<PlaylistSongEntity[]>;
    getAllBookmarkedSongs: () => Promise<Array<BookmarkedSongRef | PlaylistSongEntity>>;
    checkHeart: (platform: string, songId: string) => Promise<boolean>;
    importSongs: (payload: ImportSongsRequest) => Promise<SuccessMessage>;
  };
  soundalbum: {
    bookmark: (payload: BookmarkSoundAlbumRequest) => Promise<SuccessMessage>;
    unBookmark: (payload: BookmarkSoundAlbumRequest) => Promise<SuccessMessage>;
    getAll: () => Promise<SoundAlbumEntity[]>;
    savePlayHistory: (payload: {
      platform: string;
      soundAlbumId: string;
      songId: string;
      playDuration: number;
      playPosition: number;
      sort?: number;
    }) => Promise<SuccessMessage>;
    getAllPlayHistory: (platform: string, soundAlbumId: string) => Promise<SoundPlayHistoryEntity[]>;
    importSounds: (payload: ImportSoundsRequest) => Promise<SuccessMessage>;
    getCacheDetail: (platform: string, soundAlbumId: string) => Promise<CacheDetailSoundAlbum>;
    cacheSound: (platform: string, soundId: string) => Promise<CacheSoundEntity>;
  };
  utils: {
    getWechatGroupsRawHtml: () => Promise<string>;
    userAction: (payload: UserActionRequest) => Promise<SuccessMessage>;
    countUserActionByDay: (action: string) => Promise<number>;
    countUserActionByHour: (action: string) => Promise<number>;
    getNoLossLimit: () => Promise<number | string>;
    getMusicLimit: () => Promise<number | string>;
    getSoundLimit: () => Promise<number | string>;
    getDownloadLimit: () => Promise<number | string>;
    getBookmarkSoundAlbumLimit: () => Promise<number | string>;
    getSoundCacheLimit: () => Promise<number | string>;
    getUserMsg: () => Promise<UserMsgEntity[]>;
  };
}

export class ApiClientError extends Error {
  statusCode: number;
  errCode: string;
  payload: ApiErrorPayload;

  constructor(payload: ApiErrorPayload) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : payload.message || "Request failed";
    super(message);
    this.name = "ApiClientError";
    this.statusCode = payload.statusCode;
    this.errCode = payload.errCode;
    this.payload = payload;
  }
}

function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function compactHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  });

  return result;
}

export function createMusicApi(config: MusicApiClientConfig = {}): MusicApi {
  const baseUrl = (config.baseUrl ?? "http://bxdmkai.cn:6060").replace(/\/+$/, "");
  const fetchImpl = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const method = options.method ?? "GET";
    const auth = options.auth ?? true;
    const queryString = buildQueryString(options.query);
    const url = `${baseUrl}${path}${queryString}`;
    const token = config.getToken?.();

    const headers = compactHeaders({
      "Content-Type": options.body !== undefined ? "application/json" : undefined,
      ...(config.defaultHeaders ?? {}),
      ...(options.headers ?? {}),
      token: auth ? token ?? undefined : options.headers?.token,
    });

    const response = await fetchImpl(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (options.raw) {
      const text = await response.text();
      if (!response.ok) {
        throw new ApiClientError({
          statusCode: response.status,
          message: text || response.statusText,
          errCode: "HTTP_ERROR",
          timestamp: new Date().toISOString(),
          path,
        });
      }
      return text as T;
    }

    const text = await response.text();
    let json: unknown = null;

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new ApiClientError({
          statusCode: response.status,
          message: text,
          errCode: "INVALID_JSON_RESPONSE",
          timestamp: new Date().toISOString(),
          path,
        });
      }
    }

    if (!response.ok) {
      const errorPayload = json as Record<string, unknown> | null;
      const messageFromPayload =
        (errorPayload?.message as string | string[] | undefined) ??
        (errorPayload?.errorMessage as string | string[] | undefined);
      const payload: ApiErrorPayload = {
        statusCode: Number(errorPayload?.statusCode ?? response.status),
        message: messageFromPayload ?? response.statusText,
        errCode: String(errorPayload?.errCode ?? "HTTP_ERROR"),
        timestamp: String(errorPayload?.timestamp ?? new Date().toISOString()),
        path: String(errorPayload?.path ?? path),
      };

      if (payload.errCode === "INVALID_TOKEN" || payload.statusCode === 401) {
        notifyAuthExpired(payload.message);
      }

      throw new ApiClientError(payload);
    }

    if (json && typeof json === "object" && "result" in json) {
      return (json as { result: T }).result;
    }

    return json as T;
  };

  return {
    user: {
      create: (data, headers) =>
        request<SuccessMessage>("/user/create", {
          method: "POST",
          auth: false,
          body: data,
          headers,
        }),

      login: (data) =>
        request<UserResponse>("/user/login", {
          method: "POST",
          auth: false,
          body: data,
        }),

      logout: (token) =>
        request<SuccessMessage>("/user/logout", {
          method: "POST",
          auth: false,
          headers: {
            token: token ?? config.getToken?.() ?? undefined,
          },
        }),

      addLogs: (logs, headers) =>
        request<void>("/user/add-logs", {
          method: "POST",
          body: { logs },
          headers,
        }),

      currentUserInfo: () => request<UserResponse>("/user/currentUserInfo"),

      updateVip: (weixinId) =>
        request<UserResponse>("/user/updateVip", {
          method: "POST",
          query: { weixinId },
        }),
    },

    search: {
      searchMusic: (keyword, pageNum = 1) =>
        request<Song[]>(`/search/music/${encodeURIComponent(keyword)}`, {
          query: { pageNum },
        }),

      searchSinger: (keyword, pageNum = 1) =>
        request<Singer[]>(`/search/singer/${encodeURIComponent(keyword)}`, {
          query: { pageNum },
        }),

      searchSoundAlbum: (keyword, pageNum = 1) =>
        request<SoundAlbum[]>(`/search/sound-album/${encodeURIComponent(keyword)}`, {
          query: { pageNum },
        }),

      searchSoundList: (platform, soundAlbum, params) =>
        request<Song[]>(`/search/sounds/${encodeURIComponent(platform)}`, {
          method: "POST",
          query: {
            sort: params?.sort,
            pageNum: params?.pageNum ?? 1,
            pageSize: params?.pageSize ?? 15,
          },
          body: soundAlbum,
        }),

      getArtistSongs: (platform, singerId, pageNum = 1) =>
        request<Song[]>(
          `/search/artist/songs/${encodeURIComponent(platform)}/${encodeURIComponent(singerId)}`,
          { query: { pageNum } },
        ),

      getArtistAlbums: (platform, singerId, pageNum = 1) =>
        request<Album[]>(
          `/search/artist/albums/${encodeURIComponent(platform)}/${encodeURIComponent(singerId)}`,
          { query: { pageNum } },
        ),

      getAlbumDetail: (platform, albumId) =>
        request<Song[]>(
          `/search/album/detail/${encodeURIComponent(platform)}/${encodeURIComponent(albumId)}`,
        ),

      searchPlaylist: (keyword, pageNum = 1) =>
        request<PlaylistSearchItem[]>(`/search/playlist/${encodeURIComponent(keyword)}`, {
          query: { pageNum },
        }),

      getPlaylistSongs: (platform, playListId, pageNum = 1, pageSize = 15) =>
        request<Song[]>(
          `/search/playlist/songs/${encodeURIComponent(platform)}/${encodeURIComponent(playListId)}/${pageNum}/${pageSize}`,
        ),

      getMusicDetail: (platform, songId, level) =>
        request<Song>(
          `/search/music/detail/${encodeURIComponent(platform)}/${encodeURIComponent(songId)}`,
          { query: { level } },
        ),

      getSoundDetail: (platform, soundId) =>
        request<Partial<Song>>(
          `/search/sound/detail/${encodeURIComponent(platform)}/${encodeURIComponent(soundId)}`,
        ),

      setMusicCookie: (payload) =>
        request<void>("/search/music/cookie/set", {
          method: "POST",
          auth: false,
          body: payload,
        }),
    },

    playlist: {
      getAll: (playListType) =>
        request<PlaylistEntity[]>(`/playlist/all/${encodeURIComponent(playListType)}`),

      create: (payload) =>
        request<SuccessMessage>("/playlist/create", {
          method: "POST",
          body: payload,
        }),

      bookmark: (payload) =>
        request<SuccessMessage>("/playlist/bookmark", {
          method: "POST",
          body: payload,
        }),

      unBookmark: (payload) =>
        request<SuccessMessage>("/playlist/un-bookmark", {
          method: "POST",
          body: payload,
        }),

      delete: (id) =>
        request<boolean>("/playlist/delete", {
          method: "POST",
          body: { id },
        }),

      removeSong: (payload) =>
        request<boolean>("/playlist/remove-song", {
          method: "POST",
          body: payload,
        }),

      addSong: (payload) =>
        request<SuccessMessage>("/playlist/add-song", {
          method: "POST",
          body: payload,
        }),

      getSongs: (playListId) =>
        request<PlaylistSongEntity[]>(`/playlist/songs/${encodeURIComponent(String(playListId))}`),

      getAllBookmarkedSongs: () =>
        request<Array<BookmarkedSongRef | PlaylistSongEntity>>("/playlist/all-bookmarked-songs"),

      checkHeart: (platform, songId) =>
        request<boolean>(
          `/playlist/check-heart/${encodeURIComponent(platform)}/${encodeURIComponent(songId)}`,
        ),

      importSongs: (payload) =>
        request<SuccessMessage>("/playlist/import-songs", {
          method: "POST",
          body: payload,
        }),
    },

    soundalbum: {
      bookmark: (payload) =>
        request<SuccessMessage>("/soundalbum/bookmark", {
          method: "POST",
          body: payload,
        }),

      unBookmark: (payload) =>
        request<SuccessMessage>("/soundalbum/un-bookmark", {
          method: "POST",
          body: payload,
        }),

      getAll: () => request<SoundAlbumEntity[]>("/soundalbum/all"),

      savePlayHistory: (payload) =>
        request<SuccessMessage>("/soundalbum/play-history/save", {
          method: "POST",
          body: payload,
        }),

      getAllPlayHistory: (platform, soundAlbumId) =>
        request<SoundPlayHistoryEntity[]>(
          `/soundalbum/play-history/all/${encodeURIComponent(platform)}/${encodeURIComponent(soundAlbumId)}`,
        ),

      importSounds: (payload) =>
        request<SuccessMessage>("/soundalbum/import-sounds", {
          method: "POST",
          body: payload,
        }),

      getCacheDetail: (platform, soundAlbumId) =>
        request<CacheDetailSoundAlbum>(
          `/soundalbum/cache-detail/${encodeURIComponent(platform)}/${encodeURIComponent(soundAlbumId)}`,
        ),

      cacheSound: (platform, soundId) =>
        request<CacheSoundEntity>(
          `/soundalbum/cache/${encodeURIComponent(platform)}/${encodeURIComponent(soundId)}`,
          { method: "POST" },
        ),
    },

    utils: {
      getWechatGroupsRawHtml: () =>
        request<string>("/utils/raw-html/wechat-groups", {
          auth: false,
          raw: true,
        }),

      userAction: (payload) =>
        request<SuccessMessage>("/utils/user-action", {
          method: "POST",
          body: payload,
        }),

      countUserActionByDay: (action) =>
        request<number>("/utils/user-action/count/day", {
          query: { action },
        }),

      countUserActionByHour: (action) =>
        request<number>("/utils/user-action/count/hour", {
          query: { action },
        }),

      getNoLossLimit: () => request<number | string>("/utils/no-loss/limit"),
      getMusicLimit: () => request<number | string>("/utils/music/limit"),
      getSoundLimit: () => request<number | string>("/utils/sound/limit"),
      getDownloadLimit: () => request<number | string>("/utils/download/limit"),
      getBookmarkSoundAlbumLimit: () =>
        request<number | string>("/utils/bookmark-soundalbum/limit"),
      getSoundCacheLimit: () => request<number | string>("/utils/sound-cache/limit"),
      getUserMsg: () => request<UserMsgEntity[]>("/utils/user-msg"),
    },
  };
}

const getLocalToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseLimit = (value: number | string): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const normalized = String(value).replace(/[^\d.]/g, "");
  return Number.isFinite(Number(normalized)) ? Number(normalized) : 0;
};

const toThirdPlatform = (
  platform: unknown,
  fallback: ThirdPlatformType = "QQ",
): ThirdPlatformType => {
  const normalized = String(platform ?? "").trim().toUpperCase();

  if (normalized === "QQ") return "QQ";
  if (normalized === "WYY" || normalized === "NETEASE" || normalized === "网易云") return "WYY";
  if (normalized === "XMLY" || normalized === "XIMALAYA" || normalized === "喜马拉雅") return "XMLY";

  return fallback;
};

const toPlaylistType = (value: string | PlaylistType): PlaylistType => {
  const normalized = String(value).trim().toUpperCase();

  if (normalized === "CUSTOM" || normalized === "MY") return "CUSTOM";
  if (normalized === "FAVORITE" || normalized === "LIKE" || normalized === "LIKED") return "FAVORITE";
  if (normalized === "THIRD_PLATFORM" || normalized === "COLLECTED") return "THIRD_PLATFORM";
  if (normalized === "ALL") return "ALL";

  return "ALL";
};

const normalizeUser = (user: UserResponse): User => ({
  ...user,
  token: user.token || "",
  isVip: ["VIP", "SVIP", "PURCHSE"].includes(String(user.userType).toUpperCase()),
  vipExpireTime: user.expiredTime,
});

const normalizeSong = (song: Song): Song => {
  const songTitle = song.songTitle || song.name || "未知歌曲";
  const singerName = song.singerName || song.singer || "未知歌手";
  const albumTitle = song.albumTitle || "";
  const songImg = song.songImg || song.cover || "";
  const songId = String(song.songId || "");
  const albumId = song.albumId !== undefined && song.albumId !== null
    ? String(song.albumId)
    : undefined;

  return {
    ...song,
    songId,
    albumId,
    platform: toThirdPlatform(song.platform),
    songTitle,
    singerName,
    albumTitle,
    songImg,
    cover: songImg,
    name: songTitle,
    singer: singerName,
    isBookmarked: song.isBookmarked ?? song.isBookMarked ?? false,
    isBookMarked: song.isBookMarked ?? song.isBookmarked ?? false,
    valid: song.valid ?? true,
    rawDetail: song.rawDetail ?? {
      ...song,
      platform: toThirdPlatform(song.platform),
      songId,
      albumId: albumId ?? "",
      songTitle,
      singerName,
      albumTitle,
      songImg,
      isBookmarked: song.isBookmarked ?? song.isBookMarked ?? false,
    },
  };
};

const normalizeSinger = (singer: Singer): Singer => ({
  ...singer,
  platform: toThirdPlatform(singer?.platform),
  singerId: String(singer?.singerId ?? singer?.id ?? ""),
  singerName: String(singer?.singerName ?? singer?.name ?? "未知歌手"),
  countOfSong: toNumber(singer?.countOfSong ?? singer?.songCount),
  countOfAlbum: toNumber(singer?.countOfAlbum ?? singer?.albumCount),
  singerImg: String(singer?.singerImg ?? singer?.avatar ?? ""),
  id: String(singer?.singerId ?? singer?.id ?? ""),
  name: String(singer?.singerName ?? singer?.name ?? "未知歌手"),
  avatar: String(singer?.singerImg ?? singer?.avatar ?? ""),
  songCount: toNumber(singer?.countOfSong ?? singer?.songCount),
  albumCount: toNumber(singer?.countOfAlbum ?? singer?.albumCount),
});

const normalizeAlbum = (album: Album): Album => ({
  ...album,
  platform: toThirdPlatform(album.platform),
  id: album.id ?? album.albumId,
  name: album.name ?? album.albumTitle,
  singer: album.singer ?? album.singerName,
  cover: album.cover ?? album.albumImg,
  songCount: album.songCount ?? 0,
  publishTime: album.publishTime ?? album.releaseDate,
});

const normalizePlaylist = (playlist: PlaylistEntity | PlaylistSearchItem | Playlist): Playlist => {
  const source = playlist as Partial<Playlist> &
    Partial<PlaylistEntity> &
    Partial<PlaylistSearchItem>;

  const playListId =
    source.playListId !== undefined && source.playListId !== null
      ? String(source.playListId)
      : String(source.id ?? "");

  const playListName = String(source.playListName ?? source.name ?? "未命名歌单");
  const playListImg = String(source.playListImg ?? source.cover ?? "");
  const countOfSong =
    typeof source.countOfSong === "number"
      ? source.countOfSong
      : typeof source.songCount === "number"
        ? source.songCount
        : 0;

  return {
    ...source,
    id: source.id ?? playListId,
    playListId,
    playListName,
    playListImg,
    countOfSong,
    name: playListName,
    cover: playListImg,
    songCount: countOfSong,
    creator: source.creator ?? "",
    platform: source.platform ? toThirdPlatform(source.platform) : undefined,
  };
};

const playlistSongToSong = (item: PlaylistSongEntity): Song => {
  const raw =
    item.rawDetail && typeof item.rawDetail === "object"
      ? (item.rawDetail as Record<string, unknown>)
      : {};

  return normalizeSong({
    platform: item.platform,
    songId: item.songId,
    songTitle: item.songTitle,
    songImg: item.songImg,
    singerName: item.singerName,
    albumId: item.albumId,
    albumTitle: item.albumTitle,
    songType: item.songType,
    valid: item.valid,
    rawDetail: {
      ...raw,
      songId: item.songId,
      platform: item.platform,
      songTitle: item.songTitle,
      singerName: item.singerName,
      albumTitle: item.albumTitle,
      songImg: item.songImg,
    },
  });
};

const isPlaylistSongEntity = (
  item: BookmarkedSongRef | PlaylistSongEntity,
): item is PlaylistSongEntity =>
  "songTitle" in item || "playListId" in item || "rawDetail" in item;

const mapSoundAlbumEntity = (album: SoundAlbumEntity): SoundAlbum => ({
  ...album,
  platform: toThirdPlatform(album.platform),
  albumId: String(album.albumId),
  albumTitle: album.albumTitle,
  albumImg: album.albumImg,
  releaseDate: "",
  countOfSounds: album.countOfSounds,
  desc: album.desc,
  vipType: album.vipType,
  isFinished: album.isFinished,
  soundAlbumUpdateAt: album.soundAlbumUpdateAt,
  id: String(album.albumId),
  name: album.albumTitle,
  cover: album.albumImg,
  episodeCount: album.countOfSounds,
  isCollected: true,
});

const toBookmarkSoundAlbumPayload = (album: SoundAlbum): BookmarkSoundAlbumRequest => ({
  platform: toThirdPlatform(album.platform),
  albumId: String(album.albumId),
  albumImg: album.albumImg || album.cover || "",
  albumTitle: album.albumTitle || album.name || "",
  countOfSounds: toNumber(album.countOfSounds ?? album.episodeCount),
  desc: album.desc || album.description || "",
  vipType: (album.vipType || "Free") as VipType,
  isFinished: Boolean(album.isFinished),
  soundAlbumUpdateAt: album.soundAlbumUpdateAt || new Date().toISOString(),
  releaseDate: album.releaseDate,
});

const buildAddSongPayload = (
  song: Song,
  options?: { playlistId?: number | string; addToFavorite?: boolean },
): AddSongRequest => {
  const normalizedSongId = String(song.songId || "");
  const normalizedAlbumId =
    song.albumId !== undefined && song.albumId !== null ? String(song.albumId) : "";

  const normalizedRawDetail =
    song.rawDetail && typeof song.rawDetail === "object"
      ? {
        ...song.rawDetail,
        songId:
          (song.rawDetail as Record<string, unknown>).songId !== undefined
            ? String((song.rawDetail as Record<string, unknown>).songId)
            : normalizedSongId,
        albumId:
          (song.rawDetail as Record<string, unknown>).albumId !== undefined
            ? String((song.rawDetail as Record<string, unknown>).albumId)
            : normalizedAlbumId,
      }
      : {
        ...song,
        songId: normalizedSongId,
        albumId: normalizedAlbumId,
      };

  return {
    playListId:
      options?.playlistId !== undefined && options?.playlistId !== null
        ? toNumber(options.playlistId) || undefined
        : undefined,
    platform: toThirdPlatform(song.platform),
    songId: normalizedSongId,
    songTitle: song.songTitle || song.name || "未知歌曲",
    singerName: song.singerName || song.singer || "未知歌手",
    songImg: song.songImg || song.cover || "",
    songType: song.songType === "sound" ? "sound" : "music",
    albumId: normalizedAlbumId,
    albumTitle: song.albumTitle || "",
    valid: song.valid ?? true,
    rawDetail: normalizedRawDetail,
    addToFavorite: options?.addToFavorite,
  };
};

export const musicApi = createMusicApi({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://bxdmkai.cn:6060",
  getToken: getLocalToken,
});

export const userApi = {
  register: (data: RegisterRequest, headers?: DeviceHeaders) => musicApi.user.create(data, headers),
  login: async (data: LoginRequest) => normalizeUser(await musicApi.user.login(data)),
  logout: async (payload?: { token?: string } | string) => {
    const token = typeof payload === "string" ? payload : payload?.token;
    return musicApi.user.logout(token);
  },
  getUserInfo: async () => normalizeUser(await musicApi.user.currentUserInfo()),
  addLogs: (logs: UserLogItem[], headers?: DeviceHeaders) => musicApi.user.addLogs(logs, headers),
  updateVip: async (weixinId: string) => normalizeUser(await musicApi.user.updateVip(weixinId)),
  upgradeVip: async (weixinId?: string) => {
    const localUser =
      typeof window !== "undefined" ? window.localStorage.getItem("user") : null;
    const parsedUser = localUser ? (JSON.parse(localUser) as Partial<User>) : null;
    const resolvedWeiXin = weixinId || parsedUser?.weiXin;

    if (!resolvedWeiXin) {
      throw new Error("请先在账号中绑定微信号（weiXin）后再升级会员");
    }

    return normalizeUser(await musicApi.user.updateVip(resolvedWeiXin));
  },
  getQuota: async (): Promise<UserQuota> => {
    const [musicLimit, soundLimit, downloadLimit, noLossLimit, cacheLimit] = await Promise.all([
      musicApi.utils.getMusicLimit(),
      musicApi.utils.getSoundLimit(),
      musicApi.utils.getDownloadLimit(),
      musicApi.utils.getNoLossLimit(),
      musicApi.utils.getSoundCacheLimit(),
    ]);

    return {
      musicPlayCount: 0,
      musicPlayLimit: parseLimit(musicLimit),
      soundPlayCount: 0,
      soundPlayLimit: parseLimit(soundLimit),
      downloadCount: 0,
      downloadLimit: parseLimit(downloadLimit),
      losslessCount: 0,
      losslessLimit: parseLimit(noLossLimit),
      cacheCount: 0,
      cacheLimit: parseLimit(cacheLimit),
    };
  },
};

export const searchApi = {
  searchSongs: async (keyword: string, pageNum = 1) =>
    (await musicApi.search.searchMusic(keyword, pageNum)).map(normalizeSong),

  getSongDetail: async (platform: string, id: string, level?: QQLevel | WyyLevel) =>
    normalizeSong(await musicApi.search.getMusicDetail(toThirdPlatform(platform), id, level)),

  searchSingers: async (keyword: string, pageNum = 1) =>
    (await musicApi.search.searchSinger(keyword, pageNum)).map(normalizeSinger),

  getSingerSongs: async (platform: string, id: string, pageNum = 1) =>
    (await musicApi.search.getArtistSongs(toThirdPlatform(platform), id, pageNum)).map(normalizeSong),

  getSingerAlbums: async (platform: string, id: string, pageNum = 1) =>
    (await musicApi.search.getArtistAlbums(toThirdPlatform(platform), id, pageNum)).map(normalizeAlbum),

  getAlbumSongs: async (platform: string, id: string) =>
    (await musicApi.search.getAlbumDetail(toThirdPlatform(platform), id)).map(normalizeSong),

  searchPlaylists: async (keyword: string, pageNum = 1) =>
    (await musicApi.search.searchPlaylist(keyword, pageNum)).map(normalizePlaylist),

  getPlaylistSongs: async (
    platform: string,
    id: string,
    pageNum = 1,
    pageSize = 15,
  ) =>
    (
      await musicApi.search.getPlaylistSongs(
        toThirdPlatform(platform),
        id,
        pageNum,
        pageSize,
      )
    ).map(normalizeSong),

  searchSoundAlbums: async (keyword: string, pageNum = 1) =>
    await musicApi.search.searchSoundAlbum(keyword, pageNum),

  getSoundList: async (
    platform: string,
    soundAlbum: SoundAlbum,
    params?: { sort?: SortType; pageNum?: number; pageSize?: number },
  ) =>
    (
      await musicApi.search.searchSoundList(
        toThirdPlatform(platform),
        soundAlbum,
        params,
      )
    ).map(normalizeSong),

  getSoundDetail: async (platform: string, soundId: string) =>
    musicApi.search.getSoundDetail(toThirdPlatform(platform), soundId),

  setMusicCookie: (payload: SetCookieRequest) => musicApi.search.setMusicCookie(payload),
};

export const playlistApi = {
  createPlaylist: (data: { playListName: string; image?: string }) =>
    musicApi.playlist.create({
      playListName: data.playListName,
      image: data.image,
    }),

  getMyPlaylists: async (playListType: string) =>
    (await musicApi.playlist.getAll(toPlaylistType(playListType))).map(normalizePlaylist),

  getMyPlaylistsWithFallback: async (
    playListTypes: string[] = ["CUSTOM", "FAVORITE", "ALL"],
  ): Promise<Playlist[]> => {
    let lastError: unknown = null;

    for (const playListType of playListTypes) {
      try {
        const list = await playlistApi.getMyPlaylists(playListType);
        if (list.length > 0) return list;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    return [];
  },

  findPlaylistById: async (
    playlistId: string,
    playListTypes: string[] = ["CUSTOM", "FAVORITE", "ALL"],
  ): Promise<Playlist | null> => {
    const targetId = String(playlistId);

    try {
      const mine = await playlistApi.getMyPlaylistsWithFallback(playListTypes);
      const hit = mine.find((item) => String(item.playListId ?? item.id) === targetId);
      if (hit) return hit;
    } catch {
      // ignore and fallback
    }

    try {
      const collected = await playlistApi.getCollectedPlaylists();
      return (
        collected.find((item) => String(item.playListId ?? item.id) === targetId) ||
        null
      );
    } catch {
      return null;
    }
  },

  getCollectedPlaylists: async () =>
    (await musicApi.playlist.getAll("THIRD_PLATFORM")).map(normalizePlaylist),

  deletePlaylist: async (id: number | string) => {
    const numericId = toNumber(id);
    if (!numericId) throw new Error("歌单 ID 无效，无法删除");
    return musicApi.playlist.delete(numericId);
  },

  addSongToPlaylist: (
    playlistId: string | number,
    song: Song,
    options?: { addToFavorite?: boolean },
  ) =>
    musicApi.playlist.addSong(
      buildAddSongPayload(song, {
        playlistId,
        addToFavorite: options?.addToFavorite,
      }),
    ),

  removeSongFromPlaylist: (
    playlistId: string | number,
    songId: string,
    platform: string = "QQ",
  ) =>
    musicApi.playlist.removeSong({
      removeSongRefId: songId,
      removePlatform: toThirdPlatform(platform),
      removePlayListId: toNumber(playlistId) || undefined,
    }),

  removeSongFromPlaylistByPayload: (data: {
    playListId: string | number;
    songId: string;
    platform?: string;
    removeFromFavorite?: boolean;
  }) =>
    musicApi.playlist.removeSong({
      removeSongRefId: data.songId,
      removePlatform: toThirdPlatform(data.platform),
      removePlayListId: toNumber(data.playListId) || undefined,
      removeFromFavorite: data.removeFromFavorite,
    }),

  collectPlaylist: (payload: {
    playListName: string;
    playListImg: string;
    playListId: string;
    platform: string;
  }) =>
    musicApi.playlist.bookmark({
      ...payload,
      platform: toThirdPlatform(payload.platform),
    }),

  uncollectPlaylist: (payload: { playListId: string; platform: string }) =>
    musicApi.playlist.unBookmark({
      playListId: payload.playListId,
      platform: toThirdPlatform(payload.platform),
    }),

  importPlaylist: (platform: ThirdPlatformType | "Netease", url: string) =>
    musicApi.playlist.importSongs({
      url,
      platform: toThirdPlatform(platform),
    }),

  getPlaylistSongs: async (playListId: string | number) =>
    (await musicApi.playlist.getSongs(playListId)).map(playlistSongToSong),

  getMyPlaylistsongs: async (playListId: string | number) =>
    (await musicApi.playlist.getSongs(playListId)).map(playlistSongToSong),

  getAllBookmarkedSongs: () => musicApi.playlist.getAllBookmarkedSongs(),

  checkLikedSong: (platform: string, songId: string) =>
    musicApi.playlist.checkHeart(toThirdPlatform(platform), songId),

  importSongs: (payload: ImportSongsRequest) =>
    musicApi.playlist.importSongs({
      ...payload,
      platform: payload.platform ? toThirdPlatform(payload.platform) : undefined,
    }),
};

export const soundalbumApi = {
  bookmarkSoundAlbum: (album: SoundAlbum) =>
    musicApi.soundalbum.bookmark(toBookmarkSoundAlbumPayload(album)),

  unBookmarkSoundAlbum: (album: SoundAlbum) =>
    musicApi.soundalbum.unBookmark(toBookmarkSoundAlbumPayload(album)),

  getCollectedSoundAlbums: async () =>
    (await musicApi.soundalbum.getAll()).map(mapSoundAlbumEntity),

  searchSoundAlbums: (keyword: string, pageNum = 1) =>
    musicApi.search.searchSoundAlbum(keyword, pageNum),

  getSoundList: (
    platform: string,
    soundAlbum: SoundAlbum,
    params?: { sort?: SortType; pageNum?: number; pageSize?: number },
  ) =>
    musicApi.search.searchSoundList(toThirdPlatform(platform), soundAlbum, params),

  savePlayHistory: (payload: {
    platform: string;
    soundAlbumId: string;
    songId: string;
    playDuration: number;
    playPosition: number;
    sort?: number;
  }) =>
    musicApi.soundalbum.savePlayHistory({
      ...payload,
      platform: toThirdPlatform(payload.platform),
    }),

  getAllPlayHistory: (platform: string, soundAlbumId: string) =>
    musicApi.soundalbum.getAllPlayHistory(toThirdPlatform(platform), soundAlbumId),

  importSounds: (payload: ImportSoundsRequest) => musicApi.soundalbum.importSounds(payload),

  getCacheDetail: (platform: string, soundAlbumId: string) =>
    musicApi.soundalbum.getCacheDetail(toThirdPlatform(platform), soundAlbumId),

  cacheSound: (platform: string, soundId: string) =>
    musicApi.soundalbum.cacheSound(toThirdPlatform(platform), soundId),
};

// Legacy alias for old page imports
export const audiobookApi = {
  getCollectedAudiobooks: async () =>
    (await soundalbumApi.getCollectedSoundAlbums()).map((item) => ({
      id: String(item.albumId),
      name: item.albumTitle,
      cover: item.albumImg,
      episodeCount: item.countOfSounds,
      description: item.desc,
      isCollected: true,
    })),

  getCachedAudios: async (): Promise<AudioEpisode[]> => {
    const albums = await soundalbumApi.getCollectedSoundAlbums();
    const cacheRows = await Promise.all(
      albums.map(async (album) => {
        try {
          const detail = await soundalbumApi.getCacheDetail(album.platform, album.albumId);
          if (!detail.cachedSounds) return null;
          return {
            id: `${album.platform}-${album.albumId}`,
            name: album.albumTitle,
            albumId: album.albumId,
            albumName: album.albumTitle,
            duration: 0,
            isCached: detail.cachedSounds > 0,
          } as AudioEpisode;
        } catch {
          return null;
        }
      }),
    );

    return cacheRows.filter((item): item is AudioEpisode => item !== null);
  },

  collectAudiobook: async (_bookId: string) => {
    throw new Error("请在有声专辑搜索结果中使用完整专辑信息进行收藏");
  },

  uncollectAudiobook: async (_bookId: string) => {
    throw new Error("请在有声专辑列表中使用完整专辑信息进行取消收藏");
  },
};

export const likeApi = {
  likeSong: async (songId: string, platform: string) => {
    const detail = await searchApi.getSongDetail(platform, songId);
    await musicApi.playlist.addSong(
      buildAddSongPayload(detail, {
        addToFavorite: true,
      }),
    );
  },

  unlikeSong: async (songId: string, platform?: string) => {
    if (platform) {
      await musicApi.playlist.removeSong({
        removeSongRefId: songId,
        removePlatform: toThirdPlatform(platform),
        removeFromFavorite: true,
      });
      return;
    }

    const refs = await musicApi.playlist.getAllBookmarkedSongs();
    const target = refs.find((item) => item.songId === songId);
    if (!target) return;

    await musicApi.playlist.removeSong({
      removeSongRefId: target.songId,
      removePlatform: toThirdPlatform(target.platform),
      removeFromFavorite: true,
    });
  },

  getLikedSongs: async () => {
    const refs = await musicApi.playlist.getAllBookmarkedSongs();
    if (refs.length === 0) return [];

    const list = await Promise.all(
      refs.map(async (item) => {
        if (isPlaylistSongEntity(item)) {
          return playlistSongToSong(item);
        }
        try {
          return await searchApi.getSongDetail(item.platform, item.songId);
        } catch {
          return null;
        }
      }),
    );

    return list.filter((item): item is Song => item !== null);
  },

  checkLiked: async (songId: string, platform = "QQ") =>
    musicApi.playlist.checkHeart(toThirdPlatform(platform), songId),
};

export const downloadApi = {
  getDownloadQueue: async () => [] as unknown[],
  addDownload: async (_data: { id: string; type: string; quality: string }) => undefined,
  pauseDownload: async (_id: string) => undefined,
  resumeDownload: async (_id: string) => undefined,
  retryDownload: async (_id: string) => undefined,
  deleteDownload: async (_id: string) => undefined,
  clearDownloads: async () => undefined,
  getDownloaded: async () => [] as unknown[],
};

export const utilsApi = {
  getWechatGroupsRawHtml: () => musicApi.utils.getWechatGroupsRawHtml(),
  userAction: (payload: UserActionRequest) => musicApi.utils.userAction(payload),
  countUserActionByDay: (action: string) => musicApi.utils.countUserActionByDay(action),
  countUserActionByHour: (action: string) => musicApi.utils.countUserActionByHour(action),
  getNoLossLimit: () => musicApi.utils.getNoLossLimit(),
  getMusicLimit: () => musicApi.utils.getMusicLimit(),
  getSoundLimit: () => musicApi.utils.getSoundLimit(),
  getDownloadLimit: () => musicApi.utils.getDownloadLimit(),
  getBookmarkSoundAlbumLimit: () => musicApi.utils.getBookmarkSoundAlbumLimit(),
  getSoundCacheLimit: () => musicApi.utils.getSoundCacheLimit(),
  getUserMsg: () => musicApi.utils.getUserMsg(),
};

export default musicApi;
