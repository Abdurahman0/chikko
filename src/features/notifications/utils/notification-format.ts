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
  administrator: 'Administrator',
  operator: 'Operator',
  payment: "To'lov",
  product: 'Mahsulot',
  order: 'Buyurtma',
  category: 'Kategoriya',
  status: 'Holat',
  created: 'Yaratildi',
  updated: 'Yangilandi',
  deleted: "O'chirildi",
  delete: "O'chirish",
  read: "O'qilgan",
  unread: "O'qilmagan",
  pending: 'Kutilmoqda',
  rejected: 'Rad etilgan',
};

const METADATA_KEY_LABELS: Record<string, string> = {
  event: 'Hodisa',
  method: 'Usul',
  status: 'Holat',
  reviewer_id: "Ko'rib chiquvchi",
  reviewer_name: "Ko'rib chiquvchi",
  order_id: 'Buyurtma',
  payment_id: "To'lov",
  verification_reference: 'Tasdiqlash raqami',
  sku: 'SKU',
  action: 'Amal',
  entity: 'Obyekt',
  actor_role: 'Ijrochi roli',
  actor_email: 'Ijrochi emaili',
  changed_fields: "O'zgargan maydonlar",
  raw: 'Matn',
};

const CHANGED_FIELD_LABELS: Record<string, string> = {
  status: 'Holat',
  order_status: 'Buyurtma holati',
  payment_status: "To'lov holati",
  stock_quantity: 'Zaxira soni',
  minimal_stock: 'Minimal zaxira limiti',
  price: 'Narx',
  currency: 'Valyuta',
  category: 'Kategoriya',
  category_id: 'Kategoriya',
  name: 'Nomi',
  description: 'Tavsif',
  sku: 'SKU',
  is_active: 'Faollik',
  quantity: 'Soni',
  unit_price: 'Birlik narxi',
  total_amount: 'Jami summa',
  paid_amount: "To'langan summa",
  contact_name: 'Kontakt nomi',
  contact_phone: 'Kontakt telefoni',
  shipping_address: 'Yetkazish manzili',
  notes: 'Izoh',
  updated_at: 'Yangilangan sana',
  created_at: "Qo'shilgan sana",
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

function normalizeMetadataKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s-]+/g, '_');
}

function replaceKnownEnglishWords(input: string): string {
  const replaceKeepingFirstLetterCase = (
    value: string,
    pattern: RegExp,
    lowercaseReplacement: string,
  ): string =>
    value.replace(pattern, (match) =>
      match.charAt(0) === match.charAt(0).toLocaleUpperCase()
        ? `${lowercaseReplacement.charAt(0).toLocaleUpperCase()}${lowercaseReplacement.slice(1)}`
        : lowercaseReplacement,
    );

  let output = input
    // Common Uzbek suffix forms that won't match strict word boundaries.
    ;

  output = replaceKeepingFirstLetterCase(output, /\bproductini\b/gi, 'mahsulotni');
  output = replaceKeepingFirstLetterCase(output, /\bproductni\b/gi, 'mahsulotni');
  output = replaceKeepingFirstLetterCase(output, /\bproductga\b/gi, 'mahsulotga');
  output = replaceKeepingFirstLetterCase(output, /\bproductdan\b/gi, 'mahsulotdan');
  output = replaceKeepingFirstLetterCase(output, /\borderini\b/gi, 'buyurtmani');
  output = replaceKeepingFirstLetterCase(output, /\borderni\b/gi, 'buyurtmani');
  output = replaceKeepingFirstLetterCase(output, /\borderga\b/gi, 'buyurtmaga');
  output = replaceKeepingFirstLetterCase(output, /\borderdan\b/gi, 'buyurtmadan');
  output = replaceKeepingFirstLetterCase(output, /\bpaymentini\b/gi, "to'lovni");
  output = replaceKeepingFirstLetterCase(output, /\bpaymentni\b/gi, "to'lovni");
  output = replaceKeepingFirstLetterCase(output, /\bpaymentga\b/gi, "to'lovga");
  output = replaceKeepingFirstLetterCase(output, /\bpaymentdan\b/gi, "to'lovdan");

  for (const [source, target] of Object.entries(VALUE_LABELS)) {
    output = output.replace(new RegExp(`\\b${source}\\b`, 'gi'), target);
  }

  return output;
}

