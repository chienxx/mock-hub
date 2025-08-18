"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, UserX, Edit, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AddMemberDialog } from "@/components/projects/members/add-member-dialog";
import { EditMemberRoleDialog } from "@/components/projects/members/edit-role-dialog";
import { ConfirmDialog } from "@/components/projects/members/confirm-dialog";
import { ProjectRole, UserRole } from "@prisma/client";
import type { Project, ApiResponse } from "@/types/project";

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
    role: UserRole;
    createdAt: string;
  };
}

interface MembersClientProps {
  projectId: string;
  projectName: string;
  canManageMembers: boolean;
  currentUserId: string;
}

export default function MembersClient({
  projectId,
  projectName,
  canManageMembers,
  currentUserId,
}: MembersClientProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    member: ProjectMember | null;
    isSelfExit: boolean;
  }>({ open: false, member: null, isSelfExit: false });

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);

        // 并行加载项目信息和成员列表
        const [projectResponse, membersResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/members`),
        ]);

        if (!projectResponse.ok || !membersResponse.ok) {
          throw new Error("获取数据失败");
        }

        const projectResult: ApiResponse<Project> =
          await projectResponse.json();
        const membersResult: ApiResponse<ProjectMember[]> =
          await membersResponse.json();

        setProject(projectResult.data || null);
        setMembers(membersResult.data || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "获取数据失败");
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [projectId, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 并行加载项目信息和成员列表
      const [projectResponse, membersResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/members`),
      ]);

      if (!projectResponse.ok || !membersResponse.ok) {
        throw new Error("获取数据失败");
      }

      const projectResult: ApiResponse<Project> = await projectResponse.json();
      const membersResult: ApiResponse<ProjectMember[]> =
        await membersResponse.json();

      setProject(projectResult.data || null);
      setMembers(membersResult.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取数据失败");
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    const isSelfExit = member.userId === currentUserId;
    setConfirmDialog({ open: true, member, isSelfExit });
  };

  const confirmRemoveMember = async () => {
    const { member, isSelfExit } = confirmDialog;
    if (!member) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${member.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "操作失败");
      }

      toast.success(isSelfExit ? "已退出项目" : "成员已移除");

      if (isSelfExit) {
        router.push("/projects");
      } else {
        await loadData();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setConfirmDialog({ open: false, member: null, isSelfExit: false });
    }
  };

  const getRoleLabel = (role: ProjectRole) => {
    const labels = {
      [ProjectRole.MANAGER]: "管理者",
      [ProjectRole.DEVELOPER]: "开发者",
      [ProjectRole.VIEWER]: "访客",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (): "default" | "secondary" | "outline" => {
    // 使用 variant 来控制样式，但我们会在使用时覆盖颜色
    return "outline";
  };

  const getRoleBadgeStyle = (role: ProjectRole) => {
    switch (role) {
      case ProjectRole.MANAGER:
        // 深红色系 - 管理者
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800";
      case ProjectRole.DEVELOPER:
        // 深蓝色系 - 开发者
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800";
      case ProjectRole.VIEWER:
        // 灰色系 - 访客
        return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700";
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

  // 过滤成员列表
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      searchQuery === "" ||
      member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 成员列表卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>项目成员</CardTitle>
              <CardDescription className="mt-1">
                管理项目的成员及其权限
              </CardDescription>
            </div>
            {canManageMembers && (
              <AddMemberDialog
                projectId={projectId}
                onSuccess={loadData}
                trigger={
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900">
                    <UserPlus className="mr-2 h-4 w-4" />
                    邀请成员
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索栏 */}
          {members.length > 3 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索成员..."
                  className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 成员列表 */}
          {members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>暂无成员，点击上方按钮邀请成员加入</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>没有找到匹配的成员</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isCreator = member.userId === project.creatorId;
                const canEdit = canManageMembers && !isCreator && !isSelf;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.avatar || undefined} />
                        <AvatarFallback>
                          {member.user.name?.[0] ||
                            member.user.email?.[0] ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.user.name || member.user.email}
                          </p>
                          {isSelf && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800"
                            >
                              你
                            </Badge>
                          )}
                          {isCreator && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800"
                            >
                              创建者
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getRoleBadgeVariant()}
                        className={getRoleBadgeStyle(member.role)}
                      >
                        {getRoleLabel(member.role)}
                      </Badge>

                      {(canEdit || (isSelf && !isCreator)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setEditingMember(member)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  修改角色
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveMember(member)}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              {isSelf ? "退出项目" : "移除成员"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 角色权限说明 */}
      <Card>
        <CardHeader>
          <CardTitle>角色权限</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={getRoleBadgeStyle(ProjectRole.MANAGER)}
                >
                  {getRoleLabel(ProjectRole.MANAGER)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                查看并管理项目所有内容（成员、设置、Mock API、日志）
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={getRoleBadgeStyle(ProjectRole.DEVELOPER)}
                >
                  {getRoleLabel(ProjectRole.DEVELOPER)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                查看并配置项目（创建/修改 Mock API、查看日志）
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={getRoleBadgeStyle(ProjectRole.VIEWER)}
                >
                  {getRoleLabel(ProjectRole.VIEWER)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                只能查看项目（Mock API、日志等，无修改权限）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {editingMember && (
        <EditMemberRoleDialog
          member={editingMember}
          projectId={projectId}
          onSuccess={() => {
            setEditingMember(null);
            loadData();
          }}
          onCancel={() => setEditingMember(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmDialog({ open: false, member: null, isSelfExit: false })
        }
        title={confirmDialog.isSelfExit ? "确认退出项目" : "确认移除成员"}
        description={
          confirmDialog.isSelfExit
            ? `确定要退出项目 "${projectName}" 吗？退出后需要重新被邀请才能访问。`
            : `确定要将 ${confirmDialog.member?.user.name || confirmDialog.member?.user.email} 从项目中移除吗？`
        }
        confirmText={confirmDialog.isSelfExit ? "退出" : "移除"}
        variant="destructive"
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}
