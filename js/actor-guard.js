/* ══ Actual-actor safeguard (product decision of 8 Nov 2026 on B8-N25) ═══════════════════════════════════════════
   Through Switch User one authenticated person (the ACTUAL ACTOR) works as another (the SELECTED USER). Every rule
   that already requires independence is checked against both:
     - the shared approval engine, for every request type: the maker (creator, submitter, preparer), the beneficiary,
       a second decision in the same stage, and earlier stages where the route requires different decision-makers
       (Card and Budget routes, through their existing exclusion rules);
     - the existing maker-checker verifications outside the engine (advance disbursement and recovery, funding
       entries). Card, statement and transaction verifications (Builds 7-8) already compare the actual actor.
       Rejecting one's own evidence is not a verification and stays allowed (Build 7 test 7C-15).
   Nothing else changes: routes, stages, amounts, Build 4/5 Super Admin intervention and reassignment, and the
   Card/Budget stage-fit rules stay exactly as finalized. Decisions keep recording the selected user (who) and the
   actual actor (actual). This is a front-end guard; production enforcement against authenticated identities is a
   server-side requirement (BE-02). */

/* The authenticated person behind `who`: differs only for the selected user of a switched session. */
function caActualFor(who){return who&&typeof idSwitched==='function'&&idSwitched()&&typeof caMe==='function'&&who===caMe()?idAuthMe():who;}
function caActualOf(A){return (A&&typeof caVia==='function'&&caVia(A))||(A&&A.who)||'';}
/* The actual people who made a request through Switch User (recorded when it is submitted or prepared). */
function caMakerActuals(r){return (r&&r.makerActuals)||[];}
function caNoteMaker(r,u){if(!r||!u||u==='System')return;r.makerActuals=r.makerActuals||[];if(r.makerActuals.indexOf(u)<0)r.makerActuals.push(u);}
function caActorLabel(act,who){return act&&who&&act!==who?caN(act)+' (working as '+caN(who)+' through Switch User)':caN(act||who);}

