import { Popover, Space, Tag, Typography } from 'antd';
import type { ChargeWeightChangeSummary } from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';

const { Text } = Typography;

type ChargeWeightChangeTagProps = {
  value?: number;
  change?: ChargeWeightChangeSummary;
  showUnit?: boolean;
};

function formatWeight(value: number, showUnit: boolean) {
  return `${value.toFixed(3)}${showUnit ? ' kg' : ''}`;
}

export function ChargeWeightChangeTag({ value, change, showUnit = false }: ChargeWeightChangeTagProps) {
  if (typeof value !== 'number') return <>-</>;
  if (!change) return <>{formatWeight(value, showUnit)}</>;

  const delta = change.currentChargeWeightKg - change.originalChargeWeightKg;
  return (
    <Space size={4}>
      <span>{formatWeight(value, showUnit)}</span>
      <Popover
        trigger="click"
        title="计费重修改记录"
        content={(
          <Space direction="vertical" size={2}>
            <Text>修改前：{change.originalChargeWeightKg.toFixed(3)} kg</Text>
            <Text>当前：{change.currentChargeWeightKg.toFixed(3)} kg</Text>
            <Text type="secondary">变更：{delta > 0 ? '+' : ''}{delta.toFixed(3)} kg</Text>
            <Text type="secondary">时间：{formatBeijingDateTime(change.changedAt)}</Text>
          </Space>
        )}
      >
        <Tag
          color="orange"
          className="finance-charge-weight-change-tag"
          role="button"
          tabIndex={0}
          aria-label="查看计费重修改记录"
          style={{ cursor: 'pointer', marginInlineEnd: 0 }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') event.currentTarget.click();
          }}
        >
          改
        </Tag>
      </Popover>
    </Space>
  );
}
