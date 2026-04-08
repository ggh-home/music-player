"use client";

import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  X,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import { DownloadTask } from "@/types";
import { useDownloadStore, useAuthStore } from "@/stores";
import { formatFileSize } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function DownloadsPage() {
  const { isAuthenticated } = useAuthStore();
  const {
    queue,
    completed,
    dailyLimit,
    usedCount,
    downloadRootHint,
    pauseDownload,
    resumeDownload,
    retryDownload,
    removeDownload,
    clearQueue,
  } = useDownloadStore();

  const handleClearQueue = () => {
    if (confirm("确定要清空下载队列吗？")) {
      clearQueue();
      toast.success("已清空下载队列");
    }
  };

  const getStatusIcon = (status: DownloadTask["status"]) => {
    switch (status) {
      case "downloading":
        return <Download className="h-4 w-4 animate-bounce" />;
      case "paused":
        return <Pause className="h-4 w-4" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: DownloadTask["status"]) => {
    switch (status) {
      case "pending":
        return "等待中";
      case "downloading":
        return "下载中";
      case "paused":
        return "已暂停";
      case "completed":
        return "已完成";
      case "error":
        return "下载失败";
      default:
        return "未知";
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">请先登录查看下载管理</p>
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
          <h1 className="text-2xl font-bold">下载管理</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              今日下载: {usedCount}/{dailyLimit}
            </div>
            {queue.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleClearQueue}>
                <Trash2 className="h-4 w-4 mr-2" />
                清空队列
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          默认下载目录：{downloadRootHint}
        </p>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">
              下载队列 ({queue.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              已完成 ({completed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {queue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                下载队列为空
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {task.cover ? (
                            <Image src={task.cover} alt={task.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Download className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{task.name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent">
                              {task.quality}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusIcon(task.status)}
                            <span className="text-sm text-muted-foreground">
                              {getStatusText(task.status)}
                            </span>
                            {task.totalSize && (
                              <span className="text-sm text-muted-foreground">
                                {formatFileSize(task.downloadedSize || 0)} / {formatFileSize(task.totalSize)}
                              </span>
                            )}
                          </div>
                          <Progress value={task.progress} className="mt-2" />
                          {task.savePath && (
                            <p className="mt-2 text-xs text-muted-foreground truncate">
                              {task.savePath}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {task.status === "downloading" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => pauseDownload(task.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : task.status === "paused" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => resumeDownload(task.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : task.status === "error" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => retryDownload(task.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => removeDownload(task.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {task.error && (
                        <p className="text-sm text-red-500 mt-2">{task.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无已下载内容
              </div>
            ) : (
              <div className="space-y-3">
                {completed.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {task.cover ? (
                            <Image src={task.cover} alt={task.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Check className="h-6 w-6 text-green-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">下载完成</span>
                            {task.totalSize && (
                              <span className="text-sm text-muted-foreground">
                                {formatFileSize(task.totalSize)}
                              </span>
                            )}
                          </div>
                          {task.savePath && (
                            <p className="mt-2 text-xs text-muted-foreground truncate">
                              {task.savePath}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
