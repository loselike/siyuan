# Sunny 深度重构 Phase 42

- 状态：`published_47`
- 分支：`codex/sunny-refactor-phase42`
- 基线提交：`71ae784`
- 47 基线发布：`whitelist-5ff54e642bb396194f8e3bbd`
- 重评选择：P0 发布证据漂移已消除；当前最高价值转向 HTTP 审计可靠性。竞争候选仍包括 429 个输入入口的运行时校验、31,831/19,305 行双 Repository、2,372 行 DataController 与继续扩大前端路由自持数据。
- GitHub 参考：Vendure `JobQueueService` 把后台处理封装为显式队列、统一包装处理错误并保持调用方与后台执行解耦。Sunny 本轮只借鉴“显式后台执行边界、有限重试、集中错误处理”，不引入 Vendure 队列框架、不拆微服务、不新增数据库或 Redis 队列。
- 固定样本：一个已鉴权 POST 请求返回成功时，业务响应不等待审计写入，审计仍收到原 method/path/result/duration/IP/user-agent；每条审计事件生成稳定 audit ID，首次写入已提交但连接报错时重试不会重复；瞬时失败自动重试并成功；持续失败只记录脱敏告警，不改变原成功/失败响应。
- 行为保持：路由、响应、状态码、权限、数据库业务写入、审计 action/target/after 字段不变；仍排除登录；仍只审计写请求及 export/import。禁止全局 await、禁止让审计故障阻断业务、禁止新增 schema/outbox。
- 完成结果：提交 `09c5fe4` 新增显式 `HttpAuditWriter` port 与有界后台 dispatcher；最大 1,000 条进程内待处理、100/500ms 两次有限重试、持续失败只输出不含原始异常的告警。每条事件生成稳定 UUID，Prisma `upsert` 与 InMemory 去重保证未知提交结果下重试不重复；拦截器不再通过 `any` 直接依赖巨型 Repository。
- 效果证据：拦截器/dispatcher 定向测试 6/6，API typecheck、432 路由治理与安全契约 3/3 通过；发布 `whitelist-9fda300b81a046c50fa26700`。线上六文件 checksum、API 容器/内外 health、错误日志、镜像匹配、锁和 recovery 通过；生产数据库可回滚探针同一 ID 连续 upsert 后 `AUDIT_IDEMPOTENCY_COUNT=1`，并已删除探针记录。
- 复审与下一轮：复审先识别“提交成功但连接报错导致重复审计”并在发布前补幂等；阶段后全局重评时发现 47 Web 源码还包含其他已发布/并发来源的报价、设置、仓库页面差异及 4 个 `._*` AppleDouble 文件。API 基线与本轮一致、运行 Web/API 镜像均匹配当前 state，因此本轮不覆盖 Web。下轮先修发布指纹对 `._*` 噪声的口径并重新吸收 Web 基线，再比较输入校验试点与继续拆 DataController。
