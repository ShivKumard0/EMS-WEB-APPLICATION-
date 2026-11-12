/* ══ EMPLOYEE LIFECYCLE (FR-01 … FR-21, FR-23, FR-24) ═══════════════════════
   Employee Status is one of four values and nothing else:

      Pending      created, onboarding not started
      Onboarding   onboarding activities are open
      Active       employed (offboarding, when it is running, is a PHASE of
                   Active - the status does not move until the exit is done)
      Inactive     exited, or onboarding was cancelled

   Everything between those four is a LOG, added from the record's Logs tab
   (Employee Record → Action → Logs → Add Log). Each log type asks for what
   that step needs and is owned by a team (FR-01):

     Pending / Onboarding / Document Request Raised     HR
     Documents Submitted                                System
     Document Rejected / Verification Completed         Compliance
     Admin Access Completed                             HR / IT
     Active                                             System
     Cancel Onboarding / Offboarding                    HR
     KT / Handover Completed                            Reporting Manager
     Admin Access Revoked                               HR / IT
     Compliance Clearance Completed                     Compliance
     F&F Settlement Completed                           HR / Finance
     Inactive                                           System
     Cancel Offboarding                                 HR

   THREE LOGS ARE NEVER PICKED BY A PERSON. Documents Submitted is written the
   moment the last outstanding requested document is uploaded (FR-07); Active
   the moment Verification Completed and Admin Access Completed both
   exist, in either order (FR-12); Inactive the moment the
   applicable exit activities exist AND the Last Working Date is reached
   (FR-19). Each is stamped Performed By = System, comment "Automated by
   System" (FR-01).

   THE LOG IS THE SOURCE OF TRUTH. empState() walks it oldest-first; every
   entry also records the Employee Status before and after it (FR-24), and
   the emails it triggered (FR-23). */

/* ── Log types ─────────────────────────────────────────────────────────────
   Keyed by a slug so inline handlers never carry "&" or "/" around; the
   label is what a person reads and what the entry stores as its status. */
const EMP_SYS_COMMENT='Automated by System';
const EMP_LOG={
  pending:         {label:'Pending',owner:'HR'},
  onboarding:      {label:'Onboarding',owner:'HR'},
  'doc-request':   {label:'Document Request Raised',owner:'HR'},
  'docs-submitted':{label:'Documents Submitted',owner:'System',system:true},
  'doc-rejected':  {label:'Document Rejected',owner:'Compliance'},
  verified:        {label:'Verification Completed',owner:'Compliance'},
  'asset-it':      {label:'Admin Access Completed',owner:'HR / IT'},
  active:          {label:'Active',owner:'System',system:true},
  'cancel-onb':    {label:'Cancel Onboarding',owner:'HR',cancel:true},
  offboarding:     {label:'Offboarding',owner:'HR'},
  kt:              {label:'KT / Handover Completed',owner:'Reporting Manager'},
  'asset-rev':     {label:'Admin Access Revoked',owner:'HR / IT'},
  compliance:      {label:'Compliance Clearance Completed',owner:'Compliance'},
  fnf:             {label:'F&F Settlement Completed',owner:'HR / Finance'},
  inactive:        {label:'Inactive',owner:'System',system:true},
  'cancel-off':    {label:'Cancel Offboarding',owner:'HR',cancel:true},
  /* Mark Inactive: HR / Super Admin set the employee Inactive directly, from
     any status but Inactive, outside the onboarding / offboarding process. */
  'mark-inactive': {label:'Mark Inactive',owner:'HR',cancel:true}
};
function empLogKey(label){
  for(var k in EMP_LOG)if(EMP_LOG[k].label===label)return k;
  return '';
}
const EMP_STATUSES=['Pending','Onboarding','Active','Inactive'];

/* One tone map for the app. Only keys nobody else owns are added here. */
Object.assign(SB_STATUS_TONE,{
  'mark-inactive':'bad',
  'document-request-raised':'info','documents-submitted':'info','verification-completed':'ok',
  'document-rejected':'bad','admin-access-completed':'ok','cancel-onboarding':'bad',
  offboarding:'wait','kt-handover-completed':'ok','admin-access-revoked':'ok',
  'compliance-clearance-completed':'ok','f-f-settlement-completed':'ok','cancel-offboarding':'idle',
  'pending-upload':'wait',uploaded:'info',accepted:'ok'
});

/* ── Reference lists ──────────────────────────────────────────────────── */
/* FR-04: the configured Employee attachment types, searchable by Document
   Name or Document Type. The first block is the FR's own list; the last
   three are entity-configured types used by the Global employees. */
const EMP_DOC_CATALOG=[
  {id:'resume',name:'Resume',type:'Employment History'},
  {id:'aadhaar-front',name:'Aadhaar Card Front',type:'Identity Proof'},
  {id:'aadhaar-back',name:'Aadhaar Card Back',type:'Identity Proof'},
  {id:'pan',name:'PAN Card',type:'Tax ID'},
  {id:'passport',name:'Passport',type:'Identity Proof'},
  {id:'address',name:'Address Proof',type:'Address Proof'},
  {id:'qualification',name:'Educational Certificates',type:'Educational Certificate'},
  {id:'photo',name:'Passport Photograph',type:'Photograph'},
  {id:'cheque',name:'Cancelled Cheque / Bank Passbook',type:'Bank Proof'},
  {id:'bankstmt',name:'Bank Statement',type:'Bank Proof'},
  {id:'offer',name:'Previous Offer Letter',type:'Employment History'},
  {id:'relieving',name:'Relieving Letter',type:'Employment History'},
  {id:'salary',name:'Salary Slip',type:'Employment History'},
  {id:'codice',name:'Codice Fiscale',type:'Tax ID'},
  {id:'nif',name:'NIF Certificate',type:'Tax ID'},
  {id:'permit',name:'Work Permit / Visa',type:'Immigration'}
];
function empDocDef(id){return EMP_DOC_CATALOG.find(function(d){return d.id===id;})||null;}
const EMP_DOC_REJECT_REASONS=['Incorrect / Invalid Document','Illegible / Unreadable','Expired Document',
  'Information Mismatch','Incomplete / Missing Pages','Incorrect Document Type','Other'];
const EMP_SEPARATION_TYPES=['Voluntary','Involuntary','Contract End','Retirement','Other'];
const EMP_CANCEL_REASONS=['Candidate Declined','No Show on Joining Date','Offer Withdrawn','Background Check Failed','Other'];
const EMP_INACTIVE_REASONS=['Resigned','Terminated','Absconding','Contract Ended','Duplicate Record','Long Leave / Sabbatical','Other'];
const EMP_PAY_MODES=['Bank Transfer','Cheque','Cash'];
const EMP_HANDOVER_TYPES=['Project(s)','Client(s)'];
/* Access Revocation time, in the app's own dropdown (there is no native time
   box anywhere else): every half hour, 12:00 AM to 11:30 PM. */
const EMP_TIME_SLOTS=(function(){var o=[];for(var m=0;m<1440;m+=30){var h=Math.floor(m/60),mm=m%60;
  o.push(((h%12)||12)+':'+(mm<10?'0':'')+mm+' '+(h<12?'AM':'PM'));}return o;})();
/* Requested-document upload status (FR-05). */
const EMP_DOC_OPEN=['Pending Upload','Rejected'];

