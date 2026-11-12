/* ══ ADMINISTRATION → COMPANY STRUCTURE (product owner, 12 Nov 2026) ══════════════════════════════════════════════
   Company Structure leaves the Company Settings panel (where it was a tab with six sub-tabs) and becomes a page of
   its own under Administration, after Company Settings. Its tabs - Branch, Departments, Designation, Cost Centres,
   Projects, Signatories - are each a standard listing: filters, status tiles, a ☰ per row. The row's panel has
   Basic Details (Edit opens the existing form there), Logs (the status move with its comment, over the record's log),
   History and Workflow (drawn from the log). + in the top bar adds a record on the open tab.

   The data, the forms and the saves are the existing ones:
     Branch                    js/attendance-settings.js  (csAtt.locations; the form with the map)
     Departments, Designation  js/cs-structure.js         (csStructList)
     Cost Centres, Projects    js/budgets.js / budgets-ui.js (bgmList; they already keep a log)
   Branches, departments and designations kept no log; their saves and status moves now write one (rec.logs), so the
   Logs and Workflow tabs have something true to show. Signatories has never been built: the tab says so.

   Who opens it: whoever may open Company Settings (foundation.entity.view). The actions keep their own rights. */
const CST_PAGE='company-structure';
let cstTab='branch',cstSel=null,cstPanelTab='basic-details',cstQ='',cstStatusF='';

/* ── A log on the records that had none ── */
function cstLog(rec,status,action){
  if(!rec)return;const s=stampNow();rec.logs=rec.logs||[];
  rec.logs.unshift({date:s.date,time:s.time,user:typeof wbActor==='function'?wbActor():CURRENT_USER,userId:typeof idMe==='function'?idMe():'',status:status,action:action});
}

