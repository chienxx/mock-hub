"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HTTPMethod, ProxyMode } from "@prisma/client";
import { createMockAPISchema } from "@/lib/validations/mock";
import type { CreateMockAPIInput } from "@/types/mock";
import type { ApiResponse, MockAPI } from "@/types/mock";
import { Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  children: React.ReactNode;
  collectionId?: string;
  onSuccess?: (mockAPI: MockAPI) => void;
}

export function CreateMockDialog({
  projectId,
  children,
  collectionId,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateMockAPIInput>({
    resolver: zodResolver(createMockAPISchema),
    defaultValues: {
      path: "/api/",
      method: HTTPMethod.GET,
      name: "",
      description: "",
      proxyMode: ProxyMode.MOCK,
      collectionId: collectionId || undefined,
    },
  });

  const onSubmit = async (data: CreateMockAPIInput) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/projects/${projectId}/mocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<MockAPI> = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "创建 Mock API 失败");
      }

      if (!result.data) {
        throw new Error("创建 Mock API 失败：无效的响应数据");
      }

      toast.success("Mock API 创建成功，正在跳转到编辑页面...");
      setOpen(false);
      form.reset({
        path: "/api/",
        method: HTTPMethod.GET,
        name: "",
        description: "",
        proxyMode: ProxyMode.MOCK,
        collectionId: collectionId || undefined,
      });

      // 优化跳转逻辑：先关闭对话框，然后平滑跳转
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.data!);
        } else {
          // 使用平滑的页面跳转
          router.push(`/projects/${projectId}/mocks/${result.data!.id}`);
        }
      }, 100);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "创建 Mock API 失败",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建 Mock API</DialogTitle>
          <DialogDescription>
            创建一个新的 Mock API 接口，支持多种代理模式和响应设置。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>方法</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="选择方法" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={HTTPMethod.GET}>GET</SelectItem>
                        <SelectItem value={HTTPMethod.POST}>POST</SelectItem>
                        <SelectItem value={HTTPMethod.PUT}>PUT</SelectItem>
                        <SelectItem value={HTTPMethod.DELETE}>
                          DELETE
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>路径</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/api/users/list"
                          {...field}
                          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>接口名称</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：获取用户列表"
                      {...field}
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </FormControl>
                  <FormDescription>为接口起一个易于识别的名称</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>接口描述（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="描述接口的功能和用途..."
                      className="resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proxyMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>代理模式</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ProxyMode.MOCK}>
                        Mock - 仅返回模拟数据
                      </SelectItem>
                      <SelectItem value={ProxyMode.AUTO}>
                        Auto - 智能模式
                      </SelectItem>
                      <SelectItem value={ProxyMode.PROXY}>
                        Proxy - 仅代理请求
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-slate-200 dark:border-slate-700"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建并编辑"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