(function(){
  const wrap=function(name,make){const orig=window[name];if(typeof orig!=='function')return;window[name]=make(orig);};

  /* ── Makers: whoever actually created, submitted or prepared a request ── */
  wrap('caStart',function(orig){return function(r,pre,A,o){
    const a=A||caNow();
    if(r&&!(o&&o.migrate)){
      /* First submission: actions recorded through Switch User before it (creation, edits) were the maker's. */
      if(!r.makerActuals)(r.logs||[]).forEach(function(l){if(l&&l.actualUserId)caNoteMaker(r,l.actualUserId);});
      const v=caVia(a);if(v)caNoteMaker(r,v);else if(!r.makerActuals)r.makerActuals=[];
    }
    return orig.apply(this,arguments);
  };});
  wrap('caAddPreparer',function(orig){return function(r,who){
    const out=orig.apply(this,arguments);
    const act=caActualFor(who);if(r&&act&&act!==who)caNoteMaker(r,act);
    return out;
  };});

  /* ── Separation of duties: the selected user and the actual actor ── */
  wrap('caSoD',function(orig){return function(r,who){
    who=who||caMe();
    const base=orig.call(this,r,who);if(base)return base;
    const act=caActualFor(who);
    if(act!==who){const s=orig.call(this,r,act);if(s)return s+', working as '+caN(who)+' through Switch User';}
    if(caMakerActuals(r).indexOf(act)>=0)return caN(act)+' created or submitted this request'+(act!==who?' and is working as '+caN(who)+' through Switch User':' through Switch User');
    return '';
  };});

  /* Excluded from approving: the makers' actual identities, and the actual person behind any earlier decision the
     route already excludes (independent stages on Card and Budget routes). Used when stages are resolved, so a request
     never falls back to its own actual maker. */
  wrap('caExcluded',function(orig){return function(r){
    const out=orig.apply(this,arguments).slice();
    caMakerActuals(r).forEach(function(u){if(out.indexOf(u)<0)out.push(u);});
    if(r&&r.wf&&r.wf.stages)r.wf.stages.forEach(function(st){
      if(st.status!=='Approved')return;
      (st.decisions||[]).forEach(function(d){if(d.void||!d.actual||out.indexOf(d.who)<0)return;if(out.indexOf(d.actual)<0)out.push(d.actual);});
    });
    return out;
  };});

  /* What else stops `who` (worked by `act`) deciding the active stage now: '' when nothing. */
  window.caActorBlock=function(r,who,act){
    if(!r||!who)return '';act=act||who;
    if(act!==who){
      const sod=caSoD(r,who);if(sod)return 'Separation of duties: '+sod+'.';
      /* An earlier stage the route requires to be decided by someone else. */
      const ex=caExcluded(r);
      if(ex.indexOf(act)>=0&&ex.indexOf(who)<0)return 'Separation of duties: '+caN(act)+' decided an earlier stage of this request, and its stages need different approvers; working as '+caN(who)+' through Switch User does not change that.';
    }else if(caMakerActuals(r).indexOf(act)>=0)return 'Separation of duties: '+caN(act)+' created or submitted this request through Switch User.';
    else{
      /* Not switched now, but the same person decided an earlier independent stage as someone else. */
      const ex=caExcluded(r),st0=caActiveStage(r);
      if(st0&&ex.indexOf(act)>=0&&(r.wf.stages||[]).some(function(st){return st.status==='Approved'&&(st.decisions||[]).some(function(d){return !d.void&&d.actual===act;});}))
        return 'Separation of duties: '+caN(act)+' decided an earlier stage of this request through Switch User, and its stages need different approvers.';
    }
    /* One person counts once in a stage, whichever identity they work under. */
    const st=caActiveStage(r);
    if(st&&(st.decisions||[]).some(function(d){return !d.void&&d.decision!=='Follow-Up'&&(d.actual||d.who)===act&&d.who!==who;})){
      const d=st.decisions.find(function(x){return !x.void&&x.decision!=='Follow-Up'&&(x.actual||x.who)===act&&x.who!==who;});
      return 'Separation of duties: '+caN(act)+' already decided Stage '+st.n+' as '+caN(d.who)+'; one person counts once in a stage, also through Switch User.';
    }
    return '';
  };
  wrap('caCanDecide',function(orig){return function(r,who){
    who=who||caMe();
    if(!orig.apply(this,arguments))return false;
    return !caActorBlock(r,who,caActualFor(who));
  };});
  wrap('caCanIntervene',function(orig){return function(r,who){
    who=who||caMe();
    if(!orig.apply(this,arguments))return false;
    return !caActorBlock(r,who,caActualFor(who));
  };});
  wrap('caWhyNotDecide',function(orig){return function(r){
    const who=caMe(),b=r&&r.status==='Awaiting Approval'?caActorBlock(r,who,caActualFor(who)):'';
    return b||orig.apply(this,arguments);
  };});
  wrap('caDecide',function(orig){return function(id,p,A){
    const a=A||caNow(),r=typeof caRec==='function'?caRec(id):null;
    if(r&&r.status==='Awaiting Approval'){const b=caActorBlock(r,a.who,caActualOf(a));if(b)return b;}
    return orig.apply(this,arguments);
  };});

  /* ── Maker-checker outside the engine: the same rules, against the actual actor too ── */
  const viaOf=function(A){return caVia(A||caNow());};
  /* Build 5 advance disbursements: who the funds are for never initiates or verifies; the initiator never verifies. */
  wrap('advDisbInitiate',function(orig){return function(id,o,A){
    A=A||advNow();const v=viaOf(A),r=typeof advEngineRec==='function'?advEngineRec(id):null;
    if(v&&r&&caIsClaimant(r,v))return 'Separation of duties: '+caActorLabel(v,A.who)+' is who the funds are for.';
    const before=r&&r.disb?(r.disb.instructions||[]).length:0;
    const out=orig.call(this,id,o,A);
    if(!out&&v&&r&&r.disb){const list=r.disb.instructions||[];if(list.length>before){const i=list[list.length-1];if(i&&!i.initiatedActual)i.initiatedActual=v;}}
    return out;
  };});
  wrap('advDisbVerify',function(orig){return function(id,key,o,A){
    A=A||advNow();const act=caActualOf(A),r=typeof advEngineRec==='function'?advEngineRec(id):null;
    const i=r&&r.disb?(r.disb.instructions||[]).find(function(x){return x.key===key;}):null;
    if(r&&i&&i.status==='Processing'){
      if(act!==A.who&&caIsClaimant(r,act))return 'Separation of duties: '+caActorLabel(act,A.who)+' is who the funds are for.';
      if(i.mc&&(act===i.initiatedBy||(i.initiatedActual&&(act===i.initiatedActual||A.who===i.initiatedActual))))
        return 'Maker-checker: '+caActorLabel(act,A.who)+' initiated '+i.key+'; another authorised user must verify it.';
    }
    return orig.call(this,id,key,o,A);
  };});
  /* Advance holders: the person who owes the advance never decides on it; a recovery's raiser never approves it. */
  const ownerBlock=function(h,A){const act=caActualOf(A);if(act===A.who||!h)return '';
    const own=h.kind==='fund'?h.custodianEid===(idEmpOfUser(act)||{}).eid:(typeof advOwner==='function'?advOwner(h)===act:caIsClaimant(h,act));
    return own?'Separation of duties: '+caActorLabel(act,A.who)+' owes '+expKey(h)+'.':'';};
  ['advRrVerify','advRecoveryCollect','advReview','advClose'].forEach(function(fn){
    wrap(fn,function(orig){return function(holderId){
      const args=Array.prototype.slice.call(arguments),A=args[orig.length-1]||advNow();args[orig.length-1]=A;
      const b=ownerBlock(typeof advHolder==='function'?advHolder(holderId):null,A);if(b)return b;
      return orig.apply(this,args);
    };});
  });
  wrap('advRecoveryRaise',function(orig){return function(holderId,o,A){
    A=A||advNow();const h=typeof advHolder==='function'?advHolder(holderId):null,b=ownerBlock(h,A);if(b)return b;
    const before=h?(h.returns||[]).slice():[],out=orig.call(this,holderId,o,A),v=caVia(A);
    if(out===''&&h&&v)(h.returns||[]).forEach(function(x){if(before.indexOf(x)<0&&!x.recordedActual)x.recordedActual=v;});
    return out;
  };});
  wrap('advRecoveryDecide',function(orig){return function(holderId,key,decision,remarks,A){
    A=A||advNow();const act=caActualOf(A),h=typeof advHolder==='function'?advHolder(holderId):null;
    const x=h&&typeof advRecFind==='function'?advRecFind(h,key):null;
    if(x&&x.status==='Pending Approval'){
      if((act!==A.who&&act===x.recordedBy)||(x.recordedActual&&(act===x.recordedActual||A.who===x.recordedActual)))
        return 'Maker-checker: '+caActorLabel(act,A.who)+' raised '+x.key+'; someone else must approve it.';
      const b=ownerBlock(h,A);if(b)return b;
    }
    return orig.call(this,holderId,key,decision,remarks,A);
  };});
  wrap('advExtendDue',function(orig){return function(id,date,reason,A){
    A=A||advNow();const act=caActualOf(A),r=typeof advEngineRec==='function'?advEngineRec(id):null;
    if(act!==A.who&&r&&caIsClaimant(r,act))return 'Separation of duties: '+caActorLabel(act,A.who)+' owes the advance.';
    return orig.call(this,id,date,reason,A);
  };});
  /* Build 6 funding entries: under funding maker-checker the recorder never verifies (also not as someone else). */
  const fbStamp=function(orig){return function(){
    const args=Array.prototype.slice.call(arguments),A=args[orig.length-1]||caNow();args[orig.length-1]=A;
    const before=typeof fbTxns!=='undefined'?fbTxns.slice():[],out=orig.apply(this,args),v=caVia(A);
    if(v&&typeof fbTxns!=='undefined')fbTxns.forEach(function(t){if(before.indexOf(t)<0&&!t.recordedActual)t.recordedActual=v;});
    return out;};};
  wrap('fbTxnCreate',fbStamp);wrap('fbTxnReverse',fbStamp);
  wrap('fbTxnVerify',function(orig){return function(id,o,A){
    A=A||caNow();const act=caActualOf(A),t=typeof fbTxns!=='undefined'?fbTxns.find(function(x){return x.id===Number(id);}):null;
    if(t&&t.status==='Pending Verification'&&typeof bgCfg==='function'&&bgCfg(t.entity).fundingMakerChecker&&
       ((act!==A.who&&act===t.recordedBy)||(t.recordedActual&&(act===t.recordedActual||A.who===t.recordedActual))))
      return 'Maker-checker: '+caActorLabel(act,A.who)+' recorded '+t.key+'; another authorized user verifies it.';
    const out=orig.call(this,id,o,A);if(!out&&t&&caVia(A))t.verifiedActual=caVia(A);
    return out;
  };});
})();

