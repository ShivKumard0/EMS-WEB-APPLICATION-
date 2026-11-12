/* ══ COMPANY SETTINGS · COMPANY STRUCTURE → DEPARTMENTS / DESIGNATION ════════
   These two sub-tabs used to read "No records found." while departments and
   designations lived as hard-coded lists (AX_DEPTS in admin-access.js,
   EA_DESIGNATIONS in employee-add.js) and as free text on each employee.
   Benefit policies (js/wallet-benefits.js) scope by department and
   designation, so they need one master to pick from. This is that master.

   Built like the Roles & Access tab (js/cs-roles.js): an inline Add / Edit
   form above an .att-table.csag-table, the same card as the RBAC Workspaces
   add-team form.

   SEEDED FROM WHAT EXISTS. The first read collects every department and
   designation already in the app - the old lists plus what employees carry -
   so nothing an employee holds is missing from the master.

   A NAME IN USE CANNOT BE RENAMED. Employees and policies store the name, so
   renaming one in use would silently detach them. Add a new one instead.
   Deactivating is refused while an active benefit policy is scoped to it.

   GRADE (PHASE 2). Each designation keeps an empty `grade` slot so a Grade
   master can map designations to grades later without reshaping the data. */

/* ONE MASTER PER ENTITY (Entity ID). The first entity's is seeded from what
   its people already carry; another entity starts empty and builds its own -
   departments and designations are never shared across companies. */
const csStructBook={};
let csStructForm=null;   // null, or {kind, id (null = add), name, code}
function csStructSeed(){
  const ent=typeof idEntity==='function'?idEntity():'';
  if(csStructBook[ent])return csStructBook[ent];
  if(typeof ID_HOME_ENTITY!=='undefined'&&ent!==ID_HOME_ENTITY)return (csStructBook[ent]={dept:[],desig:[]});
  const home=function(e){return !e.entityId||e.entityId===ent;};
  const emps=[].concat(typeof directEmpData!=='undefined'?directEmpData:[],typeof globalEmpData!=='undefined'?globalEmpData:[]).filter(home);
  const uniq=function(list){const s={},out=[];list.forEach(function(x){x=String(x||'').trim();if(x&&!s[x.toLowerCase()]){s[x.toLowerCase()]=1;out.push(x);}});return out;};
  const at='12 Apr 2026 | 08:53 PM';
  const mk=function(names,isDesig){
    const used={};
    return names.map(function(n,i){
      const r={id:i+1,name:n,code:csStructCode(n,used),status:'Active',createdBy:'Shaun Mathew',createdAt:at};
      if(isDesig)r.grade='';
      return r;
    });
  };
  const ax=(typeof AX_EMPLOYEES!=='undefined'?AX_EMPLOYEES:[]).filter(home);
  const csDepartments=mk(uniq([].concat(typeof AX_DEPTS!=='undefined'?AX_DEPTS:[],typeof EA_DEPTS!=='undefined'?EA_DEPTS:[],emps.map(function(e){return e.dept;}),ax.map(function(e){return e.dept;}))),false);
  const csDesignations=mk(uniq([].concat(typeof EA_DESIGNATIONS!=='undefined'?EA_DESIGNATIONS:[],emps.map(function(e){return e.jobTitle;}),ax.map(function(e){return e.desig;}))),true);
  return (csStructBook[ent]={dept:csDepartments,desig:csDesignations});
}
/* ENG for Engineering, SE for Software Engineer; a number when taken. */
function csStructCode(name,used){
  const w=String(name).replace(/[^A-Za-z ]/g,' ').trim().split(/\s+/);
  let c=(w.length>1?w.map(function(x){return x[0];}).join(''):w[0].slice(0,3)).toUpperCase()||'X';
  let k=c,n=2;while(used[k]){k=c+n;n++;}
  used[k]=1;return k;
}
function csStructList(kind){const b=csStructSeed();return kind==='designation'?b.desig:b.dept;}
function csDeptNames(){return csStructList('departments').filter(function(r){return r.status==='Active';}).map(function(r){return r.name;});}
function csDesigNames(){return csStructList('designation').filter(function(r){return r.status==='Active';}).map(function(r){return r.name;});}
function csStructNoun(kind){return kind==='designation'?'Designation':'Department';}
/* Who uses a name: employees (by their dept / job title) and benefit policies. */
function csStructEmployees(kind,name){
  const emps=[].concat(typeof directEmpData!=='undefined'?directEmpData:[],typeof globalEmpData!=='undefined'?globalEmpData:[]);
  return emps.filter(function(e){return (kind==='designation'?e.jobTitle:e.dept)===name;});
}
function csStructPolicies(kind,name){
  if(typeof wbPolicies==='undefined')return [];
  const scope=kind==='designation'?'Designation':'Department';
  return wbPolicies.filter(function(p){
    return p.status==='Active'&&p.versions.some(function(v){return v.scope===scope&&v.scopeRef===name;});
  });
}
/* Everything else pinned to a name: capping limits and approval routes. */
function csStructUsers(kind,name){
  const f=kind==='designation'?'position':'dept';
  const ent=typeof idEntity==='function'?idEntity():'';
  const caps=(typeof cappingData!=='undefined'?cappingData:[]).filter(function(c){return c.entity===ent&&c.status!=='Inactive'&&c[f]===name;}).map(function(c){return typeof capKey==='function'?capKey(c):'cap';});
  const wfs=(typeof caWorkflows!=='undefined'?caWorkflows:[]).filter(function(w){return w.entity===ent&&w.status!=='Inactive'&&w[f]===name;}).map(function(w){return typeof caWfKey==='function'?caWfKey(w):'route';});
  return csStructPolicies(kind,name).map(function(p){return p.key;}).concat(caps,wfs);
}
function csStructCan(kind){return typeof emsCan!=='function'||emsCan(kind==='designation'?'foundation.desig.manage':'foundation.dept.manage');}
/* Add Employee picks from the same masters. */
function csStructSyncWizard(){
  if(typeof EA_DEPTS!=='undefined'){EA_DEPTS.length=0;csDeptNames().forEach(function(n){EA_DEPTS.push(n);});}
  if(typeof EA_DESIGNATIONS!=='undefined'){EA_DESIGNATIONS.length=0;csDesigNames().forEach(function(n){EA_DESIGNATIONS.push(n);});}
}

