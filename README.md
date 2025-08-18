# Mock Hub

🚀 企业级 Mock API 管理平台，基于 Next.js 15 构建的现代化测试解决方案

## ✨ 核心特性

### 🎯 Mock API 管理

- **智能路径匹配** - 支持动态路径和参数匹配
- **多种HTTP方法** - GET、POST、PUT、DELETE 全覆盖
- **Faker.js 集成** - 真实数据模拟生成
- **规则引擎** - 基于条件的动态响应策略
- **延迟模拟** - 可配置响应延迟，模拟真实网络环境

### 🔄 智能代理模式

- **MOCK 模式** - 纯 Mock 数据响应
- **PROXY 模式** - 透明代理到真实服务
- **AUTO 模式** - 智能切换，有 Mock 用 Mock，无 Mock 则代理

### 👥 团队协作

- **多角色权限** - 管理者、开发者、访客三级权限体系
- **项目成员管理** - 灵活的成员邀请和权限分配
- **实时通知** - 基于 SSE 的团队协作消息推送

### 📊 监控分析

- **API 调用日志** - 详细的请求响应记录
- **性能统计** - 响应时间和调用频次分析
- **实时监控** - SSE 实时日志流推送
- **数据分析** - 项目维度的统计概览

## 🏗️ 技术架构

### 核心技术栈

```
Frontend:  Next.js 15.4.6 + React 19 + TypeScript 5
Styling:   Tailwind CSS 4 + shadcn/ui 组件库
Backend:   Node.js + Prisma ORM 6.13.0
Database:  MySQL 8.0+
Cache:     Redis 7.x (ioredis)
Auth:      NextAuth 5.0 (beta)
Query:     TanStack Query 5.84.2
Mock:      Faker.js 9.9.0 (中文本地化) + 自研规则引擎
```

### 项目架构

```
mock-hub/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 认证模块
│   │   ├── login/               # 登录页面
│   │   └── register/            # 注册页面
│   ├── (dashboard)/             # 主应用 (受保护路由)
│   │   ├── page.tsx            # 仪表盘首页
│   │   ├── projects/           # 项目管理
│   │   │   ├── page.tsx       # 项目列表
│   │   │   └── [id]/          # 项目详情
│   │   │       ├── page.tsx   # 项目概览
│   │   │       ├── mocks/     # Mock API 管理
│   │   │       ├── logs/      # 调用日志
│   │   │       └── settings/  # 项目设置
│   │   ├── users/              # 用户管理 (仅管理员)
│   │   ├── notifications/      # 通知中心
│   │   └── help/              # 帮助中心
│   └── api/                     # API 路由
│       ├── auth/               # NextAuth 认证
│       ├── projects/           # 项目相关 API
│       ├── users/              # 用户管理 API
│       ├── notifications/      # 通知 API
│       └── mock/[shortId]/     # 核心 Mock 服务入口
├── components/                  # React 组件库
│   ├── ui/                     # shadcn/ui 基础组件
│   ├── layout/                 # 布局组件
│   │   ├── header.tsx         # 顶部导航
│   │   ├── sidebar.tsx        # 侧边栏
│   │   └── collapsible-sidebar.tsx
│   ├── projects/               # 项目相关组件
│   ├── mocks/                  # Mock API 组件
│   ├── notifications/          # 通知组件
│   ├── providers/              # React Context 提供者
│   └── user/                   # 用户相关组件
├── lib/                        # 工具库
│   ├── auth.ts                # NextAuth 配置
│   ├── prisma.ts              # Prisma 客户端
│   ├── redis.ts               # Redis 连接
│   ├── api/                   # API 工具
│   ├── validations/           # Zod 数据验证
│   └── utils/                 # 通用工具
└── prisma/                     # 数据库
    ├── schema.prisma          # 数据模型定义
    └── seed.ts                # 测试数据种子
```

## 🗄️ 数据模型设计

### 核心实体关系

```
User (用户)
├── UserRole: ADMIN | USER
├── UserStatus: ACTIVE | INACTIVE | BANNED
└── 关联: Project(创建), ProjectMember(参与), MockAPI(创建), Notification

Project (项目)
├── ProjectStatus: ACTIVE | ARCHIVED | DISABLED
├── shortId: 唯一短ID (用于Mock服务URL)
└── 关联: Creator, Members, MockAPIs, Collections

ProjectMember (项目成员)
├── ProjectRole: MANAGER | DEVELOPER | VIEWER
└── 关联: User, Project

MockAPI (Mock接口)
├── HTTPMethod: GET | POST | PUT | DELETE
├── ProxyMode: MOCK | PROXY | AUTO
├── useFakerJs: 是否启用Faker.js语法 (支持 {{faker.module.method}} 格式)
└── 关联: Project, Collection, Creator, MockRules, APILogs

Collection (接口分组)
├── 支持层级嵌套 (parentId)
├── 排序字段 (order)
└── 关联: Project, MockAPIs

MockRule (Mock规则)
├── 优先级排序 (priority)
├── 条件匹配 (conditions JSON)
└── 关联: MockAPI

APILog (调用日志)
├── 请求信息: method, path, query, headers, body
├── 响应信息: statusCode, headers, body, responseTime
├── 代理信息: isProxied, proxyUrl
└── 关联: MockAPI, User

Notification (通知)
├── NotificationType: PROJECT | MOCK | API_ERROR | SYSTEM
├── metadata: 额外数据 (JSON)
└── 关联: User
```

### 关键索引优化

