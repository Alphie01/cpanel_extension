import { NavLink, Outlet } from 'react-router-dom';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { usePermissions } from '../hooks/usePermissions';
import { paths } from './paths';

const NAV = [
  { to: paths.servers, label: 'Servers', perm: PERMISSIONS.servers.view },
  { to: paths.accounts, label: 'Accounts', perm: PERMISSIONS.accounts.view },
  { to: paths.deployments, label: 'Deployments', perm: PERMISSIONS.deployments.view },
];

export function HostingControlLayout(): JSX.Element {
  const { has } = usePermissions();
  return (
    <div style={{ display: 'flex', gap: 24, padding: 24 }}>
      <nav style={{ minWidth: 180 }}>
        <h2 style={{ fontSize: 16 }}>Hosting Control</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {NAV.filter((n) => has(n.perm)).map((n) => (
            <li key={n.to} style={{ marginBottom: 8 }}>
              <NavLink
                to={n.to}
                style={({ isActive }) => ({
                  color: isActive ? '#2563eb' : '#374151',
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 500,
                })}
              >
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
