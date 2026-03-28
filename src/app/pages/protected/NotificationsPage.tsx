import { useEffect, useMemo, useState } from 'react';
import {
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
} from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import NotificationDetailPanel from '../../../features/notifications/components/NotificationDetailPanel';
import NotificationDeleteAllDialog from '../../../features/notifications/components/NotificationDeleteAllDialog';
import NotificationList from '../../../features/notifications/components/NotificationList';
import { getNotificationChannelLabel } from '../../../features/notifications/utils/notification-format';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  AppNotification,
  EntityId,
  NotificationChannel,
  PaginationMeta,
  SelectOption,
} from '../../../types/domain';

type NotificationOrdering = '-created_at' | 'created_at' | '-updated_at' | 'updated_at';
type ChannelFilter = 'all' | NotificationChannel;
type ReadFilter = 'all' | 'read' | 'unread';

const PAGE_SIZE = 9;
const DEFAULT_ORDERING: NotificationOrdering = '-created_at';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function toBooleanReadFilter(value: ReadFilter): boolean | undefined {
  if (value === 'read') {
    return true;
  }

  if (value === 'unread') {
    return false;
  }

  return undefined;
}

function NotificationsPage() {
  const [search, setSearch] = usePersistentState('notifications:search', '');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [ordering, setOrdering] = useState<NotificationOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    DEFAULT_PAGINATION_META,
  );

  const [selectedNotificationId, setSelectedNotificationId] = useState<EntityId | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadCursor, setReloadCursor] = useState(0);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, channelFilter, readFilter, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadNotifications() {
      setIsLoading(true);
      setHasError(false);

      try {
        const result = await services.notifications.listNotifications({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          channel: channelFilter === 'all' ? undefined : channelFilter,
          is_read: toBooleanReadFilter(readFilter),
          ordering,
        });

        if (!isActive) {
          return;
        }

        if (currentPage > result.meta.totalPages) {
          setCurrentPage(result.meta.totalPages);
          return;
        }

        setNotifications(result.items);
        setPaginationMeta(result.meta);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setNotifications([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isActive = false;
    };
  }, [channelFilter, currentPage, ordering, readFilter, reloadCursor, search]);

  const channelOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: 'Barcha kanallar' },
      { value: 'in_app', label: getNotificationChannelLabel('in_app') },
      { value: 'telegram', label: getNotificationChannelLabel('telegram') },
      { value: 'system', label: getNotificationChannelLabel('system') },
    ],
    [],
  );

  const readOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: 'Barchasi' },
      { value: 'read', label: "O'qilgan" },
      { value: 'unread', label: "O'qilmagan" },
    ],
    [],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: "Qo'shilgan sana (yangi)" },
      { value: 'created_at', label: "Qo'shilgan sana (eski)" },
      { value: '-updated_at', label: 'Yangilangan sana (yangi)' },
      { value: 'updated_at', label: 'Yangilangan sana (eski)' },
    ],
    [],
  );

  function handleNotificationRead(updated: AppNotification) {
    setNotifications((current) => {
      if (readFilter === 'unread') {
        return current.filter((notification) => notification.id !== updated.id);
      }

      return current.map((notification) =>
        notification.id === updated.id ? updated : notification,
      );
    });
    setReloadCursor((current) => current + 1);
  }

  async function handleMarkAllRead() {
    if (isMarkingAllRead || isDeletingAll || isLoading) {
      return;
    }

    setBulkActionError(null);
    setIsMarkingAllRead(true);

    try {
      await services.notifications.markAllRead();
      setReloadCursor((current) => current + 1);
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch {
      setBulkActionError("Barchasini o'qilgan qilishda xatolik yuz berdi.");
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  async function handleDeleteAll() {
    if (isDeletingAll || isMarkingAllRead || isLoading) {
      return;
    }

    setBulkActionError(null);
    setIsDeletingAll(true);

    try {
      await services.notifications.deleteAll();
      setSelectedNotificationId(null);
      setCurrentPage(1);
      setReloadCursor((current) => current + 1);
      setIsDeleteAllDialogOpen(false);
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch {
      setBulkActionError("Barchasini o'chirishda xatolik yuz berdi.");
    } finally {
      setIsDeletingAll(false);
    }
  }

  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(channelFilter !== 'all') +
    Number(readFilter !== 'all') +
    Number(ordering !== DEFAULT_ORDERING);
  const hasNotifications = paginationMeta.totalItems > 0;

  const header = (
    <PageHeader
      eyebrow="Bildirishnomalar"
      title="Bildirishnomalar"
      subtitle="Muhim voqealar va yangilanishlarni kuzating"
      actions={
        <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
          <AppIcon name="notifications" className="h-3.5 w-3.5" aria-hidden="true" />
          {paginationMeta.totalItems} ta
        </span>
      }
    />
  );

  if (!hasLoadedOnce && isLoading) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <LoadingState
              title="Yuklanmoqda..."
              description="Bildirishnomalar ro'yxati yuklanmoqda."
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (hasError) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <EmptyState
              title="Bildirishnomani yuklab bo'lmadi"
              description="Sahifani yangilab qayta urinib ko'ring."
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout header={header}>
      <PageSection>
        <FilterBar
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 max-[820px]:justify-start min-[820px]:w-auto min-[820px]:justify-end">
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary/12 px-3 text-sm font-semibold text-text-accent">
                  <AppIcon name="filter" className="h-4 w-4" aria-hidden="true" />
                  {activeFilterCount} ta filter faol
                </span>
              ) : null}
              {selectedNotificationId ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-info-bg px-3 text-sm font-semibold text-info">
                  Tafsilot paneli ochiq
                </span>
              ) : null}
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void handleMarkAllRead();
                }}
                disabled={!hasNotifications || isMarkingAllRead || isDeletingAll || isLoading}
              >
                {isMarkingAllRead ? "Belgilanmoqda..." : "Barchasini o'qilgan qilish"}
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-danger-bg px-3.5 text-sm font-semibold text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  setIsDeleteAllDialogOpen(true);
                }}
                disabled={!hasNotifications || isDeletingAll || isMarkingAllRead || isLoading}
              >
                {isDeletingAll ? "O'chirilmoqda..." : "Barchasini o'chirish"}
              </button>
            </div>
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Bildirishnoma qidirish"
          />

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
            <span className={labelClassName}>Kanal</span>
            <FilterSelect
              value={channelFilter}
              options={channelOptions}
              onChange={(value) => setChannelFilter(value as ChannelFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_180px]">
            <span className={labelClassName}>Holat</span>
            <FilterSelect
              value={readFilter}
              options={readOptions}
              onChange={(value) => setReadFilter(value as ReadFilter)}
              disabled={isLoading}
            />
          </label>

          <label className="grid min-w-[min(220px,100%)] flex-[1_1_220px] gap-1.5 min-[640px]:flex-[0_1_240px]">
            <span className={labelClassName}>Saralash</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as NotificationOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        {bulkActionError ? (
          <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
            {bulkActionError}
          </p>
        ) : null}

        <PageCard>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                Bildirishnomalar ro'yxati
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                O'qilmaganlar alohida ajratib ko'rsatiladi
              </span>
            </div>

            <NotificationList
              notifications={notifications}
              selectedNotificationId={selectedNotificationId}
              isLoading={isLoading}
              hasError={false}
              isFiltered={
                search.trim().length > 0 || channelFilter !== 'all' || readFilter !== 'all'
              }
              onSelectNotification={setSelectedNotificationId}
            />
          </div>
        </PageCard>

        {!isLoading && paginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, paginationMeta.totalPages)}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </PageSection>

      {selectedNotificationId ? (
        <NotificationDetailPanel
          notificationId={selectedNotificationId}
          onClose={() => setSelectedNotificationId(null)}
          onNotificationRead={handleNotificationRead}
        />
      ) : null}

      {isDeleteAllDialogOpen ? (
        <NotificationDeleteAllDialog
          isDeleting={isDeletingAll}
          onCancel={() => {
            if (!isDeletingAll) {
              setIsDeleteAllDialogOpen(false);
            }
          }}
          onConfirm={() => {
            void handleDeleteAll();
          }}
        />
      ) : null}
    </PageLayout>
  );
}

export default NotificationsPage;
