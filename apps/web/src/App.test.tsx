import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => cleanup());

describe('AI logistics workspace', () => {
  it('shows the operations dashboard with status counts and AI queue', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'AI 物流运营工作台' })).toBeInTheDocument();
    expect(screen.getByText('快递 6')).toBeInTheDocument();
    expect(screen.getByText('待上网 2')).toBeInTheDocument();
    expect(screen.getByText('AI 优先处理队列')).toBeInTheDocument();
    expect(screen.getByText('导入运单')).toBeInTheDocument();
    expect(screen.getByText('智能录单')).toBeInTheDocument();
  });

  it('filters shipments when switching business type', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '专线 1' }));

    expect(screen.getByText('SYZX0606UK001')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ05291344165')).not.toBeInTheDocument();
  });
});
