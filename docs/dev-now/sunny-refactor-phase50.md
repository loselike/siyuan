# Sunny 深度重构 Phase 50

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase50`
- 基线提交：`1ad882d`
- 用户验收目标：每个切片完成后重新审查和排序；业务逻辑不得改变。

## 本轮重评

- 选择：47 发布构建与容器切换的 fencing。Phase49 期间另一任务在全局锁外执行 `docker compose build api web`，共享 `latest` 标签被并发改写，持锁发布进入 recovery。
- 固定样本：两个不同 release ID 即使并发构建，也分别得到唯一 image tag；持锁发布只启动自己的 tag，启动前 image ID 与构建后记录一致；无 release tag 时 Compose 保持当前默认镜像名。
- 禁止：不改业务代码、接口、数据库、权限、状态或线上业务数据；不以本轮为由删除其他任务的镜像或进程。

## 成熟参考与取舍

- Moby immutable digest deployment：https://github.com/moby/moby/issues/29676 （Apache-2.0）。借鉴把部署对象绑定到不可变 digest/tag，而不是在启动时重新解析共享滚动标签。
- Kubernetes client-go leader election：https://github.com/kubernetes/client-go/blob/master/tools/leaderelection/leaderelection.go （Apache-2.0）。其源码明确说明 lease 不保证单一执行者（不等于 fencing）；Sunny 保留远端队列锁，再补“本 release 唯一镜像 + image ID CAS”。
- Docker Compose 并发缺陷案例：https://github.com/docker/compose/issues/10468 （Apache-2.0）。把同一 project 的并发 build/up 视为必须失败关闭的真实风险，不依赖 Compose 自身序列化。
- Sunny 单机 Compose 不引入 Kubernetes/registry；只借鉴 fencing 和不可变部署引用，保持现有运维模型。

## 行为保护

- Compose 默认值继续为 `siyuan-api` / `siyuan-web`，日常本地命令不变；只有发布脚本设置 release-specific image name。
- API、Web、db-migrate 继续使用原 Dockerfile、build args、health 和迁移顺序；只改变构建产物名称和启动引用。
- 新增离线 shell contract test 模拟两次发布，验证 tag 隔离、build 后 image ID 捕获、up 前 CAS 与失配拒绝。
