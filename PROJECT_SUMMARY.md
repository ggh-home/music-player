# Music Player - 项目总结

## 项目概述

基于 Next.js 14 + TypeScript + Tailwind CSS 构建的现代化音乐播放器 Web 应用。

## 完整功能列表

### 1. 用户认证
- ✅ 用户注册 (`/login` - 注册标签页)
- ✅ 用户登录 (`/login` - 登录标签页)
- ✅ 登出功能 (Header 下拉菜单)
- ✅ 查看用户信息 (`/profile`)
- ✅ 升级会员 (微信支付) - Settings 页面

### 2. 搜索功能
- ✅ 歌曲搜索 (`/search` - 歌曲标签页)
- ✅ 歌手搜索 (`/search` - 歌手标签页)
- ✅ 歌单搜索 (`/search` - 歌单标签页)
- ✅ 有声书搜索 (`/search` - 有声书标签页)
- ✅ 搜索历史记录 (本地存储)

### 3. 歌单管理
- ✅ 创建歌单 (`/playlists` - 新建歌单按钮)
- ✅ 收藏歌单 (`/playlists` - 收藏标签页)
- ✅ 导入第三方歌单 (QQ音乐/网易云音乐)
- ✅ 管理歌单 (歌单详情页)
- ✅ 播放歌单 (播放全部按钮)

### 4. 有声书
- ✅ 收藏有声书专辑 (`/audiobooks` - 我的收藏)
- ✅ 缓存音频 (`/audiobooks` - 已缓存)
- ✅ 播放有声书 (播放器支持)
- ✅ 记录播放进度 (Zustand store)
- ✅ 跳过片头片尾 (播放器设置)

### 5. 播放器核心功能
- ✅ 播放/暂停控制
- ✅ 上一曲/下一曲
- ✅ 进度条拖动
- ✅ 播放模式 (顺序/随机/单曲循环/列表循环)
- ✅ 播放速度调节 (0.5x - 2x)
- ✅ 定时关闭 (Settings 页面)
- ✅ 音质选择 (标准/高品质/无损/Hi-Res)
- ✅ 红心收藏 (PlayerBar)
- ✅ 下载功能 (PlayerBar)
- ✅ 歌词显示 (待完善)
- ✅ 播放列表查看 (PlayerBar)

### 6. 下载管理
- ✅ 下载队列管理 (`/downloads`)
- ✅ 暂停/继续/重试/清空
- ✅ 每日限额显示

### 7. 账号相关
- ✅ 查看限额信息 (`/settings` - 限额标签页)
  - 音乐播放次数
  - 有声书播放次数
  - 下载次数
  - 无损次数
  - 缓存次数

### 8. 其他功能
- ✅ 深色/浅色主题切换
- ✅ 响应式布局
- ✅ 侧边栏导航
- ✅ 搜索栏
- ✅ 用户菜单

## 页面路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | 推荐歌单、新歌、Banner |
| `/login` | 登录/注册 | 用户认证 |
| `/search` | 搜索 | 歌曲/歌手/歌单/有声书搜索 |
| `/library` | 音乐库 | 喜欢的歌曲/歌单/歌手 |
| `/liked` | 喜欢的歌曲 | 红心歌曲列表 |
| `/playlists` | 歌单管理 | 创建/收藏/导入歌单 |
| `/playlist/[id]` | 歌单详情 | 歌单歌曲列表 |
| `/audiobooks` | 有声书 | 收藏/缓存/发现 |
| `/downloads` | 下载管理 | 下载队列/已完成 |
| `/settings` | 设置 | 账号/播放/通知/限额 |
| `/profile` | 个人中心 | 用户信息/统计 |
| `/artists` | 歌手列表 | 关注/推荐歌手 |
| `/artist/[id]` | 歌手详情 | 歌曲/专辑 |

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3
- **UI 组件**: Radix UI (Headless)
- **状态管理**: Zustand + Persist
- **HTTP 客户端**: Axios
- **主题**: next-themes
- **提示**: react-hot-toast

## 项目结构

```
music-player/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   ├── components/
│   │   ├── ui/                 # UI 组件 (Button, Input, Card 等)
│   │   ├── layout/             # 布局组件 (Sidebar, Header, MainLayout)
│   │   └── player/             # 播放器组件 (PlayerBar)
│   ├── lib/                    # 工具函数
│   ├── services/               # API 服务
│   ├── stores/                 # Zustand 状态管理
│   └── types/                  # TypeScript 类型定义
├── .vscode/                    # VS Code 配置
├── public/                     # 静态资源
└── 配置文件...
```

## 快速开始

```bash
# 1. 进入项目目录
cd music-player

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 设置 API 地址

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:3000
```

## 后端 API 对接

根据提供的 Postman 集合，已实现以下 API 接口：

### 用户认证
- `POST /user/create` - 注册
- `POST /user/login` - 登录
- `GET /user/info` - 获取用户信息
- `POST /user/upgrade` - 升级会员
- `GET /user/quota` - 获取限额信息

### 搜索
- `GET /search/music/:keyword` - 搜索歌曲
- `GET /search/music/detail/:platform/:id` - 歌曲详情
- `GET /search/singer/:keyword` - 搜索歌手
- `GET /search/artist/songs/:platform/:id` - 歌手歌曲
- `GET /search/artist/albums/:platform/:id` - 歌手专辑
- `GET /search/album/detail/:platform/:id` - 专辑详情
- `GET /search/playlist/:keyword` - 搜索歌单
- `GET /search/playlist/songs/:platform/:id` - 歌单歌曲
- `GET /search/audiobook/:keyword` - 搜索有声书

### 歌单
- `POST /playlist/create` - 创建歌单
- `GET /playlist/my` - 我的歌单
- `GET /playlist/collected` - 收藏的歌单
- `POST /playlist/collect` - 收藏歌单
- `DELETE /playlist/collect/:id` - 取消收藏
- `POST /playlist/import` - 导入歌单

### 喜欢
- `POST /like/song` - 喜欢歌曲
- `DELETE /like/song/:id` - 取消喜欢
- `GET /like/songs` - 喜欢的歌曲

### 有声书
- `POST /audiobook/collect` - 收藏有声书
- `GET /audiobook/collected` - 收藏的有声书
- `GET /audiobook/cached` - 缓存的音频

### 下载
- `GET /download/queue` - 下载队列
- `POST /download` - 添加下载
- `POST /download/:id/pause` - 暂停下载
- `POST /download/:id/resume` - 继续下载
- `POST /download/:id/retry` - 重试下载
- `DELETE /download/:id` - 删除下载
- `DELETE /download/clear` - 清空队列

## VS Code 配置

项目已配置好 VS Code 开发环境：
- TypeScript 支持
- ESLint 代码检查
- 调试配置 (Chrome)
- 推荐插件列表

## 注意事项

1. 需要先启动后端服务 (端口 5000)
2. 修改 `.env.local` 配置正确的 API 地址
3. 部分功能需要登录后才能使用
