# 发布切换连续可用与旧静态资源恢复

- 状态：`in_progress`
- 会话标题：`Sunny｜架构控制面快速落地｜08`
- 续接自：`docs/archive/dev-now/2026-08/system-role-runtime-input-phase7-20260821.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`用户持续目标；Phase7 完成重评`
- 会话 slug：`release-availability-phase8-20260821`
- 分支：`codex/release/release-availability-phase8-20260821`
- worktree：`/Users/j1ng/Tools/sunny-release-availability-phase8-20260821`

## 用户可见目标

- 用户停留在旧版本页面时，发布后进入懒加载页面不再因旧 chunk 被删除而崩溃。
- API 镜像切换期间，已有 Web 容器继续把请求交给健康 API，不暴露本次实测的 upstream connection refused 窗口。
- 页面、字段、操作链路、成功响应、权限、状态、金额、审计与持久化行为不变。

## 固定样本与当前证据

- Phase7 cutover 后，旧财务录单页面请求已删除 `FinancePage` chunk，API 记录 `Failed to fetch dynamically imported module`。
- Web 在新 API 监听前约四秒启动，Nginx 对会话、仓库、通知、导航已读及表格偏好请求记录 `connect() failed (111: Connection refused)`。
- 当前 `index.html` 已 `no-store`、hash 静态资源已 immutable，但 Web 没有监听 Vite 的 `vite:preloadError`。
- 当前标准发布以单次 `docker compose up api web` 同时替换服务；API 没有就绪前旧 Web/新 Web 均可能收到 upstream refused。

## 实施边界

- Web：增加旧 chunk 首次失败且无未保存内容时的一次性安全刷新；同一 release/chunk 不循环刷新。
- HTTP：只允许 GET/HEAD 对网络错误或 502/503/504 做有界短重试；不得自动重放业务写请求。
- 发布：先启动候选 API 并验证健康，临时让现有 Web/Nginx 指向候选，再替换并验证 canonical API，恢复原 upstream 后才移除候选。
- 双 API 短暂重叠不得绕过现有数据库 claim/幂等；不改 schema/migrations、权限、业务接口或数据。

## 验收

- 定向 Web 测试证明旧 chunk 首次失败自动刷新、未保存内容/重复失败不自动刷新，且 GET 可跨越短暂 502、POST 不重试。
- shell 单测证明候选健康后才切 upstream、canonical 健康后才恢复 upstream/删除候选，候选失败时保留旧 API。
- Web/API/Shared 类型检查、发布脚本 shell/governance、安全门、主干 CI 通过。
- 47 精确发布后以持续探针覆盖真实 API 切换窗口，HTTP 失败数为 0；源码、provenance、镜像、health、日志、锁与 recovery 正常。

## GitHub 借鉴边界

- Vite 官方建议用 `vite:preloadError` 处理部署后旧页面引用已删除 chunk，并要求 HTML 不缓存；Sunny 采用一次性受保护刷新，不改变页面框架。
- Docker 官方把 start-first 定义为新旧任务短暂重叠后再停止旧任务；Sunny 在 Compose 单机环境实现受控 warm handoff，不引入 Swarm/Kubernetes。
- Nginx 官方 upstream 能在多个健康后端间代理；Sunny 只在发布锁内临时切候选 upstream，不缓存鉴权 API，不自动重放写请求。

## 当前进度

- Web 已监听 `vite:preloadError`：无未保存内容时按 release、地址和失败 chunk 指纹只刷新一次；存在未保存内容或 60 秒内相同失败时保留原错误处理，避免数据丢失和刷新循环。
- 总 API Client 的普通 GET/HEAD 对网络错误及 502/503/504 做 150/350/750/1500/2500ms 有界重试；POST/PUT/PATCH/DELETE 与 401/403/业务错误不重放。
- 标准 47 发布已改为 API warm handoff：候选容器健康且 Web 可解析后才临时切 Nginx；候选路由可用后替换 canonical；canonical 健康后恢复原 Nginx，再排空并删除候选。候选或临时路由在替换前失败会回滚并保留旧 API。
- 定向 Web 10/10、warm handoff 三分支 shell 测试、三端 typecheck、448 路由/无新增 lint 债务、governance、shell 语法与 `git diff --check` 已通过。
- 47 当前 Web 容器只读预检确认 `getent hosts api`、容器内 `/api/health` 和唯一 canonical `proxy_pass` 均可用；尚待主干 CI 镜像和真实 cutover 连续可用验收。

## 首次真实 cutover 反馈

- `f22bdd83` 首次标准提升在候选 API 健康后、任何容器替换前因旧 Web 无法解析 Compose one-off 候选容器名失败关闭；旧 API/Web 容器 ID 与 digest 未变，候选已删除、Nginx 已保持 canonical、公网 health 200。
- 已核对远端源码与 `f22bdd83` 三类 fingerprint 一致并清除精确 recovery marker，锁恢复 free；不把该失败误报为完成。
- 修正方向：不依赖 one-off DNS 名，读取候选在 Compose 网络的 IPv4，经旧 Web 直连健康验证后短暂写入 Nginx；仍保留原健康门、回滚和写请求不重放边界。
