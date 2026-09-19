import formidable from 'formidable';
import fs from 'fs';
import { kv } from '@vercel/kv'; // Si usas Vercel KV Store para persistencia

export const config = {
  api: {
    bodyParser: false, // Desactivar el body parser por defecto para procesar multipart/form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }

    const fileList = Array.isArray(files.media) ? files.media : [files.media];
    const shareId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

    const savedFiles = [];

    for (const file of fileList) {
      if (file && file.filepath) {
        const fileBuffer = fs.readFileSync(file.filepath);
        const base64Data = fileBuffer.toString('base64');

        savedFiles.push({
          name: file.originalFilename || 'shared_image.jpg',
          type: file.mimetype,
          data: base64Data
        });
      }
    }

    // Almacenamos temporalmente las imágenes en KV Store con expiración de 5 minutos
    // (Asegúrate de vincular una Vercel KV Storage en el panel de Vercel)
    await kv.set(`share:${shareId}`, savedFiles, { ex: 300 });

    // Redireccionamos a la ruta Angular GET con el ID
    res.writeHead(303, { Location: `/share-target?shareId=${shareId}` });
    res.end();
  });
}