/* ── Records ──────────────────────────────────────────────────────────── */
const EMP_LIFE_SCOPES={
  de:{list:function(){return directEmpData;},sel:function(){return deSelectedId;},label:'Direct Employee'},
  ge:{list:function(){return globalEmpData;},sel:function(){return geSelectedId;},label:'Global Employee'}
};
function empFind(kind,id){
  var s=EMP_LIFE_SCOPES[kind];
  return s?s.list().find(function(e){return e.id===id;})||null:null;
}
function empLifeRec(kind){var s=EMP_LIFE_SCOPES[kind];return s?empFind(kind,s.sel()):null;}
function empKindOf(emp){return directEmpData.indexOf(emp)>=0?'de':'ge';}
function empLifeHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function empJs(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function empToday(){return cdISO(new Date());}
function empStamp(){var s=stampNow();return s.date+', '+s.time;}

/* What an employee currently holds - read live from the Admin Access
   module, never copied onto the employee. IT access counts while it is still
   live or about to be (FR-13 "Active/applicable"). */
const EMP_IT_LIVE=['Active','Pending','On Hold'];
function empAssets(emp){
  return (typeof assetsData!=='undefined'?assetsData:[]).filter(function(a){return a.status==='Assigned'&&a.assignedTo===emp.name;});
}
function empItAccess(emp){
  return (typeof itAccessData!=='undefined'?itAccessData:[]).filter(function(r){
    return r.assignedTo===emp.name&&EMP_IT_LIVE.indexOf(r.status)>=0;
  });
}
function empAvailableAssets(){
  return (typeof assetsData!=='undefined'?assetsData:[]).filter(function(a){return a.status==='Available';});
}

/* ── Deriving where a record stands ──────────────────────────────────────
   `onb`/`off` describe the CURRENT cycle only: a new Onboarding after an
   exit starts a fresh one. */
function empLogs(emp){
  if(!emp.logs){
    var seed=(EMP_LIFE_SEED[empKindOf(emp)]||{})[emp.id]||[];
    emp.logs=seed.map(function(l){return Object.assign({},l);});
  }
  return emp.logs;
}
function empState(emp){
  var st={status:'Pending',phase:'pending',onb:null,off:null};
  var logs=empLogs(emp);
  for(var i=logs.length-1;i>=0;i--){
    var l=logs[i],k=l.type||empLogKey(l.status);
    if(k==='mark-inactive'){st.status='Inactive';st.phase='none';st.onb=null;st.off=null;continue;}
    if(k==='pending'){st.status='Pending';st.phase='pending';}
    else if(k==='onboarding'){st.status='Onboarding';st.phase='onb';st.off=null;
      st.onb={docReq:false,noDocs:false,verified:false,assetIt:false};}
    else if(st.onb&&st.phase==='onb'){
      if(k==='doc-request'){st.onb.docReq=true;st.onb.noDocs=!!l.noDocs;}
      else if(k==='verified')st.onb.verified=true;
      else if(k==='asset-it')st.onb.assetIt=true;
      else if(k==='active'){st.status='Active';st.phase='none';}
      else if(k==='cancel-onb'){st.status='Inactive';st.phase='none';}
    }
    if(k==='offboarding'&&st.status==='Active'){st.phase='off';st.off={kt:false,assetRev:false,compliance:false,fnf:false,lwd:l.lwd||''};}
    else if(st.off&&st.phase==='off'){
      if(k==='kt')st.off.kt=true;
      else if(k==='asset-rev')st.off.assetRev=true;
      else if(k==='compliance')st.off.compliance=true;
      else if(k==='fnf')st.off.fnf=true;
      else if(k==='inactive'){st.status='Inactive';st.phase='none';}
      else if(k==='cancel-off'){st.phase='none';st.off=null;}
    }
  }
  return st;
}
function empReqDocs(emp){return emp.reqDocs||(emp.reqDocs=[]);}
/* Outstanding = still owed by the employee: never uploaded, or rejected. */
function empDocsOutstanding(emp){
  return empReqDocs(emp).filter(function(d){return EMP_DOC_OPEN.indexOf(d.status)>=0;});
}
function empDocsAllIn(emp){
  var d=empReqDocs(emp);
  return d.length>0&&!empDocsOutstanding(emp).length;
}
function empDocsAllAccepted(emp){
  var d=empReqDocs(emp);
  return d.length>0&&d.every(function(x){return x.status==='Accepted';});
}
/* FR-16 / FR-19: Asset Recovery applies "where applicable" - the employee
   holds something to recover, or the step was already recorded. */
function empAssetRevApplicable(emp,st){
  return !!(st.off&&st.off.assetRev)||empAssets(emp).length>0||empItAccess(emp).length>0;
}
function empOffDone(emp,st){
  var f=st.off;if(!f)return false;
  return f.kt&&(f.assetRev||!empAssetRevApplicable(emp,st))&&f.compliance&&f.fnf;
}
function empLwdReached(st){return !st.off||!st.off.lwd||st.off.lwd<=empToday();}

/* ── Milestones and progress (FR-21.2 / FR-21.3) ─────────────────────────
   Progress = completed applicable milestones / total applicable milestones.
   Repeated logs count once; a rejection is rework, not a milestone, and only
   puts Documents Submitted back to pending. Excluded milestones are dropped
   from both the denominator and the tracker. */
function empMilestones(emp){
  var st=empState(emp),items;
  if(st.phase==='onb'){
    var o=st.onb,docs=!o.noDocs;
    items=[
      {key:'onboarding',label:'Onboarding',state:'done'},
      docs&&{key:'doc-request',label:'Document Request Raised',state:o.docReq?'done':'pending'},
      docs&&{key:'docs-submitted',label:'Documents Submitted',auto:true,state:o.docReq&&empDocsAllIn(emp)?'done':'pending'},
      {key:'verified',label:'Verification Completed',state:o.verified?'done':'pending'},
      {key:'asset-it',label:'Admin Access Completed',state:o.assetIt?'done':'pending'},
      {key:'active',label:'Active',auto:true,state:'pending'}
    ];
  }else if(st.phase==='off'){
    var f=st.off;
    items=[
      {key:'offboarding',label:'Offboarding',state:'done'},
      {key:'kt',label:'KT / Handover Completed',state:f.kt?'done':'pending'},
      empAssetRevApplicable(emp,st)&&{key:'asset-rev',label:'Admin Access Revoked',state:f.assetRev?'done':'pending'},
      {key:'compliance',label:'Compliance Clearance Completed',state:f.compliance?'done':'pending'},
      {key:'fnf',label:'F&F Settlement Completed',state:f.fnf?'done':'pending'},
      {key:'inactive',label:'Inactive',auto:true,state:'pending',
       note:f.lwd?'On LWD '+cdLabel(f.lwd):''}
    ];
  }else return null;
  items=items.filter(Boolean);
  /* FOUR STAGES, 25% EACH. The middle stage bundles the steps that run side
     by side - Document Request / Documents Submitted / Verification on the
     way in, KT / Asset Recovery / Compliance Clearance on the way out - and
     counts only once every applicable step inside it is done. A step that
     does not apply (no documents, nothing to recover) drops out of its stage. */
  var stages=(st.phase==='onb'
    ?[['Onboarding',['onboarding']],['Document Verification',['doc-request','docs-submitted','verified']],
      ['Admin Access',['asset-it']],['Active',['active']]]
    :[['Offboarding Initiated',['offboarding']],['Exit Clearances',['kt','asset-rev','compliance']],
      ['F&F Settlement',['fnf']],['Inactive',['inactive']]]
  ).map(function(s){
    var subs=s[1].map(function(k){return items.find(function(x){return x.key===k;});}).filter(Boolean);
    return {label:s[0],subs:s[1].length>1?subs:null,
            state:subs.every(function(x){return x.state==='done';})?'done':'pending'};
  });
  var done=stages.filter(function(x){return x.state==='done';}).length;
  return {phase:st.phase,title:st.phase==='onb'?'Onboarding':'Offboarding',items:items,stages:stages,
          done:done,total:stages.length,pct:done*25};
}
/* FR-21.1: the lifecycle status the employee is waiting on, in words. */
function empTrackerStatus(emp){
  var st=empState(emp);
  if(st.phase==='onb'){
    var o=st.onb,docs=empReqDocs(emp);
    if(empDocsOutstanding(emp).length)return 'Document Upload Pending';
    if(!o.docReq)return 'Onboarding';
    if(!o.verified)return (!o.noDocs&&!docs.some(function(d){return d.status==='Accepted';}))?'Documents Submitted':'Verification Pending';
    if(!o.assetIt)return 'Admin Access Pending';
    return 'Active';
  }
  if(st.phase==='off'){
    var f=st.off;
    if(!f.kt)return 'KT / Handover Pending';
    if(!f.assetRev&&empAssetRevApplicable(emp,st))return 'Admin Access Revocation Pending';
    if(!f.compliance)return 'Compliance Clearance Pending';
    if(!f.fnf)return 'F&F Settlement Pending';
    return 'Awaiting Last Working Date';
  }
  return emp.status;
}

/* ── What can be logged right now ──────────────────────────────────────── */
function empLogOptions(emp){
  var st=empState(emp),out=empLogOptionsBase(emp,st);
  if(st.status!=='Inactive')out.push('mark-inactive');
  return out;
}
function empLogOptionsBase(emp,st){
  var out=[];
  if(st.status==='Pending'||st.status==='Inactive')return ['onboarding'];
  if(st.phase==='onb'){
    var o=st.onb;
    if(!o.verified){
      out.push('doc-request');
      if(empReqDocs(emp).some(function(d){return d.status==='Uploaded'||d.status==='Accepted';}))out.push('doc-rejected');
      out.push('verified');
    }
    if(!o.assetIt)out.push('asset-it');
    out.push('cancel-onb');
    return out;
  }
  if(st.phase==='off'){
    var f=st.off;
    if(!f.kt)out.push('kt');
    if(!f.assetRev)out.push('asset-rev');
    if(!f.compliance)out.push('compliance');
    if(!f.fnf)out.push('fnf');
    out.push('cancel-off');
    return out;
  }
  if(st.status==='Active')return ['offboarding'];
  return out;
}
function empPhaseLabel(emp){var st=empState(emp);return st.phase==='off'?'Offboarding':st.status;}

/* ── The next step ────────────────────────────────────────────────────────
   Nobody picks the next log from a list: it follows from where the record
   stands. Each step names its own action (cta) - the popup's one button - and
   says in a line what it involves (hint). */
const EMP_STEP={
  onboarding:     {cta:'Start Onboarding Process',hint:'Begin onboarding. Documents, verification and asset setup follow from here.'},
  'doc-request':  {cta:'Send Document Request',more:'Request More Documents',hint:'Choose the documents the employee must upload. They are notified to upload them.'},
  verified:       {cta:'Complete Verification',hint:'Review each uploaded document - accept it, or reject it with a reason.'},
  'doc-rejected': {cta:'Reject Document',hint:'Reject an uploaded document and ask the employee for a replacement.'},
  'asset-it':     {cta:'Complete Admin Access',hint:'Assign assets and record IT access, or skip what does not apply.'},
  'cancel-onb':   {cta:'Cancel Onboarding',hint:'Stop onboarding. Assigned assets and IT access must be recovered first.'},
  offboarding:    {cta:'Start Offboarding Process',hint:'Record the separation type and last working date to begin offboarding.'},
  kt:             {cta:'Complete Handover',hint:'Record who takes over the work and what was handed over.'},
  'asset-rev':    {cta:'Revoke Admin Access',hint:'Confirm every asset is back and all IT access is revoked.'},
  compliance:     {cta:'Complete Compliance Clearance',hint:'Record the clearance, and any issue still outstanding.'},
  fnf:            {cta:'Complete F&F Settlement',hint:'Record the full and final settlement and how it was paid.'},
  'cancel-off':   {cta:'Cancel Offboarding',hint:'Withdraw the exit. The employee stays Active.'},
  pending:        {cta:'Pending',hint:'Chosen when the employee is created; onboarding starts later.'},
  'docs-submitted':{cta:'Documents Submitted',hint:'Recorded automatically when the employee has uploaded every requested document.'},
  active:         {cta:'Active',hint:'Set automatically once Verification Completed and Admin Access Completed both exist.'},
  inactive:       {cta:'Inactive',hint:'Set automatically once every exit activity is complete and the Last Working Date is reached.'},
  'mark-inactive':{cta:'Mark Inactive',hint:'Set this employee to Inactive now, outside the onboarding / offboarding process. Assets must be recovered and IT access revoked first.'}
};
/* {key, wait, more, cancel}: key is the step to do now (null while the record
   waits on someone else - then wait says on whom); more are the other steps
   open at the same time; cancel is the way out of the running process. */
function empNextStep(emp){
  var opts=empLogOptions(emp),st=empState(emp);
  var exits=opts.filter(function(k){return EMP_LOG[k].cancel;});
  var work=opts.filter(function(k){return !EMP_LOG[k].cancel&&k!=='doc-rejected';});
  var key=null,wait=null;
  if(st.phase==='onb'){
    var o=st.onb,out=empDocsOutstanding(emp);
    if(!o.verified&&!o.noDocs&&!o.docReq)key='doc-request';
    else if(!o.verified&&!o.noDocs&&out.length)
      wait={title:'Waiting for documents',text:out.length+' requested document'+(out.length===1?' is':'s are')+' with '+emp.name+' to upload'
        +(out.some(function(d){return d.status==='Rejected';})?', including a replacement for a rejected one':'')+'.'};
    else if(!o.verified)key='verified';
    else if(!o.assetIt)key='asset-it';
  }else if(st.phase==='off'){
    key=work[0]||null;
    if(!key)wait={title:'Awaiting Last Working Date',text:'Every exit activity is complete. '+emp.name+' becomes Inactive automatically'
      +(st.off.lwd?' on '+cdLabel(st.off.lwd):'')+'.'};
  }else key=work[0]||null;
  return {key:key,wait:wait,exits:exits,more:work.filter(function(k){return k!==key;})};
}
/* Who may record a step: its Owner (FR-01 status table) against the role
   logged in (header, core.js currentRole). Super Admin records every step. */
/* RBAC decides it: each Owner maps to the permission(s) that may record its
   steps; h2r.lifecycle.all records every step. No role name is checked. */
const EMP_OWNER_PERMS={
  'HR':['h2r.lifecycle.hr'],
  'HR / IT':['h2r.lifecycle.hr','h2r.lifecycle.it'],
  'HR / Finance':['h2r.lifecycle.hr','h2r.lifecycle.finance'],
  'Compliance':['h2r.lifecycle.compliance'],
  'Reporting Manager':['h2r.lifecycle.manager']
};
/* The role in use, as people read it - for messages only. */
function empRole(){return typeof emsRoleLabel==='function'?emsRoleLabel():'';}
function empAllStepsRight(){return typeof emsCan==='function'&&emsCan('h2r.lifecycle.all');}
function empRoleCan(k){
  if(empAllStepsRight())return true;
  return (EMP_OWNER_PERMS[EMP_LOG[k].owner]||[]).some(function(c){return emsCan(c);});
}
/* A step named as the action it is ("Complete Verification"), for buttons,
   links and the Super Admin step list. */
function empStepAction(emp,k){return k==='doc-request'&&empReqDocs(emp).length?EMP_STEP[k].more:EMP_STEP[k].cta;}
/* Why a log cannot be recorded on this record right now - '' when it can.
   Super Admin sees every log; the ones not open yet say when they will be. */
const EMP_ONB_KEYS=['doc-request','doc-rejected','verified','asset-it','cancel-onb'];
const EMP_OFF_KEYS=['kt','asset-rev','compliance','fnf','cancel-off'];
function empStepWhyNot(emp,k){
  if(empLogOptions(emp).indexOf(k)>=0)return '';
  var st=empState(emp);
  if(EMP_LOG[k].system)return k==='pending'?'Set when the employee is created.':'Recorded automatically by the system - it cannot be logged by hand.';
  if(k==='pending')return 'Set when the employee is created.';
  if(k==='onboarding')return 'Available for Pending or Inactive employees.';
  if(k==='offboarding')return st.phase==='off'?'Offboarding is already in progress.':'Available for Active employees.';
  if(k==='mark-inactive')return 'The employee is already Inactive.';
  if(EMP_ONB_KEYS.indexOf(k)>=0){
    if(st.phase!=='onb')return 'Available while Onboarding is in progress.';
    if(k==='doc-rejected')return 'Available once the employee has uploaded a requested document.';
    return 'Already completed in this onboarding.';
  }
  if(EMP_OFF_KEYS.indexOf(k)>=0){
    if(st.phase!=='off')return 'Available once Offboarding has started.';
    return 'Already completed in this offboarding.';
  }
  return 'Not available at this stage.';
}
/* The Super Admin step list: every log, the ones open now first. */
function empAllSteps(emp){
  var open=[],rest=[];
  Object.keys(EMP_LOG).forEach(function(k){(empStepWhyNot(emp,k)?rest:open).push(k);});
  var n=empNextStep(emp);
  open.sort(function(a,b){return (a===n.key?-1:0)-(b===n.key?-1:0);});
  return open.concat(rest);
}
function empStepPickLabel(emp,k){return empStepAction(emp,k)+(empStepWhyNot(emp,k)?' — Not available':'');}
function empStepTitle(emp,k){
  return k==='doc-request'&&empReqDocs(emp).length?EMP_STEP[k].more:EMP_LOG[k].label;
}

/* ── Badges ───────────────────────────────────────────────────────────── */
function empLifeBadge(status){
  return '<span class="lp-status-badge tone-'+statusTone(status)+'">'+empLifeHtml(status)+'</span>';
}
function empDocBadge(status){return empLifeBadge(status);}

/* ══ FORM STATE ════════════════════════════════════════════════════════════
   pk is the prefix of the form being worked: 'de'/'ge' for the panel's Logs
   tab, 'desm'/'gesm' for the popup. The picked log type is kept here, not
   only in the dropdown's DOM, so a repaint never forgets it. */
const empFormType={};
const empFormPre={};      // pk -> {doc} preselection (Reject from Verification)
let empLogModal=null;     // {kind,id} while the Add Log popup is open
function empScopeSel(pk){return EMP_LIFE_SCOPES[pk]?'#'+pk+'-isb-inner':'#'+pk+'-body';}
function empPkRec(pk){
  if(EMP_LIFE_SCOPES[pk])return empLifeRec(pk);
  return empLogModal?empFind(empLogModal.kind,empLogModal.id):null;
}
function empFid(pk,key,k){return pk+'-f-'+key+'-'+k;}
function empBlock(pk){return document.querySelector(empScopeSel(pk)+' .emp-log-input:not([hidden])');}

const EMP_ICO={
  tick:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4"><polyline points="20 6 9 17 4 12"/></svg>',
  warn:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.6"/></svg>',
  info:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="12" y1="7.5" x2="12" y2="7.6"/></svg>',
  plus:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  back:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  arrow:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  x:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  laptop:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  key:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2"/><path d="M16 7l3 3"/></svg>',
  doc:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  upload:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  person:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cog:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  cal:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clk:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  mail:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg>',
  dots:'<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>',
  chev:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
  close:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  trash:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'
};

/* ══ PER-STEP FORM BLOCKS ══════════════════════════════════════════════════
   The fields each step asks for. The popup shows exactly one (empFormHTML). */
function empLabel(text,req){
  return '<div class="lp-logs-form-label">'+text+(req?' <span class="lp-logs-form-req">*</span>':'')+'</div>';
}
/* Typed or picked values. apCS / apCD so the controls match the app. */
function empFields(pk,k,items){
  return '<div class="emp-log-fields'+(items.length>1?' is-grid':'')+'">'+items.map(function(f){
    var id=empFid(pk,k,f.k),ctl;
    if(f.type==='date')ctl=apCD(id,f.val||'','Select date');
    else if(f.type==='select')ctl=apCS(id,f.opts,f.val||'','Select',f.hook);
    else if(f.type==='textarea')ctl='<textarea class="emp-log-textarea" id="'+id+'" placeholder="'+empLifeHtml(f.ph||'')+'"></textarea>';
    else if(f.type==='number')ctl='<input class="emp-log-text" id="'+id+'" type="number" step="1"'+(f.signed?'':' min="0"')+' placeholder="'+(f.ph||'0')+'"'
      +(f.calc?' oninput="empFnfCalc(\''+pk+'\')"':'')+(f.net?' oninput="this.dataset.touched=1"':'')+'>';
    else if(f.type==='time')ctl='<input class="emp-log-text" id="'+id+'" type="time" value="'+(f.val||'')+'">';
    else if(f.type==='readonly')ctl='<input class="emp-log-text is-readonly" id="'+id+'" type="text" readonly value="'+empLifeHtml(f.val||'')+'">';
    else ctl='<input class="emp-log-text" id="'+id+'" type="text" placeholder="'+empLifeHtml(f.ph||'')+'">';
    return '<div class="emp-log-field'+(f.full?' is-full':'')+(f.cls?' '+f.cls:'')+'" data-fk="'+f.k+'" data-ftype="'+f.type+'" data-fid="'+id+'"'
      +' data-label="'+empLifeHtml(f.label)+'"'+(f.req?' data-req="1"':'')+(f.hidden?' hidden':'')+'>'
      +empLabel(empLifeHtml(f.label),f.req)+ctl+(f.hint?'<div class="emp-log-fhint">'+f.hint+'</div>':'')+'</div>';
  }).join('')+'</div>';
}
function empCheck(id,label,checked,onchange){
  return '<label class="emp-log-check"><input type="checkbox" id="'+id+'"'+(checked?' checked':'')
    +(onchange?' onchange="'+onchange+'"':'')+'><span class="emp-log-box">'+EMP_ICO.tick+'</span><span>'+label+'</span></label>';
}
function empSecHead(ico,title,right){
  return '<div class="emp-sec-head"><span class="emp-sec-title">'+ico+title+'</span>'+(right||'')+'</div>';
}

function empBlockHTML(pk,emp,k){
  if(k==='doc-request')return empDocPickerHTML(pk,emp);
  if(k==='verified')return empVerifyHTML(pk,emp);
  if(k==='doc-rejected'){
    var docs=empReqDocs(emp).filter(function(d){return d.status==='Uploaded'||d.status==='Accepted';});
    var pre=(empFormPre[pk]||{}).doc||'';
    return '<div class="emp-log-field" data-fk="doc" data-ftype="ss" data-fid="'+empFid(pk,k,'doc')+'" data-label="Rejected Document" data-req="1">'
        +empLabel('Rejected Document',true)
        +empSSHTML(empFid(pk,k,'doc'),docs.map(function(d){
          return {v:d.id,label:d.name,sub:d.type+' · '+(d.file||'—')+' · '+d.status};}),'Search by document name or type',pre)+'</div>'
      +empFields(pk,k,[{k:'reason',label:'Rejection Reason',type:'select',req:true,opts:EMP_DOC_REJECT_REASONS}]);
  }
  if(k==='asset-it')return empAssetItHTML(pk,emp);
  if(k==='mark-inactive')return empResourceHTML(emp,'cancel')
    +empFields(pk,k,[{k:'reason',label:'Reason',type:'select',req:true,opts:EMP_INACTIVE_REASONS},
      {k:'date',label:'Effective Date',type:'date',req:true,val:empToday()}]);
  if(k==='cancel-onb')return empResourceHTML(emp,'cancel')
    +empFields(pk,k,[{k:'reason',label:'Cancellation Reason',type:'select',req:true,opts:EMP_CANCEL_REASONS}]);
  if(k==='offboarding')return empFields(pk,k,[
    {k:'septype',label:'Separation Type',type:'select',req:true,opts:EMP_SEPARATION_TYPES,hook:'empSepHook'},
    {k:'lwd',label:'Last Working Date',type:'date',req:true},
    {k:'sepother',label:'Specify Separation Type',type:'text',req:true,full:true,hidden:true,cls:'emp-sep-other',ph:'Describe the separation'},
    {k:'revdate',label:'Access Revocation Effective Date',type:'date'},
    {k:'revtime',label:'Access Revocation Effective Time',type:'select',opts:EMP_TIME_SLOTS}]);
  if(k==='kt')return empFields(pk,k,[
    {k:'to',label:'Handover To',type:'select',opts:empPeers(emp)},
    {k:'type',label:'Handover Type',type:'select',opts:EMP_HANDOVER_TYPES},
    {k:'docs',label:'Documents Handed Over',type:'select',opts:['Yes','No']},
    {k:'work',label:'Outstanding Work Handed Over',type:'select',opts:['Yes','No']},
    {k:'kt',label:'Knowledge Transfer Completed',type:'select',opts:['Yes','No']},
    {k:'ref',label:'Handover Document / Reference',type:'text',ph:'Link or document name'}]);
  if(k==='asset-rev')return empResourceHTML(emp,'recover');
  if(k==='compliance')return empFields(pk,k,[
    {k:'ref',label:'Compliance Requirement / Reference',type:'text',full:true,ph:'e.g. NDA, statutory exit filing, policy reference'},
    {k:'issue',label:'Outstanding Issue?',type:'select',opts:['Yes','No'],hook:'empIssueHook'},
    {k:'by',label:'Cleared By',type:'readonly',val:CURRENT_USER}])
    +'<div class="emp-issue-extra" hidden>'+empPairsHTML()+'</div>';
  if(k==='fnf')return empFields(pk,k,[
    {k:'date',label:'Settlement Date',type:'date',req:true},
    {k:'salary',label:'Salary Till LWD',type:'number',req:true,calc:true},
    {k:'leave',label:'Leave Encashment',type:'number',calc:true},
    {k:'bonus',label:'Bonus / Incentives',type:'number',calc:true},
    {k:'gratuity',label:'Gratuity',type:'number',calc:true},
    {k:'otherEarn',label:'Other Earnings',type:'number',calc:true},
    {k:'notice',label:'Notice Period Recovery',type:'number',calc:true},
    {k:'loan',label:'Loan / Advance Recovery',type:'number',calc:true},
    {k:'otherDed',label:'Other Deductions',type:'number',calc:true},
    {k:'adjust',label:'Adjustments (+ / −)',type:'number',calc:true,signed:true},
    {k:'net',label:'Net Settlement Amount',type:'number',req:true,net:true,hint:'Calculated from the values above — edit to override.'},
    {k:'mode',label:'Payment Mode',type:'select',req:true,opts:EMP_PAY_MODES},
    {k:'payref',label:'Payment Reference',type:'text',full:true,ph:'UTR / cheque number'}]);
  return '';      // onboarding, cancel-off: the comment is the whole form
}
function empPeers(emp){
  return directEmpData.concat(globalEmpData).filter(function(e){return e!==emp&&e.status==='Active';})
    .map(function(e){return e.name;});
}

/* ── Searchable single-select (Rejected Document) ──────────────────────── */
function empSSHTML(id,opts,ph,val){
  var cur=opts.find(function(o){return o.v===val;});
  return '<div class="emp-ss" id="'+id+'-ss"><input type="hidden" id="'+id+'" value="'+empLifeHtml(cur?cur.v:'')+'">'
    +'<div class="emp-dp-field emp-ss-field" onclick="empSSOpen(\''+id+'\')">'
      +'<input class="emp-dp-input" type="text" placeholder="'+empLifeHtml(ph)+'" value="'+empLifeHtml(cur?cur.label:'')+'"'
      +' oninput="empSSFilter(\''+id+'\',this.value)" onfocus="empSSOpen(\''+id+'\')">'+EMP_ICO.chev+'</div>'
    +'<div class="emp-dp-menu" hidden>'+(opts.length?opts.map(function(o){
      return '<div class="emp-ss-opt'+(cur&&cur.v===o.v?' is-sel':'')+'" data-v="'+empLifeHtml(o.v)+'" data-label="'+empLifeHtml(o.label)+'"'
        +' data-q="'+empLifeHtml((o.label+' '+(o.sub||'')).toLowerCase())+'" onclick="empSSPick(\''+id+'\',this)">'
        +'<span class="emp-ss-name">'+empLifeHtml(o.label)+'</span>'+(o.sub?'<span class="emp-ss-sub">'+empLifeHtml(o.sub)+'</span>':'')+'</div>';
    }).join(''):'')+'<div class="emp-dp-none"'+(opts.length?' hidden':'')+'>'+(opts.length?'No matches.':'Nothing available.')+'</div></div></div>';
}
function empSS(id){return document.getElementById(id+'-ss');}
function empSSOpen(id){var s=empSS(id);if(s)s.querySelector('.emp-dp-menu').hidden=false;}
function empSSFilter(id,q){
  var s=empSS(id);if(!s)return;
  q=String(q||'').trim().toLowerCase();
  s.querySelector('.emp-dp-menu').hidden=false;
  document.getElementById(id).value='';
  var any=false;
  s.querySelectorAll('.emp-ss-opt').forEach(function(o){var on=!q||o.getAttribute('data-q').indexOf(q)>=0;o.hidden=!on;if(on)any=true;});
  var none=s.querySelector('.emp-dp-none');if(none&&s.querySelectorAll('.emp-ss-opt').length)none.hidden=any;
}
function empSSPick(id,el){
  var s=empSS(id);if(!s)return;
  document.getElementById(id).value=el.getAttribute('data-v');
  s.querySelector('.emp-dp-input').value=el.getAttribute('data-label');
  s.querySelectorAll('.emp-ss-opt').forEach(function(o){o.classList.toggle('is-sel',o===el);o.hidden=false;});
  s.querySelector('.emp-dp-menu').hidden=true;
}

/* ── Document Request Raised: the searchable, multi-select picker (FR-04) ─
   The field is the app's own dropdown trigger (.cs-trigger), saying how many
   documents are picked. Opening it shows a search box - matching Document
   Name OR Document Type - over the grouped, tickable list. What has been
   picked is listed under the field, one row per document, each removable.
   Documents already requested in this cycle are shown but cannot be picked
   twice. */
const EMP_DP_SEARCH='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
function empDocPickerHTML(pk,emp){
  var have=empReqDocs(emp).map(function(d){return d.docId;});
  var groups={};
  EMP_DOC_CATALOG.forEach(function(d){(groups[d.type]=groups[d.type]||[]).push(d);});
  var id=pk+'-dp';
  return '<div class="emp-dp-nodocs">'+empCheck(pk+'-nodocs','No Documents Required',false,'empDpNoDocs(\''+pk+'\',this.checked)')+'</div>'
    +empLabel('Required Documents',true)
    +'<div class="emp-dp" id="'+id+'">'
      +'<button type="button" class="cs-trigger cs-placeholder emp-dp-trigger" onclick="empDpToggle(\''+pk+'\')">'
        +'<span class="cs-value">Select documents</span>'
        +'<svg class="cs-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
      +'</button>'
      +'<div class="emp-dp-menu" hidden>'
        +'<div class="emp-dp-search">'+EMP_DP_SEARCH
          +'<input class="emp-dp-input" type="text" placeholder="Search by document name or type" oninput="empDpFilter(\''+pk+'\',this.value)"></div>'
        +'<div class="emp-dp-list">'
        +Object.keys(groups).map(function(t){
          return '<div class="emp-dp-group" data-type="'+empLifeHtml(t.toLowerCase())+'">'
            +'<div class="emp-dp-group-label">'+empLifeHtml(t)+'</div>'
            +groups[t].map(function(d){
              var taken=have.indexOf(d.id)>=0;
              return '<label class="emp-dp-opt'+(taken?' is-taken':'')+'" data-q="'+empLifeHtml((d.name+' '+d.type).toLowerCase())+'">'
                +'<input type="checkbox" data-doc="'+d.id+'"'+(taken?' disabled':'')+' onchange="empDpSync(\''+pk+'\')">'
                +'<span class="emp-log-box">'+EMP_ICO.tick+'</span><span class="emp-dp-name">'+empLifeHtml(d.name)+'</span>'
                +(taken?'<span class="emp-dp-tag">Already requested</span>':'')+'</label>';
            }).join('')+'</div>';
        }).join('')
        +'<div class="emp-dp-none" hidden>No documents match.</div>'
        +'</div>'
      +'</div>'
      +'<div class="emp-dp-picked" hidden></div>'
    +'</div>'
    +(have.length?'<div class="emp-log-fhint">'+have.length+' document'+(have.length===1?' is':'s are')+' already requested in this onboarding.</div>':'');
}
function empDp(pk){return document.querySelector(empScopeSel(pk)+' #'+pk+'-dp');}
function empDpOpen(pk){
  var dp=empDp(pk);if(!dp||dp.classList.contains('is-off'))return;
  dp.querySelector('.emp-dp-menu').hidden=false;
  dp.querySelector('.emp-dp-trigger').classList.add('cs-open');
  var inp=dp.querySelector('.emp-dp-input');if(inp)inp.focus();
}
function empDpClose(dp){
  dp.querySelector('.emp-dp-menu').hidden=true;
  dp.querySelector('.emp-dp-trigger').classList.remove('cs-open');
}
function empDpToggle(pk){
  var dp=empDp(pk);if(!dp)return;
  if(dp.querySelector('.emp-dp-menu').hidden)empDpOpen(pk);else empDpClose(dp);
}
function empDpFilter(pk,q){
  var dp=empDp(pk);if(!dp)return;
  q=String(q||'').trim().toLowerCase();
  dp.querySelector('.emp-dp-menu').hidden=false;
  var any=false;
  dp.querySelectorAll('.emp-dp-group').forEach(function(g){
    var typeHit=!q||g.getAttribute('data-type').indexOf(q)>=0,shown=0;
    g.querySelectorAll('.emp-dp-opt').forEach(function(o){
      var on=typeHit||o.getAttribute('data-q').indexOf(q)>=0;
      o.hidden=!on;if(on)shown++;
    });
    g.hidden=!shown;if(shown)any=true;
  });
  dp.querySelector('.emp-dp-none').hidden=any;
}
/* The trigger says how many; the list under the field says which. */
function empDpSync(pk){
  var dp=empDp(pk);if(!dp)return;
  var picked=Array.prototype.map.call(dp.querySelectorAll('.emp-dp-menu input:checked'),function(i){return empDocDef(i.getAttribute('data-doc'));});
  var trig=dp.querySelector('.emp-dp-trigger');
  trig.classList.toggle('cs-placeholder',!picked.length);
  trig.querySelector('.cs-value').textContent=picked.length?picked.length+' document'+(picked.length===1?'':'s')+' selected':'Select documents';
  var list=dp.querySelector('.emp-dp-picked');
  list.hidden=!picked.length;
  list.innerHTML=picked.map(function(d){
    return '<div class="emp-dp-item"><span class="emp-dp-item-ico">'+EMP_ICO.doc+'</span>'
      +'<span class="emp-dp-item-txt"><span class="emp-dp-item-name">'+empLifeHtml(d.name)+'</span><span class="emp-dp-item-type">'+empLifeHtml(d.type)+'</span></span>'
      +'<button type="button" class="emp-dp-item-del" title="Remove" aria-label="Remove '+empLifeHtml(d.name)+'" onclick="empDpRemove(\''+pk+'\',\''+d.id+'\',event)">'+EMP_ICO.x+'</button></div>';
  }).join('');
}
function empDpRemove(pk,id,e){
  if(e)e.stopPropagation();
  var dp=empDp(pk);if(!dp)return;
  var i=dp.querySelector('.emp-dp-menu input[data-doc="'+id+'"]');if(i)i.checked=false;
  empDpSync(pk);
}
/* No Documents Required: nothing is requested, so the picker is cleared and
   switched off rather than left holding a choice that will not be used. */
function empDpNoDocs(pk,on){
  var dp=empDp(pk);if(!dp)return;
  dp.classList.toggle('is-off',on);
  empDpClose(dp);
  if(on){dp.querySelectorAll('.emp-dp-menu input:checked').forEach(function(i){i.checked=false;});empDpSync(pk);}
  dp.querySelector('.emp-dp-trigger').disabled=on;
  var lbl=dp.previousElementSibling;
  if(lbl){var r=lbl.querySelector('.lp-logs-form-req');if(r)r.style.visibility=on?'hidden':'';}
}
document.addEventListener('click',function(e){
  document.querySelectorAll('.emp-dp-menu:not([hidden])').forEach(function(m){
    var dp=m.parentNode;
    if(dp.contains(e.target))return;
    m.hidden=true;
    var t=dp.querySelector('.emp-dp-trigger');if(t)t.classList.remove('cs-open');
  });
},true);   // capture: popups stop clicks bubbling

/* ── Verification Completed (FR-08) ──────────────────────────────────────
   Compliance accepts or rejects each document here. Accept is recorded on
   the document at once; Reject moves the form to Document Rejected with
   that document picked. Verification Completed can be saved once every
   requested document is Accepted. */
function empVerifyHTML(pk,emp){
  var st=empState(emp),docs=empReqDocs(emp),kind=empKindOf(emp);
  if(st.onb&&st.onb.noDocs)return '<div class="emp-log-ok">'+EMP_ICO.tick+'<span>No Documents Required was selected for this employee.</span></div>';
  if(!st.onb||!st.onb.docReq)return '<div class="emp-log-alert">'+EMP_ICO.warn+'<span>No documents have been requested yet. Raise a <b>Document Request</b> first, or mark it <b>No Documents Required</b>.</span></div>';
  var acc=docs.filter(function(d){return d.status==='Accepted';}).length;
  return '<div class="emp-sec">'
    +empSecHead(EMP_ICO.doc,'Document Review','<span class="emp-sec-count">'+acc+' of '+docs.length+' accepted</span>')
    +'<div class="emp-sec-body is-flush">'+docs.map(function(d){
      var can=d.status==='Uploaded';
      /* Two lines: what the document is and where it stands; then its file
         and what Compliance can do with it. */
      return '<div class="emp-rev-row">'
        +'<div class="emp-rev-line"><span class="emp-res-name">'+empLifeHtml(d.name)+'</span>'+empDocBadge(d.status)+'</div>'
        +'<div class="emp-rev-line"><span class="emp-res-sub">'+empLifeHtml(d.type)+(d.file?' · '+empLifeHtml(d.file):'')
          +(d.status==='Accepted'&&d.acceptedBy?' · Accepted by '+empLifeHtml(d.acceptedBy):'')
          +(d.status==='Rejected'&&d.reason?' · '+empLifeHtml(d.reason):'')+'</span>'
        +(can?'<span class="emp-rev-acts">'
          +'<button type="button" class="emp-mini-btn is-ok" onclick="empDocAccept(\''+kind+'\','+emp.id+',\''+d.id+'\')">Accept</button>'
          +'<button type="button" class="emp-mini-btn is-bad" onclick="empDocRejectFrom(\''+pk+'\',\''+d.id+'\')">Reject</button></span>':'')
        +'</div></div>';
    }).join('')+'</div></div>'
    +(acc<docs.length?'<div class="emp-log-note">'+EMP_ICO.info+'<span>Verification Completed can be saved once all '+docs.length+' documents are <b>Accepted</b>.</span></div>':'');
}
function empDocAccept(kind,id,docId){
  var emp=empFind(kind,id);if(!emp)return;
  var d=empReqDocs(emp).find(function(x){return x.id===docId;});if(!d||d.status!=='Uploaded')return;
  d.status='Accepted';d.acceptedBy=CURRENT_USER;d.acceptedAt=empStamp();
  renderADTPage();
  showToast('Document accepted','success',d.name+' accepted for '+emp.name+'.');
}
function empDocRejectFrom(pk,docId){
  empFormType[pk]='doc-rejected';empFormPre[pk]={doc:docId};
  renderADTPage();
}

/* ── Admin Access Completed: assets and IT access (FR-11) ─────────────────
   Two sections, one below the other. Each lists what the employee already
   holds; Assets also offers Assign Existing Asset (search by name or ID) and
   + Add Asset, IT offers + Add IT Access - both the module's own popups. */
/* An asset in the log is named, not described: what it is (Keyboard, Mouse)
   and its code, so two of the same kind can be told apart. Everything else
   about it lives on the Assets page. */
/* Each line opens on its own to the asset's details - the same label / value
   grid as the IT Access cards - so several can be open at once. Which are
   open is kept here, so a repaint (an asset assigned) does not fold them. */
var empResOpen={};
function empAssetCard(a){
  var key='a'+a.id,open=!!empResOpen[key];
  var pairs=[['Asset Category',a.category],['Asset ID / Code',a.code],['Serial Number',a.serial],
    ['Brand / Model',[a.brand,a.model].filter(Boolean).join(' · ')],['Assigned Date',cdLabel(a.assignedOn)],
    ['Location',a.branch],['Condition',a.condition]];
  return '<div class="emp-res-card is-line is-exp'+(open?' is-open':'')+'">'
    +'<button type="button" class="emp-res-top emp-res-toggle" aria-expanded="'+open+'" title="'+(open?'Hide':'Show')+' details" onclick="empResToggle(this,\''+key+'\')">'
      +'<span class="emp-res-txt"><span class="emp-res-name">'+empLifeHtml(a.name)+'</span>'
        +(a.code?'<span class="emp-res-code">'+empLifeHtml(a.code)+'</span>':'')+'</span>'
      +empLifeBadge(a.status)+'<span class="emp-res-chev">'+EMP_ICO.chev+'</span></button>'
    +'<dl class="emp-res-dl emp-res-more"'+(open?'':' hidden')+'>'+pairs.map(function(p){
      return '<div><dt>'+p[0]+'</dt><dd>'+(p[1]?empLifeHtml(p[1]):'<span class="sb-dash">—</span>')+'</dd></div>';
    }).join('')+'</dl></div>';
}
function empResToggle(btn,key){
  var card=btn.closest('.emp-res-card'),more=card&&card.querySelector('.emp-res-more');if(!more)return;
  var open=more.hidden;
  more.hidden=!open;card.classList.toggle('is-open',open);
  btn.setAttribute('aria-expanded',String(open));btn.title=(open?'Hide':'Show')+' details';
  if(open)empResOpen[key]=1;else delete empResOpen[key];
}
function empItCard(r,mode){
  var pairs=[['Access Type',r.accessType],['Login ID',r.login],['Role / Permission',r.role],['Effective Date',cdLabel(r.effective)]];
  if(mode!=='recover')pairs.push(['Provisioned By',r.provisionedBy],['MFA Enabled',r.mfa]);
  return empResCard(r.system,r.status,pairs);
}
function empResCard(title,status,pairs){
  return '<div class="emp-res-card"><div class="emp-res-top"><span class="emp-res-name">'+empLifeHtml(title)+'</span>'+empLifeBadge(status)+'</div>'
    +'<dl class="emp-res-dl">'+pairs.map(function(p){
      return '<div><dt>'+p[0]+'</dt><dd>'+(p[1]?empLifeHtml(p[1]):'<span class="sb-dash">—</span>')+'</dd></div>';
    }).join('')+'</dl></div>';
}
function empAssetItHTML(pk,emp){
  var assets=empAssets(emp),its=empItAccess(emp);
  return '<div class="emp-sec">'
      +empSecHead(EMP_ICO.laptop,'Asset Allocation',empCheck(pk+'-skip-asset','Skip Asset Allocation',false,'empSkipToggle(this)'))
      +'<div class="emp-sec-body">'
        +(assets.length?'<div class="emp-res-list">'+assets.map(function(a){return empAssetCard(a);}).join('')+'</div>'
          :'<div class="emp-sec-empty">No asset assigned to '+empLifeHtml(emp.name)+' yet.</div>')
        +empAssignPickHTML(pk,emp)
      +'</div></div>'
    +'<div class="emp-sec">'
      +empSecHead(EMP_ICO.key,'IT Access',empCheck(pk+'-skip-it','Skip IT Access',false,'empSkipToggle(this)'))
      +'<div class="emp-sec-body">'
        +(its.length?'<div class="emp-res-list">'+its.map(function(r){return empItCard(r);}).join('')+'</div>'
          :'<div class="emp-sec-empty">No IT access recorded for '+empLifeHtml(emp.name)+' yet.</div>')
        +'<div class="emp-sec-btns"><button type="button" class="emp-sec-btn" onclick="empGoAddItAccess(\''+pk+'\')">'+EMP_ICO.plus+'Add IT Access</button></div>'
      +'</div></div>';
}
function empAssignExisting(pk){
  var emp=empPkRec(pk);if(!emp)return;
  /* The assets are picked first in the Select Assets popup; Assign hands
     them all over at once. */
  var picks=empAsgPicked(pk,emp);
  if(!picks.length){showToast('Select assets first','error','Use Select Assets to pick what to assign to '+emp.name+'.');return;}
  picks.forEach(function(x){empAssignAsset(emp,x);});
  delete empAsgPicks[pk];
  renderADTPage();
  showToast(picks.length===1?'Asset assigned':picks.length+' assets assigned','success',
    picks.map(function(x){return x.name+' ('+x.code+')';}).join(', ')+(picks.length===1?' is':' are')+' now assigned to '+emp.name+'.');
}
/* Hands one available asset to the employee - its status, holder, history,
   log and workflow, exactly as the Assets module records an assignment. */
function empAssignAsset(emp,a){
  var today=empToday();
  if(typeof astSeedLogs==='function')astSeedLogs(a);
  a.status='Assigned';a.assignedTo=emp.name;a.assignedOn=today;a.updatedAt=empStamp();
  if(typeof astMarkAssigned==='function')astMarkAssigned(a);
  if(emp.branch)a.branch=emp.branch;
  a.history=a.history||[];a.history.unshift({employee:emp.name,from:today,to:'',condition:a.condition});
  var s=stampNow();
  if(a.logs)a.logs.unshift({date:s.date,time:s.time,user:CURRENT_USER,status:'Assigned',action:'Assigned to '+emp.name+' from the onboarding log.'});
  if(typeof wfPush==='function'&&typeof astWorkflowData!=='undefined'){if(typeof astWorkflow==='function')astWorkflow(a);wfPush(astWorkflowData,a.id,'Asset Assigned','Handed to '+emp.name+' during onboarding.');}
}

/* ── Select Assets ────────────────────────────────────────────────────────
   Pick first, then assign: Select Assets opens a popup of the assets that are
   free right now - search, tick one or more, Submit - and the picks come back
   to the log as a list, with Assign switched on. Nothing is assigned until
   Assign is pressed. The popup is painted straight onto <body>, like the
   Cancel Onboarding one, so the log form underneath keeps what was typed. */
var empAsgPicks={};    // pk -> {emp:id, ids:[asset id]}
function empAsgPicked(pk,emp){
  var p=empAsgPicks[pk];
  if(!p||!emp||p.emp!==emp.id)return [];
  var av=empAvailableAssets();
  return p.ids.map(function(id){return av.find(function(a){return a.id===id;});}).filter(Boolean);
}
function empAsgUnpick(pk,id){
  var p=empAsgPicks[pk];if(!p)return;
  p.ids=p.ids.filter(function(x){return x!==id;});
  renderADTPage();
}
function empAssignPickHTML(pk,emp){
  var picks=empAsgPicked(pk,emp);
  /* Only what is needed at each moment: the picked assets appear (under
     "Ready to assign") once there are some, and one row of buttons - Select
     and Add on the left, Assign on the right, off until something is picked. */
  return '<div class="emp-assign">'
    +(picks.length
      ?'<div class="emp-assign-title">Ready to assign</div>'
        +'<div class="emp-pick-list">'+picks.map(function(a){
          return '<div class="emp-pick-row"><span class="emp-res-txt"><span class="emp-res-name">'+empLifeHtml(a.name)+'</span>'
            +'<span class="emp-res-code">'+empLifeHtml(a.code)+'</span></span>'
            +'<button type="button" class="emp-pick-x" title="Remove '+empLifeHtml(a.name)+'" onclick="empAsgUnpick(\''+pk+'\','+a.id+')">'+EMP_ICO.x+'</button></div>';
        }).join('')+'</div>'
      :'')
    +'<div class="emp-assign-bar">'
      +'<div class="emp-sec-btns">'
        +'<button type="button" class="emp-sec-btn" onclick="empAsgOpen(\''+pk+'\')">'+(picks.length?'Change Selection':'Select Assets')+'</button>'
        +'<button type="button" class="emp-sec-btn" onclick="empGoAddAsset(\''+pk+'\')">'+EMP_ICO.plus+'Add Asset</button>'
      +'</div>'
      +'<button type="button" class="emp-sec-btn is-primary"'+(picks.length?'':' disabled title="Select assets first"')+' onclick="empAssignExisting(\''+pk+'\')">'
        +(picks.length>1?'Assign '+picks.length+' Assets':'Assign')+'</button>'
    +'</div>'
  +'</div>';
}
function empAsgOpen(pk){
  var emp=empPkRec(pk);if(!emp)return;
  empAsgClose();
  var av=empAvailableAssets(),on={};
  empAsgPicked(pk,emp).forEach(function(a){on[a.id]=1;});
  var rows=av.map(function(a){
    var q=(a.name+' '+a.code+' '+(a.category||'')).toLowerCase();
    return '<label class="emp-asg-row" data-q="'+empLifeHtml(q)+'">'
      +'<input type="checkbox" value="'+a.id+'"'+(on[a.id]?' checked':'')+' onchange="empAsgCount()">'
      +'<span class="emp-log-box">'+EMP_ICO.tick+'</span>'
      +'<span class="emp-asg-txt"><span class="emp-res-name">'+empLifeHtml(a.name)+'</span><span class="emp-res-code">'+empLifeHtml(a.code)+'</span></span>'
      +'<span class="emp-asg-cat">'+empLifeHtml(a.category||'')+'</span></label>';
  }).join('');
  var el=document.createElement('div');
  el.id='emp-asg-pop';el.className='ct-modal-overlay emp-block-overlay';el.dataset.pk=pk;
  el.innerHTML='<div class="ct-modal ct-modal--form emp-asg" role="dialog" aria-modal="true" aria-label="Select assets">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Select Assets</span>'
      +'<button class="ct-modal-close" onclick="empAsgClose()" aria-label="Close">'+EMP_ICO.close+'</button></div>'
    +'<p class="ct-modal-sub">Assets available to assign to <b>'+empLifeHtml(emp.name)+'</b>. Tick one or more, then Submit.</p>'
    +(av.length
      ?'<input class="ep-form-input emp-asg-search" type="text" placeholder="Search by asset name or ID" oninput="empAsgFilter(this.value)">'
        +'<div class="emp-asg-list">'+rows+'<div class="emp-asg-none" hidden>No asset matches this search.</div></div>'
      :'<div class="emp-sec-empty">No assets are available right now. Add one with <b>Add Asset</b> in the log.</div>')
    +'<div class="ct-modal-foot"><span class="emp-asg-count" id="emp-asg-count"></span><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="empAsgClose()">Cancel</button>'
      +'<button class="ep-save-btn" id="emp-asg-submit" onclick="empAsgSubmit()">Submit</button>'
    +'</div></div></div>';
  document.body.appendChild(el);
  empAsgCount();
  var s=el.querySelector('.emp-asg-search');if(s)s.focus();
}
function empAsgClose(){var el=document.getElementById('emp-asg-pop');if(el)el.remove();}
function empAsgFilter(q){
  q=String(q||'').trim().toLowerCase();
  var any=false;
  document.querySelectorAll('#emp-asg-pop .emp-asg-row').forEach(function(r){
    var hit=!q||r.dataset.q.indexOf(q)>=0;r.hidden=!hit;if(hit)any=true;
  });
  var none=document.querySelector('#emp-asg-pop .emp-asg-none');if(none)none.hidden=any;
}
function empAsgCount(){
  var n=document.querySelectorAll('#emp-asg-pop .emp-asg-row input:checked').length;
  var c=document.getElementById('emp-asg-count');if(c)c.textContent=n?n+' selected':'';
  var b=document.getElementById('emp-asg-submit');if(b)b.disabled=!n;
}
function empAsgSubmit(){
  var pop=document.getElementById('emp-asg-pop');if(!pop)return;
  var pk=pop.dataset.pk,emp=empPkRec(pk);
  var ids=[].map.call(pop.querySelectorAll('.emp-asg-row input:checked'),function(i){return +i.value;});
  if(!emp||!ids.length)return;
  empAsgPicks[pk]={emp:emp.id,ids:ids};
  empAsgClose();
  renderADTPage();
}
function empSkipToggle(cb){var sec=cb.closest('.emp-sec');if(sec)sec.classList.toggle('is-skipped',cb.checked);}

/* ── Admin Access Revoked: asset recovery and IT access revocation (FR-16),
   and the pre-check for Cancel Onboarding (FR-13): what the employee still
   holds, with the way to go and resolve each list. */
function empResourceHTML(emp,mode){
  var assets=empAssets(emp),its=empItAccess(emp),n=empJs(emp.name),rec=mode==='recover';
  return '<div class="emp-sec">'
      +empSecHead(EMP_ICO.laptop,rec?'Asset Recovery':'Assigned Assets',
        assets.length?'<button type="button" class="emp-sec-link" onclick="empGoAllAssets(\''+n+'\')">Manage Asset'+EMP_ICO.arrow+'</button>':'')
      +'<div class="emp-sec-body">'+(assets.length
        ?'<div class="emp-res-list">'+assets.map(function(a){return empAssetCard(a);}).join('')+'</div>'
        :'<div class="emp-sec-empty is-ok">'+EMP_ICO.tick+'No Assigned Assets</div>')+'</div></div>'
    +'<div class="emp-sec">'
      +empSecHead(EMP_ICO.key,rec?'IT Access Revocation':'Active IT Access',
        its.length?'<button type="button" class="emp-sec-link" onclick="empGoAllItAccess(\''+n+'\')">Manage IT Access'+EMP_ICO.arrow+'</button>':'')
      +'<div class="emp-sec-body">'+(its.length
        ?'<div class="emp-res-list">'+its.map(function(r){return empItCard(r,'recover');}).join('')+'</div>'
        :'<div class="emp-sec-empty is-ok">'+EMP_ICO.tick+'No Active IT Access</div>')+'</div></div>'
    +((assets.length||its.length)?'<div class="emp-log-alert">'+EMP_ICO.warn+'<span>'
        +(rec?'Every asset must be returned and every access revoked before this can be completed.'
          :'Assets and IT access must be resolved before onboarding can be cancelled.')+'</span></div>':'');
}

/* ── Compliance Clearance: Issue Details / Resolution pairs (FR-17) ────── */
function empPairRowHTML(){
  return '<div class="emp-pair">'
    +'<div class="emp-pair-f">'+empLabel('Issue Details',true)+'<textarea class="emp-log-textarea" data-pair="issue" placeholder="What is outstanding"></textarea></div>'
    +'<div class="emp-pair-f">'+empLabel('Resolution / Action Taken')+'<textarea class="emp-log-textarea" data-pair="res" placeholder="How it was or will be resolved"></textarea></div>'
    +'<button type="button" class="emp-pair-del" title="Remove" onclick="empPairDel(this)">'+EMP_ICO.trash+'</button>'
    +'</div>';
}
function empPairsHTML(){
  return '<div class="emp-pairs">'+empPairRowHTML()+'</div>'
    +'<button type="button" class="emp-sec-btn" onclick="empPairAdd(this)">'+EMP_ICO.plus+'Add Issue</button>';
}
function empPairAdd(btn){
  var list=btn.previousElementSibling;if(!list)return;
  list.insertAdjacentHTML('beforeend',empPairRowHTML());
  var ta=list.lastElementChild.querySelector('textarea');if(ta)ta.focus();
}
function empPairDel(btn){
  var list=btn.closest('.emp-pairs'),row=btn.closest('.emp-pair');
  if(list&&list.children.length>1)row.remove();
  else row.querySelectorAll('textarea').forEach(function(t){t.value='';});
}
function empIssueHook(val,csid){
  var w=document.getElementById('csw-'+csid);
  var blk=w&&w.closest('.emp-log-input');
  var x=blk&&blk.querySelector('.emp-issue-extra');
  if(x)x.hidden=val!=='Yes';
}
/* Offboarding: "Other" separation needs words. */
function empSepHook(val,csid){
  var w=document.getElementById('csw-'+csid);
  var blk=w&&w.closest('.emp-log-input');
  var x=blk&&blk.querySelector('.emp-sep-other');
  if(x)x.hidden=val!=='Other';
}
/* F&F: the net figure follows the lines above until someone types in it. */
function empFnfCalc(pk){
  var g=function(k){var el=document.querySelector(empScopeSel(pk)+' #'+empFid(pk,'fnf',k));return el&&el.value!==''?parseFloat(el.value)||0:0;};
  var net=g('salary')+g('leave')+g('bonus')+g('gratuity')+g('otherEarn')-g('notice')-g('loan')-g('otherDed')+g('adjust');
  var out=document.querySelector(empScopeSel(pk)+' #'+empFid(pk,'fnf','net'));
  if(out&&!out.dataset.touched)out.value=Math.round(net*100)/100;
}


/* ══ READ, VALIDATE, COMMIT ════════════════════════════════════════════════ */
function empReadFields(block,out){
  block.querySelectorAll('.emp-log-field[data-fid]').forEach(function(f){
    if(f.hidden||f.closest('[hidden]'))return;   // a field that is not shown is not asked
    var id=f.getAttribute('data-fid'),type=f.getAttribute('data-ftype'),label=f.getAttribute('data-label');
    var v='',shown='';
    if(type==='date'){var h=document.getElementById(id);v=h?h.value:'';shown=cdLabel(v);}
    else if(type==='select'){v=getCSValue(id);shown=v;}
    else if(type==='ss'){var hs=document.getElementById(id);v=hs?hs.value:'';
      var o=v&&f.querySelector('.emp-ss-opt[data-v="'+v+'"]');shown=o?o.getAttribute('data-label'):'';}
    else{var el=document.getElementById(id);v=el?String(el.value).trim():'';
      shown=type==='time'?empTime12(v):type==='number'?empNum(v):v;}
    out.vals[f.getAttribute('data-fk')]=v;
    if(v!=='')out.details.push({label:label,value:shown});
    else if(f.getAttribute('data-req'))out.missing.push(label);
  });
}
function empTime12(v){
  var m=/^(\d{1,2}):(\d{2})/.exec(v||'');if(!m)return v;
  var h=+m[1];return ((h%12)||12)+':'+m[2]+' '+(h>=12?'PM':'AM');
}
function empNum(v){var n=parseFloat(v);return isNaN(n)?v:n.toLocaleString('en-IN');}
function empFail(title,sub){showToast(title,'error',sub);return false;}

function empCommitLog(pk){
  var emp=empPkRec(pk);if(!emp)return;
  var k=empFormType[pk];
  var inp=document.getElementById(pk+'-log-comment-inp');
  var comment=inp?inp.value.trim():'';
  var flash=function(el){if(el){el.classList.add('is-invalid');setTimeout(function(){el.classList.remove('is-invalid');},1600);}};
  if(!k){empFail('Nothing to log','There is no lifecycle step to record for '+emp.name+' right now.');return;}
  if(empLogOptions(emp).indexOf(k)<0){empFail('Not available now',EMP_LOG[k].label+' cannot be logged at this stage.');return;}
  if(!empRoleCan(k)){empFail('Not your step',EMP_LOG[k].label+' is recorded by '+EMP_LOG[k].owner+'. You are logged in as '+empRole()+'.');return;}
  var block=empBlock(pk);
  var got={vals:{},details:[],missing:[]};
  if(block)empReadFields(block,got);
  var entry={type:k,status:EMP_LOG[k].label,action:comment};
  var st=empState(emp);
  var effects=null;

  if(k==='doc-request'){
    var noDocs=!!(document.getElementById(pk+'-nodocs')||{}).checked;
    var ids=block?Array.prototype.map.call(block.querySelectorAll('.emp-dp-menu input:checked'),function(i){return i.getAttribute('data-doc');}):[];
    if(noDocs&&empReqDocs(emp).length){empFail('Documents already requested','No Documents Required can only be chosen before any document is requested.');return;}
    if(!noDocs&&!ids.length){var dp=empDp(pk);if(dp)flash(dp.querySelector('.emp-dp-trigger'));empFail('Required Documents is mandatory','Select at least one document, or tick No Documents Required.');return;}
    if(noDocs){entry.noDocs=true;entry.details=[{label:'Required Documents',value:'No Documents Required'}];}
    else{
      entry.docs=ids.map(function(i){return empDocDef(i).name;});
      effects=function(){
        var s=stampNow();
        ids.forEach(function(i){var d=empDocDef(i);
          empReqDocs(emp).push({id:'rq'+(++empReqSeq),docId:i,name:d.name,type:d.type,status:'Pending Upload',requestedAt:s.date});});
      };
    }
  }else if(k==='verified'){
    if(!st.onb.noDocs){
      if(!st.onb.docReq){empFail('Documents are not requested','Raise a Document Request first, or mark it No Documents Required.');return;}
      if(!empDocsAllAccepted(emp)){
        var left=empReqDocs(emp).filter(function(d){return d.status!=='Accepted';});
        empFail('Documents not yet accepted',left.length+' document'+(left.length===1?' is':'s are')+' not Accepted — first: '+left[0].name+' ('+left[0].status+').');return;}
      entry.details=[{label:'Accepted Documents',value:empReqDocs(emp).map(function(d){return d.name;}).join(', ')}];
    }else entry.details=[{label:'Documents',value:'No Documents Required'}];
  }else if(k==='doc-rejected'){
    if(!got.missing.length){
      var d=empReqDocs(emp).find(function(x){return x.id===got.vals.doc;});
      entry.rejected=[{name:d.name,reason:got.vals.reason}];
      effects=function(){
        /* The file leaves the employee's active attachments; the request
           goes back to Requested Docs asking for a replacement (FR-09). */
        if(emp.attachments)emp.attachments=emp.attachments.filter(function(a){return a.reqId!==d.id;});
        d.status='Rejected';d.reason=got.vals.reason;d.prevFile=d.file;d.file='';d.size='';d.wasRejected=true;
        d.acceptedBy='';d.acceptedAt='';
      };
    }
  }else if(k==='asset-it'){
    var skA=!!(document.getElementById(pk+'-skip-asset')||{}).checked;
    var skI=!!(document.getElementById(pk+'-skip-it')||{}).checked;
    var as=empAssets(emp),is=empItAccess(emp);
    if(!skA&&!as.length){empFail('Asset Allocation is not complete','Assign or add an asset for '+emp.name+', or tick Skip Asset Allocation.');return;}
    if(!skI&&!is.length){empFail('IT Access is not complete','Add IT access for '+emp.name+', or tick Skip IT Access.');return;}
    entry.details=[{label:'Asset Allocation',value:skA?'Skipped':as.map(function(a){return a.code;}).join(', ')},
                   {label:'IT Access',value:skI?'Skipped':is.map(function(r){return r.system;}).join(', ')}];
  }else if(k==='mark-inactive'){
    var ma=empAssets(emp).length,mi=empItAccess(emp).length;
    if(ma||mi){empFail('Recover assets and revoke access first',(ma?ma+' asset'+(ma===1?'':'s')+' still assigned':'')+(ma&&mi?' and ':'')
      +(mi?mi+' IT access record'+(mi===1?'':'s')+' still active':'')+'. Use Manage Asset / Manage IT Access above.');return;}
    entry.status='Inactive';
  }else if(k==='cancel-onb'){
    if(empAssets(emp).length||empItAccess(emp).length){empShowCancelBlock(pk,emp);return;}
  }else if(k==='asset-rev'){
    var ra=empAssets(emp).length,ri=empItAccess(emp).length;
    if(ra||ri){empFail('Resources still assigned',(ra?ra+' asset'+(ra===1?'':'s')+' still assigned':'')+(ra&&ri?' and ':'')+(ri?ri+' IT access record'+(ri===1?'':'s')+' still active':'')+'.');return;}
    entry.details=[{label:'Assets',value:'No Assigned Assets'},{label:'IT Access',value:'No Active IT Access'}];
  }else if(k==='offboarding'){
    entry.lwd=got.vals.lwd||'';
  }else if(k==='compliance'&&got.vals.issue==='Yes'&&block){
    var pairs=[];
    block.querySelectorAll('.emp-pair').forEach(function(p){
      var i=p.querySelector('[data-pair=issue]').value.trim(),r=p.querySelector('[data-pair=res]').value.trim();
      if(i||r)pairs.push({issue:i,res:r});
    });
    if(!pairs.length||pairs.some(function(p){return !p.issue;})){
      var bad=block.querySelector('.emp-pair [data-pair=issue]');flash(bad);
      empFail('Issue Details is mandatory','Every issue line needs its Issue Details when Outstanding Issue is Yes.');return;}
    entry.issues=pairs;
  }
  if(got.missing.length){empFail(got.missing[0]+' is mandatory',got.missing.length>1?(got.missing.length-1)+' more required field'+(got.missing.length>2?'s':'')+' also empty.':'');return;}
  if(!comment){flash(inp);empFail('Comment is mandatory','Say what happened before saving the log.');return;}
  if(!entry.details&&got.details.length)entry.details=got.details;

  if(k==='onboarding')emp.reqDocs=[];     // a new cycle starts with nothing requested
  if(effects)effects();
  empPushLog(emp,entry);
  empAutoAdvance(emp);

  empFormType[pk]='';delete empFormPre[pk];
  if(empLogModal)empLogModal=null;
  renderADTPage();
  /* The repaint keeps typed values (that is what patchDom is for), so a
     saved form has to be emptied by hand or the next log starts with the
     last one's comment in it. */
  var c2=document.getElementById(pk+'-log-comment-inp');if(c2)c2.value='';
  document.querySelectorAll(empScopeSel(pk)+' .emp-log-input-wrap input, '+empScopeSel(pk)+' .emp-log-input-wrap textarea').forEach(function(i){
    if(i.type==='checkbox'){if(!i.disabled)i.checked=false;}else if(i.type!=='hidden'&&!i.readOnly)i.value='';
  });
  var top=empLogs(emp)[0],st2=empState(emp);
  if(top.system&&(top.type==='active'||top.type==='inactive'))
    showToast(emp.name+' is now '+emp.status,'success','All mandatory '+(top.type==='active'?'onboarding':'offboarding')+' activities are complete — '+emp.status+' was set automatically.');
  else if(st2.phase==='off'&&empOffDone(emp,st2))
    showToast('Offboarding activities complete','success',emp.name+' becomes Inactive automatically on the Last Working Date, '+cdLabel(st2.off.lwd)+'.');
  else showToast('Log added','success',EMP_LOG[k].label+' recorded for '+emp.name+'.');
}

let empReqSeq=100;
/* Every entry, person or system, goes through here: stamped, the Employee
   Status before and after it recorded (FR-24), the emails it triggers sent
   and noted on it (FR-23), and the Workflow tab told. */
function empPushLog(emp,entry){
  var s=stampNow();
  var e=Object.assign({date:s.date,time:s.time,user:entry.system?'System':CURRENT_USER},entry);
  if(e.system&&!e.action)e.action=EMP_SYS_COMMENT;
  e.prev=emp.status;
  empLogs(emp).unshift(e);
  emp.status=empState(emp).status;
  e.next=emp.status;
  empNotifyFor(emp,e);
  var wf=empKindOf(emp)==='de'?deWorkflowData:geWorkflowData;
  if(typeof wfPush==='function')wfPush(wf,emp.id,e.status,e.action||'',e.user);
  return e;
}
/* The moves no person makes (FR-12, FR-19). Checked after every log - and,
   for Inactive, again whenever the date moves past an LWD (empSweepLwd). */
function empAutoAdvance(emp){
  var st=empState(emp);
  if(st.phase==='onb'&&st.onb.verified&&st.onb.assetIt){
    empPushLog(emp,{type:'active',status:'Active',system:true,
      details:[{label:'Performed By',value:'System'},{label:'Active Date/Time',value:empStamp()},{label:'Onboarding',value:'Completed'}]});
  }else if(st.phase==='off'&&empOffDone(emp,st)&&empLwdReached(st)){
    empPushLog(emp,{type:'inactive',status:'Inactive',system:true,
      details:[{label:'Performed By',value:'System'},{label:'Inactive Date/Time',value:empStamp()},{label:'Offboarding',value:'Completed'}]});
  }
}
function empSweepLwd(){
  ['de','ge'].forEach(function(k){EMP_LIFE_SCOPES[k].list().forEach(function(emp){
    var st=empState(emp);
    if(st.phase==='off'&&empOffDone(emp,st)&&empLwdReached(st))empAutoAdvance(emp);
  });});
}

/* ══ EMAIL NOTIFICATIONS (FR-23) ═══════════════════════════════════════════
   Sent after the action is saved, through the app's existing notification
   feed. A failed send never undoes the action - it is only noted. */
const EMP_MAIL={
  onboarding:     {to:'Employee',subject:'Onboarding Started',
    body:'Hi {name}, your onboarding process has been started. Please complete the required onboarding activities and document uploads, where applicable.'},
  'doc-request':  {to:'Employee',subject:'Documents Required',
    body:'Hi {name}, the following documents are required for your onboarding: {docs}. Please upload them under Profile → Attachments → Requested Docs.'},
  'docs-submitted':{to:'Compliance',subject:'Documents Submitted for Verification',
    body:'Hi Team, all requested documents for {name} ({id}) have been submitted and are ready for verification.'},
  resubmitted:    {to:'Compliance',subject:'Corrected Documents Submitted',
    body:'Hi Team, the corrected/requested documents for {name} ({id}) have been uploaded and are ready for verification.'},
  'doc-rejected': {to:'Employee',subject:'Action Required: Document Rejected',
    body:'Hi {name}, {doc} has been rejected. Reason: {reason}. Please upload the corrected document under Profile → Attachments → Requested Docs.'},
  verified:       {to:'HR / IT',subject:'Verification Completed',
    body:'Hi Team, document verification has been completed for {name} ({id}). Please proceed with the remaining applicable onboarding activities.'},
  'asset-it':     {to:'Employee / HR / IT',subject:'Admin Access Setup Completed',
    body:'Hi {name}, your applicable Asset Allocation and IT Access setup has been completed. HR/IT may review the assigned records where required.'},
  active:         {to:'Employee',subject:'Onboarding Completed',
    body:'Hi {name}, your onboarding has been completed successfully and your Employee status is now Active.'},
  'cancel-onb':   {to:'Employee / HR',subject:'Onboarding Cancelled',
    body:'Hi {name}, your onboarding process has been cancelled. Your Employee status has been updated to Inactive.'},
  offboarding:    {to:'Employee / Reporting Manager',subject:'Offboarding Initiated',
    body:'Hi {name}, your offboarding process has been initiated. Last Working Date: {lwd}. Applicable exit activities will now be processed.'},
  'kt-req':       {to:'Reporting Manager',subject:'KT / Handover Required',
    body:'Hi Reporting Manager, KT / Handover is required for {name} ({id}). Please complete the applicable handover activities.'},
  'rev-req':      {to:'HR / IT',subject:'Admin Access Revocation Required',
    body:'Hi Team, please review the assigned Assets and active IT Access for {name} ({id}) and complete the applicable recovery/revocation activities.'},
  'cc-req':       {to:'Compliance',subject:'Compliance Clearance Required',
    body:'Hi Team, compliance clearance is required for {name} ({id}) as part of the offboarding process. Please complete the applicable clearance details.'},
  'fnf-req':      {to:'HR / Finance',subject:'F&F Settlement Required',
    body:'Hi Team, Full & Final Settlement is required for {name} ({id}). Please complete the applicable settlement details.'},
  inactive:       {to:'Employee',subject:'Offboarding Completed',
    body:'Hi {name}, your offboarding has been completed and your Employee status is now Inactive.'},
  'mark-inactive':{to:'Employee / HR',subject:'Employee Status Set to Inactive',
    body:'Hi {name}, your Employee status has been set to Inactive by HR.'},
  'cancel-off':   {to:'Employee / HR',subject:'Offboarding Cancelled',
    body:'Hi {name}, your offboarding process has been cancelled. Your Employee status has been restored to Active.'}
};
function empNotifyFor(emp,e){
  var keys=[];
  if(e.type==='docs-submitted')keys.push(e.resubmit?'resubmitted':'docs-submitted');
  else if(e.type==='doc-request'){if(!e.noDocs)keys.push('doc-request');}
  else if(e.type==='offboarding'){
    keys.push('offboarding','kt-req');
    if(empAssets(emp).length||empItAccess(emp).length)keys.push('rev-req');
    keys.push('cc-req','fnf-req');
  }else if(EMP_MAIL[e.type])keys.push(e.type);
  if(!keys.length)return;
  var vars={name:emp.name,id:emp.empId||'',docs:(e.docs||[]).join(', '),lwd:e.lwd?cdLabel(e.lwd):'—',
    doc:e.rejected&&e.rejected[0]?e.rejected[0].name:'',reason:e.rejected&&e.rejected[0]?e.rejected[0].reason:''};
  e.notified=keys.map(function(key){
    var t=EMP_MAIL[key];
    var subject=t.subject+' – '+emp.name+' – '+(emp.empId||'');
    var n={to:t.to,subject:subject,body:t.body.replace(/\{(\w+)\}/g,function(_,v){return vars[v]||'';}),status:'In-app'};   // no email service is connected (FR-EMS-EMP-01 §16)
    try{
      if(typeof notifData!=='undefined')notifData.unshift({name:subject,cid:emp.empId||'',sub:'In-app · For: '+t.to,time:'Just now',pending:true});
    }catch(err){n.status='Failed';}      // never reverses the saved action
    return n;
  });
}

/* ══ EMPLOYEE UPLOADS A REQUESTED DOCUMENT (FR-05, FR-07) ══════════════════
   Lands the file against the request and in the employee's attachments. If
   it was the last one outstanding, the system writes Documents Submitted. */
function empUploadRequested(kind,id,reqId,file){
  var emp=empFind(kind,id);if(!emp)return;
  var d=empReqDocs(emp).find(function(x){return x.id===reqId;});if(!d)return;
  if(file.size>5*1024*1024){showToast('File too large','error','Requested documents can be up to 5 MB.');return;}
  var s=stampNow();
  var wasRejected=d.status==='Rejected';
  d.status='Uploaded';d.file=file.name;d.size=attachFmtSize(file.size);d.uploadedAt=s.date+', '+s.time;d.reason='';
  if(!emp.attachments)emp.attachments=[];
  emp.attachments=emp.attachments.filter(function(a){return a.reqId!==d.id;});
  emp.attachments.unshift({name:file.name,size:d.size,type:attachKind(file.name),by:emp.name,
    source:'Requested Doc · '+d.name,date:s.date,reqId:d.id});
  var st=empState(emp);
  var last=st.phase==='onb'&&empDocsAllIn(emp);
  if(last){
    empPushLog(emp,{type:'docs-submitted',status:'Documents Submitted',system:true,
      resubmit:empReqDocs(emp).some(function(x){return x.wasRejected;}),
      details:[{label:'Submitted By',value:emp.name},{label:'Submitted Date/Time',value:s.date+', '+s.time}]});
    empReqDocs(emp).forEach(function(x){x.wasRejected=false;});
  }
  renderADTPage();
  showToast(wasRejected?'Replacement uploaded':'Document uploaded','success',
    last?'All requested documents are in — Documents Submitted was recorded automatically.':d.name+' · '+file.name);
}
function empPickRequested(kind,id,reqId){
  var inp=document.createElement('input');
  inp.type='file';inp.accept='.pdf,.png,.jpg,.jpeg,.doc,.docx';
  inp.addEventListener('change',function(){if(inp.files&&inp.files[0])empUploadRequested(kind,id,reqId,inp.files[0]);});
  inp.click();
}

/* ══ THE LOGS TAB ══════════════════════════════════════════════════════════
   The shared Logs layout (js/logs-view.js): the next step on top, the log
   table under it. What the lifecycle adds to a row - the documents asked
   for, the details recorded, issues, rejections, the emails sent - goes in
   its Remarks cell, under the comment. */
function empLogExtraHTML(l){
  var x=function(label,html,bad){return '<span class="lpl-rem-extra'+(bad?' is-bad':'')+'"><b>'+label+':</b> '+html+'</span>';};
  var moved=l.prev&&l.next&&l.prev!==l.next;
  return (moved?'<span class="lpl-rem-extra">'+empLifeHtml(l.prev)+' &rarr; <b>'+empLifeHtml(l.next)+'</b></span>':'')
    +(l.docs&&l.docs.length?x('Requested',l.docs.map(empLifeHtml).join(' · ')):'')
    +(l.issues&&l.issues.length?x('Issues',l.issues.map(function(p,n){
        return (n+1)+'. '+empLifeHtml(p.issue)+(p.res?' — <b>'+empLifeHtml(p.res)+'</b>':'');}).join('<br>')):'')
    +(l.rejected&&l.rejected.length?x('Rejected',l.rejected.map(function(d){
        return empLifeHtml(d.name)+(d.reason?' ('+empLifeHtml(d.reason)+')':'');}).join(' · '),true):'')
    +empLogCardHTML(l);
}
/* The details a step recorded and the emails it sent, as one card under the
   comment: the details as label / value rows, the emails as a short list -
   read down, not along one wrapped sentence. */
function empLogCardHTML(l){
  var det=l.details||[],sent=l.notified||[];
  if(!det.length&&!sent.length)return '';
  return '<div class="emp-log-card">'
    +(det.length?'<dl class="emp-log-kv">'+det.map(function(d){
        return '<div><dt>'+empLifeHtml(String(d.label).replace(/\?$/,''))+'</dt><dd>'+empLifeHtml(d.value)+'</dd></div>';
      }).join('')+'</dl>':'')
    +(sent.length?'<div class="emp-log-card-head">In-app notices &middot; '+sent.length+' &middot; email not sent: no email service is connected</div><ul class="emp-log-notif">'+sent.map(function(n){
        return '<li title="'+empLifeHtml(n.body)+'">'+EMP_ICO.mail+'<span><b>'+empLifeHtml(n.to)+'</b>'
          +'<em'+(n.status==='Failed'?' class="is-bad"':'')+'>'+empLifeHtml(n.subject.split(' – ')[0])+(n.status==='Failed'?' &middot; Failed':'')+'</em></span></li>';
      }).join('')+'</ul>':'')
    +'</div>';
}
function empTimelineHTML(emp){
  var logs=empLogs(emp).map(function(l){
    return {status:empLifeHtml(l.status),user:empLifeHtml(l.user),role:l.system?'System':'',
      date:l.date,time:l.time,action:empLifeHtml(l.action),src:l};
  });
  return lplTableHTML(logs,{rowExtra:function(r){return empLogExtraHTML(r.src);}});
}
function empDocsAlertHTML(emp){
  var out=empDocsOutstanding(emp),rej=out.filter(function(d){return d.status==='Rejected';});
  return out.length&&empState(emp).phase==='onb'
    ?'<div class="emp-log-note">'+EMP_ICO.info+'<span><b>'+out.length+' requested document'+(out.length===1?'':'s')+'</b> waiting on the employee'
      +(rej.length?' ('+rej.length+' rejected, replacement needed)':'')+'.</span></div>':'';
}
/* The step's form, in the popup. No "Add Log" picker: the step was decided
   before the popup opened (empNextStep, or the row menu's choice), so only
   its own fields and the comment are asked. */
function empFormHTML(pk,emp){
  var opts=empLogOptions(emp);
  var cur=empFormType[pk]&&opts.indexOf(empFormType[pk])>=0?empFormType[pk]:(empNextStep(emp).key||'');
  empFormType[pk]=cur;
  if(!cur)return '';
  var alert=cur==='doc-request'||cur==='verified'?empDocsAlertHTML(emp):'';
  var block=empBlockHTML(pk,emp,cur);
  return '<div class="ep-form-grid">'
    +(alert?'<div class="ep-form-group ep-form-full">'+alert+'</div>':'')
    +(block?'<div class="ep-form-group ep-form-full emp-sm-inputs"><div class="emp-log-input-wrap"><div class="emp-log-input" data-type="'+cur+'">'+block+'</div></div></div>':'')
    +'<div class="ep-form-group ep-form-full">'+empLabel('Comment',true)
      +'<textarea id="'+pk+'-log-comment-inp" class="lp-logs-form-textarea" placeholder="Say what happened"></textarea></div>'
    +'</div>';
}
/* The head of the Logs tab: the NEXT STEP and the button for it, named for
   what it does ("Start Offboarding Process"); the fields open in the popup.
   What it offers depends on who is logged in (header):
     Super Admin   - the button for the step that is due.
     Any other role - the button only for a step that role owns, plus the
                     other steps it owns that are open at the same time. A step
                     owned by someone else is a "Pending with" card, with a
                     button to switch to that role. */
/* A role someone holds here that may record a step with this owner, for
   "Switch to" (Switch Role then works as that role's holder). */
function empRoleFor(owner){
  const need=EMP_OWNER_PERMS[owner]||[];
  return emsRolesOffered().find(function(r){const p=emsRolePerms(r);return r!==emsRole()&&(p['h2r.lifecycle.all']||need.some(function(c){return p[c];}));})||'';
}
function empNextCardHTML(kind,emp){
  var n=empNextStep(emp),st=empState(emp),sa=empAllStepsRight();
  var open=function(k){return 'empOpenLogModal(\''+kind+'\','+emp.id+',\''+k+'\',\'sb\')';};
  var sel=sa?(n.key||n.exits[0]||''):(n.key&&empRoleCan(n.key)?n.key:'');
  var why=sa&&sel?empStepWhyNot(emp,sel):'';   // a step due but not open yet
  var status=empLifeHtml(emp.status);
  var chip=st.phase==='off'?'<span class="emp-phase-chip">Offboarding</span>':'';
  var alert=n.wait?empDocsAlertHTML(emp):'';
  var mine=sa?[]:n.more.concat(n.exits).filter(function(k){return empRoleCan(k);});
  /* Waiting on the employee (documents to upload): the card says so. A cancel stays
     available as an outlined button - never presented as the next step. */
  if(sa&&!n.key&&n.wait){
    var acts=n.exits.map(function(k){return {label:empLifeHtml(empStepAction(emp,k)),onclick:open(k),quiet:true,danger:true};});
    return alert+lplBarHTML(status,'<b>'+empLifeHtml(n.wait.title)+'</b>. '+empLifeHtml(n.wait.text),acts,{chip:chip,maxBtns:acts.length});
  }

  /* Nothing this role can record here: say who it is with instead. */
  if(!sel&&!mine.length){
    if(n.key){
      var owner=EMP_LOG[n.key].owner,to=empRoleFor(owner);
      return alert+lplCardHTML('wait','Pending with '+empLifeHtml(owner),
        'Next step: <b>'+empLifeHtml(empStepTitle(emp,n.key))+'</b>. Nothing for '+empLifeHtml(empRole())+' to do here yet.',
        {current:status,button:to?'<button type="button" class="btn-outline lpl-btn" onclick="setAppRole(\''+to+'\')">Switch to '+empLifeHtml(emsRoleLabel(to))+'</button>':''});
    }
    if(n.wait)return alert+lplCardHTML('wait',empLifeHtml(n.wait.title),empLifeHtml(n.wait.text),{current:status});
    return st.phase==='off'||emp.status==='Inactive'
      ?lplCardHTML('done','Nothing to log','There is no step to record for '+empLifeHtml(emp.name)+' right now.',{current:status})
      :lplCardHTML('wait','Nothing to log','There is no step to record for '+empLifeHtml(emp.name)+' right now.',{current:status});
  }

  var show=sel||mine[0];
  var sub='Next step: '+'<b>'+empLifeHtml(empStepTitle(emp,show))+'</b>'
    +' &middot; Owner <b>'+empLifeHtml(EMP_LOG[show].owner)+'</b>. '+EMP_STEP[show].hint;
  var actions=[];
  if(sel)actions.push({label:empLifeHtml(empStepAction(emp,sel)),onclick:open(sel),
    danger:!!(EMP_LOG[sel].cancel||sel==='doc-rejected'),disabled:!!why,title:why});
  /* The role's other steps open at the same time sit beside it as outlined
     buttons - the same actions the log always offered, nothing more. Only the
     step that is due is solid; a cancel is outlined in red. */
  mine.forEach(function(k){
    if(k!==sel)actions.push({label:empLifeHtml(empStepAction(emp,k)),onclick:open(k),quiet:true,danger:!!EMP_LOG[k].cancel});
  });
  return alert
    +(why?'<div class="emp-log-note">'+EMP_ICO.info+'<span>'+empLifeHtml(why)+'</span></div>':'')
    +lplBarHTML(status,sub,actions,{chip:chip,maxBtns:actions.length});
}
function renderEmpLogsTab(kind,emp){
  return '<div class="lpl emp-lpl">'+empNextCardHTML(kind,emp)+'<div class="lpl-log-list">'+empTimelineHTML(emp)+'</div></div>';
}

/* ── The Workflow tab: every step of the running process ─────────────────
   Done steps carry who recorded them, when, and the comment, from the step's
   latest log. The first step not yet done is the one in progress, pending
   with its owner (an employee upload is pending with the Employee); every
   step after it has not started. Null when no process is running. */
function empWorkflowSteps(emp){
  var m=empMilestones(emp);if(!m)return null;
  var logs=empLogs(emp),current=false;
  var ownerOf=function(x){
    if(x.key==='docs-submitted')return 'Employee';
    return (EMP_LOG[x.key]||{}).owner||'System';
  };
  return m.items.map(function(x){
    if(x.state==='done'){
      var l=logs.find(function(e){return e.type===x.key;})||{};
      return {title:x.label,user:l.user||'System',date:l.date||'',time:l.time||'',description:empLifeHtml(l.action||'Completed.')};
    }
    var owner=ownerOf(x);
    if(!current){current=true;return {title:x.label,state:'current',owner:owner,
      description:x.auto&&owner==='System'?'Set automatically once the steps before it are complete.':'Awaiting <b>'+empLifeHtml(owner)+'</b>.'};}
    return {title:x.label,state:'todo',owner:owner};
  });
}

/* ══ LISTING: STATUS TILES AND THE ACTION CELL ═════════════════════════════ */
const EMP_STAT_GROUPS={__offboarding__:'Offboarding'};
function empStatIsGroup(v){return !!EMP_STAT_GROUPS[v];}
function empStatMatch(e,v){
  if(!v)return true;
  if(v==='__offboarding__')return empState(e).phase==='off';
  return e.status===v;
}
function empStatCount(list,v){return list.filter(function(e){return empStatMatch(e,v);}).length;}
function empStatTilesHTML(list,cur,toggleFn){
  var tiles=[['Pending','Pending','wait'],['Onboarding','Onboarding','info'],['Active','Active','ok'],
             ['__offboarding__','Offboarding','wait'],['Inactive','Inactive','idle']];
  return '<div class="listing-stats">'+tiles.map(function(t){
    return '<div class="listing-stat'+(cur===t[0]?' stat-selected':'')+'" onclick="'+toggleFn+'(\''+t[0]+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-'+t[2]+'-fg)">'+empStatCount(list,t[0])+'</div>'
      +'<div class="listing-stat-label">'+t[1]+'</div></div>';
  }).join('')+'</div>';
}
function empJourneyItems(emp){
  var m=empMilestones(emp),opts=empLogOptions(emp),out=[];
  if(m){
    m.items.forEach(function(x,i){
      var can=opts.indexOf(x.key)>=0&&x.state!=='done'&&empRoleCan(x.key);
      out.push({key:x.key,label:x.label,n:i+1,state:x.state==='done'?'done':x.auto?'auto':can?'next':'wait'});
    });
    opts.forEach(function(k){
      if(m.items.some(function(x){return x.key===k;}))return;
      if(k==='doc-request')return;           // more documents: from the Logs tab
      if(!empRoleCan(k))return;
      out.push({key:k,label:EMP_LOG[k].label,state:'next',branch:true});
    });
  }else opts.forEach(function(k){out.push({key:k,label:EMP_LOG[k].label,state:empRoleCan(k)?'next':'wait',branch:!!EMP_LOG[k].cancel});});
  return out;
}
function empActionCellHTML(kind,emp){
  /* Where the record is, in the tracker's words - "Verification Pending",
     "KT / Handover Pending" - rather than the bare status beside it. */
  var label=empTrackerStatus(emp);
  var items=empJourneyItems(emp).map(function(x){
    var cls=x.state+(x.branch?' branch':'');
    var click=x.state==='next'?' onclick="empOpenLogModal(\''+kind+'\','+emp.id+',\''+x.key+'\')"':'';
    var tag=x.state==='auto'?'<em>Automatic</em>':'';
    // Plain text rows - the state is carried by the text colour alone.
    return '<div class="ct-act-item emp-act-item '+cls+'"'+click+'><span class="emp-act-label">'+empLifeHtml(x.label)+'</span>'+tag+'</div>';
  }).join('');
  var open=kind==='de'?'openDeSidebar':'openGeSidebar';
  return '<div class="ct-action-wrap">'
    /* The Contracts row button, wider here (.emp-act-btn) so the step reads
       in full; anything longer still ends in "…" with the whole on the title. */
    +'<button class="ct-action-btn emp-act-btn" title="'+empLifeHtml(label)+'" onclick="toggleEmpAction(\''+kind+'\','+emp.id+',event)"><span>'
      +empLifeHtml(label)+'</span>'+EMP_ICO.chev+'</button>'
    +'<button class="ct-dots-btn" title="View details" onclick="'+open+'('+emp.id+');event.stopPropagation()">'+EMP_ICO.dots+'</button>'
    /* Just the steps - no heading, no View Logs (the row's ☰ opens the
       panel, and its Logs tab, already). */
    +'<div class="ct-action-menu emp-act-menu" id="empm-'+kind+'-'+emp.id+'">'
      +items
    +'</div></div>';
}
function toggleEmpAction(kind,id,e){
  if(e)e.stopPropagation();
  var mid='empm-'+kind+'-'+id;
  document.querySelectorAll('.ct-action-menu').forEach(function(m){if(m.id!==mid)m.classList.remove('open');});
  var m=document.getElementById(mid);if(!m)return;
  var willOpen=!m.classList.contains('open');
  m.classList.toggle('open');
  if(willOpen&&e){var wrap=e.target.closest('.ct-action-wrap');if(wrap)placeActionMenu(m,wrap);}
}
function empOpenLogsTab(kind,id){
  document.querySelectorAll('.ct-action-menu').forEach(function(m){m.classList.remove('open');});
  if(kind==='de'){openDeSidebar(id);navDeTab('logs');}else{openGeSidebar(id);navGeTab('logs');}
}