function csStructOpen(kind,id){
  const r=id!=null?csStructList(kind).find(function(x){return x.id===id;}):null;
  csStructForm=r?{kind:kind,id:r.id,name:r.name,code:r.code}:{kind:kind,id:null,name:'',code:''};
  refreshCsSidebar();
}
function csStructClose(){csStructForm=null;refreshCsSidebar();}
function csStructSave(){
  const f=csStructForm;if(!f)return;
  if(!csStructCan(f.kind)){showToast('Not permitted','error','Changing '+csStructNoun(f.kind).toLowerCase()+'s needs the RBAC right '+(f.kind==='designation'?'foundation.desig.manage':'foundation.dept.manage')+'.');return;}
  const nEl=document.getElementById('css-name'),cEl=document.getElementById('css-code');
  const name=nEl?nEl.value.trim():'',code=(cEl?cEl.value.trim():'').toUpperCase();
  const noun=csStructNoun(f.kind),list=csStructList(f.kind);
  if(!name){showToast(noun+' Name is required','error');return;}
  if(!code){showToast('Code is required','error');return;}
  const dup=list.find(function(x){return x.id!==f.id&&(x.name.toLowerCase()===name.toLowerCase()||x.code===code);});
  if(dup){showToast(noun+' already exists','error',dup.name+' · '+dup.code);return;}
  if(f.id!=null){
    const r=list.find(function(x){return x.id===f.id;});if(!r)return;
    if(r.name!==name){
      const used=csStructEmployees(f.kind,r.name).length+csStructUsers(f.kind,r.name).length;
      if(used){showToast(r.name+' is in use','error','Employees, benefit policies, capping limits or approval routes use this name. Add a new '+noun.toLowerCase()+' instead of renaming it.');return;}
    }
    Object.assign(r,{name:name,code:code});
    csStructSyncWizard();
    csStructForm=null;refreshCsSidebar();
    showToast(noun+' updated','success',name+' · '+code);return;
  }
  const s=stampNow();
  const r={id:list.reduce(function(m,x){return Math.max(m,x.id);},0)+1,name:name,code:code,status:'Active',createdBy:CURRENT_USER,createdAt:s.date+' | '+s.time};
  if(f.kind==='designation')r.grade='';
  list.push(r);
  csStructSyncWizard();
  csStructForm=null;refreshCsSidebar();
  showToast(noun+' added','success',name+' is now available to employees and benefit policies.');
}
function csStructToggle(kind,id){
  const r=csStructList(kind).find(function(x){return x.id===id;});if(!r)return;
  if(!csStructCan(kind)){showToast('Not permitted','error','Changing '+csStructNoun(kind).toLowerCase()+'s needs RBAC rights.');return;}
  if(r.status==='Active'){
    const ps=csStructUsers(kind,r.name);
    if(ps.length){showToast(r.name+' is in use','error',ps.join(', ')+' use it. Deactivate or re-scope them first.');return;}
    r.status='Inactive';
  }else r.status='Active';
  csStructSyncWizard();
  refreshCsSidebar();
  showToast(csStructNoun(kind)+' '+(r.status==='Active'?'activated':'deactivated'),'success',r.name+(r.status==='Inactive'?' can no longer be picked for new records.':' can be picked again.'));
}
function csStructFormHTML(){
  const f=csStructForm,noun=csStructNoun(f.kind),edit=f.id!=null;
  return '<div class="csr-add">'
    +'<div class="csr-add-hd"><span class="lp-sb-section-title">'+(edit?'Edit ':'Add ')+noun+'</span></div>'
    +'<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label" for="css-name">'+noun+' Name <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="css-name" value="'+attrSafe(f.name)+'" placeholder="e.g. '+(f.kind==='designation'?'Sales Executive':'Sales')+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label" for="css-code">Code <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="css-code" value="'+attrSafe(f.code)+'" placeholder="e.g. '+(f.kind==='designation'?'SEX':'SAL')+'">'
        +'<div class="ea-hint">Unique in this entity.</div></div>'
    +'</div>'
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="csStructClose()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="csStructSave()">'+(edit?'Save changes':'Save')+'</button></div>'
  +'</div>';
}
function csStructTabHTML(kind){
  const list=csStructList(kind),noun=csStructNoun(kind);
  const editSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const plusSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const formOn=csStructForm&&csStructForm.kind===kind;
  return (formOn?csStructFormHTML()
      :'<div class="att-bar csag-bar"><div class="att-bar-actions"><button class="att-link" onclick="csStructOpen(\''+kind+'\')">'+plusSvg+'Add '+noun+'</button></div></div>')
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>'+noun+'</th><th>Code</th><th>Employees</th><th>Benefit Policies</th><th>Status</th><th class="csag-act">Action</th>'
    +'</tr></thead><tbody>'
    +list.map(function(r,i){
      const pol=csStructPolicies(kind,r.name).length;
      return '<tr'+(formOn&&csStructForm.id===r.id?' class="csr-editing"':'')+'>'
        +'<td class="csag-td csag-num">'+(i+1)+'</td>'
        +'<td class="csag-td"><div class="lp-c-main">'+sbEsc(r.name)+'</div></td>'
        +'<td class="csag-td">'+sbEsc(r.code)+'</td>'
        +'<td class="csag-td">'+csStructEmployees(kind,r.name).length+'</td>'
        +'<td class="csag-td">'+pol+'</td>'
        +'<td class="csag-td"><span class="lp-status-badge tone-'+statusTone(r.status)+'">'+r.status+'</span></td>'
        +'<td class="csag-td csag-act">'
          +'<button class="att-row-btn" title="Edit" onclick="csStructOpen(\''+kind+'\','+r.id+')">'+editSvg+'</button>'
          +'<button class="btn btn-outline btn-sm" onclick="csStructToggle(\''+kind+'\','+r.id+')">'+(r.status==='Active'?'Deactivate':'Activate')+'</button>'
        +'</td></tr>';
    }).join('')
    +'</tbody></table></div>';
}

/* After every script: the masters seed from all lists, then Add Employee reads them. */
document.addEventListener('DOMContentLoaded',csStructSyncWizard);
