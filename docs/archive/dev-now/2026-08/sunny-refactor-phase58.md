# Sunny 深度重构 Phase 58

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`09fdb158d897d18146987dbe511fc4b774d20740`
- 47 基线：`git-3964a91a2636_web-3c24fed0279c_api-40e35302377a`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评

- P0 发布稳定性：Phase57 标准 Web 发布在新容器已运行、静态标记和 health 均正常后，SSH 仍无输出悬停约 45 分钟，成功 state/receipt 未落盘；人工中断后进入 recovery-required。相同 SSH 结束悬停此前也在 CAS 发布出现。
- P0 安全/数据：token 撤销和全局 DTO 校验会改变外部行为，继续保持待确认。
- P1 前端/UI：仓库看板空入口已解决；继续拆 5,121 行 WarehousePage 的即时收益低于恢复可重复发布能力。
- P1 后端维护性：Prisma/InMemory 仍为 31,997/19,416 行，但不影响当前系统每次交付的闭环。
- 选择：转向发布可靠性。固定样本为“远端命令持续 30 分钟没有业务输出，但 SSH 链路健康”和“远端阶段无进展达到上限”两条路径；前者必须保活，后者必须有界失败并留下可诊断阶段。

## 成熟参考与取舍

- OpenSSH Portable：https://github.com/openssh/openssh-portable （BSD）。采用客户端 `ServerAliveInterval` / `ServerAliveCountMax` 检测失联，而不修改服务器 sshd 全局配置。
- Moby BuildKit：https://github.com/moby/buildkit （Apache-2.0）。采用 plain progress 作为长构建可诊断输出；不引入独立 buildkitd/buildctl 或更换 Docker Compose 构建体系。
- Compose Specification：https://github.com/compose-spec/compose-spec （Apache-2.0）。继续以显式 health probe 和超时判断 readiness；不把“容器已启动”当作发布成功。

## 风险与行为保护

- 风险：过短超时误杀正常构建、超时后远端子进程继续运行、诊断输出泄露敏感信息。
- 保护：构建上限 30 分钟、迁移独立上限 15 分钟、整段远端运行上限 60 分钟、state 写入上限 5 分钟，均在 47 服务端终止客户端进程组；另以 OpenSSH `ChannelTimeout=session=300s` 限制通道连续无流量，覆盖远端 shell 已退出但后代进程仍占有 stdout/stderr 的 EOF 悬停，并在任何 mutation 前用 `ssh -G` 探测能力、缺失则 fail closed。迁移超时进入 recovery-required，禁止自动重跑，必须先核对生产迁移状态。只输出并持久化阶段名和时间，不输出 env/token；保留全局锁、镜像 fencing、health、receipt/state 原有顺序；不改业务源码、镜像内容、数据库或业务配置。Docker daemon 侧任务取消速度仍需在后续受控构建中观察，不宣称仅凭 shell 测试即可证明。

## 本地与 47 证据

- `release-ssh-policy.test.sh` 覆盖 SSH/SCP keepalive 参数、非法设置拒绝、锁 token 阶段写入、构建/迁移超时退出码、recovery `remote_phase` 和两条发布入口接线。
- Shell 语法、`git diff --check`、release image fence、完整治理、434 路由契约及安全契约 3/3 通过。
- 47 只读探针确认 uutils `timeout 0.8.0` 支持所用参数，真实超时退出 124；本机 OpenSSH 10.2 的 `ssh -G` 明确解析 `ChannelTimeout session=300s`；当前锁 free、recovery clear。
- 独立风险审查发现并修复“40 分钟累计预算可能在 migration 中途耗尽”的 P1；当前为 30 分钟 build + 15 分钟 migration + 15 分钟 restart/health 缓冲。

## 独立复核

