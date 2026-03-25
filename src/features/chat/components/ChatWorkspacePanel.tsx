import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FiSend, FiTrash2, FiUser } from 'react-icons/fi';
import chatBackground from '../../../assets/chat-background.svg';
import { EmptyState, LoadingState } from '../../../components/shared/page';
import ChatUserProfilePanel from './ChatUserProfilePanel';
import type { ChatMessage, Conversation } from '../../../types/domain';

interface ChatWorkspacePanelProps {
  session: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  isDeletingSession?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onRequestDeleteSession?: (session: Conversation) => void;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isLikelyIdValue(value: string, session: Conversation): boolean {
  if (!value) {
    return false;
  }

  if (isUuidLike(value)) {
    return true;
  }

  return value === session.customer?.id || value === session.lead?.id || value === session.external_id;
}

function getSessionTitle(session: Conversation): string {
  const stateRecord = asRecord(session.state_data);
  const stateCustomerName = asText(stateRecord?.customer_name);
  const candidates = [
    stateCustomerName,
    session.customer?.fullName ?? null,
    session.lead?.fullName ?? null,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = candidate.trim();
    if (!normalized || isLikelyIdValue(normalized, session)) {
      continue;
    }

    return normalized;
  }

  return "Noma'lum mijoz";
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

function ChatWorkspacePanel({
  session,
  messages,
  isLoading,
  isSending,
  isDeletingSession = false,
  onSendMessage,
  onRequestDeleteSession,
}: ChatWorkspacePanelProps) {
  const [draftMessage, setDraftMessage] = useState('');
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollSignatureRef = useRef('');

  const canSend = useMemo(
    () => draftMessage.trim().length > 0 && !isSending && Boolean(session),
    [draftMessage, isSending, session],
  );

  useEffect(() => {
    setIsProfilePanelOpen(false);
    lastScrollSignatureRef.current = '';
  }, [session?.id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !session) {
      return;
    }

    const lastMessageId = messages[messages.length - 1]?.id ?? 'empty';
    const signature = `${session.id}:${messages.length}:${lastMessageId}`;
    if (lastScrollSignatureRef.current === signature) {
      return;
    }

    const shouldUseSmoothScroll = lastScrollSignatureRef.current.length > 0;
    lastScrollSignatureRef.current = signature;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: shouldUseSmoothScroll ? 'smooth' : 'auto',
    });
  }, [messages, session]);

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
      <div className="grid h-full min-h-0 place-items-center p-1">
        <EmptyState
          title="Suhbat tanlanmagan"
          description="Chap ro'yxatdan suhbat tanlang."
        />
      </div>
    );
  }

  const sessionTitle = getSessionTitle(session);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-white">
      <div className="flex w-full items-start justify-between gap-3 rounded-xl bg-background-subtle/80 p-3.5 text-left ring-1 ring-border-soft/50">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border-0 bg-transparent p-0 text-left outline-none transition duration-fast cursor-pointer hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary/35"
          onClick={() => setIsProfilePanelOpen(true)}
          title="Mijoz profilini ochish"
        >
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
        </button>
        {onRequestDeleteSession ? (
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger transition duration-fast hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/35 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={(event) => {
              event.stopPropagation();
              onRequestDeleteSession(session);
            }}
            disabled={isDeletingSession}
            aria-label="Sessiyani o'chirish"
            title="Sessiyani o'chirish"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        ref={messagesContainerRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl ring-1 ring-border-soft/50"
        style={{
          backgroundImage: `url(${chatBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-background-default/42" aria-hidden="true" />
        <div className="relative grid gap-3 p-3">
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
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-card/90 text-text-secondary ring-1 ring-border-soft/55">
                        <FiUser className="h-4 w-4" />
                      </span>
                    ) : null}

                    <article
                      className={[
                        'max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ring-1',
                        outgoing
                          ? 'bg-[linear-gradient(160deg,rgb(79_70_229),rgb(37_99_235))] text-white ring-primary/35 shadow-[0_20px_40px_-28px_rgba(37,99,235,0.95)]'
                          : 'bg-surface-card/94 text-text-primary ring-border-soft/60',
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

      <ChatUserProfilePanel
        session={session}
        isOpen={isProfilePanelOpen}
        onClose={() => setIsProfilePanelOpen(false)}
      />
    </div>
  );
}

export default ChatWorkspacePanel;
