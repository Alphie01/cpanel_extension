/* Shared UI states: loading / empty / error / forbidden. Every data view renders
 * one of these so no screen is ever left blank or raw. */
import type { ReactNode } from 'react';
import { Alert, Card, Spinner } from '@host/design-system';

export function LoadingState(): JSX.Element {
  return (
    <Card>
      <Spinner />
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {description ? <p style={{ color: '#6b7280' }}>{description}</p> : null}
        {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
      </div>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }): JSX.Element {
  return <Alert tone="danger">{message}</Alert>;
}

export function Forbidden(): JSX.Element {
  return <Alert tone="danger">You do not have permission to view this section.</Alert>;
}
