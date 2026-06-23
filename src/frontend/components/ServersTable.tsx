import { Badge, Button, Table, TD, TH } from '@host/design-system';
import type { ServerDto, ServerStatus } from '../types/api.types';

const statusTone: Record<ServerStatus, 'primary' | 'subtle' | 'danger'> = {
  ACTIVE: 'primary',
  INACTIVE: 'subtle',
  UNREACHABLE: 'danger',
};

export function ServersTable({
  servers,
  onOpen,
}: {
  servers: ServerDto[];
  onOpen: (id: string) => void;
}): JSX.Element {
  return (
    <Table>
      <thead>
        <tr>
          <TH>Name</TH>
          <TH>Host</TH>
          <TH>Status</TH>
          <TH>Tokens</TH>
          <TH>Last checked</TH>
          <TH>&nbsp;</TH>
        </tr>
      </thead>
      <tbody>
        {servers.map((s) => (
          <tr key={s.id}>
            <TD>{s.name}</TD>
            <TD>
              {s.hostname}:{s.port}
            </TD>
            <TD>
              <Badge tone={statusTone[s.status]}>{s.status}</Badge>
            </TD>
            <TD>{s.tokenCount}</TD>
            <TD>{s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString() : '—'}</TD>
            <TD>
              <Button tone="subtle" onClick={() => onOpen(s.id)}>
                Open
              </Button>
            </TD>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
