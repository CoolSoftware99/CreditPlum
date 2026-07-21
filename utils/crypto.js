const crypto = require('crypto');

/**
 * Authenticated field-level encryption (AES-256-GCM).
 *
 * Use this for genuinely sensitive values you must store but rarely query on
 * (e.g. a saved partial account reference, a note a user attaches to a product).
 *
 * DO NOT use this for passwords — passwords are one-way hashed with bcrypt in the
 * User model, never encrypted. And never store full card numbers, SSNs, or bank
 * credentials in this app at all: that belongs with a PCI/SOC2-compliant processor.
 *
 * Storage format: "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

const ALGO = 'aes-256-gcm';
const VERSION = 'v1';

function getKey() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must be 64 hex characters (32 bytes). See .env.example.'
    );
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
}

function decrypt(payload) {
  if (payload == null) return null;
  const parts = String(payload).split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Malformed ciphertext payload');
  }
  const [, ivHex, tagHex, dataHex] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
