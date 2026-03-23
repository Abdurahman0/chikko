import type {
  DashboardBreakdownItem,
  DashboardOverview,
  DashboardTimeSeriesPoint,
} from '../../services';

type SeriesProfile = 'quiet' | 'growth' | 'volatile' | 'enterprise';

interface BreakdownDefinition {
  key: string;
  label: string;
}

interface DashboardScenarioSeed {
  id: string;
  timezone: string;
  profile: SeriesProfile;
  leads: number;
  customers: number;
  orders: number;
  pendingPayments: number;
  unreadMessages: number;
  revenue: number;
  collectedAmount: number;
  pendingPaymentAmount: number;
  newLeads: number;
  convertedLeads: number;
  newCustomers: number;
  draftOrders: number;
  waitingPaymentOrders: number;
  pendingOrders: number;
  completedOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  totalPayments: number;
  approvedPayments: number;
  verifiedPayments: number;
  totalChatSessions: number;
  activeChatSessions: number;
  leadsByStatus: number[];
  leadsBySource: number[];
  ordersByStatus: number[];
  ordersBySource: number[];
  paymentsByStatus: number[];
  paymentsByMethod: number[];
  chatsByChannel: number[];
  topProducts: Array<{
    key: string;
    label: string;
    count: number;
    revenue: number;
  }>;
}

