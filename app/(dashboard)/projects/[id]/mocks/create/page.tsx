"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CreateMockPage({ params }: PageProps) {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const { id } = await params;
      // 重定向到Mock API列表页，让用户使用对话框创建
      router.replace(`/projects/${id}/mocks`);
    };
    redirect();
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">正在跳转...</p>
    </div>
  );
}
