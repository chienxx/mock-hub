import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole, OperationType } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // 注意：使用 JWT 策略时不需要 adapter
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // 仅在开发环境输出调试信息
          if (process.env.NODE_ENV === "development") {
            console.log("认证请求，邮箱:", credentials?.email);
          }

          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) {
            // 不透露用户是否存在，统一返回 null
            return null;
          }

          // 检查用户状态
          if (user.status === "BANNED") {
            // 用户已被封禁
            console.log(`封禁用户尝试登录: ${user.email}`);
            // 记录失败的登录尝试
            await prisma.operationLog.create({
              data: {
                userId: user.id,
                type: OperationType.USER_LOGIN,
                module: "auth",
                action: "登录失败: 账户已被封禁",
                targetId: user.id,
                targetName: user.email,
                status: "FAILED",
                errorMessage: "账户已被封禁",
                createdAt: new Date(),
              },
            });
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password,
          );

          if (!isPasswordValid) {
            // 记录密码错误的登录尝试
            await prisma.operationLog.create({
              data: {
                userId: user.id,
                type: OperationType.USER_LOGIN,
                module: "auth",
                action: "登录失败: 密码错误",
                targetId: user.id,
                targetName: user.email,
                status: "FAILED",
                errorMessage: "密码错误",
                createdAt: new Date(),
              },
            });
            return null;
          }

          // 记录成功登录
          await prisma.operationLog.create({
            data: {
              userId: user.id,
              type: OperationType.USER_LOGIN,
              module: "auth",
              action: "用户登录成功",
              targetId: user.id,
              targetName: user.email,
              status: "SUCCESS",
              createdAt: new Date(),
            },
          });

          // 认证成功
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar,
            role: user.role,
          };
        } catch (error) {
          // 仅在开发环境记录错误
          if (process.env.NODE_ENV === "development") {
            console.error("认证异常:", error);
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7天
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
