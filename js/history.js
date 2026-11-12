/* ==========================================================================
   HISTORY TAB  -  field-level change history for every action sidebar.

   Logs say what HAPPENED to a record ("moved to Active, because..."). History
   says what CHANGED in it, field by field: who, when, which field, the value
   before and the value after.

   HOW CHANGES ARE CAUGHT. Rather than teach every save function to report
   what it changed, this file wraps them. Each wrapped save snapshots the
   record's plain fields before it runs and again once it has finished - a
   microtask later, so a save that keeps writing after its log is committed
   (an asset's holder after its status) is caught whole - and every field
   whose value differs becomes one history row. The wrapped saves are the
   panel edit forms, every module's status-from-Logs commit (lpCommitLog,
   which they all go through) and the employee lifecycle's.

   History is held against the record OBJECT (a WeakMap), so it needs no key
   per module and goes when the record does. Loaded last: it wraps functions
   the other files define.
   ========================================================================== */
(function(){
'use strict';

const HIST=new WeakMap();      // record -> [{by,time,field,old,val}], newest first
/* Not fields a person edits: collections, generated text, and stamps that
   every save moves anyway. */
/* ...and the internal IDs that sit beside a name people read (js/identity.js). */
const SKIP={eid:1,userId:1,createdById:1,submittedById:1,approvedById:1,rejectedById:1,generatedById:1,byId:1,idMigrated:1,
  logs:1,history:1,workflow:1,attachments:1,reqDocs:1,membersList:1,image:1,imageName:1,updatedAt:1,
  lastUpdated:1,updatedBy:1,annId:1,from:1,id:1,keyId:1,commercial:1,emp:1,sales:1,notified:1,details:1};
const LABELS={employeeEid:'Employee',managerEid:'Reporting Manager',entityId:'Entity',empId:'Employee ID',dept:'Department',joinDate:'Joining Date',desc:'Description',contact:'Contact Number',
  countryOfOp:'Country of Operation',empType:'Employment Type',empName:'Name',dob:'Date of Birth',jobDesc:'Job Description',
  workPermit:'Work Permit',payAmount:'Pay Amount',payFrequency:'Pay Frequency',workSchedule:'Work Schedule',empDuration:'Employment Duration',
  assignedTo:'Assigned To',assignedOn:'Assigned On',branch:'Branch / Location',code:'Asset ID / Code',serial:'Barcode / Serial Number',
  purchaseDate:'Purchase Date',warrantyStart:'Warranty Start Date',warrantyEnd:'Warranty End Date',cost:'Purchase Cost',
  empConfirm:'Employee Confirmation',accessType:'Access Type',login:'Work Email / Login ID',provisionedBy:'Provisioned By',
  mfa:'MFA Enabled',effective:'Effective Date',expiry:'Expiry / Review Date',revokedOn:'Revoked On',
  teamId:'Team ID',item:'Requirement',model:'Employment Model',payrollBlocking:'Payroll Blocking',evidenceRequired:'Evidence Required',
  ruleName:'Rule Name',applicableTo:'Applicable To',valueRate:'Value / Rate',templateName:'Template Name',employmentType:'Employment Type',
  templateId:'Template ID',orderId:'Order ID',entityName:'Entity Name',addedFrom:'Added From',courseId:'Course ID',courseName:'Course Name',
  startFrom:'Start From',endTo:'End To',workingCountry:'Working Country',orderCategory:'Order Category',invoiceStatus:'Invoice Status',
  orderStatus:'Order Status',amountDue:'Amount Due',yearly:'Yearly Count',monthly:'Monthly Limit',carryForward:'Carry Forward Limit',
  probation:'During Probation',prorate:'Prorate',recurring:'Repeats Every Year',branches:'Applies To',dailyHours:'Daily Work Hours',
  latePolicy:'Late Policy',shiftType:'Shift Type',overtimeAllowed:'Overtime Allowed',otCapRule:'Work Hours Capping Rule',geolocation:'Geolocation',startTime:'Start Time',
  endTime:'End Time',workingDays:'Working Days',weekOffDays:'Week Off Days',allocationFrequency:'Allocation Frequency',
  approvalLevel:'Leave Approval Level',level1Approver:'Level 1 Approver',level2Approver:'Level 2 Approver',
  countWeeklyOff:'Count Weekly Off as Leave',countHoliday:'Count Holiday as Leave',periodFrom:'Leave Period From',periodTo:'Leave Period To',
  validFrom:'Valid From',validTo:'Valid To',depts:'Departments',branches:'Branches',types:'Employment Types',roles:'Roles',pinned:'Pin Announcement'};
function human(k){
  if(LABELS[k])return LABELS[k];
  return String(k).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,function(c){return c.toUpperCase();});
}
/* A record's plain fields: text, numbers, yes/no, and lists of those. */
function snap(rec){
  const out={};
  if(!rec||typeof rec!=='object')return out;
  Object.keys(rec).forEach(function(k){
    if(SKIP[k]||k.charAt(0)==='_')return;
    const v=rec[k];
    if(v===null||v===undefined||typeof v==='string'||typeof v==='number'||typeof v==='boolean')out[k]=v;
    else if(Array.isArray(v)&&v.every(function(x){return x===null||typeof x!=='object';}))out[k]=v.join(', ');
  });
  return out;
}
/* A stored User / Employee ID reads as the person's name. */
function named(v){
  if(typeof v!=='string'||typeof idName!=='function')return v;
  return v.replace(/\bU-\d{4,}\b/g,function(m){return idName(m);}).replace(/\bE-\d{4,}\b/g,function(m){return idEmpName(m)||m;});
}
function show(v){
  v=named(v);
  if(v===true)return 'Yes';
  if(v===false)return 'No';
  if(v===null||v===undefined||v===''||v==='--')return '';
  // A stored yyyy-mm-dd reads the way the app writes dates (8 Oct 2026).
  if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&typeof cdLabel==='function')return cdLabel(v)||v;
  // A stored yyyy-mm-ddThh:mm (Announcements' validity) reads as date and time.
  if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)&&typeof anmFmt==='function')return anmFmt(v);
  return String(v);
}
function stamp(){const s=stampNow();return s.date+', '+s.time;}
/* Approval defaults: the escalation authority by name. */
window.histCfgState=function(c){return {'Approval SLA (calendar days)':c.sla,'Escalation authority':c.escalation?named(c.escalation):'Entity Super Admin'};};
function record(rec,before,after,labels){
  const rows=[],keys={};
  Object.keys(before).concat(Object.keys(after)).forEach(function(k){keys[k]=1;});
  Object.keys(keys).forEach(function(k){
    const a=show(before[k]),b=show(after[k]);
    if(a===b)return;
    rows.push({by:CURRENT_USER,time:stamp(),field:(labels&&labels[k])||human(k),old:a,val:b});
  });
  if(!rows.length)return;
  const list=HIST.get(rec)||[];
  HIST.set(rec,rows.concat(list));
}

