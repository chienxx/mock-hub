"use client";

import { useState, useEffect } from "react";
import {
  GripVertical,
  Copy,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RuleEditDialog } from "./rule-edit-dialog";
import type { MockRule, ConditionGroup } from "@/types/rule";

interface Props {
  mockApiId: string;
  projectId: string;
  canManage: boolean;
}

interface SortableRuleItemProps {
  rule: MockRule;
  index: number;
  canManage: boolean;
  canCopy: boolean;
  onToggle: (rule: MockRule) => void;
  onCopy: (rule: MockRule) => void;
  onEdit: (rule: MockRule) => void;
  onDelete: (rule: MockRule) => void;
}

// 可拖拽的规则项
function SortableRuleItem({
  rule,
  index,
  canManage,
  canCopy,
  onToggle,
  onCopy,
  onEdit,
  onDelete,
}: SortableRuleItemProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 格式化条件显示
  const formatConditions = (conditions?: ConditionGroup) => {
    if (!conditions) return "无条件";
    const { type, conditions: conds } = conditions;
    if (conds.length === 0) return "无条件";

    const summary = conds
      .slice(0, 2)
      .map((c) => {
        const field = c.field.split(".").pop();
        return `${field} ${c.operator} ${JSON.stringify(c.value)}`;
      })
      .join(` ${type} `);

    return conds.length > 2 ? `${summary} ...` : summary;
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-3 ${isDragging ? "shadow-lg" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 拖拽手柄 */}
            {canManage && (
              <div
                className="mt-1 cursor-move text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-5 w-5" />
              </div>
            )}

            {/* 规则信息 */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <h4 className="font-medium">
                    {rule.name || `规则 ${index + 1}`}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    优先级: {index + 1}
                  </Badge>
                  {!rule.enabled && <Badge variant="secondary">已禁用</Badge>}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => onToggle(rule)}
                      />
                      {canCopy && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onCopy(rule)}
                          title="复制规则"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 条件摘要 */}
              <div className="text-sm text-muted-foreground">
                条件:{" "}
                {formatConditions(
                  rule.conditions as ConditionGroup | undefined,
                )}
              </div>

              {/* 展开详情 */}
              {expanded && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">状态码:</span>
                      <span className="ml-2 font-mono">
                        {rule.statusCode || 200}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">延迟:</span>
                      <span className="ml-2">{rule.delay || 0}ms</span>
                    </div>
                  </div>
                  {rule.headers && Object.keys(rule.headers).length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">响应头:</span>
                      <pre className="mt-1 rounded bg-muted p-2 text-xs">
                        {JSON.stringify(rule.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                  {rule.body && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">响应体:</span>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(rule.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RuleList({ mockApiId, projectId, canManage }: Props) {
  const [rules, setRules] = useState<MockRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<MockRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 获取规则列表
  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/rules`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取规则列表失败");
      }

      setRules(result.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取规则列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [mockApiId, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over?.id);

      const newRules = arrayMove(rules, oldIndex, newIndex);

      // 更新本地规则的优先级
      const updatedRules = newRules.map((rule, index) => ({
        ...rule,
        priority: index * 10,
      }));

      setRules(updatedRules);

      // 准备更新数据
      const updates = updatedRules.map((rule) => ({
        id: rule.id,
        priority: rule.priority,
      }));

      try {
        const response = await fetch(
          `/api/projects/${projectId}/mocks/${mockApiId}/rules`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rules: updates }),
          },
        );

        if (!response.ok) {
          throw new Error("更新优先级失败");
        }

        toast.success("规则顺序已更新");
      } catch {
        toast.error("更新优先级失败");
        fetchRules(); // 恢复原顺序
      }
    }
  };

  // 切换规则启用状态
  const handleToggle = async (rule: MockRule) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/rules/${rule.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !rule.enabled }),
        },
      );

      if (!response.ok) {
        throw new Error("切换状态失败");
      }

      toast.success(rule.enabled ? "规则已禁用" : "规则已启用");
      fetchRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "切换状态失败");
    }
  };

  // 复制规则
  const handleCopy = async (rule: MockRule) => {
    // 检查规则数量限制
    if (rules.length >= 5) {
      toast.error("规则数量已达上限（最多5条）");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/rules/${rule.id}/copy`,
        { method: "POST" },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "复制规则失败");
      }

      toast.success("规则复制成功");
      fetchRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "复制规则失败");
    }
  };

  // 删除规则
  const handleDelete = async (rule: MockRule) => {
    const ruleIndex = rules.findIndex((r) => r.id === rule.id);
    const displayName = rule.name || `规则 ${ruleIndex + 1}`;
    if (!confirm(`确定要删除规则 "${displayName}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/rules/${rule.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("删除规则失败");
      }

      toast.success("规则已删除");
      fetchRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除规则失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="h-20 animate-pulse bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* 提示信息 */}
        {canManage && (
          <div className="space-y-2">
            {rules.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span>拖动规则可调整执行顺序，上面的规则优先匹配</span>
              </div>
            )}
            {rules.length >= 5 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <span>⚠️ 已达到规则数量上限（最多5条）</span>
              </div>
            )}
          </div>
        )}

        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">暂无规则</p>
              {canManage && (
                <Button
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                  onClick={() => {
                    if (rules.length >= 5) {
                      toast.error("规则数量已达上限（最多5条）");
                      return;
                    }
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  创建规则
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rules.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {rules.map((rule, index) => (
                  <SortableRuleItem
                    key={rule.id}
                    rule={rule}
                    index={index}
                    canManage={canManage}
                    canCopy={rules.length < 5}
                    onToggle={handleToggle}
                    onCopy={handleCopy}
                    onEdit={setEditingRule}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {canManage && rules.length < 5 && (
              <Button
                className="w-full border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加规则
              </Button>
            )}
          </>
        )}
      </div>

      {/* 编辑/创建对话框 */}
      <RuleEditDialog
        open={showCreateDialog || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingRule(null);
          }
        }}
        rule={editingRule}
        mockApiId={mockApiId}
        projectId={projectId}
        onSuccess={() => {
          setShowCreateDialog(false);
          setEditingRule(null);
          fetchRules();
        }}
      />
    </>
  );
}
