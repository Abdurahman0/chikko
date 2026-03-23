import type {
  AppNotification,
  AppUser,
  ChatMessage,
  Conversation,
  Customer,
  EntityId,
  Lead,
  Order,
  OrderMutationInput,
  OrderPatchInput,
  PaginatedResult,
  Payment,
  Product,
  ProductMutationInput,
  TableQueryParams,
} from '../../types/domain';

export type ServiceModuleKey =
  | 'dashboard'
  | 'leads'
  | 'customers'
  | 'products'
  | 'orders'
  | 'payments'
  | 'conversations'
  | 'notifications'
  | 'profile';

export interface DashboardDateRange {
  date_from: string;
  date_to: string;
  interval: string;
  label_format: string;
  timezone: string;
}

export interface DashboardBreakdownItem {
  key: string;
  label: string;
  count: number;
}

export interface DashboardTopProduct {
  key: string;
  label: string;
  count: number;
  revenue?: string;
}

export interface DashboardFilteredSummary {
  leads: number;
  new_leads: number;
  converted_leads: number;
  customers: number;
  new_customers: number;
  orders: number;
  draft_orders: number;
  waiting_payment_orders: number;
  pending_orders: number;
  completed_orders: number;
  paid_orders: number;
  cancelled_orders: number;
  total_payments: number;
  pending_payments: number;
  approved_payments: number;
  verified_payments: number;
  unread_messages: number;
  total_chat_sessions: number;
  active_chat_sessions: number;
  revenue: string;
  collected_amount: string;
  pending_payment_amount: string;
  average_order_value: string;
  lead_conversion_rate: string;
  order_completion_rate: string;
}

export interface DashboardBreakdowns {
  leads_by_status: DashboardBreakdownItem[];
  leads_by_source: DashboardBreakdownItem[];
  orders_by_status: DashboardBreakdownItem[];
  orders_by_source: DashboardBreakdownItem[];
  payments_by_status: DashboardBreakdownItem[];
  payments_by_method: DashboardBreakdownItem[];
  chats_by_channel: DashboardBreakdownItem[];
  top_products: DashboardTopProduct[];
}

export interface DashboardTimeSeriesPoint {
  bucket_start: string;
  bucket_end: string;
  label: string;
  leads: number;
  customers: number;
  orders: number;
  completed_orders: number;
  payments: number;
  unread_messages: number;
  revenue: string;
  collected_amount: string;
}

export interface DashboardOverview {
  leads: number;
  customers: number;
  orders: number;
  pending_payments: number;
  unread_messages: number;
  revenue: string;
  date_range: DashboardDateRange;
  filtered_summary: DashboardFilteredSummary;
  breakdowns: DashboardBreakdowns;
  time_series: DashboardTimeSeriesPoint[];
}

export interface DashboardService {
  getOverview(): Promise<DashboardOverview>;
}

export interface LeadService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Lead>>;
  getById(id: EntityId): Promise<Lead | null>;
}

export interface CustomerService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Customer>>;
  getById(id: EntityId): Promise<Customer | null>;
}

export interface ProductService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Product>>;
  getById(id: EntityId): Promise<Product | null>;
  create(input: ProductMutationInput): Promise<Product>;
  update(id: EntityId, input: ProductMutationInput): Promise<Product | null>;
  delete(id: EntityId): Promise<boolean>;
}

export interface OrderService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Order>>;
  getById(id: EntityId): Promise<Order | null>;
  create(input: OrderMutationInput): Promise<Order>;
  update(id: EntityId, input: OrderMutationInput): Promise<Order | null>;
  patch(id: EntityId, input: OrderPatchInput): Promise<Order | null>;
  delete(id: EntityId): Promise<boolean>;
  recalculate(id: EntityId): Promise<Order | null>;
}

export interface PaymentService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Payment>>;
  getById(id: EntityId): Promise<Payment | null>;
}

export interface ConversationService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Conversation>>;
  getById(id: EntityId): Promise<Conversation | null>;
  listMessages(conversationId: EntityId): Promise<ChatMessage[]>;
}

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  markAsRead(id: EntityId): Promise<void>;
}

export interface ProfileService {
  getCurrentUser(): Promise<AppUser | null>;
}

export interface AppServices {
  dashboard: DashboardService;
  leads: LeadService;
  customers: CustomerService;
  products: ProductService;
  orders: OrderService;
  payments: PaymentService;
  conversations: ConversationService;
  notifications: NotificationService;
  profile: ProfileService;
}
