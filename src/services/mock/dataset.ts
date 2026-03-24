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
  AISetting,
  AppLog,
  AppNotification,
  AppUser,
  ChatMessage,
  Conversation,
  Customer,
  IntegrationConfig,
  IntegrationEvent,
  IntegrationPlatform,
  Lead,
  ManagedUser,
  Order,
  Payment,
  Product,
  UserPermission,
  UserPermissionCode,
} from '../../types/domain';
import { DEMO_AUTH_ACCOUNTS } from '../../auth/demo-users';

const users = generateMockUsers(10);
const operators = users.filter((user) => user.role === 'operator');
const leads = generateMockLeads(48, { operators });
const customers = generateMockCustomers(42, { operators, leads });
const products = generateMockProducts(44);
const orders = generateMockOrders(36, { customers, leads, products });
const payments = generateMockPayments(36, { orders });
const conversations = generateMockConversations(24, {
  leads,
  customers,
  operators,
});
let notifications = generateMockNotifications(32, {
  leads,
  customers,
  orders,
  payments,
  conversations,
  users,
});
const messagesByConversationId = new Map<string, ChatMessage[]>();

const permissionDefinitions: Array<{
  code: UserPermissionCode;
  name: string;
  description: string;
}> = [
  {
    code: 'can_view_dashboard',
    name: "Dashboardni ko'rish",
    description: "Boshqaruv panelidagi KPI va umumiy analitikani ko'rish.",
  },
  {
    code: 'can_view_leads',
    name: "Lidlarni ko'rish",
    description: "Lidlar ro'yxati va tafsilotlarini ko'rish.",
  },
  {
    code: 'can_manage_leads',
    name: 'Lidlarni boshqarish',
    description: "Lidlarni yaratish, tahrirlash va o'chirish amallari.",
  },
  {
    code: 'can_view_customers',
    name: "Mijozlarni ko'rish",
    description: "Mijozlar ro'yxati va tafsilotlarini ko'rish.",
  },
  {
    code: 'can_manage_customers',
    name: 'Mijozlarni boshqarish',
    description: "Mijozlar ustida CRUD amallarini bajarish.",
  },
  {
    code: 'can_view_products',
    name: "Mahsulotlarni ko'rish",
    description: 'Mahsulot katalogi va narxlarini ko‘rish.',
  },
  {
    code: 'can_manage_products',
    name: 'Mahsulotlarni boshqarish',
    description: "Mahsulotlarni yaratish va tahrirlash amallari.",
  },
  {
    code: 'can_view_orders',
    name: "Buyurtmalarni ko'rish",
    description: "Buyurtmalar ro'yxati va tafsilotlarini ko'rish.",
  },
  {
    code: 'can_update_orders',
    name: 'Buyurtmalarni yangilash',
    description: 'Buyurtma holati va tarkibini yangilashga ruxsat.',
  },
  {
    code: 'can_view_payments',
    name: "To'lovlarni ko'rish",
    description: "To'lovlar ro'yxati va tafsilotlarini ko'rish.",
  },
  {
    code: 'can_manage_payments',
    name: "To'lovlarni boshqarish",
    description: "To'lovlarni tasdiqlash, rad etish va tekshirish.",
  },
  {
    code: 'can_chat',
    name: 'Chatga kirish',
    description: "Mijozlar chat sessiyalari bilan ishlash.",
  },
  {
    code: 'can_view_notifications',
    name: "Bildirishnomalarni ko'rish",
    description: "Bildirishnomalar markazini ko'rish.",
  },
  {
    code: 'can_manage_users',
    name: "Foydalanuvchilarni boshqarish",
    description: "Foydalanuvchilar va ruxsatlarni boshqarish.",
  },
  {
    code: 'can_manage_integrations',
    name: 'Integratsiyalarni boshqarish',
    description: "Uchinchi tomon ulanishlarini boshqarish.",
  },
  {
    code: 'can_manage_ai_settings',
    name: 'AI sozlamalarini boshqarish',
    description: 'AI modul konfiguratsiyasi va siyosatlarini boshqarish.',
  },
  {
    code: 'can_view_logs',
    name: "Jurnallarni ko'rish",
    description: 'Audit va tizim loglarini ko‘rish.',
  },
];

