import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderAndLogin } from '../testSupport/appTestHarness';

const legacyWorkspacePaths = [
  '/api/shipments',
  '/api/problem-tickets',
  '/api/finance/receivable-audits',
  '/api/finance/business-cost-audits',
  '/api/finance/payable-audits',
  '/api/finance/customer-statements',
  '/api/finance/customer-accounts',
  '/api/finance/account-ledger',
  '/api/carrier-tasks',
  '/api/master-data'
];

function requestedPaths() {
  return vi.mocked(fetch).mock.calls.map(([input]) => new URL(String(input), window.location.origin).pathname);
}

describe('workspace refresh characterization', () => {
  it('keeps the current admin login workspace request set', async () => {
    window.history.replaceState(null, '', '/app/workspace/shipment-pool');
    await renderAndLogin('admin', 'admin123');

    await waitFor(() => {
      const paths = requestedPaths();
      legacyWorkspacePaths.forEach((path) => expect(paths).toContain(path));
    });
  });

  it('keeps data confirmation login isolated from the legacy global refresh', async () => {
    const existingFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input).includes('/api/customer-service/data-confirm-shipments')) {
        return jsonResponse({ rows: [], pagination: { page: 1, pageSize: 10, totalItems: 0 } });
      }
      if (!existingFetch) throw new Error('missing test fetch implementation');
      return existingFetch(input, init);
    });
    window.history.replaceState(null, '', '/app/customer-service/data-confirm');
    await renderAndLogin('admin', 'admin123');

    await waitFor(() => expect(requestedPaths()).toContain('/api/customer-service/data-confirm-shipments'));
    const paths = requestedPaths();
    legacyWorkspacePaths.forEach((path) => expect(paths).not.toContain(path));
  });
});
