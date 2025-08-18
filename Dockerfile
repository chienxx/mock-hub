# 使用 Node.js 20 Alpine 镜像
FROM node:20-alpine

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 设置工作目录
WORKDIR /app

# 启用 Corepack 并设置 Yarn 版本
RUN corepack enable && corepack prepare yarn@4.2.2 --activate

# 复制依赖文件
COPY package.json yarn.lock ./

# 如果有 .yarnrc.yml 则复制（可选）
COPY .yarnrc.yml* ./

# 安装依赖
RUN yarn install --frozen-lockfile

# 复制项目文件
COPY . .

# 复制环境配置文件
COPY .env .env

# 生成 Prisma 客户端
RUN yarn prisma generate

# 构建 Next.js 应用
RUN yarn build

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=development
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# 启动应用
CMD ["yarn", "start"]