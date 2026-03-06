"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Play, Heart, Clock, X, History } from "lucide-react";
import { Song, Singer, Playlist, Audiobook } from "@/types";
import { searchApi } from "@/services/api";
import { useSearchStore, usePlayerStore } from "@/stores";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [keyword, setKeyword] = useState(initialQuery);
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  
  const { history, addHistory, removeHistory, clearHistory } = useSearchStore();
  const { setCurrentSong, setIsPlaying, addToQueue } = usePlayerStore();

  // 执行搜索
  const handleSearch = async (searchWord: string = keyword) => {
    if (!searchWord.trim()) return;
    
    setIsLoading(true);
    setSearchKeyword(searchWord);
    addHistory(searchWord, "song");
    
    try {
      // 搜索歌曲
      const songsRes = await searchApi.searchSongs(searchWord);
      setSongs(songsRes.data.data || []);
      
      // 搜索歌手
      const singersRes = await searchApi.searchSingers(searchWord);
      setSingers(singersRes.data.data || []);
      
      // 搜索歌单
      const playlistsRes = await searchApi.searchPlaylists(searchWord);
      setPlaylists(playlistsRes.data.data || []);
      
      // 搜索有声书
      const audiobooksRes = await searchApi.searchAudiobooks(searchWord);
      setAudiobooks(audiobooksRes.data.data || []);
    } catch (error) {
      toast.error("搜索失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 初始搜索
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // 播放歌曲
  const handlePlay = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    toast.success(`正在播放: ${song.name}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Search Header */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索歌曲、歌手、歌单、有声书..."
              className="pl-10"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={() => handleSearch()} disabled={isLoading}>
            {isLoading ? "搜索中..." : "搜索"}
          </Button>
        </div>

        {/* Search History */}
        {history.length > 0 && !searchKeyword && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">搜索历史</h3>
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                清空
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent text-sm cursor-pointer hover:bg-accent/80"
                  onClick={() => {
                    setKeyword(item.keyword);
                    handleSearch(item.keyword);
                  }}
                >
                  <History className="h-3 w-3" />
                  {item.keyword}
                  <X
                    className="h-3 w-3 ml-1 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistory(item.id);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchKeyword && (
          <Tabs defaultValue="songs">
            <TabsList>
              <TabsTrigger value="songs">歌曲 ({songs.length})</TabsTrigger>
              <TabsTrigger value="singers">歌手 ({singers.length})</TabsTrigger>
              <TabsTrigger value="playlists">歌单 ({playlists.length})</TabsTrigger>
              <TabsTrigger value="audiobooks">有声书 ({audiobooks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="songs" className="space-y-2">
              {songs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关歌曲
                </div>
              ) : (
                songs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <span className="text-muted-foreground w-6 text-center">
                      {index + 1}
                    </span>
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                      {song.cover ? (
                        <Image src={song.cover} alt={song.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{song.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.singer} · {song.album}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(song.duration)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePlay(song)}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="singers" className="space-y-4">
              {singers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关歌手
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {singers.map((singer) => (
                    <Card key={singer.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square">
                        {singer.avatar ? (
                          <Image src={singer.avatar} alt={singer.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                            <span className="text-4xl font-bold text-white">{singer.name[0]}</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 text-center">
                        <p className="font-medium truncate">{singer.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="playlists" className="space-y-4">
              {playlists.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关歌单
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {playlists.map((playlist) => (
                    <Card key={playlist.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square">
                        {playlist.cover ? (
                          <Image src={playlist.cover} alt={playlist.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Play className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">{playlist.songCount}首</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audiobooks" className="space-y-4">
              {audiobooks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关有声书
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {audiobooks.map((book) => (
                    <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square">
                        {book.cover ? (
                          <Image src={book.cover} alt={book.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Clock className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{book.name}</p>
                        <p className="text-sm text-muted-foreground">{book.episodeCount}集</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Hot Search */}
        {!searchKeyword && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">热门搜索</h3>
            <div className="flex flex-wrap gap-2">
              {["周杰伦", "薛之谦", "陈奕迅", "邓紫棋", "林俊杰", "毛不易", "李荣浩", "张学友"].map((word) => (
                <Button
                  key={word}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setKeyword(word);
                    handleSearch(word);
                  }}
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
