import { Alert, Col, Input, InputNumber, Modal, Row, Space, Tag, Typography } from 'antd';
import { calculateWarehousePackageMetrics, calculateWarehouseVolumetricWeight } from './utils';
import type { WarehouseInboundPackage, WarehousePackageEditDraft } from './warehousePageModel';

const { Text } = Typography;

interface WarehousePackageEditModalProps {
  record: WarehouseInboundPackage | null;
  draft: WarehousePackageEditDraft | null;
  saving: boolean;
  canEdit: boolean;
  canShowSameSpecReplenish: boolean;
  canReplenishSameSpec: boolean;
  sameSpecSupplementCount: number;
  sameSpecRequestAttempted: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onDraftChange: (patch: Partial<WarehousePackageEditDraft>) => void;
  onCustomerCodeChange: (value: string) => void;
  onTrackingNoChange: (value: string) => void;
  onCombinedOrderNoChange: (value: string) => void;
  onSameSpecSupplementCountChange: (value: number) => void;
}

export function WarehousePackageEditModal({
  record,
  draft,
  saving,
  canEdit,
  canShowSameSpecReplenish,
  canReplenishSameSpec,
  sameSpecSupplementCount,
  sameSpecRequestAttempted,
  onCancel,
  onConfirm,
  onDraftChange,
  onCustomerCodeChange,
  onTrackingNoChange,
  onCombinedOrderNoChange,
  onSameSpecSupplementCountChange
}: WarehousePackageEditModalProps) {
  const fieldsDisabled = !canEdit || saving || sameSpecRequestAttempted;
  const metrics = draft ? calculateWarehousePackageMetrics({
    weightKg: draft.weightKg,
    lengthCm: draft.lengthCm,
    widthCm: draft.widthCm,
    heightCm: draft.heightCm,
    packageCount: draft.packageCount,
    divisor: 5000
  }) : null;

  return (
    <Modal
      title="修改入仓包裹"
      open={Boolean(record && draft)}
      onCancel={() => {
        if (!saving) onCancel();
      }}
      onOk={onConfirm}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      closable={!saving}
      keyboard={!saving}
      maskClosable={!saving}
      cancelButtonProps={{ disabled: saving }}
      width={760}
      destroyOnHidden
    >
      {record && draft ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={`正在修改 ${record.combinedOrderNo}`}
            description="可同时修改入仓基础数据和补录同箱规记录；不改变理货、录单、出库或财务流程。"
          />
          {sameSpecRequestAttempted ? (
            <Alert
              type="warning"
              showIcon
              message="上次补录结果待确认"
              description="输入已锁定，请直接点击保存，系统将使用同一请求号安全重试。"
            />
          ) : null}
          <div>
            <Text strong>基础信息</Text>
            <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
              <Col xs={24} md={8}>
                <Text strong>客户编号</Text>
                <Input aria-label="修改客户编号" disabled={fieldsDisabled} value={draft.customerCode} onChange={(event) => onCustomerCodeChange(event.target.value)} />
              </Col>
              <Col xs={24} md={8}>
                <Text strong>快递单号</Text>
                <Input aria-label="修改快递单号" disabled={fieldsDisabled} value={draft.domesticTrackingNo} onChange={(event) => onTrackingNoChange(event.target.value)} />
              </Col>
              <Col xs={24} md={8}>
                <Text strong>客户编号-快递单号</Text>
                <Input aria-label="修改客户编号-快递单号" disabled={fieldsDisabled} value={draft.combinedOrderNo} onChange={(event) => onCombinedOrderNoChange(event.target.value)} />
              </Col>
              {canShowSameSpecReplenish ? (
                <Col xs={12} md={8}>
                  <Text strong>同箱规补录</Text>
                  <InputNumber
                    aria-label="同箱规补录箱数"
                    min={0}
                    max={500}
                    precision={0}
                    value={sameSpecSupplementCount}
                    disabled={!canReplenishSameSpec || saving || sameSpecRequestAttempted}
                    onChange={(value) => onSameSpecSupplementCountChange(Number(value ?? 0))}
                    placeholder="填写新增箱数"
                    style={{ width: '100%' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {canReplenishSameSpec
                      ? `将新增 ${sameSpecSupplementCount || 0} 条、每条 1 件；原记录不变`
                      : '仅支持未理货、未录单的原始过机记录'}
                  </Text>
                </Col>
              ) : null}
              <Col xs={12} md={8}>
                <Text strong>件序号</Text>
                <InputNumber aria-label="修改件序号" disabled={fieldsDisabled} min={1} precision={0} value={draft.packageIndex} onChange={(value) => onDraftChange({ packageIndex: Number(value) || 1 })} style={{ width: '100%' }} />
              </Col>
              <Col xs={24} md={8}>
                <Text strong>扫描时间</Text>
                <Input aria-label="修改扫描时间" disabled={fieldsDisabled} type="datetime-local" value={draft.scanTime} onChange={(event) => onDraftChange({ scanTime: event.target.value })} />
              </Col>
            </Row>
          </div>

          <div>
            <Text strong>件重尺</Text>
            <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
              <Col xs={12} md={6}>
                <Text strong>单件实重</Text>
                <InputNumber aria-label="修改单件实重" disabled={fieldsDisabled} min={0} precision={2} value={draft.weightKg} onChange={(value) => onDraftChange({ weightKg: Number(value) || 0 })} style={{ width: '100%' }} />
              </Col>
              <Col xs={12} md={4}>
                <Text strong>长 cm</Text>
                <InputNumber aria-label="修改长 cm" disabled={fieldsDisabled} min={0} precision={1} value={draft.lengthCm} onChange={(value) => onDraftChange({ lengthCm: Number(value) || 0 })} style={{ width: '100%' }} />
              </Col>
              <Col xs={12} md={4}>
                <Text strong>宽 cm</Text>
                <InputNumber aria-label="修改宽 cm" disabled={fieldsDisabled} min={0} precision={1} value={draft.widthCm} onChange={(value) => onDraftChange({ widthCm: Number(value) || 0 })} style={{ width: '100%' }} />
              </Col>
              <Col xs={12} md={4}>
                <Text strong>高 cm</Text>
                <InputNumber aria-label="修改高 cm" disabled={fieldsDisabled} min={0} precision={1} value={draft.heightCm} onChange={(value) => onDraftChange({ heightCm: Number(value) || 0 })} style={{ width: '100%' }} />
              </Col>
              <Col xs={12} md={6}>
                <Text strong>件数</Text>
                <InputNumber aria-label="修改件数" disabled={fieldsDisabled} min={1} precision={0} value={draft.packageCount} onChange={(value) => onDraftChange({ packageCount: Number(value) || 1 })} style={{ width: '100%' }} />
              </Col>
            </Row>
            {metrics ? (
              <Space wrap style={{ marginTop: 12 }}>
                <Tag color="cyan">体积 {metrics.cbm.toFixed(3)} CBM</Tag>
                <Tag color="blue">5000材积 {calculateWarehouseVolumetricWeight(draft, 5000).toFixed(2)} KG</Tag>
                <Tag color="purple">6000材积 {calculateWarehouseVolumetricWeight(draft, 6000).toFixed(2)} KG</Tag>
              </Space>
            ) : null}
          </div>

          <div>
            <Text strong>备注异常</Text>
            <Row gutter={[12, 12]} className="warehouse-today-drawer-section">
              <Col xs={24} md={12}>
                <Text strong>备注</Text>
                <Input.TextArea aria-label="修改备注" disabled={fieldsDisabled} rows={3} value={draft.remark} onChange={(event) => onDraftChange({ remark: event.target.value })} />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>人工异常</Text>
                <Input.TextArea aria-label="修改人工异常" disabled={fieldsDisabled} rows={3} value={draft.manualException} onChange={(event) => onDraftChange({ manualException: event.target.value })} />
              </Col>
            </Row>
          </div>
        </Space>
      ) : null}
    </Modal>
  );
}
