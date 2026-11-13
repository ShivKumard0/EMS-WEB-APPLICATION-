/* ══ EXPENSES & ADVANCES: STATUS BY WHERE THE REQUEST IS, AND PENDING AT (product owner, 12 Nov 2026) ═══════════════
   The list reads each request's place in our flow - Manager review, then Finance review, then the payment - instead of
   the bare approval status, and the Payment column gives way to Pending At (who has to act next). Display only: the
   approval and payment flow, the actions and the rights are unchanged (the Super Admin and the Company Admin see and act
   on everything, as before). The status filter and the tiles use the same names. In the presentation.
     Claims    Draft · Pending Manager Approval · Pending Finance Verification · Sent Back · Withdrawn · Rejected ·
               Ready to Reimburse · Reimbursement Processing · Reimbursed · Reimbursement Failed · Closed (card-paid)
     Advances  Draft · Pending Manager Approval · Pending Finance Verification · Sent Back · Withdrawn · Rejected ·
               Ready to Disburse · Disbursement Processing · Disbursed · Disbursement Failed · Settled */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  /* Few statuses (product owner, 13 Nov 2026: "pending, approved, rejected are the only statuses" - Pending At already
     says who has to act - "keep the reimbursed status as well, once ... the money transfer happens"; an advance reads
     Disbursed): Draft, Pending Manager Approval, Pending Finance Verification and Sent Back read Pending; Rejected,
     Withdrawn and Cancelled read Rejected; a paid claim reads Reimbursed; a paid advance reads Disbursed (also once
     settled); everything else approved - a payment still to be made or one that failed - reads Approved. The status
     filter, the tiles and the Action button use the same words. */
  const FLOW=['Pending','Approved','Rejected','Reimbursed','Disbursed'];
  const THREE=function(l){l=String(l||'');if(/^(Draft|Sent Back|Awaiting Approval|Follow-Up)$|^Pending/.test(l))return 'Pending';if(/^(Rejected|Withdrawn|Cancelled)$/.test(l))return 'Rejected';
    if(l==='Reimbursed')return 'Reimbursed';if(l==='Disbursed'||l==='Settled')return 'Disbursed';return 'Approved';};
  const SHOWN={};   // 'exp:12' → the word on the list, for the row's Action button
  window.emsThreeStatus=THREE;
  const TONE={'Draft':'idle','Pending Manager Approval':'wait','Pending Finance Verification':'wait','Sent Back':'wait','Ready to Reimburse':'info',
    'Reimbursement Processing':'info','Reimbursed':'ok','Reimbursement Failed':'bad','Ready to Disburse':'info','Disbursement Processing':'info',
    'Disbursed':'ok','Disbursement Failed':'bad','Settled':'ok','Closed':'ok','Approved':'ok','Rejected':'bad','Withdrawn':'idle','Cancelled':'idle','Pending':'wait'};
  const names=function(list){list=(list||[]).map(function(u){return typeof caN==='function'?caN(u):u;}).filter(Boolean);
    return list.length>2?list.slice(0,2).join(', ')+' +'+(list.length-2):list.join(', ');};
  const stageKind=function(st){return st&&(st.type==='Reporting Manager'||/manager/i.test(st.name||''))?'Manager':(st&&/finance/i.test(st.name||'')?'Finance':(st?st.name:''));};
  /* {label, at, role} for a list row. */
  function flowOf(x){
    const r=x.r,s=x.status;
    if(s==='Draft')return {label:'Draft',at:x.who,role:'Employee'};
    if(s==='Follow-Up')return {label:'Sent Back',at:x.who,role:'Employee'};
    if(s==='Awaiting Approval'){
      const st=typeof caActiveStage==='function'?caActiveStage(r):null,k=stageKind(st);
      return {label:k==='Manager'?'Pending Manager Approval':k==='Finance'?'Pending Finance Verification':'Pending '+(k||'Approval'),at:names(st&&st.approvers)||'—',role:k==='Manager'?'Manager':k==='Finance'?'Finance':(k||'')};
    }
    if(s==='Rejected'||s==='Withdrawn'||s==='Cancelled')return {label:s,at:'',role:''};
    /* Once the manager and finance have approved: Approved, with nothing pending (product owner, 12 Nov 2026). Paid,
       disbursed, settled and failed payments keep their own names. */
    if(x.kind==='exp'){
      const p=x.pay;
      if(p==='Paid')return {label:'Reimbursed',at:'',role:''};
      if(p==='Failed')return {label:'Reimbursement Failed',at:'',role:''};
      return {label:'Approved',at:'',role:''};
    }
    if(x.kind==='adv'){
      if(x.set==='Settled'||x.set==='Closed')return {label:'Settled',at:'',role:''};
      const p=x.pay;
      if(p==='Disbursed')return {label:'Disbursed',at:'',role:''};
      if(p==='Failed')return {label:'Disbursement Failed',at:'',role:''};
      return {label:'Approved',at:'',role:''};
    }
    return {label:s,at:'',role:''};
  }
  window.eaFlowOf=flowOf;
  /* Rows carry their flow status. */
  if(typeof eaRows==='function'){
    const r0=eaRows;
    eaRows=function(){const out=r0.apply(this,arguments);out.forEach(function(x){const f=flowOf(x);x.flow=THREE(f.label);x.at=f.at;x.atRole=f.role;SHOWN[x.kind+':'+x.id]=x.flow;});return out;};
  }
  /* The Action button reads the same word as the Status column. */
  [['expenses','exp'],['advances','adv']].forEach(function(k){
    const c=typeof rlConfig==='function'?rlConfig(k[0]):null;if(!c||c.threeWords)return;
    c.status=function(r){return (r&&SHOWN[k[1]+':'+r.id])||THREE(r&&r.status);};c.threeWords=true;
  });
  /* The status filter and the tiles pick a flow status. */
  if(typeof eaRowPass==='function'){
    const p0=eaRowPass;
    eaRowPass=function(x){
      if(eaApprF&&FLOW.indexOf(eaApprF)>=0){const keep=eaApprF;eaApprF='';try{if(!p0.apply(this,arguments))return false;}finally{eaApprF=keep;}return x.flow===keep;}
      return p0.apply(this,arguments);
    };
  }
  /* The Status cell and Pending At in place of Payment. */
  if(typeof eaRowHTML==='function'){
    const h0=eaRowHTML;
    eaRowHTML=function(x){
      const out=h0.apply(this,arguments);if(!x||!x.flow)return out;
      const tb=document.createElement('tbody');tb.innerHTML=out;const tr=tb.firstElementChild;if(!tr||tr.children.length<8)return out;
      /* One line each: the list has no sub-lines (product owner, 11 Nov 2026). */
      tr.children[5].innerHTML=axBadge(TONE[x.flow]||'idle',x.flow);
      const at=x.at?(x.atRole&&x.at!=='Finance'?x.at+' ('+x.atRole+')':x.at):'';
      tr.children[6].innerHTML=at?'<div class="lp-c-plain ax-c-trunc" title="'+attrSafe(at)+'">'+sbEsc(at)+'</div>':'';   // nothing pending: blank
      return tr.outerHTML;
    };
  }
  if(typeof eaListHTML==='function'){
    const l0=eaListHTML;
    eaListHTML=function(){
      /* The status filter offers the flow statuses. */
      const e0=EXP_STATUSES.slice(),a0=ADV_STATUSES.slice();
      EXP_STATUSES.splice.apply(EXP_STATUSES,[0,EXP_STATUSES.length].concat(FLOW));ADV_STATUSES.splice(0,ADV_STATUSES.length);
      let out;try{out=l0.apply(this,arguments);}finally{EXP_STATUSES.splice.apply(EXP_STATUSES,[0,EXP_STATUSES.length].concat(e0));ADV_STATUSES.splice.apply(ADV_STATUSES,[0,ADV_STATUSES.length].concat(a0));}
      out=out.replace('<th>Payment</th>','<th>Pending At</th>');
      /* Tiles: where the requests are waiting. */
      const all=eaRows(),cnt=function(s){return all.filter(function(x){return x.flow===s;}).length;};
      const T=FLOW;
      const tiles=T.map(function(s){return caStat(s,cnt(s),eaApprF===s,'eaStat(\''+s+'\')',TONE[s]);}).join('');
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const box=tmp.querySelector('.exp-stats');if(box){box.innerHTML=tiles;box.classList.add('ea-flow-stats');out=tmp.innerHTML;}
      return out;
    };
  }
})();
