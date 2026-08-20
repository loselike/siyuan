# 运单总览查询边界重构

- 状态：`completed`
- 分支：`codex/shipment-query-boundary-20260820`
- 基线：`74521a08fb1f33482a2b02f3ae42f784faf435a0`
- 用户目标：进入新一阶段，继续完成收益最大的底层优化，同时保持现有业务行为、权限与返回契约不变。

## 阶段重评

- 安全 / 数据正确性：生产 CORS 已拒绝未配置来源，生产 seed 由运行时服务强制关闭；Compose 的 `SEED_ON_EMPTY=true` 默认值仍有治理歧义，但不是当前生产实际风险，暂不作为本切片。
- 高频业务流 / 前端数据流：`App.tsx` 与全局 workspace refresh 仍偏重，但新增 route-owned 页面会同时触及缓存、新鲜度和多页面状态，当前行为保护成本高于单一后端切片。
- 后端架构 / 改造效率：`GET /api/shipments` 与 `GET /api/market/shipments` 仍由 `DataController` 直接编排权限、数据范围与市场字段投影；同域已有 `ShipmentOverviewQueryController` 和完整 E2E 保护，迁移收益明确、影响面可控。

结论：**继续**后端模块化，选择“运单总览查询边界”作为代表切片。

- 价值：把两条高频只读路由迁入 Controller → Query Service → 窄 Repository Port，减少 `DataController` 和总 Repository 的直接耦合。
- 风险：市场部多权限组合、站点范围、当周可见性、业务/客户字段裁剪与 `costScope` 分支可能漂移。
- 行为保护：迁移前后复用 `shipment-overview-query.e2e.test.ts`；新增 Service 单测锁定业务分支与市场投影；路由、HTTP 方法、权限数组、响应字段和状态码保持不变。
- 固定样本：管理员、业务员、客户、市场部、仓库五类角色访问 `/api/shipments`，并验证 `/api/market/shipments`、`costScope=routed`、站点范围和财务敏感字段裁剪。

## GitHub 借鉴边界

- 参考 Vendure 官方插件文档与 RequestContext 源码：控制器保持薄，业务编排下沉到职责单一的 Service，并显式传递请求身份上下文。
- Sunny 只采用模块边界、依赖方向和请求上下文传递原则；不复制 Vendure 电商领域模型、不改成插件系统、不引入 GraphQL，也不改变现有 RBAC 与数据范围语义。

## 本切片范围

- 迁移 `GET /shipments` 与 `GET /market/shipments` 到 `ShipmentOverviewQueryController`。
- 新增 `ShipmentOverviewQueryService`、窄 Repository Port 与纯市场投影策略。
- 保留 `DataController` 写接口对相同市场投影策略的复用。
- 不改数据库、Prisma schema、前端、URL、权限码、业务状态或响应结构。

## 基线证据

- 迁移前 `shipment-overview-query.e2e.test.ts`：2/2 通过。
- 当前 47 发布基线与候选发布状态将在合并前通过发布工具重新捕获，不使用 `.codex-state.md` 的历史指纹作为发布依据。

## 本地结果

- `ShipmentOverviewQueryController` 现在统一承载 4 条运单总览只读路由，依赖 Query Service，不再直接注入总 Repository。
- `GET /shipments` 与 `GET /market/shipments` 的方法、URL、权限数组完全不变；治理快照只变更了 Controller 所有权。
- `DataController` 从 2,185 行 / 182 路由降至 1,990 行 / 180 路由；全局仍为 448 条路由，重复路由 0。
- 迁移后投影策略 + Query Service + E2E：10/10 通过，覆盖业务、客户、市场、仓库、`UG_MARKET`、`costScope`、站点范围、字段裁剪、周一零点边界、三种精确投影键集合，以及 `/api/market/shipments` 允许 / 拒绝路径。
- API typecheck、`architecture:check`、`governance:check`、`context:check`、`git diff --check` 全部通过。
- 独立权限 / 数据范围审查未发现 P0/P1；提出的“当周边界”和“写接口共用投影完整键集合”两个 P2 已补测试并通过。

## 待完成

- [x] 实施查询边界迁移与单元保护。
- [x] 定向 E2E、API typecheck、架构治理和 diff 检查。
- [x] 权限 / 数据范围独立风险审查。
- [x] 合并、精确发布 47，并验证允许 / 拒绝、字段裁剪、容器、provenance、日志、锁与 recovery。

## 合并与 47 发布结果

- PR `#11` 已合并，merge commit：`be4d860626e645414a0dc4cb2534721fdc5a2337`。
- 47 仅提升 API，不涉及 Prisma schema / migration，也未重启 Web；发布 ID：`git-be4d860626e6_web-32159ac4e7bd_api-bf0ea903914e`。
- 线上固定样本：管理员 `/api/shipments?costScope=routed` 返回 200 / 91 条；仓库角色访问 `/api/shipments` 返回 403；市场角色 `/api/market/shipments?costScope=routed` 返回 200 / 46 条；非市场业务角色访问市场运单返回 403。
- 市场结果按真实运单归属回查，46 条全部属于当前市场角色站点；`paymentAmountUsd`、`paymentAmountCny`、`paymentMethod`、`grossProfit`、`payables` 敏感键违规数为 0。
- `/api/shipments/status-counts` 返回 200；生产没有启用的客户账号，因此客户角标 403 使用本地 E2E 锁定，线上改用无员工端权限的仓库角色验证 403，未为采证写入生产账号。
- API / Web / Postgres / Redis 均运行；公网 health 与首页分别返回正常 / 200；API 最近 10 分钟无 `ERROR`、`Unhandled`、`FATAL`、`Exception`。
- provenance 为 `traceable / ok`，Git commit、API 镜像、运行时 release ID 一致；release lock 为 `free`，recovery 为 `clear`。

## 阶段完成重评

- 本切片已在查询边界、权限、字段裁剪和 47 运行时形成闭环，不继续扩大同一改动面。
- `DataController` 仍有 180 条路由，但下一切片不自动沿用“继续拆后端”的结论；应重新比较 Compose seed 治理、前端 route-owned 数据所有权和剩余后端高频边界的实际收益与保护成本。
