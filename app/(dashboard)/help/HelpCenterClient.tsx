"use client";

import { useState } from "react";
import {
  HelpCircle,
  ChevronRight,
  Search,
  Users,
  Code,
  Hash,
  Shield,
  Clock,
  Layers,
  GitBranch,
  BookOpen,
  Settings,
  Play,
  FolderOpen,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function HelpCenterClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 快速开始步骤
  const quickStartSteps = [
    {
      icon: FolderOpen,
      title: "创建项目",
      description: "设置项目基本信息和短ID",
    },
    {
      icon: Code,
      title: "定义接口",
      description: "配置Mock API路径和响应",
    },
    {
      icon: Play,
      title: "开始调用",
      description: "使用生成的URL测试接口",
    },
    {
      icon: Activity,
      title: "查看日志",
      description: "监控API调用情况",
    },
  ];

  // Faker.js 语法示例
  const fakerExamples = [
    {
      category: "基础类型",
      examples: [
        {
          syntax: "{{faker.datatype.boolean}}",
          desc: "布尔值",
          result: "true",
        },
        { syntax: "{{faker.number.int}}", desc: "随机整数", result: "42" },
        {
          syntax: "{{faker.number.float}}",
          desc: "随机浮点数",
          result: "23.47",
        },
        {
          syntax: "{{faker.string.uuid}}",
          desc: "UUID",
          result: '"550e8400-e29b..."',
        },
      ],
    },
    {
      category: "个人信息",
      examples: [
        {
          syntax: "{{faker.person.fullName}}",
          desc: "完整姓名",
          result: "张小明",
        },
        {
          syntax: "{{faker.person.jobTitle}}",
          desc: "职位",
          result: "高级产品经理",
        },
        {
          syntax: "{{faker.internet.email}}",
          desc: "邮箱",
          result: "zhang.xiaoming@example.com",
        },
        {
          syntax: "{{faker.phone.number}}",
          desc: "电话",
          result: "186-1234-5678",
        },
      ],
    },
    {
      category: "日期时间",
      examples: [
        {
          syntax: "{{faker.date.recent}}",
          desc: "最近日期",
          result: "2024-03-15T10:30:00.000Z",
        },
        {
          syntax: "{{faker.date.past}}",
          desc: "过去日期",
          result: "2023-08-20T14:25:30.000Z",
        },
        {
          syntax: "{{faker.date.future}}",
          desc: "未来日期",
          result: "2025-01-10T09:15:45.000Z",
        },
        {
          syntax: "{{faker.date.birthdate}}",
          desc: "生日",
          result: "1990-05-15T00:00:00.000Z",
        },
      ],
    },
    {
      category: "地址位置",
      examples: [
        { syntax: "{{faker.location.city}}", desc: "城市", result: "北京市" },
        {
          syntax: "{{faker.location.streetAddress}}",
          desc: "街道地址",
          result: "建国路123号",
        },
        { syntax: "{{faker.location.country}}", desc: "国家", result: "中国" },
        {
          syntax: "{{faker.location.zipCode}}",
          desc: "邮编",
          result: "100022",
        },
      ],
    },
    {
      category: "商业数据",
      examples: [
        {
          syntax: "{{faker.commerce.productName}}",
          desc: "产品名称",
          result: "智能手表",
        },
        { syntax: "{{faker.commerce.price}}", desc: "价格", result: "299.99" },
        {
          syntax: "{{faker.company.name}}",
          desc: "公司名称",
          result: "科技创新有限公司",
        },
        {
          syntax: "{{faker.company.catchPhrase}}",
          desc: "公司口号",
          result: "创新引领未来",
        },
      ],
    },
    {
      category: "文本内容",
      examples: [
        {
          syntax: "{{faker.lorem.sentence}}",
          desc: "句子",
          result: "Lorem ipsum dolor sit amet.",
        },
        {
          syntax: "{{faker.lorem.paragraph}}",
          desc: "段落",
          result: "一段随机生成的文本内容...",
        },
        {
          syntax: "{{faker.lorem.slug}}",
          desc: "URL slug",
          result: "lorem-ipsum-dolor",
        },
        { syntax: "{{faker.lorem.word}}", desc: "单词", result: "ipsum" },
      ],
    },
  ];

  // 常见问题
  const faqCategories = [
    {
      title: "基础使用",
      icon: BookOpen,
      questions: [
        {
          q: "如何创建第一个 Mock API？",
          a: '进入项目后，点击 "新建 Mock"，填写接口路径和方法，配置响应数据即可。系统会自动生成可访问的 URL 地址。',
        },
        {
          q: "项目短 ID 有什么作用？",
          a: "短 ID 是项目的唯一标识，用于生成 Mock 服务的访问地址，格式为 /api/mock/{shortId}/your-api-path",
        },
        {
          q: "支持哪些 HTTP 方法？",
          a: "支持所有标准 HTTP 方法：GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS 等。",
        },
        {
          q: "什么是响应规则？",
          a: "可以根据请求参数、Headers 等条件返回不同的响应数据，模拟各种业务场景。",
        },
      ],
    },
    {
      title: "高级功能",
      icon: Settings,
      questions: [
        {
          q: "什么是代理模式？",
          a: "设置 baseUrl 后，可选择 MOCK（仅模拟）、PROXY（仅代理）或 AUTO（自动判断）模式。",
        },
        {
          q: "如何使用 Collection 分组？",
          a: "Collection 用于组织和管理相关的 API 接口，支持多层级嵌套，方便项目结构化管理。",
        },
        {
          q: "支持批量导入吗？",
          a: "支持导入 Swagger/OpenAPI 格式的接口文档，快速生成 Mock API。",
        },
        {
          q: "如何设置延迟响应？",
          a: "在 Mock API 配置中可以设置响应延迟时间，模拟真实网络环境。",
        },
      ],
    },
    {
      title: "团队协作",
      icon: Users,
      questions: [
        {
          q: "项目有哪些角色权限？",
          a: "管理者：完全权限；开发者：创建和编辑 Mock；访客：仅查看和调用接口。",
        },
        {
          q: "如何邀请团队成员？",
          a: "在项目设置的成员管理页面，输入成员邮箱并选择相应角色即可邀请。",
        },
        {
          q: "能否导出项目配置？",
          a: "支持导出为 JSON 格式，包含所有 Mock 配置、规则等，方便备份和迁移。",
        },
      ],
    },
  ];

  // 最佳实践
  const bestPractices = [
    {
      icon: Layers,
      title: "合理组织项目结构",
      description: "使用 Collection 分组管理相关接口，保持清晰的层级关系",
    },
    {
      icon: GitBranch,
      title: "善用响应规则",
      description: "为不同场景配置条件响应，模拟真实业务逻辑",
    },
    {
      icon: Clock,
      title: "设置合理延迟",
      description: "模拟真实网络环境，帮助前端处理loading状态",
    },
    {
      icon: Shield,
      title: "数据安全",
      description: "使用 Faker.js 生成模拟数据，避免使用真实敏感信息",
    },
  ];

  // 搜索过滤
  const filterFAQs = (faqs: typeof faqCategories) => {
    if (!searchQuery) return faqs;

    return faqs
      .map((category) => ({
        ...category,
        questions: category.questions.filter(
          (q) =>
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((category) => category.questions.length > 0);
  };

  const filteredFaqs = selectedCategory
    ? filterFAQs(faqCategories).filter((cat) => cat.title === selectedCategory)
    : filterFAQs(faqCategories);

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-800 dark:to-slate-600 rounded-xl flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              帮助中心
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              快速了解 Mock Hub 的功能和使用方法
            </p>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="搜索常见问题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* 快速开始 */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          快速开始
        </h2>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quickStartSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="relative">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                          {index + 1}. {step.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {index < quickStartSteps.length - 1 && (
                      <ChevronRight className="hidden md:block absolute right-0 top-4 h-4 w-4 text-slate-300 dark:text-slate-700" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Faker.js 语法介绍 */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Faker.js 语法示例
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {fakerExamples.map((category) => (
            <Card
              key={category.category}
              className="border-slate-200 dark:border-slate-800"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.examples.map((example, index) => (
                    <div
                      key={index}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-1">
                        <code className="text-xs font-mono text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {example.syntax}
                        </code>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {example.desc}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          结果：
                        </span>
                        <div className="text-xs font-mono text-green-600 dark:text-green-400">
                          {example.result}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">提示：</span> 使用{" "}
            <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">{`{{faker.module.method}}`}</code>{" "}
            语法在响应数据中生成随机数据。 支持参数传递，如{" "}
            <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">{`{{faker.number.int({"min": 1, "max": 100})}}`}</code>
          </p>
        </div>
      </section>

      {/* 常见问题 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            常见问题
          </h2>
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="h-8"
            >
              全部
            </Button>
            {faqCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.title}
                  variant={
                    selectedCategory === cat.title ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(cat.title)}
                  className="h-8"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {cat.title}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {filteredFaqs.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.title}
                className="border-slate-200 dark:border-slate-800"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.title}-${index}`}
                        className="border-slate-200 dark:border-slate-800"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-3">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {item.q}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.a}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 最佳实践 */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          最佳实践
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {bestPractices.map((practice, index) => {
            const Icon = practice.icon;
            return (
              <Card
                key={index}
                className="border-slate-200 dark:border-slate-800"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                        {practice.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {practice.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
