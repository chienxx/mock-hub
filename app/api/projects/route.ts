import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShortId } from "@/lib/utils/shortid";
import { createProjectSchema } from "@/lib/validations/project";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole, ProjectStatus, OperationType } from "@prisma/client";
import { CacheManager } from "@/lib/cache";
import { projectInclude } from "@/lib/api/project-helpers";
import { notifyProjectMembers } from "@/lib/api/notification-helper";
import { logOperation } from "@/lib/services/operation-log-service";

// 获取用户的项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ACTIVE";

    // 构建查询条件
    const where = {
      AND: [
        {
          OR: [
            { creatorId: session.user.id },
            {
              members: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          ],
        },
        status === "ALL" ? {} : { status: status as ProjectStatus },
        search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
                { shortId: { contains: search } },
              ],
            }
          : {},
      ],
    };

    // 获取总数
    const total = await prisma.project.count({ where });

    // 获取项目列表
    const projects = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 处理项目数据，添加用户角色信息
    const projectsWithRole = projects.map((project) => {
      // 系统管理员对所有项目有完全权限
      if (session.user.role === "ADMIN") {
        return {
          ...project,
          userRole: "ADMIN" as const,
        };
      }

      // 普通用户检查项目成员权限
      type MemberWithUser = (typeof project.members)[0];
      const member = project.members?.find(
        (m: MemberWithUser) => m.user.id === session.user.id,
      );

      return {
        ...project,
        userRole: member?.role || ProjectRole.VIEWER,
      };
    });

    return ApiResponse.success({
      items: projectsWithRole,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    // 检查用户权限 - 只有ADMIN可以创建项目
    if (session.user.role !== "ADMIN") {
      return ApiResponse.forbidden("只有管理员可以创建项目");
    }

    const body = await request.json();

    // 验证输入
    const validatedData = createProjectSchema.parse(body);

    // 生成唯一的shortId
    let shortId = generateShortId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.project.findUnique({
        where: { shortId },
      });
      if (!existing) break;
      shortId = generateShortId();
      attempts++;
    }

    // 创建项目
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        shortId,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: ProjectRole.MANAGER,
          },
        },
      },
      include: projectInclude,
    });

    // 清除缓存
    await CacheManager.delete("projects", session.user.id);

    // 发送通知给项目成员（目前只有创建者自己）
    await notifyProjectMembers(project.id, {
      title: "项目创建成功",
      content: `项目 "${project.name}" 已成功创建，您已被设置为项目管理员。`,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        action: "PROJECT_CREATED",
      },
    });

    // 异步记录操作日志
    logOperation({
      userId: session.user.id,
      type: OperationType.PROJECT_CREATE,
      module: "project",
      action: "创建新项目",
      targetId: project.id,
      targetName: project.name,
      metadata: {
        shortId: project.shortId,
        description: project.description,
      },
      status: "SUCCESS",
    }, request).catch(console.error);

    return ApiResponse.success(project, "项目创建成功");
  } catch (error) {
    return handleApiError(error);
  }
}
