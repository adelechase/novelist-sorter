'use strict';
window.addEventListener('message',async event=>{
 if(event.source!==window||event.origin!==location.origin)return;const m=event.data;if(m?.channel!=='novelist-series-request')return;
 const respond=payload=>window.postMessage({channel:'novelist-series-response',id:m.id,...payload},location.origin);
 if(m.type==='ping'){respond({available:true});return;}
 if(m.type==='cancel'){browser.runtime.sendMessage({type:'cancel-series',id:m.id}).catch(()=>{});return;}
 if(m.type!=='lookup'||typeof m.id!=='string')return;
 try{respond({result:await browser.runtime.sendMessage({type:'lookup-series',id:m.id,row:m.row})});}catch(error){respond({error:error.message});}
});
