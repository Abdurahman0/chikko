import type {
  Agent,
  AgentListParams,
  AgentMutationInput,
  AgentPatchInput,
  AISetting,
  AISettingMutationInput,
  AISettingPatchInput,
  AISettingsListParams,
  Courier,
  CourierListParams,
  CourierMutationInput,
  CourierOrder,
  CourierOrderListParams,
  CourierOrderMutationInput,
  CourierOrderPatchInput,
  CourierPatchInput,
  IntegrationConfig,
  IntegrationConfigListParams,
  IntegrationConfigMutationInput,
  IntegrationConfigPatchInput,
  IntegrationEvent,
  IntegrationEventListParams,
  AppLog,
  AppNotification,
  AppUser,
  ChatMessage,
  Conversation,
  Customer,
  CustomerMutationInput,
  CustomerPatchInput,
  EntityId,
  Lead,
  LeadMutationInput,
  LeadPatchInput,
  MessageListParams,
  NotificationListParams,
  Order,
  OrderMutationInput,
  OrderPatchInput,
  OrderReview,
  OrderReviewListParams,
  OrderReviewMutationInput,
  OrderReviewPatchInput,
  PaginatedResult,
  Payment,
  PaymentListParams,
  PaymentMutationInput,
  PaymentUpdateInput,
  Product,
  ProductCategory,
  ProductCategoryListParams,
  ProductCategoryMutationInput,
  ProductCategoryPatchInput,
  ProductBrand,
  ProductBrandListParams,
  ProductBrandMutationInput,
  ProductBrandPatchInput,
  ProductPatchInput,
  ProductMutationInput,
  SendMessageInput,
  SessionListParams,
  TableQueryParams,
  ManagedUser,
  LogCleanupSettingsPatchInput,
  LogListParams,
  SystemHealth,
  UserListParams,
  UserMutationInput,
  UserPatchInput,
  UserPermission,
} from '../../types/domain';

export type ServiceModuleKey =
  | 'dashboard'
  | 'agents'
  | 'couriers'
  | 'leads'
  | 'customers'
  | 'products'
  | 'orders'
  | 'payments'
  | 'conversations'
  | 'notifications'
  | 'integrations'
  | 'logs'
  | 'aiSettings'
  | 'profile'
  | 'users';

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
  product_id?: string;
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

export type DashboardInterval = 'day' | 'week' | 'month';

export interface DashboardOverviewParams {
  date_from?: string;
  date_to?: string;
  interval?: DashboardInterval;
}

export interface DashboardService {
  getOverview(params?: DashboardOverviewParams): Promise<DashboardOverview>;
}

export interface LeadService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Lead>>;
  getById(id: EntityId): Promise<Lead | null>;
  listLeads(params?: TableQueryParams): Promise<PaginatedResult<Lead>>;
  getLeadById(id: EntityId): Promise<Lead | null>;
  create(input: LeadMutationInput): Promise<Lead>;
  createLead(input: LeadMutationInput): Promise<Lead>;
  update(id: EntityId, input: LeadMutationInput): Promise<Lead | null>;
  updateLead(id: EntityId, input: LeadMutationInput): Promise<Lead | null>;
  patch(id: EntityId, input: LeadPatchInput): Promise<Lead | null>;
  patchLead(id: EntityId, input: LeadPatchInput): Promise<Lead | null>;
  delete(id: EntityId): Promise<boolean>;
  deleteLead(id: EntityId): Promise<boolean>;
}