const permissionCatalog: UserPermission[] = permissionDefinitions.map((permission) => ({
  id: `perm-${permission.code}`,
  code: permission.code,
  name: permission.name,
  description: permission.description,
}));

const permissionIdByCode = new Map(
  permissionCatalog.map((permission) => [permission.code, permission.id]),
);

const demoManagedUsers: ManagedUser[] = DEMO_AUTH_ACCOUNTS.map((account, index) => ({
  id: `managed-${account.user.id}`,
  email: account.user.email,
  full_name: account.user.fullName,
  phone: account.user.phone ?? null,
  role: account.user.role,
  is_active: account.user.status !== 'inactive',
  custom_permissions:
    account.user.role === 'operator'
      ? account.user.permissionKeys
          .map((code) => permissionIdByCode.get(code))
          .filter((permissionId): permissionId is string => Boolean(permissionId))
      : [],
  created_by: index === 0 ? null : `managed-${DEMO_AUTH_ACCOUNTS[0]!.user.id}`,
  created_at: account.user.createdAt,
  updated_at: account.user.updatedAt,
}));

const extraManagedUsers: ManagedUser[] = users.slice(0, 6).map((user, index) => {
  const role = index % 2 === 0 ? 'operator' : 'admin';
  const operatorPermissions: UserPermissionCode[] =
    index % 4 === 0
      ? ['can_view_dashboard', 'can_chat', 'can_view_notifications']
      : ['can_view_orders', 'can_view_customers', 'can_update_orders'];

  return {
    id: `managed-extra-${user.id}`,
    email: role === 'admin' ? `admin.${index + 2}@example.com` : `operator.${index + 5}@example.com`,
    full_name: user.fullName,
    phone: user.phone ?? null,
    role,
    is_active: user.status !== 'inactive',
    custom_permissions:
      role === 'operator'
        ? operatorPermissions
            .map((code) => permissionIdByCode.get(code))
            .filter((permissionId): permissionId is string => Boolean(permissionId))
        : [],
    created_by: `managed-${DEMO_AUTH_ACCOUNTS[0]!.user.id}`,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
});

const managedUsers: ManagedUser[] = [...demoManagedUsers, ...extraManagedUsers];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const aiSettings: AISetting[] = [
  {
    id: 'ai-setting-1',
    created_at: daysAgo(38),
    updated_at: daysAgo(1),
    name: 'Savdo yordamchisi v3',
    system_prompt:
      "Siz Chikko CRM savdo assistentisiz. Mijoz so'rovlarini qisqa, aniq va odobli tarzda boshqaring. Buyurtma ma'lumotlari noaniq bo'lsa, aniqlashtiruvchi savol bering.",
    model_name: 'gpt-4.1-mini',
    temperature: 0.35,
    auto_order_enabled: true,
    order_confidence_threshold: 0.82,
    resume_after_operator_minutes: 18,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'ai-setting-2',
    created_at: daysAgo(52),
    updated_at: daysAgo(10),
    name: 'Konservativ operator rejimi',
    system_prompt:
      "Siz ehtiyotkor CRM yordamchisiz. Har bir buyurtma oldidan mijozning ism, telefon va manzilini tasdiqlang. Ishonch past bo'lsa operatorga eskalatsiya qiling.",
    model_name: 'gpt-4.1-mini',
    temperature: 0.2,
    auto_order_enabled: false,
    order_confidence_threshold: 0.9,
    resume_after_operator_minutes: 25,
    is_active: false,
    updated_by: 'managed-auth-user-admin',
  },
  {
    id: 'ai-setting-3',
    created_at: daysAgo(30),
    updated_at: daysAgo(7),
    name: 'Tezkor chat rejimi',
    system_prompt:
      "Siz tezkor javob beruvchi yordamchisiz. Savollarga 1-2 jumlada javob bering, kerak bo'lsa keyinroq operatorga ulashni taklif qiling.",
    model_name: 'gpt-4.1-nano',
    temperature: 0.55,
    auto_order_enabled: false,
    order_confidence_threshold: 0.7,
    resume_after_operator_minutes: 12,
    is_active: false,
    updated_by: 'managed-auth-user-operator-sales',
  },
  {
    id: 'ai-setting-4',
    created_at: daysAgo(21),
    updated_at: daysAgo(4),
    name: 'To\'lov tekshiruvi assistenti',
    system_prompt:
      "Siz to'lovni verifikatsiya qilish bo'yicha yordamchisiz. Tranzaksiya raqami va oxirgi 4 karta raqamini tekshirib, mos kelmasa operatorga yuboring.",
    model_name: 'gpt-4.1',
    temperature: 0.28,
    auto_order_enabled: false,
    order_confidence_threshold: 0.88,
    resume_after_operator_minutes: 20,
    is_active: false,
    updated_by: 'managed-auth-user-operator-payments',
  },
  {
    id: 'ai-setting-5',
    created_at: daysAgo(12),
    updated_at: daysAgo(2),
    name: 'Upsell tavsiya profili',
    system_prompt:
      "Siz upsell bo'yicha tavsiya berasiz. Mijoz konteksti asosida mos qo'shimcha mahsulotlarni taklif qiling, lekin agressiv sotuvdan saqlaning.",
    model_name: 'gpt-4.1-mini',
    temperature: 0.48,
    auto_order_enabled: true,
    order_confidence_threshold: 0.76,
    resume_after_operator_minutes: 15,
    is_active: false,
    updated_by: 'managed-auth-user-developer',
  },
];

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const integrationEventPlatforms: IntegrationPlatform[] = [
  'telegram',
  'instagram',
  'telegram',
  'instagram',
  'userbot',
  'payment',
];

const integrationEventTypes: Record<IntegrationPlatform, string[]> = {
  telegram: ['message_received', 'callback_query', 'webhook_verified', 'chat_joined'],
  instagram: ['dm_received', 'comment_created', 'story_mention', 'webhook_verified'],
  userbot: ['session_refreshed', 'message_dispatched', 'rate_limited', 'sync_completed'],
  payment: ['payment_webhook', 'invoice_paid', 'charge_failed', 'refund_created'],
};

const integrationErrors = [
  'Webhook signature tekshirilmadi.',
  'Provider timeout: qayta urinish talab qilinadi.',
  'Payload validatsiyasida xatolik.',
  'Rate limit sabab navbatga olindi.',
];

const integrationEvents: IntegrationEvent[] = Array.from({ length: 30 }, (_, index) => {
  const platform = integrationEventPlatforms[index % integrationEventPlatforms.length]!;
  const eventTypeSet = integrationEventTypes[platform];
  const event_type = eventTypeSet[index % eventTypeSet.length]!;
  const processed = index % 5 !== 0;
  const processing_attempts = processed ? 1 + (index % 2) : 2 + (index % 3);
  const external_id =
    platform === 'telegram'
      ? `tg-${86000 + index}`
      : platform === 'instagram'
        ? `ig-${54000 + index}`
        : platform === 'payment'
          ? `pay-${42000 + index}`
          : `ub-${19000 + index}`;
  const created_at = hoursAgo(3 + index * 2);
  const updated_at = new Date(
    new Date(created_at).getTime() + (processed ? 14 : 28) * 60 * 1000,
  ).toISOString();

  const payload: Record<string, unknown> =
    platform === 'telegram'
      ? {
          update_id: 100000 + index,
          chat_id: external_id,
          text: index % 2 === 0 ? 'Buyurtma holatini yuboring' : 'Narxlar ro\'yxati kerak',
          username: `tg_user_${index + 1}`,
        }
      : platform === 'instagram'
        ? {
            entry_id: 200000 + index,
            sender_id: external_id,
            message: index % 2 === 0 ? 'DM orqali savol yuborildi' : 'Kommentda murojaat',
            account: `insta_${index + 10}`,
          }
        : platform === 'payment'
          ? {
              transaction_id: external_id,
              amount: 150000 + index * 3500,
              currency: 'UZS',
              status: index % 3 === 0 ? 'failed' : 'paid',
            }
          : {
              session_id: external_id,
              action: event_type,
              shard: (index % 4) + 1,
              latency_ms: 120 + index * 7,
            };

  return {
    id: `integration-event-${index + 1}`,
    created_at,
    updated_at,
    platform,
    event_type,
    external_id,
    event_key: `${platform}:${event_type}:${external_id}`,
    payload,
    processed,
    processing_attempts,
    error_message: processed ? null : integrationErrors[index % integrationErrors.length]!,
  };
});

const integrationConfigs: IntegrationConfig[] = [
  {
    id: 'integration-config-1',
    created_at: daysAgo(52),
    updated_at: daysAgo(2),
    provider: 'telegram',
    key: 'bot_token_main',
    label: 'Telegram Bot Token (Asosiy)',
    value: '620001:AAHk...x9_main',
    is_secret: true,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-2',
    created_at: daysAgo(50),
    updated_at: daysAgo(3),
    provider: 'telegram',
    key: 'webhook_secret',
    label: 'Telegram Webhook Secret',
    value: 'tg_whsec_7fd9b92a31',
    is_secret: true,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-3',
    created_at: daysAgo(42),
    updated_at: daysAgo(9),
    provider: 'telegram',
    key: 'webhook_url',
    label: 'Telegram Webhook URL',
    value: 'https://api.chikko.local/integrations/telegram/webhook',
    is_secret: false,
    is_active: true,
    updated_by: 'managed-auth-user-admin',
  },
  {
    id: 'integration-config-4',
    created_at: daysAgo(45),
    updated_at: daysAgo(5),
    provider: 'instagram',
    key: 'app_id',
    label: 'Instagram App ID',
    value: 'ig_app_229901',
    is_secret: false,
    is_active: true,
    updated_by: 'managed-auth-user-admin',
  },
  {
    id: 'integration-config-5',
    created_at: daysAgo(45),
    updated_at: daysAgo(5),
    provider: 'instagram',
    key: 'app_secret',
    label: 'Instagram App Secret',
    value: 'ig_secret_2f8da18c',
    is_secret: true,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-6',
    created_at: daysAgo(39),
    updated_at: daysAgo(6),
    provider: 'instagram',
    key: 'verify_token',
    label: 'Instagram Verify Token',
    value: 'ig_verify_2026',
    is_secret: true,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-7',
    created_at: daysAgo(33),
    updated_at: daysAgo(4),
    provider: 'instagram',
    key: 'page_access_token',
    label: 'Instagram Page Access Token',
    value: 'EAAJZC...IG_PAGE_TOKEN',
    is_secret: true,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-8',
    created_at: daysAgo(30),
    updated_at: daysAgo(8),
    provider: 'instagram',
    key: 'account_mapping',
    label: 'Instagram Account Mapping',
    value: '{"sales":"178414001","support":"178414002"}',
    is_secret: false,
    is_active: true,
    updated_by: 'managed-auth-user-admin',
  },
  {
    id: 'integration-config-9',
    created_at: daysAgo(27),
    updated_at: daysAgo(10),
    provider: 'openai',
    key: 'api_key_primary',
    label: 'OpenAI API Key',
    value: 'sk-live-oa_9x...primary',
    is_secret: true,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-10',
    created_at: daysAgo(23),
    updated_at: daysAgo(11),
    provider: 'openai',
    key: 'model_default',
    label: 'OpenAI Default Model',
    value: 'gpt-4.1-mini',
    is_secret: false,
    is_active: true,
    updated_by: 'managed-auth-user-developer',
  },
  {
    id: 'integration-config-11',
    created_at: daysAgo(19),
    updated_at: daysAgo(7),
    provider: 'telegram',
    key: 'fallback_bot_token',
    label: 'Telegram Fallback Bot Token',
    value: '620009:AAHk...fallback',
    is_secret: true,
    is_active: false,
    updated_by: 'managed-auth-user-admin',
  },
  {
    id: 'integration-config-12',
    created_at: daysAgo(17),
    updated_at: daysAgo(3),
    provider: 'instagram',
    key: 'webhook_endpoint',
    label: 'Instagram Webhook Endpoint',
    value: 'https://api.chikko.local/integrations/instagram/webhook',
    is_secret: false,
    is_active: true,
    updated_by: 'managed-auth-user-admin',
  },
];

const logTypeRotation: AppLog['type'][] = [
  'ai',
  'webhook',
  'error',
  'payment',
  'system',
];

const logMessagesByType: Record<AppLog['type'], string[]> = {
  ai: [
    "AI javobi shakllantirildi va mijoz sessiyasiga yuborildi.",
    "AI tavsiya modeli buyurtma ehtimolini qayta hisoblab chiqdi.",
    "AI system prompt versiyasi almashdi va yangi sessiyalarda qo'llandi.",
    "AI confidence threshold asosida operatorga eskalatsiya qilindi.",
  ],
  webhook: [
    "Telegram webhook qabul qilindi va queue'ga yuborildi.",
    "Instagram webhook event imzosi tekshirildi.",
    "Webhook payload schema validatsiyasi muvaffaqiyatli yakunlandi.",
    "Webhook retry mexanizmi navbatdagi urinishni ishga tushirdi.",
  ],
  error: [
    "Webhook processing jarayonida timeout xatoligi qayd etildi.",
    "Payment verification callback parse qilishda xatolik kuzatildi.",
    "AI event consumer da noaniq metadata format topildi.",
    "External platform response kodi kutilmagan qiymat qaytardi.",
  ],
  payment: [
    "To'lovni tekshirish jarayoni ishga tushirildi.",
    "To'lov rad etish sababi metadata ga saqlandi.",
    "Payment gateway webhook asosida status yangilandi.",
    "Tranzaksiya reconciliation navbatiga qo'shildi.",
  ],
  system: [
    "System sync vazifasi muvaffaqiyatli yakunlandi.",
    "Operator sessiya holatini qo'lda o'zgartirdi.",
    "Konfiguratsiya yangilanishi service cache ga push qilindi.",
    "Background worker batch jarayoni tozalash bilan tugadi.",
  ],
};

const appLogs: AppLog[] = Array.from({ length: 42 }, (_, index) => {
  const type = logTypeRotation[index % logTypeRotation.length]!;
  const messageSet = logMessagesByType[type];
  const message = messageSet[index % messageSet.length]!;
  const created_at = hoursAgo(1 + index * 3);

  const metadata: Record<string, unknown> =
    type === 'ai'
      ? {
          session_id: `conversation-${(index % 24) + 1}`,
          model: index % 2 === 0 ? 'gpt-4.1-mini' : 'gpt-4.1',
          temperature: index % 2 === 0 ? 0.35 : 0.48,
          confidence: Number((0.68 + (index % 6) * 0.04).toFixed(2)),
          operator_handoff: index % 5 === 0,
        }
      : type === 'webhook'
        ? {
            provider: index % 2 === 0 ? 'telegram' : 'instagram',
            external_id: index % 2 === 0 ? `tg-${86000 + index}` : `ig-${54000 + index}`,
            signature_verified: index % 4 !== 0,
            processing_ms: 110 + (index % 9) * 14,
          }
        : type === 'error'
          ? {
              component: index % 2 === 0 ? 'webhook-consumer' : 'payment-worker',
              severity: index % 3 === 0 ? 'high' : 'medium',
              retryable: index % 2 === 0,
              trace_id: `trace-${(1000 + index).toString(16)}`,
              error_code: index % 2 === 0 ? 'E_TIMEOUT' : 'E_PARSE',
            }
          : type === 'payment'
            ? {
                payment_id: `payment-${(index % 36) + 1}`,
                order_id: `order-${(index % 28) + 1}`,
                amount: 120000 + (index % 10) * 17500,
                method: index % 2 === 0 ? 'payme' : 'click',
                status: index % 3 === 0 ? 'pending' : 'verified',
              }
            : {
                actor: index % 2 === 0 ? 'system-cron' : 'admin-user',
                module: index % 2 === 0 ? 'sync' : 'settings',
                duration_ms: 180 + (index % 8) * 21,
                release_tag: `v1.${(index % 12) + 2}.0`,
              };

  return {
    id: `log-${index + 1}`,
    type,
    message,
    metadata,
    created_at,
  };
});

conversations.forEach((conversation, index) => {
  const messages = generateMockChatMessages(conversation.id, 8 + (index % 6));
  messagesByConversationId.set(conversation.id, messages);

  const lastMessage = messages[messages.length - 1] ?? null;
  if (!lastMessage) {
    return;
  }

  conversation.last_message = lastMessage.content;
  conversation.last_message_at = lastMessage.created_at;
  conversation.updated_at = lastMessage.updated_at;
});
let dashboardScenarioCursor = 0;

export const mockDataStore = {
  users,
  managedUsers,
  permissionCatalog,
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
  aiSettings,
  integrationEvents,
  integrationConfigs,
  appLogs,
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
