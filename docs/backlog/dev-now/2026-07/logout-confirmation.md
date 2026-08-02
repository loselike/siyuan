# 退出登录二次确认

- 状态：已完成（本地，未发布）
- 任务来源：2026-07-10 用户要求点击员工端“退出登录”前二次确认。
- 实现：顶部退出登录按钮先打开“确认退出登录”弹窗；仅点击“确认退出”才清理本地会话并返回登录页，取消时保持当前登录状态。鉴权失效仍沿用原来的即时退出逻辑。
- 验证：`npm test -w @siyuan/web -- --run src/modules/settings/settings.test.tsx -t "confirms employee logout"`、`npm run typecheck -w @siyuan/web`、`git diff --check`。
