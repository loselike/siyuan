# 代码瘦身治理第七十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜72`
- 续接自：`docs/dev-now/codebase-slimming-phase-71.md`
- 上下文状态：`green`
- 输入来源：持续目标要求优先取得可量化的运行效果，并保持外部业务契约不变
- 会话 slug：`codebase-slimming-phase-72`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：消除墨家设备重复推送检测为查一条数据而加载全部仓库包裹和理货任务的高成本路径。
- 固定样本：47 现有一条墨家设备包裹，以相同客户单号、国内单号、测量时间、尺寸重量和设备号重复推送，仍返回原“已接收”结果且不新增包裹。
- 硬边界：`POST /api/integrations/mojia/measurements` 的路径、HTTP 方法、参数、状态码、错误文案和返回字段不变；token、仓库角色限制、数据库结构、写入结果、状态流转和审计逻辑不变。

## 修改

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.repository.ts`
- `apps/api/src/modules/warehouse/inventory/legacy-warehouse-inventory-query.repository.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.repository.test.ts`
- `docs/dev-now/codebase-slimming-phase-72.md`
- `.codex-state.md`

## 当前进度

- `DataController` 的重复检测改为调用现有仓库库存领域 Repository，不再通过 `getWarehousePackages()` 拉取全部 1,442 条包裹并联查理货任务。
- Prisma 实现改用现有 `combinedOrderNo` 索引可承接的 `findFirst`，只选择 `combinedOrderNo`；墨家来源、秒级测量时间、可选设备备注和排序语义保持不变。
- Legacy/InMemory 适配器继续使用原数组筛选逻辑，保持现有 E2E fixture 行为，不修改公共接口或共享 DTO。
- 本阶段以性能收益为目标，生产源码净增加 44 行，测试增加 57 行；不计作代码行减量。

## 验证

- 仓库库存 Repository 定向测试 5/5、墨家接收完整 E2E 固定样本 1/1 和 `git diff --check` 通过。
- 47 以当前远端源码为基线精确同步三个 API 生产文件，只构建/重启 API，无 Prisma schema、migration、Web 或共享契约变化；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-72/`。
- 47 production build 通过，容器编译产物包含 `warehousePackage.findFirst` 和 Controller 委托指纹；API 容器运行、容器内 health、公网首页和公网 API health 均为 200，实际 API ERROR 日志为 0。
- 47 同一只读查询预热后 7 次实测：旧全量查询基线 P50/P95 为 192.47/251.65ms，精准查询为 3.57/4.14ms，分别降低约 98.1%/98.4%。
- 47 现有固定样本重复推送预热后 7 次实测 P50/P95 为 14.46/17.18ms；每次保持 201、`result=true` 和原“已接收”消息，目标包裹计数发布前后均为 1，没有业务数据新增。
- 47 漂移审计保持 `55 changed + 45 remote-only`；两个领域 Repository 与本地一致，`DataController` 继续保留其他既有远端差异。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 API，无迁移。
- 准确下一步：继续以生产耗时和响应体积排序候选。优先为仓库包裹列表建立不改变默认响应的可选服务端筛选/分页能力，并先迁移一个能明确缩小结果集的页面消费者；若无法保证默认调用兼容，则转查下一条 N+1 或全表加载热点。
