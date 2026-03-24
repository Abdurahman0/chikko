import type { NotificationChannel } from '../../../types/domain';

export function getNotificationChannelLabel(channel: NotificationChannel): string {
  if (channel === 'in_app') {
    return 'Ilova ichida';
  }

  if (channel === 'telegram') {
    return 'Telegram';
  }

  return 'Tizim';
}

export function getNotificationChannelClassName(channel: NotificationChannel): string {
  if (channel === 'in_app') {
    return 'bg-info-bg text-info';
  }

  if (channel === 'telegram') {
    return 'bg-[rgb(32_156_238_/_0.14)] text-[rgb(12_114_181)]';
  }

  return 'bg-neutral-bg text-neutral';
}

export function getNotificationReadLabel(isRead: boolean): string {
  return isRead ? "O'qilgan" : "O'qilmagan";
}

export function formatNotificationDateTime(
  timestamp: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
