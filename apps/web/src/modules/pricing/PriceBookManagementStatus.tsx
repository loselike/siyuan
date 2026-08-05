import { Alert, Button, Progress, Space, Tag, Typography } from 'antd';
import type {
  PriceBookImportJobSummary,
  PricingRuleRefreshModuleProgress
} from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';

const { Text } = Typography;

export interface PriceBookManagementStatusProps {
  unclassified: boolean;
  loading: boolean;
  slowLoading: boolean;
  loadError?: string | null;
  onReload: () => void;
  ruleRefresh?: PricingRuleRefreshModuleProgress;
  importJob?: PriceBookImportJobSummary | null;
}

export function PriceBookManagementStatus({
  unclassified,
  loading,
  slowLoading,
  loadError,
  onReload,
  ruleRefresh,
  importJob
}: PriceBookManagementStatusProps) {
  return (
    <>
      {unclassified ? <Alert type="warning" showIcon message="未归类数据处理区" description="这里只读展示历史未绑定查价模块的数据，可下载原文件核对；确认归属后请在对应模块重新导入，系统不会自动迁移或删除。" /> : null}
      {slowLoading && loading ? <Alert type="info" showIcon message="当前模块价格表加载较慢，正在继续加载" /> : null}
      {loadError ? <Alert type="error" showIcon message={loadError} action={<Button size="small" onClick={onReload}>重新加载</Button>} /> : null}
      {ruleRefresh ? (
        <div className="pricing-rule-refresh-progress" role="status" aria-label="当前模块规则同步进度">
          <div className="pricing-rule-refresh-progress__summary">
            <Space size={8} wrap>
              <Text strong>规则同步</Text>
              <Tag color={ruleRefresh.latestRuleApplied ? 'green' : ruleRefresh.failedBooks || ruleRefresh.unavailableBooks ? 'red' : 'blue'}>
                {ruleRefresh.latestRuleApplied ? '已是最新规则' : ruleRefresh.runningBooks ? '正在同步' : ruleRefresh.pendingBooks ? '等待同步' : '需处理'}
              </Tag>
              <Text type="secondary">规则 v{ruleRefresh.ruleVersion} · 已同步 {ruleRefresh.currentBooks}/{ruleRefresh.totalBooks} 张</Text>
              {ruleRefresh.failedBooks ? <Text type="danger">失败 {ruleRefresh.failedBooks} 张</Text> : null}
              {ruleRefresh.unavailableBooks ? <Text type="danger">原文件不可用 {ruleRefresh.unavailableBooks} 张</Text> : null}
            </Space>
            {ruleRefresh.updatedAt ? <Text type="secondary">最近完成：{formatBeijingDateTime(ruleRefresh.updatedAt)}</Text> : null}
          </div>
          <Progress
            percent={ruleRefresh.progressPercent}
            status={ruleRefresh.failedBooks || ruleRefresh.unavailableBooks ? 'exception' : ruleRefresh.latestRuleApplied ? 'success' : 'active'}
            format={(percent) => `${percent ?? 0}%`}
          />
        </div>
      ) : null}
      {importJob ? (
        <Alert
          className="notice-bar"
          type={importJob.status === 'FAILED' ? 'error' : importJob.status === 'SUCCESS' ? 'success' : 'info'}
          showIcon
          message={`导入任务：${importJob.status}`}
          description={`${importJob.message ?? '处理中'}；进度 ${importJob.processedRows}/${importJob.totalRows || '?'} 行${importJob.errorSummary?.length ? `；导入提示：${importJob.errorSummary.map((item) => item.reason).join('；')}` : ''}`}
        />
      ) : null}
    </>
  );
}
