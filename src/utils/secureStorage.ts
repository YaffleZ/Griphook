/**
 * Secure Storage Utility for Griphook
 * Provides encrypted storage for sensitive authentication data using Web Crypto API
 */

interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

class SecureStorage {
  private static instance: SecureStorage;
  private masterKey: CryptoKey | null = null;
  private readonly keyPrefix = 'griphook_secure_';

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Initialize encryption with a user-derived key using Web Crypto API
   */
  private async initializeMasterKey(): Promise<CryptoKey> {
    if (this.masterKey) {
      return this.masterKey;
    }

    // Generate a unique device identifier
    const deviceId = await this.getDeviceIdentifier();
    
    // Convert device ID to key material
    const keyMaterial = new TextEncoder().encode(deviceId + 'griphook-secret-salt-2024');
    
    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive a strong key using PBKDF2
    this.masterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('griphook-salt-2024'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    return this.masterKey;
  }

  /**
   * Generate a device-specific identifier
   */
  private async getDeviceIdentifier(): Promise<string> {
    // Try to get a consistent device ID
    if (typeof window !== 'undefined') {
      // Browser environment - use a combination of available identifiers
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
      }
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
      ].join('|');
      
      // Hash the fingerprint
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprint);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for server-side or if fingerprinting fails
    return 'fallback-device-id-' + Date.now();
  }

  /**
   * Encrypt data using AES-GCM
   */
  private async encryptData(data: string): Promise<EncryptedData> {
    const key = await this.initializeMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
    const salt = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: salt // Use salt as additional authenticated data
      },
      key,
      dataBuffer
    );
    
    return {
      data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  private async decryptData(encryptedData: EncryptedData): Promise<string> {
    const key = await this.initializeMasterKey();
    const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const salt = new Uint8Array(encryptedData.salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const data = new Uint8Array(encryptedData.data.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: salt
      },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Store encrypted data in localStorage
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const encryptedData = await this.encryptData(value);
      const storageKey = this.keyPrefix + key;
      localStorage.setItem(storageKey, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      const storageKey = this.keyPrefix + key;
      const encryptedJson = localStorage.getItem(storageKey);
      
      if (!encryptedJson) {
        return null;
      }
      
      const encryptedData: EncryptedData = JSON.parse(encryptedJson);
      return await this.decryptData(encryptedData);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return null;
    }
  }

  /**
   * Remove encrypted data from localStorage
   */
  removeSecureItem(key: string): void {
    const storageKey = this.keyPrefix + key;
    localStorage.removeItem(storageKey);
  }

  /**
   * Clear all encrypted data
   */
  clearAllSecureData(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.keyPrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if encrypted data exists
   */
  hasSecureItem(key: string): boolean {
    const storageKey = this.keyPrefix + key;
    return localStorage.getItem(storageKey) !== null;
  }
}

// Specific methods for Azure authentication data
export class AzureSecureStorage {
  private static storage = SecureStorage.getInstance();

  // Azure Access Token
  static async setAccessToken(token: string): Promise<void> {
    await this.storage.setSecureItem('azure_access_token', token);
  }

  static async getAccessToken(): Promise<string | null> {
    return await this.storage.getSecureItem('azure_access_token');
  }

  // Azure Refresh Token
  static async setRefreshToken(token: string): Promise<void> {
    await this.storage.setSecureItem('azure_refresh_token', token);
  }

  static async getRefreshToken(): Promise<string | null> {
    return await this.storage.getSecureItem('azure_refresh_token');
  }

  // Azure Subscriptions
  static async setSubscriptions(subscriptions: any[]): Promise<void> {
    await this.storage.setSecureItem('azure_subscriptions', JSON.stringify(subscriptions));
  }

  static async getSubscriptions(): Promise<any[] | null> {
    const data = await this.storage.getSecureItem('azure_subscriptions');
    return data ? JSON.parse(data) : null;
  }

  // Azure Key Vaults
  static async setKeyVaults(keyVaults: any[]): Promise<void> {
    await this.storage.setSecureItem('azure_key_vaults', JSON.stringify(keyVaults));
  }

  static async getKeyVaults(): Promise<any[] | null> {
    const data = await this.storage.getSecureItem('azure_key_vaults');
    return data ? JSON.parse(data) : null;
  }

  // Clear all Azure data
  static clearAllAzureData(): void {
    const storage = SecureStorage.getInstance();
    storage.removeSecureItem('azure_access_token');
    storage.removeSecureItem('azure_refresh_token');
    storage.removeSecureItem('azure_subscriptions');
    storage.removeSecureItem('azure_key_vaults');
  }

  // Migration helper - move from plain localStorage to encrypted storage
  static async migrateFromPlainStorage(): Promise<void> {
    console.log('Migrating from plain storage to encrypted storage...');
    
    // Migrate existing data if present
    const plainToken = localStorage.getItem('azure_access_token');
    if (plainToken) {
      await this.setAccessToken(plainToken);
      localStorage.removeItem('azure_access_token');
      console.log('Migrated access token');
    }

    const plainRefreshToken = localStorage.getItem('azure_refresh_token');
    if (plainRefreshToken) {
      await this.setRefreshToken(plainRefreshToken);
      localStorage.removeItem('azure_refresh_token');
      console.log('Migrated refresh token');
    }

    const plainSubscriptions = localStorage.getItem('azure_subscriptions');
    if (plainSubscriptions) {
      const subscriptions = JSON.parse(plainSubscriptions);
      await this.setSubscriptions(subscriptions);
      localStorage.removeItem('azure_subscriptions');
      console.log('Migrated subscriptions');
    }

    const plainKeyVaults = localStorage.getItem('azure_key_vaults');
    if (plainKeyVaults) {
      const keyVaults = JSON.parse(plainKeyVaults);
      await this.setKeyVaults(keyVaults);
      localStorage.removeItem('azure_key_vaults');
      console.log('Migrated key vaults');
    }
    
    console.log('Migration completed');
  }

  // Check if we have any data (encrypted or plain)
  static async hasAnyAuthData(): Promise<boolean> {
    const storage = SecureStorage.getInstance();
    return storage.hasSecureItem('azure_access_token') || 
           localStorage.getItem('azure_access_token') !== null;
  }
}

export default SecureStorage;