/* Wrap a global save: rec(args) is the record it works on, read BEFORE it
   runs (a save may clear its own selection). opt.state(rec) reads the
   fields from somewhere else (settings kept in a draft); opt.labels(rec,args)
   names fields the record itself cannot (a listing row's columns). */
let HIST_DEPTH=0;
function watch(name,getRec,opt){
  opt=opt||{};
  const orig=window[name];if(typeof orig!=='function')return;
  window[name]=function(){
    /* A watched save that calls another watched save (Logs → approval engine)
       is one action: only the outermost call writes History. */
    if(HIST_DEPTH>0)return orig.apply(this,arguments);
    const args=arguments;let rec=null,before=null,labels=null;
    try{rec=getRec.apply(null,args);
      if(rec&&typeof rec==='object'){
        seed(rec);     // the creation row first, while the record still has its old values
        before=snap(opt.state?opt.state(rec):rec);labels=opt.labels?opt.labels(rec,args):null;}}catch(e){rec=null;}
    let out;HIST_DEPTH++;
    try{out=orig.apply(this,args);}finally{HIST_DEPTH--;}
    if(before)Promise.resolve().then(function(){
      try{record(rec,before,snap(opt.state?opt.state(rec):rec),labels);}catch(e){}
    });
    return out;
  };
}

/* The company panel's record is the entity row; its fields live in the
   Attendance / Leave settings drafts. One stable object per entity holds
   its history. */
const CS_RECS={};
window.csHistRec=function(id){return CS_RECS[id]||(CS_RECS[id]={id:id});};

/* The oldest row: the record being created, where the record knows when and
   by whom. Added once, the first time the tab is opened. */
function seed(rec){
  if(HIST.has(rec))return;
  const by=named(rec.createdBy)||rec.createdByName,at=rec.createdAt||rec.createdTime;
  HIST.set(rec,by&&at?[{by:by,time:String(at).replace(' | ',', '),field:rec.status?'Status':'Record',old:'',val:rec.status||'Created'}]:[]);
}
const dash='<span class="sb-dash">&mdash;</span>';
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function cell(v,cls){return '<td'+(cls?' class="'+cls+'"':'')+(v?' title="'+esc(v)+'"':'')+'>'+(v?esc(v):dash)+'</td>';}

/* The History tab: the same table the Assets panel uses for its assignment
   history, one row per changed field, newest first. */
window.sbHistoryHTML=function(rec){
  if(!rec||typeof rec!=='object')return '<div class="lp-wf-empty">No history for this record.</div>';
  seed(rec);
  const rows=HIST.get(rec)||[];
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Change History</span>'
    +'<span class="ax-count">'+rows.length+' change'+(rows.length===1?'':'s')+'</span></div>';
  if(!rows.length)return head+'<div class="lp-wf-empty">No field has changed yet. Every edit to this record is listed here, field by field.</div>';
  return head+'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr>'
    +'<th>S. No</th><th>Update By</th><th>Update Time</th><th>Field Name</th><th>Old Value</th><th>New Value</th></tr></thead><tbody>'
    +rows.map(function(r,i){
      return '<tr><td class="sb-hist-n">'+(i+1)+'</td>'+cell(r.by)+cell(r.time,'sb-hist-time')+'<td><b>'+esc(r.field)+'</b></td>'
        +cell(r.old,'sb-hist-old')+cell(r.val,'sb-hist-new')+'</tr>';
    }).join('')+'</tbody></table></div>';
};

