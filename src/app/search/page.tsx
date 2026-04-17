"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Play, Heart, Clock, X, History, Pause, Download } from "lucide-react";
import { Song, Singer, Playlist, Audiobook } from "@/types";
import { searchApi } from "@/services/api";
import { useSearchStore, usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import {
  addSongToHeartPlaylist,
  getSongFavoriteKey,
  loadLikedSongMapBySongList,
  removeSongFromHeartPlaylist,
} from "@/lib/heartPlaylist";
import toast from "react-hot-toast";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { downloadSong, downloadSongs } = useDownloadStore();
  const { isAuthenticated } = useAuthStore();

  const [keyword, setKeyword] = useState(initialQuery);
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  // [收藏功能新增 START] 搜索页红心收藏状态
  const [likedSongMap, setLikedSongMap] = useState<Record<string, boolean>>({});
  const [heartPlaylistId, setHeartPlaylistId] = useState<string | null>(null);
  // [收藏功能新增 END] 搜索页红心收藏状态

  const { history, addHistory, removeHistory, clearHistory } = useSearchStore();

  // 初始搜索
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // [收藏功能新增 START] 登录态变化时，刷新当前列表红心状态
  useEffect(() => {
    if (!songs.length) {
      setLikedSongMap({});
      if (!isAuthenticated) setHeartPlaylistId(null);
      return;
    }
    void syncLikedStateForSongs(songs);
  }, [isAuthenticated]);
  // [收藏功能新增 END] 登录态变化时，刷新当前列表红心状态

  // 执行搜索
  const handleSearch = async (searchWord: string = keyword) => {
    if (!searchWord.trim()) return;

    setIsLoading(true);
    setSearchKeyword(searchWord);
    addHistory(searchWord, "song");

    try {
      const nextSongs = await searchApi.searchSongs(searchWord);
      setSongs(nextSongs);
      // [收藏功能新增] 搜索结果返回后同步歌曲红心状态
      await syncLikedStateForSongs(nextSongs);

      const singersRes = await searchApi.searchSingers(searchWord);
      setSingers(singersRes);

      const playlistsRes = await searchApi.searchPlaylists(searchWord);
      setPlaylists(playlistsRes);

      const soundAlbums = await searchApi.searchSoundAlbums(searchWord);
      setAudiobooks(
        soundAlbums.map((item) => ({
          id: item.albumId,
          name: item.albumTitle,
          cover: item.albumImg,
          description: item.desc,
          episodeCount: item.countOfSounds,
          isCollected: Boolean(item.isCollected),
        }))
      );
    } catch (error) {
      toast.error("搜索失败");
    } finally {
      setIsLoading(false);
    }
  };

  // [收藏功能新增 START] 红心歌单状态与收藏切换
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
        }, {})
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
        }, {})
      );
    }
  };

  const isSongLiked = (song: Song) => {
    return likedSongMap[getSongFavoriteKey(song)] === true;
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
  // [收藏功能新增 END] 红心歌单状态与收藏切换

  // 播放歌曲：直接调用 store.playSong，让 store 内部获取详情
  const handlePlaySong = async (song: Song) => {
    await playSong(song, songs);
  };

  const getPlaylistId = (playlist: Playlist) => {
    if (playlist.playListId !== undefined && playlist.playListId !== null) {
      return String(playlist.playListId);
    }
    if (playlist.id !== undefined && playlist.id !== null) {
      return String(playlist.id);
    }
    return "";
  };

  const getPlaylistName = (playlist: Playlist) => {
    return playlist.playListName || playlist.name || "未命名歌单";
  };

  const getPlaylistCover = (playlist: Playlist) => {
    return playlist.playListImg || playlist.cover || "";
  };

  const getPlaylistSongCount = (playlist: Playlist) => {
    if (typeof playlist.countOfSong === "number") return playlist.countOfSong;
    if (typeof playlist.songCount === "number") return playlist.songCount;
    return 0;
  };

  const getPlaylistCreator = (playlist: Playlist) => {
    return playlist.creator || "未知创建者";
  };

  const getPlaylistPlatform = (playlist: Playlist): Song["platform"] | null => {
    const platform = playlist.platform as string | undefined;
    if (platform === "QQ" || platform === "WYY" || platform === "XMLY") {
      return platform as Song["platform"];
    }
    return null;
  };

  const goToPlaylist = (playlist: Playlist) => {
    const playlistId = getPlaylistId(playlist);
    if (!playlistId) {
      toast.error("歌单信息不完整");
      return;
    }

    const query = new URLSearchParams();
    query.set("source", "search");
    query.set("name", getPlaylistName(playlist));
    query.set("creator", getPlaylistCreator(playlist));
    query.set("songCount", String(getPlaylistSongCount(playlist)));

    const cover = getPlaylistCover(playlist);
    if (cover) query.set("cover", cover);

    const platform = getPlaylistPlatform(playlist);
    if (platform) query.set("platform", platform);

    router.push(`/playlist/${encodeURIComponent(playlistId)}?${query.toString()}`);
  };

  const isSongPlaying = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
  };

  const handleDownloadSong = async (song: Song) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    await downloadSong(song);
  };

  const handleDownloadAllSongs = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }

    if (songs.length === 0) {
      toast.error("暂无可下载歌曲");
      return;
    }

    await downloadSongs(songs);
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
                <>
                  <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div>
                      <p className="font-medium">歌曲结果</p>
                      <p className="text-sm text-muted-foreground">共 {songs.length} 首，可一键加入下载队列</p>
                    </div>
                    <Button variant="outline" onClick={() => void handleDownloadAllSongs()}>
                      <Download className="mr-2 h-4 w-4" />
                      批量下载
                    </Button>
                  </div>
                  {songs.map((song, index) => (
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
                        <p className="font-medium truncate">
                          {song.platform} - {song.songTitle}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {song.singerName} · {song.albumTitle}
                        </p>
                      </div>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadSong(song);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${isSongLiked(song) ? "text-red-500" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSongFavorite(song);
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${isSongLiked(song) ? "fill-current" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
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
                      key={`${getPlaylistId(playlist)}-${getPlaylistName(playlist)}`}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => goToPlaylist(playlist)}
                    >
                      <div className="relative aspect-square">
                        {getPlaylistCover(playlist) ? (
                          <Image
                            src={getPlaylistCover(playlist)}
                            alt={getPlaylistName(playlist)}
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
                        <p className="font-medium truncate">{getPlaylistName(playlist)}</p>
                        <p className="text-sm text-muted-foreground">
                          创建者：{getPlaylistCreator(playlist)} · {getPlaylistSongCount(playlist)}首
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

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="py-20 text-center text-muted-foreground">搜索页加载中...</div>
        </MainLayout>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
