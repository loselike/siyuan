# 录单仓库包裹确认选择

- 状态：已完成（本地，未发布）
- 任务来源：2026-07-11 用户要求录单“仓库数据”弹窗增加确认选择包裹的按钮。
- 实现：勾选包裹仅在弹窗内暂存；点击“确认选择这些包裹（X）”后才写入录单和费用计费重，关闭弹窗会放弃未确认的变更。
- 验证：`npm test -w @siyuan/web -- --run src/modules/finance/finance.test.tsx -t "仓库数据|提交审核 moves|录单草稿箱"`、`npm run typecheck -w @siyuan/web`、`git diff --check` 通过。
