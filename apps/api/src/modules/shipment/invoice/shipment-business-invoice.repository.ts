import type { PrismaRepository } from '../../prisma.repository.js';

export const SHIPMENT_BUSINESS_INVOICE_REPOSITORY = Symbol('SHIPMENT_BUSINESS_INVOICE_REPOSITORY');

export type ShipmentBusinessInvoiceRepository = Pick<
  PrismaRepository,
  | 'uploadShipmentBusinessInvoice'
  | 'downloadShipmentInvoiceTemplate'
  | 'downloadShipmentBusinessInvoice'
>;
