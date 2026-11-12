/* ══ EXPENSES & ADVANCES ═════════════════════════════════════════════════
   One module for money an employee claims back and money the company gives
   before it is spent. Screens and navigation only: every record, rule,
   approval, payment, disbursement and settlement is the existing engine's
   (js/expense-approvals.js, js/advances.js), unchanged.

   - All Requests: expense claims, advance requests and imprest requests in
     one list. Each row opens its existing panel on the same page.
   - My Approvals: the shared approval queue (every request type).
   - Imprest Funds, Settlements, Reimbursement Queue, Reports and Settings
     open from authorized actions, each with a way back to All Requests.
     The operational views keep their own route ('advances') internally, so
     old links and their records still open in place.
   - Approval routes for expenses, advances and imprest: Company Settings →
     Workflow. Decisions stay in My Approvals.
   Loaded after renderer.js: it re-points globals the renderer calls. */

let eaQ='',eaTypeF='',eaApprF='',eaPayF='',eaSetF='',eaWhoF='',eaFrom='',eaTo='',eaCatF='',eaDeptF='';
let eaWfKind='Expense';
let eaMenuWasOpen=false,eaManageWasOpen=false;
const EA_TYPES=['Expense Claim','Advance Request','Imprest Request'];
const EA_NA='Not Applicable';
const EA_HOSTED=['imprest','settlements','reports','settings'];   // views on the internal 'advances' route
const EA_ICO={
  back:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  chev:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-left:4px"><polyline points="6 9 12 15 18 9"/></svg>',
  menu:'<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>',
  exp:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  adv:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>',
  imp:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>'
};

/* ── Navigation ────────────────────────────────────────────────────────── */
(function(){
  sidebarItems.forEach(function(g){
    if(!g.children)return;
    g.children=g.children.filter(function(c){return c.id!=='advances';});
    g.children.forEach(function(c){if(c.id==='expenses')c.label='Expenses & Advances';});
  });
  ['expenses','advances'].forEach(function(k){const m=supportPageMeta[k];if(m){m.title='Expenses & Advances';if(m.context)m.context='Expenses & Advances';}});
  /* People who hold only advance or imprest rights reach the module too. */
  const add=function(map,k,codes){if(!map[k])return;codes.forEach(function(c){if(map[k].indexOf(c)<0)map[k].push(c);});};
  add(APP_PAGE_PERMS,'expenses',['advance.view.own','advance.view.team','advance.view.all','advance.imprest.manage']);
  add(APP_ADD_PERMS,'expenses',['advance.create','advance.create.others','advance.imprest.manage']);
  /* Approval routes now live in Company Settings → Workflow. */
  add(APP_PAGE_PERMS,'settings',['expense.approval.config.view','advance.settings.manage']);
})();
const eaActive0=getSidebarActivePage;
getSidebarActivePage=function(pg){return pg==='advances'?'expenses':eaActive0(pg);};
function eaAdvViews(){return typeof advPageTabs==='function'?advPageTabs().filter(function(t){return t.id!=='advances';}):[];}
const eaNav0=navigatePage;
navigatePage=function(pg,fromDashboard){
  /* Old Advances & Imprest links: the advance list is part of All Requests. */
  if(pg==='advances'&&(advPageTab==='advances'||!eaAdvViews().some(function(v){return v.id===advPageTab;}))){
    eaFromAdvList();if(expPageTab!=='queue')expPageTab='all';pg='expenses';
  }
  return eaNav0.call(this,pg,fromDashboard);
};
/* Filters set for the old advance list carry over to All Requests. */
function eaFromAdvList(){
  if(advQ||advTypeF||advStatusF||advDisbF||advSetF){
    eaResetVals();eaTypeF='Advance Request';eaQ=advQ;eaCatF=advTypeF;eaApprF=advStatusF;eaPayF=advDisbF;eaSetF=advSetF;
    advQ='';advTypeF='';advStatusF='';advDisbF='';advSetF='';
  }
  advPageTab='advances';
}
const eaRender0=renderADTPage;
renderADTPage=function(){
  /* An operational view this person may not open falls back to the list. */
  if(EA_HOSTED.indexOf(advPageTab)>=0&&!eaAdvViews().some(function(v){return v.id===advPageTab;})){advPageTab='advances';advSel=null;impReqSel=null;}
  if(page==='advances'&&advPageTab==='advances'){eaFromAdvList();page='expenses';if(expPageTab!=='queue'&&expPageTab!=='reimb')expPageTab='all';}
  const out=eaRender0.apply(this,arguments);
  if(page==='expenses'){const b=document.getElementById('tb-page-add-btn');if(b&&b.style.display!=='none')b.onclick=eaPlusClick;}
  return out;
};

/* Move between views. All Requests, My Approvals and the Reimbursement Queue
   are on the page itself; the operational views are on the internal route. */
