# 无浏览器验收与 47 发布闭环

- 状态：`complete`
- 输入来源：当前会话明确请求
- 会话 slug：`non-browser-47-acceptance`
- 分支：`codex/repository-baseline-governance`
- worktree：`/Users/j1ng/Tools/sunny`
- 日期：`2026-07-20 Asia/Shanghai`

## 目标

- 后续开发完成本地最小验证后，直接精确发布到 47，再使用线上 API、容器、日志、代码 checksum 或静态产物完成验证并汇报。
- Codex 不操作浏览器、不处理验证码、不做截图；UI 设计和视觉效果由用户在 47 人工验收。

## 完成内容

- `AGENTS.md` 已固定“本地验证 -> 精确发布 -> 47 服务端/代码验证 -> 汇报”顺序，并加入常规运行时代码的持续发布授权。
- 总规则已明确主链路原因：验证码和浏览器点击耗时且不稳定，本地数据又不等同 47，线上真实 API、数据、容器和代码证据才是主要验收依据。
- `docs/dev-thread-rules.md` 已移除 UI 本地先行和登录 Session 注入流程，替换为无浏览器验收及 47 发布后验证矩阵。
- `docs/47-cloud-docker-release.md` 已明确发布后只使用 API、容器、日志、数据库只读查询、源码 checksum 和静态产物证据。
- 发布步骤已压缩为最小本地安全门后立即精确发布；线上失败时执行“修改 -> 最小相关验证 -> 重新发布 -> 重新线上验证”循环，不重复无关测试或构建。
- 破坏性迁移、真实付款、批量生产数据写入、不可逆清洗仍须单独确认；UI 人工验收不阻塞代码发布，但最终回复必须列出人工检查点。

## 验证

- `npm run governance:check`
- `git diff --check -- AGENTS.md docs/dev-thread-rules.md docs/47-cloud-docker-release.md scripts/check-development-governance.mjs docs/dev-now/non-browser-47-acceptance.md`

## 发布状态

- 本轮只修改开发治理文档和治理检查，不包含运行时代码，无需构建或重启 47 服务。
