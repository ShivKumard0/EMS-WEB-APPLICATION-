/* ══ COMPANY SETTINGS · ROLES & ACCESS TAB ══════════════════════════════════
   Who holds which admin role in this entity. "+ Add Role" (and each row's
   Edit) opens one inline form above the table, the same way the RBAC
   Workspaces panel adds a team:

     Assign to   [ Client user | Opendhi staff ]
     Admin Role  (searchable)      Member Name (searchable)
                                         Cancel   Save

   The Assign-to strip decides which roles and which people are offered, so a
   client user can never be handed an Opendhi-only role and vice versa. */

const CS_ROLE_SETS={
  'Client user':['Entity Super Admin','HR Admin','Finance/Billing Admin','Manager','Compliance Officer','IT Admin','EOR Employee','Direct Employee'],
  'Opendhi staff':['Opendhi Super Admin','Global Account Manager','Global Sales Head']
};
/* What each role can reach - shown as the row's Access Scope. */
const CS_ROLE_SCOPE={
  'Opendhi Super Admin':'Every entity on the platform',
  'Global Account Manager':'Accounts and contracts of this entity',
  'Global Sales Head':'Sales orders and pricing',
  'Entity Super Admin':'Full access to this entity',
  'HR Admin':'People, leave, attendance, HR docs',
  'Finance/Billing Admin':'Payroll, payments, invoices',
  'Manager':'Their team\'s requests and timesheets',
  'Compliance Officer':'Verification, KYC and claim reviews',
  'IT Admin':'Admin access and IT steps',
  'EOR Employee':'Own profile, timesheet, leave',
  'Direct Employee':'Own profile, timesheet, leave'
};
const CS_ROLE_TONE={'Opendhi Super Admin':'ok','Entity Super Admin':'ok','Global Account Manager':'info','Global Sales Head':'info',
  'HR Admin':'info','Finance/Billing Admin':'info','Manager':'info','Compliance Officer':'info','IT Admin':'info','EOR Employee':'idle','Direct Employee':'idle'};
const CS_STAFF=[
  {name:'Pallavi Parate',email:'pallavi.parate@opendhi.com'},
  {name:'Shaun Varghese',email:'shaun.varghese@opendhi.com'},
  {name:'Neha Sharma',email:'neha.sharma@opendhi.com'},
  {name:'Aman Singh',email:'aman.singh@opendhi.com'}
];

let csRoles=[
  /* OpenDhi's platform administrator, on every company (EMP-N06). A client's own administrator is an Entity Super Admin. */
  {id:1,kind:'Opendhi staff',role:'Opendhi Super Admin',user:'Shaun Mathew',email:'shaun@testemp.com',added:'12 Apr 2026',entityId:'*'},
  {id:2,kind:'Client user',role:'Direct Employee',   user:'Antar Malhotra',email:'antar@testemp.com',  added:'18 Apr 2026'},
  {id:3,kind:'Client user',role:'Direct Employee',   user:'Shaun J',      email:'shaun.j@testemp.com',added:'22 Apr 2026'},
  {id:4,kind:'Client user',role:'Direct Employee',   user:'Kunal Desai',  email:'default@testemp.com',added:'30 Apr 2026'},
  /* Who the expense approval routes resolve to (Approval Settings → Role). */
  {id:5,kind:'Client user',role:'HR Admin',          user:'Pallavi Parate',email:'pallavi@testemp.com',added:'02 May 2026'},
  {id:6,kind:'Client user',role:'Finance/Billing Admin',user:'Vikram Rao', email:'vikram.rao@opendhi.com',added:'02 May 2026'},
  {id:7,kind:'Client user',role:'Manager',           user:'Prem Raj',     email:'prem.raj@maaserp.com',added:'02 May 2026'},
  {id:8,kind:'Client user',role:'Compliance Officer',user:'Aman Singh',   email:'aman.singh@opendhi.com',added:'07 Nov 2026'},
  {id:9,kind:'Client user',role:'IT Admin',          user:'Neha Sharma',  email:'neha.sharma@opendhi.com',added:'07 Nov 2026'},
  /* Closedhi has no employees yet; OpenDhi (row 1, every company) administers it. */
];
/* Each row is one account (userId) holding one role in one entity (entityId)
   - js/identity.js fills both in at load. The tab lists the active entity's rows. */
let csRoleNext=11;
let csRoleForm=null;   // null, or {id: null for add / row id for edit, kind, role, user}

