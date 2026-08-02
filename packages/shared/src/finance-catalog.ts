export type FinanceCatalogCategory = 'FEE_NAME' | 'SETTLEMENT_METHOD' | 'CARGO_TYPE' | 'PRODUCT_NAME';

export interface FinanceCatalogItemSummary {
  id: string;
  category: FinanceCatalogCategory;
  sortOrder: number;
  name: string;
  currency?: string;
  remark?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceCatalogItemInput {
  category: FinanceCatalogCategory;
  sortOrder?: number;
  name: string;
  currency?: string;
  remark?: string;
  enabled?: boolean;
}

export interface FinanceCatalogListQuery {
  category?: FinanceCatalogCategory;
  keyword?: string;
  enabledOnly?: boolean;
}

export interface FinanceCatalogReorderInput {
  category: FinanceCatalogCategory;
  orderedIds: string[];
}

export interface FinanceCatalogListResponse {
  items: FinanceCatalogItemSummary[];
}

export const defaultFinanceCatalogItems: Array<Omit<FinanceCatalogItemSummary, 'id' | 'createdAt' | 'updatedAt'>> = [
  { category: 'FEE_NAME', sortOrder: 1, name: '运费', remark: '根据结算方式自动匹配', enabled: true },
  { category: 'FEE_NAME', sortOrder: 2, name: '报关费', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 3, name: '纸箱', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 4, name: '胶带', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 5, name: '围膜', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 6, name: '标签', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 7, name: '麻袋', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 8, name: '绑带', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 9, name: 'A4纸', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 10, name: '托盘', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 11, name: '雨布', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 12, name: '临时工', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 13, name: '木工', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 14, name: '临时工', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 15, name: '装柜', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 16, name: '叉车', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 17, name: '送货费销', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 18, name: '其他工具', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 19, name: '基础运费', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 20, name: '客户运费', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 21, name: '业务员成本', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 22, name: '业务成本', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 23, name: 'USD 附加费', currency: 'USD', enabled: true },
  { category: 'FEE_NAME', sortOrder: 24, name: '出货成本', currency: 'RMB', enabled: true },
  { category: 'FEE_NAME', sortOrder: 25, name: '代理运费', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 1, name: '思远阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 2, name: '科沃尔阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 3, name: '华侨银行', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 4, name: 'SH阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 5, name: 'JYL阿里', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 6, name: '西联', currency: 'USD', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 7, name: '农村商业银行', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 8, name: '中国银行', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 9, name: '招商银行', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 10, name: '思远微信', currency: 'RMB', enabled: true },
  { category: 'SETTLEMENT_METHOD', sortOrder: 11, name: '思远支付宝', currency: 'RMB', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 1, name: '普货', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 2, name: '液体', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 3, name: '带电', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 4, name: '仿牌', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 5, name: '带磁', enabled: true },
  { category: 'CARGO_TYPE', sortOrder: 6, name: '粉末', enabled: true },
  { category: 'PRODUCT_NAME', sortOrder: 1, name: '服饰', enabled: true },
  { category: 'PRODUCT_NAME', sortOrder: 2, name: '配件', enabled: true }
];
