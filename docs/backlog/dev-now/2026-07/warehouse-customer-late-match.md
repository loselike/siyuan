# 仓库先收货、客户后建档匹配

状态：本地完成，未发布 47。

- 手工收货允许输入未建档但有效长度的客户编号，包裹暂不归属业务员。
- 新建同编号客户时，仅匹配 `salesperson` 为空且未生成正式运单（`shipmentId` 为空）的包裹；同步客户名称、业务员和站点。
- 自动匹配写入 `master_data.customer.match_pending_packages` 审计日志，保留包裹 ID 与数量。
- 验证：仓库 E2E 定向测试、API/Web 类型检查、`git diff --check` 均通过。
