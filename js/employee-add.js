/* ══ CREATE NEW EMPLOYEE: FOUR STEPS, ONE FIELD TABLE ══════════════════════
   Adding an employee used to be addDemoEmployee() — a button that injected a
   row with invented values and no form at all. This is the real intake:

     1  Identity              Basic Information
     2  Employment Structure  Job Details
     3  Compliance Snapshot   Statutory Info
     4  Access Governance     Permissions

   THE FIELDS ARE DATA, NOT MARKUP. EA_STEPS below lists every field with its
   type, its options and whether it is required, and one renderer turns that
   into the form. The step counter, the "what is still missing" meter, the
   validation on Next and the record that gets written at the end are all read
   from the same table, so a new field is one line here and cannot fall out of
   sync with the four places that would otherwise have to agree about it.

   Controls are the app's own — apCS for selects, apCD for dates, .choice-card
   for the access role — so this form looks like the Create Team and contract
   wizards rather than like a fifth dialect. */

/* ── Option pools ──────────────────────────────────────────────────────────
   Read from live app data where the app HAS the data (teams, departments), so
   a team created on the Teams page shows up here without a second list to
   maintain. */
const EA_GENDERS=['Male','Female','Other','Prefer not to say'];
const EA_NATIONALITIES=['India','Germany','France','Italy','Netherlands','Portugal','Spain','United Kingdom','United States','Singapore','Australia','Canada'];
const EA_EMP_TYPES=['Full Time','Part Time','Fixed Term','Contract','Intern','Consultant'];
const EA_DEPTS=['Engineering','HR','Product','Design','Sales','Finance','Legal','Operations','Support','Admin'];
const EA_DESIGNATIONS=['Software Engineer','Senior Developer','QA Engineer','UX Designer','Product Manager','Business Analyst','HR Manager','HR Specialist','Finance Analyst','Ops Manager','Support Specialist'];
const EA_LOCATIONS=['Hyderabad','Mumbai','Delhi','Punjab','Bangalore','Remote — India'];
const EA_COUNTRIES=['Germany','France','Italy','Netherlands','Portugal','Spain','United Kingdom','United States','Singapore'];
const EA_WORKER_TYPES=['EOR','Contractor'];
const EA_ID_PROOFS=['Aadhar Card','PAN Card','Passport','Driving License','Voter ID','Social Security Number'];
const EA_TEAM_ROLES=['Reporting Manager','Approver','Member'];
const EA_DIAL_CODES=['+91','+1','+31','+33','+39','+44','+49','+351','+65'];

/* The ID proofs that satisfy "relevant ID linked to tax as per country law".
   A Voter ID is identity, not a tax handle, which is why the payroll checklist
   can stay unsatisfied even after an ID proof has been picked. */
const EA_TAX_IDS=['PAN Card','Social Security Number'];

/* Access roles carry their grant with them, so the preview panel is generated
   rather than written twice. */
const EA_ACCESS_ROLES=[
  {name:'Employee',desc:'Own records only — the default for a new joiner.',
   perms:[['My Profile','Edit'],['My Timesheet','Submit'],['Leaves','Request'],['Payslips','View']]},
  {name:'Team Manager',desc:'Everything an employee has, plus approvals for their own team.',
   perms:[['Team Timesheets','Approve'],['Team Leaves','Approve'],['Team Directory','View'],['Reports','View']]},
  {name:'HR Manager',desc:'Full people operations across the entity.',
   perms:[['Employees','Full access'],['Onboarding','Full access'],['Leave Policies','Manage'],['Compliance Hub','Manage']]},
  {name:'Finance',desc:'Payroll and billing, no access to personal records.',
   perms:[['Payroll','Run & approve'],['Payheads','Manage'],['Invoices','Manage'],['Employees','View only']]},
  {name:'Entity Admin',desc:'Every module, including settings and access control.',
   perms:[['All modules','Full access'],['Entity Settings','Manage'],['Access Control','Manage'],['Audit Logs','View']]}
];
function eaAccessRole(name){return EA_ACCESS_ROLES.find(function(r){return r.name===name;})||null;}

/* ── The step and field table ──────────────────────────────────────────────
   type      text | email | phone | select | date | chips | toggle | roles | locked
   req       blocks Next until filled; drives the meter and the red outline
   half      false makes the field span the whole two-column grid
   hint      the small grey line under the control
   only      'de' or 'ge' — a field that exists for one employee kind only */
