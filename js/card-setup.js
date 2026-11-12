/* ══ CORPORATE CARDS → CARD SETUP (product owner, 12 Nov 2026) ══════════════════════════════════════════════════
   Card Programmes and Card Enrollment leave Company Settings (they were its Expense & Cards tab) and become a page of
   their own, Card Setup, the last item in the Corporate Cards menu. They are card setup, not the company's profile:
   the providers and programmes every card request and load hangs off, and the enrollment fields an employee fills in
   on the ONC Card tab.

   Super Admin only, "for now" (product owner, 12 Nov 2026): no other role sees the menu item or opens the page.

   LISTING PAGES (product owner, 12 Nov 2026: "show it like the other listing pages and manage things inside the action
   tabs"). The one long stacked screen is split into four tabs:
     Programmes        - a listing (filters, status tiles, ☰ per row). The row's panel: Basic Details (Edit opens the
                         programme form there), Submission Policy (this programme's override), Logs (Activate /
                         Deactivate with the reason), History. + in the top bar adds a programme.
     Providers         - a listing of the card providers. The row's panel: Basic Details (Enable / Disable), Logs.
     Submission Policy - the entity's card expense submission policy and its history (unchanged screen).
     Card Enrollment   - the enrollment fields (unchanged screen).
   The forms and the saves are the existing ones (js/cards-ui.js, js/onc-enrollment.js); they repaint by calling
   refreshCsSidebar(), which repaints this page while it is the one on screen. Change logs also still land in
   Company Settings → Logs. */
const CSU_PAGE='card-setup';
let csuTab='programmes';
let csuProgSel=null,csuProgTab='basic-details',csuProgQ='',csuProgStatusF='',csuProgProvF='';
let csuProvSel=null,csuProvTab='basic-details',csuProvQ='',csuProvStatusF='';
function csuAllowed(){return typeof emsRole==='function'&&emsRole()==='Super Admin';}
let csuPolSel=null,csuPolTab='basic-details',csuPolQ='',csuPolSrcF='';
let csuEnrSel=null,csuEnrTab='basic-details',csuEnrQ='',csuEnrGroupF='',csuEnrRuleF='',csuEnrStatF='';
function csuCloseForms(){
  if(typeof ccProgForm!=='undefined')ccProgForm=null;if(typeof ccPolForm!=='undefined')ccPolForm=null;if(typeof ccDemoForm!=='undefined')ccDemoForm=null;
  if(typeof oncFieldForm!=='undefined')oncFieldForm=null;if(typeof oncProgEdit!=='undefined')oncProgEdit.reg=null;
}
function csuSetTab(t){if(csuTab===t)return;csuTab=t;csuCloseForms();renderADTPage();}
function buildCardSetupHTML(){
  if(!csuAllowed())return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>Card Setup is open to the Super Admin.</span></div></div>';
  const tabs=[{id:'programmes',label:'Programmes'},{id:'providers',label:'Providers'},{id:'policy',label:'Submission Policy'},{id:'onc-enrollment',label:'Card Enrollment'}];
  if(!tabs.some(function(t){return t.id===csuTab;}))csuTab='programmes';
  let body;
  if(csuTab==='providers')body=csuProvListHTML();
  else if(csuTab==='policy')body=csuPolListHTML();
  else if(csuTab==='onc-enrollment')body=csuEnrListHTML();
  else body=csuProgListHTML();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,csuTab,'csuSetTab',true)+body+'</div>';
}

