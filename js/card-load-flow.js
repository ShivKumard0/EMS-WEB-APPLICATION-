/* ══ CARD LOADS: Manager → Finance approval in Logs, then Load (product owner, 12 Nov 2026) ═══════════════════
   The load flow the company admin runs from one screen:
   1. A load request (e.g. an employee's, from the Load tab of their card request) sits at the top of Requests & Loads.
   2. Its ☰ → Logs → Select action: Approve Load / Reject Load / Send for Follow-Up, with a note. The route is
      Manager review → Finance review. The company admin decides each step in his own name: as the step's approver
      when the route falls back to him, otherwise as an audited Super Admin decision (the note is its reason). In the
      presentation company the card-approval rule "only the step's own approver" is relaxed for this - card loads only.
   3. Its ☰ → Load: once approved, the request is shown prefilled; Load records it as loaded, and the amount appears in
      the employee's balances (My Cards, the card's Wallets tab, My Profile → Wallet & Benefits).
   The load's Approval tab is removed (its stages are in Workflow); a benefit load keeps it, read-only, for what authorized
   it. My Approvals → Review still works. */
let ccLdAct=null;   // the action picked in a load's Logs: {id, label, to, need, note}

/* ── 1 · The route in the presentation company: Manager review → Finance review ── */
function ccLoadRouteFix(){
  const nova=typeof presNova==='function'?presNova():null;if(!nova||typeof caWorkflows==='undefined')return;
  const ent=nova.entityId||nova.id;
  const ks=typeof idUserByEmail==='function'?(idUserByEmail('karan.shah@novaretail.in')||{}).userId:'';
  caWorkflows.forEach(function(w){
    if(w.entity!==ent||caWfKindOf(w)!=='Card Load'||w.mgrFin)return;
    const at=typeof stampNow==='function'?(function(){const s=stampNow();return s.date+' | '+s.time;})():'';
    /* Finance review: the same Finance approver as Expenses & Advances, the Finance/Billing Admin (product owner, 13 Nov
       2026: Rohan Mehta in Nova; the company admin can still decide in his place). */
    w.stages=[caStageDef(1,'Manager review','Reporting Manager','',{fallback:ks}),caStageDef(2,'Finance review','Role','Finance/Billing Admin',{rule:'Any One',fallback:ks})];
    w.name='Card loads - manager then finance';w.desc='Card loads: the employee\'s reporting manager, then Finance.';
    w.independent=false;w.version=(w.version||1)+1;w.mgrFin=true;
    (w.versions=w.versions||[]).push({v:w.version,at:at,by:ks,reason:'Manager then Finance (product owner, 12 Nov 2026)',stages:JSON.parse(JSON.stringify(w.stages))});
  });
}
/* Only in the presentation company itself (Nova), whatever environment the page runs in. */
function ccLoadIvRelaxed(r){
  if(!r||r.kind!=='card load'||typeof presNova!=='function')return false;
  const n=presNova();return !!n&&r.entity===(n.entityId||n.id);
}

