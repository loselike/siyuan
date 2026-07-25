# 代码瘦身治理第十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜11`
- 续接自：`docs/dev-now/codebase-slimming-phase-10.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续下一步）`
- 会话 slug：`codebase-slimming-phase-11`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：记录价格表五个兼容入口的零调用状态，并把代理加价规则列表、单条预览和导出三个纯 GET 查询迁入一个 `MarkupQueryClient`。
- 固定样本：报价管理加载代理加价规则与导出时继续生成完全相同的查询参数、路径和返回结果。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不迁移加价规则新增、修改、删除、批量操作、导入、线路预览或阶梯写入；不改后端、共享契约、页面结构和视觉；兼容窗口内保留旧 `ApiClient` 方法转发。

## 兼容零调用清单

| 领域 | 旧兼容方法 | 本地生产直接调用 | 47 生产直接调用 |
| --- | --- | ---: | ---: |
| Price Book Query | `priceBooks`、`priceBookRows`、`pricingSyncHealth`、`priceBookRuleRefreshProgress`、`priceBookImportJob` | 0 | 0 |

## 扫描结论

- 本阶段选择：`agentMarkupRules`、`previewAgentMarkupRule`、`exportAgentMarkupRules`。
- 三个入口均为 GET，后端原权限分别为 `pricing:markup:read`、`pricing:markup:preview`、`pricing:markup:export`；Repository、数据范围和返回裁剪保持不动。
- 生产调用集中在 `PricingPage.tsx`；列表与导出共享相同的 `AgentMarkupListQuery` 参数序列化。
- 暂缓 `markupRoutes`：47 当前代码已包含该独立线路分页查询，但本地分支基线尚未包含对应实现；本阶段不覆盖或回退远端新增能力。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/markupQueryClient.ts`
- `apps/web/src/api/markupQueryClient.test.ts`
- `apps/web/src/modules/pricing/PricingPage.tsx`
- `docs/dev-now/codebase-slimming-phase-10.md`
- `docs/dev-now/codebase-slimming-phase-11.md`

## 当前进度

- 已完成新一轮只读扫描并收敛到三个代理加价规则 GET 查询。
- 已新增 `MarkupQueryClient`，集中承接代理加价规则列表、单条预览和导出三个 GET 查询；列表与导出共用同一套原始参数序列化。
- `PricingPage.tsx` 的全部生产调用已迁入领域客户端；三个旧 `ApiClient` 方法保留原签名兼容转发，生产直接调用复扫为 0。
- 本地 `apiClient.ts` 从 1848 行降至 1840 行，减少 8 行；47 当前版本从 2065 行降至 2057 行。
- 47 当前已有的 `markupRoutes`、批量阶梯写入和其他新增能力均保持不动；本轮未修改任何加价规则写接口、后端、共享契约、权限、页面结构或业务交互。

## 验证

- 已通过：`MarkupQueryClient` URL/查询参数/返回值/错误透传测试与旧方法兼容转发测试，2 个文件共 7/7。
- 已通过：新增领域客户端及其测试 ESLint；`git diff --check`。
- 已通过：完整 Web typecheck 未出现本阶段错误，仍只受既有 `ReceivableAudit.filterOptions` 和仓库测试桩 `tallyStatus` 类型错误阻塞。
- 已通过：本地与 47 生产源码三个旧方法生产直接调用均为 0；47 源码 checksum 与远端当前文件基线候选一致。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物包含 `markupQuery` 标记，启动后错误日志计数为 0。
- 已通过：47 管理员加价规则列表和导出均为 200；使用 `detail=true` 返回的真实规则 ID 查询预览为 200，响应保持 `rule`、`scope`、`stats` 结构；未登录列表仍为 401“缺少登录凭证”。
- 已通过：47 Web 容器、容器内 API health、公网 8899 首页和 API health。

## 交接

- 阻塞：无。
- 剩余风险：价格表五个和加价规则三个旧方法仍处于兼容窗口；仓库外未纳管消费者无法由本仓与 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-11`。
- 准确下一步：把三个加价规则旧入口加入零调用清单；下一阶段优先扫描并扩展现有领域客户端，而不是继续增加微型客户端，兼容窗口结束后统一删除这八个转发和两组兼容测试。