/* ── The Add Log popup ─────────────────────────────────────────────────── */
let empStatusModal=null;     // legacy name, still cleared by navigatePage
/* from: 'sb' when Fill Details (or an Other action) in the panel's Logs tab
   opened it - the log is already on screen, so the popup does not offer it. */
function empOpenLogModal(kind,id,key,from){
  document.querySelectorAll('.ct-action-menu').forEach(function(m){m.classList.remove('open');});
  delete empFormPre[kind+'sm'];
  empLogModal={kind:kind,id:id,from:from||''};
  empFormType[kind+'sm']=key;
  renderADTPage();
  if(key==='cancel-onb'){var emp=empFind(kind,id);if(emp&&(empAssets(emp).length||empItAccess(emp).length))empShowCancelBlock(kind+'sm',emp);}
}
function closeEmpStatusModal(){empLogModal=null;renderADTPage();}
function empModalToLog(){
  var m=empLogModal;empLogModal=null;
  if(!m){renderADTPage();return;}
  empOpenLogsTab(m.kind,m.id);
  renderADTPage();
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&empLogModal&&!empAxCtx&&!document.getElementById('emp-block-pop'))closeEmpStatusModal();
});
function buildEmpStatusModalHTML(kind){return empLogModalHTML(kind)+empAxModalHTML(kind);}
function empLogModalHTML(kind){
  if(!empLogModal||empLogModal.kind!==kind)return '';
  var emp=empFind(kind,empLogModal.id);
  if(!emp){empLogModal=null;return '';}
  var pk=kind+'sm';
  var form=empFormHTML(pk,emp),k=empFormType[pk];
  /* Titled with the step itself, and its one button named for what it does -
     "Start Offboarding Process", not Submit. The x closes it. */
  var title=k?empStepTitle(emp,k):'Lifecycle';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-sm emp-sm" id="'+pk+'-body" style="width:min(600px,92vw)" role="dialog" aria-modal="true" aria-label="'+empLifeHtml(title)+'" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+empLifeHtml(title)+'</span><button class="ct-modal-close" onclick="closeEmpStatusModal()" aria-label="Close">'+EMP_ICO.close+'</button></div>'
    +'<p class="ct-modal-sub">'+empLifeHtml(emp.empId||'')+' &middot; '+empLifeHtml(emp.name)+' &middot; '+EMP_LIFE_SCOPES[kind].label+'</p>'
    +'<div class="ct-sm-move">'+empLifeBadge(emp.status)+(empState(emp).phase==='off'?'<span class="emp-phase-chip">Offboarding</span>':'')+'</div>'
    +(k?'<p class="emp-sm-hint">'+EMP_STEP[k].hint+'</p>'+form
      :'<p class="emp-sm-hint">There is no step to record for '+empLifeHtml(emp.name)+' right now.</p>')
    +'<div class="ct-modal-foot">'
      +(empLogModal.from==='sb'?'<span></span>':'<button class="add-link" onclick="empModalToLog()">View full log</button>')
      +(k&&empRoleCan(k)?'<div class="ct-modal-btns"><button class="ep-save-btn'+(EMP_LOG[k].cancel||k==='doc-rejected'?' is-danger':'')+'" onclick="empCommitLog(\''+pk+'\')">'+EMP_STEP[k].cta+'</button></div>'
        :k?'<span class="emp-next-wait">Recorded by '+empLifeHtml(EMP_LOG[k].owner)+'</span>':'')
    +'</div>'
    +'</div></div>';
}

