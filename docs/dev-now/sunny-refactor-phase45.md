# Sunny 深度重构 Phase 45

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase45`
- 基线提交：`9d98a90`
- 47 基线：`whitelist-ee794a2e6bfa3d45ef3b28ef`
- 重评选择：P0 恢复标准 Git provenance。当前 Git 候选已与 47 的 488 个运行时文件一致，但生产 state 缺来源/镜像字段；普通标准发布和旧 8 月 10 日 bootstrap 都会失败关闭。
- 竞争候选：运行时 DTO 校验、巨型 Controller/Repository、前端数据流。本轮只恢复后续所有切片所依赖的发布证据。

## 成熟参考与取舍

- Git `git bundle`：https://git-scm.com/docs/git-bundle 。采用可独立校验、可离线恢复的完整 Git 对象包；不依赖服务器 GitHub 连通性。
- GitHub Releases：https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases 。采用 release 必须绑定明确 commit 的原则；Sunny 同时绑定运行源码指纹、镜像、receipt 和 bundle，强于仅记录 tag。
- 不引入新发布平台、不改 Compose、不碰业务代码；只为当前已吸收的真实 47 基线增加一次严格 cutover。

## 固定样本与行为保护

- 固定样本：锁内重新采集 v3 manifest，`release-state.env`、`source-files.tsv`、`prisma-files.tsv`、`containers.tsv`、`images.tsv`、`runtime-artifacts.tsv` 必须与已提交冻结清单逐字节相同。
- migration：候选与生产已应用集合必须完全一致；checksum 仅允许既有三条精确例外。
- 发布结果：Web/API 强制重建后，state 和只读 receipt 必须绑定同一 commit、Git bundle、三类源码指纹及两份运行镜像。
- 禁止：不改变业务接口、权限、状态、数据或迁移；并发变化时同步前退出。

## 当前进度

- 已采集 v3 清单 `docs/release-manifests/47/20260812-055838-whitelist-ee794a2e6bfa3d45ef3b28ef`，source tree `6c3d6498f7859b9b7cf8bdb87f671e7066542ee19c8c9ebf128ca210e1a70563`。
- 已新增 `--current-baseline-cutover`：必须与 manifest、显式确认和 source bundle 组合使用；traceable 状态不可重复进入。

## 验证

- 已通过：`bash -n scripts/deploy-47.sh`、`git diff --check`、完整 `npm run governance:check`（434 路由、no-new-debt、安全契约 3/3）。
- 已通过：冻结清单 `bundle.sha256` 内 8 个成员 checksum 自校验；格式 v3、source 507 文件、远端 source tree checksum 均已记录。
- 对抗式审查：current cutover 必须同时提供 committed manifest、显式确认和 Git bundle；traceable 状态拒绝重复 cutover；锁内比较 6 份运行证据；migration 集合/checksum 仍走旧严格门和三条固定例外；任何同步后失败进入 recovery-required。

## 交接

- 阻塞：无。
- 剩余风险：47 仍有其他发布会话；锁内 manifest 漂移门是发布前最后保护。
- 用户验收目标：47 从不可追溯白名单组合恢复为可由 Git commit/bundle 完整还原的标准发布。
- 发布状态：未发布。
- 准确下一步：完成本地审查并推送；再在全局锁内执行 cutover 和线上 provenance 验证。
