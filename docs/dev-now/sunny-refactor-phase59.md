# Sunny 深度重构 Phase 59

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`7a1208d6cced48c87137e4fcb5545963b948043a`
- 47 基线：`git-3964a91a2636_web-3c24fed0279c_api-40e35302377a`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与固定样本

- P0：未发现证据充分且可在行为保持重构中直接处理的数据错误或安全漏洞；token 主动撤销与全局 DTO 校验会改变外部行为，继续独立候选。
- P1：`GET /api/warehouse/in-stock-page` 已数据库分页，但每次仍读取全部命中 `WarehousePackage` 的 10 个字段后在 Node.js 计算合计和总行数。
- 选择：把全量合计计算下推 PostgreSQL；固定样本含同票多包裹、不同票、异常/非异常、空值、分页第二页、管理员与业务员客户范围，要求 totals、rows、pagination、审计与站点裁剪逐项等价。

## 成熟参考与取舍

- [Vendure OrderService](https://github.com/vendurehq/vendure/blob/master/packages/core/src/service/services/order.service.ts)（GPL-3.0）：采用同一筛选边界返回分页 items/totalItems。只借鉴查询边界，不采用 TypeORM 或其订单模型。
- [Medusa v2.14.2](https://github.com/medusajs/medusa/releases/tag/v2.14.2)（MIT）：大型目录筛选直接下推 index engine，避免应用层后处理。Sunny 继续使用 Prisma/PostgreSQL，不引入 Medusa index engine。
- [Prisma aggregate/groupBy](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing)（官方文档）：采用数据库 count/sum/group 语义；若数组异常判断或票号 fallback 无法由稳定 Prisma API等价表达，使用参数化 `$queryRaw`，禁止拼接用户输入。

## 风险与保护

- Decimal、件数乘重量、两位四舍五入、票号 fallback、异常数组、业务员客户范围必须保持现有语义。
- 先补 characterization，再替换实现；不改共享类型、路由、权限、筛选、数据库 schema、索引或前端。

## 实施与验证

- 已把 `GET /api/warehouse/in-stock-page` 的 `totalItems`、票数、件数、重量、CBM、待理货票和异常票下推为单条参数化 PostgreSQL CTE；页面行继续沿用原 Prisma 排序与分页，等待排货统计、客户维护信息、业务员站点裁剪及审计结构未改。
- 合计筛选由与页面 `where` 同源的封闭映射生成；支持当前全部状态、归档时间、站点、三个模糊字段、客户范围和操作日志包裹 ID，缺失基本查询范围时 fail closed。
- 本地定向 Repository 测试 `7/7`、API typecheck、focused ESLint、434 路由快速治理与 `git diff --check` 通过；全 API lint 仍有 105 个历史错误，本轮两个目标文件单独 lint 为 0。
- 47 发布前只读等价探针：当前生产 `RECEIVED` 2,498 行、近月归档 28 行、复合筛选 1 行，旧 Node 汇总与候选 SQL 七个聚合字段均 `0 mismatch`；候选真实执行分别约 8.3ms、0.5ms。纯 `VALUES` PostgreSQL 探针的 mixed、正/负半分边界和空集四组也均逐字段相等，未写业务数据。
- 保护网确认单次页面请求不再执行无分页 `WarehousePackage.findMany`，并校验业务员客户范围、全部筛选参数化、分页和审计契约。

## 独立审查

- 第一轮指出 mock 测试未真实执行 SQL 及浮点半分边界风险；补充 47 当前 API 容器真实 Prisma/生产数据与纯 `VALUES` 对照后，未发现 P0/P1 业务等价性或发布阻断。
- 残余 P2：Repository 单测仍通过 mock 验证 raw SQL 结构；真实 PostgreSQL 等价证据保存在本任务记录而非可离线重复的集成测试。后续若建立隔离测试数据库，应把该探针固化，但不为本轮引入容器测试框架或 schema 变化。

## 发布与复审

- 功能分支提交 `17cea3f`、发布协调提交 `647de50`，均已推送；47 标准 Git 发布范围为 `api`，未运行 migration，发布 ID 为 `git-647de5094fd7_web-3c24fed0279c_api-11d551f45e42`。
- 发布后源码 checksum 与候选一致，容器构建产物含聚合查询；API 容器内与公网 health 均 200，provenance `traceable/ok`，Web/API image 与 API release ID 匹配，锁 free、recovery clear，最近 API 日志无关键错误。
- 发布后再次对 2,498 条 `RECEIVED` 生产记录执行旧 Node 汇总与候选 SQL，只读结果仍为七字段 `0 mismatch`。
- 副作用：未改路由、请求/响应字段、权限、客户范围、分页、业务状态、数据库结构或业务数据。数据库聚合本身约 7.8ms，高于旧单纯读行约 1.4ms，但消除了 2,498 行网络传输与 Node 对象/聚合；目前无性能退化证据。
- 新一轮比较：安全类 token 撤销与全局 DTO 校验会改变外部行为，继续待独立产品决策；前端 `WarehousePage.tsx` 仍为 5,121 行，但结构拆分的即时效果不如确定的查询浪费；后端 `getWarehouseInStockSummary` 仍读取全部在库汇总字段，且正被仓库看板直接调用。
- 下一步选择“继续但换独立接口”：为看板汇总建立单独 characterization，再把其当前筛选、权限、待排货、票号和审计语义下推数据库。不能直接复用分页 SQL假定口径一致，也不在同一切片改 UI。
