/* ══ EXPENSES ═══════════════════════════════════════════════════════════════
   Reached two ways: Time & Pay → Expense Management → Expenses on the rail
   (next to Capping Limit, js/capping-limit.js), and the profile dropdown
   (index.html) - a claim is also something a person files and follows,
   like Apply Application.

   Built from the parts every other listing uses - lpSearchField + apCS
   filters and listing-stats tiles above an .lp-table in an .lp-split-wrap, the
   .lp-isb-* detail panel behind the row action, sbHero, the shared Logs view
   (lpLogsView) and the Workflow timeline (wfTimelineHTML), and a
   .ct-modal--form popup for + Add. Only the expense-specific parts are new.

   THE OLD SCREEN'S FILTERS, FOLDED. Employee Id, Expense Id and Employee Email
   were three separate inputs. They are all things a person TYPES to find one
   claim, so they are one search box (lpSearchMatch reads every field); the
   things you PICK from a list stay dropdowns.

   AN EXPENSE IS ITS LINE ITEMS. The claim's amount, its start and end dates
   were typed on the claim AND on each line, and could disagree. Here the
   claim's Net Amount and date range are read off its line items - state is
   derived, never typed.

   STATUS MOVES IN LOGS, NOT IN EDIT. Edit changes what the claim says; a move
   (Approve, Reject, Follow-Up, Mark Reimbursed) carries a comment and is only
   offered from Logs, and only the moves legal from where the claim is now. */

/* ── Reference data ────────────────────────────────────────────────────── */
/* Claim status is the approval outcome only; payment has its own status
   (js/expense-approvals.js). The old Reimbursed status is migrated to
   Approved + a legacy Paid reimbursement. */
/* Reimbursed: kept on claims settled before payment tracking (legacy); new claims show payment separately. */
const EXP_STATUSES=['Draft','Awaiting Approval','Follow-Up','Approved','Partially Approved','Rejected','Withdrawn','Reimbursed'];
/* The moves themselves come from the approval engine (caMoves / caLineMoves
   in js/expense-approvals-ui.js); these are their labels. */
const EXP_MOVE_LABELS={'Awaiting Approval':'Submit for Approval','Approved':'Approve','Rejected':'Reject',
  'Follow-Up':'Follow-Up','Partially Approved':'Partially Approve','Withdrawn':'Withdraw'};
/* The category picks the sub categories a line item may use. Capping Limit
   (js/capping-limit.js) sets its limits on these same categories. */
const EXP_CATEGORIES=['Travel Reimbursement','Meal Allowance','Accommodation','Fuel Reimbursement','Team Outing','Office Events','Office Stationery',
  /* Claim-based flexi benefits (js/wallet-benefits.js) are claimed under these two. */
  'Telephone & Internet','Books & Learning'];
const EXP_SUBCATS={
  'Travel Reimbursement':['One Way','Two Way','Intercity Travel - Air','Intercity Travel - Train','Intercity Travel - Bus'],
  'Meal Allowance':['Breakfast','Lunch','Dinner'],
  'Accommodation':['Accommodation'],
  'Fuel Reimbursement':['One Way','Two Way','Bike','Car'],
  'Team Outing':['Monthly','Quarterly','Annual'],
  'Office Events':['Monthly','Annual','Festival'],
  'Office Stationery':['Monthly','Annual','Festival'],
  'Telephone & Internet':['Mobile','Broadband'],
  'Books & Learning':['Books','Course','Certification']
};
const EXP_CURRENCIES=['INR','GBP','USD','EUR','AED'];
const EXP_CLAIM_FOR=['Self','Others'];
const EXP_APP_TYPES=['Reimbursement','Advance'];
const EXP_TRAVEL_MODES=['None','Flight','Train','Bus','Cab','Own Vehicle'];
/* The extra columns an entity adds to its expense form (the old screen's
   "Vendor GSTIN" and "Attendees"). Each line item carries a value for each. */
const EXP_CUSTOM_COLS=['Vendor GSTIN','Attendees'];

/* People an expense can be filed for: the active entity's employees
   (js/identity.js) - Direct, Global and the people Admin Access knows. A
   claim names its claimant by Employee ID (employeeEid); the name and the
   Employee Code are what people read. dept and position are what Capping
   Limits and approval routes are pinned to. */
function expPersonOf(e){return e?{eid:e.eid,name:e.name,empId:e.empId||'',email:e.email||'',dept:e.dept||'',position:e.jobTitle||e.desig||''}:null;}
function expPeople(){return idEmpsIn(idEntity()).map(expPersonOf);}
function expPerson(eid){return expPersonOf(idEmp(eid));}
/* Picker labels: the name, with the Employee Code when two people share it. */
function expPersonLabel(eid,pool){
  const n=idEmpName(eid),e=idEmp(eid);
  return e&&(pool||[]).some(function(x){return x!==eid&&idEmpName(x)===n;})?n+' · '+e.empId:n;
}
function expPersonFromLabel(label,pool){return (pool||[]).find(function(x){return expPersonLabel(x,pool)===label;})||'';}
/* The signed-in person's own employee record here (the claimant of a Self claim). */
function expMyEid(){const e=typeof emsActorRecord==='function'?emsActorRecord():null;return e?e.eid:'';}
/* A person stored by User ID, as people read it (old claims keep the name they were filed with). */
function expWho(uid,fallback){return uid?idName(uid):(fallback||'');}

/* ── Seed data ─────────────────────────────────────────────────────────── */
function expLine(id,title,amount,subCat,start,end,proof,comments,status,cols){
  return {id:id,title:title,amount:amount,subCat:subCat,start:start,end:end||start,proof:proof||'',proofUrl:'',
    comments:comments||'',status:status||'Pending',cols:cols||{}};
}
const expensesData=[
  {id:1,key:297,title:'Hyderabad to Mumbai flight ticket',claimFor:'Self',name:'Syed Ayaz',empId:'1200',email:'syed.ayaz@opendhi.com',
   category:'Travel Reimbursement',currency:'INR',appType:'Reimbursement',travelMode:'Flight',notes:'Hyderabad to Mumbai flight ticket',
   status:'Awaiting Approval',appliedOn:'2026-04-07',reimbursedOn:'',createdBy:'Syed Ayaz',createdAt:'7 Apr 2026 | 01:40:12 PM',
   lines:[expLine(1,'Hyderabad to Mumbai flight ticket',6000,'Intercity Travel - Air','2026-04-02','2026-04-02','hyd-mum-ticket.pdf','Hyderabad to Mumbai flight ticket','Follow-Up',
     {'Vendor GSTIN':'','Attendees':'Syed Ayaz'})]},
  {id:2,key:296,title:'London hotel stay',claimFor:'Self',name:'Tarak Swain',empId:'768',email:'tarak.swain@maaserp.com',
   category:'Accommodation',currency:'GBP',appType:'Reimbursement',travelMode:'None',notes:'',
   status:'Draft',appliedOn:'2025-10-21',reimbursedOn:'',createdBy:'Tarak Swain',createdAt:'21 Oct 2025 | 11:05:40 AM',
   lines:[]},
  {id:3,key:294,title:'Travel to Pune',claimFor:'Self',name:'Premnath Jayachandran',empId:'991',email:'premnath.jayachandran@opendhi.com',
   category:'Travel Reimbursement',currency:'INR',appType:'Reimbursement',travelMode:'Train',notes:'Client workshop in Pune.',
   status:'Awaiting Approval',appliedOn:'2025-03-17',reimbursedOn:'',createdBy:'Premnath Jayachandran',createdAt:'17 Mar 2025 | 10:12:03 AM',
   lines:[expLine(1,'Mumbai to Pune train',1240,'Intercity Travel - Train','2025-03-13','2025-03-13','pune-train.pdf','Shatabdi, chair car'),
     expLine(2,'Station to client office cab',652,'One Way','2025-03-13','2025-03-13','cab-receipt.jpg','')]},
  {id:4,key:293,title:'Traveling',claimFor:'Self',name:'Prem Raj',empId:'731',email:'prem.raj@maaserp.com',
   category:'Travel Reimbursement',currency:'INR',appType:'Reimbursement',travelMode:'Cab',notes:'',
   status:'Awaiting Approval',appliedOn:'2024-12-26',reimbursedOn:'',createdBy:'Prem Raj',createdAt:'26 Dec 2024 | 04:22:51 PM',
   lines:[expLine(1,'Airport drop',472,'One Way','2024-12-23','2024-12-23','uber-2312.pdf','')]},
  {id:5,key:292,title:'Traveling',claimFor:'Self',name:'Prem Raj',empId:'731',email:'prem.raj@maaserp.com',
   category:'Travel Reimbursement',currency:'INR',appType:'Reimbursement',travelMode:'Cab',notes:'',
   status:'Awaiting Approval',appliedOn:'2024-12-26',reimbursedOn:'',createdBy:'Prem Raj',createdAt:'26 Dec 2024 | 04:10:09 PM',
   lines:[expLine(1,'Client visit cab',101,'Two Way','2024-12-20','2024-12-20','ola-2012.pdf','')]},
  {id:6,key:291,title:'Bangalore client visit',claimFor:'Self',name:'Meera Iyer',empId:'EMP006',email:'meera@testemp.com',
   category:'Accommodation',currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'Two nights for the onboarding workshop.',
   status:'Reimbursed',appliedOn:'2024-12-18',reimbursedOn:'2024-12-30',createdBy:'Meera Iyer',createdAt:'18 Dec 2024 | 09:30:00 AM',
   lines:[expLine(1,'Hotel stay - 2 nights',9800,'Accommodation','2024-12-15','2024-12-17','hotel-invoice.pdf','','Approved')]},
  {id:7,key:289,title:'Team lunch - sprint close',claimFor:'Others',name:'Arjun Nair',empId:'655',email:'arjun.nair@maaserp.com',
   category:'Meal Allowance',currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'Filed on behalf of the platform team.',
   status:'Approved',appliedOn:'2024-12-12',reimbursedOn:'',createdBy:'Arjun Nair',createdAt:'12 Dec 2024 | 03:15:44 PM',
   lines:[expLine(1,'Team lunch',3450,'Lunch','2024-12-11','2024-12-11','lunch-bill.jpg','8 people','Approved')]},
  {id:8,key:287,title:'Fuel - client visits, November',claimFor:'Self',name:'Syed Ayaz',empId:'1200',email:'syed.ayaz@opendhi.com',
   category:'Fuel Reimbursement',currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'',
   status:'Rejected',appliedOn:'2024-12-04',reimbursedOn:'',createdBy:'Syed Ayaz',createdAt:'4 Dec 2024 | 10:02:18 AM',
   lines:[expLine(1,'Fuel for own car',1199,'Car','2024-11-01','2024-11-30','fuel-nov.pdf','','Rejected')]},
  {id:9,key:285,title:'London partner meeting',claimFor:'Self',name:'Tarak Swain',empId:'768',email:'tarak.swain@maaserp.com',
   category:'Travel Reimbursement',currency:'GBP',appType:'Advance',travelMode:'Train',notes:'Advance against the Q4 partner meeting.',
   status:'Follow-Up',appliedOn:'2024-11-26',reimbursedOn:'',createdBy:'Tarak Swain',createdAt:'26 Nov 2024 | 12:45:30 PM',
   lines:[expLine(1,'London to Reading return',64,'Two Way','2024-11-28','2024-11-28','gwr-ticket.pdf','')]},
  {id:10,key:283,title:'Stationery for onboarding kits',claimFor:'Others',name:'Meera Iyer',empId:'EMP006',email:'meera@testemp.com',
   category:'Office Stationery',currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'',
   status:'Reimbursed',appliedOn:'2024-11-20',reimbursedOn:'2024-11-29',createdBy:'Meera Iyer',createdAt:'20 Nov 2024 | 11:11:11 AM',
   lines:[expLine(1,'Notebooks and pens',2380,'Monthly','2024-11-18','2024-11-18','stationery.pdf','','Approved')]},
  {id:11,key:298,title:'Airtel postpaid - October bill',claimFor:'Self',name:'Pallavi Parate',empId:'EMP002',email:'pallavi@testemp.com',
   category:'Telephone & Internet',currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'Claimed against the Telephone & Internet benefit.',
   status:'Awaiting Approval',appliedOn:'2026-11-03',reimbursedOn:'',createdBy:'Pallavi Parate',createdAt:'3 Nov 2026 | 10:05:00 AM',
   lines:[expLine(1,'Airtel postpaid - October bill',799,'Mobile','2026-11-02','2026-11-02','airtel-oct.pdf','')]}
];
let expNextId=12,expNextKey=299;

