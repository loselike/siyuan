# Sunny 深度重构 Phase 48

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase48`
- 基线提交：`77044ee`
- 用户验收目标：每个切片完成后重新扫描、重新排序；所有业务逻辑保持不变。

## 本轮重评

- 原候选：为 `GET /api/master-data` 增加按权限裁剪的数据库查询下推，减少无权限角色的无效读取。
- 停止原因：实施前校验发现 47 当前运行源码相对 Phase 47 有 26 个内容差异、6 个远端独有运行时文件，且 `DataController`、Prisma/InMemory Repository 正在运行新的权限改造。继续原候选会覆盖生产权限语义，违反行为保持门禁。
- 当前选择：P0 恢复 47 当前真实组合源码的干净 Git 基线。固定样本是运行时源码集合达到本地/47 逐字节全等；本轮只读捕获和逐字节吸收，不编辑业务逻辑、不重建服务、不执行迁移、不写生产数据。

## 成熟参考与取舍

- Git `git bundle`：https://github.com/git/git/blob/master/Documentation/git-bundle.adoc （GPL-2.0）。借鉴完整 Git objects/refs 可验证传递和离线恢复的原则；本轮先建立准确 commit，后续标准发布再由 Sunny 现有 bundle/receipt 链路恢复可追溯性。
- Git repository layout：https://github.com/git/git/blob/master/Documentation/gitrepository-layout.adoc （GPL-2.0）。借鉴 object store、refs 与 worktree 分离，使用独立 worktree 隔离根脏工作树；不复制实现代码。
- SLSA：https://github.com/slsa-framework/slsa （Community Specification License 1.0）。借鉴构建来源应绑定不可变源码身份、构建步骤和产物证据；当前 47 为多批 `WHITELIST_CAS` 组合，不能冒充单一 Git 来源。本轮只恢复源码快照，不伪造历史或 provenance。
- Sunny 差异与取舍：47 源码目录不是 Git checkout，且组合来自多个已审核白名单任务；以当前运行时文件逐字节 checksum 作为唯一吸收事实，再提交为新的恢复基线。远端 `.env`、上传、备份、日志、数据库与 AppleDouble 元数据不进入候选。

## 行为保护与验收

- 行为保持：候选运行时文件必须与捕获时 47 逐字节一致；任何本地人工业务编辑均禁止。
- 并发保护：捕获前后必须校验 release ID 与完整远端 manifest 未变化；若变化，丢弃旧捕获并重来。
- 效果证据：`audit-47-source-drift.sh --summary --fail-on-drift` 返回 `CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`。
- 安全证据：Shared/API/Web 类型检查、架构与安全契约、迁移清单只读核对、公网 health；不以 GitHub 项目替代 Sunny 本地与 47 证据。

## 完成结果

- 捕获时 release state 前后 checksum 均为 `3c73b13be6cab6b4a7e4591c0ab913f9ec075746cb42620cc3a774c0034f7249`；496 个运行时文件达到 `SAME=496`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`。远端 22 个 AppleDouble 文件仅告警并继续排除。
- 精确运行时快照提交为 `632de17`。之后只删除四处未使用的 import/参数/常量，不改变运行时分支；定向保护新增当前 pricing 27 项 capability、`RequireAllPermissions` 架构扫描和仓库理货规则 port stub。
- 当前保护网：pricing 允许/拒绝与 RBAC/理货定向测试 17/17，通过 Shared/API/Web 类型检查，436 路由治理、lint no-new-debt、安全契约 3/3 和 scanner self-test。
- 47 只读证据：六条本轮吸收 migration 均为 `APPLIED`，公网 health 200；未执行服务构建、重启、迁移或生产数据写入。
- 宽旧 pricing E2E 仍有 17 条失败，旧 `rbac.test.ts` 也曾与 47 已完成的正向权限迁移冲突。本轮只在正式任务记录与当前运行源码均能证明的权限契约上修保护网，不猜测其余定价业务预期。

## 切片后重评

- 安全/数据正确性：权限运行逻辑已有当前定向允许/拒绝保护，但旧宽 pricing E2E 与生产语义漂移，继续扩大修改会混入未经证实的定价规则，暂不沿这条路盲改。
- 高频业务/前端数据流：`master-data` 权限感知下推仍有价值，但会触及刚吸收的权限改造；在恢复发布来源证据前继续改运行时，会再次扩大不可追溯组合。
- 架构/改造效率：当前 47 又是 `WHITELIST_CAS` 且 API `releaseId=unknown`，任何后续切片都缺少稳定 Git 回滚锚点。最高优先级转为先用 v3 冻结清单和 current-baseline cutover 恢复 Git/bundle provenance；固定样本是锁内六份运行证据逐字节相等且迁移集合/checksum 一致。
- 新的 v3 清单：`docs/release-manifests/47/20260813-151824-whitelist-e33ce3cc5bb91e2674c7beef`，源树 manifest `8a9c26661d8cdf7527d765e79091e3489376797091c945e815b58ee8f1d70e47`。下一切片必须先提交并推送完整干净候选，再执行受限 cutover；远端有任何漂移立即停止。
- cutover dry-run 发现根 `node_modules` 是符号链接时，原 rsync 仅排除 `node_modules/`，会把本机绝对路径符号链接同步到 47。已在任何远端写入前停止，并同时排除 `node_modules` 与 `node_modules/`、增加治理断言；修复后 dry-run 不再出现该链接。