export interface CourierService {
  list(params?: CourierListParams): Promise<PaginatedResult<Courier>>;
  getById(id: EntityId): Promise<Courier | null>;
  create(input: CourierMutationInput): Promise<Courier>;
  update(id: EntityId, input: CourierMutationInput): Promise<Courier | null>;
  patch(id: EntityId, input: CourierPatchInput): Promise<Courier | null>;
  delete(id: EntityId): Promise<boolean>;
  listOrders(params?: CourierOrderListParams): Promise<PaginatedResult<CourierOrder>>;
  getOrderById(id: EntityId): Promise<CourierOrder | null>;
  updateOrder(
    id: EntityId,
    input: CourierOrderMutationInput,
  ): Promise<CourierOrder | null>;
  patchOrder(
    id: EntityId,
    input: CourierOrderPatchInput,
  ): Promise<CourierOrder | null>;
  repostOrder(
    id: EntityId,
    input?: CourierOrderPatchInput,
  ): Promise<CourierOrder | null>;
  listCouriers(params?: CourierListParams): Promise<PaginatedResult<Courier>>;
  getCourierById(id: EntityId): Promise<Courier | null>;
  createCourier(input: CourierMutationInput): Promise<Courier>;
  updateCourier(id: EntityId, input: CourierMutationInput): Promise<Courier | null>;
  patchCourier(id: EntityId, input: CourierPatchInput): Promise<Courier | null>;
  deleteCourier(id: EntityId): Promise<boolean>;
  listCourierOrders(
    params?: CourierOrderListParams,
  ): Promise<PaginatedResult<CourierOrder>>;
  getCourierOrderById(id: EntityId): Promise<CourierOrder | null>;
  updateCourierOrder(
    id: EntityId,
    input: CourierOrderMutationInput,
  ): Promise<CourierOrder | null>;
  patchCourierOrder(
    id: EntityId,
    input: CourierOrderPatchInput,
  ): Promise<CourierOrder | null>;
  repostCourierOrder(
    id: EntityId,
    input?: CourierOrderPatchInput,
  ): Promise<CourierOrder | null>;
}

export interface AgentService {
  list(params?: AgentListParams): Promise<PaginatedResult<Agent>>;
  getById(id: EntityId): Promise<Agent | null>;
  create(input: AgentMutationInput): Promise<Agent>;
  update(id: EntityId, input: AgentMutationInput): Promise<Agent | null>;
  patch(id: EntityId, input: AgentPatchInput): Promise<Agent | null>;
  delete(id: EntityId): Promise<boolean>;
  listAgents(params?: AgentListParams): Promise<PaginatedResult<Agent>>;
  getAgentById(id: EntityId): Promise<Agent | null>;
  createAgent(input: AgentMutationInput): Promise<Agent>;
  updateAgent(id: EntityId, input: AgentMutationInput): Promise<Agent | null>;
  patchAgent(id: EntityId, input: AgentPatchInput): Promise<Agent | null>;
  deleteAgent(id: EntityId): Promise<boolean>;
}

export interface CustomerService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Customer>>;
  getById(id: EntityId): Promise<Customer | null>;
  listCustomers(params?: TableQueryParams): Promise<PaginatedResult<Customer>>;
  getCustomerById(id: EntityId): Promise<Customer | null>;
  createCustomer(input: CustomerMutationInput): Promise<Customer>;
  updateCustomer(
    id: EntityId,
    input: CustomerMutationInput,
  ): Promise<Customer | null>;
  patchCustomer(id: EntityId, input: CustomerPatchInput): Promise<Customer | null>;
  deleteCustomer(id: EntityId): Promise<boolean>;
}

export interface ProductService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Product>>;
  getById(id: EntityId): Promise<Product | null>;
  listProducts(params?: TableQueryParams): Promise<PaginatedResult<Product>>;
  getProductById(id: EntityId): Promise<Product | null>;
  create(input: ProductMutationInput): Promise<Product>;
  createProduct(input: ProductMutationInput): Promise<Product>;
  update(id: EntityId, input: ProductMutationInput): Promise<Product | null>;
  updateProduct(id: EntityId, input: ProductMutationInput): Promise<Product | null>;
  patch(id: EntityId, input: ProductPatchInput): Promise<Product | null>;
  patchProduct(id: EntityId, input: ProductPatchInput): Promise<Product | null>;
  delete(id: EntityId): Promise<boolean>;
  deleteProduct(id: EntityId): Promise<boolean>;
  listProductCategories(
    params?: ProductCategoryListParams,
  ): Promise<PaginatedResult<ProductCategory>>;
  getProductCategoryById(id: EntityId): Promise<ProductCategory | null>;
  createProductCategory(input: ProductCategoryMutationInput): Promise<ProductCategory>;
  updateProductCategory(
    id: EntityId,
    input: ProductCategoryMutationInput,
  ): Promise<ProductCategory | null>;
  patchProductCategory(
    id: EntityId,
    input: ProductCategoryPatchInput,
  ): Promise<ProductCategory | null>;
  deleteProductCategory(id: EntityId): Promise<boolean>;
  listProductBrands(
    params?: ProductBrandListParams,
  ): Promise<PaginatedResult<ProductBrand>>;
  getProductBrandById(id: EntityId): Promise<ProductBrand | null>;
  createProductBrand(input: ProductBrandMutationInput): Promise<ProductBrand>;
  updateProductBrand(
    id: EntityId,
    input: ProductBrandMutationInput,
  ): Promise<ProductBrand | null>;
  patchProductBrand(
    id: EntityId,
    input: ProductBrandPatchInput,
  ): Promise<ProductBrand | null>;
  deleteProductBrand(id: EntityId): Promise<boolean>;
  uploadProductImages(productId: EntityId, payload: FormData | File[]): Promise<Product | null>;
  deleteProductImage(productId: EntityId, imageId: EntityId): Promise<boolean>;
}

