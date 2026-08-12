# Sunny 深度重构 Phase 44

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase44`
- 基线提交：`a311e40`
- 47 开始基线：`whitelist-f79893be417ad4571504b903`；吸收期间其他发布会话推进到 `whitelist-ee794a2e6bfa3d45ef3b28ef`，已重新捕获并纳入最终候选。
- 重评选择：P0 从继续拆业务模块转向“吸收 47 当前真实组合源码为 Git 候选”。Phase43 后本地与 47 的 488 个运行时文件仍有 20 个内容差异、2 个远端独有迁移；继续从旧 Git 树改业务存在覆盖已上线功能的确定风险。
- 竞争候选：P1 531 个运行时参数入口的输入校验；P1 31,835/19,305 行双 Repository 与 2,372 行 DataController；P2 前端自持数据扩展。它们均在基线吸收后重新排序。

## 成熟参考

- Git 官方 `git bundle`：https://git-scm.com/docs/git-bundle 。参考点是用完整 Git 对象和 refs 提供可校验、可离线恢复的来源；Sunny 已有 bundle 发布能力，本轮先恢复一个能提交和推送的准确源码快照，不把白名单目录冒充 Git 来源。
- Git Book `Git Objects`：https://git-scm.com/book/en/v2/Git-Internals-Git-Objects 。参考点是 commit/tree 对精确内容快照提供稳定身份；Sunny 本轮以远端运行时清单逐文件 checksum 为验收，不依赖修改时间或人工记忆。
- GitHub Releases：https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases 。参考点是 release 应绑定明确 tag/commit；Sunny 当前仍是 `WHITELIST_CAS`，本轮只建立候选 commit，不在未完成标准切换前宣称生产已是 Git provenance。
- 许可证/安全：上述为官方文档，仅用于设计核对，无代码复制；远端只读取运行时白名单，不读取 `.env`、上传文件、备份、密钥、数据或日志内容。

## 固定样本与行为保护

- 固定样本：`audit-47-source-drift.sh` 定义的 API/Web/Shared/Prisma 运行时集合，本地候选与 47 应达到 `REMOTE_COUNT=488`、`SAME=488`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`。
- 行为保持：20 个差异文件与 2 个迁移均逐字节取自 47 当前源码，不编辑其业务逻辑；不修改远端、不重建容器、不执行迁移、不写生产数据。
- 元数据边界：10 个 `._*` 继续排除于运行时基线，但由 stale-artifact 审计单独保留证据。

## 当前进度

- 已采集 v3 manifest：开始 release `whitelist-f79893be417ad4571504b903`，source manifest `304791dbbd902db0426fcdc07e9433ce80a32f10dacec1f383a3b91192763e23`。
- 首次吸收 20 个内容差异文件与 2 个远端独有迁移；验证期间检测到远端新增 8 个差异与 Web/API 重建，已停止旧快照验证、重新捕获 `whitelist-ee794a2e6bfa3d45ef3b28ef` 并吸收，未覆盖远端。
- 最终运行时 drift 已达到 488/488 全等；10 个 AppleDouble 元数据未复制、未删除。

## 验证

- 已通过：`bash scripts/audit-47-source-drift.sh --summary --fail-on-drift`。
- 已通过：Shared build/typecheck、Prisma client generate、API/Web typecheck；治理基线按当前 47 重建后 434 路由、no-new-debt、安全契约 3/3 通过。
- 已通过：两份远端独有迁移 checksum 与本地一致，线上 `_prisma_migrations` 均已完成；公网 API/Web 200。

## 交接

- 阻塞：无。
- 剩余风险：远端组合源码来自多批白名单发布；虽可证明与 `whitelist-ee794a2e6bfa3d45ef3b28ef` 的 488 个运行时文件逐字节相同，但其业务验收来源分散在独立任务记录。本轮不重新解释或改写这些业务规则。该发布的 state 仍缺 `SOURCE_MODE` 与镜像字段，provenance 正确报告 mismatch；需下一轮通过标准 Git 发布恢复，而不是继续白名单累加。
- 用户验收目标：后续重构从当前真实系统而非 09:29 旧快照继续，且不会覆盖 13:03 前上线的新功能。
- 效果证据：提交 `e7590a6` 与远端运行时 488/488 checksum 全等。
- 安全证据：三端类型、治理、安全契约、迁移只读核对与公网健康通过。
- 未验证项：标准 Git provenance 发布尚未执行；当前 state/镜像 mismatch 已被失败关闭。
- 发布状态：无需发布；候选源码已与 47 当前运行源码相同，发布会造成无效果重建。
- 稳定附件：`/tmp/siyuan-phase44-manifest/20260812-054158-whitelist-f79893be417ad4571504b903`
- 准确下一步：以 `e7590a6` 为唯一干净候选执行标准 Git source/bundle 发布，恢复 state、receipt 与运行镜像同源；若 47 再变化则先重捕获，禁止覆盖。
