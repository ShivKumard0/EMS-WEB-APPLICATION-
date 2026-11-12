/* ══ ACCESS: WHO IS SIGNED IN, WHAT THEY MAY DO, WHAT IS SWITCHED ON ═══════════
   Every screen asks the same three questions before it draws anything.

   1. WHO. The account signed in on the Sign in screen (js/identity.js). It
      is the person behind every action for the whole session; nothing here
      lets one person act as another. Switch Role offers only the roles that
      account holds in the active entity: Company Settings → Roles & Access,
      plus Employee when it has an active employee record there.

   2. WHAT. RBAC alone. The active templates whose Roles include the role in
      use, plus the templates of the account's teams in the entity's RBAC
      workspace. Pages, menu items, buttons and record scope all read the
      same permission codes; change a template and access changes. No role
      name is checked in code.

   3. WHAT IS ON. Module Control (Company Settings → Platform & Integrations
      → Module Control), one set of switches per entity. A disabled module
      overrides every RBAC grant. Module Control itself stays reachable for
      whoever holds platform.module.control, whatever is switched off.

   Maker-checker is never relaxed: approvals are refused to the person who
   prepared or benefits from the request, Super Admin included. */

/* ── Roles ────────────────────────────────────────────────────────────── */
/* A switcher role → the Roles & Access role names that confer it (cs) and the
   role names RBAC templates are applied to (rb). */
const EMS_ROLE_SOURCE={
  /* OpenDhi, the platform owner (EMP-N06). A client's own administrator is Company Admin. */
  'Super Admin':{cs:['Opendhi Super Admin'],rb:['Super Admin']},
  'Company Admin':{cs:['Entity Super Admin'],rb:['Company Admin']},
  'HR':{cs:['HR Admin'],rb:['HR Admin','HR Manager']},
  'Finance':{cs:['Finance/Billing Admin'],rb:['Finance Admin']},
  'Reporting Manager':{cs:['Manager'],rb:['Reporting Manager']},
  'Compliance':{cs:['Compliance Officer'],rb:['Compliance Officer']},
  'IT':{cs:['IT Admin'],rb:['IT Admin']},
  'Employee':{cs:['Direct Employee','EOR Employee'],rb:['Employee']}
};
const EMS_ROLE_LABEL={'HR':'HR Admin','Finance':'Finance Admin'};
/* The role a session starts in: the broadest one held. */
const EMS_ROLE_ORDER=['Super Admin','Company Admin','HR','Finance','Compliance','IT','Reporting Manager','Employee'];
/* Roles kept off the top-bar Switch Role. Empty: every role, Employee included, is offered, so each
   role's own experience can be worked through Switch User (product decision of 7 Nov 2026). */
const EMS_SWITCHER_HIDDEN=[];
function emsRole(){return typeof currentRole!=='undefined'&&currentRole?currentRole:'';}
function emsRoleLabel(r){r=r||emsRole();return EMS_ROLE_LABEL[r]||r||'No role';}
/* One render's worth of lookups; cleared on the next tick and whenever the account, role or entity changes. */
let emsCache=null;
function emsClearCache(){emsCache=null;}
function emsC(){if(!emsCache){emsCache={};setTimeout(emsClearCache,0);}return emsCache;}

/* The switcher roles an account holds in an entity. */
function emsRolesOf(uid,ent){
  if(!uid||uid==='System')return [];
  const held=idRolesOf(uid,ent||idEntity());
  return EMS_ROLE_ORDER.filter(function(r){return EMS_ROLE_SOURCE[r].cs.some(function(c){return held.indexOf(c)>=0;});});
}
function emsRolesHeld(){return emsRolesOf(idMe(),idEntity());}
/* D7 (product owner, 9 Nov 2026): only an OpenDhi Super Admin, signed in as themselves, previews other people
   through Switch Role. Everyone else, Company Admins included, is offered only the roles their own account holds,
   and always works as themselves. */
function emsActual(){return typeof idAuthMe==='function'?idAuthMe():idMe();}
function emsCanPreview(){const a=emsActual();return !!a&&emsPlatformUser(a);}
/* Roles Switch Role offers: every role someone holds in this entity (OpenDhi preview), else the account's own. */
function emsRolesOffered(){
  if(emsCanPreview())return EMS_ROLE_ORDER.filter(function(r){return emsHolders(r).length>0;});
  return emsRolesOf(emsActual(),idEntity());
}
/* Who a direct switch lands on: the holder last picked for the role here,
   else the first holder in Roles & Access order. */
const emsPicked={};
/* The Employee Dashboard's own employee (employee-lifecycle.js empSelf as
   shipped), captured before the session takes empSelf over. */
const EMS_DASH_SELF=typeof empSelf!=='undefined'?{kind:empSelf.kind,id:empSelf.id}:null;
/* A person's main role here: the broadest one they hold. */
function emsMainRole(uid){return emsRolesOf(uid,idEntity())[0]||'';}
/* Who one click on a role lands on: the holder last picked for it here; else
   the person already working, when it is their main role; else the person
   whose main role it is (for Employee, the Employee Dashboard's employee),
   in Roles & Access order. */
