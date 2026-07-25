# 代码瘦身治理第二十四阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜24`
- 续接自：`docs/dev-now/codebase-slimming-phase-23.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-24`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把 `DataController` 中承运商、公司渠道和渠道类别三个纯 GET 路由迁入独立 `MasterDataChannelQueryController`，保持现有 Repository 快照实现不变。
- 固定样本：管理员读取三个目录继续与完整基础资料快照中的对应数组完全一致；未登录继续返回原 401 文案，客户角色继续对三个路径返回原 403 文案。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 `getMasterData()`、Prisma/InMemory Repository、承运商/渠道/类别写接口，不触碰财务资料、账号、状态流转、审计实现、前端、共享契约或视觉。

## 允许修改

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/master-data/channel/master-data-channel-query.controller.ts`
- `apps/api/src/modules/master-data-channel-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-23.md`
- `docs/dev-now/codebase-slimming-phase-24.md`
- `.codex-state.md`

## 当前进度

- 已复扫 `DataController` 剩余纯 GET；本阶段选择三个同域、同快照、无私有 helper 的渠道目录查询。
- 已将三个 GET 及原权限装饰器原样迁入独立 Controller。
- 新 Controller 继续注入同一个 `PrismaRepository` 令牌并读取同一个 `getMasterData()` 快照字段；生产和内存实现选择不变。
- 承运商、公司渠道和渠道类别的所有写接口保持在 `DataController` 原位。
- 已增加只读 E2E，比较三个独立响应与完整快照对应数组，并覆盖未登录 401 和客户角色三个路径 403 的原文。

## 验证

- 已通过：新渠道基础资料只读 E2E，1 个文件共 2/2；管理员三个独立响应与完整快照对应数组完全一致。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 三个目标 GET 在 `DataController` 中均为 0，在新 Controller 中各为 1；Nest 启动映射各为 1，10 个对应写路由仍在原 Controller。
- 已通过：47 管理员三个查询均为 200 数组，并与完整基础资料快照对应字段逐项一致；实际行数为承运商 10、公司渠道 10、渠道类别 6。
- 已通过：47 客户角色访问三个路径均为 403“没有访问权限”；未登录读取公司渠道为 401“缺少登录凭证”。
- 已通过：47 API/Web 容器正常，容器内与公网 API health 均为 200，API 启动成功且实际错误日志计数为 0。

## 治理效果

- `DataController` 删除三个只读方法，文件净缩小 18 行。
- 新增独立 Controller 和定向测试后，全仓总行数没有减少；本阶段把渠道目录查询边界从巨型 Controller 分离，不宣称性能提升或代码总量下降。
- `getMasterData()`、Prisma/InMemory 查询、排序、字段内容、权限矩阵和所有写接口均未改变。

## 交接

- 阻塞：无。
- 剩余风险：新 Controller 暂时直接依赖巨型 `PrismaRepository.getMasterData()`，尚未形成只读领域 Repository。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-24`。
- 准确下一步：复扫下一个现有领域边界可承接的成组纯 GET；优先避免新增只有一两个方法的 Controller，继续排除财务、账号、状态流转、审计和依赖 DataController 私有裁剪 helper 的查询。
