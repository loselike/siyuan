# 阶段 0：Sunny 现状架构报告

## 1. 结论范围

本报告回答“当前代码如何组织、主要调用链在哪里、哪些边界已经存在、哪些治理风险有直接证据”。它不判断线上 47 的实际发布状态，不对财务金额、权限正确性或历史 migration 作业务结论。

当前技术栈可以继续承载模块化治理。已证实的主要问题不是框架能力不足，而是多数核心业务仍集中在少数全局文件中，导致修改影响面、AI 定位成本和双实现一致性成本持续增大。

## 2. 仓库与构建结构

- 根 `package.json` 使用 npm workspaces，范围为 `apps/*` 和 `packages/*`。
- 运行应用为 `apps/api`（NestJS 11 + Prisma 6）与 `apps/web`（React 19 + Vite 6 + AntD 5）。
- 公共包只有 `packages/shared`，其单一根导出同时承载前后端 DTO、权限与菜单类型、业务状态、财务/仓库/定价规则。
- 根构建顺序固定为 Shared → API → Web；类型检查同样先构建 Shared。
- 根目录已提供 safe test runner，但同时仍暴露裸 workspace test 脚本。
- 未在当前工作树发现 `.github` workflow 文件；是否存在仓库外 CI 未验证。

机器扫描详见 [`baseline/metrics.md`](./baseline/metrics.md)。当前快照：

| 范围 | 生产文件 | 生产行数 | 测试/测试工具文件 | 测试/测试工具行数 |
| --- | ---: | ---: | ---: | ---: |
| API | 46 | 56,323 | 43 | 24,097 |
| Web | 85 | 64,176 | 58 | 21,118 |
| Shared | 3 | 5,835 | 5 | 1,101 |

统计包含 `.ts`、`.tsx`、`.css`，行数包含空行和注释；它是规模信号，不是代码质量评分。

## 3. API 当前架构

### 3.1 模块装配

`AppModule` 在一个根模块中直接注册 9 个 Controller class、Repository/Service provider、全局 `RbacGuard` 与 `AuditInterceptor`（`apps/api/src/modules/app.module.ts:60-90`）。

已经形成独立 Controller → Service → Repository 的模块包括：

- `finance/catalog`
- `finance/payer-bank`
- `finance/receivable`
- `notifications`

其余多数接口仍由 `DataController` 直接调用总 `PrismaRepository`。

### 3.2 路由与鉴权元数据

AST 扫描得到 357 个 API 路由：

| 鉴权元数据 | 路由数 | 含义 |
| --- | ---: | --- |
| `RequirePermission` | 322 | 声明权限键，由全局 Guard 校验。 |
| `RequireAuth` | 31 | 只声明登录身份；业务方法可能继续做数据范围或权限判断。 |
| 无上述元数据 | 4 | 验证码、登录、health、Mojia 设备接口。 |

无元数据的 4 个路由为：

- `GET /auth/captcha`
- `POST /auth/login`
- `GET /health`
- `POST /integrations/mojia/measurements`

前三个从用途上属于预认证/公开探针候选；Mojia 路由在方法内部调用设备 token 校验（`apps/api/src/modules/data.controller.ts:404`）。这些事实不构成“安全”或“存在漏洞”的结论。

`RbacGuard` 在 Controller/handler 都没有 `RequireAuth` 或 `RequirePermission` 元数据时直接返回 `true`（`apps/api/src/modules/rbac.guard.ts:24-31`）。阶段 1 应先增加路由元数据契约测试，再决定是否改为默认拒绝；不能直接全局切换行为。

完整矩阵见 [`baseline/api-route-permission-matrix.md`](./baseline/api-route-permission-matrix.md)。

### 3.3 Controller 集中度

| Controller | 路由数 | 文件 |
| --- | ---: | --- |
| `DataController` | 292 | `apps/api/src/modules/data.controller.ts` |
| `FinanceReceivableController` | 32 | `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts` |
| `NotificationController` | 10 | `apps/api/src/modules/notifications/notification.controller.ts` |
| `AuthController` | 7 | `apps/api/src/modules/auth.controller.ts` |
| 其余 5 个 Controller | 16 | finance catalog、payer bank、announcement、notification operations、AI |

