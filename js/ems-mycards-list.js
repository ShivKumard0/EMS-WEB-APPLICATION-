/* ══ MY CARDS AS A LIST; TRANSACTIONS IN THE MENU (product owner, 12 Nov 2026) ══════════════════════════════════
   The employee's Corporate Cards → My Cards is a list, one line per card: S. No · Card · Programme · Available Balance ·
   Status · Actions. The line's ☰ opens the card beside the list with three tabs:
   - Card: the card itself (as drawn on My Cards before) and its details;
   - Wallet Balance: each wallet on the card - entitled this month, loaded, spent, available;
   - Logs: the card's history, and the cardholder's card actions (Place Temporary Hold, Report Lost or Stolen, Request
     Replacement, Request Hold Release, Send Me an Activation Reminder) as Select action + note.
   Below the list stay the Pending Actions, when there is something to do. The card's transactions are a menu item of
   their own: Corporate Cards → My Cards · Transactions · My Requests (the former "View All" list). Admins' screens are
   unchanged. */
const EMS_MC_TXN='card-my-txns';
let emsMcSel=null,emsMcTab='card';

function emsMcAdmin(){return typeof ccAdminView!=='function'||ccAdminView();}
function emsMcAvail(c){
  const by=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid,c.id):{};
  const on=typeof ccCardWallets==='function'?ccCardWallets(c):Object.keys(by);
  return on.reduce(function(s,w){return s+((by[w]||{}).available||0);},0);
}
function emsMcCards(eid){return ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt()&&(typeof ccCardVisible!=='function'||ccCardVisible(c));});}
function emsMcListHTML(eid){
  const cards=emsMcCards(eid);
  if(emsMcSel!=null&&!cards.some(function(c){return c.id===emsMcSel;}))emsMcSel=null;
  const rows=cards.map(function(c,i){
    const p=ccProg(c.programmeId),open='emsMcOpen('+c.id+')';
    return '<tr class="emc-row'+(emsMcSel===c.id?' lp-row-selected':'')+'" id="emc-row-'+c.id+'" style="cursor:pointer" onclick="'+open+'">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(ccMask(c.last4))+'</div><div class="lp-c-sub">'+ccE(expKey(c))+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(p?p.name:'')+'</div><div class="lp-c-sub">'+ccE(c.type)+'</div></td>'
      +'<td class="exp-c-amt" style="white-space:nowrap">'+(ccCardEnded(c)?'<span class="wb-muted">—</span>':ccE(expMoney(emsMcAvail(c),c.currency)))+'</td>'
      +'<td>'+axBadge(statusTone(c.status),c.status)+(c.hold&&c.hold.active?'<div class="lp-c-sub">'+ccE(c.hold.type==='Temporary'?'Temporary hold':'On hold')+'</div>':'')+'</td>'
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(expKey(c))+'" onclick="'+open+'">'+EMS_DOTS+'</button></td></tr>';
  });
  const table='<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Card</th><th>Programme</th><th>Available Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
    +(rows.length?rows.join(''):'<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--gray)">You have no corporate card yet. Request one under My Requests.</td></tr>')+'</tbody></table>';
  return ccSplit('emc',table,emsMcSel!=null,emsMcSidebar);
}
/* ── The card's panel ── */
function emsMcSidebar(){
  const c=emsMcSel!=null?ccCard(emsMcSel):null;if(!c)return '';
  const tabs=[{id:'card',label:'Card Details'},{id:'wallets',label:'Wallet Balance'},{id:'logs',label:'Logs'}];
  if(!tabs.some(function(t){return t.id===emsMcTab;}))emsMcTab='card';
  if(typeof ccAct!=='undefined'&&ccAct&&ccAct.inLogs&&(emsMcTab!=='logs'||ccAct.cardId!==c.id))ccAct=null;   // an action started in Logs ends when its tab is left
  const p=ccProg(c.programmeId);
  const hero=sbHero({icon:typeof CC_ICO!=='undefined'?CC_ICO.hero:'',name:ccE(ccMask(c.last4)),meta:[expKey(c),ccE(p?p.name:'')],status:axBadge(statusTone(c.status),c.status)});
  let body;
  if(emsMcTab==='wallets')body=hero+emsMcWalletsHTML(c);
  else if(emsMcTab==='logs'){const logs=emsCardLogs(c).map(function(x){return {date:x.date,time:x.time,user:x.by,status:x.status,action:x.action};});
    body=typeof ccCardLogsHTML==='function'?ccCardLogsHTML(c,logs):emsLogTable(emsCardLogs(c));}
  else body=hero+emsMcCardHTML(c);
  return axTabBar('emc',tabs,emsMcTab,'emsMcNav','emsMcClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function emsMcCardHTML(c){
  const p=ccProg(c.programmeId),s=typeof ccCardCtl==='function'?ccCardCtl(c):null;
  const f=function(ico,l,v){return axField(ico,l,v);};
  return '<div class="emsvc-modal" style="margin:4px 0 14px">'+emsCardVisual(c)+'</div>'
    +'<div class="lp-sb-detail-grid">'
    +f(AX_ICO.fTag,'Card Name',ccE(p?p.name:''))
    +f(AX_ICO.fHash,'Card Number',ccE(ccMask(c.last4))+' <span class="ax-sub">'+ccE(expKey(c))+'</span>')
    +f(AX_ICO.fBox,'Card Type',ccE(c.type))
    +f(AX_ICO.fCheck,'Card Status',ccE(c.status)+(c.hold&&c.hold.active?' <span class="ax-sub">'+ccE(c.hold.type==='Temporary'?'temporary hold':'on hold')+'</span>':''))
    +f(AX_ICO.fUser,'Cardholder',ccE(typeof emsCardHolderName==='function'?emsCardHolderName(c):ccHolderName(c)))
    +f(AX_ICO.fBuild,'Card Provider',ccE(typeof ccProviderName==='function'?ccProviderName(c.provider):''))
    +f(AX_ICO.fCal,'Issued On',ccE(c.issueDate?cdLabel(c.issueDate):'—'))
    +f(AX_ICO.fCash,'Available Balance',ccE(ccCardEnded(c)?'—':expMoney(emsMcAvail(c),c.currency)))
    +f(AX_ICO.fTag,'Controls in Effect',ccE(s&&typeof ccCtlSummary==='function'?ccCtlSummary(s,c.currency):'As programme'),true)
    +'</div>';
}
function emsMcWalletsHTML(c){
  const on=typeof ccCardWallets==='function'?ccCardWallets(c):[];
  return typeof emsLedgerHTML==='function'?emsLedgerHTML(c.employeeEid,true,{history:false,title:'Wallet Balance',pick:'emsWalletOpen',codes:on})
    :'<div class="wb-empty-sm">No wallet on this card.</div>';
}
function emsMcOpen(id,tab){
  const c=ccCard(id);if(!c)return;
  emsMcTab=tab||(emsMcSel===c.id?emsMcTab:'card');emsMcSel=c.id;
  const sb=document.getElementById('emc-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('emc',emsMcSidebar);
  document.querySelectorAll('.emc-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='emc-row-'+id);});
}
function emsMcClose(){emsMcSel=null;if(typeof ccAct!=='undefined'&&ccAct&&ccAct.inLogs)ccAct=null;const sb=document.getElementById('emc-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.emc-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function emsMcNav(tab){emsMcTab=tab;isbTab('emc',emsMcSidebar);}

/* ── Transactions (menu item): a filter bar - search, and a Wallet dropdown with its own search - and the standard list ── */
let emsMyTxnQ='';
function emsMcTxnsHTML(eid){
  const txns=emsMyTxns(eid),ws=[];txns.forEach(function(t){if(ws.indexOf(t.wallet)<0)ws.push(t.wallet);});
  if(emsMyTxnWallet&&ws.indexOf(emsMyTxnWallet)<0)emsMyTxnWallet='';
  const q=String(emsMyTxnQ||'').trim().toLowerCase();
  const shown=txns.filter(function(t){
    if(emsMyTxnWallet&&t.wallet!==emsMyTxnWallet)return false;
    if(q&&![expKey(t),t.merchant,wbTypeName(t.wallet),t.status,String(t.amount)].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    return true;
  });
  if(emsTxnSel!=null&&!shown.some(function(t){return t.id===emsTxnSel;}))emsTxnSel=null;
  const pgn=listPage('ems-my-txns',[emsMyTxnQ,emsMyTxnWallet].join('|'),shown.map(function(t,i){
    const credit=t.direction==='Credit',cur=t.billCurrency||t.currency,amt=t.billAmount!=null?t.billAmount:t.amount,w=emsTxnWhen(t),refs=emsTxnRefs(t);
    return '<tr class="etx-row'+(emsTxnSel===t.id?' lp-row-selected':'')+'" id="etx-row-'+t.id+'" style="cursor:pointer" onclick="emsTxnOpen('+t.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(expKey(t))+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(w.day)+'</div>'+(w.time?'<div class="lp-c-sub">'+ccE(w.time)+'</div>':'')+'</td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(t.merchant||'')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(wbTypeName(t.wallet))+'</div></td>'
      +'<td class="exp-c-amt" style="white-space:nowrap'+(credit?';color:var(--st-ok-fg)':'')+'">'+(credit?'+':'')+ccE(expMoney(amt,cur))+'</td>'
      +'<td>'+axBadge(statusTone(t.status),t.status)+(refs.length?'<div class="lp-c-sub">'+refs.join('<br>')+'</div>':'')+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'+emsMcDspCell(t)+'</td>'
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" onclick="emsTxnOpen('+t.id+')">'+EMS_DOTS+'</button></td></tr>';
  }),'<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--gray)">No card transaction matches this filter.</td></tr>');
  const bar='<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('etf-q',emsMyTxnQ,'Search transaction or merchant','emsMcTxnApply()')
    +axCS('etf-wallet',ws.map(wbTypeName),emsMyTxnWallet?wbTypeName(emsMyTxnWallet):'','All Wallets')
    +clearFiltersBtn([emsMyTxnQ,emsMyTxnWallet],'emsMcTxnReset()')
    +'<button class="lp-pill-search" onclick="emsMcTxnApply()">Search</button></div></div></div>';
  return '<div>'+bar
    +ccSplit('etx','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Transaction ID</th><th>Date</th><th>Merchant</th><th>Wallet</th><th>Amount</th><th>Status</th><th>Dispute</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,emsTxnSel!=null,emsTxnSidebar)+'</div>';
}
/* Raise Dispute on the line (product owner, 12 Nov 2026): the transaction opens on its Dispute tab with Raise Dispute already
   picked, so the employee writes the comment and submits. A raised dispute shows its status there; "—" where the payment
   cannot be disputed. */
let emsDspQuick=null;
function emsMcDspCell(t){
  const tg=emsDspTarget(t);if(!tg)return '<span class="wb-muted">—</span>';
  const d=emsDspExisting(tg);
  if(d)return '<button type="button" class="att-link" onclick="emsTxnOpen('+t.id+',\'dispute\')">'+ccE(emsDspLabel(d))+'</button>';
  if(emsDspActions(t,null).indexOf('Raise Dispute')>=0)return '<button type="button" class="btn btn-primary btn-sm" onclick="emsMcRaiseDispute('+t.id+')">Raise Dispute</button>';
  return '<span class="wb-muted">—</span>';
}
function emsMcRaiseDispute(id){emsDspQuick=id;emsTxnOpen(id,'dispute');}
function emsMcTxnApply(){
  emsMyTxnQ=lpSearchValue('etf-q');
  const v=getCSValue('etf-wallet'),me=typeof ccEmpOf==='function'?ccEmpOf():null;
  const ws=me?emsMyTxns(me.eid).map(function(t){return t.wallet;}):[];
  emsMyTxnWallet=v&&v!=='All Wallets'?(ws.find(function(w){return wbTypeName(w)===v;})||''):'';
  emsTxnSel=null;renderADTPage();
}
function emsMcTxnReset(){emsMyTxnQ='';emsMyTxnWallet='';emsTxnSel=null;renderADTPage();}

(function(){
  if(typeof emsTxnDisputeHTML==='function'){
    const q0=emsTxnDisputeHTML;
    emsTxnDisputeHTML=function(t0){
      const tg=emsDspTarget(t0);
      if(emsDspQuick==null||emsDspQuick!==t0.id||emsTxnSel!==t0.id||emsTxnTab!=='dispute'||(tg&&emsDspExisting(tg))){emsDspQuick=null;return q0.apply(this,arguments);}
      const lv=lpLogsView;let out;
      lpLogsView=function(logs,form,o){return lv(logs,form,Object.assign({},o||{},{open:'Raise Dispute'}));};
      try{out=q0.apply(this,arguments);}finally{lpLogsView=lv;}
      return out;
    };
  }
  if(typeof emsDspSave==='function'){
    const v0=emsDspSave;
    emsDspSave=function(){const r=v0.apply(this,arguments);emsDspQuick=null;return r;};
  }
  /* 1 · My Cards: the list (and Pending Actions); Transactions: the employee's card transactions. */
  if(typeof emsMyCardsHTML==='function'){
    const m0=emsMyCardsHTML;
    emsMyCardsHTML=function(eid){
      if(emsMcAdmin())return m0.apply(this,arguments);
      const e=idEmp(eid),A=ccNow(),cards=emsMcCards(eid);
      const holds=cards.some(function(c){return typeof emsCardOfEmp==='function'&&emsCardOfEmp(eid,c.programmeId)===c;});
      const qa=ccProgs().some(function(p){return ccProgActive(p)&&!ccReqMayRaise(A,eid,p);})?ccBtn(holds?'Request Wallet':'Request Card','ccReqStart(null,{employeeEid:\''+eid+'\'})',true):'';
      if(emsMyTxnAll)return emsMcTxnsHTML(eid);
      const head='<div class="lp-sb-view-header cc-holder-head"><span class="lp-sb-section-title">My Corporate Cards <span class="ax-sub">'+ccE(e.empId||'')+(e.dept?' · '+ccE(e.dept):'')+'</span></span>'
        +(qa?'<span class="ca-actions">'+qa+'</span>':'')+'</div>';
      return '<div class="cc-holder">'+head+emsMcListHTML(eid)+emsPendHTML(ccPendingActions(eid))+'</div>';
    };
  }
  /* 2 · Opening one's card (Pending Actions, links): its panel on My Cards; a transaction: the Transactions list. */
  if(typeof emsCardOpen==='function'){
    const c0=emsCardOpen;
    emsCardOpen=function(id,view){
      if(emsMcAdmin())return c0.apply(this,arguments);
      if(typeof page!=='undefined'&&page!=='cards')navigatePage('cards');
      if(typeof ccPageTab!=='undefined')ccPageTab='cards';
      emsMyTxnAll=false;emsTxnSel=null;emsCardModal=null;
      emsMcSel=Number(id);emsMcTab=view==='logs'?'logs':'card';renderADTPage();
    };
  }
  if(typeof emsTxnOpen==='function'){
    const t0=emsTxnOpen;
    emsTxnOpen=function(){if(!emsMcAdmin()){emsMyTxnAll=true;emsMcSel=null;}return t0.apply(this,arguments);};
  }
  /* 3 · The menu: Corporate Cards → My Cards · Transactions · My Requests, for the employee. */
  const ico=function(){
    const items=typeof sidebarItems!=='undefined'?sidebarItems:[];let found='';
    items.forEach(function(g){(g.children||[]).forEach(function(ch){if(ch.id==='card-transactions')found=ch.icon;});});
    return found||(typeof CTX_ICON!=='undefined'?CTX_ICON:'');
  };
  if(typeof window.getSidebarItems==='function'){
    const g0=window.getSidebarItems;
    window.getSidebarItems=function(){
      const out=g0.apply(this,arguments);
      if(emsMcAdmin())return out;
      return out.map(function(g){
        if(g.dropdown!=='Corporate Cards'||!g.children)return g;
        const kids=g.children.slice(),at=kids.findIndex(function(ch){return ch.id==='card-list';});
        if(at>=0&&!kids.some(function(ch){return ch.id===EMS_MC_TXN;}))kids.splice(at+1,0,{id:EMS_MC_TXN,label:'Transactions',color:'green',icon:ico()});
        return Object.assign({},g,{children:kids});
      });
    };
  }
  if(typeof supportPageMeta!=='undefined')supportPageMeta[EMS_MC_TXN]={title:'Transactions',context:'Transactions',filters:[],columns:[],rows:[]};
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[EMS_MC_TXN]='cards';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(EMS_MC_TXN)<0)EMS_CLIENT_PAGES.push(EMS_MC_TXN);
  if(typeof APP_PAGE_PERMS!=='undefined'&&APP_PAGE_PERMS.cards)APP_PAGE_PERMS[EMS_MC_TXN]=APP_PAGE_PERMS.cards.slice();
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg===EMS_MC_TXN)return !emsMcAdmin()&&p0('card-list');
      return p0.apply(this,arguments);
    };
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){
      if(pg===EMS_MC_TXN){const r=n0.call(this,'card-list');emsMyTxnAll=true;emsMcSel=null;if(typeof renderADTPage==='function')renderADTPage();return r;}
      if(pg==='card-list'){emsMyTxnAll=false;emsMyTxnWallet='';emsMyTxnQ='';emsTxnSel=null;}
      return n0.apply(this,arguments);
    };
  }
  const onTxns=function(){return typeof page!=='undefined'&&page==='cards'&&!emsMcAdmin()&&emsMyTxnAll&&typeof ccPageTab!=='undefined'&&ccPageTab==='cards';};
  if(typeof getSidebarActivePage==='function'){
    const a0=getSidebarActivePage;
    getSidebarActivePage=function(pg){if(pg===EMS_MC_TXN||(pg==='cards'&&onTxns()))return EMS_MC_TXN;return a0.apply(this,arguments);};
  }
  if(typeof getPageTitle==='function'){
    const t1=getPageTitle;
    getPageTitle=function(pg){if(pg===EMS_MC_TXN||(pg==='cards'&&onTxns()))return 'Transactions';return t1.apply(this,arguments);};
  }
})();
