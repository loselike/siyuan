# 架构控制面快速落地

- 状态：`in_progress`
- 会话标题：`Sunny｜架构控制面快速落地｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`architecture-reset-control-plane-20260820`
- 分支：`codex/architecture-reset-control-plane-20260820`
- worktree：`/Users/j1ng/Tools/sunny-architecture-reset-control-plane-20260820`
- 认领时间：`2026-08-20 22:01 Asia/Shanghai`

## 输入摘要

- 目标：快速落地收益最高的底层优化，以共享权限契约、架构门禁和一个真实领域 Module 为首批代表切片。
- 行为保护：业务流程、界面、字段、路由、请求/响应、权限、数据范围、状态、金额、审计和异常语义不得改变；无法证明等价的事项停止并请求用户确认。
- 不做：不一次性重写巨型 Repository、DataController、App.tsx 或 ApiClient；不修改数据库 schema、生产数据、权限模型与业务口径；不触碰其他会话工作树。

## 允许修改

- `packages/shared/src/permissions.ts`
- `packages/shared/package.json`
- `apps/api/src/modules/rbac.ts`
- `apps/web/src/apiClient.ts`
- `apps/api/src/modules/finance/catalog/**`
- `apps/api/src/modules/app.module.ts`
- `scripts/check-architecture-governance.mjs`
- `config/architecture/governance-baseline.json`
- 与上述切片直接相关的定向测试和本状态文件

## 当前进度

- 已从 `origin/main@ec9e271e` 建立独立 worktree，根工作树与其他会话保持隔离。
- Shared 已成为 `PermissionKey` 唯一类型来源；API `rbac.ts` 与 Web `apiClient.ts` 保留兼容 re-export，现有导入路径不变。
- FinanceCatalog、ShipmentOverview、SystemDirectory 已从根模块直接装配迁入独立 Nest Module；FinanceCatalog/SystemDirectory 使用真实 Prisma Adapter，ShipmentOverview 明确保留过渡 facade。
- 架构门禁已阻止第二个 `PermissionKey` 定义，并冻结裸 `@Body()` 债务不再高于 230；模块依赖方向纳入 boundary 检查。
- 第一切片复评：安全/数据正确性候选中的输入校验会改变既有非法请求行为，按用户要求暂不猜测；高频前端数据流风险更高；因此继续选择后端只改装配的模块化切片，并在三个代表模块通过后停止扩大本轮范围。

## 验证

- FinanceCatalog 允许/拒绝、响应、写入和审计 E2E 1/1；Prisma/InMemory repository contract 4/4。
- ShipmentOverview service/policy/E2E 10/10；SystemDirectory 允许/拒绝 E2E 与 Prisma repository 4/4。
- Shared/API/Web 全量 typecheck 通过；architecture 448 路由契约与 governance/security 通过；`git diff --check` 通过。

## 交接

- 阻塞：无
- 剩余风险：47 当前 provenance mismatch，发布前必须重新读取线上发布状态并取得全局锁；若仍不可信，不能覆盖并发远端变化。ShipmentOverview 的窄 port 仍通过巨型 PrismaRepository facade 实现，属于已记录过渡债务。
- 用户验收目标：系统业务流、界面与功能完全不变，但新增开发不能继续制造重复权限类型、裸写接口和根模块直接装配债务。
- 效果证据：FinanceCatalog、ShipmentOverview、SystemDirectory 共 19 条定向断言通过，原 URL、角色允许/拒绝、响应、审计与只读投影保持。
- 安全证据：三端类型检查、448 路由架构门、PermissionKey 唯一来源门、230 裸 Body 上限与安全契约通过。
- 未验证项：47 线上尚未发布验证。
- 发布状态：`未发布`
- 稳定附件：无
- 准确下一步：完成最终差异审查与提交，然后按发布锁和 provenance 规则尝试精确发布 API/Web/shared 候选。
- 建议新标题：`Sunny｜架构控制面快速落地｜02`
- 建议新状态文件：`docs/dev-now/architecture-reset-control-plane-20260820-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
