"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import {
  User,
  Mail,
  Shield,
  Activity,
  MoreVertical,
  Edit,
  Ban,
  UserCheck,
  Search,
  Users,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    createdProjects: number;
    projectMembers: number;
  };
}

interface UserManagementClientProps {
  users: UserData[];
  currentUserId: string;
  stats: {
    total: number;
    active: number;
    admins: number;
  };
}

export function UserManagementClient({
  users: initialUsers,
  currentUserId,
  stats,
}: UserManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // 编辑用户对话框
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("USER");
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");

  // 删除用户对话框
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // 过滤用户
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus =
      filterStatus === "all" || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive">管理员</Badge>;
      case "USER":
        return <Badge variant="default">普通用户</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="default" className="bg-green-500">
            活跃
          </Badge>
        );
      case "BANNED":
        return <Badge variant="destructive">已封禁</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
        }),
      });

      if (!response.ok) throw new Error("更新失败");

      // 更新本地状态
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, role: editRole, status: editStatus }
            : u,
        ),
      );

      toast.success("用户信息已更新");
      setEditingUser(null);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("更新失败，请重试");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("重置失败");

      const data = await response.json();
      const tempPassword = data.data.tempPassword;

      // 创建一个临时的弹窗显示密码，并提供复制功能
      const modal = document.createElement("div");
      modal.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    z-index: 10000; max-width: 400px; width: 90%;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">密码重置成功</h3>
          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">新密码已生成，请复制并发送给用户：</p>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 16px; 
                      font-family: monospace; font-size: 16px; color: #334155; text-align: center; 
                      letter-spacing: 1px; user-select: all;">
            ${tempPassword}
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="copyBtn" style="flex: 1; padding: 8px 16px; background: #0f172a; color: white; 
                                        border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              复制密码
            </button>
            <button id="closeBtn" style="flex: 1; padding: 8px 16px; background: #f1f5f9; color: #334155; 
                                         border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              关闭
            </button>
          </div>
        </div>
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(0,0,0,0.5); z-index: 9999;"></div>
      `;

      document.body.appendChild(modal);

      // 复制功能
      const copyBtn = modal.querySelector("#copyBtn") as HTMLButtonElement;
      const closeBtn = modal.querySelector("#closeBtn") as HTMLButtonElement;

      copyBtn?.addEventListener("click", async () => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(tempPassword);
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = tempPassword;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
          }
          copyBtn.textContent = "已复制！";
          copyBtn.style.background = "#16a34a";
          setTimeout(() => {
            copyBtn.textContent = "复制密码";
            copyBtn.style.background = "#0f172a";
          }, 2000);
        } catch {
          toast.error("复制失败，请手动复制");
        }
      });

      closeBtn?.addEventListener("click", () => {
        document.body.removeChild(modal);
      });

      toast.success("密码重置成功");
    } catch {
      toast.error("重置密码失败");
    }
  };

  const handleToggleUserStatus = async (
    userId: string,
    newStatus: UserStatus,
  ) => {
    const action = newStatus === "BANNED" ? "封禁" : "激活";

    if (!confirm(`确定要${action}该用户吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error(`${action}失败`);

      // 更新本地状态
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
      );

      toast.success(`用户已${action}`);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(`${action}失败，请重试`);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      const response = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "删除失败");
      }

      const result = await response.json();

      // 从列表中移除用户
      setUsers(users.filter((u) => u.id !== deletingUser.id));

      toast.success(
        `用户 ${deletingUser.email} 已删除，同时删除了 ${result.data.deletedProjects} 个项目`,
      );

      setDeletingUser(null);
      setDeleteConfirmed(false); // 重置确认状态
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败，请重试");
    }
  };

  const statsData = [
    {
      title: "总用户数",
      value: stats.total.toString(),
      icon: Users,
      description: "注册用户总数",
    },
    {
      title: "活跃用户",
      value: stats.active.toString(),
      icon: Activity,
      description: "状态为活跃的用户",
    },
    {
      title: "管理员",
      value: stats.admins.toString(),
      icon: Shield,
      description: "管理员账户数量",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 - 统一风格 */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            用户管理
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            管理系统用户和权限
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>查看和管理所有系统用户</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="角色筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
                <SelectItem value="USER">普通用户</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="ACTIVE">活跃</SelectItem>
                <SelectItem value="BANNED">已封禁</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 用户表格 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>项目信息</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        没有找到符合条件的用户
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.name || "未设置"}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.role === "ADMIN" ? (
                            <>
                              {user._count.createdProjects > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {user._count.createdProjects}
                                  </span>
                                  <span className="text-slate-500">个项目</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">暂无项目</span>
                              )}
                            </>
                          ) : (
                            <>
                              {user._count.projectMembers > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {user._count.projectMembers}
                                  </span>
                                  <span className="text-slate-500">个项目</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">
                                  未参与项目
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                          <p className="text-muted-foreground">
                            {new Date(user.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={user.id === currentUserId}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>用户操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              编辑用户
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user.id)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              重置密码
                            </DropdownMenuItem>
                            {user.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleToggleUserStatus(user.id, "BANNED")
                                }
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                封禁用户
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  handleToggleUserStatus(user.id, "ACTIVE")
                                }
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                激活用户
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeletingUser(user);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除用户
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑用户对话框 */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户角色和状态</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">用户信息</p>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm">
                    姓名: {editingUser.name || "未设置"}
                  </p>
                  <p className="text-sm">邮箱: {editingUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">普通用户</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as UserStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">活跃</SelectItem>
                    <SelectItem value="BANNED">已封禁</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              取消
            </Button>
            <Button onClick={handleSaveUser} disabled={isPending}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除用户确认对话框 */}
      <Dialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null);
            setDeleteConfirmed(false); // 重置确认状态
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              删除用户确认
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              此操作不可恢复，请仔细确认后再继续
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="space-y-4">
              {/* 用户信息卡片 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                      即将删除的用户
                    </p>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">姓名：</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {deletingUser.name || "未设置"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">邮箱：</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {deletingUser.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">角色：</span>
                        <Badge
                          variant={
                            deletingUser.role === "ADMIN"
                              ? "destructive"
                              : "default"
                          }
                          className="h-5"
                        >
                          {deletingUser.role === "ADMIN"
                            ? "管理员"
                            : "普通用户"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 影响说明 */}
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900/50">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                      删除影响范围
                    </p>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400"></div>
                          <span>账户信息</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400"></div>
                          <span>所有通知</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400"></div>
                          <span>Mock API</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400"></div>
                          <span>API 日志</span>
                        </div>
                      </div>

                      {(deletingUser._count.createdProjects > 0 ||
                        deletingUser._count.projectMembers > 0) && (
                        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-900/50">
                          <div className="space-y-1">
                            {deletingUser._count.createdProjects > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400">
                                  创建的项目：
                                </span>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {deletingUser._count.createdProjects} 个
                                </span>
                              </div>
                            )}
                            {deletingUser._count.projectMembers > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400">
                                  参与的项目：
                                </span>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {deletingUser._count.projectMembers} 个
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 确认选项 */}
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="confirm-delete"
                  checked={deleteConfirmed}
                  className="mt-1 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-slate-500"
                  onChange={(e) => {
                    setDeleteConfirmed(e.target.checked);
                  }}
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  我已了解删除此用户将永久删除所有相关数据，此操作无法撤销
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingUser(null);
                setDeleteConfirmed(false);
              }}
              className="border-slate-200 dark:border-slate-700"
            >
              取消
            </Button>
            <Button
              id="delete-btn"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={!deleteConfirmed}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
