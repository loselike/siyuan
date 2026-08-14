import { AutoComplete, Button, Col, Drawer, Flex, Input, InputNumber, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import type { WarehouseManualReceiptCartonSpecInput } from '@siyuan/shared';
import { calculateCartonSpecTotals, type WarehousePackageDraft } from './warehousePageModel';

const { Text } = Typography;

interface WarehouseManualReceiptDrawerProps {
  open: boolean;
  draft: WarehousePackageDraft;
  customerOptions: Array<{ value: string; label: string }>;
  customersLoading: boolean;
  selectedCustomerName?: string;
  onClose: () => void;
  onConfirm: () => void;
  onDraftChange: (patch: Partial<WarehousePackageDraft>) => void;
  onCustomerCodeChange: (value: string) => void;
  onTrackingNoChange: (value: string) => void;
  onCartonSpecChange: (index: number, patch: Partial<WarehouseManualReceiptCartonSpecInput>) => void;
  onAddCartonSpec: () => void;
  onRemoveCartonSpec: (index: number) => void;
}

export function WarehouseManualReceiptDrawer({
  open,
  draft,
  customerOptions,
  customersLoading,
  selectedCustomerName,
  onClose,
  onConfirm,
  onDraftChange,
  onCustomerCodeChange,
  onTrackingNoChange,
  onCartonSpecChange,
  onAddCartonSpec,
  onRemoveCartonSpec
}: WarehouseManualReceiptDrawerProps) {
  const metrics = calculateCartonSpecTotals(draft.cartonSpecs);

  return (
    <Drawer
      title="手动添加收货"
      width={760}
      open={open}
      onClose={onClose}
      destroyOnHidden={false}
      footer={(
        <Flex justify="space-between" align="center" gap={12} className="warehouse-today-drawer-footer">
          <Space wrap>
            <Tag color="cyan">箱规 {draft.cartonSpecs.length} 条</Tag>
            <Tag color="blue">总件数 {metrics.totalPackages} 件</Tag>
            <Tag color="purple">总体积 {metrics.totalCbm.toFixed(3)} CBM</Tag>
            <Tag color="geekblue">总实重 {metrics.totalActualWeightKg.toFixed(2)} KG</Tag>
          </Space>
          <Button type="primary" onClick={onConfirm}>确认添加收货</Button>
        </Flex>
      )}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Text strong>基础信息</Text>
          <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
            <Col xs={24} md={12}>
              <Text strong>客户编号</Text>
              <AutoComplete
                aria-label="手动添加客户编号"
                className="warehouse-manual-receipt-customer-select"
                style={{ width: '100%' }}
                value={draft.customerCode}
                options={customerOptions}
                placeholder={customersLoading ? '正在加载客户资料' : '输入客户编号或名称搜索'}
                filterOption={(inputValue, option) => String(option?.label ?? '').toLowerCase().includes(inputValue.toLowerCase())}
                onChange={onCustomerCodeChange}
                onSelect={onCustomerCodeChange}
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>客户名称 / 匹配状态</Text>
              <Input
                aria-label="手动添加客户名称"
                value={selectedCustomerName ?? (draft.customerCode.trim() ? '待客户建档匹配' : '')}
                placeholder="已建档客户自动带出；未建档编号可先收货"
                readOnly
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>快递单号</Text>
              <Input aria-label="手动添加快递单号" value={draft.domesticTrackingNo} onChange={(event) => onTrackingNoChange(event.target.value)} />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>客户编号-快递单号</Text>
              <Input aria-label="手动添加客户编号-快递单号" value={draft.combinedOrderNo} onChange={(event) => onDraftChange({ combinedOrderNo: event.target.value })} />
            </Col>
          </Row>
        </div>

        <div>
          <Flex justify="space-between" align="center" className="warehouse-carton-spec-header">
            <Text strong>箱规</Text>
            <Text type="secondary">一条箱规保存为一行在仓记录</Text>
          </Flex>
          <div className="warehouse-carton-specs" role="group" aria-label="手动添加箱规">
            {draft.cartonSpecs.map((spec, index) => (
              <div className="warehouse-carton-spec-row" key={`carton-${index}`}>
                <div className="warehouse-carton-spec-index">#{index + 1}</div>
                <div className="warehouse-carton-spec-field">
                  <Text strong>重量 KG</Text>
                  <InputNumber aria-label={`第 ${index + 1} 条箱规重量 KG`} min={0} precision={2} value={spec.weightKg} onChange={(value) => onCartonSpecChange(index, { weightKg: Number(value) || 0 })} />
                </div>
                <div className="warehouse-carton-dimensions">
                  <div className="warehouse-carton-spec-field">
                    <Text strong>长 cm</Text>
                    <InputNumber aria-label={`第 ${index + 1} 条箱规长 cm`} min={0} precision={2} value={spec.lengthCm} onChange={(value) => onCartonSpecChange(index, { lengthCm: Number(value) || 0 })} />
                  </div>
                  <div className="warehouse-carton-spec-field">
                    <Text strong>宽 cm</Text>
                    <InputNumber aria-label={`第 ${index + 1} 条箱规宽 cm`} min={0} precision={2} value={spec.widthCm} onChange={(value) => onCartonSpecChange(index, { widthCm: Number(value) || 0 })} />
                  </div>
                  <div className="warehouse-carton-spec-field">
                    <Text strong>高 cm</Text>
                    <InputNumber aria-label={`第 ${index + 1} 条箱规高 cm`} min={0} precision={2} value={spec.heightCm} onChange={(value) => onCartonSpecChange(index, { heightCm: Number(value) || 0 })} />
                  </div>
                </div>
                <div className="warehouse-carton-spec-field warehouse-carton-count">
                  <Text strong>件数</Text>
                  <InputNumber aria-label={`第 ${index + 1} 条箱规件数`} min={1} precision={0} value={spec.packageCount} onChange={(value) => onCartonSpecChange(index, { packageCount: Math.max(1, Math.floor(Number(value) || 1)) })} />
                </div>
                <div className="warehouse-carton-actions">
                  <Tooltip title="新增箱规">
                    <Button aria-label={`在第 ${index + 1} 条后新增箱规`} icon={<Plus size={16} />} onClick={onAddCartonSpec} />
                  </Tooltip>
                  <Tooltip title={draft.cartonSpecs.length <= 1 ? '至少保留一条箱规' : '删除箱规'}>
                    <Button aria-label={`删除第 ${index + 1} 条箱规`} icon={<Trash2 size={16} />} disabled={draft.cartonSpecs.length <= 1} onClick={() => onRemoveCartonSpec(index)} />
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Text strong>备注异常</Text>
          <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
            <Col xs={24}>
              <Text strong>扫描时间</Text>
              <Input aria-label="手动添加扫描时间" type="datetime-local" value={draft.scanTime} onChange={(event) => onDraftChange({ scanTime: event.target.value })} />
            </Col>
            <Col xs={24}>
              <Text strong>备注</Text>
              <Input aria-label="手动添加备注" value={draft.remark} onChange={(event) => onDraftChange({ remark: event.target.value })} />
            </Col>
            <Col xs={24}>
              <Text strong>异常</Text>
              <Input aria-label="手动添加异常" value={draft.manualException} onChange={(event) => onDraftChange({ manualException: event.target.value })} />
            </Col>
          </Row>
        </div>
      </Space>
    </Drawer>
  );
}
