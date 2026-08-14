# Sunny 深度重构第十八阶段：仓库机器 Excel 导入边界独立

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜18`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase17.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase18`
- 分支：`codex/sunny-refactor-phase18`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase18`
- 认领时间：`2026-08-12 02:19 Asia/Shanghai`

## 输入摘要

- 目标：把机器过机 Excel 的 multipart 接入、文件校验、解析、预览和提交调用边界迁出巨型 `DataController`。
- 固定样本：管理员上传一行有效 XLSX，先预览、再提交、再重复提交，并核对包裹和机器导入审计；同时固定未登录、越权、缺文件和错误扩展名拒绝。
- 不做：不修改路由、HTTP 方法、权限、20MB 上限、请求/响应、状态码、Excel 解析规则、文件哈希、重复检测、Prisma/InMemory Repository、事务、包裹或审计；线上只执行预览，不提交真实仓库数据。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse-machine-import.e2e.test.ts`
- `apps/api/src/modules/warehouse/package/warehouse-machine-import.controller.ts`
- `apps/api/src/modules/warehouse/package/warehouse-machine-import.repository.ts`
- `apps/api/src/modules/warehouse/package/warehouse-machine-import.service.ts`
- `apps/api/src/modules/warehouse/package/warehouse-machine-import.service.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase18.md`

## 结果

- 新增 `WarehouseMachineImportController/Service/Repository` port，机器导入路由由独立边界承接；两套旧 Repository 继续作为适配器。
- 完整迁移 20MB multipart、文件名编码清洗、`.xls/.xlsx`、三种 MIME（含 `application/octet-stream`）、文件内容签名、解析、大小写不敏感 commit 与 SHA-256 文件哈希。
- 原 Prisma/InMemory 文件零修改；权限/屏蔽、系统重复、批次重复、PostgreSQL advisory lock、事务、包裹创建和审计实现均保持。
- `DataController` 减少 1 条路由和 21 行；治理预算从 240/2,788 收紧为 239/2,767，系统总路由仍为 432。
- 代码提交 `1bb8d43` 已推送 `origin/codex/sunny-refactor-phase18`。

## 验证

- 机器导入 E2E 在迁移前 2/2、迁移后 2/2，固定 401/403、缺失/非法文件 400、有效预览、提交、重复批次、包裹持久化和审计。
- service 单测 5/5，固定预览参数/结果、大小写不敏感提交、精确 SHA-256、`application/octet-stream` 兼容、文件拒绝顺序和 Repository 异常不翻译。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt 与 Mojia 安全契约 3/3）通过。
- 47 API production build、重启成功；发布 `whitelist-06a15854f09caf852dc2f045`。
- 五份运行源码 checksum 与候选一致；release state 的 API 镜像与运行容器一致；线上未登录 401、财务角色 403、缺失/非法文件 400、管理员有效 XLSX 预览 201 且 `committed=false/importedRows=0`；公网/容器 health 200、API 实际错误日志 0、四容器正常。
- 发布完成后本地 SSH 未收到结束信号；在源码、state、镜像、health、容器、日志和契约均核对通过后，按 fail-closed 流程生成并以 marker checksum 显式清除 recovery，最终锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：未在生产提交真实机器 Excel，避免污染仓库包裹和审计；生产成功提交由未改 Repository、本地完整提交/重复批次 E2E 和线上有效预览共同保护。发布 SSH 结束卡住若再次出现，应另开发布工具任务修复超时。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：机器导入的 transport/application/adapter 依赖方向已建立，`DataController` 路由数和行数实际下降。
- 安全证据：迁移前后 E2E 等价、service 文件/哈希/异常单测、API typecheck、完整治理、47 CAS/checksum、线上权限/文件/预览、镜像、容器、日志、锁和 recovery 均通过。
- 未验证项：未在生产执行 commit=true；未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-06a15854f09caf852dc2f045`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase18` 建立 phase19，把仓库交接打印和预览两条路由迁入独立 Controller/Service/port，继续保持运单状态、权限、版本号、打印时间和审计不变。