function emsDefaultHolder(role){
  const h=emsHolders(role),k=idEntity()+'|'+role;
  if(!h.length)return '';
  /* Someone whose own main role this is keeps working as themselves (7 Nov 2026). */
  if(h.indexOf(idMe())>=0&&emsMainRole(idMe())===role)return idMe();
  if(h.indexOf(emsPicked[k])>=0)return emsPicked[k];
  /* Employee: an employee whose record is Active, so the employee journey can be worked through. */
  const active=function(u){const e=typeof idEmpOfUser==='function'?idEmpOfUser(u):null;return !!e&&typeof empState==='function'&&idEmpKind(e)!=='ax'&&empState(e).status==='Active';};
  if(role==='Employee'&&EMS_DASH_SELF&&typeof empFind==='function'){
    const e=empFind(EMS_DASH_SELF.kind,EMS_DASH_SELF.id),u=e?idUserOfEmp(e.eid):'';
    if(u&&h.indexOf(u)>=0&&active(u))return u;
  }
  if(role==='Employee'){const a=h.find(function(u){return emsMainRole(u)===role&&active(u);});if(a)return a;}
  return h.find(function(u){return emsMainRole(u)===role;})||h[0];
}
/* Switch Role. A role the signed-in person holds: they keep working as
   themselves. A role they do not hold: the session switches straight to a
   person who holds it here (no sign-in), and every action from then on is
   that person's - nobody is recorded as someone else. */
function emsSwitchRole(role){
  if(!emsCanPreview()){
    const me=emsActual();
    if(emsRolesOf(me,idEntity()).indexOf(role)<0)return {ok:false,error:'You can switch only between your own roles.'};
    if(idMe()!==me){idSwitchTo(me);emsClearCache();}
    return {ok:true,switched:false};
  }
  const uid=emsDefaultHolder(role);
  if(!uid)return {ok:false,error:'Nobody holds '+emsRoleLabel(role)+' in '+idEntityName(idEntity())+'. Assign it in Company Settings → Roles & Access.'};
  if(uid===idMe())return {ok:true,switched:false};
  idSwitchTo(uid);emsClearCache();
  return {ok:true,switched:true};
}
/* "Working as": another holder of the role in use. */
function emsSetActor(uid){
  const role=emsRole();
  if(uid!==emsActual()&&!emsCanPreview()){showToast('Not available','error','You can switch only between your own roles.');return false;}
  if(emsHolders(role).indexOf(uid)<0){showToast('Not a holder','error',idName(uid)+' does not hold '+emsRoleLabel(role)+' in '+idEntityName(idEntity())+'.');return false;}
  emsPicked[idEntity()+'|'+role]=uid;
  idSwitchTo(uid);currentRole=role;emsSyncIdentity();
  if(typeof closeAllHdrDD==='function')closeAllHdrDD();
  renderADTPage();emsApplyChrome();
  if(typeof syncHeaderUser==='function')syncHeaderUser();
  if(typeof notifSyncBell==='function')notifSyncBell();
  showToast('Working as '+idName(uid),'info',emsRoleLabel(role)+' · actions are recorded under '+idName(uid)+'.');
  return true;
}
/* Everyone holding a switcher role in an entity (user IDs). */
function emsHolders(role,ent){
  ent=ent||idEntity();
  const c=emsC();c.holders=c.holders||{};const k=role+'|'+ent;
  if(c.holders[k])return c.holders[k];
  return (c.holders[k]=idUsersIn(ent).filter(function(u){return emsRolesOf(u.userId,ent).indexOf(role)>=0;}).map(function(u){return u.userId;}));
}

/* ── The signed-in person ─────────────────────────────────────────────── */
function emsActorId(){return idMe();}
function emsActorName(){return idMeName();}
/* After sign-in, a role switch or an entity switch: keep the role one the
   account holds here, and point the app-wide "signed in" values at it. */