// ── What is watched ──
watch('saveDeEdit',function(){return directEmpData.find(function(e){return e.id===deSelectedId;});});
watch('saveGeEdit',function(){return globalEmpData.find(function(e){return e.id===geSelectedId;});});
/* FR-EMS-EMP-01: My Profile → Edit Profile, and HR's decision on an employee's correction. */
watch('empProfSave',function(){return typeof epSelfRec==='function'?epSelfRec():null;});
watch('epReview',function(eid){return typeof idEmp==='function'?idEmp(eid):null;});
// The shared panel edit form (Teams, Payments, Contracts, Compliance, Rates & Rules, Templates, generic rows).
watch('sbSaveEdit',function(key){
  if(!sbEditing||sbEditing.key!==key)return null;
  return SB_EDITORS[key].get(sbEditing.id);
},{labels:function(rec){
  const key=sbEditing&&sbEditing.key;if(!key)return null;
  const out={};sbEditFields(key,rec).forEach(function(f){out[f.k]=f.label;});return out;
}});
watch('anmSubmit',function(){return anmEditId?anmRec(anmEditId):null;});
watch('saveHdEdit',function(){return holidaysData.find(function(h){return h.id===hdSelectedId;});});
watch('saveLPSidebarEdit',function(){return leavePoliciesData.find(function(p){return p.id===lpSidebarPolicyId;});});
watch('submitAddAsset',function(){return astEditId?assetsData.find(function(a){return a.id===astEditId;}):null;});
watch('submitAddItAccess',function(){return itaEditId?itAccessData.find(function(r){return r.id===itaEditId;}):null;});
watch('expSaveEdit',function(){return expEditBasic?expRec(expSelectedId):null;});
watch('expSaveLine',function(){return expLineEdit!=null?expRec(expSelectedId):null;},{state:function(r){
  const o={};
  r.lines.forEach(function(l,i){[['title','Title'],['amount','Amount Spent'],['subCat','Sub Category'],['start','Start Date'],
    ['end','End Date'],['proof','Expense Proof'],['comments','Description']].forEach(function(k){o['Line '+(i+1)+' · '+k[1]]=l[k[0]];});});
  return o;
}});
watch('capSaveEdit',function(){return capEditing?capRec(capSelectedId):null;},{labels:function(){return {level:'Applies To',dept:'Department',amount:'Amount Limit',desc:'Description',employee:'Employee',subCat:'Sub Category',reason:'Exception Reason',effTo:'Effective To'};}});
watch('capSubmitVersion',function(id){return capRec(id);},{state:function(r){return {'Versions':r.versions.map(function(v){return 'v'+v.v+' '+v.amount+' '+v.period+' '+v.enforcement+' '+v.effFrom+' to '+(v.effTo||'open');}).join(' | ')};}});
watch('epRateSave',function(){return csHistRec(csSelectedItem);},{state:function(){const o={};epRates.forEach(function(r){o[r.from+'→'+r.to+' from '+r.effFrom]=r.rate;});return o;}});
(function(){
  const st=function(r){const s=typeof caActiveStage==='function'?caActiveStage(r):null;
    return {Status:r.status,'Current Stage':s?'Stage '+s.n+' '+s.name:'','Approver':s?s.approvers.join(', '):'','Approved Amount':typeof caApprovedTotal==='function'?caApprovedTotal(r):'',
      'Reimbursement':r.pay?r.pay.status:'','Settled':r.pay?r.pay.settled:'','Payment Route':r.pay?r.pay.route:'',
      'Status Correction':r.statusCorrection?r.statusCorrection.from+' → '+r.statusCorrection.to+': '+r.statusCorrection.reason:''};};
  ['caDecide','caResubmit','caWithdraw','caReassign','caPaySetRoute','caPaySettle','caPayHold','caPayResume','caPayFail','caPayCancel','caPayVerify','caAssignWorkflow']
    .forEach(function(fn){watch(fn,function(id){return caRec(id);},{state:st});});
  watch('awfSave',function(){return awfModal&&awfModal.id!=null?caWfRec(awfModal.id):null;},{state:function(w){return {Name:w.name,'Applies To':w.appliesTo+' '+caWfScope(w),Category:w.category,'Amount Threshold':caWfBand(w),Stages:caStagePath(w.stages),Version:'v'+w.version,'Effective':w.effFrom+' to '+(w.effTo||'open')};}});
  watch('awfSaveLog',function(id){return caWfRec(id);},{state:function(w){return {Status:w.status};}});
})();
/* Advances & Imprest (js/advances.js): what each action changes on the record. */
(function(){
  if(typeof advBal!=='function')return;
  const money=function(h,n){return expMoney(n,h.currency);};
  const st=function(h){
    const b=advBal(h),o={Status:h.status};
    if(h.kind!=='fund'){const s=caActiveStage(h);o['Current Stage']=s?'Stage '+s.n+' '+s.name:'';o['Approved Amount']=h.lines?money(h,caApprovedTotal(h)):'';o['Disbursement']=advDisbStatus(h);}
    if(h.kind!=='imprest'){o['Issued']=money(h,b.issued);o['Accepted Expenses']=money(h,b.accepted);o['Returned']=money(h,b.returns);o['Recovered']=money(h,b.recoveries);
      o['Accountable']=money(h,b.accountable);o['Recovery Due']=money(h,b.recoveryDue);o['Settlement']=h.closed?'Closed':advSettleStatus(h);
      (h.returns||[]).filter(function(x){return x.type==='Recovery';}).forEach(function(x){o['Recovery '+x.key]=x.status+' · '+money(h,x.amount)+(x.collections&&x.collections.length?' · collected '+money(h,advRecCollected(x)):'');});}
    if(h.dueOn)o['Settlement Due']=h.dueOn;
    if(h.kind==='fund'){o['Custodian']=idEmpName(h.custodianEid);}
    return o;
  };
  ['advSubmit','advCancelAuth','advDisbInitiate','advDisbVerify','advDisbFail','advDisbReverse'].forEach(function(fn){watch(fn,function(id){return advEngineRec(id);},{state:st});});
  ['advRrCreate','advRrVerify','advRrFail','advRrReverse','advRecoveryRaise','advRecoveryDecide','advRecoveryCollect','advRecoveryCancel','advRecoveryReverse',
    'advReview','advExtendDue','advClose','impFundSet','impTransfer'].forEach(function(fn){watch(fn,function(id){return advHolder(id);},{state:st});});
  watch('advUpdate',function(id){return advRec(id);},{state:function(r){return {Title:r.title,'Advance Type':r.category,'Requested Amount':money(r,caTotal(r)),Currency:r.currency,
    'Business Purpose':r.purpose,'Required By':r.requiredBy,'Expense Period':(r.periodFrom||'')+(r.periodTo?' to '+r.periodTo:''),'Cost Centre':typeof advDimText==='function'?advDimText(r,'cc'):r.costCenter,Project:typeof advDimText==='function'?advDimText(r,'project'):r.project,'Supporting Document':r.proof,Notes:r.notes,Justification:r.just};}});
  watch('advTypeSave',function(d){return d&&d.id!=null?advType(d.id):null;},{state:function(t){return {Name:t.name,Model:t.model,'Expense Categories':t.cats.join(', '),'Approval Workflow':(caWfRec(t.workflowId)||{}).name||'',
    'Settlement Days':t.settleDays,'Replenishment':t.replenish?'Yes':'No',Description:t.desc};}});
  watch('advTypeToggle',function(id){return advType(id);},{state:function(t){return {Status:t.status};}});
  const pst=function(p){return {Name:p.name,'Applies To':p.appliesTo+' '+advPolScope(p),Currency:p.currency,Minimum:p.minAmt,Maximum:p.maxAmt,'Max Open':p.maxOpen,'Max Outstanding':p.maxOutstanding,
    'Max Settlement Days':p.maxSettleDays,Restriction:p.restriction,'Partial Approval':p.partialApproval?'Yes':'No','Partial Disbursement':p.partialDisbursement?'Yes':'No',
    'Document Required':p.requireDoc?'Yes':'No',Effective:p.effFrom+' to '+(p.effTo||'open'),'Exception Reason':p.reason,Status:p.status};};
  watch('advPolicySave',function(d){return d&&d.id!=null?advPolicies.find(function(p){return p.id===d.id;}):null;},{state:pst});
  watch('advPolicyActivate',function(id){return advPolicies.find(function(p){return p.id===id;});},{state:pst});
  watch('advCfgSave',function(){return csHistRec('advances-'+advEnt());},{state:function(){const c=advCfg();return {'Maker-Checker':c.makerChecker.on?'On':'Off',
    'Maker-Checker Types':c.makerChecker.typeIds.map(function(i){return (advType(i)||{}).name||i;}).join(', '),'Maker-Checker From':c.makerChecker.threshold,
    'EOR / Global Eligible':c.eorEligible?'Yes':'No','Reminder Days':c.reminderDays,'Methods':advMethods().join(', '),
    'Entity-wide Outstanding Limit':c.exposure&&c.exposure.amount?expMoney(c.exposure.amount,c.exposure.currency)+' ('+c.exposure.enforcement+')':'None'};}});
})();
/* Funding & Budgets (js/budgets.js): budgets, changes, funding sources and entries, settings, masters. */
(function(){
  if(typeof bgRec!=='function')return;
  const bst=function(b){
    const o={Status:b.status,'Budget Name':b.title,'Financial Year':b.fy,'Budget Type':b.budgetType,'Budget Owner':caN(b.ownerUid),'Total Budget':expMoney(b.amount,b.currency),
      Enforcement:b.enforcement,'Warning Threshold':b.threshold,Effective:b.effFrom+' to '+(b.effTo||b.fyEnd),Quarters:b.quarterly&&b.quarters?b.quarters.join(' / '):'Not phased',Version:b.version?'v'+b.version:''};
    b.allocations.forEach(function(a){o['Allocation '+a.key]=bgScopeLabel(a)+' · '+expMoney(a.amount,b.currency)+(a.parentId?' under '+bgAllocKey(bgAlloc(a.parentId)):'')+(a.ownerUid?' · owner '+caN(a.ownerUid):'');});
    return o;
  };
  const cst=function(c){const o={Status:c.status,Requested:expMoney(caTotal(c),c.currency)};
    if(c.kind==='budget exception'){o['Approved Authority']=c.approvedLimit?expMoney(c.approvedLimit,c.currency):'';o.Used=expMoney(bgExcUsed(c),c.currency);o.State=bgExcState(c);}
    if(c.appliedAt)o.Applied=c.appliedAt;return o;};
  const rst=function(r){return r&&r.kind==='budget'?bst(r):cst(r);};
  watch('bgBudgetSave',function(d){return d&&d.id!=null?bgRec(d.id):null;},{state:bst});
  ['bgAllocSave','bgAllocDelete','bgSubmit','bgActivate','bgDeactivate','bgChangeCancel'].forEach(function(fn){watch(fn,function(id){return bgRec(Number(id))||bgChg(Number(id));},{state:rst});});
  const sst=function(s){return {Name:s.name,Type:s.type,Currency:s.currency,Bank:s.bank,'Account Reference':s.maskedRef,Code:s.code,'Finance Owner':caN(s.ownerUid),'Balance Rule':s.enforcement,
    Effective:(s.effFrom||'')+(s.effTo?' to '+s.effTo:''),Status:s.status};};
  watch('fbSourceSave',function(d){return d&&d.id!=null?fbSource(d.id):null;},{state:sst});
  watch('fbSourceSetStatus',function(id){return fbSource(id);},{state:sst});
  ['fbTxnSubmit','fbTxnVerify','fbTxnReject','fbTxnReverse'].forEach(function(fn){watch(fn,function(id){return fbTxn(id);},{state:function(t){
    return {Status:t.status,'Verified By':t.verifiedBy?caN(t.verifiedBy):'',Evidence:t.evidence,'Reversed By':t.reversedBy||'',Reversal:(fbTxns.find(function(x){return x.reversalOf===t.id;})||{}).key||''};}});});
  watch('bgCfgSave',function(){return csHistRec('budgets-'+bgEnt());},{state:function(){const c=bgCfg();return {'Budget Control':c.control?'On':'Off','Default Enforcement':c.enforcement,
    'No Matching Budget':c.noMatch,'Financial Year Starts':c.fyStartMonth,'Quarter Carry-Forward':c.quarterCarry?'On':'Off','Separate Activation':c.separateActivation?'On':'Off',
    'Funding-Source Tracking':c.fundingTracking?'On':'Off','Funding Maker-Checker':c.fundingMakerChecker?'On':'Off','Evidence to Verify Funding':c.fundingEvidence?'On':'Off','Year-End Reminder Days':c.nearEndDays,
    'Budget Types':c.budgetTypes.join(', ')};}});
  watch('bgTypeAdd',function(){return csHistRec('budgets-'+bgEnt());},{state:function(){return {'Budget Types':bgCfg().budgetTypes.join(', ')};}});
  const mst=function(){const o={};['cc','project'].forEach(function(k){bgmList(k).forEach(function(x){o[bgmNoun(k)+' '+x.code]=x.name+' ('+x.status+')';});});return o;};
  ['bgmSave','bgmSetStatus','bgmMapFreeText'].forEach(function(fn){watch(fn,function(){return csHistRec(csSelectedItem);},{state:mst});});
  watch('entSetBaseCurrency',function(){return csHistRec(csSelectedItem);},{state:function(){return {'Base Currency':bgBaseCurrency(bgEnt())};}});
})();
watch('expSaveLog',function(id){return expRec(id);},{state:function(r){const s=typeof caActiveStage==='function'?caActiveStage(r):null;const o={Status:r.status,'Current Stage':s?'Stage '+s.n+' '+s.name:'','Approver':s?s.approvers.join(', '):''};(r.policyEval?r.policyEval.results:[]).forEach(function(x){o['Policy '+x.key]=x.result;});return o;}});
watch('csStructSave',function(){return csHistRec(csSelectedItem);},{state:function(){const o={};['department','designation'].forEach(function(k){csStructList(k).forEach(function(x){o[k+' '+x.code]=x.name+' ('+x.status+')';});});return o;}});
watch('csStructToggle',function(){return csHistRec(csSelectedItem);},{state:function(){const o={};['department','designation'].forEach(function(k){csStructList(k).forEach(function(x){o[k+' '+x.code]=x.name+' ('+x.status+')';});});return o;}});
watch('caCfgSave',function(){return caCfg();},{state:window.histCfgState});
watch('caPayrollToggle',function(){return csHistRec(csSelectedItem);},{state:function(){return {'Include Approved Expenses in Payroll':caPayrollOn()?'Yes':'No'};}});
watch('rbSaveEdit',function(){return rbEditing?rbRec(rbSelectedId):null;},{state:function(t){
  return {'Template Name':t.name,'Module':t.module,'Description':t.desc,'Permissions':t.perms.length+' ('+t.perms.join(', ')+')'};
}});
watch('wsSaveEdit',function(){return wsEditing?wsRec(wsSelectedId):null;},{labels:function(){return {name:'Workspace Name',module:'Module',email:'Contact Email',desc:'Description'};}});
watch('astConfirmReceipt',function(id){return assetsData.find(function(a){return a.id===id;});});
// Every module's status move from Logs goes through lpCommitLog(rec, ...); its
// after-snapshot waits for the rest of that save (an asset's holder, say).
watch('lpCommitLog',function(rec){return rec;},{labels:function(rec){
  if(!Array.isArray(rec)||typeof lstSelectedPg==='undefined')return null;
  const out={};(getPageMeta(lstSelectedPg).columns||[]).forEach(function(c,i){out[i]=c;});return out;
}});
watch('empCommitLog',function(pk){return empPkRec(pk);});
// Company settings: the tabs keep their values in drafts; history goes on the entity.
watch('csAttSave',function(){return csHistRec(csSelectedItem);},{state:function(){return csAtt;}});
watch('cslSave',function(){return csHistRec(csSelectedItem);},{state:function(){return csLeave;}});
// Wallet & Benefits: panel edits, every status move, policy versions and batch changes.
watch('wbSaveEdit',function(){return wbEdit?wbRec(wbEdit.kind,wbEdit.id):null;});
// ONC card enrollment: history goes on the employee record, as the ONC fields plus the switches.
const oncState=function(emp){const r=typeof oncRec==='function'?oncRec(emp.empId):null;if(!r)return {};
  return Object.assign({'ONC enrolled':r.enroll?'Yes':'No','Benefits eligible':r.benefitsEligible===false?'No':'Yes','ONC status':oncStatus(emp,r)},r.fields||{});};
