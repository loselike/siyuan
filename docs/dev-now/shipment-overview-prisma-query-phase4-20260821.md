# 运单总览真实 Prisma 查询仓储

- 状态：`in_progress`
- 会话标题：`Sunny｜架构控制面快速落地｜04`
- 续接自：`docs/archive/dev-now/2026-08/architecture-shipment-overview-compatibility-adapter-20260821.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（持续目标自动续接）`
- 会话 slug：`shipment-overview-prisma-query-phase4-20260821`
- 分支：`codex/shipment-overview-prisma-query-phase4-20260821`
- worktree：`/Users/j1ng/Tools/sunny-shipment-overview-prisma-query-phase4-20260821`
- 认领时间：`2026-08-21 Asia/Shanghai`

## 输入摘要

- 目标：把生产 `getShipments` 查询、权限/范围判断、字段裁剪和停留时间附加从巨型 `PrismaRepository` 迁入真实窄 Prisma Repository；总仓储只保留兼容委托，外部业务行为完全不变。
- 不做：不改 UI、URL、HTTP 方法、权限码、数据范围、响应字段、状态、金额、审计语义、Prisma schema/migrations 或生产业务数据；不在新旧仓储复制两份实现。

## 阶段重评

- 安全 / 数据正确性：230 个裸 `@Body()` 仍需逐接口保护非法输入语义，批量接入会改变错误契约，暂不作为本切片。
- 高频前端 / 数据流：route-owned 当前仅覆盖 pricing/settings；继续推广会触及缓存、新鲜度与回退刷新，保护成本仍高。
- 后端架构 / 效率：ShipmentOverview 上层已完成兼容隔离，但生产读取仍进入 34K 行总仓储；现有 10 条 E2E/Service/Policy 保护和 47 固定角色样本可以承载真实实现迁移。
- 结论：`继续`运单查询的真实 Prisma 拆分，不再增加兼容壳。
- 价值：让四条高频只读路由在生产不再经过总仓储；同时让总仓储其他调用方通过同一窄实现兼容，避免双实现漂移。
- 风险：销售/团队/站点范围、市场敏感成本、全局字段屏蔽、路由审计恢复、代理替换申请和阶段停留附加任一漂移都会造成越权或页面字段变化。
- 固定样本：管理员、业务员、客户、市场、仓库访问 `/api/shipments`、`/api/market/shipments`、`/api/shipments/status-counts` 和 `/api/navigation/unread-badges`；锁定 `costScope=routed`、站点范围、财务敏感字段、客户/仓库拒绝语义和返回条数。

## GitHub 借鉴边界

- 参考 Medusa 官方 Product Category Service：通过构造器注入窄 Repository，模块服务只访问自己领域的数据模型与明确依赖。
- Sunny 只采用窄数据访问实现和依赖注入原则；不复制源码、不采用电商领域模型、MikroORM 或微服务拆分。

## 允许修改

- `apps/api/src/modules/shipment/overview/**`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/data-access.module.ts`
- 与查询所需权限读取/纯映射直接相关的现有文件
- `config/architecture/module-boundaries.json`
- 与本切片直接相关的定向测试和治理基线
- 本状态文件

## 当前进度

- 已建立最新主干独立 worktree，确认初始工作树干净。
- 已完成三类候选重评并选择真实 Prisma 查询拆分。
- 迁移前运单总览 characterization 为 10/10。
- 已建立 `PrismaShipmentOverviewQueryRepository`，生产 Module 直接绑定真实 Prisma 实现；InMemory 模式继续使用兼容适配器。
- 巨型 `PrismaRepository.getShipments` 已缩为单行兼容委托；查询、状态统计和导航角标的生产入口不再由巨型仓储实现。
- 运单映射、路由/出库审计恢复、费用汇总和发票模板解析已收口到唯一 mapper；角色权限解析收口到共享 Prisma resolver，未保留新旧两份查询实现。
- Shared 运单/权限子路径补齐所需显式出口，没有增加根出口依赖债务；架构状态升级为 `prisma-query-repository`。

## 验证

- 已通过：迁移前 10/10；迁移后 Service/Policy/E2E/Legacy/真实 Prisma Repository 14/14；Shared build；API/Web typecheck；448 路由、完整治理、上下文与安全门禁；`git diff --check`。
- 待执行：完整治理/上下文检查、主干 CI、47 管理员/市场/业务/仓库角色与源码指纹验证。

## 交接

- 阻塞：无
- 剩余风险：本地真实 Prisma 仓储已完成，但尚未经过主干 CI 与 47 真实数据库角色样本对比；发布前不得宣称线上已切换。
- 用户验收目标：所有页面和功能不变，生产运单总览读取不再进入巨型 PrismaRepository 实现。
- 效果证据：迁移前 10/10、迁移后 14/14；真实 Prisma 单测固定市场站点、销售本人范围、代理/成本/付款字段裁剪和停用岗位拒绝。
- 安全证据：架构门禁 448 路由与 no-new-lint-debt 通过；生产实现禁止导入巨型仓储，Shared 根依赖未新增；停用非管理员角色定向验证 fail-closed。
- 未验证项：主干 CI 与 47 线上允许/拒绝/字段裁剪/数据范围。
- 发布状态：`未发布`
- 稳定附件：无
- 准确下一步：运行完整本地治理与差异审查，合并主干后从干净发布协调 worktree 精确发布 Web+API 并验证固定角色样本。
- 建议新标题：`Sunny｜架构控制面快速落地｜05`
- 建议新状态文件：`docs/dev-now/architecture-control-plane-phase5-20260821.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
