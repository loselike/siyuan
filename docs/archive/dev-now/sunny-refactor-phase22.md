# Sunny 深度重构第二十二阶段：运单业务发票文件生命周期边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜22`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase21.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase22`
- 分支：`codex/sunny-refactor-phase22`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase22`
- 认领时间：`2026-08-12 04:06 Asia/Shanghai`

## 输入摘要

- 目标：把运单业务发票上传、代理发票模板下载和业务发票下载迁出综合 `DataController`，形成独立 transport/application/port/file-storage 边界。
- 固定样本：管理员为已排货运单下载指定代理发票模板，上传真实 XLSX 业务发票并下载相同字节，核对响应头和三类审计；同时固定未登录、越权、缺文件、非法文件和非法模板序号拒绝。
- 不做：不修改路由、HTTP 方法、权限码、客户拒绝、模板选择、状态前置、文件校验、目录、命名、URL、响应头、Repository 持久化和审计；线上不上传或下载真实生产发票。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/shipment-business-invoice-lifecycle.e2e.test.ts`
- `apps/api/src/modules/shipment/invoice/shipment-business-invoice.controller.ts`
- `apps/api/src/modules/shipment/invoice/shipment-business-invoice-file.storage.ts`
- `apps/api/src/modules/shipment/invoice/shipment-business-invoice-file.storage.test.ts`
- `apps/api/src/modules/shipment/invoice/shipment-business-invoice.repository.ts`
- `apps/api/src/modules/shipment/invoice/shipment-business-invoice.service.ts`
- `apps/api/src/modules/shipment/invoice/shipment-business-invoice.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase22.md`

## 结果

- 三条业务发票路由迁入 `ShipmentBusinessInvoiceController`，客户防御、模板编号解析和 Repository 调用迁入 application service，并通过窄 port 注入现有适配器。
- XLS/XLSX 扩展名、MIME、内容签名、20MB 限制、目录、日期加 UUID 命名、URL 和原始文件元数据迁入独立文件存储。
- 原 Prisma/InMemory 文件零修改；运单可见范围、代理模板选择、已排货状态前置、业务发票字段、响应头和三类审计保持。
- `DataController` 减少 3 条路由和 71 行；治理预算从 233/2,668 收紧为 230/2,598，系统总路由仍为 432。
- 代码提交 `2ade174` 已推送 `origin/codex/sunny-refactor-phase22`。

## 验证

- 业务发票 E2E 在迁移前 1/1、迁移后 1/1，固定指定模板下载、真实 XLSX 上传与同字节下载、响应头、三类审计、401/403、缺文件、非法文件和非法模板序号。
- service 单测 4/4、文件存储单测 2/2；API typecheck、`git diff --check`、432 路由契约和完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-5f3689771c14d35b5ac79bcc`。
- 六份运行源码 checksum 与候选一致；release state API 镜像与运行容器一致；线上三路由未登录均 401、真实无发票权限角色均 403、管理员缺文件/非法扩展/伪 XLSX/非法模板序号均 400、缺失运单下载均 404，业务发票文件数未变化；公网 health 200、API 实际错误日志 0、四容器正常、锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产当前没有可用 `CUSTOMER` 账号，因此客户专属防御文案只由 service 单测固定；线上未执行真实成功模板下载、发票上传和下载，避免读取或污染生产文件与运单。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：发票 transport/application/file-storage/adapter 依赖方向已形成，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、service 与 Excel 签名单测、API typecheck、完整治理、47 CAS/checksum、线上 401/403/400/404 无业务写探针、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产执行客户专属防御和成功发票文件路径；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-5f3689771c14d35b5ac79bcc`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase22` 建立 phase23，把承运商任务执行与重试两条命令路由迁入独立 tracking task Controller/Service/port，保持任务状态、失败重试、轨迹、审计和 lineage 不变。
