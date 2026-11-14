/* ══ NOVA RETAIL: RITU SEN IS THE MANAGER FOR EVERYONE (product owner, 14 Nov 2026) ══════════════════════════════
   "Ritu is the manager for everyone": in the presentation company the Manager review step of every approval route is
   Ritu Sen, whoever raises the request and whoever it is for - claims, advances, card loads and every other route that
   has a Manager review step. Finance review stays the Finance/Billing Admin (Rohan Mehta).
   - The step keeps its name (Manager review), so the lists still read Pending Manager Approval · Ritu Sen (Manager).
   - A request Ritu raises herself cannot be approved by her: the step goes to its fallback, Karan.
   - Karan still decides any step in someone else's place, with a comment, as before. The checks on a request are
     unchanged.
   - Only the approval routes change: employee records (each person's reporting manager) and who sees whose cards stay
     as they are. Requests already submitted keep the route they were submitted under. Every other company is unchanged.
   Applied once per route, after the routes are set up (js/card-load-flow.js, js/ems-routes-mgr-fin.js); each changed
   route gets a new version with this reason. */
(function(){
  const REASON='Ritu Sen is the manager for every request (product owner, 14 Nov 2026)';
  function apply(){
    const ent=typeof emsMfEnt==='function'?emsMfEnt():'';
    if(!ent||typeof caWorkflows==='undefined'||typeof idUserByEmail!=='function')return 0;
    const uid=function(e){return (idUserByEmail(e)||{}).userId||'';};
    const rs=uid('ritu.sen@novaretail.in'),ks=uid('karan.shah@novaretail.in');
    if(!rs)return 0;
    const at=typeof stampNow==='function'?(function(){const s=stampNow();return s.date+' | '+s.time;})():'';
    let n=0;
    caWorkflows.forEach(function(w){
      if(w.entity!==ent||w.mfRitu)return;
      w.mfRitu=true;
      const st=(w.stages||[]).find(function(s){return s.type==='Reporting Manager';});
      if(!st)return;
      st.type='Specific User';st.ref=rs;st.rule='Any One';
      if(!st.fallback)st.fallback=ks;
      w.version=(w.version||1)+1;
      (w.versions=w.versions||[]).push({v:w.version,at:at,by:ks,reason:REASON,stages:JSON.parse(JSON.stringify(w.stages))});
      n++;
    });
    return n;
  }
  /* Card loads need the card-load approval right, which Ritu does not hold: she joins the Nova team whose template grants
     it (Card Approval Team, "Card Approver"), once, as any member would be added in RBAC → Workspaces - so the change
     is visible there and can be undone there. Through that template she also sees all cards and card reports. */
  function rightToApproveLoads(){
    const ent=typeof emsMfEnt==='function'?emsMfEnt():'';
    if(!ent||typeof rbacWorkspacesData==='undefined'||typeof wsTpl!=='function')return false;
    const rs=(idUserByEmail('ritu.sen@novaretail.in')||{}).userId;if(!rs)return false;
    const w=rbacWorkspacesData.find(function(x){return x.entityId===ent&&x.status!=='Deleted';});
    if(!w||w.mfRituLoads)return false;
    w.mfRituLoads=true;
    const grants=function(t){const tp=wsTpl(t);return !!tp&&(tp.perms||[]).indexOf('card.load.approve')>=0;};
    const teams=(w.teams||[]).filter(grants);
    if(!teams.length||teams.some(function(t){return t.members.indexOf(rs)>=0;}))return false;
    const t=teams.find(function(x){return /Card Approval/i.test(x.name);})||teams[0];
    t.members.push(rs);
    if(typeof emsClearCache==='function')emsClearCache();
    if(typeof wsNote==='function')wsNote(w,'Ritu Sen added to '+t.name+': she approves card loads as the manager for every request (product owner, 14 Nov 2026).');
    return true;
  }
  window.emsRituManager=apply;
  if(typeof window!=='undefined')Promise.resolve(window.PRES_READY).then(function(){
    try{apply();rightToApproveLoads();}catch(e){if(typeof console!=='undefined')console.warn('Ritu as manager',e);}
  });
})();
