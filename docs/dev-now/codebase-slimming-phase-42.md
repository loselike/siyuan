# 代码瘦身治理第四十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜42`
- 续接自：`docs/dev-now/codebase-slimming-phase-41.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续真实减量
- 会话 slug：`codebase-slimming-phase-42`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：删除两套巨型 Repository 中本地和 47 生产均为零调用的私有函数，不新增适配层或共享包装。
- 固定样本：后端查价实际重量档、业务员内部价格字段裁剪、渠道自定义备注隔离和价格行管理继续使用现行实现。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-42.md`
- `.codex-state.md`

## 当前进度

- 删除 `filterPriceBookRowsByAgentMarkupModule`、`buildLegacyModuleCountsByFile`、`inferAmazonWeightBandFromLegacyRows`、两份 `attachCustomRemarksToPriceLookup`、内存版 `redactPriceBookRowsResponse`、`inMemoryLegacyChannelMatches`、`inferAmazonWeightBandFromPriceRows` 和 `agentChannelCustomRemarkMap`，共九个零调用定义。
- 本地、47 发布前均通过全 API 源码词边界搜索确认，除定义本身外无调用、无导出、无测试直接引用。
- Prisma 中仍有生产调用的 `redactPriceBookRowsResponse` 保留不动；内存版零调用副本已删除。
- 本地 `PrismaRepository` 由 19,008 行降至 18,939 行，减少 69 行；`InMemoryRepository` 由 14,639 行降至 14,572 行，减少 67 行。
- 本阶段没有新增运行时包装或测试代码，生产源码与全仓功能代码均净减少 136 行。47 两套 Repository 亦各减少 69/67 行。
- 删除的是不可达实现，不改变查询、匹配、加价、裁剪或数据库访问，不宣称性能提升。

## 验证

- 已通过：后端查价并裁剪业务员内部成本字段、供应商最高实际 KG 档、各查价模块不暴露渠道自定义备注三个固定样本 3/3。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- API 全量 typecheck 仍有当前基线 15 个错误，本阶段未新增未使用导入或新错误。
- 三个扩大价格表 E2E 在当前变更和变更前提交 `8456dd5` 上均以相同原因失败：模块隔离样本返回 400、独立 legacy 代理行数断言不符、虚拟代理删除成功数为 0；已证明为既有基线，未通过本阶段改动修复。
- 已从 47 当前源码应用两文件白名单删除补丁，只重建/重启 API，无 Prisma 迁移；production build 通过。
- 47 八个被删函数名的九个定义全部为 0，现行 Prisma 价格行裁剪函数保持 1 定义/1 调用。
- 47 管理员加价规则 200/20，按有效代理读取价格行 200/100 且保留分页，旧报价元数据 200；未登录保留 401“缺少登录凭证”。
- API/Web 容器正常，容器内、宿主实际端口 18899 和公网 `/api/health` 均为 200，API 实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `53%`；真正全仓减量约 `30%`。本阶段是无新增抽象的纯删除。
- 剩余主项：`PrismaRepository`、`InMemoryRepository`、全局 CSS 和 shared contracts 仍是主要巨型边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和多个工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-42`。
- 准确下一步：继续扫描单个 Repository 内零调用的私有函数和两套实现的完全等价函数簇；先做纯删除，再做无副作用共享，继续避开财务、账号、状态流转和审计实现。
