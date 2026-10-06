import { CustomUploadedStyle, StylePreset, VideoJob } from '../types';

const DB_NAME = 'AnimaStudio_LocalDB';
const DB_VERSION = 1;

export class LocalStorageDB {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('customStyles')) {
          db.createObjectStore('customStyles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveProject(job: VideoJob): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      // Store metadata without temporary object URLs
      const record = {
        ...job,
        originalBlobUrl: '', // URLs expire on reload, store metadata
        renderedBlobUrl: '',
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllProjects(): Promise<VideoJob[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteProject(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async saveCustomStyle(style: CustomUploadedStyle): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customStyles', 'readwrite');
      const store = tx.objectStore('customStyles');
      const req = store.put(style);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllCustomStyles(): Promise<CustomUploadedStyle[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customStyles', 'readonly');
      const store = tx.objectStore('customStyles');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteCustomStyle(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customStyles', 'readwrite');
      const store = tx.objectStore('customStyles');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getStorageEstimate(): Promise<{ usedMB: number; quotaMB: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const usedMB = Math.round((est.usage || 0) / (1024 * 1024));
      const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
      return { usedMB, quotaMB };
    }
    return { usedMB: 0, quotaMB: 1024 };
  }
}

export const localDB = new LocalStorageDB();
