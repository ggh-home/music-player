"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, Clock, Disc, Mic2, Plus, Download } from "lucide-react";
import { Song, Playlist, Singer } from "@/types";
import { likeApi, playlistApi } from "@/services/api";
import { usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LibraryPage() {
  const { isAuthenticated } = useAuthStore();
  const { playSong } = usePlayerStore();
  const { downloadSong } = useDownloadStore();

  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [collectedPlaylists, setCollectedPlaylists] = useState<Playlist[]>([]);
  const [followedSingers, setFollowedSingers] = useState<Singer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    loadLibraryData();
  }, [isAuthenticated]);

  const loadLibraryData = async () => {
    setIsLoading(true);
    try {
      // 加载喜欢的歌曲
      const likedSongs = await likeApi.getLikedSongs();
      setLikedSongs(likedSongs);

      // 加载我的歌单
      const myPlaylists = await playlistApi.getMyPlaylists("CUSTOM");
      setMyPlaylists(myPlaylists);

      // 加载收藏的歌单
      const collectedPlaylists = await playlistApi.getCollectedPlaylists();
      setCollectedPlaylists(collectedPlaylists);
    } catch (error) {
      toast.error("加载数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (song: Song) => {
    void playSong(song, likedSongs);
  };

  const handleDownloadSong = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    await downloadSong(song);
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">请先登录查看您的音乐库</p>
          <Button asChild>
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">音乐库</h1>

        <Tabs defaultValue="liked">
          <TabsList>
            <TabsTrigger value="liked">
              <Heart className="h-4 w-4 mr-2" />
              喜欢的歌曲
            </TabsTrigger>
            <TabsTrigger value="playlists">
              <Disc className="h-4 w-4 mr-2" />
              我的歌单
            </TabsTrigger>
            <TabsTrigger value="collected">
              <Clock className="h-4 w-4 mr-2" />
              收藏歌单
            </TabsTrigger>
            <TabsTrigger value="artists">
              <Mic2 className="h-4 w-4 mr-2" />
              关注的歌手
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liked" className="space-y-4">
            {likedSongs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                还没有喜欢的歌曲，去发现音乐吧
              </div>
            ) : (
              <div className="space-y-2">
                {likedSongs.map((song, index) => (
                  <div
                    key={song.songId}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <span className="text-muted-foreground w-6 text-center">
                      {index + 1}
                    </span>
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                      {song.cover ? (
                        <Image
                          src={song.cover}
                          alt={song.songTitle || "song"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{song.songTitle}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.singerName}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(song.duration || 0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => void handleDownloadSong(song)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handlePlay(song)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="playlists" className="space-y-4">
            <div className="flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建歌单
              </Button>
            </div>
            {myPlaylists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                还没有创建歌单
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myPlaylists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square">
                        {playlist.cover ? (
                          <Image
                            src={playlist.cover}
                            alt={playlist.name || "playlist"}
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
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {playlist.songCount}首
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="collected" className="space-y-4">
            {collectedPlaylists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                还没有收藏歌单
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {collectedPlaylists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square">
                        {playlist.cover ? (
                          <Image
                            src={playlist.cover}
                            alt={playlist.name || "playlist"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Disc className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">
                          by {playlist.creator}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="artists" className="space-y-4">
            {followedSingers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                还没有关注的歌手
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {followedSingers.map((singer) => (
                  <Card
                    key={singer.singerId}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="relative aspect-square">
                      {singer.avatar ? (
                        <Image
                          src={singer.avatar}
                          alt={singer.singerName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                          <span className="text-4xl font-bold text-white">
                            {singer.singerName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 text-center">
                      <p className="font-medium truncate">
                        {singer.singerName}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
