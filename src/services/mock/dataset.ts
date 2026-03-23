import {
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

const users = generateMockUsers(6);
const operators = users.filter((user) => user.role === 'operator');
const leads = generateMockLeads(14, { operators });
const customers = generateMockCustomers(10);
const products = generateMockProducts(12);
const orders = generateMockOrders(12, { customers, products, operators });
const payments = generateMockPayments(12, { orders });
const conversations = generateMockConversations(10, {
  leads,
  customers,
  operators,
});
let notifications = generateMockNotifications(10, {
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
  return generateMockDashboardOverview({
    leads: mockDataStore.leads,
    customers: mockDataStore.customers,
    orders: mockDataStore.orders,
    notifications: mockDataStore.notifications,
  });
}
