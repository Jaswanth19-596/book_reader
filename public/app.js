import { loadConnection, saveConnection, forgetConnection } from './connection.js';

const $=id=>document.getElementById(id);let pdf=null,page=1,scale=1,apiKey=loadConnection().apiKey,model=loadConnection().model,pageText='',current=null,renderId=0,requestId=0;const session=crypto.randomUUID();let saved=[];try{saved=JSON.parse(localStorage.getItem('folio-words')||'[]');if(!Array.isArray(saved))saved=[]}catch{}const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sample={word:'serendipity',partOfSpeech:'noun',meaning:'The pleasant surprise of finding something valuable or meaningful when you were not looking for it.',context:'Here, it describes unexpectedly finding a thought in a book that feels exactly right for you.',examples:['Finding your favorite book in a tiny café was pure serendipity.','Through serendipity, a chance conversation led to a wonderful friendship.'],demo:true};
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3500)}
function showTab(which){$('meaning').hidden=which!=='meaning';$('saved').hidden=which!=='saved';$('lookupBar').hidden=which!=='meaning';$('meaningTab').classList.toggle('active',which==='meaning');$('savedTab').classList.toggle('active',which==='saved');if(which==='saved')renderSaved()}
function display(d){current=d;showTab('meaning');$('meaning').innerHTML='<span class="eyebrow">'+(d.demo?'Sample definition':'In your reading')+'</span><h2 class="'+(d.word.length>65?'long-selection':'')+'">'+esc(d.word)+'</h2><span class="tag">'+esc(d.kind==='paragraph'?'Paragraph explained':d.kind==='sentence'?'Sentence explained':d.partOfSpeech||'Word or phrase')+'</span><p class="definition">'+esc(d.meaning)+'</p><h3>In this context</h3><div class="context">'+esc(d.context)+'</div>'+((d.trickyPhrases||[]).length?'<h3>Phrases explained</h3>'+d.trickyPhrases.map(t=>'<div class="example">'+esc(t)+'</div>').join(''):'')+'<h3>'+(['sentence','paragraph'].includes(d.kind)?'Similar examples':'Try it in a sentence')+'</h3>'+d.examples.map(e=>'<div class="example">'+esc(e)+'</div>').join('')+'<button class="save" id="saveWord">＋ Save selection</button><p class="note">'+(d.demo?'A sample to explore. Connect your API to explain words, sentences, or paragraphs from your reading.':'AI explanations can be imperfect. Use the surrounding text to check the meaning.')+'</p>';$('saveWord').onclick=()=>{if(saved.some(x=>x.word===d.word))return toast('This selection is already saved');saved.unshift(d);try{localStorage.setItem('folio-words',JSON.stringify(saved));updateCount();toast('Selection saved')}catch{toast('Browser storage is full or unavailable')}}}
function updateCount(){$('count').textContent=saved.length}function renderSaved(){$('saved').innerHTML=saved.length?saved.map((d,i)=>'<div class="saved-row"><button data-remove="'+i+'" aria-label="Remove '+esc(d.word)+'">×</button><strong>'+esc(d.word)+'</strong><p>'+esc(d.meaning)+'</p></div>').join(''):'<div class="empty">Your vocabulary, one word at a time.<br>Save a meaning to revisit it here.</div>';$('saved').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{saved.splice(+b.dataset.remove,1);try{localStorage.setItem('folio-words',JSON.stringify(saved))}catch{}updateCount();renderSaved()})}
function updateConnectionUI(){
  $('settings').textContent=apiKey?'Connected':'Connection';
  $('forget').disabled=!apiKey;
}
function openConnection(){
  $('key').value='';
  $('key').placeholder=apiKey?'Leave blank to keep your current key':'Paste your OpenCode Go key';
  $('model').value=model;
  const remembered=loadConnection().apiKey;
  $('remember').checked=!!remembered||!apiKey;
  $('connectionStatus').textContent=apiKey?(remembered===apiKey?'Connection saved in this browser.':'Connection active for this tab only.'):'No connection saved yet.';
  $('config').showModal();
}
$('meaningTab').onclick=()=>showTab('meaning');
$('savedTab').onclick=()=>showTab('saved');
$('settings').onclick=openConnection;
$('closeConfig').onclick=()=>$('config').close();
$('connect').onclick=()=>{
  const nextKey=$('key').value.trim()||apiKey;
  if(!nextKey){$('connectionStatus').textContent='Enter your OpenCode Go API key.';return;}
  if(nextKey.length>1000){$('connectionStatus').textContent='This key is too long. Check what you pasted.';return;}
  apiKey=nextKey;model=$('model').value;
  const persisted=saveConnection({apiKey,model},$('remember').checked);
  $('key').value='';updateConnectionUI();
  if(!persisted){$('connectionStatus').textContent='Connection works for this tab, but browser storage could not be updated. Check your browser storage settings.';return;}
  $('config').close();
  toast($('remember').checked?'Connection saved on this device.':'Connection active for this tab only.');
};
$('forget').onclick=()=>{
  if(!forgetConnection()){$('connectionStatus').textContent='Could not remove the saved key. Clear this site’s data in your browser settings.';return;}
  apiKey='';model='glm-5.3-flash';$('key').value='';
  updateConnectionUI();$('config').close();toast('Connection forgotten.');
};
$('open').onclick=()=>$('file').click();
updateConnectionUI();
let libPromise;function library(){return libPromise??=import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';return lib}).catch(e=>{libPromise=null;throw e})}
async function openFile(file){if(!file)return;if(file.size>100*1024*1024)return toast('Please choose a PDF smaller than 100 MB.');const id=++renderId;$('hint').textContent='Opening your PDF…';try{const lib=await library();const data=await file.arrayBuffer();const task=lib.getDocument({data,isEvalSupported:false});task.onPassword=(update,reason)=>{const password=prompt(reason===2?'Incorrect password. Try again:':'This PDF needs a password:');if(password===null){task.destroy();return}update(password)};const doc=await task.promise;if(id!==renderId){doc.destroy();return}if(pdf)pdf.destroy();pdf=doc;slots=[];page=1;scale=1;$('filename').textContent=file.name;$('pages').textContent='/ '+pdf.numPages;await render()}catch(e){$('hint').textContent='Could not open this PDF. Try another file or check your connection.';toast('PDF could not be opened.')}}
let pageObserver=null,slots=[],pageTexts=new Map(),scrollFrame=0;
function updatePageControls(){ $('pageNumber').value=page;$('prev').disabled=page<=1;$('next').disabled=!pdf||page>=pdf.numPages;const text=pageTexts.get(page);$('hint').textContent=text===undefined?'Scroll to read. Select words, sentences, or paragraphs for their meaning.':text.trim()?'Scroll to read. Select a word, sentence, or paragraph for its meaning.':'This page has no selectable text. Scanned pages need OCR; you can type a word on the right.';}
function jumpTo(n){const slot=slots[n-1];if(!slot)return;page=n;$('drop').scrollTop=slot.offsetTop-24;updatePageControls();}
function trackPage(){if(!slots.length)return;const top=$('drop').getBoundingClientRect().top+Math.min(150,$('drop').clientHeight*.25);let best=0;for(let i=0;i<slots.length;i++){if(slots[i].getBoundingClientRect().top<=top)best=i;else break}page=best+1;updatePageControls();}
$('drop').addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;trackPage()})},{passive:true});
async function render(){if(!pdf){$('zoom').textContent=Math.round(scale*100)+'%';$('sheet').style.fontSize=18*scale+'px';return}
const id=++renderId,doc=pdf,targetPage=page;const old=slots[targetPage-1];const fraction=old?Math.max(0,($('drop').scrollTop-(old.offsetTop))/old.clientHeight):0;
pageObserver?.disconnect();slots=[];pageTexts=new Map();
try{const lib=await library(),first=await doc.getPage(1),base=first.getViewport({scale:scale*1.15});if(id!==renderId)return;
const fragment=document.createDocumentFragment();for(let n=1;n<=doc.numPages;n++){const slot=document.createElement('div');slot.className='sheet pdf-page';slot.dataset.page=n;slot.style.width=base.width+'px';slot.style.height=base.height+'px';slot.setAttribute('aria-label','PDF page '+n);slot.textContent='Loading page '+n+'…';slots.push(slot);fragment.append(slot)}$('drop').replaceChildren(fragment);$('zoom').textContent=Math.round(scale*100)+'%';jumpTo(targetPage);$('drop').scrollTop+=fraction*base.height;
let busy=0;const queue=[];
async function paint(slot){busy++;slot.dataset.state='rendering';const n=+slot.dataset.page;try{const p=await doc.getPage(n),v=p.getViewport({scale:scale*1.15}),text=await p.getTextContent();if(id!==renderId)return;slot.style.width=v.width+'px';slot.style.height=v.height+'px';slot.style.setProperty('--scale-factor',v.scale);const canvas=document.createElement('canvas'),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(v.width*ratio);canvas.height=Math.floor(v.height*ratio);canvas.style.width=v.width+'px';canvas.style.height=v.height+'px';await p.render({canvasContext:canvas.getContext('2d'),viewport:v,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null}).promise;const layer=document.createElement('div');layer.className='textLayer';await new lib.TextLayer({textContentSource:text,container:layer,viewport:v}).render();if(id!==renderId)return;pageTexts.set(n,text.items.map(x=>x.str).join(' '));slot.replaceChildren(canvas,layer);slot.dataset.state='ready';if(!slot.near&&!selecting&&!selectionTouches(slot)){slot.replaceChildren();delete slot.dataset.state}updatePageControls();}catch(e){if(id===renderId){slot.textContent='Page '+n+' could not load. Scroll away and back to retry.';delete slot.dataset.state}}finally{busy--;drain()}}
function drain(){if(id!==renderId)return;while(busy<2&&queue.length){const slot=queue.shift();if(slot.near&&!slot.dataset.state)paint(slot)}}
pageObserver=new IntersectionObserver(entries=>{if(id!==renderId)return;for(const entry of entries){const slot=entry.target;slot.near=entry.isIntersecting;if(slot.near){if(!slot.dataset.state&&!queue.includes(slot))queue.push(slot)}else if(slot.dataset.state==='ready'&&!selecting&&!selectionTouches(slot)){slot.replaceChildren();delete slot.dataset.state}}drain()},{root:$('drop'),rootMargin:'1200px 0px'});slots.forEach(slot=>pageObserver.observe(slot));updatePageControls();
}catch(e){if(id===renderId)toast('Could not render this PDF. Please open it again.')}}
$('file').onchange=e=>openFile(e.target.files[0]);$('drop').ondragover=e=>{e.preventDefault()};$('drop').ondrop=e=>{e.preventDefault();openFile(e.dataTransfer.files[0])};$('prev').onclick=()=>{if(page>1)jumpTo(page-1)};$('next').onclick=()=>{if(pdf&&page<pdf.numPages)jumpTo(page+1)};$('pageNumber').onchange=()=>{const n=Number($('pageNumber').value);if(pdf&&Number.isInteger(n)&&n>=1&&n<=pdf.numPages){jumpTo(n)}else $('pageNumber').value=page};$('plus').onclick=()=>{scale=Math.min(2,scale+.1);render()};$('minus').onclick=()=>{scale=Math.max(.5,scale-.1);render()};
async function lookup(word,context){word=normalizeSelection(word);if(!word)return;if(word.length>12000){showTab('meaning');$('meaning').innerHTML='<p class="status">This selection is too long. Select up to 12,000 characters at a time.</p>';return;}const id=++requestId;if(!pdf&&word.toLowerCase()==='serendipity'){display(sample);return}showTab('meaning');if(!apiKey){$('meaning').innerHTML='<h2 class="'+(word.length>65?'long-selection':'')+'">'+esc(word)+'</h2><p class="definition">Connect OpenCode Go to get a meaning and examples for this selection.</p><button id="connectNow" class="primary">Connect API</button>';$('connectNow').onclick=openConnection;return}$('meaning').innerHTML='<h2 class="'+(word.length>65?'long-selection':'')+'">'+esc(word)+'</h2><p class="empty">Finding the meaning in context…</p>';try{const res=await fetch('/api/meaning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word,context,apiKey,model,session}),signal:AbortSignal.timeout(60000)});const d=await res.json();if(id!==requestId)return;if(!res.ok)throw Error(d.error||'Lookup failed.');display({...d,word})}catch(e){if(id===requestId)$('meaning').innerHTML='<h2 class="'+(word.length>65?'long-selection':'')+'">'+esc(word)+'</h2><p class="status">'+esc(e.name==='TimeoutError'?'The request timed out. Please try again.':e.message)+'</p>'}}
function selectionTouches(slot){const s=getSelection();return !!(s&&!s.isCollapsed&&s.rangeCount&&s.getRangeAt(0).intersectsNode(slot))}
function normalizeSelection(text){return text.replace(/\u00ad/g,'').replace(/\s+/g,' ').trim()}
let selecting=false,selectionTimer,lastSelection='';
function captureSelection(){const sel=getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return null;const range=sel.getRangeAt(0),root=$('drop');if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return null;const word=normalizeSelection(sel.toString());if(!word)return null;const element=node=>node.nodeType===1?node:node.parentElement;const first=element(range.startContainer)?.closest('[data-page]'),last=element(range.endContainer)?.closest('[data-page]');let all='';if(pdf){const start=Number(first?.dataset.page),end=Number(last?.dataset.page);if(start&&end)all=Array.from({length:Math.min(end-start+1,30)},(_,i)=>pageTexts.get(start+i)||'').join(' ')}else all=$('sheet')?.innerText||'';all=normalizeSelection(all);const i=all.toLowerCase().indexOf(word.toLowerCase());const context=i>=0?(all.slice(Math.max(0,i-600),i)+' '+all.slice(i+word.length,i+word.length+600)).trim():'';return {word,context};}
function selected(){const selection=captureSelection();if(!selection)return;const identity=JSON.stringify(selection);if(identity===lastSelection)return;lastSelection=identity;lookup(selection.word,selection.context);}
$('drop').addEventListener('pointerdown',()=>{selecting=true;clearTimeout(selectionTimer);lastSelection=''});
document.addEventListener('pointerup',()=>{selecting=false;clearTimeout(selectionTimer);selectionTimer=setTimeout(selected,80)});
document.addEventListener('pointercancel',()=>{selecting=false});
document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);if(!selecting)selectionTimer=setTimeout(selected,500)});
document.addEventListener('keyup',e=>{if(e.key==='Shift'||e.key.startsWith('Arrow')){clearTimeout(selectionTimer);selectionTimer=setTimeout(selected,80)}});
$('lookupBar').onsubmit=e=>{e.preventDefault();lookup($('manualWord').value,'')};updateCount();display(sample);
