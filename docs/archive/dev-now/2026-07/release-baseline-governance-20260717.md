# 发布基线治理（2026-07-17）

- 状态：`completed`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`release-baseline-governance-20260717`
- 分支：`codex/release-baseline-20260717`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-17 Asia/Shanghai`

## 输入摘要

- 目标：将当前本地与 47 已运行的代码、迁移和发布工具收敛为可追溯的 Git 发布基线，并建立可部署 commit/tag。
- 不做：不删除历史功能、不修改线上数据、不在本会话执行新的数据库迁移。

## 允许修改

- 版本控制基线文件、Prisma migration lock、发布/测试治理文档及本会话状态文件。

## 完成记录

- 已确认 47 已应用的 Prisma migration 与本地 89 个 migration 目录完全一致；唯一文本差异为已执行 migration 的文件尾换行，已保留 47 原始内容以避免 Prisma checksum 漂移。
- 已将此前未跟踪的运行时代码、价格解析代码和 27 个 migration 纳入版本控制，并补充 Prisma `migration_lock.toml`。
- 已建立可部署发布基线 commit；tag 在 amend 后创建。

## 验证

- Shared、API、Web `npm run build` 通过。
- Shared、API、Web `npm run typecheck` 通过。
- 已对 staged 文件进行敏感凭据特征扫描，未发现私钥或云平台密钥。
- `git diff --cached --check` 通过（已执行 migration 的既有尾空行按 47 原文件保留，不作格式化改动）。
- 47 线上迁移清单一致性检查通过。

## 未发布事项

- 本次仅建立本地发布基线，未向 47 发布。
- 报价规则引擎第一阶段在独立分支继续实施。

## 交接

- 阻塞：无
- 剩余风险：当前改动为历史累积基线，提交后仍需按业务模块继续拆分后续功能分支。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
