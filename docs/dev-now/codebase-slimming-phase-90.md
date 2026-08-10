# Sunny｜底层架构瘦身·在仓分页｜01

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构瘦身·在仓分页｜01`
- 续接自：代码库瘦身 Phase 89（在仓汇总轻量接口）
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`codebase-slimming-phase-90`
- 分支：`codex/codebase-slimming-phase-90`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-90`
- 认领时间：`2026-08-10 15:45 Asia/Shanghai`

## 输入摘要

- 目标：按 Twenty、Vendure、Cal.com 的模块化单体思路，从一个代表链路开始，把“仓库管理 → 在仓数据”从全量加载改为模块内服务端分页和轻量汇总读取。
- 不做：本轮不拆微服务、不改数据库结构、不改仓库写操作、状态机和权限模型，也不全局拆分巨型 Repository。

## 允许修改

- `packages/shared/src/warehouse.ts`
- `apps/api/src/modules/warehouse/inventory/**`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/prisma.repository.ts`（仅仓租按包裹 ID 过滤）
- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/apiClient.ts`
- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- 对应定向测试与本状态文件

## 当前进度

- 已增加 `/warehouse/in-stock-page`，页面行使用 `skip/take`，全量汇总只读取 10 个窄字段。
- 已把分页查询收口到 `WarehouseInventoryQueryController → Service → Repository`，权限能力通过模块 Authorizer 端口接入。
- 前端在仓页只加载当前页；旧 `/warehouse/in-stock` 保留给兼容调用及用户主动全量导出。
- 仓租辅助查询限定为当前页包裹 ID，避免分页后仍隐式加载全仓仓租明细。
- 当前页包裹先解析仓租组键，再加载完整组成员，避免同组跨页导致仓租金额漂移。
- 已封堵 `dataScope=ALL` 绕过客户归属的旧缺口：业务角色始终按客户归属过滤并裁剪站点，前端移除无授权的全仓切换。
- 服务端分页后表格全选语义明确为“全选本页”；未勾选批量下载仍按旧语义下载当前筛选全部结果。

## 验证

- 已通过：Shared/API/Web 类型检查。
- 已通过：API Repository、Service、E2E、汇总及仓租跨页组定向测试共 13 项。
- 已通过：Web 查询客户端、仓租参数序列化和 WarehousePage 加载定向测试共 15 项。
- 已通过：`git diff --check`。
- 已完成：`sunny_risk_reviewer` 专项审查提出的 2 项 P1 均已修复；复核确认无新的 P0/P1/P2 发布阻断。

## 交接

- 阻塞：无
- 剩余风险：每次翻页仍会读取全量窄字段计算汇总，复杂度仍为 O(N)；服务端全字段排序契约尚未落地，当前表头排序只作用于当页。
- 用户验收目标：进入“仓库管理 → 在仓数据”时首屏仅返回一页，翻页按页请求，顶部统计和总条数保持准确，筛选、详情、导出和权限不回退。
- 效果证据：定向页面测试证明在仓工作区调用 `warehouseInStockPage({ page: 1, pageSize: 10 })` 且不调用旧全量接口；E2E 证明分页 totals/totalItems 与旧接口一致且客户角色被拒绝。
- 安全证据：业务角色即使传 `dataScope=ALL`，Repository 测试仍证明客户归属条件进入数据库 where 且响应移除 site；客户角色对新接口为 403；API 与 Web 类型检查通过。
- 未验证项：47 真实数据下响应体积、耗时、容器与日志。
- 发布状态：`未发布`
- 稳定附件：无
- 准确下一步：完成风险审查后按 API + Web + Shared 白名单发布 47，并对比旧/新接口 totals、totalItems、响应体积和耗时。
- 建议新标题：`Sunny｜底层架构瘦身·运单查询｜01`
- 建议新状态文件：`docs/dev-now/codebase-slimming-shipment-query-01.md`
- 接手要求：当前状态完成后，下一阶段优先迁移运单列表查询，不扩大本阶段文件范围。
