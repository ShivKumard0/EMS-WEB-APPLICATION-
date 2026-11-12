/* ══ EMPLOYEE PROFILE: VIEW AND EDIT (FR-EMS-EMP-01 §4-§7, 8 Nov 2026) ══════
   One profile, one edit, for every employee however they were created (the
   wizard or Bulk Upload Employees):

   - HR / Company Admin / Super Admin: Employees → employee → Edit. Needs
     h2r.employee.manage and the employee's own company. Every field except the
     Employee ID and the lifecycle status.
   - The employee: My Profile → Edit Profile (h2r.employee.own, own record
     only). Contact details are saved straight away; identity details (name,
     gender, date of birth, nationality) become a correction for HR to approve;
     employment details are read-only.

   Values are checked against the same lists the wizard and the company use
   (Company Structure for departments and designations). Only changed fields
   are written; each save adds a Logs entry and History records the fields.
   A change to a detail Card KYC reuses (name, email, mobile, gender, date of
   birth, nationality) after the employee accepted the card declarations
   withdraws that acceptance: the employee confirms the declarations again
   themselves. Existing approved transactions and history are never touched. */

const EP_FIELDS=[
  {k:'fname',label:'First Name',type:'text',req:1,self:'request',sec:'p'},
  {k:'lname',label:'Last Name',type:'text',req:1,self:'request',sec:'p'},
  {k:'email',label:'Work Email',type:'email',req:1,self:'view',sec:'p'},
  {k:'dial',label:'Country Dial Code',type:'select',opts:function(){return EA_DIAL_CODES;},req:1,self:'edit',sec:'p'},
  {k:'phone',label:'Mobile Number',type:'tel',req:1,self:'edit',sec:'p'},
  {k:'gender',label:'Gender',type:'select',opts:function(){return EA_GENDERS;},req:1,self:'request',sec:'p'},
  {k:'dob',label:'Date of Birth',type:'isodate',req:1,self:'request',sec:'p'},
  {k:'nationality',label:'Nationality',type:'select',opts:function(){return EA_NATIONALITIES;},req:1,self:'request',sec:'p'},
  {k:'idProofs',label:'ID Proof Types',type:'chips',opts:function(){return EA_ID_PROOFS;},req:1,self:'view',sec:'p',full:1},
  {k:'doj',label:'Date of Joining',type:'isodate',req:1,self:'view',sec:'w'},
  {k:'empType',label:'Employment Type',type:'select',opts:function(){return EA_EMP_TYPES;},req:1,self:'view',sec:'w'},
  {k:'dept',label:'Department',type:'select',opts:function(){return typeof csDeptNames==='function'?csDeptNames():EA_DEPTS;},req:1,self:'view',sec:'w'},
  {k:'designation',label:'Designation',type:'select',opts:function(){return typeof csDesigNames==='function'?csDesigNames():EA_DESIGNATIONS;},req:1,self:'view',sec:'w'},
  {k:'manager',label:'Reporting Manager',type:'manager',self:'view',sec:'w'},
  {k:'location',label:'Work Location',type:'select',opts:function(){return EA_LOCATIONS;},req:1,self:'view',sec:'w',only:'de'},
  {k:'country',label:'Country of Work',type:'select',opts:function(){return EA_COUNTRIES;},req:1,self:'view',sec:'w',only:'ge'},
  {k:'workerType',label:'Worker Type',type:'select',opts:function(){return EA_WORKER_TYPES;},req:1,self:'view',sec:'w',only:'ge'}
];
/* Details Card KYC reuses from the employee record (js/onc-enrollment.js oncReused). */
const EP_KYC_KEYS=['fname','lname','email','dial','phone','gender','dob','nationality'];
function epField(k){return EP_FIELDS.find(function(f){return f.k===k;});}
function epKind(emp){return typeof idEmpKind==='function'?idEmpKind(emp):'de';}
function epFieldsFor(emp){const kind=epKind(emp);return EP_FIELDS.filter(function(f){return !f.only||f.only===kind;});}