`DataController` 共 3,008 行，导入大量共享 DTO，并覆盖 shipment、warehouse、tracking、problem ticket、master data、pricing、finance、system 与 upload/integration 路由。集中度是已证实事实；拆分后的最终领域边界仍需确认。

### 3.4 Repository 与业务规则

- `PrismaRepository`：24,544 行，AST 扫描到 541 个类方法（包含私有辅助方法和生命周期方法）。
- `InMemoryRepository`：17,568 行，AST 扫描到 523 个类方法。
- `AppModule` 根据 `DATABASE_URL`/`USE_PRISMA_REPOSITORY` 在两种实现间切换（`apps/api/src/modules/app.module.ts:38-58`）。
- `PrismaRepository` 同时包含 Prisma 查询、事务、数据裁剪、状态判断、审计、缓存、定时器和 lineage 调用。
- 生产 API 源码中有 7 个文件直接使用 `PrismaService`、`this.prisma` 或 `$transaction`；11 个文件直接引用总 `PrismaRepository`。

两个实现有 462 个同名方法，另有 79 个仅 Prisma、61 个仅内存。双实现本身便于测试，但同名不代表语义一致，目前没有统一的总 Repository contract suite 证明二者等价。详细清单见 [`baseline/dependency-findings.md`](./baseline/dependency-findings.md)。

## 4. 三条代表性调用链

### 4.1 旧式集中链路：问题件列表

```text
App.tsx 全局加载
  → ApiClient.problemTickets
  → DataController.problemTickets
  → PrismaRepository.getProblemTickets
  → Prisma ProblemTicket/ProblemReply/Shipment/Customer
  → shared ProblemTicketSummary
  → App.tsx 分发给 ProblemTicketsPage/CustomerService 页面
```

证据：

- `apps/web/src/App.tsx:862`
- `apps/web/src/apiClient.ts:1085`
- `apps/api/src/modules/data.controller.ts:1197`
- `apps/api/src/modules/prisma.repository.ts:16374`
- `apps/api/prisma/schema.prisma:396`
- `packages/shared/src/index.ts:4656`

该链路跨越全局 App、全局 ApiClient、总 Controller、总 Repository 和共享桶。

### 4.2 已分层链路：财务资料目录

```text
Web finance/master-data feature
  → ApiClient finance catalog methods
  → FinanceCatalogController
  → FinanceCatalogService
  → FinanceCatalogRepository port
  → Prisma/InMemory adapter
  → FinanceCatalogItem
```

证据：

- `apps/api/src/modules/finance/catalog/finance-catalog.controller.ts:12`
- `apps/api/src/modules/finance/catalog/finance-catalog.service.ts:23`
- `apps/api/src/modules/finance/catalog/finance-catalog.repository.ts:21`
- `apps/api/prisma/schema.prisma:1232`
- `packages/shared/src/index.ts:2384`

此模块已经接近后续模块模板，但 Prisma adapter 仍有 `as any`，并在审计适配器中反向依赖总 `PrismaRepository`（`finance-catalog.repository.ts:139`），尚未完全隔离。

### 4.3 独立领域链路：站内通知

```text
NotificationCenter
  → ApiClient notifications methods
  → Notification/Announcement/Operations Controllers
  → NotificationService abstraction
  → PrismaNotificationService
  → notification/announcement/delivery/processing models
```

证据：

- `apps/web/src/modules/notifications/NotificationCenter.tsx:52`
- `apps/web/src/apiClient.ts:709`
- `apps/api/src/modules/notifications/notification.controller.ts:8`
- `apps/api/src/modules/notifications/notification.service.ts:77`
- `apps/api/prisma/schema.prisma:1449`

这是当前边界最清楚的模块之一，可用于参考 Nest module/service 组织、不能直接复制其异步复杂度到普通 CRUD。

## 5. Web 当前架构

### 5.1 应用壳层

`App.tsx` 共 3,694 行，在 `309-419` 行附近集中 session、路由、shipment、finance、warehouse、notifications、AI 与 modal 状态，并负责权限菜单、页面预加载、跨模块回调和数据分发。

已实现对 Customer Service、Finance、Warehouse 三个页面的动态 import；其他主要页面仍由 App 静态 import。是否需要进一步懒加载要以产物分析为依据，不是阶段 0 结论。

### 5.2 Feature 规模

