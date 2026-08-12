# Sunny 深度重构 Phase 43

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase43`
- 基线提交：`641b8d3`
- 47 记录基线：`whitelist-9fda300b81a046c50fa26700`（已被 13:03 的 Web/API 容器替换，状态文件未同步）
- 重评选择：从继续拆业务模块转向 P0 发布证据治理。当前 47 的 Web/API 运行镜像与 `.siyuan-release-state` 均不匹配，且源码树含 10 个 `._*` AppleDouble 文件；在基线不可置信时继续业务重构会放大覆盖和回滚风险。
- 竞争候选：P1 429 个运行时输入入口缺少统一校验；P1 31,831/19,305 行双 Repository 与 2,372 行 DataController；P2 继续扩大前端路由自持数据。前三者本轮不改，待发布基线恢复后重新排序。

## 成熟参考

- GitHub `github/gitignore` 的 `Global/macOS.gitignore`：https://github.com/github/gitignore/blob/main/Global/macOS.gitignore 。适用点是把 AppleDouble/Finder 元数据视为操作系统产物，而非应用源码。Sunny 采用同类忽略边界；不照搬整份模板，避免改变已有业务文件范围。许可证：CC0-1.0，当前用途仅为设计核对，无代码复制风险。
- Docker 官方 `.dockerignore` 文档：https://docs.docker.com/build/building/context/#dockerignore-files 。适用点是在构建上下文入口排除无关文件，避免无关元数据改变缓存、上下文和可追溯结果。Sunny 已有 `.dockerignore`，本轮补齐发布指纹与 rsync 入口；不改变镜像构建内容、Compose 或服务拓扑。
- Moby `patternmatcher`：https://github.com/moby/patternmatcher 。适用点是忽略规则属于输入边界，应在进入构建/发布清单前统一处理。Sunny 不引入依赖、不复制实现，只保持自身 shell 规则一致。

## 固定样本与行为保护

- 固定样本：同一最小 API/Web/Shared/Prisma 运行时树，加入根目录和嵌套目录的 4 个 `._*` 与 1 个 `.DS_Store` 后，Web/API/migration 三个指纹逐字节不变；加入一个真实 Web `.tsx` 文件后，仅 Web 指纹改变。
- 行为保持：不修改业务路由、请求响应、权限、状态、金额、持久化、审计、前端入口或数据库；不删除 47 现有 AppleDouble 文件；不吸收或覆盖 13:03 并发来源的业务源码。
- 失败关闭：即使 `SOURCE_MODE=WHITELIST_CAS`，运行镜像与状态记录不一致时也必须优先报告 `mismatch`，不能被较弱的 `non-git-source` 分类掩盖。

## 当前进度

- 已修改便携指纹与标准发布重复实现，统一忽略 `._*`/`.DS_Store`。
- 已修改 exact-tree rsync，禁止传输或合成 AppleDouble 元数据。
- 已修改 provenance 判断优先级，镜像漂移优先于白名单来源分类。
- 已修改白名单发布入口：默认在任何源码替换前校验 state 与运行镜像一致；不一致即失败关闭。仅允许用显式 `--adopt-current-runtime` 对 `scope none` 且全部为 `scripts/*` 的治理发布吸收已复核的当前运行镜像，禁止借此发布或重建业务代码。
- 发布后复审发现白名单 `scope none` 本就不会重建 API，若把 API 容器内旧 release ID 也设为所有后续发布的前置门，会永久阻断正常 Web-only/治理发布；已将前置门收窄回“运行镜像身份必须匹配 state”。API release ID 仍独立输出，不被误当成镜像基线一致性的替代证据。
- 已新增确定性 shell 回归测试与治理静态门禁。

## 验证

- 已通过：`bash -n`（5 个相关 shell 脚本）。
- 已通过：`bash scripts/release-fingerprint-artifact-filter.test.sh`。
- 待执行：`npm run governance:check`、`git diff --check`、对抗式人工复审。

## 交接

- 阻塞：47 在 2026-08-12 13:03 被其他来源重建 Web/API，但 `.siyuan-release-state` 仍停留在 09:29 的 Phase 42。发布本轮脚本会通过旧白名单流程重写状态，从而把未知组合源码默认为新基线；在来源确认前不得这样做。
- 剩余风险：历史 `._*` 仍留在 47，由 source-drift 审计继续显式报告；本轮只让它们不再污染发布指纹，不执行删除。
- 用户验收目标：发布指纹只随真实运行时代码变化，运行镜像与状态漂移必须被清楚阻断。
- 效果证据：固定样本测试证明元数据不改变三类指纹，真实 Web 文件仍只改变 Web 指纹。
- 安全证据：待完成治理检查；全程未改业务代码或线上数据。
- 未验证项：新脚本尚未发布 47，因现有生产发布状态与运行镜像不一致。
- 发布状态：`未发布（生产基线来源冲突，失败关闭）`
- 稳定附件：无
- 准确下一步：完成治理检查与复审；确认 13:03 发布来源后，以当前实际源码建立明确基线，再通过全局锁发布本轮脚本并在线复验。