/* Who can be given a role here (account IDs): Opendhi staff accounts, or this
   entity's people - its employees with a sign-in email, and accounts that
   already hold a role here. An employee with no email cannot sign in, so is
   not offered until HR adds one. */
function csRolePeople(kind){
  if(kind==='Opendhi staff')return CS_STAFF.map(function(s){return s.userId;}).filter(Boolean);
  const ent=idEntity(),out=[];
  /* An employee with an email but no ADT account yet is offered as 'emp:<Employee ID>'; the account is
     created only when that person is given a role (csRoleUid) - never for everyone the list shows. */
  idEmpsIn(ent).forEach(function(e){
    const uid=idUserOfEmp(e.eid);
    if(uid)out.push(uid);else if(e.email)out.push('emp:'+e.eid);
  });
  csRoles.forEach(function(r){if(r.entityId===ent&&r.kind==='Client user'&&out.indexOf(r.userId)<0)out.push(r.userId);});
  return out.filter(function(u){return u.indexOf('emp:')===0||idUserActive(u);}).sort(function(a,b){return csPersonName(a).localeCompare(csPersonName(b));});
}
function csPersonName(t){return String(t).indexOf('emp:')===0?idEmpName(t.slice(4)):idName(t);}
/* Picker labels: the name, with the email when two people share it. */
function csPersonLabels(list){
  return list.map(function(t){
    const n=csPersonName(t),twin=list.some(function(x){return x!==t&&csPersonName(x)===n;});
    const em=String(t).indexOf('emp:')===0?(idEmp(t.slice(4))||{}).email:idEmail(t);
    return twin?n+' · '+em:n;
  });
}
/* The chosen person's account: an employee without one gets it now, linked to their record. */
function csRoleUid(t){
  if(String(t).indexOf('emp:')!==0)return t;
  const e=idEmp(t.slice(4));if(!e||!e.email)return '';
  const uid=idEnsureUser(e.name,e.email,'Client user'),u=idUser(uid);if(u&&!u.eid&&!idUserOfEmp(e.eid))u.eid=e.eid;
  return uid;
}
function csRolesHere(){const ent=idEntity();return csRoles.filter(function(r){return r.entityId===ent||r.entityId==='*';});}
function csRoleCanManage(){return typeof emsCan==='function'&&emsCan('foundation.role.manage');}
function csRoleEmail(kind,name){
  if(kind==='Opendhi staff'){const s=CS_STAFF.find(function(x){return x.name===name;});return s?s.email:'';}
  return name.toLowerCase().replace(/[^a-z]+/g,'.').replace(/^\.|\.$/g,'')+'@opendhi-client.com';
}
function csRoleToday(){
  return new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
}
/* The last Entity Super Admin cannot be removed - the entity would be left
   with nobody who can manage it. */
function csRoleIsLastSuper(r){
  return r.role==='Entity Super Admin'&&csRoles.filter(function(x){return x.role==='Entity Super Admin'&&x.entityId===r.entityId;}).length<=1;
}

/* Opendhi roles - and rows on every company - are the platform's: only a platform user assigns them (EMP-N06). */
function csRoleIsPlatform(r){return !!r&&(r.entityId==='*'||(typeof CS_ROLE_SETS!=='undefined'&&CS_ROLE_SETS['Opendhi staff'].indexOf(r.role)>=0));}
function csRoleCanPlatform(){return typeof emsCan==='function'&&emsCan('platform.access.manage');}
function csRoleOpen(id){
  if(!csRoleCanManage()){emsDeny('assign roles');return;}
  const r=id!=null?csRoles.find(function(x){return x.id===id;}):null;
  if(r&&csRoleIsPlatform(r)&&!csRoleCanPlatform()){emsDeny('change an OpenDhi role');return;}
  csRoleForm=r?{id:r.id,kind:r.kind,role:r.role,uid:r.userId}:{id:null,kind:'Client user',role:'',uid:''};
  refreshCsSidebar();
}
function csRoleClose(){csRoleForm=null;refreshCsSidebar();}
/* Switching who it is for empties the role and member: neither list carries over. */
function csRoleKind(kind){
  if(!csRoleForm||csRoleForm.kind===kind)return;
  csRoleForm.kind=kind;csRoleForm.role='';csRoleForm.uid='';
  refreshCsSidebar();
}

