"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Bell, Crown, Download, FolderOpen, RefreshCw, User, Volume2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore, useDownloadStore, usePlayerStore } from "@/stores";
import { userApi } from "@/services/api";

const getQuotaWidth = (count: number, limit: number) => {
  if (!limit) return "0%";
  return `${Math.min(100, (count / limit) * 100)}%`;
};

export default function SettingsPage() {
  const { user, isAuthenticated, quota } = useAuthStore();
  const { volume, playbackRate, quality, setVolume, setPlaybackRate, setQuality } = usePlayerStore();
  const {
    downloadCover,
    downloadLyric,
    downloadRootHint,
    downloadDirectoryMode,
    hasDirectoryPermission,
    directoryAccessSupported,
    initializeDownloadManager,
    selectDownloadDirectory,
    refreshDownloadCapability,
    setDownloadCover,
    setDownloadLyric,
  } = useDownloadStore();

  const [settings, setSettings] = useState({
    notifications: true,
    autoPlay: false,
    downloadWifiOnly: true,
    theme: "system",
    language: "zh-CN",
  });

  useEffect(() => {
    void initializeDownloadManager();
  }, [initializeDownloadManager]);

  const handleUpgrade = async () => {
    try {
      const weiXin = user?.weiXin;
      if (!weiXin) {
        toast.error("当前账号未绑定微信号，无法升级");
        return;
      }
      await userApi.upgradeVip(weiXin);
      toast.success("会员信息已刷新");
    } catch (error) {
      toast.error((error as Error)?.message || "升级会员失败");
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center">
          <p className="mb-4 text-muted-foreground">请先登录查看设置</p>
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
        <h1 className="text-2xl font-bold">设置</h1>

        <Tabs defaultValue="account">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="account">
              <User className="mr-2 h-4 w-4" />
              账号
            </TabsTrigger>
            <TabsTrigger value="player">
              <Volume2 className="mr-2 h-4 w-4" />
              播放
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              通知
            </TabsTrigger>
            <TabsTrigger value="download">
              <Download className="mr-2 h-4 w-4" />
              下载
            </TabsTrigger>
            <TabsTrigger value="quota">
              <Crown className="mr-2 h-4 w-4" />
              限额
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>账号信息</CardTitle>
                <CardDescription>管理您的账号信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">用户名</p>
                    <p className="text-sm text-muted-foreground">{user?.userName}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    修改
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">会员状态</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.isVip ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Crown className="h-4 w-4" />
                          VIP会员
                        </span>
                      ) : (
                        "普通用户"
                      )}
                    </p>
                  </div>
                  {!user?.isVip && (
                    <Button size="sm" onClick={handleUpgrade}>
                      <Crown className="mr-2 h-4 w-4" />
                      升级会员
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>外观</CardTitle>
                <CardDescription>自定义应用外观</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>主题</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => setSettings({ ...settings, theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">浅色</SelectItem>
                      <SelectItem value="dark">深色</SelectItem>
                      <SelectItem value="system">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>语言</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => setSettings({ ...settings, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="zh-TW">繁體中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="player" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>播放设置</CardTitle>
                <CardDescription>自定义播放与下载默认音质</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>默认音量</Label>
                    <span className="text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[volume * 100]}
                    onValueChange={(v) => setVolume(v[0] / 100)}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>播放速度</Label>
                  <Select
                    value={playbackRate.toString()}
                    onValueChange={(value) => setPlaybackRate(parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>默认音质</Label>
                  <Select
                    value={quality}
                    onValueChange={(value) =>
                      setQuality(value as "320" | "flac" | "atmos_51" | "exhigh" | "lossless" | "sky")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="320">标准 (320)</SelectItem>
                      <SelectItem value="exhigh">高品质 (exhigh)</SelectItem>
                      <SelectItem value="lossless">无损 (lossless)</SelectItem>
                      <SelectItem value="flac">FLAC</SelectItem>
                      <SelectItem value="atmos_51">杜比全景声</SelectItem>
                      <SelectItem value="sky">沉浸音质 (sky)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    下载会沿用这里的默认音质，并在需要时自动降级。
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动播放</Label>
                    <p className="text-sm text-muted-foreground">打开应用时自动开始播放</p>
                  </div>
                  <Switch
                    checked={settings.autoPlay}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoPlay: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>管理通知偏好</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用通知</Label>
                    <p className="text-sm text-muted-foreground">接收新歌曲和歌单推荐</p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="download" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>下载目录</CardTitle>
                <CardDescription>用户可自行选择保存位置，不支持目录授权时会回退到浏览器下载。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">当前模式</p>
                    <p className="mt-1 font-medium">
                      {downloadDirectoryMode === "directory-access" && hasDirectoryPermission
                        ? "目录写入"
                        : "浏览器下载"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">目录能力</p>
                    <p className="mt-1 font-medium">
                      {directoryAccessSupported ? "支持目录授权" : "仅支持浏览器下载"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">权限状态</p>
                    <p className="mt-1 font-medium">
                      {hasDirectoryPermission ? "已授权" : "未授权"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">当前保存路径提示</p>
                  <p className="mt-1 break-all text-sm font-medium">{downloadRootHint}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {directoryAccessSupported
                      ? hasDirectoryPermission
                        ? "已授权目录的浏览器会优先写入该目录。"
                        : "浏览器支持目录授权，但当前尚未授予可写目录。"
                      : "当前浏览器无法由站点直接控制保存路径，最终位置由浏览器或用户决定。"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void selectDownloadDirectory()}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {hasDirectoryPermission ? "重新选择目录" : "选择下载目录"}
                  </Button>
                  <Button variant="outline" onClick={() => void refreshDownloadCapability()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    刷新状态
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/downloads">打开下载管理</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>下载内容</CardTitle>
                <CardDescription>控制下载时是否附带封面和歌词。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>下载封面</Label>
                    <p className="text-sm text-muted-foreground">音乐下载成功后额外保存封面图片</p>
                  </div>
                  <Switch checked={downloadCover} onCheckedChange={setDownloadCover} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>下载歌词</Label>
                    <p className="text-sm text-muted-foreground">音乐或有声资源下载时额外保存歌词文件</p>
                  </div>
                  <Switch checked={downloadLyric} onCheckedChange={setDownloadLyric} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quota" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>使用限额</CardTitle>
                <CardDescription>查看您的每日使用限额</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quota ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>音乐播放</span>
                        <span>
                          {quota.musicPlayCount}/{quota.musicPlayLimit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: getQuotaWidth(quota.musicPlayCount, quota.musicPlayLimit) }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>有声书播放</span>
                        <span>
                          {quota.soundPlayCount}/{quota.soundPlayLimit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: getQuotaWidth(quota.soundPlayCount, quota.soundPlayLimit) }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>下载次数</span>
                        <span>
                          {quota.downloadCount}/{quota.downloadLimit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: getQuotaWidth(quota.downloadCount, quota.downloadLimit) }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>无损音质</span>
                        <span>
                          {quota.losslessCount}/{quota.losslessLimit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: getQuotaWidth(quota.losslessCount, quota.losslessLimit) }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>缓存次数</span>
                        <span>
                          {quota.cacheCount}/{quota.cacheLimit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: getQuotaWidth(quota.cacheCount, quota.cacheLimit) }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">暂无限额信息</p>
                )}
                {!user?.isVip && (
                  <Button className="w-full" onClick={handleUpgrade}>
                    <Crown className="mr-2 h-4 w-4" />
                    升级会员解锁更多限额
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
