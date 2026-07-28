# 代码瘦身治理第八十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜89`
- 续接自：`docs/dev-now/codebase-slimming-phase-88.md`
- 上下文状态：`green`
- 输入来源：用户明确要求把仓库看板改为只查汇总，同时确认不能影响在仓字段显示
- 会话 slug：`codebase-slimming-phase-89`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 完成时间：`2026-07-28 Asia/Shanghai`

## 输入摘要

- 目标：仓库看板不再下载完整在仓明细，只取得原汇总数字；进入“在仓数据”和“未完成理货”时继续使用完整查询。
- 固定样本：管理员打开仓库看板时，新汇总响应必须与完整在仓响应的 `totals` 完全相等且不含 `rows`；进入在仓工作区仍调用完整接口。
- 硬边界：旧 `GET /warehouse/in-stock` 的路径、参数、状态码、错误文案和返回字段不变；RBAC、业务数据范围、字段裁剪、数据库、写入、状态流转、审计动作、页面入口、按钮、筛选、表格字段和提交载荷不变。

## 修改

- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts`
- `apps/api/src/modules/prisma.repository.warehouse-in-stock-summary.test.ts`
- `apps/api/src/modules/warehouse-inventory-query.e2e.test.ts`
- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/api/warehouseQueryClient.test.ts`
- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/modules/warehouse/WarehousePage.loading.test.tsx`
- `docs/dev-now/codebase-slimming-phase-89.md`
- `.codex-state.md`

## 当前进度

- 新增只读 `GET /warehouse/in-stock-summary`，复用原 `warehouse:in-stock:view` 权限、原角色宽范围/业务客户范围、原待出库统计和原 `warehouse.in_stock.view` 审计动作，只返回现有 `totals`。
- Prisma 汇总查询只选择客户代码、票号键、件数、重量、体积、状态和异常字段；不加载完整包裹实体、不查询理货任务、不映射约 50 个明细字段，也不向浏览器发送 `rows`。
- 仓库看板改调汇总接口；“在仓数据”和“未完成理货”继续调旧完整接口。旧完整接口、在仓矩阵/台账表格、列设置、详情、编辑、理货、拆分和录单链路均保持原位。
- 汇总接口失败时继续使用原全量包裹兼容回退；成功路径不触发该回退。
- 本地生产源码增加 93 行、删除 2 行，新增定向测试约 130 行；本阶段以运行时减载为收益，不宣称代码行减量。

## 验证

- API 安全 runner 3/3 通过：汇总窄字段选择和票数/件数/重量/体积/待理货/异常计算，完整接口与汇总 totals 等价，未登录和客户拒绝保持 401/403。
- Web 安全 runner 12/12 通过：查询客户端使用新路径；看板调用汇总且完整在仓调用为 0；兼容失败共享一次全量回退；在仓工作区仍调用完整查询。
- `git diff --check` 通过。API/Web 全量 typecheck 未出现本轮目标错误，仍被既有仓库测试夹具、财务夹具和若干基线错误阻断；大 Repository 与 WarehousePage 全文件 ESLint 仍只报告变更前既有问题，本轮新增窄文件无新增错误。
- 47 发布前管理员完整在仓固定样本：1747 行、1,894,135 bytes、单次 597.0ms。
- 47 发布后同一管理员固定样本：旧完整接口仍为 1747 行、1,894,135 bytes、单次 593.4ms；新汇总接口为 170 bytes、单次 77.1ms，不含 `rows`，七项 totals 与完整接口逐项相等。看板对应在仓响应单次减少 1,893,965 bytes（约 99.99%）；单次耗时不等同 P95。
- 47 业务组固定样本：旧完整接口 200/23 行，新汇总接口 200、无 `rows`、totals 完全相等；客户角色保持 403，未登录保持 401，证明业务数据范围和拒绝边界未扩大。
- 已在全局发布锁内基于 47 当前源码生成五文件 checksum 条件白名单候选，保留线上客户归属、权限、仓租、重复理货、缓存和矩阵表格能力；只构建/重启 API 与 Web，无 Prisma 迁移。
- 47 production build 通过，新路由只映射 1 次；五个线上源码 SHA 分别为 `ea6c180b...`、`4a02282a...`、`82b502cb...`、`f48d6e8d...`、`e16e1b64...`。API/Web/Postgres/Redis 容器正常，容器端和公网首页/API health 均为 200，实际错误日志为 0。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；API 与 Web 新镜像运行中，无迁移。
- 未验证项：77.1ms 与 593.4ms 都是单次固定样本，不代表 P50/P95；看板还会按权限加载今日收货、近期理货归档和理货任务，本阶段只消除了完整在仓明细传输。
- 准确下一步：在仓工作区仍会加载 1747 行、约 1.89MB；下一阶段新增服务端分页/窄字段列表能力，旧完整接口继续兼容，先迁移在仓表格但保持全部字段、筛选、详情和操作载荷不变。
