"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Disc3,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Playlist, Song } from "@/types";
import { playlistApi, searchApi } from "@/services/api";
import { useAuthStore } from "@/stores";
import toast from "react-hot-toast";

type PlaylistSource = "my" | "search" | "collected";
type PlaylistPlatform = Song["platform"] | "local";

type PlaylistCardItem = {
  id: string;
  name: string;
  cover: string;
  creator: string;
  songCount: number;
  platform: PlaylistPlatform;
  source: PlaylistSource;
  raw: Playlist;
};

const isMusicPlatform = (value: unknown): value is Song["platform"] => {
  return value === "QQ" || value === "WYY" || value === "XMLY";
};

const resolvePlaylistId = (playlist: Partial<Playlist>): string => {
  if (playlist.playListId !== undefined && playlist.playListId !== null) {
    return String(playlist.playListId);
  }
  if (playlist.id !== undefined && playlist.id !== null) {
    return String(playlist.id);
  }
  return "";
};

const resolvePlaylistName = (playlist: Partial<Playlist>): string => {
  return playlist.playListName || playlist.name || "未命名歌单";
};

const resolvePlaylistCover = (playlist: Partial<Playlist>): string => {
  return playlist.playListImg || playlist.cover || "";
};

const resolvePlaylistSongCount = (playlist: Partial<Playlist>): number => {
  if (typeof playlist.countOfSong === "number") return playlist.countOfSong;
  if (typeof playlist.songCount === "number") return playlist.songCount;
  if (Array.isArray(playlist.songs)) return playlist.songs.length;
  return 0;
};

const resolvePlaylistCreator = (playlist: Partial<Playlist>, fallback: string): string => {
  return playlist.creator || fallback;
};

const toPlaylistCardItem = (
  playlist: Partial<Playlist>,
  source: PlaylistSource,
  fallbackCreator: string,
  forcedPlatform?: PlaylistPlatform,
): PlaylistCardItem | null => {
  const id = resolvePlaylistId(playlist);
  if (!id) return null;

  const platform =
    forcedPlatform ||
    (isMusicPlatform(playlist.platform) ? playlist.platform : "local");

  return {
    id,
    name: resolvePlaylistName(playlist),
    cover: resolvePlaylistCover(playlist),
    creator: resolvePlaylistCreator(playlist, fallbackCreator),
    songCount: resolvePlaylistSongCount(playlist),
    platform,
    source,
    raw: playlist as Playlist,
  };
};

