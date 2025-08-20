"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { Mail, Key, Activity, FolderOpen, FileCode, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  _count: {
    createdProjects: number;
    projectMembers: number;
  };
}

interface RecentProject {
  id: string;
  shortId: string;
  name: string;
  updatedAt: Date;
  createdBy: {
    name: string | null;
  };
  _count: {
    mockAPIs: number;
  };
}

interface ProfileClientProps {
  user: UserData;
  recentProjects: RecentProject[];
  apiCallsLast30Days: number;
}

export function ProfileClient({
  user,
  recentProjects,
  apiCallsLast30Days,
}: ProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 基本信息表单
  const [name, setName] = useState(user.name || "");
  const [email] = useState(user.email);

  // 密码修改对话框
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 通知设置
  const [projectNotifications, setProjectNotifications] = useState(true);
  const [apiErrorNotifications, setApiErrorNotifications] = useState(true);

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

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("更新失败");

      toast.success("个人资料已更新");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("更新失败，请重试");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("密码长度至少8位");
      return;
    }

    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "修改失败");
      }

      toast.success("密码修改成功，请重新登录");
      setShowPasswordDialog(false);

      // 延迟后退出登录
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改失败");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNotifications,
          apiErrorNotifications,
        }),
      });

      if (!response.ok) throw new Error("保存失败");

      toast.success("通知设置已保存");
    } catch {
      toast.error("保存失败，请重试");
    }
  };

  const statsData = [
    {
      label: "创建的项目",
      value: user._count.createdProjects,
      icon: FolderOpen,
    },
    {
      label: "参与的项目",
      value: user._count.projectMembers,
      icon: Activity,
    },
    {
      label: "30天API调用",
      value: apiCallsLast30Days,
      icon: FileCode,
    },
  ];

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">个人资料</h1>
        <p className="text-sm text-muted-foreground">
          管理您的账户信息和偏好设置
        </p>
      </div>

      {/* 用户概览卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">
                  {user.name || "未设置姓名"}
                </h2>
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>
              <p className="text-muted-foreground flex items-center gap-2 mb-4">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {statsData.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-lg font-semibold">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细设置标签页 */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="notifications">通知偏好</TabsTrigger>
          <TabsTrigger value="activity">最近活动</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>更新您的个人信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" value={email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  邮箱地址不可修改
                </p>
              </div>
              <div className="space-y-2">
                <Label>账户信息</Label>
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      账户角色
                    </span>
                    <span className="text-sm font-medium">
                      {user.role === "ADMIN" ? "管理员" : "普通用户"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      账户状态
                    </span>
                    <span className="text-sm font-medium">
                      {user.status === "ACTIVE" ? "活跃" : user.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      注册时间
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                保存修改
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>安全设置</CardTitle>
              <CardDescription>管理您的账户安全</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">密码</p>
                    <p className="text-sm text-muted-foreground">
                      定期更换密码可以提高账户安全性
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    修改密码
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">双因素认证</p>
                    <p className="text-sm text-muted-foreground">
                      添加额外的安全层保护您的账户
                    </p>
                  </div>
                  <Badge variant="secondary">即将推出</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">登录历史</p>
                    <p className="text-sm text-muted-foreground">
                      查看您的账户登录记录
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    查看历史
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知偏好 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知偏好</CardTitle>
              <CardDescription>选择您希望接收的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>项目通知</Label>
                    <p className="text-sm text-muted-foreground">
                      项目创建、成员变动等通知
                    </p>
                  </div>
                  <Switch
                    checked={projectNotifications}
                    onCheckedChange={setProjectNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API错误通知</Label>
                    <p className="text-sm text-muted-foreground">
                      Mock API调用错误时通知
                    </p>
                  </div>
                  <Switch
                    checked={apiErrorNotifications}
                    onCheckedChange={setApiErrorNotifications}
                  />
                </div>
              </div>
              <Button onClick={handleSaveNotifications} disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 最近活动 */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>最近活动</CardTitle>
              <CardDescription>您最近参与的项目</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无活动记录
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          创建者: {project.createdBy.name || "未知"} •
                          {project._count.mockAPIs} 个Mock API
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/projects/${project.shortId}`)
                          }
                        >
                          查看项目
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 修改密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>请输入您的当前密码和新密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">当前密码</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">密码长度至少8位</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleChangePassword} disabled={isPending}>
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
