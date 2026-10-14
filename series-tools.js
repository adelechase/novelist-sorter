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