function eaGo(v){
  if(EA_HOSTED.indexOf(v)>=0){advSetPageTab(v);return;}
  if(advSel!=null&&sbLeaveGuard('adv',function(){eaGo(v);}))return;
  if(expSelectedId!=null&&expPageTab!==v&&sbLeaveGuard('exp',function(){eaGo(v);}))return;
  advCloseForms();advSel=null;impReqSel=null;advPageTab='advances';
  if(expPageTab!==v||page!=='expenses'){expDropEdit();expModalOpen=false;expSelectedId=null;awfSel=null;}
  expPageTab=v;
  if(page!=='expenses')eaNav0('expenses');else renderADTPage();
}
expSetPageTab=function(t){
  if(t==='settings'){eaGoWorkflows('Expense');return;}
  if(page==='expenses'&&expPageTab===t&&advSel==null)return;
  eaGo(t);
};
advSetPageTab=function(t){
  if(t==='advances'){eaGo('all');return;}
  if(page==='advances'&&advPageTab===t)return;
  if(advSel!=null&&sbLeaveGuard('adv',function(){advSetPageTab(t);}))return;
  if(page==='expenses'&&expSelectedId!=null&&sbLeaveGuard('exp',function(){advSetPageTab(t);}))return;
  advCloseForms();advSel=null;impReqSel=null;awfSel=null;advPageTab=t;
  if(page==='expenses'){expDropEdit();expSelectedId=null;expModalOpen=false;caRev=null;caAct=null;}
  if(page!=='advances')eaNav0('advances');else renderADTPage();
};

/* ── Page tabs ─────────────────────────────────────────────────────────── */
expPageTabs=function(){
  const t=[{id:'all',label:'All Requests'}];
  const q=caQueue(false).length;
  if(caCan('expense.approval.queue')||q)t.push({id:'queue',label:'My Approvals'+(q?' ('+q+')':'')});
  return t;
};
/* The actions beside the tabs: only what this person may open. */
function eaActions(){
  const a=[],v=eaAdvViews().map(function(x){return x.id;});
  if(v.indexOf('imprest')>=0)a.push(['Imprest Funds',"eaGo('imprest')"]);
  if(v.indexOf('settlements')>=0)a.push(['Settlements',"eaGo('settlements')"]);
  if(caCan('expense.reimb.view.all'))a.push(['Reimbursement Queue',"eaGo('reimb')"]);
  if(v.indexOf('reports')>=0)a.push(['Reports',"eaGo('reports')"]);
  if(v.indexOf('settings')>=0)a.push(['Settings',"eaGo('settings')"]);
  if(eaWfKinds().length)a.push(['Approval Workflows',"eaGoWorkflows('')"]);
  return a;
}
function eaManageClick(){
  const btn=document.getElementById('ea-manage-btn');if(!btn)return;
  let m=document.getElementById('ea-manage-menu');
  if(!m){const w=document.createElement('div');w.className='ct-action-wrap';w.innerHTML='<div class="ct-action-menu" id="ea-manage-menu" role="menu"></div>';document.body.appendChild(w);m=w.firstChild;}
  if(eaManageWasOpen){eaManageWasOpen=false;m.classList.remove('open');return;}
  m.innerHTML=eaActions().map(function(x,i){return '<div class="ct-act-item" role="menuitem" onclick="eaManagePick('+i+')"><span>'+x[0]+'</span></div>';}).join('');
  document.querySelectorAll('.ct-action-menu.open').forEach(function(x){x.classList.remove('open');});
  m.classList.add('open');
  placeAnchoredMenu(m,btn.getBoundingClientRect(),{alignLeft:false});
}
function eaManagePick(i){
  const m=document.getElementById('ea-manage-menu');if(m)m.classList.remove('open');
  eaManageWasOpen=false;const x=eaActions()[i];if(x)(new Function(x[1]))();
}
function eaSubHead(label){
  return '<div style="display:flex;align-items:center;gap:12px;margin:0 0 14px">'
    +'<button class="ep-back" style="margin:0" onclick="eaGo(\'all\')">'+EA_ICO.back+' All Requests</button>'
    +'<span class="lp-sb-section-title">'+label+'</span></div>';
}
function eaModalsHTML(){
  return (expModalOpen&&expDraft&&expDraft.line?buildAddExpenseModalHTML():'')
    +(advForm?advFormHTML():'')+(impForm?impFormHTML():'')+(advTypeForm?advTypeFormHTML():'')+(advPolForm?advPolFormHTML():'')+(advAct?advActHTML():'')
    +(caRev?caReviewHTML():'')+(caAct?caActHTML():'')+(awfModal?awfModalHTML():'')
    +(typeof bgAct!=='undefined'&&bgAct&&bgAct.host===page&&typeof bgActHTML==='function'?bgActHTML():'')
    +(typeof ccMxAct!=='undefined'&&ccMxAct&&typeof ccMxHTML==='function'?ccMxHTML():'');
}
buildExpensesHTML=function(){
  caTick();if(typeof advTick==='function')advTick();
  awfKinds=['Expense'];
  if(expSelectedId!=null&&advSel!=null){advSel=null;impReqSel=null;}
  if(expPageTab==='reimb'&&caCan('expense.reimb.view.all'))
    return '<div class="mod-page">'+eaSubHead('Reimbursement Queue')+caReimbListHTML()+'</div>'+eaModalsHTML();
  const tabs=expPageTabs();
  if(!tabs.some(function(t){return t.id===expPageTab;}))expPageTab='all';
  const acts=eaActions();
  const head='<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0">'+buildModuleTabsHTML(tabs,expPageTab,'expSetPageTab',true)+'</div>'
    +(acts.length===1?'<div class="adv-set-actions">'+advBtn(acts[0][0],acts[0][1])+'</div>'
      :acts.length?'<div class="adv-set-actions"><button class="btn btn-outline btn-sm" id="ea-manage-btn" onclick="eaManageClick()">Manage '+EA_ICO.chev+'</button></div>':'')+'</div>';
  return '<div class="mod-page">'+head+(expPageTab==='queue'?caQueueHTML():eaListHTML())+'</div>'+eaModalsHTML();
};
buildAdvancesHTML=function(){
  advTick();
  awfKinds=['Advance','Imprest'];
  const views=eaAdvViews(),cur=views.find(function(v){return v.id===advPageTab;});
  if(!cur){advPageTab='advances';return eaListHTML()+eaModalsHTML();}   // defensive: the list lives on Expenses & Advances
  let body;
  if(advPageTab==='imprest')body=impListHTML();
  else if(advPageTab==='settlements')body=stlListHTML();
  else if(advPageTab==='settings')body=advSettingsHTML();
  else body=advReportsHTML();
  const label={imprest:'Imprest Funds',settlements:'Settlements',settings:'Advance & Imprest Settings',reports:'Reports'}[advPageTab];
  return '<div class="mod-page">'+eaSubHead(label)+body+'</div>'+eaModalsHTML();
};
/* Approval routes moved out of Advance Settings. */
advSetSubs=function(){
  const s=[];
  if(advCan('advance.settings.manage'))s.push(['types','Advance Types']);
  if(advCan('advance.policy.manage'))s.push(['policies','Advance Policies']);
  if(advCan('advance.settings.manage'))s.push(['general','General']);
  return s;
};
const eaSubPick0=advSetSubPick;
advSetSubPick=function(k){
  if(k==='workflows'){eaGoWorkflows('Advance');return;}
  /* From elsewhere (Company Settings), a settings section opens Advance & Imprest Settings on it. */
  if(page!=='advances'||advPageTab!=='settings'){advCloseForms();awfSel=null;advSetSub=k;advCfgDraft=null;advPageTab='settings';eaNav0('advances');return;}
  return eaSubPick0(k);
};