export interface OrderService {
  list(params?: TableQueryParams): Promise<PaginatedResult<Order>>;
  getById(id: EntityId): Promise<Order | null>;
  create(input: OrderMutationInput): Promise<Order>;
  update(id: EntityId, input: OrderMutationInput): Promise<Order | null>;
  patch(id: EntityId, input: OrderPatchInput): Promise<Order | null>;
  delete(id: EntityId): Promise<boolean>;
  recalculate(
    id: EntityId,
    input?: OrderMutationInput | OrderPatchInput,
  ): Promise<Order | null>;
  listOrderReviews(
    params?: OrderReviewListParams,
  ): Promise<PaginatedResult<OrderReview>>;
  getOrderReviewById(id: EntityId): Promise<OrderReview | null>;
  createOrderReview(input: OrderReviewMutationInput): Promise<OrderReview>;
  updateOrderReview(
    id: EntityId,
    input: OrderReviewMutationInput,
  ): Promise<OrderReview | null>;
  patchOrderReview(
    id: EntityId,
    input: OrderReviewPatchInput,
  ): Promise<OrderReview | null>;
  deleteOrderReview(id: EntityId): Promise<boolean>;
}

export interface PaymentService {
  list(params?: PaymentListParams): Promise<PaginatedResult<Payment>>;
  getById(id: EntityId): Promise<Payment | null>;
  listPayments(params?: PaymentListParams): Promise<PaginatedResult<Payment>>;
  getPaymentById(id: EntityId): Promise<Payment | null>;
  createPayment(input: PaymentMutationInput): Promise<Payment>;
  updatePayment(id: EntityId, input: PaymentUpdateInput): Promise<Payment | null>;
  patchPayment(id: EntityId, input: PaymentUpdateInput): Promise<Payment | null>;
  deletePayment(id: EntityId): Promise<boolean>;
  approvePayment(id: EntityId): Promise<Payment | null>;
  rejectPayment(id: EntityId): Promise<Payment | null>;
  verifyPayment(id: EntityId): Promise<Payment | null>;
}

export interface ConversationService {
  list(params?: SessionListParams): Promise<PaginatedResult<Conversation>>;
  getById(id: EntityId): Promise<Conversation | null>;
  getSessions(params?: SessionListParams): Promise<PaginatedResult<Conversation>>;
  listSessions(params?: SessionListParams): Promise<PaginatedResult<Conversation>>;
  getSessionById(id: EntityId): Promise<Conversation | null>;
  getMessages(params?: MessageListParams): Promise<PaginatedResult<ChatMessage>>;
  listMessages(params?: MessageListParams): Promise<PaginatedResult<ChatMessage>>;
  getMessageById(id: EntityId): Promise<ChatMessage | null>;
  deleteSession(sessionId: EntityId): Promise<boolean>;
  sendMessage(sessionId: EntityId, payload: SendMessageInput): Promise<ChatMessage>;
  markSessionRead(sessionId: EntityId): Promise<Conversation | null>;
  pauseSessionAI(
    sessionId: EntityId,
    pausedUntilIso?: string,
  ): Promise<Conversation | null>;
  resumeSessionAI(sessionId: EntityId): Promise<Conversation | null>;
}

