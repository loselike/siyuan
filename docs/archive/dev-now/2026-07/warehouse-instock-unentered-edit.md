# 在仓未录单包裹修改

## 本轮目标

在仓数据中，所有未录单（未绑定 `shipmentId`）的普通在仓包裹均可修改；已录单、已合票、已出库和已归档包裹继续锁定。

## 修改范围

- 前端在仓/今日收货的修改入口按是否已绑定运单显示，不再把 `PENDING` 排除在外。
- 内存与 Prisma 仓储统一按 `PENDING`、`RECEIVED` 且未绑定运单校验。
- 新增状态组合单元测试。

## 验证

- `npm test -w @siyuan/api -- --run src/modules/warehouse-package-editability.test.ts`
- `USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.warehouse.e2e.test.ts -t "updates warehouse package inbound data, remark, and exception fields"`
- `npm test -w @siyuan/web -- --run src/modules/warehouse/warehouse.test.tsx -t "allows unentered in-stock packages" --reporter=verbose`
- `npm run typecheck -w @siyuan/web`
- `git diff --check`
