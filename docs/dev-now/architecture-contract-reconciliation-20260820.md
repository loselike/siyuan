# 架构路由契约对账（2026-08-20）

- 状态：`in_progress`
- branch: `codex/architecture-contract-reconciliation-20260820`
- baseline: `9012a8c422003a63c69730a6b3cc33f0bf48bb5d`
- production ancestor: `1881c1e4fe3bdad7c2f219f81c294d82148e2944`

## 用户验收目标

清除 `DataController` 与已拆分 Controller 的重复 HTTP 注册，使路由、方法、权限和现有响应保持兼容，并把架构门禁收紧为重复路由零容忍。

固定样本：

- `GET /api/shipments`：业务、客户、市场角色继续按原数据范围读取，仓库角色拒绝。
- `GET /api/operations/line-shipments/s-seed-6/internal-flow-log`：有权限角色允许、无权限仓库角色拒绝、客户角色拒绝。
- 客户来源 CRUD、系统身份管理、报价查询和墨家设备接口继续使用已拆分 Controller。

## 边界决定

- 已等价迁移的客户来源、系统身份管理、报价查询、内部流通日志和墨家设备路由，从 `DataController` 删除旧处理器。
- `GET /shipments` 的两个实现权限与返回语义不等价：市场角色仍依赖旧兼容行为，因此本批保留 `DataController` 为 canonical 路由，移除尚未完成兼容迁移的 `ShipmentOverviewQueryController.shipments`。
- 不修改数据库、Prisma schema、业务状态和权限目录；只收敛重复 HTTP 注册及其架构快照。
- `config/architecture/governance-baseline.json` 只删除经逐条审查的 34 个重复处理器快照，并下调已实际减少的债务上限；不整体抬高基线。

## 当前证据

- 路由契约：482 -> 448。
- `DataController` 路由：215 -> 182。
- 已知重复路由组：34 -> 0。
- `DataController`：2728 -> 2185 行。
- 生产源码 `as any`：950 -> 949；直接 `process.env`：38 -> 37。
- `GET /shipments` 保留市场角色兼容语义；业务、客户、市场允许，仓库拒绝的 E2E 通过。
- 客户来源读取补回 `Principal` 向 Repository 的传递，允许、未登录和拒绝路径 E2E 通过。
- 内部流通日志由 Repository 统一判断运营/市场 canonical permissions，运营、市场允许，仓库和客户拒绝路径 E2E 通过。
- 系统角色/账号代表路由管理员 200、业务角色 403、未登录 401 的 HTTP 允许/拒绝契约覆盖。
- 市场运单列表锁定 `costScope=routed`、非法 `costScope` 回退、站点范围和财务字段裁剪；内部流通日志直接路由补充未登录 401。
- 本地通过：API typecheck、`git diff --check`、`architecture:check`（448 route contracts、lint no-new-debt、Mojia 3/3），以及 11 个相关测试文件的定向验证。
- 权限专项独立审查无 P0/P1；审查提出的系统 HTTP 允许/拒绝、内部日志 401 和运单 `costScope`/字段裁剪三项 P2 保护缺口已全部补齐。

## 待完成

- 精确发布 API 到 47，验证路由、权限、容器、release provenance 和错误日志。