const EA_STEPS=[
  {key:'identity',title:'Identity',sub:'Basic Information',
   cardTitle:'Identity',cardSub:'Who this person is — used for their profile and login',
   fields:[
     {k:'fname',label:'First Name',type:'text',ph:'e.g., John',req:true},
     {k:'lname',label:'Last Name',type:'text',ph:'e.g., Doe',req:true},
     {k:'email',label:'Email',type:'email',ph:'e.g., john@company.com',req:true},
     {k:'phone',label:'Phone Number',type:'phone',ph:'00000 00000',req:true},
     {k:'gender',label:'Gender',type:'select',opts:EA_GENDERS,ph:'Select gender',req:true},
     {k:'dob',label:'Date of Birth',type:'date',ph:'Select date of birth',req:true},
     {k:'nationality',label:'Nationality',type:'select',opts:EA_NATIONALITIES,ph:'Select Nationality',req:true},
     /* Where the lifecycle starts. Pending creates the record and waits;
        Onboarding opens the onboarding activities straight away. Pending can
        be moved on later from Logs → Add Log → Onboarding. */
     {k:'status',label:'Employee Status',type:'lifestart',req:true,half:false}
   ]},

  {key:'structure',title:'Employment Structure',sub:'Job Details',
   cardTitle:'Employment Structure',cardSub:'Job role, reporting structure and employment terms',
   fields:[
     {k:'empId',label:'Employee ID',type:'locked',req:true,
      hint:'Generated automatically from the entity sequence.'},
     {k:'doj',label:'Joining Date',type:'date',ph:'Select joining date',req:true},
     {k:'empType',label:'Employment Type',type:'select',opts:EA_EMP_TYPES,ph:'Select employment type',req:true},
     {k:'dept',label:'Department',type:'select',opts:EA_DEPTS,ph:'Select department',req:true},
     {k:'designation',label:'Designation',type:'select',opts:EA_DESIGNATIONS,ph:'Select designation',req:true},
     {k:'location',label:'Work Location',type:'select',opts:EA_LOCATIONS,ph:'Select work location',req:true,only:'de'},
     {k:'country',label:'Country of Work',type:'select',opts:EA_COUNTRIES,ph:'Select country',req:true,only:'ge'},
     {k:'workerType',label:'Worker Type',type:'select',opts:EA_WORKER_TYPES,ph:'Select worker type',req:true,only:'ge'}
   ]},

  {key:'compliance',title:'Compliance Snapshot',sub:'Statutory Info',
   cardTitle:'Compliance Snapshot',cardSub:'Statutory identity and payroll readiness',
   fields:[
     {k:'idProofs',label:'Select ID Proof',type:'chips',opts:EA_ID_PROOFS,req:true,half:false,
      hint:'Choose one or more. At least one tax-linked ID is needed before payroll can run.'},
     {k:'payroll',label:'Payroll Applicable',type:'toggle',half:false,
      sub:'Do you want to run payroll for this employee?'}
   ]},

  {key:'access',title:'Access Governance',sub:'Permissions',
   cardTitle:'Access Governance',cardSub:'Team assignments and access permissions',
   fields:[
     {k:'teams',label:'Assign Teams',type:'chips',opts:[],half:false,
      sub:'Select the teams this employee belongs to'},
     /* `locked` is what the field says while it has nothing to offer; `ph` is
        the placeholder once a team has unlocked it. One string for both — the
        state the source form shipped — leaves a live dropdown still telling
        you to select a team you have already selected. */
     {k:'manager',label:'Reporting Manager',type:'select',opts:[],ph:'Select reporting manager',
      locked:'Select a team first',hint:'Optional — managers of the first team selected above'},
     {k:'teamRole',label:'Role within Team',type:'select',opts:EA_TEAM_ROLES,ph:'Select role',
      locked:'Select a team first',hint:'Role determines access levels across modules'},
     {k:'accessRole',label:'Access role',type:'roles',half:false,req:true,
      sub:'Grants module permissions from the moment this employee is created'}
   ]}
];

/* ── State ─────────────────────────────────────────────────────────────────
   eaShowErrors is per-attempt, not per-keystroke: a field only turns red once
   Next has actually been refused, so a half-typed form is never shouting. */
