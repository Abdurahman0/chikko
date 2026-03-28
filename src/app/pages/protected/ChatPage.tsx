import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from '../../../components/shared/icons/AppIcon';
import ChatSessionFilters from '../../../features/chat/components/ChatSessionFilters';
import ChatSessionList from '../../../features/chat/components/ChatSessionList';
import ChatWorkspacePanel from '../../../features/chat/components/ChatWorkspacePanel';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  ChatMessage,
  Conversation,
  EntityId,
  SelectOption,
} from '../../../types/domain';

type SessionOrdering = '-last_message_at' | 'last_message_at' | '-created_at' | 'created_at';
type ChannelFilter = 'all' | Conversation['channel'];
type OperatorFilter = 'all' | 'active' | 'inactive';

const ALL_CHANNEL_VALUE = 'all' as const;
const PAGE_SIZE = 120;
const MESSAGE_PAGE_SIZE = 250;
const SESSIONS_POLL_INTERVAL_MS = 8000;
const MESSAGES_POLL_INTERVAL_MS = 6000;

function applySessionUpdate(
  sessions: Conversation[],
  nextSession: Conversation,
): Conversation[] {
  let matched = false;

  const updated = sessions.map((session) => {
    if (session.id !== nextSession.id) {
      return session;
    }

    matched = true;
    return {
      ...session,
      ...nextSession,
    };
  });

  if (matched) {
    return updated;
  }

  return [nextSession, ...updated];
}

function sortSessionsByLastMessage(
  sessions: Conversation[],
  ordering: SessionOrdering,
): Conversation[] {
  const sorted = [...sessions];

  sorted.sort((left, right) => {
    const leftTime =
      ordering.includes('created')
        ? new Date(left.created_at).getTime()
        : left.last_message_at
          ? new Date(left.last_message_at).getTime()
          : 0;
    const rightTime =
      ordering.includes('created')
        ? new Date(right.created_at).getTime()
        : right.last_message_at
          ? new Date(right.last_message_at).getTime()
          : 0;

    return ordering.startsWith('-') ? rightTime - leftTime : leftTime - rightTime;
  });

  return sorted;
}

