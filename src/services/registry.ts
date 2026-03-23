import type { AppServices } from './core';
import { resolveDataSourceMode } from './core';
import {
  apiConversationService,
  apiCustomerService,
  apiDashboardService,
  apiLeadService,
  apiNotificationService,
  apiOrderService,
  apiPaymentService,
  apiProductService,
  apiProfileService,
} from './api';
import {
  mockConversationService,
  mockCustomerService,
  mockDashboardService,
  mockLeadService,
  mockNotificationService,
  mockOrderService,
  mockPaymentService,
  mockProductService,
  mockProfileService,
} from './mock';

export const services: AppServices = {
  dashboard:
    resolveDataSourceMode('dashboard') === 'api'
      ? apiDashboardService
      : mockDashboardService,
  leads:
    resolveDataSourceMode('leads') === 'api' ? apiLeadService : mockLeadService,
  customers:
    resolveDataSourceMode('customers') === 'api'
      ? apiCustomerService
      : mockCustomerService,
  products:
    resolveDataSourceMode('products') === 'api'
      ? apiProductService
      : mockProductService,
  orders:
    resolveDataSourceMode('orders') === 'api'
      ? apiOrderService
      : mockOrderService,
  payments:
    resolveDataSourceMode('payments') === 'api'
      ? apiPaymentService
      : mockPaymentService,
  conversations:
    resolveDataSourceMode('conversations') === 'api'
      ? apiConversationService
      : mockConversationService,
  notifications:
    resolveDataSourceMode('notifications') === 'api'
      ? apiNotificationService
      : mockNotificationService,
  profile:
    resolveDataSourceMode('profile') === 'api'
      ? apiProfileService
      : mockProfileService,
};