/* ── The record as the form's values ──────────────────────────────────── */
function epVals(emp){
  const parts=String(emp.name||'').trim().split(/\s+/);
  const c=String(emp.contact||'').replace(/^--$/,'').trim(),m=/^(\+\d{1,4})\s*(.*)$/.exec(c);
  return {fname:parts[0]||'',lname:parts.slice(1).join(' '),email:emp.email&&emp.email!=='--'?emp.email:'',
    dial:m?m[1]:'',phone:(m?m[2]:c).replace(/[\s-]/g,''),gender:emp.gender||'',dob:emp.dob||'',nationality:emp.nationality||'',
    idProofs:(emp.idProofs||[]).slice(),doj:typeof sbDateToISO==='function'?sbDateToISO(emp.joinDate):'',empType:emp.desc&&emp.desc!=='--'?emp.desc:'',
    dept:emp.dept&&emp.dept!=='--'?emp.dept:'',designation:emp.jobTitle&&emp.jobTitle!=='--'?emp.jobTitle:'',manager:emp.managerEid||'',
    location:emp.branch&&emp.branch!=='--'?emp.branch:'',country:emp.country||'',workerType:emp.workerType||''};
}
function epSame(a,b){return JSON.stringify(a==null?'':a)===JSON.stringify(b==null?'':b);}
function epShow(k,v){
  if(k==='manager')return v?(idEmpName(v)||''):'';
  if(k==='dob'||k==='doj')return v?(typeof cdLabel==='function'?cdLabel(v):v):'';
  if(Array.isArray(v))return v.join(', ');
  return v||'';
}
/* Managers: active people of the same company (Admin Access staff included), never the employee themself. */
let epMgrMap={};
function epManagers(emp){
  epMgrMap={};
  const list=idEmpsIn(emp.entityId).filter(function(e){return e.eid!==emp.eid&&e.status!=='Inactive';});
  return list.map(function(e){const l=e.name+' · '+e.empId;epMgrMap[l]=e.eid;return l;});
}
function epMgrLabel(eid){const e=idEmp(eid);return e?e.name+' · '+e.empId:'';}

/* ── Who may edit what ────────────────────────────────────────────────── */
function epCanAdmin(emp){return !!emp&&typeof emsCan==='function'&&emsCan('h2r.employee.manage')&&emp.entityId===idEntity();}
function epIsSelf(emp){return !!emp&&typeof emsIsMe==='function'&&emsIsMe(emp);}
function epCanSelf(emp){return epIsSelf(emp)&&emsCan('h2r.employee.own');}
/* The sign-in email belongs to the account: an employee who signs in keeps it. */
function epEmailLocked(emp){return !!(emp&&typeof idUserOfEmp==='function'&&idUserOfEmp(emp.eid));}
function epMode(f,emp,mode){
  if(mode==='admin')return f.k==='email'&&epEmailLocked(emp)?'view':'edit';
  return f.self;
}

