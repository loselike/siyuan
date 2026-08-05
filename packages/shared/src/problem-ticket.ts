export interface ProblemTicketCreateInput {
  reason: string;
  customerVisible?: boolean;
  tags?: string[];
  pushToSales?: boolean;
}

export interface ProblemTicketSummary {
  id: string;
  shipmentId: string;
  customerOrderNo?: string;
  outboundOrderNo?: string;
  systemOrderNo: string;
  customerName: string;
  reason: string;
  status: string;
  customerVisible: boolean;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
  assistanceReason?: string;
  assistanceRequestedAt?: string;
  tagSnapshot?: string[];
  replies: Array<{ id: string; author: string; message: string; createdAt: string }>;
}

export interface CommonTagSummary {
  id: string;
  name: string;
  scene: 'PROBLEM_TICKET';
  enabled: boolean;
  customerVisibleAllowed: boolean;
  sortOrder: number;
}

export interface CommonTagCreateInput {
  name: string;
}

export interface CommonTagUpdateInput {
  name: string;
}
