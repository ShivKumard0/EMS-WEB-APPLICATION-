/* ══ LEAVE BALANCE ════════════════════════════════════════════════════════
   Time & Attendance → Leave Balance. Two tabs, the way Timesheets has two:

     My Leave Balance    the signed-in employee's own entitlement, read as
                         two tables - the leave YEAR and the selected MONTH -
                         with summary figures above and their requests below.
     All Leave Balance   every employee, one row each, for HR and admins; a
                         row opens the same two tables in the side panel.

   ONE CALCULATION, lbRows(), feeds both tabs and the Leave Balance card on
   Leave Requests, so a number cannot read differently in two places.

   For each ACTIVE leave policy that lists the employee:
     Yearly Limit           the policy's yearly days
     Carry Forward (open)   days carried in from last year (lbCarryIn),
                            never more than the policy's carry-forward cap
     Carry Forward Used     approved days drawn from that carried balance -
                            carried days are spent first, before this year's
     Carry Forward Balance  carried days still unused
     Yearly Availed         approved days drawn from this year's limit
     Yearly Pending         days in requests still waiting (Pending, Follow Up)
     Yearly Available       limit - availed - pending: what can still be
                            asked for without going over
   The monthly table repeats this for the selected month against the policy's
   monthly limit; a policy with no monthly limit says so instead of a number.

   A day of leave is a WORKING day: a weekend or a holiday inside the range is
   not counted, and a Half Day request counts 0.5 a day - the same rule the
   timesheet and the Leave Requests card use. */

const LB_YEAR=2026;
/* "Today" for this module is the timesheet's: the fixture data is 2026, so
   the month the page opens on is the one the rest of the app is set in. */
const LB_TODAY=(typeof TS_TODAY!=='undefined')?TS_TODAY:'2026-06-24';
/* The signed-in person, for My Leave Balance (js/identity.js). Leave data
   names people as written on each record; nobody else's balance is shown as
   yours. */
function lbMe(){return typeof idMeName==='function'?idMeName():'';}
const LB_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
/* Days carried in from the 2025 leave year, per employee and leave type. Only
   policies that allow carry-forward appear; lbRows caps each at the policy. */
const lbCarryIn={
  'Shaun J':       {'Casual Leave':6},
  'Anika Shah':    {'Casual Leave':4,'Compensatory Leave':2},
  'Rahul Mehta':   {'Sick Leave':3,'Privilege Leave':7},
  'Nora Kim':      {'Earned Leave':9,'Compensatory Leave':1,'Half Day Leave':3},
  'Pallavi P':     {'Sick Leave':2},
  'Utkarsh Shukla':{'Casual Leave':2},
  'Sneha Kulkarni':{'Earned Leave':5},
  'Diksha Kumari': {'Casual Leave':3}
};

let lbSubTab='my';
let lbMonth=+LB_TODAY.split('-')[1]-1;      // the month the monthly table reads
let lbSearch='',lbType='',lbQuick='';
let lbSelected=null,lbTab='basic-details';
let lbViewEmp=null;      // whose full balance page is open from the listing

