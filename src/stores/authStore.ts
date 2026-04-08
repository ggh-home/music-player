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
import { AUTH_EXPIRED_EVENT, userApi } from "@/services/api";
import toast from "react-hot-toast";

type AuthCheckStatus = "authenticated" | "unauthenticated" | "expired";
type AuthPromptType = "none" | "login_required" | "expired";

const clearAuthStorage = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("existUser");
};

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return payload;
  } catch {
    return null;
  }
};

const isJwtTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }
  return payload.exp * 1000 <= Date.now();
};

const isInvalidTokenError = (error: any): boolean => {
  return (
    error?.statusCode === 401 ||
    error?.response?.status === 401 ||
    error?.errCode === "INVALID_TOKEN" ||
    error?.payload?.errCode === "INVALID_TOKEN"
  );
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  quota: UserQuota | null;
  isLoading: boolean;
  authPrompt: AuthPromptType;

  // Actions
  setUser: (user: User | null) => void;
  setQuota: (quota: UserQuota | null) => void;
  checkLoginStatus: () => AuthCheckStatus;
  clearAuthPrompt: () => void;
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
      authPrompt: "none",

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setQuota: (quota) => {
        set({ quota });
      },

      checkLoginStatus: () => {
        if (typeof window === "undefined") {
          return get().isAuthenticated ? "authenticated" : "unauthenticated";
        }

        const token = localStorage.getItem("token");
        const cachedUser = localStorage.getItem("user");

        if (!token) {
          const hadSession = get().isAuthenticated || !!get().user || !!cachedUser;
          clearAuthStorage();
          set({
            user: null,
            isAuthenticated: false,
            quota: null,
            authPrompt: hadSession ? "expired" : "login_required",
          });
          return hadSession ? "expired" : "unauthenticated";
        }

        if (isJwtTokenExpired(token)) {
          clearAuthStorage();
          set({
            user: null,
            isAuthenticated: false,
            quota: null,
            authPrompt: "expired",
          });
          return "expired";
        }

        let nextUser = get().user;
        if (!nextUser && cachedUser) {
          try {
            nextUser = JSON.parse(cachedUser) as User;
          } catch {
            localStorage.removeItem("user");
          }
        }

        set({
          user: nextUser,
          isAuthenticated: true,
          authPrompt: "none",
        });
        return "authenticated";
      },

      clearAuthPrompt: () => {
        set({ authPrompt: "none" });
      },

      login: (user, token) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        set({ user, isAuthenticated: true, authPrompt: "none" });
      },

      logout: async (token: string) => {
        try {
          await userApi.logout(token);
        } catch {
          // 后端登出失败不阻断本地态清理
        }
        clearAuthStorage();
        set({ user: null, isAuthenticated: false, quota: null, authPrompt: "none" });
      },

      fetchUserInfo: async () => {
        try {
          const user = await userApi.getUserInfo();
          set({ user, isAuthenticated: true, authPrompt: "none" });
          localStorage.setItem("user", JSON.stringify(user));
        } catch (error: any) {
          if (isInvalidTokenError(error)) {
            clearAuthStorage();
            set({
              user: null,
              isAuthenticated: false,
              quota: null,
              authPrompt: "expired",
            });
            return;
          }
          console.error("获取用户信息失败:", error);
        }
      },

      fetchQuota: async () => {
        try {
          const quota = await userApi.getQuota();
          set({ quota });
        } catch (error: any) {
          if (isInvalidTokenError(error)) {
            clearAuthStorage();
            set({
              user: null,
              isAuthenticated: false,
              quota: null,
              authPrompt: "expired",
            });
            return;
          }
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

let authExpiredListenerBound = false;

const bindAuthExpiredListener = () => {
  if (typeof window === "undefined" || authExpiredListenerBound) return;
  authExpiredListenerBound = true;

  window.addEventListener(AUTH_EXPIRED_EVENT, (event: Event) => {
    const customEvent = event as CustomEvent<{ message?: string }>;
    const message = customEvent.detail?.message || "登录已过期，请重新登录~";

    clearAuthStorage();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      quota: null,
      authPrompt: "expired",
    });

    toast.error(`${message} 去重新登录`);
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  });
};

bindAuthExpiredListener();
