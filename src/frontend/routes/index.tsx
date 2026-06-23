/* Route table for the hosting-control area. The host can either merge
 * `hostingControlRoutes` into its own router, or render <HostingControlRoutes/>
 * directly. Every route is permission-aware via the pages themselves; the
 * manifest declares which top-level routes appear in the dashboard nav. */
import { useRoutes, type RouteObject } from 'react-router-dom';
import { HostingControlLayout } from './HostingControlLayout';
import { ServersListPage } from './ServersListPage';
import { ServerFormPage } from './ServerFormPage';
import { ServerDetailPage } from './ServerDetailPage';
import { AccountsPage } from './AccountsPage';
import { MetricsPage } from './MetricsPage';
import { EmailPage } from './EmailPage';
import { DomainsPage } from './DomainsPage';
import { DatabasesPage } from './DatabasesPage';
import { FtpPage } from './FtpPage';
import { DeploymentsPage } from './DeploymentsPage';
import { HOSTING_BASE } from './paths';

export const hostingControlRoutes: RouteObject[] = [
  {
    path: HOSTING_BASE,
    element: <HostingControlLayout />,
    children: [
      { index: true, element: <ServersListPage /> },
      { path: 'servers', element: <ServersListPage /> },
      { path: 'servers/new', element: <ServerFormPage /> },
      { path: 'servers/:id', element: <ServerDetailPage /> },
      { path: 'servers/:id/edit', element: <ServerFormPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'accounts/:id/metrics', element: <MetricsPage /> },
      { path: 'accounts/:id/emails', element: <EmailPage /> },
      { path: 'accounts/:id/domains', element: <DomainsPage /> },
      { path: 'accounts/:id/databases', element: <DatabasesPage /> },
      { path: 'accounts/:id/ftp', element: <FtpPage /> },
      { path: 'deployments', element: <DeploymentsPage /> },
    ],
  },
];

export function HostingControlRoutes(): JSX.Element | null {
  return useRoutes(hostingControlRoutes);
}
