#!/usr/bin/env tsx

/**
 * API日志清理脚本
 * 通过Linux crontab定时执行
 *
 * 使用方法:
 * yarn cleanup:logs              # 清理90天前的日志（默认）
 * yarn cleanup:logs --days 30    # 清理30天前的日志
 *
 * Crontab配置示例:
 * 0 2 * * * cd /path/to/mock-hub && yarn cleanup:logs >> /var/log/mock-hub-cleanup.log 2>&1
 */

import { prisma } from "@/lib/prisma";

/**
 * 清理超过指定天数的API日志
 * @param retentionDays 保留天数，默认90天
 */
async function cleanupOldAPILogs(retentionDays: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`开始清理 ${cutoffDate.toISOString()} 之前的API日志...`);

    // 批量删除过期日志
    const result = await prisma.aPILog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`成功清理 ${result.count} 条过期API日志`);
    return {
      success: true,
      deletedCount: result.count,
      cutoffDate,
    };
  } catch (error) {
    console.error("清理API日志失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取API日志统计信息
 */
async function getAPILogStats(retentionDays: number = 90) {
  try {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [totalCount, oldCount, recentCount] = await Promise.all([
      // 总日志数
      prisma.aPILog.count(),
      // 超过指定天数的日志数
      prisma.aPILog.count({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      }),
      // 最近24小时的日志数
      prisma.aPILog.count({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalCount,
      oldCount,
      recentCount,
      percentageToDelete: totalCount > 0 ? (oldCount / totalCount) * 100 : 0,
    };
  } catch (error) {
    console.error("获取API日志统计失败:", error);
    throw error;
  }
}

async function main() {
  console.log("========================================");
  console.log("API日志清理任务");
  console.log(`执行时间: ${new Date().toISOString()}`);
  console.log("========================================\n");

  // 解析命令行参数或使用环境变量
  const args = process.argv.slice(2);
  let retentionDays = process.env.LOG_RETENTION_DAYS
    ? parseInt(process.env.LOG_RETENTION_DAYS)
    : 90;

  // 命令行参数优先级更高
  const daysIndex = args.indexOf("--days");
  if (daysIndex !== -1 && args[daysIndex + 1]) {
    const days = parseInt(args[daysIndex + 1]);
    if (!isNaN(days) && days > 0 && days <= 365) {
      retentionDays = days;
    }
  }

  // 确保retentionDays有效
  if (isNaN(retentionDays) || retentionDays < 1 || retentionDays > 365) {
    retentionDays = 90;
  }

  try {
    // 获取清理前的统计信息
    console.log("获取日志统计信息...");
    const statsBefore = await getAPILogStats(retentionDays);
    console.log("清理前统计:");
    console.log(`  总日志数: ${statsBefore.totalCount}`);
    console.log(`  超过${retentionDays}天的日志: ${statsBefore.oldCount}`);
    console.log(`  最近24小时日志: ${statsBefore.recentCount}`);
    console.log(
      `  待删除比例: ${statsBefore.percentageToDelete.toFixed(2)}%\n`,
    );

    // 执行清理
    console.log(`开始清理超过 ${retentionDays} 天的日志...`);
    const result = await cleanupOldAPILogs(retentionDays);

    if (result.success) {
      console.log(`✅ 清理成功！`);
      console.log(`  删除日志数: ${result.deletedCount}`);
      console.log(`  截止日期: ${result.cutoffDate?.toISOString()}\n`);

      // 获取清理后的统计信息
      const statsAfter = await getAPILogStats(retentionDays);
      console.log("清理后统计:");
      console.log(`  总日志数: ${statsAfter.totalCount}`);
      console.log(`  超过90天的日志: ${statsAfter.oldCount}`);
      console.log(`  最近24小时日志: ${statsAfter.recentCount}`);
    } else {
      console.error(`❌ 清理失败: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("执行清理任务时发生错误:", error);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("清理任务完成");
  console.log("========================================");
}

// 执行主函数
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("脚本执行失败:", error);
    process.exit(1);
  });
