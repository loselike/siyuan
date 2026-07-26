import { Button, Space, Tag, Tooltip, Typography } from 'antd';
import type {
  AgentMarkupSummary,
  LegacyPricingRecommendation,
  PriceLookupRecommendation
} from '@siyuan/shared';
import { formatCurrency } from '../shared/format';
import type { ImportedPriceRow } from './excel';

const { Text } = Typography;

function formatKgRate(amount: number) {
  return (Math.round(amount * 100) / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function formatKgCurrencyRate(amount: number) {
  return `¥${formatKgRate(amount)}`;
}

export function formatMarkupValue(rule: Pick<AgentMarkupSummary, 'markupType' | 'markupValue' | 'markupPerKg' | 'markupUnit'>) {
  const type = rule.markupType ?? 'WEIGHT';
  const value = rule.markupValue ?? rule.markupPerKg;
  if (type === 'PERCENT') return `+${formatKgRate(value)}%`;
  if (type === 'PER_SHIPMENT') return `+${formatCurrency(value)}/票`;
  if (type === 'FIXED') return `+${formatCurrency(value)} 固定`;
  return `+${formatCurrency(value)}/${rule.markupUnit ?? 'KG'}`;
}

export function renderMarkupSource(rule: AgentMarkupSummary) {
  const sources = rule.sourcePriceBooks ?? [];
  if (!sources.length || rule.retainedOnly) {
    return <Tag color="default">无有效价格表</Tag>;
  }
  return (
    <Space direction="vertical" size={2}>
      {sources.slice(0, 2).map((source) => (
        <Text key={`${source.priceBookId}:${source.fileName}`} className="pricing-source-line">
          {source.fileName}{rule.rulePurpose === 'DUBAI_SEA_IMAGE' ? '' : ` · ${source.lineCount} 条`}
        </Text>
      ))}
      {sources.length > 2 ? <Text type="secondary">另 {sources.length - 2} 张价格表</Text> : null}
    </Space>
  );
}

export function renderMarkupDisplay(rule: AgentMarkupSummary) {
  if (rule.markupDisplayMode === 'RETAINED_ONLY' || rule.retainedOnly) {
    return <Tag color="default">仅保留规则</Tag>;
  }
  if (rule.markupDisplayMode === 'MIXED') {
    const distribution = rule.markupBuckets?.length
      ? rule.markupBuckets.map((bucket) => `${formatMarkupValue({ markupPerKg: bucket.markupPerKg })}：${bucket.lineCount} 条`).join('；')
      : '暂无分布';
    return (
      <Space direction="vertical" size={2}>
        <Tooltip title={distribution}>
          <Tag color="orange">混合加价</Tag>
        </Tooltip>
        <Text type="secondary">{rule.markupRange ?? '多档加价'}</Text>
      </Space>
    );
  }
  return <Text strong>{rule.defaultMarkupDisplay ?? formatMarkupValue(rule)}</Text>;
}

export function getMarkupSourceLabel(source?: ImportedPriceRow['markupSource']) {
  if (source === 'LINE_CUSTOM') return '线路自定义';
  if (source === 'AGENT_DEFAULT') return '代理默认';
  if (source === 'VIRTUAL_DEFAULT') return '虚拟默认';
  return '本地匹配';
}

function normalizeRequirementBlock(value: string | undefined) {
  return value
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function getRequirementText(item: Pick<PriceLookupRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>) {
  return [item.remark, item.productSurchargeRemark, item.specialRemark]
    .map(normalizeRequirementBlock)
    .filter(Boolean)
    .join('\n');
}

function getRequirementPreview(item: Pick<PriceLookupRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>) {
  const text = getRequirementText(item).replace(/\s+/g, ' ').trim();
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

export function renderRequirementCell(
  item: Pick<PriceLookupRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>,
  onOpen: () => void
) {
  const fullText = getRequirementText(item);
  if (!fullText) {
    return <Text type="secondary">暂无渠道要求</Text>;
  }
  return (
    <Button
      aria-label="渠道要求"
      htmlType="button"
      type="link"
      size="small"
      title={fullText}
      style={{ maxWidth: 112, paddingInline: 0 }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <span style={{ display: 'inline-block', maxWidth: 112, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
        {getRequirementPreview(item)}
      </span>
    </Button>
  );
}

export function renderRequirementDetailNote(item: Pick<PriceLookupRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>) {
  const fullText = getRequirementText(item);
  return (
    <div className="pricing-detail-note">
      <Text type="secondary">渠道要求</Text>
      <Text style={{ whiteSpace: 'pre-wrap' }}>{fullText || '暂无渠道要求'}</Text>
    </div>
  );
}

export function getCustomRemarkText(item: Pick<PriceLookupRecommendation, 'customRemark'>) {
  return normalizeRequirementBlock(item.customRemark);
}

export function renderCustomRemarkCell(
  item: Pick<PriceLookupRecommendation, 'customRemark'>,
  onOpen: () => void
) {
  const fullText = getCustomRemarkText(item);
  if (!fullText) return <Text type="secondary">-</Text>;
  return (
    <Button
      aria-label="自定义备注"
      htmlType="button"
      type="link"
      size="small"
      title={fullText}
      style={{ maxWidth: 112, paddingInline: 0 }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <span style={{ display: 'inline-block', maxWidth: 112, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
        {fullText.replace(/\s+/g, ' ').trim()}
      </span>
    </Button>
  );
}

export function buildQuoteCopyText(item: PriceLookupRecommendation) {
  return [
    `渠道：${item.channelName}`,
    `承运商：${item.carrierName}`,
    `重量段：${item.weightSegmentLabel}`,
    `时效：${item.transitLabel}`,
    `单价：${formatKgCurrencyRate(item.salesRatePerKg)}/kg`,
    `总价：${formatCurrency(item.totalSales)}`,
    item.remark ? `渠道要求：${item.remark}` : undefined,
    item.customRemark ? `自定义备注：${item.customRemark}` : undefined
  ].filter(Boolean).join('\n');
}

export function buildLegacyQuoteCopyText(item: LegacyPricingRecommendation) {
  const unit = item.quoteMode === 'cbm' ? '/CBM' : '/kg';
  return [
    `渠道：${item.channelName}`,
    `重量段：${item.weightSegmentLabel}`,
    `时效：${item.transitLabel ?? '时效待确认'}`,
    `单价：${formatKgCurrencyRate(item.salesUnitPrice)}${unit}`,
    `总价：${formatCurrency(item.salesTotal)}`,
    item.remark ? `渠道要求：${item.remark}` : undefined,
    item.customRemark ? `自定义备注：${item.customRemark}` : undefined
  ].filter(Boolean).join('\n');
}
