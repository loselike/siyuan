# 全局关键操作成功后当前页刷新但不自动跳转

## 本轮完成

- 市场排货确认后保留“待排货”页签，已流转订单从当前列表移除。
- 仓库出货成功后保留仓库管理与待出库上下文，不再自动切到客服数据确认。
- 录单提交审核后保留当前录单页面；待审核、草稿数据在后台刷新。
- 待审核通过与付款确认的刷新失败，改为明确提示“数据已提交成功，但页面刷新失败，请手动刷新”。
- 补充市场与业务录单的“不跳转”定向测试。

## 验证

- `npm test -w @siyuan/web -- --run src/modules/routing/routing.test.tsx -t "排货|审核|刷新|不跳转"`
- `npm test -w @siyuan/web -- --run src/modules/routing/routing.test.tsx -t "keeps the market pending-routing context"`
- `npm test -w @siyuan/web -- --run src/modules/finance/finance.test.tsx -t "提交审核后保留"`
- `npm run typecheck -w @siyuan/web`
- `git diff --check`

## 已知边界

- 待出库交接单打印 UI 的既有未完成改造，仍使旧的“打印即出货”测试用例不适用；本轮只确保出货成功后不再改变主导航。