function ChatPage() {
  const [search, setSearch] = usePersistentState('chat:search', '');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(ALL_CHANNEL_VALUE);
  const [operatorFilter, setOperatorFilter] = useState<OperatorFilter>('all');
  const [ordering, setOrdering] = useState<SessionOrdering>('-last_message_at');

  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<EntityId | null>(null);
  const [activeSession, setActiveSession] = useState<Conversation | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [hasSessionsError, setHasSessionsError] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isUpdatingAIState, setIsUpdatingAIState] = useState(false);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<Conversation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sessionCacheRef = useRef<Record<string, Conversation>>({});
  const activeSessionIdRef = useRef<EntityId | null>(null);
  const markReadInFlightSessionIdRef = useRef<EntityId | null>(null);
  const sessionsRequestRef = useRef(0);
  const sessionRequestRef = useRef(0);
  const messagesRequestRef = useRef(0);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-last_message_at', label: "Oxirgi xabar (yangi)" },
      { value: 'last_message_at', label: "Oxirgi xabar (eski)" },
      { value: '-created_at', label: "Qo'shilgan (yangi)" },
      { value: 'created_at', label: "Qo'shilgan (eski)" },
    ],
    [],
  );

  const sessionQuery = useMemo(
    () => ({
      page: 1,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      channel: channelFilter === ALL_CHANNEL_VALUE ? undefined : channelFilter,
      is_operator_active:
        operatorFilter === 'all'
          ? undefined
          : operatorFilter === 'active',
      ordering,
    }),
    [channelFilter, operatorFilter, ordering, search],
  );

  const loadSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestId = ++sessionsRequestRef.current;

      if (!options?.silent) {
        setIsSessionsLoading(true);
      }
      setHasSessionsError(false);

      try {
        const result = await services.conversations.getSessions(sessionQuery);

        if (requestId !== sessionsRequestRef.current) {
          return;
        }

        for (const session of result.items) {
          sessionCacheRef.current[session.id] = session;
        }

        setSessions(result.items);
      } catch {
        if (requestId !== sessionsRequestRef.current) {
          return;
        }

        setHasSessionsError(true);
      } finally {
        if (!options?.silent && requestId === sessionsRequestRef.current) {
          setIsSessionsLoading(false);
        }
      }
    },
    [sessionQuery],
  );

  const loadActiveSession = useCallback(
    async (sessionId: EntityId, options?: { silent?: boolean }) => {
      const requestId = ++sessionRequestRef.current;

      if (!options?.silent) {
        setIsSessionLoading(true);
      }

      try {
        const session = await services.conversations.getSessionById(sessionId);
        if (
          requestId !== sessionRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        if (!session) {
          setActiveSession(null);
          return;
        }

        sessionCacheRef.current[session.id] = session;
        setActiveSession(session);
        setSessions((current) =>
          applySessionUpdate(current, session),
        );
      } catch {
        if (
          requestId !== sessionRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        setActionError("Suhbat tafsilotlarini yuklab bo'lmadi.");
      } finally {
        if (!options?.silent && requestId === sessionRequestRef.current) {
          setIsSessionLoading(false);
        }
      }
    },
    [],
  );

  const markActiveSessionRead = useCallback(
    async (sessionId: EntityId) => {
      if (markReadInFlightSessionIdRef.current === sessionId) {
        return;
      }

      markReadInFlightSessionIdRef.current = sessionId;

      try {
        const updatedSession = await services.conversations.markSessionRead(sessionId);
        if (!updatedSession || sessionId !== activeSessionIdRef.current) {
          return;
        }

        const normalizedSession = {
          ...updatedSession,
          unread_count: 0,
        };
        sessionCacheRef.current[sessionId] = normalizedSession;
        setActiveSession(normalizedSession);
        setSessions((current) =>
          applySessionUpdate(current, normalizedSession),
        );
        setMessages((current) =>
          current.map((message) =>
            message.direction === 'incoming' &&
            message.sender_type === 'customer' &&
            !message.is_read
              ? { ...message, is_read: true }
              : message,
          ),
        );
      } catch {
        // Ignore mark read failures to avoid blocking normal chat flow.
      } finally {
        if (markReadInFlightSessionIdRef.current === sessionId) {
          markReadInFlightSessionIdRef.current = null;
        }
      }
    },
    [],
  );

  const loadMessages = useCallback(
    async (sessionId: EntityId, options?: { silent?: boolean }) => {
      const requestId = ++messagesRequestRef.current;

      if (!options?.silent) {
        setIsMessagesLoading(true);
      }

      try {
        const result = await services.conversations.getMessages({
          page: 1,
          pageSize: MESSAGE_PAGE_SIZE,
          session: sessionId,
          ordering: 'created_at',
        });

        if (
          requestId !== messagesRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        setMessages(result.items);

        const hasUnreadIncoming = result.items.some(
          (message) =>
            message.direction === 'incoming' &&
            message.sender_type === 'customer' &&
            !message.is_read,
        );

        if (hasUnreadIncoming) {
          void markActiveSessionRead(sessionId);
        }
      } catch {
        if (
          requestId !== messagesRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        setActionError("Xabarlarni yuklab bo'lmadi.");
      } finally {
        if (!options?.silent && requestId === messagesRequestRef.current) {
          setIsMessagesLoading(false);
        }
      }
    },
    [markActiveSessionRead],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSessions({ silent: true });
    }, SESSIONS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null);
      setMessages([]);
      return;
    }

    const cached = sessionCacheRef.current[activeSessionId];
    if (cached) {
      setActiveSession(cached);
    }

    void loadActiveSession(activeSessionId);
    void loadMessages(activeSessionId);
    void markActiveSessionRead(activeSessionId);
  }, [activeSessionId, loadActiveSession, loadMessages, markActiveSessionRead]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadActiveSession(activeSessionId, { silent: true });
      void loadMessages(activeSessionId, { silent: true });
    }, MESSAGES_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSessionId, loadActiveSession, loadMessages]);

  async function handleSendMessage(content: string) {
    if (!activeSessionId) {
      return;
    }

    const nowIso = new Date().toISOString();
    const optimisticId = `temp-${activeSessionId}-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      created_at: nowIso,
      updated_at: nowIso,
      sender_type: 'operator',
      direction: 'outgoing',
      content,
      external_message_id: null,
      metadata: null,
      is_read: true,
      session: activeSessionId,
      sent_by: null,
    };

    setActionError(null);
    setIsSendingMessage(true);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const createdMessage = await services.conversations.sendMessage(activeSessionId, {
        content,
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId ? createdMessage : message,
        ),
      );

      setSessions((current) =>
        sortSessionsByLastMessage(
          applySessionUpdate(current, {
            ...(current.find((session) => session.id === activeSessionId) ?? {
              id: activeSessionId,
              channel: 'manual',
              external_id: null,
              lead: null,
              customer: null,
              assigned_operator: null,
              ai_paused_until: null,
              is_operator_active: false,
              last_message_at: null,
              state: 'open',
              last_message: null,
              created_at: nowIso,
              updated_at: nowIso,
            }),
            last_message: createdMessage.content,
            last_message_payload: createdMessage,
            last_message_at: createdMessage.created_at,
            updated_at: createdMessage.updated_at,
          }),
          ordering,
        ),
      );
      setActiveSession((current) =>
        current && current.id === activeSessionId
          ? {
              ...current,
              last_message: createdMessage.content,
              last_message_payload: createdMessage,
              last_message_at: createdMessage.created_at,
              updated_at: createdMessage.updated_at,
            }
          : current,
      );

      void loadMessages(activeSessionId, { silent: true });
    } catch {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId),
      );
      setActionError("Xabar yuborilmadi.");
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleDeleteSession() {
    if (!deleteSessionTarget) {
      return;
    }

    setActionError(null);
    setIsDeletingSession(true);

    try {
      const wasDeleted = await services.conversations.deleteSession(deleteSessionTarget.id);
      if (!wasDeleted) {
        setActionError("Sessiyani o'chirib bo'lmadi.");
        return;
      }

      delete sessionCacheRef.current[deleteSessionTarget.id];
      setSessions((current) =>
        current.filter((session) => session.id !== deleteSessionTarget.id),
      );

      if (activeSessionId === deleteSessionTarget.id) {
        setActiveSessionId(null);
        setActiveSession(null);
        setMessages([]);
      }

      setDeleteSessionTarget(null);
    } catch {
      setActionError("Sessiyani o'chirib bo'lmadi.");
    } finally {
      setIsDeletingSession(false);
    }
  }

  async function handlePauseAI(
    session: Conversation,
    pausedUntilIso: string,
  ) {
    if (isUpdatingAIState) {
      return;
    }

    setActionError(null);
    setIsUpdatingAIState(true);

    try {
      const updatedSession = await services.conversations.pauseSessionAI(
        session.id,
        pausedUntilIso,
      );
      if (!updatedSession) {
        throw new Error();
      }

      sessionCacheRef.current[updatedSession.id] = updatedSession;
      setSessions((current) => applySessionUpdate(current, updatedSession));
      if (activeSessionIdRef.current === updatedSession.id) {
        setActiveSession(updatedSession);
      }
    } catch {
      setActionError("AI ni tanlangan vaqtga to'xtatib bo'lmadi.");
    } finally {
      setIsUpdatingAIState(false);
    }
  }

  async function handleResumeAI(session: Conversation) {
    if (isUpdatingAIState) {
      return;
    }

    setActionError(null);
    setIsUpdatingAIState(true);

    try {
      const updatedSession = await services.conversations.resumeSessionAI(session.id);
      if (!updatedSession) {
        throw new Error();
      }

      sessionCacheRef.current[updatedSession.id] = updatedSession;
      setSessions((current) => applySessionUpdate(current, updatedSession));
      if (activeSessionIdRef.current === updatedSession.id) {
        setActiveSession(updatedSession);
      }
    } catch {
      setActionError("AI ni davom ettirib bo'lmadi.");
    } finally {
      setIsUpdatingAIState(false);
    }
  }

  const unreadBySessionId = useMemo(
    () =>
      Object.fromEntries(
        sessions.map((session) => [session.id, Math.max(0, session.unread_count ?? 0)]),
      ),
    [sessions],
  );

  const selectedSessionForModal = activeSessionId
    ? activeSession ?? sessions.find((session) => session.id === activeSessionId) ?? null
    : null;

  const workspaceSession = selectedSessionForModal;

  return (
    <>
      <div className="grid h-full min-h-0 gap-0 min-[1024px]:items-start min-[1024px]:gap-3 min-[1024px]:grid-cols-[430px_minmax(0,1fr)] min-[1380px]:grid-cols-[470px_minmax(0,1fr)]">
        <section
          className={[
            'h-full min-h-0',
            selectedSessionForModal ? 'max-[1023px]:hidden' : '',
          ].join(' ')}
          aria-hidden={Boolean(selectedSessionForModal)}
        >
          <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-3 rounded-none bg-background-default p-3 min-[1024px]:rounded-xl min-[1024px]:bg-surface-card min-[1024px]:p-5 min-[1024px]:shadow-sm min-[1024px]:ring-1 min-[1024px]:ring-border-soft/40">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                Suhbatlar
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {sessions.length} ta
              </span>
            </div>

            <ChatSessionFilters
              search={search}
              channelFilter={channelFilter}
              operatorFilter={operatorFilter}
              ordering={ordering}
              orderingOptions={orderingOptions}
              disabled={isSessionsLoading}
              onSearchChange={setSearch}
              onChannelChange={setChannelFilter}
              onOperatorFilterChange={setOperatorFilter}
              onOrderingChange={(value) => setOrdering(value as SessionOrdering)}
            />

            <div className="min-h-0 overflow-y-auto overflow-x-hidden pr-1">
              <ChatSessionList
                sessions={sessions}
                selectedSessionId={activeSessionId}
                unreadBySessionId={unreadBySessionId}
                isLoading={isSessionsLoading}
                hasError={hasSessionsError}
                onSelectSession={setActiveSessionId}
              />
            </div>
          </div>
        </section>

        <section className="hidden h-full min-h-0 min-[1024px]:block">
          <div className="h-full min-h-0 rounded-xl bg-surface-card p-5 shadow-sm ring-1 ring-border-soft/40">
            <ChatWorkspacePanel
              session={workspaceSession}
              messages={messages}
              isLoading={isMessagesLoading || isSessionLoading}
              isSending={isSendingMessage}
              isDeletingSession={isDeletingSession}
              isUpdatingAIState={isUpdatingAIState}
              onSendMessage={handleSendMessage}
              onRequestDeleteSession={setDeleteSessionTarget}
              onPauseAI={handlePauseAI}
              onResumeAI={handleResumeAI}
            />
          </div>
        </section>
      </div>

      {selectedSessionForModal ? (
        <div className="fixed inset-0 z-[140] bg-background-default min-[1024px]:hidden">
          <button
            type="button"
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-card/90 text-text-primary ring-1 ring-border-soft/60 transition duration-fast hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={() => setActiveSessionId(null)}
            aria-label="Suhbatni yopish"
          >
            <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          <div className="h-full min-h-0">
            <ChatWorkspacePanel
              session={selectedSessionForModal}
              messages={messages}
              isLoading={isMessagesLoading || isSessionLoading}
              isSending={isSendingMessage}
              isDeletingSession={isDeletingSession}
              isUpdatingAIState={isUpdatingAIState}
              onSendMessage={handleSendMessage}
              onRequestDeleteSession={setDeleteSessionTarget}
              onPauseAI={handlePauseAI}
              onResumeAI={handleResumeAI}
            />
          </div>
        </div>
      ) : null}

      {deleteSessionTarget ? (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-background-overlay/70 p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-surface-card p-5 shadow-xl ring-1 ring-border-soft/55">
            <h3 className="m-0 text-lg font-semibold text-text-primary">
              Sessiyani o'chirish
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Ushbu sessiya o'chirilsa, chat ro'yxatidan olib tashlanadi. Davom etasizmi?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-card hover:text-text-primary"
                onClick={() => setDeleteSessionTarget(null)}
                disabled={isDeletingSession}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition duration-fast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void handleDeleteSession();
                }}
                disabled={isDeletingSession}
              >
                {isDeletingSession ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="fixed bottom-4 right-4 z-[230] max-w-[320px] rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger shadow-lg ring-1 ring-danger/25">
          {actionError}
        </div>
      ) : null}
    </>
  );
}

export default ChatPage;
