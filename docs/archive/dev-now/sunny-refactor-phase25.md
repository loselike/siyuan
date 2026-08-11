# Sunny 深度重构第二十五阶段：人工轨迹新增命令边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜25`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase24.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase25`
- 分支：`codex/sunny-refactor-phase25`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase25`
- 认领时间：`2026-08-12 04:58 Asia/Shanghai`

## 输入摘要

- 目标：在不改变任何业务逻辑的前提下，将运单与运营单的两条人工轨迹新增路由从 `DataController` 迁入独立 Tracking command 边界。
- 固定样本：`s-seed-3`；管理员经 `/shipments/:id/tracking-events` 新增，业务员经 `/operations/line-shipments/:id/tracking-events` 新增。
- 不做：不改 HTTP 方法/路由、201/401/403/404、两个原权限标识、请求/返回字段、Repository 实现、shared 契约、Prisma schema，不统一 Prisma/InMemory 适配器已有差异，不在 47 写入真实轨迹。

## 允许修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/tracking/event/**`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase25.md`

## 结果

- 两条路由已迁入 `TrackingManualEventCommandController/Service/Repository port`，原 Prisma/InMemory Repository 继续作为适配器，实现零修改。
- HTTP 方法/路由、201/401/403/404、`tracking:external:single-add`、`operations:line-shipment:tracking-add`、请求/返回字段、可见范围、轨迹持久化、最新轨迹和 lineage 保持不变。
- `DataController` 减少 2 路由/13 行，治理预算从 227/2,567 收紧为 225/2,554，系统总路由仍为 432。
- 代码提交 `dceea39` 已推送 `origin/codex/sunny-refactor-phase25`。

## 验证

- 迁移前两条契约 E2E/lineage 2/2 通过；迁移后同两条与 service 3 条共 5/5 通过，覆盖 401/403/404/201、两项独立权限、请求透传、返回字段和 lineage。
- API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build/重启成功，发布 `whitelist-b2bf6880f1e548adbb9b5724`；五份运行源码 checksum 一致，API 指纹 `fdbe8f84c2abb4664c6563d165aa40605010a28d9a6f9515dc36923cb371a93e`。
- 线上两路由均完成未登录 401、真实启用 `UG_FINANCE` 403、管理员缺失运单 404 无业务写入探针；内外 health 200、API 实际错误 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：Prisma 创建独立 TrackingEvent，InMemory 仅更新运单最新轨迹；该已有适配器差异本轮冻结。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：同一固定样本在迁移前后均返回等价结果，`DataController` 已实际减少 2 路由/13 行。
- 安全证据：两路由 401/403/404 与两项独立权限 E2E、service 转发单测、API typecheck、完整治理、47 checksum/镜像/容器/日志/锁/recovery 均通过。
- 未验证项：未在生产对真实运单新增轨迹，避免污染业务数据；允许路径由迁移前后本地 E2E 固定。
- 发布状态：`已发布 47，release whitelist-b2bf6880f1e548adbb9b5724`。
- 稳定附件：无。
- 准确下一步：从 `dceea39` 建立 phase26，先冻结客服问题标签查询的多权限顺序和标签增删改契约，再迁入独立 customer-service tag 边界。
