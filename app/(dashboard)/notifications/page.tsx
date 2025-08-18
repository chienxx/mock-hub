import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsPageClient } from "./NotificationsPageClient";

export const metadata: Metadata = {
  title: "通知中心",
  description: "查看和管理所有通知",
};

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <NotificationsPageClient />;
}