/* ── The form (the panel's edit-in-place look) ────────────────────────── */
function epFormHTML(prefix,emp,mode,onCancel,onSave){
  const vals=epVals(emp),fs=epFieldsFor(emp);
  const sec=function(key,title){
    return '<div class="ep-sec-title">'+title+'</div><div class="lp-sb-form-grid">'+fs.filter(function(f){return f.sec===key;}).map(function(f){return epInputHTML(prefix,f,vals,emp,mode);}).join('')+'</div>';
  };
  const pend=emp.profileRequest&&mode==='self'?'<div class="wb-note is-wait">A correction is waiting for HR review. Identity details can be changed again once it is decided.</div>':'';
  return '<div class="lp-sb-edit-form ep-edit"><div class="lp-sb-edit-section">'+pend
    +sec('p','Personal Information')+sec('w','Work Details')
    +(mode==='self'?'<div class="ea-hint ep-self-hint">Name, gender, date of birth and nationality changes go to HR for review. Employment details are maintained by HR.</div>':'')
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="'+onCancel+'()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="'+onSave+'()">Save changes</button></div></div></div>';
}
function epInputHTML(prefix,f,vals,emp,mode){
  const id=prefix+'-'+f.k,how=epMode(f,emp,mode),v=vals[f.k];
  const locked=how==='view'||(how==='request'&&!!emp.profileRequest);
  let ctl;
  if(locked){
    ctl='<div class="ea-locked'+(epShow(f.k,v)?'':' is-muted')+'">'+EA_ICONS.lock+'<span>'+sbEsc(epShow(f.k,v)||'Not set')+'</span></div>';
  }else if(f.type==='select'){
    const opts=f.opts().slice();if(v&&opts.indexOf(v)<0)opts.unshift(v);
    ctl=sbSelect(id,opts,v);
  }else if(f.type==='manager'){
    const opts=['No reporting manager'].concat(epManagers(emp));
    ctl=sbSelect(id,opts,v?epMgrLabel(v):'No reporting manager');
  }else if(f.type==='isodate'){
    ctl=apCD(id,v||'','Select date');
  }else if(f.type==='chips'){
    ctl='<div class="ea-chips" id="'+id+'">'+f.opts().map(function(o){
      const on=(v||[]).indexOf(o)>=0;
      return '<label class="ea-chip'+(on?' is-on':'')+'"><input type="checkbox" value="'+attrSafe(o)+'"'+(on?' checked':'')+' onchange="this.parentNode.classList.toggle(\'is-on\',this.checked)">'
        +'<span class="ea-chip-box">'+EA_ICONS.tick+'</span><span>'+sbEsc(o)+'</span></label>';
    }).join('')+'</div>';
  }else{
    ctl='<input class="ep-form-input" id="'+id+'" type="'+(f.type==='tel'?'tel':f.type)+'" value="'+attrSafe(v||'')+'">';
  }
  const tag=mode==='self'&&how==='request'&&!locked?' <span class="sb-field-hint">HR review</span>':locked&&f.k==='email'&&mode==='admin'?' <span class="sb-field-hint">Used to sign in</span>':'';
  return '<div class="lp-sb-field"'+(f.full?' style="grid-column:1/-1"':'')+'><label>'+f.label+(f.req&&!locked?' <span class="req">*</span>':'')+tag+'</label>'+ctl+'</div>';
}
/* What the form now says, for the fields this person could change. */
function epRead(prefix,emp,mode){
  const out={};
  epFieldsFor(emp).forEach(function(f){
    const how=epMode(f,emp,mode);
    if(how==='view'||(how==='request'&&emp.profileRequest))return;
    const id=prefix+'-'+f.k;
    if(f.type==='chips'){const box=document.getElementById(id);if(!box)return;out[f.k]=Array.prototype.filter.call(box.querySelectorAll('input[type=checkbox]'),function(c){return c.checked;}).map(function(c){return c.value;});return;}
    const el=document.getElementById(id);if(!el)return;
    let v=String(el.value||'').trim();
    if(f.type==='manager')v=v==='No reporting manager'||!v?'':(epMgrMap[v]||(v===epMgrLabel(emp.managerEid)?emp.managerEid:''));
    if(f.k==='phone')v=v.replace(/[\s-]/g,'');
    out[f.k]=v;
  });
  return out;
}
/* The changed fields, checked the way the wizard and the bulk upload check them. */
function epCheck(emp,now){
  const was=epVals(emp),changed=Object.keys(now).filter(function(k){return !epSame(now[k],was[k]);});
  const today=typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);
  for(let i=0;i<changed.length;i++){
    const k=changed[i],f=epField(k),v=now[k];
    if(f.req&&(Array.isArray(v)?!v.length:!v))return {error:f.label+' is required'};
    if(k==='email'){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))return {error:'Enter a valid Work Email'};
      const other=eaEmailOwner(v,emp.entityId,emp.eid);if(other)return {error:'An employee with this email already exists ('+other.empId+')'};
    }
    if(k==='phone'&&v&&(!/^\d+$/.test(v)||v.length<7))return {error:'Enter a valid Mobile Number'};
    if(k==='dob'&&v){const doj=now.doj||was.doj;if(v>=today||(doj&&v>=doj))return {error:'Enter a valid Date of Birth'};}
    if(k==='doj'&&v){const dob=now.dob||was.dob;if(dob&&v<=dob)return {error:'Enter a valid Date of Joining'};}
    if(k==='manager'&&v){const m=idEmp(v);if(!m||m.entityId!==emp.entityId||m.eid===emp.eid)return {error:'Reporting Manager could not be resolved'};}
    if(f.type==='select'&&v&&f.opts().indexOf(v)<0&&v!==was[k])return {error:f.label+' is not one of the listed values'};
  }
  return {changed:changed};
}
/* Writes the changed fields onto the record; returns their labels. */
function epWrite(emp,now,keys){
  keys.forEach(function(k){
    const v=now[k];
    switch(k){
      case 'fname':case 'lname':{const cur=epVals(emp);const f=k==='fname'?v:cur.fname,l=k==='lname'?v:cur.lname;emp.name=(f+' '+l).trim();break;}
      case 'dial':case 'phone':{const cur=epVals(emp);const d=k==='dial'?v:(now.dial!=null?now.dial:cur.dial),p=k==='phone'?v:(now.phone!=null?now.phone:cur.phone);emp.contact=(d+' '+p).trim();break;}
      case 'email':emp.email=v;break;
      case 'doj':emp.joinDate=typeof cdLabel==='function'?cdLabel(v):v;break;
      case 'empType':emp.desc=v;break;
      case 'designation':emp.jobTitle=v;break;
      case 'manager':emp.managerEid=v;break;
      case 'location':emp.branch=v;break;
      case 'idProofs':emp.idProofs=v.slice();break;
      default:emp[k]=v;
    }
  });
  return keys.map(function(k){return epField(k).label;});
}
/* A Card KYC detail changed after the employee accepted the declarations:
   the acceptance is withdrawn and they confirm again themselves. */
