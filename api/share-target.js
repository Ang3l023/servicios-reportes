import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  return new Promise((resolve) => {
    const savedFiles = [];
    const filePromises = [];
    const textFields = {};

    try {
      const contentType = req.headers['content-type'] || req.headers['Content-Type'] || '';

      const busboy = Busboy({
        headers: {
          ...req.headers,
          'content-type': contentType
        }
      });

      // 1. Archivos directos
      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];

        const p = new Promise((resFile) => {
          file.on('data', (d) => chunks.push(d));
          file.on('end', () => {
            const buf = Buffer.concat(chunks);
            if (buf.length > 0) {
              savedFiles.push({
                name: filename || `shared_image_${savedFiles.length + 1}.jpg`,
                type: mimeType || 'image/jpeg',
                data: `data:${mimeType || 'image/jpeg'};base64,${buf.toString('base64')}`
              });
            }
            resFile();
          });
        });
        filePromises.push(p);
      });

      // 2. Campos de texto (Captura de URIs o Base64 enviado como texto)
      busboy.on('field', (fieldname, val) => {
        textFields[fieldname] = val;
      });

      busboy.on('finish', async () => {
        await Promise.all(filePromises);

        console.log(`Archivos: ${savedFiles.length}, Campos de texto:`, Object.keys(textFields));

        if (savedFiles.length === 0) {
          console.warn('Cuerpo de la petición vacío o sin binarios válidos');
          res.writeHead(302, { Location: '/?error=empty_body' });
          res.end();
          return resolve();
        }

        const html = `
          <!DOCTYPE html>
          <html>
            <head><title>Cargando imágenes...</title></head>
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

      busboy.on('error', (err) => {
        console.error('Error en Busboy:', err);
        res.writeHead(302, { Location: '/?error=busboy_error' });
        res.end();
        resolve();
      });

      req.pipe(busboy);

    } catch (err) {
      console.error('Excepción crítica:', err);
      res.writeHead(302, { Location: '/?error=critical_exception' });
      res.end();
      resolve();
    }
  });
}
