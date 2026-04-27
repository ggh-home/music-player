/*
 * @Author: gouguohua gh0410
 * @Date: 2026-03-05 22:01:13
 * @LastEditors: gouguohua gh0410
 * @LastEditTime: 2026-04-27 14:31:58
 * @FilePath: /music-player/next.config.mjs
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/** @type {import('next').NextConfig} */
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://bxdmkai.cn:6060").replace(
  /\/+$/,
  ""
);

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
