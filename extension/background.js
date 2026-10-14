'use strict';
const operations=new Map();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function permitted(url,host,kind){try{const u=new URL(url);if(u.protocol!=='https:'||!host.includes(u.hostname))return false;return kind==='nl'?/^\/c\/[^/]+\/(?:search\/)?(?:details|detail)\//.test(u.pathname):/^\/(?:book\/show\/|series\/|search(?:\/|$))/.test(u.pathname);}catch{return false;}}
async function inspect(url,call,op){
 if(op.cancelled)throw Error('Cancelled');const tab=await browser.tabs.create({url,active:false});op.tabs.add(tab.id);
 try{const end=Date.now()+20000;while(Date.now()<end&&!op.cancelled){const t=await browser.tabs.get(tab.id);if(t.status==='complete')break;await pause(250);}if(op.cancelled)throw Error('Cancelled');
 await pause(2000);if(op.cancelled)throw Error('Cancelled');await browser.tabs.executeScript(tab.id,{file:'series-source.js'});let latest;
 for(let i=0;i<8&&!op.cancelled;i++){[latest]=await browser.tabs.executeScript(tab.id,{code:call});if(latest&&latest.status!=='unknown')return latest;await pause(500);}return latest;
 }finally{op.tabs.delete(tab.id);try{await browser.tabs.remove(tab.id);}catch{}}
}
async function lookup(message,sender){
 if(sender.tab?.url?.startsWith('https://research.ebsco.com/')!==true)throw Error('Only NoveList tabs can request lookups.');
 const row=message.row;if(!row||!permitted(row.url,['research.ebsco.com'],'nl'))throw Error('Invalid NoveList record URL.');
 const op={tabs:new Set(),cancelled:false};const id=sender.tab.id+':'+message.id;operations.set(id,op);let nl,gr;
 try{
 try{nl=await inspect(row.url,'NoveListSeries.readNoveList(document)',op);}catch(e){nl=NoveListSeries.unknown(e.message);}
 if(op.cancelled)throw Error('Cancelled');let url=row.goodreadsURL;
 if(!permitted(url,['www.goodreads.com','goodreads.com'],'gr')||!new URL(url).pathname.startsWith('/book/show/')){
 try{const search='https://www.goodreads.com/search?q='+encodeURIComponent(row.title+' '+row.author);url=await inspect(search,'NoveListSeries.findGoodreadsBook(document,'+JSON.stringify(row.title)+','+JSON.stringify(row.author)+')',op);}catch{}
 }
 if(op.cancelled)throw Error('Cancelled');
 if(permitted(url,['www.goodreads.com','goodreads.com'],'gr')&&new URL(url).pathname.startsWith('/book/show/')){
 try{gr=await inspect(url,'NoveListSeries.readGoodreads(document)',op);if(gr?.status==='yes'&&gr.total==null&&permitted(gr.seriesURL,['www.goodreads.com','goodreads.com'],'gr')&&new URL(gr.seriesURL).pathname.startsWith('/series/')){const total=await inspect(gr.seriesURL,'NoveListSeries.readSeriesTotal(document)',op);if(total)gr.total=total;}}catch(e){gr=NoveListSeries.unknown(e.message);}
 }else gr=NoveListSeries.unknown('No unambiguous Goodreads match');
 if(op.cancelled)throw Error('Cancelled');return NoveListSeries.merge(nl,gr);
 }finally{operations.delete(id);for(const t of op.tabs){try{await browser.tabs.remove(t);}catch{}}}
}
browser.runtime.onMessage.addListener((m,sender)=>{if(m.type==='lookup-series')return lookup(m,sender);if(m.type==='cancel-series'){const op=operations.get(sender.tab?.id+':'+m.id);if(op){op.cancelled=true;for(const t of op.tabs)browser.tabs.remove(t).catch(()=>{});}return Promise.resolve({cancelled:true});}});
