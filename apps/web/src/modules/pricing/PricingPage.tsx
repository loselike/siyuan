import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Banknote, CircleDollarSign, FileInput, PackageCheck } from 'lucide-react';
import type { AgentMarkupSummary, PriceBookImportInput, PriceBookSummary, PriceLookupRecommendation, PriceLookupResponse, QuoteSourceType, StaffRoleKey } from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { formatCurrency } from '../shared/format';
import { AppActionGroup, AppPage, AppPageHeader, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { calculatePriceChargeableWeight, parsePriceWorkbook, seedImportedPriceRows, type ImportedPriceRow, type PriceLookupFormValues } from './excel';

const { Title, Text } = Typography;

interface AgentMarkupFormValues {
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupPerKg: number;
  enabled: 'true' | 'false';
}

interface PriceBookRemarkFormValues {
  remark?: string;
}

type AgentMarkupRule = AgentMarkupSummary;
type PriceBookRecord = PriceBookSummary;
type PriceRecommendation = PriceLookupRecommendation;
type PriceLookupResult = PriceLookupResponse;

type XlsxModule = typeof import('xlsx');

function loadXlsx(): Promise<XlsxModule> {
  return import('xlsx');
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('无法读取价格表文件'));
    };
    reader.onerror = () => reject(new Error('无法读取价格表文件'));
    reader.readAsArrayBuffer(file);
  });
}



