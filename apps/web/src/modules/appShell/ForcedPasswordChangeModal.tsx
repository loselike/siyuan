import { Alert, Button, Form, Input, Modal, Space } from 'antd';
import type { FormInstance } from 'antd';

type ForcedPasswordChangeFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ForcedPasswordChangeModal({
  open,
  loading,
  error,
  form,
  passwordStrengthRule,
  onSavePassword
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  form: FormInstance<ForcedPasswordChangeFormValues>;
  passwordStrengthRule: () => { validator: (_rule: unknown, value?: string) => Promise<void> };
  onSavePassword: () => void | Promise<void>;
}) {
  return (
    <Modal
      title="首次登录需要修改密码"
      open={open}
      width={560}
      closable={false}
      maskClosable={false}
      keyboard={false}
      destroyOnHidden
      footer={null}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="请先修改初始密码"
          description="新建账号或被管理员重置密码后，必须修改初始密码才能继续使用系统。新密码长度需大于或等于 8 位，并至少包含 3 种不同字符类型。"
        />
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <Form form={form} layout="vertical" onFinish={() => void onSavePassword()}>
          <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password autoFocus />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }, passwordStrengthRule()]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的新密码不一致'));
                }
              })
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            保存新密码并进入系统
          </Button>
        </Form>
      </Space>
    </Modal>
  );
}
