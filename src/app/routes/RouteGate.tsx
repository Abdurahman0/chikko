import type { PropsWithChildren } from 'react';
import type { AppRouteConfig } from '../../config/routes';

interface RouteGateProps extends PropsWithChildren {
  route: AppRouteConfig;
}

function RouteGate({ route, children }: RouteGateProps) {
  void route;

  return <>{children}</>;
}

export default RouteGate;

