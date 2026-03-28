import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ru, uz } from 'date-fns/locale';
import { type DateRange } from 'react-day-picker';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { PageLayout } from '../../../components/shared/page';
import { Calendar } from '../../../components/ui/calendar';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import {
  getChannelLabel,
  getLeadStatusLabel,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from '../../../i18n/labels';
import { formatLocalizedDate, formatUzMonthYear } from '../../../i18n/date-format';
import { formatCurrencyAmount } from '../../../constants';
import { services } from '../../../services';
import type {
  DashboardBreakdownItem,
  DashboardInterval,
  DashboardOverview,
  DashboardOverviewParams,
} from '../../../services';
import type { LeadStatus } from '../../../types/domain';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

interface PieSlice extends DashboardBreakdownItem {
  color: string;
  share: number;
}

const SOURCE_COLORS: Record<string, string> = {
  telegram: '#2AABEE',
  instagram: '#E1306C',
};

const SOURCE_COLORS_FALLBACK = ['#0EA5E9', '#E1306C', '#10B981', '#F59E0B'];
const LEAD_STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  contacted: '#8B5CF6',
  qualified: '#10B981',
  negotiating: '#F59E0B',
  converted: '#059669',
  lost: '#EF4444',
};
const LEAD_STATUS_COLORS_FALLBACK = [
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#059669',
  '#EF4444',
];
const CHIP_BASE_CLASS_NAME =
  'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold';
const CHIP_TONE_CLASS_NAMES = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  neutral: 'bg-neutral-bg text-neutral',
} as const;

type ChipTone = keyof typeof CHIP_TONE_CLASS_NAMES;

interface DashboardFilters {
  interval: DashboardInterval;
  customDateFrom?: string;
  customDateTo?: string;
}

interface DashboardIntervalDropdownProps {
  value: DashboardInterval;
  options: Array<{ value: DashboardInterval; label: string }>;
  onChange: (value: DashboardInterval) => void;
  ariaLabel: string;
}

const DASHBOARD_DEFAULT_DAYS = 30;

function asNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatAmount(value: number | string, locale: string): string {
  return formatCurrencyAmount(asNumber(value), locale);
}

function formatPercent(value: number | string): string {
  return `${asNumber(value).toFixed(2)}%`;
}

function formatDateLabel(value: string, locale: string, language: string): string {
  return formatLocalizedDate(`${value}T00:00:00`, language, {
    locale,
    withYear: true,
    shortMonth: true,
    fallback: value,
  });
}

function formatSeriesLabel(value: string, locale: string, language: string): string {
  return formatLocalizedDate(`${value}T00:00:00`, language, {
    locale,
    withYear: false,
    shortMonth: true,
    fallback: value,
  });
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!isIsoDate(value)) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function buildDashboardQuery(filters: DashboardFilters): DashboardOverviewParams {
  if (
    isIsoDate(filters.customDateFrom) &&
    isIsoDate(filters.customDateTo) &&
    filters.customDateFrom <= filters.customDateTo
  ) {
    return {
      date_from: filters.customDateFrom,
      date_to: filters.customDateTo,
      interval: filters.interval,
    };
  }

  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - (DASHBOARD_DEFAULT_DAYS - 1));

  return {
    date_from: toIsoDate(dateFrom),
    date_to: toIsoDate(dateTo),
    interval: filters.interval,
  };
}

function pickForDisplay(
  items: DashboardBreakdownItem[],
  maxItems: number,
): DashboardBreakdownItem[] {
  const nonZero = items.filter((item) => item.count > 0);
  return (nonZero.length > 0 ? nonZero : items).slice(0, maxItems);
}

function getOrderStatusTone(statusKey: string): ChipTone {
  switch (statusKey) {
    case 'completed':
    case 'paid':
      return 'success';
    case 'waiting_payment':
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'danger';
    case 'confirmed':
      return 'info';
    case 'draft':
    default:
      return 'neutral';
  }
}

