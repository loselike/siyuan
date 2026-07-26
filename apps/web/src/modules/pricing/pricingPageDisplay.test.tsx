import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentMarkupSummary } from '@siyuan/shared';
import {
  buildLegacyQuoteCopyText,
  buildQuoteCopyText,
  formatMarkupValue,
  getCustomRemarkText,
  renderMarkupSource,
  renderRequirementCell
} from './pricingPageDisplay';

describe('pricing page display helpers', () => {
  it('keeps quote copy text and price formatting unchanged', () => {
    const quote = {
      channelName: '测试渠道',
      carrierName: '测试承运商',
      weightSegmentLabel: '51KG+',
      transitLabel: '22-28天',
      salesRatePerKg: 12.5,
      totalSales: 637.5,
      remark: '需自备卸货能力',
      customRemark: '周五截单'
    } as Parameters<typeof buildQuoteCopyText>[0];
    const legacyQuote = {
      channelName: '南非海运',
      weightSegmentLabel: '1CBM+',
      transitLabel: undefined,
      salesUnitPrice: 880,
      salesTotal: 1760,
      quoteMode: 'cbm',
      remark: '单询',
      customRemark: undefined
    } as Parameters<typeof buildLegacyQuoteCopyText>[0];

    expect(buildQuoteCopyText(quote)).toBe([
      '渠道：测试渠道',
      '承运商：测试承运商',
      '重量段：51KG+',
      '时效：22-28天',
      '单价：¥12.5/kg',
      '总价：¥637.50',
      '渠道要求：需自备卸货能力',
      '自定义备注：周五截单'
    ].join('\n'));
    expect(buildLegacyQuoteCopyText(legacyQuote)).toBe([
      '渠道：南非海运',
      '重量段：1CBM+',
      '时效：时效待确认',
      '单价：¥880/CBM',
      '总价：¥1760.00',
      '渠道要求：单询'
    ].join('\n'));
    expect(formatMarkupValue({ markupType: 'PERCENT', markupPerKg: 1.5 })).toBe('+1.5%');
    expect(formatMarkupValue({ markupType: 'WEIGHT', markupPerKg: 12, markupUnit: 'KG' })).toBe('+¥12.00/KG');
    expect(formatMarkupValue({ markupType: 'WEIGHT', markupPerKg: 880, markupUnit: 'CBM' })).toBe('+¥880.00/CBM');
  });

  it('keeps Dubai image sources free of a misleading price-row count', () => {
    const view = render(renderMarkupSource({
      id: 'markup-dubai-image',
      agentName: '迪拜代理',
      markupPerKg: 0,
      enabled: true,
      rulePurpose: 'DUBAI_SEA_IMAGE',
      sourcePriceBooks: [{ priceBookId: 'display-1', fileName: '迪拜海运报价图.png', lineCount: 1 }]
    } satisfies AgentMarkupSummary));

    expect(within(view.container).getByText('迪拜海运报价图.png')).toBeInTheDocument();
    expect(within(view.container).queryByText(/1 条/)).not.toBeInTheDocument();
  });

  it('keeps requirement trimming, preview and click behavior unchanged', () => {
    const onOpen = vi.fn();
    render(renderRequirementCell({
      remark: '  第一条要求  \n\n 第二条要求 ',
      productSurchargeRemark: undefined,
      specialRemark: undefined
    }, onOpen));

    const button = screen.getByRole('button', { name: '渠道要求' });
    expect(button).toHaveAttribute('title', '第一条要求\n第二条要求');
    button.click();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(getCustomRemarkText({ customRemark: '  A  \n\n B ' })).toBe('A\nB');
  });
});
