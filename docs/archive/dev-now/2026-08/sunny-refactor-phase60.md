# Sunny 深度重构 Phase 60

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`fb9a2f2599bb29cba1ff09c99b56fc91a414d7f8`
- 47 基线：`git-647de5094fd7_web-3c24fed0279c_api-11d551f45e42`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与固定样本

- 安全/数据正确性：token 主动撤销和全局 DTO 校验会改变当前外部行为，继续作为独立产品决策，不混入重构。
- 高频数据流：仓库看板直接调用 `GET /api/warehouse/in-stock-summary`；47 当前 `RECEIVED` 为 2,498 行，接口仍把全部 10 个汇总字段传回 Node.js。
- 后端架构：`PrismaRepository` 31,997 行仍是主要结构债务，但继续搬 Controller 的即时收益低于清除已量化全量查询。
- UI：`WarehousePage.tsx` 5,121 行仍需拆分，但本切片不同时改 UI 与 API 数据路径。
- 选择：把看板汇总下推 PostgreSQL，并复用 Phase59 已验证的仓库聚合查询策略；固定样本覆盖管理员、业务员客户范围、同票/多票、待理货、异常、重量/CBM、空集、等待排货与审计行数。

## 成熟参考与取舍

- [Vendure OrderService](https://github.com/vendurehq/vendure/blob/master/packages/core/src/service/services/order.service.ts)（GPL-3.0）：采用“查询服务在数据源完成列表/总数”的边界；不采用 TypeORM 或 Vendure 订单模型，不复制代码。
- [Medusa v2.14.2](https://github.com/medusajs/medusa/releases/tag/v2.14.2)（MIT）：采用大型筛选/汇总下推数据源的原则；不引入 Medusa index engine。
- [Prisma aggregation](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing)：继续使用参数化 `Prisma.sql`；动态列只能来自封闭分支，用户输入不得拼接。

## 风险与保护

- 看板与分页接口的业务员等待排货范围不同：看板使用完整 `salespeople` 范围，必须保持。
- 当前看板对客户归属做二次复核；优化后将当前 `Customer.salesperson` 复核并入同一聚合 SQL，避免复核与汇总之间的转交竞态，不直接假定首次客户 code 永久有效。
- 保持路由、权限、响应、票号 fallback、金额精度、审计 action/target/rowCount 不变；不改 schema、索引、前端或业务数据。

## 实施、验证与审查

- 抽取共享参数化 `queryWarehouseInStockAggregate`，Phase59 分页接口仅迁移代码位置、参数与映射保持；看板汇总改用同一数据库聚合，不再读取全部包裹汇总字段。
- 业务员看板保留首次 owned customer code 初筛，并在同一聚合 SQL 内用 `EXISTS Customer(code, salesperson)` 做当前归属复核；客户转交发生在 statement 前后均按单一 PostgreSQL 快照判定，关闭独立审查发现的 TOCTOU P1。
- 管理员/仓库广域不追加客户 EXISTS；业务员空客户 code 生成 `FALSE`，等待排货继续按完整 `salespeople` 团队范围；审计 rowCount 改由等价 aggregate `totalItems` 提供。
- 本地 focused tests `10/10`、API typecheck、focused ESLint、434 路由快速治理与 `git diff --check` 通过。
- 47 发布前只读真实 PostgreSQL 探针：管理员 2,498 行、当前业务归属 129 行、空业务范围 0 行，旧 Node 汇总与候选 SQL 七个字段均 `0 mismatch`；新增 EXISTS 真实执行 129 行亦 `0 mismatch`，未写业务数据。
- 最终独立审查未发现 P0/P1/P2。残余仅发布后继续观察业务员 EXISTS 路径和 owned-code IN 参数量；当前规模不构成阻断。

## 发布与复审

- 功能分支提交 `fac2642`、发布协调提交 `32fa6a2`，均已推送；47 标准 Git 发布范围为 `api`，未运行 migration，发布 ID 为 `git-32fa6a2c0309_web-3c24fed0279c_api-5e1c513e1d3d`。
- 发布后共享查询源码 checksum 与候选一致，容器构建产物包含当前归属 EXISTS；API 容器内与公网 health 均 200，provenance `traceable/ok`，Web/API image 与 API release ID 匹配，锁 free、recovery clear，最近 API 日志无关键错误。
- 业务员当前归属 EXISTS 在 15 个客户 code 样本上的真实 PostgreSQL `EXPLAIN` 为 planning 3.11ms、execution 1.274ms；发布前同一真实路径 129 行与旧汇总七字段 `0 mismatch`。
- 副作用：未改路由、权限、响应、前端、状态、schema 或业务数据；看板等待排货仍按完整团队范围，审计结构和行数语义保持。
- 新一轮比较：安全类主动撤销/全局 DTO 仍是行为变化，不能作为重构偷改；分页与看板两条已量化的仓库全量聚合浪费均已关闭；前端 `WarehousePage.tsx` 5,121 行已重新成为最高价值但风险更高的候选。下一步应转向前端，只读确定一个高频子区域的数据所有权、弹窗和操作完整性，再做单一代表切片，不继续沿 SQL 聚合方向扩张。
