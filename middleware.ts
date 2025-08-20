import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // 公开路径
  const publicPaths = ["/", "/login", "/register", "/api/auth"];
  const isPublicPath =
    pathname === "/" || publicPaths.some((path) => pathname.startsWith(path));

  // Mock API 路径（需要特殊处理）
  const isMockApi = pathname.startsWith("/api/mock/");

  // API 路径不应该重定向，而应该返回401
  const isApiPath = pathname.startsWith("/api/");

  if (!isAuthenticated && !isPublicPath && !isMockApi) {
    // API请求返回401，而不是重定向
    if (isApiPath) {
      return NextResponse.json(
        { code: 401, message: "未授权，请先登录" },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录用户访问登录/注册页面时重定向到仪表盘
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
