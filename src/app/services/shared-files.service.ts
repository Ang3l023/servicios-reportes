import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedFilesService {
  private dbName = 'pwa-shared-files-db';
  private storeName = 'shared-files';

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSharedImages(): Promise<File[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        const files = records.map((r: any) => r.file);
        resolve(files);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearSharedImages(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
