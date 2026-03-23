import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function ProfilePage() {
  return (
    <PagePlaceholder
      route={getRouteById('profile')}
      summary="Personal account scaffold for future profile details, preferences, and account settings."
      sectionTitle="Profile Scaffold"
      sectionDescription="This route is prepared for personal account summary, editable preferences, and user-facing settings panels."
      emptyStateTitle="Profile content is not implemented yet"
      emptyStateDescription="Future work can add account details, preference sections, and profile actions here while preserving the shared page layout."
    />
  );
}

export default ProfilePage;

