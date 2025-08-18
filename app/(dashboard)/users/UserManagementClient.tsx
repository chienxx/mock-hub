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
      case "INACTIVE":
        return <Badge variant="secondary">未激活</Badge>;
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
      toast.success(`密码已重置为: ${data.data.tempPassword}`);
    } catch {
      toast.error("重置密码失败");
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
                <SelectItem value="INACTIVE">未激活</SelectItem>
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
                  <TableHead>项目数</TableHead>
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
                          <p>创建: {user._count.createdProjects}</p>
                          <p className="text-muted-foreground">
                            参与: {user._count.projectMembers}
                          </p>
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
                              <DropdownMenuItem className="text-red-600">
                                <Ban className="mr-2 h-4 w-4" />
                                封禁用户
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-green-600">
                                <UserCheck className="mr-2 h-4 w-4" />
                                激活用户
                              </DropdownMenuItem>
                            )}
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
                    <SelectItem value="INACTIVE">未激活</SelectItem>
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
    </div>
  );
}
