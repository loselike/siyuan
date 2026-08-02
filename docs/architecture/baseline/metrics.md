# 架构扫描机器基线

| 指标 | 数值 |
| --- | ---: |
| API 路由 | 357 |
| Prisma 模型 | 82 |
| Web ApiClient 方法 | 332 |
| Web ApiClient 直接请求表达式 | 321 |
| 生产源码 `as any` | 718 |
| 生产源码 `process.env` | 33 |
| 直接导入 `@siyuan/shared` 的生产文件 | 75 |
| TypeScript 内部依赖边 | 436 |
| TypeScript 强连通循环组 | 0 |
| TypeScript 孤儿候选 | 4 |
| 双 Repository 同名方法 | 462 |

## 源码规模

| 范围 | 生产文件 | 生产行数 | 测试/测试工具文件 | 测试/测试工具行数 |
| --- | ---: | ---: | ---: | ---: |
| `apps/api/src` | 46 | 56323 | 43 | 24097 |
| `apps/web/src` | 85 | 64176 | 58 | 21118 |
| `packages/shared/src` | 3 | 5835 | 5 | 1101 |

## 最大生产文件

| 文件 | 行数 |
| --- | ---: |
| `apps/api/src/modules/prisma.repository.ts` | 24544 |
| `apps/api/src/modules/in-memory.repository.ts` | 17568 |
| `apps/web/src/styles.css` | 13160 |
| `packages/shared/src/index.ts` | 5622 |
| `apps/web/src/modules/pricing/PricingPage.tsx` | 4868 |
| `apps/web/src/modules/warehouse/WarehousePage.tsx` | 4824 |
| `apps/web/src/App.tsx` | 3694 |
| `apps/api/src/modules/pricing-excel.ts` | 3414 |
| `apps/web/src/modules/masterData/MasterDataPage.tsx` | 3168 |
| `apps/api/src/modules/data.controller.ts` | 3008 |
| `apps/web/src/modules/customerService/CustomerServicePage.tsx` | 2474 |
| `apps/web/src/modules/settings/SettingsPage.tsx` | 2402 |
| `apps/web/src/modules/finance/FinancePage.tsx` | 2399 |
| `apps/web/src/modules/shared/ui.tsx` | 2377 |
| `apps/web/src/apiClient.ts` | 2341 |
| `apps/web/src/modules/finance/entry/FinanceEntryPage.tsx` | 1715 |
| `apps/web/src/modules/finance/waterReceipt/WaterReceiptPage.tsx` | 1616 |
| `apps/web/src/modules/routing/RoutingPage.tsx` | 1458 |
| `apps/web/src/modules/pricing/excel.ts` | 1232 |
| `apps/api/src/modules/rbac.ts` | 1178 |
| `apps/web/src/modules/orders/OrdersPage.tsx` | 1157 |
| `apps/web/src/modules/operations/OperationsPage.tsx` | 1108 |
| `apps/api/src/modules/notifications/notification.service.ts` | 1075 |
| `apps/web/src/modules/finance/orderFee/OrderFeePanel.tsx` | 841 |
| `apps/web/src/modules/warehouse/WarehouseRentDetailPanel.tsx` | 815 |
| `apps/web/src/modules/finance/receivableAudit/ReceivableAuditPage.tsx` | 765 |
| `apps/web/src/modules/notifications/NotificationCenter.tsx` | 712 |
| `apps/web/src/modules/finance/pendingPayment/PendingPaymentPage.tsx` | 707 |
| `apps/api/src/modules/lineage-watcher.ts` | 676 |
| `apps/web/src/modules/pricing/MarkupRouteEditor.tsx` | 663 |
