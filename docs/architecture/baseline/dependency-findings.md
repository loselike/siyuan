# 源码依赖、孤儿候选与重复实现基线

> 只分析生产 TypeScript/TSX 的静态 import/export/dynamic import。孤儿项是复核候选，不等于可删除；运行时注册、脚本、CSS 和字符串路径不在图内。

| 指标 | 数值 |
| --- | ---: |
| 依赖图节点 | 130 |
| 内部依赖边 | 436 |
| 跨 workspace 依赖边 | 75 |
| 强连通循环组 | 0 |
| 入度为 0 的孤儿候选 | 4 |
| 完全相同源码文件组 | 1 |
| PrismaRepository 方法 | 541 |
| InMemoryRepository 方法 | 523 |
| 两个 Repository 同名方法 | 462 |
| 仅 PrismaRepository | 79 |
| 仅 InMemoryRepository | 61 |

## 循环依赖组

静态 TypeScript 依赖图未发现强连通循环。

## 孤儿候选

- `apps/api/src/modules/warehouse-device-site.ts`
- `apps/web/src/data.ts`
- `apps/web/src/modules/finance/useFinanceColumnSettings.tsx`
- `packages/shared/src/misc-fee-workflow.ts`

## 完全相同源码文件组

- `apps/api/src/modules/notifications/notification.types.ts` = `apps/web/src/modules/notifications/notificationTypes.ts`

## 双 Repository 同名方法

> 同名只证明需要双维护，不证明实现语义相同。