function formatKgRate(amount: number) {
  return (Math.round(amount * 100) / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatKgCurrencyRate(amount: number) {
  return `¥${formatKgRate(amount)}`;
}

function getQuoteSourceLabel(sourceType: QuoteSourceType) {
  return sourceType === 'agentApi' ? '代理接口' : '本地价格表';
}

function hasLookupNotes(item: PriceRecommendation) {
  return Boolean(item.remark || item.productSurchargeRemark || item.specialRemark);
}

function isAgentLevelMarkupRule(rule: AgentMarkupRule) {
  return !rule.channelName && !rule.realChannelName && !rule.destinationCountry;
}

function renderRecommendationNote(label: string, value?: string) {
  if (!value?.trim()) {
    return null;
  }
  return (
    <Text type="secondary" className="pricing-recommendation-note" title={value}>
      <span className="pricing-recommendation-note-label">{label}：</span>{value}
    </Text>
  );
}

function renderRecommendationMeta(label: string, value: ReactNode, strong = false) {
  return (
    <div className={strong ? 'pricing-recommendation-meta pricing-recommendation-meta-strong' : 'pricing-recommendation-meta'}>
      <span className="pricing-recommendation-label">{label}</span>
      <span className="pricing-recommendation-value">{value}</span>
    </div>
  );
}

function buildMissingImportedMarkupRules(rows: ImportedPriceRow[], rules: AgentMarkupRule[]) {
  const existingAgents = new Set(rules.filter((rule) => !rule.channelName && rule.enabled).map((rule) => rule.agentName));
  const fallbackByAgent = new Map(rules.filter((rule) => !rule.channelName).map((rule) => [rule.agentName, rule.markupPerKg]));
  const missing: AgentMarkupFormValues[] = [];
  for (const row of rows) {
    if (existingAgents.has(row.agentName)) {
      continue;
    }
    existingAgents.add(row.agentName);
    missing.push({
      agentName: row.agentName,
      channelName: undefined,
      realChannelName: undefined,
      destinationCountry: undefined,
      markupPerKg: fallbackByAgent.get(row.agentName) ?? 0.5,
      enabled: 'true'
    });
  }
  return missing;
}

function findImportedMarkupRule(rows: ImportedPriceRow[], rules: AgentMarkupRule[]) {
  return rules.find((rule) => !rule.channelName && rule.enabled && rows.some((row) => rule.agentName === row.agentName));
}

export function PricingPage({
  apiClient,
  role,
  notice,
  onNotice
}: {
  apiClient: ApiClient;
  role: StaffRoleKey;
  notice: string | null;
  onNotice: (message: string | null) => void;
}) {
  const [lookupForm] = Form.useForm<PriceLookupFormValues>();
  const [markupForm] = Form.useForm<AgentMarkupFormValues>();
  const [priceBookRemarkForm] = Form.useForm<PriceBookRemarkFormValues>();
  const [priceRows, setPriceRows] = useState<ImportedPriceRow[]>(() => [...seedImportedPriceRows]);
  const [priceBooks, setPriceBooks] = useState<PriceBookRecord[]>([]);
  const [markupRules, setMarkupRules] = useState<AgentMarkupRule[]>([]);
  const [selectedMarkupRuleIds, setSelectedMarkupRuleIds] = useState<string[]>([]);
  const [markupPage, setMarkupPage] = useState(1);
  const [selectedPriceBookId, setSelectedPriceBookId] = useState<string | null>(null);
  const [editingMarkupRule, setEditingMarkupRule] = useState<AgentMarkupRule | null>(null);
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [markupChannelDetailOpen, setMarkupChannelDetailOpen] = useState(false);
  const [markupSheetFilter, setMarkupSheetFilter] = useState('ALL');
  const [batchMarkupPerKg, setBatchMarkupPerKg] = useState(0.5);
  const [priceBookRemarkModalOpen, setPriceBookRemarkModalOpen] = useState(false);
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [selectedPriceRecommendation, setSelectedPriceRecommendation] = useState<PriceRecommendation | null>(null);
  const agentMarkupRules = useMemo(() => {
    return markupRules.filter(isAgentLevelMarkupRule);
  }, [markupRules]);
  const selectedVisibleMarkupRuleIds = selectedMarkupRuleIds.filter((id) => agentMarkupRules.some((rule) => rule.id === id));
  const selectedMarkupRule = agentMarkupRules.find((rule) => rule.id === selectedVisibleMarkupRuleIds[0]) ?? null;
  const selectedMarkupRules = agentMarkupRules.filter((rule) => selectedVisibleMarkupRuleIds.includes(rule.id));
  const selectedPriceBook = priceBooks.find((book) => book.id === selectedPriceBookId) ?? null;
  const selectedMarkupChannelRows = selectedMarkupRule
    ? priceRows.filter((row) =>
        row.agentName === selectedMarkupRule.agentName &&
        (!selectedMarkupRule.channelName || row.channelName === selectedMarkupRule.channelName)
      )
    : [];
  const getMarkupRowSmallTableName = (row: ImportedPriceRow) => row.sourceSheetName?.trim() || row.channelName?.trim() || '未标记小表';
  const selectedMarkupSheetOptions = Array.from(
    new Set(selectedMarkupChannelRows.map(getMarkupRowSmallTableName))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const filteredMarkupChannelRows = selectedMarkupChannelRows.filter((row) => {
    return markupSheetFilter === 'ALL' || getMarkupRowSmallTableName(row) === markupSheetFilter;
  });
  const canViewMarkupDetails = role === 'ADMIN';
  const pricingSubItems = [
    { key: 'lookup', label: '查价', description: '业务员报价查询' },
    ...(canViewMarkupDetails
      ? [
          { key: 'markup', label: '代理加价规则', description: '维护业务员加价' },
          { key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }
        ]
      : [])
  ];
  const [activePricingSection, setActivePricingSection] = useState('lookup');
  const volumeCbm = Form.useWatch('volumeCbm', lookupForm);
  const actualWeightKg = Form.useWatch('actualWeightKg', lookupForm);
  const lengthCm = Form.useWatch('lengthCm', lookupForm);
  const widthCm = Form.useWatch('widthCm', lookupForm);
  const heightCm = Form.useWatch('heightCm', lookupForm);
  const packageCount = Form.useWatch('packageCount', lookupForm);
  const unitActualWeightKg = Form.useWatch('unitActualWeightKg', lookupForm);
  const calculatedChargeableWeight = calculatePriceChargeableWeight({
    volumeCbm,
    actualWeightKg,
    lengthCm,
    widthCm,
    heightCm,
    packageCount,
    unitActualWeightKg
  });
  useEffect(() => {
    if (calculatedChargeableWeight > 0) {
      lookupForm.setFieldValue('chargeableWeightKg', calculatedChargeableWeight);
    }
  }, [calculatedChargeableWeight, lookupForm]);

  useEffect(() => {
    let alive = true;
    if (!canViewMarkupDetails) {
      setPriceBooks([]);
      setPriceRows([]);
      return () => {
        alive = false;
      };
    }
    Promise.all([apiClient.priceBooks(), apiClient.agentMarkupRules()])
      .then(([response, rules]) => {
        if (!alive) {
          return;
        }
        setPriceBooks(response.books);
        setPriceRows([...response.rows, ...seedImportedPriceRows]);
        setMarkupRules(rules);
      })
      .catch((error) => {
        if (alive) {
          onNotice(error instanceof Error ? `价格与加价规则加载失败：${error.message}` : '价格与加价规则加载失败');
        }
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canViewMarkupDetails, onNotice]);

  function openCreateMarkupRule() {
    setEditingMarkupRule(null);
    markupForm.setFieldsValue({ agentName: '', channelName: '', realChannelName: '', destinationCountry: '', markupPerKg: 0.5, enabled: 'true' });
    setMarkupModalOpen(true);
  }

  function openEditMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    openEditSpecificMarkupRule(selectedMarkupRule);
  }

  function openMarkupChannelDetail() {
    if (!selectedMarkupRule) {
      return;
    }
    setMarkupSheetFilter('ALL');
    setBatchMarkupPerKg(selectedMarkupRule.markupPerKg);
    setMarkupChannelDetailOpen(true);
  }

  function openEditSpecificMarkupRule(rule: AgentMarkupRule) {
    setEditingMarkupRule(rule);
    markupForm.setFieldsValue({
      agentName: rule.agentName,
      channelName: rule.channelName,
      realChannelName: rule.realChannelName,
      destinationCountry: rule.destinationCountry,
      markupPerKg: rule.markupPerKg,
      enabled: rule.enabled ? 'true' : 'false'
    });
    setMarkupModalOpen(true);
  }

  function findLineMarkupRule(row: ImportedPriceRow) {
    const realChannelName = row.realChannelName ?? row.channelName;
    return markupRules.find(
      (rule) =>
        rule.enabled &&
        rule.agentName === row.agentName &&
        rule.channelName === row.channelName &&
        rule.realChannelName === realChannelName &&
        rule.destinationCountry === row.destinationCountry
    );
  }

  function openCreateLineMarkupRule(row: ImportedPriceRow) {
    setMarkupChannelDetailOpen(false);
    setEditingMarkupRule(null);
    markupForm.setFieldsValue({
      agentName: row.agentName,
      channelName: row.channelName,
      realChannelName: row.realChannelName ?? row.channelName,
      destinationCountry: row.destinationCountry,
      markupPerKg: selectedMarkupRule?.markupPerKg ?? 0.5,
      enabled: 'true'
    });
    setMarkupModalOpen(true);
  }

  function openEditLineMarkupRule(rule: AgentMarkupRule) {
    setMarkupChannelDetailOpen(false);
    openEditSpecificMarkupRule(rule);
  }

  async function handleSubmitMarkupRule() {
    const values = await markupForm.validateFields();
    const payload = {
      agentName: values.agentName.trim(),
      channelName: values.channelName?.trim() || undefined,
      realChannelName: values.realChannelName?.trim() || undefined,
      destinationCountry: values.destinationCountry?.trim() || undefined,
      markupPerKg: values.markupPerKg,
      enabled: values.enabled === 'true'
    };
    const rule: AgentMarkupRule = editingMarkupRule
      ? await apiClient.updateAgentMarkupRule(editingMarkupRule.id, payload)
      : await apiClient.createAgentMarkupRule(payload);
    setMarkupRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
    setSelectedMarkupRuleIds([rule.id]);
    setMarkupModalOpen(false);
    markupForm.resetFields();
    onNotice(`${rule.agentName} 加价规则已${editingMarkupRule ? '更新' : '新增'}：+${formatCurrency(rule.markupPerKg)}/kg`);
  }

  async function handleBatchApplySheetMarkup() {
    if (!selectedMarkupRule || filteredMarkupChannelRows.length === 0) {
      onNotice('当前筛选没有可加价的线路');
      return;
    }
    if (!Number.isFinite(batchMarkupPerKg) || batchMarkupPerKg < 0) {
      onNotice('请输入有效的业务员加价');
      return;
    }

    try {
      const updatedRules = await Promise.all(
        filteredMarkupChannelRows.map((row) => {
          const existing = findLineMarkupRule(row);
          const payload = {
            agentName: row.agentName,
            channelName: row.channelName,
            realChannelName: row.realChannelName ?? row.channelName,
            destinationCountry: row.destinationCountry,
            markupPerKg: batchMarkupPerKg,
            enabled: true
          };
          return existing
            ? apiClient.updateAgentMarkupRule(existing.id, payload)
            : apiClient.createAgentMarkupRule(payload);
        })
      );
      setMarkupRules((current) => {
        const updatedById = new Map(updatedRules.map((rule) => [rule.id, rule]));
        const existingIds = new Set(current.map((rule) => rule.id));
        const merged = current.map((rule) => updatedById.get(rule.id) ?? rule);
        const created = updatedRules.filter((rule) => !existingIds.has(rule.id));
        return [...created, ...merged];
      });
      const filterLabel = markupSheetFilter === 'ALL' ? '全部小表' : markupSheetFilter;
      onNotice(`已为 ${updatedRules.length} 条 ${filterLabel} 线路统一设置 +${formatCurrency(batchMarkupPerKg)}/kg`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '批量加价失败');
    }
  }

  function disableSelectedMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    void apiClient.updateAgentMarkupRule(selectedMarkupRule.id, { enabled: false }).then((updated) => {
      setMarkupRules((current) => current.map((rule) => (rule.id === updated.id ? updated : rule)));
      onNotice(`${selectedMarkupRule.agentName} 加价规则已停用`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则停用失败');
    });
  }

  function deleteSelectedMarkupRule() {
    if (!selectedMarkupRules.length) {
      return;
    }
    const ids = selectedMarkupRules.map((rule) => rule.id);
    void Promise.all(ids.map((id) => apiClient.deleteAgentMarkupRule(id))).then((deleted) => {
      const deletedIds = new Set(deleted.map((rule) => rule.id));
      setMarkupRules((current) => current.filter((rule) => !deletedIds.has(rule.id)));
      setSelectedMarkupRuleIds([]);
      onNotice(`已删除 ${deleted.length} 条加价规则`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则删除失败');
    });
  }

  function openEditPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    priceBookRemarkForm.setFieldsValue({ remark: selectedPriceBook.remark ?? '' });
    setPriceBookRemarkModalOpen(true);
  }

  async function handleSubmitPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    const values = await priceBookRemarkForm.validateFields();
    const remark = values.remark?.trim() || undefined;
    try {
      const updated = await apiClient.updatePriceBookRemark(selectedPriceBook.id, { remark });
      setPriceBooks((current) => current.map((book) => (book.id === updated.id ? updated : book)));
      setPriceBookRemarkModalOpen(false);
      priceBookRemarkForm.resetFields();
      onNotice(`${updated.fileName} 备注已更新`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表备注更新失败');
    }
  }

  async function handlePriceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const parsedRows = parsePriceWorkbook(await readFileAsArrayBuffer(file), await loadXlsx(), file.name);
      const rows: PriceBookImportInput['rows'] = parsedRows.map(({ id: _id, priceBookId: _priceBookId, remark: _remark, ...row }) => row);
      const imported = await apiClient.importPriceBook({ fileName: file.name, rows });
      setPriceBooks((current) => [imported.book, ...current.filter((book) => book.id !== imported.book.id)]);
      setSelectedPriceBookId(imported.book.id);
      setPriceRows((current) => [...imported.rows, ...current.filter((row) => row.priceBookId !== imported.book.id)]);
      const missingMarkupRules = buildMissingImportedMarkupRules(imported.rows, markupRules);
      let createdMarkupRules: AgentMarkupRule[] = [];
      try {
        createdMarkupRules = await Promise.all(
          missingMarkupRules.map((rule) =>
            apiClient.createAgentMarkupRule({
              agentName: rule.agentName,
              markupPerKg: rule.markupPerKg,
              enabled: true
            })
          )
        );
        if (createdMarkupRules.length > 0) {
          setMarkupRules((current) => [...createdMarkupRules, ...current]);
        }
      } catch (error) {
        onNotice(error instanceof Error ? `价格表已导入，加价规则同步失败：${error.message}` : '价格表已导入，加价规则同步失败');
        event.target.value = '';
        return;
      }
      const focusRule = createdMarkupRules[0] ?? findImportedMarkupRule(imported.rows, markupRules);
      if (focusRule) {
        setSelectedMarkupRuleIds([focusRule.id]);
        setMarkupPage(1);
      }
      onNotice(`已导入价格表 ${file.name}，新增 ${imported.rows.length} 条代理成本价，同步 ${createdMarkupRules.length} 条加价规则`);
      event.target.value = '';
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表导入失败');
    }
  }

  async function deleteSelectedPriceBook() {
    const selectedBook = priceBooks.find((book) => book.id === selectedPriceBookId);
    if (!selectedBook) {
      return;
    }

    try {
      await apiClient.deletePriceBook(selectedBook.id);
      const latestMarkupRules = await apiClient.agentMarkupRules();
      setPriceBooks((current) => current.filter((book) => book.id !== selectedBook.id));
      setPriceRows((current) => current.filter((row) => row.priceBookId !== selectedBook.id));
      setMarkupRules(latestMarkupRules);
      setSelectedPriceBookId(null);
      setSelectedMarkupRuleIds((current) => current.filter((id) => latestMarkupRules.some((rule) => rule.id === id)));
      onNotice(`已删除价格表 ${selectedBook.fileName}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表删除失败');
    }
  }

  async function runLookup() {
    try {
      const values = await lookupForm.validateFields();
      const amazonCode = values.amazonCode?.trim();
      const destinationCountry = values.destinationCountry?.trim();
      const postalCode = values.postalCode?.trim();
      if (!amazonCode && (!destinationCountry || !postalCode)) {
        onNotice('非亿阳仓库代码查价必须填写目的地和邮编');
        return;
      }
      const result = await apiClient.lookupPrice({
        ...values,
        amazonCode,
        destinationCountry: destinationCountry ?? '',
        postalCode: postalCode ?? ''
      });
      setLookupResult(result);
      setSelectedPriceRecommendation(null);
      onNotice(
        canViewMarkupDetails
          ? `${result.price.agentName} ${result.price.destinationCountry} ${result.chargeableWeightKg}kg 报价 ${formatCurrency(result.totalSales)}`
          : `${result.channelName} ${result.price.destinationCountry} ${result.chargeableWeightKg}kg 报价 ${formatCurrency(result.totalSales)}`
      );
    } catch (error) {
      if (error instanceof Error) {
        onNotice(error.message);
      }
    }
  }

  return (
    <AppPage>
      <AppPageHeader
        title="报价查价中心"
        description={canViewMarkupDetails ? '导入代理价格表，按代理维护加价规则，快速得到业务员报价。' : '输入目的地、重量和货物信息，快速得到可对外使用的报价。'}
        actions={(
          <AppActionGroup>
            <Button type="primary" icon={<CircleDollarSign size={16} />} onClick={() => void runLookup()}>
              查询报价
            </Button>
          </AppActionGroup>
        )}
      />

      {renderNoticeBar(notice)}

      <Row gutter={[16, 16]}>
        {canViewMarkupDetails ? (
          <Col xs={24} md={8}>
            <MetricCard icon={<FileInput />} title="代理成本价" value={String(priceRows.length)} extra="XLS 导入和手工维护" />
          </Col>
        ) : null}
        {canViewMarkupDetails ? (
          <Col xs={24} md={8}>
            <MetricCard icon={<Banknote />} title="加价规则" value={String(agentMarkupRules.filter((rule) => rule.enabled).length)} extra="按代理维护 +0.5 / +1" />
          </Col>
        ) : null}
        <Col xs={24} md={canViewMarkupDetails ? 8 : 12}>
          <MetricCard
            icon={<PackageCheck />}
            title="最近查价"
            value={lookupResult ? formatCurrency(lookupResult.totalSales) : '待查询'}
            extra={lookupResult ? (canViewMarkupDetails ? lookupResult.price.agentName : `${lookupResult.price.destinationCountry} / ${lookupResult.channelName}`) : '输入国家/重量查询'}
          />
        </Col>
      </Row>

      <ModuleSubWorkspace items={pricingSubItems} activeKey={activePricingSection} onChange={setActivePricingSection}>
        {(activePricingSection === 'lookup' || activePricingSection === 'markup') ? (
          <Row gutter={[16, 16]} className="main-grid">
        {activePricingSection === 'lookup' ? (
        <Col xs={24}>
          <Card className="module-grid pricing-lookup-card" title="查价">
            <Form
              form={lookupForm}
              name="priceLookupForm"
              layout="vertical"
              className="pricing-lookup-form"
              initialValues={{
                amazonCode: 'AMZ-US-001',
                productName: '桌子，椅子',
                destinationCountry: '美国',
                postalCode: '60750',
                address: 'France 549 rue du maubon Choisy au bac',
                packageInfo: '',
                volumeCbm: 5,
                packageCount: 1,
                chargeableWeightKg: 835
              }}
            >
              <div className="pricing-form-section">
                <Text className="pricing-section-title">基础信息</Text>
                <Row gutter={[12, 8]}>
                  <Col xs={24}>
                    <Form.Item name="productName" label="品名">
                      <Input placeholder="如 桌子，椅子" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="amazonCode" label="亚马逊代码">
                      <Input placeholder="如 AMZ-US-001" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="destinationCountry" label="目的地">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="postalCode" label="邮编">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item name="address" label="地址">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="packageInfo" label="数据/包装（可选）">
                      <Input.TextArea rows={3} placeholder="如 1个木箱、2托、纸箱货" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className="pricing-form-section pricing-form-section-muted">
                <Flex justify="space-between" align="center" gap={12} wrap="wrap">
                  <Text className="pricing-section-title">计费信息</Text>
                  <Text type="secondary" className="pricing-section-hint">没有尺寸时直接填方数，系统按 CBM x 167 自动算计费重。</Text>
                </Flex>
                <Row gutter={[12, 8]}>
                  <Col xs={24} md={8}>
                    <Form.Item name="actualWeightKg" label="实际重量 KG">
                      <InputNumber min={0} precision={3} placeholder="没有可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="volumeCbm" label="方数 CBM">
                      <InputNumber min={0} precision={3} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="chargeableWeightKg" label="计费重 kg" rules={[{ required: true, message: '请输入计费重' }]}>
                      <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <div className="chargeable-weight-panel">
                      <Text strong>自动计费重</Text>
                      <Title level={3}>{calculatedChargeableWeight > 0 ? calculatedChargeableWeight : 0} KG</Title>
                    </div>
                  </Col>
                  <Col xs={24}>
                    <Text type="secondary" className="pricing-section-hint">有详细尺寸再填</Text>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="lengthCm" label="长 cm">
                      <InputNumber min={0} precision={2} placeholder="可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="widthCm" label="宽 cm">
                      <InputNumber min={0} precision={2} placeholder="可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="heightCm" label="高 cm">
                      <InputNumber min={0} precision={2} placeholder="可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="packageCount" label="件数">
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="unitActualWeightKg" label="单件实重 KG">
                      <InputNumber min={0} precision={3} placeholder="不知道可不填" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Flex justify="flex-end" className="pricing-form-actions">
                <Button aria-label="查价查询" type="primary" icon={<CircleDollarSign size={16} />} onClick={() => void runLookup()}>
                  查询报价
                </Button>
              </Flex>
            </Form>
            {lookupResult ? (
              <div className="pricing-result">
                <div className="pricing-result-summary">
                  <div className="pricing-result-hero">
                    <Text type="secondary">报价</Text>
                    <Title level={3}>报价 {formatCurrency(lookupResult.totalSales)}</Title>
                    <Text type="secondary">
                      {lookupResult.channelName} / {lookupResult.weightSegmentLabel}
                    </Text>
                  </div>
                  <div className="pricing-result-metrics">
                    <div>
                      <Text type="secondary">推荐渠道</Text>
                      <Text strong>{lookupResult.channelName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">计费重</Text>
                      <Text strong>{lookupResult.chargeableWeightKg.toFixed(3)} kg</Text>
                    </div>
                    <div>
                      <Text type="secondary">得出总价</Text>
                      <Text strong>得出总价：{formatCurrency(lookupResult.totalPrice)}</Text>
                    </div>
                  </div>
                </div>

                <div className="pricing-result-grid">
                  <div className="pricing-result-item">
                    <Text type="secondary">亚马逊代码</Text>
                    <Text strong>亚马逊代码：{lookupResult.amazonCode || '未填写'}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">品名</Text>
                    <Text strong>品名：{lookupResult.productName || '未填写'}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">邮编</Text>
                    <Text strong>邮编：{lookupResult.postalCode || '未填写'}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">重量段</Text>
                    <Text strong>重量段：{lookupResult.weightSegmentLabel}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">单价</Text>
                    <Text strong>单价：{formatKgCurrencyRate(lookupResult.salesRatePerKg)}/kg</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">目的地 / 渠道</Text>
                    <Text strong>目的地：{lookupResult.price.destinationCountry} / 渠道：{lookupResult.channelName}</Text>
                  </div>
                  {lookupResult.price.warehouseCode ? (
                    <div className="pricing-result-item">
                      <Text type="secondary">仓库编码</Text>
                      <Text strong>{lookupResult.price.warehouseCode}</Text>
                    </div>
                  ) : null}
                </div>

                {canViewMarkupDetails ? (
                  <div className="pricing-result-grid pricing-admin-only">
                    <div className="pricing-result-item">
                      <Text type="secondary">代理成本</Text>
                      <Text strong>{lookupResult.price.costPerKg === undefined ? '后端未返回' : `${lookupResult.price.currency} ${formatKgRate(lookupResult.price.costPerKg)}/kg`}</Text>
                    </div>
                    <div className="pricing-result-item">
                      <Text type="secondary">代理加价</Text>
                      <Text strong>{lookupResult.markup ? `代理加价：+${formatCurrency(lookupResult.markup.markupPerKg)}/kg` : '后端未返回'}</Text>
                    </div>
                    <div className="pricing-result-item">
                      <Text type="secondary">成本合计</Text>
                      <Text strong>{lookupResult.totalCost === undefined ? '后端未返回' : `成本合计：${formatCurrency(lookupResult.totalCost)}`}</Text>
                    </div>
                    <div className="pricing-result-item">
                      <Text type="secondary">毛利</Text>
                      <Text strong>{lookupResult.grossProfit === undefined ? '后端未返回' : `毛利 ${formatCurrency(lookupResult.grossProfit)}`}</Text>
                    </div>
                  </div>
                ) : null}

                <Row gutter={[12, 12]} className="pricing-recommendations">
                  <Col xs={24} md={12}>
                    <Card size="small" title="最便宜 Top3" className="pricing-recommendation-card">
                      <Space direction="vertical" size={8} className="full-width">
                        {lookupResult.cheapestRecommendations.map((item, index) => (
                          <button
                            type="button"
                            className="pricing-recommendation"
                            key={`cheap-${item.price.id}`}
                            onClick={() => setSelectedPriceRecommendation(item)}
                          >
                            <Flex justify="space-between" align="flex-start" gap={8}>
                              <Text strong className="pricing-recommendation-title">{index + 1}. {item.channelName}</Text>
                              <Tag color={index === 0 ? 'green' : 'blue'}>{formatCurrency(item.totalSales)}</Tag>
                            </Flex>
                            {hasLookupNotes(item) ? <Tag color="cyan" className="pricing-note-tag">有备注</Tag> : null}
                            {renderRecommendationMeta('渠道报价表', item.realChannelName)}
                            {renderRecommendationMeta(
                              canViewMarkupDetails ? '代理 / 重量段' : '时效 / 重量段',
                              `${canViewMarkupDetails ? item.price.agentName : item.transitLabel} / ${item.weightSegmentLabel}`,
                              true
                            )}
                            {renderRecommendationMeta('时效', item.transitLabel)}
                            {canViewMarkupDetails && item.price.costPerKg !== undefined ? renderRecommendationMeta('代理成本单价', `${formatKgCurrencyRate(item.price.costPerKg)}/kg`) : null}
                            {renderRecommendationMeta(
                              canViewMarkupDetails ? '单价 / 毛利' : '单价',
                              `单价 ${formatKgCurrencyRate(item.salesRatePerKg)}/kg${canViewMarkupDetails && item.grossProfit !== undefined ? `，毛利 ${formatCurrency(item.grossProfit)}` : ''}`,
                              true
                            )}
                            {renderRecommendationNote('产品附加', item.productSurchargeRemark)}
                            {renderRecommendationNote('特别说明/尺寸要求', item.specialRemark)}
                          </button>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" title="最快 Top3" className="pricing-recommendation-card">
                      <Space direction="vertical" size={8} className="full-width">
                        {lookupResult.fastestRecommendations.map((item, index) => (
                          <button
                            type="button"
                            className="pricing-recommendation"
                            key={`fast-${item.price.id}`}
                            onClick={() => setSelectedPriceRecommendation(item)}
                          >
                            <Flex justify="space-between" align="flex-start" gap={8}>
                              <Text strong className="pricing-recommendation-title">{index + 1}. {item.channelName}</Text>
                              <Tag color={index === 0 ? 'purple' : 'geekblue'}>{item.transitLabel}</Tag>
                            </Flex>
                            {hasLookupNotes(item) ? <Tag color="cyan" className="pricing-note-tag">有备注</Tag> : null}
                            {renderRecommendationMeta('渠道报价表', item.realChannelName)}
                            {renderRecommendationMeta(
                              canViewMarkupDetails ? '代理 / 重量段' : '报价 / 重量段',
                              `${canViewMarkupDetails ? item.price.agentName : formatCurrency(item.totalSales)} / ${item.weightSegmentLabel}`,
                              true
                            )}
                            {renderRecommendationMeta('报价', formatCurrency(item.totalSales))}
                            {canViewMarkupDetails && item.price.costPerKg !== undefined ? renderRecommendationMeta('代理成本单价', `${formatKgCurrencyRate(item.price.costPerKg)}/kg`) : null}
                            {renderRecommendationMeta(
                              canViewMarkupDetails ? '单价 / 毛利' : '单价',
                              `单价 ${formatKgCurrencyRate(item.salesRatePerKg)}/kg${canViewMarkupDetails && item.grossProfit !== undefined ? `，毛利 ${formatCurrency(item.grossProfit)}` : ''}`,
                              true
                            )}
                            {renderRecommendationNote('产品附加', item.productSurchargeRemark)}
                            {renderRecommendationNote('特别说明/尺寸要求', item.specialRemark)}
                          </button>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              <Text type="secondary">亿阳可用亚马逊代码直接查；其他报价需填写目的地、邮编和计费重。</Text>
            )}
          </Card>
        </Col>
        ) : null}

        <Modal
          title="报价详情"
          open={Boolean(selectedPriceRecommendation)}
          destroyOnHidden
          footer={
            <Button type="primary" onClick={() => setSelectedPriceRecommendation(null)}>
              关闭
            </Button>
          }
          onCancel={() => setSelectedPriceRecommendation(null)}
        >
          {selectedPriceRecommendation ? (
            <Space direction="vertical" size={14} className="full-width pricing-detail-modal">
              <div className="pricing-result-grid">
                <div className="pricing-result-item">
                  <Text type="secondary">渠道</Text>
                  <Text strong>{selectedPriceRecommendation.channelName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">承运商</Text>
                  <Text strong>{selectedPriceRecommendation.carrierName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">承运路线</Text>
                  <Text strong>{selectedPriceRecommendation.businessRouteName ?? '未绑定路线'}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">渠道报价表</Text>
                  <Text strong>{selectedPriceRecommendation.realChannelName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">报价来源</Text>
                  <Text strong>{getQuoteSourceLabel(selectedPriceRecommendation.quoteSourceType)}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">总报价</Text>
                  <Text strong>{formatCurrency(selectedPriceRecommendation.totalSales)}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">时效</Text>
                  <Text strong>{selectedPriceRecommendation.transitLabel}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">重量段</Text>
                  <Text strong>{selectedPriceRecommendation.weightSegmentLabel}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">单价</Text>
                  <Text strong>{formatKgCurrencyRate(selectedPriceRecommendation.salesRatePerKg)}/kg</Text>
                </div>
                {selectedPriceRecommendation.price.warehouseCode ? (
                  <div className="pricing-result-item">
                    <Text type="secondary">仓库编码</Text>
                    <Text strong>{selectedPriceRecommendation.price.warehouseCode}</Text>
                  </div>
                ) : null}
              </div>

              {canViewMarkupDetails ? (
                <div className="pricing-result-grid pricing-admin-only">
                  <div className="pricing-result-item">
                    <Text type="secondary">代理</Text>
                    <Text strong>{selectedPriceRecommendation.price.agentName}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">代理成本单价</Text>
                    <Text strong>{selectedPriceRecommendation.price.costPerKg === undefined ? '后端未返回' : `${selectedPriceRecommendation.price.currency} ${formatKgRate(selectedPriceRecommendation.price.costPerKg)}/kg`}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">成本合计</Text>
                    <Text strong>{selectedPriceRecommendation.totalCost === undefined ? '后端未返回' : formatCurrency(selectedPriceRecommendation.totalCost)}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">毛利</Text>
                    <Text strong>{selectedPriceRecommendation.grossProfit === undefined ? '后端未返回' : formatCurrency(selectedPriceRecommendation.grossProfit)}</Text>
                  </div>
                </div>
              ) : null}

              <div className="pricing-detail-note">
                <Text type="secondary">完整备注</Text>
                <Text>{selectedPriceRecommendation.remark || '暂无备注'}</Text>
              </div>
              <div className="pricing-detail-note">
                <Text type="secondary">产品附加</Text>
                <Text>{selectedPriceRecommendation.productSurchargeRemark || '暂无产品附加说明'}</Text>
              </div>
              <div className="pricing-detail-note">
                <Text type="secondary">特别说明/尺寸要求</Text>
                <Text>{selectedPriceRecommendation.specialRemark || '暂无特别说明/尺寸要求'}</Text>
              </div>
            </Space>
          ) : null}
        </Modal>

        {activePricingSection === 'markup' && canViewMarkupDetails ? (
          <Col xs={24}>
            <Card
              className="module-grid"
              title="代理加价规则"
              extra={
                <Space>
                  <Button size="small" onClick={openCreateMarkupRule}>增加</Button>
                  <Button size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1} onClick={openEditMarkupRule}>修改</Button>
                  <Button size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1} onClick={openMarkupChannelDetail}>查看线路</Button>
                  <Popconfirm
                    title="确认停用该加价规则？"
                    description="停用后业务员报价不会再使用该规则，请确认报价策略已经更新。"
                    okText="确认停用"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    disabled={selectedVisibleMarkupRuleIds.length !== 1}
                    onConfirm={disableSelectedMarkupRule}
                  >
                    <Button size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1 || selectedMarkupRule?.enabled === false}>停用</Button>
                  </Popconfirm>
                  <Popconfirm
                    title={`确认删除 ${selectedVisibleMarkupRuleIds.length} 条加价规则？`}
                    description="删除后该规则会从加价规则列表移除，请确认不再需要保留。"
                    okText="确认删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    disabled={selectedVisibleMarkupRuleIds.length === 0}
                    onConfirm={deleteSelectedMarkupRule}
                  >
                    <Button size="small" danger disabled={selectedVisibleMarkupRuleIds.length === 0}>删除</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Table
                rowKey="id"
                size="small"
                pagination={{ ...tenRowTablePagination, current: markupPage, onChange: (page) => setMarkupPage(page) }}
                dataSource={agentMarkupRules}
                rowSelection={{
                  selectedRowKeys: selectedVisibleMarkupRuleIds,
                  onChange: (keys) => setSelectedMarkupRuleIds(keys.map(String))
                }}
                onRow={(record) => ({ onClick: () => setSelectedMarkupRuleIds([record.id]) })}
                columns={[
                  { title: '代理', dataIndex: 'agentName' },
                  { title: '渠道', dataIndex: 'channelName', render: (value?: string) => value || <Text type="secondary">全部渠道</Text> },
                  { title: '线路自定义', dataIndex: 'realChannelName', render: (value?: string) => value || <Text type="secondary">全部线路</Text> },
                  { title: '国家', dataIndex: 'destinationCountry', render: (value?: string) => value || <Text type="secondary">全部国家</Text> },
                  { title: '业务员加价', render: (_, rule) => `+${formatCurrency(rule.markupPerKg)}/kg`, width: 160 },
                  { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
                ]}
              />
            </Card>
          </Col>
        ) : null}
          </Row>
        ) : null}

      {activePricingSection === 'priceBooks' && canViewMarkupDetails ? (
          <Card
            className="module-grid"
            title="价格表管理"
            extra={
              <Space>
                <Button size="small" icon={<FileInput size={14} />}>
                  <label className="file-button-label">
                    增加价格表
                    <input aria-label="增加价格表" type="file" accept=".xls,.xlsx" onChange={(event) => void handlePriceFileChange(event)} />
                  </label>
                </Button>
                <Button size="small" disabled={!selectedPriceBookId} onClick={openEditPriceBookRemark}>
                  修改备注
                </Button>
                <Popconfirm
                  title="确认删除该价格表？"
                  description="删除后该价格表导入的报价行会从当前报价库移除。"
                  okText="删除价格表"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedPriceBookId}
                  onConfirm={deleteSelectedPriceBook}
                >
                  <Button size="small" disabled={!selectedPriceBookId}>
                    删除价格表
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={priceBooks}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedPriceBookId ? [selectedPriceBookId] : [],
                onChange: (keys) => setSelectedPriceBookId(String(keys[0] ?? ''))
              }}
              onRow={(record) => ({ onClick: () => setSelectedPriceBookId(record.id) })}
              columns={[
                { title: '价格表名称', dataIndex: 'fileName' },
                { title: '备注', dataIndex: 'remark', width: 120, render: (remark?: string) => (remark ? <Tag color="cyan">有备注</Tag> : <Text type="secondary">未填写</Text>) },
                { title: '导入行数', dataIndex: 'rowCount', width: 120 },
                { title: '导入时间', dataIndex: 'importedAt', width: 220, render: (value: string) => new Date(value).toLocaleString('zh-CN') }
              ]}
            />
          </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Modal
        title="修改价格表备注"
        open={priceBookRemarkModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitPriceBookRemark()}
        onCancel={() => setPriceBookRemarkModalOpen(false)}
      >
        <Form form={priceBookRemarkForm} name="priceBookRemarkForm" layout="vertical">
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={5} placeholder="填写该价格表的尺寸要求、附加费说明、特殊限制等备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedMarkupRule ? `${selectedMarkupRule.agentName} 渠道线路详情` : '渠道线路详情'}
        open={markupChannelDetailOpen}
        destroyOnHidden
        width={920}
        footer={<Button type="primary" onClick={() => setMarkupChannelDetailOpen(false)}>关闭</Button>}
        onCancel={() => setMarkupChannelDetailOpen(false)}
      >
        <Space direction="vertical" size={12} className="full-width">
          <Alert
            className="notice-bar"
            type="info"
            showIcon
            message="代理基准加价会长期作用于该代理后续导入的价格表；某条真实渠道已有自定义规则时，可在这里直接修改。"
          />
          <div className="pricing-line-toolbar">
            <Space wrap size={12}>
              <label className="compact-field">
                <span>小表</span>
                <select
                  aria-label="按小表筛选线路"
                  className="native-select"
                  value={markupSheetFilter}
                  onChange={(event) => setMarkupSheetFilter(event.target.value)}
                >
                  <option value="ALL">全部小表</option>
                  {selectedMarkupSheetOptions.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                <span>批量加价</span>
                <input
                  aria-label="批量业务员加价 / kg"
                  className="native-number"
                  type="number"
                  min={0}
                  step={0.1}
                  value={batchMarkupPerKg}
                  onChange={(event) => setBatchMarkupPerKg(Number(event.target.value))}
                />
              </label>
              <Button type="primary" onClick={() => void handleBatchApplySheetMarkup()}>
                批量统一加价
              </Button>
              <Tag color="blue">当前 {filteredMarkupChannelRows.length} 条线路</Tag>
            </Space>
          </div>
          <Table
            rowKey="id"
            size="small"
            pagination={tenRowTablePagination}
            dataSource={filteredMarkupChannelRows}
            columns={[
              { title: '代理', dataIndex: 'agentName', width: 110 },
              { title: '小表', width: 180, render: (_, row) => getMarkupRowSmallTableName(row) },
              { title: '真实渠道/线路', dataIndex: 'realChannelName', width: 160, render: (value: string | undefined, row) => value || row.channelName },
              { title: '目的地', dataIndex: 'destinationCountry', width: 100 },
              { title: '重量段', render: (_, row) => `${row.minWeightKg}-${row.maxWeightKg}kg`, width: 130 },
              { title: '时效', dataIndex: 'transitLabel', width: 110, render: (value?: string) => value || '待确认' },
              {
                title: '当前加价',
                width: 120,
                render: (_, row) => {
                  const rule = findLineMarkupRule(row);
                  return rule ? `+${formatCurrency(rule.markupPerKg)}/kg` : <Text type="secondary">基准 +{formatCurrency(selectedMarkupRule?.markupPerKg ?? 0)}/kg</Text>;
                }
              },
              {
                title: '操作',
                width: 120,
                render: (_, row) => {
                  const rule = findLineMarkupRule(row);
                  return (
                    <Button size="small" onClick={() => (rule ? openEditLineMarkupRule(rule) : openCreateLineMarkupRule(row))}>
                      {rule ? '修改加价' : '自定义加价'}
                    </Button>
                  );
                }
              }
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={editingMarkupRule ? '修改代理加价' : '新增代理加价'}
        open={markupModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitMarkupRule()}
        onCancel={() => setMarkupModalOpen(false)}
      >
        <Form form={markupForm} name="markupRuleForm" layout="vertical">
          <Form.Item name="agentName" label="代理" rules={[{ required: true, whitespace: true, message: '请输入代理' }]}>
            <Input placeholder="例如 a代理" />
          </Form.Item>
          <Form.Item name="channelName" label="渠道（可选）">
            <Input placeholder="例如 海运洛杉矶专线；为空表示该代理全部渠道" />
          </Form.Item>
          <Form.Item name="realChannelName" label="线路自定义（可选）">
            <Input placeholder="例如 DHK03；填写后优先于渠道统一加价" />
          </Form.Item>
          <Form.Item name="destinationCountry" label="国家（可选）">
            <Input placeholder="例如 美国；为空表示全部国家" />
          </Form.Item>
          <Form.Item name="markupPerKg" label="业务员加价 / kg" rules={[{ required: true, message: '请输入加价金额' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <select className="native-select" aria-label="加价规则状态">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
    </AppPage>
  );
}
