// Cargar el Service Worker oficial de Angular
importScripts('/ngsw-worker.js');

const DB_NAME = 'reporte-servicio-db';
const STORE_NAME = 'shared-images';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveImages(files) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put(files, 'pending');

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    url.origin !== self.location.origin ||
    url.pathname !== '/share-target' ||
    event.request.method !== 'POST'
  ) {
    return;
  }

  event.respondWith(handleShare(event.request));
});

async function handleShare(request) {
  try {
    const formData = await request.formData();

    const files = formData
      .getAll('media')
      .filter((file) =>
        file instanceof File &&
        file.size > 0 &&
        file.type.startsWith('image/')
      );

    if (files.length === 0) {
      return Response.redirect('/share-target?shared=empty', 303);
    }

    await saveImages(files);

    return Response.redirect('/share-target?shared=success', 303);
  } catch (error) {
    console.error('Error al recibir archivos compartidos:', error);

    return Response.redirect('/share-target?shared=error', 303);
  }
}
