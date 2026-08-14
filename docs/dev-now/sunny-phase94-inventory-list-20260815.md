# Sunny Phase94：仓库在库列表读取策略抽取（2026-08-15）

- 状态：`in_progress`
implementation worktree: `/Users/j1ng/Tools/sunny-phase94-inventory-list`
implementation branch: `codex/sunny-phase94-inventory-list`

## 用户边界

不改变业务数据、系统数据、现有权限逻辑、API 字段/状态、金额口径、审计事件或前端操作链路。GitHub 项目只借鉴模块边界和受影响测试方式。

## 重评依据与参考

- Phase93 已将仓库在库汇总策略收口到 inventory 模块并发布；重新扫描显示 `prisma.repository.ts` 仍约 32,104 行，`getWarehouseInStock` 仍是旧仓储中的大块读取逻辑。
- [Twenty monorepo guidance](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：按 feature package 划分服务与共享契约；本切片只迁移一个列表读取策略，不复制其 ORM/GraphQL。
- [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只运行仓库 inventory 定向测试、API 类型与治理门，不启动全量回归。

## 本切片目标

- 新增独立的仓库在库列表查询策略，保留原 `PrismaRepository.getWarehouseInStock` 公开方法作为兼容包装。
- 让 `PrismaWarehouseInventoryQueryRepository` 直接使用新策略；InMemory/Legacy 适配器继续保留，避免测试运行时和生产运行时语义漂移。
- 逐字保留权限校验、客户归属二次复核、状态/筛选、操作日志、金额舍入、等待排货统计与字段裁剪。
- 不改 Prisma schema、migration、数据库记录、权限定义或 API 类型。

## 验收

- 固定样本对比旧方法与新策略响应逐字段等价；拒绝路径保留原异常消息。
- API inventory 定向测试、类型检查、`git diff --check`、`npm run governance:check` 通过。
- 发布前在干净 release worktree 捕获 47 基线；仅在无 migration、无未审查文件时发布 `api`（shared 仅在实际受影响时扩大范围）。

当前实现已完成本地固定样本：inventory repository 定向测试 16/16、Warehouse E2E 的未建档客户入仓与后续在库查询 1/1、API typecheck、Shared build、`git diff --check` 和完整治理门通过。已有 E2E `lists in-stock packages` 在 Phase93 基线与本分支均因历史 `OPERATOR` 角色预期 403、实际 200 失败；该失败未由本切片引入，已记录为现存测试/权限角色语义漂移，不以修改生产权限逻辑方式处理。

## 发布状态与风险

已发布 47：`git-33a330fa2ae9_web-759d59ea475b_api-724b18a2de6f`。发布范围为 `api`，`MIGRATION_REQUIRED=false`；API 构建、重启、内外 health、运行时 provenance、镜像与 state/API release ID 一致性、锁与 recovery 均通过。运行时为 `GIT_SOURCE_BUILD`/`SERVER_BUILD`，源码分支为 `codex/release/phase94-integrate2`。本切片没有 migration，也没有业务数据、系统数据或权限逻辑写入。

风险集中在历史 `operationKeyword` 审计筛选的真实数据覆盖；实现逐句保留旧查询，但本轮只用本地固定样本验证，未对 47 做带业务员身份的写入或大规模筛选。构建后 API 线上证据通过，因此不阻断本轮。

## 下一轮重评

发布后重新审查权限与数据范围、列表与汇总的一致性、API 查询耗时和前端仓库数据流；只有逐字段等价且没有回归，才继续处理今日收货或 WarehousePage 数据流。
