/* ══ EVERY APPROVAL: MANAGER, THEN FINANCE (product owner, 13 Nov 2026) ═══════════════════════════════════════════
   "For all the approval flow first keep manager and then finance." In the presentation company (Nova Retail) every
   approval route has a claim's two steps:
     1 · Manager review - the reporting manager of the person the request is for;
     2 · Finance review - the Finance/Billing Admin (Rohan Mehta), any one.
   Karan, the company admin, is each step's fallback. That covers claims, advances, imprest, budgets and their
   revisions, transfers, exceptions and year close, card requests, replacements, control changes, programme controls,
   card loads and bulk card files. Each changed route gets a new version with this reason. A request already submitted
   keeps the route it was submitted under (the engine's rule); everything raised from now on follows these. Routes an
   administrator adds or edits later are left as they are.
   No manager (product owner, same day: "skip it, straight to Finance"): when the person a request is for has no
   reporting manager on their employee record - Karan himself - that request leaves the Manager step out and goes
   straight to Finance; its log says why. Presentation company only: every other company keeps its routes and rules. */
const EMS_MF_REASON='Manager then Finance for every approval (product owner, 13 Nov 2026)';
function emsMfEnt(){const n=typeof presNova==='function'?presNova():null;return n?(n.entityId||n.id):'';}

/* ── 1 · The routes ── */
function emsRoutesMgrFin(){
  const ent=emsMfEnt();if(!ent||typeof caWorkflows==='undefined'||typeof caStageDef!=='function')return 0;
  const uid=function(e){return (typeof idUserByEmail==='function'?idUserByEmail(e)||{}:{}).userId||'';};
  const ks=uid('karan.shah@opendhi.in'),ai=uid('ananya.iyer@opendhi.in');
  /* Finance's fallback: Karan; on the budget routes Ananya Iyer (Budget Committee), because a budget step never goes to
     someone who approved an earlier one - when Rohan raises a budget item himself, Karan has approved it as his manager. */
  const fb=function(w){return /^(Budget|Financial Year Close)/.test(caWfKindOf(w))&&ai?ai:ks;};
  const at=typeof stampNow==='function'?(function(){const s=stampNow();return s.date+' | '+s.time;})():'';
  let n=0;
  caWorkflows.forEach(function(w){
    if(w.entity!==ent)return;
    /* Every step has a fallback (product owner, 13 Nov 2026: "anything I submit from Company Admin should get
       submitted no matter what"): a step nobody else can take - the manager has no approval right, there is no one in
       the role - goes to Karan instead of stopping the submission. Once per route. */
    if(!w.mfFb2){(w.stages||[]).forEach(function(s){if(!s.fallback)s.fallback=ks;});w.mfFb2=true;}
    if(w.mfAll){   // done before this fallback rule: set it once
      if(!w.mfFb){const s=(w.stages||[]).find(function(x){return x.name==='Finance review'&&x.type==='Role';});if(s)s.fallback=fb(w);w.mfFb=true;}
      return;
    }
    const st=(w.stages||[]).filter(function(s){return s.active!==false;});
    const same=st.length===2&&st[0].type==='Reporting Manager'&&st[1].type==='Role'&&st[1].ref==='Finance/Billing Admin';
    w.mfAll=true;w.mfFb=true;w.mgrFin=true;   // done once per route (mgrFin: js/card-load-flow.js leaves it alone too)
    if(same)return;
    w.stages=[caStageDef(1,'Manager review','Reporting Manager','',{fallback:ks}),caStageDef(2,'Finance review','Role','Finance/Billing Admin',{rule:'Any One',fallback:fb(w)})];
    w.name=caWfKindOf(w)+' - Manager then Finance';w.desc=caWfKindOf(w)+': the reporting manager, then Finance.';
    w.independent=false;w.version=(w.version||1)+1;
    (w.versions=w.versions||[]).push({v:w.version,at:at,by:ks,reason:EMS_MF_REASON,stages:JSON.parse(JSON.stringify(w.stages))});
    n++;
  });
  return n;
}

