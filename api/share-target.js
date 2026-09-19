import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('--- Nueva petición POST recibida ---');
  console.log('Headers:', JSON.stringify(req.headers));

  if (req.method !== 'POST') {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  return new Promise((resolve) => {
    const savedFiles = [];
    const filePromises = [];

    try {
      // Normalizar el header Content-Type para evitar fallos de parser en Motorola/Honor
      const contentType = req.headers['content-type'] || req.headers['Content-Type'] || '';

      if (!contentType.includes('multipart/form-data')) {
        console.warn('ContentType no es multipart:', contentType);
        res.writeHead(302, { Location: '/?error=invalid_content_type' });
        res.end();
        return resolve();
      }

      const busboy = Busboy({
        headers: {
          ...req.headers,
          'content-type': contentType // Header limpio
        }
      });

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];

        console.log(`Leyendo archivo de campo "${fieldname}":`, filename, mimeType);

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

      busboy.on('finish', async () => {
        await Promise.all(filePromises);

        console.log(`Total imágenes procesadas en Busboy: ${savedFiles.length}`);

        if (savedFiles.length === 0) {
          console.warn('Busboy finalizó pero no encontró binarios de imagen');
          res.writeHead(302, { Location: '/?error=no_images_found' });
          res.end();
          return resolve();
        }

        // Retornar HTML que inyecta las imágenes en sessionStorage
        const html = `
          <!DOCTYPE html>
          <html>
            <head><title>Cargando imágenes...</title></head>
            <body>
              <script>
                try {
                  sessionStorage.setItem('pwa_shared_files', JSON.stringify(${JSON.stringify(savedFiles)}));
                } catch(e) {
                  console.error('Error guardando en sessionStorage:', e);
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
        console.error('Error durante la lectura con Busboy:', err);
        res.writeHead(302, { Location: '/?error=busboy_error' });
        res.end();
        resolve();
      });

      req.pipe(busboy);

    } catch (err) {
      console.error('Excepción crítica en Handler:', err);
      res.writeHead(302, { Location: '/?error=critical_exception' });
      res.end();
      resolve();
    }
  });
}