/* ── The six listings ── */
const CST_ICO={
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  ring:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>',
  org:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
};
function cstFc(ico,label,val,wide){
  return '<div class="lp-sb-field-card'+(wide?' is-wide':'')+'"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div>'
    +'<div class="lp-sb-field-value">'+(val!=null&&val!==''?val:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
}
function cstE(s){return sbEsc(String(s==null?'':s));}
const cstStructKind=function(id){return id==='designation'?'designation':'departments';};
const cstBgmKind=function(id){return id==='projects'?'project':'cc';};
const CST_KINDS={
  branch:{label:'Branch',noun:'Branch',ico:CST_ICO.pin,
    rows:function(){return (csAtt.locations||[]).map(function(l,i){return {key:i,rec:l,name:l.name,sub:l.address,status:l.status||'Active'};});},
    head:['Branch Name','Location','Radius','Status'],
    cells:function(r){return '<td><div class="lp-c-main ax-c-link">'+cstE(r.name)+'</div></td><td style="white-space:normal"><div class="lp-c-sub">'+cstE(r.sub)+'</div></td><td><div class="lp-c-plain">'+csAttInt(r.rec.radius,100)+' m</div></td>';},
    basic:function(r){const l=r.rec;return cstFc(CST_ICO.pin,'Address',cstE(l.address),true)+cstFc(CST_ICO.ring,'Allowed Radius',csAttInt(l.radius,100)+' m')
      +cstFc(CST_ICO.pin,'Coordinates',l.lat!=null?Number(l.lat).toFixed(5)+', '+Number(l.lng).toFixed(5):'')
      +cstFc(CST_ICO.tag,'Clock-ins',(r.status==='Active'?'Accepted within the radius':'Not accepted (inactive)'),true);},
    can:function(){return true;},
    editing:function(r){return csBrIdx===r.key;},adding:function(){return csBrIdx===-1;},
    edit:function(r){csBrOpen(r.key);},add:function(){csBrOpen(-1);},form:function(){return csBranchFormHTML();},
    moves:function(r){return [r.status==='Active'?'Inactive':'Active'];},
    move:function(r,status){
      r.rec.status=status;
      if(typeof csAttDraft!=='undefined'&&csAttDraft&&csAttDraft.locations&&csAttDraft.locations[r.key])csAttDraft.locations[r.key].status=status;
      cstLog(r.rec,status,'Branch '+(status==='Active'?'activated: clock-ins are accepted again.':'deactivated: no clock-ins are accepted here.'));return '';
    }},
  departments:{label:'Departments',noun:'Department',ico:CST_ICO.org},
  designation:{label:'Designation',noun:'Designation',ico:CST_ICO.users},
  'cost-centres':{label:'Cost Centres',noun:'Cost Centre',ico:CST_ICO.tag},
  projects:{label:'Projects',noun:'Project',ico:CST_ICO.doc},
  signatories:{label:'Signatories',noun:'Signatory',ico:CST_ICO.users,
    rows:function(){return [];},head:['Signatory','Designation','Status'],cells:function(){return '';},basic:function(){return '';},
    can:function(){return false;},editing:function(){return false;},adding:function(){return false;},moves:function(){return [];},
    empty:'No signatory yet. Signatories are not set up in this build.'}
};
['departments','designation'].forEach(function(id){
  const k=cstStructKind(id);
  Object.assign(CST_KINDS[id],{
    rows:function(){return csStructList(k).map(function(x){return {key:x.id,rec:x,name:x.name,sub:x.code,status:x.status};});},
    head:[csStructNoun(k),'Code','Employees','Benefit Policies','Status'],
    cells:function(r){return '<td><div class="lp-c-main ax-c-link">'+cstE(r.name)+'</div></td><td><div class="lp-c-plain">'+cstE(r.sub)+'</div></td>'
      +'<td><div class="lp-c-plain">'+csStructEmployees(k,r.name).length+'</div></td><td><div class="lp-c-plain">'+csStructPolicies(k,r.name).length+'</div></td>';},
    basic:function(r){const used=csStructUsers(k,r.name);
      return cstFc(CST_ICO.tag,'Code',cstE(r.sub))+cstFc(CST_ICO.users,'Employees',String(csStructEmployees(k,r.name).length))
        +cstFc(CST_ICO.doc,'Used By',used.length?cstE(used.join(', ')):'Nothing yet',true)
        +(k==='designation'?cstFc(CST_ICO.tag,'Grade',cstE(r.rec.grade||'Not mapped')):'')
        +cstFc(CST_ICO.users,'Created By',cstE(r.rec.createdBy||''))+cstFc(CST_ICO.cal,'Created',cstE(r.rec.createdAt||''));},
    can:function(){return csStructCan(k);},
    editing:function(r){return !!csStructForm&&csStructForm.kind===k&&csStructForm.id===r.key;},
    adding:function(){return !!csStructForm&&csStructForm.kind===k&&csStructForm.id==null;},
    edit:function(r){csStructOpen(k,r.key);},add:function(){csStructOpen(k);},form:function(){return csStructFormHTML();},
    moves:function(r){return [r.status==='Active'?'Inactive':'Active'];},
    move:function(r){const was=r.rec.status;csStructToggle(k,r.key);return r.rec.status===was?'not changed':'';}
  });
});
['cost-centres','projects'].forEach(function(id){
  const k=cstBgmKind(id);
  Object.assign(CST_KINDS[id],{
    rows:function(){return bgmList(k).map(function(x){return {key:x.id,rec:x,name:x.name,sub:x.code,status:x.status};});},
    head:[bgmNoun(k),'Department',k==='project'?'Start – End':'Effective','Status'],
    cells:function(r){const x=r.rec,from=k==='project'?x.startDate:x.effFrom,to=k==='project'?x.endDate:x.effTo;
      return '<td><div class="lp-c-main ax-c-link">'+cstE(x.name)+'</div><div class="lp-c-sub">'+cstE(x.code)+'</div></td>'
        +'<td><div class="lp-c-plain">'+cstE(x.dept||'-')+'</div><div class="lp-c-sub">'+cstE(x.ownerUid?caN(x.ownerUid):'no owner')+'</div></td>'
        +'<td><div class="lp-c-plain">'+(from?cdLabel(from):'-')+(to?' – '+cdLabel(to):'')+'</div><div class="lp-c-sub">'+bgmUsedBy(k,x.id)+'</div></td>';},
    basic:function(r){const x=r.rec,from=k==='project'?x.startDate:x.effFrom,to=k==='project'?x.endDate:x.effTo;
      return cstFc(CST_ICO.tag,'Code',cstE(x.code))+cstFc(CST_ICO.org,'Department',cstE(x.dept||'None'))
        +cstFc(CST_ICO.users,k==='project'?'Project Owner':'Cost Centre Owner',cstE(x.ownerUid?caN(x.ownerUid):'No owner'))
        +cstFc(CST_ICO.doc,'Used By',cstE(bgmUsedBy(k,x.id)))
        +cstFc(CST_ICO.cal,k==='project'?'Start Date':'Effective From',from?cdLabel(from):'')+cstFc(CST_ICO.cal,k==='project'?'End Date':'Effective To',to?cdLabel(to):'Open-ended')
        +cstFc(CST_ICO.doc,'Description',cstE(x.desc||''),true);},
    can:function(){return bgCan('foundation.dept.manage');},
    editing:function(r){return !!bgmForm&&bgmForm.kind===k&&bgmForm.id===r.key;},
    adding:function(){return !!bgmForm&&bgmForm.kind===k&&bgmForm.id==null;},
    edit:function(r){bgmOpen(k,r.key);},add:function(){bgmOpen(k);},form:function(){return bgmFormHTML();},
    moves:function(r){return (k==='project'?['Active','Inactive','Completed']:['Active','Inactive']).filter(function(s){return s!==r.status;});},
    move:function(r,status){return bgmSetStatus(k,r.key,status);},
    /* Free-text values on old advances, mapped to a master: kept under the list, as before. */
    extra:function(){const h=bgmTabHTML(k),i=h.indexOf('<div class="wb-proj-h">Free-text');return i>=0?h.slice(i):'';}
  });
});
/* No Cost Centres or Projects tab (product owner, 12 Nov 2026). The existing cost centres and projects stay on budgets,
   claims and advances and can still be picked; none can be added, edited or deactivated from the app. */
const CST_TABS=['branch','departments','designation','signatories'];

/* ── Page ── */
function cstCloseForms(){
  if(typeof csStructForm!=='undefined')csStructForm=null;
  if(typeof bgmForm!=='undefined')bgmForm=null;
  if(typeof csBrIdx!=='undefined'&&csBrIdx!==null){csBrIdx=null;csBrDraft=null;csBrDirty=false;}
}
function cstSetTab(t){if(cstTab===t)return;cstTab=t;cstSel=null;cstQ='';cstStatusF='';cstCloseForms();renderADTPage();}
function cstRows(){return CST_KINDS[cstTab].rows();}
function cstRow(key){return cstRows().find(function(r){return r.key===key;})||null;}
function buildCompanyStructureHTML(){
  if(CST_TABS.indexOf(cstTab)<0)cstTab='branch';
  const K=CST_KINDS[cstTab],all=cstRows(),q=String(cstQ||'').trim().toLowerCase();
  const rows=all.filter(function(r){return (!cstStatusF||r.status===cstStatusF)&&(!q||[r.name,r.sub].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}));});
  if(cstSel!=null&&!rows.some(function(r){return r.key===cstSel;}))cstSel=null;
  const adding=K.adding(),cols=K.head.length+2;
  const pgn=listPage('cst-'+cstTab,[cstQ,cstStatusF].join('|'),rows.map(function(r,i){
    return '<tr class="cst-row'+(cstSel===r.key?' lp-row-selected':'')+'" id="cst-row-'+r.key+'" style="cursor:pointer" onclick="cstOpen('+r.key+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'+K.cells(r)+'<td>'+axBadge(statusTone(r.status),r.status)+'</td>'
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(r.name)+'" onclick="cstOpen('+r.key+')">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td></tr>';
  }),'<tr><td colspan="'+cols+'" style="padding:24px;text-align:center;color:var(--gray)">'+(K.empty||(all.length?'No '+K.noun.toLowerCase()+' matches this filter.':'No '+K.noun.toLowerCase()+' yet. Use + to add one.'))+'</td></tr>');
  const states=cstTab==='projects'?['Active','Inactive','Completed']:['Active','Inactive'];
  const tiles=states.map(function(s){return caStat(s,all.filter(function(r){return r.status===s;}).length,cstStatusF===s,'cstStat(\''+s+'\')',statusTone(s));}).join('');
  const tabs=CST_TABS.map(function(id){return {id:id,label:CST_KINDS[id].label};});
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,cstTab,'cstSetTab',true)
    +'<div class="lp-page">'
    +ccFilterBar(lpSearchField('cst-q',cstQ,'Search '+K.noun.toLowerCase(),'cstApply()')
      +apCS('cst-status',states,cstStatusF,'All Statuses')
      +clearFiltersBtn([cstQ,cstStatusF],'cstReset()')+'<button class="lp-pill-search" onclick="cstApply()">Search</button>',tiles)
    +(adding?'<div style="margin-top:14px">'+K.form()+'</div>':'')
    +ccSplit('cst','<table class="lp-table ax-table"><thead><tr><th>S. No</th>'+K.head.map(function(h){return '<th>'+h+'</th>';}).join('')+'<th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,cstSel!=null&&!adding,renderCstSidebar)
    +(K.extra?K.extra():'')
    +'</div></div>';
}
function cstApply(){cstQ=lpSearchValue('cst-q');const s=getCSValue('cst-status');cstStatusF=s==='All Statuses'?'':s||'';cstSel=null;renderADTPage();}
function cstReset(){cstQ='';cstStatusF='';cstSel=null;renderADTPage();}
function cstStat(s){cstStatusF=cstStatusF===s?'':s;cstSel=null;renderADTPage();}
function cstOpen(key,tab){
  if(cstSel!==key)cstCloseForms();
  cstPanelTab=tab||sbKeepTab(cstSel,cstPanelTab);cstSel=key;
  const sb=document.getElementById('cst-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('cst',renderCstSidebar);
  document.querySelectorAll('.cst-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='cst-row-'+key);});
}
function cstClose(){cstSel=null;cstCloseForms();const sb=document.getElementById('cst-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.cst-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function cstNav(t){if(t!==cstPanelTab)cstCloseForms();cstPanelTab=t;isbTab('cst',renderCstSidebar);}
function cstEdit(){const r=cstRow(cstSel);if(!r)return;cstPanelTab='basic-details';CST_KINDS[cstTab].edit(r);}
function cstAdd(){cstSel=null;CST_KINDS[cstTab].add();}
function renderCstSidebar(){
  const K=CST_KINDS[cstTab],r=cstRow(cstSel);if(!r)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===cstPanelTab;}))cstPanelTab='basic-details';
  const can=K.can(),editing=K.editing(r);
  const hero=sbHero({icon:K.ico,name:cstE(r.name),meta:[cstE(r.sub)],status:axBadge(statusTone(r.status),r.status),editing:editing,
    edit:can&&!editing&&cstPanelTab==='basic-details'&&K.edit?'<button class="lp-sb-view-edit-btn" onclick="cstEdit()">'+(typeof CC_ICO!=='undefined'?CC_ICO.edit:'')+' Edit</button>':''});
  let body;
  if(cstPanelTab==='logs')body=cstLogsHTML(K,r,can);
  else if(cstPanelTab==='history')body=sbHistoryHTML(r.rec);
  else if(cstPanelTab==='workflow')body=wfTimelineHTML(wfDoneFromLogs(r.rec.logs||[]));
  else body=hero+(editing?K.form():'<div class="lp-sb-detail-grid">'+K.basic(r)+'</div>');
  return axTabBar('cst',tabs,cstPanelTab,'cstNav','cstClose')+'<div class="lp-isb-body">'+body+'</div>';
}
/* Logs: the status move, with its comment (required to deactivate), over the record's log. */
function cstLogsHTML(K,r,can){
  const moves=can?K.moves(r):[];
  const form='<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+(r.status==='Active'?'active':'inactive')+'"></span>'+cstE(r.status)+'</div>'
    +(moves.length?'<p class="lp-logs-form-sub">Update the '+K.noun.toLowerCase()+' status and add a comment.</p>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('cst-log-status',moves,moves.length===1?moves[0]:'','Select Status')
      +'<div class="lp-logs-form-label">Comment</div>'
      +'<textarea class="lp-logs-form-textarea" id="cst-log-comment" placeholder="Required to deactivate"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="cstLogSave()">Save</button>'
      :'<p class="lp-logs-form-sub">'+(can?'No status change is available.':'You can view this '+K.noun.toLowerCase()+' but not change it.')+'</p>')
    +'</div>';
  return lpLogsView(r.rec.logs||[],form);
}
function cstLogSave(){
  const K=CST_KINDS[cstTab],r=cstRow(cstSel);if(!r)return;
  const status=getCSValue('cst-log-status'),el=document.getElementById('cst-log-comment'),c=el?String(el.value||'').trim():'';
  if(!status||status==='Select Status'){showToast('Pick the status','error');return;}
  if(status!=='Active'&&!c){showToast('Comment required','error','Give the reason for marking '+r.name+' '+status.toLowerCase()+'.');return;}
  const before=(r.rec.logs||[])[0];
  const e=K.move(r,status);
  if(e){if(e!=='not changed')showToast('Not saved','error',e);return;}
  const l=(r.rec.logs||[])[0];
  if(l&&l!==before&&c)l.action+=' Comment: '+c;
  showToast(K.noun+' '+status.toLowerCase(),'success',r.name+'.');
  renderADTPage();
}

/* ── Logs for the saves that kept none ── */
(function(){
  if(typeof csStructSave==='function'){
    const s0=csStructSave;
    csStructSave=function(){
      const f=csStructForm;if(!f)return s0.apply(this,arguments);
      const k=f.kind,list=csStructList(k),was={};list.forEach(function(x){was[x.id]={name:x.name,code:x.code};});
      const out=s0.apply(this,arguments);
      if(!csStructForm){   // saved
        const noun=csStructNoun(k);
        list.forEach(function(x){
          if(!was[x.id])cstLog(x,'Active',noun+' '+x.name+' ('+x.code+') created.');
          else if(was[x.id].name!==x.name||was[x.id].code!==x.code)cstLog(x,x.status,noun+' updated: '+[was[x.id].name!==x.name?'name '+was[x.id].name+' → '+x.name:'',was[x.id].code!==x.code?'code '+was[x.id].code+' → '+x.code:''].filter(Boolean).join(', ')+'.');
        });
      }
      return out;
    };
  }
  if(typeof csStructToggle==='function'){
    const t0=csStructToggle;
    csStructToggle=function(kind,id){
      const x=csStructList(kind).find(function(r){return r.id===id;}),was=x&&x.status;
      const out=t0.apply(this,arguments);
      if(x&&x.status!==was)cstLog(x,x.status,csStructNoun(kind)+' '+(x.status==='Active'?'activated: it can be picked again.':'deactivated: it can no longer be picked for new records.'));
      return out;
    };
  }
  if(typeof csBrSave==='function'){
    const b0=csBrSave;
    csBrSave=function(){
      const idx=csBrIdx,old=idx>=0&&csAtt.locations[idx]?csAttClone(csAtt.locations[idx]):null;
      const out=b0.apply(this,arguments);
      if(csBrIdx===null&&idx!==null){   // saved
        const rec=idx===-1?csAtt.locations[csAtt.locations.length-1]:csAtt.locations[idx];
        if(rec){
          if(!old)cstLog(rec,rec.status||'Active','Branch '+rec.name+' added ('+rec.radius+' m radius).');
          else{
            const ch=['name','address','radius','status'].filter(function(f){return String(old[f])!==String(rec[f]);});
            if(ch.length)cstLog(rec,rec.status||'Active','Branch updated ('+ch.map(function(f){return f+': '+old[f]+' → '+rec[f];}).join('; ')+').');
          }
        }
      }
      return out;
    };
  }
})();

/* ── The page in the app: menu, rights, render, title, + and repaint ── */
(function(){
  if(typeof sidebarItems!=='undefined'){
    const g=sidebarItems.find(function(x){return x.dropdown==='Administration';});
    if(g&&!g.children.some(function(c){return c.id===CST_PAGE;})){
      const at=g.children.findIndex(function(c){return c.id==='settings';});
      g.children.splice(at>=0?at+1:g.children.length,0,{id:CST_PAGE,label:'Company Structure',color:'slate',icon:(typeof sbIco!=='undefined'&&(sbIco.layers||sbIco.building))||''});
    }
  }
  if(typeof supportPageMeta!=='undefined')supportPageMeta[CST_PAGE]={title:'Company Structure',context:'Company Structure',filters:[],columns:[],rows:[]};
  if(typeof APP_PAGE_PERMS!=='undefined'&&APP_PAGE_PERMS.settings)APP_PAGE_PERMS[CST_PAGE]=APP_PAGE_PERMS.settings.slice();
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf('settings')>=0&&EMS_CLIENT_PAGES.indexOf(CST_PAGE)<0)EMS_CLIENT_PAGES.push(CST_PAGE);
  if(typeof renderPageContent==='function'){
    const r0=renderPageContent;
    renderPageContent=function(target){
      if(page!==CST_PAGE)return r0.apply(this,arguments);
      const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
      if(typeof emsApplyChrome==='function')emsApplyChrome();
      if(typeof emsPageGuard==='function'){const g=emsPageGuard(page);if(g){el.innerHTML=g;return;}}
      el.innerHTML=buildCompanyStructureHTML();
    };
  }
  if(typeof getPageTitle==='function'){const t0=getPageTitle;getPageTitle=function(pg){return pg===CST_PAGE?'Company Structure':t0.apply(this,arguments);};}
  if(typeof renderADTPage==='function'){
    const a0=renderADTPage;
    renderADTPage=function(){
      const out=a0.apply(this,arguments);
      if(page===CST_PAGE){const b=document.getElementById('tb-page-add-btn');if(b){const K=CST_KINDS[cstTab],show=!!K.add&&K.can();b.style.display=show?'':'none';if(show)b.onclick=cstAdd;}}
      return out;
    };
  }
  /* The moved screens repaint the old panel (refreshCsSidebar, isbTab('cs',…)); on this page they repaint the page. */
  if(typeof refreshCsSidebar==='function'){const f0=refreshCsSidebar;refreshCsSidebar=function(){if(page===CST_PAGE){renderADTPage();return;}return f0.apply(this,arguments);};}
  if(typeof isbTab==='function'){const i0=isbTab;isbTab=function(prefix){if(prefix==='cs'&&page===CST_PAGE){renderADTPage();return;}return i0.apply(this,arguments);};}
})();
