# 47 云服务器 Docker 发布规范

本文档用于约束思远物流系统同步到 47 云服务器后的发布动作。47 按纯 Docker Compose 发布处理，服务器宿主机只依赖 Docker / Docker Compose，不依赖宿主机 `node`、`npm`、`npx`。

## 发布原则

- 47 是全局串行发布资源。Web、API、Shared、迁移和纯源码白名单共用同一把远端发布锁，不按服务拆锁；多个会话可以并行开发，但不得并行同步、构建、迁移、重启或写发布状态。
- 标准发布只允许从完整 Git 源码构建。禁止把既有镜像作为基底覆盖编译后 JavaScript、从 source map 反向恢复源码、复用未由当前源码生成的 Shared `dist`/声明文件，或复用旧 Prisma Client 来绕过类型检查。此类产物只能作为故障取证，不能成为新基线。
- 标准发布开始前先把候选分支推送到 `origin`，再用 `npm run release:47:baseline`：它要求发布协调 worktree 干净、HEAD 与同名远端分支精确一致，并核对当前提交的 Web/API/Prisma manifest 与 47 实际树完全一致，随后生成绑定 worktree、分支和祖先 commit 的 receipt。完成候选合并与验证后再次推送，并执行 `npm run deploy:47 -- --expected-release-id <记录值>`；远端 ID、receipt、远端分支 HEAD 或祖先关系任一不一致都会阻断。
- baseline 捕获与标准 deploy 都会先执行 `audit:47:provenance -- --require-traceable`。当前这类 `legacy-untraceable` 线上状态不能进入标准同步；首次切换到统一 Git 基线必须走单独审查的 bootstrap cutover，不能用普通 deploy 参数绕过。
- `npm run deploy:47 -- --lock-status` 只读查看当前锁、heartbeat 和 recovery-required 状态。锁目录异常残留时不得直接删除；先确认没有发布、构建或迁移进程，再由主推进会话处理。
- 代码可以同步到 `/opt/siyuan`，但依赖安装、构建、Prisma 命令都必须在 Docker 镜像或 Compose 服务里执行。
- 线上迁移只运行 `prisma migrate deploy`，通过 `db-migrate` 工具容器执行。
- 线上禁止运行 `prisma db push`、`prisma migrate reset`、`prisma:seed`、`demo:seed`。
- 线上禁止在发布链路中自动运行 `pricing:legacy:import`，也不得从 `/opt/quote-app` 或历史 JSON 副本自动导回旧报价数据；该命令只能人工显式传 `--source` 和 `--confirm` 后执行。
- 线上 `.env`、数据库密码、JWT 密钥、第三方 API key 只保存在服务器，不随代码同步，不写入 Git。
- Codex 不执行浏览器或截图验收，也不为验收配置登录旁路；`DISABLE_LOGIN_CAPTCHA`、开发会话接口开关、自动 Session 注入和相关 `VITE_*` 参数不得进入 47 `.env`、Compose 或生产 Web 构建。47 必须保持正常验证码、JWT 与 RBAC 链路，发现鉴权旁路配置时立即停止发布。
- 目标明确、边界清楚且本地验证通过的常规运行时代码默认连续发布到 47，无需逐次确认；破坏性迁移、真实付款、批量生产数据写入和不可逆清洗不在默认授权范围内。
- 发布前必须先根据 `git status --short`、`git diff --name-only` 和迁移目录自动判定发布范围，不默认全量构建 `db-migrate api web`。
- 只构建、重启受影响服务；只有 Prisma schema 或 migrations 变化才运行 `db-migrate`。
- 发布失败时先看实际失败点，不重新规划整条链路；优先从构建、迁移、容器重启、健康检查四段定位。

## 发布范围自动判断

发布会话必须先读取 `git status --short` 和 `git diff --name-only`，按文件路径判定本轮发布范围，并在执行发布命令前列出判断结果和命中原因。

