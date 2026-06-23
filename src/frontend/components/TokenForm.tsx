import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select } from '@host/design-system';
import type { CreateTokenInput, TokenScope } from '../types/api.types';

/* The token value is WRITE-ONLY: it is sent once on create and never read back.
 * Existing tokens display only their last four characters elsewhere. */
export function TokenForm({
  submitting = false,
  onSubmit,
}: {
  submitting?: boolean;
  onSubmit: (input: CreateTokenInput) => void;
}): JSX.Element {
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<TokenScope>('WHM');
  const [whmUser, setWhmUser] = useState('root');
  const [cpanelUser, setCpanelUser] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit({
      label: label.trim(),
      scope,
      whmUser: whmUser.trim(),
      cpanelUser: scope === 'CPANEL' ? cpanelUser.trim() : undefined,
      token,
    });
    setToken('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Label" htmlFor="tok-label">
        <Input id="tok-label" value={label} onChange={(e) => setLabel(e.target.value)} required />
      </Field>
      <Field label="Scope" htmlFor="tok-scope">
        <Select id="tok-scope" value={scope} onChange={(e) => setScope(e.target.value as TokenScope)}>
          <option value="WHM">WHM (whostmgr)</option>
          <option value="CPANEL">cPanel (single account)</option>
        </Select>
      </Field>
      <Field label={scope === 'CPANEL' ? 'WHM owner user' : 'WHM user'} htmlFor="tok-user">
        <Input id="tok-user" value={whmUser} onChange={(e) => setWhmUser(e.target.value)} required />
      </Field>
      {scope === 'CPANEL' ? (
        <Field label="cPanel user" htmlFor="tok-cpuser">
          <Input id="tok-cpuser" value={cpanelUser} onChange={(e) => setCpanelUser(e.target.value)} required />
        </Field>
      ) : null}
      <Field label="API token" htmlFor="tok-secret" hint="Stored encrypted. Shown only once — it cannot be read back.">
        <Input
          id="tok-secret"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" tone="primary" disabled={submitting}>
        Add token
      </Button>
    </form>
  );
}
