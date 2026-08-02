import { resolveStaffSectionKey } from '../appShell/config';

const customerServiceSectionKeys = [
  'service-dashboard',
  'pending-routing',
  'dataConfirm',
  'transferNo',
  'waitingDeparture',
  'departed',
  'arrivedPort',
  'delivering',
  'signed',
  'problems',
  'afterSale'
];

export function resolveCustomerServiceInitialSection(sectionSegment?: string) {
  return resolveStaffSectionKey('customerService', sectionSegment, customerServiceSectionKeys) ?? 'service-dashboard';
}
