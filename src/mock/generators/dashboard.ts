import type { DashboardOverview } from '../../services';
import type {
  AppNotification,
  Customer,
  Lead,
  Order,
} from '../../types/domain';
import { timestampFromIndex } from '../core/helpers';
import { generateMockCustomers } from './customers';
import { generateMockLeads } from './leads';
import { generateMockNotifications } from './notifications';
import { generateMockOrders } from './orders';

interface GenerateMockDashboardOverviewOptions {
  leads?: Lead[];
  customers?: Customer[];
  orders?: Order[];
  notifications?: AppNotification[];
}

export function generateMockDashboardOverview(
  options?: GenerateMockDashboardOverviewOptions,
): DashboardOverview {
  const leads = options?.leads ?? generateMockLeads(8);
  const customers = options?.customers ?? generateMockCustomers(6);
  const orders = options?.orders ?? generateMockOrders(7);
  const notifications = options?.notifications ?? generateMockNotifications(5);

  const totalRevenue = Number(
    orders
      .filter((order) =>
        ['paid', 'partially-refunded'].includes(order.paymentStatus),
      )
      .reduce((sum, order) => sum + order.totalAmount, 0)
      .toFixed(2),
  );

  return {
    totalLeads: leads.length,
    totalCustomers: customers.length,
    totalOrders: orders.length,
    totalRevenue,
    currency: orders[0]?.currency ?? 'USD',
    unreadNotifications: notifications.filter((notification) => !notification.isRead)
      .length,
    updatedAt: timestampFromIndex(0, { hourOffset: 1 }),
  };
}
