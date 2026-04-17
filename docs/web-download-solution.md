# Web 端下载方案设计

## 1. 目标

基于当前 Next.js 项目，设计一套可落地的 Web 下载方案，满足以下约束：

1. 后端现有接口优先复用，不强依赖新增接口
2. Web 端按不同操作系统给出不同的默认目录提示
3. 用户可以自行选择下载位置
4. 不影响播放器、搜索、歌单、收藏等现有业务逻辑
5. 下载管理页与设置页保持统一 UI 风格

当前项目里的关键接入点：

- 入口统一走 [`src/stores/downloadStore.ts`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/stores/downloadStore.ts)
- 下载管理页位于 [`src/app/downloads/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/downloads/page.tsx)
- 下载工具位于 [`src/lib/download.ts`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/lib/download.ts)
- 搜索与详情接口统一位于 [`src/services/api.ts`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/services/api.ts)

## 2. 方案结论

这套 Web 方案采用“三层隔离”：

1. 页面层继续调用 `useDownloadStore().downloadSong(song)`，不改现有业务入口
2. Store 内部增加“下载编排层”，负责额度校验、音源预处理、队列推进、上报结果
3. 落盘层按浏览器能力切换：
   - 支持 `showDirectoryPicker` 的浏览器：用户选择目录后，直接写入目录
   - 不支持的浏览器：退化为浏览器原生下载

也就是说，业务页面不需要理解操作系统差异、目录权限或接口组合逻辑，这些都收口在下载模块内部。

## 3. 浏览器与操作系统策略

### 3.1 操作系统识别

保留当前 [`src/lib/download.ts`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/lib/download.ts) 中的 OS 识别逻辑，并扩展为只做两件事：

1. 展示默认目录提示
2. 文件名合法化策略

默认目录提示：

- Windows: `C:\Users\<用户名>\Downloads\Music-Player`
- macOS: `~/Downloads/Music-Player`
- Linux: `~/Downloads/Music-Player`

注意：
纯浏览器 Web 不能拿到这个绝对路径，只能把它作为 UI 提示文案。

### 3.2 目录选择策略

#### A. Chromium 能力模式

当浏览器支持 `window.showDirectoryPicker` 时：

1. 在“下载管理”页和“设置”页都提供“选择下载目录”按钮
2. 首次点击时弹出目录选择器，默认 `startIn: "downloads"`
3. 用户可选择任意目录，不强制写死到 `Downloads/Music-Player`
4. 如果用户选的是上级目录，则在其下自动创建 `Music-Player`
5. 将目录句柄持久化到 IndexedDB
6. 每次下载前校验目录读写权限，权限失效时重新请求授权

这样既满足“用户自行决定下载位置”，又尽量保持与安卓端“统一下载根目录”的体验一致。

#### B. 普通浏览器降级模式

当浏览器不支持目录句柄时：

1. 不再承诺固定落盘目录
2. 使用浏览器下载能力触发文件保存
3. 通过文件名和路径提示引导用户保存到建议目录
4. 页面上明确提示：
   “当前浏览器不支持站点内目录授权，实际保存位置由浏览器决定”

这类浏览器下，用户是否能“每次选择保存位置”取决于浏览器自身设置，不由业务代码控制。

## 4. 下载架构设计

### 4.1 分层

建议把现有下载模块拆成以下职责：

#### `downloadStore`

职责：

- 维护下载队列、已完成列表、当前任务、进度、目录状态
- 暴露稳定的页面调用接口
- 不直接写文件，不直接拼装复杂接口调用链

保留现有公开方法名，避免业务页面改动：

```ts
downloadSong(song: Song, quality?: AudioQuality): Promise<void>;
pauseDownload(id: string): void;
resumeDownload(id: string): void;
retryDownload(id: string): void;
removeDownload(id: string): void;
clearQueue(): void;
```

新增但不强制业务页面立即使用的方法：

```ts
downloadSongs(songs: Song[], quality?: AudioQuality): Promise<void>;
selectDownloadDirectory(): Promise<void>;
refreshDownloadCapability(): Promise<void>;
```

#### `downloadOrchestrator`

职责：

- 串行推进队列
- 下载前做额度校验
- 调用 prepare 逻辑解析真实下载资源
- 调用目录适配器写入文件
- 成功或失败后更新 store 并上报

这层相当于安卓端 `downloadCore.ts` 的 Web 版本。

#### `downloadService`

职责：

- 封装“当前后端接口组合”与“未来聚合接口”两种模式
- 对页面和 store 层屏蔽 HTTP 细节

它应该提供一个统一的 `prepareTask()` 能力：

```ts
interface DownloadService {
  getConfig(): Promise<DownloadConfig>;
  prepareTask(input: DownloadRequestItem, quality: AudioQuality): Promise<PreparedDownloadTask>;
  reportResult(input: DownloadReportPayload): Promise<void>;
}
```

#### `downloadDirectoryAdapter`

职责：

- 检测浏览器能力
- 选择目录
- 恢复目录句柄
- 校验权限
- 写入音频、封面、歌词
- 在不支持目录句柄时走浏览器下载降级

## 5. 建议的数据结构

建议在现有 `DownloadTask` 基础上扩展，而不是推翻重写。这样下载页样式和现有页面引用最稳定。

```ts
type DownloadQueueTaskStatus = "Done" | "Downloading" | "Pause" | "Failed";

type CurrentDownloadStatus = "Success" | "Failed" | "Downloading" | "WaitStart";

type DownloadCapabilityMode = "directory-access" | "browser-download";

type DownloadFileSuffix =
  | "default.mp3"
  | "high.mp3"
  | "no-loss.flac"
  | "surround.flac"
  | "cover.jpg";

interface DownloadRequestItem {
  platform: string;
  songId: string;
  songTitle: string;
  singerName: string;
  songImg?: string;
  songType?: "music" | "sound";
}

interface PreparedDownloadAsset {
  kind: "audio" | "cover" | "lyric";
  fileName: string;
  url?: string;
  textContent?: string;
  contentType?: string;
}

interface PreparedDownloadTask {
  allowDownload: boolean;
  reason?: string;
  finalLevel?: string;
  fileSuffix: DownloadFileSuffix;
  baseFileName: string;
  assets: PreparedDownloadAsset[];
}

interface DownloadDirectoryState {
  mode: DownloadCapabilityMode;
  os: "windows" | "macos" | "linux" | "unknown";
  rootHint: string;
  selectedDirectoryName?: string;
  hasPermission: boolean;
}
```

## 6. 后端接口复用策略

### 6.1 第一阶段：完全复用现有接口

不改后端也能落地，前端按以下顺序组合调用：

1. `GET /utils/download/limit`
2. `GET /utils/user-action/count/day?action=DOWNLOAD-SUCCESS`
3. 若 `songType === "sound"`：
   - `GET /search/sound/detail/{platform}/{songId}`
4. 若 `songType !== "sound"`：
   - `GET /search/music/detail/{platform}/{songId}?level={level}`
   - 按音质降级重试，直到拿到可用 `songUrl`
5. 下载成功后：
   - `POST /utils/user-action`，body: `{ "action": "DOWNLOAD-SUCCESS" }`

前端要新增一个“接口适配聚合层”，而不是让页面直接串这些请求。

### 6.2 第二阶段：可选聚合接口

如果后端愿意优化，建议新增但不强依赖：

- `GET /api/download/config`
- `POST /api/download/prepare`
- `POST /api/download/report`

注意：
前端不要直接依赖这些新接口命名，而是通过 `downloadService` 适配。
这样第一阶段用旧接口，第二阶段切新接口时，页面与 store 都不用改。

## 7. 目录适配层设计

### 7.1 推荐接口

```ts
interface DownloadDirectoryAdapter {
  getState(): Promise<DownloadDirectoryState>;
  selectDirectory(): Promise<DownloadDirectoryState>;
  ensureWritableDirectory(): Promise<DownloadDirectoryState>;
  saveAssets(task: PreparedDownloadTask, onProgress?: (value: number) => void): Promise<{
    savePathLabel: string;
    totalBytes?: number;
  }>;
}
```

### 7.2 两种实现

#### `FileSystemAccessDirectoryAdapter`

适用：

- Chrome
- Edge
- 其他支持 `showDirectoryPicker` 的 Chromium 内核浏览器

行为：

1. 通过 `showDirectoryPicker({ id: "music-player-downloads", mode: "readwrite", startIn: "downloads" })` 选择目录
2. 自动创建 `Music-Player` 子目录
3. 逐个写入：
   - 音频文件
   - 封面文件
   - 歌词文件
4. 进度按音频文件下载过程回写
5. 目录句柄保存在 IndexedDB
6. 每次启动下载时先 `queryPermission`，必要时 `requestPermission`

#### `BrowserDownloadAdapter`

适用：

- Safari
- Firefox
- 其他不支持目录写入的浏览器

行为：

1. 如果能 `fetch` 到 blob，就触发浏览器下载
2. 如果 blob 拉取失败，则退化到直链下载
3. 保存路径仅展示为“建议目录”
4. 明确提示这不是站点可控的真实本地路径

说明：
这一层无法严格保证“保存到用户指定目录”，这是浏览器安全模型限制，不是业务代码缺失。

## 8. 单曲下载链路

建议的 Web 端单曲链路如下：

1. 业务页点击下载，继续调用 `downloadSong(song)`
2. Store 去重后把任务放入 `queue`
3. Orchestrator 找到第一个 `WaitStart/pending` 任务
4. 校验今日下载额度
5. 通过 `downloadService.prepareTask()` 获取最终资源信息
6. 校验目录可写状态
7. 执行落盘：
   - Chromium 模式：真实写入用户选中的目录
   - 降级模式：交给浏览器下载
8. 成功后写入完成列表并上报 `DOWNLOAD-SUCCESS`
9. 失败则标记为失败，可单项重试或全部重试
10. 自动推进下一个任务

## 9. 批量下载链路

当前项目多个页面已经统一走 `downloadSong(song)`，因此批量下载不需要侵入式改造。

建议新增：

```ts
downloadSongs(songs: Song[], quality?: AudioQuality)
```

实现方式：

1. 先批量做去重
2. 只负责入队，不直接在页面中循环发起 HTTP 请求
3. 所有串行执行、额度判断、失败重试都交给 orchestrator

这样可以避免“页面各自实现批量下载”造成的逻辑漂移。

## 10. 不影响其他业务逻辑的落地方式

本项目里下载入口分布在多个页面与播放器栏，但都已经收口到 store：

- [`src/components/player/PlayerBar.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/components/player/PlayerBar.tsx)
- [`src/app/search/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/search/page.tsx)
- [`src/app/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/page.tsx)
- [`src/app/library/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/library/page.tsx)
- [`src/app/playlist/[id]/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/playlist/[id]/page.tsx)

