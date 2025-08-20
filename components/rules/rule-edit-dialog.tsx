"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConditionEditor } from "./condition-editor";
import { JSONEditor } from "@/components/editors/json-editor";
import {
  createMockRuleSchema,
  updateMockRuleSchema,
} from "@/lib/validations/rule";
import type {
  MockRule,
  ConditionGroup,
  CreateMockRuleInput,
  UpdateMockRuleInput,
} from "@/types/rule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: MockRule | null;
  mockApiId: string;
  projectId: string;
  onSuccess: () => void;
}

export function RuleEditDialog({
  open,
  onOpenChange,
  rule,
  mockApiId,
  projectId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<ConditionGroup>({
    type: "AND",
    conditions: [],
  });

  const isEdit = !!rule;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateMockRuleInput | UpdateMockRuleInput>({
    resolver: zodResolver(isEdit ? updateMockRuleSchema : createMockRuleSchema),
    defaultValues: {
      name: "",
      enabled: true,
      statusCode: 200,
      headers: {},
      body: {},
      delay: 0,
      ...(!isEdit && { mockApiId }),
    },
    mode: "onSubmit", // 明确设置为只在提交时验证
  });

  // 初始化编辑数据
  useEffect(() => {
    if (open) {
      if (rule) {
        reset({
          name: rule.name || "",
          enabled: rule.enabled,
          statusCode: rule.statusCode || 200,
          headers: rule.headers || {},
          body: rule.body || {},
          delay: rule.delay || 0,
        });
        setConditions(
          (rule.conditions as ConditionGroup) || {
            type: "AND",
            conditions: [],
          },
        );
      } else {
        reset({
          name: "",
          enabled: true,
          statusCode: 200,
          headers: {},
          body: {},
          delay: 0,
          mockApiId,
        });
        setConditions({ type: "AND", conditions: [] });
      }
    }
  }, [open, rule, mockApiId, reset]);

  const onSubmit = async (data: CreateMockRuleInput | UpdateMockRuleInput) => {
    if (loading) return;

    try {
      setLoading(true);

      // 添加条件到提交数据
      const submitData = {
        ...data,
        conditions: conditions.conditions.length > 0 ? conditions : undefined,
      };

      const url = isEdit
        ? `/api/projects/${projectId}/mocks/${mockApiId}/rules/${rule.id}`
        : `/api/projects/${projectId}/mocks/${mockApiId}/rules`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "保存规则失败");
      }

      toast.success(isEdit ? "规则更新成功" : "规则创建成功");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存规则失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑规则" : "创建规则"}</DialogTitle>
          <DialogDescription>配置规则的触发条件和响应内容</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" type="button">
                基本信息
              </TabsTrigger>
              <TabsTrigger value="conditions" type="button">
                触发条件
              </TabsTrigger>
              <TabsTrigger value="response" type="button">
                响应配置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">规则名称</Label>
                <Input
                  id="name"
                  placeholder="例如：VIP用户特殊响应"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {String(errors.name?.message || "")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">启用规则</Label>
                <Switch
                  id="enabled"
                  checked={watch("enabled")}
                  onCheckedChange={(checked) => setValue("enabled", checked)}
                />
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>提示：</strong>
                  规则优先级通过拖拽排序调整，排在上面的规则优先级更高。
                  系统会按顺序匹配规则，返回第一个匹配的规则响应。
                </p>
              </div>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">触发条件</CardTitle>
                  <CardDescription>
                    配置请求满足什么条件时触发此规则（最多5个条件）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConditionEditor
                    value={conditions}
                    onChange={setConditions}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusCode">响应状态码</Label>
                  <Input
                    id="statusCode"
                    type="number"
                    placeholder="200"
                    {...register("statusCode", { valueAsNumber: true })}
                  />
                  {errors.statusCode && (
                    <p className="text-sm text-destructive">
                      {String(errors.statusCode?.message || "")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delay">响应延迟 (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    placeholder="0"
                    {...register("delay", { valueAsNumber: true })}
                  />
                  {errors.delay && (
                    <p className="text-sm text-destructive">
                      {String(errors.delay?.message || "")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>响应头</Label>
                <JSONEditor
                  value={watch("headers") || {}}
                  onChange={(value) =>
                    setValue("headers", value as Record<string, string>)
                  }
                  placeholder={'{\n  "Content-Type": "application/json"\n}'}
                  height="120px"
                />
              </div>

              <div className="space-y-2">
                <Label>响应体（支持Faker.js语法）</Label>
                <JSONEditor
                  value={watch("body") || {}}
                  onChange={(value) => setValue("body", value)}
                  placeholder={
                    '{\n  "code": 0,\n  "data": {\n    "_repeat_10": {\n      "id": "{{faker.string.uuid}}",\n      "name": "{{faker.person.fullName}}"\n    }\n  }\n}'
                  }
                  height="250px"
                />
                <p className="text-xs text-muted-foreground">
                  支持Faker.js语法，如 {"{{faker.person.fullName}}"}、
                  {"{{faker.string.uuid}}"} 等
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 dark:border-slate-700"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
