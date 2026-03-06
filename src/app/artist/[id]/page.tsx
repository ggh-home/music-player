"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, Share2, Disc, UserPlus, Check } from "lucide-react";
import { Song, Album, Singer } from "@/types";
import { searchApi } from "@/services/api";
import { usePlayerStore, useAuthStore } from "@/stores";
import { formatTime, formatNumber } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ArtistDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { setCurrentSong, setIsPlaying } = usePlayerStore();
  
  const [artist, setArtist] = useState<Singer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (id) {
      loadArtistDetail();
    }
  }, [id]);

  const loadArtistDetail = async () => {
    setIsLoading(true);
    try {
      // 加载歌手详情
      // const artistRes = await searchApi.getSingerDetail(id);
      // setArtist(artistRes.data.data);
      
      // 加载歌手歌曲
      // const songsRes = await searchApi.getSingerSongs("QQ", id);
      // setSongs(songsRes.data.data);
      
      // 加载歌手专辑
      // const albumsRes = await searchApi.getSingerAlbums("QQ", id);
      // setAlbums(albumsRes.data.data);
      
      // 模拟数据
      setArtist({
        id,
        name: "周杰伦",
        platform: "QQ",
        songCount: 200,
        albumCount: 15,
      });
      
      setSongs([
        { id: "1", name: "夜曲", singer: "周杰伦", duration: 226, platform: "QQ" },
        { id: "2", name: "晴天", singer: "周杰伦", duration: 269, platform: "QQ" },
        { id: "3", name: "七里香", singer: "周杰伦", duration: 299, platform: "QQ" },
        { id: "4", name: "稻香", singer: "周杰伦", duration: 223, platform: "QQ" },
        { id: "5", name: "青花瓷", singer: "周杰伦", duration: 239, platform: "QQ" },
      ]);
      
      setAlbums([
        { id: "1", name: "十一月的萧邦", singer: "周杰伦", singerId: id, platform: "QQ", songCount: 12 },
        { id: "2", name: "叶惠美", singer: "周杰伦", singerId: id, platform: "QQ", songCount: 11 },
        { id: "3", name: "七里香", singer: "周杰伦", singerId: id, platform: "QQ", songCount: 10 },
        { id: "4", name: "范特西", singer: "周杰伦", singerId: id, platform: "QQ", songCount: 10 },
      ]);
    } catch (error) {
      toast.error("加载歌手信息失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? "已取消关注" : "关注成功");
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
            {artist.avatar ? (
              <Image src={artist.avatar} alt={artist.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-5xl font-bold text-white">{artist.name[0]}</span>
              </div>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
              <span>{artist.songCount}首歌曲</span>
              <span>{artist.albumCount}张专辑</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Button onClick={() => handlePlay(songs[0])}>
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
                key={song.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <span className="text-muted-foreground w-8 text-center">{index + 1}</span>
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  {song.cover ? (
                    <Image src={song.cover} alt={song.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.singer}</p>
                </div>
                <span className="text-sm text-muted-foreground">{formatTime(song.duration)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePlay(song)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="albums" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albums.map((album) => (
                <Card key={album.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative aspect-square">
                    {album.cover ? (
                      <Image src={album.cover} alt={album.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                        <Disc className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium truncate">{album.name}</p>
                    <p className="text-sm text-muted-foreground">{album.songCount}首</p>
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
