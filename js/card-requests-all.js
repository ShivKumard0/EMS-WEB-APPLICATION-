/* ══ REQUESTS & LOADS: one Requests list (product owner, 11 Nov 2026) ══════════════════════════════════════
   Card Requests and Card Loads are one view, "Requests": the strip reads Requests · Bulk Files · Benefit Loads.
   - One list of every card request (new card, replacement, wallet request) and every card load (company and benefit),
     newest first. Columns: Request (ID and type) · Employee (and card) · Details (programme or wallet) · Amount (loads)
     · Status · Current Stage · Actions. Each row opens its own panel - a request's or a load's - exactly as before.
   - Boxes for what needs acting on: Awaiting Approval, Follow-Up, Enrollment Pending, Awaiting Execution, Rejected,
     Failed. Finished items are found through the Status filter.
   - The + beside the page title opens New Card Request; a load is made from a load's or a card's ☰ (Load tab).
   Records, rules and panels are unchanged: the old views' state (ccPageTab 'requests'/'loads') still decides which
   panel is open, so every link to a request or a load lands on this list with its panel open. Employees keep My Requests. */
let ccRqaQ='',ccRqaTypeF='',ccRqaProgF='',ccRqaStatusF='';
const CC_RQA_TYPES=['New Card','Replacement','Wallet Request','Load Request','Company Load','Benefit Load'];
const CC_RQA_STATES=['Draft','Awaiting Approval','Follow-Up','Enrollment Pending','Enrollment Completed','Awaiting Execution','Processing','Partially Recorded','Recorded','Failed','Rejected','Withdrawn','Cancelled'];
/* For now (product owner, 13 Nov 2026: "just show the wallet request and loading request, other than that remove it"):
   the list holds only
   - Wallet Request: a top-up of a benefit wallet (Meal, Fuel, Gift, Telecom, Health …), raised from Expenses & Advances
     → Card Load, on the card-load route Manager review → Finance review → Load;
   - Benefit Load: the monthly Wallet & Benefits loads.
   New cards, replacements, add-a-wallet requests and Corporate Expense loads are not listed (their records and panels
   are unchanged). No New Card Request +, no Bulk Files / Benefit Loads strip, no Enrollment Pending box. False = as before. */
