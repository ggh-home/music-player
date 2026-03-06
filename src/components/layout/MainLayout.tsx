"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PlayerBar } from "../player/PlayerBar";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className={cn("flex-1 overflow-auto p-6", className)}>
          {children}
        </main>
        <PlayerBar />
      </div>
    </div>
  );
}
