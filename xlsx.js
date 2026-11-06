/* Minimal dependency-free XLSX writer (works offline, inside the Android WebView).
   XL.build([{name, headers:[...], rows:[[...]], widths?:[...]}]) -> Uint8Array (.xlsx)
   Cell values: number -> numeric cell, anything else -> text. */
const XL = (() => {
  const enc = new TextEncoder();

  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const u16 = n => [n & 255, (n >> 8) & 255];
  const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  /* ZIP (method 0 = stored) */
  function zip(files) {
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data), size = data.length;
      const local = new Uint8Array([
        0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)
      ]);
      parts.push(local, name, data);
      central.push(new Uint8Array([
        0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset)
      ]), name);
      offset += local.length + name.length + size;
    }
    let cdSize = 0;
    central.forEach(c => (cdSize += c.length));
    const end = new Uint8Array([
      0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(cdSize), ...u32(offset), ...u16(0)
    ]);
    const all = [...parts, ...central, end];
    const total = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of all) { out.set(p, pos); pos += p.length; }
    return out;
  }

  const clean = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  const esc = s => clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function colName(i) {
    let s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
  }

  function sheetXml(sh) {
    const nCols = sh.headers.length;
    const widths = sh.headers.map((h, i) => {
      let w = String(h).length;
      for (const r of sh.rows) {
        const v = r[i];
        if (v !== undefined && v !== null) w = Math.max(w, String(v).length);
      }
      return Math.min(Math.max(w + 2, 10), 45);
    });
    let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/><cols>';
    widths.forEach((w, i) => { x += `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`; });
    x += '</cols><sheetData>';
    x += '<row r="1" ht="30" customHeight="1">';
    sh.headers.forEach((h, i) => { x += `<c r="${colName(i)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${esc(h)}</t></is></c>`; });
    x += '</row>';
    sh.rows.forEach((row, ri) => {
      const rn = ri + 2;
      x += `<row r="${rn}">`;
      for (let i = 0; i < nCols; i++) {
        const v = row[i];
        if (v === undefined || v === null || v === '') continue;
        const ref = colName(i) + rn;
        if (typeof v === 'number' && isFinite(v)) x += `<c r="${ref}"><v>${v}</v></c>`;
        else x += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      }
      x += '</row>';
    });
    x += '</sheetData>';
    x += `<autoFilter ref="A1:${colName(Math.max(nCols - 1, 0))}${Math.max(sh.rows.length + 1, 1)}"/>`;
    x += '</worksheet>';
    return x;
  }

  function safeName(n, used) {
    let s = clean(n).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let base = s, i = 2;
    while (used.has(s.toLowerCase())) { s = base.slice(0, 28) + ' ' + i++; }
    used.add(s.toLowerCase());
    return s;
  }

  function build(sheets) {
    if (!sheets.length) sheets = [{ name: 'Sheet1', headers: ['(empty)'], rows: [] }];
    const used = new Set();
    const names = sheets.map(s => safeName(s.name, used));
    const NS = 'http://schemas.openxmlformats.org/';
    const files = [];
    const add = (name, text) => files.push({ name, data: enc.encode(text) });

    add('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Types xmlns="${NS}package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>');

    add('_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Relationships xmlns="${NS}package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      '</Relationships>');

    add('xl/workbook.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>` +
      names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets></workbook>');

    add('xl/_rels/workbook.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Relationships xmlns="${NS}package/2006/relationships">` +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>');

    add('xl/styles.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<styleSheet xmlns="${NS}spreadsheetml/2006/main">` +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">' +
      '<alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');

    sheets.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
    return zip(files);
  }

  return { build };
})();

if (typeof module !== 'undefined') module.exports = XL;
