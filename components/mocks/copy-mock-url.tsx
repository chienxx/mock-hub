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
      // 优先使用 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast.success("Mock URL 已复制到剪贴板");
      } else {
        // 降级方案：使用传统的 execCommand
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999); // 兼容移动端

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          toast.success("Mock URL 已复制到剪贴板");
        } else {
          throw new Error("复制失败");
        }
      }
    } catch {
      // 最后的降级方案：显示可复制的文本
      toast.error(
        <div className="flex flex-col gap-2">
          <span>复制失败，请手动复制：</span>
          <input
            type="text"
            value={url}
            readOnly
            className="bg-gray-100 px-2 py-1 rounded text-xs"
            onClick={(e) => e.currentTarget.select()}
          />
        </div>,
        { duration: 10000 },
      );
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
