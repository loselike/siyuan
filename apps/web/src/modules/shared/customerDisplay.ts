export function getCustomerDisplayName(customer: {
  customerCode?: string;
  customerName?: string;
}) {
  const customerName = customer.customerName?.trim();
  if (!customerName) return '-';

  const customerCode = customer.customerCode?.trim();
  if (!customerCode) return customerName;

  const compositePrefix = `${customerCode}-`;
  if (!customerName.startsWith(compositePrefix)) return customerName;

  return customerName.slice(compositePrefix.length).trim() || customerName;
}
