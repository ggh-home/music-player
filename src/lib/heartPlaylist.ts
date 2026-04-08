import { playlistApi } from "@/services/api";
import { Playlist, Song } from "@/types";

export const HEART_PLAYLIST_NAME = "我的红心歌单";

type PlaylistWithCompatFields = Partial<Playlist> & {
  playListId?: number | string;
  playListName?: string;
};

type SongWithCompatFields = {
  songId?: string;
  platform?: Song["platform"] | string;
  rawDetail?: {
    songId?: string;
    platform?: Song["platform"] | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const normalizePlatform = (platform: unknown): Song["platform"] | null => {
  const normalized = String(platform ?? "").trim().toUpperCase();
  if (normalized === "QQ") return "QQ";
  if (normalized === "WYY" || normalized === "NETEASE") return "WYY";
  if (normalized === "XMLY" || normalized === "XIMALAYA") return "XMLY";
  return null;
};

const getPlaylistName = (playlist: PlaylistWithCompatFields): string => {
  return playlist.playListName || playlist.name || "";
};

const getPlaylistId = (playlist: PlaylistWithCompatFields): string => {
  if (playlist.playListId !== undefined && playlist.playListId !== null) {
    return String(playlist.playListId);
  }
  if (playlist.id !== undefined && playlist.id !== null) {
    return String(playlist.id);
  }
  return "";
};

const getSongKeyFromCompatSong = (song: SongWithCompatFields): string | null => {
  const songId = song.songId || song.rawDetail?.songId;
  const platform = normalizePlatform(song.platform || song.rawDetail?.platform);
  if (!songId || !platform) return null;
  return `${platform}::${songId}`;
};

const loadMyPlaylists = async (): Promise<PlaylistWithCompatFields[]> => {
  try {
    return await playlistApi.getMyPlaylists("ALL");
  } catch {
    return await playlistApi.getMyPlaylists("CUSTOM");
  }
};

const findHeartPlaylist = (playlists: PlaylistWithCompatFields[]) => {
  return playlists.find((playlist) => getPlaylistName(playlist) === HEART_PLAYLIST_NAME) || null;
};

export const getSongFavoriteKey = (song: Pick<Song, "songId" | "platform">): string => {
  const platform = normalizePlatform(song.platform) || "QQ";
  return `${platform}::${song.songId}`;
};

export const getHeartPlaylistIdIfExists = async (): Promise<string | null> => {
  const playlists = await loadMyPlaylists();
  const heartPlaylist = findHeartPlaylist(playlists);
  if (!heartPlaylist) return null;
  const playlistId = getPlaylistId(heartPlaylist);
  return playlistId || null;
};

export const ensureHeartPlaylistId = async (): Promise<string> => {
  const existsId = await getHeartPlaylistIdIfExists();
  if (existsId) return existsId;

  await playlistApi.createPlaylist({
    playListName: HEART_PLAYLIST_NAME,
  });

  const refreshId = await getHeartPlaylistIdIfExists();
  if (refreshId) return refreshId;

  throw new Error("创建红心歌单失败");
};

export const loadHeartPlaylistSongKeySet = async (playlistId: string): Promise<Set<string>> => {
  const songs = (await playlistApi.getPlaylistSongs(playlistId)) as SongWithCompatFields[];

  const likedSet = new Set<string>();
  songs.forEach((song) => {
    const key = getSongKeyFromCompatSong(song);
    if (key) likedSet.add(key);
  });
  return likedSet;
};

export const loadLikedSongMapBySongList = async (songs: Song[]) => {
  const heartPlaylistId = await getHeartPlaylistIdIfExists();
  if (!heartPlaylistId) {
    return {
      heartPlaylistId: null as string | null,
      likedSongMap: songs.reduce<Record<string, boolean>>((acc, song) => {
        acc[getSongFavoriteKey(song)] = false;
        return acc;
      }, {}),
    };
  }

  const likedKeySet = await loadHeartPlaylistSongKeySet(heartPlaylistId);
  const likedSongMap = songs.reduce<Record<string, boolean>>((acc, song) => {
    acc[getSongFavoriteKey(song)] = likedKeySet.has(getSongFavoriteKey(song));
    return acc;
  }, {});

  return {
    heartPlaylistId,
    likedSongMap,
  };
};

export const addSongToHeartPlaylist = async (song: Song, heartPlaylistId?: string | null): Promise<string> => {
  const targetPlaylistId = heartPlaylistId || (await ensureHeartPlaylistId());
  await playlistApi.addSongToPlaylist(targetPlaylistId, song);
  return targetPlaylistId;
};

export const removeSongFromHeartPlaylist = async (
  song: Song,
  heartPlaylistId?: string | null
): Promise<string | null> => {
  const targetPlaylistId = heartPlaylistId || (await getHeartPlaylistIdIfExists());
  if (!targetPlaylistId) return null;

  try {
    await playlistApi.removeSongFromPlaylist(targetPlaylistId, song.songId, String(song.platform));
  } catch {
    await playlistApi.removeSongFromPlaylistByPayload({
      playListId: targetPlaylistId,
      songId: song.songId,
      platform: String(song.platform),
    });
  }

  return targetPlaylistId;
};