/* ── Cancel Onboarding: the blocking popup (FR-13) ─────────────────────────
   Painted straight onto <body> rather than through renderADTPage, so the form
   underneath keeps exactly what has been typed into it. */
function empShowCancelBlock(pk,emp){
  empCloseCancelBlock();
  var a=empAssets(emp),it=empItAccess(emp);
  var n=empJs(emp.name);
  var list=function(rows){return '<ul class="emp-block-list">'+rows.map(function(r){return '<li>'+empLifeHtml(r)+'</li>';}).join('')+'</ul>';};
  var el=document.createElement('div');
  el.id='emp-block-pop';el.className='ct-modal-overlay emp-block-overlay';
  el.innerHTML='<div class="ct-modal emp-block" role="alertdialog" aria-modal="true" aria-label="Cleanup required">'
    +'<div class="emp-block-ico">'+EMP_ICO.warn+'</div>'
    +'<div class="ct-modal-title">Asset and IT Access cleanup required</div>'
    +'<p class="ct-modal-sub">Onboarding for <b>'+empLifeHtml(emp.name)+'</b> cannot be cancelled while Assets and/or IT Access are still assigned. Recover or revoke them first.</p>'
    +(a.length?'<div class="emp-block-sec"><div class="emp-block-h">'+EMP_ICO.laptop+a.length+' asset'+(a.length===1?'':'s')+' assigned</div>'
      +list(a.map(function(x){return x.name+' ('+x.code+')';}))+'</div>':'')
    +(it.length?'<div class="emp-block-sec"><div class="emp-block-h">'+EMP_ICO.key+it.length+' IT access record'+(it.length===1?'':'s')+' active</div>'
      +list(it.map(function(x){return x.system+' — '+x.login+' ('+x.status+')';}))+'</div>':'')
    +'<div class="ct-modal-foot"><div></div><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="empBlockGo(\''+n+'\','+(a.length?'1':'0')+')">Go to Assets Page</button>'
      +'<button class="ep-save-btn" onclick="empBlockContinue(\''+pk+'\')">Continue Onboarding</button>'
    +'</div></div></div>';
  document.body.appendChild(el);
}
function empCloseCancelBlock(){var el=document.getElementById('emp-block-pop');if(el)el.remove();}
function empBlockContinue(pk){empCloseCancelBlock();if(empLogModal)closeEmpStatusModal();}
function empBlockGo(name,assets){
  empCloseCancelBlock();
  if(assets)empGoAllAssets(name);else empGoAllItAccess(name);
}

