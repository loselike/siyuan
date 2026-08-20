# 运单总览兼容适配器

- 状态：`complete`
- 会话标题：`Sunny｜架构控制面快速落地｜03`
- 续接自：`docs/archive/dev-now/2026-08/architecture-user-table-preference-module-20260820.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续下一阶段）`
- 会话 slug：`architecture-shipment-overview-compatibility-adapter-20260821`
- 分支：`codex/architecture-control-plane-phase3-20260821`
- worktree：`/Users/j1ng/Tools/sunny-architecture-control-plane-phase3-20260821`
- 认领时间：`2026-08-21 Asia/Shanghai`

## 输入摘要

- 目标：继续收益最大的底层优化，在不改变业务流、界面、接口、权限、数据范围、状态、金额、审计与错误语义的前提下，消除运单总览端口和模块对巨型 `PrismaRepository` 的直接类型/Provider 绑定。
- 不做：不改数据库、Prisma schema、前端、URL、HTTP 方法、权限码、响应字段、缓存/刷新策略或输入校验语义；不在本切片复制或重写复杂运单查询。

## 阶段重评

- 安全 / 数据正确性：当前裸 `@Body()` 债务仍冻结为 230；批量接入 Schema 会改变大量接口的非法输入状态码与错误消息，保护成本高，暂不抢跑。
- 高频前端 / 数据流：除 pricing/settings 外仍缺少充分 route-owned 行为基线；直接拆全局加载会触及缓存、新鲜度与返回导航，当前风险高于本切片。
- 后端架构 / 效率：运单总览已有 Controller → Query Service → Port 和角色/字段裁剪 E2E，但端口类型与模块 Provider 仍直接依赖巨型 `PrismaRepository`；用单一兼容适配器隔离遗留实现，价值明确且可零行为变化完成。
- 结论：`继续`后端依赖解耦；本轮只建立明确的遗留适配边界，不伪装成已完成 Prisma 查询拆分。
- 固定样本：管理员、业务员、客户、市场部、仓库访问 `/api/shipments`、`/api/market/shipments`、`/api/shipments/status-counts`、`/api/navigation/unread-badges`，锁定权限、站点范围、字段裁剪、`costScope` 和客户角标拒绝语义。

## GitHub 借鉴边界

- 参考 Vendure 官方插件文档中基于 NestJS Module 的 `imports/providers/controllers/exports` 稳定契约与 Provider 注册方式。
- Sunny 只借鉴稳定模块契约和适配边界；不复制代码，不采用电商模型、插件系统或 GraphQL，不改变现有 RBAC 与数据范围。

## 允许修改

- `apps/api/src/modules/shipment/overview/**`
- `apps/api/src/modules/shipment-overview-query.e2e.test.ts`
- `packages/shared/src/shipment.ts`
- `packages/shared/package.json`
- `config/architecture/module-boundaries.json`
- 与本切片直接相关的架构治理基线/测试
- 本状态文件

## 当前进度

- 已建立最新主干独立 worktree，并确认工作树初始干净。
- 已完成三类候选重评，选定运单总览兼容适配器切片。
- 运单总览 Port 已改用显式共享契约，不再通过 `PrismaRepository` 的 `ReturnType` 推导类型。
- `ShipmentOverviewModule` 已通过 `LegacyShipmentOverviewQueryRepository` 绑定窄端口；巨型仓储只允许在该适配器内出现。
- 新增 `@siyuan/shared/shipment` 子路径，未增加 Shared 根出口直接消费者。
- 架构门禁已从 `transitional-query-boundary` 收紧为 `compatibility-adapter`，阻止 Module/Port 回退到总仓储直连。

## 验证

- 迁移前：运单总览 Policy/Service/E2E 10/10 通过。
- 迁移后：适配器 + Policy/Service/E2E 11/11 通过；固定角色、站点范围、字段裁剪、`costScope` 和角标拒绝语义未变。
- Shared build、API typecheck、448 条路由架构检查、17 类架构自检、governance/context 与 `git diff --check` 全部通过。

## 交接

- 阻塞：无
- 剩余风险：兼容适配器仍委托巨型仓储；本轮目标是先消除上层直接依赖，后续在独立行为保护下再迁移 Prisma 查询实现。
- 用户验收目标：现有页面和全部运单总览功能无变化，底层依赖方向更清楚且架构门禁阻止回退。
- 效果证据：本地迁移前后同一固定样本 10/10 保持通过，迁移后连同适配器委托测试为 11/11。
- 安全证据：Shared build、API typecheck、448 route contracts、17 类门禁自检、治理与上下文检查通过。
- 未验证项：生产没有启用的客户账号；客户角标 403 继续由本地 E2E 锁定，未为采证写入生产账号。
- 发布状态：`已发布 47`
- 稳定附件：无
- 准确下一步：重新比较输入安全、前端 route-owned 数据流和真实 Prisma 查询拆分的收益/行为保护成本，选择下一原子切片。
- 建议新标题：`Sunny｜架构控制面快速落地｜04`
- 建议新状态文件：`docs/dev-now/architecture-control-plane-phase4-20260821.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。

## 合并与 47 发布

- GitHub PR `#17` 已合并，merge commit：`91f1795213481ec2896ed0348f0aa2ed6defeb22`；affected、API/Web/migrate 镜像和 release manifest 全部通过。
- 47 自动判定 `web+api`（Shared 包变更），未运行 migration/seed；发布 ID：`git-91f179521348_web-d69be09692d9_api-665d6723ba57`。
- 线上固定样本：四条未登录路径均 401；管理员运单 200/91 条、状态计数 200/19 键、角标 200/21 项；市场角色 200/46 条，站点越界 0、财务敏感键违规 0；业务角色访问市场运单 403，仓库角色访问运单 403。
- 四个运行时源码文件本地/47 SHA-256 完全一致；API/Web/Postgres/Redis 运行，公网 health 正常，近 15 分钟 API/Web 关键错误 0。
- provenance 为 `traceable/ok`，Git commit、不可变 Web/API 镜像、API release ID 一致；release lock `free`、recovery `clear`、Docker live-restore 与恢复单元正常。

## 阶段完成重评

- 本切片完成的是上层依赖隔离与防回退门禁，未声称巨型 Prisma 查询已经拆除。
- 全局优化目标仍继续；下一阶段必须重新取证后选择，不自动批量处理 230 个裸 `@Body()`，也不直接改前端缓存/刷新语义。
