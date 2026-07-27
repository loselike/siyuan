# 代码瘦身治理第七十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜79`
- 续接自：`docs/dev-now/codebase-slimming-phase-78.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续高投入产出治理，优先处理47生产树非Git遗留源码
- 会话 slug：`codebase-slimming-phase-79`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：清理47生产源码树中不受Git管理、会进入Docker构建上下文的 `.orig` 历史副本，并增加构建上下文防复发规则。
- 固定样本：现行 App、订单页和47 Web/API服务保持不变；只处理明确的四个普通文件副本。
- 硬边界：不改任何业务源码、API、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计或运行容器。

## 修改

- `.dockerignore`
- `docs/dev-now/codebase-slimming-phase-79.md`
- `.codex-state.md`
- 47生产树删除四个非Git `.orig` 文件；可恢复副本保存在阶段备份目录。

## 当前进度

- 完整扫描47的 `apps`、`packages`、`deploy` 和根目录候选后，确认仅有四个目标遗留文件：`prisma.repository.ts.orig`、`data.controller.ts.orig`、`CustomerServicePage.tsx.orig`、`OrdersPage.tsx.orig`。
- 四个文件共 1,439,385 bytes、29,181 行，均为普通文件、与现行源码不同、没有任何非 `.orig` 文件引用；Dockerfile 的目录级 `COPY` 会把它们送入 API/Web 构建上下文。
- 四个文件逐项复制到 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-79/stale-orig/` 并用 `cmp` 验证一致后，从47生产源码树精确删除；备份合计字节数仍为 1,439,385，可逐文件恢复。
- `.dockerignore` 新增 `**/*.orig`，即使以后再次出现同类编辑器/补丁副本，也不会进入 Docker 构建上下文。
- 本轮没有改变 bundle、运行时内存、接口性能或页面行为；直接效果是生产源码树减少 1.44 MB/29,181 行无效副本，并永久缩小同类构建输入面。

## 验证

- 47 `apps/packages/deploy` 中 `.orig/.bak/.backup/.old/.save/.before/.rej/.tmp/*~/.swp` 当前计数为 0；阶段备份中 `.orig` 精确为 4 个。
- 47 `.dockerignore` SHA-256 为 `3d20d6c547b5f7721140c9b51a07f5a0834a1b086bb4043e5c3066caa14a5d14`，且精确包含 `**/*.orig`。
- 47 Web production build 通过：`.dockerignore` 被 BuildKit 加载，3,392 个模块完成转换；本轮只构建新镜像验证，没有重启运行容器，因为运行时代码未变。
- 第78阶段 App/OrdersPage 线上源码指纹保持 `d6b02c...` 与 `6d4727...`；Web/API 容器正常，公网首页和 API health 均为 200，Web 最近错误日志为 0。
- `git diff --check` 通过；漂移审计保持 `55 changed + 45 remote-only`，四个 `.orig` 原本即被审计脚本排除，因此清理没有虚假改变治理基线。

## 交接

- 阻塞：无。
- 发布状态：`已同步47并完成构建验证`；仅 `.dockerignore` 和非Git遗留文件清理，无运行容器重启、无迁移。
- 准确下一步：增强 `audit:47-drift`，单独报告被内容漂移集合排除的远端源码遗留物，避免 `.orig` 再次静默积累；随后回到预计净删至少100行或能消除真实无效请求/计算的运行时切片。
