# Sunny 深度重构 Phase 35

- 状态：completed
- 分支：`codex/sunny-refactor-phase35`
- 基线提交：`62738a2`
- 47 基线发布：`whitelist-9143e7267a5a474b451ad79e`
- 用户验收目标：继续降低 `App.tsx` 的手工路由状态耦合，同时保持直接 URL 恢复、普通跳转、浏览器前进后退、无权限 fallback、提示和数据刷新触发不变。
- 固定样本：管理员从 `/app/pricing/quote` 登录后仍恢复查价页、点击价目表后 URL 正确且 popstate 返回查价；客服账号直达无权限的财务付款页时仍回退 `/app/customer-service` 并显示客服管理。
- 本轮范围：新增 app-shell staff route navigation hook，迁移 requested route 初始化、navigate/history、popstate 和无权限 fallback；继续复用现有 route parser/href、version check、15 秒数据刷新、session refresh 和菜单状态，不引入新路由库，不改权限、UI、业务状态或 API。
- 完成：新增 `staffRouteNavigation`，把 requested route 初始化、统一 navigate/history、15 秒数据刷新触发、session refresh、无权限 replace fallback 和 popstate 监听迁出 `App.tsx`；各 hook 在原调用/副作用位置接入，原 parser/href、version check、提示、菜单展开和客服根页重置未改。`App.tsx` 净减少 22 行。
- 保护网：迁移前/后当前 App characterization 2/2，route hook 单测 3/3；覆盖主菜单、popstate、canonical/reload href、push/replace、刷新时机、副作用和无权限回退。Web typecheck、`git diff --check`、432 路由治理及安全契约 3/3 通过。
- 既有测试冲突：旧 `workspace.test.tsx` 两条宽页面测试在本轮改代码前已失败，分别依赖现已变化的页面 heading，以及客服 lazy page fixture 触发 `shipments is not iterable`；本轮未改预期来掩盖，新增当前可观察路由契约并保留该旧测试债务。
- 提交：`d217efb`（`refactor(web): isolate staff route navigation`），已推送 `origin/codex/sunny-refactor-phase35`。
- 47 发布：`whitelist-5e3d9e8e8318cec867d42f2c`；Web 指纹 `b3bd44cde84e9f11f33295805e63351e6ce8ba0e80ac0d6be9428948f8f257e8`。线上两文件 checksum、Web 镜像、容器、内外 health、最近关键错误、发布锁和 recovery 均通过。
- 未改：仍使用现有 `window.history` 与 route config；未改权限、菜单内容、UI、API、业务状态、工作区数据或线上业务数据。
- 后续：抽取主/次菜单点击和 sidebar sub-nav 注册/解析，使 `App.tsx` 只消费导航状态；随后才能评估 React Router 适配层。
