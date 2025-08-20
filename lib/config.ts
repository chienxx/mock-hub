// 应用配置
export const config = {
  // 获取应用基础 URL
  getAppUrl(): string {
    // 如果配置了环境变量，使用环境变量
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }

    // 客户端渲染时，使用当前浏览器的 origin（自动适配）
    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    // 服务端渲染时的默认值
    return "http://localhost:3000";
  },

  // 获取 Mock API 的基础 URL
  getMockApiUrl(projectShortId: string, path: string): string {
    const baseUrl = this.getAppUrl();
    return `${baseUrl}/api/mock/${projectShortId}${path}`;
  },
};
