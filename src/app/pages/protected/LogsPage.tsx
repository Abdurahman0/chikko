import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { useTranslation } from 'react-i18next';

function LogsPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('logs')}
      summary={t('placeholders.logs.summary')}
      sectionTitle={t('placeholders.logs.sectionTitle')}
      sectionDescription={t('placeholders.logs.sectionDescription')}
      emptyStateTitle={t('placeholders.logs.emptyTitle')}
      emptyStateDescription={t('placeholders.logs.emptyDescription')}
    />
  );
}

export default LogsPage;

