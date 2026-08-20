# Sunny Phase93：仓库在库汇总策略抽取（2026-08-15）

- 状态：`published_47`
implementation worktree: `/Users/j1ng/Tools/sunny-phase93-inventory-summary`
implementation branch: `codex/sunny-phase93-inventory-summary`
release worktree: `/Users/j1ng/Tools/sunny-phase93-integrate`
release branch: `codex/release/phase93-integrate`

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
- `npm run test:api:safe -- --run src/modules/warehouse/inventory/warehouse-inventory-query.repository.test.ts src/modules/prisma.repository.warehouse-in-stock-summary.test.ts`：13/13 通过。
- `npm run typecheck -w @siyuan/api`：通过。
- `npm run governance:check`：通过（434 route contracts、security 3/3、lint no-new-debt）。
- `git diff --check`：通过。

## 发布状态与风险

已发布 47：`git-3ef98771a79e_web-759d59ea475b_api-3483f44e769e`。发布范围为 `web+api`，`MIGRATION_REQUIRED=false`；构建、API/Web 重启、内外 health、运行时 provenance、镜像与 state/API release ID 一致性、锁与 recovery 均通过。运行时为 `GIT_SOURCE_BUILD`/`SERVER_BUILD`，源码分支为 `codex/release/phase93-integrate`。本切片没有 migration，也没有业务数据、系统数据或权限逻辑写入。构建仍报告既有 Vite 大 chunk 警告（最大约 1.18 MB），未改变发布结果。

风险集中在后续继续抽取时的查询逐字段等价与真实数据范围；本切片保留公开 Repository 方法、旧兼容适配器和权限/审计顺序，下一轮必须先用固定仓库样本重跑原方法与新策略的对比，再决定是否扩大范围。

## 下一轮重评

发布后重新比较安全/数据正确性、高频仓库查询与前端数据流、架构效率和 UI；若真实汇总响应与旧方法逐字段等价，再继续抽取今日收货或在库列表查询；否则停止扩大迁移并回滚本切片。UI 人工验收入口为仓库页面：默认 `ManagedTable` 列设置按钮应固定在表格右侧，显式 toolbar 配置的页面仍保持原位置。
