/* ══ EXPENSES & ADVANCES: SUBSTATUS COLUMN (product owner, 15 Nov 2026) ═════════════════════════════════════════════
   "In the Expenses & Advances listing, please add a Substatus column next to the existing Status column.
     Status: Approved   | Substatus: Fully Approved     - all line items approved in full.
     Status: Approved   | Substatus: Partially Approved - at least one line item is rejected or approved for a
                                                          reduced amount.
     Status: Reimbursed | Substatus: Partially Approved - a partially approved claim has been reimbursed.
   The substatus should be automatically derived from the existing claim and line-item statuses. Please retain the
   current Status mapping and Pending At functionality."
   Display only: nothing is stored. A request that reads Approved, Reimbursed or Disbursed gets Fully Approved or
   Partially Approved from its own approval status and line items; Pending and Rejected rows have no substatus.
   "also add some sample rows, 1 or 2, in between": two claims, raised and decided through the approval engine itself
   (one line rejected; one line reduced and then reimbursed), once, placed among the existing rows.
   In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof eaRowHTML!=='function'||typeof eaListHTML!=='function')return;

  /* ── 1 · The substatus of a row ── */
  function sub(x){
    if(!x||['Approved','Reimbursed','Disbursed'].indexOf(x.flow)<0)return '';
    const r=x.r||{},L=r.lines||[];
    const partial=r.status==='Partially Approved'
      ||L.some(function(l){return l.status==='Rejected'||l.status==='Partially Approved'||(l.approved!=null&&Number(l.approved)<Number(l.amount));})
      ||(x.appr!=null&&Number(x.appr)<Number(x.req));
    return partial?'Partially Approved':'Fully Approved';
  }
  window.eaSubstatus=sub;

  /* ── 2 · The column, right after Status ── */
  const h0=eaRowHTML;
  eaRowHTML=function(x){
    const out=h0.apply(this,arguments);
    const tb=document.createElement('tbody');tb.innerHTML=out;const tr=tb.firstElementChild;if(!tr||tr.children.length<7)return out;
    const s=sub(x),td=document.createElement('td');td.className='ea-c-sub';
    /* A pill, like Status (product owner, 15 Nov 2026: "substatus also show as status pills"). */
    td.innerHTML=s?(typeof axBadge==='function'?axBadge(s==='Fully Approved'?'ok':'info',s):s):'';
    tr.insertBefore(td,tr.children[6]);
    return tr.outerHTML;
  };
  const l0=eaListHTML;
  eaListHTML=function(){
    let out=l0.apply(this,arguments);
    if(out.indexOf('<th>Substatus</th>')<0)out=out.replace('<th>Status</th>','<th>Status</th><th>Substatus</th>');
    /* An empty list's message spans the new column too. */
    return out.replace(/(<td[^>]*colspan=")(\d+)("[^>]*>)/g,function(m,a,n,b){return a+(Number(n)+1)+b;});
  };
  (function(){
    if(document.getElementById('ea-sub-style'))return;
    const st=document.createElement('style');st.id='ea-sub-style';
    st.textContent='.ea-c-sub{white-space:nowrap}';
    (document.head||document.documentElement).appendChild(st);
  })();

  /* ── 3 · Two sample claims, once ── */
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  const uid=function(email){return ((typeof idUserByEmail==='function'&&idUserByEmail(email))||{}).userId||'';};
  const empOf=function(email){return (typeof idEmpAll==='function'?idEmpAll():[]).find(function(e){return String(e.email).toLowerCase()===email;})||null;};
  const dayBack=function(n){const t=(typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10)).split('-');
    const d=new Date(Date.UTC(+t[0],+t[1]-1,+t[2])-n*86400000);return d.toISOString().slice(0,10);};
  const SAMPLES=[
    {key:'ss-1',email:'meghna.pillai@opendhi.in',pay:false,lines:[
      {title:'Cab to client office - Hinjewadi',amount:1240,back:5,merchant:'CityRide Cabs',decision:'Approve'},
      {title:'Cab to airport - weekend',amount:980,back:4,merchant:'CityRide Cabs',decision:'Reject',reason:'Personal trip on a weekend - not business travel.'}]},
    {key:'ss-2',email:'aditya.shah@opendhi.in',pay:true,lines:[
      {title:'Train to Mysuru - vendor audit',amount:1460,back:7,merchant:'IRCTC',decision:'Approve'},
      {title:'Cab from Mysuru station to vendor site',amount:1200,back:7,merchant:'Namma Cabs',decision:'Partially Approve',approved:800,reason:'Fare is above the policy rate for the distance - approved at the standard rate.'}]}];
  function line(l){
    const cols={};(typeof EXP_CUSTOM_COLS!=='undefined'?EXP_CUSTOM_COLS:[]).forEach(function(c){cols[c]='';});
    return {title:l.title,amount:String(l.amount),category:'Travel & Transport',subCat:'One Way',start:dayBack(l.back),end:dayBack(l.back),proof:'receipt.pdf',proofUrl:'',comments:'',
      cols:cols,paidBy:'Employee',merchant:l.merchant,invoice:'',advanceId:'',advAmount:'',cardId:'',cardAmount:''};
  }
  function make(s){
    const e=empOf(s.email);if(!e)return 'no employee '+s.email;
    const lines=s.lines.map(line),n0=expensesData.length;
    expDraft={title:s.lines[0].title+' + 1 more',claimFor:'Self',eid:e.eid,name:e.name,category:lines[0].category,currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'',
      just:{},dupJust:'',costCentreId:'',projectId:'',bgJust:'',lines:lines.slice(0,-1),line:lines[lines.length-1]};
    expModalOpen=false;
    /* The claim is the employee's own (Self): filed as that employee for this one call, then back to whoever is signed in. */
    const me=uid(s.email);if(!me)return 'no account '+s.email;
    const was=[idSessionUser,idAuthUser];
    window.emsNoConfirm=true;
    try{idSessionUser=me;idAuthUser=me;submitAddExpense(true);}finally{idSessionUser=was[0];idAuthUser=was[1];window.emsNoConfirm=false;}
    if(expensesData.length===n0)return 'not accepted: '+lastT;
    const r=expensesData[0];r.sampleKey=s.key;
    /* Each step's own approver decides: the first on the line items, the rest approve what is left. */
    let first=true,g=0;
    while(r.wf&&r.wf.open&&g++<6){
      const st=caActiveStage(r);if(!st||!st.approvers.length)return 'no approver';
      const A=Object.assign({},caNow(),{who:st.approvers[0],actual:''});
      let err;
      if(first){
        const lx={};r.lines.forEach(function(l,i){const d=s.lines[i];lx[l.id]={decision:d.decision,reason:d.reason||'',amount:d.approved!=null?String(d.approved):''};});
        err=caDecide(r.id,{scope:'lines',lines:lx,comment:'Reviewed against the travel policy.'},A);first=false;
      }else err=caDecide(r.id,{scope:'claim',decision:'Approve',comment:'Verified.'},A);
      if(err)return String(err.error||err);
    }
    if(s.pay&&r.pay&&r.pay.status==='Ready for Payment'){
      const A=Object.assign({},caNow(),{who:uid('rohan.mehta@opendhi.in'),actual:''});
      const src=(typeof fbSources!=='undefined'?fbSources:[]).find(function(f){return f.entity===r.entity&&f.status==='Active';});
      let err=caPaySetRoute(r.id,'Manual/External Payment','',A,src?src.id:undefined);
      if(!err)err=caPaySettle(r.id,{amount:String(caOutstanding(r)),date:typeof wbToday==='function'?wbToday():'',source:'Illustrative'},A);
      if(err)return String(err.error||err);
    }
    return '';
  }
  /* Among the rows that were there: the sample takes the time of an existing row a few places down the list. */
  function place(r,ts){
    if(!ts)return;
    const d=new Date(ts+1000),M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],p=function(n){return (n<10?'0':'')+n;};
    let h=d.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;
    const date=p(d.getDate())+' '+M[d.getMonth()]+' '+d.getFullYear(),time=p(h)+':'+p(d.getMinutes())+':'+p(d.getSeconds())+' '+ap;
    const set=function(L){(L||[]).forEach(function(l){l.date=date;l.time=time;});};
    set(r.logs);(r.lines||[]).forEach(function(l){set(l.logs);});
    r.createdAt=date+' | '+time;r.appliedOn=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  let tried=false,lastT='';
  function seed(){
    if(tried)return;
    if(typeof presBuilding!=='undefined'&&presBuilding)return;
    const ent=nova();if(!ent||typeof idEntity!=='function'||idEntity()!==ent)return;
    if(typeof emsRole!=='function'||['Company Admin','Super Admin'].indexOf(emsRole())<0)return;
    if(typeof expensesData==='undefined'||typeof submitAddExpense!=='function'||typeof caDecide!=='function')return;
    tried=true;
    const due=SAMPLES.filter(function(s){return !expensesData.some(function(r){return r.sampleKey===s.key;});});
    if(!due.length)return;
    const old=eaRows().map(function(x){return eaTs(x);}).filter(Boolean).sort(function(a,b){return b-a;});
    const T0=window.showToast,keep={draft:typeof expDraft!=='undefined'?expDraft:null,modal:typeof expModalOpen!=='undefined'?expModalOpen:false};
    window.showToast=function(a,b,c){lastT=String(a||'')+(c?' - '+c:'');};
    try{
      due.forEach(function(s,i){
        let err='';
        try{err=make(s);}catch(e){err=e.message;}
        const r=expensesData.find(function(x){return x.sampleKey===s.key;});
        if(err&&window.console)console.warn('[substatus sample]',s.key,err);
        if(r)place(r,old[Math.min(old.length-1,2+i*2)]);
      });
    }finally{window.showToast=T0;try{expDraft=keep.draft;expModalOpen=keep.modal;}catch(e){}}
    if(typeof emsClearCache==='function')emsClearCache();
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  window.eaSubstatusSeed=seed;
  if(typeof renderADTPage==='function'){
    const r0=renderADTPage;let busy=false;
    renderADTPage=function(){
      if(!busy&&!tried&&window.__presReady){busy=true;try{seed();}catch(e){if(window.console)console.warn('[substatus sample]',e);}busy=false;}
      return r0.apply(this,arguments);
    };
  }
  Promise.resolve(window.PRES_READY).then(function(){window.__presReady=true;try{seed();}catch(e){if(window.console)console.warn('[substatus sample]',e);}});
})();
