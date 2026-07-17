# 运单池历史数据渲染兜底

- 问题：47 的“专线运单池”在部分历史或浏览器缓存数据缺少包裹重量、体积或国内快递号数组时，前端直接调用 `toFixed`/`slice` 导致整个模块被错误边界拦截。
- 实现：货量/包裹列改为安全格式化；优先回退到应收计费重等已有重量字段，仍无数据时展示“—”；国内快递号仅在确认为数组时处理。
- 验证：`npm run typecheck -w @siyuan/web`、`npm test -w @siyuan/web -- --run src/modules/workspace/workspace.test.tsx -t "renders legacy package summaries with missing numeric fields safely" --pool=forks --maxWorkers=1 --fileParallelism=false`、`git diff --check` 均通过。
- 发布：未发布 47。
