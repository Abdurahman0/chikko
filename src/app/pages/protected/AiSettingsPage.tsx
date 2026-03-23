import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { useTranslation } from 'react-i18next';

function AiSettingsPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('ai-settings')}
      summary={t('placeholders.aiSettings.summary')}
      sectionTitle={t('placeholders.aiSettings.sectionTitle')}
      sectionDescription={t('placeholders.aiSettings.sectionDescription')}
      emptyStateTitle={t('placeholders.aiSettings.emptyTitle')}
      emptyStateDescription={t('placeholders.aiSettings.emptyDescription')}
    />
  );
}

export default AiSettingsPage;

