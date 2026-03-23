import type { AppNotification } from '../../types/domain';

export type NotificationDto = Record<string, unknown>;

export function mapNotificationDtoToModel(_dto: NotificationDto): AppNotification {
  throw new Error('Not implemented: mapNotificationDtoToModel');
}
