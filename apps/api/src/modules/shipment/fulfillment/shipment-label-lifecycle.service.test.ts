import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { ShipmentLabelFileStorage } from './shipment-label-file.storage.js';
import type {
  ShipmentLabelLifecycleAuthorizer,
  ShipmentLabelLifecycleRepository
} from './shipment-label-lifecycle.repository.js';
import { ShipmentLabelLifecycleService } from './shipment-label-lifecycle.service.js';

const principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;
const customer = { id: 'u-customer', username: 'customer', role: 'CUSTOMER' } as Principal;

function repositoryStub(
  overrides: Partial<ShipmentLabelLifecycleRepository> = {}
): ShipmentLabelLifecycleRepository {
  return {
    getShipmentLabels: vi.fn(),
    createShipmentLabel: vi.fn(),
    uploadShipmentLabel: vi.fn(),
    downloadShipmentLabel: vi.fn(),
    voidShipmentLabel: vi.fn(),
    ...overrides
  };
}

function authorizerStub(
  overrides: Partial<ShipmentLabelLifecycleAuthorizer> = {}
): ShipmentLabelLifecycleAuthorizer {
  return {
    hasPermission: vi.fn().mockResolvedValue(true),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function storageStub() {
  return {
    store: vi.fn().mockResolvedValue({
      fileName: 'phase21-label.png',
      mimeType: 'image/png',
      sizeBytes: 9,
      url: '/api/uploads/labels/phase21-label.png'
    })
  } as unknown as ShipmentLabelFileStorage;
}

describe('ShipmentLabelLifecycleService', () => {
  it('preserves arguments and results for list, create, upload, download, and void', async () => {
    const listed = [{ id: 'lbl-21' }];
    const created = { label: { id: 'lbl-21' } };
    const uploaded = { label: { id: 'lbl-upload-21' } };
    const downloaded = { buffer: Buffer.from('label'), fileName: 'label.png', mimeType: 'image/png' };
    const voided = { id: 'lbl-21', status: 'VOIDED' };
    const repository = repositoryStub({
      getShipmentLabels: vi.fn().mockResolvedValue(listed),
      createShipmentLabel: vi.fn().mockResolvedValue(created),
      uploadShipmentLabel: vi.fn().mockResolvedValue(uploaded),
      downloadShipmentLabel: vi.fn().mockResolvedValue(downloaded),
      voidShipmentLabel: vi.fn().mockResolvedValue(voided)
    });
    const authorizer = authorizerStub();
    const storage = storageStub();
    const service = new ShipmentLabelLifecycleService(repository, authorizer, storage);
    const file = {
      originalname: 'phase21-label.png',
      mimetype: 'image/png',
      size: 9,
      buffer: Buffer.from('phase21')
    };

    await expect(service.labels(principal, 's-21')).resolves.toBe(listed);
    await expect(service.create(principal, 's-21')).resolves.toBe(created);
    await expect(service.upload(principal, 's-21', file, '1Z-PHASE21')).resolves.toBe(uploaded);
    await expect(service.download(principal, 's-21', 'lbl-21')).resolves.toBe(downloaded);
    await expect(service.void(principal, 's-21', 'lbl-21')).resolves.toBe(voided);

    expect(repository.getShipmentLabels).toHaveBeenCalledWith(principal, 's-21');
    expect(repository.createShipmentLabel).toHaveBeenCalledWith(principal, 's-21');
    expect(storage.store).toHaveBeenCalledWith(file);
    expect(repository.uploadShipmentLabel).toHaveBeenCalledWith(principal, 's-21', {
      fileName: 'phase21-label.png',
      mimeType: 'image/png',
      sizeBytes: 9,
      url: '/api/uploads/labels/phase21-label.png',
      transferNo: '1Z-PHASE21'
    });
    expect(repository.downloadShipmentLabel).toHaveBeenCalledWith(principal, 's-21', 'lbl-21');
    expect(repository.voidShipmentLabel).toHaveBeenCalledWith(principal, 's-21', 'lbl-21');
  });

  it('preserves any-of permission denial audit before repository and storage access', async () => {
    const repository = repositoryStub();
    const authorizer = authorizerStub({ hasPermission: vi.fn().mockResolvedValue(false) });
    const storage = storageStub();
    const service = new ShipmentLabelLifecycleService(repository, authorizer, storage);

    await expect(service.upload(principal, 's-21', undefined)).rejects.toThrow('没有访问权限');
    expect(authorizer.hasPermission).toHaveBeenCalledTimes(3);
    expect(authorizer.recordPermissionDenied).toHaveBeenCalledWith(principal, {
      permissions: [
        'business:order-entry:label-upload',
        'customer-service:transfer:label-upload',
        'customer-service:waiting-departure:label-upload'
      ],
      method: 'SERVER',
      path: 'customer-service granular action'
    });
    expect(storage.store).not.toHaveBeenCalled();
    expect(repository.uploadShipmentLabel).not.toHaveBeenCalled();
  });

  it.each([
    ['labels', '客户不能查看内部面单'],
    ['create', '客户不能申请面单'],
    ['upload', '客户不能上传面单'],
    ['download', '客户不能下载内部面单'],
    ['void', '客户不能作废面单']
  ] as const)('preserves customer rejection for %s', async (operation, message) => {
    const repository = repositoryStub();
    const authorizer = authorizerStub();
    const storage = storageStub();
    const service = new ShipmentLabelLifecycleService(repository, authorizer, storage);
    const action = async () => operation === 'labels'
      ? service.labels(customer, 's-21')
      : operation === 'create'
        ? service.create(customer, 's-21')
        : operation === 'upload'
          ? service.upload(customer, 's-21', undefined)
          : operation === 'download'
            ? service.download(customer, 's-21', 'lbl-21')
            : service.void(customer, 's-21', 'lbl-21');

    await expect(action()).rejects.toThrow(message);
  });

  it('does not translate repository errors', async () => {
    const failure = new Error('existing label rejection');
    const service = new ShipmentLabelLifecycleService(repositoryStub({
      createShipmentLabel: vi.fn().mockRejectedValue(failure)
    }), authorizerStub(), storageStub());

    await expect(service.create(principal, 's-21')).rejects.toBe(failure);
  });
});
