import type { EntityId, TimestampString } from './common';

export type NotificationType =
  | 'system'
  | 'lead'
  | 'order'
  | 'payment'
  | 'conversation'
  | 'user';

export type NotificationSeverity =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type NotificationEntityType =
  | 'lead'
  | 'customer'
  | 'order'
  | 'product'
  | 'payment'
  | 'conversation'
  | 'user';

export interface NotificationEntityRef {
  entityType: NotificationEntityType;
  entityId: EntityId;
  label?: string;
  path?: string;
}

export interface AppNotification {
  id: EntityId;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  isRead: boolean;
  createdAt: TimestampString;
  relatedEntity?: NotificationEntityRef;
}
