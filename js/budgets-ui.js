/* ══ FUNDING & BUDGETS - the page (FR-FB, Build 6) ════════════════════════
   Expense Management → Funding & Budgets: Budgets, Corporate Funding, Budget
   Changes, Reports and Settings. The rules live in js/budgets.js; approval
   decisions use the shared Build 4 review popup (Expenses → Pending My
   Approval, or the Approval tab here). Built from the same parts as
   Advances & Imprest: filter bar + tiles, split listing, record panel with
   Basic Details / Logs / History / Workflow, popups for forms and actions.

   Also here: the Company Structure tabs for Cost Centres and Projects, the
   entity Base Currency field, and the small pieces the Expense and Advance
   forms show (budget check, Cost Centre / Project, funding source).

   Nothing on this page moves money. Budget figures come from the utilization
   ledger; funding figures from verified ADT entries - never a bank balance. */

let bgPageTab='budgets',bgSel=null,bgTab='basic-details';
let bgQ='',bgFyF='',bgStatusF='',bgTypeF='',bgTileF='';
let bgForm=null,bgAllocForm=null,bgAct=null,bgCfgDraft=null,bgmForm=null;
let bgChgSel=null,bgChgTab='basic-details',bgChgQ='',bgChgKindF='',bgChgStatusF='';
let fbSub='sources',fbSel=null,fbTab='basic-details',fbQ='',fbStatusF='',fbForm=null,fbTxnForm=null;
let bgSetSub='general';
let bgRep='register',bgRF={fy:'',q:'',dept:'',cat:'',cc:'',prj:'',owner:'',src:'',status:'',enf:'',from:'',to:'',cur:'',card:''};

const BG_STATUSES=['Draft','Awaiting Approval','Follow-Up','Approved','Scheduled','Active','Inactive','Expired','Closed','Rejected','Withdrawn'];
const BG_CHG_STATUSES=['Draft','Awaiting Approval','Follow-Up','Approved','Partially Approved','Applied','Rejected','Withdrawn','Cancelled'];
const BG_CHG_KINDS=[['budget revision','Revision'],['budget transfer','Transfer'],['budget exception','Exception'],['financial year close','Year Close']];
const BG_WF_KINDS=['Budget','Budget Revision','Budget Transfer','Budget Exception','Financial Year Close'];
const FB_VIEW_PERMS=['funding.source.manage','funding.transaction.create','funding.transaction.verify','funding.transaction.reverse','funding.report.view'];
const FB_TXN_STATUSES=['Draft','Pending Verification','Verified','Reversed','Rejected'];
const BG_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>',
  chg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>',
  fund:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18"/><path d="M5 10V20M9 10V20M15 10V20M19 10V20"/><path d="M2 21h20"/><path d="M12 3l9 5H3z"/></svg>',
  plus:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
};
sbToneAdd({applied:'ok',scheduled:'info',expired:'idle',closed:'idle',inactive:'idle',consumed:'idle','within-budget':'ok',warning:'wait',blocked:'bad',
  'exception-approved':'info','not-evaluated':'idle','carried-forward':'info',open:'ok','pending-verification':'wait',verified:'ok',reversed:'idle',completed:'idle',
  'missing-exchange-rate':'bad','needs-re-evaluation':'wait'});
Object.assign(supportPageMeta,{'budgets':{title:'Funding & Budgets',context:'Funding & Budgets',filters:[],columns:[],rows:[]}});
Object.assign(CA_TYPE_LABEL,{'budget':'Budget','budget revision':'Budget Revision','budget transfer':'Budget Transfer','budget exception':'Budget Exception','financial year close':'Year Close'});
/* The Funding & Budgets workflow types in the shared workflow form. */
BG_WF_KINDS.forEach(function(k){
  const kind=k.toLowerCase();
  CA_WF_INFO[k]={perm:'budget.manage',noun:k==='Budget Exception'?'budget or allocation':'budget',
    hint:{'Budget':'New budgets, submitted with their allocations.','Budget Revision':'Changes to an approved budget\'s total or allocations.',
      'Budget Transfer':'Moving authority between allocations of one budget.','Budget Exception':'Authority to exceed a budget for one request or one allocation.',
      'Financial Year Close':'Closing a financial year and carrying open commitments forward.'}[k],
    listNote:'Each Funding & Budgets request takes the newest active route of its type.',
    usedBy:function(id){const n=bgBudgets.concat(bgChanges).filter(function(r){return r.wf&&r.wf.wfId===id;}).length;return k+' requests'+(n?' · '+n+' routed':'');},
    stages:function(){
      const team=(typeof caTeamIds==='function'?caTeamIds(kind):[])[0];
      const fin=Object.assign(awfBlankStage(k==='Budget'||k==='Budget Exception'?2:1),{name:'Finance review',type:team?'RBAC Team':'Role',ref:team?String(team):''});
      if(k==='Budget')return [Object.assign(awfBlankStage(1),{name:'Manager review',type:'Reporting Manager'}),fin];
      if(k==='Budget Exception')return [Object.assign(awfBlankStage(1),{name:'Budget owner review',type:'Budget Owner'}),fin];
      return [fin];
    }};
});

/* ── Small helpers ─────────────────────────────────────────────────────── */
function bgE(s){return sbEsc(String(s==null?'':s));}
function bgPick(id,all){const v=getCSValue(id);return v&&v!==all?v:'';}
function bgBtn(label,call,primary,danger){return '<button class="btn '+(primary?'btn-primary ca-review-btn':'btn-outline')+' btn-sm'+(danger?' is-danger':'')+'" onclick="'+call+'">'+label+'</button>';}
function bgMe(){return caMe();}
function bgCanFund(){return FB_VIEW_PERMS.some(bgCan);}
function bgEmpty(cols,text){return '<tr><td colspan="'+cols+'" style="padding:24px;text-align:center;color:var(--gray)">'+text+'</td></tr>';}
function bgField(label,req,html,hint,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+(hint?'<div class="ea-hint">'+hint+'</div>':'')+'</div>';}
function bgInput(id,val,ph,type){return '<input class="ep-form-input" id="'+id+'"'+(type==='number'?' type="number" min="0" step="0.01"':'')+' value="'+attrSafe(val==null?'':val)+'"'+(ph?' placeholder="'+attrSafe(ph)+'"':'')+'>';}
function bgArea(id,val,ph){return '<textarea class="ep-form-input ax-notes" id="'+id+'"'+(ph?' placeholder="'+attrSafe(ph)+'"':'')+'>'+bgE(val)+'</textarea>';}
function bgMoneyIn(id,cur,val){return '<div class="ax-currency"><span>'+cur+'</span><input class="ep-form-input" id="'+id+'" type="number" min="0" step="0.01" value="'+attrSafe(val==null?'':val)+'"></div>';}
function bgVal(id){const el=document.getElementById(id);return el?el.value:null;}
function bgRo(v){return '<input class="ep-form-input ca-ro" readonly value="'+attrSafe(v||'')+'">';}
function bgModal(title,sub,body,foot,cls){
  return '<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal '+(cls||'adv-modal')+'" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+bgE(title)+'</span><button class="ct-modal-close" onclick="'+foot.close+'">'+AX_ICO.x+'</button></div>'
    +(sub?'<p class="ct-modal-sub">'+sub+'</p>':'')+body
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="'+foot.close+'">Cancel</button>'+foot.btns+'</div></div></div></div>';
}
/* Concurrency: a form opened on one revision of a record never saves over another. */
function bgRevOf(r){
  if(!r)return '';
  return (r.logs||[]).length+'|'+r.status+'|'+(r.version||0)+'|'+(r.amount==null?'':r.amount)
    +'|'+(r.allocations?r.allocations.map(function(a){return a.id+':'+a.amount+':'+(a.parentId||'');}).join(','):'');
}
function bgStaleToast(r){renderADTPage();showToast('This record changed','error',(r?(r.key&&r.prefix?expKey(r):r.key||r.code||'The record')+' was updated by someone else':'The record is gone')+' while this was open. Nothing was saved; open it again.');}
function bgUserOpts(list){return idLabels(list);}
function bgEvalBadge(res){return axBadge(statusTone(res),res);}
function bgPct(f){return f.approved>0?f.pct+'%':'—';}

/* ── Scope: who sees which budget ─────────────────────────────────────── */
/* Whole budget: budget.view.all, or its owner, preparer, submitter, an approver of it or of a change to it. */
/* WHO SEES WHICH BUDGET (decisions 1 and 2 of 7 Nov 2026), from RBAC rights and record roles:
   - full: budget.view.all, or the budget's owner, preparer or submitter - the whole budget;
   - approver: assigned to approve the budget or a change to it - the whole budget record needed to
     decide (amounts, allocations, justification, history), but no reporting scope from that alone;
   - lines: an allocation owner - only their allocations and the lines under them.
   No Department Head role: a manager sees what they own or are routed. */
function bgAccess(b){
  if(!b||b.entity!==bgEnt())return '';
  if(bgCan('budget.view.all'))return 'full';
  if(!bgCan('budget.view'))return '';
  const me=bgMe();
  if(b.ownerUid===me||b.createdBy===me||b.submittedBy===me)return 'full';
  if(caInvolved(b,me)||bgChanges.some(function(c){return c.entity===b.entity&&(c.budgetId===b.id||(c.budgetIds||[]).indexOf(b.id)>=0)&&caInvolved(c,me);}))return 'approver';
  return bgOwnAllocIds(b).length?'lines':'';
}
function bgFull(b){const a=bgAccess(b);return a==='full'||a==='approver';}
/* An allocation owner sees their allocations and what sits under them - not the rest of the budget. */
function bgOwnAllocIds(b){
  const me=bgMe(),ids=[];
  b.allocations.forEach(function(a){if(a.ownerUid===me)bgSubtreeIds(b,a.id).forEach(function(i){if(ids.indexOf(i)<0)ids.push(i);});});
  return ids;
}
function bgVisible(b){return !!bgAccess(b);}
function bgShownIds(b){return bgFull(b)?b.allocations.map(function(a){return a.id;}):bgOwnAllocIds(b);}
function bgOwnRoots(b){const ids=bgOwnAllocIds(b);return b.allocations.filter(function(a){return ids.indexOf(a.id)>=0&&!(a.parentId&&ids.indexOf(a.parentId)>=0);});}
function bgScopeList(){return bgBudgets.filter(bgVisible);}
/* Reports: being an approver gives no reporting scope; owners see their budgets, allocation owners their lines. */
function bgRepFull(b){return bgAccess(b)==='full';}
function bgRepShownIds(b){return bgRepFull(b)?b.allocations.map(function(a){return a.id;}):(bgAccess(b)?bgOwnAllocIds(b):[]);}
function bgRepScopeList(){return bgBudgets.filter(function(b){return bgRepShownIds(b).length>0||bgRepFull(b);});}
function bgRepChgList(){const ids=bgRepScopeList().map(function(b){return b.id;});return bgChgList().filter(function(c){return ids.indexOf(c.budgetId)>=0||(c.budgetIds||[]).some(function(i){return ids.indexOf(i)>=0;});});}
function bgViewFig(b,rep){
  if(rep?bgRepFull(b):bgFull(b))return bgFigures(b,null);
  const o={approved:0,pending:0,committed:0,actual:0,exposure:0,linked:0,occupied:0};
  bgOwnRoots(b).forEach(function(a){const f=bgFigures(b,a.id);Object.keys(o).forEach(function(k){o[k]=bgM(o[k]+(f[k]||0));});});
  o.available=bgM(o.approved-o.occupied);o.pct=o.approved>0?Math.round(o.occupied/o.approved*1000)/10:0;
  return o;
}
function bgFlags(b){
  if(['Active','Scheduled','Approved','Inactive','Expired','Closed'].indexOf(b.status)<0)return {near:false,over:false};
  const thr=Number(b.threshold)||0;let near=false,over=false;
  (bgFull(b)?[null].concat(b.allocations.filter(function(a){return a.status==='Active';}).map(function(a){return a.id;})):bgOwnAllocIds(b)).forEach(function(id){
    const f=bgFigures(b,id);if(f.occupied>f.approved+0.001)over=true;else if(thr&&f.pct>=thr)near=true;});
  return {near:near,over:over};
}
/* Budget changes: the requester, the approvers, and whoever sees the budget (owners of the allocations it touches). */
function bgChgVisible(c){
  if(!c||c.entity!==bgEnt())return false;
  const me=bgMe();
  if(c.createdBy===me||c.submittedBy===me||caInvolved(c,me))return true;
  if(!bgCan('budget.view'))return false;
  if(bgCan('budget.view.all'))return true;
  const bs=c.budgetIds?c.budgetIds.map(bgRec):[bgRec(c.budgetId)];
  return bs.some(function(b){
    if(!b)return false;if(bgFull(b))return true;
    const ids=bgOwnAllocIds(b);
    return [c.allocId,c.fromAllocId,c.toAllocId].concat((c.changes||[]).map(function(x){return x.allocId;})).some(function(id){return id&&ids.indexOf(id)>=0;});
  });
}
function bgChgList(){return bgChanges.filter(bgChgVisible);}
function bgKindLabel(k){const x=BG_CHG_KINDS.find(function(y){return y[0]===k;});return x?x[1]:k;}
function bgChgShown(c){return c.kind==='budget exception'?bgExcState(c):c.status;}

/* ── Page shell ────────────────────────────────────────────────────────── */
function bgPageTabs(){
  const t=[];
  if(bgCan('budget.view'))t.push({id:'budgets',label:'Budgets'});
  if(bgCanFund())t.push({id:'funding',label:'Corporate Funding'});
  if(bgCan('budget.view'))t.push({id:'changes',label:'Budget Changes'});
  if(bgCan('budget.report.view')||bgCan('funding.report.view'))t.push({id:'reports',label:'Reports'});
  if(bgCan('budget.manage'))t.push({id:'settings',label:'Settings'});
  return t;
}
function bgFormOpen(){return !!(bgForm||bgAllocForm||bgAct||fbForm||fbTxnForm||caRev||caAct||awfModal);}
function bgCloseForms(){bgForm=null;bgAllocForm=null;bgAct=null;fbForm=null;fbTxnForm=null;caRev=null;caAct=null;awfModal=null;}
function bgAnySel(){return bgSel!=null||bgChgSel!=null||fbSel!=null;}
function bgSetPageTab(t){
  if(bgPageTab===t)return;
  bgCloseForms();bgSel=null;bgChgSel=null;fbSel=null;awfSel=null;bgPageTab=t;renderADTPage();
}
function bgOffHTML(){
  return '<div class="lp-page"><div class="wb-empty"><b>Module not enabled for this client</b><span>Funding & Budgets is switched off for '+bgE(idEntityName(bgEnt()))
    +' in Company Settings → Module Control. Its records are kept; switch it on to see them again.</span></div></div>';
}
function buildBudgetsHTML(){
  if(typeof mcOn==='function'&&!mcOn('budgets'))return bgOffHTML();
  bgTick();
  awfKinds=BG_WF_KINDS.slice();
  const tabs=bgPageTabs();
  if(!tabs.length)return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>Funding & Budgets needs a budget or funding right in RBAC.</span></div></div>';
  if(!tabs.some(function(t){return t.id===bgPageTab;}))bgPageTab=tabs[0].id;
  let body;
  if(bgPageTab==='funding')body=fbHTML();
  else if(bgPageTab==='changes')body=bgChgListHTML();
  else if(bgPageTab==='reports')body=bgReportsHTML();
  else if(bgPageTab==='settings')body=bgSettingsHTML();
  else body=bgListHTML();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,bgPageTab,'bgSetPageTab',true)+body+'</div>'
    +(bgForm?bgFormHTML():'')+(bgAllocForm?bgAllocFormHTML():'')+(bgAct?bgActHTML():'')+(fbForm?fbFormHTML():'')+(fbTxnForm?fbTxnFormHTML():'')
    +(caRev?caReviewHTML():'')+(caAct?caActHTML():'')+(awfModal?awfModalHTML():'');
}
/* The header + creates what the open tab lists. */
function bgCanAddHere(){
  if(bgPageTab==='budgets')return bgCan('budget.create');
  if(bgPageTab==='changes')return ['budget.revise.request','budget.transfer.request','budget.exception.request'].some(bgCan)||bgCan('budget.manage');
  if(bgPageTab==='funding')return fbSub==='sources'?bgCan('funding.source.manage'):fbSub==='ledger'&&bgCan('funding.transaction.create');
  if(bgPageTab==='settings')return bgSetSub==='workflows'||bgSetSub==='types';
  return false;
}
function bgStartAddHere(){
  if(bgPageTab==='changes')bgActOpen('newChange',null);
  else if(bgPageTab==='funding'){if(fbSub==='sources')fbStart();else fbTxnStart();}
  else if(bgPageTab==='settings'){if(bgSetSub==='workflows')awfStartAdd('Budget');else bgActOpen('budgetType',null);}
  else bgStart();
}
function bgSplit(key,table,open,render){
  return '<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="'+key+'-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +table+'</div></div>'
    +'<div class="lp-split-sb'+(open?' open':'')+'" id="'+key+'-split-sb"><div class="lp-isb" id="'+key+'-isb-inner">'+(open?sbRender(render,key):'')+'</div></div></div>';
}
function bgFilterBar(inner,tiles){
  return '<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'+inner+'</div></div>'
    +(tiles?'<div class="listing-stats exp-stats">'+tiles+'</div>':'')+'</div>';
}
function bgControlNote(){
  const c=bgCfg();
  return c.control?'<div class="wb-note">Budget Control is <b>on</b> for '+bgE(idEntityName(bgEnt()))+': claims, advances and imprest requests are checked against active budgets (default '+bgE(c.enforcement)
      +'; no matching budget: '+bgE(c.noMatch)+'). Utilized = Pending + Committed + Actual Expense + Funding Exposure, each counted once.</div>'
    :'<div class="wb-note is-wait">Budget Control is <b>off</b> for '+bgE(idEntityName(bgEnt()))+': budgets are prepared and approved here, but claims and advances show "Not Evaluated" and nothing is blocked. '
      +(bgCan('budget.manage')?'Turn it on in Settings → General.':'Finance turns it on in Settings.')+'</div>';
}

