import { Alert, Input, Modal, Select, Space, Typography } from 'antd';
import { warehouseTallyChannels } from '@siyuan/shared';

const { Text } = Typography;

interface WarehouseCreateTallyModalProps {
  open: boolean;
  selectedCount: number;
  channel: string;
  requirement: string;
  onChannelChange: (value: string) => void;
  onRequirementChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function WarehouseCreateTallyModal({
  open,
  selectedCount,
  channel,
  requirement,
  onChannelChange,
  onRequirementChange,
  onCancel,
  onConfirm
}: WarehouseCreateTallyModalProps) {
  return (
    <Modal
      title="发起理货"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="确认发起"
      cancelText="取消"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert type="info" showIcon message={`已选择 ${selectedCount} 个在仓包裹，提交后进入未完成理货。`} />
        <div>
          <Text strong>理货渠道</Text>
          <Select
            aria-label="理货渠道"
            placeholder="请选择理货渠道"
            value={channel || undefined}
            onChange={onChannelChange}
            options={warehouseTallyChannels.map((value) => ({ value, label: value }))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text strong>理货需求</Text>
          <Input.TextArea
            aria-label="理货需求"
            rows={4}
            placeholder="例如拆分 50/25，保留原箱唛头"
            value={requirement}
            onChange={(event) => onRequirementChange(event.target.value)}
          />
        </div>
      </Space>
    </Modal>
  );
}
