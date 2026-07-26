# 代码瘦身治理第五十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜53`
- 续接自：`docs/dev-now/codebase-slimming-phase-52.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-53`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：复扫现有仓库领域客户端，删除本地与 47 都确认零生产调用的两个纯 GET 包装及对应测试断言。
- 固定样本：`warehousePackageGroups()` 和 `warehouseConsolidationItems(id)` 只存在于 `WarehouseQueryClient` 定义与该客户端测试；服务端两条 GET 路由继续保留。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、数据库、写入、状态、审计、页面和提交载荷全部不变。

## 修改

- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/api/warehouseQueryClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-53.md`
- `.codex-state.md`

## 当前进度

- 仓库级搜索确认两个方法在本地只有 Web 客户端定义、对应测试和同名服务端 Controller 方法；没有任何页面、`ApiClient` 或其他运行时调用。
- 47 Web 生产源码复扫同样确认两个方法都只有 `WarehouseQueryClient` 自身定义。
- 删除 `warehousePackageGroups()`、`warehouseConsolidationItems(id)`、仅前者使用的 `WarehousePackageGroupSummary` 类型导入，以及测试内对应两次调用和路径断言。
- 生产源码减少 9 行，测试净减少 4 行，功能源码与测试合计净减少 13 行；没有新增替代包装。
- `warehousePackages`、`warehouseTallyTaskOutputPackages`、`warehouseTallyTaskHistoryChain` 等现有生产调用继续保留；服务端 `GET /warehouse/package-groups` 与 `GET /warehouse/consolidations/:id/items` 路由不变。

## 验证

- `warehouseQueryClient.test.ts` 经 Web 安全 runner 通过 8/8；两个已删除方法和无用类型在 Web 源码中均为 0；`git diff --check` 通过。
- 发布范围为 `web`；无 Shared、API、Prisma schema 或 migrations 变化，只构建并重启 Web，47 production build 通过。
- 47 候选与线上源码 SHA-256 均为 `55f7d8f44cd8b0c83b55633e48ade2c0c4ebe6f907c564f49d6c75f8f65ca775`；相对备份仅删除目标 9 行。
- 47 源码中两个客户端方法和无用类型均为 0，三个保留的仓库生产查询方法各为 1；两条服务端 GET 路由各保留 1。
- Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `62%`；真正全仓减量约 `40%`；综合约 `51%`。本阶段继续增加确定性减量，但不足以单独上调整数进度。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-53`。
- 准确下一步：复扫 `PriceBookQueryClient` 中仅有定义和客户端测试、没有本地及 47 生产调用的 `dubaiPriceTable`、`legacyPricingSources`、`legacyPricingHealth` 三个纯 GET 包装；确认服务端路由保留后再决定是否删除。
