# 代码瘦身治理第五十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜55`
- 续接自：`docs/dev-now/codebase-slimming-phase-54.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-55`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：删除本地与 47 都确认零生产调用的两个价格规则 GET 包装，不改规则金额、服务端查询或权限。
- 固定样本：旧 `ApiClient.pricingRules()` 与 `MarkupQueryClient.previewAgentMarkupRule(id)` 均只有定义；后者另有一组客户端路径测试。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、报价金额、数据库、写入、状态、审计、页面和提交载荷全部不变。

## 修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/api/markupQueryClient.ts`
- `apps/web/src/api/markupQueryClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-55.md`
- `.codex-state.md`

## 当前进度

- 精确调用表达式搜索确认两个方法在本地与 47 Web 生产源码中都没有调用；`pricingRules` 在测试桩中出现的是同名数据数组，不是客户端调用。
- 删除旧 `ApiClient.pricingRules()`、领域客户端 `previewAgentMarkupRule(id)`、仅后者使用的 Web `AgentMarkupPreviewResponse` 类型导入，以及对应预览客户端测试。
- 生产源码净减少 9 行，测试净减少 11 行，功能源码与测试合计净减少 20 行；没有新增替代包装。
- `createPricingRule`、规则启停、规则报价、加价规则列表与导出等生产入口继续保留；服务端列表和预览 GET 路由、规则计算与金额均未修改。

## 验证

- `apiClient.test.ts` 与 `markupQueryClient.test.ts` 经 Web 安全 runner 通过 4/4；两个已删除方法和 Web 专用预览类型在目标源码中均为 0；`git diff --check` 通过。
- 发布范围为 `web`；无 Shared、API、Prisma schema 或 migrations 变化，只构建并重启 Web，47 production build 通过。
- 47 `apiClient.ts` 候选与线上 SHA-256 均为 `0013fe47dcee168cec7172dade57c8432bb189166e05569c267994014dbc61e5`；`markupQueryClient.ts` 均为 `d5580ee2b55de26e6fe016ef2dceb52426e7e229c06ac9206056fa61d9717510`；相对备份仅包含两个目标删除。
- 47 源码中两个客户端方法均为 0，保留的创建规则与加价规则列表方法仍各存在 1；两个服务端 GET 路由各保留 1，未登录请求均保持 401“缺少登录凭证”。
- 相邻两次仅 Web 客户端减量构建中，主包由 `909.24 kB / gzip 261.79 kB` 降至 `909.10 kB / gzip 261.77 kB`；差异很小，不宣称可感知性能提升。
- Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `62%`；真正全仓减量约 `41%`；综合约 `52%`。
- 零调用客户端复扫后，剩余纯 GET 只有 `AuditQueryClient.loginLogs/accountEvents`，属于明确排除的审计边界；其余零调用 `ApiClient` 方法均为写入、财务、账号、状态或文件能力，继续保留。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-55`。
- 准确下一步：结束客户端零调用批次，转向全局 CSS 的静态死选择器扫描；只处理能够由完整类名搜索、本地/47 源码和构建共同证明零引用的窄批次，不做视觉调整。
