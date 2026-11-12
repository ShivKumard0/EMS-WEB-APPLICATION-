/* ══ EXPENSES · APPROVALS & REIMBURSEMENT SCREENS (FR-CA, Build 4) ════════
   The Expenses page gets four tabs, each shown only to roles that may use it:
     All Expenses (My Expenses for an employee) · Pending My Approval ·
     Reimbursements · Approval Settings
   One claim panel serves them all (js/expenses.js) and gains two tabs,
   Approval and Reimbursement. Decisions are made in the Review popup; Logs
   and the row menu run the very same checks (js/expense-approvals.js). */

/* ── State ─────────────────────────────────────────────────────────────── */
let expPageTab='all';
let expStageF='',expApproverF='',expReimbF='',expSubF='',expDeptF='';
let caQAll=false,caQOver=false,caQQ='',caQTypeF='';
/* Which workflow kinds the Approval Settings listing shows: Expense on the
   Expenses page; Advance and Imprest on Advances & Imprest → Advance Settings. */
let awfKinds=['Expense'];
/* Workflow types other pages list (Advance, Imprest; the Funding & Budgets
   types): who may configure them, what uses a route, how the form explains it. */
const CA_WF_INFO={};
function caWfUsedBy(w){const f=CA_WF_INFO[caWfKindOf(w)];return f&&f.usedBy?f.usedBy(w.id):(typeof advTypesUsing==='function'?advTypesUsing(w.id):'');}
function awfKindNow(){return awfModal&&awfModal.kind?awfModal.kind:awfKinds[0];}
/* Configuring expense routes and advance routes are separate RBAC rights. */
function awfPermFor(k){return awfKindNow()==='Expense'?(k==='activate'?'expense.approval.config.activate':'expense.approval.config.manage'):((CA_WF_INFO[awfKindNow()]||{}).perm||'advance.settings.manage');}
const CA_TYPE_LABEL={expense:'Expense Claim',advance:'Advance',imprest:'Imprest'};
let caRbQ='',caRbStatusF='',caRbRouteF='';
let caRev=null;      // the Review popup: {id, scope, decision, reason, comment, lines:{id:{decision,amount,reason}}}
let caAct=null;      // a small action popup: {kind, id, ...}
let awfSel=null,awfTab='basic-details',awfQ='',awfStatusF='',awfAppliesF='',awfModal=null;

sbToneAdd({'partially-approved':'info',withdrawn:'idle','awaiting-decision':'wait','follow-up-requested':'wait',
  superseded:'idle','closed-withdrawn':'idle',reassigned:'info','not-ready':'idle','ready-for-payment':'info',processing:'wait',
  'on-hold':'wait','partially-paid':'info',paid:'ok',failed:'bad',cancelled:'idle','not-applicable':'idle',overdue:'bad',escalated:'wait',
  'pending-verification':'wait'});

/* Is an Expense Management form open over the page? */
function caFormOpen(){return !!(expModalOpen||caRev||caAct||awfModal||(typeof capModalOpen!=='undefined'&&capModalOpen));}
function caCloseForms(){
  expModalOpen=false;expDraft=null;caRev=null;caAct=null;awfModal=null;
  if(typeof capModalOpen!=='undefined'){capModalOpen=false;capDraft=null;}
  if(typeof wbModal!=='undefined')wbModal=null;
}

/* ── Page tabs ─────────────────────────────────────────────────────────── */
function expPageTabs(){
  const t=[{id:'all',label:caOwnScope()?'My Expenses':'All Expenses'}];
  const q=caQueue(false).length;
  if(caCan('expense.approval.queue')||q)t.push({id:'queue',label:'Pending My Approval'+(q?' ('+q+')':'')});
  if(caCan('expense.reimb.view.all'))t.push({id:'reimb',label:'Reimbursements'});
  if(caCan('expense.approval.config.view'))t.push({id:'settings',label:'Approval Settings'});
  return t;
}
function expSetPageTab(t){
  if(expPageTab===t)return;
  if(expSelectedId!=null&&sbLeaveGuard('exp',function(){expSetPageTab(t);}))return;
  expDropEdit();expModalOpen=false;caRev=null;caAct=null;awfModal=null;expSelectedId=null;awfSel=null;expPageTab=t;renderADTPage();
}
function buildExpensesHTML(){
  caTick();
  awfKinds=['Expense'];   // Advances & Imprest → Advance Settings lists its own routes
  const tabs=expPageTabs();
  if(!tabs.some(function(t){return t.id===expPageTab;}))expPageTab='all';
  let body;
  if(expPageTab==='queue')body=caQueueHTML();
  else if(expPageTab==='reimb')body=caReimbListHTML();
  else if(expPageTab==='settings')body=awfListHTML();
  else body=expAllListHTML();
  return (tabs.length>1?'<div class="mod-page">'+buildModuleTabsHTML(tabs,expPageTab,'expSetPageTab',true)+body+'</div>':body)
    +(expModalOpen&&expDraft&&expDraft.line?buildAddExpenseModalHTML():'')+(caRev?caReviewHTML():'')+(caAct?caActHTML():'')+(awfModal?awfModalHTML():'');
}

/* ── Shared cells ──────────────────────────────────────────────────────── */
function caStageCell(r){
  if(r.wf&&r.wf.exception&&!r.wf.open)return '<div class="lp-c-plain">—</div><div class="lp-c-sub exp-cap-over">Route exception</div>';
  const st=caActiveStage(r);
  if(!st)return '<div class="lp-c-plain is-none">—</div>';
  return '<div class="lp-c-plain ax-c-trunc" title="Stage '+st.n+' of '+r.wf.stages.length+' · '+attrSafe(st.name)+'">'+st.n+' · '+sbEsc(st.name)+'</div><div class="lp-c-sub ax-c-trunc">'
    +(st.exception?'<span class="exp-cap-over">Assignment exception</span>':sbEsc(caNs(st.approvers)||'—'))
    +(caOverdue(r,st)?' · <span class="exp-cap-over">Overdue</span>':'')+'</div>';
}
function caPayBadge(r){return caPayBadgeBase(r)+(r&&r.pay&&r.pay.illustrative?' <span class="lp-status-badge tone-info">Illustrative</span>':'');}
function caPayBadgeBase(r){
  const s=caPayStatus(r);
  return axBadge(statusTone(s),s);
}
function caWorstPolicy(r){
  const res=r.policyEval?r.policyEval.results:[];
  if(res.some(function(x){return x.result==='Blocked';}))return 'Blocked';
  if(res.some(function(x){return x.result==='Warning';}))return 'Warning';
  if(res.some(function(x){return x.result==='Not evaluated';}))return 'Not evaluated';
  return res.length?'Within Limit':'No policy';
}
function caRowClick(id,tab){
  const r=caRec(id);
  if(r&&caKind(r)!=='expense'){const ex=caExt(r);return (ex&&ex.openFn||'advOpenRecord')+'('+id+(tab?',\''+tab+'\'':'')+')';}
  return 'openExpSidebar('+id+(tab?',\''+tab+'\'':'')+')';
}
function caSplitWrap(table){
  return '<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="exp-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +table+'</div></div>'
    +'<div class="lp-split-sb'+(expSelectedId?' open':'')+'" id="exp-split-sb"><div class="lp-isb" id="exp-isb-inner">'+(expSelectedId?sbRender(renderExpSidebar,'exp'):'')+'</div></div></div>';
}
function caStat(label,count,on,click,tone){
  return '<div class="listing-stat'+(on?' stat-selected':'')+'" onclick="'+click+'">'
    +'<div class="listing-stat-count" style="color:var(--st-'+(tone||statusTone(label))+'-fg)">'+count+'</div><div class="listing-stat-label">'+label+'</div></div>';
}