/* ── Budgets ───────────────────────────────────────────────────────────── */
function bgRowsShown(){
  const q=String(bgQ||'').trim().toLowerCase();
  return bgScopeList().filter(function(b){
    if(q&&![expKey(b),b.title,caN(b.ownerUid),b.budgetType,b.fy].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(bgFyF&&b.fy!==bgFyF)return false;
    if(bgStatusF&&b.status!==bgStatusF)return false;
    if(bgTypeF&&b.budgetType!==bgTypeF)return false;
    if(bgTileF==='near'&&!bgFlags(b).near)return false;
    if(bgTileF==='over'&&!bgFlags(b).over)return false;
    return true;
  });
}
function bgApply(){bgQ=lpSearchValue('bg-f-q');bgFyF=bgPick('bg-f-fy','All Years');bgStatusF=bgPick('bg-f-status','All Statuses');bgTypeF=bgPick('bg-f-type','All Types');bgSel=null;renderADTPage();}
function bgReset(){bgQ='';bgFyF='';bgStatusF='';bgTypeF='';bgTileF='';bgSel=null;renderADTPage();}
function bgStat(k){if(k==='near'||k==='over')bgTileF=bgTileF===k?'':k;else bgStatusF=bgStatusF===k?'':k;bgSel=null;renderADTPage();}
function bgListHTML(){
  const all=bgScopeList(),rows=bgRowsShown();
  if(bgSel!=null&&!rows.some(function(b){return b.id===bgSel;}))bgSel=null;
  const pgn=listPage('budgets',[bgQ,bgFyF,bgStatusF,bgTypeF,bgTileF].join('|'),rows.map(function(b,i){
    const f=bgViewFig(b),full=bgFull(b),fl=bgFlags(b);
    return '<tr class="bg-row'+(bgSel===b.id?' lp-row-selected':'')+'" id="bg-row-'+b.id+'" style="cursor:pointer" onclick="bgOpen('+b.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(b.title)+'">'+bgE(b.title)+'</div><div class="lp-c-sub">'+expKey(b)+' · '+bgE(b.budgetType)+' · '+bgE(b.fy)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+bgE(caN(b.ownerUid))+'</div><div class="lp-c-sub">'+(full?'Budget owner':'Your allocations: '+bgE(bgOwnRoots(b).map(function(a){return a.key;}).join(', ')))+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(f.approved,b.currency)+'</div><div class="lp-c-sub">'+(full?'allocated '+expMoney(bgAllocated(b),b.currency):'allocated to you')+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain'+(fl.over?' exp-cap-over':'')+'">'+expMoney(f.occupied,b.currency)+'</div><div class="lp-c-sub">'+bgPct(f)+(fl.over?' · over budget':fl.near?' · near limit':'')+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(f.available,b.currency)+'</div></td>'
      +'<td>'+axBadge(statusTone(b.status),b.status)+'<div class="lp-c-sub">'+bgE(b.enforcement)+'</div></td>'
      +'<td class="ca-c-stage">'+caStageCell(b)+'</td></tr>';
  }),bgEmpty(8,'No budget matches this filter.'));
  const cnt=function(s){return all.filter(function(b){return b.status===s;}).length;};
  const tiles=caStat('Draft',cnt('Draft'),bgStatusF==='Draft','bgStat(\'Draft\')','idle')
    +caStat('Awaiting Approval',cnt('Awaiting Approval'),bgStatusF==='Awaiting Approval','bgStat(\'Awaiting Approval\')')
    +caStat('Active',cnt('Active'),bgStatusF==='Active','bgStat(\'Active\')','ok')
    +caStat('Near Limit',all.filter(function(b){return bgFlags(b).near;}).length,bgTileF==='near','bgStat(\'near\')','wait')
    +caStat('Over Budget',all.filter(function(b){return bgFlags(b).over;}).length,bgTileF==='over','bgStat(\'over\')','bad');
  const fys=bgUniq(all.map(function(b){return b.fy;}).concat(bgFyOptions().map(function(f){return f.label;})));
  return '<div class="lp-page">'+dashboardBackHTML()
    +bgFilterBar(lpSearchField('bg-f-q',bgQ,'Search ID, name or owner','bgApply()')
      +apCS('bg-f-fy',fys,bgFyF,'All Years')+apCS('bg-f-status',BG_STATUSES,bgStatusF,'All Statuses')+(bgTypeF?apCS('bg-f-type',bgCfg().budgetTypes,bgTypeF,'All Types'):'')
      +clearFiltersBtn([bgQ,bgFyF,bgStatusF,bgTypeF,bgTileF],'bgReset()')+'<button class="lp-pill-search" onclick="bgApply()">Search</button>',tiles)
    +bgControlNote()
    +bgSplit('bg','<table class="lp-table ax-table exp-table bg-table"><thead><tr><th>S. No</th><th>Budget</th><th>Owner</th><th>Approved Budget</th><th>Utilized</th><th>Available</th><th>Status</th><th>Current Stage</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,bgSel!=null,renderBgSidebar)
    +'</div>';
}
function bgOpen(id,tab){
  const b=bgRec(id);
  if(!bgVisible(b)){showToast('Not available','error','This budget is outside your access.');return;}
  bgTab=tab||sbKeepTab(bgSel,bgTab);bgSel=id;
  const sb=document.getElementById('bg-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('bg',renderBgSidebar);
  document.querySelectorAll('.bg-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='bg-row-'+id);});
}
function bgPanelClose(){
  bgSel=null;const sb=document.getElementById('bg-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.bg-row').forEach(function(x){x.classList.remove('lp-row-selected');});
}
function bgNav(t){bgTab=t;isbTab('bg',renderBgSidebar);}
/* From the shared approval queue or a link: a budget, or a budget change. */
function bgOpenRecord(id,tab){
  const r=bgRec(id)||bgChg(id);if(!r)return;
  const isB=r.kind==='budget';
  if(isB?!(bgVisible(r)||caInvolved(r,bgMe())):!bgChgVisible(r)){showToast('Not available','error','This record is outside your access.');return;}
  bgCloseForms();
  if(isB){bgPageTab='budgets';bgQ='';bgFyF='';bgStatusF='';bgTypeF='';bgTileF='';bgSel=r.id;bgTab=tab||'basic-details';}
  else{bgPageTab='changes';bgChgQ='';bgChgKindF='';bgChgStatusF='';bgChgSel=r.id;bgChgTab=tab||'basic-details';}
  if(page!=='budgets')navigatePage('budgets');else renderADTPage();
}
function renderBgSidebar(){
  const b=bgRec(bgSel);if(!b)return '';
  if(!bgVisible(b))return '<div class="lp-isb-body"><div class="wb-empty-sm">This budget is not available to you.</div></div>';
  const full=bgFull(b);
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'allocations',label:'Allocations'}]
    .concat(bgCan('budget.util.view')?[{id:'utilization',label:'Utilization'}]:[])
    .concat(full?[{id:'approval',label:'Approval'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}]:[]);
  if(!tabs.some(function(t){return t.id===bgTab;}))bgTab='basic-details';
  const hero=sbHero({icon:BG_ICO.hero,name:bgE(b.title),meta:[expKey(b),bgE(b.budgetType),b.fy],status:axBadge(statusTone(b.status),b.status)});
  let body;
  if(bgTab==='allocations')body=hero+bgAllocTabHTML(b);
  else if(bgTab==='utilization')body=hero+bgUtilTabHTML(b);
  else if(bgTab==='approval')body=hero+caApprovalTabHTML(b);
  else if(bgTab==='logs')body=lpLogsView(b.logs,'');
  else if(bgTab==='history')body=sbHistoryHTML(b);
  else if(bgTab==='workflow')body=wfTimelineHTML(bgWorkflowRows(b));
  else body=bgBasicHTML(b,hero);
  return axTabBar('bg',tabs,bgTab,'bgNav','bgPanelClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function bgCanEditBudget(b){
  if(['Draft','Follow-Up'].indexOf(b.status)<0)return false;
  if(b.status==='Follow-Up'&&typeof caCanRespond==='function'&&!caCanRespond(b))return false;
  const me=bgMe(),own=b.createdBy===me||b.submittedBy===me;
  return (own&&(bgCan('budget.create')||bgCan('budget.submit')))||bgCan('budget.manage');
}
function bgFigureCards(f,cur){
  return '<div class="wb-proj-cards bg-figs">'
    +advCard('Approved',expMoney(f.approved,cur))+advCard('Pending',expMoney(f.pending,cur),'in approval')+advCard('Committed',expMoney(f.committed,cur),'approved, not realized')
    +advCard('Actual Expense',expMoney(f.actual,cur),'accepted')+advCard('Funding Exposure',expMoney(f.exposure,cur),'issued, unaccounted')
    +advCard('Available',expMoney(f.available,cur),bgPct(f)+' utilized')+'</div>';
}
function bgBasicHTML(b,hero){
  const full=bgFull(b),f=bgViewFig(b),me=bgMe();
  let act='';
  if(full){
    if(b.status==='Draft'&&(b.createdBy===me&&bgCan('budget.submit')||bgCan('budget.manage')))act+=bgBtn('Submit','bgSubmitClick('+b.id+')',true);
    if(bgCanEditBudget(b))act+=bgBtn('Edit','bgStartEdit('+b.id+')');
    if(bgCan('budget.activate')&&(b.status==='Inactive'||(b.status==='Approved'&&b.versions.length)))act+=bgBtn('Activate','bgActOpen(\'activate\','+b.id+')');
    if(bgCan('budget.activate')&&['Active','Scheduled'].indexOf(b.status)>=0)act+=bgBtn('Deactivate','bgActOpen(\'deactivate\','+b.id+')');
  }
  if(['Active','Scheduled','Approved'].indexOf(b.status)>=0&&bgCan('budget.revise.request'))act+=bgBtn('Request Revision','bgActOpen(\'revision\','+b.id+')');
  if(b.status==='Active'&&bgCan('budget.transfer.request'))act+=bgBtn('Request Transfer','bgActOpen(\'transfer\','+b.id+')');
  if(b.status==='Active'&&bgCan('budget.exception.request'))act+=bgBtn('Request Exception','bgActOpen(\'exception\','+b.id+')');
  if(full&&bgCan('budget.manage')&&['Active','Scheduled','Approved'].indexOf(b.status)>=0&&bgOpeningCandidates().length)act+=bgBtn('Map Opening Exposure','bgActOpen(\'opening\','+b.id+')');
  const val=b.status==='Draft'||b.status==='Follow-Up'?bgValidateBudget(b):'';
  const conf=b.status==='Draft'&&!val?bgConflicts(b):[];
  const owner=idEmpOfUser(b.ownerUid);
  return hero+(act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(val?'<div class="wb-note is-wait"><b>Not ready to submit</b><div class="wb-note-sub">'+bgE(val)+'</div></div>':'')
    +(conf.length?'<div class="wb-note is-bad"><b>Overlaps a live budget</b><div class="wb-note-sub">'+bgE(bgConflictText(conf))+'. A transaction could be charged to both; narrow the scope first.</div></div>':'')
    +(b.status==='Draft'&&!val&&!conf.length?'<div class="wb-note">Ready to submit. A draft enforces nothing; approval '+(bgCfg(b.entity).separateActivation?'then a separate activation':'activates it from its effective date')+'.</div>':'')
    +(!full?'<div class="wb-note">You see the allocations you own in this budget ('+bgE(bgOwnRoots(b).map(function(a){return a.key+' '+bgScopeLabel(a);}).join('; '))+'). Figures below are for those allocations only.</div>':'')
    +bgFigureCards(f,b.currency)
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fTag,'Budget Name',bgE(b.title))
    +axField(AX_ICO.fHash,'Budget ID',expKey(b))
    +axField(AX_ICO.fCal,'Financial Year',bgE(b.fy)+' <span class="ax-sub">'+cdLabel(b.fyStart)+' – '+cdLabel(b.fyEnd)+'</span>')
    +axField(AX_ICO.fBox,'Budget Type',bgE(b.budgetType))
    +axField(AX_ICO.fBuild,'Entity',bgE(idEntityName(b.entity)))
    +axField(AX_ICO.fUser,'Budget Owner',bgE(caN(b.ownerUid))+(owner&&owner.dept?' <span class="ax-sub">'+bgE(owner.dept)+'</span>':''))
    +axField(AX_ICO.fCash,'Currency',b.currency)
    +(full?axField(AX_ICO.fCash,'Total Budget Amount',expMoney(b.amount,b.currency))
      +axField(AX_ICO.fCash,'Allocated',expMoney(bgAllocated(b),b.currency))
      +axField(AX_ICO.fCash,'Unallocated Reserve',expMoney(bgReserve(b),b.currency)):'')
    +axField(AX_ICO.fCal,'Quarterly Phasing',!b.quarterly?'Not phased':full&&b.quarters?b.quarters.map(function(q,i){return 'Q'+(i+1)+' '+expMoney(q,b.currency);}).join(' · '):'Phased by quarter (see your allocation lines)')
    +axField(AX_ICO.fShield,'Enforcement',bgE(b.enforcement)+(bgCfg(b.entity).control?'':' <span class="ax-sub">Budget Control is off</span>'))
    +axField(AX_ICO.fTag,'Warning Threshold',b.threshold!==''?b.threshold+'% <span class="ax-sub">near-limit indicator and alert</span>':'Not set')
    +axField(AX_ICO.fCal,'Effective',cdLabel(b.effFrom)+(b.effTo?' – '+cdLabel(b.effTo):' – end of '+b.fy))
    +axField(AX_ICO.fCheck,'Transactions Must Name',[b.requireCC?'Cost Centre':'',b.requirePrj?'Project':''].filter(Boolean).join(', ')||'Nothing extra')
    +axField(AX_ICO.fTag,'Version',b.version?'v'+b.version+(b.activatedOn?' <span class="ax-sub">active since '+cdLabel(b.activatedOn)+'</span>':''):'Not approved yet')
    +axField(AX_ICO.fUser,'Created By',bgE(caN(b.createdBy))+' <span class="ax-sub">'+bgE(b.createdAt)+'</span>')
    +axField(AX_ICO.fUser,'Submitted By',b.submittedBy?bgE(caN(b.submittedBy))+' <span class="ax-sub">'+bgE(b.submittedAt||'')+'</span>':'Not submitted')
    +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Supporting Document',bgE(b.proof))
    +axField(EXP_ICO.note,'Description',bgE(b.desc),true)
    +'</div>';
}
function bgSubmitClick(id){
  const r=bgRec(id)||bgChg(id);if(!r)return;
  const err=bgSubmit(id);
  if(err){showToast('Not submitted','error',err);return;}
  renderADTPage();const st=caActiveStage(r);
  showToast('Submitted','success',expKey(r)+' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'.');
}

/* Allocations tab: the tree, with what occupies each line (a parent's figures include its children). */
function bgDepth(a){return bgAncestors(a).length;}
function bgAllocOrder(b,ids){
  const out=[];
  const walk=function(pid,d){b.allocations.filter(function(a){return (a.parentId||null)===pid;}).forEach(function(a){if(!ids||ids.indexOf(a.id)>=0)out.push(a);walk(a.id,d+1);});};
  walk(null,0);return out;
}
function bgAllocTabHTML(b){
  const full=bgFull(b),ids=bgShownIds(b),draft=['Draft','Follow-Up'].indexOf(b.status)>=0;
  const canAl=full&&draft&&bgCan('budget.allocate');
  const list=bgAllocOrder(b,ids);
  const rows=list.map(function(a){
    const f=bgFigures(b,a.id),over=f.occupied>f.approved+0.001,d=bgDepth(a);
    return '<tr><td class="csag-td"><div class="bg-tree" style="padding-left:'+(d*16)+'px">'+(d?'<span class="bg-tree-mark">└</span>':'')+'<div><div class="lp-c-main">'+bgE(a.key)+' · '+bgE(bgScopeLabel(a))+'</div>'
        +'<div class="lp-c-sub">'+(a.parentId?'under '+bgE(bgAllocKey(bgAlloc(a.parentId)))+' · ':'')+(a.ownerUid?'owner '+bgE(caN(a.ownerUid))+' · ':'')+bgE(bgEnf(a,b))
        +(a.quarters?' · '+a.quarters.map(function(q,i){return 'Q'+(i+1)+' '+expMoney(q,b.currency);}).join(' / '):'')+'</div></div></div></td>'
      +'<td class="csag-td wb-num">'+expMoney(a.amount,b.currency)+'</td>'
      +'<td class="csag-td wb-num">'+expMoney(f.occupied,b.currency)+'<div class="lp-c-sub">'+bgBreak(f)+'</div></td>'
      +'<td class="csag-td wb-num'+(over?' exp-cap-over':'')+'">'+expMoney(f.available,b.currency)+'<div class="lp-c-sub">'+bgPct(f)+' utilized</div></td>'
      +(canAl?'<td class="csag-td csag-act"><button class="att-row-btn" title="Edit" onclick="bgAllocStart('+b.id+','+a.id+')">'+BG_ICO.edit+'</button>'
        +'<button class="att-row-btn is-danger" title="Remove" onclick="bgAllocRemove('+b.id+','+a.id+')">'+AX_ICO.trash+'</button></td>':'')
      +'</tr>';
  }).join('');
  const head='<tr><th>Allocation</th><th class="wb-num">Approved</th><th class="wb-num">Utilized</th><th class="wb-num">Available</th>'+(canAl?'<th class="csag-act">Action</th>':'')+'</tr>';
  const reserve=full?'<tr class="bg-reserve"><td class="csag-td"><div class="lp-c-main">Unallocated reserve</div><div class="lp-c-sub">Not spendable until transferred to an allocation</div></td><td class="csag-td wb-num">'+expMoney(bgReserve(b),b.currency)+'</td><td class="csag-td wb-num">—</td><td class="csag-td wb-num">'+expMoney(bgReserve(b),b.currency)+'</td>'+(canAl?'<td class="csag-td"></td>':'')+'</tr>':'';
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Allocations <span class="ax-count">'+list.length+'</span></span><span class="ca-actions">'
      +(canAl?bgBtn('Add Allocation','bgAllocStart('+b.id+')',true):'')+'</span></div>'
    +'<div class="wb-note">An expense is charged to the most specific matching line; every line above it must also have room.'
      +(draft?' Lines change freely while the budget is a draft; after approval only through a revision or transfer.':'')+'</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table bg-alloc-table"><thead>'+head+'</thead><tbody>'
    +(rows||bgEmpty(canAl?5:4,'No allocation yet.'))+reserve+'</tbody></table></div>'
    +(full?bgVersionsHTML(b):'');
}
/* Pending · Committed · Actual · Exposure: the parts that are not zero. */
function bgBreak(f){
  const p=['pending','committed','actual','exposure'].filter(function(c){return f[c];}).map(function(c){return c+' '+expMoney(f[c],'');});
  return p.length?p.join(' · '):'nothing yet';
}
function bgVersionsHTML(b){
  if(!b.versions.length)return '';
  return '<div class="wb-proj-h">Versions</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>Allocations</th><th>Reason</th><th class="wb-num">Budget</th></tr></thead><tbody>'
    +b.versions.slice().reverse().map(function(v){return '<tr><td class="csag-td">v'+v.v+'<div class="lp-c-sub">'+axBadge(statusTone(v.status),v.status)+'</div></td>'
      +'<td class="csag-td" style="white-space:normal">'+v.allocations.map(function(a){return bgE(a.key)+' '+expMoney(a.amount,b.currency);}).join(' · ')+'</td>'
      +'<td class="csag-td" style="white-space:normal">'+bgE(v.reason)+'<div class="lp-c-sub">'+bgE(v.at)+' · '+bgE(caN(v.by))+'</div></td>'
      +'<td class="csag-td wb-num">'+expMoney(v.amount,b.currency)+'</td></tr>';}).join('')
    +'</tbody></table></div><div class="ea-hint">Earlier versions are kept as they were; nothing is overwritten.</div>';
}
function bgUtilTabHTML(b){
  const ids=bgShownIds(b),full=bgFull(b);
  const states=Object.keys(bgStates).map(function(k){return bgStates[k];}).filter(function(s){return s.budget===b.id&&(full||ids.indexOf(s.alloc)>=0);});
  const ev=bgEvents.filter(function(e){return e.budget===b.id&&(full||ids.indexOf(e.alloc)>=0);}).slice().reverse();
  const live=states.filter(function(s){return s.pending||s.committed||s.actual||s.exposure||s.linked;});
  return '<div class="wb-note">Each obligation is counted once, against one allocation. '
      +'An advance-funded expense part is <b>linked</b>: it is already counted in the advance\'s funding exposure until the expense is accepted.</div>'
    +'<div class="wb-proj-h">What occupies this budget <span class="ax-count">'+live.length+'</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Source</th><th>Allocation</th><th>Counted As</th><th class="wb-num">Occupies</th></tr></thead><tbody>'
    +(live.length?live.map(function(s){
      const parts=['pending','committed','actual','exposure'].filter(function(c){return s[c];}).map(function(c){return BG_CLASS_LABEL[c]+' '+expMoney(s[c],b.currency);});
      return '<tr><td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+bgE(s.label)+'</div><div class="lp-c-sub">'+bgE(s.kind)+' · '+bgE(s.src)+(s.frozen?' · frozen ('+bgE(s.fy)+' closed)':'')+(s.carriedFrom?' · continues '+bgE(s.carriedFrom.fy):'')+'</div></td>'
      +'<td class="csag-td">'+bgE(bgAllocKey(bgAlloc(s.alloc)))+(s.q?'<div class="lp-c-sub">Q'+s.q+'</div>':'')+'</td>'
      +'<td class="csag-td" style="white-space:normal">'+(parts.join('<br>')||'—')+(s.linked?'<div class="lp-c-sub">linked '+expMoney(s.linked,b.currency)+': already counted in the advance exposure</div>':'')+'</td>'
      +'<td class="csag-td wb-num">'+expMoney(bgM(s.pending+s.committed+s.actual+s.exposure),b.currency)+'</td></tr>';}).join('')
      :bgEmpty(4,'Nothing occupies this budget yet.'))
    +'</tbody></table></div>'
    +'<div class="wb-proj-h">Utilization ledger <span class="ax-count">'+ev.length+'</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Event</th><th>Type</th><th>Source</th><th class="wb-num">Change</th></tr></thead><tbody>'
    +(ev.length?ev.slice(0,60).map(function(e){return '<tr><td class="csag-td">'+e.ref+'<div class="lp-c-sub">'+bgE(e.at)+' · '+bgE(caN(e.by))+'</div></td>'
      +'<td class="csag-td" style="white-space:normal">'+bgE(e.type)+'<div class="lp-c-sub">'+BG_CLASS_LABEL[e.cls]+(e.note?' · '+bgE(e.note):'')+'</div></td>'
      +'<td class="csag-td" style="white-space:normal">'+bgE(e.label)+'<div class="lp-c-sub">'+bgE(bgAllocKey(bgAlloc(e.alloc)))+'</div></td>'
      +'<td class="csag-td wb-num">'+(e.delta>0?'+':'−')+expMoney(Math.abs(e.delta),b.currency)+'</td></tr>';}).join('')
      :bgEmpty(4,'No utilization event yet.'))
    +'</tbody></table></div>'
    +(ev.length>60?'<div class="ea-hint">Latest 60 events shown; Reports lists them all.</div>':'');
}
function bgLogTitle(l){
  const a=l.action||'';
  const m=[[/draft created|drafted by/i,'Drafted'],[/^Submitted for approval/,'Submitted for Approval'],[/^Final approval complete/,'Approved'],[/rejected/i,'Rejected'],
    [/^Budget Active/,'Activated'],[/^Scheduled/,'Scheduled'],[/^Deactivated/,'Deactivated'],[/^Allocation .* (added|updated|removed)/,'Allocation Changed'],[/^Revision .* applied/,'Revision Applied'],
    [/^Transfer .* applied/,'Transfer Applied'],[/closed by/,'Year Closed'],[/^Budget edited/,'Edited'],[/^Exception authorized/,'Exception Authorized'],[/^Used by/,'Exception Used'],
    [/^Applied to/,'Applied'],[/^Cancelled/,'Cancelled'],[/over budget|reached .* threshold/,'Alert']];
  for(let i=0;i<m.length;i++)if(m[i][0].test(a))return m[i][1];
  return typeof caLogTitle==='function'?caLogTitle(l):(l.status||'Update');
}
function bgWorkflowRows(r){
  const done=(r.logs||[]).map(function(l){return {title:bgLogTitle(l),user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
  const steps=[];
  if(r.status==='Draft'){
    steps.push({title:'Submit for Approval',owner:caN(r.createdBy)});
    const rt=bgRoute(r);if(rt.wf)caActiveDefs(rt.wf).forEach(function(s){steps.push({title:'Stage '+s.n+' · '+s.name,owner:caStageWho(s)});});
  }else if(r.wf&&r.wf.open){
    if(r.status==='Follow-Up')steps.push({title:'Respond to Follow-Up',owner:caN(r.submittedBy||r.createdBy)});
    r.wf.stages.slice(r.wf.current).forEach(function(s,i){steps.push({title:'Stage '+s.n+' · '+s.name,owner:i===0&&s.approvers.length?caNs(s.approvers):caStageWho(s)});});
  }
  if(r.kind==='budget'&&['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0)steps.push({title:bgCfg(r.entity).separateActivation?'Activate (separate step)':'Activates from the effective date',owner:bgCfg(r.entity).separateActivation?'Finance':'System'});
  if(r.kind==='budget'&&r.status==='Approved')steps.push({title:'Activate',owner:'Finance (budget.activate)'});
  if(r.kind==='budget revision'&&r.status==='Approved'&&!r.appliedAt)steps.push({title:'Applies on '+cdLabel(r.effDate),owner:'System'});
  return wfPlan(done,steps);
}

/* ── Add / Edit budget ─────────────────────────────────────────────────── */
function bgOwnerOpts(){return bgUserOpts(bgOwnerPool());}
function bgStart(){
  if(!bgCan('budget.create')){emsDeny('create budgets');return;}
  bgCloseForms();
  const cur=bgBaseCurrency(bgEnt())||'INR',fy=bgFyOf(wbToday());
  bgForm={id:null,name:'',fy:fy.label,budgetType:bgCfg().budgetTypes[0]||'',ownerUid:bgOwnerPool().indexOf(bgMe())>=0?bgMe():'',currency:cur,amount:'',quarterly:false,quarters:['','','',''],
    enforcement:bgCfg().enforcement,threshold:'80',effFrom:wbToday()>fy.start?wbToday():fy.start,effTo:'',desc:'',proof:'',requireCC:false,requirePrj:false};
  renderADTPage();
}
function bgStartEdit(id){
  const b=bgRec(id);if(!b||!bgCanEditBudget(b)){showToast('Not editable','error','This budget cannot be edited now.');return;}
  bgCloseForms();
  bgForm={id:b.id,rev:bgRevOf(b),name:b.title,fy:b.fy,budgetType:b.budgetType,ownerUid:b.ownerUid,currency:b.currency,amount:String(b.amount),quarterly:!!b.quarterly,
    quarters:(b.quarters||['','','','']).map(String),enforcement:b.enforcement,threshold:String(b.threshold),effFrom:b.effFrom,effTo:b.effTo,desc:b.desc,proof:b.proof,requireCC:b.requireCC,requirePrj:b.requirePrj};
  renderADTPage();
}
function bgFormSync(){
  const d=bgForm;if(!d)return;
  [['name','bgf-name'],['amount','bgf-amount'],['threshold','bgf-thr'],['desc','bgf-desc'],['effFrom','bgf-from'],['effTo','bgf-to']].forEach(function(p){const x=bgVal(p[1]);if(x!=null)d[p[0]]=x;});
  for(let i=0;i<4;i++){const x=bgVal('bgf-q'+i);if(x!=null)d.quarters[i]=x;}
  const cs=function(id,k,fn){if(document.getElementById('csw-'+id)){const v=getCSValue(id);d[k]=fn?fn(v):v;}};
  cs('bgf-fy','fy');cs('bgf-type','budgetType');cs('bgf-cur','currency');cs('bgf-enf','enforcement');
  cs('bgf-owner','ownerUid',function(v){return idFromLabel(v,bgOwnerPool());});
  cs('bgf-q','quarterly',function(v){return v==='Phased by quarter';});
  cs('bgf-cc','requireCC',function(v){return v==='Yes';});cs('bgf-prj','requirePrj',function(v){return v==='Yes';});
}
function bgFormHook(){bgFormSync();renderADTPage();}
function bgPickProof(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}bgFormSync();bgForm.proof=f.name;renderADTPage();}
function bgFormHTML(){
  const d=bgForm,edit=d.id!=null,cfg=bgCfg();
  const fys=bgFyOptions().map(function(f){return f.label;});if(edit&&fys.indexOf(d.fy)<0)fys.unshift(d.fy);
  const pool=bgOwnerPool();
  let f=bgField('Budget Name',true,bgInput('bgf-name',d.name,'e.g. FY 2026-27 Sales Budget'),'',true)
    +bgField('Financial Year',true,apCS('bgf-fy',fys,d.fy,'Select','bgFormHook'),'April–March by default (Settings → Financial Year).')
    +bgField('Budget Type',true,apCS('bgf-type',cfg.budgetTypes,d.budgetType,'Select'))
    +bgField('Budget Owner',true,axCS('bgf-owner',bgUserOpts(pool),d.ownerUid?idLabel(d.ownerUid,pool):'','Search owner'),'Users RBAC authorizes to own budgets (budget.view and budget.util.view).')
    +bgField('Currency',true,apCS('bgf-cur',EXP_CURRENCIES,d.currency,'Select','bgFormHook'),'Entity base currency: '+(bgBaseCurrency(bgEnt())||'not set')+'.')
    +bgField('Total Budget Amount',true,bgMoneyIn('bgf-amount',d.currency,d.amount))
    +bgField('Phasing',true,apCS('bgf-q',['Annual','Phased by quarter'],d.quarterly?'Phased by quarter':'Annual','Select','bgFormHook'),
      cfg.quarterCarry?'Unspent quarter amounts carry into later quarters (Settings).':'Each quarter is its own ceiling; unspent amounts do not carry forward.');
  if(d.quarterly)for(let i=0;i<4;i++)f+=bgField('Q'+(i+1)+' Amount',true,bgMoneyIn('bgf-q'+i,d.currency,d.quarters[i]));
  f+=bgField('Enforcement',true,apCS('bgf-enf',BG_ENFORCE,d.enforcement,'Select'),'Warning asks for a justification; Blocking stops submission. An allocation can override it.')
    +bgField('Warning Threshold (%)',false,bgInput('bgf-thr',d.threshold,'e.g. 80'),'Near-limit indicator and alert only.')
    +bgField('Effective From',true,apCD('bgf-from',d.effFrom,'Select date'))+bgField('Effective To',false,apCD('bgf-to',d.effTo,'End of the year'))
    +bgField('Transactions Must Name a Cost Centre',true,apCS('bgf-cc',['No','Yes'],d.requireCC?'Yes':'No','Select'))
    +bgField('Transactions Must Name a Project',true,apCS('bgf-prj',['No','Yes'],d.requirePrj?'Yes':'No','Select'))
    +bgField('Description',false,bgArea('bgf-desc',d.desc,'What this budget authorizes'),'',true)
    +bgField('Supporting Document',false,d.proof?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+bgE(d.proof)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="bgPickProof(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · board approval, plan</span></span></label>','',true);
  return bgModal(edit?'Edit '+expKey(bgRec(d.id)):'Create Budget','A budget is authority to spend, not money. It is a draft until approved; allocations are added from its panel.',
    '<div class="ep-form-grid">'+f+'</div>',{close:'bgFormClose()',btns:'<button class="ep-save-btn" onclick="bgFormSave()">'+(edit?'Save Changes':'Save as Draft')+'</button>'});
}
function bgFormClose(){bgForm=null;renderADTPage();}
function bgFormSave(){
  bgFormSync();const d=bgForm;if(!d)return;
  if(d.id!=null){const b=bgRec(d.id);if(!b||bgRevOf(b)!==d.rev){bgForm=null;bgStaleToast(b);return;}}
  const res=bgBudgetSave({id:d.id,name:d.name,fy:d.fy,budgetType:d.budgetType,ownerUid:d.ownerUid,currency:d.currency,amount:d.amount,quarterly:d.quarterly,quarters:d.quarters,
    enforcement:d.enforcement,threshold:d.threshold,effFrom:d.effFrom,effTo:d.effTo,desc:d.desc,proof:d.proof,requireCC:d.requireCC,requirePrj:d.requirePrj});
  if(typeof res==='string'&&res){showToast('Not saved','error',res);return;}
  const id=d.id!=null?d.id:res.rec.id;
  bgForm=null;bgPageTab='budgets';bgSel=id;bgTab=d.id!=null?'basic-details':'allocations';renderADTPage();
  showToast(d.id!=null?'Budget saved':'Draft created','success',expKey(bgRec(id))+(d.id!=null?' updated.':' saved as a draft - add its allocations, then submit.'));
}

/* ── Allocation form ───────────────────────────────────────────────────── */
function bgAllocStart(bid,aid){
  const b=bgRec(bid);if(!b)return;
  if(!bgCan('budget.allocate')){emsDeny('configure allocations');return;}
  bgCloseForms();
  const a=aid?b.allocations.find(function(x){return x.id===aid;}):null;
  bgAllocForm={bid:b.id,rev:bgRevOf(b),id:a?a.id:null,dept:a?a.dept:'',category:a?a.category:'',subCat:a?a.subCat:'',ccId:a?a.ccId:'',prjId:a?a.prjId:'',
    parentId:a?(a.parentId||''):'',parentTouched:!!a,amount:a?String(a.amount):'',quarters:(a&&a.quarters?a.quarters:['','','','']).map(String),ownerUid:a?a.ownerUid:'',enforcement:a?a.enforcement:'',adopt:[]};
  if(!a)bgAllocSuggest();
  renderADTPage();
}
function bgAllocSuggest(){
  const d=bgAllocForm,b=bgRec(d.bid);if(!d||!b||d.parentTouched)return;
  const p=bgSuggestParent(b,bgScopeOf(d),d.id);d.parentId=p?p.id:'';
}
function bgAllocSync(){
  const d=bgAllocForm;if(!d)return;
  const v=bgVal('bgaf-amount');if(v!=null)d.amount=v;
  for(let i=0;i<4;i++){const x=bgVal('bgaf-q'+i);if(x!=null)d.quarters[i]=x;}
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  const all=function(x,word){return x===word?'':x;};
  let x;
  if((x=cs('bgaf-dept'))!=null)d.dept=all(x,'All departments');
  if((x=cs('bgaf-cat'))!=null){const c=all(x,'All categories');if(c!==d.category){d.category=c;d.subCat='';}}
  if((x=cs('bgaf-sub'))!=null)d.subCat=all(x,'Whole category');
  if((x=cs('bgaf-cc'))!=null){const m=bgmActive('cc').find(function(y){return bgmLabel(y)===x;});d.ccId=m?m.id:'';}
  if((x=cs('bgaf-prj'))!=null){const m=bgmActive('project').find(function(y){return bgmLabel(y)===x;});d.prjId=m?m.id:'';}
  if((x=cs('bgaf-parent'))!=null){const b=bgRec(d.bid),p=b.allocations.find(function(a){return a.key+' · '+bgScopeLabel(a)===x;});const nv=p?p.id:'';if(String(nv)!==String(d.parentId)){d.parentId=nv;d.parentTouched=true;}}
  if((x=cs('bgaf-owner'))!=null)d.ownerUid=idFromLabel(x,bgOwnerPool());
  if((x=cs('bgaf-enf'))!=null)d.enforcement=x==='Budget default'?'':x;
  const boxes=document.querySelectorAll('.bgaf-adopt');if(boxes.length)d.adopt=Array.prototype.filter.call(boxes,function(b){return b.checked;}).map(function(b){return Number(b.value);});
}
function bgAllocHook(){bgAllocSync();bgAllocSuggest();renderADTPage();}
function bgAllocFormHTML(){
  const d=bgAllocForm,b=bgRec(d.bid);if(!b)return '';
  const sc=bgScopeOf(d),self=d.id;
  const parents=b.allocations.filter(function(a){return a.id!==self&&a.status==='Active'&&bgScopeContains(a,sc)&&!bgScopeEqual(a,sc);});
  const sug=bgSuggestParent(b,sc,self);
  const adoptable=bgAdoptable(b,sc,d.parentId||null,self);
  const cc=bgmActive('cc'),pj=bgmActive('project');
  const ccSel=d.ccId?bgmRec('cc',d.ccId):null,pjSel=d.prjId?bgmRec('project',d.prjId):null;
  let f=bgField('Department',false,apCS('bgaf-dept',['All departments'].concat(csDeptNames()),d.dept||'All departments','Select','bgAllocHook'))
    +bgField('Expense Category',false,apCS('bgaf-cat',['All categories'].concat(EXP_CATEGORIES),d.category||'All categories','Select','bgAllocHook'))
    +bgField('Subcategory',false,d.category?apCS('bgaf-sub',['Whole category'].concat(EXP_SUBCATS[d.category]||[]),d.subCat||'Whole category','Select','bgAllocHook'):bgRo('Pick a category first'))
    +bgField('Cost Centre',false,apCS('bgaf-cc',['Any cost centre'].concat(cc.map(bgmLabel)),ccSel?bgmLabel(ccSel):'Any cost centre','Select','bgAllocHook'),cc.length?'':'No active cost centre (Administration → Company Structure).')
    +bgField('Project',false,apCS('bgaf-prj',['Any project'].concat(pj.map(bgmLabel)),pjSel?bgmLabel(pjSel):'Any project','Select','bgAllocHook'),pj.length?'':'No active project.')
    +bgField('Parent Allocation',false,apCS('bgaf-parent',['None (top level)'].concat(parents.map(function(a){return a.key+' · '+bgScopeLabel(a);})),
        d.parentId?(function(){const p=bgAlloc(d.parentId);return p?p.key+' · '+bgScopeLabel(p):'None (top level)';})():'None (top level)','Select','bgAllocHook'),
      sug?'Suggested: '+bgE(sug.key+' · '+bgScopeLabel(sug))+' - the narrowest line that contains this scope.':'No existing line contains this scope.')
    +bgField('Allocation Amount',true,bgMoneyIn('bgaf-amount',b.currency,d.amount),d.parentId?'Lines under '+bgE(bgAllocKey(bgAlloc(d.parentId)))+' together stay within it.':'Top-level lines together stay within the budget ('+expMoney(b.amount,b.currency)+').');
  if(b.quarterly)for(let i=0;i<4;i++)f+=bgField('Q'+(i+1),true,bgMoneyIn('bgaf-q'+i,b.currency,d.quarters[i]));
  f+=bgField('Allocation Owner',false,axCS('bgaf-owner',bgUserOpts(bgOwnerPool()),d.ownerUid?idLabel(d.ownerUid,bgOwnerPool()):'','Optional'),'Sees and tracks this line; approves its exceptions.')
    +bgField('Enforcement',false,apCS('bgaf-enf',['Budget default'].concat(BG_ENFORCE),d.enforcement||'Budget default','Select'),'Budget default: '+bgE(b.enforcement)+'.');
  if(adoptable.length)f+=bgField('Place Under This Line',false,adoptable.map(function(a){return '<label class="adv-pick-row"><input type="checkbox" class="bgaf-adopt" value="'+a.id+'"'+(d.adopt.indexOf(a.id)>=0?' checked':'')+'> '+bgE(a.key+' · '+bgScopeLabel(a)+' · '+expMoney(a.amount,b.currency))+'</label>';}).join(''),
    'These narrower lines would overlap this one. Tick them to make them its children; otherwise narrow the scope.',true);
  return bgModal((d.id?'Edit ':'Add ')+'Allocation · '+expKey(b),'Scope: <b>'+bgE(bgScopeLabel(sc))+'</b>. Leave a dimension as All to cover all of it.',
    '<div class="ep-form-grid">'+f+'</div>',{close:'bgAllocClose()',btns:'<button class="ep-save-btn" onclick="bgAllocSaveClick()">'+(d.id?'Save Changes':'Add Allocation')+'</button>'});
}
function bgAllocClose(){bgAllocForm=null;renderADTPage();}
function bgAllocSaveClick(){
  bgAllocSync();const d=bgAllocForm;if(!d)return;
  const b=bgRec(d.bid);if(!b||bgRevOf(b)!==d.rev){bgAllocForm=null;bgStaleToast(b);return;}
  const res=bgAllocSave(d.bid,{id:d.id,dept:d.dept,category:d.category,subCat:d.subCat,ccId:d.ccId,prjId:d.prjId,parentId:d.parentId,amount:d.amount,
    quarters:b.quarterly?d.quarters:null,ownerUid:d.ownerUid,enforcement:d.enforcement,adopt:d.adopt});
  if(typeof res==='string'&&res){showToast('Not saved','error',res);return;}
  bgAllocForm=null;bgTab='allocations';renderADTPage();
  showToast('Allocation saved','success',res.rec.key+' · '+bgScopeLabel(res.rec)+' · '+expMoney(res.rec.amount,b.currency)+'.');
}
function bgAllocRemove(bid,aid){
  const e=bgAllocDelete(bid,aid);if(e){showToast('Not removed','error',e);return;}
  renderADTPage();showToast('Allocation removed','success','The line was removed from the draft.');
}

/* ── Action popups (budgets, changes, funding) ─────────────────────────── */
function bgActOpen(kind,id,o){
  if(typeof rlClose==='function')rlClose();
  const host=page;
  const r=kind==='newChange'||kind==='budgetType'||kind==='fyclose'?null:(kind.indexOf('fb')===0?(kind==='fbLink'?null:(kind==='fbStatus'?fbSource(id):fbTxn(id))):(bgRec(id)||bgChg(id)));
  bgAct=Object.assign({kind:kind,id:id,host:host,rev:r?bgRevOf(r)+(r.logs?'':'|'+(r.status||'')):'',reason:'',amount:'',budgetId:r&&r.kind==='budget'?r.id:'',allocId:'',from:'',to:'',quarter:'',effFrom:wbToday(),effTo:'',
    effDate:wbToday(),proposed:'',changes:{},newLines:[],items:{},fy:'',evidence:'',sourceId:'',chgKind:'',name:'',sourceKind:'',sourceId2:null},o||{});
  const a=bgAct;
  if(kind==='revision'&&r){a.proposed=String(r.amount);r.allocations.forEach(function(x){if(x.status==='Active')a.changes[x.id]=String(x.amount);});}
  if(kind==='exception'&&r&&r.kind==='budget'){a.effTo=r.fyEnd;}
  if(kind==='opening'){a.cutoff=wbToday();a.fundId='';a.allocId='';}
  if(kind==='fyclose'){const fy=o&&o.fy||bgFyOf(wbToday()).label;a.fy=fy;}
  renderADTPage();
}
function bgActClose(){bgAct=null;renderADTPage();}
function bgActSync(){
  const a=bgAct;if(!a)return;
  ['reason','amount','proposed','name'].forEach(function(k){const x=bgVal('bga-'+k);if(x!=null)a[k]=x;});
  ['effFrom','effTo','effDate'].forEach(function(k){const x=bgVal('bga-'+k);if(x!=null)a[k]=x;});
  document.querySelectorAll('[data-bgachg]').forEach(function(el){a.changes[el.getAttribute('data-bgachg')]=el.value;});
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  let x;
  if((x=cs('bga-chgkind'))!=null)a.chgKind=x;
  if((x=cs('bga-budget'))!=null){const b=bgScopeList().find(function(y){return expKey(y)+' · '+y.title===x;});const nb=b?b.id:'';if(nb!==a.budgetId){a.budgetId=nb;a.allocId='';a.from='';a.to='';}}
  const b=a.budgetId?bgRec(a.budgetId):null;
  const allocFrom=function(v){if(!b)return '';const al=b.allocations.find(function(y){return y.key+' · '+bgScopeLabel(y)===v;});return al?al.id:'';};
  if((x=cs('bga-alloc'))!=null)a.allocId=allocFrom(x);
  if((x=cs('bga-from'))!=null)a.from=x==='Unallocated reserve'?'R':allocFrom(x);
  if((x=cs('bga-to'))!=null)a.to=x==='Unallocated reserve'?'R':allocFrom(x);
  if((x=cs('bga-quarter'))!=null)a.quarter=x?Number(String(x).replace('Q','')):'';
  if((x=cs('bga-fy'))!=null)a.fy=x;
  if((x=cs('bga-src'))!=null)a.sourceId=fbSourceFromLabel(x);
  if((x=cs('bga-fund'))!=null){const fd=bgOpeningCandidates().find(function(y){return bgFundLabel(y)===x;});const nf=fd?fd.id:'';if(nf!==a.fundId){a.fundId=nf;a.allocId='';}}
  if((x=cs('bga-portion'))!=null){const src=bgSrcRecord(a.sourceKind,a.sourceId2);const p=src?bgExcPortions(a.sourceKind,src).find(function(y){return bgPortionLabel(y)===x;}):null;a.portion=p?p.key:'';}
  {const co=bgVal('bga-cutoff');if(co!=null)a.cutoff=co;}
  document.querySelectorAll('[data-bgaitem]').forEach(function(el){const k=el.getAttribute('data-bgaitem');a.items[k]=a.items[k]||{};
    if(document.getElementById('csw-'+el.id))a.items[k].action=getCSValue(el.id)==='Carry forward'?'carry':getCSValue(el.id)?'keep':'';});
  document.querySelectorAll('[data-bgatarget]').forEach(function(el){const k=el.getAttribute('data-bgatarget');a.items[k]=a.items[k]||{};
    if(document.getElementById('csw-'+el.id)){const v=getCSValue(el.id);const t=bgNextTargets(a.fy).find(function(y){return y.label===v;});a.items[k].target=t?t.id:'';}});
  /* new revision lines */
  a.newLines.forEach(function(n,i){
    const g=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
    let y;
    if((y=g('bga-nl-dept-'+i))!=null)n.dept=y==='All departments'?'':y;
    if((y=g('bga-nl-cat-'+i))!=null)n.category=y==='All categories'?'':y;
    if((y=g('bga-nl-par-'+i))!=null){const p=b?b.allocations.find(function(al){return al.key+' · '+bgScopeLabel(al)===y;}):null;n.parentId=p?p.id:'';}
    const am=bgVal('bga-nl-amt-'+i);if(am!=null)n.amount=am;
  });
}
function bgActHook(){bgActSync();renderADTPage();}
function bgPickEvidence(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}bgActSync();bgAct.evidence=f.name;renderADTPage();}
function bgEvidenceField(a,label,hint,req){
  return bgField(label,req,a.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+bgE(a.evidence)+'</span></div>'
    :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="bgPickEvidence(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · '+hint+'</span></span></label>');
}
function bgFundLabel(f){const hm=bgHolderMap(f);return expKey(f)+' · '+f.name+' · '+idEmpName(f.custodianEid)+(hm?' (balance outside the budget)':'');}
function bgAllocOpts(b,filter){return b?b.allocations.filter(function(a){return a.status==='Active'&&(!filter||filter(a));}).map(function(a){return a.key+' · '+bgScopeLabel(a);}):[];}
function bgAllocLabel(id){const a=id?bgAlloc(id):null;return a?a.key+' · '+bgScopeLabel(a):'';}
/* Next-year allocations a closing year's commitments can be carried into. */
function bgNextTargets(fy){
  const n=bgNextFy(fy);
  const out=[];
  bgBudgets.forEach(function(b){if(b.entity!==bgEnt()||b.fy!==n.label||['Active','Scheduled','Approved'].indexOf(b.status)<0)return;
    b.allocations.forEach(function(a){if(a.status==='Active')out.push({id:a.id,label:expKey(b)+' · '+a.key+' · '+bgScopeLabel(a)});});});
  return out;
}
function bgActHTML(){
  const a=bgAct,K=a.kind;
  const area=function(id,label,req,val,ph){return bgField(label,req,bgArea('bga-'+id,val,ph),'',true);};
  let T=['','',''],f='',danger=false;
  if(K==='newChange'){
    const kinds=[];
    if(bgCan('budget.revise.request'))kinds.push('Budget Revision');if(bgCan('budget.transfer.request'))kinds.push('Budget Transfer');
    if(bgCan('budget.exception.request'))kinds.push('Budget Exception');if(bgCan('budget.manage'))kinds.push('Financial Year Close');
    const buds=bgScopeList().filter(function(b){return ['Active','Scheduled','Approved'].indexOf(b.status)>=0;});
    T=['New Budget Change','A revision changes a budget\'s total or lines; a transfer moves authority inside one budget; an exception allows a controlled overrun; a year close ends a financial year. Each goes through approval.','Continue'];
    f=bgField('Change Type',true,apCS('bga-chgkind',kinds,a.chgKind,'Select','bgActHook'))
      +(a.chgKind&&a.chgKind!=='Financial Year Close'?bgField('Budget',true,apCS('bga-budget',buds.map(function(b){return expKey(b)+' · '+b.title;}),a.budgetId?expKey(bgRec(a.budgetId))+' · '+bgRec(a.budgetId).title:'','Select budget','bgActHook')):'');
  }else if(K==='activate'||K==='deactivate'){
    const b=bgRec(a.id);
    T=[(K==='activate'?'Activate ':'Deactivate ')+expKey(b),K==='activate'?'The budget starts controlling transactions from its effective date. Overlapping live budgets are refused.':'The budget stops controlling new transactions. What it already records is kept.',K==='activate'?'Activate':'Deactivate'];
    f=K==='deactivate'?area('reason','Reason',true,a.reason):'';danger=K==='deactivate';
  }else if(K==='revision'){
    const b=bgRec(a.id);
    T=['Request Revision · '+expKey(b),'Now '+expMoney(b.amount,b.currency)+' (v'+b.version+'). A reduction may not go below what is already occupied. Nothing changes until it is approved.','Submit Revision'];
    f=bgField('Proposed Budget Amount',true,bgMoneyIn('bga-proposed',b.currency,a.proposed),'Currently '+expMoney(b.amount,b.currency)+'; occupied '+expMoney(bgOcc(b,null).occupied,b.currency)+'.')
      +bgField('Effective Date',true,apCD('bga-effDate',a.effDate,'Select date'),'Applies on approval, or on this date if later.')
      +bgField('Allocation Amounts',false,'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Allocation</th><th class="wb-num">Now</th><th class="wb-num">Occupied</th><th>New Amount</th></tr></thead><tbody>'
        +bgAllocOrder(b).filter(function(x){return x.status==='Active';}).map(function(x){return '<tr><td class="csag-td"><div style="padding-left:'+(bgDepth(x)*14)+'px">'+bgE(x.key+' · '+bgScopeLabel(x))+'</div></td><td class="csag-td wb-num">'+expMoney(x.amount,b.currency)+'</td>'
          +'<td class="csag-td wb-num">'+expMoney(bgOcc(b,x.id).occupied,b.currency)+'</td><td class="csag-td"><input class="ep-form-input ca-rev-amt" data-bgachg="'+x.id+'" type="number" min="0" step="0.01" value="'+attrSafe(a.changes[x.id]==null?'':a.changes[x.id])+'"></td></tr>';}).join('')
        +'</tbody></table></div>','Change only the lines that move. A parent stays at least the sum of its children.',true)
      +bgField('New Lines',false,a.newLines.map(function(n,i){
          return '<div class="bg-newline">'+apCS('bga-nl-dept-'+i,['All departments'].concat(csDeptNames()),n.dept||'All departments','Department')
            +apCS('bga-nl-cat-'+i,['All categories'].concat(EXP_CATEGORIES),n.category||'All categories','Category')
            +apCS('bga-nl-par-'+i,['None (top level)'].concat(bgAllocOpts(b)),n.parentId?bgAllocLabel(n.parentId):'None (top level)','Parent')
            +'<input class="ep-form-input ca-rev-amt" id="bga-nl-amt-'+i+'" type="number" min="0" step="0.01" value="'+attrSafe(n.amount||'')+'" placeholder="Amount">'
            +'<button class="att-row-btn is-danger" title="Remove" onclick="bgActSync();bgAct.newLines.splice('+i+',1);renderADTPage()">'+AX_ICO.trash+'</button></div>';}).join('')
        +'<button class="att-link" onclick="bgActSync();bgAct.newLines.push({dept:\'\',category:\'\',parentId:\'\',amount:\'\'});renderADTPage()">'+BG_ICO.plus+' Add line</button>','',true)
      +area('reason','Reason',true,a.reason,'Why the budget must change');
  }else if(K==='transfer'){
    const b=bgRec(a.id);
    const opts=['Unallocated reserve'].concat(bgAllocOpts(b));
    T=['Request Transfer · '+expKey(b),'Moves authority between lines of '+expKey(b)+'. The budget total stays '+expMoney(b.amount,b.currency)+'; nothing is created or lost.','Submit Transfer'];
    f=bgField('From',true,apCS('bga-from',opts,a.from==='R'?'Unallocated reserve':bgAllocLabel(a.from),'Source','bgActHook'),
        a.from&&a.from!=='R'?'Free to move: '+expMoney(Math.max(0,bgM(bgAlloc(a.from).amount-Math.max(bgOcc(b,a.from).occupied,bgSum(bgChildren(b,a.from),function(x){return x.amount;})))),b.currency):a.from==='R'?'Reserve: '+expMoney(bgReserve(b),b.currency):'')
      +bgField('To',true,apCS('bga-to',opts,a.to==='R'?'Unallocated reserve':bgAllocLabel(a.to),'Destination'))
      +bgField('Transfer Amount',true,bgMoneyIn('bga-amount',b.currency,a.amount))
      +(b.quarterly?bgField('Quarter',true,apCS('bga-quarter',['Q1','Q2','Q3','Q4'],a.quarter?'Q'+a.quarter:'','Select')):'')
      +area('reason','Reason',true,a.reason);
  }else if(K==='opening'){
    const b=bgRec(a.id),funds=bgOpeningCandidates(),fd=a.fundId?impFund(a.fundId):null,hm=fd?bgHolderMap(fd):null;
    if(hm&&hm.budget===b.id)a.allocId=hm.alloc;
    const pv=fd&&a.cutoff&&a.cutoff<=wbToday()?bgOpeningPreview(fd,a.cutoff):null;
    T=['Map Opening Exposure · '+expKey(b),'Brings an existing imprest fund\'s balance, held outside the budget, into one of this budget\'s lines as at a cut-off date. The fund\'s ledger and its custodian\'s accountability do not change. A Blocking line refuses it.','Map Opening Exposure'];
    f=bgField('Imprest Fund',true,apCS('bga-fund',funds.map(bgFundLabel),fd?bgFundLabel(fd):'','Select fund','bgActHook'))
      +bgField('Allocation',true,hm?bgRo(bgAllocLabel(hm.alloc)):apCS('bga-alloc',bgAllocOpts(b),a.allocId?bgAllocLabel(a.allocId):'','Select line'),
        hm?(hm.budget===b.id?'The fund is already under budget control in this line.':'The fund is under budget control in another budget; map it there.'):'')
      +bgField('Cut-off Date',true,apCD('bga-cutoff',a.cutoff,'Select date','bgActHook'),'The balance outside the budget as at this date is brought in; later movements follow it.')
      +(pv?bgField('Balance Outside the Budget',false,bgRo(expMoney(pv.atCutoff,fd.currency)+' as at '+cdLabel(a.cutoff)+' · '+expMoney(pv.recognized,fd.currency)+' recognized now'),'',true):'')
      +area('reason','Reason',true,a.reason,'Why this balance should consume the budget (kept in the audit trail)');
  }else if(K==='exception'){
    const src=a.sourceKind?bgSrcRecord(a.sourceKind,a.sourceId2):null;
    const b=src?null:bgRec(a.id);
    if(src){
      /* One exception per budget part; the amount is calculated, and a requester never sees budget figures (decisions 4 and 8). */
      const parts=bgExcPortions(a.sourceKind,src),p=parts.find(function(x){return x.key===a.portion;})||(parts.length===1?parts[0]:null);
      const det=p?bgDetailFor({budget:p.budget,leaf:p.alloc},src):false;
      T=['Request Budget Exception · '+expKey(src),'An approved exception lets this part of the request go ahead. It does not approve the request, and the Capping Limit still applies. The amount is calculated from what the part exceeds the budget by'+(det?'.':'; approvers see the figures.'),'Submit Request'];
      f=(parts.length>1?bgField('Budget Part',true,apCS('bga-portion',parts.map(bgPortionLabel),p?bgPortionLabel(p):'','Select part','bgActHook'),'Each budget line and period needs its own exception.',true)
          :p?bgField('Budget Part',false,bgRo(bgPortionLabel(p)),'',true):'<div class="wb-empty-sm">Nothing in this request needs a budget exception.</div>')
        +(det&&p?bgField('Budget',false,bgRo(expKey(bgRec(p.budget))+' · '+bgRec(p.budget).title))+bgField('Exception Amount',false,bgRo(expMoney(p.need,p.currency)),'Calculated: what this part exceeds the budget by.'):'')
        +area('reason','Reason',true,a.reason,'Why this request must exceed the budget');
    }else{
      T=['Request Budget Exception · '+expKey(b),'Allows a controlled overrun of one allocation (or the budget) up to an amount, for a period. It never approves a claim or advance by itself.','Submit Request'];
      f=bgField('Allocation',false,apCS('bga-alloc',['Whole budget'].concat(bgAllocOpts(b,function(x){return bgFull(b)||x.ownerUid===bgMe();})),a.allocId?bgAllocLabel(a.allocId):'Whole budget','Select'))
        +bgField('Exception Amount',true,bgMoneyIn('bga-amount',b.currency,a.amount))
        +bgField('Effective From',true,apCD('bga-effFrom',a.effFrom,'Select date'))+bgField('Effective To',true,apCD('bga-effTo',a.effTo,'Select date'))
        +area('reason','Reason',true,a.reason);
    }
  }else if(K==='fyclose'){
    const fys=bgUniq(bgBudgets.filter(function(b){return b.entity===bgEnt()&&bgFyStatus(b.fy).status!=='Closed'&&['Draft','Rejected','Withdrawn'].indexOf(b.status)<0;}).map(function(b){return b.fy;}));
    const open=a.fy?bgCloseReview(a.fy):[],targets=a.fy?bgNextTargets(a.fy):[],next=a.fy?bgNextFy(a.fy):null;
    T=['Close Financial Year','Nothing is carried forward automatically. Requests still in approval must be resolved first; committed amounts are carried into a '+(next?next.label:'next-year')+' allocation you choose; issued advances and imprest stay accountable.','Submit Close Request'];
    f=bgField('Financial Year',true,apCS('bga-fy',fys,a.fy,'Select','bgActHook'))
      +bgField('Open Items',false,open.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Source</th><th class="wb-num">Pending</th><th class="wb-num">Committed</th><th class="wb-num">Exposure</th><th>Action</th><th>Into</th></tr></thead><tbody>'
          +open.map(function(x,i){const it=a.items[x.key]||{};const must=x.committed>0;
            return '<tr><td class="csag-td" style="white-space:normal">'+bgE(x.label)+'<div class="lp-c-sub">'+bgE(x.kind)+'</div></td><td class="csag-td wb-num">'+(x.pending?expMoney(x.pending,''):'—')+'</td>'
              +'<td class="csag-td wb-num">'+(x.committed?expMoney(x.committed,''):'—')+'</td><td class="csag-td wb-num">'+(x.exposure?expMoney(x.exposure,''):'—')+'</td>'
              +'<td class="csag-td"><span id="bga-it-'+i+'" data-bgaitem="'+attrSafe(x.key)+'">'+apCS('bga-it-'+i,must?['Carry forward']:['Keep in '+a.fy,'Carry forward'],it.action==='carry'?'Carry forward':it.action==='keep'?'Keep in '+a.fy:must?'':'Keep in '+a.fy,'Select','bgActHook')+'</span></td>'
              +'<td class="csag-td">'+(it.action==='carry'||must?'<span id="bga-tg-'+i+'" data-bgatarget="'+attrSafe(x.key)+'">'+apCS('bga-tg-'+i,targets.map(function(t){return t.label;}),it.target?(targets.find(function(t){return t.id===it.target;})||{}).label||'':'','Next-year allocation')+'</span>':'—')+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">'+(a.fy?'Nothing pending, committed or exposed in '+a.fy+'.':'Pick a year.')+'</div>',
        targets.length||!open.length?'Pending items block the close. Exposure is kept in the closed year unless you carry it.':'No active '+(next?next.label:'')+' budget yet: create and approve one to carry commitments into.',true)
      +area('reason','Reason',true,a.reason);
  }else if(K==='cancelChg'){
    const c=bgChg(a.id);
    T=['Cancel '+expKey(c),'The change is closed without being applied. Its history stays.','Cancel Change'];f=area('reason','Reason',true,a.reason);danger=true;
  }else if(K==='budgetType'){
    T=['Add Budget Type','Budget types group budgets in listings and reports.','Add Type'];
    f=bgField('Budget Type',true,bgInput('bga-name',a.name,'e.g. Project'),'',true);
  }else if(K==='fbVerify'){
    const t=fbTxn(a.id);
    T=['Verify '+t.key,fbTxnLine(t)+'. Verify only against the bank advice, cash book or other evidence; the recorder cannot verify their own entry.','Verify'];
    f=bgEvidenceField(a,'Evidence','bank advice or cash book page',bgCfg(t.entity).fundingEvidence&&!t.evidence)+(t.evidence?'<div class="ep-form-group"><div class="ea-hint">On file: '+bgE(t.evidence)+'</div></div>':'');
  }else if(K==='fbReject'||K==='fbReverse'){
    const t=fbTxn(a.id);
    T=[(K==='fbReject'?'Reject ':'Reverse ')+t.key,K==='fbReject'?'The entry never enters the recorded balance.':'A reversal entry is recorded; it takes effect once someone else verifies it. The original stays.',K==='fbReject'?'Reject':'Record Reversal'];
    f=area('reason','Reason',true,a.reason);danger=true;
  }else if(K==='fbStatus'){
    const s=fbSource(a.id);
    T=[(s.status==='Active'?'Deactivate ':'Activate ')+s.key,s.status==='Active'?'An inactive source takes no new ordinary entries; its history and balance stay.':'The source can take entries again.',s.status==='Active'?'Deactivate':'Activate'];
    f=area('reason','Reason',true,a.reason);danger=s.status==='Active';
  }else if(K==='fbLink'){
    const p=fbUnlinked().find(function(x){return x.key===a.key;});
    T=['Link Payout to Funding Source',p?bgE(p.kind+' '+p.key+' · '+p.recKey+' · '+expMoney(p.amount,p.currency)+' paid '+cdLabel(p.date)):'','Record Link'];
    f=p?bgField('Funding Source',true,apCS('bga-src',fbSourcesHere(true).filter(function(s){return s.currency===p.currency;}).map(fbSourceLabel),a.sourceId?fbSourceLabel(fbSource(a.sourceId)):'','Select source'),
        'Creates a pending outflow on the source for this already-verified payout; someone else verifies it. The payment record itself is not changed'+(p.payroll?'. Payroll handoff never debits a source by itself.':'.'),true):'<div class="wb-empty-sm">This payout is already linked.</div>';
  }
  return bgModal(T[0],T[1],'<div class="ep-form-grid">'+f+'</div>',{close:'bgActClose()',btns:'<button class="ep-save-btn'+(danger?' is-danger':'')+'" onclick="bgActSubmit()">'+bgE(T[2])+'</button>'},'ca-act-modal');
}
function bgActSubmit(){
  bgActSync();
  const a=bgAct;if(!a)return;
  const K=a.kind;
  /* Concurrency: refuse to act on a record that changed while the popup was open. */
  const r=K==='newChange'||K==='budgetType'||K==='fyclose'||K==='fbLink'?null:(K.indexOf('fb')===0?(K==='fbStatus'?fbSource(a.id):fbTxn(a.id)):(bgRec(a.id)||bgChg(a.id)));
  if(r&&bgRevOf(r)+(r.logs?'':'|'+(r.status||''))!==a.rev){bgAct=null;bgStaleToast(r);return;}
  let err='',msg='',after=null;
  if(K==='newChange'){
    if(!a.chgKind){showToast('Pick the change type','error');return;}
    if(a.chgKind==='Financial Year Close'){bgAct=null;bgActOpen('fyclose',null);return;}
    if(!a.budgetId){showToast('Pick the budget','error');return;}
    const k={'Budget Revision':'revision','Budget Transfer':'transfer','Budget Exception':'exception'}[a.chgKind];
    bgAct=null;bgActOpen(k,a.budgetId);return;
  }
  if(K==='activate'){err=bgActivate(a.id);msg='Budget activation recorded';}
  else if(K==='deactivate'){err=bgDeactivate(a.id,a.reason);msg='Budget deactivated';}
  else if(K==='revision'){
    const b=bgRec(a.id);
    const changes=Object.keys(a.changes).filter(function(id){const x=bgAlloc(Number(id));return x&&String(a.changes[id]).trim()!==''&&bgM(parseFloat(a.changes[id]))!==x.amount;}).map(function(id){return {allocId:Number(id),amount:a.changes[id]};});
    const res=bgRevisionCreate({budgetId:b.id,proposedAmount:a.proposed,changes:changes,newLines:a.newLines.filter(function(n){return n.amount;}),effDate:a.effDate,reason:a.reason},true);
    err=res.error||'';if(!err)after=res.rec;msg='Revision submitted';
  }else if(K==='transfer'){
    const res=bgTransferCreate({budgetId:a.id,fromAllocId:a.from==='R'?'':a.from,toAllocId:a.to==='R'?'':a.to,amount:a.amount,quarter:a.quarter,reason:a.reason},true);
    if(!a.from||!a.to)res.error=res.error||'Pick the source and the destination.';
    err=res.error||'';if(!err)after=res.rec;msg='Transfer submitted';
  }else if(K==='exception'){
    const res=a.sourceKind?bgExceptionCreate({sourceKind:a.sourceKind,sourceId:a.sourceId2,portion:a.portion,reason:a.reason},true)
      :bgExceptionCreate({budgetId:a.id,allocId:a.allocId,amount:a.amount,effFrom:a.effFrom,effTo:a.effTo,reason:a.reason},true);
    err=res.error||'';if(!err)after=res.rec;msg='Exception requested';
  }else if(K==='fyclose'){
    const items=Object.keys(a.items).map(function(k){return {key:k,action:a.items[k].action,target:a.items[k].target};});
    const res=bgCloseCreate({fy:a.fy,items:items,reason:a.reason},true);err=res.error||'';if(!err)after=res.rec;msg='Year close submitted';
  }else if(K==='cancelChg'){err=bgChangeCancel(a.id,a.reason);msg='Change cancelled';}
  else if(K==='budgetType'){err=bgTypeAdd(a.name);msg='Budget type added';}
  else if(K==='opening'){const res=bgOpeningMap({fundId:a.fundId,allocId:a.allocId,cutoff:a.cutoff,reason:a.reason});err=res.error||'';msg='Opening exposure mapped';}
  else if(K==='fbVerify'){err=fbTxnVerify(a.id,{evidence:a.evidence});msg='Entry verified';}
  else if(K==='fbReject'){err=fbTxnReject(a.id,a.reason);msg='Entry rejected';}
  else if(K==='fbReverse'){const res=fbTxnReverse(a.id,a.reason);err=res.error||'';msg='Reversal recorded - pending verification';}
  else if(K==='fbStatus'){const s=fbSource(a.id);err=fbSourceSetStatus(a.id,s.status==='Active'?'Inactive':'Active',a.reason);msg='Source '+(s.status==='Active'?'activated':'deactivated');}
  else if(K==='fbLink'){const res=fbLinkPayout(a.key,a.sourceId);err=res.error||'';msg='Link recorded - pending verification';}
  if(err){showToast('Not saved','error',err);return;}
  bgAct=null;
  if(after&&a.host==='budgets'){bgPageTab='changes';bgChgSel=after.id;bgChgTab='basic-details';}
  renderADTPage();
  const st=after?caActiveStage(after):null;
  showToast(msg,'success',after?expKey(after)+(st?' is with Stage '+st.n+' · '+caNs(st.approvers)+'.':'.'):(r&&r.key&&r.prefix?expKey(r)+'.':''));
}

/* ── Budget Changes ────────────────────────────────────────────────────── */
function bgChgRows(){
  const q=String(bgChgQ||'').trim().toLowerCase();
  return bgChgList().filter(function(c){
    if(q&&![expKey(c),c.title,c.name,c.reason,c.fy].concat(c.budgetId?[expKey(bgRec(c.budgetId)||{prefix:'',key:''})]:[]).some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(bgChgKindF&&bgKindLabel(c.kind)!==bgChgKindF)return false;
    if(bgChgStatusF&&bgChgShown(c)!==bgChgStatusF&&c.status!==bgChgStatusF)return false;
    return true;
  });
}
function bgChgApply(){bgChgQ=lpSearchValue('bgc-f-q');bgChgKindF=bgPick('bgc-f-kind','All Types');bgChgStatusF=bgPick('bgc-f-status','All Statuses');bgChgSel=null;renderADTPage();}
function bgChgReset(){bgChgQ='';bgChgKindF='';bgChgStatusF='';bgChgSel=null;renderADTPage();}
function bgChgStat(s){bgChgStatusF=bgChgStatusF===s?'':s;bgChgSel=null;renderADTPage();}
function bgChgAmount(c){
  if(c.kind==='budget revision')return expMoney(c.currentAmount,c.currency)+' → '+expMoney(c.proposedAmount,c.currency);
  if(c.kind==='budget exception')return expMoney(caTotal(c),c.currency)+(c.approvedLimit?' · approved '+expMoney(c.approvedLimit,c.currency):'');
  if(c.kind==='financial year close')return expMoney(caTotal(c),c.currency);
  return expMoney(c.amount,c.currency);
}
function bgChgListHTML(){
  const all=bgChgList(),rows=bgChgRows();
  if(bgChgSel!=null&&!rows.some(function(c){return c.id===bgChgSel;}))bgChgSel=null;
  const pgn=listPage('budget-changes',[bgChgQ,bgChgKindF,bgChgStatusF].join('|'),rows.map(function(c,i){
    const b=c.budgetId?bgRec(c.budgetId):null,shown=bgChgShown(c);
    return '<tr class="bgc-row'+(bgChgSel===c.id?' lp-row-selected':'')+'" id="bgc-row-'+c.id+'" style="cursor:pointer" onclick="bgChgOpen('+c.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(c.title)+'">'+bgE(c.title)+'</div><div class="lp-c-sub">'+expKey(c)+' · '+bgE(bgKindLabel(c.kind))+(c.sourceRef?' · for '+bgE(c.sourceRef):'')+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+(b?expKey(b)+' '+bgE(b.title):bgE(c.fy||''))+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+bgChgAmount(c)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+bgE(caN(c.createdBy))+'</div><div class="lp-c-sub">'+bgE(c.createdAt)+'</div></td>'
      +'<td>'+axBadge(statusTone(shown),shown)+(c.applyError?'<div class="lp-c-sub exp-cap-over">Not applied</div>':'')+'</td>'
      +'<td class="ca-c-stage">'+caStageCell(c)+'</td></tr>';
  }),bgEmpty(7,'No budget change matches this filter.'));
  const cnt=function(f){return all.filter(f).length;};
  const tiles=caStat('Awaiting Approval',cnt(function(c){return c.status==='Awaiting Approval';}),bgChgStatusF==='Awaiting Approval','bgChgStat(\'Awaiting Approval\')')
    +caStat('Applied',cnt(function(c){return c.status==='Applied';}),bgChgStatusF==='Applied','bgChgStat(\'Applied\')','ok')
    +caStat('Active',cnt(function(c){return bgChgShown(c)==='Active';}),bgChgStatusF==='Active','bgChgStat(\'Active\')','info')
    +caStat('Rejected',cnt(function(c){return c.status==='Rejected';}),bgChgStatusF==='Rejected','bgChgStat(\'Rejected\')','bad');
  return '<div class="lp-page">'+dashboardBackHTML()
    +bgFilterBar(lpSearchField('bgc-f-q',bgChgQ,'Search ID, budget or reason','bgChgApply()')
      +apCS('bgc-f-kind',BG_CHG_KINDS.map(function(k){return k[1];}),bgChgKindF,'All Types')
      +apCS('bgc-f-status',BG_CHG_STATUSES.concat(['Active','Consumed','Expired']),bgChgStatusF,'All Statuses')
      +clearFiltersBtn([bgChgQ,bgChgKindF,bgChgStatusF],'bgChgReset()')+'<button class="lp-pill-search" onclick="bgChgApply()">Search</button>',tiles)
    +bgSplit('bgc','<table class="lp-table ax-table exp-table bg-table"><thead><tr><th>S. No</th><th>Change</th><th>Budget</th><th>Amount</th><th>Requested By</th><th>Status</th><th>Current Stage</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,bgChgSel!=null,renderBgcSidebar)
    +'</div>';
}
function bgChgOpen(id,tab){
  const c=bgChg(id);
  if(!bgChgVisible(c)){showToast('Not available','error','This change is outside your access.');return;}
  bgChgTab=tab||sbKeepTab(bgChgSel,bgChgTab);bgChgSel=id;
  const sb=document.getElementById('bgc-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('bgc',renderBgcSidebar);
  document.querySelectorAll('.bgc-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='bgc-row-'+id);});
}
function bgChgClose(){bgChgSel=null;const sb=document.getElementById('bgc-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.bgc-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function bgChgNav(t){bgChgTab=t;isbTab('bgc',renderBgcSidebar);}
function renderBgcSidebar(){
  const c=bgChg(bgChgSel);if(!c)return '';
  if(!bgChgVisible(c))return '<div class="lp-isb-body"><div class="wb-empty-sm">This change is not available to you.</div></div>';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'approval',label:'Approval'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===bgChgTab;}))bgChgTab='basic-details';
  const shown=bgChgShown(c);
  const hero=sbHero({icon:BG_ICO.chg,name:bgE(c.title),meta:[expKey(c),bgKindLabel(c.kind)],status:axBadge(statusTone(shown),shown)});
  let body;
  if(bgChgTab==='approval')body=hero+caApprovalTabHTML(c);
  else if(bgChgTab==='logs')body=lpLogsView(c.logs,'');
  else if(bgChgTab==='history')body=sbHistoryHTML(c);
  else if(bgChgTab==='workflow')body=wfTimelineHTML(bgWorkflowRows(c));
  else body=hero+bgChgBasicHTML(c);
  return axTabBar('bgc',tabs,bgChgTab,'bgChgNav','bgChgClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function bgChgBasicHTML(c){
  const b=c.budgetId?bgRec(c.budgetId):null,me=bgMe();
  let act='';
  if(c.status==='Draft'&&(c.createdBy===me||bgCan('budget.manage')))act+=bgBtn('Submit','bgSubmitClick('+c.id+')',true);
  if((c.createdBy===me||bgCan('budget.manage'))&&(c.status==='Draft'||(c.applyError&&['Approved','Partially Approved'].indexOf(c.status)>=0&&c.kind!=='budget exception')||(c.kind==='budget revision'&&c.status==='Approved'&&!c.appliedAt)))
    act+=bgBtn('Cancel','bgActOpen(\'cancelChg\','+c.id+')',false,true);
  let det='';
  if(c.kind==='budget revision'){
    det=axField(AX_ICO.fCash,'Budget Amount',expMoney(c.currentAmount,c.currency)+' → '+expMoney(c.proposedAmount,c.currency)+' <span class="ax-sub">'+(c.change>=0?'+':'−')+expMoney(Math.abs(c.change),c.currency)+'</span>')
      +axField(AX_ICO.fCal,'Effective Date',cdLabel(c.effDate))
      +axField(AX_ICO.fTag,'Allocation Changes',c.changes.length?c.changes.map(function(x){return bgE(x.key)+' '+expMoney(x.from,c.currency)+' → '+expMoney(x.amount,c.currency);}).join('<br>'):'None',true)
      +axField(AX_ICO.fTag,'New Lines',c.newLines.length?c.newLines.map(function(n){return bgE(bgScopeLabel(n))+' '+expMoney(n.amount,c.currency)+(n.parentId?' under '+bgE(bgAllocKey(bgAlloc(n.parentId))):'');}).join('<br>'):'None',true);
  }else if(c.kind==='budget transfer'){
    det=axField(AX_ICO.fTag,'From',bgE(c.fromLabel))+axField(AX_ICO.fTag,'To',bgE(c.toLabel))+axField(AX_ICO.fCash,'Amount',expMoney(c.amount,c.currency))
      +(c.quarter?axField(AX_ICO.fCal,'Quarter','Q'+c.quarter):'');
  }else if(c.kind==='budget exception'){
    const used=bgExcUsed(c);
    det=axField(AX_ICO.fTag,'Allocation',c.allocId?bgE(bgAllocLabel(c.allocId)):'Whole budget')
      +axField(AX_ICO.fTag,'For',c.sourceRef?bgE(c.sourceRef)+' <span class="ax-sub">this request only</span>':'Any request in the allocation')
      +axField(AX_ICO.fCash,'Requested',expMoney(caTotal(c),c.currency))
      +axField(AX_ICO.fCash,'Approved Authority',c.approvedLimit?expMoney(c.approvedLimit,c.currency):'—')
      +axField(AX_ICO.fCash,'Used / Remaining',c.approvedLimit?expMoney(used,c.currency)+' / '+expMoney(bgExcRemaining(c),c.currency):'—')
      +axField(AX_ICO.fCal,'Period',cdLabel(c.effFrom)+' – '+cdLabel(c.effTo))
      +axField(AX_ICO.fTag,'Uses',Object.keys(c.uses||{}).length?Object.keys(c.uses).map(function(k){const u=c.uses[k];return bgE(u.ref)+' · '+expMoney(u.amount,c.currency)+' <span class="ax-sub">'+bgE(u.at)+'</span>';}).join('<br>'):'Not used yet',true);
  }else if(c.kind==='financial year close'){
    det=axField(AX_ICO.fCal,'Financial Year',bgE(c.fy))+axField(AX_ICO.fTag,'Budgets',c.budgetIds.map(function(id){const x=bgRec(id);return x?expKey(x):'';}).join(', '))
      +axField(AX_ICO.fTag,'Carry Forward',(c.items||[]).filter(function(i){return i.action==='carry';}).map(function(i){const s=bgStates[i.key];return bgE(s?s.label:i.key)+' → '+bgE(bgAllocKey(bgAlloc(i.target)));}).join('<br>')||'Nothing',true);
  }
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(c.applyError?'<div class="wb-note is-bad"><b>Approved but not applied</b><div class="wb-note-sub">'+bgE(c.applyError)+'</div></div>':'')
    +(c.status==='Draft'?(function(){const e=bgEnginePreflight(c);return e.error?'<div class="wb-note is-wait"><b>Cannot be submitted as it stands</b><div class="wb-note-sub">'+bgE(e.error)+'</div></div>':'';})():'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Change ID',expKey(c))+axField(AX_ICO.fBox,'Type',bgKindLabel(c.kind))
    +(b?axField(AX_ICO.fTag,'Budget',expKey(b)+' · '+bgE(b.title)+(b.version?' <span class="ax-sub">v'+b.version+' now</span>':'')):'')
    +det
    +axField(AX_ICO.fUser,'Requested By',bgE(caN(c.createdBy))+' <span class="ax-sub">'+bgE(c.createdAt)+'</span>')
    +axField(AX_ICO.fTag,'Applied',c.appliedAt?bgE(c.appliedAt):'Not yet')
    +axField(EXP_ICO.note,'Reason',bgE(c.reason),true)
    +'</div>';
}

/* ── Corporate Funding ─────────────────────────────────────────────────── */
function fbSourceLabel(s){return s?s.key+' · '+s.name+' ('+s.currency+')':'';}
function fbSourceFromLabel(v){const s=fbSourcesHere().find(function(x){return fbSourceLabel(x)===v;});return s?s.id:'';}
function fbTxnLine(t){const s=fbSource(t.sourceId);return t.type+(t.type==='Adjustment'?' ('+(t.dir>0?'increase':'decrease')+')':'')+' of '+expMoney(t.amount,t.currency)+' on '+(s?s.key+' '+s.name:'')+(t.ref?' · ref '+t.ref:'');}
function fbSubs(){
  const s=[['sources','Funding Sources'],['ledger','Funding Ledger']];
  if(['funding.transaction.create','funding.transaction.verify','funding.source.manage','funding.report.view'].some(bgCan))s.push(['recon','Reconciliation']);
  return s;
}
function fbSubPick(k){if(fbSub===k)return;bgCloseForms();fbSel=null;fbSub=k;fbQ='';fbStatusF='';renderADTPage();}
function fbHTML(){
  const subs=fbSubs();if(!subs.some(function(x){return x[0]===fbSub;}))fbSub=subs[0][0];
  const strip='<div class="segmented is-compact adv-set-subs">'+subs.map(function(x){return '<button type="button" class="seg-btn'+(fbSub===x[0]?' active':'')+'" onclick="fbSubPick(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>';
  const c=bgCfg();
  const note='<div class="wb-note"><b>Recorded Funding Balance (Internal)</b>: from verified ADT entries; not a bank balance. '
    +'Funding-source tracking is <b>'+(c.fundingTracking?'on':'off')+'</b> for '+bgE(idEntityName(bgEnt()))+(c.fundingTracking?': advance and imprest disbursements and manual reimbursements name the source they are paid from.':': payouts are not linked to sources until it is turned on (Settings).')+'</div>';
  let body;
  if(fbSub==='ledger')body=fbLedgerHTML();else if(fbSub==='recon')body=fbReconHTML();else body=fbSourcesHTML();
  return '<div class="lp-page adv-settings">'+strip+note+body+'</div>';
}
function fbSourcesHTML(){
  const all=fbSourcesHere(),q=String(fbQ||'').trim().toLowerCase();
  const rows=all.filter(function(s){return (!q||[s.key,s.name,s.code,s.bank,s.type].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))&&(!fbStatusF||s.status===fbStatusF);});
  if(fbSel!=null&&!rows.some(function(s){return s.id===fbSel;}))fbSel=null;
  const pgn=listPage('fb-sources',[fbQ,fbStatusF].join('|'),rows.map(function(s,i){
    const bal=fbBalance(s),fl=fbInflight(s);
    return '<tr class="fbs-row'+(fbSel===s.id?' lp-row-selected':'')+'" id="fbs-row-'+s.id+'" style="cursor:pointer" onclick="fbOpen('+s.id+')"><td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc">'+bgE(s.name)+'</div><div class="lp-c-sub">'+s.key+' · '+bgE(s.code)+'</div></td>'
      +'<td><div class="lp-c-plain">'+bgE(s.type)+'</div><div class="lp-c-sub">'+bgE([s.bank,s.maskedRef].filter(Boolean).join(' · ')||'—')+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain'+(bal<0?' exp-cap-over':'')+'">'+expMoney(bal,s.currency)+'</div><div class="lp-c-sub">recorded (internal)</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(fl,s.currency)+'</div><div class="lp-c-sub">in progress</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+expMoney(fbReserved(s),s.currency)+'</div><div class="lp-c-sub">available '+expMoney(fbAvailable(s),s.currency)+'</div></td>'
      +'<td><div class="lp-c-plain">'+bgE(s.enforcement)+'</div></td><td>'+axBadge(statusTone(s.status),s.status)+'</td></tr>';
  }),bgEmpty(8,'No funding source yet.'));
  return bgFilterBar(lpSearchField('fbs-f-q',fbQ,'Search source, code or bank','fbApply()')+apCS('fbs-f-status',['Active','Inactive'],fbStatusF,'All Statuses')
      +clearFiltersBtn([fbQ,fbStatusF],'fbReset()')+'<button class="lp-pill-search" onclick="fbApply()">Search</button>',
      caStat('Active',all.filter(function(s){return s.status==='Active';}).length,fbStatusF==='Active','fbStat(\'Active\')','ok')+caStat('Inactive',all.filter(function(s){return s.status==='Inactive';}).length,fbStatusF==='Inactive','fbStat(\'Inactive\')','idle'))
    +bgSplit('fbs','<table class="lp-table ax-table exp-table bg-table"><thead><tr><th>S. No</th><th>Funding Source</th><th>Type</th><th>Recorded Balance</th><th>Payouts in Progress</th><th>Reserved · Available</th><th>Balance Rule</th><th>Status</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,fbSel!=null,renderFbsSidebar);
}
function fbApply(){fbQ=lpSearchValue(fbSub==='ledger'?'fbt-f-q':'fbs-f-q');fbStatusF=bgPick(fbSub==='ledger'?'fbt-f-status':'fbs-f-status','All Statuses');fbSel=null;renderADTPage();}
function fbReset(){fbQ='';fbStatusF='';fbSel=null;renderADTPage();}
function fbStat(s){fbStatusF=fbStatusF===s?'':s;fbSel=null;renderADTPage();}
function fbOpen(id,tab){
  fbTab=tab||sbKeepTab(fbSel,fbTab);fbSel=id;
  const key=fbSub==='ledger'?'fbt':'fbs';
  const sb=document.getElementById(key+'-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab(key,fbSub==='ledger'?renderFbtSidebar:renderFbsSidebar);
  document.querySelectorAll('.'+key+'-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id===key+'-row-'+id);});
}
function fbClose(){fbSel=null;['fbs','fbt'].forEach(function(k){const sb=document.getElementById(k+'-split-sb');if(sb)sb.classList.remove('open');});document.querySelectorAll('.fbs-row,.fbt-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function fbNav(t){fbTab=t;isbTab(fbSub==='ledger'?'fbt':'fbs',fbSub==='ledger'?renderFbtSidebar:renderFbsSidebar);}
function renderFbsSidebar(){
  const s=fbSource(fbSel);if(!s||s.entity!==bgEnt())return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'ledger',label:'Ledger'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
  if(!tabs.some(function(t){return t.id===fbTab;}))fbTab='basic-details';
  const hero=sbHero({icon:BG_ICO.fund,name:bgE(s.name),meta:[s.key,s.type,s.currency],status:axBadge(statusTone(s.status),s.status)});
  let body;
  if(fbTab==='ledger')body=hero+fbTxnTableHTML(fbTxns.filter(function(t){return t.sourceId===s.id;}).slice().reverse(),true);
  else if(fbTab==='logs')body=lpLogsView(s.logs,'');
  else if(fbTab==='history')body=sbHistoryHTML(s);
  else{
    let act='';
    if(bgCan('funding.source.manage'))act+=bgBtn('Edit','fbStart('+s.id+')')+bgBtn(s.status==='Active'?'Deactivate':'Activate','bgActOpen(\'fbStatus\','+s.id+')');
    if(bgCan('funding.transaction.create')&&s.status==='Active')act+=bgBtn('Record Funding','fbTxnStart('+s.id+')',true);
    const ins=bgSum(fbTxns.filter(function(t){return t.sourceId===s.id&&t.dir>0&&['Verified','Reversed'].indexOf(t.status)>=0;}),function(t){return t.amount;});
    const outs=bgSum(fbTxns.filter(function(t){return t.sourceId===s.id&&t.dir<0&&['Verified','Reversed'].indexOf(t.status)>=0;}),function(t){return t.amount;});
    const pend=fbTxns.filter(function(t){return t.sourceId===s.id&&t.status==='Pending Verification';});
    body=hero+(act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
      +'<div class="wb-proj-cards bg-figs">'+advCard('Recorded Balance (Internal)',expMoney(fbBalance(s),s.currency),'verified entries only')+advCard('Verified In',expMoney(ins,s.currency))
        +advCard('Verified Out',expMoney(outs,s.currency))+(function(){const il=bgSum(fbTxns.filter(function(t){return t.sourceId===s.id&&t.status==='Verified – Illustrative';}),function(t){return t.dir*t.amount;});return il?advCard('Illustrative Funding',expMoney(il,s.currency),'not in the recorded balance'):'';})()+advCard('Pending Verification',String(pend.length),expMoney(bgSum(pend,function(t){return t.dir*t.amount;}),s.currency))
        +advCard('Payouts in Progress',expMoney(fbInflight(s),s.currency),'initiated, not verified')
        +advCard('Reserved / Committed',expMoney(fbReserved(s),s.currency),'approved, not yet executed')
        +advCard('Available for New Commitments',expMoney(fbAvailable(s),s.currency),'recorded − payouts − reserved')+'</div>'
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Funding Source Name',bgE(s.name))+axField(AX_ICO.fHash,'Source ID',s.key)+axField(AX_ICO.fBox,'Source Type',bgE(s.type))
      +axField(AX_ICO.fBuild,'Entity',bgE(idEntityName(s.entity)))+axField(AX_ICO.fCash,'Currency',s.currency)
      +axField(AX_ICO.fBuild,'Bank / Financial Institution',bgE(s.bank||'—'))+axField(AX_ICO.fLock,'Account Reference',bgE(s.maskedRef||'—')+(s.maskedRef?' <span class="ax-sub">masked</span>':''))
      +axField(AX_ICO.fHash,'Internal Source Code',bgE(s.code))+axField(AX_ICO.fUser,'Responsible Finance Owner',bgE(caN(s.ownerUid)))
      +axField(AX_ICO.fShield,'Balance Rule',bgE(s.enforcement)+' <span class="ax-sub">'+({Warning:'payout above the recorded balance needs care',Blocking:'payout above the recorded balance is refused at initiation',Informational:'never checked'}[s.enforcement])+'</span>')
      +axField(AX_ICO.fCal,'Effective',(s.effFrom?cdLabel(s.effFrom):'—')+(s.effTo?' – '+cdLabel(s.effTo):''))
      +axField(AX_ICO.fUser,'Created By',bgE(caN(s.createdBy))+' <span class="ax-sub">'+bgE(s.createdAt)+'</span>')
      +axField(EXP_ICO.note,'Description',bgE(s.desc),true)+'</div>';
  }
  return axTabBar('fbs',tabs,fbTab,'fbNav','fbClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function fbTxnTableHTML(list,compact){
  return '<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Entry</th><th>Type</th><th>Status</th><th class="wb-num">Amount</th></tr></thead><tbody>'
    +(list.length?list.map(function(t){return '<tr><td class="csag-td">'+t.key+'<div class="lp-c-sub">'+cdLabel(t.date)+(t.origin&&t.origin.key?' · '+bgE(t.origin.key):'')+'</div></td>'
      +'<td class="csag-td" style="white-space:normal">'+bgE(t.type)+'<div class="lp-c-sub">'+bgE(t.ref||'no reference')+'</div></td>'
      +'<td class="csag-td">'+axBadge(statusTone(t.status),t.status)+'<div class="lp-c-sub">'+bgE(caN(t.recordedBy))+(t.verifiedBy?' · verified by '+bgE(caN(t.verifiedBy)):'')+'</div>'+(t.exception?'<div class="lp-c-sub exp-cap-over">Reconciliation exception</div>':'')+'</td>'
      +'<td class="csag-td wb-num">'+(t.dir<0?'−':'+')+expMoney(t.amount,t.currency)+'</td></tr>';}).join('')
      :bgEmpty(4,'No entry yet.'))+'</tbody></table></div>';
}
function fbTxnRows(){
  const q=String(fbQ||'').trim().toLowerCase();
  return fbTxns.filter(function(t){return t.entity===bgEnt();}).slice().reverse().filter(function(t){
    const s=fbSource(t.sourceId);
    if(q&&![t.key,t.ref,t.desc,t.type,s&&s.name,s&&s.key,t.origin&&t.origin.recKey].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(fbStatusF&&t.status!==fbStatusF)return false;
    return true;
  });
}
function fbLedgerHTML(){
  const all=fbTxns.filter(function(t){return t.entity===bgEnt();}),rows=fbTxnRows();
  if(fbSel!=null&&!rows.some(function(t){return t.id===fbSel;}))fbSel=null;
  const pgn=listPage('fb-ledger',[fbQ,fbStatusF].join('|'),rows.map(function(t,i){
    const s=fbSource(t.sourceId);
    return '<tr class="fbt-row'+(fbSel===t.id?' lp-row-selected':'')+'" id="fbt-row-'+t.id+'" style="cursor:pointer" onclick="fbOpen('+t.id+')"><td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+t.key+'</div><div class="lp-c-sub">'+bgE(t.type)+(t.origin&&t.origin.recKey?' · '+bgE(t.origin.recKey):'')+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+(s?bgE(s.key+' · '+s.name):'')+'</div></td>'
      +'<td class="exp-c-amt exp-c-nw"><div class="lp-c-plain">'+(t.dir<0?'−':'+')+expMoney(t.amount,t.currency)+'</div></td>'
      +'<td class="exp-c-nw"><div class="lp-c-plain">'+cdLabel(t.date)+'</div><div class="lp-c-sub">'+bgE(t.ref||'')+'</div></td>'
      +'<td>'+axBadge(statusTone(t.status),t.status)+(t.exception?'<div class="lp-c-sub exp-cap-over">Reconciliation exception</div>':'')+'</td>'
      +'<td><div class="lp-c-plain">'+bgE(caN(t.recordedBy))+'</div><div class="lp-c-sub">'+(t.verifiedBy?'verified by '+bgE(caN(t.verifiedBy)):'not verified')+'</div></td></tr>';
  }),bgEmpty(7,'No funding entry matches this filter.'));
  const cnt=function(s){return all.filter(function(t){return t.status===s;}).length;};
  return bgFilterBar(lpSearchField('fbt-f-q',fbQ,'Search entry, reference or source','fbApply()')+apCS('fbt-f-status',FB_TXN_STATUSES,fbStatusF,'All Statuses')
      +clearFiltersBtn([fbQ,fbStatusF],'fbReset()')+'<button class="lp-pill-search" onclick="fbApply()">Search</button>',
      caStat('Pending Verification',cnt('Pending Verification'),fbStatusF==='Pending Verification','fbStat(\'Pending Verification\')','wait')
      +caStat('Verified',cnt('Verified'),fbStatusF==='Verified','fbStat(\'Verified\')','ok')+caStat('Reversed',cnt('Reversed'),fbStatusF==='Reversed','fbStat(\'Reversed\')','idle'))
    +bgSplit('fbt','<table class="lp-table ax-table exp-table bg-table"><thead><tr><th>S. No</th><th>Entry</th><th>Source</th><th>Amount</th><th>Date</th><th>Status</th><th>Recorded By</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,fbSel!=null,renderFbtSidebar);
}
function renderFbtSidebar(){
  const t=fbTxn(fbSel);if(!t||t.entity!==bgEnt())return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
  if(!tabs.some(function(x){return x.id===fbTab;}))fbTab='basic-details';
  const s=fbSource(t.sourceId),me=bgMe();
  const hero=sbHero({icon:BG_ICO.fund,name:t.key+' · '+bgE(t.type),meta:[s?s.key:'',t.currency],status:axBadge(statusTone(t.status),t.status)});
  let body;
  if(fbTab==='logs')body=lpLogsView(t.logs,'');
  else if(fbTab==='history')body=sbHistoryHTML(t);
  else{
    let act='';
    if(t.status==='Draft'&&(t.recordedBy===me||bgCan('funding.source.manage')))act+=bgBtn('Submit for Verification','fbTxnSubmitClick('+t.id+')',true);
    if(t.status==='Pending Verification'&&bgCan('funding.transaction.verify')){
      if(!(bgCfg(t.entity).fundingMakerChecker&&t.recordedBy===me))act+=bgBtn('Verify','bgActOpen(\'fbVerify\','+t.id+')',true);
      act+=bgBtn('Reject','bgActOpen(\'fbReject\','+t.id+')',false,true);
    }
    if(t.status==='Verified'&&!t.reversalOf&&t.origin.type==='manual'&&bgCan('funding.transaction.reverse')&&!fbTxns.some(function(x){return x.reversalOf===t.id&&['Rejected','Failed'].indexOf(x.status)<0;}))
      act+=bgBtn('Reverse','bgActOpen(\'fbReverse\','+t.id+')',false,true);
    body=hero+(act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
      +(t.status==='Pending Verification'&&bgCfg(t.entity).fundingMakerChecker&&t.recordedBy===me?'<div class="wb-note is-wait">Maker-checker: you recorded this entry, so someone else verifies it.</div>':'')
      +(t.exception?'<div class="wb-note is-bad"><b>Reconciliation exception</b><div class="wb-note-sub">'+bgE(t.exception)+'</div></div>':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fHash,'Entry ID',t.key)+axField(AX_ICO.fBox,'Transaction Type',bgE(t.type)+(t.type==='Adjustment'?' ('+(t.dir>0?'increase':'decrease')+')':''))
      +axField(AX_ICO.fTag,'Funding Source',s?bgE(s.key+' · '+s.name):'')+axField(AX_ICO.fCash,'Amount',(t.dir<0?'−':'+')+expMoney(t.amount,t.currency))
      +axField(AX_ICO.fCal,'Transaction Date',cdLabel(t.date))+axField(AX_ICO.fHash,'Source Reference',bgE(t.ref||'—'))
      +axField(AX_ICO.fHash,'External / ERP Reference',bgE([t.extRef,t.erpRef].filter(Boolean).join(' / ')||'—'))
      +axField(AX_ICO.fTag,'Origin',t.origin.type==='manual'?'Recorded manually':bgE(t.origin.type+' · '+t.origin.key+(t.origin.recKey?' · '+t.origin.recKey:'')))
      +(t.reversalOf?axField(AX_ICO.fTag,'Reverses',bgE((fbTxn(t.reversalOf)||{}).key||'')):'')+(t.reversedBy?axField(AX_ICO.fTag,'Reversed By',bgE(t.reversedBy)):'')
      +axField(AX_ICO.fUser,'Recorded By',bgE(caN(t.recordedBy))+' <span class="ax-sub">'+bgE(t.recordedAt)+'</span>')
      +axField(AX_ICO.fUser,'Verified By',t.verifiedBy?bgE(caN(t.verifiedBy))+' <span class="ax-sub">'+bgE(t.verifiedAt)+'</span>':'Not verified')
      +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Evidence',bgE(t.evidence||'—'))
      +axField(EXP_ICO.note,'Funding Description',bgE(t.desc),true)+'</div>';
  }
  return axTabBar('fbt',tabs,fbTab,'fbNav','fbClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function fbTxnSubmitClick(id){const e=fbTxnSubmit(id);if(e){showToast('Not submitted','error',e);return;}renderADTPage();showToast('Submitted','success','Waiting for an independent verifier.');}
function fbReconHTML(){
  const un=fbUnlinked(),ex=fbTxns.filter(function(t){return t.entity===bgEnt()&&t.exception;}),pend=fbTxns.filter(function(t){return t.entity===bgEnt()&&t.status==='Pending Verification';});
  const canLink=bgCan('funding.transaction.create');
  return '<div class="wb-proj-cards adv-cards">'+advCard('Payouts Not Linked',String(un.length),'verified payments with no funding entry')+advCard('Reconciliation Exceptions',String(ex.length),'payments recorded above the balance')
      +advCard('Pending Verification',String(pend.length),'entries not yet in balances')+'</div>'
    +'<div class="wb-proj-h">Verified payouts with no funding entry</div>'
    +'<div class="wb-note">Verified outflows without a funding source. Linking records a pending outflow that someone else verifies.</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Payout</th><th>Record</th><th class="wb-num">Amount</th><th>Paid</th><th>Reference</th><th>Route</th>'+(canLink?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
    +(un.length?un.map(function(p){return '<tr><td class="csag-td">'+bgE(p.key)+'<div class="lp-c-sub">'+bgE(p.kind)+'</div></td><td class="csag-td">'+bgE(p.recKey)+'</td><td class="csag-td wb-num">'+expMoney(p.amount,p.currency)+'</td>'
      +'<td class="csag-td">'+cdLabel(p.date)+'</td><td class="csag-td">'+bgE(p.payRef||'')+'</td><td class="csag-td">'+bgE(p.route||'')+'</td>'
      +(canLink?'<td class="csag-td csag-act">'+bgBtn('Link to Source','bgActOpen(\'fbLink\',null,{key:\''+attrSafe(p.key)+'\'})')+'</td>':'')+'</tr>';}).join('')
      :bgEmpty(canLink?7:6,'Every verified payout is linked.'))+'</tbody></table></div>'
    +(ex.length?'<div class="wb-proj-h">Reconciliation exceptions</div>'+fbTxnTableHTML(ex,true):'');
}
/* Source form */
function fbStart(id){
  if(!bgCan('funding.source.manage')){emsDeny('configure funding sources');return;}
  bgCloseForms();const s=id?fbSource(id):null;
  fbForm=s?{id:s.id,rev:bgRevOf(s),name:s.name,type:s.type,currency:s.currency,bank:s.bank,maskedRef:'',code:s.code,ownerUid:s.ownerUid,enforcement:s.enforcement,effFrom:s.effFrom,effTo:s.effTo,desc:s.desc}
    :{id:null,name:'',type:FB_TYPES[0],currency:bgBaseCurrency(bgEnt())||'INR',bank:'',maskedRef:'',code:'',ownerUid:'',enforcement:'Warning',effFrom:wbToday(),effTo:'',desc:''};
  renderADTPage();
}
function fbOwnerPool(){return idUsersIn(bgEnt()).map(function(u){return u.userId;}).filter(function(uid){const p=emsPersonPerms(uid);return idUserActive(uid)&&(p['funding.source.manage']||p['funding.transaction.create']);});}
function fbFormSync(){
  const d=fbForm;if(!d)return;
  [['name','fbf-name'],['bank','fbf-bank'],['maskedRef','fbf-ref'],['code','fbf-code'],['desc','fbf-desc'],['effFrom','fbf-from'],['effTo','fbf-to']].forEach(function(p){const x=bgVal(p[1]);if(x!=null)d[p[0]]=x;});
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let x;
  if((x=cs('fbf-type'))!=null)d.type=x;if((x=cs('fbf-cur'))!=null)d.currency=x;if((x=cs('fbf-enf'))!=null)d.enforcement=x;
  if((x=cs('fbf-owner'))!=null)d.ownerUid=idFromLabel(x,fbOwnerPool());
}
function fbFormHook(){fbFormSync();renderADTPage();}
function fbFormHTML(){
  const d=fbForm,edit=d.id!=null,s=edit?fbSource(d.id):null,bank=d.type==='External Bank-Referenced';
  const f=bgField('Funding Source Name',true,bgInput('fbf-name',d.name,'e.g. Operations Current Account'),'',true)
    +bgField('Source Type',true,apCS('fbf-type',FB_TYPES,d.type,'Select','fbFormHook'))
    +bgField('Currency',true,apCS('fbf-cur',EXP_CURRENCIES,d.currency,'Select'),edit?'Fixed once entries exist.':'')
    +(bank?bgField('Bank / Financial Institution',true,bgInput('fbf-bank',d.bank,'e.g. Bank name'))
      +bgField('Account Reference',!edit,bgInput('fbf-ref',d.maskedRef,edit?'Leave empty to keep '+(s&&s.maskedRef||''):'Account number or reference'),'Only the last four characters are kept ('+(edit&&s?s.maskedRef:'XXXX1234')+').'):'')
    +bgField('Internal Source Code',true,bgInput('fbf-code',d.code,'e.g. OPS-BANK'))
    +bgField('Responsible Finance Owner',true,axCS('fbf-owner',bgUserOpts(fbOwnerPool()),d.ownerUid?idLabel(d.ownerUid,fbOwnerPool()):'','Search owner'))
    +bgField('Balance Rule',true,apCS('fbf-enf',FB_ENFORCE,d.enforcement,'Select'),'Blocking refuses a payout above the recorded balance at initiation; Warning lets it continue with a note; Informational never checks.')
    +bgField('Effective From',false,apCD('fbf-from',d.effFrom,'Select date'))+bgField('Effective To',false,apCD('fbf-to',d.effTo,'Open-ended'))
    +bgField('Description',false,bgArea('fbf-desc',d.desc,''),'',true);
  return bgModal(edit?'Edit '+s.key:'Add Funding Source','A funding source is where company money is recorded as coming from. Its balance is internal: verified ADT entries only.','<div class="ep-form-grid">'+f+'</div>',
    {close:'fbFormClose()',btns:'<button class="ep-save-btn" onclick="fbFormSave()">'+(edit?'Save Changes':'Add Source')+'</button>'});
}
function fbFormClose(){fbForm=null;renderADTPage();}
function fbFormSave(){
  fbFormSync();const d=fbForm;if(!d)return;
  if(d.id!=null){const s=fbSource(d.id);if(!s||bgRevOf(s)!==d.rev){fbForm=null;bgStaleToast(s);return;}}
  const res=fbSourceSave(d);
  if(typeof res==='string'&&res){showToast('Not saved','error',res);return;}
  const id=d.id!=null?d.id:res.rec.id;fbForm=null;fbSub='sources';fbSel=id;renderADTPage();
  showToast('Funding source saved','success',fbSource(id).key+' · '+fbSource(id).name+'.');
}
/* Funding entry form */
function fbTxnStart(sourceId){
  if(!bgCan('funding.transaction.create')){emsDeny('record funding entries');return;}
  bgCloseForms();
  fbTxnForm={sourceId:sourceId||'',type:'Funding In',direction:'Increase',amount:'',date:wbToday(),ref:'',extRef:'',erpRef:'',desc:'',evidence:''};
  renderADTPage();
}
function fbTxnSync(){
  const d=fbTxnForm;if(!d)return;
  [['amount','fbx-amount'],['date','fbx-date'],['ref','fbx-ref'],['extRef','fbx-ext'],['erpRef','fbx-erp'],['desc','fbx-desc']].forEach(function(p){const x=bgVal(p[1]);if(x!=null)d[p[0]]=x;});
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let x;
  if((x=cs('fbx-src'))!=null)d.sourceId=fbSourceFromLabel(x);if((x=cs('fbx-csrc'))!=null)d.source=x==='Illustrative'?'Illustrative':'';if((x=cs('fbx-type'))!=null)d.type=x;if((x=cs('fbx-dir'))!=null)d.direction=x;
}
function fbTxnHook(){fbTxnSync();renderADTPage();}
function fbPickTxnEvidence(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}fbTxnSync();fbTxnForm.evidence=f.name;renderADTPage();}
/* D9: illustrative funding, in the presentation company only. */
function fbIllOn(){return typeof ccDemoOn==='function'&&ccDemoOn(bgEnt());}
if(typeof sbToneAdd==='function')sbToneAdd({'verified-illustrative':'info','verified--illustrative':'info'});
function fbTxnFormHTML(){
  const d=fbTxnForm,s=d.sourceId?fbSource(d.sourceId):null;
  const f=bgField('Funding Source',true,apCS('fbx-src',fbSourcesHere(true).map(fbSourceLabel),s?fbSourceLabel(s):'','Select source','fbTxnHook'))
    +bgField('Transaction Type',true,apCS('fbx-type',['Funding In','Adjustment'],d.type,'Select','fbTxnHook'))
    +(d.type==='Adjustment'?bgField('Direction',true,apCS('fbx-dir',['Increase','Decrease'],d.direction,'Select')):'')
    +bgField('Amount',true,bgMoneyIn('fbx-amount',s?s.currency:'',d.amount))
    +bgField('Transaction Date',true,apCD('fbx-date',d.date,'Select date'))
    +(fbIllOn()&&d.type==='Funding In'?bgField('Confirmation Source',true,apCS('fbx-csrc',['Bank evidence','Illustrative'],d.source==='Illustrative'?'Illustrative':'Bank evidence','Select','fbTxnHook')):'')
    +(d.source==='Illustrative'&&fbIllOn()?'':bgField('Source Reference',!!(s&&s.type==='External Bank-Referenced'&&d.type==='Funding In'),bgInput('fbx-ref',d.ref,'Bank transfer reference, voucher number'),'Each reference is recorded once.'))
    +bgField('External Provider Reference',false,bgInput('fbx-ext',d.extRef,'Optional'))+bgField('ERP / Accounting Reference',false,bgInput('fbx-erp',d.erpRef,'Optional'))
    +bgField('Funding Description',true,bgArea('fbx-desc',d.desc,'What this funding is'),'',true)
    +(d.source==='Illustrative'&&fbIllOn()?'':bgField('Evidence',bgCfg().fundingEvidence,d.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+bgE(d.evidence)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="fbPickTxnEvidence(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · bank advice or cash book page</span></span></label>',
      bgCfg().fundingEvidence?'Required before it can be verified.':'',true));
  return bgModal('Record Funding','Record company money that has actually arrived (or a correction). It counts in the recorded balance only after an independent verifier confirms it.',
    '<div class="ep-form-grid">'+f+'</div>',{close:'fbTxnClose()',btns:'<button class="btn-outline" onclick="fbTxnSave(true)">Save as Draft</button><button class="ep-save-btn" onclick="fbTxnSave(false)">Submit for Verification</button>'});
}
function fbTxnClose(){fbTxnForm=null;renderADTPage();}
function fbTxnSave(draft){
  fbTxnSync();const d=fbTxnForm;if(!d)return;
  const res=fbTxnCreate(Object.assign({},d,{draft:draft}));
  if(res.error){showToast('Not saved','error',res.error);return;}
  fbTxnForm=null;fbSub='ledger';fbSel=res.rec.id;renderADTPage();
  showToast(draft?'Draft saved':'Submitted for verification','success',res.rec.key+' · '+expMoney(res.rec.amount,res.rec.currency)+'. Not in the recorded balance until verified.');
}

/* ── Settings ──────────────────────────────────────────────────────────── */
function bgSetSubs(){return [['general','General'],['types','Budget Types'],['workflows','Approval Workflows'],['years','Financial Years']];}
function bgSetSubPick(k){if(bgSetSub===k)return;bgCloseForms();awfSel=null;bgSetSub=k;bgCfgDraft=null;renderADTPage();}
function bgSettingsHTML(){
  const strip='<div class="segmented is-compact adv-set-subs">'+bgSetSubs().map(function(x){return '<button type="button" class="seg-btn'+(bgSetSub===x[0]?' active':'')+'" onclick="bgSetSubPick(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>';
  let body;
  if(bgSetSub==='types')body=bgTypesHTML();
  else if(bgSetSub==='workflows')body='<div class="adv-set-actions">'+bgBtn('Add Workflow','awfStartAdd(\'Budget\')',true)+'</div>'+awfListHTML();
  else if(bgSetSub==='years')body=bgYearsHTML();
  else body=bgGeneralHTML();
  return '<div class="adv-settings">'+strip+body+'</div>';
}
function bgGeneralHTML(){
  const c=bgCfg();
  const d=bgCfgDraft||(bgCfgDraft={fyStartMonth:c.fyStartMonth,control:c.control,enforcement:c.enforcement,noMatch:c.noMatch,quarterCarry:c.quarterCarry,separateActivation:c.separateActivation,
    fundingTracking:c.fundingTracking,fundingMakerChecker:c.fundingMakerChecker,fundingEvidence:c.fundingEvidence,nearEndDays:String(c.nearEndDays),reason:''});
  const yn=function(v){return v?'On':'Off';};
  const turningOff=(c.control&&!d.control)||(c.fundingTracking&&!d.fundingTracking);
  const used=bgBudgets.some(function(b){return b.entity===bgEnt();});
  return '<div class="lp-page"><div class="lp-sb-view-header"><span class="lp-sb-section-title">General · '+bgE(idEntityName(bgEnt()))+'</span></div>'
    +'<div class="ep-form-grid adv-general">'
    +bgField('Budget Control',true,apCS('bgg-control',['On','Off'],yn(d.control),'Select','bgGenHook'),'Off: nothing is evaluated ("Not Evaluated"). On: claims, advances and imprest requests are checked against active budgets.')
    +bgField('Default Enforcement',true,apCS('bgg-enf',BG_ENFORCE,d.enforcement,'Select'),'For new budgets. Warning asks for a justification; Blocking stops submission.')
    +bgField('When No Budget Matches',true,apCS('bgg-nomatch',BG_ENFORCE,d.noMatch,'Select'),'Warning: allowed with a mandatory justification. Blocking: refused until Finance adds an allocation.')
    +bgField('Financial Year Starts',true,apCS('bgg-fy',WB_MON,WB_MON[d.fyStartMonth-1],'Select'),used?'Budgets keep the dates they were created with.':'April by default.')
    +bgField('Quarter Carry-Forward',true,apCS('bgg-qcarry',['On','Off'],yn(d.quarterCarry),'Select'),'Off: each quarter is its own ceiling.')
    +bgField('Separate Activation Step',true,apCS('bgg-sep',['On','Off'],yn(d.separateActivation),'Select'),'Off: an approved budget activates on its effective date if its allocations are valid.')
    +bgField('Funding-Source Tracking',true,apCS('bgg-ft',['On','Off'],yn(d.fundingTracking),'Select','bgGenHook'),'On: disbursements and manual reimbursements must name the source they are paid from.')
    +bgField('Funding Maker-Checker',true,apCS('bgg-fmc',['On','Off'],yn(d.fundingMakerChecker),'Select'),'On: whoever records a funding entry cannot verify it.')
    +bgField('Evidence to Verify Funding',true,apCS('bgg-fev',['On','Off'],yn(d.fundingEvidence),'Select'))
    +bgField('Year-End Reminder (days)',true,bgInput('bgg-ned',d.nearEndDays,'30'))
    +(turningOff?bgField('Reason for Turning Off',true,bgArea('bgg-reason',d.reason,'Recorded in the change log'),'Turning a control off is audited.',true):'')
    +'</div>'
    +'<div class="lp-sb-form-actions" style="border:0"><button class="ep-save-btn" onclick="bgGenSave()">Save Settings</button></div>'
    +'</div>';
}
function bgGenSync(){
  const d=bgCfgDraft;if(!d)return;
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let x;
  if((x=cs('bgg-control'))!=null)d.control=x==='On';if((x=cs('bgg-enf'))!=null)d.enforcement=x;if((x=cs('bgg-nomatch'))!=null)d.noMatch=x;
  if((x=cs('bgg-fy'))!=null)d.fyStartMonth=WB_MON.indexOf(x)+1;if((x=cs('bgg-qcarry'))!=null)d.quarterCarry=x==='On';if((x=cs('bgg-sep'))!=null)d.separateActivation=x==='On';
  if((x=cs('bgg-ft'))!=null)d.fundingTracking=x==='On';if((x=cs('bgg-fmc'))!=null)d.fundingMakerChecker=x==='On';if((x=cs('bgg-fev'))!=null)d.fundingEvidence=x==='On';
  if(bgVal('bgg-ned')!=null)d.nearEndDays=bgVal('bgg-ned');if(bgVal('bgg-reason')!=null)d.reason=bgVal('bgg-reason');
}
function bgGenHook(){bgGenSync();renderADTPage();}
function bgGenSave(){
  bgGenSync();const d=bgCfgDraft;
  const err=bgCfgSave(d);if(err){showToast('Not saved','error',err);return;}
  bgCfgDraft=null;renderADTPage();showToast('Settings saved','success','Funding & Budgets settings for '+idEntityName(bgEnt())+' saved.');
}
function bgTypesHTML(){
  const c=bgCfg();
  return '<div class="lp-page"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Budget Types <span class="ax-count">'+c.budgetTypes.length+'</span></span><span class="ca-actions">'+bgBtn('Add Type','bgActOpen(\'budgetType\',null)',true)+'</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Budget Type</th><th>Budgets</th></tr></thead><tbody>'
    +c.budgetTypes.map(function(t,i){return '<tr><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td">'+bgE(t)+'</td><td class="csag-td">'+bgBudgets.filter(function(b){return b.entity===bgEnt()&&b.budgetType===t;}).length+'</td></tr>';}).join('')
    +'</tbody></table></div></div>';
}
function bgYearsHTML(){
  const fys=bgUniq(bgBudgets.filter(function(b){return b.entity===bgEnt();}).map(function(b){return b.fy;}).concat(bgFyOptions().map(function(f){return f.label;}))).sort();
  return '<div class="lp-page"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Financial Years</span><span class="ca-actions">'+(bgCan('budget.manage')?bgBtn('Close a Financial Year','bgActOpen(\'fyclose\',null)',true):'')+'</span></div>'
    +'<div class="wb-note">Nothing carries forward automatically; a closed year is frozen.</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Financial Year</th><th>Status</th><th>Budgets</th><th>Open Items</th><th>Closed By</th></tr></thead><tbody>'
    +fys.map(function(fy){const st=bgFyStatus(fy),n=bgBudgets.filter(function(b){return b.entity===bgEnt()&&b.fy===fy;}).length,open=bgCloseReview(fy).length;
      return '<tr><td class="csag-td">'+bgE(fy)+'</td><td class="csag-td">'+axBadge(statusTone(st.status),st.status)+'</td><td class="csag-td">'+n+'</td><td class="csag-td">'+open+'</td><td class="csag-td">'+(st.ref?bgE(st.ref)+' · '+bgE(st.at):'—')+'</td></tr>';}).join('')
    +'</tbody></table></div></div>';
}

/* ── Reports ───────────────────────────────────────────────────────────── */
const BG_REPORTS=[['register','Budget Master Register','b'],['allocation','Budget Allocation Report','b'],['bva','Budget vs Actual','b'],['dept','Department-Wise Budget','b'],
  ['category','Category / Subcategory Budget','b'],['cc','Cost Centre Budget','b'],['project','Project Budget','b'],['pipeline','Budget Pending & Committed','b'],
  ['overrun','Budget Overrun & Exceptions','b'],['revisions','Budget Revision History','b'],['transfers','Budget Transfer Register','b'],['sources','Funding Source Register','f'],
  ['flows','Verified Funding Inflow / Outflow','f'],['recon','Funding Source Reconciliation','f'],['exposure','Advance / Imprest Budget Exposure','b'],['reimb','Reimbursement Funding','f'],
  ['variance','Financial-Year & Quarterly Variance','b']];
function bgRepOk(id){const r=BG_REPORTS.find(function(x){return x[0]===id;});return !!r&&(r[2]==='f'?bgCan('funding.report.view'):bgCan('budget.report.view'));}
function bgRepList(){return BG_REPORTS.filter(function(r){return bgRepOk(r[0]);});}
/* Allocations a person may report on: every line of a budget they fully see, or their own lines. */
function bgRepAllocs(){
  const out=[];
  bgRepScopeList().filter(function(b){return b.version>0;}).forEach(function(b){const ids=bgRepShownIds(b);b.allocations.forEach(function(a){if(ids.indexOf(a.id)>=0)out.push({b:b,a:a});});});
  return out;
}
/* For grouped reports: the topmost line of each group inside a budget, so a parent and its child are never added. */
function bgGroupRoots(list,keyOf){
  return list.filter(function(x){const k=keyOf(x.a);if(!k)return false;return !bgAncestors(x.a).some(function(p){return keyOf(p)===k&&list.some(function(y){return y.a===p;});});});
}
function bgRepRows(id){
  const rows=[],mk=function(o){rows.push(o);};
  const fig=function(b,aid){return bgFigures(b,aid);};
  const allocRow=function(b,a,extra){const f=fig(b,a.id);return Object.assign({b:b,a:a,fy:b.fy,dept:a.dept,cat:a.category,cc:a.ccId,prj:a.prjId,owner:a.ownerUid||b.ownerUid,status:b.status,enf:bgEnf(a,b),cur:b.currency,date:b.effFrom,
    open:['budget',b.id,'allocations'],v:{budget:expKey(b),alloc:a.key,scope:bgScopeLabel(a),parent:a.parentId?bgAllocKey(bgAlloc(a.parentId)):'—',owner:caN(a.ownerUid||b.ownerUid),approved:a.amount,pending:f.pending,committed:f.committed,actual:f.actual,
      exposure:f.exposure,available:f.available,pct:f.approved>0?f.pct+'%':'—'}},extra||{});};
  if(id==='register'){bgRepScopeList().forEach(function(b){const f=bgViewFig(b,true),full=bgRepFull(b);mk({b:b,fy:b.fy,owner:b.ownerUid,status:b.status,enf:b.enforcement,cur:b.currency,date:b.effFrom,open:['budget',b.id,'basic-details'],
      v:{budget:expKey(b),name:b.title,fy:b.fy,type:b.budgetType,owner:caN(b.ownerUid),approved:f.approved,allocated:full?bgAllocated(b):f.approved,reserve:full?bgReserve(b):0,enf:b.enforcement,status:b.status,version:b.version?'v'+b.version:'—'}});});
    return {cols:[['budget','Budget ID'],['name','Budget Name'],['fy','Year'],['type','Type'],['owner','Owner'],['approved','Budget Amount','m'],['allocated','Allocated','m'],['reserve','Reserve','m'],['enf','Enforcement'],['status','Status'],['version','Version']],rows:rows,
      note:'Drafts and budgets in approval show the amount requested; they authorize nothing until approved (Version v1 or later).'};}
  if(id==='allocation'){bgRepAllocs().forEach(function(x){mk(allocRow(x.b,x.a));});
    return {cols:[['budget','Budget'],['alloc','Allocation'],['scope','Scope'],['parent','Parent'],['owner','Owner'],['approved','Approved','m'],['pending','Pending','m'],['committed','Committed','m'],['actual','Actual','m'],['exposure','Exposure','m'],['available','Available','m'],['pct','Utilized']],rows:rows};}
  if(id==='bva'){bgRepAllocs().forEach(function(x){const r=allocRow(x.b,x.a);r.v.variance=bgM(x.a.amount-r.v.actual);r.v.actPct=x.a.amount>0?Math.round(r.v.actual/x.a.amount*1000)/10+'%':'—';mk(r);});
    return {cols:[['budget','Budget'],['alloc','Allocation'],['scope','Scope'],['approved','Approved','m'],['actual','Actual Expense','m'],['variance','Approved − Actual','m'],['actPct','Actual %']],rows:rows};}
  if(['dept','category','cc','project'].indexOf(id)>=0){
    const keyOf={dept:function(a){return a.dept;},category:function(a){return a.category?a.category+(a.subCat?' · '+a.subCat:''):'';},cc:function(a){return a.ccId;},project:function(a){return a.prjId;}}[id];
    const label={dept:function(k){return k;},category:function(k){return k;},cc:function(k){return bgmLabel(bgmRec('cc',k));},project:function(k){return bgmLabel(bgmRec('project',k));}}[id];
    bgGroupRoots(bgRepAllocs(),keyOf).forEach(function(x){const r=allocRow(x.b,x.a);r.v.group=label(keyOf(x.a));mk(r);});
    return {cols:[['group',{dept:'Department',category:'Category / Subcategory',cc:'Cost Centre',project:'Project'}[id]],['budget','Budget'],['alloc','Allocation'],['approved','Approved','m'],['pending','Pending','m'],['committed','Committed','m'],['actual','Actual','m'],['exposure','Exposure','m'],['available','Available','m']],rows:rows,
      note:'Only the topmost line of each group within a budget is listed, so a parent and its child are never added together.'};
  }
  if(id==='pipeline'||id==='exposure'){
    bgRepScopeList().forEach(function(b){const ids=bgRepShownIds(b);Object.keys(bgStates).forEach(function(k){const s=bgStates[k];if(s.budget!==b.id||ids.indexOf(s.alloc)<0)return;
      if(id==='pipeline'&&!(s.pending||s.committed))return;
      if(id==='exposure'&&['Advance','Imprest request','Imprest fund'].indexOf(s.kind)<0)return;
      if(id==='exposure'&&!(s.committed||s.exposure||s.pending||s.comp))return;
      const a=bgAlloc(s.alloc);
      mk({b:b,a:a,fy:s.fy,dept:a?a.dept:'',cat:a?a.category:'',cc:a?a.ccId:'',prj:a?a.prjId:'',owner:b.ownerUid,status:s.kind,enf:b.enforcement,cur:b.currency,date:s.date||'',
        open:s.kind==='Expense line'?['claim',s.recId]:['holder',s.recId],
        v:{source:s.label,kind:s.kind,budget:expKey(b),alloc:a?a.key:'',pending:s.pending,committed:s.committed,exposure:s.exposure,issued:s.comp?s.comp.issued:'',accepted:s.comp?s.comp.accepted:'',returned:s.comp?bgM(s.comp.returns+s.comp.recoveries):''}});});});
    return id==='pipeline'?{cols:[['source','Source'],['kind','Type'],['budget','Budget'],['alloc','Allocation'],['pending','Pending','m'],['committed','Committed','m']],rows:rows,note:'Pipeline: what is in approval (Pending) and approved but not yet realized (Committed). It is not added to the run-rate projection.'}
      :{cols:[['source','Advance / Imprest'],['budget','Budget'],['alloc','Allocation'],['pending','Pending','m'],['committed','Committed','m'],['exposure','Funding Exposure','m'],['issued','Issued','m'],['accepted','Accepted','m'],['returned','Returned / Recovered','m']],rows:rows};
  }
  if(id==='overrun'){
    bgRepScopeList().forEach(function(b){const ids=bgRepShownIds(b);
      [null].concat(ids).forEach(function(aid){if(aid===null&&!bgRepFull(b))return;const f=fig(b,aid);if(f.occupied<=f.approved+0.001)return;const a=aid?bgAlloc(aid):null;
        mk({b:b,a:a,fy:b.fy,dept:a?a.dept:'',cat:a?a.category:'',owner:b.ownerUid,status:'Over budget',enf:a?bgEnf(a,b):b.enforcement,cur:b.currency,date:b.effFrom,open:['budget',b.id,'allocations'],
          v:{type:'Overrun',budget:expKey(b),alloc:a?a.key:'Budget total',amount:bgM(f.occupied-f.approved),used:'',remaining:'',status:'Over budget'}});});});
    bgRepChgList().filter(function(c){return c.kind==='budget exception';}).forEach(function(c){const b=bgRec(c.budgetId);if(!b)return;
      mk({b:b,fy:b.fy,owner:b.ownerUid,status:bgExcState(c),enf:b.enforcement,cur:c.currency,date:c.effFrom,open:['change',c.id],
        v:{type:'Exception '+expKey(c),budget:expKey(b),alloc:c.allocId?bgAllocKey(bgAlloc(c.allocId)):'Whole budget',amount:c.approvedLimit||caTotal(c),used:bgExcUsed(c),remaining:c.approvedLimit?bgExcRemaining(c):'',status:bgExcState(c)}});});
    return {cols:[['type','Type'],['budget','Budget'],['alloc','Allocation'],['amount','Amount','m'],['used','Used','m'],['remaining','Remaining','m'],['status','Status']],rows:rows};
  }
  if(id==='revisions'||id==='transfers'){
    bgRepChgList().filter(function(c){return c.kind===(id==='revisions'?'budget revision':'budget transfer');}).forEach(function(c){const b=bgRec(c.budgetId);if(!b)return;
      mk({b:b,fy:b.fy,owner:b.ownerUid,status:c.status,enf:b.enforcement,cur:c.currency,date:(c.effDate||wbToday()),open:['change',c.id],
        v:id==='revisions'?{ref:expKey(c),budget:expKey(b),from:c.currentAmount,to:c.proposedAmount,changes:c.changes.map(function(x){return x.key+' '+x.from+'→'+x.amount;}).join('; ')||'—',reason:c.reason,by:caN(c.createdBy),status:c.status,applied:c.appliedAt||'—'}
          :{ref:expKey(c),budget:expKey(b),from:c.fromLabel,to:c.toLabel,amount:c.amount,reason:c.reason,by:caN(c.createdBy),status:c.status,applied:c.appliedAt||'—'}});});
    return id==='revisions'?{cols:[['ref','Revision'],['budget','Budget'],['from','From','m'],['to','To','m'],['changes','Allocation Changes'],['reason','Reason'],['by','Requested By'],['status','Status'],['applied','Applied']],rows:rows}
      :{cols:[['ref','Transfer'],['budget','Budget'],['from','From'],['to','To'],['amount','Amount','m'],['reason','Reason'],['by','Requested By'],['status','Status'],['applied','Applied']],rows:rows};
  }
  if(id==='sources'||id==='recon'){
    fbSourcesHere().forEach(function(s){const L=fbTxns.filter(function(t){return t.sourceId===s.id;});
      const vin=bgSum(L.filter(function(t){return t.dir>0&&['Verified','Reversed'].indexOf(t.status)>=0&&!t.reversalOf;}),function(t){return t.amount;});
      const vout=bgSum(L.filter(function(t){return t.dir<0&&['Verified','Reversed'].indexOf(t.status)>=0&&!t.reversalOf;}),function(t){return t.amount;});
      const rev=bgSum(L.filter(function(t){return t.reversalOf&&t.status==='Verified';}),function(t){return t.dir*t.amount;});
      mk({src:s.id,status:s.status,cur:s.currency,date:s.effFrom,open:['source',s.id],owner:s.ownerUid,
        v:id==='sources'?{ref:s.key,name:s.name,type:s.type,masked:s.maskedRef||'—',bal:fbBalance(s),inflight:fbInflight(s),reserved:fbReserved(s),available:fbAvailable(s),enf:s.enforcement,status:s.status}
          :{ref:s.key,name:s.name,vin:vin,vout:vout,rev:rev,bal:fbBalance(s),pending:L.filter(function(t){return t.status==='Pending Verification';}).length,exc:L.filter(function(t){return t.exception;}).length}});});
    return id==='sources'?{cols:[['ref','Source ID'],['name','Name'],['type','Type'],['masked','Account Ref.'],['bal','Recorded Balance (Internal)','m'],['inflight','Payouts in Progress','m'],['reserved','Reserved (Approved, Not Executed)','m'],['available','Available for New Commitments','m'],['enf','Balance Rule'],['status','Status']],rows:rows}
      :{cols:[['ref','Source ID'],['name','Name'],['vin','Verified In','m'],['vout','Verified Out','m'],['rev','Reversals (net)','m'],['bal','Recorded Balance (Internal)','m'],['pending','Pending Entries'],['exc','Exceptions']],rows:rows,
        note:'Recorded balance = verified inflows − verified outflows ± verified reversals. Not a bank balance; '+fbUnlinked().length+' verified payout(s) are not yet linked to a source (Corporate Funding → Reconciliation).'};
  }
  if(id==='flows'){
    fbTxns.filter(function(t){return t.entity===bgEnt()&&['Verified','Reversed'].indexOf(t.status)>=0;}).forEach(function(t){const s=fbSource(t.sourceId);
      mk({src:t.sourceId,status:t.status,cur:t.currency,date:t.date,open:['txn',t.id],v:{ref:t.key,source:s?s.key:'',type:t.type,dir:t.dir>0?'In':'Out',amount:t.amount,date:t.date,reference:t.ref||'—',origin:t.origin.recKey||t.origin.type,status:t.status}});});
    return {cols:[['ref','Entry'],['source','Source'],['type','Type'],['dir','Direction'],['amount','Amount','m'],['date','Date','d'],['reference','Reference'],['origin','Origin'],['status','Status']],rows:rows};
  }
  if(id==='reimb'){
    expensesData.filter(function(c){return c.entity===bgEnt()&&c.pay&&c.pay.payable>0;}).forEach(function(c){const p=c.pay,s=p.sourceId?fbSource(p.sourceId):null;
      const linked=fbTxns.filter(function(t){return t.origin&&t.origin.key&&t.origin.key.indexOf(p.key+'#')===0&&['Rejected','Failed'].indexOf(t.status)<0;});
      mk({src:p.sourceId,status:p.status,cur:c.currency,date:c.reimbursedOn||'',open:['claim',c.id],v:{claim:expKey(c),emp:c.name,payable:p.payable,settled:p.settled,route:p.route||'—',source:s?s.key:'—',
        entries:linked.map(function(t){return t.key+' '+t.status;}).join(', ')||(p.route==='Payroll'?'Payroll - not debited':'Not linked'),status:p.status}});});
    return {cols:[['claim','Claim'],['emp','Employee'],['payable','Payable','m'],['settled','Settled','m'],['route','Route'],['source','Source'],['entries','Funding Entries'],['status','Reimbursement']],rows:rows};
  }
  if(id==='variance'){
    bgRepScopeList().forEach(function(b){
      const full=bgRepFull(b),today=wbToday();
      const elapsed=Math.max(1,Math.min(bgDays(b.fyStart,today)+1,bgDays(b.fyStart,b.fyEnd)+1)),days=bgDays(b.fyStart,b.fyEnd)+1;
      const add=function(q,approved,f){
        const proj=today>=b.fyStart&&today<=b.fyEnd&&!q?bgM(f.actual/elapsed*days):'';
        mk({b:b,fy:b.fy,owner:b.ownerUid,status:b.status,enf:b.enforcement,cur:b.currency,date:b.effFrom,q:q,open:['budget',b.id,'utilization'],
          v:{budget:expKey(b),period:q?'Q'+q:b.fy,approved:approved,actual:f.actual,pipeline:bgM(f.pending+f.committed),exposure:f.exposure,variance:bgM(approved-f.actual),projection:proj}});};
      const f=bgViewFig(b,true);add(0,f.approved,f);
      if(full&&b.quarterly&&b.quarters)b.quarters.forEach(function(qa,i){add(i+1,qa,bgFigures(b,null,{q:i+1}));});
    });
    return {cols:[['budget','Budget'],['period','Period'],['approved','Approved','m'],['actual','Actual Expense','m'],['variance','Approved − Actual','m'],['pipeline','Pipeline (Pending + Committed)','m'],['exposure','Funding Exposure','m'],['projection','Run-Rate Projection','m']],rows:rows,
      note:'Run-rate projection = actual expense to date ÷ days elapsed × days in the year (straight line, actual expense only). It is an estimate shown separately from the pipeline; it never changes a record.'};
  }
  return {cols:[],rows:[]};
}
function bgDays(a,b){return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);}
/* Twelve summary cards; each opens the records behind it. */
const BG_CARDS=[['approved','Total Approved Budget','register','b'],['allocated','Total Allocated','allocation','b'],['pendingAppr','Budget Pending Approval','register','b'],
  ['pending','Total Pending Utilization','pipeline','b'],['committed','Total Committed','pipeline','b'],['actualExp','Total Actual & Exposure','bva','b'],['available','Budget Available','register','b'],
  ['over','Over-Budget Records','overrun','b'],['fin','Verified Funding In','flows','f'],['fout','Verified Funding Out','flows','f'],['fbal','Recorded Funding Balance (Internal)','sources','f'],['chg','Pending Budget Changes','revisions','b']];
function bgCardValue(card){
  const buds=bgRepScopeList().filter(function(b){return ['Approved','Scheduled','Active','Inactive','Expired','Closed'].indexOf(b.status)>=0;});
  const by=function(list,amt,cur){return advCurText(advByCur(list,amt,cur));};
  const bc=function(b){return b.currency;};
  if(card==='approved')return {n:buds.length,money:by(buds,function(b){return bgViewFig(b,true).approved;},bc)};
  if(card==='allocated')return {n:buds.length,money:by(buds,function(b){return bgRepFull(b)?bgAllocated(b):bgViewFig(b,true).approved;},bc)};
  if(card==='pendingAppr'){const l=bgRepScopeList().filter(function(b){return ['Awaiting Approval','Follow-Up'].indexOf(b.status)>=0;});return {n:l.length,money:by(l,function(b){return b.amount;},bc)};}
  if(card==='pending')return {n:buds.length,money:by(buds,function(b){return bgViewFig(b,true).pending;},bc)};
  if(card==='committed')return {n:buds.length,money:by(buds,function(b){return bgViewFig(b,true).committed;},bc)};
  if(card==='actualExp')return {n:buds.length,money:by(buds,function(b){const f=bgViewFig(b,true);return f.actual+f.exposure;},bc)};
  if(card==='available')return {n:buds.length,money:by(buds,function(b){return bgViewFig(b,true).available;},bc)};
  if(card==='over'){const l=bgRepRows('overrun').rows.filter(function(x){return x.v.type==='Overrun';});return {n:l.length,money:by(l,function(x){return x.v.amount;},function(x){return x.cur;})};}
  if(card==='fin'||card==='fout'){const l=fbTxns.filter(function(t){return t.entity===bgEnt()&&['Verified','Reversed'].indexOf(t.status)>=0&&!t.reversalOf&&(card==='fin'?t.dir>0:t.dir<0);});return {n:l.length,money:by(l,function(t){return t.amount;},function(t){return t.currency;})};}
  if(card==='fbal'){const l=fbSourcesHere();return {n:l.length,money:by(l,function(s){return fbBalance(s);},function(s){return s.currency;})};}
  if(card==='chg'){const l=bgRepChgList().filter(function(c){return ['Awaiting Approval','Follow-Up'].indexOf(c.status)>=0;});return {n:l.length,money:l.length+' awaiting'};}
  return {n:0,money:''};
}
function bgCardPass(card,x){
  if(card==='pendingAppr')return ['Awaiting Approval','Follow-Up'].indexOf(x.status)>=0;
  if(card==='approved'||card==='available')return ['Approved','Scheduled','Active','Inactive','Expired','Closed'].indexOf(x.status)>=0;
  if(card==='pending')return Number(x.v.pending)>0;
  if(card==='committed')return Number(x.v.committed)>0;
  if(card==='fin')return x.v.dir==='In';
  if(card==='fout')return x.v.dir==='Out';
  if(card==='over')return x.v.type==='Overrun';
  if(card==='chg')return ['Awaiting Approval','Follow-Up'].indexOf(x.status)>=0;
  return true;
}
function bgCardOpen(card){const c=BG_CARDS.find(function(x){return x[0]===card;});if(!bgRepOk(c[2]))return;bgRep=c[2];bgRF=Object.assign(bgRepBlank(),{card:card});renderADTPage();}
function bgRepBlank(){return {fy:'',q:'',dept:'',cat:'',cc:'',prj:'',owner:'',src:'',status:'',enf:'',from:'',to:'',cur:'',card:''};}
function bgRepFiltered(){
  const R=bgRepRows(bgRep),F=bgRF;
  const rows=R.rows.filter(function(x){
    if(F.card&&BG_CARDS.some(function(c){return c[0]===F.card&&c[2]===bgRep;})&&!bgCardPass(F.card,x))return false;
    if(F.fy&&x.fy!==F.fy)return false;
    if(F.q&&(x.q==null?!(x.b&&x.b.quarterly):'Q'+x.q!==F.q))return false;
    if(F.dept&&x.dept!==F.dept)return false;
    if(F.cat&&x.cat!==F.cat)return false;
    if(F.cc&&String(x.cc||'')!==String(F.cc))return false;
    if(F.prj&&String(x.prj||'')!==String(F.prj))return false;
    if(F.owner&&x.owner!==F.owner)return false;
    if(F.src&&String(x.src||'')!==String(F.src))return false;
    if(F.status&&x.status!==F.status)return false;
    if(F.enf&&x.enf!==F.enf)return false;
    if(F.cur&&x.cur!==F.cur)return false;
    if(F.from&&(!x.date||x.date<F.from))return false;
    if(F.to&&(!x.date||x.date>F.to))return false;
    return true;
  });
  return {cols:R.cols,rows:rows,all:R.rows,note:R.note||''};
}
function bgRepApply(){
  const v=function(id,all){const x=document.getElementById('csw-'+id)?getCSValue(id):'';return x&&x!==all?x:'';};
  bgRF.fy=v('bgr-fy','All Years');bgRF.q=v('bgr-q','All Quarters');bgRF.dept=v('bgr-dept','All Departments');bgRF.cat=v('bgr-cat','All Categories');
  const cc=bgmList('cc').find(function(x){return bgmLabel(x)===v('bgr-cc','All Cost Centres');});bgRF.cc=cc?cc.id:'';
  const pj=bgmList('project').find(function(x){return bgmLabel(x)===v('bgr-prj','All Projects');});bgRF.prj=pj?pj.id:'';
  const ow=v('bgr-owner','All Owners');bgRF.owner=ow?idFromLabel(ow,bgRepOwners()):'';
  bgRF.src=fbSourceFromLabel(v('bgr-src','All Sources'));bgRF.status=v('bgr-status','All Statuses');bgRF.enf=v('bgr-enf','All Enforcement');bgRF.cur=v('bgr-cur','All Currencies');
  bgRF.from=bgVal('bgr-from')||'';bgRF.to=bgVal('bgr-to')||'';
  renderADTPage();
}
function bgRepOwners(){return bgUniq(bgRepFiltered().all.map(function(x){return x.owner;}));}
function bgRepReset(){bgRF=bgRepBlank();renderADTPage();}
function bgRepPick(){const n=getCSValue('bgr-pick');const r=BG_REPORTS.find(function(x){return x[1]===n;});if(r&&r[0]!==bgRep){bgRep=r[0];bgRF.status='';bgRF.card='';}renderADTPage();}
function bgRepCell(col,x){
  const val=x.v[col[0]];
  if(val===''||val==null)return '—';
  if(col[2]==='m')return expMoney(val,x.cur);
  if(col[2]==='d')return cdLabel(val);
  return bgE(val);
}
function bgRepOpen(i){
  const x=bgRepFiltered().rows[i];if(!x||!x.open)return;
  const o=x.open;
  if(o[0]==='budget'){bgCloseForms();bgPageTab='budgets';bgQ='';bgFyF='';bgStatusF='';bgTypeF='';bgTileF='';bgSel=o[1];bgTab=o[2]||'basic-details';renderADTPage();return;}
  if(o[0]==='change'){bgOpenRecord(o[1]);return;}
  if(o[0]==='source'){bgCloseForms();bgPageTab='funding';fbSub='sources';fbSel=o[1];fbTab='basic-details';renderADTPage();return;}
  if(o[0]==='txn'){bgCloseForms();bgPageTab='funding';fbSub='ledger';fbQ='';fbStatusF='';fbSel=o[1];fbTab='basic-details';renderADTPage();return;}
  if(o[0]==='claim'){if(typeof advGoClaim==='function')advGoClaim(o[1]);return;}
  if(o[0]==='holder'){const r=advEngineRec(o[1])||advHolder(o[1]);if(r&&typeof advOpenRecord==='function'){if(r.kind==='fund'){advCloseForms();advPageTab='imprest';advSel=r.id;advTab='basic-details';navigatePage('advances');}else advOpenRecord(r.id);}return;}
}
function bgReportsHTML(){
  const list=bgRepList();
  if(!list.length)return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>Reports need budget.report.view or funding.report.view.</span></div></div>';
  if(!bgRepOk(bgRep))bgRep=list[0][0];
  const F=bgRepFiltered(),name=(BG_REPORTS.find(function(r){return r[0]===bgRep;})||list[0])[1];
  const cards=BG_CARDS.filter(function(c){return c[3]==='f'?bgCan('funding.report.view'):bgCan('budget.report.view');}).map(function(c){const v=bgCardValue(c[0]);return advCard(c[1],v.money,v.n+' record'+(v.n===1?'':'s'),'bgCardOpen(\''+c[0]+'\')');}).join('');
  const opts=function(fn){const o=[];F.all.forEach(function(x){const v=fn(x);if(v&&o.indexOf(v)<0)o.push(v);});return o;};
  const fys=opts(function(x){return x.fy;}),depts=opts(function(x){return x.dept;}),cats=opts(function(x){return x.cat;}),stats=opts(function(x){return x.status;}),curs=opts(function(x){return x.cur;}),enfs=opts(function(x){return x.enf;});
  const owners=bgRepOwners(),ccs=bgmList('cc'),prjs=bgmList('project'),srcs=fbSourcesHere();
  const card=bgRF.card?BG_CARDS.find(function(c){return c[0]===bgRF.card&&c[2]===bgRep;}):null;
  const fam=(BG_REPORTS.find(function(r){return r[0]===bgRep;})||[])[2];
  const canX=fam==='f'?bgCan('funding.report.export'):bgCan('budget.report.export');
  const pgn=listPage('bg-report-'+bgRep,JSON.stringify(bgRF),F.rows.map(function(x,i){
    return '<tr style="cursor:pointer" onclick="bgRepOpen('+i+')"><td class="lp-c-n">'+(i+1)+'</td>'+F.cols.map(function(c){return '<td class="'+(c[2]==='m'?'exp-c-amt ':'')+'exp-c-nw"><div class="lp-c-plain">'+bgRepCell(c,x)+'</div></td>';}).join('')+'</tr>';
  }),bgEmpty(F.cols.length+1,'No record matches this report and filter.'));
  return '<div class="lp-page">'
    +'<div class="wb-proj-cards adv-cards bg-cards">'+cards+'</div>'
    +'<div class="wb-note">Recorded events only; funding balances are internal records, not bank balances.</div>'
    +bgFilterBar(apCS('bgr-pick',list.map(function(r){return r[1];}),name,'Select report','bgRepPick')
      +apCS('bgr-fy',fys,bgRF.fy,'All Years')+apCS('bgr-dept',depts,bgRF.dept,'All Departments')+apCS('bgr-status',stats,bgRF.status,'All Statuses')
      /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
      +(bgRF.q?apCS('bgr-q',['Q1','Q2','Q3','Q4'],bgRF.q,'All Quarters'):'')+(bgRF.cat?apCS('bgr-cat',cats,bgRF.cat,'All Categories'):'')
      +(ccs.length&&bgRF.cc?apCS('bgr-cc',ccs.map(bgmLabel),bgmLabel(bgmRec('cc',bgRF.cc)),'All Cost Centres'):'')
      +(prjs.length&&bgRF.prj?apCS('bgr-prj',prjs.map(bgmLabel),bgmLabel(bgmRec('project',bgRF.prj)),'All Projects'):'')
      +(bgRF.owner?apCS('bgr-owner',idLabels(owners),idLabel(bgRF.owner,owners),'All Owners'):'')
      +(fam==='f'&&srcs.length&&bgRF.src?apCS('bgr-src',srcs.map(fbSourceLabel),fbSourceLabel(fbSource(bgRF.src)),'All Sources'):'')
      +(bgRF.enf?apCS('bgr-enf',enfs,bgRF.enf,'All Enforcement'):'')+(bgRF.cur?apCS('bgr-cur',curs,bgRF.cur,'All Currencies'):'')
      +(bgRF.from?apCD('bgr-from',bgRF.from,'From date'):'')+(bgRF.to?apCD('bgr-to',bgRF.to,'To date'):'')
      +clearFiltersBtn([bgRF.fy,bgRF.q,bgRF.dept,bgRF.cat,bgRF.cc,bgRF.prj,bgRF.owner,bgRF.src,bgRF.status,bgRF.enf,bgRF.cur,bgRF.from,bgRF.to,bgRF.card],'bgRepReset()')
      +'<button class="lp-pill-search" onclick="bgRepApply()">Search</button>')
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+bgE(name)+' <span class="ax-count">'+F.rows.length+'</span>'
      +(card?' <span class="adv-chip">'+bgE(card[1])+' <button onclick="bgRF.card=\'\';renderADTPage()" title="Remove">×</button></span>':'')+'</span>'
      +(canX?'<span class="ea-hint">Export (header) downloads exactly these rows.</span>':'<span class="ea-hint">Export needs '+(fam==='f'?'funding.report.export':'budget.report.export')+'.</span>')+'</div>'
    +(F.note?'<div class="ea-hint" style="margin:0 0 8px">'+bgE(F.note)+'</div>':'')
    +'<div class="lp-table-card adv-report"><table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th>'+F.cols.map(function(c){return '<th>'+c[1]+'</th>';}).join('')+'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager+'</div>'
    +'</div>';
}
/* Export: the rows on screen, never more (same scope and filters). */
function bgExport(){
  if(bgPageTab!=='reports'){showToast('Nothing to export','info','Export is available on the Reports tab.');return;}
  const fam=(BG_REPORTS.find(function(r){return r[0]===bgRep;})||[])[2];
  const perm=fam==='f'?'funding.report.export':'budget.report.export';
  if(!bgCan(perm)){emsDeny('export '+(fam==='f'?'funding':'budget')+' reports');return;}
  const F=bgRepFiltered(),name=(BG_REPORTS.find(function(r){return r[0]===bgRep;})||[])[1];
  if(!F.rows.length){showToast('Nothing to export','info','No record matches this report.');return;}
  const money=F.cols.some(function(c){return c[2]==='m';});
  wbCSV('budgets-'+bgRep,['S.No','Entity'].concat(F.cols.map(function(c){return c[1];})).concat(money?['Currency']:[]),
    F.rows.map(function(x,i){return [i+1,idEntityName(bgEnt())].concat(F.cols.map(function(c){const v=x.v[c[0]];return v==null?'':v;})).concat(money?[x.cur]:[]);}));
  showToast('Export ready','success',name+': '+F.rows.length+' row'+(F.rows.length===1?'':'s')+' exported.');
}

/* ── The approver's view (shared review popup) ─────────────────────────── */
function bgReviewInfoHTML(r){
  if(r.kind==='budget'){
    const v=bgValidateBudget(r);
    return '<div class="wb-note'+(v?' is-bad':'')+'"><b>'+bgE(r.title)+' · '+bgE(r.fy)+'</b><div class="wb-note-sub">Owner '+bgE(caN(r.ownerUid))+' · '+expMoney(r.amount,r.currency)+' · '+bgE(r.enforcement)
      +' · effective '+cdLabel(r.effFrom)+'<br>'+r.allocations.filter(function(a){return a.status==='Active';}).map(function(a){return bgE(a.key+' '+bgScopeLabel(a))+' '+expMoney(a.amount,r.currency);}).join('<br>')
      +'<br>Unallocated reserve '+expMoney(bgReserve(r),r.currency)+(v?'<br><b>'+bgE(v)+'</b>':'')+'<br>Approval creates no money.</div></div>';
  }
  const b=r.budgetId?bgRec(r.budgetId):null;
  let t='';
  if(r.kind==='budget revision')t=expMoney(r.currentAmount,r.currency)+' → '+expMoney(r.proposedAmount,r.currency)+(r.changes.length?'<br>'+r.changes.map(function(x){return bgE(x.key)+' '+expMoney(x.from,r.currency)+' → '+expMoney(x.amount,r.currency);}).join('<br>'):'')
    +(r.newLines.length?'<br>New: '+r.newLines.map(function(n){return bgE(bgScopeLabel(n))+' '+expMoney(n.amount,r.currency);}).join('; '):'')+'<br>Effective '+cdLabel(r.effDate);
  else if(r.kind==='budget transfer')t=expMoney(r.amount,r.currency)+' from '+bgE(r.fromLabel)+' to '+bgE(r.toLabel)+(r.quarter?' (Q'+r.quarter+')':'')+'. The budget total is unchanged.';
  else if(r.kind==='budget exception'){
    const fg=r.allocId&&b?bgFigures(b,r.allocId):null;
    t='Overrun authority of '+expMoney(caTotal(r),r.currency)+' on '+(r.allocId?bgE(bgAllocLabel(r.allocId)):'the whole budget')+(r.sourceRef?' for '+bgE(r.sourceRef)+' only'+(r.quarter?', Q'+r.quarter:'')+(r.srcCurrency?', in '+r.srcCurrency:''):'')
      +', '+cdLabel(r.effFrom)+' – '+cdLabel(r.effTo)+(r.sourceRef?' (the dates of that part)':'')+'.'
      +(fg?'<br>Line now: approved '+expMoney(fg.approved,b.currency)+' · utilized '+expMoney(fg.occupied,b.currency)+' · available '+expMoney(fg.available,b.currency)+'.':'')
      +'<br>It does not approve any claim or advance, and the Capping Limit still applies. Partial approval sets a lower authority.';
  }
  else if(r.kind==='financial year close')t='Closes '+bgE(r.fy)+': '+r.budgetIds.map(function(id){const x=bgRec(id);return x?expKey(x):'';}).join(', ')+'. Carry forward: '
    +((r.items||[]).filter(function(i){return i.action==='carry';}).length||'nothing')+'. The year is frozen once applied.';
  const v=r.kind==='budget revision'?bgValidateRevision(r):r.kind==='budget transfer'?bgValidateTransfer(r):r.kind==='financial year close'?bgValidateClose(r):'';
  return '<div class="wb-note'+(v?' is-bad':'')+'"><b>'+bgE(CA_TYPE_LABEL[r.kind]||r.kind)+(b?' · '+expKey(b)+' '+bgE(b.title):'')+'</b><div class="wb-note-sub">'+t+'<br>Reason: '+bgE(r.reason)+(v?'<br><b>Cannot be approved now: '+bgE(v)+'</b>':'')+'</div></div>';
}
/* A claim's, advance's or imprest request's budget check, for its approvers: what was found at submission, and now. */
function bgRecordEvalHTML(r){
  const k=caKind(r);if(['expense','advance','imprest'].indexOf(k)<0)return '';
  const e=r.bgEval;if(!e||e.result==='Not Evaluated'&&!bgCfg(r.entity).control)return '';
  const say=function(x){return bgDetailFor({budget:x.budget,leaf:x.alloc},r)?x.reason+(x.alloc?' · '+bgAllocKey(bgAlloc(x.alloc)):''):(x.pub||x.reason);};
  let now='';
  if(r.status==='Awaiting Approval'&&bgCfg(r.entity).control){
    const evs=k==='expense'?bgClaimEvals(r).map(function(x){return x.ev;}):k==='advance'?(r.bgt&&r.bgt.alloc?[bgEvaluate(bgAdvanceCtx(r))]:[]):(r.bgMapped?[bgEvaluate(bgImprestCtx(r))]:[]);
    const w=bgWorstEval(evs);
    if(w)now='<br>Now: '+bgE(w.result)+' - '+bgE(bgReasonFor(w,r))+(w.result==='Blocked'||w.missingRate?' Approving at this amount will be refused.':'');
  }
  const lines=e.lines?e.lines.map(function(x){const l=r.lines.find(function(y){return y.id===x.lineId;});return bgE((l?l.title:'Line')+': '+x.result+' - '+say(x));}).join('<br>')
    :bgE(e.result+' - '+say(e));
  return '<div class="wb-note is-data'+(e.result==='Warning'?' is-wait':e.result==='Blocked'||e.result==='Missing Exchange Rate'?' is-bad':'')+'"><b>Budget check at submission · '+bgE(e.result)+'</b><div class="wb-note-sub">'+lines
    +(e.just?'<br>Budget justification: '+bgE(e.just):'')+now+'</div></div>';
}

/* ── Expense form and claim panel ──────────────────────────────────────── */
/* Cost Centre and Project from Company Structure, on the claim and the advance alike. The advance's
   old free-text Cost Center and Project fields are no longer asked (product owner, 10 Nov 2026);
   values typed before stay on those advances. */
function bgDimSelects(d,prefix,hook){
  const cc=bgmActive('cc'),pj=bgmActive('project');
  if(!cc.length&&!pj.length)return '';
  const c=d.costCentreId?bgmRec('cc',d.costCentreId):null,p=d.projectId?bgmRec('project',d.projectId):null;
  return (cc.length?bgField('Cost Centre',false,apCS(prefix+'cc',['None'].concat(cc.map(bgmLabel)),c?bgmLabel(c):'None','Select',hook),'Needed only where the budget requires it.'):'')
    +(pj.length?bgField('Project',false,apCS(prefix+'prj',['None'].concat(pj.map(bgmLabel)),p?bgmLabel(p):'None','Select',hook)):'');
}
function bgDimSync(d,prefix){
  if(document.getElementById('csw-'+prefix+'cc')){const v=getCSValue(prefix+'cc');const m=bgmActive('cc').find(function(x){return bgmLabel(x)===v;});d.costCentreId=m?m.id:'';}
  if(document.getElementById('csw-'+prefix+'prj')){const v=getCSValue(prefix+'prj');const m=bgmActive('project').find(function(x){return bgmLabel(x)===v;});d.projectId=m?m.id:'';}
}
function bgExpFieldsHTML(d){
  return bgDimSelects(d,'exp-e-','expFormHook')+'<div class="ep-form-group ep-form-full" id="exp-e-budget">'+bgExpBudgetHTML(d)+'</div>';
}
function bgExpSync(d){
  bgDimSync(d,'exp-e-');
  const j=document.getElementById('exp-e-bgjust');if(j)d.bgJust=j.value.trim();
}
/* The claim as the form holds it now, for a budget check. */
function bgExpDraftClaim(d){
  const c=typeof expPolicyCtx==='function'?expPolicyCtx(d):{lines:[]};
  const r=!expModalOpen?expRec(expSelectedId):null;
  return {entity:bgEnt(),key:r?r.key:'NEW',employeeEid:d.eid,category:d.category,currency:d.currency,costCentreId:d.costCentreId||'',projectId:d.projectId||'',
    lines:(c.lines||[]).map(function(l,i){return Object.assign({},l,{id:l.id||i+1,amount:parseFloat(l.amount)||0,status:l.status||'Pending',approved:l.approved!=null?l.approved:null});})};
}
/* What remains on the line is shown only to people who may see that allocation; an employee sees the result and the overrun. */
function bgSeesAlloc(aid){const a=bgAlloc(aid),b=a?bgRec(a.budgetId):null;return !!b&&bgVisible(b)&&bgShownIds(b).indexOf(aid)>=0;}
function bgEvalRowsHTML(list,rec){
  return list.map(function(x){const ev=x.ev,det=bgDetailFor(ev,rec);
    return '<div class="ep-eval-row is-'+statusTone(ev.result)+'"><div class="ep-eval-hd"><span class="ep-eval-name">'+bgE(x.title)+'</span>'+bgEvalBadge(ev.result)+'</div>'
    +'<div>'+bgE(det?ev.reason:(ev.pub||ev.reason))
    +(det&&ev.leaf&&!ev.missingRate&&bgSeesAlloc(ev.leaf)?' <span class="ax-sub">'+bgE(bgAllocLabel(ev.leaf))+' · available '+expMoney(ev.nodes?ev.nodes[0].avail:0,ev.currency)+'</span>':'')
    +(det&&ev.nearLimit&&ev.result==='Within Budget'?' <span class="ax-sub">near limit</span>':'')+'</div></div>';}).join('');
}
function bgExpBudgetHTML(d){
  if(!d||!d.category||!bgCfg().control||(typeof mcOn==='function'&&!mcOn('budgets')))return '';
  const c=bgExpDraftClaim(d);
  if(!c.lines.some(function(l){return l.amount>0&&l.start;}))return '';
  const evs=bgClaimEvals(c).map(function(x){return {title:x.line.title||'Item',ev:x.ev};});
  if(!evs.length)return '';
  const need=evs.some(function(x){return x.ev.needJust;}),blk=evs.some(function(x){return x.ev.result==='Blocked';}),mr=evs.some(function(x){return x.ev.missingRate;});
  return '<div class="ep-eval"><div class="ep-form-label" style="margin-bottom:6px">Budget check</div>'+bgEvalRowsHTML(evs,null)
    +(mr?'<div class="ea-hint exp-cap-over">A missing exchange rate stops submission. Save as a draft; submit once Finance configures the rate.</div>'
      :blk?'<div class="ea-hint exp-cap-over">A Blocking budget stops submission. Save as a draft, then request a budget exception from the claim (or reduce the amount).</div>':'')
    +(need&&!blk?'<div class="ep-just"><label class="ep-form-label">Budget Justification <span class="req">*</span></label>'+bgArea('exp-e-bgjust',d.bgJust||'','Why this spend is needed beyond the budget')
      +'<div class="ea-hint">The approver sees the budget warning and your justification.</div></div>':'')+'</div>';
}
/* Open exceptions linked to a draft claim or advance. */
function bgExcFor(src){
  const key=(src.kind==='advance'?'ADV-':'EXP-')+src.key;
  return bgChanges.filter(function(e){return e.kind==='budget exception'&&e.sourceKey===key;});
}
function bgSrcPanelHTML(r,kind){
  const parts=[];
  const cc=r.costCentreId?bgmRec('cc',r.costCentreId):null,pj=r.projectId?bgmRec('project',r.projectId):null;
  if(cc||pj)parts.push((cc?'Cost Centre '+bgE(bgmLabel(cc)):'')+(cc&&pj?' · ':'')+(pj?'Project '+bgE(bgmLabel(pj)):''));
  if(kind==='advance'&&r.plannedCategory)parts.push('Planned sub category: '+bgE(r.plannedCategory));
  const key=(kind==='advance'?'ADV-':'EXP-')+r.key,exs=bgExcForSource(key);
  let ev='',btn='';
  if(r.status==='Draft'&&bgCfg(r.entity).control&&(typeof mcOn!=='function'||mcOn('budgets'))){
    const evs=kind==='expense'?bgClaimEvals(r).map(function(x){return {title:x.line.title,ev:x.ev};}):[{title:'Advance',ev:bgEvaluate(bgAdvanceCtx(r))}];
    if(evs.length)ev='<div class="ep-eval">'+bgEvalRowsHTML(evs,r)+'</div>';
    /* A part still needs an exception when none is open for it, and no approved one still covers it. */
    const need=bgExcPortions(kind,r).filter(function(p){return !exs.some(function(e){return e.allocId===p.alloc&&(e.fy||'')===p.fy&&(e.quarter||0)===p.q
      &&(['Draft','Awaiting Approval','Follow-Up'].indexOf(e.status)>=0||(['Approved','Partially Approved'].indexOf(e.status)>=0&&bgExcCovers(e).ok));});});
    const mine=caIsClaimant(r,bgMe())||r.createdBy===bgMe();
    if(need.length&&mine&&bgCan('budget.exception.request'))btn=bgBtn('Request Budget Exception','bgActOpen(\'exception\','+r.id+',{sourceKind:\''+kind+'\',sourceId2:'+r.id+'})',true);
  }else if(r.bgEval&&r.bgEval.result!=='Not Evaluated'){
    ev=bgRecordEvalHTML(r);
  }
  if(exs.length)parts.push('Budget exception'+(exs.length>1?'s':'')+': '+exs.map(function(e){
    const det=bgDetailFor({budget:e.budgetId,leaf:e.allocId},r),st=bgExcState(e);
    return bgE(expKey(e))+' '+bgE(st)+(e.quarter?' (Q'+e.quarter+')':'')+(det&&e.approvedLimit?' (authority '+expMoney(e.approvedLimit,e.currency)+')':'')
      +(st==='Needs Re-evaluation'?' - the request changed; '+bgE(e.reeval.why):'');}).join('; ')
    +(exs.some(function(e){return ['Awaiting Approval','Follow-Up'].indexOf(e.status)>=0;})?' - this draft stays a draft until it is decided.':''));
  if(!parts.length&&!ev&&!btn)return '';
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Budget</span><span class="ca-actions">'+btn+'</span></div>'
    +(parts.length?'<div class="wb-note is-data">'+parts.join('<br>')+'</div>':'')+ev;
}
function bgClaimPanelHTML(r){return bgSrcPanelHTML(r,'expense');}
/* Expenses and Advances & Imprest pages show the exception popup when it is opened there. */
['buildExpensesHTML','buildAdvancesHTML'].forEach(function(n){
  const orig=window[n];if(typeof orig!=='function')return;
  const host=n==='buildExpensesHTML'?'expenses':'advances';
  window[n]=function(){return orig.apply(this,arguments)+(bgAct&&bgAct.host===host?bgActHTML():'');};
});

/* ── Advance form and panel ────────────────────────────────────────────── */
function bgAdvCats(d){const t=d.typeId?advType(d.typeId):null;return t&&t.cats.length?t.cats:EXP_CATEGORIES;}
/* Planned Sub Category: shown just below the advance's Sub Category (its type), offering the claim
   sub categories that type may be spent on. */
function bgAdvPlannedFieldHTML(d){
  const cats=bgAdvCats(d);
  return bgField('Planned Sub Category',false,apCS('advf-pcat',['Not specified'].concat(cats),d.plannedCategory||'Not specified','Select','advFormHook'),
      'Optional: which budget line the advance draws on. '+(cats.length===1?'This type funds one sub category, so it is used.':'Without it, the department\'s general line applies.'));
}
/* Cost Centre, Project and the budget check, where the advance form asks for them. */
function bgAdvFormFieldsHTML(d){
  let f=bgDimSelects(d,'advf-','advFormHook');
  if(bgCfg().control&&(typeof mcOn!=='function'||mcOn('budgets'))&&d.eid&&d.typeId&&parseFloat(d.amount)>0){
    const r={entity:bgEnt(),key:d.id?advRec(d.id).key:'NEW',typeId:d.typeId,plannedCategory:d.plannedCategory,employeeEid:d.eid,periodFrom:d.periodFrom,requiredBy:d.requiredBy,
      costCentreId:d.costCentreId,projectId:d.projectId,currency:d.currency,lines:[{id:1,amount:parseFloat(d.amount)||0}]};
    const ev=bgEvaluate(bgAdvanceCtx(r));
    f+='<div class="ep-form-group ep-form-full"><div class="ep-eval">'+bgEvalRowsHTML([{title:'Budget check',ev:ev}],null)
      +(ev.missingRate?'<div class="ea-hint exp-cap-over">A missing exchange rate stops submission. Save as a draft; submit once Finance configures the rate.</div>'
        :ev.result==='Blocked'?'<div class="ea-hint exp-cap-over">A Blocking budget stops submission. Save as a draft, then request a budget exception from the advance.</div>':'')+'</div></div>';
    if(ev.needJust)f+=bgField('Budget Justification',true,bgArea('advf-bgjust',d.bgJust,'Why this advance is needed beyond the budget'),'',true);
  }
  return f;
}
function bgAdvFormSync(d){
  if(document.getElementById('csw-advf-pcat')){const v=getCSValue('advf-pcat');d.plannedCategory=v==='Not specified'?'':v;}
  bgDimSync(d,'advf-');
  const j=document.getElementById('advf-bgjust');if(j)d.bgJust=j.value;
}
function bgAdvPanelHTML(r){return bgSrcPanelHTML(r,'advance');}

/* ── Funding source on payouts (Build 4 and Build 5 popups) ────────────── */
function fbSourceFieldHTML(id,sourceId,cur,ent,amount){
  if(!fbTrackingOn(ent||bgEnt()))return '';
  const list=fbSourcesHere(true).filter(function(s){return s.currency===cur;});
  const s=sourceId?fbSource(sourceId):null;
  let hint='Required while funding-source tracking is on. Its balance is the recorded internal balance, not a bank balance.';
  if(s){const room=fbAvailable(s);hint='Available after payouts in progress'+(fbReserved(s)?' and '+expMoney(fbReserved(s),s.currency)+' reserved for approved commitments':'')+': '+expMoney(room,s.currency)+' · rule '+s.enforcement+'.'+(Number(amount)>room+0.001&&s.enforcement!=='Informational'?' This payment is above it.':'');}
  return bgField('Funding Source',true,list.length?apCS(id,list.map(fbSourceLabel),s?fbSourceLabel(s):'','Select source',id.indexOf('adva')===0?'advActHook':'caActHook')
    :bgRo('No active '+cur+' funding source - add one in Funding & Budgets'),hint,true);
}

/* ── Company Settings: Cost Centres, Projects, Base Currency ───────────── */
function bgmOpen(kind,id){
  if(!bgCan('foundation.dept.manage')){emsDeny('maintain Company Structure');return;}
  const x=id!=null?bgmRec(kind,id):null;
  bgmForm=x?{kind:kind,id:x.id,code:x.code,name:x.name,dept:x.dept,ownerUid:x.ownerUid,from:kind==='project'?x.startDate:x.effFrom,to:kind==='project'?x.endDate:x.effTo,desc:x.desc}
    :{kind:kind,id:null,code:'',name:'',dept:'',ownerUid:'',from:wbToday(),to:'',desc:''};
  refreshCsSidebar();
}
function bgmClose(){bgmForm=null;refreshCsSidebar();}
function bgmOwnerPool(){return idUsersIn(bgEnt()).map(function(u){return u.userId;});}
function bgmFormSync(){
  const f=bgmForm;if(!f)return;
  [['code','bgm-code'],['name','bgm-name'],['desc','bgm-desc'],['from','bgm-from'],['to','bgm-to']].forEach(function(p){const x=bgVal(p[1]);if(x!=null)f[p[0]]=x;});
  if(document.getElementById('csw-bgm-dept')){const v=getCSValue('bgm-dept');f.dept=v==='None'?'':v;}
  if(document.getElementById('csw-bgm-owner'))f.ownerUid=idFromLabel(getCSValue('bgm-owner'),bgmOwnerPool());
}
function bgmFormHTML(){
  const f=bgmForm,noun=bgmNoun(f.kind),pool=bgmOwnerPool();
  return '<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+(f.id!=null?'Edit ':'Add ')+noun+'</span></div>'
    +'<div class="ep-form-grid">'
    +bgField(noun+' Code',true,bgInput('bgm-code',f.code,f.kind==='project'?'e.g. RDS-FY27':'e.g. SAL-FLD'),'Unique in this entity.')
    +bgField(noun+' Name',true,bgInput('bgm-name',f.name,''))
    +bgField('Department',false,apCS('bgm-dept',['None'].concat(csDeptNames()),f.dept||'None','Select'))
    +bgField(f.kind==='project'?'Project Owner':'Cost Centre Owner',false,axCS('bgm-owner',idLabels(pool),f.ownerUid?idLabel(f.ownerUid,pool):'','Optional'))
    +bgField(f.kind==='project'?'Start Date':'Effective From',false,apCD('bgm-from',f.from,'Select date'))
    +bgField(f.kind==='project'?'End Date':'Effective To',false,apCD('bgm-to',f.to,'Open-ended'))
    +bgField('Description',false,bgArea('bgm-desc',f.desc,''),'',true)
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="bgmClose()">Cancel</button><button class="ep-save-btn" onclick="bgmSaveClick()">'+(f.id!=null?'Save changes':'Save')+'</button></div></div>';
}
function bgmSaveClick(){
  bgmFormSync();const f=bgmForm;if(!f)return;
  const d={id:f.id,code:f.code,name:f.name,dept:f.dept,ownerUid:f.ownerUid,desc:f.desc};
  if(f.kind==='project'){d.startDate=f.from;d.endDate=f.to;}else{d.effFrom=f.from;d.effTo=f.to;}
  const e=bgmSave(f.kind,d);if(e){showToast('Not saved','error',e);return;}
  const noun=bgmNoun(f.kind);bgmForm=null;refreshCsSidebar();showToast(noun+' saved','success',String(d.code).toUpperCase()+' · '+d.name+' can be picked on budgets, claims and advances.');
}
function bgmStatusClick(kind,id,status){
  const e=bgmSetStatus(kind,id,status);if(e){showToast('Not saved','error',e);return;}
  refreshCsSidebar();const x=bgmRec(kind,id);showToast(bgmNoun(kind)+' '+status.toLowerCase(),'success',x.code+(status==='Active'?' can be picked again.':' can no longer be picked for new transactions; history keeps it.'));
}
function bgmUsedBy(kind,id){
  const f=kind==='project'?'prjId':'ccId',rf=kind==='project'?'projectId':'costCentreId';
  let n=0;bgBudgets.forEach(function(b){b.allocations.forEach(function(a){if(a[f]===id)n++;});});
  const recs=expensesData.concat(advancesData).filter(function(r){return r[rf]===id;}).length;
  return n+' allocation'+(n===1?'':'s')+' · '+recs+' record'+(recs===1?'':'s');
}
function bgmMapClick(kind,i){
  const row=bgmFreeText(kind)[i];if(!row)return;
  const v=getCSValue('bgm-map-'+kind+'-'+i);const m=bgmActive(kind).find(function(x){return bgmLabel(x)===v;});
  if(!m){showToast('Pick the '+bgmNoun(kind).toLowerCase(),'error','Choose the active '+bgmNoun(kind).toLowerCase()+' this text means.');return;}
  const e=bgmMapFreeText(kind,row.text,m.id);if(e){showToast('Not mapped','error',e);return;}
  refreshCsSidebar();showToast('Mapped','success','"'+row.text+'" → '+bgmLabel(m)+' on '+row.recs.length+' record'+(row.recs.length===1?'':'s')+'. The original text is kept.');
}
function bgmTabHTML(kind){
  const list=bgmList(kind),noun=bgmNoun(kind),can=bgCan('foundation.dept.manage');
  const formOn=bgmForm&&bgmForm.kind===kind,free=bgmFreeText(kind),act=bgmActive(kind);
  return (formOn?bgmFormHTML():can?'<div class="att-bar csag-bar"><div class="att-bar-actions"><button class="att-link" onclick="bgmOpen(\''+kind+'\')">'+BG_ICO.plus+'Add '+noun+'</button></div></div>':'')
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>'+noun+'</th><th>Department</th><th>'+(kind==='project'?'Start – End':'Effective')+'</th><th>Status</th>'+(can?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
    +(list.length?list.map(function(x,i){
      const from=kind==='project'?x.startDate:x.effFrom,to=kind==='project'?x.endDate:x.effTo;
      const moves=kind==='project'?['Active','Inactive','Completed']:['Active','Inactive'];
      return '<tr'+(formOn&&bgmForm.id===x.id?' class="csr-editing"':'')+'><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td"><div class="lp-c-main">'+bgE(x.name)+'</div><div class="lp-c-sub">'+bgE(x.code)+'</div></td>'
        +'<td class="csag-td">'+bgE(x.dept||'—')+'<div class="lp-c-sub">'+bgE(x.ownerUid?caN(x.ownerUid):'no owner')+'</div></td>'
        +'<td class="csag-td">'+(from?cdLabel(from):'—')+(to?' – '+cdLabel(to):'')+'<div class="lp-c-sub">'+bgmUsedBy(kind,x.id)+'</div></td>'
        +'<td class="csag-td"><span class="lp-status-badge tone-'+statusTone(x.status)+'">'+x.status+'</span></td>'
        +(can?'<td class="csag-td csag-act"><button class="att-row-btn" title="Edit" onclick="bgmOpen(\''+kind+'\','+x.id+')">'+BG_ICO.edit+'</button>'
          +moves.filter(function(s){return s!==x.status;}).map(function(s){return '<button class="btn btn-outline btn-sm" onclick="bgmStatusClick(\''+kind+'\','+x.id+',\''+s+'\')">'+(s==='Active'?'Activate':s==='Inactive'?'Deactivate':'Complete')+'</button>';}).join(' ')+'</td>':'')
        +'</tr>';}).join(''):bgEmpty(can?6:5,'No '+noun.toLowerCase()+' yet.'))
    +'</tbody></table></div>'
    +'<div class="ea-hint">Only active '+noun.toLowerCase()+'s'+(kind==='project'?' within their dates':'')+' can be picked on budgets, claims and advances. Deactivated ones stay on the records that used them.</div>'
    +(free.length?'<div class="wb-proj-h">Free-text values on existing advances</div>'
      +'<div class="wb-note">Advances raised before this master existed carry the '+noun.toLowerCase()+' as typed text. Nothing is converted automatically; map a value to an active '+noun.toLowerCase()+' and every advance carrying it is linked (the original text is kept).</div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Text as Entered</th><th>Records</th><th>Maps To</th>'+(can?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
      +free.map(function(row,i){return '<tr><td class="csag-td">"'+bgE(row.text)+'"</td><td class="csag-td">'+row.recs.map(expKey).join(', ')+'</td>'
        +'<td class="csag-td">'+(can?apCS('bgm-map-'+kind+'-'+i,act.map(bgmLabel),'','Select '+noun.toLowerCase()):'—')+'</td>'
        +(can?'<td class="csag-td csag-act">'+bgBtn('Map','bgmMapClick(\''+kind+'\','+i+')')+'</td>':'')+'</tr>';}).join('')
      +'</tbody></table></div>':'');
}
let bgBaseCurEdit=false;
function bgBaseCurrencyFieldHTML(fc,icon){
  const ent=bgEnt(),cur=bgBaseCurrency(ent),e=bgEntityRow(ent);
  const note=e&&!e.baseCurrency&&cur?' <span class="ax-sub">default for '+bgE(e.country)+', not yet confirmed</span>':'';
  const can=bgCan('foundation.entity.update');
  if(can&&bgBaseCurEdit)return fc(icon,'Base Currency','<div class="bg-basecur-edit">'+apCS('bg-basecur',EXP_CURRENCIES,cur,'Select')
    +'<div class="bg-basecur-btns"><button class="btn btn-outline btn-sm" onclick="bgBaseCurCancel()">Cancel</button><button class="btn btn-primary btn-sm" onclick="bgBaseCurSave()">Save</button></div>'
    +'<div class="ea-hint">New budgets and funding sources start in it; existing ones keep their own currency.</div></div>');
  return fc(icon,'Base Currency',(cur||'Not set')+note+(can?' <button class="att-link" onclick="bgBaseCurOpen()">Change</button>':''));
}
function bgBaseCurOpen(){bgBaseCurEdit=true;refreshCsSidebar();}
function bgBaseCurCancel(){bgBaseCurEdit=false;refreshCsSidebar();}
function bgBaseCurSave(){
  const v=getCSValue('bg-basecur');
  const e=entSetBaseCurrency(bgEnt(),v);if(e){showToast('Not saved','error',e);return;}
  bgBaseCurEdit=false;refreshCsSidebar();showToast('Base currency saved','success',idEntityName(bgEnt())+' · '+v+'.');
}
/* The header Export button's right on the Reports tab: budget or funding, by the open report. */
function bgRepExportPerm(){const r=BG_REPORTS.find(function(x){return x[0]===bgRep;});return r&&r[2]==='f'?'funding.report.export':'budget.report.export';}
