# 市场待排货字段与操作重整

- 状态：已完成（未发布、未提交 Git）
- 范围：市场管理待排货的字段、成本口径、排货审核操作与严格状态流转；仓库只读待排货保持不变。

## 本轮完成

- 待排货按任务卡顺序展示业务成本、应付成本、合计、排货入口与三项操作；旧列设置使用新版本键，避免历史列偏好覆盖新顺序。
- 排货只保存资料；审核增加二次确认，并仅允许 `WAITING_SORT -> WAITING_DISPATCH`。代理、代理渠道、计费重、单价缺失时引导先排货或修改。
- 市场无 `routing:write` 权限时禁用排货入口且不提供审核、修改；操作日志仍可查看内部生命周期记录。
- 内存与 Prisma 仓储均拒绝非待排货运单的排货/修改请求；补充 API 状态流转断言。

## 验证

- 通过：`npm test -w @siyuan/web -- --run src/modules/routing/routing.test.tsx -t "待排货|业务成本|应付成本|排货|审核|修改|操作日志"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "deletes only waiting-sort routing shipments"`
- 通过：Web/API typecheck、`git diff --check`。
- 已知：任务卡给出的 API 宽筛选命令会命中既有全流程测试；该测试在录单提交返回 `DRAFT` 而非预期 `REVIEW_PENDING` 处失败，与本次待排货状态校验无关。
