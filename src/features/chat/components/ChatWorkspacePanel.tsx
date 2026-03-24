import { useMemo, useState, type KeyboardEvent } from 'react';
import { FiSend, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { EmptyState, LoadingState } from '../../../components/shared/page';
import { routePaths } from '../../../config/routes';
import type { ChatMessage, Conversation } from '../../../types/domain';

interface ChatWorkspacePanelProps {
  session: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string) => Promise<void>;
}

const senderLabelByValue: Record<ChatMessage['sender_type'], string> = {
  customer: 'Mijoz',
  ai: 'AI yordamchi',
  operator: 'Operator',
  system: 'Tizim',
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Mavjud emas';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getSessionTitle(session: Conversation): string {
  return (
    session.customer?.fullName ??
    session.lead?.fullName ??
    session.external_id ??
    session.id
  );
}

function getInitial(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return '?';
  }

  return normalized.charAt(0).toUpperCase();
}

function getSessionPersonType(session: Conversation): string {
  if (session.customer) {
    return 'Mijoz';
  }

  if (session.lead) {
    return 'Lid';
  }

  return 'Kontakt';
}

function getSessionProfileRoute(session: Conversation): string {
  if (session.customer) {
    return routePaths.customers;
  }

  if (session.lead) {
    return routePaths.leads;
  }

  return routePaths.profile;
}

function ChatWorkspacePanel({
  session,
  messages,
  isLoading,
  isSending,
  onSendMessage,
}: ChatWorkspacePanelProps) {
  const navigate = useNavigate();
  const [draftMessage, setDraftMessage] = useState('');

  const canSend = useMemo(
    () => draftMessage.trim().length > 0 && !isSending && Boolean(session),
    [draftMessage, isSending, session],
  );

  async function submitMessage() {
    if (!canSend) {
      return;
    }

    await onSendMessage(draftMessage.trim());
    setDraftMessage('');
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  if (!session) {
    return (
      <div className="grid h-full min-h-[440px] place-items-center p-1">
        <EmptyState
          title="Suhbat tanlanmagan"
          description="Chap ro'yxatdan suhbat tanlang."
        />
      </div>
    );
  }

  const sessionTitle = getSessionTitle(session);
  const sessionProfileRoute = getSessionProfileRoute(session);

  return (
    <div className="flex h-full min-h-[440px] flex-col gap-3">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-3 rounded-xl border-0 bg-background-subtle/80 p-3.5 text-left ring-1 ring-border-soft/50 outline-none transition duration-fast cursor-pointer hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-primary/35"
        onClick={() => {
          navigate(sessionProfileRoute);
        }}
        title="Profilni ochish"
      >
        <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-700 text-[16px] font-bold text-white shadow-[0_12px_28px_-20px_rgba(59,130,246,0.85)]">
              {getInitial(sessionTitle)}
            </span>
            <div className="min-w-0">
              <h3 className="m-0 truncate text-[1rem] font-semibold text-text-primary">
                {sessionTitle}
              </h3>
              <p className="m-0 mt-0.5 text-sm font-medium text-text-secondary">
                {getSessionPersonType(session)}
              </p>
            </div>
        </div>
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl bg-background-subtle/70 p-3 ring-1 ring-border-soft/50">
        {isLoading ? (
          <LoadingState
            title="Xabarlar yuklanmoqda"
            description="Tanlangan suhbat bo'yicha xabarlar olinmoqda."
          />
        ) : messages.length ? (
          <div className="grid gap-3">
            {messages.map((message) => {
              const outgoing = message.direction === 'outgoing';

              return (
                <div
                  key={message.id}
                  className={[
                    'flex items-end gap-2.5',
                    outgoing ? 'justify-end' : 'justify-start',
                  ].join(' ')}
                >
                  {!outgoing ? (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-card/85 text-text-secondary ring-1 ring-border-soft/55">
                      <FiUser className="h-4 w-4" />
                    </span>
                  ) : null}

                  <article
                    className={[
                      'max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ring-1',
                      outgoing
                        ? 'bg-[linear-gradient(160deg,rgb(79_70_229),rgb(37_99_235))] text-white ring-primary/35 shadow-[0_20px_40px_-28px_rgba(37,99,235,0.95)]'
                        : 'bg-surface-card/88 text-text-primary ring-border-soft/60',
                    ].join(' ')}
                  >
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
                      {senderLabelByValue[message.sender_type]}
                    </p>
                    <p className="m-0 mt-1 whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                    <p
                      className={[
                        'm-0 mt-2 text-[11px]',
                        outgoing ? 'text-white/80' : 'text-text-muted',
                      ].join(' ')}
                    >
                      {formatDateTime(message.created_at)}
                    </p>
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Xabarlar topilmadi"
            description="Bu sessiya uchun hozircha xabarlar mavjud emas."
          />
        )}
      </div>

      <div className="rounded-xl bg-background-subtle/80 p-3 ring-1 ring-border-soft/55">
        <label className="sr-only" htmlFor="chat-message-input">
          Xabar matni
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-message-input"
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            className="min-h-[56px] max-h-[132px] w-full flex-1 resize-y rounded-xl border-0 bg-surface-card/85 px-3 py-3 text-sm text-text-primary outline-none transition duration-fast placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary/35"
            placeholder="Xabar yozing..."
            disabled={isSending}
          />
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              void submitMessage();
            }}
            disabled={!canSend}
            aria-label="Yuborish"
          >
            <FiSend className={['h-4.5 w-4.5', isSending ? 'animate-pulse' : ''].join(' ')} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWorkspacePanel;
