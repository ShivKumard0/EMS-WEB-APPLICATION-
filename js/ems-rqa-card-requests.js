/* ══ REQUESTS & LOADS: NEW CARD AND REPLACEMENT REQUESTS FOR THE COMPANY ADMIN (product owner, 15 Nov 2026) ═══════
   "for karan also it should come in requests and loads, as he can do all the operations and functionalities."
   For the Company Admin and the Super Admin, Requests & Loads also lists the card requests - New Card (CRQ) and
   Replacement (CRP) - one line each, as the loads: Request · Employee · Category · Amount · Status · Pending At ·
   Action. Status reads Pending, Approved or Rejected; Pending At names who acts next (Ritu Sen (Manager), Rohan Mehta
   (Finance), or the employee on a Follow-Up). The Action dropdown offers what this person may do now - Approve,
   Reject, Send for Follow-Up - through the approval engine's own step, as the loads do (Karan approves in the
   approver's place with a comment); ☰ and a click open the request's own panel. The bulk checkboxes reach them too.
   Everyone else's Requests & Loads is unchanged; the requests and their approval route are unchanged. In the
   presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof ccRqaItems!=='function'||typeof ccRqaRowHTML!=='function'||typeof ccRequests==='undefined')return;
  const admin=function(){const r=typeof emsRole==='function'?emsRole():'';return r==='Company Admin'||r==='Super Admin';};
  const KINDS={'card request':'New Card','card replacement':'Replacement'};
  /* Pending · Approved · Rejected, and who acts next - as the loads read. */
  const flowOf=function(r){
    const s=r.status;
    if(s==='Draft'||s==='Follow-Up')return {label:'Pending',at:r.name||'',role:'Employee'};
    if(s==='Awaiting Approval'){
      const st=caActiveStage(r),mgr=!!st&&(st.type==='Reporting Manager'||/manager/i.test(st.name||'')),fin=!!st&&/finance/i.test(st.name||'');
      return {label:'Pending',at:st?ccRqaNames(st.approvers):'',role:mgr?'Manager':fin?'Finance':''};
    }
    if(s==='Rejected'||s==='Withdrawn'||s==='Cancelled')return {label:'Rejected',at:'',role:''};
    return {label:'Approved',at:'',role:''};
  };
  /* The rows */
  const i0=ccRqaItems;
  ccRqaItems=function(){
    const out=i0.apply(this,arguments);
    if(!CC_RQA_TOPUPS_ONLY||!admin())return out;
    ccRequests.filter(function(r){return KINDS[r.kind]&&r.entity===ccEnt()&&(typeof ccReqVisible!=='function'||ccReqVisible(r));}).forEach(function(r){
      const f=flowOf(r),type=KINDS[r.kind];
      out.push({kind:'req',rec:r,id:r.id,key:expKey(r),type:type,typeSub:'',name:r.name,empId:r.empId,whoSub:'',
        details:type+(r.cardType?' · '+r.cardType:''),detailsSub:'',prog:(function(){const p=ccProg(r.programmeId);return p?ccProgLabel(p):'';})(),
        status:f.label,pend:f.at?(f.role?f.at+' ('+f.role+')':f.at):'',at:typeof ccRqaStampMs==='function'?ccRqaStampMs(r.createdAt):0});
    });
    out.sort(function(a,b){return b.at-a.at||(a.kind===b.kind?b.id-a.id:0);});
    return out;
  };
  /* One line per cell, as the loads */
  const w0=ccRqaRowHTML;
  ccRqaRowHTML=function(x,i,sel){
    if(!CC_RQA_TOPUPS_ONLY||!x||x.kind!=='req')return w0.apply(this,arguments);
    const cell=typeof rowLogCell==='function'?rowLogCell('cardreqs',x.id):'';
    return '<tr class="ccr-row'+(sel?' lp-row-selected':'')+'" id="ccr-row-'+x.id+'" style="cursor:pointer" onclick="ccRqaOpenReq('+x.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(x.key)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(x.name)+'">'+ccE(x.name)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(x.details)+'">'+ccE(x.details)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain"><span class="wb-muted">—</span></div></td>'
      +'<td>'+axBadge(CC_RQA_TONE[x.status]||statusTone(x.status),x.status)+'</td>'
      +'<td>'+(x.pend?'<div class="lp-c-plain ax-c-trunc" title="'+attrSafe(x.pend)+'">'+ccE(x.pend)+'</div>':'')+'</td>'
      +'<td onclick="event.stopPropagation()">'+(cell||'<button type="button" class="ct-dots-btn" title="View Details" onclick="ccRqaOpenReq('+x.id+')">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button>')+'</td></tr>';
  };
  /* The Action dropdown: what this person may do now, through the engine's own step (as the loads, js/card-requests-all.js) */
  const movesOf=function(r){
    const out=[];if(!r||!r.wf)return out;
    if(caCanDecide(r)){const iv=typeof caIsIntervention==='function'&&caIsIntervention(r);
      out.push({label:'Approve Request',to:'Approved',need:iv},{label:'Reject Request',to:'Rejected',need:true},{label:'Send for Follow-Up',to:'Follow-Up',need:true});}
    if(typeof caCanRespond==='function'&&caCanRespond(r))out.push({label:'Resubmit',to:'Awaiting Approval',need:true});
    return out;
  };
  const openReq=function(id,tab){
    if(ccPageTab!=='requests'){ccCloseForms();ccLoadSel=null;ccPageTab='requests';ccReqSub='requests';}
    ccReqOpen(Number(id),tab);
  };
  if(typeof rlRegister==='function')rlRegister('cardreqs',{pre:'ccqr',recordLabel:'Request',rowPrefix:'ccr',
    rec:function(id){return typeof ccReq==='function'?ccReq(Number(id)):null;},
    status:function(r){return flowOf(r).label;},
    moves:function(r){return movesOf(r).map(function(m){return m.to;});},
    label:function(v){return CC_RQA_MOVE_LABEL[v]||v;},
    save:function(id){
      const r=ccReq(Number(id));if(!r)return;
      const to=getCSValue('ccqr-log-status-sel'),ta=document.getElementById('ccqr-log-comment-inp');
      const note=String(ta?ta.value:'').trim().replace(/[.\s]+$/,'');
      const m=movesOf(r).find(function(x){return x.to===to;});
      if(!m){showToast('Pick an action','error','Choose what to do from Status.');return;}
      const mark=function(){return [r.status,(r.logs||[]).length,r.wf?r.wf.current:'',r.wf?r.wf.round:''].join('|');},was=mark();
      caLogMove(r.id,m.to,note);
      if(mark()!==was&&note&&!(r.logs||[]).slice(0,4).some(function(x){return String(x.action||'').indexOf(note)>=0;}))caLog(r,r.status,m.label+' · note by '+caN(caMe())+': '+note);
    },
    count:function(r){return (r.logs||[]).length;},
    open:function(id){openReq(id);},
    logs:function(id){openReq(id,'logs');},
    sub:function(r){return ccE(expKey(r))+' &middot; '+ccE(r.name||'');}});
})();
