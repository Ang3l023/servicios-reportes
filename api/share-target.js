export default async function handler(req, res) {
  // 1. Responder con exito al POST de Android
  if (req.method === 'POST') {
    // Redirigir via GET (303) a la ruta Angular con un parametro
    res.writeHead(303, { Location: '/share-target?fromShare=true' });
    return res.end();
  }

  // Si llega por GET, simplemente redirigir al frontend
  res.writeHead(302, { Location: '/share-target' });
  res.end();
}
