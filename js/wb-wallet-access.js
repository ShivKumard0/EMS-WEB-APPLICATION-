/* ══ WALLET & BENEFITS → EMPLOYEES: WHO GETS A WALLET (product owner, 12 Nov 2026) ═══════════════════════════════
   A third tab beside Wallets and Benefit Policies. Each entry gives one wallet (Meal, Fuel, Telecom, Gift, Health) to
   people chosen by Branch or by Department - several at once - and then to all of their employees or to the employees
   picked. Corporate Expense and Reimbursement are company money, not perks, and are not offered.
   - Access only: the people an entry reaches have the wallet on their card and get its benefit loads; the amount still
     comes from Benefit Policies. A wallet with no entry at all is open to everyone, as before; once a wallet has an
     entry, only the people its Active entries reach have it.
   - An entry is deactivated (or activated again) in its Logs, with a note; Edit changes it.
   - In the presentation, Nova Retail starts with entries that keep everyone's wallets (Meal and Fuel by branch,
     Telecom and Gift by department), added once. */
let wbAccess=[];          // {id, entity, wallet, by:'Branch'|'Department', targets:[], scope:'All'|'Selected', eids:[], status, createdBy, createdIso, updatedBy, updatedIso, logs}
let wbAccessSeq=1000;
let wbAccessSeeded=false;
let waSel=null,waTab='basic-details',waQ='',waWalletF='',waStatF='',waForm=null,waLogAct=null;
const WA_SKIP=['CORP','REIMB'];

/* ── Records and the rule ──────────────────────────────────────────────── */
function waKey(a){return 'WA-'+a.id;}
function waRec(id){return wbAccess.find(function(a){return a.id===id;})||null;}
function waHere(){waSeedNova();return wbAccess.filter(function(a){return a.entity===wbEntity();});}
function waCanManage(){return typeof wbCan==='function'&&wbCan('benefit.wallet.manage');}
function waCanView(){return typeof wbCanView==='function'?wbCanView('wallets'):true;}
function waWallets(){return wbMine(wbWallets).filter(function(w){return w.status==='Active'&&WA_SKIP.indexOf(w.type)<0;}).map(function(w){return w.type;});}
function waTargetsOf(by){return by==='Branch'?(typeof emsBranchNames==='function'?emsBranchNames():[]):wbDepts();}
function waEmpField(by){return by==='Branch'?'branch':'dept';}
/* Does an Active entry reach this employee? emp: a wbEmpInfo row or an employee record (dept, branch, eid). */
function waReaches(a,emp){
  if(a.status!=='Active'||!emp)return false;
  if(a.targets.indexOf(emp[waEmpField(a.by)]||'')<0)return false;
  return a.scope==='All'||a.eids.indexOf(emp.eid)>=0;
}
function waManaged(ent,wallet){return wbAccess.some(function(a){return a.entity===ent&&a.wallet===wallet;});}
function waHasAccess(emp,wallet,ent){
  ent=ent||wbEntity();
  if(WA_SKIP.indexOf(wallet)>=0||!waManaged(ent,wallet))return true;
  return wbAccess.some(function(a){return a.entity===ent&&a.wallet===wallet&&waReaches(a,emp);});
}
function waPeople(a){return wbEmployees().filter(function(e){return waReaches(Object.assign({},a,{status:'Active'}),e);});}
function waTargetLabel(a){return a.targets.join(', ');}
function waScopeLabel(a){return a.scope==='All'?'All employees':a.eids.length+' selected';}