/* ── 2 · No reporting manager: straight to Finance ── */
function emsMfNoManager(r){
  const ent=emsMfEnt();if(!r||!ent)return false;
  if((r.entity||(typeof caEntity==='function'?caEntity():''))!==ent)return false;
  return !(typeof caManagerEidOf==='function'&&caManagerEidOf(r.employeeEid));
}
/* The route as this request uses it: the same route with its Manager step switched off, when it has other steps. */
function emsMfTrim(rt,r){
  if(!rt||!rt.wf||typeof caActiveDefs!=='function'||!emsMfNoManager(r))return rt;
  const act=caActiveDefs(rt.wf),mgr=function(s){return s.type==='Reporting Manager';};
  if(!act.some(mgr)||act.every(mgr))return rt;
  const wf=Object.assign({},rt.wf,{stages:rt.wf.stages.map(function(s){return mgr(s)?Object.assign({},s,{active:false}):s;}),mfSkipped:true});
  return Object.assign({},rt,{wf:wf});
}
/* ── 3 · The Company Admin shows the whole flow (product owner, 13 Nov 2026: "anything I submit from Company Admin it
   should get submitted no matter what, and I can show the approval flow from Company Admin as well") ──
   In the presentation company Karan, the Company Admin, is never ruled out as an approver: not for a request he raised
   or submitted himself, not as an earlier step's approver. So he is a valid fallback for any step, and may decide any
   step himself - as the step's approver or in another approver's place - logged under his name. Everyone else keeps
   the rule that whoever raises a request does not approve it; every other company is unchanged. */
function emsMfAdmin(){return (typeof idUserByEmail==='function'?idUserByEmail('karan.shah@opendhi.in')||{}:{}).userId||'';}
function emsMfAdminFree(r,who){
  const ent=emsMfEnt(),ks=emsMfAdmin();
  if(!r||!ent||!ks||(who&&who!==ks))return false;
  return (r.entity||(typeof caEntity==='function'?caEntity():''))===ent;
}
(function(){
  if(typeof caExcluded==='function'){
    const x0=caExcluded;
    caExcluded=function(r){const out=x0.apply(this,arguments);if(!emsMfAdminFree(r))return out;const ks=emsMfAdmin();return out.filter(function(u){return u!==ks;});};
  }
  if(typeof caSoD==='function'){
    const s0=caSoD;
    caSoD=function(r,who){return emsMfAdminFree(r,who||(typeof caMe==='function'?caMe():''))?'':s0.apply(this,arguments);};
  }
  if(typeof caActorBlock==='function'){
    const b0=caActorBlock;
    caActorBlock=function(r,who){return emsMfAdminFree(r,who||(typeof caMe==='function'?caMe():''))?'':b0.apply(this,arguments);};
  }
})();
(function(){
  /* Every request type finds its route through one of these (the engine's own hooks call them by name). */
  ['caRoute','advRoute','bgRoute','ccRoute'].forEach(function(n){
    const f0=window[n];if(typeof f0!=='function')return;
    window[n]=function(r){return emsMfTrim(f0.apply(this,arguments),r);};
  });
  if(typeof caStart==='function'){
    const s0=caStart;
    caStart=function(r,pre){
      const out=s0.apply(this,arguments);
      if(out&&pre&&pre.wf&&pre.wf.mfSkipped&&r&&r.wf&&typeof caLog==='function')
        caLog(r,r.status,'No reporting manager on '+(r.name||'the requester')+'\'s employee record: the Manager review step is skipped and the request goes straight to Finance.');
      return out;
    };
  }
  /* The routes, once the presentation data is in place (built or restored). */
  if(typeof window!=='undefined')Promise.resolve(window.PRES_READY).then(function(){try{emsRoutesMgrFin();}catch(e){if(typeof console!=='undefined')console.warn('manager then finance routes',e);}});
})();
