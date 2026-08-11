# Sunny 深度重构第十六阶段：仓租边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜16`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase15.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase16`
- 分支：`codex/sunny-refactor-phase16`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase16`
- 认领时间：`2026-08-12 01:58 Asia/Shanghai`

## 输入摘要

- 目标：把仓租明细、导出、规则查询、创建、版本更新、删除和启停七条路由迁出巨型 `DataController`。
- 固定样本：管理员读取/导出仓租、创建未来规则、生成新版本、删除新版本并恢复旧版本，以及权限、校验和审计。
- 不做：不修改路由、HTTP 方法、权限、请求/响应、状态码、仓租算法、可见范围、金额、时区、Prisma/InMemory Repository、Serializable 事务、版本链或审计。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse-rent.e2e.test.ts`
- `apps/api/src/modules/warehouse/rent/warehouse-rent.controller.ts`
- `apps/api/src/modules/warehouse/rent/warehouse-rent.repository.ts`
- `apps/api/src/modules/warehouse/rent/warehouse-rent.service.ts`
- `apps/api/src/modules/warehouse/rent/warehouse-rent.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase16.md`

## 结果

- 新增 `WarehouseRentController/Service/Repository` port，七条仓租路由由独立边界承接；两套旧 Repository 继续作为适配器。
- 仓租计算、销售/站点范围、屏蔽权限、RMB 金额、Asia/Shanghai 日期归一化、规则重叠、Serializable 版本写入、删除恢复、启停和审计实现均未修改。
- `DataController` 减少 7 条路由和 56 行；治理预算从 254/2,892 收紧为 247/2,836，系统总路由仍为 432。
- 代码提交 `116f10a` 已推送 `origin/codex/sunny-refactor-phase16`。

## 验证

- 新增仓租 E2E 在迁移前 2/2、迁移后 2/2，固定 401/403、明细/导出结构、规则创建、上海日期转 UTC、版本更新、未来版本停用拒绝、删除恢复和 create/version/delete 审计。
- 新增 service 单测 2/2，固定七个方法的参数、返回值和异常不翻译。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 主线程对抗复核确认七条路由 metadata 等价、Repository 文件零修改、导出仍复用明细权限/审计、生产探针不创建或修改仓租规则。
- 47 API production build、重启成功；发布 `whitelist-382f39b31a3defc5cc17d9d9`。
- 五份运行源码 checksum 与候选一致；线上七路由未登录均 401，缺少仓租权限的生产角色 403，管理员明细/导出/规则 200，非法创建 400，三条缺失规则写路径均 404；公网 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：未在生产创建真实仓租规则，避免污染金额规则、版本链和审计；生产成功写入由未改 Repository、本地完整版本链 E2E 和线上无写探针共同保护。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：七条仓租路由已由独立边界承接，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、service 参数/异常单测、API typecheck、完整治理、47 CAS/checksum、线上允许/拒绝路径、容器和日志均通过。
- 未验证项：未在生产执行规则创建/版本/删除/启停成功写入；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-382f39b31a3defc5cc17d9d9`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase16` 建立 phase17，把仓库包裹创建、手工收货、补录、拆票、修改、备注和异常七条生命周期路由迁入独立 Controller/Service/port，继续保持两套 Repository 行为不动。
