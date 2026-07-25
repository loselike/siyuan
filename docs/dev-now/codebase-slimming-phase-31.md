# 代码瘦身治理第三十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜31`
- 续接自：`docs/dev-now/codebase-slimming-phase-30.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-31`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把专线运单池和单票内部流通日志两个无写副作用 GET 迁入独立 `OperationsLineShipmentQueryController`。
- 固定样本：管理员和仓库继续读取专线运单池；业务员继续只看到本人录入范围；仓库继续裁掉预估应收、单票应收、备注和代理字段；内部日志继续执行运单数据范围，仓库和客户继续被原权限/显式角色边界拒绝。
- 硬边界：API 路径、HTTP 方法、查询参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 排除：专线状态更新、轨迹新增、问题件新增和运单导入等写接口全部保持原位。

## 修改

- `apps/api/src/modules/operations/line-shipment/operations-line-shipment-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/operations-line-shipment-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-31.md`
- `.codex-state.md`

## 当前进度

- 两条原 GET 的路径、参数 DTO、权限装饰器、客户显式拒绝和 Repository 调用已原样迁入专线查询 Controller。
- 已清理 `DataController` 不再使用的 `LineShipmentPoolQuery` 与 `ShipmentInternalFlowLogResponse` 类型导入。
- 专线状态更新、轨迹、问题件、导入及全部 Repository、RBAC、共享契约、Prisma schema、前端和页面调用均未修改。
- 新 E2E 覆盖查询参数/分页、仓库敏感字段裁剪、内部日志结构、业务员数据范围、仓库拒绝、客户显式原文案和未登录拒绝。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/operations-line-shipment-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`npm run governance:check`、`git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 两个目标 GET 在 `DataController` 中为 0，在新 Controller 中为 2；镜像内编译产物存在，Nest 启动映射两条目标 GET 各一次。
- 已通过：47 管理员专线池 200/5 条，与数据库全部未删除专线运单 ID 集合精确一致；业务员 200/0 条，与远端当前仅按录单人范围的数据库集合精确一致；仓库 200，ID 集合与管理员一致。
- 已通过：47 仓库响应的 `estimatedReceivable=0`，行级应收、备注、代理和代理渠道字段继续裁剪。
- 已通过：47 固定单票内部日志管理员为 200 且结构正确；范围外业务员为 404“运单不存在”；仓库和客户当前默认权限均为 403“没有访问权限”；本地测试通过显式测试授权证明客户仍被原文案“客户不能查看内部流通日志”拒绝。
- 已通过：未登录专线池 401“缺少登录凭证”；API/Web 容器正常，公网 health 为 200，API 最近实际错误日志为 0。

## 治理效果

- `DataController` 再减少 15 行，并移除两个无用类型导入。
- 运行时代码净增加 9 行，契约测试增加 112 行；本阶段改善可维护性和权限/裁剪回归保护，不宣称性能提升或全仓代码量下降。
- 查询继续复用原 Repository；数据库查询、审批周期、包裹摘要、审计读取、数据范围、字段裁剪、排序和分页均未改。

## 交接

- 阻塞：无。
- 剩余风险：47 当前业务员专线池为空，数据范围已与数据库录单人条件精确对照；业务员非空字段样本仍由本地既有订单 E2E 覆盖。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-31`。
- 准确下一步：把录单可选仓库包裹和单票录单详情两个纯 GET 迁入新的 `OrderEntryQueryController`；录单草稿列表因会触发审核超时删除必须继续留在原处，录单创建、草稿保存/删除和审核状态流转也全部保持原位。
