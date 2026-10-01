export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d),(\d)/g, '$1.$2').replace(/[^a-z0-9.]+/g, ' ').trim();
const fields = {
  kind: { milk: ['leche', 'lch', 'milk'], rice: ['arroz', 'rice'], flour: ['harina', 'har', 'flour'], coffee: ['cafe', 'coffee'], chicken: ['pollo', 'chicken'], broth: ['caldo', 'broth'] },
  brand: { loma: ['loma', 'lom'], sol: ['sol'], viento: ['viento', 'vto'], norte: ['norte'] },
};
const variants = {
  milk: { whole: ['entera', 'ent', 'whole'], skim: ['descremada', 'descr', 'skim', 'skimmed'], 'lactose-free': ['deslactosada', 'lactosefree'], chocolate: ['chocolate', 'choco'] },
  rice: { white: ['blanco', 'white'], brown: ['integral', 'brown'] },
  flour: { 'white-maize': ['blanca', 'blanco', 'white'], 'yellow-maize': ['amarilla', 'amarillo', 'yellow'] },
  coffee: { ground: ['molido', 'ground'], instant: ['instantaneo', 'instant'] },
  chicken: { whole: ['entero', 'ent', 'whole'], breast: ['pechuga', 'breast'], neck: ['pescuezo', 'neck'] },
  broth: { chicken: ['pollo', 'chicken'] },
};
const ignored = new Set('de del la el con y en un sin marca brand uht sterilized esterilizada leche lch milk arroz rice harina har flour cafe coffee pollo chicken caldo broth maiz corn maize fresca fresco fresh liquida carton envase bolsa bag kg g gr grs gram gramos kilogram ml cc l lt lts litro litros liter litre x pack caja units unidades'.split(' '));
const allAliases = new Set([...Object.values(fields).flatMap(f => Object.values(f).flat()), ...Object.values(variants).flatMap(f => Object.values(f).flat())]);

function find(tokens, choices) {
  return Object.entries(choices ?? {}).filter(([, aliases]) => aliases.some(a => tokens.includes(a))).map(([key]) => key);
}
export function describe(name) {
  const text = normalize(name).replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
  const tokens = text.split(/\s+/);
  let kinds = find(tokens, fields.kind);
  if (kinds.includes('broth')) kinds = ['broth'];
  const brands = find(tokens, fields.brand);
  const kind = kinds.length === 1 ? kinds[0] : null;
  const vs = find(tokens, variants[kind]);
  const sizeMatches = [...text.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)\s*(kg|grs?|gramos|g|ml|cc|lts?|litros?|litre|liter|l)(?=\s|$)/g)];
  const size = sizeMatches.length === 1 ? sizeMatches[0] : null;
  const unit = size ? (['ml', 'cc', 'l', 'lt', 'lts', 'litro', 'litros', 'litre', 'liter'].includes(size[2]) ? 'ml' : 'g') : null;
  const scale = size && ['kg', 'l', 'lt', 'lts', 'litro', 'litros', 'litre', 'liter'].includes(size[2]) ? 1000 : 1;
  const packBefore = text.match(/(?:^|\s)(\d+)\s*x\s*\d/);
  const packAfter = text.match(/(?:pack|caja)\s*(?:x\s*)?(\d+)/);
  const pack = Number(packBefore?.[1] ?? packAfter?.[1] ?? 1);
  const unknown = tokens.filter(t => !ignored.has(t) && !allAliases.has(t) && !/^\d+(\.\d+)?$/.test(t));
  return { kind, brand: brands.length === 1 ? brands[0] : null, variant: vs.length === 1 ? vs[0] : null, size: size ? Math.round(Number(size[1]) * scale * 1000) / 1000 : null, unit, pack, unknown };
}
export function compareNames(request, candidate) {
  const a = describe(request), b = describe(candidate);
  const conflicts = ['kind', 'brand', 'variant', 'size', 'unit', 'pack'].filter(k => a[k] != null && b[k] != null && a[k] !== b[k]);
  if (conflicts.length) return { decision: 'no', reason: 'Different ' + conflicts.join(', '), request: a, candidate: b };
  const mandatory = a.kind === 'chicken' || a.kind === 'broth' ? ['kind', 'variant', 'size', 'unit'] : ['kind', 'brand', 'variant', 'size', 'unit'];
  const missing = mandatory.filter(k => a[k] == null || b[k] == null);
  if (missing.length || a.unknown.length || b.unknown.length || a.size <= 0 || b.size <= 0 || a.pack < 1 || b.pack < 1) {
    return { decision: 'uncertain', reason: 'Needs review: incomplete or unsupported attributes', request: a, candidate: b };
  }
  return { decision: 'yes', reason: 'Same kind, brand where applicable, variant, size and pack', request: a, candidate: b };
}
// Deliberately simple reference baseline, not Bakiano's former production engine.
export function keywordBaseline(request, candidate) {
  const a = normalize(request).split(' ').filter(t => t.length > 2);
  const b = new Set(normalize(candidate).split(' '));
  return a.some(t => b.has(t));
}
export function matchCatalog(rows, catalog) {
  return rows.map(row => ({
    ...row,
    candidates: catalog.map(candidate => ({
      ...candidate, baseline: keywordBaseline(row.product, candidate.product),
      ...compareNames(row.product, candidate.product),
    })),
  }));
}
