import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12-byte IV for AES-GCM

export function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is missing.');
  }
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32) {
    throw new Error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY must be a 32-byte base64-encoded string.');
  }
  return key;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (all in hex format)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string formatted as iv:authTag:ciphertext.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Return original string if not in iv:authTag:ciphertext format (e.g. legacy plain text)
    return encryptedText;
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
