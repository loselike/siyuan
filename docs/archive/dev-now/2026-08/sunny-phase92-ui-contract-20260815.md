# Sunny Phase92：ManagedTable 与仓库查询边界（2026-08-15）

- 状态：`published_47`
worktree: `/Users/j1ng/Tools/sunny-phase92-ui-contract`
branch: `codex/sunny-phase92-ui-contract`

## 用户边界

持续优化 Sunny，但不改变业务数据、系统数据、现有权限逻辑、API 业务口径或状态流转。每个切片必须先复扫、按收益排序，再做最小修改和回归审查。

## 基线选择

根工作树当前叠加 55 个修改文件和 281 个未跟踪文件，Shared/API 合约不一致，API typecheck 约 1423 个错误；直接修补会把多个未提交会话继续混合。47 当前运行来源 `codex/release/phase91-promote` 是干净基线，Shared/API/Web typecheck 均通过，故本切片从该分支新建隔离 worktree。

## GitHub 参考

- [Ant Design Pro](https://github.com/ant-design/ant-design-pro)：企业后台表格工具区和可扫读布局。
- [Twenty package structure](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：共享 UI 契约边界和模块化组件组织。
- [Nx affected](https://nx.dev/docs/features/ci-features/affected)：只验证受影响模块；本切片只运行共享表格和类型门禁。

## 本切片改动（commit `7ec6552`）

- `ManagedTable` 的 `columnSettingsPlacement` 支持 `column | toolbar`，默认恢复 `column`，保留已明确传入 `toolbar` 的页面行为。
- 默认模式追加固定右侧 `__managed_table_column_settings` 列，恢复现有测试和历史页面契约；工具栏模式不增加表格列。
- 增加两种放置模式的定向 characterization，避免未来再次把默认模式误改为 toolbar。

## 验证

- `npm run prisma:generate -w @siyuan/api`
- `npm run build -w @siyuan/shared`
- `npm run test:shared:safe -- --run`：40/40
- `npm run test:web:safe -- --run src/modules/shared/ui-table.test.tsx`：14/14
- `npm run typecheck -w @siyuan/api`、`npm run typecheck -w @siyuan/web`：通过
- `npm run governance:check`：通过（434 route contracts、security gate 3/3）
- `git diff --check`：通过
- 完整 `finance.test.tsx` 仍有既有导航/环境失败（24/26），未作为本切片成功证据，也未顺手修改。

## 第二个小切片：仓库查询边界

- 将 `warehouse/today-receipts`、`warehouse/in-stock`、`warehouse/in-stock-summary` 三个只读入口从 Controller 的直接 `PrismaRepository` 依赖收口到 `WarehouseInventoryQueryService` 和 `WarehouseInventoryQueryRepository` port。
- Prisma 实现暂时通过显式 `WarehouseInventoryLegacyOperations` 兼容桥调用旧方法；Legacy/InMemory 实现保持原委托。没有复制或改写查询、权限、审计、返回字段和数据范围逻辑，后续可逐个替换桥接方法并用同一保护网验收。
- 新增 Service/Repository bridge characterization；`warehouse-inventory-query` 定向测试 11/11、API typecheck、治理/架构/安全检查通过。

## 发布与风险

本切片已发布 47：`git-152b1b3586cf_web-98b2e14ef6c0_api-f846a23dbc20`，范围 `web+api`，`MIGRATION_REQUIRED=false`。发布前后 provenance 均为 traceable，Web/API image match、API release ID、容器 health、公网 health、锁与 recovery 均通过。只涉及共享表格契约和仓库只读调用边界，无 Prisma、业务数据、权限、财务口径或业务状态变更。UI 列设置位置仍由用户人工检查，仓库接口后续需用真实角色做允许/拒绝只读探针。

## 下一轮重新排序

重新扫描后继续选择“仓库工作台剩余读方法的真实实现迁移”或“财务审核列表查询边界”二选一；优先用 47 只读接口/容器证据确认真实调用，再一次只替换一个兼容桥方法。继续保留 `App.tsx`、巨型 `Repository` 和全局 CSS 的分步迁移，不做一次性重写。
