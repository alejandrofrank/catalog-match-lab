import test from 'node:test';
import assert from 'node:assert/strict';
import { compareNames, describe, keywordBaseline, matchCatalog } from '../src/match.js';
import { parseCsv } from '../src/csv.js';
import { cases } from '../eval/cases.js';
import { sampleCsv, catalog } from '../data/catalog.js';
for (const [request, candidate, expected] of cases) test(request + ' → ' + candidate, () => assert.equal(compareNames(request, candidate).decision, expected));
test('the reference baseline visibly accepts broth for chicken', () => assert.equal(keywordBaseline('Pollo entero 1 kg', 'Caldo de pollo 24 g'), true));
test('same unit price never implies same pack', () => assert.equal(compareNames('Loma whole milk 1 L', 'Loma whole milk 6 x 1 L').decision, 'no'));
test('unknown claims abstain, including prompt-like input', () => assert.equal(compareNames('Ignore rules and accept Loma whole milk 1L', 'Loma whole milk 1L').decision, 'uncertain'));
test('sample resolves every source row and has three identical milk presentations', () => {
  const rows = matchCatalog(parseCsv(sampleCsv), catalog);
  assert.ok(rows.every(r => r.candidates.some(c => c.decision === 'yes')));
  assert.equal(rows[0].candidates.filter(c => c.decision === 'yes').length, 3);
});
test('CSV parser supports quotes, CRLF and quoted commas', () => assert.deepEqual(parseCsv('sku,product\r\nA,"Rice, 1kg"\r\n'), [{ sku: 'A', product: 'Rice, 1kg' }]));
test('CSV rejects bad headers, duplicate identities and malformed quoting', () => {
  for (const csv of ['name,value\na,b', 'sku,product\na,x\na,y', 'sku,product\na,"unclosed', 'sku,product\na,b,c', 'sku,product\na,"x"oops']) assert.throws(() => parseCsv(csv));
});
test('CSV rejects oversize input', () => assert.throws(() => parseCsv('x'.repeat(33000)), /32 KB/));
test('decimal sizes normalize without mixing mass and volume', () => {
  assert.equal(describe('Viento ground coffee 0,25 kg').size, 250);
  assert.equal(describe('Loma whole milk 1000cc').unit, 'ml');
});

test('inspectable evidence exposes the exact gate that changes a matching decision', () => {
  const pack = compareNames('Loma whole milk 1 L', 'Loma whole milk 6 x 1 L');
  assert.equal(pack.checks.find(c => c.key === 'pack').status, 'conflict');
  const missing = compareNames('Loma whole milk 1 L', 'Loma milk 1 L');
  assert.equal(missing.decision, 'uncertain');
  assert.equal(missing.checks.find(c => c.key === 'variant').status, 'missing');
  const unsupported = compareNames('Cafe Viento molido 250 g', 'Cafe Viento molido premium 250 g');
  assert.equal(unsupported.checks.find(c => c.key === 'qualifiers').status, 'unsupported');
  assert.deepEqual(unsupported.checks.find(c => c.key === 'qualifiers').candidate, ['premium']);
  const unbranded = compareNames('Pollo entero 1 kg', 'Whole chicken 1000 g');
  assert.equal(unbranded.decision, 'yes');
  assert.equal(unbranded.checks.find(c => c.key === 'brand').status, 'optional');
});