function getPaymentStatusTone(statusKey: string): ChipTone {
  switch (statusKey) {
    case 'approved':
    case 'verified':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

function hexToRgba(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) {
    return `rgb(var(--color-surface-subtle) / ${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getChannelChipStyle(channelKey: string) {
  const color = SOURCE_COLORS[channelKey];
  if (!color) {
    return undefined;
  }
  return {
    backgroundColor: hexToRgba(color, 0.16),
    color,
  };
}

function DashboardIntervalDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: DashboardIntervalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePlacement() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const expectedMenuHeight = 176;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(spaceBelow < expectedMenuHeight && spaceAbove > spaceBelow);
    }

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={['relative', isOpen ? 'z-[140]' : 'z-20'].join(' ')}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          'group inline-flex h-8 min-w-[130px] items-center justify-between gap-2 rounded-pill border px-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition duration-fast',
          'bg-gradient-to-b from-surface-card to-surface-subtle/80 shadow-[0_15px_26px_-22px_rgba(37,99,235,0.85)]',
          isOpen
            ? 'border-primary/60 text-text-primary ring-2 ring-primary/20'
            : 'border-border-soft/70 text-text-secondary hover:border-primary/45 hover:text-text-primary',
        ].join(' ')}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <AppIcon
          name="chevron-down"
          className={[
            'h-3.5 w-3.5 shrink-0 text-text-muted transition duration-fast',
            isOpen ? 'rotate-180 text-primary' : 'group-hover:text-text-secondary',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className={[
            'absolute left-0 z-[150] min-w-full overflow-hidden rounded-xl bg-surface-card/95 p-1.5 shadow-[0_26px_46px_-28px_rgba(15,23,42,0.52)] ring-1 ring-border-soft/80 backdrop-blur-sm',
            openAbove ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]',
          ].join(' ')}
          role="listbox"
          aria-label={ariaLabel}
        >
          <div className="grid gap-1">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition duration-fast',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-text-secondary hover:bg-primary/10 hover:text-text-primary',
                  ].join(' ')}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const calendarLocale = i18n.language === 'ru' ? ru : uz;
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    interval: 'day',
  });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const query = useMemo(() => buildDashboardQuery(filters), [filters]);
  const intervalOptions = useMemo(
    () => [
      { value: 'day' as const, label: t('dashboard.filters.intervals.day') },
      { value: 'week' as const, label: t('dashboard.filters.intervals.week') },
      { value: 'month' as const, label: t('dashboard.filters.intervals.month') },
    ],
    [t],
  );

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setHasError(false);

      try {
        const nextOverview = await services.dashboard.getOverview(query);

        if (!active) {
          return;
        }

        setOverview(nextOverview);
      } catch {
        if (!active) {
          return;
        }
        setHasError(true);
        setOverview(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      active = false;
    };
  }, [query]);

  const trendChartConfig = useMemo(
    () =>
      ({
        leads: {
          label: t('dashboard.metrics.leads'),
          color: 'rgb(var(--color-primary))',
        },
        customers: {
          label: t('dashboard.metrics.customers'),
          color: 'rgb(var(--color-success))',
        },
        orders: {
          label: t('dashboard.metrics.orders'),
          color: 'rgb(var(--color-info))',
        },
      }) satisfies ChartConfig,
    [t],
  );

  const sourceChartConfig = useMemo(
    () =>
      ({
        count: {},
      }) satisfies ChartConfig,
    [],
  );

  const statusChartConfig = useMemo(
    () =>
      ({
        count: {},
      }) satisfies ChartConfig,
    [],
  );

  if (loading) {
    return (
      <PageLayout>
        <section className="rounded-xl bg-surface-card p-7 shadow-sm ring-1 ring-border-soft/40">
          <h1 className="m-0 font-display text-[2rem] font-extrabold text-text-primary">
            {t('dashboard.loadingTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('dashboard.loadingDescription')}
          </p>
        </section>
      </PageLayout>
    );
  }

  if (hasError || !overview) {
    return (
      <PageLayout>
        <section className="rounded-xl bg-surface-card p-7 shadow-sm ring-1 ring-border-soft/40">
          <h1 className="m-0 font-display text-[2rem] font-extrabold text-text-primary">
            {t('dashboard.errorTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('dashboard.errorDescription')}
          </p>
        </section>
      </PageLayout>
    );
  }

  const localizedTimeSeries = overview.time_series.map((point) => ({
    ...point,
    localizedLabel: formatSeriesLabel(point.bucket_start, locale, i18n.language),
  }));
  const sourceTotal = overview.breakdowns.leads_by_source.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const displaySourceItems = pickForDisplay(overview.breakdowns.leads_by_source, 5);
  const displaySourceTotal = displaySourceItems.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const sourcePieData: PieSlice[] =
    displaySourceTotal <= 0
      ? [
          {
            key: 'empty',
            label: t('dashboard.noLeads'),
            count: 1,
            color: 'rgb(var(--color-border-soft) / 0.55)',
            share: 100,
          },
        ]
      : displaySourceItems.map((item, index) => ({
          ...item,
          label: getChannelLabel(t, item.key, item.label),
          color:
            SOURCE_COLORS[item.key] ??
            SOURCE_COLORS_FALLBACK[index % SOURCE_COLORS_FALLBACK.length]!,
          share: (item.count / displaySourceTotal) * 100,
        }));

  const leadStatusData = pickForDisplay(overview.breakdowns.leads_by_status, 6).map(
    (item) => ({
      ...item,
      label: getLeadStatusLabel(t, item.key as LeadStatus, item.label),
    }),
  );
  const leadStatusTotal = leadStatusData.reduce((sum, item) => sum + item.count, 0);
  const leadStatusPieData: PieSlice[] =
    leadStatusTotal <= 0
      ? [
          {
            key: 'empty',
            label: t('dashboard.noLeads'),
            count: 1,
            color: 'rgb(var(--color-border-soft) / 0.55)',
            share: 100,
          },
        ]
      : leadStatusData.map((item, index) => ({
          ...item,
          color:
            LEAD_STATUS_COLORS[item.key] ??
            LEAD_STATUS_COLORS_FALLBACK[index % LEAD_STATUS_COLORS_FALLBACK.length]!,
          share: (item.count / leadStatusTotal) * 100,
        }));
  const orderStatusData = pickForDisplay(overview.breakdowns.orders_by_status, 4).map(
    (item) => ({
      ...item,
      label: getOrderStatusLabel(t, item.key, item.label),
    }),
  );
  const paymentStatusData = pickForDisplay(
    overview.breakdowns.payments_by_status,
    4,
  ).map((item) => ({
    ...item,
    label: getPaymentStatusLabel(t, item.key, item.label),
  }));
  const chatChannelData = pickForDisplay(overview.breakdowns.chats_by_channel, 4).map(
    (item) => ({
      ...item,
      label: getChannelLabel(t, item.key, item.label),
    }),
  );
  const metricCards = [
    {
      label: t('dashboard.metrics.leads'),
      value: formatCount(overview.leads, locale),
      hint: `${formatCount(overview.filtered_summary.new_leads, locale)} ${t('dashboard.metrics.newLeads')}`,
    },
    {
      label: t('dashboard.metrics.customers'),
      value: formatCount(overview.customers, locale),
      hint: `${formatCount(overview.filtered_summary.new_customers, locale)} ${t('dashboard.metrics.newCustomers')}`,
    },
    {
      label: t('dashboard.metrics.orders'),
      value: formatCount(overview.orders, locale),
      hint: `${formatCount(overview.filtered_summary.completed_orders, locale)} ${t('dashboard.metrics.completed')}`,
    },
    {
      label: t('dashboard.metrics.pendingPayments'),
      value: formatCount(overview.pending_payments, locale),
      hint: `${formatAmount(overview.filtered_summary.pending_payment_amount, locale)} ${t('dashboard.metrics.pending')}`,
    },
    {
      label: t('dashboard.metrics.unreadMessages'),
      value: formatCount(overview.unread_messages, locale),
      hint: `${formatCount(overview.filtered_summary.active_chat_sessions, locale)} ${t('dashboard.metrics.activeSessions')}`,
    },
    {
      label: t('dashboard.metrics.revenue'),
      value: formatAmount(overview.filtered_summary.collected_amount, locale),
      hint: `${formatAmount(overview.filtered_summary.pending_payment_amount, locale)} ${t('dashboard.metrics.pending')}`,
    },
  ];

  const rangeLabel = `${formatDateLabel(
    overview.date_range.date_from,
    locale,
    i18n.language,
  )} - ${formatDateLabel(overview.date_range.date_to, locale, i18n.language)}`;
  const selectedDateRange: DateRange | undefined =
    isIsoDate(filters.customDateFrom) && isIsoDate(filters.customDateTo)
      ? {
          from: parseIsoDate(filters.customDateFrom),
          to: parseIsoDate(filters.customDateTo),
        }
      : undefined;
  const dateRangeButtonLabel =
    selectedDateRange?.from && selectedDateRange?.to
      ? `${formatLocalizedDate(selectedDateRange.from, i18n.language, {
          locale,
          withYear: true,
          shortMonth: true,
        })} - ${formatLocalizedDate(selectedDateRange.to, i18n.language, {
          locale,
          withYear: true,
          shortMonth: true,
        })}`
      : t('dashboard.filters.pickRange');

  return (
    <PageLayout>
      <section className="grid gap-4 min-[768px]:gap-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 font-display text-[clamp(2rem,3.2vw,3rem)] font-extrabold leading-none tracking-[-0.04em] text-text-primary">
              {t('dashboard.title')}
            </h1>
            <p className="mt-2 text-[1.02rem] text-text-secondary">
              {rangeLabel} ({overview.date_range.timezone})
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 min-w-[248px] items-center justify-between gap-2 rounded-pill border border-border-soft/70 bg-gradient-to-b from-surface-card to-surface-subtle/80 px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary shadow-[0_15px_26px_-22px_rgba(37,99,235,0.6)] transition duration-fast hover:border-primary/45 hover:text-text-primary"
                  aria-label={t('dashboard.filters.customRange')}
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <AppIcon
                      name="calendar"
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span className="truncate">{dateRangeButtonLabel}</span>
                  </span>
                  <AppIcon
                    name="chevron-down"
                    className={[
                      'h-3.5 w-3.5 shrink-0 transition duration-fast',
                      isDatePopoverOpen
                        ? 'rotate-180 text-primary'
                        : 'text-text-muted',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <Calendar
                  mode="range"
                  selected={selectedDateRange}
                  defaultMonth={
                    selectedDateRange?.to ??
                    selectedDateRange?.from ??
                    new Date()
                  }
                  locale={calendarLocale}
                  formatters={
                    i18n.language === 'uz'
                      ? {
                          formatCaption: (date) =>
                            formatUzMonthYear(date, false),
                        }
                      : undefined
                  }
                  onSelect={(range: DateRange | undefined) => {
                    if (!range?.from) {
                      setFilters((current) => ({
                        ...current,
                        customDateFrom: undefined,
                        customDateTo: undefined,
                      }));
                      return;
                    }

                    const from = toIsoDate(range.from);
                    const to = toIsoDate(range.to ?? range.from);

                    setFilters((current) => ({
                      ...current,
                      customDateFrom: from,
                      customDateTo: to,
                    }));

                    if (range.to) {
                      setIsDatePopoverOpen(false);
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-soft/70 pt-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary transition duration-fast hover:bg-surface-subtle hover:text-text-primary"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        customDateFrom: undefined,
                        customDateTo: undefined,
                      }))
                    }
                  >
                    {t('dashboard.filters.clearRange')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition duration-fast hover:bg-primary-accent"
                    onClick={() => setIsDatePopoverOpen(false)}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <DashboardIntervalDropdown
              value={filters.interval}
              options={intervalOptions}
              onChange={(interval) =>
                setFilters((current) => ({
                  ...current,
                  interval,
                }))
              }
              ariaLabel={t('dashboard.filters.intervalLabel')}
            />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <article
              key={card.label}
              className="rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                {card.label}
              </p>
              <p className="mt-1.5 font-display text-[1.85rem] font-extrabold text-text-primary">
                {card.value}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-text-secondary">
                {card.hint}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="rounded-xl bg-surface-card p-5 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
            <h2 className="m-0 text-[1.14rem] font-semibold text-text-primary">
              {t('dashboard.sections.trend')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t('dashboard.descriptions.trend')}
            </p>
            <div className="mt-4 h-[290px]">
              <ChartContainer config={trendChartConfig} className="h-full w-full">
                <LineChart data={localizedTimeSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="0"
                    stroke="rgb(var(--color-border-soft) / 0.34)"
                  />
                  <XAxis
                    dataKey="localizedLabel"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    width={26}
                    allowDecimals={false}
                    className="text-[11px] font-semibold text-text-muted"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="rgb(var(--color-primary))"
                    strokeWidth={2.4}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="customers"
                    stroke="rgb(var(--color-success))"
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="rgb(var(--color-info))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </article>

          <article className="rounded-xl bg-surface-card p-5 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
            <h2 className="m-0 text-[1.08rem] font-semibold text-text-primary">
              {t('dashboard.sections.source')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t('dashboard.descriptions.source')}
            </p>
            <div className="relative mt-4 grid place-items-center rounded-xl border border-border-soft/60 bg-surface-subtle/65 p-3">
              <div className="h-[198px] w-[198px]">
                <ChartContainer config={sourceChartConfig} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={sourcePieData}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={3}
                      cornerRadius={7}
                      stroke="rgb(var(--color-border-soft) / 0.45)"
                      strokeWidth={2}
                    >
                      {sourcePieData.map((item) => (
                        <Cell key={item.key} fill={item.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value) =>
                            `${value ?? 0} ${t('dashboard.metrics.leads').toLowerCase()}`
                          }
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="rounded-full bg-surface-card/90 px-3 py-1.5 text-center shadow-sm ring-1 ring-border-soft/60 backdrop-blur-sm">
                  <p className="font-display text-[1.2rem] font-extrabold leading-none text-text-primary">
                    {formatCount(sourceTotal, locale)}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-text-muted">
                    {t('dashboard.totalLeads')}
                  </p>
                </div>
              </div>
            </div>
            <ul className="mt-3 grid list-none gap-2 p-0">
              {sourcePieData[0]?.key === 'empty' ? (
                <li className="rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm font-medium text-text-secondary">
                  {t('dashboard.sourceDataHint')}
                </li>
              ) : (
                sourcePieData.map((item) => (
                  <li key={item.key} className="rounded-lg bg-surface-subtle/85 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                        <span>{formatCount(item.count, locale)}</span>
                        <span className="rounded-pill bg-surface-card px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-text-muted">
                          {formatPercent(item.share)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-soft/35">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${item.share > 0 ? Math.max(item.share, 6) : 0}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-xl bg-surface-card p-5 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
            <h2 className="m-0 text-[1.14rem] font-semibold text-text-primary">
              {t('dashboard.sections.leadStatus')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t('dashboard.descriptions.leadStatus')}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="relative grid place-items-center rounded-xl border border-border-soft/60 bg-surface-subtle/65 p-3">
                <div className="h-[210px] w-[210px]">
                  <ChartContainer config={statusChartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie
                        data={leadStatusPieData}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        cornerRadius={6}
                        stroke="rgb(var(--color-border-soft) / 0.45)"
                        strokeWidth={2}
                      >
                        {leadStatusPieData.map((item) => (
                          <Cell key={item.key} fill={item.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value) =>
                              `${value ?? 0} ${t('dashboard.metrics.leads').toLowerCase()}`
                            }
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="rounded-full bg-surface-card/90 px-3 py-1.5 text-center shadow-sm ring-1 ring-border-soft/60 backdrop-blur-sm">
                    <p className="font-display text-[1.2rem] font-extrabold leading-none text-text-primary">
                      {formatCount(leadStatusTotal, locale)}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-text-muted">
                      {t('dashboard.totalLeads')}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="grid list-none gap-2 p-0">
                {leadStatusPieData[0]?.key === 'empty' ? (
                  <li className="rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm font-medium text-text-secondary">
                    {t('dashboard.sourceDataHint')}
                  </li>
                ) : (
                  leadStatusPieData.map((item) => (
                    <li key={item.key} className="rounded-lg bg-surface-subtle/85 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                          <span>{formatCount(item.count, locale)}</span>
                          <span className="rounded-pill bg-surface-card px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-text-muted">
                            {formatPercent(item.share)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-soft/35">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${item.share > 0 ? Math.max(item.share, 6) : 0}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </article>

          <article className="rounded-xl bg-surface-card p-5 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
            <h2 className="m-0 text-[1.14rem] font-semibold text-text-primary">
              {t('dashboard.sections.performance')}
            </h2>
            <ul className="mt-4 grid list-none gap-2 p-0">
              <li className="flex items-center justify-between rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm">
                <span className="text-text-secondary">
                  {t('dashboard.performance.leadConversionRate')}
                </span>
                <span className="font-semibold text-text-primary">
                  {formatPercent(overview.filtered_summary.lead_conversion_rate)}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm">
                <span className="text-text-secondary">
                  {t('dashboard.performance.orderCompletionRate')}
                </span>
                <span className="font-semibold text-text-primary">
                  {formatPercent(overview.filtered_summary.order_completion_rate)}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-surface-subtle/85 px-3 py-2.5 text-sm">
                <span className="text-text-secondary">
                  {t('dashboard.performance.averageOrderValue')}
                </span>
                <span className="font-semibold text-text-primary">
                  {formatAmount(overview.filtered_summary.average_order_value, locale)}
                </span>
              </li>
            </ul>

            <div className="mt-4 grid gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('dashboard.sections.orderStatus')}
                </p>
                <ul className="mt-1.5 flex list-none flex-wrap gap-1.5 p-0">
                  {orderStatusData.map((item) => {
                    const tone = getOrderStatusTone(item.key);
                    return (
                      <li
                        key={item.key}
                        className={`${CHIP_BASE_CLASS_NAME} ${CHIP_TONE_CLASS_NAMES[tone]}`}
                      >
                        {item.label}
                        <span className="font-bold">{formatCount(item.count, locale)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('dashboard.sections.paymentStatus')}
                </p>
                <ul className="mt-1.5 flex list-none flex-wrap gap-1.5 p-0">
                  {paymentStatusData.map((item) => {
                    const tone = getPaymentStatusTone(item.key);
                    return (
                      <li
                        key={item.key}
                        className={`${CHIP_BASE_CLASS_NAME} ${CHIP_TONE_CLASS_NAMES[tone]}`}
                      >
                        {item.label}
                        <span className="font-bold">{formatCount(item.count, locale)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('dashboard.sections.chatChannels')}
                </p>
                <ul className="mt-1.5 flex list-none flex-wrap gap-1.5 p-0">
                  {chatChannelData.map((item) => {
                    const channelStyle = getChannelChipStyle(item.key);
                    return (
                      <li
                        key={item.key}
                        className={`${CHIP_BASE_CLASS_NAME} ${channelStyle ? '' : CHIP_TONE_CLASS_NAMES.neutral}`}
                        style={channelStyle}
                      >
                        {item.label}
                        <span className="font-bold">{formatCount(item.count, locale)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </article>
        </section>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;
