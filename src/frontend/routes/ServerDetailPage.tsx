import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, PageHeader } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { TestConnectionButton } from '../components/TestConnectionButton';
import { TokensPanel } from '../components/TokensPanel';
import { ErrorState, Forbidden, LoadingState } from '../components/states';
import { usePermissions } from '../hooks/usePermissions';
import { useDeleteServer, useServer } from '../hooks/useServers';
import { paths } from './paths';

export function ServerDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const server = useServer(id);
  const remove = useDeleteServer();

  if (!has(PERMISSIONS.servers.view)) return <Forbidden />;
  if (server.isLoading) return <LoadingState />;
  if (server.isError || !server.data) {
    return <ErrorState message={server.error instanceof ApiError ? server.error.message : 'Server not found.'} />;
  }

  const s = server.data;
  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      {has(PERMISSIONS.servers.edit) ? (
        <Button tone="subtle" onClick={() => navigate(paths.editServer(s.id))}>
          Edit
        </Button>
      ) : null}
      {has(PERMISSIONS.servers.delete) ? (
        <Button
          tone="danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate(s.id, { onSuccess: () => navigate(paths.servers) })}
        >
          Delete
        </Button>
      ) : null}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={s.name} description={`${s.hostname}:${s.port}`} actions={actions} />

      <Card>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Detail label="Status">
            <Badge tone={s.status === 'ACTIVE' ? 'primary' : s.status === 'UNREACHABLE' ? 'danger' : 'subtle'}>
              {s.status}
            </Badge>
          </Detail>
          <Detail label="SSL verification">{s.verifySsl ? 'Enabled' : 'Disabled'}</Detail>
          <Detail label="Active tokens">{String(s.tokenCount)}</Detail>
          <Detail label="Last checked">
            {s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString() : '—'}
          </Detail>
        </div>
        {s.lastError ? <p style={{ color: '#dc2626', marginTop: 12 }}>Last error: {s.lastError}</p> : null}
        <div style={{ marginTop: 16 }}>
          <TestConnectionButton serverId={s.id} />
        </div>
      </Card>

      <TokensPanel serverId={s.id} />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <div style={{ color: '#6b7280', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{children}</div>
    </div>
  );
}
