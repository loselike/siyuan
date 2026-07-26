# 代码瘦身治理第五十四阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜54`
- 续接自：`docs/dev-now/codebase-slimming-phase-53.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-54`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：复扫现有价格表领域客户端，删除本地与 47 都确认零生产调用的三个纯 GET 包装及对应测试。
- 固定样本：`dubaiPriceTable()`、`legacyPricingSources(module?)`、`legacyPricingHealth(module?)` 只存在于 `PriceBookQueryClient` 定义与该客户端测试；服务端三条 GET 路由继续保留。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、报价金额、数据库、写入、状态、审计、页面和提交载荷全部不变。

## 修改

- `apps/web/src/api/priceBookQueryClient.ts`
- `apps/web/src/api/priceBookQueryClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-54.md`
- `.codex-state.md`

## 当前进度

- 仓库级搜索确认三个方法在本地只有 Web 客户端定义、对应测试和同名服务端 Controller 方法；没有任何页面、`ApiClient` 或其他运行时调用。
- 47 Web 生产源码复扫同样确认三个方法都只有 `PriceBookQueryClient` 自身定义。
- 删除三个纯 GET 包装、仅被它们使用的 `DubaiPriceTableResponse`、`LegacyPricingSourcesResponse` 类型导入、局部 `LegacyPricingHealthResponse` 接口，以及对应测试调用和路径断言。
- 生产源码减少 22 行，测试净减少 21 行，功能源码与测试合计净减少 43 行；没有新增替代包装。
- `dubaiPriceDisplay`、`dubaiPriceDisplayVersions`、`legacyPricingMeta` 和 `southAfricaRateRules` 等生产查询继续保留；价格数据、查询实现、权限和服务端路由均未修改。

## 验证

- `priceBookQueryClient.test.ts` 经 Web 安全 runner 通过 8/8；三个已删除方法及三个专用类型在目标 Web 源码中均为 0；`git diff --check` 通过。
- 发布范围为 `web`；无 Shared、API、Prisma schema 或 migrations 变化，只构建并重启 Web，47 production build 通过。
- 47 候选与线上源码 SHA-256 均为 `5f71090f162744c527d7132be619cc89e415cb6fcb714a2a0c613a556539981e`；相对备份仅删除目标 22 行。
- 47 源码中三个客户端方法和专用健康响应接口均为 0，保留的展示、元数据和南非规则查询仍存在；三条服务端 GET 路由各保留 1，未登录请求均保持 401“缺少登录凭证”。
- 相邻两次仅 Web 客户端减量构建中，主包由 `909.57 kB / gzip 261.85 kB` 降至 `909.24 kB / gzip 261.79 kB`；差异很小，不宣称可感知性能提升。
- Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `62%`；真正全仓减量约 `41%`；综合约 `52%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-54`。
- 准确下一步：复扫旧 `ApiClient.pricingRules()` 与 `MarkupQueryClient.previewAgentMarkupRule()` 的本地、47 生产调用和测试引用；只有在确认只是死包装、且不改规则金额或服务端实现时才删除。
