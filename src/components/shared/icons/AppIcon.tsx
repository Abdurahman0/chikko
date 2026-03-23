import type { SVGProps } from 'react';
import type { IconType } from 'react-icons';
import {
  FiBell,
  FiBox,
  FiChevronDown,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiPackage,
  FiSearch,
  FiSettings,
  FiShoppingBag,
  FiSun,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

export type AppIconName =
  | 'dashboard'
  | 'profile'
  | 'leads'
  | 'customers'
  | 'products'
  | 'orders'
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
  | 'close';

interface AppIconProps extends SVGProps<SVGSVGElement> {
  name: AppIconName;
}

const ICON_MAP: Record<AppIconName, IconType> = {
  dashboard: FiGrid,
  profile: FiUser,
  leads: FiFileText,
  customers: FiUsers,
  products: FiBox,
  orders: FiShoppingBag,
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
};

function AppIcon({ name, className, ...props }: AppIconProps) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} {...props} />;
}

export default AppIcon;
