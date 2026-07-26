# 代码瘦身治理第六十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜65`
- 续接自：`docs/dev-now/codebase-slimming-phase-64.md`
- 上下文状态：`green`
- 输入来源：用户要求提高投入产出比并按“快速收口、源码基线、Prisma fixture、性能基线”顺序落地
- 会话 slug：`codebase-slimming-phase-65`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：停止用主观百分比衡量治理，建立可重复的 47 源码漂移与 API 性能硬指标，并先交付一个不改业务契约的高收益优化。
- 固定样本：47 管理员读取渠道、价格表、仓库包裹和票件列表；系统部门/站点只读接口。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、数据库、状态流转、审计和页面逻辑不变。

## 修改

- `scripts/audit-47-source-drift.sh`
- `scripts/check-development-governance.mjs`
- `package.json`
- `deploy/nginx.conf`
- `apps/api/src/modules/test-support/prisma-read-e2e-harness.ts`
- `apps/api/src/modules/test-support/e2e-harness.ts`
- `apps/api/src/modules/system-directory.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-65.md`
- `.codex-state.md`

## 当前进度

- 新增只读 `audit:47-drift`，按 SHA-256 对比当前 Git 与 47 的生产源码、Prisma migrations 和运行配置，排除测试、构建产物、备份和临时文件；支持摘要、明细及漂移时退出码 3。
- 治理检查固定要求漂移脚本和 npm 入口存在，并禁止该脚本包含同步、构建、迁移命令，避免审计工具演变成隐式发布工具。
- 当前硬基线为 236 个本地生产文件、282 个 47 文件：176 相同、60 内容不同、0 个仅本地、46 个仅 47。由此确认全量同步仍会覆盖未回补的线上能力，继续禁止全仓发布。
- 47 核心只读接口每条 20 次预热后采样：health P95 9.0ms；渠道 29.5ms；价格表 54.1ms；票件列表 30.2ms；仓库包裹 313.0ms。仓库包裹为首要瓶颈，1442 行、原始 JSON 1,530,879 bytes。
- 在 Nginx 开启 JSON/JS/CSS/SVG gzip，不改 API 返回字段或页面调用。仓库包裹响应经 Web 代理后的传输体由 1,530,879 bytes 降至 115,065 bytes，减少 92.5%；服务端查询耗时未宣称改善。
- 新增轻量 Prisma 只读 E2E fixture，并将系统部门/站点接口测试从整套 `InMemoryRepository` AppModule 切到真实 Controller、RBAC Guard、Service 和 Prisma Repository 链路，作为后续纯只读领域测试样板。

## 验证

- `bash -n scripts/audit-47-source-drift.sh`、`npm run governance:check`、`git diff --check` 通过。
- `npm run audit:47-drift -- --summary` 输出稳定；`--fail-on-drift` 在当前漂移下返回预期退出码 3。
- API 安全 runner 的系统目录 E2E 2/2 通过，管理员部门/站点 200、未登录 401、运营角色 403 均保持。
- API 全量 typecheck 仍有当前分支既有的 InMemory 仓库、财务响应和仓库编辑性错误；本阶段新增 fixture 与迁移测试未出现在错误清单，不把全量 typecheck 记为通过。
- 47 只白名单更新 `deploy/nginx.conf`，仅重建/重启 Web，无 API 变更、数据库迁移或数据写入。Nginx 配置检查通过，Web/API/Postgres/Redis 正常，宿主与公网 health、首页均为 200，最近 Web/API 错误日志无新增异常。

## 交接

- 阻塞：当前 Git 与 47 尚有 60 个内容差异和 46 个远端独有生产文件，其中包含迁移、财务、权限和状态能力；必须按领域重建小提交，不能直接回抄或全量同步。
- 发布状态：`已发布 47`；仅 Web Nginx 压缩配置，无迁移。远端备份位于 `/opt/siyuan/backups/codex-20260727-performance-gzip`。
- 硬指标替代主观完成度：生产源码漂移 `60 changed + 46 remote-only`；核心接口首要瓶颈为仓库包裹 `P95 313ms / 1.53MB`；已交付传输体减少 `92.5%`。
- 准确下一步：先按低风险只读领域把 60/46 漂移重建为可审查的小提交；随后对仓库包裹查询设计分页或按工作区裁剪方案。后者会改变页面取数方式，须独立任务验证接口兼容和交互效果，不与源码回补混做。
