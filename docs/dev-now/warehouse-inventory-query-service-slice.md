# Sunny｜仓库查询垂直切片｜01

- 状态：`in_progress`
- 会话 slug：`warehouse-inventory-query-service-slice`
- 分支：`codex/warehouse-query-service-slice`
- worktree：`/private/tmp/sunny-warehouse-query-service-slice`
- 基线：`291f5cb`（与47 Web/API/Migrate 指纹一致）
- 日期：`2026-08-05 Asia/Shanghai`

## 目标

- 以仓库库存只读查询为首个完整模板，形成 Controller -> Service -> Repository adapter 调用链。
- Prisma 与 InMemory/Legacy 继续共享同一 Service 与接口，只保留持久化差异。
- 新增模块本地测试数据工厂，不再继续扩大全局测试桩。
- API 路径、权限、请求参数、返回字段、数据范围和仓库写入保持不变。

## 实现

- 新增 `WarehouseInventoryQueryService`，统一承接包裹、组合、手工收货客户和墨家重复查询。
- `WarehouseInventoryQueryController` 与 `DataController` 改为依赖 Service，不再直接依赖库存查询 Repository token。
- `AppModule` 注册 Service；既有 Prisma/Legacy adapter 选择逻辑保持不变。
- 新增 `warehouse/inventory/test-support` 模块工厂与 Service 定向测试。

## 验证

- Service 定向测试 2/2 通过，固定样本 `9476-SF9476` 原样穿过 Service 边界。
- API typecheck 通过。
- `architecture:check:fast` 414 条路由契约通过。
- `governance:check`、lint no-new-debt、Mojia 无/错 token 3/3 通过。
- 既有 `warehouse-inventory-query.repository.test.ts` 在当前47基线已有两条陈旧断言：理货查询参数未包含新增 `createdAt/orderBy`，以及 Repository 层仍假设角色硬锁；该文件不属于本次 Service 行为证据，未修改运行时以迁就旧断言。

## 发布

- 待按 API 白名单精确发布47；无 Prisma schema/migration、Web 或生产数据写入。
