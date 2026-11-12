/* ══ ALL TIMESHEET — SALARY & PAYSLIP ══════════════════════════════════════
   The third tab of the All Timesheet row panel. The legacy screen put this
   behind a "Get Salary" button on the timesheet page as two side-by-side
   boxes (Employee calculation / Salary Details) and a Rollover / Get Salary /
   Approve row. The same three moves live here, in the panel every listing
   already uses, so paying someone is done from the row that says whether they
   filed — not from a second screen that has to be found.

   ONE MONTH AT A TIME. A salary record is keyed employee + the month the page
   is filtered to (atPeriod), the same month the panel header names, so the
   figures can never describe a period the header is not showing.

   THE LIFECYCLE, and who owes the next move:
     Not calculated  nothing worked out yet           → Get Salary / Rollover
     Calculated      figures ready, HR reviewing      → Recalculate / Submit
                     (Submit opens the approval popup directly)
     Approved       locked, payslip published        → View Payslip / Reopen
   A month that already has a payslip on file reads as Approved — the Payslips
   tab and this tab cannot disagree about whether someone was paid.

   DERIVED, NOT TYPED. HR types the three attendance inputs (days present,
   working days, overtime days) and may override an individual payhead amount.
   Everything else — the attendance-adjusted basic, every earned allowance,
   overtime pay, PF and Professional Tax (read off the Payheads slabs), the
   totals and the net — is computed, and repainted as they type. */

/* Pay structure per employee: the monthly ACTUAL of each component (what a
   full month pays) plus the identity lines the payslip prints. Leave figures
   are what the leave module would hand over for the month. */
const AT_PAY={
  '11803':{doj:'17-01-2022',dept:'IT',designation:'Change Management Expert',location:'Hyderabad',
    pan:'JHOPK5868J',bank:'XXXXXX4521',filledHours:0,
    leaves:{yearly:24,takenYear:0,wfh:0,paid:0,unpaid:0,thisMonth:0},
    basic:10275,
    earnings:[{key:'hra',name:'HRA',amt:4110},{key:'lta',name:'Leave Travel Allowance',amt:1028},
      {key:'internet',name:'Internet Allowance',amt:2000},{key:'general',name:'General Allowance',amt:3137}],
    deductions:[{key:'int',name:'Int Reimbursement',amt:0},{key:'pt',name:'Professional Tax',rule:'Professional Tax'}]},
  '11755':{doj:'03-04-2023',dept:'Operations',designation:'Payroll Associate',location:'Mumbai',
    pan:'BXQPS4410L',bank:'XXXXXX0917',filledHours:168,
    leaves:{yearly:24,takenYear:6,wfh:2,paid:1,unpaid:1,thisMonth:2},
    basic:18000,
    earnings:[{key:'hra',name:'HRA',amt:7200},{key:'lta',name:'Leave Travel Allowance',amt:1500},
      {key:'internet',name:'Internet Allowance',amt:1000},{key:'general',name:'General Allowance',amt:4300}],
    deductions:[{key:'pf',name:'Provident Fund',rule:'Provident Fund'},{key:'pt',name:'Professional Tax',rule:'Professional Tax'}]},
  '11754':{doj:'21-11-2021',dept:'Administration',designation:'Entity Administrator',location:'Punjab',
    pan:'CKTPS7731M',bank:'XXXXXX3388',filledHours:144,
    leaves:{yearly:24,takenYear:9,wfh:4,paid:2,unpaid:0,thisMonth:2},
    basic:10000,
    earnings:[{key:'hra',name:'HRA',amt:4000},{key:'internet',name:'Internet Allowance',amt:2000}],
    deductions:[{key:'pf',name:'Provident Fund',rule:'Provident Fund'},{key:'pt',name:'Professional Tax',rule:'Professional Tax'}]}
};
/* The Employee dashboard's signed-in employee (empSelf: direct employee 6).
   Her Payroll card lists months paid at INR 1,25,000 net; this structure is
   what makes the payslip for those months net exactly that. */
AT_PAY['EMP006']={doj:'15-09-2026',dept:'Design',designation:'UX Designer',location:'Hyderabad',
  pan:'AKMPI4471Q',bank:'XXXXXX6620',filledHours:0,
  leaves:{yearly:24,takenYear:0,wfh:0,paid:0,unpaid:0,thisMonth:0},
  basic:60000,
  earnings:[{key:'hra',name:'HRA',amt:24000},{key:'general',name:'General Allowance',amt:43000}],
  deductions:[{key:'pf',name:'Provident Fund',rule:'Provident Fund'},{key:'pt',name:'Professional Tax',rule:'Professional Tax'}]};