/* ── 2 · Logs: Approve Load / Reject Load / Send for Follow-Up / Resubmit ── */
function ccLoadMoves(l){
  const out=[];if(!l||l.noEngine||!l.wf)return out;
  if(caCanDecide(l)){const iv=caIsIntervention(l);
    out.push({label:'Approve Load',to:'Approved',need:iv},{label:'Reject Load',to:'Rejected',need:true},{label:'Send for Follow-Up',to:'Follow-Up',need:true});}
  if(caCanRespond(l))out.push({label:'Resubmit',to:'Awaiting Approval',need:true});
  return out;
}
function ccLdActOf(l){return ccLdAct&&l&&ccLdAct.id===l.id?ccLdAct:null;}
function ccLoadLogForm(l,moves){
  if(!moves.length)return '';
  const t=ccLoadLabel(l),a=ccLdActOf(l),opt=!!(a&&!a.need);
  return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+ccE(t)+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('ccll-act-'+l.id,t,[t].concat(moves.map(function(m){return m.label;})),'ccLoadLogPick')
    +'<div class="lp-logs-form-label">Note'+(opt?'':' <span class="lp-logs-form-req">*</span>')+'</div>'
    +'<textarea class="lp-logs-form-textarea" id="ccll-note" placeholder="'+(opt?'Optional':'Enter note')+'">'+ccE(a?a.note||'':'')+'</textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="ccLoadLogCancel()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="ccLoadLogSubmit('+l.id+')">Submit</button></div></div>';
}
function ccLoadLogsHTML(l){
  const a=ccLdActOf(l);
  return lpLogsView(l.logs,ccLoadLogForm(l,ccLoadMoves(l)),{select:true,current:ccLoadLabel(l),open:a?a.label:undefined,
    isBack:function(v){return /^(Reject|Send for Follow-Up)/.test(v);}});
}
function ccLoadLogPick(val,csid){
  const id=Number(String(csid||'').replace(/^ccll-act-/,'')),l=ccLoad(id);if(!l||!val)return;
  const cur=ccLdActOf(l);if(cur&&cur.label===val)return;
  const m=ccLoadMoves(l).find(function(x){return x.label===val;});if(!m)return;
  const ta=document.getElementById('ccll-note');
  ccLdAct=Object.assign({id:id,note:ta?ta.value:(cur?cur.note:'')},m);
  renderADTPage();
}
function ccLoadLogCancel(){if(ccLdAct){ccLdAct=null;renderADTPage();}}
function ccLoadLogSubmit(id){
  const l=ccLoad(id),a=ccLdActOf(l);
  if(!l||!a){showToast('Pick an action','error','Choose what to do from Select action.');return;}
  const ta=document.getElementById('ccll-note'),note=String(ta?ta.value:a.note||'').trim().replace(/[.\s]+$/,'');
  a.note=ta?ta.value:a.note;
  if(a.need&&!note){if(ta)ta.classList.add('is-invalid');showToast('Note is required','error','Write a note for '+a.label+'.');return;}
  const mark=function(){return [l.status,(l.logs||[]).length,l.wf?l.wf.current:'',l.wf?l.wf.round:''].join('|');},was=mark();
  ccLdAct=null;
  caLogMove(l.id,a.to,note);
  if(mark()===was){ccLdAct=a;return;}
  if(note&&!(l.logs||[]).slice(0,4).some(function(x){return String(x.action||'').indexOf(note)>=0;}))caLog(l,l.status,a.label+' · note by '+caN(caMe())+': '+note);
  ccPanelHeadStatus('ccl',ccLoadBadge(l));renderADTPage();
}
/* The panel's header on a tab without its own keeps the record it last read; after a decision in Logs its status is
   brought up to date here (the header itself is the shared panel's, js/core.js). */
function ccPanelHeadStatus(p,badge){if(typeof SB_POP_REC!=='undefined'&&SB_POP_REC[p])SB_POP_REC[p].status=badge;}

