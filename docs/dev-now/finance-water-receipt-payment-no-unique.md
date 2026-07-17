# 财务管理水单到账与付款编号唯一校验

- 状态：`completed`
- 输入来源：`用户提供任务卡 2026-07-12-财务管理-水单到账与付款编号唯一校验`
- 会话 slug：`finance-water-receipt-payment-no-unique`
- 分支：`当前共享工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-12 Asia/Shanghai`

## 输入摘要

- 目标：水单付款编号必填且全局唯一，结算方式复用财务资料库，未到账水单保持不可匹配。
- 不做：不发布 47、不批量修复历史重复付款编号、不改发货审核或金额口径。

## 允许修改

- `apps/web/src/modules/finance/waterReceipt/WaterReceiptPage.tsx`
- `apps/web/src/modules/finance/FinancePage.tsx`
- `apps/web/src/modules/finance/finance.test.tsx`
- `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.finance.e2e.test.ts`
- `packages/shared/src/index.ts`

## 当前进度

- 水单新增、编辑均要求付款编号；付款编号清理首尾空格、控制字符和零宽字符后全局查重。
- 后端拒绝缺失或重复编号，允许当前水单保持原编号；未到账水单原有匹配禁用与 API 拒绝继续生效。
- 水单界面“收款方式”统一为“结算方式”，新增/编辑与筛选均复用财务资料库的启用结算方式；历史停用值保留展示但编辑时要求改选启用项。
- 新增 API 回归覆盖付款编号缺失、清洗后重复、编辑保持原值和编辑改为他票编号的拒绝。

## 验证

- 通过：`npm test -w @siyuan/web -- --run src/modules/finance/finance.test.tsx -t "水单|付款编号|结算方式|未到账|匹配"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.finance.e2e.test.ts -t "water receipt|paymentNo|未到账|匹配"`
- 通过：`npm run typecheck -w @siyuan/api`、`git diff --check`
- 未执行 Web typecheck：当前工作区已有 `FinanceEntryPage.tsx` 引用缺失的 `calculateCompanyChannelChargeWeight` 导出，非本轮改动。

## 交接

- 阻塞：无
- 剩余风险：暂不新增数据库唯一索引，避免历史重复数据导致迁移失败；本轮由 API 写入口校验，极端并发提交仍缺少数据库最终兜底。