function csRoleFormHTML(){
  const f=csRoleForm,edit=f.id!=null;
  const seg='<div class="segmented is-compact csr-seg">'
    +['Client user','Opendhi staff'].filter(function(k){return k==='Client user'||csRoleCanPlatform();}).map(function(k){
      return '<button type="button" class="seg-btn'+(f.kind===k?' active':'')+'" onclick="csRoleKind(\''+k+'\')">'+k+'</button>';
    }).join('')+'</div>';
  return '<div class="csr-add">'
    +'<div class="csr-add-hd"><span class="lp-sb-section-title">'+(edit?'Edit Role':'Add Role')+'</span></div>'
    +'<div class="ep-form-group csr-kind"><label class="ep-form-label">Assign to</label>'+seg
      +'<div class="ea-hint">'+(f.kind==='Opendhi staff'
        ?'An Opendhi team member who works on this entity\'s account.'
        :'Someone from this entity - an admin or an employee.')+'</div></div>'
    +'<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Admin Role <span class="req">*</span></label>'
        +axCS('csr-role',CS_ROLE_SETS[f.kind],f.role,'Select Role')+'</div>'
      +(f.newPerson&&!edit&&f.kind==='Client user'
        ?'<div class="ep-form-group"><label class="ep-form-label">Full Name <span class="req">*</span></label><input class="ep-form-input" id="csr-new-name" placeholder="Full name"></div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Work Email <span class="req">*</span></label><input class="ep-form-input" id="csr-new-email" type="email" placeholder="name@company.com"></div>'
        :'<div class="ep-form-group"><label class="ep-form-label">Member Name <span class="req">*</span></label>'
        +(function(){   // the current holder is always offered, so Edit shows them
          const p=csRolePeople(f.kind),list=f.uid&&p.indexOf(f.uid)<0?[f.uid].concat(p):p;
          const labels=csPersonLabels(list);return axCS('csr-user',labels,f.uid?labels[list.indexOf(f.uid)]:'','Select Member');})()+'</div>')
    +'</div>'
    +(!edit&&f.kind==='Client user'&&typeof csRoleNewPerson==='function'
      ?'<div class="csr-new"><button type="button" class="att-link" onclick="csRoleNewPerson('+(f.newPerson?'false':'true')+')">'+(f.newPerson?'Pick an existing person':'Add a new person')+'</button></div>':'')
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="csRoleClose()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="csRoleSave()">'+(edit?'Save changes':'Save')+'</button></div>'
  +'</div>';
}

function csRoleSave(){
  const f=csRoleForm;if(!f)return;
  if(!csRoleCanManage()){emsDeny('assign roles');return;}
  const role=getCSValue('csr-role');
  if(!role){showToast('Admin Role is required','error');return;}
  if((f.kind==='Opendhi staff'||csRoleIsPlatform({role:role}))&&!csRoleCanPlatform()){emsDeny('assign an OpenDhi role');return;}
  let uid='';
  if(f.newPerson&&f.id==null&&typeof csRoleNewPersonUid==='function'){const np=csRoleNewPersonUid();if(np.error){showToast(np.error,'error');return;}uid=np.uid;}
  else{
    const pool=(function(){const p=csRolePeople(f.kind);return f.uid&&p.indexOf(f.uid)<0?[f.uid].concat(p):p;})();
    const labels=csPersonLabels(pool),at=labels.indexOf(getCSValue('csr-user'));
    uid=at<0?'':csRoleUid(pool[at]);
  }
  if(!uid){showToast('Member Name is required','error');return;}
  const ent=idEntity(),name=idName(uid);
  if(csRoles.some(function(r){return r.id!==f.id&&r.userId===uid&&r.role===role&&r.entityId===ent;})){
    showToast(name+' already has this role','error');return;}
  if(f.id!=null){
    const r=csRoles.find(function(x){return x.id===f.id;});if(!r)return;
    if(csRoleIsLastSuper(r)&&role!=='Entity Super Admin'){
      showToast('Keep one Entity Super Admin','error','Give the role to someone else first, then change '+idName(r.userId)+'.');return;}
    const was=r.role;
    Object.assign(r,{kind:f.kind,role:role,userId:uid,user:name,email:idEmail(uid)});
    csRoleForm=null;csRoleChanged();
    showToast('Role updated','success',name+(was!==role?': '+was+' → '+role:' · '+role));
    return;
  }
  csRoles.push({id:csRoleNext++,kind:f.kind,role:role,userId:uid,user:name,email:idEmail(uid),entityId:ent,added:csRoleToday()});
  csRoleForm=null;csRoleChanged();
  showToast('Role added','success',name+' is now '+role+' in '+idEntityName(ent)+'.');
}
/* A role change can change what the signed-in person may do right now. */
function csRoleChanged(){
  if(typeof emsSyncIdentity==='function')emsSyncIdentity();
  refreshCsSidebar();
  if(typeof emsApplyChrome==='function')emsApplyChrome();
}
function csRoleRemove(id){
  if(!csRoleCanManage()){emsDeny('remove roles');return;}
  const r=csRoles.find(function(x){return x.id===id;});if(!r)return;
  if(csRoleIsPlatform(r)&&!csRoleCanPlatform()){emsDeny('remove an OpenDhi role');return;}
  if(csRoleIsLastSuper(r)){showToast('Keep one Entity Super Admin','error');return;}
  csRoles=csRoles.filter(function(x){return x.id!==id;});
  if(csRoleForm&&csRoleForm.id===id)csRoleForm=null;
  csRoleChanged();
  showToast('Role removed','success',idName(r.userId)+' no longer has '+r.role+'.');
}

