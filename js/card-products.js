/* ══ CORPORATE CARDS → CARDS (THE CARD ITSELF): NOVA X RBL MULTIWALLET CARD (product owner, 13 Nov 2026) ══════════
   "make another Cards option in Corporate Cards under the existing Cards; one line item named NOVA X RBL Multiwallet
   Card with a few details; in the action button the first tab shows the card image and below it the details (named
   Details), the next tab Wallets - the wallet names with On or Off and an Edit button - then Logs, then Workflow."
   Product owner's choices (13 Nov 2026): the menu item is named "Cards" (a second one, right under the existing Cards,
   which lists the cards issued to people); the Wallets switches are DISPLAY ONLY - saved here and logged, but issued
   cards, balances and Wallet & Benefits are not changed. Who sees it: the people who see Corporate Cards' admin view;
   Super Admin and Company Admin change wallets and status. In the presentation, Nova Retail has the one card. */

/* entity → {id, code, name, bank, network, type, form, currency, kyc, validity, fee, launched, status, wallets:{CODE:bool}, logs:[]}.
   Top-level so the presentation keeps it (tools/gen-pres-names.js). */
const ccpBook={};

(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const PG='card-products',PGL='card-list-all';
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const rec=function(){return ccpBook[ent()]||null;};
  const badge=function(tone,t){return typeof axBadge==='function'?axBadge(tone,t):E(t);};
  const can=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;};
  const walletsOf=function(e){
    if(typeof wbWallets==='undefined')return [];
    return wbWallets.filter(function(w){return w.entity===e&&w.status==='Active';})
      .sort(function(a,b){return ((a.type==='CORP')-(b.type==='CORP'))||(a.id-b.id);})
      .map(function(w){return [w.type,typeof wbTypeName==='function'?wbTypeName(w.type):w.type];});
  };
  const issued=function(e){return typeof ccCards!=='undefined'?ccCards.filter(function(c){return c.entity===e&&typeof ccCardUsable==='function'&&ccCardUsable(c);}).length:0;};
  const programme=function(e){
    const ps=typeof ccProgAll==='function'?ccProgAll().filter(function(p){return p.entity===e;}):[];
    return ps.find(function(p){return /multi/i.test(p.name||'')||/MULTI/.test(p.key||'');})||ps[0]||null;
  };
  const onList=function(r){return walletsOf(r.entity).filter(function(w){return r.wallets[w[0]]!==false;});};
  const stamp=function(){const s=typeof stampNow==='function'?stampNow():{date:new Date().toLocaleDateString(),time:''};return s;};
  const actor=function(){return typeof wbActor==='function'?wbActor():(typeof CURRENT_USER!=='undefined'?CURRENT_USER:'');};
  const log=function(r,status,text){const s=stamp();r.logs.unshift({date:s.date,time:s.time,user:actor(),status:status,action:text});if(typeof presSaveSoon==='function')presSaveSoon();};

  /* ── Nova Retail's card, set up once ── */
  function seed(){
    if(typeof PRES_ON==='undefined'||!PRES_ON||typeof presNova!=='function')return;
    if(typeof presBuilding!=='undefined'&&presBuilding)return;
    const n=presNova();if(!n)return;const e=n.entityId||n.id;
    if(ccpBook[e])return;
    const ws={};walletsOf(e).forEach(function(w){ws[w[0]]=true;});
    const names=walletsOf(e).map(function(w){return w[1];}).join(', ');
    ccpBook[e]={id:1001,entity:e,code:'CPR-1001',name:'OpenDhi x RBL',bank:'RBL Bank',network:'RuPay',type:'Prepaid · Multi-wallet',
      form:'Physical and Virtual',currency:'INR',kyc:'Full KYC (Aadhaar and PAN)',validity:'5 years from issue',fee:'Nil',launched:'01 Apr 2026',status:'Active',wallets:ws,
      logs:[
        {date:'05 Apr 2026',time:'11:20:14 AM',user:'Karan Shah',status:'Active',action:'Activated with RBL Bank: cards can be issued to Opendhi employees.'},
        {date:'02 Apr 2026',time:'03:42:08 PM',user:'Rohan Mehta',status:'Approved',action:'Approved by Finance: fees, load limits and the funding account checked.'},
        {date:'01 Apr 2026',time:'10:05:37 AM',user:'Karan Shah',status:'Draft',action:'Card created: OpenDhi x RBL with RBL Bank (RuPay, prepaid multi-wallet); wallets '+names+' switched on.'}]};
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  window.addEventListener('load',function(){
    if(typeof PRES_READY!=='undefined'&&PRES_READY&&PRES_READY.then)PRES_READY.then(function(){try{seed();}catch(err){if(typeof console!=='undefined')console.warn('card product',err);}});
  });

  /* ── Look ── */
  (function(){
    if(document.getElementById('nxc-style'))return;
    const st=document.createElement('style');st.id='nxc-style';
    st.textContent='.nxc-card{position:relative;width:100%;max-width:360px;aspect-ratio:1.586;border-radius:18px;padding:20px 22px;color:#fff;overflow:hidden;margin:4px auto 18px;'
        +'background:radial-gradient(120% 140% at 100% 0%,#d71f3a 0%,rgba(215,31,58,0) 46%),linear-gradient(135deg,#0b1d39 0%,#14325e 58%,#1d4677 100%);'
        +'box-shadow:0 14px 30px rgba(11,29,57,.28),inset 0 1px 0 rgba(255,255,255,.12);font-family:inherit}'
      +'.nxc-card:after{content:"";position:absolute;right:-60px;bottom:-80px;width:230px;height:230px;border-radius:50%;border:28px solid rgba(255,255,255,.05)}'
      +'.nxc-top{display:flex;justify-content:space-between;align-items:flex-start}'
      +'.nxc-brand{font-weight:800;font-size:18px;letter-spacing:.06em}.nxc-brand span{font-weight:500;opacity:.8;margin:0 6px}'
      +'.nxc-bank{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-top:3px}'
      +'.nxc-type{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.75;text-align:right}'
      +'.nxc-chip{width:44px;height:33px;border-radius:7px;margin-top:22px;background:linear-gradient(135deg,#f6dd8f,#c9a24a 55%,#f1d27a);position:relative;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}'
      +'.nxc-chip:before{content:"";position:absolute;inset:7px 10px;border:1px solid rgba(80,60,10,.35);border-radius:4px}'
      +'.nxc-wave{position:absolute;left:78px;top:83px;width:22px;height:22px;opacity:.8}'
      +'.nxc-num{font-size:17px;letter-spacing:.16em;margin-top:16px;font-weight:600;text-shadow:0 1px 1px rgba(0,0,0,.25)}'
      +'.nxc-foot{position:absolute;left:22px;right:22px;bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}'
      +'.nxc-lab{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;opacity:.65}.nxc-val{font-size:12px;font-weight:600;letter-spacing:.06em;margin-top:2px}'
      +'.nxc-net{font-style:italic;font-weight:800;font-size:19px;letter-spacing:.02em}.nxc-net b{color:#f4a51c}'
      +'.nxc-w{display:flex;align-items:center;gap:12px;border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fff}'
      +'.nxc-w-name{flex:1;font-size:13.5px;font-weight:600;color:var(--navy,#0f172a)}'
      +'.nxc .cs-toggle input:checked+.cs-toggle-slider{background:#1a1a1a}'
      +'.nxc .cs-toggle input:disabled+.cs-toggle-slider{opacity:.55;cursor:default}';
    (document.head||document.documentElement).appendChild(st);
  })();
  const WAVE='<svg class="nxc-wave" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M8.5 7.5a6 6 0 0 1 0 9"/><path d="M12 5a9.5 9.5 0 0 1 0 14"/><path d="M15.5 2.5a13 13 0 0 1 0 19"/></svg>';
  /* The same card the employee sees in My Cards (emsCardVisual, css/ems-card-visual.css) - for the company admin with
     no card number, no name and no expiry (product owner, 13 Nov 2026). */
  function cardImage(r){
    const p=programme(r.entity);
    return '<div class="emsvc-modal" style="margin:4px 0 16px;display:flex;justify-content:center"><div class="emsvc-card" role="img" aria-label="'+E(r.name)+'" style="cursor:default">'
      +(typeof EMS_CARD_WAVES!=='undefined'?EMS_CARD_WAVES:'')
      +'<div class="emsvc-top"><span class="emsvc-brand"><span class="emsvc-mark">O</span>OpenDhi</span><span class="emsvc-bank">'+E(String(r.bank||'').toUpperCase())+'</span></div>'
      +'<div class="emsvc-prog">'+E(p&&p.name?p.name:r.name)+'</div>'
      +'<div class="emsvc-mid"><span class="emsvc-chip"></span>'+(typeof EMS_CONTACTLESS!=='undefined'?EMS_CONTACTLESS:'')+'</div>'
      +'<div class="emsvc-row" style="justify-content:flex-end"><div class="emsvc-net"><span class="emsvc-rupay">RuPay<i></i></span><span class="emsvc-prepaid">PREPAID</span></div></div>'
      +'</div></div>';
  }
  /* Settings (product owner, 13 Nov 2026): where the card works - Online, POS, ATM - International use, and the card's
     Effective From / Effective To. Display only, like the Wallets switches. */
  const settingsOf=function(r){
    if(!r.settings)r.settings={online:true,pos:true,atm:true,intl:false,from:'2026-04-01',to:'2031-03-31'};
    return r.settings;
  };
  const dLabel=function(iso){return iso&&typeof cdLabel==='function'?cdLabel(iso):(iso||'');};

  /* ── The listing ── */
  let q='',statusF='',sel=null,tab='details',editing=false,draft=null;
  const fc=function(label,val,wide){return typeof csuFc==='function'?csuFc(typeof CSU_ICO!=='undefined'?CSU_ICO.card:'',label,val,wide):'<div>'+label+': '+val+'</div>';};
  const fcI=function(ico,label,val,wide){return typeof csuFc==='function'?csuFc(typeof CSU_ICO!=='undefined'?CSU_ICO[ico]:'',label,val,wide):'<div>'+label+': '+val+'</div>';};
  function shown(){
    const r=rec();if(!r)return [];
    const s=String(q||'').trim().toLowerCase();
    if(statusF&&r.status!==statusF)return [];
    if(s&&![r.name,r.code,r.bank,r.network].some(function(v){return String(v).toLowerCase().indexOf(s)>=0;}))return [];
    return [r];
  }
  function productHTML(){
    const rows=shown(),r=rec();
    if(sel!=null&&!rows.some(function(x){return x.id===sel;}))sel=null;
    const dots=function(x){return typeof csuDots==='function'?csuDots('ccpOpen('+x.id+')',x.name):'<td><button class="ct-dots-btn" onclick="ccpOpen('+x.id+')">&#9776;</button></td>';};
    const trs=rows.map(function(x,i){
      return '<tr class="nxc-row'+(sel===x.id?' lp-row-selected':'')+'" id="nxc-row-'+x.id+'" style="cursor:pointer" onclick="ccpOpen('+x.id+')">'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+E(x.name)+'</div><div class="lp-c-sub">'+E(x.code)+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(x.bank)+'</div><div class="lp-c-sub">'+E(x.network)+'</div></td>'
        /* Card Type and Launched On (product owner, 13 Nov 2026: in place of Wallets and Cards Issued). */
        +'<td><div class="lp-c-plain">'+E(x.type)+'</div><div class="lp-c-sub">'+E(x.form)+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(dLabel(settingsOf(x).from))+'</div><div class="lp-c-sub">to '+E(dLabel(settingsOf(x).to))+'</div></td>'
        +'<td>'+badge(x.status==='Active'?'ok':'idle',x.status)+'</td>'
        +dots(x)+'</tr>';
    });
    const body=trs.length?trs.join(''):(typeof ccEmpty==='function'?ccEmpty(7,r?'No card matches this filter.':'No card is set up for this company yet.'):'');
    const act=r&&r.status==='Active'?1:0,ina=r&&r.status!=='Active'?1:0;
    const tiles=typeof caStat==='function'?caStat('Active',act,statusF==='Active','ccpStat(\'Active\')','ok')+caStat('Inactive',ina,statusF==='Inactive','ccpStat(\'Inactive\')','idle'):'';
    const table='<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Card</th><th>Bank · Network</th><th>Card Type</th><th>Effective From</th><th>Status</th><th>Action</th></tr></thead><tbody>'+body+'</tbody></table>';
    return '<div class="lp-page">'
      +(typeof ccFilterBar==='function'?ccFilterBar((typeof lpSearchField==='function'?lpSearchField('nxc-q',q,'Search card, code or bank','ccpApply()'):'')
          +(typeof apCS==='function'?apCS('nxc-status',['Active','Inactive'],statusF,'All Statuses'):'')
          +(typeof clearFiltersBtn==='function'?clearFiltersBtn([q,statusF],'ccpReset()'):'')+'<button class="lp-pill-search" onclick="ccpApply()">Search</button>',tiles):'')
      +(typeof ccSplit==='function'?ccSplit('nxc',table,sel!=null,panelHTML):table)
      +'</div>';
  }

  /* ── The page: tabs Cards (the card itself) · Card List (every card issued on it) - product owner, 13 Nov 2026 ── */
  let ptab='cards';
  function pageHTML(){
    /* No Cards | Card List switch on the page (product owner, 13 Nov 2026): Card List is its own menu item. */
    return productHTML();
  }
  window.ccpPageTab=function(t){if(ptab===t)return;ptab=t;sel=null;lsel=null;editing=false;draft=null;renderADTPage();};

  /* ── Card List: S. No, Card Number (in full for the company admin), User Name, Activation Date, Expiry Date, Status ── */
  let lq='',lstatus='',lsel=null,ltab='details';
  const fullNo=function(){return can();};   // Super Admin and Company Admin see the number in full
  const cardNo=function(c){
    const x=typeof emsCardSecret==='function'?emsCardSecret(c):{num:'•••• '+(c.last4||'')};
    return fullNo()?x.num:'•••• •••• •••• '+(c.last4||'');
  };
  const holder=function(c){const e=typeof idEmp==='function'?idEmp(c.employeeEid):null;return e?e.name:(typeof ccHolderName==='function'?ccHolderName(c):'');};
  const actOn=function(c){return /^\d{4}-\d{2}-\d{2}/.test(c.issueDate||'')?c.issueDate:'';};
  /* Expiry: five years from activation, the day before (as the card's VALID THRU). */
  const expOn=function(c){
    const a=actOn(c);if(!a)return '';
    const d=new Date(Number(a.slice(0,4))+5,Number(a.slice(5,7))-1,Number(a.slice(8,10))-1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  };
  const stOf=function(c){return c.status==='Active'?'Active':'Inactive';};
  const cardsHere=function(){
    const e=ent();
    return (typeof ccCards!=='undefined'?ccCards:[]).filter(function(c){return c.entity===e&&c.status!=='Not Issued';})
      .sort(function(a,b){return String(actOn(b)).localeCompare(String(actOn(a)))||b.id-a.id;});
  };
  function listShown(){
    const t=String(lq||'').trim().toLowerCase(),digits=t.replace(/\s+/g,'');
    return cardsHere().filter(function(c){
      if(lstatus&&stOf(c)!==lstatus)return false;
      if(!t)return true;
      return holder(c).toLowerCase().indexOf(t)>=0||(digits&&cardNo(c).replace(/\s+/g,'').indexOf(digits)>=0)||String(typeof expKey==='function'?expKey(c):'').toLowerCase().indexOf(t)>=0;
    });
  }
  function listHTML(){
    const rows=listShown(),all=cardsHere();
    if(lsel!=null&&!rows.some(function(c){return c.id===lsel;}))lsel=null;
    const trs=rows.map(function(c,i){
      return '<tr class="nxl-row'+(lsel===c.id?' lp-row-selected':'')+'" id="nxl-row-'+c.id+'" style="cursor:pointer" onclick="ccpLOpen('+c.id+')">'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main" style="font-variant-numeric:tabular-nums;letter-spacing:.02em">'+E(cardNo(c))+'</div><div class="lp-c-sub">'+E(typeof expKey==='function'?expKey(c):'')+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(holder(c))+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(dLabel(actOn(c))||'-')+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(dLabel(expOn(c))||'-')+'</div></td>'
        +'<td>'+badge(stOf(c)==='Active'?'ok':'idle',stOf(c))+'</td>'
        +(typeof csuDots==='function'?csuDots('ccpLOpen('+c.id+')',holder(c)):'<td></td>')+'</tr>';
    });
    const act=all.filter(function(c){return stOf(c)==='Active';}).length;
    const tiles=typeof caStat==='function'?caStat('Active',act,lstatus==='Active','ccpLStat(\'Active\')','ok')+caStat('Inactive',all.length-act,lstatus==='Inactive','ccpLStat(\'Inactive\')','idle'):'';
    const table='<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Card Number</th><th>User Name</th><th>Activation Date</th><th>Expiry Date</th><th>Status</th><th>Action</th></tr></thead><tbody>'
      +(trs.length?trs.join(''):(typeof ccEmpty==='function'?ccEmpty(7,all.length?'No card matches this filter.':'No card has been issued yet.'):''))+'</tbody></table>';
    return '<div class="lp-page">'
      +(typeof ccFilterBar==='function'?ccFilterBar((typeof lpSearchField==='function'?lpSearchField('nxl-q',lq,'Search name or card number','ccpLApply()'):'')
          +(typeof apCS==='function'?apCS('nxl-status',['Active','Inactive'],lstatus,'All Statuses'):'')
          +(typeof clearFiltersBtn==='function'?clearFiltersBtn([lq,lstatus],'ccpLReset()'):'')+'<button class="lp-pill-search" onclick="ccpLApply()">Search</button>',tiles):'')
      +(typeof ccSplit==='function'?ccSplit('nxl',table,lsel!=null,listPanelHTML):table)
      +'</div>';
  }
  /* A card's ☰: Details (the employee's card, name and number shown) · Wallets (what is in each wallet) · Logs · Workflow. */
  function listPanelHTML(){
    const c=typeof ccCard==='function'?ccCard(lsel):null;if(!c)return '';
    const tabs=[{id:'details',label:'Details'},{id:'wallets',label:'Wallets'},{id:'transactions',label:'Transactions'},{id:'logs',label:'Logs'},{id:'workflow',label:'Workflow'}];
    if(!tabs.some(function(t){return t.id===ltab;}))ltab='details';
    const e=typeof idEmp==='function'?idEmp(c.employeeEid):null,p=typeof ccProg==='function'?ccProg(c.programmeId):null;
    let body='';
    /* Wallets: the benefit wallets only - no Company Wallets section (Corporate Expense, Reimbursement) - product
       owner, 13 Nov 2026. Transactions: every transaction on the card, as in Corporate Cards → Cards. */
    if(ltab==='wallets'){
      const tmp=document.createElement('div');tmp.innerHTML=typeof ccCardWalletTabHTML==='function'?ccCardWalletTabHTML(c):'';
      Array.prototype.forEach.call(tmp.querySelectorAll('.lp-sb-section-title'),function(t){
        if(!/^Company Wallets/.test(String(t.textContent||'').trim()))return;
        const h=t.closest('.lp-sb-view-header');if(!h)return;
        const next=h.nextElementSibling;if(next&&next.classList.contains('sb-hist-wrap'))next.remove();
        h.remove();
      });
      body=tmp.innerHTML.trim()||'<div class="wb-empty-sm">No benefit wallet on this card.</div>';
    }
    /* Transactions: no Dispute column, and the Wallet column shows the wallet name only - no sub-line such as
       "Flexi Benefit" (product owner, 13 Nov 2026). Other card screens keep both. */
    else if(ltab==='transactions'){
      const tmp=document.createElement('div');tmp.innerHTML=typeof ccCardTxnsHTML==='function'?ccCardTxnsHTML(c):'';
      Array.prototype.forEach.call(tmp.querySelectorAll('table'),function(tb){
        const hs=tb.querySelectorAll('thead th'),colOf=function(re){return Array.prototype.findIndex.call(hs,function(h){return re.test(String(h.textContent||'').trim());});};
        const wcol=colOf(/^Wallet$/i);
        if(wcol>=0)Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'),function(tr){const cell=tr.children[wcol];if(cell)cell.querySelectorAll('.ax-sub').forEach(function(s){s.remove();});});
        const col=colOf(/^Dispute$/i);
        if(col<0)return;
        Array.prototype.forEach.call(tb.querySelectorAll('tr'),function(tr){const cell=tr.children[col];if(cell&&tr.children.length===hs.length)cell.remove();});
      });
      body=tmp.innerHTML;
    }
    else if(ltab==='logs')body=typeof lpLogsView==='function'?lpLogsView(c.logs||[],'',{current:c.status,noAction:{title:'Card history',sub:'Card actions are taken from Corporate Cards → Cards.'}}):'';
    else if(ltab==='workflow')body=typeof wfTimelineHTML==='function'&&typeof wfDoneFromLogs==='function'?wfTimelineHTML(wfDoneFromLogs(c.logs||[])):'';
    else{
      let vis=typeof emsCardVisual==='function'?emsCardVisual(c):'';
      if(fullNo())vis=vis.replace('class="emsvc-card','class="emsvc-card is-shown');   // name and number in full
      const ws=typeof ccCardWallets==='function'?ccCardWallets(c):[];
      body='<div class="emsvc-modal" style="margin:4px 0 16px;display:flex;justify-content:center">'+vis+'</div>'
        +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Details</span>'+badge(stOf(c)==='Active'?'ok':'idle',stOf(c))+'</div>'
        +'<div class="lp-sb-detail-grid">'
        +fcI('tag','Card ID',E(typeof expKey==='function'?expKey(c):c.id))+fc('Card Number',E(cardNo(c)))
        +fcI('users','User Name',E(holder(c)))+fcI('users','Employee ID',E(e&&e.empId?e.empId:'-'))
        +fcI('users','Mobile Number',E(e&&e.contact?e.contact:'-'))+fc('Card Type',E(c.type||'-'))
        +fcI('flow','Programme',E(p?p.name:'-'))+fcI('bank','Issuing Bank',E(rec()?rec().bank:'RBL Bank'))
        +fcI('cal','Activation Date',E(dLabel(actOn(c))||'-'))+fcI('cal','Expiry Date',E(dLabel(expOn(c))||'-'))
        +fc('Wallets',E(ws.map(function(w){return typeof wbTypeName==='function'?wbTypeName(w):w;}).join(', ')||'-'),true)
        +'</div>';
    }
    return (typeof axTabBar==='function'?axTabBar('nxl',tabs,ltab,'ccpLNav','ccpLClose'):'')+'<div class="lp-isb-body">'+body+'</div>';
  }
  window.ccpLApply=function(){lq=typeof lpSearchValue==='function'?lpSearchValue('nxl-q'):'';const v=typeof getCSValue==='function'?getCSValue('nxl-status'):'';lstatus=v==='All Statuses'?'':v||'';lsel=null;renderADTPage();};
  window.ccpLReset=function(){lq='';lstatus='';lsel=null;renderADTPage();};
  window.ccpLStat=function(v){lstatus=lstatus===v?'':v;lsel=null;renderADTPage();};
  window.ccpLOpen=function(id){
    ltab=typeof sbKeepTab==='function'?sbKeepTab(lsel,ltab):ltab;lsel=id;
    const sb=document.getElementById('nxl-split-sb');if(!sb){renderADTPage();return;}
    sb.classList.add('open');isbTab('nxl',listPanelHTML);
    document.querySelectorAll('.nxl-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='nxl-row-'+id);});
  };
  window.ccpLClose=function(){lsel=null;const sb=document.getElementById('nxl-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.nxl-row').forEach(function(x){x.classList.remove('lp-row-selected');});};
  window.ccpLNav=function(t){ltab=t;isbTab('nxl',listPanelHTML);};

  /* ── The ☰ panel: Details · Wallets · Logs · Workflow ── */
  function panelHTML(){
    const r=rec();if(!r||sel!==r.id)return '';
    const tabs=[{id:'details',label:'Details'},{id:'wallets',label:'Wallets'},{id:'settings',label:'Settings'},{id:'logs',label:'Logs'},{id:'workflow',label:'Workflow'}];
    if(!tabs.some(function(t){return t.id===tab;}))tab='details';
    let body='';
    if(tab==='wallets')body=walletsHTML(r);
    else if(tab==='settings')body=settingsHTML(r);
    else if(tab==='logs')body=logsHTML(r);
    else if(tab==='workflow')body=typeof wfTimelineHTML==='function'&&typeof wfDoneFromLogs==='function'?wfTimelineHTML(wfDoneFromLogs(r.logs)):'';
    else{
      const p=programme(r.entity),on=onList(r);
      body='<div class="nxc">'+cardImage(r)+'</div>'
        +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Details</span>'+badge(r.status==='Active'?'ok':'idle',r.status)+'</div>'
        +'<div class="lp-sb-detail-grid">'
        +fc('Card Name',E(r.name),true)
        +fcI('tag','Card Code',E(r.code))+fcI('bank','Issuing Bank',E(r.bank))
        +fc('Network',E(r.network))+fc('Card Type',E(r.type))
        +fc('Form',E(r.form))+fcI('money','Currency',E(r.currency))
        +fcI('users','KYC',E(r.kyc))+fcI('users','Cards Issued',String(issued(r.entity)))
        +fcI('money','Annual Fee',E(r.fee))+fcI('flow','Programme',p?E(p.name)+(p.key?' ('+E(p.key)+')':''):'-')
        +fc('Wallets',on.length?E(on.map(function(w){return w[1];}).join(', ')):'None',true)
        +'</div>';
    }
    return (typeof axTabBar==='function'?axTabBar('nxc',tabs,tab,'ccpNav','ccpClose'):'')+'<div class="lp-isb-body">'+body+'</div>';
  }
  function walletsHTML(r){
    const ws=walletsOf(r.entity),cur=editing&&draft?draft:r.wallets,c=can(),n=ws.filter(function(w){return cur[w[0]]!==false;}).length;
    let h='<div class="nxc"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Wallets</span>'
      +(c&&!editing?'<button class="lp-sb-view-edit-btn" onclick="ccpEdit()">'+(typeof SB_PEN!=='undefined'?SB_PEN+' ':'')+'Edit</button>':'<span class="wb-muted">'+n+' of '+ws.length+' active</span>')+'</div>';
    if(!ws.length)return h+'<div class="wb-empty-sm">No wallets are set up in Wallet &amp; Benefits yet.</div></div>';
    h+=ws.map(function(w){
      const on=cur[w[0]]!==false;
      /* Not editing: Active or Inactive only; Edit: the toggle only (product owner, 13 Nov 2026). */
      return '<div class="nxc-w"><span class="nxc-w-name">'+E(w[1])+'</span>'
        +(editing?'<label class="cs-toggle" title="'+(on?'Make inactive: ':'Make active: ')+E(w[1])+'"><input type="checkbox" aria-label="'+E(w[1])+'"'+(on?' checked':'')
            +' onchange="ccpPick(\''+w[0]+'\',this.checked)"><span class="cs-toggle-slider"></span></label>'
          :badge(on?'ok':'idle',on?'Active':'Inactive'))+'</div>';
    }).join('');
    if(editing)h+='<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccpCancel()">Cancel</button><button class="ep-save-btn" onclick="ccpSave()">Save changes</button></div>';
    return h+'</div>';
  }
  let sEdit=false,sDraft=null;
  function settingsHTML(r){
    const st=settingsOf(r),cur=sEdit&&sDraft?sDraft:st,c=can();
    const row=function(k,label){
      const on=!!cur[k];
      return '<div class="nxc-w"><span class="nxc-w-name">'+E(label)+'</span>'
        +(sEdit?'<label class="cs-toggle" title="'+(on?'Make inactive: ':'Make active: ')+E(label)+'"><input type="checkbox" aria-label="'+E(label)+'"'+(on?' checked':'')
            +' onchange="ccpSetPick(\''+k+'\',this.checked)"><span class="cs-toggle-slider"></span></label>'
          :badge(on?'ok':'idle',on?'Active':'Inactive'))+'</div>';
    };
    let h='<div class="nxc"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Channels</span>'
      +(c&&!sEdit?'<button class="lp-sb-view-edit-btn" onclick="ccpSetEdit()">'+(typeof SB_PEN!=='undefined'?SB_PEN+' ':'')+'Edit</button>':'')+'</div>'
      +row('online','Online')+row('pos','POS')+row('atm','ATM')
      +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">International Use</span></div>'
      +row('intl','International Use')
      +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Validity</span></div>';
    if(sEdit)h+='<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Effective From <span class="req">*</span></label>'+(typeof apCD==='function'?apCD('nxc-s-from',cur.from,'Select date'):'')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Effective To <span class="req">*</span></label>'+(typeof apCD==='function'?apCD('nxc-s-to',cur.to,'Select date'):'')+'</div></div>'
      +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccpSetCancel()">Cancel</button><button class="ep-save-btn" onclick="ccpSetSave()">Save changes</button></div>';
    else h+='<div class="lp-sb-detail-grid">'+fcI('cal','Effective From',E(dLabel(st.from)))+fcI('cal','Effective To',E(dLabel(st.to)))+'</div>';
    return h+'</div>';
  }
  const sSyncDates=function(){if(!sDraft||typeof getCDValue!=='function')return;const f=getCDValue('nxc-s-from'),t=getCDValue('nxc-s-to');if(f)sDraft.from=f;if(t)sDraft.to=t;};
  window.ccpSetEdit=function(){const r=rec();if(!r||!can())return;sEdit=true;sDraft=Object.assign({},settingsOf(r));repaint();};
  window.ccpSetCancel=function(){sEdit=false;sDraft=null;repaint();};
  window.ccpSetPick=function(k,on){if(!sEdit||!sDraft)return;sSyncDates();sDraft[k]=!!on;repaint();};
  window.ccpSetSave=function(){
    const r=rec();if(!r||!can()||!sDraft)return;sSyncDates();
    const d=sDraft,st=settingsOf(r);
    if(!d.from||!d.to){showToast('Dates required','error','Set Effective From and Effective To.');return;}
    if(d.to<=d.from){showToast('Check the dates','error','Effective To must be after Effective From.');return;}
    const L={online:'Online',pos:'POS',atm:'ATM',intl:'International Use'},ch=[];
    Object.keys(L).forEach(function(k){if(!!d[k]!==!!st[k])ch.push(L[k]+' '+(d[k]?'active':'inactive'));});
    if(d.from!==st.from)ch.push('Effective From '+dLabel(st.from)+' → '+dLabel(d.from));
    if(d.to!==st.to)ch.push('Effective To '+dLabel(st.to)+' → '+dLabel(d.to));
    if(!ch.length){sEdit=false;sDraft=null;repaint();showToast('No changes','info');return;}
    r.settings=Object.assign({},d);log(r,r.status,'Settings updated: '+ch.join(', ')+'.');
    sEdit=false;sDraft=null;renderADTPage();
    showToast('Settings saved','success',r.name+' · '+ch.join(', ')+'.');
  };
  /* Logs: the record's history and its status move (Active / Inactive) with a comment, as on every listing. */
  function logsHTML(r){
    const on=r.status==='Active',next=on?'Inactive':'Active';
    const form=can()?'<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+(on?'active':'inactive')+'"></span>'+E(r.status)+'</div>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +(typeof apCS==='function'?apCS('nxc-log-status',[next],next,'Select Status'):'')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="nxc-log-comment" placeholder="Comment"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="ccpLogSave()">Save</button></div>':'';
    return typeof lpLogsView==='function'?(can()?lpLogsView(r.logs,form):lpLogsView(r.logs,'',{current:r.status,noAction:{title:'View only',sub:'Your role can view this card but not change it.'}})):'';
  }

  /* ── Actions ── */
  const repaint=function(){if(typeof isbTab==='function'&&document.getElementById('nxc-split-sb'))isbTab('nxc',panelHTML);else renderADTPage();};
  window.ccpApply=function(){q=typeof lpSearchValue==='function'?lpSearchValue('nxc-q'):'';const s=typeof getCSValue==='function'?getCSValue('nxc-status'):'';statusF=s==='All Statuses'?'':s||'';sel=null;renderADTPage();};
  window.ccpReset=function(){q='';statusF='';sel=null;renderADTPage();};
  window.ccpStat=function(s){statusF=statusF===s?'':s;sel=null;renderADTPage();};
  window.ccpOpen=function(id){
    if(sel!==id){editing=false;draft=null;}
    tab=typeof sbKeepTab==='function'?sbKeepTab(sel,tab):tab;sel=id;
    const sb=document.getElementById('nxc-split-sb');if(!sb){renderADTPage();return;}
    sb.classList.add('open');isbTab('nxc',panelHTML);
    document.querySelectorAll('.nxc-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='nxc-row-'+id);});
  };
  window.ccpClose=function(){sel=null;editing=false;draft=null;const sb=document.getElementById('nxc-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.nxc-row').forEach(function(x){x.classList.remove('lp-row-selected');});};
  window.ccpNav=function(t){tab=t;if(t!=='wallets'){editing=false;draft=null;}if(t!=='settings'){sEdit=false;sDraft=null;}repaint();};
  window.ccpEdit=function(){const r=rec();if(!r||!can())return;editing=true;draft=Object.assign({},r.wallets);repaint();};
  window.ccpCancel=function(){editing=false;draft=null;repaint();};
  window.ccpPick=function(code,on){if(!editing||!draft)return;draft[code]=!!on;repaint();};
  window.ccpSave=function(){
    const r=rec();if(!r||!can()||!draft)return;
    const ws=walletsOf(r.entity),changed=ws.filter(function(w){return (r.wallets[w[0]]!==false)!==(draft[w[0]]!==false);});
    if(!changed.length){editing=false;draft=null;repaint();showToast('No changes','info');return;}
    if(!ws.some(function(w){return draft[w[0]]!==false;})){showToast('Keep one wallet on','error','A multiwallet card needs at least one wallet.');return;}
    ws.forEach(function(w){r.wallets[w[0]]=draft[w[0]]!==false;});
    const text='Wallets updated: '+changed.map(function(w){return w[1]+' '+(r.wallets[w[0]]?'active':'inactive');}).join(', ')+'.';
    log(r,r.status,text);editing=false;draft=null;renderADTPage();
    showToast('Wallets saved','success',r.name+' · '+text.replace('Wallets updated: ',''));
  };
  window.ccpLogSave=function(){
    const r=rec();if(!r||!can())return;
    const v=typeof getCSValue==='function'?getCSValue('nxc-log-status'):'',ta=document.getElementById('nxc-log-comment'),c=ta?String(ta.value||'').trim():'';
    if(!v||v===r.status){showToast('Pick the status','error');return;}
    if(!c){if(ta)ta.classList.add('is-invalid');showToast('Comment required','error','Write why the card is '+(v==='Active'?'activated':'made inactive')+'.');return;}
    r.status=v;log(r,v,(v==='Active'?'Activated':'Made inactive')+'. Comment: '+c);renderADTPage();
    showToast('Status updated','success',r.name+' is '+v+'.');
  };

  /* ── The menu item: "Cards", right under the existing Cards in Corporate Cards ── */
  if(typeof sidebarItems!=='undefined'){
    const g=sidebarItems.find(function(x){return x&&x.dropdown==='Corporate Cards';});
    if(g&&!g.children.some(function(c){return c.id===PG;})){
      const I=typeof sbIco!=='undefined'?sbIco:{},at=g.children.findIndex(function(c){return c.id==='card-list';});
      g.children.splice(at<0?0:at+1,0,{id:PG,label:'Cards',color:'green',icon:I.card||''});
    }
    /* Card List also as its own item, right under it (product owner, 13 Nov 2026: "unable to see the card list"). */
    if(g&&!g.children.some(function(c){return c.id===PGL;})){
      const I=typeof sbIco!=='undefined'?sbIco:{},at=g.children.findIndex(function(c){return c.id===PG;});
      g.children.splice(at<0?g.children.length:at+1,0,{id:PGL,label:'Card List',color:'green',icon:I.fileText||I.card||''});
    }
  }
  [PG,PGL].forEach(function(id){
    if(typeof supportPageMeta!=='undefined')supportPageMeta[id]={title:id===PGL?'Card List':'Cards',context:id===PGL?'Card List':'Cards',filters:[],columns:[],rows:[]};
    if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[id]='cards';
    if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(id)<0)EMS_CLIENT_PAGES.push(id);
  });
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg!==PG&&pg!==PGL)return p0.apply(this,arguments);
      return p0('cards')&&(typeof ccAdminView!=='function'||ccAdminView());
    };
  }
  if(typeof renderPageContent==='function'){
    const r0=renderPageContent;
    renderPageContent=function(target){
      if(typeof page==='undefined'||(page!==PG&&page!==PGL))return r0.apply(this,arguments);
      const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
      if(typeof emsApplyChrome==='function')emsApplyChrome();
      if(typeof emsPageGuard==='function'){const gd=emsPageGuard(page);if(gd){el.innerHTML=gd;return;}}
      seed();el.innerHTML=page===PGL?listHTML():pageHTML();
    };
  }
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg===PG?'Cards':pg===PGL?'Card List':t0.apply(this,arguments);};
  }
  if(typeof renderADTPage==='function'){
    const a0=renderADTPage;
    renderADTPage=function(){
      const out=a0.apply(this,arguments);
      if(typeof page!=='undefined'&&(page===PG||page===PGL)){const b=document.getElementById('tb-page-add-btn');if(b)b.style.display='none';}
      return out;
    };
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!==PG){editing=false;draft=null;}if(pg===PG)ptab='cards';return n0.apply(this,arguments);};
  }
})();
