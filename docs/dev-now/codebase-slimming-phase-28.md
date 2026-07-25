# 代码瘦身治理第二十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜28`
- 续接自：`docs/dev-now/codebase-slimming-phase-27.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-28`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：扩展现有 `MasterDataChannelQueryController`，承接代理资料和代理渠道两个纯 GET，并保持真实代理身份边界不变。
- 固定样本：管理员和市场角色继续读取与完整主数据快照逐项一致的数组；业务角色即使被显式授予两个读取权限，也继续分别收到“业务角色不能查看真实代理资料/渠道”；客户和未登录继续被拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 Repository、代理或代理渠道写接口，不修改角色默认权限、数据库、前端、共享契约或视觉。

## 修改

- `apps/api/src/modules/master-data/channel/master-data-channel-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/rbac.ts`
- `apps/api/src/modules/master-data-channel-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-28.md`
- `.codex-state.md`

## 当前进度

- 已把两个 GET 的原权限装饰器、业务角色显式拒绝、原错误文案和同一 `getMasterData()` 数组返回原样迁入现有主数据查询 Controller。
- 为避免复制权限逻辑，已把 `isSalesScopedRole` 和 `isBusinessAgentRestrictedRole` 从巨型 Controller 等量提取到 `rbac.ts`；完整主数据快照与新领域 Controller 共用同一判断。
- 代理、代理渠道所有新增、修改、启停、删除和批量写接口继续留在 `DataController`，Repository、数据库和审计未改。
- 已扩展 E2E，覆盖管理员响应与快照逐项相等、市场允许、客户拒绝，以及业务角色显式授权后仍被两条原文案拒绝。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/master-data-channel-query.e2e.test.ts`，1 个文件 3/3。
- 已通过：`git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 两个目标 GET 在 `DataController` 中均为 0，在 `MasterDataChannelQueryController` 中各为 1；Nest 启动映射合计为 2。
- 已通过：47 管理员两个直接响应与完整主数据快照对应数组逐项相等；市场角色两个接口均为 200。
- 已通过：47 当前业务角色两个直接接口均为 403“没有访问权限”，完整快照的 `agents/agentChannels` 均继续为空；客户两个路径均为 403，未登录为 401。
- 已通过：API/Web 容器正常，公网 health 为 200，API 实际错误日志为 0。

## 治理效果

- `DataController` 再减少 35 行；两个角色判断从 Controller 移入统一 RBAC 模块，避免新查询 Controller 复制敏感权限逻辑。
- 运行时代码因跨模块导入净增加 1 行；角色与字段契约测试净增加 67 行。本阶段改善模块边界和权限单一来源，不宣称性能提升或全仓代码量下降。
- 返回数组、代理字段、排序、角色默认权限、写入结果和审计日志均未改变。

## 交接

- 阻塞：无。
- 剩余风险：主数据查询 Controller 仍直接读取完整 `getMasterData()` 快照后取数组，尚未形成按领域查询的 Repository；代理资料本身属于敏感数据，后续不得仅凭菜单权限扩大读取角色。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-28`。
- 准确下一步：把待审核列表、已删除审核列表和审核详情三个纯 GET 迁入新的 `ShipmentReviewQueryController`；原权限、业务/团队数据范围、财务字段裁剪和缺失运单错误文案必须保持不变，审核通过/驳回/删除/恢复等写接口继续留在原处。
