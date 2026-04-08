"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, Eye, EyeOff } from "lucide-react";
import { userApi } from "@/services/api";
import { useAuthStore } from "@/stores";
import toast from "react-hot-toast";
import { User } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { login, authPrompt, clearAuthPrompt } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginData, setLoginData] = useState({
    userName: "",
    password: "",
  });

  // Register form
  const [registerData, setRegisterData] = useState({
    userName: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    return () => {
      clearAuthPrompt();
    };
  }, [clearAuthPrompt]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.userName || !loginData.password) {
      toast.error("请输入用户名和密码");
      return;
    }

    setIsLoading(true);
    try {
      const user: User = await userApi.login(loginData);
      login(user, user.token || "");
      toast.success("登录成功");
      router.push("/");
    } catch (error: any) {
      toast.error(error?.message || "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.userName || !registerData.password) {
      toast.error("请填写完整信息");
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("两次密码输入不一致");
      return;
    }

    setIsLoading(true);
    try {
      await userApi.register(registerData);
      toast.success("注册成功，请登录");
      // Switch to login tab
      setLoginData({ userName: registerData.userName, password: "" });
    } catch (error: any) {
      toast.error(error?.message || "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-black p-4">
      <div className="w-full max-w-md">
        {authPrompt !== "none" && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {authPrompt === "expired"
              ? "登录状态已过期，请重新登录。"
              : "请先登录后再继续。"}
          </div>
        )}

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Music2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Music Player</span>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle>欢迎回来</CardTitle>
                  <CardDescription>登录您的账号继续享受音乐</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">用户名</Label>
                    <Input
                      id="login-username"
                      placeholder="请输入用户名"
                      value={loginData.userName}
                      onChange={(e) =>
                        setLoginData({ ...loginData, userName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入密码"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "登录中..." : "登录"}
                  </Button>
                  <div className="flex items-center justify-between w-full text-sm">
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground hover:text-primary"
                    >
                      忘记密码?
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardHeader>
                  <CardTitle>创建账号</CardTitle>
                  <CardDescription>
                    注册一个新账号开始您的音乐之旅
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">用户名</Label>
                    <Input
                      id="register-username"
                      placeholder="请输入用户名"
                      value={registerData.userName}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          userName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="请输入密码"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">确认密码</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="请再次输入密码"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "注册中..." : "注册"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          登录即表示您同意我们的
          <Link href="/terms" className="text-primary hover:underline">
            服务条款
          </Link>
          和
          <Link href="/privacy" className="text-primary hover:underline">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  );
}
