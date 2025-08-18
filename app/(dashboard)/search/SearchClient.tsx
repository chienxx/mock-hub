"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  FolderOpen,
  FileCode,
  ArrowRight,
  Clock,
  Hash,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HTTPMethod } from "@prisma/client";

interface Project {
  id: string;
  shortId: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  _count: {
    mockAPIs: number;
    members: number;
  };
}

interface MockApi {
  id: string;
  name: string | null;
  method: HTTPMethod;
  path: string;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  project: {
    id: string;
    shortId: string;
    name: string;
  };
}

interface SearchResults {
  projects: Project[];
  mockApis: MockApi[];
}

interface SearchClientProps {
  query: string;
  results: SearchResults;
}

export function SearchClient({
  query: initialQuery,
  results,
}: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "all");

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/search?q=${encodeURIComponent(searchQuery)}&type=${activeTab}`,
      );
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&type=${value}`);
    }
  };

  const getMethodColor = (method: HTTPMethod) => {
    switch (method) {
      case "GET":
        return "bg-green-500";
      case "POST":
        return "bg-blue-500";
      case "PUT":
        return "bg-yellow-500";
      case "DELETE":
        return "bg-red-500";
      // @ts-expect-error PATCH 可能在某些情况下出现
      case "PATCH":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const totalResults = results.projects.length + results.mockApis.length;

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">搜索</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索项目、Mock API..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
        </form>
      </div>

      {/* 搜索结果统计 */}
      {initialQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>搜索 &ldquo;{initialQuery}&rdquo; 找到</span>
          <Badge variant="secondary">{totalResults} 个结果</Badge>
          {results.projects.length > 0 && (
            <Badge variant="outline">{results.projects.length} 个项目</Badge>
          )}
          {results.mockApis.length > 0 && (
            <Badge variant="outline">{results.mockApis.length} 个 API</Badge>
          )}
        </div>
      )}

      {/* 搜索结果 */}
      {initialQuery ? (
        <Card>
          <CardHeader>
            <CardTitle>搜索结果</CardTitle>
            <CardDescription>在您有权限访问的项目和 API 中搜索</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">全部 ({totalResults})</TabsTrigger>
                <TabsTrigger value="project">
                  项目 ({results.projects.length})
                </TabsTrigger>
                <TabsTrigger value="api">
                  Mock API ({results.mockApis.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {results.projects.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      项目
                    </h3>
                    <div className="space-y-2">
                      {results.projects.slice(0, 5).map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.shortId}`}
                        >
                          <div className="p-3 rounded-lg border hover:bg-accent transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {highlightText(project.name, initialQuery)}
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    #{project.shortId}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {project._count.mockAPIs} APIs
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {project._count.members} 成员
                                  </Badge>
                                </div>
                                {project.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {highlightText(
                                      project.description,
                                      initialQuery,
                                    )}
                                  </p>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                      {results.projects.length > 5 && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => handleTabChange("project")}
                        >
                          查看全部 {results.projects.length} 个项目
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {results.mockApis.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      Mock API
                    </h3>
                    <div className="space-y-2">
                      {results.mockApis.slice(0, 5).map((api) => (
                        <Link
                          key={api.id}
                          href={`/projects/${api.project.shortId}/mocks/${api.id}`}
                        >
                          <div className="p-3 rounded-lg border hover:bg-accent transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`${getMethodColor(api.method)} text-white text-xs`}
                                  >
                                    {api.method}
                                  </Badge>
                                  <p className="font-medium">
                                    {highlightText(
                                      api.name || "Unnamed API",
                                      initialQuery,
                                    )}
                                  </p>
                                  {api.enabled ? (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      启用
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      禁用
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-mono text-muted-foreground mt-1">
                                  {highlightText(api.path, initialQuery)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  项目: {api.project.name}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                      {results.mockApis.length > 5 && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => handleTabChange("api")}
                        >
                          查看全部 {results.mockApis.length} 个 API
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {totalResults === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">没有找到相关结果</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      请尝试使用其他关键词或检查拼写
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="project" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {results.projects.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">没有找到相关项目</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {results.projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.shortId}`}
                        >
                          <div className="p-4 rounded-lg border hover:bg-accent transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                  <p className="font-medium">
                                    {highlightText(project.name, initialQuery)}
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    #{project.shortId}
                                  </Badge>
                                </div>
                                {project.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {highlightText(
                                      project.description,
                                      initialQuery,
                                    )}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <FileCode className="h-3 w-3" />
                                    {project._count.mockAPIs} APIs
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {project._count.members} 成员
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(
                                      project.updatedAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="api" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {results.mockApis.length === 0 ? (
                    <div className="text-center py-12">
                      <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">没有找到相关 API</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {results.mockApis.map((api) => (
                        <Link
                          key={api.id}
                          href={`/projects/${api.project.shortId}/mocks/${api.id}`}
                        >
                          <div className="p-4 rounded-lg border hover:bg-accent transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`${getMethodColor(api.method)} text-white text-xs`}
                                  >
                                    {api.method}
                                  </Badge>
                                  <p className="font-medium">
                                    {highlightText(
                                      api.name || "Unnamed API",
                                      initialQuery,
                                    )}
                                  </p>
                                  {api.enabled ? (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      启用
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      禁用
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-mono text-muted-foreground mt-1">
                                  {highlightText(api.path, initialQuery)}
                                </p>
                                {api.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {highlightText(
                                      api.description,
                                      initialQuery,
                                    )}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>项目: {api.project.name}</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(
                                      api.createdAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">开始搜索</p>
            <p className="text-sm text-muted-foreground mt-2">
              输入关键词搜索项目名称、描述、API 路径等
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-muted-foreground">热门搜索:</span>
              {["user", "api", "test", "login", "admin"].map((keyword) => (
                <Button
                  key={keyword}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(keyword);
                    router.push(`/search?q=${keyword}`);
                  }}
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
