# finance-water-receipt-customer-select

- 状态：`complete`
- 输入来源：`当前会话明确请求`
- 会话 slug：`finance-water-receipt-customer-select`
- 分支：`当前工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-11 Asia/Shanghai`

## 输入摘要

- 目标：新增或编辑水单时，客户编号从基础资料库客户中按编号或名称模糊搜索并下拉选择。
- 不做：不改水单匹配、到账、余额或凭证业务逻辑，不发布 47。

## 允许修改

- `apps/web/src/modules/finance/FinancePage.tsx`
- `apps/web/src/modules/finance/waterReceipt/WaterReceiptPage.tsx`
- `apps/web/src/modules/finance/finance.test.tsx`

## 当前进度

- 已确认后端水单创建/编辑已按客户编号校验客户资料；问题仅为前端错误地从账户名称拆分客户编号。
- 已完成：水单客户编号下拉改为使用基础资料库中的启用客户，选项展示“客户编号 - 客户名称”，支持按编号或名称模糊搜索。

## 验证

- 已通过：财务水单相关 Web 定向测试、Web typecheck、`git diff --check`。

## 交接

- 阻塞：无
- 剩余风险：无
