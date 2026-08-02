# 报价查价渠道阶梯加价收敛

- 状态：`completed`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`pricing-markup-workbench-tabs`
- 分支：`当前共享工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-14 Asia/Shanghai`

## 输入摘要

- 目标：恢复外层代理统一加价规则视图；把渠道阶梯加价替换为“渠道线路详情”内每条真实渠道的唯一加价维护入口。
- 不做：不改报价计算、接口、数据库结构或发布 47。

## 允许修改

- `apps/web/src/modules/pricing/PricingPage.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/modules/pricing/pricing.test.tsx`
- `docs/dev-now/pricing-markup-workbench-tabs.md`

## 当前进度

- 已移除外层渠道阶梯加价卡；渠道详情已去掉旧的批量/线路自定义加价入口，改为真实渠道的“设置/修改阶梯加价”。外层原代理统一加价规则保留，代理渠道自定义备注保留在其后。

## 验证

- `npm run typecheck -w @siyuan/web`：通过。
- `git diff --check`：通过。
- `npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "查看线路不显示其他代理，并在真实渠道内维护阶梯加价"`：未通过；测试在进入详情前仍调用已替换的价格表管理模块选择器（找不到“选择查价模块”），未执行到本轮阶梯入口断言。

## 交接

- 阻塞：无
- 剩余风险：现有阶梯保存接口按提交条目 upsert；从编辑弹窗移除既有阶梯后不会自动删除旧阶梯，需另补“删除阶梯”后端语义。47 截图中的 API 500 需在单独发布会话同步现有 Prisma migration 后才能消除。
