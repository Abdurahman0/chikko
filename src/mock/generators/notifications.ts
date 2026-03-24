import type {
  AppNotification,
  AppUser,
  Conversation,
  Customer,
  Lead,
  NotificationChannel,
  Order,
  Payment,
  UserSummary,
} from '../../types/domain';
import { formatCurrencyAmount } from '../../constants';
import { createMockId, cycleValue, timestampFromIndex } from '../core/helpers';

interface GenerateMockNotificationsOptions {
  leads?: Lead[];
  customers?: Customer[];
  orders?: Order[];
  payments?: Payment[];
  conversations?: Conversation[];
  users?: AppUser[];
}

interface NotificationTemplate {
  title: string;
  messageBuilder: (index: number) => string;
  channel: NotificationChannel;
}

function toUserSummary(user: AppUser): UserSummary {
  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

export function generateMockNotifications(
  count: number,
  options?: GenerateMockNotificationsOptions,
): AppNotification[] {
  const leads = options?.leads ?? [];
  const customers = options?.customers ?? [];
  const orders = options?.orders ?? [];
  const payments = options?.payments ?? [];
  const conversations = options?.conversations ?? [];
  const users = options?.users ?? [];

  const templates: NotificationTemplate[] = [
    {
      title: "Yangi buyurtma qabul qilindi",
      channel: 'in_app',
      messageBuilder: (index) => {
        const order = orders[index % (orders.length || 1)];
        return `Buyurtma ${order?.orderNumber ?? `ORD-${5400 + index}`} navbatga qo'shildi.`;
      },
    },
    {
      title: "To'lov kutilmoqda",
      channel: 'in_app',
      messageBuilder: (index) => {
        const order = orders[index % (orders.length || 1)];
        return `${order?.orderNumber ?? `ORD-${6600 + index}`} uchun to'lov hali tasdiqlanmadi.`;
      },
    },
    {
      title: "To'lov qabul qilindi",
      channel: 'telegram',
      messageBuilder: (index) => {
        const payment = payments[index % (payments.length || 1)];
        const amount = payment?.amount ?? 100 + (index * 5);
        return `Yangi to'lov: ${formatCurrencyAmount(amount, 'uz-UZ')}. Tranzaksiya tekshiruv navbatiga qo'shildi.`;
      },
    },
    {
      title: "Chatda yangi xabar",
      channel: 'telegram',
      messageBuilder: (index) => {
        const conversation = conversations[index % (conversations.length || 1)];
        const participant =
          conversation?.customer?.fullName ??
          conversation?.lead?.fullName ??
          conversation?.external_id ??
          `chat-${index + 1}`;
        return `${participant} suhbatida yangi xabar mavjud.`;
      },
    },
    {
      title: "Lid holati yangilandi",
      channel: 'in_app',
      messageBuilder: (index) => {
        const lead = leads[index % (leads.length || 1)];
        return `${lead?.fullName ?? `Lid-${index + 1}`} bo'yicha holat qayta belgilandi.`;
      },
    },
    {
      title: "Yangi mijoz qo'shildi",
      channel: 'in_app',
      messageBuilder: (index) => {
        const customer = customers[index % (customers.length || 1)];
        return `${customer?.fullName ?? `Mijoz-${index + 1}`} CRM bazasiga qo'shildi.`;
      },
    },
    {
      title: "To'lov tekshiruvi talab etiladi",
      channel: 'system',
      messageBuilder: (index) => {
        const payment = payments[index % (payments.length || 1)];
        const orderId = payment?.order ?? `order-${index + 1}`;
        return `${orderId} bilan bog'liq to'lov uchun qo'shimcha tekshiruv talab qilindi.`;
      },
    },
    {
      title: "Tizim ogohlantirishi",
      channel: 'system',
      messageBuilder: (index) =>
        index % 2 === 0
          ? "Rejalashtirilgan texnik ishlar 23:00 da boshlanadi."
          : "Xavfsizlik tekshiruvi yakunlandi. Tizim barqaror ishlamoqda.",
    },
  ];

  return Array.from({ length: count }, (_, index) => {
    const template = cycleValue(templates, index);
    const createdAt = timestampFromIndex(index, {
      hourOffset: 2 + (index % 8),
      minuteOffset: index % 37,
    });
    const updatedAt = timestampFromIndex(index, {
      hourOffset: 1 + (index % 5),
      minuteOffset: index % 19,
    });
    const user = users.length ? toUserSummary(cycleValue(users, index)) : null;
    const isRead = index % 3 === 0 || index % 7 === 0;

    return {
      id: createMockId('notification', index),
      created_at: createdAt,
      updated_at: updatedAt,
      title: template.title,
      message: template.messageBuilder(index),
      channel: template.channel,
      is_read: isRead,
      metadata:
        index % 4 === 0
          ? {
              source: template.channel,
              priority: index % 8 === 0 ? 'high' : 'normal',
              retry_count: index % 5,
            }
          : null,
      user: template.channel === 'system' && index % 2 === 0 ? null : user,
    };
  });
}