| Feature | 文件数 | 行数 | 主要热点 |
| --- | ---: | ---: | --- |
| finance | 32 | 15,055 | `FinancePage.tsx`、entry/water receipt/audit 子页 |
| pricing | 9 | 9,725 | `PricingPage.tsx` 4,868 行 |
| warehouse | 14 | 7,699 | `WarehousePage.tsx` 4,824 行 |
| masterData | 4 | 3,984 | `MasterDataPage.tsx` 3,168 行 |
| settings | 4 | 3,781 | `SettingsPage.tsx` 2,402 行 |
| customerService | 10 | 3,548 | `CustomerServicePage.tsx` 2,474 行 |
| routing | 15 | 2,353 | `RoutingPage.tsx` 1,458 行 |
| orders | 2 | 1,316 | `OrdersPage.tsx` 1,157 行 |
| notifications | 4 | 1,205 | `NotificationCenter.tsx` 712 行 |

Feature 目录已经存在，但依赖并非完全按领域隔离。例如：

- Pricing 与 Routing 直接引用 Finance entry 的国家/地区选项。
- Master Data 直接引用 Finance Catalog 页面和 hook。
- Orders 直接引用 Routing 的表单类型。
- Operations 直接引用 Customer Service 的问题件创建弹窗。
- Finance Entry 直接引用 Warehouse 的理货历史组件。
- AppShell 直接引用 Orders 页面导出的生命周期配置。

这些依赖可能包含合理业务组合，也可能是错误归属；阶段 1 应先声明允许方向，再逐条分类，不能机械禁止全部跨 feature import。

登录、客户 Portal、10 个员工主菜单、15 个 `StaffMenuKey`、URL 归一关系、页面渲染入口和内建岗位可见性见 [`baseline/frontend-entry-catalog.md`](./baseline/frontend-entry-catalog.md)。菜单可见性只说明前端入口，不替代 API 权限和数据范围校验。

### 5.3 静态依赖图

生产 TypeScript/TSX 静态依赖图包含 130 个节点、436 条内部边，其中 75 条跨 workspace 指向 `@siyuan/shared`。本轮未发现强连通循环组；这只说明静态 import 图没有环，不覆盖 Nest 运行时注入、字符串路径、CSS 或外部服务依赖。

发现 4 个入度为 0 的孤儿候选：`warehouse-device-site.ts`、Web `data.ts`、`useFinanceColumnSettings.tsx`、`misc-fee-workflow.ts`。它们可能由测试、脚本或运行时机制使用，删除前必须逐项核验。另发现 API/Web notification types 两个文件内容完全相同，可作为共享契约去重候选。

### 5.4 ApiClient

`apps/web/src/apiClient.ts` 共 2,341 行：

- 332 个类方法。
- 321 个直接 `this.request` 调用。
- 文件开头约 269 行主要为 `@siyuan/shared` 类型导入。
- 上传/下载方法因使用 `fetch`/`FormData`，未全部被直接请求扫描计入。

完整目录见 [`baseline/web-api-client-catalog.md`](./baseline/web-api-client-catalog.md)。

## 6. Shared 契约与领域逻辑

`packages/shared/src/index.ts` 共 5,622 行；75 个生产文件直接从根 `@siyuan/shared` 导入。

该文件同时包含：

- 角色、菜单和权限相关类型。
- Shipment 与全生命周期 DTO。
- Finance、Warehouse、Pricing、Notifications API 请求/响应。
- 可在前后端共同运行的状态归类和计算函数。

这使共享类型复用非常直接，但也让任何根导出变化具有较大编译和认知影响面。阶段 0 只确认“单桶和高扇出”，尚未证明需要拆成多个 npm package；优先候选是保留一个 package、先增加领域 subpath exports。

## 7. 数据模型与跨域关系

Prisma schema 共 1,610 行、82 个 model、2 个 enum，migration 目录 114 个。完整模型及直接关系见 [`baseline/prisma-model-catalog.md`](./baseline/prisma-model-catalog.md)。

已证实的关系热点：

- `Shipment` 直接关联 Customer、Agent、Channel、仓库包裹/标签、轨迹、问题件、应收/应付/付款和水单匹配等多个领域模型。
- Finance 模型普遍通过 `shipmentId`、`customerId`、`agentId` 与订单及主数据连接。
- Notifications 通过 `userId`、业务目标 ID 或审计事件连接来源业务。

