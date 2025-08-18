"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const registerSchema = z
  .object({
    name: z.string().min(1, "请输入姓名"),
    email: z.string().email("请输入有效的邮箱地址"),
    password: z.string().min(6, "密码至少6个字符"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "注册失败");
      } else {
        toast.success("注册成功");
        setIsRedirecting(true);

        // 优雅的延迟跳转
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch {
      toast.error("注册出错，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 注册成功过渡效果 */}
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
                <h2 className="text-3xl font-bold text-slate-900">注册成功</h2>
                <p className="text-slate-600 text-lg">正在跳转到登录页面...</p>
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

      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-sm">
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-slate-900">
                创建账户
              </CardTitle>
              <CardDescription className="text-slate-600">
                输入您的信息创建新账户
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-slate-900"
                  >
                    姓名
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="张三"
                      {...register("name")}
                      className="pl-10 h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                      disabled={loading || isRedirecting}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                      {errors.name.message}
                    </p>
                  )}
                </div>

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
                      type="email"
                      placeholder="name@example.com"
                      {...register("email")}
                      className="pl-10 h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                      disabled={loading || isRedirecting}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-900"
                  >
                    密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="至少6个字符"
                      {...register("password")}
                      className="pl-10 h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                      disabled={loading || isRedirecting}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-slate-900"
                  >
                    确认密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="再次输入密码"
                      {...register("confirmPassword")}
                      className="pl-10 h-11 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                      disabled={loading || isRedirecting}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all duration-200"
                  disabled={loading || isRedirecting}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    <>
                      创建账户
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">或者</span>
                  </div>
                </div>

                <div className="text-center text-sm">
                  <span className="text-slate-600">已有账户？</span>
                  <Link
                    href="/login"
                    className="ml-1 font-medium text-slate-900 hover:text-slate-700 transition-colors"
                  >
                    立即登录
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
