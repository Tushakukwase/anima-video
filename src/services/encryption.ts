/**
 * End-to-End Client-Side Encryption using Web Crypto API (AES-GCM 256-bit)
 * Zero external servers, 100% in-browser mathematical cryptographic security.
 */

export class CryptoVault {
  private static readonly SALT_BYTES = 16;
  private static readonly IV_BYTES = 12;
  private static readonly ITERATIONS = 100000;

  /**
   * Encrypts plain text or JSON payload with AES-GCM 256
   */
  public static async encrypt(plainData: string, passphrase: string): Promise<string> {
    const enc = new TextEncoder();
    const dataBytes = enc.encode(plainData);

    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_BYTES));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBytes
    );

    // Combine Salt + IV + Ciphertext
    const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts AES-GCM encrypted payload with user passphrase
   */
  public static async decrypt(encryptedBase64: string, passphrase: string): Promise<string> {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const rawStr = atob(encryptedBase64);
    const combined = new Uint8Array(rawStr.length);
    for (let i = 0; i < rawStr.length; i++) {
      combined[i] = rawStr.charCodeAt(i);
    }

    const salt = combined.slice(0, this.SALT_BYTES);
    const iv = combined.slice(this.SALT_BYTES, this.SALT_BYTES + this.IV_BYTES);
    const ciphertext = combined.slice(this.SALT_BYTES + this.IV_BYTES);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return dec.decode(decrypted);
  }
}
