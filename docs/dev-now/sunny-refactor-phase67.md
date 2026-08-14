# Sunny 深度重构 Phase 67

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase67`
- 基线提交：`970b0b1`
- 用户验收目标：每轮重新扫描并选择最高 ROI；所有既有业务逻辑保持不变。

## 本轮重评

- 当前发现：47 在 Phase 66 后又连续接收了字段总规则、市场应付新增、理货问题件、已完成理货取消移除和在仓待理货口径等已验收白名单发布。当前运行版本为 `whitelist-7f0e06a3cde4beaf3cea0d55`；Web/API 镜像与 release state、API health release ID 一致，但 `SOURCE_MODE=WHITELIST_CAS`，没有 Git commit、branch 或 bundle provenance。
- 候选排序：P1 恢复当前运行源码的 Git 可追溯基线；P1 继续 Repository 查询下推；P1 前端路由数据所有权；P2 UI 设计系统。发布来源影响所有后续变更的覆盖、回滚和行为等价证据，本轮先恢复来源基线。
- 固定样本：冻结清单中的 537 个运行时文件必须与拉取内容逐文件 size/SHA-256 相同；候选运行时审计必须得到 `SAME=518`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`。不重新解释或改写任何业务规则。

## 成熟参考与取舍

- [Git bundle](https://git-scm.com/docs/git-bundle)：采用可离线校验完整 Git objects/refs、并能恢复明确 commit 的原则；Git 文档与实现为 GPL-2.0。Sunny 使用现有 source-bundle/receipt 链路，不复制 Git 实现代码。
- [SLSA provenance](https://github.com/slsa-framework/slsa)：采用产物必须绑定不可变源码身份和构建证据的原则；规范仓库使用 Community Specification License 1.0。Sunny 不引入新的构建平台，只把当前已运行的组合源码提交为准确 Git 快照后重新构建。
- [Moby](https://github.com/moby/moby)：沿用不可变镜像身份与运行容器证据分离的原则；Apache-2.0。Sunny 保留 Docker Compose 单机部署，不引入 Kubernetes 或镜像仓库。
- Sunny 差异：47 源码目录不是 Git checkout，多个已审核白名单共同形成当前运行树。真实基线只能由 v3 清单和当前远端逐字节校验建立，不能把旧 Phase 66 commit 冒充当前来源。

## 行为保护

- 已冻结 v3 清单 `docs/release-manifests/47/20260814-045436-whitelist-7f0e06a3cde4beaf3cea0d55`：release-state SHA-256 `3bfe4c2fa515cba4dbb638227139e4062362066616def5a375891a96a3534365`，source tree manifest SHA-256 `89a9e47bc51495d5888f0f86a38bda580bc13a8a1ebefc7fbc3cec0f94caaffb`。
- 拉取前后在同一受限 SSH 调用内校验 release ID 和 state checksum；537/537 文件与冻结 size/SHA-256 相等后才覆盖候选。当前 source-drift 为 518/518 相等；22 个 AppleDouble/历史备份文件继续只告警、不进入候选。
- 测试保护补齐：全局字段总规则覆盖查询控制键、敏感输出/写入和付款凭证；理货问题件覆盖筛选与 Repository port；在仓汇总覆盖待理货任务 SQL；市场应付覆盖仅提交权威 `shipmentId`；旧已完成理货取消入口不恢复。
- 发布只允许 `--current-baseline-cutover + committed v3 manifest + --source-bundle`。锁内任何源码、state、Prisma、容器、镜像或运行产物漂移都必须在同步前停止；不执行新迁移，不写生产业务数据。

## 当前证据

- 当前 47 provenance：`non-git-source`，原因 `whitelist-cas-is-not-a-git-source-build`；但 Web/API image match 和 API release ID match 均为 true，服务不是故障状态。
- 逐字节吸收：537/537 文件通过冻结 size/SHA-256；运行时审计 `SAME=518`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`。
- Shared/API/Web 类型检查已通过；API 定向保护 17/17、Web 定向保护 2/2、434 条路由治理和完整 `governance:check` 已通过。原生命周期测试引用已移除的 completed-cancel port，已按当前 47 契约改为 problem restart characterization。
- 生产依赖审计仅剩 `body-parser <1.20.6` 的 1 个 low 风险 DoS 公告，没有中高危；本轮不以未经审查的 `npm audit fix` 改动依赖树。

## Review 结论与债务

- OCR 确定性预览识别 40 个变更文件、26 个可审查文件；本机未配置 OCR LLM，未取得外部模型评论，改以逐文件对抗式人工审查和定向测试闭环。未发现会让“当前 47 等价重建”产生新行为的 P0/P1 阻断。
- 权限总规则、市场应付和理货问题件均是当前 47 已运行并经原任务验收的业务变化；Phase 67 只冻结并提交这些事实，不把它们重新解释为本轮重构设计。
- 治理债务基线随当前生产事实上调：Prisma/InMemory Repository 各新增 3 个公开方法，行数上限分别增加 146/44 行，`WarehousePage` 上限增加 20 行；`apiClient` 行数上限反而下降 4 行。增量已归因但未在 provenance 切片内顺手拆分。
- 已完成理货取消入口、Service 和 port 已从当前 API 移除，但两套巨型 Repository 仍保留不可达的旧实现；删除它们需要单独证明无内部调用，不能混入本次来源恢复。
- Prisma 的“退回重理”会检查集运关联；InMemory 适配器缺少完全同构的关系数据，测试适配器与生产适配器仍有边界差异。当前生产路径安全，但后续应以独立 characterization 判断是否补齐，而不是在本轮猜测业务口径。
- 全局字段总规则使用通用字段名/上下文判定；本轮新增的 `costScope` 回归证明已发生过误伤风险。它是发布后重新排序时的安全候选，不影响本次逐字节等价 cutover，但不能据当前 3 条单测宣称所有接口数学全覆盖。

## 下一步

1. 运行全局字段、仓库聚合/问题件、生命周期与市场应付定向回归。
2. 执行治理门、迁移集合只读核对和 Review；提交并推送干净候选。
3. 锁内执行 current-baseline cutover，恢复 Git bundle provenance；线上复核 health、镜像/state、业务只读样本、锁和 recovery。
4. 发布后重新扫描安全/数据、前端数据流、后端架构、UI 四类候选并重新排序。