| 范围 | 触发条件 | 47 构建/重启 |
| --- | --- | --- |
| `state/docs-only` | 只改 `.codex-state.md`、`docs/**`、`AGENTS.md` 或不影响运行时代码的说明文件 | 只同步；不构建、不重启 |
| `web` | `apps/web/**`、Web 依赖、只被前端使用的样式或 helper | `docker compose build web`；重启 `web` |
| `api` | `apps/api/src/**`、API 依赖、只被后端使用的服务端逻辑 | `docker compose build api`；重启 `api` |
| `api+migrate` | `apps/api/prisma/schema.prisma` 或 `apps/api/prisma/migrations/**` | `docker compose build db-migrate api`；运行 `db-migrate`；重启 `api` |
| `web+api` | 前后端都改，或 `packages/shared/**` 同时影响前后端，但 Prisma 无变化 | 只构建/重启 `api web`，不运行 `db-migrate` |
| `web+api+migrate` | 前后端和 Prisma 同时变化 | 构建 `db-migrate api web`；运行迁移；重启 `api web` |
| `full-no-migrate` | 根依赖、Dockerfile、Compose、发布脚本变化，但 Prisma 指纹不变 | 完整重建受影响运行服务，不运行 `db-migrate` |
| `full+migrate` | 全量影响面且 Prisma 指纹变化 | 完整构建、运行 `db-migrate`、重启受影响服务 |

`package-lock.json`、根 `package.json`、Dockerfile、Compose 和发布脚本变化默认视为可能影响多个服务；除非能明确只影响单个 workspace，否则走 `web+api` 或 `full`。如果包含 Prisma schema/migrations，禁止跳过 `db-migrate`。

## 标准同步命令

从本机同步代码时先 dry-run：

```bash
npm run sync:47
```

确认排除项和文件列表无误后，运行标准发布入口；`sync:47 --apply` 只允许由该入口在锁内调用，不再作为人工发布命令：

```bash
npm run release:47:baseline
npm run deploy:47 -- --expected-release-id <上一步记录的值>
```

`sync:47 --apply` 同时校验远端锁 token 和任务开始时的 `EXPECTED_RELEASE_ID`；缺失、锁属于其他发布或 baseline 已变化时直接拒绝。dry-run 不写远端。

同步脚本会排除 `node_modules`、构建产物、`.git`、`.release-backups`、`.codex-release-staging`、`tmp`、`scraped_docs`、`outputs`、`.env` 等目录、远端发布备份和敏感文件。标准发布只允许发布协调 worktree 在 captured baseline 匹配时用 `rsync --delete` 形成精确候选镜像，并在构建前核对远端实际 manifest；功能 worktree 与白名单流程不得使用全树删除。

同步与 Docker context 同时排除 `.release-manifests`、`.release-receipts`、staging、临时目录和配置取证目录，避免删除审计证据或把历史候选带入构建缓存。发布后用 `npm run audit:47:provenance -- --require-traceable` 校验 Git commit、运行镜像 ID、API 容器实际 release ID 与不可变 receipt；缺一项即视为不可追溯。

同步脚本还会排除旧亮崽报价源路径，例如 `data/quotes.json`、`inquiry_data/prices.json`、`europe-express-data/`、`europe-truck-data/` 和 `south-africa/*.json`。发布只同步代码和迁移，不携带旧报价数据副本。

## 一次性 legacy bootstrap

仅当 47 审计结果为 `legacy-untraceable`，且已经提交一份完整的 v2 冻结 manifest 时，允许主发布协调会话执行一次 bootstrap：

```bash
npm run deploy:47 -- \
  --expected-release-id <冻结 manifest 中的 REMOTE_RELEASE_ID> \
  --bootstrap-manifest docs/release-manifests/47/<冻结目录> \
  --confirm-bootstrap
```

bootstrap 仍要求候选 worktree 完全干净、HEAD 与同名 `origin` 分支一致，并持有全链路发布锁。锁内会重新捕获 47 的 release state、源码、Prisma、容器、镜像和运行产物；任一文件或 checksum 相对冻结 manifest 漂移都会停止，不能用新的线上值临时替换旧 manifest。

若明确不使用 GitHub，可在同一命令增加 `--source-bundle`。此模式不降低源码可追溯要求：脚本会在锁内从完全干净的 HEAD 生成 Git bundle，校验 bundle 只包含当前提交后，将只读 bundle 原子保存到 47 的 `.release-bundles/<commit>.bundle`。release state 与不可变 receipt 同时绑定 bundle 路径和 SHA-256；后续 provenance audit 会重新校验文件权限、checksum、bundle 完整性及其 HEAD commit。没有 origin 分支或 bundle 两者之一，发布仍会被拒绝。

bootstrap 不允许隐式数据库迁移。候选 migration 名称必须与生产 `_prisma_migrations` 的已完成集合完全一致，checksum 必须一致；历史遗留的三个 checksum 差异仅允许命中 `config/release/47-legacy-migration-checksums.tsv` 中同时绑定源码 hash 和生产记录 hash 的精确条目。未应用 migration 必须从候选移除并保留在冻结证据中，不能在 bootstrap 中顺带执行。

