import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema } from "@/lib/validations/project";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { CacheManager } from "@/lib/cache";
import {
  checkProjectPermission,
  projectInclude,
} from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;

    // 获取项目详情
    const project = await prisma.project.findUnique({
      where: { id },
      include: projectInclude,
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查权限
    const hasPermission = await checkProjectPermission(
      project.id,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 添加用户角色信息
    let userRole: ProjectRole | "ADMIN" = ProjectRole.VIEWER;

    // 检查用户系统角色
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role === "ADMIN") {
      userRole = "ADMIN";
    } else {
      // 普通用户检查项目成员权限
      type MemberWithUser = (typeof project.members)[0];
      const member = project.members.find(
        (m: MemberWithUser) => m.user.id === session.user.id,
      );
      userRole = member?.role || ProjectRole.VIEWER;
    }

    return ApiResponse.success({
      ...project,
      userRole,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新项目
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = updateProjectSchema.parse(body);

    // 查找项目
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查权限（需要MANAGER权限）
    const hasPermission = await checkProjectPermission(
      project.id,
      session.user.id,
      ProjectRole.MANAGER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("只有项目管理员可以修改此项目");
    }

    // 更新项目
    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: validatedData,
      include: projectInclude,
    });

    // 清除缓存
    await CacheManager.delete("projects", session.user.id);
    await CacheManager.delete("project", project.id);

    return ApiResponse.success(updatedProject, "项目更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 删除项目
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id } = await params;

    // 查找项目
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 只有创建者可以删除项目
    if (project.creatorId !== session.user.id) {
      return ApiResponse.forbidden("只有项目创建者可以删除项目");
    }

    // 删除项目（会级联删除相关数据）
    await prisma.project.delete({
      where: { id: project.id },
    });

    // 清除缓存
    await CacheManager.delete("projects", session.user.id);
    await CacheManager.delete("project", project.id);

    return ApiResponse.success(null, "项目删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