/* ── Shared bits ── */
const CSU_ICO={
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  flow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/></svg>',
  bank:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10h18L12 4z"/><line x1="5" y1="10" x2="5" y2="18"/><line x1="10" y1="10" x2="10" y2="18"/><line x1="14" y1="10" x2="14" y2="18"/><line x1="19" y1="10" x2="19" y2="18"/><line x1="3" y1="20" x2="21" y2="20"/></svg>'
};
function csuFc(ico,label,val,wide){
  return '<div class="lp-sb-field-card'+(wide?' is-wide':'')+'"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div>'
    +'<div class="lp-sb-field-value">'+(val!=null&&val!==''?val:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
}
function csuDots(click,label){return '<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(label)+'" onclick="'+click+'">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td>';}
function csuOpenPanel(key,render){
  const sb=document.getElementById(key+'-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab(key,render);
}

/* ══ PROGRAMMES ═════════════════════════════════════════════════════════ */
function csuProgShown(){
  const q=String(csuProgQ||'').trim().toLowerCase();
  return ccProgs().filter(function(p){
    if(csuProgStatusF&&p.status!==csuProgStatusF)return false;
    if(csuProgProvF&&(p.provider?ccProviderName(p.provider):'None')!==csuProgProvF)return false;
    return !q||[p.name,p.key,p.code,p.type,p.fundingMode].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;});
  });
}
function csuProgListHTML(){
  const all=ccProgs(),rows=csuProgShown();
  if(csuProgSel!=null&&!rows.some(function(p){return p.id===csuProgSel;}))csuProgSel=null;
  const adding=typeof ccProgForm!=='undefined'&&ccProgForm&&ccProgForm.id==null&&!ccProgForm.statusFor;
  const pgn=listPage('csu-prog',[csuProgQ,csuProgStatusF,csuProgProvF].join('|'),rows.map(function(p,i){
    return '<tr class="csu-prog-row'+(csuProgSel===p.id?' lp-row-selected':'')+'" id="csu-prog-row-'+p.id+'" style="cursor:pointer" onclick="csuProgOpen('+p.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(p.name)+'</div><div class="lp-c-sub">'+ccE(p.key)+' · '+ccE(p.code)+(p.autoIssue?' · issued automatically':'')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(p.type)+'</div><div class="lp-c-sub">'+ccE(p.fundingMode)+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE((p.forms||[]).join(', '))+'</div><div class="lp-c-sub">'+ccE((p.wallets||[]).map(wbTypeName).join(', ')||'No wallet')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(p.provider?ccProviderName(p.provider):'None')+'</div></td>'
      +'<td>'+axBadge(statusTone(p.status),p.status)+'</td>'
      +csuDots('csuProgOpen('+p.id+')',p.name)+'</tr>';
  }),ccEmpty(7,all.length?'No programme matches this filter.':'No card programme yet. Use + to add one.'));
  const cnt=function(s){return all.filter(function(p){return p.status===s;}).length;};
  const tiles=caStat('Active',cnt('Active'),csuProgStatusF==='Active','csuProgStat(\'Active\')','ok')
    +caStat('Inactive',cnt('Inactive'),csuProgStatusF==='Inactive','csuProgStat(\'Inactive\')','idle');
  const provs=['None'].concat(ONC_PROVIDERS.map(function(p){return p.name;}));
  return '<div class="lp-page">'
    +ccFilterBar(lpSearchField('csu-prog-q',csuProgQ,'Search programme, key or code','csuProgApply()')
      +apCS('csu-prog-prov',provs,csuProgProvF,'All Providers')
      +apCS('csu-prog-status',['Active','Inactive'],csuProgStatusF,'All Statuses')
      +clearFiltersBtn([csuProgQ,csuProgStatusF,csuProgProvF],'csuProgReset()')+'<button class="lp-pill-search" onclick="csuProgApply()">Search</button>',tiles)
    +(typeof ccDemoOn==='function'&&ccDemoOn()||typeof ccDemoForm!=='undefined'&&ccDemoForm?(typeof ccCan==='function'&&ccCan('card.demo.manage')&&typeof ccDemoRowHTML==='function'?ccDemoRowHTML():ccDemoNote()):'')
    +(adding?'<div style="margin-top:14px">'+ccProgFormHTML()+'</div>':'')
    +ccSplit('csup','<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Programme</th><th>Type · Funding</th><th>Cards · Wallets</th><th>Provider</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,csuProgSel!=null&&!adding,renderCsuProgSidebar)
    +'</div>';
}
function csuProgApply(){csuProgQ=lpSearchValue('csu-prog-q');const p=getCSValue('csu-prog-prov'),s=getCSValue('csu-prog-status');csuProgProvF=p==='All Providers'?'':p||'';csuProgStatusF=s==='All Statuses'?'':s||'';csuProgSel=null;renderADTPage();}
function csuProgReset(){csuProgQ='';csuProgStatusF='';csuProgProvF='';csuProgSel=null;renderADTPage();}
function csuProgStat(s){csuProgStatusF=csuProgStatusF===s?'':s;csuProgSel=null;renderADTPage();}
function csuProgOpen(id,tab){
  if(csuProgSel!==id)csuCloseForms();
  csuProgTab=tab||sbKeepTab(csuProgSel,csuProgTab);csuProgSel=id;
  csuOpenPanel('csup',renderCsuProgSidebar);
  document.querySelectorAll('.csu-prog-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='csu-prog-row-'+id);});
}
function csuProgClose(){csuProgSel=null;csuCloseForms();const sb=document.getElementById('csup-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.csu-prog-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function csuProgNav(t){if(t!==csuProgTab)csuCloseForms();csuProgTab=t;isbTab('csup',renderCsuProgSidebar);}
function csuProgAdd(){if(typeof ccProgOpen!=='function')return;csuProgSel=null;ccProgOpen();}
function csuProgEdit(id){csuProgTab='basic-details';ccProgOpen(id);}
function renderCsuProgSidebar(){
  const p=ccProg(csuProgSel);if(!p)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'policy',label:'Submission Policy'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===csuProgTab;}))csuProgTab='basic-details';
  const can=ccCan('card.programme.manage'),editing=typeof ccProgForm!=='undefined'&&ccProgForm&&ccProgForm.id===p.id&&!ccProgForm.statusFor;
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(p.name),meta:[ccE(p.key),ccE(p.code)],status:axBadge(statusTone(p.status),p.status),editing:editing,
    edit:can&&!editing&&csuProgTab==='basic-details'?'<button class="lp-sb-view-edit-btn" onclick="csuProgEdit('+p.id+')">'+CC_ICO.edit+' Edit</button>':''});
  let body;
  if(csuProgTab==='policy')body=hero+csuProgPolicyHTML(p,can);
  else if(csuProgTab==='logs')body=csuProgLogsHTML(p,can);
  else if(csuProgTab==='history')body=sbHistoryHTML(p);
  else if(csuProgTab==='workflow')body=csuProgWorkflowHTML(p);
  else body=hero+(editing?ccProgFormHTML():csuProgBasicHTML(p));
  return axTabBar('csup',tabs,csuProgTab,'csuProgNav','csuProgClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function csuProgBasicHTML(p){
  const wf=p.workflowId&&typeof caWfRec==='function'?caWfRec(p.workflowId):null;
  return '<div class="lp-sb-detail-grid">'
    +csuFc(CSU_ICO.tag,'Programme Type',ccE(p.type))+csuFc(CSU_ICO.money,'Funding Mode',ccE(p.fundingMode))
    +csuFc(CSU_ICO.bank,'Provider',ccE(p.provider?ccProviderName(p.provider)+' · '+ccProviderStatus(p):'None'))
    +csuFc(CSU_ICO.card,'Card Forms',ccE((p.forms||[]).join(', ')))
    +csuFc(CSU_ICO.money,'Currency',ccE(p.currency))+csuFc(CSU_ICO.tag,'Country / Region',ccE(p.country||''))
    +csuFc(CSU_ICO.card,'Wallets',ccE((p.wallets||[]).map(wbTypeName).join(', ')),true)
    +csuFc(CSU_ICO.users,'Eligible Employment Models',ccE((p.models||[]).join(', ')))
    +csuFc(CSU_ICO.users,'Eligible Departments',ccE((p.depts||[]).length?p.depts.join(', '):'All departments'))
    +csuFc(CSU_ICO.users,'Employee Self-Request',p.selfRequest?'Allowed':'Not allowed')
    +csuFc(CSU_ICO.users,'Administrative Request',p.adminRequest?'Allowed':'Not allowed')
    +csuFc(CSU_ICO.card,'Max Active Cards per Employee',ccE(String(p.maxCards||'')))
    +csuFc(CSU_ICO.card,'Issue Cards Automatically',p.autoIssue?'On':'Off')
    +csuFc(CSU_ICO.flow,'Card Request Approval Workflow',wf?ccE(caWfKey(wf)+' '+wf.name):'',true)
    +csuFc(CSU_ICO.cal,'Effective From',p.effFrom?ccE(cdLabel(p.effFrom)):'')+csuFc(CSU_ICO.cal,'Effective To',p.effTo?ccE(cdLabel(p.effTo)):'Open-ended')
    +csuFc(CSU_ICO.tag,'Description',ccE(p.desc||''),true)
    +'</div>';
}
/* This programme's card expense submission policy: what is in force today, the override form, its versions. */
function csuProgPolicyHTML(p,can){
  if(typeof ccClaimPolAt!=='function')return '';
  const ent=ccEnt(),today=ccEntToday(ent),cur=ccClaimPolAt(ent,p.id,today);
  const vs=ccClaimPols(ent).versions.filter(function(v){return v.scope==='programme'&&v.programmeId===p.id;}).slice().reverse();
  const formOpen=typeof ccPolForm!=='undefined'&&ccPolForm&&ccPolForm.programmeId===p.id;
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Card Expense Submission Policy</span>'
      +(can&&!formOpen?'<button class="lp-sb-view-edit-btn" onclick="ccPolOpen(\'programme\','+p.id+')">'+CC_ICO.edit+' Override</button>':'')+'</div>'
    +(formOpen?ccPolFormHTML():'')
    +'<div class="lp-sb-detail-grid">'
      +csuFc(CSU_ICO.tag,'Source',ccE(cur.source))
      +csuFc(CSU_ICO.cal,'Since',cur.effFrom?ccE(cdLabel(cur.effFrom)):'')
      +csuFc(CSU_ICO.flow,'In Force Today',ccE(ccClaimPolText(cur)),true)
    +'</div>'
    +(vs.length?'<div class="wb-proj-h">Override history</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>From</th><th>Policy</th><th>Set By</th></tr></thead><tbody>'
      +vs.map(function(v){return '<tr><td class="csag-td">v'+v.v+(v.replaced?' <span class="lp-c-sub">replaced</span>':'')+'</td><td class="csag-td">'+ccE(cdLabel(v.effFrom))+'</td>'
        +'<td class="csag-td" style="white-space:normal">'+ccE(v.inherit?'Uses the entity policy':ccClaimPolText(Object.assign({configured:true},v)))+'</td><td class="csag-td">'+ccE(caN(v.by))+'</td></tr>';}).join('')
      +'</tbody></table></div>':'<div class="wb-note"><div class="wb-note-sub">No override yet: this programme uses the entity policy (Submission Policy tab).</div></div>');
}
/* Logs: the programme's own log, with its status move (Activate, or Deactivate with the reason). */
function csuProgLogsHTML(p,can){
  const next=p.status==='Active'?'Inactive':'Active';
  const form=can?'<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+(p.status==='Active'?'active':'inactive')+'"></span>'+ccE(p.status)+'</div>'
    +'<p class="lp-logs-form-sub">'+(next==='Inactive'?'Deactivate: no new requests, cards or loads; existing cards and history are kept.':'Activate: the programme takes new requests again.')+'</p>'
    +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
    +apCS('csup-log-status',[next],next,'Select Status')
    +'<div class="lp-logs-form-label">Comment'+(next==='Inactive'?' <span class="lp-logs-form-req">*</span>':'')+'</div>'
    +'<textarea class="lp-logs-form-textarea" id="ccp-reason" placeholder="'+(next==='Inactive'?'Reason for deactivating':'Comment')+'"></textarea>'
    +'<button class="lp-logs-save-btn" onclick="csuProgLogSave('+p.id+',\''+next+'\')">Save</button>'
    +'</div>':'';
  return lpLogsView(p.logs||[],form);
}

/* ══ SUBMISSION POLICY ══════════════════════════════════════════════════
   One row for the entity policy and one per programme. The row's panel: Basic Details (what is in force, Set /
   Override opens the existing policy form there) and Versions (that scope's policy history). */
function csuPolRows(){
  const ent=ccEnt(),today=ccEntToday(ent),book=ccClaimPols(ent);
  const next=function(scope,pid){const f=book.versions.filter(function(v){return v.scope===scope&&v.programmeId===pid&&v.effFrom>today&&!v.replaced;}).sort(function(a,b){return a.effFrom<b.effFrom?-1:1;})[0];return f?'v'+f.v+' from '+cdLabel(f.effFrom):'';};
  const e0=ccClaimPolPick(book.versions.filter(function(v){return v.scope==='entity'&&v.effFrom<=today;}));
  const rows=[{key:'e',scope:'entity',pid:null,name:'Entity policy',sub:idEntityName(ent),
    text:e0?ccClaimPolText(Object.assign({configured:true},e0)):ccClaimPolText({configured:false}),since:e0?cdLabel(e0.effFrom):'',next:next('entity',null),
    source:e0?'Entity policy':'Not configured',versions:book.versions.filter(function(v){return v.scope==='entity';})}];
  ccProgs(ent).forEach(function(p){
    const v=ccClaimPolPick(book.versions.filter(function(x){return x.scope==='programme'&&x.programmeId===p.id&&x.effFrom<=today;})),own=!!(v&&!v.inherit);
    rows.push({key:'p'+p.id,scope:'programme',pid:p.id,name:p.name,sub:p.key+' · '+p.code,
      text:own?ccClaimPolText(ccClaimPolAt(ent,p.id,today)):'Uses the entity policy',since:v?cdLabel(v.effFrom):'',next:next('programme',p.id),
      source:own?'Programme override':'Uses entity policy',versions:book.versions.filter(function(x){return x.scope==='programme'&&x.programmeId===p.id;})});
  });
  return rows;
}
function csuPolListHTML(){
  if(typeof ccClaimPols!=='function')return '';
  const all=csuPolRows(),q=String(csuPolQ||'').trim().toLowerCase();
  const rows=all.filter(function(r){return (!csuPolSrcF||r.source===csuPolSrcF)&&(!q||[r.name,r.sub,r.text].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}));});
  if(csuPolSel!=null&&!rows.some(function(r){return r.key===csuPolSel;}))csuPolSel=null;
  const pgn=listPage('csu-pol',[csuPolQ,csuPolSrcF].join('|'),rows.map(function(r,i){
    return '<tr class="csu-pol-row'+(csuPolSel===r.key?' lp-row-selected':'')+'" id="csu-pol-row-'+r.key+'" style="cursor:pointer" onclick="csuPolOpen(\''+r.key+'\')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(r.name)+'</div><div class="lp-c-sub">'+ccE(r.sub)+'</div></td>'
      +'<td style="white-space:normal"><div class="lp-c-plain">'+ccE(r.text)+'</div></td>'
      +'<td><div class="lp-c-plain">'+(r.since?ccE(r.since):'-')+'</div>'+(r.next?'<div class="lp-c-sub">next '+ccE(r.next)+'</div>':'')+'</td>'
      +'<td>'+axBadge(r.source==='Not configured'?'idle':r.source==='Programme override'?'info':'ok',r.source)+'</td>'
      +csuDots('csuPolOpen(\''+r.key+'\')',r.name)+'</tr>';
  }),ccEmpty(6,'No policy matches this filter.'));
  const cnt=function(s){return all.filter(function(r){return r.source===s;}).length;};
  const tile=function(s,tone){return caStat(s,cnt(s),csuPolSrcF===s,'csuPolStat(\''+s+'\')',tone);};
  return '<div class="lp-page">'
    +ccFilterBar(lpSearchField('csu-pol-q',csuPolQ,'Search policy or programme','csuPolApply()')
      +apCS('csu-pol-src',['Entity policy','Not configured','Programme override','Uses entity policy'],csuPolSrcF,'All Sources')
      +clearFiltersBtn([csuPolQ,csuPolSrcF],'csuPolReset()')+'<button class="lp-pill-search" onclick="csuPolApply()">Search</button>',
      tile('Programme override','info')+tile('Uses entity policy','ok'))
    +'<div class="wb-note"><div class="wb-note-sub">Whether a posted card transaction needs an expense claim, and by when. '+(typeof CCD_SCHED_NOTE!=='undefined'?CCD_SCHED_NOTE:'')+'</div></div>'
    +ccSplit('csuq','<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Applies To</th><th>In Force Today</th><th>Since</th><th>Source</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,csuPolSel!=null,renderCsuPolSidebar)
    +'</div>';
}
function csuPolApply(){csuPolQ=lpSearchValue('csu-pol-q');const s=getCSValue('csu-pol-src');csuPolSrcF=s==='All Sources'?'':s||'';csuPolSel=null;renderADTPage();}
function csuPolReset(){csuPolQ='';csuPolSrcF='';csuPolSel=null;renderADTPage();}
function csuPolStat(s){csuPolSrcF=csuPolSrcF===s?'':s;csuPolSel=null;renderADTPage();}
function csuPolOpen(key,tab){
  if(csuPolSel!==key)csuCloseForms();
  csuPolTab=tab||sbKeepTab(csuPolSel,csuPolTab);csuPolSel=key;
  csuOpenPanel('csuq',renderCsuPolSidebar);
  document.querySelectorAll('.csu-pol-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='csu-pol-row-'+key);});
}
function csuPolClose(){csuPolSel=null;csuCloseForms();const sb=document.getElementById('csuq-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.csu-pol-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function csuPolNav(t){if(t!==csuPolTab)csuCloseForms();csuPolTab=t;isbTab('csuq',renderCsuPolSidebar);}
function csuPolEdit(){const r=csuPolRows().find(function(x){return x.key===csuPolSel;});if(!r)return;csuPolTab='basic-details';ccPolOpen(r.scope,r.pid);}
function renderCsuPolSidebar(){
  const r=csuPolRows().find(function(x){return x.key===csuPolSel;});if(!r)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'versions',label:'Versions'}];
  if(!tabs.some(function(t){return t.id===csuPolTab;}))csuPolTab='basic-details';
  const can=ccCan('card.programme.manage'),editing=typeof ccPolForm!=='undefined'&&!!ccPolForm&&ccPolForm.scope===r.scope&&(ccPolForm.programmeId||null)===r.pid;
  const hero=sbHero({icon:CSU_ICO.flow,name:ccE(r.name),meta:[ccE(r.sub)],status:axBadge(r.source==='Not configured'?'idle':r.source==='Programme override'?'info':'ok',r.source),editing:editing,
    edit:can&&!editing&&csuPolTab==='basic-details'?'<button class="lp-sb-view-edit-btn" onclick="csuPolEdit()">'+CC_ICO.edit+' '+(r.scope==='entity'?'Set':'Override')+'</button>':''});
  let body;
  if(csuPolTab==='versions'){
    const vs=r.versions.slice().reverse();
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Policy Versions</span><span class="ax-count">'+vs.length+'</span></div>'
      +(vs.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>From</th><th>Policy</th><th>Set By</th></tr></thead><tbody>'
        +vs.map(function(v){return '<tr><td class="csag-td">v'+v.v+(v.replaced?' <span class="lp-c-sub">replaced before it applied</span>':'')+'</td><td class="csag-td">'+ccE(cdLabel(v.effFrom))+'</td>'
          +'<td class="csag-td" style="white-space:normal">'+ccE(v.inherit?'Uses the entity policy':ccClaimPolText(Object.assign({configured:true},v)))+(v.reason?'<div class="lp-c-sub">'+ccE(v.reason)+'</div>':'')+'</td>'
          +'<td class="csag-td">'+ccE(caN(v.by))+'<div class="lp-c-sub">'+ccE(v.at||'')+'</div></td></tr>';}).join('')+'</tbody></table></div>'
        :'<div class="lp-wf-empty">No version yet. '+(r.scope==='entity'?'Set the entity policy from Basic Details.':'This programme uses the entity policy.')+'</div>');
  }else{
    body=hero+(editing?ccPolFormHTML():'<div class="lp-sb-detail-grid">'
      +csuFc(CSU_ICO.tag,'Source',ccE(r.source))
      +csuFc(CSU_ICO.cal,'Since',r.since?ccE(r.since):'')
      +csuFc(CSU_ICO.flow,'In Force Today',ccE(r.text),true)
      +csuFc(CSU_ICO.cal,'Next Version',r.next?ccE(r.next):'None scheduled',true)
      +'</div>');
  }
  return axTabBar('csuq',tabs,csuPolTab,'csuPolNav','csuPolClose')+'<div class="lp-isb-body">'+body+'</div>';
}

/* ══ CARD ENROLLMENT ════════════════════════════════════════════════════
   One row per enrollment field. The row's panel: Basic Details (Show and Mandatory switches, Edit opens the
   provider mapping or the company field form there) and Logs. + in the top bar adds a field. */
function csuEnrRule(f){
  const r=oncProvReg(f.k);
  return f.custom?'Company field':oncLocked(f)?'Provider required':f.provider&&!(r&&r.confirmed)?'Awaiting provider':'Entity choice';
}
const CSU_RULE_TONE={'Company field':'idle','Provider required':'info','Awaiting provider':'wait','Entity choice':'idle'};
function csuEnrShown(){
  const q=String(csuEnrQ||'').trim().toLowerCase();
  return oncFields().filter(function(f){
    if(csuEnrGroupF&&f.group!==csuEnrGroupF)return false;
    if(csuEnrRuleF&&csuEnrRule(f)!==csuEnrRuleF)return false;
    if(csuEnrStatF==='Shown'&&!oncShown(f))return false;
    if(csuEnrStatF==='Hidden'&&oncShown(f))return false;
    if(csuEnrStatF==='Mandatory'&&!oncMandatory(f))return false;
    const r=oncProvReg(f.k);
    return !q||[f.label,f.group,r&&r.code].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;});
  });
}
function csuOnOff(v){return axBadge(v?'ok':'idle',v?'On':'Off');}
function csuEnrListHTML(){
  if(typeof mcOn==='function'&&!mcOn('expenses'))return '<div class="lp-page"><div class="wb-empty-sm">The Expenses module is switched off for this entity (Module Control).</div></div>';
  const all=oncFields(),rows=csuEnrShown(),on=oncProgrammeOn();
  if(csuEnrSel!=null&&!rows.some(function(f){return f.k===csuEnrSel;}))csuEnrSel=null;
  const adding=!!oncFieldForm&&!oncFieldForm.k;
  const pgn=listPage('csu-enr',[csuEnrQ,csuEnrGroupF,csuEnrRuleF,csuEnrStatF].join('|'),rows.map(function(f,i){
    const r=oncProvReg(f.k),rule=csuEnrRule(f);
    return '<tr class="csu-enr-row'+(csuEnrSel===f.k?' lp-row-selected':'')+'" id="csu-enr-row-'+f.k+'" style="cursor:pointer" onclick="csuEnrOpen(\''+f.k+'\')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+sbEsc(f.label)+'</div><div class="lp-c-sub">'+sbEsc(f.group)+(f.src==='employee'?' · from employee record':'')+(f.provider?' · '+sbEsc(oncProviderName())+' field':'')+'</div></td>'
      +'<td>'+axBadge(CSU_RULE_TONE[rule],rule)+(!f.custom&&on&&r&&r.code?'<div class="lp-c-sub"><code>'+sbEsc(r.code)+'</code></div>':'')+'</td>'
      +'<td>'+csuOnOff(oncShown(f))+'</td><td>'+csuOnOff(oncMandatory(f))+'</td>'
      +csuDots('csuEnrOpen(\''+f.k+'\')',f.label)+'</tr>';
  }),ccEmpty(6,'No field matches this filter.'));
  const n=function(fn){return all.filter(fn).length;};
  const tiles=caStat('Shown',n(oncShown),csuEnrStatF==='Shown','csuEnrStat(\'Shown\')','ok')
    +caStat('Mandatory',n(oncMandatory),csuEnrStatF==='Mandatory','csuEnrStat(\'Mandatory\')','info')
    +caStat('Hidden',n(function(f){return !oncShown(f);}),csuEnrStatF==='Hidden','csuEnrStat(\'Hidden\')','idle');
  const groups=[];all.forEach(function(f){if(groups.indexOf(f.group)<0)groups.push(f.group);});
  return '<div class="lp-page">'
    +ccFilterBar(lpSearchField('csu-enr-q',csuEnrQ,'Search field or code','csuEnrApply()')
      +apCS('csu-enr-group',groups,csuEnrGroupF,'All Groups')
      +apCS('csu-enr-rule',['Provider required','Awaiting provider','Entity choice','Company field'],csuEnrRuleF,'All Rules')
      +clearFiltersBtn([csuEnrQ,csuEnrGroupF,csuEnrRuleF,csuEnrStatF],'csuEnrReset()')+'<button class="lp-pill-search" onclick="csuEnrApply()">Search</button>',tiles)
    +'<div class="wb-note'+(on?'':' is-wait')+'"><div class="wb-note-sub">'+(on?'The fields '+sbEsc(oncProviderName())+' collects on the employee\'s ONC Card tab; the ones it requires are locked on.'
      :'No card programme is enabled, so the ONC Card tab is hidden on employee records. Enable a provider on the Providers tab.')+'</div></div>'
    +(adding?'<div style="margin-top:14px">'+oncFieldFormHTML()+'</div>':'')
    +ccSplit('csue','<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Field</th><th>Rule</th><th>Show</th><th>Mandatory</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,csuEnrSel!=null&&!adding,renderCsuEnrSidebar)
    +'</div>';
}
function csuEnrApply(){
  csuEnrQ=lpSearchValue('csu-enr-q');const g=getCSValue('csu-enr-group'),r=getCSValue('csu-enr-rule');
  csuEnrGroupF=g==='All Groups'?'':g||'';csuEnrRuleF=r==='All Rules'?'':r||'';csuEnrSel=null;renderADTPage();
}
function csuEnrReset(){csuEnrQ='';csuEnrGroupF='';csuEnrRuleF='';csuEnrStatF='';csuEnrSel=null;renderADTPage();}
function csuEnrStat(s){csuEnrStatF=csuEnrStatF===s?'':s;csuEnrSel=null;renderADTPage();}
function csuEnrOpen(k,tab){
  if(csuEnrSel!==k)csuCloseForms();
  csuEnrTab=tab||sbKeepTab(csuEnrSel,csuEnrTab);csuEnrSel=k;
  csuOpenPanel('csue',renderCsuEnrSidebar);
  document.querySelectorAll('.csu-enr-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='csu-enr-row-'+k);});
}
function csuEnrClose(){csuEnrSel=null;csuCloseForms();const sb=document.getElementById('csue-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.csu-enr-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function csuEnrNav(t){if(t!==csuEnrTab)csuCloseForms();csuEnrTab=t;isbTab('csue',renderCsuEnrSidebar);}
function csuEnrAdd(){csuEnrSel=null;oncFieldAddOpen();}
function csuEnrEdit(k){csuEnrTab='basic-details';oncFieldEditOpen(k);}
function renderCsuEnrSidebar(){
  const f=oncField(csuEnrSel);if(!f)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'}];
  if(!tabs.some(function(t){return t.id===csuEnrTab;}))csuEnrTab='basic-details';
  const r=oncProvReg(f.k),rule=csuEnrRule(f),on=oncProgrammeOn();
  const editing=(oncProgEdit.reg===f.k)||(!!oncFieldForm&&oncFieldForm.k===f.k);
  const canEdit=oncFieldCanEdit(f);
  const hero=sbHero({icon:CSU_ICO.tag,name:sbEsc(f.label),meta:[sbEsc(f.group),f.custom?'Company field':f.provider?sbEsc(oncProviderName())+' field':'Platform field'],
    status:axBadge(oncShown(f)?'ok':'idle',oncShown(f)?'Shown':'Hidden'),editing:editing,
    edit:canEdit&&!editing&&csuEnrTab==='basic-details'?'<button class="lp-sb-view-edit-btn" onclick="csuEnrEdit(\''+f.k+'\')">'+CC_ICO.edit+' Edit</button>':''});
  let body;
  if(csuEnrTab==='logs'){
    body=csuEnrLogsHTML(f);
  }else if(editing){
    body=hero+(oncProgEdit.reg===f.k?oncRegFormHTML(f):oncFieldFormHTML());
  }else{
    const can=emsCan('onc.config.manage'),locked=oncLocked(f);
    /* Show and Mandatory read like every other detail: a field card, its value On / Off, the reason underneath when
       it cannot be changed, and the switch beside the value when it can. */
    const tog=function(what,v,disabled,why){
      const val='<span style="display:flex;align-items:center;gap:10px">'
        +(disabled?'':'<label class="cs-toggle"><input type="checkbox"'+(v?' checked':'')+' onchange="oncCfgToggle(\''+f.k+'\',\''+what+'\')"><span class="cs-toggle-slider"></span></label>')
        +(v?'On':'Off')
        +(disabled&&why?'<span class="lp-c-sub" style="font-weight:400">· '+why+'</span>':'')+'</span>';
      return csuFc(CSU_ICO.flow,what==='show'?'Show on Enrollment Form':'Mandatory',val);
    };
    const why=locked?'Required by '+sbEsc(oncProviderName())+'.':!can?'Managed by Opendhi.':'';
    body=hero
      +'<div class="lp-sb-detail-grid">'
        +tog('show',oncShown(f),locked||!can||!!f.provider,f.provider&&!locked?'Shown while '+sbEsc(oncProviderName())+' is enabled.':why)
        +tog('mandatory',oncMandatory(f),locked||!can||(f.provider&&!(r&&r.confirmed)),f.provider&&!(r&&r.confirmed)?'Not confirmed by the provider yet.':why)
        +csuFc(CSU_ICO.tag,'Group',sbEsc(f.group))
        +csuFc(CSU_ICO.users,'Source',f.src==='employee'?'From the employee record':'Collected on the ONC Card tab')
        +csuFc(CSU_ICO.card,'Type',sbEsc(f.type==='select'?'Dropdown':f.type==='date'?'Date':f.type==='email'?'Email':'Text'))
        +csuFc(CSU_ICO.users,'Filled By',sbEsc({hr:'HR',employee:'Employee',company:'Company','employee-only':'Employee only'}[f.owner]||f.owner||''))
        +(f.type==='select'?csuFc(CSU_ICO.tag,'Values',sbEsc((f.opts||[]).join(', ')||'No values yet'),true):'')
        +csuFc(CSU_ICO.flow,'Rule',axBadge(CSU_RULE_TONE[rule],rule))
        +(f.custom?'':csuFc(CSU_ICO.bank,(on?sbEsc(oncProviderName()):'Provider')+' Field Code',r&&r.code?'<code>'+sbEsc(r.code)+'</code>':''))
        +csuFc(CSU_ICO.tag,'Help Text',sbEsc((r&&r.rule)||f.rule||''),true)
      +'</div>';
  }
  return axTabBar('csue',tabs,csuEnrTab,'csuEnrNav','csuEnrClose')+'<div class="lp-isb-body">'+body+'</div>';
}

/* ══ PROVIDERS ══════════════════════════════════════════════════════════ */
function csuProvOn(key){return oncProg().provider===key;}
function csuProvShown(){
  const q=String(csuProvQ||'').trim().toLowerCase();
  return ONC_PROVIDERS.filter(function(p){
    if(csuProvStatusF&&(csuProvOn(p.key)?'Enabled':'Not Enabled')!==csuProvStatusF)return false;
    return !q||[p.name,p.card].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;});
  });
}
function csuProvListHTML(){
  const rows=csuProvShown();
  if(csuProvSel!=null&&!rows.some(function(p){return p.key===csuProvSel;}))csuProvSel=null;
  const pgn=listPage('csu-prov',[csuProvQ,csuProvStatusF].join('|'),rows.map(function(p,i){
    const on=csuProvOn(p.key);
    return '<tr class="csu-prov-row'+(csuProvSel===p.key?' lp-row-selected':'')+'" id="csu-prov-row-'+p.key+'" style="cursor:pointer" onclick="csuProvOpen(\''+p.key+'\')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(p.name)+'</div><div class="lp-c-sub">'+ccE(p.card)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(p.wallets.map(wbTypeName).join(', '))+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(p.integration)+'</div>'+(on&&oncProg().enabledOn?'<div class="lp-c-sub">since '+ccE(oncProg().enabledOn)+'</div>':'')+'</td>'
      +'<td>'+(on?axBadge('ok','Enabled'):axBadge('idle','Not Enabled'))+'</td>'
      +csuDots('csuProvOpen(\''+p.key+'\')',p.name)+'</tr>';
  }),ccEmpty(6,'No provider matches this filter.'));
  const en=ONC_PROVIDERS.filter(function(p){return csuProvOn(p.key);}).length;
  const tiles=caStat('Enabled',en,csuProvStatusF==='Enabled','csuProvStat(\'Enabled\')','ok')
    +caStat('Not Enabled',ONC_PROVIDERS.length-en,csuProvStatusF==='Not Enabled','csuProvStat(\'Not Enabled\')','idle');
  return '<div class="lp-page">'
    +ccFilterBar(lpSearchField('csu-prov-q',csuProvQ,'Search provider','csuProvApply()')
      +apCS('csu-prov-status',['Enabled','Not Enabled'],csuProvStatusF,'All Statuses')
      +clearFiltersBtn([csuProvQ,csuProvStatusF],'csuProvReset()')+'<button class="lp-pill-search" onclick="csuProvApply()">Search</button>',tiles)
    +'<div class="wb-note"><div class="wb-note-sub">One provider per entity. Enabling one shows the ONC Card tab on employee records; it is not connected to the bank yet.</div></div>'
    +ccSplit('csuv','<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Provider</th><th>Wallets</th><th>Integration</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,csuProvSel!=null,renderCsuProvSidebar)
    +'</div>';
}
function csuProvApply(){csuProvQ=lpSearchValue('csu-prov-q');const s=getCSValue('csu-prov-status');csuProvStatusF=s==='All Statuses'?'':s||'';csuProvSel=null;renderADTPage();}
function csuProvReset(){csuProvQ='';csuProvStatusF='';csuProvSel=null;renderADTPage();}
function csuProvStat(s){csuProvStatusF=csuProvStatusF===s?'':s;csuProvSel=null;renderADTPage();}
function csuProvOpen(key,tab){
  csuProvTab=tab||sbKeepTab(csuProvSel,csuProvTab);csuProvSel=key;
  csuOpenPanel('csuv',renderCsuProvSidebar);
  document.querySelectorAll('.csu-prov-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='csu-prov-row-'+key);});
}
function csuProvClose(){csuProvSel=null;const sb=document.getElementById('csuv-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.csu-prov-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function csuProvNav(t){csuProvTab=t;isbTab('csuv',renderCsuProvSidebar);}
function renderCsuProvSidebar(){
  const p=ONC_PROVIDERS.find(function(x){return x.key===csuProvSel;});if(!p)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===csuProvTab;}))csuProvTab='basic-details';
  const on=csuProvOn(p.key),can=emsCan('onc.programme.manage');
  const act=can?'<button class="lp-sb-view-edit-btn" onclick="oncProgrammeEnable(\''+p.key+'\')">'+(on?'Disable':'Enable')+'</button>':'';
  const hero=sbHero({icon:CSU_ICO.bank,name:ccE(p.name),meta:[ccE(p.card)],status:on?axBadge('ok','Enabled'):axBadge('idle','Not Enabled'),edit:act});
  let body;
  const logs=oncProgLogs().filter(function(l){return String(l.action||'').indexOf(p.name)===0;});
  if(csuProvTab==='logs'){
    /* The status move lives here, as on every listing: Enable or Disable, with a comment (required to disable). */
    const blocked=!on&&!!oncProg().provider;
    const next=on?'Disabled':'Enabled';
    const form=can?'<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+(on?'active':'inactive')+'"></span>'+(on?'Enabled':'Not Enabled')+'</div>'
      +(blocked?'<p class="lp-logs-form-sub">'+ccE(oncProviderName())+' is enabled. One provider per entity: disable it first.</p>'
        :'<p class="lp-logs-form-sub">'+(on?'Disable: the ONC Card tab is hidden until a provider is enabled. Enrollment data is kept.':'Enable: the ONC Card tab appears on employee records.')+'</p>'
        +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
        +apCS('csuv-log-status',[next],next,'Select Status')
        +'<div class="lp-logs-form-label">Comment'+(on?' <span class="lp-logs-form-req">*</span>':'')+'</div>'
        +'<textarea class="lp-logs-form-textarea" id="csuv-log-comment" placeholder="'+(on?'Reason for disabling':'Comment')+'"></textarea>'
        +'<button class="lp-logs-save-btn" onclick="csuProvLogSave(\''+p.key+'\')">Save</button>')
      +'</div>':'';
    body=!can?lpLogsView(logs,'',{current:on?'Enabled':'Not Enabled',noAction:{title:'Managed by Opendhi',sub:'Your role can view this provider but not enable or disable it.'}})
      :blocked?lpLogsView(logs,'',{current:'Not Enabled',noAction:{title:'One provider per entity',sub:ccE(oncProviderName())+' is enabled. Disable it first (Providers → '+ccE(oncProviderName())+' → Logs), then enable '+ccE(p.name)+' here.'}})
      :lpLogsView(logs,form);
  }else if(csuProvTab==='workflow'){
    body=wfTimelineHTML(wfDoneFromLogs(logs));
  }else{
    const progs=ccProgs().filter(function(x){return x.provider===p.key;});
    body=hero+'<div class="lp-sb-detail-grid">'
      +csuFc(CSU_ICO.card,'Card',ccE(p.card),true)
      +csuFc(CSU_ICO.card,'Wallets',ccE(p.wallets.map(wbTypeName).join(', ')),true)
      +csuFc(CSU_ICO.flow,'Integration',ccE(p.integration))
      +csuFc(CSU_ICO.cal,'Enabled Since',on?ccE(oncProg().enabledOn||''):'')
      +csuFc(CSU_ICO.users,'Enabled By',on?ccE(oncProg().by||''):'')
      +csuFc(CSU_ICO.tag,'Programmes Using It',progs.length?ccE(progs.map(function(x){return x.key;}).join(', ')):'None')
      +'</div>'
      +(!on&&oncProg().provider?'<div class="wb-note is-wait"><div class="wb-note-sub">'+ccE(oncProviderName())+' is enabled. One provider per entity: disable it first.</div></div>':'');
  }
  return axTabBar('csuv',tabs,csuProvTab,'csuProvNav','csuProvClose')+'<div class="lp-isb-body">'+body+'</div>';
}
/* ══ LOGS AND WORKFLOW ══════════════════════════════════════════════════
   Every status move is taken in the Logs tab with its comment, and lands in the same log the rest of the app reads
   (the provider log, the programme log, the enrollment configuration log - all shown in Company Settings → Logs too).
   The Workflow tab draws the record's steps from that log. */
function csuProgLogSave(id,status){
  const c=csuLogComment('ccp-reason'),p=ccProg(id);if(!p)return;
  const before=(p.logs||[])[0];
  ccProgStatusClick(id,status);   // Deactivate takes the comment as its reason
  const l=(p.logs||[])[0];
  if(status==='Active'&&c&&l&&l!==before){l.action+=' Comment: '+c;renderADTPage();}
}
function csuLogComment(id){const el=document.getElementById(id);return el?String(el.value||'').trim():'';}
function csuProvLogSave(key){
  const p=ONC_PROVIDERS.find(function(x){return x.key===key;});if(!p)return;
  const on=csuProvOn(key),c=csuLogComment('csuv-log-comment');
  if(on&&!c){showToast('Comment required','error','Give the reason for disabling '+p.name+'.');return;}
  const before=oncProgLogs()[0];
  oncProgrammeEnable(key);
  const l=oncProgLogs()[0];
  if(l&&l!==before&&c){l.action+=' Comment: '+c;}
  renderADTPage();
}
function csuEnrLogSave(k){
  const f=oncField(k);if(!f)return;
  const v=getCSValue('csue-log-change'),c=csuLogComment('csue-log-comment');
  if(!v){showToast('Pick the change','error');return;}
  const what=/^Show/.test(v)?'show':'mandatory';
  const before=oncCfgLogs[0];
  oncCfgToggle(k,what);
  const l=oncCfgLogs[0];
  if(l&&l!==before&&c){l.action+=' Comment: '+c;}
  renderADTPage();
}
/* The enrollment field's Logs: the Show / Mandatory change it allows, with a comment, over its log. */
function csuEnrLogsHTML(f){
  const r=oncProvReg(f.k),can=emsCan('onc.config.manage'),locked=oncLocked(f);
  const logs=oncCfgLogs.filter(function(l){return l.entity===idEntity()&&String(l.action||'').indexOf(f.label)>=0;});
  const moves=[];
  if(can&&!locked&&!f.provider)moves.push(oncShown(f)?'Show: Off':'Show: On');
  if(can&&!locked&&!(f.provider&&!(r&&r.confirmed)))moves.push(oncMandatory(f)?'Mandatory: Off':'Mandatory: On');
  const cur=(oncShown(f)?'Shown':'Hidden')+(oncMandatory(f)?' · Mandatory':'');
  /* No move here: say why, and where it can be changed, instead of the generic "No action available". */
  if(!moves.length){
    const reg=emsCan('onc.registry.manage')&&oncProgrammeOn();
    const nm=sbEsc(oncProviderName());
    const no=locked?{title:'Required by '+nm,sub:'While '+nm+' requires '+sbEsc(f.label)+', it is always shown and mandatory.'
        +(reg?' To change that, open Basic Details → Edit and clear “Provider requires this field”.':' Only Opendhi can change the '+nm+' field mapping.')}
      :!can?{title:'Managed by Opendhi',sub:'Your role can view this field but not change it.'}
      :{title:'Awaiting '+nm,sub:sbEsc(f.label)+' cannot be made mandatory until '+nm+' confirms it.'+(reg?' Confirm it in Basic Details → Edit.':'')};
    return lpLogsView(logs,'',{current:cur,noAction:no});
  }
  const form='<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+(oncShown(f)?'active':'inactive')+'"></span>'+cur+'</div>'
    +'<p class="lp-logs-form-sub">Change this field for this company and add a comment.</p>'
    +'<div class="lp-logs-form-label">Change <span class="lp-logs-form-req">*</span></div>'
    +apCS('csue-log-change',moves,moves[0],'Select Change')
    +'<div class="lp-logs-form-label">Comment</div>'
    +'<textarea class="lp-logs-form-textarea" id="csue-log-comment" placeholder="Comment"></textarea>'
    +'<button class="lp-logs-save-btn" onclick="csuEnrLogSave(\''+f.k+'\')">Save</button>'
    +'</div>';
  return lpLogsView(logs,form);
}
/* The programme's own steps (from its log), then the card request route its requests take. */
function csuProgWorkflowHTML(p){
  const wf=p.workflowId&&typeof caWfRec==='function'?caWfRec(p.workflowId):null;
  const stages=wf?(wf.stages||[]).filter(function(s){return s.active!==false;}):[];
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Programme Workflow</span></div>'
    +wfTimelineHTML(wfDoneFromLogs(p.logs||[]))
    +'<div class="lp-sb-view-header" style="margin-top:16px"><span class="lp-sb-section-title">Card Request Approval Route</span>'+(wf?'<span class="ax-count">'+ccE(caWfKey(wf))+'</span>':'')+'</div>'
    +(wf?'<div class="wb-note"><div class="wb-note-sub">'+ccE(wf.name)+'. Every card request under this programme takes these stages.</div></div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Stage</th><th>Name</th><th>Approver</th><th>Rule</th></tr></thead><tbody>'
      +stages.map(function(s,i){
        const who=s.type==='RBAC Team'?((typeof caTeams==='function'?caTeams():[]).find(function(t){return String(t.id)===String(s.ref);})||{}).name||'RBAC team':s.ref&&s.type==='Role'?s.ref:s.type;
        return '<tr><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td">'+ccE(s.name||'')+'</td><td class="csag-td">'+ccE(String(who||''))+'<div class="lp-c-sub">'+ccE(s.type||'')+'</div></td><td class="csag-td">'+ccE(s.rule||'')+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="lp-wf-empty">No card request route is set. Choose one from Basic Details → Edit.</div>');
}

(function(){
  /* 1 · The menu item, last under Corporate Cards (js/card-menu.js builds the dropdown). */
  if(typeof sidebarItems!=='undefined'){
    const g=sidebarItems.find(function(x){return x.dropdown==='Corporate Cards';});
    if(g&&!g.children.some(function(c){return c.id===CSU_PAGE;})){
      const I=typeof sbIco!=='undefined'?sbIco:{};
      g.children.push({id:CSU_PAGE,label:'Card Setup',color:'green',icon:I.cog||I.card||''});
    }
  }
  if(typeof supportPageMeta!=='undefined')supportPageMeta[CSU_PAGE]={title:'Card Setup',context:'Card Setup',filters:[],columns:[],rows:[]};
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[CSU_PAGE]='cards';   // hidden while Corporate Cards is switched off
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(CSU_PAGE)<0)EMS_CLIENT_PAGES.push(CSU_PAGE);
  /* 2 · Who sees it: the Super Admin alone. */
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){return pg===CSU_PAGE?csuAllowed():p0.apply(this,arguments);};
  }
  /* 3 · The page itself. */
  if(typeof renderPageContent==='function'){
    const r0=renderPageContent;
    renderPageContent=function(target){
      if(page!==CSU_PAGE)return r0.apply(this,arguments);
      const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
      if(typeof emsApplyChrome==='function')emsApplyChrome();
      if(typeof emsPageGuard==='function'){const g=emsPageGuard(page);if(g){el.innerHTML=g;return;}}
      el.innerHTML=buildCardSetupHTML();
    };
  }
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg===CSU_PAGE?'Card Setup':t0.apply(this,arguments);};
  }
  /* + in the top bar adds a programme, on the Programmes tab only (the other tabs have no record to add). */
  if(typeof renderADTPage==='function'){
    const a0=renderADTPage;
    renderADTPage=function(){
      const out=a0.apply(this,arguments);
      if(page===CSU_PAGE){
        const b=document.getElementById('tb-page-add-btn');
        if(b){
          const prog=csuTab==='programmes'&&typeof ccCan==='function'&&ccCan('card.programme.manage');
          const fld=csuTab==='onc-enrollment'&&(typeof mcOn!=='function'||mcOn('expenses'))&&(emsCan('onc.config.manage')||emsCan('onc.registry.manage'));
          const show=csuAllowed()&&(prog||fld);
          b.style.display=show?'':'none';if(show)b.onclick=prog?csuProgAdd:csuEnrAdd;
        }
      }
      return out;
    };
  }
  /* 4 · The screens' own actions call refreshCsSidebar(); on this page that repaints the page. */
  if(typeof refreshCsSidebar==='function'){
    const f0=refreshCsSidebar;
    refreshCsSidebar=function(){if(page===CSU_PAGE){renderADTPage();return;}return f0.apply(this,arguments);};
  }
})();
