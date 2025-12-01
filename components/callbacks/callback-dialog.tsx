"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Save, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { JSONEditor } from "@/components/editors/json-editor";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MockCallback {
  id: string;
  name?: string | null;
  url: string;
  method: string;
  headers?: Record<string, string> | null;
  body?: unknown;
  delay: number;
  enabled: boolean;
}

interface Props {
  open: boolean;
  onClose: (reload?: boolean) => void;
  mockApiId: string;
  projectId: string;
  callback?: MockCallback | null;
}

const callbackSchema = z.object({
  name: z.string().optional(),
  url: z.string().url("请输入有效的URL"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  delay: z.number().int().min(0).max(60000),
  enabled: z.boolean(),
});

type CallbackFormData = z.infer<typeof callbackSchema>;

export function CallbackDialog({
  open,
  onClose,
  mockApiId,
  projectId,
  callback,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [showVariableHelp, setShowVariableHelp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CallbackFormData>({
    resolver: zodResolver(callbackSchema),
    defaultValues: {
      name: "",
      url: "",
      method: "POST",
      headers: {},
      body: {},
      delay: 0,
      enabled: true,
    },
  });

  const method = watch("method");

  useEffect(() => {
    if (callback) {
      reset({
        name: callback.name || "",
        url: callback.url,
        method: callback.method as "GET" | "POST" | "PUT" | "DELETE",
        headers: (callback.headers as Record<string, string>) || {},
        body: callback.body || {},
        delay: callback.delay,
        enabled: callback.enabled,
      });
    } else {
      reset({
        name: "",
        url: "",
        method: "POST",
        headers: {},
        body: {},
        delay: 0,
        enabled: true,
      });
    }
  }, [callback, reset, open]);

  const onSubmit = async (data: CallbackFormData) => {
    try {
      setSaving(true);

      const url = callback
        ? `/api/projects/${projectId}/mocks/${mockApiId}/callbacks/${callback.id}`
        : `/api/projects/${projectId}/mocks/${mockApiId}/callbacks`;

      const response = await fetch(url, {
        method: callback ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "操作失败");
      }

      toast.success(callback ? "回调更新成功" : "回调创建成功");
      onClose(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setSaving(false);
    }
  };

  const variableExamples = [
    {
      category: "请求参数",
      variables: [
        { name: "{{request.query.userId}}", desc: "查询参数" },
        { name: "{{request.body.name}}", desc: "请求体字段" },
        { name: "{{request.headers.token}}", desc: "请求头" },
        { name: "{{request.params.id}}", desc: "路径参数" },
      ],
    },
    {
      category: "响应数据",
      variables: [
        { name: "{{response.body.orderId}}", desc: "响应体字段" },
        { name: "{{response.statusCode}}", desc: "响应状态码" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {callback ? "编辑回调" : "创建回调"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* 名称 */}
            <div className="grid gap-2">
              <Label htmlFor="name">回调名称（可选）</Label>
              <Input
                id="name"
                placeholder="例如：设备启动确认回调"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* URL */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="url">回调 URL *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowVariableHelp(!showVariableHelp)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        变量说明
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-md">
                      <div className="space-y-2">
                        {variableExamples.map((group) => (
                          <div key={group.category}>
                            <div className="font-medium text-xs mb-1">
                              {group.category}
                            </div>
                            {group.variables.map((v) => (
                              <div
                                key={v.name}
                                className="text-xs flex justify-between gap-2"
                              >
                                <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                  {v.name}
                                </code>
                                <span className="text-slate-500">{v.desc}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="url"
                placeholder="http://your-server.com/api/callback"
                {...register("url")}
              />
              {errors.url && (
                <p className="text-sm text-red-500">{errors.url.message}</p>
              )}
            </div>

            {/* HTTP 方法 */}
            <div className="grid gap-2">
              <Label htmlFor="method">HTTP 方法</Label>
              <Select
                value={method}
                onValueChange={(value) =>
                  setValue(
                    "method",
                    value as "GET" | "POST" | "PUT" | "DELETE",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 延迟 */}
            <div className="grid gap-2">
              <Label htmlFor="delay">延迟时间（毫秒）</Label>
              <Input
                id="delay"
                type="number"
                min="0"
                max="60000"
                placeholder="0"
                {...register("delay", { valueAsNumber: true })}
              />
              <p className="text-xs text-slate-500">
                在 Mock 响应返回后，延迟多久执行回调（0-60000ms）
              </p>
              {errors.delay && (
                <p className="text-sm text-red-500">{errors.delay.message}</p>
              )}
            </div>

            {/* 请求头 */}
            <div className="grid gap-2">
              <Label>自定义请求头（可选）</Label>
              <JSONEditor
                value={watch("headers") || {}}
                onChange={(value) =>
                  setValue("headers", value as Record<string, string>)
                }
                placeholder='{ "Authorization": "Bearer {{request.headers.token}}" }'
                className="min-h-[120px]"
              />
              <p className="text-xs text-slate-500">
                支持变量替换，如 {"{{request.headers.token}}"}
              </p>
            </div>

            {/* 请求体 */}
            {["POST", "PUT", "DELETE"].includes(method) && (
              <div className="grid gap-2">
                <Label>请求体（可选）</Label>
                <JSONEditor
                  value={watch("body") || {}}
                  onChange={(value) => setValue("body", value)}
                  placeholder={`{
  "orderId": "{{request.body.orderId}}",
  "status": "success",
  "data": "{{response.body}}"
}`}
                  className="min-h-[150px]"
                />
                <p className="text-xs text-slate-500">
                  支持变量替换，从请求和响应中提取数据
                </p>
              </div>
            )}

            {/* 启用开关 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">启用回调</Label>
                <p className="text-xs text-slate-500">
                  禁用后不会执行此回调
                </p>
              </div>
              <Switch
                id="enabled"
                checked={watch("enabled")}
                onCheckedChange={(checked) => setValue("enabled", checked)}
              />
            </div>
          </div>

          {/* 变量说明展开区域 */}
          {showVariableHelp && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3 text-blue-900 dark:text-blue-100">
                可用变量
              </h4>
              <div className="space-y-3">
                {variableExamples.map((group) => (
                  <div key={group.category}>
                    <div className="font-medium text-xs text-blue-800 dark:text-blue-200 mb-1">
                      {group.category}
                    </div>
                    <div className="space-y-1">
                      {group.variables.map((v) => (
                        <div
                          key={v.name}
                          className="text-xs flex items-center gap-2"
                        >
                          <code className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700">
                            {v.name}
                          </code>
                          <span className="text-slate-600 dark:text-slate-400">
                            - {v.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={saving}
            >
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
