import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function ChatPage() {
  return (
    <PagePlaceholder
      route={getRouteById('chat')}
      summary="Conversation workspace scaffold for future chat inbox, message timeline, and operator handoff review."
      sectionTitle="Conversation Workspace Scaffold"
      sectionDescription="This route is ready for a conversation list, message panel, and AI sales-agent review experience later."
      emptyStateTitle="Conversation workspace is not implemented yet"
      emptyStateDescription="Future work can add chat threads, unread states, and message detail panels here while retaining the shared page composition."
    />
  );
}

export default ChatPage;

