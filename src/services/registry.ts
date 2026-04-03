import type { AppServices } from './core';
import {
  apiAISettingsService,
  apiConversationService,
  apiCourierService,
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

export const services: AppServices = {
  dashboard: apiDashboardService,
  couriers: apiCourierService,
  leads: apiLeadService,
  customers: apiCustomerService,
  products: apiProductService,
  orders: apiOrderService,
  payments: apiPaymentService,
  conversations: apiConversationService,
  notifications: apiNotificationService,
  integrations: apiIntegrationsService,
  logs: apiLogsService,
  aiSettings: apiAISettingsService,
  profile: apiProfileService,
  users: apiUserService,
};