const AT_HOURS_PER_DAY=9;
const AT_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const AT_YEAR=2026;
let atSalState={};      // empId|Mon → record
let atSalModal=null;    // {kind:'approve'|'reopen'|'slip', empId, month}

function atSalEmp(empId){
  const t=atEmp(empId);if(t)return t;
  const d=(typeof directEmpData!=='undefined')?directEmpData.find(function(e){return e.empId===empId&&(typeof idEntity!=='function'||e.entityId===idEntity());}):null;
  return d?{empId:d.empId,name:d.name}:null;
}
function atSalMonth(){return atPeriod().label;}
function atSalDays(mon){return new Date(AT_YEAR,AT_MONTHS.indexOf(mon)+1,0).getDate();}
function atSalSlipName(mon){return 'Payslip_'+mon+'_'+AT_YEAR+'.pdf';}
function atSalHasSlip(empId,mon){
  return (atPayslipsData[empId]||[]).some(function(p){return p.month===mon+'-'+AT_YEAR;});
}
// The record for one employee-month, made on first read. Default attendance is
// the month less unpaid leave — what the timesheet says, before HR touches it.
function atSalRec(empId,mon){
  mon=mon||atSalMonth();
  const k=empId+'|'+mon;
  if(!atSalState[k]){
    const pay=AT_PAY[empId];const wd=atSalDays(mon);
    const paid=atSalHasSlip(empId,mon);
    atSalState[k]={empId:empId,month:mon,workingDays:wd,
      attendance:Math.max(0,wd-(pay?pay.leaves.unpaid:0)),otDays:0,type:'Salary',amt:{},
      status:paid?'approved':'draft',approvedAt:paid?'On file':'',approvedBy:''};
  }
  return atSalState[k];
}
function atSalStatusLabel(rec){
  return {approved:'Approved',calculated:'Calculated'}[rec.status]||'Not Calculated';
}
// Calculated is amber: worked out, but still owes its submission.
function atSalTone(rec){return {approved:'ok',calculated:'wait'}[rec.status]||'idle';}
function atSalLocked(rec){return rec.status==='approved';}

/* A payhead's slab, applied. Reads the same rule the Payheads page shows, so
   changing PT or PF there changes it here — "Update Payheads" is not a dead link. */
function atSalSlab(name,base){
  const p=payheadsData.find(function(x){return x.name===name&&x.status==='Active';});
  if(!p)return 0;
  const s=p.slabs.find(function(sl){
    const from=+sl.from||0,to=sl.to===''?Infinity:+sl.to;
    return base>=from&&base<to;
  })||p.slabs[p.slabs.length-1];
  const v=+s.value||0;
  return Math.round(s.method==='Percentage'?base*v/100:v);
}

/* Every number on the tab and on the payslip comes out of here — one function,
   so the panel, the confirmation and the PDF cannot print different nets. */
function atSalCalc(empId,rec){
  const pay=AT_PAY[empId];
  const wd=Math.max(1,+rec.workingDays||0);
  const att=Math.min(Math.max(0,+rec.attendance||0),wd);
  const ratio=att/wd;
  const ov=function(k,def){return rec.amt[k]!=null&&rec.amt[k]!==''?Math.max(0,+rec.amt[k]||0):def;};
  const basicEarned=Math.round(pay.basic*ratio);
  const earnings=[{key:'basic',name:'Basic',actual:pay.basic,earned:basicEarned,fixed:true,note:'as per attendance'}];
  pay.earnings.forEach(function(e){
    earnings.push({key:e.key,name:e.name,actual:e.amt,earned:ov(e.key,Math.round(e.amt*ratio))});
  });
  const grossActual=earnings.reduce(function(s,e){return s+e.actual;},0);
  const otDays=Math.max(0,+rec.otDays||0);
  earnings.push({key:'ot',name:'Overtime',actual:0,earned:ov('ot',Math.round(grossActual/wd*otDays))});
  let encash=0;
  if(rec.type==='Settlement'){
    const left=Math.max(0,pay.leaves.yearly-pay.leaves.takenYear);
    encash=Math.round(pay.basic/wd*left);
    earnings.push({key:'enc',name:'Leave Encashment',actual:0,earned:ov('enc',encash),note:left+' leaves'});
  }
  const totalEarn=earnings.reduce(function(s,e){return s+e.earned;},0);
  const deductions=pay.deductions.map(function(d){
    let def=d.amt||0;
    if(d.rule==='Provident Fund')def=atSalSlab(d.rule,basicEarned);
    if(d.rule==='Professional Tax')def=atSalSlab(d.rule,totalEarn);
    return {key:d.key,name:d.name,amount:ov(d.key,def),rule:d.rule};
  });
  const totalDed=deductions.reduce(function(s,d){return s+d.amount;},0);
  return {wd:wd,att:att,otDays:otDays,otHours:otDays*AT_HOURS_PER_DAY,basic:pay.basic,basicEarned:basicEarned,
    grossActual:grossActual,earnings:earnings,deductions:deductions,
    totalEarn:totalEarn,totalDed:totalDed,net:totalEarn-totalDed};
}
// What would stop an approval, said in words. Empty means approvable.
function atSalProblems(rec){
  const p=[],dim=atSalDays(rec.month);
  const wd=+rec.workingDays,att=+rec.attendance,ot=+rec.otDays;
  if(!(wd>=1&&wd<=dim))p.push('Working days must be between 1 and '+dim+'.');
  if(!(att>=0))p.push('Attendance cannot be negative.');
  else if(wd>=1&&att>wd)p.push('Attendance cannot exceed working days ('+wd+').');
  if(!(ot>=0))p.push('Overtime cannot be negative.');
  return p;
}

