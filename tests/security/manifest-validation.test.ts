import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateManifest } from '../../scripts/validate-manifest';

function loadManifest(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'extension.manifest.json'), 'utf8'),
  ) as Record<string, unknown>;
}

describe('manifest validation', () => {
  it('the shipped manifest is valid', () => {
    const result = validateManifest(loadManifest());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('rejects a non-namespaced permission', () => {
    const m = loadManifest();
    (m.permissions as string[]).push('bad.permission');
    expect(validateManifest(m).ok).toBe(false);
  });

  it('rejects a route requiring an undeclared permission', () => {
    const m = loadManifest();
    const frontend = m.frontend as { routes: Array<{ requiredPermissions: string[] }> };
    frontend.routes[0]!.requiredPermissions = ['hosting_control.not_declared'];
    expect(validateManifest(m).ok).toBe(false);
  });

  it('rejects a missing encryption-key env declaration', () => {
    const m = loadManifest();
    m.env = (m.env as Array<{ name: string }>).filter((e) => e.name !== 'EXT_HOSTING_ENCRYPTION_KEY');
    expect(validateManifest(m).ok).toBe(false);
  });
});
