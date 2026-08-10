import { lazy } from 'react';

export const loadCustomerServicePage = () => import('../customerService/CustomerServicePage').then((module) => ({ default: module.CustomerServicePage }));
export const loadFinancePage = () => import('../finance/FinancePage').then((module) => ({ default: module.FinancePage }));
export const loadWarehousePage = () => import('../warehouse/WarehousePage').then((module) => ({ default: module.WarehousePage }));
export const loadMiscFeesPage = () => import('../miscFees/MiscFeesPage').then((module) => ({ default: module.MiscFeesPage }));

export const CustomerServicePage = lazy(loadCustomerServicePage);
export const FinancePage = lazy(loadFinancePage);
export const WarehousePage = lazy(loadWarehousePage);
export const MiscFeesPage = lazy(loadMiscFeesPage);
