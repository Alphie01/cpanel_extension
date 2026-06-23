import { useNavigate } from 'react-router-dom';
import { Button, PageHeader } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { ServersTable } from '../components/ServersTable';
import { EmptyState, ErrorState, Forbidden, LoadingState } from '../components/states';
import { usePermissions } from '../hooks/usePermissions';
import { useServers } from '../hooks/useServers';
import { paths } from './paths';

export function ServersListPage(): JSX.Element {
  const navigate = useNavigate();
  const { has } = usePermissions();
  const query = useServers();

  if (!has(PERMISSIONS.servers.view)) return <Forbidden />;

  const addButton = has(PERMISSIONS.servers.create) ? (
    <Button tone="primary" onClick={() => navigate(paths.newServer)}>
      Add server
    </Button>
  ) : undefined;

  return (
    <div>
      <PageHeader title="Servers" description="WHM/cPanel servers connected to this tenant." actions={addButton} />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Failed to load servers.'} />
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No servers yet"
          description="Connect your first WHM server to get started."
          action={addButton}
        />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <ServersTable servers={query.data.items} onOpen={(id) => navigate(paths.server(id))} />
      ) : null}
    </div>
  );
}
