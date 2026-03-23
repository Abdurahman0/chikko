import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function PaymentsPage() {
  return (
    <PagePlaceholder
      route={getRouteById('payments')}
      summary="Payment operations scaffold for future transaction records, payment states, and reconciliation views."
      sectionTitle="Payment Tracking Scaffold"
      sectionDescription="This route is intended for payment listings, status visibility, and reconciliation-oriented review flows."
      emptyStateTitle="Payment records are not implemented yet"
      emptyStateDescription="Future tasks can introduce payment tables, status badges, and transaction detail surfaces here without changing the shared page structure."
    />
  );
}

export default PaymentsPage;

