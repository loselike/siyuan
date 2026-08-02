# 阶段 0：当前模块与候选目标地图

## 1. 使用规则

本地图同时记录“当前物理结构”和“候选业务边界”。候选边界不是已确认架构决策，不授权移动数据库模型、修改 API、调整权限或改变状态流转。

领域语言以 `CONTEXT-MAP.md` 为准。当前已有 Warehouse、Finance、Master Data、Company Channel、Notifications 五个正式 context；其他候选 context 要在后续逐项确认后才能补进正式领域地图。

## 2. 当前物理结构

```text
apps/api/src/modules
├── app.module.ts
├── auth.controller.ts
├── ai.controller.ts / ai.service.ts
├── data.controller.ts                 # 292 routes
├── prisma.repository.ts               # 24,544 lines
├── in-memory.repository.ts            # 17,568 lines
├── rbac* / audit* / lineage*
├── finance/
│   ├── catalog/
│   ├── payer-bank/
│   └── receivable/
└── notifications/

apps/web/src
├── App.tsx                             # global orchestration
├── apiClient.ts                       # 332 methods
├── styles.css
└── modules/
    ├── appShell / auth
    ├── operations / orders / routing
    ├── warehouse / customerService / tracking
    ├── pricing / finance / masterData / settings
    ├── notifications / customer / reports / problemTickets
    └── shared / testSupport

packages/shared/src
├── index.ts                           # 5,622-line root barrel
├── pricing-rule-engine.ts
└── misc-fee-workflow.ts
```

## 3. 候选领域目录

| 候选领域 | 当前前端入口 | 当前 API/服务入口 | 候选数据所有权 | 状态 |
| --- | --- | --- | --- | --- |
| Application Shell | `App.tsx`, `modules/appShell`, `auth` | `main.ts`, `configure-app.ts`, `app.module.ts` | 无业务表 | 技术边界，已证实 |
| Identity & Access | Login、Settings 用户/角色 | `auth.controller`, `rbac*`, system routes | User、Role、Permission、Department、LoginLog | 候选；需安全专项确认 |
| Master Data | `masterData` | DataController master-data、finance catalog/payer-bank | Customer、Agent、Carrier、Channel、Site 等 | Master Data context 已存在，内部子域待确认 |
| Shipment / Orders | `orders`, `operations`，部分 App | DataController shipment/order/review routes | Shipment、ShipmentEvent、ShipmentLabel、ShipmentPackage | 候选；Shipment 是跨域关系热点 |
| Market / Routing | `routing`、Operations line pool | shipment route/reroute/pending-routing routes | 当前主要写 Shipment 路由字段 | 候选；是否独立拥有数据未确认 |
| Warehouse | `warehouse` | warehouse、Mojia、handover、tally routes | WarehousePackage、Rent、Consolidation、Tally | Warehouse context 已存在 |
| Customer Service | `customerService`, `problemTickets` | data-confirm、transfer、problem routes | ProblemTicket、CommonTag、ProblemReply；部分 Shipment 状态 | 候选；与 Shipment 状态边界待确认 |
| Tracking | `tracking` | tracking events、carrier tasks | CarrierTask、TrackingEvent | 候选 |
| Pricing | `pricing` | pricing/legacy/markup/import routes | PriceBook、PricingRule、LegacyPricing、SouthAfrica、Dubai 等 | 候选；Excel/import 属 infrastructure |
| Finance | `finance` | finance controllers + DataController finance routes | Receivable、Payable、Payment、Voucher、WaterReceipt、Ledger 等 | Finance context 已存在；高风险 |
| Notifications | `notifications` | notification controllers/service | Announcement、Notification、Delivery、Processing 等 | Notifications context 已存在 |
| Audit & Lineage | Settings 日志、ErrorBoundary | audit interceptor、lineage watcher/catalog | AuditLog、ImportJob、ExportJob | 候选 platform boundary |
| External Integrations | Pricing upload、Mojia、AI | uploads、Mojia route、AI service | 文件元数据/外部响应；当前归属分散 | 候选 infrastructure boundary |

## 4. 当前依赖关系

### 4.1 后端主要方向

```text
AppModule
  ├─ DataController ───────────────→ PrismaRepository ─→ PrismaService
  ├─ FinanceCatalogController ─────→ Service → Repository port → adapters
  ├─ PayerBankAccountController ───→ Service → Repository port → adapters
  ├─ FinanceReceivableController ──→ Service → PrismaRepository/Prisma
  └─ Notification Controllers ─────→ NotificationService → PrismaService

PrismaRepository/InMemoryRepository
  ├─ shared DTO/domain rules
  ├─ RBAC/data-scope helpers
  ├─ audit + lineage
  └─ many Prisma models/business contexts
```

