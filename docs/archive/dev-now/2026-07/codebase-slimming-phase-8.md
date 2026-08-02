# 代码瘦身治理第八阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜08`
- 续接自：`docs/dev-now/codebase-slimming-phase-7.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求转去另一个纯只读领域并建立兼容入口生产调用清单）`
- 会话 slug：`codebase-slimming-phase-8`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把承运商任务列表 GET 查询迁入独立查询客户端；同时记录已抽取领域的旧 `ApiClient` 兼容入口在生产源码中的直接调用情况。
- 固定样本：工作台刷新时继续按原权限读取承运商任务列表；接口路径、返回字段、数据范围和错误回退不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不改 `run/retry` 承运商任务写接口，不改后端、共享契约、财务、账号、状态流转、审计实现、页面结构或视觉。

## 旧兼容入口生产调用清单

扫描范围：`apps/web/src` 生产源码，排除测试和 `apiClient.ts`；当前仅有 `apiClient`、`client`、`loginClient` 三个 `ApiClient` 实例变量。

| 领域 | 旧兼容方法 | 生产直接调用 |
| --- | --- | ---: |
| App Shell | `navigationUnreadBadges`、`markNavigationRead`、`reportPageRenderError` | 0 |
| Audit Query | `loginLogs`、`accountEvents`、`auditLogs` | 0 |
| System Directory | `departments`、`sites`、`createSite`、`updateSite`、`updateSiteEnabled` | 0 |
| Warehouse Query | `warehousePackages`、`warehouseTodayReceipts`、`warehouseInStock`、`warehouseManualReceiptCustomers` | 0 |
| Carrier Task Query | `carrierTasks` | 0 |

- 当前结论：16 个旧入口在仓库内生产源码均为零直接调用；领域客户端调用不计作旧入口，亦未发现从 `ApiClient` 解构这些方法的生产代码。
- 删除门槛：兼容窗口结束、再次执行同范围搜索仍为零、47 当前构建无外部旧前端版本依赖后，单独批量删除；本阶段只建清单，不提前删除。

## 纯只读领域扫描结论

- 本阶段选择：`GET /carrier-tasks`。仅查询任务列表，Repository 只读，保留既有运单数据范围和 `lastError` 字段裁剪，无审计写入。
- 生产调用仅位于 `App.tsx` 工作台刷新；`run/retry` 写方法继续留在旧客户端，本阶段不触碰状态流转。
- 暂缓：问题件列表与关闭/协助状态流转紧邻；客户、运单、报价和财务查询涉及更宽数据边界。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/api/carrierTaskQueryClient.ts`
- `apps/web/src/api/carrierTaskQueryClient.test.ts`
- `apps/web/src/App.tsx`
- `docs/dev-now/codebase-slimming-phase-7.md`
- `docs/dev-now/codebase-slimming-phase-8.md`

## 当前进度

- 已完成旧兼容入口和下一纯只读领域扫描，范围收敛到一个无参数 GET 查询和一个生产调用方。
- 已新增 `CarrierTaskQueryClient`，承接承运商任务列表 GET 查询。
- `App.tsx` 工作台刷新调用已迁入领域客户端；旧 `ApiClient.carrierTasks` 继续按原签名兼容转发。
- 已复扫 16 个旧兼容入口：生产直接调用合计仍为 0，也未发现解构调用。
- 本轮未修改 `run/retry` 写方法、API、后端、共享契约、数据库、权限、数据范围、字段裁剪、审计实现、页面结构或交互。
- 本阶段因新增领域客户端属性，分支 `apiClient.ts` 从 1935 行增至 1939 行，47 当前版本从 2151 行增至 2155 行；这是兼容期拆边界成本，不是代码减量。

## 验证

- 已通过：承运商任务路径、返回值、错误原文透传和旧方法兼容转发测试，2 个文件共 8/8。
- 已通过：`git diff --check` 和新增领域客户端 lint。
- 已通过：16 个兼容入口生产直接调用与解构调用静态复扫，合计为 0。
- 已通过：47 当前完整生产源码对同一批 16 个旧入口复扫，直接调用合计同样为 0。
- 已通过：47 当前完整源码 Docker Web production build；仅有既有 AntD vendor 大 chunk 警告。
- 已通过：47 三个运行时文件 checksum 与发布候选一致，容器静态产物包含 `carrierTaskQuery` 标记。
- 已通过：47 Web/API/Postgres/Redis 容器状态、容器内首页和 API health、公网 8899 首页与 API health；本次 Web 启动后的实际错误日志为 0。
- 已通过：47 管理员承运商任务查询为 200 且仍返回数组；客户角色仍为 403“没有访问权限”，未登录仍为 401“缺少登录凭证”。

## 交接

- 阻塞：无。
- 剩余风险：47 没有启用且具备承运商任务查看权限的非管理员探针账号，允许路径使用 ADMIN 验证；兼容期内微型单方法客户端会暂时增加 `ApiClient` 组合代码。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-8`。
- 准确下一步：暂停继续创建单方法客户端；先明确兼容窗口结束条件并再次复扫，随后单独批量删除当前 16 个零生产调用转发，再选择包含多个只读查询的高密度领域。
- 已交接至：`docs/dev-now/codebase-slimming-phase-9.md`
