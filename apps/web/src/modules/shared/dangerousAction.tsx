import type { ReactNode } from 'react';
import { Modal } from 'antd';

type ConfirmDangerousActionOptions = {
  title: string;
  content?: ReactNode;
  okText: string;
  danger?: boolean;
  onOk: () => Promise<void> | void;
  confirm?: typeof Modal.confirm;
};

export function confirmDangerousAction(options: ConfirmDangerousActionOptions) {
  (options.confirm ?? Modal.confirm)({
    title: options.title,
    content: options.content,
    okText: options.okText,
    cancelText: '取消',
    okButtonProps: options.danger ? { danger: true } : undefined,
    onOk: options.onOk
  });
}
