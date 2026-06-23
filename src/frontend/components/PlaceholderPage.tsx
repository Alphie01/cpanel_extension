/* Rendered by routes whose backend module is registered but not yet implemented
 * (returns NOT_IMPLEMENTED). Keeps the navigation coherent and permission-gated
 * while the module is built. */
import { Card, PageHeader } from '@host/design-system';

export function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div>
      <PageHeader title={title} description="Planned module" />
      <Card>
        <p style={{ margin: 0 }}>
          This module is planned. Its API endpoints are registered and permission-guarded but
          currently return <code>NOT_IMPLEMENTED</code> until the feature ships.
        </p>
      </Card>
    </div>
  );
}
