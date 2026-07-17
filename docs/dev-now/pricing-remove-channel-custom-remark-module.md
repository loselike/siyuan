# 价格表管理备注入口收敛

- 状态：已完成（本地）
- 目标：移除“代理加价规则”中的“代理渠道自定义备注”重复管理区，统一由“价格表管理”维护。
- 改动：删除该管理卡片、编辑弹窗及其页面加载/刷新请求；保留查价结果中的自定义备注展示和价格表管理入口。
- 验证：`npm run typecheck -w @siyuan/web` 通过；`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx` 通过；`git diff --check` 通过。
- 发布：未同步到 47。
