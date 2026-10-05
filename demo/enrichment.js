import { experiments, provenance } from '/data/enrichment-examples.js';
import { fields, rawSearch, enrichedSearch, compareEnriched } from '/src/enriched.js';
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const groups = {
  identity: ['product_type','subtype','brand','type_confidence'],
  lineage: ['subtype','base_ingredient','variant'],
  presentation: ['subtype','state','unit','weight_grams','pack_count','size_confidence'],
  all: fields,
};
let selected = 0, view = 'case';
const current = () => experiments[selected];
const number = index => String(index + 1).padStart(2,'0');
const format = (key,value,record) => value == null ? 'null' : key === 'weight_grams' ? value + ' ' + (record.unit === 'ml' ? 'ml' : record.unit === 'unit' ? '' : record.unit === 'kg' ? 'g (total)' : record.unit) : String(value);
function highlight(title,term) {
  const folded = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const at = folded(title).indexOf(folded(term));
  return at < 0 ? escape(title) : escape(title.slice(0,at)) + '<mark>' + escape(title.slice(at,at+term.length)) + '</mark>' + escape(title.slice(at+term.length));
}
function render() {
  const example = current(), raw = rawSearch(example.products,example.term), enriched = enrichedSearch(example.products,example.filter);
  const comparisons = example.products.slice(1).map(product => compareEnriched(example.products[0].enriched,product.enriched));
  $('examples').innerHTML = experiments.map((item,index)=>'<button type="button" data-example="'+index+'" aria-pressed="'+(index===selected)+'"><span class="inventory-number">'+number(index)+'</span><span><small>'+escape(item.topic)+'</small>'+escape(item.title)+'</span><span class="inventory-arrow" aria-hidden="true">↗</span></button>').join('');
  $('example-select').innerHTML = experiments.map((item,index)=>'<option value="'+index+'" '+(index===selected?'selected':'')+'>'+escape(item.title)+'</option>').join('');
  $('question').textContent = example.question; $('context').textContent = example.explanation;
  $('provenance').textContent = provenance.label;
  $('before-count').textContent = raw.length + ' returned';
  $('after-count').textContent = enriched.length + ' returned';
  $('raw-records').innerHTML = example.products.map((product,index)=>'<div class="raw-record"><span class="record-number">'+number(index)+'</span><div><small>raw.product_name</small><strong>'+highlight(product.raw.product_name,example.term)+'</strong><span class="record-status '+(raw.includes(product)?'title-hit':'not-returned')+'">'+(raw.includes(product)?'Title filter includes it':'Title filter misses it')+'</span></div></div>').join('');
  $('record-headings').innerHTML = example.products.map((product,index)=>'<span class="'+(enriched.includes(product)?'kept':'removed')+'"><b>'+number(index)+'</b> '+(enriched.includes(product)?'Included':'Excluded')+'</span>').join('');
  const shown = view === 'case' ? example.focus : groups[view];
  $('field-headings').innerHTML = '<tr><th scope="col">Enriched field</th>'+example.products.map((product,index)=>'<th scope="col">Listing '+number(index)+'</th>').join('')+'</tr>';
  $('enriched-records').innerHTML = shown.map(key=>{
    const states = comparisons.map(result=>result.checks.find(check=>check.key===key).status);
    const state = states.includes('conflict')?'conflict':states.includes('missing')?'missing':'same';
    return '<tr class="field-'+state+'"><th scope="row"><code>'+key+'</code></th>'+example.products.map(product=>'<td>'+escape(format(key,product.enriched[key],product.enriched))+'</td>').join('')+'</tr>';
  }).join('');
  $('field-note').textContent = 'null means no value was reported. weight_grams is total pack quantity: grams for mass or ml for volume. Confidence is checked separately.';
  const sqlValue = value => "'" + String(value).replaceAll("'","''") + "'";
  $('before-query').textContent = "WHERE LOWER(raw.product_name) LIKE "+sqlValue('%'+example.term+'%');
  $('after-query').textContent = 'WHERE '+Object.entries(example.filter).map(([key,value])=>'enriched.'+key+' = '+sqlValue(value)).join('\n  AND ');
  const recovered = enriched.filter(product=>!raw.includes(product)).length, excluded = raw.filter(product=>!enriched.includes(product)).length;
  $('findings-title').textContent = excluded ? excluded+' related listing'+(excluded===1?'':'s')+' excluded' : recovered ? recovered+' missed listing'+(recovered===1?'':'s')+' recovered' : 'Same candidates. Exact identity still needs evidence.';
  $('lesson').textContent = example.lesson;
  const renderSet = products => products.length ? products.map(product=>'<span><b>'+number(example.products.indexOf(product))+'</b> '+escape(product.raw.product_name)+'</span>').join('') : '<span>No listings</span>';
  $('before-results').innerHTML = renderSet(raw); $('after-results').innerHTML = renderSet(enriched);
  $('comparison-results').innerHTML = comparisons.map((result,index)=>'<div class="comparison-row"><span>01 ↔ '+number(index+1)+'</span><strong class="outcome-'+result.decision+'">'+({same:'Same presentation',different:'Different presentation',review:'Review'})[result.decision]+'</strong><p>'+escape(result.conflicts.length?'Different: '+result.conflicts.join(', '):result.missing.length?'Missing or weak: '+result.missing.join(', '):'The reported identity and presentation attributes agree.')+'</p></div>').join('');
  $('source-description').textContent = provenance.description;
  $('record-json').textContent = JSON.stringify({provenance,products:example.products},null,2);
  $('footer-provenance').textContent = provenance.label + ' · enrichment supplies attributes; filters and guards consume them.';
  for (const button of $('field-views').querySelectorAll('button')) button.setAttribute('aria-pressed',String(button.dataset.view===view));
}
function select(index) {
  selected = index; view = 'case'; render();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches) for(const panel of document.querySelectorAll('.before-panel,.after-panel')) panel.animate([{opacity:.55,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
}
$('examples').addEventListener('click',event=>{
  const button = event.target.closest('[data-example]'); if(!button) return;
  select(Number(button.dataset.example)); $('examples').querySelector('[aria-pressed=true]').focus({preventScroll:true});
});
$('example-select').addEventListener('change',()=>select(Number($('example-select').value)));
$('field-views').addEventListener('click',event=>{
  const button=event.target.closest('[data-view]'); if(!button)return;
  view=button.dataset.view; render();
});
render();
