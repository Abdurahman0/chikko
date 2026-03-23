import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { useTranslation } from 'react-i18next';

function ChatPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('chat')}
      summary={t('placeholders.chat.summary')}
      sectionTitle={t('placeholders.chat.sectionTitle')}
      sectionDescription={t('placeholders.chat.sectionDescription')}
      emptyStateTitle={t('placeholders.chat.emptyTitle')}
      emptyStateDescription={t('placeholders.chat.emptyDescription')}
    />
  );
}

export default ChatPage;

