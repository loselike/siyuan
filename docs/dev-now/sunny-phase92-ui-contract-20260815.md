# Sunny Phase92：ManagedTable 契约修复（2026-08-15）

status: in_progress
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

## 发布与风险

本切片尚未发布 47；只涉及 UI 共享组件，无 Prisma、权限、财务口径或业务状态变更。发布前需在 phase91/唯一集成分支完成合并审查，再按 Web 白名单发布并由用户人工检查列设置视觉位置。

## 下一轮重新排序

重新扫描后最高收益从共享契约转为真实高频模块的纵向拆分。优先选择仓库工作台或财务审核列表之一，先固定页面验收样本，再抽取页面模型/API client/Repository port/定向测试；不同时拆 `App.tsx`、`Repository` 和全局 CSS。