function atMoney(v){return (+v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function atMoney0(v){return Math.round(+v||0).toLocaleString('en-IN');}
// Indian numbering for the "In words" line on the payslip.
function atSalWords(n){
  n=Math.round(+n||0);if(n===0)return 'Zero Rupees Only';
  const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen',
    'Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=function(x){return x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:'');};
  const three=function(x){return (x>=100?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');};
  const parts=[];
  [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']].forEach(function(u){
    if(n>=u[0]){parts.push(two(Math.floor(n/u[0]))+' '+u[1]);n%=u[0];}
  });
  if(n)parts.push(three(n));
  return parts.join(' ')+' Rupees Only';
}

/* ── Moves ─────────────────────────────────────────────────────────────── */
function atSalRepaint(){isbTab('at',renderAtSidebar);}
// Typed inputs repaint the derived numbers in place rather than re-rendering
// the tab, so the field being typed in keeps its focus and caret.
function atSalInput(field,el){
  const rec=atSalRec(atSelectedId);if(atSalLocked(rec))return;
  rec[field]=el.value;
  atSalPaint();
}
function atSalAmt(key,el){
  const rec=atSalRec(atSelectedId);if(atSalLocked(rec))return;
  rec.amt[key]=el.value;
  el.classList.add('is-edited');
  atSalPaint();
}
function atSalType(t){
  const rec=atSalRec(atSelectedId);if(atSalLocked(rec)||rec.type===t)return;
  rec.type=t;delete rec.amt.enc;
  atSalRepaint();
}
// Refresh: back to what the timesheet says, dropping HR's attendance edits.
function atSalReset(){
  const rec=atSalRec(atSelectedId);if(atSalLocked(rec))return;
  const pay=AT_PAY[rec.empId];
  rec.workingDays=atSalDays(rec.month);
  rec.attendance=Math.max(0,rec.workingDays-pay.leaves.unpaid);rec.otDays=0;
  atSalRepaint();
  showToast('Attendance reset','success','Back to the timesheet figures for '+rec.month+' '+AT_YEAR);
}
/* The repaint after Get Salary / Rollover puts the panel back at its top,
   which hid the very figures the click produced below the attendance card.
   So the panel scrolls to Salary Details — the earnings and deductions HR now
   reviews and edits — and the first editable amount takes focus. */
function atSalRevealDetails(){
  requestAnimationFrame(function(){
    const card=document.getElementById('atsal-details');if(!card)return;
    const body=card.closest('.lp-isb-body');
    if(body){
      const top=card.getBoundingClientRect().top-body.getBoundingClientRect().top+body.scrollTop-12;
      body.scrollTo({top:top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }else card.scrollIntoView({block:'start'});
    const first=card.querySelector('input.atsal-amt:not(:disabled)');
    if(first)first.focus({preventScroll:true});
  });
}
// Get Salary: work the month out from attendance. Re-running it drops any
// amount HR overrode — that is the point of pressing it again.
function atSalGet(){
  const rec=atSalRec(atSelectedId);if(atSalLocked(rec))return;
  const probs=atSalProblems(rec);
  if(probs.length){showToast('Cannot calculate salary','error',probs[0]);return;}
  rec.amt={};rec.status='calculated';
  const c=atSalCalc(rec.empId,rec);
  renderADTPage();atSalRevealDetails();
  showToast('Salary calculated','success','Net INR '+atMoney(c.net)+' for '+rec.month+' '+AT_YEAR);
}
// The month before the one in view, or null in January.
function atSalPrevMonth(mon){const i=AT_MONTHS.indexOf(mon);return i>0?AT_MONTHS[i-1]:null;}
function atSalCanRollover(empId,mon){
  const prev=atSalPrevMonth(mon);if(!prev)return false;
  const r=atSalState[empId+'|'+prev];
  return r?r.status==='approved':atSalHasSlip(empId,prev);
}
// Rollover: carry last month's approved figures (overtime, overrides, type)
// into this month, with attendance scaled to this month's length.
function atSalRollover(){
  const rec=atSalRec(atSelectedId);if(atSalLocked(rec))return;
  const prev=atSalPrevMonth(rec.month);
  if(!atSalCanRollover(rec.empId,rec.month))return;
  const p=atSalRec(rec.empId,prev);
  const wd=atSalDays(rec.month);
  rec.workingDays=wd;
  rec.attendance=Math.min(wd,Math.round(wd*(+p.attendance/(+p.workingDays||1))));
  rec.otDays=p.otDays;rec.type=p.type;rec.amt=JSON.parse(JSON.stringify(p.amt||{}));
  rec.status='calculated';
  renderADTPage();atSalRevealDetails();
  showToast('Rolled over from '+prev,'success','Last month’s approved figures applied to '+rec.month+' '+AT_YEAR);
}
/* Submit goes straight to the approval popup — no second "Approve" button
   waiting on the tab afterwards. The popup is the approval: Approve & Generate
   publishes the payslip, Cancel leaves the month Calculated and editable. */
function atSalSubmit(){
  const rec=atSalRec(atSelectedId);
  if(rec.status!=='calculated')return;
  const probs=atSalProblems(rec);
  if(probs.length){showToast('Cannot submit salary','error',probs[0]);return;}
  atSalModal={kind:'approve',empId:rec.empId,month:rec.month};atSalModalPaint();
}
function atSalAskReopen(){
  const rec=atSalRec(atSelectedId);if(rec.status!=='approved')return;
  atSalModal={kind:'reopen',empId:rec.empId,month:rec.month};atSalModalPaint();
}
function atSalApprove(){
  const m=atSalModal;if(!m)return;
  const rec=atSalRec(m.empId,m.month);
  rec.status='approved';
  rec.approvedAt=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  rec.approvedBy=CURRENT_USER;rec.approvedById=CURRENT_USER_ID;   // the signed-in person, not a role
  // Published to the Payslips tab, newest first, replacing any older copy.
  const list=(atPayslipsData[m.empId]=(atPayslipsData[m.empId]||[]).filter(function(p){return p.month!==m.month+'-'+AT_YEAR;}));
  list.unshift({name:atSalSlipName(m.month),size:(170+Math.round(atSalCalc(m.empId,rec).net/1000))+' KB',month:m.month+'-'+AT_YEAR,generated:true});
  list.sort(function(a,b){return AT_MONTHS.indexOf(b.month.slice(0,3))-AT_MONTHS.indexOf(a.month.slice(0,3));});
  atSalModal={kind:'slip',empId:m.empId,month:m.month,fresh:true};
  renderADTPage();atSalModalPaint();
  showToast('Payslip generated','success',atSalSlipName(m.month)+' published to Payslips');
}
function atSalReopen(){
  const m=atSalModal;if(!m)return;
  const rec=atSalRec(m.empId,m.month);
  rec.status='calculated';rec.approvedAt='';rec.approvedBy='';
  atPayslipsData[m.empId]=(atPayslipsData[m.empId]||[]).filter(function(p){return p.month!==m.month+'-'+AT_YEAR;});
  atSalModal=null;atSalModalPaint();renderADTPage();
  showToast('Salary reopened','success','Payslip for '+m.month+' '+AT_YEAR+' withdrawn');
}
function atSalViewSlip(empId,mon,year){
  atSalModal={kind:'slip',empId:empId||atSelectedId,month:mon||atSalMonth(),year:year||AT_YEAR};atSalModalPaint();
}
function atSalCloseModal(){atSalModal=null;atSalModalPaint();}

/* ── Live repaint of derived figures ───────────────────────────────────── */
function atSalPaint(){
  const tab=document.querySelector('.atsal');if(!tab)return;
  const rec=atSalRec(atSelectedId);
  const probs=atSalProblems(rec);
  const err=tab.querySelector('.atsal-errors');
  if(err){err.innerHTML=probs.map(function(p){return '<div>'+p+'</div>';}).join('');err.hidden=!probs.length;}
  const set=function(id,v){const el=document.getElementById(id);if(el)el.textContent=v;};
  const c=atSalCalc(rec.empId,rec);
  set('atsal-othrs',c.otHours);
  const sub=document.getElementById('atsal-submit');
  if(sub){sub.disabled=rec.status!=='calculated'||!!probs.length;}
  if(rec.status!=='calculated')return;
  set('atsal-perAtt',atMoney0(c.basicEarned));
  c.earnings.concat(c.deductions).forEach(function(r){
    const el=document.getElementById('atsal-v-'+r.key);
    const v=r.earned!=null?r.earned:r.amount;
    if(!el||el===document.activeElement)return;
    if(el.tagName==='INPUT')el.value=v;else el.textContent=atMoney0(v);
  });
  set('atsal-t-earn',atMoney(c.totalEarn));
  set('atsal-t-ded',atMoney(c.totalDed));
  set('atsal-t-net',atMoney(c.net));
  set('atsal-words',atSalWords(c.net));
}

/* ── The Salary tab ────────────────────────────────────────────────────── */
function atSalTabHTML(emp){
  const pay=AT_PAY[emp.empId];
  if(!pay)return '<div class="atsal-empty">No pay structure is set up for '+emp.name+'. Add one under Payroll before running salary.</div>';
  const rec=atSalRec(emp.empId);
  const locked=atSalLocked(rec);
  const c=atSalCalc(emp.empId,rec);
  const probs=atSalProblems(rec);
  const dis=locked?' disabled':'';
  const L=pay.leaves;

  const fact=function(label,val){
    return '<div class="atsal-fact"><span>'+label+'</span><b>'+val+'</b></div>';
  };
  const num=function(id,label,field,val,max){
    return '<div class="ep-form-group"><label class="ep-form-label" for="'+id+'">'+label+'</label>'
      +'<input class="ep-form-input" id="'+id+'" type="number" min="0"'+(max?' max="'+max+'"':'')+' step="0.5" value="'+val+'"'
      +' oninput="atSalInput(\''+field+'\',this)"'+dis+'></div>';
  };
  const refreshIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

  // The strip that says where this month stands, and who owes the next move.
  const next=rec.status==='approved'
    ?'Approved'+(rec.approvedBy?' by '+rec.approvedBy:'')+(rec.approvedAt&&rec.approvedAt!=='On file'?' on '+rec.approvedAt:'')+'. Payslip published.'
    :rec.status==='calculated'?'Figures ready. Review them, then Submit to approve and publish the payslip.'
    :'Not worked out yet. Check attendance, then Get Salary.';
  const strip='<div class="atsal-strip">'
    +'<div><div class="atsal-strip-title">Salary for '+rec.month+' '+AT_YEAR+'</div>'
    +'<div class="atsal-strip-sub">'+next+'</div></div>'
    +'<span class="lp-status-badge tone-'+atSalTone(rec)+'">'+atSalStatusLabel(rec)+'</span></div>';

  const att='<section class="atsal-card">'
    +'<div class="atsal-card-hd"><span class="lp-sb-section-title">Employee Calculation</span>'
    +(locked?'':'<button class="at-sb-icon-btn" title="Reset to timesheet figures" onclick="atSalReset()">'+refreshIco+'</button>')
    +'</div>'
    +'<div class="atsal-facts">'
    +fact('Employee’s Filled Hours',pay.filledHours)
    +fact('HR Updated Hours',(c.wd*AT_HOURS_PER_DAY).toFixed(1))
    +fact('Total Yearly Leaves',L.yearly)
    +fact('Leaves Taken (Yearly)',L.takenYear)
    +fact('Remaining Leaves (Yearly)',Math.max(0,L.yearly-L.takenYear))
    +fact('Leaves Taken (This Month)',L.thisMonth)
    +fact('Work From Home (Monthly)',L.wfh)
    +fact('Paid Leaves (Monthly)',L.paid)
    +fact('Unpaid Leaves (Monthly)',L.unpaid)
    +'</div>'
    +'<div class="atsal-inputs">'
    +num('atsal-att','Attendance (Days)','attendance',rec.attendance,rec.workingDays)
    +num('atsal-wd','Working Days','workingDays',rec.workingDays,atSalDays(rec.month))
    +num('atsal-ot','Overtime (Days)','otDays',rec.otDays)
    +'<div class="ep-form-group"><span class="ep-form-label">Overtime (Hours)</span>'
      +'<div class="atsal-derived" id="atsal-othrs">'+c.otHours+'</div></div>'
    +'</div>'
    +'<div class="atsal-errors"'+(probs.length?'':' hidden')+'>'+probs.map(function(p){return '<div>'+p+'</div>';}).join('')+'</div>'
    +'<div class="atsal-type"><span class="ep-form-label">Salary Type</span>'
      +'<div class="segmented is-compact">'
      +['Salary','Settlement'].map(function(t){
        return '<button type="button" class="seg-btn'+(rec.type===t?' active':'')+'" onclick="atSalType(\''+t+'\')"'+dis+'>'+t+'</button>';
      }).join('')+'</div>'
      +(rec.type==='Settlement'?'<span class="atsal-hint">Adds encashment of '+Math.max(0,L.yearly-L.takenYear)+' remaining leaves.</span>':'')
    +'</div>'
    +'</section>';

  // Salary details only exist once worked out; before that the card says how.
  let sal;
  if(rec.status==='draft'){
    sal='<section class="atsal-card"><div class="atsal-card-hd"><span class="lp-sb-section-title">Salary Details</span>'
      +'<button class="lp-sb-section-link" onclick="navigatePage(\'payheads\')">Update Payheads</button></div>'
      +'<div class="atsal-empty">Salary for '+rec.month+' has not been calculated. <b>Get Salary</b> works it out from the attendance above'
      +(atSalCanRollover(emp.empId,rec.month)?', or <b>Rollover</b> carries '+atSalPrevMonth(rec.month)+'’s approved figures forward':'')+'.</div>'
      +'</section>';
  }else{
    // id: the card atSalRevealDetails() scrolls to after Get Salary / Rollover.
    const amtRow=function(r,sign){
      const v=r.earned!=null?r.earned:r.amount;
      const edited=rec.amt[r.key]!=null&&rec.amt[r.key]!=='';
      const cell=r.fixed
        ?'<span class="atsal-amt-ro" id="atsal-v-'+r.key+'">'+atMoney0(v)+'</span>'
        :'<input class="atsal-amt'+(edited?' is-edited':'')+'" id="atsal-v-'+r.key+'" type="number" min="0" value="'+v+'"'
          +' oninput="atSalAmt(\''+r.key+'\',this)"'+dis+' aria-label="'+attrSafe(r.name)+'">';
      return '<tr><td>'+r.name+(r.note?' <span class="atsal-note">('+r.note+')</span>':'')
        +(r.rule?' <span class="atsal-note">slab</span>':'')+'</td>'
        +'<td class="atsal-sign">'+sign+'</td><td class="atsal-num">'+cell+'</td></tr>';
    };
    const earnRows=c.earnings.map(function(e){return amtRow(e,'+');}).join('');
    const dedRows=c.deductions.map(function(d){return amtRow(d,'−');}).join('');
    sal='<section class="atsal-card" id="atsal-details"><div class="atsal-card-hd"><span class="lp-sb-section-title">Salary Details</span>'
      +'<button class="lp-sb-section-link" onclick="navigatePage(\'payheads\')">Update Payheads</button></div>'
      +'<div class="atsal-facts atsal-facts--3">'
      +fact('Basic Salary','INR '+atMoney0(c.basic))
      +'<div class="atsal-fact"><span>Salary as per Attendance</span><b>INR <span id="atsal-perAtt">'+atMoney0(c.basicEarned)+'</span></b></div>'
      +fact('Monthly Gross','INR '+atMoney0(c.grossActual))
      +'</div>'
      +'<div class="atsal-books">'
      +'<table class="atsal-book"><thead><tr><th>Incentive</th><th></th><th class="atsal-num">Amount</th></tr></thead>'
        +'<tbody>'+earnRows+'</tbody>'
        +'<tfoot><tr><td>Total Earnings</td><td></td><td class="atsal-num" id="atsal-t-earn">'+atMoney(c.totalEarn)+'</td></tr></tfoot></table>'
      +'<table class="atsal-book"><thead><tr><th>Deductions</th><th></th><th class="atsal-num">Amount</th></tr></thead>'
        +'<tbody>'+dedRows+'</tbody>'
        +'<tfoot><tr><td>Total Deductions</td><td></td><td class="atsal-num" id="atsal-t-ded">'+atMoney(c.totalDed)+'</td></tr></tfoot></table>'
      +'</div>'
      +'<div class="atsal-net"><div><span>Net Salary</span><small id="atsal-words">'+atSalWords(c.net)+'</small></div>'
        +'<b>INR <span id="atsal-t-net">'+atMoney(c.net)+'</span></b></div>'
      +'</section>';
  }

  // Actions. Destructive / secondary on the left, the affirmative one last.
  let foot;
  if(locked){
    foot='<button class="btn-outline" onclick="atSalAskReopen()">Reopen</button>'
      +'<div class="atsal-foot-r"><button class="btn-primary" onclick="atSalViewSlip()">View Payslip</button></div>';
  }else{
    const canRoll=atSalCanRollover(emp.empId,rec.month);
    foot='<button class="btn-outline" onclick="atSalRollover()"'+(canRoll?'':' disabled')
        +' title="'+(canRoll?'Carry '+atSalPrevMonth(rec.month)+'’s approved figures into '+rec.month:'No approved salary last month to roll over')+'">Rollover</button>'
      +'<div class="atsal-foot-r">'
      +'<button class="'+(rec.status==='draft'?'btn-primary':'btn-outline')+'" onclick="atSalGet()">'+(rec.status==='draft'?'Get Salary':'Recalculate')+'</button>'
      +(rec.status==='draft'?'':'<button class="btn-primary" id="atsal-submit" onclick="atSalSubmit()"'+(probs.length?' disabled title="Fix the attendance figures above first"':'')+'>Submit</button>')
      +'</div>';
  }
  return '<div class="atsal">'+strip+att+sal+'<div class="atsal-foot">'+foot+'</div></div>';
}

/* ── The payslip document ──────────────────────────────────────────────── */
const AT_COMPANY={
  name:'Open Dhi Private Limited',
  formerly:'(Formerly known as NEWFORCE GLOBAL SERVICES INDIA PRIVATE LIMITED)',
  address:'REG ADD: WEWORK VASWANI CHAMBERS, 2ND FLOOR, 264-265, DR ANNIE BESANT RD, MUNICIPAL COLONY, WORLI SHIVAJI NAGAR, WORLI, MUMBAI, MAHARASHTRA 400030'
};
function atPayslipHTML(empId,mon,year){
  year=year||AT_YEAR;
  const emp=atSalEmp(empId),pay=AT_PAY[empId];
  if(!emp||!pay)return '<div class="atsal-empty">No pay structure on file for this employee.</div>';
  const rec=atSalRec(empId,mon);
  const c=atSalCalc(empId,rec);
  const kv=function(k,v){return '<div class="psl-kv"><span>'+k+'</span><b>'+v+'</b></div>';};
  const earn=c.earnings.filter(function(e){return e.earned||e.actual;});
  const ded=c.deductions;
  const rows=Math.max(earn.length,ded.length);
  let body='';
  for(let i=0;i<rows;i++){
    const e=earn[i],d=ded[i];
    body+='<tr>'
      +'<td>'+(e?e.name.toUpperCase():'')+'</td><td class="psl-num">'+(e?atMoney(e.actual):'')+'</td><td class="psl-num psl-sep">'+(e?atMoney(e.earned):'')+'</td>'
      +'<td>'+(d?d.name.toUpperCase():'')+'</td><td class="psl-num">'+(d?atMoney(d.amount):'')+'</td></tr>';
  }
  return '<div class="psl">'
    +'<div class="psl-head"><img src="assets/Opendhilogo.png" alt="OpenDhi" class="psl-logo">'
      +'<div class="psl-co"><b>'+AT_COMPANY.name+'</b><span>'+AT_COMPANY.formerly+'</span></div></div>'
    +'<div class="psl-addr">'+AT_COMPANY.address+'</div>'
    +'<div class="psl-title">Payslip for the month of <b>'+mon.toUpperCase()+' '+year+'</b></div>'
    +'<div class="psl-info">'
      +'<div>'+kv('Staff ID',emp.empId)+kv('Employee’s Name',emp.name)+kv('Department',pay.dept)+kv('Designation',pay.designation)+kv('Location',pay.location)+'</div>'
      +'<div>'+kv('Date of Joining',pay.doj)+kv('Month Gross Salary',atMoney0(c.grossActual))+kv('PAN Card',pay.pan)+kv('Bank Account No.',pay.bank)+'</div>'
      +'<div>'+kv('Actual Days',c.att)+kv('Working Days (Month)',c.wd)+kv('Salary Type',rec.type)+'</div>'
    +'</div>'
    +'<table class="psl-table"><thead><tr><th>Earning</th><th class="psl-num">Actual</th><th class="psl-num psl-sep">Earned</th><th>Deduction</th><th class="psl-num">Amount</th></tr></thead>'
      +'<tbody>'+body+'</tbody>'
      +'<tfoot><tr><td>Gross Earning</td><td class="psl-num">'+atMoney(c.grossActual)+'</td><td class="psl-num psl-sep">'+atMoney(c.totalEarn)+'</td>'
      +'<td>Gross Deductions</td><td class="psl-num">'+atMoney(c.totalDed)+'</td></tr></tfoot></table>'
    +'<div class="psl-net"><div>Net Salary : <b>INR '+atMoney(c.net)+'</b></div><div>In Words : '+atSalWords(c.net)+'</div></div>'
    +'<div class="psl-foot">This is a system-generated payslip and does not require a signature.</div>'
    +'</div>';
}

/* ── Modals: approve, reopen, payslip preview ──────────────────────────── */
function atSalModalPaint(){
  let host=document.getElementById('atsal-modal');
  if(!atSalModal){if(host)host.remove();return;}
  if(!host){host=document.createElement('div');host.id='atsal-modal';document.body.appendChild(host);}
  const m=atSalModal,emp=atSalEmp(m.empId),yr=m.year||AT_YEAR;
  const x='<button class="ct-modal-close" onclick="atSalCloseModal()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  let inner;
  if(m.kind==='slip'){
    inner='<div class="ct-modal ct-modal--form atsal-slip-modal" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><span class="ct-modal-title">Payslip — '+emp.name+' · '+m.month+' '+yr
        +' <span class="lp-status-badge tone-ok">'+(m.fresh?'Generated':'Approved')+'</span></span>'+x+'</div>'
      +'<div class="atsal-slip-scroll" id="atsal-slip-doc">'+atPayslipHTML(m.empId,m.month,yr)+'</div>'
      +'<div class="ct-modal-foot"><span class="atsal-hint">Download opens the print dialog — choose “Save as PDF”.</span>'
        +'<div class="ct-modal-btns"><button class="btn-outline" onclick="atSalCloseModal()">Close</button>'
        +'<button class="btn-primary" onclick="atSalDownload()">Download PDF</button></div></div>'
      +'</div>';
  }else{
    const rec=atSalRec(m.empId,m.month),c=atSalCalc(m.empId,rec);
    const approve=m.kind==='approve';
    inner='<div class="ct-modal" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(approve?'Approve salary':'Reopen salary')+'</span>'+x+'</div>'
      +'<p class="ct-modal-sub">'+(approve
        ?'This locks '+emp.name+'’s '+m.month+' '+AT_YEAR+' figures and publishes the payslip to their Payslips tab.'
        :'This withdraws the '+m.month+' '+AT_YEAR+' payslip for '+emp.name+' and makes the figures editable again.')+'</p>'
      +'<div class="ct-modal-grid">'
        +'<div class="ct-modal-field"><div class="ct-modal-flabel">Total Earnings</div><div class="ct-modal-fval">INR '+atMoney(c.totalEarn)+'</div></div>'
        +'<div class="ct-modal-field"><div class="ct-modal-flabel">Total Deductions</div><div class="ct-modal-fval">INR '+atMoney(c.totalDed)+'</div></div>'
        +'<div class="ct-modal-field"><div class="ct-modal-flabel">Attendance</div><div class="ct-modal-fval">'+c.att+' of '+c.wd+' days</div></div>'
        +'<div class="ct-modal-field"><div class="ct-modal-flabel">Net Salary</div><div class="ct-modal-fval">INR '+atMoney(c.net)+'</div></div>'
      +'</div>'
      +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="btn-outline" onclick="atSalCloseModal()">Cancel</button>'
        +'<button class="btn-primary" onclick="'+(approve?'atSalApprove()':'atSalReopen()')+'">'+(approve?'Approve &amp; Generate':'Reopen')+'</button></div></div>'
      +'</div>';
  }
  host.innerHTML='<div class="ct-modal-overlay" onclick="atSalCloseModal()">'+inner+'</div>';
}
/* Download = print just the payslip. The page prints with everything but
   #psl-print-root hidden (css/at-salary.css @media print), and the document
   title becomes the file name Chrome suggests for "Save as PDF". */
function atSalDownload(){
  const m=atSalModal;if(!m||m.kind!=='slip')return;
  const emp=atSalEmp(m.empId),yr=m.year||AT_YEAR;
  let root=document.getElementById('psl-print-root');
  if(!root){root=document.createElement('div');root.id='psl-print-root';document.body.appendChild(root);}
  root.innerHTML=atPayslipHTML(m.empId,m.month,yr);
  const title=document.title;
  document.title='Payslip_'+m.month+'_'+yr+'_'+emp.name.replace(/\s+/g,'_');
  document.documentElement.classList.add('psl-printing');
  const done=function(){
    document.documentElement.classList.remove('psl-printing');
    document.title=title;root.innerHTML='';
    window.removeEventListener('afterprint',done);
  };
  window.addEventListener('afterprint',done);
  // Wait for the logo so it is not missing from the PDF.
  const img=root.querySelector('img');
  if(img&&!img.complete){img.onload=img.onerror=function(){window.print();};}
  else window.print();
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&atSalModal)atSalCloseModal();});