interface GenerateMockDashboardOverviewOptions {
  scenarioIndex?: number;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const LEAD_STATUS_DEFS: BreakdownDefinition[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
];

const SOURCE_DEFS: BreakdownDefinition[] = [
  { key: 'telegram', label: 'Telegram' },
  { key: 'instagram', label: 'Instagram' },
];

const ORDER_STATUS_DEFS: BreakdownDefinition[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'waiting_payment', label: 'Waiting Payment' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'paid', label: 'Paid' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_DEFS: BreakdownDefinition[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'verified', label: 'Verified' },
  { key: 'failed', label: 'Failed' },
];

const PAYMENT_METHOD_DEFS: BreakdownDefinition[] = [
  { key: 'manual', label: 'Manual' },
  { key: 'payme', label: 'Payme' },
  { key: 'click', label: 'Click' },
];

const CHAT_CHANNEL_DEFS: BreakdownDefinition[] = [
  { key: 'telegram', label: 'Telegram' },
  { key: 'instagram', label: 'Instagram' },
];

const DASHBOARD_SCENARIO_SEEDS: DashboardScenarioSeed[] = [
  {
    id: 'quiet-launch',
    timezone: 'Asia/Tashkent',
    profile: 'quiet',
    leads: 10,
    customers: 5,
    orders: 0,
    pendingPayments: 0,
    unreadMessages: 0,
    revenue: 0,
    collectedAmount: 0,
    pendingPaymentAmount: 0,
    newLeads: 5,
    convertedLeads: 0,
    newCustomers: 5,
    draftOrders: 0,
    waitingPaymentOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    paidOrders: 0,
    cancelledOrders: 0,
    totalPayments: 0,
    approvedPayments: 0,
    verifiedPayments: 0,
    totalChatSessions: 0,
    activeChatSessions: 0,
    leadsByStatus: [5, 5, 0, 0, 0, 0],
    leadsBySource: [5, 5],
    ordersByStatus: [0, 0, 0, 0, 0, 0, 0],
    ordersBySource: [0, 0],
    paymentsByStatus: [0, 0, 0, 0, 0],
    paymentsByMethod: [0, 0, 0],
    chatsByChannel: [0, 0],
    topProducts: [],
  },
  {
    id: 'growth-campaign',
    timezone: 'Asia/Tashkent',
    profile: 'growth',
    leads: 148,
    customers: 72,
    orders: 64,
    pendingPayments: 18,
    unreadMessages: 24,
    revenue: 28450,
    collectedAmount: 23110,
    pendingPaymentAmount: 5340,
    newLeads: 42,
    convertedLeads: 28,
    newCustomers: 24,
    draftOrders: 8,
    waitingPaymentOrders: 10,
    pendingOrders: 28,
    completedOrders: 7,
    paidOrders: 9,
    cancelledOrders: 2,
    totalPayments: 60,
    approvedPayments: 20,
    verifiedPayments: 12,
    totalChatSessions: 92,
    activeChatSessions: 26,
    leadsByStatus: [36, 31, 23, 18, 26, 14],
    leadsBySource: [84, 64],
    ordersByStatus: [8, 10, 16, 12, 9, 7, 2],
    ordersBySource: [36, 28],
    paymentsByStatus: [18, 20, 6, 12, 4],
    paymentsByMethod: [18, 24, 18],
    chatsByChannel: [55, 37],
    topProducts: [
      { key: 'pr-hoodie', label: 'Street Hoodie', count: 22, revenue: 4840 },
      { key: 'pr-bag', label: 'Canvas Bag', count: 18, revenue: 2610 },
      { key: 'pr-bottle', label: 'Sport Bottle', count: 15, revenue: 1835 },
    ],
  },
  {
    id: 'support-heavy',
    timezone: 'Asia/Tashkent',
    profile: 'volatile',
    leads: 94,
    customers: 40,
    orders: 28,
    pendingPayments: 12,
    unreadMessages: 67,
    revenue: 11240,
    collectedAmount: 7420,
    pendingPaymentAmount: 3820,
    newLeads: 29,
    convertedLeads: 12,
    newCustomers: 16,
    draftOrders: 6,
    waitingPaymentOrders: 6,
    pendingOrders: 10,
    completedOrders: 3,
    paidOrders: 2,
    cancelledOrders: 1,
    totalPayments: 26,
    approvedPayments: 8,
    verifiedPayments: 4,
    totalChatSessions: 148,
    activeChatSessions: 54,
    leadsByStatus: [22, 24, 18, 10, 12, 8],
    leadsBySource: [55, 39],
    ordersByStatus: [6, 6, 8, 3, 2, 2, 1],
    ordersBySource: [17, 11],
    paymentsByStatus: [12, 8, 2, 3, 1],
    paymentsByMethod: [11, 7, 8],
    chatsByChannel: [86, 62],
    topProducts: [
      { key: 'pr-sticker', label: 'Sticker Pack', count: 28, revenue: 700 },
      { key: 'pr-case', label: 'Phone Case', count: 13, revenue: 1430 },
      { key: 'pr-cap', label: 'Logo Cap', count: 9, revenue: 990 },
    ],
  },
  {
    id: 'enterprise-peak',
    timezone: 'Asia/Tashkent',
    profile: 'enterprise',
    leads: 286,
    customers: 138,
    orders: 124,
    pendingPayments: 31,
    unreadMessages: 19,
    revenue: 74860,
    collectedAmount: 66320,
    pendingPaymentAmount: 8540,
    newLeads: 88,
    convertedLeads: 56,
    newCustomers: 43,
    draftOrders: 14,
    waitingPaymentOrders: 16,
    pendingOrders: 42,
    completedOrders: 20,
    paidOrders: 26,
    cancelledOrders: 6,
    totalPayments: 120,
    approvedPayments: 54,
    verifiedPayments: 33,
    totalChatSessions: 176,
    activeChatSessions: 38,
    leadsByStatus: [44, 61, 56, 42, 56, 27],
    leadsBySource: [156, 130],
    ordersByStatus: [14, 16, 32, 20, 26, 10, 6],
    ordersBySource: [67, 57],
    paymentsByStatus: [31, 54, 12, 33, 10],
    paymentsByMethod: [40, 52, 28],
    chatsByChannel: [98, 78],
    topProducts: [
      { key: 'pr-jacket', label: 'Tech Jacket', count: 36, revenue: 12600 },
      { key: 'pr-backpack', label: 'Pro Backpack', count: 28, revenue: 8120 },
      { key: 'pr-sneaker', label: 'Running Sneaker', count: 24, revenue: 10440 },
      { key: 'pr-watch', label: 'Smart Watch', count: 18, revenue: 9360 },
    ],
  },
];

export const DASHBOARD_MOCK_SCENARIO_COUNT = DASHBOARD_SCENARIO_SEEDS.length;

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  const mod = index % length;
  return mod >= 0 ? mod : mod + length;
}