/* ══ ADD ASSET / ADD IT ACCESS FROM THE LOG ════════════════════════════════
   The Admin Access module's own create popups, opened right over the
   employee's log with the employee already filled in. HR never leaves the
   record: on save the popup closes and the new asset or access is already
   listed in the section it was added from, with the log form as it was. */
let empAxCtx=null;      // {kind,id} while an Add Asset / Add IT Access popup is up from a log
function empGoAddAsset(pk){
  var emp=empPkRec(pk);if(!emp)return;
  empAxCtx={kind:empKindOf(emp),id:emp.id};
  astDraft=Object.assign(astBlankDraft(),{assignedTo:emp.name,status:'Assigned',branch:emp.branch||''});
  astEditId=null;astAddOpen='';astModalOpen=true;
  renderADTPage();
}
function empGoAddItAccess(pk){
  var emp=empPkRec(pk);if(!emp)return;
  empAxCtx={kind:empKindOf(emp),id:emp.id};
  itaDraft=Object.assign(itaBlankDraft(),{assignedTo:emp.name,login:String(emp.email||'')});
  itaEditId=null;itaAddOpen='';itaModalOpen=true;
  renderADTPage();
}
function empAxModalHTML(kind){
  if(!empAxCtx||empAxCtx.kind!==kind)return '';
  if(astModalOpen&&typeof buildAddAssetModalHTML==='function')return buildAddAssetModalHTML();
  if(itaModalOpen&&typeof buildAddItAccessModalHTML==='function')return buildAddItAccessModalHTML();
  return '';
}

