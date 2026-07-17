import { describe, expect, it } from 'vitest';
import { LINEAGE_EVENT_DEFINITIONS, getLineageEventDefinition } from './lineage-event-catalog.js';

const expectedCoverage: Record<string, string[]> = {
  运营工作台: ['专线运单池', 'AI 优先队列', '产品地图', '导入质检'],
  报价查价: ['查价', '代理加价规则', '价格表管理', '南非专线查询'],
  业务管理: ['录单', '草稿箱', '待审核运单', '运单管理', 'AI 订单助手'],
  仓库管理: ['仓库看板', '今日收货', '在仓数据', '未完成理货', '已完成理货', '待排货', '待出库', '已出库'],
  市场管理: ['市场看板', '待排货', '已排货', '本周排货数据'],
  客服管理: ['客服看板', '数据确认', '转单号', '待排货', '待离港', '已离港', '已到港', '已派送', '已签收', '问题件', '售后'],
  物流轨迹管理: ['承运商任务', '最新轨迹', '手动添加轨迹'],
  财务管理: ['财务看板', '应收审核', '业务成本审核', '市场应付审核', '待付款', '已付款', '水单到账查询', '水单匹配', '代理账单'],
  基础资料库: ['客户资料', '财务资料', '代理资料', '代理渠道', '公司渠道', '渠道类别', '偏远', '汇率', '资料辅助'],
  系统管理: ['用户组', '用户名', '站点', '操作日志', '角色权限分配', '权限安全区', 'AI 接口安全', '系统基础配置']
};

describe('lineage event catalog', () => {
  it('covers every current top-level module and second-level function', () => {
    const covered = new Set(LINEAGE_EVENT_DEFINITIONS.map((definition) => `${definition.module}/${definition.section}`));

    Object.entries(expectedCoverage).forEach(([module, sections]) => {
      sections.forEach((section) => {
        expect(covered.has(`${module}/${section}`), `${module}/${section}`).toBe(true);
      });
    });
  });

  it('keeps pure list browsing out of lineage event definitions', () => {
    expect(LINEAGE_EVENT_DEFINITIONS.every((definition) => !/翻页|筛选|查看列表|打开弹窗/.test(definition.action))).toBe(true);
  });

  it('defines resolvers and sensitive fields for result-producing events', () => {
    LINEAGE_EVENT_DEFINITIONS
      .filter((definition) => definition.eventKind === 'result')
      .forEach((definition) => {
        expect(definition.businessIdResolver, definition.key).toBeTypeOf('function');
        expect(definition.sourceRefsResolver, definition.key).toBeTypeOf('function');
        expect(definition.sensitiveFields).toEqual(expect.arrayContaining(['password', 'token', 'bankAccountNo']));
      });
  });

  it('finds definitions by stable key', () => {
    expect(getLineageEventDefinition('finance.water_receipts.match')).toMatchObject({
      module: '财务管理',
      section: '水单匹配',
      resultType: 'water_receipt_match'
    });
  });
});
