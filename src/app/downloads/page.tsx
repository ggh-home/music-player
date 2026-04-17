"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Check,
  Download,
  FolderOpen,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFileSize } from "@/lib/utils";
import { detectClientOs } from "@/lib/download";
import { useAuthStore, useDownloadStore } from "@/stores";
import { DownloadTask } from "@/types";

const osLabels: Record<ReturnType<typeof detectClientOs>, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  unknown: "未知系统",
};

export default function DownloadsPage() {
  const { isAuthenticated } = useAuthStore();
  const {
    queue,
    completed,
    dailyLimit,
    usedCount,
    downloadRootHint,
    downloadDirectoryMode,
    selectedDirectoryName,
    hasDirectoryPermission,
    directoryAccessSupported,
    downloadQueueTaskStatus,
    initializeDownloadManager,
    refreshDownloadCapability,
    selectDownloadDirectory,
    pauseDownload,
    resumeDownload,
    retryDownload,
    retryAllFailed,
    removeDownload,
    clearQueue,
  } = useDownloadStore();

  const failedCount = queue.filter((task) => task.status === "error").length;

  useEffect(() => {
    void initializeDownloadManager();
  }, [initializeDownloadManager]);

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

  const clientOs = detectClientOs();
  const modeLabel =
    downloadDirectoryMode === "directory-access" && hasDirectoryPermission
      ? "目录写入"
      : "浏览器下载";

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center">
          <p className="mb-4 text-muted-foreground">请先登录查看下载管理</p>
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
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">下载管理</h1>
            <p className="text-sm text-muted-foreground">
              当前队列状态：{downloadQueueTaskStatus}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              今日下载: {usedCount}/{dailyLimit}
            </div>
            {failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => retryAllFailed()}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重试失败项 ({failedCount})
              </Button>
            )}
            {queue.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleClearQueue}>
                <Trash2 className="mr-2 h-4 w-4" />
                清空队列
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" />
              下载设置
            </CardTitle>
            <CardDescription>
              目录授权可用时会优先写入你选择的目录，否则回退到浏览器默认下载。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">当前系统</p>
                <p className="mt-1 font-medium">{osLabels[clientOs]}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">下载模式</p>
                <p className="mt-1 font-medium">{modeLabel}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">目录权限</p>
                <p className="mt-1 font-medium">
                  {hasDirectoryPermission ? "已授权" : "未授权"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                {selectedDirectoryName ? "当前目录" : "默认目录提示"}
              </p>
              <p className="mt-1 break-all text-sm font-medium">{downloadRootHint}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {directoryAccessSupported
                  ? hasDirectoryPermission
                    ? "后续下载会优先写入当前授权目录。"
                    : "浏览器支持目录授权，但当前还没有可写目录，下载时会先走浏览器默认下载。"
                  : "当前浏览器不支持站点内目录写入，实际保存位置由浏览器决定。"}
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
                <Link href="/settings">打开设置</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">下载队列 ({queue.length})</TabsTrigger>
            <TabsTrigger value="completed">已完成 ({completed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {queue.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">下载队列为空</div>
            ) : (
              <div className="space-y-3">
                {queue.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {task.cover ? (
                            <Image src={task.cover} alt={task.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Download className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{task.name}</p>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                              {task.quality}
                            </span>
                            {task.saveMode && (
                              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                {task.saveMode === "directory-access" ? "目录写入" : "浏览器下载"}
                              </span>
                            )}
                          </div>
                          {task.singerName && (
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {task.singerName}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2">
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
                            <p className="mt-2 truncate text-xs text-muted-foreground">
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
                      {task.error && <p className="mt-2 text-sm text-red-500">{task.error}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completed.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">暂无已下载内容</div>
            ) : (
              <div className="space-y-3">
                {completed.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {task.cover ? (
                            <Image src={task.cover} alt={task.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Check className="h-6 w-6 text-green-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{task.name}</p>
                            {task.saveMode && (
                              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                {task.saveMode === "directory-access" ? "目录写入" : "浏览器下载"}
                              </span>
                            )}
                          </div>
                          {task.singerName && (
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {task.singerName}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">下载完成</span>
                            {task.totalSize && (
                              <span className="text-sm text-muted-foreground">
                                {formatFileSize(task.totalSize)}
                              </span>
                            )}
                          </div>
                          {task.savePath && (
                            <p className="mt-2 truncate text-xs text-muted-foreground">
                              {task.savePath}
                            </p>
                          )}
                        </div>
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
