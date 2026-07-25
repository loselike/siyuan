# 代码瘦身治理第十四阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜14`
- 续接自：`docs/dev-now/codebase-slimming-phase-13.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确指定实施范围）`
- 会话 slug：`codebase-slimming-phase-14`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：扩展现有 `PriceBookQueryClient`，承接迪拜价格表、当前展示和展示版本三个 JSON GET 查询；迁移 `PricingPage` 两个生产调用。
- 固定样本：进入迪拜查价时读取当前展示，以及进入迪拜价格表管理时读取展示版本，继续使用相同路径、权限和响应。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不迁移图片 Blob 下载；不修改激活、重试、海运加价等写方法；不改后端、共享契约、页面结构或视觉。

## 允许修改

- `apps/web/src/api/priceBookQueryClient.ts`
- `apps/web/src/api/priceBookQueryClient.test.ts`
- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/modules/pricing/PricingPage.tsx`
- `docs/dev-now/codebase-slimming-phase-13.md`
- `docs/dev-now/codebase-slimming-phase-14.md`

## 当前进度

- 已在现有 `PriceBookQueryClient` 中加入三个迪拜 JSON GET 查询，没有新增客户端。
- `PricingPage` 的当前展示和展示版本两个生产调用已迁移。
- 三个旧 `ApiClient` 方法保留原签名兼容转发；激活、重试、Blob 图片请求和其他写方法保持不动。
- 本地和 47 生产源码中三个旧入口直接调用均为 0；47 远端独有的图片 Blob、海运加价和版本操作增量均已保留。

## 兼容零调用清单

| 领域 | 旧兼容方法 | 本地生产直接调用 | 47 生产直接调用 |
| --- | --- | ---: | ---: |
| Dubai Price Query | `dubaiPriceTable`、`dubaiPriceDisplay`、`dubaiPriceDisplayVersions` | 0 | 0 |

## 验证

- 已通过：`PriceBookQueryClient` 路径/返回值测试和 `ApiClient` 兼容转发测试，2 个文件共 8/8。
- 迪拜整页定向测试 30 秒内没有产生结果，已按安全规则停止且未重试；47 production Docker build 已通过，证明页面与领域客户端调用可编译。
- 完整 Web typecheck 未出现本阶段错误，仍只受既有 `ReceivableAudit.filterOptions` 和仓库测试桩 `tallyStatus` 类型错误阻塞。
- 已通过：`git diff --check`；本地与 47 生产源码三个旧方法直接调用均为 0。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物保留三个路径标记和领域客户端调用标记，启动后错误日志计数为 0。
- 已通过：47 管理员迪拜价格表、当前展示和展示版本三个查询均为 200，响应分别保持 `air/sea`、`airPages/seaPages`、`versions` 结构；未登录当前展示查询仍为 401“缺少登录凭证”。
- 已通过：47 Web 容器、容器内 API health、公网 8899 首页和 API health；未发现鉴权旁路环境变量。

## 交接

- 阻塞：无。
- 剩余风险：三个旧方法仍处于兼容窗口；仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖；迪拜整页定向测试本轮无完成结果。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-14`。
- 准确下一步：继续扫描可扩展现有客户端的多 GET 窄切片；兼容窗口结束并再次确认零调用后删除三个旧转发和本阶段兼容测试。
- 已交接至：`docs/dev-now/codebase-slimming-phase-15.md`
