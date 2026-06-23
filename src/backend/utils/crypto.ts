/* AES-256-GCM authenticated encryption for tokens & SFTP credentials at rest.
 *
 * Storage format (single base64 string stored in tokenEnc / secretEnc):
 *     base64( iv[12] ‖ authTag[16] ‖ ciphertext )
 *
 * - Fresh random 12-byte IV per encryption (never reused).
 * - GCM auth tag guarantees integrity: a tampered ciphertext fails to decrypt.
 * - `keyId` is stored alongside the ciphertext to allow future key rotation.
 * Plaintext is only ever handled at the encrypt/decrypt boundary and never
 * logged or returned in any DTO. */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { ExtErrorCode } from '../../shared/constants/error-codes';
import { ExtensionError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export interface EncryptedSecret {
  ciphertext: string;
  keyId: string;
}

export interface CryptoService {
  encrypt(plaintext: string): EncryptedSecret;
  decrypt(ciphertext: string, keyId: string): string;
}

export interface CryptoConfig {
  encryptionKey: Buffer;
  encryptionKeyId: string;
}

export function createCryptoService(config: CryptoConfig): CryptoService {
  const { encryptionKey: key, encryptionKeyId: keyId } = config;
  if (key.length !== KEY_BYTES) {
    throw new ExtensionError(
      ExtErrorCode.ENCRYPTION_KEY_INVALID,
      `Encryption key must be ${KEY_BYTES} bytes (got ${key.length}).`,
      500,
    );
  }

  return {
    encrypt(plaintext: string): EncryptedSecret {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const packed = Buffer.concat([iv, authTag, encrypted]).toString('base64');
      return { ciphertext: packed, keyId };
    },

    decrypt(ciphertext: string, usedKeyId: string): string {
      const expected = Buffer.from(keyId);
      const got = Buffer.from(usedKeyId);
      if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
        throw new ExtensionError(
          ExtErrorCode.INTERNAL,
          'Secret was encrypted with an unknown key id.',
          500,
        );
      }
      const buf = Buffer.from(ciphertext, 'base64');
      if (buf.length <= IV_BYTES + TAG_BYTES) {
        throw new ExtensionError(ExtErrorCode.INTERNAL, 'Malformed encrypted secret.', 500);
      }
      const iv = buf.subarray(0, IV_BYTES);
      const authTag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
      const data = buf.subarray(IV_BYTES + TAG_BYTES);
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      try {
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
      } catch {
        // Auth-tag mismatch: tampered ciphertext or wrong key. Never leak details.
        throw new ExtensionError(
          ExtErrorCode.INTERNAL,
          'Failed to decrypt secret (integrity check failed).',
          500,
        );
      }
    },
  };
}
