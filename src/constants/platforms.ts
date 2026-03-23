import type { SelectOption } from '../types/common';
import type { PlatformChannel } from '../types/common';

export const PLATFORM_CHANNELS = [
  'instagram',
  'telegram',
  'whatsapp',
  'facebook',
  'website',
  'marketplace',
  'webchat',
  'referral',
  'other',
] as const satisfies readonly PlatformChannel[];

export const PLATFORM_CHANNEL_LABELS: Record<PlatformChannel, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  website: 'Website',
  marketplace: 'Marketplace',
  webchat: 'Web Chat',
  referral: 'Referral',
  other: 'Other',
};

export const PLATFORM_CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'instagram', label: PLATFORM_CHANNEL_LABELS.instagram },
  { value: 'telegram', label: PLATFORM_CHANNEL_LABELS.telegram },
  { value: 'whatsapp', label: PLATFORM_CHANNEL_LABELS.whatsapp },
  { value: 'facebook', label: PLATFORM_CHANNEL_LABELS.facebook },
  { value: 'website', label: PLATFORM_CHANNEL_LABELS.website },
  { value: 'marketplace', label: PLATFORM_CHANNEL_LABELS.marketplace },
  { value: 'webchat', label: PLATFORM_CHANNEL_LABELS.webchat },
  { value: 'referral', label: PLATFORM_CHANNEL_LABELS.referral },
  { value: 'other', label: PLATFORM_CHANNEL_LABELS.other },
];
