/* ══ EMS DASHBOARD - client companies ═════════════════════════════════════
   An EMS client company (entity.emsOnly, js/ems-access.js) gets a dashboard
   drawn from its own records, for the person signed in: what is waiting on
   them, the figures their role works with, and their latest requests. The
   ADT platform company keeps the full multi-role dashboard. Same building
   blocks as the rest of the dashboard: header, quick links, stat cards and
   the Action Required table. */
function emsDashOn(){return typeof emsClientOnly==='function'&&emsClientOnly();}
function emsDashAllowed(pg){return typeof emsPageGuard!=='function'||!emsPageGuard(pg);}
function emsDashMine(x){
  const me=typeof advMyEid==='function'?advMyEid():'';
  return !!me&&x.r&&(x.r.employeeEid===me);
}
/* What is waiting on this person, newest first. Each row opens where it is done. */
function emsDashTasks(){
  const t=[];
  const add=function(item,type,due,status,tone,label,call){t.push({item:item,type:type,due:due,status:status,tone:tone,label:label,call:call});};
  if(emsDashAllowed('expenses')){
    caQueue(false).forEach(function(r){const st=caActiveStage(r),due=st?caDue(st):'',over=st&&caOverdue(r,st);
      add(expKey(r)+' · '+r.title,(CA_TYPE_LABEL[caKind(r)]||r.category)+' approval',due,over?'Overdue':'Awaiting your decision',over?'bad':'wait','Review',"eaGo('queue')");});
    eaRows().filter(function(x){return emsDashMine(x)&&x.status==='Follow-Up';}).forEach(function(x){
      add(x.key+' · '+x.purpose,x.type,'','Follow-Up','wait','Respond',x.kind==='exp'?"navigatePage('expenses');openExpSidebar("+x.id+")":"advOpenRecord("+x.id+")");});
    if(caCan('expense.reimb.process')){
      const n=expScope().filter(function(r){return r.pay&&['Ready for Payment','Pending Verification'].indexOf(r.pay.status)>=0;}).length;
      if(n)add(n+' reimbursement'+(n===1?'':'s')+' to process','Reimbursement','','Ready for Payment','info','Process',"eaGo('reimb')");
    }
    if(typeof advCan==='function'&&advCan('advance.disbursement.manage')){
      const n=advScope(advancesData).filter(function(r){return advDisbStatus(r)==='Ready for Disbursement';}).length;
      if(n)add(n+' advance'+(n===1?'':'s')+' to disburse','Advance disbursement','','Ready for Disbursement','info','Open',"eaGo('all');eaPayF='Ready for Disbursement';renderADTPage()");
    }
  }
  /* Card KYC details an employee sent for review: whoever reviews enrollment changes (not the employee themselves). */
  if(typeof oncData!=='undefined'&&(typeof mcOn!=='function'||mcOn('expenses'))&&emsCan('onc.enroll.review')){
    const me=idMe();
    idEmpsIn(idEntity(),true).forEach(function(e){const r=oncData[e.eid];
      if(!r||!r.pending||r.pending.by===me||(typeof oncIsSelf==='function'&&oncIsSelf(e)))return;
      add(e.name+' · card KYC details','Card enrollment review','','Pending HR Review','wait','Review',"emsDashOncOpen('"+e.eid+"')");});
  }
  if(emsDashAllowed('budgets')&&typeof bgCan==='function'&&bgCan('funding.transaction.verify')){
    const me=idMe(),n=fbTxns.filter(function(x){return x.entity===idEntity()&&x.status==='Pending Verification'&&x.recordedBy!==me;}).length;
    if(n)add(n+' funding entr'+(n===1?'y':'ies')+' to verify','Funding','','Pending Verification','wait','Verify',"navigatePage('budgets')");
  }
  return t;
}
/* Employees → the person → ONC Card, where the review is decided. */
function emsDashOncOpen(eid){
  const row=(typeof directEmpData!=='undefined'?directEmpData:[]).find(function(x){return x.eid===eid;});if(!row)return;
  navigatePage('employees');openDeSidebar(row.id);navDeTab('onc-card');
}
function emsDashStat(label,num,sub,ico,call){
  return '<div class="hr-stat-card is-link" role="button" tabindex="0" onclick="'+call+'"><div class="hr-stat-head"><div class="hr-stat-label">'+label+'</div><span class="hr-stat-ico">'+ico+'</span></div>'
    +'<div class="hr-stat-number">'+num+'</div><div class="hr-stat-sub">'+sub+'</div></div>';
}
function emsDashSum(list,f){const by={};list.forEach(function(x){const v=f(x);if(v>0)by[x.cur]=(by[x.cur]||0)+v;});const k=Object.keys(by);return k.length?k.map(function(c){return expMoney(by[c],c);}).join(' · '):'0';}
/* The figures this role works with. */
function emsDashStatsHTML(rows){
  const all=caCan('expense.claim.view.all')||(typeof advCan==='function'&&advCan('advance.view.all'));
  const approver=caCan('expense.approval.queue')||caQueue(false).length>0;
  const mine=rows.filter(emsDashMine),q=caQueue(false);
  const open=function(l){return l.filter(function(x){return ['Awaiting Approval','Follow-Up'].indexOf(x.status)>=0;});};
  const toSettle=mine.filter(function(x){return x.kind==='adv';}).map(function(x){return {cur:x.cur,v:advBal(x.r).accountable};});
  const s=[];
  if(all){
    const pay=rows.filter(function(x){return x.pay==='Ready for Payment'||x.pay==='Ready for Disbursement';});
    const cards=typeof ccCards!=='undefined'?ccCards.filter(function(c){return c.entity===idEntity()&&c.status==='Active';}).length:0;
    s.push(emsDashStat('In Approval',open(rows).length,'requests across the company',sbIco.receipt,"eaGo('all');eaApprF='Awaiting Approval';renderADTPage()"));
    s.push(emsDashStat('Ready to Pay',pay.length,'reimbursements and advances',sbIco.dollar,"eaGo('all')"));
    s.push(emsDashStat('Active Cards',cards,'corporate cards',sbIco.card,emsDashAllowed('cards')?"navigatePage('cards')":"''"));
    s.push(emsDashStat('Employees',idEmpsIn(idEntity()).length,idEntityName(idEntity()),sbIco.users,emsDashAllowed('employees')?"navigatePage('employees')":"''"));
  }else{
    if(approver){
      const over=q.filter(function(r){return caOverdue(r,caActiveStage(r));}).length;
      s.push(emsDashStat('My Approvals',q.length,over?over+' overdue':'waiting for your decision',sbIco.shieldCheck,"eaGo('queue')"));
    }
    s.push(emsDashStat('My Open Requests',open(mine).length,'in approval or Follow-Up',sbIco.receipt,"eaGo('all')"));
    s.push(emsDashStat('Approved',mine.filter(function(x){return eaApproved(x.status);}).length,'claims and advances',sbIco.fileCheck,"eaGo('all');eaApprF='Approved';renderADTPage()"));
    s.push(emsDashStat('Advance to Settle',emsDashSum(toSettle,function(x){return x.v;}),'accountable amount',sbIco.wallet,"eaGo('settlements')"));
    /* Four figures fill the row: an employee without approvals also sees their cards. */
    if(!approver){
      const me=typeof advMyEid==='function'?advMyEid():'';
      const mine=typeof ccCards!=='undefined'?ccCards.filter(function(c){return c.entity===idEntity()&&c.employeeEid===me&&['Closed','Cancelled'].indexOf(c.status)<0;}):[];
      s.push(emsDashStat('My Cards',mine.length,mine.filter(function(c){return c.status==='Active';}).length+' active',sbIco.card,emsDashAllowed('cards')?"navigatePage('cards')":"''"));
    }
  }
  return '<div class="hr-stat-grid">'+s.join('')+'</div>';
}
function emsDashTasksHTML(){
  const t=emsDashTasks();
  return '<div class="hr-section" style="margin-bottom:14px"><div class="hr-section-header"><div class="hr-section-title">Action Required</div></div>'
    +(t.length?'<table class="hr-leave-table" style="width:100%"><thead><tr><th>Item</th><th>Type</th><th>Due Date</th><th>Status</th><th></th></tr></thead><tbody>'
      +t.slice(0,8).map(function(x){return '<tr><td><span class="hr-emp-name">'+sbEsc(x.item)+'</span></td><td style="color:var(--gray)">'+sbEsc(x.type)+'</td>'
        +'<td style="color:var(--gray)">'+(x.due?cdLabel(x.due):'—')+'</td><td>'+axBadge(x.tone,x.status)+'</td>'
        +'<td><button class="hr-action-btn neutral" onclick="'+x.call+'">'+x.label+'</button></td></tr>';}).join('')+'</tbody></table>'
      :'<div class="wb-empty-sm" style="padding:14px 0">Nothing is waiting on you.</div>')
    +'</div>';
}
function emsDashRecentHTML(rows){
  const list=rows.slice().sort(function(a,b){return (b.date||'9999')>(a.date||'9999')?1:(b.date||'9999')<(a.date||'9999')?-1:b.id-a.id;}).slice(0,6);
  if(!list.length)return '';
  return '<div class="hr-section" style="margin-bottom:14px"><div class="hr-section-header"><div class="hr-section-title">Latest Requests</div>'
    +'<button class="hr-action-btn neutral" onclick="eaGo(\'all\')">View all</button></div>'
    +'<table class="hr-leave-table" style="width:100%"><thead><tr><th>Request</th><th>Employee</th><th>Amount</th><th>Status</th><th>Requested On</th></tr></thead><tbody>'
    +list.map(function(x){const open=x.kind==='exp'?"navigatePage('expenses');openExpSidebar("+x.id+")":"advOpenRecord("+x.id+")";
      return '<tr style="cursor:pointer" onclick="'+open+'"><td><span class="hr-emp-name">'+x.key+'</span><div style="color:var(--gray);font-size:12px">'+sbEsc(x.type)+' · '+sbEsc(x.purpose)+'</div></td>'
        +'<td style="color:var(--gray)">'+sbEsc(x.who)+'</td><td>'+expMoney(x.req,x.cur)+'</td><td>'+axBadge(statusTone(x.status),x.status)+'</td>'
        +'<td style="color:var(--gray)">'+(x.date?cdLabel(x.date):'—')+'</td></tr>';}).join('')
    +'</tbody></table></div>';
}
function emsDashLinksHTML(){
  /* Short labels fit the six equal boxes; the full module name is the tooltip. */
  const l=[['my-profile','My Profile',sbIco.user,'My Profile'],['expenses','Expenses',sbIco.receipt,'Expenses & Advances'],['wallet-benefits','Benefits',sbIco.wallet,'Wallet & Benefits'],
    ['cards','Cards',sbIco.card,'Corporate Cards'],['budgets','Budgets',sbIco.dollar,'Funding & Budgets'],['settings','Settings',sbIco.cog,'Company Settings']];
  const shown=l.filter(function(x){return x[0]==='my-profile'||emsDashAllowed(x[0]);});
  /* Without the Wallet & Benefits page, Benefits opens the person's own in My Profile. */
  if(!emsDashAllowed('wallet-benefits')&&emsDashAllowed('expenses'))shown.splice(2,0,['my-benefits','Benefits',sbIco.wallet,'My Profile → Wallet & Benefits']);
  /* Fewer than six links share the full width, in line with the figures below. */
  return '<div class="hr-links"'+(shown.length<6?' style="grid-template-columns:repeat('+shown.length+',minmax(0,1fr))"':'')+'>'+shown.map(function(x){
    const go=x[0]==='my-benefits'?'profTab=\'my-benefits\';navigatePage(\'my-profile\',true)':'navigatePage(\''+x[0]+'\',true)';
    return '<button type="button" class="hr-link" title="'+x[3]+'" onclick="'+go+'"><span class="hr-link-ico">'+x[2]+'</span><span class="hr-link-txt">'+x[1]+'</span></button>';}).join('')+'</div>';
}
function emsDashHTML(){
  const ok=emsDashAllowed('expenses');
  const rows=ok?eaRows():[];
  const t=ok?emsDashTasks().length:0;
  return '<div class="dashboard-view active" id="employee-view">'
    +'<div class="hr-header"><div class="hr-header-eyebrow" data-dash-date>'+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div>'
    +'<div class="hr-header-title" data-dash-greet>'+(typeof dashGreeting==='function'?dashGreeting():'Welcome back')+(idMeName()?', '+sbEsc(idMeName().split(' ')[0]):'')+'</div>'
    +'<div class="hr-header-desc">'+(t?'You have '+t+' thing'+(t===1?'':'s')+' waiting on you today.':'Nothing is waiting on you today.')+'</div></div>'
    +emsDashLinksHTML()
    +'<div id="emp-life-dash"></div>'
    +(ok?'<div class="hr-band"><span class="hr-band-title">Overview</span><span class="hr-band-rule"></span><span class="hr-band-meta">'+sbEsc(idEntityName(idEntity()))+'</span></div>'
      +emsDashStatsHTML(rows)+emsDashTasksHTML()+emsDashRecentHTML(rows):'')
    +'</div>';
}
(function(){
  const rp0=renderPageContent;
  renderPageContent=function(target){
    const out=rp0.apply(this,arguments);
    if(page==='dashboard'&&emsDashOn()){
      const el=typeof target==='string'?document.getElementById(target):target;
      if(el){
        el.innerHTML=emsDashHTML();
        if(typeof empDashRender==='function')empDashRender(el);
      }
    }
    return out;
  };
})();

