/* ══ ADVANCES & IMPREST - the page (FR-AI, Build 5) ════════════════════════
   Expense Management → Advances & Imprest: Advances, Imprest Funds,
   Settlements, Advance Settings and Reports. The rules live in
   js/advances.js; approval decisions use the shared Build 4 review popup -
   from Expenses → Pending My Approval, or the Approval tab here.

   Nothing on this page moves money. Every figure shown is computed from the
   recorded events of an advance or fund (approval, verified disbursement,
   accepted expenses, verified returns and recoveries); a bank or card
   balance is never shown, because no provider is connected. */

let advPageTab='advances',advSel=null,advTab='basic-details',impReqSel=null;
let advQ='',advTypeF='',advStatusF='',advDisbF='',advSetF='';
let impQ='',impStatusF='';
let stlQ='',stlStatusF='';
let advSetSub='types';
let advForm=null,advAct=null,impForm=null,advTypeForm=null,advPolForm=null,advCfgDraft=null;
let advRep='requests',advRF={ent:'',emp:'',dept:'',type:'',status:'',cur:'',from:'',to:'',card:''};

const ADV_STATUSES=['Draft','Awaiting Approval','Follow-Up','Approved','Partially Approved','Rejected','Withdrawn','Cancelled'];
const ADV_DISB_STATUSES=['Not Initiated','Ready for Disbursement','Processing','Partially Disbursed','Disbursed','Failed','Cancelled'];
const ADV_SETTLE_STATUSES=['Not Started','In Progress','Under Review','Partially Settled','Settled','Closed','Overdue'];
const IMP_STATUSES=['Draft','Active','On Hold','Closing','Closed'];
const ADV_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>',
  fund:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18v12H3z"/><path d="M3 7l3-4h12l3 4"/><path d="M12 11v4M10 13h4"/></svg>'
};
sbToneAdd({'ready-for-disbursement':'info','partially-disbursed':'info',disbursed:'ok','not-initiated':'idle','not-started':'idle','in-progress':'wait',
  'under-review':'wait','partially-settled':'info',settled:'ok',closed:'idle',closing:'wait',verified:'ok',reversed:'idle','pending-verification':'wait',
  scheduled:'info',expired:'idle'});
Object.assign(supportPageMeta,{'advances':{title:'Advances & Imprest',context:'Advances & Imprest',filters:[],columns:[],rows:[]}});

/* ── Small helpers ─────────────────────────────────────────────────────── */
function advE(s){return sbEsc(String(s==null?'':s));}
function advMatch(list,q){
  q=String(q||'').trim().toLowerCase();if(!q)return list;
  return list.filter(function(r){return [expKey(r),r.title,r.name,r.category,r.purpose,r.empId].concat(r.kind==='fund'?[idEmpName(r.custodianEid)]:[])
    .some(function(v){return v!=null&&String(v).toLowerCase().indexOf(q)>=0;});});
}
/* Money per currency, never added across currencies: ₹1,000 + $20. */
function advByCur(list,fnAmt,fnCur){
  const m={};list.forEach(function(x){const c=fnCur(x),a=Number(fnAmt(x))||0;if(!a)return;m[c]=Math.round(((m[c]||0)+a)*100)/100;});return m;
}
function advCurText(m){const k=Object.keys(m);return k.length?k.map(function(c){return expMoney(m[c],c);}).join(' + '):expMoney(0,'INR');}
function advBtn(label,call,primary){return '<button class="btn '+(primary?'btn-primary ca-review-btn':'btn-outline')+' btn-sm" onclick="'+call+'">'+label+'</button>';}
function advCard(k,v,e,click){return '<div class="wb-proj-card'+(click?' adv-card-click':'')+'"'+(click?' onclick="'+click+'" title="Open the records behind this figure"':'')+'><span>'+k+'</span><b>'+v+'</b>'+(e?'<em>'+e+'</em>':'')+'</div>';}
function advOwnHolder(h){const me=advMyEid();return !!me&&(h.kind==='fund'?h.custodianEid===me:h.employeeEid===me);}
function advInScope(h){if(!h)return false;return h.kind==='fund'?impScope(impFunds).indexOf(h)>=0:h.kind==='advance'?advScope(advancesData).indexOf(h)>=0:false;}
function advSettleShown(h){return advIsOverdue(h)?'Overdue':advSettleStatus(h);}
function advEmpOptions(){return idEmpsIn(advEnt()).filter(function(e){return !!idUserOfEmp(e.eid);}).map(function(e){return e.name+' · '+e.empId;});}
function advEmpFromLabel(v){const e=idEmpsIn(advEnt()).find(function(x){return x.name+' · '+x.empId===v;});return e?e.eid:'';}
function advEmpLabel(eid){const e=idEmp(eid);return e?e.name+' · '+e.empId:'';}
/* Employees RBAC authorizes to hold an imprest fund. */
function impCustodianOptions(){return idEmpsIn(advEnt()).filter(function(e){return !impCustodianIssue(e.eid);}).map(function(e){return e.name+' · '+e.empId;});}
function advDesigs(){const s=[];idEmpsIn(advEnt(),true).forEach(function(e){if(e.jobTitle&&s.indexOf(e.jobTitle)<0)s.push(e.jobTitle);});return s.sort();}

/* ── Page shell ────────────────────────────────────────────────────────── */
function advPageTabs(){
  const t=[{id:'advances',label:'Advances'}];
  if(advCan('advance.view.all')||advCan('advance.imprest.manage')||impScope(impFunds).length)t.push({id:'imprest',label:'Imprest Funds'});
  t.push({id:'settlements',label:'Settlements'});
  if(advCan('advance.settings.manage')||advCan('advance.policy.manage'))t.push({id:'settings',label:'Advance Settings'});
  if(advCan('advance.report.view'))t.push({id:'reports',label:'Reports'});
  return t;
}
function advFormOpen(){return !!(advForm||advAct||impForm||advTypeForm||advPolForm||caRev||caAct||awfModal);}
function advCloseForms(){advForm=null;advAct=null;impForm=null;advTypeForm=null;advPolForm=null;caRev=null;caAct=null;awfModal=null;}
function advSetPageTab(t){
  if(advPageTab===t)return;
  if(advSel!=null&&sbLeaveGuard('adv',function(){advSetPageTab(t);}))return;
  advCloseForms();advSel=null;impReqSel=null;awfSel=null;advPageTab=t;renderADTPage();
}
function buildAdvancesHTML(){
  advTick();
  awfKinds=['Advance','Imprest'];
  const tabs=advPageTabs();
  if(!tabs.some(function(t){return t.id===advPageTab;}))advPageTab='advances';
  let body;
  if(advPageTab==='imprest')body=impListHTML();
  else if(advPageTab==='settlements')body=stlListHTML();
  else if(advPageTab==='settings')body=advSettingsHTML();
  else if(advPageTab==='reports')body=advReportsHTML();
  else body=advListHTML();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,advPageTab,'advSetPageTab',true)+body+'</div>'
    +(advForm?advFormHTML():'')+(impForm?impFormHTML():'')+(advTypeForm?advTypeFormHTML():'')+(advPolForm?advPolFormHTML():'')
    +(advAct?advActHTML():'')+(caRev?caReviewHTML():'')+(caAct?caActHTML():'')+(awfModal?awfModalHTML():'');
}
/* The header + creates what the open tab lists. */
function advCanAddHere(){
  if(advPageTab==='advances')return advCan('advance.create')||advCan('advance.create.others');
  if(advPageTab==='imprest')return advCan('advance.imprest.manage');
  if(advPageTab==='settings')return advSetSub==='policies'?advCan('advance.policy.manage'):advSetSub!=='general'&&advCan('advance.settings.manage');
  return false;
}
function advStartAddHere(){
  if(advPageTab==='imprest')impStart();
  else if(advPageTab==='settings'){if(advSetSub==='policies')advPolStart();else if(advSetSub==='workflows')awfStartAdd('Advance');else advTypeStart();}
  else advStart();
}
function advSplitWrap(table){
  return '<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="adv-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +table+'</div></div>'
    +'<div class="lp-split-sb'+(advSel!=null?' open':'')+'" id="adv-split-sb"><div class="lp-isb" id="adv-isb-inner">'+(advSel!=null?sbRender(renderAdvSidebar,'adv'):'')+'</div></div></div>';
}
function advFilterBar(inner,tiles){
  return '<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'+inner+'</div></div>'
    +(tiles?'<div class="listing-stats exp-stats">'+tiles+'</div>':'')+'</div>';
}
function advPick(id,all){const v=getCSValue(id);return v&&v!==all?v:'';}

/* ── Advances ──────────────────────────────────────────────────────────── */
function advRowsShown(){
  return advMatch(advScope(advancesData),advQ).filter(function(r){
    if(advTypeF&&r.category!==advTypeF)return false;
    if(advStatusF&&r.status!==advStatusF)return false;
    if(advDisbF&&advDisbStatus(r)!==advDisbF)return false;
    if(advSetF&&(advSetF==='Overdue'?!advIsOverdue(r):advSettleStatus(r)!==advSetF))return false;
    return true;
  });
}
function advApply(){advQ=lpSearchValue('adv-f-q');advTypeF=advPick('adv-f-type','All Types');advStatusF=advPick('adv-f-status','All Statuses');
  advDisbF=advPick('adv-f-disb','All Disbursement');advSetF=advPick('adv-f-set','All Settlement');advSel=null;renderADTPage();}
