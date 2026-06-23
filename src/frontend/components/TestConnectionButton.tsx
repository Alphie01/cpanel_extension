import { Alert, Button } from '@host/design-system';
import { useTestConnection } from '../hooks/useServers';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';

export function TestConnectionButton({ serverId }: { serverId: string }): JSX.Element | null {
  const { has } = usePermissions();
  const mutation = useTestConnection(serverId);

  if (!has(PERMISSIONS.servers.testConnection)) return null;

  const result = mutation.data;
  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <div>
      <Button tone="default" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Testing…' : 'Test connection'}
      </Button>
      {result ? (
        <div style={{ marginTop: 10 }}>
          <Alert tone={result.ok ? 'primary' : 'danger'}>{result.message}</Alert>
        </div>
      ) : null}
      {errorMessage ? (
        <div style={{ marginTop: 10 }}>
          <Alert tone="danger">{errorMessage}</Alert>
        </div>
      ) : null}
    </div>
  );
}