function epKycRecheck(emp,keys,who){
  const kyc=keys.filter(function(k){return EP_KYC_KEYS.indexOf(k)>=0;});
  if(!kyc.length||typeof oncRec!=='function')return '';
  const r=oncRec(emp.eid);
  if(!r||!r.enroll||!oncDeclsDone(r))return '';
  const labels=kyc.map(function(k){return epField(k).label;}).filter(function(x,i,a){return a.indexOf(x)===i;}).join(', ');
  r.declsHistory=(r.declsHistory||[]).concat([Object.assign({withdrawnAt:stampNow().date,reason:'Profile change: '+labels},r.decls)]);
  r.decls={};
  r.logs.unshift(oncLog(oncStatus(emp,r),'Card KYC details changed ('+labels+') by '+who+'. The employee must accept the declarations again.'));
  const u=idUserOfEmp(emp.eid);
  if(u&&typeof notifData!=='undefined'){notifData.unshift({name:'Your card KYC details changed ('+labels+'). Accept the declarations again in My Profile → ONC Card.',cid:emp.empId,time:'just now',pending:true,to:[u],entity:emp.entityId,evt:'ep-kyc:'+emp.eid+':'+Date.now()});if(typeof notifSyncBell==='function')notifSyncBell();}
  return labels;
}
function epLog(emp,action){
  const s=stampNow(),actual=typeof idSwitched==='function'&&idSwitched()?idAuthMe():'';
  const l={type:'profile',status:emp.status,date:s.date,time:s.time,user:CURRENT_USER,userId:CURRENT_USER_ID,action:action+(actual?' (through Switch User by '+idName(actual)+')':'')};
  if(actual)l.actualUserId=actual;
  (typeof empLogs==='function'?empLogs(emp):(emp.logs||(emp.logs=[]))).unshift(l);
}
function epSummary(emp,before,keys){
  return keys.map(function(k){return epField(k).label+': '+(epShow(k,before[k])||'—')+' → '+(epShow(k,epVals(emp)[k])||'—');}).join('; ');
}

/* ══ ADMIN EDIT (Employees → employee → Edit) ══════════════════════════════
   The panel's own startDeEdit / saveDeEdit / startGeEdit / saveGeEdit, so the
   History tab's watch on the save keeps recording the fields. */