let eaStep=0,eaKind='de',eaData=null,eaShowErrors=false;
let eaOpen=false;      // the Create New Employee popup is up

function eaTeamNames(){return teamsData.map(function(t){return t.name;});}
function eaTeamManagers(teamName){
  const t=teamsData.find(function(x){return x.name===teamName;});
  if(!t||!t.membersList)return [];
  return t.membersList.map(function(m){return m.name;});
}
/* Employee IDs are per list and per company, and the listing sorts on them, so
   the next one is the highest that exists in this company's list plus one - not
   the row count, which repeats an id the moment anything is deleted. A code
   already used by anyone in the company (Admin Access staff included, or one
   handed out earlier in the same bulk upload: `taken`) is skipped, so a code is
   never issued twice inside a company (FR-EMS-EMP-01). */
function eaNextEmpId(kind,ent,taken){
  ent=ent||(typeof idEntity==='function'?idEntity():'');
  const list=(kind==='ge'?globalEmpData:directEmpData).filter(function(e){return !ent||!e.entityId||e.entityId===ent;});
  const prefix=kind==='ge'?'GEP':'EMP';
  const max=list.reduce(function(m,e){
    const n=parseInt(String(e.empId||'').replace(/\D/g,''),10);
    return isNaN(n)?m:Math.max(m,n);
  },0);
  const code=function(n){return prefix+String(n).padStart(3,'0');};
  const used=function(c){return !!(taken&&taken[c])||(typeof idEmpByCode==='function'&&!!idEmpByCode(c,ent));};
  let n=max+1;
  while(used(code(n)))n++;
  return {prefix:prefix,seq:String(n).padStart(3,'0')};
}

function eaDefaults(kind){
  const id=eaNextEmpId(kind);
  return {dial:'+91',phone:'',fname:'',lname:'',email:'',gender:'',dob:'',nationality:'',
          status:'',empId:id.prefix+id.seq,doj:'',empType:'',dept:'',designation:'',
          location:'',country:'',workerType:'',idProofs:[],payroll:true,
          teams:[],manager:'',teamRole:'',accessRole:''};
}
/* Entry point. `kind` decides which listing the employee lands in and which
   step-2 fields exist; the Employees page passes whichever sub-tab is open. */
/* It opens over the listing the employee will land in: on the Employees page
   the matching sub-tab is brought forward; from anywhere else the Employees
   page is opened first. */
function startAddEmployee(kind){
  eaKind=kind==='ge'?'ge':'de';
  eaStep=0;eaShowErrors=false;eaData=eaDefaults(eaKind);eaOpen=true;
  if(page!=='employees'&&page!=='direct'&&page!=='global'){page='employees';syncSidebarDropdown(page);}
  if(page==='employees')empSubTab=eaKind==='ge'?'global':'direct';
  renderADTPage();
}
function eaCancel(){
  eaData=null;eaOpen=false;
  renderADTPage();
}

/* ── Field access ──────────────────────────────────────────────────────────*/
function eaStepFields(i){
  return EA_STEPS[i].fields.filter(function(f){return !f.only||f.only===eaKind;});
}
function eaIsBlank(f){
  const v=eaData[f.k];
  if(f.type==='chips')return !v||!v.length;
  if(f.type==='toggle'||f.type==='locked')return false;   // always has a value
  if(f.type==='lifestart')return !v;
  return !String(v||'').trim();
}
/* Required-but-empty, plus the two format rules worth enforcing at this stage.
   Anything stricter belongs on the record, not on a form someone is still
   halfway through. */
function eaFieldError(f){
  if(f.type==='onc')return typeof oncWizardError==='function'?oncWizardError():'';
  if(f.req&&eaIsBlank(f))return 'required';
  if(f.k==='email'&&eaData.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eaData.email))return 'Enter a valid email address';
  if(f.k==='email'&&eaData.email){const dup=eaEmailOwner(eaData.email);if(dup)return 'An employee with this email already exists ('+dup.empId+')';}
  if(f.k==='phone'&&eaData.phone&&String(eaData.phone).replace(/\D/g,'').length<7)return 'Enter a valid phone number';
  return '';
}
/* One rule for every way an employee record is created or its email changed (wizard, Bulk Upload Employees,
   profile edit): an email is unique among the employees of a company, compared trimmed and case-insensitive.
   The same email in another company is allowed - the person's ADT identity stays the one account the
   identity directory keeps (no second account is created). Returns the employee already using it, or null. */