/* ══ MANAGE ASSET / MANAGE IT ACCESS, AND THE WAY BACK ═════════════════════ */
let empReturn=null;     // {kind,id,type,page,sub,name}
let empNavKeep=false;
function empSetReturnFor(name){
  var emp=directEmpData.concat(globalEmpData).find(function(e){return e.name===name;});
  if(emp&&!empReturn){var kind=empKindOf(emp);
    empReturn={kind:kind,id:emp.id,page:page,sub:typeof empSubTab!=='undefined'?empSubTab:'',name:emp.name,
      type:empLogModal?empFormType[kind+'sm']||'':''};}
  empLogModal=null;
}
function empGoAllAssets(name){
  empSetReturnFor(name);
  astDeptF='';astBranchF='';astCatF='';astStatusF='';astSelectedId=null;
  /* The Assets search box is a type-ahead now and does not filter the table,
     so the employee's assets are shown through the Employee filter. */
  astEmpF=name;
  empNavKeep=true;navigatePage('asset-allocation');
}
function empGoAllItAccess(name){
  empSetReturnFor(name);
  itaSysF='';itaStatusF='';itaSelectedId=null;
  if(typeof itaTypeF!=='undefined')itaTypeF='';
  itaQ=name;
  empNavKeep=true;navigatePage('it-access');
}
/* The way back, when a lifecycle step sent HR to Assets / IT Accesses: a card
   at the top of the page - whose log, which step - with a solid button home,
   so it cannot be missed among the filters and tiles under it. */
