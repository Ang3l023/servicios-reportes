export default async function handler(req, res) {
  // Redirigir siempre mediante GET (303) a la pantalla de Angular
  res.writeHead(303, { Location: '/share-target?fromShare=true' });
  res.end();
}
