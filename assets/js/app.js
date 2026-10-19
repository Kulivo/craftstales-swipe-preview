/* Craftstales swipe discovery prototype. No dependencies; works from file://. */
(()=>{
const ALL=window.CT, byId=Object.fromEntries(ALL.map(p=>[p.id,p]));
const $=s=>document.querySelector(s);
const ROOMS={living:'Living room',bedroom:'Bedroom',dining:'Dining',entry:'Entrance','':'Every room'};
const MATW={pearl:'pearl',bone:'bone inlay',marble:'marble',glass:'glass',brass:'brass',mango:'mango wood',iron:'iron',steel:'steel',cane:'cane',travertine:'travertine'};
const LBL={ai:'Concept image',real:'Showroom photo',product:'Product photo'};
const store={get(k,d){try{const v=localStorage.getItem('ct-swipe-'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('ct-swipe-'+k,JSON.stringify(v))}catch(e){}}};
let S={room:store.get('room',null),board:store.get('board',[]),order:[],w:{},swipes:0,hist:[],noted:false,hinted:store.get('hinted',false)};
const feats=p=>[...p.mat.map(m=>'m:'+m),'s:'+p.shape,...p.rooms.map(r=>'r:'+r),'z:'+p.size,'c:'+p.coll];
const score=p=>feats(p).reduce((a,f)=>a+(S.w[f]||0),0);
const isLight=hex=>{const n=parseInt(hex.slice(1),16);return ((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)>165};
const say=t=>{$('#live').textContent=t};

/* ---- ordering: diverse first, learned later ---- */
function initialOrder(){
  const room=S.room; const pool=ALL.filter(p=>!S.board.includes(p.id));
  const fit=pool.filter(p=>!room||p.rooms.includes(room)), rest=pool.filter(p=>room&&!p.rooms.includes(room));
  // round-robin across collections so the first 8 swipes sample every craft
  const rr=list=>{const g={};list.forEach(p=>(g[p.coll]=g[p.coll]||[]).push(p));const ks=Object.keys(g),out=[];let i=0;while(out.length<list.length){const k=ks[i%ks.length];if(g[k].length)out.push(g[k].shift());i++}return out};
  return [...rr(fit),...rr(rest)].map(p=>p.id);
}
function relearn(){
  // sort what is left by learned score; every 5th slot is a wildcard from the bottom half (avoid a taste bubble)
  const left=S.order.slice(); if(left.length<3)return;
  const ranked=left.map(id=>({id,s:score(byId[id])})).sort((a,b)=>b.s-a.s).map(x=>x.id);
  const half=Math.ceil(ranked.length/2), top=ranked.slice(0,half), bot=ranked.slice(half), out=[];
  while(top.length||bot.length){for(let i=0;i<4&&top.length;i++)out.push(top.shift());if(bot.length)out.push(bot.shift())}
  S.order=out;
}
function tasteLine(){
  const m=Object.entries(S.w).filter(([k,v])=>k.startsWith('m:')&&v>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>MATW[k.slice(2)]);
  if(!m.length)return 'Nothing kept yet. <em>Trying something different.</em>';
  return `You lean toward <em>${m.join(' and ')}</em>.`;
}
let toastT;function toast(h,ms=3200){const t=$('#toast');t.innerHTML=h;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),ms)}

/* ---- render ---- */
const deck=$('#deck');
function cardEl(p,behind){
  const el=document.createElement('article');
  el.className='card'+(p.kind==='ai'?' ai':'')+(behind?' behind':'')+(!p.blur&&isLight(p.bg)?' lightbg':'');
  el.dataset.id=p.id; el.setAttribute('aria-label',`${p.name}. ${p.collName}, ${p.type}. Price to be added.`);
  el.style.background=p.kind==='ai'?`linear-gradient(${p.bgt} 0%,${p.bgt} 22%,${p.bgb} 78%,${p.bgb})`:p.bg;
  el.innerHTML=`${p.blur?`<div class="bgimg" style="background-image:url(assets/img/cards/${p.id}-bg.jpg)"></div>`:''}<img src="${p.img}" alt="${p.name}, ${p.craft.toLowerCase()}" draggable="false">
   <span class="tag">${LBL[p.kind]}</span><div class="shade"></div>
   <div class="meta"><h2>${p.name}</h2><p class="price">Price</p></div>
   <div class="stamp keep">Kept</div><div class="stamp pass">Pass</div>`;
  return el;
}
function render(){
  deck.innerHTML='';
  const [a,b]=S.order;
  if(b)deck.appendChild(cardEl(byId[b],true));
  if(a){const el=cardEl(byId[a],false);deck.appendChild(el);bindDrag(el);$('#bgblur').style.backgroundImage=`url(${byId[a].img})`}
  $('#count').textContent=S.board.length;
  $('#undoBtn').disabled=!S.hist.length;
  $('#roomBtn').textContent=ROOMS[S.room||''];
  if(!a)openBoard(true);
}
function persist(){store.set('board',S.board)}

/* ---- actions ---- */
let busy=false;
function act(kind){
  if(busy)return; const id=S.order[0]; if(!id)return; const p=byId[id];
  S.hist.push({id,kind,w:{...S.w},order:S.order.slice(),board:S.board.slice()});
  const f=feats(p), d=kind==='keep'?1:kind==='pass'?-.6:.4;
  f.forEach(k=>S.w[k]=(S.w[k]||0)+d);
  if(kind==='keep'&&!S.board.includes(id)){S.board.push(id);persist();const b=$('#boardBtn');b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),900)}
  S.order.shift(); S.swipes++;
  if(S.swipes>=2&&!S.hinted){S.hinted=true;store.set('hinted',true);$('#hint').classList.add('off')}
  if(S.swipes===8||(S.swipes>8&&S.swipes%4===0))relearn();
  say(kind==='keep'?`Kept ${p.name}. ${S.board.length} on your Board.`:`Passed ${p.name}.`);
  if(S.swipes===8&&!S.noted){S.noted=true;setTimeout(()=>toast(tasteLine()),420)}
}
function fly(el,kind,dx=0,dy=0){
  busy=true; el.classList.add('anim');
  if(kind==='keep'){el.classList.add('kept');el.querySelector('.stamp.keep').style.opacity=1}
  if(kind==='pass')el.querySelector('.stamp.pass').style.opacity=1;
  const X=kind==='keep'?innerWidth*1.2:-innerWidth*1.2;
  requestAnimationFrame(()=>{el.style.transform=`translate(${X}px,${dy*0.5}px) rotate(${kind==='keep'?16:-16}deg)`;el.style.opacity=.2});
  const nb=deck.querySelector('.card.behind'); if(nb){nb.classList.add('anim');nb.classList.remove('behind')}
  setTimeout(()=>{busy=false;render()},kind==='keep'?420:340);
}
function keep(){const el=deck.querySelector('.card:not(.behind)');if(!el||busy)return;act('keep');fly(el,'keep')}
function pass(){const el=deck.querySelector('.card:not(.behind)');if(!el||busy)return;act('pass');fly(el,'pass')}
function undo(){
  if(busy||!S.hist.length)return; const h=S.hist.pop();
  S.w=h.w; S.order=h.order; S.board=h.board; S.swipes=Math.max(0,S.swipes-1); persist();
  closeBoard(); render(); say(`Brought back ${byId[h.id].name}.`);
  const el=deck.querySelector('.card:not(.behind)'); if(el){el.style.transform=`translate(${h.kind==='keep'?120:-120}px,0) rotate(${h.kind==='keep'?8:-8}deg)`;el.style.opacity=.4;el.classList.add('anim');requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.transform='';el.style.opacity=1}))}
}