function epPanelEmp(kind){return kind==='ge'?globalEmpData.find(function(e){return e.id===geSelectedId;}):directEmpData.find(function(e){return e.id===deSelectedId;});}
function startDeEdit(){const e=epPanelEmp('de');if(!epCanAdmin(e)){emsDeny('edit this employee');return;}deEditMode=true;refreshDeSidebar();}
function startGeEdit(){const e=epPanelEmp('ge');if(!epCanAdmin(e)){emsDeny('edit this employee');return;}geEditMode=true;refreshGeSidebar();}
function epAdminSave(kind){
  const emp=epPanelEmp(kind);if(!emp)return false;
  if(!epCanAdmin(emp)){emsDeny('edit this employee');return false;}
  const prefix=kind==='ge'?'gesb':'desb';
  const now=epRead(prefix,emp,'admin'),chk=epCheck(emp,now);
  if(chk.error){showToast(chk.error,'error');return false;}
  if(!chk.changed.length){if(kind==='ge')geEditMode=false;else deEditMode=false;kind==='ge'?refreshGeSidebar():refreshDeSidebar();showToast('No changes','info','Nothing was different.');return true;}
  const before=epVals(emp);
  epWrite(emp,now,chk.changed);
  const sum=epSummary(emp,before,chk.changed);
  epLog(emp,'Employee details updated: '+sum+'.');
  const kyc=epKycRecheck(emp,chk.changed,idMeName());
  if(kind==='ge')geEditMode=false;else deEditMode=false;
  const id=emp.id;
  renderADTPage();
  if(kind==='ge')openGeSidebar(id);else openDeSidebar(id);
  showToast('Employee details updated','success',emp.name+' · '+emp.empId+(kyc?' · card declarations to be accepted again':''));
  return true;
}
function saveDeEdit(){return epAdminSave('de');}
function saveGeEdit(){return epAdminSave('ge');}

