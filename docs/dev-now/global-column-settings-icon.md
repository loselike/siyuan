# global-column-settings-icon

- 状态：`completed`
- 输入来源：`2026-07-12-全局列设置入口共享化与图标化` 任务卡
- 会话 slug：`global-column-settings-icon`
- worktree：`/Users/j1ng/Tools/sunny`

## 输入摘要

- 将全系统表格列设置入口统一为 `ManagedTable` 工具条图标，不再作为表格列或显示文字。

## 允许修改

- `apps/web/src/modules/shared/ui.tsx`
- `apps/web/src/styles.css`
- 手写入口所在的 Web 模块及对应测试。

## 不做

- 不改 API、权限、数据库、列配置 key 或 47 发布。

## 完成内容

- `ManagedTable` 列设置入口统一收敛到工具条，改为带 Tooltip 和 `aria-label` 的纯 Settings 图标；不再追加设置表格列或影响横向滚动宽度。
- 运营专线运单池和客服问题件列表改接 `ManagedTable.columnSettings`；费用明细保留特殊 Popover 配置逻辑，但入口改用同一图标按钮样式与可访问名称。

## 验证

- 通过：`ui-table.test.tsx -t "列设置|column"`、`git diff --check`。
- 任务卡其它定向测试：客服通过；路由、工作台、财务当前无匹配用例。仓库命中用例因并行改动将列标题从“运单号”改为“出货单号”而失败，和列设置入口无关。
- `npm run typecheck -w @siyuan/web` 当前被 `App.tsx`、`FinanceEntryPage.tsx` 的既有 `outboundOrderNo` Shared 类型不一致阻断，非本轮图标化改动引入。
