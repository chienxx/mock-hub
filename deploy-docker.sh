#!/bin/bash

# 部署脚本
# 使用方法: ./deploy-docker.sh

set -e

# 预设服务器信息
SERVER="root@192.168.131.219"
SSH_PORT="22019"
TARGET_DIR="/home/mock-hub"  
ARCHIVE_NAME="mock-hub_$(date +%Y%m%d_%H%M%S).zip"

# SSH 连接复用配置
SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=10m"

echo "=== 开始部署 ==="

# 建立主连接
echo "建立SSH连接..."
ssh -p "$SSH_PORT" $SSH_OPTS -N -f "$SERVER" 2>/dev/null || true

# 1. 打包文件（排除 .gitignore 中的文件）
echo "打包项目文件..."
# 先用 git archive 打包已提交的文件
git archive --format=zip --output="$ARCHIVE_NAME" HEAD

# 添加必要的未提交文件（不包括 .yarn 目录）
zip -u "$ARCHIVE_NAME" Dockerfile .dockerignore .env 2>/dev/null || true

echo "打包完成: $ARCHIVE_NAME ($(du -h "$ARCHIVE_NAME" | cut -f1))"

# 2. 上传到服务器
echo "上传文件到服务器..."
ssh -p "$SSH_PORT" $SSH_OPTS "$SERVER" "mkdir -p $TARGET_DIR"

# 备份旧版本
ssh -p "$SSH_PORT" $SSH_OPTS "$SERVER" "if [ -d '$TARGET_DIR/app' ]; then \
    echo '备份现有版本...'; \
    mv '$TARGET_DIR' '${TARGET_DIR}_backup_$(date +%Y%m%d_%H%M%S)'; \
    mkdir -p '$TARGET_DIR'; \
fi"

scp -P "$SSH_PORT" -o ControlPath=/tmp/ssh-%r@%h:%p "$ARCHIVE_NAME" "$SERVER:$TARGET_DIR/"
echo "上传完成"

# 3. 在服务器上解压、构建和运行
echo "在服务器上执行部署..."
ssh -T -p "$SSH_PORT" $SSH_OPTS "$SERVER" << EOF
    set -e
    cd $TARGET_DIR
    
    # 解压文件
    echo "解压文件..."
    unzip -o -q $ARCHIVE_NAME
    rm $ARCHIVE_NAME
    
    # 构建Docker镜像
    echo "构建Docker镜像..."
    docker build -t mock-hub:latest .
    
    # 停止并删除旧容器
    docker stop mock-hub 2>/dev/null || true
    docker rm mock-hub 2>/dev/null || true
    
    # 运行新容器
    echo "启动容器..."
    docker run -d \
        --name mock-hub \
        --restart unless-stopped \
        -p 3000:3000 \
        mock-hub:latest
    
    echo "容器状态:"
    docker ps | grep mock-hub || echo "容器启动失败"
EOF

# 清理本地文件
rm "$ARCHIVE_NAME"

echo "=== 部署完成 ==="
echo "访问地址: http://192.168.131.219:3000"