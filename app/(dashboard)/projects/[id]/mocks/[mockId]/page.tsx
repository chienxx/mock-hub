"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { config } from "@/lib/config";
import {
  ArrowLeft,
  Save,
  Trash2,
  Play,
  Pause,
  Copy,
  CheckCircle,
  Settings,
  FileJson,
  Shield,
  Edit,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  updateMockAPISchema,
  type UpdateMockAPIInput,
} from "@/lib/validations/mock";
import { HTTPMethod, ProxyMode, ProjectRole } from "@prisma/client";
import type { MockAPI, ApiResponse, Collection } from "@/types/mock";
import { JSONEditor } from "@/components/editors/json-editor";
import { RuleList } from "@/components/rules/rule-list";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string; mockId: string }>;
}

export default function MockAPIEditPage({ params }: PageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [mockId, setMockId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mockAPI, setMockAPI] = useState<MockAPI | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UpdateMockAPIInput>({
    resolver: zodResolver(updateMockAPISchema),
  });

  const proxyMode = watch("proxyMode");
  const useFakerJs = watch("useFakerJs");

  useEffect(() => {
    const loadData = async () => {
      const { id, mockId: mid } = await params;
      setProjectId(id);
      setMockId(mid);

      try {
        setLoading(true);

        // 并行加载 Mock API 和分组列表
        const [mockResponse, collectionsResponse] = await Promise.all([
          fetch(`/api/projects/${id}/mocks/${mid}`),
          fetch(`/api/projects/${id}/collections`),
        ]);

        const mockResult: ApiResponse<MockAPI> = await mockResponse.json();
        const collectionsResult: ApiResponse<Collection[]> =
          await collectionsResponse.json();

        if (!mockResponse.ok) {
          throw new Error(mockResult.message || "获取 Mock API 信息失败");
        }

        if (!mockResult.data) {
          throw new Error("获取 Mock API 信息失败：无效的响应数据");
        }

        setMockAPI(mockResult.data);
        setCollections(collectionsResult.data || []);

        // 检查权限
        const projectResponse = await fetch(`/api/projects/${id}`);
        const projectResult = await projectResponse.json();
        const userRole = projectResult.data?.userRole;
        setCanManage(
          userRole === "ADMIN" ||
            userRole === ProjectRole.MANAGER ||
            userRole === ProjectRole.DEVELOPER,
        );

        // 设置表单默认值
        reset({
          name: mockResult.data.name || "",
          description: mockResult.data.description || "",
          enabled: mockResult.data.enabled,
          collectionId: mockResult.data.collectionId,
          proxyMode: mockResult.data.proxyMode,
          useFakerJs: mockResult.data.useFakerJs,
          responseDelay: mockResult.data.responseDelay,
          responseStatus: mockResult.data.responseStatus,
          responseHeaders: mockResult.data.responseHeaders || {},
          responseBody: mockResult.data.responseBody || {},
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "获取 Mock API 信息失败",
        );
        router.push(`/projects/${id}/mocks`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params, reset, router]);

  const onSubmit = async (data: UpdateMockAPIInput) => {
    try {
      setSaving(true);

      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "更新 Mock API 失败");
      }

      if (!result.data) {
        throw new Error("更新 Mock API 失败：无效的响应数据");
      }

      toast.success("Mock API 更新成功");
      setMockAPI(result.data);
      reset(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新 Mock API 失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `确定要删除 Mock API "${mockAPI?.name || mockAPI?.path}" 吗？此操作不可恢复。`,
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除 Mock API 失败");
      }

      toast.success("Mock API 删除成功");
      router.push(`/projects/${projectId}/mocks`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "删除 Mock API 失败",
      );
    } finally {
      setDeleting(false);
    }
  };

  const copyMockUrl = async () => {
    try {
      const project = await fetch(`/api/projects/${projectId}`).then((r) =>
        r.json(),
      );
      const mockUrl = config.getMockApiUrl(
        project.data?.shortId || "",
        mockAPI?.path || "",
      );

      // 使用改进的复制逻辑，兼容 HTTP 环境
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mockUrl);
      } else {
        // 降级方案：使用 execCommand
        const textArea = document.createElement("textarea");
        textArea.value = mockUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999);

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("复制失败");
        }
      }

      setCopied(true);
      toast.success("Mock URL 已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-96 animate-pulse bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (!mockAPI) {
    return null;
  }

  const getMethodBadge = (method: HTTPMethod) => {
    const config = {
      GET: {
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      },
      POST: {
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      },
      PUT: {
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      },
      DELETE: {
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800",
      },
      PATCH: {
        className:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      },
      HEAD: {
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800",
      },
      OPTIONS: {
        className:
          "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800",
      },
    } as const;

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
          config[method]?.className || config.GET.className,
        )}
      >
        {method}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/mocks`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
              <Edit className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  编辑 Mock API
                </h1>
                {getMethodBadge(mockAPI.method)}
                <code className="text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300">
                  {mockAPI.path}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyMockUrl}
                  className={cn("h-7 px-2", copied && "text-emerald-600")}
                >
                  {copied ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {mockAPI.name || "未命名接口"}
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const newState = !mockAPI.enabled;
                setValue("enabled", newState);
                // 直接调用onSubmit，避免handleSubmit的事件处理问题
                const formData = {
                  ...watch(),
                  enabled: newState,
                };
                await onSubmit(formData as UpdateMockAPIInput);
              }}
              className={cn(
                "border-slate-200 dark:border-slate-700",
                mockAPI.enabled
                  ? "bg-white dark:bg-slate-900"
                  : "bg-slate-50 dark:bg-slate-800",
              )}
            >
              {mockAPI.enabled ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  禁用
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  启用
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleting}
              className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "删除中..." : "删除"}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger
            value="basic"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
          >
            <Settings className="w-4 h-4 mr-2" />
            基本信息
          </TabsTrigger>
          <TabsTrigger
            value="response"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
          >
            <FileJson className="w-4 h-4 mr-2" />
            响应设置
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
          >
            <Shield className="w-4 h-4 mr-2" />
            规则配置
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="basic" className="space-y-6">
            <div
              className={cn(
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
                "border border-slate-200/60 dark:border-slate-800/60",
                "rounded-xl p-6",
                "shadow-sm",
              )}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                    基本信息
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    设置 Mock API 的基本属性
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="name"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      接口名称
                    </Label>
                    <Input
                      id="name"
                      placeholder="例如：获取用户列表"
                      {...register("name")}
                      disabled={!canManage}
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="description"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      接口描述
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="描述接口的功能和用途"
                      rows={3}
                      {...register("description")}
                      disabled={!canManage}
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="collectionId"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      所属分组
                    </Label>
                    <Select
                      value={watch("collectionId") || "none"}
                      onValueChange={(value) =>
                        setValue(
                          "collectionId",
                          value === "none" ? null : value,
                        )
                      }
                      disabled={!canManage}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="选择分组（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无分组</SelectItem>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="proxyMode"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      代理模式
                    </Label>
                    <Select
                      value={proxyMode}
                      onValueChange={(value) =>
                        setValue("proxyMode", value as ProxyMode)
                      }
                      disabled={!canManage}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MOCK">
                          Mock - 仅返回模拟数据
                        </SelectItem>
                        <SelectItem value="PROXY">
                          Proxy - 仅代理请求
                        </SelectItem>
                        <SelectItem value="AUTO">Auto - 智能模式</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {proxyMode === "MOCK" && "始终返回 Mock 数据"}
                      {proxyMode === "PROXY" && "始终代理到真实服务"}
                      {proxyMode === "AUTO" &&
                        "有 Mock 数据时使用 Mock，否则代理"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="useFakerJs"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        使用 Faker.js
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        启用后可使用 Faker.js 语法生成动态数据 (例如:{" "}
                        {"{{faker.person.fullName}}"})
                      </p>
                    </div>
                    <Switch
                      id="useFakerJs"
                      checked={useFakerJs}
                      onCheckedChange={(checked) =>
                        setValue("useFakerJs", checked)
                      }
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {canManage && (
                  <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "保存中..." : "保存更改"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response" className="space-y-6">
            <div
              className={cn(
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
                "border border-slate-200/60 dark:border-slate-800/60",
                "rounded-xl p-6",
                "shadow-sm",
              )}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                    响应设置
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    配置 Mock API 的响应内容
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label
                        htmlFor="responseStatus"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        响应状态码
                      </Label>
                      <Input
                        id="responseStatus"
                        type="number"
                        placeholder="200"
                        {...register("responseStatus", { valueAsNumber: true })}
                        disabled={!canManage}
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="responseDelay"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          响应延迟（毫秒）
                        </div>
                      </Label>
                      <Input
                        id="responseDelay"
                        type="number"
                        placeholder="0"
                        {...register("responseDelay", { valueAsNumber: true })}
                        disabled={!canManage}
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      响应头
                    </Label>
                    <JSONEditor
                      value={watch("responseHeaders") || {}}
                      onChange={(value) =>
                        setValue(
                          "responseHeaders",
                          value as Record<string, string>,
                        )
                      }
                      disabled={!canManage}
                      placeholder="{ 'Content-Type': 'application/json' }"
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      响应体
                    </Label>
                    <JSONEditor
                      value={watch("responseBody") || {}}
                      onChange={(value) =>
                        setValue("responseBody", value as unknown)
                      }
                      disabled={!canManage}
                      placeholder="{ 'message': 'success' }"
                      className="min-h-[200px]"
                    />
                  </div>
                </div>

                {canManage && (
                  <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "保存中..." : "保存更改"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </form>

        <TabsContent value="rules" className="space-y-6">
          <div
            className={cn(
              "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
              "border border-slate-200/60 dark:border-slate-800/60",
              "rounded-xl p-6",
              "shadow-sm",
            )}
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  规则配置
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  根据请求条件返回不同的响应
                </p>
              </div>
              <RuleList
                mockApiId={mockId}
                projectId={projectId}
                canManage={canManage}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
