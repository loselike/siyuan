# 业务看板按效果图优化展示

## 当前目标

- 优化 `业务管理 -> 业务看板`：标题/更新时间/刷新、四项业务统计、快捷入口、今日提醒与近 7 天录单趋势。
- 复用已有运单、草稿、待审核接口及其服务端数据范围裁剪；不引入待排货或财务敏感数据。

## 本轮范围

- `apps/web/src/modules/finance/FinancePage.tsx`
- `apps/web/src/modules/finance/finance.test.tsx`
- `apps/web/src/styles.css`

## 完成

- 顶部已增加业务看板标题、副标题、最近刷新时间和手动刷新按钮。
- 已保留四项统计卡片与快捷入口，且未加入待排货或财务敏感数据。
- 今日提醒收敛为单条浅蓝提示；新增近 7 天录单趋势 SVG 图，零数据也显示基线和日期。
- 趋势图已增加按日期区间的悬停/键盘焦点提示，展示对应日期与录单数量。
- 已确认：`/shipments`、`/shipments/review-pending`、`/shipments/order-entry/drafts` 均在 API 仓储层按当前用户可见范围查询，并对录单敏感字段裁剪。

## 验证

- `npm test -w @siyuan/web -- --run src/modules/finance/finance.test.tsx -t "business dashboard|业务看板"`
- `npm run typecheck -w @siyuan/web`
- `git diff --check`

## 发布

- 未发布 47，未提交 Git。
