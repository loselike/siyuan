# 代码瘦身治理第五十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜52`
- 续接自：`docs/dev-now/codebase-slimming-phase-51.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-52`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：复扫前端旧兼容入口，删除本地与 47 都确认零生产调用的纯 GET 转发，不改变任何页面或服务端能力。
- 固定样本：`ApiClient.warehouseHandover(shipmentId)` 只存在于旧客户端定义；服务端 `GET /warehouse/handover/:shipmentId` 继续保留。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、数据库、写入、状态、审计、页面和提交载荷全部不变。

## 修改

- `apps/web/src/apiClient.ts`
- `docs/dev-now/codebase-slimming-phase-52.md`
- `.codex-state.md`

## 当前进度

- 本地和 47 Web 生产源码复扫均确认 `warehouseHandover` 只有 `ApiClient` 自身定义，没有页面、领域客户端或其他运行时调用；测试源码也没有引用。
- 删除旧 `ApiClient.warehouseHandover` 三行转发、一个空行及仅被它使用的 `WarehouseHandoverSummary` 类型导入，生产源码净减少 5 行。
- `printWarehouseHandover` 写入口和服务端 `GET /warehouse/handover/:shipmentId` 路由均保持不动，接口路径、HTTP 方法、参数、状态码、错误文案和返回字段没有变化。
- 同轮零调用清单中，`ApiClient.pricingRules` 涉及价格规则且仍有测试引用；其余零调用候选主要位于财务、账号、写入或状态流转边界，本阶段全部保留。
- 领域客户端中的零生产调用方法属于现行领域入口而非旧转发，本阶段只登记，不与旧兼容入口混删。

## 验证

- `apps/web/src/apiClient.test.ts` 经 Web 安全 runner 通过 1/1；`git diff --check` 通过。
- 首次测试命令重复传入 runner 已自动追加的 worker 参数，Vitest 在收集前拒绝启动；改为安全 runner 标准命令后通过，没有遗留测试进程。
- 发布范围为 `web`；无 Shared、API、Prisma schema 或 migrations 变化，只构建并重启 Web，47 production build 通过。
- 47 候选与线上源码 SHA-256 均为 `4b55d8b7300bdfa9faa95921534c5ae94f04547b9b36c32b3852dc23c790620a`；相对备份仅删除目标 5 行，`warehouseHandover` 和 `WarehouseHandoverSummary` 均为 0，`printWarehouseHandover` 保留 1。
- 47 服务端交接单预览 GET 路由仍保留 1；Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `62%`；真正全仓减量约 `40%`；综合约 `51%`。本阶段是 5 行确定性减量，不人为上调整数进度。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-52`。
- 准确下一步：复扫领域客户端中只存在定义与兼容测试、没有本地及 47 生产调用的纯 GET 包装；优先评估仓库只读方法，继续排除财务、账号、状态流转、审计和字段裁剪边界。
