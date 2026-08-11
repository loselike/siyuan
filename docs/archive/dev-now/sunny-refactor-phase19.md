# Sunny 深度重构第十九阶段：仓库交接与报关边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜19`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase18.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase19`
- 分支：`codex/sunny-refactor-phase19`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase19`
- 认领时间：`2026-08-12 03:20 Asia/Shanghai`

## 输入摘要

- 目标：把待出库查询、报关标记、代理交接预览和打印调用边界迁出综合 Controller 与巨型 Repository 直接依赖。
- 固定样本：管理员为已排货运单设置报关、首次打印、重复打印并由仓库预览，核对去重、版本、首次时间和审计；同时固定未登录、越权、空打印和缺失参数拒绝。
- 不做：不修改路由、HTTP 方法、权限、请求/响应、状态码、运单范围、报关语义、打印编号、时间、去重、审计或两套 Repository；线上不执行成功报关或打印，避免污染生产数据。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse-dispatch-query.e2e.test.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch-query.controller.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.controller.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.repository.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.service.ts`
- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase19.md`

## 结果

- 新增 `WarehouseDispatchController/Service/Repository` port，四条仓库交接与报关路由统一由独立边界承接；两套旧 Repository 继续作为适配器。
- 原 Prisma/InMemory 文件零修改；运单可见范围、状态校验、重复 ID 去重、交接编号、首次/末次打印时间、打印次数和审计实现均保持。
- 旧 query controller 文件缩为兼容导出，避免 47 白名单发布遗留可编译但与 Git 不同源的旧 Controller 源码。
- `DataController` 减少 1 条路由和 7 行；治理预算从 239/2,767 收紧为 238/2,760，系统总路由仍为 432。
- 代码提交 `87a201b` 已推送 `origin/codex/sunny-refactor-phase19`。

## 验证

- 仓库交接 E2E 在迁移前 2/2、迁移后 2/2，固定列表字段裁剪、401/403、报关参数与重复提交审计、首次/二次打印的去重/版本/时间、预览和打印审计。
- service 单测 2/2，固定四个调用的参数/结果透传和 Repository 异常不翻译。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-6730149631d190da8b9651de`。
- 六份运行源码 checksum 与候选一致；release state 的 API 镜像与运行容器一致；线上四路由未登录 401、真实无权限角色 403、仓库待出库列表 200 且财务字段裁剪、报关缺参数 400、空打印 400、缺失运单/未打印运单 404；公网/容器 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：Prisma 交接预览返回最近一次打印，InMemory 因既有日志顺序返回第一次打印；该差异已由重构前 characterization 冻结，没有在结构切片中擅自修正。线上未执行成功报关或打印，避免污染生产业务与审计数据。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：四条 dispatch/handover 路由已经统一经过 transport/application/adapter 依赖方向，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、service 单测、API typecheck、完整治理、47 CAS/checksum、线上允许/拒绝/参数/缺失资源探针、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产执行报关成功或交接打印成功；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-6730149631d190da8b9651de`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase19` 建立 phase20，把出库确认及批量/唛头动态权限检查迁入 dispatch application service，保持状态流转、费用与审计不变。