function pseudoNoise(index: number, seed: number): number {
  const value = Math.sin((index + 1) * (seed + 17) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function buildWeights(
  length: number,
  profile: SeriesProfile,
  seedOffset: number,
): number[] {
  return Array.from({ length }, (_, index) => {
    const ratio = index / Math.max(1, length - 1);
    const wave = Math.sin((index / 7) * Math.PI * 2);
    const noise = pseudoNoise(index, seedOffset);

    if (profile === 'quiet') {
      const lateBoost = index >= length - 3 ? 2.7 : index >= length - 7 ? 0.8 : 0.22;
      return 0.08 + lateBoost + (noise * 0.08);
    }

    if (profile === 'growth') {
      return 0.5 + (ratio * 1.45) + (wave * 0.12) + (noise * 0.15);
    }

    if (profile === 'volatile') {
      return 0.45 + Math.abs(Math.sin((index + seedOffset) * 0.85)) + (noise * 0.25);
    }

    const enterprisePulse = index % 7 === 0 ? 0.55 : 0;
    return 0.9 + (ratio * 0.8) + enterprisePulse + (wave * 0.18) + (noise * 0.12);
  }).map((weight) => Math.max(0.05, weight));
}

function distributeIntegerTotal(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (weight / weightSum) * total);
  const base = raw.map((value) => Math.floor(value));
  let remainder = total - base.reduce((sum, value) => sum + value, 0);

  const remainderIndexes = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let pointer = 0;
  while (remainder > 0 && remainderIndexes.length > 0) {
    const target = remainderIndexes[pointer % remainderIndexes.length];
    base[target.index] += 1;
    remainder -= 1;
    pointer += 1;
  }

  return base;
}

function distributeMoneyTotal(total: number, weights: number[]): number[] {
  const cents = Math.round(total * 100);
  return distributeIntegerTotal(cents, weights).map((value) => value / 100);
}

function fitCounts(total: number, desiredCounts: number[], size: number): number[] {
  const normalized = Array.from({ length: size }, (_, index) =>
    Math.max(0, desiredCounts[index] ?? 0),
  );
  const desiredSum = normalized.reduce((sum, value) => sum + value, 0);

  if (total <= 0 || desiredSum <= 0) {
    return normalized.map(() => 0);
  }

  return distributeIntegerTotal(total, normalized);
}

function createBreakdown(
  defs: BreakdownDefinition[],
  total: number,
  desiredCounts: number[],
): DashboardBreakdownItem[] {
  const counts = fitCounts(total, desiredCounts, defs.length);
  return defs.map((definition, index) => ({
    key: definition.key,
    label: definition.label,
    count: counts[index] ?? 0,
  }));
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function createDateWindows(days: number) {
  const now = new Date();
  const dateTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dateFrom = new Date(dateTo.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const dates = Array.from({ length: days }, (_, index) => (
    new Date(dateFrom.getTime() + index * 24 * 60 * 60 * 1000)
  ));

  return { dateFrom, dateTo, dates };
}

function createTimeSeries(
  seed: DashboardScenarioSeed,
  dates: Date[],
): DashboardTimeSeriesPoint[] {
  const count = dates.length;
  const leadsByDay = distributeIntegerTotal(
    seed.leads,
    buildWeights(count, seed.profile, 11),
  );
  const customersByDay = distributeIntegerTotal(
    seed.customers,
    buildWeights(count, seed.profile, 19),
  );
  const ordersByDay = distributeIntegerTotal(
    seed.orders,
    buildWeights(count, seed.profile, 23),
  );
  const completedByDay = distributeIntegerTotal(
    seed.completedOrders,
    buildWeights(count, seed.profile, 29),
  );
  const paymentsByDay = distributeIntegerTotal(
    seed.totalPayments,
    buildWeights(count, seed.profile, 31),
  );
  const unreadByDay = distributeIntegerTotal(
    seed.unreadMessages,
    buildWeights(count, seed.profile, 37),
  );
  const revenueByDay = distributeMoneyTotal(
    seed.revenue,
    buildWeights(count, seed.profile, 41),
  );
  const collectedByDay = distributeMoneyTotal(
    seed.collectedAmount,
    buildWeights(count, seed.profile, 43),
  );

  return dates.map((date, index) => ({
    bucket_start: toIsoDate(date),
    bucket_end: toIsoDate(date),
    label: toLabel(date),
    leads: leadsByDay[index] ?? 0,
    customers: customersByDay[index] ?? 0,
    orders: ordersByDay[index] ?? 0,
    completed_orders: completedByDay[index] ?? 0,
    payments: paymentsByDay[index] ?? 0,
    unread_messages: unreadByDay[index] ?? 0,
    revenue: formatMoney(revenueByDay[index] ?? 0),
    collected_amount: formatMoney(collectedByDay[index] ?? 0),
  }));
}

function createOverviewFromSeed(seed: DashboardScenarioSeed): DashboardOverview {
  const { dateFrom, dateTo, dates } = createDateWindows(30);
  const averageOrderValue = seed.orders > 0 ? seed.revenue / seed.orders : 0;
  const leadConversionRate = seed.leads > 0 ? (seed.convertedLeads / seed.leads) * 100 : 0;
  const orderCompletionRate = seed.orders > 0 ? (seed.completedOrders / seed.orders) * 100 : 0;

  return {
    leads: seed.leads,
    customers: seed.customers,
    orders: seed.orders,
    pending_payments: seed.pendingPayments,
    unread_messages: seed.unreadMessages,
    revenue: formatMoney(seed.revenue),
    date_range: {
      date_from: toIsoDate(dateFrom),
      date_to: toIsoDate(dateTo),
      interval: 'day',
      label_format: 'DD MMM',
      timezone: seed.timezone,
    },
    filtered_summary: {
      leads: seed.leads,
      new_leads: seed.newLeads,
      converted_leads: seed.convertedLeads,
      customers: seed.customers,
      new_customers: seed.newCustomers,
      orders: seed.orders,
      draft_orders: seed.draftOrders,
      waiting_payment_orders: seed.waitingPaymentOrders,
      pending_orders: seed.pendingOrders,
      completed_orders: seed.completedOrders,
      paid_orders: seed.paidOrders,
      cancelled_orders: seed.cancelledOrders,
      total_payments: seed.totalPayments,
      pending_payments: seed.pendingPayments,
      approved_payments: seed.approvedPayments,
      verified_payments: seed.verifiedPayments,
      unread_messages: seed.unreadMessages,
      total_chat_sessions: seed.totalChatSessions,
      active_chat_sessions: seed.activeChatSessions,
      revenue: formatMoney(seed.revenue),
      collected_amount: formatMoney(seed.collectedAmount),
      pending_payment_amount: formatMoney(seed.pendingPaymentAmount),
      average_order_value: formatMoney(averageOrderValue),
      lead_conversion_rate: leadConversionRate.toFixed(2),
      order_completion_rate: orderCompletionRate.toFixed(2),
    },
    breakdowns: {
      leads_by_status: createBreakdown(
        LEAD_STATUS_DEFS,
        seed.leads,
        seed.leadsByStatus,
      ),
      leads_by_source: createBreakdown(SOURCE_DEFS, seed.leads, seed.leadsBySource),
      orders_by_status: createBreakdown(
        ORDER_STATUS_DEFS,
        seed.orders,
        seed.ordersByStatus,
      ),
      orders_by_source: createBreakdown(
        SOURCE_DEFS,
        seed.orders,
        seed.ordersBySource,
      ),
      payments_by_status: createBreakdown(
        PAYMENT_STATUS_DEFS,
        seed.totalPayments,
        seed.paymentsByStatus,
      ),
      payments_by_method: createBreakdown(
        PAYMENT_METHOD_DEFS,
        seed.totalPayments,
        seed.paymentsByMethod,
      ),
      chats_by_channel: createBreakdown(
        CHAT_CHANNEL_DEFS,
        seed.totalChatSessions,
        seed.chatsByChannel,
      ),
      top_products: seed.topProducts.map((item) => ({
        key: item.key,
        label: item.label,
        count: item.count,
        revenue: formatMoney(item.revenue),
      })),
    },
    time_series: createTimeSeries(seed, dates),
  };
}

export function generateMockDashboardOverview(
  options?: GenerateMockDashboardOverviewOptions,
): DashboardOverview {
  const index = clampIndex(options?.scenarioIndex ?? 0, DASHBOARD_SCENARIO_SEEDS.length);
  return createOverviewFromSeed(DASHBOARD_SCENARIO_SEEDS[index]!);
}
