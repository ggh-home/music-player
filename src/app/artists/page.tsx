"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mic2, Search, Play } from "lucide-react";
import { Singer } from "@/types";
import { searchApi } from "@/services/api";
import toast from "react-hot-toast";

export default function ArtistsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [followedArtists, setFollowedArtists] = useState<Singer[]>([]);
  const [recommendedArtists, setRecommendedArtists] = useState<Singer[]>([]);
  const [searchResults, setSearchResults] = useState<Singer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // 加载推荐歌手
    loadRecommendedArtists();
  }, []);

  const loadRecommendedArtists = async () => {
    try {
      // 模拟加载推荐歌手
      const mockArtists: Singer[] = [
        { id: "1", name: "周杰伦", platform: "QQ" },
        { id: "2", name: "林俊杰", platform: "QQ" },
        { id: "3", name: "陈奕迅", platform: "QQ" },
        { id: "4", name: "薛之谦", platform: "QQ" },
        { id: "5", name: "邓紫棋", platform: "QQ" },
        { id: "6", name: "李荣浩", platform: "QQ" },
      ];
      setRecommendedArtists(mockArtists);
    } catch (error) {
      console.error("加载推荐歌手失败", error);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    try {
      const res = await searchApi.searchSingers(searchKeyword);
      setSearchResults(res.data.data || []);
    } catch (error) {
      toast.error("搜索失败");
    } finally {
      setIsSearching(false);
    }
  };

  const artistsToShow = searchKeyword.trim()
    ? searchResults
    : followedArtists.length > 0
      ? followedArtists
      : recommendedArtists;

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">歌手</h1>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索歌手..."
              className="pl-10"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? "搜索中..." : "搜索"}
          </Button>
        </div>

        {/* Artists Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {searchKeyword.trim()
              ? "搜索结果"
              : followedArtists.length > 0
                ? "关注的歌手"
                : "推荐歌手"}
          </h2>
          {artistsToShow.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchKeyword.trim() ? "未找到相关歌手" : "还没有关注的歌手"}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {artistsToShow.map((artist) => (
                <Link key={artist.singerId} href={`/artist/${artist.singerId}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative aspect-square">
                      {artist.avatar ? (
                        <Image
                          src={artist.avatar}
                          alt={artist.singerName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                          <span className="text-4xl font-bold text-white">
                            {artist.singerName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 text-center">
                      <p className="font-medium truncate">
                        {artist.singerName}
                      </p>
                      {artist.songCount && (
                        <p className="text-sm text-muted-foreground">
                          {artist.songCount}首歌曲
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Hot Artists */}
        {!searchKeyword.trim() && (
          <div>
            <h2 className="text-lg font-semibold mb-4">热门歌手</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "周杰伦",
                "林俊杰",
                "陈奕迅",
                "薛之谦",
                "邓紫棋",
                "李荣浩",
                "毛不易",
                "张学友",
                "刘德华",
                "王菲",
              ].map((name) => (
                <Button
                  key={name}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchKeyword(name);
                    handleSearch();
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