function eaEmailOwner(email,ent,exceptEid){
  const e=typeof idEmpByEmail==='function'?idEmpByEmail(email,ent||(typeof idEntity==='function'?idEntity():'')):null;
  return e&&e.eid!==exceptEid?e:null;
}
function eaStepErrors(i){
  return eaStepFields(i).filter(function(f){return eaFieldError(f);});
}
function eaStepDone(i){return eaStepErrors(i).length===0;}

/* ── Change handlers ───────────────────────────────────────────────────────
   Typing and picking only STORE. Nothing on the step reacts to a plain field,
   so there is nothing to repaint — and repainting on every keystroke would
   take the caret with it. The exceptions repaint because they genuinely change
   what the rest of the step says. */
function eaSet(k,v){eaData[k]=v;}
function eaOnSelect(val,id){
  const k=id.replace(/^ea-/,'');
  eaData[k]=val;
  /* Choosing the first team is what unlocks Reporting Manager, so a select
     that feeds another control has to repaint rather than just store. */
  if(k==='teams'||k==='manager'||k==='teamRole')renderADTPage();
}
function eaOnDate(iso,id){eaData[id.replace(/^ea-/,'')]=iso;}
function eaToggleChip(k,i){
  const f=eaFindField(k);if(!f)return;
  const opts=k==='teams'?eaTeamNames():f.opts;
  const label=opts[i];if(label==null)return;
  const list=eaData[k]||(eaData[k]=[]);
  const at=list.indexOf(label);
  if(at>=0)list.splice(at,1);else list.push(label);
  /* Dropping the last team takes the manager with it — leaving a manager from
     a team the employee is no longer on is how stale reporting lines survive. */
  if(k==='teams'&&!list.length){eaData.manager='';eaData.teamRole='';}
  if(k==='teams'&&eaData.manager&&eaTeamManagers(list[0]).indexOf(eaData.manager)<0)eaData.manager='';
  renderADTPage();
}
function eaPickStart(v){eaData.status=v;renderADTPage();}
function eaToggleSwitch(k){eaData[k]=!eaData[k];renderADTPage();}
function eaPickRole(name){eaData.accessRole=name;renderADTPage();}
function eaFindField(k){
  for(var i=0;i<EA_STEPS.length;i++){
    const f=EA_STEPS[i].fields.find(function(x){return x.k===k;});
    if(f)return f;
  }
  return null;
}
/* ── Navigation ────────────────────────────────────────────────────────────*/
function eaNext(){
  const bad=eaStepErrors(eaStep);
  if(bad.length){
    eaShowErrors=true;renderADTPage();
    showToast('Complete this step','error',bad.length+' field'+(bad.length===1?'':'s')+' still need'+(bad.length===1?'s':'')+' attention.');
    return;
  }
  eaShowErrors=false;
  if(eaStep<EA_STEPS.length-1){eaStep++;renderADTPage();return;}
  eaSubmit();
}
function eaBack(){
  if(eaStep===0){eaCancel();return;}
  eaShowErrors=false;eaStep--;renderADTPage();
}
/* Only backwards, and only over steps that already validate. Letting someone
   click step 4 from step 1 just moves the same missing fields out of sight. */
function eaGoStep(i){
  if(i===eaStep)return;
  if(i>eaStep&&!eaStepDone(eaStep)){eaNext();return;}
  eaShowErrors=false;eaStep=i;renderADTPage();
}
function eaSaveDraft(){
  showToast('Draft saved','success',(eaData.fname||'This employee')+'’s details are kept. Pick up where you left off from the Employees page.');
}

/* ── Creating the record ────────────────────────────────────────────────────
   The one place an employee record is built, for the wizard and for Bulk
   Upload Employees alike (js/employee-bulk.js), so both kinds of employee are
   the same record with the same lifecycle start. `d` carries the wizard's own
   keys; o.managerEid is already resolved to an Employee ID in the company;
   o.action is the first log line; o.entityId defaults to the active company;
   o.actual is the person at the keyboard when they work through Switch User. */