const CC_RQA_TOPUPS_ONLY=true;
function ccRqaOn(){return typeof ccAdminView!=='function'||ccAdminView();}
function ccRqaStampMs(s){const t=Date.parse(String(s||'').replace(' | ',' '));return isNaN(t)?0:t;}
/* One row per request and per load this person may see. */
function ccRqaItems(){
  const out=[];
  if(!CC_RQA_TOPUPS_ONLY)ccRequests.filter(ccReqVisible).forEach(function(r){
    const p=ccProg(r.programmeId),c=typeof ccReqCtlCard==='function'?ccReqCtlCard(r):ccCardOfReq(r);
    const type=r.kind==='wallet request'?'Wallet Request':r.kind==='card replacement'?'Replacement':'New Card';
    out.push({kind:'req',rec:r,id:r.id,key:expKey(r),type:type,typeSub:r.kind==='wallet request'?'':r.cardType,name:r.name,empId:r.empId,
      whoSub:c?ccMask(c.last4)+' · '+expKey(c):r.mode==='On Behalf'?'requested by '+caN(r.createdBy):r.mode==='Automatic'?'issued automatically':'self-request',
      details:r.kind==='wallet request'?r.wallets.map(wbTypeName).join(', '):(p?p.name:''),detailsSub:p?p.key:'',
      prog:p?ccProgLabel(p):'',status:ccReqTrack(r),at:ccRqaStampMs(r.createdAt)});
  });
  ccLoads.filter(ccLoadVisible).forEach(function(l){
    const c=ccCard(l.cardId),p=ccProg(l.programmeId),ben=(l.origin&&l.origin.type==='Benefit')||!!l.benefit;
    if(CC_RQA_TOPUPS_ONLY&&!ben&&l.wallet==='CORP')return;
    out.push({kind:'load',rec:l,id:l.id,key:expKey(l),type:CC_RQA_TOPUPS_ONLY?(ben?'Benefit Load':'Wallet Request'):l.selfRequest?'Load Request':ben?'Benefit Load':'Company Load',typeSub:ccOriginText(l).replace(/^Benefit allocation /,'').replace(/^Individual$/,''),
      name:l.name,empId:l.empId,whoSub:c?ccMask(c.last4)+' · '+expKey(c):'',details:wbTypeName(l.wallet),detailsSub:p?p.code||p.key:'',
      prog:p?ccProgLabel(p):'',status:ccLoadLabel(l),at:ccRqaStampMs(l.createdAt)});
  });
  out.sort(function(a,b){return b.at-a.at||(a.kind===b.kind?b.id-a.id:0);});
  return out;
}
function ccRqaShown(all){
  const q=String(ccRqaQ||'').trim().toLowerCase();
  return all.filter(function(x){
    if(q&&![x.key,x.type,x.name,x.empId,x.details,x.prog,x.whoSub,x.rec.reason].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccRqaTypeF&&x.type!==ccRqaTypeF)return false;
    if(ccRqaProgF&&x.prog!==ccRqaProgF)return false;
    if(ccRqaStatusF&&x.status!==ccRqaStatusF)return false;
    return true;
  });
}
function ccRqaRowHTML(x,i,sel){
  const r=x.rec,isReq=x.kind==='req',open=isReq?'ccRqaOpenReq('+x.id+')':'ccRqaOpenLoad('+x.id+')';
  const amt=isReq?'<span class="wb-muted">—</span>':ccE(expMoney(r.amount,r.currency))+(r.fxCard?'<div class="lp-c-sub">'+ccE(expMoney(r.cardAmount,r.cardCurrency))+'</div>':'')
    +(r.exec&&r.exec.reversed?'<div class="lp-c-sub">'+ccE(expMoney(r.exec.reversed,r.currency))+' reversed</div>':'');
  const status=isReq?axBadge(statusTone(x.status),x.status)+(r.enr&&['Completed','Cancelled'].indexOf(r.enr.status)<0?'<div class="lp-c-sub">Enrollment '+ccE(r.enr.status)+' · KYC '+ccE(r.enr.kyc)+'</div>':'')
    :ccLoadBadge(r)+(r.exec&&r.exec.recorded>0&&r.exec.status==='Partially Recorded'?'<div class="lp-c-sub">'+ccE(expMoney(r.exec.recorded,r.currency))+' recorded</div>':'');
  return '<tr class="'+(isReq?'ccr-row':'ccl-row')+(sel?' lp-row-selected':'')+'" id="'+(isReq?'ccr-row-':'ccl-row-')+x.id+'" style="cursor:pointer" onclick="'+open+'">'
    +'<td class="lp-c-n">'+(i+1)+'</td>'
    +'<td><div class="lp-c-main ax-c-link">'+ccE(x.key)+'</div><div class="lp-c-sub">'+ccE(x.type+(x.typeSub?' · '+x.typeSub:''))+'</div></td>'
    +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(x.name)+'</div><div class="lp-c-sub">'+ccE(x.whoSub)+'</div></td>'
    +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(x.details)+'</div><div class="lp-c-sub">'+ccE(x.detailsSub)+'</div></td>'
    +'<td class="exp-c-amt" style="white-space:nowrap">'+amt+'</td>'
    +'<td>'+status+'</td>'
    +'<td class="ca-c-stage">'+(isReq?caStageCell(r):ccLoadStageCell(r))+'</td>'
    +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(x.key)+'" onclick="'+open+'">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td></tr>';
}
function ccRqaListHTML(){
  if(typeof ccLoadsSweepExpiry==='function')ccLoadsSweepExpiry();
  const all=ccRqaItems(),rows=ccRqaShown(all);
  /* The open panel: a load's when the loads state is on screen, else a request's - the other selection is cleared. */
  const onLoad=ccPageTab==='loads';
  if(onLoad)ccReqSel=null;else ccLoadSel=null;
  if(onLoad&&ccLoadSel!=null&&!rows.some(function(x){return x.kind==='load'&&x.id===ccLoadSel;}))ccLoadSel=null;
  if(!onLoad&&ccReqSel!=null&&!rows.some(function(x){return x.kind==='req'&&x.id===ccReqSel;}))ccReqSel=null;
  const pgn=listPage('cards-rqall',[ccRqaQ,ccRqaTypeF,ccRqaProgF,ccRqaStatusF].join('|'),rows.map(function(x,i){
    return ccRqaRowHTML(x,i,x.kind==='load'?onLoad&&ccLoadSel===x.id:!onLoad&&ccReqSel===x.id);
  }),ccEmpty(8,'No request or load matches this filter.'));
  const cnt=function(s){return all.filter(function(x){return x.status===s;}).length;};
  const tile=function(s,tone){return caStat(s,cnt(s),ccRqaStatusF===s,'ccRqaStat(\''+s+'\')',tone);};
  const tiles=tile('Awaiting Approval')+tile('Follow-Up','wait')+(CC_RQA_TOPUPS_ONLY?'':tile('Enrollment Pending','wait'))+tile('Awaiting Execution','wait')+tile('Rejected','bad')+tile('Failed','bad');
  const types=CC_RQA_TYPES.filter(function(t){return all.some(function(x){return x.type===t;});});
  const states=(CC_RQA_TOPUPS_ONLY?CC_RQA_STATES.filter(function(s){return all.some(function(x){return x.status===s;});}):CC_RQA_STATES).concat(all.map(function(x){return x.status;}).filter(function(s,i,a){return CC_RQA_STATES.indexOf(s)<0&&a.indexOf(s)===i;}));
  return ccFilterBar(lpSearchField('cra-f-q',ccRqaQ,'Search request, employee, card or wallet','ccRqaApply()')
      +apCS('cra-f-type',types,ccRqaTypeF,'All Types')
      +apCS('cra-f-prog',ccProgs().map(ccProgLabel),ccRqaProgF,'All Programmes')
      +apCS('cra-f-status',states,ccRqaStatusF,'All Statuses')
      +clearFiltersBtn([ccRqaQ,ccRqaTypeF,ccRqaProgF,ccRqaStatusF],'ccRqaReset()')+'<button class="lp-pill-search" onclick="ccRqaApply()">Search</button>',tiles)
    +ccDemoNote()+(all.some(function(x){return x.kind==='load';})?ccLoadNote():'')
    +ccSplit(onLoad?'ccl':'ccr','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Request</th><th>Employee</th><th>Details</th><th>Amount</th><th>Status</th><th>Current Stage</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,onLoad?ccLoadSel!=null:ccReqSel!=null,onLoad?renderCclSidebar:renderCcrSidebar);
}
function ccRqaPageHTML(){
  return '<div class="lp-page">'+dashboardBackHTML()+ccRqStrip()+ccRqaListHTML()+'</div>'+(ccReqForm?ccReqFormHTML():'');
}
function ccRqaApply(){
  ccRqaQ=lpSearchValue('cra-f-q');
  const t=getCSValue('cra-f-type'),p=getCSValue('cra-f-prog'),s=getCSValue('cra-f-status');
  ccRqaTypeF=t==='All Types'?'':t||'';ccRqaProgF=p==='All Programmes'?'':p||'';ccRqaStatusF=s==='All Statuses'?'':s||'';
  ccReqSel=null;ccLoadSel=null;renderADTPage();
}
function ccRqaReset(){ccRqaQ='';ccRqaTypeF='';ccRqaProgF='';ccRqaStatusF='';ccReqSel=null;ccLoadSel=null;renderADTPage();}
function ccRqaStat(s){ccRqaStatusF=ccRqaStatusF===s?'':s;ccReqSel=null;ccLoadSel=null;renderADTPage();}
/* A row opens its own panel; switching between a request and a load redraws the list with the right panel. */
function ccRqaOpenReq(id){
  if(ccPageTab!=='requests'){ccCloseForms();ccLoadSel=null;ccPageTab='requests';ccReqSub='requests';}
  ccReqOpen(id);
}
function ccRqaOpenLoad(id){
  if(ccPageTab!=='loads'){ccCloseForms();ccReqSel=null;ccPageTab='loads';ccLoadSub='loads';}
  ccLoadOpen(id);
}
(function(){
  /* The strip: Requests · Bulk Files · Benefit Loads. */
  if(typeof ccRqViews==='function'){
    const v0=ccRqViews;
    ccRqViews=function(){
      const v=v0.apply(this,arguments);if(!ccRqaOn())return v;
      if(CC_RQA_TOPUPS_ONLY)return [['all','Requests']];   // one view: the strip is not drawn
      const at=v.findIndex(function(x){return x[0]==='crq'||x[0]==='cld';});if(at<0)return v;
      const rest=v.filter(function(x){return x[0]!=='crq'&&x[0]!=='cld';});rest.splice(at,0,['all','Requests']);return rest;
    };
  }
  if(typeof ccRqView==='function'){
    const w0=ccRqView;
    ccRqView=function(){const k=w0.apply(this,arguments);return ccRqaOn()&&(k==='crq'||k==='cld')?'all':k;};
  }
  if(typeof ccRqPick==='function'){
    const p0=ccRqPick;
    ccRqPick=function(k){
      if(k!=='all')return p0.apply(this,arguments);
      if(ccRqView()==='all')return;
      ccCloseForms();ccSel=null;ccReqSel=null;ccLoadSel=null;ccBulkSel=null;ccPageTab='requests';ccReqSub='requests';renderADTPage();
    };
  }
  /* The list itself, wherever the old Card Requests or Card Loads view would have been drawn. */
  if(typeof ccRequestsHTML==='function'){
    const r0=ccRequestsHTML;
    ccRequestsHTML=function(){
      if(ccRqaOn()&&!(typeof ccReqSub!=='undefined'&&ccReqSub==='bulk'))return ccRqaPageHTML();
      return r0.apply(this,arguments);
    };
  }
  if(typeof ccLoadsHTML==='function'){
    const l0=ccLoadsHTML;
    ccLoadsHTML=function(){
      if(ccRqaOn()&&ccLoadSub==='loads'&&ccLoadSubs().some(function(x){return x[0]==='loads';}))return ccRqaPageHTML();
      return l0.apply(this,arguments);
    };
  }
  /* Links that open a request or a load clear this list's filters too, so the record is in view. */
  ['ccOpenReqUI','ccOpenLoadUI'].forEach(function(n){
    const f0=window[n];if(typeof f0!=='function')return;
    window[n]=function(){ccRqaQ='';ccRqaTypeF='';ccRqaProgF='';ccRqaStatusF='';return f0.apply(this,arguments);};
  });
  /* + beside the page title: New Card Request (a load is made from a load's or a card's ☰). */
  if(typeof ccCanAddHere==='function'){
    const a0=ccCanAddHere;
    ccCanAddHere=function(){
      if(ccRqaOn()&&(ccPageTab==='requests'||ccPageTab==='loads')&&ccRqView()==='all')
        return !CC_RQA_TOPUPS_ONLY&&(ccCan('card.request.create')||ccCan('card.request.others'))&&ccProgs().some(function(p){return ccProgActive(p);});
      return a0.apply(this,arguments);
    };
  }
  if(typeof ccStartAddHere==='function'){
    const s0=ccStartAddHere;
    ccStartAddHere=function(){
      if(ccRqaOn()&&(ccPageTab==='requests'||ccPageTab==='loads')&&ccRqView()==='all'){ccReqStart();return;}
      return s0.apply(this,arguments);
    };
  }
})();
