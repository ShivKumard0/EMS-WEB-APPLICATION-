/* ══ BRANCHES - company branches for employees and benefit policies ══════
   (FR-WB-01, product owner decision 9 Nov 2026.)
   - Branch master: Company Settings → Company Structure → Branch, per
     company (the existing list, js/attendance-settings.js), now with a code.
   - An EMS client company picks an employee's branch from its own active
     branches (add, edit, bulk upload); other companies keep the work-location
     list they have today.
   - Benefit policies gain a Branch level. Priority:
     Employee > Designation > Department > Branch > Entity; overrides beat all. */

/* ── Branch master: a code per branch ──────────────────────────────────── */
(function(){
  const f0=csBranchFormHTML;
  csBranchFormHTML=function(){
    const out=f0.apply(this,arguments);
    const at=out.indexOf('<div class="lp-sb-field"><label>Status</label>');
    if(at<0||!csBrDraft)return out;
    const code=csAttGroup('Branch Code','<input type="text" class="ep-form-input" id="csa-br-code" value="'+attrSafe(csBrDraft.code||'')+'" placeholder="e.g. NR-BLR" oninput="csBrOnChange()">');
    return out.slice(0,at)+code+out.slice(at);
  };
  const s0=csBrSave;
  csBrSave=function(){
    const el=document.getElementById('csa-br-code');
    if(el&&csBrDraft)csBrDraft.code=el.value.trim().toUpperCase();
    return s0.apply(this,arguments);
  };
  const l0=csBranchListHTML;
  csBranchListHTML=function(){
    let out=l0.apply(this,arguments);
    (csAtt.locations||[]).forEach(function(l){
      if(!l.code)return;
      const a='<div class="lp-c-main">'+attrSafe(l.name)+'</div>';
      out=out.replace(a,a+'<div class="lp-c-sub">'+attrSafe(l.code)+'</div>');
    });
    return out;
  };
})();

/* ── The branches of a company ─────────────────────────────────────────── */
function emsBranchBook(ent){
  ent=ent||idEntity();
  if(typeof csAttEnt!=='undefined'&&csAttEnt===ent)return csAtt;
  if(typeof csAttBook==='undefined')return null;
  return csAttBook[ent]||(csAttBook[ent]=csAttClone(CS_ATT_DEFAULTS));
}
function emsBranches(ent){const b=emsBranchBook(ent);return b&&b.locations?b.locations.filter(function(l){return (l.status||'Active')==='Active';}):[];}
function emsBranchNames(ent){return emsBranches(ent).map(function(l){return l.name;});}
/* An EMS client company with branches uses them; others keep today's list. */
function emsUsesBranches(){return typeof emsClientOnly==='function'&&emsClientOnly()&&emsBranchNames().length>0;}
function emsBranchOpts(){return emsUsesBranches()?emsBranchNames():EA_LOCATIONS;}
(function(){
  /* Add Employee and the employee profile: the Work Location field is the branch. */
  const fix=function(f){
    if(!f||f.k!=='location')return;
    const lab=f.label;
    Object.defineProperty(f,'opts',{configurable:true,get:function(){return f.opts0Fn?emsBranchOpts():emsBranchOpts();}});
    Object.defineProperty(f,'label',{configurable:true,get:function(){return emsUsesBranches()?'Branch':lab;}});
  };
  if(typeof EA_STEPS!=='undefined')EA_STEPS.forEach(function(st){(st.fields||[]).forEach(fix);});
  if(typeof EP_FIELDS!=='undefined')EP_FIELDS.forEach(function(f){
    if(f.k!=='location')return;
    const lab=f.label;
    f.opts=function(){return emsBranchOpts();};
    Object.defineProperty(f,'label',{configurable:true,get:function(){return emsUsesBranches()?'Branch':lab;}});
  });
  /* Bulk upload validates the Work Location column against the same list. */
  if(typeof embLists==='function'){const e0=embLists;embLists=function(){const L=e0.apply(this,arguments);if(emsUsesBranches())L.location=emsBranchNames();return L;};}
})();

/* ── Benefit policies: Branch level ────────────────────────────────────── */
(function(){
  if(typeof WB_SCOPES==='undefined')return;
  if(WB_SCOPES.indexOf('Branch')<0)WB_SCOPES.splice(1,0,'Branch');
  WB_SCOPE_RANK.Employee=5;WB_SCOPE_RANK.Designation=4;WB_SCOPE_RANK.Department=3;WB_SCOPE_RANK.Branch=2;WB_SCOPE_RANK.Entity=1;
  const i0=wbEmpInfo;
  wbEmpInfo=function(e){const o=i0.apply(this,arguments);if(o&&e)o.branch=e.branch||'';return o;};
  const h0=wbScopeHit;
  wbScopeHit=function(v,emp){return v.scope==='Branch'?!!emp&&emp.branch===v.scopeRef:h0.apply(this,arguments);};
})();
function wbBranches(){return emsBranchNames(wbEntity());}
