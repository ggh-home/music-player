import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, UserQuota } from "@/types";
import { userApi } from "@/services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  quota: UserQuota | null;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setQuota: (quota: UserQuota | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  fetchUserInfo: () => Promise<void>;
  fetchQuota: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      quota: null,
      isLoading: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setQuota: (quota) => {
        set({ quota });
      },

      login: (user, token) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, isAuthenticated: false, quota: null });
      },

      fetchUserInfo: async () => {
        try {
          const response = await userApi.getUserInfo();
          const user = response.data.data;
          set({ user });
          localStorage.setItem("user", JSON.stringify(user));
        } catch (error) {
          console.error("获取用户信息失败:", error);
        }
      },

      fetchQuota: async () => {
        try {
          const response = await userApi.getQuota();
          set({ quota: response.data.data });
        } catch (error) {
          console.error("获取限额信息失败:", error);
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
