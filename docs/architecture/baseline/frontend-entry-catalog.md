# 前端主入口、路由别名与角色可见性基线

> 本表覆盖 `StaffMenuKey` 的 15 个键、10 个可见员工主菜单、登录/客户分支及 `App.tsx` 的页面渲染分支。页面内部的二级 `sectionKey` 由各 feature 自己维护，不在此冒充独立一级模块。

## 会话入口

| 条件 | 页面入口 | 证据 |
| --- | --- | --- |
| 无 session | `LoginPage` | `apps/web/src/App.tsx:2688` |
| `CUSTOMER` | `CustomerPortal` | `apps/web/src/App.tsx:2691` |
| 员工角色 | `App` shell + RBAC 可见菜单 | `apps/web/src/App.tsx:2721` |

## 可见员工主菜单

| Menu key | 菜单文案 | URL | 主渲染入口 | 证据 |
| --- | --- | --- | --- | --- |
| `workspace` | 运营工作台 | `/app/workspace` | `OperationsPage`（fallback branch） | `apps/web/src/modules/appShell/config.tsx:276`, `apps/web/src/App.tsx:3445` |
| `pricing` | 报价查价 | `/app/pricing` | `PricingPage` | `apps/web/src/modules/appShell/config.tsx:277`, `apps/web/src/App.tsx:3255` |
| `business` | 业务管理 | `/app/business` | `FinancePage(menuMode="business")`，内部组合 `OrdersPage` | `apps/web/src/modules/appShell/config.tsx:278`, `apps/web/src/App.tsx:3110` |
| `receive` | 仓库管理 | `/app/warehouse` | `WarehousePage` | `apps/web/src/modules/appShell/config.tsx:279`, `apps/web/src/App.tsx:3332` |
| `market` | 市场管理 | `/app/market` | `RoutingPage` | `apps/web/src/modules/appShell/config.tsx:280`, `apps/web/src/App.tsx:3391` |
| `customerService` | 客服管理 | `/app/customer-service` | `CustomerServicePage` | `apps/web/src/modules/appShell/config.tsx:281`, `apps/web/src/App.tsx:3357` |
| `logisticsTracking` | 物流轨迹管理 | `/app/tracking` | `TrackingPage` | `apps/web/src/modules/appShell/config.tsx:282`, `apps/web/src/App.tsx:3374` |
| `finance` | 财务管理 | `/app/finance` | `FinancePage(menuMode="finance")` | `apps/web/src/modules/appShell/config.tsx:283`, `apps/web/src/App.tsx:3268` |
| `master` | 基础资料库 | `/app/master` | `MasterDataPage` | `apps/web/src/modules/appShell/config.tsx:284`, `apps/web/src/App.tsx:3237` |
| `settings` | 系统管理 | `/app/settings` | `SettingsPage` | `apps/web/src/modules/appShell/config.tsx:285`, `apps/web/src/App.tsx:3224` |

## 内部或兼容 Menu key

这些键存在于共享契约，但不在当前 `menuItems` 中形成独立一级菜单。

| Menu key | 归一 URL | 当前渲染/用途 | 证据 |
| --- | --- | --- | --- |
| `orders` | `/app/business` | 与 `business` 共用 Finance/Orders 组合 | `apps/web/src/modules/appShell/config.tsx:304`, `apps/web/src/App.tsx:3110` |
| `routing` | `/app/market` | 与 `market` 共用 `RoutingPage` | `apps/web/src/modules/appShell/config.tsx:307`, `apps/web/src/App.tsx:3391` |
| `tracking` | `/app/tracking` | 与 `logisticsTracking` 共用 `TrackingPage` | `apps/web/src/modules/appShell/config.tsx:309`, `apps/web/src/App.tsx:3374` |
| `problems` | `/app/customer-service` | 独立条件分支 `ProblemTicketsPage`；URL parser 会归一到 `customerService` | `apps/web/src/modules/appShell/config.tsx:311`, `apps/web/src/App.tsx:3425` |
| `reports` | `/app/workspace` | 独立条件分支 `ReportsPage`；URL parser 会归一到 `workspace` | `apps/web/src/modules/appShell/config.tsx:314`, `apps/web/src/App.tsx:3433` |

## 内建岗位主菜单可见性

| 角色 | 可见主入口 |
| --- | --- |
| `ADMIN` | workspace、pricing、business、receive、market、customerService、logisticsTracking、finance、master、settings |
| `CUSTOMER_SERVICE` | workspace、business、customerService、logisticsTracking、pricing、master |
| `OPERATOR` | workspace、business、receive、market、logisticsTracking、pricing、master |
| `WAREHOUSE` | workspace、receive、logisticsTracking |
| `FINANCE` | workspace、pricing、finance、master |
| `CUSTOMER` | 无员工菜单，进入 `CustomerPortal` |

证据：`packages/shared/src/index.ts:20-47`。菜单可见性不是后端授权证据；完整 API 权限元数据仍以 [`api-route-permission-matrix.md`](./api-route-permission-matrix.md) 为准。

## 二级入口边界

- URL 由 `/app/<module>/<section?>` 解析；`sectionKey` 交给目标 feature 的 `resolveModuleInitialSection` 或页面内菜单解释（`apps/web/src/modules/appShell/config.tsx:346-369`）。
- `pricing`、`receive`、`finance` 存在显式历史 section alias（`apps/web/src/modules/appShell/config.tsx:327-331`）。
- 二级入口经权限裁剪后可能不可见，因此不能仅凭 section key 推断用户可访问。
