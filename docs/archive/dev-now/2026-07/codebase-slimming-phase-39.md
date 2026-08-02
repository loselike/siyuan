# 代码瘦身治理第三十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜39`
- 续接自：`docs/dev-now/codebase-slimming-phase-38.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续治理巨型文件且不得改变业务逻辑
- 会话 slug：`codebase-slimming-phase-39`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把已隔离在 `WarehouseTallyQueryController` 背后的四个 Prisma 只读查询实现迁入生产领域 Repository，继续缩小巨型 `PrismaRepository`。
- 固定样本：管理员读取理货任务、结果包裹与历史链继续返回原字段和数组；缺失任务、客户角色和未登录请求继续返回原状态与错误文案。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库结构、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。

## 修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-query.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-query.repository.ts`
- `apps/api/src/modules/warehouse/tally/legacy-warehouse-tally-query.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-query.repository.test.ts`
- `apps/api/src/modules/warehouse/warehouse-query.shared.ts`
- `docs/dev-now/codebase-slimming-phase-39.md`
- `.codex-state.md`

## 当前进度

- 合票明细、理货任务列表、理货历史链和理货结果包裹四个 Prisma 查询迁入 `PrismaWarehouseTallyQueryRepository`。
- `WarehouseTallyQueryController` 改为注入领域令牌；`USE_PRISMA_REPOSITORY=false` 继续通过 Legacy 适配器调用原内存实现。
- 包裹/任务响应映射、最近完成时间边界和结果包裹加载迁入共享 helper；标签生成继续先执行原权限检查，再调用同一结果包裹 helper。
- 本地 `PrismaRepository` 由 19,466 行降至 19,224 行，减少 242 行；47 当前 Repository 由 23,426 行降至 23,178 行，减少 248 行。
- 新增领域 Repository、Legacy 适配器和共享 helper 后，本地运行时代码净增加约 130 行；本阶段改善巨型 Repository 的职责边界和查询可测试性，不改变查询性能，也不宣称全仓总代码量下降。

## 验证

- 已通过：领域 Repository 契约测试和既有只读 E2E 共 5/5，覆盖筛选、业务员范围、映射、历史链、结果包裹主路径/兼容回退、缺失任务和权限拒绝。
- 已通过：仓库理货完整固定样本 1/1，覆盖创建、完成、历史链、标签生成/打印/下载及相关审计链，证明写路径继续使用相同查询结果。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已知基线阻断：API 全量 typecheck 仍存在内存理货状态、可选字符串、财务 `filterOptions` 和仓库包裹可编辑性等既有错误；本阶段目标文件错误为 0。
- 已通过：发布前从 47 当前源码生成六文件白名单补丁，保留远端包裹理货生命周期字段、根理货任务链、重复理货统计和付款银行模块；只重建/重启 API，无 Prisma 迁移。
- 已通过：47 production build；巨型 Repository 中四个目标查询实现为 0、领域 Repository 为 4，重复理货统计为 1，理货写方法指纹为 8，四条 GET 路由各映射一次。
- 已通过：47 管理员理货任务 200/5 且关键字段完整，结果包裹 200/1，历史链和不存在合票明细均返回 200 数组；缺失任务保留 404“理货任务不存在”，客户保留 403“没有访问权限”，未登录保留 401“缺少登录凭证”。
- 已通过：47 API/Web 容器正常，容器内、宿主实际端口和公网 `/api/health` 均为 200，API 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `50%`；真正全仓减量仍约 `25%–30%`。本阶段首次把仓库生产查询实现迁出巨型 Prisma Repository，但领域边界和契约测试仍抵消总代码量下降。
- 剩余主项：`PrismaRepository`、`InMemoryRepository`、全局 CSS 和 shared contracts 仍是主要巨型边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和多个工作区 JSX。
- 已知过渡依赖：生产领域 Repository 暂时仅为数据库动态权限读取依赖 `PrismaRepository.hasPermission`；下一阶段应先提取可复用权限读取边界，再迁移下一个多查询 Repository 切片。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-39`。
- 准确下一步：只读扫描 `PrismaRepository` 中已由领域 Controller 隔离、包含多个无副作用查询的候选；优先复用本阶段共享映射或先解开动态权限读取依赖，继续避开财务、账号、状态流转和审计实现。
