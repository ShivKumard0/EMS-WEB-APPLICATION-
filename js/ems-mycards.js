/* ══ EMPLOYEE CORPORATE CARDS (FR-CC-01, product owner, 9 Nov 2026) ═══════
   In an EMS client company the cardholder's own My Cards page shows only what
   the employee works with:
   1. My Cards: masked number, card name, type, status, and one Actions menu
      (the ADT three-line menu): View Details, Temporary Hold / Release,
      Report Lost or Stolen, Request Replacement, View Logs / History;
   2. Wallet Balances (a wallet opens its details);
   3. Pending Actions, only when there are any;
   4. Recent Transactions (the latest five) with View All.
   Card Details holds the wallets, loads, transactions and activity history;
   every card action is in that history with its user, time and status.
   Transaction Details holds the linked expense, the dispute with its
   history, receipts and notes, with Add Expense / View Expense and Raise
   Dispute / View Dispute. The transaction stays the financial record; a
   card-paid claim never creates a reimbursement. The admin's Cardholder
   View and card panel are unchanged, and so is My Cards in OpenDhi's own
   companies. */
let emsMyTxnAll=false,emsMyTxnWallet='',emsCardModal=null,emsWalletModal=null,emsTxnSel=null,emsTxnTab='basic-details';
const EMS_DOTS='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
function emsMyCardsOn(eid){
  if(typeof emsClientOnly!=='function'||!emsClientOnly())return false;
  const me=typeof ccEmpOf==='function'?ccEmpOf():null;
  return !!me&&(!eid||me.eid===eid);
}
/* The record keeps its source; the screen does not say "Illustrative" (product owner, 9 Nov 2026). */
function emsPlainText(t){return String(t||'').replace(/\s*·\s*Illustrative\b.*$/,'').replace(/\s*\(Illustrative[^)]*\)/g,'').replace(/\bIllustrative\s+/g,'');}
/* The ADT row Actions menu (three-line icon), as on the record lists. Items: {label, call, danger}. */
function emsMenu(id,items){
  if(!items.length)return '—';
  /* One choice: the ☰ does it directly, no menu. */
  if(items.length===1)return '<button class="ct-dots-btn" title="'+items[0].label+'" onclick="'+items[0].call+'">'+EMS_DOTS+'</button>';
  return '<div class="ct-action-wrap"><button class="ct-dots-btn" title="Actions" onclick="ccXActToggle(\''+id+'\',event)">'+EMS_DOTS+'</button>'
    +'<div class="ct-action-menu emp-act-menu" id="'+id+'">'+items.map(function(i){
      return '<div class="ct-act-item emp-act-item next'+(i.danger?' branch':'')+'" onclick="ccXActClose();'+i.call+'"><span class="emp-act-label">'+i.label+'</span></div>';}).join('')+'</div></div>';
}

/* ── Disputes: one dispute per transaction for the employee ──
   A transaction that has a dispute (open or closed) shows View Dispute; a closed
   dispute is reopened only under the dispute rules, never raised again. */
function emsDspExisting(t){const ds=typeof ccDspOfTxn==='function'?ccDspOfTxn(t,true):[];return ds.length?ds[0]:null;}   // the latest (newest first)

