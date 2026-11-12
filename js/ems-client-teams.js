/* ══ TEAMS IN A CLIENT COMPANY (product owner, 12 Nov 2026) ══════════════════════════════════════════════════════
   "include teams as well [under People], as in Dhi Hyperlocal" - and it lists the company's own teams.
   People → Employees · Teams in a client company (Nova Retail), as in the platform company. The platform company's
   Teams page lists its own team records; a client company's teams are the teams of its workspace (RBAC →
   Workspaces): Expense Approvers, Budget Approvers, Card Approvers … each with the access template its members get.
   This page lists those teams in the Teams screen's layout. + creates a team in the company's workspace, and a team's
   Members tab adds or removes people - the same records and rules as the workspace's own Teams and Members tabs, so
   both screens always agree. Like Employees, the page does not depend on the People module. */
let ctmSel=null,ctmTab='basic-details',ctmQ='',ctmTplF='',ctmStatF='',ctmForm=null,ctmMemOpen=false;
/* A member's designation in the team (product owner, 12 Nov 2026): a label only. Approvers are numbered in the order
   they were added - Approver 1, Approver 2 ... */
const CTM_DESIGS=['Reporting Manager','Approver','Finance Approver','Manager','Reviewer','Verifier','Member'];
function ctmDesigOf(t,uid){
  const d=(t.desig||{})[uid]||'';if(d!=='Approver')return d;
  const n=t.members.filter(function(u){return (t.desig||{})[u]==='Approver';}).indexOf(uid)+1;
  return 'Approver '+n;
}
function ctmOn(){return typeof emsClientOnly==='function'&&emsClientOnly();}
function ctmCanManage(){return typeof emsCan==='function'&&(emsCan('h2r.team.create')||emsCan('platform.access.manage'));}
function ctmWorkspaces(){
  return (typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).filter(function(w){return w.status!=='Deleted'&&w.entityId===idEntity();});
}
/* Not listed (product owner, 12 Nov 2026: "just to show"): the card approval and card load teams keep working for the
   card routes, they are only left out of this list. */
const CTM_HIDDEN=['Card Approval Team','Card Operations Team','Card Approvers','Card Load Verifiers'];
function ctmAll(){const out=[];ctmWorkspaces().forEach(function(w){(w.teams||[]).forEach(function(t){if(CTM_HIDDEN.indexOf(t.name)<0)out.push({w:w,t:t});});});return out;}
function ctmFind(id){return ctmAll().find(function(x){return x.t.id===id;})||null;}
/* A department team carries no access template (its people's own roles give their access): shown as "—". */
function ctmTplName(t){const tp=typeof wsTpl==='function'?wsTpl(t):null;return tp?tp.name:'—';}
function ctmStatus(x){const tp=typeof wsTpl==='function'?wsTpl(x.t):null;return x.w.status==='Active'&&(x.t.tpl==null||(tp&&tp.status!=='Deleted'))?'Active':'Inactive';}
function ctmMenuIco(){return typeof EA_ICO!=='undefined'&&EA_ICO.menu?EA_ICO.menu:'☰';}

