# 财务水单匹配与凭证权限调整

## 本轮范围

- 任务卡：`2026-07-12-财务管理-水单匹配状态与业务员凭证上传调整.md`
- 已确认口径：到账状态与匹配状态分列；余额为 0 且关联应收已审核完成时自动归档，默认列表不显示该水单编号。

## 允许修改

- `apps/web/src/modules/finance/waterReceipt/WaterReceiptPage.tsx`
- `apps/web/src/modules/finance/VoucherImageInput.tsx`
- `apps/web/src/modules/finance/finance.test.tsx`
- `apps/web/src/apiClient.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.service.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/rbac.ts`
- `apps/api/src/modules/app.finance.e2e.test.ts`
- `apps/web/src/modules/testSupport/appTestHarness.tsx`
- `apps/api/src/modules/seed.ts`

## 验证

- 已通过：`npm test -w @siyuan/web -- --run src/modules/finance/finance.test.tsx -t "水单|凭证|图片|未匹配|已匹配|余额|业务员"`
- 已通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.finance.e2e.test.ts -t "water receipt|voucher|upload|match|reverse"`
- 已通过：`npm run typecheck -w @siyuan/web`、`git diff --check`
- 阻塞：API 全量类型检查命中并发工作区既有的 `WaterReceiptMatchSummary.source` 类型缺失错误，位置为 `apps/api/src/modules/in-memory.repository.ts:4768,4884`，不在本卡改动范围。
