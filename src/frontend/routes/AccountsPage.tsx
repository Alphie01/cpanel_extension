import { useNavigate } from 'react-router-dom';
import { Badge, Button, PageHeader, Table, TD, TH } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { EmptyState, ErrorState, Forbidden, LoadingState } from '../components/states';
import { useAccounts } from '../hooks/useAccounts';
import { usePermissions } from '../hooks/usePermissions';
import { paths } from './paths';

function formatMb(mb: number | null): string {
  if (mb === null) return '—';
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export function AccountsPage(): JSX.Element {
  const { has } = usePermissions();
  const navigate = useNavigate();
  const query = useAccounts();

  if (!has(PERMISSIONS.accounts.view)) return <Forbidden />;

  return (
    <div>
      <PageHeader title="Accounts" description="cPanel accounts synced from your WHM servers." />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Failed to load accounts.'} />
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Run a server sync to mirror its cPanel accounts here."
        />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <TH>User</TH>
              <TH>Domain</TH>
              <TH>Plan</TH>
              <TH>Disk used</TH>
              <TH>Status</TH>
              <TH>&nbsp;</TH>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((a) => (
              <tr key={a.id}>
                <TD>{a.cpanelUser}</TD>
                <TD>{a.domain ?? '—'}</TD>
                <TD>{a.plan ?? '—'}</TD>
                <TD>
                  {formatMb(a.diskUsedMb)}
                  {a.diskLimitMb !== null ? ` / ${formatMb(a.diskLimitMb)}` : ''}
                </TD>
                <TD>
                  <Badge tone={a.suspended ? 'danger' : 'primary'}>
                    {a.suspended ? 'Suspended' : 'Active'}
                  </Badge>
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {has(PERMISSIONS.email.view) ? (
                      <Button tone="subtle" onClick={() => navigate(paths.accountEmails(a.id))}>
                        Emails
                      </Button>
                    ) : null}
                    {has(PERMISSIONS.domains.view) ? (
                      <Button tone="subtle" onClick={() => navigate(paths.accountDomains(a.id))}>
                        Domains
                      </Button>
                    ) : null}
                    {has(PERMISSIONS.databases.view) ? (
                      <Button tone="subtle" onClick={() => navigate(paths.accountDatabases(a.id))}>
                        Databases
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}