/* ── A transaction's actions, the same wherever the employee sees it ── */
function emsTxnItems(t,o){
  o=o||{};const it=[],add=function(l,call,d){it.push({label:l,call:call,danger:!!d});};
  if(o.details!==false)add('View Details','emsTxnOpen('+t.id+')');
  if(t.direction!=='Credit'){
    const ex=emsDspExisting(t);
    if(ex)add('View Dispute','emsTxnOpen('+t.id+',\'dispute\')');
    else if(typeof ccDspMayRaise==='function'&&ccDspMayRaise(t))add('Raise Dispute','emsTxnOpen('+t.id+',\'dispute\')');
    if(t.walletClass!=='Flexi Benefit'){   // benefit-wallet spending is never claimed (Build 8 rule)
      const c=typeof ccTxnHolderClaim==='function'?ccTxnHolderClaim(t):null;
      if(c)add('View Expense','ccOpenExpense('+c.id+')');
      else if(typeof ccTxnExpenseWhyNot==='function'&&!ccTxnExpenseWhyNot(t))add('Add Expense','ccTxnCreateExpense('+t.id+')');
    }
  }
  return it;
}
/* As links (My Profile → Wallet History). */
function emsTxnActs(t,o){return emsTxnItems(t,o).map(function(i){return '<button class="att-link" onclick="'+i.call+'">'+i.label+'</button>';}).join((o&&o.sep)||'<br>');}
function emsTxnWhen(t){
  const ts=typeof ccTxnLocalTs==='function'?ccTxnLocalTs(t):'',d=ts?ts.slice(0,10):(t.postDate||t.date||'');
  return {date:d,day:(d&&/^\d{4}-/.test(d)?cdLabel(d):d),time:ts&&ts.length>=16?ts.slice(11,16):''};
}
/* The employee's own transactions in this company, newest first. */
function emsMyTxns(eid){
  return ccTxns.filter(function(t){return t.employeeEid===eid&&t.entity===ccEnt()&&(typeof ccTxnVisible!=='function'||ccTxnVisible(t));})
    .sort(function(a,b){const x=emsTxnWhen(b),y=emsTxnWhen(a),kx=x.date+' '+x.time,ky=y.date+' '+y.time;return kx<ky?-1:kx>ky?1:b.id-a.id;});
}
function emsTxnRefs(t){
  const out=[],credit=t.direction==='Credit';
  const c=!credit&&t.walletClass!=='Flexi Benefit'&&typeof ccTxnHolderClaim==='function'?ccTxnHolderClaim(t):null;
  if(c)out.push(ccE(expKey(c))+' · '+ccE(c.status));
  (typeof ccDspOfTxn==='function'?ccDspOfTxn(t,true):[]).forEach(function(d){out.push(ccE(expKey(d))+' · '+ccE(emsDspLabel(d)));});
  if(credit&&t.refundOf&&t.refundOf.key)out.push(ccE(t.type||'Credit')+' of '+ccE(t.refundOf.key));
  return out;
}
function emsTxnRow(t){
  const credit=t.direction==='Credit',cur=t.billCurrency||t.currency,amt=t.billAmount!=null?t.billAmount:t.amount,w=emsTxnWhen(t),refs=emsTxnRefs(t);
  return '<tr class="etx-row'+(emsTxnSel===t.id?' lp-row-selected':'')+'" id="etx-row-'+t.id+'" style="cursor:pointer" onclick="emsTxnOpen('+t.id+')"><td><b>'+ccE(expKey(t))+'</b></td><td>'+ccE(w.day)+(w.time?'<div class="ax-sub">'+ccE(w.time)+'</div>':'')+'</td>'
    +'<td>'+ccE(t.merchant||'')+'</td><td>'+ccE(typeof wbTypeName==='function'?wbTypeName(t.wallet):t.wallet)+(function(){const c=t.cardId!=null?ccCard(t.cardId):null;return c&&ccCardsOfEmp(c.employeeEid).length>1?'<div class="ax-sub">'+ccE(ccMask(c.last4))+'</div>':'';})()+'</td>'
    +'<td class="wb-num"'+(credit?' style="color:var(--st-ok-fg)"':'')+'>'+(credit?'+':'')+ccE(expMoney(amt,cur))+'</td>'
    +'<td>'+axBadge(statusTone(t.status),t.status)+(refs.length?'<div class="ax-sub">'+refs.join('<br>')+'</div>':'')+'</td>'
    /* The row's ☰ opens the transaction straight away, as on Advances; its actions are in the panel. */
    +'<td onclick="event.stopPropagation()"><button class="ct-dots-btn" title="View Details" onclick="emsTxnOpen('+t.id+')">'+EMS_DOTS+'</button></td></tr>';
}
function emsTxnTable(list){
  if(!list.length)return '<div class="wb-empty-sm">No card transaction yet.</div>';
  /* The list with the standard ADT side panel: a transaction opens beside it, as Advances and Expenses do. */
  const open=emsTxnSel!=null&&list.some(function(t){return t.id===emsTxnSel;});
  return ccSplit('etx','<table class="ax-hist sb-hist cc-holder-table" style="width:100%"><thead><tr><th>Transaction ID</th><th>Date</th><th>Merchant</th><th>Wallet</th><th class="wb-num">Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
    +list.map(emsTxnRow).join('')+'</tbody></table>',open,emsTxnSidebar);
}
/* Pending actions, only when the employee has something to do or follow. */
function emsPendHTML(pend){
  if(!pend.length)return '';
  /* Card payments that each need an expense claim read as one line (they are listed under View All). */
  const claim=pend.filter(function(x){return x.open==='txn'&&x.rec&&/needs an expense claim/i.test(x.text||'');});
  const rest=claim.length>1?pend.filter(function(x){return claim.indexOf(x)<0;}):pend;
  const group=claim.length>1?'<div class="wb-note is-wait"><b>Action needed</b><div class="wb-note-sub">'+claim.length+' card payments need an expense claim: '
    +claim.map(function(x){return '<button class="att-link" onclick="emsTxnOpen('+x.rec.id+',\'expense\')">'+ccE(expKey(x.rec))+'</button>';}).join(', ')+'.</div></div>':'';
  return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Pending Actions ('+(rest.length+(group?1:0))+')</span></div><div class="cc-holder-pend">'+group
    +rest.map(function(x){
      const r=x.rec,go=x.open==='txn'&&r?'<button class="att-link" onclick="emsTxnOpen('+r.id+')">Open</button>':x.open==='exc'&&r?'<button class="att-link" onclick="ccMxOpen(\'exc\',{key:\'txn:'+r.id+'\'})">Provide Information</button>'
        :x.open==='dsp'&&r?'<button class="att-link" onclick="ccOpenDisputeUI('+r.id+')">Open Dispute</button>':x.open==='csxrec'&&r?'<button class="att-link" onclick="ccCsxEmpRecOpen('+r.id+','+r.n+')">View Recovery</button>'
        :x.open==='csx'&&r?'<button class="att-link" onclick="ccCsxOpenUI('+r.id+')">Open</button>':x.open==='card'&&r?'<button class="att-link" onclick="emsCardOpen('+r.id+')">Open</button>'
        :x.open==='req'&&r?'<button class="att-link" onclick="ccOpenReqUI('+r.id+')">Open</button>':x.open==='onc'&&typeof ccOpenOwnEnrollment==='function'?'<button class="att-link" onclick="ccOpenOwnEnrollment()">Open Card Enrollment</button>':'';
      const rm=x.remind&&r?' · <button class="att-link" onclick="ccRemindClick('+r.id+')">Send me a reminder</button>':'';
      return '<div class="wb-note'+(x.kind==='action'?' is-wait':'')+'"><b>'+(x.kind==='action'?'Action needed':'In progress')+'</b><div class="wb-note-sub">'+ccE(x.text)+(go?' '+go:'')+rm+'</div></div>';
    }).join('')+'</div>';
}

/* ── Card actions: what the card's status and the person's rights allow ── */
function emsCardItems(c){
  const A=ccNow(),id=c.id,it=[],add=function(l,call,d){it.push({label:l,call:call,danger:!!d});};
  add('View Details','emsCardOpen('+id+')');
  if(!ccCardEnded(c)&&ccSafetyMay(A,c)){
    if(!(c.hold&&c.hold.active))add('Temporary Hold','ccActOpen(\'hold\','+id+')');
    else if(c.hold.type==='Temporary'){
      if(ccCan('card.lifecycle.manage'))add('Release Hold','ccActOpen(\'release\','+id+')');
      else if(!c.hold.releaseRequest)add('Request Hold Release','ccActOpen(\'release-request\','+id+')');   // reviewed by a card administrator
    }
    if(!(c.hold&&c.hold.active&&c.hold.type!=='Temporary'))add('Report Lost or Stolen','ccActOpen(\'lost\','+id+')',true);
  }
  if(['Not Issued','Issuance Pending','Replaced','Closed'].indexOf(c.status)<0&&!ccOpenReplacementOf(c.id)&&!ccRepMayRaise(A,c))add('Request Replacement','ccActOpen(\'replace\','+id+')');
  if(c.status==='Activation Pending')add('Send Me an Activation Reminder','ccRemindClick('+id+')');
  add('View Logs / History','emsCardOpen('+id+',\'logs\')');
  return it;
}

