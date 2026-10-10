import { describe, expect, it } from 'vitest';
import { templateFormat } from '../../src/biometrics/template-format';
describe('Motores de plantilla separados', () => {
  it('etiqueta libfprint sin confundirlo con FMD ANSI', () => expect(templateFormat('LIBFPRINT-v1:' + Buffer.alloc(100, 1).toString('base64'), 'hardware')).toBe('LIBFPRINT-v1'));
  it('rechaza base64 truncado, vacío o excesivo', () => { for (const data of ['', '!!!!', 'YWJj', Buffer.alloc(40001).toString('base64')]) expect(templateFormat('LIBFPRINT-v1:' + data, 'hardware')).toBeNull(); });
  it('no admite una plantilla libre como simulación', () => expect(templateFormat('LIBFPRINT-v1:' + Buffer.alloc(100).toString('base64'), 'simulation')).toBeNull());
  it('conserva ANSI sin aceptar entidades XML', () => { expect(templateFormat('<Fmd>data</Fmd>', 'hardware')).toBe('ANSI-FMD-XML'); expect(templateFormat('<!ENTITY x>','hardware')).toBeNull(); });
});
