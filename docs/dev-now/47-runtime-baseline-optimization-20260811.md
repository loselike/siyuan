# 47 运行态统一基线优化

- 状态：`ready_for_cutover`
- 会话标题：`Sunny｜47 发布基线优化｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`47-runtime-baseline-optimization-20260811`
- 分支：`codex/47-runtime-baseline-20260811`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/47-runtime-baseline-20260811`
- 认领时间：`2026-08-11 13:29 Asia/Shanghai`

## 输入摘要

- 目标：以 47 当前真实运行源码建立唯一 Git 基线，恢复标准发布能力，并降低后续功能发布耗时。
- 不做：本轮不拆分业务大文件，不改业务口径，不执行破坏性迁移或生产数据写入。

## 允许修改

- `scripts/**`
- `.dockerignore`
- `docs/47-cloud-docker-release.md`
- `docs/release-manifests/47/**`
- `docs/dev-now/47-runtime-baseline-optimization-20260811.md`
- 47 当前运行态中已存在的 `apps/api/**`、`apps/web/**`、`packages/shared/**`、Prisma schema/migrations 及根构建文件，仅用于生成等价快照。

## 当前进度

- 已从 `origin/main` 创建隔离 worktree；根目录脏工作区保持原样。
- 已冻结 47 当前 `WHITELIST_CAS` 运行态 v2 manifest（431 个源码文件），并把当前 Shared、Prisma schema、10 个线上迁移及 Web/API 源码完整导入候选。
- 候选与冻结 manifest 仅有两项受控差异：`.dockerignore` 排除 `apps/api/uploads`，`data.controller.ts` 删除重复权限声明；其余 429 项 checksum 一致。
- 已修复 fingerprint 对 `.orig`/构建垃圾的误计入，并把一次性 bootstrap 钉死到本轮 v2 manifest 与 bundle SHA。

## 验证

- `npm run prisma:generate -w @siyuan/api`：通过。
- `npm run build -w @siyuan/shared`：通过。
- API/Web typecheck：通过。
- 财务字段裁剪与写权限、业务成本 write-only、仓库 OWN 数据范围、理货弹窗定向测试：通过。
- `git diff --check`、相关脚本 `bash -n`、`npm run governance:check`：通过。
- 待执行：GitHub `main` 快进、47 bootstrap、traceable provenance audit。

## 交接

- 阻塞：无；cutover 会在锁内重捕获并校验，线上有任何漂移即 fail closed。
- 剩余风险：47 当前为 `WHITELIST_CAS` 来源，需要受控 reconciliation cutover，不能直接覆盖。
- 用户验收目标：以后小功能能从干净主基线直接开发和按影响范围发布，不再逐次拼接线上白名单源码。
- 效果证据：冻结 manifest 共 431 行；候选 429 行逐文件完全一致，2 行为明确审查的发布治理修复。
- 安全证据：权限/财务/仓库定向测试与 431 条路由契约治理检查通过。
- 未验证项：47 切换后镜像、API release ID、receipt 与 Git commit 的线上一致性。
- 发布状态：`本地安全门已通过，待一次性 cutover`
- 稳定附件：无
- 准确下一步：提交并快进 GitHub `main`，用钉死 manifest 执行 bootstrap 后运行 `audit:47:provenance -- --require-traceable`。
