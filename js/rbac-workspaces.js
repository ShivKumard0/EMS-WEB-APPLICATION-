/* ══ RBAC WORKSPACES ════════════════════════════════════════════════════════
   Governance → RBAC → Workspaces. One workspace per entity, plus Platform
   Global for the people who run the platform itself. A workspace holds TEAMS;
   each team carries one RBAC template (js/rbac-templates.js), and everyone in
   the team gets that template's permissions.

   Built from the same parts as RBAC Templates: lpSearchField + apCS filters
   with listing-stats tiles, an .lp-table in an .lp-split-wrap, the .lp-isb-*
   panel behind the row action and a .ct-modal--form popup for + Add.

   THE OLD SCREEN, FOLDED. Key and Workspace were two columns for one thing -
   the key rides under the name now, beside the entity. Email was "-" on most
   rows, so it moved to the panel. Sort is gone: the listing is newest first,
   like every other one. Status is the tiles. The ⋮ menu is the standard
   status pill and ☰.

   TEAMS AND MEMBERS ARE TABS, NOT PAGES. "Open a workspace to manage its
   Teams and Members" opened another screen. Here they are tabs on the
   workspace's panel, so the listing stays in view. A team shows the template
   it applies, and the template opens from there.

   DELETE IS A MOVE, AND ONLY WHEN EMPTY. A workspace with teams cannot be
   deleted - the move is not offered until its teams are removed. */

/* ── Reference data ────────────────────────────────────────────────────── */
const WS_MODULES=['Platform Global','Entity','Legacy (Imported)'];
const WS_MODULE_HINT={
  'Platform Global':'Platform-wide - for the team that runs the platform. Not tied to an entity.',
  'Entity':'One entity\'s own workspace.',
  'Legacy (Imported)':'Brought over from the old access system. Teams still need setting up.'
};
const WS_TILES=['Active','Inactive'];
const WS_MOVES={'Active':['Inactive','Deleted'],'Inactive':['Active','Deleted'],'Deleted':[]};
const WS_MOVE_LABELS={'Active':'Reactivate','Inactive':'Deactivate','Deleted':'Delete'};

/* ── Seed data (the old screen's rows, and a few set up) ───────────────── */
function wsSeed(key,name,entity,module,email,status,by,at,desc,teams){
  return {id:key,key:key,name:name,entity:entity,module:module,email:email||'',status:status,
    createdBy:by,createdAt:at,desc:desc||'',teams:teams||[]};
}
let wsTeamNext=1;
function wsTeam(name,tplName,members){
  const t=typeof rbacTemplatesData!=='undefined'?rbacTemplatesData.find(function(x){return x.name===tplName;}):null;
  return {id:wsTeamNext++,name:name,tpl:t?t.id:null,members:members||[]};
}
const rbacWorkspacesData=[
  wsSeed(72,'Root Access',331,'Legacy (Imported)','','Active','Tarak Swain','05 Nov 2026 | 10:05:00 AM'),
  wsSeed(71,'Evershine Tech',330,'Legacy (Imported)','','Active','Tarak Swain','04 Nov 2026 | 04:40:00 PM'),
  wsSeed(70,'Epix Global',329,'Legacy (Imported)','','Active','Tarak Swain','04 Nov 2026 | 03:15:00 PM'),
  wsSeed(69,'Northwind Logistics',328,'Legacy (Imported)','','Active','Tarak Swain','04 Nov 2026 | 11:20:00 AM'),
  wsSeed(68,'Prism Financial Services',327,'Legacy (Imported)','','Active','Tarak Swain','30 Oct 2026 | 02:10:00 PM','',
    [wsTeam('PF Admins','Payroll Processor',['Rajan Kumar'])]),
  wsSeed(67,'Sterling Global Holdings',326,'Entity','hr@sterlingglobal.in','Active','Meera Iyer','22 Oct 2026 | 09:30:00 AM','Group holding entity, India payroll.',
    [wsTeam('HR Operations','Leave Management',['Neha Sharma','Pallavi Parate']),
     wsTeam('Payroll','Payroll Approver',['Meera Iyer']),
     wsTeam('All Employees','Employee Self Service',['Rajan Kumar','Aman Singh','Neha Sharma','Pallavi Parate','Shaun Mathew'])]),
  wsSeed(66,'Dhi Hyperlocal',325,'Entity','admin@dhihyperlocal.com','Active','Meera Iyer','15 Oct 2026 | 12:00:00 PM','',
    [wsTeam('Store Managers','Admin / Employee Manager',['Aman Singh']),
     wsTeam('Everyone','Employee Self Service',['Aman Singh','Shaun Mathew']),
     wsTeam('Expense Approvers','Expense Approver',['Pallavi Parate','Aman Singh']),
     wsTeam('Imprest Custodians','Imprest Custodian',['Pallavi Parate']),
     /* Funding & Budgets: who approves, verifies and owns - by assignment, not by role. */
     wsTeam('Budget Approvers','Budget Approver',['Vikram Rao','Lucas Dubois']),
     wsTeam('Funding Verifiers','Funding Verifier',['Vikram Rao','Lucas Dubois']),
     wsTeam('Budget Owners','Budget Owner',['Vikram Rao','Prem Raj','Pallavi Parate']),
     /* Corporate Cards: independent approval and execution verification, by assignment. */
     wsTeam('Card Approvers','Card Approver',['Vikram Rao','Lucas Dubois']),
     wsTeam('Card Load Verifiers','Card Load Verifier',['Lucas Dubois','Vikram Rao'])]),
  wsSeed(65,'Opendhi Technologies',324,'Entity','people@opendhi.com','Active','Syed Ayaz','02 Oct 2026 | 10:45:00 AM','',
    [wsTeam('People Team','Document Verification',['Pallavi Parate']),
     wsTeam('Finance','Expense Approver',['Meera Iyer','Syed Ayaz'])]),
  wsSeed(64,'Nimbus Retail',323,'Entity','ops@nimbusretail.in','Inactive','Syed Ayaz','18 Sep 2026 | 03:30:00 PM','Entity wound down in September.'),
  wsSeed(63,'Kavya Foods',322,'Legacy (Imported)','','Active','Syed Ayaz','10 Sep 2026 | 11:10:00 AM','',
    [wsTeam('Imported Admins','User Admin',['Shaun Mathew'])]),
  wsSeed(1,'Platform Global',null,'Platform Global','platform@opendhi.com','Active','Tarak Swain','12 Jan 2026 | 09:00:00 AM','The team that runs the platform for every entity.',
    [wsTeam('Platform Admins','User Admin',['Tarak Swain','Shaun Mathew']),
     wsTeam('Org Setup','Organisation Setup',['Tarak Swain'])])
];
let wsNextKey=73,wsNextEntity=332;

