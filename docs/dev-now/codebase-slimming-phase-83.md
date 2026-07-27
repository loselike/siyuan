# 代码瘦身治理第八十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜83`
- 续接自：`docs/dev-now/codebase-slimming-phase-82.md`
- 上下文状态：`green`
- 输入来源：持续目标要求优先清理能消除真实渲染、订阅或数组派生的单页面 unused 集群
- 会话 slug：`codebase-slimming-phase-83`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除报价页面退出界面后的只写不读状态、无消费者数组过滤和 Form 订阅，获得可观察的运行时减负。
- 固定样本：管理员完成 Amazon 或南非查价后，结果、提示和提交字段保持不变，同时不再执行死计数引起的额外整页渲染。
- 硬边界：API路径、HTTP方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、金额、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段和提交载荷不变。

## 修改

- `apps/web/src/modules/pricing/PricingPage.tsx`
- `apps/web/src/modules/pricing/pricingPageModel.ts`
- `docs/dev-now/codebase-slimming-phase-83.md`
- `.codex-state.md`

## 当前进度

- 删除 `todayLookupCount` 死状态及南非、旧报价成功分支中的两次状态更新。该状态没有读取者，原更新只会在正常结果更新之外再调度一次报价巨型页渲染。
- 删除 `agentMarkupRules` 死派生及 `isAgentLevelMarkupRule` 零引用 helper；加价规则集合变化时不再执行一次结果无人消费的全量过滤。
- 删除无人读取的 `channelValue = Form.useWatch('channel', lookupForm)`；四个名为 `channel` 的 Form.Item 和表单提交值保持原位。
- 删除零引用 `formatLegacyModuleCounts`、无用 `Banknote` 和页面侧无用 `parseAmazonTierMinimum` 导入；模型内部 Amazon 档位解析保留四处真实引用。
- 本地与47候选均增加1行、删除24行，生产源码净减少23行。活动主 index 从895,557 bytes / gzip 256,021 bytes降至895,332 / 255,831 bytes，减少225 bytes / gzip 190 bytes。

## 验证

- 两个目标文件 TypeScript 独立转译、目标 ESLint 和 `git diff --check` 通过；目标死符号清零，`channel` 表单字段仍为4个，模型内部 `parseAmazonTierMinimum` 仍为4处。
- Amazon成功查价固定样本经安全runner运行超过30秒仍未产生测试结果，已按规则停止且不记为通过；无测试进程遗留。
- 从47当前源码生成两文件候选，候选独立转译和空白检查通过，相对远端备份同为净删23行；远端原文件哈希在同步前复核一致。
- 47 Web production build通过，只构建/重启Web，无API构建和数据库迁移。运行容器使用新镜像 `d1ca9ee4fc53`，活动产物五个死符号均为0。
- Web/API/Postgres/Redis均为running，容器内首页与API health、公网首页与API health均为200，Web最近实际ERROR/FATAL/Unhandled日志为0。
- 漂移保持 `55 changed + 45 remote-only`，远端遗留物数量和字节数均为0。备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-83/`。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；Web新镜像已运行，无迁移。
- 准确下一步：回到 Warehouse 单页面候选，优先复核恒空 `dispatchedConsolidationIds` 过滤链和无消费者 `selected` 包裹过滤；只有确认不改变现行出库/合包状态链后才删除。
