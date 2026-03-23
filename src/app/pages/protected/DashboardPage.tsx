import { useEffect, useMemo, useState } from 'react';
import {
  LEAD_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  PLATFORM_CHANNEL_LABELS,
} from '../../../constants';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import { getStatusBadgeTone } from '../../../components/shared/data/StatusBadge';
import AppIcon, {
  type AppIconName,
} from '../../../components/shared/icons/AppIcon';
import { PageLayout } from '../../../components/shared/page';
import { services } from '../../../services';
import type { DashboardOverview } from '../../../services';
import type { AppNotification, AppUser, Lead, Order } from '../../../types/domain';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

interface DashboardPageData {
  overview: DashboardOverview;
  currentUser: AppUser | null;
  notifications: AppNotification[];
  leads: Lead[];
  orders: Order[];
}

type DashboardTheme = 'light' | 'dark';
type DashboardTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface DashboardMetricCardProps {
  icon: AppIconName;
  title: string;
  value: string | number;
  meta: string;
  tone?: DashboardTone;
  featured?: boolean;
  isDarkTheme: boolean;
}

type ChartRange = 1 | 3 | 12;

const PIPELINE_STAGE_ORDER = [
  'new',
  'contacted',
  'qualified',
  'negotiating',
  'converted',
] as const;

const LEAD_PRIORITY_ORDER: Record<Lead['status'], number> = {
  converted: 6,
  negotiating: 5,
  qualified: 4,
  contacted: 3,
  new: 2,
  lost: 1,
  archived: 0,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getDocumentTheme(): DashboardTheme {
  if (typeof document === 'undefined') {
    return 'light';
  }

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function useDashboardTheme(): DashboardTheme {
  const [theme, setTheme] = useState<DashboardTheme>(getDocumentTheme);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setTheme(getDocumentTheme());

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) {
    return 'Unavailable';
  }

  const target = new Date(timestamp).getTime();
  const delta = target - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(delta) < hour) {
    return rtf.format(Math.round(delta / minute), 'minute');
  }

  if (Math.abs(delta) < day) {
    return rtf.format(Math.round(delta / hour), 'hour');
  }

  return rtf.format(Math.round(delta / day), 'day');
}

function getPillClassName(tone: DashboardTone, isDarkTheme: boolean): string {
  const baseClassName =
    'inline-flex min-h-8 items-center gap-2 rounded-pill border px-3 text-[11px] font-semibold uppercase tracking-[0.12em]';

  const toneClassNames: Record<DashboardTone, string> = isDarkTheme
    ? {
        neutral: 'border-white/10 bg-white/[0.04] text-slate-300',
        accent: 'border-blue-500/25 bg-blue-500/12 text-blue-200',
        success: 'border-emerald-500/20 bg-emerald-500/12 text-emerald-200',
        warning: 'border-amber-500/20 bg-amber-500/12 text-amber-200',
        danger: 'border-rose-500/20 bg-rose-500/12 text-rose-200',
        info: 'border-cyan-500/20 bg-cyan-500/12 text-cyan-200',
      }
    : {
        neutral: 'border-slate-200 bg-white text-slate-600',
        accent: 'border-blue-200 bg-blue-50 text-blue-700',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-700',
        danger: 'border-rose-200 bg-rose-50 text-rose-700',
        info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      };

  return cn(baseClassName, toneClassNames[tone]);
}

function getNotificationTone(notification: AppNotification): DashboardTone {
  return notification.severity === 'neutral' ? 'info' : notification.severity;
}

function getLeadLastTouch(lead: Lead) {
  return lead.lastContactAt ?? lead.lastMessageAt ?? lead.updatedAt ?? lead.createdAt;
}

function getLeadInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatCompactCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

