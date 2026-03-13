import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// 歌词行标准格式
export interface LyricLine {
  time: number; // 秒数，如 12.5
  text: string; // 歌词内容
}

interface LyricPanelProps {
  showLyric: boolean;
  setShowLyric: (show: boolean) => void;
  currentTime: number; // 当前播放时间（秒）
  lyricLines: LyricLine[]; // 歌词数组
  songTitle?: string;
  singerName?: string;
}

export function LyricPanel({
  showLyric,
  setShowLyric,
  currentTime,
  lyricLines,
  songTitle,
  singerName,
}: LyricPanelProps) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // 计算当前应该高亮的歌词行
  const currentLineIndex = lyricLines.reduce(
    (lastIndex, line, index, array) => {
      if (line.time <= currentTime) {
        // 下一行还没到，就停在当前行
        const nextLine = array[index + 1];
        if (!nextLine || nextLine.time > currentTime) {
          return index;
        }
      }
      return lastIndex;
    },
    0,
  );

  // 自动滚动到当前歌词
  useEffect(() => {
    if (activeLineRef.current && lyricRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentLineIndex]);

  if (!showLyric) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-card/98 backdrop-blur-md border-t p-6 h-[500px] flex flex-col z-50">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-medium">{songTitle || "未知歌曲"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {singerName || "未知歌手"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setShowLyric(false)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* 滚动歌词区域 */}
      <div
        ref={lyricRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4"
      >
        {lyricLines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            暂无歌词 / 歌词加载中…
          </div>
        ) : (
          <div className="py-10 space-y-4">
            {lyricLines.map((line, index) => {
              const isActive = index === currentLineIndex;
              return (
                <div
                  key={index}
                  ref={isActive ? activeLineRef : null}
                  className={`transition-all duration-300 text-center ${
                    isActive
                      ? "text-primary text-lg font-semibold scale-105"
                      : "text-muted-foreground text-sm opacity-70"
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
