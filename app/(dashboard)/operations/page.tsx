import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OperationLogsClient } from "./OperationLogsClient";

export default async function OperationLogsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // 所有用户都可以访问操作日志页面
  // 但查看范围不同：管理员看所有，普通用户只看自己的
  return <OperationLogsClient userRole={session.user.role} />;
}
