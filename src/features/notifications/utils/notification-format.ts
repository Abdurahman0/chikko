import type { AppNotification, NotificationChannel } from '../../../types/domain';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PATTERN_GLOBAL =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const VALUE_LABELS: Record<string, string> = {
  approved: 'Tasdiqlangan',
  manual: "Qo'lda",
  developer: 'Dasturchi',
  admin: 'Administrator',
  operator: 'Operator',
  payment: "to'lov",
  pending: 'Kutilmoqda',
  rejected: 'Rad etilgan',
};

const METADATA_KEY_LABELS: Record<string, string> = {
  event: 'Hodisa',
  method: 'Usul',
  status: 'Holat',
  reviewer_id: "Ko'rib chiquvchi",
  order_id: 'Buyurtma',
  payment_id: "To'lov",
  verification_reference: 'Tasdiqlash raqami',
  raw: 'Matn',
};

export interface NotificationMetadataEntry {
  key: string;
  label: string;
  value: string;
}

function isUuidLike(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return UUID_PATTERN.test(value.trim());
}

function cleanupSpaces(value: string): string {
  return value
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function replaceKnownEnglishWords(input: string): string {
  let output = input;

  for (const [source, target] of Object.entries(VALUE_LABELS)) {
    output = output.replace(new RegExp(`\\b${source}\\b`, 'gi'), target);
  }

  return output;
}

function humanizeMetadataKey(key: string): string {
  if (METADATA_KEY_LABELS[key]) {
    return METADATA_KEY_LABELS[key];
  }

  const withSpaces = key.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function translateMetadataValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "Mavjud emas";
  }

  if (typeof value === 'boolean') {
    return value ? 'Ha' : "Yo'q";
  }

  if (typeof value === 'number') {
    return String(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Mavjud emas";
  }

  const withoutIds = cleanupSpaces(trimmed.replace(UUID_PATTERN_GLOBAL, ''));
  if (!withoutIds) {
    return '';
  }

  const directMatch = VALUE_LABELS[withoutIds.toLowerCase()];
  if (directMatch) {
    return directMatch;
  }

  return replaceKnownEnglishWords(withoutIds);
}

function resolveReadableUserName(user: AppNotification['user']): string | null {
  const fullName = user?.fullName?.trim();
  if (!fullName || isUuidLike(fullName)) {
    return null;
  }

  return fullName;
}

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
  locale?: string,
): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Sana mavjud emas';
  }

  const uzMonths = ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'IYN', 'IYL', 'AVG', 'SEN', 'OKT', 'NOY', 'DEK'];
  const ruMonths = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];

  const monthIndex = date.getMonth();
  const isRuLocale = (locale ?? '').toLowerCase().startsWith('ru');
  const month = isRuLocale ? ruMonths[monthIndex] : uzMonths[monthIndex];

  const year = date.getFullYear();
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Product requirement: handmade date format for notifications.
  return `${year} ${month} ${day} ${hours}:${minutes}`;
}

export function formatNotificationTitle(title: string): string {
  const cleaned = cleanupSpaces(title.replace(UUID_PATTERN_GLOBAL, ''));
  if (!cleaned) {
    return 'Bildirishnoma';
  }

  return replaceKnownEnglishWords(cleaned);
}

export function formatNotificationMessage(message: string): string {
  const cleaned = cleanupSpaces(message.replace(UUID_PATTERN_GLOBAL, ''));
  if (!cleaned) {
    return "Bildirishnoma matni mavjud emas.";
  }

  return replaceKnownEnglishWords(cleaned);
}

export function getNotificationUserLabel(user: AppNotification['user']): string {
  return resolveReadableUserName(user) ?? "Foydalanuvchi ko'rsatilmagan";
}

export function getFormattedNotificationMetadata(
  metadata: AppNotification['metadata'],
  user: AppNotification['user'],
): NotificationMetadataEntry[] {
  if (!metadata) {
    return [];
  }

  const readableUserName = resolveReadableUserName(user);

  return Object.entries(metadata).reduce<NotificationMetadataEntry[]>((entries, [key, value]) => {
    if (key === 'reviewer_id' && readableUserName) {
      entries.push({
        key,
        label: humanizeMetadataKey(key),
        value: readableUserName,
      });
      return entries;
    }

    const translatedValue = translateMetadataValue(value);
    if (!translatedValue) {
      return entries;
    }

    if (key.endsWith('_id') && isUuidLike(translatedValue)) {
      return entries;
    }

    entries.push({
      key,
      label: humanizeMetadataKey(key),
      value: translatedValue,
    });
    return entries;
  }, []);
}