/* ---- drag: pointer events (touch + mouse) ---- */
function bindDrag(el){
  let x0,y0,dx=0,dy=0,on=false,moved=false;
  const kS=el.querySelector('.stamp.keep'),pS=el.querySelector('.stamp.pass');
  el.addEventListener('pointerdown',e=>{if(busy)return;on=true;moved=false;x0=e.clientX;y0=e.clientY;dx=dy=0;el.setPointerCapture(e.pointerId);el.classList.remove('anim')});
  el.addEventListener('pointermove',e=>{if(!on)return;dx=e.clientX-x0;dy=e.clientY-y0;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;
    el.style.transform=`translate(${dx}px,${Math.min(dy,0)*.5+Math.max(dy,0)*.3}px) rotate(${dx/18}deg)`;
    kS.style.opacity=Math.max(0,Math.min(1,dx/110));pS.style.opacity=Math.max(0,Math.min(1,-dx/110))});
  const end=()=>{if(!on)return;on=false;
    const T=Math.min(110,innerWidth*.26);
    if(dx>T){act('keep');fly(el,'keep',dx,dy)}
    else if(dx<-T){act('pass');fly(el,'pass',dx,dy)}
    else{el.classList.add('anim');el.style.transform='';kS.style.opacity=0;pS.style.opacity=0;
      if(dy<-90&&Math.abs(dx)<T)openPiece(el.dataset.id);
      else if(dy>110&&Math.abs(dx)<T)undo();
      else if(!moved)openPiece(el.dataset.id)}};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}

