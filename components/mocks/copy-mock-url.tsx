"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  url: string;
  className?: string;
}

export function CopyMockUrlButton({ url, className }: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Mock URL 已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={className}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}
