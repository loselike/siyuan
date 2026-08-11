import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type {
  TrackingManualEventCommandRepository,
  TrackingManualEventInput
} from './tracking-manual-event-command.repository.js';
import { TrackingManualEventCommandService } from './tracking-manual-event-command.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;
const input: TrackingManualEventInput = {
  status: '已揽收',
  happenedAt: '2026-08-12T01:02:03.000Z',
  visibleToCustomer: false
};

function setup() {
  const repository = {
    addTrackingEvent: vi.fn()
  } as unknown as TrackingManualEventCommandRepository;
  return { repository, service: new TrackingManualEventCommandService(repository) };
}

describe('TrackingManualEventCommandService', () => {
  it('forwards the shipment command unchanged and returns the same repository result', async () => {
    const { repository, service } = setup();
    const result = { id: 's-1', latestTracking: input.status };
    vi.mocked(repository.addTrackingEvent).mockResolvedValue(result as never);

    await expect(service.addShipmentEvent(principal, 's-1', input)).resolves.toBe(result);
    expect(repository.addTrackingEvent).toHaveBeenCalledWith(principal, 's-1', input);
  });

  it('forwards the operation command unchanged and returns the same repository result', async () => {
    const { repository, service } = setup();
    const result = { id: 's-2', latestTracking: input.status };
    vi.mocked(repository.addTrackingEvent).mockResolvedValue(result as never);

    await expect(service.addOperationShipmentEvent(principal, 's-2', input)).resolves.toBe(result);
    expect(repository.addTrackingEvent).toHaveBeenCalledWith(principal, 's-2', input);
  });

  it('preserves repository errors without translating them', async () => {
    const { repository, service } = setup();
    const error = new Error('运单不存在');
    vi.mocked(repository.addTrackingEvent).mockRejectedValue(error);

    await expect(service.addShipmentEvent(principal, 'missing', input)).rejects.toBe(error);
  });
});