因此改造原则很明确：

1. 不改业务页按钮事件签名
2. 不让页面自己发下载相关 HTTP 请求
3. 只重构下载 store 内部实现
4. 新增的目录授权、额度校验、音质降级都放到下载模块内部

这能保证播放器、搜索、歌单、收藏逻辑不受影响。

## 11. 统一样式方案

下载相关 UI 建议只使用项目已存在的通用组件：

- `Card`
- `Button`
- `Tabs`
- `Progress`
- `Select`
- `Switch`

### 11.1 下载管理页

保留现有 [`src/app/downloads/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/downloads/page.tsx) 布局，在顶部新增一个“下载设置卡片”：

- 当前浏览器模式：`目录写入` / `浏览器下载`
- 当前系统：Windows / macOS / Linux
- 当前目录：
  - 目录句柄模式显示“已选目录名 / Music-Player”
  - 降级模式显示默认建议目录
- 按钮：
  - `选择下载目录`
  - `重新授权`
  - `打开设置`

任务列表卡片继续沿用现有样式，不另外设计新视觉体系。

### 11.2 设置页

在 [`src/app/settings/page.tsx`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/app/settings/page.tsx) 中新增“下载”Tab，样式与“播放 / 通知 / 限额”保持一致。

建议字段：

- 默认音质
- 自动下载封面
- 自动下载歌词
- 下载目录状态
- 重新选择目录
- 浏览器能力说明

## 12. 建议新增的文件结构

```txt
src/lib/download/
  capabilities.ts
  directoryAdapter.ts
  browserDirectoryAdapter.ts
  fileSystemAccessDirectoryAdapter.ts
  downloadService.ts
  downloadOrchestrator.ts
  filename.ts
  index.ts
```

对应改造点：

- 现有 [`src/lib/download.ts`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/lib/download.ts) 可逐步拆分
- [`src/stores/downloadStore.ts`](/Users/gouguohua/Downloads/Kimi_Agent_React TS 项目初始化/music-player/src/stores/downloadStore.ts) 从“状态 + 执行”改成“状态 + 调度入口”

## 13. 分阶段实施

### Phase 1

目标：
先落地可用版本，不改后端。

内容：

1. 抽离 `downloadService`
2. 抽离 `downloadDirectoryAdapter`
3. 用现有接口组合实现 prepare
4. 保持现有下载页 UI，大幅减少逻辑耦合

### Phase 2

目标：
提升下载体验。

内容：

1. 增加目录句柄持久化
2. 在设置页加入下载 Tab
3. 增加批量下载统一入队能力
4. 把当前 `pending/downloading/paused/completed/error` 与安卓端状态定义对齐

### Phase 3

目标：
提升后端和统计能力。

内容：

1. 接入 `/api/download/prepare`
2. 接入 `/api/download/report`
3. 输出更完整的下载统计维度

## 14. 风险与边界

1. 纯 Web 不能获取或控制真实绝对路径
2. `showDirectoryPicker` 不是所有主流浏览器都支持
3. 目录权限可能跨会话失效，需要重新请求授权
4. Web 端无法像 RN 一样直接依赖原生文件系统能力
5. MP3 标签写入在浏览器侧成本较高，建议第一阶段不做
6. Windows 文件名限制必须统一清洗
7. 多文件资源在降级浏览器里可能拆成多个下载动作

## 15. 推荐最终落地口径

如果你的目标是：

- 后端接口尽量复用
- 用户自己决定下载位置
- 区分不同操作系统
- 不影响现有业务逻辑

那么当前项目最合适的实现是：

1. 保持页面入口不变，继续通过 `useDownloadStore().downloadSong(song)` 发起下载
2. 在下载模块内部新增 `orchestrator + service + directoryAdapter`
3. Chromium 浏览器走“目录授权 + 真实写入”
4. 其他浏览器走“浏览器下载降级”
5. 下载页和设置页共用一套卡片式 UI，统一交互和文案

这套方案能在不推翻现有页面结构的前提下，把安卓端“持久化队列 + 串行下载 + 额度校验 + 失败重试”的核心模型平移到 Web。
