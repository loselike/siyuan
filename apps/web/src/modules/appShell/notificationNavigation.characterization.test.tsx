import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('notification navigation characterization', () => {
  it('opens the shipment target from the initial deep link and consumes only its notification parameters', async () => {
    window.history.replaceState(
      null,
      '',
      '/app/business/order-management?notificationEntityType=SHIPMENT&notificationEntityId=s-1&source=notification-test'
    );

    await renderAndLogin('admin', 'admin123');

    expect(await screen.findByRole('dialog', { name: '运单详情 · SYGJ06061230001' })).toBeInTheDocument();
    await waitFor(() => {
      const currentUrl = new URL(window.location.href);
      expect(currentUrl.pathname).toBe('/app/business/order-management');
      expect(currentUrl.searchParams.get('notificationEntityType')).toBeNull();
      expect(currentUrl.searchParams.get('notificationEntityId')).toBeNull();
      expect(currentUrl.searchParams.get('source')).toBe('notification-test');
    });
  });
});
