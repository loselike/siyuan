import type { CarrierTaskSummary, ExternalTrackingShipmentSummary, Shipment } from '@siyuan/shared';
export type { ExternalTrackingShipmentSummary } from '@siyuan/shared';

export type CarrierTaskQueryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class CarrierTaskQueryClient {
  constructor(private readonly request: CarrierTaskQueryRequest) {}

  carrierTasks(): Promise<CarrierTaskSummary[]> {
    return this.request('/carrier-tasks');
  }

  externalShipments(): Promise<ExternalTrackingShipmentSummary[]> {
    return this.request('/tracking/external-shipments');
  }

  externalShipmentDetail(shipmentId: string): Promise<Shipment> {
    return this.request(`/tracking/external-shipments/${encodeURIComponent(shipmentId)}`);
  }
}
