/* ══ NO BUDGET CHECK ON REQUESTS (product owner, 13 Nov 2026) ══════════════════════════════════════════════════════
   "Remove budget check - don't keep this validation or don't show it for anyone", "no justification required", "just
   allow for everything". In the presentation company Budget Control is switched off, once: claims, advances and card
   requests are no longer checked against budgets - no Budget check box, no Budget Justification, nothing warned or
   blocked, no budget lines in their logs. Budgets, allocations, funding and everything already counted against a
   budget are unchanged; requests raised from now on are not counted against one. The switch is recorded in Funding &
   Budgets → Settings (where it could be turned on again). Every other company keeps its own setting. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  function emsBudgetCheckOff(){
    const n=typeof presNova==='function'?presNova():null;if(!n||typeof bgCfg!=='function')return;
    const c=bgCfg(n.entityId||n.id);
    if(c.noCheckDone)return;   // once: a later choice in Settings stands
    c.noCheckDone=true;
    if(!c.control)return;
    c.control=false;
    const s=typeof stampNow==='function'?stampNow():{date:'',time:''},ks=typeof idUserByEmail==='function'?idUserByEmail('karan.shah@novaretail.in'):null;
    (c.logs=c.logs||[]).unshift({date:s.date,time:s.time,user:ks?caN(ks.userId):'Karan Shah',userId:ks?ks.userId:'',
      action:'Budget Control: On → Off. Reason: Requests are not checked against budgets - no budget check or justification on claims, advances or card requests.'});
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  Promise.resolve(window.PRES_READY).then(function(){try{emsBudgetCheckOff();}catch(e){if(typeof console!=='undefined')console.warn('budget check off',e);}});
})();
