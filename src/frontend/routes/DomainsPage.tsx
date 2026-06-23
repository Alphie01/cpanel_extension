import { useParams } from 'react-router-dom';
import { Badge, Button, Card, PageHeader, Table, TD, TH } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { ErrorState, Forbidden, LoadingState } from '../components/states';
import { useDomains, useTriggerAutoSsl } from '../hooks/useDomains';
import { usePermissions } from '../hooks/usePermissions';

export function DomainsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { has } = usePermissions();
  const domains = useDomains(id);
  const autoSsl = useTriggerAutoSsl(id ?? '');

  if (!has(PERMISSIONS.domains.view)) return <Forbidden />;
  if (domains.isLoading) return <LoadingState />;
  if (domains.isError) {
    return <ErrorState message={domains.error instanceof ApiError ? domains.error.message : 'Failed to load domains.'} />;
  }

  const rows = domains.data ?? [];

  return (
    <div>
      <PageHeader
        title="Domains"
        actions={
          has(PERMISSIONS.domains.manage) ? (
            <Button tone="default" disabled={autoSsl.isPending} onClick={() => autoSsl.mutate()}>
              {autoSsl.isPending ? 'Running AutoSSL…' : 'Run AutoSSL'}
            </Button>
          ) : undefined
        }
      />
      <Card>
        {rows.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No domains.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Domain</TH>
                <TH>Type</TH>
                <TH>SSL</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.domain}>
                  <TD>{d.domain}</TD>
                  <TD>
                    <Badge>{d.type}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={d.sslStatus === 'active' ? 'primary' : 'subtle'}>
                      {d.sslStatus ?? 'unknown'}
                    </Badge>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
