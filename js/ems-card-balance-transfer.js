/* ══ A REPLACEMENT CARD CARRIES THE OLD CARD'S BALANCE (product owner, 15 Nov 2026) ════════════════════════════════
   "Fill this with correct realistic data and sync it with the mobile device as well" - Card List → the new card →
   Wallets read 0 loaded / 0 available, because the money was loaded onto the card that was reported lost.
   Market standard: when a lost or stolen card is replaced, what is left in each wallet moves to the new card (the
   new card has a new number; the cardholder's money stays his). So, once the employee has an Active card again after
   a card disabled on a lost or stolen report, each wallet's remaining balance on the disabled card is transferred to
   the new card, once, and written to both cards' Logs:
   - the new card's Wallets tab shows it as Loaded and Available (Balance transferred from CRD-…);
   - the disabled card's Available goes to 0;
   - the employee's totals - My Cards, the dashboard's Card Balances and the phone - do not change: the money only
     moves between his two cards.
   Nothing is posted to a funding source and no load is created. Only in the presentation company. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof emsLedgerWallets!=='function'||typeof emsLedgerEntries!=='function'||typeof ccCards==='undefined')return;
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  const round=function(n){return Math.round((n||0)*100)/100;};
  const LIVE=['Active','Activation Pending','Issued','Suspended'];

  /* The per-card ledger with the transfers: in on the new card, out on the old one. The employee's own totals (no card
     given) are the same as before - the two entries cancel out. */
  const e0=emsLedgerEntries;
  emsLedgerEntries=function(eid,cardId){
    const out=e0.apply(this,arguments);
    if(cardId==null)return out;
    const c=ccCard(cardId);if(!c)return out;
    const push=function(x,sign,other){Object.keys(x.wallets||{}).forEach(function(k){const a=x.wallets[k];if(!(a>0))return;
      out.push({date:x.date,ref:expKey(c),wallet:k,kind:'Balance transfer',text:(sign>0?'Balance transferred from ':'Balance transferred to ')+expKey(other),amount:a,sign:sign,illustrative:true});});};
    if(c.xfer){const o=ccCard(c.xfer.from);if(o)push(c.xfer,1,o);}
    if(c.xferTo){const n=ccCard(c.xferTo);if(n&&n.xfer)push(n.xfer,-1,n);}
    return out.sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  };
  /* Loaded counts a transfer in; a transfer out is neither spending nor a refund - it only lowers Available. */
  const w0=emsLedgerWallets;
  emsLedgerWallets=function(eid,cardId){
    if(cardId==null)return w0.apply(this,arguments);
    const by={};
    emsLedgerEntries(eid,cardId).forEach(function(e){
      const w=by[e.wallet]||(by[e.wallet]={code:e.wallet,loaded:0,spent:0,refunded:0,transferred:0,illustrative:false});
      if(e.kind==='Wallet load'||(e.kind==='Balance transfer'&&e.sign>0))w.loaded+=e.amount;
      else if(e.kind==='Balance transfer')w.transferred+=e.amount;
      else if(e.sign<0)w.spent+=e.amount;else w.refunded+=e.amount;
      if(e.illustrative)w.illustrative=true;
    });
    Object.keys(by).forEach(function(k){const w=by[k];w.available=round(w.loaded-w.spent+w.refunded-w.transferred);});
    return by;
  };

  /* Once: an employee with an Active card again after a lost or stolen card was disabled. */
  const lostClosed=function(c){return c.status==='Closed'&&(c.csr||[]).some(function(r){return r.kind==='lost';});};
  function transfer(){
    const ent=nova();if(!ent)return 0;
    let n=0;
    ccCards.filter(function(o){return o.entity===ent&&!o.xferTo&&!o.xferChecked&&lostClosed(o);}).forEach(function(o){
      const nw=ccCards.filter(function(x){return x.entity===ent&&x.employeeEid===o.employeeEid&&x.programmeId===o.programmeId&&x.id!==o.id&&x.status==='Active'&&!x.xfer;})
        .sort(function(a,b){return b.id-a.id;})[0];
      if(!nw)return;
      /* The wallets the new card has (the phone shows those): a wallet switched off on it keeps its balance where it is. */
      const by=w0(o.employeeEid,o.id),ws={},on=typeof ccCardWallets==='function'?ccCardWallets(nw):Object.keys(by);
      Object.keys(by).forEach(function(k){const a=round(by[k].available);if(a>0&&on.indexOf(k)>=0)ws[k]=a;});
      o.xferChecked=true;
      if(!Object.keys(ws).length)return;
      const s=typeof stampNow==='function'?stampNow():{date:'',time:''};
      nw.xfer={from:o.id,date:typeof wbToday==='function'?wbToday():'',at:s.date+' '+s.time,wallets:ws};o.xferTo=nw.id;
      const list=Object.keys(ws).map(function(k){return (typeof wbTypeName==='function'?wbTypeName(k):k)+' '+expMoney(ws[k],o.currency||'INR');}).join(', ');
      const A=typeof ccNow==='function'?ccNow():null;
      if(typeof ccLog==='function'){
        ccLog(nw,nw.status,'Balance transferred from '+expKey(o)+' (reported '+String(((o.csr||[]).find(function(r){return r.kind==='lost';})||{}).reason||'lost').toLowerCase()+'): '+list+'.',A);
        ccLog(o,o.status,'Remaining balance transferred to the new card '+expKey(nw)+': '+list+'.',A);
      }
      n++;
    });
    if(n&&typeof presSaveSoon==='function')presSaveSoon();
    return n;
  }
  window.emsCardBalanceTransfer=transfer;
  /* Checked before each screen is drawn (cheap: only cards closed after a report, each once) and once on load. */
  if(typeof renderADTPage==='function'){
    const r0=renderADTPage;
    renderADTPage=function(){try{if(!(typeof presBuilding!=='undefined'&&presBuilding))transfer();}catch(e){}return r0.apply(this,arguments);};
  }
  Promise.resolve(window.PRES_READY).then(function(){try{transfer();}catch(e){if(window.console)console.warn('[balance transfer]',e);}});
})();