function DashboardMetricCard({
  icon,
  title,
  value,
  meta,
  tone = 'accent',
  featured = false,
  isDarkTheme,
}: DashboardMetricCardProps) {
  const baseClassName =
    'relative overflow-hidden rounded-xl border px-4 py-4 transition-colors';

  const featuredClassName = isDarkTheme
    ? 'border-blue-500/40 bg-gradient-to-br from-blue-500/22 via-[#12213a] to-[#0d1520] text-white shadow-[0_24px_48px_-32px_rgba(59,130,246,0.5)]'
    : 'border-blue-300 bg-gradient-to-br from-blue-50 via-white to-blue-100 text-slate-950 shadow-[0_24px_48px_-34px_rgba(37,99,235,0.22)]';

  const defaultClassName = isDarkTheme
    ? 'border-white/10 bg-[#10161f] text-slate-100 shadow-[0_22px_52px_-36px_rgba(0,0,0,0.75)]'
    : 'border-slate-200/90 bg-white text-slate-950 shadow-[0_20px_44px_-32px_rgba(15,23,42,0.18)]';

  const iconClassName = featured
    ? isDarkTheme
      ? 'border border-white/10 bg-white/10 text-blue-100'
      : 'border border-blue-200 bg-white/80 text-blue-700'
    : getPillClassName(tone, isDarkTheme);

  return (
    <article className={cn(baseClassName, featured ? featuredClassName : defaultClassName)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'm-0 text-[11px] font-semibold uppercase tracking-[0.16em]',
              featured
                ? isDarkTheme
                  ? 'text-blue-100/80'
                  : 'text-blue-700/80'
                : isDarkTheme
                  ? 'text-slate-400'
                  : 'text-slate-500',
            )}
          >
            {title}
          </p>
          <p className="mt-3 text-[1.85rem] font-bold leading-none tracking-[-0.04em]">
            {value}
          </p>
        </div>

        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', iconClassName)}>
          <AppIcon name={icon} className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>

      <p
        className={cn(
          'mt-4 text-sm',
          featured
            ? isDarkTheme
              ? 'text-blue-100/78'
              : 'text-slate-600'
            : isDarkTheme
              ? 'text-slate-400'
              : 'text-slate-500',
        )}
      >
        {meta}
      </p>
    </article>
  );
}

