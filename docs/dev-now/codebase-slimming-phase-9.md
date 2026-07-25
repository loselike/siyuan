# 代码瘦身治理第九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜09`
- 续接自：`docs/dev-now/codebase-slimming-phase-8.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确授权删除 16 个零调用兼容方法及兼容测试）`
- 会话 slug：`codebase-slimming-phase-9`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：一次性删除已在本地和 47 生产源码确认零调用的 16 个 `ApiClient` 兼容转发、对应兼容测试和不再使用的类型导入。
- 固定样本：系统目录、应用壳、审计、仓库查询和承运商任务的现有领域客户端调用继续正常编译和运行。
- 硬边界：领域客户端、生产调用方、API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转和审计日志全部不变。
- 不做：不新增业务、不改页面、不改领域客户端实现、不改后端或共享契约。

## 删除范围

- App Shell：`navigationUnreadBadges`、`markNavigationRead`、`reportPageRenderError`。
- Audit Query：`loginLogs`、`accountEvents`、`auditLogs`。
- System Directory：`departments`、`sites`、`createSite`、`updateSite`、`updateSiteEnabled`。
- Warehouse Query：`warehousePackages`、`warehouseTodayReceipts`、`warehouseInStock`、`warehouseManualReceiptCustomers`。
- Carrier Task Query：`carrierTasks`。
- 同步删除 `apiClient.test.ts` 中上述五组兼容转发测试，保留网关错误测试和所有领域客户端契约测试。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-8.md`
- `docs/dev-now/codebase-slimming-phase-9.md`

## 当前进度

- 删除前已复核本地与 47 当前生产源码，16 个旧入口直接调用均为 0。
- 已删除 16 个 `ApiClient` 兼容转发、五组兼容测试、仅由这些入口使用的 `LoginLogSummary` 和无用共享类型导入；领域客户端属性、领域客户端实现和所有生产调用方保持不动。
- 本地 `apiClient.ts` 从 1939 行降至 1862 行，减少 77 行；`apiClient.test.ts` 从 136 行降至 15 行，减少 121 行，保留网关错误测试。
- 47 当前源码以远端现状为基线应用同一白名单删除；因 47 新增的 `waterReceiptSiteOptions` 仍使用 `SiteSummary`，该导入按真实调用保留，文件从 2155 行降至 2079 行。

## 验证

- 已通过：安全测试运行器执行网关、App Shell、Audit Query、System Directory、Warehouse Query、Carrier Task Query 六个测试文件，共 16/16。
- 已通过：`git diff --check`。
- 已通过：本地与 47 当前生产源码的 16 个旧方法定义均为 0；五个领域客户端属性继续存在。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；仅有既有 AntD vendor 大 chunk 警告。
- 已通过：47 源码 checksum 与远端候选一致，静态产物包含 `appShell`、`auditQuery`、`carrierTaskQuery`、`systemDirectory`、`warehouseQuery` 五个领域客户端标记。
- 已通过：47 Web 容器、容器内 API health、公网 8899 首页和 API health；本次 Web 启动后错误日志计数为 0。
- 已知基线：完整 Web typecheck 仍只报告 `ReceivableAudit` 缺少 `filterOptions`，以及 `appTestHarness` 三处仓库 `tallyStatus` 字符串与联合类型不匹配；未出现本阶段删除方法或类型导入导致的新错误。整文件 ESLint 仍有 12 个既有浏览器全局和 `_module` 问题，本阶段未扩大修复。

## 交接

- 阻塞：无。
- 剩余风险：仓库外部若存在直接实例化 `ApiClient` 并调用旧方法的未纳管消费者，本仓和 47 源码扫描无法覆盖；当前 Web 生产构建与源码均已确认零调用。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-9`。
- 准确下一步：扫描一个包含多个纯只读查询的高密度领域，优先减少 `ApiClient` 聚合体积；继续避开财务、账号、状态流转和审计实现，不再创建单方法领域客户端。
