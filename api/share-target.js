export default async function handler(req, res) {
  res.writeHead(303, { Location: '/share-target?fromShare=true' });
  res.end();
}