/* ── The page ──────────────────────────────────────────────────────────── */
function ctmApply(){
  const v=getCSValue('ctm-f-tpl');ctmTplF=v&&v!=='All Templates'?v:'';
  ctmQ=lpSearchValue('ctm-f-q');ctmSel=null;renderADTPage();
}
function ctmReset(){ctmQ='';ctmTplF='';ctmStatF='';ctmSel=null;renderADTPage();}
function ctmToggleStat(s){ctmStatF=ctmStatF===s?'':s;ctmSel=null;renderADTPage();}
function ctmPageHTML(){
  const all=ctmAll(),q=String(ctmQ||'').toLowerCase().trim();
  const rows=all.filter(function(x){
    if(ctmTplF&&ctmTplName(x.t)!==ctmTplF)return false;
    if(ctmStatF&&ctmStatus(x)!==ctmStatF)return false;
    return !q||(x.t.name+' '+ctmTplName(x.t)+' '+x.t.members.map(idName).join(' ')).toLowerCase().indexOf(q)>=0;
  }).sort(function(a,b){return a.t.name.localeCompare(b.t.name);});
  if(ctmSel!=null&&!rows.some(function(x){return x.t.id===ctmSel;}))ctmSel=null;
  const tpls=[];all.forEach(function(x){const n=ctmTplName(x.t);if(tpls.indexOf(n)<0)tpls.push(n);});tpls.sort();
  const pgn=listPage('teams',[ctmQ,ctmTplF,ctmStatF].join('|'),rows.map(function(x,i){
    const st=ctmStatus(x);
    return '<tr class="ctm-row'+(ctmSel===x.t.id?' lp-row-selected':'')+'" id="ctm-row-'+x.t.id+'" style="cursor:pointer" onclick="ctmOpen('+x.t.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-trunc" title="'+attrSafe(x.t.name)+'">'+sbEsc(x.t.name)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(ctmTplName(x.t))+'">'+sbEsc(ctmTplName(x.t))+'</div></td>'
      +'<td><div class="lp-c-plain">'+x.t.members.length+'</div></td>'
      +'<td>'+axBadge(statusTone(st),st)+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="lp-action-btn" title="Open" onclick="ctmOpen('+x.t.id+')">'+ctmMenuIco()+'</button></td>'
      +'</tr>';
  }),'<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--gray)">'+(all.length?'No teams match this filter.':'No teams yet.'+(ctmCanManage()?' Create one with the + button.':''))+'</td></tr>');
  const count=function(s){return all.filter(function(x){return ctmStatus(x)===s;}).length;};
  const stat=function(s){
    return '<div class="listing-stat'+(ctmStatF===s?' stat-selected':'')+'" onclick="ctmToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ctm-f-q',ctmQ,'Search team or member','ctmApply()')
    +apCS('ctm-f-tpl',tpls,ctmTplF,'All Templates')
    +clearFiltersBtn([ctmQ,ctmTplF,ctmStatF],'ctmReset()')
    +'<button class="lp-pill-search" onclick="ctmApply()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'+['Active','Inactive'].map(stat).join('')+'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="ctm-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table"><thead><tr><th>S. No</th><th>Team Name</th><th>Access Template</th><th>Members</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'+pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(ctmSel!=null?' open':'')+'" id="ctm-split-sb"><div class="lp-isb" id="ctm-isb-inner">'+(ctmSel!=null?sbRender(ctmPanelHTML,'ctm'):'')+'</div></div>'
    +'</div>'
    +(ctmForm?ctmFormHTML():'')
    +'</div>';
}

