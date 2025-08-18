"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "@/lib/validations/mock";
import type { ApiResponse, Collection } from "@/types/mock";

interface Props {
  projectId: string;
  parentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (collection: Collection) => void;
}

export function CreateCollectionDialog({
  projectId,
  parentId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: "",
      parentId: parentId || undefined,
    },
  });

  const onSubmit = async (data: CreateCollectionInput) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/projects/${projectId}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<Collection> = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "创建分组失败");
      }

      if (!result.data) {
        throw new Error("创建分组失败：无效的响应数据");
      }

      toast.success("分组创建成功");
      onOpenChange(false);
      form.reset({
        name: "",
        parentId: parentId || undefined,
      });

      if (onSuccess) {
        onSuccess(result.data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建分组失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{parentId ? "创建子分组" : "创建分组"}</DialogTitle>
          <DialogDescription>
            为 Mock API 创建一个新的分组，方便组织和管理接口。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分组名称</FormLabel>
                  <FormControl>
                    <Input placeholder="用户模块、订单模块..." {...field} />
                  </FormControl>
                  <FormDescription>输入一个描述性的分组名称</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
