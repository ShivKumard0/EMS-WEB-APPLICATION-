/* ══ CARD REQUEST PANEL: decisions in Logs, a Controls tab (product owner, 11 Nov 2026) ══════════════════════
   Corporate Cards → Requests & Loads → Card Requests. Every request line has an Actions button (cards-ui.js) and its
   panel has:
   - Logs: "Select action" with a note - Approve, Reject, Send for Follow-Up (the approver whose stage it is), Reassign
     Approval (who may reassign), Resubmit (the requester, after a Follow-Up) and Assign Workflow (a missing route).
     The note is required, except for Approve. Every move goes through the approval engine's own checks
     (caLogMove / caReassign / caAssignWorkflow), so the same people decide as before. The Approval tab is read-only:
     route, stages and decisions. My Approvals → Review still works.
   - Controls: the same people as a card's Controls tab. Once the request's card exists - the new card, the
     replacement, or for a wallet request the card the wallet is for - the tab is that card's Controls tab: the same
     list and the same Change Card Controls form, inside the request. Before the card exists, the tab holds the card's
     STARTING controls: set on the request, checked against the programme like a card's own controls, and applied to
     the card the moment its record is created (enrollment sent to the provider). */
let ccRqAct=null;   // the action picked in a request's Logs: {id, label, to | kind, need, note, to/from (reassign)}
const CC_REQ_ENDED=['Rejected','Withdrawn','Cancelled'];

/* ── Controls ── */
function ccReqCtlTabOn(){return ['card.control.view','card.control.manage','card.control.approve'].some(ccCan);}
/* The card a request's Controls tab works on, or null while no card record exists yet. */
function ccReqCtlCard(r){
  if(!r)return null;
  if(r.kind==='wallet request'){
    const c=r.cardId!=null?ccCard(r.cardId):null;
    return c||(typeof emsCardOfEmp==='function'?emsCardOfEmp(r.employeeEid,r.programmeId):null)||null;
  }
  return ccCardOfReq(r);
}
/* Is a request's Controls tab showing this card now? (Change Card Controls then opens inside it.) */
function ccReqCtlHere(cardId){
  if(typeof page==='undefined'||page!=='cards'||ccPageTab!=='requests'||ccReqSel==null||ccReqTab!=='controls')return false;
  const c=ccReqCtlCard(ccReq(ccReqSel));return !!c&&c.id===Number(cardId);
}
function ccReqStartCtl(r){return r&&r.startCtl?r.startCtl.set:null;}
/* What the employee is enrolled in on this card (product owner, 12 Nov 2026): its wallets - Meal, Fuel, Gift, Corporate
   Expense … - with their kind and, for a benefit wallet, this month's entitlement. Shown above the controls. */