/* ── Derived values ────────────────────────────────────────────────────── */
function wsRec(id){return rbacWorkspacesData.find(function(x){return x.id===id;})||null;}
function wsKey(w){return 'WS-'+String(w.key).padStart(3,'0');}
function wsEntity(w){return w.entity?'entity:'+w.entity:'Platform-wide';}
function wsDate(w){return String(w.createdAt).split(' | ')[0];}
/* Everyone in any of the workspace's teams, once each, with their teams.
   Members are accounts (User IDs, js/identity.js); names are for reading. */
function wsMembers(w){
  const m={};
  w.teams.forEach(function(t){t.members.forEach(function(u){(m[u]=m[u]||[]).push(t);});});
  return Object.keys(m).map(function(u){return {uid:u,name:idName(u),teams:m[u]};}).sort(function(a,b){return a.name.localeCompare(b.name);});
}
/* Who can join a team: the accounts of the workspace's entity (every active
   account for the platform workspace). */
function wsCandidates(w){
  if(w.entityId==='*')return idUsers.filter(function(u){return idUserActive(u.userId);}).map(function(u){return u.userId;});
  return w.entityId?idUsersIn(w.entityId).map(function(u){return u.userId;}):[];
}
function wsTpl(t){return t.tpl!=null&&typeof rbRec==='function'?rbRec(t.tpl):null;}
/* What a member can do: every permission any of their teams' templates grant. */
function wsPermCount(teams){
  const s={};
  teams.forEach(function(t){const tp=wsTpl(t);if(tp&&tp.status!=='Deleted')tp.perms.forEach(function(c){s[c]=1;});});
  return Object.keys(s).length;
}
function wsActiveTemplates(){
  /* Templates carrying platform rights are the platform's to give (EMP-N06). */
  const plat=typeof emsPlatformUser!=='function'||emsPlatformUser(idMe()),codes=typeof RB_PLATFORM_CODES!=='undefined'?RB_PLATFORM_CODES:[];
  return (typeof rbacTemplatesData!=='undefined'?rbacTemplatesData:[]).filter(function(t){return t.status==='Active'&&(plat||!t.perms.some(function(c){return codes.indexOf(c)>=0;}));});
}
function wsPlural(n,w){return n+' '+w+(n===1?'':'s');}

