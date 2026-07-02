# 47 云服务器 Docker 发布规范

本文档用于约束思远物流系统同步到 47 云服务器后的发布动作。47 按纯 Docker Compose 发布处理，服务器宿主机只依赖 Docker / Docker Compose，不依赖宿主机 `node`、`npm`、`npx`。

## 发布原则

- 代码可以同步到 `/opt/siyuan`，但依赖安装、构建、Prisma 命令都必须在 Docker 镜像或 Compose 服务里执行。
- 线上迁移只运行 `prisma migrate deploy`，通过 `db-migrate` 工具容器执行。
- 线上禁止运行 `prisma db push`、`prisma migrate reset`、`prisma:seed`、`demo:seed`。
- 线上 `.env`、数据库密码、JWT 密钥、第三方 API key 只保存在服务器，不随代码同步，不写入 Git。
- 发布失败时先看实际失败点，不重新规划整条链路；优先从构建、迁移、容器重启、健康检查四段定位。

## 标准发布命令

从本机同步代码时先 dry-run：

```bash
npm run sync:47
```

确认排除项和文件列表无误后执行真实同步：

```bash
npm run sync:47 -- --apply
```

同步脚本会排除 `node_modules`、构建产物、`.git`、`scraped_docs`、`outputs`、`.env` 等大目录和敏感文件，避免向 47 传输无关内容。

在 47 云服务器上执行：

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

## 故障处理边界

- 构建失败：先看 `Dockerfile.api` / `Dockerfile.web` 的构建阶段日志，不在宿主机执行 `npm install`。
- 迁移失败：只排查 migration 文件、`DATABASE_URL`、Postgres 连通性；不要改用 `db push` 绕过。
- 服务未启动：查看 `docker compose logs api web postgres redis`，按容器日志处理。
- 数据问题：不要执行 reset/seed；需要人工确认备份和修复 SQL 后再处理。

## 后续优化方向

- 若 47 上 Docker build 明显变慢，下一步改为本地/CI 构建镜像、推送镜像仓库，47 只执行 `docker compose pull`、`db-migrate` 和重启。
- 若数据量上来后列表接口变慢，优先把运单、仓库包裹、财务审核接口改成服务端分页和筛选，配合现有查询索引使用。