/* An employee's correction request, reviewed in their Basic Details. */
function epRequestHTML(emp){
  const q=emp.profileRequest;if(!q)return '';
  const rows=Object.keys(q.fields).map(function(k){return '<tr><td class="csag-td">'+epField(k).label+'</td><td class="csag-td">'+sbEsc(epShow(k,epVals(emp)[k])||'—')+' → <b>'+sbEsc(epShow(k,q.fields[k])||'—')+'</b></td></tr>';}).join('');
  const can=epCanAdmin(emp)&&q.by!==idMe()&&q.actual!==idAuthMe()&&!epIsSelf(emp);
  return '<div class="wb-note is-wait ep-req"><b>Correction requested</b> · '+sbEsc(idName(q.by))+' · '+sbEsc(q.at)
    +'<table class="att-table csag-table"><tbody>'+rows+'</tbody></table>'
    +(can?'<textarea class="lp-logs-form-textarea" id="ep-req-comment" placeholder="Comment (required to reject)"></textarea>'
      +'<div class="wb-actions"><button class="btn btn-primary btn-sm" onclick="epReview(\''+emp.eid+'\',true)">Approve</button><button class="btn btn-outline btn-sm" onclick="epReview(\''+emp.eid+'\',false)">Reject</button></div>'
      :'<div class="wb-note-sub">Waiting for HR review.</div>')+'</div>';
}
function epReview(eid,approve){
  const emp=idEmp(eid);if(!emp||!emp.profileRequest)return;
  const q=emp.profileRequest;
  if(!epCanAdmin(emp)){emsDeny('review profile corrections');return;}
  if(q.by===idMe()||q.actual===idAuthMe()||epIsSelf(emp)){showToast('Not permitted','error','A correction is reviewed by someone other than the employee who asked for it.');return;}
  const inp=document.getElementById('ep-req-comment'),comment=inp?inp.value.trim():'';
  if(!approve&&!comment){showToast('Reason is required to reject','error');if(inp)inp.focus();return;}
  const keys=Object.keys(q.fields),labels=keys.map(function(k){return epField(k).label;}).join(', ');
  let kyc='';
  if(approve){
    const chk=epCheck(emp,q.fields);
    if(chk.error){showToast(chk.error,'error','The requested value is no longer valid; reject the request instead.');return;}
    const before=epVals(emp);epWrite(emp,q.fields,chk.changed);
    epLog(emp,'Correction approved: '+epSummary(emp,before,chk.changed)+(comment?'. '+comment:'')+'.');
    kyc=epKycRecheck(emp,chk.changed,idMeName());
  }else epLog(emp,'Correction rejected ('+labels+'). Reason: '+comment+'.');
  emp.profileRequest=null;
  const u=idUserOfEmp(emp.eid);
  if(u&&typeof notifData!=='undefined'){notifData.unshift({name:'Your profile correction ('+labels+') was '+(approve?'approved':'rejected')+'.',cid:emp.empId,time:'just now',pending:false,to:[u],entity:emp.entityId,evt:'ep-req:'+emp.eid+':'+q.at});if(typeof notifSyncBell==='function')notifSyncBell();}
  renderADTPage();
  const kind=epKind(emp);if(kind==='ge')openGeSidebar(emp.id);else if(kind==='de')openDeSidebar(emp.id);
  showToast(approve?'Correction approved':'Correction rejected','success',emp.name+(kyc?' · card declarations to be accepted again':''));
}
const EP_ICO={
  user:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cal:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  globe:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  id:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h4"/></svg>'
};
/* Basic Details: the details the wizard collects beyond the panel's cards. */
function epPanelExtraHTML(emp){
  const I=EP_ICO,v=epVals(emp),fc=function(ico,label,val){return '<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(val?sbEsc(val):'<span style="color:#9ca3af">--</span>')+'</div></div></div>';};
  return '<div class="lp-sb-detail-grid ep-extra">'+fc(I.user,'Gender',v.gender)+fc(I.cal,'Date of Birth',epShow('dob',v.dob))+fc(I.globe,'Nationality',v.nationality)+fc(I.id,'ID Proof Types',v.idProofs.join(', '))+'</div>'
    +epRequestHTML(emp);
}

/* ══ SELF-SERVICE (My Profile → Edit Profile) ══════════════════════════════ */
let epSelfEditing=false;
function epSelfRec(){const pe=typeof empProfPerson==='function'?empProfPerson():null;return pe&&epIsSelf(pe)?pe:null;}
function empProfEditStart(){
  const pe=epSelfRec();
  if(!pe||!epCanSelf(pe)){emsDeny('edit this profile');return;}
  epSelfEditing=true;profTab='basic-details';renderADTPage();
}
function empProfEditCancel(){epSelfEditing=false;renderADTPage();}
function empProfSave(){
  const pe=epSelfRec();
  if(!pe||!epCanSelf(pe)){emsDeny('edit this profile');return false;}
  const now=epRead('epself',pe,'self'),chk=epCheck(pe,now);
  if(chk.error){showToast(chk.error,'error');return false;}
  if(!chk.changed.length){epSelfEditing=false;renderADTPage();showToast('No changes','info','Nothing was different.');return true;}
  const direct=chk.changed.filter(function(k){return epField(k).self==='edit';}),asked=chk.changed.filter(function(k){return epField(k).self==='request';});
  let kyc='';
  if(direct.length){
    const before=epVals(pe);epWrite(pe,now,direct);
    epLog(pe,'Employee updated their details: '+epSummary(pe,before,direct)+'.');
    kyc=epKycRecheck(pe,direct,'the employee');
  }
  if(asked.length){
    const s=stampNow(),f={};asked.forEach(function(k){f[k]=now[k];});
    pe.profileRequest={fields:f,by:idMe(),actual:typeof idSwitched==='function'&&idSwitched()?idAuthMe():'',at:s.date+' | '+s.time};
    const labels=asked.map(function(k){return epField(k).label;}).join(', ');
    epLog(pe,'Employee asked for a correction: '+labels+' (waiting for HR review).');
    const hr=(typeof emsPermHolders==='function'?emsPermHolders('h2r.employee.manage'):[]).filter(function(u){return u!==idMe();});
    if(hr.length&&typeof notifData!=='undefined'){notifData.unshift({name:pe.name+' asked for a profile correction ('+labels+').',cid:pe.empId,time:'just now',pending:true,to:hr,entity:pe.entityId,evt:'ep-ask:'+pe.eid+':'+s.time});if(typeof notifSyncBell==='function')notifSyncBell();}
  }
  epSelfEditing=false;renderADTPage();
  showToast(asked.length&&!direct.length?'Sent for HR review':'Profile updated','success',
    (direct.length?direct.map(function(k){return epField(k).label;}).join(', ')+' saved.':'')+(asked.length?(direct.length?' ':'')+asked.map(function(k){return epField(k).label;}).join(', ')+' will change once HR approves.':'')+(kyc?' Accept the card declarations again in the ONC Card tab.':''));
  return true;
}
/* My Profile's Basic Details, read view, for the employee's own record: the left-hand cards. */
function epSelfViewHTML(pe,fc,ico){
  const v=epVals(pe),D=function(x){return x?sbEsc(x):'<span style="color:#9ca3af">—</span>';};
  const ent=idEntityRec(pe.entityId);
  const q=pe.profileRequest;
  return (q?'<div class="wb-note is-wait">Correction waiting for HR review: '+Object.keys(q.fields).map(function(k){return sbEsc(epField(k).label)+' → '+sbEsc(epShow(k,q.fields[k])||'—');}).join('; ')+'.</div>':'')
    +'<div class="ep-form-card"><div class="prof-section-hdr"><span class="policy-section-title">Personal Information</span></div><div class="prof-field-grid">'
      +fc(ico.user,'Full Name',D(pe.name))+fc(ico.mail,'Email Address',D(v.email))+fc(ico.phone,'Phone Number',D((v.dial+' '+v.phone).trim()))
      +fc(ico.user,'Gender',D(v.gender))+fc(ico.cal,'Date of Birth',D(epShow('dob',v.dob)))+fc(ico.globe,'Nationality',D(v.nationality))
      +fc(ico.shield,'ID Proof Types',D(v.idProofs.join(', ')))
    +'</div></div>'
    +'<div class="ep-form-card"><div class="prof-section-hdr"><span class="policy-section-title">Work Details</span></div><div class="prof-field-grid">'
      +fc(ico.shield,'Designation',D(v.designation))+fc(ico.user,'Department',D(v.dept))+fc(ico.shield,'Employment Type',D(v.empType))
      +fc(ico.globe,'Company',D(ent?ent.name:''))+fc(ico.globe,epKind(pe)==='ge'?'Country of Work':'Work Location',D(epKind(pe)==='ge'?v.country:v.location))
      +fc(ico.user,'Reporting Manager',D(epShow('manager',v.manager)))+fc(ico.cal,'Joining Date',D(pe.joinDate&&pe.joinDate!=='--'?pe.joinDate:''))
      +fc(ico.user,'Employee ID',D(pe.empId))+fc(ico.shield,'Employee Status',empLifeBadge(pe.status))
    +'</div></div>';
}
function epSelfEditHTML(pe){
  return '<div class="prof-body ep-self-edit"><div class="prof-left">'
    +epFormHTML('epself',pe,'self','empProfEditCancel','empProfSave')+'</div></div>';
}

/* ══ EMPLOYEE DASHBOARD → ACTION REQUIRED: Complete Card KYC ══════════════ */
function epKycPending(emp){
  if(!emp||typeof oncRec!=='function'||typeof mcOn!=='function'||!mcOn('expenses')||!oncProgrammeOn()||epKind(emp)!=='de')return false;
  const r=oncRec(emp.eid);if(!r||!r.enroll||r.pending)return false;
  return oncStatus(emp,r)==='Draft'||(oncDeclsDone(r)&&!!r.decls.simulated);
}
function epKycRowHTML(emp){
  if(!epKycPending(emp))return '';
  return '<tr data-emp-life="1"><td><span class="hr-emp-name">Complete Card KYC</span></td>'
    +'<td style="color:var(--gray)">Card enrollment · Owner: Employee</td><td style="color:var(--gray)">—</td>'
    +'<td><span class="lp-status-badge pending">Pending</span></td>'
    +'<td><button class="hr-action-btn neutral" onclick="epGoKyc()">Complete</button></td></tr>';
}
function epGoKyc(){
  const e=typeof empSelfRec==='function'?empSelfRec():null;if(!e)return;
  empProfPersona={kind:epKind(e),id:e.id};
  profTab='onc-card';
  if(typeof empNavKeep!=='undefined')empNavKeep=true;
  navigatePage('my-profile');
}
