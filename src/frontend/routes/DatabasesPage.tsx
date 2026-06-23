import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Field, Input, PageHeader, Table, TD, TH } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { ErrorState, Forbidden, LoadingState } from '../components/states';
import { useCreateDatabase, useCreateDatabaseUser, useDatabases, useDeleteDatabase } from '../hooks/useDatabases';
import { usePermissions } from '../hooks/usePermissions';

export function DatabasesPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { has } = usePermissions();
  const overview = useDatabases(id);
  const createDb = useCreateDatabase(id ?? '');
  const createUser = useCreateDatabaseUser(id ?? '');
  const deleteDb = useDeleteDatabase(id ?? '');

  const [dbName, setDbName] = useState('');
  const [userName, setUserName] = useState('');
  const [userPass, setUserPass] = useState('');

  if (!has(PERMISSIONS.databases.view)) return <Forbidden />;
  if (overview.isLoading) return <LoadingState />;
  if (overview.isError) {
    return <ErrorState message={overview.error instanceof ApiError ? overview.error.message : 'Failed to load databases.'} />;
  }

  const data = overview.data ?? { databases: [], users: [] };
  const canManage = has(PERMISSIONS.databases.manage);

  const submitDb = (e: FormEvent): void => {
    e.preventDefault();
    createDb.mutate(dbName.trim(), { onSuccess: () => setDbName('') });
  };
  const submitUser = (e: FormEvent): void => {
    e.preventDefault();
    createUser.mutate(
      { name: userName.trim(), password: userPass },
      {
        onSuccess: () => {
          setUserName('');
          setUserPass('');
        },
      },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Databases" />

      {canManage ? (
        <Card>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <form onSubmit={submitDb} style={{ minWidth: 240 }}>
              <Field label="New database name" htmlFor="db-name">
                <Input id="db-name" value={dbName} onChange={(e) => setDbName(e.target.value)} required />
              </Field>
              <Button type="submit" tone="primary" disabled={createDb.isPending}>
                Create database
              </Button>
            </form>
            <form onSubmit={submitUser} style={{ minWidth: 240 }}>
              <Field label="New user name" htmlFor="db-user">
                <Input id="db-user" value={userName} onChange={(e) => setUserName(e.target.value)} required />
              </Field>
              <Field label="User password" htmlFor="db-pass">
                <Input
                  id="db-pass"
                  type="password"
                  autoComplete="new-password"
                  value={userPass}
                  onChange={(e) => setUserPass(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" tone="primary" disabled={createUser.isPending}>
                Create user
              </Button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card>
        <h3 style={{ marginTop: 0 }}>Databases</h3>
        {data.databases.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No databases.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Users</TH>
                <TH>Size</TH>
                <TH>&nbsp;</TH>
              </tr>
            </thead>
            <tbody>
              {data.databases.map((db) => (
                <tr key={db.name}>
                  <TD>{db.name}</TD>
                  <TD>{db.users.join(', ') || '—'}</TD>
                  <TD>{db.sizeMb === null ? '—' : `${db.sizeMb} MB`}</TD>
                  <TD>
                    {canManage ? (
                      <Button tone="danger" disabled={deleteDb.isPending} onClick={() => deleteDb.mutate(db.name)}>
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

      <Card>
        <h3 style={{ marginTop: 0 }}>Database users</h3>
        {data.users.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No database users.</p>
        ) : (
          <ul>
            {data.users.map((u) => (
              <li key={u.user}>{u.user}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
