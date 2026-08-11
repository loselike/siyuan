import type { ApiClient, PermissionKey, Principal } from '../../apiClient';
import { loadProblemTickets, type ProblemTicketClient } from '../problemTickets/problemTicketClient';

export type WorkspaceRefreshClient = Pick<
  ApiClient,
  | 'shipments'
  | 'warehouseDispatchShipments'
  | 'receivableAudits'
  | 'businessCostAudits'
  | 'payableAudits'
  | 'customerStatements'
  | 'customerAccounts'
  | 'accountLedger'
  | 'masterData'
> & ProblemTicketClient & {
  carrierTaskQuery: Pick<ApiClient['carrierTaskQuery'], 'carrierTasks'>;
};

type ShipmentRows = Awaited<ReturnType<ApiClient['shipments']>>;
type ProblemTicketRows = Awaited<ReturnType<ProblemTicketClient['problemTickets']>>;
type ReceivableRows = Awaited<ReturnType<ApiClient['receivableAudits']>>['rows'];
type BusinessCostRows = Awaited<ReturnType<ApiClient['businessCostAudits']>>['rows'];
type PayableRows = Awaited<ReturnType<ApiClient['payableAudits']>>['rows'];
type StatementRows = Awaited<ReturnType<ApiClient['customerStatements']>>;
type CustomerAccountRows = Awaited<ReturnType<ApiClient['customerAccounts']>>;
type AccountLedgerRows = Awaited<ReturnType<ApiClient['accountLedger']>>;
type CarrierTaskRows = Awaited<ReturnType<ApiClient['carrierTaskQuery']['carrierTasks']>>;
type MasterData = Awaited<ReturnType<ApiClient['masterData']>>;

export interface WorkspaceRefreshWriters {
  setShipments(rows: ShipmentRows): void;
  setProblemTickets(rows: ProblemTicketRows): void;
  setReceivables(rows: ReceivableRows): void;
  setBusinessCostAudits(rows: BusinessCostRows): void;
  setPayableAudits(rows: PayableRows): void;
  setCustomerStatements(rows: StatementRows): void;
  setCustomerAccounts(rows: CustomerAccountRows): void;
  setAccountLedger(rows: AccountLedgerRows): void;
  setCarrierTasks(rows: CarrierTaskRows): void;
  setMasterData(value: MasterData): void;
}

export interface WorkspaceRefreshOptions {
  client: WorkspaceRefreshClient;
  user?: Principal;
  permissions: readonly PermissionKey[];
  skipIrrelevantWorkspaceData: boolean;
  emptyMasterData: MasterData;
  writers: WorkspaceRefreshWriters;
}

export async function refreshWorkspaceData(options: WorkspaceRefreshOptions) {
  const {
    client,
    user,
    permissions,
    skipIrrelevantWorkspaceData,
    emptyMasterData,
    writers
  } = options;
  const permissionSet = new Set<PermissionKey>(permissions);
  const canReadFinance = !skipIrrelevantWorkspaceData && permissions.some((permission) => permission.startsWith('finance:'));
  const canReadBusinessCosts = !skipIrrelevantWorkspaceData && permissionSet.has('finance:business-cost:read');
  const canReadInternalFinance = !skipIrrelevantWorkspaceData && permissionSet.has('finance:payable:read');
  const canReadCarrierTasks = !skipIrrelevantWorkspaceData && permissionSet.has('tracking:carrier-task:view') && user?.role !== 'CUSTOMER';
  const canReadMasterData = !skipIrrelevantWorkspaceData && permissions.some((permission) => permission.startsWith('master-data:') && permission.endsWith(':read'));
  const canReadProblems = !skipIrrelevantWorkspaceData && permissionSet.has('customer-service:problem:view');
  const canReadBusinessShipments = !skipIrrelevantWorkspaceData && permissionSet.has('business:shipment:list');
  const canReadWarehouseDispatch = !skipIrrelevantWorkspaceData && (permissionSet.has('warehouse:dispatch-pending:view') || permissionSet.has('warehouse:outbounded:view'));

  const [nextShipments, nextTickets] = await Promise.all([
    canReadBusinessShipments
      ? client.shipments()
      : canReadWarehouseDispatch
        ? client.warehouseDispatchShipments()
        : Promise.resolve([]),
    canReadProblems ? loadProblemTickets(client) : Promise.resolve([])
  ]);
  writers.setShipments(nextShipments);
  writers.setProblemTickets(nextTickets);

  if (canReadFinance || canReadBusinessCosts) {
    const [nextReceivables, nextBusinessCosts, nextPayables, nextStatements, nextAccounts, nextLedger] = await Promise.all([
      canReadFinance ? client.receivableAudits({ pageSize: 100 }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
      canReadBusinessCosts ? client.businessCostAudits({ pageSize: 100 }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
      canReadInternalFinance ? client.payableAudits({ pageSize: 100 }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
      canReadFinance ? client.customerStatements().catch(() => []) : Promise.resolve([]),
      canReadFinance ? client.customerAccounts().catch(() => []) : Promise.resolve([]),
      canReadFinance ? client.accountLedger().catch(() => []) : Promise.resolve([])
    ]);
    writers.setReceivables(nextReceivables.rows);
    writers.setBusinessCostAudits(nextBusinessCosts.rows);
    writers.setPayableAudits(nextPayables.rows);
    writers.setCustomerStatements(nextStatements);
    writers.setCustomerAccounts(nextAccounts);
    writers.setAccountLedger(nextLedger);
  } else {
    writers.setReceivables([]);
    writers.setBusinessCostAudits([]);
    writers.setPayableAudits([]);
    writers.setCustomerStatements([]);
    writers.setCustomerAccounts([]);
    writers.setAccountLedger([]);
  }

  if (canReadCarrierTasks) {
    try {
      writers.setCarrierTasks(await client.carrierTaskQuery.carrierTasks());
    } catch {
      writers.setCarrierTasks([]);
    }
  } else {
    writers.setCarrierTasks([]);
  }

  if (canReadMasterData) {
    writers.setMasterData(await client.masterData());
  } else {
    writers.setMasterData(emptyMasterData);
  }
}
