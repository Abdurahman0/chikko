import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { useTranslation } from 'react-i18next';

function PaymentsPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('payments')}
      summary={t('placeholders.payments.summary')}
      sectionTitle={t('placeholders.payments.sectionTitle')}
      sectionDescription={t('placeholders.payments.sectionDescription')}
      emptyStateTitle={t('placeholders.payments.emptyTitle')}
      emptyStateDescription={t('placeholders.payments.emptyDescription')}
    />
  );
}

export default PaymentsPage;