/* ── The calculation ──────────────────────────────────────────────────── */
function lbParse(dmy){const p=String(dmy).split('-');return new Date(+p[2],+p[1]-1,+p[0]);}
function lbIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
/* Working days of a request that fall between two dates (inclusive). */
function lbDays(l,lo,hi){
  const per=/half/i.test(l.leaveHours)?0.5:1;
  let from=lbParse(l.leaveFrom),to=lbParse(l.leaveTo),n=0;
  if(from<lo)from=new Date(lo);
  if(to>hi)to=new Date(hi);
  for(const d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
    const iso=lbIso(d);
    const closed=typeof arNonWorkingDay==='function'?arNonWorkingDay(iso):(d.getDay()===0||d.getDay()===6);
    if(!closed)n+=per;
  }
  return n;
}
const LB_PENDING=['Pending','Follow Up'];
function lbPolicies(name){
  return leavePoliciesData.filter(function(p){return p.status==='Active'&&(p.employees||[]).indexOf(name)>=0;});
}
function lbRows(name,month){
  const m=month==null?lbMonth:month;
  const yLo=new Date(LB_YEAR,0,1),yHi=new Date(LB_YEAR,11,31);
  const mLo=new Date(LB_YEAR,m,1),mHi=new Date(LB_YEAR,m+1,0);
  const carried=lbCarryIn[name]||{};
  return lbPolicies(name).map(function(p){
    const mine=allLeavesData.filter(function(l){return l.name===name&&l.leaveType===p.type;});
    const sum=function(test,lo,hi){return mine.filter(test).reduce(function(s,l){return s+lbDays(l,lo,hi);},0);};
    const isAvailed=function(l){return l.status==='Approved';};
    const isPending=function(l){return LB_PENDING.indexOf(l.status)>=0;};
    const availed=sum(isAvailed,yLo,yHi),pending=sum(isPending,yLo,yHi);
    const cfOpen=Math.min(carried[p.type]||0,p.carryForward||0);
    const cfUsed=Math.min(availed,cfOpen);
    const yAvailed=availed-cfUsed;
    const mAvailed=sum(isAvailed,mLo,mHi),mPending=sum(isPending,mLo,mHi);
    return {type:p.type,policy:p,
      yearly:p.yearly,yAvailed:yAvailed,yPending:pending,yAvailable:Math.max(0,p.yearly-yAvailed-pending),
      cfCap:p.carryForward||0,cfOpen:cfOpen,cfUsed:cfUsed,cfBalance:cfOpen-cfUsed,
      monthly:p.monthly,mAvailed:mAvailed,mPending:mPending,
      mAvailable:p.monthly==null?null:Math.max(0,p.monthly-mAvailed-mPending)};
  });
}
function lbTotals(rows){
  const t={entitled:0,availed:0,pending:0,available:0,cfBalance:0};
  rows.forEach(function(r){
    t.entitled+=r.yearly+r.cfOpen;
    t.availed+=r.yAvailed+r.cfUsed;
    t.pending+=r.yPending;
    t.available+=r.yAvailable+r.cfBalance;
    t.cfBalance+=r.cfBalance;
  });
  return t;
}
function lbEmployees(){
  const names=allLeavesData.map(function(l){return l.name;});
  leavePoliciesData.forEach(function(p){if(p.status==='Active')names.push.apply(names,p.employees||[]);});
  return names.filter(function(v,i,a){return a.indexOf(v)===i;}).sort().map(function(n){
    const req=allLeavesData.find(function(l){return l.name===n;});
    return {name:n,empId:req?req.empId:'—',initials:n.split(/\s+/).map(function(w){return w.charAt(0);}).join('').slice(0,2).toUpperCase()};
  });
}
function lbFmt(n){return n==null?'—':String(+(+n).toFixed(1));}
/* Green while there is room, amber when two days or fewer are left, red at
   none - the three tones every balance on the page is read in. A limit that
   is itself small (2 sick days a month) is not "low" while it is untouched. */
function lbTone(avail,limit){
  if(avail==null)return '';
  if(avail<=0)return limit?' is-out':'';
  return avail<=2&&avail<limit?' is-low':' is-ok';
}