function emsMyCardsHTML(eid){
  const e=idEmp(eid),A=ccNow();
  const cards=ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt()&&(typeof ccCardVisible!=='function'||ccCardVisible(c));});
  /* One card, many wallets: once the employee holds the card, the same form asks for another wallet on it. */
  const holds=cards.some(function(c){return typeof emsCardOfEmp==='function'&&emsCardOfEmp(eid,c.programmeId)===c;});
  const qa=ccProgs().some(function(p){return ccProgActive(p)&&!ccReqMayRaise(A,eid,p);})?ccBtn(holds?'Request Wallet':'Request Card','ccReqStart(null,{employeeEid:\''+eid+'\'})',true):'';
  const head='<div class="lp-sb-view-header cc-holder-head"><span class="lp-sb-section-title">My Corporate Cards <span class="ax-sub">'+ccE(e.empId||'')+(e.dept?' · '+ccE(e.dept):'')+'</span></span>'
    +(qa?'<span class="ca-actions">'+qa+'</span>':'')+'</div>';
  const txns=emsMyTxns(eid);
  if(emsMyTxnAll){
    const ws=[];txns.forEach(function(t){if(ws.indexOf(t.wallet)<0)ws.push(t.wallet);});
    if(emsMyTxnWallet&&ws.indexOf(emsMyTxnWallet)<0)emsMyTxnWallet='';
    const shown=txns.filter(function(t){return !emsMyTxnWallet||t.wallet===emsMyTxnWallet;});
    const chip=function(k,l){return '<button class="att-link"'+(emsMyTxnWallet===k?' style="font-weight:700;text-decoration:underline"':'')+' onclick="emsMyTxnPick(\''+k+'\')">'+ccE(l)+'</button>';};
    return '<div class="cc-holder">'+head
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">All Transactions ('+shown.length+')</span><button class="att-link" onclick="emsMyTxnView(false)">Back to My Cards</button></div>'
      +'<div class="ea-hint" style="margin:0 0 8px">Wallet: '+[chip('','All')].concat(ws.map(function(w){return chip(w,wbTypeName(w));})).join(' · ')+'</div>'
      +emsTxnTable(shown)+'</div>';
  }
  /* 1 · My Cards, each shown as the card itself, with its status and one Actions menu (product owner, 10 Nov 2026). */
  const cardsT='<div class="lp-sb-view-header"><span class="lp-sb-section-title">My Cards ('+cards.length+')</span></div>'
    +(cards.length?'<div class="emsvc-list">'+cards.map(emsCardItemHTML).join('')+'</div>'
      :'<div class="wb-empty-sm">You have no corporate card yet. Request one under My Requests.</div>');
  /* 2 · Wallet balances (a wallet opens its details). */
  const onCards=[];cards.forEach(function(c){if(!ccCardEnded(c)&&typeof ccCardWallets==='function')ccCardWallets(c).forEach(function(w){if(onCards.indexOf(w)<0)onCards.push(w);});});
  const walletsT=typeof emsLedgerHTML==='function'?emsLedgerHTML(eid,true,{history:false,title:'Wallet Balances',pick:'emsWalletOpen',codes:onCards}):'';
  /* 3 · Pending actions, 4 · recent transactions. */
  const recent='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Recent Transactions</span>'
    +(txns.length?'<button class="att-link" onclick="emsMyTxnView(true)">View All ('+txns.length+')</button>':'')+'</div>'
    +emsTxnTable(txns.slice(0,5));
  return '<div class="cc-holder">'+head+cardsT+walletsT+emsPendHTML(ccPendingActions(eid))+recent+'</div>';
}
function emsMyTxnView(all){emsMyTxnAll=!!all;if(!all)emsMyTxnWallet='';renderADTPage();}
function emsMyTxnPick(w){emsMyTxnWallet=w;renderADTPage();}

