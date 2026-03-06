/*
 * @Author: gouguohua gh0410
 * @Date: 2026-03-05 22:01:13
 * @LastEditors: gouguohua gh0410
 * @LastEditTime: 2026-03-06 13:45:45
 * @FilePath: /music-player/next.config.mjs
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
        destination: "http://localhost:6000/:path*",
      },
    ];
  },
};

export default nextConfig;
