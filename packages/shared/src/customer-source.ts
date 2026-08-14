export interface CustomerSourceSummary {
  id: string;
  name: string;
  normalizedName: string;
  remark?: string;
  sortOrder: number;
  enabled: boolean;
  customerCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerSourceInput {
  name: string;
  remark?: string;
  enabled?: boolean;
}

export interface CustomerSourceListQuery {
  keyword?: string;
  enabledOnly?: boolean;
}

export interface CustomerSourceListResponse {
  items: CustomerSourceSummary[];
}
