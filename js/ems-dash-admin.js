/* ══ COMPANY ADMIN DASHBOARD FOR EXPENSE MANAGEMENT (product owner, 13 Nov 2026) ════════════════════════════════════
   The Company Admin of a client company sees the figures an expense admin acts on, each opening its list:
     Spend This Month   approved out-of-pocket claims + posted card spend this month, against last month
     Pending Approval   requests waiting, with managers and with finance, and the oldest wait
     To Reimburse       money owed to employees on approved claims, and to how many people
     Card Balances      the balance on the company's active cards, and how many run low
   Shortcuts: New Request · My Approvals · Transactions · Wallet & Benefits · Capping Limit · Policies.
   Action Required lists expense work only (no budget or funding items). Other roles keep their dashboard.
   In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const on=function(){return typeof emsDashOn==='function'&&emsDashOn()&&typeof emsRole==='function'&&emsRole()==='Company Admin';};
  const I=function(n){return typeof sbIco!=='undefined'&&sbIco[n]?sbIco[n]:'';};
  const LOW=1000;   // a card under this balance (all wallets together) runs low
  const inr=function(n){return typeof expMoney==='function'?expMoney(Math.round(n),'INR'):'₹'+Math.round(n);};
  const month=function(iso){return String(iso||'').slice(0,7);};
  const thisM=function(){return month(typeof wbToday==='function'?wbToday():new Date().toISOString());};
  const prevM=function(){const t=(typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10)).split('-');let y=+t[0],m=+t[1]-1;if(m<1){m=12;y--;}return y+'-'+(m<10?'0':'')+m;};
  /* Spend in a month: posted card purchases, and approved claims paid by the employee (card-paid claims are the card's). */
  function spend(m){
    const ent=idEntity();let s=0;
    (typeof ccTxns!=='undefined'?ccTxns:[]).forEach(function(t){
      if(t.entity!==ent||t.direction!=='Debit'||t.status!=='Posted'||month(t.date)!==m)return;
      s+=Number(t.billCurrency==='INR'&&t.billAmount?t.billAmount:t.amount)||0;
    });
    (typeof expScope==='function'?expScope():[]).forEach(function(r){
      if(!r.pay||r.pay.status==='Not Applicable'||month(r.appliedOn)!==m)return;
      if(['Approved','Partially Approved','Reimbursed'].indexOf(r.status)<0)return;
      s+=Number(typeof caApprovedTotal==='function'?caApprovedTotal(r):0)||0;
    });
    return s;
  }
  const days=function(iso){if(!iso)return 0;const a=new Date(iso+'T00:00:00'),b=new Date((typeof wbToday==='function'?wbToday():'')+'T00:00:00');return Math.max(0,Math.round((b-a)/86400000));};
  function statsHTML(rows){
    const s=[];
    /* 1 · Spend This Month */
    const now=spend(thisM()),before=spend(prevM());
    const ch=before>0?Math.round((now-before)/before*100):null;
    s.push(emsDashStat('Spend This Month',inr(now),ch==null?'claims and card spend':(ch>=0?'↑ ':'↓ ')+Math.abs(ch)+'% vs last month',I('receipt'),
      emsDashAllowed('card-transactions')?"navigatePage('card-transactions',true)":"eaGo('all')"));
    /* 2 · Pending Approval */
    const pend=rows.filter(function(x){return x.status==='Awaiting Approval';});
    let mgr=0,fin=0,oldest=0;
    pend.forEach(function(x){const st=typeof caActiveStage==='function'?caActiveStage(x.r):null;
      if(st&&(st.type==='Reporting Manager'||/manager/i.test(st.name||'')))mgr++;else fin++;
      oldest=Math.max(oldest,days(st&&st.assignedAt||x.date));});
    s.push(emsDashStat('Pending Approval',pend.length+(pend.length?' · '+emsDashSum(pend,function(x){return x.req;}):''),
      pend.length?mgr+' with managers · '+fin+' with finance'+(oldest?' · oldest '+oldest+' day'+(oldest===1?'':'s'):''):'nothing waiting',
      I('shieldCheck'),"eaGo('all');eaApprF='Awaiting Approval';renderADTPage()"));
    /* 3 · To Reimburse */
    const due=(typeof expScope==='function'?expScope():[]).filter(function(r){return r.pay&&['Ready for Payment','Pending Verification','Processing','On Hold','Partially Paid'].indexOf(r.pay.status)>=0;});
    const owed=due.reduce(function(t,r){const p=r.pay,v=(Number(p.payable)||0)-(Number(p.settled)||0);return t+(v>0?v:(Number(caApprovedTotal(r))||0));},0);
    const people=[];due.forEach(function(r){if(people.indexOf(r.employeeEid)<0)people.push(r.employeeEid);});
    s.push(emsDashStat('To Reimburse',inr(owed),people.length?'owed to '+people.length+' employee'+(people.length===1?'':'s'):'nothing owed',I('dollar'),
      "eaGo('all');eaApprF='Approved';renderADTPage()"));
    /* 4 · Card Balances */
    const cards=(typeof ccCards!=='undefined'?ccCards:[]).filter(function(c){return c.entity===idEntity()&&c.status==='Active';});
    let total=0,low=0;
    cards.forEach(function(c){
      let b=0;try{const info=typeof ccCardBalanceInfo==='function'?ccCardBalanceInfo(c):null;
        if(info&&info.wallets&&info.wallets.length)b=info.wallets.reduce(function(t,w){return t+(Number(w.balance)||0);},0);
        else if(info&&info.statement&&info.statement.balance!=null)b=Number(info.statement.balance)||0;}catch(e){}
      total+=b;if(b<LOW)low++;
    });
    s.push(emsDashStat('Card Balances',inr(total),cards.length+' active card'+(cards.length===1?'':'s')+(low?' · '+low+' low':''),I('card'),
      emsDashAllowed('card-list')?"navigatePage('card-list',true)":(emsDashAllowed('cards')?"navigatePage('cards',true)":"''")));
    return '<div class="hr-stat-grid">'+s.join('')+'</div>';
  }
  function linksHTML(){
    const l=[['new','New Request',I('receipt'),'Expenses & Advances → New Request',"navigatePage('expenses',true);if(typeof eaPlusClick==='function')eaPlusClick()",'expenses'],
      ['queue','My Approvals',I('shieldCheck'),'Expenses & Advances → My Approvals',"eaGo('queue')",'expenses'],
      ['card-transactions','Transactions',I('card'),'Transactions',"navigatePage('card-transactions',true)",'card-transactions'],
      ['wallet-benefits','Wallet & Benefits',I('wallet'),'Wallet & Benefits',"navigatePage('wallet-benefits',true)",'wallet-benefits'],
      ['capping-limit','Capping Limit',I('gauge'),'Capping Limit',"navigatePage('capping-limit',true)",'capping-limit'],
      ['expense-policies','Policies',I('fileText'),'Policies',"navigatePage('expense-policies',true)",'expense-policies']];
    const shown=l.filter(function(x){return emsDashAllowed(x[5]);});
    return '<div class="hr-links"'+(shown.length<6?' style="grid-template-columns:repeat('+shown.length+',minmax(0,1fr))"':'')+'>'+shown.map(function(x){
      return '<button type="button" class="hr-link" title="'+x[3]+'" onclick="'+x[4]+'"><span class="hr-link-ico">'+x[2]+'</span><span class="hr-link-txt">'+x[1]+'</span></button>';}).join('')+'</div>';
  }
  if(typeof emsDashStatsHTML==='function'){const s0=emsDashStatsHTML;emsDashStatsHTML=function(rows){return on()?statsHTML(rows||[]):s0.apply(this,arguments);};}
  if(typeof emsDashLinksHTML==='function'){const l0=emsDashLinksHTML;emsDashLinksHTML=function(){return on()?linksHTML():l0.apply(this,arguments);};}
  /* Action Required: expense work only. */
  if(typeof emsDashTasks==='function'){
    const t0=emsDashTasks;
    emsDashTasks=function(){const t=t0.apply(this,arguments);return on()?t.filter(function(x){return !/budget|funding/i.test(x.type+' '+x.item);}):t;};
  }
})();
