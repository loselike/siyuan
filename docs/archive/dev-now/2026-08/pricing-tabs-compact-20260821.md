# 查价模块入口压缩为两行

- 状态：published_47
- 分支：`codex/pricing-tabs-compact-20260821`
- 用户目标：查价页面模块入口字体和空白更小，桌面端 8 个入口固定两行展示。
- 固定样本：47 `/app/pricing` 当前 8 个查价入口由三行压缩为每行 4 个、共两行。
- 边界：只调整查价入口卡片样式，不改模块顺序、权限显隐、点击切换或查价逻辑。
- 验收：常规桌面宽度四列两行；按钮字号 13px、高度 34px、卡片内边距缩小；窄屏继续降为两列和单列。
- 本地验证：`git diff --check` 通过；Web typecheck 在共享依赖就绪后通过；PR #40 的 affected、image-api、image-migrate 通过，image-web 成功产出生产镜像。
- 发布状态：已合入 `origin/main`（merge commit `afa2f963f8fdbd63705290c48f850b8dbcb0c86a`），Web-only 白名单发布到 47，release ID `whitelist-66fc30b2b5f918b8aa542744`。
- 线上证据：远端 `styles.css` SHA 为 `6781e63e37554746cb80f436fd5390cc41851edc367e0a1dccb14535f0b0378b`；生产 bundle 同时包含四列网格与 34px 紧凑按钮标记；Web/API 容器运行，公网首页 200、health 正常、近 5 分钟 Web 错误 0、发布锁 free、recovery clear。
- 人工视觉检查点：47 `/app/pricing` 的 8 个查价入口在常规桌面宽度应显示为 4 列 × 2 行，按钮字体和上下留白明显缩小；960px 以下保留两列、720px 以下保留单列。
- 发布治理尾项：当前全局 provenance 仍为 `WHITELIST_CAS`，且既有 Web-only 发布链使 `API_RELEASE_ID_MATCH=false`；不影响本次纯前端样式效果，需由独立发布治理任务做 current-baseline cutover。
