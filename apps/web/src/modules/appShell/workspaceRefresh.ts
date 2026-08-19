import { toExternalTrackingShipmentSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey, Principal } from '../../apiClient';
import { loadProblemTickets, type ProblemTicketClient } from '../problemTickets/problemTicketClient';

export type WorkspaceRefreshClient = Pick<
  ApiClient,
  | 'shipments'
  | 'customerServiceShipments'
  | 'warehouseDispatchShipments'
  | 'receivableAudits'
  | 'businessCostAudits'
  | 'payableAudits'
  | 'customerStatements'
  | 'customerAccounts'
  | 'accountLedger'
  | 'masterData'
> & ProblemTicketClient & {
  carrierTaskQuery: Pick<ApiClient['carrierTaskQuery'], 'carrierTasks' | 'externalShipments'>;
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
type ExternalTrackingShipmentRows = Awaited<ReturnType<ApiClient['carrierTaskQuery']['externalShipments']>>;
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
  setExternalTrackingShipments?(rows: ExternalTrackingShipmentRows): void;
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

export interface WorkspaceRefreshCoordinator {
  run(scopeKey: string, refresh: () => Promise<void>): Promise<void>;
}

export function createWorkspaceRefreshCoordinator(): WorkspaceRefreshCoordinator {
  const inFlightByScope = new Map<string, Promise<void>>();

  return {
    run(scopeKey, refresh) {
      const inFlight = inFlightByScope.get(scopeKey);
      if (inFlight) return inFlight;

      let current: Promise<void>;
      try {
        current = refresh();
      } catch (error) {
        current = Promise.reject(error);
      }
      inFlightByScope.set(scopeKey, current);
      const clear = () => {
        if (inFlightByScope.get(scopeKey) === current) {
          inFlightByScope.delete(scopeKey);
        }
      };
      void current.then(clear, clear);
      return current;
    }
  };
}

export function mergeWorkspaceShipmentRows(groups: ShipmentRows[]): ShipmentRows {
  const rowsById = new Map<string, ShipmentRows[number]>();
  groups.flat().forEach((row) => {
    const current = rowsById.get(row.id);
    rowsById.set(row.id, current ? { ...current, ...row } : row);
  });
  return Array.from(rowsById.values());
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
  const canReadExternalTracking = !skipIrrelevantWorkspaceData && permissionSet.has('tracking:external:view');
  const canReadMasterData = !skipIrrelevantWorkspaceData && permissions.some((permission) => permission.startsWith('master-data:') && permission.endsWith(':read'));
  const canReadProblems = !skipIrrelevantWorkspaceData && permissionSet.has('customer-service:problem:view');
  const canReadBusinessShipments = !skipIrrelevantWorkspaceData && permissionSet.has('business:shipment:list');
  const canReadWarehouseDispatch = !skipIrrelevantWorkspaceData && (permissionSet.has('warehouse:dispatch-pending:view') || permissionSet.has('warehouse:outbounded:view'));
  const customerServiceShipmentViewPermissions = [
    'customer-service:data-confirm:view',
    'customer-service:transfer:view',
    'customer-service:pending-routing:view',
    'customer-service:waiting-departure:view',
    'customer-service:departed:view',
    'customer-service:arrived-port:view',
    'customer-service:delivering:view',
    'customer-service:signed:view'
  ] as PermissionKey[];
  const canReadCustomerServiceShipments = user?.role !== 'CUSTOMER'
    && permissions.some((permission) => customerServiceShipmentViewPermissions.includes(permission));

  const shipmentRequests: Array<Promise<ShipmentRows>> = [
    ...(canReadBusinessShipments ? [client.shipments()] : []),
    ...(canReadCustomerServiceShipments ? [client.customerServiceShipments()] : []),
    ...(canReadWarehouseDispatch ? [client.warehouseDispatchShipments()] : [])
  ];
  const [shipmentGroups, nextTickets] = await Promise.all([
    Promise.all(shipmentRequests),
    canReadProblems ? loadProblemTickets(client) : Promise.resolve([])
  ]);
  const nextShipments = mergeWorkspaceShipmentRows(shipmentGroups);
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

  if (writers.setExternalTrackingShipments && canReadExternalTracking) {
    try {
      writers.setExternalTrackingShipments(await client.carrierTaskQuery.externalShipments());
    } catch {
      writers.setExternalTrackingShipments(canReadBusinessShipments
        ? nextShipments.map(toExternalTrackingShipmentSummary)
        : []);
    }
  } else if (writers.setExternalTrackingShipments) {
    writers.setExternalTrackingShipments([]);
  }

  if (canReadMasterData) {
    writers.setMasterData(await client.masterData());
  } else {
    writers.setMasterData(emptyMasterData);
  }
}
