/* ══ PAYMENTS for an EMS client company (product owner, 9 Nov 2026) ═══════
   Finance → Payments has two tabs in an EMS client company:
   - EMS Payments: one register of the company's money movements -
     reimbursement payments (RMB), advance and imprest disbursements (DSB),
     card loads (CLD) and funding entries (FT). Each row opens its own record;
     every rule, approval and verification stays in that record's module.
   - Invoices: ADT's existing invoicing list, this company's invoices only.
   Other companies keep their Payments page as it is. */
let emsPayTab='ems',emsPayQ='',emsPayTypeF='',emsPayStatusF='';
const EMS_PAY_TYPES=['Reimbursement','Advance disbursement','Imprest top-up','Card load','Benefit card load','Funding In','Funding Out'];
function emsPayOn(){return typeof emsClientOnly==='function'&&emsClientOnly();}
function emsPayISO(d){if(!d)return '';if(/^\d{4}-\d{2}-\d{2}/.test(d))return d.slice(0,10);return typeof wbISO==='function'?wbISO(d):d;}
function emsPayRows(){
  const ent=idEntity(),out=[];
  const can=function(c){return typeof emsCan!=='function'||emsCan(c);};
  if(typeof expensesData!=='undefined'&&(can('expense.reimb.view.all')||can('expense.reimb.process')))expensesData.forEach(function(r){
    if(r.entity!==ent||!r.pay||!r.pay.key||r.pay.status==='Not Applicable'||!(Number(r.pay.payable)>0))return;   // nothing owed to the employee: no payment
    const p=r.pay,last=(p.events||[]).find(function(e){return e.type==='Settlement';});
    out.push({kind:'rmb',id:r.id,key:p.key,type:'Reimbursement',who:r.name,rel:expKey(r),amount:p.settled||p.payable,cur:r.currency,status:p.status,
      date:emsPayISO((last&&last.payDate)||r.reimbursedOn||r.appliedOn),ref:(last&&last.ref)||p.payrollRef||'',route:p.route||''});
  });
  if(typeof advancesData!=='undefined'&&(can('advance.view.all')||can('advance.disbursement.manage')))advancesData.concat(typeof impRequests!=='undefined'?impRequests:[]).forEach(function(r){
    if(r.entity!==ent||!r.disb)return;
    (r.disb.instructions||[]).forEach(function(i){
      out.push({kind:'dsb',id:r.id,key:i.key,type:r.kind==='imprest'?'Imprest top-up':'Advance disbursement',who:r.name,rel:expKey(r),amount:i.amount,cur:r.currency,status:i.status,
        date:emsPayISO((i.verify&&i.verify.date)||String(i.initiatedAt||'').split(' | ')[0]),ref:(i.verify&&i.verify.ref)||'',route:i.method||''});
    });
  });
  if(typeof ccLoads!=='undefined'&&(can('card.view.all')||can('card.load.create')||can('card.load.verify')))ccLoads.forEach(function(l){
    if(l.entity!==ent)return;
    const c=typeof ccCard==='function'?ccCard(l.cardId):null;
    out.push({kind:'cld',id:l.id,key:expKey(l),type:l.allocId?'Benefit card load':'Card load',who:l.name||'',rel:c?expKey(c):'',amount:l.amount,cur:l.currency,
      status:typeof ccLoadLabel==='function'?ccLoadLabel(l):l.status,date:emsPayISO(String(l.createdAt||'').split(' | ')[0]),ref:'',route:typeof wbTypeName==='function'?wbTypeName(l.wallet)+' wallet':l.wallet});
  });
  if(typeof fbTxns!=='undefined'&&(can('funding.source.manage')||can('funding.report.view')||can('funding.transaction.create')||can('funding.transaction.verify')))fbTxns.forEach(function(t){
    if(t.entity!==ent)return;
    const s=typeof fbSource==='function'?fbSource(t.sourceId):null;
    out.push({kind:'ft',id:t.id,key:t.key,type:t.type||'Funding entry',who:s?s.name:'',rel:s?s.key:'',amount:t.amount,cur:(s&&s.currency)||'INR',status:t.status,date:emsPayISO(t.date),ref:t.ref||'',route:''});
  });
  return out.sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
}
function emsPayPass(x){
  if(emsPayTypeF&&x.type!==emsPayTypeF)return false;
  if(emsPayStatusF&&x.status!==emsPayStatusF)return false;
  if(emsPayQ){const q=emsPayQ.toLowerCase();if([x.key,x.type,x.who,x.rel,x.ref].join(' ').toLowerCase().indexOf(q)<0)return false;}
  return true;
}
function emsPayApply(){const pick=function(id,all){const v=getCSValue(id);return v&&v!==all?v:'';};emsPayQ=lpSearchValue('emsp-f-q');emsPayTypeF=pick('emsp-f-type','All Types');emsPayStatusF=pick('emsp-f-status','All Statuses');renderADTPage();}
function emsPayReset(){emsPayQ='';emsPayTypeF='';emsPayStatusF='';renderADTPage();}
function emsPayStat(s){emsPayStatusF=emsPayStatusF===s?'':s;renderADTPage();}
function emsPayOpen(kind,id){
  if(kind==='rmb'){expPageTab='all';navigatePage('expenses');openExpSidebar(id,'reimbursement');}
  else if(kind==='dsb'){advOpenRecord(id,'disbursement');}
  else if(kind==='cld'){navigatePage('cards');ccOpenLoadUI(id);}
  else if(kind==='ft'){navigatePage('budgets');bgSetPageTab('funding');fbSubPick('ledger');fbOpen(id);}
}
function emsPayRegisterHTML(){
  const all=emsPayRows(),rows=all.filter(emsPayPass);
  const sig=[emsPayQ,emsPayTypeF,emsPayStatusF].join('|');
  const pgn=listPage('ems-payments',sig,rows.map(function(x,i){
    return '<tr style="cursor:pointer" onclick="emsPayOpen(\''+x.kind+'\','+x.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+sbEsc(x.key)+'</div><div class="lp-c-sub">'+sbEsc(x.type)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+sbEsc(x.who||'—')+'</div><div class="lp-c-sub">'+sbEsc(x.rel)+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(Number(x.amount)||0,x.cur)+'</div><div class="lp-c-sub ax-c-trunc">'+sbEsc(x.route)+'</div></td>'
      +'<td>'+axBadge(statusTone(x.status),x.status)+'</td>'
      +'<td class="exp-c-nw"><div class="lp-c-plain">'+(x.date?cdLabel(x.date):'—')+'</div><div class="lp-c-sub ax-c-trunc">'+sbEsc(x.ref)+'</div></td>'
      +'</tr>';
  }),'<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--gray)">No payment matches this filter.</td></tr>');
  const stats=eaUniq(all.map(function(x){return x.status;}));
  const tiles=['Processing','Pending Verification','Paid','Verified'].filter(function(s){return stats.indexOf(s)>=0;}).map(function(s){return caStat(s,all.filter(function(x){return x.status===s;}).length,emsPayStatusF===s,'emsPayStat(\''+s+'\')');}).join('');
  return '<div class="lp-page">'
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'
    +lpSearchField('emsp-f-q',emsPayQ,'Search payment, employee or reference','emsPayApply()')
    +apCS('emsp-f-type',EMS_PAY_TYPES.filter(function(t){return all.some(function(x){return x.type===t;});}),emsPayTypeF,'All Types')
    +apCS('emsp-f-status',stats,emsPayStatusF,'All Statuses')
    +clearFiltersBtn([emsPayQ,emsPayTypeF,emsPayStatusF],'emsPayReset()')
    +'<button class="lp-pill-search" onclick="emsPayApply()">Search</button></div></div>'
    +(tiles?'<div class="listing-stats exp-stats">'+tiles+'</div>':'')+'</div>'
    +'<div class="lp-table-card" style="margin-top:14px"><table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th><th>Payment</th><th>Paid To</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>'
    +pgn.rows+'</tbody></table>'+pgn.pager+'</div></div>';
}
function emsPaySetTab(t){if(emsPayTab===t)return;emsPayTab=t;if(typeof pmSelectedId!=='undefined')pmSelectedId=null;renderADTPage();}
(function(){
  if(typeof buildPaymentsHTML!=='function')return;
  const bp0=buildPaymentsHTML;
  buildPaymentsHTML=function(){
    if(!emsPayOn())return bp0.apply(this,arguments);
    const tabs=[{id:'ems',label:'EMS Payments'},{id:'invoices',label:'Invoices'}];
    let body;
    if(emsPayTab==='invoices'){
      /* This company's invoices only. */
      const name=idEntityName(idEntity()),keep=paymentsData.splice(0,paymentsData.length);
      keep.forEach(function(p){if(p.entityName===name)paymentsData.push(p);});
      try{body=bp0.apply(this,arguments);}finally{paymentsData.splice(0,paymentsData.length);keep.forEach(function(p){paymentsData.push(p);});}
    }else body=emsPayRegisterHTML();
    return '<div class="mod-page">'+buildModuleTabsHTML(tabs,emsPayTab,'emsPaySetTab',true)+body+'</div>';
  };
  const r0=renderADTPage;
  renderADTPage=function(){
    const out=r0.apply(this,arguments);
    if(page==='payments'&&emsPayOn()&&emsPayTab==='ems'){const b=document.getElementById('tb-page-add-btn');if(b)b.style.display='none';}
    return out;
  };
})();
/* Payments belongs to the EMS of a client company: on by default, and open to the people who handle its money. */
(function(){
  if(typeof MC_EMS_KEYS!=='undefined'&&MC_EMS_KEYS.indexOf('payments')<0)MC_EMS_KEYS.push('payments');
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf('payments')<0)EMS_CLIENT_PAGES.push('payments');
  /* Only in an EMS client company do the EMS money rights open Payments; elsewhere it keeps its own right. */
  if(typeof appPagePermitted==='function'){
    const ap0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg==='payments'&&emsPayOn()&&['expense.reimb.view.all','advance.view.all','card.view.all','funding.source.manage','funding.report.view'].some(function(c){return emsCan(c);}))return true;
      return ap0.apply(this,arguments);
    };
  }
})();
