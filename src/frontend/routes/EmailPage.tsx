import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, Field, Input, PageHeader, Table, TD, TH } from '@host/design-system';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { ApiError } from '../api/client';
import { ErrorState, Forbidden, LoadingState } from '../components/states';
import { useCreateEmail, useDeleteEmail, useEmails } from '../hooks/useEmails';
import { usePermissions } from '../hooks/usePermissions';

function quotaLabel(mb: number | null): string {
  return mb === null ? 'Unlimited' : `${mb} MB`;
}

export function EmailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { has } = usePermissions();
  const emails = useEmails(id);
  const createEmail = useCreateEmail(id ?? '');
  const deleteEmail = useDeleteEmail(id ?? '');

  const [adding, setAdding] = useState(false);
  const [user, setUser] = useState('');
  const [domain, setDomain] = useState('');
  const [password, setPassword] = useState('');
  const [quotaMb, setQuotaMb] = useState('0');

  if (!has(PERMISSIONS.email.view)) return <Forbidden />;
  if (emails.isLoading) return <LoadingState />;
  if (emails.isError) {
    return <ErrorState message={emails.error instanceof ApiError ? emails.error.message : 'Failed to load email accounts.'} />;
  }

  const rows = emails.data ?? [];

  const handleCreate = (event: FormEvent): void => {
    event.preventDefault();
    createEmail.mutate(
      { user: user.trim(), domain: domain.trim(), password, quotaMb: Number(quotaMb) },
      {
        onSuccess: () => {
          setAdding(false);
          setUser('');
          setPassword('');
          setQuotaMb('0');
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Email accounts"
        actions={
          has(PERMISSIONS.email.manage) ? (
            <Button tone="primary" onClick={() => setAdding((v) => !v)}>
              {adding ? 'Cancel' : 'New email account'}
            </Button>
          ) : undefined
        }
      />

      {adding ? (
        <div style={{ marginBottom: 16 }}>
          <Card>
            <form onSubmit={handleCreate}>
              <Field label="Mailbox name" htmlFor="em-user">
                <Input id="em-user" value={user} onChange={(e) => setUser(e.target.value)} required />
              </Field>
              <Field label="Domain" htmlFor="em-domain">
                <Input id="em-domain" value={domain} onChange={(e) => setDomain(e.target.value)} required />
              </Field>
              <Field label="Password" htmlFor="em-pass" hint="Stored by cPanel; not retrievable here.">
                <Input
                  id="em-pass"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field label="Quota (MB, 0 = unlimited)" htmlFor="em-quota">
                <Input id="em-quota" type="number" min={0} value={quotaMb} onChange={(e) => setQuotaMb(e.target.value)} />
              </Field>
              <Button type="submit" tone="primary" disabled={createEmail.isPending}>
                Create
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No email accounts.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Address</TH>
                <TH>Quota</TH>
                <TH>Used</TH>
                <TH>Status</TH>
                <TH>&nbsp;</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.email}>
                  <TD>{m.email}</TD>
                  <TD>{quotaLabel(m.quotaMb)}</TD>
                  <TD>{m.usedMb === null ? '—' : `${m.usedMb} MB`}</TD>
                  <TD>
                    <Badge tone={m.suspended ? 'danger' : 'primary'}>
                      {m.suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </TD>
                  <TD>
                    {has(PERMISSIONS.email.manage) ? (
                      <Button tone="danger" disabled={deleteEmail.isPending} onClick={() => deleteEmail.mutate(m.email)}>
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
    </div>
  );
}
