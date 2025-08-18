import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addProjectMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/project";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import {
  createNotification,
  notifyProjectMembers,
} from "@/lib/api/notification-helper";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目成员列表
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查用户是否是项目成员
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: id,
        },
      },
    });

    if (!userMember && project.creatorId !== session.user.id) {
      return ApiResponse.forbidden("没有权限查看项目成员");
    }

    // 获取成员列表
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: "desc" }, // MANAGER > DEVELOPER > VIEWER
        { createdAt: "asc" },
      ],
    });

    return ApiResponse.success(members);
  } catch (error) {
    return handleApiError(error);
  }
}

// 添加项目成员
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = addProjectMemberSchema.parse(body);

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查操作者权限（需要MANAGER权限）
    const operatorMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: id,
        },
      },
    });

    const isCreator = project.creatorId === session.user.id;
    const hasPermission =
      isCreator || operatorMember?.role === ProjectRole.MANAGER;

    if (!hasPermission) {
      return ApiResponse.forbidden("只有管理员可以添加成员");
    }

    // 查找要添加的用户
    const userToAdd = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!userToAdd) {
      return ApiResponse.notFound("用户不存在，请确认邮箱是否正确");
    }

    // 检查用户是否已经是成员
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: userToAdd.id,
          projectId: id,
        },
      },
    });

    if (existingMember) {
      return ApiResponse.badRequest("该用户已经是项目成员");
    }

    // 添加成员
    const newMember = await prisma.projectMember.create({
      data: {
        userId: userToAdd.id,
        projectId: id,
        role: validatedData.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    // 发送通知给新成员
    await createNotification({
      userId: userToAdd.id,
      type: "PROJECT",
      title: "项目邀请",
      content: `您已被添加到项目 "${project.name}"，角色为${getRoleLabel(validatedData.role)}`,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        role: validatedData.role,
        invitedBy: session.user.name || session.user.email,
        action: "MEMBER_ADDED",
      },
    });

    // 通知其他项目成员
    await notifyProjectMembers(
      project.id,
      {
        title: "新成员加入",
        content: `${userToAdd.name || userToAdd.email} 已加入项目，角色为${getRoleLabel(validatedData.role)}`,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          newMemberId: userToAdd.id,
          newMemberName: userToAdd.name || userToAdd.email,
          action: "MEMBER_ADDED",
        },
      },
      userToAdd.id, // 排除新成员自己
    );

    return ApiResponse.success(newMember, "成员添加成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新成员角色
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;
    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId) {
      return ApiResponse.badRequest("缺少成员ID");
    }

    // 验证角色
    const validatedData = updateMemberRoleSchema.parse({ role });

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查操作者权限（需要MANAGER权限）
    const operatorMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: id,
        },
      },
    });

    const isCreator = project.creatorId === session.user.id;
    const hasPermission =
      isCreator || operatorMember?.role === ProjectRole.MANAGER;

    if (!hasPermission) {
      return ApiResponse.forbidden("只有管理员可以修改成员角色");
    }

    // 查找要修改的成员
    const memberToUpdate = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToUpdate || memberToUpdate.projectId !== id) {
      return ApiResponse.notFound("成员不存在");
    }

    // 不能修改创建者的角色
    if (memberToUpdate.userId === project.creatorId) {
      return ApiResponse.badRequest("不能修改项目创建者的角色");
    }

    // 获取旧角色信息
    const oldRole = memberToUpdate.role;

    // 更新角色
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: validatedData.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    // 发送通知给被修改角色的成员
    await createNotification({
      userId: updatedMember.userId,
      type: "PROJECT",
      title: "角色变更",
      content: `您在项目 "${project.name}" 的角色已从${getRoleLabel(oldRole)}变更为${getRoleLabel(validatedData.role)}`,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        oldRole,
        newRole: validatedData.role,
        changedBy: session.user.name || session.user.email,
        action: "ROLE_CHANGED",
      },
    });

    return ApiResponse.success(updatedMember, "角色更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 删除项目成员
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return ApiResponse.badRequest("缺少成员ID");
    }

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 查找要删除的成员
    const memberToDelete = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToDelete || memberToDelete.projectId !== id) {
      return ApiResponse.notFound("成员不存在");
    }

    // 不能删除创建者
    if (memberToDelete.userId === project.creatorId) {
      return ApiResponse.badRequest("不能移除项目创建者");
    }

    // 检查操作者权限
    const operatorMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: id,
        },
      },
    });

    const isCreator = project.creatorId === session.user.id;
    const hasPermission =
      isCreator || operatorMember?.role === ProjectRole.MANAGER;
    const isSelf = memberToDelete.userId === session.user.id;

    // 管理员可以删除任何成员，成员可以退出项目
    if (!hasPermission && !isSelf) {
      return ApiResponse.forbidden("没有权限移除成员");
    }

    // 删除成员
    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    // 获取被删除成员的信息
    const deletedUser = await prisma.user.findUnique({
      where: { id: memberToDelete.userId },
      select: { name: true, email: true },
    });

    if (!isSelf) {
      // 通知被移除的成员
      await createNotification({
        userId: memberToDelete.userId,
        type: "PROJECT",
        title: "项目移除通知",
        content: `您已被移出项目 "${project.name}"`,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          removedBy: session.user.name || session.user.email,
          action: "MEMBER_REMOVED",
        },
      });

      // 通知其他项目成员
      await notifyProjectMembers(
        project.id,
        {
          title: "成员离开",
          content: `${deletedUser?.name || deletedUser?.email} 已被移出项目`,
          metadata: {
            projectId: project.id,
            projectName: project.name,
            removedMemberId: memberToDelete.userId,
            removedMemberName: deletedUser?.name || deletedUser?.email,
            action: "MEMBER_REMOVED",
          },
        },
        memberToDelete.userId, // 排除被移除的成员
      );
    } else {
      // 成员主动退出，通知其他成员
      await notifyProjectMembers(
        project.id,
        {
          title: "成员退出",
          content: `${deletedUser?.name || deletedUser?.email} 已退出项目`,
          metadata: {
            projectId: project.id,
            projectName: project.name,
            leftMemberId: memberToDelete.userId,
            leftMemberName: deletedUser?.name || deletedUser?.email,
            action: "MEMBER_LEFT",
          },
        },
        memberToDelete.userId, // 排除退出的成员自己
      );
    }

    return ApiResponse.success(null, isSelf ? "已退出项目" : "成员移除成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 辅助函数：获取角色标签
function getRoleLabel(role: ProjectRole): string {
  switch (role) {
    case ProjectRole.MANAGER:
      return "管理员";
    case ProjectRole.DEVELOPER:
      return "开发者";
    case ProjectRole.VIEWER:
      return "访客";
    default:
      return "未知";
  }
}
