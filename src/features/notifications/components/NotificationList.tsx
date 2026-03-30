import { EmptyState, LoadingState } from '../../../components/shared/page';
import { StatusBadge } from '../../../components/shared/data';
import type { AppNotification, EntityId } from '../../../types/domain';
import {
  formatNotificationMessage,
  formatNotificationDateTime,
  formatNotificationTitle,
  getNotificationUserLabel,
  getNotificationChannelClassName,
  getNotificationChannelLabel,
} from '../utils/notification-format';

interface NotificationListProps {
  notifications: AppNotification[];
  selectedNotificationId: EntityId | null;
  isLoading: boolean;
  hasError: boolean;
  isFiltered: boolean;
  onSelectNotification: (notificationId: EntityId) => void;
}

function shortenMessage(message: string): string {
  if (message.length <= 140) {
    return message;
  }

  return `${message.slice(0, 137)}...`;
}

function NotificationList({
  notifications,
  selectedNotificationId,
  isLoading,
  hasError,
  isFiltered,
  onSelectNotification,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <LoadingState
        title="Yuklanmoqda..."
        description="Bildirishnomalar ro'yxati olinmoqda."
      />
    );
  }

  if (hasError) {
    return (
      <EmptyState
        title="Bildirishnomani yuklab bo'lmadi"
        description="Xatolik sababli ro'yxatni olishning imkoni bo'lmadi."
      />
    );
  }

  if (!notifications.length) {
    return (
      <EmptyState
        title={isFiltered ? 'Bildirishnoma topilmadi' : "Hozircha bildirishnomalar yo'q"}
        description={
          isFiltered
            ? "Qidiruv yoki filterlarni o'zgartirib qayta urinib ko'ring."
            : "Yangi hodisalar paydo bo'lganda bu yerda ko'rsatiladi."
        }
      />
    );
  }

  return (
    <div className="grid gap-2.5">
      {notifications.map((notification) => {
        const isSelected = selectedNotificationId === notification.id;
        const isUnread = !notification.is_read;
        const notificationTitle = formatNotificationTitle(notification.title);
        const notificationMessage = formatNotificationMessage(notification.message);
        const notificationUserLabel = getNotificationUserLabel(
          notification.user,
          notification.metadata,
        );

        return (
          <button
            key={notification.id}
            type="button"
            className={[
              'w-full rounded-xl border-0 px-3.5 py-3 text-left shadow-sm ring-1 transition duration-fast',
              isSelected
                ? 'bg-primary/12 ring-primary/40'
                : 'bg-surface-card ring-border-soft/45 hover:bg-surface-subtle hover:ring-border-soft/70',
              isUnread ? 'shadow-[0_12px_24px_-20px_rgb(var(--color-primary)/0.75)]' : '',
            ].join(' ')}
            onClick={() => onSelectNotification(notification.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isUnread ? (
                    <span
                      className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                  <p
                    className={[
                      'm-0 text-sm leading-5 text-text-primary [overflow-wrap:anywhere]',
                      isUnread ? 'font-semibold' : 'font-medium',
                    ].join(' ')}
                  >
                    {notificationTitle}
                  </p>
                </div>
                <p className="m-0 mt-1 text-[13px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]">
                  {shortenMessage(notificationMessage)}
                </p>
              </div>

              <span className="shrink-0 text-[11px] font-medium text-text-muted">
                {formatNotificationDateTime(notification.updated_at, 'uz-UZ')}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
                label={notification.is_read ? "O'qilgan" : "O'qilmagan"}
              />
              <span className="text-[11px] font-medium text-text-muted">
                {notificationUserLabel}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default NotificationList;