export default function PlaylistsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [keyword, setKeyword] = useState("");
  const [myPlaylists, setMyPlaylists] = useState<PlaylistCardItem[]>([]);
  const [searchResults, setSearchResults] = useState<PlaylistCardItem[]>([]);

  const [isLoadingMine, setIsLoadingMine] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fallbackCreator = user?.userName || "我";
  const isSearchingMode = keyword.trim().length > 0;

  const displayPlaylists = useMemo(() => {
    return isSearchingMode ? searchResults : myPlaylists;
  }, [isSearchingMode, searchResults, myPlaylists]);

  const loadMyPlaylists = async () => {
    setIsLoadingMine(true);
    try {
      const list = await playlistApi.getMyPlaylistsWithFallback(["CUSTOM", "all", "my"]);
      const normalized = list
        .map((item) => toPlaylistCardItem(item, "my", fallbackCreator, "local"))
        .filter((item): item is PlaylistCardItem => item !== null);
      setMyPlaylists(normalized);
    } catch (error) {
      console.error("加载我的歌单失败:", error);
      setMyPlaylists([]);
      toast.error("加载我的歌单失败");
    } finally {
      setIsLoadingMine(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingMine(false);
      setMyPlaylists([]);
      return;
    }
    void loadMyPlaylists();
  }, [isAuthenticated, fallbackCreator]);

  const handleSearch = async (searchWord?: string) => {
    const nextKeyword = (searchWord ?? keyword).trim();
    if (!nextKeyword) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const list = await searchApi.searchPlaylists(nextKeyword);
      const normalized = list
        .map((item) =>
          toPlaylistCardItem(
            item,
            "search",
            resolvePlaylistCreator(item, "未知创建者"),
            isMusicPlatform(item.platform) ? item.platform : undefined,
          ),
        )
        .filter((item): item is PlaylistCardItem => item !== null);
      setSearchResults(normalized);
    } catch (error) {
      console.error("搜索歌单失败:", error);
      setSearchResults([]);
      toast.error("搜索歌单失败");
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenPlaylist = (playlist: PlaylistCardItem) => {
    const query = new URLSearchParams();
    query.set("source", playlist.source);
    query.set("name", playlist.name);
    query.set("creator", playlist.creator);
    query.set("songCount", String(playlist.songCount));
    if (playlist.cover) query.set("cover", playlist.cover);
    if (playlist.platform !== "local") {
      query.set("platform", playlist.platform);
    }

    router.push(`/playlist/${encodeURIComponent(playlist.id)}?${query.toString()}`);
  };

  const handleDeletePlaylist = async (playlist: PlaylistCardItem) => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }
    if (playlist.source !== "my") {
      toast.error("仅支持删除我的歌单");
      return;
    }

    const confirmed = window.confirm(`确认删除歌单“${playlist.name}”吗？`);
    if (!confirmed) return;

    try {
      await playlistApi.deletePlaylist(playlist.id);
      setMyPlaylists((prev) => prev.filter((item) => item.id !== playlist.id));
      setSearchResults((prev) => prev.filter((item) => item.id !== playlist.id));
      toast.success("歌单已删除");
    } catch (error) {
      console.error("删除歌单失败:", error);
      toast.error("删除歌单失败");
    }
  };

  const handleCreatePlaylist = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      return;
    }

    const name = newPlaylistName.trim();
    if (!name) {
      toast.error("请输入歌单名称");
      return;
    }

    setIsCreating(true);
    try {
      await playlistApi.createPlaylist({
        playListName: name,
      });
      toast.success("歌单创建成功");
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setIsCreateDialogOpen(false);
      await loadMyPlaylists();
    } catch (error) {
      console.error("创建歌单失败:", error);
      toast.error("创建歌单失败");
    } finally {
      setIsCreating(false);
    }
  };

  const clearSearch = () => {
    setKeyword("");
    setSearchResults([]);
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        <section className="rounded-2xl border bg-card p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">歌单中心</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSearchingMode
                  ? `搜索结果：${searchResults.length} 个歌单`
                  : `我的歌单：${myPlaylists.length} 个`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void loadMyPlaylists()}
                disabled={isLoadingMine || !isAuthenticated}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={!isAuthenticated}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加歌单
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="搜索歌单名称、创建者..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSearch();
                  }
                }}
              />
            </div>
            <Button onClick={() => void handleSearch()} disabled={isSearching}>
              {isSearching ? "搜索中..." : "搜索歌单"}
            </Button>
            <Button variant="ghost" onClick={clearSearch} disabled={!keyword.trim()}>
              清空
            </Button>
          </div>
        </section>

        {!isAuthenticated && !isSearchingMode ? (
          <section className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">登录后可创建和管理你的歌单</p>
            <Button className="mt-4" asChild>
              <Link href="/login">去登录</Link>
            </Button>
          </section>
        ) : isLoadingMine && !isSearchingMode ? (
          <section className="flex h-[35vh] items-center justify-center text-muted-foreground">
            加载歌单中...
          </section>
        ) : isSearching && isSearchingMode ? (
          <section className="flex h-[35vh] items-center justify-center text-muted-foreground">
            正在搜索歌单...
          </section>
        ) : displayPlaylists.length === 0 ? (
          <section className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              {isSearchingMode ? "没有找到匹配的歌单" : "暂无歌单，先创建一个吧"}
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayPlaylists.map((playlist) => (
              <Card
                key={`${playlist.source}-${playlist.id}`}
                className="group overflow-hidden border hover:border-primary/40"
              >
                <button
                  type="button"
                  className="relative block aspect-square w-full overflow-hidden bg-muted"
                  onClick={() => handleOpenPlaylist(playlist)}
                >
                  {playlist.cover ? (
                    <Image
                      src={playlist.cover}
                      alt={playlist.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700">
                      <Disc3 className="h-12 w-12 text-white" />
                    </div>
                  )}
                </button>

                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="line-clamp-1 font-semibold">{playlist.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      创建者：{playlist.creator} · {playlist.songCount} 首
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleOpenPlaylist(playlist)}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      打开
                    </Button>
                    {playlist.source === "my" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeletePlaylist(playlist)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加歌单</DialogTitle>
            <DialogDescription>
              创建一个新歌单，稍后可在歌单详情页中添加歌曲。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="歌单名称"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              maxLength={40}
            />
            <Input
              placeholder="歌单描述（可选）"
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              maxLength={120}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button onClick={() => void handleCreatePlaylist()} disabled={isCreating}>
              {isCreating ? "创建中..." : "创建歌单"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
