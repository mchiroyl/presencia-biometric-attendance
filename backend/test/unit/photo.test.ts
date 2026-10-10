import { expect, it } from 'vitest';
import sharp from 'sharp';
import { normalizePhoto } from '../../src/admin/employee-photo';
it('rechaza foto ausente, SVG y contenido falso', async () => {
  await expect(normalizePhoto()).rejects.toThrow();
  await expect(normalizePhoto('data:image/svg+xml;base64,PHN2Zz4=')).rejects.toThrow();
  await expect(normalizePhoto('data:image/png;base64,YWJjZGVm')).rejects.toThrow();
});
it('decodifica, reduce imagen y elimina metadatos', async () => {
  const input = await sharp({ create: { width: 900, height: 1100, channels: 3, background: '#bbbbbb' } }).withMetadata().png().toBuffer();
  const output = await normalizePhoto('data:image/png;base64,' + input.toString('base64'));
  const metadata = await sharp(Buffer.from(output.split(',')[1], 'base64')).metadata();
  expect(metadata.format).toBe('jpeg'); expect(metadata.width).toBeLessThanOrEqual(800);
  expect(metadata.height).toBeLessThanOrEqual(1000); expect(metadata.exif).toBeUndefined();
});
