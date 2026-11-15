/* ══ THE COMPANY ADMIN DECIDES EVERY APPROVAL STEP (product owner, 15 Nov 2026) ═══════════════════════════════════
   "karan can do all the approvals on any behalf, and all the approvals will be manager and finance admin only, karan
   can do the finance step as well."
   In the presentation company every approval route is Manager → Finance. The Company Admin (and the Super Admin) may
   decide any step of any request in the approver's place - an audited intervention, as before: the engine still asks
   for a comment and records it as decided in that approver's place. What changes: for card and budget approvals the
   engine also required the person stepping in to hold the step's own role (Finance/Billing Admin for the Finance step),
   which kept Karan from the Finance step of a card request; in the presentation company that requirement no longer
   applies to the Company Admin and the Super Admin, as it already did not for card loads (js/card-load-flow.js).
   Everyone else - Ritu, Rohan, employees - keeps today's rules; other companies are unchanged. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof caCanIntervene!=='function'||typeof caFitKind!=='function')return;
  const inCompany=function(r){const e=typeof emsMfEnt==='function'?emsMfEnt():'';return !!e&&!!r&&r.entity===e;};
  const admin=function(){const r=typeof emsRole==='function'?emsRole():'';return r==='Company Admin'||r==='Super Admin';};
  const c0=caCanIntervene;
  caCanIntervene=function(r,who){
    if(!inCompany(r)||!caFitKind(r)||!admin())return c0.apply(this,arguments);
    /* The engine's own intervention rule, without the stage's role requirement. */
    who=who||caMe();
    if(who!==caMe()||!caCan(caPk(r,'intervene')))return false;
    const st=caActiveStage(r);if(!st||st.approvers.indexOf(who)>=0||caSoD(r,who))return false;
    const open=st.lineIds.some(function(id){return !caStageResult(st,r.lines.find(function(l){return l.id===id;}));});
    if(st.rule==='All'&&st.approvers.length>1)return open&&caUndecided(st).length>0;
    return open;
  };
})();
