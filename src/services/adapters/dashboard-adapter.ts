import type {
  DashboardBreakdownItem,
  DashboardOverview,
  DashboardTopProduct,
  DashboardTimeSeriesPoint,
} from '../core/contracts';

export type DashboardOverviewDto = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function readDecimalString(value: unknown): string {
  const raw = readString(value, '0');
  return raw.length > 0 ? raw : '0';
}

function readCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapBreakdownItems(value: unknown): DashboardBreakdownItem[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};
    const key = readString(itemRecord.key) || `item-${index}`;

    return {
      key,
      label: readString(itemRecord.label) || key,
      count: readCount(itemRecord.count),
    };
  });
}

function mapTopProducts(value: unknown): DashboardTopProduct[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};
    const key = readString(itemRecord.key) || `product-${index}`;

    return {
      key,
      label: readString(itemRecord.label) || key,
      count: readCount(itemRecord.count),
      revenue: readDecimalString(itemRecord.revenue),
    };
  });
}

function mapTimeSeries(value: unknown): DashboardTimeSeriesPoint[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};

    return {
      bucket_start: readString(itemRecord.bucket_start) || `bucket-${index}`,
      bucket_end: readString(itemRecord.bucket_end),
      label: readString(itemRecord.label),
      leads: readCount(itemRecord.leads),
      customers: readCount(itemRecord.customers),
      orders: readCount(itemRecord.orders),
      completed_orders: readCount(itemRecord.completed_orders),
      payments: readCount(itemRecord.payments),
      unread_messages: readCount(itemRecord.unread_messages),
      revenue: readDecimalString(itemRecord.revenue),
      collected_amount: readDecimalString(itemRecord.collected_amount),
    };
  });
}

export function mapDashboardOverviewDtoToModel(
  dto: DashboardOverviewDto,
): DashboardOverview {
  const dateRange = toRecord(dto.date_range) ?? {};
  const filteredSummary = toRecord(dto.filtered_summary) ?? {};
  const breakdowns = toRecord(dto.breakdowns) ?? {};

  return {
    leads: readCount(dto.leads),
    customers: readCount(dto.customers),
    orders: readCount(dto.orders),
    pending_payments: readCount(dto.pending_payments),
    unread_messages: readCount(dto.unread_messages),
    revenue: readDecimalString(dto.revenue),
    date_range: {
      date_from: readString(dateRange.date_from),
      date_to: readString(dateRange.date_to),
      interval: readString(dateRange.interval, 'day'),
      label_format: readString(dateRange.label_format),
      timezone: readString(dateRange.timezone),
    },
    filtered_summary: {
      leads: readCount(filteredSummary.leads),
      new_leads: readCount(filteredSummary.new_leads),
      converted_leads: readCount(filteredSummary.converted_leads),
      customers: readCount(filteredSummary.customers),
      new_customers: readCount(filteredSummary.new_customers),
      orders: readCount(filteredSummary.orders),
      draft_orders: readCount(filteredSummary.draft_orders),
      waiting_payment_orders: readCount(filteredSummary.waiting_payment_orders),
      pending_orders: readCount(filteredSummary.pending_orders),
      completed_orders: readCount(filteredSummary.completed_orders),
      paid_orders: readCount(filteredSummary.paid_orders),
      cancelled_orders: readCount(filteredSummary.cancelled_orders),
      total_payments: readCount(filteredSummary.total_payments),
      pending_payments: readCount(filteredSummary.pending_payments),
      approved_payments: readCount(filteredSummary.approved_payments),
      verified_payments: readCount(filteredSummary.verified_payments),
      unread_messages: readCount(filteredSummary.unread_messages),
      total_chat_sessions: readCount(filteredSummary.total_chat_sessions),
      active_chat_sessions: readCount(filteredSummary.active_chat_sessions),
      revenue: readDecimalString(filteredSummary.revenue),
      collected_amount: readDecimalString(filteredSummary.collected_amount),
      pending_payment_amount: readDecimalString(filteredSummary.pending_payment_amount),
      average_order_value: readDecimalString(filteredSummary.average_order_value),
      lead_conversion_rate: readDecimalString(filteredSummary.lead_conversion_rate),
      order_completion_rate: readDecimalString(filteredSummary.order_completion_rate),
    },
    breakdowns: {
      leads_by_status: mapBreakdownItems(breakdowns.leads_by_status),
      leads_by_source: mapBreakdownItems(breakdowns.leads_by_source),
      orders_by_status: mapBreakdownItems(breakdowns.orders_by_status),
      orders_by_source: mapBreakdownItems(breakdowns.orders_by_source),
      payments_by_status: mapBreakdownItems(breakdowns.payments_by_status),
      payments_by_method: mapBreakdownItems(breakdowns.payments_by_method),
      chats_by_channel: mapBreakdownItems(breakdowns.chats_by_channel),
      top_products: mapTopProducts(breakdowns.top_products),
    },
    time_series: mapTimeSeries(dto.time_series),
  };
}
