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
  /* step: the Workflow step's name; chg: [[field, old, new]] for History. */
  const log=function(r,A,status,action,step,chg){
    const s=typeof stampNow==='function'?stampNow():{date:'',time:''};
    (r.logs=r.logs||[]).unshift({date:s.date,time:s.time,user:who(A),userId:A.who||'',status:status,action:action,step:step||'',chg:chg||[]});
  };
  const save=function(){if(typeof presSaveSoon==='function')presSaveSoon();};
  const add=function(c,kind,A,reason,note){
    const r={id:nextId(),kind:kind,status:kind==='hold'?'On Hold':'Pending',reason:reason||'',note:note||'',by:A.who,at:new Date().toISOString(),step:kind==='lost'?'Block':''};
    (c.csr=c.csr||[]).push(r);
    log(r,A,r.status,kind==='hold'?'Card put on hold by '+who(A)+(reason?': '+reason:'')+'. No approval is needed.'
      :'Card reported '+String(reason).toLowerCase()+' by '+who(A)+(note?': '+note:'')+'. Waiting for the company admin to block the card.',
      kind==='hold'?'Card put on hold':'Reported '+String(reason).toLowerCase(),[['Request Status','',r.status],['Card Status','Active','On Hold']]);
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
      if(r.kind==='hold'&&r.status==='On Hold'){r.status='Released';log(r,A||ccNow(),'Released','Hold ended: '+why+'.','Hold released',[['Request Status','On Hold','Released'],['Card Status','On Hold','Active']]);}
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

  /* ── 5 · Block card, then Disable card: from the row's Action menu (Update Status popup) or the panel's Logs ── */
  const MOVES={Blocked:{label:'Block card',to:'Blocked'},Disabled:{label:'Disable card',to:'Disabled'}};
  const movesOf=function(r){
    const x=find(r.id);if(!x||r.kind!=='lost'||r.status!=='Pending'||!canAct())return [];
    if(x.c.status==='Blocked')return ['Disabled'];
    return ccCardEnded(x.c)?[]:['Blocked'];
  };
  /* The move itself: the engine's own provider outcome, then the request's log. Returns an error or ''. */
  function act(id,v,note){
    const x=find(id);if(!x)return 'This request is no longer here.';
    const r=x.r,c=x.c;
    if(movesOf(r).indexOf(v)<0)return 'This step is not available now.';
    if(!note)return 'Add a comment.';
    const A=ccNow(),res=ccOutcomeRecord('lifecycle',c.id,{value:v==='Blocked'?'Blocked':'Closed',source:CC_DEMO,note:note},A);
    if(res&&res.error)return res.error;
    if(v==='Blocked'){r.step='Disable';log(r,A,'Pending','Card '+ccCardLabel(c)+' blocked by '+who(A)+': '+note+'. Next: disable the card.','Card blocked',[['Card Status','On Hold','Blocked']]);}
    else{r.step='';r.status='Approved';log(r,A,'Approved','Card '+ccCardLabel(c)+' disabled by '+who(A)+': '+note+'. '+ccHolderName(c)+' can now ask for a new card.','Card disabled',
      [['Request Status','Pending','Approved'],['Card Status','Blocked','Disabled']]);}
    save();
    return '';
  }
  /* The row's Update Status popup (js/row-logs.js) */
  function decide(id){
    const x=find(id);if(!x)return;
    const v=typeof getCSValue==='function'?getCSValue('csr-log-status-sel'):'';
    const inp=document.getElementById('csr-log-comment-inp'),note=String(inp?inp.value:'').trim();
    if(!MOVES[v])return;
    const err=act(id,v,note);
    if(err){showToast('Not done','error',err);return;}
    showToast('Done','success',keyOf(x.r)+': card '+(v==='Blocked'?'blocked':'disabled')+'.');
  }
  if(typeof rlRegister==='function')rlRegister('cardsafety',{pre:'csr',recordLabel:'Request',
    rec:function(id){const x=find(id);return x?x.r:null;},
    status:function(r){return r.status;},
    moves:movesOf,
    label:function(v){return MOVES[v]?MOVES[v].label:v;},
    save:decide,
    count:function(r){return (r.logs||[]).length;},
    open:function(id){window.emsCsrOpen(id);},
    logs:function(id){window.emsCsrOpen(id,'logs');},
    sub:function(r){const x=find(r.id);return keyOf(r)+(x?' · '+ccE(ccHolderName(x.c))+' · '+ccE(ccCardLabel(x.c)):'');}});

  /* ── 6 · The side panel, as every other row's: Details · Logs ── */
  let csrSel=null,csrTab='basic-details',csrAct=null;   // csrAct: the step picked in Logs {id, label, to, note}
  const TABS=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const ico=function(k){return typeof AX_ICO!=='undefined'&&AX_ICO[k]?AX_ICO[k]:'';};
  function detailsHTML(x){
    const r=x.r,c=x.c,lost=r.kind==='lost',w=emsCardWord(c),d=new Date(r.at);
    const on=isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const hero=typeof sbHero==='function'?sbHero({icon:typeof CC_ICO!=='undefined'&&CC_ICO.hero?CC_ICO.hero:'',name:ccE(keyOf(r)),meta:[lost?'Lost or Stolen':'Card Hold',ccE(ccHolderName(c))],
      status:axBadge(CC_RQA_TONE[r.status]||statusTone(r.status),r.status)}):'';
    return hero+'<div class="lp-sb-detail-grid">'
      +axField(ico('fUser'),'Employee',ccE(ccHolderName(c)))
      +axField(ico('fTag'),'Card',ccE(ccCardLabel(c)))
      +axField(ico('fShield'),'Card Status',axBadge(statusTone(w),w))
      +axField(ico('fCal'),lost?'Reported On':'Held On',ccE(on))
      +axField(ico('fBox'),lost?'What Happened':'Reason',ccE(r.reason))
      +(lost&&r.status==='Pending'?axField(ico('fCheck'),'Next Step',ccE((STEP[r.step]||STEP.Block)+' · '+adminName())):'')
      +(r.note?axField(ico('fBox'),'Details',ccE(r.note),true):'')
      +'</div>';
  }
  function logForm(r){
    const mv=movesOf(r);if(!mv.length)return '';
    const a=csrAct&&csrAct.id===r.id?csrAct:null;
    return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+r.status+'</div><p class="lp-logs-form-sub"></p>'
      +lpLogStatusField('csrl-act-'+r.id,r.status,[r.status].concat(mv.map(function(v){return MOVES[v].label;})),'emsCsrLogPick')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="csrl-note" placeholder="Enter comment">'+ccE(a?a.note||'':'')+'</textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="emsCsrLogCancel()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="emsCsrLogSubmit('+r.id+')">Submit</button></div></div>';
  }
  /* History: the Change History table every panel has - one row per field a step changed, newest first. */
  function historyHTML(x){
    const rows=[];
    (x.r.logs||[]).forEach(function(l){
      const chg=l.chg&&l.chg.length?l.chg:[['Request Status','',l.status]];
      chg.forEach(function(c){rows.push({by:l.user,time:l.date+(l.time?', '+l.time:''),field:c[0],old:c[1],val:c[2]});});
    });
    const cell=function(v,cls){return '<td'+(cls?' class="'+cls+'"':'')+(v?' title="'+ccE(v)+'"':'')+'>'+(v?ccE(v):'<span class="sb-dash">&mdash;</span>')+'</td>';};
    const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Change History</span><span class="ax-count">'+rows.length+' change'+(rows.length===1?'':'s')+'</span></div>';
    if(!rows.length)return head+'<div class="lp-wf-empty">No field has changed yet.</div>';
    return head+'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>S. No</th><th>Update By</th><th>Update Time</th><th>Field Name</th><th>Old Value</th><th>New Value</th></tr></thead><tbody>'
      +rows.map(function(r,i){return '<tr><td class="sb-hist-n">'+(i+1)+'</td>'+cell(r.by)+cell(r.time,'sb-hist-time')+'<td><b>'+ccE(r.field)+'</b></td>'+cell(r.old,'sb-hist-old')+cell(r.val,'sb-hist-new')+'</tr>';}).join('')
      +'</tbody></table></div>';
  }
  /* Workflow: the steps done (from the logs) and the ones still to come, with who they wait for. */
  function workflowHTML(x){
    const r=x.r,done=(r.logs||[]).slice().reverse().map(function(l){return {title:l.step||l.status||'',user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
    const steps=[];
    if(r.kind==='lost'&&r.status==='Pending'){
      if(r.step!=='Disable')steps.push({title:STEP.Block,owner:adminName()});
      steps.push({title:STEP.Disable,owner:adminName()});
      steps.push({title:'Ask for a new card',owner:ccHolderName(x.c)});
    }else if(r.kind==='lost'&&r.status==='Approved'&&!(typeof ccLiveCardsOf==='function'&&ccLiveCardsOf(x.c.employeeEid,x.c.programmeId).length))
      steps.push({title:'Ask for a new card',owner:ccHolderName(x.c)});
    else if(r.kind==='hold'&&r.status==='On Hold')steps.push({title:'Release the hold',owner:ccHolderName(x.c)});
    if(typeof wfTimelineHTML!=='function')return '';
    return wfTimelineHTML(typeof wfPlan==='function'?wfPlan(done,steps):done);
  }
  function panelHTML(){
    const x=find(csrSel);if(!x)return '';
    const a=csrAct&&csrAct.id===x.r.id?csrAct:null;
    const body=csrTab==='logs'?(typeof lpLogsView==='function'?lpLogsView(x.r.logs||[],logForm(x.r),{select:true,current:x.r.status,open:a?a.label:undefined}):'')
      :csrTab==='history'?historyHTML(x):csrTab==='workflow'?workflowHTML(x):detailsHTML(x);
    return axTabBar('csr',TABS,csrTab,'emsCsrNav','emsCsrClose')+'<div class="lp-isb-body">'+body+'</div>';
  }
  const markRows=function(){document.querySelectorAll('.csr-row').forEach(function(t){t.classList.toggle('lp-row-selected',t.id==='csr-row-'+csrSel);});};
  const otherPanels=function(){
    if(typeof ccLoadSel!=='undefined')ccLoadSel=null;if(typeof ccReqSel!=='undefined')ccReqSel=null;
    ['ccl','ccr'].forEach(function(k){const sb=document.getElementById(k+'-split-sb');if(sb)sb.classList.remove('open');});
    document.querySelectorAll('.ccl-row,.ccr-row').forEach(function(t){t.classList.remove('lp-row-selected');});
  };
  window.emsCsrOpen=function(id,tab){
    if(!find(id))return;
    if(csrSel!==id)csrAct=null;
    csrTab=tab||(typeof sbKeepTab==='function'?sbKeepTab(csrSel,csrTab,'basic-details'):'basic-details');csrSel=id;
    otherPanels();
    const sb=document.getElementById('csr-split-sb');
    if(!sb){renderADTPage();return;}
    sb.classList.add('open');isbTab('csr',panelHTML);markRows();
  };
  window.emsCsrClose=function(){
    csrSel=null;csrAct=null;
    const sb=document.getElementById('csr-split-sb');if(sb)sb.classList.remove('open');markRows();
  };
  window.emsCsrNav=function(t){csrTab=t;isbTab('csr',panelHTML);};
  window.emsCsrLogPick=function(val,csid){
    const id=Number(String(csid||'').replace(/^csrl-act-/,'')),x=find(id);if(!x||!val)return;
    if(csrAct&&csrAct.id===id&&csrAct.label===val)return;   // the Logs view picks it again as it draws: nothing to change
    const v=Object.keys(MOVES).find(function(k){return MOVES[k].label===val;});
    const ta=document.getElementById('csrl-note');
    csrAct=v?{id:id,label:val,to:v,note:ta?ta.value:''}:null;
    isbTab('csr',panelHTML);
  };
  window.emsCsrLogCancel=function(){if(csrAct){csrAct=null;isbTab('csr',panelHTML);}};
  window.emsCsrLogSubmit=function(id){
    const x=find(id),a=csrAct&&csrAct.id===id?csrAct:null;
    if(!x||!a){showToast('Pick a step','error','Choose Block card or Disable card first.');return;}
    const ta=document.getElementById('csrl-note'),note=String(ta?ta.value:a.note||'').trim();
    if(!note){if(ta)ta.classList.add('is-invalid');showToast('Comment is required','error','Write a comment for '+a.label+'.');return;}
    const err=act(id,a.to,note);
    if(err){showToast('Not done','error',err);return;}
    csrAct=null;renderADTPage();
    showToast('Done','success',keyOf(x.r)+': card '+(a.to==='Blocked'?'blocked':'disabled')+'.');
  };
  /* The panel sits beside the list's own panel; opening a load or a request closes it. */
  if(typeof ccRqaListHTML==='function'){
    const p0=ccRqaListHTML;
    ccRqaListHTML=function(){
      const out=p0.apply(this,arguments);
      if(csrSel!=null&&!find(csrSel)){csrSel=null;csrAct=null;}
      if(csrSel!=null&&!admin()){csrSel=null;csrAct=null;}
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const sb=tmp.querySelector('#ccl-split-sb,#ccr-split-sb');if(!sb)return out;
      if(csrSel!=null){sb.classList.remove('open');tmp.querySelectorAll('.ccl-row,.ccr-row').forEach(function(t){t.classList.remove('lp-row-selected');});
        const row=tmp.querySelector('#csr-row-'+csrSel);if(row)row.classList.add('lp-row-selected');}
      sb.insertAdjacentHTML('afterend','<div class="lp-split-sb'+(csrSel!=null?' open':'')+'" id="csr-split-sb"><div class="lp-isb" id="csr-isb-inner">'
        +(csrSel!=null?sbRender(panelHTML,'csr'):'')+'</div></div>');
      return tmp.innerHTML;
    };
  }
  ['ccRqaOpenLoad','ccRqaOpenReq'].forEach(function(n){
    if(typeof window[n]!=='function')return;
    const f0=window[n];
    window[n]=function(){if(csrSel!=null)window.emsCsrClose();return f0.apply(this,arguments);};
  });
})();
