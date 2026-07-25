# 代码瘦身治理第十三阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜13`
- 续接自：`docs/dev-now/codebase-slimming-phase-12.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确确认兼容窗口结束条件）`
- 会话 slug：`codebase-slimming-phase-13`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：复扫价格表五个、加价规则三个、仓库四个旧兼容入口；本地与 47 生产源码均为零调用后，统一删除十二个转发和三组兼容测试。
- 固定样本：价格表、加价规则和仓库理货页面继续通过现有领域客户端发出相同请求并原样处理响应。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改领域客户端、页面调用、后端、共享契约、财务、账号写入、状态流转、审计实现或视觉；不删除仍有生产调用的方法。

## 复扫结论

- 本地和 47 生产源码中十二个 `ApiClient` 旧入口的直接调用均为 0。
- 同名局部状态变量和测试桩变量不是 `ApiClient` 调用；领域客户端调用保持不变。
- 仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖，属于兼容入口删除后的剩余风险。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-12.md`
- `docs/dev-now/codebase-slimming-phase-13.md`

## 当前进度

- 已完成本地和 47 生产源码复扫，十二个旧入口均为零生产调用。
- 已删除十二个旧转发、三组兼容测试和仅由这些转发使用的类型导入。
- 领域客户端、页面调用、API 契约和业务逻辑保持不动。
- 本地 `apiClient.ts` 从 1833 行降至 1773 行，减少 60 行；`apiClient.test.ts` 从 122 行降至 15 行，减少 107 行。
- 47 当前版本从 2050 行降至 1990 行，保留远端已有的 `markupRoutes`、批量阶梯写入、重复理货统计和水单站点等增量。

## 验证

- 已通过：价格表、加价规则、仓库领域客户端和 `ApiClient` 网关四个定向测试文件，共 17/17。
- 已通过：`git diff --check`；删除后十二个旧方法定义为 0，生产页面仍通过 `priceBookQuery`、`markupQuery`、`warehouseQuery` 调用。
- 完整 Web typecheck 未出现本阶段错误，仍只受既有 `ReceivableAudit.filterOptions` 和仓库测试桩 `tallyStatus` 类型错误阻塞。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；线上源码十二个旧入口定义为 0，三个领域客户端属性及静态产物标记均保留。
- 已通过：47 管理员价格表列表、加价规则列表和仓库理货任务查询均为 200，响应结构保持有效；未登录理货任务查询仍为 401“缺少登录凭证”。
- 已通过：47 Web 容器、容器内 API health、公网 8899 首页和 API health；Web 启动后错误日志计数为 0，未发现鉴权旁路环境变量。

## 交接

- 阻塞：无。
- 剩余风险：仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖；完整 Web typecheck 的既有错误仍需另行治理。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-13`。
- 准确下一步：扫描另一个包含多个纯 GET 查询、且可扩展现有领域客户端的窄切片；继续避开财务、账号写入、状态流转和审计实现。
- 已交接至：`docs/dev-now/codebase-slimming-phase-14.md`
