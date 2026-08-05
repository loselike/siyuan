# Sunny｜仓库查询垂直切片｜01

- 状态：`published_47`
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

- 已按 API 白名单精确发布47，仅同步4个运行时文件并构建、重启 API：
  - `apps/api/src/modules/app.module.ts`
  - `apps/api/src/modules/data.controller.ts`
  - `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts`
  - `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.service.ts`
- 47 发布标识：`whitelist-bc9b25c14e8b8a9eae183173`，发布时间 `2026-08-05T23:35:48+08:00`。
- 线上4个源码 checksum 与本地候选一致；API 容器内和公网 health 均返回200，未登录库存查询返回401，最近10分钟无启动/依赖注入异常。
- 无 Prisma schema/migration、Web 或生产数据写入。
