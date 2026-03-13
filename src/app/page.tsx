"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, MoreHorizontal, Pause } from "lucide-react";
import { Song, Playlist, Singer } from "@/types";
import { usePlayerStore, useAuthStore } from "@/stores";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";
import { formatTime } from "@/lib/utils";

// 仅保留 Banner、推荐歌单 Mock，歌曲列表全走接口
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

// Tab 与搜索关键词映射
const TAB_SEARCH_KEY_MAP = {
  new: "最新音乐",
  hot: "热门排行",
  recommend: "个性推荐",
};

export default function HomePage() {
  const router = useRouter();
  // 👇 3. 新增解构 currentSong、isPlaying
  const {
    setCurrentSong,
    setIsPlaying,
    addToQueue,
    setPlayQueue,
    currentSong,
    isPlaying,
  } = usePlayerStore();
  const [activeBanner, setActiveBanner] = useState(0);

  // 歌曲列表 & 加载状态
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // 当前激活 Tab
  const [activeTab, setActiveTab] = useState<"new" | "hot" | "recommend">(
    "new",
  );

  // Banner 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner(
        (prev) => (prev + 1) % mockRecommendations.banners.length,
      );
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 统一搜索方法（复用搜索页逻辑）
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    try {
      const songsRes = await searchApi.searchSongs(keyword);
      setSongs(songsRes.data.result || []);
    } catch (error) {
      toast.error("加载失败");
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 切换 Tab 时触发对应关键词搜索
  const handleTabChange = (value: "new" | "hot" | "recommend") => {
    setActiveTab(value);
    handleSearch(TAB_SEARCH_KEY_MAP[value]);
  };

  // 首页初始化：自动搜索「最新音乐」
  useEffect(() => {
    handleSearch(TAB_SEARCH_KEY_MAP.new);
  }, []);

  // 完整播放逻辑（完全对齐搜索页，获取歌曲详情、URL、歌词）
  const handlePlay = async (song: Song) => {
    try {
      toast.loading(`正在加载: ${song.songTitle}`, {
        id: `play-${song.songId}`,
      });

      const songsRes = await searchApi.getSongDetail(
        song.platform,
        song.songId,
      );
      const songWithDetail = {
        ...song,
        songUrl: songsRes.data.result.songUrl,
        songLyric: songsRes.data.result.songLyric,
      };

      setCurrentSong(songWithDetail);
      setIsPlaying(true);
      toast.success(`正在播放: ${song.songTitle}`, {
        id: `play-${song.songId}`,
      });
    } catch (error) {
      toast.error(`播放失败: ${song.songTitle}`, { id: `play-${song.songId}` });
      console.error("获取歌曲详情失败:", error);
    }
  };

  // 👇 4. 新增：切换播放/暂停状态
  const togglePlayPause = async (song: Song) => {
    // 如果是当前播放歌曲 → 切换暂停/播放
    if (currentSong?.songId === song.songId) {
      setIsPlaying(!isPlaying);
      toast.success(isPlaying ? "已暂停" : "继续播放", {
        id: `play-${song.songId}`,
      });
      return;
    }
    // 不是当前歌曲 → 执行正常播放逻辑
    await handlePlay(song);
  };

  // 添加到播放队列
  const handleAddToQueue = (song: Song) => {
    addToQueue({ id: song.songId, type: "song", data: song });
    toast.success(`已添加到播放队列: ${song.songTitle}`);
  };

  // 🔥 轮播图/歌单点击：跳转播放页并携带关键词
  const goToPlayPage = (keyword: string) => {
    router.push(`/play-list?keyword=${encodeURIComponent(keyword)}`);
  };

  // 👇 5. 判断当前歌曲是否正在播放
  const isSongPlaying = (song: Song) => {
    return currentSong?.songId === song.songId && isPlaying;
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
          {/* 轮播指示器 */}
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

                      {/* 👇 6. 核心优化：按钮永久显示 + 播放/暂停切换 */}
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
                          {/* 根据状态切换图标 */}
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
                            handleAddToQueue(song);
                          }}
                        >
                          <Heart className="h-4 w-4" />
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
