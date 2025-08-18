import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 创建默认管理员账户
  const hashedPassword = await bcrypt.hash("admin123456", 12);

  await prisma.user.upsert({
    where: { email: "admin@mockhub.com" },
    update: {},
    create: {
      email: "admin@mockhub.com",
      name: "系统管理员",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // Seeded admin user
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