watch('oncSaveEdit',function(){return oncEdit?oncEmpOf(oncEdit.empId):null;},{state:oncState});
watch('oncReview',function(empId){return oncEmpOf(empId);},{state:oncState});
watch('oncToggle',function(empId){return oncEmpOf(empId);},{state:oncState});
watch('oncAccept',function(empId){return oncEmpOf(empId);},{state:function(emp){const r=oncRec(emp.empId)||{};return {'Declarations accepted':r.decls&&r.decls.declConsent?'Yes':'No'};}});
// Corporate Cards (7B/7C): card records and card requests, field by field.
if(typeof ccCard==='function'){
  const ccCardSt=function(c){return {Status:c.status,'Confirmation Source':c.source,'Card Number':ccMask(c.last4),'Provider Card Reference':c.providerRef||'','Issue Date':c.issueDate||'',
    Delivery:c.delivery?c.delivery.status:'','Hold':c.hold&&c.hold.active?c.hold.type+' - '+c.hold.reason:'None','Pending Request':c.pending?c.pending.action+' - '+c.pending.reason:'None',
    'Replaced By':c.replacedBy?expKey(ccCard(c.replacedBy)):''};};
  const ccReqSt=function(r){const o={Status:ccReqTrack(r),'Card Programme':(ccProg(r.programmeId)||{}).name||'','Card Type':r.cardType,Reason:r.reason,'Business Purpose':r.purpose||'',
    Delivery:r.delivery?r.delivery.mode+(r.delivery.text?' - '+r.delivery.text:''):''};
    if(r.enr){o.Enrollment=r.enr.status;o.KYC=r.enr.kyc;o.Activation=r.enr.activation;if(r.enr.deliveryRequired)o['Dispatch Status']=r.enr.delivery;o['Confirmation Source']=r.enr.source;}return o;};
  const ccAnySt=function(x){return x.kind==='card'?ccCardSt(x):ccReqSt(x);};
  ['ccCardRequest','ccCardCancelPending','ccHoldPlace','ccHoldRelease','ccReportLost','ccActivationRemind'].forEach(function(fn){watch(fn,function(id){return ccCard(id);},{state:ccCardSt});});
  ['ccReqUpdate','ccEnrSubmit','ccEnrCancel'].forEach(function(fn){watch(fn,function(id){return ccReq(id);},{state:ccReqSt});});
  watch('ccOutcomeRecord',function(type,id){return type==='kyc'?ccReq(id):ccCard(id);},{state:ccAnySt});
  if(typeof ccCtlPropose==='function')watch('ccCtlPropose',function(d){return d&&d.scope==='programme'?ccProg(d.targetId):(d?ccCard(d.targetId):null);},{state:function(x){
    const p=x.kind==='card'?ccProg(x.programmeId):x,s=x.kind==='card'?ccCardCtl(x):ccProgCtl(x),v=ccCtlPendingOf(x.kind==='card'?'card':'programme',x.id);
    return {'Card Controls':s?ccCtlSummary(s,p.currency):'Not set','Pending Relaxation':v?expKey(v)+' - '+v.relax.join('; '):'None'};}});
  ['ccOutcomeVerify','ccOutcomeReject'].forEach(function(fn){watch(fn,function(id){const o=ccOutcome(id);return o?(o.cardId?ccCard(o.cardId):ccReq(o.reqId)):null;},{state:ccAnySt});});
}
// Corporate Cards 7E: card loads (approval and execution apart) and bulk files.
if(typeof ccLoad==='function'){
  const ccLoadSt=function(l){const ex=l.exec;return {Status:ccLoadLabel(l),Wallet:wbTypeName(l.wallet),Amount:expMoney(l.amount,l.currency),'Funding Source':l.sourceId?(fbSource(l.sourceId)||{}).key||'':'None',
    Recorded:ex?expMoney(ex.recorded,l.currency):'',Reversed:ex&&ex.reversed?expMoney(ex.reversed,l.currency):'','Execution Records':ccLoadExecsOf(l).map(function(e){return expKey(e)+' '+e.status;}).join(', '),
    Reason:l.reason};};
  ['ccLoadUpdate','ccLoadSubmit','ccLoadMarkProcessing','ccLoadExecRecord','ccLoadCancel','ccLoadRetry','ccLoadReverse'].forEach(function(fn){watch(fn,function(id){return ccLoad(id);},{state:ccLoadSt});});
  ['ccLoadExecVerify','ccLoadExecReject'].forEach(function(fn){watch(fn,function(id){const e=ccLoadExec(id);return e?ccLoad(e.loadId):null;},{state:ccLoadSt});});
  const ccBulkSt=function(b){const s=ccBulkSummary(b);return {Status:b.status,File:b.fileName,Rows:s.rows,Valid:s.valid,Invalid:s.invalid,Excluded:s.excluded,Created:s.created,Failed:s.failed,Rejected:s.rejected};};
  ['ccBulkRowEdit','ccBulkRowExclude','ccBulkReplace','ccBulkSubmit','ccBulkRetry','ccBulkDiscard'].forEach(function(fn){watch(fn,function(id){return ccBulk(id);},{state:ccBulkSt});});
}
// Corporate Cards 7G: authorization expiry, re-raise, exit card clearance.
if(typeof ccLoadExpire==='function'){
  watch('ccLoadExpire',function(l){return l;},{state:function(l){const ex=l.exec||{};return {Status:ccLoadLabel(l),'Valid Until':ex.expiresOn?cdLabel(ex.expiresOn):'','Expired':ex.expired?cdLabel(ex.expired.on)+' ('+expMoney(ex.expired.amount,l.currency)+' unexecuted)':'No'};}});
  watch('ccLoadReraise',function(id){return ccLoad(id);},{state:function(l){return {Status:ccLoadLabel(l),'Re-raised As':l.reraisedTo?expKey(ccLoad(l.reraisedTo)||{}):''};}});
  const ccClSt=function(c){const cl=c.clearance||{};return {'Exit Clearance':cl.status||'None','Card Returned':cl.returned?cdLabel(cl.returned.date)+' · '+cl.returned.note:'No','Exception':cl.exception?cl.exception.reason:'None'};};
  ['ccClearanceReturn','ccClearanceConfirm','ccClearanceException'].forEach(function(fn){watch(fn,function(id){return ccCard(id);},{state:ccClSt});});
}
// Build 8A: card transactions (lifecycle and verification apart) and the entity timezone.
if(typeof ccTxn==='function'){
  const ccTxnSt=function(t){return {Status:t.status,Verification:ccTxnVerifyLabel(t),Source:ccTxnSourceLabel(t),'Posting Date':t.postDate?cdLabel(t.postDate):'','Posting Awaiting Verification':t.pendingPost?cdLabel(t.pendingPost.date)+' · '+t.pendingPost.ref:'','Duplicate Review':t.dupReview?t.dupReview.status+' (separate from '+t.dupReview.ofKey+')':'','Internal Outcome':ccTxnOutcomeLabel(t),'Statement Evidence':(t.stmtLinks||[]).map(function(x){return x.key+' row '+x.row;}).join(', '),'Source Discrepancies':(t.discrepancies||[]).filter(function(x){return x.status==='Open';}).length?(t.discrepancies||[]).filter(function(x){return x.status==='Open';}).length+' open':'','Corrections':(t.corrections||[]).length?String(t.corrections.length):'','Transaction Reference':t.extRef||'',Amount:expMoney(t.amount,t.currency),'Expense Match':(t.matchStatus||'')+(t.matchedAmount?' '+expMoney(t.matchedAmount,t.matchCurrency):'')};};
  ['ccTxnVerify','ccTxnPost','ccTxnVoid'].forEach(function(fn){watch(fn,function(id){return ccTxn(id);},{state:ccTxnSt});});
  watch('ccTxnReject',function(id){return ccTxn(id);},{state:ccTxnSt});
  ['ccTxnResubmit','ccTxnAddInfo'].forEach(function(fn){watch(fn,function(id){return ccTxn(id);},{state:ccTxnSt});});
  // Build 8C: matching is recorded on the transaction; the claim keeps it in its Logs and on the line.
  if(typeof ccMatchCreate==='function'){
    watch('ccMatchCreate',function(claimId,lineId,txnId){return ccTxn(txnId);},{state:ccTxnSt});
    ['ccMatchConfirm','ccMatchReject','ccMatchRemove'].forEach(function(fn){watch(fn,function(id){const m=ccMatch(id);return m?ccTxn(m.txnId):null;},{state:ccTxnSt});});
    const ccExtSt=function(c){const x=c.extCardId||{};return {'Provider Card ID':ccCardExtIdOf(c)?ccExtIdMask(ccCardExtIdOf(c))+' (confirmed)':'Not recorded','Provider Card ID Pending':x.status==='Awaiting Verification'?ccExtIdMask(x.value):''};};
    ['ccCardExtIdRecord','ccCardExtIdVerify','ccCardExtIdReject'].forEach(function(fn){watch(fn,function(id){return ccCard(id);},{state:ccExtSt});});
  }
  // Build 8E: refunds, reversals and credits on the original; the allocation of a credit.
  if(typeof ccTxnCreditRecord==='function'){
    const crSt=function(t){return {'Credits':ccCreditsOf(t).map(function(x){return expKey(x)+' '+x.type+' '+expMoney(x.billAmount,x.billCurrency)+' '+ccTxnVerifyLabel(x);}).join(' | '),'Net Card Spending':expMoney(ccTxnNetSpend(t),t.billCurrency)};};
    ['ccTxnCreditRecord','ccTxnSimulateCredit'].forEach(function(fn){watch(fn,function(id){return ccTxn(id);},{state:crSt});});
    watch('ccCreditAllocate',function(id){return ccTxn(id);},{state:function(t){const a=t.alloc||{};return {'Business Allocation':(a.status||'')+(a.lines||[]).map(function(x){return ' · '+x.lineRef+' '+expMoney(x.amount,x.currency)+' '+x.status;}).join('')+(a.csx||[]).map(function(x){return ' · '+x.key+' '+expMoney(x.amount,t.billCurrency);}).join('')};}});
  }
  // Build 8D: claim policy versions, card spend exception resolutions.
  if(typeof ccClaimPolSave==='function'){
    watch('ccClaimPolSave',function(){return csHistRec('card-claim-policy-'+ccEnt());},{state:function(){return {'Policy Versions':ccClaimPols().versions.map(function(v){return 'v'+v.v+' '+(v.scope==='programme'?((ccProg(v.programmeId)||{}).code||''):'Entity')+' from '+v.effFrom+(v.inherit?' (entity policy)':' '+ccClaimPolText(Object.assign({configured:true},v)));}).join(' | ')};}});
    const csxSt=function(x){const v=ccCsxAmounts(x);return {Status:x.status,Resolved:expMoney(v.resolved,x.currency),Outstanding:expMoney(v.outstanding,x.currency),Resolutions:(x.resolutions||[]).map(function(r){return r.n+' '+r.type+' '+expMoney(r.amount,x.currency)+' '+r.status;}).join(' | ')};};
    ['ccCsxAccept','ccCsxRecoveryRaise','ccCsxCreditExpect','ccCsxRecoveryDecide','ccCsxCollect','ccCsxCollectVerify','ccCsxLinkCredit','ccCsxCreditReview','ccCsxResCancel'].forEach(function(fn){watch(fn,function(id){return ccCsx(id);},{state:csxSt});});
    watch('ccExcMarkReview',function(key){const p=String(key).split(':');return p[0]==='csx'?ccCsx(p[1]):p[0]==='txn'?ccTxn(p[1]):null;},{state:function(r){return {'Exception Status':r.prefix==='CSX'?r.status:ccExcState('txn:'+r.id)};}});
  }
  watch('entSetTimezone',function(){return csHistRec(csSelectedItem);},{state:function(){return {'Entity Timezone':entTimezone()};}});
}
// Build 8B: card statements (import and verification apart from reconciliation).
if(typeof ccStmt==='function'){
  const ccStmtSt=function(s){const m=ccStmtSum(s);return {'Import Status':s.importStatus,Verification:(s.verify||{}).status||'',Reconciliation:s.reconStatus,Rows:m.rows+' rows: '+m.new+' new, '+m.linked+' linked, '+m.duplicate+' duplicate, '+m.review+' review, '+m.invalid+' invalid, '+m.excluded+' excluded',File:s.fileName+' ('+s.uploads.length+' upload'+(s.uploads.length===1?'':'s')+')',Period:ccStmtPeriodText(s)};};
  ['ccStmtSubmit','ccStmtReturn','ccStmtDiscard','ccStmtReplace','ccStmtRowEdit','ccStmtRowExclude','ccStmtRowMap','ccStmtRowResolve','ccStmtVerify','ccStmtPeriodEdit'].forEach(function(fn){watch(fn,function(id){return ccStmt(id);},{state:ccStmtSt});});
  // Build 8G: transaction disputes; 8F adjustments completed through existing workflows.
  if(typeof ccDspSubmit==='function'){
    const dspSt=function(d){return {Status:d.status,'Internal Reviewer':d.assignee?caN(d.assignee):'','Provider Case':d.provider?d.provider.caseRef+' ('+((d.provider.verify||{}).status||'')+')':'','Provider Outcome':d.outcome?d.outcome.result+' '+expMoney(d.outcome.amount,d.currency)+' ('+((d.outcome.verify||{}).status||'')+')':'',
      Settlement:d.settlement.status+(d.settlement.settled?' '+expMoney(d.settlement.settled,d.currency):''),Credits:(d.settlement.credits||[]).map(function(c){return c.key+' '+expMoney(c.amount,d.currency);}).join(' | ')};};
    ['ccDspSubmit','ccDspAssign','ccDspRequestInfo','ccDspRespond','ccDspReadyForProvider','ccDspProviderSubmit','ccDspVerify','ccDspProviderEvent','ccDspOutcome','ccDspLinkCredit','ccDspRouteCsx','ccDspRecordSupplement','ccDspWithdraw','ccDspClose']
      .forEach(function(fn){watch(fn,function(id){return ccDsp(id);},{state:dspSt});});
    const adjSt=function(s){return {Adjustments:ccRecAdjsOf(s).map(function(a){return a.ref+' '+a.type+' '+a.status+(a.link?' ('+a.link.refs.join(', ')+')':'');}).join(' | ')};};
    ['ccRecAdjLink','ccRecAdjCancel'].forEach(function(fn){watch(fn,function(ref){const a=ccRecAdj(ref);return a?ccStmt(a.stmtId):null;},{state:adjSt});});
  }
  // Build 8F: statement reconciliation (exceptions, sign-off, supplementary corrections).
  if(typeof ccRecStart==='function'){
    const rcSt=function(s){const R=s.recon;if(!R)return {Reconciliation:'Not Started'};const m=ccRecSummary(s);
      return {Reconciliation:R.status,Summary:m.matched+' matched of '+m.total+' rows, '+m.open+' open, '+m.carried+' carried, variance '+expMoney(m.variance,s.currency),Exceptions:ccRecItems(s).map(function(i){return i.id+' '+i.status;}).join(' | '),
        'Sign-off':R.signoff?R.signoff.outcome+' by '+caN(R.signoff.selected)+(R.signoff.switched?' (actual '+caN(R.signoff.actual)+')':''):'',Supplements:(R.supplements||[]).map(function(x){return x.id+' '+x.status;}).join(' | ')};};
    ['ccRecStart','ccRecResolve','ccRecCarry','ccRecRequestEvidence','ccRecLinkTxn','ccRecMapCard','ccRecRecordMissing','ccRecLinkOriginal','ccRecLinkDispute','ccRecAdjust','ccRecAdjustDecide','ccRecSubmit','ccRecSignoff','ccRecSupplement','ccRecSupplementVerify']
      .forEach(function(fn){watch(fn,function(id){return ccStmt(id);},{state:rcSt});});
  }
}
watch('mcToggle',function(){return csHistRec(csSelectedItem);},{state:function(){return Object.assign({},mcStateOf());}});
watch('oncProgrammeEnable',function(){return csHistRec(csSelectedItem);},{state:function(){return {'Card programme':oncProgramme.provider||'none'};}});
watch('oncCfgToggle',function(){return csHistRec(csSelectedItem);},{state:function(){const o={};Object.keys(oncCfg).forEach(function(k){o[k+' shown']=oncCfg[k].show;o[k+' mandatory']=oncCfg[k].mandatory;});return o;}});
watch('wbCommitLog',function(kind,id){return wbRec(kind,id);});
watch('wbSubmitVersion',function(){return wbModal&&wbModal.kind==='pv'?wbRec('p',wbModal.id):null;},{state:function(p){
  return {'Versions':p.versions.map(function(v){return 'v'+v.v+' '+v.amount+' '+v.scope+(v.scopeRef?' '+v.scopeRef:'')+' '+v.effFrom+' to '+(v.effTo||'open');}).join(' | ')};
}});
watch('wbSubmitReason',function(){return wbModal&&wbModal.kind==='rs'?wbRec('a',wbModal.id):null;},{state:function(b){
  const live=b.rows.filter(function(x){return x.status==='Planned';});
  return {'Allocations':live.length,'Planned Amount':live.reduce(function(s,x){return s+x.amount;},0)};
}});
})();
