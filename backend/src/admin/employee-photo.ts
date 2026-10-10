import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
export async function normalizePhoto(value?: string) {
  if (typeof value !== 'string') throw new BadRequestException('La foto de medio cuerpo es obligatoria.');
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > 2796204) throw new BadRequestException('Suba una foto JPG o PNG de hasta 2 MB.');
  const data = Buffer.from(match[2], 'base64');
  if (data.length > 2 * 1024 * 1024 || data.toString('base64') !== match[2]) throw new BadRequestException('Foto inválida o demasiado grande.');
  try {
    const image = sharp(data, { limitInputPixels: 20000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png'].includes(metadata.format || '') || (metadata.pages || 1) !== 1) throw new Error();
    // Decodifica y recodifica: elimina EXIF/GPS y contenido añadido al archivo.
    const output = await image.rotate().resize({ width: 800, height: 1000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${output.toString('base64')}`;
  } catch { throw new BadRequestException('No se pudo leer la foto. Seleccione un JPG o PNG válido.'); }
  finally { data.fill(0); }
}
