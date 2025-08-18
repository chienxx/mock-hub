"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { ProjectRole } from "@prisma/client";

const addMemberSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  role: z.nativeEnum(ProjectRole, { message: "请选择角色" }),
});

type AddMemberInput = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  projectId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function AddMemberDialog({
  projectId,
  onSuccess,
  trigger,
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
      role: ProjectRole.VIEWER,
    },
  });

  const onSubmit = async (data: AddMemberInput) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // 根据不同的错误状态码提供更友好的提示
        if (response.status === 404) {
          // 用户不存在的情况
          form.setError("email", {
            type: "manual",
            message: "该邮箱用户不存在，请确认邮箱地址是否正确",
          });
          toast.error("该邮箱用户不存在，请检查邮箱地址");
        } else if (response.status === 400) {
          // 用户已经是成员的情况
          const message = result.message || "添加成员失败";
          if (message.includes("已经是") || message.includes("already")) {
            form.setError("email", {
              type: "manual",
              message: "该用户已经是项目成员",
            });
            toast.error("该用户已经是项目成员");
          } else {
            form.setError("email", {
              type: "manual",
              message: message,
            });
            toast.error(message);
          }
        } else if (response.status === 403) {
          toast.error("您没有权限添加成员");
        } else {
          const message = result.message || "添加成员失败";
          toast.error(message);
        }
        return;
      }

      toast.success("成员添加成功");
      setOpen(false);
      form.reset({
        email: "",
        role: ProjectRole.VIEWER,
      });
      onSuccess();
    } catch (error) {
      // 网络错误或其他异常
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("网络连接失败，请检查网络连接后重试");
      } else {
        toast.error("添加成员时发生未知错误，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: ProjectRole) => {
    const roleLabels = {
      [ProjectRole.MANAGER]: "管理者",
      [ProjectRole.DEVELOPER]: "开发者",
      [ProjectRole.VIEWER]: "访客",
    };
    return roleLabels[role];
  };

  const getRoleDescription = (role: ProjectRole) => {
    const descriptions = {
      [ProjectRole.MANAGER]: "查看并管理项目（包括成员、设置、Mock API）",
      [ProjectRole.DEVELOPER]: "查看并配置项目（创建和修改 Mock API）",
      [ProjectRole.VIEWER]: "只能查看项目（无修改权限）",
    };
    return descriptions[role];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加项目成员</DialogTitle>
          <DialogDescription>
            邀请用户加入项目，并设置相应的角色权限
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱地址</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入用户邮箱"
                      {...field}
                      disabled={loading}
                      onChange={(e) => {
                        // 清除之前的邮箱字段错误
                        if (form.formState.errors.email) {
                          form.clearErrors("email");
                        }
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription>请输入已注册用户的邮箱地址</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>项目角色</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ProjectRole).map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                          className="flex-col items-start"
                        >
                          <div className="flex flex-col gap-0.5 text-left">
                            <div className="font-medium">
                              {getRoleLabel(role)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getRoleDescription(role)}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
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
                disabled={loading}
              >
                取消
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                type="submit"
                disabled={loading}
              >
                {loading ? "添加中..." : "添加成员"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
