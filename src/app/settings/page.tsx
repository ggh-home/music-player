"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Volume2, Palette, Globe, Crown, Smartphone } from "lucide-react";
import { useAuthStore, usePlayerStore } from "@/stores";
import { userApi } from "@/services/api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function SettingsPage() {
  const { user, isAuthenticated, quota } = useAuthStore();
  const { volume, playbackRate, quality, setVolume, setPlaybackRate, setQuality } = usePlayerStore();
  
  const [settings, setSettings] = useState({
    notifications: true,
    autoPlay: false,
    downloadWifiOnly: true,
    theme: "system",
    language: "zh-CN",
  });

  const handleUpgrade = async () => {
    try {
      const res = await userApi.upgradeVip();
      // 跳转到微信支付
      window.location.href = res.data.data.payUrl;
    } catch (error) {
      toast.error("获取支付链接失败");
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">请先登录查看设置</p>
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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="account">
              <User className="h-4 w-4 mr-2" />
              账号
            </TabsTrigger>
            <TabsTrigger value="player">
              <Volume2 className="h-4 w-4 mr-2" />
              播放
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              通知
            </TabsTrigger>
            <TabsTrigger value="quota">
              <Crown className="h-4 w-4 mr-2" />
              限额
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
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
                  <Button variant="outline" size="sm">修改</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">会员状态</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.isVip ? (
                        <span className="text-yellow-500 flex items-center gap-1">
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
                      <Crown className="h-4 w-4 mr-2" />
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

          {/* Player Settings */}
          <TabsContent value="player" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>播放设置</CardTitle>
                <CardDescription>自定义播放体验</CardDescription>
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
                    onValueChange={(v) => setQuality(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">标准</SelectItem>
                      <SelectItem value="high">高品质</SelectItem>
                      <SelectItem value="lossless">无损</SelectItem>
                      <SelectItem value="hires">Hi-Res</SelectItem>
                    </SelectContent>
                  </Select>
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

          {/* Notification Settings */}
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

          {/* Quota Settings */}
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
                        <span>{quota.musicPlayCount}/{quota.musicPlayLimit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(quota.musicPlayCount / quota.musicPlayLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>有声书播放</span>
                        <span>{quota.soundPlayCount}/{quota.soundPlayLimit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(quota.soundPlayCount / quota.soundPlayLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>下载次数</span>
                        <span>{quota.downloadCount}/{quota.downloadLimit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(quota.downloadCount / quota.downloadLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>无损音质</span>
                        <span>{quota.losslessCount}/{quota.losslessLimit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(quota.losslessCount / quota.losslessLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>缓存次数</span>
                        <span>{quota.cacheCount}/{quota.cacheLimit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(quota.cacheCount / quota.cacheLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">暂无限额信息</p>
                )}
                {!user?.isVip && (
                  <Button className="w-full" onClick={handleUpgrade}>
                    <Crown className="h-4 w-4 mr-2" />
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
