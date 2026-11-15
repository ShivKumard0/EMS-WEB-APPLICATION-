/* ══ CARD ON HOLD, LOST OR STOLEN: STATUS AND REQUESTS (product owner, 15 Nov 2026) ════════════════════════════════
   "if i hold the card from the mobile application the card status should be kept as hold in the web as well, and when he
   blocks the card the status should be blocked in the web as well. for lost or stolen it should raise a request, in
   requests and loads, in which i will go and block the card first from the logs, then make the card disable. then he
   will request new card then i will approve it as the current process."
   Product owner's picks:
   - A card reads On Hold, Blocked or Disabled wherever its status is shown (Card List, card panels, My Cards, the phone).
     Disabled is the card's final status (the engine's Closed).
   - Hold: the card is On Hold at once, no approval; a line item "Card Hold" appears in Requests & Loads for the Company
     Admin (and Super Admin). The cardholder ends the hold himself, again with no approval ("it is just a status"): the
     line item then reads Released.
   - Lost or Stolen: a line item "Lost or Stolen", Pending at the Company Admin. From its Action menu (Update Status,
     with a comment): Block card → the card is Blocked; then Disable card → the card is Disabled and the request
     Approved. Each step is the engine's own provider outcome (js/cards.js ccOutcomeRecord, applied at once in the
     presentation). Only someone who manages card lifecycles acts (the Company Admin, the Super Admin).
   - While a lost or stolen report is open the cardholder is not offered a replacement; once the card is Disabled he asks
     for a new card - the existing card request and its approval route.
   Everything else about cards, holds, loads and approvals is unchanged. In the presentation company only. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof ccHoldPlace!=='function'||typeof ccReportLost!=='function'||typeof ccHoldEnd!=='function')return;
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  if(typeof sbToneAdd==='function')sbToneAdd({'On Hold':'wait','Blocked':'bad','Disabled':'idle','Released':'ok'});

  /* ── The status word ── */
  window.emsCardWord=function(c){
    if(!c)return '';
    if(c.status==='Closed')return 'Disabled';
    if(c.status==='Blocked')return 'Blocked';
    if(c.hold&&c.hold.active&&!(typeof ccCardEnded==='function'&&ccCardEnded(c)))return 'On Hold';
    return c.status;
  };

  /* ── The requests, kept on the card itself (c.csr), so they are saved with it ── */
  const all=function(){const out=[];(typeof ccCards!=='undefined'?ccCards:[]).forEach(function(c){(c.csr||[]).forEach(function(r){out.push({c:c,r:r});});});return out;};
  const find=function(id){id=Number(id);let hit=null;all().some(function(x){if(x.r.id===id){hit=x;return true;}return false;});return hit;};
  const nextId=function(){return all().reduce(function(m,x){return Math.max(m,x.r.id);},5000)+1;};
  const keyOf=function(r){return 'CSR-'+r.id;};
  const who=function(A){return typeof caN==='function'?caN(A.who):'';};
  const log=function(r,A,status,action){
    const s=typeof stampNow==='function'?stampNow():{date:'',time:''};
    (r.logs=r.logs||[]).unshift({date:s.date,time:s.time,user:who(A),userId:A.who||'',status:status,action:action});
  };
  const save=function(){if(typeof presSaveSoon==='function')presSaveSoon();};
  const add=function(c,kind,A,reason,note){
    const r={id:nextId(),kind:kind,status:kind==='hold'?'On Hold':'Pending',reason:reason||'',note:note||'',by:A.who,at:new Date().toISOString(),step:kind==='lost'?'Block':''};
    (c.csr=c.csr||[]).push(r);
    log(r,A,r.status,kind==='hold'?'Card put on hold by '+who(A)+(reason?': '+reason:'')+'. No approval is needed.'
      :'Card reported '+String(reason).toLowerCase()+' by '+who(A)+(note?': '+note:'')+'. Waiting for the company admin to block the card.');
    save();return r;
  };
  const openLost=function(c){return (c&&c.csr||[]).find(function(r){return r.kind==='lost'&&r.status==='Pending';})||null;};
  const holder=function(c,A){A=A||ccNow();const me=typeof idEmpOfUser==='function'?idEmpOfUser(A.who):null;return !!(c&&me&&me.eid===c.employeeEid);};

  /* ── 1 · Hold: a line item, no approval ── */
  const h0=ccHoldPlace;
  ccHoldPlace=function(cardId,reason,A){
    A=A||ccNow();
    const err=h0.call(this,cardId,reason,A);
    if(!err){const c=ccCard(cardId);if(c&&c.entity===nova())add(c,'hold',A,String(reason||'').trim(),'');}
    return err;
  };
  const e0=ccHoldEnd;
  ccHoldEnd=function(c,why,A){
    const was=c&&c.hold&&c.hold.active?c.hold.type:'';
    const out=e0.apply(this,arguments);
    if(was==='Temporary'&&c.entity===nova())(c.csr||[]).forEach(function(r){
      if(r.kind==='hold'&&r.status==='On Hold'){r.status='Released';log(r,A||ccNow(),'Released','Hold ended: '+why+'.');}
    });
    return out;
  };
  /* The cardholder ends his own temporary hold at once: "it is just a status, no approval should be required". */
  if(typeof ccHoldReleaseRequest==='function'){
    const q0=ccHoldReleaseRequest;
    ccHoldReleaseRequest=function(cardId,reason,A){
      A=A||ccNow();const c=ccCard(cardId);
      if(c&&c.entity===nova()&&holder(c,A)&&c.hold&&c.hold.active&&c.hold.type==='Temporary'){
        reason=String(reason||'').trim();if(!reason)return 'Say why the hold can end.';
        ccHoldEnd(c,'released by the cardholder '+who(A)+' - '+reason,A);
        save();return '';
      }
      return q0.apply(this,arguments);
    };
  }
  /* The web's own form for it reads the same way. */
  const holderAct=function(){return typeof ccAct!=='undefined'&&ccAct&&ccAct.act==='release-request'&&holder(ccCard(ccAct.id));};
  if(typeof ccActHTML==='function'){
    const a0=ccActHTML;
    ccActHTML=function(){
      const out=a0.apply(this,arguments);
      return holderAct()?out.replace('Request Hold Release · ','Release Hold · ').replace('The hold stays until a card administrator reviews the request.','The hold ends at once; new loads reach the card again.').replace('>Request Release<','>Release<'):out;
    };
  }
  if(typeof ccActSave==='function'){
    const s0=ccActSave;
    ccActSave=function(){
      if(!holderAct())return s0.apply(this,arguments);
      const t0=window.showToast;
      window.showToast=function(a,b,c){return t0.call(this,a,b,typeof c==='string'?c.replace('Release requested; a card administrator reviews it','Hold released'):c);};
      try{return s0.apply(this,arguments);}finally{window.showToast=t0;}
    };
  }

  /* ── 2 · Lost or stolen: a request for the company admin ── */
  const l0=ccReportLost;
  ccReportLost=function(cardId,d,A){
    A=A||ccNow();
    const err=l0.call(this,cardId,d,A);
    if(!err){const c=ccCard(cardId);if(c&&c.entity===nova()&&!openLost(c))add(c,'lost',A,(d&&d.reason)||'',String(d&&d.note||'').trim());}
    return err;
  };

  /* No automatic new card after a lost or stolen card is disabled (product owner: "He requests, you approve"): the
     employee asks for it and it goes for approval. Automatic issue for everyone else is unchanged. */
  if(typeof emsAutoIssueCreate==='function'){
    const ai0=emsAutoIssueCreate;
    emsAutoIssueCreate=function(p,eid){
      const lostOne=typeof ccCardsOfEmp==='function'&&ccCardsOfEmp(eid).some(function(c){
        return c.programmeId===p.id&&c.status==='Closed'&&(c.csr||[]).some(function(r){return r.kind==='lost';});});
      return lostOne?null:ai0.apply(this,arguments);
    };
  }

  /* ── 3 · The cardholder's card menu (web My Cards): Release Hold; no replacement while a report is open ── */
  if(typeof emsCardItems==='function'){
    const i0=emsCardItems;
    emsCardItems=function(c){
      const it=i0.apply(this,arguments)||[],lost=!!openLost(c),own=holder(c);
      return it.filter(function(x){return !(lost&&x.label==='Request Replacement');})
        .map(function(x){return own&&x.label==='Request Hold Release'?Object.assign({},x,{label:'Release Hold'}):x;});
    };
  }

  /* ── 4 · Requests & Loads: the line items ── */
  const admin=function(){const r=typeof emsRole==='function'?emsRole():'';return r==='Company Admin'||r==='Super Admin';};
  const adminName=function(){const u=typeof emsMfAdmin==='function'?emsMfAdmin():'';return u&&typeof idName==='function'?idName(u):'Company Admin';};
  const canAct=function(){const A=ccNow();return ccPCan(A,'card.lifecycle.manage')&&ccPCan(A,'card.demo.simulate');};
  const STEP={Block:'Block card',Disable:'Disable card'};
  if(typeof CC_RQA_TYPES!=='undefined')['Card Hold','Lost or Stolen'].forEach(function(t){if(CC_RQA_TYPES.indexOf(t)<0)CC_RQA_TYPES.push(t);});
  if(typeof CC_RQA_TONE!=='undefined'){CC_RQA_TONE['On Hold']='wait';CC_RQA_TONE['Released']='ok';}
  if(typeof LP_ROW_PREFIX!=='undefined')LP_ROW_PREFIX.cardsafety='csr';
  if(typeof ccRqaItems==='function'){
    const r0=ccRqaItems;
    ccRqaItems=function(){
      const out=r0.apply(this,arguments);
      if(!admin())return out;
      all().filter(function(x){return x.c.entity===ccEnt();}).forEach(function(x){
        const r=x.r,c=x.c,lost=r.kind==='lost',e=typeof idEmp==='function'?idEmp(c.employeeEid):null;
        out.push({kind:'csr',rec:r,id:r.id,key:keyOf(r),type:lost?'Lost or Stolen':'Card Hold',typeSub:'',name:ccHolderName(c),empId:e?e.empId:'',
          whoSub:ccCardLabel(c),details:lost?'Lost or Stolen':'Card Hold',detailsSub:'',prog:'',status:r.status,
          pend:lost&&r.status==='Pending'?adminName()+' ('+(STEP[r.step]||STEP.Block)+')':'',at:Date.parse(r.at)||0});
      });
      out.sort(function(a,b){return b.at-a.at||(a.kind===b.kind?b.id-a.id:0);});
      return out;
    };
  }
  if(typeof ccRqaRowHTML==='function'){
    const w0=ccRqaRowHTML;
    ccRqaRowHTML=function(x,i){
      if(!x||x.kind!=='csr')return w0.apply(this,arguments);
      const cell=typeof rowLogCell==='function'?rowLogCell('cardsafety',x.id):'';
      return '<tr class="csr-row" id="csr-row-'+x.id+'" style="cursor:pointer" onclick="emsCsrOpen('+x.id+')">'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+ccE(x.key)+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(x.name)+'">'+ccE(x.name)+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(x.details)+'</div></td>'
        +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain"><span class="wb-muted">—</span></div></td>'
        +'<td>'+axBadge(CC_RQA_TONE[x.status]||statusTone(x.status),x.status)+'</td>'
        +'<td>'+(x.pend?'<div class="lp-c-plain ax-c-trunc" title="'+attrSafe(x.pend)+'">'+ccE(x.pend)+'</div>':'')+'</td>'
        +'<td onclick="event.stopPropagation()">'+cell+'</td></tr>';
    };
  }

  /* ── 5 · The Action menu: Block card, then Disable card (Update Status, with a comment) ── */
  function decide(id){
    const x=find(id);if(!x)return;
    const r=x.r,c=x.c,v=typeof getCSValue==='function'?getCSValue('csr-log-status-sel'):'';
    const inp=document.getElementById('csr-log-comment-inp'),note=String(inp?inp.value:'').trim();
    if(['Blocked','Disabled'].indexOf(v)<0)return;
    if(!note){showToast('Add a comment','error');return;}
    const A=ccNow(),res=ccOutcomeRecord('lifecycle',c.id,{value:v==='Blocked'?'Blocked':'Closed',source:CC_DEMO,note:note},A);
    if(res&&res.error){showToast('Not done','error',res.error);return;}
    if(v==='Blocked'){r.step='Disable';log(r,A,'Pending','Card '+ccCardLabel(c)+' blocked by '+who(A)+': '+note+'. Next: disable the card.');}
    else{r.step='';r.status='Approved';log(r,A,'Approved','Card '+ccCardLabel(c)+' disabled by '+who(A)+': '+note+'. '+ccHolderName(c)+' can now ask for a new card.');}
    save();
    showToast('Done','success',keyOf(r)+': card '+(v==='Blocked'?'blocked':'disabled')+'.');
  }
  if(typeof rlRegister==='function')rlRegister('cardsafety',{pre:'csr',recordLabel:'Request',
    rec:function(id){const x=find(id);return x?x.r:null;},
    status:function(r){return r.status;},
    moves:function(r){
      const x=find(r.id);if(!x||r.kind!=='lost'||r.status!=='Pending'||!canAct())return [];
      if(x.c.status==='Blocked')return ['Disabled'];
      return ccCardEnded(x.c)?[]:['Blocked'];
    },
    label:function(v){return {Blocked:'Block card',Disabled:'Disable card'}[v]||v;},
    save:decide,
    count:function(r){return (r.logs||[]).length;},
    open:function(id){window.emsCsrOpen(id);},
    logs:function(id){window.emsCsrOpen(id);},
    sub:function(r){const x=find(r.id);return keyOf(r)+(x?' · '+ccE(ccHolderName(x.c))+' · '+ccE(ccCardLabel(x.c)):'');}});

  /* ── 6 · The request's details and log ── */
  const X='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const root=function(){let el=document.getElementById('csr-modal');if(!el){el=document.createElement('div');el.id='csr-modal';document.body.appendChild(el);}return el;};
  window.emsCsrClose=function(){root().innerHTML='';};
  window.emsCsrOpen=function(id){
    const x=find(id);if(!x)return;
    const r=x.r,c=x.c,lost=r.kind==='lost',w=emsCardWord(c);
    const row=function(k,v){return v?'<tr><td style="width:34%;color:var(--gray,#6b7280)">'+k+'</td><td>'+v+'</td></tr>':'';};
    const d=new Date(r.at),on=isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const logs=(r.logs||[]).map(function(l){return '<tr><td style="white-space:nowrap">'+ccE(l.date)+'<div class="lp-c-sub">'+ccE(l.time)+'</div></td><td>'+ccE(l.user)+'</td><td>'+axBadge(CC_RQA_TONE[l.status]||statusTone(l.status),l.status)+'</td><td>'+ccE(l.action)+'</td></tr>';}).join('');
    root().innerHTML='<div class="ct-modal-overlay" style="z-index:2000" onclick="emsCsrClose()">'
      +'<div class="ct-modal" style="width:min(640px,95vw)" role="dialog" aria-modal="true" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+ccE(keyOf(r))+' · '+(lost?'Lost or Stolen':'Card Hold')+'</span><button class="ct-modal-close" onclick="emsCsrClose()" aria-label="Close">'+X+'</button></div>'
      +'<div class="sb-hist-wrap" style="margin-top:12px"><table class="ax-hist sb-hist"><tbody>'
        +row('Employee',ccE(ccHolderName(c)))+row('Card',ccE(ccCardLabel(c)))+row('Card Status',axBadge(statusTone(w),w))
        +row(lost?'Reported On':'Held On',ccE(on))+row(lost?'What Happened':'Reason',ccE(r.reason))+row('Details',ccE(r.note))
        +row('Request Status',axBadge(CC_RQA_TONE[r.status]||statusTone(r.status),r.status)+(lost&&r.status==='Pending'?' <span class="ax-sub">Next: '+ccE(STEP[r.step]||STEP.Block)+' · '+ccE(adminName())+'</span>':''))
      +'</tbody></table></div>'
      +'<div class="lp-sb-view-header" style="margin-top:16px"><span class="lp-sb-section-title">Logs</span></div>'
      +'<div class="att-table-wrap"><table class="att-table"><thead><tr><th>Date</th><th>By</th><th>Status</th><th>Action</th></tr></thead><tbody>'+logs+'</tbody></table></div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="emsCsrClose()">Close</button></div></div>'
      +'</div></div>';
  };
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.querySelector('#csr-modal .ct-modal'))window.emsCsrClose();});
})();
