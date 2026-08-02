# 待排货严格字段与成本流转

- 状态：已完成
- 任务卡：`2026-07-12-routing-pending-strict-field-and-cost-flow.md`
- 范围：市场待排货字段顺序、排货修改/审核分流、代理渠道资料复用、成本展示与只读裁剪。
- 不做：47 发布、历史数据回填、仓库出库和客服确认流程改造。
- 已完成：待排货严格字段列工厂保留市场顺序；市场可双击进入排货详情，`修改` 只保存排货资料，`审核` 才推进待出库；手动代理可入库、代理渠道可选择保存到资料库；市场应付/业务成本合计优先使用后端 RMB 折算值，仓库保持不展示成本，客服保持只读且不展示应付金额。
- 验证：`routing` Web 全量测试、`warehouse` Web 定向测试、orders API 定向测试、Shared build、Web typecheck、`git diff --check` 通过。客服 Web 定向测试失败于既有费用明细断言（期望应收合计 230.00 USD，当前 fixture 实际为 350.00 USD），未在本卡调整费用口径；API typecheck 在最终验证时被其他并发改动阻断：`in-memory.repository.ts:4044` 的可空访问、`prisma.repository.ts:5097` 缺少 `completeWarehouseTallyTaskWithResults`，均不在本卡修改范围。
