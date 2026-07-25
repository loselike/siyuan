# 代码瘦身治理第三十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜32`
- 续接自：`docs/dev-now/codebase-slimming-phase-31.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-32`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把录单可选仓库包裹和单票录单详情两个无写副作用 GET 迁入独立 `OrderEntryQueryController`。
- 固定样本：业务组继续只能查询本人客户的可选包裹和录单详情；管理员继续读取完整录单详情；财务、客户及未登录请求继续沿用原权限和错误文案。
- 硬边界：API 路径、HTTP 方法、查询参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 排除：录单草稿列表会触发审核超时清理写入，继续留在原 Controller；录单创建、草稿保存/删除和全部审核状态流转保持原位。

## 修改

- `apps/api/src/modules/shipment/order-entry/order-entry-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/order-entry-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-32.md`
- `.codex-state.md`

## 当前进度

- 两条原 GET 的路径、查询参数 DTO、权限装饰器、客户/仓库显式拒绝和 Repository 调用已原样迁入录单查询 Controller。
- 已清理 `DataController` 不再使用的 `OrderEntryWarehousePackageQuery` 类型导入。
- 录单草稿列表、创建、更新、删除、审核及全部 Repository、RBAC、共享契约、Prisma schema、前端和页面调用均未修改。
- 新 E2E 覆盖包裹参数/业务数据范围、财务拒绝、仓库显式原文案、详情字段结构、详情数据范围、客户显式原文案和未登录拒绝。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/order-entry-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`npm run test:api:safe -- --run src/modules/app.orders.e2e.test.ts -t "lets business role groups create order entries only for owned customers"`，固定非空包裹和录单完整链路 1/1。
- 已通过：`npm run governance:check`、`git diff --check`。
- 未通过但与本轮无关：API 全量 typecheck 仍被当前基线的 InMemory/Prisma/仓库包裹类型错误阻断，本轮目标文件不在错误清单；47 production Docker build 已通过。
- 已通过：基于 47 当前源码只应用三个 API 运行时文件白名单补丁，完整保留远端 `PayerBankAccountController` 等本地尚无功能；仅重建/重启 API，无迁移。
- 已通过：47 两个目标 GET 在 `DataController` 中为 0，在新 Controller 中为 2；镜像内编译产物存在，Nest 启动映射两条目标 GET 各一次；录单草稿、创建和草稿保存/删除四条原路由继续映射。
- 已通过：47 业务组本人客户和范围外客户包裹查询均为 200/0 条，返回集合分别满足本人客户代码约束与范围外空集；当前线上无可用非空包裹，非空固定样本由本地既有订单 E2E 覆盖。
- 已通过：47 管理员录单详情为 200 且六个顶层字段完整；范围外业务组保留 404“录单不存在”；财务包裹查询和客户详情保留 403“没有访问权限”；本地显式测试授权证明仓库/客户仍被原文案“当前角色不能使用内部录单”拒绝。
- 已通过：未登录包裹查询 401“缺少登录凭证”；API/Web 容器正常，容器内与公网 health 为 200，API 最近实际错误日志为 0。

## 治理效果

- `DataController` 再减少 19 行，并移除一个无用类型导入。
- 运行时代码净增加 10 行，契约测试增加 106 行；本阶段改善领域边界和数据范围回归保护，不宣称性能提升或全仓代码量下降。
- 查询继续复用原 Repository；数据库查询、包裹占用过滤、业务数据范围、费用字段裁剪和错误文案均未改。

## 交接

- 阻塞：无。
- 剩余风险：47 当前业务组可选包裹为空，线上只验证了空集和范围约束；非空包裹、录单创建到详情的完整固定样本已由本地既有 E2E 覆盖。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-32`。
- 准确下一步：把仓库待出库列表和已打印交接单预览两个纯 GET 迁入新的 `WarehouseDispatchQueryController`；出库确认和交接单打印写接口继续保持原位。
