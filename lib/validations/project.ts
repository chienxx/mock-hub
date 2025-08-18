import { z } from "zod";
import { ProjectStatus, ProjectRole } from "@prisma/client";

// 创建项目验证
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "项目名称不能为空")
    .max(100, "项目名称不能超过100个字符"),
  description: z.string().max(500, "项目描述不能超过500个字符").optional(),
  proxyUrl: z.string().url("请输入有效的URL").optional().or(z.literal("")),
});

// 更新项目验证
export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, "项目名称不能为空")
    .max(100, "项目名称不能超过100个字符")
    .optional(),
  description: z.string().max(500, "项目描述不能超过500个字符").optional(),
  proxyUrl: z.string().url("请输入有效的URL").optional().or(z.literal("")),
  status: z.nativeEnum(ProjectStatus).optional(),
});

// 添加项目成员验证
export const addProjectMemberSchema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.DEVELOPER),
});

// 更新成员角色验证
export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