/* ── Card Details / Card Logs ── */
function emsCardOpen(id,view){const c=ccCard(id);if(!c)return;emsCardModal={id:id,view:view||'details'};renderADTPage();}
function emsCardClose(){emsCardModal=null;if(typeof ccAct!=='undefined'&&ccAct&&ccAct.inLogs)ccAct=null;renderADTPage();}
/* The card's activity: its own log (every card action, with user and resulting status), its request's log and its loads. */
function emsCardLogs(c){
  const rows=[],t=function(x){return Date.parse(String(x.date||'')+' '+String(x.time||''))||0;};
  const push=function(logs){(logs||[]).forEach(function(x){rows.push({t:t(x),date:x.date,time:x.time,by:x.user||'',action:emsPlainText(x.action),status:emsPlainText(x.status)});});};
  push(c.logs);
  const r=ccReq(c.requestId);if(r)push(r.logs);
  /* Loads: their outcome only - load logs name funding sources, which the cardholder does not see (FR-CC-16.11). */
  ccLoads.filter(function(l){return l.cardId===c.id;}).forEach(function(l){const x=(l.logs||[])[0];if(!x)return;
    const done=l.exec&&((l.exec.recorded||0)-(l.exec.reversed||0))>0;
    rows.push({t:t(x),date:x.date,time:x.time,by:x.user||'',action:wbTypeName(l.wallet)+' load '+expKey(l)+' of '+expMoney(l.amount,l.currency),status:done?'Loaded':emsPlainText(typeof ccLoadLabel==='function'?ccLoadLabel(l):l.status)});});
  return rows.sort(function(a,b){return b.t-a.t;});
}
function emsLogTable(rows){
  return rows.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>When</th><th>By</th><th>Action</th><th>Status</th></tr></thead><tbody>'
    +rows.map(function(x){return '<tr><td>'+ccE(x.date)+'<div class="ax-sub">'+ccE(x.time)+'</div></td><td>'+ccE(x.by||'—')+'</td><td>'+ccE(x.action)+'</td><td>'+(x.status?axBadge(statusTone(x.status),x.status):'—')+'</td></tr>';}).join('')+'</tbody></table></div>'
    :'<div class="wb-empty-sm">No activity yet.</div>';
}
function emsCardHTML(){
  const m=emsCardModal,c=m?ccCard(m.id):null;if(!c)return '';
  const sec=function(t){return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">'+t+'</span></div>';};
  const logs=emsCardLogs(c);
  /* In the ADT Logs format with the cardholder's own actions: Select action → its fields → Note → Submit (product owner, 10 Nov 2026). */
  if(m.view==='logs')return bgModal('Card Logs / History · '+ccMask(c.last4),'',typeof ccCardLogsHTML==='function'
      ?ccCardLogsHTML(c,logs.map(function(x){return {date:x.date,time:x.time,user:x.by,status:x.status,action:x.action};})):emsLogTable(logs),{close:'emsCardClose()',btns:''});
  const p=ccProg(c.programmeId),s=typeof ccCardCtl==='function'?ccCardCtl(c):null;
  const row=function(l,v){return '<tr><td style="width:38%;color:var(--gray)">'+l+'</td><td>'+v+'</td></tr>';};
  const by=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid):{};
  const ws=(typeof ccCardWallets==='function'?ccCardWallets(c):(p&&p.wallets||[])).map(function(w){const x=by[w]||{loaded:0,spent:0,refunded:0,available:0};
    return '<tr><td><b>'+ccE(wbTypeName(w))+'</b></td><td class="wb-num">'+ccE(expMoney(x.loaded,c.currency))+'</td><td class="wb-num">'+ccE(expMoney(x.spent,c.currency))+'</td><td class="wb-num">'+ccE(expMoney(x.refunded,c.currency))+'</td><td class="wb-num"><b>'+ccE(expMoney(x.available,c.currency))+'</b></td></tr>';}).join('');
  const loads=ccLoads.filter(function(l){return l.cardId===c.id;});
  const txns=emsMyTxns(c.employeeEid).filter(function(t){return t.cardId===c.id;});
  const body='<div class="emsvc-modal">'+emsCardVisual(c)+'</div><div class="sb-hist-wrap"><table class="ax-hist sb-hist"><tbody>'
      +row('Card Name',ccE(p?p.name:''))+row('Card Number',ccE(ccMask(c.last4))+' <span class="ax-sub">'+ccE(expKey(c))+'</span>')+row('Card Type',ccE(c.type))
      +row('Card Status',axBadge(statusTone(c.status),c.status))+row('Controls in Effect',ccE(s&&typeof ccCtlSummary==='function'?ccCtlSummary(s,c.currency):'As programme'))+row('Card Provider',ccE(typeof ccProviderName==='function'?ccProviderName(c.provider):c.provider||''))
    +'</tbody></table></div>'
    +sec('Wallets')+'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Wallet</th><th class="wb-num">Loaded</th><th class="wb-num">Spent</th><th class="wb-num">Refunds</th><th class="wb-num">Available</th></tr></thead><tbody>'+ws+'</tbody></table></div>'
    +sec('Loads ('+loads.length+')')+(loads.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Load</th><th>Wallet</th><th class="wb-num">Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>'
      +loads.map(function(l){return '<tr><td>'+ccE(expKey(l))+'</td><td>'+ccE(wbTypeName(l.wallet))+'</td><td class="wb-num">'+ccE(expMoney(l.amount,l.currency))+'</td><td>'+(l.exec&&((l.exec.recorded||0)-(l.exec.reversed||0))>0?axBadge('ok','Loaded'):(typeof ccLoadBadge==='function'?ccLoadBadge(l):ccE(l.status)))+'</td><td>'+ccE(String(l.createdAt||'').split(' | ')[0])+'</td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No load yet.</div>')
    +sec('Transactions ('+txns.length+')')+(txns.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Transaction ID</th><th>Date</th><th>Merchant</th><th>Wallet</th><th class="wb-num">Amount</th><th>Status</th></tr></thead><tbody>'
      +txns.map(function(t){const credit=t.direction==='Credit',w=emsTxnWhen(t);return '<tr><td><button class="att-link" onclick="emsCardModal=null;ccOpenTxnUI('+t.id+')">'+ccE(expKey(t))+'</button></td><td>'+ccE(w.day)+'</td><td>'+ccE(t.merchant||'')+'</td><td>'+ccE(wbTypeName(t.wallet))+'</td>'
        +'<td class="wb-num">'+(credit?'+':'')+ccE(expMoney(t.billAmount!=null?t.billAmount:t.amount,t.billCurrency||t.currency))+'</td><td>'+axBadge(statusTone(t.status),t.status)+'</td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No transaction yet.</div>')
    ;   // the card's activity: ☰ → View Logs / History
  return bgModal('Card Details · '+ccMask(c.last4),'',body,{close:'emsCardClose()',btns:''});
}

/* ── Wallet Details: the wallet's breakdown and its movements ── */
function emsWalletOpen(code){const me=typeof ccEmpOf==='function'?ccEmpOf():null;if(!me)return;emsWalletModal={code:code,eid:me.eid};renderADTPage();}
function emsWalletClose(){emsWalletModal=null;renderADTPage();}
function emsWalletHTML(){
  const m=emsWalletModal;if(!m||typeof emsLedgerWallets!=='function')return '';
  const w=emsLedgerWallets(m.eid)[m.code]||{loaded:0,spent:0,refunded:0,available:0},ent=emsLedgerEntitled(m.eid)[m.code];
  const money=function(n){return typeof wbMoney==='function'?wbMoney(n):expMoney(n,'INR');};
  const row=function(l,v,b){return '<tr><td>'+l+'</td><td class="wb-num">'+(b?'<b>'+v+'</b>':v)+'</td></tr>';};
  const moves=emsLedgerEntries(m.eid).filter(function(e){return e.wallet===m.code;});
  const body='<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><tbody>'
      +(ent!=null?row('Entitled (this month)',money(ent)):'')+row('Wallet Loaded',money(w.loaded))+row('Card Spending',money(w.spent))+row('Refunds and Reversals',money(w.refunded))
      +row('Net Spending',money(w.spent-w.refunded))+row('Available Balance',money(w.available),true)
    +'</tbody></table></div>'
    +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Transaction History ('+moves.length+')</span></div>'
    +(moves.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="wb-num">Amount</th></tr></thead><tbody>'
      +moves.map(function(e){return '<tr><td>'+ccE(/^\d{4}-/.test(e.date)?cdLabel(e.date):e.date)+'</td><td>'+ccE(e.ref)+'</td><td>'+ccE(e.kind)+(e.text?' · '+ccE(e.text):'')+'</td>'
        +'<td class="wb-num"'+(e.sign<0?'':' style="color:var(--st-ok-fg)"')+'>'+(e.sign<0?'−':'+')+money(e.amount)+'</td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No movement yet.</div>');
  return bgModal(emsLedgerName(m.code)+' Wallet','',body,{close:'emsWalletClose()',btns:''});
}

/* ── Transaction Details: the standard ADT side panel, as Advances and Expenses ──
   Tabs: Basic Details (with the employee's actions), Expense, Dispute, Receipts &
   Notes, Logs, History. Only a receipt's file name is kept - never its content. */
function emsTxnOpen(id,tab){
  const t=ccTxn(id);if(!t)return;
  if(typeof page!=='undefined'&&page!=='cards')navigatePage('cards');
  if(typeof ccPageTab!=='undefined')ccPageTab='cards';
  emsTxnTab=tab||(emsTxnSel===t.id?emsTxnTab:'basic-details');emsTxnSel=t.id;
  /* A transaction beyond the latest five opens with the full list. */
  const me=typeof ccEmpOf==='function'?ccEmpOf():null;
  if(me&&!emsMyTxnAll&&emsMyTxns(me.eid).slice(0,5).indexOf(t)<0)emsMyTxnAll=true;
  if(emsMyTxnAll&&emsMyTxnWallet&&t.wallet!==emsMyTxnWallet)emsMyTxnWallet='';
  renderADTPage();
}
function emsTxnClose(){emsTxnSel=null;const sb=document.getElementById('etx-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.etx-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function emsTxnNav(tab){emsTxnTab=tab;isbTab('etx',emsTxnSidebar);}
function emsTxnAmt(t){const credit=t.direction==='Credit';return (credit?'+':'')+expMoney(t.billAmount!=null?t.billAmount:t.amount,t.billCurrency||t.currency);}
/* The transaction's details; the Source field is left out - in the presentation it would only say what is never shown. */
function emsTxnFields(t){
  const h=typeof ccTxnFieldsHTML==='function'?ccTxnFieldsHTML(t,false):'';
  return h.replace(/<div class="lp-sb-field-card[^"]*"><div class="lp-sb-field-icon">(?:(?!<\/div>)[\s\S])*<\/div><div class="lp-sb-field-content"><div class="lp-sb-field-label">Source<\/div><div class="lp-sb-field-value"><div>[^<]*<\/div><\/div><\/div><\/div>/,'');
}
/* The employee's actions on the transaction, as ADT buttons. */
function emsTxnButtons(t){
  const id=t.id,out=[];
  emsTxnItems(t,{details:false}).forEach(function(i){out.push(ccBtn(i.label,i.call,/^(Raise Dispute|Add Expense)$/.test(i.label)));});
  if(typeof emsNoteMay==='function'&&emsNoteMay(t)){
    out.push('<label class="btn btn-outline btn-sm" style="cursor:pointer">Attach Receipt<input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="emsTxnReceipt('+id+',this)"></label>');
    out.push(ccBtn('Add Note','emsNoteOpen('+id+')'));
  }
  if(!t.demo&&typeof ccTxnInfoOpen==='function'&&ccTxnInfoOpen(t))out.push(ccBtn('Provide Supporting Information','ccTxnActOpen(\'info\','+id+')'));
  return out.join('');
}
function emsTxnSec(x){return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">'+x+'</span></div>';}
function emsTxnExpenseHTML(t){
  const credit=t.direction==='Credit',benefit=t.walletClass==='Flexi Benefit';
  if(credit)return '<div class="wb-empty-sm">A '+ccE(String(t.type||'credit').toLowerCase())+(t.refundOf&&t.refundOf.key?' of '+ccE(t.refundOf.key):'')+': it is linked to its original payment, not claimed.</div>';
  if(benefit)return '<div class="wb-empty-sm">Paid from the '+ccE(wbTypeName(t.wallet))+' benefit wallet: no expense claim is needed.</div>';
  const c=typeof ccTxnHolderClaim==='function'?ccTxnHolderClaim(t):null;
  const due=!c&&typeof ccTxnClaimDue==='function'?ccTxnClaimDue(t):null,notReq=!!(due&&due.state==='Not Required');
  if(!c)return '<div class="wb-empty-sm">'+(notReq?'No expense claim is required for this card payment. Add one only if a business purpose or receipt is needed.':'No expense claim is linked yet.')+'</div>'+(typeof ccTxnExpenseWhyNot==='function'&&!ccTxnExpenseWhyNot(t)?'<div class="wb-actions">'+ccBtn('Add Expense','ccTxnCreateExpense('+t.id+')',true)+'</div>':'');
  const st=typeof caActiveStage==='function'?caActiveStage(c):null;
  return '<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Expense Claim',ccE(expKey(c))+' <span class="ax-sub">'+ccE(c.title||'')+'</span>')
    +axField(AX_ICO.fCheck,'Approval Status',axBadge(statusTone(c.status),c.status)+(st?' <span class="ax-sub">'+ccE(st.name||'')+'</span>':''))
    +axField(AX_ICO.fCash,'Claimed',ccE(expMoney(typeof expTotal==='function'?expTotal(c):0,c.currency)))
    +axField(AX_ICO.fBox,'Payment','Paid by Corporate Card <span class="ax-sub">no reimbursement</span>')
    +'</div><div class="wb-actions">'+ccBtn('View Expense','ccOpenExpense('+c.id+')')+'</div>';
}
/* The Dispute tab in the ADT Logs format (as Leave Logs): the status, a "Select action" dropdown, the note
   box with Submit, and the log below. A refund's dispute is raised on the payment it belongs to. */
function emsDspLabel(d){return d&&d.status==='Withdrawn'&&d.closed&&/^Resolved by the cardholder/.test(d.closed.reason||'')?'Resolved':d?d.status:'No Dispute';}
function emsDspTarget(t){return t.direction==='Credit'&&t.refundOf&&t.refundOf.id!=null?ccTxn(t.refundOf.id):t;}
function emsDspForm(t,d){
  const acts=emsDspActions(t,d);if(!acts.length)return '';
  const cur=d?d.status:'No Dispute';
  return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+ccE(cur)+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('edsp-status',cur,[cur].concat(acts))
    +'<div class="lp-logs-form-label">Note <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="edsp-comment" placeholder="'+(!d?'What is wrong with this payment':'Enter note')+'"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="emsTxnNav(\'dispute\')">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="emsDspSave('+t.id+')">Submit</button></div></div>';
}
/* The cardholder's note on their own dispute: in its log, and Finance is told. */
function emsDspNote(id,text){
  const A=ccNow(),d=ccDspGet(id);if(!d)return 'No such dispute.';
  const h=ccDspHolder(d),via=caVia(A);
  if(!(A.who===h||via===h||ccPCan(A,'card.dispute.manage')))return 'Only the cardholder or Finance adds a note to this dispute.';
  if(['Closed','Withdrawn'].indexOf(d.status)>=0)return expKey(d)+' is '+d.status+'.';
  text=String(text||'').trim();if(text.length<5)return 'Write the note (at least 5 characters).';
  d.holderNotes=(d.holderNotes||[]).concat([{text:text,by:A.who,actual:via,at:ccStamp(A)}]);
  ccLog(d,d.status,'Note by '+caN(A.who)+': '+text,A);
  if(typeof ccDspNotify==='function')ccDspNotify(d,[d.assignee].concat(typeof ccDspReviewers==='function'?ccDspReviewers(d):[]).filter(Boolean),'a note was added: '+text,'dsp-note-'+d.holderNotes.length,A);
  return '';
}
function emsDspSave(id){
  const t0=ccTxn(id);if(!t0)return;const t=emsDspTarget(t0);if(!t)return;const d=emsDspExisting(t);
  const act=typeof getCSValue==='function'?getCSValue('edsp-status'):'';
  const el=document.getElementById('edsp-comment'),note=el?el.value.trim():'';
  let err='',ok='';
  if(act==='Raise Dispute'){
    /* Raised as an unrecognized payment for the amount still disputable; the note tells Finance what is wrong. */
    if(note.length<10)err='Add a note of at least 10 characters.';
    else{const r=ccDspCreate({txnId:t.id,reason:'Unrecognized Transaction',description:note,evidence:'',amount:typeof ccDspRemaining==='function'?ccDspRemaining(t):t.billAmount,submit:true});
      if(r.error)err=r.error;else ok='Dispute '+expKey(r.rec)+' raised on '+expKey(t);}
  }else if(!d)err='Pick an action.';
  else if(act==='Add Note'){err=emsDspNote(d.id,note);ok='Note added to '+expKey(d);}
  else if(act==='Mark Resolved'){err=note.length<5?'Add a note on how it was resolved (at least 5 characters).':(ccDspWithdraw(d.id,'Resolved by the cardholder: '+note)||'');ok=expKey(d)+' marked resolved';}
  else if(act==='Provide Information'){err=ccDspRespond(d.id,{note:note,file:''});ok='Information sent for '+expKey(d);}
  else err='Pick an action.';
  if(err){showToast('Not saved','error',err);return;}
  emsTxnTab='dispute';renderADTPage();showToast(ok,'success',expKey(t)+' · '+t.merchant+'.');
}
function emsTxnDisputeHTML(t0){
  const t=emsDspTarget(t0);
  if(!t)return '<div class="wb-empty-sm">The original payment of this refund is not available.</div>';
  const d=emsDspExisting(t);
  /* Not open to a dispute (yet), and none raised: say why, from the dispute rule itself. */
  if(!d&&!emsDspActions(t,null).length)return '<div class="wb-empty-sm">'+ccE((typeof ccDspTxnWhyNot==='function'&&ccDspTxnWhyNot(t))||'This payment cannot be disputed.')+'</div>';
  const refund=t!==t0;
  const sub=!d?(refund?'This refund belongs to '+ccE(expKey(t))+' ('+ccE(t.merchant)+'): a dispute is raised on that payment. ':'')+'Raise a dispute on this payment and add a note.'
    :'Dispute '+ccE(expKey(d))+(refund?' on '+ccE(expKey(t)):'')+' · '+ccE(d.reason||'')+' · '+ccE(expMoney(d.amount,d.currency||t.currency))+'.';
  return typeof lpLogsView==='function'?lpLogsView(d?(d.logs||[]):[],emsDspForm(t0,d),{select:true,current:emsDspLabel(d),sub:sub}):'';
}
/* What the employee can do now (the Select action list). */
function emsDspActions(t,d){
  t=emsDspTarget(t);if(!t||t.direction==='Credit')return [];
  if(!d)return typeof ccDspMayRaise==='function'&&ccDspMayRaise(t)?['Raise Dispute']:[];
  if(['Closed','Withdrawn'].indexOf(d.status)>=0)return [];
  const out=[];
  if(d.status==='More Information Required')out.push('Provide Information');
  out.push('Add Note');
  if(['Draft','Submitted','Under Internal Review','More Information Required','Awaiting Provider'].indexOf(d.status)>=0)out.push('Mark Resolved');
  return out;
}
function emsTxnNotesHTML(t){
  const rc=t.receipts||[],nt=t.notes||[];
  const list=rc.length||nt.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Type</th><th>Detail</th><th>Added</th></tr></thead><tbody>'
      +rc.map(function(r){return '<tr><td>Receipt</td><td>'+ccE(r.name)+'</td><td>'+ccE(caN(r.by))+' <span class="ax-sub">'+ccE(String(r.at||'').split(' | ')[0])+'</span></td></tr>';}).join('')
      +nt.map(function(n){return '<tr><td>Note</td><td>'+ccE(n.text)+'</td><td>'+ccE(caN(n.by))+' <span class="ax-sub">'+ccE(String(n.at||'').split(' | ')[0])+'</span></td></tr>';}).join('')
    +'</tbody></table></div>':'<div class="wb-empty-sm">No receipt or note yet.</div>';
  const can=typeof emsNoteMay==='function'&&emsNoteMay(t);
  return list+(can?'<div class="wb-actions"><label class="btn btn-outline btn-sm" style="cursor:pointer">Attach Receipt<input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="emsTxnReceipt('+t.id+',this)"></label>'+ccBtn('Add Note','emsNoteOpen('+t.id+')')+'</div>':'');
}
function emsTxnSidebar(){
  const t=emsTxnSel!=null?ccTxn(emsTxnSel):null;if(!t)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'expense',label:'Expense'},{id:'dispute',label:'Dispute'},{id:'receipts',label:'Receipts & Notes'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
  if(!tabs.some(function(x){return x.id===emsTxnTab;}))emsTxnTab='basic-details';
  const hero=sbHero({icon:typeof CC_ICO!=='undefined'?CC_ICO.hero:'',name:ccE(t.merchant),meta:[expKey(t),ccE(ccMask(t.cardRef.last4)),ccE(wbTypeName(t.wallet)),ccE(emsTxnAmt(t))],status:typeof ccTxnBadge==='function'?ccTxnBadge(t.status):axBadge(statusTone(t.status),t.status)});
  let body;
  if(emsTxnTab==='expense')body=hero+emsTxnExpenseHTML(t);
  else if(emsTxnTab==='dispute')body=hero+emsTxnDisputeHTML(t);
  else if(emsTxnTab==='receipts')body=hero+emsTxnNotesHTML(t);
  else if(emsTxnTab==='logs')body=typeof lpLogsView==='function'?lpLogsView(t.logs||[],''):'';
  else if(emsTxnTab==='history')body=typeof sbHistoryHTML==='function'?sbHistoryHTML(t):'';
  else{const b=emsTxnButtons(t);body=hero+(b?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+b+'</span></div>':'')+emsTxnFields(t);}
  return axTabBar('etx',tabs,emsTxnTab,'emsTxnNav','emsTxnClose')+'<div class="lp-isb-body">'+body+'</div>';
}
/* A pop-up of the same content, if a transaction is opened as a pop-up elsewhere. */
function emsTxnDetailHTML(t){
  const body=emsTxnFields(t)+(t.direction!=='Credit'?emsTxnSec('Expense')+emsTxnExpenseHTML(t)+emsTxnSec('Dispute')+emsTxnDisputeHTML(t):'')+emsTxnSec('Receipts and Notes')+emsTxnNotesHTML(t);
  return bgModal('Card Transaction · '+ccE(expKey(t)),'',body,{close:'ccTxnActClose()',btns:''});
}
function emsTxnReceipt(id,input){
  const fl=input.files&&input.files[0];input.value='';if(!fl)return;
  if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}
  const t=ccTxn(id),A=ccNow();
  if(!t||t.entity!==ccEnt()||!emsNoteMay(t,A)){showToast('Not permitted','error','Only the cardholder or Finance adds a receipt to this transaction.');return;}
  t.receipts=t.receipts||[];t.receipts.push({name:fl.name,size:fl.size,by:A.who,actual:caVia(A),at:ccStamp(A)});
  ccLog(t,t.status,'Receipt attached: '+fl.name,A);
  renderADTPage();showToast('Receipt attached','success',expKey(t)+' · '+fl.name+'.');
}

/* ── Wiring ── */
(function(){
  /* The employee's own My Cards in an EMS client company. */
  if(typeof ccCardholderHTML==='function'){
    const h0=ccCardholderHTML;
    ccCardholderHTML=function(eid){
      if(!emsMyCardsOn(eid)||!idEmp(eid)||(typeof ccSeesEmp==='function'&&!ccSeesEmp(eid)))return h0.apply(this,arguments);
      return emsMyCardsHTML(eid);
    };
  }
  /* The employee's page is My Cards itself: no second list of the same card below it. */
  if(typeof ccCardsHTML==='function'){
    const l0=ccCardsHTML;
    ccCardsHTML=function(){
      const me=typeof ccEmpOf==='function'?ccEmpOf():null;
      if(!me||!emsMyCardsOn(me.eid)||(typeof ccAdminView==='function'&&ccAdminView()))return l0.apply(this,arguments);
      return '<div class="lp-page">'+(typeof dashboardBackHTML==='function'?dashboardBackHTML():'')+ccCardholderHTML(me.eid)+'</div>';
    };
  }
  /* The cardholder's transactions open in the side panel beside the list (no pop-up). */
  if(typeof ccOpenTxnUI==='function'){
    const x0=ccOpenTxnUI;
    ccOpenTxnUI=function(id,tab){
      const t=ccTxn(id);
      if(t&&emsMyCardsOn(t.employeeEid)&&!(typeof ccAdminView==='function'&&ccAdminView())){emsTxnOpen(id,tab==='matching'?'expense':undefined);return;}
      return x0.apply(this,arguments);
    };
  }
  /* The cardholder's own Transaction Details. */
  if(typeof ccTxnActHTML==='function'){
    const t0=ccTxnActHTML;
    ccTxnActHTML=function(){
      const a=typeof ccTxnAct!=='undefined'?ccTxnAct:null,t=a&&a.act==='view'?ccTxn(a.id):null;
      if(!t||!emsMyCardsOn(t.employeeEid))return t0.apply(this,arguments);
      return emsTxnDetailHTML(t);
    };
  }
  /* In a client company a transaction carries one dispute for the employee: once raised (open or closed), it is
     followed through View Dispute, and a closed one is reopened only under the dispute rules. */
  if(typeof ccDspMayRaise==='function'){
    const m0=ccDspMayRaise;
    ccDspMayRaise=function(t){if(t&&typeof emsClientOnly==='function'&&emsClientOnly()&&emsDspExisting(t))return false;return m0.apply(this,arguments);};
  }
  if(typeof ccDspCreate==='function'){
    const d0=ccDspCreate;
    ccDspCreate=function(o){
      const t=o&&o.txnId!=null?ccTxn(Number(o.txnId)):null,ex=t&&typeof emsClientOnly==='function'&&emsClientOnly()?emsDspExisting(t):null;
      if(ex)return {error:expKey(t)+' already has dispute '+expKey(ex)+' ('+ex.status+'). Open it to follow it; a closed dispute is reopened only under the dispute rules.'};
      return d0.apply(this,arguments);
    };
  }
  /* A provider event received again (same provider reference) is not recorded twice - the rule genuine
     records already follow (ccTxnDupOf); the presentation's simulated provider events follow it too. */
  if(typeof ccTxnSimulate==='function'){
    const s0=ccTxnSimulate;
    ccTxnSimulate=function(d){
      const ref=String(d&&d.extRef||'').trim().toLowerCase(),c=d&&d.cardId!=null?ccCard(Number(d.cardId)):null;
      if(ref&&c){
        const dup=ccTxns.find(function(t){return t.entity===c.entity&&t.provider===c.provider&&String(t.extRef||'').trim().toLowerCase()===ref;});
        if(dup)return {error:'Reference '+d.extRef+' is already recorded on '+expKey(dup)+'; one provider transaction is recorded once.',dupOf:dup.id};
      }
      return s0.apply(this,arguments);
    };
  }
  /* Opening one's own card there opens Card Details (the admin card panel is not part of the employee's page). */
  if(typeof ccOpenCardUI==='function'){
    const o0=ccOpenCardUI;
    ccOpenCardUI=function(id){
      const c=ccCard(id);
      if(c&&emsMyCardsOn(c.employeeEid)&&!(typeof ccAdminView==='function'&&ccAdminView())){if(typeof navigatePage==='function'&&page!=='cards')navigatePage('cards');emsCardOpen(id);return;}
      return o0.apply(this,arguments);
    };
  }
  if(typeof renderADTPage==='function'){
    const r0=renderADTPage;
    renderADTPage=function(){
      const out=r0.apply(this,arguments);
      const host=document.getElementById('adt-content');
      if(host&&emsCardModal)host.insertAdjacentHTML('beforeend',emsCardHTML());
      if(host&&emsWalletModal)host.insertAdjacentHTML('beforeend',emsWalletHTML());
      return out;
    };
  }
  /* Leaving Corporate Cards closes these views. */
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!==page){emsMyTxnAll=false;emsMyTxnWallet='';emsCardModal=null;emsWalletModal=null;emsTxnSel=null;}return n0.apply(this,arguments);};
  }
})();

/* ── The card, drawn as a card ────────────────────────────────────────────
   Blurred number and expiry; they show while the card is hovered, focused or tapped. In the presentation they read as
   the bank's secure card view would: made up when the card is drawn, from the card's own reference, and never saved
   (product owner, 10 Nov 2026). Anywhere else ADT shows only what it keeps: the last four digits. The CVV is never shown. */
function emsCardSecret(c){
  const l4=String(c.last4||'----');
  if(!(typeof PRES_ON!=='undefined'&&PRES_ON))return {num:'•••• •••• •••• '+l4,exp:'••/••'};
  let h=2166136261;
  (String(c.key)+'|'+c.id+'|'+c.employeeEid).split('').forEach(function(ch){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;});
  const d=('00000000'+(h%100000000)).slice(-8),iso=/^\d{4}-\d{2}/.test(c.issueDate||'')?c.issueDate:(typeof wbToday==='function'?wbToday():'2026-11-01');
  return {num:'6080 '+d.slice(0,4)+' '+d.slice(4)+' '+l4,exp:iso.slice(5,7)+'/'+String((Number(iso.slice(2,4))+5)%100).padStart(2,'0')};
}
function emsCardHolderName(c){
  const r=typeof oncRec==='function'?oncRec(c.employeeEid):null,n=r&&r.fields&&r.fields.nameOnCard;
  return String(n||ccHolderName(c)||'').toUpperCase();
}
const EMS_CARD_WAVES='<svg class="emsvc-waves" viewBox="0 0 340 214" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke-width="1.2">'
  +'<path d="M-10 150 C 70 110, 150 210, 350 120" stroke="rgba(255,96,130,.45)"/><path d="M-10 165 C 80 125, 160 220, 350 135" stroke="rgba(255,96,130,.30)"/>'
  +'<path d="M-10 180 C 90 140, 170 228, 350 150" stroke="rgba(255,255,255,.14)"/><path d="M120 -10 C 170 60, 260 40, 350 90" stroke="rgba(255,255,255,.08)"/></g></svg>';
const EMS_CONTACTLESS='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
  +'<path d="M8.5 8.5a5 5 0 0 1 0 7"/><path d="M12 6a8.5 8.5 0 0 1 0 12"/><path d="M15.5 3.5a12 12 0 0 1 0 17"/></svg>';
function emsCardVisual(c){
  const p=ccProg(c.programmeId),x=emsCardSecret(c),hold=c.hold&&c.hold.active;
  const ended=['Not Issued','Expired','Replaced','Closed','Blocked'].indexOf(c.status)>=0;
  const flag=hold?(c.hold.type==='Temporary'?'Temporary Hold':'Reported '+String(c.hold.reason||'').toLowerCase()):c.status!=='Active'?c.status:'';
  const bank=c.provider&&typeof ccProviderName==='function'?ccProviderName(c.provider):'';
  const real=typeof PRES_ON!=='undefined'&&PRES_ON;
  return '<div class="emsvc-card'+(ended?' is-ended':flag?' is-dim':'')+'" tabindex="0" onclick="this.classList.toggle(\'is-shown\')" title="'+(real?'Hover to see the card number':'Only the last four digits are kept in ADT')+'">'
    +EMS_CARD_WAVES
    +'<div class="emsvc-top"><span class="emsvc-brand"><span class="emsvc-mark">O</span>OpenDhi</span>'+(bank&&bank!=='No provider'?'<span class="emsvc-bank">'+ccE(bank.toUpperCase())+'</span>':'')+'</div>'
    +'<div class="emsvc-prog">'+ccE(p?p.name:'Corporate Card')+'</div>'
    +'<div class="emsvc-mid"><span class="emsvc-chip"></span>'+EMS_CONTACTLESS+(flag?'<span class="emsvc-flag">'+ccE(flag)+'</span>':'')+'</div>'
    +'<div class="emsvc-num emsvc-secret">'+ccE(x.num)+'</div>'
    +'<div class="emsvc-row"><div><div class="emsvc-lbl">CARDHOLDER</div><div class="emsvc-name">'+ccE(emsCardHolderName(c))+'</div></div>'
      +'<div><div class="emsvc-lbl">VALID THRU</div><div class="emsvc-exp emsvc-secret">'+ccE(x.exp)+'</div></div>'
      +'<div class="emsvc-net"><span class="emsvc-rupay">RuPay<i></i></span><span class="emsvc-prepaid">PREPAID</span></div></div>'
    +'</div>';
}
function emsCardItemHTML(c){
  const p=ccProg(c.programmeId);
  return '<div class="emsvc-item">'+emsCardVisual(c)
    +'<div class="emsvc-foot"><div class="emsvc-foot-l"><div class="lp-c-plain ax-c-trunc">'+ccE(p?p.name:'')+'</div><div class="ax-sub">'+ccE(expKey(c))+' · '+ccE(c.type)+'</div></div>'
      +'<div class="emsvc-foot-r">'+axBadge(statusTone(c.status),c.status)+emsMenu('ems-cm-'+c.id,emsCardItems(c))+'</div></div></div>';
}
