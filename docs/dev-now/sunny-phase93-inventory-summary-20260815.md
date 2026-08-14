# Sunny Phase93：仓库在库汇总策略抽取（2026-08-15）

- 状态：`in_progress`
worktree: `/Users/j1ng/Tools/sunny-phase93-inventory-summary`
branch: `codex/sunny-phase93-inventory-summary`

## 用户边界

不改变业务数据、系统数据、现有权限逻辑、API 字段/状态、金额口径、审计事件或前端操作链路。GitHub 项目只借鉴模块边界和受影响测试方式。

## 重评依据与参考

- Phase92 已将仓库三个只读入口收口到 `WarehouseInventoryQueryService`/port，并发布到 47；下一项收益转为实际减少巨型 Prisma Repository 的重复实现。
- [Twenty monorepo guidance](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：按 feature package 划分服务与共享契约；本切片只抽取一个可验证查询策略，不复制其 TypeORM/GraphQL。
- [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只跑受影响的仓库汇总测试与 API 类型/治理门禁，不启动全量回归。

## 本切片

- 新增 `warehouse-in-stock-summary.query.ts`，把 Prisma 在库汇总的权限门、客户范围、数据库聚合、待出库统计和审计写入集中为单一策略。
- `PrismaRepository.getWarehouseInStockSummary` 保留原公开方法，改为兼容包装；`PrismaWarehouseInventoryQueryRepository` 直接使用同一策略，避免新旧入口继续分叉。
- `InMemoryRepository` 不改；Legacy adapter 继续委托原实现，保持测试运行时的内存语义。
- 为仓库共享类型增加 `@siyuan/shared/warehouse` 子路径，避免新增根入口依赖；未改业务数据或 Prisma schema/migrations。
- 修正两个过期 characterization fixture：`OPERATOR` 在当前 phase91 代码中属于 `isBusinessAgentRestrictedRole`，要覆盖客户范围分支应使用当前非仓库广域角色 `FINANCE`；生产逻辑未改。

## 验证

- 首次安全测试因新 worktree 无依赖失败：`vitest: command not found`；安装锁定依赖后重跑。
- `npm run build -w @siyuan/shared`：通过。
- `npm run test:api:safe -- --run src/modules/warehouse/inventory/warehouse-inventory-query.repository.test.ts src/modules/prisma.repository.warehouse-in-stock-summary.test.ts`：12/12 通过。
- `npm run typecheck -w @siyuan/api`：通过。
- `npm run governance:check`：通过（434 route contracts、security 3/3、lint no-new-debt）。
- `git diff --check`：通过。

## 发布状态与风险

本切片尚未发布 47。没有 migration；发布范围将由 `packages/shared` 子路径与 API 查询策略实际影响推导为 `web+api` 或 `api`，发布前必须在干净 release worktree 完成基线捕获和合并。风险集中在旧 summary characterization 与当前权限角色语义的历史测试漂移，已按 phase91 实际代码修正 fixture，未改变权限判断。

## 下一轮重评

发布后重新比较安全/数据正确性、高频仓库查询与前端数据流、架构效率和 UI；若真实汇总响应与旧方法逐字段等价，再继续抽取今日收货或在库列表查询；否则停止扩大迁移并回滚本切片。