function eaCreateEmployee(d,kind,o){
  o=o||{};
  const name=(d.fname+' '+d.lname).trim();
  const list=kind==='ge'?globalEmpData:directEmpData;
  const id=list.reduce(function(m,e){return Math.max(m,e.id);},0)+1;
  const rec={id:id,name:name,empId:d.empId,dept:d.dept,jobTitle:d.designation,
    joinDate:cdLabel(d.doj)||'--',desc:d.empType,contact:d.dial+' '+d.phone,email:d.email,
    /* Pending or Onboarding, as HR chose. The lifecycle owns status from
       here — see employee-lifecycle.js. */
    status:d.status,reqDocs:[],managerEid:o.managerEid||''};
  /* Its internal Employee ID and entity (js/identity.js). */
  if(typeof idEmpRegister==='function')idEmpRegister(rec,o.entityId||idEntity());
  if(kind==='ge'){rec.country=d.country;rec.workerType=d.workerType;}
  else rec.branch=d.location;
  /* Gender, DOB, nationality and ID proofs stay on the record; ONC enrollment opens from them. */
  if(typeof oncAfterCreate==='function')oncAfterCreate(rec,d);

  /* The record starts with a real first log entry rather than an empty Logs
     tab, and it says what the form actually collected. */
  const s=stampNow();
  const start=d.status==='Pending'?'pending':'onboarding';
  const log={type:start,status:d.status,date:s.date,time:s.time,user:CURRENT_USER,userId:CURRENT_USER_ID,action:o.action||''};
  if(o.actual&&o.actual!==CURRENT_USER_ID)log.actualUserId=o.actual;
  rec.logs=[log];

  list.unshift(rec);
  return rec;
}

/* ── Submit ────────────────────────────────────────────────────────────────*/
function eaSubmit(){
  /* Every step, not just the last one — the stepper can be clicked backwards,
     so "I am on step 4" does not prove steps 1-3 are still complete. */
  for(var i=0;i<EA_STEPS.length;i++){
    if(!eaStepDone(i)){
      eaStep=i;eaShowErrors=true;renderADTPage();
      showToast('Complete this step','error','Step '+(i+1)+' is missing required details.');
      return;
    }
  }
  const d=eaData,name=(d.fname+' '+d.lname).trim();
  /* The reporting manager is kept as an Employee ID in this entity; a name two
     employees share cannot be saved as one of them. */
  let managerEid='';
  if(d.manager){
    const m=typeof idEmpByName==='function'?idEmpByName(d.manager,idEntity()):null;
    if(!m){showToast('Reporting manager not found','error',d.manager+' does not match exactly one employee record in '+idEntityName(idEntity())+'. Pick another, or leave it empty and set it later.');return;}
    managerEid=m.eid;
  }
  const rec=eaCreateEmployee(d,eaKind,{managerEid:managerEid,
    action:'Employee created'+(d.status==='Pending'?' as Pending — onboarding has not started':' and onboarding started')+'. Date of Joining set to '+(cdLabel(d.doj)||'—')+'. '
      +(d.teams.length?'Assigned to '+d.teams.join(', ')+'. ':'No team assigned yet. ')
      +'Access role: '+d.accessRole+'. Payroll '+(d.payroll?'applicable':'not applicable')+'.'});
  const id=rec.id;
  if(typeof lpLanded==='function')lpLanded(eaKind==='ge'?'global-employees':'direct-employees',id);
  eaData=null;eaOpen=false;
  if(page==='employees')empSubTab=eaKind==='ge'?'global':'direct';
  if(eaKind==='ge')geSelectedId=null;else deSelectedId=null;
  renderADTPage();
  showToast('Employee created','success',name+' · '+rec.empId+(d.status==='Pending'?' added as Pending. Start onboarding from their Logs tab when ready.':' added and onboarding has started.'));
}

/* ── Rendering ─────────────────────────────────────────────────────────────*/
function eaEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
const EA_ICONS={
  tick:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  warn:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.6"/></svg>',
  lock:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  refresh:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>',
  back:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
};

function eaStepper(){
  return '<div class="ea-stepper">'+EA_STEPS.map(function(s,i){
    const state=i<eaStep?'done':(i===eaStep?'now':'todo');
    return '<button type="button" class="ea-step is-'+state+'" onclick="eaGoStep('+i+')">'
      +'<span class="ea-step-mark">'+(state==='done'?EA_ICONS.tick:(i+1))+'</span>'
      +'<span class="ea-step-text"><span class="ea-step-title">'+s.title+'</span>'
      +'<span class="ea-step-sub">'+s.sub+'</span></span>'
      +'</button>'
      +(i<EA_STEPS.length-1?'<span class="ea-step-line'+(i<eaStep?' is-done':'')+'"></span>':'');
  }).join('')+'</div>';
}

