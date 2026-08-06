import { Alert, Input, Modal, Space, Typography } from 'antd';

const { Text } = Typography;

interface WarehouseCreateTallyModalProps {
  open: boolean;
  selectedCount: number;
  requirement: string;
  onRequirementChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function WarehouseCreateTallyModal({
  open,
  selectedCount,
  requirement,
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