/* ── Dashboard tabs by role ────────────────────────────────────────────
   Each person sees the dashboard of the role they work in; only OpenDhi
   platform users see every dashboard. One dashboard needs no tab strip. */
const EMS_DASH_TABS={'Employee':['employee'],'Reporting Manager':['manager'],'HR':['hr'],'Finance':['finance-admin-basic'],
  'Company Admin':['entity-owner'],'Super Admin':['entity-owner'],'Compliance':['employee'],'IT':['employee']};
function emsDashTabsAllowed(){
  if(typeof emsCanPreview==='function'&&emsCanPreview())return null;   // OpenDhi: all
  return EMS_DASH_TABS[typeof emsRole==='function'?emsRole():'']||['employee'];
}
function emsDashFilterTabs(el){
  const ok=emsDashTabsAllowed();if(!ok)return;
  const root=el||document;
  const btns=root.querySelectorAll?root.querySelectorAll('#dashboard-tabs .tab-btn'):[];
  if(!btns.length)return;
  btns.forEach(function(b){b.style.display=ok.indexOf(b.dataset.tab)>=0?'':'none';});
  const wrap=root.querySelector('.dashboard-tabs-wrap');if(wrap&&ok.length<2)wrap.style.display='none';
  const cur=window.activeDashboardTab||'employee';
  if(ok.indexOf(cur)<0){
    window.activeDashboardTab=ok[0];
    root.querySelectorAll('.tab-btn').forEach(function(t){t.classList.toggle('active',t.dataset.tab===ok[0]);});
    root.querySelectorAll('.dashboard-view').forEach(function(v){v.classList.toggle('active',v.id===ok[0]+'-view');});
  }
}
(function(){
  const rp1=renderPageContent;
  renderPageContent=function(target){
    const out=rp1.apply(this,arguments);
    if(page==='dashboard'&&!emsDashOn()){const el=typeof target==='string'?document.getElementById(target):target;emsDashFilterTabs(el);}
    return out;
  };
  /* A tab hidden from this role cannot be opened another way either. */
  if(typeof switchDashboard==='function'){const sd0=switchDashboard;switchDashboard=function(tab){const ok=emsDashTabsAllowed();if(ok&&ok.indexOf(tab)<0)tab=ok[0];return sd0.call(this,tab);};}
})();
/* EMS client companies: the menu's section headings fit what is left. */
(function(){
  if(typeof emsSidebarItems!=='function')return;
  const si0=emsSidebarItems;
  emsSidebarItems=function(){
    const out=si0.apply(this,arguments);
    if(!(typeof emsClientOnly==='function'&&emsClientOnly()))return out;
    const ren={'Time & Pay':'Expenses','Governance':'Administration'};
    return out.map(function(i){return i.section&&ren[i.section]?Object.assign({},i,{section:ren[i.section]}):i;});
  };
  if(window.getSidebarItems===si0)window.getSidebarItems=emsSidebarItems;
})();
