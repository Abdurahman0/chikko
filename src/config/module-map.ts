import type { AppModule } from '../types/architecture';

export const moduleMap: AppModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Live sales and operations overview.',
    category: 'operational',
    priority: 'foundation',
    priorityOrder: 1,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'dashboard-home',
        label: 'Dashboard Home',
        kind: 'overview',
        path: '/dashboard',
        notes: 'Primary KPI surface and safe redirect target after login.',
      },
      {
        id: 'dashboard-performance',
        label: 'Performance Snapshot',
        kind: 'analytics',
        path: '/dashboard/performance',
        notes: 'Focused operational metrics view.',
      },
    ],
    notes:
      'Developer and admin can be shown this through broad role rules. Operator visibility and actions must remain backend-permission aware.',
  },
  {
    id: 'leads',
    label: 'Leads',
    description: 'Lead pipeline and follow-up queue.',
    category: 'operational',
    priority: 'high',
    priorityOrder: 2,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'leads-list',
        label: 'Lead List',
        kind: 'list',
        path: '/leads',
      },
      {
        id: 'leads-detail',
        label: 'Lead Detail',
        kind: 'detail',
        path: '/leads/:leadId',
      },
      {
        id: 'leads-create',
        label: 'Create Lead',
        kind: 'create',
        path: '/leads/new',
      },
      {
        id: 'leads-edit',
        label: 'Edit Lead',
        kind: 'edit',
        path: '/leads/:leadId/edit',
      },
    ],
    notes:
      'Core CRM area. Operator navigation and allowed actions should later come from backend permissions rather than static frontend assumptions.',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer records and account history.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 7,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'customers-list',
        label: 'Customer List',
        kind: 'list',
        path: '/customers',
      },
      {
        id: 'customers-detail',
        label: 'Customer Detail',
        kind: 'detail',
        path: '/customers/:customerId',
      },
      {
        id: 'customers-create',
        label: 'Create Customer',
        kind: 'create',
        path: '/customers/new',
      },
      {
        id: 'customers-edit',
        label: 'Edit Customer',
        kind: 'edit',
        path: '/customers/:customerId/edit',
      },
    ],
    notes:
      'Stays separate from leads because post-conversion workflows differ. Operator availability remains permission-scoped.',
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Catalog, pricing, and availability.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 5,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'products-list',
        label: 'Product List',
        kind: 'list',
        path: '/products',
      },
      {
        id: 'products-detail',
        label: 'Product Detail',
        kind: 'detail',
        path: '/products/:productId',
      },
      {
        id: 'products-create',
        label: 'Create Product',
        kind: 'create',
        path: '/products/new',
      },
      {
        id: 'products-edit',
        label: 'Edit Product',
        kind: 'edit',
        path: '/products/:productId/edit',
      },
    ],
    notes:
      'Planned as a basic early implementation after orders and payments are stable enough to consume catalog data.',
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Orders, fulfillment, and delivery status.',
    category: 'operational',
    priority: 'high',
    priorityOrder: 3,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'orders-list',
        label: 'Order List',
        kind: 'list',
        path: '/orders',
      },
      {
        id: 'orders-detail',
        label: 'Order Detail',
        kind: 'detail',
        path: '/orders/:orderId',
      },
      {
        id: 'orders-create',
        label: 'Create Order',
        kind: 'create',
        path: '/orders/new',
      },
      {
        id: 'orders-edit',
        label: 'Edit Order',
        kind: 'edit',
        path: '/orders/:orderId/edit',
      },
    ],
    notes:
      'Priority is ahead of payments and basic products because it is central to the operational sales flow.',
  },
  {
    id: 'couriers',
    label: 'Couriers',
    description: 'Courier directory and delivery assignment flow.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 4,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'couriers-list',
        label: 'Courier Workspace',
        kind: 'list',
        path: '/couriers',
      },
      {
        id: 'couriers-order-detail',
        label: 'Courier Order Detail',
        kind: 'detail',
        path: '/couriers/orders/:courierOrderId',
      },
    ],
    notes:
      'Operational module for delivery agents and courier-order lifecycle updates.',
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Transactions, balances, and payment states.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 5,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'payments-list',
        label: 'Payment List',
        kind: 'list',
        path: '/payments',
      },
      {
        id: 'payments-detail',
        label: 'Payment Detail',
        kind: 'detail',
        path: '/payments/:paymentId',
      },
      {
        id: 'payments-reconciliation',
        label: 'Reconciliation Queue',
        kind: 'queue',
        path: '/payments/reconciliation',
      },
    ],
    notes:
      'Separated from orders because payment state diverges from fulfillment state. Operator payment capabilities must later be permission-driven.',
  },
  {
    id: 'chat',
    label: 'Chat',
    description: 'Conversations and inbox handling.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 7,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'chat-list',
        label: 'Chat Sessions',
        kind: 'list',
        path: '/chat',
      },
      {
        id: 'chat-detail',
        label: 'Chat Detail',
        kind: 'detail',
        path: '/chat/:chatId',
      },
    ],
    notes:
      'Kept separate from logs because chat is an operator-facing workspace while logs are a developer-focused audit surface.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Alerts and workflow updates.',
    category: 'operational',
    priority: 'medium',
    priorityOrder: 9,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'notifications-center',
        label: 'Notification Center',
        kind: 'list',
        path: '/notifications',
      },
      {
        id: 'notifications-preferences',
        label: 'Notification Preferences',
        kind: 'configuration',
        path: '/notifications/preferences',
      },
    ],
    notes:
      'Shared badge counts will later connect to shell navigation. Operator visibility must remain permission-scoped.',
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Account settings and preferences.',
    category: 'personal',
    priority: 'low',
    priorityOrder: 10,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'static-role-based',
    pages: [
      {
        id: 'profile-overview',
        label: 'Profile Overview',
        kind: 'overview',
        path: '/profile',
      },
      {
        id: 'profile-preferences',
        label: 'Profile Preferences',
        kind: 'configuration',
        path: '/profile/preferences',
      },
    ],
    notes:
      'Personal module rather than a business module. Safe to keep simple and independent from operational access rules.',
  },
  {
    id: 'users',
    label: 'Users',
    description: 'User access and account management.',
    category: 'system',
    priority: 'low',
    priorityOrder: 11,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'users-list',
        label: 'Users',
        kind: 'list',
        path: '/users',
      },
    ],
    notes:
      'Access remains permission-driven in route guards. Admin and operator visibility depends on granted capabilities.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connected apps and external channels.',
    category: 'system',
    priority: 'low',
    priorityOrder: 12,
    allowedRoles: ['developer', 'admin', 'operator'],
    accessStrategy: 'permission-based',
    pages: [
      {
        id: 'integrations-list',
        label: 'Integrations',
        kind: 'configuration',
        path: '/integrations',
      },
    ],
    notes:
      'Protected by permission-aware guards. This is intentionally hidden unless the account is explicitly allowed.',
  },
  {
    id: 'ai-settings',
    label: 'AI Settings',
    description: 'AI agent setup and guardrails.',
    category: 'intelligence',
    priority: 'low',
    priorityOrder: 13,
    allowedRoles: ['developer'],
    accessStrategy: 'static-role-based',
    pages: [
      {
        id: 'ai-settings-overview',
        label: 'AI Settings Overview',
        kind: 'overview',
        path: '/ai-settings',
      },
      {
        id: 'ai-settings-policies',
        label: 'AI Policies',
        kind: 'configuration',
        path: '/ai-settings/policies',
      },
      {
        id: 'ai-settings-behavior',
        label: 'Agent Behavior',
        kind: 'configuration',
        path: '/ai-settings/behavior',
      },
    ],
    notes:
      'Developer-focused module. It is not treated as a standard admin module in the frontend architecture.',
  },
  {
    id: 'logs',
    label: 'Logs',
    description: 'Audit trail and system events.',
    category: 'system',
    priority: 'low',
    priorityOrder: 14,
    allowedRoles: ['developer'],
    accessStrategy: 'static-role-based',
    pages: [
      {
        id: 'logs-events',
        label: 'Event Logs',
        kind: 'log',
        path: '/logs',
      },
      {
        id: 'logs-audit',
        label: 'Audit Log',
        kind: 'log',
        path: '/logs/audit',
      },
    ],
    notes:
      'Developer-focused visibility surface. Direct URL access should later be guarded the same as hidden navigation entries.',
  },
];

export const crossSystemCapabilities = [
  'Auth foundation readiness',
  'Global search readiness',
  'Shared filter patterns',
  'Export flow readiness',
  'Audit and activity timeline support',
  'Role-aware navigation readiness',
  'Permission-aware route guarding readiness',
  'Safe unauthorized redirect readiness',
  'Responsive admin shell readiness',
  'Notification badge support',
] as const;

export const implementationOrder = [...moduleMap].sort(
  (left, right) => left.priorityOrder - right.priorityOrder,
);