function empReturnBarHTML(){
  if(!empReturn)return '';
  var emp=empFind(empReturn.kind,empReturn.id),first=empReturn.name.split(' ')[0];
  var step=empReturn.type&&EMP_LOG[empReturn.type]?EMP_LOG[empReturn.type].label:'';
  return '<div class="emp-return-bar">'
    +'<span class="emp-return-av">'+empLifeHtml(empInitials(empReturn.name))+'</span>'
    +'<span class="emp-return-txt"><span class="emp-return-title">Working on <b>'+empLifeHtml(empReturn.name)+'</b>’s lifecycle log'
        +(emp&&emp.empId?' <span class="emp-return-id">'+empLifeHtml(emp.empId)+'</span>':'')+'</span>'
      +'<span class="emp-return-sub">'+(step?'Step: <b>'+empLifeHtml(step)+'</b> · ':'')+'Make the changes here, then go back to record the step.</span></span>'
    +'<button type="button" class="emp-return-btn" onclick="empReturnTo()">'+EMP_ICO.back+'Back to '+empLifeHtml(first)+'’s log</button></div>';
}
function empReturnTo(){
  var r=empReturn;if(!r)return;
  empReturn=null;
  if(r.page==='employees'&&r.sub)empSubTab=r.sub;
  if(r.kind==='de'){deSelectedId=r.id;deTab='logs';}else{geSelectedId=r.id;geTab='logs';}
  empNavKeep=true;
  navigatePage(r.page==='direct'||r.page==='global'||r.page==='employees'?r.page:'employees');
  if(r.type)empOpenLogModal(r.kind,r.id,r.type,'sb');
}
/* Called by navigatePage. A redirect we started keeps its context; a plain
   sidebar click drops it. Also the moment to catch an LWD that has passed. */
function empNavHook(pg){
  var keep=empNavKeep;empNavKeep=false;
  empLogModal=null;empAxCtx=null;empCloseCancelBlock();
  empSweepLwd();
  if(!keep){
    empReturn=null;
    if(pg==='my-profile')empProfPersona=empProfOwnPersona();
  }
}

/* ══ EMPLOYEE SELF-SERVICE: DASHBOARD TRACKER (FR-21) ══════════════════════
   The Employee Dashboard belongs to one employee; empSelf is who that is. */
let empSelf={kind:'de',id:6};
let empProfPersona={kind:'',id:null};    // whose My Profile is open: always the person worked as (DT-716)
/* The person worked as: their Direct or Global employee record. Someone with neither (Admin Access staff,
   a client user) has an account profile only - never another person's record. */
function empProfOwnPersona(){
  var e=typeof emsActorRecord==='function'?emsActorRecord():null,k=e&&typeof idEmpKind==='function'?idEmpKind(e):'';
  return (k==='de'||k==='ge')?{kind:k,id:e.id}:{kind:'',id:null};
}
function empProfAccountOnly(){return !empProfPersona||!empProfPersona.kind;}
function empSelfRec(){return empFind(empSelf.kind,empSelf.id);}
function empPendingAction(emp,m){
  var out=empDocsOutstanding(emp),st=empState(emp);
  if(m.phase==='onb'){
    if(out.length)return {upload:true,title:'Document Upload Pending',
      text:out.length+' document'+(out.length===1?' is':'s are')+' waiting for you'
        +(out.some(function(d){return d.status==='Rejected';})?' — including a rejected document that needs a replacement':'')+'.'};
    if(!st.onb.docReq)return {title:'Waiting for HR',text:'HR will let you know which documents to upload.'};
    if(!st.onb.verified&&!st.onb.assetIt)return {title:'In progress',text:'Compliance is verifying your documents while HR / IT set up your assets and system access.'};
    if(!st.onb.verified)return {title:'Verification Pending',text:'Your documents are with Compliance for verification.'};
    if(!st.onb.assetIt)return {title:'Asset & IT Setup Pending',text:'HR / IT are allocating your assets and system access.'};
    return {title:'Almost there',text:'You will become Active automatically.'};
  }
  var left=m.items.filter(function(x){return x.state==='pending'&&!x.auto;}).map(function(x){return x.label;});
  return {title:empTrackerStatus(emp),text:left.length?'Waiting for: '+left.join(', ')+'.'
    :'Every exit activity is complete. You become Inactive automatically'+(st.off.lwd?' on your Last Working Date, '+cdLabel(st.off.lwd):'')+'.'};
}
function empDashTrackerHTML(){
  var emp=empSelfRec();if(!emp)return '';
  var m=empMilestones(emp);
  if(!m)return '';          // no onboarding or offboarding running - no tracker
  var act=empPendingAction(emp,m);
  /* Progress is said once, in the header (stage count + status); the big
     "25%" row that repeated it is gone. The bar and the boxed stage cards are
     the original design - a connected-dot stepper was tried here and
     reverted at the user's request. */
  return '<div class="hr-section emp-trk">'
    +'<div class="hr-section-header"><div class="hr-section-title">'+m.title+'</div>'
      +'<span class="emp-trk-status"><span class="emp-trk-count">Stage '+Math.min(m.done+1,m.total)+' of '+m.total+'</span>'
      +empLifeBadge(empTrackerStatus(emp))+'</span></div>'
    +'<div class="emp-trk-bar"><span style="width:'+m.pct+'%"></span></div>'
    +'<div class="emp-trk-steps" style="--n:'+m.stages.length+'">'+m.stages.map(function(x,i){
      return '<div class="emp-trk-step is-'+x.state+'">'
        +'<span class="emp-trk-dot">'+(x.state==='done'?EMP_ICO.tick:(i+1))+'</span>'
        +'<span class="emp-trk-lbl">'+empLifeHtml(x.label)+'</span>'
        +(x.subs?'<ul class="emp-trk-subs">'+x.subs.map(function(t){
            return '<li class="is-'+t.state+'">'+(t.state==='done'?EMP_ICO.tick:'<span class="emp-trk-subdot"></span>')+empLifeHtml(t.label)+'</li>';
          }).join('')+'</ul>':'')
        +'</div>';
    }).join('')+'</div>'
    /* Only an action the employee can take gets a row here (FR-06): the
       Upload Documents button. Waiting on other teams is already said by
       Current Status and the milestone cards. */
    +(act.upload?'<div class="emp-trk-action is-upload">'
      +'<div class="emp-trk-action-ico">'+EMP_ICO.upload+'</div>'
      +'<div class="emp-trk-action-txt"><div class="emp-trk-action-title">'+empLifeHtml(act.title)+'</div><div class="emp-trk-action-sub">'+empLifeHtml(act.text)+'</div></div>'
      +'<button class="ep-save-btn emp-trk-btn" onclick="empGoRequestedDocs()">'+EMP_ICO.upload+'Upload Documents</button>'
    +'</div>':'')
    +'</div>';
}
/* FR-01: each pending lifecycle step, with its Owner, in Action Required. */
function empActionRowsHTML(emp){
  var m=empMilestones(emp);if(!m)return '';
  var rows=[];
  var out=empDocsOutstanding(emp);
  if(m.phase==='onb'&&out.length)rows.push({item:'Upload Requested Documents',owner:'Employee',btn:'<button class="hr-action-btn neutral" onclick="empGoRequestedDocs()">Upload</button>'});
  m.items.forEach(function(x){
    if(x.state!=='pending')return;
    if(x.key==='docs-submitted'&&out.length)return;     // that is the upload row above
    rows.push({item:x.label,owner:EMP_LOG[x.key].owner});
  });
  return rows.map(function(r){
    return '<tr data-emp-life="1"><td><span class="hr-emp-name">'+empLifeHtml(r.item)+'</span></td>'
      +'<td style="color:var(--gray)">'+m.title+' · Owner: '+empLifeHtml(r.owner)+'</td>'
      +'<td style="color:var(--gray)">—</td>'
      +'<td><span class="lp-status-badge pending">Pending</span></td>'
      +'<td>'+(r.btn||'')+'</td></tr>';
  }).join('');
}
/* Demo switch in the profile menu (js/dash-preview.js): off shows the
   dashboard as it is once the lifecycle has finished - no tracker, and no
   lifecycle rows in Action Required. */
var empTrackerShow=true;
function empDashRender(root){
  var scope=(root||document);
  var host=scope.querySelector?scope.querySelector('#emp-life-dash'):null;
  if(!host)return;
  /* The clip wrapper is what lets the tracker collapse smoothly: the host
     animates its one grid row from 1fr to 0fr and the wrapper (no padding of
     its own) shrinks to nothing with it. */
  var html=empDashTrackerHTML();
  host.innerHTML=html?'<div class="emp-life-clip">'+html+'</div>':'';
  host.classList.toggle('is-off',!empTrackerShow);
  var emp=empSelfRec();
  var view=host.closest('#employee-view');
  var desc=view&&view.querySelector('.hr-header-desc');
  empDashActionRows(view,false);
  if(typeof fillDashHeaders==='function')fillDashHeaders();
  empDashSummary(view);
}
/* The header's line under the greeting counts what is actually waiting in
   Action Required, so it changes as the employee clears things. */
function empDashSummary(view){
  var desc=view&&view.querySelector('.hr-header-desc');
  if(!desc)return;
  var sec=Array.prototype.find.call(view.querySelectorAll('.hr-section'),function(s){
    var t=s.querySelector('.hr-section-title');return t&&t.textContent.trim()==='Action Required';});
  var n=sec?sec.querySelectorAll('tbody tr:not(.dp-row-out)').length:0;
  desc.textContent=n?'You have '+n+' thing'+(n===1?'':'s')+' waiting on you today.':'You’re all caught up — nothing needs you today.';
}
/* Action Required: the employee's lifecycle rows sit above the seeded ones,
   while the lifecycle is running. `animate` fades them in or out when the
   demo switch flips; a plain render just places them. */
function empDashActionRows(view,animate){
  var emp=empSelfRec();
  if(!view||!emp)return;
  var sec=Array.prototype.find.call(view.querySelectorAll('.hr-section'),function(s){
    var t=s.querySelector('.hr-section-title');return t&&t.textContent.trim()==='Action Required';});
  var tb=sec&&sec.querySelector('tbody');
  if(!tb)return;
  var old=tb.querySelectorAll('tr[data-emp-life]');
  if(!empTrackerShow){
    if(!animate){old.forEach(function(r){r.remove();});return;}
    old.forEach(function(r){r.classList.add('dp-row-out');});
    empDashSummary(view);
    setTimeout(function(){old.forEach(function(r){r.remove();});},260);
    return;
  }
  old.forEach(function(r){r.remove();});
  tb.insertAdjacentHTML('afterbegin',empActionRowsHTML(emp)+(typeof epKycRowHTML==='function'?epKycRowHTML(emp):''));
  if(animate)empDashSummary(view);
  if(animate)tb.querySelectorAll('tr[data-emp-life]').forEach(function(r,i){
    r.classList.add('dp-row-in');r.style.animationDelay=(120+i*45)+'ms';
  });
}
function empGoRequestedDocs(){
  empProfPersona={kind:empSelf.kind,id:empSelf.id};
  profTab='attachments';
  empNavKeep=true;
  navigatePage('my-profile');
  setTimeout(function(){
    var el=document.getElementById('prof-reqdocs');
    if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('emp-flash');setTimeout(function(){el.classList.remove('emp-flash');},1600);}
  },60);
}

/* ══ EMPLOYEE SELF-SERVICE: PROFILE → ATTACHMENTS → REQUESTED DOCS (FR-05) ══ */
function empProfRec(){return empFind(empProfPersona.kind,empProfPersona.id);}
function empProfReqDocsHTML(){
  var emp=empProfRec();if(!emp)return '';
  var docs=empReqDocs(emp);
  if(!docs.length)return '';                 // zero requested: the section stays hidden
  var kind=empKindOf(emp);
  var up=docs.filter(function(d){return d.status==='Uploaded'||d.status==='Accepted';}).length;
  return '<div class="ep-form-card emp-rq" id="prof-reqdocs" style="margin-bottom:16px">'
    +'<div class="prof-section-hdr"><span class="policy-section-title">Requested Docs</span>'
      +'<span class="prof-att-count'+(up===docs.length?' ok':'')+'">'+up+' of '+docs.length+' uploaded</span></div>'
    +'<p class="emp-rq-sub">HR has asked for the documents below to continue your onboarding. PDF, JPG, PNG or Word, up to 5 MB each.</p>'
    +'<div class="emp-rq-list">'+docs.map(function(d){
      var can=d.status==='Pending Upload'||d.status==='Rejected';
      return '<div class="emp-rq-row is-'+statusClass(d.status)+'">'
        +'<span class="emp-rq-ico">'+EMP_ICO.doc+'</span>'
        +'<div class="emp-rq-body"><div class="emp-rq-name">'+empLifeHtml(d.name)+'<span class="emp-rq-type">'+empLifeHtml(d.type)+'</span></div>'
          +(d.file?'<div class="emp-rq-file">'+empLifeHtml(d.file)+(d.size?' · '+d.size:'')+(d.uploadedAt?' · Uploaded '+empLifeHtml(d.uploadedAt):'')+'</div>':'')
          +(d.status==='Rejected'?'<div class="emp-rq-reason">'+EMP_ICO.warn+'Rejection Reason: '+empLifeHtml(d.reason||'—')+(d.prevFile?' ('+empLifeHtml(d.prevFile)+')':'')+'</div>':'')
        +'</div>'
        +empDocBadge(d.status)
        +(can?'<button class="'+(d.status==='Rejected'?'ep-save-btn':'ep-cancel-btn')+' emp-rq-btn" onclick="empPickRequested(\''+kind+'\','+emp.id+',\''+d.id+'\')">'
          +EMP_ICO.upload+(d.status==='Rejected'?'Re-upload':'Upload')+'</button>':'<span class="emp-rq-btn-ph"></span>')
        +'</div>';
    }).join('')+'</div></div>';
}
/* What the profile hero and Basic Details read. Pallavi Parate is the
   signed-in admin and keeps her full profile; anyone else is shown from
   their employee record. */
function empProfPerson(){
  var emp=empProfRec();
  if(!emp||(empProfPersona.kind==='de'&&empProfPersona.id===2))return null;
  return emp;
}
/* Pallavi Parate's full profile is the original design; it shows only to Pallavi herself. */
function empProfIsDesignOwner(){
  if(!empProfPersona||empProfPersona.kind!=='de'||empProfPersona.id!==2)return false;
  var me=typeof emsActorRecord==='function'?emsActorRecord():null,emp=empProfRec();
  return !!me&&!!emp&&me.eid===emp.eid;
}
const empProfDocStore={};
function profAttachMap(){
  var p=empProfPerson();
  if(!p)return profAttachments;
  var k=empKindOf(p)+p.id;
  return empProfDocStore[k]||(empProfDocStore[k]={});
}
function empInitials(name){
  var w=String(name||'').trim().split(/\s+/);
  return ((w[0]||'')[0]||'').toUpperCase()+(w.length>1?(w[w.length-1][0]||'').toUpperCase():'');
}

/* ══ SEEDED HISTORIES ══════════════════════════════════════════════════════
   Newest first. Built from the same log types a person picks, so every
   record already sits at a real point in the journey. */
const EMP_OWNER_USER={'HR':'Pallavi Parate','Compliance':'Tarak Swain','HR / IT':'Shaun Mathew',
  'HR / Finance':'Pallavi Parate','Reporting Manager':'Rajan Kumar'};
