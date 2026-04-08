"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  Search,
  Library,
  Heart,
  Download,
  Settings,
  Disc,
  Mic2,
  BookOpen,
  Menu,
  X,
  Music2,
} from "lucide-react";

const mainNavItems = [
  { icon: Home, label: "首页", href: "/" },
  { icon: Search, label: "搜索", href: "/search" },
  { icon: Library, label: "音乐库", href: "/library" },
];

const libraryNavItems = [
  { icon: Heart, label: "我喜欢的", href: "/liked" },
  { icon: Disc, label: "歌单", href: "/playlists" },
  { icon: Mic2, label: "歌手", href: "/artists" },
  // { icon: BookOpen, label: "有声书", href: "/audiobooks" },
  { icon: Download, label: "下载管理", href: "/downloads" },
];

const bottomNavItems = [{ icon: Settings, label: "设置", href: "/settings" }];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const allRoutes = [
      ...mainNavItems.map((item) => item.href),
      ...libraryNavItems.map((item) => item.href),
      ...bottomNavItems.map((item) => item.href),
    ];
    allRoutes.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Music2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold gradient-text">Music</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {/* Main Nav */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                菜单
              </p>
            )}
            {mainNavItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && "justify-center px-2",
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  {!collapsed && item.label}
                </Link>
              </Button>
            ))}
          </div>

          {/* Library Nav */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                我的音乐
              </p>
            )}
            {libraryNavItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && "justify-center px-2",
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  {!collapsed && item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Nav */}
      <div className="border-t p-3">
        {bottomNavItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              collapsed && "justify-center px-2",
            )}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              {!collapsed && item.label}
            </Link>
          </Button>
        ))}
      </div>
    </aside>
  );
}
