import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Boxes, CalendarClock, Coins, Download, PackageOpen, Plus, RefreshCw, Settings2 } from 'lucide-react';
import type {
  WarehouseRentBillingUnit,
  WarehouseRentDetailQuery,
  WarehouseRentDetailResponse,
  WarehouseRentDetailSummary,
  WarehouseRentPeriodUnit,
  WarehouseRentRuleInput,
  WarehouseRentRuleSummary
} from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { formatBeijingDateTime } from '../shared/format';
import {
  AppDatePicker,
  AppDateRangePicker,
  ManagedTable,
  MetricCard,
  paginationWhenNeeded,
  tenRowTablePagination
} from '../shared/ui';

const { Text, Title } = Typography;

const emptyResponse: WarehouseRentDetailResponse = {
  totals: {
    inStockCount: 0,
    overdueCount: 0,
    currentRentAmountRmb: 0,
    outboundedRentAmountRmb: 0
  },
  rows: [],
  sites: [],
  salespeople: []
};

const emptyFilters: WarehouseRentDetailQuery = {};

function todayInBeijing() {
  return formatBeijingDateTime(new Date().toISOString()).slice(0, 10);
}

function money(value: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function quantity(value: number, unit?: WarehouseRentBillingUnit) {
  if (!unit) return '-';
  return `${Number(value || 0).toFixed(unit === 'CBM' ? 3 : 3)} ${unit}`;
}

export interface WarehouseRentCustomerSummary {
  id: string;
  customerCode: string;
  customerName?: string;
  detailRows: WarehouseRentDetailSummary[];
  cargoLineCount: number;
  inStockCargoLineCount: number;
  outboundCargoLineCount: number;
  packageCount: number;
  totalWeightKg: number;
  totalCbm: number;
  currentRentAmountRmb: number;
  outboundedRentAmountRmb: number;
  rentAmountRmb: number;
}

export function summarizeWarehouseRentByCustomer(rows: WarehouseRentDetailSummary[]): WarehouseRentCustomerSummary[] {
  const rowsByCustomer = new Map<string, WarehouseRentDetailSummary[]>();
  rows.forEach((row) => {
    rowsByCustomer.set(row.customerCode, [...(rowsByCustomer.get(row.customerCode) ?? []), row]);
  });

  return Array.from(rowsByCustomer.entries())
    .map(([customerCode, detailRows]) => {
      const customerNames = Array.from(new Set(detailRows.map((row) => row.customerName?.trim()).filter(Boolean)));
      const currentRentAmountRmb = detailRows
        .filter((row) => row.status === 'IN_STOCK')
        .reduce((sum, row) => sum + row.rentAmountRmb, 0);
      const outboundedRentAmountRmb = detailRows
        .filter((row) => row.status === 'OUTBOUNDED')
        .reduce((sum, row) => sum + row.rentAmountRmb, 0);
      return {
        id: customerCode,
        customerCode,
        customerName: customerNames.join(' / ') || undefined,
        detailRows: [...detailRows].sort((left, right) => Date.parse(right.inboundAt) - Date.parse(left.inboundAt)),
        cargoLineCount: detailRows.length,
        inStockCargoLineCount: detailRows.filter((row) => row.status === 'IN_STOCK').length,
        outboundCargoLineCount: detailRows.filter((row) => row.status === 'OUTBOUNDED').length,
        packageCount: detailRows.reduce((sum, row) => sum + row.packageCount, 0),
        totalWeightKg: detailRows.reduce((sum, row) => sum + row.totalWeightKg, 0),
        totalCbm: detailRows.reduce((sum, row) => sum + row.totalCbm, 0),
        currentRentAmountRmb,
        outboundedRentAmountRmb,
        rentAmountRmb: currentRentAmountRmb + outboundedRentAmountRmb
      };
    })
    .sort((left, right) => right.rentAmountRmb - left.rentAmountRmb || left.customerCode.localeCompare(right.customerCode));
}

export function formatWarehouseRentRatio(value: number) {
  const normalized = Number(value || 0);
  return `1:${Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

const rentPeriodOptions = [
  { label: '天', value: 'DAY' as const },
  { label: '月（按 30 天）', value: 'MONTH' as const }
];

export function warehouseRentPeriodLabel(unit?: WarehouseRentPeriodUnit) {
  return unit === 'MONTH' ? '月' : '天';
}

export function warehouseRentRateUnit(
  billingUnit: WarehouseRentBillingUnit,
  billingCycleUnit?: WarehouseRentPeriodUnit
) {
  return `RMB / ${billingUnit} / ${warehouseRentPeriodLabel(billingCycleUnit)}`;
}

function createRuleDraft(rule?: WarehouseRentRuleSummary): WarehouseRentRuleInput {
  return {
    name: rule?.name ?? '',
    site: rule?.site,
    effectiveFrom: rule ? '' : todayInBeijing(),
    freeDays: rule?.freeDays ?? 7,
    freePeriodUnit: rule?.freePeriodUnit ?? 'DAY',
    billingUnit: rule?.billingUnit ?? 'CBM',
    billingCycleUnit: rule?.billingCycleUnit ?? 'DAY',
    densityMin: rule?.densityMin ?? 167,
    unitRate: rule?.unitRate ?? 0,
    enabled: true,
    remark: rule?.remark
  };
}

function escapeCsv(value: unknown) {
  const text = value === undefined || value === null ? '' : String(value);
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: WarehouseRentDetailSummary[]) {
  const headers = [
    '站点', '业务员', '客户编号', '客户名称', '入仓快递号', '件数', '总重量KG', '总体积CBM', '货物比重（1 CBM : KG）',
    '入库时间', '出库时间', '在仓天数', '免租时长', '免租单位', '计费天数', '计费基数', '计费周期', '计费数量', '仓租单价', '产生仓租RMB', '状态', '匹配规则'
  ];
  const data = rows.map((row) => [
    row.site, row.salesperson, row.customerCode, row.customerName, row.domesticTrackingNo, row.packageCount,
    row.totalWeightKg, row.totalCbm, formatWarehouseRentRatio(row.densityKgPerCbm), formatBeijingDateTime(row.inboundAt),
    row.outboundAt ? formatBeijingDateTime(row.outboundAt) : '', row.warehouseDays, row.freeDays,
    warehouseRentPeriodLabel(row.freePeriodUnit), row.chargeDays, row.billingUnit,
    warehouseRentPeriodLabel(row.billingCycleUnit), row.billingQuantity, row.unitRate, row.rentAmountRmb,
    row.status === 'IN_STOCK' ? '在仓' : '已出仓', row.matchedRuleName
  ]);
  const csv = `\uFEFF${[headers, ...data].map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `仓租细分表-${todayInBeijing()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function WarehouseRentDetailPanel({
  apiClient,
  canExport,
  canViewRules,
  canManageRules
}: {
  apiClient: ApiClient;
  canExport: boolean;
  canViewRules: boolean;
  canManageRules: boolean;
}) {
  const [response, setResponse] = useState<WarehouseRentDetailResponse>(emptyResponse);
  const [rules, setRules] = useState<WarehouseRentRuleSummary[]>([]);
  const [draftFilters, setDraftFilters] = useState<WarehouseRentDetailQuery>(emptyFilters);
  const [filters, setFilters] = useState<WarehouseRentDetailQuery>(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WarehouseRentRuleSummary>();
  const [ruleDraft, setRuleDraft] = useState<WarehouseRentRuleInput>(createRuleDraft());
  const [savingRule, setSavingRule] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingRuleId, setUpdatingRuleId] = useState<string>();
  const [selectedCustomerCode, setSelectedCustomerCode] = useState<string>();

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setNotice(undefined);
    try {
      const [detailResult, ruleResult] = await Promise.all([
        apiClient.warehouseRentDetails(nextFilters),
        canViewRules ? apiClient.warehouseRentRules() : Promise.resolve([])
      ]);
      setResponse(detailResult);
      setRules(ruleResult);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '仓租数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(emptyFilters);
    // apiClient and permission are stable for the module lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient, canViewRules]);

  const activeRules = useMemo(
    () => rules.filter((rule) =>
      (rule.enabled || Boolean(rule.effectiveTo))
      && Date.parse(rule.effectiveFrom) <= Date.now()
      && (!rule.effectiveTo || Date.parse(rule.effectiveTo) >= Date.now())
    ),
    [rules]
  );
  const primaryRule = activeRules[0];
  const customerRows = useMemo(() => summarizeWarehouseRentByCustomer(response.rows), [response.rows]);
  const selectedCustomer = customerRows.find((row) => row.customerCode === selectedCustomerCode);

  const detailColumns: ColumnsType<WarehouseRentDetailSummary> = [
    { title: '站点', dataIndex: 'site', key: 'site', width: 120, render: (value) => value || '-' },
    { title: '业务员', dataIndex: 'salesperson', key: 'salesperson', width: 110, render: (value) => value || '-' },
    { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 110 },
    { title: '入仓快递号', dataIndex: 'domesticTrackingNo', key: 'domesticTrackingNo', width: 160 },
    { title: '件数', dataIndex: 'packageCount', key: 'packageCount', width: 76, align: 'right' },
    {
      title: '总重量',
      dataIndex: 'totalWeightKg',
      key: 'totalWeightKg',
      width: 110,
      align: 'right',
      render: (value) => `${Number(value).toFixed(3)} kg`
    },
    {
      title: '总体积',
      dataIndex: 'totalCbm',
      key: 'totalCbm',
      width: 110,
      align: 'right',
      render: (value) => `${Number(value).toFixed(3)} CBM`
    },
    {
      title: '货物比重',
      dataIndex: 'densityKgPerCbm',
      key: 'densityKgPerCbm',
      width: 118,
      align: 'right',
      render: (value) => formatWarehouseRentRatio(Number(value))
    },
    {
      title: '入库时间',
      dataIndex: 'inboundAt',
      key: 'inboundAt',
      width: 156,
      render: formatBeijingDateTime
    },
    {
      title: '出库时间',
      dataIndex: 'outboundAt',
      key: 'outboundAt',
      width: 156,
      render: (value) => value ? formatBeijingDateTime(value) : '-'
    },
    { title: '在仓天数', dataIndex: 'warehouseDays', key: 'warehouseDays', width: 92, align: 'right', className: 'warehouse-rent-calculation-column' },
    {
      title: '免租时长',
      dataIndex: 'freeDays',
      key: 'freeDays',
      width: 106,
      align: 'right',
      className: 'warehouse-rent-calculation-column',
      render: (value, row) => `${value} ${warehouseRentPeriodLabel(row.freePeriodUnit)}`
    },
    { title: '计费天数', dataIndex: 'chargeDays', key: 'chargeDays', width: 92, align: 'right', className: 'warehouse-rent-calculation-column' },
    {
      title: '计费数量',
      dataIndex: 'billingQuantity',
      key: 'billingQuantity',
      width: 118,
      align: 'right',
      className: 'warehouse-rent-calculation-column',
      render: (value, row) => quantity(value, row.billingUnit)
    },
    {
      title: '仓租单价',
      dataIndex: 'unitRate',
      key: 'unitRate',
      width: 105,
      align: 'right',
      className: 'warehouse-rent-calculation-column',
      render: (value, row) => row.billingUnit
        ? `¥${Number(value).toFixed(4)} / ${row.billingUnit} / ${warehouseRentPeriodLabel(row.billingCycleUnit)}`
        : '-'
    },
    {
      title: '产生仓租',
      dataIndex: 'rentAmountRmb',
      key: 'rentAmountRmb',
      width: 118,
      align: 'right',
      className: 'warehouse-rent-calculation-column',
      render: (value) => <Text strong className={Number(value) > 0 ? 'warehouse-rent-amount' : undefined}>{money(value)}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 96,
      fixed: 'right',
      render: (status) => status === 'IN_STOCK' ? <Tag color="blue">在仓</Tag> : <Tag>已出仓</Tag>
    },
    {
      title: '匹配规则',
      dataIndex: 'matchedRuleName',
      key: 'matchedRuleName',
      width: 150,
      fixed: 'right',
      render: (value) => value || <Text type="secondary">未匹配规则</Text>
    }
  ];

  const customerColumns: ColumnsType<WarehouseRentCustomerSummary> = [
    { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 130, fixed: 'left', render: (value) => <Text strong>{value}</Text> },
    { title: '客户名称', dataIndex: 'customerName', key: 'customerName', width: 150, render: (value) => value || '-' },
    {
      title: '货物条数',
      key: 'cargoLineCount',
      width: 138,
      align: 'right',
      render: (_, row) => `${row.cargoLineCount} 条（在仓 ${row.inStockCargoLineCount} / 已出 ${row.outboundCargoLineCount}）`
    },
    { title: '总件数', dataIndex: 'packageCount', key: 'packageCount', width: 88, align: 'right', render: (value) => `${value} 件` },
    { title: '总重量', dataIndex: 'totalWeightKg', key: 'totalWeightKg', width: 112, align: 'right', render: (value) => `${Number(value).toFixed(3)} kg` },
    { title: '总体积', dataIndex: 'totalCbm', key: 'totalCbm', width: 112, align: 'right', render: (value) => `${Number(value).toFixed(3)} CBM` },
    { title: '在仓仓租', dataIndex: 'currentRentAmountRmb', key: 'currentRentAmountRmb', width: 112, align: 'right', render: (value) => money(value) },
    { title: '已出仓租', dataIndex: 'outboundedRentAmountRmb', key: 'outboundedRentAmountRmb', width: 112, align: 'right', render: (value) => money(value) },
    {
      title: '仓租合计',
      dataIndex: 'rentAmountRmb',
      key: 'rentAmountRmb',
      width: 118,
      align: 'right',
      render: (value) => <Text strong className={Number(value) > 0 ? 'warehouse-rent-amount' : undefined}>{money(Number(value))}</Text>
    },
    {
      title: '明细',
      key: 'actions',
      width: 92,
      fixed: 'right',
      render: (_, row) => <Button size="small" onClick={() => setSelectedCustomerCode(row.customerCode)}>查看</Button>
    }
  ];

  const openRuleEditor = (rule?: WarehouseRentRuleSummary) => {
    setEditingRule(rule);
    setRuleDraft(createRuleDraft(rule));
    setRuleEditorOpen(true);
  };

  const saveRule = async () => {
    setSavingRule(true);
    setNotice(undefined);
    try {
      if (editingRule) {
        await apiClient.updateWarehouseRentRule(editingRule.id, ruleDraft);
      } else {
        await apiClient.createWarehouseRentRule(ruleDraft);
      }
      setRuleEditorOpen(false);
      await load(filters);
      setNotice(editingRule ? '仓租规则新版本已生效' : '仓租规则已新增');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '仓租规则保存失败');
    } finally {
      setSavingRule(false);
    }
  };

  const exportRows = async () => {
    setExporting(true);
    setNotice(undefined);
    try {
      const exportResponse = await apiClient.exportWarehouseRentDetails(filters);
      downloadCsv(exportResponse.rows);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '仓租数据导出失败');
    } finally {
      setExporting(false);
    }
  };

  const ruleColumns: ColumnsType<WarehouseRentRuleSummary> = [
    { title: '规则名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '站点', dataIndex: 'site', key: 'site', width: 110, render: (value) => value || '默认规则' },
    {
      title: '货物比重',
      key: 'density',
      width: 110,
      render: (_, row) => formatWarehouseRentRatio(row.densityMin)
    },
    { title: '免租时长', dataIndex: 'freeDays', key: 'freeDays', width: 96, render: (value, row) => `${value} ${warehouseRentPeriodLabel(row.freePeriodUnit)}` },
    { title: '计费基数', dataIndex: 'billingUnit', key: 'billingUnit', width: 88 },
    { title: '计费周期', dataIndex: 'billingCycleUnit', key: 'billingCycleUnit', width: 88, render: (value) => warehouseRentPeriodLabel(value) },
    {
      title: '仓租单价',
      dataIndex: 'unitRate',
      key: 'unitRate',
      width: 158,
      render: (value, row) => `¥${Number(value).toFixed(4)} / ${row.billingUnit} / ${warehouseRentPeriodLabel(row.billingCycleUnit)}`
    },
    { title: '生效日期', dataIndex: 'effectiveFrom', key: 'effectiveFrom', width: 112, render: (value) => formatBeijingDateTime(value).slice(0, 10) },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 76,
      render: (enabled) => enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>
    },
    ...(canManageRules ? [{
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, row: WarehouseRentRuleSummary) => (
        <Space size={6}>
          {row.enabled ? <Button size="small" onClick={() => openRuleEditor(row)}>新版本</Button> : null}
          <Popconfirm
            disabled={Boolean(updatingRuleId)}
            title={row.enabled ? '确认停用这条仓租规则？' : `确认从今天 ${todayInBeijing()} 起启用这条仓租规则？`}
            description={row.enabled ? undefined : '系统将以服务器北京时间当天作为生效日期，保留历史版本并新建启用版本。'}
            onConfirm={async () => {
              setUpdatingRuleId(row.id);
              setNotice(undefined);
              try {
                const updated = await apiClient.updateWarehouseRentRuleEnabled(row.id, { enabled: !row.enabled });
                await load(filters);
                setNotice(row.enabled
                  ? '仓租规则已停用'
                  : `仓租规则已启用，新版本从 ${formatBeijingDateTime(updated.effectiveFrom).slice(0, 10)} 生效`);
              } catch (error) {
                setNotice(error instanceof Error ? error.message : '规则状态更新失败');
              } finally {
                setUpdatingRuleId(undefined);
              }
            }}
          >
            <Button
              size="small"
              danger={row.enabled}
              loading={updatingRuleId === row.id}
              disabled={Boolean(updatingRuleId) && updatingRuleId !== row.id}
            >
              {row.enabled ? '停用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      )
    }] : [])
  ];

  return (
    <section className="warehouse-rent-workbench">
      {notice ? <Alert closable showIcon type={notice.includes('失败') || notice.includes('不能') ? 'error' : 'success'} message={notice} onClose={() => setNotice(undefined)} /> : null}

      <Flex justify="space-between" align="flex-start" gap={16} wrap>
        <div>
          <Title level={3}>仓租细分表</Title>
          <Text type="secondary">按客户编号汇总仓租；双击客户行可查看该客户名下每票货物的原始计费明细。超过免租时长后仅计超出天数；月统一按 30 天折算，已出库数据按出库日冻结。</Text>
        </div>
        <Space wrap>
          {canViewRules ? <Button icon={<Settings2 size={16} />} onClick={() => setRuleModalOpen(true)}>仓租规则</Button> : null}
          {canExport ? <Button icon={<Download size={16} />} loading={exporting} disabled={!response.rows.length} onClick={() => void exportRows()}>导出</Button> : null}
          <Button type="primary" icon={<RefreshCw size={16} />} loading={loading} onClick={() => void load(filters)}>刷新</Button>
        </Space>
      </Flex>

      <Row gutter={[12, 12]} className="warehouse-rent-metrics">
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<Boxes />} title="在仓票数" value={response.totals.inStockCount} extra="当前仍在仓" /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<CalendarClock />} title="已超免租" value={response.totals.overdueCount} extra="计费天数大于 0" /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<Coins />} title="在仓仓租" value={money(response.totals.currentRentAmountRmb)} extra="截至当前北京日" /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<PackageOpen />} title="已出仓租" value={money(response.totals.outboundedRentAmountRmb)} extra="按出库时间冻结" /></Col>
      </Row>

      <Card size="small" className="warehouse-rent-rule-strip">
        <Flex align="center" justify="space-between" gap={16} wrap className="warehouse-rent-rule-strip-header">
          <Space>
            <Text strong>当前仓租规则</Text>
            {activeRules.length > 1 ? <Tag color="blue">共 {activeRules.length} 条生效规则</Tag> : null}
          </Space>
          <Space>
            {canViewRules ? <Button size="small" type="link" onClick={() => setRuleModalOpen(true)}>查看全部规则</Button> : null}
            {canManageRules ? <Button size="small" type="link" icon={<Plus size={15} />} onClick={() => { setRuleModalOpen(true); openRuleEditor(); }}>新增规则</Button> : null}
          </Space>
        </Flex>
        {primaryRule ? (
          <Row gutter={[0, 10]} className="warehouse-rent-current-rule">
            <Col xs={12} md={5}><Text type="secondary">站点</Text><Text>{primaryRule.site || '默认规则'}</Text></Col>
            <Col xs={12} md={4}><Text type="secondary">免租时长</Text><Text>{primaryRule.freeDays} {warehouseRentPeriodLabel(primaryRule.freePeriodUnit)}</Text></Col>
            <Col xs={12} md={6}><Text type="secondary">货物比重</Text><Text>{formatWarehouseRentRatio(primaryRule.densityMin)}</Text></Col>
            <Col xs={12} md={6}><Text type="secondary">计费方式</Text><Text>¥{primaryRule.unitRate.toFixed(4)}/{primaryRule.billingUnit}/{warehouseRentPeriodLabel(primaryRule.billingCycleUnit)}</Text></Col>
            <Col xs={12} md={3}><Text type="secondary">状态</Text><Tag color="green">生效中</Tag></Col>
          </Row>
        ) : (
          <Text type="warning">暂无启用规则，明细会展示但仓租为 0</Text>
        )}
      </Card>

      <Card size="small" className="warehouse-rent-filter-card">
        <Row gutter={[12, 12]} align="bottom">
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">站点</Text>
            <Select
              allowClear
              showSearch
              value={draftFilters.site}
              options={response.sites.map((site) => ({ label: site, value: site }))}
              placeholder="全部站点"
              onChange={(value) => setDraftFilters((current) => ({ ...current, site: value }))}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">业务员</Text>
            <Select
              allowClear
              showSearch
              value={draftFilters.salesperson}
              options={response.salespeople.map((name) => ({ label: name, value: name }))}
              placeholder="全部业务员"
              onChange={(value) => setDraftFilters((current) => ({ ...current, salesperson: value }))}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">客户编号</Text>
            <Input value={draftFilters.customerCode} placeholder="客户编号" onChange={(event) => setDraftFilters((current) => ({ ...current, customerCode: event.target.value }))} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">入仓快递号</Text>
            <Input value={draftFilters.domesticTrackingNo} placeholder="快递号" onChange={(event) => setDraftFilters((current) => ({ ...current, domesticTrackingNo: event.target.value }))} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">入库时间</Text>
            <AppDateRangePicker
              value={[draftFilters.inboundFrom, draftFilters.inboundTo]}
              onChange={([inboundFrom, inboundTo]) => setDraftFilters((current) => ({ ...current, inboundFrom, inboundTo }))}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">出库时间</Text>
            <AppDateRangePicker
              value={[draftFilters.outboundFrom, draftFilters.outboundTo]}
              onChange={([outboundFrom, outboundTo]) => setDraftFilters((current) => ({ ...current, outboundFrom, outboundTo }))}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">状态</Text>
            <Select
              allowClear
              value={draftFilters.status}
              placeholder="全部状态"
              options={[{ label: '在仓', value: 'IN_STOCK' }, { label: '已出仓', value: 'OUTBOUNDED' }]}
              onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text className="warehouse-rent-filter-label">仓租状态</Text>
            <Select
              allowClear
              value={draftFilters.hasRent}
              placeholder="全部"
              options={[{ label: '已产生仓租', value: true }, { label: '未产生仓租', value: false }]}
              onChange={(value) => setDraftFilters((current) => ({ ...current, hasRent: value }))}
            />
          </Col>
          <Col span={24}>
            <Flex justify="flex-end">
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  setFilters(draftFilters);
                  void load(draftFilters);
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  setDraftFilters(emptyFilters);
                  setFilters(emptyFilters);
                  void load(emptyFilters);
                }}
              >
                重置
              </Button>
            </Space>
            </Flex>
          </Col>
        </Row>
      </Card>

      <ManagedTable<WarehouseRentCustomerSummary>
        rowKey="customerCode"
        className="warehouse-rent-customer-table"
        loading={loading}
        columns={customerColumns}
        dataSource={customerRows}
        pagination={paginationWhenNeeded(customerRows.length, tenRowTablePagination)}
        minimumScrollX={1250}
        columnSettings={{
          storageKey: 'sunny.warehouse.rent-detail.customer-summary.columns.v1',
          title: '客户仓租汇总列设置',
          lockedKeys: ['customerCode', 'rentAmountRmb', 'actions']
        }}
        onRow={(row) => ({
          tabIndex: 0,
          'aria-label': `查看客户 ${row.customerCode} 的仓租原始明细`,
          onDoubleClick: () => setSelectedCustomerCode(row.customerCode),
          onKeyDown: (event) => {
            if (event.key === 'Enter') setSelectedCustomerCode(row.customerCode);
          }
        })}
      />

      <Drawer
        title={selectedCustomer ? `客户 ${selectedCustomer.customerCode} · 仓租原始明细` : '仓租原始明细'}
        width={1360}
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomerCode(undefined)}
      >
        {selectedCustomer ? (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Flex justify="space-between" align="center" gap={12} wrap>
              <Space wrap>
                <Text strong>{selectedCustomer.customerName || selectedCustomer.customerCode}</Text>
                <Tag color="blue">货物 {selectedCustomer.cargoLineCount} 条</Tag>
                <Tag>总件数 {selectedCustomer.packageCount} 件</Tag>
                <Tag>在仓 {selectedCustomer.inStockCargoLineCount} 条</Tag>
                <Tag>已出仓 {selectedCustomer.outboundCargoLineCount} 条</Tag>
              </Space>
              <Text strong className={selectedCustomer.rentAmountRmb > 0 ? 'warehouse-rent-amount' : undefined}>仓租合计 {money(selectedCustomer.rentAmountRmb)}</Text>
            </Flex>
            <ManagedTable<WarehouseRentDetailSummary>
              rowKey="id"
              className="warehouse-rent-detail-table warehouse-rent-customer-detail-table"
              columns={detailColumns}
              dataSource={selectedCustomer.detailRows}
              pagination={paginationWhenNeeded(selectedCustomer.detailRows.length, tenRowTablePagination)}
              minimumScrollX={2150}
              columnSettings={false}
            />
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="仓租规则"
        open={ruleModalOpen}
        width={1100}
        footer={null}
        onCancel={() => { setRuleModalOpen(false); setRuleEditorOpen(false); }}
        destroyOnHidden={false}
      >
        <Flex justify="space-between" align="center" gap={12}>
          <Text type="secondary">站点规则优先于默认规则；系统匹配不超过实际比重的最高规则，例如实际 1:150 使用 1:100，实际 1:200 使用 1:167。</Text>
          {canManageRules ? <Button type="primary" icon={<Plus size={15} />} onClick={() => openRuleEditor()}>新增规则</Button> : null}
        </Flex>
        {ruleEditorOpen ? (
          <section className="warehouse-rent-rule-editor" aria-label={editingRule ? '创建新版本' : '新增规则'}>
            <Flex align="center" justify="space-between" className="warehouse-rent-rule-editor-header">
              <Text strong>{editingRule ? '创建新版本' : '新增规则'}</Text>
            </Flex>
            <Form layout="vertical" size="small">
              <Row gutter={[12, 0]}>
                <Col xs={24} md={8}>
                  <Form.Item required label="规则名称">
                    <Input value={ruleDraft.name} onChange={(event) => setRuleDraft((current) => ({ ...current, name: event.target.value }))} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="站点">
                    <Input value={ruleDraft.site} placeholder="留空为默认规则" onChange={(event) => setRuleDraft((current) => ({ ...current, site: event.target.value }))} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item required label={editingRule ? '新版本生效日期' : '生效日期'}>
                    <AppDatePicker value={ruleDraft.effectiveFrom} onChange={(value) => setRuleDraft((current) => ({ ...current, effectiveFrom: value ?? '' }))} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item required label="免租时长">
                    <Space.Compact block>
                      <InputNumber
                        aria-label="免租时长"
                        min={0}
                        precision={0}
                        value={ruleDraft.freeDays}
                        style={{ width: 'calc(100% - 132px)' }}
                        onChange={(value) => setRuleDraft((current) => ({ ...current, freeDays: Number(value ?? 0) }))}
                      />
                      <Select
                        aria-label="免租时长单位"
                        value={ruleDraft.freePeriodUnit ?? 'DAY'}
                        options={rentPeriodOptions}
                        style={{ width: 132 }}
                        onChange={(value) => setRuleDraft((current) => ({ ...current, freePeriodUnit: value }))}
                      />
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item required label="计费基数">
                    <Select
                      aria-label="计费基数"
                      value={ruleDraft.billingUnit}
                      options={[{ label: 'CBM（体积）', value: 'CBM' }, { label: 'KG（重量）', value: 'KG' }]}
                      onChange={(value) => setRuleDraft((current) => ({ ...current, billingUnit: value }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item required label="计费周期">
                    <Select
                      aria-label="计费周期"
                      value={ruleDraft.billingCycleUnit ?? 'DAY'}
                      options={rentPeriodOptions}
                      onChange={(value) => setRuleDraft((current) => ({ ...current, billingCycleUnit: value }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    required
                    label="货物比重"
                    extra="默认 1:167，可任意修改；表示每 1 CBM 对应的 KG 数。"
                  >
                    <Space.Compact block className="warehouse-rent-ratio-input">
                      <Input aria-label="货物比重前缀" value="1:" readOnly tabIndex={-1} />
                      <InputNumber
                        aria-label="货物比重"
                        min={0}
                        value={ruleDraft.densityMin}
                        onChange={(value) => setRuleDraft((current) => ({ ...current, densityMin: Number(value ?? 0), densityMax: undefined }))}
                      />
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item required label={`仓租单价（${warehouseRentRateUnit(ruleDraft.billingUnit, ruleDraft.billingCycleUnit)}）`}>
                    <InputNumber aria-label="仓租单价" min={0.0001} precision={4} value={ruleDraft.unitRate} onChange={(value) => setRuleDraft((current) => ({ ...current, unitRate: Number(value ?? 0) }))} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item label="启用">
                    <Switch checked={ruleDraft.enabled !== false} onChange={(checked) => setRuleDraft((current) => ({ ...current, enabled: checked }))} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="备注">
                    <Input value={ruleDraft.remark} onChange={(event) => setRuleDraft((current) => ({ ...current, remark: event.target.value }))} />
                  </Form.Item>
                </Col>
              </Row>
              <Flex justify="flex-end" gap={8} className="warehouse-rent-rule-editor-actions">
                <Button onClick={() => setRuleEditorOpen(false)}>取消</Button>
                <Button type="primary" loading={savingRule} onClick={() => void saveRule()}>保存规则</Button>
              </Flex>
            </Form>
          </section>
        ) : null}
        <Divider className="warehouse-rent-rule-list-divider" />
        <Table<WarehouseRentRuleSummary>
          rowKey="id"
          size="small"
          columns={ruleColumns}
          dataSource={rules}
          pagination={paginationWhenNeeded(rules.length, tenRowTablePagination)}
          scroll={{ x: 1250 }}
        />
      </Modal>
    </section>
  );
}
