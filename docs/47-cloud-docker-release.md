# 47 云服务器 Docker 发布规范

本文档用于约束思远物流系统同步到 47 云服务器后的发布动作。47 按纯 Docker Compose 发布处理，服务器宿主机只依赖 Docker / Docker Compose，不依赖宿主机 `node`、`npm`、`npx`。

## 发布原则

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

确认排除项和文件列表无误后执行真实同步：

```bash
npm run sync:47 -- --apply
```

同步脚本会排除 `node_modules`、构建产物、`.git`、`.release-backups`、`scraped_docs`、`outputs`、`.env` 等大目录、远端发布备份和敏感文件，避免向 47 传输无关内容或因 `rsync --delete` 删除远端备份。

同步脚本还会排除旧亮崽报价源路径，例如 `data/quotes.json`、`inquiry_data/prices.json`、`europe-express-data/`、`europe-truck-data/` 和 `south-africa/*.json`。发布只同步代码和迁移，不携带旧报价数据副本。

## 一键智能发布

日常发布优先执行：

```bash
npm run deploy:47
```

脚本根据上一次成功发布记录的 Web、API、Prisma 运行时指纹自动判断范围。测试文件和文档可以同步到 47，但不会触发运行时镜像重建。开发闭环固定为本地最小验证、差异检查、源码同步、受影响服务构建、必要迁移、重启、API/容器/代码验证和结果汇报；不插入浏览器验收。任一步失败都会停止并输出最近服务日志。

一键 apply 只允许运行时代码工作树干净的已验证候选；只要 Web、API、Shared、Prisma、根运行时依赖或 Docker 配置存在未提交修改，脚本就输出 `DIRTY_RUNTIME_COUNT` 并拒绝 apply。当前这类多任务脏工作树必须继续使用“以 47 当前文件为基线生成白名单补丁”的精确发布流程，不能通过全仓同步或跳过守卫绕开。

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

在 47 云服务器上按判定范围执行。下面是常用命令模板：

### `state/docs-only`

只执行 `npm run sync:47 -- --apply`，不进入 Docker 构建、迁移和服务重启。

### `web`

```bash
set -e
cd /opt/siyuan

docker compose build web
docker compose up -d --remove-orphans web
docker compose ps
```

### `api`

```bash
set -e
cd /opt/siyuan

docker compose build api
docker compose up -d --remove-orphans api
docker compose ps
```

### `api+migrate`

```bash
set -e
cd /opt/siyuan

docker compose build db-migrate api
docker compose --profile tools run --rm db-migrate
docker compose up -d --remove-orphans api
docker compose ps
```

### `web+api` 或 `full-no-migrate`

```bash
set -e
cd /opt/siyuan

docker compose build api web
docker compose up -d --no-deps --remove-orphans api web
docker compose ps
```

### `web+api+migrate` 或 `full+migrate`

```bash
set -e
cd /opt/siyuan

docker compose build db-migrate api web
docker compose --profile tools run --rm db-migrate
docker compose up -d --remove-orphans api web
docker compose ps
```

说明：

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

## 故障处理边界

- 构建失败：先看 `Dockerfile.api` / `Dockerfile.web` 的构建阶段日志，不在宿主机执行 `npm install`。
- 迁移失败：只排查 migration 文件、`DATABASE_URL`、Postgres 连通性；不要改用 `db push` 绕过。
- 服务未启动：查看 `docker compose logs api web postgres redis`，按容器日志处理。
- 数据问题：不要执行 reset/seed；需要人工确认备份和修复 SQL 后再处理。

## 后续优化方向

- 若 47 上 Docker build 明显变慢，下一步改为本地/CI 构建镜像、推送镜像仓库，47 只执行 `docker compose pull`、`db-migrate` 和重启。
- 若数据量上来后列表接口变慢，优先把运单、仓库包裹、财务审核接口改成服务端分页和筛选，配合现有查询索引使用。