- 同名 462；前 40 个：`activateDubaiDisplayModes`, `activateDubaiPriceDisplayVersion`, `addPaymentVoucher`, `addPaymentWaterReceipt`, `addReceivableAdjustment`, `addTrackingEvent`, `applyOrderEntryReceiptMatches`, `applyWarehouseTallyMeasurementByBarcode`, `applyWarehouseTallyTaskLabel`, `approveReceivableMatchRequest`, `approveShipmentAgentData`, `approveShipmentAllData`, `approveShipmentBusinessData`, `approveShipmentReview`, `archiveWaterReceipt`, `assertCustomerServiceProblemCreationAllowed`, `assertPayeeBankMatchesPending`, `assertPaymentApplicationVoucherUploadAccess`, `assertPendingPaymentVoucherUploadAccess`, `assertWarehouseManualReceiptCustomer`, `assertWaterReceiptVoucherUploadAccess`, `assistProblemTicket`, `auditBusinessCostAudit`, `auditPayableAudit`, `auditReceivableAudit`, `batchApproveReceivableMatchRequests`, `batchAuditBusinessCostAudits`, `batchAuditPayableAudits`, `batchAuditReceivableAudits`, `batchDeleteAgentMarkupRules`, `batchDeletePriceBooks`, `batchDeleteReceivableMatchRequests`, `batchReverseAuditBusinessCostAudits`, `batchReverseAuditPayableAudits`, `batchReverseAuditReceivableAudits`, `batchReverseReceivableMatchRequests`, `batchUpdateAgentMarkupRules`, `batchUpsertAgentMarkupRules`, `batchVoidBusinessCostAudits`, `batchVoidPayableAudits`；其余 422 个可通过 `json` 命令复核
- 仅 Prisma 79：`applyOrderEntryChannelChargeWeight`, `buildLineShipmentPackageSummaries`, `businessCostAuditInclude`, `canAccessBusinessCostRow`, `createBusinessCostChangeNotificationAudit`, `createEvent`, `createOrderEntryFinanceItems`, `createWaterReceiptMatchRequests`, `decorateReviewPendingListShipments`, `enqueueStalePriceBookRefreshJobs`, `ensureCustomerServiceDataCycleStillCurrent`, `ensureReceivableNotSettledForReverseAudit`, `findShipmentForFinanceAudit`, `getLegacyFallbackPriceBookRows`, `getPayableUsdToRmbRate`, `getReviewVisibleShipment`, `getVisibleProblemTicket`, `getVisibleShipment`, `hardDeleteShipmentReviewRecord`, `invalidateMarkupRouteDirectory`, `isPrismaUniqueConstraintError`, `isReviewPendingStatus`, `isShipmentReviewOverdue`, `loadActivePriceBookAgentSources`, `loadAgentMarkupRules`, `loadLegacyPricingRows`, `loadLegacyPricingRowsForQuote`, `loadLegacyPricingSourceIdsForQuote`, `loadMarkupRouteRows`, `loadMarkupRouteRules`, `loadPriceBookRowsForMarkupValidation`, `loadPriceRowsForLookup`, `loadQuoteEligibleLegacyPricingRows`, `lockAndAssertOrderEntryPackageSnapshot`, `lockCompanyChannelForMutation`, `lockCustomerAccountForUpdate`, `lockShipmentRow`, `lockWarehouseCustomer`, `lockWarehouseCustomers`, `lockWaterReceiptForUpdate`, `mapWarehousePackagesWithConfirmedTally`, `nextLabelSequence`, `nextPaymentApplicationNo`, `nextSystemOrderNo`, `nextWarehouseRetallyTaskNo`, `nextWaterReceiptNo`, `onModuleDestroy`, `onModuleInit`, `parseRequiredTrackingDate`, `parseTrackingDate`, `payableAuditInclude`, `payablePaymentApplicationInclude`, `paymentApplicationInclude`, `persistPriceBookRows`, `prepareOrderEntryInput`, `processDubaiPriceBookImportJob`, `processPriceBookRuleRefreshJob`, `recoverStalledPriceBookRefreshJobs`, `removeManagedVoucherFile`, `replacePriceBookRowsFromRuleRefresh`, `resolveOrderEntryCustomer`, `resolveOrderEntryEntryAt`, `resolveStaffDepartmentId`, `runMojiaRequestSampleRetention`, `runPriceBookRuleRefreshWorker`, `schedulePriceBookRuleRefresh`, `toAgentBankAccountSummary`, `toCompanyChannelWeightRule`, `toPayableRmbAmount`, `toPayeeBankAccountSummary`, `toReceivableMatchRequestSummary`, `toWaterReceiptSummary`, `toWaterReceiptVoucherSummary`, `unmatchWaterReceiptMatchesInTransaction`, `updateShipmentStatus`, `validateFinanceItemInput`, `validateOrderEntryRequiredFields`, `waterReceiptInclude`, `withPendingBillVouchers`
- 仅内存 61：`activePriceBookAgentSources`, `activePriceBookRows`, `activePriceBookRowsForMarkupModule`, `agentBankMatches`, `agentDeleteReferenceReasons`, `agentIdentityValues`, `audit`, `auditBusinessCostChangeNotification`, `buildMemoryRoleRow`, `calculateOrderEntryCargoTotals`, `calculateOrderEntryPackageTotals`, `calculateReviewPendingReceivableRmbTotal`, `canAccessShipment`, `carrierTask`, `channelSummary`, `cloneAuditValue`, `customerDisplayName`, `decorateReviewPendingListShipment`, `departmentName`, `dwellHours`, `findCurrentWaterReceiptMatchRequest`, `findCustomer`, `findCustomerByCode`, `findEditableFinanceItem`, `findEnabledEntity`, `findPendingWaterReceiptMatchRequest`, `findShipmentForBusinessCostAudit`, `findWaterReceiptMatchRequests`, `formatDate`, `getLegacyReceivables`, `getOrderEntryPackages`, `getRoles`, `getShipmentById`, `isShipmentInSalesScope`, `nextMemoryPaymentApplicationNo`, `nextMemoryWaterReceiptNo`, `normalizePriceBookRow`, `pickMemoryStaffProfile`, `replaceOrderEntryFinanceItems`, `resolveMemoryStaffDepartmentId`, `resolveOrderEntryCompanyChannel`, `resolveShipmentAgent`, `seedCarrierTask`, `seedShipment`, `slug`, `syncCustomerServiceCostWeight`, `toCarrierAdapterCode`, `toPriceBookSummary`, `toReceivableSummary`, `toTicketSummary`, `trackingWebsiteForCarrier`, `usesWaterMatchReviewQueue`, `validateOrderEntryInput`, `visibleReviewShipment`, `visibleReviewShipments`, `visibleShipment`, `visibleShipments`, `visibleTicket`, `withConfirmedWarehouseTally`, `withSalespersonSite`, `withWarehouseDispatchArchiveFields`