/* ── The two tables ───────────────────────────────────────────────────── */
function lbYearTableHTML(rows){
  if(!rows.length)return lbNoPolicyHTML();
  /* The Yearly/Monthly filter above already says which period this is, so
     the headings do not repeat it. "Available" is the policy's allowance;
     what is left after availed and pending is the figure card above. */
  const t={y:0,ya:0,yp:0,cb:0};
  rows.forEach(function(r){t.y+=r.yearly;t.ya+=r.yAvailed;t.yp+=r.yPending;t.cb+=r.cfBalance;});
  return '<div class="lb-table-wrap"><table class="lb-table"><thead><tr>'
    +'<th>Leave Type</th><th class="n">Available</th><th class="n">Availed</th><th class="n">Pending</th>'
    +'<th class="n">Carry Forward Balance</th>'
    +'</tr></thead><tbody>'+rows.map(function(r){
      return '<tr><td class="lb-type">'+sbEsc(r.type)+'</td>'
        +'<td class="n">'+lbFmt(r.yearly)+'</td>'
        +'<td class="n">'+lbFmt(r.yAvailed)+'</td>'
        +'<td class="n">'+(r.yPending?'<span class="lb-pend">'+lbFmt(r.yPending)+'</span>':'0')+'</td>'
        +'<td class="n">'+(r.cfCap?lbFmt(r.cfBalance)+'<span class="lb-of"> of '+lbFmt(r.cfOpen)+'</span>':'<span class="lb-na" title="This policy does not carry days forward">—</span>')+'</td>'
        +'</tr>';
    }).join('')+'</tbody>'
    +'<tfoot><tr><td>Total</td><td class="n">'+lbFmt(t.y)+'</td><td class="n">'+lbFmt(t.ya)+'</td><td class="n">'+lbFmt(t.yp)+'</td>'
      +'<td class="n">'+lbFmt(t.cb)+'</td></tr></tfoot>'
    +'</table></div>';
}
function lbMonthTableHTML(rows){
  if(!rows.length)return lbNoPolicyHTML();
  return '<div class="lb-table-wrap"><table class="lb-table"><thead><tr>'
    +'<th>Leave Type</th><th class="n">Available</th><th class="n">Availed</th><th class="n">Pending</th>'
    +'</tr></thead><tbody>'+rows.map(function(r){
      const none=r.monthly==null;
      return '<tr><td class="lb-type">'+sbEsc(r.type)+'</td>'
        +'<td class="n">'+(none?'<span class="lb-na" title="No monthly cap - only the yearly limit applies">No limit</span>':lbFmt(r.monthly))+'</td>'
        +'<td class="n">'+lbFmt(r.mAvailed)+'</td>'
        +'<td class="n">'+(r.mPending?'<span class="lb-pend">'+lbFmt(r.mPending)+'</span>':'0')+'</td>'
        +'</tr>';
    }).join('')+'</tbody></table></div>';
}
function lbNoPolicyHTML(){
  return '<div class="lb-empty">No active leave policy is assigned to this employee yet. Assign one in <b>Leave Policies</b> and the balance appears here.</div>';
}
function lbRequestsHTML(name){
  const mine=allLeavesData.filter(function(l){return l.name===name;})
    .sort(function(a,b){return lbParse(b.leaveFrom)-lbParse(a.leaveFrom);});
  if(!mine.length)return '<div class="lb-empty">No leave requests yet.</div>';
  const cls={Approved:'approved',Pending:'pending','Follow Up':'follow-up',Unapproved:'inactive',Rejected:'inactive',Cancelled:'cancelled'};
  return '<div class="lb-table-wrap"><table class="lb-table"><thead><tr>'
    +'<th>Leave ID</th><th>Leave Type</th><th>From</th><th>To</th><th class="n">Days</th><th>Status</th>'
    +'</tr></thead><tbody>'+mine.map(function(l){
      return '<tr><td class="lb-type">'+sbEsc(l.leaveId)+'</td><td>'+sbEsc(l.leaveType)+'</td>'
        +'<td>'+cdLabel(lbIso(lbParse(l.leaveFrom)))+'</td><td>'+cdLabel(lbIso(lbParse(l.leaveTo)))+'</td>'
        +'<td class="n">'+lbFmt(lbDays(l,new Date(1900,0,1),new Date(2999,0,1)))+(/half/i.test(l.leaveHours)?'<span class="lb-of"> half</span>':'')+'</td>'
        +'<td><span class="lp-status-badge '+(cls[l.status]||'pending')+'">'+sbEsc(l.status)+'</span></td></tr>';
    }).join('')+'</tbody></table></div>';
}
function lbMonthPicker(id){
  return apCS(id,LB_MONTHS.map(function(m){return m+' '+LB_YEAR;}),LB_MONTHS[lbMonth]+' '+LB_YEAR,'Month','lbPickMonth');
}
function lbPickMonth(val){
  const i=LB_MONTHS.indexOf(String(val).split(' ')[0]);
  if(i<0)return;
  lbMonth=i;
  if(lbSubTab==='all'&&lbSelected)isbTab('lb',renderLbSidebar);else renderADTPage();
}

