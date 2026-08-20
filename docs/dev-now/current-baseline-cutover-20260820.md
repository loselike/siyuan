# 47 当前运行基线归并与 digest cutover

- 状态：`in_progress`
- 会话 slug：`current-baseline-cutover-20260820`
- 分支：`codex/release/current-baseline-20260820`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/current-baseline-cutover-work`
- 上游：`codex/release/resilience-20260820` / `3001e4db`

## 目标与边界

- 目标：把 47 当前实际运行源码冻结成可审查 Git 候选，随后由 CI 构建三个 digest 镜像，再通过 v3 manifest 执行无生产构建的 current-baseline cutover。
- 固定样本：候选除新增的 release-resilience 文件与 package script 外，运行时 `source-files.tsv` 必须与锁内捕获的 47 manifest 逐字节一致。
- 禁止：未取得 CI digest 和完整安全门前不重启/覆盖生产容器；不在本步骤写数据库；不从旧 main 镜像回退当前业务。

## 已完成

- 在全局发布锁内捕获 v3 manifest：`docs/release-manifests/47/20260820-033756-whitelist-e8e96a8b463a84403672003b`，source tree SHA `fbfeca2f99f749c9af5d731734f644c11847d0b17a811f610853e164f9507fd6`。
- 同一把锁内按 manifest 文件清单从 `/opt/siyuan` 单次 tar 流拉取当前运行源码；本地复算只多出 P0 新增的两个 `deploy/47` 恢复文件，远端清单内 550 个运行时文件的路径、大小和 SHA-256 全部一致。
- 相对 `3001e4db`，当前线上基线包含数十个已跟踪运行文件修改及 8 个新增运行文件/迁移；另含本任务测试修正、任务记录和 1 份 manifest。生产组合版本中有多个关键文件未在任何其他本地 worktree 找到完全相同副本，证明不能靠挑选旧分支重建，必须以锁内线上快照为基准审查。
- Shared build、Prisma generate、API typecheck、Web typecheck 均通过。API 定向 9/9、Web 定向 10/10 通过；旧测试夹具已按当前生产 API 与页面契约补齐。
- 四个 2026-08-18 至 2026-08-20 迁移均已在 47 完成且未回滚，数据库 `_prisma_migrations.checksum` 与本地 `migration.sql` SHA-256 四项逐项一致。
- 基线拉取后只保留三类可解释差异：P0 的 `package.json` 发布命令、仅测试使用的 `appTestHarness.tsx` 契约修正，以及 `RoutingPage.tsx` 恢复“业务成本/应付成本”各自独立权限入口；后者已有正向权限 UI 测试覆盖。

## 当前门槛

- 候选已提交为 `183d89ea`、推送到 `codex/release/current-baseline-20260820` 并创建 [PR #5](https://github.com/loselike/siyuan/pull/5)。CI 的 Shared build、Prisma generate、API/Web typecheck、API/Web 代表性测试均通过。
- 用户已明确授权继续解除 P1 门禁；既有 `market-positive-permission-rebuild-20260815` 任务已核对为 47 已发布，补 canonical `published_47` 状态后归档，避免治理器把已完成任务误判为悬空任务。
- 已从当前候选重新生成架构快照并逐项审查：旧基线 434 条 handler 契约，当前 481 条；新增 50、删除 3、变化 53。51 项为正向权限集合变化；`tracking` 导入由 `auth` 收紧为 `tracking:external:import`；代理银行账户写入口由静态 permission 改为 `auth`，但 Controller 首段和 Prisma/InMemory Repository 均继续按创建/修改及财务银行管理权限二次判权并做字段裁剪。
- 当前 34 组重复 HTTP 路由中 32 组权限元数据一致；`GET /operations/line-shipments/:id/internal-flow-log` 与 `GET /shipments` 两组存在动态联合授权差异，均由先命中的 DataController 转入 Repository 执行同一业务能力的角色、数据范围和字段裁剪，并已有允许/拒绝 E2E。Mojia 重复入口继续由治理器强制检查 handler 首语句设备 token。
- 当前生产组合的集中债务（DataController 214、ApiClient 387/361、Shared 根导入 149、`as any` 954、`process.env` 38、Prisma/InMemory 方法 756/640、10 个孤儿候选和 34 组重复路由）被本次例外基线精确冻结；这不是认可或扩大额度，后续任何新增仍 fail-closed，下降后必须收紧。完整取舍记录见 `docs/architecture/phase-1-gate-a.md`。
- 三个旧 E2E 夹具已按当前生产契约修正：旧 `cancel-completed` 路由固定为 404、轨迹导入拒绝由 Guard 返回通用权限文案、可选代理字段按空展示值断言，内部流通日志断言 Repository 的明确拒绝文案。RBAC 15/15、市场权限 3/3、Mojia 3/3、系统身份 1/1 通过；当前受控沙箱禁止测试监听 `0.0.0.0`，10 个 E2E 在应用启动前以 `listen EPERM` 终止，逻辑结果以 PR CI 为最终门。
- 独立高风险复审发现 4 个 P1：内部流通日志可从审计摘要泄露代理身份；制品清单可替换为任意 GHCR digest 且未绑定签名来源；两阶段未完成理货迁移存在角色保存竞争窗口；应付新增与更换代理未共用运单锁。当前候选已分别增加全局字段屏蔽裁剪及 masked-role E2E、固定三个 Sunny GHCR 仓库并用 GitHub artifact attestation 绑定 repo/workflow/main/commit、47 只读迁移竞争审计脚本、应付 create/update/audit 的运单行锁和事务内重读。应付锁顺序 3/3、RBAC 15/15、API typecheck、481 路由治理与 Mojia 3/3 通过；本地 E2E 仍仅因 `listen EPERM` 未启动。
- 增量高风险复审在补齐 `system.role.create/update/delete` 与两类权限保存/复制审计后未发现 P0/P1，确认可提交并推送 PR CI；迁移审计解析器的允许路径与 5 类危险写入逐项拒绝共 6/6、发布制品策略测试、shell 语法和 CI YAML 解析均通过。复审同时明确：生产只读迁移审计未返回 PASS 前仍不可 cutover。
- 当前受控环境同时拒绝到 GitHub 和 47 的外部网络：47 只读审计返回 SSH `Operation not permitted`，因此尚未取得“迁移窗口无角色保存”的生产证据；本地最新 commit 也尚未推送。不得绕过这两个 fail-closed 门或启动 cutover。
- P1 修复已提交为 `f343a4c6`。推送经已配置代理立即失败（`127.0.0.1:7897` 无监听），显式禁用该 Git proxy 后又因 `github.com` DNS 无法解析而失败；修正版 47 审计同样被当前 sandbox 在 SSH 建连前拒绝。当前没有触碰生产源码、镜像、容器或数据库。
- 下一门槛：网络恢复后先运行 `npm run audit:47:pending-tally`，要求两个迁移完成、危险窗口内角色创建/修改/删除/权限保存/复制均为 0、9 个 canonical 权限齐全、legacy 0、动作缺 view 0；再完成 P1 复审、推送 PR #5、等待 CI（含三个旧 E2E 和新锁测试）全绿并生成带签名的三个 digest。只有 `images.env` 的 `GIT_COMMIT` 与最终 `main` 完全一致，且锁内重新捕获的 v3 manifest 未漂移，才允许 current-baseline cutover。

## 成熟参考与取舍

- [Docker live restore](https://docs.docker.com/engine/daemon/live-restore/)：用于 daemon 异常时保留既有 Linux 容器；Sunny 已用 reload 启用，不在生产做 daemon kill 演练。
- [docker/build-push-action](https://github.com/docker/build-push-action)：采用 CI 一次构建、Git SHA/digest 标识和制品提升；Sunny 保留 Compose，但 47 标准发布只拉取精确 digest。
- [actions/attest](https://github.com/actions/attest) 与 [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/verifying-the-provenance-of-an-artifact)：采用 GitHub OIDC 签名并在部署前绑定 repository、workflow、main source ref 和 commit；不把普通镜像标签或任意 GHCR digest 当成可信来源。官方 Action 为 MIT 许可，本次仅调用发布动作与 CLI 验证，不复制实现。
- [Kamal](https://github.com/basecamp/kamal) 与 [Argo Rollouts](https://github.com/argoproj/argo-rollouts)：借鉴先健康后切换、保留可回滚版本和失败自动停止；不引入 Ruby/Kubernetes 运维栈。
- 权限边界沿用 [Casbin](https://github.com/casbin/casbin)、[Keycloak](https://github.com/keycloak/keycloak) 与 [Cerbos](https://github.com/cerbos/cerbos) 的 resource/action、后端决策点和对象属性校验原则。以上项目/文档许可证清晰；本次只借鉴架构原则，不复制策略语法、数据库结构或代码。
