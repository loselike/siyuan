# 47 智能增量发布与 BuildKit 缓存治理

- 状态：`complete`
- 范围：仅发布工具、Docker 构建上下文和 47 运维配置，不修改业务逻辑。

## 已完成

- 新增 `npm run deploy:47`，基于上次成功发布的 Web、API、Prisma 指纹判断构建、迁移和重启范围。
- 支持 `--dry-run` 和 `--full`；发布失败停止并输出 API/Web 最近日志。
- 发布后校验 API 就绪、容器与实际入口的 Web `index.html` 一致，以及公网 API/Web 可访问。
- `.dockerignore` 排除测试、文档、截图和输出目录，测试改动不再使生产镜像缓存失效。
- 47 配置每周日 03:30 BuildKit 缓存清理，清理超过 7 天未使用缓存，目标上限 6GB、保留 2GB；不清理镜像卷和业务数据。

## 验证

- 本地三个 Bash 脚本通过 `bash -n`，`package.json` 解析和 `git diff --check` 通过。
- 智能 dry-run 对当前差异判断为 `web=true api=true migrate=false`。
- 47 Docker 构建上下文验证测试文件已被排除。
- 缓存清理脚本以无删除参数试运行成功，cron 已安装且保留原有任务。
- 47 `api/web/postgres/redis` 正常，API 健康检查通过。

## 注意

- 2026-07-11 首次正式智能发布已完成：自动判断 `web+api`、无迁移，发布录单包裹确认选择、真实理货完成标识、水单客户下拉和运营工作台列名调整。
- 首次发布后修复远程健康检查吞掉后续指纹写入，以及 `.DS_Store/tsbuildinfo` 误入指纹的问题；二次 dry-run 和实际 no-op 均正确返回 `web=false api=false migrate=false`。
