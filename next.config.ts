import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 用经典渲染模型：首页按 10 分钟重新生成黄历，接口与会话页面按请求动态渲染。
  turbopack: {
    // 桌面上层目录另有 package-lock.json，明确以本项目为根。
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