const WS_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>',
  team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
};

/* ── State ─────────────────────────────────────────────────────────────── */
let wsSelectedId=null,wsTab='basic-details';
let wsModuleF='',wsStatusF='',wsQ='';
let wsEditing=false,wsDraft=null,wsDraftOrig='',wsModalOpen=false;
let wsAdding='';   // 'team' | 'member' - the inline add form open on the Teams / Members tab

/* ── Filters ───────────────────────────────────────────────────────────── */
function wsRows(){
  return rbacWorkspacesData.filter(function(w){
    if(w.status==='Deleted')return false;
    /* A client administrator sees their own company's workspace only (EMP-N06). */
    if(typeof emsPlatformUser==='function'&&!emsPlatformUser(idMe())&&w.entityId!==idEntity())return false;
    if(wsModuleF&&w.module!==wsModuleF)return false;
    if(wsStatusF&&w.status!==wsStatusF)return false;
    return true;
  }).sort(function(a,b){return b.key-a.key;});
}
/* Search also finds a workspace by its entity number, a team or a member. */
function wsSearchRows(rows,q){
  if(!q)return rows;
  const n=q.toLowerCase();
  return rows.filter(function(w){
    if(lpSearchMatch(q,w)||wsEntity(w).indexOf(n)>=0||wsKey(w).toLowerCase().indexOf(n)>=0)return true;
    return w.teams.some(function(t){return t.name.toLowerCase().indexOf(n)>=0||t.members.some(function(m){return idName(m).toLowerCase().indexOf(n)>=0;});});
  });
}
function wsToggleStat(v){wsStatusF=wsStatusF===v?'':v;wsSelectedId=null;renderADTPage();}
function applyWsFilters(){
  const v=getCSValue('ws-f-module');
  wsModuleF=v&&v!=='All Modules'?v:'';
  wsQ=lpSearchValue('ws-f-q');
  wsSelectedId=null;renderADTPage();
}
function resetWsFilters(){wsModuleF='';wsStatusF='';wsQ='';wsSelectedId=null;renderADTPage();}