function emsSyncIdentity(){
  emsClearCache();
  /* Entity-owned settings that live in one variable follow the entity. */
  if(typeof csAttForEntity==='function')csAttForEntity();
  const held=emsRolesHeld();
  if(held.indexOf(currentRole)<0)currentRole=held[0]||'';
  CURRENT_USER=idMeName()||'Not signed in';
  CURRENT_USER_ID=idMe();
  if(typeof empSelf!=='undefined'){
    const e=emsActorRecord(),k=e?idEmpKind(e):'';
    empSelf=(k==='de'||k==='ge')?{kind:k,id:e.id}:{kind:'',id:null};
  }
  /* DT-716: an open My Profile follows the switch. */
  if(typeof empProfPersona!=='undefined'&&typeof empProfOwnPersona==='function')empProfPersona=empProfOwnPersona();
}
/* After Switch Entity: role, settings, masters, chrome and bell for the new entity. */
function appEntityChanged(){
  emsSyncIdentity();
  if(typeof csStructSyncWizard==='function')csStructSyncWizard();
  if(typeof csSelectedItem!=='undefined')csSelectedItem=null;
  emsApplyChrome();
  if(typeof syncHeaderUser==='function')syncHeaderUser();
  if(typeof notifSyncBell==='function')notifSyncBell();
}
function emsActorInfo(){
  const uid=idMe();if(!uid)return null;
  const n=idName(uid);
  return {name:n,initials:n.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase(),email:idEmail(uid),role:emsRoleLabel()};
}
/* The signed-in person's own employee record in the active entity. */
function emsActorRecord(){const e=idEmpOfUser(idMe());return e&&e.entityId===idEntity()?e:null;}
function emsMe(){return emsActorRecord();}
function emsIsMe(emp){const me=emsActorRecord();return !!(me&&emp&&emp.eid===me.eid);}

/* ── Permissions: RBAC templates by role + workspace teams ──────────────── */
function emsWorkspace(ent){
  ent=ent||idEntity();
  return (typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).find(function(w){return w.entityId===ent&&w.status==='Active';})||null;
}
/* An EMS client company's own administrator (Company Admin) has every function
   of every role in that company: the Super Admin rule, for one company
   (product owner, 9 Nov 2026). Platform rights stay OpenDhi's (emsStripPlatform),
   acting as another person stays OpenDhi's (emsCanPreview), and every control
   still applies: maker-checker by the actual actor, no self-approval, mandatory
   stages, and stage fit for card and budget approvals. */
function emsClientAdminAll(role){
  if(role!=='Company Admin')return false;
  const e=typeof idEntityRec==='function'?idEntityRec(idEntity()):null;
  return !!(e&&e.emsOnly);
}
function emsRolePerms(role){
  const c=emsC();c.rp=c.rp||{};
  const all=emsClientAdminAll(role),key=all?role+'@'+idEntity():role;
  if(c.rp[key])return c.rp[key];
  const rb=[].concat((EMS_ROLE_SOURCE[role]||{rb:[]}).rb,all?EMS_ROLE_SOURCE['Super Admin'].rb:[]),set={};
  (typeof rbacTemplatesData!=='undefined'?rbacTemplatesData:[]).forEach(function(t){
    if(t.status==='Active'&&(t.roles||[]).some(function(x){return rb.indexOf(x)>=0;}))t.perms.forEach(function(k){set[k]=1;});
  });
  return (c.rp[key]=set);
}
/* Templates of the teams an account belongs to in the entity's workspace,
   and in the platform workspace (Opendhi staff). */
function emsTeamPerms(uid){
  const c=emsC();c.tp=c.tp||{};
  if(c.tp[uid])return c.tp[uid];
  const set={};
  if(uid)(typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).forEach(function(w){
    if(w.status!=='Active'||(w.entityId!==idEntity()&&w.entityId!=='*'))return;
    w.teams.forEach(function(t){
      if(t.members.indexOf(uid)<0)return;
      const tp=typeof wsTpl==='function'?wsTpl(t):null;
      if(tp&&tp.status==='Active')tp.perms.forEach(function(k){set[k]=1;});
    });
  });
  return (c.tp[uid]=set);
}
/* Platform users: an Opendhi role (Roles & Access 'Opendhi staff' roles) in this company or on the whole
   platform ('*'). Everyone else is a client user, and platform codes are removed from what they hold -
   one check for every role, team and template, so no client assignment can reach platform rights. */
function emsPlatformUser(uid,ent){
  ent=ent||idEntity();if(!uid)return false;
  const staff=typeof CS_ROLE_SETS!=='undefined'?CS_ROLE_SETS['Opendhi staff']:['Opendhi Super Admin'];
  return (typeof csRoles!=='undefined'?csRoles:[]).some(function(r){return r.userId===uid&&(r.entityId===ent||r.entityId==='*')&&staff.indexOf(r.role)>=0;});
}
function emsStripPlatform(set,uid){
  if(emsPlatformUser(uid))return set;
  const codes=typeof RB_PLATFORM_CODES!=='undefined'?RB_PLATFORM_CODES:[],o={};
  Object.keys(set).forEach(function(k){if(codes.indexOf(k)<0)o[k]=set[k];});
  return o;
}
function emsPerms(){
  const c=emsC(),key=emsRole()+'|'+idMe()+'|'+idEntity();
  if(c.perms&&c.permsKey===key)return c.perms;
  c.permsKey=key;
  return (c.perms=idMe()&&emsRole()?emsStripPlatform(Object.assign({},emsRolePerms(emsRole()),emsTeamPerms(idMe()),emsSelfService()),idMe()):{});
}
/* In an EMS client company, a person who is also an employee keeps the self-service of their own card - their card
   KYC and their card - whatever role they are working in: a manager holds a card too (product owner, 10 Nov 2026).
   Only these own-record rights, and only those the Employee role itself grants; nothing about anyone else's records. */
