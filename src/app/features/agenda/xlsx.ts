/**
 * Escritor mínimo de .xlsx, sin dependencias.
 *
 * Un .xlsx no es más que un ZIP con unos cuantos XML dentro. Generamos las
 * entradas sin comprimir (método "stored", que el formato admite), así no hace
 * falta ni una librería de compresión ni traerse exceljs entero para volcar una
 * tabla.
 *
 * Frente al CSV que había antes, esto da: anchos de columna, cabecera fija,
 * autofiltro, y —lo que de verdad importa— fechas y números como fechas y
 * números, no como texto: en Excel se ordenan, se filtran y se suman.
 */

export type TipoCelda = 'texto' | 'numero' | 'fecha' | 'hora';

export interface ColumnaXlsx {
  titulo: string;
  /** Ancho en caracteres, como lo mide Excel. */
  ancho: number;
  tipo?: TipoCelda;
}

export type ValorCelda = string | number | Date | null;

// ---------------------------------------------------------------- utilidades

const escaparXml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

/** Índice 0 -> "A", 26 -> "AA". */
function columnaAletra(i: number): string {
  let n = i + 1;
  let letra = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

/** Excel cuenta los días desde el 30/12/1899 (con su famoso bug del año 1900). */
function aSerialExcel(d: Date): number {
  const utc = Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  );
  return utc / 86400000 + 25569;
}

// ------------------------------------------------------------------- el ZIP

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface EntradaZip {
  nombre: string;
  datos: Uint8Array;
}

/** ZIP con entradas sin comprimir. Suficiente y válido para un .xlsx. */
function empaquetarZip(entradas: EntradaZip[]): Blob {
  const codificador = new TextEncoder();
  const trozos: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

  for (const entrada of entradas) {
    const nombre = codificador.encode(entrada.nombre);
    const crc = crc32(entrada.datos);
    const tam = entrada.datos.length;

    const cabecera = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20), // versión mínima
      ...u16(0),
      ...u16(0), // método 0 = almacenado
      ...u16(0),
      ...u16(0), // fecha/hora DOS: irrelevante para Excel
      ...u32(crc),
      ...u32(tam),
      ...u32(tam),
      ...u16(nombre.length),
      ...u16(0),
      ...nombre,
    ]);

    trozos.push(cabecera, entrada.datos);

    central.push(
      new Uint8Array([
        ...u32(0x02014b50),
        ...u16(20),
        ...u16(20),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(crc),
        ...u32(tam),
        ...u32(tam),
        ...u16(nombre.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(desplazamiento),
        ...nombre,
      ]),
    );

    desplazamiento += cabecera.length + tam;
  }

  const tamCentral = central.reduce((n, c) => n + c.length, 0);
  const fin = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entradas.length),
    ...u16(entradas.length),
    ...u32(tamCentral),
    ...u32(desplazamiento),
    ...u16(0),
  ]);

  // Se vuelca todo a un único búfer nuestro: además de ahorrar copias, evita
  // que Blob se pelee con el `ArrayBufferLike` que devuelve TextEncoder.
  const partes = [...trozos, ...central, fin];
  const total = partes.reduce((n, p) => n + p.length, 0);
  const salida = new Uint8Array(total);
  let cursor = 0;
  for (const parte of partes) {
    salida.set(parte, cursor);
    cursor += parte.length;
  }

  return new Blob([salida], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ------------------------------------------------------------------ el libro

/*
 * Estilos (índices de cellXfs, en el orden en que se declaran abajo):
 *   0 normal   1 título   2 subtítulo   3 cabecera de tabla
 *   4 texto    5 número   6 fecha       7 hora        8 pie/total
 */
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="200" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="201" formatCode="hh:mm"/>
</numFmts>
<fonts count="5">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="15"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
<font><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF006156"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FF006156"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="200" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="201" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>
</cellXfs>
</styleSheet>`;

const ESTILO_POR_TIPO: Record<TipoCelda, number> = {
  texto: 4,
  numero: 5,
  fecha: 6,
  hora: 7,
};

export interface LibroXlsx {
  hoja: string;
  /** Va en A1, en grande. */
  titulo: string;
  /** Líneas de contexto bajo el título (rango, filtros, quién y cuándo). */
  subtitulo: string[];
  columnas: ColumnaXlsx[];
  filas: ValorCelda[][];
  /** Línea de totales al final de la tabla. */
  totales?: ValorCelda[];
}

function celda(ref: string, valor: ValorCelda, estilo: number, tipo: TipoCelda): string {
  if (valor === null || valor === '') return `<c r="${ref}" s="${estilo}"/>`;

  if (tipo === 'fecha' || tipo === 'hora') {
    const serial = valor instanceof Date ? aSerialExcel(valor) : Number(valor);
    return `<c r="${ref}" s="${estilo}"><v>${serial}</v></c>`;
  }
  if (tipo === 'numero' && typeof valor === 'number') {
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(
    String(valor),
  )}</t></is></c>`;
}