/* ── 3 · Load tab: the approved request, prefilled → Load ── */
function ccLoadLoadTabHTML(l){
  const c=ccCard(l.cardId),st=caActiveStage(l);
  const sum='<div class="ep-form-grid">'
    +ccField('Card',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(c?ccMask(c.last4)+' · '+expKey(c)+' · '+ccHolderName(c):'')+'">')
    +ccField('Wallet',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(wbTypeName(l.wallet))+'">')
    +'%AMT%'
    +ccField('Reason',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(l.reason||'')+'">')
    +'</div>';
  const ro=function(v){return ccField('Amount',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(v)+'">');};
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Load</span></div>';
  if(['Draft','Awaiting Approval','Follow-Up'].indexOf(l.status)>=0)
    return head+'<div class="wb-note is-wait"><b>Waiting for approval</b><div class="wb-note-sub">'+(st?'Stage '+st.n+' · '+ccE(st.name)+' · '+ccE(caNs(st.approvers)||'unassigned'):ccE(l.status))+'. Approve it from the Logs tab; it can be loaded once approved.</div></div>'
      +sum.replace('%AMT%',ro(expMoney(l.amount,l.currency)));
  if(!l.exec)return head+'<div class="wb-empty-sm">'+ccE(expKey(l))+' is '+ccE(ccLoadLabel(l))+'; there is nothing to load.</div>'+sum.replace('%AMT%',ro(expMoney(l.amount,l.currency)));
  const loaded=ccLoadExecs.filter(function(e){return e.loadId===l.id&&e.type==='execution'&&e.result==='Recorded'&&['Applied','Verified'].indexOf(e.status)>=0;});
  const done=loaded.length?'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Loaded</span></div><div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Amount</th><th>Date</th><th>By</th></tr></thead><tbody>'
    +loaded.map(function(e){return '<tr><td><b>'+ccE(expMoney(e.amount,l.currency))+'</b></td><td>'+ccE(cdLabel(e.date))+'</td><td>'+ccE(caN(e.recordedBy))+'</td></tr>';}).join('')+'</tbody></table></div>':'';
  const open=CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed&&ccLoadRemaining(l)>0;
  if(!open)return head+sum.replace('%AMT%',ro(expMoney(l.amount,l.currency)))+done;
  const aw=ccLoadExecAwaiting(l);
  if(aw)return head+'<div class="wb-note is-wait"><b>'+ccE(expKey(aw))+' awaits verification</b><div class="wb-note-sub">Recorded by '+ccE(caN(aw.recordedBy))+'; it takes effect once someone else verifies it in the Execution tab.</div></div>'+sum.replace('%AMT%',ro(expMoney(l.amount,l.currency)))+done;
  if(!ccCan('card.load.create'))return head+sum.replace('%AMT%',ro(expMoney(ccLoadRemaining(l),l.currency)))+done;
  const rem=ccLoadRemaining(l);
  const amt=ccField('Amount',true,'<div class="ax-currency"><span>'+ccE(l.currency)+'</span><input class="ep-form-input" id="cclt-amount" inputmode="decimal" value="'+attrSafe(String(rem))+'"></div>',
    rem<l.amount?expMoney(rem,l.currency)+' of '+expMoney(l.amount,l.currency)+' left to load.':'');
  const demo=typeof ccDemoOn==='function'&&ccDemoOn(l.entity);
  return head+sum.replace('%AMT%',amt)
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccLoadNav(\'basic-details\')">Cancel</button>'
    +(demo?'<button class="ep-save-btn" onclick="ccLoadLoadNow('+l.id+')">Load</button>':'<button class="ep-save-btn" onclick="ccLoadNav(\'execution\')">Record in Execution</button>')+'</div>'+done;
}
function ccLoadLoadNow(id){
  const l=ccLoad(id);if(!l)return;
  const el=document.getElementById('cclt-amount'),amt=el?el.value:'';
  const res=ccLoadExecRecord(l.id,{result:'Recorded',amount:amt,source:CC_DEMO,note:'Loaded from the Load tab'});
  if(res&&res.error){showToast('Not loaded','error',res.error);return;}
  renderADTPage();
  const c=ccCard(l.cardId),e=res&&res.rec;
  showToast('Loaded','success',expKey(l)+' · '+expMoney(e?e.amount:l.amount,l.currency)+' added to '+wbTypeName(l.wallet)+(c?' on '+ccMask(c.last4)+' ('+ccHolderName(c)+')':'')+'.');
}

(function(){
  /* The company admin decides card-load steps in the presentation company (rule relaxed for card loads only). */
  if(typeof caCanIntervene==='function'){
    const ci0=caCanIntervene;
    caCanIntervene=function(r,who){
      if(!ccLoadIvRelaxed(r))return ci0.apply(this,arguments);
      who=who||caMe();
      if(who!==caMe()||!caCan(caPk(r,'intervene')))return false;
      const st=caActiveStage(r);if(!st||st.approvers.indexOf(who)>=0||caSoD(r,who))return false;
      const open=st.lineIds.some(function(id){return !caStageResult(st,r.lines.find(function(x){return x.id===id;}));});
      if(st.rule==='All'&&st.approvers.length>1)return open&&caUndecided(st).length>0;
      return open;
    };
  }
  /* The route, once the presentation data is in place (built or restored). */
  if(typeof window!=='undefined')Promise.resolve(window.PRES_READY).then(function(){try{ccLoadRouteFix();}catch(e){if(typeof console!=='undefined')console.warn('card load route',e);}});
})();