```sql
-- 高频查询优化
projects: shortId, status, createdAt, creatorId
mock_apis: projectId+enabled, projectId+path+method
api_logs: mockApiId+createdAt, createdAt+statusCode
notifications: userId+isRead, userId+createdAt
```

## 🚀 Mock 服务核心

### 服务入口设计

```
路由模式: /api/mock/{projectShortId}/{...apiPath}
示例:     /api/mock/abc123/api/users/list
         /api/mock/abc123/api/users/1
```

### 代理模式逻辑

```typescript
// 核心匹配逻辑
switch (mockAPI.proxyMode) {
  case "MOCK":
    return generateMockResponse(mockAPI);
  case "PROXY":
    return proxyToBaseUrl(project.proxyUrl);
  case "AUTO":
    const matchedMock = findMatchingMock(path, method);
    return matchedMock
      ? generateMockResponse(matchedMock)
      : proxyToBaseUrl(project.proxyUrl);
}
```

### Faker.js 语法集成

```json
// 支持完整 Faker.js 语法 - 使用 {{faker.module.method}} 格式
{
  "code": 200,
  "data": {
    "_repeat_5": {
      "id": "{{faker.string.uuid}}",
      "name": "{{faker.person.fullName}}",
      "email": "{{faker.internet.email}}",
      "avatar": "{{faker.image.avatar}}",
      "phone": "{{faker.phone.number}}",
      "address": {
        "street": "{{faker.location.streetAddress}}",
        "city": "{{faker.location.city}}",
        "country": "{{faker.location.country}}"
      },
      "createdAt": "{{faker.date.recent}}",
      "status": "{{faker.helpers.arrayElement([\"active\", \"inactive\"])}}"
    }
  }
}
```

## 📦 安装部署

### 环境要求

- Node.js 18.0+
- MySQL 8.0+
- Redis 7.x
- Yarn 4.2.2+ (项目强制使用)

### 快速开始

1. **克隆项目**

```bash
git clone <repository-url>
cd mock-hub
```

2. **安装依赖**

```bash
yarn install
```

3. **环境配置**

```env
# 数据库连接
DATABASE_URL="mysql://user:pass@localhost:3306/mock_hub"

# Redis 缓存
REDIS_URL="redis://localhost:6379"

# NextAuth 配置
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# 应用配置 (可选)
# NEXT_PUBLIC_APP_URL="http://localhost:3000"  # 生产环境域名，不配置默认为 localhost:3000
```

4. **数据库初始化**

```bash
yarn db:push    # 同步数据库结构
yarn db:seed    # 导入测试数据
```

5. **启动开发服务**

```bash
yarn dev        # 开发模式
# 或
yarn build && yarn start  # 生产模式
```

### 可用脚本

```bash
yarn dev           # 启动开发服务器
yarn build         # 构建生产版本
yarn start         # 启动生产服务器
yarn lint          # ESLint 代码检查
yarn prettier     # Prettier 代码格式化
yarn db:push      # 同步数据库结构
yarn db:seed      # 填充测试数据
yarn db:studio    # 打开 Prisma Studio
```

## 🎮 使用指南

### 项目管理

1. **创建项目** - 设置项目名称、描述和代理URL
2. **成员管理** - 邀请团队成员，分配角色权限
3. **分组管理** - 创建接口分组，支持层级结构

### Mock API 创建

1. **基础配置**

```json
{
  "path": "/api/users/:id",
  "method": "GET",
  "name": "获取用户信息",
  "proxyMode": "AUTO"
}
```

2. **响应配置**

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "code": 200,
    "data": {
      "id": "{{faker.string.uuid}}",
      "name": "{{faker.person.fullName}}",
      "email": "{{faker.internet.email}}",
      "avatar": "{{faker.image.avatar}}",
      "phone": "{{faker.phone.number}}",
      "createdAt": "{{faker.date.recent}}"
    }
  }
}
```

### 高级规则

```json
{
  "name": "管理员用户规则",
  "priority": 10,
  "conditions": [
    {
      "field": "headers.authorization",
      "operator": "contains",
      "value": "admin"
    }
  ],
  "response": {
    "statusCode": 200,
    "body": {
      "role": "admin",
      "permissions": ["read", "write", "delete"]
    }
  }
}
```

## 🔧 开发规范

### 代码风格

- TypeScript 严格模式，避免 `any` 类型
- 使用 Prettier + ESLint 保持代码一致性
- React 函数组件 + Hooks 模式
- 遵循 Next.js 15 App Router 最佳实践

### 提交规范

```bash
yarn prettier     # 格式化代码
yarn lint         # 检查代码质量
git add .
git commit -m "feat: 添加新功能"
```

### 性能优化

- **缓存策略**: Redis 缓存热点Mock数据 (TTL: 5分钟)
- **数据库优化**: 合理使用索引，分页查询
- **前端优化**: React.memo, useMemo, useCallback
- **服务端优化**: Next.js 服务端组件，减少客户端 JavaScript

## 🔒 安全特性

- **权限控制**: 基于角色的访问控制 (RBAC)
- **输入验证**: Zod 严格的类型验证
- **SQL 注入防护**: Prisma ORM 参数化查询
- **XSS 防护**: 输入输出转义处理
- **CSRF 防护**: NextAuth 内置保护
- **认证授权**: NextAuth 5 多策略认证

## 📊 监控分析

### 关键指标

- API 调用次数和频率
- 响应时间分布
- 错误率统计
- 用户活跃度
- 项目使用情况

### 实时功能

- SSE 实时日志推送
- 团队协作通知
- 系统状态监控

---

**Mock Hub** - 让API开发更简单、更高效 🚀
