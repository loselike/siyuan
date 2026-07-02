import { Card } from 'antd';
import { AppEmptyState } from './ui';

export function PlaceholderPanel({ title }: { title: string }) {
  return (
    <Card title={title}>
      <AppEmptyState title="暂无可操作内容" description="当前入口已保留。" />
    </Card>
  );
}
