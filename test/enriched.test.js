import test from 'node:test';
import assert from 'node:assert/strict';
import { experiments, provenance } from '../data/enrichment-examples.js';
import { compareEnriched, rawSearch, enrichedSearch } from '../src/enriched.js';
const example = id => experiments.find(item => item.id === id);

test('enriched identity excludes ingredient and flavor mentions from family retrieval', () => {
  for (const [id, before] of [['egg-protein',2],['chicken-flavor',3],['milk-powder',2]]) {
    const data = example(id);
    assert.equal(rawSearch(data.products,data.term).length,before);
    assert.deepEqual(enrichedSearch(data.products,data.filter),[data.products[0]]);
  }
});
test('normalized subtypes recover differently named instances of the same presentation', () => {
  for (const id of ['milk-synonyms','arequipe']) {
    const data=example(id);
    assert.equal(rawSearch(data.products,data.term).length,1);
    assert.equal(enrichedSearch(data.products,data.filter).length,2);
    assert.equal(compareEnriched(data.products[0].enriched,data.products[1].enriched).decision,'same');
  }
});
test('a shared family does not hide a fresh-versus-canned state difference', () => {
  const data=example('tomato-state'), result=compareEnriched(...data.products.map(product=>product.enriched));
  assert.equal(data.products[0].enriched.subtype,data.products[1].enriched.subtype);
  assert.equal(result.decision,'different');
  assert.ok(result.conflicts.includes('state'));
  assert.equal(enrichedSearch(data.products,data.filter).length,1);
});
test('missing size preserves search candidates but blocks an exact comparison', () => {
  const data=example('missing-size');
  assert.equal(enrichedSearch(data.products,data.filter).length,2);
  const result=compareEnriched(...data.products.map(product=>product.enriched));
  assert.equal(result.decision,'review');
  assert.ok(result.missing.includes('weight_grams'));
  assert.ok(result.missing.includes('size_confidence'));
});
test('changing only raw titles cannot change a decision that consumes saved attributes', () => {
  const data=structuredClone(example('milk-synonyms'));
  data.products[0].raw.product_name='An entirely different title';
  assert.equal(compareEnriched(data.products[0].enriched,data.products[1].enriched).decision,'same');
});
test('equal total quantity does not establish the same pack', () => {
  const data=example('milk-synonyms').products[0].enriched;
  assert.equal(compareEnriched(data,{...data,pack_count:2}).decision,'different');
});
test('weak brand confidence and absent optional fields cannot manufacture exact identity', () => {
  const data=example('milk-synonyms').products[0].enriched;
  assert.equal(compareEnriched(data,{...data,brand_confidence:'low'}).decision,'review');
  const missing={...data}; delete missing.state;
  assert.equal(compareEnriched(data,missing).decision,'review');
});
test('invalid sizes and unknown brands stay in review even when both inputs agree', () => {
  const data=example('milk-synonyms').products[0].enriched;
  for (const weight_grams of [0,-1,NaN,Infinity]) {
    const invalid={...data,weight_grams};
    assert.equal(compareEnriched(invalid,invalid).decision,'review');
  }
  const unknown={...data,brand:null,brand_confidence:null};
  assert.equal(compareEnriched(unknown,unknown).decision,'review');
});
test('unit-sold items do not require a fabricated gram quantity', () => {
  const data={...example('milk-synonyms').products[0].enriched,unit:'unit',weight_grams:null,pack_count:12};
  assert.equal(compareEnriched(data,data).decision,'same');
});
test('the illustrative recording never claims to be a model or warehouse response', () => {
  assert.equal(provenance.kind,'illustrative');
  assert.match(provenance.description,/Hand-authored/);
});
