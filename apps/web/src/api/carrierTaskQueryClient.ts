import type { CarrierTaskSummary } from '@siyuan/shared';

export type CarrierTaskQueryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class CarrierTaskQueryClient {
  constructor(private readonly request: CarrierTaskQueryRequest) {}

  carrierTasks(): Promise<CarrierTaskSummary[]> {
    return this.request('/carrier-tasks');
  }
}