const EMS_SELF_CODES=['onc.enroll.self','onc.enroll.view','card.view.own','card.transaction.view.own','card.request.create','card.dispute.raise',
  'card.replacement.request','card.safety.report','card.control.view'];
function emsSelfService(){
  const e=typeof idEntityRec==='function'?idEntityRec(idEntity()):null;
  if(!e||!e.emsOnly||emsRole()==='Employee'||emsRolesOf(idMe(),idEntity()).indexOf('Employee')<0)return {};
  const emp=emsRolePerms('Employee'),o={};
  EMS_SELF_CODES.forEach(function(k){if(emp[k])o[k]=1;});
  return o;
}
function emsCan(code){return !!emsPerms()[code];}
/* What another account may do across every role it holds here and every
   team it is in - to check an approver, fallback or escalation target. */
function emsPersonPerms(uid){
  const c=emsC();c.pp=c.pp||{};
  if(c.pp[uid])return c.pp[uid];
  const set=Object.assign({},emsTeamPerms(uid));
  emsRolesOf(uid,idEntity()).forEach(function(r){Object.assign(set,emsRolePerms(r));});
  return (c.pp[uid]=emsStripPlatform(set,uid));
}
function emsPersonCan(uid,code){return !!emsPersonPerms(uid)[code];}
/* Everyone in the active entity who holds a right (user IDs). */
function emsPermHolders(code){return idUsersIn().map(function(u){return u.userId;}).filter(function(uid){return emsPersonCan(uid,code);});}
function emsDeny(what){showToast('Not permitted','error',emsRoleLabel()+(idMe()?' ('+idMeName()+')':'')+' cannot '+what+'. Access comes from RBAC templates.');return false;}

/* ── Module Control ───────────────────────────────────────────────────── */
const MC_MODULES=[
  {key:'people',label:'People',covers:'Teams and HR Docs (Employees always stay on)',active:true},
  {key:'contracts',label:'Contracts',covers:'Contracts overview and templates',active:true},
  {key:'timesheets',label:'Timesheets',covers:'Time & Attendance: timesheets, leaves, holidays',active:true},
  {key:'payroll',label:'Payroll',covers:'Payroll runs and payheads',active:true},
  {key:'salary',label:'Salary',covers:'Salary details and payslips',active:true},
  {key:'payments',label:'Payments',covers:'Finance → Payments',active:true},
  {key:'compliance',label:'Compliance Hub',covers:'Compliance items, rates and rules',active:true},
  {key:'admin',label:'Admin Access',covers:'Assets and IT accesses',active:true},
  {key:'announcements',label:'Announcements',covers:'Company announcements',active:true},
  {key:'support',label:'Support',covers:'Chats and tickets',active:true},
  {key:'settings',label:'Company Settings',covers:'Entity settings tabs, including this one',active:false,always:true},
  {key:'expenses',label:'Expenses',covers:'Expenses & Advances, Capping Limit, Wallet & Benefits, card enrollment, My Benefits',active:true}
];
/* One set of switches, and one change log, per entity (by Entity ID). */
const mcStates={},mcLogBook={};
function mcStateOf(ent){
  ent=ent||idEntity();
  return mcStates[ent]||(mcStates[ent]={people:true,contracts:true,timesheets:true,payroll:true,salary:true,payments:true,settings:true,expenses:true});
}
function mcLogsOf(ent){ent=ent||idEntity();return mcLogBook[ent]||(mcLogBook[ent]=[]);}
/* Page id → module key. Pages not listed are always on - Company Settings
   (and with it Module Control) is never switched off by a module switch. */
const MC_PAGE_MODULE={expenses:'expenses','capping-limit':'expenses','wallet-benefits':'expenses',advances:'expenses',
  teams:'people','hr-docs':'people',contracts:'contracts','contract-templates':'contracts',
  timesheet:'timesheets','all-leaves':'timesheets','leave-policies':'timesheets',holidays:'timesheets',
  payroll:'payroll',payheads:'payroll',payments:'payments',compliance:'compliance','rates-rules':'compliance',
  'asset-allocation':'admin','it-access':'admin',announcements:'announcements',chats:'support','support-tickets':'support'};
