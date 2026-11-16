/* Employee status in the client company: KYC, then Onboarding, then Active (product owner, 16 Nov 2026).
   "When I create an employee, or for an existing employee, from the outside or from the Logs: first I will complete
   KYC, then mark the status Onboarding with comments; after Onboarding I can make the employee Active through the
   outside itself or with Logs. In the outside don't show any other options."
   In the presentation's client company, once its data is prepared:
   - A Pending employee is marked Onboarding only when their KYC is complete (details filled, declarations ticked),
     and a comment is required.
   - An employee in Onboarding can be marked Active, with a comment, from the list or from the Logs.
   - The Action menu in the list shows just that one next step: Onboarding for Pending, Active for Onboarding.
     The Logs tab keeps the other onboarding steps for whoever wants them.
   Other companies, Active / Offboarding / Inactive employees and everything outside Employees are unchanged. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof empLogOptionsBase!=='function'||typeof empJourneyItems!=='function'||typeof empState!=='function')return;
  const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
  const client=function(){try{const n=typeof presNova==='function'?presNova():null;return n?(n.entityId||''):'';}catch(e){return '';}};
  const applies=function(emp){
    if(!emp||building())return false;
    const c=client();if(!c)return false;
    return (emp.entityId||(typeof idEntity==='function'?idEntity():''))===c&&(typeof idEntity!=='function'||idEntity()===c);
  };
  const kycReady=function(emp){
    try{const r=typeof oncRec==='function'?oncRec(emp.eid):null;return !!r&&typeof oncStatus==='function'&&oncStatus(emp,r)==='Ready for Card Enrollment';}catch(e){return true;}
  };
  const say=function(t,s){if(typeof empFail==='function')empFail(t,s);else if(typeof showToast==='function')showToast(t,'error',s);};
  const KYC_T='Complete KYC first';
  const kycWhy=function(emp){return 'Fill in '+emp.name+'\'s KYC details and tick the declarations (KYC tab), then mark Onboarding.';};

  /* what can be logged */
  const b0=empLogOptionsBase;
  empLogOptionsBase=function(emp,st){
    const out=b0.apply(this,arguments);
    if(!applies(emp)||!st)return out;
    if(st.status==='Pending')return ['onboarding'];
    if(st.phase==='onb'&&out.indexOf('mark-active')<0)return ['mark-active'].concat(out);
    return out;
  };
  if(typeof empStepWhyNot==='function'){
    const w0=empStepWhyNot;
    empStepWhyNot=function(emp,k){
      const r=w0.apply(this,arguments);
      if(!applies(emp))return r;
      if(k==='mark-active'&&r)return 'Available once the employee is in Onboarding.';
      return r;
    };
  }
  /* the Action menu in the list: the one next step */
  const j0=empJourneyItems;
  empJourneyItems=function(emp){
    if(!applies(emp))return j0.apply(this,arguments);
    const st=empState(emp),can=function(k){return typeof empRoleCan!=='function'||empRoleCan(k);};
    if(st.status==='Pending')return [{key:'onboarding',label:'Onboarding',state:can('onboarding')?'next':'wait'}];
    if(st.phase==='onb')return [{key:'mark-active',label:'Active',state:can('mark-active')?'next':'wait'}];
    return j0.apply(this,arguments);
  };
  /* Onboarding needs the KYC, and a comment */
  const needsKyc=function(emp,k){return k==='onboarding'&&applies(emp)&&empState(emp).status==='Pending'&&!kycReady(emp);};
  if(typeof empOpenLogModal==='function'){
    const o0=empOpenLogModal;
    empOpenLogModal=function(kind,id,key){
      const emp=typeof empFind==='function'?empFind(kind,id):null;
      if(emp&&needsKyc(emp,key)){
        document.querySelectorAll('.ct-action-menu').forEach(function(m){m.classList.remove('open');});
        say(KYC_T,kycWhy(emp));return;
      }
      return o0.apply(this,arguments);
    };
  }
  if(typeof empCommitLog==='function'){
    const c0=empCommitLog;
    empCommitLog=function(pk){
      const emp=typeof empPkRec==='function'?empPkRec(pk):null,k=typeof empFormType!=='undefined'?empFormType[pk]:'';
      if(emp&&applies(emp)&&(k==='onboarding'||k==='mark-active')){
        if(needsKyc(emp,k)){say(KYC_T,kycWhy(emp));return;}
        const inp=document.getElementById(pk+'-log-comment-inp');
        if(inp&&!inp.value.trim()){
          inp.classList.add('is-invalid');setTimeout(function(){inp.classList.remove('is-invalid');},1600);
          say('Comment is required','Add a comment to mark '+emp.name+' '+(k==='onboarding'?'Onboarding':'Active')+'.');return;
        }
      }
      return c0.apply(this,arguments);
    };
  }
})();
