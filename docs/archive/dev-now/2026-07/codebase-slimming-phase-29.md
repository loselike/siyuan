# 代码瘦身治理第二十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜29`
- 续接自：`docs/dev-now/codebase-slimming-phase-28.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-29`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把运单列表、运单状态统计和员工端未读角标三个无写副作用 GET 迁入独立 `ShipmentOverviewQueryController`。
- 固定样本：管理员运单列表与状态统计逐状态一致；业务员与客户列表继续使用原数据范围；财务继续裁掉付款和市场成本字段；客户访问员工端角标继续返回原 403 文案；仓库和未登录继续被权限/鉴权拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 排除：审核队列候选经调用链核验会执行超时删除、事件和审计写入，本阶段未迁移；审核详情单独迁移会形成微型 Controller，也未实施。

## 修改

- `apps/api/src/modules/shipment/overview/shipment-overview-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/shipment-overview-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-29.md`
- `.codex-state.md`

## 当前进度

- 三条原 GET 的路径、权限装饰器、Repository 调用和客户角标拒绝文案已原样迁入新查询 Controller。
- `POST /navigation/read-state` 及全部运单写接口继续留在 `DataController`。
- Repository、RBAC、共享契约、Prisma schema、前端和页面调用均未修改。
- 新 E2E 覆盖管理员列表与状态统计一致、业务员/客户数据范围、付款与市场成本字段裁剪、客户角标原文案、仓库拒绝和未登录拒绝。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/shipment-overview-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`npm run governance:check`、`git diff --check`。
- 未通过：本地 API 全量 typecheck 被当前基线 15 个无关既有类型错误阻断；错误均位于 Repository、仓库可编辑性和既有测试文件，目标 Controller、模块和 E2E 未出现在错误清单。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 三个目标 GET 在 `DataController` 中为 0，在新 Controller 中为 3；镜像内编译产物存在，Nest 启动映射三条路由各一次。
- 已通过：47 管理员运单列表 200/5 条，状态统计逐状态与同一列表一致且总数为 5；管理员角标 200 且保留业务运单管理项。
- 已通过：47 业务员和客户列表 API 数量分别与数据库原数据范围查询精确一致；当前固定样本均为 0 条，因此未用空结果宣称字段样本覆盖。
- 已通过：47 财务列表 200/5 条，付款字段和市场成本字段均继续被裁掉；客户角标 403“客户不使用员工端导航角标”，仓库运单列表 403“没有访问权限”，未登录角标 401“缺少登录凭证”。
- 已通过：API/Web 容器正常，公网 health 为 200，API 最近实际错误日志为 0。

## 治理效果

- `DataController` 再减少 19 行，运单总览读入口形成独立边界。
- 运行时代码净增加 10 行，契约测试增加 86 行；本阶段改善可维护性和回归保护，不宣称性能提升或全仓代码量下降。
- 查询仍直接复用原 Repository，SQL、数据范围、字段裁剪、排序和响应均未改。

## 交接

- 阻塞：无。
- 剩余风险：47 当前业务员和客户固定样本均无可见运单，数据范围已通过 API 数量与数据库原条件精确对照，但这两个角色的非空响应字段仍由本地 E2E 和财务线上非空裁剪样本补证。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-29`。
- 准确下一步：重新扫描剩余 GET 的 Repository 调用链，只选择多个无写副作用且领域一致的窄切片；继续排除审核队列、录单草稿、规则刷新、下载审计和线路 lineage 等表面 GET、实际写入的入口。