/* The EMS modules; a company created on the platform starts with these on and the rest off. */
const MC_EMS_KEYS=['expenses','cards','budgets'];
function mcNewCompanyState(st){MC_MODULES.forEach(function(m){if(m.always)return;st[m.key]=MC_EMS_KEYS.indexOf(m.key)>=0;});return st;}
function mcOn(key){return mcStateOf()[key]!==false;}
function mcPageAllowed(pg){const m=MC_PAGE_MODULE[pg];return !m||mcOn(m);}
function mcToggle(key){
  if(!emsCan('platform.module.control')){emsDeny('change Module Control');return;}
  const m=MC_MODULES.find(function(x){return x.key===key;});if(!m)return;
  if(!m.active){showToast(m.label+' switch','info',m.always?m.label+' is always on: Module Control lives there.':'Available in a later release.');return;}
  mcStateOf()[key]=!mcOn(key);
  if(!mcOn(key)&&typeof caCloseForms==='function')caCloseForms();
  const s=stampNow();
  mcLogsOf().unshift({date:s.date,time:s.time,user:idMeName(),userId:idMe(),status:mcOn(key)?'Enabled':'Disabled',
    action:m.label+' module '+(mcOn(key)?'enabled':'disabled')+' for '+idEntityName(idEntity())+'.'});
  if(!mcOn(key)&&MC_PAGE_MODULE[page]===key){navigatePage('settings');}
  else renderADTPage();
  showToast(m.label+' '+(mcOn(key)?'enabled':'disabled'),'success',mcOn(key)?'Its sidebar items and screens are back for everyone in the entity.':'Its sidebar items and screens are hidden for everyone in the entity, whatever their RBAC grants.');
}
function mcTabHTML(){
  if(!emsCan('platform.module.control'))return '<div class="wb-empty-sm">Module Control is managed by Opendhi.</div>';
  const rows=MC_MODULES.map(function(m,i){
    const on=mcOn(m.key);
    return '<tr>'
      +'<td class="csag-td csag-num">'+(i+1)+'</td>'
      +'<td class="csag-td"><div class="lp-c-main">'+sbEsc(m.label)+'</div><div class="lp-c-sub">'+sbEsc(m.covers)+'</div></td>'
      +'<td class="csag-td">'+(m.active?axBadge(on?'ok':'bad',on?'Enabled':'Disabled'):'<span class="lp-status-badge tone-idle">Always on</span>')+'</td>'
      +'<td class="csag-td csag-act">'+(m.active
        ?'<label class="cs-toggle"><input type="checkbox"'+(on?' checked':'')+' onchange="mcToggle(\''+m.key+'\')"><span class="cs-toggle-slider"></span></label>'
        :'<span class="wb-muted">'+(m.always?'Always on':'Available in a later release')+'</span>')+'</td>'
      +'</tr>';
  }).join('');
  const logs=mcLogsOf();
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Module Control · '+sbEsc(idEntityName(idEntity()))+'</span></div>'
    +'<div class="wb-note">Switching off a module hides its screens for everyone in this entity.</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Module</th><th>Status</th><th class="csag-act">Switch</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +mcClientMenuHTML()
    ;   // its change log: Company Settings → Activity & Audit → Logs
}
/* An EMS client company's menu (entity.emsOnly, see emsClientOnly): set by OpenDhi per company. */
function mcClientMenuHTML(){
  const e=typeof idEntityRec==='function'?idEntityRec(idEntity()):null;if(!e)return '';
  const on=!!e.emsOnly;
  return '<div class="wb-proj-h">Client menu</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table mc-client"><tbody><tr>'
    +'<td class="csag-td"><div class="lp-c-main">EMS-only menu</div><div class="lp-c-sub">Dashboard, Employees, the EMS modules, Company Settings and Roles</div></td>'
    +'<td class="csag-td">'+axBadge(on?'ok':'idle',on?'On':'Off')+'</td>'
    +'<td class="csag-td csag-act"><label class="cs-toggle"><input type="checkbox"'+(on?' checked':'')+' onchange="mcClientToggle()"><span class="cs-toggle-slider"></span></label></td></tr></tbody></table></div>';
}
function mcClientToggle(){
  if(!emsCan('platform.module.control')){emsDeny('change Module Control');return;}
  const e=idEntityRec(idEntity());if(!e)return;
  e.emsOnly=!e.emsOnly;
  const s=stampNow();
  mcLogsOf().unshift({date:s.date,time:s.time,user:idMeName(),userId:idMe(),status:e.emsOnly?'Enabled':'Disabled',
    action:'EMS-only menu '+(e.emsOnly?'switched on':'switched off')+' for '+idEntityName(idEntity())+'.'});
  if(typeof lastSidebarSig!=='undefined')lastSidebarSig='';
  renderADTPage();
  showToast('EMS-only menu '+(e.emsOnly?'on':'off'),'success',idEntityName(idEntity())+(e.emsOnly?' now shows only the EMS and the screens it depends on.':' shows the full ADT menu again.'));
}
function mcNotEnabledHTML(pg){
  const m=MC_MODULES.find(function(x){return x.key===MC_PAGE_MODULE[pg||(typeof page!=='undefined'?page:'')];});
  return '<div class="lp-page"><div class="wb-empty"><b>Module not enabled for this client</b><span>'+sbEsc(m?m.label:'Expenses')+' is switched off for '+sbEsc(idEntityName(idEntity()))+' in Company Settings → Module Control.'
    +(m&&(m.key==='budgets'||m.key==='cards')?' Its records are kept.':'')+'</span></div></div>';
}

