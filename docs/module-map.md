# Sunny 前端模块地图

这个文档用于降低后续开发定位成本。改某个一级菜单时，优先读取对应模块目录、测试文件和少量共享工具，不再默认通读 `apps/web/src/App.tsx`。

## 当前边界

| 一级菜单 | 前端模块目录 | 当前测试命令 | 主要数据/API | 后端/共享入口 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 运营工作台 | `apps/web/src/modules/operations` | `npm run test:web:workspace` | `shipments`、状态池、运单详情 | `packages/shared` shipment 类型 | `OperationsPage.tsx` 已承接运营工作台 UI；测试沿用既有 workspace 覆盖。 |
| 客户门户 | `apps/web/src/modules/customer` | `npm run test:web:finance` / `npm run test:web:workspace` | 客户运单、费用明细、对账单、账户余额、问题件 | API shipments/finance/problem routes | `CustomerPortal.tsx` 已承接客户端页面和预报入口；App 只在客户角色分支组装数据与回调。 |
| 仓库管理 | `apps/web/src/modules/warehouse` | `npm run test:web:warehouse` | 仓库包裹、理货、面单队列 | API warehouse routes、shared warehouse 类型 | `WarehousePage.tsx` 已承接页面；`utils.ts` 已承接包裹计算、扫描解析、标签号和条码等纯函数。 |
| 我的订单 | `apps/web/src/modules/orders` | `npm run test:web:orders` | 运单录入、审核、收款、日志 | API shipments routes | 页面 UI、创建订单弹窗、订单列表、订单内弹窗已迁出；父级仍保留创建、审核、收款和日志回调。 |
| 渠道排货 | `apps/web/src/modules/routing` | `npm run test:web:routing` | 待排货订单、代理/渠道分配 | API shipments/routing routes | 页面 UI、排货动作列、分配渠道弹窗已迁出；父级仍保留状态和 API 回调。 |
| 轨迹监控 | `apps/web/src/modules/tracking` | `npm run test:web:tracking` | 轨迹任务、批量轨迹导入 | shared tracking helpers | `TrackingPage.tsx` 已承接承运商任务和最新轨迹 UI；`bulkImport.ts` 已承接批量轨迹 Excel 解析，弹窗状态仍为 App 全局弹窗。 |
| 问题件中心 | `apps/web/src/modules/problemTickets` | `npm run test:web:problemTickets` | 问题件列表和处理 | API problem routes | `ProblemTicketsPage.tsx` 已承接低频模块展示页。 |
| 报价查价 | `apps/web/src/modules/pricing` | `npm run test:web:pricing` | 查价、价格表、加价规则、Excel 价格表解析 | API pricing routes、shared pricing 类型 | `PricingPage.tsx` 已承接页面；`excel.ts` 已承接价格表解析、导入样例和计费重计算。 |
| 财务结算 | `apps/web/src/modules/finance` | `npm run test:web:finance` | 录单、应收/业务成本/应付审核、财务资料库 | API finance routes、`modules/finance/catalog.ts` | 第一优先级迁出。 |
| 统计报表 | `apps/web/src/modules/reports` | `npm run test:web:reports` | 统计报表数据 | 待梳理 | `ReportsPage.tsx` 已承接低频模块展示页。 |
| 基础资料 | `apps/web/src/modules/masterData` | `npm run test:web:settings` | 客户、代理资料 | API master-data routes | `MasterDataPage.tsx` 已承接客户/代理资料 UI、筛选、列表设置、创建/编辑/停用弹窗和提交逻辑。 |
| 系统设置 | `apps/web/src/modules/settings` | `npm run test:web:settings` | 员工、角色权限、审计日志 | API auth/settings/audit routes | `SettingsPage.tsx` 已承接员工账号、角色权限、客户端角色、安全区、AI 安全和审计日志 UI。 |
| 共享工具 | `apps/web/src/modules/shared` | `npm run test:web` / 跟随调用模块测试 | 格式化、状态标签、notice、筛选区、表格分页、指标卡 | 无 API | `format.ts`、`ui.tsx`、`ModuleSubWorkspace.tsx` 已承接通用展示和基础设施，新工具优先放这里。 |
| 应用壳层 | `apps/web/src/modules/appShell`、`apps/web/src/modules/auth` | `npm run test:web:workspace` / `npm run test:web:settings` | 顶层菜单、模块配置、登录页、履约动作工具 | API auth/session | `config.tsx`、`utils.ts`、`LoginPage.tsx` 已承接壳层配置和登录 UI；App 保留 session、全局数据、跨模块弹窗和页面组装。 |

## 拆分规则

- 每次只迁移一个小单元，不和新业务需求混做。
- 先迁纯函数和数据转换，再迁页面组件。
- 迁移时保持接口、状态、权限和业务流程不变。
- 对应模块有测试时，只跑模块测试；跨模块或共享工具变更再跑 Web build/typecheck。
- `App.tsx` 最终只保留 session、全局数据加载、一级菜单切换和模块组装。