/* ---- profile (dating-app style, opens on tap / swipe up) ---- */
let cur=null, fi=0;
const PR=$('#profile'), SC=$('#prScroll');
function workdays(from,n){const d=new Date(from);let k=0;while(k<n){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)k++}return d}
const fmt=d=>d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
function zone(pin){if(!/^[1-8]\d{5}$/.test(pin))return null;const p2=pin.slice(0,2),p3=+pin.slice(0,3);
  if(p3>=342&&p3<=345||p2==='34'||p2==='30'||p2==='31'||p2==='32'||p2==='33')return {n:'Rajasthan',t:[1,3]};
  if(['11','40','41','56','60','70','50'].includes(p2))return {n:'metro',t:[3,5]};return {n:'rest of India',t:[4,7]}}
function eta(p,pin){const z=zone(pin);if(!z)return null;const big=p.size==='large',d=big?[7,15]:[3,7],now=new Date();
  const l1=workdays(now,d[0]),l2=workdays(now,d[1]),a1=new Date(l1),a2=new Date(l2);a1.setDate(a1.getDate()+z.t[0]);a2.setDate(a2.getDate()+z.t[1]);
  return `Leaves Jodhpur ${fmt(l1)}–${fmt(l2)}${big?', crated':''}. Reaches you about <em>${fmt(a1)} – ${fmt(a2)}</em>. <span style="color:#8a7d70;font-size:12px">Transit days are a sample.</span>`}
const ANS={size:p=>p.h?`About ${p.h.replace(' est.','')} high${p.h.includes('~')?' (an estimate until measured)':''}.`:`Measurements coming soon. Ask us on WhatsApp.`,
  made:p=>`${p.craft}, made by hand in Jodhpur.`,see:p=>`Walk into our Jodhpur showroom, open daily 10–7, or ask for a video call on WhatsApp 90012 91131.`};
function showFrame(n){const f=cur.frames;fi=(n+f.length)%f.length;
  PR.querySelectorAll('.pr-frames figure').forEach((x,k)=>x.classList.toggle('on',k===fi));
  PR.querySelectorAll('.pr-segs i').forEach((x,k)=>{x.className=k<fi?'done':k===fi?'on':''});
  $('#prLabel').textContent=f[fi].label}
