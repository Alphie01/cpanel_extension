/* LOCAL STUB of the host design system.
 *
 * The extension imports UI primitives from "@host/design-system" (aliased to
 * this file). In production the Relation AI host replaces this module with its
 * real design-system package, so the extension inherits the platform look &
 * feel. Keep these primitives minimal and neutral — do NOT add product-specific
 * styling here; that belongs in the host. Styles below are intentionally plain
 * placeholders so the scaffold renders coherently during local development. */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type Tone = 'default' | 'primary' | 'danger' | 'subtle';

const toneColor: Record<Tone, string> = {
  default: '#1f2937',
  primary: '#2563eb',
  danger: '#dc2626',
  subtle: '#6b7280',
};

export function Button({
  tone = 'default',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }): JSX.Element {
  return (
    <button
      {...rest}
      style={{
        background: tone === 'subtle' ? 'transparent' : toneColor[tone],
        color: tone === 'subtle' ? toneColor.subtle : '#fff',
        border: tone === 'subtle' ? '1px solid #d1d5db' : 'none',
        borderRadius: 8,
        padding: '8px 14px',
        fontWeight: 600,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
        {description ? <p style={{ color: toneColor.subtle, margin: '4px 0 0' }}>{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</span>
      {children}
      {hint ? <span style={{ display: 'block', color: toneColor.subtle, fontSize: 12, marginTop: 4 }}>{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      {...props}
      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' }}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      {...props}
      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8 }}
    />
  );
}

export function Badge({ children, tone = 'subtle' }: { children: ReactNode; tone?: Tone }): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: toneColor[tone],
        background: '#f3f4f6',
      }}
    >
      {children}
    </span>
  );
}

export function Spinner(): JSX.Element {
  return <span role="status" aria-label="loading">Loading…</span>;
}

export function Alert({ tone = 'default', children }: { tone?: Tone; children: ReactNode }): JSX.Element {
  return (
    <div
      role="alert"
      style={{
        border: `1px solid ${toneColor[tone]}`,
        color: toneColor[tone],
        borderRadius: 8,
        padding: '10px 14px',
        background: '#fff',
      }}
    >
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }): JSX.Element {
  return <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>;
}

export function TH({ children }: { children: ReactNode }): JSX.Element {
  return (
    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontSize: 13, color: toneColor.subtle }}>
      {children}
    </th>
  );
}

export function TD({ children }: { children: ReactNode }): JSX.Element {
  return <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{children}</td>;
}
