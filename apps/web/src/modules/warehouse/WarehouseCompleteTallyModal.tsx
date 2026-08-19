import { Alert, Button, Checkbox, Col, Flex, Input, InputNumber, Modal, Row, Segmented, Space, Typography } from 'antd';
import type { TallyTaskCompleteDraft } from './warehousePageModel';
import { renderFilterField } from '../shared/ui';
import { areAllTallyMergeSourcesSelected, toggleAllTallyMergeSources } from './tallyMergeSelection';

const { Text } = Typography;

export type WarehouseTallyProcessMode = 'KEEP' | 'MERGE' | 'SPLIT';

export interface WarehouseTallySourceItem {
  id: string;
  label: string;
}

interface WarehouseCompleteTallyModalProps {
  open: boolean;
  taskNo?: string;
  sourceItems: WarehouseTallySourceItem[];
  sourcePackagesLoading?: boolean;
  error: string | null;
  submitting: boolean;
  mode: WarehouseTallyProcessMode;
  selectedSourceIds: string[];
  splitPieces: string;
  draft: TallyTaskCompleteDraft;
  onCancel: () => void;
  onConfirm: () => void;
  onModeChange: (mode: WarehouseTallyProcessMode) => void;
  onSourceIdsChange: (sourceIds: string[]) => void;
  onSplitPiecesChange: (value: string) => void;
  onDraftChange: (patch: Partial<TallyTaskCompleteDraft>) => void;
}

export function WarehouseCompleteTallyModal({
  open,
  taskNo,
  sourceItems,
  sourcePackagesLoading = false,
  error,
  submitting,
  mode,
  selectedSourceIds,
  splitPieces,
  draft,
  onCancel,
  onConfirm,
  onModeChange,
  onSourceIdsChange,
  onSplitPiecesChange,
  onDraftChange
}: WarehouseCompleteTallyModalProps) {
  const sourceIds = sourceItems.map((item) => item.id);
  const allMergeSourcesSelected = areAllTallyMergeSourcesSelected(sourceIds, selectedSourceIds);

  return (
    <Modal
      title="处理理货"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="确认完成"
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{ disabled: sourcePackagesLoading }}
      cancelButtonProps={{ disabled: submitting }}
      closable={!submitting}
      maskClosable={!submitting}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={open ? `任务 ${taskNo ?? ''}：只处理已勾选的原始包裹；未勾选包裹继续保留在仓。理货结果先生成待复测标签，重新过机或人工录入后才进入在仓数据` : '请选择理货任务'}
        />
        {sourcePackagesLoading ? <Alert type="info" showIcon message="正在加载本理货任务的原始包裹，请稍候" /> : null}
        {error ? <Alert type="error" showIcon message="理货未完成" description={error} /> : null}
        <Segmented
          block
          value={mode}
          options={[
            { label: '保留原包裹', value: 'KEEP' },
            { label: '合并选中包裹', value: 'MERGE' },
            { label: '拆分单个包裹', value: 'SPLIT' }
          ]}
          onChange={(value) => onModeChange(value as WarehouseTallyProcessMode)}
        />
        {open ? (
          <div>
            <Flex align="center" justify="space-between" gap={12}>
              <Text strong>{mode === 'MERGE' ? '选择要合并的原始包裹' : mode === 'SPLIT' ? '选择要拆分的原始包裹' : '原始包裹'}</Text>
              {mode === 'MERGE' ? (
                <Button
                  size="small"
                  aria-label={allMergeSourcesSelected ? '取消全选原始包裹' : '全选原始包裹'}
                  onClick={() => onSourceIdsChange(toggleAllTallyMergeSources(sourceIds, selectedSourceIds))}
                >
                  {allMergeSourcesSelected ? '取消全选' : '全选'}
                </Button>
              ) : null}
            </Flex>
            <Checkbox.Group
              value={mode === 'KEEP' ? sourceIds : selectedSourceIds}
              onChange={(values) => onSourceIdsChange(
                (mode === 'SPLIT' ? values.slice(-1) : values).map(String)
              )}
            >
              <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
                {sourceItems.map((item) => (
                  <Checkbox key={item.id} value={item.id} disabled={mode === 'KEEP'}>{item.label}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        ) : null}
        {mode === 'SPLIT' ? (
          <div>
            <Text strong>拆分件数组合</Text>
            <Input
              aria-label="任务内拆分件数组合"
              placeholder="例如 50,25；合计必须等于原包裹件数"
              value={splitPieces}
              onChange={(event) => onSplitPiecesChange(event.target.value)}
            />
          </div>
        ) : null}
        {mode === 'MERGE' ? (
          <Row gutter={[10, 10]}>
            <Col span={12}>
              {renderFilterField('理货后件数', (
                <InputNumber min={1} value={draft.packageCount} onChange={(value) => onDraftChange({ packageCount: Number(value ?? 1) })} />
              ))}
            </Col>
          </Row>
        ) : null}
        <div>
          <Text strong>备注</Text>
          <Input.TextArea rows={3} value={draft.remark} onChange={(event) => onDraftChange({ remark: event.target.value })} />
        </div>
      </Space>
    </Modal>
  );
}
