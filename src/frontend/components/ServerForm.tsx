import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select } from '@host/design-system';
import type { CreateServerInput } from '../types/api.types';

export interface ServerFormValues {
  name?: string;
  hostname?: string;
  port?: number;
  verifySsl?: boolean;
  notes?: string | null;
}

export function ServerForm({
  initial,
  submitting = false,
  submitLabel = 'Save server',
  onSubmit,
}: {
  initial?: ServerFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (input: CreateServerInput) => void;
}): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [hostname, setHostname] = useState(initial?.hostname ?? '');
  const [port, setPort] = useState(String(initial?.port ?? 2087));
  const [verifySsl, setVerifySsl] = useState(initial?.verifySsl ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      hostname: hostname.trim(),
      port: Number(port),
      verifySsl,
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Server name" htmlFor="srv-name">
        <Input id="srv-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Hostname" htmlFor="srv-host" hint="FQDN or IP of the WHM server.">
        <Input
          id="srv-host"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="server.example.com"
          required
        />
      </Field>
      <Field label="WHM port" htmlFor="srv-port">
        <Input
          id="srv-port"
          type="number"
          min={1}
          max={65535}
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />
      </Field>
      <Field label="SSL verification" htmlFor="srv-ssl">
        <Select
          id="srv-ssl"
          value={verifySsl ? 'true' : 'false'}
          onChange={(e) => setVerifySsl(e.target.value === 'true')}
        >
          <option value="true">Verify SSL certificate (recommended)</option>
          <option value="false">Do not verify (self-signed)</option>
        </Select>
      </Field>
      <Field label="Notes" htmlFor="srv-notes">
        <Input id="srv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button type="submit" tone="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