/* ── Pages: which RBAC rights open them ────────────────────────────────── */
/* Any one of the codes opens the page. Pages not listed (Dashboard, My
   Profile, Apply Application, Switch Entity, AI journeys) are open to every
   signed-in person; what they show is still scoped to that person. */
const APP_PAGE_PERMS={
  'employees':['h2r.employee.view','h2r.employee.view.team','h2r.employee.own'],
  'teams':['h2r.team.view'],
  'contracts':['contract.view'],
  'contract-templates':['contract.template.view'],
  'hr-docs':['h2r.hrdoc.view'],
  'timesheet':['time.timesheet.view','time.timesheet.own'],
  'all-leaves':['h2r.leave.view.all','h2r.leave.view.team','h2r.leave.apply'],
  'leave-policies':['h2r.leave.policy.view'],
  'holidays':['h2r.holiday.view'],
  'payroll':['payroll.run.view'],
  'payheads':['payroll.payhead.view'],
  'expenses':['expense.claim.view','expense.claim.submit'],
  'capping-limit':['expense.policy.list'],
  'advances':['advance.view.own','advance.view.team','advance.view.all'],
  'budgets':['budget.view','budget.report.view','funding.source.manage','funding.transaction.create','funding.transaction.verify','funding.transaction.reverse','funding.report.view'],
  'cards':['card.view.own','card.view.team','card.view.all','card.request.create','card.request.others','card.load.create','card.load.approve','card.load.verify','card.control.view','card.report.view','card.transaction.view.own','card.transaction.view.team','card.transaction.view.all','card.reconciliation.view','card.transaction.import','card.statement.verify','card.transaction.match','card.csx.resolve','card.refund.verify','card.reconciliation.signoff','card.dispute.raise','card.dispute.view','card.dispute.manage'],
  'wallet-benefits':['benefit.wallet.view','benefit.category.view','benefit.policy.view','benefit.entitlement.view','benefit.allocation.view','benefit.override.view','benefit.tax.view'],
  'payments':['finance.payment.view'],
  'compliance':['compliance.item.view'],
  'rates-rules':['compliance.rates.view'],
  'settings':['foundation.entity.view'],
  'all-users':['foundation.user.view'],
  'asset-allocation':['admin.asset.view'],
  'it-access':['admin.itaccess.view'],
  'rbac-workspaces':['foundation.role.view'],
  'rbac-templates':['foundation.role.view'],
  'announcements':['announcement.manage'],
  'chats':['support.chat'],
  'support-tickets':['support.ticket']
};
/* The page's + button: the right to create there. */
const APP_ADD_PERMS={
  'expenses':['expense.claim.submit'],'capping-limit':['expense.policy.manage'],
  'advances':['advance.create','advance.create.others','advance.imprest.manage','advance.settings.manage','advance.policy.manage'],
  'budgets':['budget.create','budget.manage','budget.revise.request','budget.transfer.request','budget.exception.request','funding.source.manage','funding.transaction.create'],
  'cards':['card.request.create','card.request.others','card.load.create','card.load.bulk','card.enrollment.bulk','card.control.manage'],
  'wallet-benefits':['benefit.wallet.manage','benefit.category.manage','benefit.policy.manage','benefit.override.manage','benefit.tax.manage','benefit.allocation.generate'],
  'employees':['h2r.employee.create','h2r.employee.bulk'],'teams':['h2r.team.create'],'contracts':['contract.manage'],'contract-templates':['contract.template.manage'],
  'all-leaves':['h2r.leave.apply'],'leave-policies':['h2r.policy.manage'],'holidays':['h2r.holiday.manage'],
  'payroll':['payroll.run.create'],'payheads':['payroll.payhead.manage'],'payments':['finance.payment.manage'],
  'compliance':['compliance.item.manage'],'rates-rules':['compliance.rates.manage'],'settings':['foundation.entity.create'],
  'all-users':['foundation.user.invite'],'asset-allocation':['admin.asset.manage'],'it-access':['admin.itaccess.manage'],
  'rbac-workspaces':['platform.access.manage'],'rbac-templates':['platform.template.manage'],'announcements':['announcement.manage'],
  'support-tickets':['support.ticket'],'chats':['support.chat']
};
function appPagePermitted(pg){const need=APP_PAGE_PERMS[pg];return !need||need.some(emsCan);}
/* Kept for the Expense Management callers. */
function emsPagePermitted(pg){return appPagePermitted(pg);}
/* An EMS client company (entity.emsOnly): its menu holds the EMS and the
   workforce and settings screens EMS depends on; the rest of ADT stays out
   of the way. The ADT platform company keeps its full menu. */