/* ── Derived values ────────────────────────────────────────────────────── */
function expTotal(r){return r.lines.reduce(function(s,l){return s+(parseFloat(l.amount)||0);},0);}
function expMoney(n,cur){return (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2})+(cur?' '+cur:'');}
function expStart(r){return r.lines.map(function(l){return l.start;}).filter(Boolean).sort()[0]||'';}
function expEnd(r){return r.lines.map(function(l){return l.end||l.start;}).filter(Boolean).sort().pop()||'';}
/* EXP for claims; advance and imprest requests carry their own prefix (js/advances.js). */
function expKey(r){return (r&&r.prefix||'EXP')+'-'+r.key;}
function expRec(id){return expensesData.find(function(x){return x.id===id;})||null;}

const EXP_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>',
  plane:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  cols:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  clip:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
};

/* ── State ─────────────────────────────────────────────────────────────── */
let expSelectedId=null,expTab='basic-details';
let expCatF='',expStatusF='',expDateF='',expQ='';
let expLogScope='expense',expLogLineId=null;
/* One edit at a time: the claim's basic details, or one line item ('new' for
   + Add Line Item). The draft is read back from the form on every repaint. */
let expEditBasic=false,expLineEdit=null,expDraft=null,expDraftOrig='';
let expModalOpen=false;

/* ── Filters ───────────────────────────────────────────────────────────────
   Only the filters someone actually reaches for:
     Search        - a claim is looked up by what you know: title, key,
                     employee name, ID or email.
     Category      - "all travel claims this month".
     Expense Date  - "what was spent on the 2nd".
     Status        - every status; the three quick tiles set the same
                     filter, so the tile and the dropdown always agree.
   Claim For (Self / Others) and Currency were dropped - nobody works a
   queue by either, and both are on the panel. */
/* The claims this role may see: everyone's for admins, their own for an employee (js/ems-access.js). */
function expScope(){
  return caScopeClaims(expensesData);
}
/* The moves this role may make on a claim. */
/* Decided by the approval engine: who you are, the active stage, separation of duties. */
function expMoves(r){return caMoves(r);}
function expRows(){
  return expScope().filter(function(r){
    if(expCatF&&r.category!==expCatF)return false;
    if(expStatusF&&r.status!==expStatusF)return false;
    /* Expense Date: any claim with a line item spanning that day. */
    if(expDateF&&!r.lines.some(function(l){return l.start<=expDateF&&(l.end||l.start)>=expDateF;}))return false;
    if(typeof caRowPass==='function'&&!caRowPass(r))return false;
    return true;
  });
}
function expToggleStat(v){expStatusF=expStatusF===v?'':v;expSelectedId=null;renderADTPage();}
function applyExpFilters(){
  const pick=function(id,all){const v=getCSValue(id);return v&&v!==all?v:'';};
  expCatF=pick('exp-f-cat','All Categories');
  expStatusF=pick('exp-f-status','All Statuses');
  expDateF=getCDValue('exp-f-date');
  expQ=lpSearchValue('exp-f-q');
  if(typeof expStageF!=='undefined'){
    expStageF=pick('exp-f-stage','All Stages');expApproverF=pick('exp-f-appr','All Approvers');expReimbF=pick('exp-f-reimb','All Reimbursement');
    expDeptF=pick('exp-f-dept','All Departments');expSubF=getCDValue('exp-f-sub');
  }
  expSelectedId=null;renderADTPage();
}
function resetExpFilters(){
  expCatF='';expStatusF='';expDateF='';expQ='';
  if(typeof expStageF!=='undefined'){expStageF='';expApproverF='';expReimbF='';expSubF='';expDeptF='';}
  expSelectedId=null;renderADTPage();
}

/* Export Filtered: exactly the rows the filters leave, as a CSV. */
function expExport(){
  /* The header Export exports what the screen shows. */
  if(page==='capping-limit'){capExportPolicies();return;}
  if(page==='advances'){advExport();return;}
  if(page==='budgets'){bgExport();return;}
  if(page==='cards'&&typeof ccExport==='function'){ccExport();return;}
  if(expPageTab==='reimb'){caExportReimb();return;}
  if(expPageTab==='queue'){caExportQueue();return;}
  if(expPageTab==='settings'){awfExport();return;}
  const rows=lpSearchRows(expRows(),expQ);
  if(!rows.length){showToast('Nothing to export','info','No expense matches the current filters.');return;}
  const head=['S.No','Key','Title','Claim For','Employee Id','Employee Email','Expense Category','Total Amount','Currency',
    'Date Of Exp.','Status','Application Type','Applied On','Reimbursed On','Approved Amount','Current Stage','Approver','Reimbursement Status','Submitted By','Created By'];
  wbCSV('expenses',head,rows.map(function(r,i){
    return [i+1,r.key,r.title,r.claimFor,r.empId,r.email,r.category,expTotal(r),r.currency,cdLabel(expStart(r)),r.status,
      r.appType,cdLabel(r.appliedOn),r.reimbursedOn?cdLabel(r.reimbursedOn):'Not Reimbursed',
      typeof caApprovedTotal==='function'?caApprovedTotal(r):'',(function(){const st=typeof caActiveStage==='function'?caActiveStage(r):null;return st?'Stage '+st.n+' '+st.name:'';})(),
      (function(){const st=typeof caActiveStage==='function'?caActiveStage(r):null;return st?st.approvers.join(' / '):'';})(),
      typeof caPayStatus==='function'?caPayStatus(r):'',expWho(r.submittedBy),expWho(r.createdBy,r.createdByName)];
  }));
  showToast('Export ready','success',rows.length+' expense'+(rows.length===1?'':'s')+' exported.');
}

