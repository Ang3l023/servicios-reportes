import Busboy from 'busboy';
import { kv } from '@vercel/kv';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  return new Promise((resolve) => {
    const savedFiles = [];
    const filePromises = [];
    const fields = {};

    try {
      const busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB por archivo
      });

      // 1. CAPTURA DE ARCHIVOS (Acepta cualquier nombre de parámetro: media, file, image, etc.)
      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];

        console.log(`Archivo detectado bajo el campo "${fieldname}":`, filename, mimeType);

        const filePromise = new Promise((resFile) => {
          file.on('data', (data) => chunks.push(data));
          file.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
              savedFiles.push({
                name: filename || `shared_image_${savedFiles.length + 1}.jpg`,
                type: mimeType || 'image/jpeg',
                data: buffer.toString('base64'),
              });
            }
            resFile();
          });
        });

        filePromises.push(filePromise);
      });

      // 2. CAPTURA DE CAMPOS DE TEXTO (Por si Motorola/Honor envía URIs en texto)
      busboy.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      busboy.on('finish', async () => {
        await Promise.all(filePromises);

        console.log(`Total archivos capturados: ${savedFiles.length}`);
        console.log('Campos de texto recibidos:', Object.keys(fields));

        if (savedFiles.length === 0) {
          console.warn('Ningún archivo fue adjuntado por el sistema de compartición');
          res.writeHead(303, { Location: '/share-target?error=no_files' }).end();
          return resolve();
        }

        const shareId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await kv.set(`share:${shareId}`, savedFiles, { ex: 300 });

        res.writeHead(303, { Location: `/share-target?shareId=${shareId}` });
        res.end();
        resolve();
      });

      busboy.on('error', (err) => {
        console.error('Error en Busboy:', err);
        res.writeHead(303, { Location: '/share-target?error=server_error' }).end();
        resolve();
      });

      req.pipe(busboy);
    } catch (err) {
      console.error('Error procesando request:', err);
      res.writeHead(303, { Location: '/share-target?error=server_error' }).end();
      resolve();
    }
  });
}
