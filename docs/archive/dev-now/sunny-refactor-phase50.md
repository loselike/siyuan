# Sunny 深度重构 Phase 50

- 状态：`complete`
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

## 完成结果

- `docker-compose.yml` 为 API、Web、db-migrate 增加可选的发布镜像名；未设置变量时仍使用原镜像名。
- 新增 `scripts/lib/47-release-images.sh`，每次发布按 release ID 导出唯一镜像 tag，并在 build 后记录镜像 identity，在迁移、启动前再次比较；不一致时以 `RELEASE_IMAGE_FENCE_MISMATCH` 失败关闭。
- 标准发布与白名单发布均接入同一 fencing；治理扫描要求两个入口持续接入，离线 shell contract test 覆盖两次发布隔离与篡改拒绝。
- 本地 shell 语法、fencing contract、434 路由治理与安全契约 3/3、`git diff --check` 全部通过。
- 已发布 47：`git-62ed598b7dbe_web-fa6197b29198_api-d3d4313a1e04`，Git bundle provenance 指向 `62ed598b7dbeeaf7b3360aa4ed572af80f179ccc`；API/Web 分别运行本 release 的唯一 tag，镜像与 state 匹配，公网 health/Web 200，错误日志无新增，锁 free、recovery clear；线上 fencing contract 通过。

## 切片后重审与重新排序

- 已复查最初 P0：受保护附件已 deny-by-default；密码已使用带盐 scrypt，旧 SHA-256 仅用于登录后 CAS 升级；水单分配已使用行锁和 Serializable 事务。这些旧扫描结论不再是当前缺口。
- 当前最高价值候选改为“JWT 即时失效与会话版本校验”：现有 access token 固定 8 小时，Guard 验签后不核对账号禁用、角色变化或密码修改后的会话版本。该项安全收益高，但会新增会话失效语义，不能混入等价重构；下一阶段必须先建立 47 当前允许/拒绝 characterization、参考 Keycloak/Cerbos 的服务端决策点，再把产品行为边界单列确认。
- 若继续严格限定为零业务行为变化，则下一安全切片应先提取 auth session validation port 与 characterization，不启用即时撤销；UI/数据层重建仍作为另一路候选，在每次重新排序时与安全债务比较。
