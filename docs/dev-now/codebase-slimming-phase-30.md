# 代码瘦身治理第三十阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜30`
- 续接自：`docs/dev-now/codebase-slimming-phase-29.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-30`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把客服转单号候选列表和问题件列表两个无写副作用 GET 迁入独立 `CustomerServiceQueryController`。
- 固定样本：管理员和客服继续读取转单号候选数组；问题件对管理员/客服保持完整，对客户只返回本人客户且 `customerVisible=true` 的记录；客户、仓库和未登录的原拒绝状态及文案保持不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 排除：面单 GET 含 `RequireAuth + ensureAnyPermission` 动态权限与显式客户拒绝，本阶段不复制该权限逻辑；客服转单填写、问题件新增/回复/关闭/协助等写接口均保持原位。

## 修改

- `apps/api/src/modules/customer-service/query/customer-service-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/customer-service-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-30.md`
- `.codex-state.md`

## 当前进度

- 两条原 GET 的路径、权限装饰器和 Repository 调用已原样迁入客服查询 Controller。
- 所有客服写入口、Repository、RBAC、共享契约、Prisma schema、前端和页面调用均未修改。
- 新 E2E 通过测试内固定问题件样本证明客户只能看到本人客户的客户可见问题件，客服仍能看到内部问题件。
- 47 当前源码包含本地分支尚没有的 `customer-service/data-confirm-shipments` 和 `customer-service/problem-tags`；发布补丁以 47 当前文件为基线，只删除两个目标 GET，完整保留远端新增入口及其写路由。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/customer-service-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`npm run governance:check`、`git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 两个目标 GET 在 `DataController` 中为 0，在新 Controller 中为 2；镜像内编译产物存在，Nest 启动映射两条目标 GET 各一次。
- 已通过：47 管理员和客服转单号候选均为 200，当前均为 0 条，并与 47 当前“出库后、本轮业务和代理数据均已确认、未填转单号”的数据库条件精确一致；客户为 403“没有访问权限”，未登录为 401“缺少登录凭证”。
- 已通过：47 管理员与客服问题件均为 200/3 条且 ID 集合相同；客户为 200/0 条并与数据库本人客户可见问题件集合精确一致；仓库为 403“没有访问权限”，未登录为 401“缺少登录凭证”。
- 已通过：远端既有数据确认和常用标签 GET 均继续 200 且保持数组响应；对应源码入口各保留 1 个，Nest 映射存在。
- 已通过：API/Web 容器正常，公网 health 为 200，API 最近实际错误日志为 0。

## 治理效果

- `DataController` 再减少 12 行，客服只读查询形成独立边界。
- 运行时代码净增加 10 行，契约测试增加 99 行；本阶段改善可维护性和数据范围回归保护，不宣称性能提升或全仓代码量下降。
- 查询继续复用原 Repository；数据库查询、审批周期判断、数据范围、字段裁剪、排序和响应均未改。

## 交接

- 阻塞：无。
- 剩余风险：47 当前没有符合转单号候选条件的非空样本，候选集合已按远端最新审批周期算法与数据库精确对照，但非空字段裁剪仍只能由 Repository 未改和既有测试间接保证。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-30`。
- 准确下一步：把专线运单池和单票内部流通日志两个纯 GET 迁入新的 `OperationsLineShipmentQueryController`；原查询参数、数据范围、敏感金额/代理字段裁剪、客户显式拒绝和原错误文案必须保持不变，所有状态更新、轨迹和问题件写接口继续留在原处。