当前没有自动化规则阻止 Controller 直接依赖 Prisma/总 Repository，也没有规则限制业务模块引用其他业务模块内部文件。

### 4.2 前端主要方向

```text
App.tsx
  ├─ apiClient
  ├─ appShell
  ├─ all feature pages
  └─ cross-feature state/callbacks/modals

feature pages
  ├─ apiClient types or instance
  ├─ @siyuan/shared
  ├─ modules/shared UI/helpers
  └─ selected direct imports from other features
```

已证实的跨 feature 边包括：

| From | To | 当前用途 | 证据 |
| --- | --- | --- | --- |
| Pricing / Routing | Finance entry | 国家/地区选项 | `PricingPage.tsx:9`, `RoutingPage.tsx:28` |
| Master Data | Finance | 财务资料页与 hook | `MasterDataPage.tsx:7-8` |
| Orders | Routing | 排货表单类型 | `OrdersPage.tsx:39` |
| Operations | Customer Service | 问题件创建弹窗 | `OperationsPage.tsx:11` |
| Finance Entry | Warehouse | 理货历史和包裹状态 | `FinanceEntryPage.tsx:24-26` |
| AppShell | Orders | 生命周期配置 | `appShell/config.tsx:13` |
| Customer Portal | Notifications | 通知中心 | `CustomerPortal.tsx:17` |

后续治理需要区分：合理组合、错误归属、应上移到共享契约、应由 App 层组合。不能直接全部禁止。

## 5. 候选目标依赖方向

若后续确认继续采用模块化单体，推荐的目标约束为：

```text
Web: shared/platform → feature → app composition

API: domain ← application ← presentation
                  ↑
             infrastructure

跨领域：
  public contract / application port / committed domain event
  禁止深层相对路径访问其他领域内部实现
```

目标不要求每个简单 CRUD 都具备四层。最低标准是：

- Controller 只处理协议、权限元数据和输入输出映射。
- Application Service 拥有用例编排和事务边界。
- Domain 只在存在真实状态、不变量或计算规则时建立。
- Repository port 按领域而不是按数据库建立。
- Prisma、文件、外部 API、队列属于 infrastructure adapter。
- AppModule/App.tsx 只负责组合，不保存各领域的全部业务状态。

## 6. 候选代码布局

```text
apps/api/src/
├── app/
├── platform/
│   ├── auth/
│   ├── config/
│   ├── audit/
│   ├── observability/
│   └── files/
└── modules/
    └── <context>/
        ├── <context>.module.ts
        ├── presentation/
        ├── application/
        ├── domain/             # 仅复杂领域需要
        └── infrastructure/

apps/web/src/
├── app/
├── platform/
├── shared/
└── features/
    └── <context>/
        ├── api/
        ├── model/
        ├── components/
        └── pages/

packages/shared/                # 第一阶段保留 package 名
└── src/<context>/              # 先做 subpath exports，不先拆包
```

这是迁移方向草案，不是要求一次重排现有目录。

## 7. 数据所有权原则草案

- 一个 Prisma model 只能有一个主要领域 owner。
- 其他领域通过 owner 的 application API/port 修改，不直接复制写规则。
- 数据库 relation 可以跨领域存在；跨域关系不等于共享写权限。
- Shipment 相关状态必须区分“Shipment owner”与 Finance/Warehouse/Customer Service 对局部事实的所有权。
- Audit/Notifications 读取提交后的事实，不反向拥有源业务状态。
- Shared contracts 表达跨边界数据，不拥有业务流程。

逐模型候选归属见 [`baseline/prisma-model-catalog.md`](./baseline/prisma-model-catalog.md)。其中所有“候选领域”均待确认。

## 8. 首个迁移切片候选

阶段 0 不最终选择切片。当前候选：

1. **问题件与常用标签**：旧式链路完整、已有权限/审计/Prisma/InMemory/前端入口，财务风险较低；但 `ProblemTicketsPage` 仍是低频展示页，真实操作更多位于 Customer Service/Operations，范围需先收紧。
2. **Finance Catalog**：分层已存在，适合先提炼模板；但作为迁移样本过于简单，不能证明旧总 Repository 可安全拆分。
3. **Notifications**：边界清楚、测试较完整；异步投递复杂度高，不适合作为普通业务模块默认模板。

推荐在阶段 1 先用 Finance Catalog 提炼技术模板，再以问题件做第一个旧链路迁移；实施前仍需用户确认模块化单体目标和问题件业务边界。