function openPiece(id){
  const p=byId[id]; if(!p)return; cur=p; fi=0;
  feats(p).forEach(k=>S.w[k]=(S.w[k]||0)+.4);
  $('#prFrames').innerHTML=p.frames.map((f,k)=>`<figure style="background:${f.fit==='contain'&&p.kind==='ai'&&f.src===p.img?`linear-gradient(${p.bgt},${p.bgt} 22%,${p.bgb} 78%,${p.bgb})`:f.bg}"><img src="${f.src}" alt="${p.name}: ${f.label}" style="object-fit:${f.fit}" ${k?'loading="lazy"':''}></figure>`).join('');
  $('#prSegs').innerHTML=p.frames.map(()=>'<i></i>').join('');
  $('#prName').textContent=p.name; $('#prTag').textContent=p.tagline.slice(p.tagline.indexOf(',')+2).replace(/^./,c=>c.toUpperCase());
  $('#prBio').textContent=p.bio; $('#prFacts').innerHTML=p.facts.map(f=>`<span>${f}</span>`).join('');
  $('#prPairs').innerHTML=p.pairs.map(o=>`<button data-id="${o}" aria-label="Open ${byId[o].name}"><img src="${byId[o].img}" alt="">${byId[o].name}</button>`).join('');
  $('#prCare').textContent=p.care; $('#prFull').href=`pieces/${p.id}.html`;
  $('#prMore').open=false; $('#prAnswer').textContent=''; PR.querySelectorAll('.pr-ask button').forEach(b=>b.classList.remove('on'));
  const pin=store.get('pin','');$('#prPin').value=pin;$('#prPinRes').innerHTML=pin?eta(p,pin)||'':'';
  syncKeep(); showFrame(0); PR.classList.remove('closing'); PR.hidden=false; SC.scrollTop=0;
  $('#prKeep').focus({preventScroll:true}); say(`${p.name}. ${p.tagline}. Profile open.`);
}
function syncKeep(){const k=$('#prKeep'),on=cur&&S.board.includes(cur.id);k.classList.toggle('done',!!on);k.setAttribute('aria-label',on?'On your Board':'Keep on Board');k.textContent=on?'♥':'♡'}
function closePiece(cb){if(PR.hidden){cb&&cb();return}PR.classList.add('closing');setTimeout(()=>{PR.hidden=true;PR.classList.remove('closing');cur=null;cb&&cb()},cb?260:280)}
function profileDecide(kind){ if(!cur)return; const id=cur.id;
  if(S.order[0]===id){closePiece(()=>kind==='keep'?keep():pass());return}
  if(kind==='keep'&&!S.board.includes(id)){S.board.push(id);persist();render();syncKeep();say(`Kept ${cur.name}.`);return}
  closePiece();
}
$('#prKeep').onclick=()=>profileDecide('keep'); $('#prPass').onclick=()=>profileDecide('pass');
$('#prClose').onclick=()=>closePiece();
$('#prAskBtn').onclick=()=>{$('#prMore').open=true;$('#prAskH').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>PR.querySelector('.pr-ask button').focus({preventScroll:true}),350)};
$('#prPrev').onclick=()=>showFrame(fi-1); $('#prNext').onclick=()=>showFrame(fi+1);
$('#prPairs').onclick=e=>{const b=e.target.closest('button[data-id]');if(b)openPiece(b.dataset.id)};
$('#prAsk').onclick=e=>{const b=e.target.closest('button');if(!b||!cur)return;PR.querySelectorAll('.pr-ask button').forEach(x=>x.classList.toggle('on',x===b));$('#prAnswer').textContent=ANS[b.dataset.q](cur)};
const pinGo=()=>{const v=$('#prPin').value.trim(),r=eta(cur,v);$('#prPinRes').innerHTML=r||'Enter a 6-digit Indian PIN. We ship within India only.';if(r)store.set('pin',v)};
$('#prPinGo').onclick=pinGo; $('#prPin').addEventListener('keydown',e=>{if(e.key==='Enter')pinGo()});
// drag on the hero: swipe down (at top) closes; horizontal swipe steps photos
(()=>{const H=$('#prHero');let x0,y0,on=false,lastPtr=0;
  H.addEventListener('pointerdown',e=>{if(e.target.closest('.pr-close'))return;on=true;x0=e.clientX;y0=e.clientY});
  H.addEventListener('pointermove',e=>{if(!on||SC.scrollTop>0)return;const dy=e.clientY-y0;if(dy>0&&Math.abs(dy)>Math.abs(e.clientX-x0)){PR.style.transform=`translateY(${dy*.6}px)`}});
  const end=e=>{if(!on)return;on=false;lastPtr=Date.now();const dx=e.clientX-x0,dy=e.clientY-y0;PR.style.transform='';
    if(dy>90&&SC.scrollTop<=0&&Math.abs(dy)>Math.abs(dx)){e.preventDefault();closePiece();return}
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){showFrame(fi+(dx<0?1:-1));return}};
  H.addEventListener('pointerup',end);
  // touch fallback: the browser may take over vertical pans (pointercancel), so read touches too
  let t0=null;H.addEventListener('touchstart',e=>{const t=e.touches[0];t0={x:t.clientX,y:t.clientY,top:SC.scrollTop}},{passive:true});
  H.addEventListener('touchend',e=>{if(!t0)return;if(Date.now()-lastPtr<400){t0=null;return}const t=e.changedTouches[0],dx=t.clientX-t0.x,dy=t.clientY-t0.y;
    if(t0.top<=0&&dy>90&&Math.abs(dy)>Math.abs(dx))closePiece();
    else if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))showFrame(fi+(dx<0?1:-1));t0=null},{passive:true});H.addEventListener('pointercancel',()=>{on=false;PR.style.transform=''});
  // edge buttons only respond to real taps (not the end of a drag)
  ['#prPrev','#prNext'].forEach(s=>$(s).addEventListener('click',e=>{if(Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12){e.stopImmediatePropagation()}},true));
})();

