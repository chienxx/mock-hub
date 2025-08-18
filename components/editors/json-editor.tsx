"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface JSONEditorProps {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  placeholder?: string;
  height?: string;
  className?: string;
}

export function JSONEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "{}",
  height = "200px",
  className,
}: JSONEditorProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 初始化时将值转换为格式化的JSON字符串
  useEffect(() => {
    try {
      const jsonString = JSON.stringify(value, null, 2);
      setText(jsonString);
      setError(null);
    } catch {
      setText("");
      setError("无效的JSON数据");
    }
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);

    // 如果输入为空，设置为空对象
    if (!newText.trim()) {
      onChange({});
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(newText);
      onChange(parsed);
      setError(null);
    } catch (err) {
      setError(
        "JSON格式错误：" + (err instanceof Error ? err.message : "未知错误"),
      );
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "font-mono text-sm",
          error && "border-destructive focus-visible:ring-destructive",
        )}
        style={{ height, minHeight: height }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
