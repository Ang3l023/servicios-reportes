import formidable from 'formidable';
import fs from 'fs';
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

  const form = formidable({
    multiples: true,
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error al parsear form:', err);
      return res.status(500).json({ error: 'Error interno al procesar imagen' });
    }

    // EXTRAER CUALQUIER ARCHIVO: Si no lo encuentra en 'media', toma el primer campo disponible
    let rawMedia = files.media;

    if (!rawMedia) {
      const keys = Object.keys(files);
      if (keys.length > 0) {
        rawMedia = files[keys[0]]; // Toma el primer campo de archivos que haya llegado
      }
    }

    if (!rawMedia) {
      console.warn('Petición recibida sin ningún archivo adjunto');
      return res.writeHead(303, { Location: '/share-target?error=no_files' }).end();
    }

    const fileList = Array.isArray(rawMedia) ? rawMedia : [rawMedia];
    const shareId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const savedFiles = [];

    for (const file of fileList) {
      const path = file.filepath || file.path;
      const originalName = file.originalFilename || file.name || 'shared_image.jpg';
      const mimeType = file.mimetype || file.type || 'image/jpeg';

      if (path && fs.existsSync(path)) {
        const fileBuffer = fs.readFileSync(path);

        savedFiles.push({
          name: originalName,
          type: mimeType,
          data: fileBuffer.toString('base64')
        });
      }
    }

    if (savedFiles.length === 0) {
      return res.writeHead(303, { Location: '/share-target?error=empty_files' }).end();
    }

    // Guardar en Upstash/Redis por 5 minutos
    await kv.set(`share:${shareId}`, savedFiles, { ex: 300 });

    // Redirigir a Angular
    res.writeHead(303, { Location: `/share-target?shareId=${shareId}` });
    res.end();
  });
}
