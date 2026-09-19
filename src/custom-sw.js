importScripts('./ngsw-worker.js');

// Nombre de la base de datos IndexedDB local
const DB_NAME = 'pwa-shared-files-db';
const STORE_NAME = 'shared-files';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFilesToIndexedDB(files) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const file of files) {
      store.add({
        file: file,
        timestamp: Date.now()
      });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Interceptar la petición POST de Android Share Target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = [];

          // Extraer cualquier archivo presente en el FormData (media, files, image, etc.)
          for (const [key, value] of formData.entries()) {
            if (value && typeof value === 'object' && value.name) {
              files.push(value);
            }
          }

          if (files.length > 0) {
            await saveFilesToIndexedDB(files);
          }
        } catch (err) {
          console.error('Error procesando archivos en SW:', err);
        }

        // Redirigir a la ruta Angular mediante GET (HTTP 303)
        return Response.redirect('/share-target?fromShare=true', 303);
      })()
    );
  }
});