/* ── My Leave Balance ─────────────────────────────────────────────────── */
/* name: whose balance to show - the signed-in employee by default, or the
   one opened from All Leave Balance. */
function buildMyLeaveBalanceHTML(name){
  const who=name||lbMe();
  const me=lbEmployees().find(function(e){return e.name===who;})||{name:who,empId:'—',initials:''};
  const rows=lbRows(me.name),t=lbTotals(rows);
  const ico={
    cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 13h2"/><path d="M2 10h20"/><path d="M6 6V4h12v2"/></svg>'
  };
  const stat=function(label,icon,val,sub,tone){
    return '<div class="ts-stat-card"><div class="ts-stat-top"><span class="ts-stat-label">'+label+'</span><div class="ts-stat-ico">'+icon+'</div></div>'
      +'<div class="ts-stat-val'+(tone?' lb-stat-'+tone:'')+'">'+lbFmt(val)+'<span class="lb-stat-unit">days</span></div>'
      +'<div class="ts-stat-sub">'+sub+'</div></div>';
  };
  return '<div class="lb-page">'
    +'<div class="ts-stats">'
      +stat('Total Leaves',ico.wallet,t.entitled,'Yearly limits + '+lbFmt(rows.reduce(function(s,r){return s+r.cfOpen;},0))+' carried forward')
      +stat('Availed',ico.check,t.availed,'Approved leave this year')
      +stat('Pending',ico.clock,t.pending,t.pending?'Waiting for approval':'Nothing waiting',t.pending?'wait':'')
      +stat('Available',ico.cal,t.available,'Including '+lbFmt(t.cfBalance)+' carry-forward','ok')
    +'</div>'
    +'<section class="lb-card">'
      +'<header class="lb-card-hd"><div><div class="lb-card-title">Yearly Leave Balance</div>'
        +'<div class="lb-card-sub">1 Jan – 31 Dec '+LB_YEAR+' · carried-forward days are used before this year&rsquo;s</div></div></header>'
      +lbYearTableHTML(rows)
    +'</section>'
    +'<section class="lb-card">'
      +'<header class="lb-card-hd"><div><div class="lb-card-title">Monthly Leave Balance</div>'
        +'<div class="lb-card-sub">Against each policy&rsquo;s monthly limit, for '+LB_MONTHS[lbMonth]+' '+LB_YEAR+'</div></div>'
        +'<div class="lb-card-tools">'+lbMonthPicker('lb-my-month')+'</div></header>'
      +lbMonthTableHTML(rows)
    +'</section>'
    +'<section class="lb-card">'
      +'<header class="lb-card-hd"><div><div class="lb-card-title">'+(name?'Leave Requests':'My Leave Requests')+'</div>'
        +'<div class="lb-card-sub">Newest first. Pending and follow-up days are held against the balance until decided.</div></div></header>'
      +lbRequestsHTML(me.name)
    +'</section>'
    +'<p class="lb-foot">Leave is counted in working days: weekends and holidays inside a request are not deducted, and a half day counts as 0.5.</p>'
  +'</div>';
}