function csRolesTabHTML(){
  const editSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const binSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  const plusSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const initials=function(n){return n.split(/\s+/).map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();};
  const can=csRoleCanManage();
  return (csRoleForm?csRoleFormHTML()
      :can?'<div class="att-bar csag-bar"><div class="att-bar-actions"><button class="att-link" onclick="csRoleOpen()">'+plusSvg+'Add Role</button></div></div>':'')
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>User</th><th>Role</th><th>Access Scope</th><th>Added On</th><th class="csag-act">Action</th>'
    +'</tr></thead><tbody>'
    +csRolesSorted().map(function(r,i){
      const nm=idName(r.userId)||r.user;
      return '<tr'+(csRoleForm&&csRoleForm.id===r.id?' class="csr-editing"':'')+'>'
        +'<td class="csag-td csag-num">'+(i+1)+'</td>'
        +'<td class="csag-td"><div class="csag-file">'
          +'<span class="cs-role-av">'+initials(nm)+'</span>'
          +'<div class="csag-file-txt"><div class="lp-c-main">'+sbEsc(nm)+'</div>'
          +'<div class="lp-c-sub">'+sbEsc(idEmail(r.userId)||r.email)+(r.kind==='Opendhi staff'?' · Opendhi staff':'')+'</div></div></div></td>'
        +'<td class="csag-td"><span class="lp-status-badge tone-'+(CS_ROLE_TONE[r.role]||'info')+'">'+sbEsc(r.role)+'</span></td>'
        +'<td class="csag-td cs-role-scope">'+sbEsc(CS_ROLE_SCOPE[r.role]||'')+'</td>'
        +'<td class="csag-td">'+sbEsc(r.added)+'</td>'
        +'<td class="csag-td csag-act">'
          +(can&&(!csRoleIsPlatform(r)||csRoleCanPlatform())?'<button class="att-row-btn" title="Edit role" onclick="csRoleOpen('+r.id+')">'+editSvg+'</button>':'')
          +(!can||csRoleIsLastSuper(r)||(csRoleIsPlatform(r)&&!csRoleCanPlatform())?''   /* the last super admin cannot be removed, so no button promises it */
            :'<button class="att-row-btn is-danger" title="Remove role" onclick="csRoleRemove('+r.id+')">'+binSvg+'</button>')
        +'</td></tr>';
    }).join('')
    +'</tbody></table></div>';
}

/* Display order only: the admin roles first (the people who run the entity), employees after; rows of the
   same role keep their order. csRoles itself is not reordered, so approval routes resolve exactly as before. */
const CS_ROLE_RANK=['Entity Super Admin','Opendhi Super Admin','Finance/Billing Admin','HR Admin','Manager','Compliance Officer','IT Admin',
  'Global Account Manager','Global Sales Head','EOR Employee','Direct Employee'];
function csRolesSorted(){
  const rank=function(r){const i=CS_ROLE_RANK.indexOf(r.role);return i<0?CS_ROLE_RANK.length:i;};
  return csRolesHere().map(function(r,i){return {r:r,i:i};}).sort(function(a,b){return rank(a.r)-rank(b.r)||a.i-b.i;}).map(function(x){return x.r;});
}

