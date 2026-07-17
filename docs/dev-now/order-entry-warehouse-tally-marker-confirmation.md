# 录单仓库理货完成标记

- 状态：已完成（本地，未发布）
- 任务卡：2026-07-11-order-entry-warehouse-tally-marker-confirmation。
- 实现：新增只读 `tallyCompleted` 字段。API 仅在包裹 ID 被真实 `COMPLETED` 理货任务的 `packageIds` 或 `appliedPackageId` 命中时返回任务号、已理货状态和 `tallyCompleted=true`；残留任务字段、非完成任务和非收货包裹均按未理货返回。录单和仓库页面只认该字段显示“理”与理货明细。
- 验证：仓库理货 Web 定向测试 4 项、录单仓库数据 Web 定向测试 2 项、仓库 API E2E 定向测试 2 项、Web/API 类型检查、`git diff --check` 均通过。
- 未做：不发布 47，不修改历史数据或理货操作流程。
