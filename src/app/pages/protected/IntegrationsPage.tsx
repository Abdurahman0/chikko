import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { getRouteById } from '../../../config/routes';
import { useTranslation } from 'react-i18next';

function IntegrationsPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('integrations')}
      summary={t('placeholders.integrations.summary')}
      sectionTitle={t('placeholders.integrations.sectionTitle')}
      sectionDescription={t('placeholders.integrations.sectionDescription')}
      emptyStateTitle={t('placeholders.integrations.emptyTitle')}
      emptyStateDescription={t('placeholders.integrations.emptyDescription')}
    />
  );
}

export default IntegrationsPage;