function advReset(){advQ='';advTypeF='';advStatusF='';advDisbF='';advSetF='';advSel=null;renderADTPage();}
function advStat(k){
  if(k==='Ready for Disbursement'){advDisbF=advDisbF===k?'':k;}
  else if(k==='Overdue'){advSetF=advSetF===k?'':k;}
  else advStatusF=advStatusF===k?'':k;
  advSel=null;renderADTPage();
}
function advListHTML(){
  const all=advScope(advancesData),rows=advRowsShown();
  if(advSel!=null&&!rows.some(function(r){return r.id===advSel;}))advSel=null;
  const sig=[advQ,advTypeF,advStatusF,advDisbF,advSetF].join('|');
  const pgn=listPage('advances',sig,rows.map(function(r,i){
    const b=advBal(r),by=r.createdBy&&r.createdBy!==caClaimantUser(r)?caN(r.createdBy):'';
    const ss=advSettleShown(r);
    return '<tr class="adv-row'+(advSel===r.id?' lp-row-selected':'')+'" id="adv-row-'+r.id+'" style="cursor:pointer" onclick="advOpen('+r.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(r.title)+'">'+advE(r.title)+'</div><div class="lp-c-sub">'+expKey(r)+' · '+advE(r.category)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+advE(r.name)+'</div><div class="lp-c-sub ax-c-trunc">'+advE((idEmp(r.employeeEid)||{}).dept||'')+(by?' · by '+advE(by):'')+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(caTotal(r),r.currency)+'</div><div class="lp-c-sub">'
        +(b.issued?'issued '+expMoney(b.issued,r.currency):b.approved?'approved '+expMoney(b.approved,r.currency):'requested')+'</div></td>'
      +'<td>'+axBadge(statusTone(r.status),r.status)+(r.disb||r.status==='Cancelled'?'<div class="lp-c-sub">'+advE(advDisbStatus(r))+'</div>':'')+'</td>'
      +'<td>'+axBadge(statusTone(ss),ss)+(b.accountable>0?'<div class="lp-c-sub">'+expMoney(b.accountable,r.currency)+' accountable</div>':'')+'</td>'
      +'<td class="ca-c-stage">'+caStageCell(r)+'</td>'
      +'<td class="exp-c-nw"><div class="lp-c-plain'+(advIsOverdue(r)?' exp-cap-over':'')+'">'+(r.dueOn?cdLabel(r.dueOn):'—')+'</div><div class="lp-c-sub">'+(r.requiredBy?'needed '+cdLabel(r.requiredBy):'')+'</div></td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No advance matches this filter.</td></tr>');
  const own=!advCan('advance.view.all')&&!advCan('advance.view.team');
  const tiles=caStat('Awaiting Approval',all.filter(function(r){return r.status==='Awaiting Approval';}).length,advStatusF==='Awaiting Approval','advStat(\'Awaiting Approval\')')
    +caStat('Ready for Disbursement',all.filter(function(r){return advDisbStatus(r)==='Ready for Disbursement';}).length,advDisbF==='Ready for Disbursement','advStat(\'Ready for Disbursement\')','info')
    +caStat('Approved',all.filter(function(r){return r.status==='Approved';}).length,advStatusF==='Approved','advStat(\'Approved\')')
    +caStat('Overdue',all.filter(advIsOverdue).length,advSetF==='Overdue','advStat(\'Overdue\')','bad');
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +advFilterBar(lpSearchField('adv-f-q',advQ,own?'Search my advances':'Search ID, title or employee','advApply()')
      +apCS('adv-f-type',advTypesHere().filter(function(t){return t.model==='One-Time';}).map(function(t){return t.name;}),advTypeF,'All Types')
      +apCS('adv-f-status',ADV_STATUSES,advStatusF,'All Statuses')
      /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
      +(advDisbF?apCS('adv-f-disb',ADV_DISB_STATUSES,advDisbF,'All Disbursement'):'')
      +(advSetF?apCS('adv-f-set',ADV_SETTLE_STATUSES,advSetF,'All Settlement'):'')
      +clearFiltersBtn([advQ,advTypeF,advStatusF,advDisbF,advSetF],'advReset()')
      +'<button class="lp-pill-search" onclick="advApply()">Search</button>',tiles)
    +'<div class="wb-note">Approval authorizes a maximum amount; money counts as issued only once a disbursement is verified. Spend is accounted for by filing an expense in Expenses with <b>Paid By = Company Advance</b>.</div>'
    +advSplitWrap('<table class="lp-table ax-table exp-table adv-table"><thead><tr><th>S. No</th><th>Advance</th><th>Employee</th><th>Amount</th>'
      +'<th>Status</th><th>Settlement</th><th>Current Stage</th><th>Due</th></tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}

/* ── Opening a record ──────────────────────────────────────────────────── */
function advOpen(id,tab){
  const h=advHolder(id);
  if(!advInScope(h)){showToast('Not available','error','This record is outside your access.');return;}
  if(advSel!=null&&advSel!==id&&sbLeaveGuard('adv',function(){advOpen(id,tab);}))return;
  if(advSel!==id)impReqSel=null;
  advTab=tab||sbKeepTab(advSel,advTab);advSel=id;
  const sb=document.getElementById('adv-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('adv',renderAdvSidebar);
  document.querySelectorAll('.adv-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='adv-row-'+id);});
}
function advPanelClose(){
  if(sbLeaveGuard('adv',advPanelClose))return;
  advSel=null;impReqSel=null;
  const sb=document.getElementById('adv-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.adv-row').forEach(function(x){x.classList.remove('lp-row-selected');});
}
function advNav(t){advTab=t;isbTab('adv',renderAdvSidebar);}
/* From the shared queue or a claim: an advance, or an imprest request (its fund). */
function advOpenRecord(id,tab){
  const r=advEngineRec(id);if(!r)return;
  const target=r.kind==='imprest'?impFund(r.fundId):r;
  if(!advInScope(target)&&!caInvolved(r,caMe())){showToast('Not available','error','This record is outside your access.');return;}
  advCloseForms();
  advPageTab=r.kind==='imprest'?'imprest':'advances';
  advQ='';advTypeF='';advStatusF='';advDisbF='';advSetF='';impQ='';impStatusF='';
  advSel=target.id;impReqSel=r.kind==='imprest'?r.id:null;
  advTab=r.kind==='imprest'?'funding':(tab||'basic-details');
  if(page!=='advances')navigatePage('advances');else renderADTPage();
}
/* An expense claim linked to an advance, opened in Expenses. */
function advGoClaim(id){
  if(typeof expScope!=='function'||!expScope().some(function(r){return r.id===id;})){showToast('Not available','error','This claim is outside your access.');return;}
  advCloseForms();navigatePage('expenses');
  expPageTab='all';expSelectedId=id;expTab='summary';renderADTPage();
}

/* ── Record panel ──────────────────────────────────────────────────────── */
function renderAdvSidebar(){
  const h=advHolder(advSel);if(!h)return '';
  if(!advInScope(h))return '<div class="lp-isb-body"><div class="wb-empty-sm">This record is not available to you.</div></div>';
  return h.kind==='fund'?renderImpSidebar(h):renderAdvPanel(h);
}
function renderAdvPanel(r){
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'approval',label:'Approval'},{id:'disbursement',label:'Disbursement'},
    {id:'settlement',label:'Settlement'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===advTab;}))advTab='basic-details';
  const hero=sbHero({icon:ADV_ICO.hero,name:advE(r.title),meta:[expKey(r),advE(r.category),r.claimFor],status:axBadge(statusTone(r.status),r.status)});
  let body;
  if(advTab==='approval')body=hero+caApprovalTabHTML(r);
  else if(advTab==='disbursement')body=hero+advDisbTabHTML(r);
  else if(advTab==='settlement')body=hero+advSettleTabHTML(r);
  else if(advTab==='logs')body=lpLogsView(r.logs,'');
  else if(advTab==='history')body=sbHistoryHTML(r);
  else if(advTab==='workflow')body=wfTimelineHTML(advWorkflowRows(r));
  else body=advBasicHTML(r,hero);
  return axTabBar('adv',tabs,advTab,'advNav','advPanelClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function advBasicHTML(r,hero){
  const b=advBal(r),e=idEmp(r.employeeEid)||{},mgr=e.managerEid?idEmpName(e.managerEid):'';
  let act='';
  if(r.status==='Draft'&&caCanSubmit(r))act+=advBtn('Submit','advSubmitClick('+r.id+')',true);
  if(advCanEdit(r))act+=advBtn('Edit','advStartEdit('+r.id+')');
  if(advCan('advance.cancel')&&['Approved','Partially Approved'].indexOf(r.status)>=0&&b.unissued>0&&!advProcessing(r))act+=advBtn('Cancel Unissued','advActOpen(\'cancelAuth\','+r.id+')');
  const pe=r.policyEval;
  let pol='';
  if(r.status==='Draft'){
    const ev=advEvalOf(r);
    pol=ev.errors.length?'<div class="wb-note is-bad"><b>Cannot be submitted yet</b><div class="wb-note-sub">'+ev.errors.map(advE).join('<br>')+'</div></div>'
      :ev.warnings.length?'<div class="wb-note is-wait"><b>Policy warning</b><div class="wb-note-sub">'+ev.warnings.map(advE).join('<br>')+(r.just?'<br>Justification: '+advE(r.just):' A justification is needed to submit.')+'</div></div>'
      :ev.policy?'<div class="wb-note">Within '+advE(ev.policy.key+' '+ev.policy.name)+'.</div>':'';
  }else if(pe){
    pol='<div class="wb-note is-data'+(pe.warnings.length?' is-wait':'')+'"><b>Policy check at submission · '+advE(pe.policyKey+' '+pe.policyName)+'</b><div class="wb-note-sub">'
      +advE(pe.results[0].result)+' · '+pe.info.open+' other open advance'+(pe.info.open===1?'':'s')+(pe.info.unsettled.length?' · unsettled: '+advE(pe.info.unsettled.join(', ')):'')
      +(pe.warnings.length?'<br>'+pe.warnings.map(advE).join('<br>'):'')+(pe.just?'<br>Justification: '+advE(pe.just):'')+'</div></div>';
  }
  return hero+(act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(r.cancelled?'<div class="wb-note"><b>'+expMoney(r.cancelled.amount,r.currency)+' of the authorization cancelled</b><div class="wb-note-sub">'+advE(caN(r.cancelled.by))+' · '+advE(r.cancelled.at)+' · '+advE(r.cancelled.reason)+'</div></div>':'')
    +(advExitReview(r)?'<div class="wb-note is-bad"><b>Exit review</b><div class="wb-note-sub">'+advE(r.name)+' is leaving with an open balance. Settle, recover or cancel it through the authorised process; nothing is deducted automatically.</div></div>':'')
    +pol
    +(typeof bgAdvPanelHTML==='function'?bgAdvPanelHTML(r):'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fTag,'Advance Title',advE(r.title))
    +axField(AX_ICO.fBox,'Advance Type',advE(r.category))
    +axField(AX_ICO.fUser,'Request For',r.claimFor)
    +axField(AX_ICO.fUser,'Employee Name',advE(r.name))
    +axField(AX_ICO.fHash,'Employee ID',advE(r.empId))
    +axField(AX_ICO.fMail,'Employee Email',advE(r.email))
    +axField(AX_ICO.fBuild,'Department',advE(e.dept||''))
    +axField(AX_ICO.fTag,'Designation',advE(e.jobTitle||''))
    +axField(AX_ICO.fUser,'Reporting Manager',advE(mgr))
    +axField(AX_ICO.fCash,'Requested Amount',expMoney(caTotal(r),r.currency))
    +axField(AX_ICO.fCash,'Approved Amount',b.approved?expMoney(b.approved,r.currency):'—')
    +axField(AX_ICO.fCash,'Issued (verified)',expMoney(b.issued,r.currency))
    +axField(AX_ICO.fCash,'Accountable',expMoney(b.accountable,r.currency))
    +axField(AX_ICO.fCash,'Currency',r.currency)
    +axField(AX_ICO.fCal,'Required By',r.requiredBy?cdLabel(r.requiredBy):'')
    +axField(AX_ICO.fCal,'Expense Period',r.periodFrom?cdLabel(r.periodFrom)+(r.periodTo?' – '+cdLabel(r.periodTo):''):'')
    +axField(AX_ICO.fCal,'Settlement Due',r.dueOn?cdLabel(r.dueOn)+(advIsOverdue(r)?' <span class="exp-cap-over">Overdue</span>':''):'Set at first verified issuance')
    +axField(AX_ICO.fTag,'Disbursement',axBadge(statusTone(advDisbStatus(r)),advDisbStatus(r)))
    +axField(AX_ICO.fTag,'Settlement',axBadge(statusTone(advSettleShown(r)),advSettleShown(r)))
    +axField(AX_ICO.fHash,'Cost Centre',advE(advDimText(r,'cc')))
    +axField(AX_ICO.fHash,'Project',advE(advDimText(r,'project')))
    +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Supporting Document',advE(r.proof))
    +axField(AX_ICO.fUser,'Created By',advE(caN(r.createdBy))+' <span class="ax-sub">'+advE(r.createdAt)+'</span>')
    +axField(AX_ICO.fUser,'Submitted By',r.submittedBy?advE(caN(r.submittedBy))+' <span class="ax-sub">'+advE(r.submittedAt||'')+'</span>':'Not submitted')
    +axField(EXP_ICO.note,'Business Purpose',advE(r.purpose),true)
    +axField(EXP_ICO.note,'Additional Notes',advE(r.notes),true)
    +'</div>';
}
function advSubmitClick(id){
  const r=advEngineRec(id);if(!r)return;
  const err=advSubmit(id);
  if(err){showToast('Not submitted','error',err);return;}
  renderADTPage();const st=caActiveStage(r);
  showToast('Submitted','success',expKey(r)+' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'.');
}

/* ── Disbursement tab (advances and imprest requests) ──────────────────── */
function advDisbTabHTML(r){
  const s=advDisbStatus(r);
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Disbursement</span><span class="ca-actions">'+axBadge(statusTone(s),s);
  if(!r.disb)return head+'</span></div><div class="wb-empty-sm">'+(r.status==='Cancelled'?'The authorization was cancelled before anything was issued.'
    :'Disbursement opens once every approval stage is complete. Approval authorizes a maximum amount; it never counts as money issued.')+'</div>';
  const auth=advAuthorized(r),issued=advReqIssued(r),proc=advProcessing(r),left=Math.max(0,advM(auth-issued-proc));
  const h=advFundsHolder(r),me=caMe(),mine=caIsClaimant(r,me);
  const canInit=advCan('advance.disbursement.manage')&&!mine&&left>0&&['Approved','Partially Approved'].indexOf(r.status)>=0&&!(r.kind==='imprest'&&(h.status!=='Active'||impLapsed(h)));
  const mc=advCfg().makerChecker;
  let out=head+(canInit?advBtn('Initiate Disbursement','advActOpen(\'initiate\','+r.id+')',true):'')+'</span></div>'
    +'<div class="wb-proj-cards ca-pay-cards">'
      +advCard('Approved',expMoney(advM(caApprovedTotal(r)),r.currency),r.cancelled?expMoney(r.cancelled.amount,r.currency)+' cancelled':'')
      +advCard('Issued (verified)',expMoney(issued,r.currency))
      +advCard('Processing',expMoney(proc,r.currency),proc?'not issued until verified':'')
      +advCard('Remaining',expMoney(left,r.currency))
    +'</div>'
    +'<div class="wb-note">Maker-checker is <b>'+(mc.on?'on':'off')+'</b> for '+advE(idEntityName(advEnt()))
      +(mc.on&&mc.typeIds.length?' (types: '+advE(mc.typeIds.map(function(i){const t=advType(i);return t?t.name:i;}).join(', '))+')':'')
      +(mc.on&&mc.threshold?' from '+expMoney(mc.threshold,r.currency):'')
      +(mc.on?': whoever initiates a disbursement cannot verify it.':': one authorised person may initiate and verify, with evidence; both steps are audited.')
      +' A corporate card or wallet needs a connected provider; none is connected, so no card or wallet transfer is offered.</div>';
  const list=r.disb.instructions.slice().reverse();
  if(!list.length)return out+'<div class="wb-empty-sm">No disbursement has been initiated.</div>';
  out+=list.map(function(i){
    const st=i.status==='Processing'&&i.mcException?'Pending Verification':i.status;
    let btn='';
    if(i.status==='Processing'){
      const canV=advCan('advance.disbursement.verify')&&!mine&&!(i.mc&&i.initiatedBy===me);
      if(canV)btn+=advBtn('Verify','advActOpen(\'verify\','+r.id+',{key:\''+i.key+'\'})',true);
      if(advCan('advance.disbursement.manage')){btn+=advBtn('Mark Failed','advActOpen(\'dfail\','+r.id+',{key:\''+i.key+'\'})')+advBtn('Cancel','advActOpen(\'dcancel\','+r.id+',{key:\''+i.key+'\'})');}
    }
    if(i.status==='Verified'&&advCan('advance.disbursement.verify')&&!mine)btn+=advBtn('Reverse','advActOpen(\'dreverse\','+r.id+',{key:\''+i.key+'\'})');
    return '<div class="exp-line"><div class="exp-line-hd"><div class="exp-line-ttl"><div class="exp-line-name">'+i.key+' · '+expMoney(i.amount,r.currency)+'</div>'
      +'<div class="exp-line-amt">'+advE(i.method)+(i.account?' · '+advE(i.account):'')+' · initiated by '+advE(caN(i.initiatedBy))+' · '+advE(i.initiatedAt)+'</div></div>'
      +axBadge(statusTone(st),st)+'<span class="ca-actions">'+btn+'</span></div>'
      +(i.mcException?'<div class="wb-note is-bad"><b>Configuration exception</b><div class="wb-note-sub">Maker-checker applies and no other user holds advance.disbursement.verify independently of this request. It stays pending until an administrator grants the right to someone else.</div></div>'
        :i.status==='Processing'&&i.mc?'<div class="ea-hint">Maker-checker: verification by someone other than '+advE(caN(i.initiatedBy))+'.</div>':'')
      +(i.verify?'<div class="lp-sb-detail-grid">'
        +axField(AX_ICO.fCash,'Verified Amount',expMoney(i.verify.amount,r.currency))
        +axField(AX_ICO.fCal,'Payment Date',cdLabel(i.verify.date))
        +axField(AX_ICO.fHash,'Payment Reference / UTR',advE(i.verify.ref)+(i.verify.illustrative?' <span class="lp-status-badge tone-info">Illustrative</span>':''))
        +axField(AX_ICO.fHash,'External Provider Reference',advE(i.verify.extRef))
        +axField(AX_ICO.fHash,'ADT Transaction',advE(i.txn))
        +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Evidence',advE(i.verify.evidence))
        +axField(AX_ICO.fUser,'Verified By',advE(caN(i.verify.by))+' <span class="ax-sub">'+advE(i.verify.at)+'</span>')
        +(i.reversed?axField(EXP_ICO.note,'Reversal',advE(caN(i.reversed.by)+' · '+i.reversed.at+' · '+i.reversed.reason+' ('+i.reversed.txn+')'),true):'')
        +'</div>':'')
      +(i.failReason?'<div class="ea-hint">'+(i.status==='Failed'?'Failed':'Cancelled')+' by '+advE(caN(i.failedBy))+': '+advE(i.failReason)+'. Nothing was issued.</div>':'')
      +'</div>';
  }).join('');
  return out;
}

/* ── Settlement tab (advances and imprest funds) ───────────────────────── */
function advSettleTabHTML(h){
  const b=advBal(h),own=advOwnHolder(h),cur=h.currency,ss=h.kind==='fund'?(h.closed?'Closed':advSettleStatus(h)):advSettleShown(h);
  let btn='';
  if(!h.closed&&b.available>0&&(advCan('advance.return.manage')||(own&&advCan('advance.settlement.submit'))))btn+=advBtn('Record Return','advActOpen(\'return\','+h.id+')');
  if(!h.closed&&b.available>0&&!own&&advCan('advance.recovery.manage'))btn+=advBtn('Raise Recovery','advActOpen(\'recovery\','+h.id+')');
  if(!h.closed&&b.issued>0&&!own&&advCan('advance.settlement.review'))btn+=advBtn('Review Settlement','advActOpen(\'review\','+h.id+')',true);
  if(h.kind==='advance'&&!h.closed&&h.dueOn&&!own&&advCan('advance.settlement.review'))btn+=advBtn('Extend Due Date','advActOpen(\'extend\','+h.id+')');
  const closeErr=advCloseCheck(h);
  if(!h.closed&&!own&&advCan('advance.close')&&!closeErr)btn+=advBtn('Close','advActOpen(\'close\','+h.id+')',true);
  const util=(h.ledger||[]).filter(function(e){return e.type==='Utilization';});
  const pend=advPendingLines(h);
  let out='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Settlement'+(h.settlementKey?' '+h.settlementKey:'')+'</span><span class="ca-actions">'+axBadge(statusTone(ss),ss)+btn+'</span></div>'
    +'<div class="wb-proj-cards ca-pay-cards">'
      +advCard('Issued',expMoney(b.issued,cur),h.kind==='fund'?'float '+expMoney(h.float,cur):'')
      +advCard('Accepted Expenses',expMoney(b.accepted,cur))
      +advCard('Pending Review',expMoney(b.pending,cur),'expenses still in approval')
      +advCard('Returned / Recovered',expMoney(advM(b.returns+b.recoveries),cur),'verified only')
      +advCard('Accountable',expMoney(b.accountable,cur),'issued less accepted, returned, recovered')
      +advCard('Available',expMoney(b.available,cur),'not reserved by expenses, returns or recoveries')
      +(b.recoveryDue>0?advCard('Recovery Due',expMoney(b.recoveryDue,cur),'authorized, not yet collected'):'')
    +'</div>'
    +(h.kind==='advance'&&h.dueOn?'<div class="wb-note is-data'+(advIsOverdue(h)?' is-bad':'')+'">Settlement due <b>'+cdLabel(h.dueOn)+'</b>'+(advIsOverdue(h)?' - overdue. Escalated to Finance and HR; nothing is deducted automatically.':'.')
      +(h.extensions.length?'<div class="wb-note-sub">Extended '+h.extensions.length+'×: '+h.extensions.map(function(x){return cdLabel(x.from)+' → '+cdLabel(x.to)+' by '+advE(caN(x.by))+' ('+advE(x.reason)+')';}).join('; ')+'</div>':'')+'</div>':'')
    +(own&&!h.closed&&b.uncommitted>0?'<div class="ea-hint">Account for what you spent by filing an expense in Expenses with Paid By = Company Advance and '+expKey(h)+' as the reference. Return what is left with Record Return; Finance verifies it.</div>':'')
    +(!h.closed&&closeErr&&advCan('advance.close')&&!own?'<div class="ea-hint">Not ready to close: '+advE(closeErr)+'</div>':'');
  out+='<div class="wb-proj-h">Linked expenses</div>';
  if(!util.length&&!pend.length)out+='<div class="wb-empty-sm">No expense is linked to '+expKey(h)+' yet.</div>';
  else out+='<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Claim</th><th>Line</th><th>Status</th><th class="wb-num">Advance part</th></tr></thead><tbody>'
    +pend.map(function(x){return '<tr><td class="csag-td"><a class="ax-c-link" onclick="advGoClaim('+x.c.id+')">'+expKey(x.c)+'</a></td><td class="csag-td" style="white-space:normal">'+advE(x.l.title)+'</td><td class="csag-td">'+axBadge('wait','Pending Review')+'</td><td class="csag-td wb-num">'+expMoney(x.amount,cur)+'</td></tr>';}).join('')
    +util.map(function(e){return '<tr><td class="csag-td"><a class="ax-c-link" onclick="advGoClaim('+e.claimId+')">'+advE(e.claimKey)+'</a></td><td class="csag-td" style="white-space:normal">'+advE(e.lineTitle)+'<div class="lp-c-sub">'+advE(e.note||'')+'</div></td><td class="csag-td">'+axBadge('ok','Accepted')+'</td><td class="csag-td wb-num">'+expMoney(e.amount,cur)+'</td></tr>';}).join('')
    +'</tbody></table></div>';
  const rr=(h.returns||[]).slice().reverse();
  out+='<div class="wb-proj-h">Returns and recoveries</div>';
  out+=rr.length?rr.map(function(x){
    if(x.type==='Recovery')return advRecoveryCardHTML(h,x,own);
    const perm='advance.return.manage';
    let ab='';
    if(x.status==='Pending'&&advCan(perm)&&!own)ab=advBtn('Verify','advActOpen(\'rrverify\','+h.id+',{key:\''+x.key+'\'})',true)+advBtn('Mark Failed','advActOpen(\'rrfail\','+h.id+',{key:\''+x.key+'\'})');
    if(x.status==='Verified'&&advCan(perm)&&!own&&!h.closed)ab=advBtn('Reverse','advActOpen(\'rrreverse\','+h.id+',{key:\''+x.key+'\'})');
    return '<div class="exp-line"><div class="exp-line-hd"><div class="exp-line-ttl"><div class="exp-line-name">'+x.key+' · '+x.type+' · '+expMoney(x.amount,cur)+'</div>'
      +'<div class="exp-line-amt">'+advE(x.method)+(x.date?' · '+cdLabel(x.date):'')+(x.ref?' · ref '+advE(x.ref):'')+(x.extRef?' / '+advE(x.extRef):'')+' · recorded by '+advE(caN(x.recordedBy))
      +(x.verifiedBy?' · verified by '+advE(caN(x.verifiedBy))+(x.txn?' ('+x.txn+')':''):'')+'</div>'
      +(x.reason?'<div class="lp-c-sub">'+advE(x.reason)+'</div>':'')+(x.failReason?'<div class="lp-c-sub">Failed: '+advE(x.failReason)+'</div>':'')
      +(x.reversed?'<div class="lp-c-sub">Reversed by '+advE(caN(x.reversed.by))+': '+advE(x.reversed.reason)+' ('+x.reversed.txn+')</div>':'')+'</div>'
      +axBadge(statusTone(x.status),x.status)+'<span class="ca-actions">'+ab+'</span></div></div>';
  }).join(''):'<div class="wb-empty-sm">No return or recovery recorded. Unverified amounts never reduce what is accountable.</div>';
  if((h.reviews||[]).length)out+='<div class="wb-proj-h">Settlement reviews</div>'+h.reviews.map(function(v){
    return '<div class="ca-dec"><div class="ca-dec-hd"><b>'+advE(caN(v.by))+'</b> · '+advE(v.at)+' · '+(v.accepted?'Accepted':'Not yet settled')+'</div><div>'+advE(v.remarks)+'</div>'
      +'<div class="wb-muted">Issued '+expMoney(v.snapshot.issued,cur)+' · accepted '+expMoney(v.snapshot.accepted,cur)+' · accountable '+expMoney(v.snapshot.accountable,cur)+'</div></div>';}).join('');
  out+=advLedgerHTML(h);
  return out;
}
/* A recovery: raised → authorized by someone else → collections verified. */
function advRecoveryCardHTML(h,x,own){
  const cur=h.currency,me=caMe(),open=ADV_REC_OPEN.indexOf(x.status)>=0;
  let ab='';
  if(x.status==='Pending Approval'&&advCan('advance.recovery.approve')&&!own&&x.recordedBy!==me)
    ab+=advBtn('Approve','advActOpen(\'recdecide\','+h.id+',{key:\''+x.key+'\',to:\'Approve\'})',true)+advBtn('Reject','advActOpen(\'recdecide\','+h.id+',{key:\''+x.key+'\',to:\'Reject\'})');
  if(['Approved','Partially Collected'].indexOf(x.status)>=0&&advCan('advance.recovery.manage')&&!own)ab+=advBtn('Record Collection','advActOpen(\'reccollect\','+h.id+',{key:\''+x.key+'\'})',true);
  if(open&&advCan('advance.recovery.manage')&&!own)ab+=advBtn('Cancel','advActOpen(\'reccancel\','+h.id+',{key:\''+x.key+'\'})');
  if((x.collections||[]).some(function(c){return !c.reversed;})&&advCan('advance.recovery.manage')&&!own&&!h.closed)ab+=advBtn('Reverse Collection','advActOpen(\'recreverse\','+h.id+',{key:\''+x.key+'\'})');
  const col=advRecCollected(x),unpaid=advRecUnpaid(x);
  return '<div class="exp-line"><div class="exp-line-hd"><div class="exp-line-ttl"><div class="exp-line-name">'+x.key+' · Recovery · '+expMoney(x.amount,cur)+'</div>'
    +'<div class="exp-line-amt">'+advE(x.method)+' · raised by '+advE(caN(x.recordedBy))+' · '+advE(x.recordedAt)
      +(x.approval?' · '+(x.approval.decision==='Approve'?'authorized':'rejected')+' by '+advE(caN(x.approval.by)):'')+'</div>'
    +'<div class="lp-c-sub">'+advE(x.reason)+'</div>'
    +(x.status!=='Pending Approval'&&x.status!=='Rejected'?'<div class="lp-c-sub">Collected '+expMoney(col,cur)+(open?' · due '+expMoney(unpaid,cur):'')+'</div>':'')
    +(x.status==='Pending Approval'?'<div class="lp-c-sub">Not due until authorized by someone other than '+advE(caN(x.recordedBy))+'.</div>':'')
    +(x.approval&&x.approval.remarks?'<div class="lp-c-sub">'+advE(x.approval.remarks)+'</div>':'')
    +(x.cancelled?'<div class="lp-c-sub">Cancelled by '+advE(caN(x.cancelled.by))+': '+advE(x.cancelled.reason)+'</div>':'')
    +(x.collections||[]).map(function(c){return '<div class="lp-c-sub">'+(c.reversed?'<s>':'')+expMoney(c.amount,cur)+' · '+cdLabel(c.date)+' · ref '+advE(c.ref)+(c.extRef?' / '+advE(c.extRef):'')+' · '+c.txn+' · verified by '+advE(caN(c.by))+(c.reversed?'</s> reversed: '+advE(c.reversed.reason)+' ('+c.reversed.txn+')':'')+'</div>';}).join('')
    +'</div>'+axBadge(statusTone(x.status),x.status)+'<span class="ca-actions">'+ab+'</span></div></div>';
}
/* The ADT ledger: internal transaction references, never a bank balance. */
function advLedgerHTML(h){
  const L=(h.ledger||[]).slice().reverse();
  return '<div class="wb-proj-h">ADT ledger</div>'
    +(L.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Transaction</th><th>Type</th><th class="wb-num">Amount</th><th>Date</th><th>Reference</th><th>By</th></tr></thead><tbody>'
    +L.map(function(e){return '<tr><td class="csag-td">'+e.txn+'</td><td class="csag-td">'+e.type+(e.ofType?' of '+e.ofType:'')+'</td><td class="csag-td wb-num">'+(e.type==='Reversal'?'−':'')+expMoney(e.amount,e.currency)+'</td>'
      +'<td class="csag-td">'+cdLabel(e.date)+'</td><td class="csag-td" style="white-space:normal">'+advE(e.ref||'')+(e.extRef?' / '+advE(e.extRef):'')+(e.source?'<div class="lp-c-sub">'+advE(e.source)+'</div>':'')+'</td><td class="csag-td">'+advE(caN(e.by))+'</td></tr>';}).join('')
    +'</tbody></table></div>':'<div class="wb-empty-sm">No financial event yet. Approval alone records nothing here.</div>')
    +'<div class="ea-hint">Balances are computed from these entries. Corrections are reversal entries; nothing is edited or deleted.</div>';
}

/* ── Workflow tab ──────────────────────────────────────────────────────── */
function advLogTitle(l){
  const a=l.action||'';
  const m=[[/^Advance request drafted/,'Request Drafted'],[/request drafted for|initial funding request/i,'Request Drafted'],[/^Submitted for approval|^Submitted/,'Submitted for Approval'],
    [/initiated by/,'Disbursement Initiated'],[/^Disbursement .* verified/,'Disbursement Verified'],[/^Disbursement .* failed/,'Disbursement Failed'],
    [/^Disbursement .* cancelled/,'Disbursement Cancelled'],[/^Disbursement .* reversed/,'Disbursement Reversed'],[/^(Return|Recovery) .* recorded/,'Return / Recovery Recorded'],
    [/^(Return|Recovery) .* verified/,'Return / Recovery Verified'],[/^(Return|Recovery) .* (failed|reversed)/,'Return / Recovery Corrected'],[/^Accepted utilization/,'Expense Accepted'],
    [/^Settlement reviewed/,'Settlement Reviewed'],[/^Settlement due date extended/,'Due Date Extended'],[/^Closed by/,'Closed'],[/^Reminder sent/,'Reminder Sent'],
    [/^Settlement overdue/,'Overdue'],[/^Exit review/,'Exit Review'],[/^Unissued authorization/,'Authorization Cancelled'],[/^Final approval complete/,'Approved'],
    [/^Request rejected/,'Rejected'],[/^Imprest fund created/,'Fund Created'],[/^Custodian changed/,'Custodian Changed'],[/^Status .* →/,'Status Changed'],
    [/^Replenishment .* requested/,'Replenishment Requested'],[/(Top-up|Initial funding) of .* issued/,'Funds Issued'],[/^Request edited/,'Request Edited']];
  for(let i=0;i<m.length;i++)if(m[i][0].test(a))return m[i][1];
  return typeof caLogTitle==='function'?caLogTitle(l):(l.status||'Update');
}
function advWorkflowRows(r){
  const done=(r.logs||[]).map(function(l){return {title:advLogTitle(l),user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
  const steps=[],fin='Finance';
  if(r.kind==='fund'){
    if(r.status==='Draft')steps.push({title:'Approve and issue initial funding',owner:fin});
    else if(!r.closed){steps.push({title:'Account for spending with expenses',owner:idEmpName(r.custodianEid)});
      if(r.replenish&&r.status==='Active')steps.push({title:'Replenish accepted spend',owner:idEmpName(r.custodianEid)+' / '+fin});
      if(r.status==='Closing')steps.push({title:'Settle the balance, review and close',owner:fin});}
    return wfPlan(done,steps);
  }
  const who=r.kind==='imprest'?idEmpName(r.employeeEid):r.name;
  if(r.status==='Draft'){
    steps.push({title:'Submit for Approval',owner:who});
    const rt=advRoute(r);if(rt.wf)caActiveDefs(rt.wf).forEach(function(s){steps.push({title:'Stage '+s.n+' · '+s.name,owner:caStageWho(s)});});
    steps.push({title:'Initiate and verify disbursement',owner:fin});
  }else if(r.wf&&r.wf.open){
    if(r.status==='Follow-Up')steps.push({title:'Respond to Follow-Up',owner:r.submittedBy?caN(r.submittedBy):who});
    r.wf.stages.slice(r.wf.current).forEach(function(s,i){steps.push({title:'Stage '+s.n+' · '+s.name,owner:i===0&&s.approvers.length?caNs(s.approvers):caStageWho(s)});});
    steps.push({title:'Initiate and verify disbursement',owner:fin});
  }else if(r.disb&&['Ready for Disbursement','Failed','Cancelled','Partially Disbursed'].indexOf(r.disb.status)>=0&&advM(advAuthorized(r)-advReqIssued(r))>0){
    steps.push({title:'Initiate disbursement',owner:fin});steps.push({title:'Verify disbursement',owner:fin});
  }else if(r.disb&&r.disb.status==='Processing')steps.push({title:'Verify disbursement',owner:advCfg().makerChecker.on?fin+' (not the initiator)':fin});
  if(r.kind==='advance'&&!r.closed&&['Rejected','Withdrawn','Cancelled'].indexOf(r.status)<0){
    const b=advBal(r);
    if(r.status!=='Draft'&&(b.issued>0||r.disb)){if(b.accountable>0)steps.push({title:'Account for the advance (expenses, return)',owner:r.name,note:r.dueOn?'Due '+cdLabel(r.dueOn):''});
      steps.push({title:'Review and close settlement',owner:fin});}
  }
  return wfPlan(done,steps);
}

/* ── Add / Edit advance ────────────────────────────────────────────────── */
function advBlank(){
  const me=advMyEid();
  return {id:null,claimFor:me?'Self':'Others',eid:me||'',typeId:'',title:'',purpose:'',amount:'',currency:'INR',requiredBy:'',periodFrom:'',periodTo:'',
    costCenter:'',project:'',notes:'',proof:'',just:'',plannedCategory:'',costCentreId:'',projectId:'',bgJust:''};
}
function advStart(){
  if(!(advCan('advance.create')||advCan('advance.create.others'))){emsDeny('request advances');return;}
  if(advSel!=null&&sbLeaveGuard('adv',advStart))return;
  advCloseForms();advForm=advBlank();
  if(!advMyEid()&&!advCan('advance.create.others')){advForm=null;showToast('No employee record','error',idMeName()+' has no employee record in '+idEntityName(advEnt())+', so cannot request an advance for themselves.');return;}
  if(!advCan('advance.create')){advForm.claimFor='Others';advForm.eid='';}
  renderADTPage();
}
function advStartEdit(id){
  const r=advRec(id);if(!r||!advCanEdit(r)){showToast('Not editable','error','This advance cannot be edited now.');return;}
  advCloseForms();
  advForm={id:r.id,rev:caRevOf(r),claimFor:r.claimFor,eid:r.employeeEid,typeId:r.typeId,title:r.title,purpose:r.purpose,amount:String(caTotal(r)),currency:r.currency,
    requiredBy:r.requiredBy,periodFrom:r.periodFrom,periodTo:r.periodTo,costCenter:r.costCenter,project:r.project,notes:r.notes,proof:r.proof,just:r.just,
    plannedCategory:r.plannedCategory||'',costCentreId:r.costCentreId||'',projectId:r.projectId||'',bgJust:r.bgJust||''};
  renderADTPage();
}
function advFormSync(){
  const d=advForm;if(!d)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  [['title','advf-title'],['purpose','advf-purpose'],['amount','advf-amount'],['costCenter','advf-cc'],['project','advf-project'],['notes','advf-notes'],['just','advf-just']]
    .forEach(function(p){const x=v(p[1]);if(x!=null)d[p[0]]=x;});
  [['requiredBy','advf-req'],['periodFrom','advf-pf'],['periodTo','advf-pt']].forEach(function(p){const x=v(p[1]);if(x!=null)d[p[0]]=x;});
  if(document.getElementById('csw-advf-for')){const f=getCSValue('advf-for');if(f&&f!==d.claimFor){d.claimFor=f;d.eid=f==='Self'?advMyEid():'';}}
  if(document.getElementById('csw-advf-emp'))d.eid=advEmpFromLabel(getCSValue('advf-emp'))||d.eid;
  if(document.getElementById('csw-advf-type')){const t=advTypesHere(true).find(function(x){return x.name===getCSValue('advf-type');});d.typeId=t?t.id:d.typeId;}
  if(document.getElementById('csw-advf-cur')){const c=getCSValue('advf-cur');if(EXP_CURRENCIES.indexOf(c)>=0)d.currency=c;}
  if(typeof bgAdvFormSync==='function')bgAdvFormSync(d);
}
function advFormHook(){advFormSync();renderADTPage();}
function advPickProof(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}advFormSync();advForm.proof=f.name;renderADTPage();}
function advFormHTML(){
  const d=advForm,e=idEmp(d.eid)||null,edit=d.id!=null;
  const types=advTypesHere(true).filter(function(t){return t.model==='One-Time';});
  const t=advType(d.typeId);
  const ev=d.eid&&d.typeId?advEvaluate({eid:d.eid,typeId:d.typeId,amount:parseFloat(d.amount)||0,currency:d.currency,iso:wbToday(),excludeId:d.id}):null;
  const p=ev&&ev.policy;
  const field=function(label,req,html,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+'</div>';};
  const ro=function(v){return '<input class="ep-form-input ca-ro" readonly value="'+attrSafe(v||'')+'">';};
  const both=advCan('advance.create')&&advCan('advance.create.others')&&advMyEid();
  let f='';
  if(!edit)f+=field('Request For',true,both?apCS('advf-for',['Self','Others'],d.claimFor,'Select','advFormHook'):ro(d.claimFor));
  f+=field('Employee',true,!edit&&d.claimFor==='Others'?axCS('advf-emp',advEmpOptions(),advEmpLabel(d.eid),'Search employee','advFormHook'):ro(e?e.name:''));
  /* Labels read as on the expense claim (product owner, 10 Nov 2026): Employee Id, Title, Notes. */
  f+=field('Employee Id',false,ro(e?e.empId:''))+field('Employee Email',false,ro(e?e.email:''))
    +field('Department',false,ro(e?e.dept:''))+field('Designation',false,ro(e?e.jobTitle:''))
    +field('Reporting Manager',false,ro(e&&e.managerEid?idEmpName(e.managerEid):''));
  f+=field('Advance Type',true,apCS('advf-type',types.map(function(x){return x.name;}),t?t.name:'','Select type','advFormHook')
      +(t&&t.desc?'<div class="ea-hint">'+advE(t.desc)+'</div>':''));
  /* Planned Sub Category sits just below the type (js/budgets-ui.js). */
  if(typeof bgAdvPlannedFieldHTML==='function')f+=bgAdvPlannedFieldHTML(d);
  f+=field('Title',true,'<input class="ep-form-input" id="advf-title" value="'+attrSafe(d.title)+'" placeholder="e.g. Client visit - Mumbai">');
  f+=field('Requested Amount',true,'<div class="ax-currency"><span>'+d.currency+'</span><input class="ep-form-input" id="advf-amount" type="number" min="0" step="0.01" value="'+attrSafe(d.amount)+'" onchange="advFormHook()"></div>');
  f+=field('Currency',true,apCS('advf-cur',EXP_CURRENCIES,d.currency,'Select currency','advFormHook'));
  f+=field('Required By Date',true,apCD('advf-req',d.requiredBy,'Select date'));
  f+=field('Expense Period From',false,apCD('advf-pf',d.periodFrom,'Select date'))+field('Expense Period To',false,apCD('advf-pt',d.periodTo,'Select date'));
  /* Cost Centre and Project (picked from Company Structure, as on the claim) and the budget check (js/budgets-ui.js).
     The old free-text Cost Center and Project are no longer asked; values typed before stay on the advance. */
  if(typeof bgAdvFormFieldsHTML==='function')f+=bgAdvFormFieldsHTML(d);
  f+=field('Business Purpose',true,'<textarea class="ep-form-input ax-notes" id="advf-purpose" placeholder="What the money is for">'+advE(d.purpose)+'</textarea>',true);
  f+=field('Supporting Document',!!(ev&&ev.requireDoc),d.proof?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+advE(d.proof)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="advPickProof(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · quote, itinerary or approval</span></span></label>',true);
  f+=field('Notes',false,'<textarea class="ep-form-input ax-notes" id="advf-notes">'+advE(d.notes)+'</textarea>',true);
  let pol='';
  if(ev){
    pol=p?'<div class="wb-note'+(ev.errors.length?' is-bad':ev.warnings.length?' is-wait':'')+'"><b>'+advE(p.key+' '+p.name)+'</b><div class="wb-note-sub">'
        +(p.minAmt!==''?'Min '+expMoney(p.minAmt,p.currency)+' · ':'')+'Max '+expMoney(p.maxAmt,p.currency)+(p.maxOpen!==''?' · up to '+p.maxOpen+' open':'')
        +(p.maxOutstanding!==''?' · outstanding up to '+expMoney(p.maxOutstanding,p.currency):'')+' · '+ev.info.open+' open now'
        +(ev.errors.length?'<br>'+ev.errors.map(advE).join('<br>'):'')+(ev.warnings.length?'<br>'+ev.warnings.map(advE).join('<br>'):'')+'</div></div>'
      :'<div class="wb-note is-bad"><b>Not eligible</b><div class="wb-note-sub">'+ev.errors.map(advE).join('<br>')+'</div></div>';
    if(ev.warnings.length)f+=field('Justification',true,'<textarea class="ep-form-input ax-notes" id="advf-just" placeholder="Why a new advance is needed while one is unsettled">'+advE(d.just)+'</textarea>',true);
  }
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal adv-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(edit?'Edit '+expKey(advRec(d.id)):'Request Advance')+'</span><button class="ct-modal-close" onclick="advFormClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">An advance is company money given before it is spent. It is approved, then issued once Finance verifies the payment, and settled with expenses and returns.</p>'
    +pol+'<div class="ep-form-grid">'+f+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="advFormClose()">Cancel</button>'
    +(edit?'<button class="ep-save-btn" onclick="advFormSave(false)">Save Changes</button>'
      :'<button class="ep-cancel-btn" onclick="advFormSave(false)">Save as Draft</button><button class="ep-save-btn" onclick="advFormSave(true)">Submit</button>')
    +'</div></div></div></div>';
}
/* An advance's Cost Centre or Project as shown: what was typed on older advances, otherwise the one
   picked from Company Structure. */
function advDimText(r,kind){
  const typed=kind==='cc'?r.costCenter:r.project;if(typed)return typed;
  const id=kind==='cc'?r.costCentreId:r.projectId,m=id&&typeof bgmRec==='function'?bgmRec(kind,id):null;
  return m&&typeof bgmLabel==='function'?bgmLabel(m):'';
}
function advFormClose(){advForm=null;renderADTPage();}
function advFormSave(submit){
  advFormSync();
  const d=advForm;if(!d)return;
  if(d.id!=null){
    const r=advRec(d.id);
    if(r&&caRevOf(r)!==d.rev){advForm=null;renderADTPage();showToast('This advance changed','error',expKey(r)+' was updated by someone else (now '+r.status+'). Nothing was saved; open it again.');return;}
    const err=advUpdate(d.id,d);
    if(err){showToast('Not saved','error',err);return;}
    advForm=null;renderADTPage();
    showToast('Saved','success',expKey(r)+(r.status==='Follow-Up'?' updated - resubmit it from the Approval tab.':' updated.'));
    return;
  }
  const res=advCreate({eid:d.eid,claimFor:d.claimFor,typeId:d.typeId,title:d.title,purpose:d.purpose,amount:d.amount,currency:d.currency,requiredBy:d.requiredBy,
    periodFrom:d.periodFrom,periodTo:d.periodTo,costCenter:d.costCenter,project:d.project,notes:d.notes,proof:d.proof,just:d.just,
    plannedCategory:d.plannedCategory,costCentreId:d.costCentreId,projectId:d.projectId,bgJust:d.bgJust},submit);
  if(res.error){showToast(submit?'Not submitted':'Not saved','error',res.error);return;}
  advForm=null;advPageTab='advances';advSel=res.rec.id;advTab='basic-details';renderADTPage();
  const st=caActiveStage(res.rec);
  showToast(submit?'Advance submitted':'Draft saved','success',expKey(res.rec)+(submit&&st?' is with Stage '+st.n+' · '+caNs(st.approvers)+'.':' saved as a draft; nothing is reserved or issued.'));
}

/* ── Action popups ─────────────────────────────────────────────────────── */
function advActOpen(kind,id,o){
  if(typeof rlClose==='function')rlClose();
  const h=kind==='initiate'||kind==='verify'||kind.charAt(0)==='d'||kind==='cancelAuth'?advEngineRec(id):advHolder(id);if(!h)return;
  advAct=Object.assign({kind:kind,id:id,key:'',amount:'',method:'',account:'',remarks:'',date:wbToday(),ref:'',extRef:'',evidence:'',reason:'',to:'',picks:[],rev:advRevOf(h)},o||{});
  const a=advAct;
  if(kind==='initiate'){a.amount=String(Math.max(0,advM(advAuthorized(h)-advReqIssued(h)-advProcessing(h))));a.method=ADV_BASE_METHOD;}
  if(kind==='verify'){const i=h.disb.instructions.find(function(x){return x.key===a.key;});a.amount=i?String(i.amount):'';}
  if(kind==='return'||kind==='recovery'){a.amount=String(advBal(h).available);a.method=ADV_BASE_METHOD;}
  if(kind==='reccollect'){const x=advRecFind(h,a.key);a.amount=x?String(advRecUnpaid(x)):'';a.method=x?x.method:'';}
  if(kind==='rrverify'){const x=(h.returns||[]).find(function(y){return y.key===a.key;});if(x){a.amount=String(x.amount);a.ref=x.ref;a.date=x.date||wbToday();a.evidence=x.evidence;}}
  if(kind==='replenish')a.picks=impEligibleLines(h).map(function(s){return s.claimId+':'+s.lineId;});
  renderADTPage();
}
function advRevOf(h){return h?(h.logs||[]).length+'|'+(h.ledger||[]).length+'|'+(h.returns||[]).length+'|'+(h.disb?h.disb.instructions.length+h.disb.status:'')+'|'+h.status:'';}
function advActClose(){advAct=null;renderADTPage();}
function advActSync(){
  const a=advAct;if(!a)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  ['amount','account','remarks','ref','extRef','reason','why'].forEach(function(k){const x=v('adva-'+k);if(x!=null)a[k]=x;});
  const dt=v('adva-date');if(dt!=null)a.date=dt;
  if(document.getElementById('csw-adva-method'))a.method=getCSValue('adva-method');
  if(document.getElementById('csw-adva-csrc'))a.source=getCSValue('adva-csrc')==='Illustrative'?'Illustrative':'';
  if(document.getElementById('csw-adva-to'))a.to=advEmpFromLabel(getCSValue('adva-to'));
  if(document.getElementById('csw-adva-src')&&typeof fbSourceFromLabel==='function')a.sourceId=fbSourceFromLabel(getCSValue('adva-src'));
  const boxes=document.querySelectorAll('.adva-pick');if(boxes.length)a.picks=Array.prototype.filter.call(boxes,function(b){return b.checked;}).map(function(b){return b.value;});
}
function advActHook(){advActSync();renderADTPage();}
function advPickEvidence(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}advActSync();advAct.evidence=f.name;renderADTPage();}
function advEvidenceField(a,label,hint,req){
  return '<div class="ep-form-group"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'
    +(a.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+advE(a.evidence)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="advPickEvidence(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · '+hint+'</span></span></label>')+'</div>';
}
function advActHTML(){
  const a=advAct,isReq=a.kind==='initiate'||a.kind==='verify'||a.kind.charAt(0)==='d'||a.kind==='cancelAuth';
  const h=isReq?advEngineRec(a.id):advHolder(a.id);if(!h)return '';
  const cur=h.currency,b=isReq?null:advBal(h);
  const inp=function(id,label,req,val,type,ph){return '<div class="ep-form-group"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label><input class="ep-form-input" id="adva-'+id+'"'+(type?' type="'+type+'" min="0" step="0.01"':'')+' value="'+attrSafe(val||'')+'"'+(ph?' placeholder="'+attrSafe(ph)+'"':'')+'></div>';};
  const money=function(label,val){return '<div class="ep-form-group"><label class="ep-form-label">'+label+' <span class="req">*</span></label><div class="ax-currency"><span>'+cur+'</span><input class="ep-form-input" id="adva-amount" type="number" min="0" step="0.01" value="'+attrSafe(val||'')+'"></div></div>';};
  const area=function(id,label,req,val,ph){return '<div class="ep-form-group ep-form-full"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label><textarea class="ep-form-input ax-notes" id="adva-'+id+'"'+(ph?' placeholder="'+attrSafe(ph)+'"':'')+'>'+advE(val)+'</textarea></div>';};
  const date=function(label){return '<div class="ep-form-group"><label class="ep-form-label">'+label+' <span class="req">*</span></label>'+apCD('adva-date',a.date,'Select date')+'</div>';};
  const method=function(){return '<div class="ep-form-group"><label class="ep-form-label">Method <span class="req">*</span></label>'+apCS('adva-method',advMethods(),a.method,'Select method')+'</div>';};
  let T=['','',''],f='';
  if(a.kind==='initiate'){
    const left=advM(advAuthorized(h)-advReqIssued(h)-advProcessing(h));
    T=['Initiate Disbursement · '+expKey(h),'Approved '+expMoney(caApprovedTotal(h),cur)+' · issued '+expMoney(advReqIssued(h),cur)+' · remaining '+expMoney(left,cur)+'. Initiating moves no money and issues nothing; it is verified separately once paid.','Initiate'];
    f=money('Disbursement Amount',a.amount)+method()
      +inp('account','Payment Account / Reference',false,a.account,'','e.g. salary account on file')
      +(typeof fbSourceFieldHTML==='function'?fbSourceFieldHTML('adva-src',a.sourceId,cur,h.entity,parseFloat(a.amount)||0):'')
      +'<div class="ep-form-group ep-form-full"><div class="ea-hint">'+(advAllowsPartialDisb(h)?'A part amount leaves the rest to disburse later.':'The policy does not allow partial disbursement: disburse the full remaining amount.')
        +' Not available: '+ADV_DISABLED_METHODS.map(function(m){return m[0]+' ('+m[1]+')';}).join('; ')+'.</div></div>'
      +area('remarks','Remarks',false,a.remarks);
  }else if(a.kind==='verify'){
    const i=h.disb.instructions.find(function(x){return x.key===a.key;})||{};
    T=['Verify Disbursement · '+a.key,expKey(h)+' · '+expMoney(i.amount,cur)+' initiated by '+caN(i.initiatedBy)+' ('+i.method+'). Record the actual payment; only this issues funds.','Verify'];
    const ill=typeof ccDemoOn==='function'&&ccDemoOn(advEnt());
    f=(ill?'<div class="ep-form-group"><label class="ep-form-label">Confirmation Source <span class="req">*</span></label>'+apCS('adva-csrc',['Payment evidence','Illustrative'],a.source==='Illustrative'?'Illustrative':'Payment evidence','Select','advActHook')+'</div>':'')
      +money('Verified Amount',a.amount)+date('Payment Date')
      +(ill&&a.source==='Illustrative'?'':inp('ref','Payment Reference / UTR',true,a.ref,'','UTR, cheque number or cash voucher')
      +inp('extRef','External Provider Reference',false,a.extRef,'','Optional')
      +advEvidenceField(a,'Payment Evidence','bank advice or signed voucher',true));
  }else if(a.kind==='dfail'||a.kind==='dcancel'||a.kind==='dreverse'){
    T=[{dfail:'Mark Disbursement Failed',dcancel:'Cancel Disbursement',dreverse:'Reverse Disbursement'}[a.kind]+' · '+a.key,
      a.kind==='dreverse'?'A reversal entry is added to the ledger; the verified record is kept.':'Nothing was issued by this instruction; a new one can be initiated.',
      {dfail:'Mark Failed',dcancel:'Cancel Disbursement',dreverse:'Reverse'}[a.kind]];
    f=area('reason','Reason',true,a.reason);
  }else if(a.kind==='cancelAuth'){
    const left=advM(advAuthorized(h)-(h.kind==='imprest'?advReqIssued(h):advBal(h).issued));
    T=['Cancel Unissued Authorization · '+expKey(h),expMoney(left,cur)+' approved but not issued will be cancelled. What was issued stays to be settled.','Cancel Authorization'];
    f=area('reason','Reason',true,a.reason);
  }else if(a.kind==='return'){
    T=['Record Return · '+expKey(h),'Accountable '+expMoney(b.accountable,cur)+'; '+expMoney(b.available,cur)+' is not reserved by expenses in review, pending returns or recoveries. A return counts only once Finance verifies receipt.','Record Return'];
    f=money('Amount',a.amount)+method()+date('Date Paid Back')
      +inp('ref','Transaction Reference',false,a.ref,'','UTR or receipt number')+inp('extRef','External Provider Reference',false,a.extRef,'','Optional')
      +advEvidenceField(a,'Evidence','bank advice or receipt',false)+area('remarks','Remarks',false,a.remarks);
  }else if(a.kind==='recovery'){
    T=['Raise Recovery · '+expKey(h),'Accountable '+expMoney(b.accountable,cur)+'; '+expMoney(b.available,cur)+' can be recovered. A recovery is due only once someone else authorizes it, and reduces the balance only as collections are verified. Payroll recovery is disabled: '+ADV_DISABLED_METHODS[0][1]+'.','Raise Recovery'];
    f=money('Amount to Recover',a.amount)+method()+area('reason','Reason',true,a.reason,'e.g. overdue since 18 Oct 2026; no expenses filed after two reminders');
  }else if(a.kind==='recdecide'){
    const x=advRecFind(h,a.key)||{};
    T=[(a.to==='Approve'?'Authorize ':'Reject ')+'Recovery '+a.key,expKey(h)+' · '+expMoney(x.amount,cur)+' · raised by '+caN(x.recordedBy)+': '+(x.reason||''),a.to==='Approve'?'Authorize Recovery':'Reject Recovery'];
    f=area('reason',a.to==='Approve'?'Remarks':'Reason',a.to!=='Approve',a.reason);
  }else if(a.kind==='reccollect'){
    const x=advRecFind(h,a.key)||{};
    T=['Record Collection · '+a.key,expKey(h)+' · '+expMoney(advRecUnpaid(x),cur)+' still due ('+(x.method||'')+'). Record money actually received; only this reduces the balance.','Verify Collection'];
    f=money('Amount Received',a.amount)+date('Date Received')+inp('ref','Transaction Reference',true,a.ref,'','UTR or receipt number')
      +inp('extRef','External Provider Reference',false,a.extRef,'','Optional')+advEvidenceField(a,'Evidence of Collection','bank credit advice or receipt',true);
  }else if(a.kind==='reccancel'||a.kind==='recreverse'){
    T=[(a.kind==='reccancel'?'Cancel Recovery ':'Reverse Last Collection · ')+a.key,a.kind==='reccancel'?'What is still due is cancelled; any collected amount stays recorded.':'A reversal entry is added to the ledger and the amount is due again.',a.kind==='reccancel'?'Cancel Recovery':'Reverse'];
    f=area('reason','Reason',true,a.reason);
  }else if(a.kind==='rrverify'||a.kind==='rrfail'||a.kind==='rrreverse'){
    const x=(h.returns||[]).find(function(y){return y.key===a.key;})||{};
    T=[{rrverify:'Verify ',rrfail:'Mark Failed · ',rrreverse:'Reverse · '}[a.kind]+(x.type||'')+' '+a.key,expKey(h)+' · '+expMoney(x.amount,cur)+' · '+(x.method||''),
      {rrverify:'Verify Receipt',rrfail:'Mark Failed',rrreverse:'Reverse'}[a.kind]];
    f=a.kind==='rrverify'?money('Amount Received',a.amount)+date('Date Received')+inp('ref','Reference',true,a.ref)+advEvidenceField(a,'Evidence of Receipt','bank credit advice or receipt',true)
      :area('reason','Reason',true,a.reason);
  }else if(a.kind==='review'){
    T=['Review Settlement · '+expKey(h),'Issued '+expMoney(b.issued,cur)+' · accepted '+expMoney(b.accepted,cur)+' · returned and recovered '+expMoney(b.returns+b.recoveries,cur)+' · accountable '+expMoney(b.accountable,cur)
      +(b.pending?' · '+expMoney(b.pending,cur)+' in expenses still under review':'')+'. The review is accepted only when nothing is accountable or pending.','Save Review'];
    f=area('remarks','Review Remarks',true,a.remarks);
  }else if(a.kind==='extend'){
    T=['Extend Settlement Due Date · '+expKey(h),'Now due '+cdLabel(h.dueOn)+'. The change and its reason are kept in Logs and History.','Extend'];
    f=date('New Due Date')+area('reason','Reason',true,a.reason);
  }else if(a.kind==='close'){
    T=['Close '+expKey(h),'Everything issued is accounted for and a Finance review accepted it. A closed record keeps its history and takes no new expenses or funding.','Close'];
    f=area('remarks','Remarks',false,a.remarks);
  }else if(a.kind==='fundStatus'){
    T=[{'On Hold':'Put Fund on Hold','Active':'Resume Fund','Closing':'Start Closing'}[a.to]+' · '+expKey(h),a.to==='On Hold'?'No further funding is issued while on hold.':a.to==='Closing'?'No new expenses or funding; settle the balance, then close.':'Funding can be issued again.','Save'];
    f=area('reason','Reason',true,a.reason);
  }else if(a.kind==='transfer'){
    T=['Transfer Custodian · '+expKey(h),'The new custodian takes over the accountable balance of '+expMoney(b.accountable,cur)+'.','Transfer'];
    f='<div class="ep-form-group ep-form-full"><label class="ep-form-label">New Custodian <span class="req">*</span></label>'+axCS('adva-to',impCustodianOptions().filter(function(x){return x!==advEmpLabel(h.custodianEid);}),a.to?advEmpLabel(a.to):'','Search employee')
      +'<div class="ea-hint">Only employees RBAC authorizes as custodians (advance.replenish, e.g. the Imprest Custodians team).</div></div>'
      +area('reason','Reason',true,a.reason);
  }else if(a.kind==='replenish'){
    const el=impEligibleLines(h),me=advMyEid(),behalf=me!==h.custodianEid;
    T=['Request Replenishment · '+expKey(h),'Top up '+expKey(h)+' by accepted expenses not yet replenished. Float '+expMoney(h.float,cur)+' · accountable now '+expMoney(b.accountable,cur)+'.','Submit Request'];
    f='<div class="ep-form-group ep-form-full"><label class="ep-form-label">Accepted expenses <span class="req">*</span></label>'
      +(el.length?el.map(function(s){const k=s.claimId+':'+s.lineId;return '<label class="adv-pick-row"><input type="checkbox" class="adva-pick" value="'+k+'"'+(a.picks.indexOf(k)>=0?' checked':'')+'> '+advE(s.claimKey)+' · '+advE(s.lineTitle)+' · '+expMoney(s.amount,cur)+'</label>';}).join('')
        :'<div class="wb-empty-sm">No accepted expense is waiting to be replenished.</div>')+'</div>'
      +area('reason','Justification',true,a.reason)
      +(typeof bgImpJustFieldHTML==='function'?bgImpJustFieldHTML(h,a,'adva'):'')
      +(behalf?area('why','Reason for Requesting on Behalf of '+idEmpName(h.custodianEid),true,a.why,'Recorded on the request and the fund; you cannot approve this request'):'');
    if(behalf)T[1]+=' You are requesting on behalf of the custodian, '+idEmpName(h.custodianEid)+', who is notified.';
  }
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal ca-act-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+advE(T[0])+'</span><button class="ct-modal-close" onclick="advActClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+advE(T[1])+'</p><div class="ep-form-grid">'+f+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="advActClose()">Cancel</button>'
    +'<button class="ep-save-btn'+(['dreverse','rrreverse','cancelAuth','dcancel','reccancel','recreverse'].indexOf(a.kind)>=0||(a.kind==='recdecide'&&a.to==='Reject')?' is-danger':'')+'" onclick="advActSubmit()">'+advE(T[2])+'</button></div></div></div></div>';
}
function advActSubmit(){
  advActSync();
  const a=advAct;if(!a)return;
  const isReq=a.kind==='initiate'||a.kind==='verify'||a.kind.charAt(0)==='d'||a.kind==='cancelAuth';
  const h=isReq?advEngineRec(a.id):advHolder(a.id);
  /* Concurrency: refuse to act on a record that changed while the popup was open. */
  if(!h||advRevOf(h)!==a.rev){advAct=null;renderADTPage();showToast('This record changed','error',(h?expKey(h)+' was updated by someone else':'The record is gone')+' while this was open. Nothing was saved; open it again.');return;}
  let err='',msg='';
  const K=a.kind;
  if(K==='initiate'){err=advDisbInitiate(a.id,{amount:a.amount,method:a.method,account:a.account,remarks:a.remarks,sourceId:a.sourceId});msg='Disbursement initiated - Processing until verified';}
  else if(K==='verify'){err=advDisbVerify(a.id,a.key,{amount:a.amount,date:a.date,ref:a.ref,extRef:a.extRef,evidence:a.evidence,source:a.source});msg=a.source==='Illustrative'?'Illustrative disbursement verified':'Disbursement verified - funds issued';}
  else if(K==='dfail'||K==='dcancel'){err=advDisbFail(a.id,a.key,a.reason,K==='dcancel');msg=K==='dcancel'?'Disbursement cancelled':'Disbursement marked failed';}
  else if(K==='dreverse'){err=advDisbReverse(a.id,a.key,a.reason);msg='Disbursement reversed';}
  else if(K==='cancelAuth'){err=advCancelAuth(a.id,a.reason);msg='Unissued authorization cancelled';}
  else if(K==='return'){err=advRrCreate(a.id,{type:'Return',amount:a.amount,method:a.method,date:a.date,ref:a.ref,extRef:a.extRef,evidence:a.evidence,reason:a.remarks});msg='Return recorded - pending verification';}
  else if(K==='recovery'){err=advRecoveryRaise(a.id,{amount:a.amount,method:a.method,reason:a.reason});msg='Recovery raised - pending approval';}
  else if(K==='recdecide'){err=advRecoveryDecide(a.id,a.key,a.to,a.reason);msg=a.to==='Approve'?'Recovery authorized':'Recovery rejected';}
  else if(K==='reccollect'){err=advRecoveryCollect(a.id,a.key,{amount:a.amount,date:a.date,ref:a.ref,extRef:a.extRef,evidence:a.evidence});msg='Collection verified';}
  else if(K==='reccancel'){err=advRecoveryCancel(a.id,a.key,a.reason);msg='Recovery cancelled';}
  else if(K==='recreverse'){err=advRecoveryReverse(a.id,a.key,a.reason);msg='Collection reversed';}
  else if(K==='rrverify'){err=advRrVerify(a.id,a.key,{amount:a.amount,date:a.date,ref:a.ref,evidence:a.evidence});msg='Receipt verified';}
  else if(K==='rrfail'){err=advRrFail(a.id,a.key,a.reason);msg='Marked failed';}
  else if(K==='rrreverse'){err=advRrReverse(a.id,a.key,a.reason);msg='Reversed';}
  else if(K==='review'){err=advReview(a.id,a.remarks);msg='Settlement reviewed';}
  else if(K==='extend'){err=advExtendDue(a.id,a.date,a.reason);msg='Due date extended';}
  else if(K==='close'){err=advClose(a.id,a.remarks);msg='Closed';}
  else if(K==='fundStatus'){err=impFundSet(a.id,a.to,a.reason);msg='Fund '+a.to;}
  else if(K==='transfer'){err=impTransfer(a.id,a.to,a.reason);msg='Custodian changed';}
  else if(K==='replenish'){const res=impReplenishCreate(a.id,a.picks,a.reason,null,a.why);err=res.error||'';if(!err){impReqSel=res.request.id;advTab='funding';}msg='Replenishment submitted';}
  if(err){showToast('Not saved','error',err);return;}
  advAct=null;renderADTPage();
  showToast(msg,'success',expKey(h)+'.');
}

/* ── Imprest Funds ─────────────────────────────────────────────────────── */
function impApply(){impQ=lpSearchValue('imp-f-q');impStatusF=advPick('imp-f-status','All Statuses');advSel=null;renderADTPage();}
function impReset(){impQ='';impStatusF='';advSel=null;renderADTPage();}
function impStat(s){impStatusF=impStatusF===s?'':s;advSel=null;renderADTPage();}
function impListHTML(){
  const all=impScope(impFunds);
  const rows=advMatch(all,impQ).filter(function(f){return !impStatusF||(impStatusF==='Needs Reassignment'?impLapsed(f):f.status===impStatusF);});
  if(advSel!=null&&!rows.some(function(f){return f.id===advSel;}))advSel=null;
  const pgn=listPage('imprest',[impQ,impStatusF].join('|'),rows.map(function(f,i){
    const b=advBal(f),open=impRequests.filter(function(q){return q.fundId===f.id&&(['Draft','Awaiting Approval','Follow-Up'].indexOf(q.status)>=0||(q.disb&&['Ready for Disbursement','Processing','Partially Disbursed'].indexOf(q.disb.status)>=0));});
    return '<tr class="adv-row'+(advSel===f.id?' lp-row-selected':'')+'" id="adv-row-'+f.id+'" style="cursor:pointer" onclick="advOpen('+f.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(f.name)+'">'+advE(f.name)+'</div><div class="lp-c-sub">'+expKey(f)+' · '+advE(f.reviewFreq)+' review</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+advE(idEmpName(f.custodianEid))+'</div><div class="lp-c-sub">'+advE(f.dept)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(f.float,f.currency)+'</div><div class="lp-c-sub">float</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(b.accountable,f.currency)+'</div><div class="lp-c-sub">issued '+expMoney(b.issued,f.currency)+'</div></td>'
      +'<td>'+axBadge(statusTone(f.status),f.status)+(impLapsed(f)?'<div class="lp-c-sub exp-cap-over">Reassign custodian</div>':'')+'</td>'
      +'<td><div class="lp-c-plain">'+(open.length?open.map(function(q){return expKey(q)+' · '+q.requestType;}).join('<br>'):'—')+'</div></td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No imprest fund matches this filter.</td></tr>');
  const tiles=['Active','On Hold','Closing','Needs Reassignment'].map(function(s){return caStat(s,all.filter(function(f){return s==='Needs Reassignment'?impLapsed(f):f.status===s;}).length,impStatusF===s,'impStat(\''+s+'\')',s==='Needs Reassignment'?'bad':'');}).join('');
  return '<div class="lp-page">'
    +advFilterBar(lpSearchField('imp-f-q',impQ,'Search fund, ID or custodian','impApply()')+apCS('imp-f-status',IMP_STATUSES,impStatusF,'All Statuses')
      +clearFiltersBtn([impQ,impStatusF],'impReset()')+'<button class="lp-pill-search" onclick="impApply()">Search</button>',tiles)
    +advSplitWrap('<table class="lp-table ax-table exp-table adv-table"><thead><tr><th>S. No</th><th>Fund</th><th>Custodian</th><th>Float</th><th>Accountable</th><th>Status</th><th>Open Requests</th></tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}
function renderImpSidebar(f){
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'funding',label:'Funding'},{id:'settlement',label:'Settlement'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===advTab;}))advTab='basic-details';
  const hero=sbHero({icon:ADV_ICO.fund,name:advE(f.name),meta:[expKey(f),advE(idEmpName(f.custodianEid)),f.currency],status:axBadge(statusTone(f.status),f.status)});
  let body;
  if(advTab==='funding')body=hero+impFundingHTML(f);
  else if(advTab==='settlement')body=hero+advSettleTabHTML(f);
  else if(advTab==='logs')body=lpLogsView(f.logs,'');
  else if(advTab==='history')body=sbHistoryHTML(f);
  else if(advTab==='workflow')body=wfTimelineHTML(advWorkflowRows(f));
  else body=impBasicHTML(f,hero);
  return axTabBar('adv',tabs,advTab,'advNav','advPanelClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function impBasicHTML(f,hero){
  const man=advCan('advance.imprest.manage'),own=advOwnHolder(f),t=advType(f.typeId),wf=caWfRec(f.workflowId);
  let act='';
  const lapsed=impLapsed(f);
  const canTop=f.status==='Active'&&f.replenish&&!lapsed&&impEligibleLines(f).length>0;
  if(canTop&&own&&advCan('advance.replenish'))act+=advBtn('Request Replenishment','advActOpen(\'replenish\','+f.id+')',true);
  if(canTop&&!own&&advCan('advance.replenish.others'))act+=advBtn('Request on Behalf of Custodian','advActOpen(\'replenish\','+f.id+')');
  if(man&&f.status==='Active')act+=advBtn('Put on Hold','advActOpen(\'fundStatus\','+f.id+',{to:\'On Hold\'})');
  if(man&&f.status==='On Hold')act+=advBtn('Resume','advActOpen(\'fundStatus\','+f.id+',{to:\'Active\'})');
  if(man&&['Active','On Hold'].indexOf(f.status)>=0)act+=advBtn('Start Closing','advActOpen(\'fundStatus\','+f.id+',{to:\'Closing\'})');
  if(man&&['Active','On Hold','Closing'].indexOf(f.status)>=0)act+=advBtn('Transfer Custodian','advActOpen(\'transfer\','+f.id+')');
  if(man&&f.status==='Draft'&&!impRequests.some(function(q){return q.fundId===f.id&&q.requestType==='Initial Funding'&&['Rejected','Withdrawn','Cancelled'].indexOf(q.status)<0;}))act+=advBtn('Request Initial Funding','impInitialClick('+f.id+')',true);
  return hero+(act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(f.status==='Active'&&f.replenish&&!lapsed&&!impEligibleLines(f).length&&(own||advCan('advance.replenish.others'))?'<div class="ea-hint">No accepted spend is waiting to be replenished.</div>':'')
    +(advExitReview(f)?'<div class="wb-note is-bad"><b>Exit review</b><div class="wb-note-sub">The custodian is leaving with an open balance. Transfer the fund or settle it.</div></div>':'')
    +(lapsed?'<div class="wb-note is-bad"><b>Custodian no longer authorized</b><div class="wb-note-sub">'+advE(impCustodianIssue(f.custodianEid))+' The accountable balance of '
      +expMoney(advBal(f).accountable,f.currency)+' stays with '+advE(idEmpName(f.custodianEid))+(f.lapse?' (since '+cdLabel(f.lapse.since)+')':'')
      +'. No new expenses or funding until an authorized custodian is assigned (Transfer Custodian), or the fund is reconciled and closed (returns, recoveries, review).</div></div>':'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fTag,'Fund Name',advE(f.name))
    +axField(AX_ICO.fHash,'Imprest Fund ID',expKey(f))
    +axField(AX_ICO.fUser,'Custodian',advE(idEmpName(f.custodianEid)))
    +axField(AX_ICO.fBuild,'Department',advE(f.dept))
    +axField(AX_ICO.fCash,'Authorized Float',expMoney(f.float,f.currency))
    +axField(AX_ICO.fCash,'Currency',f.currency)
    +axField(AX_ICO.fBox,'Imprest Type',advE(t?t.name:''))
    +axField(AX_ICO.fBox,'Eligible Categories',advE(f.cats.length?f.cats.join(', '):'Any category'))
    +axField(AX_ICO.fCheck,'Replenishment Allowed',f.replenish?'Yes':'No')
    +axField(AX_ICO.fTag,'Approval Workflow',wf?caWfKey(wf)+' '+advE(wf.name):'—')
    +axField(AX_ICO.fCal,'Review Frequency',advE(f.reviewFreq)+(f.reviewNote?' <span class="ax-sub">'+advE(f.reviewNote)+'</span>':''))
    +axField(AX_ICO.fCal,'Effective',cdLabel(f.effFrom)+(f.effTo?' – '+cdLabel(f.effTo):' · open-ended'))
    +axField(AX_ICO.fUser,'Created By',advE(caN(f.createdBy))+' <span class="ax-sub">'+advE(f.createdAt)+'</span>')
    +axField(EXP_ICO.note,'Fund Purpose',advE(f.purpose),true)
    +(f.transfers.length?axField(EXP_ICO.note,'Custodian History',f.transfers.map(function(x){return advE(idEmpName(x.from))+' → '+advE(idEmpName(x.to))+' ('+advE(x.at)+', '+expMoney(x.balance,f.currency)+')';}).join('<br>'),true):'')
    +'</div>';
}
function impInitialClick(id){
  const res=impInitialRequest(id);
  if(res.error){showToast('Not created','error',res.error);return;}
  impReqSel=res.request.id;advTab='funding';renderADTPage();
  showToast('Funding request drafted','success',expKey(res.request)+' - submit it for approval.');
}
function impReqPick(id){impReqSel=impReqSel===id?null:id;isbTab('adv',renderAdvSidebar);}
function impFundingHTML(f){
  const list=impRequests.filter(function(q){return q.fundId===f.id;});
  let out='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Funding Requests <span class="ax-count">'+list.length+'</span></span></div>';
  if(!list.length)return out+'<div class="wb-empty-sm">No funding request yet.</div>';
  out+='<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Request</th><th>Type</th><th class="wb-num">Amount</th><th>Approval</th><th>Disbursement</th></tr></thead><tbody>'
    +list.map(function(q){return '<tr style="cursor:pointer" class="'+(impReqSel===q.id?'lp-row-selected':'')+'" onclick="impReqPick('+q.id+')"><td class="csag-td"><a class="ax-c-link">'+expKey(q)+'</a></td><td class="csag-td">'+advE(q.requestType)+'</td>'
      +'<td class="csag-td wb-num">'+expMoney(caTotal(q),q.currency)+'</td><td class="csag-td">'+axBadge(statusTone(q.status),q.status)+'</td><td class="csag-td">'+advE(advDisbStatus(q))+'</td></tr>';}).join('')
    +'</tbody></table></div>';
  const q=list.find(function(x){return x.id===impReqSel;});
  if(!q)return out+'<div class="ea-hint">Pick a request to see its approval and disbursement.</div>';
  let act='';
  if(q.status==='Draft'&&caCanSubmit(q))act+=advBtn('Submit','advSubmitClick('+q.id+')',true);
  if(advCan('advance.cancel')&&['Approved','Partially Approved'].indexOf(q.status)>=0&&advM(advAuthorized(q)-advReqIssued(q))>0&&!advProcessing(q))act+=advBtn('Cancel Unissued','advActOpen(\'cancelAuth\','+q.id+')');
  out+='<div class="wb-proj-h">'+expKey(q)+' · '+advE(q.requestType)+'<span class="ca-actions" style="float:right">'+act+'</span></div>'
    +(q.purpose?'<div class="ea-hint">'+advE(q.purpose)+'</div>':'')
    +(q.onBehalf?'<div class="ea-hint">Requested by '+advE(caN(q.onBehalf.by))+' on behalf of the custodian · '+advE(q.onBehalf.at)+': '+advE(q.onBehalf.reason)+'</div>':'')
    +(q.sourceLines.length?'<div class="ea-hint">Replenishes: '+q.sourceLines.map(function(s){return advE(s.claimKey)+' '+advE(s.lineTitle)+' '+expMoney(s.amount,q.currency);}).join(' · ')+'</div>':'')
    +caApprovalTabHTML(q)+advDisbTabHTML(q);
  return out;
}

/* Create an imprest fund. */
function impStart(){
  if(!advCan('advance.imprest.manage')){emsDeny('create imprest funds');return;}
  advCloseForms();
  const t=advTypesHere(true).find(function(x){return x.model==='Imprest';});
  impForm={name:'',custodianEid:'',purpose:'',float:'',currency:'INR',cats:[],replenish:true,typeId:t?t.id:'',workflowId:t?t.workflowId:'',reviewFreq:'Monthly',reviewNote:'',effFrom:wbToday(),effTo:''};
  renderADTPage();
}
function impFormSync(){
  const d=impForm;if(!d)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  [['name','impf-name'],['purpose','impf-purpose'],['float','impf-float'],['reviewNote','impf-rnote'],['effFrom','impf-from'],['effTo','impf-to']].forEach(function(p){const x=v(p[1]);if(x!=null)d[p[0]]=x;});
  if(document.getElementById('csw-impf-cust'))d.custodianEid=advEmpFromLabel(getCSValue('impf-cust'))||d.custodianEid;
  if(document.getElementById('csw-impf-cur')){const c=getCSValue('impf-cur');if(EXP_CURRENCIES.indexOf(c)>=0)d.currency=c;}
  if(document.getElementById('csw-impf-type')){const t=advTypesHere(true).find(function(x){return x.name===getCSValue('impf-type');});if(t&&t.id!==d.typeId){d.typeId=t.id;d.workflowId=t.workflowId;}}
  if(document.getElementById('csw-impf-wf')){const w=caWorkflows.find(function(x){return caWfKey(x)+' '+x.name===getCSValue('impf-wf');});if(w)d.workflowId=w.id;}
  if(document.getElementById('csw-impf-freq'))d.reviewFreq=getCSValue('impf-freq');
  if(document.getElementById('csw-impf-rep'))d.replenish=getCSValue('impf-rep')!=='No';
  if(document.getElementById('msw-impf-cats'))d.cats=getMSValue('impf-cats');
}
function impFormHook(){impFormSync();renderADTPage();}
function impFormHTML(){
  const d=impForm,t=advType(d.typeId),wfs=caWorkflows.filter(function(w){return w.entity===advEnt()&&caWfKindOf(w)==='Imprest'&&w.status==='Active';});
  const wf=caWfRec(Number(d.workflowId));
  const field=function(label,req,html,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+'</div>';};
  const f=field('Fund Name',true,'<input class="ep-form-input" id="impf-name" value="'+attrSafe(d.name)+'" placeholder="e.g. Pune office petty cash">')
    +field('Custodian Employee',true,axCS('impf-cust',impCustodianOptions(),advEmpLabel(d.custodianEid),'Search employee','impFormHook')
      +'<div class="ea-hint">Employees RBAC authorizes as custodians (advance.replenish, e.g. through the Imprest Custodians team).</div>')
    +field('Department',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe((idEmp(d.custodianEid)||{}).dept||'')+'">')
    +field('Imprest Type',true,apCS('impf-type',advTypesHere(true).filter(function(x){return x.model==='Imprest';}).map(function(x){return x.name;}),t?t.name:'','Select type','impFormHook'))
    +field('Authorized Float Amount',true,'<div class="ax-currency"><span>'+d.currency+'</span><input class="ep-form-input" id="impf-float" type="number" min="0" step="0.01" value="'+attrSafe(d.float)+'"></div>')
    +field('Currency',true,apCS('impf-cur',EXP_CURRENCIES,d.currency,'Select currency','impFormHook'))
    +field('Eligible Categories',false,apMS('impf-cats',EXP_CATEGORIES,d.cats,'Any category'))
    +field('Replenishment Allowed',true,apCS('impf-rep',['Yes','No'],d.replenish?'Yes':'No','Select'))
    +field('Replenishment Approval Workflow',true,apCS('impf-wf',wfs.map(function(w){return caWfKey(w)+' '+w.name;}),wf?caWfKey(wf)+' '+wf.name:'','Select workflow'))
    +field('Review Frequency',true,apCS('impf-freq',IMP_REVIEW_FREQ,d.reviewFreq,'Select','impFormHook'))
    +(d.reviewFreq==='Custom'?field('Custom Review Schedule',true,'<input class="ep-form-input" id="impf-rnote" value="'+attrSafe(d.reviewNote)+'" placeholder="e.g. every two weeks">'):'')
    +field('Effective From',true,apCD('impf-from',d.effFrom,'Select date'))+field('Effective To',false,apCD('impf-to',d.effTo,'Select date'))
    +field('Fund Purpose',true,'<textarea class="ep-form-input ax-notes" id="impf-purpose">'+advE(d.purpose)+'</textarea>',true)
    +(typeof bgImpJustFieldHTML==='function'?bgImpJustFieldHTML(null,d,'impf'):'');
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal adv-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Imprest Fund</span><button class="ct-modal-close" onclick="impFormClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">The fund starts as Draft. Its initial float is a funding request: approved through the workflow, then issued only once a disbursement is verified.</p>'
    +'<div class="ep-form-grid">'+f+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="impFormClose()">Cancel</button>'
    +'<button class="ep-cancel-btn" onclick="impFormSave(false)">Save as Draft</button><button class="ep-save-btn" onclick="impFormSave(true)">Create &amp; Submit Funding</button></div></div></div></div>';
}
function impFormClose(){impForm=null;renderADTPage();}
function impFormSave(submit){
  impFormSync();const d=impForm;if(!d)return;
  if(d.reviewFreq==='Custom'&&!String(d.reviewNote||'').trim()){showToast('Not saved','error','Describe the custom review schedule.');return;}
  const res=impFundCreate(d);
  if(res.error){showToast('Not saved','error',res.error);return;}
  let note=' saved as Draft with funding request '+expKey(res.request)+'.';
  if(submit){const e=advSubmit(res.request.id);note=e?' created; the funding request could not be submitted: '+e:' created; '+expKey(res.request)+' is in approval.';}
  impForm=null;advPageTab='imprest';advSel=res.fund.id;impReqSel=res.request.id;advTab='funding';renderADTPage();
  showToast('Imprest fund created','success',expKey(res.fund)+note);
}

/* ── Settlements ───────────────────────────────────────────────────────── */
function stlRows(){
  const hs=advScope(advancesData).filter(function(r){return advBal(r).issued>0||r.closed||(r.ledger||[]).length;})
    .concat(impScope(impFunds).filter(function(f){return advBal(f).issued>0||f.closed;}));
  return advMatch(hs,stlQ).filter(function(h){return !stlStatusF||(stlStatusF==='Overdue'?advIsOverdue(h):stlStatusF==='Recovery Approval'?stlRecPending(h)
    :stlStatusF==='Recovery Due'?advBal(h).recoveryDue>0:advSettleStatus(h)===stlStatusF);});
}
function stlRecPending(h){return (h.returns||[]).some(function(x){return x.type==='Recovery'&&x.status==='Pending Approval';});
}
function stlApply(){stlQ=lpSearchValue('stl-f-q');stlStatusF=advPick('stl-f-status','All Settlement');advSel=null;renderADTPage();}
function stlReset(){stlQ='';stlStatusF='';advSel=null;renderADTPage();}
function stlStat(s){stlStatusF=stlStatusF===s?'':s;advSel=null;renderADTPage();}
function stlListHTML(){
  const all=advScope(advancesData).concat(impScope(impFunds)).filter(function(h){return advBal(h).issued>0||h.closed;});
  const rows=stlRows();
  if(advSel!=null&&!rows.some(function(h){return h.id===advSel;}))advSel=null;
  const pgn=listPage('settlements',[stlQ,stlStatusF].join('|'),rows.map(function(h,i){
    const b=advBal(h),cur=h.currency,ss=advSettleShown(h);
    return '<tr class="adv-row'+(advSel===h.id?' lp-row-selected':'')+'" id="adv-row-'+h.id+'" style="cursor:pointer" onclick="advOpen('+h.id+',\'settlement\')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc">'+advE(h.kind==='fund'?h.name:h.title)+'</div><div class="lp-c-sub">'+expKey(h)+(h.settlementKey?' · '+h.settlementKey:'')+(h.kind==='fund'?' · imprest':'')+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+advE(h.kind==='fund'?idEmpName(h.custodianEid):h.name)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(b.issued,cur)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(b.accepted,cur)+'</div>'+(b.pending?'<div class="lp-c-sub">'+expMoney(b.pending,cur)+' in review</div>':'')+'</td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(advM(b.returns+b.recoveries),cur)+'</div>'+(b.recoveryDue>0?'<div class="lp-c-sub exp-cap-over">recovery due '+expMoney(b.recoveryDue,cur)+'</div>':stlRecPending(h)?'<div class="lp-c-sub">recovery awaiting approval</div>':'')+'</td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain'+(b.accountable>0?' exp-cap-over':'')+'">'+expMoney(b.accountable,cur)+'</div></td>'
      +'<td>'+axBadge(statusTone(ss),ss)+'<div class="lp-c-sub">'+(h.dueOn?'due '+cdLabel(h.dueOn):h.kind==='fund'?advE(h.reviewFreq)+' review':'')+'</div></td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">Nothing issued matches this filter.</td></tr>');
  const tiles=['Under Review','Overdue','Recovery Approval','Recovery Due'].map(function(s){
    return caStat(s,all.filter(function(h){return s==='Overdue'?advIsOverdue(h):s==='Recovery Approval'?stlRecPending(h):s==='Recovery Due'?advBal(h).recoveryDue>0:advSettleStatus(h)===s;}).length,
      stlStatusF===s,'stlStat(\''+s+'\')',s==='Overdue'||s==='Recovery Due'?'bad':s==='Recovery Approval'?'wait':'');}).join('');
  return '<div class="lp-page">'
    +advFilterBar(lpSearchField('stl-f-q',stlQ,'Search ID, title or employee','stlApply()')+apCS('stl-f-status',ADV_SETTLE_STATUSES.concat(['Recovery Approval','Recovery Due']),stlStatusF,'All Settlement')
      +clearFiltersBtn([stlQ,stlStatusF],'stlReset()')+'<button class="lp-pill-search" onclick="stlApply()">Search</button>',tiles)
    +'<div class="wb-note">Accountable = issued − accepted expenses − verified returns − verified recoveries.</div>'
    +advSplitWrap('<table class="lp-table ax-table exp-table adv-table"><thead><tr><th>S. No</th><th>Advance</th><th>Employee</th><th>Issued</th><th>Accepted</th><th>Returned</th><th>Accountable</th><th>Settlement</th></tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}

/* ── Advance Settings ──────────────────────────────────────────────────── */
function advSetSubs(){
  const s=[];
  if(advCan('advance.settings.manage'))s.push(['types','Advance Types']);
  if(advCan('advance.policy.manage'))s.push(['policies','Advance Policies']);
  if(advCan('advance.settings.manage'))s.push(['workflows','Approval Workflows'],['general','General']);
  return s;
}
function advSetSubPick(k){if(advSetSub===k)return;advCloseForms();awfSel=null;advSetSub=k;advCfgDraft=null;renderADTPage();}
function advSettingsHTML(){
  const subs=advSetSubs();
  if(!subs.some(function(x){return x[0]===advSetSub;}))advSetSub=subs.length?subs[0][0]:'types';
  const strip='<div class="segmented is-compact adv-set-subs">'+subs.map(function(x){return '<button type="button" class="seg-btn'+(advSetSub===x[0]?' active':'')+'" onclick="advSetSubPick(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>';
  let body;
  if(advSetSub==='policies')body=advPolListHTML();
  else if(advSetSub==='workflows')body='<div class="adv-set-actions">'+advBtn('Add Advance Workflow','awfStartAdd(\'Advance\')',true)+advBtn('Add Imprest Workflow','awfStartAdd(\'Imprest\')')+'</div>'+awfListHTML();
  else if(advSetSub==='general')body=advGeneralHTML();
  else body=advTypeListHTML();
  return '<div class="adv-settings">'+strip+body+'</div>';
}
function advTypeListHTML(){
  const list=advTypesHere();
  return '<div class="lp-page"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Advance Types <span class="ax-count">'+list.length+'</span></span><span class="ca-actions">'+advBtn('Add Type','advTypeStart()',true)+'</span></div>'
    +'<div class="lp-table-card"><table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th><th>Type</th><th>Model</th><th>Expense Categories</th><th>Approval Route</th><th>Settlement</th><th>Status</th><th>Action</th></tr></thead><tbody>'
    +(list.length?list.map(function(t,i){const w=caWfRec(t.workflowId);
      return '<tr><td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-main">'+advE(t.name)+'</div><div class="lp-c-sub">'+t.key+'</div></td><td><div class="lp-c-plain">'+t.model+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(t.cats.join(', '))+'">'+advE(t.cats.length?t.cats.join(', '):'Any category')+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc">'+(w?caWfKey(w)+' '+advE(w.name):'<span class="wb-warn">Not set</span>')+'</div></td>'
        +'<td><div class="lp-c-plain">'+(t.model==='One-Time'?t.settleDays+' days after issuance':t.replenish?'Replenished':'No replenishment')+'</div></td>'
        +'<td>'+axBadge(statusTone(t.status),t.status)+'</td>'
        +'<td>'+advBtn('Edit','advTypeStart('+t.id+')')+' '+advBtn(t.status==='Active'?'Deactivate':'Activate','advTypeToggleClick('+t.id+')')+'</td></tr>';}).join('')
      :'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No advance type yet.</td></tr>')
    +'</tbody></table></div></div>';
}
function advTypeToggleClick(id){const e=advTypeToggle(id);if(e){showToast('Not saved','error',e);return;}renderADTPage();showToast('Saved','success',advType(id).name+' is '+advType(id).status+'.');}
function advTypeStart(id){
  if(!advCan('advance.settings.manage')){emsDeny('configure advance types');return;}
  advCloseForms();
  const t=id!=null?advType(id):null;
  advTypeForm=t?{id:t.id,name:t.name,model:t.model,desc:t.desc,cats:t.cats.slice(),workflowId:t.workflowId,settleRequired:t.settleRequired,settleDays:String(t.settleDays||''),replenish:t.replenish}
    :{id:null,name:'',model:'One-Time',desc:'',cats:[],workflowId:'',settleRequired:true,settleDays:String(ADV_SETTLE_DAYS),replenish:true};
  renderADTPage();
}
function advTypeSync(){
  const d=advTypeForm;if(!d)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  [['name','advt-name'],['desc','advt-desc'],['settleDays','advt-days']].forEach(function(p){const x=v(p[1]);if(x!=null)d[p[0]]=x;});
  if(document.getElementById('csw-advt-model')){const m=getCSValue('advt-model');if(m&&m!==d.model){d.model=m;d.workflowId='';}}
  if(document.getElementById('csw-advt-wf')){const w=caWorkflows.find(function(x){return caWfKey(x)+' '+x.name===getCSValue('advt-wf');});d.workflowId=w?w.id:d.workflowId;}
  if(document.getElementById('csw-advt-rep'))d.replenish=getCSValue('advt-rep')!=='No';
  if(document.getElementById('msw-advt-cats'))d.cats=getMSValue('advt-cats');
}
function advTypeHook(){advTypeSync();renderADTPage();}
function advTypeFormHTML(){
  const d=advTypeForm,kind=d.model==='Imprest'?'Imprest':'Advance';
  const wfs=caWorkflows.filter(function(w){return w.entity===advEnt()&&caWfKindOf(w)===kind&&w.status!=='Inactive';});
  const wf=caWfRec(Number(d.workflowId));
  const field=function(label,req,html,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+'</div>';};
  const f=field('Advance Type Name',true,'<input class="ep-form-input" id="advt-name" value="'+attrSafe(d.name)+'">')
    +field('Advance Model',true,apCS('advt-model',['One-Time','Imprest'],d.model,'Select','advTypeHook'))
    +field('Eligible Expense Categories',false,apMS('advt-cats',EXP_CATEGORIES,d.cats,'Any category'))
    +field('Approval Workflow',true,apCS('advt-wf',wfs.map(function(w){return caWfKey(w)+' '+w.name;}),wf?caWfKey(wf)+' '+wf.name:'','Select '+kind+' workflow')
      +(wfs.length?'':'<div class="ea-hint">Add an '+kind+' workflow under Approval Workflows first.</div>'))
    +(d.model==='One-Time'?field('Default Settlement Duration (days)',true,'<input class="ep-form-input" id="advt-days" type="number" min="1" max="365" value="'+attrSafe(d.settleDays)+'">')
      :field('Replenishment Allowed',true,apCS('advt-rep',['Yes','No'],d.replenish?'Yes':'No','Select')))
    +field('Description',false,'<textarea class="ep-form-input ax-notes" id="advt-desc">'+advE(d.desc)+'</textarea>',true);
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal adv-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(d.id!=null?'Edit Advance Type':'Add Advance Type')+'</span><button class="ct-modal-close" onclick="advTypeClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+advE(idEntityName(advEnt()))+'. A one-time advance is settled by expenses and returns; an imprest fund is a revolving float held by a custodian.</p>'
    +'<div class="ep-form-grid">'+f+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="advTypeClose()">Cancel</button><button class="ep-save-btn" onclick="advTypeSaveClick()">Save</button></div></div></div></div>';
}
function advTypeClose(){advTypeForm=null;renderADTPage();}
function advTypeSaveClick(){
  advTypeSync();const d=advTypeForm;if(!d)return;
  const err=advTypeSave(d);
  if(err){showToast('Not saved','error',err);return;}
  advTypeForm=null;renderADTPage();showToast('Saved','success',d.name+' saved.');
}
/* Policies */
function advPolListHTML(){
  const list=advPolicies.filter(function(p){return p.entity===advEnt();});
  return '<div class="lp-page"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Advance Policies <span class="ax-count">'+list.length+'</span></span><span class="ca-actions">'+advBtn('Add Policy','advPolStart()',true)+'</span></div>'
    +'<div class="wb-note">The most specific active policy applies.</div>'
    +'<div class="lp-table-card"><table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th><th>Policy</th><th>Applies To</th><th>Limits</th><th>Outstanding</th><th>Status</th><th>Action</th></tr></thead><tbody>'
    +(list.length?list.map(function(p,i){const t=advType(p.typeId),sh=advPolShown(p),c=p.status==='Active'?advPolConflicts(p):[];
      return '<tr><td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-main ax-c-trunc" title="'+attrSafe(p.name)+'">'+advE(p.name)+'</div><div class="lp-c-sub ax-c-trunc">'+p.key+' · '+advE(t?t.name:'')+'</div></td>'
        +'<td><div class="lp-c-plain">'+p.appliesTo+'</div><div class="lp-c-sub ax-c-trunc">'+advE(advPolScope(p))+'</div></td>'
        +'<td class="exp-c-nw"><div class="lp-c-plain">'+(p.minAmt!==''?expMoney(p.minAmt,p.currency)+' – ':'up to ')+expMoney(p.maxAmt,p.currency)+'</div><div class="lp-c-sub">'+(p.partialApproval?'partial approval':'no partial approval')+' · '+(p.partialDisbursement?'partial disbursement':'full disbursement')+'</div></td>'
        +'<td class="exp-c-nw"><div class="lp-c-plain">'+(p.maxOpen!==''?p.maxOpen+' open':'Any number')+' · '+(p.maxOutstanding!==''?expMoney(p.maxOutstanding,p.currency):'no cap')+'</div><div class="lp-c-sub">'+p.restriction+' if unsettled'+(p.maxSettleDays!==''?' · settle in '+p.maxSettleDays+'d':'')+'</div></td>'
        +'<td class="exp-c-nw">'+axBadge(statusTone(sh),sh)+'<div class="lp-c-sub">'+cdLabel(p.effFrom)+' – '+(p.effTo?cdLabel(p.effTo):'open')+'</div>'+(c.length?'<div class="lp-c-sub exp-cap-over">Conflicts with '+c.map(function(x){return x.key;}).join(', ')+'</div>':'')+'</td>'
        +'<td>'+advBtn('Edit','advPolStart('+p.id+')')+' '+advBtn(p.status==='Active'?'Deactivate':'Activate','advPolToggleClick('+p.id+')')+'</td></tr>';}).join('')
      :'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No advance policy yet.</td></tr>')
    +'</tbody></table></div></div>';
}
function advPolToggleClick(id){const e=advPolicyActivate(id);if(e){showToast('Not saved','error',e);return;}renderADTPage();const p=advPolicies.find(function(x){return x.id===id;});showToast('Saved','success',p.key+' is '+advPolShown(p)+'.');}
function advPolStart(id){
  if(!advCan('advance.policy.manage')){emsDeny('configure advance policies');return;}
  advCloseForms();
  const p=id!=null?advPolicies.find(function(x){return x.id===id;}):null;
  advPolForm=p?{id:p.id,name:p.name,typeId:p.typeId,appliesTo:p.appliesTo,scopeRef:p.scopeRef,currency:p.currency,minAmt:String(p.minAmt),maxAmt:String(p.maxAmt),
    maxOpen:String(p.maxOpen),maxOutstanding:String(p.maxOutstanding),maxSettleDays:String(p.maxSettleDays),restriction:p.restriction,partialApproval:p.partialApproval,
    partialDisbursement:p.partialDisbursement,requireDoc:p.requireDoc,effFrom:p.effFrom,effTo:p.effTo,reason:p.reason}
    :{id:null,name:'',typeId:'',appliesTo:'Entity',scopeRef:'',currency:'INR',minAmt:'',maxAmt:'',maxOpen:'',maxOutstanding:'',maxSettleDays:'',restriction:'Warning',
      partialApproval:true,partialDisbursement:true,requireDoc:false,effFrom:wbToday(),effTo:'',reason:''};
  renderADTPage();
}
function advPolSync(){
  const d=advPolForm;if(!d)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  [['name','advp-name'],['minAmt','advp-min'],['maxAmt','advp-max'],['maxOpen','advp-open'],['maxOutstanding','advp-out'],['maxSettleDays','advp-days'],['reason','advp-reason'],['effFrom','advp-from'],['effTo','advp-to']]
    .forEach(function(p){const x=v(p[1]);if(x!=null)d[p[0]]=x;});
  if(document.getElementById('csw-advp-type')){const t=advTypesHere().find(function(x){return x.name===getCSValue('advp-type');});d.typeId=t?t.id:d.typeId;}
  if(document.getElementById('csw-advp-applies')){const a=getCSValue('advp-applies');if(ADV_APPLIES.indexOf(a)>=0&&a!==d.appliesTo){d.appliesTo=a;d.scopeRef='';}}
  if(document.getElementById('csw-advp-scope')){const s=getCSValue('advp-scope');d.scopeRef=d.appliesTo==='Employee'?(advEmpFromLabel(s)||d.scopeRef):(s&&s.indexOf('Select')!==0?s:d.scopeRef);}
  if(document.getElementById('csw-advp-cur')){const c=getCSValue('advp-cur');if(EXP_CURRENCIES.indexOf(c)>=0)d.currency=c;}
  if(document.getElementById('csw-advp-restr'))d.restriction=getCSValue('advp-restr');
  [['partialApproval','advp-pa'],['partialDisbursement','advp-pd'],['requireDoc','advp-doc']].forEach(function(p){if(document.getElementById('csw-'+p[1]))d[p[0]]=getCSValue(p[1])==='Yes';});
}
function advPolHook(){advPolSync();renderADTPage();}
function advPolFormHTML(){
  const d=advPolForm,t=advType(d.typeId);
  const field=function(label,req,html,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+'</div>';};
  const num=function(id,val,cur){return cur?'<div class="ax-currency"><span>'+d.currency+'</span><input class="ep-form-input" id="'+id+'" type="number" min="0" step="0.01" value="'+attrSafe(val)+'"></div>'
    :'<input class="ep-form-input" id="'+id+'" type="number" min="1" step="1" value="'+attrSafe(val)+'">';};
  const yn=function(id,on){return apCS(id,['Yes','No'],on?'Yes':'No','Select');};
  let scope='';
  if(d.appliesTo==='Department')scope=field('Department',true,apCS('advp-scope',capDepts(),d.scopeRef,'Select department'));
  else if(d.appliesTo==='Designation')scope=field('Designation',true,apCS('advp-scope',advDesigs(),d.scopeRef,'Select designation'));
  else if(d.appliesTo==='Employee')scope=field('Employee',true,axCS('advp-scope',advEmpOptions(),advEmpLabel(d.scopeRef),'Search employee'));
  const f=field('Policy Name',true,'<input class="ep-form-input" id="advp-name" value="'+attrSafe(d.name)+'">')
    +field('Entity',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(idEntityName(advEnt()))+'">')
    +field('Advance Type',true,apCS('advp-type',advTypesHere().filter(function(x){return x.model==='One-Time';}).map(function(x){return x.name;}),t?t.name:'','Select type'))
    +field('Applies To',true,apCS('advp-applies',ADV_APPLIES,d.appliesTo,'Select','advPolHook'))+scope
    +field('Currency',true,apCS('advp-cur',EXP_CURRENCIES,d.currency,'Select currency','advPolHook'))
    +field('Minimum Advance Amount',false,num('advp-min',d.minAmt,true))+field('Maximum Advance Amount',true,num('advp-max',d.maxAmt,true))
    +field('Maximum Open Advances',false,num('advp-open',d.maxOpen))+field('Maximum Outstanding Amount',false,num('advp-out',d.maxOutstanding,true))
    +field('Maximum Settlement Duration (days)',false,num('advp-days',d.maxSettleDays))
    +field('Outstanding Advance Restriction',true,apCS('advp-restr',ADV_RESTRICTIONS,d.restriction,'Select'))
    +field('Allow Partial Approval',true,yn('advp-pa',d.partialApproval))+field('Allow Partial Disbursement',true,yn('advp-pd',d.partialDisbursement))
    +field('Supporting Document Required',true,yn('advp-doc',d.requireDoc))
    +field('Effective From',true,apCD('advp-from',d.effFrom,'Select date'))+field('Effective To',false,apCD('advp-to',d.effTo,'Select date'))
    +(d.appliesTo==='Employee'?field('Exception Reason',true,'<textarea class="ep-form-input ax-notes" id="advp-reason">'+advE(d.reason)+'</textarea>',true):'');
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal adv-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(d.id!=null?'Edit Advance Policy':'Add Advance Policy')+'</span><button class="ct-modal-close" onclick="advPolClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">Limits apply in the policy currency, converted with ADT Exchange Rates; a missing rate blocks the check rather than guessing.</p>'
    +'<div class="ep-form-grid">'+f+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="advPolClose()">Cancel</button>'
    +'<button class="ep-cancel-btn" onclick="advPolSaveClick(false)">Save'+(d.id!=null?'':' as Draft')+'</button>'+(d.id!=null&&(advPolicies.find(function(x){return x.id===d.id;})||{}).status==='Active'?'':'<button class="ep-save-btn" onclick="advPolSaveClick(true)">Save &amp; Activate</button>')+'</div></div></div></div>';
}
function advPolClose(){advPolForm=null;renderADTPage();}
function advPolSaveClick(activate){
  advPolSync();const d=advPolForm;if(!d)return;
  const err=advPolicySave(d,null,activate);
  if(err&&err.indexOf('Saved as draft')!==0){showToast('Not saved','error',err);return;}
  advPolForm=null;renderADTPage();
  showToast(err?'Saved as draft':'Saved',err?'info':'success',err||d.name+' saved.');
}
/* General: maker-checker, eligibility, reminders, methods. */
function advGeneralHTML(){
  const c=advCfg();
  const d=advCfgDraft||(advCfgDraft={mcOn:c.makerChecker.on,typeIds:c.makerChecker.typeIds.slice(),threshold:c.makerChecker.threshold?String(c.makerChecker.threshold):'',
    eorEligible:c.eorEligible,reminderDays:String(c.reminderDays),methods:(c.methods||[]).join(', '),
    xAmount:c.exposure&&c.exposure.amount!==''?String(c.exposure.amount):'',xCur:(c.exposure||{}).currency||'INR',xEnf:(c.exposure||{}).enforcement||'Blocking'});
  const types=advTypesHere();
  const field=function(label,req,html,hint,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+(hint?'<div class="ea-hint">'+hint+'</div>':'')+'</div>';};
  const can=advCan('advance.settings.manage');
  return '<div class="lp-page"><div class="lp-sb-view-header"><span class="lp-sb-section-title">General · '+advE(idEntityName(advEnt()))+'</span></div>'
    +'<div class="ep-form-grid adv-general">'
    +field('Maker-Checker on Disbursement',true,apCS('advg-mc',['On','Off'],d.mcOn?'On':'Off','Select','advGenHook'),'On: whoever initiates a disbursement cannot verify it. Applies to advances, imprest initial funding and replenishments.')
    +(d.mcOn?field('Only for Advance Types',false,apMS('advg-types',types.map(function(t){return t.name;}),d.typeIds.map(function(i){const t=advType(i);return t?t.name:'';}).filter(Boolean),'All types'),'Leave empty for every type.')
      +field('Only from Amount',false,'<input class="ep-form-input" id="advg-th" type="number" min="0" step="0.01" value="'+attrSafe(d.threshold)+'" placeholder="Any amount">','In the disbursement currency.'):'')
    +field('EOR / Global Employees Eligible',true,apCS('advg-eor',['Yes','No'],d.eorEligible?'Yes':'No','Select'),'Direct employees are eligible; EOR and global workers only when enabled here.')
    +field('Reminder Before Due (days)',true,'<input class="ep-form-input" id="advg-rem" type="number" min="0" max="30" value="'+attrSafe(d.reminderDays)+'">')
    +field('Entity-wide Outstanding Limit per Employee',false,'<div class="ax-currency"><span>'+d.xCur+'</span><input class="ep-form-input" id="advg-xamt" type="number" min="0" step="0.01" value="'+attrSafe(d.xAmount)+'" placeholder="No limit"></div>',
      'Across all advance types: verified outstanding + requests in approval + approved and not issued + the new request.')
    +field('Limit Currency',false,apCS('advg-xcur',EXP_CURRENCIES,d.xCur,'Select','advGenHook'))
    +field('When the Limit Is Exceeded',false,apCS('advg-xenf',['Blocking','Warning'],d.xEnf,'Select'),'Warning asks for a justification; Blocking refuses the request. Approval checks again.')
    +field('Other Disbursement Methods',false,'<input class="ep-form-input" id="advg-methods" value="'+attrSafe(d.methods)+'" placeholder="e.g. Cash, Cheque">',
      ADV_BASE_METHOD+' is always available. Comma-separated; each needs the same reference and evidence before anything counts as issued. Disabled: '
      +ADV_DISABLED_METHODS.map(function(m){return m[0]+' - '+m[1];}).join('; ')+'.',true)
    +'</div>'
    +(can?'<div class="lp-sb-form-actions" style="border:0"><button class="ep-save-btn" onclick="advGenSave()">Save Settings</button></div>':'')
    +'</div>';
}
function advGenSync(){
  const d=advCfgDraft;if(!d)return;
  if(document.getElementById('csw-advg-mc'))d.mcOn=getCSValue('advg-mc')==='On';
  if(document.getElementById('msw-advg-types'))d.typeIds=getMSValue('advg-types').map(function(n){const t=advTypesHere().find(function(x){return x.name===n;});return t?t.id:null;}).filter(function(x){return x!=null;});
  if(document.getElementById('csw-advg-eor'))d.eorEligible=getCSValue('advg-eor')==='Yes';
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  if(v('advg-th')!=null)d.threshold=v('advg-th');if(v('advg-rem')!=null)d.reminderDays=v('advg-rem');if(v('advg-methods')!=null)d.methods=v('advg-methods');
  if(v('advg-xamt')!=null)d.xAmount=v('advg-xamt');
  if(document.getElementById('csw-advg-xcur')){const xc=getCSValue('advg-xcur');if(EXP_CURRENCIES.indexOf(xc)>=0)d.xCur=xc;}
  if(document.getElementById('csw-advg-xenf')){const xe=getCSValue('advg-xenf');if(xe==='Warning'||xe==='Blocking')d.xEnf=xe;}
}
function advGenHook(){advGenSync();renderADTPage();}
function advGenSave(){
  advGenSync();const d=advCfgDraft;
  const err=advCfgSave({mcOn:d.mcOn,typeIds:d.typeIds,threshold:d.mcOn?d.threshold:'',eorEligible:d.eorEligible,reminderDays:d.reminderDays,methods:String(d.methods||'').split(','),
    exposure:{amount:String(d.xAmount||'').trim(),currency:d.xCur,enforcement:d.xEnf}});
  if(err){showToast('Not saved','error',err);return;}
  advCfgDraft=null;renderADTPage();showToast('Settings saved','success','Advance settings for '+idEntityName(advEnt())+' saved.');
}

/* ── Reports (FR-AI-24) ────────────────────────────────────────────────── */
/* Rights in another entity follow the role in use, if it is held there. */
function advPermsIn(ent){
  if(ent===advEnt())return emsPerms();
  return emsRolesOf(idMe(),ent).indexOf(emsRole())>=0?emsRolePerms(emsRole()):{};
}
function advRepEntities(){return idEntitiesOf(idMe()).filter(function(e){return !!advPermsIn(e)['advance.report.view'];});}
function advScopeIn(list,ent){
  const P=advPermsIn(ent),me=idMe(),my=idEmpOfUser(me),myE=my&&my.entityId===ent?my.eid:'';
  list=list.filter(function(r){return r.entity===ent;});
  if(P['advance.view.all'])return list;
  const team=P['advance.view.team']&&myE?idEmpsIn(ent,true).filter(function(e){return e.managerEid===myE;}).map(function(e){return e.eid;}):[];
  return list.filter(function(r){return (myE&&r.employeeEid===myE)||r.createdBy===me||team.indexOf(r.employeeEid)>=0||caInvolved(r,me);});
}
function impScopeIn(list,ent){
  const P=advPermsIn(ent),my=idEmpOfUser(idMe()),myE=my&&my.entityId===ent?my.eid:'';
  list=list.filter(function(f){return f.entity===ent;});
  return P['advance.view.all']||P['advance.imprest.manage']?list:list.filter(function(f){return f.custodianEid===myE;});
}
function advRepEnt(){const es=advRepEntities();return advRF.ent&&es.indexOf(advRF.ent)>=0?advRF.ent:advEnt();}
const ADV_REPORTS=[['requests','Advance Requests'],['register','Employee Advance Register'],['issued','Issued Funds'],['utilization','Advance Utilization'],
  ['outstanding','Outstanding Advances'],['aging','Settlement Aging'],['returns','Fund Returns'],['recoveries','Recovery Register'],['funds','Imprest Fund Register'],
  ['replenish','Imprest Replenishments'],['closure','Advance Closure']];
/* Every row: {eid, type, status, cur, date, open:[id,tab]|null, v:{col:value}}. Columns: [key,label,kind] (kind m=money, d=date). */
function advRepBase(ent){
  const advs=advScopeIn(advancesData,ent),funds=impScopeIn(impFunds,ent);
  const reqs=impRequests.filter(function(q){return q.entity===ent&&(funds.some(function(f){return f.id===q.fundId;})||caInvolved(q,idMe()));});
  return {advs:advs,funds:funds,reqs:reqs};
}
function advRepRows(id,ent){
  const B=advRepBase(ent),out=[];
  const emp=function(eid){const e=idEmp(eid)||{};return {eid:eid,name:e.name||'',empId:e.empId||'',dept:e.dept||''};};
  const rowOf=function(h,o){const e=emp(h.kind==='fund'?h.custodianEid:h.employeeEid);return Object.assign({eid:e.eid,dept:e.dept,type:h.kind==='fund'?'Imprest':h.category,cur:h.currency,ent:h.entity,open:[h.kind==='imprest'?h.fundId:h.id,o.tab||'basic-details'],kindOf:h.kind,h:h},o);};
  if(id==='requests'){
    B.advs.filter(function(r){return r.status!=='Draft';}).forEach(function(r){const e=emp(r.employeeEid);
      out.push(rowOf(r,{status:r.status,date:r.appliedOn,tab:'approval',v:{ref:expKey(r),title:r.title,emp:e.name,dept:e.dept,type:r.category,req:caTotal(r),appr:['Approved','Partially Approved'].indexOf(r.status)>=0?advM(caApprovedTotal(r)):'',
        status:r.status,disb:advDisbStatus(r),date:r.appliedOn}}));});
    return {cols:[['ref','Reference'],['title','Title'],['emp','Employee'],['dept','Department'],['type','Advance Type'],['req','Requested','m'],['appr','Approved','m'],['status','Status'],['disb','Disbursement'],['date','Submitted On','d']],rows:out};
  }
  if(id==='register'||id==='outstanding'||id==='aging'||id==='closure'){
    B.advs.filter(function(r){return r.status!=='Draft';}).forEach(function(r){
      const b=advBal(r),e=emp(r.employeeEid),od=advIsOverdue(r);
      const days=r.issuedOn?Math.max(0,Math.round((new Date(wbToday())-new Date(r.issuedOn))/864e5)):'';
      const over=r.dueOn&&wbToday()>r.dueOn?Math.round((new Date(wbToday())-new Date(r.dueOn))/864e5):0;
      const bucket=!r.dueOn?'Not issued':!over?'Not due':over<=30?'1–30 days overdue':over<=60?'31–60 days overdue':over<=90?'61–90 days overdue':'Over 90 days overdue';
      out.push(rowOf(r,{status:advSettleShown(r),date:id==='closure'?(r.closed?wbISO(r.closed.at.split(' | ')[0]):''):id==='aging'?r.dueOn:r.appliedOn,tab:'settlement',b:b,od:od,exit:advExitReview(r),
        v:{ref:expKey(r),title:r.title,emp:e.name,empId:e.empId,dept:e.dept,type:r.category,appr:b.approved,issued:b.issued,accepted:b.accepted,pending:b.pending,returns:b.returns,
          recoveries:b.recoveries,accountable:b.accountable,status:advSettleShown(r),issuedOn:r.issuedOn||'',due:r.dueOn||'',days:days,over:over||'',bucket:bucket,
          closedOn:r.closed?r.closed.at:'',closedBy:r.closed?caN(r.closed.by):''}}));
    });
    if(id==='register'){
      /* One row per employee and currency - never added across currencies. */
      const g={};
      out.forEach(function(x){const k=x.eid+'|'+x.cur;const a=g[k]||(g[k]={eid:x.eid,dept:x.dept,type:'',status:'',cur:x.cur,ent:x.ent,date:x.date,open:null,emp:x.v.emp,
        v:{emp:x.v.emp,empId:x.v.empId,dept:x.dept,cur:x.cur,count:0,appr:0,issued:0,accepted:0,rr:0,accountable:0,open:0,overdue:0}});
        a.v.count++;a.v.appr=advM(a.v.appr+x.v.appr);a.v.issued=advM(a.v.issued+x.v.issued);a.v.accepted=advM(a.v.accepted+x.v.accepted);
        a.v.rr=advM(a.v.rr+x.v.returns+x.v.recoveries);a.v.accountable=advM(a.v.accountable+x.v.accountable);if(!x.h.closed&&x.v.accountable>0)a.v.open++;if(x.od)a.v.overdue++;
        if(x.date>a.date)a.date=x.date;a.types=(a.types||[]).concat([x.type]);a.statuses=(a.statuses||[]).concat([x.status]);});
      return {cols:[['emp','Employee'],['empId','Employee ID'],['dept','Department'],['cur','Currency'],['count','Advances'],['appr','Approved','m'],['issued','Issued','m'],['accepted','Accepted','m'],
        ['rr','Returned / Recovered','m'],['accountable','Accountable','m'],['open','Open'],['overdue','Overdue']],rows:Object.keys(g).map(function(k){return g[k];}),grouped:true};
    }
    if(id==='outstanding')return {cols:[['ref','Reference'],['title','Title'],['emp','Employee'],['dept','Department'],['issued','Issued','m'],['accepted','Accepted','m'],['pending','Pending Review','m'],
      ['returns','Returned','m'],['recoveries','Recovered','m'],['accountable','Accountable','m'],['due','Due','d'],['status','Settlement']],rows:out.filter(function(x){return !x.h.closed&&x.v.accountable>0;})};
    if(id==='aging')return {cols:[['ref','Reference'],['emp','Employee'],['dept','Department'],['issuedOn','Issued On','d'],['due','Due','d'],['days','Days Outstanding'],['over','Days Overdue'],
      ['bucket','Aging'],['accountable','Accountable','m'],['status','Settlement']],rows:out.filter(function(x){return !x.h.closed&&x.v.accountable>0&&x.h.dueOn;})};
    return {cols:[['ref','Reference'],['title','Title'],['emp','Employee'],['type','Advance Type'],['issued','Issued','m'],['accepted','Accepted','m'],['returns','Returned','m'],['recoveries','Recovered','m'],
      ['status','Settlement'],['closedOn','Closed'],['closedBy','Closed By']],rows:out.filter(function(x){return x.h.closed||(x.v.issued>0&&x.v.accountable<=0&&!x.v.pending);})};
  }
  if(id==='issued'){
    B.advs.concat(B.reqs).forEach(function(r){if(!r.disb)return;r.disb.instructions.forEach(function(i){if(!i.verify)return;
      const h=advFundsHolder(r),e=emp(r.employeeEid);
      out.push(rowOf(r,{status:i.status,date:i.verify.date,tab:r.kind==='imprest'?'funding':'disbursement',type:r.kind==='imprest'?'Imprest · '+r.requestType:r.category,
        v:{txn:i.txn,instr:i.key,ref:expKey(r),to:expKey(h),emp:e.name,type:r.kind==='imprest'?'Imprest · '+r.requestType:r.category,amount:i.verify.amount,net:advM(i.verify.amount-(i.reversed?i.reversed.amount:0)),
          date:i.verify.date,method:i.method,utr:i.verify.ref,ext:i.verify.extRef,init:caN(i.initiatedBy),ver:caN(i.verify.by),status:i.status}}));});});
    return {cols:[['txn','ADT Transaction'],['instr','Disbursement'],['ref','Request'],['emp','Employee / Custodian'],['type','Type'],['amount','Verified','m'],['net','Net of Reversals','m'],['date','Payment Date','d'],
      ['method','Method'],['utr','Payment Reference'],['ext','External Reference'],['init','Initiated By'],['ver','Verified By'],['status','Status']],rows:out};
  }
  if(id==='utilization'){
    B.advs.concat(B.funds).forEach(function(h){const e=emp(h.kind==='fund'?h.custodianEid:h.employeeEid);
      advPendingLines(h).forEach(function(x){out.push(rowOf(h,{status:'Pending Review',date:x.l.start,tab:'settlement',claimId:x.c.id,v:{ref:expKey(h),emp:e.name,claim:expKey(x.c),line:x.l.title,status:'Pending Review',amount:x.amount,date:x.l.start}}));});
      (h.ledger||[]).filter(function(t){return t.type==='Utilization';}).forEach(function(t){out.push(rowOf(h,{status:'Accepted',date:t.date,tab:'settlement',claimId:t.claimId,v:{ref:expKey(h),emp:e.name,claim:t.claimKey,line:t.lineTitle,status:'Accepted',amount:t.amount,date:t.date}}));});
    });
    return {cols:[['ref','Advance / Fund'],['emp','Employee'],['claim','Expense Claim'],['line','Line Item'],['status','Status'],['amount','Advance Part','m'],['date','Date','d']],rows:out};
  }
  if(id==='recoveries'){
    B.advs.concat(B.funds).forEach(function(h){const e=emp(h.kind==='fund'?h.custodianEid:h.employeeEid);
      (h.returns||[]).forEach(function(x){
        if(x.type!=='Recovery')return;
        const iso=wbISO(String(x.recordedAt).split(' | ')[0]);
        out.push(rowOf(h,{status:x.status,date:iso,tab:'settlement',v:{key:x.key,ref:expKey(h),emp:e.name,amount:x.amount,collected:advRecCollected(x),
          unpaid:ADV_REC_OPEN.indexOf(x.status)>=0?advRecUnpaid(x):0,method:x.method,reason:x.reason,by:caN(x.recordedBy),appr:x.approval?caN(x.approval.by):'',
          txn:(x.collections||[]).map(function(c){return c.txn+(c.reversed?' (reversed)':'');}).join(', '),date:iso,status:x.status}}));});});
    return {cols:[['key','Recovery'],['ref','Advance / Fund'],['emp','Employee'],['amount','Authorized / Raised','m'],['collected','Collected','m'],['unpaid','Due','m'],
      ['method','Method'],['reason','Reason'],['by','Raised By'],['appr','Decided By'],['txn','ADT Transactions'],['date','Raised On','d'],['status','Status']],rows:out};
  }
  if(id==='returns'){
    B.advs.concat(B.funds).forEach(function(h){const e=emp(h.kind==='fund'?h.custodianEid:h.employeeEid);
      (h.returns||[]).forEach(function(x){
        if(x.type!=='Return'||['Verified','Reversed'].indexOf(x.status)<0)return;
        out.push(rowOf(h,{status:x.status,date:x.date||'',tab:'settlement',v:{key:x.key,ref:expKey(h),emp:e.name,amount:x.amount,method:x.method,date:x.date||'',utr:x.ref,ext:x.extRef,txn:x.txn||'',
          reason:x.reason||'',by:caN(x.recordedBy),ver:x.verifiedBy?caN(x.verifiedBy):'',status:x.status}}));});});
    return {cols:[['key','Return'],['ref','Advance / Fund'],['emp','Employee'],['amount','Amount','m'],['method','Method'],['date','Date','d'],['utr','Reference'],['ext','External Reference'],['txn','ADT Transaction'],
      ['ver','Verified By'],['status','Status']],rows:out};
  }
  if(id==='funds'){
    B.funds.forEach(function(f){const b=advBal(f),e=emp(f.custodianEid);
      out.push(rowOf(f,{status:f.status,date:f.effFrom,v:{ref:expKey(f),name:f.name,emp:e.name,dept:f.dept,float:f.float,issued:b.issued,accepted:b.accepted,accountable:b.accountable,status:f.status,from:f.effFrom,freq:f.reviewFreq}}));});
    return {cols:[['ref','Fund'],['name','Fund Name'],['emp','Custodian'],['dept','Department'],['float','Float','m'],['issued','Issued','m'],['accepted','Accepted','m'],['accountable','Accountable','m'],['status','Status'],['from','Effective From','d'],['freq','Review']],rows:out};
  }
  if(id==='replenish'){
    B.reqs.forEach(function(q){const f=impFund(q.fundId),e=emp(q.employeeEid);
      out.push(rowOf(q,{status:q.status,date:q.appliedOn||'',tab:'funding',type:'Imprest · '+q.requestType,v:{ref:expKey(q),fund:f?expKey(f)+' '+f.name:'',emp:e.name,rtype:q.requestType,req:caTotal(q),
        appr:['Approved','Partially Approved'].indexOf(q.status)>=0?advM(caApprovedTotal(q)):'',issued:advReqIssued(q),status:q.status,disb:advDisbStatus(q),date:q.appliedOn||''}}));});
    return {cols:[['ref','Request'],['fund','Fund'],['emp','Custodian'],['rtype','Request Type'],['req','Requested','m'],['appr','Approved','m'],['issued','Verified Issued','m'],['status','Approval'],['disb','Disbursement'],['date','Submitted On','d']],rows:out};
  }
  return {cols:[],rows:[]};
}
/* The ten summary cards (FR-AI-24): figures from recorded events, per currency. */
const ADV_CARDS=[['awaiting','Awaiting Approval','requests'],['notissued','Approved – Not Issued','requests'],['issued','Total Issued','issued'],['pending','Pending Expense Review','utilization'],
  ['accepted','Accepted Utilization','utilization'],['outstanding','Outstanding Advances','outstanding'],['overdue','Overdue Advances','aging'],['funds','Active Imprest Funds','funds'],
  ['repl','Pending Replenishments','replenish'],['recovery','Recovery Due','recoveries']];
function advCardPass(card,x){
  const h=x.h;
  if(card==='awaiting')return ['Awaiting Approval','Follow-Up'].indexOf(x.status)>=0;
  if(card==='notissued')return x.kindOf==='advance'&&['Approved','Partially Approved'].indexOf(h.status)>=0&&advBal(h).unissued>0;
  if(card==='issued')return true;
  if(card==='pending')return x.status==='Pending Review';
  if(card==='accepted')return x.status==='Accepted';
  if(card==='outstanding')return true;
  if(card==='overdue')return !!x.od;
  if(card==='funds')return ['Active','On Hold','Closing'].indexOf(x.status)>=0;
  if(card==='repl')return h.kind==='imprest'&&(['Awaiting Approval','Follow-Up'].indexOf(h.status)>=0||(['Approved','Partially Approved'].indexOf(h.status)>=0&&advM(advAuthorized(h)-advReqIssued(h))>0));
  /* Recovery Due: the unpaid part of authorized recovery obligations only - an overdue balance is not a recovery until one is approved. */
  if(card==='recovery')return ['Approved','Partially Collected'].indexOf(x.status)>=0&&x.v.unpaid>0;
  return true;
}
function advCardValue(card,ent){
  const rep=ADV_CARDS.find(function(c){return c[0]===card;})[2];
  const rows=advRepRows(rep,ent).rows.filter(function(x){return advCardPass(card,x);});
  const amt=function(x){
    if(card==='awaiting')return x.v.req;
    if(card==='notissued')return advBal(x.h).unissued;
    if(card==='issued')return x.v.net;
    if(card==='pending'||card==='accepted')return x.v.amount;
    if(card==='outstanding'||card==='overdue')return x.v.accountable;
    if(card==='funds')return x.v.accountable;
    if(card==='repl')return ['Awaiting Approval','Follow-Up'].indexOf(x.h.status)>=0?x.v.req:advM(advAuthorized(x.h)-advReqIssued(x.h));
    if(card==='recovery')return x.v.unpaid;
    return 0;
  };
  return {n:rows.length,money:advCurText(advByCur(rows,amt,function(x){return x.cur;}))};
}
function advCardOpen(card){
  const c=ADV_CARDS.find(function(x){return x[0]===card;});
  advRep=c[2];advRF=Object.assign({},advRF,{emp:'',dept:'',type:'',status:'',cur:'',from:'',to:'',card:card});renderADTPage();
}
function advRepFiltered(){
  const ent=advRepEnt(),R=advRepRows(advRep,ent),F=advRF;
  const rows=R.rows.filter(function(x){
    if(F.card&&ADV_CARDS.some(function(c){return c[0]===F.card&&c[2]===advRep;})&&!advCardPass(F.card,x))return false;
    if(F.emp&&x.eid!==F.emp)return false;
    if(F.dept&&x.dept!==F.dept)return false;
    if(F.type&&(R.grouped?(x.types||[]).indexOf(F.type)<0:x.type!==F.type))return false;
    if(F.status&&(R.grouped?(x.statuses||[]).indexOf(F.status)<0:x.status!==F.status))return false;
    if(F.cur&&x.cur!==F.cur)return false;
    if(F.from&&(!x.date||x.date<F.from))return false;
    if(F.to&&(!x.date||x.date>F.to))return false;
    return true;
  });
  return {cols:R.cols,rows:rows,all:R.rows,grouped:R.grouped,ent:ent};
}
function advRepApply(){
  const v=function(id,all){const x=getCSValue(id);return x&&x!==all?x:'';};
  const entName=v('advr-ent','');const ent=advRepEntities().find(function(e){return idEntityName(e)===entName;});
  advRF.ent=ent||'';advRF.emp=advEmpFromLabelIn(v('advr-emp','All Employees'));advRF.dept=v('advr-dept','All Departments');advRF.type=v('advr-type','All Types');
  advRF.status=v('advr-status','All Statuses');advRF.cur=v('advr-cur','All Currencies');
  const d=function(id){const el=document.getElementById(id);return el?el.value:'';};advRF.from=d('advr-from');advRF.to=d('advr-to');
  renderADTPage();
}
function advEmpFromLabelIn(v){if(!v)return '';const e=idEmpAll().find(function(x){return x.name+' · '+x.empId===v;});return e?e.eid:'';}
function advRepReset(){advRF={ent:advRF.ent,emp:'',dept:'',type:'',status:'',cur:'',from:'',to:'',card:''};renderADTPage();}
function advRepPick(){const n=getCSValue('advr-pick');const r=ADV_REPORTS.find(function(x){return x[1]===n;});if(r&&r[0]!==advRep){advRep=r[0];advRF.status='';advRF.card='';}renderADTPage();}
function advRepCell(col,x){
  const val=x.v[col[0]];
  if(val===''||val==null)return '—';
  if(col[2]==='m')return expMoney(val,x.cur);
  if(col[2]==='d')return cdLabel(val);
  return advE(val);
}
function advRepOpen(i){
  const F=advRepFiltered(),x=F.rows[i];if(!x)return;
  if(x.ent!==advEnt()){showToast('Another entity','info','Switch Entity to '+idEntityName(x.ent)+' to open this record.');return;}
  if(F.grouped){advCloseForms();advPageTab='advances';advQ=x.emp||'';advSel=null;renderADTPage();return;}
  if(x.claimId&&advRep==='utilization'){advGoClaim(x.claimId);return;}
  const h=advHolder(x.open[0]);if(!h)return;
  advCloseForms();advPageTab=h.kind==='fund'?'imprest':'advances';advQ='';advTypeF='';advStatusF='';advDisbF='';advSetF='';impQ='';impStatusF='';
  advSel=h.id;advTab=x.open[1];if(x.kindOf==='imprest')impReqSel=x.h.id;
  if(!advInScope(h)){advSel=null;showToast('Not available','error','This record is outside your access.');}
  renderADTPage();
}
function advReportsHTML(){
  if(!advCan('advance.report.view'))return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>Reports need advance.report.view.</span></div></div>';
  const ent=advRepEnt(),F=advRepFiltered(),name=(ADV_REPORTS.find(function(r){return r[0]===advRep;})||ADV_REPORTS[0])[1];
  const cards=ADV_CARDS.map(function(c){const v=advCardValue(c[0],ent);return advCard(c[1],v.money,v.n+' record'+(v.n===1?'':'s'),'advCardOpen(\''+c[0]+'\')');}).join('');
  const typeOpts=[];F.all.forEach(function(x){(F.grouped?(x.types||[]):[x.type]).forEach(function(t){if(t&&typeOpts.indexOf(t)<0)typeOpts.push(t);});});
  const statOpts=[];F.all.forEach(function(x){(F.grouped?(x.statuses||[]):[x.status]).forEach(function(s){if(s&&statOpts.indexOf(s)<0)statOpts.push(s);});});
  const curOpts=[];F.all.forEach(function(x){if(x.cur&&curOpts.indexOf(x.cur)<0)curOpts.push(x.cur);});
  const emps=[];F.all.forEach(function(x){const e=idEmp(x.eid);if(e){const l=e.name+' · '+e.empId;if(emps.indexOf(l)<0)emps.push(l);}});
  const depts=[];F.all.forEach(function(x){if(x.dept&&depts.indexOf(x.dept)<0)depts.push(x.dept);});
  const card=advRF.card?ADV_CARDS.find(function(c){return c[0]===advRF.card&&c[2]===advRep;}):null;
  const canX=advCan('advance.report.export');
  const pgn=listPage('adv-report-'+advRep,JSON.stringify(advRF)+ent,F.rows.map(function(x,i){
    return '<tr style="cursor:pointer" onclick="advRepOpen('+i+')"><td class="lp-c-n">'+(i+1)+'</td>'+F.cols.map(function(c){return '<td class="'+(c[2]==='m'?'exp-c-amt ':'')+'exp-c-nw"><div class="lp-c-plain">'+advRepCell(c,x)+'</div></td>';}).join('')
      +'<td onclick="event.stopPropagation()">'+advBtn(x.ent===advEnt()?'Open':'Switch entity','advRepOpen('+i+')')+'</td></tr>';
  }),'<tr><td colspan="'+(F.cols.length+2)+'" style="padding:24px;text-align:center;color:var(--gray)">No record matches this report and filter.</td></tr>');
  return '<div class="lp-page">'
    +'<div class="wb-proj-cards adv-cards">'+cards+'</div>'
    +'<div class="wb-note">Recorded events only. No bank or wallet balance is shown.</div>'
    +advFilterBar(apCS('advr-pick',ADV_REPORTS.map(function(r){return r[1];}),name,'Select report','advRepPick')
      +(advRepEntities().length>1?apCS('advr-ent',advRepEntities().map(idEntityName),idEntityName(ent),'Entity'):'')
      +apCS('advr-type',typeOpts,advRF.type,'All Types')
      +apCS('advr-status',statOpts,advRF.status,'All Statuses')
      /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
      +(advRF.emp?axCS('advr-emp',emps,advEmpLabel(advRF.emp),'All Employees'):'')
      +(advRF.dept?apCS('advr-dept',depts,advRF.dept,'All Departments'):'')
      +(advRF.cur?apCS('advr-cur',curOpts,advRF.cur,'All Currencies'):'')
      +apCD('advr-from',advRF.from,'From date')+apCD('advr-to',advRF.to,'To date')
      +clearFiltersBtn([advRF.emp,advRF.dept,advRF.type,advRF.status,advRF.cur,advRF.from,advRF.to,advRF.card],'advRepReset()')
      +'<button class="lp-pill-search" onclick="advRepApply()">Search</button>')
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+advE(name)+' <span class="ax-count">'+F.rows.length+'</span>'
      +(card?' <span class="adv-chip">'+advE(card[1])+' <button onclick="advRF.card=\'\';renderADTPage()" title="Remove">×</button></span>':'')+'</span>'
      +(canX?'<span class="ea-hint">Export (header) downloads exactly these rows.</span>':'')+'</div>'
    +'<div class="lp-table-card adv-report"><table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th>'+F.cols.map(function(c){return '<th>'+c[1]+'</th>';}).join('')+'<th>Action</th></tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager+'</div>'
    +'</div>';
}
/* Export: the rows on screen, never more (same entity, scope and filters). */
function advExport(){
  if(advPageTab!=='reports'){showToast('Nothing to export','info','Export is available on the Reports tab.');return;}
  if(!advCan('advance.report.export')){emsDeny('export advance reports');return;}
  const F=advRepFiltered(),name=(ADV_REPORTS.find(function(r){return r[0]===advRep;})||ADV_REPORTS[0])[1];
  if(!F.rows.length){showToast('Nothing to export','info','No record matches this report.');return;}
  const money=F.cols.some(function(c){return c[2]==='m';});
  wbCSV('advances-'+advRep,['S.No','Entity'].concat(F.cols.map(function(c){return c[1];})).concat(money&&!F.cols.some(function(c){return c[0]==='cur';})?['Currency']:[]),
    F.rows.map(function(x,i){return [i+1,idEntityName(x.ent)].concat(F.cols.map(function(c){const v=x.v[c[0]];return c[2]==='d'&&v?v:v==null?'':v;}))
      .concat(money&&!F.cols.some(function(c){return c[0]==='cur';})?[x.cur]:[]);}));
  showToast('Export ready','success',name+': '+F.rows.length+' row'+(F.rows.length===1?'':'s')+' exported.');
}

/* ── The approver's view of an advance (shared review popup) ───────────── */
function advReviewInfoHTML(r){
  if(r.kind==='imprest'){
    const f=impFund(r.fundId),b=f?advBal(f):null;
    return '<div class="wb-note"><b>'+advE(r.requestType)+' · '+(f?expKey(f)+' '+advE(f.name):'')+'</b><div class="wb-note-sub">Custodian '+advE(idEmpName(r.employeeEid))
      +(r.onBehalf?' · requested on their behalf by '+advE(caN(r.onBehalf.by))+': '+advE(r.onBehalf.reason):'')
      +(f?' · float '+expMoney(f.float,f.currency)+' · issued '+expMoney(b.issued,f.currency)+' · accountable '+expMoney(b.accountable,f.currency):'')
      +(r.sourceLines.length?'<br>Replenishes '+r.sourceLines.length+' accepted expense'+(r.sourceLines.length===1?'':'s')+': '+r.sourceLines.map(function(s){return advE(s.claimKey)+' '+expMoney(s.amount,r.currency);}).join(', '):'')
      +(r.purpose?'<br>'+advE(r.purpose):'')+'<br>Approval authorizes funding only; nothing is issued until a disbursement is verified.</div></div>';
  }
  const pe=r.policyEval,e=idEmp(r.employeeEid)||{};
  return '<div class="wb-note'+(pe&&pe.warnings.length?' is-wait':'')+'"><b>'+advE(r.category)+' · '+advE(r.title)+'</b><div class="wb-note-sub">'
    +advE(r.purpose)+'<br>'+advE(e.dept||'')+(e.jobTitle?' · '+advE(e.jobTitle):'')+' · needed by '+(r.requiredBy?cdLabel(r.requiredBy):'—')
    +(r.periodFrom?' · period '+cdLabel(r.periodFrom)+(r.periodTo?' – '+cdLabel(r.periodTo):''):'')
    +(pe?'<br>Policy '+advE(pe.policyKey)+': '+advE(pe.results[0].result)+' · '+pe.info.open+' other open · outstanding '+expMoney(pe.info.outstanding,r.currency)
      +(pe.info.overdue.length?' · overdue: '+advE(pe.info.overdue.join(', ')):'')+(pe.warnings.length?'<br>'+pe.warnings.map(advE).join('<br>'):'')+(pe.just?'<br>Justification: '+advE(pe.just):''):'')
    +(advAllowsPartial(r)?'':'<br>The policy does not allow partial approval.')
    +(function(){const ev=advEvalOf(r),i=ev.info;
      return '<br>Now: outstanding '+expMoney(i.outstanding,(ev.policy||{}).currency||r.currency)+' + in approval or approved and not issued '+expMoney(i.inflight,(ev.policy||{}).currency||r.currency)+' (other '+advE(r.category)+'s)'
        +(i.entity?' · all types '+expMoney(advM(i.entity.outstanding+i.entity.inflight),i.entity.currency)+' of the '+expMoney(i.entity.limit,i.entity.currency)+' entity limit ('+i.entity.enforcement+')':'')
        +(ev.limits.length?'<br><b>'+advE(ev.limits[0])+'</b> Approving at this amount will be refused.':'');})()
    +'<br>Approval authorizes funding only; nothing is issued until a disbursement is verified.</div></div>';
}
