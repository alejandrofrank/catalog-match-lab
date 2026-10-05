import { catalog, sampleCsv } from '/data/catalog.js';
import { matchCatalog, normalize } from '/src/match.js';
import { parseCsv } from '/src/csv.js';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const price = n => '$' + n.toFixed(2);
const labels = { yes: 'Match', no: 'Different', uncertain: 'Review', error: 'Error' };
const fieldLabels = { kind: 'Product kind', brand: 'Brand', variant: 'Variant', size: 'Size', unit: 'Dimension / unit', pack: 'Units per pack', qualifiers: 'Unsupported words' };
const statusLabels = { same: 'Same', conflict: 'Conflict', missing: 'Missing', optional: 'Not required', invalid: 'Invalid', unsupported: 'Review' };
const values = { milk: 'Milk', rice: 'Rice', flour: 'Flour', chicken: 'Chicken', broth: 'Broth', coffee: 'Coffee', whole: 'Whole', skim: 'Skimmed', 'white-maize': 'White maize', 'yellow-maize': 'Yellow maize', ground: 'Ground', instant: 'Instant', white: 'White', brown: 'Brown', ml: 'Volume · ml', g: 'Mass · g' };
let rows = [], selected = 0, candidateId = null, revision = 0, pending = false, jevEnabled = false, providerMessage = 'Checking local provider configuration…';
const jevResults = new Map();
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const badge = decision => '<span class="decision ' + decision + '">' + labels[decision] + '</span>';
function currentCandidate() { return rows[selected]?.candidates.find(c => c.id === candidateId); }
function defaultCandidate(row) {
  return row.candidates.find(c => c.decision === 'no' && (c.candidate.kind === c.request.kind || c.baseline)) ?? row.candidates.find(c => c.decision === 'yes') ?? row.candidates[0];
}
function serializeRows(input) {
  const cell = value => '"' + value.replaceAll('"', '""') + '"';
  return 'sku,product\n' + input.map(row => cell(row.sku) + ',' + cell(row.product)).join('\n');
}
function fieldValue(check, side) {
  const value = check[side];
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (value == null) return 'Unknown';
  if (check.key === 'size') return String(value) + ' ' + currentCandidate()[side === 'request' ? 'request' : 'candidate'].unit;
  if (check.key === 'pack') return String(value);
  return values[value] ?? value;
}
function boundaryLabel(c) {
  if (c.decision === 'yes') return c.baseline ? 'Same presentation' : 'Aliases / units';
  if (c.decision === 'uncertain') return 'Missing / unsupported';
  const key = c.checks.find(check => check.status === 'conflict')?.key;
  return ({ kind: 'Product kind', variant: 'Variant', size: 'Size', unit: 'Dimension', pack: 'Pack', brand: 'Brand' })[key] ?? 'Conflict';
}
function animatePair() {
  if (!reducedMotion()) for (const element of document.querySelectorAll('.method-card,.evidence-panel')) element.animate([{ opacity: .5, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: 'ease-out' });
}
function render() {
  const row = rows[selected];
  if (!row) return;
  const c = currentCandidate() ?? defaultCandidate(row); candidateId = c.id;
  $('inventory').innerHTML = rows.map((r, i) => '<button type="button" data-index="' + i + '" aria-label="' + escape(r.sku + ' · ' + r.product) + '" aria-pressed="' + (i === selected) + '"><span class="inventory-number" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span><span><small>' + escape(r.sku) + '</small>' + escape(r.product) + '</span><span class="inventory-arrow" aria-hidden="true">↗</span></button>').join('');
  $('inventory-select').innerHTML = rows.map((r, i) => '<option value="' + i + '" ' + (i === selected ? 'selected' : '') + '>' + escape(r.sku + ' · ' + r.product) + '</option>').join('');
  $('selected-sku').textContent = row.sku + ' · ' + (selected + 1) + ' / ' + rows.length;
  if (document.activeElement !== $('input-name')) $('input-name').value = row.product;
  $('candidate-select').innerHTML = row.candidates.map(candidate => '<option value="' + candidate.id + '" ' + (candidate.id === c.id ? 'selected' : '') + '>' + escape(candidate.product + ' · ' + candidate.merchant) + '</option>').join('');
  $('candidate-price').textContent = price(c.price) + ' · fixture price / pack';
  const boundaries = new Map();
  for (const candidate of row.candidates) {
    if (candidate.candidate.kind === c.request.kind || candidate.baseline) {
      const label = boundaryLabel(candidate);
      if (!boundaries.has(label)) boundaries.set(label, candidate);
    }
  }
  $('quick-cases').innerHTML = [...boundaries].map(([label, candidate]) => '<button type="button" data-candidate="' + candidate.id + '" aria-pressed="' + (boundaryLabel(c) === label) + '">' + escape(label) + '</button>').join('');
  $('baseline-decision').innerHTML = '<span class="decision ' + (c.baseline ? 'overlap' : 'neutral') + '">' + (c.baseline ? 'Shared keyword' : 'No shared keyword') + '</span>';
  $('baseline-reason').textContent = c.baseline ? 'This baseline would accept any overlapping word longer than two characters. It does not protect size, variant or pack.' : 'No qualifying word overlaps. Known aliases can still describe the same presentation.';
  const candidateTokens = new Set(normalize(c.product).split(' '));
  const overlap = [...new Set(normalize(row.product).split(' ').filter(token => token.length > 2 && candidateTokens.has(token)))];
  $('overlap-tokens').innerHTML = overlap.map(token => '<span>' + escape(token) + '</span>').join('');
  $('identity-decision').innerHTML = badge(c.decision);
  $('identity-reason').textContent = c.reason;
  $('identity-consequence').textContent = c.decision === 'yes' ? 'Included in the comparable-price range.' : c.decision === 'no' ? 'Excluded from the comparable-price range.' : 'Needs review before price comparison.';
  const conflicts = c.checks.filter(check => check.status === 'conflict').length, reviews = c.checks.filter(check => ['missing', 'unsupported', 'invalid'].includes(check.status)).length;
  $('pair-state').textContent = conflicts + ' conflict' + (conflicts === 1 ? '' : 's') + ' · ' + reviews + ' review gate' + (reviews === 1 ? '' : 's');
  $('attribute-checks').innerHTML = c.checks.map(check => '<tr class="check-' + check.status + '"><th scope="row">' + fieldLabels[check.key] + '</th><td>' + escape(fieldValue(check, 'request')) + '</td><td>' + escape(fieldValue(check, 'candidate')) + '</td><td><span class="check-status">' + statusLabels[check.status] + '</span></td></tr>').join('');
  const accepted = row.candidates.filter(candidate => candidate.decision === 'yes');
  $('range').textContent = accepted.length ? price(Math.min(...accepted.map(candidate => candidate.price))) + '–' + price(Math.max(...accepted.map(candidate => candidate.price))) : 'No comparable prices';
  $('coverage').textContent = accepted.length + ' matching listings · ' + new Set(accepted.map(candidate => candidate.merchant)).size + ' stores';
  $('matched-listings').innerHTML = accepted.map(candidate => '<button type="button" data-candidate="' + candidate.id + '" aria-label="Inspect ' + escape(candidate.product + ' at ' + candidate.merchant) + '"><span>' + escape(candidate.merchant) + '</span><strong>' + price(candidate.price) + '</strong></button>').join('');
  const visible = $('show-all').checked ? row.candidates : row.candidates.filter(candidate => candidate.candidate.kind === c.request.kind || candidate.baseline);
  $('all-results-title').textContent = 'Inspect candidate results · ' + visible.length + ' / ' + catalog.length;
  $('candidates').innerHTML = visible.map(candidate => '<tr><td>' + escape(candidate.product) + '<small>' + escape(candidate.merchant) + '</small></td><td>' + price(candidate.price) + '</td><td>' + (candidate.baseline ? 'Overlap' : 'None') + '</td><td>' + badge(candidate.decision) + '</td><td><button type="button" data-candidate="' + candidate.id + '" aria-label="Inspect ' + escape(candidate.id) + '">Inspect</button></td></tr>').join('');
  const jev = jevResults.get(row.sku);
  $('jev').disabled = pending || !jevEnabled;
  $('jev-status').textContent = jev ? 'Provider: ' + (jev.model ?? 'unknown') + ' · ' + Math.round(jev.ms) + ' ms · ' + (jev.inputTokens ?? 'unknown') + ' input tokens. Confidence is not measured accuracy.' : providerMessage;
  $('jev-pair').innerHTML = jev ? '<p>Jev on this pair: ' + badge(jev.answers[row.candidates.indexOf(c)].decision) + '</p>' : '';
}
function load(csv) {
  try {
    const parsed = parseCsv(csv); rows = matchCatalog(parsed, catalog); selected = 0; candidateId = defaultCandidate(rows[0]).id; revision++; jevResults.clear(); $('csv').value = csv; $('error').textContent = ''; render(); return true;
  } catch (error) { $('error').textContent = error.message; return false; }
}
function selectInventory(index) { selected = index; candidateId = defaultCandidate(rows[selected]).id; $('input-name').value = rows[selected].product; render(); animatePair(); }
$('inventory').addEventListener('click', event => {
  const button = event.target.closest('[data-index]');
  if (button) { const restore = document.activeElement === button; selectInventory(Number(button.dataset.index)); if (restore) $('inventory').querySelector('[aria-pressed=true]').focus({ preventScroll: true }); }
});
$('inventory-select').addEventListener('change', () => selectInventory(Number($('inventory-select').value)));
$('candidate-select').addEventListener('change', () => { candidateId = $('candidate-select').value; render(); animatePair(); });
for (const id of ['quick-cases', 'matched-listings', 'candidates']) $(id).addEventListener('click', event => {
  const button = event.target.closest('[data-candidate]');
  if (button) { const restore = document.activeElement === button; candidateId = button.dataset.candidate; render(); if (restore) $(id).querySelector('[data-candidate="' + candidateId + '"]')?.focus({ preventScroll: true }); animatePair(); }
});
$('name-form').addEventListener('submit', event => {
  event.preventDefault(); const product = $('input-name').value.trim();
  try {
    const input = rows.map((row, i) => ({ sku: row.sku, product: i === selected ? product : row.product }));
    const csv = serializeRows(input); const parsed = parseCsv(csv); rows = matchCatalog(parsed, catalog); revision++; jevResults.clear(); $('csv').value = csv; $('error').textContent = ''; render(); animatePair();
  } catch (error) { $('error').textContent = error.message; }
});
$('apply').addEventListener('click', () => load($('csv').value));
$('reset').addEventListener('click', () => { load(sampleCsv); $('input-name').value = rows[0].product; $('file-name').textContent = 'Example inventory loaded'; });
$('show-all').addEventListener('change', render);
$('csv-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > 32768) throw new Error('CSV limit: 32 KB'); if (load(await file.text())) $('file-name').textContent = file.name; } catch (error) { $('error').textContent = error.message; }
});
$('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ note: 'Fictional reference catalog; offline identity rules, optional live Jev results.', rows, jev: Object.fromEntries(jevResults) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'catalog-match-results.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('jev').addEventListener('click', async () => {
  const row = rows[selected], currentRevision = revision;
  pending = true; providerMessage = 'Asking Jev about ' + row.sku + '…'; render();
  try {
    const response = await fetch('/api/jev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairs: row.candidates.map(c => ({ request: row.product, candidate: c.product })) }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Provider unavailable');
    if (revision === currentRevision) jevResults.set(row.sku, result);
    providerMessage = revision === currentRevision ? 'No Jev result for this inventory item.' : 'The names changed during the request. Its result was discarded.';
  } catch (error) { providerMessage = row.sku + ': ' + error.message; }
  finally { pending = false; render(); }
});
load(sampleCsv);
fetch('/api/config').then(response => response.json()).then(config => {
  jevEnabled = config.jev; providerMessage = jevEnabled ? 'Ready for an explicit provider request. No model calls made.' : 'Offline matching is ready. Set JEV_API_KEY on the local server to enable the optional provider.'; render();
}).catch(() => { providerMessage = 'Local provider configuration unavailable. Offline matching is ready.'; render(); });
