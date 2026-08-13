import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Tag } from 'antd';
import type { FormInstance } from 'antd';
import type { StaffGender } from '@siyuan/shared';
import type { Principal, ProfileUpdateInput } from '../../apiClient';
import { getRoleDisplayName } from './utils';

type PasswordChangeFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function PersonalCenterModal({
  open,
  user,
  profileForm,
  passwordForm,
  passwordStrengthRule,
  genderOptions,
  onClose,
  onSaveProfile,
  onSavePassword
}: {
  open: boolean;
  user: Principal;
  profileForm: FormInstance<ProfileUpdateInput>;
  passwordForm: FormInstance<PasswordChangeFormValues>;
  passwordStrengthRule: () => { validator: (_rule: unknown, value?: string) => Promise<void> };
  genderOptions: Array<{ label: string; value: StaffGender }>;
  onClose: () => void;
  onSaveProfile: () => void | Promise<void>;
  onSavePassword: () => void | Promise<void>;
}) {
  return (
    <Modal
      title="个人中心"
      open={open}
      width={980}
      destroyOnHidden
      footer={<Button onClick={onClose}>关闭</Button>}
      onCancel={onClose}
    >
      <Space direction="vertical" size={16} className="personal-center-shell">
        <Card size="small" title="账号资料" className="personal-center-profile">
          <div className="personal-center-readonly-grid" aria-label="只读账号信息">
            <div>
              <span>员工账号</span>
              <strong>{user.username}</strong>
            </div>
            <div>
              <span>当前角色</span>
              <Tag color={user.role === 'ADMIN' ? 'red' : 'blue'}>{getRoleDisplayName(user.role)}</Tag>
            </div>
          </div>
          <Form
            form={profileForm}
            layout="vertical"
            className="personal-center-profile-form"
            initialValues={{
              name: user.name,
              phone: user.phone,
              gender: (user.gender ?? 'UNKNOWN') as StaffGender,
              nickname: user.nickname
            }}
          >
            <Form.Item name="name" label="姓名" rules={[{ max: 40, message: '姓名最多 40 个字符' }]}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item name="phone" label="手机号" rules={[{ max: 30, message: '手机号最多 30 个字符' }]}>
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item name="gender" label="性别">
              <Select options={genderOptions} />
            </Form.Item>
            <Form.Item name="nickname" label="昵称" rules={[{ max: 40, message: '昵称最多 40 个字符' }]}>
              <Input placeholder="请输入昵称" />
            </Form.Item>
            <Button type="primary" onClick={() => void onSaveProfile()}>
              保存个人资料
            </Button>
          </Form>
        </Card>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card size="small" title="修改密码" className="personal-center-card">
              <Form form={passwordForm} layout="vertical">
                <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[{ required: true, message: '请输入新密码' }, passwordStrengthRule()]}
                  extra="密码长度需大于或等于 8 位，且至少包含大写字母、小写字母、数字、特殊字符中的 3 类。"
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
                <Button type="primary" block onClick={() => void onSavePassword()}>
                  保存新密码
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </Space>
    </Modal>
  );
}
