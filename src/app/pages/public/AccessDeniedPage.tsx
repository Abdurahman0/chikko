import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function AccessDeniedPage() {
  return (
    <PagePlaceholder
      route={getRouteById('access-denied')}
      summary="Unauthorized access scaffold for future route guard outcomes and user guidance."
      sectionTitle="Access Handling Scaffold"
      sectionDescription="This public route is reserved for access-denied messaging, redirect guidance, and later guard integration."
      emptyStateTitle="Access guidance is not implemented yet"
      emptyStateDescription="Future work can add clearer unauthorized messaging and recovery actions here once route guards are implemented."
    />
  );
}

export default AccessDeniedPage;

