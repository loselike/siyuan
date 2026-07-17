# 全局导航新标签页路由

- 状态：`completed`
- 输入来源：`用户任务卡：全局导航：模块支持右键新标签页打开`
- 会话 slug：`navigation-new-tab-routing`
- 分支：`当前共享工作区（未切换分支）`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-15 00:00 Asia/Shanghai`

## 输入摘要

- 目标：员工端一级、二级导航使用稳定 URL，支持浏览器原生新标签页、刷新和前进/后退恢复。
- 不做：客户门户、详情分享 URL、后端权限或 47 发布。

## 允许修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/appShell/config.tsx`
- `apps/web/src/styles.css`
- 相关 Web 导航测试

## 当前进度

- 已为员工端一级、二级导航补齐稳定 `/app/...` URL 映射，并改为保留原生链接语义的锚点。
- 左键使用 History API 保持 SPA 切换；右键、中键、Cmd/Ctrl 点击不拦截。
- 已补 URL 初始化、浏览器前进/后退恢复、二级导航状态同步、无权限 URL 回退。
- 已确认 Nginx 使用 `/index.html` SPA fallback，可承接 `/app/*` 深链刷新。

## 验证

- 通过：`npm run typecheck -w @siyuan/web`
- 通过：`npm test -w @siyuan/web -- --run src/modules/workspace/workspace.test.tsx -t "导航支持稳定链接|无权限 URL"`
- 通过：`git diff --check`
- 备注：按任务卡宽泛关键字运行 workspace 测试时，已有“物流轨迹管理 最新轨迹导入入口 scoped by 权限”失败；该用例当前服务账号仅得到客服菜单，属于同时进行的权限目录清理改动，未触及本任务导航逻辑。

## 交接

- 阻塞：无
- 剩余风险：未做浏览器手工验证；本轮只覆盖了导航链接、路由恢复与权限 URL 回退的组件级行为。
