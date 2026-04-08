"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, Share2, Disc, UserPlus, Check, Download } from "lucide-react";
import { Song, Album, Singer } from "@/types";
import { searchApi } from "@/services/api";
import { usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import { cn, formatTime } from "@/lib/utils";
import {
  addSongToHeartPlaylist,
  getSongFavoriteKey,
  loadLikedSongMapBySongList,
  removeSongFromHeartPlaylist,
} from "@/lib/heartPlaylist";
import toast from "react-hot-toast";

export default function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const platform = searchParams.get("platform") || "QQ";

  const { isAuthenticated } = useAuthStore();
  const { playSong } = usePlayerStore();
  const { downloadSong } = useDownloadStore();

  const [artist, setArtist] = useState<Singer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likedSongMap, setLikedSongMap] = useState<Record<string, boolean>>({});
  const [heartPlaylistId, setHeartPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      void loadArtistDetail();
    }
  }, [id, platform]);

  useEffect(() => {
    if (!songs.length) {
      setLikedSongMap({});
      if (!isAuthenticated) setHeartPlaylistId(null);
      return;
    }
    void syncLikedStateForSongs(songs);
  }, [isAuthenticated]);

  const loadArtistDetail = async () => {
    setIsLoading(true);
    try {
      const [songList, albumList] = await Promise.all([
        searchApi.getSingerSongs(platform, id),
        searchApi.getSingerAlbums(platform, id),
      ]);

      setSongs(songList);
      await syncLikedStateForSongs(songList);
      setAlbums(albumList);

      const singerName =
        songList[0]?.singerName || albumList[0]?.singerName || "未知歌手";
      const singerImg = songList[0]?.songImg || albumList[0]?.albumImg || "";

      setArtist({
        platform,
        singerId: id,
        singerName,
        countOfSong: songList.length,
        countOfAlbum: albumList.length,
        singerImg,
      });
    } catch (error) {
      toast.error("加载歌手信息失败");
      setArtist(null);
      setSongs([]);
      setAlbums([]);
      setLikedSongMap({});
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = async (song: Song) => {
    if (!songs.length) return;
    await playSong(song, songs);
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? "已取消关注" : "关注成功");
  };

  const isSongLiked = (song: Song) => {
    return likedSongMap[getSongFavoriteKey(song)] === true;
  };

  const syncLikedStateForSongs = async (songList: Song[]) => {
    if (!songList.length) {
      setLikedSongMap({});
      return;
    }

    if (!isAuthenticated) {
      setHeartPlaylistId(null);
      setLikedSongMap(
        songList.reduce<Record<string, boolean>>((acc, song) => {
          acc[getSongFavoriteKey(song)] = false;
          return acc;
        }, {}),
      );
      return;
    }

    try {
      const { heartPlaylistId: nextPlaylistId, likedSongMap: nextLikedMap } =
        await loadLikedSongMapBySongList(songList);
      setHeartPlaylistId(nextPlaylistId);
      setLikedSongMap(nextLikedMap);
    } catch {
      setLikedSongMap(
        songList.reduce<Record<string, boolean>>((acc, song) => {
          acc[getSongFavoriteKey(song)] = false;
          return acc;
        }, {}),
      );
    }
  };

  const handleToggleSongFavorite = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }

    const songKey = getSongFavoriteKey(song);
    const liked = isSongLiked(song);

    try {
      if (liked) {
        const playlistId = await removeSongFromHeartPlaylist(song, heartPlaylistId);
        if (playlistId) setHeartPlaylistId(playlistId);
        setLikedSongMap((prev) => ({ ...prev, [songKey]: false }));
        toast.success("已取消收藏");
      } else {
        const playlistId = await addSongToHeartPlaylist(song, heartPlaylistId);
        setHeartPlaylistId(playlistId);
        setLikedSongMap((prev) => ({ ...prev, [songKey]: true }));
        toast.success("已收藏到我的红心歌单");
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDownloadSong = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    await downloadSong(song);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </MainLayout>
    );
  }

  if (!artist) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">歌手不存在</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 pb-6 border-b">
          <div className="relative h-40 w-40 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
            {artist.singerImg ? (
              <Image
                src={artist.singerImg}
                alt={artist.singerName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-5xl font-bold text-white">
                  {artist.singerName[0]}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{artist.singerName}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
              <span>{songs.length}首歌曲</span>
              <span>{albums.length}张专辑</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Button onClick={() => songs[0] && void handlePlay(songs[0])} disabled={songs.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                播放热门
              </Button>
              <Button variant="outline" onClick={handleFollow}>
                {isFollowing ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    已关注
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    关注
                  </>
                )}
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="songs">
          <TabsList>
            <TabsTrigger value="songs">热门歌曲</TabsTrigger>
            <TabsTrigger value="albums">专辑</TabsTrigger>
            <TabsTrigger value="about">关于</TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={`${song.platform}-${song.songId}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <span className="text-muted-foreground w-8 text-center">
                  {index + 1}
                </span>
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  {song.songImg ? (
                    <Image
                      src={song.songImg}
                      alt={song.songTitle || "song"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.songTitle}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.singerName} - {song.albumTitle}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatTime(song.duration || 0)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void handleDownloadSong(song)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void handlePlay(song)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", isSongLiked(song) && "text-red-500")}
                    onClick={() => void handleToggleSongFavorite(song)}
                  >
                    <Heart className={cn("h-4 w-4", isSongLiked(song) && "fill-current")} />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="albums" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albums.map((album) => (
                <Card
                  key={`${album.platform}-${album.albumId}`}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="relative aspect-square">
                    {album.albumImg ? (
                      <Image
                        src={album.albumImg}
                        alt={album.albumTitle}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                        <Disc className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium truncate">{album.albumTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {album.releaseDate || "未知发行时间"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">暂无歌手简介</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