/* Teams sits under People in client companies too, as in the platform company (product owner, 12 Nov 2026). */
const EMS_CLIENT_PAGES=['dashboard','employees','teams','expenses','capping-limit','wallet-benefits','budgets','cards','settings','rbac-workspaces','rbac-templates'];
function emsClientOnly(){const e=typeof idEntityRec==='function'?idEntityRec(idEntity()):null;return !!(e&&e.emsOnly);}
function emsMenuPage(id){let f=false;(typeof sidebarItems!=='undefined'?sidebarItems:[]).forEach(function(i){if(i.id===id||(i.children||[]).some(function(c){return c.id===id;}))f=true;});return f;}
function emsClientHidden(id){
  if(!emsClientOnly()||!emsMenuPage(id)||EMS_CLIENT_PAGES.indexOf(id)>=0)return false;
  const mk=MC_PAGE_MODULE[id];
  return !(mk&&MC_EMS_KEYS.indexOf(mk)<0&&mcOn(mk));   // a module switched on in Module Control shows
}
function emsSidebarItems(){
  const base=typeof sidebarItems!=='undefined'?sidebarItems:[];
  const keep=function(id){return mcPageAllowed(id)&&appPagePermitted(id)&&!emsClientHidden(id);};
  const out=[];let pendingSection=null;
  base.forEach(function(item){
    if(item.section){pendingSection=item;return;}
    let it=null;
    if(item.dropdown){
      const ch=(item.children||[]).filter(function(c){return keep(c.id);});
      if(!ch.length)return;
      it=Object.assign({},item,{children:ch});
    }else{
      if(!keep(item.id))return;
      it=item;
    }
    if(pendingSection){out.push(pendingSection);pendingSection=null;}
    out.push(it);
  });
  return out;
}
/* The sidebar rebuilds only when its signature changes. */
function emsSidebarSig(){return emsRole()+'|'+idMe()+'|'+idEntity()+'|'+Object.keys(APP_PAGE_PERMS).map(function(p){return appPagePermitted(p)?1:0;}).join('')+'|'+MC_MODULES.map(function(m){return mcOn(m.key)?1:0;}).join('');}

/* ── Page guard and chrome ───────────────────────────────────────────── */
function emsPageGuard(pg){
  if(!idMe()||!emsRole())return '<div class="lp-page"><div class="wb-empty"><b>No access to this entity</b><span>'+sbEsc(idMeName()||'This account')+' holds no role in '+sbEsc(idEntityName(idEntity()))+'. Switch entity, or ask an administrator to assign a role in Company Settings → Roles &amp; Access.</span></div></div>';
  if(!mcPageAllowed(pg))return mcNotEnabledHTML(pg);
  if(emsClientHidden(pg))return '<div class="lp-page"><div class="wb-empty"><b>Not part of this company&rsquo;s subscription</b><span>'+sbEsc(idEntityName(idEntity()))+' uses ADT for expense management.</span></div></div>';
  if(!appPagePermitted(pg))return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>'+sbEsc(emsRoleLabel())+' ('+sbEsc(idMeName())+') has no RBAC right for this page.</span></div></div>';
  return '';
}
function emsCanAdd(pg){
  if(!mcPageAllowed(pg)||!appPagePermitted(pg))return false;
  const need=APP_ADD_PERMS[pg];
  return !need||need.some(emsCan);
}
/* Static chrome that follows the account, the role, the entity and the
   module switches: the entity header, the role switcher (held roles only),
   the profile-menu Expenses link and dashboard expense links. */
function emsApplyChrome(){
  const off=!mcOn('expenses');
  document.querySelectorAll('[data-mc="expenses"]').forEach(function(el){el.style.display=off?'none':'';});
  /* The dashboard preview switches are a presentation control: only in an approved presentation company. */
  const pres=typeof ccDemoOn==='function'&&ccDemoOn(idEntity());
  document.querySelectorAll('.dp-group').forEach(function(el){el.style.display=pres?'':'none';});
  const lbl=document.getElementById('role-label');if(lbl)lbl.textContent=emsRoleLabel();
  /* Every role someone holds here; picking one switches straight to its
     holder. Employee stays off the bar for now (FR-CA brief); the role itself
     works - an employee's own account still opens as Employee. */
  const offered=emsRolesOffered().filter(function(r){return EMS_SWITCHER_HIDDEN.indexOf(r)<0||r===emsRole();});
  document.querySelectorAll('.role-dd-item[data-role]').forEach(function(b){
    b.style.display=offered.indexOf(b.dataset.role)>=0?'':'none';
    b.classList.toggle('is-current',b.dataset.role===emsRole());
  });
  /* Working as: the person behind every action; another holder of the role can be picked. */
  const box=document.getElementById('role-acting');
  if(box){
    const pv=emsCanPreview(),h=emsRole()&&pv?emsHolders(emsRole()):[],me=idMe();
    box.innerHTML='<div class="role-dd-head">Working as · '+sbEsc(emsRoleLabel())+'</div>'
      +(h.length>1?h.map(function(u){return '<button type="button" class="hdr-dd-item role-acting-item'+(u===me?' is-current':'')+'" onclick="emsSetActor(\''+u+'\')">'+sbEsc(idLabel(u,h))+'</button>';}).join('')
        :'<div class="role-acting-one">'+sbEsc(idMeName()||'Nobody')+'</div>')
      +(pv?'<div class="role-acting-none">Preview only: approvals, verifications, sign-offs and consent need the person\'s own sign-in.</div>':'');
  }
  /* The entity header names the active entity. */
  const ent=typeof entitiesData!=='undefined'?entitiesData.find(function(e){return e.entityId===idEntity();}):null;
  const et=document.getElementById('entity-trigger'),ed=document.getElementById('entity-dd');
  if(ent&&et){et.title=ent.name;const l=et.querySelector('.hdr-sel-label');if(l)l.textContent=ent.name;}
  if(ent&&ed){
    const lg=ed.querySelector('.hdr-dd-entity-logo'),ti=ed.querySelector('.hdr-dd-title'),su=ed.querySelector('.hdr-dd-subtitle'),v=ed.querySelectorAll('.hdr-dd-info-val');
    if(lg)lg.textContent=ent.initials;if(ti)ti.textContent=ent.name;if(su)su.textContent='Entity ID: '+ent.entityId;
    if(v[0])v[0].textContent=ent.type;if(v[1])v[1].textContent=ent.country;
  }
}

