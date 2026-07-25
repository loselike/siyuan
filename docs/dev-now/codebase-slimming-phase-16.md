# 代码瘦身治理第十六阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜16`
- 续接自：`docs/dev-now/codebase-slimming-phase-15.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`用户明确要求复扫、结束兼容窗口、统一删除并继续扫描`
- 会话 slug：`codebase-slimming-phase-16`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：复扫旧报价和迪拜共六个兼容入口；确认本地与 47 生产零调用后结束兼容窗口，删除转发方法和对应兼容测试；继续扫描下一个可扩展现有客户端的多 GET 窄领域。
- 固定样本：报价页面继续通过 `PriceBookQueryClient` 读取旧报价元数据、迪拜当前展示和展示版本，线上路径、权限和响应不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改领域客户端 GET 实现；不修改后端、共享契约、写接口、状态流转、页面结构或视觉。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-15.md`
- `docs/dev-now/codebase-slimming-phase-16.md`
- `.codex-state.md`

## 当前进度

- 复扫确认：本地和 47 生产源码中六个旧 `ApiClient` 方法直接调用均为 0。
- 已删除六个兼容转发、两组兼容测试和三个不再需要的类型导入。
- 领域客户端与 `PricingPage` 调用保持不动。
- 定向测试 2 个文件共 8/8 通过；首次安全测试命令因重复传入 worker 参数未启动测试，随后使用安全 runner 默认单 worker 参数成功。

## 下一窄切片扫描

- 已检查现有 `AppShellClient`、`AuditQueryClient`、`CarrierTaskQueryClient`、`MarkupQueryClient`、`PriceBookQueryClient`、`SystemDirectoryClient` 和 `WarehouseQueryClient`。
- 当前没有同时满足“多个仍在生产使用的纯 GET、可扩展现有客户端、避开财务/账号/状态流转/审计实现”的新切片。
- 最接近候选是 `PriceBookQueryClient` 下的南非费率规则读取，但当前只有一个生产 GET 方法；不为凑数量迁移零调用方法。
- 仓库理货历史链有两个页面调用，但其中一个位于财务录单页面，且第十二阶段已明确保留；本阶段不扩大边界。

## 验证

- 已通过：本地 `git diff --check`；本地和 47 生产源码六个旧方法、六个旧生产调用均为 0。
- 已通过：`PriceBookQueryClient` 与剩余 `ApiClient` 网关测试，2 个文件共 8/8。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物继续包含六个 GET 路径，领域客户端六个方法和页面三个调用均保留。
- 已通过：47 管理员旧报价元数据、历史价格源、健康报告、迪拜价格表、当前展示和展示版本六个查询均为 200 且响应结构正确；未登录元数据查询仍为 401“缺少登录凭证”。
- 已通过：47 远端独有的迪拜 Blob 图片、展示版本写操作、海运加价及历史价格源写方法共八个均保留；未发现鉴权旁路环境变量。
- 已通过：47 Web 容器、容器内首页与 API health、公网 8899 首页与 API health 均为 200，Web 错误日志计数为 0。

## 交接

- 阻塞：无。
- 剩余风险：仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-16`。
- 准确下一步：暂不迁移单个南非费率规则 GET；继续等待或扫描能与其组成至少两个生产 GET 的同领域切片。若放宽“多 GET”约束，则下一阶段可迁移 `southAfricaRateRules` 的两个页面调用。
