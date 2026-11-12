/* ══ NO "ILLUSTRATIVE" ON SCREEN (product owner, 9 Nov 2026) ══════════════
   The product owner chose to remove the word "Illustrative" from every screen
   of the application. Records keep their source underneath - the data, the
   audit trail and CSV exports are unchanged - only what is shown changes:
   - a label or badge that only says "Illustrative" is hidden;
   - in other text the word is hidden ("Paid · Illustrative" reads "Paid",
     "ILLUSTRATIVE-RMB-1006-S1" reads "RMB-1006-S1");
   - a short note that only explains illustrative activity is hidden;
   - in the presentation, a Confirmation Source field fills in the simulated
     source by itself and is hidden.
   Hidden text stays in the page (display:none), so nothing a record says is
   lost. */
(function(){
  const RX=/( · Illustrative \(presentation\): selected through Switch Role, not a genuine independent approval|\s*\(Illustrative[^)]*\)|\s*This reimbursement is illustrative and is not externally verified card spending\.|ILLUSTRATIVE-|\s*[·–-]\s*Illustrative\b|\s*\(Illustrative\)|\ban illustrative\b|\billustrative\s+|\billustrative\b)/gi;
  const EXACT=/^(Illustrative|Illustrative mode|Illustrative Mode|Illustrative statement|Illustrative Loads)$/;
  const NOTE_SEL='.wb-note, .ea-hint, .wb-note-sub, .csa-hint';
  const SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1,SELECT:1,NOSCRIPT:1};
  function hide(el){if(el&&el.style&&el.style.display!=='none')el.style.display='none';}
  function scrubText(t){
    const p=t.parentNode;if(!p||SKIP[p.nodeName]||(p.classList&&p.classList.contains('ems-ill'))||outside(p))return;
    const s=t.nodeValue;RX.lastIndex=0;if(!RX.test(s))return;RX.lastIndex=0;
    const frag=document.createDocumentFragment();let at=0,m;
    while((m=RX.exec(s))){
      if(m.index>at)frag.appendChild(document.createTextNode(s.slice(at,m.index)));
      let vis='';
      if(/^an illustrative$/i.test(m[0]))vis=m[0][0]==='A'?'A':'a';   // "an illustrative card" → "a card"
      if(vis)frag.appendChild(document.createTextNode(vis));
      const h=document.createElement('span');h.className='ems-ill';h.style.display='none';h.textContent=vis?m[0].slice(vis.length):m[0];frag.appendChild(h);
      at=m.index+m[0].length;
    }
    if(at<s.length)frag.appendChild(document.createTextNode(s.slice(at)));
    p.replaceChild(frag,t);
    emptyShell(p);
  }
  function emptyShell(el){
    for(let k=0;el&&k<3;k++,el=el.parentElement){
      if(!el.className||typeof el.className!=='string'||!/badge|tag|pill|chip|status/i.test(el.className))continue;
      const shown=[].some.call(el.childNodes,function(c){return c.nodeType===3?c.nodeValue.trim():c.nodeType===1&&c.style.display!=='none'&&(c.textContent||'').trim();});
      if(!shown)hide(el);
      return;
    }
  }
  /* Test and probe result panels are not application screens. */
  const OUTSIDE='#wb-test-out, #probe-out, #snap-holder';
  function outside(n){const e=n&&(n.nodeType===1?n:n.parentNode);return !!(e&&e.closest&&e.closest(OUTSIDE));}
  function scrub(root){
    if(!root||root.nodeType!==1&&root.nodeType!==3)return;
    if(outside(root))return;
    if(root.nodeType===3){if(/llustrative/i.test(root.nodeValue))scrubText(root);return;}
    if(SKIP[root.nodeName]||root.classList&&root.classList.contains('ems-ill'))return;
    if(!/llustrative/i.test(root.textContent||''))return;
    /* Notes that only explain illustrative activity. */
    const notes=root.matches&&root.matches(NOTE_SEL)?[root]:[];
    root.querySelectorAll&&root.querySelectorAll(NOTE_SEL).forEach(function(n){notes.push(n);});
    notes.forEach(function(n){const t=(n.textContent||'').replace(/\s+/g,' ').trim();if(/illustrative/i.test(t)&&t.length<320&&!n.querySelector('button, input, a.att-link'))hide(n);});
    /* Labels that only say Illustrative; the demo-mode row. */
    const els=[].slice.call(root.querySelectorAll?root.querySelectorAll('span, b, div, td, button, label, a'):[]);
    if(root.matches&&root.matches('span, b, div, td, button, label, a'))els.unshift(root);
    els.forEach(function(el){
      if(el.children.length)return;const t=(el.textContent||'').trim();if(!EXACT.test(t))return;
      hide(el.closest('.cs-option')||el);   // a choice that only says Illustrative goes with its row
    });
    if(root.matches&&root.matches('.cc-demo-row, #pres-ill-pill'))hide(root);
    root.querySelectorAll&&root.querySelectorAll('.cc-demo-row, #pres-ill-pill').forEach(hide);
    /* Everything else: the word itself. */
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){return /llustrative/i.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;}});
    const list=[];let n;while((n=w.nextNode()))list.push(n);
    list.forEach(scrubText);
  }
  /* The presentation: the simulated confirmation source is the only one, so it fills itself in. */
  const SRC={'caa-csrc':['Illustrative','caActHook'],'adva-csrc':['Illustrative','advActHook'],'fbx-csrc':['Illustrative','fbTxnHook'],
    'cca-source':['Illustrative','ccActHook'],'cclx-source':['Illustrative','ccLxHook']};
  function autoSource(root){
    if(typeof PRES_ON==='undefined'||!PRES_ON||!root.querySelectorAll)return;
    Object.keys(SRC).forEach(function(id){
      const w=document.getElementById('csw-'+id);if(!w||!root.contains(w))return;
      const grp=w.closest('.ep-form-group');if(grp)hide(grp);
      const v=w.querySelector('.cs-value'),tr=w.querySelector('.cs-trigger');
      if(!v||v.textContent===SRC[id][0])return;
      const opt=[].some.call(w.querySelectorAll('.cs-option, [data-value]'),function(o){return (o.textContent||'').trim()===SRC[id][0]||o.getAttribute('data-value')===SRC[id][0];});
      if(!opt&&!/Illustrative/.test(w.innerHTML))return;   // not offered here
      v.textContent=SRC[id][0];if(tr)tr.classList.remove('cs-placeholder');
      const hook=window[SRC[id][1]];if(typeof hook==='function')setTimeout(function(){try{hook();}catch(e){}},0);
    });
  }
  let busy=false;
  const mo=new MutationObserver(function(muts){
    if(busy)return;busy=true;
    try{
      muts.forEach(function(m){
        if(m.type==='characterData'){scrub(m.target);return;}
        m.addedNodes.forEach(function(n){scrub(n);if(n.nodeType===1)autoSource(n);});
      });
    }finally{busy=false;}
  });
  function start(){scrub(document.body);autoSource(document.body);mo.observe(document.body,{childList:true,subtree:true,characterData:true});}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
