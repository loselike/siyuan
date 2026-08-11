# Sunny 深度重构第二十六阶段：客服问题标签边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜26`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase25.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase26`
- 分支：`codex/sunny-refactor-phase26`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase26`
- 认领时间：`2026-08-12 05:10 Asia/Shanghai`

## 输入摘要

- 目标：把客服问题标签查询、创建、修改和删除迁出综合 `DataController`，建立 customer-service problem-tag transport/application/port 边界。
- 固定样本：客户/业务/客服查询初始 8 条标签；客服将一条标签创建、规范化、更名、删除，并核对审计。
- 不做：不改路由、状态码、GET 多权限集合及拒绝审计、CRUD 权限、标签规范化/10 条上限/重名/排序/返回/审计，不改 Repository、shared、Prisma schema 和前端。

## 允许修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/customer-service/problem-tag/**`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase26.md`

## 结果

- 四条路由已迁入 `ProblemTicketTagController/Service/Repository port`，原 Prisma/InMemory Repository 继续作为适配器，标签实现零修改。
- GET 的 11 项动态权限并行检查、全量拒绝证据和非阻断审计失败，CRUD 权限、请求/返回、规范化、10 条上限、重名、排序、事务与审计保持不变。
- `DataController` 减少 4 路由/27 行，治理预算从 225/2,554 收紧为 221/2,527，系统总路由仍为 432。
- 代码提交 `33acb16` 已推送 `origin/codex/sunny-refactor-phase26`。

## 验证

- 迁移前 problem-tag E2E 1/1 通过；迁移后同一 E2E 和 service 4 条共 5/5 通过，覆盖 401/403/200、多角色查询、CRUD、规范化、重名 409、缺失 404、持久化和三个审计动作。
- API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build/重启成功，发布 `whitelist-59208403aa9168c5acce03a4`；五份运行源码 checksum 一致，API 指纹 `183829c0ca11822e762af9eeb8c62cb80138774e1f7355aa8a7768bf04e6a469`。
- 线上四路由映射完整；未登录 GET 401、真实 `UG_FINANCE` GET/POST 403、真实 `UG_CUSTOMER_SERVICE` GET 200（8 条）、缺失标签 PUT/DELETE 404；无标签业务写入，内外 health 200、API 实际错误 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产 Prisma 使用 Serializable/唯一约束并写审计，InMemory 使用数组及同步审计；这些适配器差异本轮冻结。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时 Sunny 业务逻辑不变。
- 效果证据：迁移前后同一固定样本的查询、CRUD、排序、规范化、异常和审计结果等价，`DataController` 实际减少 4 路由/27 行。
- 安全证据：动态权限单测、多角色 E2E、API typecheck、完整治理、47 checksum/镜像/容器/日志/锁/recovery 均通过。
- 未验证项：未在生产创建/修改/删除真实标签，避免污染线上客服配置；允许写路径由迁移前后本地 E2E 固定。
- 发布状态：`已发布 47，release whitelist-59208403aa9168c5acce03a4`。
- 稳定附件：无。
- 准确下一步：从 `33acb16` 建立 phase27，抽取两套 Repository 重复的问题标签名称规范化/快照验证领域策略，先用双适配器契约冻结结果。
