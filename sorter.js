(()=>{
'use strict';
(function(scope){
'use strict';
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const authorKey=s=>norm(String(s||'').split(';')[0]).split(' ').filter(Boolean).sort().join(' ');
const positionFrom=s=>{const m=String(s||'').match(/(?:#\s*|\bbook\s+|\bvolume\s+)(\d+(?:\.\d+)?)/i);return m?Number(m[1]):null;};
const unknown=note=>({status:'unknown',name:'',position:null,total:null,note});
function positive(name,position=null,total=null){return {status:'yes',name:String(name||'').trim(),position:position!=null&&position!==''&&Number.isFinite(Number(position))?Number(position):null,total:total!=null&&Number.isInteger(Number(total))&&Number(total)>0?Number(total):null};}
function cleanSeriesName(text){return text.replace(/^book\s+#?\s*\d+(?:\.\d+)?\s+(?:of|in)\s+(?:the\s+)?/i,'').replace(/\s*(?:#\s*\d+(?:\.\d+)?|\(?book\s+\d+(?:\.\d+)?(?:\s+of\s+(?:\d+|\?))?\)?)\s*$/i,'').replace(/\s+series$/i,'').trim();}
function readGoodreads(doc){
 const h=doc.querySelector('h1[data-testid="bookTitle"],h1#bookTitle');if(!h)return unknown('Goodreads book page not readable');
 const objects=[],refs={},seen=new Set();function walk(x,depth=0){if(!x||typeof x!=='object'||seen.has(x)||depth>45)return;seen.add(x);objects.push(x);for(const [k,v] of Object.entries(x)){if(v&&typeof v==='object'){if(k.includes(':'))refs[k]=v;walk(v,depth+1);}}}
 for(const s of doc.querySelectorAll('script[type="application/json"],script#__NEXT_DATA__')){try{walk(JSON.parse(s.textContent));}catch{}}
 const resolve=x=>x?.__ref?refs[x.__ref]||x:x;const b=objects.find(x=>Array.isArray(x.bookSeries)&&norm(x.title)===norm(h.textContent));
 const section=doc.querySelector('.BookPageTitleSection,.BookPageTitleSection__title,#bookSeries');const a=section?.querySelector('a[href*="/series/"]');let visible=null;
 if(a){const t=a.textContent.trim();let pos=positionFrom(t);if(pos==null){const heading=a.closest('h3,h2');if(heading)pos=positionFrom(heading.textContent);}const total=t.match(/\bbook\s+\d+(?:\.\d+)?\s+of\s+(\d+)\b/i);visible=positive(cleanSeriesName(t),pos,total?Number(total[1]):null);}
 if(b&&b.bookSeries.length){const item=resolve(b.bookSeries[0]),series=resolve(item?.series);const data=positive(series?.title||series?.name||'',item?.userPosition??item?.position,series?.primaryWorkCount??series?.primaryWorksCount);if(visible){if(!visible.name)visible.name=data.name;if(visible.position==null&&norm(visible.name)===norm(data.name))visible.position=data.position;if(visible.total==null&&norm(visible.name)===norm(data.name))visible.total=data.total;return visible;}return data;}
 if(visible)return visible;if(b&&!b.bookSeries.length)return {status:'no',name:'',position:null,total:null,note:'Goodreads explicitly lists no series'};
 return unknown('No readable series heading; confirm standalone manually if known');
}
function ordinal(word){const small=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth'];const n=small.indexOf(word.toLowerCase());if(n>=0)return n+1;const tens={twentieth:20,thirtieth:30,fortieth:40,fiftieth:50,sixtieth:60,seventieth:70,eightieth:80,ninetieth:90};if(tens[word])return tens[word];const m=word.toLowerCase().match(/^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[- ](\w+)$/);if(m){const base={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90}[m[1]],end=small.indexOf(m[2])+1;return end>0&&end<10?base+end:null;}return null;}
function readFantasticFiction(doc){
 const h=doc.querySelector('h1');if(!h)return unknown('Fantastic Fiction book page not readable');const title=doc.title||'';
 const meta=title.match(/\(([^()]+?),\s*book\s+(\d+(?:\.\d+)?)\)\s+by\s+/i);if(meta)return positive(meta[1],Number(meta[2]));
 let near=h.parentElement.textContent;if(near.length>1200){near=h.textContent;let e=h.nextElementSibling;for(let i=0;e&&i<6;i++,e=e.nextElementSibling){const t=e.textContent.trim();if(t.length>400||/^(visitors also|genre:|praise for)/i.test(t))break;near+=' '+t;}}
 const phrase=near.split(/visitors also|praise for this book|used availability/i)[0].slice(0,1200).match(/\(The\s+([\w -]+?)\s+book\s+in\s+the\s+(.+?)\s+series\)/i);if(phrase){const p=ordinal(phrase[1].trim())??positionFrom('book '+phrase[1]);return positive(phrase[2],p);}
 return unknown('No readable series metadata; confirm standalone manually if known');
}
function capture(doc,url){const u=new URL(url),gr=/(^|\.)goodreads\.com$/.test(u.hostname),ff=/(^|\.)fantasticfiction\.com$/.test(u.hostname);if(!gr&&!ff)throw Error('Use this helper on a Goodreads or Fantastic Fiction book page.');if(gr&&!/^\/book\/show\//.test(u.pathname)||ff&&!/\.htm$/.test(u.pathname))throw Error('Open an individual book page, not a search, author, or series page.');
 const title=doc.querySelector(gr?'h1[data-testid="bookTitle"],h1#bookTitle':'h1')?.textContent.trim()||'';if(!title)throw Error('The book title is not readable. Wait for the page to finish loading.');let author='';
 if(gr)author=doc.querySelector('[data-testid="name"],.ContributorLink__name,#bookAuthors .authorName')?.textContent.trim()||'';
 else author=(doc.title||'').match(/\s+by\s+(.+)$/i)?.[1]?.trim()||doc.querySelector('[itemprop="author"]')?.textContent.trim()||'';
 return {title,author,url:u.href,source:gr?'goodreads':'fantasticfiction',checkedAt:new Date().toISOString(),...(gr?readGoodreads(doc):readFantasticFiction(doc))};
}
function validateExport(payload){if(payload?.format!=='novelist-series-export/v1'||!Array.isArray(payload.records)||payload.records.length>10000)throw Error('Not a supported series export.');return payload.records.map(r=>{
 if(!r||!['goodreads','fantasticfiction'].includes(r.source)||!['yes','no','unknown'].includes(r.status)||typeof r.title!=='string'||!r.title.trim()||r.title.length>1000||typeof r.author!=='string'||r.author.length>1000||typeof r.name!=='string'||r.name.length>1000)throw Error('Invalid series record.');const u=new URL(r.url);const hosts=r.source==='goodreads'?['goodreads.com','www.goodreads.com']:['fantasticfiction.com','www.fantasticfiction.com'];if(u.protocol!=='https:'||!hosts.includes(u.hostname))throw Error('Series source URL is not trusted.');
 for(const [key,v] of [['position',r.position],['total',r.total]])if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10000||key==='total'&&(!Number.isInteger(v)||v===0)))throw Error('Invalid series number.');if(r.total!=null&&r.position!=null&&r.total<r.position)throw Error('The series total is smaller than the book number.');
 return {source:r.source,url:u.href,title:r.title.trim(),author:r.author.trim(),name:r.name.trim(),status:r.status,position:r.position,total:r.total,note:typeof r.note==='string'?r.note.slice(0,1500):'',checkedAt:typeof r.checkedAt==='string'?r.checkedAt:''};});}
function goodreadsId(url){try{return new URL(url).pathname.match(/^\/book\/show\/(\d+)/)?.[1]||null;}catch{return null;}}
function matches(row,r){const id=goodreadsId(row.goodreadsURL);if(r.source==='goodreads'&&id&&id===goodreadsId(r.url))return true;return !!authorKey(row.author)&&authorKey(row.author)===authorKey(r.author)&&norm(row.title)===norm(r.title);}
function recordKey(r){const u=new URL(r.url);return r.source+':'+(r.source==='goodreads'?goodreadsId(r.url)||u.pathname:u.pathname);}
function summarize(records){
 if(!records.length)return {label:'Unknown',note:'No imported series information for this book.'};const yes=records.filter(r=>r.status==='yes');let label='Unknown';
 if(yes.length){const numbered=yes.filter(r=>r.position!=null);const nums=new Set(numbered.map(r=>r.position));const names=new Set(yes.map(r=>norm(r.name)).filter(Boolean));if(nums.size>1)label='Yes';else if(numbered.length){const p=numbered[0].position;const totals=new Set(yes.filter(r=>r.total!=null).map(r=>r.total));const total=names.size<=1&&totals.size===1?[...totals][0]:'?';label=`Book ${p} of ${total}`;}else label='Yes';}
 else if(['goodreads','fantasticfiction'].every(source=>records.some(r=>r.source===source&&r.status==='no')))label='No';
 const note=records.map(r=>(r.source==='goodreads'?'Goodreads':'Fantastic Fiction')+': '+r.status+(r.name?' — '+r.name:'')+(r.position!=null?' (#'+r.position+')':'')+(r.note?' — '+r.note:'')).join('\n')+(label==='Yes'&&yes.some(r=>r.position!=null)?'\nSources disagree; inspect the source records.':'');return {label,note};
}
const api={capture,readGoodreads,readFantasticFiction,validateExport,recordKey,matches,summarize,norm,authorKey};scope.NoveListSeriesManual=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);




const existing=document.getElementById('adele-novelist-sorter');if(existing){existing.scrollIntoView();return;}
const cards=()=>Array.from(document.querySelectorAll('article[data-auto="search-result-item"]'));
if(!cards().length){alert('Open a NoveList search results page first.');return;}
const host=document.createElement('div');host.id='adele-novelist-sorter';document.body.append(host);
const root=host.attachShadow({mode:'open'});
root.innerHTML=`<style>:host{all:initial;position:fixed;inset:12px;z-index:2147483647;font:15px system-ui;color:#222}section{height:100%;box-sizing:border-box;background:#fff;border:2px solid #68508a;border-radius:12px;padding:16px;display:flex;flex-direction:column;box-shadow:0 8px 40px #0006}h2{margin:0 0 8px}button{font:inherit;padding:7px;margin:4px;border:1px solid #aaa;border-radius:5px;background:#f4f1f8;color:#222;cursor:pointer}button:disabled{opacity:.5}p{margin:6px 0}.scroll{overflow:auto;flex:1;min-height:0}table{border-collapse:collapse;width:100%;min-width:1400px;font-size:14px}th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #ddd}th{position:sticky;top:0;background:#eee;z-index:1}th button{border:0;background:transparent;white-space:nowrap;margin:0;padding:0;color:#57377b;font-weight:700}th button:focus-visible{outline:2px solid #68508a}td:nth-child(1){min-width:150px}.book-cover{display:block;width:auto;height:auto;max-width:120px;max-height:180px;object-fit:contain;margin-top:10px}td:nth-child(2){min-width:110px}td:nth-child(7){min-width:320px;max-width:520px;white-space:pre-line}td:nth-child(8){min-width:230px;max-width:340px}a{color:#57377b}#status{font-weight:600}#levels{font-size:13px;color:#555}</style><section><h2>NoveList results sorter</h2><div><button id="start">Collect all pages (50 per page)</button><button id="stop" disabled>Stop</button><button id="refresh">Add current page</button><button id="series">Import series</button><input id="series-file" type="file" accept=".json,application/json" multiple hidden><button id="clear">Clear sort</button><button id="export">Export CSV</button><button id="close">Close</button></div><p>Start on page 1. Keep this tab open; do not change the search or filters while collecting.</p><p>Click a column heading to sort; click it again to reverse. The latest column is primary, with earlier sorts breaking ties.</p><p id="levels"></p><p id="status" role="status" aria-live="polite"></p><div class="scroll"><table><thead><tr><th><button data-sort="title">Title</button></th><th><button data-sort="author">Author</button></th><th><button data-sort="rating">Goodreads rating</button></th><th><button data-sort="stamp">Published (In:)</button></th><th><button data-sort="reviews">Goodreads reviews</button></th><th><button data-sort="seriesLabel">Series</button></th><th>Synopsis</th><th>Subjects</th></tr></thead><tbody></tbody></table></div></section>`;
const $=s=>root.querySelector(s),data=new Map();let running=false,stop=false;
let sortLevels=[{field:'rating',dir:-1}];
const names={title:'Title',author:'Author',rating:'Goodreads rating',stamp:'Publication date',reviews:'Goodreads reviews',seriesLabel:'Series'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const text=(e,s)=>e.querySelector(s)?.textContent.trim()||'';
const enabled=e=>e&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
function safeURL(value){if(!value)return '';try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}
function extract(e){
 const a=e.querySelector('[data-auto="result-item-title__link"]');if(!a)return null;
 const stars=Array.from(e.querySelectorAll('[data-auto^="star-full-"]'));
 const widths=stars.map(s=>s.style.width);const rating=stars.length===5&&widths.every(w=>w.endsWith('%')&&Number.isFinite(parseFloat(w)))?Math.round(widths.reduce((n,w)=>n+parseFloat(w)/100,0)*100)/100:null;
 const date=text(e,'[data-auto="result-item-metadata-content--published"]');
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const year=date.match(/\b(\d{4})\b/);const month=months.indexOf(date.slice(0,3).toLowerCase());
 const stamp=year?Date.UTC(Number(year[1]),Math.max(0,month),1):null;
 const cover=e.querySelector('img[data-auto="nuc-cover-image-image"]');const coverURL=safeURL(cover?.currentSrc||cover?.src||'');
 const reviewLink=e.querySelector('[data-auto="review-link"]');const reviewLabel=reviewLink?.textContent.trim()||'';const digits=reviewLabel.match(/[\d][\d,\s\u00a0\u202f]*/)?.[0].replace(/\D/g,'');
 const reviews=digits?Number(digits):null;
 const subjects=[...new Set(Array.from(e.querySelectorAll('[data-auto="subjects-content"] dd a')).map(a=>a.textContent.trim()).filter(Boolean))].join('; ');
 const remaining=e.querySelector('[data-auto="subjects-content"] button[aria-expanded="false"]');
 const initialSeries={label:'Unknown',note:'No imported series information for this book.'};
 return {seriesLabel:initialSeries.label,seriesNote:initialSeries.note,seriesChecked:false,coverURL,url:safeURL(a.href),title:a.textContent.trim(),author:text(e,'[data-auto="result-item-metadata-content--contributors"]'),rating,date,stamp,reviews,reviewLabel,goodreadsURL:safeURL(reviewLink?.href||''),synopsis:text(e,'[data-auto="abstract-content"]'),subjects,subjectsPartial:!!remaining};
}
function add(){for(const e of cards()){const r=extract(e);if(r&&r.url){applySeries(r);data.set(r.url,r);}}render();}
function total(){const s=document.querySelector('[data-auto="result-count"]')?.textContent||'';return Number(s.match(/of\s+([\d,]+)\s+total/i)?.[1]?.replaceAll(',',''))||null;}
function key(){const u=new URL(location.href);return JSON.stringify(['q','limiters','searchMode','searchSegment'].map(k=>u.searchParams.get(k)));}
function fingerprint(){return cards().map(c=>c.querySelector('[data-auto="result-item-title__link"]')?.getAttribute('href')).join('|');}
function toggleSort(field){const old=sortLevels.find(s=>s.field===field);const dir=old?-old.dir:['rating','stamp','reviews'].includes(field)?-1:1;sortLevels=[{field,dir},...sortLevels.filter(s=>s.field!==field)];render();}
function compare(a,b){for(const {field,dir} of sortLevels){const x=a[field],y=b[field];const mx=x==null||x==='',my=y==null||y==='';if(mx||my){if(mx!==my)return mx?1:-1;continue;}const c=typeof x==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'});if(c)return c*dir;}return 0;}
function sorted(){return [...data.values()].sort(compare);}
function link(label,url){const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function render(){
 for(const b of root.querySelectorAll('[data-sort]')){const field=b.dataset.sort,i=sortLevels.findIndex(s=>s.field===field);b.textContent=names[field]+(i<0?'':` ${sortLevels[i].dir===1?'↑':'↓'} ${i+1}`);const th=b.parentElement;th.setAttribute('aria-sort',i===0?(sortLevels[0].dir===1?'ascending':'descending'):'none');b.title=i<0?'Sort by '+names[field]:`Sort level ${i+1}; click to reverse and make primary`;}
 $('#levels').textContent=sortLevels.length?'Sort priority: '+sortLevels.map((s,i)=>`${i+1}. ${names[s.field]} (${s.dir===1?'ascending':'descending'})`).join(' → ')+'. Missing values sort last.':'Collection order. Click a column heading to sort.';
 const body=$('tbody');body.replaceChildren();const frag=document.createDocumentFragment();for(const r of sorted()){const tr=document.createElement('tr');for(const v of [r.title,r.author||'—',r.rating==null?'—':r.rating.toFixed(2),r.date||'—',r.reviews==null?'—':r.reviewLabel||r.reviews.toLocaleString()+' reviews',r.seriesLabel||'Unknown',r.synopsis||'—',r.subjects+(r.subjectsPartial?' [additional subjects not loaded]':'')||'—']){const td=document.createElement('td');td.textContent=v;tr.append(td);}tr.children[5].title=r.seriesNote||'';const lookup=document.createElement('div');lookup.style.fontSize='12px';lookup.style.marginTop='7px';const grURL=r.goodreadsURL||'https://www.goodreads.com/search?q='+encodeURIComponent(r.title+' '+r.author);lookup.append(link('Goodreads',grURL),document.createTextNode(' · '),link('Fantastic Fiction','https://www.fantasticfiction.com/'));tr.children[5].append(lookup);tr.children[0].replaceChildren(link(r.title,r.url));if(r.coverURL){const img=document.createElement('img');img.className='book-cover';img.src=r.coverURL;img.alt='Cover of '+r.title;img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();tr.children[0].append(img);}if(r.goodreadsURL&&r.reviews!=null)tr.children[4].replaceChildren(link(r.reviewLabel||r.reviews.toLocaleString()+' reviews',r.goodreadsURL));frag.append(tr);}body.append(frag);
}
function status(s){$('#status').textContent=s;}
function guard(original){if(key()!==original)throw Error('Search or filters changed. Collection stopped.');}
async function waitResults(original,predicate,message){let stable='',since=0;const end=Date.now()+30000;while(Date.now()<end&&!stop){await sleep(200);guard(original);const now=fingerprint();if(now&&predicate()){if(now!==stable){stable=now;since=Date.now();}if(Date.now()-since>=1200)return;}else{stable='';since=0;}}if(!stop)throw Error(message);}
async function show50(original){
 const toggle=()=>document.querySelector('[data-auto="results-per-page-dropdown-toggle"]');let b=toggle();if(!b)throw Error('Could not find the results-per-page dropdown.');
 const expected=total(),count=expected?Math.min(50,expected):50;
 if(!/\b50\b/.test(b.textContent)){
 status('Switching NoveList to 50 results per page…');if(b.getAttribute('aria-expanded')!=='true')b.click();
 let option;const end=Date.now()+5000;while(Date.now()<end&&!stop){guard(original);option=Array.from(document.querySelectorAll('#results-per-page-dropdown-menu [role="option"], #results-per-page-dropdown-menu li, #results-per-page-dropdown-menu button')).find(e=>/^50$/.test(e.textContent.trim()));if(option)break;await sleep(100);}
 if(stop)return;if(!option)throw Error('Could not find the 50-results option.');option.click();
 }
 await waitResults(original,()=>/\b50\b/.test(toggle()?.textContent||'')&&cards().length===count,'NoveList did not finish loading 50 results per page. No pages were skipped.');
}
async function expandSubjects(original,fp){
 const toggles=()=>Array.from(document.querySelectorAll('article[data-auto="search-result-item"] [data-auto="subjects-content"] button[aria-expanded="false"]'));
 // NoveList already has the subject list; the toggle reveals the remaining items.
 for(const b of toggles()){if(stop)return;guard(original);if(fingerprint()!==fp)throw Error('Results changed while reading subjects.');if(enabled(b))b.click();}
 const end=Date.now()+5000;while(toggles().length&&Date.now()<end&&!stop){await sleep(100);guard(original);if(fingerprint()!==fp)throw Error('Results changed while reading subjects.');}
 await sleep(200);
}
async function collect(){
 if(running)return;const page=new URL(location.href).searchParams.get('p');if(page&&page!=='1'){status('Return to page 1, then click Collect all pages.');return;}
 running=true;stop=false;$('#start').disabled=true;$('#series').disabled=true;$('#stop').disabled=false;$('#refresh').disabled=true;const original=key(),expected=total(),seen=new Set();
 try{
 await show50(original);if(stop){status('Stopped before collection began; existing table retained.');return;}
 data.clear();render();
 while(!stop){guard(original);const fp=fingerprint();if(!fp)throw Error('No results found on this page.');if(seen.has(fp))throw Error('A page repeated. Collection stopped to avoid skipping results.');seen.add(fp);
 status(`Reading page ${seen.size} (${cards().length} results)… ${data.size} collected${expected?' of '+expected:''}.`);
 await sleep(2500);if(stop)break;guard(original);if(fingerprint()!==fp)throw Error('Results changed while being read. Please restart on page 1.');await expandSubjects(original,fp);if(stop)break;guard(original);if(fingerprint()!==fp)throw Error('Results changed while being read.');add();
 status(`${data.size}${expected?' of '+expected:''} results collected. Reading next page…`);
 const next=document.querySelector('button[aria-label="Next page"]');if(!enabled(next))break;
 const nextCount=expected?Math.min(50,Math.max(0,expected-seen.size*50)):null;next.click();await waitResults(original,()=>fingerprint()!==fp&&(nextCount==null||cards().length===nextCount),'The next page did not load within 30 seconds. Collected results are retained.');
 }
 const missing=[...data.values()].filter(r=>r.rating==null).length,partialSubjects=[...data.values()].filter(r=>r.subjectsPartial).length;
 status(`${stop?'Stopped':expected===data.size?'Complete':'Collection ended'}: ${data.size}${expected?' of '+expected:''} results. ${missing} without ratings.${partialSubjects?' '+partialSubjects+' with unexpanded subjects.':''}${!stop&&expected&&expected!==data.size?' This is a partial collection.':''}`);
 }catch(e){status(`${e.message} ${data.size} results retained; collection is partial.`);}finally{running=false;$('#start').disabled=false;$('#series').disabled=false;$('#stop').disabled=true;$('#refresh').disabled=false;}
}


const importedSeries=new Map();
function applySeries(row){const evidence=[...importedSeries.values()].filter(r=>NoveListSeriesManual.matches(row,r));const summary=NoveListSeriesManual.summarize(evidence);row.seriesLabel=summary.label;row.seriesNote=summary.note;row.seriesChecked=evidence.length>0;}
function applyAllSeries(){for(const row of data.values())applySeries(row);render();}
async function importSeriesFiles(files){
 const validated=[];for(const file of files){if(file.size>5*1024*1024)throw Error('Series export is too large.');validated.push(...NoveListSeriesManual.validateExport(JSON.parse(await file.text())));}
 for(const record of validated)importedSeries.set(NoveListSeriesManual.recordKey(record),record);
 applyAllSeries();const matches=[...data.values()].filter(r=>r.seriesChecked).length;const unmatched=[...importedSeries.values()].filter(record=>![...data.values()].some(row=>NoveListSeriesManual.matches(row,record))).length;
 status(`Imported ${validated.length} series record(s); ${matches} table row(s) matched. ${unmatched} imported record(s) have no matching row. Imports also apply to books collected later. Hover over Series cells for source notes.`);
}
$('#series').onclick=()=>$('#series-file').click();
$('#series-file').onchange=async event=>{try{await importSeriesFiles([...event.target.files]);}catch(error){status('Series import failed: '+error.message+' No new records from these files were applied.');}finally{event.target.value='';}};

$('#start').onclick=collect;$('#stop').onclick=()=>{stop=true;status('Stopping…');};
$('#refresh').onclick=async()=>{if(running)return;running=true;stop=false;$('#start').disabled=true;$('#series').disabled=true;$('#refresh').disabled=true;$('#stop').disabled=false;try{const original=key(),fp=fingerprint();await sleep(2500);guard(original);if(fingerprint()!==fp)throw Error('Results changed.');await expandSubjects(original,fp);guard(original);if(fingerprint()!==fp)throw Error('Results changed.');if(!stop){add();status(`${data.size} results collected from visited pages.`);}}catch(e){status(e.message);}finally{running=false;$('#start').disabled=false;$('#series').disabled=false;$('#refresh').disabled=false;$('#stop').disabled=true;}};
for(const b of root.querySelectorAll('[data-sort]'))b.onclick=()=>toggleSort(b.dataset.sort);
$('#clear').onclick=()=>{sortLevels=[];render();};$('#close').onclick=()=>{stop=true;host.remove();};
$('#export').onclick=()=>{const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const rows=[['Title','Author','Goodreads rating','Publication date','Goodreads reviews','Series','Series source notes','Synopsis','Subjects','NoveList URL','Goodreads URL','Subjects fully expanded'],...sorted().map(r=>[r.title,r.author,r.rating,r.date,r.reviews,r.seriesLabel,r.seriesNote,r.synopsis,r.subjects,r.url,r.goodreadsURL,!r.subjectsPartial])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='novelist-sorted-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);};
add();status(`${data.size} results from the current page. Collect all pages switches to 50 per page and expands the subject lists.`);
})();
