import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("开始执行数据库种子...");
  
  // 创建默认管理员账户
  const hashedPassword = await bcrypt.hash("Zyuc@2025", 12);
  console.log("密码已加密");

  const admin = await prisma.user.upsert({
    where: { email: "admin@mockhub.com" },
    update: {},
    create: {
      email: "admin@mockhub.com",
      name: "系统管理员",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  
  console.log("管理员账户创建成功:", admin.email);
}

main()
  .then(async () => {
    console.log("种子数据执行完成");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("种子数据执行失败:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