/* ── Detail panel ──────────────────────────────────────────────────────── */
function wsDropEdit(){wsEditing=false;wsDraft=null;}
function openWsSidebar(id,tab){
  if(wsSelectedId!=null&&wsSelectedId!==id&&sbLeaveGuard('ws',function(){openWsSidebar(id,tab);}))return;
  if(wsSelectedId!==id){wsDropEdit();wsAdding='';}
  wsTab=tab||sbKeepTab(wsSelectedId,wsTab);wsSelectedId=id;
  const sb=document.getElementById('ws-split-sb');if(sb)sb.classList.add('open');
  isbTab('ws',renderWsSidebar);
  document.querySelectorAll('.ws-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='ws-row-'+id);});
}
function closeWsSidebar(){
  if(sbLeaveGuard('ws',closeWsSidebar))return;
  wsDropEdit();wsAdding='';wsSelectedId=null;
  const sb=document.getElementById('ws-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ws-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navWsTab(t){if(wsEditing&&!sbHasDraft('ws'))wsDropEdit();wsAdding='';wsTab=t;isbTab('ws',renderWsSidebar);}

function wsSeedLogs(w){
  const p=String(w.createdAt).split(' | ');
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:w.createdBy,status:'Active',
    action:w.module==='Legacy (Imported)'?'Imported from the old access system.':'Workspace created.'}];
  if(w.status==='Inactive')fx.unshift({date:p[0],time:'06:00:00 PM',user:'Shaun Mathew',status:'Inactive',action:w.desc||'No longer in use.'});
  return seedLogs(w,fx);
}
/* A team or member change is a note on the log: the status stays as it is. */
function wsNote(w,text){
  wsSeedLogs(w);
  const s=stampNow();
  w.logs.unshift({date:s.date,time:s.time,user:CURRENT_USER,status:w.status,action:text});
}
const WS_STEP_TITLE={'Active':'Workspace Active','Inactive':'Workspace Deactivated','Deleted':'Workspace Deleted'};
function wsWorkflow(w){
  const done=wfDoneFromLogs(wsSeedLogs(w),function(st){return WS_STEP_TITLE[st]||st;});
  const LEFT={'Inactive':[{title:'Reactivate or Delete',owner:'Company Admin'}]};
  if(w.status==='Active'&&!w.teams.length)LEFT.Active=[{title:'Set up teams',owner:'Company Admin',note:'No one has access through this workspace until it has a team.'}];
  return wfPlan(done,LEFT[w.status]||[]);
}
function wsMoves(w){
  return (WS_MOVES[w.status]||[]).filter(function(m){return m!=='Deleted'||!w.teams.length;});
}

function renderWsSidebar(){
  const w=wsRec(wsSelectedId);if(!w)return '';
  const members=wsMembers(w);
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'teams',label:'Teams ('+w.teams.length+')'},{id:'members',label:'Members ('+members.length+')'},
    {id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const tabBar=axTabBar('ws',tabs,wsTab,'navWsTab','closeWsSidebar');
  const hero=function(editing,edit){return sbHero({icon:WS_ICO.hero,name:w.name,meta:[wsKey(w),wsEntity(w),w.module],
    status:axBadge(statusTone(w.status),w.status),editing:editing,onEdit:edit});};
  let body='';
  if(wsTab==='basic-details'&&wsEditing){
    body=hero(true)+axInlineFormHTML(wsFieldsHTML(),'wsCancelEdit()','wsSaveEdit()');
  }else if(wsTab==='basic-details'){
    body=hero(false,'wsStartEdit()')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Workspace Name',w.name)
      +axField(AX_ICO.fHash,'Entity',wsEntity(w))
      +axField(WS_ICO.layers,'Module',w.module+' <span class="ax-sub">'+WS_MODULE_HINT[w.module]+'</span>',true)
      +axField(AX_ICO.fMail,'Contact Email',w.email)
      +axField(WS_ICO.team,'Teams',w.teams.length?wsPlural(w.teams.length,'team')+' · '+wsPlural(members.length,'member'):'No teams yet')
      +axField(AX_ICO.fUser,'Created By',w.createdBy)
      +axField(AX_ICO.fCal,'Created On',wsDate(w))
      +axField(WS_ICO.note,'Description',w.desc,true)
      +'</div>';
  }else if(wsTab==='teams'){
    body=wsTeamsHTML(w);
  }else if(wsTab==='members'){
    body=wsMembersHTML(w,members);
  }else if(wsTab==='logs'){
    body=lpLogsView(wsSeedLogs(w),wsLogFormHTML(w,wsMoves(w)),{labels:WS_MOVE_LABELS});
  }else if(wsTab==='history'){
    body=sbHistoryHTML(w);
  }else{
    body=wfTimelineHTML(wsWorkflow(w));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function wsAddBtn(kind,label){
  return '<button class="lp-sb-view-edit-btn" onclick="wsOpenAdd(\''+kind+'\')">'+AX_ICO.plus+' '+label+'</button>';
}
/* Teams tab: one card per team - its template, then its people. */
function wsTeamsHTML(w){
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Teams</span>'
    +(wsAdding==='team'?'':wsAddBtn('team','Add Team'))+'</div>';
  const form=wsAdding==='team'?wsTeamFormHTML(w):'';
  if(!w.teams.length)return head+form+(form?'':'<div class="lp-wf-empty">No teams yet. Add a team and pick the template its members get - until then, no one has access through this workspace.</div>');
  return head+form+'<div class="ws-teams">'+w.teams.map(function(t){
    const tp=wsTpl(t);
    return '<div class="ws-team">'
      +'<div class="ws-team-hd"><div class="ws-team-ttl"><div class="ws-team-name">'+t.name+'</div>'
        +'<div class="ws-team-sub">'+wsPlural(t.members.length,'member')+'</div></div>'
        +'<button class="ws-x" title="Remove team" onclick="wsRemoveTeam('+w.id+','+t.id+')">'+AX_ICO.trash+'</button></div>'
      +'<div class="ws-team-tpl"><span class="ws-team-lbl">Template</span>'
        +(tp?'<a class="ws-tpl-link" onclick="wsOpenTemplate('+tp.id+')">'+tp.name+'</a><span class="ws-team-meta">'+wsPlural(tp.perms.length,'permission')+(tp.status!=='Active'?' · '+tp.status:'')+'</span>'
          :'<span class="ws-team-meta">None - members get no permissions</span>')+'</div>'
      +'<div class="ws-team-ppl">'+(t.members.length?t.members.map(function(u){const n=idName(u);return '<span class="ws-person">'+wsInitials(n)+sbEsc(n)+'</span>';}).join('')
        :'<span class="ws-team-meta">No members yet</span>')+'</div>'
      +((t.unmatched||[]).length?'<div class="ws-team-meta">Not matched to an account (no access): '+t.unmatched.map(sbEsc).join(', ')+'</div>':'')
      +'</div>';
  }).join('')+'</div>';
}
function wsInitials(n){
  const p=String(n).split(' ');
  return '<span class="ws-av">'+((p[0]||'')[0]||'')+((p[1]||'')[0]||'')+'</span>';
}
/* Members tab: each person once, with their teams and what that adds up to. */
function wsMembersHTML(w,members){
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Members</span>'
    +(wsAdding==='member'||!w.teams.length?'':wsAddBtn('member','Add Member'))+'</div>';
  const form=wsAdding==='member'?wsMemberFormHTML(w):'';
  if(!w.teams.length)return head+'<div class="lp-wf-empty">People join a workspace through a team. Add a team first on the Teams tab.</div>';
  if(!members.length)return head+form+(form?'':'<div class="lp-wf-empty">No members yet.</div>');
  /* One line per team a member is in, each with its template and its own
     remove - so the table never needs a sideways scroll. */
  return head+form+'<table class="ax-hist ws-mem"><thead><tr><th>Member</th><th>Team · Template</th><th class="ws-mem-n">Permissions</th></tr></thead><tbody>'
    +members.map(function(m){
      const e=idEmpOfUser(m.uid);
      return '<tr>'
        +'<td><div class="ws-mem-name">'+wsInitials(m.name)+'<span><b>'+sbEsc(m.name)+'</b>'+(e&&e.dept?'<span class="ws-team-meta">'+e.empId+' · '+e.dept+'</span>':'<span class="ws-team-meta">'+sbEsc(idEmail(m.uid))+'</span>')+'</span></div></td>'
        +'<td>'+m.teams.map(function(t){
          const tp=wsTpl(t);
          return '<div class="ws-mem-team"><span><b>'+t.name+'</b><span class="ws-team-meta">'+(tp?tp.name:'No template')+'</span></span>'
            +'<button class="ws-x" title="Remove from '+attrSafe(t.name)+'" onclick="wsRemoveMember('+w.id+','+t.id+',\''+m.uid+'\')">'+AX_ICO.x+'</button></div>';
        }).join('')+'</td>'
        +'<td class="ws-mem-n">'+wsPermCount(m.teams)+'</td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}

/* ── Teams and members: inline add forms ───────────────────────────────── */
function wsOpenAdd(kind){wsAdding=kind;isbTab('ws',renderWsSidebar);axFocus(kind==='team'?'ws-t-name':'');}
function wsCloseAdd(){wsAdding='';isbTab('ws',renderWsSidebar);}
function wsInlineForm(fields,save){
  return '<div class="ws-add"><div class="ep-form-grid">'+fields+'</div>'
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="wsCloseAdd()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="'+save+'">Add</button></div></div>';
}
function wsTeamFormHTML(w){
  return wsInlineForm(
    '<div class="ep-form-group"><label class="ep-form-label" for="ws-t-name">Team Name <span class="req">*</span></label>'
      +'<input class="ep-form-input" id="ws-t-name" placeholder="e.g. HR Operations"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Template <span class="req">*</span></label>'
      +axCS('ws-t-tpl',wsActiveTemplates().map(function(t){return t.name;}),'','Search Template')
      +'<div class="ea-hint">Everyone in the team gets this template\'s permissions.</div></div>',
    'wsSaveTeam('+w.id+')');
}
function wsMemberFormHTML(w){
  const pool=wsCandidates(w);
  return wsInlineForm(
    '<div class="ep-form-group"><label class="ep-form-label">Member <span class="req">*</span></label>'
      +axCS('ws-m-person',idLabels(pool),'','Search Employee')
      +(pool.length?'':'<div class="ea-hint">This workspace\'s entity has no accounts in this ADT instance.</div>')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Team <span class="req">*</span></label>'
      +apCS('ws-m-team',w.teams.map(function(t){return t.name;}),w.teams.length===1?w.teams[0].name:'','Select Team')+'</div>',
    'wsSaveMember('+w.id+')');
}
function wsSaveTeam(id){
  const w=wsRec(id);if(!w)return;
  const el=document.getElementById('ws-t-name');
  const name=el?el.value.trim():'',tplName=getCSValue('ws-t-tpl');
  if(!name){showToast('Team Name is required','error');return;}
  if(w.teams.some(function(t){return t.name.toLowerCase()===name.toLowerCase();})){showToast('A team with this name already exists','error','Team names are unique within a workspace.');return;}
  const tp=wsActiveTemplates().find(function(t){return t.name===tplName;});
  if(!tp){showToast('Pick a template','error','A team with no template gives its members nothing.');return;}
  w.teams.push({id:wsTeamNext++,name:name,tpl:tp.id,members:[]});
  wsNote(w,'Team '+name+' added with the '+tp.name+' template.');
  wsAdding='';
  renderADTPage();
  showToast('Team added','success',name+' · '+tp.name+'. Add its members on the Members tab.');
}
function wsSaveMember(id){
  const w=wsRec(id);if(!w)return;
  if(w.entityId==='*'&&typeof emsCan==='function'&&!emsCan('platform.access.manage')){emsDeny('add members to the platform workspace');return;}
  const pool=wsCandidates(w);
  const uid=idFromLabel(getCSValue('ws-m-person'),pool),teamName=getCSValue('ws-m-team');
  if(!uid){showToast('Pick a member','error');return;}
  const person=idName(uid);
  const t=w.teams.find(function(x){return x.name===teamName;});
  if(!t){showToast('Pick a team','error');return;}
  if(t.members.indexOf(uid)>=0){showToast(person+' is already in '+t.name,'error');return;}
  t.members.push(uid);
  if(typeof emsClearCache==='function')emsClearCache();
  wsNote(w,person+' added to '+t.name+'.');
  wsAdding='';
  renderADTPage();
  const tp=wsTpl(t);
  showToast('Member added','success',person+' now has '+(tp?tp.name:'no template')+' through '+t.name+'.');
}
function wsRemoveMember(id,teamId,uid){
  const w=wsRec(id);if(!w)return;
  const t=w.teams.find(function(x){return x.id===teamId;});if(!t)return;
  t.members=t.members.filter(function(n){return n!==uid;});
  if(typeof emsClearCache==='function')emsClearCache();
  const name=idName(uid);
  wsNote(w,name+' removed from '+t.name+'.');
  /* An imprest fund the person holds keeps its accountability (js/advances.js). */
  const held=typeof impLapseScan==='function'?impLapseScan('removed from '+t.name+' by '+idName(idMe())):[];
  renderADTPage();
  showToast('Member removed',held.length?'info':'success',name+' is no longer in '+t.name+'.'
    +(held.length?' '+held.map(function(f){return expKey(f);}).join(', ')+' keep'+(held.length===1?'s':'')+' '+(held.length===1?'its':'their')+' accountable balance with '+name+'; reassign the custodian or reconcile the fund in Advances & Imprest.':''));
}
/* A team with people in it keeps them from losing access by accident. */
function wsRemoveTeam(id,teamId){
  const w=wsRec(id);if(!w)return;
  const t=w.teams.find(function(x){return x.id===teamId;});if(!t)return;
  if(t.members.length){showToast('Remove its members first','error',t.name+' still has '+wsPlural(t.members.length,'member')+'. Removing them takes their access away, so it is done one by one on the Members tab.');return;}
  w.teams=w.teams.filter(function(x){return x.id!==teamId;});
  wsNote(w,'Team '+t.name+' removed.');
  renderADTPage();
  showToast('Team removed','success',t.name+' is gone from '+w.name+'.');
}
/* The template a team applies opens in its own module. */
function wsOpenTemplate(tplId){
  navigatePage('rbac-templates');
  setTimeout(function(){if(typeof openRbSidebar==='function')openRbSidebar(tplId,'permissions');},60);
}

/* ── Logs ──────────────────────────────────────────────────────────────── */
function wsLogFormHTML(w,moves){
  const blocked=w.teams.length&&(WS_MOVES[w.status]||[]).indexOf('Deleted')>=0;
  return '<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+w.status+'</div>'
    +'<p class="lp-logs-form-sub">Activate, deactivate or delete this workspace and say why'
      +(blocked?'. Delete is available once it has no teams - remove its '+wsPlural(w.teams.length,'team')+' first.':'')+'</p>'
    +lpLogStatusField('ws-log-status-sel',w.status,[w.status].concat(moves))
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="ws-log-comment-inp" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="navWsTab(\'logs\')">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="wsSaveLog('+w.id+')">Submit</button>'
    +'</div></div>';
}
function wsSaveLog(id){
  const w=wsRec(id);if(!w)return;
  wsSeedLogs(w);
  if(!lpCommitLog(w,'ws-log-status-sel','ws-log-comment-inp',w.logs))return;
  if(w.status==='Deleted'){
    wsDropEdit();wsSelectedId=null;renderADTPage();
    showToast('Workspace deleted','success',wsKey(w)+' · '+w.name+' is no longer available.');return;
  }
  renderADTPage();
  showToast('Log added','success',wsKey(w)+' is now '+w.status+'.');
}

/* ── The form: panel Edit and the + Add popup share it ─────────────────── */
function wsStartEdit(){
  const w=wsRec(wsSelectedId);if(!w)return;
  wsEditing=true;wsTab='basic-details';
  wsDraft={name:w.name,module:w.module,email:w.email,desc:w.desc};
  wsDraftOrig=JSON.stringify(wsDraft);
  renderADTPage();
}
function wsCancelEdit(){wsDropEdit();renderADTPage();}
function wsSync(){
  if(!wsDraft)return;
  [['name','ws-e-name'],['email','ws-e-email'],['desc','ws-e-desc']].forEach(function(p){const el=document.getElementById(p[1]);if(el)wsDraft[p[0]]=el.value.trim();});
  if(document.getElementById('csw-ws-e-module'))wsDraft.module=getCSValue('ws-e-module');
}
function wsModuleHook(){
  wsSync();
  if(wsModalOpen&&typeof formRepaintParts==='function'&&formRepaintParts(buildAddWsModalHTML(),['ws-e-module-hint']))return;
  renderADTPage();
}
function wsFieldsHTML(){
  const d=wsDraft;
  return '<div class="ep-form-group"><label class="ep-form-label" for="ws-e-name">Workspace Name <span class="req">*</span></label>'
      +'<input class="ep-form-input" id="ws-e-name" value="'+attrSafe(d.name)+'" placeholder="Usually the entity\'s name"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Module <span class="req">*</span></label>'
      +apCS('ws-e-module',WS_MODULES,d.module,'Select Module','wsModuleHook')
      +'<div class="ea-hint" id="ws-e-module-hint">'+(d.module?WS_MODULE_HINT[d.module]:'Platform Global, an entity, or imported from the old system.')+'</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label" for="ws-e-email">Contact Email</label>'
      +'<input class="ep-form-input" id="ws-e-email" type="email" value="'+attrSafe(d.email)+'" placeholder="Who to ask about access here"></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="ws-e-desc">Description</label>'
      +'<textarea class="ep-form-input ax-notes" id="ws-e-desc" placeholder="What this workspace covers">'+attrSafe(d.desc||'')+'</textarea></div>';
}
function wsCheck(d,selfId){
  if(!String(d.name||'').trim()){showToast('Workspace Name is required','error');return false;}
  if(!d.module){showToast('Module is required','error');return false;}
  if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)){showToast('Contact Email is not a valid address','error','For example hr@company.com');return false;}
  const twin=rbacWorkspacesData.find(function(x){return x.id!==selfId&&x.status!=='Deleted'&&x.name.toLowerCase()===d.name.trim().toLowerCase();});
  if(twin){showToast('A workspace with this name already exists','error',wsKey(twin)+' · '+twin.name);return false;}
  /* Platform Global is one workspace, not a kind of workspace. */
  if(d.module==='Platform Global'&&rbacWorkspacesData.some(function(x){return x.id!==selfId&&x.status!=='Deleted'&&x.module==='Platform Global';})){
    showToast('Platform Global already exists','error','There is one platform-wide workspace. Pick Entity for an entity\'s own.');return false;}
  return true;
}
function wsSaveEdit(){
  const w=wsRec(wsSelectedId);if(!w||!wsDraft)return;
  wsSync();
  const d=wsDraft;
  if(!wsCheck(d,w.id))return;
  Object.assign(w,{name:d.name.trim(),module:d.module,email:d.email,desc:d.desc});
  wsDropEdit();
  renderADTPage();
  showToast('Workspace updated','success',wsKey(w)+' saved.');
}

/* ── + Add ─────────────────────────────────────────────────────────────── */
function startAddWs(){
  if(page!=='rbac-workspaces')navigatePage('rbac-workspaces');
  wsDropEdit();
  wsDraft={name:'',module:'Entity',email:'',desc:''};
  wsModalOpen=true;
  renderADTPage();
}
function cancelAddWs(){wsModalOpen=false;wsDraft=null;renderADTPage();}
function buildAddWsModalHTML(){
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Workspace</span>'
      +'<button class="ct-modal-close" onclick="cancelAddWs()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">One workspace per entity. Once it is created, add its teams and members from its panel. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid" id="ws-m-grid">'+wsFieldsHTML()+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddWs()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddWs()">Create Workspace</button>'
    +'</div></div>'
    +'</div></div>';
}
function submitAddWs(){
  wsSync();
  const d=wsDraft;
  if(!wsCheck(d,null))return;
  const s=stampNow();
  const w=wsSeed(wsNextKey++,d.name.trim(),d.module==='Platform Global'?null:wsNextEntity++,d.module,d.email,'Active',CURRENT_USER,axStamp(),d.desc);
  w.logs=[{date:s.date,time:s.time,user:CURRENT_USER,status:'Active',action:'Workspace created.'}];
  /* Linked to its company (the active one), or to the platform (EMP-N07). */
  w.entityId=d.module==='Platform Global'?'*':idEntity();
  rbacWorkspacesData.unshift(w);
  lpLanded('rbac-workspaces',w.id);
  wsModalOpen=false;wsDraft=null;
  wsSelectedId=w.id;wsTab='teams';wsAdding='team';
  renderADTPage();
  showToast('Workspace created','success',wsKey(w)+' · '+w.name+'. Add its first team.');
}

/* ── Listing ───────────────────────────────────────────────────────────── */
function buildRbacWorkspacesHTML(){
  const live=rbacWorkspacesData.filter(function(w){return w.status!=='Deleted';});
  const count=function(s){return live.filter(function(w){return w.status===s;}).length;};
  const shown=wsSearchRows(wsRows(),wsQ);
  if(wsSelectedId&&!shown.some(function(w){return w.id===wsSelectedId;}))wsSelectedId=null;
  const pgn=listPage('rbac-workspaces',[wsModuleF,wsStatusF,wsQ].join('|'),shown.map(function(w,i){
    const n=wsMembers(w).length;
    return '<tr class="ws-row'+(wsSelectedId===w.id?' lp-row-selected':'')+'" id="ws-row-'+w.id+'" style="cursor:pointer" onclick="openWsSidebar('+w.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(w.name)+'">'+w.name+'</div><div class="lp-c-sub">'+wsKey(w)+' · '+wsEntity(w)+'</div></td>'
      +'<td><div class="lp-c-plain">'+w.module+'</div></td>'
      +'<td>'+(w.teams.length
        ?'<div class="lp-c-plain">'+wsPlural(w.teams.length,'team')+'</div><div class="lp-c-sub">'+wsPlural(n,'member')+'</div>'
        :'<div class="lp-c-plain is-none">No teams yet</div>')+'</td>'
      +'<td><div class="lp-c-plain">'+wsDate(w)+'</div></td>'
      +'<td>'+axBadge(statusTone(w.status),w.status)+'</td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('rbac-workspaces',w.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No workspaces match this filter.</td></tr>');
  const stat=function(s){
    return '<div class="listing-stat'+(wsStatusF===s?' stat-selected':'')+'" onclick="wsToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top ws-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ws-f-q',wsQ,'Search workspace, team or member','applyWsFilters()')
    +apCS('ws-f-module',WS_MODULES,wsModuleF,'All Modules')
    +clearFiltersBtn([wsModuleF,wsStatusF,wsQ],'resetWsFilters()')
    +'<button class="lp-pill-search" onclick="applyWsFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'+WS_TILES.map(stat).join('')+'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="ws-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table ws-table"><thead><tr><th>S. No</th><th>Workspace</th><th>Module</th><th>Teams</th>'
      +'<th>Created On</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(wsSelectedId?' open':'')+'" id="ws-split-sb"><div class="lp-isb" id="ws-isb-inner">'+(wsSelectedId?sbRender(renderWsSidebar,'ws'):'')+'</div></div>'
    +'</div></div>'
    +(wsModalOpen?buildAddWsModalHTML():'');
}

/* ── Wiring ────────────────────────────────────────────────────────────── */
Object.assign(supportPageMeta,{'rbac-workspaces':{title:'RBAC Workspaces',context:'RBAC Workspaces',filters:[],columns:[],rows:[]}});
if(typeof LP_ROW_PREFIX!=='undefined')LP_ROW_PREFIX['rbac-workspaces']='ws';
sbDraftReg('ws',{
  dirty:function(){
    if(!wsEditing||wsModalOpen)return false;
    wsSync();
    return JSON.stringify(wsDraft)!==wsDraftOrig;
  },
  drop:wsDropEdit});
