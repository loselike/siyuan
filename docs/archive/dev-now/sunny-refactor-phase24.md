# Sunny 深度重构第二十四阶段：外部轨迹批量导入命令边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜24`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase23.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase24`
- 分支：`codex/sunny-refactor-phase24`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase24`
- 认领时间：`2026-08-12 04:50 Asia/Shanghai`

## 输入摘要

- 目标：把外部轨迹批量导入迁出综合 `DataController`，形成独立 tracking import command transport/application/port 边界。
- 固定样本：管理员向同一运单导入两条不同时间轨迹，以较新轨迹更新运单，核对导入行数、失败/未匹配统计、审计和 lineage；同时固定未登录、客户、无权限角色和空更新拒绝。
- 不做：不修改路由、HTTP 方法、客户拒绝、两项动态权限及顺序、拒绝审计、请求/响应字段、运单范围、日期解析、去重、轨迹事件、最新轨迹、统计、事务、审计、lineage 或 Prisma/InMemory 既有差异。

## 允许修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/tracking-import-command.e2e.test.ts`
- `apps/api/src/modules/tracking/import/**`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase24.md`

## 结果

- `POST /shipments/tracking-events/import` 已迁入 `TrackingImportCommandController/Service/Repository`，原 Prisma/InMemory Repository 继续作为适配器，批量导入实现零修改。
- 客户防御、`import-confirm -> overwrite` 权限顺序、拒绝审计、请求透传、运单范围、日期解析、同票最新轨迹选择、统计、响应、审计和 lineage 保持不变。
- `DataController` 减少 1 条路由和 12 行；治理预算从 228/2,579 收紧为 227/2,567，系统总路由仍为 432。
- 代码提交 `fb6d19c` 已推送 `origin/codex/sunny-refactor-phase24`。

## 验证

- 迁移前导入命令 E2E 与既有 lineage 固定样本 2/2 通过；迁移后同两条样本与 service 4 条共 6/6 通过，覆盖 401、客户专属 403、无权限 403、空更新 400、两项权限顺序、拒绝审计、较新轨迹、导入统计、运单结果、导入审计和 lineage。
- API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-314b33fff32a6b100acd7db0`。五份运行源码 checksum、release state API 镜像和运行容器一致。
- 线上未登录 401、真实启用无权限角色 `UG_FINANCE` 403、管理员空更新 400；生产没有启用客户账号，因此客户专属文案由本地 E2E/service 固定。没有导入真实轨迹；公网 health 200、API 实际错误 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：Prisma 每条输入写 TrackingEvent，InMemory 仅更新运单最新轨迹；该适配器差异在本轮冻结，不猜测统一。生产没有启用客户账号，客户专属拒绝只由本地保护网证明。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：迁移前后导入/lineage 固定样本等价，`DataController` 路由数和行数实际下降，线上新 Controller 路由已映射。
- 安全证据：service 权限顺序与拒绝审计单测、API typecheck、完整治理、47 CAS/checksum、401/403/400 无业务写探针、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产导入真实轨迹，避免修改真实运单和物流事件；未在线验证客户专属文案。
- 发布状态：已发布 47，release `whitelist-314b33fff32a6b100acd7db0`。
- 稳定附件：无。
- 准确下一步：建立 phase25，迁移运单与运营单的单条手工轨迹新增命令，先冻结各自权限、运单范围、轨迹事件、最新轨迹、审计和 lineage。
