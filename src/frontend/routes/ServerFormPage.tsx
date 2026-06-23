import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { ServerForm } from '../components/ServerForm';
import { ErrorState, Forbidden, LoadingState } from '../components/states';
import { usePermissions } from '../hooks/usePermissions';
import { useCreateServer, useServer, useUpdateServer } from '../hooks/useServers';
import { paths } from './paths';

export function ServerFormPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const { has } = usePermissions();

  const server = useServer(id);
  const create = useCreateServer();
  const update = useUpdateServer(id ?? '');

  const requiredPerm = editing ? PERMISSIONS.servers.edit : PERMISSIONS.servers.create;
  if (!has(requiredPerm)) return <Forbidden />;
  if (editing && server.isLoading) return <LoadingState />;
  if (editing && server.isError) {
    return <ErrorState message={server.error instanceof ApiError ? server.error.message : 'Failed to load server.'} />;
  }

  const pending = create.isPending || update.isPending;

  return (
    <div>
      <PageHeader title={editing ? 'Edit server' : 'New server'} />
      <ServerForm
        initial={editing ? server.data : undefined}
        submitting={pending}
        submitLabel={editing ? 'Save changes' : 'Create server'}
        onSubmit={(input) => {
          if (editing && id) {
            update.mutate(input, { onSuccess: () => navigate(paths.server(id)) });
          } else {
            create.mutate(input, { onSuccess: (srv) => navigate(paths.server(srv.id)) });
          }
        }}
      />
    </div>
  );
}
