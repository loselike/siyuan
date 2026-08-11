# Sunny 深度重构第二十一阶段：运单面单生命周期边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜21`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase20.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase21`
- 分支：`codex/sunny-refactor-phase21`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase21`
- 认领时间：`2026-08-12 03:50 Asia/Shanghai`

## 输入摘要

- 目标：把运单面单列表、生成、上传、下载和作废迁出综合 `DataController`，形成独立 transport/application/port/file-storage 边界。
- 固定样本：仓库人员生成并复用有效面单、查看列表、作废并重新生成；完成交接与出库后，上传真实 PNG 并下载原始字节，同时固定未登录、越权、非法文件和错误状态拒绝。
- 不做：不修改路由、HTTP 方法、请求/响应、权限码、错误文案、生成/复用规则、状态机、转单号、文件 URL、审计或两套 Repository；线上不创建、作废或上传真实生产面单。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/shipment-label-lifecycle.e2e.test.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-fulfillment-query.controller.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-label-file.storage.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-label-file.storage.test.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-label-lifecycle.controller.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-label-lifecycle.repository.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-label-lifecycle.service.ts`
- `apps/api/src/modules/shipment/fulfillment/shipment-label-lifecycle.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase21.md`

## 结果

- 五条面单路由迁入 `ShipmentLabelLifecycleController`；客户拒绝和五种细粒度权限迁入 application service，Repository 与授权通过窄 port 注入。
- 上传文件的 MIME、扩展名、内容签名、10MB 限制、目录、文件命名、URL 和下载响应头迁入独立存储，旧兼容 Controller 保留为 re-export。
- 原 Prisma/InMemory 文件零修改；面单生成、有效面单复用、作废、状态前置、转单号、审计和字段返回均保持。
- `DataController` 减少 4 条路由和 78 行；治理预算从 237/2,746 收紧为 233/2,668，系统总路由仍为 432。
- 代码提交 `0b4d5e1` 已推送 `origin/codex/sunny-refactor-phase21`。

## 验证

- 面单 E2E 在迁移前 1/1、迁移后 1/1，固定生成/复用/列表/作废/重新生成、交接/出库、真实 PNG 上传下载、状态拒绝和审计副作用。
- service 单测 8/8、文件存储单测 2/2；API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-6b366bf24b30b19afb54d457`。
- 七份运行源码 checksum 与候选一致；release state API 镜像与运行容器一致；线上五路由未登录均 401、真实无面单权限角色均 403、管理员缺文件/非法 MIME/伪 PDF 均 400、缺失运单四路径均 404，未写生产运单或面单；公网 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产当前没有可用 `CUSTOMER` 账号，因此客户专属拒绝文案只由本地 E2E/service 固定；线上未执行真实成功面单生成、作废、上传和下载，避免污染生产文件与业务数据。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：面单 transport/application/authorization/file-storage/adapter 依赖方向已形成，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、service 与文件签名单测、API typecheck、完整治理、47 CAS/checksum、线上 401/403/400/404 无业务写探针、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产执行客户专属拒绝和成功面单写路径；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-6b366bf24b30b19afb54d457`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase21` 建立 phase22，把运单业务发票模板下载、发票上传和发票下载迁入独立 invoice file lifecycle Controller/Service/port，保持文件安全、权限、URL、状态和审计不变。