/* ── The side panel: Basic Details · Members · Logs ────────────────────── */
function ctmOpen(id,tab){
  if(ctmSel!==id)ctmMemOpen=false;
  ctmTab=tab||(typeof sbKeepTab==='function'?sbKeepTab(ctmSel,ctmTab):'basic-details');ctmSel=id;
  const sb=document.getElementById('ctm-split-sb');
  if(!sb){renderADTPage();return;}
  sb.classList.add('open');
  isbTab('ctm',ctmPanelHTML);
  document.querySelectorAll('.ctm-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='ctm-row-'+id);});
}
function ctmClose(){
  ctmSel=null;ctmMemOpen=false;
  const sb=document.getElementById('ctm-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ctm-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function ctmNavTab(t){ctmTab=t;ctmMemOpen=false;isbTab('ctm',ctmPanelHTML);}
function ctmTeamLogs(x){
  const all=typeof wsSeedLogs==='function'?wsSeedLogs(x.w):(x.w.logs||[]);
  return all.filter(function(l){return String(l.action||'').indexOf(x.t.name)>=0;});
}
function ctmPanelHTML(){
  const x=ctmFind(ctmSel);if(!x)return '';
  const tp=typeof wsTpl==='function'?wsTpl(x.t):null,st=ctmStatus(x);
  const tabBar=axTabBar('ctm',[{id:'basic-details',label:'Basic Details'},{id:'members',label:'Members ('+x.t.members.length+')'},{id:'logs',label:'Logs'}],ctmTab,'ctmNavTab','ctmClose');
  let body='';
  if(ctmTab==='members')body=ctmMembersHTML(x);
  else if(ctmTab==='logs')body=lpLogsView(ctmTeamLogs(x),'',{});
  else{
    body=sbHero({icon:(typeof WS_ICO!=='undefined'&&WS_ICO.team)||'',name:sbEsc(x.t.name),meta:[sbEsc(x.w.name)],status:axBadge(statusTone(st),st)})
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Team Name',sbEsc(x.t.name))
      +axField(AX_ICO.fShield,'Access Template',tp?sbEsc(tp.name)+' <span class="ax-sub">'+(typeof wsPlural==='function'?wsPlural(tp.perms.length,'permission'):tp.perms.length+' permissions')+'</span>':'— <span class="ax-sub">a department team: members keep the access of their own roles</span>')
      +axField(AX_ICO.fUser,'Members',String(x.t.members.length))
      +axField(AX_ICO.fBuild,'Workspace',sbEsc(x.w.name)+(typeof wsKey==='function'?' <span class="ax-sub">'+wsKey(x.w)+'</span>':''))
      +'</div>';
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function ctmMembersHTML(x){
  const manage=ctmCanManage();
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Members</span>'
    +(manage&&!ctmMemOpen?'<button class="lp-sb-view-edit-btn" onclick="ctmMemAdd()">'+AX_ICO.plus+' Add Member</button>':'')+'</div>';
  let form='';
  if(ctmMemOpen&&manage){
    const pool=ctmPool(x);
    form=axInlineFormHTML('<div class="ep-form-group"><label class="ep-form-label">Member <span class="req">*</span></label>'
      +axCS('ctm-m-person',idLabels(pool),'','Search Employee')
      +(pool.length?'':'<div class="ea-hint">Everyone in this company is already in '+sbEsc(x.t.name)+'.</div>')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Designation</label>'+apCS('ctm-m-desig',CTM_DESIGS,'','Select designation')
      +'<div class="ea-hint">Approvers are numbered in the order they are added.</div></div>','ctmMemCancel()','ctmMemSave('+x.t.id+')');
  }
  if(!x.t.members.length)return head+form+(form?'':'<div class="lp-wf-empty">No members yet.'+(manage?' Add the people who should have '+sbEsc(ctmTplName(x.t))+' access.':'')+'</div>');
  return head+form
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>S. No</th><th>Name</th><th>Designation</th><th>Email</th>'+(manage?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
    +x.t.members.slice().map(function(u,i){
      return '<tr><td class="csag-td">'+(i+1)+'</td><td class="csag-td">'+sbEsc(idName(u))+'</td><td class="csag-td">'+sbEsc(ctmDesigOf(x.t,u)||'—')+'</td><td class="csag-td">'+sbEsc(idEmail(u)||'—')+'</td>'
        +(manage?'<td class="csag-td csag-act"><button class="att-row-btn is-danger" title="Remove from team" onclick="ctmMemRemove('+x.t.id+',\''+attrSafe(u)+'\')">'+AX_ICO.trash+'</button></td>':'')+'</tr>';
    }).join('')+'</tbody></table></div>';
}
function ctmPool(x){
  const all=typeof wsCandidates==='function'?wsCandidates(x.w):[];
  return all.filter(function(u){return x.t.members.indexOf(u)<0;});
}
function ctmMemAdd(){ctmMemOpen=true;isbTab('ctm',ctmPanelHTML);}
function ctmMemCancel(){ctmMemOpen=false;isbTab('ctm',ctmPanelHTML);}
function ctmMemSave(teamId){
  const x=ctmFind(teamId);if(!x||!ctmCanManage())return;
  const pool=ctmPool(x),uid=idFromLabel(getCSValue('ctm-m-person'),pool);
  if(!uid){showToast('Pick a member','error','Search for the employee to add.');return;}
  x.t.members.push(uid);
  const dg=getCSValue('ctm-m-desig');if(dg){x.t.desig=x.t.desig||{};x.t.desig[uid]=dg;}
  if(typeof emsClearCache==='function')emsClearCache();
  if(typeof wsNote==='function')wsNote(x.w,idName(uid)+' added to '+x.t.name+(dg?' as '+ctmDesigOf(x.t,uid):'')+'.');
  ctmMemOpen=false;renderADTPage();
  showToast('Member added','success',idName(uid)+' now has '+ctmTplName(x.t)+' access through '+x.t.name+'.');
}
function ctmMemRemove(teamId,uid){
  const x=ctmFind(teamId);if(!x||!ctmCanManage())return;
  if(typeof wsRemoveMember==='function')wsRemoveMember(x.w.id,teamId,uid);   // the workspace's own rule: logs it, keeps an imprest custodian accountable
}

/* ── Create New Team ───────────────────────────────────────────────────── */
function ctmStart(){
  if(!ctmCanManage()){if(typeof emsDeny==='function')emsDeny('create teams');return;}
  const ws=ctmWorkspaces().filter(function(w){return w.status==='Active';});
  if(!ws.length){showToast('No workspace','error','Set up the company\'s workspace in RBAC → Workspaces first.');return;}
  ctmForm={name:'',tpl:'',wsId:ws[0].id};renderADTPage();
}
function ctmFormHTML(){
  const ws=ctmWorkspaces().filter(function(w){return w.status==='Active';}),cur=ws.find(function(w){return w.id===ctmForm.wsId;})||ws[0];
  const tpls=typeof wsActiveTemplates==='function'?wsActiveTemplates().map(function(t){return t.name;}):[];
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create New Team</span><button class="ct-modal-close" onclick="ctmCancel()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">Members of a team get the access its template gives. Add the members from the team\'s Members tab. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Team Name <span class="req">*</span></label><input class="ep-form-input" id="ctm-f-name" maxlength="80" placeholder="e.g. Store Expense Approvers" value="'+attrSafe(ctmForm.name)+'"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Access Template <span class="req">*</span></label>'+apCS('ctm-f-tplpick',tpls,ctmForm.tpl,'Select Template')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Workspace</label>'
      +(ws.length>1?apCS('ctm-f-ws',ws.map(function(w){return w.name;}),cur?cur.name:'','Select Workspace'):'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(cur?cur.name:'')+'">')+'</div>'
    +'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="ctmCancel()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="ctmSave()">Create Team</button></div></div>'
    +'</div></div>';
}
function ctmCancel(){ctmForm=null;renderADTPage();}
function ctmSave(){
  if(!ctmForm||!ctmCanManage())return;
  const el=document.getElementById('ctm-f-name'),name=String(el?el.value:ctmForm.name).trim(),tplName=getCSValue('ctm-f-tplpick');
  ctmForm.name=name;ctmForm.tpl=tplName||'';
  const ws=ctmWorkspaces().filter(function(w){return w.status==='Active';});
  const wsName=document.getElementById('csw-ctm-f-ws')?getCSValue('ctm-f-ws'):'';
  const w=(wsName?ws.find(function(x){return x.name===wsName;}):null)||ws.find(function(x){return x.id===ctmForm.wsId;})||ws[0];
  if(!name){if(el)el.classList.add('is-invalid');showToast('Team Name is required','error');return;}
  if(!w){showToast('No workspace','error','Set up the company\'s workspace in RBAC → Workspaces first.');return;}
  if(w.teams.some(function(t){return t.name.toLowerCase()===name.toLowerCase();})){if(el)el.classList.add('is-invalid');showToast('A team with this name already exists','error','Team names are unique within a workspace.');return;}
  const tp=(typeof wsActiveTemplates==='function'?wsActiveTemplates():[]).find(function(t){return t.name===tplName;});
  if(!tp){showToast('Pick a template','error','A team with no template gives its members nothing.');return;}
  const t={id:wsTeamNext++,name:name,tpl:tp.id,members:[]};
  w.teams.push(t);
  if(typeof wsNote==='function')wsNote(w,'Team '+name+' added with the '+tp.name+' template.');
  ctmForm=null;ctmSel=t.id;ctmTab='members';ctmMemOpen=true;renderADTPage();
  showToast('Team created','success',name+' · '+tp.name+'. Add its members now.');
}

(function(){
  /* Like Employees, Teams does not depend on the People module in a client company. */
  if(typeof mcPageAllowed==='function'){
    const m0=mcPageAllowed;
    mcPageAllowed=function(pg){if(pg==='teams'&&ctmOn())return true;return m0.apply(this,arguments);};
  }
  if(typeof renderPageContent==='function'){
    const r0=renderPageContent;
    renderPageContent=function(target){
      if(typeof page==='undefined'||page!=='teams'||!ctmOn())return r0.apply(this,arguments);
      const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
      if(typeof emsApplyChrome==='function')emsApplyChrome();
      if(typeof emsPageGuard==='function'){const g=emsPageGuard(page);if(g){el.innerHTML=g;return;}}
      el.innerHTML=ctmPageHTML();
    };
  }
  if(typeof addListingItem==='function'){
    const a0=addListingItem;
    addListingItem=function(pg){if(pg==='teams'&&ctmOn()){ctmStart();return;}return a0.apply(this,arguments);};
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!=='teams'){ctmSel=null;ctmForm=null;ctmMemOpen=false;}return n0.apply(this,arguments);};
  }
})();
