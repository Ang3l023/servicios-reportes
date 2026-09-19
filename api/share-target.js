import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false, // Desactiva el parseo nativo para leer el stream directo
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  return new Promise((resolve) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      const savedFiles = [];
      const filePromises = [];

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];

        const p = new Promise((resFile) => {
          file.on('data', (d) => chunks.push(d));
          file.on('end', () => {
            const buf = Buffer.concat(chunks);
            if (buf.length > 0) {
              savedFiles.push({
                name: filename || 'shared_image.jpg',
                type: mimeType || 'image/jpeg',
                data: `data:${mimeType || 'image/jpeg'};base64,${buf.toString('base64')}`
              });
            }
            resFile();
          });
        });
        filePromises.push(p);
      });

      busboy.on('finish', async () => {
        await Promise.all(filePromises);

        // Si no se capturaron imágenes, redirigir al inicio
        if (savedFiles.length === 0) {
          res.writeHead(302, { Location: '/?error=no_images' });
          return res.end();
        }

        // Responder con un HTML ligero que guarda las imágenes en sessionStorage y redirige a Angular
        const html = `
          <!DOCTYPE html>
          <html>
            <head><title>Procesando compartición...</title></head>
            <body>
              <script>
                try {
                  sessionStorage.setItem('pwa_shared_files', JSON.stringify(${JSON.stringify(savedFiles)}));
                } catch(e) {
                  console.error(e);
                }
                window.location.href = '/share-target?fromShare=true';
              </script>
            </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
        resolve();
      });

      req.pipe(busboy);
    } catch (err) {
      console.error(err);
      res.writeHead(302, { Location: '/?error=server_error' });
      res.end();
      resolve();
    }
  });
}