- 风险审查第二轮发现“远端 shell 已退出、后代仍占 SSH channel”不会被服务端 timeout 或 keepalive 终止；已增加客户端 `ChannelTimeout` 与 `ssh -G` fail-closed 探测，并把全部 timeout 参数提前到任何 mutation 前校验。
- 最新复核未发现 P0/P1 发布阻断。残余 P2 仅为 Docker daemon 侧 BuildKit 取消速度需在首次受控运行时构建继续观察，本轮 governance-only 同步不触发构建。

## 发布结果与重评

- 提交：功能分支 `08c5c01`，发布协调分支 `25e83d7`，均已推送。
- 47 以 `state/docs-only` 精确同步 9 个治理/文档文件，未构建、未重启、未迁移，运行 release ID 保持 `git-3964a91a2636_web-3c24fed0279c_api-40e35302377a`。
- 线上三份关键脚本 checksum 与发布协调 worktree 一致；真实 uutils timeout 返回 124；provenance traceable、Web/API image match、API release ID match、容器 running、锁 free、recovery clear。
- 新一轮排序：安全/数据正确性方面 token 主动撤销与全局 DTO 校验仍会改变外部行为，继续待单独产品决定；高频数据流方面 `App.tsx` 仍有跨模块状态，但上一轮已验证的路由数据所有权策略可继续小步扩展；后端效率方面 Prisma Repository 仍约 32k 行，但已存在模块级 query/command port，继续结构切片的边际价值低于修复明确性能浪费。
- 当前最高价值候选转为仓库库存查询：`warehouse-inventory-query.repository.ts` 的分页请求仍对全部命中包裹执行一次 `findMany({ select: totalsSelect })` 再在进程内汇总，数据增长时每次列表刷新成本随全量匹配线性增长。下一步先固定响应总计/分页等价样本，再参考 Prisma 聚合与成熟后台查询实现，把合计下推数据库；不改筛选、权限、金额或响应字段。
- 下一候选参考：[Vendure OrderService](https://github.com/vendurehq/vendure/blob/master/packages/core/src/service/services/order.service.ts) 用同一查询边界返回分页 `items/totalItems`，[Medusa v2.14.2](https://github.com/medusajs/medusa/releases/tag/v2.14.2) 把大型目录筛选从应用层后处理下推索引引擎。Sunny 只借鉴“筛选/聚合尽量在数据源执行、响应契约保持稳定”，不引入 TypeORM、Medusa index engine 或其业务模型；许可证分别为 GPL-3.0 与 MIT，仅记录设计依据，不复制代码。

## 发布后回归与修复

- 第二次 baseline 读取已输出 receipt 后没有退出，远端锁 heartbeat 持续更新；实际根因是 `capture-47-release-baseline.sh` 仍有两处裸 SSH 读取，远端 shell 退出后 channel EOF 悬停，导致 cleanup trap 未执行。
- 已确认本机仅有本轮 baseline/deploy 两个进程组，47 无 build/migration/deploy 进程、phase 为 `lock-acquired`、recovery clear；向两个本轮进程组发送 TERM 后原 cleanup trap 按 token 正常释放，当前锁 free。
- 修复把 baseline 的 release ID 与 fingerprint 两次远端读取也接入 bounded remote + ChannelTimeout，并加入治理与定向接线测试；未删除或手工覆盖远端锁。
- 第一次有界读取重试发现远端 `timeout` 不能直接执行带管道的整段 shell 字符串；命令在 mutation 前失败、锁正常释放、旧 receipt 未更新。现改为 `bash -s -- <state path>` 与 `env SIYUAN_RELEASE_REPO_ROOT=... bash -s` 两种 argv 安全形态，治理精确要求两处且禁止退回字符串命令。
- 修复后真实 baseline 在约 26 秒内完整退出并写入绑定 `ef66b2a` 的 receipt，进程不存在、锁 free；随后 `state/docs-only` 再同步成功，运行 release ID/镜像/业务数据仍未改变。最终状态文档同步后再次完整执行 baseline/deploy，锁与 recovery 均正常释放。