function DashboardPage() {
  const dashboardTheme = useDashboardTheme();
  const isDarkTheme = dashboardTheme === 'dark';

  const [data, setData] = useState<DashboardPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>(12);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setHasError(false);

      try {
        const [overview, currentUser, notifications, leadResult, orderResult] =
          await Promise.all([
            services.dashboard.getOverview(),
            services.profile.getCurrentUser(),
            services.notifications.list(),
            services.leads.list({ page: 1, pageSize: 120 }),
            services.orders.list({ page: 1, pageSize: 120 }),
          ]);

        if (!isActive) {
          return;
        }

        setData({
          overview,
          currentUser,
          notifications,
          leads: leadResult.items,
          orders: orderResult.items,
        });
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setData(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const themeClasses = useMemo(
    () => ({
      title: isDarkTheme ? 'text-slate-50' : 'text-slate-950',
      subtitle: isDarkTheme ? 'text-slate-400' : 'text-slate-600',
      muted: isDarkTheme ? 'text-slate-400' : 'text-slate-500',
      surface: isDarkTheme
        ? 'border-white/10 bg-[#10161f] shadow-[0_24px_54px_-38px_rgba(0,0,0,0.82)]'
        : 'border-slate-200 bg-white shadow-[0_24px_54px_-40px_rgba(15,23,42,0.16)]',
      subtleSurface: isDarkTheme
        ? 'border-white/8 bg-[#0d131b]'
        : 'border-slate-200/80 bg-slate-50',
      divider: isDarkTheme ? 'border-white/8' : 'border-slate-200',
      rowHover: isDarkTheme ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50/80',
      tableHead: isDarkTheme ? 'text-slate-400' : 'text-slate-500',
      tableText: isDarkTheme ? 'text-slate-100' : 'text-slate-950',
      panelText: isDarkTheme ? 'text-slate-300' : 'text-slate-600',
      iconShell: isDarkTheme
        ? 'border border-white/10 bg-white/[0.04] text-slate-200'
        : 'border border-slate-200 bg-white text-slate-700',
      chartShell: isDarkTheme
        ? 'border-white/8 bg-[#0d131b]'
        : 'border-slate-200/80 bg-slate-50',
    }),
    [isDarkTheme],
  );

  const recentNotifications = useMemo(
    () => data?.notifications.slice(0, 5) ?? [],
    [data],
  );

  const conversionRate = useMemo(() => {
    if (!data?.overview || data.overview.totalLeads === 0) {
      return 0;
    }

    return (data.overview.totalCustomers / data.overview.totalLeads) * 100;
  }, [data]);

  const qualifiedLeads = useMemo(
    () =>
      data?.leads.filter((lead) =>
        ['qualified', 'negotiating', 'converted'].includes(lead.status),
      ).length ?? 0,
    [data],
  );

  const openOrders = useMemo(
    () =>
      data?.orders.filter((order) =>
        ['pending', 'confirmed', 'packed', 'shipped'].includes(order.orderStatus),
      ).length ?? 0,
    [data],
  );

  const averageOrderValue = useMemo(() => {
    if (!data?.overview || data.overview.totalOrders === 0) {
      return 0;
    }

    return data.overview.totalRevenue / data.overview.totalOrders;
  }, [data]);

  const pipelineSnapshot = useMemo(() => {
    const counts = PIPELINE_STAGE_ORDER.map((status) => ({
      status,
      label: LEAD_STATUS_LABELS[status],
      count: data?.leads.filter((lead) => lead.status === status).length ?? 0,
    }));

    const maxCount = Math.max(...counts.map((item) => item.count), 1);

    return {
      counts,
      maxCount,
      strongestStage:
        counts
          .slice()
          .sort((left, right) => right.count - left.count)[0]
          ?.label ?? 'New',
    };
  }, [data]);

  const monthlyPerformance = useMemo(() => {
    const orders = data?.orders ?? [];
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const anchorTimestamp = orders.reduce((latest, order) => {
      const createdAt = new Date(order.createdAt).getTime();
      return Number.isNaN(createdAt) ? latest : Math.max(latest, createdAt);
    }, Date.now());
    const anchorDate = new Date(anchorTimestamp);
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        anchorDate.getFullYear(),
        anchorDate.getMonth() - 11 + index,
        1,
      );

      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: monthFormatter.format(date).toUpperCase(),
        revenue: 0,
        orders: 0,
      };
    });

    const monthMap = new Map(months.map((month) => [month.key, month]));

    orders.forEach((order) => {
      const createdAt = new Date(order.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const month = monthMap.get(key);

      if (!month) {
        return;
      }

      month.revenue += order.totalAmount;
      month.orders += 1;
    });

    const peakMonth =
      months.reduce((peak, month) => (month.revenue > peak.revenue ? month : peak), months[0]) ??
      months[0];

    const totalRevenue = months.reduce((sum, month) => sum + month.revenue, 0);

    return {
      data: months.map((month) => ({
        ...month,
        fill:
          month.key === peakMonth?.key
            ? 'rgb(var(--color-primary))'
            : 'rgb(var(--color-background-ghost) / 0.08)',
      })),
      peakMonth,
      totalRevenue,
    };
  }, [data]);

  const filteredMonthlyPerformance = useMemo(() => {
    const rangeData = monthlyPerformance.data.slice(-chartRange);
    const peakMonth =
      rangeData.reduce(
        (peak, month) => (month.revenue > peak.revenue ? month : peak),
        rangeData[0] ?? monthlyPerformance.peakMonth,
      ) ?? monthlyPerformance.peakMonth;

    return {
      data: rangeData.map((month) => ({
        ...month,
        fill:
          month.key === peakMonth?.key
            ? 'rgb(var(--color-primary))'
            : 'rgb(var(--color-background-ghost) / 0.08)',
      })),
      peakMonth,
      totalRevenue: rangeData.reduce((sum, month) => sum + month.revenue, 0),
    };
  }, [chartRange, monthlyPerformance]);

  const monthlyChartConfig = useMemo(
    () =>
      ({
        revenue: {
          label: 'Revenue',
          color: 'rgb(var(--color-primary))',
        },
      }) satisfies ChartConfig,
    [],
  );

  const priorityLeads = useMemo(() => {
    return (data?.leads ?? [])
      .slice()
      .sort((left, right) => {
        const stageDelta =
          LEAD_PRIORITY_ORDER[right.status] - LEAD_PRIORITY_ORDER[left.status];

        if (stageDelta !== 0) {
          return stageDelta;
        }

        return (
          new Date(getLeadLastTouch(right)).getTime() -
          new Date(getLeadLastTouch(left)).getTime()
        );
      })
      .slice(0, 5);
  }, [data]);

  const unreadNotifications = useMemo(
    () => recentNotifications.filter((notification) => !notification.isRead).length,
    [recentNotifications],
  );

  if (isLoading) {
    return (
      <PageLayout>
        <section className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500">
                Sales cockpit
              </p>
              <h1 className={cn('m-0 text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-[-0.04em]', themeClasses.title)}>
                Dashboard
              </h1>
              <p className={cn('mt-2 max-w-[48rem] text-sm', themeClasses.subtitle)}>
                Revenue, lead momentum, and workspace alerts.
              </p>
            </div>
          </div>

          <div
            className={cn(
              'grid min-h-[360px] place-items-center rounded-[24px] border px-6 py-12 text-center',
              themeClasses.surface,
            )}
          >
            <div className="grid max-w-sm justify-items-center gap-4">
              <div
                className={cn(
                  'h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-blue-500',
                  isDarkTheme ? 'bg-white/[0.04]' : 'bg-blue-50',
                )}
              />
              <div className="grid gap-2">
                <h2 className={cn('m-0 text-lg font-semibold', themeClasses.title)}>
                  Loading dashboard
                </h2>
                <p className={cn('m-0 text-sm', themeClasses.subtitle)}>
                  Pulling overview metrics, notifications, leads, and orders from the active workspace services.
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  if (hasError || !data) {
    return (
      <PageLayout>
        <section className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500">
                Sales cockpit
              </p>
              <h1 className={cn('m-0 text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-[-0.04em]', themeClasses.title)}>
                Dashboard
              </h1>
              <p className={cn('mt-2 max-w-[48rem] text-sm', themeClasses.subtitle)}>
                Revenue, lead momentum, and workspace alerts.
              </p>
            </div>
          </div>

          <div
            className={cn(
              'grid min-h-[360px] place-items-center rounded-[24px] border px-6 py-12 text-center',
              themeClasses.surface,
            )}
          >
            <div className="grid max-w-md gap-3">
              <div className={cn('mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl', getPillClassName('danger', isDarkTheme))}>
                <AppIcon name="dashboard" className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className={cn('m-0 text-lg font-semibold', themeClasses.title)}>
                Dashboard unavailable
              </h2>
              <p className={cn('m-0 text-sm', themeClasses.subtitle)}>
                The dashboard services did not return a usable snapshot. Retry is safe without changing the current architecture.
              </p>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="grid min-w-0 gap-4 overflow-x-hidden min-[768px]:gap-5">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h1 className="sr-only">Dashboard</h1>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <span className={getPillClassName('accent', isDarkTheme)}>
              <AppIcon name="sparkles" className="h-3.5 w-3.5" aria-hidden="true" />
              {data.currentUser?.fullName ?? 'Workspace'}
            </span>
            <span className={getPillClassName('neutral', isDarkTheme)}>
              <AppIcon name="notifications" className="h-3.5 w-3.5" aria-hidden="true" />
              {data.overview.unreadNotifications} unread
            </span>
            <span className={getPillClassName('info', isDarkTheme)}>
              <AppIcon name="dashboard" className="h-3.5 w-3.5" aria-hidden="true" />
              Updated {formatRelativeTime(data.overview.updatedAt)}
            </span>
          </div>
        </header>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            title="Revenue"
            value={formatCurrency(data.overview.totalRevenue, data.overview.currency)}
            meta={`Avg order ${formatCurrency(averageOrderValue, data.overview.currency)}`}
            icon="payments"
            tone="accent"
            featured
            isDarkTheme={isDarkTheme}
          />
          <DashboardMetricCard
            title="Leads"
            value={data.overview.totalLeads}
            meta={`${qualifiedLeads} in active stages`}
            icon="leads"
            tone="info"
            isDarkTheme={isDarkTheme}
          />
          <DashboardMetricCard
            title="Orders"
            value={data.overview.totalOrders}
            meta={`${openOrders} open right now`}
            icon="orders"
            tone="warning"
            isDarkTheme={isDarkTheme}
          />
          <DashboardMetricCard
            title="Conversion"
            value={formatPercent(conversionRate)}
            meta={`${data.overview.totalCustomers} customers closed`}
            icon="dashboard"
            tone="success"
            isDarkTheme={isDarkTheme}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <article className={cn('min-w-0 overflow-hidden rounded-[24px] border p-4 min-[768px]:p-5', themeClasses.surface)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', themeClasses.iconShell)}>
                    <AppIcon name="payments" className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <h2 className={cn('m-0 text-lg font-semibold tracking-[-0.02em]', themeClasses.title)}>
                    Monthly performance
                  </h2>
                </div>
                <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                  Order revenue across the last twelve active months.
                </p>
              </div>
              <span className={getPillClassName('accent', isDarkTheme)}>
                <AppIcon name="dashboard" className="h-3.5 w-3.5" aria-hidden="true" />
                Peak {filteredMonthlyPerformance.peakMonth?.label ?? 'N/A'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3">
              <div className={cn('rounded-2xl border p-3.5', themeClasses.subtleSurface)}>
                <p className={cn('m-0 text-[11px] font-semibold uppercase tracking-[0.14em]', themeClasses.muted)}>
                  Window
                </p>
                <p className={cn('mt-3 text-base font-semibold', themeClasses.title)}>
                  {chartRange === 12 ? '12 months' : `${chartRange} month${chartRange > 1 ? 's' : ''}`}
                </p>
                <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                  Ending {filteredMonthlyPerformance.data[filteredMonthlyPerformance.data.length - 1]?.label ?? 'N/A'}
                </p>
              </div>
              <div className={cn('rounded-2xl border p-3.5', themeClasses.subtleSurface)}>
                <p className={cn('m-0 text-[11px] font-semibold uppercase tracking-[0.14em]', themeClasses.muted)}>
                  Peak month
                </p>
                <p className={cn('mt-3 text-base font-semibold', themeClasses.title)}>
                  {filteredMonthlyPerformance.peakMonth?.label ?? 'N/A'}
                </p>
                <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                  {formatCompactCurrency(
                    filteredMonthlyPerformance.peakMonth?.revenue ?? 0,
                    data.overview.currency,
                  )}
                </p>
              </div>
              <div className={cn('rounded-2xl border p-3.5', themeClasses.subtleSurface)}>
                <p className={cn('m-0 text-[11px] font-semibold uppercase tracking-[0.14em]', themeClasses.muted)}>
                  Avg order
                </p>
                <p className={cn('mt-3 text-base font-semibold', themeClasses.title)}>
                  {formatCurrency(averageOrderValue, data.overview.currency)}
                </p>
                <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                  {openOrders} active orders in progress.
                </p>
              </div>
            </div>

            <div className={cn('mt-4 border-t pt-4 min-[768px]:mt-5 min-[768px]:pt-5', themeClasses.divider)}>
              <div className={cn('min-w-0 overflow-hidden rounded-2xl border p-3.5 min-[768px]:p-4', themeClasses.chartShell)}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={cn('m-0 text-[11px] font-semibold uppercase tracking-[0.14em]', themeClasses.muted)}>
                      Revenue trend
                    </p>
                    <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                      Real order volume aggregated from the live mock workspace.
                    </p>
                  </div>
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2 min-[520px]:w-auto">
                    <div className="inline-flex items-center rounded-xl border border-border-soft bg-background-elevated/90 p-1">
                      {([1, 3, 12] as const).map((range) => {
                        const label =
                          range === 1 ? '1M' : range === 3 ? '3M' : '1Y';
                        const isActive = chartRange === range;

                        return (
                          <button
                            key={range}
                            type="button"
                            className={cn(
                              'inline-flex min-h-8 flex-1 items-center justify-center rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition duration-fast min-[420px]:flex-none',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-text-secondary hover:bg-surface-card hover:text-text-primary',
                            )}
                            onClick={() => setChartRange(range)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <span className={getPillClassName('neutral', isDarkTheme)}>
                      {formatCompactCurrency(
                        filteredMonthlyPerformance.totalRevenue,
                        data.overview.currency,
                      )}
                    </span>
                  </div>
                </div>

                <div className="h-[220px] w-full min-w-0 overflow-hidden min-[640px]:h-[240px] min-[960px]:h-[260px]">
                  <ChartContainer config={monthlyChartConfig} className="h-full w-full min-w-0">
                    <BarChart
                      data={filteredMonthlyPerformance.data}
                      barGap={8}
                      margin={{ top: 8, right: 0, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="0" stroke={isDarkTheme ? 'rgb(255 255 255 / 0.08)' : 'rgb(148 163 184 / 0.18)'} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={34}
                        tickMargin={8}
                        tickCount={4}
                        tickFormatter={(value) =>
                          formatCompactCurrency(Number(value), data.overview.currency)
                        }
                        className={themeClasses.muted}
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                        className={themeClasses.muted}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => `${value} performance`}
                            formatter={(value) =>
                              formatCurrency(Number(value), data.overview.currency)
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="revenue"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={chartRange === 12 ? 26 : chartRange === 3 ? 40 : 52}
                      >
                        {filteredMonthlyPerformance.data.map((month) => (
                          <Cell key={month.key} fill={month.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </article>

          <article className={cn('min-w-0 overflow-hidden rounded-[24px] border p-4 min-[768px]:p-5', themeClasses.surface)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', themeClasses.iconShell)}>
                    <AppIcon name="notifications" className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <h2 className={cn('m-0 text-lg font-semibold tracking-[-0.02em]', themeClasses.title)}>
                    Recent activity
                  </h2>
                </div>
                <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                  Real-time notifications from the current workspace.
                </p>
              </div>
              <span className={getPillClassName(unreadNotifications ? 'accent' : 'neutral', isDarkTheme)}>
                <AppIcon name="bell" className="h-3.5 w-3.5" aria-hidden="true" />
                {unreadNotifications} unread
              </span>
            </div>

            {recentNotifications.length === 0 ? (
              <div
                className={cn(
                  'mt-5 grid min-h-[220px] place-items-center rounded-2xl border px-5 py-8 text-center',
                  themeClasses.subtleSurface,
                )}
              >
                <div className="grid max-w-xs gap-2">
                  <h3 className={cn('m-0 text-base font-semibold', themeClasses.title)}>
                    No recent activity
                  </h3>
                  <p className={cn('m-0 text-sm', themeClasses.subtitle)}>
                    Notifications will appear here as new lead, order, and system events come in.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="mt-5 grid list-none gap-3 p-0">
                {recentNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={cn(
                      'rounded-2xl border p-3.5 transition-colors',
                      themeClasses.subtleSurface,
                      !notification.isRead && (isDarkTheme ? 'border-blue-500/20 bg-blue-500/[0.07]' : 'border-blue-200 bg-blue-50/60'),
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
                          getNotificationTone(notification) === 'danger'
                            ? 'bg-rose-500'
                            : getNotificationTone(notification) === 'warning'
                              ? 'bg-amber-500'
                              : getNotificationTone(notification) === 'success'
                                ? 'bg-emerald-500'
                                : getNotificationTone(notification) === 'info'
                                  ? 'bg-cyan-500'
                                  : 'bg-blue-500',
                        )}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className={cn('m-0 text-sm font-semibold leading-5 [overflow-wrap:anywhere]', themeClasses.title)}>
                            {notification.title}
                          </h3>
                          <span className={getPillClassName(getNotificationTone(notification), isDarkTheme)}>
                            {NOTIFICATION_TYPE_LABELS[notification.type]}
                          </span>
                        </div>

                        <p className={cn('mt-1.5 text-sm leading-5 [overflow-wrap:anywhere]', themeClasses.panelText)}>
                          {notification.message}
                        </p>

                        <div className={cn('mt-3 flex flex-wrap items-center gap-2 text-xs font-medium', themeClasses.muted)}>
                          <span>{formatRelativeTime(notification.createdAt)}</span>
                          <span className={cn('inline-flex h-1 w-1 rounded-full', isDarkTheme ? 'bg-white/15' : 'bg-slate-300')} />
                          <span>{notification.isRead ? 'Read' : 'Unread'}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <article className={cn('min-w-0 overflow-hidden rounded-[24px] border p-4 min-[768px]:p-5', themeClasses.surface)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', themeClasses.iconShell)}>
                  <AppIcon name="customers" className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h2 className={cn('m-0 text-lg font-semibold tracking-[-0.02em]', themeClasses.title)}>
                  Priority leads
                </h2>
              </div>
              <p className={cn('mt-1 text-sm', themeClasses.subtitle)}>
                Qualified opportunities and recent conversations that need action.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={getPillClassName('accent', isDarkTheme)}>
                Qualified {pipelineSnapshot.counts.find((item) => item.status === 'qualified')?.count ?? 0}
              </span>
              <span className={getPillClassName('warning', isDarkTheme)}>
                Negotiating {pipelineSnapshot.counts.find((item) => item.status === 'negotiating')?.count ?? 0}
              </span>
            </div>
          </div>

          {priorityLeads.length === 0 ? (
            <div
              className={cn(
                'mt-5 grid min-h-[220px] place-items-center rounded-2xl border px-5 py-8 text-center',
                themeClasses.subtleSurface,
              )}
            >
              <div className="grid max-w-xs gap-2">
                <h3 className={cn('m-0 text-base font-semibold', themeClasses.title)}>
                  No leads available
                </h3>
                <p className={cn('m-0 text-sm', themeClasses.subtitle)}>
                  Lead activity will populate this table when the lead service returns records.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse">
                <thead>
                  <tr className={cn('border-b', themeClasses.divider)}>
                    <th className={cn('px-0 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', themeClasses.tableHead)}>
                      Lead
                    </th>
                    <th className={cn('px-4 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', themeClasses.tableHead)}>
                      Channel
                    </th>
                    <th className={cn('px-4 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', themeClasses.tableHead)}>
                      Stage
                    </th>
                    <th className={cn('px-4 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', themeClasses.tableHead)}>
                      Owner
                    </th>
                    <th className={cn('px-4 pb-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em]', themeClasses.tableHead)}>
                      Last touch
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {priorityLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={cn('border-b transition-colors last:border-b-0', themeClasses.divider, themeClasses.rowHover)}
                    >
                      <td className="px-0 py-4">
                        <div className="flex items-center gap-3">
                          <span className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold', themeClasses.iconShell)}>
                            {getLeadInitials(lead.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className={cn('m-0 text-sm font-semibold [overflow-wrap:anywhere]', themeClasses.tableText)}>
                              {lead.fullName}
                            </p>
                            <p className={cn('mt-1 text-sm [overflow-wrap:anywhere]', themeClasses.panelText)}>
                              {lead.contact.phone ?? lead.username ?? 'No contact'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-1">
                          <span className={cn('text-sm font-medium', themeClasses.tableText)}>
                            {PLATFORM_CHANNEL_LABELS[lead.source]}
                          </span>
                          <span className={cn('text-xs', themeClasses.muted)}>
                            {lead.replied ? 'Replied' : 'Waiting reply'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={getPillClassName(getStatusBadgeTone(lead.status), isDarkTheme)}>
                          {LEAD_STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-1">
                          <span className={cn('text-sm font-medium', themeClasses.tableText)}>
                            {lead.assignedOperator?.fullName ?? 'Unassigned'}
                          </span>
                          <span className={cn('text-xs', themeClasses.muted)}>
                            {lead.dmSent ? 'DM sent' : 'No DM'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="grid justify-items-end gap-1">
                          <span className={cn('text-sm font-medium', themeClasses.tableText)}>
                            {formatRelativeTime(getLeadLastTouch(lead))}
                          </span>
                          <span className={cn('text-xs', themeClasses.muted)}>
                            {formatTimestamp(getLeadLastTouch(lead))}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;
