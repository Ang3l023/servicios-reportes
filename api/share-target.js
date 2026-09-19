import formidable from 'formidable';
import fs from 'fs';
import { kv } from '@vercel/kv';

// IMPORTANTE: Desactivar el body parser nativo de Vercel para procesar multipart
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
      console.error('Error procesando multipart:', err);
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }

    // Android envía la clave 'media' declarada en tu manifest
    const rawMedia = files.media;

    if (!rawMedia) {
      console.warn('No se encontró el campo "media" en la petición');
      return res.writeHead(303, { Location: '/share-target?error=no_media' }).end();
    }

    const fileList = Array.isArray(rawMedia) ? rawMedia : [rawMedia];
    const shareId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const savedFiles = [];

    for (const file of fileList) {
      // Compatibilidad v2 y v3 de Formidable (filepath o path)
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

    // Guardar en Redis/Upstash con expiración de 5 minutos (300 s)
    await kv.set(`share:${shareId}`, savedFiles, { ex: 300 });

    // Redirigir a Angular enviando el ID por querystring
    res.writeHead(303, { Location: `/share-target?shareId=${shareId}` });
    res.end();
  });
}
