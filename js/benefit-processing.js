/* ══ CORPORATE CARDS → BENEFIT PROCESSING (product owner, 15 Nov 2026) ══════════════════════════════════════════════
   "under corporate cards, under card list, add Benefit Processing: a list of people with the card details as in the
   card list, select all or individual selection on the left of the line items. My main motive: every month i need to
   load each and every wallet, and before loading i need to check all the limits and statuses - when i select all and
   submit for load it will show in the summary that a person's limit was 3000 last month and is 4500 this month, and
   that there are 3 inactive members and their amount for the wallets which need not be refilled; on clicking a line
   item he can see all the details. This is a completely different process - nothing else should change."
   Decisions (product owner, 15 Nov 2026): Submit loads at once after the summary is confirmed · each wallet gets the
   employee's full limit (Wallet & Benefits → Employees / Card Benefit) · one row per employee's card · Company Admin
   and Super Admin only.
   How it works:
   - Filters: Year, Month, Branch, Department, Status, search. A card is Ready, Credited (this month's load is done),
     Inactive (the employee or the card is not Active) or No Limit (no wallet limit set).
   - The benefit wallets are loaded: Meal, Fuel, Gift, Telecom, Health - not Reimbursement or Corporate Expense, which
     are filled by claims and card loads.
   - Submit for Load opens the summary: what will be loaded per wallet, limits that differ from last month, and the
     inactive cards with the amount that is not loaded. Confirm & Load credits the wallets, once per card per month.
   - A run is kept with the company (entity record, bpRuns) and written to each card's Logs. The credit is a ledger
     entry of its own (js/ems-wallet-ledger.js emsLedgerEntries is extended), so balances on My Cards, Card List and
     the phone show it. No request, approval, funding posting or existing benefit batch is created or changed.
   - "Last month" is the previous month's run; before the first run it is a snapshot of the limits taken once.
   In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof sidebarItems==='undefined'||typeof renderPageContent!=='function'||typeof ccCards==='undefined')return;
  const PG='benefit-processing',TITLE='Benefit Processing';
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const entRec=function(){return typeof entitiesData!=='undefined'?entitiesData.find(function(e){return e.entityId===ent();})||null:null;};
  const can=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;};
  const money=function(n){return typeof expMoney==='function'?expMoney(Math.round(n*100)/100,'INR'):String(n);};
  const badge=function(tone,t){return typeof axBadge==='function'?axBadge(tone,t):E(t);};
  const today=function(){return typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);};
  const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const p2=function(n){return (n<10?'0':'')+n;};
  const mLabel=function(m){const t=String(m).split('-');return MON[+t[1]-1]+' '+t[0];};
  const prevOf=function(m){const t=m.split('-');let y=+t[0],k=+t[1]-1;if(k<1){k=12;y--;}return y+'-'+p2(k);};
  const SKIP=['CORP','REIMB'];
  const wName=function(t){return typeof wbTypeName==='function'?wbTypeName(t):t;};
  const TONE={'Ready':'info','Credited':'ok','Inactive':'idle','No Limit':'wait','Not Processed':'idle'};

  let fy=+today().slice(0,4),fm=+today().slice(5,7),fBranch='',fDept='',fStatus='',q='';
  let sel={},open=null,tab='details',confirm=null;
  const month=function(){return fy+'-'+p2(fm);};
  const isNow=function(){return month()===today().slice(0,7);};

  /* ── Data ── */
  const runs=function(){const e=entRec();return e&&Array.isArray(e.bpRuns)?e.bpRuns:[];};
  const runOf=function(m,cardId){return runs().find(function(r){return r.month===m&&r.items.some(function(i){return i.cardId===cardId;});})||null;};
  const itemOf=function(m,cardId){const r=runOf(m,cardId);return r?r.items.find(function(i){return i.cardId===cardId;}):null;};
  const benefitTypes=function(){
    if(typeof wbWallets==='undefined')return [];
    return wbWallets.filter(function(w){return w.entity===ent()&&w.status==='Active'&&SKIP.indexOf(w.type)<0;}).sort(function(a,b){return a.id-b.id;}).map(function(w){return w.type;});
  };
  const emp=function(c){return (typeof idEmp==='function'&&idEmp(c.employeeEid))||{};};
  const empName=function(c){return emp(c).name||c.name||(typeof idEmpName==='function'?idEmpName(c.employeeEid):'')||'';};
  const branchOf=function(c){const e=emp(c);return e.branch||e.location||e.workLocation||'';};
  const cardWord=function(c){return (typeof emsCardWord==='function'&&emsCardWord(c))||c.status||'';};
  const cardNo=function(c){return '•••• •••• •••• '+(c.last4||'••••');};
  const cards=function(){
    return ccCards.filter(function(c){return c.entity===ent()&&c.last4&&['Cancelled','Rejected'].indexOf(c.status)<0;})
      .sort(function(a,b){return empName(a).localeCompare(empName(b))||a.id-b.id;});
  };
  /* This month's plan for a card: wallet → the employee's limit, for the benefit wallets that are on. */
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
    if(runOf(m,c.id))return 'Credited';
    if(m!==today().slice(0,7))return 'Not Processed';
    if(why(c))return 'Inactive';
    return sum(plan(c))>0?'Ready':'No Limit';
  }
  /* What the row shows as its amount: the load made, or the plan. */
  const amountOf=function(c,m){const it=itemOf(m,c.id);return it?sum(it.wallets):sum(plan(c));};

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
    e.bpBase={month:prevOf(today().slice(0,7)),limits:limits};
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
  /* A card's benefit log, newest first: the loads made, and - for a card not yet credited this month - where it stands. */
  function logsOf(c){
    const e=entRec(),kept=(e&&e.bpLogs&&e.bpLogs[c.id])||[],m=today().slice(0,7),it=itemOf(m,c.id);
    const st=it?'Ready':status(c,m),pl=it?it.wallets:plan(c),t=m.split('-');
    const text=st==='Inactive'?why(c)+' - not loaded for '+mLabel(m)+'. '+money(sum(pl))+' is held back.'
      :st==='No Limit'?'No wallet limit is set - nothing to load for '+mLabel(m)+'.'
      :mLabel(m)+' is ready to load: '+Object.keys(pl).map(function(k){return wName(k)+' '+money(pl[k]);}).join(', ')+'.';
    const first={date:'01 '+MON[+t[1]-1].slice(0,3)+' '+t[0],time:'09:00:00 AM',user:'System',status:st,step:st==='Ready'?'Limits checked':st,action:text};
    const when=function(l){return typeof wfStepTime==='function'?(wfStepTime(l,0)||0):0;};
    return kept.concat([first]).map(function(l,i){return {l:l,i:i,t:when(l)};}).sort(function(x,y){return (y.t-x.t)||(x.i-y.i);}).map(function(x){return x.l;});
  }
  function addLog(c,status,step,text,after){
    const e=entRec();if(!e)return;
    e.bpLogs=e.bpLogs||{};
    /* after: seconds after now, so two steps of one action keep their order in Logs and Workflow */
    const d=new Date(Date.now()+(after||0)*1000),MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h=d.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;
    const st={date:p2(d.getDate())+' '+MS[d.getMonth()]+' '+d.getFullYear(),time:p2(h)+':'+p2(d.getMinutes())+':'+p2(d.getSeconds())+' '+ap};
    (e.bpLogs[c.id]=e.bpLogs[c.id]||[]).unshift({date:st.date,time:st.time,user:typeof idMeName==='function'?idMeName():'',userId:typeof idMe==='function'?idMe():'',status:status,step:step,action:text});
  }

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

  /* ── List ── */
  function shown(){
    const m=month(),s=q.trim().toLowerCase();
    return cards().filter(function(c){
      if(fBranch&&branchOf(c)!==fBranch)return false;
      if(fDept&&(emp(c).dept||'')!==fDept)return false;
      if(fStatus&&status(c,m)!==fStatus)return false;
      if(s&&(empName(c)+' '+(emp(c).empId||'')+' '+(c.last4||'')+' '+(typeof expKey==='function'?expKey(c):'')).toLowerCase().indexOf(s)<0)return false;
      return true;
    });
  }
  const pickable=function(c){return isNow()&&can()&&status(c,month())!=='Credited';};
  const picked=function(){return shown().filter(function(c){return sel[c.id]&&pickable(c);});};
  function barHTML(){
    const p=picked(),load=p.filter(function(c){return status(c,month())==='Ready';});
    const total=load.reduce(function(s,c){return s+sum(plan(c));},0);
    if(!isNow())return '<span class="wb-muted">Loads are made for the current month ('+E(mLabel(today().slice(0,7)))+'). '+E(mLabel(month()))+' is shown for reference.</span>';
    return '<span class="bpx-bar-txt">'+(p.length?'<b>'+p.length+'</b> selected · <b>'+load.length+'</b> to load · <b>'+money(total)+'</b>':'Select the cards to load for '+E(mLabel(month())))+'</span>'
      +'<button class="ep-save-btn" '+(p.length?'':'disabled style="opacity:.5;cursor:not-allowed" ')+'onclick="bpxSubmit()">Submit for Load</button>';
  }
  function pageHTML(){
    baseline();
    const m=month(),rows=shown(),all=cards(),okAll=rows.filter(pickable);
    if(open!=null&&!rows.some(function(c){return c.id===open;}))open=null;
    const allOn=okAll.length>0&&okAll.every(function(c){return sel[c.id];});
    const trs=rows.map(function(c,i){
      const st=status(c,m),e=emp(c),pk=pickable(c),lm=last(c,m),amt=amountOf(c,m),changed=lm&&st!=='Credited'&&isNow()&&sum(lm)!==sum(plan(c));
      return '<tr class="bpx-row'+(open===c.id?' lp-row-selected':'')+'" id="bpx-row-'+c.id+'" style="cursor:pointer" onclick="bpxOpen('+c.id+')">'
        +'<td class="bpx-ck" onclick="event.stopPropagation()">'+(pk?'<input type="checkbox" aria-label="Select '+E(empName(c))+'"'+(sel[c.id]?' checked':'')+' onchange="bpxPick('+c.id+',this.checked)">':'')+'</td>'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-plain">'+E(empName(c))+'</div><div class="lp-c-sub">'+E(e.empId||'')+'</div></td>'
        +'<td><div class="lp-c-main" style="font-variant-numeric:tabular-nums;letter-spacing:.02em">'+E(cardNo(c))+'</div><div class="lp-c-sub">'+E(typeof expKey==='function'?expKey(c):'')+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(e.dept||'—')+'</div><div class="lp-c-sub">'+E(branchOf(c))+'</div></td>'
        +'<td class="bpx-num"><div class="lp-c-plain">'+(lm?money(sum(lm)):'—')+'</div></td>'
        +'<td class="bpx-num"><div class="lp-c-plain"'+(changed?' style="font-weight:600"':'')+'>'+(amt?money(amt):'—')+'</div>'+(changed?'<div class="lp-c-sub">'+(sum(plan(c))>sum(lm)?'▲ ':'▼ ')+money(Math.abs(sum(plan(c))-sum(lm)))+'</div>':'')+'</td>'
        +'<td>'+badge(TONE[st]||'idle',st)+(st==='Inactive'?'<div class="lp-c-sub">'+E(why(c))+'</div>':'')+'</td>'
        +(typeof csuDots==='function'?csuDots('bpxOpen('+c.id+')',empName(c)):'<td></td>')+'</tr>';
    });
    const words=isNow()?['Ready','Credited','Inactive','No Limit']:['Credited','Not Processed'];
    const tiles=typeof caStat==='function'?words.filter(function(w){return w!=='No Limit'||all.some(function(c){return status(c,m)===w;});}).map(function(w){
      return caStat(w,all.filter(function(c){return status(c,m)===w;}).length,fStatus===w,'bpxStat(\''+w+'\')',TONE[w]);}).join(''):'';
    const years=[String(+today().slice(0,4)-1),today().slice(0,4)];
    const table='<table class="lp-table ax-table cc-table bpx-table"><thead><tr><th class="bpx-ck">'+(okAll.length?'<input type="checkbox" id="bpx-all" aria-label="Select all"'+(allOn?' checked':'')+' onchange="bpxAll(this.checked)">':'')+'</th>'
      +'<th>S. No</th><th>Employee</th><th>Card Number</th><th>Department</th><th class="bpx-num">Last Month</th><th class="bpx-num">'+E(MON[fm-1])+'</th><th>Status</th><th>Action</th></tr></thead><tbody>'
      +(trs.length?trs.join(''):(typeof ccEmpty==='function'?ccEmpty(9,all.length?'No card matches this filter.':'No card has been issued yet.'):''))+'</tbody></table>';
    const filters=(typeof lpSearchField==='function'?lpSearchField('bpx-q',q,'Search name, ID or card','bpxApply()'):'')
      +(typeof apCS==='function'?apCS('bpx-year',years,String(fy),'Year')+apCS('bpx-month',MON,MON[fm-1],'Month')
        +apCS('bpx-branch',typeof emsBranchNames==='function'?emsBranchNames(ent()):[],fBranch,'All Branches')
        +apCS('bpx-dept',typeof wbDepts==='function'?wbDepts():[],fDept,'All Departments')
        +apCS('bpx-status',words,fStatus,'All Statuses'):'')
      +(typeof clearFiltersBtn==='function'?clearFiltersBtn([q,fBranch,fDept,fStatus],'bpxReset()'):'')+'<button class="lp-pill-search" onclick="bpxApply()">Search</button>';
    return '<div class="lp-page">'
      +(typeof ccFilterBar==='function'?ccFilterBar(filters,tiles):'')
      +'<div class="bpx-bar" id="bpx-bar">'+barHTML()+'</div>'
      +(typeof ccSplit==='function'?ccSplit('bpx',table,open!=null,panelHTML):table)
      +'</div>';
  }

  /* ── A card's details ── */
  function panelHTML(){
    const c=typeof ccCard==='function'?ccCard(open):null;if(!c)return '';
    const tabs=[{id:'details',label:'Details'},{id:'wallets',label:'Wallets'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
    if(!tabs.some(function(t){return t.id===tab;}))tab='details';
    const m=month(),e=emp(c),st=status(c,m),pl=plan(c),lm=last(c,m),it=itemOf(m,c.id);
    const I=typeof AX_ICO!=='undefined'?AX_ICO:{},F=function(ico,l,v){return typeof axField==='function'?axField(ico||'',l,v):'';};
    const hero=typeof sbHero==='function'?sbHero({icon:(typeof sbIco!=='undefined'&&sbIco.card)||'',name:E(empName(c)),meta:[E(typeof expKey==='function'?expKey(c):''),E(cardNo(c)),E(mLabel(m))],status:badge(TONE[st]||'idle',st)}):'';
    let body='';
    if(tab==='wallets'){
      const types=benefitTypes(),bal=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid,c.id):{};
      const onCard=typeof ccCardWallets==='function'?ccCardWallets(c):types;
      const sp=spentLast(c,m),credited=!!it,pm=mLabel(prevOf(m)).split(' ')[0];
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Wallets · '+E(mLabel(m))+'</span><span class="wb-muted">'+Object.keys(it?it.wallets:pl).length+' of '+types.length+' loaded each month</span></div>'
        +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Wallet</th><th class="bpx-num">'+E(pm)+' Loaded</th><th class="bpx-num">'+E(pm)+' Spent</th>'
        +'<th class="bpx-num">Balance'+(credited?'':' Now')+'</th><th class="bpx-num">'+(credited?'Credited':'To Load')+'</th>'+(credited?'':'<th class="bpx-num">After Load</th>')+'<th>Status</th></tr></thead><tbody>'
        +types.map(function(t){
          const x=typeof ecbEntry==='function'?ecbEntry(c.employeeEid,t):null,isOn=onCard.indexOf(t)>=0&&!!(x&&x.on);
          const now=it?it.wallets[t]:pl[t],was=lm?lm[t]:null,diff=!it&&was!=null&&now!=null&&was!==now,b0=(bal[t]&&bal[t].available)||0;
          const willLoad=!credited&&st==='Ready'&&now!=null;
          return '<tr><td class="csag-td"><div class="lp-c-main">'+E(wName(t))+'</div></td>'
            +'<td class="csag-td bpx-num">'+(was!=null?money(was):'—')+'</td>'
            +'<td class="csag-td bpx-num">'+(was!=null&&sp[t]!=null?money(sp[t]):'—')+'</td>'
            +'<td class="csag-td bpx-num"'+(credited?' style="font-weight:600"':'')+'>'+money(b0)+'</td>'
            +'<td class="csag-td bpx-num"'+(diff?' style="font-weight:600"':'')+'>'+(now!=null?money(now):'—')+(diff?' <span class="lp-c-sub">'+(now>was?'▲':'▼')+'</span>':'')+'</td>'
            +(credited?'':'<td class="csag-td bpx-num" style="font-weight:600">'+(willLoad?money(b0+now):'—')+'</td>')
            +'<td class="csag-td">'+badge(isOn?'ok':'idle',isOn?'On':'Off')+'</td></tr>';
        }).join('')+'</tbody></table></div>'
        +'<div class="ea-hint" style="margin-top:10px">'+(credited?'The balance includes this month\'s load.':st==='Ready'?'After Load is the balance now plus this month\'s load.':'This card is not loaded this month: '+E(why(c)||'no wallet limit is set')+'.')+'</div>';
    }else if(tab==='logs'){
      body=typeof lpLogsView==='function'?lpLogsView(logsOf(c),logForm(c),{select:true,current:st,open:act&&act.id===c.id?act.label:undefined}):'';
    }else if(tab==='workflow'){
      const done=logsOf(c).map(function(l){return {title:l.step||l.status||'',user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
      const steps=st==='Ready'?[{title:'Submit for load',owner:(typeof idMeName==='function'?idMeName():'')||'Company Admin'},{title:'Wallets credited',owner:'System'}]
        :st==='Inactive'?[{title:'Make the '+(/^Employee/.test(why(c))?'employee':'card')+' Active',owner:'Company Admin'},{title:'Submit for load',owner:'Company Admin'}]
        :st==='No Limit'?[{title:'Set the wallet limits',owner:'Company Admin'},{title:'Submit for load',owner:'Company Admin'}]:[];
      body=typeof wfTimelineHTML==='function'?wfTimelineHTML(typeof wfPlan==='function'?wfPlan(done,steps):done):'';
    }else if(tab==='history'){
      const hs=runs().filter(function(r){return r.items.some(function(i){return i.cardId===c.id;});}).sort(function(a,b){return b.month.localeCompare(a.month);});
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Benefit Loads</span><span class="ax-count">'+hs.length+'</span></div>'
        +(hs.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Month</th><th>Run</th><th class="bpx-num">Amount</th><th>Loaded On</th><th>Loaded By</th></tr></thead><tbody>'
          +hs.map(function(r){const i=r.items.find(function(y){return y.cardId===c.id;});
            return '<tr><td class="csag-td"><div class="lp-c-main">'+E(mLabel(r.month))+'</div></td><td class="csag-td">'+E(r.key)+'</td><td class="csag-td bpx-num">'+money(sum(i.wallets))+'</td><td class="csag-td">'+E(r.at)+'</td><td class="csag-td">'+E(r.by)+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">No benefit load has been made on this card yet.</div>');
    }else{
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Details</span></div><div class="lp-sb-detail-grid">'
        +F(I.fUser,'Employee Name',E(empName(c)))+F(I.fHash,'Employee ID',E(e.empId||''))
        +F(I.fBuild,'Department',E(e.dept||''))+F(I.fBuild,'Branch',E(branchOf(c)))
        +F(I.fTag,'Employee Status',badge(e.status==='Active'?'ok':'idle',e.status||'—'))+F(I.fTag,'Card Status',badge(cardWord(c)==='Active'?'ok':'idle',cardWord(c)))
        +F(I.fHash,'Card Number',E(cardNo(c)))+F(I.fHash,'Card ID',E(typeof expKey==='function'?expKey(c):''))
        +F(I.fCash,'Last Month',lm?money(sum(lm)):'—')+F(I.fCash,it?'Loaded for '+E(mLabel(m)):E(mLabel(m)),money(it?sum(it.wallets):sum(pl)))
        +(it?F(I.fCal,'Loaded On',E(runOf(m,c.id).at))+F(I.fUser,'Loaded By',E(runOf(m,c.id).by)):'')
        +(st==='Inactive'?F(I.fTag,'Not Loaded Because',E(why(c))):'')
        +'</div>';
    }
    return (typeof axTabBar==='function'?axTabBar('bpx',tabs,tab,'bpxNav','bpxClose'):'')+'<div class="lp-isb-body">'+body+'</div>';
  }

  /* Logs: a Ready card can be submitted for load on its own, with a comment (product owner, 15 Nov 2026: "through logs
     i can submit for load for individual employee as well"). */
  let act=null;   // {id, label, note}
  const STEP='Submit for Load';
  function logForm(c){
    if(!can()||!isNow()||status(c,month())!=='Ready'||typeof lpLogStatusField!=='function')return '';
    const a=act&&act.id===c.id?act:null;
    return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>Ready</div><p class="lp-logs-form-sub"></p>'
      +lpLogStatusField('bpxl-act-'+c.id,'Ready',['Ready',STEP],'bpxLogPick')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="bpxl-note" placeholder="Enter comment">'+E(a?a.note||'':'')+'</textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="bpxLogCancel()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="bpxLogSubmit('+c.id+')">Submit</button></div></div>';
  }
  window.bpxLogPick=function(val,csid){
    const id=Number(String(csid||'').replace(/^bpxl-act-/,''));if(!id||!val)return;
    if(act&&act.id===id&&act.label===val)return;   // the Logs view picks it again as it draws
    if(!act&&val!==STEP)return;
    const ta=document.getElementById('bpxl-note');
    act=val===STEP?{id:id,label:val,note:ta?ta.value:''}:null;
    if(typeof isbTab==='function')isbTab('bpx',panelHTML);
  };
  window.bpxLogCancel=function(){if(act){act=null;if(typeof isbTab==='function')isbTab('bpx',panelHTML);}};
  window.bpxLogSubmit=function(id){
    const c=typeof ccCard==='function'?ccCard(id):null,a=act&&act.id===id?act:null;
    if(!c||!can())return;
    if(!a){if(typeof showToast==='function')showToast('Pick a step','error','Choose Submit for Load first.');return;}
    const ta=document.getElementById('bpxl-note'),note=String(ta?ta.value:a.note||'').trim();
    if(!note){if(ta)ta.classList.add('is-invalid');if(typeof showToast==='function')showToast('Comment is required','error','Write a comment for the load.');return;}
    if(status(c,today().slice(0,7))!=='Ready'){act=null;renderADTPage();return;}
    const pl=plan(c),run=load([{c:c,wallets:pl,total:sum(pl)}],[],note);
    act=null;delete sel[c.id];renderADTPage();
    if(run&&typeof showToast==='function')showToast('Wallets credited','success',run.key+' · '+empName(c)+' · '+money(run.total)+'.');
  };
  /* One run: the cards credited now (and the inactive ones left out), kept with the company and written to the logs. */
  function load(list,inactive,note){
    const e=entRec();if(!e||!list.length)return null;
    const m=today().slice(0,7);
    e.bpRuns=Array.isArray(e.bpRuns)?e.bpRuns:[];
    const n=1001+e.bpRuns.length,st=typeof stampNow==='function'?stampNow():{date:'',time:''};
    const run={id:n,key:'BPR-'+n,month:m,date:today(),at:st.date+' | '+st.time,by:typeof idMeName==='function'?idMeName():'',byId:typeof idMe==='function'?idMe():'',note:note||'',
      total:list.reduce(function(a,x){return a+x.total;},0),
      items:list.map(function(x){return {cardId:x.c.id,eid:x.c.employeeEid,wallets:Object.assign({},x.wallets),total:x.total};}),
      skipped:(inactive||[]).map(function(x){return {cardId:x.c.id,eid:x.c.employeeEid,reason:x.why,amount:x.amount};})};
    list.forEach(function(x){
      const parts=Object.keys(x.wallets).map(function(k){return wName(k)+' '+money(x.wallets[k]);}).join(', ');
      addLog(x.c,'Submitted','Submitted for load','Submitted for load · '+mLabel(m)+': '+money(x.total)+(note?'. Comment: '+note:'.'));
      addLog(x.c,'Credited','Wallets credited',run.key+' · '+mLabel(m)+' credited: '+parts+'.',1);
    });
    e.bpRuns.push(run);   // from here the ledger shows the credits
    list.forEach(function(x){
      if(typeof ccLog==='function')ccLog(x.c,x.c.status,'Benefit load '+run.key+' · '+mLabel(m)+': '+Object.keys(x.wallets).map(function(k){return wName(k)+' '+money(x.wallets[k]);}).join(', ')+'.');});
    if(typeof emsClearCache==='function')emsClearCache();
    if(typeof presSaveSoon==='function')presSaveSoon();
    return run;
  }

  /* ── The summary before loading ── */
  function summary(){
    const m=month(),p=picked();
    const load=[],inactive=[],nolimit=[],changes=[],byW={};
    p.forEach(function(c){
      const st=status(c,m),pl=plan(c),lm=last(c,m);
      if(st==='Inactive'){inactive.push({c:c,why:why(c),amount:sum(pl)});return;}
      if(st!=='Ready'){nolimit.push(c);return;}
      load.push({c:c,wallets:pl,total:sum(pl)});
      Object.keys(pl).forEach(function(k){const w=byW[k]||(byW[k]={n:0,amount:0});w.n++;w.amount+=pl[k];});
      if(lm){const keys=Object.keys(pl).concat(Object.keys(lm)).filter(function(k,i,a){return a.indexOf(k)===i;});
        keys.forEach(function(k){const a=Number(lm[k])||0,b=Number(pl[k])||0;if(a!==b)changes.push({c:c,wallet:k,was:a,now:b});});}
    });
    return {month:m,picked:p.length,load:load,inactive:inactive,nolimit:nolimit,changes:changes,byW:byW,total:load.reduce(function(s,x){return s+x.total;},0)};
  }
  const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const CAP='font-size:10.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#6b7280';
  function confirmHTML(){
    const s=confirm;if(!s)return '';
    const tile=function(l,v,sub){return '<div class="bpx-tile"><div style="'+CAP+'">'+l+'</div><div class="bpx-tile-v">'+v+'</div><div class="bpx-tile-s">'+sub+'</div></div>';};
    const sec=function(t,n){return '<div style="'+CAP+';margin:18px 0 8px">'+t+(n!=null?' · '+n:'')+'</div>';};
    const tbl=function(head,rows){return '<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div>';};
    const types=benefitTypes().filter(function(t){return s.byW[t];});
    const up=s.changes.filter(function(x){return x.now>x.was;}).length;
    const lost=s.inactive.reduce(function(a,x){return a+x.amount;},0);
    let h='<div class="ct-modal-overlay" style="z-index:2000" onclick="bpxConfirmClose()"><div class="ct-modal" style="width:min(920px,95vw)" role="dialog" aria-modal="true" aria-label="Benefit load summary" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><div><span class="ct-modal-title">Benefit load · '+E(mLabel(s.month))+'</span>'
      +'<div style="font-size:13px;color:#6b7280;margin-top:3px">Check the limits and statuses below. Confirm &amp; Load credits the wallets at once.</div></div>'
      +'<button class="ct-modal-close" onclick="bpxConfirmClose()" aria-label="Close">'+X+'</button></div>'
      +'<div class="bpx-sum">'
      +'<div class="bpx-tiles">'+tile('Selected',s.picked,'card'+(s.picked===1?'':'s'))+tile('To Load',s.load.length,money(s.total))
        +tile('Limit Changes',s.changes.length,s.changes.length?up+' higher · '+(s.changes.length-up)+' lower':'same as last month')
        +tile('Inactive',s.inactive.length,s.inactive.length?money(lost)+' not loaded':'none')+'</div>';
    if(types.length)h+=sec('Load by wallet')+tbl('<th>Wallet</th><th class="bpx-num">Cards</th><th class="bpx-num">Amount</th>',
      types.map(function(t){return '<tr><td class="csag-td"><div class="lp-c-main">'+E(wName(t))+'</div></td><td class="csag-td bpx-num">'+s.byW[t].n+'</td><td class="csag-td bpx-num">'+money(s.byW[t].amount)+'</td></tr>';}).join('')
      +'<tr class="bpx-total"><td class="csag-td"><b>Total</b></td><td class="csag-td bpx-num"><b>'+s.load.length+'</b></td><td class="csag-td bpx-num"><b>'+money(s.total)+'</b></td></tr>');
    if(s.changes.length)h+=sec('Limit changed since '+E(mLabel(prevOf(s.month))),s.changes.length)+tbl('<th>Employee</th><th>Wallet</th><th class="bpx-num">Last Month</th><th class="bpx-num">This Month</th><th class="bpx-num">Change</th>',
      s.changes.map(function(x){const d=x.now-x.was;
        return '<tr><td class="csag-td"><div class="lp-c-main">'+E(empName(x.c))+'</div></td><td class="csag-td">'+E(wName(x.wallet))+'</td><td class="csag-td bpx-num">'+(x.was?money(x.was):'—')+'</td><td class="csag-td bpx-num">'+(x.now?money(x.now):'—')+'</td>'
          +'<td class="csag-td bpx-num" style="font-weight:600;color:'+(d>0?'#15803d':'#b45309')+'">'+(d>0?'▲ ':'▼ ')+money(Math.abs(d))+'</td></tr>';}).join(''));
    if(s.inactive.length)h+=sec('Inactive · not loaded',s.inactive.length)+tbl('<th>Employee</th><th>Card</th><th>Reason</th><th class="bpx-num">Amount Not Loaded</th>',
      s.inactive.map(function(x){return '<tr><td class="csag-td"><div class="lp-c-main">'+E(empName(x.c))+'</div></td><td class="csag-td" style="white-space:nowrap">'+E(cardNo(x.c))+'</td><td class="csag-td">'+E(x.why)+'</td><td class="csag-td bpx-num">'+money(x.amount)+'</td></tr>';}).join('')
      +'<tr class="bpx-total"><td class="csag-td" colspan="3"><b>Total not loaded</b></td><td class="csag-td bpx-num"><b>'+money(lost)+'</b></td></tr>');
    if(s.nolimit.length)h+=sec('No limit set · not loaded',s.nolimit.length)+'<div class="wb-muted" style="font-size:13px">'+E(s.nolimit.map(empName).join(', '))+' - set the wallet limits in Wallet &amp; Benefits → Employees.</div>';
    h+='</div><div class="ct-modal-foot"><span class="wb-muted" style="font-size:12.5px">'+(s.load.length?'Each card is loaded once for '+E(mLabel(s.month))+'.':'Nothing to load in this selection.')+'</span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="bpxConfirmClose()">Cancel</button>'
      +'<button class="ep-save-btn" '+(s.load.length?'':'disabled style="opacity:.5;cursor:not-allowed" ')+'onclick="bpxConfirmGo()">Confirm &amp; Load</button></div></div></div></div>';
    return h;
  }
  const root=function(){let el=document.getElementById('bpx-confirm-root');if(!el){el=document.createElement('div');el.id='bpx-confirm-root';document.body.appendChild(el);}return el;};
  const paintConfirm=function(){root().innerHTML=confirm?confirmHTML():'';};

  /* ── Actions ── */
  const repaintBar=function(){
    const b=document.getElementById('bpx-bar');if(b)b.innerHTML=barHTML();
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
    open=null;renderADTPage();
  };
  window.bpxReset=function(){q='';fBranch='';fDept='';fStatus='';open=null;renderADTPage();};
  window.bpxStat=function(s){fStatus=fStatus===s?'':s;open=null;renderADTPage();};
  window.bpxOpen=function(id){
    if(open!==id)act=null;
    open=id;tab='details';
    const sb=document.getElementById('bpx-split-sb');if(!sb||typeof isbTab!=='function'){renderADTPage();return;}
    sb.classList.add('open');isbTab('bpx',panelHTML);
    document.querySelectorAll('.bpx-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='bpx-row-'+id);});
  };
  window.bpxClose=function(){open=null;act=null;const sb=document.getElementById('bpx-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.bpx-row').forEach(function(x){x.classList.remove('lp-row-selected');});};
  window.bpxNav=function(t){tab=t;if(typeof isbTab==='function')isbTab('bpx',panelHTML);else renderADTPage();};
  window.bpxSubmit=function(){
    if(!can()||!isNow())return;
    if(!picked().length){if(typeof showToast==='function')showToast('Select cards','error','Tick the cards to load, or Select all.');return;}
    confirm=summary();paintConfirm();
  };
  window.bpxConfirmClose=function(){confirm=null;paintConfirm();};
  window.bpxConfirmGo=function(){
    if(!confirm||!can())return;
    /* Worked out again at this moment: only cards that are still Ready and not credited for the month. */
    const s=summary(),m=s.month;confirm=null;paintConfirm();
    if(!s.load.length)return;
    const run=load(s.load,s.inactive,'');if(!run)return;
    s.load.forEach(function(x){delete sel[x.c.id];});
    s.inactive.concat(s.nolimit.map(function(c){return {c:c};})).forEach(function(x){delete sel[x.c.id];});
    renderADTPage();
    if(typeof showToast==='function')showToast('Wallets credited','success',run.key+' · '+mLabel(m)+' · '+s.load.length+' card'+(s.load.length===1?'':'s')+' · '+money(s.total)+(s.inactive.length?' · '+s.inactive.length+' inactive not loaded':'')+'.');
  };
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&confirm)window.bpxConfirmClose();});

  /* ── Look ── */
  (function(){
    if(document.getElementById('bpx-style'))return;
    const st=document.createElement('style');st.id='bpx-style';
    st.textContent='.bpx-ck{width:38px;text-align:center}.bpx-ck input{width:15px;height:15px;accent-color:#1a1a1a;cursor:pointer;margin:0;vertical-align:middle}'
      +'.bpx-num{text-align:right!important;white-space:nowrap;font-variant-numeric:tabular-nums}'
      +'.bpx-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:10px 14px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;font-size:13px;color:var(--navy,#0f172a);min-height:52px}'
      +'.bpx-bar-txt b{font-weight:600}'
      +'.bpx-sum{max-height:62vh;overflow:auto;padding:16px 0 4px}'
      +'.bpx-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'
      +'.bpx-tile{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:12px 14px;background:#f8fafc;min-width:0}'
      +'.bpx-tile-v{font-size:22px;line-height:28px;font-weight:700;color:var(--navy,#0f172a);margin-top:4px}'
      +'.bpx-tile-s{font-size:12px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.bpx-total td{background:#f8fafc}'
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
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!==PG){confirm=null;paintConfirm();open=null;}return n0.apply(this,arguments);};
  }
})();
