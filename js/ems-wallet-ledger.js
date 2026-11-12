/* ══ WALLET LEDGER - balances per employee and wallet ═════════════════════
   The provider ledger EMS reads balances from. Today the card provider is not
   connected, so the ledger is built from ADT's own card records: executed
   wallet loads credit a wallet, posted card transactions debit it, refunds
   and reversals credit it back. Entries carry their source: Illustrative
   (the presentation company) or recorded (verified evidence).
   When the provider is connected, emsLedgerEntries() is the one function to
   replace with its API; every screen below reads through it.

   Entitled comes from Wallet & Benefits (policy-based, worked out
   automatically); a planned or approved amount is never a balance - only
   executed loads are. */
function emsLedgerOn(){return typeof ccLoads!=='undefined'&&typeof ccTxns!=='undefined';}
function emsLedgerIllustrative(ent){return typeof ccDemoOn==='function'&&ccDemoOn(ent||idEntity());}
/* Every ledger entry of one employee in the active company, newest first; with cardId, that card's only. */
function emsLedgerEntries(eid,cardId){
  if(!emsLedgerOn()||!eid)return [];
  const ent=idEntity(),out=[];
  ccLoads.forEach(function(l){
    if(l.employeeEid!==eid||l.entity!==ent||!l.exec||(cardId!=null&&l.cardId!==cardId))return;
    const amt=(l.exec.recorded||0)-(l.exec.reversed||0);if(!(amt>0))return;
    const ev=(l.exec.events||[]).filter(function(e){return e.date;}).slice(-1)[0];
    out.push({date:(ev&&ev.date)||String(l.createdAt||'').split(' | ')[0],ref:expKey(l),wallet:l.wallet,kind:'Wallet load',text:(l.allocId?'Benefit credit':'Card load')+(l.reason?' · '+l.reason:''),
      amount:typeof ccToCard==='function'?ccToCard(l,amt):amt,sign:1,illustrative:l.exec.demo===true});
  });
  ccTxns.forEach(function(t){
    if(t.employeeEid!==eid||t.entity!==ent||t.status!=='Posted'||(cardId!=null&&t.cardId!==cardId))return;
    if(!t.demo&&t.verify&&t.verify.status&&t.verify.status!==CCT_VERIFIED)return;   // manual records count once verified
    const credit=t.direction==='Credit';
    out.push({date:t.postDate||t.date,ref:expKey(t),wallet:t.wallet,kind:credit?(t.type||'Refund'):'Card spend',text:t.merchant||'',amount:t.billAmount,sign:credit?1:-1,illustrative:!!t.demo,txnId:t.id});
  });
  return out.sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
}
/* Per wallet: loaded, spent, refunded and the available balance (of one card, with cardId). */
function emsLedgerWallets(eid,cardId){
  const by={};
  emsLedgerEntries(eid,cardId).forEach(function(e){
    const w=by[e.wallet]||(by[e.wallet]={code:e.wallet,loaded:0,spent:0,refunded:0,illustrative:false});
    if(e.kind==='Wallet load')w.loaded+=e.amount;else if(e.sign<0)w.spent+=e.amount;else w.refunded+=e.amount;
    if(e.illustrative)w.illustrative=true;
  });
  Object.keys(by).forEach(function(k){const w=by[k];w.available=Math.round((w.loaded-w.spent+w.refunded)*100)/100;});
  return by;
}
/* This month's entitlement per wallet code, from the employee's benefit policies. */
function emsLedgerEntitled(eid){
  const out={};if(typeof wbEmployees!=='function')return out;
  const emp=wbEmployees().find(function(x){return x.eid===eid;});if(!emp)return out;
  const per=wbToday().slice(0,7);
  wbMine(wbCategories).forEach(function(c){
    const w=wbWalletOf(c);if(!w)return;
    const r=wbResolve(emp,c,per);if(!r||!wbAllocatable(r))return;
    out[w.type]=(out[w.type]||0)+r.amount;
  });
  return out;
}
/* The month's allocation of a benefit that is already on the card: an executed benefit load (its key), else ''. */
function wbLoadedThisPeriod(eid,catId,per){
  if(!emsLedgerOn()||typeof wbBatches==='undefined')return '';
  const ids=[];wbMine(wbBatches).forEach(function(b){if(b.period!==per)return;b.rows.forEach(function(x){if(x.eid===eid&&x.categoryId===catId)ids.push(x.id);});});
  if(!ids.length)return '';
  const l=ccLoads.find(function(l){return l.allocId&&ids.indexOf(l.allocId)>=0&&l.exec&&((l.exec.recorded||0)-(l.exec.reversed||0))>0;});
  return l?expKey(l):'';
}
function emsLedgerName(code){return typeof wbTypeName==='function'?wbTypeName(code):code;}
/* My Wallets: entitled, loaded, spent and available per wallet, and the history. */
function emsLedgerHTML(eid,self,o){
  o=o||{};
  const by=emsLedgerWallets(eid),ent=emsLedgerEntitled(eid);
  const codes=Object.keys(ent).concat(Object.keys(by).filter(function(k){return !(k in ent);}));
  (o.codes||[]).forEach(function(k){if(codes.indexOf(k)<0)codes.push(k);});   // every wallet on the card, loaded or not
  if(!codes.length)return '';
  const ill=emsLedgerIllustrative();
  const money=function(n){return typeof wbMoney==='function'?wbMoney(n):expMoney(n,'INR');};
  const rows=codes.map(function(k){
    const w=by[k]||{loaded:0,spent:0,refunded:0,available:0};
    const on=!o.pick&&emsLedgerWalletF===k;
    return '<tr><td class="csag-td"><button class="att-link" title="'+(o.pick?'Wallet details':'Show this wallet\'s history')+'" onclick="'+(o.pick||'emsLedgerPick')+'(\''+k+'\')"><b>'+sbEsc(emsLedgerName(k))+'</b></button>'+(on?' <span class="ax-sub">shown below</span>':'')+'</td><td class="csag-td wb-num">'+(ent[k]!=null?money(ent[k]):'—')+'</td>'
      +'<td class="csag-td wb-num">'+money(w.loaded)+'</td><td class="csag-td wb-num">'+money(w.spent-w.refunded)+'</td>'
      +'<td class="csag-td wb-num"><b>'+(ill||w.loaded>0?money(w.available):'—')+'</b></td></tr>';
  }).join('');
  if(emsLedgerWalletF&&codes.indexOf(emsLedgerWalletF)<0)emsLedgerWalletF='';
  const hist=o.history===false?[]:emsLedgerEntries(eid).filter(function(e){return !emsLedgerWalletF||e.wallet===emsLedgerWalletF;}).slice(0,12);
  return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">'+(o.title||(self?'My Wallets':'Wallets'))
      +(ill?' <span class="lp-status-badge tone-info" title="Simulated provider data">Illustrative</span>':'')+'</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Wallet</th><th class="wb-num">Entitled (this month)</th><th class="wb-num">Loaded</th><th class="wb-num">Spent</th><th class="wb-num">Available</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +(o.history===false?'':'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Wallet History'+(emsLedgerWalletF?' · '+sbEsc(emsLedgerName(emsLedgerWalletF)):'')+'</span>'
      +(emsLedgerWalletF?'<button class="att-link" onclick="emsLedgerPick(\'\')">Show all wallets</button>':'')+'</div>'
    +(hist.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Wallet</th><th class="wb-num">Amount</th><th>Action</th></tr></thead><tbody>'
      +hist.map(function(e){return '<tr><td class="csag-td">'+sbEsc(typeof cdLabel==='function'&&/^\d{4}-/.test(e.date)?cdLabel(e.date):e.date)+'</td><td class="csag-td">'+sbEsc(e.ref)+'</td>'
        +'<td class="csag-td" style="white-space:normal">'+sbEsc(e.kind)+(e.text?' · '+sbEsc(e.text):'')+emsLedgerLineInfo(e)+'</td><td class="csag-td">'+sbEsc(emsLedgerName(e.wallet))+'</td>'
        +'<td class="csag-td wb-num"'+(e.sign<0?'':' style="color:var(--st-ok-fg)"')+'>'+(e.sign<0?'−':'+')+money(e.amount)+'</td>'
        +'<td class="csag-td">'+(emsLedgerActs(e)||'—')+'</td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No wallet activity yet.</div>'));
}

/* ── One line per card payment (product owner, 9 Nov 2026) ────────────────
   Every payment from the card shows in Wallet History, under the wallet it
   was paid from. A benefit-wallet payment (Meal, Fuel) is the employee's own
   benefit already on the card: no claim and no approval; the line offers
   Raise Dispute and Add Note. A Corporate-wallet payment is company money:
   its line also offers Create Expense, and the claim is approved as before. */
let emsLedgerWalletF='',emsNoteModal=null;
/* The page (where the popups open), then an open employee panel showing the wallets. */
function emsLedgerRedraw(){
  renderADTPage();
  if(typeof page!=='undefined'&&page==='employees'&&typeof deSelectedId!=='undefined'&&deSelectedId!=null&&typeof isbTab==='function'&&typeof renderDeSidebar==='function')isbTab('de',renderDeSidebar);
}
function emsLedgerPick(k){emsLedgerWalletF=emsLedgerWalletF===k?'':k;emsLedgerRedraw();}
function emsLedgerTxn(e){return e&&e.txnId&&typeof ccTxn==='function'?ccTxn(e.txnId):null;}
/* The line's own trail: the latest note, any dispute, the claim it belongs to. */
function emsLedgerLineInfo(e){
  const t=emsLedgerTxn(e);if(!t||t.direction==='Credit')return '';
  const out=[];
  const n=(t.notes||[]).slice(-1)[0];
  if(n)out.push('Note: '+sbEsc(n.text)+' <span class="ax-sub">'+sbEsc(caN(n.by))+'</span>');
  (typeof ccDspOfTxn==='function'?ccDspOfTxn(t,false):[]).forEach(function(d){out.push('Dispute '+sbEsc(expKey(d))+' · '+sbEsc(d.status));});
  if(t.walletClass!=='Flexi Benefit'&&typeof ccTxnFree==='function'){const f=ccTxnFree(t,t.currency);if(f&&f.claim)out.push('Expense '+sbEsc(expKey(f.claim))+' · '+sbEsc(f.claim.status));}
  return out.length?'<div class="ax-sub" style="white-space:normal">'+out.join('<br>')+'</div>':'';
}
function emsNoteMay(t,A){
  A=A||(typeof ccNow==='function'?ccNow():null);if(!t||!A)return false;
  if(typeof idUserOfEmp==='function'&&idUserOfEmp(t.employeeEid)===A.who)return true;   // the cardholder
  return ccPCan(A,'card.dispute.manage')||ccPCan(A,'card.transaction.verify');            // Finance and card administration
}
function emsLedgerActs(e){
  const t=emsLedgerTxn(e);if(!t||t.direction==='Credit')return '';
  /* The same transaction actions as Corporate Cards → My Cards (js/ems-mycards.js), plus Add Note. */
  if(typeof emsTxnActs==='function')return [emsTxnActs(t)].concat(emsNoteMay(t)?['<button class="att-link" onclick="emsNoteOpen('+t.id+')">Add Note</button>']:[]).filter(Boolean).join('<br>');
  const out=[];
  if(typeof ccDspMayRaise==='function'&&ccDspMayRaise(t))out.push('<button class="att-link" onclick="ccMxOpen(\'dsp-raise\',{txnId:'+t.id+'})">Raise Dispute</button>');
  if(emsNoteMay(t))out.push('<button class="att-link" onclick="emsNoteOpen('+t.id+')">Add Note</button>');
  if(t.walletClass!=='Flexi Benefit'&&typeof ccTxnExpenseWhyNot==='function'&&!ccTxnExpenseWhyNot(t))out.push('<button class="att-link" onclick="ccTxnCreateExpense('+t.id+')">Create Expense</button>');
  return out.join('<br>');
}
/* A note on a card transaction: the cardholder's (or Finance's) remark, kept on the transaction's log. */
function ccTxnAddNote(id,text,A){
  A=A||ccNow();const t=ccTxn(id);text=String(text||'').trim();
  if(!t||t.entity!==ccEnt())return {error:'No such transaction.'};
  if(!emsNoteMay(t,A))return {error:caN(A.who)+' cannot add a note to '+expKey(t)+'.'};
  if(!text)return {error:'Note is required.'};
  if(text.length>500)return {error:'A note has at most 500 characters.'};
  t.notes=t.notes||[];t.notes.push({text:text,by:A.who,actual:caVia(A),at:ccStamp(A)});
  ccLog(t,t.status,'Note added: '+text,A);
  return {rec:t};
}
function emsNoteOpen(id){emsNoteModal={txnId:id};emsLedgerRedraw();}
function emsNoteClose(){emsNoteModal=null;emsLedgerRedraw();}
function emsNoteSave(){
  const m=emsNoteModal;if(!m)return;const el=document.getElementById('ems-note-text');
  const r=ccTxnAddNote(m.txnId,el?el.value:'');
  if(r.error){showToast('Note not added','error',r.error);return;}
  emsNoteModal=null;emsLedgerRedraw();showToast('Note added','success',expKey(r.rec)+' · '+r.rec.merchant+'.');
}
function emsNoteHTML(){
  const m=emsNoteModal,t=m?ccTxn(m.txnId):null;if(!t)return '';
  return bgModal('Add Note · '+expKey(t),sbEsc(t.merchant)+' · '+expMoney(t.billAmount,t.billCurrency||t.currency)+' · '+sbEsc(emsLedgerName(t.wallet))+' wallet',
    '<div class="ep-form-group"><label class="ep-form-label">Note <span class="req">*</span></label><textarea class="lp-logs-form-textarea" id="ems-note-text" maxlength="500" placeholder="Add a note to this payment"></textarea></div>',
    {close:'emsNoteClose()',btns:'<button class="ep-save-btn" onclick="emsNoteSave()">Add Note</button>'});
}
/* The note popup, and the Raise Dispute popup, wherever Wallet History is shown (they open on the card and expense pages already). */
(function(){
  if(typeof renderADTPage!=='function')return;
  const r0=renderADTPage;
  renderADTPage=function(){
    const out=r0.apply(this,arguments);
    const host=document.getElementById('adt-content');
    if(host&&emsNoteModal)host.insertAdjacentHTML('beforeend',emsNoteHTML());
    if(host&&typeof ccMxAct!=='undefined'&&ccMxAct&&String(ccMxAct.act)==='dsp-raise'&&page!=='cards'&&page!=='expenses'&&typeof ccMxHTML==='function')host.insertAdjacentHTML('beforeend',ccMxHTML());
    return out;
  };
})();
/* My Profile → Wallet & Benefits: the planned entitlements, then the wallets. */
(function(){
  if(typeof wbMyBenefitsHTML!=='function')return;
  const mb0=wbMyBenefitsHTML;
  wbMyBenefitsHTML=function(rec,self){
    const out=mb0.apply(this,arguments);
    const led=rec&&rec.eid?emsLedgerHTML(rec.eid,self==null?(typeof oncIsSelf==='function'&&oncIsSelf(rec)):self):'';
    if(!led)return out;
    const i=out.lastIndexOf('</div>');
    return i>0?out.slice(0,i)+led+out.slice(i):out+led;
  };
})();
