import { useEffect, useMemo, useState } from 'react';
import {
  PageCard,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import ChatSessionFilters from '../../../features/chat/components/ChatSessionFilters';
import ChatSessionList from '../../../features/chat/components/ChatSessionList';
import ChatWorkspacePanel from '../../../features/chat/components/ChatWorkspacePanel';
import { services } from '../../../services';
import type {
  ChatMessage,
  Conversation,
  EntityId,
  MessageListParams,
  SelectOption,
  SessionListParams,
} from '../../../types/domain';

type SessionOrdering = '-last_message_at' | 'last_message_at' | '-created_at' | 'created_at';
type ReadFilter = 'all' | 'read' | 'unread';
type ChannelFilter = 'all' | Conversation['channel'];

const ALL_CHANNEL_VALUE = 'all' as const;
const PAGE_SIZE = 120;

function ChatPage() {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(ALL_CHANNEL_VALUE);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [ordering, setOrdering] = useState<SessionOrdering>('-last_message_at');

  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<EntityId | null>(null);
  const [selectedSessionSnapshot, setSelectedSessionSnapshot] = useState<Conversation | null>(
    null,
  );
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [hasSessionsError, setHasSessionsError] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [unreadBySessionId, setUnreadBySessionId] = useState<Record<string, number>>({});

  const filteredSessions = useMemo(() => {
    if (readFilter === 'all') {
      return sessions;
    }

    return sessions.filter((session) => {
      const unreadCount = unreadBySessionId[session.id] ?? 0;
      return readFilter === 'read' ? unreadCount === 0 : unreadCount > 0;
    });
  }, [readFilter, sessions, unreadBySessionId]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) {
      return null;
    }

    const fromVisibleList = sessions.find((session) => session.id === selectedSessionId);
    if (fromVisibleList) {
      return fromVisibleList;
    }

    if (selectedSessionSnapshot?.id === selectedSessionId) {
      return selectedSessionSnapshot;
    }

    return null;
  }, [selectedSessionId, selectedSessionSnapshot, sessions]);

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-last_message_at', label: "Oxirgi xabar (yangi)" },
      { value: 'last_message_at', label: "Oxirgi xabar (eski)" },
      { value: '-created_at', label: 'Yaratilgan (yangi)' },
      { value: 'created_at', label: 'Yaratilgan (eski)' },
    ],
    [],
  );

  useEffect(() => {
    let isActive = true;

    async function loadSessions() {
      setIsSessionsLoading(true);
      setHasSessionsError(false);

      const params: SessionListParams = {
        page: 1,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        channel: channelFilter === ALL_CHANNEL_VALUE ? undefined : channelFilter,
        ordering,
      };

      try {
        const result = await services.conversations.listSessions(params);
        if (!isActive) {
          return;
        }

        setSessions(result.items);
      } catch {
        if (!isActive) {
          return;
        }

        setHasSessionsError(true);
        setSessions([]);
        setSelectedSessionId(null);
      } finally {
        if (isActive) {
          setIsSessionsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isActive = false;
    };
  }, [channelFilter, ordering, search]);

  useEffect(() => {
    let isActive = true;

    async function loadUnreadCounts() {
      if (!sessions.length) {
        setUnreadBySessionId({});
        return;
      }

      const unreadEntries = await Promise.all(
        sessions.map(async (session) => {
          const response = await services.conversations.listMessages({
            page: 1,
            pageSize: 200,
            session: session.id,
            ordering: 'created_at',
          });

          const unreadCount = response.items.filter(
            (message) =>
              message.sender_type === 'customer' &&
              message.direction === 'incoming' &&
              !message.is_read,
          ).length;

          return [session.id, unreadCount] as const;
        }),
      );

      if (!isActive) {
        return;
      }

      setUnreadBySessionId(Object.fromEntries(unreadEntries));
    }

    void loadUnreadCounts();

    return () => {
      isActive = false;
    };
  }, [sessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSessionSnapshot(null);
      return;
    }

    const matched = sessions.find((session) => session.id === selectedSessionId);
    if (matched) {
      setSelectedSessionSnapshot(matched);
    }
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    let isActive = true;

    async function loadMessages() {
      if (!selectedSessionId) {
        setMessages([]);
        return;
      }

      const sessionId = selectedSessionId;
      setIsMessagesLoading(true);

      const params: MessageListParams = {
        page: 1,
        pageSize: 250,
        session: sessionId,
        ordering: 'created_at',
      };

      try {
        const result = await services.conversations.listMessages(params);
        if (!isActive) {
          return;
        }

        setMessages(result.items);

        const hasUnreadCustomerMessages = result.items.some(
          (message) =>
            message.sender_type === 'customer' &&
            message.direction === 'incoming' &&
            !message.is_read,
        );

        if (!hasUnreadCustomerMessages) {
          return;
        }

        await services.conversations.markSessionRead(sessionId);
        if (!isActive) {
          return;
        }

        setMessages((current) =>
          current.map((message) =>
            message.sender_type === 'customer' &&
            message.direction === 'incoming' &&
            !message.is_read
              ? { ...message, is_read: true }
              : message,
          ),
        );
        setUnreadBySessionId((current) => ({ ...current, [sessionId]: 0 }));
      } finally {
        if (isActive) {
          setIsMessagesLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      isActive = false;
    };
  }, [selectedSessionId]);

  async function handleSendMessage(content: string) {
    if (!selectedSessionId) {
      return;
    }

    setIsSendingMessage(true);
    try {
      const createdMessage = await services.conversations.sendMessage(selectedSessionId, {
        content,
      });

      setMessages((current) => [...current, createdMessage]);
      setSessions((current) =>
        current
          .map((session) =>
            session.id === selectedSessionId
              ? {
                  ...session,
                  last_message: createdMessage.content,
                  last_message_at: createdMessage.created_at,
                  updated_at: createdMessage.updated_at,
                }
              : session,
          )
          .sort((left, right) => {
            const leftTime = left.last_message_at
              ? new Date(left.last_message_at).getTime()
              : 0;
            const rightTime = right.last_message_at
              ? new Date(right.last_message_at).getTime()
              : 0;
            return rightTime - leftTime;
          }),
      );
      setSelectedSessionSnapshot((current) =>
        current && current.id === selectedSessionId
          ? {
              ...current,
              last_message: createdMessage.content,
              last_message_at: createdMessage.created_at,
              updated_at: createdMessage.updated_at,
            }
          : current,
      );
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <PageLayout>
      <PageSection>
        <div className="grid gap-3 min-[1024px]:items-start min-[1024px]:grid-cols-[430px_minmax(0,1fr)] min-[1380px]:grid-cols-[470px_minmax(0,1fr)]">
          <div className="min-[1024px]:sticky min-[1024px]:top-3">
            <PageCard>
              <div className="grid h-[78vh] min-h-[520px] grid-rows-[auto_auto_1fr] gap-3 min-[1024px]:h-[83dvh] min-[1024px]:min-h-[560px]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                    Suhbatlar
                  </h2>
                  <span className="text-[12px] font-medium text-text-muted">
                    {filteredSessions.length} ta
                  </span>
                </div>

                <ChatSessionFilters
                  search={search}
                  channelFilter={channelFilter}
                  readFilter={readFilter}
                  ordering={ordering}
                  orderingOptions={orderingOptions}
                  disabled={isSessionsLoading}
                  onSearchChange={setSearch}
                  onChannelChange={setChannelFilter}
                  onReadFilterChange={setReadFilter}
                  onOrderingChange={(value) => setOrdering(value as SessionOrdering)}
                />

                <div className="min-h-0 overflow-y-auto overflow-x-hidden pr-1 pt-2">
                  <ChatSessionList
                    sessions={filteredSessions}
                    selectedSessionId={selectedSessionId}
                    unreadBySessionId={unreadBySessionId}
                    isLoading={isSessionsLoading}
                    hasError={hasSessionsError}
                    onSelectSession={setSelectedSessionId}
                  />
                </div>
              </div>
            </PageCard>
          </div>

          <PageCard>
            <div className="h-[78vh] min-h-[520px] min-[1024px]:h-[83dvh] min-[1024px]:min-h-[560px]">
              <ChatWorkspacePanel
                session={selectedSession}
                messages={messages}
                isLoading={isMessagesLoading}
                isSending={isSendingMessage}
                onSendMessage={handleSendMessage}
              />
            </div>
          </PageCard>
        </div>
      </PageSection>
    </PageLayout>
  );
}

export default ChatPage;
