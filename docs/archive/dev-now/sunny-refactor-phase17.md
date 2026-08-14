# Sunny 深度重构第十七阶段：仓库包裹生命周期边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜17`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase16.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase17`
- 分支：`codex/sunny-refactor-phase17`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase17`
- 认领时间：`2026-08-12 02:08 Asia/Shanghai`

## 输入摘要

- 目标：把仓库包裹创建、手工收货、同箱规补录、拆票、修改、备注和异常七条路由迁出巨型 `DataController`。
- 固定样本：管理员创建一票原始过机包裹，补录同箱规包裹，依次修改、备注、异常、拆票，再执行多箱规手工收货，并核对七类审计。
- 不做：不修改路由、HTTP 方法、权限、请求/响应、状态码、客户范围、包裹状态、Prisma/InMemory Repository、事务、审计或各适配器既有幂等行为；机器 Excel 导入继续留在原 Controller。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse-package-lifecycle.e2e.test.ts`
- `apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.controller.ts`
- `apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.repository.ts`
- `apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.service.ts`
- `apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase17.md`

## 结果

- 新增 `WarehousePackageLifecycleController/Service/Repository` port，七条包裹生命周期路由由独立边界承接；两套旧 Repository 继续作为适配器。
- 创建和手工收货仍先执行既有客户范围检查，再进入 Repository；补录、拆票、修改、备注、异常保持原参数与异常透传。
- 原 Prisma/InMemory 文件零修改；生产适配器的 `requestId` 幂等与 InMemory 重复补录 400 的既有差异均保持。
- `DataController` 减少 7 条路由和 48 行；治理预算从 247/2,836 收紧为 240/2,788，系统总路由仍为 432。
- 代码提交 `d76daa7` 已推送 `origin/codex/sunny-refactor-phase17`。

## 验证

- 生命周期 E2E 在迁移前 2/2、迁移后 2/2，固定七条路由 401/403、创建、补录、修改、备注、异常、拆票、手工收货和七类审计。
- service 单测 3/3，固定七个方法的参数/结果透传、两条客户检查的调用顺序与失败短路、Repository 异常不翻译。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-e9e2c208ddd61523faedc7e6`。
- 五份运行源码 checksum 与候选一致；线上七路由未登录均 401，缺少仓库权限的生产财务角色 403，管理员空创建/手工收货 400，五条不存在包裹路径均 404；公网 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：同箱规补录当前生产 Prisma 适配器支持 `requestId` 幂等，而 InMemory 重复请求返回 400；这是预存差异，本阶段只冻结并记录，没有擅自统一。为避免污染生产仓库数据，线上未执行成功写入样本。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：七条包裹生命周期路由已由独立边界承接，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、service 调用顺序/异常单测、API typecheck、完整治理、47 CAS/checksum、线上允许前置拒绝/权限拒绝、容器和日志均通过。
- 未验证项：未在生产执行包裹创建、补录、拆票、修改、备注、异常或手工收货成功写入；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-e9e2c208ddd61523faedc7e6`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase17` 建立 phase18，优先冻结并拆分仓库机器 Excel 导入的预览/提交调用边界；若 characterization 发现文件解析与写入耦合过强，则改拆仓库交接路由，不在结构切片中重写导入语义。
