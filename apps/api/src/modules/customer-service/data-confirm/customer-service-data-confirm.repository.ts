import type { PrismaRepository } from '../../prisma.repository.js';

export const CUSTOMER_SERVICE_DATA_CONFIRM_REPOSITORY = Symbol('CUSTOMER_SERVICE_DATA_CONFIRM_REPOSITORY');

export type CustomerServiceDataConfirmListQuery = Parameters<PrismaRepository['customerServiceDataConfirmShipmentsPage']>[1];
export type CustomerServiceDataReviewInput = Parameters<PrismaRepository['approveShipmentBusinessData']>[2];
export type CustomerServiceDataReverseInput = Parameters<PrismaRepository['reverseShipmentBusinessData']>[2];
export type CustomerServiceDataUpdateInput = Parameters<PrismaRepository['updateShipmentBusinessData']>[2];
export type CustomerServiceFinanceItemUpdateInput = Parameters<PrismaRepository['updateCustomerServiceFinanceItem']>[4];

export type CustomerServiceDataConfirmRepository = Pick<
  PrismaRepository,
  | 'hasPermission'
  | 'recordPermissionDenied'
  | 'approveShipmentBusinessData'
  | 'approveShipmentAgentData'
  | 'updateShipmentBusinessData'
  | 'getCustomerServiceFinanceUpdatePreview'
  | 'updateCustomerServiceFinanceItem'
  | 'updateShipmentAgentData'
  | 'reverseShipmentBusinessData'
  | 'reverseShipmentAgentData'
  | 'approveShipmentAllData'
  | 'reverseShipmentAllData'
  | 'customerServiceDataConfirmShipmentsPage'
>;