/* ── Detail panel ──────────────────────────────────────────────────────── */
function expEditing(){return expEditBasic||expLineEdit!=null;}
function expDropEdit(){expEditBasic=false;expLineEdit=null;expDraft=null;}
function openExpSidebar(id,tab){
  /* Only a claim this person may see (entity + RBAC scope), however it is reached. */
  if(!expScope().some(function(r){return r.id===id;})){showToast('Not available','error','This claim is outside your access.');return;}
  if(expSelectedId!=null&&expSelectedId!==id&&sbLeaveGuard('exp',function(){openExpSidebar(id,tab);}))return;
  if(expSelectedId!==id){expDropEdit();expLogLineId=null;}
  expTab=tab||sbKeepTab(expSelectedId,expTab);expSelectedId=id;
  const sb=document.getElementById('exp-split-sb');if(sb)sb.classList.add('open');
  isbTab('exp',renderExpSidebar);
  document.querySelectorAll('.exp-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='exp-row-'+id);});
}
function closeExpSidebar(){
  if(sbLeaveGuard('exp',closeExpSidebar))return;
  expDropEdit();expSelectedId=null;
  const sb=document.getElementById('exp-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.exp-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navExpTab(t){if(expEditing()&&!sbHasDraft('exp'))expDropEdit();expTab=t;isbTab('exp',renderExpSidebar);}
function expSetLogScope(s){expLogScope=s;isbTab('exp',renderExpSidebar);}
function expPickLogLine(v){
  const r=expRec(expSelectedId);if(!r)return;
  const l=r.lines.find(function(x){return expLineLabel(r,x)===v;});
  expLogLineId=l?l.id:null;isbTab('exp',renderExpSidebar);
}

/* Logs: seeded once from the claim's own dates, then only ever added to. */
function expSeedLogs(r){
  const p=String(r.createdAt).split(' | ');
  const by=expWho(r.createdBy,r.createdByName);
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:by,status:'Draft',action:'Expense drafted.'}];
  if(r.status!=='Draft')fx.unshift({date:cdLabel(r.appliedOn),time:p[1]||'09:05:00 AM',user:by,status:'Awaiting Approval',
    action:'Submitted for approval with '+r.lines.length+' line item'+(r.lines.length===1?'':'s')+'.'});
  if(r.status==='Follow-Up')fx.unshift({date:cdLabel(r.appliedOn),time:'03:30:00 PM',user:'Shaun Mathew',status:'Follow-Up',
    action:'Please attach the booking confirmation for the return leg.'});
  if(['Approved','Reimbursed'].indexOf(r.status)>=0)fx.unshift({date:cdLabel(r.appliedOn),time:'05:10:00 PM',user:'Shaun Mathew',status:'Approved',
    action:'Within policy. Approved.'});
  if(r.status==='Rejected')fx.unshift({date:cdLabel(r.appliedOn),time:'05:10:00 PM',user:'Shaun Mathew',status:'Rejected',
    action:'Fuel for client visits is covered by the monthly conveyance allowance.'});
  if(r.status==='Reimbursed')fx.unshift({date:cdLabel(r.reimbursedOn),time:'11:00:00 AM',user:'Finance Admin',status:'Reimbursed',
    action:'Paid with the payroll run.'});
  return seedLogs(r,fx);
}
function expSeedLineLogs(r,l){
  const p=String(r.createdAt).split(' | ');
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:expWho(r.createdBy,r.createdByName),status:'Pending',action:'Line item added.'}];
  if(l.status!=='Pending')fx.unshift({date:cdLabel(r.appliedOn),time:'04:00:00 PM',user:'Shaun Mathew',status:l.status,
    action:l.status==='Follow-Up'?(r.key===297?'Please attach the boarding pass.':'Proof is unclear - please re-upload.'):l.status==='Rejected'?'Not claimable under the policy.':'Checked against the receipt.'});
  return seedLogs(l,fx);
}
/* Workflow is read from the Logs, so the two can never disagree; then the
   steps still to come, with who owns each. */
const EXP_STEP_TITLE={'Draft':'Expense Drafted','Awaiting Approval':'Submitted for Approval','Follow-Up':'Follow-Up Raised',
  'Approved':'Expense Approved','Rejected':'Expense Rejected','Reimbursed':'Reimbursed'};
function expWorkflow(r){return caWorkflowRows(r);}

function expProofChip(l){
  if(!l.proof)return '';
  return '<button type="button" class="exp-proof" onclick="expOpenProof('+expSelectedId+','+l.id+')" title="'+attrSafe(l.proof)+'">'
    +EXP_ICO.clip+'<span>'+l.proof+'</span></button>';
}
function expOpenProof(id,lineId){
  const r=expRec(id);const l=r&&r.lines.find(function(x){return x.id===lineId;});
  if(!l)return;
  if(l.proofUrl){window.open(l.proofUrl,'_blank');return;}
  showToast(l.proof,'info','The original file is held on the server; only its name is shown here.');
}

