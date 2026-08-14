# Sunny 深度重构第十五阶段：理货统计与合票操作边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜15`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase14.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase15`
- 分支：`codex/sunny-refactor-phase15`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase15`
- 认领时间：`2026-08-12 01:48 Asia/Shanghai`

## 输入摘要

- 目标：把重复理货统计、合票创建和合票创建运单三条剩余理货操作路由迁出巨型 `DataController`，收口理货运输层边界。
- 固定样本：管理员重复统计只读查询、空合票校验、缺失合票创建运单，以及既有合票成功 E2E。
- 不做：不修改路由、HTTP 方法、权限、请求/响应、状态码、Prisma/InMemory Repository、事务、包裹状态、运单创建、金额、审计或 lineage。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse-tally-operations.e2e.test.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-operations.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-operations.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-operations.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-operations.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase15.md`

## 结果

- 新增 `WarehouseTallyOperationsController/Service/Repository` port，三条路由由独立边界承接；两套旧 Repository 继续作为适配器。
- `POST /warehouse/consolidations` 的 `MERGE_ONLY` / `MERGE_AND_SHIP` 动态权限、拒绝审计参数和通用错误文案逐项等价迁移；Repository 内既有二次权限、事务、行锁、包裹状态、运单与审计实现未动。
- `DataController` 减少 3 条路由和 24 行；治理预算从 257/2,916 收紧为 254/2,892，系统总路由仍为 432。
- 代码提交 `acb883e` 已推送 `origin/codex/sunny-refactor-phase15`。

## 验证

- 新增 E2E 在迁移前 2/2、迁移后 2/2；新增 service 3/3，固定认证、动态权限、拒绝审计、空合票、缺失合票、重复统计响应和透传参数。
- 既有合票成功 E2E 1/1，继续覆盖 `MERGE_ONLY`、`MERGE_AND_SHIP`、草稿运单、包裹关联和响应。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 主线程对抗复核确认三条路由 metadata 等价、动态权限仍在 Repository 前执行、Repository 文件零修改、生产写入仅使用空数组/缺失 ID 安全探针。
- 47 API production build、重启成功；发布 `whitelist-acae77d7878a1def4432ca54`。
- 五份运行源码 checksum 与候选一致；线上三路由未登录均 401，当前生产业务员两种合票模式均保留既有权限并在空数组处返回 400，管理员空合票 400、缺失合票创建运单 404，重复统计 200 且结构完整；公网 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：本地种子 `operator` 对合票返回 403，而 47 当前 `operator` 用户组已配置合票权限并返回 400；这是角色配置差异，不是本轮代码变化。动态允许/拒绝两分支均由 service 单测和当前 Repository 二次权限保护。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：三条剩余理货统计/合票路由已由独立 operations 边界承接，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、成功合票 E2E、动态权限/审计单测、API typecheck、完整治理、47 CAS/checksum、线上权限/校验探针、容器和日志均通过。
- 未验证项：未在生产创建真实合票或运单，避免污染仓库包裹、运单和审计；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-acae77d7878a1def4432ca54`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase15` 建立 phase16，为仓租明细/导出及仓租规则七条路由建立独立 Controller/Service/port，继续保持两套 Repository 业务实现不动。
