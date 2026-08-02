# warehouse-tally-marker-confirmed-only

- 状态：`complete`
- 输入来源：`当前会话任务卡：2026-07-10-warehouse-tally-marker-confirmed-only.md`
- 会话 slug：`warehouse-tally-marker-confirmed-only`
- 分支：`当前工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-10 Asia/Shanghai`

## 输入摘要

- 目标：仅为真实已完成的理货任务对应包裹显示在仓数据的“理”标识。
- 不做：不改理货、拆票、录单和出库流程，不清理历史数据。

## 允许修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/web/src/modules/warehouse/warehouse.test.tsx`
- `apps/api/src/modules/app.warehouse.e2e.test.ts`

## 当前进度

- 已修复：在仓接口仅为关联到真实 `COMPLETED` 理货任务的包裹返回理货标识和任务号；孤立或未完成关联会被裁剪为待理货。
- 已修复：前端仅按完成状态和完整任务关联显示“理”，查看入口只匹配已完成任务。
- 已发布：仅同步仓库理货相关 API/Web 源文件至 47，重建并重启 `api`、`web`，未执行数据库迁移。

## 验证

- 已通过：任务卡指定的 Web、API 定向测试、Web/API typecheck 与 `git diff --check`。

## 交接

- 阻塞：无
- 剩余风险：未使用真实线上账号完成理货后再做浏览器端完整流程验收。
