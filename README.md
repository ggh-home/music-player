# Music Player - Next.js 音乐播放器

一个基于 Next.js + TypeScript + Tailwind CSS 的现代化音乐播放器 Web 应用。

## 功能特性

### 用户认证
- 用户注册/登录
- 查看用户信息
- 会员升级（微信支付）

### 搜索
- 支持歌曲、歌手、歌单、有声书搜索
- 搜索历史记录

### 歌单管理
- 创建歌单
- 收藏歌单
- 导入第三方歌单（QQ音乐/网易云音乐）
- 管理歌单
- 播放歌单

### 有声书
- 收藏有声书专辑
- 缓存音频（类似下载）
- 播放有声书
- 记录播放进度
- 跳过片头片尾

### 播放器
- 播放/暂停控制
- 上一曲/下一曲
- 进度条拖动
- 播放模式（顺序/随机/单曲循环/列表循环）
- 播放速度调节（0.5x - 2x）
- 定时关闭
- 音质选择（标准/高品质/无损/Hi-Res）
- 红心收藏
- 下载功能
- 歌词显示
- 播放列表查看

### 下载管理
- 下载队列管理
- 支持暂停、继续、重试、清空
- 每日限额（后端限制）

### 账号相关
- 查看限额信息（音乐/声音播放次数、下载次数、无损次数、缓存次数等）

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3
- **UI 组件**: Radix UI + 自定义组件
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **音频播放**: HTML5 Audio API

## 项目结构

```
music-player/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 首页
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   ├── login/              # 登录页
│   │   ├── search/             # 搜索页
│   │   ├── library/            # 音乐库
│   │   ├── liked/              # 喜欢的歌曲
│   │   ├── playlists/          # 歌单管理
│   │   ├── audiobooks/         # 有声书
│   │   ├── downloads/          # 下载管理
│   │   └── settings/           # 设置
│   ├── components/
│   │   ├── ui/                 # UI 组件
│   │   ├── layout/             # 布局组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   └── player/             # 播放器组件
│   │       └── PlayerBar.tsx
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 工具函数
│   │   └── utils.ts
│   ├── services/               # API 服务
│   │   └── api.ts
│   ├── stores/                 # Zustand 状态管理
│   │   ├── authStore.ts
│   │   ├── playerStore.ts
│   │   ├── downloadStore.ts
│   │   └── searchStore.ts
│   └── types/                  # TypeScript 类型
│       └── index.ts
├── public/                     # 静态资源
├── .vscode/                    # VS Code 配置
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://bxdmkai.cn:6060
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run type-check` | 运行 TypeScript 类型检查 |

## API 接口

根据提供的 Postman 集合，主要接口包括：

### 用户认证
- `POST /user/create` - 注册
- `POST /user/login` - 登录

### 音乐搜索
- `GET /search/music/:keyword` - 搜索歌曲
- `GET /search/music/detail/:platform/:id` - 获取歌曲详情
- `GET /search/singer/:keyword` - 搜索歌手
- `GET /search/artist/songs/:platform/:id` - 获取歌手歌曲
- `GET /search/artist/albums/:platform/:id` - 获取歌手专辑
- `GET /search/album/detail/:platform/:id` - 获取专辑歌曲
- `GET /search/playlist/:keyword` - 搜索歌单
- `GET /search/playlist/songs/:platform/:id` - 获取歌单歌曲

## 开发说明

### VS Code 推荐插件

- Tailwind CSS IntelliSense
- Prettier - Code: formatter
- ESLint
- Auto Rename Tag
- Path Intellisense

### 代码规范

- 使用 TypeScript 严格模式
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 组件使用函数式组件 + Hooks

## 许可证

MIT
