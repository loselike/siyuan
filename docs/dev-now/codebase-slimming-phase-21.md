# 代码瘦身治理第二十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜21`
- 续接自：`docs/dev-now/codebase-slimming-phase-20.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-21`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：删除第二阶段遗留的 `PrismaRepository.getDepartments/getSites` 两个零调用兼容转发及对应兼容测试，保留生产领域 Prisma Repository 和内存测试 Legacy 适配链路。
- 固定样本：`GET /api/system/departments` 与 `GET /api/system/sites` 继续由 `SystemDirectoryController -> SystemDirectoryService -> SystemDirectoryRepository` 返回原数据。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改领域 Repository 查询、排序或映射，不修改内存仓储实现，不修改站点写方法，不修改前端或共享契约。

## 允许修改

- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/system/directory/legacy-system-directory.repository.ts`
- `apps/api/src/modules/system-directory.repository.test.ts`
- `docs/dev-now/codebase-slimming-phase-20.md`
- `docs/dev-now/codebase-slimming-phase-21.md`
- `.codex-state.md`

## 当前进度

- 当前仓库复扫确认：两个兼容方法除 Legacy 适配器和兼容测试外无运行时调用。
- 已从 `PrismaRepository` 删除两个转发及仅由它们使用的领域 Repository 导入。
- Legacy 适配器继续注入原 `PrismaRepository` 令牌，但依赖类型收窄为 `SystemDirectoryRepository`，内存模式仍调用 `InMemoryRepository` 的原实现。
- 已删除只验证旧转发的兼容测试；领域 Prisma 查询、权限和映射测试保持不动。

## 验证

- 已通过：领域 Repository 与系统目录接口 E2E，2 个文件共 4/4。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 `PrismaRepository` 领域导入和两个兼容方法均为 0；Legacy 适配器两个方法和生产领域 Repository 编译产物保持存在。
- 已通过：47 管理员部门、站点查询均为 200 且返回数组；运营角色均为 403“没有访问权限”；未登录为 401“缺少登录凭证”。
- 已通过：47 API/Web 容器正常，容器内与公网 API health 均为 200，API 启动成功且实际错误日志计数为 0。

## 下一切片扫描

- 当前前端 `ApiClient` 已无领域客户端兼容转发；后端 `PrismaRepository` 也未发现其他 `new *Repository(this.prisma)` 同类兼容转发。
- 继续治理需进入新的实现迁移，而不是删除兼容层。下一阶段应从 `DataController` 中选择一组同前缀、纯 GET、无写入/状态/财务/账号/审计的窄切片，建立独立 controller/service/repository 后再进入兼容窗口。

## 交接

- 阻塞：无。
- 剩余风险：仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖；内存模式仍依赖巨型 `InMemoryRepository`，本轮按既定边界未扩改。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-21`。
- 准确下一步：扫描 `DataController` 的纯 GET 高密度窄领域，优先选择至少两个接口且领域 Repository 查询边界清晰的切片；只做调用链迁移，不改查询、权限或响应。
