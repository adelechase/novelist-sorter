/* Read only series metadata, not recommendation text or plot descriptions. */
(function(scope){
'use strict';
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const unknown=note=>({status:'unknown',name:'',position:null,total:null,note});
const number=s=>{const m=String(s||'').match(/(?:#|\bbook\s+|\bvolume\s+)(\d+(?:\.\d+)?)/i);return m?Number(m[1]):null;};
function positive(name,position=null,total=null){return {status:'yes',name:String(name||'').trim(),position:Number.isFinite(Number(position))&&position!==null&&position!==''?Number(position):null,total:Number.isInteger(Number(total))&&Number(total)>0?Number(total):null};}
function readNoveList(doc){
 const main=doc.querySelector('main')||doc;let name='',position=null,total=null,found=false;
 for(const dt of main.querySelectorAll('dt,th')){
 const label=dt.textContent.trim().replace(/:$/, '').trim().toLowerCase();const dd=dt.nextElementSibling;if(!dd)continue;const t=dd.textContent.trim();
 if(['series','series title','series information'].includes(label)&&t){if(/^(none|no|standalone|stand-alone)$/i.test(t))return {status:'no',note:'Explicit standalone field'};found=true;name=t.replace(/\s*\(?\s*(?:#|book\s+)\d+(?:\.\d+)?(?:\s+of\s+\d+)?\s*\)?\s*$/i,'');position=number(t);const suffix=t.match(/;\s*(\d+(?:\.\d+)?)\s*$/);if(position==null&&suffix){position=Number(suffix[1]);name=t.slice(0,suffix.index).trim();}const all=t.match(/\b(?:book|volume)\s+\d+(?:\.\d+)?\s+of\s+(\d+)/i);if(all)total=Number(all[1]);}
 if(['series number','series position','number in series','series order'].includes(label)){const n=t.match(/^(\d+(?:\.\d+)?)(?:\s+of\s+(\d+))?$/);if(n){position=Number(n[1]);if(n[2])total=Number(n[2]);found=true;}else if(number(t)!=null){position=number(t);found=true;}}
 }
 if(found)return positive(name,position,total);
 if(main.querySelector('[data-auto="abstract-content"]')&&main.querySelector('[data-auto="result-item-metadata"]'))return {status:'no',note:'No series field in loaded NoveList record'};
 return unknown('NoveList record not fully readable');
}
function readGoodreads(doc){
 const heading=doc.querySelector('h1[data-testid="bookTitle"],h1#bookTitle');if(!heading)return unknown('Goodreads book page blocked or not loaded');
 const title=norm(heading.textContent),seen=new Set(),objects=[],refs={};
 function walk(x,depth=0){if(!x||typeof x!=='object'||seen.has(x)||depth>45)return;seen.add(x);objects.push(x);for(const [k,v] of Object.entries(x)){if(v&&typeof v==='object'){if(k.includes(':'))refs[k]=v;walk(v,depth+1);}}}
 for(const s of doc.querySelectorAll('script[type="application/json"],script#__NEXT_DATA__')){try{walk(JSON.parse(s.textContent));}catch{}}
 const resolve=x=>x?.__ref?refs[x.__ref]||x:x;
 const book=objects.find(x=>Array.isArray(x.bookSeries)&&norm(x.title)===title);
 if(book){if(!book.bookSeries.length)return {status:'no',note:'Goodreads bookSeries is explicitly empty'};const item=resolve(book.bookSeries[0]);const series=resolve(item?.series);if(series)return {...positive(series.title||series.name,item.userPosition??item.position,series.primaryWorkCount??series.primaryWorksCount),seriesURL:series.webUrl||''};return positive('',null,null);}
 const section=doc.querySelector('.BookPageTitleSection,#bookSeries');const a=section?.querySelector('a[href*="/series/"]');
 if(a){const t=a.textContent.trim();return {...positive(t.replace(/\s*#\s*\d+(?:\.\d+)?\s*$/,''),number(t)),seriesURL:a.href};}
 return unknown('No explicit Goodreads series metadata; absence is not proof of a standalone');
}
function readSeriesTotal(doc){const header=doc.querySelector('.responsiveSeriesHeader,.SeriesPageHeader,header')||doc.querySelector('main')||doc;const t=header.textContent||'';const m=t.match(/\b(\d+)\s+primary\s+works?\b/i);return m?Number(m[1]):null;}
function findGoodreadsBook(doc,title,author){
 const wanted=norm(title),authorParts=norm(author.split(';')[0]).split(' ').filter(x=>x.length>1);const rows=Array.from(doc.querySelectorAll('tr[itemtype*="Book"],tr:has(a.bookTitle)'));const hits=[];
 for(const row of rows){const a=row.querySelector('a.bookTitle'),by=norm(row.querySelector('a.authorName')?.textContent);if(a&&norm(a.textContent)===wanted&&authorParts.length&&authorParts.every(p=>by.split(' ').includes(p)))hits.push(a.href);}
 return [...new Set(hits)].length===1?hits[0]:null;
}
function merge(nl,gr){
 nl=nl||unknown('Not checked');gr=gr||unknown('Not checked');const candidates=[nl,gr].filter(x=>x.status==='yes');let label='Unknown';
 if(candidates.length){const first=candidates.find(x=>x.position!=null)||candidates[0];let pos=first.position,total=first.total;for(const c of candidates){if(norm(c.name)&&norm(c.name)===norm(first.name)){if(pos==null)pos=c.position;if(total==null)total=c.total;}}
 if(pos!=null){label=total!=null&&total>=pos?`Book ${pos} of ${total}`:`Book ${pos}`;}else label='Yes';
 }else if(nl.status==='no'&&gr.status==='no')label='No';
 const evidence=[['NoveList',nl],['Goodreads',gr]].map(([source,r])=>source+': '+r.status+(r.name?' — '+r.name:'')+(r.position!=null?' (#'+r.position+')':'')+(r.note?' — '+r.note:''));
 const positions=candidates.map(x=>x.position).filter(x=>x!=null);if(new Set(positions).size>1){label='Yes';evidence.push('Conflicting book numbers; inspect both sources.');}
 return {label,note:evidence.join('\n'),nl,gr};
}
const api={readNoveList,readGoodreads,readSeriesTotal,findGoodreadsBook,merge,unknown};scope.NoveListSeries=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
