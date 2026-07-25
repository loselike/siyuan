# 代码瘦身治理第十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜17`
- 续接自：`docs/dev-now/codebase-slimming-phase-16.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`Annotation 1 明确要求继续，视为放宽多 GET 约束`
- 会话 slug：`codebase-slimming-phase-17`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把南非费率规则单个生产 GET 迁入现有 `PriceBookQueryClient`，迁移 `PricingPage` 两处调用，旧 `ApiClient` 方法保留兼容转发。
- 固定样本：报价页初始化和南非费率规则刷新继续读取 `/pricing/south-africa/rules`，响应、权限和错误处理不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不迁移南非查价 POST、费率规则写方法或图片接口；不修改后端、共享契约、页面结构或视觉。

## 允许修改

- `apps/web/src/api/priceBookQueryClient.ts`
- `apps/web/src/api/priceBookQueryClient.test.ts`
- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/modules/pricing/PricingPage.tsx`
- `docs/dev-now/codebase-slimming-phase-16.md`
- `docs/dev-now/codebase-slimming-phase-17.md`
- `.codex-state.md`

## 当前进度

- `PriceBookQueryClient` 已加入 `southAfricaRateRules`，保持原 GET 路径。
- `PricingPage` 两处生产调用已迁移。
- 旧 `ApiClient.southAfricaRateRules` 保留原签名兼容转发。

## 兼容零调用清单

| 领域 | 旧兼容方法 | 本地生产直接调用 | 47 生产直接调用 |
| --- | --- | ---: | ---: |
| South Africa Pricing Query | `southAfricaRateRules` | 0 | 0 |

## 验证

- 已通过：`PriceBookQueryClient` 路径和返回值测试，以及 `ApiClient` 兼容转发测试；2 个文件共 10/10。
- 已通过：`git diff --check`；本地与 47 生产源码旧入口直接调用均为 0，`PricingPage` 保留两个领域客户端调用。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物保留南非费率规则路径标记，五个南非写/查价方法均未改。
- 已通过：47 管理员南非费率规则查询为 200 且 `rules` 结构正确；客户角色仍为 403“没有访问权限”，未登录仍为 401“缺少登录凭证”。
- 已通过：47 Web 容器、容器内首页与 API health、公网 8899 首页与 API health 均为 200，Web 错误日志计数为 0，未发现鉴权旁路环境变量。

## 交接

- 阻塞：无。
- 剩余风险：旧 `ApiClient.southAfricaRateRules` 仍处于兼容窗口；仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-17`。
- 准确下一步：兼容窗口结束后再次复扫并删除旧转发和对应兼容测试；继续扫描可扩展现有客户端的纯 GET。
