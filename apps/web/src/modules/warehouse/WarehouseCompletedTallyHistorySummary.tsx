import { Typography } from 'antd';
import type { CompletedTallyArchiveSummary } from './warehouseCompletedTallyHistory';

const { Text } = Typography;

export function WarehouseCompletedTallyHistorySummary({ summaries }: { summaries: CompletedTallyArchiveSummary[] }) {
  if (!summaries.length) return null;

  return (
    <div className="warehouse-tally-history-summary" aria-label="理货前后件数变化">
      <div className="warehouse-tally-history-summary-intro">
        <Text strong>理货件数变化</Text>
        <Text type="secondary">“条”是归档记录数，不等于理货后的件数</Text>
      </div>
      {summaries.slice(0, 3).map((summary) => (
        <div className="warehouse-tally-history-summary-item" key={summary.taskNo}>
          <Text className="warehouse-tally-history-task-no">{summary.taskNo}</Text>
          <span className="warehouse-tally-history-count-change" aria-label={`原始 ${summary.originalPackageCount} 件，理货后 ${summary.completedPackageCount} 件`}>
            <strong>{summary.originalPackageCount}</strong><small>件</small>
            <span className="warehouse-tally-history-arrow">→</span>
            <strong>{summary.completedPackageCount}</strong><small>件</small>
          </span>
          <Text type="secondary" className="warehouse-tally-history-record-explanation">
            下表 {summary.archiveRecordCount} 条：{summary.originalSourceRecordCount} 条原始来源
            {summary.correctionRecordCount ? ` + ${summary.correctionRecordCount} 条历史聚合纠正` : ''}
          </Text>
        </div>
      ))}
      {summaries.length > 3 ? (
        <Text type="secondary" className="warehouse-tally-history-summary-more">另有 {summaries.length - 3} 个件数变化任务</Text>
      ) : null}
    </div>
  );
}
