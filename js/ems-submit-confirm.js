/* ══ EXPENSE CLAIM: "ARE YOU SURE YOU WANT TO SUBMIT?" (product owner, 14 Nov 2026) ════════════════════════════════
   Submit on an expense claim - Submit for Approval in the New Request form, or submitting a draft from its Logs or the
   row's Action menu - first opens a summary: every item with its category and amount and, beside it, the employee's
   current balance in the wallet that category belongs to. Cancel goes back with nothing lost; Submit submits exactly
   as before. Information only: nothing is blocked by a balance.
   - The wallet column shows only in a company that uses wallets (Wallet & Benefits has an active wallet).
   - Category → wallet: Meal Allowance → Meal, Fuel Reimbursement → Fuel, Telephone & Internet → Telecom; Travel
     Reimbursement, Accommodation, Team Outing, Office Events and Office Stationery → Corporate Expense; Books & Learning
     has no wallet. Each reads as "Meal wallet · 506 INR available"; a wallet the employee's card does not carry reads
     "not on the card".
   - The form's own checks run first, so the summary opens only for a claim that can be submitted.
   - Not shown while the presentation prepares its data, nor for claims the mobile app sends (js/ems-sync.js): the
     employee already confirmed those on the phone.
   - Advances are submitted as before, without the summary. */
(function(){
  const CAT_WALLET={'Meal Allowance':'MEAL','Fuel Reimbursement':'FUEL','Telephone & Internet':'TEL',
    'Travel Reimbursement':'CORP','Accommodation':'CORP','Team Outing':'CORP','Office Events':'CORP','Office Stationery':'CORP',
    'Books & Learning':''};
  window.EMS_CAT_WALLET=CAT_WALLET;
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s==null?'':s);};
  const money=function(v,c){return typeof expMoney==='function'?expMoney(v,c||'INR'):String(v);};
  const skip=function(){return (typeof presBuilding!=='undefined'&&presBuilding)||!!window.emsNoConfirm;};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const usesWallets=function(){
    const e=ent();
    return typeof wbWallets!=='undefined'&&wbWallets.some(function(w){return w.entity===e&&w.status==='Active';});
  };
  const walletName=function(code){return typeof wbTypeName==='function'?wbTypeName(code):code;};
  /* {text, tone} for one category of one employee. */
  function walletCell(eid,category){
    if(!Object.prototype.hasOwnProperty.call(CAT_WALLET,category)||!CAT_WALLET[category])return {text:'No wallet',muted:true};
    const code=CAT_WALLET[category],e=ent();
    const cards=(typeof ccCardsOfEmp==='function'?ccCardsOfEmp(eid):[]).filter(function(c){
      return c.entity===e&&!(typeof ccCardEnded==='function'&&ccCardEnded(c));});
    const card=cards.find(function(c){return (typeof ccCardWallets==='function'?ccCardWallets(c):[]).indexOf(code)>=0;});
    if(!card)return {text:walletName(code)+' wallet · not on the card',muted:true};
    const w=(typeof emsLedgerWallets==='function'?emsLedgerWallets(eid):{})[code];
    return {text:walletName(code)+' wallet · '+money(w?w.available:0,card.currency)+' available'};
  }
  window.emsWalletCell=walletCell;
  /* ── The popup ── */
  let C=null;   // {eid, name, cur, items:[{title, category, subCat, amount}], go}
  const root=function(){let el=document.getElementById('ems-subconf-root');if(!el){el=document.createElement('div');el.id='ems-subconf-root';document.body.appendChild(el);}return el;};
  const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  function html(){
    const wal=usesWallets(),total=C.items.reduce(function(s,l){return s+(parseFloat(l.amount)||0);},0);
    const rows=C.items.map(function(l){
      const cat=l.category||'',w=wal?walletCell(C.eid,cat):null;
      return '<tr>'
        +'<td class="csag-td"><div class="lp-c-main">'+esc(l.title||'Item')+'</div></td>'
        +'<td class="csag-td">'+esc(cat+(l.subCat?' / '+l.subCat:''))+'</td>'
        +'<td class="csag-td" style="text-align:right;white-space:nowrap">'+money(parseFloat(l.amount)||0,C.cur)+'</td>'
        +(wal?'<td class="csag-td" style="white-space:nowrap'+(w.muted?';color:var(--muted-fg,#64748b)':'')+'">'+esc(w.text)+'</td>':'')
        +'</tr>';
    }).join('');
    const n=C.items.length;
    return '<div class="ct-modal-overlay" style="z-index:2000" onclick="emsSubConfClose()">'
      +'<div class="ct-modal" style="width:min(820px,95vw)" role="dialog" aria-modal="true" aria-label="Confirm submission" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><span class="ct-modal-title">Are you sure you want to submit?</span><button class="ct-modal-close" onclick="emsSubConfClose()" aria-label="Close">'+X+'</button></div>'
      +'<p class="ct-modal-sub">'+esc('Expense Claim · '+n+' item'+(n===1?'':'s')+' · '+money(total,C.cur)+(C.name?' · '+C.name:''))+'</p>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Item</th><th>Category / Sub Category</th><th style="text-align:right">Amount</th>'
        +(wal?'<th>Wallet Balance</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="emsSubConfClose()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="emsSubConfGo()">Submit</button></div></div>'
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
