/* ══ WALLET & BENEFITS → EMPLOYEES: WHO GETS A WALLET (product owner, 12 Nov 2026) ═══════════════════════════════
   Each wallet's ☰ panel has an Employees tab (product owner: "keep it as a tab inside the action button", not a tab at the
   top). An entry gives the wallet (Meal, Fuel, Telecom, Gift, Health) to people chosen by Branch or Department - several
   at once - and then all of their members or the ones picked, or to employees one by one (Individual). Corporate Expense and Reimbursement are company money, not perks, and are not offered.
   - Access only: the people an entry reaches have the wallet on their card and get its benefit loads; the amount still
     comes from Benefit Policies. A wallet with no entry at all is open to everyone, as before; once a wallet has an
     entry, only the people its Active entries reach have it.
   - An entry is deactivated (or activated again) in its Logs, with a note; Edit changes it.
   - In the presentation, Nova Retail starts with entries that keep everyone's wallets (Meal and Fuel by branch,
     Telecom and Gift by department), added once. */
let wbAccess=[];          // {id, entity, wallet, by:'Branch'|'Department', targets:[], scope:'All'|'Selected', eids:[], status, createdBy, createdIso, updatedBy, updatedIso, logs}
let wbAccessSeq=1000;
let wbAccessSeeded=false;
let waForm=null;
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
  if(a.by==='Individual')return a.eids.indexOf(emp.eid)>=0;
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

/* ── The wallet's Employees tab (its ☰ panel) ────────────────────────────
   Who has the wallet: the people added to it, and the entries they were added by. Super Admin and Company Admin add
   people by Branch, by Department (all of their members, or the ones picked) or one by one (Individual, with Select
   all); an entry is removed, or restored, from its row. Every change is written to the wallet's Logs. */
