import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type {
  TrackingImportCommandInput,
  TrackingImportCommandRepository
} from './tracking-import-command.repository.js';
import { TrackingImportCommandService } from './tracking-import-command.service.js';

const admin = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;
const customer = { id: 'u-customer', username: 'customer', role: 'CUSTOMER' } as Principal;
const input: TrackingImportCommandInput = {
  fileName: 'tracking.xlsx',
  updates: [{ shipmentId: 's-1', customerOrderNo: 'ORDER-1', trackingDate: '2026-08-12T00:00:00.000Z', latestTracking: '已揽收' }]
};

function setup() {
  const repository = {
    hasPermission: vi.fn(),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    importTrackingEvents: vi.fn()
  } as unknown as TrackingImportCommandRepository;
  return { repository, service: new TrackingImportCommandService(repository) };
}

describe('TrackingImportCommandService', () => {
  it('preserves the customer-specific defense before permission and repository calls', async () => {
    const { repository, service } = setup();
    await expect(service.import(customer, input)).rejects.toThrow('客户不能批量导入轨迹');
    expect(repository.hasPermission).not.toHaveBeenCalled();
    expect(repository.recordPermissionDenied).not.toHaveBeenCalled();
    expect(repository.importTrackingEvents).not.toHaveBeenCalled();
  });

  it('checks import-confirm first and records the original denial evidence', async () => {
    const { repository, service } = setup();
    vi.mocked(repository.hasPermission).mockResolvedValue(false);

    await expect(service.import(admin, input)).rejects.toThrow('没有访问权限');
    expect(repository.hasPermission).toHaveBeenCalledTimes(1);
    expect(repository.hasPermission).toHaveBeenCalledWith('ADMIN', 'tracking:external:import-confirm');
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(admin, {
      permissions: ['tracking:external:import-confirm'],
      method: 'SERVER',
      path: 'warehouse granular action'
    });
    expect(repository.importTrackingEvents).not.toHaveBeenCalled();
  });

  it('checks overwrite second and preserves denial logging failures as non-blocking', async () => {
    const { repository, service } = setup();
    vi.mocked(repository.hasPermission).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(repository.recordPermissionDenied).mockRejectedValueOnce(new Error('audit unavailable'));

    await expect(service.import(admin, input)).rejects.toThrow('没有访问权限');
    expect(repository.hasPermission).toHaveBeenNthCalledWith(1, 'ADMIN', 'tracking:external:import-confirm');
    expect(repository.hasPermission).toHaveBeenNthCalledWith(2, 'ADMIN', 'tracking:external:overwrite');
    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(admin, {
      permissions: ['tracking:external:overwrite'],
      method: 'SERVER',
      path: 'warehouse granular action'
    });
    expect(repository.importTrackingEvents).not.toHaveBeenCalled();
  });

  it('forwards the exact request and repository result after both permissions pass', async () => {
    const { repository, service } = setup();
    const result = { updated: [], importedCount: 0 };
    vi.mocked(repository.hasPermission).mockResolvedValue(true);
    vi.mocked(repository.importTrackingEvents).mockResolvedValue(result as never);

    await expect(service.import(admin, input)).resolves.toBe(result);
    expect(repository.hasPermission).toHaveBeenNthCalledWith(1, 'ADMIN', 'tracking:external:import-confirm');
    expect(repository.hasPermission).toHaveBeenNthCalledWith(2, 'ADMIN', 'tracking:external:overwrite');
    expect(repository.importTrackingEvents).toHaveBeenCalledWith(admin, input);
  });
});
