import {
  DASHBOARD_MOCK_SCENARIO_COUNT,
  generateMockChatMessages,
  generateMockConversations,
  generateMockCustomers,
  generateMockDashboardOverview,
  generateMockLeads,
  generateMockNotifications,
  generateMockOrders,
  generateMockPayments,
  generateMockProducts,
  generateMockUsers,
} from '../../mock';
import type {
  AppNotification,
  AppUser,
  ChatMessage,
  Conversation,
  Customer,
  Lead,
  Order,
  Payment,
  Product,
} from '../../types/domain';

const users = generateMockUsers(10);
const operators = users.filter((user) => user.role === 'operator');
const leads = generateMockLeads(48, { operators });
const customers = generateMockCustomers(42, { operators, leads });
const products = generateMockProducts(44);
const orders = generateMockOrders(36, { customers, leads, products });
const payments = generateMockPayments(24, { orders });
const conversations = generateMockConversations(15, {
  leads,
  customers,
  operators,
});
let notifications = generateMockNotifications(20, {
  leads,
  orders,
  conversations,
  users,
});
const messagesByConversationId = new Map<string, ChatMessage[]>(
  conversations.map((conversation, index) => [
    conversation.id,
    generateMockChatMessages(conversation.id, 5 + (index % 3)),
  ]),
);
let dashboardScenarioCursor = 0;

export const mockDataStore = {
  users,
  operators,
  leads,
  customers,
  products,
  orders,
  payments,
  conversations,
  get notifications(): AppNotification[] {
    return notifications;
  },
  set notifications(nextNotifications: AppNotification[]) {
    notifications = nextNotifications;
  },
  currentUser: users[0] ?? null,
  messagesByConversationId,
};

export function getMockDashboardOverview() {
  const next = generateMockDashboardOverview({
    scenarioIndex: dashboardScenarioCursor,
  });
  dashboardScenarioCursor =
    (dashboardScenarioCursor + 1) % DASHBOARD_MOCK_SCENARIO_COUNT;
  return next;
}