function eaFieldHTML(f){
  const id='ea-'+f.k,v=eaData[f.k];
  const err=eaShowErrors?eaFieldError(f):'';
  const bad=err?' ea-bad':'';
  let ctl='';
  if(f.type==='text'||f.type==='email'){
    ctl='<input class="ep-form-input'+bad+'" id="'+id+'" type="'+(f.type==='email'?'email':'text')+'"'
      +' value="'+eaEsc(v)+'" placeholder="'+eaEsc(f.ph||'')+'" oninput="eaSet(\''+f.k+'\',this.value)">';
  }else if(f.type==='phone'){
    ctl='<div class="ea-phone'+bad+'">'+apCS('ea-dial',EA_DIAL_CODES,eaData.dial,'+91','eaOnSelect')
      +'<input class="ep-form-input" id="'+id+'" type="tel" value="'+eaEsc(v)+'" placeholder="'+eaEsc(f.ph||'')+'" oninput="eaSet(\''+f.k+'\',this.value)"></div>';
  }else if(f.type==='select'){
    ctl='<div class="'+(bad?'ea-bad-wrap':'')+'">'+apCS(id,f.opts,v||'',f.ph||'Select','eaOnSelect')+'</div>';
  }else if(f.type==='date'){
    ctl='<div class="'+(bad?'ea-bad-wrap':'')+'">'+apCD(id,v||'',f.ph||'Select date','eaOnDate')+'</div>';
  }else if(f.type==='lifestart'){
    const opt=function(val,desc){
      const on=v===val;
      return '<label class="choice-card'+(on?' selected':'')+'" onclick="eaPickStart(\''+val+'\')">'
        +'<input type="radio" name="ea-lifestart"'+(on?' checked':'')+'><div class="choice-radio"></div>'
        +'<div class="choice-body"><div class="choice-title">'+val+'</div><div class="choice-desc">'+desc+'</div></div></label>';
    };
    ctl='<div class="choice-grid emp-start-grid'+bad+'">'
      +opt('Pending','Create the record only. Start onboarding later from Logs → Add Log → Onboarding.')
      +opt('Onboarding','Start onboarding now. Document requests, verification and setup become available.')
      +'</div>';
  }else if(f.type==='locked'){
    ctl='<div class="ea-locked">'+EA_ICONS.lock+'<span>'+eaEsc(v)+'</span></div>';
  }
  const label='<label class="ep-form-label">'+f.label+(f.req?' <span class="req">*</span>':'')
    +(f.refreshable?'<button type="button" class="ea-inline-link" onclick="eaRefresh()">'+EA_ICONS.refresh+'</button>':'')
    +'</label>';
  const foot=err&&err!=='required'?'<span class="ea-err">'+err+'</span>'
    :(err==='required'?'<span class="ea-err">This field is required</span>'
    :(f.hint?'<span class="ea-hint">'+f.hint+'</span>':''));
  return '<div class="ep-form-group'+(f.half===false?' ep-form-full':'')+'">'+label+ctl+foot+'</div>';
}

function eaChipsHTML(f,opts){
  const sel=eaData[f.k]||[];
  const err=eaShowErrors?eaFieldError(f):'';
  return '<div class="ea-block">'
    +'<div class="ea-block-head">'+f.label+(f.req?' <span class="req">*</span>':'')+'</div>'
    +(f.sub?'<div class="ea-block-sub">'+f.sub+'</div>':'')
    +'<div class="ea-chips'+(err?' ea-bad-wrap':'')+'">'+opts.map(function(o,i){
        const on=sel.indexOf(o)>=0;
        return '<label class="ea-chip'+(on?' is-on':'')+'">'
          +'<input type="checkbox"'+(on?' checked':'')+' onchange="eaToggleChip(\''+f.k+'\','+i+')">'
          +'<span class="ea-chip-box">'+EA_ICONS.tick+'</span><span>'+o+'</span></label>';
      }).join('')+'</div>'
    +(opts.length?'':'<div class="ea-empty">No options available yet.</div>')
    +(err?'<span class="ea-err">Select at least one</span>':(f.hint?'<span class="ea-hint">'+f.hint+'</span>':''))
    +'</div>';
}

