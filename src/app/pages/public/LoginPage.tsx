import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';

function LoginPage() {
  return (
    <PagePlaceholder
      route={getRouteById('login')}
      summary="Authentication entry scaffold for the future sign-in experience."
      sectionTitle="Authentication Scaffold"
      sectionDescription="This public route is reserved for the future login form, session messaging, and access guidance."
      emptyStateTitle="Login form is not implemented yet"
      emptyStateDescription="Future tasks can add the real authentication form here while keeping the same page composition and visual foundation."
    />
  );
}

export default LoginPage;

