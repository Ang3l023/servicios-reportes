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

    try {
      const busboy = Busboy({ headers: req.headers });

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];

        const filePromise = new Promise((resFile) => {
          file.on('data', (data) => chunks.push(data));
          file.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
              savedFiles.push({
                name: filename || 'shared_image.jpg',
                type: mimeType || 'image/jpeg',
                data: buffer.toString('base64'),
              });
            }
            resFile();
          });
        });

        filePromises.push(filePromise);
      });

      busboy.on('finish', async () => {
        await Promise.all(filePromises);

        if (savedFiles.length === 0) {
          console.warn('Sin archivos en el cuerpo de la petición');
          res.writeHead(303, { Location: '/share-target?error=no_files' }).end();
          return resolve();
        }

        const shareId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await kv.set(`share:${shareId}`, savedFiles, { ex: 300 });

        res.writeHead(303, { Location: `/share-target?shareId=${shareId}` });
        res.end();
        resolve();
      });

      req.pipe(busboy);
    } catch (err) {
      console.error('Error procesando Busboy:', err);
      res.writeHead(303, { Location: '/share-target?error=server_error' }).end();
      resolve();
    }
  });
}