/* ── + New Request ─────────────────────────────────────────────────────── */
function eaNewOptions(){
  const o=[];
  if(caCan('expense.claim.submit'))o.push(['exp','Expense Claim']);
  if(advCan('advance.create')||advCan('advance.create.others'))o.push(['adv','Advance Request']);
  if(advCan('advance.imprest.manage'))o.push(['imp','Imprest Request']);
  return o;
}
function eaMenuEl(){
  let m=document.getElementById('ea-plus-menu');
  if(!m){const w=document.createElement('div');w.className='ct-action-wrap emb-plus-wrap';
    w.innerHTML='<div class="ct-action-menu emb-plus-menu" id="ea-plus-menu" role="menu"></div>';document.body.appendChild(w);m=w.firstChild;}
  return m;
}
function eaPlusClick(){
  const opts=eaNewOptions(),btn=document.getElementById('tb-page-add-btn');
  if(!opts.length){emsDeny('create requests');return;}
  if(opts.length===1||!btn){eaNewPick(opts[0][0]);return;}
  const m=eaMenuEl();
  if(eaMenuWasOpen){eaMenuWasOpen=false;m.classList.remove('open');return;}
  m.innerHTML=opts.map(function(o){return '<div class="ct-act-item" role="menuitem" onclick="eaNewPick(\''+o[0]+'\')">'+EA_ICO[o[0]]+'<span>'+o[1]+'</span></div>';}).join('');
  document.querySelectorAll('.ct-action-menu.open').forEach(function(x){x.classList.remove('open');});
  m.classList.add('open');
  placeAnchoredMenu(m,btn.getBoundingClientRect(),{alignLeft:true});
}
document.addEventListener('mousedown',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#tb-page-add-btn')){const m=document.getElementById('ea-plus-menu');eaMenuWasOpen=!!(m&&m.classList.contains('open'));}
  if(e.target&&e.target.closest&&e.target.closest('#ea-manage-btn')){const m=document.getElementById('ea-manage-menu');eaManageWasOpen=!!(m&&m.classList.contains('open'));}
},true);
function eaNewPick(k){
  const m=document.getElementById('ea-plus-menu');if(m)m.classList.remove('open');
  eaMenuWasOpen=false;
  if(k==='adv')advStart();else if(k==='imp')impStart();else startAddExpense();
}

