"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Disc, Import, ExternalLink } from "lucide-react";
import { Playlist } from "@/types";
import { playlistApi } from "@/services/api";
import { useAuthStore } from "@/stores";
import toast from "react-hot-toast";

export default function PlaylistsPage() {
  const { isAuthenticated } = useAuthStore();
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [collectedPlaylists, setCollectedPlaylists] = useState<Playlist[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importPlatform, setImportPlatform] = useState<"QQ" | "Netease">("QQ");

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated]);

  const loadPlaylists = async () => {
    try {
      const myRes = await playlistApi.getMyPlaylists();
      setMyPlaylists(myRes.data.data || []);
      
      const collectedRes = await playlistApi.getCollectedPlaylists();
      setCollectedPlaylists(collectedRes.data.data || []);
    } catch (error) {
      toast.error("加载歌单失败");
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error("请输入歌单名称");
      return;
    }
    
    try {
      await playlistApi.createPlaylist({ name: newPlaylistName });
      toast.success("创建成功");
      setNewPlaylistName("");
      setIsCreateDialogOpen(false);
      loadPlaylists();
    } catch (error) {
      toast.error("创建失败");
    }
  };

  const handleImportPlaylist = async () => {
    if (!importUrl.trim()) {
      toast.error("请输入歌单链接");
      return;
    }
    
    try {
      await playlistApi.importPlaylist(importPlatform, importUrl);
      toast.success("导入成功");
      setImportUrl("");
      setIsImportDialogOpen(false);
      loadPlaylists();
    } catch (error) {
      toast.error("导入失败");
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">请先登录查看歌单</p>
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">歌单</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Import className="h-4 w-4 mr-2" />
              导入
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建歌单
            </Button>
          </div>
        </div>

        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">我的歌单 ({myPlaylists.length})</TabsTrigger>
            <TabsTrigger value="collected">收藏歌单 ({collectedPlaylists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            {myPlaylists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">还没有创建歌单</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建歌单
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myPlaylists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative aspect-square">
                        {playlist.cover ? (
                          <Image src={playlist.cover} alt={playlist.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                            <Disc className="h-10 w-10 text-white" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">{playlist.songCount}首</p>
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
                          <Image src={playlist.cover} alt={playlist.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Disc className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">by {playlist.creator}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新歌单</DialogTitle>
            <DialogDescription>输入歌单名称创建新歌单</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="歌单名称"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreatePlaylist}>创建</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Playlist Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入歌单</DialogTitle>
            <DialogDescription>从第三方平台导入歌单</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Button
                variant={importPlatform === "QQ" ? "default" : "outline"}
                onClick={() => setImportPlatform("QQ")}
                className="flex-1"
              >
                QQ音乐
              </Button>
              <Button
                variant={importPlatform === "Netease" ? "default" : "outline"}
                onClick={() => setImportPlatform("Netease")}
                className="flex-1"
              >
                网易云音乐
              </Button>
            </div>
            <Input
              placeholder="粘贴歌单链接"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              支持导入QQ音乐和网易云音乐的歌单链接
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleImportPlaylist}>导入</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
