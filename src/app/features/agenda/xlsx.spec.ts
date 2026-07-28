import { construirXlsx } from './xlsx';

/**
 * El .xlsx se escribe a mano (ZIP + XML), así que lo que hay que vigilar es que
 * el paquete siga siendo un ZIP legible y que el XML no se rompa con acentos ni
 * con caracteres que haya que escapar. La validación a fondo —que Excel lo abra
 * y lea las fechas como fechas— se hizo con openpyxl contra este mismo módulo.
 */
describe('construirXlsx', () => {
  const libro = {
    hoja: 'Sesiones',
    titulo: 'Clínica Montalvo · Reporte',
    subtitulo: ['Periodo: 01/07/2026 al 31/07/2026'],
    columnas: [
      { titulo: 'Fecha', ancho: 11, tipo: 'fecha' as const },
      { titulo: 'Paciente', ancho: 30 },
      { titulo: 'Minutos', ancho: 9, tipo: 'numero' as const },
    ],
    filas: [
      [new Date(2026, 6, 15, 9, 0), 'Ana Pérez & Cía <x>', 60],
      [new Date(2026, 6, 16, 10, 30), 'Luis Gómez', 45],
    ],
    totales: [null, '2 sesiones', 105],
  };

  async function bytes(): Promise<Uint8Array> {
    return new Uint8Array(await construirXlsx(libro).arrayBuffer());
  }

  it('produce un ZIP con la firma y el fin de directorio central', async () => {
    const b = await bytes();

    // "PK\x03\x04" al principio y "PK\x05\x06" en el registro final.
    expect([b[0], b[1], b[2], b[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const cola = b.subarray(b.length - 22);
    expect([cola[0], cola[1], cola[2], cola[3]]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('incluye las seis partes que exige el formato', async () => {
    const texto = new TextDecoder().decode(await bytes());
    for (const parte of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(texto).toContain(parte);
    }
  });

  it('escapa el XML y respeta acentos, anchos y congelado', async () => {
    const texto = new TextDecoder().decode(await bytes());

    expect(texto).toContain('Ana Pérez &amp; Cía &lt;x&gt;');
    expect(texto).not.toContain('Cía <x>');
    expect(texto).toContain('width="30"');
    expect(texto).toContain('state="frozen"');
    expect(texto).toContain('<autoFilter');
  });

  it('escribe las fechas como número de serie, no como texto', async () => {
    const texto = new TextDecoder().decode(await bytes());

    // 15/07/2026 09:00 -> 46218.375 en el calendario de Excel.
    expect(texto).toContain('<v>46218.375</v>');
    // Y el número sigue siendo número, sin t="inlineStr".
    expect(texto).toContain('<v>60</v>');
  });

  it('no rompe con una tabla vacía', async () => {
    const vacio = construirXlsx({ ...libro, filas: [], totales: undefined });
    expect(vacio.size).toBeGreaterThan(0);
  });
});
