import type { SVGProps } from 'react';
import type { IconType } from 'react-icons';
import {
  FiBell,
  FiBox,
  FiCalendar,
  FiChevronDown,
  FiCreditCard,
  FiDownload,
  FiFileText,
  FiFilter,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShoppingBag,
  FiSun,
  FiTruck,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
  FiActivity,
  FiZap,
} from 'react-icons/fi';

export type AppIconName =
  | 'dashboard'
  | 'profile'
  | 'users'
  | 'integrations'
  | 'leads'
  | 'customers'
  | 'products'
  | 'orders'
  | 'couriers'
  | 'payments'
  | 'chat'
  | 'notifications'
  | 'ai-settings'
  | 'logs'
  | 'menu'
  | 'sun'
  | 'moon'
  | 'search'
  | 'sparkles'
  | 'bell'
  | 'user'
  | 'chevron-down'
  | 'close'
  | 'calendar'
  | 'filter'
  | 'download'
  | 'log-out'
  | 'plus'
  | 'trending-up'
  | 'trending-down'
  | 'activity'
  | 'settings'
  | 'refresh-cw';

interface AppIconProps extends SVGProps<SVGSVGElement> {
  name: AppIconName;
}

const ICON_MAP: Record<AppIconName, IconType> = {
  dashboard: FiGrid,
  profile: FiUser,
  users: FiUsers,
  integrations: FiSettings,
  leads: FiFileText,
  customers: FiUsers,
  products: FiBox,
  orders: FiShoppingBag,
  couriers: FiTruck,
  payments: FiCreditCard,
  chat: FiMessageSquare,
  notifications: FiBell,
  'ai-settings': FiZap,
  logs: FiPackage,
  menu: FiMenu,
  sun: FiSun,
  moon: FiMoon,
  search: FiSearch,
  sparkles: FiZap,
  bell: FiBell,
  user: FiUser,
  'chevron-down': FiChevronDown,
  close: FiX,
  calendar: FiCalendar,
  filter: FiFilter,
  download: FiDownload,
  'log-out': FiLogOut,
  plus: FiPlus,
  'trending-up': FiTrendingUp,
  'trending-down': FiTrendingDown,
  activity: FiActivity,
  settings: FiSettings,
  'refresh-cw': FiRefreshCw,
};

function AppIcon({ name, className, ...props }: AppIconProps) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} {...props} />;
}

export default AppIcon;
