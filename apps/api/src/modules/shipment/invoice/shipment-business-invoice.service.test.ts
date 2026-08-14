import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { ShipmentBusinessInvoiceFileStorage } from './shipment-business-invoice-file.storage.js';
import type { ShipmentBusinessInvoiceRepository } from './shipment-business-invoice.repository.js';
import { ShipmentBusinessInvoiceService } from './shipment-business-invoice.service.js';

const admin = { id: 'u-admin', username: 'admin', role: 'ADMIN' } as Principal;
const customer = { id: 'u-customer', username: 'customer', role: 'CUSTOMER' } as Principal;

function setup() {
  const repository = {
    uploadShipmentBusinessInvoice: vi.fn(),
    downloadShipmentInvoiceTemplate: vi.fn(),
    downloadShipmentBusinessInvoice: vi.fn()
  } as unknown as ShipmentBusinessInvoiceRepository;
  const storage = { store: vi.fn() } as unknown as ShipmentBusinessInvoiceFileStorage;
  return { repository, storage, service: new ShipmentBusinessInvoiceService(repository, storage) };
}

describe('ShipmentBusinessInvoiceService', () => {
  it('stores the upload before forwarding the unchanged metadata to the repository', async () => {
    const { repository, storage, service } = setup();
    const file = { originalname: 'invoice.xlsx', mimetype: 'application/octet-stream', size: 8, buffer: Buffer.from('PK\x03\x04data') };
    const stored = { fileName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, url: '/api/uploads/business-invoices/stored.xlsx' };
    vi.mocked(storage.store).mockResolvedValue(stored);
    vi.mocked(repository.uploadShipmentBusinessInvoice).mockResolvedValue({ ok: true } as never);

    await expect(service.upload(admin, 'shipment-1', file)).resolves.toEqual({ ok: true });
    expect(storage.store).toHaveBeenCalledWith(file);
    expect(repository.uploadShipmentBusinessInvoice).toHaveBeenCalledWith(admin, 'shipment-1', stored);
  });

  it('preserves template id trimming, legacy slots, invalid slot rejection, and explicit-id precedence', async () => {
    const { repository, service } = setup();
    vi.mocked(repository.downloadShipmentInvoiceTemplate).mockResolvedValue({ extension: '.xlsx', buffer: Buffer.from('PK') });

    await service.downloadTemplate(admin, 'shipment-1', '  template-a  ', undefined);
    await service.downloadTemplate(admin, 'shipment-2', undefined, '2');
    await service.downloadTemplate(admin, 'shipment-3', 'template-b', '9');

    expect(repository.downloadShipmentInvoiceTemplate).toHaveBeenNthCalledWith(1, admin, 'shipment-1', 'template-a');
    expect(repository.downloadShipmentInvoiceTemplate).toHaveBeenNthCalledWith(2, admin, 'shipment-2', 'legacy-2');
    expect(repository.downloadShipmentInvoiceTemplate).toHaveBeenNthCalledWith(3, admin, 'shipment-3', 'template-b');
    expect(() => service.downloadTemplate(admin, 'shipment-4', undefined, '4')).toThrow('发票模板序号必须为 1、2 或 3');
  });

  it('forwards business invoice download results and repository exceptions unchanged', async () => {
    const { repository, service } = setup();
    const result = { buffer: Buffer.from('PK'), fileName: 'invoice.xlsx', mimeType: 'application/octet-stream' };
    vi.mocked(repository.downloadShipmentBusinessInvoice).mockResolvedValue(result);
    await expect(service.download(admin, 'shipment-1')).resolves.toBe(result);
    const failure = new Error('repository failure');
    vi.mocked(repository.downloadShipmentBusinessInvoice).mockRejectedValue(failure);
    await expect(service.download(admin, 'shipment-2')).rejects.toBe(failure);
  });

  it('preserves customer-specific defenses and never reaches storage or repository', async () => {
    const { repository, storage, service } = setup();

    await expect(service.upload(customer, 'shipment-1', undefined)).rejects.toThrow('客户不能上传业务发票');
    expect(() => service.downloadTemplate(customer, 'shipment-1', undefined, undefined)).toThrow('客户不能下载代理发票模板');
    expect(() => service.download(customer, 'shipment-1')).toThrow('客户不能下载业务发票');
    expect(storage.store).not.toHaveBeenCalled();
    expect(repository.uploadShipmentBusinessInvoice).not.toHaveBeenCalled();
    expect(repository.downloadShipmentInvoiceTemplate).not.toHaveBeenCalled();
    expect(repository.downloadShipmentBusinessInvoice).not.toHaveBeenCalled();
  });
});
