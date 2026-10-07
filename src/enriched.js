// The enrichment stage supplies attributes. This module consumes them;
// it never guesses product meaning from a raw title or calls a model.
export const fields = ['product_type', 'subtype', 'base_ingredient', 'variant', 'state', 'brand', 'unit', 'weight_grams', 'pack_count', 'type_confidence', 'brand_confidence', 'size_confidence'];
const fold = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const rawSearch = (products, term) => products.filter(product => fold(product.raw.product_name).includes(fold(term)));
export const enrichedSearch = (products, filter) => products.filter(product => Object.entries(filter).every(([key, value]) => value != null && product.enriched[key] === value));

export function compareEnriched(left, right) {
  const required = new Set(['product_type', 'subtype', 'brand', 'unit', 'pack_count', 'type_confidence', 'brand_confidence', 'size_confidence']);
  const checks = fields.map(key => {
    const a = left[key], b = right[key];
    let status;
    if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) status = 'missing';
    else if (key.endsWith('_confidence')) status = a === 'high' && b === 'high' ? 'same' : 'missing';
    else if (key === 'pack_count' && (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || b < 1)) status = 'missing';
    else if (key === 'weight_grams' && (a != null || b != null) && (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0)) status = 'missing';
    else if (a != null && b != null && a !== b) status = 'conflict';
    else if (key === 'weight_grams' && (left.unit !== 'unit' || right.unit !== 'unit') && (a == null || b == null)) status = 'missing';
    else if (required.has(key) && (a == null || b == null)) status = 'missing';
    else if (a !== b) status = 'missing';
    else status = 'same';
    return { key, left: a ?? null, right: b ?? null, status };
  });
  const conflicts = checks.filter(check => check.status === 'conflict').map(check => check.key);
  const missing = checks.filter(check => check.status === 'missing').map(check => check.key);
  return { decision: conflicts.length ? 'different' : missing.length ? 'review' : 'same', conflicts, missing, checks };
}
