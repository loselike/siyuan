# 底层优化第二阶段：生产安全控制面

- 状态：`complete`
- 会话标题：`Sunny｜底层架构优化｜02`
- 会话 slug：`security-control-plane-20260819`
- 分支：`codex/security-control-plane-20260819`
- worktree：`/Users/j1ng/Tools/sunny-security-control-plane-20260819`
- 起始提交：`ab830b7c`
- 最终提交：`e2aaf3b8c63491780b375e6452554cf2f1adac90`
- 最终发布：`git-e2aaf3b8c634_web-1b5a6f19e3e4_api-fc5cc1dc3960`
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
- 47 API 只通过 Web Nginx `/api/` 同源反向代理暴露，API 服务无宿主机端口；修改前不可信 Origin 预检返回 `Access-Control-Allow-Origin: *`。
- 首次发布 `git-09c4b2cb011b_web-1b702969afa5_api-fc5cc1dc3960` 后，CORS 固定样本已从 `Access-Control-Allow-Origin: *` 变为无放行头，同源 health/Web 均为 200，生产 seed 忽略日志与非种子规模业务数据均正常。
- 首次发布结束后检测到另一会话把 `RoutingPage.tsx` 写入 47 源码；已采集 manifest `20260819-091939-git-09c4b2cb011b_web-1b702969afa5_api-fc5cc1dc3960` 并逐字节吸收该文件，Web typecheck 通过，没有改写其业务内容。最终 cutover 已恢复源码、镜像和 Git 来源完全一致。

## 成熟参考

- [NestJS](https://github.com/nestjs/nest/blob/master/packages/common/interfaces/nest-application-options.interface.ts)：使用框架原生 `CorsOptions`/`enableCors` 配置入口。MIT。Sunny 采用生产关闭、显式 origin 白名单、开发兼容的最小策略，不增加第二套中间件。
- [Prisma seeding](https://github.com/prisma/web/blob/main/apps/docs/content/docs/orm/prisma-migrate/workflows/seeding.mdx)：借鉴显式命令触发 seed，而非应用启动时隐式执行。Apache-2.0 文档仓库；Sunny 保留现有开发 seed 能力，并用回归测试锁定生产禁用分支。

## 验收

- 本地：API 定向安全测试 2 文件、11 项全部通过；API typecheck、Web typecheck 与 `git diff --check` 通过。CORS 覆盖生产默认拒绝、显式白名单、非法配置失败关闭和开发兼容；seed 覆盖生产双开关仍不查询数据库、开发显式 reset/empty-only、默认禁用。
- 47：provenance 为 `traceable`，Web/API 镜像与 API release ID 全部匹配；运行时源码 541/541 一致，锁 free、recovery clear。
- 47 效果：`https://untrusted.invalid` 的预检为 404 且无 `Access-Control-Allow-Origin`；公网 `/api/health` 与 Web 均为 200。
- 47 数据安全：容器仍为 `NODE_ENV=production`、`SEED_ON_EMPTY=true`，启动日志出现一次“生产环境已忽略数据库自动种子配置”；只读计数为 21 个用户、80 票运单，近 15 分钟无 fatal/unhandled/uncaught/panic。

## 阶段完成重评

- 安全/数据正确性：生产 CORS 已从默认开放改为默认拒绝，生产 seed 原有保护已由真实服务启动测试锁定；当前仍未发现全局 `ValidationPipe` 或共享运行时 schema，Controller 的 TypeScript `@Body()` 类型本身不校验外部输入。
- 高频业务流与前端数据流：`App.tsx` 仍有 3,491 行、`apiClient.ts` 2,617 行，但已有按路由拆数据所有权的连续切片，继续推进价值明确但不是当前最高安全缺口。
- 后端架构与改造效率：`DataController` 仍有 2,670 行、Prisma Repository 33,476 行；既有领域模块迁移证明方向可行，但一次大拆风险高于先补写接口输入保护。
- 结论：`转向`共享运行时输入校验。下一切片只选择一个代表性仓库包裹写接口，先锁定现有允许/拒绝/非法输入行为，再以共享 schema 在 Controller 边界失败关闭；不同时修改状态机、权限、Repository、数据库或页面。
