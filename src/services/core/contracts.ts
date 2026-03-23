import type {
  AppNotification,
  AppUser,
  ChatMessage,
  Conversation,
  CurrencyCode,
  Customer,
  EntityId,
  Lead,
  Order,
  PaginatedResult,
  Payment,
  Product,
  TableQueryParams,
  TimestampString,
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

export interface DashboardOverview {
  totalLeads: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  currency: CurrencyCode;
  unreadNotifications: number;
  updatedAt?: TimestampString;
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
}

export interface OrderService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Order>>;
  getById(id: EntityId): Promise<Order | null>;
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
