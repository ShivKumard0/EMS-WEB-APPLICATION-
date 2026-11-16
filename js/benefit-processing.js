/* ══ CORPORATE CARDS → BENEFIT PROCESSING (product owner, 15 Nov 2026) ══════════════════════════════════════════════
   "under corporate cards, under card list, add Benefit Processing: a list of people with the card details as in the
   card list, select all or individual selection on the left of the line items. Every month i need to load each and
   every wallet, and before loading i need to check all the limits and statuses ... on clicking a line item he can see
   all the details. This is a completely different process - nothing else should change."
   Then the Benefit Disbursement spec (15 Nov 2026), built into this view ("i need to maintain my current view, in
   this i want to include all this"): each employee's month is a calculation -
     Monthly Entitlement (the wallet limits of Wallet & Benefits → Employees / Card Benefit)
     ± Adjustment (Increase / Decrease, amount, reason, notes - this employee and this month only; the master limit is
       not changed) = Final Load
   - and it moves Draft → Pending Approval → Loaded, or Rejected (edit, recalculate, resubmit).
   Decisions (product owner, 15 Nov 2026): Finance approves, the Company Admin and Super Admin may approve too ·
   approval credits the wallets at once · the bulk submit goes through the same approval · an increase has no upper
   limit, a decrease cannot take a wallet below zero · one row per employee's card.
   How it works:
   - Filters: Year, Month, Branch, Department, Status, search. A card is Draft, Pending Approval, Rejected, Loaded,
     Inactive (the employee or the card is not Active) or No Limit (no wallet limit set).
     Status words (product owner, 15 Nov 2026, later): Pending by default → Reviewed (after any adjustment) →
     Approved (or Rejected) → Disbursed (wallets credited). The Logs steps are those words.
   - The benefit wallets are loaded: Meal, Fuel, Gift, Telecom, Health - not Reimbursement or Corporate Expense.
   - ☰ → Wallets: last month's load and spend, the entitlement, the adjustment (pencil), the final load and the
     balance. Logs: Submit for Approval, Approve, Reject, each with a comment. Workflow: the steps done and to come.
   - Select + Submit for Approval / Approve / Reject work on many cards; the summary shows what is sent, the
     adjustments, the limits that differ from last month and the inactive cards with the amount held back.
   - A submitted or loaded calculation cannot be edited. A card is credited once per month. Rejecting changes no
     balance. Every adjustment, submission, decision and load is written to the card's benefit Logs.
   - Kept with the company (entity record: bpCalc, bpRuns, bpLogs, bpBase). The credit is a ledger entry of its own
     (js/ems-wallet-ledger.js emsLedgerEntries is extended), so balances on My Cards, Card List and the phone show it.
     No request, card load, funding posting or existing benefit batch is created or changed.
   In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof sidebarItems==='undefined'||typeof renderPageContent!=='function'||typeof ccCards==='undefined')return;
  const PG='benefit-processing',TITLE='Wallet Load';   // renamed from Benefit Processing (product owner, 15 Nov 2026); the page id is kept
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const entRec=function(){return typeof entitiesData!=='undefined'?entitiesData.find(function(e){return e.entityId===ent();})||null:null;};
  const role=function(){return typeof emsRole==='function'?emsRole():'';};
  const canSubmit=function(){return ['Super Admin','Company Admin'].indexOf(role())>=0;};
  const canApprove=function(){return ['Super Admin','Company Admin','Finance','Finance Admin'].indexOf(role())>=0;};
  const money=function(n){return typeof expMoney==='function'?expMoney(Math.round(n*100)/100,'INR'):String(n);};
  const signed=function(n){return n===0?money(0):(n>0?'+ ':'− ')+money(Math.abs(n));};
  const badge=function(tone,t){return typeof axBadge==='function'?axBadge(tone,t):E(t);};
  const today=function(){return typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);};
  const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const p2=function(n){return (n<10?'0':'')+n;};
  const mLabel=function(m){const t=String(m).split('-');return MON[+t[1]-1]+' '+t[0];};
  const prevOf=function(m){const t=m.split('-');let y=+t[0],k=+t[1]-1;if(k<1){k=12;y--;}return y+'-'+p2(k);};
  const SKIP=['CORP','REIMB'];
  const wName=function(t){return typeof wbTypeName==='function'?wbTypeName(t):t;};
  const TONE={'Pending':'wait','Reviewed':'info','Rejected':'bad','Approved':'ok','Disbursed':'ok','Inactive':'idle','No Limit':'wait','Not Processed':'idle'};
  const REASONS=['Policy-approved correction','Joined or left mid-month (pro-rata)','Leave without pay','One-time allowance','Recovery of excess load','Other'];
  const meName=function(){return typeof idMeName==='function'?idMeName():'';};
  const financeName=function(){const u=typeof idUserByEmail==='function'?idUserByEmail('rohan.mehta@opendhi.in'):null;return u&&typeof idName==='function'?idName(u.userId):'Finance';};

  let fy=+today().slice(0,4),fm=+today().slice(5,7),fBranch='',fDept='',fStatus='',q='';
  let sel={},open=null,tab='details',confirm=null,act=null,adjOf=null,reject=null;
  let barWas=false,barLast='',adjDone=null;   // the bar's last shown state and content, so it can slide in and fade out
  const month=function(){return fy+'-'+p2(fm);};
  const nowM=function(){return today().slice(0,7);};
  const isNow=function(){return month()===nowM();};

  /* ── Data ── */
  const runs=function(){const e=entRec();return e&&Array.isArray(e.bpRuns)?e.bpRuns:[];};
  const runOf=function(m,cardId){return runs().find(function(r){return r.month===m&&r.items.some(function(i){return i.cardId===cardId;});})||null;};
  const itemOf=function(m,cardId){const r=runOf(m,cardId);return r?r.items.find(function(i){return i.cardId===cardId;}):null;};
  /* The month's calculation of a card: {status, adj:{WALLET:{type,amount,reason,notes,by,at}}, wallets, ent, by, at, reason} */
  function calc(c,m,make){
    const e=entRec();if(!e)return null;
    if(!e.bpCalc){if(!make)return null;e.bpCalc={};}
    if(!e.bpCalc[m]){if(!make)return null;e.bpCalc[m]={};}
    if(!e.bpCalc[m][c.id]){if(!make)return null;e.bpCalc[m][c.id]={status:'Pending',adj:{}};}
    const k=e.bpCalc[m][c.id],OLD={'Draft':'Pending','Pending Approval':'Reviewed','Loaded':'Disbursed'};
    if(OLD[k.status])k.status=OLD[k.status];
    return k;
  }
  const benefitTypes=function(){
    if(typeof wbWallets==='undefined')return [];
    return wbWallets.filter(function(w){return w.entity===ent()&&w.status==='Active'&&SKIP.indexOf(w.type)<0;}).sort(function(a,b){return a.id-b.id;}).map(function(w){return w.type;});
  };
  const emp=function(c){return (typeof idEmp==='function'&&idEmp(c.employeeEid))||{};};
  const empName=function(c){return emp(c).name||c.name||(typeof idEmpName==='function'?idEmpName(c.employeeEid):'')||'';};
  const branchOf=function(c){const e=emp(c);return e.branch||e.location||e.workLocation||'';};
  const cardWord=function(c){return (typeof emsCardWord==='function'&&emsCardWord(c))||c.status||'';};
  const cardNo=function(c){return '•••• •••• •••• '+(c.last4||'••••');};
  const keyOf=function(c){return typeof expKey==='function'?expKey(c):'';};
  const cards=function(){
    return ccCards.filter(function(c){return c.entity===ent()&&c.last4&&['Cancelled','Rejected'].indexOf(c.status)<0;})
      .sort(function(a,b){return empName(a).localeCompare(empName(b))||a.id-b.id;});
  };
  /* Monthly entitlement: wallet → the employee's limit, for the benefit wallets that are on. */
  function plan(c){
    const out={},types=benefitTypes(),on=typeof ccCardWallets==='function'?ccCardWallets(c):types;
    if(typeof ecbEntry!=='function')return out;
    types.forEach(function(t){
      if(on.indexOf(t)<0)return;
      const x=ecbEntry(c.employeeEid,t);
      if(x&&x.on&&Number(x.limit)>0)out[t]=Number(x.limit);
    });
    return out;
  }
  const sum=function(o){return Object.keys(o||{}).reduce(function(s,k){return s+(Number(o[k])||0);},0);};
  /* The adjustment of a wallet as a signed amount. */
  const adjAmt=function(a){return a?(a.type==='Entitlement Reduction'?-1:1)*(Number(a.amount)||0):0;};
  const adjs=function(c,m){const it=itemOf(m,c.id);if(it)return it.adj||{};const k=calc(c,m);return (k&&k.adj)||{};};
  /* Entitlement ± adjustment per wallet (never below zero). Once submitted or loaded: what was submitted. */
  function finalOf(c,m){
    const it=itemOf(m,c.id);if(it)return it.wallets;
    const k=calc(c,m);if(k&&(k.status==='Reviewed'||k.status==='Approved')&&k.wallets)return k.wallets;
    const pl=plan(c),a=adjs(c,m),out={};
    Object.keys(pl).forEach(function(t){out[t]=Math.max(0,pl[t]+adjAmt(a[t]));});
    return out;
  }
  const entOf=function(c,m){const it=itemOf(m,c.id);if(it)return it.ent||it.wallets;const k=calc(c,m);return k&&(k.status==='Reviewed'||k.status==='Approved')&&k.ent?k.ent:plan(c);};
  const adjTotal=function(c,m){return sum(finalOf(c,m))-sum(entOf(c,m));};
  /* Last month: that month's load; before the first run, the limits as they were snapshot. */
  function last(c,m){
    const pm=prevOf(m),it=itemOf(pm,c.id);if(it)return it.wallets;
    const e=entRec(),b=e&&e.bpBase;
    return b&&b.month===pm&&b.limits[c.id]?b.limits[c.id]:null;
  }
  function why(c){
    const e=emp(c),es=e.status||'';
    if(es&&es!=='Active')return 'Employee is '+es;
    const w=cardWord(c);
    if(w!=='Active')return 'Card is '+w;
    return '';
  }
  function status(c,m){
    if(runOf(m,c.id))return 'Disbursed';
    if(m!==nowM())return 'Not Processed';
    const k=calc(c,m);
    if(k&&k.status==='Reviewed')return 'Reviewed';
    if(k&&k.status==='Approved'&&k.wallets)return 'Approved';
    if(why(c))return 'Inactive';
    if(k&&k.status==='Rejected')return 'Rejected';
    return sum(plan(c))>0?'Pending':'No Limit';
  }
  const editable=function(c,m){const s=status(c,m);return m===nowM()&&canSubmit()&&(s==='Pending'||s==='Rejected');};

  /* Once: last month's limits, so the first summary has something to compare with. Three cards had a lower limit. */
  function baseline(){
    const e=entRec();if(!e||e.bpBase||(typeof presBuilding!=='undefined'&&presBuilding)||typeof ecbEntry!=='function')return;
    const list=cards().filter(function(c){return sum(plan(c))>0;});if(!list.length)return;
    const limits={};
    list.forEach(function(c){limits[c.id]=Object.assign({},plan(c));});
    [[1,'MEAL',500],[4,'FUEL',1000],[7,'TEL',500]].forEach(function(x){
      const c=list[Math.min(x[0],list.length-1)],l=c&&limits[c.id];
      if(l&&l[x[1]]>x[2])l[x[1]]=l[x[1]]-x[2];
    });
    e.bpBase={month:prevOf(nowM()),limits:limits};
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  function sampleAdjustments(){
    const e=entRec(),m=nowM();if(!e||e.bpAdjSeed||(typeof presBuilding!=='undefined'&&presBuilding))return;
    const list=cards().filter(function(c){return status(c,m)==='Pending';});if(list.length<4)return;
    e.bpAdjSeed=m;
    const u=typeof idUserByEmail==='function'?idUserByEmail('karan.shah@opendhi.in'):null,by=u&&typeof idName==='function'?idName(u.userId):'Karan Shah';
    [[2,'FUEL','Entitlement Reduction',500,'Leave without pay','On leave without pay for 5 working days.'],
     [5,'MEAL','Additional Allocation',300,'One-time allowance','Client workshop week.'],
     [8,'TEL','Entitlement Reduction',200,'Recovery of excess load','Excess load in the previous month.']].forEach(function(x){
      const c=list[Math.min(x[0],list.length-1)],en=plan(c)[x[1]]||0;
      if(!c||!(en>x[3]))return;
      const k=calc(c,m,true);if(k.adj[x[1]])return;
      k.adj[x[1]]={type:x[2],amount:x[3],reason:x[4],notes:x[5],by:by,at:today()};
      e.bpLogs=e.bpLogs||{};
      const st=typeof stampNow==='function'?stampNow():{date:'',time:''};
      (e.bpLogs[c.id]=e.bpLogs[c.id]||[]).unshift({date:st.date,time:st.time,user:by,userId:u?u.userId:'',status:'Pending',step:'Adjustment',
        action:'Adjustment added · '+wName(x[1])+': '+x[2]+' '+money(x[3])+' ('+money(en)+' → '+money(Math.max(0,en+(x[2]==='Entitlement Reduction'?-1:1)*x[3]))+'). Reason: '+x[4]+' - '+x[5].replace(/\.+$/,'')+'.'});
    });
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  /* Last month's spend per wallet. From the card's own transactions of that month; for the month before the
     company's records begin, a figure kept with the snapshot (55-95% of that month's limit), set once. */
  const hash=function(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return ((h>>>0)%1000)/1000;};
  function spentLast(c,m){
    const pm=prevOf(m),out={};
    (typeof emsLedgerEntries==='function'?emsLedgerEntries(c.employeeEid,c.id):[]).forEach(function(x){
      if(x.sign<0&&x.kind!=='Balance transfer'&&String(x.date||'').slice(0,7)===pm)out[x.wallet]=(out[x.wallet]||0)+x.amount;});
    if(Object.keys(out).length)return out;
    const e=entRec(),b=e&&e.bpBase;
    if(!b||b.month!==pm||!b.limits[c.id])return out;
    b.spent=b.spent||{};
    if(!b.spent[c.id]){
      const o={};Object.keys(b.limits[c.id]).forEach(function(k){o[k]=Math.round(b.limits[c.id][k]*(0.55+0.4*hash(c.id+'|'+k))/10)*10;});
      b.spent[c.id]=o;if(typeof presSaveSoon==='function')presSaveSoon();
    }
    return b.spent[c.id];
  }

  /* ── Logs ── */
  function logsOf(c){
    const e=entRec(),kept=(e&&e.bpLogs&&e.bpLogs[c.id])||[],m=nowM(),t=m.split('-'),done=!!runOf(m,c.id);
    const st0=!done&&status(c,m)==='Inactive'?'Inactive':(done||sum(plan(c))>0?'Pending':'No Limit'),pl=entOf(c,m);
    const text=st0==='Inactive'?why(c)+' - not processed for '+mLabel(m)+'. '+money(sum(plan(c)))+' is held back.'
      :st0==='No Limit'?'No wallet limit is set - nothing to load for '+mLabel(m)+'.'
      :'Benefits calculated for '+mLabel(m)+': '+Object.keys(pl).map(function(k){return wName(k)+' '+money(pl[k]);}).join(', ')+'.';
    const first={date:'01 '+MON[+t[1]-1].slice(0,3)+' '+t[0],time:'09:00:00 AM',user:'System',status:st0,step:st0==='Pending'?'Benefits calculated':st0,action:text};
    const when=function(l){return typeof wfStepTime==='function'?(wfStepTime(l,0)||0):0;};
    return kept.concat([first]).map(function(l,i){return {l:l,i:i,t:when(l)};}).sort(function(x,y){return (y.t-x.t)||(x.i-y.i);}).map(function(x){return x.l;});
  }
  function addLog(c,st,step,text,after){
    const e=entRec();if(!e)return;
    e.bpLogs=e.bpLogs||{};
    /* after: seconds after now, so two steps of one action keep their order in Logs and Workflow */
    const d=new Date(Date.now()+(after||0)*1000),MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h=d.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;
    (e.bpLogs[c.id]=e.bpLogs[c.id]||[]).unshift({date:p2(d.getDate())+' '+MS[d.getMonth()]+' '+d.getFullYear(),time:p2(h)+':'+p2(d.getMinutes())+':'+p2(d.getSeconds())+' '+ap,
      user:meName(),userId:typeof idMe==='function'?idMe():'',status:st,step:step,action:text});
  }
  const saved=function(){if(typeof emsClearCache==='function')emsClearCache();if(typeof presSaveSoon==='function')presSaveSoon();};
  const say=function(a,t,b){if(typeof showToast==='function')showToast(a,t,b);};

  /* ── The ledger: a run's credits are wallet loads of their own ── */
  if(typeof emsLedgerEntries==='function'){
    const l0=emsLedgerEntries;
    emsLedgerEntries=function(eid,cardId){
      const out=l0.apply(this,arguments);
      const rs=runs();if(!rs.length||!eid)return out;
      let n=0;
      rs.forEach(function(r){r.items.forEach(function(i){
        if(i.eid!==eid||(cardId!=null&&i.cardId!==cardId))return;
        Object.keys(i.wallets).forEach(function(k){const a=Number(i.wallets[k])||0;if(!(a>0))return;
          out.push({date:r.date,ref:r.key,wallet:k,kind:'Wallet load',text:'Benefit load · '+mLabel(r.month),amount:a,sign:1,illustrative:true});n++;});
      });});
      return n?out.sort(function(a,b){return String(b.date).localeCompare(String(a.date));}):out;
    };
  }

  /* ── What each step does ── */
  function submit(c,note){
    const m=nowM(),st=status(c,m);
    if(!canSubmit())return 'Only the Company Admin reviews a benefit load.';
    if(st!=='Pending'&&st!=='Rejected')return empName(c)+' is '+st+' for '+mLabel(m)+'.';
    const fin=finalOf(c,m),tot=sum(fin),en=plan(c);
    if(!(tot>0))return 'Nothing to load for '+empName(c)+': the final load is 0.';
    const k=calc(c,m,true),a=tot-sum(en);
    k.status='Reviewed';k.wallets=Object.assign({},fin);k.ent=Object.assign({},en);k.by=meName();k.at=today();k.reason='';
    addLog(c,'Reviewed','Reviewed','Reviewed · '+mLabel(m)+': '+money(tot)+(a?' (entitlement '+money(sum(en))+', adjustments '+signed(a)+')':'')+(note?'. Comment: '+note:'.'));
    return '';
  }
  function decline(c,note){
    const m=nowM();
    if(!canApprove())return 'Only Finance or the Company Admin decides a benefit load.';
    if(status(c,m)!=='Reviewed')return empName(c)+' is not reviewed yet.';
    const k=calc(c,m,true);
    k.status='Rejected';k.reason=note||'';delete k.wallets;delete k.ent;
    addLog(c,'Rejected','Rejected','Rejected · '+mLabel(m)+(note?'. Reason: '+note:'.')+' No wallet balance changed; it can be edited and reviewed again.');
    return '';
  }
  /* Approved: checked by Finance (or the admin); nothing is credited yet. */
  function approveOne(c,note){
    const m=nowM();
    if(!canApprove())return 'Only Finance or the Company Admin approves a benefit load.';
    if(status(c,m)!=='Reviewed')return empName(c)+' is not reviewed yet.';
    if(why(c))return why(c)+' - it cannot be approved.';
    const k=calc(c,m,true);
    k.status='Approved';k.approvedBy=meName();k.approvedAt=today();
    addLog(c,'Approved','Approved','Approved · '+mLabel(m)+': '+money(sum(k.wallets||finalOf(c,m)))+(note?'. Comment: '+note:'.'));
    return '';
  }
  /* Disbursed (product owner, 15 Nov 2026: "after approved i can select all and add the logs to disbursed"): the
     wallets of the approved cards are credited - one run for the cards disbursed together. */
  function disburse(list,note){
    const e=entRec(),m=nowM();if(!e)return {error:'No company.'};
    if(!canApprove())return {error:'Only Finance or the Company Admin disburses a benefit load.'};
    const ok=list.filter(function(c){return status(c,m)==='Approved'&&!why(c)&&!runOf(m,c.id);});
    if(!ok.length)return {error:'Nothing here is approved and waiting to be disbursed, or the card is no longer Active.'};
    e.bpRuns=Array.isArray(e.bpRuns)?e.bpRuns:[];
    const n=1001+e.bpRuns.length,st=typeof stampNow==='function'?stampNow():{date:'',time:''};
    const items=ok.map(function(c){const k=calc(c,m,true);
      return {cardId:c.id,eid:c.employeeEid,wallets:Object.assign({},k.wallets||finalOf(c,m)),ent:Object.assign({},k.ent||plan(c)),adj:JSON.parse(JSON.stringify(k.adj||{})),submittedBy:k.by||'',approvedBy:k.approvedBy||''};});
    items.forEach(function(i){i.total=sum(i.wallets);});
    const run={id:n,key:'BPR-'+n,month:m,date:today(),at:st.date+' | '+st.time,by:meName(),byId:typeof idMe==='function'?idMe():'',note:note||'',total:items.reduce(function(a,i){return a+i.total;},0),items:items,skipped:[]};
    const parts=function(it){return Object.keys(it.wallets).filter(function(k){return it.wallets[k]>0;}).map(function(k){return wName(k)+' '+money(it.wallets[k]);}).join(', ');};
    ok.forEach(function(c,i){
      addLog(c,'Disbursed','Wallets credited','Disbursed · '+run.key+' · '+mLabel(m)+': '+parts(items[i])+(note?'. Comment: '+note:'.'));
      calc(c,m,true).status='Disbursed';
    });
    e.bpRuns.push(run);   // from here the ledger shows the credits
    ok.forEach(function(c,i){if(typeof ccLog==='function')ccLog(c,c.status,'Benefit load '+run.key+' · '+mLabel(m)+': '+parts(items[i])+'.');});
    return {run:run,n:ok.length};
  }

  /* ── List ── */
  function shown(){
    const m=month(),s=q.trim().toLowerCase();
    return cards().filter(function(c){
      if(fBranch&&branchOf(c)!==fBranch)return false;
      if(fDept&&(emp(c).dept||'')!==fDept)return false;
      if(fStatus&&status(c,m)!==fStatus)return false;
      if(s&&(empName(c)+' '+(emp(c).empId||'')+' '+(c.last4||'')+' '+keyOf(c)).toLowerCase().indexOf(s)<0)return false;
      return true;
    });
  }
  function pickable(c){
    if(!isNow())return false;
    const s=status(c,month());
    if(s==='Reviewed'||s==='Approved')return canApprove();
    return canSubmit()&&s!=='Disbursed';
  }
  const picked=function(){return shown().filter(function(c){return sel[c.id]&&pickable(c);});};
  /* The bar shows once a card is selected; a past month keeps its reference note. */
  const barOn=function(){return !isNow()||picked().length>0;};
  /* While it fades out, the bar keeps what it last said instead of flipping to the empty text. */
  const barContent=function(){if(barOn()){barLast=barHTML();return barLast;}return barLast||barHTML();};
  const syncBar=function(){
    const w=document.getElementById('bpx-barwrap');if(!w)return;
    const on=barOn();w.classList.toggle('is-off',!on);barWas=on;
  };
  function barHTML(){
    if(!isNow())return '<span class="wb-muted">Benefits are processed for the current month ('+E(mLabel(nowM()))+'). '+E(mLabel(month()))+' is shown for reference.</span>';
    const m=month(),p=picked();
    const sub=p.filter(function(c){const s=status(c,m);return s==='Pending'||s==='Rejected';}),pen=p.filter(function(c){return status(c,m)==='Reviewed';}),apr=p.filter(function(c){return status(c,m)==='Approved';});
    const tot=function(l){return money(l.reduce(function(a,c){return a+sum(finalOf(c,m));},0));};
    const txt=p.length?'<b>'+p.length+'</b> selected'+(sub.length?' · <b>'+sub.length+'</b> to review · <b>'+tot(sub)+'</b>':'')+(pen.length?' · <b>'+pen.length+'</b> reviewed · <b>'+tot(pen)+'</b>':'')+(apr.length?' · <b>'+apr.length+'</b> approved · <b>'+tot(apr)+'</b>':'')
      :'Select the cards to process for '+E(mLabel(m));
    const off=' disabled style="opacity:.5;cursor:not-allowed"';
    let btn='';
    if(canApprove()&&pen.length)btn+='<button class="ep-cancel-btn" onclick="bpxRejectOpen()">Reject</button><button class="ep-save-btn" onclick="bpxConfirmOpen(\'approve\')">Approve</button>';
    if(canApprove()&&apr.length)btn+='<button class="ep-save-btn" onclick="bpxConfirmOpen(\'disburse\')">Disburse</button>';
    if(canSubmit()&&(sub.length||(!pen.length&&!apr.length)))btn+='<button class="ep-save-btn"'+(p.length?'':off)+' onclick="bpxConfirmOpen(\'submit\')">Mark Reviewed</button>';
    return '<span class="bpx-bar-txt">'+txt+'</span><span class="bpx-bar-btns">'+btn+'</span>';
  }
  function pageHTML(){
    baseline();sampleAdjustments();
    const m=month(),rows=shown(),all=cards(),okAll=rows.filter(pickable);
    if(open!=null&&!rows.some(function(c){return c.id===open;})){open=null;adjOf=null;act=null;}
    const allOn=okAll.length>0&&okAll.every(function(c){return sel[c.id];});
    const trs=rows.map(function(c,i){
      const st=status(c,m),e=emp(c),pk=pickable(c),live=st!=='Inactive'&&st!=='No Limit'&&st!=='Not Processed';
      const fin=live?sum(finalOf(c,m)):0;
      return '<tr class="bpx-row'+(open===c.id?' lp-row-selected':'')+'" id="bpx-row-'+c.id+'" style="cursor:pointer" onclick="bpxOpen('+c.id+')">'
        +'<td class="bpx-ck" onclick="event.stopPropagation()">'+(pk?'<input type="checkbox" aria-label="Select '+E(empName(c))+'"'+(sel[c.id]?' checked':'')+' onchange="bpxPick('+c.id+',this.checked)">':'')+'</td>'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-plain">'+E(empName(c))+'</div><div class="lp-c-sub">'+E(e.empId||'')+'</div></td>'
        +'<td><div class="lp-c-main" style="font-variant-numeric:tabular-nums;letter-spacing:.02em">'+E(cardNo(c))+'</div><div class="lp-c-sub">'+E(keyOf(c))+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(e.dept||'—')+'</div></td>'
        +'<td class="bpx-amt"><div class="lp-c-plain" style="font-weight:600">'+(fin?money(fin):'—')+'</div></td>'
        +'<td>'+badge(TONE[st]||'idle',st)+(st==='Inactive'?'<div class="lp-c-sub">'+E(why(c))+'</div>':'')+'</td>'
        +(typeof csuDots==='function'?csuDots('bpxOpen('+c.id+')',empName(c)):'<td></td>')+'</tr>';
    });
    const words=isNow()?['Pending','Reviewed','Rejected','Approved','Disbursed','Inactive','No Limit']:['Disbursed','Not Processed'];
    const opt=['Rejected','No Limit'];
    const tiles=typeof caStat==='function'?words.filter(function(w){return opt.indexOf(w)<0||all.some(function(c){return status(c,m)===w;});}).map(function(w){
      return caStat(w,all.filter(function(c){return status(c,m)===w;}).length,fStatus===w,'bpxStat(\''+w+'\')',TONE[w]);}).join(''):'';
    const years=[String(+today().slice(0,4)-1),today().slice(0,4)];
    const empty=typeof ccEmpty==='function'?ccEmpty(8,all.length?'No card matches this filter.':'No card has been issued yet.'):'';
    const pgn=typeof listPage==='function'?listPage('bpx',[q,fBranch,fDept,fStatus,fy,fm].join('|'),trs,empty):{rows:trs.join('')||empty,pager:''};
    const table='<table class="lp-table ax-table cc-table bpx-table"><thead><tr><th class="bpx-ck">'+(okAll.length?'<input type="checkbox" id="bpx-all" aria-label="Select all"'+(allOn?' checked':'')+' onchange="bpxAll(this.checked)">':'')+'</th>'
      +'<th>S. No</th><th>Employee</th><th>Card Number</th><th>Department</th><th class="bpx-amt">Final Load</th><th>Status</th><th>Action</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager;
    const filters=(typeof lpSearchField==='function'?lpSearchField('bpx-q',q,'Search name, ID or card','bpxApply()'):'')
      +(typeof apCS==='function'?apCS('bpx-year',years,String(fy),'Year')+apCS('bpx-month',MON,MON[fm-1],'Month')
        +apCS('bpx-branch',typeof emsBranchNames==='function'?emsBranchNames(ent()):[],fBranch,'All Branches')
        +apCS('bpx-dept',typeof wbDepts==='function'?wbDepts():[],fDept,'All Departments')
        +apCS('bpx-status',words,fStatus,'All Statuses'):'')
      +(typeof clearFiltersBtn==='function'?clearFiltersBtn([q,fBranch,fDept,fStatus],'bpxReset()'):'')+'<button class="lp-pill-search" onclick="bpxApply()">Search</button>';
    /* Drawn in its previous state; moved to the new one a frame later so a full redraw also slides or fades. */
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){requestAnimationFrame(syncBar);});else setTimeout(syncBar,0);
    return '<div class="lp-page">'
      +(typeof ccFilterBar==='function'?ccFilterBar(filters,tiles):'')
      +'<div class="bpx-barwrap'+(barWas?'':' is-off')+'" id="bpx-barwrap"><div class="bpx-barin"><div class="bpx-bar" id="bpx-bar">'+barContent()+'</div></div></div>'
      +(typeof ccSplit==='function'?ccSplit('bpx',table,open!=null,panelHTML):table)
      +'</div>';
  }

  /* ── A card's details ── */
  const CHECK='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const CROSS='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  function adjFormHTML(c,m){
    const t=adjOf.wallet,pl=plan(c),k=calc(c,m),a=(k&&k.adj&&k.adj[t])||null,d=adjOf.draft;
    const fin=Math.max(0,(pl[t]||0)+(d.type==='Entitlement Reduction'?-1:1)*(parseFloat(d.amount)||0));
    const e=emp(c),on=typeof ccCardWallets==='function'?ccCardWallets(c).indexOf(t)>=0:true;
    const v=function(ok,text){return '<div class="bpx-val'+(ok?'':' is-bad')+'"><span>'+(ok?CHECK:CROSS)+'</span>'+E(text)+'</div>';};
    return '<div class="ct-modal-overlay" style="z-index:2000" onclick="bpxAdjCancel()"><div class="ct-modal bpx-modal bpx-adj-modal" id="bpx-adj" role="dialog" aria-modal="true" aria-label="Adjust '+E(wName(t))+' benefit" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><div><span class="ct-modal-title">Adjust '+E(wName(t))+' Benefit</span>'
      +'<div style="font-size:13px;color:#6b7280;margin-top:3px">Update the wallet amount for '+E(empName(c))+' for '+E(mLabel(m))+'.</div></div>'
      +'<button class="ct-modal-close" onclick="bpxAdjCancel()" aria-label="Close">'+CROSS+'</button></div>'
      +'<div class="bpx-sum">'
      +'<div class="bpx-adj-ent"><span>Current Entitlement</span><b>'+money(pl[t]||0)+'</b></div>'
      +'<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Adjustment Type <span class="req">*</span></label>'+(typeof apCS==='function'?apCS('bpx-a-type',['Additional Allocation','Entitlement Reduction'],d.type,'Select','bpxAdjHook'):'')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label" for="bpx-a-amt">Amount <span class="req">*</span></label><div class="ax-currency"><span>INR</span><input class="ep-form-input" id="bpx-a-amt" type="number" min="1" step="1" inputmode="numeric" placeholder="0" value="'+E(d.amount)+'" oninput="bpxAdjHook()"></div></div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Reason <span class="req">*</span></label>'+(typeof apCS==='function'?apCS('bpx-a-reason',REASONS,d.reason,'Select reason','bpxAdjHook'):'')+'</div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="bpx-a-notes">Notes'+(d.reason==='Other'?' <span class="req">*</span>':'')+'</label><textarea class="ep-form-input ax-notes" id="bpx-a-notes" maxlength="200" placeholder="e.g. '+E(wName(t))+' allowance correction for '+E(MON[+m.slice(5,7)-1])+'.">'+E(d.notes)+'</textarea></div>'
      +'</div>'
      +'<div class="bpx-adj-ent is-final"><span>Final Load</span><b id="bpx-a-final">'+money(fin)+'</b></div>'
      +'<div class="ea-hint" style="margin:10px 0 0">This change applies to '+E(mLabel(m))+' only and is included in the total sent for approval. The employee\'s monthly limit is not changed.</div>'
      +'</div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="bpxAdjCancel()">Cancel</button>'
        +(a?'<button class="ep-cancel-btn" onclick="bpxAdjRemove()">Remove Adjustment</button>':'')
        +'<button class="ep-save-btn" onclick="bpxAdjSave()">Save Adjustment</button></div></div></div></div>';
  }
  /* The standard success view after an adjustment is saved. */
  function adjDoneHTML(){
    const d=adjDone,ok='<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    return '<div class="ct-modal-overlay" style="z-index:2000" onclick="bpxAdjDoneClose()"><div class="rr-success-modal" role="dialog" aria-modal="true" aria-label="Adjustment saved" onclick="event.stopPropagation()">'
      +'<button class="ct-modal-close" style="position:absolute;top:14px;right:14px" onclick="bpxAdjDoneClose()" aria-label="Close">'+CROSS+'</button>'
      +'<div class="rr-success-ring"><div class="rr-success-check">'+ok+'</div></div>'
      +'<div class="rr-success-title">Adjustment Saved</div>'
      +'<div class="rr-success-sub">'+E(d.wallet)+' for '+E(d.name)+' · final load '+E(d.fin)+' for '+E(d.month)+'.</div>'
      +'</div></div>';
  }
  const adjModalHTML=function(){
    const c=typeof ccCard==='function'?ccCard(open):null;
    return c&&adjOf&&editable(c,month())?adjFormHTML(c,month()):'';
  };
  function panelHTML(){
    const c=typeof ccCard==='function'?ccCard(open):null;if(!c)return '';
    const tabs=[{id:'details',label:'Details'},{id:'wallets',label:'Wallets'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
    if(!tabs.some(function(t){return t.id===tab;}))tab='details';
    const m=month(),e=emp(c),st=status(c,m),pl=entOf(c,m),fin=finalOf(c,m),lm=last(c,m),it=itemOf(m,c.id),k=calc(c,m);
    const live=st!=='Inactive'&&st!=='No Limit'&&st!=='Not Processed';
    const I=typeof AX_ICO!=='undefined'?AX_ICO:{},F=function(ico,l,v){return typeof axField==='function'?axField(ico||'',l,v):'';};
    const hero=typeof sbHero==='function'?sbHero({icon:(typeof sbIco!=='undefined'&&sbIco.card)||'',name:E(empName(c)),meta:[E(keyOf(c)),E(cardNo(c)),E(mLabel(m))],status:badge(TONE[st]||'idle',st)}):'';
    let body='';
    if(tab==='wallets'){
      const types=benefitTypes(),bal=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid,c.id):{};
      const sp=spentLast(c,m),loaded=!!it,pm=mLabel(prevOf(m)).split(' ')[0],ed=editable(c,m),A=adjs(c,m);
      const tE=sum(pl),tF=live?sum(fin):0;
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Benefit Calculation · '+E(mLabel(m))+'</span><span class="wb-muted">'+(ed?'Use the pencil to adjust a wallet':st==='Reviewed'||st==='Approved'?st+' - cannot be edited':loaded?'Disbursed - cannot be edited':'')+'</span></div>'
        +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table bpx-calc"><thead><tr><th>Wallet</th><th class="bpx-num">'+E(pm)+' Loaded</th><th class="bpx-num">'+E(pm)+' Spent</th>'
        +'<th class="bpx-num">Entitlement</th><th class="bpx-num">Adjustment</th><th class="bpx-num">Balance</th>'+(ed?'<th></th>':'')+'</tr></thead><tbody>'
        +types.map(function(t){
          const was=lm?lm[t]:null,en=pl[t],a=A[t]||null,am=adjAmt(a),b0=(bal[t]&&bal[t].available)||0;
          return '<tr'+(adjOf&&adjOf.wallet===t?' class="bpx-on"':'')+'><td class="csag-td"><div class="lp-c-main">'+E(wName(t))+'</div>'+(a&&live?'<div class="lp-c-sub" title="'+E(a.reason+(a.notes?' · '+a.notes:''))+'">'+E(a.reason)+'</div>':'')+'</td>'
            +'<td class="csag-td bpx-num">'+(was!=null?money(was):'—')+'</td>'
            +'<td class="csag-td bpx-num">'+(was!=null&&sp[t]!=null?money(sp[t]):'—')+'</td>'
            +'<td class="csag-td bpx-num">'+(en!=null?money(en):'—')+'</td>'
            +'<td class="csag-td bpx-num"'+(am&&live?' style="font-weight:600;color:'+(am>0?'#15803d':'#b45309')+'"':'')+'>'+(en!=null&&live?(am?signed(am):money(0)):'—')+'</td>'
            +'<td class="csag-td bpx-num">'+money(b0)+'</td>'
            +(ed?'<td class="csag-td bpx-pen">'+(en!=null?'<button type="button" class="bpx-pen-btn" title="Adjust '+E(wName(t))+'" aria-label="Adjust '+E(wName(t))+'" onclick="bpxAdjOpen(\''+t+'\')">'+(typeof SB_PEN!=='undefined'?SB_PEN:'Edit')+'</button>':'')+'</td>':'')
            +'</tr>';
        }).join('')+'</tbody></table></div>'
        +'<div class="ea-hint" style="margin-top:10px">'+(loaded?'The balance includes this month\'s load.':live?'The balance goes up by the Final Load once the load is disbursed.':'This card is not processed this month: '+E(why(c)||'no wallet limit is set')+'.')+'</div>';
    }else if(tab==='logs'){
      body=typeof lpLogsView==='function'?lpLogsView(logsOf(c),logForm(c),{select:true,current:st,open:act&&act.id===c.id?act.label:undefined}):'';
    }else if(tab==='workflow'){
      const done=logsOf(c).map(function(l){return {title:l.step||l.status||'',user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
      const S1={title:'Review',owner:'Company Admin'},S2={title:'Approval',owner:financeName()+' (Finance)'},S3={title:'Disbursement',owner:financeName()+' (Finance)'};
      const steps=st==='Pending'?[S1,S2,S3]:st==='Reviewed'?[S2,S3]:st==='Approved'?[S3]:st==='Rejected'?[{title:'Edit and review again',owner:'Company Admin'},S2,S3]
        :st==='Inactive'?[{title:'Make the '+(/^Employee/.test(why(c))?'employee':'card')+' Active',owner:'Company Admin'},S1,S2,S3]
        :st==='No Limit'?[{title:'Set the wallet limits',owner:'Company Admin'},S1,S2,S3]:[];
      body=typeof wfTimelineHTML==='function'?wfTimelineHTML(typeof wfPlan==='function'?wfPlan(done,steps):done):'';
    }else if(tab==='history'){
      const hs=runs().filter(function(r){return r.items.some(function(i){return i.cardId===c.id;});}).sort(function(a,b){return b.month.localeCompare(a.month);});
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Load History</span><span class="ax-count">'+hs.length+'</span></div>'
        +(hs.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Month</th><th>Run</th><th class="bpx-num">Entitlement</th><th class="bpx-num">Adjustment</th><th class="bpx-num">Loaded</th><th>Disbursed On</th><th>Disbursed By</th></tr></thead><tbody>'
          +hs.map(function(r){const i=r.items.find(function(y){return y.cardId===c.id;}),en=i.ent?sum(i.ent):sum(i.wallets),ad=sum(i.wallets)-en;
            return '<tr><td class="csag-td"><div class="lp-c-main">'+E(mLabel(r.month))+'</div></td><td class="csag-td">'+E(r.key)+'</td><td class="csag-td bpx-num">'+money(en)+'</td><td class="csag-td bpx-num">'+(ad?signed(ad):'—')+'</td>'
              +'<td class="csag-td bpx-num" style="font-weight:600">'+money(sum(i.wallets))+'</td><td class="csag-td">'+E(r.at)+'</td><td class="csag-td">'+E(r.by)+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">No benefit load has been made on this card yet.</div>');
    }else{
      const r=runOf(m,c.id);
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Details</span></div><div class="lp-sb-detail-grid">'
        +F(I.fUser,'Employee Name',E(empName(c)))+F(I.fHash,'Employee ID',E(e.empId||''))
        +F(I.fBuild,'Department',E(e.dept||''))+F(I.fBuild,'Branch',E(branchOf(c)))
        +F(I.fTag,'Employee Status',badge(e.status==='Active'?'ok':'idle',e.status||'—'))+F(I.fTag,'Card Status',badge(cardWord(c)==='Active'?'ok':'idle',cardWord(c)))
        +F(I.fHash,'Card Number',E(cardNo(c)))+F(I.fCal,'Benefit Period',E(mLabel(m)))
        +F(I.fCash,'Last Month',lm?money(sum(lm)):'—')+F(I.fCash,'Monthly Entitlement',money(sum(pl)))
        +F(I.fCash,'Adjustments',live?(function(ad){return ad?'<span style="font-weight:600;color:'+(ad>0?'#15803d':'#b45309')+'">'+signed(ad)+'</span>':signed(ad);})(sum(fin)-sum(pl)):'—')+F(I.fCash,r?'Loaded':'Final Proposed Load',live?money(sum(fin)):'—')
        +(k&&k.by&&(st==='Reviewed'||st==='Approved'||r)?F(I.fUser,'Reviewed By',E(k.by)):'')+(k&&k.approvedBy&&(st==='Approved'||r)?F(I.fUser,'Approved By',E(k.approvedBy)):'')
        +(r?F(I.fCal,'Disbursed On',E(r.at))+F(I.fUser,'Disbursed By',E(r.by)):'')
        +(st==='Rejected'&&k?F(I.fTag,'Rejection Reason',E(k.reason||'—')):'')
        +(st==='Inactive'?F(I.fTag,'Not Processed Because',E(why(c))):'')
        +'</div>';
    }
    return (typeof axTabBar==='function'?axTabBar('bpx',tabs,tab,'bpxNav','bpxClose'):'')+'<div class="lp-isb-body">'+body+'</div>';
  }
  const repanel=function(){if(typeof isbTab==='function'&&document.getElementById('bpx-split-sb'))isbTab('bpx',panelHTML);else renderADTPage();};

  /* ── Logs: the step that is open to this user, with a comment ── */
  const MOVES={'Reviewed':'submit','Approved':'approve','Rejected':'reject','Disbursed':'disburse'};
  function movesOf(c){
    if(!isNow())return [];
    const s=status(c,month());
    if((s==='Pending'||s==='Rejected')&&canSubmit())return ['Reviewed'];
    if(s==='Reviewed'&&canApprove())return ['Approved','Rejected'];
    if(s==='Approved'&&canApprove())return ['Disbursed'];
    return [];
  }
  function logForm(c){
    const mv=movesOf(c);if(!mv.length||typeof lpLogStatusField!=='function')return '';
    const a=act&&act.id===c.id?act:null,st=status(c,month());
    return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+st+'</div><p class="lp-logs-form-sub"></p>'
      +lpLogStatusField('bpxl-act-'+c.id,st,[st].concat(mv),'bpxLogPick')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="bpxl-note" placeholder="Enter comment">'+E(a?a.note||'':'')+'</textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="bpxLogCancel()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="bpxLogSubmit('+c.id+')">Submit</button></div></div>';
  }
  window.bpxLogPick=function(val,csid){
    const id=Number(String(csid||'').replace(/^bpxl-act-/,''));if(!id||!val)return;
    if(act&&act.id===id&&act.label===val)return;   // the Logs view picks it again as it draws
    const cc=typeof ccCard==='function'?ccCard(id):null;
    if(!MOVES[val]||!cc||val===status(cc,month())){if(!act)return;act=null;}   // the current status is not a step
    else{const ta=document.getElementById('bpxl-note');act={id:id,label:val,note:ta?ta.value:''};}
    repanel();
  };
  window.bpxLogCancel=function(){if(act){act=null;repanel();}};
  window.bpxLogSubmit=function(id){
    const c=typeof ccCard==='function'?ccCard(id):null,a=act&&act.id===id?act:null;if(!c)return;
    if(!a){say('Pick a step','error','Choose the step first.');return;}
    const ta=document.getElementById('bpxl-note'),note=String(ta?ta.value:a.note||'').trim();
    if(!note){if(ta)ta.classList.add('is-invalid');say('Comment is required','error','Write a comment for '+a.label+'.');return;}
    const what=MOVES[a.label],amount=money(sum(finalOf(c,nowM())));let err='',done='',ref='';
    if(what==='submit'){err=submit(c,note);done='Marked as reviewed';}
    else if(what==='reject'){err=decline(c,note);done='Rejected';}
    else if(what==='approve'){err=approveOne(c,note);done='Approved';}
    else{const r=disburse([c],note);err=r.error||'';done='Wallets credited';if(r.run)ref=r.run.key+' · ';}
    if(err){say('Not done','error',err);return;}
    act=null;adjOf=null;delete sel[c.id];saved();renderADTPage();
    say(done,'success',ref+empName(c)+' · '+mLabel(nowM())+' · '+amount+'.');
  };

  /* ── Adjustments ── */
  const adjRead=function(){
    if(!adjOf)return;const g=function(id){return typeof getCSValue==='function'?getCSValue(id)||'':'';};
    const t=g('bpx-a-type'),r=g('bpx-a-reason'),a=document.getElementById('bpx-a-amt'),n=document.getElementById('bpx-a-notes');
    if(t==='Additional Allocation'||t==='Entitlement Reduction')adjOf.draft.type=t;
    if(REASONS.indexOf(r)>=0)adjOf.draft.reason=r;
    if(a)adjOf.draft.amount=a.value.trim();if(n)adjOf.draft.notes=n.value.trim();
  };
  window.bpxAdjOpen=function(t){
    const c=typeof ccCard==='function'?ccCard(open):null;if(!c||!editable(c,month()))return;
    const k=calc(c,month()),a=k&&k.adj?k.adj[t]:null;
    adjOf={wallet:t,draft:a?{type:a.type,amount:String(a.amount),reason:a.reason,notes:a.notes||''}:{type:'Entitlement Reduction',amount:'',reason:'',notes:''}};
    repanel();paintConfirm();
  };
  window.bpxAdjCancel=function(){adjOf=null;paintConfirm();repanel();};
  window.bpxAdjDoneClose=function(){adjDone=null;paintConfirm();};
  /* Type, amount or reason changed: the Final Load preview; picking Other marks Notes as required. */
  window.bpxAdjHook=function(){
    if(!adjOf)return;const was=adjOf.draft.reason;adjRead();
    const c=typeof ccCard==='function'?ccCard(open):null;if(!c)return;
    if((was==='Other')!==(adjOf.draft.reason==='Other')){paintConfirm();return;}
    const el=document.getElementById('bpx-a-final'),d=adjOf.draft;
    if(el)el.textContent=money(Math.max(0,(plan(c)[adjOf.wallet]||0)+(d.type==='Entitlement Reduction'?-1:1)*(parseFloat(d.amount)||0)));
  };
  window.bpxAdjSave=function(){
    const c=typeof ccCard==='function'?ccCard(open):null,m=month();if(!c||!adjOf)return;
    if(!editable(c,m)){adjOf=null;paintConfirm();renderADTPage();return;}
    adjRead();
    const d=adjOf.draft,t=adjOf.wallet,en=plan(c)[t]||0,n=parseFloat(d.amount);
    if(d.type!=='Additional Allocation'&&d.type!=='Entitlement Reduction'){say('Adjustment Type is required','error');return;}
    if(!(n>0)){say('Amount is required','error','Enter an amount greater than 0.');return;}
    if(d.type==='Entitlement Reduction'&&n>en){say('Entitlement Reduction is too large','error',wName(t)+' cannot go below zero: the entitlement is '+money(en)+'.');return;}
    if(!d.reason){say('Reason is required','error','Pick why the load is adjusted.');return;}
    if(d.reason==='Other'&&!d.notes){say('Notes are required','error','Say what the adjustment is for.');return;}
    const k=calc(c,m,true),was=k.adj[t];
    k.adj[t]={type:d.type,amount:Math.round(n*100)/100,reason:d.reason,notes:d.notes,by:meName(),at:today()};
    const fin=Math.max(0,en+adjAmt(k.adj[t]));
    addLog(c,status(c,m),'Adjustment','Adjustment '+(was?'changed':'added')+' · '+wName(t)+': '+d.type+' '+money(n)+' ('+money(en)+' → '+money(fin)+'). Reason: '+d.reason+(d.notes?' - '+d.notes.replace(/.+$/,''):'')+'.');
    adjOf=null;saved();renderADTPage();
    adjDone={name:empName(c),wallet:wName(t),fin:money(fin),month:mLabel(m)};paintConfirm();
  };
  window.bpxAdjRemove=function(){
    const c=typeof ccCard==='function'?ccCard(open):null,m=month();if(!c||!adjOf||!editable(c,m))return;
    const k=calc(c,m,true),t=adjOf.wallet;if(!k.adj[t]){adjOf=null;paintConfirm();renderADTPage();return;}
    delete k.adj[t];
    addLog(c,status(c,m),'Adjustment','Adjustment removed · '+wName(t)+': back to the entitlement of '+money(plan(c)[t]||0)+'.');
    adjOf=null;saved();renderADTPage();paintConfirm();
    say('Adjustment removed','success',empName(c)+' · '+wName(t)+'.');
  };

  /* ── The summary before a bulk submit or approval ── */
  function summary(mode){
    const m=month(),p=picked();
    const go=[],inactive=[],other=[],changes=[],adjList=[],byW={};let skip=0;
    p.forEach(function(c){
      const st=status(c,m);
      if(mode==='submit'){
        if(st==='Inactive'){inactive.push({c:c,why:why(c),amount:sum(plan(c))});return;}
        if(st==='Reviewed'||st==='Approved'){skip++;return;}
        if(st!=='Pending'&&st!=='Rejected'){other.push(c);return;}
      }else{
        if(st!==(mode==='disburse'?'Approved':'Reviewed')){skip++;return;}
        if(why(c)){inactive.push({c:c,why:why(c),amount:sum(finalOf(c,m))});return;}
      }
      const en=entOf(c,m),fin=finalOf(c,m),a=adjs(c,m),lm=last(c,m);
      if(!(sum(fin)>0)){other.push(c);return;}
      go.push({c:c,ent:en,wallets:fin,total:sum(fin)});
      Object.keys(en).forEach(function(k){const w=byW[k]||(byW[k]={n:0,ent:0,fin:0});w.n++;w.ent+=en[k];w.fin+=fin[k]||0;});
      Object.keys(a).forEach(function(k){if(en[k]!=null)adjList.push({c:c,wallet:k,a:a[k],was:en[k],now:fin[k]});});
      if(lm){Object.keys(en).concat(Object.keys(lm)).filter(function(k,i,x){return x.indexOf(k)===i;}).forEach(function(k){const x=Number(lm[k])||0,y=Number(en[k])||0;if(x!==y)changes.push({c:c,wallet:k,was:x,now:y});});}
    });
    return {mode:mode,month:m,picked:p.length,skip:skip,go:go,inactive:inactive,other:other,changes:changes,adjList:adjList,byW:byW,
      total:go.reduce(function(s,x){return s+x.total;},0),ent:go.reduce(function(s,x){return s+sum(x.ent);},0)};
  }
  const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const CAP='font-size:10.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#6b7280';
  function confirmHTML(){
    const s=confirm;if(!s)return '';
    const ap=s.mode!=='submit',dis=s.mode==='disburse',FROM=dis?'Approved':ap?'Reviewed':'Pending',TO=dis?'Disbursed':ap?'Approved':'Reviewed';
    const tile=function(l,v,sub){return '<div class="bpx-tile"><div style="'+CAP+'">'+l+'</div><div class="bpx-tile-v">'+v+'</div><div class="bpx-tile-s">'+sub+'</div></div>';};
    const sec=function(t,n){return '<div style="'+CAP+';margin:18px 0 8px">'+t+(n!=null?' · '+n:'')+'</div>';};
    const tbl=function(head,rows){return '<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div>';};
    const types=benefitTypes().filter(function(t){return s.byW[t];});
    const up=s.changes.filter(function(x){return x.now>x.was;}).length,held=s.inactive.reduce(function(a,x){return a+x.amount;},0),net=s.total-s.ent;
    let h='<div class="ct-modal-overlay" style="z-index:2000" onclick="bpxConfirmClose()"><div class="ct-modal bpx-modal" style="width:min(940px,95vw)" role="dialog" aria-modal="true" aria-label="Benefit load summary" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><div><span class="ct-modal-title">'+(dis?'Disburse benefit load':ap?'Approve benefit load':'Mark as reviewed')+' · '+E(mLabel(s.month))+'</span>'
      +'<div style="font-size:13px;color:#6b7280;margin-top:3px">'+(dis?'Check the amounts below. Disbursing credits the wallets at once.':ap?'Check the amounts below. Approved cards can then be disbursed; no wallet is credited yet.':'Check the limits, adjustments and statuses below. Finance approves the reviewed cards before any wallet is loaded.')+'</div></div>'
      +'<button class="ct-modal-close" onclick="bpxConfirmClose()" aria-label="Close">'+X+'</button></div>'
      +'<div class="bpx-sum">'
      +'<div class="bpx-step"><span>'+badge(TONE[FROM]||'idle',FROM)+'</span><span class="bpx-step-arrow">→</span><span>'+badge(TONE[TO]||'idle',TO)+'</span>'
        +'<span class="bpx-step-txt"><b>'+s.go.length+'</b> of '+s.picked+' selected card'+(s.picked===1?'':'s')+' · <b>'+money(s.total)+'</b>'+(dis?' credited to the wallets':ap?' approved, not credited yet':' reviewed, sent for approval')+'</span></div>'
      +'<div class="bpx-tiles">'+tile(dis?'To Disburse':ap?'To Approve':'To Review',s.go.length,money(s.total))
        +tile('Adjustments',s.adjList.length,s.adjList.length?'net '+signed(net):'none')
        +tile('Limit Changes',s.changes.length,s.changes.length?up+' higher · '+(s.changes.length-up)+' lower':'same as last month')
        +tile('Inactive',s.inactive.length,s.inactive.length?money(held)+' held back':'none')+'</div>';
    if(types.length)h+=sec('Load by wallet')+tbl('<th>Wallet</th><th class="bpx-num">Cards</th><th class="bpx-num">Entitlement</th><th class="bpx-num">Adjustment</th><th class="bpx-num">Final Load</th>',
      types.map(function(t){const w=s.byW[t],d=w.fin-w.ent;return '<tr><td class="csag-td"><div class="lp-c-main">'+E(wName(t))+'</div></td><td class="csag-td bpx-num">'+w.n+'</td><td class="csag-td bpx-num">'+money(w.ent)+'</td><td class="csag-td bpx-num">'+(d?signed(d):'—')+'</td><td class="csag-td bpx-num">'+money(w.fin)+'</td></tr>';}).join('')
      +'<tr class="bpx-total"><td class="csag-td"><b>Total</b></td><td class="csag-td bpx-num"><b>'+s.go.length+'</b></td><td class="csag-td bpx-num"><b>'+money(s.ent)+'</b></td><td class="csag-td bpx-num"><b>'+(net?signed(net):'—')+'</b></td><td class="csag-td bpx-num"><b>'+money(s.total)+'</b></td></tr>');
    if(s.adjList.length)h+=sec('Adjustments this month',s.adjList.length)+tbl('<th>Employee</th><th>Wallet</th><th class="bpx-num">Entitlement</th><th class="bpx-num">Adjustment</th><th class="bpx-num">Final Load</th><th>Reason</th>',
      s.adjList.map(function(x){const d=adjAmt(x.a);return '<tr><td class="csag-td"><div class="lp-c-main">'+E(empName(x.c))+'</div></td><td class="csag-td">'+E(wName(x.wallet))+'</td><td class="csag-td bpx-num">'+money(x.was)+'</td>'
        +'<td class="csag-td bpx-num" style="font-weight:600;color:'+(d>0?'#15803d':'#b45309')+'">'+signed(d)+'</td><td class="csag-td bpx-num">'+money(x.now)+'</td><td class="csag-td">'+E(x.a.reason)+'</td></tr>';}).join(''));
    if(s.changes.length)h+=sec('Limit changed since '+E(mLabel(prevOf(s.month))),s.changes.length)+tbl('<th>Employee</th><th>Wallet</th><th class="bpx-num">Last Month</th><th class="bpx-num">This Month</th><th class="bpx-num">Change</th>',
      s.changes.map(function(x){const d=x.now-x.was;
        return '<tr><td class="csag-td"><div class="lp-c-main">'+E(empName(x.c))+'</div></td><td class="csag-td">'+E(wName(x.wallet))+'</td><td class="csag-td bpx-num">'+(x.was?money(x.was):'—')+'</td><td class="csag-td bpx-num">'+(x.now?money(x.now):'—')+'</td>'
          +'<td class="csag-td bpx-num" style="font-weight:600;color:'+(d>0?'#15803d':'#b45309')+'">'+(d>0?'▲ ':'▼ ')+money(Math.abs(d))+'</td></tr>';}).join(''));
    if(s.inactive.length)h+=sec('Inactive · not '+(dis?'disbursed':ap?'approved':'reviewed'),s.inactive.length)+tbl('<th>Employee</th><th>Card</th><th>Reason</th><th class="bpx-num">Amount Held Back</th>',
      s.inactive.map(function(x){return '<tr><td class="csag-td"><div class="lp-c-main">'+E(empName(x.c))+'</div></td><td class="csag-td" style="white-space:nowrap">'+E(cardNo(x.c))+'</td><td class="csag-td">'+E(x.why)+'</td><td class="csag-td bpx-num">'+money(x.amount)+'</td></tr>';}).join('')
      +'<tr class="bpx-total"><td class="csag-td" colspan="3"><b>Total held back</b></td><td class="csag-td bpx-num"><b>'+money(held)+'</b></td></tr>');
    if(s.go.length)h+=sec('Cards in this step',s.go.length)+tbl('<th>S. No</th><th>Employee</th><th>Card</th><th class="bpx-num">Entitlement</th><th class="bpx-num">Adjustment</th><th class="bpx-num">Final Load</th>',
      s.go.map(function(x,i){const en=sum(x.ent),d=x.total-en;
        return '<tr><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td"><div class="lp-c-main">'+E(empName(x.c))+'</div></td><td class="csag-td" style="white-space:nowrap">'+E(cardNo(x.c))+'</td><td class="csag-td bpx-num">'+money(en)+'</td>'
          +'<td class="csag-td bpx-num"'+(d?' style="font-weight:600;color:'+(d>0?'#15803d':'#b45309')+'"':'')+'>'+(d?signed(d):'—')+'</td><td class="csag-td bpx-num" style="font-weight:600">'+money(x.total)+'</td></tr>';}).join('')
      +'<tr class="bpx-total"><td class="csag-td" colspan="3"><b>Total</b></td><td class="csag-td bpx-num"><b>'+money(s.ent)+'</b></td><td class="csag-td bpx-num"><b>'+(net?signed(net):'—')+'</b></td><td class="csag-td bpx-num"><b>'+money(s.total)+'</b></td></tr>');
    if(s.skip)h+='<div class="wb-muted" style="font-size:12.5px;margin-top:12px">'+s.skip+' selected card'+(s.skip===1?' is':'s are')+' at another step and '+(s.skip===1?'is':'are')+' not part of this one.</div>';
    if(s.other.length)h+=sec('Nothing to load',s.other.length)+'<div class="wb-muted" style="font-size:13px">'+E(s.other.map(empName).join(', '))+' - no wallet limit is set, or the final load is 0.</div>';
    h+='</div><div class="ct-modal-foot"><span class="wb-muted" style="font-size:12.5px">'+(s.go.length?(dis?'Each card is credited once for '+E(mLabel(s.month))+'.':ap?'Approved calculations go on to Disburse.':'Reviewed calculations cannot be edited until they are decided.'):'Nothing to '+(dis?'disburse':ap?'approve':'review')+' in this selection.')+'</span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="bpxConfirmClose()">Cancel</button>'
      +'<button class="ep-save-btn" '+(s.go.length?'':'disabled style="opacity:.5;cursor:not-allowed" ')+'onclick="bpxConfirmGo()">'+(dis?'Disburse':ap?'Approve':'Mark Reviewed')+'</button></div></div></div></div>';
    return h;
  }
  function rejectHTML(){
    if(!reject)return '';
    return '<div class="ct-modal-overlay" style="z-index:2000" onclick="bpxRejectClose()"><div class="ct-modal" style="width:min(520px,95vw)" role="dialog" aria-modal="true" aria-label="Reject benefit load" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><div><span class="ct-modal-title">Reject '+reject.n+' benefit load'+(reject.n===1?'':'s')+'</span><div style="font-size:13px;color:#6b7280;margin-top:3px">No wallet balance changes. The Company Admin can edit and submit again.</div></div>'
      +'<button class="ct-modal-close" onclick="bpxRejectClose()" aria-label="Close">'+X+'</button></div>'
      +'<div style="padding:16px 0 6px"><label class="ep-form-label" for="bpx-rej-note">Reason <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="bpx-rej-note" style="border-radius:8px" placeholder="Why these are rejected"></textarea></div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="bpxRejectClose()">Cancel</button><button class="ep-save-btn" onclick="bpxRejectGo()">Reject</button></div></div></div></div>';
  }
  const root=function(){let el=document.getElementById('bpx-confirm-root');if(!el){el=document.createElement('div');el.id='bpx-confirm-root';document.body.appendChild(el);}return el;};
  const paintConfirm=function(){root().innerHTML=confirm?confirmHTML():reject?rejectHTML():adjDone?adjDoneHTML():adjOf?adjModalHTML():'';};

  /* ── Actions ── */
  const repaintBar=function(){
    const b=document.getElementById('bpx-bar');if(b)b.innerHTML=barContent();
    syncBar();
    const a=document.getElementById('bpx-all');if(a){const ok=shown().filter(pickable);a.checked=ok.length>0&&ok.every(function(c){return sel[c.id];});}
  };
  window.bpxPick=function(id,on){if(on)sel[id]=true;else delete sel[id];repaintBar();};
  window.bpxAll=function(on){shown().filter(pickable).forEach(function(c){if(on)sel[c.id]=true;else delete sel[c.id];});renderADTPage();};
  window.bpxApply=function(){
    q=typeof lpSearchValue==='function'?lpSearchValue('bpx-q'):'';
    const g=function(id){return typeof getCSValue==='function'?getCSValue(id)||'':'';};
    const y=g('bpx-year'),mo=g('bpx-month'),b=g('bpx-branch'),d=g('bpx-dept'),s=g('bpx-status');
    if(/^\d{4}$/.test(y))fy=+y;if(MON.indexOf(mo)>=0)fm=MON.indexOf(mo)+1;
    fBranch=/^All /.test(b)?'':b;fDept=/^All /.test(d)?'':d;fStatus=/^All /.test(s)?'':s;
    open=null;adjOf=null;act=null;renderADTPage();
  };
  window.bpxReset=function(){q='';fBranch='';fDept='';fStatus='';open=null;adjOf=null;act=null;renderADTPage();};
  window.bpxStat=function(s){fStatus=fStatus===s?'':s;open=null;adjOf=null;act=null;renderADTPage();};
  window.bpxOpen=function(id){
    if(open!==id){act=null;adjOf=null;tab='details';}
    open=id;
    const sb=document.getElementById('bpx-split-sb');if(!sb||typeof isbTab!=='function'){renderADTPage();return;}
    sb.classList.add('open');isbTab('bpx',panelHTML);
    document.querySelectorAll('.bpx-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='bpx-row-'+id);});
  };
  window.bpxClose=function(){open=null;act=null;adjOf=null;tab='details';const sb=document.getElementById('bpx-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.bpx-row').forEach(function(x){x.classList.remove('lp-row-selected');});};
  window.bpxNav=function(t){tab=t;if(t!=='wallets')adjOf=null;if(t!=='logs')act=null;repanel();};
  window.bpxConfirmOpen=function(mode){
    if(!isNow()||(mode==='submit'?!canSubmit():!canApprove()))return;
    if(!picked().length){say('Select cards','error','Tick the cards to process, or Select all.');return;}
    reject=null;confirm=summary(mode);paintConfirm();
  };
  window.bpxConfirmClose=function(){confirm=null;paintConfirm();};
  window.bpxConfirmGo=function(){
    if(!confirm)return;
    /* Worked out again at this moment, from the cards as they are now. */
    const mode=confirm.mode,s=summary(mode),m=s.month;confirm=null;paintConfirm();
    if(!s.go.length)return;
    if(mode==='disburse'){
      const r=disburse(s.go.map(function(x){return x.c;}),'');
      if(r.error){say('Not done','error',r.error);return;}
      s.go.forEach(function(x){delete sel[x.c.id];});saved();renderADTPage();
      say('Wallets credited','success',r.run.key+' · '+mLabel(m)+' · '+r.n+' card'+(r.n===1?'':'s')+' · '+money(r.run.total)+'.');
      return;
    }
    if(mode==='approve'){
      let k=0,t=0;
      s.go.forEach(function(x){if(!approveOne(x.c,'')){k++;t+=x.total;}delete sel[x.c.id];});
      saved();renderADTPage();
      say('Approved','success',mLabel(m)+' · '+k+' card'+(k===1?'':'s')+' · '+money(t)+'. Select them to disburse.');
      return;
    }
    let n=0,total=0;
    s.go.forEach(function(x){if(!submit(x.c,'')){n++;total+=x.total;}delete sel[x.c.id];});
    s.inactive.concat(s.other.map(function(c){return {c:c};})).forEach(function(x){delete sel[x.c.id];});
    saved();renderADTPage();
    say('Marked as reviewed','success',mLabel(m)+' · '+n+' card'+(n===1?'':'s')+' · '+money(total)+(s.inactive.length?' · '+s.inactive.length+' inactive not reviewed':'')+'.');
  };
  window.bpxRejectOpen=function(){
    if(!canApprove()||!isNow())return;
    const n=picked().filter(function(c){return status(c,month())==='Reviewed';}).length;
    if(!n){say('Select cards','error','Tick the reviewed cards.');return;}
    confirm=null;reject={n:n};paintConfirm();
    const t=document.getElementById('bpx-rej-note');if(t)t.focus();
  };
  window.bpxRejectClose=function(){reject=null;paintConfirm();};
  window.bpxRejectGo=function(){
    if(!reject)return;
    const t=document.getElementById('bpx-rej-note'),note=String(t?t.value:'').trim();
    if(!note){if(t)t.classList.add('is-invalid');say('Reason is required','error','Say why the load is rejected.');return;}
    let n=0;
    picked().filter(function(c){return status(c,month())==='Reviewed';}).forEach(function(c){if(!decline(c,note))n++;delete sel[c.id];});
    reject=null;paintConfirm();saved();renderADTPage();
    say('Rejected','success',n+' benefit load'+(n===1?'':'s')+' rejected. No wallet balance changed.');
  };
  document.addEventListener('keydown',function(ev){if(ev.key!=='Escape')return;if(confirm)window.bpxConfirmClose();else if(reject)window.bpxRejectClose();});

  /* Start the month again (product owner, 15 Nov 2026: "i want to show it to people multiple times ... a small refresh
     button on the side of the switch role, on clicking it will again change all the status to pending"). This month's
     cards go back to Pending: the reviews, approvals, rejections and disbursements of the month are taken back - so
     the wallet balances return to what they were before the load - and their log lines are removed. The adjustments
     stay, so the run can be shown again as it was. Nothing outside this page's own records is touched. */
  window.bpxResetMonth=function(){
    const e=entRec(),m=nowM();if(!e||!canSubmit())return;
    const t=m.split('-'),tag=' '+MON[+t[1]-1].slice(0,3)+' '+t[0];
    const gone=(e.bpRuns||[]).filter(function(r){return r.month===m;});
    e.bpRuns=(e.bpRuns||[]).filter(function(r){return r.month!==m;});
    const cm=(e.bpCalc&&e.bpCalc[m])||{};
    let n=0;
    Object.keys(cm).forEach(function(id){const k=cm[id];if(k.status!=='Pending')n++;
      k.status='Pending';delete k.wallets;delete k.ent;delete k.by;delete k.at;delete k.approvedBy;delete k.approvedAt;delete k.reason;});
    Object.keys(e.bpLogs||{}).forEach(function(id){
      e.bpLogs[id]=e.bpLogs[id].filter(function(l){return l.step==='Adjustment'||String(l.date||'').slice(-tag.length)!==tag;});});
    /* the line each disbursement wrote to the card's own Logs */
    const keys=gone.map(function(r){return 'Benefit load '+r.key+' ';});
    if(keys.length)cards().forEach(function(c){if(Array.isArray(c.logs))c.logs=c.logs.filter(function(l){const a=String(l.action||'');return !keys.some(function(k){return a.indexOf(k)===0;});});});
    sel={};act=null;adjOf=null;confirm=null;reject=null;paintConfirm();fStatus='';
    saved();renderADTPage();
    say('Started again','success',mLabel(m)+': every card is Pending'+(gone.length?'; wallet balances are back to before the load':'')+'.');
  };
  const RESET_ICO='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
  function resetBtn(){
    let b=document.getElementById('bpx-reset');
    const show=typeof page!=='undefined'&&page===PG&&canSubmit();
    if(!b){
      if(!show)return;
      const w=document.getElementById('role-dd-wrap');if(!w||!w.parentNode)return;
      b=document.createElement('button');b.type='button';b.id='bpx-reset';b.className='bpx-reset';
      b.title='Start again: set every card to Pending for this month';b.setAttribute('aria-label',b.title);
      b.innerHTML=RESET_ICO;b.onclick=function(){window.bpxResetMonth();};
      w.parentNode.insertBefore(b,w);
    }
    b.style.display=show?'':'none';
  }

  /* ── Look ── */
  (function(){
    if(document.getElementById('bpx-style'))return;
    const st=document.createElement('style');st.id='bpx-style';
    st.textContent='.bpx-ck{width:38px;text-align:center}.bpx-ck input{width:15px;height:15px;accent-color:#1a1a1a;cursor:pointer;margin:0;vertical-align:middle}'
      +'.bpx-num{text-align:right!important;white-space:nowrap;font-variant-numeric:tabular-nums}'
      +'.bpx-amt{text-align:left!important;white-space:nowrap;font-variant-numeric:tabular-nums}'
      +'.bpx-table th,.bpx-table td{text-align:left}.bpx-table>thead>tr>th{white-space:nowrap!important}'
      +'.bpx-barwrap{display:grid;grid-template-rows:1fr;opacity:1;transform:translateY(0);transition:grid-template-rows .32s cubic-bezier(.4,0,.2,1),opacity .26s ease,transform .32s cubic-bezier(.4,0,.2,1)}'
      +'.bpx-barwrap.is-off{grid-template-rows:0fr;opacity:0;transform:translateY(-6px);pointer-events:none}'
      +'.bpx-barin{overflow:hidden;min-height:0}'
      +'@media (prefers-reduced-motion:reduce){.bpx-barwrap{transition:none}}'
      +'.bpx-table>thead>tr>th:nth-child(1){width:44px}.bpx-table>thead>tr>th:nth-child(2){width:80px}'
      +'.bpx-table>thead>tr>th:nth-child(3){width:21%}.bpx-table>thead>tr>th:nth-child(4){width:20%}'
      +'.bpx-table>thead>tr>th:nth-child(5){width:19%}.bpx-table>thead>tr>th:nth-child(6){width:14%}'
      +'.bpx-table>thead>tr>th:nth-child(7){width:13%}.bpx-table>thead>tr>th:nth-child(8){width:72px}'
      +'.bpx-table .bpx-ck{text-align:center}'
      +'.bpx-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:10px 14px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;font-size:13px;color:var(--navy,#0f172a);min-height:52px}'
      +'.bpx-bar-txt b{font-weight:600}.bpx-bar-btns{display:flex;gap:8px;flex-shrink:0}'
      +'.bpx-sum{max-height:62vh;overflow:auto;padding:16px 0 4px}'
      /* The summary modal: one scroller (the body), header and footer fixed, every corner clipped to the radius. */
      +'.ct-modal.bpx-modal{display:flex;flex-direction:column;max-height:88vh;overflow:hidden;border-radius:16px;padding-bottom:0}'
      +'.bpx-modal>.ct-modal-hdr{flex-shrink:0}'
      +'.bpx-modal>.bpx-sum{flex:1 1 auto;min-height:0;max-height:none;overflow-y:auto;overflow-x:hidden;margin:0 -28px;padding:4px 28px 20px;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}'
      +'.bpx-modal>.bpx-sum::-webkit-scrollbar{width:6px}.bpx-modal>.bpx-sum::-webkit-scrollbar-track{background:transparent}'
      +'.bpx-modal>.bpx-sum::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:6px}'
      +'.bpx-modal>.ct-modal-foot{position:static;flex-shrink:0;margin:0 -28px;border-radius:0}'
      +'.ct-modal.bpx-adj-modal{width:min(560px,95vw)}.bpx-adj-modal .bpx-adj-ent{margin-bottom:16px}.bpx-adj-modal .bpx-adj-ent.is-final{margin:16px 0 0}'
      +'.bpx-adj-modal .ct-modal-close svg{width:12px;height:12px}'
      +'.bpx-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'
      +'.bpx-tile{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:12px 14px;background:#f8fafc;min-width:0}'
      +'.bpx-tile-v{font-size:22px;line-height:28px;font-weight:700;color:var(--navy,#0f172a);margin-top:4px}'
      +'.bpx-tile-s{font-size:12px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.bpx-total td{background:#f8fafc}'
      +'.bpx-reset{width:34px;height:34px;border:1px solid var(--border,#e5e7eb);border-radius:9px;background:#fff;color:var(--navy,#0f172a);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;margin-right:8px;flex-shrink:0}'
      +'.bpx-reset:hover{background:#f1f5f9}'
      +'.bpx-step{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin-bottom:12px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;font-size:13px;color:var(--navy,#0f172a)}'
      +'.bpx-step-arrow{color:#6b7280;font-size:15px}.bpx-step-txt{margin-left:6px}.bpx-step-txt b{font-weight:700}'
      +'.bpx-calc tr.bpx-on td{background:#f1f5f9}'
      +'.bpx-pen{width:40px;text-align:right}.bpx-pen-btn{width:28px;height:28px;border:1px solid var(--border,#e5e7eb);border-radius:8px;background:#fff;color:var(--navy,#0f172a);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}'
      +'.bpx-pen-btn:hover{background:#f1f5f9}.bpx-pen-btn svg{width:13px;height:13px}'
      +'.bpx-totals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:12px;border:1px solid var(--border,#e5e7eb);border-radius:12px;overflow:hidden;background:#fff}'
      +'.bpx-totals>div{padding:12px 16px;border-left:1px solid var(--border,#e5e7eb);min-width:0}.bpx-totals>div:first-child{border-left:0}'
      +'.bpx-totals span{display:block;font-size:12px;color:#6b7280}.bpx-totals b{display:block;font-size:18px;line-height:26px;font-weight:700;color:var(--navy,#0f172a);margin-top:2px;white-space:nowrap}'
      +'.bpx-totals .is-final{background:#f1f5f9}'
      +'.bpx-adj{margin-top:14px;border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:16px;background:#fff}'
      +'.bpx-adj-ttl{font-size:15px;font-weight:600;color:var(--navy,#0f172a)}.bpx-adj-sub{font-size:12.5px;color:#6b7280;margin:2px 0 12px}'
      +'.bpx-adj-ent{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:10px;background:#f8fafc;border:1px solid var(--border,#e5e7eb);font-size:13px;color:var(--navy,#0f172a);margin-bottom:14px}'
      +'.bpx-adj-ent b{font-size:15px;font-weight:700}.bpx-adj-ent.is-final{margin:14px 0 0;background:#f1f5f9}'
      +'.bpx-vals{margin-top:14px;border:1px solid var(--st-ok-bd,#bbf7d0);background:var(--st-ok-bg,#f0fdf4);border-radius:10px;padding:12px 14px}'
      +'.bpx-vals-ttl{font-size:13px;font-weight:600;color:var(--navy,#0f172a);margin-bottom:6px}'
      +'.bpx-val{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:1.5;color:var(--navy,#0f172a);padding:2px 0}'
      +'.bpx-val span{width:18px;height:18px;border-radius:50%;background:#16a34a;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}.bpx-val span svg{width:11px;height:11px}'
      +'.bpx-val.is-bad span{background:#dc2626}'
      +'@media(max-width:720px){.bpx-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}';
    (document.head||document.documentElement).appendChild(st);
  })();

  /* ── The menu item, right under Card List; the page ── */
  const g=sidebarItems.find(function(x){return x&&x.dropdown==='Corporate Cards';});
  if(g&&!g.children.some(function(c){return c.id===PG;})){
    const I=typeof sbIco!=='undefined'?sbIco:{};
    let at=g.children.findIndex(function(c){return c.id==='card-list-all';});
    if(at<0)at=g.children.findIndex(function(c){return c.id==='card-products';});
    g.children.splice(at<0?g.children.length:at+1,0,{id:PG,label:TITLE,color:'green',icon:I.wallet||I.card||''});
  }
  /* What a browser saved earlier: the old menu label and the old adjustment words (product owner, 16 Nov 2026:
     Increase is Additional Allocation, Decrease is Entitlement Reduction). Wording only, no amount changes. */
  function bpxTidy(){
    try{
      let ch=false;
      sidebarItems.forEach(function(x){(x&&x.children||[]).forEach(function(c){if(c.id===PG&&c.label!==TITLE){c.label=TITLE;ch=true;}});});
      const W={Increase:'Additional Allocation',Decrease:'Entitlement Reduction'};
      const walk=function(o,d){if(!o||typeof o!=='object'||d>6)return;
        if(typeof o.type==='string'&&W[o.type]&&'amount' in o){o.type=W[o.type];ch=true;}
        Object.keys(o).forEach(function(k){walk(o[k],d+1);});};
      (typeof entitiesData!=='undefined'?entitiesData:[]).forEach(function(e){
        if(!e)return;walk(e.bpCalc,0);walk(e.bpRuns,0);
        Object.keys(e.bpLogs||{}).forEach(function(id){(e.bpLogs[id]||[]).forEach(function(l){
          if(l&&typeof l.action==='string'){const n=l.action.replace(/: Increase /g,': Additional Allocation ').replace(/: Decrease /g,': Entitlement Reduction ');if(n!==l.action){l.action=n;ch=true;}}});});
      });
      return ch;
    }catch(e){return false;}
  }
  bpxTidy();
  Promise.resolve(window.PRES_READY).then(function(){try{if(bpxTidy()){if(typeof buildSidebar==='function')buildSidebar();if(typeof presSaveSoon==='function')presSaveSoon();}}catch(e){}});
  if(typeof supportPageMeta!=='undefined')supportPageMeta[PG]={title:TITLE,context:TITLE,filters:[],columns:[],rows:[]};
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[PG]='cards';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(PG)<0)EMS_CLIENT_PAGES.push(PG);
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg!==PG)return p0.apply(this,arguments);
      return p0('cards')&&(canSubmit()||canApprove());
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
      try{resetBtn();}catch(e){}
      return out;
    };
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!==PG){confirm=null;reject=null;open=null;act=null;adjOf=null;adjDone=null;paintConfirm();}return n0.apply(this,arguments);};
  }
})();