/* ── All Requests ──────────────────────────────────────────────────────── */
function eaApproved(s){return ['Approved','Partially Approved','Reimbursed'].indexOf(s)>=0;}
function eaRows(){
  const out=[];
  expScope().forEach(function(r){
    const p=expPerson(r.employeeEid)||{},appr=eaApproved(r.status)||r.lines.some(function(l){return l.approved!=null;});
    const cu=caClaimantUser(r),by=r.submittedBy&&r.submittedBy!==cu?caN(r.submittedBy):(r.createdBy&&r.createdBy!==cu&&r.claimFor==='Others'?caN(r.createdBy):'');
    out.push({kind:'exp',r:r,id:r.id,key:expKey(r),type:'Expense Claim',who:r.name,dept:p.dept||'',by:by,cat:r.category,purpose:r.title,
      req:expTotal(r),appr:appr?caApprovedTotal(r):null,cur:r.currency,status:r.status,
      pay:r.pay?r.pay.status:(eaApproved(r.status)?EA_NA:caPayStatus(r)),set:EA_NA,date:r.appliedOn||''});
  });
  if(eaAdvViews().length||advScope(advancesData).length){
    advScope(advancesData).forEach(function(r){
      const b=advBal(r),by=r.createdBy&&r.createdBy!==caClaimantUser(r)?caN(r.createdBy):'';
      const dead=['Draft','Rejected','Withdrawn','Cancelled'].indexOf(r.status)>=0;
      out.push({kind:'adv',r:r,id:r.id,key:expKey(r),type:'Advance Request',who:r.name,dept:(idEmp(r.employeeEid)||{}).dept||'',by:by,cat:r.category,purpose:r.title,
        req:caTotal(r),appr:eaApproved(r.status)?b.approved:null,cur:r.currency,status:r.status,
        pay:advDisbStatus(r),set:dead&&!b.issued?EA_NA:advSettleShown(r),date:r.appliedOn||''});
    });
    const funds=impScope(impFunds);
    impRequests.forEach(function(q){
      const f=funds.find(function(x){return x.id===q.fundId;});if(!f)return;
      out.push({kind:'irq',r:q,id:q.id,fund:f,key:expKey(q),type:'Imprest Request',who:q.name,dept:f.dept||'',by:'',cat:q.requestType,purpose:f.name,
        req:caTotal(q),appr:eaApproved(q.status)?caApprovedTotal(q):null,cur:q.currency,status:q.status,
        pay:advDisbStatus(q),set:EA_NA,date:q.appliedOn||''});
    });
  }
  return out;
}
function eaRowPass(x){
  if(eaTypeF&&x.type!==eaTypeF)return false;
  if(eaApprF&&x.status!==eaApprF)return false;
  if(eaPayF&&x.pay!==eaPayF)return false;
  if(eaSetF&&x.set!==eaSetF)return false;
  if(eaWhoF&&x.who!==eaWhoF)return false;
  if(eaCatF&&x.cat!==eaCatF)return false;
  if(eaDeptF&&x.dept!==eaDeptF)return false;
  if((eaFrom||eaTo)&&!x.date)return false;
  if(eaFrom&&x.date<eaFrom)return false;
  if(eaTo&&x.date>eaTo)return false;
  if(eaQ){const q=eaQ.toLowerCase();if([x.key,x.type,x.who,x.cat,x.purpose,x.dept].join(' ').toLowerCase().indexOf(q)<0)return false;}
  return true;
}
function eaResetVals(){eaQ='';eaTypeF='';eaApprF='';eaPayF='';eaSetF='';eaWhoF='';eaFrom='';eaTo='';eaCatF='';eaDeptF='';}
function eaClosePanels(){expDropEdit();expSelectedId=null;advSel=null;impReqSel=null;}
function eaApply(){
  const pick=function(id,all){const v=getCSValue(id);return v&&v!==all?v:'';};
  eaQ=lpSearchValue('ea-f-q');eaTypeF=pick('ea-f-type','All Types');eaApprF=pick('ea-f-appr','All Statuses');
  eaPayF=pick('ea-f-pay','All Payment');eaSetF=pick('ea-f-set','All Settlement');
  eaWhoF=document.getElementById('ea-f-who')?pick('ea-f-who','All People'):'';
  eaCatF=pick('ea-f-cat','All Categories');eaDeptF=document.getElementById('ea-f-dept')?pick('ea-f-dept','All Departments'):'';
  eaFrom=getCDValue('ea-f-from');eaTo=getCDValue('ea-f-to');
  eaClosePanels();renderADTPage();
}
function eaReset(){eaResetVals();eaClosePanels();renderADTPage();}
function eaStat(k){
  if(k==='Overdue')eaSetF=eaSetF==='Overdue'?'':'Overdue';else eaApprF=eaApprF===k?'':k;
  eaClosePanels();renderADTPage();
}
function eaUniq(a){const s=[];a.forEach(function(x){if(x&&s.indexOf(x)<0)s.push(x);});return s;}
function eaNA(){return '<div class="lp-c-plain is-none">'+EA_NA+'</div>';}
function eaRowHTML(x,i){
  const r=x.r,sel=x.kind==='exp'?expSelectedId===x.id:x.kind==='adv'?advSel===x.id:(advSel===x.fund.id&&impReqSel===x.id);
  const rid=(x.kind==='exp'?'exp-row-':x.kind==='adv'?'adv-row-':'irq-row-')+x.id;
  const open=x.kind==='exp'?'openExpSidebar('+x.id+')':x.kind==='adv'?'advOpen('+x.id+')':'eaOpenIrq('+x.id+')';
  const st=caActiveStage(r);
  return '<tr class="'+(x.kind==='exp'?'exp-row':'adv-row')+(sel?' lp-row-selected':'')+'" id="'+rid+'" style="cursor:pointer" onclick="'+open+'">'
    +'<td class="lp-c-n">'+(i+1)+'</td>'
    +'<td><div class="lp-c-main ax-c-link">'+x.key+'</div><div class="lp-c-sub">'+x.type+(x.date?' · '+cdLabel(x.date):' · Not submitted')+'</div></td>'
    +'<td><div class="lp-c-plain ax-c-trunc exp-c-emp" title="'+attrSafe(x.who)+'">'+sbEsc(x.who)+'</div><div class="lp-c-sub ax-c-trunc">'+sbEsc(x.dept)+(x.by?(x.dept?' · ':'')+'by '+sbEsc(x.by):'')+'</div></td>'
    +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(x.cat)+'">'+sbEsc(x.cat)+'</div><div class="lp-c-sub ax-c-trunc" title="'+attrSafe(x.purpose)+'">'+sbEsc(x.purpose)+'</div></td>'
    +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(x.req,x.cur)+'</div><div class="lp-c-sub">'+(x.appr!=null?'approved '+expMoney(x.appr,x.cur):'requested')+'</div></td>'
    +'<td>'+axBadge(statusTone(x.status),x.status)+(st&&x.status==='Awaiting Approval'?'<div class="lp-c-sub ax-c-trunc" title="'+attrSafe(st.name)+'">'+sbEsc(st.name)+(caOverdue(r,st)?' · <span class="exp-cap-over">Overdue</span>':'')+'</div>':'')+'</td>'
    +'<td>'+(x.pay===EA_NA?eaNA():(x.kind==='exp'&&r.pay?caPayBadge(r):axBadge(statusTone(x.pay),x.pay)))
      +'<div class="lp-c-sub">Settlement: '+(x.set===EA_NA?EA_NA:'<span'+(x.set==='Overdue'?' class="exp-cap-over"':'')+'>'+x.set+'</span>')+'</div></td>'
    /* The employee's own requests in a client company: the same ☰ (open the record) as advances; status reads in its
       column, and a draft is submitted from the claim itself (product owner, 9 Nov 2026). Approvers keep their controls. */
    +'<td onclick="event.stopPropagation()">'+(x.kind==='exp'&&typeof rowLogCell==='function'&&!(typeof emsClientOnly==='function'&&emsClientOnly()&&typeof emsIsMe==='function'&&emsIsMe({eid:r.employeeEid}))?rowLogCell('expenses',x.id)
      :'<button class="lp-action-btn" title="Open" onclick="'+open+'">'+EA_ICO.menu+'</button>')+'</td>'
    +'</tr>';
}
function eaListHTML(){
  const emp=caOwnScope()&&!advCan('advance.view.all')&&!advCan('advance.view.team');
  const all=eaRows(),rows=all.filter(eaRowPass);
  /* Newest first: requested date, drafts on top. */
  rows.sort(function(a,b){return (b.date||'9999')>(a.date||'9999')?1:(b.date||'9999')<(a.date||'9999')?-1:b.id-a.id;});
  const sig=[eaQ,eaTypeF,eaApprF,eaPayF,eaSetF,eaWhoF,eaFrom,eaTo,eaCatF,eaDeptF].join('|');
  const pgn=listPage('ea-all',sig,rows.map(eaRowHTML),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No request matches this filter.</td></tr>');
  const cnt=function(s){return all.filter(function(x){return x.status===s;}).length;};
  const tiles=caStat('Awaiting Approval',cnt('Awaiting Approval'),eaApprF==='Awaiting Approval','eaStat(\'Awaiting Approval\')')
    +caStat('Follow-Up',cnt('Follow-Up'),eaApprF==='Follow-Up','eaStat(\'Follow-Up\')')
    +caStat('Approved',cnt('Approved'),eaApprF==='Approved','eaStat(\'Approved\')')
    +caStat('Overdue',all.filter(function(x){return x.set==='Overdue';}).length,eaSetF==='Overdue','eaStat(\'Overdue\')','bad');
  const appr=eaUniq(EXP_STATUSES.concat(ADV_STATUSES));
  const pay=eaUniq(CA_PAY_STATUSES.concat(ADV_DISB_STATUSES)).filter(function(s){return s!==EA_NA;}).concat([EA_NA]);
  const sets=ADV_SETTLE_STATUSES.concat([EA_NA]);
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('ea-f-q',eaQ,emp?'Search my requests':'Search ID, employee or purpose','eaApply()')
    +apCS('ea-f-type',EA_TYPES,eaTypeF,'All Types')
    +apCS('ea-f-appr',appr,eaApprF,'All Statuses')
    /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
    +(eaPayF?apCS('ea-f-pay',pay,eaPayF,'All Payment'):'')
    +(eaSetF?apCS('ea-f-set',sets,eaSetF,'All Settlement'):'')
    +(!emp&&eaWhoF?axCS('ea-f-who',eaUniq(all.map(function(x){return x.who;})).sort(),eaWhoF,'All People'):'')
    +(eaFrom?apCD('ea-f-from',eaFrom,'From'):'')+(eaTo?apCD('ea-f-to',eaTo,'To'):'')
    +(eaCatF?apCS('ea-f-cat',eaUniq(all.map(function(x){return x.cat;})).sort(),eaCatF,'All Categories'):'')
    +(!emp&&eaDeptF?apCS('ea-f-dept',typeof capDepts==='function'?capDepts():eaUniq(all.map(function(x){return x.dept;})).sort(),eaDeptF,'All Departments'):'')
    +clearFiltersBtn([eaQ,eaTypeF,eaApprF,eaPayF,eaSetF,eaWhoF,eaFrom,eaTo,eaCatF,eaDeptF],'eaReset()')
    +'<button class="lp-pill-search" onclick="eaApply()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats exp-stats">'+tiles+'</div></div>'
    +caSplitWrap('<table class="lp-table ax-table exp-table ea-table"><thead><tr><th>S. No</th><th>Request</th><th>Employee</th><th>Category</th>'
      +'<th>Amount</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>'
      +'<tbody>'+pgn.rows+'</tbody></table>'+pgn.pager)
    +'</div>';
}
/* One split area, two panels: a claim opens the expense panel, an advance or
   an imprest request (its fund, on the request) the advance panel. */
const eaSplit0=caSplitWrap;
caSplitWrap=function(table){
  if(page!=='expenses')return eaSplit0(table);
  if(expSelectedId!=null&&advSel!=null){advSel=null;impReqSel=null;}
  return '<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="exp-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +table+'</div></div>'
    +'<div class="lp-split-sb'+(expSelectedId?' open':'')+'" id="exp-split-sb"><div class="lp-isb" id="exp-isb-inner">'+(expSelectedId?sbRender(renderExpSidebar,'exp'):'')+'</div></div>'
    +'<div class="lp-split-sb'+(advSel!=null?' open':'')+'" id="adv-split-sb"><div class="lp-isb" id="adv-isb-inner">'+(advSel!=null?sbRender(renderAdvSidebar,'adv'):'')+'</div></div></div>';
};
function eaUnselect(cls){document.querySelectorAll('.'+cls).forEach(function(x){x.classList.remove('lp-row-selected');});}
const eaOpenExp0=openExpSidebar;
openExpSidebar=function(id,tab){
  if(page==='expenses'&&advSel!=null){
    if(sbLeaveGuard('adv',function(){openExpSidebar(id,tab);}))return;
    advSel=null;impReqSel=null;const s=document.getElementById('adv-split-sb');if(s)s.classList.remove('open');eaUnselect('adv-row');
  }
  return eaOpenExp0.apply(this,arguments);
};
const eaAdvOpen0=advOpen;
advOpen=function(id,tab){
  if(page==='expenses'&&expSelectedId!=null){
    if(sbLeaveGuard('exp',function(){advOpen(id,tab);}))return;
    expDropEdit();expSelectedId=null;const s=document.getElementById('exp-split-sb');if(s)s.classList.remove('open');eaUnselect('exp-row');
  }
  return eaAdvOpen0.apply(this,arguments);
};
function eaOpenIrq(id){
  const q=impReq(id),f=q&&impFund(q.fundId);if(!f)return;
  advOpen(f.id,'funding');
  if(advSel!==f.id)return;
  impReqSel=q.id;advTab='funding';isbTab('adv',renderAdvSidebar);
  document.querySelectorAll('.adv-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='irq-row-'+id);});
}
/* A record reached from a notification, the queue, a claim or a report opens
   on Expenses & Advances; the queue keeps its tab. */
advOpenRecord=function(id,tab){
  const r=advEngineRec(id);if(!r)return;
  const target=r.kind==='imprest'?impFund(r.fundId):r;
  if(!advInScope(target)&&!caInvolved(r,caMe())){showToast('Not available','error','This record is outside your access.');return;}
  advCloseForms();
  if(page==='expenses'&&expSelectedId!=null){expDropEdit();expSelectedId=null;}
  if(!(page==='expenses'&&expPageTab==='queue')){expPageTab='all';eaResetVals();}
  advPageTab='advances';
  advSel=target.id;impReqSel=r.kind==='imprest'?r.id:null;
  advTab=r.kind==='imprest'?'funding':(tab||'basic-details');
  if(page!=='expenses')eaNav0('expenses');else renderADTPage();
};
const eaGoClaim0=advGoClaim;
advGoClaim=function(id){advSel=null;impReqSel=null;expPageTab='all';eaResetVals();return eaGoClaim0(id);};

/* Export follows the screen: All Requests exports the unified list. */
const eaExport0=expExport;
expExport=function(){
  if(page==='settings'&&csTab==='workflow'&&eaWfKinds().length){eaWfExport();return;}   // Company Settings → Workflow: the approval routes
  if(page!=='expenses'||expPageTab!=='all')return eaExport0.apply(this,arguments);
  const rows=eaRows().filter(eaRowPass);
  if(!rows.length){showToast('Nothing to export','info','No request matches the current filters.');return;}
  wbCSV('expenses-and-advances',['Request ID','Request Type','Employee / Custodian','Department','Category','Purpose','Currency','Requested','Approved','Approval Status','Payment / Disbursement','Settlement','Requested On'],
    rows.map(function(x){return [x.key,x.type,x.who,x.dept,x.cat,x.purpose,x.cur,x.req,x.appr!=null?x.appr:'',x.status,x.pay+(x.kind==='exp'&&x.r.pay&&x.r.pay.illustrative?' (Illustrative)':''),x.set,x.date];}));
  showToast('Export ready','success',rows.length+' requests exported.');
};

/* ── Company Settings → Workflow: approval routes ──────────────────────── */
function eaWfKinds(){
  if(typeof mcOn==='function'&&!mcOn('expenses'))return [];
  const k=[];
  if(caCan('expense.approval.config.view'))k.push('Expense');
  if(advCan('advance.settings.manage'))k.push('Advance','Imprest');
  return k;
}
const EA_WF_LABEL={Expense:'Expense Claims',Advance:'Advance Requests',Imprest:'Imprest Requests'};
function eaGoWorkflows(kind){
  if(kind)eaWfKind=kind;
  awfSel=null;awfModal=null;
  if(page==='expenses'){expDropEdit();expSelectedId=null;advSel=null;advCloseForms();}
  csSelectedItem=(csEntityRows()[0]||[1])[0];csTab='workflow';
  navigatePage('settings');
}
function eaWfExport(){awfQ='';awfStatusF='';awfAppliesF='';awfKinds=[eaWfKind];awfExport();}
function eaWfPick(k){if(eaWfKind===k)return;eaWfKind=k;awfSel=null;isbTab('cs',renderCsSidebar);}
function eaWfSectionHTML(){
  const kinds=eaWfKinds();if(!kinds.length)return '';
  if(kinds.indexOf(eaWfKind)<0)eaWfKind=kinds[0];
  awfKinds=['Expense'];
  const defaults=awfCfgHTML();   // shared SLA and escalation, under the expense configuration right
  awfKinds=[eaWfKind];
  const exp=eaWfKind==='Expense';
  const list=caWorkflows.filter(function(w){return w.entity===caEntity()&&caWfKindOf(w)===eaWfKind;});
  if(awfSel&&!list.some(function(w){return w.id===awfSel;}))awfSel=null;
  const canAdd=caCan(awfPermFor('manage'));
  const strip=kinds.length>1?'<div class="segmented is-compact" style="margin:0 0 10px">'+kinds.map(function(k){
    return '<button type="button" class="seg-btn'+(eaWfKind===k?' active':'')+'" onclick="eaWfPick(\''+k+'\')">'+EA_WF_LABEL[k]+'</button>';}).join('')+'</div>':'';
  const rows=list.map(function(w,i){
    const n=caActiveDefs(w).length;
    return '<tr style="cursor:pointer" class="'+(awfSel===w.id?'lp-row-selected':'')+'" id="awf-row-'+w.id+'" onclick="awfOpen('+w.id+')">'
      +'<td class="csag-td"><a class="ax-c-link">'+sbEsc(w.name)+'</a><div class="wb-muted">'+caWfKey(w)+' · v'+w.version+'</div></td>'
      +'<td class="csag-td" style="white-space:normal">'+(exp?sbEsc(w.appliesTo+' · '+(w.category==='All'?'All categories':w.category))+'<div class="wb-muted">'+sbEsc(caWfBand(w))+'</div>'
        :sbEsc(caWfUsedBy(w)||'—'))+'</td>'
      +'<td class="csag-td" style="white-space:normal">'+n+' level'+(n===1?'':'s')+'<div class="wb-muted">'+sbEsc(caStagePath(w.stages))+'</div></td>'
      +'<td class="csag-td">'+axBadge(statusTone(caWfShown(w)),caWfShown(w))+'</td></tr>';
  }).join('');
  return '<div class="ea-wf">'
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Approval Workflows <span class="ax-count">'+list.length+'</span></span><span class="ca-actions">'
      +(list.length&&caCan('expense.export')?advBtn('Export','eaWfExport()'):'')+(canAdd?advBtn('Add Workflow','awfStartAdd(\''+eaWfKind+'\')',true):'')+'</span></div>'
    +strip+defaults
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Workflow</th><th>'+(exp?'Applies To':'Used By')+'</th><th>Approval Levels</th><th>Status</th></tr></thead><tbody>'
      +(rows||'<tr><td class="csag-td" colspan="4" style="text-align:center;color:var(--gray)">No approval workflow yet.</td></tr>')+'</tbody></table></div>'
    +(awfSel?'<div id="awf-split-sb" class="open" style="margin-top:14px;border:1px solid var(--border);border-radius:12px;overflow:hidden"><div id="awf-isb-inner">'+sbRender(awfRenderPanel,'awf')+'</div></div>':'')
    +'</div>';
}
/* In Company Settings the route opens under its row, inside the entity panel. */
const eaAwfOpen0=awfOpen,eaAwfClose0=awfClose;
awfOpen=function(id,tab){
  if(page!=='settings')return eaAwfOpen0.apply(this,arguments);
  if(awfSel===id&&!tab){awfSel=null;isbTab('cs',renderCsSidebar);return;}
  awfTab=tab||sbKeepTab(awfSel,awfTab);awfSel=id;isbTab('cs',renderCsSidebar);
};
awfClose=function(){
  if(page!=='settings')return eaAwfClose0.apply(this,arguments);
  awfSel=null;isbTab('cs',renderCsSidebar);
};
const eaCsBuild0=buildCompanySettingsHTML;
buildCompanySettingsHTML=function(){
  const out=eaCsBuild0.apply(this,arguments);
  if(awfModal)awfKinds=[awfModal.kind||eaWfKind];
  return out+(awfModal?awfModalHTML():'');
};
/* Someone who may configure approval routes but not the company sees only the Workflow tab. */
const eaCsTabs0=csVisibleTabs;
csVisibleTabs=function(){
  const t=eaCsTabs0.apply(this,arguments);
  if(typeof emsCan!=='function'||emsCan('foundation.entity.view'))return t;
  return eaWfKinds().length?t.filter(function(x){return x.id==='workflow';}):t;
};

/* ── Capping Limit: a claim over its limit (FR-WB-01 §5) ──────────────────
   Capping Limit stays the one source of expense limits. A Warning result
   reads "Limit Exceeded" with the excess; the justification is required at
   submission (epGate, unchanged); the claim's history records the limit, the
   excess and the justification; All Requests marks the claim. Blocking
   policies still block. */
(function(){
  if(typeof capResultBadge==='function'){const b0=capResultBadge;capResultBadge=function(x){return x&&x.result==='Warning'?axBadge('wait','Limit Exceeded'):b0.apply(this,arguments);};}
  if(typeof epSnapshot==='function'){
    const s0=epSnapshot;
    epSnapshot=function(r){
      const ev=s0.apply(this,arguments);
      try{
        (r.policyEval&&r.policyEval.results||[]).forEach(function(x){
          if(x.result!=='Warning'||!(x.exceeded>0))return;
          const j=(r.policyJust||{})[x.key]||'';
          if(typeof caLog==='function')caLog(r,'Limit Exceeded',x.name+' ('+x.key+'): limit '+expMoney(x.limit,x.currency)+', over by '+expMoney(x.exceeded,x.currency)+(j?'. Justification: '+j:'')+'.');
        });
      }catch(e){}
      return ev;
    };
  }
})();
function eaLimitOver(r){
  const res=r&&r.policyEval?r.policyEval.results:[];
  const over=res.filter(function(x){return x.exceeded>0&&(x.result==='Warning'||x.result==='Blocked');});
  if(!over.length)return null;
  return {amount:over.reduce(function(a,x){return a+x.exceeded;},0),currency:over[0].currency};
}
(function(){
  const rh0=eaRowHTML;
  eaRowHTML=function(x,i){
    const out=rh0.apply(this,arguments);
    if(x.kind!=='exp')return out;
    const o=eaLimitOver(x.r);if(!o)return out;
    /* Under the approval status: the excess, in the warning colour. */
    const tag='<div class="lp-c-sub exp-cap-over">Limit exceeded · '+expMoney(o.amount,o.currency)+'</div>';
    const at=out.indexOf('</td>',out.indexOf(axBadge(statusTone(x.status),x.status)));
    return at>0?out.slice(0,at)+tag+out.slice(at):out;
  };
})();
