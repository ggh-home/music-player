"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, MoreHorizontal, Pause, Download } from "lucide-react";
import { Song } from "@/types";
import { usePlayerStore, useAuthStore, useDownloadStore } from "@/stores";
import { searchApi } from "@/services/api";
import {
  addSongToHeartPlaylist,
  getSongFavoriteKey,
  loadLikedSongMapBySongList,
  removeSongFromHeartPlaylist,
} from "@/lib/heartPlaylist";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Mock 数据
const mockRecommendations = {
  banners: [
    {
      id: "1",
      image: "https://picsum.photos/800/300?random=1",
      title: "每日推荐",
    },
    {
      id: "2",
      image: "https://picsum.photos/800/300?random=2",
      title: "热门榜单",
    },
    {
      id: "3",
      image: "https://picsum.photos/800/300?random=3",
      title: "新歌首发",
    },
  ],
  playlists: [
    {
      id: "1",
      name: "华语经典",
      cover: "https://picsum.photos/300/300?random=4",
      playCount: 1200000,
    },
    {
      id: "2",
      name: "欧美流行",
      cover: "https://picsum.photos/300/300?random=5",
      playCount: 890000,
    },
    {
      id: "3",
      name: "日语精选",
      cover: "https://picsum.photos/300/300?random=6",
      playCount: 560000,
    },
    {
      id: "4",
      name: "韩语热歌",
      cover: "https://picsum.photos/300/300?random=7",
      playCount: 430000,
    },
  ],
};

const TAB_SEARCH_KEY_MAP = {
  new: "最新音乐",
  hot: "热门排行",
  recommend: "个性推荐",
};

// 定义有效的 tab 类型
type ValidTab = "new" | "hot" | "recommend";

// 校验是否为有效的 tab 类型
const isValidTab = (value: string): value is ValidTab => {
  return ["new", "hot", "recommend"].includes(value);
};

export default function HomePage() {
  const router = useRouter();
  const {
    currentSong,
    isPlaying,
    playSong,
  } = usePlayerStore();
  const { downloadSong } = useDownloadStore();
  const { isAuthenticated, checkLoginStatus } = useAuthStore();

  const [activeBanner, setActiveBanner] = useState(0);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "hot" | "recommend">(
    "new",
  );
  const hasCheckedLoginRef = useRef(false);
  // [收藏功能新增 START] 首页歌曲红心收藏状态
  const [likedSongMap, setLikedSongMap] = useState<Record<string, boolean>>({});
  const [heartPlaylistId, setHeartPlaylistId] = useState<string | null>(null);
  // [收藏功能新增 END] 首页歌曲红心收藏状态

  // Banner 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner(
        (prev) => (prev + 1) % mockRecommendations.banners.length,
      );
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 首页进入时校验登录状态并提示
  useEffect(() => {
    if (hasCheckedLoginRef.current) return;
    hasCheckedLoginRef.current = true;

    const status = checkLoginStatus();
    if (status === "expired") {
      toast.error("登录已过期，请重新登录");
      return;
    }
    if (status === "unauthenticated") {
      toast("请先登录后体验完整功能");
    }
  }, [checkLoginStatus]);

  // 统一搜索
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    try {
      const nextSongs = await searchApi.searchSongs(keyword);
      setSongs(nextSongs);
      // [收藏功能新增] Tab 切歌列表后同步红心状态
      await syncLikedStateForSongs(nextSongs);
    } catch (error) {
      toast.error("加载失败");
      setSongs([]);
      setLikedSongMap({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    // 校验 value 是否为有效类型
    if (isValidTab(value)) {
      setActiveTab(value);
      handleSearch(TAB_SEARCH_KEY_MAP[value]);
    } else {
      // 处理无效值，默认切换到 new
      setActiveTab("new");
      handleSearch(TAB_SEARCH_KEY_MAP.new);
    }
  };

  useEffect(() => {
    handleSearch(TAB_SEARCH_KEY_MAP.new);
  }, []);

  // [收藏功能新增 START] 登录态变化时刷新当前列表红心状态
  useEffect(() => {
    if (!songs.length) {
      setLikedSongMap({});
      if (!isAuthenticated) setHeartPlaylistId(null);
      return;
    }
    void syncLikedStateForSongs(songs);
  }, [isAuthenticated]);
  // [收藏功能新增 END] 登录态变化时刷新当前列表红心状态

  // 播放/暂停切换
  const togglePlayPause = async (song: Song) => {
    await playSong(song, songs);
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

  // 跳转播放页
  const goToPlayPage = (keyword: string) => {
    router.push(`/play-list?keyword=${encodeURIComponent(keyword)}`);
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

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Banner 轮播 */}
        <section className="relative h-[200px] md:h-[300px] rounded-2xl overflow-hidden">
          {mockRecommendations.banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === activeBanner ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {banner.title}
                </h2>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPlayPage(banner.title);
                  }}
                >
                  <Play className="h-4 w-4" />
                  立即播放
                </Button>
              </div>
            </div>
          ))}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {mockRecommendations.banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveBanner(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeBanner ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        </section>

        {/* 推荐歌单 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">推荐歌单</h2>
            <Link
              href="/playlists"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              查看更多
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mockRecommendations.playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => goToPlayPage(playlist.name)}
                className="cursor-pointer"
              >
                <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square">
                    <Image
                      src={playlist.cover}
                      alt={playlist.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="icon" className="rounded-full">
                        <Play className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium truncate">{playlist.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {(playlist.playCount / 10000).toFixed(1)}万播放
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* 歌曲列表 Tab */}
        <section>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="new">最新音乐</TabsTrigger>
                <TabsTrigger value="hot">热门排行</TabsTrigger>
                <TabsTrigger value="recommend">个性推荐</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {isLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    加载中...
                  </div>
                )}

                {!isLoading && songs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无歌曲数据
                  </div>
                )}

                {!isLoading &&
                  songs.map((song, index) => (
                    <div
                      key={song.songId}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
                      onClick={() => togglePlayPause(song)}
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

                      <div className="flex gap-1 opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause(song);
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
                          className={cn("h-8 w-8", isSongLiked(song) && "text-red-500")}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSongFavorite(song);
                          }}
                        >
                          <Heart className={cn("h-4 w-4", isSongLiked(song) && "fill-current")} />
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
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </MainLayout>
  );
}
