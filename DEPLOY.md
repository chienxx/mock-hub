# Mock Hub 部署文档

## 📋 部署前准备

### 环境要求

- Node.js 18.0+
- MySQL 8.0+
- Redis 7.x
- Yarn 4.2.2+ (项目强制使用)

## 🚀 部署步骤

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd mock-hub
```

### 2. 安装依赖

```bash
yarn install
```

### 3. 环境配置

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="mysql://username:password@localhost:3306/mock_hub"

# Redis 配置
REDIS_URL="redis://localhost:6379"

# NextAuth 配置
NEXTAUTH_SECRET="your-super-secret-key-at-least-32-characters"
NEXTAUTH_URL="https://your-domain.com"

# 应用配置 (可选)
# NEXT_PUBLIC_APP_URL="http://localhost:3000"  # 生产环境域名，不配置默认为 localhost:3000
```

### 4. 数据库初始化

```bash
# 同步数据库结构
yarn db:push

# 填充初始数据（可选）
yarn db:seed
```

### 5. 构建应用

```bash
yarn build
```

### 6. 启动生产服务

```bash
# 使用 PM2 管理进程
npm install -g pm2

# 启动应用
pm2 start yarn --name "mock-hub" -- start

# 设置开机自启
pm2 startup
pm2 save
```

### 7. 监控和日志

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs mock-hub

# 重启应用
pm2 restart mock-hub

# 停止应用
pm2 stop mock-hub
```

## 🚨 故障排查

### 常见问题

**1. 数据库连接失败**

```bash
# 检查 MySQL 服务
sudo systemctl status mysql
# 检查连接
mysql -u username -p -h localhost
```

**2. Redis 连接失败**

```bash
# 检查 Redis 服务
sudo systemctl status redis
# 测试连接
redis-cli ping
```

**3. 应用启动失败**

```bash
# 检查应用日志
pm2 logs mock-hub
# 检查端口占用
netstat -tulpn | grep :3000
```

---

**部署完成后，访问 `http://localhost:3000` 即可使用 Mock Hub！** 🎉
