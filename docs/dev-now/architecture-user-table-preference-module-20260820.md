# 架构控制面快速落地（二）

- 状态：`in_progress`
- 会话标题：`Sunny｜架构控制面快速落地｜02`
- 续接自：`docs/archive/dev-now/2026-08/architecture-reset-control-plane-20260820.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续下一阶段）`
- 会话 slug：`architecture-user-table-preference-module-20260820`
- 分支：`codex/architecture-user-table-preference-module-20260820`
- worktree：`/Users/j1ng/Tools/sunny-architecture-shipment-overview-adapter-20260820`
- 认领时间：`2026-08-20 Asia/Shanghai`

## 用户目标与行为门禁

- 目标：继续快速落地收益最大的底层优化，缩小根 `AppModule` 装配面并阻止新的集中式装配债务。
- 硬门禁：业务流程、界面、字段、路由、请求/响应、权限、数据范围、状态、金额、审计和异常语义不得改变；无法证明等价时停止并请求用户确认。
- 固定样本：同一已登录用户对 `GET /api/user-table-preferences`、`PUT /api/user-table-preferences/:key`、`DELETE /api/user-table-preferences/:key` 的列表、保存、删除结果不变；用户 A 不能读写用户 B 的偏好；非法 key/value 的既有错误不变。

## 阶段重评

- 安全 / 数据正确性：230 个裸 `@Body()` 仍是债务，但批量接入运行时 schema 会改变非法输入响应，当前缺少逐接口行为基线，暂缓。
- 高频业务流 / 前端数据流：继续扩大 route-owned 数据所有权可能减少跨域刷新，但会触及缓存、新鲜度和页面回退语义，保护成本高于本轮代表切片，暂缓。
- 后端架构 / 改造效率：根 `AppModule` 仍直接装配大量 Controller/Provider；用户表格偏好已经具备独立 Controller、抽象 Service、Prisma/InMemory 实现和输入测试，迁入独立 Module 的价值明确、影响面最小。

结论：`转向`根模块瘦身，选择用户表格偏好作为代表切片；不在本轮强行拆 ShipmentOverview 巨型 Repository facade。

## GitHub 借鉴边界

- 参考 [Vendure 官方插件模块文档](https://github.com/vendurehq/vendure/blob/master/docs/docs/guides/developer-guide/plugins/index.mdx)：用 Nest Module 的 `imports/providers/controllers/exports` 封装单一能力，根模块只导入能力模块。
- Sunny 只采用模块封装和显式导出原则；不采用 Vendure 插件系统、GraphQL、电商模型或跨模块业务规则。

## 允许修改

- `apps/api/src/modules/user-table-preference.module.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/user-table-preference.input.test.ts`
- `scripts/check-architecture-governance.mjs`
- `config/architecture/governance-baseline.json`
- `config/architecture/module-boundaries.json`
- 本状态文件

## 验收

- 用户表格偏好 Controller/Service 不再由根 `AppModule` 直接装配，三条 URL、HTTP 方法与鉴权元数据保持不变。
- Prisma/InMemory 选择逻辑保持不变；用户隔离、列表、保存、删除和非法输入测试通过。
- 架构门禁阻止根 `AppModule` 直接 Controller 数、巨型 Repository 绑定数和行数重新增长；不得整体抬高既有债务阈值。
- API typecheck、架构/治理检查、`git diff --check` 通过；无 schema/migration、UI、生产数据和业务规则变更。

## 交接

- 阻塞：无
- 发布状态：`未发布`
- 本地完成：新增 `UserTablePreferenceModule`，根 `AppModule` 从 41 个直接 Controller / 67 个直接 Provider / 418 行降至 40 / 66 / 414；原 Prisma/InMemory 选择逻辑原样迁移。
- 行为证据：用户偏好固定样本 9/9 通过，覆盖 key/value 既有错误、保存、列表、删除和 A/B 用户隔离；API typecheck 通过。
- 安全证据：448 路由契约保持不变；架构门禁与 17 类失败自测、完整 governance、context check、`git diff --check` 通过。
- 准确下一步：提交并通过 GitHub CI 后，进入干净发布协调 worktree，按 API-only 范围精确发布 47 并验证健康、未登录 401、镜像/源码指纹、日志、发布锁与 recovery 状态。
