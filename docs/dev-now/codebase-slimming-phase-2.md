# 代码瘦身治理第二阶段

- 状态：`complete`
- 会话标题：`Sunny｜代码瘦身治理｜02`
- 续接自：`docs/dev-now/codebase-slimming-phase-1.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确要求继续）`
- 会话 slug：`codebase-slimming-phase-2`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-24 17:15 Asia/Shanghai`

## 输入摘要

- 目标：把部门、站点查询的 Prisma 实现迁入领域 Repository，旧 `PrismaRepository` 只保留兼容转发，并用独立 Prisma 模块 fixture 验证查询与映射。
- 不做：不改接口、权限、返回字段、数据库、站点写操作、InMemoryRepository 或其他业务模块。

## 允许修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/system/directory/**`
- `apps/api/src/modules/system-directory.repository.test.ts`
- `docs/dev-now/codebase-slimming-phase-2.md`

## 当前进度

- 已恢复第一阶段独立 worktree；工作树干净，第一阶段提交与 47 发布记录完整。
- 已将部门、站点的 Prisma 查询、排序、映射和 Repository 级管理员限制迁入 `PrismaSystemDirectoryRepository`。
- `PrismaRepository.getDepartments/getSites` 已缩减为兼容转发；巨型文件本轮净减少 4 行。
- InMemory 测试链路继续使用独立 Legacy 适配器，本轮未修改或扩张 `InMemoryRepository`。
- 生产环境根据 `USE_PRISMA_REPOSITORY/DATABASE_URL` 选择领域 Prisma 实现；现有内存 E2E 选择 Legacy 适配器。

## 验证

- 已通过：Prisma 领域模块 fixture 3/3，覆盖查询排序、字段映射、Repository 管理员限制和旧方法兼容转发。
- 已通过：系统目录 E2E 2/2；管理员两个接口 200，未登录 401，运营角色两个接口 403。
- 已通过：原仓库固定样本回归、治理检查、新增/改动小文件 lint、`git diff --check`。
- 未通过：基线 API 全量类型检查仍为第一阶段已记录的既有仓库/财务类型错误，本轮领域文件无新增类型错误。
- 已通过：47 当前完整源码 Docker API production build。
- 已通过：47 编译产物确认生产绑定 `PrismaSystemDirectoryRepository`；管理员读取部门 6 行、站点 4 行均为 200，运营角色均为 403。
- 已通过：47 API 容器状态、容器内/公网 health 和最近错误日志检查。

## 交接

- 阻塞：无
- 剩余风险：旧 `PrismaRepository` 兼容转发尚未删除；需要先确认所有调用方迁入领域 Service。当前主工作树仍包含大量其他会话改动，后续合并禁止整文件覆盖。
- 用户验收目标：两个只读查询在生产改用领域 Prisma Repository，外部接口、权限和返回结果不变。
- 效果证据：47 编译产物使用领域 Prisma 实现，线上两个接口数据行数和权限结果与第一阶段一致。
- 安全证据：领域 fixture、接口 E2E、固定样本回归、治理检查、47 Docker build、health 与日志检查通过。
- 未验证项：未做浏览器检查；本轮无 UI 变化。基线全量 API typecheck 仍有既有错误。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260724-codebase-slimming-phase-2`。
- 稳定附件：无。
- 准确下一步：第三阶段拆分前端 `ApiClient` 的 system directory 客户端，保留旧方法兼容转发，并迁移 Settings 调用方。
- 建议新标题：`Sunny｜代码瘦身治理｜03`
- 建议新状态文件：`docs/dev-now/codebase-slimming-phase-3.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
