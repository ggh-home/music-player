/*
 * @Author: gouguohua gh0410
 * @Date: 2026-03-05 22:14:38
 * @LastEditors: gouguohua gh0410
 * @LastEditTime: 2026-03-07 15:44:50
 * @FilePath: /music-player/src/stores/authStore.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
  logout: (token: string) => void;
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

      logout: async (token: string) => {
        // await userApi.logout({ token });
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
