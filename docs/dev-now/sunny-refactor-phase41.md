# Sunny 深度重构 Phase 41

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase41`
- 基线提交：`9255e22`
- 47 基线发布：`whitelist-b451c554dbd946c6d76e8bd9`
- 本轮重评：P0 候选为 47 发布状态与 Docker 运行镜像标识失配；P1 候选为 HTTP 审计 fire-and-forget、429 个运行时输入入口缺少统一校验、51,136 行双 Repository 与 2,372 行 DataController；P2 候选为继续前端路由自持数据扩展。本轮选择先修复发布证据镜像身份，不改业务运行时。
- 已证实根因：Docker BuildKit/Compose 在当前存储模式下以 OCI image index 作为 `siyuan-web:latest`，而容器 `.Image` 是其中的可运行 platform manifest/config 身份；后续 build 重指 tag 时，已运行容器仍服务正常，但旧 `.Image` 对象可被移除，导致 manifest 采集 `No such image`。发布状态存容器 `.Image`，audit 也只比较 `.Image`，无法稳定表示实际运行的 platform manifest。
- GitHub 参考：Moby BuildKit 官方文档明确 attestations 附着在 OCI image index，根 index 可包含可运行 platform manifest 与 attestation manifest；Docker Buildx 官方文档提供 `--iidfile` 和 `--metadata-file` 作为构建结果身份输出。Sunny 不引入镜像仓库或改发布架构；本轮只改为记录/比较容器 `ImageManifestDescriptor.digest`，老 Docker 无该字段时保守回退 `.Image`。
- 固定样本：对一个容器 inspect JSON，当 `.Image=sha256:config`且 `.ImageManifestDescriptor.digest=sha256:manifest` 时，发布状态、audit 与默认运行清单统一取 manifest digest；当 descriptor 缺失时回退 `.Image`。默认运行清单升级为 v3，直接从容器 inspect 保存 manifest/config 双重证据，不再对可能已被清理的 image config 对象执行 `docker image inspect`；历史 bootstrap 显式请求 v2，保持冻结清单的逐字节恢复校验能力。
- 禁止范围：不重启 47 服务、不覆盖源码、不修改数据库或发布 state；本轮只加固发布脚本/验证器，完成后再重新全局排序。
- 完成结果：提交 `8dda79c` 统一 release state、provenance audit 和 v3 runtime manifest 的容器运行 manifest 身份；复审后提交 `354c8f8`，为冻结的 legacy bootstrap 保留显式 v2 清单模式。47 分两批 `scope none` CAS 发布，最终 release `whitelist-5ff54e642bb396194f8e3bbd`，未构建、未重启服务、未修改业务源码或数据。
- 效果证据：线上 `WEB_IMAGE_MATCH=true`、`API_IMAGE_MATCH=true`；v3 manifest 成功采集 4 个容器与 4 个运行镜像身份，不再出现 `No such image`；公网 health 200，发布锁 free、recovery clear。既有 `SOURCE_MODE=WHITELIST_CAS` 与 API `releaseId=unknown` 未改变，仍不是 Git 同源构建。
- 阶段后重评：安全/正确性候选为 HTTP 审计异步放任且吞掉落库失败；改造效率候选为 31,831/19,305 行双 Repository 与 2,372 行 DataController；输入契约候选为 429 个参数入口无统一运行时校验；前端候选为继续扩大路由自持数据。选择“转向审计可靠性”，但先冻结现有响应不等待审计、审计失败不改变业务响应的线上契约，只做可观测且可重试的最小切片，不直接全局 await、不一次性引入 outbox。
