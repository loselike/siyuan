# Sunny 深度重构 Phase 31

- 状态：completed
- 分支：`codex/sunny-refactor-phase31`
- 基线提交：`dc440a6`
- 47 基线发布：`whitelist-160c821a6f076812cec9f864`
- 用户验收目标：继续快速拆解单体实现，同时保持客服问题件创建、回复、关闭、协助的路由、权限、可见范围、状态、审计和 lineage 语义不变。
- 固定样本：客服/业务/运营三类问题件创建及回复、关闭、请求协助共 6 条路由；未登录必须 401，无权限必须在 Repository 写入前 403，允许请求必须原样委派并保留既有默认值与字段覆盖。
- 本轮范围：把 6 条问题件命令路由从 `DataController` 迁入独立 `Controller/Service/Repository port`，继续复用 Prisma/InMemory 现有方法；不改 Repository 实现、共享 DTO、权限定义、数据库、状态、可见范围、审计或 lineage。
- 完成结果：6 条问题件命令路由迁入独立 `ProblemTicketCommandController/Service/Repository port`；`DataController` 减少 39 行、6 条路由，HTTP 方法、路径、处理器名称和鉴权装饰器经 AST 对比 6/6 等价；Repository 实现、共享 DTO、权限定义、数据库、状态、可见范围、审计和 lineage 未改。
- 本地证据：迁移前 E2E 3/3；迁移后 command E2E、service、既有客服读取边界合计 9/9；API typecheck、`git diff --check`、432 路由治理及安全契约 3/3 通过。既有宽 E2E 的关闭请求不带 body 时在 phase30 与 phase31 均返回相同 500，记录为旧测试/运行时债务，不在结构重构中改变。
- 版本证据：运行提交 `55e1390` 已推送；47 发布 `whitelist-a78817a573cb4f64682c2883`，API 指纹 `0de605260276028dc47a49d4b601feba4446a04f6c19fa0b70f45a7fd916e868`；五个白名单源码 checksum 与候选一致。
- 线上证据：6 条路由各映射一次；未登录 6/6 为 401，真实无权限角色 6/6 为 403，管理员对 6 条缺失运单/问题件请求均为 404，无业务写入；容器运行、公网 health、关键错误 0、发布锁 free、recovery clear。
- 后续：继续选择 `DataController` 中边界清楚的相邻路由组做同样的迁移前 characterization、等价迁移和 47 精确发布；无 body 关闭请求的既有 500 应单独作为 bug 任务确认兼容目标后修复。
