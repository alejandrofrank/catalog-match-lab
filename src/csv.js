export function parseCsv(text) {
  if (new TextEncoder().encode(text).length > 32768) throw new Error('CSV limit: 32 KB');
  const records = []; let row = [], cell = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === ',' || c === '\n') {
      row.push(cell.trim()); cell = ''; closed = false;
      if (c === '\n') { if (row.some(Boolean)) records.push(row); row = []; }
    } else if (closed || c === '"') throw new Error('Malformed CSV quoting');
    else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  row.push(cell.trim()); if (row.some(Boolean)) records.push(row);
  const header = records.shift();
  if (!header || header.join(',') !== 'sku,product') throw new Error('Use exactly these columns: sku,product');
  if (!records.length || records.length > 30) throw new Error('Add between 1 and 30 products');
  const seen = new Set();
  return records.map(r => {
    if (r.length !== 2 || !r[0] || !r[1] || r[0].length > 48 || r[1].length > 240 || seen.has(r[0])) throw new Error('Each row needs a unique SKU and a product name (up to 240 characters)');
    seen.add(r[0]);
    return { sku: r[0], product: r[1] };
  });
}