只有锁内基线复核、精确同步、Web/API 生产构建、容器重启、内外网 health 全部成功后，脚本才写入首个 `GIT_SOURCE_BUILD` receipt 和 release state。同步之后任何失败都会写 recovery-required 标记并关闭发布队列；bootstrap 成功后该入口自动失效，后续只能走标准 baseline/deploy 流程。

## 一键智能发布

日常发布固定执行：

```bash
npm run release:47:baseline
# 完成候选合并与验证后
npm run deploy:47 -- --expected-release-id <任务开始时记录的值>
```

脚本根据上一次成功发布记录的 Web、API、Prisma 运行时指纹自动判断范围。测试文件和文档可以同步到 47，但不会触发运行时镜像重建。标准发布发现 Prisma 指纹变化时只报告范围并阻断 apply；迁移必须改走 `deploy:47:whitelist`，由明确列出的 migration 目标形成 approved set，并在执行前确认线上全部 pending migrations 与 approved set 完全一致。开发闭环固定为最小本地安全门、差异检查、源码同步、受影响服务构建、必要迁移、重启、API/容器/代码验证和结果汇报。

线上验证失败不结束任务：必须定位根因、修改代码、只重跑受影响的最小本地安全门、重新精确发布并复验，直到 47 服务端和代码证据通过；若故障影响可用性、数据或权限安全，优先回滚/恢复后再修复。

任务因网络或流式响应中断后继续时，先重新读取当前 `AGENTS.md` 和任务状态，再恢复发布链路。旧会话中的“尚未发布”“等待浏览器截图”不构成阻断；本地安全门已通过的运行时代码必须实际尝试精确发布，并以发布命令或明确错误作为结果证据。

一键 apply 只允许运行时代码工作树干净的已验证候选；只要 Web、API、Shared、Prisma、根运行时依赖或 Docker 配置存在未提交修改，脚本就输出 `DIRTY_RUNTIME_COUNT` 并拒绝 apply。当前这类多任务脏工作树必须继续使用“以 47 当前文件为基线生成白名单补丁”的精确发布流程，不能通过全仓同步或跳过守卫绕开。

标准发布成功后写入只读 `.release-receipts/<release-id>.env`，记录 Git commit/branch、三类源码指纹和 Web/API 实际镜像 ID；实际发布时间保存在原子状态文件中，不参与 receipt 内容，保证“receipt 已写但 state 回包失败”时可安全重试。同一 release ID 的来源内容不同会直接阻断。白名单 CAS 仅用于紧急、边界明确的小范围恢复，状态必须标记 `SOURCE_MODE=WHITELIST_CAS`，不冒充 Git 可追溯标准发布；统一基线完成后，普通功能不得再以白名单替代干净 commit 发布。

幂等 receipt 只解决“状态已成功写入但客户端未收到返回”等确认重试。若新镜像已运行而 state 尚未更新，下一次标准 deploy 会因旧 state 与实际 image 不一致而阻断；此时必须按 recovery-required 流程回滚镜像，或在核实 manifest、容器和 health 后由单独的恢复动作补全 state，禁止直接重跑掩盖部分成功。

多任务脏工作树的白名单发布统一使用 checksum 条件更新，并在同一把锁内完成上传、构建和健康检查：

```bash
npm run deploy:47:whitelist -- \
  --scope web \
  --file /tmp/release-root/apps/web/src/example.tsx \
         apps/web/src/example.tsx \
         <生成候选时记录的远端 SHA-256>
```

可重复传入 `--file <candidate> <target> <expected-sha>` 发布多个文件；新文件使用 `MISSING`，同一目标不得重复声明。scope 由 targets 唯一推导并拒绝降级；Prisma 候选必须同时包含 schema 与 reviewed migration，线上 pending 集合必须与 approved migration 集合一致；`docker-compose.yml` 和无法静态确定影响面的基础设施文件直接阻断。工具先完成全部 checksum 预检，CAS 阶段失败会恢复已替换文件；构建/迁移/重启/health 阶段失败则写 recovery-required 标记并关闭后续发布队列。

禁止在白名单流程外手工 `scp` 运行时文件。若同一目标文件被其他会话修改，必须退出当前发布、基于最新远端或共同基线完成 Git 合并和重新验证，再生成新候选。

只查看范围而不发布：

```bash
npm run deploy:47 -- --dry-run
```

缓存异常或需要完整重建时：

```bash
npm run deploy:47 -- --full
```

