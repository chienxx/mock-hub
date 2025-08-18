"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validations/project";

interface CreateProjectDialogProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function CreateProjectDialog({
  onSuccess,
  children,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      setLoading(true);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "创建项目失败");
      }

      if (!result.data) {
        throw new Error("创建项目失败：无效的响应数据");
      }

      toast.success("项目创建成功");
      reset();
      setOpen(false);
      onSuccess?.();
      router.refresh();
      // 跳转到项目详情页
      router.push(`/projects/${result.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建项目失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建项目
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
            <DialogDescription>
              创建一个新的 Mock API 项目，开始管理您的接口
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">项目名称 *</Label>
              <Input
                id="name"
                placeholder="输入项目名称"
                {...register("name")}
                disabled={loading}
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
                placeholder="输入项目描述（可选）"
                {...register("description")}
                disabled={loading}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proxyUrl">代理 URL（可选）</Label>
              <Input
                id="proxyUrl"
                type="url"
                placeholder="https://api.example.com"
                {...register("proxyUrl")}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                配置后可将Mock请求代理到真实的后端服务
              </p>
              {errors.proxyUrl && (
                <p className="text-sm text-destructive">
                  {errors.proxyUrl.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "创建中..." : "创建项目"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
