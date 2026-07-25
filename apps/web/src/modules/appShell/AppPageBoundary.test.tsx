import { lazy } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppPageBoundary } from './AppPageBoundary';

describe('AppPageBoundary', () => {
  it('keeps page render failures contained and reports the current route', async () => {
    const report = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.replaceState(null, '', '/app/warehouse/today');
    const BrokenPage = () => {
      throw new Error('render failed');
    };

    render(
      <AppPageBoundary resetKey="receive:today" menuKey="receive" sectionKey="today" onReport={report}>
        <BrokenPage />
      </AppPageBoundary>
    );

    expect(await screen.findByText('页面加载失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试加载' })).toBeInTheDocument();
    await waitFor(() => expect(report).toHaveBeenCalledTimes(1));
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      errorId: expect.stringMatching(/^render-/),
      route: '/app/warehouse/today',
      menuKey: 'receive',
      sectionKey: 'today',
      message: 'render failed'
    }));
    consoleError.mockRestore();
  });

  it('keeps the existing loading fallback for lazy modules', async () => {
    const PendingPage = lazy(() => new Promise<never>(() => undefined));

    render(
      <AppPageBoundary resetKey="finance" menuKey="finance" onReport={vi.fn()}>
        <PendingPage />
      </AppPageBoundary>
    );

    expect(await screen.findByText('模块加载中')).toBeInTheDocument();
    expect(screen.getByText('正在准备当前页面，请稍候。')).toBeInTheDocument();
  });
});