/** Devuelve el .xlsx listo para descargar. */
export function construirXlsx(libro: LibroXlsx): Blob {
  const { columnas, filas } = libro;
  const filasXml: string[] = [];

  // Bloque de membrete.
  filasXml.push(
    `<row r="1" ht="20" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>${escaparXml(
      libro.titulo,
    )}</t></is></c></row>`,
  );
  libro.subtitulo.forEach((linea, i) => {
    filasXml.push(
      `<row r="${i + 2}"><c r="A${i + 2}" s="2" t="inlineStr"><is><t>${escaparXml(
        linea,
      )}</t></is></c></row>`,
    );
  });

  const filaCabecera = libro.subtitulo.length + 3; // una fila en blanco de aire
  filasXml.push(
    `<row r="${filaCabecera}" ht="22" customHeight="1">` +
      columnas
        .map(
          (c, i) =>
            `<c r="${columnaAletra(i)}${filaCabecera}" s="3" t="inlineStr"><is><t>${escaparXml(
              c.titulo,
            )}</t></is></c>`,
        )
        .join('') +
      `</row>`,
  );

  filas.forEach((fila, f) => {
    const r = filaCabecera + 1 + f;
    filasXml.push(
      `<row r="${r}">` +
        fila
          .map((valor, i) => {
            const tipo = columnas[i]?.tipo ?? 'texto';
            return celda(`${columnaAletra(i)}${r}`, valor, ESTILO_POR_TIPO[tipo], tipo);
          })
          .join('') +
        `</row>`,
    );
  });

  if (libro.totales) {
    const r = filaCabecera + 1 + filas.length;
    filasXml.push(
      `<row r="${r}">` +
        libro.totales
          .map((valor, i) =>
            celda(
              `${columnaAletra(i)}${r}`,
              valor,
              8,
              typeof valor === 'number' ? 'numero' : 'texto',
            ),
          )
          .join('') +
        `</row>`,
    );
  }

  const ultimaCol = columnaAletra(columnas.length - 1);
  const ultimaFila = filaCabecera + filas.length;

  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView showGridLines="0" workbookViewId="0">
<pane ySplit="${filaCabecera}" topLeftCell="A${filaCabecera + 1}" activePane="bottomLeft" state="frozen"/>
</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columnas
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho}" customWidth="1"/>`)
    .join('')}</cols>
<sheetData>${filasXml.join('')}</sheetData>
<autoFilter ref="A${filaCabecera}:${ultimaCol}${ultimaFila}"/>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" paperSize="9"/>
</worksheet>`;

  const codificador = new TextEncoder();
  const e = (nombre: string, xml: string): EntradaZip => ({
    nombre,
    datos: codificador.encode(xml),
  });

  return empaquetarZip([
    e(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    ),
    e(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    ),
    e(
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escaparXml(libro.hoja).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    ),
    e(
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    ),
    e('xl/styles.xml', ESTILOS),
    e('xl/worksheets/sheet1.xml', hoja),
  ]);
}
