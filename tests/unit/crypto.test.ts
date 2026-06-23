import { describe, expect, it } from 'vitest';
import { createCryptoService } from '../../src/backend/utils/crypto';
import { ExtensionError } from '../../src/backend/utils/errors';

const svc = createCryptoService({ encryptionKey: Buffer.alloc(32, 9), encryptionKeyId: 'default' });

describe('crypto (AES-256-GCM)', () => {
  it('round-trips plaintext', () => {
    const { ciphertext, keyId } = svc.encrypt('whm-token-secret');
    expect(svc.decrypt(ciphertext, keyId)).toBe('whm-token-secret');
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const a = svc.encrypt('same-input');
    const b = svc.encrypt('same-input');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(svc.decrypt(a.ciphertext, 'default')).toBe('same-input');
  });

  it('fails to decrypt a tampered ciphertext', () => {
    const { ciphertext } = svc.encrypt('secret');
    const buf = Buffer.from(ciphertext, 'base64');
    buf[buf.length - 1] = buf[buf.length - 1]! ^ 0xff;
    expect(() => svc.decrypt(buf.toString('base64'), 'default')).toThrow(ExtensionError);
  });

  it('rejects a wrong-length key at construction', () => {
    expect(() => createCryptoService({ encryptionKey: Buffer.alloc(16), encryptionKeyId: 'default' })).toThrow(
      ExtensionError,
    );
  });

  it('rejects an unknown key id on decrypt', () => {
    const { ciphertext } = svc.encrypt('x');
    expect(() => svc.decrypt(ciphertext, 'rotated')).toThrow(ExtensionError);
  });
});