function L(type,date,time,action,o){
  o=o||{};
  var t=EMP_LOG[type];
  return Object.assign({type:type,status:t.label,date:date,time:time,
    user:t.system?'System':(o.user||EMP_OWNER_USER[t.owner]||'Pallavi Parate'),
    action:t.system?EMP_SYS_COMMENT:action,system:!!t.system},o.extra||{});
}
function D(label,value){return {label:label,value:value};}
const EMP_LIFE_SEED={
  de:{
    1:[
      L('active','15 Jan 2025','09:05:00 AM','',{extra:{details:[D('Performed By','System'),D('Onboarding','Completed')]}}),
      L('asset-it','14 Jan 2025','04:20:00 PM','Dell Latitude handed over; Microsoft 365 and Jira access granted.',{extra:{details:[D('Asset Allocation','LT-001'),D('IT Access','Microsoft 365, Jira')]}}),
      L('verified','13 Jan 2025','11:10:00 AM','All four documents checked against originals.'),
      L('docs-submitted','12 Jan 2025','06:05:00 PM','',{extra:{details:[D('Submitted By','Antar Malhotra'),D('Submitted Date/Time','12 Jan 2025, 06:05:00 PM')]}}),
      L('doc-request','08 Jan 2025','10:00:00 AM','Standard joining documents requested.',{extra:{docs:['Aadhaar Card Front','PAN Card','Educational Certificates','Cancelled Cheque / Bank Passbook']}}),
      L('onboarding','08 Jan 2025','09:30:00 AM','Offer accepted. Date of Joining set to 15 Jan 2025.')
    ],
    2:[
      L('active','20 Mar 2024','10:15:00 AM','',{extra:{details:[D('Performed By','System'),D('Onboarding','Completed')]}}),
      L('asset-it','19 Mar 2024','05:40:00 PM','Laptop assigned; HRMS and Microsoft 365 access granted.'),
      L('verified','18 Mar 2024','12:20:00 PM','Records carried over from the group entity verified.'),
      L('doc-request','13 Mar 2024','11:00:00 AM','Internal transfer — documents already on file with the group.',{extra:{noDocs:true,details:[D('Required Documents','No Documents Required')]}}),
      L('onboarding','12 Mar 2024','10:00:00 AM','Internal transfer from the group entity. Date of Joining set to 20 Mar 2024.')
    ],
    /* Mid-offboarding: KT done; MacBook and GitHub still to recover. */
    3:[
      L('kt','01 Oct 2026','04:10:00 PM','Payments service and release checklist handed over to Aman.',{extra:{details:[D('Handover To','Aman Singh'),D('Handover Type','Project(s)'),D('Documents Handed Over','Yes'),D('Outstanding Work Handed Over','Yes'),D('Knowledge Transfer Completed','Yes'),D('Handover Document / Reference','Confluence › Payments › Handover')]}}),
      L('offboarding','25 Sep 2026','10:00:00 AM','Resignation accepted. Serving notice until 15 Oct 2026.',{extra:{lwd:'2026-10-15',details:[D('Separation Type','Voluntary'),D('Last Working Date','15 Oct 2026'),D('Access Revocation Effective Date','15 Oct 2026'),D('Access Revocation Effective Time','6:00 PM')]}}),
      L('active','05 Jun 2024','11:30:00 AM','',{extra:{details:[D('Performed By','System'),D('Onboarding','Completed')]}}),
      L('asset-it','04 Jun 2024','06:00:00 PM','GitHub access granted. Laptop to follow from the July batch.'),
      L('verified','03 Jun 2024','10:45:00 AM','Documents verified on the first pass.'),
      L('docs-submitted','31 May 2024','08:20:00 PM','',{extra:{details:[D('Submitted By','Anika Shah')]}}),
      L('doc-request','29 May 2024','09:30:00 AM','Fixed-term joining documents requested.',{extra:{docs:['Aadhaar Card Front','PAN Card','Cancelled Cheque / Bank Passbook']}}),
      L('onboarding','28 May 2024','09:15:00 AM','Fixed-term engagement. Date of Joining set to 05 Jun 2024.')
    ],
    4:[
      L('inactive','12 Feb 2025','02:00:00 PM','',{extra:{details:[D('Performed By','System'),D('Offboarding','Completed')]}}),
      L('fnf','12 Feb 2025','01:55:00 PM','Final settlement paid by bank transfer.',{extra:{details:[D('Salary Till LWD','84,000'),D('Leave Encashment','22,500'),D('Net Settlement Amount','1,06,500'),D('Payment Mode','Bank Transfer')]}}),
      L('compliance','11 Feb 2025','05:00:00 PM','Nothing outstanding.',{extra:{details:[D('Compliance Requirement / Reference','NDA acknowledgement'),D('Outstanding Issue?','No'),D('Cleared By','Tarak Swain')]}}),
      L('asset-rev','11 Feb 2025','04:30:00 PM','Laptop returned; all accounts disabled.',{extra:{details:[D('Assets','No Assigned Assets'),D('IT Access','No Active IT Access')]}}),
      L('kt','10 Feb 2025','03:00:00 PM','Roadmap and stakeholder notes handed over.',{extra:{details:[D('Handover To','Antar Malhotra'),D('Handover Type','Project(s)')]}}),
      L('offboarding','05 Feb 2025','10:00:00 AM','Resignation accepted.',{extra:{lwd:'2025-02-11',details:[D('Separation Type','Voluntary'),D('Last Working Date','11 Feb 2025')]}}),
      L('active','01 Feb 2024','09:00:00 AM','',{extra:{details:[D('Performed By','System')]}}),
      L('asset-it','31 Jan 2024','05:10:00 PM','Laptop assigned; product tools access granted.'),
      L('verified','30 Jan 2024','11:00:00 AM','Documents verified on the first pass.'),
      L('doc-request','26 Jan 2024','10:00:00 AM','Documents already on file.',{extra:{noDocs:true}}),
      L('onboarding','25 Jan 2024','09:30:00 AM','Date of Joining set to 01 Feb 2024.')
    ],
    /* Verified and waiting on HR / IT: holds a keyboard and Slack, so Asset
       Allocation & IT Access Completed can be logged - and that tips him to
       Active automatically. */
    5:[
      L('verified','05 Sep 2026','03:05:00 PM','All documents checked; no issues.',{extra:{details:[D('Accepted Documents','Aadhaar Card Front, PAN Card, Relieving Letter')]}}),
      L('docs-submitted','03 Sep 2026','08:10:00 PM','',{extra:{details:[D('Submitted By','Dev Kulkarni'),D('Submitted Date/Time','3 Sep 2026, 08:10:00 PM')]}}),
      L('doc-request','26 Aug 2026','11:00:00 AM','Joining documents requested.',{extra:{docs:['Aadhaar Card Front','PAN Card','Relieving Letter']}}),
      L('onboarding','25 Aug 2026','09:40:00 AM','Offer accepted. Date of Joining set to 10 Sep 2026.')
    ],
    /* The Employee Dashboard's employee: one document in, three owed. */
    6:[
      L('doc-request','03 Sep 2026','10:15:00 AM','Joining documents requested. Please upload before your joining date.',{extra:{docs:['PAN Card','Aadhaar Card Front','Aadhaar Card Back','Passport Photograph','Cancelled Cheque / Bank Passbook','Educational Certificates']}}),
      L('onboarding','02 Sep 2026','09:15:00 AM','Offer accepted. Date of Joining set to 15 Sep 2026.')
    ],
    7:[
      L('pending','04 Oct 2026','05:30:00 PM','Employee created as Pending. Onboarding will start once the joining date is confirmed.')
    ]
  },
  ge:{
    1:[
      L('active','10 Feb 2024','09:00:00 AM','',{extra:{details:[D('Performed By','System')]}}),
      L('asset-it','09 Feb 2024','03:30:00 PM','Laptop shipped; Germany entity accounts created.'),
      L('verified','07 Feb 2024','01:15:00 PM','Work permit re-submitted and accepted.'),
      L('docs-submitted','06 Feb 2024','06:45:00 PM','',{extra:{details:[D('Submitted By','Emma Schmidt')]}}),
      L('doc-rejected','05 Feb 2024','11:00:00 AM','Work permit scan was cut off at the bottom.',{extra:{rejected:[{name:'Work Permit / Visa',reason:'Incomplete / Missing Pages'}]}}),
      L('docs-submitted','04 Feb 2024','07:30:00 PM','',{extra:{details:[D('Submitted By','Emma Schmidt')]}}),
      L('doc-request','02 Feb 2024','10:00:00 AM','EOR joining documents requested.',{extra:{docs:['Passport','Work Permit / Visa','Bank Statement']}}),
      L('onboarding','01 Feb 2024','10:20:00 AM','EOR onboarding initiated via Dhi. Date of Joining set to 10 Feb 2024.')
    ],
    2:[
      L('active','15 Apr 2024','10:30:00 AM','',{extra:{details:[D('Performed By','System')]}}),
      L('asset-it','12 Apr 2024','05:00:00 PM','France entity accounts created.'),
      L('verified','10 Apr 2024','11:40:00 AM','Documents verified for the France entity.'),
      L('docs-submitted','08 Apr 2024','07:30:00 PM','',{extra:{details:[D('Submitted By','Lucas Dubois')]}}),
      L('doc-request','05 Apr 2024','10:00:00 AM','EOR joining documents requested.',{extra:{docs:['Passport','Bank Statement']}}),
      L('onboarding','04 Apr 2024','09:45:00 AM','EOR onboarding initiated. Date of Joining set to 15 Apr 2024.')
    ],
    3:[
      L('active','01 Mar 2024','09:00:00 AM','',{extra:{details:[D('Performed By','System')]}}),
      L('asset-it','29 Feb 2024','04:10:00 PM','Contractor — no company assets.',{extra:{details:[D('Asset Allocation','Skipped'),D('IT Access','Jira')]}}),
      L('verified','27 Feb 2024','10:50:00 AM','Contractor documentation verified for the Italy entity.'),
      L('doc-request','21 Feb 2024','10:00:00 AM','Contractor — identity already verified by the agency.',{extra:{noDocs:true,details:[D('Required Documents','No Documents Required')]}}),
      L('onboarding','20 Feb 2024','09:10:00 AM','Contractor onboarding initiated. Start date set to 01 Mar 2024.')
    ],
    4:[
      L('inactive','05 Jan 2025','03:00:00 PM','',{extra:{details:[D('Performed By','System'),D('Offboarding','Completed')]}}),
      L('fnf','05 Jan 2025','02:40:00 PM','Final settlement processed through UK payroll.',{extra:{details:[D('Net Settlement Amount','4,820'),D('Payment Mode','Bank Transfer')]}}),
      L('compliance','04 Jan 2025','05:20:00 PM','Right-to-work file closed.',{extra:{details:[D('Compliance Requirement / Reference','Right-to-work file'),D('Outstanding Issue?','No'),D('Cleared By','Tarak Swain')]}}),
      L('asset-rev','03 Jan 2025','04:00:00 PM','Laptop couriered back; UK entity access revoked.'),
      L('kt','02 Jan 2025','03:00:00 PM','Ops runbooks handed over.'),
      L('offboarding','20 Dec 2024','10:00:00 AM','Contract end confirmed.',{extra:{lwd:'2025-01-02',details:[D('Separation Type','Contract End'),D('Last Working Date','2 Jan 2025')]}}),
      L('active','01 Feb 2024','09:00:00 AM','',{extra:{details:[D('Performed By','System')]}}),
      L('asset-it','31 Jan 2024','04:00:00 PM','UK entity accounts and laptop provided.'),
      L('verified','29 Jan 2024','12:30:00 PM','Right-to-work verified.'),
      L('doc-request','23 Jan 2024','10:00:00 AM','Documents on file.',{extra:{noDocs:true}}),
      L('onboarding','22 Jan 2024','09:20:00 AM','EOR onboarding initiated. Date of Joining set to 01 Feb 2024.')
    ],
    /* Codice Fiscale rejected; Passport already accepted. */
    5:[
      L('doc-rejected','03 Sep 2026','11:20:00 AM','The Codice Fiscale scan is unreadable — please upload a clearer copy.',{extra:{rejected:[{name:'Codice Fiscale',reason:'Illegible / Unreadable'}],details:[D('Rejected Document','Codice Fiscale'),D('Rejection Reason','Illegible / Unreadable')]}}),
      L('docs-submitted','01 Sep 2026','07:40:00 PM','',{extra:{details:[D('Submitted By','Marco Rossi'),D('Submitted Date/Time','1 Sep 2026, 07:40:00 PM')]}}),
      L('doc-request','29 Aug 2026','10:30:00 AM','Italy EOR joining documents requested.',{extra:{docs:['Passport','Codice Fiscale','Educational Certificates','Bank Statement']}}),
      L('onboarding','28 Aug 2026','10:05:00 AM','EOR onboarding initiated for the Italy entity. Date of Joining set to 21 Sep 2026.')
    ],
    /* Everything is in and waiting on Compliance to accept or reject. */
    6:[
      L('docs-submitted','01 Sep 2026','12:35:00 PM','',{extra:{details:[D('Submitted By','Ana Silva'),D('Submitted Date/Time','1 Sep 2026, 12:35:00 PM')]}}),
      L('doc-request','27 Aug 2026','11:00:00 AM','Portugal EOR joining documents requested.',{extra:{docs:['Passport','NIF Certificate','Bank Statement']}}),
      L('onboarding','26 Aug 2026','09:25:00 AM','EOR onboarding initiated for the Portugal entity. Date of Joining set to 14 Sep 2026.')
    ]
  }
};
/* The requested documents behind those histories. */
function RQ(docId,status,file,o){
  var d=empDocDef(docId);
  return Object.assign({id:'rq'+(++empReqSeq),docId:docId,name:d.name,type:d.type,status:status,file:file||'',
    size:file?'184 KB':'',requestedAt:'',uploadedAt:''},o||{});
}
const EMP_REQ_SEED={
  de:{
    1:[RQ('aadhaar-front','Accepted','aadhaar_antar.pdf'),RQ('pan','Accepted','pan_antar.pdf'),RQ('qualification','Accepted','btech_degree.pdf'),RQ('cheque','Accepted','cheque_icici.jpg')],
    3:[RQ('aadhaar-front','Accepted','anika_aadhaar.pdf'),RQ('pan','Accepted','anika_pan.pdf'),RQ('cheque','Accepted','anika_cheque.jpg')],
    5:[RQ('aadhaar-front','Accepted','dev_aadhaar.pdf',{uploadedAt:'2 Sep 2026',acceptedBy:'Tarak Swain'}),RQ('pan','Accepted','dev_pan.pdf',{uploadedAt:'2 Sep 2026',acceptedBy:'Tarak Swain'}),RQ('relieving','Accepted','dev_relieving_letter.pdf',{uploadedAt:'3 Sep 2026',acceptedBy:'Tarak Swain'})],
    6:[RQ('pan','Pending Upload','',{requestedAt:'3 Sep 2026'}),
       RQ('aadhaar-front','Uploaded','meera_aadhaar_front.pdf',{requestedAt:'3 Sep 2026',uploadedAt:'4 Sep 2026, 08:12:00 PM'}),
       RQ('aadhaar-back','Pending Upload','',{requestedAt:'3 Sep 2026'}),RQ('photo','Pending Upload','',{requestedAt:'3 Sep 2026'}),
       RQ('cheque','Pending Upload','',{requestedAt:'3 Sep 2026'}),RQ('qualification','Pending Upload','',{requestedAt:'3 Sep 2026'})]
  },
  ge:{
    1:[RQ('passport','Accepted','emma_passport.pdf'),RQ('permit','Accepted','emma_work_permit_v2.pdf'),RQ('bankstmt','Accepted','emma_bank.pdf')],
    2:[RQ('passport','Accepted','lucas_passport.pdf'),RQ('bankstmt','Accepted','lucas_bank.pdf')],
    5:[RQ('passport','Accepted','marco_passport.pdf',{uploadedAt:'30 Aug 2026, 06:10:00 PM',acceptedBy:'Tarak Swain',acceptedAt:'3 Sep 2026, 11:15:00 AM'}),
       RQ('codice','Rejected','',{reason:'Illegible / Unreadable',prevFile:'codice_fiscale_scan.jpg',requestedAt:'29 Aug 2026',wasRejected:true}),
       RQ('qualification','Uploaded','marco_laurea.pdf',{uploadedAt:'31 Aug 2026, 09:40:00 PM'}),
       RQ('bankstmt','Uploaded','marco_bank_statement.pdf',{uploadedAt:'1 Sep 2026, 07:40:00 PM'})],
    6:[RQ('passport','Uploaded','ana_passport.pdf',{uploadedAt:'30 Aug 2026, 05:50:00 PM'}),
       RQ('nif','Uploaded','ana_nif.pdf',{uploadedAt:'31 Aug 2026, 10:05:00 AM'}),
       RQ('bankstmt','Uploaded','ana_bank.pdf',{uploadedAt:'1 Sep 2026, 12:35:00 PM'})]
  }
};

/* Settle every record onto its log once, at load: requested documents in
   place, uploaded files in the employee's attachments, and emp.status
   matching what the log says. */
(function(){
  function kindOf(n){
    var e=String(n).split('.').pop().toLowerCase();
    return e==='pdf'?'PDF':/^(png|jpe?g)$/.test(e)?'Image':'Document';
  }
  ['de','ge'].forEach(function(kind){
    EMP_LIFE_SCOPES[kind].list().forEach(function(emp){
      empLogs(emp);
      emp.reqDocs=((EMP_REQ_SEED[kind]||{})[emp.id]||[]).map(function(d){return Object.assign({},d);});
      emp.reqDocs.forEach(function(d){
        if(d.file&&(d.status==='Uploaded'||d.status==='Accepted')){
          if(!emp.attachments)emp.attachments=[];
          emp.attachments.push({name:d.file,size:d.size,type:kindOf(d.file),by:emp.name,source:'Requested Doc · '+d.name,date:'',reqId:d.id});
        }
      });
      emp.status=empState(emp).status;
    });
  });
})();
