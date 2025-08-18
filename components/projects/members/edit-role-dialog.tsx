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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { ProjectRole } from "@prisma/client";

const editRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole, { message: "请选择角色" }),
});

type EditRoleInput = z.infer<typeof editRoleSchema>;

interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    createdAt: string;
  };
}

interface EditMemberRoleDialogProps {
  member: ProjectMember;
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditMemberRoleDialog({
  member,
  projectId,
  onSuccess,
  onCancel,
}: EditMemberRoleDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<EditRoleInput>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      role: member.role,
    },
  });

  const onSubmit = async (data: EditRoleInput) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          role: data.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "修改角色失败");
      }

      toast.success("角色修改成功");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改角色失败");
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: ProjectRole) => {
    const roleLabels = {
      [ProjectRole.MANAGER]: "管理员",
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
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>修改成员角色</DialogTitle>
          <DialogDescription>
            修改 {member.user.name || member.user.email} 在项目中的角色权限
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {member.user.name?.[0] || member.user.email?.[0] || "U"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {member.user.name || member.user.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>
            </div>

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
                onClick={onCancel}
                disabled={loading}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "修改中..." : "确认修改"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
