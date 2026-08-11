# Sunny 深度重构 Phase 33

- 状态：completed
- 分支：`codex/sunny-refactor-phase33`
- 基线提交：`4cfb17c`
- 47 基线发布：`whitelist-85f6006e0917073185ee5f0c`
- 用户验收目标：继续降低 `App.tsx` 的会话与鉴权编排耦合，同时保持现有登录、持久化、当前会话刷新、限流、并发复用、退出清理和页面结果不变。
- 固定样本：管理员登录后仍以相同 key/value 写入当前 session；挂载后立即刷新 `/api/auth/me`，一分钟内普通触发仍跳过且并发请求仍复用；未授权清理仍删除 session 并重置现有 App 数据状态。
- 本轮范围：新增 app-shell session store 与 current-session refresh hook，替换 `App.tsx` 中 `siyuan-session` 的直接访问及刷新 refs/effect；不改 token 存储介质、JWT、登录 API、刷新频率、权限、UI、路由、表单和工作区数据语义。
- 完成：新增 `sessionStore` 与 `useCurrentSessionRefresh`，`App.tsx` 不再直接读写 `siyuan-session`，也不再持有当前会话刷新的定时器、事件监听、限流和 in-flight refs；原 key、JSON、异常行为、刷新时机、1 分钟限流、5 分钟触发、可见性条件、并发复用和 token 竞争保护未改。`App.tsx` 净减少 42 行。
- 保护网：迁移前/后 App characterization 2/2，store/hook 单测 4/4；覆盖登录持久化、立即 reconcile、确认退出后清理、原 malformed JSON 行为、无 token、in-flight 复用、限流和 force。Web typecheck、`git diff --check`、432 路由治理及安全契约 3/3 通过。
- 提交：`05eccb4`（`refactor(web): isolate app session lifecycle`），已推送 `origin/codex/sunny-refactor-phase33`。
- 47 发布：`whitelist-795b1ca9b284c0ada90edab1`；Web 指纹 `3d2c141584adbadfe2d27d0f5a54d40f2846cf696b756fa59d1c8a8e8f21faf7`。线上三文件 checksum、Web 镜像、容器、内外 health、最近关键错误、发布锁和 recovery 均通过。
- 未改：token 仍按现状保存在 localStorage；JWT、登录 API、权限、UI、路由、表单、工作区数据及线上业务数据均未改。HttpOnly/session 迁移属于单独安全需求，不能夹在结构重构中实施。
- 后续：继续从 `App.tsx` 抽取导航或通知编排；若治理 token 存储，需单独设计服务端 cookie、CSRF、撤销和灰度兼容，不得只替换前端 API。