function renderExpSidebar(){
  const r=expRec(expSelectedId);if(!r)return '';
  /* Server-side rule: a claim outside your scope (another employee's, another entity's) is not shown. */
  if(expScope().indexOf(r)<0)return '<div class="lp-isb-body"><div class="wb-empty-sm">This claim is not available to you.</div></div>';
  /* No Approval, Expense Summary or Reimbursement tab (product owner, 12 Nov 2026): the line items are on Basic Details;
     the route, its stages, every decision and the reimbursement are shown in Logs. A Bank Details tab shows where the
     employee is paid (js/exp-panel-extras.js). */
  if(expTab==='approval'||expTab==='reimbursement')expTab='logs';
  if(expTab==='summary')expTab='basic-details';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'bank',label:'Bank Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const tabBar=axTabBar('exp',tabs,expTab,'navExpTab','closeExpSidebar');
  const hero=function(editing,edit){return sbHero({icon:EXP_ICO.hero,name:r.title,meta:[expKey(r),r.category,r.claimFor],
    status:axBadge(statusTone(r.status),r.status),editing:editing,onEdit:edit});};
  /* Draft: editable. Follow-Up: by whoever answers it. Awaiting Approval: only a
     Super Admin's audited administrative edit, which re-runs the approval rules.
     Final and withdrawn claims are closed. */
  const locked=typeof expCanEditClaim==='function'?!expCanEditClaim(r):['Approved','Rejected','Reimbursed'].indexOf(r.status)>=0;
  let body='';
  if(expTab==='basic-details'&&expEditBasic){
    body=hero(true)+axInlineFormHTML(expBasicFieldsHTML(),'expCancelEdit()','expSaveEdit()');
  }else if(expTab==='basic-details'){
    const s=expStart(r),e=expEnd(r);
    body=hero(false,locked?'':'expStartEdit()')
      +(locked?'<div class="ax-locked-note exp-note">'+expLockNote(r)+'</div>':(r.status==='Awaiting Approval'?'<div class="ax-locked-note exp-note">Administrative edit: a change to amounts, dates, category, currency, Paid By or line items re-runs the policy check and restarts approval from the first stage it affects. It is audited.</div>':''))
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Title',r.title)
      +axField(AX_ICO.fUser,'Claim Expense',r.claimFor)
      +axField(AX_ICO.fUser,'Employee Name',sbEsc(idEmpName(r.employeeEid)||r.name)+(r.employeeEid?'':' <span class="ax-sub">not matched to an employee record</span>'))
      +axField(AX_ICO.fHash,'Employee Id',r.empId)
      +axField(AX_ICO.fMail,'Employee Email',r.email)
      +axField(AX_ICO.fBox,'Sub Category',r.category)
      +axField(AX_ICO.fCash,'Net Amount',expMoney(expTotal(r),r.currency)+' <span class="ax-sub">from '+r.lines.length+' line item'+(r.lines.length===1?'':'s')+'</span>')
      +axField(AX_ICO.fCash,'Approved Amount',(r.lines.some(function(l){return l.approved!=null;})?expMoney(typeof caApprovedTotal==='function'?caApprovedTotal(r):0,r.currency):'—')
        +(['Approved','Partially Approved','Rejected'].indexOf(r.status)>=0?'':' <span class="ax-sub">so far</span>'))
      +axField(AX_ICO.fCash,'Currency',r.currency)
      +axField(AX_ICO.fTag,'Current Stage',(function(){const st=typeof caActiveStage==='function'?caActiveStage(r):null;return st?'Stage '+st.n+' · '+sbEsc(st.name)+' <span class="ax-sub">'+sbEsc(idNames(st.approvers)||'unassigned')+'</span>':'—';})())
      +axField(AX_ICO.fTag,'Reimbursement',typeof caPayBadge==='function'?caPayBadge(r):'—')
      +axField(AX_ICO.fUser,'Created By',sbEsc(expWho(r.createdBy,r.createdByName)))
      +axField(AX_ICO.fUser,'Submitted By',r.submittedBy?sbEsc(expWho(r.submittedBy))+(r.submittedAt?' <span class="ax-sub">'+sbEsc(r.submittedAt)+'</span>':''):'Not submitted')
      +axField(AX_ICO.fCal,'Expense Start Date',s?cdLabel(s):'')
      +axField(AX_ICO.fCal,'Expense End Date',e?cdLabel(e):'')
      +axField(EXP_ICO.plane,'Travel Mode',r.travelMode)
      +axField(AX_ICO.fTicket,'Application Type',r.appType)
      +axField(AX_ICO.fCal,'Applied On',cdLabel(r.appliedOn))
      +axField(AX_ICO.fCheck,'Reimbursed On',r.reimbursedOn?cdLabel(r.reimbursedOn):'Not Reimbursed')
      +axField(EXP_ICO.note,'Notes',r.notes,true)
      +'</div>'
      +(typeof caDupNoteHTML==='function'?caDupNoteHTML(r,r.status==='Draft'):'')
      +(typeof epClaimEvalHTML==='function'?epClaimEvalHTML(r):'')
      +(typeof bgClaimPanelHTML==='function'?bgClaimPanelHTML(r):'')
      +'<div style="margin-top:18px">'+expSummaryHTML(r,locked)+'</div>';   // the line items
  }else if(expTab==='bank'){
    body=hero(false)+expBankHTML(r);
  }else if(expTab==='summary'){
    body=expSummaryHTML(r,locked);
  }else if(expTab==='approval'){
    body=hero(false)+caApprovalTabHTML(r);
  }else if(expTab==='reimbursement'){
    body=hero(false)+caReimbTabHTML(r);
  }else if(expTab==='logs'){
    body=expLogsHTML(r)+'<div style="margin-top:18px">'+caApprovalTabHTML(r)+'</div>'+'<div style="margin-top:18px">'+expReimbLogHTML(r)+'</div>';
  }else if(expTab==='history'){
    body=sbHistoryHTML(r);
  }else{
    body=wfTimelineHTML(expWorkflow(r));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

/* Expense Summary: the line items the claim is made of, each its own card. */
function expSummaryHTML(r,locked){
  const total=expTotal(r);
  let out='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Line Items <span class="ax-count">'+r.lines.length+'</span></span>'
    +'<span class="exp-sum-total">Total <b>'+expMoney(total,r.currency)+'</b></span></div>';
  if(expLineEdit==='new')out+=expLineFormHTML(r,null);
  if(!r.lines.length&&expLineEdit!=='new')
    out+='<div class="ax-empty">No line items yet. <b>Add Line Item</b> records what was spent, with its proof.</div>';
  out+=r.lines.map(function(l,i){
    if(expLineEdit===l.id)return expLineFormHTML(r,l);
    const cols=EXP_CUSTOM_COLS.map(function(c){return axField(EXP_ICO.cols,c,(l.cols||{})[c]);}).join('');
    const appr=l.approved!=null&&Number(l.approved)!==Number(l.amount);
    return '<div class="exp-line">'
      +'<div class="exp-line-hd"><span class="exp-line-n">'+(i+1)+'</span>'
        +'<div class="exp-line-ttl"><div class="exp-line-name">'+l.title+'</div>'
        +'<div class="exp-line-amt">'+expKey(r)+'-L'+l.id+' · '+expMoney(l.amount,r.currency)+(appr?' · approved <b>'+expMoney(l.approved,r.currency)+'</b>':'')+'</div></div>'
        +axBadge(statusTone(l.status),l.status)
        +(locked||expEditing()?'':'<button class="btn-outline btn-sm" onclick="expStartLine('+l.id+')">'+SB_PEN+' Edit</button>')
      +'</div>'
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fCash,'Amount Spent',expMoney(l.amount,r.currency))
      +axField(AX_ICO.fBox,'Expense Type',l.subCat)
      +axField(AX_ICO.fCal,'Start Date',cdLabel(l.start))
      +axField(AX_ICO.fCal,'End Date',cdLabel(l.end))
      +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Expense Proof',expProofChip(l))
      +axField(AX_ICO.fUser,'Expense Paid By',(l.paidBy||'<span class="wb-warn">Not recorded</span>')
        +(l.advanceId&&typeof advRefLabel==='function'?' <span class="ax-sub">'+sbEsc(advRefLabel(l.advanceId))+' · advance '+expMoney(l.advAmount,r.currency)+' · employee '+expMoney(Math.max(0,Number(l.amount)-Number(l.advAmount||0)),r.currency)+'</span>':'')
        +(typeof ccExpLinePaidText==='function'?ccExpLinePaidText(l,r):''))
      +(l.advanceId&&l.approvedAdv!=null?axField(AX_ICO.fCash,'Approved Funding','advance '+expMoney(l.approvedAdv,r.currency)+' · employee '+expMoney(Math.max(0,Number(l.approved||0)-Number(l.approvedAdv)),r.currency)):'')
      +(typeof ccExpLineApprovedHTML==='function'?ccExpLineApprovedHTML(l,r):'')
      +axField(AX_ICO.fBuild,'Merchant / Vendor',sbEsc(l.merchant||''))
      +axField(AX_ICO.fHash,'Invoice / Receipt No.',sbEsc(l.invoice||''))
      +axField(AX_ICO.fCash,'Approved Amount',l.approved!=null?expMoney(l.approved,r.currency):'Pending')
      +(l.reason?axField(EXP_ICO.note,l.status==='Rejected'?'Rejection Reason':'Adjustment Reason',sbEsc(l.reason),true):'')
      +cols
      +axField(EXP_ICO.note,'Comments',l.comments,true)
      +'</div></div>';
  }).join('');
  if(!locked&&!expEditing())
    out+='<button class="btn-outline exp-add-line" onclick="expStartLine(\'new\')">'+AX_ICO.plus+' Add Line Item</button>';
  return out;
}

/* Logs: the claim's own log, or one line item's - a strip picks which. */
function expLogsHTML(r){
  const seg=function(id,label){return '<button type="button" class="seg-btn'+(expLogScope===id?' active':'')+'" onclick="expSetLogScope(\''+id+'\')">'+label+'</button>';};
  const strip='<div class="segmented is-compact exp-log-scope">'+seg('expense','Expense Logs')+seg('line','Line Item Logs')+'</div>';
  if(expLogScope!=='line'){
    const moves=expMoves(r);
    return strip+lpLogsView(expSeedLogs(r),expLogFormHTML('exp-log',r.status,moves,'expSaveLog('+r.id+')',
      'Move this claim on and say why'),{labels:EXP_MOVE_LABELS});
  }
  if(!r.lines.length)return strip+'<div class="ax-empty">This claim has no line items yet, so there is nothing to log against.</div>';
  const l=r.lines.find(function(x){return x.id===expLogLineId;})||r.lines[0];
  expLogLineId=l.id;
  const label=function(x){return expLineLabel(r,x);};
  const picker='<div class="exp-log-line"><div class="lp-logs-form-label">Line Item</div>'
    +apCS('exp-log-line-pick',r.lines.map(label),label(l),'Select Line Item','expPickLogLine')+'</div>';
  const moves=caLineMoves(r,l);
  return strip+picker+lpLogsView(expSeedLineLogs(r,l),expLogFormHTML('exp-llog',l.status,moves,'expSaveLineLog('+r.id+','+l.id+')',
    'Approve, reduce, reject or query this line at the active stage'),{labels:{'Approved':'Approve','Rejected':'Reject','Pending':'Reopen','Partially Approved':'Partially Approve','Follow-Up':'Follow-Up'}});
}
/* apCS writes its options into an onclick string, so quotes are kept out. */
function expLineLabel(r,l){return String(l.title).replace(/['"\\]/g,'')+' · '+expMoney(l.amount,r.currency);}
function expLogFormHTML(pre,status,moves,save,sub){
  return '<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+status+'</div>'
    +'<p class="lp-logs-form-sub">'+sub+'</p>'
    +lpLogStatusField(pre+'-status-sel',status,[status].concat(moves))
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="'+pre+'-comment-inp" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="navExpTab(\'logs\')">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="'+save+'">Submit</button>'
    +'</div></div>';
}
/* Logs and the row menu run the approval engine's checks, never a bare
   status write (js/expense-approvals-ui.js caLogMove / caLineLogMove). */
function expLogPick(sel,inp){
  const to=getCSValue(sel),el=document.getElementById(inp);
  const c=el?el.value.trim():'';
  const flash=function(e){if(e){e.style.borderColor='#b83a3a';setTimeout(function(){e.style.borderColor='';},1500);}};
  if(!to){flash(csTrigger(sel));return null;}
  if(!c){flash(el);return null;}
  return {to:to,comment:c};
}
function expSaveLog(id){
  const r=expRec(id);if(!r)return;
  const p=expLogPick('exp-log-status-sel','exp-log-comment-inp');if(!p)return;
  if(p.to===r.status){showToast('Pick a new status','error');return;}
  caLogMove(id,p.to,p.comment);
}
function expSaveLineLog(id,lineId){
  const r=expRec(id);const l=r&&r.lines.find(function(x){return x.id===lineId;});if(!l)return;
  const p=expLogPick('exp-llog-status-sel','exp-llog-comment-inp');if(!p)return;
  if(p.to===l.status&&p.to!=='Approved'){showToast('Pick a decision','error');return;}
  caLineLogMove(id,lineId,p.to,p.comment);
}
/* Who may edit a claim now. */
function expCanEditClaim(r){
  if(typeof caMe!=='function')return ['Approved','Rejected','Reimbursed'].indexOf(r.status)<0;
  if(r.status==='Draft')return ((caIsClaimant(r)||r.createdBy===caMe())&&caCan('expense.claim.submit'))||caCan('expense.claim.create.others');
  if(r.status==='Follow-Up')return caCanRespond(r);
  if(r.status==='Awaiting Approval')return caCan('expense.claim.admin.edit')&&!caSoD(r);
  return false;
}
function expLockNote(r){
  if(r.status==='Awaiting Approval')return 'This claim is <b>awaiting approval</b>, so it cannot be changed. The approver can send it back with a Follow-Up; you can withdraw it from the Approval tab.';
  if(r.status==='Follow-Up')return 'This claim is in <b>Follow-Up</b>; only the claimant, the submitter or an authorised administrator can correct it.';
  return 'This claim is <b>'+r.status+'</b>, so it can no longer be edited.';
}

/* ── Edit: basic details (in the panel) ────────────────────────────────── */
function expStartEdit(){
  const r=expRec(expSelectedId);if(!r)return;
  if(!expCanEditClaim(r)){showToast('Not editable','error',expLockNote(r).replace(/<[^>]+>/g,''));return;}
  expLineEdit=null;expEditBasic=true;expTab='basic-details';
  expDraft={title:r.title,claimFor:r.claimFor,eid:r.employeeEid,name:r.name,category:r.category,currency:r.currency,appType:r.appType,
    travelMode:r.travelMode,notes:r.notes||'',just:Object.assign({},r.policyJust||{}),dupJust:r.dupJust||'',costCentreId:r.costCentreId||'',projectId:r.projectId||'',bgJust:r.bgJust||''};
  expDraftOrig=JSON.stringify(expDraft);
  if(typeof caAdminEditStart==='function')caAdminEditStart(r);
  renderADTPage();
}
function expCancelEdit(){expDropEdit();renderADTPage();}
function expSyncBasic(){
  if(!expDraft)return;
  [['title','exp-e-title'],['notes','exp-e-notes']].forEach(function(p){const el=document.getElementById(p[1]);if(el)expDraft[p[0]]=el.value.trim();});
  [['claimFor','exp-e-claim'],['category','exp-e-cat'],['currency','exp-e-cur'],['appType','exp-e-app'],['travelMode','exp-e-mode']]
    .forEach(function(p){if(document.getElementById('csw-'+p[1]))expDraft[p[0]]=getCSValue(p[1]);});
  /* The employee picker shows names; the claim keeps the Employee ID. */
  if(document.getElementById('csw-exp-e-emp')){
    expDraft.eid=expPersonFromLabel(getCSValue('exp-e-emp'),expPickPool());
    expDraft.name=idEmpName(expDraft.eid);
  }
  /* Policy justifications, one per Warning breach (js/capping-limit.js). */
  expDraft.just=expDraft.just||{};
  document.querySelectorAll('[data-epjust]').forEach(function(el){expDraft.just[el.getAttribute('data-epjust')]=el.value.trim();});
  const dj=document.getElementById('exp-e-dupjust');if(dj)expDraft.dupJust=dj.value.trim();
  /* Cost Centre, Project and the budget justification (js/budgets-ui.js). */
  if(typeof bgExpSync==='function')bgExpSync(expDraft);
  /* Claim For Self: the claimant is the person filing it. */
  if(expModalOpen&&expDraft.claimFor==='Self'){expDraft.eid=expMyEid();expDraft.name=idEmpName(expDraft.eid);}
}
/* Who the employee picker offers: this entity's people (not yourself in the Add popup's Others). */
function expPickPool(){
  const me=expMyEid();
  return expPeople().map(function(p){return p.eid;}).filter(function(e){return !expModalOpen||e!==me;});
}
/* Self → me; Others → pick someone else. */
function expClaimForHook(){
  const was=expDraft&&expDraft.claimFor;
  expSyncBasic();if(expModalOpen)expSyncLine();
  if(expModalOpen&&was!==expDraft.claimFor&&expDraft.claimFor==='Others'&&expDraft.eid===expMyEid()){expDraft.eid='';expDraft.name='';}
  expRepaintForm();
}
function expCheckClaimFor(d){
  if(typeof caMe!=='function')return true;
  const me=expMyEid();
  if(d.claimFor==='Self'&&!me){showToast('No employee record','error',idMeName()+' has no employee record in '+idEntityName(idEntity())+', so cannot file a Self claim here.');return false;}
  if(d.claimFor==='Self'&&d.eid!==me){showToast('Claim For is Self','error','A Self claim is filed for yourself ('+idMeName()+'). Choose Others to file for someone else.');return false;}
  if(d.claimFor==='Others'){
    if(!caCan('expense.claim.create.others')){showToast('Not permitted','error',emsRoleLabel()+' cannot file claims for other employees.');return false;}
    if(d.eid===me){showToast('Claim For is Others','error','Pick the employee you are filing for, or choose Self.');return false;}
  }
  return true;
}
function expFormHook(){expSyncBasic();if(expModalOpen)expSyncLine();expRepaintForm();}
function expBasicFieldsHTML(){
  const d=expDraft;
  const p=expPerson(d.eid);
  const travel=d.category==='Travel Reimbursement';
  const sel=function(id,label,opts,val,ph,req,hook,cls){
    return '<div class="ep-form-group'+(cls?' '+cls:'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+apCS(id,opts,val,ph,hook)+'</div>';
  };
  /* Laid out as the old claim form: who it is for, the category (with the
     limit it falls under), then the title and notes. Application Type and
     Travel Mode are not asked when filing - the sub categories already say
     how someone travelled - and stay editable from the panel. */
  const others=typeof caCan!=='function'||caCan('expense.claim.create.others');
  const pool=expPickPool();
  const selfLock=expModalOpen&&d.claimFor==='Self';
  return sel('exp-e-claim','Claim For',others?EXP_CLAIM_FOR:['Self'],d.claimFor,'Select',true,'expClaimForHook')
    +'<div class="ep-form-group"><label class="ep-form-label">Employee <span class="req">*</span></label>'
      +(selfLock?'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(d.eid?idEmpName(d.eid):idMeName()+' - no employee record here')+'">'
        :axCS('exp-e-emp',pool.map(function(x){return expPersonLabel(x,pool);}),d.eid?expPersonLabel(d.eid,pool):'','Search Employee','expFormHook'))+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employee Id</label>'
      +'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(p?p.empId:'')+'" placeholder="Auto — from the employee"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employee Email</label>'
      +'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(p?p.email:'')+'" placeholder="Auto — from the employee"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Sub Category <span class="req">*</span></label>'
      +apCS('exp-e-cat',EXP_CATEGORIES,d.category,'Select Sub Category','expFormHook')+'</div>'
    +'<div class="ep-form-group ep-form-full" id="exp-e-policy">'+expPolicyBlockHTML(d)+'</div>'
    +'<div class="ep-form-group ep-form-full" id="exp-e-dup">'+expDupBlockHTML(d)+'</div>'
    +(typeof bgExpFieldsHTML==='function'?bgExpFieldsHTML(d):'')
    +sel('exp-e-cur','Currency',EXP_CURRENCIES,d.currency,'Select Currency',true,'expFormHook')
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="exp-e-title">Title <span class="req">*</span></label>'
      +'<input class="ep-form-input" id="exp-e-title" value="'+attrSafe(d.title)+'" placeholder="e.g. Hyderabad to Mumbai flight"></div>'
    +(expModalOpen?'':sel('exp-e-app','Application Type',EXP_APP_TYPES,d.appType,'Select Type',true)
      +'<div class="ep-form-group'+(travel?'':' exp-dim')+'"><label class="ep-form-label">Travel Mode</label>'
      +apCS('exp-e-mode',EXP_TRAVEL_MODES,travel?d.travelMode:'None','Select Travel Mode')
      +(travel?'':'<div class="ea-hint">Only for Travel Reimbursement.</div>')+'</div>')
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="exp-e-notes">Notes <span class="exp-opt">(Optional)</span></label>'
      +'<textarea class="ep-form-input ax-notes" id="exp-e-notes" placeholder="What was this for?">'+attrSafe(d.notes||'')+'</textarea></div>';
}
/* "Capping limit (Sales - local travel): 5,000 INR" under Expense Category - the limit
   this employee's claim in this category falls under (capFor), and how far
   over it the items so far come. */
/* The policies this claim falls under, evaluated on what the form holds now:
   the popup's items plus the one being typed, or the panel's record. */
function expPolicyCtx(d){
  if(expModalOpen&&d&&d.lines){
    const lines=d.lines.slice();if(expLineTouched(d.line)&&parseFloat(d.line.amount)>0&&d.line.start)lines.push(d.line);
    return {eid:d.eid,name:d.name,category:d.category,currency:d.currency,lines:lines,claimId:null};
  }
  const r=expRec(expSelectedId);
  return r?{eid:d.eid||r.employeeEid,name:d.name||r.name,category:d.category||r.category,currency:d.currency||r.currency,lines:r.lines,claimId:r.id}:{eid:d.eid,name:d.name,category:d.category,currency:d.currency,lines:[],claimId:null};
}
function expPolicyBlockHTML(d){
  if(typeof epFormBlockHTML!=='function')return expCapHintHTML(d.category,d.eid);
  const r=expModalOpen?null:expRec(expSelectedId);
  return epFormBlockHTML(expPolicyCtx(d),d.just||(r&&r.policyJust)||{},false);
}
/* Potential duplicates of what the form holds now (js/expense-approvals.js). */
function expDupBlockHTML(d){
  if(typeof caDupMatches!=='function'||!d.category)return '';
  const c=expPolicyCtx(d);
  const r=expModalOpen?null:expRec(expSelectedId);
  const m=caDupMatches({eid:c.eid,category:c.category,currency:c.currency,lines:c.lines,claimId:c.claimId,revisedFrom:r?r.revisedFrom:null});
  if(!m.length)return '';
  return '<div class="ep-eval"><div class="ep-eval-row is-wait"><div class="ep-eval-hd"><span class="ep-eval-name">Potential duplicate</span>'+axBadge('wait','Check')+'</div>'
    +m.map(function(x){return '<div>"'+sbEsc(x.title)+'" matches <b>'+x.ref+'</b> "'+sbEsc(x.lineTitle)+'" ('+x.status+') - '+sbEsc(x.why)+'.</div>';}).join('')
    +'<div class="ep-just"><label class="ep-form-label">Duplicate Expense Justification <span class="req">*</span></label>'
    +'<textarea class="ep-form-input ax-notes" id="exp-e-dupjust" placeholder="Why this is a separate expense (e.g. two different trips on the same day)">'+sbEsc(d.dupJust||'')+'</textarea>'
    +'<div class="ea-hint">Similar claims are allowed with a reason; the approver sees this warning and your justification.</div></div></div></div>';
}
function expCapHintHTML(category,eid){
  if(!category||typeof capFor!=='function')return '';
  const cap=capFor(category,eid);
  if(!cap)return '<div class="ea-hint exp-cap">No capping limit on '+category+'.</div>';
  const total=expModalOpen&&expDraft&&expDraft.lines
    ?expDraft.lines.reduce(function(s,l){return s+(parseFloat(l.amount)||0);},0)+(parseFloat((expDraft.line||{}).amount)||0)
    :(expRec(expSelectedId)?expTotal(expRec(expSelectedId)):0);
  const over=total-cap.amount;
  return '<div class="ea-hint exp-cap">Capping limit ('+cap.name+'): <b>'+capMoney(cap)+'</b>'
    +(over>0?'<span class="exp-cap-over"> · items come to '+expMoney(total,cap.currency)+', over by '+expMoney(over,cap.currency)+'</span>':'')+'</div>';
}
function expCheckBasic(d){
  if(d.eid!==expMyEid()&&!caCan('expense.claim.create.others')){showToast('You can only file your own claims','error','Filing for others needs the RBAC right expense.claim.create.others.');return false;}
  const need=[['title','Title'],['claimFor','Claim For'],['eid','Employee'],['category','Sub Category'],['currency','Currency'],['appType','Application Type']];
  for(let i=0;i<need.length;i++){if(!String(d[need[i][0]]||'').trim()){showToast(need[i][1]+' is required','error');return false;}}
  if(d.category!=='Travel Reimbursement')d.travelMode='None';
  return true;
}
function expSaveEdit(){
  const r=expRec(expSelectedId);if(!r||!expDraft)return;
  expSyncBasic();
  const d=expDraft;
  if(!expCheckBasic(d))return;
  if((d.claimFor!==r.claimFor||d.eid!==r.employeeEid)&&!expCheckClaimFor(d))return;
  if(d.category!==r.category&&r.lines.some(function(l){return (EXP_SUBCATS[d.category]||[]).indexOf(l.subCat)<0;})){
    showToast('Sub categories no longer fit','error','Line items use sub categories of '+r.category+'. Edit them in Expense Summary first.');return;}
  const p=expPerson(d.eid);
  if(r.status!=='Draft'&&typeof epGate==='function'){
    const g=epGate({eid:d.eid,name:d.name,category:d.category,currency:d.currency,lines:r.lines,claimId:r.id},d.just);
    if(g){showToast('Policy check failed','error',g);return;}
  }
  /* Administrative edit in approval: every submission check passes first, or nothing is saved. */
  if(r.status==='Awaiting Approval'&&typeof caPreflight==='function'){
    const pre=caPreflight(Object.assign({},r,{employeeEid:d.eid,name:p?p.name:r.name,category:d.category,currency:d.currency,policyJust:d.just||{},dupJust:d.dupJust||'',costCentreId:d.costCentreId||'',projectId:d.projectId||'',bgJust:d.bgJust||''}));
    if(pre.error){showToast('Not saved','error',pre.error);return;}
  }
  Object.assign(r,{title:d.title,claimFor:d.claimFor,employeeEid:d.eid,name:p?p.name:r.name,empId:p?p.empId:r.empId,email:p?p.email:r.email,
    category:d.category,currency:d.currency,appType:d.appType,travelMode:d.travelMode,notes:d.notes,policyJust:Object.assign({},d.just||{}),dupJust:d.dupJust||'',
    costCentreId:d.costCentreId||'',projectId:d.projectId||'',bgJust:d.bgJust||''});
  if(r.status!=='Draft'&&typeof epSnapshot==='function')epSnapshot(r);
  const ae=typeof caAdminEditDone==='function'?caAdminEditDone(r):'';
  expDropEdit();
  renderADTPage();
  showToast('Expense updated','success',expKey(r)+' saved.'+(ae?' '+ae:''));
}

/* ── Edit / add a line item (in Expense Summary) ───────────────────────── */
function expBlankLine(){return {title:'',amount:'',subCat:'',start:'',end:'',proof:'',proofUrl:'',comments:'',cols:{},paidBy:'Employee',merchant:'',invoice:'',advanceId:'',advAmount:'',cardId:'',cardAmount:''};}
/* ADVANCE FUNDING ON A LINE (Build 5). Paid By = Company Advance names the
   issued advance (or imprest fund) the money came from and how much of the
   line it paid; the rest of the line is the employee's own money. The line
   form needs to know whose claim it is: expLineCtx. */
let expLineCtx={eid:'',currency:'INR',category:'',claimId:null,lineId:null};
function expFundPool(){return typeof advFundingSources==='function'?advFundingSources(expLineCtx):[];}
function expLinePaidHook(){expFormHook();}
function expStartLine(lineId){
  const r=expRec(expSelectedId);if(!r)return;
  if(!expCanEditClaim(r)){showToast('Not editable','error',expLockNote(r).replace(/<[^>]+>/g,''));return;}
  const l=lineId==='new'?null:r.lines.find(function(x){return x.id===lineId;});
  expEditBasic=false;expLineEdit=l?l.id:'new';expTab='basic-details';   // the line items are on Basic Details
  expDraft=l?{title:l.title,amount:String(l.amount),subCat:l.subCat,start:l.start,end:l.end,proof:l.proof,proofUrl:l.proofUrl,
    comments:l.comments,cols:Object.assign({},l.cols),paidBy:l.paidBy||'',merchant:l.merchant||'',invoice:l.invoice||'',
    advanceId:l.advanceId||'',advAmount:l.advAmount!=null&&l.advAmount!==''?String(l.advAmount):'',
    cardId:l.cardId||'',cardAmount:l.cardAmount!=null&&l.cardAmount!==''?String(l.cardAmount):''}:expBlankLine();
  expDraftOrig=JSON.stringify(expDraft);
  if(typeof caAdminEditStart==='function')caAdminEditStart(r);
  renderADTPage();
}
function expSyncLine(){
  if(!expDraft)return;
  /* In the + Add popup the item being typed is expDraft.line, not the claim. */
  const t=expDraft.line&&typeof expDraft.line==='object'?expDraft.line:expDraft;
  [['title','exp-l-title'],['amount','exp-l-amt'],['comments','exp-l-desc']].forEach(function(p){const el=document.getElementById(p[1]);if(el)t[p[0]]=el.value.trim();});
  [['start','exp-l-start'],['end','exp-l-end']].forEach(function(p){const el=document.getElementById(p[1]);if(el)t[p[0]]=el.value;});
  if(document.getElementById('csw-exp-l-sub'))t.subCat=getCSValue('exp-l-sub');
  if(document.getElementById('csw-exp-l-paid'))t.paidBy=getCSValue('exp-l-paid');
  [['merchant','exp-l-merch'],['invoice','exp-l-inv']].forEach(function(p){const el=document.getElementById(p[1]);if(el)t[p[0]]=el.value.trim();});
  /* Advance funding: the reference picked by its label, and the advance-funded amount. */
  if(document.getElementById('csw-exp-l-adv')){const pool=expFundPool(),lab=getCSValue('exp-l-adv');const hit=pool.find(function(x){return x.label===lab;});t.advanceId=hit?hit.ref:'';}
  const aa=document.getElementById('exp-l-advamt');if(aa)t.advAmount=aa.value.trim();
  if(t.paidBy!=='Company Advance'){t.advanceId='';t.advAmount='';}
  if(typeof ccExpLineSync==='function')ccExpLineSync(t);
  t.cols=t.cols||{};
  EXP_CUSTOM_COLS.forEach(function(c,i){const el=document.getElementById('exp-l-col-'+i);if(el)t.cols[c]=el.value.trim();});
}
function expPickProof(input){
  const f=input.files&&input.files[0];input.value='';
  if(!f)return;
  if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}
  expSyncLine();if(expModalOpen)expSyncBasic();
  const t=expModalOpen?expDraft.line:expDraft;
  t.proof=f.name;t.proofUrl=URL.createObjectURL(f);
  expRepaintForm();
}
function expClearProof(){
  expSyncLine();if(expModalOpen)expSyncBasic();
  const t=expModalOpen?expDraft.line:expDraft;
  t.proof='';t.proofUrl='';expRepaintForm();
}
/* The line item's fields - used in the panel and in the + Add popup. */
function expLineFieldsHTML(cur,category){
  const d=expDraft;
  const proof=d.proof
    ?'<div class="ax-img-row exp-proof-row">'+EXP_ICO.clip+'<span class="ax-img-name" title="'+attrSafe(d.proof)+'">'+d.proof+'</span>'
      +'<button type="button" class="att-row-btn is-danger" onclick="expClearProof()" title="Remove file">'+AX_ICO.trash+'</button></div>'
    :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="expPickProof(this)">'
      +'<span class="att-zone-ico">'+AX_ICO.upload+'</span>'
      +'<span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · PDF, PNG, JPG (max 5 MB)</span></span></label>';
  const subs=EXP_SUBCATS[category]||[];
  return '<div class="ep-form-group"><label class="ep-form-label" for="exp-l-title">Line Title <span class="req">*</span></label>'
      +'<input class="ep-form-input" id="exp-l-title" value="'+attrSafe(d.title)+'" placeholder="e.g. Flight ticket"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-amt">Amount Spent <span class="req">*</span></label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input" id="exp-l-amt" type="number" min="0" step="0.01" value="'+attrSafe(d.amount)+'" placeholder="0.00" onchange="expPolicyRefresh()"></div></div>'
    +'<div class="ep-form-group'+(subs.length?'':' exp-dim')+'"><label class="ep-form-label">Expense Type <span class="req">*</span></label>'
      +apCS('exp-l-sub',subs,d.subCat,subs.length?'Select Expense Type':'Pick a sub category first')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Start Date <span class="req">*</span></label>'+apCD('exp-l-start',d.start,'dd-mm-yyyy','expPolicyRefresh')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">End Date</label>'+apCD('exp-l-end',d.end,'dd-mm-yyyy')
      +'<div class="ea-hint">Leave empty for a one-day expense.</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Expense Paid By <span class="req">*</span></label>'+apCS('exp-l-paid',typeof ccPaidByOptions==='function'?ccPaidByOptions():typeof CA_PAID_BY!=='undefined'?CA_PAID_BY:['Employee','Company','Company Advance'],d.paidBy||'','Who paid','expLinePaidHook')
      +'<div class="ea-hint">Only what the employee paid is reimbursed. Company-paid is never reimbursed again; what an advance paid settles that advance.</div></div>'
    +expLineFundingHTML(d,cur)+(typeof ccExpLineFieldsHTML==='function'?ccExpLineFieldsHTML(d,cur):'')
    +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-merch">Merchant / Vendor</label><input class="ep-form-input" id="exp-l-merch" value="'+attrSafe(d.merchant||'')+'" placeholder="e.g. IndiGo" onchange="expPolicyRefresh()"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-inv">Invoice / Receipt No.</label><input class="ep-form-input" id="exp-l-inv" value="'+attrSafe(d.invoice||'')+'" placeholder="e.g. INV-20931" onchange="expPolicyRefresh()"></div>'
    +EXP_CUSTOM_COLS.map(function(c,i){
      return '<div class="ep-form-group"><label class="ep-form-label" for="exp-l-col-'+i+'">'+c+'</label>'
        +'<input class="ep-form-input" id="exp-l-col-'+i+'" value="'+attrSafe((d.cols||{})[c]||'')+'" placeholder="'+c+'"></div>';
    }).join('')
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Expense Proof <span class="req">*</span></label>'+proof+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="exp-l-desc">Description</label>'
      +'<textarea class="ep-form-input ax-notes" id="exp-l-desc" placeholder="Anything the approver should know">'+attrSafe(d.comments||'')+'</textarea></div>';
}
/* Company Advance: which issued advance paid, and how much of this line. */
function expLineFundingHTML(d,cur){
  if(d.paidBy!=='Company Advance')return '';
  const pool=expFundPool(),sel=pool.find(function(x){return x.ref===d.advanceId;});
  const amt=parseFloat(d.amount)||0,adv=parseFloat(d.advAmount)||0;
  return '<div class="ep-form-group"><label class="ep-form-label">Advance Reference <span class="req">*</span></label>'
      +axCS('exp-l-adv',pool.map(function(x){return x.label;}),sel?sel.label:'',pool.length?'Search advance':'No issued advance available','expFormHook')
      +'<div class="ea-hint">'+(pool.length?'Issued advances and imprest funds of this employee with money not yet accounted for.':'Only an advance whose funds were verified as issued can pay for an expense.')+'</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-advamt">Advance-Funded Amount <span class="req">*</span></label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input" id="exp-l-advamt" type="number" min="0" step="0.01" value="'+attrSafe(d.advAmount||'')+'" placeholder="0.00" onchange="expFormHook()"></div>'
      +(sel?'<div class="ea-hint">Available on '+sbEsc(sel.key)+': '+sbEsc(sel.availText)+'</div>':'')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employee-Paid Amount</label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input ca-ro" readonly value="'+(amt?expMoney(Math.max(0,Math.round((amt-adv)*100)/100)):'')+'" placeholder="Line amount minus the advance-funded amount"></div></div>';
}
function expLineFormHTML(r,l){
  expLineCtx={eid:r.employeeEid,currency:r.currency,category:r.category,claimId:r.id,lineId:l?l.id:null};
  return '<div class="exp-line is-editing"><div class="exp-line-hd"><div class="exp-line-ttl"><div class="exp-line-name">'
    +(l?'Edit line item':'New line item')+'</div></div></div>'
    +'<div class="ep-form-grid">'+expLineFieldsHTML(r.currency,r.category)+'</div>'
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="expCancelEdit()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="expSaveLine()">'+(l?'Save changes':'Add Line Item')+'</button></div></div>';
}
function expCheckLine(d,category){
  const need=[['title','Line Title'],['amount','Amount Spent'],['subCat','Expense Type'],['start','Start Date'],['paidBy','Expense Paid By'],['proof','Expense Proof']];
  for(let i=0;i<need.length;i++){if(!String(d[need[i][0]]||'').trim()){showToast(need[i][1]+' is required','error');return false;}}
  const n=parseFloat(d.amount);
  if(isNaN(n)||n<=0){showToast('Amount Spent must be more than 0','error');return false;}
  if((EXP_SUBCATS[category]||[]).indexOf(d.subCat)<0){showToast('Pick a sub category of '+category,'error');return false;}
  if(d.end&&d.end<d.start){showToast('Ends before it starts','error','End Date must be on or after the Start Date.');return false;}
  if(d.start>axToday()){showToast('Start Date is in the future','error','Claim an expense once it has been spent.');return false;}
  /* Advance funding: a reference, a positive part no larger than the line or than what the advance still has. */
  if(d.paidBy==='Company Advance'&&typeof advLineCheck==='function'){const fe=advLineCheck(d,expLineCtx);if(fe){showToast('Advance funding','error',fe);return false;}}
  if(d.paidBy==='Corporate Card'){const ce=typeof ccExpLineCheck==='function'?ccExpLineCheck(d,expLineCtx):'Corporate Cards is not available.';if(ce){showToast('Corporate card','error',ce);return false;}}
  return true;
}
/* The funding fields a saved line keeps (with the rate used, when currencies differ). */
function expLineFunding(d){
  const card=typeof ccExpLineCardFields==='function'?ccExpLineCardFields(d):{};
  if(d.paidBy!=='Company Advance')return Object.assign({advanceId:'',advAmount:null,advFx:null},card);
  const a=Math.round((parseFloat(d.advAmount)||0)*100)/100;
  return Object.assign({advanceId:d.advanceId||'',advAmount:a,advFx:typeof advLineFx==='function'?advLineFx(d,expLineCtx):null},card);
}
function expSaveLine(){
  const r=expRec(expSelectedId);if(!r||!expDraft)return;
  expSyncLine();
  const d=expDraft;
  if(!expCheckLine(d,r.category))return;
  const vals=Object.assign({title:d.title,amount:parseFloat(d.amount),subCat:d.subCat,start:d.start,end:d.end||d.start,proof:d.proof,
    proofUrl:d.proofUrl,comments:d.comments,cols:Object.assign({},d.cols),paidBy:d.paidBy,merchant:d.merchant||'',invoice:d.invoice||''},expLineFunding(d));
  if(r.status!=='Draft'&&typeof epGate==='function'){
    const trial=r.lines.filter(function(x){return x.id!==expLineEdit;}).concat([Object.assign({id:0,status:'Pending'},vals)]);
    const g=epGate({eid:r.employeeEid,name:r.name,category:r.category,currency:r.currency,lines:trial,claimId:r.id},r.policyJust);
    if(g){showToast('Policy check failed','error',g);return;}
  }
  if(r.status==='Awaiting Approval'&&typeof caPreflight==='function'){
    const tl=r.lines.filter(function(x){return x.id!==expLineEdit;}).concat([Object.assign({id:expLineEdit==='new'?0:expLineEdit,status:'Pending'},vals)]);
    const pre=caPreflight(Object.assign({},r,{lines:tl}));
    if(pre.error){showToast('Not saved','error',pre.error);return;}
  }
  let msg;
  if(expLineEdit==='new'){
    const id=r.lines.reduce(function(m,x){return Math.max(m,x.id);},0)+1;
    r.lines.push(Object.assign({id:id,status:'Pending',approved:null},vals));
    msg='Line item added';
  }else{
    const l=r.lines.find(function(x){return x.id===expLineEdit;});if(!l)return;
    Object.assign(l,vals);
    msg='Line item updated';
  }
  if(r.status!=='Draft'&&typeof epSnapshot==='function')epSnapshot(r);
  const ae=typeof caAdminEditDone==='function'?caAdminEditDone(r):'';
  expDropEdit();
  renderADTPage();
  showToast(msg,'success','Net amount is now '+expMoney(expTotal(r),r.currency)+'.'+(ae?' '+ae:''));
}

/* The listing and the page tabs are in js/expense-approvals-ui.js. */

/* ── + Add: the claim and its expense items, in one popup ──────────────────
   As the old form: the claim on top, then Expense Items. The item being
   typed is one form; "Add Expense Item" checks it and files it as a card
   above, ready for the next. Submit takes the cards plus whatever is in the
   form, so a one-item claim needs no extra click. */
function startAddExpense(){
  if(page!=='expenses')navigatePage('expenses');
  /* On Approval Settings the + adds a workflow. */
  if(typeof expPageTab!=='undefined'&&expPageTab==='settings'&&typeof awfStartAdd==='function'){awfStartAdd();return;}
  expDropEdit();
  /* Claim For Self: filed by and for the person signed in. */
  if(typeof mcOn==='function'&&!mcOn('expenses'))return;
  if(!caCan('expense.claim.submit')){showToast('Not permitted','error','Filing a claim needs the RBAC right expense.claim.submit.');return;}
  const me=expMyEid();
  /* Without an employee record here, a claim can only be filed for someone else. */
  const self=!!me||!caCan('expense.claim.create.others');
  expDraft={title:'',claimFor:self?'Self':'Others',eid:me,name:idEmpName(me),category:'',currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'',just:{},dupJust:'',costCentreId:'',projectId:'',bgJust:'',
    lines:[],line:expBlankLine()};
  expModalOpen=true;
  renderADTPage();
}
function cancelAddExpense(){expModalOpen=false;expDraft=null;renderADTPage();}
/* The popup keeps the item being typed on expDraft.line; expSyncLine/expLineFieldsHTML
   work on expDraft, so they are pointed at the line while it is read or drawn. */
function expWithLine(fn){
  const claim=expDraft;expDraft=claim.line;
  try{return fn();}finally{claim.line=expDraft;expDraft=claim;}
}
/* Has anything been typed into the item form? An untouched form is not an item. */
function expLineTouched(l){return !!(l.title||l.amount||l.subCat||l.start||l.end||l.proof||l.comments);}
function expAddModalLine(){
  expSyncBasic();expSyncLine();
  const d=expDraft;
  if(!d.category){showToast('Pick the Sub Category first','error','Expense types come from the sub category.');return;}
  if(!expWithLine(function(){return expCheckLine(d.line,d.category);}))return;
  d.lines.push(Object.assign({},d.line,{cols:Object.assign({},d.line.cols)}));
  d.line=expBlankLine();
  expRepaintForm();
}
function expRemoveModalLine(i){expSyncBasic();expSyncLine();expDraft.lines.splice(i,1);expRepaintForm();}
function expModalLinesHTML(d){
  if(!d.lines.length)return '';
  return d.lines.map(function(l,i){
    const fits=(EXP_SUBCATS[d.category]||[]).indexOf(l.subCat)>=0;
    return '<div class="exp-line exp-mline">'
      +'<div class="exp-line-hd"><span class="exp-line-n">'+(i+1)+'</span>'
      +'<div class="exp-line-ttl"><div class="exp-line-name">'+l.title+'</div>'
      +'<div class="exp-line-amt">'+expMoney(l.amount,d.currency)+' · '+l.subCat+' · '+cdLabel(l.start)
        +(l.end&&l.end!==l.start?' – '+cdLabel(l.end):'')+' · paid by '+(l.paidBy||'—')+(l.advanceId&&typeof advRefLabel==='function'?' ('+advRefLabel(l.advanceId)+' '+expMoney(l.advAmount,d.currency)+')':'')
        +(l.paidBy==='Corporate Card'&&typeof ccCard==='function'&&ccCard(l.cardId)?' ('+ccMask(ccCard(l.cardId).last4)+' '+expMoney(l.cardAmount,d.currency)+')':'')+(l.merchant?' · '+l.merchant:'')+(l.proof?' · '+l.proof:'')+'</div>'
      +(fits?'':'<div class="ea-hint exp-cap-over">'+l.subCat+' is not a sub category of '+d.category+' - remove and add again.</div>')
      +'</div>'
      +'<button type="button" class="att-row-btn is-danger" onclick="expRemoveModalLine('+i+')" title="Remove item">'+AX_ICO.trash+'</button>'
      +'</div></div>';
  }).join('');
}
function buildAddExpenseModalHTML(){
  const d=expDraft;
  expLineCtx={eid:d.eid,currency:d.currency,category:d.category,claimId:null,lineId:null};
  const lineFields=expWithLine(function(){return expLineFieldsHTML(d.currency,d.category);});
  const n=d.lines.length;
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Add Expense</span>'
      +'<button class="ct-modal-close" onclick="cancelAddExpense()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">File an expense claim and the items it is made of. The claim&rsquo;s dates and total are read off its items. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="exp-modal-sec">Claim</div>'
    +'<div class="ep-form-grid" id="exp-m-claim">'+expBasicFieldsHTML()+'</div>'
    +'<div id="exp-m-items">'
    +'<div class="exp-modal-sec">Expense Items'+(n?' <span class="ax-count">'+n+'</span>':'')+'</div>'
    +expModalLinesHTML(d)
    +'<div class="exp-line is-editing"><div class="exp-line-hd"><div class="exp-line-ttl"><div class="exp-line-name">'
      +(n?'Item '+(n+1):'Item 1')+'</div></div></div>'
      +'<div class="ep-form-grid">'+lineFields+'</div>'
      +'<div class="exp-mline-add"><button type="button" class="btn-outline btn-sm" onclick="expAddModalLine()">'+AX_ICO.plus+' Add Expense Item</button></div>'
    +'</div></div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddExpense()">Cancel</button>'
      +'<button class="btn-outline" onclick="submitAddExpense(false)">Save as Draft</button>'
      +'<button class="ep-save-btn" onclick="submitAddExpense(true)">Submit for Approval</button>'
    +'</div></div>'
    +'</div></div>';
}
/* REPAINT THE FORM, NOT THE PAGE. A pick in the form (employee, category,
   currency, a proof, an item added) changes what the form shows - the
   capping hint, the sub categories - and nothing else on screen. Repainting
   the whole page for it replayed the page's entrance and dropped the form
   back to its top. So only the named parts of the open form are swapped, and
   every scroll position is put back as it was. */
function formRepaintParts(html,ids){
  const keep=[].filter.call(document.querySelectorAll('.ct-modal--form, .ct-modal-overlay, #adt-content, .page-content'),
    function(e){return e.scrollTop>0;}).map(function(e){return [e,e.scrollTop];});
  const winY=window.scrollY;
  const tmp=document.createElement('div');tmp.innerHTML=html;
  let done=0;
  ids.forEach(function(id){
    const live=document.getElementById(id),next=tmp.querySelector('#'+id);
    if(live&&next){live.innerHTML=next.innerHTML;done++;}
  });
  keep.forEach(function(k){k[0].scrollTop=k[1];});
  if(window.scrollY!==winY)window.scrollTo(0,winY);
  return done===ids.length;
}
/* Amount or date typed into the item: only the policy block needs redrawing. */
function expPolicyRefresh(){
  expSyncBasic();expSyncLine();
  const host=document.getElementById('exp-e-policy');if(!host||!expDraft)return;
  host.innerHTML=expPolicyBlockHTML(expDraft);
  const dh=document.getElementById('exp-e-dup');if(dh)dh.innerHTML=expDupBlockHTML(expDraft);
  const bh=document.getElementById('exp-e-budget');if(bh&&typeof bgExpBudgetHTML==='function')bh.innerHTML=bgExpBudgetHTML(expDraft);
}
function expRepaintForm(){
  if(expModalOpen&&formRepaintParts(buildAddExpenseModalHTML(),['exp-m-claim','exp-m-items']))return;
  renderADTPage();
}
/* The popup's own repaints (employee, category, proof) read both halves first. */
const _expSyncLineInner=expSyncLine;
expSyncLine=function(){
  if(expModalOpen&&expDraft&&expDraft.line)return expWithLine(_expSyncLineInner);
  return _expSyncLineInner();
};
function submitAddExpense(submit){
  expSyncBasic();expSyncLine();
  const d=expDraft;
  if(!expCheckBasic(d))return;
  if(!expCheckClaimFor(d))return;
  const items=d.lines.slice();
  /* The form counts as an item when something is typed in it, or when it is the only one. */
  if(expLineTouched(d.line)||!items.length){
    if(!expWithLine(function(){return expCheckLine(d.line,d.category);}))return;
    items.push(d.line);
  }
  const bad=items.find(function(l){return (EXP_SUBCATS[d.category]||[]).indexOf(l.subCat)<0;});
  if(bad){showToast('Sub categories no longer fit','error','"'+bad.title+'" uses '+bad.subCat+', which is not a sub category of '+d.category+'.');return;}
  /* Policy gate: a Blocking breach or a missing justification stops a submission, never a draft. */
  if(submit&&typeof epGate==='function'){
    const g=epGate({eid:d.eid,name:d.name,category:d.category,currency:d.currency,lines:items,claimId:null},d.just);
    if(g){showToast('Policy check failed','error',g);return;}
  }
  const p=expPerson(d.eid);
  const s=stampNow();
  const r={id:expNextId++,key:expNextKey++,title:d.title,claimFor:d.claimFor,employeeEid:d.eid,name:p?p.name:'',empId:p?p.empId:'',email:p?p.email:'',
    category:d.category,currency:d.currency,appType:d.appType,travelMode:d.travelMode,notes:d.notes,
    status:'Draft',appliedOn:axToday(),reimbursedOn:'',createdBy:caMe(),createdAt:axStamp(),
    policyJust:Object.assign({},d.just||{}),dupJust:d.dupJust||'',migrated:true,entity:typeof caEntity==='function'?caEntity():'',
    costCentreId:d.costCentreId||'',projectId:d.projectId||'',bgJust:d.bgJust||'',
    lines:items.map(function(l,i){return Object.assign({id:i+1,title:l.title,amount:parseFloat(l.amount),subCat:l.subCat,start:l.start,end:l.end||l.start,
      proof:l.proof,proofUrl:l.proofUrl,comments:l.comments,cols:Object.assign({},l.cols),status:'Pending',approved:null,
      paidBy:l.paidBy||'',merchant:l.merchant||'',invoice:l.invoice||'',advanceId:l.paidBy==='Company Advance'?l.advanceId||'':'',
      advAmount:l.paidBy==='Company Advance'?Math.round((parseFloat(l.advAmount)||0)*100)/100:null,
      advFx:l.paidBy==='Company Advance'&&typeof advLineFx==='function'?advLineFx(l,{eid:d.eid,currency:d.currency}):null},typeof ccExpLineCardFields==='function'?ccExpLineCardFields(l):{});})};
  /* Submission: every check, a resolved route and approvers - or nothing is
     created and the popup stays open (js/expense-approvals.js caPreflight). */
  let pre=null;
  if(submit&&typeof caPreflight==='function'){
    pre=caPreflight(r);
    if(pre.error){expNextId--;expNextKey--;showToast('Cannot submit','error',pre.error);return;}
  }
  const nItems=r.lines.length+' line item'+(r.lines.length===1?'':'s');
  r.logs=[{date:s.date,time:s.time,user:idName(r.createdBy),userId:r.createdBy,status:'Draft',
    action:submit?'Expense drafted with '+nItems+'.':'Saved as draft with '+nItems+'.'}];
  expensesData.unshift(r);
  if(submit&&pre)caStart(r,pre);
  lpLanded('expenses',r.id);
  expModalOpen=false;expDraft=null;
  renderADTPage();
  const st0=typeof caActiveStage==='function'?caActiveStage(r):null;
  showToast(submit?'Expense submitted':'Draft saved','success',expKey(r)+' · '+expMoney(expTotal(r),r.currency)+(submit?' is awaiting approval'+(st0?' - Stage 1 with '+(st0.approvers.join(', ')||'nobody'):'')+'.':''));
}

/* ── Wiring ────────────────────────────────────────────────────────────── */
Object.assign(supportPageMeta,{'expenses':{title:'Expenses',context:'Expenses',filters:[],columns:[],rows:[]}});
if(typeof LP_ROW_PREFIX!=='undefined')LP_ROW_PREFIX['expenses']='exp';
/* Awaiting Approval: someone owes a decision. Reimbursed: paid, done. */
Object.assign(SB_STATUS_TONE,{'awaiting-approval':'wait',reimbursed:'ok'});
sbDraftReg('exp',{
  dirty:function(){
    if(!expEditing()||expModalOpen)return false;
    if(expEditBasic)expSyncBasic();else expSyncLine();
    return JSON.stringify(expDraft)!==expDraftOrig;
  },
  drop:expDropEdit});
