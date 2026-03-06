"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Heart, Clock, BookOpen, Download, Check } from "lucide-react";
import { Audiobook, AudioEpisode } from "@/types";
import { audiobookApi, searchApi } from "@/services/api";
import { usePlayerStore, useAuthStore } from "@/stores";
import { formatDuration } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AudiobooksPage() {
  const { isAuthenticated } = useAuthStore();
  const { setCurrentEpisode, setIsPlaying } = usePlayerStore();
  
  const [collectedBooks, setCollectedBooks] = useState<Audiobook[]>([]);
  const [cachedEpisodes, setCachedEpisodes] = useState<AudioEpisode[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Audiobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAudiobookData();
  }, []);

  const loadAudiobookData = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        // 加载收藏的有声书
        const collectedRes = await audiobookApi.getCollectedAudiobooks();
        setCollectedBooks(collectedRes.data.data || []);
        
        // 加载缓存的音频
        const cachedRes = await audiobookApi.getCachedAudios();
        setCachedEpisodes(cachedRes.data.data || []);
      }
      
      // 加载推荐有声书
      const recommendedRes = await searchApi.searchAudiobooks("热门");
      setRecommendedBooks(recommendedRes.data.data?.slice(0, 6) || []);
    } catch (error) {
      console.error("加载有声书数据失败", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (episode: AudioEpisode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
    toast.success(`正在播放: ${episode.name}`);
  };

  const handleCollect = async (bookId: string, isCollected: boolean) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    
    try {
      if (isCollected) {
        await audiobookApi.uncollectAudiobook(bookId);
        toast.success("已取消收藏");
      } else {
        await audiobookApi.collectAudiobook(bookId);
        toast.success("已收藏");
      }
      loadAudiobookData();
    } catch (error) {
      toast.error("操作失败");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">有声书</h1>

        <Tabs defaultValue="collected">
          <TabsList>
            <TabsTrigger value="collected">
              <Heart className="h-4 w-4 mr-2" />
              我的收藏
            </TabsTrigger>
            <TabsTrigger value="cached">
              <Download className="h-4 w-4 mr-2" />
              已缓存
            </TabsTrigger>
            <TabsTrigger value="discover">
              <BookOpen className="h-4 w-4 mr-2" />
              发现
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collected" className="space-y-4">
            {!isAuthenticated ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">请先登录查看收藏的有声书</p>
                <Button asChild>
                  <Link href="/login">去登录</Link>
                </Button>
              </div>
            ) : collectedBooks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                还没有收藏有声书
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {collectedBooks.map((book) => (
                  <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square">
                      {book.cover ? (
                        <Image src={book.cover} alt={book.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
                          <BookOpen className="h-10 w-10 text-white" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => handleCollect(book.id, true)}
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium truncate">{book.name}</p>
                      <p className="text-sm text-muted-foreground">{book.episodeCount}集</p>
                      {book.playProgress && book.episodeCount && (
                        <Progress 
                          value={(book.playProgress / book.episodeCount) * 100} 
                          className="mt-2 h-1"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cached" className="space-y-4">
            {!isAuthenticated ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">请先登录查看缓存的音频</p>
                <Button asChild>
                  <Link href="/login">去登录</Link>
                </Button>
              </div>
            ) : cachedEpisodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                还没有缓存音频
              </div>
            ) : (
              <div className="space-y-2">
                {cachedEpisodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{episode.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{episode.albumName}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(episode.duration)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handlePlay(episode)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <h2 className="text-lg font-semibold">热门推荐</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendedBooks.map((book) => (
                <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative aspect-square">
                    {book.cover ? (
                      <Image src={book.cover} alt={book.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
                        <BookOpen className="h-10 w-10 text-white" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => handleCollect(book.id, false)}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium truncate">{book.name}</p>
                    <p className="text-sm text-muted-foreground">{book.episodeCount}集</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