function eaBody(){
  const step=EA_STEPS[eaStep],fields=eaStepFields(eaStep);
  if(step.key==='compliance')return eaComplianceBody(fields);
  if(step.key==='access')return eaAccessBody(fields);
  if(step.key==='onc')return oncWizardBody();   // js/onc-enrollment.js
  return '<div class="ep-form-grid">'+fields.map(eaFieldHTML).join('')+'</div>';
}

function eaComplianceBody(fields){
  const idField=fields.find(function(f){return f.k==='idProofs';});
  const picked=eaData.idProofs||[];
  const hasTax=picked.some(function(p){return EA_TAX_IDS.indexOf(p)>=0;});
  /* The checklist is DERIVED, never stored. It reads the form as it stands, so
     ticking PAN Card here turns the first line green immediately instead of
     leaving a static list of things the user cannot tell they have done. */
  const items=[
    {label:'Relevant ID linked to tax as per country law (PAN, Social Security etc.)',ok:hasTax},
    {label:'Salary and structure details',ok:false,later:true},
    {label:'Bank details',ok:false,later:true}
  ];
  const openCount=items.filter(function(i){return !i.ok;}).length;
  return eaChipsHTML(idField,idField.opts)
    +'<div class="ea-divider"></div>'
    +'<div class="ea-toggle-row">'
      +'<div><div class="ea-block-head">Payroll Applicable</div>'
      +'<div class="ea-block-sub">Do you want to run payroll for this employee?</div></div>'
      +'<label class="cs-toggle"><input type="checkbox"'+(eaData.payroll?' checked':'')
      +' onchange="eaToggleSwitch(\'payroll\')"><span class="cs-toggle-slider"></span></label>'
    +'</div>'
    +(eaData.payroll
      ?'<div class="ea-checklist">'
        +'<div class="ea-checklist-head">Checklist'
        +'<span class="ea-checklist-count'+(openCount?'':' is-done')+'">'+(items.length-openCount)+' / '+items.length+'</span></div>'
        +'<div class="ea-checklist-sub">Required before payroll can run. The two below are completed later, from the employee’s own record.</div>'
        +items.map(function(it){
            return '<div class="ea-check'+(it.ok?' is-ok':'')+'">'
              +(it.ok?EA_ICONS.tick:EA_ICONS.warn)+'<span>'+it.label+'</span>'
              +(it.later?'<em>later</em>':'')+'</div>';
          }).join('')
        +'</div>'
      :'<div class="ea-note">Payroll is off for this employee. No statutory checklist applies — you can switch it on at any time from their record.</div>');
}

