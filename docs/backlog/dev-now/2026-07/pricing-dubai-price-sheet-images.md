# 迪拜空海运原表图片展示

- 状态：completed
- 输入：用户提供任务卡 `2026-07-13-报价查价-迪拜空海运原表图片展示`，并明确允许 API Docker 增加 LibreOffice 转图依赖及新增 Prisma migration。
- 范围：迪拜价格表导入转图、展示版本与页资产、管理端发布、业务员空海运图片浏览、相关 Shared/API/Web 测试。
- 不做：其他查价模块改造、迪拜结构化查价与加价计算。
- 验证：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "迪拜|空运|海运|图片|价格表"`、`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "dubai|image|sheet|air|sea|permission"`、Web/API typecheck、`git diff --check` 均通过；47 已执行 Prisma migration、API/Web 容器重建与健康检查。

## 结果

- 迪拜 XLS/XLSX 文件导入任务改为按 Sheet 名识别空运/海运，XLSX 以原工作簿样式转 PDF/PNG 分页；未识别 Sheet 仅在管理端列为待确认。
- 管理端可查看转换版本，并在确认不含成本、毛利和内部价后发布单一展示版本；业务员只读取已发布版本的图片页。
- 实际样表 `/Users/j1ng/Downloads/迪拜专线 6.29（生效）大客户.xlsx` 验证：识别“阿联酋空派”“阿联酋海派”；“目录”标记为待确认归属。
- 已将实际样表上传至 47 并发布展示版本：线上实际转换为空运 8 页、海运 2 页；“目录”未对业务员展示。首张空运图片静态访问返回 `200 image/png`。
- 已修复中文字体缺失并重新转换、发布实际样表；首张空运图片人工检查可正常显示中文。迪拜空运、海运页面改为每次仅显示一页，通过上一页/下一页切换。
- 修复 LibreOffice 沿原表横向分页导致的截断页：导出前强制每张工作表适配一页宽，并裁掉纯白边缘；重新发布版本后，原先第 5 页的碎片表格已成为完整可读的“操作要求”页。

## 风险

- 已发布到 47；Docker 构建改用阿里云 Alpine 镜像源以保证 LibreOffice 依赖稳定下载。
- 图片页由服务端预生成，更新原表或字体后需重新导入并发布新版本，历史图片不会自动重绘。
- 本地 API typecheck 当前被其他并行改动的既有 `LineShipmentPoolRow.agentName` 类型错误阻断；本卡相关 API E2E 测试通过，47 Docker 构建成功。
- 老式 `.xls` 因格式限制走兼容转图路径，复杂嵌入对象的视觉保真度低于 `.xlsx`。
