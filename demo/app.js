import { catalog, sampleCsv } from '/data/catalog.js';
import { matchCatalog } from '/src/match.js';
import { parseCsv } from '/src/csv.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const price = n => n.toFixed(2);
const labels = { yes: 'Match', no: 'Different', uncertain: 'Review', error: 'Error' };
let rows = [], selected = 0, revision = 0, pending = false;
const jevResults = new Map();
function badge(decision) { return '<span class="decision ' + decision + '">' + labels[decision] + '</span>'; }
function render() {
  $('inventory').innerHTML = rows.map((r, i) => '<button class="' + (i === selected ? 'active' : '') + '" data-index="' + i + '" aria-pressed="' + (i === selected) + '"><small>' + escape(r.sku) + '</small>' + escape(r.product) + '</button>').join('');
  const row = rows[selected];
  if (!row) return;
  $('selected').textContent = row.product;
  const accepted = row.candidates.filter(c => c.decision === 'yes');
  $('matched').textContent = accepted.length;
  $('merchants').textContent = new Set(accepted.map(c => c.merchant)).size;
  $('range').textContent = accepted.length ? '$' + price(Math.min(...accepted.map(c => c.price))) + '–' + price(Math.max(...accepted.map(c => c.price))) : '—';
  const attrs = row.candidates[0].request;
  $('attributes').innerHTML = ['kind', 'brand', 'variant'].map(k => '<span class="tag">' + escape(attrs[k] ?? 'unknown ' + k) + '</span>').join('') + '<span class="tag">' + escape(attrs.size == null ? 'size unknown' : attrs.size + ' ' + attrs.unit) + '</span><span class="tag">' + attrs.pack + ' per pack</span>';
  const visible = $('show-all').checked ? row.candidates : row.candidates.filter(c => c.candidate.kind === attrs.kind || c.baseline);
  const jev = jevResults.get(row.sku);
  $('candidates').innerHTML = visible.map(c => {
    const index = row.candidates.indexOf(c);
    return '<tr><td class="candidate-name">' + escape(c.product) + '<small>' + escape(c.merchant) + '</small></td><td>$' + price(c.price) + '</td><td><span class="' + (c.baseline ? 'yes' : 'muted') + '">' + (c.baseline ? 'Overlap' : 'No overlap') + '</span></td><td>' + badge(c.decision) + '</td><td>' + (jev ? badge(jev.answers[index].decision) : '<span class="muted">Not run</span>') + '</td></tr>';
  }).join('');
  $('explanations').innerHTML = visible.map(c => '<div class="explanation">' + escape(c.product) + '<small>' + escape(c.reason) + '</small></div>').join('');
  if (jev) $('jev-status').textContent = 'Live provider: ' + (jev.model ?? 'unknown model') + ' · ' + Math.round(jev.ms) + ' ms · ' + (jev.inputTokens ?? 'unknown') + ' input tokens. Confidence is not a verified accuracy score.';
  else if (!pending) $('jev-status').textContent = 'Offline rules are running. No Jev result for this item.';
}
function load(csv) {
  try {
    const parsed = parseCsv(csv); rows = matchCatalog(parsed, catalog);
    selected = 0; revision++; jevResults.clear(); $('csv').value = csv; $('error').textContent = ''; render();
  } catch (error) { $('error').textContent = error.message; }
}
$('inventory').addEventListener('click', event => {
  const button = event.target.closest('[data-index]');
  if (button) { selected = Number(button.dataset.index); render(); }
});
$('apply').onclick = () => load($('csv').value);
$('reset').onclick = () => { load(sampleCsv); $('file-name').textContent = 'Example inventory loaded'; };
$('show-all').onchange = render;
$('csv-file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 32768) { $('error').textContent = 'CSV limit: 32 KB'; return; }
  load(await file.text()); $('file-name').textContent = file.name;
};
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ note: 'Fictional reference catalog; offline identity rules, optional live Jev results.', rows, jev: Object.fromEntries(jevResults) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'catalog-match-results.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('jev').onclick = async () => {
  const row = rows[selected], currentRevision = revision;
  pending = true; $('jev').disabled = true; $('jev-status').textContent = 'Asking Jev about this item…';
  try {
    const response = await fetch('/api/jev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairs: row.candidates.map(c => ({ request: row.product, candidate: c.product })) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Provider unavailable');
    if (revision === currentRevision) { jevResults.set(row.sku, result); render(); }
  } catch (error) { $('jev-status').textContent = error.message; }
  finally { pending = false; $('jev').disabled = false; }
};
load(sampleCsv);
fetch('/api/config').then(r => r.json()).then(config => {
  if (!config.jev) { $('jev').disabled = true; $('jev-status').textContent = 'Optional: set JEV_API_KEY on the local server to enable real calls. Offline matching is ready.'; }
}).catch(() => { $('jev').disabled = true; $('jev-status').textContent = 'Start the local Node server to enable the optional Jev adapter.'; });
