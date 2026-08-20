# 角色权限唯一 Prisma Reader

- 状态：`in_progress`
- 会话标题：`Sunny｜架构控制面快速落地｜05`
- 续接自：`docs/archive/dev-now/2026-08/shipment-overview-prisma-query-phase4-20260821.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（持续目标自动续接）`
- 会话 slug：`role-permission-reader-phase5-20260821`
- 分支：`待从最新 main 创建 codex/role-permission-reader-phase5-20260821`
- worktree：`待创建独立 worktree`
- 认领时间：`2026-08-21 Asia/Shanghai`

## 用户可见目标

- 系统页面、功能、路由、请求/响应、权限结果和数据范围完全不变；生产角色权限读取只保留一个 Prisma Reader，停用岗位继续失败关闭，动态权限在下一次读取立即生效。

## 阶段完成重评

- 安全 / 数据正确性：裸 `@Body()` 精确债务仍为 230，其中登录接口已有手工运行时收敛；批量改 Schema 会改变 400 文案和默认值，当前缺逐接口 characterization，收益高但本切片风险更高。
- 高频业务流 / 前端数据流：`App.tsx` 仍为 3,521 行，route-owned 仅覆盖 pricing/settings；继续推广需要逐页证明缓存、新鲜度、返回 legacy 页面刷新和错误回退，当前没有比权限控制面更低成本的代表页。
- 后端架构 / 效率：`PrismaRepository` 33,734 行；角色权限解析在总仓储和 ShipmentOverview 真仓储各自查询 Prisma、维护两套销售范围缓存。运单总览一次读取会并发多次检查同一角色，重复数据库往返和双缓存漂移已经成为当前切片暴露出的直接风险。
- 结论：`转向`角色权限唯一 Prisma Reader；不继续扩大运单领域，也不批量接入输入 Schema。
- 价值：权限查询、停用岗位失败关闭、报价派生权限和销售范围判断只有一个生产实现；仅合并同一时刻的并发读取，不引入跨请求 TTL，保持权限变更下一次读取立即生效。
- 风险：管理员缺省权限、停用自定义岗位、legacy 销售范围兼容、报价权限派生和角色增删改后的范围缓存任一漂移都会造成越权或误拒绝。
- 行为保护：先锁定 Reader 纯契约和 ShipmentOverview 现有 14 条保护，再注入总仓储与窄仓储；不修改 Controller、业务 Service、权限码、响应结构、schema、迁移或生产数据。
- 固定样本：管理员、启用业务岗位、停用非管理员岗位和市场岗位；验证同角色并发权限检查只读一次数据库、停用岗位返回空权限/拒绝、报价派生权限不变、权限更新后下一次读取使用新值。

## GitHub 借鉴边界

- NestJS 官方授权文档把权限能力封装为可注入并由 Module 导出的 provider，避免权限判定散落在业务类；Keycloak 官方策略评估默认拒绝，只有显式授权才 grant。
- Sunny 只采用“唯一可注入权限读取 provider”和“失败关闭”原则；不引入 CASL、Keycloak、外部权限服务、跨请求 TTL 缓存或新的权限模型。

## 允许修改

- `apps/api/src/modules/prisma-role-permissions.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/data-access.module.ts`
- `apps/api/src/modules/shipment/overview/prisma-shipment-overview-query.repository.ts`
- 与该 Reader 直接相关的定向测试与架构门禁
- 本状态文件与 `.codex-state.md`

## 禁止范围

- 不改 UI、URL、HTTP 方法、请求/响应字段、权限码、数据范围、状态、金额、审计、Prisma schema/migrations 或生产业务数据。
- 不引入跨请求时效缓存；不把权限快照写入 JWT；不顺手迁移其他 Repository 方法。

## 当前进度

- 已完成三类候选重评并选择角色权限唯一 Reader。
- 已检查 NestJS、Keycloak 官方实现边界；尚未开始运行时代码修改。

## 验证计划

- Reader 单测：管理员缺省、停用岗位、报价派生、并发去重、错误后重试、销售范围记忆/失效。
- 回归：ShipmentOverview 真实 Prisma、Service/Policy/E2E；API typecheck；架构/governance/context；`git diff --check`。
- 47：管理员/市场允许、业务/仓库拒绝、市场站点与敏感字段裁剪、四条未登录 401；源码/provenance/镜像/health/日志/锁/recovery。

## 交接

- 阻塞：无
- 发布状态：`未实施`
- 准确下一步：合并本阶段终态与重评记录，从最新 main 创建独立 worktree，先写 Reader characterization 再切换依赖。
