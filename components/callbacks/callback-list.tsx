"use client";

import { useState, useEffect } from "react";
import {
  GripVertical,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  Activity,
  AlertCircle,
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
import { CallbackDialog } from "./callback-dialog";
import { CallbackLogsDialog } from "./callback-logs-dialog";

interface MockCallback {
  id: string;
  name?: string | null;
  url: string;
  method: string;
  headers?: Record<string, string> | null;
  body?: unknown;
  delay: number;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  mockApiId: string;
  projectId: string;
  canManage: boolean;
}

interface SortableCallbackItemProps {
  callback: MockCallback;
  index: number;
  canManage: boolean;
  onToggle: (callback: MockCallback) => void;
  onEdit: (callback: MockCallback) => void;
  onDelete: (callback: MockCallback) => void;
  onViewLogs: (callback: MockCallback) => void;
}

// 可拖拽的回调项
function SortableCallbackItem({
  callback,
  index,
  canManage,
  onToggle,
  onEdit,
  onDelete,
  onViewLogs,
}: SortableCallbackItemProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: callback.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getMethodBadge = (method: string) => {
    const config = {
      GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
      POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
      DELETE: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    } as const;

    return (
      <Badge
        variant="outline"
        className={
          config[method as keyof typeof config] || config.GET
        }
      >
        {method}
      </Badge>
    );
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 拖拽手柄 */}
            {canManage && (
              <button
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <GripVertical className="h-5 w-5" />
              </button>
            )}

            {/* 展开/收起按钮 */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {expanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>

            {/* 主要内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  #{index + 1}
                </span>
                {getMethodBadge(callback.method)}
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {callback.name || "未命名回调"}
                </span>
                {!callback.enabled && (
                  <Badge variant="outline" className="text-slate-500">
                    已禁用
                  </Badge>
                )}
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400 truncate mb-1">
                {callback.url}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                {callback.delay > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    延迟 {callback.delay}ms
                  </span>
                )}
              </div>

              {/* 展开内容 */}
              {expanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  {callback.headers &&
                    Object.keys(callback.headers).length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          请求头
                        </div>
                        <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(callback.headers, null, 2)}
                        </pre>
                      </div>
                    )}
                  {Boolean(callback.body && typeof callback.body === "object") && (
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        请求体模板
                      </div>
                      <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify(callback.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewLogs(callback)}
                className="h-8 w-8 p-0"
              >
                <Activity className="h-4 w-4" />
              </Button>

              {canManage && (
                <>
                  <Switch
                    checked={callback.enabled}
                    onCheckedChange={() => onToggle(callback)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(callback)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(callback)}
                    className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CallbackList({ mockApiId, projectId, canManage }: Props) {
  const [callbacks, setCallbacks] = useState<MockCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [editingCallback, setEditingCallback] = useState<MockCallback | null>(
    null,
  );
  const [viewingLogsCallback, setViewingLogsCallback] =
    useState<MockCallback | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    loadCallbacks();
  }, [mockApiId]);

  const loadCallbacks = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/callbacks`,
      );

      if (!response.ok) {
        throw new Error("获取回调列表失败");
      }

      const result = await response.json();
      setCallbacks(result.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "获取回调列表失败",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = callbacks.findIndex((cb) => cb.id === active.id);
    const newIndex = callbacks.findIndex((cb) => cb.id === over.id);

    const newCallbacks = arrayMove(callbacks, oldIndex, newIndex);
    setCallbacks(newCallbacks);

    // 更新顺序
    try {
      const updates = newCallbacks.map((cb, index) => ({
        id: cb.id,
        order: index,
      }));

      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/callbacks`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callbacks: updates }),
        },
      );

      if (!response.ok) {
        throw new Error("更新回调顺序失败");
      }

      toast.success("回调顺序已更新");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新回调顺序失败",
      );
      loadCallbacks(); // 重新加载
    }
  };

  const handleToggle = async (callback: MockCallback) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/callbacks/${callback.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !callback.enabled }),
        },
      );

      if (!response.ok) {
        throw new Error("更新回调状态失败");
      }

      toast.success(callback.enabled ? "回调已禁用" : "回调已启用");
      loadCallbacks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新回调状态失败",
      );
    }
  };

  const handleEdit = (callback: MockCallback) => {
    setEditingCallback(callback);
    setDialogOpen(true);
  };

  const handleDelete = async (callback: MockCallback) => {
    if (
      !confirm(`确定要删除回调 "${callback.name || callback.url}" 吗？`)
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/callbacks/${callback.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("删除回调失败");
      }

      toast.success("回调已删除");
      loadCallbacks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除回调失败");
    }
  };

  const handleViewLogs = (callback: MockCallback) => {
    setViewingLogsCallback(callback);
    setLogsDialogOpen(true);
  };

  const handleDialogClose = (reload?: boolean) => {
    setDialogOpen(false);
    setEditingCallback(null);
    if (reload) {
      loadCallbacks();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            共 {callbacks.length} 个回调配置
            {callbacks.length >= 10 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                （已达上限）
              </span>
            )}
          </div>
          <Button
            onClick={() => {
              setEditingCallback(null);
              setDialogOpen(true);
            }}
            disabled={callbacks.length >= 10}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            添加回调
          </Button>
        </div>
      )}

      {callbacks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              暂无回调配置
            </p>
            {canManage && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCallback(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                创建第一个回调
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={callbacks.map((cb) => cb.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {callbacks.map((callback, index) => (
                <SortableCallbackItem
                  key={callback.id}
                  callback={callback}
                  index={index}
                  canManage={canManage}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewLogs={handleViewLogs}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CallbackDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        mockApiId={mockApiId}
        projectId={projectId}
        callback={editingCallback}
      />

      <CallbackLogsDialog
        open={logsDialogOpen}
        onClose={() => {
          setLogsDialogOpen(false);
          setViewingLogsCallback(null);
        }}
        mockApiId={mockApiId}
        projectId={projectId}
        callback={viewingLogsCallback}
      />
    </div>
  );
}
