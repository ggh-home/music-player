"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Crown, Music, Heart, Disc, Edit2, Camera } from "lucide-react";
import { useAuthStore } from "@/stores";
import { userApi } from "@/services/api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isAuthenticated, quota } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(user?.userName || "");

  useEffect(() => {
    if (user) {
      setUserName(user.userName);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      // await userApi.updateProfile({ userName });
      toast.success("保存成功");
      setIsEditing(false);
    } catch (error) {
      toast.error("保存失败");
    }
  };

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
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">请先登录查看个人中心</p>
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
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar} alt={user?.userName} />
                  <AvatarFallback className="text-2xl">{user?.userName?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-48"
                      />
                      <Button size="sm" onClick={handleSave}>保存</Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold">{user?.userName}</h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {user?.isVip ? (
                    <span className="flex items-center gap-1 text-sm text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">
                      <Crown className="h-4 w-4" />
                      VIP会员
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleUpgrade}>
                      <Crown className="h-4 w-4 mr-2" />
                      升级会员
                    </Button>
                  )}
                </div>
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">关注</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">粉丝</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">获赞</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Music className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quota?.musicPlayCount || 0}</p>
                <p className="text-sm text-muted-foreground">音乐播放</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">喜欢的歌曲</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Disc className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">创建歌单</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* More Info */}
        <Tabs defaultValue="about">
          <TabsList>
            <TabsTrigger value="about">关于</TabsTrigger>
            <TabsTrigger value="activity">动态</TabsTrigger>
          </TabsList>
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>个人简介</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">暂无简介</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>最近动态</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">暂无动态</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
