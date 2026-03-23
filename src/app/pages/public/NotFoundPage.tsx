import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function NotFoundPage() {
  return (
    <PagePlaceholder
      route={getRouteById('not-found')}
      summary="Fallback scaffold for unknown routes and broken links."
      sectionTitle="Not Found Scaffold"
      sectionDescription="This public route is reserved for friendly not-found messaging and later recovery navigation."
      emptyStateTitle="404 recovery UI is not implemented yet"
      emptyStateDescription="Future tasks can add return navigation and clearer route recovery options here while reusing the same shared composition."
    />
  );
}

export default NotFoundPage;

