"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  // 检查 URL 参数中的错误类型
  useEffect(() => {
    const errorType = searchParams.get("error");
    if (errorType === "banned") {
      setError("您的账户已被封禁，请联系管理员");
      toast.error("账户已被封禁");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // 根据不同的错误类型显示不同的提示
        if (result.error === "CredentialsSignin") {
          setError("邮箱或密码不正确");
          toast.error("登录失败，请检查邮箱和密码");
        } else {
          setError("登录失败，请稍后重试");
          toast.error("登录失败");
        }
      } else if (result?.ok) {
        setIsRedirecting(true);
        toast.success("登录成功");

        // 优雅的延迟跳转
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 2000);
      }
    } catch {
      setError("登录失败，请稍后重试");
      toast.error("登录出错，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 优雅的全屏过渡效果 - 统一的浅色风格 */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-white via-slate-50 to-slate-100">
          {/* 装饰背景 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-slate-200/30 blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-300/20 blur-3xl animate-pulse"></div>
            {/* 优雅的网格背景 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.15]"></div>
          </div>

          <div className="relative h-full flex items-center justify-center">
            <div className="text-center space-y-8 animate-fade-in-scale">
              {/* Logo 动画 */}
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-2xl">
                  <div className="h-24 w-24 bg-slate-900/10 rounded-full animate-pulse"></div>
                </div>
                <div className="relative h-20 w-20 mx-auto">
                  <div className="absolute inset-0 rounded-2xl bg-slate-900/5 animate-pulse"></div>
                  <div className="relative h-full w-full rounded-2xl bg-slate-900 shadow-2xl flex items-center justify-center transform transition-transform hover:scale-105">
                    <svg
                      className="h-10 w-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 文字提示 */}
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-slate-900">欢迎回来</h2>
                <p className="text-slate-600 text-lg">
                  正在为您准备工作空间...
                </p>
              </div>

              {/* 加载进度条 */}
              <div className="w-64 mx-auto">
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-slate-600 to-slate-900 rounded-full animate-[slide_2s_ease-in-out]"></div>
                </div>
              </div>

              {/* 加载点动画 */}
              <div className="flex justify-center space-x-2">
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse delay-200"></div>
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse delay-400"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 简洁的几何装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-slate-200/50"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-300/30"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.03]"></div>
      </div>

      <div className="relative min-h-screen flex">
        {/* 左侧品牌区域 */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 xl:px-16">
          <div className="mx-auto max-w-sm">
            <div className="mb-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white mb-6">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Mock Hub
              </h1>
              <p className="mt-2 text-lg text-slate-600">
                企业级API Mock测试平台
              </p>
            </div>

            <blockquote className="border-l-4 border-slate-900 pl-4">
              <p className="text-slate-700 font-medium">
                &quot;简化API开发流程，提升团队协作效率，让Mock测试变得优雅而高效。&quot;
              </p>
            </blockquote>
          </div>
        </div>

        {/* 右侧登录区域 */}
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-sm">
            {/* 移动端Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white mb-4">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Mock Hub
              </h1>
            </div>

            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-slate-900">
                  欢迎回来
                </CardTitle>
                <CardDescription className="text-slate-600">
                  请输入您的账户信息以继续
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-900"
                    >
                      邮箱地址
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="pl-10 h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                        disabled={isLoading || isRedirecting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-slate-900"
                      >
                        密码
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        忘记密码？
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="输入您的密码"
                        className="pl-10 h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                        disabled={isLoading || isRedirecting}
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      className={`p-3 text-sm rounded-md border ${
                        error.includes("封禁")
                          ? "text-orange-600 bg-orange-50 border-orange-200"
                          : "text-red-600 bg-red-50 border-red-200"
                      }`}
                    >
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all duration-200"
                    disabled={isLoading || isRedirecting}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        登录
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-slate-600">还没有账户？</span>
                  <Link
                    href="/register"
                    className="ml-1 font-medium text-slate-900 hover:text-slate-700 transition-colors"
                  >
                    立即注册
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