/* Company Settings tabs contributed by Expense Management: card enrollment
   (js/onc-enrollment.js), exchange rates (js/capping-limit.js) and Module
   Control (here) - each module owns its own. */
function csExtraTabs(){
  return [].concat(typeof oncCsTabs==='function'?oncCsTabs():[],typeof epCsTabs==='function'?epCsTabs():[],
    emsCan('platform.module.control')?[{id:'module-control',label:'Module Control'}]:[]);
}

/* ── Record scope (called by the modules) ─────────────────────────────── */
/* Employees: this entity's records; all of them with h2r.employee.view, the
   person's direct reports with h2r.employee.view.team, else their own. */
function emsReportsOf(eid){return idEmpAll().filter(function(e){return e.managerEid&&e.managerEid===eid;});}
function emsScopeEmployees(list){
  const ent=idEntity();
  list=list.filter(function(e){return e.entityId===ent;});
  if(emsCan('h2r.employee.view'))return list;
  const me=emsActorRecord();if(!me)return [];
  const team=emsCan('h2r.employee.view.team')?emsReportsOf(me.eid).map(function(e){return e.eid;}):[];
  return list.filter(function(e){return e.eid===me.eid||team.indexOf(e.eid)>=0;});
}
/* Wallet & Benefits entitlements: everyone's with benefit.allocation.view,
   otherwise the signed-in person's own rows. */
function emsScopeEntitlements(r){
  if(!emsCan('benefit.entitlement.view'))return false;
  if(emsCan('benefit.allocation.view'))return true;
  const me=emsActorRecord();
  return !!(r&&r.emp&&me&&r.emp.eid===me.eid);
}
function emsOwnEntitlementsOnly(){return !emsCan('benefit.allocation.view');}

/* ── Wiring ───────────────────────────────────────────────────────────── */
/* core.js owns getSidebarItems; this is the one place it is replaced. */
window.getSidebarItems=emsSidebarItems;
document.addEventListener('DOMContentLoaded',function(){emsSyncIdentity();emsApplyChrome();if(typeof syncHeaderUser==='function')syncHeaderUser();});

/* ── Identity migration review (Company Settings → Activity & Audit → Logs) ─ */
/* What the move from names to IDs could not settle by email: references
   matched to the only person with that name, and ones left unmatched. */
function idMigrationHTML(){
  if(!emsCan('foundation.role.view')||typeof idMigrationLog==='undefined')return '';
  const rows=idMigrationLog.filter(function(n){return n.entityId===idEntity();});
  if(!rows.length)return '';
  const un=rows.filter(function(n){return !n.matched;}).length;
  return '<div class="wb-proj-h">Identity migration review</div>'
    +'<div class="wb-note">Records written before IDs were matched by email. '+(rows.length-un)+' were matched by a name only one person carries, and '+un+' were left unmatched. Unmatched references give no access and route to no one until corrected.</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Record</th><th>Reference</th><th>Result</th><th>Note</th></tr></thead><tbody>'
    +rows.map(function(n){return '<tr><td class="csag-td">'+sbEsc(n.kind)+'<div class="lp-c-sub">'+sbEsc(n.ref)+'</div></td><td class="csag-td">'+sbEsc(n.value||'—')+'</td>'
      +'<td class="csag-td">'+axBadge(n.matched?'wait':'bad',n.matched?'Matched by name':'Unmatched')+'</td><td class="csag-td" style="white-space:normal">'+sbEsc(n.note)+'</td></tr>';}).join('')
    +'</tbody></table></div>';
}
