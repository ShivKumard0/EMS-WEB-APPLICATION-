/* ══ EXPENSE CLAIM: "ARE YOU SURE YOU WANT TO SUBMIT?" (product owner, 14 Nov 2026) ════════════════════════════════
   Submit on an expense claim - Submit for Approval in the New Request form, or submitting a draft from its Logs or the
   row's Action menu - first opens a confirmation popup: a tick, the question, the claim's total and its items (each
   with its category and amount). Cancel goes back with nothing lost; Yes, Submit submits exactly as before.
   No wallet balance (product owner, 14 Nov 2026: "remove the wallet balance … as it is claims").
   - The form's own checks run first, so the popup opens only for a claim that can be submitted.
   - Not shown while the presentation prepares its data, nor for claims the mobile app sends (js/ems-sync.js): the
     employee already confirmed those on the phone.
   - Advances are submitted as before, without the popup. */
(function(){
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s==null?'':s);};
  const money=function(v,c){return typeof expMoney==='function'?expMoney(v,c||'INR'):String(v);};
  const skip=function(){return (typeof presBuilding!=='undefined'&&presBuilding)||!!window.emsNoConfirm;};
  /* ── The popup ── */
  let C=null;   // {eid, name, cur, items:[{title, category, subCat, amount}], go}
  const root=function(){let el=document.getElementById('ems-subconf-root');if(!el){el=document.createElement('div');el.id='ems-subconf-root';document.body.appendChild(el);}return el;};
  const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  /* A confirmation step (product owner, 14 Nov 2026: "make it like a confirmation … a little bit pop"): a tick, the
     question, a summary strip with the total and the items, in the app's own colours (the status tones) and parts
     (modal, table, buttons). */
  const TICK='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const CAP='font-size:10.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#6b7280';
  function html(){
    const total=C.items.reduce(function(s,l){return s+(parseFloat(l.amount)||0);},0);
    const who=(typeof idEmpName==='function'&&C.eid?idEmpName(C.eid):'')||C.name||'';
    const rows=C.items.map(function(l){
      const cat=l.category||'';
      return '<tr>'
        +'<td class="csag-td"><div class="lp-c-main">'+esc(l.title||'Item')+'</div></td>'
        +'<td class="csag-td">'+esc(cat+(l.subCat?' / '+l.subCat:''))+'</td>'
        +'<td class="csag-td" style="text-align:right;white-space:nowrap;font-weight:600">'+money(parseFloat(l.amount)||0,C.cur)+'</td>'
        +'</tr>';
    }).join('');
    const n=C.items.length;
    return '<div class="ct-modal-overlay" style="z-index:2000" onclick="emsSubConfClose()">'
      +'<div class="ct-modal" style="width:min(860px,95vw)" role="dialog" aria-modal="true" aria-label="Confirm submission" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr" style="align-items:flex-start"><div style="display:flex;align-items:center;gap:14px">'
        +'<span style="width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--st-ok-bg,#dcfce7);border:1px solid var(--st-ok-bd,#86efac);color:var(--st-ok-fg,#16a34a)">'+TICK+'</span>'
        +'<div><span class="ct-modal-title">Are you sure you want to submit?</span>'
        +'<div style="font-size:13px;color:#6b7280;margin-top:3px">Check the items below. Once submitted, the claim goes for approval.</div></div></div>'
        +'<button class="ct-modal-close" onclick="emsSubConfClose()" aria-label="Close">'+X+'</button></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 16px;margin:16px 0 14px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#f8fafc">'
        +'<div><div style="'+CAP+'">Expense Claim</div><div style="font-size:13.5px;color:var(--navy,#0f172a);margin-top:4px">'+esc(n+' item'+(n===1?'':'s')+(who?' · '+who:''))+'</div></div>'
        +'<div style="text-align:right"><div style="'+CAP+'">Total claim amount</div><div style="font-size:22px;line-height:28px;font-weight:700;color:var(--navy,#0f172a);margin-top:2px">'+money(total,C.cur)+'</div></div>'
      +'</div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Item</th><th>Category / Sub Category</th><th style="text-align:right">Amount</th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="emsSubConfClose()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="emsSubConfGo()">Yes, Submit</button></div></div>'
      +'</div></div>';
  }
  const paint=function(){root().innerHTML=C?html():'';};
  function open(o){C=o;paint();}
  window.emsSubConfClose=function(){C=null;paint();};
  window.emsSubConfGo=function(){const go=C&&C.go;C=null;paint();if(go)go();};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&C)window.emsSubConfClose();});
  /* ── 1 · Submit for Approval in the New Request form ── */
  if(typeof submitAddExpense==='function'){
    const s0=submitAddExpense;
    let pass=false;
    submitAddExpense=function(submit){
      if(!submit||pass||skip()||typeof expDraft==='undefined'||!expDraft)return s0.apply(this,arguments);
      const self=this,args=arguments;
      /* The form's own checks, in the form's own order; nothing is changed by running them. */
      expSyncBasic();expSyncLine();
      const d=expDraft;
      const title=String(d.title||'').trim()||(function(){
        const ls=d.lines.concat(expLineTouched(d.line)?[d.line]:[]).filter(function(l){return String(l.title||'').trim();});
        return ls.length?String(ls[0].title).trim():(d.category||'Expense claim');})();
      if(!expCheckBasic(Object.assign({},d,{title:title})))return;
      if(!expCheckClaimFor(d))return;
      const items=d.lines.slice();
      if(expLineTouched(d.line)||!items.length){
        if(!expWithLine(function(){return expCheckLine(d.line,d.line.category||d.category);}))return;
        items.push(d.line);
      }
      const bad=items.find(function(l){return (EXP_SUBCATS[l.category||d.category]||[]).indexOf(l.subCat)<0;});
      if(bad)return s0.apply(self,args);   // the form says what is wrong
      if(typeof epGate==='function'){
        const g=epGate({eid:d.eid,name:d.name,category:d.category,currency:d.currency,lines:items,claimId:null},d.just);
        if(g)return s0.apply(self,args);   // the form says what is wrong
      }
      open({eid:d.eid,name:d.claimFor==='Others'?(d.name||''):'',cur:d.currency||'INR',
        items:items.map(function(l){return {title:l.title,category:l.category||d.category,subCat:l.subCat,amount:l.amount};}),
        go:function(){pass=true;try{s0.apply(self,args);}finally{pass=false;}}});
    };
  }
  /* ── 2 · Submitting a draft (Logs, or the row's Action menu) ── */
  if(typeof caLogMove==='function'){
    const m0=caLogMove;
    let pass=false;
    caLogMove=function(id,to){
      const r=typeof expRec==='function'?expRec(Number(id)):null;
      if(pass||skip()||to!=='Awaiting Approval'||!r||r.status!=='Draft'||(typeof caCanSubmit==='function'&&!caCanSubmit(r)))return m0.apply(this,arguments);
      const self=this,args=arguments;
      open({eid:r.employeeEid,name:r.claimFor==='Others'?(r.name||''):'',cur:r.currency||'INR',
        items:r.lines.map(function(l){return {title:l.title,category:l.category||r.category,subCat:l.subCat,amount:l.amount};}),
        go:function(){pass=true;try{m0.apply(self,args);}finally{pass=false;}}});
    };
  }
})();
