/* ══ WALLET & BENEFITS: Wallets, Benefit Policies and Manage (FR-WB-01) ═══
   Screens and navigation over js/wallet-benefits.js; no rule changes.
   - Two primary tabs: Wallets and Benefit Policies. Entitlements are worked
     out automatically from the policies and shown where they are needed:
     a policy's Eligible Employees, the employee's Benefits tab and My
     Profile → Wallet & Benefits.
   - Manage: Categories, Overrides, Tax Thresholds and, where a funded wallet
     exists, Wallet Funding (the monthly funding batches).
   - Funded wallets: the monthly funding batch is prepared automatically from
     the active policies (wbAutoPrepare) and submitted for Finance approval;
     maker-checker, one live batch per period and the card-load rules are the
     existing ones. Claim-based benefits need no batch.
   - Wallet details: Funding (its batches) and Balances (per employee, from
     the wallet ledger, js/ems-wallet-ledger.js).
   The internal view ids are unchanged, so links that open a view still do. */
const WB_MANAGE_VIEWS=[{id:'categories',label:'Categories'},{id:'overrides',label:'Overrides'},{id:'thresholds',label:'Tax Thresholds'},{id:'allocations',label:'Wallet Funding'}];
let wbLastPrimary='wallets',wbManageWasOpen=false;
function wbCanView(id){return wbCan(WB_VIEW_PERM[wbKindOfTab(id)]);}
function wbPrimaryOf(t){return t==='policies'||t==='entitlements'?'policies':t;}
function wbIsManageView(t){return WB_MANAGE_VIEWS.some(function(x){return x.id===t;});}
function wbFundedHere(){return wbMine(wbCategories).some(function(c){return c.processing==='Wallet-Funded';})||wbMine(wbBatches).length>0;}
function wbPrimaryTabs(){
  const out=[];
  if(wbCanView('wallets'))out.push({id:'wallets',label:'Wallets'});
  if(wbCanView('policies'))out.push({id:'policies',label:'Benefit Policies'});
  else if(wbCanView('entitlements'))out.push({id:'policies',label:'Entitlements'});   // an employee: their own entitlements
  return out;
}
function wbManageItems(){return WB_MANAGE_VIEWS.filter(function(x){return wbCanView(x.id)&&(x.id!=='allocations'||wbFundedHere());});}
function wbPrimary(id){
  if(id==='policies'){if(wbPrimaryOf(wbTab)!=='policies')wbSetTab(wbCanView('policies')?'policies':'entitlements');return;}
  wbSetTab(id);
}
function wbManageClick(){
  const btn=document.getElementById('wb-manage-btn');if(!btn)return;
  let m=document.getElementById('wb-manage-menu');
  if(!m){const w=document.createElement('div');w.className='ct-action-wrap';w.innerHTML='<div class="ct-action-menu" id="wb-manage-menu" role="menu"></div>';document.body.appendChild(w);m=w.firstChild;}
  if(wbManageWasOpen){wbManageWasOpen=false;m.classList.remove('open');return;}
  m.innerHTML=wbManageItems().map(function(x){return '<div class="ct-act-item" role="menuitem" onclick="wbManagePick(\''+x.id+'\')"><span>'+x.label+'</span></div>';}).join('');
  document.querySelectorAll('.ct-action-menu.open').forEach(function(x){x.classList.remove('open');});
  m.classList.add('open');
  placeAnchoredMenu(m,btn.getBoundingClientRect(),{alignLeft:false});
}
document.addEventListener('mousedown',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#wb-manage-btn')){const m=document.getElementById('wb-manage-menu');wbManageWasOpen=!!(m&&m.classList.contains('open'));}
},true);
function wbManagePick(id){const m=document.getElementById('wb-manage-menu');if(m)m.classList.remove('open');wbManageWasOpen=false;wbSetTab(id);}
function wbBackFromManage(){wbSetTab(wbLastPrimary==='policies'?(wbCanView('policies')?'policies':'entitlements'):wbLastPrimary);}

/* ── Funded wallets: the monthly batch, prepared automatically ──────────── */
const WB_SYSTEM='System';
function wbAutoPrepare(){
  if(typeof wbBuild!=='function'||!wbFundedHere())return null;
  const per=wbToday().slice(0,7);
  if(wbPeriods().indexOf(per)<0)return null;
  /* One batch per period: never again once one exists, whatever its status;
     a rejected or cancelled batch is corrected under Wallet Funding. */
  if(wbMine(wbBatches).some(function(b){return b.period===per;}))return null;
  const built=wbBuild(per);
  built.rows=built.rows.filter(function(r){return !!r.wallet;});   // claim-based benefits need no funding
  if(!built.rows.length)return null;
  const b=wbMakeBatch(per,built,{by:WB_SYSTEM,byId:'',role:WB_SYSTEM});
  const s=stampNow();
  b.status='Pending Approval';b.submittedBy=WB_SYSTEM;b.auto=true;
  b.logs.unshift(wbLog(s.date,s.time,WB_SYSTEM,'Pending Approval','Prepared automatically from the active Benefit Policies and submitted for Finance approval. No wallet is loaded until it is approved and the load is executed.'));
  return b;
}

