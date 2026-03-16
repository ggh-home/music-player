"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Play, Heart, Clock, X, History, Pause } from "lucide-react";
import { Song, Singer, Playlist, Audiobook } from "@/types";
import { searchApi } from "@/services/api";
import { useSearchStore, usePlayerStore } from "@/stores";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const { playSong, currentSong, isPlaying } = usePlayerStore();

  const [keyword, setKeyword] = useState(initialQuery);
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);

  const { history, addHistory, removeHistory, clearHistory } = useSearchStore();

  // 初始搜索
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // 执行搜索
  const handleSearch = async (searchWord: string = keyword) => {
    if (!searchWord.trim()) return;

    setIsLoading(true);
    setSearchKeyword(searchWord);
    addHistory(searchWord, "song");

    try {
      const songsRes = await searchApi.searchSongs(searchWord);
      setSongs(songsRes.data.result || []);

      const singersRes = await searchApi.searchSingers(searchWord);
      setSingers(singersRes.data.result || []);

      const playlistsRes = await searchApi.searchPlaylists(searchWord);
      setPlaylists(playlistsRes.data.result || []);
    } catch (error) {
      toast.error("搜索失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 播放歌曲：直接调用 store.playSong，让 store 内部获取详情
  const handlePlaySong = async (song: Song) => {
    await playSong(song, songs);
  };

  const goToPlaylist = (name: string) => {
    router.push(`/play-list?keyword=${encodeURIComponent(name)}`);
  };

  const isSongPlaying = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 搜索框 */}
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

        {/* 搜索历史 */}
        {history.length > 0 && !searchKeyword && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                搜索历史
              </h3>
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

        {/* 搜索结果 */}
        {searchKeyword && (
          <Tabs defaultValue="songs">
            <TabsList>
              <TabsTrigger value="songs">歌曲 ({songs.length})</TabsTrigger>
              <TabsTrigger value="singers">歌手 ({singers.length})</TabsTrigger>
              <TabsTrigger value="playlists">
                歌单 ({playlists.length})
              </TabsTrigger>
              <TabsTrigger value="audiobooks">
                有声书 ({audiobooks.length})
              </TabsTrigger>
            </TabsList>

            {/* 歌曲结果 */}
            <TabsContent value="songs" className="space-y-2">
              {songs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关歌曲
                </div>
              ) : (
                songs.map((song, index) => (
                  <div
                    key={song.songId}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
                    onClick={() => handlePlaySong(song)}
                  >
                    <span className="text-muted-foreground w-6 text-center">
                      {index + 1}
                    </span>
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                      {song.songImg ? (
                        <Image
                          src={song.songImg}
                          alt={song.songTitle}
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
                      <p className="font-medium truncate">
                        {song.platform} - {song.songTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.singerName} · {song.albumTitle}
                      </p>
                    </div>
                    {/* 移除时长显示 */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySong(song);
                        }}
                      >
                        {isSongPlaying(song) ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* 歌手结果 */}
            <TabsContent value="singers" className="space-y-4">
              {singers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关歌手
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {singers.map((singer) => (
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

            {/* 歌单结果 */}
            <TabsContent value="playlists" className="space-y-4">
              {playlists.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关歌单
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {playlists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => goToPlaylist(playlist.name)}
                    >
                      <div className="relative aspect-square">
                        {playlist.cover ? (
                          <Image
                            src={playlist.cover}
                            alt={playlist.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Play className="h-10 w-10 text-muted-foreground" />
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
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 有声书结果 */}
            <TabsContent value="audiobooks" className="space-y-4">
              {audiobooks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  未找到相关有声书
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {audiobooks.map((book) => (
                    <Card
                      key={book.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="relative aspect-square">
                        {book.cover ? (
                          <Image
                            src={book.cover}
                            alt={book.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Clock className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{book.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {book.episodeCount}集
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* 热门搜索 */}
        {!searchKeyword && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              热门搜索
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "周杰伦",
                "薛之谦",
                "陈奕迅",
                "邓紫棋",
                "林俊杰",
                "毛不易",
                "李荣浩",
                "张学友",
              ].map((word) => (
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
