# Sunny 深度重构第二十阶段：出库确认与动态权限边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜20`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase19.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase20`
- 分支：`codex/sunny-refactor-phase20`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase20`
- 认领时间：`2026-08-12 03:42 Asia/Shanghai`

## 输入摘要

- 目标：把出库确认与基础、批量、贴唛头三层动态权限检查迁出综合 `DataController`，接入第十九阶段的 dispatch 模块边界。
- 固定样本：仓库角色对已排货、已打印交接单运单执行带批量来源和贴唛头确认的出库，核对状态、交接编号、操作者、来源和审计；同时固定未登录、越权和重复出库拒绝。
- 不做：不修改路由、HTTP 方法、请求/响应、权限码、权限顺序、异常文案、状态机、费用匹配、面单、交接单、包裹事务、轨迹任务、审计或两套 Repository；线上不执行真实成功出库。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse-dispatch-query.e2e.test.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.controller.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.repository.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.service.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase20.md`

## 结果

- 出库确认路由迁入 `WarehouseDispatchController`，动态授权迁入 `WarehouseDispatchService`；Repository 和授权分别通过窄 port 注入。
- 完整保留 `dispatch-confirm -> batch-dispatch-confirm -> shipping-mark-confirm` 的条件与检查顺序，以及拒绝审计的 `SERVER / warehouse granular action` 口径。
- 原 Prisma/InMemory 文件零修改；状态转换、强制理货杂费、作废面单、应付成本、交接单、贴唛头、转单审核、包裹行锁/事务、轨迹任务、lineage 和字段裁剪均保持。
- `DataController` 减少 1 条路由和 14 行；治理预算从 238/2,760 收紧为 237/2,746，系统总路由仍为 432。
- 代码提交 `ae15fb0` 已推送 `origin/codex/sunny-refactor-phase20`。

## 验证

- dispatch E2E 在迁移前 2/2、迁移后 2/2，固定 401/403、带批量来源和贴唛头确认的成功出库、响应字段、重复出库拒绝和完整审计副作用。
- service 单测 5/5，固定五个 dispatch 模块调用透传、三层权限顺序、每一层拒绝审计、拒绝时 Repository 零访问和异常不翻译。
- API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-f13e61b7c0b453cfba526077`。
- 五份运行源码 checksum 与候选一致；release state 的 API 镜像与运行容器一致；线上未登录 401、真实无基础权限角色 403、具备全部权限的管理员走到缺失运单 404，未写生产运单；公网 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产当前没有“具备基础出库权限但缺少批量或贴唛头权限”的可用账号，因此线上未单独命中两条条件拒绝；其精确顺序和拒绝审计由 application service 三组定向单测保护。未执行生产成功出库，避免污染真实运单、包裹和审计。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：出库 transport/application/authorization/adapter 依赖方向已形成，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、三层动态权限 service 单测、API typecheck、完整治理、47 CAS/checksum、线上 401/403/404 无写探针、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产执行成功出库；未找到可分别验证批量/贴唛头条件拒绝的生产角色；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-f13e61b7c0b453cfba526077`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase20` 建立 phase21，把面单生成、上传、列表和作废四条路由迁入独立 label lifecycle Controller/Service/port，保持生成规则、文件安全、权限、转单号和审计不变。
