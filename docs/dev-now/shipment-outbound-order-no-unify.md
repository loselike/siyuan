# 出货单号后端统一

- 状态：`completed`
- 输入来源：无（当前会话明确请求）
- 会话 slug：`shipment-outbound-order-no-unify`
- 分支：`未切换（共享脏工作树，仅改本轮相关文件）`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-12 00:00 Asia/Shanghai`

## 输入摘要

- 目标：将系统出货单号/原“运单号”按后端统一为出货单号口径，避免同一个 `systemOrderNo` 字段在业务上出现两个名称。
- 不做：不重命名 Prisma 数据库列，不做线上发布，不改变客户单号、转单号、快递号等其他业务字段含义。

## 允许修改

- `packages/shared/src/index.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.orders.e2e.test.ts`
- `apps/web/src/modules/**` 中直接展示 `systemOrderNo` 为“运单号/系统单号”的用户可见文案与相关测试
- `docs/dev-now/shipment-outbound-order-no-unify.md`

## 当前进度

- 已完成：后端/共享 DTO 保留数据库物理字段 `systemOrderNo`，增加同值业务别名 `outboundOrderNo`，并兼容 `outboundOrderNo || systemOrderNo` 输入与查询。
- 已完成：后端与前端用户可见的 `systemOrderNo` 文案统一显示为 `出货单号`。
- 已按用户要求收窄：未改数据库物理列名，未改轨迹导入表头兼容逻辑，未改仓库创建时间等其他业务字段。

## 验证

- `npm run typecheck -w @siyuan/api` 通过
- `npm run typecheck -w @siyuan/web` 通过
- `git diff --check` 通过

## 交接

- 阻塞：无
- 剩余风险：本轮不做数据库列级重命名；如必须物理改列需单独迁移卡。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