export interface NotificationService {
  list(params?: NotificationListParams): Promise<PaginatedResult<AppNotification>>;
  getById(id: EntityId): Promise<AppNotification | null>;
  listNotifications(params?: NotificationListParams): Promise<PaginatedResult<AppNotification>>;
  getNotificationById(id: EntityId): Promise<AppNotification | null>;
  markAsRead(id: EntityId): Promise<AppNotification | null>;
  markNotificationRead(id: EntityId): Promise<AppNotification | null>;
  markAllRead(): Promise<boolean>;
  deleteAll(): Promise<boolean>;
}

export interface ProfileService {
  getCurrentUser(): Promise<AppUser | null>;
}

export interface AISettingsService {
  list(params?: AISettingsListParams): Promise<PaginatedResult<AISetting>>;
  getById(id: EntityId): Promise<AISetting | null>;
  listAISettings(params?: AISettingsListParams): Promise<PaginatedResult<AISetting>>;
  getAISettingById(id: EntityId): Promise<AISetting | null>;
  createAISetting(input: AISettingMutationInput): Promise<AISetting>;
  updateAISetting(
    id: EntityId,
    input: AISettingMutationInput,
  ): Promise<AISetting | null>;
  patchAISetting(
    id: EntityId,
    input: AISettingPatchInput,
  ): Promise<AISetting | null>;
  deleteAISetting(id: EntityId): Promise<boolean>;
  setActiveAISetting(id: EntityId): Promise<AISetting | null>;
  getActiveAISetting(): Promise<AISetting | null>;
}

export interface IntegrationsService {
  listIntegrationEvents(
    params?: IntegrationEventListParams,
  ): Promise<PaginatedResult<IntegrationEvent>>;
  getIntegrationEventById(id: EntityId): Promise<IntegrationEvent | null>;
  listIntegrationConfigs(
    params?: IntegrationConfigListParams,
  ): Promise<PaginatedResult<IntegrationConfig>>;
  getIntegrationConfigById(id: EntityId): Promise<IntegrationConfig | null>;
  createIntegrationConfig(
    input: IntegrationConfigMutationInput,
  ): Promise<IntegrationConfig>;
  updateIntegrationConfig(
    id: EntityId,
    input: IntegrationConfigMutationInput,
  ): Promise<IntegrationConfig | null>;
  patchIntegrationConfig(
    id: EntityId,
    input: IntegrationConfigPatchInput,
  ): Promise<IntegrationConfig | null>;
  deleteIntegrationConfig(id: EntityId): Promise<boolean>;
}

export interface LogsService {
  getHealth(): Promise<SystemHealth>;
  listLogs(params?: LogListParams): Promise<PaginatedResult<AppLog>>;
  getLogById(id: EntityId): Promise<AppLog | null>;
  getCleanupSettings(): Promise<AppLog | null>;
  patchCleanupSettings(input: LogCleanupSettingsPatchInput): Promise<AppLog | null>;
}

export interface UserService {
  listUsers(params?: UserListParams): Promise<PaginatedResult<ManagedUser>>;
  getUserById(id: EntityId): Promise<ManagedUser | null>;
  createUser(input: UserMutationInput): Promise<ManagedUser>;
  updateUser(id: EntityId, input: UserMutationInput): Promise<ManagedUser | null>;
  patchUser(id: EntityId, input: UserPatchInput): Promise<ManagedUser | null>;
  deleteUser(id: EntityId): Promise<boolean>;
  toggleUserActive(id: EntityId): Promise<ManagedUser | null>;
  listPermissions(): Promise<UserPermission[]>;
  getPermissionById(id: EntityId): Promise<UserPermission | null>;
}

export interface AppServices {
  dashboard: DashboardService;
  agents: AgentService;
  couriers: CourierService;
  leads: LeadService;
  customers: CustomerService;
  products: ProductService;
  orders: OrderService;
  payments: PaymentService;
  conversations: ConversationService;
  notifications: NotificationService;
  integrations: IntegrationsService;
  logs: LogsService;
  aiSettings: AISettingsService;
  profile: ProfileService;
  users: UserService;
}
