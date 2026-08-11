# Sunny 深度重构 Phase 32

- 状态：completed
- 分支：`codex/sunny-refactor-phase32`
- 基线提交：`a7bb24b`
- 47 基线发布：`whitelist-a78817a573cb4f64682c2883`
- 用户验收目标：开始拆解前端 `App.tsx` 的全局数据编排，同时保持登录、刷新、权限分支、请求顺序、失败回退和页面数据结果不变。
- 固定样本：管理员登录普通工作区时继续加载运单、问题件、财务、承运商任务和基础资料；直接登录客服数据确认页时继续跳过这些无关全局请求，只由页面加载自己的数据确认列表。
- 本轮范围：把 `refreshWorkspace` 的请求编排迁入独立 app-shell orchestrator，保留当前请求条件、顺序、错误吞吐和 setter 时机；不引入新路由库、查询缓存，不改 API、权限、UI、localStorage 或业务状态。
- 完成：新增 `workspaceRefresh` app-shell orchestrator，`App.tsx` 只保留路由 skip 判定和 writer 注入；原权限条件、并发请求组、组间顺序、逐项失败回退、setter 时机及 data-confirm 跳过逻辑未改。`App.tsx` 净减少 56 行，编排逻辑进入 121 行独立模块。
- 保护网：迁移前/后页面 characterization 2/2，orchestrator 单测 3/3；覆盖管理员完整请求集、客服数据确认页隔离、请求参数/组顺序、空权限与失败回退。Web typecheck、`git diff --check`、432 路由架构治理及安全契约 3/3 通过。
- 提交：`bd34215`（`refactor(web): extract workspace refresh orchestration`），已推送 `origin/codex/sunny-refactor-phase32`。
- 47 发布：`whitelist-85f6006e0917073185ee5f0c`；Web 指纹 `7a52fb602ee843326ea5e06b6993debf6ba7ea380d548c0f8838ecb259a97e3b`。线上 `App.tsx` 与新 orchestrator checksum、Web 镜像、容器、内外 health、最近关键错误、发布锁和 recovery 均通过。
- 未改：API、Prisma、权限、业务状态、UI、路由库、查询缓存、localStorage 和线上业务数据。
- 后续：继续按 characterization-first 拆 `App.tsx` 中边界清楚的会话/导航或页面编排；不要在结构切片中顺带引入 React Router、查询缓存或 UI 改版。
