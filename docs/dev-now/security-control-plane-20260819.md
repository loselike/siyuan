# 底层优化第二阶段：生产安全控制面

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜02`
- 会话 slug：`security-control-plane-20260819`
- 分支：`codex/security-control-plane-20260819`
- worktree：`/Users/j1ng/Tools/sunny-security-control-plane-20260819`
- 起始提交：`ab830b7c`
- 47 当前基线提交：`4d11ab12`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- 47 的同源 Web 与 API 继续正常使用；来自 `https://untrusted.invalid` 的浏览器预检不再收到 `Access-Control-Allow-Origin`。
- 即使 47 Compose 仍传入 `SEED_ON_EMPTY=true`，生产 API 启动也不会查询空库或执行自动种子。

## 范围与边界

- 允许修改：`apps/api/src/configure-app.ts`、`apps/api/src/modules/database-seed.service.ts`、`apps/api/src/modules/data-access.module.ts` 及其定向测试、本状态文件。
- 禁止修改：Prisma schema/migrations、业务数据、RBAC、业务状态机、财务口径、Web 页面和 `docker-compose.yml`。
- 固定样本：公网 `/api/health` 的同源请求保持 200；不可信 Origin 的 OPTIONS 响应无 CORS 放行头；生产 seed mode 始终为 `DISABLED`。

## 当前事实

- 开工时另一会话已把 `prisma.repository.ts` 发布为 `whitelist-ddcf91e9052e69a6e00bd7fe`；本分支采集 v3 manifest 并逐字节吸收该文件，源码重新达到 541/541 一致，未改写其业务逻辑。
- 47 API 容器为 `NODE_ENV=production` 且收到 `SEED_ON_EMPTY=true`；现有 `resolveDatabaseSeedMode` 已返回 `DISABLED`，因此原扫描中的“生产会自动 seed”并不成立，本轮补真实服务启动回归测试而不改写已正确的生产行为。
- 47 API 只通过 Web Nginx `/api/` 同源反向代理暴露，API 服务无宿主机端口；当前不可信 Origin 预检返回 `Access-Control-Allow-Origin: *`。
- 首次发布 `git-09c4b2cb011b_web-1b702969afa5_api-fc5cc1dc3960` 后，CORS 固定样本已从 `Access-Control-Allow-Origin: *` 变为无放行头，同源 health/Web 均为 200，生产 seed 忽略日志与非种子规模业务数据均正常。
- 首次发布结束后检测到另一会话把 `RoutingPage.tsx` 写入 47 源码；已采集 manifest `20260819-091939-git-09c4b2cb011b_web-1b702969afa5_api-fc5cc1dc3960` 并逐字节吸收该文件，Web typecheck 通过，没有改写其业务内容。需再次 cutover 让源码、镜像和 Git 来源完全一致。

## 成熟参考

- [NestJS](https://github.com/nestjs/nest/blob/master/packages/common/interfaces/nest-application-options.interface.ts)：使用框架原生 `CorsOptions`/`enableCors` 配置入口。MIT。Sunny 采用生产关闭、显式 origin 白名单、开发兼容的最小策略，不增加第二套中间件。
- [Prisma seeding](https://github.com/prisma/web/blob/main/apps/docs/content/docs/orm/prisma-migrate/workflows/seeding.mdx)：借鉴显式命令触发 seed，而非应用启动时隐式执行。Apache-2.0 文档仓库；Sunny 保留现有开发 seed 能力，并用回归测试锁定生产禁用分支。

## 验收

- 本地：CORS 策略覆盖生产默认拒绝、显式白名单、非法配置失败关闭和开发兼容；seed 策略覆盖生产双开关仍不查询数据库、开发显式 reset/empty-only、默认禁用。
- 安全：API typecheck、定向安全测试、`git diff --check`。
- 47：源码/provenance 可追溯；公网同源 health 200；不可信 Origin 无 CORS 放行头；容器与错误日志正常；数据库只读行数不因发布变化。