function eaAccessBody(fields){
  const teamField=fields.find(function(f){return f.k==='teams';});
  const teams=eaData.teams||[];
  const firstTeam=teams[0]||'';
  const managers=firstTeam?eaTeamManagers(firstTeam):[];
  const mgrField=fields.find(function(f){return f.k==='manager';});
  const roleField=fields.find(function(f){return f.k==='teamRole';});

  /* A team with no members named cannot offer a manager, so the control stays
     locked on the count of OPTIONS, not on whether a team was picked. */
  const dependent=function(f,opts){
    const on=!!firstTeam&&opts.length>0;
    const locked=firstTeam&&!opts.length
      ?'No managers listed on '+firstTeam
      :f.locked;
    return '<div class="ep-form-group">'
      +'<label class="ep-form-label">'+f.label+'</label>'
      +(on?apCS('ea-'+f.k,opts,eaData[f.k]||'',f.ph,'eaOnSelect')
          :'<div class="ea-locked is-muted">'+locked+'</div>')
      +'<span class="ea-hint">'+f.hint+'</span></div>';
  };

  const role=eaAccessRole(eaData.accessRole);
  const preview='<aside class="ea-preview">'
    +'<div class="ea-preview-head">Access Preview</div>'
    +'<div class="ea-preview-sub">Live permission summary</div>'
    +(role
      ?'<div class="ea-preview-role">'+role.name+'</div>'
       +'<div class="ea-preview-desc">'+role.desc+'</div>'
       +'<table class="ea-perms"><tbody>'+role.perms.map(function(p){
           return '<tr><td>'+p[0]+'</td><td>'+p[1]+'</td></tr>';
         }).join('')+'</tbody></table>'
       +(teams.length?'<div class="ea-preview-foot">Scoped to '+teams.join(', ')+'</div>'
                     :'<div class="ea-preview-foot">Not scoped to a team — entity-wide within this role.</div>')
      :'<div class="ea-preview-empty">'+EA_ICONS.lock
       +'<span>Select a role to preview access permissions</span></div>')
    +'</aside>';

  const left='<div class="ea-access-main">'
    +eaChipsHTML(teamField,eaTeamNames())
    +'<div class="ea-inline-actions">'
      +'<button type="button" class="ea-inline-link accent" onclick="eaCreateTeam()">+ Create New Team</button>'
      +'<button type="button" class="ea-inline-link" onclick="eaRefresh()">'+EA_ICONS.refresh+' Refresh Teams</button>'
    +'</div>'
    +'<div class="ep-form-grid">'
      +dependent(mgrField,managers)
      +dependent(roleField,EA_TEAM_ROLES)
    +'</div>'
    +'<div class="ea-divider"></div>'
    +'<div class="ea-block-head">Access role <span class="req">*</span></div>'
    +'<div class="ea-block-sub">Grants module permissions from the moment this employee is created</div>'
    +'<div class="choice-grid ea-roles'+(eaShowErrors&&!eaData.accessRole?' ea-bad-wrap':'')+'">'
      +EA_ACCESS_ROLES.map(function(r){
        const on=eaData.accessRole===r.name;
        return '<label class="choice-card'+(on?' selected':'')+'" onclick="eaPickRole(\''+r.name+'\')">'
          +'<input type="radio" name="ea-access-role"'+(on?' checked':'')+'>'
          +'<div class="choice-radio"></div>'
          +'<div class="choice-body"><div class="choice-title">'+r.name+'</div>'
          +'<div class="choice-desc">'+r.desc+'</div></div></label>';
      }).join('')
    +'</div>'
    +(eaShowErrors&&!eaData.accessRole?'<span class="ea-err">Pick the access this employee starts with</span>':'')
    +'</div>';
  return '<div class="ea-access-split">'+left+preview+'</div>';
}

/* + Create New Team opens the team popup on top of this one; saving it brings
   HR straight back here with the new team already ticked. */
function eaCreateTeam(){if(typeof startAddTeam==='function')startAddTeam();}
function eaRefresh(){showToast('Refreshed','info','Options reloaded from the entity.');}

/* The same popup every create form uses (.ct-modal--form): title, the type of
   employee, the four-step stepper, the step's fields, and Back / Save as Draft
   / Next on the sticky footer. Only the X closes it. */
function buildAddEmployeeModalHTML(kind){
  if(!eaOpen||eaKind!==kind)return '';
  if(!eaData)eaData=eaDefaults(eaKind);
  const step=EA_STEPS[eaStep];
  const isLast=eaStep===EA_STEPS.length-1;
  const kindLabel=eaKind==='ge'?'Global Employee':'Direct Employee';
  /* Confirms the step just completed and names the one now open. */
  const banner=eaStep===0?''
    :'<div class="ea-banner">'+EA_ICONS.tick+'<span>'+EA_STEPS[eaStep-1].title
      +' saved. Now complete '+step.title.toLowerCase()+'.</span></div>';
  const x='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ea-page ea-modal" role="dialog" aria-modal="true" aria-label="Create New Employee" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create New Employee<span class="ea-kind">'+kindLabel+'</span></span>'
      +'<button class="ct-modal-close" onclick="eaCancel()" aria-label="Close">'+x+'</button></div>'
    +'<p class="ct-modal-sub">Add employee details to your workforce. Fields marked <span class="req">*</span> are required.</p>'
    +eaStepper()
    +banner
    +'<div class="ea-step-head"><div class="ea-card-title">'+step.cardTitle+'</div><div class="ea-card-sub">'+step.cardSub+'</div></div>'
    +'<div class="ea-step-body">'+eaBody()+'</div>'
    +'<div class="ct-modal-foot">'
      +'<button class="ep-cancel-btn" onclick="'+(eaStep===0?'eaCancel()':'eaBack()')+'">'+(eaStep===0?'Cancel':'Back')+'</button>'
      +'<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="eaSaveDraft()">Save as Draft</button>'
        +'<button class="ep-save-btn" onclick="eaNext()">'+(isLast?'Create Employee':'Next')+'</button>'
      +'</div></div>'
    +'</div></div>';
}
