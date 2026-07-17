# 客户资料管理员指派业务员并同步客户业务归属

- 状态：`completed`
- 输入来源：`用户提供任务卡 2026-07-12-客户资料管理员指派业务员并同步客户业务归属`
- 会话 slug：`customer-salesperson-assignment`
- 分支：`当前共享工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-12 Asia/Shanghai`

## 输入摘要

- 目标：管理员通过客户资料下拉选择启用业务员，改派后统一客户业务归属与可见范围。
- 不做：不改客户账号绑定、费用和状态口径，不做批量改派或 47 发布。

## 允许修改

- `apps/web/src/modules/masterData/MasterDataPage.tsx`
- `apps/web/src/modules/masterData/masterData.test.tsx`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.orders.e2e.test.ts`

## 当前进度

- 客户新增/编辑的业务员归属已改为管理员可用的启用业务员下拉；普通业务员仍固定为本人。
- 后端校验被指派账号必须启用且具备业务员职责；管理员可清空归属。
- 改派会同步内存实现中的运单、仓库包裹和水单业务员快照；Prisma 实现同步包裹和水单快照，运单与财务查询统一以客户当前归属做作用域和显示归属，同时保留 `entryBy` 的原录单人可见条件。
- 改派写入 `master_data.customer.assign_salesperson`，记录前后归属和受影响运单/包裹/水单数量。

## 验证

- 通过：`npm test -w @siyuan/web -- --run src/modules/masterData/masterData.test.tsx -t "客户|业务员归属|指派"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "assigns a customer to an enabled salesperson"`
- 通过：`npm run typecheck -w @siyuan/web`、`npm run typecheck -w @siyuan/api`、`git diff --check`
- 任务卡 API 宽筛选命令仍有 1 条既有失败：客服全流程断言期望业务员不可见应付，但当前工作区返回了 `payables`；本轮客户归属新增用例通过，未修改该财务权限链路。

## 交接

- 阻塞：无
- 剩余风险：Prisma 的 `Shipment` 无 `salesperson` 冗余字段，历史运单、客服及财务行通过客户当前归属动态裁剪；已有 `entryBy` 保持原录单人可见，不会被改派覆盖。
