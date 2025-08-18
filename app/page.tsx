"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  Globe,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      redirect("/dashboard");
    }
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-900"></div>
          <p className="text-slate-600 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="bg-grid"></div>
        <div className="radial-spot primary absolute inset-0 animate-blob"></div>
        <div className="radial-spot secondary absolute inset-0 animate-float"></div>
      </div>

      <div className="relative">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            {/* Logo区域 */}
            <div className="inline-flex items-center mb-6 animate-fade-in">
              <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center mr-4 transform hover:scale-110 transition-transform duration-300 shadow-soft animate-float">
                <svg
                  className="h-6 w-6 text-white"
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
              <span className="text-2xl font-bold text-slate-900">
                Mock Hub
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 animate-fade-in-up">
              企业级API{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">
                Mock平台
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              专业的Mock服务解决方案，让您的开发测试更加高效、可靠、智能
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 animate-fade-in-up delay-300">
              <Button
                asChild
                size="lg"
                className="btn-glow button-click bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <Link href="/login" className="flex items-center">
                  立即开始
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="btn-glow button-click border-slate-300 hover:border-slate-900 transition-colors duration-300 bg-white/60 backdrop-blur"
              >
                <Link href="/register">注册账户</Link>
              </Button>
            </div>

            {/* 特性标签 */}
            <div className="flex flex-wrap gap-2 justify-center animate-fade-in-up delay-400">
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-700 hairline"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                数据分析
              </Badge>
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-700 hairline"
              >
                <Zap className="w-3 h-3 mr-1" />
                团队协作
              </Badge>
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-700 hairline"
              >
                <Shield className="w-3 h-3 mr-1" />
                企业安全
              </Badge>
            </div>
          </div>
        </section>

        {/* 特性卡片区域 */}
        <section className="container mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <Card className="group card-elegant shadow-soft animate-fade-in-up delay-500 transition-all duration-300 ease-out hover:scale-105">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors duration-300 ease-out">
                    <Zap className="w-5 h-5 text-slate-700 transition-colors duration-300 ease-out" />
                  </div>
                  即时创建
                </CardTitle>
                <CardDescription className="text-slate-600">
                  秒级创建Mock服务，支持动态响应数据生成
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      一键创建
                    </span>
                    <span className="text-xs text-slate-400">Mock服务</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      动态数据
                    </span>
                    <span className="text-xs text-slate-400">Faker.js</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      延迟配置
                    </span>
                    <span className="text-xs text-slate-400">自定义</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group card-elegant shadow-soft animate-fade-in-up delay-700 transition-all duration-300 ease-out hover:scale-105">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors duration-300 ease-out">
                    <BarChart3 className="w-5 h-5 text-slate-700 transition-colors duration-300 ease-out" />
                  </div>
                  实时监控
                </CardTitle>
                <CardDescription className="text-slate-600">
                  全面的API调用分析和性能监控
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      QPS监控
                    </span>
                    <span className="text-xs text-slate-400">实时</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      响应时间
                    </span>
                    <span className="text-xs text-slate-400">&lt;100ms</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      错误追踪
                    </span>
                    <span className="text-xs text-slate-400">统计</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group card-elegant shadow-soft animate-fade-in-up delay-900 transition-all duration-300 ease-out hover:scale-105">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors duration-300 ease-out">
                    <Shield className="w-5 h-5 text-slate-700 transition-colors duration-300 ease-out" />
                  </div>
                  安全可靠
                </CardTitle>
                <CardDescription className="text-slate-600">
                  企业级安全保障和权限管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      身份认证
                    </span>
                    <span className="text-xs text-slate-400">NextAuth</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      权限控制
                    </span>
                    <span className="text-xs text-slate-400">RBAC</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      数据保护
                    </span>
                    <span className="text-xs text-slate-400">加密</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 详细功能区域 */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 to-white/90"></div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="bg-grid opacity-40"></div>
          </div>
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                强大功能特性
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                专业的RESTful API Mock服务，满足您的所有测试需求
              </p>
              <div className="divider-fade mx-auto max-w-24 mt-6"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              <div className="relative animate-fade-in-up delay-200">
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-soft hover-glow transition-all duration-300">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    RESTful API
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    完整的RESTful接口支持，GET、POST、PUT、DELETE方法全覆盖
                  </p>
                </div>
              </div>

              <div className="relative animate-fade-in-up delay-300">
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-soft hover-glow transition-all duration-300">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    智能响应
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    动态数据生成、自定义响应延迟、条件响应规则和模板引擎支持
                  </p>
                </div>
              </div>

              <div className="relative animate-fade-in-up delay-400">
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-soft hover-glow transition-all duration-300">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    数据分析
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    实时数据可视化、热门接口排行、调用统计分析和实时通知推送
                  </p>
                </div>
              </div>

              <div className="relative animate-fade-in-up delay-500">
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-soft hover-glow transition-all duration-300">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    企业安全
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    NextAuth认证、角色权限管理、API访问控制和数据安全保护
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 底部区域 */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center animate-fade-in-up">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                开始您的 Mock 之旅
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Mock Hub 为您提供专业的 API Mock
                服务，让开发测试变得更加简单高效。
                <br />
                加入我们，体验新一代 Mock 平台的强大功能。
              </p>
              <div className="divider-fade mx-auto max-w-32 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-2">
                    50+
                  </div>
                  <div className="text-slate-600 text-sm">API接口</div>
                </div>
                <div className="p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-2">
                    &lt;100ms
                  </div>
                  <div className="text-slate-600 text-sm">响应时间</div>
                </div>
                <div className="p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-2">
                    3种
                  </div>
                  <div className="text-slate-600 text-sm">代理模式</div>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="btn-glow button-click bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
              >
                <Link href="/login" className="flex items-center">
                  立即体验
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
