import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CustomerSourceSummary } from '@siyuan/shared/customer-source';
import { CustomerSourcesPage } from './CustomerSourcesPage';
import type { CustomerSourceClient } from './customerSourceClient';

afterEach(() => cleanup());

const source: CustomerSourceSummary = {
  id: 'source-1',
  name: '展会',
  normalizedName: '展会',
  remark: '线下展会',
  sortOrder: 10,
  enabled: true,
  customerCount: 2,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z'
};

function createClient(): CustomerSourceClient {
  return {
    customerSources: vi.fn().mockResolvedValue({ items: [source] }),
    createCustomerSource: vi.fn().mockResolvedValue(source),
    updateCustomerSource: vi.fn().mockResolvedValue(source),
    deleteCustomerSource: vi.fn().mockResolvedValue({ id: source.id, deleted: true })
  };
}

describe('CustomerSourcesPage', () => {
  it('loads the module through its narrow client and keeps read-only actions hidden', async () => {
    const client = createClient();
    render(
      <CustomerSourcesPage
        apiClient={client}
        canWrite={false}
        canDelete={false}
        onNotice={vi.fn()}
      />
    );

    expect(await screen.findByText('展会')).toBeInTheDocument();
    expect(screen.getByText('2 个')).toBeInTheDocument();
    expect(screen.getByText('只读')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新增客户来源' })).not.toBeInTheDocument();
    expect(client.customerSources).toHaveBeenCalledWith({ keyword: undefined });
  });

  it('preserves create and reload behavior without the global app test harness', async () => {
    const user = userEvent.setup();
    const client = createClient();
    const onNotice = vi.fn();
    render(
      <CustomerSourcesPage
        apiClient={client}
        canWrite
        canDelete
        onNotice={onNotice}
      />
    );
    await screen.findByText('展会');

    await user.click(screen.getByRole('button', { name: '新增客户来源' }));
    const dialog = await screen.findByRole('dialog', { name: '新增客户来源' });
    await user.type(within(dialog).getByLabelText('来源名称'), '转介绍');
    await user.type(within(dialog).getByLabelText('备注'), '老客户推荐');
    await user.click(within(dialog).getByRole('button', { name: '确认新增' }));

    await waitFor(() => expect(client.createCustomerSource).toHaveBeenCalledWith({
      name: '转介绍',
      remark: '老客户推荐',
      enabled: true
    }));
    await waitFor(() => expect(client.customerSources).toHaveBeenCalledTimes(2));
    expect(onNotice).toHaveBeenCalledWith('客户来源已新增');
  });
});
