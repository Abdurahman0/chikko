import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function NotificationsPage() {
  return (
    <PagePlaceholder
      route={getRouteById('notifications')}
      summary="Notification center scaffold for future alerts, unread state handling, and follow-up entry points."
      sectionTitle="Notification Center Scaffold"
      sectionDescription="This route is intended for alert listings, severity indicators, and notification follow-up actions."
      emptyStateTitle="Notifications UI is not implemented yet"
      emptyStateDescription="Future tasks can add notification lists, read state controls, and related entity links here while using the same page structure."
    />
  );
}

export default NotificationsPage;

