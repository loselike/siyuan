# 代码瘦身治理第十五阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜15`
- 续接自：`docs/dev-now/codebase-slimming-phase-14.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（Annotation 1 明确要求继续实施）`
- 会话 slug：`codebase-slimming-phase-15`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：扩展现有 `PriceBookQueryClient`，承接旧报价元数据、历史价格源和健康报告三个 GET 查询；迁移 `PricingPage` 一个生产调用。
- 固定样本：进入报价查价页面时读取旧报价元数据，继续使用相同路径、权限、客户角色拒绝逻辑和响应。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不迁移旧报价 POST；不修改历史价格源导入、删除或重建；不改后端、共享契约、页面结构或视觉。

## 允许修改

- `apps/web/src/api/priceBookQueryClient.ts`
- `apps/web/src/api/priceBookQueryClient.test.ts`
- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/modules/pricing/PricingPage.tsx`
- `docs/dev-now/codebase-slimming-phase-14.md`
- `docs/dev-now/codebase-slimming-phase-15.md`
- `.codex-state.md`

## 当前进度

- 已在现有 `PriceBookQueryClient` 中加入三个旧报价 GET 查询，没有新增客户端。
- `PricingPage` 的旧报价元数据生产调用已迁移。
- 三个旧 `ApiClient` 方法保留原签名兼容转发；旧报价 POST 和历史价格源写方法保持不动。
- 本地与 47 生产源码中三个旧入口直接调用均为 0；47 远端独有的 Blob 图片、展示版本操作和海运加价方法均已保留。

## 兼容零调用清单

| 领域 | 旧兼容方法 | 本地生产直接调用 | 47 生产直接调用 |
| --- | --- | ---: | ---: |
| Legacy Pricing Query | `legacyPricingMeta`、`legacyPricingSources`、`legacyPricingHealth` | 0 | 0 |
| Dubai Price Query | `dubaiPriceTable`、`dubaiPriceDisplay`、`dubaiPriceDisplayVersions` | 0 | 0 |

## 验证

- 已通过：`PriceBookQueryClient` 路径、参数和返回值测试，以及 `ApiClient` 兼容转发测试；2 个文件共 10/10。
- 已通过：`git diff --check`；本地与 47 生产源码三个旧方法直接调用均为 0，`PricingPage` 只保留一个领域客户端调用。
- 完整 Web typecheck 未出现本阶段错误，仍只受既有 `ReceivableAuditPage.filterOptions` 和仓库测试桩 `tallyStatus` 类型错误阻塞。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物包含三个 GET 路径标记，启动后错误日志计数为 0，未发现鉴权旁路环境变量。
- 已通过：47 管理员旧报价元数据、历史价格源和健康报告三个查询均为 200，响应结构分别保持 `modules/agents/origins/warehouseCodes/tiers`、`sources`、`module/rowCount/issues`；未登录元数据查询仍为 401“缺少登录凭证”。
- 已通过：47 Web 容器、容器内首页与 API health、公网 8899 首页与 API health 均为 200。

## 交接

- 阻塞：无。
- 剩余风险：三个旧报价兼容方法与三个迪拜兼容方法仍处于兼容窗口；仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖；完整 Web typecheck 仍有既有基线错误。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-15`。
- 准确下一步：继续扫描可扩展现有客户端的多 GET 窄切片；兼容窗口明确结束后再次复扫，再批量删除零调用转发和对应兼容测试。
- 已交接至：`docs/dev-now/codebase-slimming-phase-16.md`
