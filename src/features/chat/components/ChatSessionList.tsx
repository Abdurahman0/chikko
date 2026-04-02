import { FaInstagram, FaTelegramPlane } from 'react-icons/fa';
import { FiAlertTriangle, FiEdit3, FiGlobe } from 'react-icons/fi';
import { EmptyState, LoadingState } from '../../../components/shared/page';
import type { Conversation, EntityId } from '../../../types/domain';

interface ChatSessionListProps {
  sessions: Conversation[];
  selectedSessionId: EntityId | null;
  unreadBySessionId: Record<string, number>;
  isLoading: boolean;
  hasError: boolean;
  onSelectSession: (sessionId: EntityId) => void;
}

const channelClassNameByValue: Record<Conversation['channel'], string> = {
  telegram: 'bg-[rgb(32_156_238_/_0.14)] text-[rgb(12_114_181)]',
  instagram: 'bg-[rgb(225_48_108_/_0.14)] text-[rgb(176_32_87)]',
  web: 'bg-info-bg text-info',
  manual: 'bg-surface-subtle text-text-secondary',
};

const channelDotClassNameByValue: Record<Conversation['channel'], string> = {
  telegram: 'bg-[rgb(32_156_238_/_0.9)] text-white',
  instagram: 'bg-[rgb(225_48_108_/_0.92)] text-white',
  web: 'bg-info text-white',
  manual: 'bg-neutral text-white',
};

const sessionStateLabel: Record<Conversation['state'], string> = {
  open: 'Ochiq',
  pending: 'Kutilmoqda',
  resolved: 'Yakunlangan',
};

const channelLabelByValue: Record<Conversation['channel'], string> = {
  telegram: 'Telegram',
  instagram: 'Instagram',
  web: 'Veb',
  manual: "Qo'lda",
};

const avatarGradientByChannel: Record<Conversation['channel'], string> = {
  telegram: 'from-sky-500 to-blue-600',
  instagram: 'from-fuchsia-500 to-pink-600',
  web: 'from-indigo-500 to-blue-700',
  manual: 'from-amber-500 to-orange-600',
};

function formatSessionTime(value: string | null): string {
  if (!value) {
    return "Vaqt yo'q";
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getSessionTitle(session: Conversation): string {
  const stateRecord =
    session.state_data && typeof session.state_data === 'object' && !Array.isArray(session.state_data)
      ? (session.state_data as Record<string, unknown>)
      : null;
  const stateCustomerName =
    typeof stateRecord?.customer_name === 'string'
      ? stateRecord.customer_name.trim()
      : '';

  return (
    stateCustomerName ||
    (session.customer?.fullName ??
      session.lead?.fullName ??
      session.external_id ??
      "Noma'lum chat")
  );
}

function getInitial(title: string): string {
  const normalized = title.trim();
  if (!normalized) {
    return '?';
  }

  return normalized.charAt(0).toUpperCase();
}

function hasAiPause(session: Conversation): boolean {
  if (!session.ai_paused_until) {
    return false;
  }

  return new Date(session.ai_paused_until).getTime() > Date.now();
}

function ChannelIcon({ channel, className }: { channel: Conversation['channel']; className: string }) {
  if (channel === 'telegram') {
    return <FaTelegramPlane className={className} />;
  }

  if (channel === 'instagram') {
    return <FaInstagram className={className} />;
  }

  if (channel === 'web') {
    return <FiGlobe className={className} />;
  }

  return <FiEdit3 className={className} />;
}

function ChatSessionList({
  sessions,
  selectedSessionId,
  unreadBySessionId,
  isLoading,
  hasError,
  onSelectSession,
}: ChatSessionListProps) {
  const prioritizedSessions: Conversation[] = [];
  const regularSessions: Conversation[] = [];

  sessions.forEach((session) => {
    if (session.operator_needed) {
      prioritizedSessions.push(session);
      return;
    }

    regularSessions.push(session);
  });

  const visibleSessions = [...prioritizedSessions, ...regularSessions];

  if (isLoading) {
    return (
      <LoadingState
        title="Suhbatlar yuklanmoqda"
        description="Suhbat sessiyalari ro'yxati olinmoqda."
      />
    );
  }

  if (hasError) {
    return (
      <EmptyState
        title="Suhbatlarni yuklab bo'lmadi"
        description="Chat sessiyalarini qayta yuklab urinib ko'ring."
      />
    );
  }

  if (!sessions.length) {
    return (
      <EmptyState
        title="Suhbat topilmadi"
        description="Qidiruv yoki filtrlarni o'zgartirib qayta urinib ko'ring."
      />
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-2 pb-1 pr-1">
      {visibleSessions.map((session) => {
        const isSelected = selectedSessionId === session.id;
        const unreadCount = unreadBySessionId[session.id] ?? 0;
        const aiPaused = hasAiPause(session);
        const title = getSessionTitle(session);

        return (
          <button
            key={session.id}
            type="button"
            className={[
              'group relative w-full min-w-0 overflow-hidden rounded-2xl border-0 p-3 text-left transition duration-fast',
              'shadow-[0_10px_22px_-18px_rgba(15,23,42,0.9)] ring-1',
              isSelected
                ? 'bg-primary/12 ring-primary/40'
                : 'bg-surface-card/88 ring-border-soft/45 hover:bg-surface-subtle/88',
            ].join(' ')}
            onClick={() => onSelectSession(session.id)}
          >
            {isSelected ? (
              <span className="absolute inset-y-2 left-1 w-1 rounded-pill bg-primary" />
            ) : null}

            <div className="flex min-w-0 items-start gap-3">
              <span
                className={[
                  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white',
                  `bg-gradient-to-br ${avatarGradientByChannel[session.channel]}`,
                ].join(' ')}
                aria-hidden="true"
              >
                {getInitial(title)}
                <span
                  className={[
                    'absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface-card',
                    channelDotClassNameByValue[session.channel],
                  ].join(' ')}
                >
                  <ChannelIcon channel={session.channel} className="h-2.5 w-2.5" />
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className="m-0 truncate text-sm font-semibold text-text-primary">
                    {title}
                  </p>
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-pill bg-danger px-2 text-[11px] font-bold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex min-h-6 items-center rounded-pill bg-surface-subtle px-2 text-[11px] font-semibold text-text-secondary ring-1 ring-border-soft/45">
                    {formatSessionTime(session.last_message_at)}
                  </span>
                </div>

                <p className="m-0 mt-1.5 truncate text-[12px] text-text-secondary">
                  {session.last_message ?? "Xabar yo'q"}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 pl-[56px] pr-1">
              <span
                className={[
                  'inline-flex min-h-6 items-center rounded-pill px-2 text-[10px] font-semibold uppercase tracking-[0.08em]',
                  channelClassNameByValue[session.channel],
                ].join(' ')}
              >
                {channelLabelByValue[session.channel]}
              </span>
              <span className="inline-flex min-h-6 items-center rounded-pill bg-surface-card px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary ring-1 ring-border-soft/45">
                {sessionStateLabel[session.state]}
              </span>
              {session.operator_needed ? (
                <span className="inline-flex min-h-6 items-center gap-1 rounded-pill bg-warning-bg px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning ring-1 ring-warning/30">
                  <FiAlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Operator Kerak
                </span>
              ) : null}
              {aiPaused ? (
                <span className="inline-flex min-h-6 items-center rounded-pill bg-warning-bg px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
                  AI to'xtatilgan
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ChatSessionList;