`--full` 只强制重建 Web/API，不会把 `MIGRATION_REQUIRED` 改为 `true`；是否迁移仍只由 Prisma schema/migrations 指纹决定。dry-run 必须明确输出 `RELEASE_SCOPE` 和 `MIGRATION_REQUIRED`，两者与候选文件不一致时停止发布。

`.dockerignore` 排除测试、文档、截图和输出目录，避免非运行时文件使 Docker 构建缓存失效。

47 每周日 `03:30` 清理超过 7 天且未使用的 BuildKit 缓存，将缓存使用量控制在约 6GB，并至少保留 2GB 缓存。cron 调用仓库内的 `scripts/prune-47-build-cache.sh`，日志写入 `/var/log/siyuan-buildkit-prune.log`。清理任务不得执行 `docker system prune --volumes`，不得删除数据库、Redis 或上传文件卷。

## 按范围执行发布

以下动作全部由 `deploy:47` 或 `deploy:47:whitelist` 在全链路锁内执行，仅说明脚本行为，不是可复制的 SSH/Compose 操作入口。任何会话不得绕过入口直接运行远端 Docker 命令。

脚本按范围执行下列受控动作：`state/docs-only` 只做条件同步和状态推进；`web` 或 `api` 只构建、重启对应服务；含 `migrate` 的范围先构建迁移镜像并运行 `prisma migrate deploy`；`web+api` 只处理两个运行服务。所有动作前后都校验同一锁 token，成功状态在容器内与公网健康检查全部通过后才写入。

实现说明：

- `db-migrate` 使用 `Dockerfile.api` 的 `prisma-runner` target，默认命令是 `npm run prisma:migrate:deploy -w @siyuan/api`。
- `api` / `web` 使用 Compose 内的服务网络互通，`web` 通过 Nginx 将 `/api/` 代理到 `api:3001`。
- 如服务器没有宿主机 `npm`，属于预期情况，不应改为宿主机安装依赖。

## 发布后检查

```bash
docker compose ps
docker compose logs --tail=120 api
docker compose logs --tail=120 web
curl -I http://127.0.0.1:${APP_PORT:-8899}/
```

当前 47 服务器可能通过 `.env` 覆盖 `APP_PORT`，例如最近采证时 `docker compose ps` 显示 Web 为 `0.0.0.0:18899->80`。发布后健康检查以 `docker compose ps` 展示的实际端口为准，不要只按默认 `8899` 判断。

若需要检查 API，可优先看 `api` 日志中是否完成启动并监听 `3001`。如后续补充健康检查接口，再改为固定请求健康检查接口。

发布后验收只使用服务端和代码证据：

- 公共页面/API：公网与容器内 health、HTTP 状态、目标静态资源和构建产物标记。
- 鉴权 API：47 容器内短期 JWT、服务端本地接口或只读数据库查询；不调用验证码登录，不依赖浏览器会话。
- 权限与字段裁剪：使用对应角色验证允许路径和至少一个拒绝路径，敏感字段以后端响应为准。
- 数据写入：仅使用安全、可回滚的固定样本，并核对持久化状态和审计日志；可能污染真实业务数据时改用只读证据或先确认样本。
- UI 视觉：只向用户提供页面路径、变更区域和检查点，由用户在 47 人工验收；Codex 不做自动截图或浏览器操作。
- 验证失败：进入“修复 -> 最小本地验证 -> 重新精确发布 -> 重新线上验证”循环；同一代码状态不重复已通过的无关测试、构建或健康检查。

## 故障处理边界

- 构建失败：先看 `Dockerfile.api` / `Dockerfile.web` 的构建阶段日志，不在宿主机执行 `npm install`。
- 迁移失败：只排查 migration 文件、`DATABASE_URL`、Postgres 连通性；不要改用 `db push` 绕过。
- 服务未启动：查看 `docker compose logs api web postgres redis`，按容器日志处理。
- 数据问题：不要执行 reset/seed；需要人工确认备份和修复 SQL 后再处理。
- `RELEASE_RECOVERY_STATUS=required`：停止所有新发布。主推进会话根据 marker 的 phase、`.release-backups`、迁移记录、容器和公网 health 完成恢复；确认后执行 `npm run release:47:resolve -- --expected-marker-sha <lock-status 输出> --confirm-recovered`。checksum 已变化或仍持锁时命令拒绝清除。

## 后续优化方向

- 若 47 上 Docker build 明显变慢，下一步改为本地/CI 构建镜像、推送镜像仓库，47 只执行 `docker compose pull`、`db-migrate` 和重启。
- 若数据量上来后列表接口变慢，优先把运单、仓库包裹、财务审核接口改成服务端分页和筛选，配合现有查询索引使用。
