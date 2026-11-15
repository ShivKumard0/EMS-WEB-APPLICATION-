/* ══ CORPORATE CARDS → REPORTS (product owner, 15 Nov 2026) ═════════════════════════════════════════════════════════
   "i want to add a reports section and in the above select report type and all the options in the dropdown, and on
   selecting any one of it then the corresponding report will open and it can be downloadable. it should look well
   structured and in proper format. under requests and loads add reports. due to this none of the approval or
   submission functionality should change."
   One page, right under Requests & Loads: Report Type (every report, grouped) · Period · Search · Download. Until a
   report is picked the page lists them by group; picking one shows its figures, its table with a total row, and
   Download saves exactly what is on screen (all pages) as a CSV file that opens in Excel.
   READ ONLY: every report reads the records the other screens already keep (claims, advances, cards, transactions,
   wallet ledger, wallet loads, capping limits, logs). Nothing is written, no status is changed, no request is made.
   Company Admin, Super Admin and Finance see it. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof sidebarItems==='undefined'||typeof renderPageContent!=='function')return;
  const PG='ems-reports',TITLE='Reports';
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const entRec=function(){return typeof entitiesData!=='undefined'?entitiesData.find(function(e){return e.entityId===ent();})||null:null;};
  const can=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin','Finance','Finance Admin'].indexOf(emsRole())>=0;};
  const today=function(){return typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);};
  const money=function(n){return typeof expMoney==='function'?expMoney(Math.round((Number(n)||0)*100)/100,'INR'):String(n);};
  const dLabel=function(iso){return iso?(typeof cdLabel==='function'?cdLabel(iso):iso):'';};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p2=function(n){return (n<10?'0':'')+n;};
  /* '15 Nov 2026' → '2026-11-15' */
  const isoOf=function(d){const m=/^(\d{1,2}) (\w{3}) (\d{4})/.exec(String(d||''));return m?m[3]+'-'+p2(MON.indexOf(m[2])+1)+'-'+p2(+m[1]):String(d||'').slice(0,10);};
  const emp=function(eid){return (typeof idEmp==='function'&&idEmp(eid))||{};};
  const key=function(r){return typeof expKey==='function'?expKey(r):'';};
  const wName=function(t){return typeof wbTypeName==='function'?wbTypeName(t):t;};
  const cardNo=function(c){return '•••• '+(c&&c.last4||'••••');};
  const cardWord=function(c){return (typeof emsCardWord==='function'&&emsCardWord(c))||c.status||'';};
  const sum=function(o){return Object.keys(o||{}).reduce(function(s,k){return s+(Number(o[k])||0);},0);};
  const APPROVED=['Approved','Partially Approved','Reimbursed'];
  const claims=function(){return (typeof expensesData!=='undefined'?expensesData:[]).filter(function(r){return r.entity===ent();});};
  const rowsEA=function(){try{return typeof eaRows==='function'?eaRows():[];}catch(e){return [];}};
  const myCards=function(){return (typeof ccCards!=='undefined'?ccCards:[]).filter(function(c){return c.entity===ent()&&c.last4;});};
  const sub=function(x){return typeof eaSubstatus==='function'?eaSubstatus(x):'';};

  /* ── Period ── */
  const PERIODS=['This Month','Last Month','Last 3 Months','This Financial Year','All Time'];
  function range(p){
    const t=today(),y=+t.slice(0,4),m=+t.slice(5,7);
    const first=function(yy,mm){while(mm<1){mm+=12;yy--;}return yy+'-'+p2(mm)+'-01';};
    const lastDay=function(yy,mm){while(mm<1){mm+=12;yy--;}return yy+'-'+p2(mm)+'-'+p2(new Date(yy,mm,0).getDate());};
    if(p==='This Month')return [first(y,m),t];
    if(p==='Last Month')return [first(y,m-1),lastDay(y,m-1)];
    if(p==='Last 3 Months')return [first(y,m-2),t];
    if(p==='This Financial Year')return [(m>=4?y:y-1)+'-04-01',t];
    return ['','9999-12-31'];
  }
  const within=function(iso,r){const d=String(iso||'').slice(0,10);return !!d&&d>=r[0]&&d<=r[1];};

  /* ── The reports. cols: [key, label, type] - type m money, n number, d date, p percent, b badge, '' text. ── */
  function grouped(list,keyOf,r){
    const by={};
    list.forEach(function(c){
      if(APPROVED.indexOf(c.status)<0||!within(c.appliedOn,r))return;
      (c.lines||[]).forEach(function(l){
        const k=keyOf(c,l)||'—',g=by[k]||(by[k]={name:k,items:0,claims:{},claimed:0,approved:0});
        g.items++;g.claims[c.id]=1;g.claimed+=Number(l.amount)||0;g.approved+=l.approved!=null?Number(l.approved)||0:Number(l.amount)||0;
      });
    });
    const out=Object.keys(by).map(function(k){const g=by[k];return {name:g.name,claims:Object.keys(g.claims).length,items:g.items,claimed:g.claimed,approved:g.approved};});
    const tot=out.reduce(function(s,x){return s+x.approved;},0);
    out.forEach(function(x){x.share=tot?x.approved/tot*100:0;});
    return out.sort(function(a,b){return b.approved-a.approved;});
  }
  const GCOLS=function(first){return [['name',first,''],['claims','Claims','n'],['items','Items','n'],['claimed','Claimed','m'],['approved','Approved','m'],['share','Share','p']];};
  const REPORTS=[
    {id:'expense-register',group:'Expenses',name:'Expense Register',desc:'Every claim and advance in the period, with its status and substatus.',
      cols:[['ref','Request',''],['date','Date','d'],['emp','Employee',''],['dept','Department',''],['type','Type',''],['cat','Category',''],['req','Requested','m'],['appr','Approved','m'],['status','Status','b'],['sub','Substatus',''],['at','Pending At','']],
      rows:function(r){return rowsEA().filter(function(x){return within(x.date,r);}).map(function(x){
        return {ref:x.key,date:x.date,emp:x.who,dept:x.dept||'',type:x.type||'',cat:x.cat||'',req:Number(x.req)||0,appr:x.appr!=null?Number(x.appr):null,status:x.flow||x.status,sub:sub(x),at:x.at||''};});}},
    {id:'spend-category',group:'Expenses',name:'Spend by Category',desc:'Approved claim amounts by expense category, largest first.',
      cols:GCOLS('Category'),rows:function(r){return grouped(claims(),function(c,l){return l.category||c.category;},r);}},
    {id:'spend-department',group:'Expenses',name:'Spend by Department',desc:'Approved claim amounts by the employee\'s department.',
      cols:GCOLS('Department'),rows:function(r){return grouped(claims(),function(c){return emp(c.employeeEid).dept;},r);}},
    {id:'spend-employee',group:'Expenses',name:'Spend by Employee',desc:'Approved claim amounts by employee.',
      cols:GCOLS('Employee'),rows:function(r){return grouped(claims(),function(c){return c.name||emp(c.employeeEid).name;},r);}},
    {id:'cut-items',group:'Expenses',name:'Reduced and Rejected Items',desc:'Line items approved for less than claimed, or rejected, with the reason.',
      cols:[['ref','Claim',''],['date','Date','d'],['emp','Employee',''],['item','Item',''],['cat','Category',''],['claimed','Claimed','m'],['approved','Approved','m'],['cut','Reduced By','m'],['status','Item Status','b'],['reason','Reason','']],
      rows:function(r){const out=[];claims().forEach(function(c){if(!within(c.appliedOn,r))return;(c.lines||[]).forEach(function(l){
        if(l.status!=='Rejected'&&l.status!=='Partially Approved')return;
        const a=Number(l.approved)||0,cl=Number(l.amount)||0;
        out.push({ref:key(c),date:c.appliedOn,emp:c.name,item:l.title||'',cat:l.category||c.category||'',claimed:cl,approved:a,cut:cl-a,status:l.status,reason:l.reason||''});});});return out;}},
    {id:'over-limit',group:'Expenses',name:'Over-Limit Claims',desc:'Claims submitted over a capping limit, with the justification given.',
      cols:[['ref','Claim',''],['date','Date','d'],['emp','Employee',''],['cat','Category',''],['amount','Amount','m'],['limit','Limit',''],['just','Justification',''],['status','Status','b']],
      rows:function(r){const out=[];claims().forEach(function(c){if(!within(c.appliedOn,r))return;const j=c.policyJust||{};
        Object.keys(j).forEach(function(k){if(!String(j[k]||'').trim())return;
          out.push({ref:key(c),date:c.appliedOn,emp:c.name,cat:c.category||'',amount:(c.lines||[]).reduce(function(s,l){return s+(Number(l.amount)||0);},0),limit:k,just:j[k],status:c.status});});});return out;}},
    {id:'pending-ageing',group:'Approvals',name:'Pending Approvals Ageing',desc:'Requests still waiting, who they are with and for how many days.',noPeriod:true,
      cols:[['ref','Request',''],['date','Submitted','d'],['emp','Employee',''],['type','Type',''],['cat','Category',''],['req','Amount','m'],['at','Pending At',''],['days','Days Waiting','n'],['band','Ageing','b']],
      rows:function(){const t=Date.parse(today());return rowsEA().filter(function(x){return x.flow==='Pending'&&x.status!=='Draft';}).map(function(x){
        const d=x.date?Math.max(0,Math.round((t-Date.parse(x.date))/86400000)):0;
        return {ref:x.key,date:x.date,emp:x.who,type:x.type||'',cat:x.cat||'',req:Number(x.req)||0,at:x.at?x.at+(x.atRole?' ('+x.atRole+')':''):'',days:d,band:d<=2?'0-2 days':d<=5?'3-5 days':'Over 5 days'};})
        .sort(function(a,b){return b.days-a.days;});}},
    {id:'reimbursements',group:'Payments',name:'Reimbursement Status',desc:'What is owed to employees on approved claims, and what has been paid.',
      cols:[['ref','Claim',''],['date','Date','d'],['emp','Employee',''],['payable','Payable','m'],['paid','Paid','m'],['due','Outstanding','m'],['route','Route',''],['status','Payment Status','b']],
      rows:function(r){return claims().filter(function(c){return c.pay&&c.pay.status!=='Not Applicable'&&within(c.appliedOn,r);}).map(function(c){const p=c.pay,pay=Number(p.payable)||0,st=Number(p.settled)||0;
        return {ref:key(c),date:c.appliedOn,emp:c.name,payable:pay,paid:st,due:Math.max(0,pay-st),route:p.route||'',status:p.status};});}},
    {id:'advances',group:'Payments',name:'Advance Register',desc:'Advances requested, approved, issued and still to be settled.',
      cols:[['ref','Advance',''],['date','Date','d'],['emp','Employee',''],['cat','Type',''],['req','Requested','m'],['appr','Approved','m'],['issued','Issued','m'],['due','To Settle','m'],['status','Status','b']],
      rows:function(r){return rowsEA().filter(function(x){return x.kind==='adv'&&within(x.date,r);}).map(function(x){let b={};try{b=typeof advBal==='function'?advBal(x.r)||{}:{};}catch(e){}
        return {ref:x.key,date:x.date,emp:x.who,cat:x.cat||'',req:Number(x.req)||0,appr:x.appr!=null?Number(x.appr):null,issued:Number(b.issued)||0,due:Number(b.accountable)||0,status:x.flow||x.status};});}},
    {id:'card-register',group:'Cards and Wallets',name:'Card Register',desc:'Every card issued: holder, status, wallets and balance today.',noPeriod:true,
      cols:[['card','Card ID',''],['no','Card Number',''],['emp','Employee',''],['eid','Employee ID',''],['dept','Department',''],['wallets','Wallets','n'],['bal','Balance','m'],['status','Status','b']],
      rows:function(){return myCards().map(function(c){const e=emp(c.employeeEid),w=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid,c.id):{};
        return {card:key(c),no:cardNo(c),emp:e.name||c.name||'',eid:e.empId||'',dept:e.dept||'',wallets:typeof ccCardWallets==='function'?ccCardWallets(c).length:0,
          bal:Object.keys(w).reduce(function(s,k){return s+(Number(w[k].available)||0);},0),status:cardWord(c)};}).sort(function(a,b){return a.emp.localeCompare(b.emp);});}},
    {id:'card-transactions',group:'Cards and Wallets',name:'Card Transactions',desc:'Card spend and refunds by date, merchant and wallet.',
      cols:[['date','Date','d'],['ref','Transaction',''],['emp','Employee',''],['no','Card',''],['merchant','Merchant',''],['wallet','Wallet',''],['kind','Type',''],['amount','Amount','m'],['status','Status','b']],
      rows:function(r){return (typeof ccTxns!=='undefined'?ccTxns:[]).filter(function(t){return t.entity===ent()&&within(t.date,r);}).map(function(t){const c=typeof ccCard==='function'?ccCard(t.cardId):null;
        return {date:t.date,ref:key(t),emp:emp(t.employeeEid).name||t.name||'',no:cardNo(c),merchant:t.merchant||'',wallet:wName(t.wallet),kind:t.direction==='Credit'?(t.type||'Refund'):'Purchase',
          amount:Number(t.billCurrency==='INR'&&t.billAmount?t.billAmount:t.amount)||0,status:t.status};}).sort(function(a,b){return String(b.date).localeCompare(String(a.date));});}},
    {id:'wallet-balance',group:'Cards and Wallets',name:'Wallet Balance and Utilisation',desc:'Loaded, spent and balance in each wallet of every active card, today.',noPeriod:true,
      cols:[['emp','Employee',''],['no','Card',''],['wallet','Wallet',''],['loaded','Loaded','m'],['spent','Spent','m'],['bal','Balance','m'],['used','Used','p']],
      rows:function(){const out=[];myCards().filter(function(c){return c.status==='Active';}).forEach(function(c){const w=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid,c.id):{};
        Object.keys(w).forEach(function(k){const x=w[k],ld=Number(x.loaded)||0,sp=Math.max(0,(Number(x.spent)||0)-(Number(x.refunded)||0));
          out.push({emp:emp(c.employeeEid).name||'',no:cardNo(c),wallet:wName(k),loaded:ld,spent:sp,bal:Number(x.available)||0,used:ld?sp/ld*100:0});});});
        return out.sort(function(a,b){return a.emp.localeCompare(b.emp)||a.wallet.localeCompare(b.wallet);});}},
    {id:'wallet-load',group:'Cards and Wallets',name:'Wallet Load',desc:'Each month\'s wallet load: entitlement, adjustment and amount disbursed.',
      cols:[['month','Month',''],['run','Run',''],['emp','Employee',''],['no','Card',''],['ent','Entitlement','m'],['adj','Adjustment','m'],['loaded','Disbursed','m'],['on','Disbursed On',''],['by','Disbursed By','']],
      rows:function(r){const e=entRec(),out=[];((e&&e.bpRuns)||[]).forEach(function(run){if(!within(run.date,r))return;const t=String(run.month).split('-');
        run.items.forEach(function(i){const c=typeof ccCard==='function'?ccCard(i.cardId):null,ld=sum(i.wallets),en=i.ent?sum(i.ent):ld;
          out.push({month:MON[+t[1]-1]+' '+t[0],run:run.key,emp:emp(i.eid).name||'',no:cardNo(c),ent:en,adj:ld-en,loaded:ld,on:String(run.at||'').split(' | ')[0],by:run.by||''});});});
        return out.sort(function(a,b){return a.emp.localeCompare(b.emp);});}},
    {id:'capping-limits',group:'Controls',name:'Capping Limits',desc:'The limits in force: category, who they apply to and the amount.',noPeriod:true,
      cols:[['ref','Policy',''],['name','Name',''],['cat','Category',''],['applies','Applies To',''],['amount','Limit','m'],['period','Period',''],['enf','On Exceeding',''],['status','Status','b']],
      rows:function(){return (typeof cappingData!=='undefined'?cappingData:[]).filter(function(c){return c.entity===ent();}).map(function(c){const v=(c.versions||[])[(c.versions||[]).length-1]||{};
        return {ref:'CAP-'+c.key,name:c.name,cat:c.category+(c.subCat?' / '+c.subCat:''),applies:c.level==='Department'?'Department · '+(c.dept||''):c.level==='Position'?'Position · '+(c.position||''):c.level==='Employee'?'Employee':'Everyone',
          amount:Number(v.amount)||0,period:v.period||'',enf:v.enforcement==='Blocking'?'Blocked':'Reason required',status:c.status};}).sort(function(a,b){return a.cat.localeCompare(b.cat);});}},
    {id:'audit-trail',group:'Controls',name:'Audit Trail',desc:'Who did what and when on claims, advances and cards.',
      cols:[['date','Date','d'],['time','Time',''],['ref','Record',''],['kind','Record Type',''],['user','Done By',''],['status','Status','b'],['action','Action','']],
      rows:function(r){const out=[];
        const add=function(rec,kind){(rec.logs||[]).forEach(function(l){const d=isoOf(l.date);if(!within(d,r))return;out.push({date:d,time:l.time||'',ref:key(rec),kind:kind,user:l.user||'System',status:l.status||'',action:l.action||''});});};
        claims().forEach(function(c){add(c,'Expense Claim');});
        (typeof advancesData!=='undefined'?advancesData:[]).filter(function(a){return a.entity===ent();}).forEach(function(a){add(a,'Advance');});
        myCards().forEach(function(c){add(c,'Card');});
        return out.sort(function(a,b){return (b.date+' '+b.time).localeCompare(a.date+' '+a.time);});}}
  ];
  const GROUPS=['Expenses','Approvals','Payments','Cards and Wallets','Controls'];

  /* ── State ── */
  let cur='',period='This Month',q='',pg=1;
  const PER=25;
  const def=function(){return REPORTS.find(function(r){return r.id===cur;})||null;};
  function data(){
    const d=def();if(!d)return [];
    let rows=[];try{rows=d.rows(range(d.noPeriod?'All Time':period))||[];}catch(e){if(window.console)console.warn('[report]',d.id,e);}
    const s=q.trim().toLowerCase();
    if(s)rows=rows.filter(function(r){return d.cols.some(function(c){return String(r[c[0]]==null?'':r[c[0]]).toLowerCase().indexOf(s)>=0;});});
    return rows;
  }
  const text=function(v,t){return v==null||v===''?'':t==='m'?money(v):t==='d'?dLabel(v):t==='p'?(Math.round(v*10)/10)+'%':String(v);};
  const TONES={'Approved':'ok','Fully Approved':'ok','Reimbursed':'ok','Disbursed':'ok','Paid':'ok','Posted':'ok','Active':'ok','Pending':'wait','Awaiting Approval':'wait','Reviewed':'info',
    'Partially Approved':'info','Ready for Payment':'info','Processing':'info','Rejected':'bad','Declined':'bad','Failed':'bad','Blocked':'bad','Disabled':'idle','Inactive':'idle','On Hold':'wait',
    '0-2 days':'ok','3-5 days':'wait','Over 5 days':'bad'};
  const cell=function(v,t){
    if(v==null||v==='')return '<span class="sb-dash">&mdash;</span>';
    if(t==='b')return typeof axBadge==='function'?axBadge(TONES[v]||(typeof statusTone==='function'?statusTone(v):'idle'),E(v)):E(v);
    return E(text(v,t));
  };
  const num=function(t){return t==='m'||t==='n'||t==='p';};

  /* ── Page ── */
  const DL='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const DOC='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
  function pickerHTML(){
    return GROUPS.map(function(g){
      const list=REPORTS.filter(function(r){return r.group===g;});
      return '<div class="rpt-grp"><div class="rpt-grp-ttl">'+E(g)+'<span>'+list.length+'</span></div><div class="rpt-cards">'
        +list.map(function(r){return '<button type="button" class="rpt-card" onclick="rptOpen(\''+r.id+'\')"><span class="rpt-card-ico">'+DOC+'</span><span class="rpt-card-txt"><b>'+E(r.name)+'</b><span>'+E(r.desc)+'</span></span></button>';}).join('')
        +'</div></div>';
    }).join('');
  }
  function reportHTML(){
    const d=def(),rows=data(),pages=Math.max(1,Math.ceil(rows.length/PER));if(pg>pages)pg=pages;
    const view=rows.slice((pg-1)*PER,pg*PER),rg=range(period);
    const mcols=d.cols.filter(function(c){return c[2]==='m';});
    const tot=function(k){return rows.reduce(function(s,r){return s+(Number(r[k])||0);},0);};
    const tiles='<div class="rpt-tiles"><div class="rpt-tile"><span>Rows</span><b>'+rows.length+'</b></div>'
      +mcols.slice(0,3).map(function(c){return '<div class="rpt-tile"><span>Total '+E(c[1])+'</span><b>'+money(tot(c[0]))+'</b></div>';}).join('')+'</div>';
    const head='<tr><th class="rpt-n">S. No</th>'+d.cols.map(function(c){return '<th'+(num(c[2])?' class="rpt-num"':'')+'>'+E(c[1])+'</th>';}).join('')+'</tr>';
    const body=view.length?view.map(function(r,i){return '<tr><td class="rpt-n">'+((pg-1)*PER+i+1)+'</td>'+d.cols.map(function(c){
        const v=r[c[0]],long=c[2]===''&&String(v||'').length>48;
        return '<td'+(num(c[2])?' class="rpt-num"':long?' class="rpt-long" title="'+E(v)+'"':'')+'>'+cell(v,c[2])+'</td>';}).join('')+'</tr>';}).join('')
      :'<tr><td colspan="'+(d.cols.length+1)+'" class="rpt-empty">No records for this report'+(d.noPeriod?'':' in '+E(period.toLowerCase()))+(q?' matching "'+E(q)+'"':'')+'.</td></tr>';
    const foot=rows.length&&mcols.length?'<tr class="rpt-total"><td class="rpt-n"></td>'+d.cols.map(function(c,i){
        return '<td'+(num(c[2])?' class="rpt-num"':'')+'>'+(c[2]==='m'?'<b>'+money(tot(c[0]))+'</b>':i===0?'<b>Total</b>':'')+'</td>';}).join('')+'</tr>':'';
    return '<div class="rpt-head"><div><div class="rpt-ttl">'+E(d.name)+'</div><div class="rpt-sub">'+E(d.desc)+' '
        +(d.noPeriod?'As of '+E(dLabel(today()))+'.':E(period)+(rg[0]?' · '+E(dLabel(rg[0]))+' to '+E(dLabel(rg[1])):'')+'.')+'</div></div>'
        +'<button class="ep-save-btn rpt-dl" '+(rows.length?'':'disabled style="opacity:.5;cursor:not-allowed" ')+'onclick="rptDownload()">'+DL+' Download</button></div>'
      +tiles
      +'<div class="rpt-table-wrap"><table class="lp-table ax-table rpt-table"><thead>'+head+'</thead><tbody>'+body+foot+'</tbody></table></div>'
      +(rows.length>PER?'<div class="rpt-pager"><span>Showing '+((pg-1)*PER+1)+'–'+Math.min(rows.length,pg*PER)+' of '+rows.length+'</span><span class="rpt-pager-btns">'
        +'<button class="ep-cancel-btn" '+(pg<=1?'disabled ':'')+'onclick="rptPage('+(pg-1)+')">Previous</button><b>'+pg+' / '+pages+'</b><button class="ep-cancel-btn" '+(pg>=pages?'disabled ':'')+'onclick="rptPage('+(pg+1)+')">Next</button></span></div>':'');
  }
  function pageHTML(){
    const d=def();
    const opts=REPORTS.map(function(r){return r.name;});
    return '<div class="lp-page rpt"><div class="rpt-bar">'
      +'<div class="rpt-f rpt-f-type"><label class="ep-form-label">Report Type</label>'+(typeof apCS==='function'?apCS('rpt-type',opts,d?d.name:'','Select report type','rptTypeHook'):'')+'</div>'
      +'<div class="rpt-f"><label class="ep-form-label">Period</label>'+(typeof apCS==='function'?apCS('rpt-period',PERIODS,d&&d.noPeriod?'':period,d&&d.noPeriod?'As of today':'Period','rptPeriodHook'):'')+'</div>'
      +'<div class="rpt-f rpt-f-q"><label class="ep-form-label" for="rpt-q">Search</label><input class="ep-form-input" id="rpt-q" value="'+E(q)+'" placeholder="Search in this report" '+(d?'':'disabled ')+'onkeydown="if(event.key===\'Enter\')rptSearch()"></div>'
      +'<div class="rpt-f rpt-f-btn"><button class="lp-pill-search" '+(d?'':'disabled style="opacity:.5" ')+'onclick="rptSearch()">Search</button>'+(d?'<button class="ep-cancel-btn" onclick="rptOpen(\'\')">All Reports</button>':'')+'</div>'
      +'</div>'
      +(d?reportHTML():'<div class="rpt-intro">Select a report type above, or pick one below. Every report can be downloaded.</div>'+pickerHTML())
      +'</div>';
  }

  /* ── Actions (read only) ── */
  window.rptOpen=function(id){cur=id||'';q='';pg=1;renderADTPage();window.scrollTo(0,0);};
  window.rptTypeHook=function(){const v=typeof getCSValue==='function'?getCSValue('rpt-type'):'',r=REPORTS.find(function(x){return x.name===v;});if(r&&r.id!==cur)window.rptOpen(r.id);};
  window.rptPeriodHook=function(){const v=typeof getCSValue==='function'?getCSValue('rpt-period'):'';if(PERIODS.indexOf(v)>=0&&v!==period){period=v;pg=1;renderADTPage();}};
  window.rptSearch=function(){const el=document.getElementById('rpt-q');q=el?el.value.trim():'';pg=1;renderADTPage();};
  window.rptPage=function(n){pg=Math.max(1,n);renderADTPage();};
  window.rptDownload=function(){
    const d=def();if(!d)return;const rows=data();if(!rows.length)return;
    const csv=function(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    const val=function(v,t){return v==null||v===''?'':t==='m'?String(Math.round(Number(v)*100)/100):t==='p'?String(Math.round(Number(v)*10)/10):t==='d'?dLabel(v):String(v);};
    const rg=range(period),who=typeof idMeName==='function'?idMeName():'',co=typeof idEntityName==='function'?idEntityName(ent()):'';
    const lines=[[d.name],[co],[d.noPeriod?'As of '+dLabel(today()):'Period: '+period+(rg[0]?' ('+dLabel(rg[0])+' to '+dLabel(rg[1])+')':'')],['Downloaded on '+dLabel(today())+(who?' by '+who:'')],[],
      ['S. No'].concat(d.cols.map(function(c){return c[1]+(c[2]==='m'?' (INR)':c[2]==='p'?' (%)':'');}))];
    rows.forEach(function(r,i){lines.push([i+1].concat(d.cols.map(function(c){return val(r[c[0]],c[2]);})));});
    if(d.cols.some(function(c){return c[2]==='m';}))lines.push([''].concat(d.cols.map(function(c,i){return c[2]==='m'?val(rows.reduce(function(s,r){return s+(Number(r[c[0]])||0);},0),'m'):i===0?'Total':'';})));
    const blob=new Blob(['﻿'+lines.map(function(l){return l.map(csv).join(',');}).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=d.name.replace(/[^A-Za-z0-9]+/g,'_')+'_'+today()+'.csv';
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},400);
    if(typeof showToast==='function')showToast('Report downloaded','success',d.name+' · '+rows.length+' row'+(rows.length===1?'':'s')+'.');
  };
  window.rptList=function(){return REPORTS.map(function(r){return r.id;});};

  /* ── Look ── */
  (function(){
    if(document.getElementById('rpt-style'))return;
    const st=document.createElement('style');st.id='rpt-style';
    st.textContent='.rpt-bar{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(160px,1fr) minmax(180px,1.2fr) auto;gap:14px;align-items:end;padding:16px;border:1px solid var(--border,#e5e7eb);border-radius:14px;background:#fff}'
      +'.rpt-f{min-width:0}.rpt-f .ep-form-label{display:block;margin-bottom:6px}.rpt-f .ep-form-input{width:100%;margin:0;height:36px;box-sizing:border-box}.rpt-f .cs-wrap{display:block}.rpt-f-btn .lp-pill-search,.rpt-f-btn .ep-cancel-btn{height:36px}.rpt-f-btn{display:flex;gap:8px;align-items:center}'
      +'.rpt-intro{margin:18px 2px 4px;font-size:13px;color:var(--gray,#6a7282)}'
      +'.rpt-grp{margin-top:18px}.rpt-grp-ttl{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--gray,#6a7282);margin-bottom:10px}'
      +'.rpt-grp-ttl span{font-weight:600;background:#eef2f7;color:var(--navy,#0f172a);border-radius:999px;padding:1px 8px;letter-spacing:0}'
      +'.rpt-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'
      +'.rpt-card{display:flex;gap:12px;align-items:flex-start;text-align:left;padding:14px 16px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;cursor:pointer;font:inherit;color:var(--navy,#0f172a);min-width:0}'
      +'.rpt-card:hover{border-color:#cbd5e1;background:#f8fafc}.rpt-card-ico{width:36px;height:36px;border-radius:10px;background:#eef2f7;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      +'.rpt-card-txt{display:flex;flex-direction:column;gap:3px;min-width:0}.rpt-card-txt b{font-size:14px;font-weight:600}.rpt-card-txt span{font-size:12.5px;line-height:1.45;color:var(--gray,#6a7282)}'
      +'.rpt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:20px 2px 14px}.rpt-ttl{font-size:18px;font-weight:700;color:var(--navy,#0f172a)}.rpt-sub{font-size:13px;color:var(--gray,#6a7282);margin-top:3px}'
      +'.rpt-dl{display:inline-flex;align-items:center;gap:8px;flex-shrink:0}'
      +'.rpt-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}'
      +'.rpt-tile{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:12px 16px;background:#fff;min-width:0}.rpt-tile span{display:block;font-size:11.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--gray,#6a7282)}'
      +'.rpt-tile b{display:block;font-size:20px;line-height:28px;font-weight:700;color:var(--navy,#0f172a);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.rpt-table-wrap{border:1px solid var(--border,#e5e7eb);border-radius:14px;background:#fff;overflow:auto}'
      +'.rpt-table{width:100%;border-collapse:collapse}.rpt-table th{white-space:nowrap}.rpt-table td{white-space:nowrap;font-size:13px}'
      +'.rpt-table td.rpt-long{white-space:normal;min-width:240px;max-width:420px;line-height:1.45}'
      +'.rpt-num{text-align:right!important;font-variant-numeric:tabular-nums}.rpt-n{width:56px;color:var(--gray,#6a7282)}'
      +'.rpt-total td{background:#f8fafc;border-top:1px solid var(--border,#e5e7eb)}'
      +'.rpt-empty{text-align:center;color:var(--gray,#6a7282);padding:28px 12px!important}'
      +'.rpt-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;font-size:13px;color:var(--gray,#6a7282)}'
      +'.rpt-pager-btns{display:flex;align-items:center;gap:10px}.rpt-pager-btns b{color:var(--navy,#0f172a);font-weight:600}.rpt-pager-btns button[disabled]{opacity:.5;cursor:not-allowed}'
      +'@media(max-width:1100px){.rpt-bar{grid-template-columns:1fr 1fr}.rpt-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.rpt-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';
    (document.head||document.documentElement).appendChild(st);
  })();

  /* ── The menu item, right under Requests & Loads; the page ── */
  const g=sidebarItems.find(function(x){return x&&x.dropdown==='Corporate Cards';});
  if(g&&!g.children.some(function(c){return c.id===PG;})){
    const I=typeof sbIco!=='undefined'?sbIco:{};
    const at=g.children.findIndex(function(c){return c.label==='Requests & Loads';});
    g.children.splice(at<0?g.children.length:at+1,0,{id:PG,label:TITLE,color:'green',icon:I.fileText||I.card||''});
  }
  if(typeof supportPageMeta!=='undefined')supportPageMeta[PG]={title:TITLE,context:TITLE,filters:[],columns:[],rows:[]};
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[PG]='cards';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(PG)<0)EMS_CLIENT_PAGES.push(PG);
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg!==PG)return p0.apply(this,arguments);
      return p0('cards')&&can();
    };
  }
  const r0=renderPageContent;
  renderPageContent=function(target){
    if(typeof page==='undefined'||page!==PG)return r0.apply(this,arguments);
    const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
    if(typeof emsApplyChrome==='function')emsApplyChrome();
    if(typeof emsPageGuard==='function'){const gd=emsPageGuard(page);if(gd){el.innerHTML=gd;return;}}
    el.innerHTML=pageHTML();
  };
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg===PG?TITLE:t0.apply(this,arguments);};
  }
  if(typeof renderADTPage==='function'){
    const a0=renderADTPage;
    renderADTPage=function(){
      const out=a0.apply(this,arguments);
      if(typeof page!=='undefined'&&page===PG){const b=document.getElementById('tb-page-add-btn');if(b)b.style.display='none';}
      return out;
    };
  }
})();
