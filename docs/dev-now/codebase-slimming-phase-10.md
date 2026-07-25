# 代码瘦身治理第十阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜10`
- 续接自：`docs/dev-now/codebase-slimming-phase-9.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续高密度纯只读领域拆分）`
- 会话 slug：`codebase-slimming-phase-10`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把价格表领域内五个高频纯 GET 查询迁入一个 `PriceBookQueryClient`，减少 `ApiClient` 中的参数拼装代码并迁移全部生产调用方。
- 固定样本：价格表列表、线路分页、同步健康、规则刷新进度和导入任务轮询继续生成完全相同的 URL，并原样返回响应或错误。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不迁移导入、删除、备注更新、规则刷新或其他写方法；不改后端、共享契约、页面结构和视觉；兼容窗口内保留旧 `ApiClient` 方法转发。

## 扫描结论

- 选择范围：`priceBooks`、`priceBookRows`、`pricingSyncHealth`、`priceBookRuleRefreshProgress`、`priceBookImportJob`。
- 五个入口均为 GET，后端继续使用原权限和 Repository 数据范围；生产调用集中在 `PricingPage.tsx` 与 `MarkupRouteEditor.tsx`。
- `downloadPriceBook` 虽为 GET，但使用独立 Blob 下载、鉴权头和错误解析链路，本阶段不混入普通 JSON 查询客户端。
- 价格表导入、启停、删除、备注、规则刷新和导入任务创建均保持不动。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/priceBookQueryClient.ts`
- `apps/web/src/api/priceBookQueryClient.test.ts`
- `apps/web/src/modules/pricing/PricingPage.tsx`
- `apps/web/src/modules/pricing/MarkupRouteEditor.tsx`
- `docs/dev-now/codebase-slimming-phase-9.md`
- `docs/dev-now/codebase-slimming-phase-10.md`

## 当前进度

- 已完成高密度只读领域扫描并收敛到五个相互关联的价格表查询。
- 已新增 `PriceBookQueryClient`，集中承接价格表列表、线路分页、同步健康、规则刷新进度和导入任务轮询五个 GET 查询。
- `PricingPage.tsx` 与本地分支的 `MarkupRouteEditor.tsx` 已迁入领域客户端；五个旧 `ApiClient` 方法暂时保留原签名转发，生产直接调用复扫为 0。
- 本地 `apiClient.ts` 从 1862 行降至 1848 行，减少 14 行；47 当前版本从 2079 行降至 2065 行。47 的 `MarkupRouteEditor.tsx` 已在其他增量中改用 `markupRoutes`，原本就没有本阶段五个旧入口调用，因此发布时没有覆盖该远端文件。
- 本轮未修改下载、导入、删除、备注更新、规则刷新、后端、共享契约、权限、数据范围、页面结构或业务交互。

## 验证

- 已通过：`PriceBookQueryClient` URL/参数/返回值/错误透传测试与旧方法兼容转发测试，2 个文件共 7/7。
- 已通过：新增领域客户端及其测试 ESLint；`git diff --check`。
- 已通过：完整 Web typecheck 不再出现本阶段错误，仍只受既有 `ReceivableAudit.filterOptions` 和仓库测试桩 `tallyStatus` 类型错误阻塞。
- 页面级价格表测试 30 秒未产生结果，已按测试安全规则停止且未重试；以更小的查询契约测试、类型检查和 47 production build 作为等价安全门。
- 已通过：本地与 47 生产源码旧五方法生产直接调用均为 0；47 源码 checksum 与远端当前文件基线候选一致。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物包含 `priceBookQuery` 标记，启动后错误日志计数为 0。
- 已通过：47 管理员价格表列表、带真实价格表 ID 的线路分页、同步健康、规则刷新进度均为 200；线路分页保持 `rows` 数组和 `pagination` 对象，未登录价格表列表仍为 401“缺少登录凭证”。无价格表或代理范围的全局线路请求仍按既有业务保护返回 400。
- 已通过：47 Web 容器、容器内 API health、公网 8899 首页和 API health。

## 交接

- 阻塞：无。
- 剩余风险：五个旧方法仍处于兼容窗口，尚未形成代码净删除；仓库外未纳管调用方无法由本仓扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-10`。
- 准确下一步：把这五个旧入口加入生产零调用清单；继续扫描另一个包含多个纯 GET 的窄领域，兼容窗口结束后再单独删除转发和兼容测试。
