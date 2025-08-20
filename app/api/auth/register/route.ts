import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { OperationType } from "@prisma/client";
import { logOperation } from "@/lib/services/operation-log-service";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 验证输入
    const validatedData = registerSchema.parse(body);

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // 异步记录注册操作日志
    logOperation(
      {
        userId: user.id,
        type: OperationType.USER_REGISTER,
        module: "auth",
        action: "用户注册",
        targetId: user.id,
        targetName: user.email,
        metadata: {
          email: user.email,
          name: user.name,
        },
        status: "SUCCESS",
      },
      req,
    ).catch(console.error);

    return NextResponse.json({
      message: "注册成功",
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据无效", details: error.issues },
        { status: 400 },
      );
    }

    console.error("注册错误:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 },
    );
  }
}
