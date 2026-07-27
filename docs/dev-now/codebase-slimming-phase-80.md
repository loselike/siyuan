# 代码瘦身治理第八十阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜80`
- 续接自：`docs/dev-now/codebase-slimming-phase-79.md`
- 上下文状态：`green`
- 输入来源：持续目标要求避免47生产树的非Git遗留源码再次静默积累
- 会话 slug：`codebase-slimming-phase-80`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：让现有47源码漂移审计单独暴露被主清单排除的备份、临时和 macOS 资源分叉文件，并提供可用于自动门禁的独立失败选项。
- 固定样本：先用47现存的 `._*` 与 `.DS_Store` 遗留物验证发现能力，再以一个6字节 `.orig` 临时探针验证严格退出码，最后恢复为零遗留状态。
- 硬边界：不改业务源码、API、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计或运行容器。

## 修改

- `scripts/audit-47-source-drift.sh`
- `scripts/check-development-governance.mjs`
- `scripts/sync-47.sh`
- `.dockerignore`
- `.gitignore`
- `docs/dev-now/codebase-slimming-phase-80.md`
- `.codex-state.md`
- 47生产树精确删除22个非Git遗留文件；可恢复副本保存在阶段备份目录。

## 当前进度

- `audit:47-drift` 现在固定输出 `REMOTE_STALE_ARTIFACTS` 和 `REMOTE_STALE_ARTIFACT_BYTES`，详细模式额外列出每个文件的字节数和路径；主内容漂移统计仍保持原定义。
- 新增 `--fail-on-stale-artifacts`：发现任一遗留物时退出4；原 `--fail-on-drift` 的退出3语义未改。
- 扫描范围覆盖47的 `apps`、`packages`、`deploy`，识别 `.orig/.bak/.backup/.old/.save/.before/.rej/.tmp/*~/.swp/._*/.DS_Store`，同时继续排除依赖、构建和覆盖率目录。
- 首次运行直接发现22个既有遗留物：20个163字节 AppleDouble 文件和2个6,148字节 `.DS_Store`，合计15,556 bytes。全部逐项备份并 `cmp` 后从生产源码树精确删除；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-80/stale-artifacts/`。
- `.dockerignore`、`.gitignore` 和 `sync-47.sh` 增加 AppleDouble/`.orig` 防复发规则；治理检查锁定同步排除项、审计输出与严格开关，防止以后被意外删除。
- 本轮不宣称运行时性能提升；直接效果是新增可自动失败的生产树卫生门禁，并清除15.6KB不可执行元数据。业务运行时、镜像和容器未改变。

## 验证

- `bash -n scripts/audit-47-source-drift.sh`、`bash -n scripts/sync-47.sh`、`npm run governance:check`、`git diff --check` 全部通过。
- 6字节 `.orig` 固定探针使审计输出 `REMOTE_STALE_ARTIFACTS=1`、`REMOTE_STALE_ARTIFACT_BYTES=6` 并按新开关退出4；探针删除后严格模式退出0，最终遗留物和字节数均为0。
- 内容漂移指标保持 `55 changed + 45 remote-only`，证明遗留物报告没有污染主清单兼容口径。
- 五个治理文件已精确同步47且本地/远端 SHA-256 全部一致；两个脚本远端权限均为755。
- API/Web/Postgres/Redis 容器均为 running，公网首页和 `/api/health` 均为200，最近15分钟 Web/API错误关键词日志为0；本轮无运行时文件变化，因此没有构建或重启服务。

## 交接

- 阻塞：无。
- 发布状态：`治理脚本和忽略规则已同步47`；无容器重启、无迁移。
- 准确下一步：回到运行时高密度切片，只选择预计净删至少100行或能消除真实请求/全量计算的候选；优先扫描财务现行领域页之外的兼容壳和重复派生链，并继续保持金额、权限、状态与审计不变。