/* ── All Expenses ──────────────────────────────────────────────────────── */
function caStageNames(){
  const s=[];caWorkflows.forEach(function(w){w.stages.forEach(function(x){if(s.indexOf(x.name)<0)s.push(x.name);});});return s;
}
/* The Build 4 filters, on top of Category / Status / Expense Date (js/expenses.js expRows). */
function caRowPass(r){
  const st=caActiveStage(r);
  if(expStageF&&(!st||st.name!==expStageF))return false;
  if(expApproverF&&(!st||st.approvers.indexOf(idFromLabel(expApproverF,caApproverPool()))<0))return false;
  if(expReimbF&&caPayStatus(r)!==expReimbF)return false;
  if(expSubF&&r.appliedOn!==expSubF||expSubF&&r.status==='Draft')return false;
  if(expDeptF){const p=expPerson(r.employeeEid);if(!p||p.dept!==expDeptF)return false;}
  return true;
}
function expAllListHTML(){
  const emp=caOwnScope();
  const count=function(s){return expScope().filter(function(r){return r.status===s;}).length;};
  const shown=lpSearchRows(expRows(),expQ);
  if(expSelectedId&&!shown.some(function(r){return r.id===expSelectedId;}))expSelectedId=null;
  const sig=[expCatF,expStatusF,expDateF,expQ,expStageF,expApproverF,expReimbF,expSubF,expDeptF].join('|');
  const pgn=listPage('expenses',sig,shown.map(function(r,i){
    const cu=caClaimantUser(r);
    const by=r.submittedBy&&r.submittedBy!==cu?caN(r.submittedBy):(r.createdBy&&r.createdBy!==cu&&r.claimFor==='Others'?caN(r.createdBy):'');
    const appr=['Approved','Partially Approved','Rejected'].indexOf(r.status)>=0||r.lines.some(function(l){return l.approved!=null;});
    return '<tr class="exp-row'+(expSelectedId===r.id?' lp-row-selected':'')+'" id="exp-row-'+r.id+'" style="cursor:pointer" onclick="'+caRowClick(r.id)+'">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(r.title)+'">'+sbEsc(r.title)+'</div><div class="lp-c-sub">'+expKey(r)+(expStart(r)?' · '+cdLabel(expStart(r)):'')+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc exp-c-emp" title="'+attrSafe(r.name)+'">'+sbEsc(r.name)+'</div><div class="lp-c-sub ax-c-trunc" title="'+attrSafe(r.category)+'">'+sbEsc(r.category)+(by?' · by '+sbEsc(by):'')+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(expTotal(r),r.currency)+'</div>'+(appr?'<div class="lp-c-sub">approved '+expMoney(caApprovedTotal(r),r.currency)+'</div>':'')+'</td>'
      +'<td>'+axBadge(statusTone(r.status),r.status)+(r.pay?'<div class="lp-c-sub ca-pay-sub'+(r.pay.status==='Pending Verification'?' wb-warn':'')+'">'+sbEsc(r.pay.status)+'</div>':'')+'</td>'
      +'<td class="ca-c-stage">'+caStageCell(r)+'</td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('expenses',r.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No expenses match this filter.</td></tr>');
  const tiles=['Awaiting Approval','Follow-Up','Approved','Partially Approved'];
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('exp-f-q',expQ,emp?'Search my expenses':'Search ID, title or employee','applyExpFilters()')
    +apCS('exp-f-cat',EXP_CATEGORIES,expCatF,'All Categories')
    +apCS('exp-f-status',EXP_STATUSES,expStatusF,'All Statuses')
    /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
    +(!emp&&expStageF?apCS('exp-f-stage',caStageNames(),expStageF,'All Stages'):'')
    +(!emp&&expApproverF?axCS('exp-f-appr',idLabels(caApproverPool()),expApproverF,'All Approvers'):'')
    +(expReimbF?apCS('exp-f-reimb',CA_PAY_STATUSES,expReimbF,'All Reimbursement'):'')
    +(expDateF?apCD('exp-f-date',expDateF,'Expense Date'):'')
    +(expSubF?apCD('exp-f-sub',expSubF,'Submitted On'):'')
    +(!emp&&expDeptF?apCS('exp-f-dept',typeof capDepts==='function'?capDepts():[],expDeptF,'All Departments'):'')
    +clearFiltersBtn([expCatF,expStatusF,expDateF,expQ,expStageF,expApproverF,expReimbF,expSubF,expDeptF],'resetExpFilters()')
    +'<button class="lp-pill-search" onclick="applyExpFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats exp-stats">'+tiles.map(function(s){return caStat(s,count(s),expStatusF===s,'expToggleStat(\''+s+'\')');}).join('')+'</div></div>'
    +caSplitWrap('<table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th><th>Expense</th><th>Employee</th>'
      +'<th>Amount</th><th>Status</th><th>Current Stage</th><th>Action</th></tr></thead>'
      +'<tbody>'+pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}

/* ── Pending My Approval ───────────────────────────────────────────────── */
function caQueueToggle(k){if(k==='all')caQAll=!caQAll;else caQOver=!caQOver;expSelectedId=null;renderADTPage();}
function caQueueApply(){caQQ=lpSearchValue('caq-f-q');const t=getCSValue('caq-f-type');caQTypeF=t&&t!=='All Types'?t:'';expSelectedId=null;renderADTPage();}
function caQueueHTML(){
  const me=caMe();
  /* DT-715: "All pending" for anyone who may reassign any request type; escalations of every type. */
  const canAll=Object.keys(CA_KIND_PERMS).some(function(k){const x=CA_EXT[k];return !(x&&x.hidden&&x.hidden())&&caCan(CA_KIND_PERMS[k].reassign);});
  let rows=caQueue(caQAll&&canAll);
  const mine=caQueue(false);
  const over=rows.filter(function(r){return caOverdue(r);});
  const esc=caAllRecs().filter(function(r){const st=caActiveStage(r);return r.entity===caEntity()&&st&&st.escalated&&st.escalatedTo.indexOf(me)>=0&&r.status==='Awaiting Approval';});
  const flagged=canAll?caQueue(true).filter(function(r){const st=caActiveStage(r);return st&&st.escalationFlag;}):[];
  if(caQOver)rows=over;
  if(caQTypeF)rows=rows.filter(function(r){return CA_TYPE_LABEL[caKind(r)]===caQTypeF;});
  rows=lpSearchRows(rows,caQQ);
  if(expSelectedId&&!rows.some(function(r){return r.id===expSelectedId;}))expSelectedId=null;
  const pgn=listPage('exp-queue',[caQAll,caQOver,caQQ].join('|'),rows.map(function(r,i){
    const st=caActiveStage(r);
    const due=caDue(st);
    const can=caCanDecide(r);
    const pol=caWorstPolicy(r);
    return '<tr class="exp-row'+(expSelectedId===r.id?' lp-row-selected':'')+'" id="exp-row-'+r.id+'" style="cursor:pointer" onclick="'+caRowClick(r.id,'approval')+'">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(r.title)+'">'+sbEsc(r.title)+'</div><div class="lp-c-sub ax-c-trunc">'+expKey(r)+' · '+(caKind(r)==='expense'?'':CA_TYPE_LABEL[caKind(r)]+' · ')+sbEsc(r.category)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+sbEsc(r.name)+'</div>'+((r.submittedBy||r.createdBy)!==caClaimantUser(r)?'<div class="lp-c-sub ax-c-trunc">by '+sbEsc(caN(r.submittedBy||r.createdBy))+'</div>':'')+'</td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(expTotal(r),r.currency)+'</div></td>'
      +'<td class="ca-c-stage">'+caStageCell(r)+'</td>'
      +'<td class="exp-c-nw"><div class="lp-c-plain">'+cdLabel(r.appliedOn)+'</div><div class="lp-c-sub'+(caOverdue(r,st)?' exp-cap-over':'')+'">due '+(due?cdLabel(due):'—')+(caOverdue(r,st)?' · overdue':'')+(st.escalated?' · escalated':'')+'</div></td>'
      +'<td>'+axBadge(pol==='Blocked'?'bad':pol==='Warning'||pol==='Not evaluated'?'wait':'idle',pol)
        +(r.dupCheck&&r.dupCheck.matches.length?'<div class="lp-c-sub exp-cap-over">Possible duplicate</div>':'')+'</td>'
      +'<td onclick="event.stopPropagation()">'+(can?'<button class="btn btn-primary btn-sm ca-review-btn" onclick="caReviewOpen('+r.id+')">Review</button>'
        :caCanReassign(r)?'<button class="btn btn-outline btn-sm" onclick="caActOpen(\'reassign\','+r.id+')">Reassign</button>':'<span class="wb-muted">'+sbEsc(caSoD(r)?'Not independent':'View only')+'</span>')+'</td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">'+(caQAll?'No claim is awaiting approval.':'Nothing is waiting for your decision.')+'</td></tr>');
  return '<div class="lp-page">'
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('caq-f-q',caQQ,'Search ID, title or employee','caQueueApply()')
    +apCS('caq-f-type',caUniq(Object.keys(CA_TYPE_LABEL).filter(function(k){const x=CA_EXT[k];return !(x&&x.hidden&&x.hidden());}).map(function(k){return CA_TYPE_LABEL[k];})),caQTypeF,'All Types')
    +(canAll?'<div class="segmented is-compact"><button type="button" class="seg-btn'+(caQAll?'':' active')+'" onclick="'+(caQAll?'caQueueToggle(\'all\')':'')+'">Assigned to me</button><button type="button" class="seg-btn'+(caQAll?' active':'')+'" onclick="'+(caQAll?'':'caQueueToggle(\'all\')')+'">All pending</button></div>':'')
    +'<button class="lp-pill-search" onclick="caQueueApply()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats exp-stats">'
      +caStat('Assigned to me',mine.length,false,'',  'info')
      +caStat('Overdue',over.length,caQOver,'caQueueToggle(\'over\')','bad')
      +caStat('Escalated to me',esc.length,false,'','wait')
      +(canAll?caStat('Unresolved escalations',flagged.length,false,'','bad'):'')
    +'</div></div>'
    +caSplitWrap('<table class="lp-table ax-table exp-table ca-queue-table"><thead><tr><th>S. No</th><th>Expense</th><th>Employee</th><th>Claimed</th>'
      +'<th>Current Stage</th><th>Submitted</th><th>Policy</th><th>Action</th></tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}

/* ── Reimbursements ────────────────────────────────────────────────────── */
function caRbApply(){caRbQ=lpSearchValue('carb-f-q');const pick=function(id,all){const v=getCSValue(id);return v&&v!==all?v:'';};
  caRbStatusF=pick('carb-f-status','All Statuses');caRbRouteF=pick('carb-f-route','All Routes');expSelectedId=null;renderADTPage();}
function caRbReset(){caRbQ='';caRbStatusF='';caRbRouteF='';expSelectedId=null;renderADTPage();}
function caRbStat(s){caRbStatusF=caRbStatusF===s?'':s;expSelectedId=null;renderADTPage();}
function caRbRows(){
  return expScope().filter(function(r){
    if(!r.pay)return false;
    if(caRbStatusF&&r.pay.status!==caRbStatusF)return false;
    if(caRbRouteF&&r.pay.route!==caRbRouteF)return false;
    return true;
  });
}
function caReimbListHTML(){
  const all=expScope().filter(function(r){return r.pay;});
  const rows=lpSearchRows(caRbRows(),caRbQ);
  if(expSelectedId&&!rows.some(function(r){return r.id===expSelectedId;}))expSelectedId=null;
  const pgn=listPage('exp-reimb',[caRbQ,caRbStatusF,caRbRouteF].join('|'),rows.map(function(r,i){
    const p=r.pay;
    return '<tr class="exp-row'+(expSelectedId===r.id?' lp-row-selected':'')+'" id="exp-row-'+r.id+'" style="cursor:pointer" onclick="'+caRowClick(r.id,'reimbursement')+'">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+p.key+'</div><div class="lp-c-sub">'+expKey(r)+' · '+sbEsc(r.title)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+sbEsc(r.name)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(caApprovedTotal(r),r.currency)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+(p.status==='Pending Verification'?'To verify':expMoney(p.payable,r.currency))+'</div>'
        +(p.status==='Pending Verification'?'':'<div class="lp-c-sub">settled '+expMoney(p.settled,r.currency)+' · due '+expMoney(caOutstanding(r),r.currency)+'</div>')+'</td>'
      +'<td><div class="lp-c-plain">'+(p.route||'—')+'</div>'+(p.payrollRef?'<div class="lp-c-sub">'+sbEsc(p.payrollRef)+'</div>':'')+'</td>'
      +'<td>'+caPayBadge(r)+'</td>'
      +'<td onclick="event.stopPropagation()">'+caRbAction(r)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No reimbursement matches this filter.</td></tr>');
  const tiles=['Ready for Payment','Processing','On Hold','Partially Paid','Paid'];
  return '<div class="lp-page">'
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('carb-f-q',caRbQ,'Search reimbursement, claim or employee','caRbApply()')
    +apCS('carb-f-status',CA_PAY_STATUSES,caRbStatusF,'All Statuses')
    +apCS('carb-f-route',CA_ROUTES,caRbRouteF,'All Routes')
    +clearFiltersBtn([caRbQ,caRbStatusF,caRbRouteF],'caRbReset()')
    +'<button class="lp-pill-search" onclick="caRbApply()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats exp-stats">'+tiles.map(function(s){return caStat(s,all.filter(function(r){return r.pay.status===s;}).length,caRbStatusF===s,'caRbStat(\''+s+'\')');}).join('')+'</div></div>'
    +(caPayrollOn()?'':'<div class="wb-note is-wait"><b>Payroll route is off</b> (Company Settings → Payroll).</div>')
    +caSplitWrap('<table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th><th>Reimbursement</th><th>Employee</th><th>Approved</th><th>Payable</th><th>Route</th><th>Status</th><th>Action</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}
/* The listing's next step for a reimbursement, if the person may take it. */
function caRbAction(r){
  const p=r.pay,proc=caCan('expense.reimb.process');let kind='',label='';
  if(proc&&p.status==='Pending Verification'){kind='verify';label='Verify';}
  else if(proc&&['Ready for Payment','Failed','Cancelled'].indexOf(p.status)>=0){kind='route';label='Process';}
  else if(proc&&caCan('expense.reimb.settle')&&['Processing','Partially Paid'].indexOf(p.status)>=0){kind='settle';label='Settle';}
  return kind?'<button class="btn btn-primary btn-sm" onclick="caActOpen(\''+kind+'\','+r.id+')">'+label+'</button>'
    :'<button class="btn btn-outline btn-sm" onclick="'+caRowClick(r.id,'reimbursement')+'">View</button>';
}
function caExportQueue(){
  let rows=caQueue(caQAll&&caCan('expense.approval.reassign'));
  if(caQOver)rows=rows.filter(function(r){return caOverdue(r);});
  rows=lpSearchRows(rows,caQQ);
  if(!rows.length){showToast('Nothing to export','info');return;}
  wbCSV('approval-queue',['Expense','Title','Employee','Category','Claimed','Currency','Stage','Approvers','Submitted','Due','Overdue'],
    rows.map(function(r){const st=caActiveStage(r);return [expKey(r),r.title,r.name,r.category,caTotal(r),r.currency,st?'Stage '+st.n+' '+st.name:'',st?caNs(st.approvers,' / '):'',r.appliedOn,st?caDue(st):'',caOverdue(r)?'Yes':'No'];}));
  showToast('Export ready','success',rows.length+' claims exported.');
}
function awfExport(){
  const rows=lpSearchRows(awfRows(),awfQ);
  if(!rows.length){showToast('Nothing to export','info');return;}
  wbCSV('approval-workflows',['Workflow','Name','Status','Version','Applies To','Scope','Category','Sub Category','Amount Threshold','Stages','Effective From','Effective To'],
    rows.map(function(w){return [caWfKey(w),w.name,caWfShown(w),'v'+w.version,w.appliesTo,caWfScope(w),w.category,w.subCat,caWfBand(w),caStagePath(w.stages),w.effFrom,w.effTo];}));
  showToast('Export ready','success',rows.length+' workflows exported.');
}
function caExportReimb(){
  const rows=lpSearchRows(caRbRows(),caRbQ);
  if(!rows.length){showToast('Nothing to export','info');return;}
  wbCSV('reimbursements',['Reimbursement','Expense','Employee','Currency','Approved','Payable','Settled','Outstanding','Route','Payroll Ref','Status','Reimbursed On'],
    rows.map(function(r){const p=r.pay;return [p.key,expKey(r),r.name,r.currency,caApprovedTotal(r),p.payable,p.settled,caOutstanding(r),p.route,p.payrollRef,p.status+(p.illustrative?' (Illustrative)':''),r.reimbursedOn||''];}));
  showToast('Export ready','success',rows.length+' reimbursements exported.');
}

/* ── Claim panel: Approval tab ─────────────────────────────────────────── */
function caDecisionRow(d,r){
  const l=d.lineId!=null?r.lines.find(function(x){return x.id===d.lineId;}):null;
  return '<div class="ca-dec'+(d.void?' is-void':'')+'">'
    +'<div class="ca-dec-hd"><b>'+sbEsc(caN(d.who))+'</b>'+(d.legacy?' <span class="wb-muted">carried over at migration</span>':'')+(d.intervention?' <span class="ca-iv-tag">Super Admin intervention</span>':'')+' · '+sbEsc(d.date)+' '+sbEsc(d.time||'')
      +(d.void?' · <span class="wb-muted">superseded</span>':'')+'</div>'
    +'<div>'+(l?sbEsc(l.title)+': ':'Whole claim: ')+axBadge(statusTone(d.decision),d.decision)
      +(d.decision==='Approved'||d.decision==='Partially Approved'?' '+expMoney(d.amount,r.currency)+(d.permitted!=null&&d.amount<d.permitted?' <span class="wb-muted">of '+expMoney(d.permitted,r.currency)+' permitted</span>':''):'')
      +(d.reason?' <span class="ca-dec-why">'+sbEsc(d.reason)+'</span>':'')+(d.comment?' <span class="wb-muted">· '+sbEsc(d.comment)+'</span>':'')+'</div>'
    +(d.intervention&&d.why?'<div class="wb-muted">Intervention reason: '+sbEsc(d.why)+'</div>':'')+'</div>';
}
function caStageCardHTML(r,st,superseded){
  const active=!superseded&&r.wf.open&&r.wf.stages[r.wf.current]===st;
  const status=superseded?'Superseded':st.status;
  const due=caDue(st),over=!superseded&&caOverdue(r,st);
  const decs=st.decisions.filter(function(d){return superseded||!d.void;});
  return '<div class="ca-stage'+(active?' is-active':'')+(superseded?' is-void':'')+'">'
    +'<div class="ca-stage-hd"><span class="exp-line-n">'+st.n+'</span><div class="exp-line-ttl"><div class="exp-line-name">'+sbEsc(st.name)+'</div>'
      +'<div class="exp-line-amt">'+sbEsc(caStageWho(st))+' · SLA '+caStageSla(st)+' calendar days'+(st.sla?'':' (entity default)')+(st.fallback?' · fallback '+sbEsc(caN(st.fallback)):'')+'</div></div>'
      +axBadge(statusTone(status),status)+(over?' '+axBadge('bad','Overdue'):'')+'</div>'
    +(st.assignedAt||st.approvers.length?'<div class="ca-stage-meta">'
      +'<span>Approver'+(st.approvers.length>1?'s':'')+' <b>'+sbEsc(caNs(st.approvers)||'—')+'</b>'+(st.rule==='All'&&st.approvers.length>1?' (all must decide)':'')+'</span>'
      +(st.assignedAt?'<span>Assigned <b>'+cdLabel(st.assignedAt)+'</b></span>':'')
      +(due&&!superseded&&['Awaiting Decision','Follow-Up Requested'].indexOf(st.status)>=0?'<span>Due <b>'+cdLabel(due)+'</b>'+(st.pausedDays?' <span class="wb-muted">(+'+st.pausedDays+' days paused for Follow-Up)</span>':'')+'</span>':'')
      +(st.escalated?'<span>Escalated to <b>'+sbEsc(caNs(st.escalatedTo))+'</b></span>':'')
      +'</div>':'')
    +(st.fallbackUsed?'<div class="ea-hint">Fallback approver used: '+sbEsc(st.note)+'.</div>':'')
    +(st.exception?'<div class="ea-hint exp-cap-over">Assignment exception: '+sbEsc(st.exception)+' A Super Admin must reassign this stage.</div>':'')
    +(st.escalationFlag&&!superseded?'<div class="ea-hint exp-cap-over">Escalation unresolved: no active, independent and authorised escalation authority or fallback. Needs administrative resolution (reassign).</div>':'')
    +(st.reassigns.some(function(x){return x.intervention;})?'<div class="ca-stage-sub">'+st.reassigns.filter(function(x){return x.intervention;}).map(function(x){return '<span class="ca-iv-tag">Super Admin intervention</span> '+sbEsc(caN(x.to))+' stands in for '+sbEsc(caNs(x.from))+' · '+sbEsc(x.date)+' - '+sbEsc(x.reason);}).join('<br>')+'</div>':'')
    +(st.reassigns.length?'<div class="ca-stage-sub">'+st.reassigns.map(function(x){return 'Reassigned from '+sbEsc(caNs(x.from)||'nobody')+' to <b>'+sbEsc(caN(x.to))+'</b> by '+sbEsc(caN(x.by))+' · '+sbEsc(x.date)+' - '+sbEsc(x.reason);}).join('<br>')+'</div>':'')
    +(decs.length?'<div class="ca-decs">'+decs.map(function(d){return caDecisionRow(d,r);}).join('')+'</div>':'')
    +'</div>';
}
function caDupNoteHTML(r,live){
  if(caKind(r)!=='expense')return '';   // duplicate-claim detection is for expense claims
  const m=live?caDupMatches({eid:r.employeeEid,category:r.category,currency:r.currency,lines:r.lines,claimId:r.id,revisedFrom:r.revisedFrom}):(r.dupCheck?r.dupCheck.matches:[]);
  if(!m.length)return '';
  return '<div class="wb-note is-wait"><b>Potential duplicate</b>'
    +m.map(function(x){return '<div class="wb-note-sub">"'+sbEsc(x.title)+'" matches '+x.ref+' "'+sbEsc(x.lineTitle)+'" ('+x.status+') - '+sbEsc(x.why)+'.</div>';}).join('')
    +(live?'':'<div class="wb-note-sub">Justification: '+(r.dupCheck&&r.dupCheck.just?'<b>'+sbEsc(r.dupCheck.just)+'</b>':'<span class="wb-warn">none</span>')+'</div>')+'</div>';
}
function caApprovalTabHTML(r,o){
  const ro=!!(o&&o.readOnly);   // read-only: the route, stages and decisions, no buttons (card requests decide in Logs)
  let out='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Approval</span><span class="ca-actions">'
    +(!ro&&caCanDecide(r)?'<button class="btn btn-primary btn-sm ca-review-btn" onclick="caReviewOpen('+r.id+')">Review</button>':'')
    +(!ro&&caCanReassign(r)?'<button class="btn btn-outline btn-sm" onclick="caActOpen(\'reassign\','+r.id+')">Reassign</button>':'')
    +(!ro&&caCanWithdraw(r)?'<button class="btn btn-outline btn-sm" onclick="caActOpen(\'withdraw\','+r.id+')">Withdraw</button>':'')
    +'</span></div>';
  if(r.status==='Draft'){
    const rt=caRoute(r);
    out+=rt.error?'<div class="wb-note is-bad"><b>No route yet</b><div class="wb-note-sub">'+sbEsc(rt.error)+'</div></div>'
      :'<div class="wb-note">On submission this claim takes <b>'+caWfKey(rt.wf)+' '+sbEsc(rt.wf.name)+'</b> (v'+rt.wf.version+'): '+sbEsc(caStagePath(rt.wf.stages))+'.</div>';
    return out+caDupNoteHTML(r,true);
  }
  if(!r.wf||(!r.wf.open&&r.wf.exception)){
    return out+(r.wf&&r.wf.exception?'<div class="wb-note is-bad"><b>Route exception</b><div class="wb-note-sub">'+sbEsc(r.wf.exception)+'</div>'
        +(!ro&&caCan(caPk(r,'reassign'))?'<div style="margin-top:8px"><button class="btn btn-primary btn-sm ca-review-btn" onclick="caAssignClick('+r.id+')">Assign Workflow</button></div>':'')+'</div>'
      :'<div class="wb-empty-sm">This claim was '+(r.migration?r.migration.status.toLowerCase()+' before approval routing existed; its status, line decisions and Logs are kept as they were.':'closed before approvals were tracked. Its Logs hold its history.')+'</div>');
  }
  if(r.status==='Awaiting Approval'&&!caCanDecide(r)&&caActiveStage(r))out+='<div class="ea-hint">'+sbEsc(caWhyNotDecide(r))+'</div>';
  const fu=r.wf.fu;
  if(fu&&fu.open){
    out+='<div class="wb-note is-wait"><b>Follow-Up requested</b> by '+sbEsc(caN(fu.by))+' at Stage '+(fu.stageIdx+1)+' · '+sbEsc(fu.date)
      +'<div class="wb-note-sub" style="font-size:12px;color:var(--navy)">'+sbEsc(fu.reason)+'</div>';
    if(!ro&&caCanRespond(r)){
      out+='<div class="ep-form-group" style="margin-top:10px"><label class="ep-form-label">Your response <span class="req">*</span></label>'
        +'<textarea class="ep-form-input ax-notes" id="ca-fu-resp" placeholder="What you changed or what the approver should know"></textarea>'
        +'<div class="ea-hint">To correct the claim, edit it first (Basic Details or Expense Summary → Edit). A comment or a new document returns it to Stage '+(fu.stageIdx+1)
        +'; a change to amounts, dates, category, currency, Paid By or line items re-runs the policy check and restarts approval from the first stage it affects.</div></div>'
        +'<div class="lp-sb-form-actions" style="border:0;padding-top:0;margin-top:8px"><button class="ep-save-btn" onclick="caResubmitClick('+r.id+')">Resubmit</button></div>';
    }
    out+='</div>';
  }
  out+=caDupNoteHTML(r,false);
  out+='<div class="ca-route">Route <b>'+sbEsc(r.wf.wfKey)+' '+sbEsc(r.wf.wfName)+'</b> · v'+r.wf.version+(r.wf.round>1?' · approval round '+r.wf.round:'')+'</div>';
  out+=r.wf.stages.map(function(st){return caStageCardHTML(r,st,false);}).join('');
  if(r.wf.superseded.length)out+='<div class="wb-proj-h">Superseded decisions</div>'+r.wf.superseded.map(function(st){return caStageCardHTML(r,st,true);}).join('');
  if(r.wf.fuHistory.length)out+='<div class="wb-proj-h">Follow-Up history</div>'+r.wf.fuHistory.slice().reverse().map(function(f){
    return '<div class="ca-dec"><div class="ca-dec-hd"><b>'+sbEsc(caN(f.by))+'</b> asked at Stage '+(f.stageIdx+1)+' · '+sbEsc(f.date)+'</div><div>'+sbEsc(f.reason)+'</div>'
      +'<div class="ca-dec-hd" style="margin-top:4px"><b>'+sbEsc(caN(f.respondedBy||''))+'</b> answered · '+sbEsc(f.respondedAt||'')+'</div><div>'+sbEsc(f.response||'')+'</div>'
      +(f.changes&&f.changes.material.length?'<div class="wb-muted">Material: '+sbEsc(f.changes.material.join('; '))+'</div>':'')+'</div>';
  }).join('');
  return out;
}
function caAssignClick(id){
  const err=caAssignWorkflow(id);
  if(err){showToast('No route','error',err);return;}
  renderADTPage();const st=caActiveStage(caRec(id));
  showToast('Workflow assigned','success',expKey(caRec(id))+' · Stage 1 with '+(st?caNs(st.approvers):'nobody')+'.');
}
function caResubmitClick(id){
  const el=document.getElementById('ca-fu-resp');
  const err=caResubmit(id,el?el.value:'');
  if(err){showToast('Cannot resubmit','error',err);return;}
  renderADTPage();
  const r=caRec(id);const st=caActiveStage(r);
  showToast('Resubmitted','success',expKey(r)+' is back with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'.');
}

/* ── Claim panel: Reimbursement tab ────────────────────────────────────── */
function caReimbTabHTML(r){
  const p=r.pay;
  const proc=caCan('expense.reimb.process');
  if(!p){
    const s=caPayStatus(r);
    return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Reimbursement</span>'+axBadge(statusTone(s),s)+'</div>'
      +'<div class="wb-empty-sm">'+(s==='Not Applicable'?'Nothing is payable on a '+r.status.toLowerCase()+' claim.':'A reimbursement is created once every approval stage is complete.')+'</div>';
  }
  const sp=caSplit(r);
  let btn='';
  if(proc&&p.status==='Pending Verification')btn+='<button class="btn btn-primary btn-sm ca-review-btn" onclick="caActOpen(\'verify\','+r.id+')">Verify Settlement</button>';
  if(proc&&p.status!=='Pending Verification'){
    if(['Ready for Payment','Failed','Cancelled'].indexOf(p.status)>=0)btn+='<button class="btn btn-primary btn-sm ca-review-btn" onclick="caActOpen(\'route\','+r.id+')">'+(p.status==='Ready for Payment'?'Process Payment':'Retry Payment')+'</button>';
    if(['Processing','Partially Paid'].indexOf(p.status)>=0)btn+='<button class="btn btn-primary btn-sm ca-review-btn" onclick="caActOpen(\'settle\','+r.id+')">Record Settlement</button>';
    if(['Ready for Payment','Processing','Partially Paid'].indexOf(p.status)>=0)btn+='<button class="btn btn-outline btn-sm" onclick="caActOpen(\'hold\','+r.id+')">Hold</button>';
    if(p.status==='On Hold'&&!r.lines.some(function(l){return Number(l.approved)>0&&!l.paidBy;}))btn+='<button class="btn btn-outline btn-sm" onclick="caPayAction(\'resume\','+r.id+')">Resume</button>';
    if(['Processing','Partially Paid'].indexOf(p.status)>=0)btn+='<button class="btn btn-outline btn-sm" onclick="caActOpen(\'fail\','+r.id+')">Mark Failed</button>';
    if(['Processing','Failed','On Hold'].indexOf(p.status)>=0&&(p.settled===0||p.status==='Failed'))btn+='<button class="btn btn-outline btn-sm" onclick="caActOpen(\'cancel\','+r.id+')">Cancel Instruction</button>';
    if(r.lines.some(function(l){return Number(l.approved)>0&&!l.paidBy;}))btn+='<button class="btn btn-primary btn-sm ca-review-btn" onclick="caActOpen(\'verify\','+r.id+')">Verify Funding</button>';
  }
  const card=function(k,v,e){return '<div class="wb-proj-card"><span>'+k+'</span><b>'+v+'</b>'+(e?'<em>'+e+'</em>':'')+'</div>';};
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Reimbursement '+p.key+'</span><span class="ca-actions">'+caPayBadge(r)+btn+'</span></div>'
    +(p.status==='On Hold'&&p.holdReason?'<div class="wb-note is-wait"><b>On hold</b><div class="wb-note-sub">'+sbEsc(p.holdReason)+'</div></div>':'')
    +(p.status==='Pending Verification'?'<div class="wb-note is-wait"><b>Pending verification</b><div class="wb-note-sub" style="color:var(--navy)">'+sbEsc(p.reported||'')+' It is neither paid nor unpaid until Finance verifies it: who paid each line, and whether and how the employee was paid.</div></div>':'')
    +'<div class="wb-proj-cards ca-pay-cards">'
      +card('Claimed',expMoney(caTotal(r),r.currency))
      +card('Approved',expMoney(caApprovedTotal(r),r.currency),r.status)
      +(p.status==='Pending Verification'?card('Payable to employee','To verify','Paid By not recorded')+card('Settled','Unverified',p.reported?'reported only':'')+card('Outstanding','Unverified'):'')
      +(p.status==='Pending Verification'?'':card('Payable to employee',expMoney(p.payable,r.currency),(sp.company?'company-paid '+expMoney(sp.company,r.currency)+' excluded':'')+(sp.advance?' · advance '+expMoney(sp.advance,r.currency)+' held':''))
      +card('Settled',expMoney(p.settled,r.currency)+(p.illustrative?' · Illustrative':''),p.route?p.route+(p.payrollRef?' · '+sbEsc(p.payrollRef):''):'no route yet')
      +card('Outstanding',expMoney(caOutstanding(r),r.currency)))
    +'</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Line</th><th class="wb-num">Claimed</th><th class="wb-num">Approved</th><th>Paid By</th><th class="wb-num">To employee</th></tr></thead><tbody>'
    +r.lines.map(function(l){const a=l.approved!=null?Number(l.approved):0;
      return '<tr><td class="csag-td" style="white-space:normal">'+sbEsc(l.title)+'</td><td class="csag-td wb-num">'+expMoney(l.amount,r.currency)+'</td><td class="csag-td wb-num">'+expMoney(a,r.currency)+'</td>'
        +'<td class="csag-td">'+(l.paidBy||'<span class="wb-warn">Not recorded</span>')+'</td><td class="csag-td wb-num">'+expMoney(l.paidBy==='Employee'?a:0,r.currency)+'</td></tr>';}).join('')
    +'</tbody></table></div>'
    +'<div class="wb-proj-h">Payment history</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>When</th><th>Event</th><th>By</th><th>Details</th></tr></thead><tbody>'
    +p.events.map(function(e){return '<tr><td class="csag-td">'+sbEsc(e.date)+' '+sbEsc(e.time||'')+'</td><td class="csag-td">'+sbEsc(e.type)+'</td><td class="csag-td">'+sbEsc(caN(e.by))+'</td>'
      +'<td class="csag-td" style="white-space:normal">'+(e.amount!=null&&e.type==='Settlement'?expMoney(e.amount,r.currency)+' · ':'')+(e.route&&e.type==='Settlement'?sbEsc(e.route)+' · ':'')+(e.ref?'ref '+sbEsc(e.ref)+' · ':'')+(e.payDate?'paid '+cdLabel(e.payDate)+' · ':'')
        +(e.evidence?'evidence '+sbEsc(e.evidence)+' · ':'')+sbEsc(e.remarks||'')+'</td></tr>';}).join('')
    +'</tbody></table></div>';
}

/* ── Review popup ──────────────────────────────────────────────────────── */
function caReviewOpen(id,o){
  if(typeof rlClose==='function')rlClose();
  const r=caRec(id);if(!r)return;
  if(!caCanDecide(r)){showToast('Not your decision','error',caWhyNotDecide(r));return;}
  o=o||{};
  caRev={id:id,scope:o.scope||'claim',decision:o.decision||'',reason:o.reason||'',comment:'',why:o.why||'',onBehalf:'',lines:{},rev:caRevOf(r)};
  if(o.lineId!=null)caRev.lines[o.lineId]={decision:o.lineDecision||'',amount:'',reason:o.reason||''};
  renderADTPage();
}
function caReviewClose(){caRev=null;renderADTPage();}
function caRevSync(){
  if(!caRev)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  if(document.getElementById('csw-car-dec'))caRev.decision=getCSValue('car-dec');
  if(v('car-reason')!=null)caRev.reason=v('car-reason');
  if(v('car-comment')!=null)caRev.comment=v('car-comment');
  if(v('car-why')!=null)caRev.why=v('car-why');
  if(document.getElementById('csw-car-behalf')){const r0=caRec(caRev.id),s0=r0&&caActiveStage(r0);caRev.onBehalf=s0?idFromLabel(getCSValue('car-behalf'),caUndecided(s0)):'';}
  const r=caRec(caRev.id);
  (r?r.lines:[]).forEach(function(l){
    if(!document.getElementById('csw-car-d-'+l.id))return;
    const x=caRev.lines[l.id]=caRev.lines[l.id]||{};
    x.decision=getCSValue('car-d-'+l.id);
    if(v('car-a-'+l.id)!=null)x.amount=v('car-a-'+l.id);
    if(v('car-aa-'+l.id)!=null)x.adv=v('car-aa-'+l.id);
    if(v('car-ae-'+l.id)!=null)x.emp=v('car-ae-'+l.id);
    if(v('car-r-'+l.id)!=null)x.reason=v('car-r-'+l.id);
  });
}
function caRevScope(s){caRevSync();caRev.scope=s;renderADTPage();}
function caRevHook(){caRevSync();renderADTPage();}
function caReviewHTML(){
  const r=caRec(caRev.id);if(!r)return '';
  const st=caActiveStage(r);if(!st)return '';
  const me=caMe(),iv=caIsIntervention(r,me),ivAll=iv&&st.rule==='All'&&st.approvers.length>1,admin=iv&&!ivAll;
  const open=st.lineIds.map(function(id){return r.lines.find(function(l){return l.id===id;});})
    .filter(function(l){return l&&!caStageResult(st,l)&&(admin||!caStageDecided(st,me,l.id));});
  const seg=function(id,label){return '<button type="button" class="seg-btn'+(caRev.scope===id?' active':'')+'" onclick="caRevScope(\''+id+'\')">'+label+'</button>';};
  const reqNote=st.comment==='Always required'?'A comment is required at this stage.':st.comment==='Optional'?'Comments are optional at this stage.':'A reason is required to reject or ask for a Follow-Up.';
  let body;
  if(caRev.scope==='claim'){
    const d=caRev.decision;
    body='<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Decision <span class="req">*</span></label>'+apCS('car-dec',['Approve','Reject','Follow-Up'],d,'Select decision','caRevHook')
        +'<div class="ea-hint">'+(caKind(r)==='expense'?'Applies to the '+open.length+' line'+(open.length===1?'':'s')+' still open at this stage, each at what is currently permitted. To reduce an amount, use Line Items.'
          :(caExt(r)&&caExt(r).decisionHint)||'Approves the amount currently permitted. To approve less, use Amount (if the advance policy allows partial approval).')+'</div></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">'+(d==='Follow-Up'?'Follow-Up request':d==='Reject'?'Rejection reason':'Comment')+(d==='Reject'||d==='Follow-Up'||st.comment==='Always required'?' <span class="req">*</span>':'')+'</label>'
        +'<textarea class="ep-form-input ax-notes" id="car-reason" placeholder="'+(d==='Follow-Up'?'What the employee should clarify or correct':d==='Reject'?'Why the claim is rejected':reqNote)+'">'+sbEsc(caRev.reason||'')+'</textarea></div>'
      +'</div>';
  }else{
    body='<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table ca-rev-table"><thead><tr><th>Line</th><th>Claimed</th><th>Permitted</th><th>Decision</th><th>Approve At</th><th>Reason</th></tr></thead><tbody>'
      +open.map(function(l){
        const x=caRev.lines[l.id]||{};
        const part=x.decision==='Partially Approve';
        const fd=caIsFunded(l);
        const sub=caKind(r)!=='expense'?sbEsc(r.category)+(l.start?' · needed by '+cdLabel(l.start):'')
          :sbEsc(l.subCat)+' · '+cdLabel(l.start)+' · paid by '+(l.paidBy||'not recorded')+(l.merchant?' · '+sbEsc(l.merchant):'')
            +(fd?' · '+sbEsc(typeof advRefLabel==='function'?advRefLabel(l.advanceId):'advance')+': advance '+expMoney(caCeilAdv(l),r.currency)+', employee '+expMoney(caCeilEmp(l),r.currency):'');
        return '<tr><td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+sbEsc(l.title)+'</div><div class="lp-c-sub">'+sub+'</div>'+(l.proof?expProofChip(l):'')+'</td>'
          +'<td class="csag-td wb-num">'+expMoney(l.amount,r.currency)+'</td>'
          +'<td class="csag-td wb-num">'+expMoney(caCeiling(l),r.currency)+'</td>'
          +'<td class="csag-td ca-rev-dec">'+apCS('car-d-'+l.id,['Approve','Partially Approve','Reject','Follow-Up'],x.decision||'','Decide','caRevHook')+'</td>'
          +'<td class="csag-td">'+(fd&&part
            /* A funded line: the approver confirms both approved parts. */
            ?'<div class="ca-split"><input class="ep-form-input ca-rev-amt" id="car-aa-'+l.id+'" type="number" min="0" max="'+caCeilAdv(l)+'" step="0.01" value="'+attrSafe(x.adv!=null?x.adv:'')+'" placeholder="Advance ≤ '+caCeilAdv(l)+'" title="Approved advance-funded amount">'
              +'<input class="ep-form-input ca-rev-amt" id="car-ae-'+l.id+'" type="number" min="0" max="'+caCeilEmp(l)+'" step="0.01" value="'+attrSafe(x.emp!=null?x.emp:'')+'" placeholder="Employee ≤ '+caCeilEmp(l)+'" title="Approved employee-paid amount"'+(caCeilEmp(l)>0?'':' disabled')+'></div>'
            :'<input class="ep-form-input ca-rev-amt" id="car-a-'+l.id+'" type="number" min="0" max="'+caCeiling(l)+'" step="0.01" '+(part?'':'disabled ')
              +'value="'+attrSafe(part?(x.amount||''):'')+'" placeholder="'+(part?'≤ '+caCeiling(l):'—')+'">')+'</td>'
          +'<td class="csag-td"><input class="ep-form-input" id="car-r-'+l.id+'" value="'+attrSafe(x.reason||'')+'" placeholder="'+(x.decision==='Follow-Up'?'Request':x.decision&&x.decision!=='Approve'?'Required':'Optional')+'"></td></tr>';
      }).join('')
      +'</tbody></table></div><div class="ea-hint">Lines left without a decision stay open at this stage. Zero is a rejection. A later stage can confirm or reduce, never raise, what an earlier stage permitted.</div>';
  }
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal ca-rev-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Review '+expKey(r)+'</span><button class="ct-modal-close" onclick="caReviewClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">Stage '+st.n+' of '+r.wf.stages.length+' · '+sbEsc(st.name)+' · deciding as <b>'+sbEsc(caN(me))+'</b>'+(st.rule==='All'&&st.approvers.length>1?' · All rule: '+sbEsc(caNs(st.approvers))+' must each decide':'')+'</p>'
    +'<div class="lp-sb-detail-grid ca-rev-sum">'
      +axField(AX_ICO.fUser,'Employee',sbEsc(r.name)+((r.submittedBy||r.createdBy)!==caClaimantUser(r)?' <span class="ax-sub">submitted by '+sbEsc(caN(r.submittedBy||r.createdBy))+'</span>':''))
      +axField(AX_ICO.fBox,caKind(r)==='expense'?'Category':CA_TYPE_LABEL[caKind(r)]+' Type',sbEsc(r.category))
      +axField(AX_ICO.fCash,caKind(r)==='expense'?'Claimed':'Requested',expMoney(caTotal(r),r.currency))
      +axField(AX_ICO.fCash,'Permitted so far',expMoney(r.lines.reduce(function(s,l){return s+(l.status==='Rejected'?0:caCeiling(l));},0),r.currency))
    +'</div>'
    +(caKind(r)!=='expense'?(caExt(r)&&caExt(r).reviewInfo?caExt(r).reviewInfo(r):'')
      :caDupNoteHTML(r,false)+(typeof epClaimEvalHTML==='function'?epClaimEvalHTML(r):''))
    +(typeof bgRecordEvalHTML==='function'?bgRecordEvalHTML(r):'')
    +(iv?'<div class="wb-note is-wait ca-iv"><b>Super Admin intervention</b><div class="wb-note-sub" style="color:var(--navy)">You are not an assigned approver of Stage '+st.n+' ('+sbEsc(caNs(st.approvers)||'unassigned')+'). '
        +(ivAll?'This stage needs every approver: your decision stands in for <b>one</b> undecided approver; the others must still approve (a rejection by any approver rejects).':'Your decision can complete this '+sbEsc(st.rule)+' stage.')
        +' It is audited with your name, decision, reason and time.</div>'
      +'<div class="ep-form-grid" style="margin-top:10px">'
      +(ivAll?'<div class="ep-form-group"><label class="ep-form-label">Decide in place of <span class="req">*</span></label>'+apCS('car-behalf',idLabels(caUndecided(st)),caRev.onBehalf?idLabel(caRev.onBehalf,caUndecided(st)):'','Undecided approver')+'</div>':'')
      +'<div class="ep-form-group'+(ivAll?'':' ep-form-full')+'"><label class="ep-form-label">Intervention reason <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="car-why" placeholder="Why you are deciding instead of the assigned approver">'+sbEsc(caRev.why||'')+'</textarea></div>'
      +'</div></div>':'')
    +'<div class="segmented is-compact ca-rev-scope">'+seg('claim',caKind(r)==='expense'?'Whole claim':'Whole request')+seg('lines',caKind(r)==='expense'?'Line items':'Amount')+'</div>'
    +body
    +(caRev.scope==='lines'?'<div class="ep-form-group ep-form-full" style="margin-top:12px"><label class="ep-form-label">Comment'+(st.comment==='Always required'?' <span class="req">*</span>':'')+'</label>'
      +'<textarea class="ep-form-input ax-notes" id="car-comment" placeholder="'+reqNote+'">'+sbEsc(caRev.comment||'')+'</textarea></div>':'')
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="caReviewClose()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="caReviewSubmit()">Submit Decision</button></div></div>'
    +'</div></div>';
}
/* Concurrency: a claim's revision is its audit trail. A popup opened on one
   revision refuses to save over another - somebody acted in the meantime. */
function caRevOf(r){return r?(r.logs||[]).length+'|'+(r.pay?r.pay.events.length:0)+'|'+r.status:'';}
function caStale(id,rev,close){
  const r=caRec(id);
  if(!r||caRevOf(r)===rev)return false;
  close();renderADTPage();
  showToast('This claim changed','error',expKey(r)+' was updated by someone else while this was open (now '+r.status+'). Nothing was saved; open it again to act on the latest.');
  return true;
}
function caReviewSubmit(){
  if(caRev&&caStale(caRev.id,caRev.rev,function(){caRev=null;}))return;
  caRevSync();
  const p={scope:caRev.scope,comment:caRev.comment};
  p.why=caRev.why||'';p.onBehalf=caRev.onBehalf||'';
  if(caRev.scope==='claim'){p.decision=caRev.decision;p.reason=caRev.reason;p.comment=caRev.decision==='Approve'?caRev.reason:'';}
  else p.lines=caRev.lines;
  const id=caRev.id;
  const err=caDecide(id,p);
  if(err){showToast('Decision not saved','error',err);return;}
  caRev=null;renderADTPage();
  const r=caRec(id);const st=caActiveStage(r);
  showToast('Decision recorded','success',expKey(r)+' is '+r.status+(st&&r.status==='Awaiting Approval'?' · Stage '+st.n+' · '+(caNs(st.approvers)||'unassigned'):'')+'.');
}

/* ── Small action popups: withdraw, reassign, payment steps ────────────── */
function caActOpen(kind,id,o){
  if(typeof rlClose==='function')rlClose();
  const r=caRec(id);if(!r)return;
  const p=r.pay||{};
  caAct=Object.assign({kind:kind,id:id,reason:'',to:'',from:'',route:kind==='settle'?(p.route||''):'',ref:kind==='settle'&&p.route==='Payroll'?(p.payrollRef||''):'',
    amount:kind==='settle'?String(caOutstanding(r)):'',date:wbToday(),evidence:'',remarks:'',map:{},state:'',rev:caRevOf(r)},o||{});
  renderADTPage();
}
function caActClose(){caAct=null;renderADTPage();}
/* Who a stage can go to, and which approvers can be replaced (account IDs). */
function caReassignPools(r){
  const st=r&&caActiveStage(r);if(!st)return {to:[],from:[]};
  const ex=caExt(r);
  return {to:(ex&&ex.reassignPool?ex.reassignPool(r,st):caApproverPool()).filter(function(n){return caExcluded(r).indexOf(n)<0&&st.approvers.indexOf(n)<0&&!(caFitKind(r)&&caStageFit(r,st,n));}),
    from:st.approvers.filter(function(n){return !st.decisions.some(function(d){return d.who===n&&!d.void&&d.decision!=='Follow-Up';});})};
}
function caActSync(){
  if(!caAct)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;};
  ['reason','ref','amount','remarks'].forEach(function(k){if(v('caa-'+k)!=null)caAct[k]=v('caa-'+k);});
  if(v('caa-date')!=null)caAct.date=v('caa-date');
  if(document.getElementById('csw-caa-to')||document.getElementById('csw-caa-from')){
    const rr=caRec(caAct.id),p=caReassignPools(rr);
    if(document.getElementById('csw-caa-to'))caAct.to=idFromLabel(getCSValue('caa-to'),p.to);
    if(document.getElementById('csw-caa-from'))caAct.from=idFromLabel(getCSValue('caa-from'),p.from);
  }
  if(document.getElementById('csw-caa-route'))caAct.route=getCSValue('caa-route');
  if(document.getElementById('csw-caa-csrc'))caAct.source=getCSValue('caa-csrc')==='Illustrative'?'Illustrative':'';
  if(document.getElementById('csw-caa-run'))caAct.ref=getCSValue('caa-run');
  if(document.getElementById('csw-caa-src')&&typeof fbSourceFromLabel==='function')caAct.sourceId=fbSourceFromLabel(getCSValue('caa-src'));
  if(v('caa-correction')!=null)caAct.correction=v('caa-correction');
  if(document.getElementById('csw-caa-state'))caAct.state=getCSValue('caa-state')==='Paid - record the verified settlement'?'paid':getCSValue('caa-state')?'unpaid':'';
  const r=caRec(caAct.id);
  if(r)r.lines.forEach(function(l){if(document.getElementById('csw-caa-pb-'+l.id))caAct.map[l.id]=getCSValue('caa-pb-'+l.id);});
}
function caActHook(){caActSync();renderADTPage();}
function caPickEvidence(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}caActSync();caAct.evidence=f.name;renderADTPage();}
function caActHTML(){
  const a=caAct,r=caRec(a.id);if(!r)return '';
  const exK=caKind(r)==='expense';
  const T={withdraw:['Withdraw '+expKey(r)+'?',exK?'This closes the approval workflow and releases the reserved policy utilisation. A withdrawn claim cannot be paid or reopened.'
      :'This closes the approval workflow. A withdrawn request is never disbursed and cannot be reopened; raise a new request if funds are still needed.',exK?'Withdraw Claim':'Withdraw Request'],
    reassign:['Reassign Approval','Hand the active stage of '+expKey(r)+' to another approver. The claimant and submitter cannot be chosen.','Reassign'],
    route:['Process Payment · '+(r.pay?r.pay.key:''),expKey(r)+' · payable '+expMoney(r.pay?r.pay.payable:0,r.currency)+'. Choosing a route does not mark it paid.','Start Processing'],
    settle:['Record Settlement · '+(r.pay?r.pay.key:'')+' · '+sbEsc(r.name),'Record a payment that has actually been made. Outstanding: '+expMoney(caOutstanding(r),r.currency)+'.','Record Settlement'],
    hold:['Put Payment on Hold','The reimbursement waits until it is resumed.','Hold'],
    fail:['Mark Payment Failed','The instruction failed; it can be retried.','Mark Failed'],
    cancel:['Cancel Payment Instruction','An unsettled instruction is cancelled; a new route can then be chosen.','Cancel Instruction'],
    verify:[r.pay&&r.pay.status==='Pending Verification'?'Verify Settlement':'Verify Funding Source',r.pay&&r.pay.status==='Pending Verification'?(r.pay.reported||'')+' Confirm who paid each line and whether the employee was paid - with its reference and evidence.':'These approved lines were filed before Expense Paid By was recorded. Say who paid each; only employee-paid amounts are reimbursed.','Save Verification']}[a.kind];
  let f='';
  if(a.kind==='reassign'){
    const st=caActiveStage(r);
    const pp=caReassignPools(r),pool=pp.to,undecided=pp.from;
    f='<div class="ep-form-group ep-form-full"><div class="ea-hint">Stage '+st.n+' · '+sbEsc(st.name)+' - now with '+sbEsc(caNs(st.approvers)||'nobody')+(st.approvers.length>1?' ('+st.rule+'). The rule is kept: one approver is replaced.':'')+'</div></div>'
      +(st.approvers.length>1?'<div class="ep-form-group"><label class="ep-form-label">Replace <span class="req">*</span></label>'+apCS('caa-from',idLabels(undecided),a.from?idLabel(a.from,undecided):'','Approver being replaced')+'</div>':'')
      +'<div class="ep-form-group'+(st.approvers.length>1?'':' ep-form-full')+'"><label class="ep-form-label">New approver <span class="req">*</span></label>'+axCS('caa-to',idLabels(pool),a.to?idLabel(a.to,pool):'','Search approver')+'</div>';
  }
  if(a.kind==='route'){
    f='<div class="ep-form-group"><label class="ep-form-label">Payment route <span class="req">*</span></label>'+apCS('caa-route',caPayrollOn()?CA_ROUTES:['Manual/External Payment'],a.route,'Select route','caActHook')
        +(caPayrollOn()?'':'<div class="ea-hint">Payroll is off for expenses (Company Settings → Payroll).</div>')+'</div>'
      +(a.route==='Payroll'?'<div class="ep-form-group"><label class="ep-form-label">Payroll run <span class="req">*</span></label>'+(caPayrollRuns(r).length?apCS('caa-run',caPayrollRuns(r),a.ref,'Select payroll run'):'<input class="ep-form-input ca-ro" readonly value="No open '+r.currency+' payroll run - create one in Payroll">')+'</div>'
        +'<div class="ep-form-group ep-form-full"><div class="ea-hint">The reimbursement shows Processing - pending payroll confirmation. Record the settlement with the payroll reference once payroll confirms it was paid.</div></div>':'');
  }
  /* Funding-source tracking (js/budgets.js): a manual payment names its source; payroll never does. */
  if(a.kind==='route'&&a.route&&a.route!=='Payroll'&&typeof fbSourceFieldHTML==='function')f+=fbSourceFieldHTML('caa-src',a.sourceId,r.currency,r.entity,caOutstanding(r));
  if(a.kind==='settle'){
    f=caSettleFieldsHTML(r,a,r.pay.route==='Payroll');
  }
  if(a.kind==='verify'&&r.pay&&r.pay.status==='Pending Verification'){
    const st=a.state==='paid'?'Paid - record the verified settlement':a.state==='unpaid'?'Not paid - make it payable':'';
    f=r.lines.filter(function(l){return Number(l.approved)>0&&!l.paidBy;}).map(function(l){
      return '<div class="ep-form-group"><label class="ep-form-label">'+sbEsc(l.title)+' · '+expMoney(l.approved,r.currency)+' <span class="req">*</span></label>'+apCS('caa-pb-'+l.id,CA_PAID_BY,a.map[l.id]||'','Who paid')+'</div>';
    }).join('')
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Was the employee paid? <span class="req">*</span></label>'+apCS('caa-state',['Paid - record the verified settlement','Not paid - make it payable'],st,'Select','caActHook')+'</div>'
      +(a.state==='paid'?'<div class="ep-form-group"><label class="ep-form-label">Paid through <span class="req">*</span></label>'+apCS('caa-route',CA_ROUTES,a.route,'Select route','caActHook')+'</div>'+caSettleFieldsHTML(r,a,a.route==='Payroll',true):'')
      +(a.state==='unpaid'&&r.status==='Reimbursed'?'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Reason for correcting Reimbursed → Approved <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="caa-correction" placeholder="e.g. Bank statement shows no transfer for this claim">'+sbEsc(a.correction||'')+'</textarea><div class="ea-hint">The original status and this reason stay in History and Logs.</div></div>':'')
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Remarks</label><textarea class="ep-form-input ax-notes" id="caa-remarks">'+sbEsc(a.remarks)+'</textarea></div>';
  }
  if(a.kind==='verify'&&r.pay&&r.pay.status==='Pending Verification'&&a.state==='paid'&&a.route&&a.route!=='Payroll'&&typeof fbSourceFieldHTML==='function')
    f+=fbSourceFieldHTML('caa-src',a.sourceId,r.currency,r.entity,parseFloat(a.amount)||0);
  if(a.kind==='verify'&&!(r.pay&&r.pay.status==='Pending Verification')){
    f=r.lines.filter(function(l){return Number(l.approved)>0&&!l.paidBy;}).map(function(l){
      return '<div class="ep-form-group"><label class="ep-form-label">'+sbEsc(l.title)+' · '+expMoney(l.approved,r.currency)+' <span class="req">*</span></label>'+apCS('caa-pb-'+l.id,CA_PAID_BY,a.map[l.id]||'','Who paid')+'</div>';
    }).join('');
  }
  if(['withdraw','reassign','hold','fail','cancel'].indexOf(a.kind)>=0)
    f+='<div class="ep-form-group ep-form-full"><label class="ep-form-label">Reason <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="caa-reason">'+sbEsc(a.reason)+'</textarea></div>';
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal ca-act-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+T[0]+'</span><button class="ct-modal-close" onclick="caActClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+T[1]+'</p><div class="ep-form-grid">'+f+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="caActClose()">Cancel</button>'
    +'<button class="ep-save-btn'+(a.kind==='withdraw'?' is-danger':'')+'" onclick="caActSubmit()">'+T[2]+'</button></div></div></div></div>';
}
function caActSubmit(){
  if(caAct&&caStale(caAct.id,caAct.rev,function(){caAct=null;}))return;
  caActSync();
  const a=caAct;let err='',msg='';
  if(a.kind==='withdraw'){err=caWithdraw(a.id,a.reason);msg=caKind(caRec(a.id))==='expense'?'Claim withdrawn':'Request withdrawn';}
  else if(a.kind==='reassign'){err=caReassign(a.id,a.to,a.reason,null,a.from);msg='Approval reassigned';}
  else if(a.kind==='route'){err=caPaySetRoute(a.id,a.route,a.ref,undefined,a.sourceId);msg='Payment processing';}
  else if(a.kind==='settle'){err=caPaySettle(a.id,{amount:a.amount,date:a.date,ref:a.ref,evidence:a.evidence,remarks:a.remarks,source:a.source});msg=a.source==='Illustrative'?'Illustrative payment recorded':'Settlement recorded';}
  else if(a.kind==='hold'){err=caPayHold(a.id,a.reason);msg='Payment on hold';}
  else if(a.kind==='fail'){err=caPayFail(a.id,a.reason);msg='Payment marked failed';}
  else if(a.kind==='cancel'){err=caPayCancel(a.id,a.reason);msg='Instruction cancelled';}
  else if(a.kind==='verify'){err=caPayVerify(a.id,{map:a.map,state:a.state,route:a.route,ref:a.ref,amount:a.amount,date:a.date,evidence:a.evidence,remarks:a.remarks,correction:a.correction,sourceId:a.sourceId});msg='Verification saved';}
  if(err){showToast(msg.split(' ')[0]==='Claim'?'Cannot withdraw':'Not saved','error',err);return;}
  const r=caRec(a.id);
  caAct=null;renderADTPage();
  showToast(msg,'success',expKey(r)+(r.pay&&a.kind!=='withdraw'&&a.kind!=='reassign'?' · reimbursement '+r.pay.status:' · '+r.status)+'.');
}
/* Amount, date, reference (payroll run or UTR) and evidence of a settlement. */
function caSettleFieldsHTML(r,a,payroll,verify){
  const ill=!verify&&typeof caIllustrativeOn==='function'&&caIllustrativeOn(r.entity);
  const src=ill?'<div class="ep-form-group"><label class="ep-form-label">Confirmation Source <span class="req">*</span></label>'+apCS('caa-csrc',['Payment evidence','Illustrative'],a.source==='Illustrative'?'Illustrative':'Payment evidence','Select','caActHook')+'</div>':'';
  if(ill&&a.source==='Illustrative')return src+caSettleIllustrativeHTML(r,a);
  const max=verify?caSplit(r).employee+r.lines.reduce(function(s,l){return s+(Number(l.approved)>0&&!l.paidBy&&a.map[l.id]==='Employee'?Number(l.approved):0);},0):caOutstanding(r);
  return src+'<div class="ep-form-group"><label class="ep-form-label">Amount settled <span class="req">*</span></label><div class="ax-currency"><span>'+r.currency+'</span><input class="ep-form-input" id="caa-amount" type="number" min="0" step="0.01" value="'+attrSafe(a.amount||(max?String(max):''))+'"></div>'
      +'<div class="ea-hint">'+(verify?'At most what the employee paid.':'Outstanding '+expMoney(max,r.currency)+'; a part payment leaves the rest outstanding.')+'</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Payment date <span class="req">*</span></label>'+apCD('caa-date',a.date,'Select date')+'</div>'
    +(payroll?'<div class="ep-form-group"><label class="ep-form-label">Payroll run reference <span class="req">*</span></label>'+(caPayrollRuns(r,true).length?apCS('caa-run',caPayrollRuns(r,true),a.ref,'Select payroll run'):'<input class="ep-form-input ca-ro" readonly value="No '+r.currency+' payroll run in this entity">')+'</div>'
      :'<div class="ep-form-group"><label class="ep-form-label">Payment reference / UTR <span class="req">*</span></label><input class="ep-form-input" id="caa-ref" value="'+attrSafe(a.ref)+'" placeholder="UTR or transaction ID"></div>')
    +'<div class="ep-form-group"><label class="ep-form-label">'+(payroll?'Payroll confirmation':'Settlement evidence')+' <span class="req">*</span></label>'
      +(a.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+sbEsc(a.evidence)+'</span></div>'
        :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="caPickEvidence(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · '+(payroll?'payslip or payroll register line':'bank advice')+'</span></span></label>')+'</div>'
    +(verify?'':'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Remarks</label><textarea class="ep-form-input ax-notes" id="caa-remarks">'+sbEsc(a.remarks)+'</textarea></div>');
}
/* D9: an illustrative payment needs only the amount and the date; it is labelled wherever it shows. */
function caSettleIllustrativeHTML(r,a){const max=caOutstanding(r);
  return '<div class="ep-form-group"><label class="ep-form-label">Amount settled <span class="req">*</span></label><div class="ax-currency"><span>'+r.currency+'</span><input class="ep-form-input" id="caa-amount" type="number" min="0" step="0.01" value="'+attrSafe(a.amount||(max?String(max):''))+'"></div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Payment date <span class="req">*</span></label>'+apCD('caa-date',a.date,'Select date')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Remarks</label><textarea class="ep-form-input ax-notes" id="caa-remarks">'+sbEsc(a.remarks)+'</textarea></div>';}
function caPayAction(kind,id){
  const err=kind==='resume'?caPayResume(id):'';
  if(err){showToast('Not saved','error',err);return;}
  renderADTPage();showToast('Payment resumed','success',expKey(caRec(id))+' · '+caRec(id).pay.status+'.');
}

/* ── Logs and the row menu: the same rules ─────────────────────────────── */
function caMoves(r){
  if(!r||!r.status)return [];
  const out=[];
  if(r.status==='Draft'){
    const me=caMe();
    if(caCanSubmit(r))out.push('Awaiting Approval');
    return out;
  }
  if(r.status==='Awaiting Approval'&&caCanDecide(r))out.push('Approved','Partially Approved','Rejected','Follow-Up');
  if(r.status==='Follow-Up'&&caCanRespond(r))out.push('Awaiting Approval');
  if(caCanWithdraw(r))out.push('Withdrawn');
  return out;
}
function caLineMoves(r,l){
  if(!r||!l||!caCanDecide(r))return [];
  const st=caActiveStage(r);const me=caMe();
  if(st.lineIds.indexOf(l.id)<0||caStageResult(st,l))return [];
  if(caStageDecided(st,me,l.id))return [];
  return ['Approved','Partially Approved','Rejected','Follow-Up'];
}
/* From Logs or the row menu: Submit / Resubmit / Approve / Reject / Follow-Up
   / Withdraw. Partial approval needs amounts, so it opens the Review popup. */
function caLogMove(id,to,comment){
  const r=caRec(id);if(!r)return;
  comment=String(comment||'').trim();
  let err='';
  if(to==='Awaiting Approval'&&r.status==='Draft'){
    if(!caCanSubmit(r)){showToast('Not permitted','error',caRole()+' cannot submit this claim.');return;}
    const pre=caPreflight(r);
    if(pre.error){showToast('Cannot submit','error',pre.error+(pre.dup||(pre.policy&&/justification/i.test(pre.error))?' Add it under Basic Details → Edit.':''));return;}
    caStart(r,pre);
    if(comment)caLog(r,'Awaiting Approval','Submitter\'s note: '+comment);
  }
  else if(to==='Awaiting Approval'&&r.status==='Follow-Up')err=caResubmit(id,comment);
  else if(['Approved','Rejected','Follow-Up'].indexOf(to)>=0&&caIsIntervention(r)&&caActiveStage(r).rule==='All'&&caActiveStage(r).approvers.length>1){
    caReviewOpen(id,{scope:'claim',decision:{'Approved':'Approve','Rejected':'Reject','Follow-Up':'Follow-Up'}[to],reason:to==='Approved'?'':comment,why:comment});return;}
  else if(to==='Approved')err=caDecide(id,{scope:'claim',decision:'Approve',comment:comment,why:comment});
  else if(to==='Rejected')err=caDecide(id,{scope:'claim',decision:'Reject',reason:comment,why:comment});
  else if(to==='Follow-Up')err=caDecide(id,{scope:'claim',decision:'Follow-Up',reason:comment,why:comment});
  else if(to==='Partially Approved'){caReviewOpen(id,{scope:'lines'});return;}
  else if(to==='Withdrawn'){caActOpen('withdraw',id,{reason:comment});return;}
  else err='That move is not available.';
  if(err){showToast('Not saved','error',err);return;}
  renderADTPage();
  const st=caActiveStage(r);
  showToast('Log added','success',expKey(r)+' is now '+r.status+(st&&r.status==='Awaiting Approval'?' · Stage '+st.n+' · '+(caNs(st.approvers)||'unassigned'):'')+'.');
}
function caLineLogMove(id,lineId,to,comment){
  const r=caRec(id);if(!r)return;
  const l=r.lines.find(function(x){return x.id===lineId;});
  comment=String(comment||'').trim();
  if(to==='Partially Approved'){caReviewOpen(id,{scope:'lines',lineId:lineId,lineDecision:'Partially Approve',reason:comment});return;}
  const map={'Approved':'Approve','Rejected':'Reject','Follow-Up':'Follow-Up'};
  if(!map[to]){showToast('Not saved','error','That move is not available.');return;}
  if(caIsIntervention(r)&&caActiveStage(r).rule==='All'&&caActiveStage(r).approvers.length>1){caReviewOpen(id,{scope:'lines',lineId:lineId,lineDecision:map[to],reason:comment,why:comment});return;}
  const lines={};lines[lineId]={decision:map[to],reason:comment};
  const err=caDecide(id,{scope:'lines',lines:lines,comment:to==='Approved'?comment:'',why:comment});
  if(err){showToast('Not saved','error',err);return;}
  renderADTPage();
  showToast('Line item updated','success','"'+l.title+'" - '+to+' recorded. '+expKey(r)+' is '+r.status+'.');
}

/* ── Workflow tab ──────────────────────────────────────────────────────── */
function caLogTitle(l){
  const a=l.action||'';
  if(/^Expense drafted|^Saved as draft/.test(a))return 'Expense Drafted';
  if(/^Submitted for approval/.test(a))return 'Submitted for Approval';
  let m=a.match(/^Stage (\d+) of \d+ \((.*?)\) assigned/);if(m)return 'Stage '+m[1]+' Assigned · '+m[2];
  m=a.match(/^Stage (\d+) complete\. Stage (\d+) of \d+ \((.*?)\) assigned/);if(m)return 'Stage '+m[2]+' Assigned · '+m[3];
  m=a.match(/^Stage (\d+) \((.*?)\) (approved|rejected)/);if(m)return 'Stage '+m[1]+' '+(m[3]==='approved'?'Approved':'Rejected');
  if(/^Follow-Up requested/.test(a))return 'Follow-Up Raised';
  if(/^Follow-Up answered/.test(a))return 'Follow-Up Answered';
  if(/^Material change|^Returned to Stage/.test(a))return 'Approval Resumed';
  if(/^Final approval/.test(a))return l.status;
  if(/^Claim rejected/.test(a))return 'Rejected';
  if(/^Withdrawn/.test(a))return 'Withdrawn';
  if(/reassigned to/.test(a))return 'Approval Reassigned';
  if(/overdue/.test(a))return 'SLA Escalation';
  if(/^Settlement/.test(a))return 'Settlement Recorded';
  if(/^Reimbursement|^Payment|^Funding/.test(a))return 'Reimbursement';
  return (typeof EXP_STEP_TITLE!=='undefined'&&EXP_STEP_TITLE[l.status])||l.status;
}
function caWorkflowRows(r){
  if(caKind(r)!=='expense'&&caExt(r)&&caExt(r).workflowRows)return caExt(r).workflowRows(r);
  const logs=expSeedLogs(r).filter(function(l){return !/partly decided by/.test(l.action||'');});
  const done=logs.map(function(l){return {title:caLogTitle(l),user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
  const steps=[];
  if(r.status==='Draft'){
    steps.push({title:'Submit for Approval',owner:r.name});
    const rt=caRoute(r);
    if(rt.wf)rt.wf.stages.filter(function(s){return s.active;}).forEach(function(s){steps.push({title:'Stage '+s.n+' · '+s.name,owner:caStageWho(s)});});
    steps.push({title:'Reimburse',owner:'Finance'});
  }else if(r.wf&&r.wf.open){
    if(r.status==='Follow-Up')steps.push({title:'Respond to Follow-Up',owner:r.submittedBy?caN(r.submittedBy):r.name});
    r.wf.stages.slice(r.wf.current).forEach(function(s,i){
      steps.push({title:'Stage '+s.n+' · '+s.name,owner:i===0&&s.approvers.length?caNs(s.approvers):caStageWho(s),note:i===0&&caDue(s)?'Due '+cdLabel(caDue(s)):''});
    });
    steps.push({title:'Reimburse',owner:'Finance'});
  }else if(r.pay&&['Ready for Payment','Processing','On Hold','Partially Paid','Failed','Cancelled'].indexOf(r.pay.status)>=0){
    steps.push({title:r.pay.status==='Processing'||r.pay.status==='Partially Paid'?'Record Settlement':'Process Payment',owner:'Finance'});
  }
  return wfPlan(done,steps);
}

/* ── Approval Settings: workflows ──────────────────────────────────────── */
function awfRows(){
  return caWorkflows.filter(function(w){
    if(w.entity!==caEntity()||awfKinds.indexOf(caWfKindOf(w))<0)return false;
    if(awfStatusF&&caWfShown(w)!==awfStatusF)return false;
    if(awfAppliesF&&w.appliesTo!==awfAppliesF)return false;
    return true;
  });
}
function awfApply(){awfQ=lpSearchValue('awf-f-q');const v=getCSValue('awf-f-applies');awfAppliesF=v&&v!=='All Levels'?v:'';awfSel=null;renderADTPage();}
function awfReset(){awfQ='';awfStatusF='';awfAppliesF='';awfSel=null;renderADTPage();}
function awfStat(s){awfStatusF=awfStatusF===s?'':s;awfSel=null;renderADTPage();}
let awfCfgEdit=false;
function awfCfgOpen(){if(!caCan(awfPermFor('manage'))){showToast('Not permitted','error',caRole()+' cannot change approval defaults.');return;}awfCfgEdit=true;renderADTPage();}
function awfCfgSave(){
  const sla=(document.getElementById('awf-cfg-sla')||{}).value,lab=document.getElementById('csw-awf-cfg-esc')?getCSValue('awf-cfg-esc'):'';
  const esc=!lab||lab==='Entity Super Admin'?'':idFromLabel(lab,caApproverPool());
  const err=caCfgSave(sla,esc);
  if(err){showToast('Not saved','error',err);return;}
  awfCfgEdit=false;renderADTPage();showToast('Approval defaults saved','success',caEntityName()+': '+caCfg().sla+' calendar days · escalation to '+(caCfg().escalation?caN(caCfg().escalation):'Entity Super Admin')+'.');
}
function awfCfgHTML(){
  const c=caCfg();let sa=caRoleUsers('Entity Super Admin');if(!sa.length)sa=caRoleUsers('Opendhi Super Admin');
  if(awfCfgEdit)return '<div class="csr-add ca-cfg"><div class="csr-add-hd"><span class="lp-sb-section-title">Entity defaults · '+sbEsc(caEntityName())+'</span></div><div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Approval SLA (calendar days) <span class="req">*</span></label><input class="ep-form-input" id="awf-cfg-sla" type="number" min="1" max="60" value="'+c.sla+'"><div class="ea-hint">Used by every stage that does not set its own. Paused while the employee answers a Follow-Up.</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Escalation authority</label>'+apCS('awf-cfg-esc',['Entity Super Admin'].concat(idLabels(caApproverPool())),c.escalation?idLabel(c.escalation,caApproverPool()):'Entity Super Admin','Entity Super Admin')+'<div class="ea-hint">Receives overdue approvals and may reassign them. Escalation never approves or rejects.</div></div>'
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="awfCfgEdit=false;renderADTPage()">Cancel</button><button class="ep-save-btn" onclick="awfCfgSave()">Save</button></div></div>';
  return '<div class="wb-note ca-cfg"><b>Entity defaults</b> · approval SLA <b>'+c.sla+' calendar days</b> · escalation to <b>'+sbEsc(c.escalation?caN(c.escalation):('Entity Super Admin'+(sa.length?' ('+caNs(sa)+')':'')))+'</b>'
    +(caCan(awfPermFor('manage'))?' <button class="att-link" style="margin-left:8px" onclick="awfCfgOpen()">Edit</button>':'')
    +(c.logs.length?'<div class="wb-note-sub">Last change: '+sbEsc(c.logs[0].date+' '+c.logs[0].time+' · '+c.logs[0].user+' · '+c.logs[0].action)+'</div>':'')+'</div>';
}
function awfListHTML(){
  const all=caWorkflows.filter(function(w){return w.entity===caEntity()&&awfKinds.indexOf(caWfKindOf(w))>=0;});
  const rows=lpSearchRows(awfRows(),awfQ);
  const exp=awfKinds[0]==='Expense';
  if(awfSel&&!rows.some(function(w){return w.id===awfSel;}))awfSel=null;
  const pgn=listPage('exp-awf',[awfQ,awfStatusF,awfAppliesF].join('|'),rows.map(function(w,i){
    return '<tr class="awf-row'+(awfSel===w.id?' lp-row-selected':'')+'" id="awf-row-'+w.id+'" style="cursor:pointer" onclick="awfOpen('+w.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(w.name)+'">'+sbEsc(w.name)+'</div><div class="lp-c-sub">'+caWfKey(w)+' · v'+w.version+'</div></td>'
      +(exp?'<td><div class="lp-c-plain">'+w.appliesTo+'</div><div class="lp-c-sub ax-c-trunc">'+sbEsc(caWfScope(w))+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+sbEsc(w.category==='All'?'All categories':w.category)+'</div>'+(w.subCat?'<div class="lp-c-sub">'+sbEsc(w.subCat)+'</div>':'')+'</td>'
      +'<td><div class="lp-c-plain exp-c-nw">'+sbEsc(caWfBand(w))+'</div></td>'
      /* Advance and imprest routes are named by the advance types that use them. */
      :'<td><div class="lp-c-plain">'+caWfKindOf(w)+'</div></td><td colspan="2"><div class="lp-c-plain ax-c-trunc">'+sbEsc(caWfUsedBy(w))+'</div></td>')
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(caStagePath(w.stages))+'">'+caActiveDefs(w).length+' stage'+(caActiveDefs(w).length===1?'':'s')+'</div><div class="lp-c-sub ax-c-trunc">'+sbEsc(caStagePath(w.stages))+'</div></td>'
      +'<td class="exp-c-nw"><div class="lp-c-plain">'+cdLabel(w.effFrom)+'</div><div class="lp-c-sub">'+(w.effTo?'to '+cdLabel(w.effTo):'Open-ended')+'</div></td>'
      +'<td>'+axBadge(statusTone(caWfShown(w)),caWfShown(w))+'</td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No approval workflow matches this filter.</td></tr>');
  const tiles=['Active','Scheduled','Draft','Inactive','Expired'];
  return '<div class="lp-page">'
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('awf-f-q',awfQ,'Search workflows','awfApply()')
    +apCS('awf-f-applies',CA_APPLIES,awfAppliesF,'All Levels')
    +clearFiltersBtn([awfQ,awfStatusF,awfAppliesF],'awfReset()')
    +'<button class="lp-pill-search" onclick="awfApply()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats exp-stats">'+tiles.map(function(s){return caStat(s,all.filter(function(w){return caWfShown(w)===s;}).length,awfStatusF===s,'awfStat(\''+s+'\')');}).join('')+'</div></div>'
    +(exp?awfCfgHTML():'<div class="wb-note">SLA and escalation follow the company approval defaults (Company Settings → Workflow).</div>')
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="awf-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th><th>Workflow</th>'+(exp?'<th>Applies To</th><th>Category</th><th>Amount Threshold</th>':'<th>Workflow Type</th><th colspan="2">Used By</th>')+'<th>Approval Levels</th><th>Effective</th><th>Status</th></tr></thead><tbody>'
    +pgn.rows+'</tbody></table>'+pgn.pager+'</div></div>'
    +'<div class="lp-split-sb'+(awfSel?' open':'')+'" id="awf-split-sb"><div class="lp-isb" id="awf-isb-inner">'+(awfSel?sbRender(awfRenderPanel,'awf'):'')+'</div></div></div>'
    +'</div>';
}
function awfOpen(id,tab){
  awfTab=tab||sbKeepTab(awfSel,awfTab);awfSel=id;
  const sb=document.getElementById('awf-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('awf',awfRenderPanel);
  document.querySelectorAll('.awf-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='awf-row-'+id);});
}
function awfClose(){awfSel=null;const sb=document.getElementById('awf-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.awf-row').forEach(function(r){r.classList.remove('lp-row-selected');});}
function awfNav(t){awfTab=t;isbTab('awf',awfRenderPanel);}
const AWF_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10"/><path d="M6 8l5 8"/><path d="M18 8l-5 8"/></svg>';
function awfSeedLogs(w){
  const p=String(w.createdAt).split(' | ');
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:caN(w.createdBy),status:'Draft',action:'Workflow created with '+w.stages.length+' stage(s).'}];
  if(w.activatedOn)fx.unshift({date:p[0],time:'10:00:00 AM',user:caN(w.createdBy),status:'Active',action:'Activated.'});
  return seedLogs(w,fx);
}
function awfConflicts(w,cand){
  cand=cand||w;
  const prio=caWfPriority(cand);
  if(caWfKindOf(cand)!=='Expense')return [];   // advance routes are named by type, so two never compete
  return caWorkflows.filter(function(q){
    if(q.id===w.id||q.status!=='Active'||q.entity!==cand.entity||caWfKindOf(q)!==caWfKindOf(cand))return false;
    if(caWfPriority(q)!==prio||q.appliesTo!==cand.appliesTo)return false;
    if(q.category!==cand.category||(q.subCat||'')!==(cand.subCat||''))return false;
    if((q.dept||'')!==(cand.dept||'')||(q.position||'')!==(cand.position||'')||(q.employeeEid||'')!==(cand.employeeEid||''))return false;
    if(!wbOverlap(cand.effFrom,cand.effTo,q.effFrom,q.effTo))return false;
    if(q.thrCur!==cand.thrCur&&(q.minAmt||q.maxAmt))return true;
    const a0=parseFloat(cand.minAmt)||0,a1=cand.maxAmt?parseFloat(cand.maxAmt):Infinity,b0=parseFloat(q.minAmt)||0,b1=q.maxAmt?parseFloat(q.maxAmt):Infinity;
    return a0<=b1&&b0<=a1;
  });
}
function awfIsDefault(w){return caWfKindOf(w)==='Expense'&&w.appliesTo==='Entity'&&w.category==='All'&&!w.subCat&&!w.minAmt&&!w.maxAmt;}
function awfRenderPanel(){
  const w=caWfRec(awfSel);if(!w)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'versions',label:'Versions'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
  const tabBar=axTabBar('awf',tabs,awfTab,'awfNav','awfClose');
  let body='';
  if(awfTab==='basic-details'){
    const conf=w.status!=='Active'?awfConflicts(w):[];
    body=sbHero({icon:AWF_ICO,name:sbEsc(w.name),meta:[caWfKey(w),'v'+w.version,w.entity],status:axBadge(statusTone(caWfShown(w)),caWfShown(w)),
        onEdit:caCan(awfPermFor('manage'))&&w.status!=='Inactive'?'awfStartEdit('+w.id+')':''})
      +(conf.length?'<div class="wb-note is-bad"><b>Conflict</b> · '+conf.map(function(c){return caWfKey(c)+' '+sbEsc(c.name);}).join(', ')+'<div class="wb-note-sub">Same entity, scope, category and priority with overlapping amount bands and dates. Narrow one of them before activating.</div></div>':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Workflow Name',sbEsc(w.name))
      +axField(AX_ICO.fBuild,'Entity',sbEsc(w.entity))
      +axField(AX_ICO.fUser,'Applies To',w.appliesTo+' <span class="ax-sub">'+sbEsc(caWfScope(w))+'</span>')
      +axField(AX_ICO.fBox,'Expense Category',sbEsc(w.category==='All'?'All categories':w.category)+(w.subCat?' <span class="ax-sub">'+sbEsc(w.subCat)+'</span>':''))
      +axField(AX_ICO.fCash,'Amount Threshold',sbEsc(caWfBand(w)))
      +axField(AX_ICO.fCal,'Effective Period',wbRange(w.effFrom,w.effTo))
      +axField(AX_ICO.fTag,'Routing Precedence',sbEsc(w.appliesTo+' · '+(w.subCat?'one sub category':w.category!=='All'?'one category':'all categories')+((w.minAmt||w.maxAmt)?' · amount band':'')))
      +axField(AX_ICO.fUser,'Created By',sbEsc(caN(w.createdBy)))
      +axField(AX_ICO.fTag,'Description',sbEsc(w.desc),true)
      +'</div><div class="wb-proj-h">Approval stages</div>'
      +w.stages.map(function(s){
        return '<div class="ca-stage'+(s.active?'':' is-void')+'"><div class="ca-stage-hd"><span class="exp-line-n">'+s.n+'</span><div class="exp-line-ttl"><div class="exp-line-name">'+sbEsc(s.name)+'</div>'
          +'<div class="exp-line-amt">'+sbEsc(caStageWho(s))+'</div></div>'+axBadge(s.active?'ok':'idle',s.active?'Active':'Off')+'</div>'
          +'<div class="ca-stage-meta"><span>SLA <b>'+caStageSla(s)+' calendar days</b>'+(s.sla?'':' (entity default)')+'</span><span>Fallback <b>'+sbEsc(s.fallback?caN(s.fallback):'—')+'</b></span><span>Escalation <b>'+sbEsc(s.escalation?caN(s.escalation):'entity escalation authority')+'</b></span><span>Comment <b>'+sbEsc(s.comment)+'</b></span></div></div>';
      }).join('');
  }else if(awfTab==='versions'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Versions</span></div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>When</th><th>By</th><th>Stages</th><th>Reason</th></tr></thead><tbody>'
      +w.versions.slice().reverse().map(function(v){return '<tr><td class="csag-td">v'+v.v+(v.v===w.version?' <span class="wb-muted">current</span>':'')+'</td><td class="csag-td">'+sbEsc(v.at)+'</td><td class="csag-td">'+sbEsc(caN(v.by))+'</td>'
        +'<td class="csag-td" style="white-space:normal">'+sbEsc(caStagePath(v.stages))+'</td><td class="csag-td" style="white-space:normal">'+sbEsc(v.reason||'')+'</td></tr>';}).join('')
      +'</tbody></table></div><div class="wb-note">Editing creates a new version for new claims. Claims in approval keep theirs unless a material change re-routes them.</div>';
  }else if(awfTab==='logs'){
    const moves=!caCan(awfPermFor('activate'))?[]:w.status==='Active'?['Inactive']:['Active'];
    body=lpLogsView(awfSeedLogs(w),'<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+caWfShown(w)+'</div>'
      +'<p class="lp-logs-form-sub">Activate or deactivate this workflow and say why</p>'
      +lpLogStatusField('awf-log-status-sel',w.status,[w.status].concat(moves))
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div><textarea class="lp-logs-form-textarea" id="awf-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="awfNav(\'logs\')">Cancel</button><button class="lp-logs-save-btn" style="flex:1" onclick="awfSaveLog('+w.id+')">Submit</button></div></div>',
      {labels:{'Active':'Activate','Inactive':'Deactivate'}});
  }else body=sbHistoryHTML(w);
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function awfCanActivate(w){
  if(!caActiveDefs(w).length)return 'The workflow has no active stage.';
  const conf=awfConflicts(w);
  if(conf.length)return 'Conflicts with '+conf.map(function(c){return caWfKey(c)+' '+c.name;}).join(', ')+'.';
  return '';
}
function awfSaveLog(id){
  const w=caWfRec(id);if(!w)return;
  if(!caCan(awfPermFor('activate'))){showToast('Not permitted','error',caRole()+' cannot activate or deactivate approval workflows.');return;}
  const to=getCSValue('awf-log-status-sel');
  if(to==='Active'&&w.status!=='Active'){const e=awfCanActivate(w);if(e){showToast('Cannot activate','error',e);return;}}
  if(to==='Inactive'&&w.status==='Active'&&awfIsDefault(w)&&!caWorkflows.some(function(q){return q!==w&&q.status==='Active'&&q.entity===w.entity&&awfIsDefault(q);})){
    showToast('Cannot deactivate','error','This is the only default route for '+w.entity+'. Unmatched claims would have no approval path. Activate another default first.');return;}
  awfSeedLogs(w);
  const s=stampNow();
  const sel=getCSValue('awf-log-status-sel'),inp=document.getElementById('awf-log-comment-inp');
  const c=inp?inp.value.trim():'';
  if(!sel||sel===w.status){showToast('Pick the new status','error');return;}
  if(!c){showToast('A comment is required','error');return;}
  w.logs.unshift({date:s.date,time:s.time,user:caN(caMe()),userId:caMe(),status:sel,action:c});
  w.status=sel;if(sel==='Active')w.activatedOn=w.activatedOn||wbToday();
  renderADTPage();showToast('Workflow '+(sel==='Active'?'activated':'deactivated'),'success',caWfKey(w)+' is now '+caWfShown(w)+'.');
}

/* Add / edit popup */
function awfBlankStage(n){return {name:'',type:'',ref:'',rule:'Any One',fallback:'',sla:'',escalation:'',comment:CA_COMMENT_RULES[0],active:true,n:n};}
function awfStartAdd(kind){
  if(!caCan(awfPermFor('manage'))){showToast('Not permitted','error',caRole()+' cannot configure approval workflows.');return;}
  awfModal={id:null,kind:kind||awfKinds[0],name:'',category:'All',subCat:'',appliesTo:'Entity',dept:'',position:'',employeeEid:'',minAmt:'',maxAmt:'',thrCur:'INR',effFrom:wbToday(),effTo:'',desc:'',reason:'',
    stages:[Object.assign(awfBlankStage(1),{name:'Manager review',type:'Reporting Manager'}),Object.assign(awfBlankStage(2),{name:'Finance review',type:'Role',ref:'Finance/Billing Admin'})]};
  /* A workflow type may suggest its own starting stages (Funding & Budgets). */
  if(CA_WF_INFO[awfModal.kind]&&CA_WF_INFO[awfModal.kind].stages)awfModal.stages=CA_WF_INFO[awfModal.kind].stages();
  renderADTPage();
}
function awfStartEdit(id){
  const w=caWfRec(id);if(!w)return;
  if(!caCan(awfPermFor('manage'))){showToast('Not permitted','error',caRole()+' cannot configure approval workflows.');return;}
  awfModal=JSON.parse(JSON.stringify({id:w.id,kind:caWfKindOf(w),name:w.name,category:w.category,subCat:w.subCat,appliesTo:w.appliesTo,dept:w.dept,position:w.position,employeeEid:w.employeeEid,
    minAmt:w.minAmt,maxAmt:w.maxAmt,thrCur:w.thrCur,effFrom:w.effFrom,effTo:w.effTo,desc:w.desc,reason:'',stages:w.stages}));
  awfModal.stages.forEach(function(s){s.sla=s.sla?String(s.sla):'';});
  renderADTPage();
}
function awfClose2(){awfModal=null;renderADTPage();}
function awfSync(){
  const d=awfModal;if(!d)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value.trim():null;};
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  [['name','awf-name'],['minAmt','awf-min'],['maxAmt','awf-max'],['effFrom','awf-from'],['effTo','awf-to'],['desc','awf-desc'],['reason','awf-reason']].forEach(function(p){const x=v(p[1]);if(x!=null)d[p[0]]=x;});
  [['category','awf-cat'],['subCat','awf-sub'],['appliesTo','awf-applies'],['dept','awf-dept'],['position','awf-pos'],['thrCur','awf-cur']].forEach(function(p){const x=cs(p[1]);if(x!=null)d[p[0]]=x;});
  const emps=expPeople().map(function(p){return p.eid;}),pool=caApproverPool(awfKindNow().toLowerCase());
  const em=cs('awf-emp');if(em!=null)d.employeeEid=expPersonFromLabel(em,emps);
  const kd=cs('awf-kind');if(kd)d.kind=kd;
  d.stages.forEach(function(s,i){
    const pre='awf-s'+i+'-';
    const nm=v(pre+'name');if(nm!=null)s.name=nm;
    const sla=v(pre+'sla');if(sla!=null)s.sla=sla;
    ['type','rule','comment'].forEach(function(k){const x=cs(pre+k);if(x!=null)s[k]=x;});
    /* Pickers show names; the stage keeps account and team IDs. */
    const ref=cs(pre+'ref');
    if(ref!=null)s.ref=s.type==='Specific User'?idFromLabel(ref,pool):s.type==='RBAC Team'?String((caTeams().find(function(t){return t.name===ref;})||{}).id||''):ref;
    ['fallback','escalation'].forEach(function(k){const x=cs(pre+k);if(x!=null)s[k]=idFromLabel(x,pool);});
    const a=document.getElementById(pre+'act');if(a)s.active=a.checked;
  });
}
function awfHook(){
  const d=awfModal;const was={cat:d.category,applies:d.appliesTo,types:d.stages.map(function(s){return s.type;})};
  awfSync();
  if(d.category!==was.cat)d.subCat='';
  if(d.appliesTo!==was.applies){d.dept='';d.position='';d.employeeEid='';}
  d.stages.forEach(function(s,i){if(s.type!==was.types[i]){s.ref='';s.rule='Any One';}});
  renderADTPage();
}
function awfAddStage(){awfSync();if(awfModal.stages.length>=CA_MAX_STAGES){showToast('Up to '+CA_MAX_STAGES+' stages','info');return;}awfModal.stages.push(awfBlankStage(awfModal.stages.length+1));renderADTPage();}
function awfRemoveStage(i){awfSync();if(awfModal.stages.length<=1){showToast('A workflow needs at least one stage','error');return;}awfModal.stages.splice(i,1);renderADTPage();}
function awfModalHTML(){
  const d=awfModal,w=d.id!=null?caWfRec(d.id):null;
  const live=w&&w.status==='Active';
  const sel=function(id,label,opts,val,ph,req,hook,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+apCS(id,opts,val,ph,hook)+'</div>';};
  const pool=caApproverPool(awfKindNow().toLowerCase());
  const deptOn=d.appliesTo==='Department'||d.appliesTo==='Position',posOn=d.appliesTo==='Position',empOn=d.appliesTo==='Employee';
  const band=!!(d.minAmt||d.maxAmt);
  let html='<div class="ep-form-group ep-form-full"><label class="ep-form-label">Workflow Name <span class="req">*</span></label><input class="ep-form-input" id="awf-name" value="'+attrSafe(d.name)+'" placeholder="e.g. Sales travel above 25,000"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Entity</label><input class="ep-form-input ca-ro" readonly value="'+attrSafe(caEntityName())+'"></div>'
    +((d.kind||'Expense')!=='Expense'
      ?'<div class="ep-form-group"><label class="ep-form-label">Workflow Type <span class="req">*</span></label>'+(d.id==null?apCS('awf-kind',awfKinds,d.kind,'Select','awfHook'):'<input class="ep-form-input ca-ro" readonly value="'+d.kind+'">')
        +'<div class="ea-hint">'+((CA_WF_INFO[d.kind]||{}).hint||(d.kind==='Imprest'?'Imprest initial funding and replenishment requests.':'Advance requests of the types that name this route.'))+'</div></div>'
      :''
      +sel('awf-cat','Expense Category',['All'].concat(EXP_CATEGORIES),d.category,'Select',true,'awfHook')
      +(d.category!=='All'?sel('awf-sub','Expense Subcategory',EXP_SUBCATS[d.category]||[],d.subCat,'Whole category'):'<div class="ep-form-group exp-dim"><label class="ep-form-label">Expense Subcategory</label>'+apCS('awf-sub',[],'','Pick a category first')+'</div>')
      +sel('awf-applies','Applies To',CA_APPLIES,d.appliesTo,'Select',true,'awfHook')
      +(deptOn?sel('awf-dept','Department',capDepts(),d.dept,d.appliesTo==='Position'?'Every department':'Select Department',d.appliesTo==='Department'):'')
      +(posOn?'<div class="ep-form-group"><label class="ep-form-label">Designation / Position <span class="req">*</span></label>'+axCS('awf-pos',capPositions(),d.position,'Search Position')+'</div>':'')
      +(empOn?'<div class="ep-form-group"><label class="ep-form-label">Employee <span class="req">*</span></label>'+(function(){const emps=expPeople().map(function(p){return p.eid;});return axCS('awf-emp',emps.map(function(e){return expPersonLabel(e,emps);}),d.employeeEid?expPersonLabel(d.employeeEid,emps):'','Search Employee');})()+'</div>':'')
      +'<div class="ep-form-group"><label class="ep-form-label">Minimum Amount</label><input class="ep-form-input" id="awf-min" type="number" min="0" value="'+attrSafe(d.minAmt)+'" placeholder="No minimum"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Maximum Amount</label><input class="ep-form-input" id="awf-max" type="number" min="0" value="'+attrSafe(d.maxAmt)+'" placeholder="No maximum"></div>'
      +sel('awf-cur','Threshold Currency',capCurrencies(),d.thrCur,'Select',band))
    +'<div class="ep-form-group"><label class="ep-form-label">Effective From <span class="req">*</span></label>'+apCD('awf-from',d.effFrom,'Select date')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Effective To</label>'+apCD('awf-to',d.effTo,'Open-ended')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Description</label><textarea class="ep-form-input ax-notes" id="awf-desc">'+sbEsc(d.desc||'')+'</textarea></div>'
    +'<div class="ep-form-group ep-form-full"><div class="exp-modal-sec" style="margin:6px 0 0">Approval stages (1 to '+CA_MAX_STAGES+', in order)</div></div>';
  d.stages.forEach(function(s,i){
    const pre='awf-s'+i+'-';
    let ref='';
    if(s.type==='Role')ref=sel(pre+'ref','Role',caApproverRoles(awfKindNow().toLowerCase()),s.ref,'Select Role',true,'awfHook');
    else if(s.type==='Specific User')ref='<div class="ep-form-group"><label class="ep-form-label">User <span class="req">*</span></label>'+axCS(pre+'ref',idLabels(pool),s.ref?idLabel(s.ref,pool):'','Search User')+'</div>';
    else if(s.type==='RBAC Team'){const tn=caTeamIds(awfKindNow().toLowerCase()).map(caTeamName);ref=sel(pre+'ref','RBAC Team',tn,s.ref?caTeamName(s.ref):'',tn.length?'Select Team':'No approval team in this entity',true,'awfHook');}
    else ref='<div class="ep-form-group"><label class="ep-form-label">Approver Reference</label><input class="ep-form-input ca-ro" readonly value="'+(s.type==='Reporting Manager'?'From the employee record':s.type&&!caApproverNeedsRef(s.type)?'From the '+((CA_WF_INFO[awfKindNow()]||{}).noun||'request')+' record':'Pick an approver type')+'"></div>';
    const multi=s.type==='Role'||s.type==='RBAC Team';
    html+='<div class="ep-form-group ep-form-full"><div class="ca-stage-form"><div class="ca-stage-hd"><span class="exp-line-n">'+(i+1)+'</span><div class="exp-line-ttl"><div class="exp-line-name">Stage '+(i+1)+'</div></div>'
      +'<label class="ca-chk"><input type="checkbox" id="'+pre+'act"'+(s.active!==false?' checked':'')+'> Stage active</label>'
      +(d.stages.length>1?'<button type="button" class="att-row-btn is-danger" onclick="awfRemoveStage('+i+')" title="Remove stage">'+AX_ICO.trash+'</button>':'')+'</div>'
      +'<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Stage Name <span class="req">*</span></label><input class="ep-form-input" id="'+pre+'name" value="'+attrSafe(s.name)+'" placeholder="e.g. Manager review"></div>'
      +sel(pre+'type','Approver Type',caApproverTypes(awfKindNow().toLowerCase()),s.type,'Select',true,'awfHook')
      +ref
      +(multi?sel(pre+'rule','Decision Rule',CA_RULES,s.rule,'Select',true):'<div class="ep-form-group exp-dim"><label class="ep-form-label">Decision Rule</label>'+apCS(pre+'rule',['Any One'],'Any One','Any One')+'<div class="ea-hint">One approver at this stage.</div></div>')
      +'<div class="ep-form-group"><label class="ep-form-label">Fallback Approver</label>'+axCS(pre+'fallback',idLabels(pool),s.fallback?idLabel(s.fallback,pool):'','Search User')+'<div class="ea-hint">Used when nobody eligible resolves (inactive, missing, or the claimant).</div></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Approval SLA (calendar days)</label><input class="ep-form-input" id="'+pre+'sla" type="number" min="1" value="'+attrSafe(s.sla)+'" placeholder="Entity default ('+caCfg().sla+')"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Escalation Target</label>'+axCS(pre+'escalation',idLabels(pool),s.escalation?idLabel(s.escalation,pool):'','Entity escalation authority')+'</div>'
      +sel(pre+'comment','Comment Requirement',CA_COMMENT_RULES,s.comment,'Select',true)
      +'</div></div></div>';
  });
  html+='<div class="ep-form-group ep-form-full"><button type="button" class="btn-outline exp-add-line" onclick="awfAddStage()"'+(d.stages.length>=CA_MAX_STAGES?' disabled':'')+'>'+AX_ICO.plus+' Add Stage</button></div>';
  if(live)html+='<div class="ep-form-group ep-form-full"><label class="ep-form-label">Reason for the change <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="awf-reason" placeholder="Saved as version '+(w.version+1)+'">'+sbEsc(d.reason||'')+'</textarea></div>';
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(w?'Edit '+caWfKey(w):'Add Approval Workflow')+'</span><button class="ct-modal-close" onclick="awfClose2()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+(live?'This workflow is active: saving creates version '+(w.version+1)+' for claims submitted from now on.':'Who approves which claims, in what order. Default: the reporting manager, then Finance.')+' Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid" id="awf-m-grid">'+html+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="awfClose2()">Cancel</button>'
    +(w?'<button class="ep-save-btn" onclick="awfSave(false)">'+(live?'Save as Version '+(w.version+1):'Save')+'</button>'
      :'<button class="btn-outline" onclick="awfSave(false)">Save as Draft</button><button class="ep-save-btn" onclick="awfSave(true)">Save &amp; Activate</button>')
    +'</div></div></div></div>';
}
function awfCheck(d){
  if(!d.name)return 'Workflow Name is required.';
  /* Advance and imprest routes are chosen by their type: no category or band. */
  if((d.kind||'Expense')!=='Expense'){d.category='All';d.subCat='';d.appliesTo='Entity';d.dept='';d.position='';d.employeeEid='';d.minAmt='';d.maxAmt='';}
  if(!d.category)return 'Expense Category is required.';
  if(!d.appliesTo)return 'Applies To is required.';
  if(d.appliesTo==='Department'&&!d.dept)return 'Department is required.';
  if(d.appliesTo==='Position'&&!d.position)return 'Designation / Position is required.';
  if(d.appliesTo==='Employee'&&!d.employeeEid)return 'Employee is required.';
  if(d.appliesTo==='Entity'){d.dept='';d.position='';d.employeeEid='';}
  if(d.appliesTo==='Department'){d.position='';d.employeeEid='';}
  if(d.appliesTo==='Position')d.employeeEid='';
  if(d.appliesTo==='Employee'){d.dept='';d.position='';}
  if(d.category==='All')d.subCat='';
  const mn=d.minAmt===''?null:parseFloat(d.minAmt),mx=d.maxAmt===''?null:parseFloat(d.maxAmt);
  if(mn!=null&&(isNaN(mn)||mn<0))return 'Minimum Amount must be 0 or more.';
  if(mx!=null&&(isNaN(mx)||mx<=0))return 'Maximum Amount must be more than 0.';
  if(mn!=null&&mx!=null&&mn>mx)return 'Minimum Amount cannot exceed Maximum Amount.';
  if((mn!=null||mx!=null)&&!d.thrCur)return 'Threshold Currency is required with an amount band.';
  if(!d.effFrom)return 'Effective From is required.';
  if(d.effTo&&d.effTo<d.effFrom)return 'Effective To cannot be before Effective From.';
  if(!d.stages.length||d.stages.length>CA_MAX_STAGES)return 'A workflow has 1 to '+CA_MAX_STAGES+' stages.';
  if(!d.stages.some(function(s){return s.active!==false;}))return 'At least one stage must be active.';
  const kind=(d.kind||'Expense').toLowerCase();
  const pool=caApproverPool(kind);
  for(let i=0;i<d.stages.length;i++){
    const s=d.stages[i],n='Stage '+(i+1)+': ';
    if(!s.name)return n+'Stage Name is required.';
    if(!s.type)return n+'Approver Type is required.';
    if(caApproverNeedsRef(s.type)&&!s.ref)return n+(s.type==='Role'?'Role':s.type==='RBAC Team'?'RBAC Team':'User')+' is required.';
    if(s.type==='Specific User'&&pool.indexOf(s.ref)<0)return n+caN(s.ref)+' does not hold expense approval.';
    if(s.type==='Role'&&!caRoleUsers(s.ref).length)return n+'nobody active holds '+s.ref+' in Company Settings → Roles & Access.';
    if(s.type==='RBAC Team'&&!caTeamApprovers(s.ref,kind).length)return n+'team '+caTeamName(s.ref)+' has no member with expense approval.';
    if(!caApproverNeedsRef(s.type)||s.type==='Specific User')s.rule='Any One';
    if(String(s.sla||'').trim()===''){s.sla='';}
    else{const sla=parseInt(s.sla,10);if(isNaN(sla)||sla<1||sla>60)return n+'SLA must be 1 to 60 calendar days, or empty for the entity default.';s.sla=sla;}
    if(s.fallback&&pool.indexOf(s.fallback)<0)return n+'the fallback approver must hold expense approval.';
    if(s.escalation&&pool.indexOf(s.escalation)<0)return n+'the escalation target must hold expense approval.';
    s.n=i+1;s.active=s.active!==false;
  }
  return '';
}
function awfSave(activate){
  if(!caCan(awfPermFor('manage'))){showToast('Not permitted','error',caRole()+' cannot configure approval workflows.');return;}
  awfSync();
  const d=awfModal;
  const err=awfCheck(d);if(err){showToast('Check the workflow','error',err);return;}
  const s=stampNow(),at=s.date+' | '+s.time,who=caMe();
  const fields={kind:d.kind||'Expense',name:d.name,category:d.category,subCat:d.subCat||'',appliesTo:d.appliesTo,dept:d.dept||'',position:d.position||'',employeeEid:d.employeeEid||'',
    minAmt:d.minAmt||'',maxAmt:d.maxAmt||'',thrCur:d.thrCur||'INR',effFrom:d.effFrom,effTo:d.effTo||'',desc:d.desc||''};
  const stages=d.stages.map(function(x){return caStageDef(x.n,x.name,x.type,x.ref,{rule:x.rule,fallback:x.fallback,sla:x.sla,escalation:x.escalation,comment:x.comment,active:x.active});});
  if(d.id==null){
    const w=Object.assign({id:caWfNext,key:caWfNext,entity:caEntity(),status:'Draft',createdBy:who,createdAt:at,version:1},fields);caWfNext++;
    w.stages=stages;w.versions=[{v:1,at:at,by:who,reason:'Created',stages:JSON.parse(JSON.stringify(stages))}];
    w.logs=[{date:s.date,time:s.time,user:caN(who),userId:who,status:'Draft',action:'Workflow created: '+caStagePath(stages)+'.'}];
    caWorkflows.unshift(w);
    let note='Saved as draft.';
    if(activate){
      if(!caCan(awfPermFor('activate')))note='Saved as draft - '+caRole()+' cannot activate.';
      else{const e=awfCanActivate(w);if(e)note='Saved as draft - '+e;else{w.status='Active';w.activatedOn=wbToday();w.logs.unshift({date:s.date,time:s.time,user:caN(who),userId:who,status:'Active',action:'Activated on creation.'});note='Active from '+cdLabel(w.effFrom)+'.';}}
    }
    awfModal=null;awfSel=w.id;awfTab='basic-details';renderADTPage();
    showToast('Workflow saved','success',caWfKey(w)+' · '+note);
    return;
  }
  const w=caWfRec(d.id);
  if(w.status==='Active'){
    if(!d.reason){showToast('Check the workflow','error','Reason for the change is required for a new version.');return;}
    const cand=Object.assign({},w,fields);const conf=awfConflicts(w,cand);
    if(conf.length){showToast('Policy conflict','error','Conflicts with '+conf.map(function(c){return caWfKey(c);}).join(', ')+'.');return;}
    if(awfIsDefault(w)&&!awfIsDefault(cand)&&!caWorkflows.some(function(q){return q!==w&&q.status==='Active'&&q.entity===w.entity&&awfIsDefault(q);})){
      showToast('Cannot narrow the only default route','error','Unmatched claims would have no approval path.');return;}
    Object.assign(w,fields);w.stages=stages;w.version++;
    w.versions.push({v:w.version,at:at,by:who,reason:d.reason,stages:JSON.parse(JSON.stringify(stages))});
    awfSeedLogs(w);w.logs.unshift({date:s.date,time:s.time,user:caN(who),userId:who,status:'Active',action:'Version '+w.version+': '+d.reason+' Stages: '+caStagePath(stages)+'.'});
  }else{
    Object.assign(w,fields);w.stages=stages;w.versions[w.versions.length-1].stages=JSON.parse(JSON.stringify(stages));
    awfSeedLogs(w);w.logs.unshift({date:s.date,time:s.time,user:caN(who),userId:who,status:w.status,action:'Workflow edited: '+caStagePath(stages)+'.'});
  }
  awfModal=null;renderADTPage();
  showToast('Workflow saved','success',caWfKey(w)+' v'+w.version+'.');
}