/* ── All Leave Balance ────────────────────────────────────────────────── */
function lbListRows(){
  return lbEmployees().map(function(e){
    let rows=lbRows(e.name);
    if(lbType)rows=rows.filter(function(r){return r.type===lbType;});
    const t=lbTotals(rows);
    const low=rows.some(function(r){return r.yAvailable+r.cfBalance<=2;});
    return Object.assign({},e,{rows:rows,t:t,low:low,types:rows.length});
  }).filter(function(e){return !lbType||e.types;});
}
function buildAllLeaveBalanceHTML(){
  let list=lbListRows();
  const lowN=list.filter(function(e){return e.low&&e.types;}).length;
  const pendN=list.filter(function(e){return e.t.pending>0;}).length;
  const noneN=list.filter(function(e){return !e.types;}).length;
  if(lbQuick==='low')list=list.filter(function(e){return e.low&&e.types;});
  else if(lbQuick==='pending')list=list.filter(function(e){return e.t.pending>0;});
  const types=leavePoliciesData.filter(function(p){return p.status==='Active';}).map(function(p){return p.type;});
  const tile=function(key,n,label,color){
    return '<div class="listing-stat'+(lbQuick===key?' stat-selected':'')+'" onclick="lbToggleQuick(\''+key+'\')">'
      +'<div class="listing-stat-count" style="color:'+color+'">'+n+'</div><div class="listing-stat-label">'+label+'</div></div>';
  };
  /* The All Timesheet pair: one icon opens the employee's full balance page,
     the other the details panel beside the list. */
  const balIco='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 15l2.5 2.5L16 13"/></svg>';
  const listIco='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
  const pgn=listPage('leave-balance-all',[lbSearch,lbType,lbQuick].join('|'),lpSearchRows(list,lbSearch).map(function(e,i){
    const sel=lbSelected===e.name;
    const num=function(v){return e.types?lbFmt(v):'<span class="lb-na">—</span>';};
    return '<tr class="lb-row'+(sel?' lp-row-selected':'')+'" data-lb="'+sbEsc(e.name)+'" style="cursor:pointer" onclick="openLbSidebar(this.dataset.lb)">'
      +'<td style="color:#6b7280;font-size:13px">'+(i+1)+'</td>'
      +'<td style="font-weight:600;color:var(--navy)">'+sbEsc(e.empId)+'</td>'
      +'<td class="lb-emp-name">'+sbEsc(e.name)+'</td>'
      +'<td>'+num(e.t.entitled)+'</td>'
      +'<td>'+num(e.t.availed)+'</td>'
      +'<td>'+(e.t.pending?'<span class="lb-pend">'+lbFmt(e.t.pending)+'</span>':num(0))+'</td>'
      +'<td>'+(e.types?'<span class="lb-avail'+(e.low?' is-low':' is-ok')+'">'+lbFmt(e.t.available)+'</span>':num(0))+'</td>'
      +'<td>'+num(e.t.cfBalance)+'</td>'
      +'<td onclick="event.stopPropagation()"><div class="at-actions">'
        +'<button class="at-act-btn" title="View Leave Balance" onclick="lbOpenView(this.closest(\'tr\').dataset.lb)">'+balIco+'</button>'
        +'<button class="at-act-btn" title="View Details" onclick="openLbSidebar(this.closest(\'tr\').dataset.lb)">'+listIco+'</button>'
      +'</div></td>'
      +'</tr>';
  }),'<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--gray)">No employees match this filter.</td></tr>');
  if(lbSelected&&!list.some(function(e){return e.name===lbSelected;}))lbSelected=null;
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
      +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div>'
        +'<div class="lp-filter-bar-row">'
          +lpSearchField('lb-f-q',lbSearch,'Search name, ID','applyLbFilters()')
          +apCS('lb-f-type',types,lbType,'Leave Type')
          +clearFiltersBtn([lbSearch,lbType,lbQuick],'resetLbFilters()')
          +'<button class="lp-pill-search" onclick="applyLbFilters()">Search</button>'
        +'</div></div>'
      +'<div class="listing-stats">'
        +tile('',lbEmployees().length,'Employees','var(--navy)')
        +tile('low',lowN,'Low Balance','var(--st-bad-fg)')
        +tile('pending',pendN,'Pending','var(--st-wait-fg)')
      +'</div>'
    +'</div>'
    +(noneN&&!lbType?'<div class="lb-note">'+noneN+' employee'+(noneN===1?' has':'s have')+' no active leave policy and show no balance.</div>':'')
    +'<div class="lp-split-wrap'+(lbSelected?' has-sb':'')+'" id="lb-split-wrap" style="margin-top:14px">'
      +'<div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
        +'<table class="lp-table"><thead><tr>'
          +'<th>S.No</th><th>Employee ID</th><th>Name</th><th>Total</th><th>Availed</th><th>Pending</th><th>Available</th><th>CF Balance</th><th>Action</th>'
        +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
        +pgn.pager
      +'</div></div>'
      +'<div class="lp-split-sb'+(lbSelected?' open':'')+'" id="lb-split-sb"><div class="lp-isb" id="lb-isb-inner">'+(lbSelected?sbRender(renderLbSidebar,'lb'):'')+'</div></div>'
    +'</div></div>';
}
function lbToggleQuick(k){lbQuick=lbQuick===k?'':k;lbSelected=null;renderADTPage();}
function applyLbFilters(){
  lbSearch=lpSearchValue('lb-f-q');
  const t=getCSValue('lb-f-type');lbType=t&&t!=='Leave Type'?t:'';
  lbSelected=null;renderADTPage();
}
function resetLbFilters(){lbSearch='';lbType='';lbQuick='';lbSelected=null;renderADTPage();}

