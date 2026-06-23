import { useState } from 'react';
import { Badge, Button, Card, Table, TD, TH } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { useCreateToken, useDeleteToken, useTokens } from '../hooks/useTokens';
import { usePermissions } from '../hooks/usePermissions';
import { ErrorState, LoadingState } from './states';
import { TokenForm } from './TokenForm';
import { ApiError } from '../api/client';

export function TokensPanel({ serverId }: { serverId: string }): JSX.Element {
  const { has } = usePermissions();
  const tokens = useTokens(serverId);
  const createToken = useCreateToken(serverId);
  const deleteToken = useDeleteToken(serverId);
  const [adding, setAdding] = useState(false);

  if (!has(PERMISSIONS.tokens.view)) {
    return <Card>You do not have permission to view tokens.</Card>;
  }
  if (tokens.isLoading) return <LoadingState />;
  if (tokens.isError) {
    const message = tokens.error instanceof ApiError ? tokens.error.message : 'Failed to load tokens.';
    return <ErrorState message={message} />;
  }

  const rows = tokens.data ?? [];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>API tokens</h3>
        {has(PERMISSIONS.tokens.create) ? (
          <Button tone="subtle" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : 'Add token'}
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div style={{ marginBottom: 16 }}>
          <TokenForm
            submitting={createToken.isPending}
            onSubmit={(input) =>
              createToken.mutate(input, { onSuccess: () => setAdding(false) })
            }
          />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No tokens yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <TH>Label</TH>
              <TH>Scope</TH>
              <TH>User</TH>
              <TH>Token</TH>
              <TH>Active</TH>
              <TH>&nbsp;</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <TD>{t.label}</TD>
                <TD>
                  <Badge>{t.scope}</Badge>
                </TD>
                <TD>{t.cpanelUser ?? t.whmUser}</TD>
                <TD>••••{t.lastFour ?? ''}</TD>
                <TD>{t.isActive ? 'Yes' : 'No'}</TD>
                <TD>
                  {has(PERMISSIONS.tokens.delete) ? (
                    <Button tone="danger" disabled={deleteToken.isPending} onClick={() => deleteToken.mutate(t.id)}>
                      Delete
                    </Button>
                  ) : null}
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
