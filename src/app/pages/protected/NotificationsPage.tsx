import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { useTranslation } from 'react-i18next';

function NotificationsPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('notifications')}
      summary={t('placeholders.notifications.summary')}
      sectionTitle={t('placeholders.notifications.sectionTitle')}
      sectionDescription={t('placeholders.notifications.sectionDescription')}
      emptyStateTitle={t('placeholders.notifications.emptyTitle')}
      emptyStateDescription={t('placeholders.notifications.emptyDescription')}
    />
  );
}

export default NotificationsPage;

