# Sunny 深度重构 Phase 53

- 状态：`complete`
- 分支：`codex/sunny-refactor-phase53`
- 基线提交：`90a7274`
- 用户验收目标：每个切片后重新审查和排序；系统业务逻辑不得改变。

## 本轮重评

- 候选：发布源码快照原子性、巨型 Repository、前端数据流、输入 parser 扩面；转向发布源码快照原子性。
- 固定样本：白名单替换一个源码文件后，build 期间任何运行时源码 manifest 漂移都必须阻止启动候选容器，并恢复本批已替换文件；无漂移时发布结果不变。
- 禁止：不改业务代码、数据库、Compose 服务结构、权限、接口或线上数据；不删除非本批文件。

## 成熟参考与取舍

- Kubernetes API optimistic concurrency / `resourceVersion`：https://github.com/kubernetes/kubernetes （Apache-2.0）。借鉴“读取版本、条件更新、冲突失败”的原则；不引入 Kubernetes 或其数据模型。
- Git refs/files transaction： https://github.com/git/git （GPL-2.0）。借鉴候选快照与最终切换绑定、失败时保持旧可用状态；不复制实现代码。
- Sunny 采用发布 manifest 前后逐字节比较和本批备份回滚；继续保留全局锁，但不把锁当作锁外写入的证明。

## 完成证据

- 白名单在本批 CAS 后捕获 Web/API/migration 三个完整运行时 fingerprint；Docker build 完成后与启动容器前各复核一次，任一漂移以 `WHITELIST_SOURCE_SNAPSHOT_DRIFT` 失败关闭。
- 失败清理从“仅 CAS 阶段”扩为“本批源码直到 state 成功落盘”；build、迁移、重启、health 或 state 失败均使用已验证备份恢复本批目标，其他文件不删除。
- 新增独立 verifier 与离线 fixture：无漂移通过，API 文件变更后被拒绝；release fence contract、shell syntax、434 路由治理和安全契约 3/3 通过。
- 47 发布 `whitelist-fb432e227bb8e14a64e02d68`：构建输出两次 `WHITELIST_SOURCE_SNAPSHOT_OK`，容器镜像、health/state release ID 一致，公网 API/Web 200，锁 free、recovery clear。

## 完成后重评

- 安全/数据正确性：受保护附件已由鉴权 Controller 下载，未发现比当前发布残余风险更高的新 P0。
- 高频业务/前端数据流：`App.tsx` 3,362 行、`apiClient.ts` 2,567 行、`styles.css` 13,220 行，仍是 UI 与需求速度的主要长期瓶颈，但本轮没有新增线上错误证据。
- 后端架构：Prisma/InMemory Repository 仍为 31,997/19,416 行，是长期 P1；继续单纯拆文件的即时收益低于修复已证实的发布恢复缺口。
- 当前最高优先级：完整 fingerprint 能检测未声明源码漂移，但失败回滚只恢复本批声明目标，锁外写入的未声明文件仍保留；若直接自动恢复它们会覆盖其他会话，不能盲目实施。下一轮应停止继续加自动删除，转为只读审查标准 Git 发布重新成为默认路径的阻断因素，再决定是修发布治理还是转向前端数据层。