/* ── The Employees tab ─────────────────────────────────────────────────── */
function waRows(){
  const q=String(waQ||'').toLowerCase().trim();
  return waHere().filter(function(a){
    if(waWalletF&&wbTypeName(a.wallet)!==waWalletF)return false;
    if(waStatF&&a.status!==waStatF)return false;
    return !q||(waKey(a)+' '+wbTypeName(a.wallet)+' '+a.by+' '+waTargetLabel(a)+' '+a.eids.map(idEmpName).join(' ')).toLowerCase().indexOf(q)>=0;
  }).sort(function(a,b){return wbTypeName(a.wallet).localeCompare(wbTypeName(b.wallet))||a.id-b.id;});
}
function waApply(){const v=getCSValue('wa-f-wal');waWalletF=v&&v!=='All Wallets'?v:'';waQ=lpSearchValue('wa-f-q');waSel=null;renderADTPage();}
function waReset(){waQ='';waWalletF='';waStatF='';waSel=null;renderADTPage();}
function waToggleStat(s){waStatF=waStatF===s?'':s;waSel=null;renderADTPage();}
function waListHTML(){
  const all=waHere(),rows=waRows();
  if(waSel!=null&&!rows.some(function(a){return a.id===waSel;}))waSel=null;
  const menu=typeof EA_ICO!=='undefined'&&EA_ICO.menu?EA_ICO.menu:'☰';
  const pgn=listPage('wb-access',[waQ,waWalletF,waStatF].join('|'),rows.map(function(a,i){
    const n=waPeople(a).length;
    return '<tr class="wa-row'+(waSel===a.id?' lp-row-selected':'')+'" id="wa-row-'+a.id+'" style="cursor:pointer" onclick="waOpen('+a.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main">'+sbEsc(wbTypeName(a.wallet))+'</div></td>'
      +'<td><div class="lp-c-plain">'+a.by+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(waTargetLabel(a))+'">'+sbEsc(waTargetLabel(a))+'</div></td>'
      +'<td><div class="lp-c-plain">'+(a.scope==='All'?'All ('+n+')':a.eids.length+' selected')+'</div></td>'
      +'<td>'+axBadge(statusTone(a.status),a.status)+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="lp-action-btn" title="Open" onclick="waOpen('+a.id+')">'+menu+'</button></td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">'+(all.length?'No entry matches this filter.':'No wallet access set yet: every wallet is open to everyone.'+(waCanManage()?' Add an entry with the + button.':''))+'</td></tr>');
  const count=function(s){return all.filter(function(a){return a.status===s;}).length;};
  const stat=function(s){return '<div class="listing-stat'+(waStatF===s?' stat-selected':'')+'" onclick="waToggleStat(\''+s+'\')">'
    +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';};
  return '<div class="lp-page">'
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('wa-f-q',waQ,'Search wallet, branch, department or employee','waApply()')
    +apCS('wa-f-wal',waWallets().map(wbTypeName),waWalletF,'All Wallets')
    +clearFiltersBtn([waQ,waWalletF,waStatF],'waReset()')
    +'<button class="lp-pill-search" onclick="waApply()">Search</button></div></div>'
    +'<div class="listing-stats">'+['Active','Inactive'].map(stat).join('')+'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="wa-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table"><thead><tr><th>S. No</th><th>Wallet</th><th>Access By</th><th>Branches / Departments</th><th>Employees</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'+pgn.pager+'</div></div>'
    +'<div class="lp-split-sb'+(waSel!=null?' open':'')+'" id="wa-split-sb"><div class="lp-isb" id="wa-isb-inner">'+(waSel!=null?sbRender(waPanelHTML,'wa'):'')+'</div></div>'
    +'</div>'
    +(waForm?waFormHTML():'')
    +'</div>';
}

/* ── The side panel: Basic Details · Employees · Logs ──────────────────── */
function waOpen(id,tab){
  if(waSel!==id)waLogAct=null;
  waTab=tab||(typeof sbKeepTab==='function'?sbKeepTab(waSel,waTab):'basic-details');waSel=id;
  const sb=document.getElementById('wa-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('wa',waPanelHTML);
  document.querySelectorAll('.wa-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='wa-row-'+id);});
}
function waClose(){waSel=null;waLogAct=null;const sb=document.getElementById('wa-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.wa-row').forEach(function(r){r.classList.remove('lp-row-selected');});}
function waNavTab(t){waTab=t;isbTab('wa',waPanelHTML);}
function waPanelHTML(){
  const a=waRec(waSel);if(!a)return '';
  const ppl=waPeople(a);
  const tabBar=axTabBar('wa',[{id:'basic-details',label:'Basic Details'},{id:'employees',label:'Employees ('+ppl.length+')'},{id:'logs',label:'Logs'}],waTab,'waNavTab','waClose');
  let body;
  if(waTab==='employees'){
    body=ppl.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>S. No</th><th>Name</th><th>Employee ID</th><th>Department</th><th>Branch</th></tr></thead><tbody>'
      +ppl.sort(function(x,y){return x.name.localeCompare(y.name);}).map(function(e,i){return '<tr><td class="csag-td">'+(i+1)+'</td><td class="csag-td">'+sbEsc(e.name)+'</td><td class="csag-td">'+sbEsc(e.empId||'')+'</td><td class="csag-td">'+sbEsc(e.dept||'—')+'</td><td class="csag-td">'+sbEsc(e.branch||'—')+'</td></tr>';}).join('')
      +'</tbody></table></div>':'<div class="lp-wf-empty">No employee is reached by this entry.</div>';
  }else if(waTab==='logs'){
    body=waLogsHTML(a);
  }else{
    body=sbHero({icon:(typeof WB_ICO!=='undefined'&&WB_ICO.wallet)||'',name:sbEsc(wbTypeName(a.wallet))+' wallet access',meta:[waKey(a),a.by],status:axBadge(statusTone(a.status),a.status),editing:false,
        onEdit:waCanManage()?'waStartEdit('+a.id+')':''})
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fCash,'Wallet',sbEsc(wbTypeName(a.wallet)))
      +axField(AX_ICO.fTag,'Access By',a.by)
      +axField(AX_ICO.fBuild,a.by==='Branch'?'Branches':'Departments',sbEsc(waTargetLabel(a)),true)
      +axField(AX_ICO.fUser,'Employees',waScopeLabel(a)+' <span class="ax-sub">reaches '+ppl.length+' employee'+(ppl.length===1?'':'s')+'</span>',a.scope!=='All')
      +(a.scope!=='All'?'':'')
      +axField(AX_ICO.fUser,'Created By',sbEsc(a.createdBy||'—')+(a.createdIso?' <span class="ax-sub">'+cdLabel(a.createdIso)+'</span>':''))
      +axField(AX_ICO.fCal,'Last Updated',a.updatedIso?cdLabel(a.updatedIso)+(a.updatedBy?' <span class="ax-sub">by '+sbEsc(a.updatedBy)+'</span>':''):'—')
      +'</div>'
      +(a.scope==='Selected'?'<div class="lp-sb-view-header" style="margin-top:6px"><span class="lp-sb-section-title">Selected employees</span></div><div class="lp-c-plain">'+sbEsc(a.eids.map(idEmpName).join(', '))+'</div>':'');
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function waMoves(a){if(!waCanManage())return [];return a.status==='Active'?[{label:'Deactivate',to:'Inactive',need:true}]:[{label:'Activate',to:'Active',need:false}];}
function waActOf(a){return waLogAct&&a&&waLogAct.id===a.id?waLogAct:null;}
function waLogsHTML(a){
  const moves=waMoves(a),act=waActOf(a),opt=!!(act&&!act.need);
  const form=moves.length?'<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+a.status+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('wal-act-'+a.id,a.status,[a.status].concat(moves.map(function(m){return m.label;})),'waLogPick')
    +'<div class="lp-logs-form-label">Note'+(opt?'':' <span class="lp-logs-form-req">*</span>')+'</div>'
    +'<textarea class="lp-logs-form-textarea" id="wal-note" placeholder="'+(opt?'Optional':'Enter note')+'">'+sbEsc(act?act.note||'':'')+'</textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="waLogCancel()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="waLogSubmit('+a.id+')">Submit</button></div></div>':'';
  return lpLogsView(a.logs||[],form,{select:true,current:a.status,open:act?act.label:undefined,isBack:function(v){return /^Deactivate/.test(v);}});
}
function waLogPick(val,csid){
  const id=Number(String(csid||'').replace(/^wal-act-/,'')),a=waRec(id);if(!a||!val)return;
  const cur=waActOf(a);if(cur&&cur.label===val)return;
  const m=waMoves(a).find(function(x){return x.label===val;});if(!m)return;
  const ta=document.getElementById('wal-note');waLogAct=Object.assign({id:id,note:ta?ta.value:(cur?cur.note:'')},m);isbTab('wa',waPanelHTML);
}
function waLogCancel(){if(waLogAct){waLogAct=null;isbTab('wa',waPanelHTML);}}
function waLogSubmit(id){
  const a=waRec(id),act=waActOf(a);
  if(!a||!act){showToast('Pick an action','error','Choose Deactivate or Activate first.');return;}
  const ta=document.getElementById('wal-note'),note=String(ta?ta.value:act.note||'').trim().replace(/[.\s]+$/,'');
  if(act.need&&!note){if(ta)ta.classList.add('is-invalid');showToast('Note is required','error','Write a note for '+act.label+'.');return;}
  const A=caNow();a.status=act.to;a.updatedBy=caN(A.who);a.updatedIso=A.iso;
  ccLog(a,a.status,(act.to==='Active'?'Activated: the '+wbTypeName(a.wallet)+' wallet reaches these employees again.':'Deactivated: the '+wbTypeName(a.wallet)+' wallet no longer reaches these employees through this entry.')+(note?' Note: '+note+'.':''),A);
  waLogAct=null;waSave();renderADTPage();
  showToast('Access '+(act.to==='Active'?'activated':'deactivated'),'success',waKey(a)+' · '+wbTypeName(a.wallet)+' · '+waTargetLabel(a)+' is '+a.status+'.');
}

/* ── Add / Edit ────────────────────────────────────────────────────────── */
function waStart(){
  if(!waCanManage()){if(typeof wbDeny==='function')wbDeny('give wallet access');return;}
  waForm={id:null,wallet:'',by:'',targets:[],scope:'All',eids:[]};renderADTPage();
}
function waStartEdit(id){const a=waRec(id);if(!a||!waCanManage())return;waForm={id:a.id,wallet:a.wallet,by:a.by,targets:a.targets.slice(),scope:a.scope,eids:a.eids.slice()};renderADTPage();}
function waCancel(){waForm=null;renderADTPage();}
function waSync(){
  if(!waForm)return;
  const w=getCSValue('wa-f-wallet');if(w){const code=waWallets().find(function(c){return wbTypeName(c)===w;});if(code)waForm.wallet=code;}
  const by=getCSValue('wa-f-by');if(by&&by!==waForm.by){waForm.by=by;waForm.targets=[];waForm.eids=[];}
  if(document.getElementById('msw-wa-f-targets'))waForm.targets=getMSValue('wa-f-targets');
  const sc=getCSValue('wa-f-scope');if(sc)waForm.scope=sc==='Select employees'?'Selected':'All';
  if(document.getElementById('msw-wa-f-eids')){const pool=waPool();const picked=getMSValue('wa-f-eids');waForm.eids=pool.filter(function(e){return picked.indexOf(waEmpLabel(e))>=0;}).map(function(e){return e.eid;});}
  /* People who no longer match the branches or departments picked drop out. */
  const ok=waPool().map(function(e){return e.eid;});waForm.eids=waForm.eids.filter(function(x){return ok.indexOf(x)>=0;});
}
function waEmpLabel(e){return e.name+' · '+(e.empId||'');}
function waPool(){
  if(!waForm||!waForm.by||!waForm.targets.length)return [];
  const f=waEmpField(waForm.by);
  return wbEmployees().filter(function(e){return waForm.targets.indexOf(e[f]||'')>=0;}).sort(function(a,b){return a.name.localeCompare(b.name);});
}
function waHook(){waSync();if(typeof formRepaintParts==='function'&&formRepaintParts(waFormHTML(),['wa-f-grid']))return;renderADTPage();}
function waFieldsHTML(){
  const f=waForm,pool=waPool();
  const fld=function(label,html,full,hint){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+' <span class="req">*</span></label>'+html+(hint?'<div class="ea-hint">'+hint+'</div>':'')+'</div>';};
  let h=fld('Wallet',apCS('wa-f-wallet',waWallets().map(wbTypeName),f.wallet?wbTypeName(f.wallet):'','Select wallet','waHook'))
    +fld('Access By',apCS('wa-f-by',['Branch','Department'],f.by,'Select Branch or Department','waHook'));
  if(f.by){
    const opts=waTargetsOf(f.by);
    h+=fld(f.by==='Branch'?'Branches':'Departments',apMS('wa-f-targets',opts,f.targets,f.by==='Branch'?'Select branches':'Select departments','waHook'),false,
        opts.length?'':'No '+(f.by==='Branch'?'branch':'department')+' is set up in Company Structure.')
      +fld('Employees',apCS('wa-f-scope',['All employees','Select employees'],f.scope==='Selected'?'Select employees':'All employees','Select','waHook'),false,
        f.targets.length?(f.scope==='All'?'Everyone in the '+(f.by==='Branch'?'branches':'departments')+' picked: '+pool.length+' employee'+(pool.length===1?'':'s')+' now, and people who join them later.':''):'');
    if(f.scope==='Selected')
      h+=fld('Select Employees',apMS('wa-f-eids',pool.map(waEmpLabel),pool.filter(function(e){return f.eids.indexOf(e.eid)>=0;}).map(waEmpLabel),f.targets.length?'Select employees':'Pick the '+(f.by==='Branch'?'branches':'departments')+' first','waHook'),true,
        f.targets.length?f.eids.length+' of '+pool.length+' selected':'');
  }
  return h;
}
function waFormHTML(){
  const edit=waForm.id!=null;
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(edit?'Edit Wallet Access':'Give Wallet Access')+'</span><button class="ct-modal-close" onclick="waCancel()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">Choose the wallet, then who gets it: by branch or by department, and all of their employees or the ones you pick. The amount comes from Benefit Policies. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid" id="wa-f-grid">'+waFieldsHTML()+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="waCancel()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="waSubmit()">'+(edit?'Save':'Submit')+'</button></div></div>'
    +'</div></div>';
}
function waSubmit(){
  waSync();const f=waForm;if(!f)return;
  if(!f.wallet){showToast('Wallet is required','error','Pick the wallet to give.');return;}
  if(!f.by){showToast('Access By is required','error','Choose Branch or Department.');return;}
  if(!f.targets.length){showToast((f.by==='Branch'?'Branches':'Departments')+' required','error','Pick at least one '+(f.by==='Branch'?'branch':'department')+'.');return;}
  if(f.scope==='Selected'&&!f.eids.length){showToast('Select employees','error','Pick at least one employee, or choose All employees.');return;}
  const A=caNow();let a;
  const what=wbTypeName(f.wallet)+' · '+f.by+': '+f.targets.join(', ')+' · '+(f.scope==='All'?'all employees':f.eids.length+' selected');
  if(f.id!=null){
    a=waRec(f.id);if(!a)return;
    Object.assign(a,{wallet:f.wallet,by:f.by,targets:f.targets.slice(),scope:f.scope,eids:f.scope==='All'?[]:f.eids.slice(),updatedBy:caN(A.who),updatedIso:A.iso});
    ccLog(a,a.status,'Updated: '+what+'.',A);
  }else{
    a={id:++wbAccessSeq,entity:wbEntity(),wallet:f.wallet,by:f.by,targets:f.targets.slice(),scope:f.scope,eids:f.scope==='All'?[]:f.eids.slice(),status:'Active',
       createdBy:caN(A.who),createdIso:A.iso,updatedBy:caN(A.who),updatedIso:A.iso,logs:[]};
    ccLog(a,'Active','Created: '+what+'.',A);wbAccess.push(a);
  }
  waForm=null;waSel=a.id;waTab='employees';waSave();renderADTPage();
  showToast(f.id!=null?'Wallet access saved':'Wallet access given','success',waKey(a)+' · '+wbTypeName(a.wallet)+' reaches '+waPeople(a).length+' employee'+(waPeople(a).length===1?'':'s')+'.');
}
function waSave(){if(typeof emsClearCache==='function')emsClearCache();if(typeof presSaveSoon==='function')presSaveSoon();}

/* ── Presentation: Nova Retail keeps everyone's wallets, through real entries, added once ── */
function waSeedNova(){
  if(wbAccessSeeded||typeof PRES_ON==='undefined'||!PRES_ON||typeof presNova!=='function')return;
  if(typeof presBuilding!=='undefined'&&presBuilding)return;
  const n=presNova();if(!n)return;
  const ent=n.entityId||n.id;
  if(typeof idEntity==='function'&&idEntity()!==ent)return;   // seeded while Nova is the company on screen (its branches and departments)
  const today=typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);
  const day=function(k){return typeof wbAddDays==='function'?wbAddDays(today,k):today;};
  const have=waWallets(),br=typeof emsBranchNames==='function'?emsBranchNames(ent):[],dp=wbDepts();
  const plan=[['MEAL','Branch',br,-30,'10:05:12 AM'],['FUEL','Branch',br,-30,'10:09:47 AM'],['TEL','Department',dp,-29,'11:20:03 AM'],['GIFT','Department',dp,-29,'11:26:40 AM']];
  plan.forEach(function(x){
    if(have.indexOf(x[0])<0||!x[2].length)return;
    const iso=day(x[3]);
    const a={id:++wbAccessSeq,entity:ent,wallet:x[0],by:x[1],targets:x[2].slice(),scope:'All',eids:[],status:'Active',createdBy:'Karan Shah',createdIso:iso,updatedBy:'Karan Shah',updatedIso:iso,logs:[]};
    a.logs.unshift({date:cdLabel(iso),time:x[4],user:'Karan Shah',status:'Active',action:'Created: '+wbTypeName(x[0])+' · '+x[1]+': '+x[2].join(', ')+' · all employees.'});
    wbAccess.push(a);
  });
  wbAccessSeeded=true;waSave();
}

(function(){
  /* The rule: no entitlement, and no wallet on the card, without access. */
  if(typeof wbResolve==='function'){
    const r0=wbResolve;
    wbResolve=function(emp,cat){
      const w=typeof wbWalletOf==='function'?wbWalletOf(cat):null;
      if(w&&emp&&!waHasAccess(emp,w.type))return null;
      return r0.apply(this,arguments);
    };
  }
  if(typeof ccCardWallets==='function'){
    const c0=ccCardWallets;
    ccCardWallets=function(c){
      const out=c0.apply(this,arguments);if(!c||!c.employeeEid||typeof idEmp!=='function')return out;
      const e=idEmp(c.employeeEid);if(!e)return out;
      return out.filter(function(code){return waHasAccess(e,code,c.entity||e.entityId);});
    };
  }
  /* The tab, beside Wallets and Benefit Policies. */
  if(typeof wbPrimaryTabs==='function'){
    const t0=wbPrimaryTabs;
    wbPrimaryTabs=function(){const t=t0.apply(this,arguments);if(waCanView()&&!t.some(function(x){return x.id==='access';}))t.push({id:'access',label:'Employees'});return t;};
  }
  if(typeof buildWalletBenefitsHTML==='function'){
    const b0=buildWalletBenefitsHTML;
    buildWalletBenefitsHTML=function(){
      if(typeof wbTab==='undefined'||wbTab!=='access')return b0.apply(this,arguments);
      if(!waCanView()){wbTab='wallets';return b0.apply(this,arguments);}
      wbLastPrimary='access';
      const prim=wbPrimaryTabs(),man=typeof wbManageItems==='function'?wbManageItems():[];
      const head='<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0">'+buildModuleTabsHTML(prim,'access','wbPrimary',true)+'</div>'
        +(man.length?'<div class="adv-set-actions"><button class="btn btn-outline btn-sm" id="wb-manage-btn" onclick="wbManageClick()">Manage <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button></div>':'')+'</div>';
      return '<div class="mod-page">'+head+waListHTML()+'</div>';
    };
  }
  if(typeof wbStartAdd==='function'){
    const s0=wbStartAdd;
    wbStartAdd=function(){if(typeof wbTab!=='undefined'&&wbTab==='access'){waStart();return;}return s0.apply(this,arguments);};
  }
  if(typeof wbSetTab==='function'){
    const st0=wbSetTab;
    wbSetTab=function(t){if(t!=='access'){waForm=null;waSel=null;waLogAct=null;}return st0.apply(this,arguments);};
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!=='wallet-benefits'){waForm=null;waSel=null;waLogAct=null;}return n0.apply(this,arguments);};
  }
  window.addEventListener('load',function(){
    if(typeof PRES_READY!=='undefined'&&PRES_READY&&PRES_READY.then)PRES_READY.then(function(){waSeedNova();if(typeof page!=='undefined'&&page==='wallet-benefits'&&typeof renderADTPage==='function')renderADTPage();});
  });
})();
