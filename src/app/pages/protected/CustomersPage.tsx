import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function CustomersPage() {
  return (
    <PagePlaceholder
      route={getRouteById('customers')}
      summary="Customer management scaffold for future profiles, lifecycle summaries, and customer history views."
      sectionTitle="Customer Page Scaffold"
      sectionDescription="This route is ready for customer listings, account summaries, and detail-driven CRM views."
      emptyStateTitle="Customer views are not implemented yet"
      emptyStateDescription="Future work can introduce customer tables, profile cards, and activity summaries here without changing the shared page pattern."
    />
  );
}

export default CustomersPage;

