# Sunny 深度重构 Phase 53

- 状态：`in_progress`
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
