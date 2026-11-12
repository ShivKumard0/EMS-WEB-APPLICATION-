/* ══ RBAC TEMPLATES IN A CLIENT COMPANY (product owner, 12 Nov 2026) ═════════════════════════════════════════════
   "in rbac templates fill all the top details according to whatever we require in the expense management system".
   In a client company (Nova Retail) RBAC → Templates:
   - lists the expense-system templates first - Expenses, Advances, Budgets, Cards, Benefits - then the rest (all of
     them stay; the product owner chose "EMS templates first");
   - Applied To names who in this company gets the template: its teams (RBAC → Workspaces, e.g. Expense Approver →
     Expense Review Team) and its roles under this company's role names (e.g. Finance Admin Access →
     Finance/Billing Admin); "Not applied" when nobody here has it.
   The platform company keeps its list and its role names. Templates themselves are unchanged. */
(function(){
  const EMS_FIRST=['Expenses','Advances','Budgets','Cards','Benefits'];
  const client=function(){return typeof emsClientOnly==='function'&&emsClientOnly();};
  /* The Expense Management Team's designation templates come first of all (product owner, 12 Nov 2026). */
  const rank=function(t){if(t.emsDesig)return -1;const i=EMS_FIRST.indexOf(t.module);return i<0?EMS_FIRST.length:i;};
  /* Who in this company the template reaches: its teams, then the company's roles that carry it. */
  function rbAppliedHere(t){
    const ent=idEntity(),out=[];
    /* A designation template: the Expense Management Team's members who hold that designation. */
    if(t.emsDesig){
      (typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).forEach(function(w){
        if(w.status==='Deleted'||w.entityId!==ent)return;
        (w.teams||[]).forEach(function(x){
          if(x.name!==(t.emsTeam||'Expense Management Team'))return;
          const who=x.members.filter(function(u){const d=(x.desig||{})[u]||'';return d===t.emsDesig||d.indexOf(t.emsDesig+' ')===0;}).map(idName);   // Approver 1, 2, 3 hold the Approver template
          out.push(x.name+(who.length?': '+who.join(', '):''));
        });
      });
    }
    (typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).forEach(function(w){
      if(w.status==='Deleted'||w.entityId!==ent)return;
      (w.teams||[]).forEach(function(x){if(x.tpl===t.id&&out.indexOf(x.name)<0)out.push(x.name);});
    });
    if(typeof EMS_ROLE_SOURCE!=='undefined'&&typeof idUsersIn==='function'&&typeof idRolesOf==='function'){
      const held={};idUsersIn(ent).forEach(function(u){idRolesOf(u.userId,ent).forEach(function(r){held[r]=1;});});
      Object.keys(EMS_ROLE_SOURCE).forEach(function(k){
        const s=EMS_ROLE_SOURCE[k];
        if(!s.rb.some(function(r){return t.roles.indexOf(r)>=0;}))return;
        s.cs.forEach(function(r){if(held[r]&&out.indexOf(r)<0)out.push(r);});
      });
    }
    return out;
  }
  window.rbAppliedHere=rbAppliedHere;
  /* Render with each template's Applied To read as this company's teams and roles; the records are put back after. */
  function asHere(f){return function(){
    if(!client()||typeof rbacTemplatesData==='undefined')return f.apply(this,arguments);
    /* Descriptions name the teams as this company calls them (the presentation's renamed approval teams). */
    const ren=typeof PRES_TEAM_NAMES!=='undefined'?PRES_TEAM_NAMES:{};
    const keep=rbacTemplatesData.map(function(t){return [t,t.roles,t.desc];});
    rbacTemplatesData.forEach(function(t){
      t.roles=rbAppliedHere(t);
      if(typeof t.desc==='string')Object.keys(ren).forEach(function(k){t.desc=t.desc.split(k+' workspace team').join(ren[k]).split(k).join(ren[k]);});
    });
    try{return f.apply(this,arguments);}finally{keep.forEach(function(k){k[0].roles=k[1];k[0].desc=k[2];});}
  };}
  if(typeof buildRbacTemplatesHTML==='function')buildRbacTemplatesHTML=asHere(buildRbacTemplatesHTML);
  if(typeof renderRbSidebar==='function')renderRbSidebar=asHere(renderRbSidebar);
  /* The expense-system templates first (a stable order: within a module, as before). */
  if(typeof rbRows==='function'){
    const r0=rbRows;
    rbRows=function(){
      const rows=r0.apply(this,arguments);if(!client())return rows;
      return rows.map(function(t,i){return [t,i];}).sort(function(a,b){return rank(a[0])-rank(b[0])||a[1]-b[1];}).map(function(x){return x[0];});
    };
  }
})();