“关系多”不是缺陷。治理目标应是明确模型所有权和跨域写入入口，而不是为了减少关系数修改数据库结构。

## 8. 配置、上传与后台任务

生产源码共扫描到 33 次 `process.env` 使用，涉及：

- API 端口、数据库和 Repository 模式。
- JWT、验证码开关。
- 上传目录、标签目录。
- Mojia 设备 token。
- SiliconFlow API 配置。
- Lineage 数据库与启停开关。
- release ID、启动 seed 开关。

配置使用分散在启动文件、Controller、Service、Guard 与 watcher 中，未发现统一的运行时配置 schema。阶段 1 可先增加 fail-fast 配置读取层，不能在阶段 0 改变现有环境变量语义。

上传、Mojia 设备接入、lineage watcher 与业务路由目前部分共存于 `DataController`/总 Repository。它们应作为候选 infrastructure/platform 边界，但具体归属未确认。

## 9. 测试和质量门基线

本轮实际执行：

| 命令 | 结果 | 墙钟时间 | 证据范围 |
| --- | --- | ---: | --- |
| `npm run governance:check` | 通过 | 0.17s | 开发治理静态检查 |
| `npm run test:shared:safe -- --run` | 失败：57/59 通过 | 0.77s | Shared 全部 5 个测试文件 |
| `npm run test:api:safe -- --run src/modules/rbac.test.ts` | 通过：13/13 | 0.66s | RBAC 纯逻辑测试 |
| `npm run test:web:safe -- --run src/apiClient.test.ts src/modules/appShell` | 通过：15/15 | 1.89s | ApiClient 与 AppShell 定向测试 |
| `npm run typecheck` | 通过 | 4.65s | Shared/API/Web 类型检查 |
| `npm run lint` | 失败 | 3.38s | API 先失败，96 errors，未进入 Web |
| `npm run lint -w @siyuan/web` | 失败 | 2.45s | Web 270 errors |

Shared 两项失败为：

1. 邮编规则返回 `matchedLabel: "5-7"`，测试期望 `"5-7（邮编）"`。
2. `DATA_CONFIRM` 状态计数实际为 2，测试期望为 1。

本轮只记录，不修复。尚无连续 CI 历史，因此不能计算真实失败率或判定 flaky tests；单次通过/失败不得扩展为稳定性结论。

Lint 问题包含两类：缺少 Node/DOM globals 或 React Hooks 插件等配置问题，以及未使用代码、unreachable code 等源码问题。必须先分类，不能用一次全局 auto-fix 处理。

## 10. 可观测性

已发现：

- `/health` 返回服务与 release ID。
- Nest `Logger`、前端 ErrorBoundary 与 `/system/client-errors` 上报。
- 自定义 audit/lineage 事件目录和 watcher。
- Notifications 有处理状态、重试和 worker。

未在 package manifest 或生产源码中发现统一 OpenTelemetry/metrics SDK。日志是否已由容器平台集中采集未验证。

## 11. 已有优势

- 严格 TypeScript 和 monorepo 基础已经存在。
- 安全测试 runner、47 发布锁、白名单同步和发布后证据规则较完整。
- 102 个测试文件，另有 4 个被扫描器归为测试支持工具的源码文件，提供了较多历史行为样本。
- 已有 `CONTEXT-MAP.md`、领域 `CONTEXT.md` 和 ADR，不需要重新发明领域文档体系。
- Finance Catalog、Payer Bank、Receivable、Notifications 已开始形成领域模块。
- `ManagedTable` 等通用 UI 能力已集中，前端不是从零开始治理。

## 12. 阶段 0 未验证项

- 47 当前源码、容器、数据库 migration 与本地工作树是否一致。
- 所有 `RequireAuth` 路由内部是否都具备正确的对象归属和权限判断。
- 财务事务、金额、币种、匹配、反审和核销语义是否完整一致。
- Prisma 与 InMemory Repository 每个方法是否等价。
- 114 个 migration 的逐项安全性和所有权。
- 真实查询性能、慢 SQL、bundle 大小和线上错误率。
- 测试 flaky rate 与历史 CI 通过率。

这些项目必须在对应专项阶段取得新证据，不能从本报告推断。