/* ---- Board / end of deck ---- */
function openBoard(end){
  const items=S.board.map(id=>byId[id]).filter(Boolean), big=items.filter(p=>p.size==='large'), small=items.length-big.length;
  $('#beyebrow').textContent=end?'That was every piece':'Your Board';
  $('#bh').textContent=items.length?`${items.length} piece${items.length>1?'s':''} kept`:'Nothing kept yet';
  $('#bline').textContent=!items.length?'Swipe right on anything you love.':
    big.length&&small?`${small} can ship as parcels. For ${big.length} large, we'll call to plan delivery.`:
    big.length?`We'll call you to plan delivery for the large piece${big.length>1?'s':''}.`:'All of these ship as padded parcels.';
  $('#thumbs').innerHTML=items.length?items.map(p=>`<button class="${p.size==='large'?'big':''}" data-id="${p.id}" aria-label="${p.name}"><img src="${p.img}" alt=""></button>`).join(''):'<p class="empty">Your Board is empty.</p>';
  $('#buyBtn').hidden=!items.length; $('#buyBtn').textContent=big.length&&!small?'Reserve with a video call':'Buy';
  const msg=`Namaste Craftstales, I'd like to ask about: ${items.map(p=>p.name).join(', ')||'your pieces'}`;
  $('#waLink').href='https://wa.me/919001291131?text='+encodeURIComponent(msg);
  $('#again').textContent=end?'Start again':'Keep swiping'; $('#again').dataset.end=end?'1':'';
  $('#stub').textContent=''; $('#board').hidden=false; $('#bclose').focus({preventScroll:true});
}
function closeBoard(){$('#board').hidden=true}
$('#boardBtn').onclick=()=>openBoard(false);
$('#bclose').onclick=()=>{closeBoard();if(!S.order.length)restart()};
$('#again').onclick=()=>{if($('#again').dataset.end)restart();else closeBoard()};
$('#thumbs').onclick=e=>{const b=e.target.closest('button[data-id]');if(b){closeBoard();openPiece(b.dataset.id)}};
$('#buyBtn').onclick=()=>{$('#stub').textContent=`Prototype: this would open the Shopify cart with ${S.board.length} piece${S.board.length>1?'s':''} via a cart permalink.`};
function restart(){closeBoard();S.order=initialOrder();S.hist=[];S.swipes=0;S.noted=false;if(!S.order.length){S.order=ALL.map(p=>p.id).filter(id=>!S.board.includes(id))}render()}

/* ---- welcome (one tap) ---- */
function start(room){S.room=room;store.set('room',room);if(room)S.w['r:'+room]=2;$('#welcome').hidden=true;S.order=initialOrder();S.hist=[];render();
  if(S.hinted)$('#hint').classList.add('off');
  const want=location.hash.slice(1); if(want&&byId[want]){S.order=[want,...S.order.filter(i=>i!==want)];render();openPiece(want)}}
$('#welcome').addEventListener('click',e=>{const b=e.target.closest('button[data-room]');if(b)start(b.dataset.room)});
$('#roomBtn').onclick=()=>{$('#welcome').hidden=false};

/* ---- buttons + keyboard ---- */
$('#keepBtn').onclick=keep;$('#passBtn').onclick=pass;$('#undoBtn').onclick=undo;
addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea'))return;
  if(e.key==='Escape'){if(!PR.hidden)closePiece();else if(!$('#board').hidden)closeBoard();else if(!$('#welcome').hidden&&S.order.length)$('#welcome').hidden=true;return}
  if(!$('#welcome').hidden)return;
  if(!PR.hidden){const k=e.key.toLowerCase();
    if(e.key==='ArrowLeft'){e.preventDefault();showFrame(fi-1)}else if(e.key==='ArrowRight'){e.preventDefault();showFrame(fi+1)}
    else if(e.key==='ArrowDown'&&SC.scrollTop<=0&&!e.target.closest('.pr-body')){e.preventDefault();closePiece()}
    else if(k==='k'){profileDecide('keep')}else if(k==='x'){profileDecide('pass')}
    return}
  if(!$('#board').hidden)return;
  const k={ArrowRight:keep,ArrowLeft:pass,ArrowUp:()=>S.order[0]&&openPiece(S.order[0]),ArrowDown:undo}[e.key];
  if(k){e.preventDefault();k()}
  if(e.key==='b'||e.key==='B')openBoard(false);
});

/* ---- boot ---- */
if(S.room!==null&&!new URLSearchParams(location.search).has('welcome'))start(S.room); else {$('#welcome').hidden=false}
window.__ct={S,keep,pass,undo,openPiece,openBoard,relearn,tasteLine};
})();
