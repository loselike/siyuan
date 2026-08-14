# Sunny 深度重构第二十三阶段：承运商任务命令边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜23`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase22.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase23`
- 分支：`codex/sunny-refactor-phase23`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase23`
- 认领时间：`2026-08-12 04:20 Asia/Shanghai`

## 输入摘要

- 目标：把承运商任务执行和失败重试迁出综合 `DataController`，形成独立 tracking task command transport/application/port 边界。
- 固定样本：管理员让待执行 DHL 任务模拟失败，再成功重试，核对任务状态、次数、失败原因、完成时间、运单最新轨迹和 lineage；同时固定未登录、越权、缺失任务、非失败重试和成功任务重复执行拒绝。
- 不做：不修改路由、HTTP 方法、权限码、客户拒绝、请求默认值、任务状态、次数、失败原因、运单可见范围、轨迹事件、事务、响应、审计或 lineage；不统一 Prisma/InMemory 既有访问检查差异。

## 允许修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/carrier-task-command.e2e.test.ts`
- `apps/api/src/modules/tracking/task/**`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase23.md`

## 结果

- `POST /carrier-tasks/:id/run` 与 `POST /carrier-tasks/:id/retry` 已迁入 `CarrierTaskCommandController/Service/Repository`，原 Prisma/InMemory Repository 继续作为适配器，执行与重试实现零修改。
- 路由、HTTP 方法、权限码、客户防御、请求透传、状态、次数、失败原因、运单轨迹、事务、响应与 lineage 保持不变；两套适配器原有访问检查差异未统一。
- `DataController` 减少 2 条路由和 19 行；治理预算从 230/2,598 收紧为 228/2,579，系统总路由仍为 432。
- 代码提交 `f397a41` 已推送 `origin/codex/sunny-refactor-phase23`。

## 验证

- 迁移前承运商命令 E2E 与既有 lineage 固定样本 2/2 通过；迁移后同两条样本与 service 3 条共 5/5 通过，覆盖失败、重试成功、重复执行拒绝、状态/次数/错误/完成时间、最新轨迹、401/403/404/400 和调用透传。
- API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-3a18fb14982711c70a4b0ece`。五份运行源码 checksum、release state API 镜像和运行容器一致。
- 线上两路由未登录均 401、真实启用无权限角色 `UG_FINANCE` 均 403、管理员对缺失任务均 404；没有执行真实承运商任务。公网 health 200、API 实际错误 0、四容器正常、锁 free、recovery clear。
- 首次发布在第 4 个文件 SSH 会话异常悬停，脚本自动回滚已替换 3 文件并释放锁；核对原 checksum 与 recovery clear 后一次干净重试完成。

## 交接

- 阻塞：无。
- 剩余风险：旧 `app.warehouse.e2e` 两条承运商任务用例在与本轮无关的审核前置失败，需后续单独修复测试数据链路；47 白名单多文件发布的 SSH 结束悬停已再次出现，应单独修复发布脚本超时与恢复机制。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：迁移前后固定 E2E/lineage 等价，`DataController` 路由数和行数实际下降，线上新 Controller 两路由已映射。
- 安全证据：service、API typecheck、完整治理、47 CAS/checksum、401/403/404 无业务写探针、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产执行真实任务失败或成功重试，避免改变真实运单和轨迹；旧宽 E2E 测试数据链路仍过时。
- 发布状态：已发布 47，release `whitelist-3a18fb14982711c70a4b0ece`。
- 稳定附件：无。
- 准确下一步：建立 phase24，迁移外部轨迹批量导入命令边界，先冻结动态权限、批量结果、轨迹写入与 lineage，再只改 transport/application 依赖方向。
