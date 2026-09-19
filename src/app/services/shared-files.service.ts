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
    // Reintentar lectura brevemente por si IndexedDB sigue escribiendo
    for (let attempt = 0; attempt < 3; attempt++) {
      const files = await this.readFromDB();
      if (files.length > 0) {
        return files;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return [];
  }

  private async readFromDB(): Promise<File[]> {
    try {
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
    } catch {
      return [];
    }
  }

  async clearSharedImages(): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Error al limpiar IndexedDB:', err);
    }
  }
}
