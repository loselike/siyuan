# Sunny 深度重构 Phase 52

- 状态：`complete`
- 分支：`codex/sunny-refactor-phase52`
- 基线提交：`3998e1a`
- 用户验收目标：每个切片后重新审查和排序；系统业务逻辑不得改变。

## 本轮重评

- 候选：运行时输入契约、巨型 Repository、前端数据流、发布基线稳定性；当前选择运行时输入契约。
- 固定样本：`PUT /api/user-table-preferences/:key`。合法对象、缺失 value、数组、超限对象、循环对象必须保持现有结果与错误文案；无权限/未登录行为不变。
- 禁止：不全局开启 ValidationPipe，不新增依赖，不改数据库、路由、权限、偏好 key/value 口径、上限或前端请求格式。

## 成熟参考与取舍

- NestJS validation：https://github.com/nestjs/nest/tree/master/packages/common/pipes （MIT）。借鉴 Controller 边界显式 pipe/parser；不全局启用转换或白名单，避免历史请求契约变化。
- Medusa core-flows / validators：https://github.com/medusajs/medusa （MIT）。借鉴运行时 schema 与应用服务类型保持同源、逐模块接入；不引入其工作流和 schema 依赖。
- Sunny 当前已有稳定 Service 校验，采用“导出单一 parser，Controller 与 Service 共用”的最小方案，不形成第二套规则。

## 发布中发现的更高优先级问题

- 本轮 API 白名单构建虽已调用 release image helper，但容器实际运行 `siyuan-api:unknown` 且 `/api/health.releaseId=unknown`；state 仍写入 whitelist release ID。说明 Phase50 只验证了 build 后 tag identity，没有验证 Compose 启动后的容器引用，发布证据存在失败开放。
- 已立即暂停继续推广输入 parser，转为 P0 发布安全修复：白名单远端脚本在 build 前断言三个 release image env，在重启后逐服务比较容器 `.Config.Image` 与本 release 精确 tag，不一致即进入既有 recovery 机制；治理和离线 contract 固定该门禁。
- 参考仍为 Moby immutable deployment 与 Kubernetes fencing：真正的 fence 必须验证最终被消费的对象，不只验证准备阶段生成的对象。

## 发布故障复盘与二次重评

- 根因一：SSH 远端命令不会可靠保留空位置参数，空迁移列表使白名单 release ID 被错位解析为 `unknown`；改为显式 `__SIYUAN_EMPTY__` 哨兵并在远端解码，同时拒绝不符合 `whitelist-<24 hex>` 的 release ID。
- 根因二：Docker Compose recreate 偶发留下同项目、同服务、同目标镜像的 `Created` 容器并与规范名称冲突。参考 Docker Compose issue #11151（Apache-2.0 项目，https://github.com/docker/compose/issues/11151），只在首次 `compose up` 失败后删除满足“Created + 本次精确镜像 + `/opt/siyuan` working_dir + 同 service label”的残留，最多重试一次；不删除运行中、旧镜像或其他项目容器。
- 并发保护：47 上另一会话把 Prisma/InMemory 仓库权限语义推进后，本分支吸收其当前语义并新增今日收货历史日期权限 characterization；保留 Phase49 `MasterDataSnapshotSelection` 下推，不恢复旧实现。

## 完成证据

- 输入边界：`UserTablePreferenceController` 与 Service 共用同一 key/value parser；8 条测试覆盖合法对象、缺失、null、数组、字符串、key/体积上限及循环对象，原错误文案和状态语义不变。
- 行为保护：吸收并发上线的仓库权限语义，新增 2 条“有/无在仓权限时历史日期是否生效”characterization；master-data 选择下推保护 5 条继续通过。
- 本地安全门：相关定向测试 15/15、API typecheck、shell syntax、release fence contract、434 路由治理、安全契约 3/3、`git diff --check` 通过。
- 47：最终发布 `whitelist-ff8f39ebd83622d37b176689`；API 容器引用、health releaseId、state releaseId 三者一致，公网 API/Web 200，最近 API 日志无关键错误，锁 free、recovery clear。

## 完成后重评

- 安全/正确性：输入 parser 仅落地一个低风险代表路由，继续横向推广的边际收益暂低。
- 高频业务/前端数据流：App 全局数据流仍大，但当前没有新的生产错误证据，不抢占 P0。
- 架构/改造效率：巨型 Repository 仍是长期 P1；本轮并发源码覆盖说明“白名单发布对锁外写入只能 CAS 单点检测，无法保证 build 期间完整源码快照不变”，且失败后会留下部分更新源码，成为新的最高优先级。
- 结论：下一轮转向发布原子性，不继续沿输入 parser 扩面。代表样本为“build 期间目标或依赖源码漂移时，候选不得启动且已替换文件全部恢复”；参考 Kubernetes optimistic concurrency/resourceVersion 与 Git worktree/atomic ref 思路，只改发布治理，不改业务代码。
