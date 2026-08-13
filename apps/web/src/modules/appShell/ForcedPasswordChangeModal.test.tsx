import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForcedPasswordChangeModal } from './ForcedPasswordChangeModal';

function Harness({ onSavePassword, error = null }: { onSavePassword: () => void; error?: string | null }) {
  const [form] = Form.useForm();
  return (
    <ForcedPasswordChangeModal
      open
      loading={false}
      error={error}
      form={form}
      passwordStrengthRule={() => ({
        async validator(_rule, value) {
          if (!value || value.length >= 8) return;
          throw new Error('密码长度需大于或等于 8 位');
        }
      })}
      onSavePassword={onSavePassword}
    />
  );
}

describe('ForcedPasswordChangeModal', () => {
  afterEach(cleanup);

  it('preserves the blocking password form, error state, validation, and submit action', async () => {
    const user = userEvent.setup();
    const onSavePassword = vi.fn();
    render(<Harness onSavePassword={onSavePassword} error="初始密码不正确" />);

    const dialog = screen.getByRole('dialog', { name: '首次登录需要修改密码' });
    expect(within(dialog).getByText('请先修改初始密码')).toBeInTheDocument();
    expect(within(dialog).getByText('初始密码不正确')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /关\s*闭/ })).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('当前密码'), 'firstlogin@123');
    await user.type(within(dialog).getByLabelText('新密码'), '1qaz@WSX#');
    await user.type(within(dialog).getByLabelText('确认新密码'), '1qaz@WSX#');
    await user.click(within(dialog).getByRole('button', { name: '保存新密码并进入系统' }));

    expect(onSavePassword).toHaveBeenCalledOnce();
  });
});