/* ── The row's side panel: the same two tables, and the requests ── */
function openLbSidebar(name){
  if(lbSelected===name){closeLbSidebar();return;}
  lbTab=sbKeepTab(lbSelected,lbTab,'basic-details');lbSelected=name;
  const sb=document.getElementById('lb-split-sb');if(sb)sb.classList.add('open');
  const wrap=document.getElementById('lb-split-wrap');if(wrap)wrap.classList.add('has-sb');
  isbTab('lb',renderLbSidebar);
  document.querySelectorAll('.lb-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.dataset.lb===name);});
}
function closeLbSidebar(){
  lbSelected=null;
  const sb=document.getElementById('lb-split-sb');if(sb)sb.classList.remove('open');
  const wrap=document.getElementById('lb-split-wrap');if(wrap)wrap.classList.remove('has-sb');
  document.querySelectorAll('.lb-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navLbTab(t){lbTab=t;isbTab('lb',renderLbSidebar);}
function renderLbSidebar(){
  const e=lbEmployees().find(function(x){return x.name===lbSelected;});if(!e)return '';
  const rows=lbRows(e.name),t=lbTotals(rows);
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'yearly',label:'Yearly'},{id:'monthly',label:'Monthly'},{id:'requests',label:'Leave Requests'}];
  const tabBar='<div class="lp-isb-tabbar"><div class="lp-isb-tabs" id="lb-isb-tabs">'+tabs.map(function(x){
      return '<button class="lp-isb-tab'+(lbTab===x.id?' active':'')+'" onclick="navLbTab(\''+x.id+'\')">'+x.label+'</button>';
    }).join('')+'</div>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeLbSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>';
  const head='<div class="lb-sb-head">'
    +'<div class="lb-sb-txt"><div class="lb-sb-name">'+sbEsc(e.name)+'</div><div class="lb-sb-meta">'+sbEsc(e.empId)+' · Leave year '+LB_YEAR+'</div></div>'
    +(rows.length?'<div class="lb-sb-fig"><span class="lb-avail'+(rows.some(function(r){return r.yAvailable+r.cfBalance<=2;})?' is-low':' is-ok')+'">'+lbFmt(t.available)+'</span><span>of '+lbFmt(t.entitled)+' days available</span></div>':'')
    +'</div>';
  let body;
  if(lbTab==='monthly')body='<div class="lb-sb-tools"><span class="lb-card-sub">'+LB_MONTHS[lbMonth]+' '+LB_YEAR+'</span>'+lbMonthPicker('lb-sb-month')+'</div>'+lbMonthTableHTML(rows);
  else if(lbTab==='requests')body=lbRequestsHTML(e.name);
  else if(lbTab==='yearly')body=lbYearTableHTML(rows);
  else body=lbBasicDetailsHTML(e,rows,t);
  return tabBar+'<div class="lp-isb-body">'+head+body+'</div>';
}

/* Basic Details: who this is and what they are entitled to, in the field
   cards every detail panel opens on. The leave types live here rather than in
   a listing column. */
function lbBasicDetailsHTML(e,rows,t){
  const ico=function(d){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'+d+'</svg>';};
  const I={
    user:ico('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    id:ico('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>'),
    cal:ico('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    tag:ico('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
    sum:ico('<path d="M18 7V4H6l6 8-6 8h12v-3"/>'),
    check:ico('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
    clock:ico('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    fwd:ico('<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>')
  };
  const fc=function(icon,label,val,full){
    return '<div class="lp-sb-field-card"'+(full?' style="grid-column:1/-1"':'')+'><div class="lp-sb-field-icon">'+icon+'</div>'
      +'<div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  };
  const last=allLeavesData.filter(function(l){return l.name===e.name;})
    .sort(function(a,b){return lbParse(b.leaveFrom)-lbParse(a.leaveFrom);})[0];
  const n=function(v){return rows.length?lbFmt(v)+' days':'—';};
  const low=rows.some(function(r){return r.yAvailable+r.cfBalance<=2;});
  return '<div class="lp-sb-detail-grid">'
    +fc(I.user,'Employee Name',sbEsc(e.name))+fc(I.id,'Employee ID',sbEsc(e.empId))
    +fc(I.cal,'Leave Year','1 Jan – 31 Dec '+LB_YEAR)+fc(I.tag,'Leave Types',rows.length?rows.length+' assigned':'No active policy')
    +fc(I.sum,'Total',n(t.entitled))+fc(I.check,'Availed',n(t.availed))
    +fc(I.clock,'Pending',n(t.pending))
    +fc(I.check,'Available',rows.length?'<span class="lb-avail'+(low?' is-low':' is-ok')+'">'+lbFmt(t.available)+' days</span>':'—')
    +fc(I.fwd,'Carry Forward Balance',n(t.cfBalance))
    +fc(I.cal,'Last Leave Request',last?sbEsc(last.leaveType)+' · '+cdLabel(lbIso(lbParse(last.leaveFrom)))+' · '+sbEsc(last.status):'None')
    +fc(I.tag,'Assigned Leave Types',rows.length?rows.map(function(r){return sbEsc(r.type);}).join(', '):'None',true)
  +'</div>';
}

/* ── The module page ──────────────────────────────────────────────────── */
function setLbSubTab(t){if(lbSubTab===t)return;lbSubTab=t;lbSelected=null;lbViewEmp=null;renderADTPage();}
/* The listing's "View Leave Balance" icon: the employee's full page, the same
   layout My Leave Balance uses, with the way back above it. */
function lbOpenView(name){lbViewEmp=name;lbSelected=null;renderADTPage();const c=document.getElementById('adt-content');if(c)c.scrollTop=0;}
function lbCloseView(){lbViewEmp=null;lbSubTab='all';renderADTPage();}
function lbViewHTML(){
  const e=lbEmployees().find(function(x){return x.name===lbViewEmp;})||{name:lbViewEmp,empId:'—',initials:''};
  return '<div class="ts-back-bar"><button class="ep-back" onclick="lbCloseView()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to All Leave Balance</button></div>'
    +'<div class="lb-view-head">'
      +'<div><div class="lb-sb-name">'+sbEsc(e.name)+'</div><div class="lb-sb-meta">'+sbEsc(e.empId)+' · Leave year '+LB_YEAR+'</div></div></div>'
    +buildMyLeaveBalanceHTML(e.name);
}
function buildLeaveBalanceHTML(){
  /* An employee sees their own balance only; the roster is HR's and admins'. */
  const own=!emsCan('h2r.leave.view.all');
  if(own)lbSubTab='my';
  const tabs=[{id:'my',label:'My Leave Balance',icon:modTabIco.user}]
    .concat(own?[]:[{id:'all',label:'All Leave Balance',icon:modTabIco.list}]);
  if(lbViewEmp&&!own)return '<div class="mod-page">'+lbViewHTML()+'</div>';
  const body=lbSubTab==='all'?buildAllLeaveBalanceHTML():buildMyLeaveBalanceHTML();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,lbSubTab,'setLbSubTab',true)+body+'</div>';
}