function capitalizeFirstLetter(value: string): string {
  const trimmedStart = value.match(/^\s*/)?.[0] ?? '';
  const content = value.slice(trimmedStart.length);
  if (!content) {
    return value;
  }

  return `${trimmedStart}${content.charAt(0).toLocaleUpperCase()}${content.slice(1)}`;
}

function humanizeMetadataKey(key: string): string {
  const normalizedKey = normalizeMetadataKey(key);

  if (METADATA_KEY_LABELS[normalizedKey]) {
    return METADATA_KEY_LABELS[normalizedKey];
  }

  const withSpaces = normalizedKey.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function humanizeChangedFieldName(rawKey: string): string {
  const normalizedKey = normalizeMetadataKey(rawKey);
  if (!normalizedKey) {
    return '';
  }

  if (CHANGED_FIELD_LABELS[normalizedKey]) {
    return CHANGED_FIELD_LABELS[normalizedKey];
  }

  const readable = normalizedKey.replace(/_/g, ' ');
  return capitalizeFirstLetter(replaceKnownEnglishWords(readable));
}

function parseChangedFields(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => humanizeChangedFieldName(item))
        .filter((item) => item.length > 0);
    }

    if (typeof parsed === 'string') {
      const single = humanizeChangedFieldName(parsed);
      return single ? [single] : [];
    }
  } catch {
    // Fall through to tolerant parser below.
  }

  return trimmed
    .replace(/^[\[\(]\s*|\s*[\]\)]$/g, '')
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .map((part) => humanizeChangedFieldName(part))
    .filter((part) => part.length > 0);
}

function formatChangedFieldsSegment(input: string): string {
  return input.replace(
    /(o'zgargan maydonlar|changed fields)\s*:\s*([^.\n]+)([.\n]?)/gi,
    (_match, _prefix, rawFields, suffix) => {
      const readableFields = parseChangedFields(String(rawFields ?? ''));
      const joined =
        readableFields.length > 0 ? readableFields.join(', ') : "Mavjud emas";
      return `O'zgargan maydonlar: ${joined}${suffix ?? ''}`;
    },
  );
}

function translateMetadataValue(
  value: string | number | boolean | null,
  metadataKey?: string,
): string {
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

  if (metadataKey && normalizeMetadataKey(metadataKey) === 'changed_fields') {
    const readableFields = parseChangedFields(trimmed);
    return readableFields.length > 0
      ? readableFields.join(', ')
      : "Mavjud emas";
  }

  if (trimmed === '[]' || trimmed === '{}') {
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

function resolveReadableUserNameFromMetadata(
  metadata: AppNotification['metadata'] | undefined,
): string | null {
  if (!metadata) {
    return null;
  }

  const preferredKeys = [
    'user_name',
    'username',
    'actor_name',
    'reviewer_name',
    'created_by_name',
    'updated_by_name',
  ] as const;

  for (const key of preferredKeys) {
    const value = metadata[key];
    if (typeof value !== 'string') {
      continue;
    }

    const normalized = cleanupSpaces(value);
    if (!normalized || isUuidLike(normalized)) {
      continue;
    }

    return normalized;
  }

  return null;
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

  return capitalizeFirstLetter(replaceKnownEnglishWords(cleaned));
}

export function formatNotificationMessage(message: string): string {
  const cleaned = cleanupSpaces(message.replace(UUID_PATTERN_GLOBAL, ''));
  if (!cleaned) {
    return "Bildirishnoma matni mavjud emas.";
  }

  const translated = replaceKnownEnglishWords(cleaned);
  return formatChangedFieldsSegment(translated);
}

export function getNotificationUserLabel(
  user: AppNotification['user'],
  metadata?: AppNotification['metadata'] | null,
): string {
  return (
    resolveReadableUserName(user) ??
    resolveReadableUserNameFromMetadata(metadata ?? undefined) ??
    "Foydalanuvchi ko'rsatilmagan"
  );
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

    const translatedValue = translateMetadataValue(value, key);
    if (!translatedValue) {
      return entries;
    }

    if (normalizeMetadataKey(key).endsWith('_id') && isUuidLike(translatedValue)) {
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
