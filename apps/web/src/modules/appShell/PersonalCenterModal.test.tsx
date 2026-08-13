import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileUpdateInput } from '../../apiClient';
import { PersonalCenterModal } from './PersonalCenterModal';

function Harness({ onSaveProfile, onSavePassword, onClose }: {
  onSaveProfile: () => void;
  onSavePassword: () => void;
  onClose: () => void;
}) {
  const [profileForm] = Form.useForm<ProfileUpdateInput>();
  const [passwordForm] = Form.useForm();
  return (
    <PersonalCenterModal
      open
      user={{
        id: 'admin-1',
        username: 'admin',
        role: 'ADMIN',
        name: '系统管理员',
        phone: '13800138000',
        gender: 'UNKNOWN',
        nickname: '管理员'
      }}
      profileForm={profileForm}
      passwordForm={passwordForm}
      passwordStrengthRule={() => ({
        async validator(_rule, value) {
          if (!value || value.length >= 8) return;
          throw new Error('密码长度需大于或等于 8 位');
        }
      })}
      genderOptions={[{ label: '未设置', value: 'UNKNOWN' }]}
      onClose={onClose}
      onSaveProfile={onSaveProfile}
      onSavePassword={onSavePassword}
    />
  );
}

describe('PersonalCenterModal', () => {
  afterEach(cleanup);

  it('preserves account fields, profile editing, password validation, and actions', async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn();
    const onSavePassword = vi.fn();
    const onClose = vi.fn();
    render(<Harness onSaveProfile={onSaveProfile} onSavePassword={onSavePassword} onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: '个人中心' });
    expect(within(dialog).getByText('admin')).toBeInTheDocument();
    expect(within(dialog).getByText('管理员组')).toBeInTheDocument();
    expect(within(dialog).queryByText('账号事件')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('登录日志')).not.toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('姓名'));
    await user.type(within(dialog).getByLabelText('姓名'), '系统管理员新名');
    await user.click(within(dialog).getByRole('button', { name: '保存个人资料' }));
    expect(onSaveProfile).toHaveBeenCalledOnce();

    await user.type(within(dialog).getByLabelText('当前密码'), 'admin123');
    fireEvent.change(within(dialog).getByLabelText('新密码'), { target: { value: 'Newpass@123' } });
    fireEvent.change(within(dialog).getByLabelText('确认新密码'), { target: { value: 'Newpass@123' } });
    await user.click(within(dialog).getByRole('button', { name: '保存新密码' }));
    expect(onSavePassword).toHaveBeenCalledOnce();

    await user.click(within(dialog).getByRole('button', { name: /关\s*闭/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