/* ══ D8 (product owner, 9 Nov 2026): decisions only by the person actually signed in ═════════════════════════════
   Switch Role (an OpenDhi Super Admin preview, D7) is for viewing and preparing. Approving, verifying, signing off,
   accepting on review and accepting consent are refused through it in every EMS module: the authorized person signs in
   and acts themselves, so maker-checker and separation of duties always rest on authenticated people. The engine
   functions are wrapped once here; screens show the refusal they already show for any other refusal. */
function emsSwitchedNow(A){return A?!!caVia(A):(typeof idSwitched==='function'&&idSwitched());}
function emsDecisionRefusal(A){
  if(!emsSwitchedNow(A))return '';
  const who=A&&A.who?A.who:idMe();
  return 'Not available through Switch Role: approvals, verifications and sign-offs are made by the person signed in. Sign in as '+(typeof caN==='function'?caN(who):idName(who))+' to continue.';
}
(function(){
  /* [function, position of its actor argument (A), how it reports a refusal: 'str' text, 'obj' {error}] */
  const ENGINE=[
    ['caDecide',2,'str'],['caPayVerify',2,'str'],
    ['advDisbVerify',3,'str'],['advRrVerify',3,'str'],['advRecoveryDecide',4,'str'],['advReview',2,'str'],
    ['fbTxnVerify',2,'str'],
    ['ccOutcomeVerify',1,'str'],['ccLoadExecVerify',1,'str'],['ccBulkExecVerify',1,'obj'],['ccTxnVerify',1,'str'],['ccStmtVerify',1,'obj'],
    ['ccCardExtIdVerify',1,'str'],['ccCsxAccept',2,'obj'],['ccCsxRecoveryDecide',4,'str'],['ccCsxCollectVerify',5,'str'],
    ['ccCsxCreditReview',5,'str'],['ccRecAdjustDecide',4,'str'],['ccRecSignoff',2,'str'],['ccRecSupplementVerify',4,'str'],['ccDspVerify',4,'str']
  ];
  ENGINE.forEach(function(x){
    const orig=window[x[0]];if(typeof orig!=='function')return;
    window[x[0]]=function(){
      const A=arguments[x[1]]||(typeof caNow==='function'?caNow():null),why=emsDecisionRefusal(A);
      if(why)return x[2]==='obj'?{error:why}:why;
      return orig.apply(this,arguments);
    };
  });
  /* Screen-level acts without an actor argument: HR review of KYC and profile changes, onboarding document
     acceptance and Verification Completed, and the Wallet & Benefits allocation and tax-threshold approvals. */
  const deny=function(){showToast('Not available through Switch Role','error','Approvals, verifications and sign-offs are made by the person signed in. Sign in as '+idMeName()+' to continue.');};
  const UI=['oncReview','epReview','empDocAccept'];
  UI.forEach(function(n){const orig=window[n];if(typeof orig!=='function')return;window[n]=function(){if(emsSwitchedNow()){deny();return false;}return orig.apply(this,arguments);};});
  if(typeof empCommitLog==='function'){const o=empCommitLog;window.empCommitLog=function(pk){
    if(emsSwitchedNow()&&typeof empLogModal!=='undefined'&&empLogModal&&typeof empFind==='function'&&typeof empNextStep==='function'){
      const e=empFind(empLogModal.kind,empLogModal.id),n=e?empNextStep(e):null;if(n&&n.key==='verified'){deny();return;}}
    return o.apply(this,arguments);};}
  if(typeof wbCommitLog==='function'){const o=wbCommitLog;window.wbCommitLog=function(kind,id){
    if(emsSwitchedNow()&&(kind==='a'||kind==='t')&&['Approved','Rejected'].indexOf(getCSValue('wb'+kind+'-log-status-sel'))>=0){deny();return false;}
    return o.apply(this,arguments);};}
})();
