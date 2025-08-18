"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateProjectSchema,
  type UpdateProjectInput,
} from "@/lib/validations/project";
import { ProjectStatus } from "@prisma/client";
import type { Project, ApiResponse } from "@/types/project";

interface SettingsClientProps {
  projectId: string;
  canManageProject: boolean;
  canDeleteProject: boolean;
}

export default function SettingsClient({
  projectId,
  canManageProject,
  canDeleteProject,
}: SettingsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
  });

  const status = watch("status");

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        const result: ApiResponse<Project> = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "获取项目信息失败");
        }

        setProject(result.data || null);
        reset({
          name: result.data?.name || "",
          description: result.data?.description || "",
          proxyUrl: result.data?.proxyUrl || "",
          status: result.data?.status || ProjectStatus.ACTIVE,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "获取项目信息失败",
        );
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, reset, router]);

  const onSubmit = async (data: UpdateProjectInput) => {
    try {
      setSaving(true);

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "更新项目失败");
      }

      toast.success("项目更新成功");
      setProject(result.data || null);
      reset({
        name: result.data?.name || "",
        description: result.data?.description || "",
        proxyUrl: result.data?.proxyUrl || "",
        status: result.data?.status || ProjectStatus.ACTIVE,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新项目失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `确定要删除项目 "${project?.name}" 吗？此操作不可恢复，将删除所有相关的 Mock API 和日志数据。`,
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除项目失败");
      }

      toast.success("项目删除成功");
      router.push("/projects");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除项目失败");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-96 animate-pulse bg-muted rounded" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>修改项目的基本信息和配置</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">项目名称</Label>
                <Input
                  id="name"
                  {...register("name")}
                  disabled={!canManageProject || saving}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">项目描述</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  disabled={!canManageProject || saving}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="proxyUrl">代理地址</Label>
                <Input
                  id="proxyUrl"
                  type="url"
                  placeholder="https://api.example.com"
                  {...register("proxyUrl")}
                  disabled={!canManageProject || saving}
                />
                <p className="text-xs text-muted-foreground">
                  配置后可将 Mock 请求代理到真实的后端服务
                </p>
                {errors.proxyUrl && (
                  <p className="text-sm text-destructive">
                    {errors.proxyUrl.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">项目状态</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setValue("status", value as ProjectStatus)
                  }
                  disabled={!canManageProject || saving}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ProjectStatus.ACTIVE}>
                      <span className="flex items-center">
                        <span className="mr-2 h-2 w-2 rounded-full bg-green-500" />
                        活跃
                      </span>
                    </SelectItem>
                    <SelectItem value={ProjectStatus.ARCHIVED}>
                      <span className="flex items-center">
                        <span className="mr-2 h-2 w-2 rounded-full bg-slate-500" />
                        已归档
                      </span>
                    </SelectItem>
                    <SelectItem value={ProjectStatus.DISABLED}>
                      <span className="flex items-center">
                        <span className="mr-2 h-2 w-2 rounded-full bg-red-500" />
                        已禁用
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canManageProject && (
              <div className="flex justify-end">
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                  type="submit"
                  disabled={saving || !isDirty}
                >
                  {saving ? (
                    <>保存中...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存更改
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 危险操作 */}
      {canDeleteProject && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">危险操作</CardTitle>
            <CardDescription>以下操作不可恢复，请谨慎操作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">删除项目</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  删除项目将同时删除所有相关的 Mock
                  API、规则、日志等数据，此操作不可恢复。
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>删除中...</>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除项目
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