function ccReqEnrolledHTML(r,c){
  const p=ccProg(r.programmeId),map=p?ccWalletMap(p):[],cur=p?p.currency:'INR';
  const codes=c&&typeof ccCardWallets==='function'?ccCardWallets(c):(r.wallets||[]);
  if(!codes.length)return '';
  const ent={};
  if(c&&typeof ccWalletEntitlements==='function')ccWalletEntitlements(c,wbToday().slice(0,7)).forEach(function(w){ent[w.code]=w;});
  const rows=codes.map(function(code){
    const w=map.find(function(x){return x.code===code;}),e=ent[code],ben=!!(w&&w.benefit);
    return '<tr><td><b>'+ccE(wbTypeName(code))+'</b></td><td>'+(ben?'Benefit':'Company')+'</td><td>'
      +(ben?(e&&e.eligible?ccE(expMoney(e.planned||0,cur)):'<span class="wb-muted">Not entitled this month</span>'):'<span class="wb-muted">Loaded on request</span>')+'</td></tr>';});
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Enrolled In</span><span class="ax-count">'+codes.length+' wallet'+(codes.length===1?'':'s')+'</span></div>'
    +'<div class="sb-hist-wrap" style="margin-bottom:16px"><table class="ax-hist sb-hist"><thead><tr><th>Wallet</th><th>Type</th><th>This Month</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
}
function ccReqControlsHTML(r){
  const c=ccReqCtlCard(r);
  if(c)return (ccCtlForm&&ccCtlForm.inPanel?'':ccReqEnrolledHTML(r,c))+ccCardControlsViewHTML(c);
  if(ccCtlForm&&ccCtlForm.inPanel&&ccCtlForm.scope==='request'&&ccCtlForm.id===r.id)return ccCtlInlineHTML();
  const p=ccProg(r.programmeId);if(!p)return '<div class="wb-empty-sm">The card programme is missing.</div>';
  const enrolled=ccReqEnrolledHTML(r,null);
  const cur=p.currency,own=ccReqStartCtl(r),ps=ccProgCtl(p),eff=ccCtlMerge(ps,own),blank=ccCtlBlank();
  const ended=CC_REQ_ENDED.indexOf(ccReqTrack(r))>=0;
  const can=!ended&&ccCan('card.control.manage')&&ccPageTabs().some(function(t){return t.id==='controls';});
  const rows=eff?CC_CTL_FIELDS.filter(function(f){return f[1](eff,cur)!==f[1](blank,cur);}).map(function(f){
    const v=f[1](eff,cur),pv=ps?f[1](ps,cur):null,by=pv===v?'Programme':own&&f[1](own,cur)===v?'This request':'Programme + This request';
    return '<tr><td><b>'+ccE(f[0])+'</b></td><td>'+ccE(v)+'</td><td>'+by+'</td></tr>';}):[];
  return enrolled+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Controls</span>'
      +(can?'<span class="ca-actions">'+ccBtn(own?'Change Starting Controls':'Set Starting Controls','ccReqCtlFormOpen('+r.id+')',true)+'</span>':'<span class="ax-count">'+rows.length+' set</span>')+'</div>'
    +'<div class="ea-hint" style="margin:0 0 10px">'+(ended?'No card is issued for this request.':'Applied to the card when it is issued.')+'</div>'
    +(rows.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Control</th><th>In Effect</th><th>Set By</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No controls are set. The card will follow the programme, which has no limits.</div>');
}
function ccReqCtlFormOpen(id){
  const r=ccReq(id);if(!r)return;
  if(!ccCan('card.control.manage')){emsDeny('change card controls');return;}
  if(ccReqCtlCard(r)){renderADTPage();return;}   // the card exists now: its own controls show
  const f=r.startCtl&&r.startCtl.f?JSON.parse(JSON.stringify(r.startCtl.f)):null,b=ccCtlBlank();
  ccCtlForm={scope:'request',id:r.id,baseVer:null,inPanel:true,f:f?Object.assign(f,{reason:''}):{perTxn:'',daily:'',monthly:'',annual:'',allowedCats:[],blockedCats:[],
    channels:Object.assign({},b.channels),international:b.international,mccAllow:'',mccBlock:'',countryAllow:'',countryBlock:'',effFrom:wbToday(),effTo:'',reason:''}};
  renderADTPage();
}
/* Save a request's starting controls (from ccCtlSave). */
function ccReqCtlSave(F){
  const r=ccReq(F.id);if(!r){ccCtlForm=null;renderADTPage();return;}
  const A=ccNow();
  if(!ccPCan(A,'card.control.manage')){showToast('Not saved','error',caN(A.who)+' cannot change card controls (card.control.manage).');return;}
  if(CC_REQ_ENDED.indexOf(ccReqTrack(r))>=0){showToast('Not saved','error',expKey(r)+' is '+ccReqTrack(r)+'; no card is issued for it.');return;}
  if(ccReqCtlCard(r)){ccCtlForm=null;renderADTPage();showToast('Not saved','error','The card now exists: change its controls in this tab.');return;}
  const chk=ccCtlFormAnalysis(F);if(chk.error){showToast('Not saved','error',chk.error);return;}
  const reason=String(F.f.reason||'').trim();if(!reason){showToast('Not saved','error','Give the reason for these controls.');return;}
  const f=JSON.parse(JSON.stringify(F.f));
  r.startCtl={f:f,set:ccCtlNorm(f),reason:reason,by:A.who,at:ccStamp(A)};
  ccLog(r,ccReqTrack(r),'Starting controls '+(chk.diff&&chk.diff.length?'('+chk.diff.map(function(d){return d.field+' '+d.val;}).join('; ')+') ':'')+'set by '+caN(A.who)+': '+reason+'. They apply to the card when it is issued.',A);
  ccCtlForm=null;renderADTPage();
  showToast('Starting controls saved','success',expKey(r)+': applied to the card when it is issued.');
}
/* The card record is created when the enrollment goes to the provider: the request's starting controls become the card's
   first controls version there - unless the programme has since become stricter than they allow. */
function ccReqApplyStartCtl(r,A){
  if(!r||!r.startCtl||r.startCtl.applied)return;
  const c=ccCardOfReq(r);if(!c)return;
  A=A||ccNow();
  const p=ccProg(c.programmeId),today=wbToday(),progSet=ccProgCtl(p,today),set=ccCtlClone(r.startCtl.set);
  const skip=function(why){r.startCtl.skipped=why;ccLog(r,ccReqTrack(r),'Starting controls not applied to '+expKey(c)+': '+why,A);};
  const ce=ccCtlCeiling(set,progSet,p.currency);if(ce){skip(ce);return;}
  const before=ccCardCtl(c,today),after=ccCtlMerge(progSet,set),relax=ccCtlRelax(before,after,p.currency);
  if(relax.length){skip('they would loosen the programme ('+relax.join('; ')+').');return;}
  const n=ccCtlVersOf('card',c.id).length+1;
  const v={id:ccCtlVerNext++,n:n,scope:'card',targetId:c.id,entity:c.entity,programmeId:p.id,set:set,before:before,after:after,effFrom:today,effTo:'',
    reason:'Starting controls from '+expKey(r)+': '+r.startCtl.reason,relax:[],status:'Approved',changeId:null,createdBy:r.startCtl.by,
    actual:typeof caVia==='function'?caVia(A):'',createdAt:ccStamp(A),approvedAt:ccStamp(A),enforcement:ccCtlEnforcement(p),fromRequest:r.id};
  ccCtlVers.push(v);
  r.startCtl.applied={cardId:c.id,verId:v.id,at:ccStamp(A)};
  ccLog(c,c.status,'Controls v'+n+' ('+expKey(c)+' card restrictions) set from '+expKey(r)+' by '+caN(r.startCtl.by)+', effective '+cdLabel(today)+': '+r.startCtl.reason+'. '+ccCtlEnfNote(p),A);
  ccLog(r,ccReqTrack(r),'Starting controls applied to '+expKey(c)+' (controls v'+n+').',A);
}
(function(){
  /* A request is a control "target" only for its starting controls form. */
  if(typeof ccCtlTarget==='function'){
    const t0=ccCtlTarget;
    ccCtlTarget=function(scope,id){
      if(scope==='request'){const r=ccReq(id);return r?{id:r.id,request:true,prefix:r.prefix,key:r.key,programmeId:r.programmeId,employeeEid:r.employeeEid,entity:r.entity,status:'Not Issued'}:null;}
      return t0.apply(this,arguments);
    };
  }
  if(typeof ccEnrSubmit==='function'){
    const e0=ccEnrSubmit;
    ccEnrSubmit=function(reqId,d,A){
      const err=e0.apply(this,arguments);
      if(!err){try{ccReqApplyStartCtl(ccReq(reqId),A);}catch(e){if(typeof console!=='undefined')console.warn('starting controls',e);}}
      return err;
    };
  }
})();

/* ── Logs: decisions with a note ── */
function ccReqMoves(r){
  const out=[];if(!r||!r.status)return out;
  if(caCanDecide(r))out.push({label:'Approve',to:'Approved'},{label:'Reject',to:'Rejected',need:true},{label:'Send for Follow-Up',to:'Follow-Up',need:true});
  if(caCanReassign(r)&&caReassignPools(r).to.length)out.push({label:'Reassign Approval',kind:'reassign',need:true});
  if(caCanRespond(r))out.push({label:'Resubmit',to:'Awaiting Approval',need:true});
  if(r.wf&&!r.wf.open&&r.wf.exception&&caCan(caPk(r,'reassign')))out.push({label:'Assign Workflow',kind:'assign'});
  return out;
}
function ccReqLogAct(r){return ccRqAct&&r&&ccRqAct.id===r.id?ccRqAct:null;}
function ccReqLogForm(r,moves){
  if(!moves.length)return '';
  const t=ccReqTrack(r),a=ccReqLogAct(r);
  let extra='';
  if(a&&a.kind==='reassign'){
    const st=caActiveStage(r),pp=caReassignPools(r);
    extra='<div class="ep-form-grid" style="grid-template-columns:1fr;margin-bottom:4px">'
      +(st&&st.approvers.length>1?ccField('Replace',true,apCS('ccrl-from',idLabels(pp.from),a.from?idLabel(a.from,pp.from):'','Approver being replaced','ccReqLogFields')):'')
      +ccField('New Approver',true,axCS('ccrl-to',idLabels(pp.to),a.to?idLabel(a.to,pp.to):'','Search approver','ccReqLogFields'))+'</div>';
  }
  const opt=!!(a&&!a.need);
  return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+ccE(t)+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('ccrl-act-'+r.id,t,[t].concat(moves.map(function(m){return m.label;})),'ccReqLogPick')
    +extra
    +'<div class="lp-logs-form-label">Note'+(opt?'':' <span class="lp-logs-form-req">*</span>')+'</div>'
    +'<textarea class="lp-logs-form-textarea" id="ccrl-note" placeholder="'+(opt?'Optional':'Enter note')+'">'+ccE(a?a.note||'':'')+'</textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="ccReqLogCancel()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="ccReqLogSubmit('+r.id+')">Submit</button></div></div>';
}
function ccReqLogsHTML(r){
  const a=ccReqLogAct(r);
  return lpLogsView(r.logs,ccReqLogForm(r,ccReqMoves(r)),{select:true,current:ccReqTrack(r),open:a?a.label:undefined,
    isBack:function(v){return /^(Reject|Send for Follow-Up)/.test(v);}});
}
function ccReqLogPick(val,csid){
  const id=Number(String(csid||'').replace(/^ccrl-act-/,'')),r=ccReq(id);if(!r||!val)return;
  const cur=ccReqLogAct(r);if(cur&&cur.label===val)return;   // the composer opening again after a redraw
  const m=ccReqMoves(r).find(function(x){return x.label===val;});if(!m)return;
  const ta=document.getElementById('ccrl-note');
  ccRqAct=Object.assign({id:id,note:ta?ta.value:(cur?cur.note:''),to:'',from:''},m,{to:m.to||''});
  if(m.kind==='reassign')ccRqAct.to='';
  renderADTPage();   // the note's requirement and any fields follow the action
}
function ccReqLogFields(){
  const a=ccRqAct;if(!a||a.kind!=='reassign')return;
  const r=ccReq(a.id),pp=r?caReassignPools(r):{to:[],from:[]};
  if(document.getElementById('csw-ccrl-to'))a.to=idFromLabel(getCSValue('ccrl-to'),pp.to)||'';
  if(document.getElementById('csw-ccrl-from'))a.from=idFromLabel(getCSValue('ccrl-from'),pp.from)||'';
}
function ccReqLogCancel(){if(ccRqAct){ccRqAct=null;renderADTPage();}}
function ccReqLogSubmit(id){
  const r=ccReq(id),a=ccReqLogAct(r);
  if(!r||!a){showToast('Pick an action','error','Choose what to do from Select action.');return;}
  const ta=document.getElementById('ccrl-note'),note=String(ta?ta.value:a.note||'').trim().replace(/[.\s]+$/,'');
  a.note=ta?ta.value:a.note;
  if(a.need&&!note){if(ta)ta.classList.add('is-invalid');showToast('Note is required','error','Write a note for '+a.label+'.');return;}
  if(a.kind==='reassign'){
    ccReqLogFields();
    const st=caActiveStage(r);
    if(st&&st.approvers.length>1&&!a.from){showToast('Not saved','error','Pick the approver being replaced.');return;}
    const err=caReassign(r.id,a.to,note,null,a.from||undefined);
    if(err){showToast('Not saved','error',err);return;}
    ccRqAct=null;renderADTPage();
    const s=caActiveStage(r);showToast('Approval reassigned','success',expKey(r)+(s?' · Stage '+s.n+' is with '+caNs(s.approvers):'')+'.');return;
  }
  if(a.kind==='assign'){
    const err=caAssignWorkflow(r.id);if(err){showToast('No route','error',err);return;}
    if(note)caLog(r,r.status,'Workflow assigned by '+caN(caMe())+': '+note);
    ccRqAct=null;renderADTPage();
    const s=caActiveStage(r);showToast('Workflow assigned','success',expKey(r)+' · Stage 1 with '+(s?caNs(s.approvers):'nobody')+'.');return;
  }
  /* Approve, Reject, Send for Follow-Up, Resubmit: the engine's own move, with its checks and its message. */
  const mark=function(){return [r.status,(r.logs||[]).length,r.wf?r.wf.current:'',r.wf?r.wf.round:''].join('|');},was=mark();
  ccRqAct=null;
  caLogMove(r.id,a.to,note);
  if(mark()===was){ccRqAct=a;return;}   // refused: keep the composer as it was
  /* The engine keeps a decision's comment on the request's line; the note also goes into the request's own Logs. */
  if(note&&!(r.logs||[]).slice(0,4).some(function(l){return String(l.action||'').indexOf(note)>=0;}))caLog(r,r.status,a.label+' · note by '+caN(caMe())+': '+note);
  if(typeof ccPanelHeadStatus==='function'){const t=ccReqTrack(r);ccPanelHeadStatus('ccr',axBadge(statusTone(t),t));}
  renderADTPage();
}
/* Leaving the Logs tab, the Controls tab or the request ends what was open there. */
function ccReqPanelSync(r){
  if(ccRqAct&&(ccReqTab!=='logs'||ccRqAct.id!==r.id))ccRqAct=null;
  if(ccRqlForm&&(ccReqTab!=='load'||ccRqlForm.reqId!==r.id))ccRqlForm=null;
  if(ccCtlForm&&ccCtlForm.inPanel&&ccPageTab==='requests'){
    const c=ccReqCtlCard(r);
    const mine=ccCtlForm.scope==='request'?ccCtlForm.id===r.id:!!c&&ccCtlForm.scope==='card'&&ccCtlForm.id===c.id;
    if(ccReqTab!=='controls'||!mine)ccCtlForm=null;
  }
}

/* ── Load: the cardholder asks for money on the card (product owner, 11 Nov 2026) ──────────────────────────────
   On a card request whose card is theirs, the cardholder's Load tab raises a load request for the card's company wallet
   (Corporate Expense; benefit wallets are filled by allocations). Every cardholder may ask - no extra right (product
   owner: "every cardholder"). It is an ordinary card load: the programme's funding source, the card-load approval route,
   then execution; admins see it in Requests & Loads → Requests. One open request of the cardholder's per card at a time. */
let ccRqlForm=null;   // {reqId, amount, reason, doc}
let ccRqlSelf=null;   // the cardholder raising a request right now: the load engine accepts their own request
const CC_RQL_OPEN=['Draft','Awaiting Approval','Follow-Up'];
/* The request's card, when it is the viewer's own. */
function ccReqLoadCard(r){
  const c=ccReqCtlCard(r),me=typeof idEmpOfUser==='function'?idEmpOfUser(idMe()):null;
  return c&&me&&me.eid===c.employeeEid?c:null;
}
function ccReqLoadTabOn(r){return !!ccReqLoadCard(r);}
function ccRqlMine(c){const me=idMe();return ccLoads.filter(function(l){return l.cardId===c.id&&l.createdBy===me&&!l.benefit;});}
function ccReqLoadHTML(r){
  const c=ccReqLoadCard(r);if(!c)return '<div class="wb-empty-sm">A load is requested by the cardholder, on their own card.</div>';
  const w=ccLoadTopUpWallet({wallet:''},c),mine=ccRqlMine(c),open=mine.find(function(l){return CC_RQL_OPEN.indexOf(l.status)>=0;});
  const p=ccProg(c.programmeId),cur=p?p.currency:'INR',f=ccRqlForm&&ccRqlForm.reqId===r.id?ccRqlForm:{amount:'',reason:'',doc:''};
  let top;
  if(!ccCardUsable(c))top='<div class="wb-note is-wait"><b>'+ccE(ccMask(c.last4))+' is '+ccE(c.status)+(c.hold&&c.hold.active?' and on hold':'')+'</b><div class="wb-note-sub">A load can be requested once the card is Active.</div></div>';
  else if(!w)top='<div class="wb-empty-sm">This card has no company wallet to load.</div>';
  else if(open)top='<div class="wb-note is-wait"><b>'+ccE(expKey(open))+' is '+ccE(ccLoadLabel(open))+'</b><div class="wb-note-sub">'+ccE(expMoney(open.amount,open.currency))+' requested on '+ccE(wbTypeName(open.wallet))+'. A new request can be raised once it is decided.</div></div>';
  else top='<div class="ep-form-grid">'
      +ccField('Card',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(ccMask(c.last4)+' · '+expKey(c))+'">')
      +ccField('Wallet',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(wbTypeName(w))+'">')
      +ccField('Amount',true,'<div class="ax-currency"><span>'+ccE(cur)+'</span><input class="ep-form-input" id="crl-amount" inputmode="decimal" placeholder="0" value="'+attrSafe(f.amount)+'" oninput="ccRqlSync()"></div>')
      +ccField('Supporting Document',false,f.doc
        ?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.doc)+'</span><button type="button" class="att-link" onclick="ccRqlClearDoc()">Remove</button></div>'
        :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccRqlPickDoc(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · optional</span></span></label>')
      +ccField('Reason',true,'<textarea class="ep-form-input ax-notes" id="crl-reason" placeholder="What the money is for" oninput="ccRqlSync()">'+ccE(f.reason)+'</textarea>','',true)
      +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccRqlCancel()">Cancel</button><button class="ep-save-btn" onclick="ccRqlSubmit('+r.id+')">Submit Request</button></div>';
  const rows=mine.map(function(l){
    return '<tr><td><button class="att-link" onclick="ccOpenLoadUI('+l.id+')">'+ccE(expKey(l))+'</button><div class="ax-sub">'+ccE(String(l.createdAt||'').split(' | ')[0])+'</div></td>'
      +'<td>'+ccE(expMoney(l.amount,l.currency))+'</td><td>'+ccLoadBadge(l)+'</td></tr>';});
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Request Load</span></div>'+top
    +'<div class="lp-sb-view-header" style="margin-top:16px"><span class="lp-sb-section-title">Your Load Requests</span><span class="ax-count">'+mine.length+'</span></div>'
    +(rows.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Load</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No load requested on this card yet.</div>');
}
function ccRqlSync(){
  if(!ccRqlForm||ccRqlForm.reqId!==ccReqSel)ccRqlForm={reqId:ccReqSel,amount:'',reason:'',doc:''};
  const a=document.getElementById('crl-amount'),b=document.getElementById('crl-reason');
  if(a)ccRqlForm.amount=a.value;if(b)ccRqlForm.reason=b.value;
}
function ccRqlPickDoc(input){
  const f=input.files&&input.files[0];input.value='';if(!f)return;
  if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}
  ccRqlSync();ccRqlForm.doc=f.name;renderADTPage();
}
function ccRqlClearDoc(){ccRqlSync();ccRqlForm.doc='';renderADTPage();}
function ccRqlCancel(){ccRqlForm=null;renderADTPage();}
function ccRqlSubmit(reqId){
  ccRqlSync();
  const r=ccReq(reqId),c=ccReqLoadCard(r);if(!c){showToast('Not sent','error','A load is requested by the cardholder, on their own card.');return;}
  const f=ccRqlForm||{},w=ccLoadTopUpWallet({wallet:''},c),A=ccNow();
  if(!ccCardUsable(c)){showToast('Not sent','error',expKey(c)+' is '+c.status+'; a load is requested once the card is Active.');return;}
  const open=ccRqlMine(c).find(function(l){return CC_RQL_OPEN.indexOf(l.status)>=0;});
  if(open){showToast('Not sent','error',expKey(open)+' is still '+ccLoadLabel(open)+'.');return;}
  const amt=String(f.amount||'').replace(/,/g,'').trim(),reason=String(f.reason||'').trim();
  if(!(Number(amt)>0)){const el=document.getElementById('crl-amount');if(el)el.classList.add('is-invalid');showToast('Not sent','error','Enter the amount (more than zero).');return;}
  if(reason.length<5){const el=document.getElementById('crl-reason');if(el)el.classList.add('is-invalid');showToast('Not sent','error','Give the reason (at least 5 characters).');return;}
  const p=ccProg(c.programmeId),fund=ccProgFunding(p);
  let res;ccRqlSelf=A.who;
  try{res=ccLoadCreate({cardId:c.id,wallet:w,amount:amt,currency:p.currency,sourceId:fund.sourceId||'',reason:reason,comments:'Requested by the cardholder from '+expKey(r)+'.',doc:f.doc||''},true,A);}
  finally{ccRqlSelf=null;}
  if(res.error){showToast('Not sent','error',res.error);return;}
  const l=res.rec;l.selfRequest={by:A.who,from:r.id};
  ccLog(l,l.status,'Requested by the cardholder, '+caN(A.who)+', from '+expKey(r)+'.',A);
  ccRqlForm=null;renderADTPage();
  const st=caActiveStage(l);
  showToast('Load requested','success',expKey(l)+' · '+expMoney(l.amount,l.currency)+' on '+wbTypeName(l.wallet)+(st?' is with Stage '+st.n+' · '+caNs(st.approvers):' is '+ccLoadLabel(l))+'.');
}
(function(){
  /* The load engine accepts the cardholder's own request (its other checks - card, wallet, amount, limits, funding,
     duplicates - are unchanged). */
  if(typeof ccLoadMay==='function'){
    const m0=ccLoadMay;
    ccLoadMay=function(A){if(ccRqlSelf&&A&&A.who===ccRqlSelf)return '';return m0.apply(this,arguments);};
  }
})();