buildWalletBenefitsHTML=function(){
  wbAutoPrepare();
  /* Only the views this role may open; an employee gets Entitlements alone. */
  const allowed=WB_TABS.filter(function(t){return wbCanView(t.id);});
  if(allowed.length&&!allowed.some(function(t){return t.id===wbTab;}))wbTab=allowed[0].id;
  if(wbTab==='allocations'&&!wbFundedHere()&&wbCanView('wallets'))wbTab='wallets';
  const k=wbKindOfTab(wbTab);
  let body;
  if(!wbCan(WB_VIEW_PERM[k]))body=wbNoAccessHTML();
  else if(k==='w')body=wbListWallets();
  else if(k==='c')body=wbListCategories();
  else if(k==='p')body=wbListPolicies();
  else if(k==='e')body=wbListEntitlements();
  else if(k==='a')body=wbListBatches();
  else if(k==='o')body=wbListOverrides();
  else body=wbListThresholds();
  let head;
  const prim=wbPrimaryTabs();
  if(wbIsManageView(wbTab)&&prim.length){
    const back=prim.find(function(t){return t.id===wbLastPrimary;})||prim[0];
    head='<div style="display:flex;align-items:center;gap:12px;margin:0 0 14px">'
      +'<button class="ep-back" style="margin:0" onclick="wbBackFromManage()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> '+back.label+'</button>'
      +'<span class="lp-sb-section-title">'+(WB_MANAGE_VIEWS.find(function(x){return x.id===wbTab;})||{}).label+'</span></div>';
  }else{
    wbLastPrimary=wbPrimaryOf(wbTab);
    /* No Manage button "for now" (product owner, 13 Nov 2026): Categories, Overrides, Tax Thresholds and Wallet Funding
       are kept and still open from their own links. */
    head='<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0">'+buildModuleTabsHTML(prim,wbPrimaryOf(wbTab),'wbPrimary',true)+'</div></div>';
  }
  return '<div class="mod-page">'+head+body+'</div>'+(wbModal?wbModalHTML():'');
};

/* ── Wallet details: Funding and Balances ──────────────────────────────── */
(function(){
  const tf0=wbTabsFor;
  wbTabsFor=function(kind){
    const t=tf0.apply(this,arguments);
    if(kind!=='w')return t;
    const i=t.findIndex(function(x){return x.id==='logs';});
    const add=[{id:'funding',label:'Funding'},{id:'balances',label:'Balances'}];
    return i<0?t.concat(add):t.slice(0,i).concat(add,t.slice(i));
  };
  const pw0=WB_PANEL.w;
  WB_PANEL.w=function(r,tab){
    if(tab==='funding')return wbWalletFundingHTML(r);
    if(tab==='balances')return wbWalletBalancesHTML(r);
    return pw0.apply(this,arguments);
  };
})();
function wbOpenBatch(id){wbSetTab('allocations');wbOpen('a',id);}
function wbWalletFundingHTML(r){
  const list=wbMine(wbBatches).map(function(b){
    const rows=(b.rows||[]).filter(function(x){return x.walletType===r.type&&x.status!=='Cancelled';});
    return {b:b,n:rows.length,amt:rows.reduce(function(a,x){return a+(Number(x.amount)||0);},0)};
  }).filter(function(x){return x.n>0;});
  const canGen=wbCan('benefit.allocation.generate');
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Funding batches · '+sbEsc(wbTypeName(r.type))+'</span>'
      +(canGen?'<span class="ca-actions"><button class="btn btn-outline btn-sm" onclick="wbSetTab(\'allocations\');wbStartGenerate()">Prepare a batch</button></span>':'')+'</div>'
    +(list.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Batch</th><th>Period</th><th class="wb-num">Employees</th><th class="wb-num">Amount</th><th>Status</th></tr></thead><tbody>'
      +list.map(function(x){return '<tr style="cursor:pointer" onclick="wbOpenBatch('+x.b.id+')"><td class="csag-td"><a class="ax-c-link">'+x.b.key+'</a>'+(x.b.auto?'<div class="wb-muted">prepared automatically</div>':'')+'</td>'
        +'<td class="csag-td">'+wbPeriodLabel(x.b.period)+'</td><td class="csag-td wb-num">'+x.n+'</td><td class="csag-td wb-num">'+wbMoney(x.amt)+'</td><td class="csag-td">'+wbBadge(x.b.status)+'</td></tr>';}).join('')
      +'</tbody></table></div>'
      :'<div class="wb-empty-sm">No funding batch for this wallet yet.</div>');
}
function wbWalletBalancesHTML(r){
  if(typeof emsLedgerWallets!=='function')return '<div class="wb-empty-sm">No balances.</div>';
  const ill=emsLedgerIllustrative();
  const rows=wbEmployees().map(function(emp){
    const w=emsLedgerWallets(emp.eid)[r.type],ent=emsLedgerEntitled(emp.eid)[r.type];
    if(!w&&ent==null)return '';
    const x=w||{loaded:0,spent:0,refunded:0,available:0};
    return '<tr><td class="csag-td">'+sbEsc(emp.name)+' <span class="wb-muted">'+sbEsc(emp.empId)+'</span></td>'
      +'<td class="csag-td wb-num">'+(ent!=null?wbMoney(ent):'—')+'</td><td class="csag-td wb-num">'+wbMoney(x.loaded)+'</td><td class="csag-td wb-num">'+wbMoney(x.spent-x.refunded)+'</td>'
      +'<td class="csag-td wb-num"><b>'+(ill||x.loaded>0?wbMoney(x.available):'—')+'</b></td></tr>';
  }).join('');
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Balances · '+sbEsc(wbTypeName(r.type))
      +(ill?' <span class="lp-status-badge tone-info" title="Simulated provider data">Illustrative</span>':'')+'</span></div>'
    +(rows?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Employee</th><th class="wb-num">Entitled</th><th class="wb-num">Loaded</th><th class="wb-num">Spent</th><th class="wb-num">Available</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No employee has this wallet yet.</div>');
}
