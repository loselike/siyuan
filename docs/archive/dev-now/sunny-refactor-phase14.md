# Sunny 深度重构第十四阶段：理货生命周期 Controller 独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜14`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase13.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase14`
- 分支：`codex/sunny-refactor-phase14`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase14`
- 认领时间：`2026-08-12 01:39 Asia/Shanghai`

## 输入摘要

- 目标：把已经由 `WarehouseTallyLifecycleService` 承接的创建、修改、开始、取消、完成、完成件数拒绝、反审核、取消已完成八条路由整体迁出巨型 `DataController`。
- 固定样本：仓库任务从创建、修改、开始、完成到反审核/取消的完整 E2E，继续验证权限、状态、包裹副作用、幂等和审计。
- 不做：不修改路由、HTTP 方法、权限、输入输出、状态码、application service、Prisma/InMemory Repository、事务、包裹写入、审计或 lineage。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.controller.ts`
- `apps/api/src/modules/mojia-route-auth-contract.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase14.md`

## 结果

- 新增独立 `WarehouseTallyLifecycleController`，八条外部路径、HTTP 方法、权限装饰器、body 与 service 调用原样迁移；AppModule 注册新 Controller。
- `WarehouseTallyLifecycleService` 和两套 Repository 未修改，既有权限二次检查、站点/数据范围、状态流转、事务、行锁、包裹归档/恢复、审计和 lineage 保持在原实现。
- `DataController` 不再注入 lifecycle service，减少 8 条路由、63 行；治理预算从 265/2,979 收紧到 257/2,916，432 条总路由及权限集合不变。
- Mojia 安全契约只同步 `DataController` 构造参数数量，设备 token 前置拒绝逻辑与断言未改。

## 验证

- 重构前后同一生命周期 E2E + service 单测均为 6/6，覆盖创建/修改/开始/取消/完成/完成件数拒绝/反审核/取消已完成、权限、状态、包裹和审计。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 主线程对抗复核确认路由 metadata 完全等价、service/Repository 文件无改动、完成件数仍在 Repository 前固定拒绝、开始路径两套适配器既有审计动作名差异未被统一。
- 47 API production build、重启成功；发布 `whitelist-9d888f30e0cef7ebc5f284af`。
- 三份运行源码 checksum 与候选一致；线上八条路由未登录均 401，当前业务员允许/拒绝路径保持既有 400/404/403，管理员安全探针保持 400/404，完成件数固定拒绝文案保持 400；公网 health 200、API 错误日志 0、容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：未在生产创建或修改真实理货任务，避免污染仓库任务、包裹和审计；由未改 service/Repository、本地完整 E2E、生产构建和线上无写安全探针共同保护。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：八条路由已由独立 lifecycle Controller 承接，DataController 路由数和行数实际下降。
- 安全证据：重构前后 E2E 等价、权限 metadata、状态/包裹/审计、API typecheck、完整治理、47 CAS/checksum、容器和日志均通过。
- 未验证项：未在生产执行真实生命周期成功写入，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-9d888f30e0cef7ebc5f284af`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase14` 建立 phase15，完成理货运输层收口：为重复理货统计及合票创建/创建出货单建立独立 Controller/Service/port，保留两套 Repository 业务实现不动。
