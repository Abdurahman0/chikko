import { useEffect, useState } from 'react';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { StatusBadge } from '../../../components/shared/data';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { services } from '../../../services';
import type { AppNotification, EntityId } from '../../../types/domain';
import {
  formatNotificationDateTime,
  formatNotificationMessage,
  formatNotificationTitle,
  getFormattedNotificationMetadata,
  getNotificationChannelClassName,
  getNotificationChannelLabel,
  getNotificationReadLabel,
  getNotificationUserLabel,
} from '../utils/notification-format';

interface NotificationDetailPanelProps {
  notificationId: EntityId;
  onClose: () => void;
  onNotificationRead: (notification: AppNotification) => void;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

function NotificationDetailPanel({
  notificationId,
  onClose,
  onNotificationRead,
}: NotificationDetailPanelProps) {
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const locale = 'uz-UZ';
  const metadataEntries = notification
    ? getFormattedNotificationMetadata(notification.metadata, notification.user)
    : [];

  useEffect(() => {
    let isActive = true;

    async function loadNotification() {
      setIsLoading(true);
      setHasError(false);

      try {
        let resolvedNotification = await services.notifications.getNotificationById(
          notificationId,
        );
        if (!isActive) {
          return;
        }

        if (resolvedNotification && !resolvedNotification.is_read) {
          try {
            const updatedNotification = await services.notifications.markNotificationRead(
              resolvedNotification.id,
            );

            if (!isActive) {
              return;
            }

            if (updatedNotification) {
              resolvedNotification = updatedNotification;
              onNotificationRead(updatedNotification);
              window.dispatchEvent(new CustomEvent('notifications:changed'));
            }
          } catch {
            // Keep detail available even if marking read fails.
          }
        }

        setNotification(resolvedNotification);
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setNotification(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadNotification();

    return () => {
      isActive = false;
    };
  }, [notificationId, onNotificationRead]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label="Bildirishnoma tafsilotlari"
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40 transition duration-base hover:shadow-md hover:ring-border-soft/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Bildirishnoma
              </p>
              <h2 className="mt-1 font-display text-[1.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
                {notification ? formatNotificationTitle(notification.title) : "Bildirishnoma tafsilotlari"}
              </h2>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
              aria-label="Tafsilot panelini yopish"
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>

          {!isLoading && notification ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={[
                  'inline-flex min-h-7 items-center rounded-pill px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
                  getNotificationChannelClassName(notification.channel),
                ].join(' ')}
              >
                {getNotificationChannelLabel(notification.channel)}
              </span>
              <StatusBadge
                status={notification.is_read ? 'read' : 'unread'}
                label={getNotificationReadLabel(notification.is_read)}
              />
            </div>
          ) : null}
        </header>

        <div className="grid gap-3">
          {isLoading ? (
            <LoadingState
              title="Yuklanmoqda..."
              description="Bildirishnoma tafsilotlari olinmoqda."
            />
          ) : null}

          {!isLoading && (hasError || !notification) ? (
            <EmptyState
              title="Bildirishnoma topilmadi"
              description="Tanlangan bildirishnoma ma'lumotlarini yuklab bo'lmadi."
            />
          ) : null}

          {!isLoading && notification ? (
            <>
              <PageCard>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                      Matn
                    </h3>
                    <p className="m-0 text-sm text-text-secondary">
                      To'liq bildirishnoma xabari.
                    </p>
                  </div>

                  <div className="rounded-lg bg-surface-subtle/80 p-3">
                    <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-text-primary">
                      {formatNotificationMessage(notification.message)}
                    </p>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <div className="grid gap-4">
                  <h3 className="m-0 text-[1rem] font-semibold text-text-primary">
                    Tafsilotlar
                  </h3>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>Kanal</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {getNotificationChannelLabel(notification.channel)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>Holat</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {getNotificationReadLabel(notification.is_read)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>Qo'shilgan</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {formatNotificationDateTime(notification.created_at, locale)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3">
                      <p className={labelClassName}>Yangilangan</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {formatNotificationDateTime(notification.updated_at, locale)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
                      <p className={labelClassName}>Foydalanuvchi</p>
                      <p className={`mt-1 ${valueClassName}`}>
                        {getNotificationUserLabel(notification.user)}
                      </p>
                    </div>

                    {metadataEntries.length > 0 ? (
                      <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
                        <p className={labelClassName}>Qo'shimcha ma'lumot</p>
                        <ul className="mt-2 grid list-none gap-1.5 p-0">
                          {metadataEntries.map((entry) => (
                            <li key={entry.key} className="text-sm text-text-secondary">
                              <span className="font-semibold text-text-primary">{entry.label}:</span>{' '}
                              {entry.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </PageCard>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default NotificationDetailPanel;