function waCanAdd(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;}
function waWalletLog(type,text){
  const w=wbMine(wbWallets).find(function(x){return x.type===type;});if(!w)return;
  if(typeof wbSeedLogs==='function')wbSeedLogs('w',w);
  ccLog(w,w.status,text);
}
function waWhoLabel(a){return a.by==='Individual'?a.eids.map(idEmpName).join(', '):a.targets.join(', ');}
function waMembersLabel(a){return a.by==='Individual'?a.eids.length+' employee'+(a.eids.length===1?'':'s'):(a.scope==='All'?'All members':a.eids.length+' selected');}
function waWalletTabHTML(w){
  const type=w.type,entries=waHere().filter(function(a){return a.wallet===type;}).sort(function(a,b){return (a.status===b.status?0:a.status==='Active'?-1:1)||a.id-b.id;});
  const people=wbEmployees().filter(function(e){return waHasAccess(e,type);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  const can=waCanAdd(),open=waForm&&waForm.wallet===type;
  let h='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Employees · '+sbEsc(wbTypeName(type))+'</span><span class="ax-count">'+people.length+'</span>'
    +(can&&!open?'<button class="lp-sb-view-edit-btn" onclick="waStart(\''+type+'\')">'+AX_ICO.plus+' Add Employees</button>':'')+'</div>';
  if(open)h+=axInlineFormHTML('<div class="ep-form-grid" id="wa-f-grid" style="grid-column:1/-1">'+waFieldsHTML()+'</div>','waCancel()','waSubmit()').replace('>Save changes<','>Add Employees<');
  if(!entries.length)h+='<div class="ea-hint" style="margin:0 0 10px">No one has been added yet, so every employee has this wallet. Adding employees here limits it to them.</div>';
  else h+='<div class="att-table-wrap csag-table-wrap" style="margin-bottom:14px"><table class="att-table csag-table"><thead><tr><th>Added By</th><th>Who</th><th>Members</th><th>Status</th>'+(can?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
    +entries.map(function(a){
      return '<tr><td class="csag-td">'+a.by+'</td><td class="csag-td" title="'+attrSafe(waWhoLabel(a))+'">'+sbEsc(waWhoLabel(a))+'</td><td class="csag-td">'+waMembersLabel(a)+' <span class="wb-muted">('+waPeople(a).length+')</span></td>'
        +'<td class="csag-td">'+axBadge(statusTone(a.status),a.status)+'</td>'
        +(can?'<td class="csag-td csag-act">'+(a.status==='Active'
          ?'<button class="att-row-btn is-danger" title="Remove" onclick="waToggle('+a.id+')">'+AX_ICO.trash+'</button>'
          :'<button class="att-link" onclick="waToggle('+a.id+')">Restore</button>')+'</td>':'')+'</tr>';
    }).join('')+'</tbody></table></div>';
  h+='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Has this wallet</span><span class="ax-count">'+people.length+'</span></div>'
    +(people.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>S. No</th><th>Name</th><th>Employee ID</th><th>Department</th><th>Branch</th></tr></thead><tbody>'
      +people.map(function(e,i){return '<tr><td class="csag-td">'+(i+1)+'</td><td class="csag-td">'+sbEsc(e.name)+'</td><td class="csag-td">'+sbEsc(e.empId||'')+'</td><td class="csag-td">'+sbEsc(e.dept||'—')+'</td><td class="csag-td">'+sbEsc(e.branch||'—')+'</td></tr>';}).join('')
      +'</tbody></table></div>':'<div class="wb-empty-sm">No employee has this wallet.</div>');
  return h;
}
function waToggle(id){
  const a=waRec(id);if(!a||!waCanAdd())return;
  const A=caNow();a.status=a.status==='Active'?'Inactive':'Active';a.updatedBy=caN(A.who);a.updatedIso=A.iso;
  const txt=(a.status==='Active'?'Restored':'Removed')+': '+a.by+' · '+waWhoLabel(a)+' · '+waMembersLabel(a)+'.';
  ccLog(a,a.status,txt,A);waWalletLog(a.wallet,'Employees '+txt.charAt(0).toLowerCase()+txt.slice(1));
  waSave();renderADTPage();
  showToast(a.status==='Active'?'Employees restored':'Employees removed','success',wbTypeName(a.wallet)+' · '+waWhoLabel(a)+'.');
}

/* ── Add Employees (inside the wallet's Employees tab) ─────────────────── */
function waStart(type){
  if(!waCanAdd()){if(typeof wbDeny==='function')wbDeny('add employees to a wallet');return;}
  waForm={id:null,wallet:type,by:'',targets:[],scope:'All',eids:[]};renderADTPage();
}
function waCancel(){waForm=null;renderADTPage();}
function waSync(){
  if(!waForm)return;
  const by=getCSValue('wa-f-by');if(by&&by!==waForm.by){waForm.by=by;waForm.targets=[];waForm.eids=[];waForm.scope=by==='Individual'?'Selected':'All';}
  if(document.getElementById('msw-wa-f-targets'))waForm.targets=getMSValue('wa-f-targets');
  const sc=getCSValue('wa-f-scope');if(sc&&waForm.by!=='Individual')waForm.scope=sc==='Select members'?'Selected':'All';
  if(document.getElementById('msw-wa-f-eids')){const pool=waPool(),picked=getMSValue('wa-f-eids');waForm.eids=pool.filter(function(e){return picked.indexOf(waEmpLabel(e))>=0;}).map(function(e){return e.eid;});}
  const ok=waPool().map(function(e){return e.eid;});waForm.eids=waForm.eids.filter(function(x){return ok.indexOf(x)>=0;});
}
function waEmpLabel(e){return e.name+' · '+(e.empId||'')+(e.dept?' · '+e.dept:'');}
function waPool(){
  if(!waForm||!waForm.by)return [];
  if(waForm.by==='Individual')return wbEmployees().slice().sort(function(a,b){return a.name.localeCompare(b.name);});
  if(!waForm.targets.length)return [];
  const f=waEmpField(waForm.by);
  return wbEmployees().filter(function(e){return waForm.targets.indexOf(e[f]||'')>=0;}).sort(function(a,b){return a.name.localeCompare(b.name);});
}
function waRepaint(){
  const w=waForm?wbMine(wbWallets).find(function(x){return x.type===waForm.wallet;}):null;
  if(w&&typeof formRepaintParts==='function'&&formRepaintParts(waWalletTabHTML(w),['wa-f-grid']))return;
  renderADTPage();
}
function waHook(){waSync();waRepaint();}
/* Select all: every option of a multi-select at once. */
function waSelectAll(id){
  waSync();if(!waForm)return;
  if(id==='wa-f-targets')waForm.targets=waTargetsOf(waForm.by).slice();
  else waForm.eids=waPool().map(function(e){return e.eid;});
  waRepaint();
}
function waFieldsHTML(){
  const f=waForm,pool=waPool();
  const all=function(id){return ' <a class="att-link" style="margin-left:6px;font-weight:500;cursor:pointer" onclick="waSelectAll(\''+id+'\')">Select all</a>';};
  const fld=function(label,html,hint,extra){return '<div class="ep-form-group ep-form-full"><label class="ep-form-label">'+label+' <span class="req">*</span>'+(extra||'')+'</label>'+html+(hint?'<div class="ea-hint">'+hint+'</div>':'')+'</div>';};
  let h=fld('Add By',apCS('wa-f-by',['Branch','Department','Individual'],f.by,'Select Branch, Department or Individual','waHook'));
  if(f.by==='Branch'||f.by==='Department'){
    const opts=waTargetsOf(f.by);
    h+=fld(f.by==='Branch'?'Branches':'Departments',apMS('wa-f-targets',opts,f.targets,f.by==='Branch'?'Select branches':'Select departments','waHook'),
        opts.length?'':'No '+(f.by==='Branch'?'branch':'department')+' is set up in Company Structure.',opts.length?all('wa-f-targets'):'')
      +fld('Members',apCS('wa-f-scope',['All members','Select members'],f.scope==='Selected'?'Select members':'All members','Select','waHook'),
        f.targets.length?(f.scope==='All'?'Everyone in the '+(f.by==='Branch'?'branches':'departments')+' picked: '+pool.length+' now, and people who join them later.':''):'');
    if(f.scope==='Selected')h+=fld('Select Members',apMS('wa-f-eids',pool.map(waEmpLabel),pool.filter(function(e){return f.eids.indexOf(e.eid)>=0;}).map(waEmpLabel),
        f.targets.length?'Select members':'Pick the '+(f.by==='Branch'?'branches':'departments')+' first','waHook'),f.targets.length?f.eids.length+' of '+pool.length+' selected':'',pool.length?all('wa-f-eids'):'');
  }else if(f.by==='Individual'){
    h+=fld('Employees',apMS('wa-f-eids',pool.map(waEmpLabel),pool.filter(function(e){return f.eids.indexOf(e.eid)>=0;}).map(waEmpLabel),'Search and select employees','waHook'),
      f.eids.length+' of '+pool.length+' selected',all('wa-f-eids'));
  }
  return h;
}
function waSubmit(){
  waSync();const f=waForm;if(!f)return;
  if(!f.by){showToast('Add By is required','error','Choose Branch, Department or Individual.');return;}
  if(f.by!=='Individual'&&!f.targets.length){showToast((f.by==='Branch'?'Branches':'Departments')+' required','error','Pick at least one '+(f.by==='Branch'?'branch':'department')+'.');return;}
  if((f.by==='Individual'||f.scope==='Selected')&&!f.eids.length){showToast('Select employees','error','Pick at least one employee'+(f.by==='Individual'?'.':', or choose All members.'));return;}
  const A=caNow();
  const a={id:++wbAccessSeq,entity:wbEntity(),wallet:f.wallet,by:f.by,targets:f.by==='Individual'?[]:f.targets.slice(),scope:f.by==='Individual'?'Selected':f.scope,
    eids:f.by!=='Individual'&&f.scope==='All'?[]:f.eids.slice(),status:'Active',createdBy:caN(A.who),createdIso:A.iso,updatedBy:caN(A.who),updatedIso:A.iso,logs:[]};
  const txt='Added: '+a.by+' · '+waWhoLabel(a)+' · '+waMembersLabel(a)+'.';
  ccLog(a,'Active',txt,A);wbAccess.push(a);waWalletLog(a.wallet,'Employees '+txt.charAt(0).toLowerCase()+txt.slice(1));
  waForm=null;waSave();renderADTPage();
  showToast('Employees added','success',wbTypeName(a.wallet)+' · '+waPeople(a).length+' employee'+(waPeople(a).length===1?'':'s')+' added.');
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
  /* The wallet's ☰ panel gets an Employees tab, before its Logs. */
  if(typeof wbTabsFor==='function'){
    const tf=wbTabsFor;
    wbTabsFor=function(kind){
      const t=tf.apply(this,arguments);if(kind!=='w'||t.some(function(x){return x.id==='employees';}))return t;
      const i=t.findIndex(function(x){return x.id==='logs';});const add={id:'employees',label:'Employees'};
      return i<0?t.concat([add]):t.slice(0,i).concat([add],t.slice(i));
    };
  }
  if(typeof WB_PANEL!=='undefined'&&typeof WB_PANEL.w==='function'){
    const pw=WB_PANEL.w;
    WB_PANEL.w=function(r,tab){if(tab==='employees')return waWalletTabHTML(r);return pw.apply(this,arguments);};
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!=='wallet-benefits')waForm=null;return n0.apply(this,arguments);};
  }
  window.addEventListener('load',function(){
    if(typeof PRES_READY!=='undefined'&&PRES_READY&&PRES_READY.then)PRES_READY.then(function(){waSeedNova();if(typeof page!=='undefined'&&page==='wallet-benefits'&&typeof renderADTPage==='function')renderADTPage();});
  });
})();
