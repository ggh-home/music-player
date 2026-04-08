"use client";

import { useContext } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PlayerBar } from "../player/PlayerBar";
import { LayoutShellContext } from "./LayoutShellContext";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const inShell = useContext(LayoutShellContext);
  const pathname = usePathname();
  const isBarePage = pathname === "/login";

  if (inShell || isBarePage) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <LayoutShellContext.Provider value={true}>
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
    </LayoutShellContext.Provider>
  );
}
