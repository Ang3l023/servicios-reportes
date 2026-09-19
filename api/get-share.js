import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Falta el ID de compartición' });
  }

  const files = await kv.get(`share:${id}`);

  if (!files) {
    return res.status(404).json({ error: 'Imágenes expiradas o no encontradas' });
  }

  // Eliminamos de la base de datos tras la lectura única
  await kv.del(`share:${id}`);

  res.status(200).json({ files });
}
