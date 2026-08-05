# Sunny｜理货查询垂直切片｜02

- 状态：`in_progress`
- 会话 slug：`warehouse-tally-query-service-slice`
- 分支：`codex/warehouse-tally-query-service-slice`
- worktree：`/private/tmp/sunny-warehouse-tally-query-service-slice`
- 基线：`8bf4e82`（上一仓库查询切片已发布47并收口）
- 日期：`2026-08-06 Asia/Shanghai`

## 目标

- 在不改变理货业务逻辑的前提下，将只读理货查询调用链收口为 Controller -> Service -> Repository adapter。
- Prisma 与 Legacy/InMemory 继续共享同一 Service 和接口，只保留持久化差异。
- 把理货 Repository 测试中的样本数据抽到模块本地工厂，避免继续扩大全局测试桩。
- API 路径、权限装饰器、查询参数、返回字段、数据范围、理货状态和生产数据保持不变。

## 固定验收样本

- 业务员 `operator` 查询已完成理货任务 `TL-001`，过滤条件 `status=COMPLETED`、`customerCode=C001`。
- Service 必须把 principal 与查询对象原样交给当前选中的 Repository adapter，输出任务与结果包裹引用不做加工。
- 合票明细、来源包裹、历史链和结果包裹继续走同一个 adapter。

## 实现

- 新增 `WarehouseTallyQueryService`，统一承接5条理货只读查询。
- `WarehouseTallyQueryController` 改为依赖 Service，不再直接依赖 Repository token。
- `AppModule` 注册 Service；现有 Prisma/Legacy provider 选择不变。
- 新增理货模块本地测试数据工厂，并让 Repository 与 Service 测试复用。
- 更新两条陈旧测试断言，使其与当前生产逻辑一致：已关联完成任务的结果包裹状态为“已理货”；销售范围历史链按包裹客户归属过滤。未修改相应运行时代码。

## 验证

- Service 2项与 Repository 3项定向测试，共5/5通过。
- API typecheck 通过。
- `architecture:check:fast` 414条路由契约通过，未新增 Shared 根入口依赖债务。
- `git diff --check` 通过。

## 发布

- 待按 API 白名单精确发布47；无 Prisma schema/migration、Web、权限或生产数据写入。
