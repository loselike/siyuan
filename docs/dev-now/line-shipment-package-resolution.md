# 运单关联包裹统一解析

- 状态：`complete`
- 目标：正式绑定、草稿暂存和理货结果使用同一运单包裹查询口径。

## 完成内容

- 新增 API 内部统一解析器，内存仓储与 Prisma 仓储共同使用。
- 正式 `shipmentId/systemOrderNo`、`draftWarehousePackageIds` 和正式绑定审计均可建立运单包裹关系。
- 沿 `sourcePackageId`、`archivedByPackageId` 和 `tallyTaskId` 解析理货包裹关系闭包。
- 汇总计数只计算未归档的最终包裹，国内快递单号和组合号保留全部关联来源，避免重复计重和搜索遗漏。

## 验证

- 新增统一解析器单测，覆盖正式、草稿和理货最终包裹。
- 原失败的运营专线国内快递单号搜索 E2E 已通过。
- 订单相关 API 5 项、财务 API 8 项、仓库理货 API、Shared/API build、Web/API typecheck 和 `git diff --check` 均通过。
