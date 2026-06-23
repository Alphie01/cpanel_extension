import { describe, expect, it } from 'vitest';
import { parseBoolish, parseMb, parseWhmAccount } from '../../src/backend/utils/whm-account-parse';

describe('whm account parsing', () => {
  it('parseMb handles numbers, strings, suffixes and unlimited', () => {
    expect(parseMb(512)).toBe(512);
    expect(parseMb('512')).toBe(512);
    expect(parseMb('1.5G')).toBe(1536);
    expect(parseMb('unlimited')).toBeNull();
    expect(parseMb('')).toBeNull();
    expect(parseMb(null)).toBeNull();
  });

  it('parseBoolish handles WHM 0/1 and string flags', () => {
    expect(parseBoolish(1)).toBe(true);
    expect(parseBoolish(0)).toBe(false);
    expect(parseBoolish('1')).toBe(true);
    expect(parseBoolish('yes')).toBe(true);
    expect(parseBoolish('no')).toBe(false);
    expect(parseBoolish(undefined)).toBe(false);
  });

  it('parseWhmAccount extracts core fields defensively', () => {
    const parsed = parseWhmAccount({ user: 'bob', domain: 'bob.com', plan: 'Gold', suspended: 1, diskused: '10' });
    expect(parsed.cpanelUser).toBe('bob');
    expect(parsed.domain).toBe('bob.com');
    expect(parsed.plan).toBe('Gold');
    expect(parsed.suspended).toBe(true);
    expect(parsed.raw.diskused).toBe('10');
  });

  it('parseWhmAccount falls back to "unknown" when no user', () => {
    expect(parseWhmAccount({}).cpanelUser).toBe('unknown');
  });
});
