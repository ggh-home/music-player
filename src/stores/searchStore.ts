import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SearchHistory } from "@/types";

interface SearchState {
  // 搜索历史
  history: SearchHistory[];
  
  // 当前搜索
  currentKeyword: string;
  currentType: "song" | "singer" | "playlist" | "audiobook";
  
  // Actions
  addHistory: (keyword: string, type: "song" | "singer" | "playlist" | "audiobook") => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  setCurrentKeyword: (keyword: string) => void;
  setCurrentType: (type: "song" | "singer" | "playlist" | "audiobook") => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      history: [],
      currentKeyword: "",
      currentType: "song",

      addHistory: (keyword, type) => {
        if (!keyword.trim()) return;
        
        const history = get().history.filter((h) => h.keyword !== keyword);
        const newItem: SearchHistory = {
          id: Math.random().toString(36).substring(2, 15),
          keyword: keyword.trim(),
          type,
          searchTime: new Date().toISOString(),
        };
        set({ history: [newItem, ...history].slice(0, 50) });
      },

      removeHistory: (id) => {
        const history = get().history.filter((h) => h.id !== id);
        set({ history });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      setCurrentKeyword: (keyword) => {
        set({ currentKeyword: keyword });
      },

      setCurrentType: (type) => {
        set({ currentType: type });
      },
    }),
    {
      name: "search-storage",
      partialize: (state) => ({ history: state.history }),
    }
  )
);
