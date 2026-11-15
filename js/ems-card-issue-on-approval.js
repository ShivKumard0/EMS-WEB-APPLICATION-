/* ══ AN APPROVED NEW CARD IS ACTIVE AT ONCE (product owner, 15 Nov 2026) ═══════════════════════════════════════════
   "once it gets approved the card in the mobile should also get activated."
   When a New Card or Replacement request someone raised has its final approval (Ritu, then Rohan - or Karan in their
   place), the provider steps that follow are recorded at that moment, the presentation's own way (Illustrative:
   nothing reaches RBL Bank): the enrollment is submitted, KYC verified, the card issued with a NEW number (the market
   standard after a lost or stolen card: a new card number, expiry and CVV) and activated. The card is then Active on
   the web (My Cards, Card List) and on the phone. Every step is the engine's own (js/cards.js ccEnrSubmit,
   ccOutcomeRecord) and is written to the request's and the card's Logs as usual.
   - Recorded by the final approver when they may record enrollment events, otherwise by the company admin.
   - Automatic benefit cards (issued without a request) keep their own flow: an administrator submits the enrollment.
   Only in the presentation company. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  const admin=function(){return ((typeof idUserByEmail==='function'&&idUserByEmail('karan.shah@opendhi.in'))||{}).userId||'';};
  const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
  /* A new number: the last four digits, not the same as any card the employee holds or held. */
  const newLast4=function(r){
    const used=(typeof ccCardsOfEmp==='function'?ccCardsOfEmp(r.employeeEid):[]).map(function(c){return String(c.last4||'');});
    let n=(Number(r.id)*7919+4821)%10000;
    for(let i=0;i<20;i++){const v=('0000'+n).slice(-4);if(used.indexOf(v)<0&&v!=='0000')return v;n=(n+1237)%10000;}
    return ('0000'+n).slice(-4);
  };
  function issue(r,A){
    if(building()||!r||!nova()||r.entity!==nova()||r.mode==='Automatic')return '';
    if(typeof ccDemoOn==='function'&&!ccDemoOn(r.entity))return '';
    if(typeof ccReqTrack!=='function'||ccReqTrack(r)!=='Enrollment Pending'||!r.enr||r.enr.status!=='Pending')return '';
    const base=A||ccNow();
    let B=Object.assign({},base);
    if(!(ccPCan(B,'card.demo.simulate')&&ccPCan(B,'card.enrollment.manage')))B=Object.assign({},base,{who:admin(),actual:''});
    const step=function(e){return e&&(e.error||(typeof e==='string'?e:''));};
    let err=ccEnrSubmit(r.id,{ref:'',note:'Submitted on approval'},B);if(err)return err;
    if(r.enr&&r.enr.kyc&&['Verified','Not Required'].indexOf(r.enr.kyc)<0){err=step(ccOutcomeRecord('kyc',r.id,{value:'Verified',source:CC_DEMO,note:'On approval'},B));if(err)return err;}
    const c=typeof ccCardOfReq==='function'?ccCardOfReq(r):null;if(!c)return 'No card record after the enrollment.';
    if(c.status==='Issuance Pending'){err=step(ccOutcomeRecord('issuance',c.id,{value:'Issued',source:CC_DEMO,last4:newLast4(r),note:'On approval'},B));if(err)return err;}
    if(c.type==='Physical'&&c.status==='Issued'){
      ['Dispatched','Delivered'].forEach(function(v){if(!err)err=step(ccOutcomeRecord('dispatch',c.id,{value:v,source:CC_DEMO,note:'On approval'},B));});
      if(err)return err;
    }
    if(c.status==='Activation Pending'){err=step(ccOutcomeRecord('activation',c.id,{value:'Confirmed',source:CC_DEMO,note:'On approval'},B));if(err)return err;}
    if(typeof presSaveSoon==='function')presSaveSoon();
    return '';
  }
  ['ccReqOnFinal','ccRepOnFinal'].forEach(function(n){
    if(typeof window[n]!=='function')return;
    const f0=window[n];
    window[n]=function(r,A){
      const out=f0.apply(this,arguments);
      try{const e=issue(r,A);if(e&&window.console)console.warn('[card on approval]',e);}catch(e){if(window.console)console.warn('[card on approval]',e);}
      return out;
    };
  });
  /* Once, for a new card approved before this rule (product owner: "i have already approved from the web so make the
     sync"): a request approved after the employee's lost or stolen card was disabled, still waiting at Enrollment
     Pending, is issued and activated the same way - so it reaches the phone too. Other approved requests are left as
     they are. */
  const afterLost=function(r){
    return typeof ccCardsOfEmp==='function'&&ccCardsOfEmp(r.employeeEid).some(function(c){
      return c.programmeId===r.programmeId&&c.status==='Closed'&&(c.csr||[]).some(function(x){return x.kind==='lost';});});
  };
  function backfill(){
    const ent=nova();if(!ent||typeof ccRequests==='undefined'||typeof entitiesData==='undefined')return 0;
    const n=entitiesData.find(function(e){return e.entityId===ent;});if(!n)return 0;
    const due=ccRequests.filter(function(r){
      return r.entity===ent&&(r.kind==='card request'||r.kind==='card replacement')&&r.mode!=='Automatic'&&r.status==='Approved'
        &&ccReqTrack(r)==='Enrollment Pending'&&r.enr&&r.enr.status==='Pending'&&afterLost(r);});
    if(!due.length)return 0;
    const was=seSelectedEntity;seSelectedEntity=n.id;if(typeof emsClearCache==='function')emsClearCache();
    let done=0;
    try{
      const A=Object.assign({},ccNow(),{who:admin(),actual:''});
      due.forEach(function(r){const e=issue(r,A);if(e){if(window.console)console.warn('[card on approval]',expKey(r),e);}else done++;});
    }finally{seSelectedEntity=was;if(typeof emsClearCache==='function')emsClearCache();}
    if(done&&typeof presSaveSoon==='function')presSaveSoon();
    return done;
  }
  window.emsCardIssueBackfill=backfill;
  Promise.resolve(window.PRES_READY).then(function(){try{backfill();}catch(e){if(window.console)console.warn('[card on approval]',e);}});
})();
