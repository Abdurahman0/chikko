import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { getRouteById } from '../../../config/routes';
import { useTranslation } from 'react-i18next';

function UsersPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('users')}
      summary={t('placeholders.users.summary')}
      sectionTitle={t('placeholders.users.sectionTitle')}
      sectionDescription={t('placeholders.users.sectionDescription')}
      emptyStateTitle={t('placeholders.users.emptyTitle')}
      emptyStateDescription={t('placeholders.users.emptyDescription')}
    />
  );
}

export default UsersPage;
