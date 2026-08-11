# Sunny 深度重构 Phase 34

- 状态：completed
- 分支：`codex/sunny-refactor-phase34`
- 基线提交：`d85b2d8`
- 47 基线发布：`whitelist-795b1ca9b284c0ada90edab1`
- 用户验收目标：继续降低 `App.tsx` 的手工路由与通知编排耦合，同时保持通知跳转、同源校验、权限拒绝、目标弹窗和 URL 清理结果不变。
- 固定样本：管理员从带 `notificationEntityType=SHIPMENT&notificationEntityId=s-1` 的订单深链接登录后，仍自动打开同一运单详情，并仅在成功消费目标后删除这两个查询参数。
- 本轮范围：新增 app-shell notification navigation hook，迁移 pending target 初始化、通知点击校验/跳转和消费清理；继续使用现有 `window.history`、`parseStaffAppRoute` 和 `navigateToAppRoute`，不引入新路由库，不改权限、通知 API、UI、工作区刷新或业务状态。
- 完成：新增 `useNotificationNavigation`，`App.tsx` 不再持有 pending target 初始化、通知点击同源/路由/权限校验及消费 URL 清理实现；原 warning 文案、跳转参数、history 顺序、目标 truthy 规则、匹配消费条件和其他查询参数保留行为未改。`App.tsx` 净减少 27 行。
- 保护网：迁移前/后 App 深链接 characterization 1/1，hook 单测 3/3；覆盖初始目标、匹配/不匹配消费、合法跳转、同源拒绝、不可见模块拒绝、URL 和其他参数保留。Web typecheck、`git diff --check`、432 路由治理及安全契约 3/3 通过。
- 提交：`1d0b315`（`refactor(web): isolate notification navigation`），已推送 `origin/codex/sunny-refactor-phase34`。
- 47 发布：`whitelist-9143e7267a5a474b451ad79e`；Web 指纹 `688bbbf145903254ae45899b20c969ffc0a023dbf92df87319f149dc8a41d21f`。线上两文件 checksum、Web 镜像、容器、内外 health、最近关键错误、发布锁和 recovery 均通过。
- 未改：仍使用现有 `window.history`、路由解析器和权限菜单；未改通知 API、UI、业务状态、工作区数据、鉴权或线上业务数据。
- 后续：继续把主/次菜单、popstate、无权限 fallback 和 sidebar sub-nav 编排迁入可测试的 app-shell 导航边界；成熟路由库替换需在现有契约完全覆盖后单独切换。
