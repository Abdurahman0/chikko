import type { AppServices } from './core';
import { resolveDataSourceMode } from './core';
import {
  apiAISettingsService,
  apiConversationService,
  apiCustomerService,
  apiDashboardService,
  apiIntegrationsService,
  apiLeadService,
  apiLogsService,
  apiNotificationService,
  apiOrderService,
  apiPaymentService,
  apiProductService,
  apiProfileService,
  apiUserService,
} from './api';
import {
  mockAISettingsService,
  mockConversationService,
  mockCustomerService,
  mockDashboardService,
  mockIntegrationsService,
  mockLeadService,
  mockLogsService,
  mockNotificationService,
  mockOrderService,
  mockPaymentService,
  mockProductService,
  mockProfileService,
  mockUserService,
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
  integrations:
    resolveDataSourceMode('integrations') === 'api'
      ? apiIntegrationsService
      : mockIntegrationsService,
  logs:
    resolveDataSourceMode('logs') === 'api'
      ? apiLogsService
      : mockLogsService,
  aiSettings:
    resolveDataSourceMode('aiSettings') === 'api'
      ? apiAISettingsService
      : mockAISettingsService,
  profile:
    resolveDataSourceMode('profile') === 'api'
      ? apiProfileService
      : mockProfileService,
  users:
    resolveDataSourceMode('users') === 'api'
      ? apiUserService
      : mockUserService,
};
