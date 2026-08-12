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
- 发布前 dry-run 发现全树同步会删除 47 上 `.release-current` 与 `.release-staging` 恢复证据；已转向先修复同步排除规则并加入治理断言，未在该风险下执行 apply。
- cutover 主体已成功：线上 state/receipt/bundle 绑定提交 `67ed4db`，provenance 为 traceable，Web/API image 与 release ID 全部匹配。收尾因本地冻结清单只读导致临时目录删除失败，命令退出 1 并留下本次锁；已核对 owner、停止的 heartbeat、traceable state 与两容器健康后精确释放该锁，recovery clear。当前修复清理函数，避免临时清理失败遮蔽发布结果或阻断解锁。
- 清理修复的标准 state/docs-only 跟进发布又暴露既有协议缺陷：SSH 会丢失末尾空 bundle 参数，远端 state writer 因位置参数缺失失败。同步已完成但 runtime state/镜像未改，provenance 仍 traceable，脚本按设计写 recovery marker 并释放锁。修复同时规定 state/docs-only 只同步并验证健康/provenance，不生成一个未由镜像运行的新 release ID；实际运行时发布则用显式 sentinel 安全传输空字段。

## 交接

- 阻塞：无。
- 剩余风险：首次 cutover 的远端同步清理了已不被当前发布工具使用的 `.codex-whitelist-staging` 历史暂存目录；未触及 `.release-current`、`.release-staging`、备份、receipt、bundle、上传文件或业务数据。10 个 AppleDouble 元数据文件仍保留并告警。
- 用户验收目标：47 从不可追溯白名单组合恢复为可由 Git commit/bundle 完整还原的标准发布。
- 发布状态：已发布 `git-67ed4db97995_web-09d4fa0bebb1_api-2faf02ea46af`；provenance traceable、公网 health、容器、锁和 recovery 均通过。清理缺陷修复将用一次标准 state/docs-only 发布跟进。
- 准确下一步：提交清理缺陷和状态记录，走标准 baseline/deploy 零业务构建发布；随后按安全/数据正确性、业务数据流、后端架构、UI 四类重新排序下一切片。
