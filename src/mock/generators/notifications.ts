import {
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
} from '../../constants';
import type {
  AppNotification,
  Conversation,
  Lead,
  NotificationSeverity,
  NotificationType,
  Order,
  AppUser,
} from '../../types/domain';
import { createMockId, cycleValue, timestampFromIndex } from '../core/helpers';
import { generateMockConversations } from './conversations';
import { generateMockLeads } from './leads';
import { generateMockOrders } from './orders';
import { generateMockUsers } from './users';

interface GenerateMockNotificationsOptions {
  leads?: Lead[];
  orders?: Order[];
  conversations?: Conversation[];
  users?: AppUser[];
}

function deriveSeverity(type: NotificationType, index: number): NotificationSeverity {
  if (type === 'payment' || type === 'order') {
    return cycleValue(['warning', 'info', 'success'], index) as NotificationSeverity;
  }

  if (type === 'system') {
    return cycleValue(['info', 'danger'], index) as NotificationSeverity;
  }

  return cycleValue(NOTIFICATION_SEVERITIES, index, 1);
}

export function generateMockNotifications(
  count: number,
  options?: GenerateMockNotificationsOptions,
): AppNotification[] {
  const leads = options?.leads ?? generateMockLeads(Math.max(count, 3));
  const orders = options?.orders ?? generateMockOrders(Math.max(count, 3));
  const conversations =
    options?.conversations ?? generateMockConversations(Math.max(count, 3));
  const users = options?.users ?? generateMockUsers(3, { roles: ['operator', 'admin'] });

  return Array.from({ length: count }, (_, index) => {
    const type = cycleValue(NOTIFICATION_TYPES, index);

    if (type === 'lead') {
      const lead = leads[index % leads.length]!;
      return {
        id: createMockId('notification', index),
        type,
        title: 'Lead requires follow-up',
        message: `${lead.fullName} has a recent message waiting for review.`,
        severity: deriveSeverity(type, index),
        isRead: index % 3 === 0,
        createdAt: timestampFromIndex(index, { hourOffset: 1 }),
        relatedEntity: {
          entityType: 'lead',
          entityId: lead.id,
          label: lead.fullName,
          path: `/leads/${lead.id}`,
        },
      };
    }

    if (type === 'order' || type === 'payment') {
      const order = orders[index % orders.length]!;
      return {
        id: createMockId('notification', index),
        type,
        title: type === 'order' ? 'Order status updated' : 'Payment needs attention',
        message:
          type === 'order'
            ? `${order.orderNumber} moved to ${order.orderStatus}.`
            : `${order.orderNumber} has payment status ${order.paymentStatus}.`,
        severity: deriveSeverity(type, index),
        isRead: index % 3 === 0,
        createdAt: timestampFromIndex(index, { hourOffset: 1 }),
        relatedEntity: {
          entityType: 'order',
          entityId: order.id,
          label: order.orderNumber,
          path: `/orders/${order.id}`,
        },
      };
    }

    if (type === 'conversation') {
      const conversation = conversations[index % conversations.length]!;
      return {
        id: createMockId('notification', index),
        type,
        title: 'Unread conversation activity',
        message: `${conversation.participantName} has new conversation activity on ${conversation.platform}.`,
        severity: deriveSeverity(type, index),
        isRead: index % 3 === 0,
        createdAt: timestampFromIndex(index, { hourOffset: 1 }),
        relatedEntity: {
          entityType: 'conversation',
          entityId: conversation.id,
          label: conversation.participantName,
          path: `/chat`,
        },
      };
    }

    if (type === 'user') {
      const user = users[index % users.length]!;
      return {
        id: createMockId('notification', index),
        type,
        title: 'Operator activity updated',
        message: `${user.fullName} has recent account activity.`,
        severity: deriveSeverity(type, index),
        isRead: index % 3 === 0,
        createdAt: timestampFromIndex(index, { hourOffset: 1 }),
        relatedEntity: {
          entityType: 'user',
          entityId: user.id,
          label: user.fullName,
          path: `/profile`,
        },
      };
    }

    return {
      id: createMockId('notification', index),
      type,
      title: 'System notice',
      message: 'The foundation is ready for service integration and feature development.',
      severity: deriveSeverity(type, index),
      isRead: index % 3 === 0,
      createdAt: timestampFromIndex(index, { hourOffset: 1 }),
    };
  });
}
