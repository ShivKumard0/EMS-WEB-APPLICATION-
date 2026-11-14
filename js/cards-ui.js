/* ══ CORPORATE CARDS - the page (FR-CC v1.0, Build 7) ══════════════════════
   Expense Management → Corporate Cards: Cards, Requests & Enrollment, Card
   Loads, Controls and Reports for administrators; My Cards and My Requests
   for an employee. Built from the same parts as Funding & Budgets and
   Advances & Imprest: filter bar + tiles, split listing, record panel,
   popups. The rules live in js/cards.js.

   Also here: the Corporate Card Programmes section and demo mode inside
   Company Settings → Card Programmes (FR-CC-02: the existing registry).

   Nothing on this page issues a card or moves money. Provider-dependent
   statuses always show where they came from; demo events are labelled. */

let ccPageTab='cards',ccSel=null,ccTab='basic-details',ccQ='',ccStatusF='',ccProgF='',ccTileF='';
let ccProgForm=null,ccDemoForm=null;
const CC_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
  plus:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
};
sbToneAdd({'not-issued':'idle','issuance-pending':'wait','issued':'info','activation-pending':'wait',suspended:'wait',blocked:'bad',replaced:'idle',
  'enrollment-pending':'wait','enrollment-completed':'ok','awaiting-execution':'wait',processing:'wait',recorded:'ok','partially-recorded':'wait',failed:'bad',
  'not-connected':'idle',configured:'info','provider-confirmed':'ok','manually-verified':'ok','illustrative':'info',unconfirmed:'wait'});
Object.assign(supportPageMeta,{'cards':{title:'Corporate Cards',context:'Corporate Cards',filters:[],columns:[],rows:[]}});

/* ── Small helpers ─────────────────────────────────────────────────────── */
function ccE(s){return sbEsc(String(s==null?'':s));}
function ccField(label,req,html,hint,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+(hint?'<div class="ea-hint">'+hint+'</div>':'')+'</div>';}
function ccInput(id,val,ph,type){return '<input class="ep-form-input" id="'+id+'"'+(type==='number'?' type="number" min="0" step="1"':'')+' value="'+attrSafe(val==null?'':val)+'"'+(ph?' placeholder="'+attrSafe(ph)+'"':'')+'>';}
function ccArea(id,val,ph){return '<textarea class="ep-form-input ax-notes" id="'+id+'"'+(ph?' placeholder="'+attrSafe(ph)+'"':'')+'>'+ccE(val)+'</textarea>';}
function ccVal(id){const el=document.getElementById(id);return el?el.value:null;}
function ccChecks(prefix,opts,sel,labelOf){
  return '<div class="cc-checks">'+opts.map(function(o){return '<label class="onc-decl cc-check"><input type="checkbox" id="'+prefix+o+'"'+(sel.indexOf(o)>=0?' checked':'')+'><span>'+ccE(labelOf?labelOf(o):o)+'</span></label>';}).join('')+'</div>';
}
function ccChecked(prefix,opts){return opts.filter(function(o){const el=document.getElementById(prefix+o);return el&&el.checked;});}
function ccBtn(label,call,primary,danger){return '<button class="btn '+(primary?'btn-primary ca-review-btn':'btn-outline')+' btn-sm'+(danger?' is-danger':'')+'" onclick="'+call+'">'+label+'</button>';}
function ccEmpty(cols,text){return '<tr><td colspan="'+cols+'" style="padding:24px;text-align:center;color:var(--gray)">'+text+'</td></tr>';}
function ccSrcBadge(src){return src?'<span class="lp-status-badge tone-'+statusTone(src)+'">'+ccE(src)+'</span>':'';}
function ccEmpOf(uid){return typeof idEmpOfUser==='function'?idEmpOfUser(uid||idMe()):null;}
/* Can the person working see this employee's card records? Own; team (managed); or the whole entity. */
function ccSeesEmp(eid){
  if(ccCan('card.view.all'))return true;
  const mine=ccEmpOf();
  if(mine&&mine.eid===eid&&ccCan('card.view.own'))return true;
  return ccCan('card.view.team')&&typeof caManagerOf==='function'&&caManagerOf(eid)===idMe();
}
/* An administrator's view (any card right beyond one's own) or an employee's own view. */
function ccAdminView(){return ['card.view.all','card.view.team','card.request.others','card.enrollment.manage','card.load.create','card.load.approve','card.load.verify','card.control.manage','card.report.view'].some(ccCan);}

/* ── Page shell ────────────────────────────────────────────────────────── */
function ccPageTabs(){
  const t=[];
  if(!ccAdminView()){
    if(ccCan('card.view.own'))t.push({id:'cards',label:'My Cards'});
    if(ccCan('card.view.own')||ccCan('card.request.create'))t.push({id:'requests',label:'My Requests'});
    return t;
  }
  if(['card.view.all','card.view.team','card.lifecycle.manage','card.assign'].some(ccCan))t.push({id:'cards',label:'Cards'});
  /* One Requests tab for card requests and card loads (product owner, 11 Nov 2026). The loads view keeps its own id ('loads',
     not shown as a tab) so links to a load still land on it; Statements & Reconciliation opens from Manage. */
  const rq=ccRqReqOn(),ld=ccRqLoadOn(),st=['card.reconciliation.view','card.transaction.import','card.statement.verify'].some(ccCan);
  if(rq||ld)t.push({id:'requests',label:'Requests'});
  if(ld||st)t.push({id:'loads',label:'Card Loads',hidden:true});
  if(st)t.push({id:'stmts',label:'Statements & Reconciliation'});
  /* Programme-level controls: card.control.view alone (self-service) shows one's own card's controls, not this tab. */
  if(ccCan('card.control.manage')||((ccCan('card.control.view')||ccCan('card.control.approve'))&&(ccCan('card.view.all')||ccCan('card.programme.view'))))t.push({id:'controls',label:'Controls'});
  if(ccCan('card.report.view'))t.push({id:'reports',label:'Reports'});
  return t;
}
function ccFormOpen(){return !!(ccProgForm||(typeof ccReqForm!=='undefined'&&ccReqForm)||(typeof ccAct!=='undefined'&&ccAct)||(typeof ccCtlForm!=='undefined'&&ccCtlForm)
  ||(typeof ccLoadForm!=='undefined'&&(ccLoadForm||ccLx||ccBulkForm||ccBulkRowForm||ccBenForm))||(typeof ccTxnForm!=='undefined'&&(ccTxnForm||ccTxnAct))||(typeof ccStmtForm!=='undefined'&&(ccStmtForm||ccStmtAct))||(typeof ccMxAct!=='undefined'&&!!ccMxAct)||caRev||caAct||awfModal);}
function ccCloseForms(){ccProgForm=null;ccDemoForm=null;if(typeof ccReqForm!=='undefined')ccReqForm=null;if(typeof ccAct!=='undefined')ccAct=null;if(typeof ccCtlForm!=='undefined')ccCtlForm=null;if(typeof ccLoadForm!=='undefined'){ccLoadForm=null;ccLx=null;ccBulkForm=null;ccBulkRowForm=null;ccBenForm=null;}if(typeof ccTxnForm!=='undefined'){ccTxnForm=null;ccTxnAct=null;}if(typeof ccStmtForm!=='undefined'){ccStmtForm=null;ccStmtAct=null;}if(typeof ccMxAct!=='undefined')ccMxAct=null;caRev=null;caAct=null;awfModal=null;}
function ccSetPageTab(t){
  /* Statements & Reconciliation (Manage) is the loads view's statements; the Requests tab opens on its first view. */
  if(t==='stmts'){if(ccPageTab==='loads'&&ccLoadSub==='stmts')return;ccCloseForms();ccSel=null;ccPageTab='loads';ccLoadSub='stmts';renderADTPage();return;}
  if(t==='requests'&&ccAdminView()&&!ccRqReqOn()&&ccRqLoadOn()){ccCloseForms();ccSel=null;ccPageTab='loads';ccLoadSub='loads';renderADTPage();return;}
  if(ccPageTab===t)return;ccCloseForms();ccSel=null;ccPageTab=t;renderADTPage();}
function ccRqReqOn(){return ['card.view.all','card.view.team','card.request.others','card.enrollment.manage','card.request.approve'].some(ccCan);}
function ccRqLoadOn(){return ['card.load.create','card.load.approve','card.load.verify','card.view.all'].some(ccCan);}
/* The Requests tab's views and which one is on screen. */
function ccRqViews(){
  const v=[];
  if(ccRqReqOn())v.push(['crq','Card Requests']);
  if(ccRqLoadOn())v.push(['cld','Card Loads']);
  if(['card.enrollment.bulk','card.load.bulk','card.view.all','card.request.approve','card.load.approve'].some(ccCan))v.push(['bulk','Bulk Files']);
  if(['card.load.create','card.view.all'].some(ccCan))v.push(['ben','Benefit Loads']);
  return v;
}
function ccRqView(){if(ccPageTab==='requests')return ccReqSub==='bulk'?'bulk':'crq';return ccLoadSub==='bulk'?'bulk':ccLoadSub==='benefit'?'ben':'cld';}
function ccRqPick(k){
  if(ccRqView()===k)return;ccCloseForms();ccSel=null;ccReqSel=null;ccLoadSel=null;ccBulkSel=null;
  if(k==='crq'){ccPageTab='requests';ccReqSub='requests';}else if(k==='bulk'){ccPageTab='requests';ccReqSub='bulk';}
  else{ccPageTab='loads';ccLoadSub=k==='ben'?'benefit':'loads';}
  renderADTPage();
}
function ccRqStrip(){
  const k=ccRqView(),v=ccRqViews();let act='';
  if(k==='bulk')act=(ccCan('card.enrollment.bulk')?ccBtn('Upload Bulk Enrollment File','ccBulkStart(\'bulk card enrollment\')'):'')+(ccCan('card.load.bulk')?ccBtn('Upload Bulk Load File','ccBulkStart(\'bulk card load\')'):'');
  /* Card Loads has no New Load button on the right: the + beside the page title opens New Load, as it opens a
     card request on Card Requests (product owner, 11 Nov 2026). */
  return ccSubStrip(v.length>1?v:[],k,'ccRqPick',act);
}
function ccOffHTML(){
  const exp=typeof mcStateOf==='function'&&mcStateOf().expenses===false;
  return '<div class="lp-page"><div class="wb-empty"><b>Module not enabled for this client</b><span>'+(exp?'Expenses (which includes Corporate Cards)':'Corporate Cards')+' is switched off for '+ccE(idEntityName(ccEnt()))
    +' in Company Settings → Module Control. Its records are kept; switch it on to see them again.</span></div></div>';
}
function buildCardsHTML(){
  if(typeof mcOn==='function'&&!mcOn('cards'))return ccOffHTML();
  const tabs=ccPageTabs();
  if(!tabs.length)return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>Corporate Cards needs a card right in RBAC.</span></div></div>';
  if(!tabs.some(function(t){return t.id===ccPageTab;}))ccPageTab=tabs[0].id;
  const barTab=ccPageTab==='loads'?(ccLoadSub==='stmts'?'stmts':'requests'):ccPageTab,bar=tabs.filter(function(t){return !t.hidden;});
  let body;
  if(ccPageTab==='requests')body=ccRequestsHTML();
  else if(ccPageTab==='loads')body=ccLoadsHTML();
  else if(ccPageTab==='controls')body=ccControlsHTML();
  else if(ccPageTab==='reports')body=ccReportsHTML();
  else body=ccCardsHTML();
  /* Transactions is its own page (Expense Management → Transactions): no Corporate Cards tabs or Manage over it. */
  return '<div class="mod-page">'+(ccTxnPageOn()?'':buildModuleTabsHTML(bar,barTab,'ccSetPageTab',true))+body+'</div>'
    +(caRev?caReviewHTML():'')+(caAct?caActHTML():'')+(awfModal?awfModalHTML():'')+(ccAct&&!ccAct.inLogs?ccActHTML():'')+(typeof ccLoadModalsHTML==='function'?ccLoadModalsHTML():'');
}
function ccFilterBar(inner,tiles){
  return '<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">'+inner+'</div></div>'
    +(tiles?'<div class="listing-stats exp-stats">'+tiles+'</div>':'')+'</div>';
}
function ccDemoNote(){
  return ccDemoOn()?'<div class="wb-note">Records marked <b>'+CC_DEMO+'</b> are not bank or provider events.</div>':'';
}

/* ── Cards (admin) / My Cards (employee) ─────────────────────────────── */
function ccCardsShown(){
  const q=String(ccQ||'').trim().toLowerCase();
  return ccCards.filter(function(c){
    if(c.entity!==ccEnt()||!ccSeesEmp(c.employeeEid))return false;
    if(q&&![c.key,idEmpName(c.employeeEid),c.last4,(ccProg(c.programmeId)||{}).name].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccStatusF==='__clearance__'){if(!(c.clearance&&c.clearance.status==='Open'))return false;}
    else if(ccStatusF==='__dispute__'){if(!ccCardOpenDisputes(c).length)return false;}
    else if(ccStatusF&&c.status!==ccStatusF)return false;
    if(ccProgF&&ccProgLabel(ccProg(c.programmeId))!==ccProgF)return false;
    return true;
  });
}
/* A card's open disputes: those on its payments still being handled (not resolved, closed or withdrawn). */
function ccCardOpenDisputes(c){return typeof ccDisputes==='undefined'?[]:ccDisputes.filter(function(d){return d.cardId===c.id&&DSP_ACTIVE.indexOf(d.status)>=0&&ccDspVisible(d);});}
function ccApply(){ccQ=lpSearchValue('cc-f-q');const p=getCSValue('cc-f-prog'),s=getCSValue('cc-f-status');ccProgF=p==='All Programmes'?'':p||'';ccStatusF=s==='All Statuses'?'':s||'';ccSel=null;renderADTPage();}
function ccReset(){ccQ='';ccProgF='';ccStatusF='';ccTileF='';ccSel=null;renderADTPage();}
function ccStat(s){ccStatusF=ccStatusF===s?'':s;ccSel=null;renderADTPage();}

/* ── Controls (7D) ─────────────────────────────────────────────────────── */
/* ── Reports (7H): the summary figures, from the records themselves ───── */
function ccSummary(){
  if(typeof ccClearanceSync==='function'){ccClearanceSync();ccLoadsSweepExpiry();}
  const ent=ccEnt(),reqs=ccRequests.filter(function(r){return r.entity===ent;}),cards=ccCards.filter(function(c){return c.entity===ent;}),loads=ccLoads.filter(function(l){return l.entity===ent;});
  const ex=function(l){return (l.exec&&l.exec.status)||'';};
  return [['Total Card Requests',reqs.length],['Requests Pending Approval',reqs.filter(function(r){return ['Awaiting Approval','Follow-Up'].indexOf(r.status)>=0;}).length],
    ['Approved Requests',reqs.filter(function(r){return r.status==='Approved';}).length],['Total Assigned Cards',cards.length],['Active Cards',cards.filter(function(c){return c.status==='Active';}).length],
    ['Activation Pending',cards.filter(function(c){return c.status==='Activation Pending';}).length],['Suspended/Blocked Cards',cards.filter(function(c){return c.status==='Suspended'||c.status==='Blocked';}).length],
    ['Pending Card Loads',loads.filter(function(l){return ['Awaiting Approval','Follow-Up'].indexOf(l.status)>=0;}).length],['Approved Loads Awaiting Execution',loads.filter(function(l){return ex(l)==='Awaiting Execution';}).length],
    ['Recorded Loads (verified)',loads.filter(function(l){return ex(l)==='Recorded'&&!l.exec.demo;}).length],['Illustrative Loads',loads.filter(function(l){return l.exec&&l.exec.demo;}).length],['Failed/Exception Loads',loads.filter(function(l){return ex(l)==='Failed';}).length],
    ['Cards Requiring Exit Clearance',cards.filter(function(c){return c.clearance&&c.clearance.status==='Open';}).length]];
}
/* ── Company Settings → Card Programmes: programmes and demo mode ─────── */
function ccProgrammesSectionHTML(){
  if(!['card.programme.view','card.programme.manage','onc.programme.manage'].some(ccCan))return '';
  const ent=ccEnt(),list=ccProgs(ent),can=ccCan('card.programme.manage'),prov=oncProg(ent).provider;
  return '<div class="wb-proj-h">Corporate Card Programmes</div>'
    +'<div class="wb-note">One connected provider per entity'+(prov?' ('+ccE(ccProviderName(prov))+', not connected: ADT records requests and cards but issues nothing)':' (none enabled: programmes run as internal records)')
      +'; any number of programmes under it. Each programme sets who may hold its cards, the card forms, the wallets it uses from Wallet & Benefits and its approval route.</div>'
    +(ccDemoOn()&&ccCan('card.demo.manage')&&typeof ccDemoSetupBtnHTML==='function'?'<div class="wb-note cc-demo-row">'+ccDemoSetupBtnHTML()+'</div>':'')
    +(ccProgForm?ccProgFormHTML():can?'<div class="att-bar csag-bar"><div class="att-bar-actions"><button class="att-link" onclick="ccProgOpen()">'+CC_ICO.plus+'Add Programme</button></div></div>':'')
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Programme</th><th>Cards · Wallets</th><th>Eligibility</th><th>Provider</th><th>Status</th>'+(can?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
    +(list.length?list.map(function(p,i){
      const wf=caWfRec(p.workflowId);
      return '<tr'+(ccProgForm&&ccProgForm.id===p.id?' class="csr-editing"':'')+'><td class="csag-td csag-num">'+(i+1)+'</td>'
        +'<td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+ccE(p.name)+'</div><div class="lp-c-sub">'+ccE(p.key)+' · '+ccE(p.code)+' · '+ccE(p.type)+' · '+ccE(p.fundingMode)+'</div></td>'
        +'<td class="csag-td" style="white-space:normal">'+ccE(p.forms.join(', '))+' · '+ccE(p.currency)+'<div class="lp-c-sub">'+ccE(p.wallets.map(wbTypeName).join(', '))+'</div></td>'
        +'<td class="csag-td" style="white-space:normal">'+ccE(p.models.join(', '))+(p.depts.length?' · '+ccE(p.depts.join(', ')):'')+'<div class="lp-c-sub">'+[p.selfRequest?'self-request':'',p.adminRequest?'on behalf':''].filter(Boolean).join(' · ')+' · max '+p.maxCards+' active per employee'+(wf?' · '+caWfKey(wf):'')+'</div></td>'
        +'<td class="csag-td">'+ccE(p.provider?ccProviderName(p.provider):'None')+'<div class="lp-c-sub"><span class="lp-status-badge tone-'+statusTone(ccProviderStatus(p))+'">'+ccProviderStatus(p)+'</span></div></td>'
        +'<td class="csag-td">'+axBadge(statusTone(p.status),p.status)+'<div class="lp-c-sub">'+(p.effFrom?'from '+cdLabel(p.effFrom):'')+(p.effTo?' to '+cdLabel(p.effTo):'')+'</div></td>'
        +(can?'<td class="csag-td csag-act"><button class="att-row-btn" title="Edit" onclick="ccProgOpen('+p.id+')">'+CC_ICO.edit+'</button>'
          +(p.status==='Active'?ccBtn('Deactivate','ccProgStatusOpen('+p.id+')'):ccBtn('Activate','ccProgStatusClick('+p.id+',\'Active\')'))+'</td>':'')+'</tr>'
        +(ccProgForm&&ccProgForm.statusFor===p.id?'<tr class="csr-editing"><td></td><td class="csag-td" colspan="'+(can?6:5)+'"><div class="csr-add"><div class="ep-form-grid">'
          +ccField('Reason for deactivating '+ccE(p.name),true,ccArea('ccp-reason','','No new requests, cards or loads; existing cards and history are kept'),'',true)
          +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccProgClose()">Cancel</button><button class="ep-save-btn" onclick="ccProgStatusClick('+p.id+',\'Inactive\')">Deactivate</button></div></div></td></tr>':'');
    }).join(''):'<tr><td colspan="'+(can?7:6)+'" style="padding:18px;text-align:center;color:var(--gray)">No card programme yet.</td></tr>')
    +'</tbody></table></div>'
    +'';   // its change log: Company Settings → Activity & Audit → Logs
}
function ccDemoRowHTML(){
  const on=ccDemoOn(),can=ccCan('card.demo.manage');
  return '<div class="wb-note'+(on?'':' is-wait')+' cc-demo-row"><b>Illustrative mode: '+(on?'On':'Off')+'</b> · '+(on?'provider events may be recorded as '+CC_DEMO+'; they are labelled everywhere and never count as genuine.'
      :'only provider confirmations and verified evidence change a card or load.')
    +(can&&!ccDemoForm?' <button class="att-link" onclick="ccDemoOpen()">'+(on?'Switch off':'Switch on')+'</button>':'')
    +(on&&can&&!ccDemoForm&&typeof ccDemoSetupBtnHTML==='function'?ccDemoSetupBtnHTML():'')
    +(ccDemoForm?'<div class="ep-form-grid" style="margin-top:8px">'+ccField('Reason',true,ccArea('ccd-reason','','Kept in the audit trail'),'',true)+'</div>'
      +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccDemoClose()">Cancel</button><button class="ep-save-btn" onclick="ccDemoSave()">'+(on?'Switch presentation mode off':'Switch presentation mode on')+'</button></div>':'')
    +'</div>';
}
function ccDemoOpen(){if(!ccCan('card.demo.manage')){emsDeny('change presentation mode');return;}ccDemoForm={};refreshCsSidebar();}
function ccDemoClose(){ccDemoForm=null;refreshCsSidebar();}
function ccDemoSave(){
  const on=!ccDemoOn(),e=ccSetDemoMode(on,ccVal('ccd-reason'));
  if(e){showToast('Not saved','error',e);return;}
  ccDemoForm=null;refreshCsSidebar();showToast('Presentation mode '+(on?'on':'off'),'success',on?'Illustrative provider events can be recorded; each is labelled '+CC_DEMO+'.':'Only genuine confirmations and verified evidence can change cards and loads.');
}
function ccProgOpen(id){
  if(!ccCan('card.programme.manage')){emsDeny('configure card programmes');return;}
  const p=id!=null?ccProg(id):null,prov=oncProg(ccEnt()).provider;
  ccProgForm=p?{id:p.id,name:p.name,code:p.code,provider:p.provider,type:p.type,forms:p.forms.slice(),currency:p.currency,country:p.country,models:p.models.slice(),depts:p.depts.slice(),
      selfRequest:p.selfRequest,adminRequest:p.adminRequest,maxCards:p.maxCards,fundingMode:p.fundingMode,wallets:p.wallets.slice(),workflowId:p.workflowId,effFrom:p.effFrom,effTo:p.effTo,desc:p.desc,
      funding:ccFundNorm(p.funding||{})}
    :{id:null,name:'',code:'',provider:prov||'',type:'Corporate Expense',forms:['Virtual','Physical'],currency:typeof bgBaseCurrency==='function'&&bgBaseCurrency(ccEnt())||'INR',country:'India',models:['Direct'],depts:[],
      selfRequest:true,adminRequest:true,maxCards:1,fundingMode:'Corporate',wallets:[],workflowId:(ccWfOptions('Card Request')[0]||{}).id||'',effFrom:wbToday(),effTo:'',desc:'',funding:ccFundNorm({})};
  refreshCsSidebar();
}
function ccProgClose(){ccProgForm=null;refreshCsSidebar();}
function ccProgSync(){
  const f=ccProgForm;if(!f||f.statusFor)return;
  [['name','ccp-name'],['code','ccp-code'],['country','ccp-country'],['maxCards','ccp-max'],['effFrom','ccp-from'],['effTo','ccp-to'],['desc','ccp-desc']].forEach(function(p){const x=ccVal(p[1]);if(x!=null)f[p[0]]=x;});
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  let x;
  if((x=cs('ccp-provider'))!=null)f.provider=x==='None'?'':(ONC_PROVIDERS.find(function(p){return p.name===x;})||{}).key||'';
  if((x=cs('ccp-type'))!=null)f.type=x;
  if((x=cs('ccp-cur'))!=null)f.currency=x;
  if((x=cs('ccp-mode'))!=null)f.fundingMode=x;
  if((x=cs('ccp-self'))!=null)f.selfRequest=x==='Allowed';
  if((x=cs('ccp-admin'))!=null)f.adminRequest=x==='Allowed';
  if((x=cs('ccp-wf'))!=null){const w=ccWfOptions('Card Request').find(function(w){return caWfKey(w)+' '+w.name===x;});f.workflowId=w?w.id:'';}
  if(document.getElementById('msw-ccp-depts'))f.depts=getMSValue('ccp-depts');
  if(document.getElementById('ccp-form-Virtual'))f.forms=ccChecked('ccp-form-',CC_FORMS);
  if(document.getElementById('ccp-model-Direct'))f.models=ccChecked('ccp-model-',CC_MODELS);
  const wopts=ccWalletOptions(ccEnt(),f.provider,f.fundingMode);
  if(document.querySelector('[id^="ccp-w-"]'))f.wallets=ccChecked('ccp-w-',wopts);
  if(typeof ccProgFundingSync==='function')ccProgFundingSync(f);
}
function ccProgHook(){ccProgSync();refreshCsSidebar();}
function ccProgFormHTML(){
  const f=ccProgForm,prov=oncProg(ccEnt()).provider,wopts=ccWalletOptions(ccEnt(),f.provider,f.fundingMode),wfs=ccWfOptions('Card Request'),wf=caWfRec(Number(f.workflowId));
  return '<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+(f.id!=null?'Edit Programme':'Add Programme')+'</span></div><div class="ep-form-grid">'
    +ccField('Programme Name',true,ccInput('ccp-name',f.name,'e.g. ONC Corporate Expense Card'))
    +ccField('Programme Code',true,ccInput('ccp-code',f.code,'e.g. ONC-CORP'),'Unique in this entity.')
    +ccField('Provider',false,apCS('ccp-provider',['None'].concat(prov?[ccProviderName(prov)]:[]),f.provider?ccProviderName(f.provider):'None','Select','ccProgHook'),'Optional. Only the entity\'s connected provider can be named; it is not connected, so ADT issues no card.')
    +ccField('Programme Type',true,apCS('ccp-type',CC_PROG_TYPES,f.type,'Select'))
    +ccField('Supported Card Form',true,ccChecks('ccp-form-',CC_FORMS,f.forms))
    +ccField('Programme Currency',true,apCS('ccp-cur',EXP_CURRENCIES,f.currency,'Select'))
    +ccField('Country / Region',false,ccInput('ccp-country',f.country,'e.g. India'))
    +ccField('Eligible Employment Models',true,ccChecks('ccp-model-',CC_MODELS,f.models),'Direct employees by default. EOR only when this programme and its provider allow it.')
    +ccField('Eligible Departments',false,apMS('ccp-depts',typeof csDeptNames==='function'?csDeptNames():[],f.depts,'All departments'))
    +ccField('Employee Self-Request',true,apCS('ccp-self',['Allowed','Not allowed'],f.selfRequest?'Allowed':'Not allowed','Select'))
    +ccField('Administrative Request',true,apCS('ccp-admin',['Allowed','Not allowed'],f.adminRequest?'Allowed':'Not allowed','Select'),'Authorized administrators request on an employee\'s behalf.')
    +ccField('Maximum Active Cards per Employee',true,ccInput('ccp-max',f.maxCards,'1','number'))
    +ccField('Funding Mode',true,apCS('ccp-mode',CC_FUNDING_MODES,f.fundingMode,'Select','ccProgHook'),'Corporate: company spend. Benefit: Wallet & Benefits entitlements. Hybrid: both.')
    +ccField('Wallets',true,wopts.length?ccChecks('ccp-w-',wopts,f.wallets,wbTypeName):'<div class="wb-empty-sm">No active Wallet & Benefits configuration fits this funding mode'+(f.provider?' and provider':'')+'.</div>',
      'From active Wallet & Benefits configurations of this entity; nothing is duplicated.',true)
    +ccField('Card Request Approval Workflow',true,apCS('ccp-wf',wfs.map(function(w){return caWfKey(w)+' '+w.name;}),wf?caWfKey(wf)+' '+wf.name:'','Select workflow'),'From the shared approval engine.')
    +ccField('Effective From',false,apCD('ccp-from',f.effFrom,'Select date'))+ccField('Effective To',false,apCD('ccp-to',f.effTo,'Open-ended'))
    +(typeof ccProgFundingFormHTML==='function'?ccProgFundingFormHTML(f):'')
    +ccField('Description',false,ccArea('ccp-desc',f.desc,''),'',true)
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccProgClose()">Cancel</button><button class="ep-save-btn" onclick="ccProgSaveClick()">'+(f.id!=null?'Save changes':'Save')+'</button></div></div>';
}
function ccProgSaveClick(){
  ccProgSync();const f=ccProgForm;if(!f)return;
  const res=ccProgSave(f);if(res.error){showToast('Not saved','error',res.error);return;}
  ccProgForm=null;refreshCsSidebar();showToast('Programme saved','success',res.rec.key+' · '+res.rec.name+(res.unchanged?' · no change':'')+'.');
}
function ccProgStatusOpen(id){if(!ccCan('card.programme.manage')){emsDeny('change card programmes');return;}ccProgForm={statusFor:id};refreshCsSidebar();}
function ccProgStatusClick(id,status){
  const e=ccProgSetStatus(id,status,ccVal('ccp-reason'));if(e){showToast('Not saved','error',e);return;}
  ccProgForm=null;refreshCsSidebar();const p=ccProg(id);showToast('Programme '+status.toLowerCase(),'success',p.key+(status==='Active'?' takes new requests again.':' takes no new requests, cards or loads; existing cards are kept.'));
}

/* ══ 7B · Card requests: listing, record panel, form, review ═════════════ */
let ccReqSel=null,ccReqTab='basic-details',ccReqQ='',ccReqStatusF='',ccReqProgF='',ccReqForm=null;
Object.assign(CA_TYPE_LABEL,{'card request':'Card Request'});
/* The card routes in the shared workflow form (opened from Company Settings → Card Programmes). */
CC_WF_KINDS.forEach(function(k){
  CA_WF_INFO[k]={perm:'card.programme.manage',noun:'card request',
    hint:{'Card Request':'New corporate cards: who approves before enrollment starts.','Card Load':'Loading money onto a card: approval before execution.',
      'Bulk Card Enrollment':'Bulk enrollment files: the independent checker.','Bulk Card Load':'Bulk load files: one approval with row review.',
      'Card Control Change':'Relaxing a card\'s limits or restrictions.','Card Replacement':'Replacing a lost, stolen or damaged card.'}[k],
    listNote:'Each card request takes its programme\'s route, else the newest active route of its type. Independent stages are on for card routes.',
    usedBy:function(id){const n=ccRequests.concat(ccLoads,ccBulks,ccCtlChanges).filter(function(r){return r.wf&&r.wf.wfId===id;}).length;return k+' requests'+(n?' · '+n+' routed':'');},
    stages:function(){
      const team=(caTeams().find(function(t){return t.name==='Card Approvers';})||{}).id;
      const fin=Object.assign(awfBlankStage(k==='Card Request'||k==='Card Control Change'?2:1),{name:'Card approver review',type:team?'RBAC Team':'Role',ref:team?String(team):''});
      if(k==='Card Request'||k==='Card Control Change')return [Object.assign(awfBlankStage(1),{name:'Manager review',type:'Reporting Manager'}),fin];
      return [fin];
    }};
});
function ccReqVisible(r){const me=idMe();return r.entity===ccEnt()&&(ccSeesEmp(r.employeeEid)||r.createdBy===me||caInvolved(r,me));}
function ccReqShown(){
  const q=String(ccReqQ||'').trim().toLowerCase();
  return ccRequests.filter(function(r){
    if(!ccReqVisible(r))return false;
    if(q&&![expKey(r),r.name,r.title,caN(r.createdBy)].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccReqStatusF&&ccReqTrack(r)!==ccReqStatusF)return false;
    if(ccReqProgF&&ccProgLabel(ccProg(r.programmeId))!==ccReqProgF)return false;
    return true;
  });
}
function ccSplit(key,table,open,render){
  return '<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="'+key+'-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +table+'</div></div>'
    +'<div class="lp-split-sb'+(open?' open':'')+'" id="'+key+'-split-sb"><div class="lp-isb" id="'+key+'-isb-inner">'+(open?sbRender(render,key):'')+'</div></div></div>';
}
function ccRequestsHTML(){
  if(typeof ccReqSub!=='undefined'&&ccReqSub==='bulk'&&ccAdminView())return ccReqBulkPageHTML();
  const own=!ccAdminView(),all=ccRequests.filter(ccReqVisible),rows=ccReqShown();
  if(ccReqSel!=null&&!rows.some(function(r){return r.id===ccReqSel;}))ccReqSel=null;
  const pgn=listPage('cards-req',[ccReqQ,ccReqStatusF,ccReqProgF].join('|'),rows.map(function(r,i){
    const p=ccProg(r.programmeId),t=ccReqTrack(r);
    return '<tr class="ccr-row'+(ccReqSel===r.id?' lp-row-selected':'')+'" id="ccr-row-'+r.id+'" style="cursor:pointer" onclick="ccReqOpen('+r.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(expKey(r))+'</div><div class="lp-c-sub">'+(r.kind==='wallet request'?'Wallet · '+ccE(r.wallets.map(wbTypeName).join(', ')):ccE(r.kind==='card replacement'?'Replacement':'New card')+' · '+ccE(r.cardType))+'</div></td>'
      +(own?'':'<td><div class="lp-c-plain ax-c-trunc">'+ccE(r.name)+'</div><div class="lp-c-sub">'+(r.mode==='On Behalf'?'requested by '+ccE(caN(r.createdBy)):r.mode==='Automatic'?'issued automatically':'self-request')+'</div></td>')
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(p?p.name:'')+'</div><div class="lp-c-sub">'+ccE(p?p.key:'')+'</div></td>'
      +'<td>'+axBadge(statusTone(t),t)+(r.enr&&['Completed','Cancelled'].indexOf(r.enr.status)<0?'<div class="lp-c-sub">Enrollment '+ccE(r.enr.status)+' · KYC '+ccE(r.enr.kyc)+'</div>':'')+'</td><td class="ca-c-stage">'+caStageCell(r)+'</td>'
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(expKey(r))+'" onclick="ccReqOpen('+r.id+')">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td></tr>';
  }),ccEmpty(own?6:7,own?'You have no card request yet. Use + to request a card.':'No card request matches this filter.'));
  const cnt=function(s){return all.filter(function(r){return ccReqTrack(r)===s;}).length;};
  const tile=function(s,tone){return caStat(s,cnt(s),ccReqStatusF===s,'ccReqStat(\''+s+'\')',tone);};
  const tiles=tile('Draft','idle')+tile('Awaiting Approval')+tile('Follow-Up','wait')+tile('Enrollment Pending','wait')+tile('Enrollment Completed','ok');
  return '<div class="lp-page">'+dashboardBackHTML()+(ccAdminView()?ccRqStrip():typeof ccReqSubStrip==='function'?ccReqSubStrip():'')
    +ccFilterBar(lpSearchField('ccr-f-q',ccReqQ,own?'Search request':'Search request, employee or requester','ccReqApply()')
      +apCS('ccr-f-prog',ccProgs().map(ccProgLabel),ccReqProgF,'All Programmes')
      +apCS('ccr-f-status',['Draft','Awaiting Approval','Follow-Up','Enrollment Pending','Enrollment Completed','Rejected','Withdrawn','Cancelled'],ccReqStatusF,'All Statuses')
      +clearFiltersBtn([ccReqQ,ccReqStatusF,ccReqProgF],'ccReqReset()')+'<button class="lp-pill-search" onclick="ccReqApply()">Search</button>',tiles)
    +ccDemoNote()
    +ccSplit('ccr','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Request</th>'+(own?'':'<th>Employee</th>')+'<th>Programme</th><th>Status</th><th>Current Stage</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,ccReqSel!=null,renderCcrSidebar)
    +'</div>'+(ccReqForm?ccReqFormHTML():'');
}
function ccReqApply(){ccReqQ=lpSearchValue('ccr-f-q');const p=getCSValue('ccr-f-prog'),s=getCSValue('ccr-f-status');ccReqProgF=p==='All Programmes'?'':p||'';ccReqStatusF=s==='All Statuses'?'':s||'';ccReqSel=null;renderADTPage();}
function ccReqReset(){ccReqQ='';ccReqStatusF='';ccReqProgF='';ccReqSel=null;renderADTPage();}
function ccReqStat(s){ccReqStatusF=ccReqStatusF===s?'':s;ccReqSel=null;renderADTPage();}
function ccReqOpen(id,tab){
  const r=ccReq(id);if(!r||!ccReqVisible(r)){showToast('Not available','error','This request is outside your access.');return;}
  ccReqTab=tab||sbKeepTab(ccReqSel,ccReqTab);ccReqSel=id;
  const sb=document.getElementById('ccr-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('ccr',renderCcrSidebar);
  document.querySelectorAll('.ccr-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='ccr-row-'+id);});
}
function ccReqClose(){ccReqSel=null;const sb=document.getElementById('ccr-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.ccr-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccReqNav(t){ccReqTab=t;isbTab('ccr',renderCcrSidebar);}
/* The engine's "open the record" (Pending My Approval, notifications). */
function ccOpenReqUI(id,tab){
  const r=ccReq(id);if(!r)return;
  if(!ccReqVisible(r)){showToast('Not available','error','This request is outside your access.');return;}
  ccCloseForms();ccPageTab='requests';if(typeof ccReqSub!=='undefined')ccReqSub='requests';ccReqQ='';ccReqStatusF='';ccReqProgF='';ccReqSel=r.id;ccReqTab=tab||'basic-details';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function renderCcrSidebar(){
  const r=ccReq(ccReqSel);if(!r)return '';
  if(!ccReqVisible(r))return '<div class="lp-isb-body"><div class="wb-empty-sm">This request is not available to you.</div></div>';
  /* A Controls tab on every card request, for the people who see a card's Controls tab (product owner, 11 Nov 2026). */
  const tabs=[{id:'basic-details',label:'Basic Details'}].concat(ccReqCtlTabOn()?[{id:'controls',label:'Controls'}]:[])
    /* No Load tab (product owner, 12 Nov 2026): a load is requested from Expenses & Advances. */
    /* No Approval tab (product owner, 12 Nov 2026): decisions are taken in Logs; the route and its stages are in Workflow. */
    .concat(r.enr?[{id:'enrollment',label:'Enrollment'}]:[])
    .concat([{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}]);
  if(!tabs.some(function(t){return t.id===ccReqTab;}))ccReqTab='basic-details';
  ccReqPanelSync(r);   // a Logs action or a control form ends when the person leaves its tab or this request
  const t=ccReqTrack(r);
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(r.title),meta:[expKey(r),ccE(r.name)],status:axBadge(statusTone(t),t)});
  let body;
  if(ccReqTab==='approval')body=hero+caApprovalTabHTML(r,{readOnly:true});   // decisions are taken in Logs (product owner, 11 Nov 2026)
  else if(ccReqTab==='controls')body=hero+ccReqControlsHTML(r);
  else if(ccReqTab==='load')body=hero+ccReqLoadHTML(r);
  else if(ccReqTab==='enrollment')body=hero+ccEnrHTML(r);
  else if(ccReqTab==='logs')body=ccReqLogsHTML(r);
  else if(ccReqTab==='history')body=sbHistoryHTML(r);
  else if(ccReqTab==='workflow')body=wfTimelineHTML(ccWfRows(r));
  else body=hero+ccReqBasicHTML(r);
  return axTabBar('ccr',tabs,ccReqTab,'ccReqNav','ccReqClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function ccReqBasicHTML(r){
  const p=ccProg(r.programmeId),me=idMe(),own=r.createdBy===me||caIsClaimant(r,me);
  let act='';
  if(r.status==='Draft'&&(own||ccCan('card.request.others'))){act+=ccBtn('Submit','ccReqSubmitClick('+r.id+')',true)+ccBtn('Edit','ccReqStart('+r.id+')');}
  if(typeof caCanWithdraw==='function'&&caCanWithdraw(r))act+=ccBtn('Withdraw','caActOpen(\'withdraw\','+r.id+')');
  if(r.status==='Follow-Up'&&typeof caCanRespond==='function'&&caCanRespond(r))act+=ccBtn('Edit before resubmitting','ccReqStart('+r.id+')');
  const el=r.status==='Draft'||r.status==='Follow-Up'?ccEligibility(r.employeeEid,r.programmeId,'submit'):null;
  const mgr=typeof caManagerOf==='function'?caManagerOf(r.employeeEid):'';
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(r.status==='Follow-Up'?'<div class="wb-note is-wait">Sent back for Follow-Up. Correct the request if needed, then resubmit it from the Logs tab with your answer.</div>':'')
    +(el&&!el.ok?'<div class="wb-note is-wait"><b>Not ready to submit</b><div class="wb-note-sub">'+ccE(el.reasons.join(' '))+'</div></div>':'')
    +(r.enr?'<div class="wb-note is-data"><b>Enrollment '+ccE(r.enr.key)+': '+ccE(r.enr.status)+'</b><div class="wb-note-sub">KYC '+ccE(r.enr.kyc)+(r.enr.delivery?' · delivery '+ccE(r.enr.delivery):'')+' · activation '+ccE(r.enr.activation)+' · source '+ccE(r.enr.source)+'. '+(function(){const c=ccCardOfReq(r);return c&&['Not Issued','Issuance Pending'].indexOf(c.status)<0?'Card '+ccE(ccCardLabel(c))+' is '+ccE(c.status)+' ('+ccE(c.source)+').':'Approval authorized enrollment only; no card has been issued.';})()+' Details are on the Enrollment tab.</div></div>':'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Card Request ID',expKey(r))
    +axField(AX_ICO.fUser,'Employee',ccE(r.name)+' <span class="ax-sub">'+ccE(r.empId||'')+(r.dept?' · '+ccE(r.dept):'')+'</span>')
    +axField(AX_ICO.fUser,'Requested By',ccE(caN(r.createdBy))+' <span class="ax-sub">'+ccE(r.mode)+' · '+ccE(r.createdAt)+'</span>')
    +axField(AX_ICO.fUser,'Reporting Manager',ccE(mgr?caN(mgr):'—'))
    +axField(AX_ICO.fTag,'Card Programme',ccE(p?p.key+' · '+p.name:''))
    +axField(AX_ICO.fBox,'Card Type',ccE(r.cardType))
    +axField(AX_ICO.fCash,'Currency · Wallets',ccE((p?p.currency:'')+' · '+r.wallets.map(wbTypeName).join(', ')))
    +axField(AX_ICO.fTag,'Request Reason',ccE(r.reason)+(r.purpose?' <span class="ax-sub">'+ccE(r.purpose)+'</span>':''))
    +(r.delivery?axField(AX_ICO.fBuild,'Delivery',ccE(r.delivery.mode)+(r.delivery.text?' <span class="ax-sub">'+ccE(r.delivery.text)+'</span>':'')):'')
    +axField(AX_ICO.fCheck,'Status',ccE(ccReqTrack(r))+(r.consentSimulated?' <span class="lp-status-badge tone-info">'+CC_DEMO+' consent</span>':''))
    +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Supporting Document',ccE(r.proof||'—'))
    +axField(EXP_ICO.note,'Additional Comments',ccE(r.comments||'—'),true)
    +'</div>';
}
function ccReqSubmitClick(id){
  const e=ccReqSubmit(id);if(e){showToast('Not submitted','error',e);return;}
  const r=ccReq(id),st=caActiveStage(r);renderADTPage();
  showToast('Card request submitted','success',expKey(r)+' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'. Approval starts enrollment; it does not issue a card.');
}
/* ── The request form (+ on Requests, Request Card on the employee record) ─ */
function ccReqEmpPool(){
  const me=ccEmpOf(),list=[];
  if(ccCan('card.request.others'))idEmpAll().forEach(function(e){if(e.entityId===ccEnt()&&ccEmpModel(e))list.push(e);});
  else if(me&&ccCan('card.request.create'))list.push(me);
  return list;
}
function ccEmpLabel(e){return e.name+' · '+(e.empId||e.eid);}
function ccReqStart(id,o){
  o=o||{};
  if(id!=null){
    const r=ccReq(id);if(!r)return;
    ccReqForm={id:r.id,employeeEid:r.employeeEid,programmeId:r.programmeId,cardType:r.cardType,reason:r.reason,purpose:r.purpose,deliveryMode:r.delivery?r.delivery.mode:'',deliveryText:r.delivery?r.delivery.text:'',comments:r.comments,proof:r.proof};
  }else{
    const pool=ccReqEmpPool();if(!pool.length){showToast('Not permitted','error','Requesting a card needs card.request.create (own) or card.request.others (on behalf).');return;}
    const me=ccEmpOf(),emp=o.employeeEid?idEmp(o.employeeEid):(me&&pool.indexOf(me)>=0?me:null);
    ccReqForm={id:null,employeeEid:emp?emp.eid:'',programmeId:o.programmeId||'',cardType:'',reason:'',purpose:'',deliveryMode:'',deliveryText:'',comments:'',proof:''};
    const progs=ccReqProgOptions(ccReqForm);if(progs.length===1)ccReqForm.programmeId=progs[0].id;
  }
  if(typeof ccReqSub!=='undefined')ccReqSub='requests';
  if(page!=='cards'){ccPageTab='requests';navigatePage('cards');}
  else{if(ccPageTab!=='requests')ccPageTab='requests';renderADTPage();}
}
function ccReqProgOptions(f){
  const me=ccEmpOf(),self=!!me&&me.eid===f.employeeEid;
  return ccProgs().filter(function(p){return ccProgActive(p)&&(self?p.selfRequest:p.adminRequest);});
}
function ccReqSync(){
  const f=ccReqForm;if(!f)return;
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  let x;
  if((x=cs('ccrf-emp'))!=null){const e=ccReqEmpPool().find(function(e){return ccEmpLabel(e)===x;});const v=e?e.eid:'';if(v!==f.employeeEid){f.employeeEid=v;}}
  if((x=cs('ccrf-prog'))!=null){const p=ccProgs().find(function(p){return ccProgLabel(p)===x;});const v=p?p.id:'';if(v!==f.programmeId){f.programmeId=v;f.cardType='';}}
  if((x=cs('ccrf-type'))!=null)f.cardType=x;
  if((x=cs('ccrf-reason'))!=null)f.reason=x;
  if((x=cs('ccrf-deliv'))!=null)f.deliveryMode=x;
  [['purpose','ccrf-purpose'],['deliveryText','ccrf-dtext'],['comments','ccrf-comments']].forEach(function(p){const v=ccVal(p[1]);if(v!=null)f[p[0]]=v;});
}
function ccReqHook(){ccReqSync();renderADTPage();}
function ccReqProof(input){const f=input.files&&input.files[0];input.value='';if(!f)return;if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}ccReqSync();ccReqForm.proof=f.name;renderADTPage();}
function ccReqFormClose(){ccReqForm=null;renderADTPage();}
function ccReqFormHTML(){
  const f=ccReqForm,pool=ccReqEmpPool(),e=f.employeeEid?idEmp(f.employeeEid):null,p=f.programmeId?ccProg(f.programmeId):null,me=ccEmpOf();
  const progs=e?ccReqProgOptions(f):[],self=!!(me&&e&&me.eid===e.eid);
  if(p&&!f.cardType&&p.forms.length===1)f.cardType=p.forms[0];
  const el=e&&p?ccEligibility(e.eid,p.id,'submit'):null,mgr=e&&typeof caManagerOf==='function'?caManagerOf(e.eid):'';
  const body='<div class="ep-form-grid">'
    +ccField('Employee',true,pool.length>1||!self?axCS('ccrf-emp',pool.map(ccEmpLabel),e?ccEmpLabel(e):'','Search employee','ccReqHook'):'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(e?ccEmpLabel(e):'')+'">',
      e&&!self?'Requested on behalf of '+ccE(e.name)+': you and the employee are both recorded; neither can approve it.':'')
    +ccField('Department · Designation',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(e?(e.dept||'—')+' · '+(e.jobTitle||e.designation||'—'):'')+'">')
    +ccField('Reporting Manager',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(mgr?caN(mgr):'—')+'">')
    +ccField('Card Programme',true,apCS('ccrf-prog',progs.map(ccProgLabel),p?ccProgLabel(p):'','Select programme','ccReqHook'),e&&!progs.length?'No active programme takes '+(self?'self-requests':'requests on behalf')+' here.':'')
    +ccField('Card Type',true,apCS('ccrf-type',p?p.forms:[],f.cardType,'Select','ccReqHook'))
    +ccField('Requested Currency · Wallets',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(p?p.currency+' · '+p.wallets.map(wbTypeName).join(', '):'')+'">')
    +ccField('Request Reason',true,apCS('ccrf-reason',CC_REQ_REASONS,f.reason,'Select'))
    +ccField('Business Purpose',f.reason==='Other',ccInput('ccrf-purpose',f.purpose,'What the card is for'))
    +(f.cardType==='Physical'?ccField('Delivery Address',true,apCS('ccrf-deliv',CC_DELIVERY,f.deliveryMode,'Select','ccReqHook'),'Used for this card only; the employee record is not changed.')
      +(f.deliveryMode==='Other address'?ccField('Other Address',true,ccArea('ccrf-dtext',f.deliveryText,'Full address with PIN code'),'',true):''):'')
    +ccField('Supporting Document',false,f.proof?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.proof)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccReqProof(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span></span></label>')
    +ccField('Additional Comments',false,ccArea('ccrf-comments',f.comments,''),'',true)
    +(el?'<div class="ep-form-group ep-form-full"><div class="wb-note'+(el.ok?'':' is-wait')+'"><b>Eligibility: '+(el.ok?'eligible':'not eligible yet')+'</b>'
      +(el.ok?'':'<div class="wb-note-sub">'+ccE(el.reasons.join(' '))+(ccEligibility(e.eid,p.id,'draft').ok?' You can save a preparatory draft.':'')+'</div>')+'</div></div>':'')
    +'</div>';
  return bgModal(f.id!=null?'Edit Card Request · '+expKey(ccReq(f.id)):'New Card Request','Approval decides whether enrollment may start. It does not issue a card, and ADT never shows a full card number, PIN or CVV.',body,
    {close:'ccReqFormClose()',btns:'<button class="ep-cancel-btn" onclick="ccReqSave(false)">Save Draft</button><button class="ep-save-btn" onclick="ccReqSave(true)">'+(f.id!=null&&ccReq(f.id).status==='Follow-Up'?'Save changes':'Submit')+'</button>'});
}
function ccReqSave(submit){
  ccReqSync();const f=ccReqForm;if(!f)return;
  if(!f.employeeEid||!f.programmeId){showToast('Not saved','error','Pick the employee and the card programme.');return;}
  if(!f.cardType){showToast('Not saved','error','Pick the card type.');return;}
  if(f.id!=null){
    const r=ccReq(f.id),e=ccReqUpdate(f.id,f);if(e){showToast('Not saved','error',e);return;}
    if(submit&&r.status==='Draft'){const se=ccReqSubmit(r.id);if(se){showToast('Saved as draft','error',se);ccReqForm=null;renderADTPage();return;}}
    ccReqForm=null;ccReqSel=r.id;renderADTPage();showToast(submit&&r.status!=='Draft'?'Request submitted':'Request saved','success',expKey(r)+' · '+ccReqTrack(r)+'.');return;
  }
  const res=ccReqCreate(f,submit);
  if(res.error){showToast(submit?'Not submitted':'Not saved','error',res.error);return;}
  ccReqForm=null;ccReqSel=res.rec.id;ccReqTab='basic-details';renderADTPage();
  const st=caActiveStage(res.rec);
  showToast(submit?'Card request submitted':'Draft saved','success',expKey(res.rec)+(submit?' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'. Approval starts enrollment; it does not issue a card.':' is a draft; submit it when ready.'));
}
/* What an approver sees in the shared review popup. */
function ccReviewInfoHTML(r){
  if(r.kind==='card control change'||r.kind==='card programme control')return ccCtlReviewInfoHTML(r);
  if(r.kind==='card load')return ccLoadReviewInfoHTML(r);
  if(typeof CC_BULK!=='undefined'&&CC_BULK[r.kind])return ccBulkReviewInfoHTML(r);
  if(r.kind!=='card request'&&r.kind!=='card replacement')return '';
  const p=ccProg(r.programmeId),el=ccEligibility(r.employeeEid,r.programmeId,'approve');
  return '<div class="wb-note'+(el.ok?'':' is-bad')+'"><b>'+ccE(r.title)+'</b><div class="wb-note-sub">'+ccE(r.name)+' ('+ccE(r.empId||'')+(r.dept?', '+ccE(r.dept):'')+')'
    +(r.mode==='On Behalf'?' · requested by '+ccE(caN(r.createdBy)):r.mode==='Automatic'?' · issued automatically':' · self-request')+'<br>'+ccE(p?p.key+' '+p.name:'')+' · '+ccE(r.cardType)+' · wallets '+ccE(r.wallets.map(wbTypeName).join(', '))
    +'<br>Reason: '+ccE(r.reason)+(r.purpose?' - '+ccE(r.purpose):'')+(r.delivery?'<br>Delivery: '+ccE(r.delivery.mode)+(r.delivery.text?' - '+ccE(r.delivery.text):''):'')
    +'<br>Eligibility now: '+(el.ok?'eligible':'<b>'+ccE(el.reasons.join(' '))+'</b>')
    +'<br>Approval starts enrollment only; no card is issued by approval.</div></div>';
}
/* The + on Corporate Cards: a card request on the Requests tab. */
function ccCanAddHere(){
  /* Transactions: + is Record Transaction (product owner, 13 Nov 2026; it was a link above the filters). */
  if(ccTxnPageOn())return ccCan('card.transaction.record')&&(typeof mcOn!=='function'||mcOn('cards'));
  if(ccPageTab==='loads')return typeof ccLoadSub!=='undefined'&&ccLoadSub==='loads'&&ccCan('card.load.create');
  return ccPageTab==='requests'&&(typeof ccReqSub==='undefined'||ccReqSub==='requests')&&(ccCan('card.request.create')||ccCan('card.request.others'))&&ccProgs().some(function(p){return ccProgActive(p);});
}
function ccStartAddHere(){if(ccTxnPageOn()){ccTxnFormOpen('record');return;}if(ccPageTab==='requests')ccReqStart();else if(ccPageTab==='loads')ccLoadStart();}
/* Request Card / Request Card on Behalf on the employee's ONC Card tab (FR-CC-04 entry points). */
function ccEmpCardActionsHTML(emp){
  if(!emp||(typeof mcOn==='function'&&!mcOn('cards')))return '';
  const me=ccEmpOf(),self=!!me&&me.eid===emp.eid;
  const can=self?ccCan('card.request.create')||ccCan('card.request.others'):ccCan('card.request.others');
  const live=ccLiveCardsOf(emp.eid),open=ccRequests.filter(function(r){return r.employeeEid===emp.eid&&['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0;});
  if(!can&&!live.length&&!open.length)return '';
  return '<div class="wb-note cc-emp-cards"><b>Corporate cards</b> · '+(live.length?live.length+' card'+(live.length===1?'':'s')+' ('+live.map(function(c){
      return ccSeesEmp(emp.eid)?'<button class="att-link" onclick="ccOpenCardUI('+c.id+')">'+ccE(ccMask(c.last4)+' '+c.status)+'</button>':ccE(ccMask(c.last4)+' '+c.status);}).join(', ')+')':'no card yet')
    +(open.length?' · open request'+(open.length===1?'':'s')+' '+open.map(expKey).join(', '):'')
    +(function(){if(typeof ccClearanceSync==='function')ccClearanceSync();const o=ccCardsOfEmp(emp.eid).filter(function(c){return c.clearance&&c.clearance.status==='Open';});return o.length?' · <b>exit card clearance open</b> ('+o.map(expKey).join(', ')+')':'';})()
    +(can?' <button class="att-link" onclick="ccReqStart(null,{employeeEid:\''+emp.eid+'\'})">'+(self?'Request Card':'Request Card on Behalf')+'</button>':'')
    +(self&&(live.length||open.length)?' <button class="att-link" onclick="ccOpenHolderUI(\''+emp.eid+'\')">Open My Cards</button>':'')+'</div>';
}


/* ══ 7C · Card lifecycle screens ═══════════════════════════════════════════════════════════════════
   Cards (admin) / My Cards (employee): the listing opens the card panel - Basic Details with the actions
   the person may take, Lifecycle (every event with its confirmation source), Logs and History. The
   request panel gains an Enrollment tab. One action popup serves every lifecycle form. */
let ccCardTab='basic-details',ccAct=null;
CA_TYPE_LABEL['card replacement']='Card Replacement';
function ccCardVisible(c){return !!c&&c.entity===ccEnt()&&ccSeesEmp(c.employeeEid);}
/* FR-CC-06.08: a card of an inactive or leaving employee is flagged. */
function ccHolderFlag(c){
  const e=idEmp(c.employeeEid),st=e&&typeof empState==='function'?empState(e):null;
  if(!st||ccCardEnded(c))return '';
  return st.status==='Inactive'?'Cardholder inactive':st.phase==='off'?'Cardholder leaving':'';
}
function ccCardAttention(c){
  const out=[],fl=ccHolderFlag(c);
  if(fl)out.push(fl);
  if(c.hold&&c.hold.active)out.push(c.hold.type==='Temporary'?'On hold in ADT':'Reported '+c.hold.reason.toLowerCase()+' · on hold');
  if(c.pending)out.push(c.pending.action+' requested · awaiting provider');
  const w=ccOutcomesAwaiting(c).length;if(w)out.push(w+' awaiting verification');
  return out;
}
function ccCardsHTML(){
  if(typeof ccClearanceSync==='function')ccClearanceSync();
  if(typeof ccCardsSub!=='undefined'&&ccCardsSub==='holder')ccCardsSub='cards';   // Cardholder View removed (product owner, 11 Nov 2026)
  if(typeof ccCardsSub!=='undefined'&&ccCardsSub==='txns'&&ccAdminView()&&typeof ccTxnAdminView==='function'&&ccTxnAdminView())return ccTxnPageHTML();
  const own=!ccAdminView(),rows=ccCardsShown();
  if(ccSel!=null&&!rows.some(function(c){return c.id===ccSel;}))ccSel=null;
  const pgn=listPage('cards-list',[ccQ,ccStatusF,ccProgF].join('|'),rows.map(function(c,i){
    const p=ccProg(c.programmeId),att=ccCardAttention(c),e=idEmp(c.employeeEid);
    return '<tr class="ccd-row'+(ccSel===c.id?' lp-row-selected':'')+'" id="ccd-row-'+c.id+'" style="cursor:pointer" onclick="ccCardOpen('+c.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-main ax-c-link">'+ccE(ccMask(c.last4))+'</div><div class="lp-c-sub">'+ccE(expKey(c))+' · '+ccE(c.type)+'</div></td>'
      +(own?'':'<td><div class="lp-c-plain ax-c-trunc">'+ccE(ccHolderName(c))+'</div><div class="lp-c-sub">'+ccE(e?e.empId||'':'')+'</div></td>')
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(p?p.name:'')+'</div><div class="lp-c-sub">'+ccE(p?p.key:'')+'</div></td>'
      +'<td>'+axBadge(statusTone(c.status),c.status)+(att.length?'<div class="lp-c-sub exp-cap-over">'+ccE(att.join(' · '))+'</div>':'')
        +(function(){const n=ccCardOpenDisputes(c).length;return n?'<div class="lp-c-sub" style="color:var(--st-wait-fg)">'+n+' open dispute'+(n===1?'':'s')+'</div>':'';})()+'</td>'
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(expKey(c))+'" onclick="ccCardOpen('+c.id+')">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td></tr>';
  }),ccEmpty(own?5:6,own?'You have no corporate card yet.':'No card record matches. A card record is created when an approved enrollment is submitted to the provider.'));
  const all=ccCards.filter(ccCardVisible),cnt=function(s){return all.filter(function(c){return c.status===s;}).length;};
  const tile=function(s,tone){return caStat(s,cnt(s),ccStatusF===s,'ccStat(\''+s+'\')',tone);};
  const tiles=own?'':tile('Issuance Pending','wait')+tile('Activation Pending','wait')+tile('Active','ok')+tile('Suspended','wait')+tile('Blocked','bad')
    +caStat('Exit Clearance',all.filter(function(c){return c.clearance&&c.clearance.status==='Open';}).length,ccStatusF==='__clearance__','ccStat(\'__clearance__\')','wait')
    /* The last box: cards with an open dispute on one of their payments (product owner, 11 Nov 2026). */
    +(['card.dispute.manage','card.dispute.view'].some(ccCan)?caStat('Dispute',all.filter(function(c){return ccCardOpenDisputes(c).length>0;}).length,ccStatusF==='__dispute__','ccStat(\'__dispute__\')','wait'):'');
  const head='<tr><th>S. No</th><th>Card</th>'+(own?'':'<th>Cardholder</th>')+'<th>Programme</th><th>Status</th><th>Actions</th></tr>';
  const meE=own?ccEmpOf():null;
  return '<div class="lp-page">'+dashboardBackHTML()
    +(typeof ccCardsSubs==='function'&&ccCardsSubs().length>1?ccSubStrip(ccCardsSubs(),ccCardsSub,'ccCardsSubPick',''):'')
    +(meE&&typeof ccCardholderHTML==='function'?ccCardholderHTML(meE.eid)+'<div class="lp-sb-view-header" style="margin-top:18px"><span class="lp-sb-section-title">Card Records</span></div>':'')
    +ccFilterBar(lpSearchField('cc-f-q',ccQ,own?'Search card':'Search card, cardholder or programme','ccApply()')
      +apCS('cc-f-prog',ccProgs().map(ccProgLabel),ccProgF,'All Programmes')+apCS('cc-f-status',CC_CARD_STATUSES,ccStatusF,'All Statuses')
      +clearFiltersBtn([ccQ,ccProgF,ccStatusF],'ccReset()')+'<button class="lp-pill-search" onclick="ccApply()">Search</button>',tiles)
    +ccDemoNote()
    +ccSplit('ccd','<table class="lp-table ax-table exp-table cc-table"><thead>'+head+'</thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager,ccSel!=null,renderCcdSidebar)
    +'</div>';
}
function ccCardOpen(id,tab){
  const c=ccCard(id);if(!c||!ccCardVisible(c)){showToast('Not available','error','This card is outside your access.');return;}
  if(page!=='cards'||ccPageTab!=='cards'){ccOpenCardUI(id,tab);return;}
  ccCardTab=tab||sbKeepTab(ccSel,ccCardTab);ccSel=c.id;
  const sb=document.getElementById('ccd-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('ccd',renderCcdSidebar);
  document.querySelectorAll('.ccd-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='ccd-row-'+id);});
}
function ccCardClose(){ccSel=null;const sb=document.getElementById('ccd-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.ccd-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccCardNav(t){ccCardTab=t;isbTab('ccd',renderCcdSidebar);}
/* Open a card from anywhere (a request, the employee record): the Cards tab with its panel. */
function ccOpenCardUI(id,tab){
  const c=ccCard(id);if(!c)return;
  if(!ccCardVisible(c)){showToast('Not available','error','This card is outside your access.');return;}
  ccCloseForms();ccPageTab='cards';if(typeof ccCardsSub!=='undefined')ccCardsSub='cards';ccQ='';ccStatusF='';ccProgF='';ccSel=c.id;ccCardTab=tab||'basic-details';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function renderCcdSidebar(){
  if(typeof ccClearanceSync==='function')ccClearanceSync();
  const c=ccCard(ccSel);if(!c)return '';
  if(!ccCardVisible(c))return '<div class="lp-isb-body"><div class="wb-empty-sm">This card is not available to you.</div></div>';
  const tabs=[{id:'basic-details',label:'Basic Details'}].concat(['card.control.view','card.control.manage','card.control.approve'].some(ccCan)?[{id:'controls',label:'Controls'}]:[])
    .concat([{id:'wallets',label:'Wallets'},{id:'loads',label:'Loads'}])
    .concat(['card.transaction.view.all','card.transaction.view.team','card.transaction.view.own'].some(ccCan)?[{id:'transactions',label:'Transactions'}]:[])
    .concat(c.clearance&&c.clearance.status!=='Withdrawn'?[{id:'clearance',label:'Clearance'}]:[])
    .concat([{id:'logs',label:'Logs'},{id:'history',label:'History'}]);
  /* Lifecycle and References were removed from the card (product owner, 11 Nov 2026): every status change, delivery and
     hold is in Logs; the request is linked from Basic Details. */
  if(!tabs.some(function(t){return t.id===ccCardTab;}))ccCardTab='basic-details';
  /* An action started in the Logs tab ends when the person leaves that tab or that card; so do the control change and the
     new load opened inside their own tabs. */
  if(ccAct&&ccAct.inLogs&&(ccCardTab!=='logs'||ccAct.cardId!==c.id))ccAct=null;
  if(ccCtlForm&&ccCtlForm.inPanel&&(ccCardTab!=='controls'||ccCtlForm.id!==c.id))ccCtlForm=null;
  if(ccLoadForm&&ccLoadForm.inPanel&&(ccCardTab!=='loads'||ccLoadForm.cardId!==c.id))ccLoadForm=null;
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(ccMask(c.last4)),meta:[expKey(c),ccE(ccHolderName(c))],status:axBadge(statusTone(c.status),c.status)});
  let body;
  if(ccCardTab==='controls')body=hero+ccCardControlsViewHTML(c);
  else if(ccCardTab==='wallets')body=hero+ccCardWalletTabHTML(c);
  else if(ccCardTab==='loads')body=hero+ccCardLoadsHTML(c);
  else if(ccCardTab==='transactions')body=hero+ccCardTxnsHTML(c);
  else if(ccCardTab==='clearance')body=hero+ccClearanceHTML(c);
  else if(ccCardTab==='logs')body=ccCardLogsHTML(c,c.logs);
  else if(ccCardTab==='history')body=sbHistoryHTML(c);
  else body=hero+ccCardBasicHTML(c);
  return axTabBar('ccd',tabs,ccCardTab,'ccCardNav','ccCardClose')+'<div class="lp-isb-body">'+body+'</div>';
}
/* The actions this person may take on this card now. The engine checks each again.
   A move either opens that action's form ({label, act, x, id}: the same form, rules and approvals as before) or acts
   at once ({label, run:'remind'|'verify', id}). Evidence waiting for a second person adds Verify / Reject moves
   (awaiting:true). In the card's Logs tab the moves are the "Select action" list (product owner, 10 Nov 2026). */
function ccCardMoves(c){
  const A=ccNow(),out=[],id=c.id,pend=function(a){return !!c.pending&&c.pending.action===a;};
  const add=function(label,act,x,pr){out.push({label:label,act:act,x:x||'',id:id,primary:!!pr});};
  const now=function(label,run,rid,pr){out.push({label:label,run:run,id:rid,primary:!!pr});};
  if(ccCan('card.enrollment.manage')){
    if(c.status==='Issuance Pending')add('Record Issuance','outcome','issuance',true);
    if(c.type==='Physical'&&c.status==='Issued')add('Record Delivery','outcome','dispatch',true);
    if(c.status==='Activation Pending'){add('Record Activation','outcome','activation',true);now('Send Activation Reminder','remind',id);}
  }
  if(ccCan('card.lifecycle.manage')&&!ccCardEnded(c)){
    if(c.status==='Active'&&!pend('Suspend'))add('Suspend','request','Suspend');
    if(c.status==='Suspended'&&!pend('Reactivate')&&!(c.hold&&c.hold.active&&c.hold.type!=='Temporary'))add('Reactivate','request','Reactivate');
    if(ccCanMove(c,'Blocked')&&!pend('Block'))add('Block','request','Block');
    if(ccCanMove(c,'Closed')&&!pend('Close'))add('Close','request','Close');
    if(c.status!=='Issuance Pending')add('Record Provider Status','outcome','lifecycle');
    if(c.pending)add('Withdraw Request','cancel-pending');
  }
  if(!ccCardEnded(c)&&ccSafetyMay(A,c)){
    if(!(c.hold&&c.hold.active&&c.hold.type!=='Temporary'))add('Report Lost or Stolen','lost');
    if(!(c.hold&&c.hold.active))add('Place Temporary Hold','hold');
  }
  if(c.hold&&c.hold.active&&c.hold.type==='Temporary'){
    if(ccCan('card.lifecycle.manage')){add('Release Hold','release');if(c.hold.releaseRequest)add('Keep Hold','keep');}
    else if(!c.hold.releaseRequest&&ccSafetyMay(A,c))add('Request Hold Release','release-request');
  }
  {const me=ccEmpOf();if(c.status==='Activation Pending'&&!ccCan('card.enrollment.manage')&&me&&me.eid===c.employeeEid)now('Send Me an Activation Reminder','remind',id);}
  if(['Not Issued','Issuance Pending','Replaced','Closed'].indexOf(c.status)<0&&!ccOpenReplacementOf(c.id)&&!ccRepMayRaise(A,c))add('Request Replacement','replace');
  /* An open dispute on one of the card's payments: Mark Dispute as Resolved (product owner, 11 Nov 2026), for those who may
     manage disputes - never the cardholder. One entry per dispute when there are several. */
  if(typeof ccCardOpenDisputes==='function'){const ds=ccCardOpenDisputes(c).filter(function(d){return !ccDspMayManage(A,d);});
    const CL={'Resolved':['Mark Dispute as Resolved','dspresolve'],'Request Information':['Request Dispute Information','dspinfo'],'Assign to Me':['Assign Dispute to Me','dspassign'],
      'Reassign':['Reassign Dispute','dspreassign'],'Withdraw':['Withdraw Dispute','dspwithdraw'],'Internal Note':['Dispute Internal Note','dspnote']};
    ds.forEach(function(d){ccTxnDspMoves(d).forEach(function(k){const m=CL[k];if(m)now(m[0]+(ds.length>1?' · '+expKey(d):''),m[1],d.id);});});}
  const realA=caVia(A)||A.who;
  ccOutcomesAwaiting(c).forEach(function(o){
    const def=CC_OUTCOMES[o.type],mine=o.recordedBy===A.who||(o.actual||o.recordedBy)===realA;if(!ccCan(def.perm)||mine)return;
    const what=def.label.charAt(0).toUpperCase()+def.label.slice(1)+' · '+expKey(o);
    out.push({label:'Verify '+what,run:'verify',id:o.id,primary:true,awaiting:true});
    out.push({label:'Reject '+what,act:'reject',x:'',id:o.id,awaiting:true});
  });
  return out;
}
function ccCardMoveCall(m){return m.run==='remind'?'ccRemindClick('+m.id+')':m.run==='verify'?'ccVerifyClick('+m.id+')':m.run==='dspresolve'?'ccDspResolveClick('+m.id+')':/^dsp/.test(m.run||'')?'ccOpenDisputeUI('+m.id+')':'ccActOpen(\''+m.act+'\','+m.id+(m.x?',\''+m.x+'\'':'')+')';}
/* The same actions as buttons. */
function ccCardActions(c){return ccCardMoves(c).filter(function(m){return !m.awaiting;}).map(function(m){return ccBtn(m.label,ccCardMoveCall(m),m.primary);}).join('');}
/* Outcomes recorded from evidence, waiting for a second person. o.logs: the card's own panel, where Verify and
   Reject are taken from the Logs tab instead of buttons here. */
function ccAwaitingHTML(rec,o){
  o=o||{};
  const list=ccOutcomesAwaiting(rec);if(!list.length)return '';
  const A=ccNow(),realA=caVia(A)||A.who;
  return '<div class="wb-note is-wait"><b>Awaiting verification</b>'+list.map(function(x){
    const def=CC_OUTCOMES[x.type],mine=x.recordedBy===A.who||(x.actual||x.recordedBy)===realA,can=ccCan(def.perm)&&!mine;
    return '<div class="wb-note-sub">'+ccE(expKey(x))+' · '+ccE(def.label)+': <b>'+ccE(x.value)+'</b>'+(x.last4?' ('+ccE(ccMask(x.last4))+')':'')+' · reference '+ccE(x.ref)
      +' · evidence '+ccE(x.evidence)+' · confirmed '+ccE(cdLabel(x.date))+' · recorded by '+ccE(caN(x.recordedBy))+' '+ccE(x.recordedAt)
      +(can?(o.logs?' <span class="wb-muted">Verify or reject it from the Logs tab.</span>'
          :' <span class="ca-actions">'+ccBtn('Verify','ccVerifyClick('+x.id+')',true)+ccBtn('Reject','ccActOpen(\'reject\','+x.id+')')+'</span>')
        :' <span class="wb-muted">'+(mine?'You recorded it; another person verifies it.':'Verified by someone with '+ccE(def.perm)+'.')+'</span>')+'</div>';
  }).join('')+'</div>';
}

/* ── A card's Logs tab: Select action → that action's own fields → Note → Submit (product owner, 10 Nov 2026) ──
   The ADT Logs format (as Leave and Dispute logs). Picking an action starts the same form as before (ccAct, marked
   inLogs so no popup opens) and shows its fields above the note; changing a field redraws them, and the composer
   opens again on the same action. Submit runs the same save, so every rule, approval and log is unchanged. The note
   is that action's reason, details or comments. Used wherever a card's log is shown: the card panel and the
   cardholder's Card Logs / History. */
const CC_LOG_NOTE_AS={request:'reason','cancel-pending':'reason',hold:'reason',release:'reason','release-request':'reason',keep:'reason',reject:'reason',
  lost:'note',outcome:'note',replace:'comments'};
let ccActQuiet=false;
function ccLogAct(id){return ccAct&&ccAct.inLogs&&ccAct.cardId===id?ccAct:null;}
/* The chosen action's own fields, read from its form - one source for both. Left out: the box the note replaces, and
   what the panel already shows (the card and the cardholder). */
function ccLogFieldsHTML(a){
  if(!a||!a.act)return '';
  const tpl=document.createElement('div');tpl.innerHTML=ccActHTML();
  const grid=tpl.querySelector('.ep-form-grid');if(!grid)return '';
  Array.prototype.slice.call(grid.children).forEach(function(g){if(g.querySelector('textarea#cca-reason,#cca-note,#cca-comments,input.ca-ro'))g.remove();});
  if(!grid.children.length)return '';
  grid.style.gridTemplateColumns='1fr';grid.style.marginBottom='4px';
  return grid.outerHTML;
}
function ccCardLogForm(c,moves){
  if(!moves.length)return '';
  const a=ccLogAct(c.id);
  return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+ccE(c.status)+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('ccl-act-'+c.id,c.status,[c.status].concat(moves.map(function(m){return m.label;})),'ccLogActPick')
    +(a&&a.run==='dspreassign'&&ccDsp(a.id)?'<div class="ep-form-grid" style="grid-template-columns:1fr;margin-bottom:4px">'+ccField('Reviewer',true,apCS('ccld-user',ccDspReviewers(ccDsp(a.id)).filter(function(u){return u!==ccDsp(a.id).assignee;}).map(caN),a.user?caN(a.user):'','Select reviewer','ccLogDspUser'))+'</div>':'')
    +ccLogFieldsHTML(a)
    +'<div class="lp-logs-form-label">Note <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="cca-lognote" placeholder="Enter note">'+ccE(a?a.f.logNote||'':'')+'</textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="ccLogActCancel()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="ccLogActSubmit('+c.id+')">Submit</button></div></div>';
}
function ccCardLogsHTML(c,logs){
  const moves=ccCardMoves(c),a=ccLogAct(c.id);
  return lpLogsView(logs,ccCardLogForm(c,moves),{select:true,current:c.status,open:a?a.label:undefined,
    isBack:function(v){return /^(Block|Close|Suspend|Report Lost|Reject|Withdraw|Keep Hold)/.test(v);}});
}
function ccLogActPick(val,csid){
  const id=Number(String(csid||'').replace(/^ccl-act-/,'')),c=ccCard(id);if(!c||!val)return;
  const cur=ccLogAct(id);if(cur&&cur.label===val)return;   // the composer opening again after a redraw
  const m=ccCardMoves(c).find(function(x){return x.label===val;});if(!m)return;
  const ta=document.getElementById('cca-lognote'),note=cur?cur.f.logNote||'':ta?ta.value:'';
  if(m.act){ccActQuiet=true;try{ccActOpen(m.act,m.id,m.x);}finally{ccActQuiet=false;}}
  else ccAct={act:'',id:m.id,x:'',f:{}};
  if(!ccAct)return;
  Object.assign(ccAct,{inLogs:true,cardId:id,label:val,run:m.run||''});ccAct.f.logNote=note;
  if(ccLogFieldsHTML(ccAct)||cur||m.run==='dspreassign')renderADTPage();   // shows (or clears) the action's own fields
}
function ccLogDspUser(){if(!ccAct||!ccAct.inLogs)return;const n=getCSValue('ccld-user'),d=ccDsp(ccAct.id);const u=d?ccDspReviewers(d).find(function(x){return caN(x)===n;}):null;ccAct.user=u||'';}
function ccLogActCancel(){if(ccAct&&ccAct.inLogs){const had=!!ccLogFieldsHTML(ccAct);ccAct=null;if(had)renderADTPage();}}
function ccLogActSubmit(id){
  const a=ccLogAct(id),c=ccCard(id);
  if(!a||!c){showToast('Pick an action','error','Choose what to do from Select action.');return;}
  ccActSync();
  const note=String(a.f.logNote||'').trim().replace(/[.\s]+$/,'');   // the log adds its own full stop
  if(!note){const t=document.getElementById('cca-lognote');if(t)t.classList.add('is-invalid');showToast('Note is required','error','Write a note for this action.');return;}
  if(a.run){
    const A=ccNow(),dr=/^dsp/.test(a.run)?ccDspDoAction(a.run.slice(3),ccDsp(a.id),note,a.user,A):null;
    const e=dr?dr.err:a.run==='remind'?ccActivationRemind(a.id):ccOutcomeVerify(a.id);
    if(e){showToast('Not saved','error',e);return;}
    const done=dr?dr.done:a.run==='remind'?'Reminder sent':expKey(ccOutcome(a.id))+' verified and applied';
    ccLog(c,c.status,a.label+' · note by '+caN(A.who)+': '+note,A);
    ccAct=null;renderADTPage();showToast('Done','success',done+'.');return;
  }
  const k=CC_LOG_NOTE_AS[a.act];if(k)a.f[k]=note;
  ccActSave(true);
}
function ccCardBasicHTML(c){
  const p=ccProg(c.programmeId),e=idEmp(c.employeeEid),r=ccReq(c.requestId),prov=ccProviderName(c.provider);
  const old=c.replacementOf?ccCard(c.replacementOf):null,nw=c.replacedBy?ccCard(c.replacedBy):null,fl=ccHolderFlag(c);
  const link=function(x){return x?'<button class="att-link" onclick="ccCardOpen('+x.id+')">'+ccE(ccCardLabel(x))+'</button>':'—';};
  let notes='';
  if(c.source===CC_DEMO&&!ccCardEnded(c))notes+='<div class="wb-note"><b>'+CC_DEMO+'</b><div class="wb-note-sub">This status is illustrative. No card was issued, activated or changed at '+ccE(prov)+'.</div></div>';
  if(c.status==='Issuance Pending')notes+='<div class="wb-note is-wait"><b>Issuance pending</b><div class="wb-note-sub">The card record exists in ADT and is bound to '+ccE(ccHolderName(c))+'. '+ccE(prov)+' has not issued a card yet.</div></div>';
  if(c.pending)notes+='<div class="wb-note is-wait"><b>'+ccE(c.pending.action)+' requested · awaiting provider confirmation</b><div class="wb-note-sub">By '+ccE(caN(c.pending.by))+' on '+ccE(c.pending.at)+': '+ccE(c.pending.reason)
    +'. ADT has not changed the card at '+ccE(prov)+'; the status changes when the provider confirms it.</div></div>';
  if(c.hold&&c.hold.active)notes+='<div class="wb-note is-bad"><b>'+(c.hold.type==='Temporary'?'Temporary hold in ADT':'Reported '+ccE(c.hold.reason.toLowerCase())+' · on hold in ADT')+'</b><div class="wb-note-sub">Placed by '+ccE(caN(c.hold.by))+' on '+ccE(c.hold.at)
    +(c.hold.type==='Temporary'?' ('+ccE(c.hold.reason)+')':c.hold.note?' ('+ccE(c.hold.note)+')':'')
    +(c.hold.releaseRequest?'. Release requested by '+ccE(caN(c.hold.releaseRequest.by))+' on '+ccE(c.hold.releaseRequest.at)+' ('+ccE(c.hold.releaseRequest.reason)+'): awaiting review by a card administrator':'')+'. No new card loads while it holds. This is an ADT hold, not a block at the bank'
    +(c.hold.type!=='Temporary'?': call '+ccE(prov)+'\'s 24x7 line to block the card there':'')+'.</div></div>';
  if(fl)notes+='<div class="wb-note is-bad"><b>'+ccE(fl)+'</b><div class="wb-note-sub">'+ccE(ccHolderName(c))+'\'s employment is ending or has ended. Card clearance is required (exit clearance).</div></div>';
  /* No action buttons here: a card's actions are taken from its Logs tab (product owner, 10 Nov 2026). */
  return notes+ccAwaitingHTML(c,{logs:true})
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Card Record ID',ccE(expKey(c)))
    +axField(AX_ICO.fUser,'Cardholder',ccE(ccHolderName(c))+' <span class="ax-sub">'+ccE(e?(e.empId||'')+(e.dept?' · '+e.dept:''):'')+'</span>')
    +axField(AX_ICO.fBuild,'Entity',ccE(idEntityName(c.entity)))
    +axField(AX_ICO.fTag,'Card Programme',ccE(p?p.key+' · '+p.name:''))
    +axField(AX_ICO.fBox,'Card Type',ccE(c.type))
    +axField(AX_ICO.fBuild,'Provider',ccE(prov))
    +axField(AX_ICO.fLock,'Card Number',ccE(ccMask(c.last4))+' <span class="ax-sub">last four digits only</span>')
    +axField(AX_ICO.fKey,'Provider Card Reference',ccE(c.providerRef||'—'))
    +(typeof ccCardExtIdFieldHTML==='function'?ccCardExtIdFieldHTML(c):'')
    +axField(AX_ICO.fCash,'Currency',ccE(c.currency))
    +axField(AX_ICO.fCal,'Issue Date',ccE(c.issueDate?cdLabel(c.issueDate):'—'))
    +axField(AX_ICO.fCal,'Expiry','<span class="wb-muted">Not stored in ADT</span>')
    +axField(AX_ICO.fCheck,'Card Status',axBadge(statusTone(c.status),c.status)+' '+ccSrcBadge(c.source))
    +(c.delivery?axField(AX_ICO.fPin,'Delivery',ccE(c.delivery.status)+(c.delivery.ref?' <span class="ax-sub">'+ccE(c.delivery.ref)+'</span>':'')
      +(c.delivery.address?' <span class="ax-sub">'+ccE(c.delivery.address.mode)+(c.delivery.address.text?' - '+ccE(c.delivery.address.text):'')+'</span>':'')):'')
    +(old?axField(AX_ICO.fTicket,'Replacement Of',link(old)):'')
    +(nw?axField(AX_ICO.fTicket,'Replaced By',link(nw)):'')
    +axField(AX_ICO.fTicket,'Card Request',r?'<button class="att-link" onclick="ccOpenReqUI('+r.id+',\'enrollment\')">'+ccE(expKey(r))+'</button>':'—')
    +axField(AX_ICO.fClock,'Cardholder Since',ccE(c.ownerSince))
    +axField(AX_ICO.fClock,'Last Status Change',ccE(c.lastChange?c.lastChange.at+' · '+caN(c.lastChange.by):'—'))
    +'</div>';
}
/* The card's Lifecycle tab was removed (product owner, 11 Nov 2026): every status change, delivery and hold is in its Logs. */
/* The request panel's Enrollment tab (FR-CC-08). */
function ccEnrHTML(r){
  const e=r.enr,p=ccProg(r.programmeId),c=ccCardOfReq(r),man=ccCan('card.enrollment.manage'),prov=ccProviderName(p?p.provider:'');
  let act='';
  if(man){
    if(ccReqTrack(r)==='Enrollment Pending'&&['Pending','Failed'].indexOf(e.status)>=0)act+=ccBtn(e.status==='Failed'?'Resubmit to Provider':'Submit to Provider','ccActOpen(\'enr-submit\','+r.id+')',true);
    if(e.status==='Submitted'&&['Pending','Provider Review'].indexOf(e.kyc)>=0)act+=ccBtn('Record KYC Outcome','ccActOpen(\'outcome\','+r.id+',\'kyc\')',true);
    if(c&&c.status==='Issuance Pending'&&['Verified','Not Required'].indexOf(e.kyc)>=0)act+=ccBtn('Record Issuance','ccActOpen(\'outcome\','+c.id+',\'issuance\')',true);
    if(c&&c.type==='Physical'&&c.status==='Issued')act+=ccBtn('Record Delivery','ccActOpen(\'outcome\','+c.id+',\'dispatch\')',true);
    if(c&&c.status==='Activation Pending')act+=ccBtn('Record Activation','ccActOpen(\'outcome\','+c.id+',\'activation\')',true)+ccBtn('Send Activation Reminder','ccRemindClick('+c.id+')');
    if(['Pending','Submitted','Failed'].indexOf(e.status)>=0)act+=ccBtn('Cancel Enrollment','ccActOpen(\'enr-cancel\','+r.id+')');
  }
  const ev=e.events.slice().reverse().map(function(x,i){return '<tr><td class="sb-hist-n">'+(i+1)+'</td><td class="sb-hist-time">'+ccE(x.at)+'</td><td><b>'+ccE(x.what)+'</b> '+ccE(x.value)+'</td><td>'+ccSrcBadge(x.source)+'</td><td>'+ccE(caN(x.by))+(x.actual?' <span class="ax-sub">through Switch User by '+ccE(caN(x.actual))+'</span>':'')+'</td><td>'+ccE(x.ref||'—')+'</td></tr>';}).join('');
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +'<div class="wb-note"><div class="wb-note-sub">'+ccE(prov)+' is not connected: outcomes are recorded as '+CC_SRC_MANUAL+' evidence'
      +(ccDemoOn()?' or as '+CC_DEMO:'')+'. ADT does not issue or activate cards.</div></div>'
    +ccAwaitingHTML(r)+(c?ccAwaitingHTML(c):'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Enrollment ID',ccE(e.key))
    +axField(AX_ICO.fTicket,'Card Request ID',ccE(expKey(r)))
    +axField(AX_ICO.fUser,'Employee',ccE(r.name)+' <span class="ax-sub">'+ccE(r.empId||'')+'</span>')
    +axField(AX_ICO.fTag,'Card Programme',ccE(p?p.key+' · '+p.name:''))
    +axField(AX_ICO.fCheck,'Enrollment Status',axBadge(statusTone(e.status),e.status)+(e.attempts>1?' <span class="ax-sub">attempt '+e.attempts+'</span>':''))
    +axField(AX_ICO.fShield,'KYC Status',ccE(e.kyc)+(e.kycRef?' <span class="ax-sub">reference '+ccE(e.kycRef)+'</span>':''))
    +axField(AX_ICO.fBox,'Delivery Required',e.deliveryRequired?'Yes (physical card)':'No (virtual card)')
    +(e.deliveryRequired?axField(AX_ICO.fPin,'Delivery Address',ccE(r.delivery?r.delivery.mode+(r.delivery.text?' - '+r.delivery.text:''):'—'))
      +axField(AX_ICO.fPin,'Dispatch Status',ccE(e.delivery||'—')+(e.deliveryRef?' <span class="ax-sub">'+ccE(e.deliveryRef)+'</span>':'')):'')
    +axField(AX_ICO.fCheck,'Activation Status',ccE(e.activation))
    +axField(AX_ICO.fShield,'Confirmation Source',ccSrcBadge(e.source))
    +axField(AX_ICO.fLock,'Card',c?'<button class="att-link" onclick="ccCardOpen('+c.id+')">'+ccE(ccCardLabel(c))+'</button> '+axBadge(statusTone(c.status),c.status):'<span class="wb-muted">No card record until the enrollment is submitted</span>')
    +axField(AX_ICO.fClock,'Submitted',e.submittedAt?ccE(e.submittedAt+' · '+caN(e.submittedBy))+(e.providerRef?' <span class="ax-sub">reference '+ccE(e.providerRef)+'</span>':''):'—')
    +'</div>'
    +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Enrollment Events</span></div>'
    +(ev?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>S. No</th><th>Time</th><th>Event</th><th>Source</th><th>By</th><th>Reference</th></tr></thead><tbody>'+ev+'</tbody></table></div>'
      :'<div class="lp-wf-empty">Nothing recorded yet. Submit the enrollment to the provider to start.</div>');
}

/* ── The lifecycle action popup ────────────────────────────────────────── */
function ccActOpen(act,id,x){
  const blank={value:'',source:'',ref:'',evidence:'',date:wbToday(),last4:'',note:'',reason:'',purpose:'',cardType:'',deliveryMode:'',deliveryText:'',comments:''};
  ccAct={act:act,id:Number(id),x:x||'',f:blank};
  if(act==='outcome'){
    const demo=ccDemoOn()&&ccCan('card.demo.simulate');
    blank.source=demo?'':CC_SRC_MANUAL;
    if(x==='issuance')blank.value='Issued';
    if(x==='activation')blank.value='Confirmed';
  }
  if(act==='replace'){const c=ccCard(id);blank.cardType=c?c.type:'';}
  if(!ccActQuiet)renderADTPage();   // quiet: started from a card's Logs tab, which draws the fields itself
}
function ccActClose(){ccAct=null;renderADTPage();}
function ccActSync(){
  if(!ccAct)return;
  const f=ccAct.f,cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  let v;
  [['value','cca-value'],['source','cca-source'],['reason','cca-reason'],['cardType','cca-type'],['deliveryMode','cca-deliv']].forEach(function(p){if((v=cs(p[1]))!=null)f[p[0]]=v;});
  [['ref','cca-ref'],['evidence','cca-evidence'],['last4','cca-last4'],['note','cca-note'],['purpose','cca-purpose'],['deliveryText','cca-dtext'],['comments','cca-comments'],['date','cca-date'],['logNote','cca-lognote']]
    .forEach(function(p){if((v=ccVal(p[1]))!=null)f[p[0]]=v;});
  if(ccAct.act!=='lost'&&ccAct.act!=='replace'&&(v=ccVal('cca-reason'))!=null)f.reason=v;
}
function ccActHook(){ccActSync();renderADTPage();}
function ccActEvidence(input){const fl=input.files&&input.files[0];input.value='';if(!fl)return;if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}ccActSync();ccAct.f.evidence=fl.name;renderADTPage();}
function ccActReason(label,ph){return ccField(label,true,ccArea('cca-reason',ccAct.f.reason,ph||''),'',true);}
function ccActHTML(){
  const a=ccAct,f=a.f,close={close:'ccActClose()'},btn=function(l,call){return '<button class="ep-save-btn" onclick="'+(call||'ccActSave()')+'">'+l+'</button>';};
  if(a.act==='outcome'){
    const def=CC_OUTCOMES[a.x],rec=a.x==='kyc'?ccReq(a.id):ccCard(a.id),prov=ccProviderName(a.x==='kyc'?(ccProg(rec.programmeId)||{}).provider:rec.provider);
    const demo=ccDemoOn()&&ccCan('card.demo.simulate'),srcs=[CC_SRC_MANUAL].concat(demo?[CC_DEMO]:[]);
    const vals=def.values.filter(function(v){return !ccOutcomeCheck(a.x,a.id,v,{last4:'0000'})||v===f.value;});
    const body='<div class="ep-form-grid">'
      +ccField('Outcome',true,apCS('cca-value',vals,f.value,'Select','ccActHook'))
      +ccField('Confirmation Source',true,apCS('cca-source',srcs,f.source,'Select','ccActHook'),CC_SRC_PROVIDER+' comes only from a connected provider; '+ccE(prov)+' is not connected.')
      +(a.x==='issuance'&&f.value==='Issued'?ccField('Last Four Digits',true,'<input class="ep-form-input" id="cca-last4" maxlength="4" inputmode="numeric" value="'+attrSafe(f.last4)+'" placeholder="1234">','Never the full card number, CVV or PIN.'):'')
      +(f.source===CC_SRC_MANUAL?ccField('Provider Reference',true,ccInput('cca-ref',f.ref,'Reference on the provider\'s confirmation'),'Shown masked: last four characters only.')
        +ccField('Confirmed On',true,apCD('cca-date',f.date,'Select date'))
        +ccField('Provider Evidence',true,(f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>'
          :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccActEvidence(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · provider email, portal screen or letter</span></span></label>'),'',true):'')
      +(f.source===CC_DEMO?'<div class="ep-form-group ep-form-full"><div class="wb-note"><b>'+CC_DEMO+'</b><div class="wb-note-sub">Applied at once and labelled as illustrative everywhere. Nothing happens at '+ccE(prov)+'.</div></div></div>':'')
      +ccField('Note',false,ccArea('cca-note',f.note,''),'',true)+'</div>';
    return bgModal('Record '+def.label.replace(/[a-z]/g,function(x){return x.toUpperCase();})+' · '+expKey(rec),f.source===CC_SRC_MANUAL?'Recorded from the provider\'s evidence. It takes effect when another person verifies it.':'',body,
      {close:close.close,btns:btn(f.source===CC_DEMO?'Record Illustrative Event':'Record for Verification')});
  }
  if(a.act==='lost'){
    const c=ccCard(a.id),prov=ccProviderName(c.provider);
    return bgModal('Report Lost or Stolen · '+ccCardLabel(c),'The card goes on hold in ADT at once and a block is requested from '+ccE(prov)+'. Call '+ccE(prov)+'\'s 24x7 helpline now as well: ADT cannot block a card at the bank.',
      '<div class="ep-form-grid">'+ccField('What Happened',true,apCS('cca-reason',CC_LOST_REASONS,f.reason,'Select'))+ccField('Details',false,ccArea('cca-note',f.note,'When and where, if known'),'',true)+'</div>',
      {close:close.close,btns:btn('Report')});
  }
  if(a.act==='replace'){
    const c=ccCard(a.id),p=ccProg(c.programmeId);
    const body='<div class="ep-form-grid">'
      +ccField('Card Being Replaced',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(ccCardLabel(c)+' · '+c.status)+'">')
      +ccField('Cardholder',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(ccHolderName(c))+'">')
      +ccField('Reason',true,apCS('cca-reason',CC_REPL_REASONS,f.reason,'Select','ccActHook'))
      +ccField('Details',f.reason==='Other',ccInput('cca-purpose',f.purpose,'Why the card is replaced'))
      +ccField('New Card Type',true,apCS('cca-type',p?p.forms:[],f.cardType,'Select','ccActHook'))
      +(f.cardType==='Physical'?ccField('Delivery Address',true,apCS('cca-deliv',CC_DELIVERY,f.deliveryMode,'Select','ccActHook'))
        +(f.deliveryMode==='Other address'?ccField('Other Address',true,ccArea('cca-dtext',f.deliveryText,'Full address with PIN code'),'',true):''):'')
      +ccField('Additional Comments',false,ccArea('cca-comments',f.comments,''),'',true)+'</div>';
    return bgModal('Request Replacement · '+ccCardLabel(c),'A replacement is approved on the Card Replacement route. The current card is unchanged until the new card is issued; its history and references are kept.',body,
      {close:close.close,btns:'<button class="ep-cancel-btn" onclick="ccActSave(false)">Save Draft</button>'+btn('Submit','ccActSave(true)')});
  }
  if(a.act==='cl-return'){const c=ccCard(a.id);
    return bgModal('Record Card Return · '+ccCardLabel(c),'The physical card was handed back. Closure at the provider is tracked separately.',
      '<div class="ep-form-grid">'+ccField('Returned On',true,apCD('cca-date',f.date,'Select date'))+ccField('Received By · Condition',true,ccArea('cca-note',f.note,'e.g. Received by HR; card cut through the chip'),'',true)+'</div>',
      {close:close.close,btns:btn('Record Return')});}
  const t={'enr-submit':['Submit Enrollment to Provider · '+expKey(ccReq(a.id)||{}),'Records that this enrollment was sent to the provider. The card record is created as Issuance Pending; no card exists until the provider confirms issuance.','Submit'],
    'enr-cancel':['Cancel Enrollment · '+expKey(ccReq(a.id)||{}),'The request ends as Cancelled. A card record still Issuance Pending ends as Not Issued.','Cancel Enrollment'],
    'request':[a.x+' Card · '+ccCardLabel(ccCard(a.id)),'ADT records the request; the card changes only when the provider confirms it. ADT does not change the card at the bank.',a.x==='Close'?'Request Closure':'Request '+a.x],
    'cancel-pending':['Withdraw Request · '+ccCardLabel(ccCard(a.id)),'The pending request to the provider is withdrawn in ADT.','Withdraw'],
    'hold':['Place Temporary Hold · '+ccCardLabel(ccCard(a.id)),'An ADT hold stops new card loads at once. It is not a freeze at the bank; a card administrator can ask the provider to suspend the card.','Place Hold'],
    'release':['Release Hold · '+ccCardLabel(ccCard(a.id)),'An authorized review ends the temporary hold; new loads are possible again.','Release'],
    'release-request':['Request Hold Release · '+ccCardLabel(ccCard(a.id)),'The hold stays until a card administrator reviews the request.','Request Release'],
    'keep':['Keep Hold · '+ccCardLabel(ccCard(a.id)),'The release request is declined and the hold stays. The requester is told why.','Keep Hold'],
    'reject':['Reject Evidence · '+expKey(ccOutcome(a.id)||{}),'The outcome is not applied; nothing changes on the card or the enrollment.','Reject'],
    'cl-confirm':['Confirm Exit Clearance · '+ccCardLabel(ccCard(a.id)),'Every requirement is met. The card and all its history are kept.','Confirm Clearance'],
    'cl-exception':['Exit Clearance Exception · '+ccCardLabel(ccCard(a.id)),'Closes the clearance; whatever is still open is recorded with your name and the reason.','Record Exception']}[a.act];
  if(!t)return '';
  const body='<div class="ep-form-grid">'+(a.act==='enr-submit'?ccField('Provider Enrollment Reference',false,ccInput('cca-ref',f.ref,'If the provider gave one'),'Shown masked.')+ccField('Note',false,ccArea('cca-note',f.note,''),'',true)
    :ccActReason('Reason'))+'</div>';
  return bgModal(t[0],t[1],body,{close:close.close,btns:btn(t[2])});
}
function ccActSave(submit){
  ccActSync();const a=ccAct;if(!a)return;const f=a.f;
  let err='',ok='',res;
  if(a.act==='outcome'){res=ccOutcomeRecord(a.x,a.id,f);err=res.error||'';
    if(!err)ok=res.rec.status==='Applied'?CC_OUTCOMES[a.x].label+' recorded ('+CC_DEMO+')':expKey(res.rec)+' recorded; another person verifies it';}
  else if(a.act==='enr-submit'){err=ccEnrSubmit(a.id,f);if(!err)ok='Enrollment submitted to the provider; card record '+expKey(ccCardOfReq(ccReq(a.id)))+' is Issuance Pending';}
  else if(a.act==='enr-cancel'){err=ccEnrCancel(a.id,f.reason);ok='Enrollment cancelled';}
  else if(a.act==='request'){err=ccCardRequest(a.id,a.x,f.reason);ok=a.x+' requested; pending provider confirmation';}
  else if(a.act==='cancel-pending'){err=ccCardCancelPending(a.id,f.reason);ok='Request withdrawn';}
  else if(a.act==='hold'){err=ccHoldPlace(a.id,f.reason);ok='Card on hold in ADT';}
  else if(a.act==='release'){err=ccHoldRelease(a.id,f.reason);ok='Hold released after review';}
  else if(a.act==='release-request'){err=ccHoldReleaseRequest(a.id,f.reason);ok='Release requested; a card administrator reviews it';}
  else if(a.act==='keep'){err=ccHoldKeep(a.id,f.reason);ok='The hold stays';}
  else if(a.act==='lost'){err=ccReportLost(a.id,{reason:f.reason,note:f.note});const c=ccCard(a.id);ok='Card on hold in ADT; block requested. Call '+ccProviderName(c.provider)+'\'s 24x7 line too';}
  else if(a.act==='reject'){err=ccOutcomeReject(a.id,f.reason);ok='Evidence rejected';}
  else if(a.act==='cl-return'){err=ccClearanceReturn(a.id,{date:f.date,note:f.note});ok='Card return recorded';}
  else if(a.act==='cl-confirm'){err=ccClearanceConfirm(a.id,f.reason);ok='Exit card clearance confirmed';}
  else if(a.act==='cl-exception'){err=ccClearanceException(a.id,f.reason);ok='Exit card clearance closed by exception';}
  else if(a.act==='replace'){res=ccRepCreate({cardId:a.id,reason:f.reason,purpose:f.purpose,cardType:f.cardType,deliveryMode:f.deliveryMode,deliveryText:f.deliveryText,comments:f.comments},submit);
    err=res.error||'';if(!err){const st=caActiveStage(res.rec);ok=expKey(res.rec)+(submit?' submitted'+(st?' to Stage '+st.n+' · '+caNs(st.approvers):''):' saved as a draft');}}
  if(err){showToast('Not saved','error',err);return;}
  ccAct=null;renderADTPage();showToast('Done','success',ok+'.');
}
function ccRemindClick(id){const e=ccActivationRemind(id);if(e){showToast('Not sent','error',e);return;}renderADTPage();showToast('Reminder sent','success','The cardholder was reminded to activate the card.');}
function ccVerifyClick(id){const e=ccOutcomeVerify(id);if(e){showToast('Not verified','error',e);return;}renderADTPage();showToast('Verified','success',expKey(ccOutcome(id))+' is applied.');}


/* ══ 7D · Controls tab, the change form, and a card's Controls view ════════════════════════════════
   Controls tab: programme defaults and card restrictions in one listing; the panel shows the controls
   in force (programme, card, and the stricter result), the wallets, every version with its before and
   after, and the logs. The card panel gains a Controls tab for anyone who sees the card - the
   cardholder included - with the wallet breakup and a demo transaction test. */
let ccCtlSel=null,ccCtlTab='controls',ccCtlForm=null;
if(CA_WF_INFO['Card Programme Control'])CA_WF_INFO['Card Programme Control'].hint='Relaxing a programme\'s default card controls.';
Object.assign(CA_TYPE_LABEL,{'card control change':'Card Control Change','card programme control':'Card Programme Control'});
function ccChecksH(prefix,opts,sel,hook,off){
  return '<div class="cc-checks">'+opts.map(function(o){return '<label class="onc-decl cc-check"><input type="checkbox" id="'+prefix+o+'"'+(sel.indexOf(o)>=0?' checked':'')
    +(off&&off.indexOf(o)>=0?' disabled':'')+' onchange="'+hook+'()"><span>'+ccE(o)+'</span></label>';}).join('')+'</div>';
}
function ccListTxt(a,none){return !a||!a.length?none:a[0]===CC_NONE?'None':a.join(', ');}
const CC_CTL_FIELDS=[['Allowed Categories',function(s){return ccListTxt(s.allowedCats,'All categories');}],['Blocked Categories',function(s){return ccListTxt(s.blockedCats,'None');}],
  ['Per Transaction',function(s,c){return ccAmt(s.perTxn,c);}],['Daily',function(s,c){return ccAmt(s.daily,c);}],['Monthly',function(s,c){return ccAmt(s.monthly,c);}],['Annual',function(s,c){return ccAmt(s.annual,c);}],
  ['Channels',function(s){return CC_CHANNELS.filter(function(ch){return s.channels[ch];}).join(', ')||'None';}],['International',function(s){return s.international==='Restrict'?'Restricted':'Allowed';}],
  ['Merchant Codes Allowed',function(s){return ccListTxt(s.mccAllow,'Any');}],['Merchant Codes Blocked',function(s){return ccListTxt(s.mccBlock,'None');}],
  ['Countries Allowed',function(s){return ccListTxt(s.countryAllow,'Any');}],['Countries Blocked',function(s){return ccListTxt(s.countryBlock,'None');}]];
function ccCtlSummary(s,cur){if(!s)return 'Not set';return 'Per transaction '+ccAmt(s.perTxn,cur)+' · monthly '+ccAmt(s.monthly,cur)+' · '+(CC_CHANNELS.filter(function(ch){return s.channels[ch];}).join('/')||'no channel')+' · international '+(s.international==='Restrict'?'restricted':'allowed');}
/* Before → after, field by field (FR-CC-22.03). */
function ccCtlDiff(a,b,cur){
  return CC_CTL_FIELDS.map(function(f){const x=a?f[1](a,cur):'Not set',y=b?f[1](b,cur):'Not set';return x===y?null:{field:f[0],old:x,val:y};}).filter(Boolean);
}
function ccCtlTableHTML(cols,cur){
  return '<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-ctl-table"><thead><tr><th>Control</th>'+cols.map(function(c){return '<th>'+ccE(c.head)+'</th>';}).join('')+'</tr></thead><tbody>'
    +CC_CTL_FIELDS.map(function(f){return '<tr><td><b>'+ccE(f[0])+'</b></td>'+cols.map(function(c){return '<td>'+(c.set?ccE(f[1](c.set,cur)):'<span class="wb-muted">'+ccE(c.empty||'Not set')+'</span>')+'</td>';}).join('')+'</tr>';}).join('')
    +'</tbody></table></div>';
}
function ccEnfBadge(p){const e=ccCtlEnforcement(p);return '<span class="lp-status-badge tone-'+(e==='Pending'?'wait':'idle')+'">Provider enforcement: '+ccE(e)+'</span>';}
function ccCtlTargets(){
  const out=ccProgs().map(function(p){return {scope:'programme',id:p.id,t:p};});
  ccCards.filter(function(c){return c.entity===ccEnt()&&ccSeesEmp(c.employeeEid)&&!ccCardEnded(c);}).forEach(function(c){out.push({scope:'card',id:c.id,t:c});});
  return out;
}
function ccControlsHTML(){
  const rows=ccCtlTargets();
  if(ccCtlSel&&!rows.some(function(x){return x.scope===ccCtlSel.scope&&x.id===ccCtlSel.id;}))ccCtlSel=null;
  const body=rows.map(function(x,i){
    const prog=x.scope==='programme'?x.t:ccProg(x.t.programmeId),s=x.scope==='programme'?ccProgCtl(prog):ccCardCtl(x.t),cur=prog?prog.currency:'INR';
    const own=x.scope==='card'?ccCtlCurrentVer('card',x.id):ccCtlCurrentVer('programme',x.id),pend=ccCtlPendingOf(x.scope,x.id),on=ccCtlSel&&ccCtlSel.scope===x.scope&&ccCtlSel.id===x.id;
    return '<tr class="cct-row'+(on?' lp-row-selected':'')+'" style="cursor:pointer" onclick="ccCtlOpen(\''+x.scope+'\','+x.id+')"><td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc">'+ccE(x.scope==='programme'?prog.name:ccMask(x.t.last4)+' · '+ccHolderName(x.t))+'</div><div class="lp-c-sub">'+ccE(x.scope==='programme'?prog.key+' · '+prog.code:expKey(x.t)+' · '+(prog?prog.key:''))+'</div></td>'
      +'<td><div class="lp-c-plain">'+(x.scope==='programme'?'Programme defaults':'Card restrictions')+'</div><div class="lp-c-sub">'+(own?'v'+own.n+' in effect':x.scope==='card'?'programme defaults only':'not set')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(s?ccAmt(s.perTxn,cur):'Not set')+'</div><div class="lp-c-sub">monthly '+ccE(s?ccAmt(s.monthly,cur):'—')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(s?CC_CHANNELS.filter(function(ch){return s.channels[ch];}).join(', ')||'None':'—')+'</div><div class="lp-c-sub">'+ccE(s?'international '+(s.international==='Restrict'?'restricted':'allowed'):'')+'</div></td>'
      +'<td>'+(pend?'<span class="lp-status-badge tone-wait">'+ccE(expKey(pend))+' awaiting approval</span>':axBadge('idle',ccCtlEnforcement(prog)))+'</td></tr>';
  }).join('')||ccEmpty(6,'No card programme yet. Programmes are set up in Corporate Cards → Card Setup.');
  return '<div class="lp-page">'+dashboardBackHTML()
    +'<div class="wb-note">A card is never looser than its programme. Tightening applies at once; a relaxation needs approval. '
      +'No provider is connected, so these are the <b>intended</b> controls, not enforcement at the payment network. Expense Capping Limits and Budgets keep applying on their own.</div>'
    +ccSplit('cct','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Applies To</th><th>Level</th><th>Per Transaction</th><th>Channels</th><th>Status</th></tr></thead><tbody>'+body+'</tbody></table>',
      !!ccCtlSel,renderCctSidebar)
    +'</div>'+(ccCtlForm&&!ccCtlForm.inPanel?ccCtlFormHTML():'');
}
function ccCtlOpen(scope,id,tab){ccCtlSel={scope:scope,id:Number(id)};ccCtlTab=tab||'controls';renderADTPage();}
function ccCtlClose(){ccCtlSel=null;const sb=document.getElementById('cct-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.cct-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccCtlNav(t){ccCtlTab=t;isbTab('cct',renderCctSidebar);}
/* The engine's "open the record" for a control change: the Controls tab where the person has it, else the card's own Controls view. */
function ccOpenCtlUI(id){
  const r=ccCtlChange(id);if(!r)return;
  ccCloseForms();
  if(ccPageTabs().some(function(t){return t.id==='controls';})){ccPageTab='controls';ccCtlSel={scope:r.scope,id:r.targetId};ccCtlTab='versions';if(page!=='cards')navigatePage('cards');else renderADTPage();return;}
  if(r.scope==='card'&&ccCardVisible(ccCard(r.targetId))){ccOpenCardUI(r.targetId,'controls');return;}
  showToast('Not available','error','This control change is outside your access.');
}
function ccCtlPendingNote(scope,id){
  const r=ccCtlPendingOf(scope,id);if(!r)return '';const st=caActiveStage(r);
  return '<div class="wb-note is-wait"><b>'+ccE(expKey(r))+' · relaxation awaiting approval</b><div class="wb-note-sub">'+ccE(r.relax.join('; '))+'. Requested by '+ccE(caN(r.createdBy))+': '+ccE(r.reason)
    +(st?'. Stage '+st.n+' · '+ccE(caNs(st.approvers)||'assignment exception'):'')+'. The current controls stay in force until it is approved.</div></div>';
}
function renderCctSidebar(){
  const sel=ccCtlSel;if(!sel)return '';
  const t=ccCtlTarget(sel.scope,sel.id);
  if(!t||t.entity!==ccEnt()||(sel.scope==='card'&&!ccCardVisible(t)))return '<div class="lp-isb-body"><div class="wb-empty-sm">Not available to you.</div></div>';
  const prog=sel.scope==='programme'?t:ccProg(t.programmeId),cur=prog.currency;
  const tabs=[{id:'controls',label:'Controls'},{id:'wallets',label:'Wallets'},{id:'versions',label:'Versions'},{id:'logs',label:'Logs'}];
  if(!tabs.some(function(x){return x.id===ccCtlTab;}))ccCtlTab='controls';
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(sel.scope==='programme'?prog.name:ccMask(t.last4)),meta:sel.scope==='programme'?[prog.key,'Programme defaults']:[expKey(t),ccE(ccHolderName(t))],
    status:ccEnfBadge(prog)});
  let body;
  if(ccCtlTab==='wallets')body=hero+(sel.scope==='programme'?ccProgWalletsHTML(prog):ccCardWalletsHTML(t));
  else if(ccCtlTab==='versions')body=hero+ccCtlVersionsHTML(sel.scope,t,cur);
  else if(ccCtlTab==='logs')body=lpLogsView(t.logs||[],'');
  else{
    const can=ccCan('card.control.manage')&&!ccCtlPendingOf(sel.scope,t.id)&&!(sel.scope==='card'&&ccCardEnded(t));
    body=hero+(can?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+ccBtn('Change Controls','ccCtlFormOpen(\''+sel.scope+'\','+t.id+')',true)+'</span></div>':'')
      +ccCtlPendingNote(sel.scope,t.id)+'<div class="wb-note"><div class="wb-note-sub">'+ccE(ccCtlEnfNote(prog))+'</div></div>'
      +(sel.scope==='programme'?ccCtlTableHTML([{head:'In Effect',set:ccProgCtl(prog),empty:'Not set: no programme controls recorded'}],cur)
        :ccCtlTableHTML([{head:'Programme',set:ccProgCtl(prog)},{head:'This Card',set:ccCardOwnCtl(t),empty:'As programme'},{head:'In Effect (stricter)',set:ccCardCtl(t)}],cur));
  }
  return axTabBar('cct',tabs,ccCtlTab,'ccCtlNav','ccCtlClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function ccCtlVersionsHTML(scope,t,cur){
  const vs=ccCtlVersOf(scope,t.id).slice().reverse();
  if(!vs.length)return '<div class="lp-wf-empty">No controls recorded yet.</div>';
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Control Versions</span><span class="ax-count">'+vs.length+'</span></div>'
    +vs.map(function(v){
      const st=ccCtlVerState(v),r=v.changeId?ccCtlChange(v.changeId):null,diff=ccCtlDiff(v.before,v.after,cur);
      return '<div class="cc-ver"><div class="cc-ver-head"><b>v'+v.n+'</b> '+axBadge(statusTone(st),st)+' <span class="wb-muted">'+ccE(cdLabel(v.effFrom))+(v.effTo?' to '+ccE(cdLabel(v.effTo)):' onwards')
        +' · '+ccE(caN(v.createdBy))+(v.actual?' (through Switch User by '+ccE(caN(v.actual))+')':'')+' · '+ccE(v.createdAt)+(r?' · '+ccE(expKey(r)):'')+'</span></div>'
        +'<div class="wb-note-sub">'+ccE(v.reason)+(v.relax.length?' · <b>Relaxes:</b> '+ccE(v.relax.join('; ')):' · stricter or unchanged')+'</div>'
        +(diff.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>'
          +diff.map(function(d){return '<tr><td><b>'+ccE(d.field)+'</b></td><td class="sb-hist-old">'+ccE(d.old)+'</td><td class="sb-hist-new">'+ccE(d.val)+'</td></tr>';}).join('')+'</tbody></table></div>':'')
        +'</div>';
    }).join('');
}
function ccProgWalletsHTML(p){
  const ws=ccWalletMap(p);
  return '<div class="wb-note"><div class="wb-note-sub">Wallets are Wallet &amp; Benefits wallet types. A wallet here is a category, not a balance at the bank.</div></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Wallet</th><th>Class</th><th>Benefit Categories</th><th>Funded By</th></tr></thead><tbody>'
    +ws.map(function(w){return '<tr><td><b>'+ccE(w.name)+'</b> <span class="ax-sub">'+ccE(w.code)+'</span></td><td>'+ccE(w.cls)+'</td><td>'+ccE(w.cats.map(function(c){return c.name;}).join(', ')||'—')+'</td>'
      +'<td>'+(w.benefit?'Employee entitlement (Wallet &amp; Benefits)':'Corporate funding (Funding &amp; Budgets)')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
/* The cardholder's wallet breakup (FR-CC-11.09-10): planned entitlement, never an available balance. */
function ccCardWalletsHTML(c){
  const per=wbToday().slice(0,7),ws=ccWalletEntitlements(c,per);
  return '<div class="wb-note"><div class="wb-note-sub">Planned entitlement for '+ccE(wbPeriodLabel(per))+' from Wallet &amp; Benefits. It is <b>not</b> money on the card: loads are recorded separately, and no live balance is shown because '
      +ccE(ccProviderName(c.provider))+' is not connected.</div></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Wallet</th><th>Basis</th><th>Planned This Month</th><th>Status</th></tr></thead><tbody>'
    +ws.map(function(w){
      if(w.kind==='corporate')return '<tr><td><b>'+ccE(w.name)+'</b></td><td>Corporate funding</td><td>—</td><td>Loaded only by authorized card loads</td></tr>';
      const why=!w.rows.length?'No entitlement in Wallet & Benefits':w.eligible?'Planned · not loaded':(w.rows[0].elig&&w.rows[0].elig.why)||w.rows[0].state;
      return '<tr><td><b>'+ccE(w.name)+'</b></td><td>'+ccE(w.cats.map(function(x){return x.name;}).join(', ')||'—')+'</td><td>'+(w.eligible?ccE(wbMoney(w.planned)):'—')+'</td><td>'+ccE(why)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
/* The card panel's Controls tab (cardholder included; product owner, 11 Nov 2026): only the rules that restrict the card,
   each with the stricter value in effect and who set it; one line when nothing is set. Change Card Controls opens its
   form in this tab (ccCtlInlineHTML), with the same checks, approvals and versions as before. */
function ccCardControlsViewHTML(c){
  if(ccCtlForm&&ccCtlForm.inPanel&&ccCtlForm.scope==='card'&&ccCtlForm.id===c.id)return ccCtlInlineHTML();
  const p=ccProg(c.programmeId),cur=p.currency;
  const can=ccCan('card.control.manage')&&!ccCtlPendingOf('card',c.id)&&!ccCardEnded(c)&&ccPageTabs().some(function(t){return t.id==='controls';});
  const eff=ccCardCtl(c),own=ccCardOwnCtl(c),ps=ccProgCtl(p),blank=ccCtlBlank();
  const rows=eff?CC_CTL_FIELDS.filter(function(f){return f[1](eff,cur)!==f[1](blank,cur);}).map(function(f){
    /* Set By: the programme when its rule is the one in effect, this card when the card's own rule is, both when the two
       combine (for example the programme's blocked merchant codes and the card's own). */
    const v=f[1](eff,cur),pv=ps?f[1](ps,cur):null,by=pv===v?'Programme':own&&f[1](own,cur)===v?'This card':'Programme + This card';
    return '<tr><td><b>'+ccE(f[0])+'</b></td><td>'+ccE(v)+'</td><td>'+by+'</td></tr>';}):[];
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Controls</span>'
      +(can?'<span class="ca-actions">'+ccBtn('Change Card Controls','ccCtlFormOpen(\'card\','+c.id+')',true)+'</span>':'<span class="ax-count">'+rows.length+' set</span>')+'</div>'
    +ccCtlPendingNote('card',c.id)
    +(rows.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Control</th><th>In Effect</th><th>Set By</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No controls are set. The card follows the programme, which has no limits.</div>');
}
/* The card panel's Wallets tab (product owner, 11 Nov 2026): Benefit Wallets (this month's entitlement from Wallet &
   Benefits) and Company Wallets, each with this card's own loaded, spent and available amounts from the wallet ledger.
   The wallet breakup lives here only; the loads and payments behind the figures are in the Loads and Transactions tabs. */
function ccCardWalletTabHTML(c){
  const ws=ccWalletEntitlements(c,wbToday().slice(0,7)),ended=ccCardEnded(c);
  const by=typeof emsLedgerWallets==='function'?emsLedgerWallets(c.employeeEid,c.id):{};
  const rows=ws.map(function(w){return {code:w.code,name:w.name,w:w};});
  Object.keys(by).forEach(function(k){if(!rows.some(function(r){return r.code===k;}))rows.push({code:k,name:wbTypeName(k),w:null});});
  if(!rows.length)return '<div class="wb-empty-sm">No wallet on this card.</div>';
  const m=function(n){return ccE(expMoney(n||0,c.currency));},zero={loaded:0,spent:0,refunded:0,available:0};
  const ben=rows.filter(function(r){return r.w&&r.w.kind==='benefit';}),co=rows.filter(function(r){return !(r.w&&r.w.kind==='benefit');});
  const amts=function(r){const b=by[r.code]||zero;return '<td>'+m(b.loaded)+'</td><td>'+m(b.spent-b.refunded)+'</td><td><b>'+m(b.available)+'</b></td>';};
  const head=function(t,n,top){return '<div class="lp-sb-view-header"'+(top?'':' style="margin-top:14px"')+'><span class="lp-sb-section-title">'+t+'</span><span class="ax-count">'+n+' wallet'+(n===1?'':'s')+'</span></div>';};
  const basis=function(w){if(!w.rows.length)return 'No entitlement';return w.eligible?w.cats.map(function(x){return x.name;}).join(', '):(w.rows[0].elig&&w.rows[0].elig.why)||w.rows[0].state;};
  return (ben.length?head('Benefit Wallets',ben.length,true)
      +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Wallet</th><th>Entitled (this month)</th><th>Loaded</th><th>Spent</th><th>Available</th></tr></thead><tbody>'
      +ben.map(function(r){return '<tr><td><b>'+ccE(r.name)+'</b><div class="ax-sub">'+ccE(basis(r.w))+'</div></td><td>'+m(r.w.eligible&&!ended?r.w.planned:0)+'</td>'+amts(r)+'</tr>';}).join('')
      +'</tbody></table></div>':'')
    +(co.length?head('Company Wallets',co.length,!ben.length)
      +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Wallet</th><th>Loaded</th><th>Spent</th><th>Available</th></tr></thead><tbody>'
      +co.map(function(r){return '<tr><td><b>'+ccE(r.name)+'</b></td>'+amts(r)+'</tr>';}).join('')
      +'</tbody></table></div>':'');
}
/* Control Preview (a what-if checker) was removed from the card (product owner, 11 Nov 2026); ccCtlSimulate stays in the engine. */
/* ── The change form ── */
function ccCtlFormOpen(scope,id){
  if(!ccCan('card.control.manage')){emsDeny('change card controls');return;}
  const t=ccCtlTarget(scope,id);if(!t)return;
  const cur=ccCtlCurrentVer(scope,t.id),s=cur?ccCtlClone(cur.set):(scope==='card'?ccCtlBlank():ccCtlBlank());
  ccCtlForm={scope:scope,id:t.id,baseVer:cur?cur.id:null,f:{perTxn:s.perTxn,daily:s.daily,monthly:s.monthly,annual:s.annual,allowedCats:s.allowedCats.filter(function(x){return x!==CC_NONE;}),blockedCats:s.blockedCats.slice(),
    channels:Object.assign({},s.channels),international:s.international,mccAllow:s.mccAllow.filter(function(x){return x!==CC_NONE;}).join(', '),mccBlock:s.mccBlock.join(', '),
    countryAllow:s.countryAllow.filter(function(x){return x!==CC_NONE;}).join(', '),countryBlock:s.countryBlock.join(', '),effFrom:wbToday(),effTo:'',reason:''}};
  /* From a card's own panel the form opens inside its Controls tab (product owner, 11 Nov 2026). */
  /* ...and from a card request's Controls tab, inside that tab (product owner, 11 Nov 2026). */
  if(scope==='card'&&page==='cards'&&((ccPageTab==='cards'&&ccSel===t.id&&ccCardTab==='controls')||(typeof ccReqCtlHere==='function'&&ccReqCtlHere(t.id)))){ccCtlForm.inPanel=true;renderADTPage();return;}
  if(page!=='cards'||ccPageTab!=='controls'){ccPageTab='controls';ccCtlSel={scope:scope,id:t.id};if(page!=='cards'){navigatePage('cards');return;}}
  renderADTPage();
}
function ccCtlFormClose(){ccCtlForm=null;renderADTPage();}
function ccCtlFormSync(){
  const F=ccCtlForm;if(!F)return;const f=F.f;let x;
  CC_LIMITS.forEach(function(l){if((x=ccVal('cctf-'+l[0]))!=null)f[l[0]]=x;});
  [['mccAllow','cctf-mccA'],['mccBlock','cctf-mccB'],['countryAllow','cctf-ctyA'],['countryBlock','cctf-ctyB'],['reason','cctf-reason'],['effFrom','cctf-from'],['effTo','cctf-to']].forEach(function(p){if((x=ccVal(p[1]))!=null)f[p[0]]=x;});
  if(document.getElementById('msw-cctf-ac'))f.allowedCats=getMSValue('cctf-ac');
  if(document.getElementById('msw-cctf-bc'))f.blockedCats=getMSValue('cctf-bc');
  if(document.getElementById('cctf-ch-'+CC_CHANNELS[0]))CC_CHANNELS.forEach(function(ch){const el=document.getElementById('cctf-ch-'+ch);if(el&&!el.disabled)f.channels[ch]=el.checked;});
  if(document.getElementById('csw-cctf-intl'))f.international=getCSValue('cctf-intl')==='Restrict'?'Restrict':'Allow';
}
function ccCtlFormHook(){ccCtlFormSync();renderADTPage();}
/* What the form would do: an error, or the relaxations (needing approval), or none. */
function ccCtlFormAnalysis(F){
  const t=ccCtlTarget(F.scope,F.id),p=F.scope==='programme'?t:ccProg(t.programmeId),set=ccCtlNorm(F.f),e=ccCtlValidate(set);
  if(e)return {error:e};
  /* scope 'request': a card request's starting controls, checked as a card's against its programme (11 Nov 2026). */
  const ps=ccProgCtl(p,F.f.effFrom||wbToday()),cardLike=F.scope!=='programme';
  if(cardLike){const ce=ccCtlCeiling(set,ps,p.currency);if(ce)return {error:ce};}
  const before=F.scope==='card'?ccCardCtl(t):ccProgCtl(p),after=cardLike?ccCtlMerge(ps,set):set;
  return {relax:ccCtlRelax(before,after,p.currency),diff:ccCtlDiff(before,after,p.currency)};
}
/* The change form's parts: each field and the save label - drawn as the Controls page's form or, for a card opened in its
   panel, inside the card's Controls tab (ccCtlInlineHTML). A card's fields show its own rules; where it has none, the
   programme's rule is shown in the field (product owner, 11 Nov 2026). Categories are two multi-select dropdowns. There is
   no outcome note: a loosening change is sent with "Submit for Approval", and a problem shows when the form is saved. */
function ccCtlFormParts(){
  const F=ccCtlForm,f=F.f,t=ccCtlTarget(F.scope,F.id),p=F.scope==='programme'?t:ccProg(t.programmeId),cur=p.currency,card=F.scope!=='programme',ps=ccProgCtl(p);
  const live=function(a){return (a||[]).filter(function(x){return x!==CC_NONE;});};
  const asProg=function(txt,dflt){return card&&txt?'As programme: '+txt:dflt;};
  const lim=function(k,label){return ccField(label+' Limit ('+ccE(cur)+')',false,'<input class="ep-form-input" id="cctf-'+k+'" inputmode="decimal" value="'+attrSafe(f[k]===''||f[k]==null?'':String(f[k]))+'" placeholder="'
    +attrSafe(card?(ps&&ps[k]!==''&&ps[k]!=null?'As programme: '+ccAmt(ps[k],cur):'As programme: no limit'):'No limit')+'" onchange="ccCtlFormHook()">');};
  const inp=function(id,k,psList,dflt){return '<input class="ep-form-input" id="'+id+'" value="'+attrSafe(f[k])+'" placeholder="'+attrSafe(asProg(live(psList).join(', '),dflt))+'" onchange="ccCtlFormHook()">';};
  const catOpts=card&&ps&&live(ps.allowedCats).length?live(ps.allowedCats):EXP_CATEGORIES;
  const chOff=card&&ps?CC_CHANNELS.filter(function(ch){return !ps.channels[ch];}):[];
  const intlProg='As programme ('+(ps&&ps.international==='Restrict'?'Restricted':'Allowed')+')';
  const a=ccCtlFormAnalysis(F);
  const fld={
    from:ccField('Effective From',true,apCD('cctf-from',f.effFrom,'Select date'),'Today or later; past periods are not rewritten.'),
    to:ccField('Effective To',false,apCD('cctf-to',f.effTo,'Open-ended'),'Optional: a temporary change ends here, and the earlier controls apply again.'),
    lims:lim('perTxn','Per Transaction')+lim('daily','Daily')+lim('monthly','Monthly')+lim('annual','Annual'),
    channels:ccField('Channels',false,ccChecksH('cctf-ch-',CC_CHANNELS,CC_CHANNELS.filter(function(ch){return f.channels[ch]&&chOff.indexOf(ch)<0;}),'ccCtlFormHook',chOff),chOff.length?'Off for the programme: '+chOff.join(', ')+'.':''),
    intl:ccField('International Use',false,apCS('cctf-intl',card?[intlProg,'Restrict']:['Allow','Restrict'],f.international==='Restrict'?'Restrict':(card?intlProg:'Allow'),'Select','ccCtlFormHook')),
    ac:ccField('Allowed Categories',false,apMS('cctf-ac',catOpts,f.allowedCats,asProg(ps?live(ps.allowedCats).join(', '):'','All categories'),'ccCtlFormMS')),
    bc:ccField('Blocked Categories',false,apMS('cctf-bc',EXP_CATEGORIES,f.blockedCats,asProg(ps?live(ps.blockedCats).join(', '):'','None'),'ccCtlFormMS')),
    mccA:ccField('Merchant Codes Allowed (MCC)',false,inp('cctf-mccA','mccAllow',ps&&ps.mccAllow,'Any, or e.g. 5812, 5814')),
    mccB:ccField('Merchant Codes Blocked (MCC)',false,inp('cctf-mccB','mccBlock',ps&&ps.mccBlock,'e.g. 7995')),
    ctyA:ccField('Countries Allowed',false,inp('cctf-ctyA','countryAllow',ps&&ps.countryAllow,'Any, or ISO codes e.g. IN, AE')),
    ctyB:ccField('Countries Blocked',false,inp('cctf-ctyB','countryBlock',ps&&ps.countryBlock,'ISO codes')),
    reason:ccField('Change Reason',true,ccArea('cctf-reason',f.reason,'Why the controls change'),'',true)
  };
  return {fld:fld,save:a.relax&&a.relax.length?'Submit for Approval':'Save Controls',
    title:'Change Controls · '+(card?expKey(t)+' ('+ccHolderName(t)+')':p.key+' '+p.name),sub:ccE(ccCtlEnfNote(p))+' Capping Limits and Budgets are not changed here.'};
}
/* A category dropdown changed: keep the form's values and the save label current without redrawing the open dropdown. */
function ccCtlFormMS(){
  ccCtlFormSync();if(!ccCtlForm)return;
  const a=ccCtlFormAnalysis(ccCtlForm),b=document.getElementById('cctf-save');
  if(b)b.textContent=a.relax&&a.relax.length?'Submit for Approval':'Save Controls';
}
function ccCtlFormHTML(){
  const x=ccCtlFormParts(),f=x.fld;
  const body='<div class="ep-form-grid">'+f.from+f.to+f.lims+f.channels+f.intl+f.ac+f.bc+f.mccA+f.mccB+f.ctyA+f.ctyB+f.reason+'</div>';
  return bgModal(x.title,x.sub,body,{close:'ccCtlFormClose()',btns:'<button class="ep-save-btn" id="cctf-save" onclick="ccCtlSave()">'+x.save+'</button>'});
}
/* The same form inside the card's Controls tab, in short sections, with Cancel and Save at the foot. */
function ccCtlInlineHTML(){
  const x=ccCtlFormParts(),f=x.fld;
  const sec=function(t,h,top){return '<div class="lp-sb-view-header"'+(top?'':' style="margin-top:14px"')+'><span class="lp-sb-section-title">'+t+'</span></div><div class="ep-form-grid">'+h+'</div>';};
  return sec('Limits',f.lims,true)+sec('Where It Works',f.channels+f.intl+f.ctyA+f.ctyB)+sec('Categories &amp; Merchants',f.ac+f.bc+f.mccA+f.mccB)
    +(ccCtlForm.scope==='request'?sec('Reason',f.reason):sec('Effective Dates &amp; Reason',f.from+f.to+f.reason))   // starting controls apply when the card is issued
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccCtlFormClose()">Cancel</button><button class="ep-save-btn" id="cctf-save" onclick="ccCtlSave()">'+x.save+'</button></div>';
}
function ccCtlSave(){
  ccCtlFormSync();const F=ccCtlForm;if(!F)return;
  if(F.scope==='request'){ccReqCtlSave(F);return;}   // a card request's starting controls (js/card-request-panel.js)
  const chk=ccCtlFormAnalysis(F);if(chk.error){showToast('Not saved','error',chk.error);return;}
  const res=ccCtlPropose({scope:F.scope,targetId:F.id,set:F.f,effFrom:F.f.effFrom,effTo:F.f.effTo,reason:F.f.reason,baseVer:F.baseVer});
  if(res.error){showToast('Not saved','error',res.error);return;}
  ccCtlForm=null;ccCtlSel={scope:F.scope,id:F.id};ccCtlTab=res.change?'controls':'versions';renderADTPage();
  if(res.change){const st=caActiveStage(res.change);showToast('Sent for approval','success',expKey(res.change)+(st?' is with Stage '+st.n+' · '+caNs(st.approvers):'')+'. The current controls stay in force until it is approved.');}
  else showToast('Controls saved','success','Version '+res.ver.n+' takes effect '+cdLabel(res.ver.effFrom)+'. '+ccCtlEnfNote(ccProg(res.ver.programmeId)));
}
/* What an approver sees in the shared review popup for a control change. */
function ccCtlReviewInfoHTML(r){
  const v=ccCtlVer(r.verId),p=ccProg(r.programmeId),t=ccCtlTarget(r.scope,r.targetId),cur=p?p.currency:'INR';if(!v)return '';
  const diff=ccCtlDiff(v.before,v.after,cur);
  return '<div class="wb-note is-wait"><b>'+ccE(r.title)+'</b><div class="wb-note-sub">'+(r.scope==='card'?ccE(ccHolderName(t))+' · '+ccE(ccCardLabel(t))+' · ':'')+ccE(p?p.key+' '+p.name:'')
    +'<br>Relaxes: '+ccE(r.relax.join('; '))+'<br>Reason: '+ccE(r.reason)+'<br>Effective '+ccE(cdLabel(v.effFrom))+(v.effTo?' to '+ccE(cdLabel(v.effTo)):' onwards')
    +(diff.length?'<br>'+diff.map(function(d){return ccE(d.field)+': '+ccE(d.old)+' → <b>'+ccE(d.val)+'</b>';}).join('<br>'):'')
    +'<br>'+ccE(ccCtlEnfNote(p))+'</div></div>';
}
/* ══ 7E · Card Loads: loads, bulk files, benefit loads (FR-CC-12 to 15) ═════════════════════════════
   Card Loads has three views on one record set: Loads (every load, whatever its origin), Bulk Load Files
   and Benefit Loads. Requests & Enrollment adds Bulk Enrollment Files. A load's panel keeps approval
   and execution apart: Approval (the engine, or what authorized it), then Execution (each recorded
   event with its source, its verification and its one funding entry). Nothing here shows a balance. */
sbToneAdd({cancelled:'idle',reversed:'idle','reversed-(illustrative)':'idle','partially-illustrative':'info','routed-individually':'info',created:'ok',valid:'ok',invalid:'bad',
  excluded:'idle',skipped:'idle',discarded:'idle',processed:'ok',loaded:'ok',eligible:'ok','not-card-backed':'idle','awaiting-verification':'wait',applied:'info',verified:'ok'});
let ccLoadSub='loads',ccLoadSel=null,ccLoadTab='basic-details',ccLoadQ='',ccLoadStatusF='',ccLoadProgF='',ccLoadForm=null,ccLx=null;
let ccBulkSel=null,ccBulkTab='basic-details',ccBulkQ='',ccBulkStatusF='',ccBulkRowF='',ccBulkForm=null,ccBulkRowForm=null,ccBenForm=null,ccReqSub='requests';
/* Statuses people filter by are the ones the badges show: a demo execution never counts as Recorded. */
const CC_LOAD_STATES=['Draft','Awaiting Approval','Follow-Up','Awaiting Execution','Processing','Partially Recorded','Recorded','Partially Illustrative','Illustrative','Failed','Cancelled','Reversed','Reversed (Illustrative)','Rejected','Withdrawn'];
function ccSubStrip(subs,cur,fn,actions){
  /* No tabs, no tab control: an empty one drew a stray dot (the actions keep their place on the right). */
  return '<div class="cc-subbar">'+(subs.length?'<div class="segmented is-compact adv-set-subs">'+subs.map(function(x){return '<button type="button" class="seg-btn'+(cur===x[0]?' active':'')+'" onclick="'+fn+'(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>':'<span></span>')
    +(actions?'<span class="ca-actions">'+actions+'</span>':'')+'</div>';
}
function ccLoadVisible(l){const me=idMe();return !!l&&l.entity===ccEnt()&&(ccSeesEmp(l.employeeEid)||l.createdBy===me||caInvolved(l,me));}
function ccBulkVisible(b){const me=idMe();return !!b&&b.entity===ccEnt()&&(ccCan('card.view.all')||ccCan(CC_BULK[b.kind].perm)||b.createdBy===me||caInvolved(b,me));}
function ccLoadBadge(l){const s=ccLoadLabel(l);return axBadge(statusTone(s),s);}
function ccOriginText(l){
  const o=l.origin||{};
  if(o.type==='Bulk')return 'Bulk file '+(o.fileKey||'')+' · row '+o.row;
  if(o.type==='Benefit'||l.benefit)return 'Benefit allocation '+(l.allocKey||'')+(l.batchKey?' · '+l.batchKey:'');
  return 'Individual';
}
function ccLoadSubs(){
  const s=[['loads','Loads']];
  if(['card.load.bulk','card.view.all','card.load.approve'].some(ccCan))s.push(['bulk','Bulk Load Files']);
  if(['card.load.create','card.view.all'].some(ccCan))s.push(['benefit','Benefit Loads']);
  if(['card.reconciliation.view','card.transaction.import','card.statement.verify'].some(ccCan))s.push(['stmts','Statements & Reconciliation']);
  return s;
}
function ccLoadSubPick(k){if(ccLoadSub===k)return;ccCloseForms();ccLoadSel=null;ccBulkSel=null;ccLoadSub=k;renderADTPage();}
function ccLoadActionsBar(){
  if(ccLoadSub==='stmts'&&typeof ccStmtActionsBar==='function')return ccStmtActionsBar();
  let a='';
  if(ccCan('card.load.create'))a+=ccBtn('New Load','ccLoadStart()',true);
  if(ccCan('card.load.bulk'))a+=ccBtn('Upload Bulk Load File','ccBulkStart(\'bulk card load\')');
  if(ccCan('card.load.create')&&ccBenefitBatches().length)a+=ccBtn('Generate Benefit Loads','ccLoadSubPick(\'benefit\')');
  return a;
}
function ccLoadsHTML(){
  const subs=ccLoadSubs();if(!subs.some(function(x){return x[0]===ccLoadSub;}))ccLoadSub=subs[0][0];
  if(ccLoadSub==='stmts'&&typeof ccStmtListHTML==='function')return '<div class="lp-page">'+dashboardBackHTML()+ccSubStrip([],'','ccRqPick',ccStmtActionsBar())+ccStmtListHTML()+'</div>';
  const strip=ccRqStrip();
  let body;
  if(ccLoadSub==='bulk')body=ccBulkListHTML(null);
  else if(ccLoadSub==='benefit')body=ccBenefitHTML();
  else if(ccLoadSub==='stmts'&&typeof ccStmtListHTML==='function')body=ccStmtListHTML();
  else body=ccLoadListHTML();
  return '<div class="lp-page">'+dashboardBackHTML()+strip+body+'</div>';
}
function ccLoadNote(){
  const t=typeof fbTrackingOn==='function'&&fbTrackingOn(ccEnt());
  return '<div class="wb-note">An approved load is an authorization, not money moved; it counts once its execution is verified by someone else. Funding-source tracking is <b>'+(t?'on':'off')+'</b>: '+(t?'a verified execution posts one entry to its funding source.':'nothing is posted to funding without a funding source.')+'</div>';
}
function ccLoadShown(){
  const q=String(ccLoadQ||'').trim().toLowerCase();
  return ccLoads.filter(function(l){
    if(!ccLoadVisible(l))return false;
    if(q&&![expKey(l),l.name,l.empId,l.reason,wbTypeName(l.wallet),ccOriginText(l),(ccCard(l.cardId)||{}).last4].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccLoadStatusF&&ccLoadLabel(l)!==ccLoadStatusF)return false;
    if(ccLoadProgF&&ccProgLabel(ccProg(l.programmeId))!==ccLoadProgF)return false;
    return true;
  });
}
function ccLoadApply(){ccLoadQ=lpSearchValue('ccl-f-q');const p=getCSValue('ccl-f-prog'),s=getCSValue('ccl-f-status');ccLoadProgF=p==='All Programmes'?'':p||'';ccLoadStatusF=s==='All Statuses'?'':s||'';ccLoadSel=null;renderADTPage();}
function ccLoadReset(){ccLoadQ='';ccLoadStatusF='';ccLoadProgF='';ccLoadSel=null;renderADTPage();}
function ccLoadStat(s){ccLoadStatusF=ccLoadStatusF===s?'':s;ccLoadSel=null;renderADTPage();}
function ccLoadStageCell(l){
  if(l.wf&&l.wf.open)return caStageCell(l);
  if(!l.exec)return '<span class="wb-muted">—</span>';
  const aw=ccLoadExecAwaiting(l);
  if(aw)return '<div class="lp-c-plain">Execution verification</div><div class="lp-c-sub">'+ccE(expKey(aw))+' · recorded by '+ccE(caN(aw.recordedBy))+'</div>';
  if(CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed)return '<div class="lp-c-plain">Execution</div><div class="lp-c-sub">'+ccE(expMoney(ccLoadRemaining(l),l.currency))+' to record'+(l.exec.expiresOn?' · valid until '+ccE(cdLabel(l.exec.expiresOn)):'')+'</div>';
  if(l.exec.expired)return '<div class="lp-c-plain">Authorization expired</div><div class="lp-c-sub">'+ccE(cdLabel(l.exec.expired.on))+(l.reraisedTo?' · re-raised as '+ccE(expKey(ccLoad(l.reraisedTo)||{})):'')+'</div>';
  return '<span class="wb-muted">—</span>';
}
function ccLoadListHTML(){
  ccLoadsSweepExpiry();
  const all=ccLoads.filter(ccLoadVisible),rows=ccLoadShown();
  if(ccLoadSel!=null&&!rows.some(function(l){return l.id===ccLoadSel;}))ccLoadSel=null;
  const pgn=listPage('cards-loads',[ccLoadQ,ccLoadStatusF,ccLoadProgF].join('|'),rows.map(function(l,i){
    const c=ccCard(l.cardId);
    return '<tr class="ccl-row'+(ccLoadSel===l.id?' lp-row-selected':'')+'" id="ccl-row-'+l.id+'" style="cursor:pointer" onclick="ccLoadOpen('+l.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(expKey(l))+'</div><div class="lp-c-sub">'+ccE(ccOriginText(l))+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(l.name)+'</div><div class="lp-c-sub">'+ccE(c?ccMask(c.last4)+' · '+expKey(c):'')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(wbTypeName(l.wallet))+'</div><div class="lp-c-sub">'+ccE((ccProg(l.programmeId)||{}).code||'')+'</div></td>'
      +'<td class="exp-c-amt">'+ccE(expMoney(l.amount,l.currency))+(l.fxCard?'<div class="lp-c-sub">'+ccE(expMoney(l.cardAmount,l.cardCurrency))+'</div>':'')+(l.exec&&l.exec.reversed?'<div class="lp-c-sub">'+ccE(expMoney(l.exec.reversed,l.currency))+' reversed</div>':'')+'</td>'
      +'<td>'+ccLoadBadge(l)+(l.exec&&l.exec.recorded>0&&l.exec.status==='Partially Recorded'?'<div class="lp-c-sub">'+ccE(expMoney(l.exec.recorded,l.currency))+' recorded</div>':'')+'</td>'
      +'<td class="ca-c-stage">'+ccLoadStageCell(l)+'</td>'
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(expKey(l))+'" onclick="ccLoadOpen('+l.id+')">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td></tr>';
  }),ccEmpty(8,'No card load matches. Use + beside the page title for a new load, or Bulk Files or Benefit Loads.'));
  const cnt=function(s){return all.filter(function(l){return ccLoadLabel(l)===s;}).length;};
  const tile=function(s,tone){return caStat(s,cnt(s),ccLoadStatusF===s,'ccLoadStat(\''+s+'\')',tone);};
  const tiles=tile('Awaiting Approval')+tile('Awaiting Execution','wait')+tile('Partially Recorded','wait')+tile('Recorded','ok')+tile(CC_DEMO,'info')+tile('Failed','bad');
  return ccFilterBar(lpSearchField('ccl-f-q',ccLoadQ,'Search load, cardholder, wallet or origin','ccLoadApply()')
      +apCS('ccl-f-prog',ccProgs().map(ccProgLabel),ccLoadProgF,'All Programmes')+apCS('ccl-f-status',CC_LOAD_STATES,ccLoadStatusF,'All Statuses')
      +clearFiltersBtn([ccLoadQ,ccLoadStatusF,ccLoadProgF],'ccLoadReset()')+'<button class="lp-pill-search" onclick="ccLoadApply()">Search</button>',tiles)
    +ccDemoNote()+ccLoadNote()
    +ccSplit('ccl','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Load</th><th>Cardholder</th><th>Wallet</th><th>Amount</th><th>Status</th><th>Current Stage</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,ccLoadSel!=null,renderCclSidebar);
}
function ccLoadOpen(id,tab){
  const l=ccLoad(id);if(!l||!ccLoadVisible(l)){showToast('Not available','error','This load is outside your access.');return;}
  if(page!=='cards'||ccPageTab!=='loads'||ccLoadSub!=='loads'){ccOpenLoadUI(id,tab);return;}
  ccLoadTab=tab||sbKeepTab(ccLoadSel,ccLoadTab);ccLoadSel=l.id;
  const sb=document.getElementById('ccl-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('ccl',renderCclSidebar);
  document.querySelectorAll('.ccl-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='ccl-row-'+id);});
}
function ccLoadClose(){ccLoadSel=null;const sb=document.getElementById('ccl-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.ccl-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccLoadNav(t){ccLoadTab=t;isbTab('ccl',renderCclSidebar);}
/* The engine's "open the record" (Pending My Approval, notifications) and links from cards and files. */
function ccOpenLoadUI(id,tab){
  const l=ccLoad(id);if(!l)return;
  if(!ccLoadVisible(l)){showToast('Not available','error','This load is outside your access.');return;}
  if(!ccPageTabs().some(function(t){return t.id==='loads';})){ccOpenCardUI(l.cardId,'loads');return;}
  ccCloseForms();ccPageTab='loads';ccLoadSub='loads';ccLoadQ='';ccLoadStatusF='';ccLoadProgF='';ccLoadSel=l.id;ccLoadTab=tab||'basic-details';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function renderCclSidebar(){
  ccLoadsSweepExpiry();
  const l=ccLoad(ccLoadSel);if(!l)return '';
  if(!ccLoadVisible(l))return '<div class="lp-isb-body"><div class="wb-empty-sm">This load is not available to you.</div></div>';
  /* Decisions in Logs and no Approval tab (product owner, 12 Nov 2026; js/card-load-flow.js); a benefit load keeps it,
     read-only, for what authorized it. The Load tab shows the approved request prefilled. */
  const tabs=[{id:'basic-details',label:'Basic Details'}].concat(ccCan('card.load.create')?[{id:'load',label:'Load'}]:[])
    .concat(l.noEngine?[{id:'approval',label:'Approval'}]:[])
    .concat([{id:'execution',label:'Execution'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}]);
  if(!tabs.some(function(t){return t.id===ccLoadTab;}))ccLoadTab='basic-details';
  if(ccLoadForm&&ccLoadForm.inLoad&&(ccLoadTab!=='load'||ccLoadForm.inLoad!==l.id))ccLoadForm=null;   // the Load form ends when the person leaves that tab or that load
  if(typeof ccLdAct!=='undefined'&&ccLdAct&&(ccLoadTab!=='logs'||ccLdAct.id!==l.id))ccLdAct=null;   // so does a Logs action
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(l.title),meta:[expKey(l),ccE(l.name)],status:ccLoadBadge(l)});
  let body;
  if(ccLoadTab==='approval')body=hero+(l.noEngine?ccLoadAuthHTML(l):caApprovalTabHTML(l));
  else if(ccLoadTab==='execution')body=hero+ccLoadExecHTML(l);
  else if(ccLoadTab==='logs')body=typeof ccLoadLogsHTML==='function'?ccLoadLogsHTML(l):lpLogsView(l.logs,'');
  else if(ccLoadTab==='history')body=sbHistoryHTML(l);
  else if(ccLoadTab==='workflow')body=wfTimelineHTML(ccLoadWfRows(l));
  else if(ccLoadTab==='load')body=hero+(typeof ccLoadLoadTabHTML==='function'?ccLoadLoadTabHTML(l):ccLoadTopUpHTML(l));
  else body=hero+ccLoadBasicHTML(l);
  return axTabBar('ccl',tabs,ccLoadTab,'ccLoadNav','ccLoadClose')+'<div class="lp-isb-body">'+body+'</div>';
}
/* The load panel's Load tab (product owner, 11 Nov 2026): load this card again - the same wallet for a company-wallet load,
   the card's company wallet (Corporate Expense) for a benefit load. Amount and reason, then Submit: a new load with the
   same rules, route and execution as New Load. */
function ccLoadTopUpWallet(l,c){
  const ws=ccWalletMap(ccProg(c.programmeId)),w=ws.find(function(x){return x.code===l.wallet;});
  if(w&&!w.benefit)return w.code;
  const on=typeof ccCardWallets==='function'?ccCardWallets(c):ws.map(function(x){return x.code;});
  const co=ws.filter(function(x){return !x.benefit&&on.indexOf(x.code)>=0;});
  return ((co.find(function(x){return x.code==='CORP';})||co[0])||{}).code||'';
}
function ccLoadTopUpHTML(l){
  const c=ccCard(l.cardId);
  if(!c||!ccCardUsable(c))return '<div class="wb-empty-sm">'+(c?ccE(ccMask(c.last4))+' is '+ccE(c.status)+(c.hold&&c.hold.active?' and on hold':'')+(c.pending?' with a provider request pending':'')+': it cannot be loaded now.':'The card is not available.')+'</div>';
  const w=ccLoadTopUpWallet(l,c);if(!w)return '<div class="wb-empty-sm">This card has no company wallet to load.</div>';
  if(!(ccLoadForm&&ccLoadForm.inLoad===l.id)){
    const p=ccProg(c.programmeId),f=p?ccProgFunding(p):CC_FUND_DEFAULT;
    ccLoadForm={id:null,cardId:c.id,wallet:w,allocId:'',amount:'',currency:p?p.currency:'',sourceId:f.sourceId||'',reason:'',comments:'',doc:'',dupAck:'',inLoad:l.id,fixedWallet:true};
  }
  return ccLoadFormHTML();
}
function ccLoadTopUpCancel(){ccLoadForm=null;ccLoadTab='basic-details';isbTab('ccl',renderCclSidebar);}
function ccLoadAuthHTML(l){
  const a=l.authorization||{};
  return '<div class="wb-note"><b>Authorized by '+ccE(a.type||'')+' '+ccE(a.key||'')+'</b><div class="wb-note-sub">'+ccE(a.text||'')+'. No separate card-load approval: '+ccE(a.why||'')+'</div></div>'
    +(l.origin&&l.origin.type==='Bulk'&&ccBulk(l.origin.fileId)?'<div class="ca-actions" style="margin-top:8px">'+ccBtn('Open '+ccE(l.origin.fileKey),'ccOpenBulkUI('+l.origin.fileId+',\'approval\')')+'</div>':'')
    +'<div class="wb-note"><div class="wb-note-sub">Approval and execution stay separate: execution is recorded and verified on the Execution tab.</div></div>';
}
function ccLoadActions(l){
  const A=ccNow(),me=A.who,out=[],add=function(lbl,call,pr){out.push(ccBtn(lbl,call,pr));},id=l.id,can=ccCan('card.load.create');
  if(l.status==='Draft'&&(l.createdBy===me||can)){add('Submit','ccLoadSubmitClick('+id+')',true);add('Edit','ccLoadStart('+id+')');add('Discard','ccLxOpen(\'cancel\','+id+')');}
  if(typeof caCanWithdraw==='function'&&!l.noEngine&&caCanWithdraw(l))add('Withdraw','caActOpen(\'withdraw\','+id+')');
  if(l.status==='Follow-Up'&&typeof caCanRespond==='function'&&caCanRespond(l))add('Edit before resubmitting','ccLoadStart('+id+')');
  if(l.exec&&can&&!ccLoadExecAwaiting(l)){
    const st=l.exec.status;
    if(st==='Awaiting Execution')add('Mark as Sent to Provider','ccLxOpen(\'process\','+id+')');
    if(CC_EXEC_OPEN.indexOf(st)>=0&&!l.exec.closed)add('Record Execution','ccLxOpen(\'record\','+id+')',true);
    if(['Awaiting Execution','Processing','Failed'].indexOf(st)>=0)add('Cancel Load','ccLxOpen(\'cancel\','+id+')');
    if(st==='Partially Recorded'&&!l.exec.closed)add('Cancel Remaining','ccLxOpen(\'cancel\','+id+')');
    if(st==='Failed')add('Retry Execution','ccLxOpen(\'retry\','+id+')');
    if(['Recorded','Partially Recorded'].indexOf(st)>=0&&ccLoadReversibleExecs(l).length)add('Reverse Load','ccLxOpen(\'reverse\','+id+')');
    if(l.exec.expired&&ccLoadRemaining(l)>0.001){if(!ccLoadReraiseActive(l)&&ccLoadReraiseEligible(l)>0.001)add('Re-raise Remaining','ccLxOpen(\'reraise\','+id+')',true);if(ccLoadReraiseEligible(l)>0.001)add('Record Late Execution','ccLxOpen(\'late\','+id+')');}
  }
  return out.join('');
}
function ccLoadAwaitingHTML(l){
  const e=ccLoadExecAwaiting(l);if(!e)return '';
  const A=ccNow(),bar=ccCan('card.load.verify')?ccLoadVerifyBar(l,e,A):'Verification needs card.load.verify.';
  return '<div class="wb-note is-wait"><b>Awaiting verification · '+ccE(expKey(e))+'</b><div class="wb-note-sub">'
    +(e.type==='reversal'?'Reversal of '+ccE(expMoney(e.amount,l.currency)):e.result==='Failed'?'Execution failed':'Executed '+ccE(expMoney(e.amount,l.currency)))
    +' · reference '+ccE(e.ref)+' · '+ccE(cdLabel(e.date))+' · evidence '+ccE(e.evidence)+' · recorded by '+ccE(caN(e.recordedBy))+' '+ccE(e.recordedAt)
    +(!bar?' <span class="ca-actions">'+ccBtn('Verify','ccLxVerifyClick('+e.id+')',true)+ccBtn('Reject','ccLxOpen(\'reject\','+e.id+')')+'</span>':' <span class="wb-muted">'+ccE(bar)+'</span>')+'</div></div>';
}
function ccLoadBasicHTML(l){
  const c=ccCard(l.cardId),p=ccProg(l.programmeId),src=l.sourceId?fbSource(l.sourceId):null,act=ccLoadActions(l),ex=l.exec;
  let notes='';
  if(ex&&ex.demo)notes+='<div class="wb-note"><b>'+CC_DEMO+'</b><div class="wb-note-sub">This execution is illustrative. No money moved, nothing was loaded at '+ccE(ccProviderName(c?c.provider:''))+' and nothing was posted to funding.</div></div>';
  if(ex&&ex.expired)notes+='<div class="wb-note is-wait"><b>Authorization expired '+ccE(cdLabel(ex.expired.on))+'</b><div class="wb-note-sub">'+ccE(expMoney(ex.expired.amount,l.currency))
    +' was not executed and is no longer reserved.'+(ex.recorded>0?' The '+ccE(expMoney(ex.recorded,l.currency))+' executed earlier stays recorded.':'')+' Re-raise it as a new load (new approval), or record a late execution exception if the provider moved the money.</div></div>';
  if(ex&&ex.status==='Awaiting Execution')notes+='<div class="wb-note is-wait"><b>Authorized, not loaded</b><div class="wb-note-sub">Approval authorizes execution only. No money has moved and no funding has been debited.</div></div>';
  if(l.status==='Draft'){const chk=ccLoadCheck(ccLoadData(l),{purpose:'submit',origin:l.origin.type,exceptId:l.id});if(chk.errors.length)notes+='<div class="wb-note is-wait"><b>Not ready to submit</b><div class="wb-note-sub">'+ccE(chk.errors.join(' '))+'</div></div>';}
  if(l.warnings&&l.warnings.length)notes+='<div class="wb-note is-wait"><b>Warnings at submission</b><div class="wb-note-sub">'+ccE(l.warnings.join(' '))+'</div></div>';
  const postKeys=ex?(ex.posted||[]).map(function(id){const t=fbTxn(id);return t?t.key+(t.status==='Reversed'?' (reversed)':''):'';}).filter(Boolean):[];
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')+ccLoadAwaitingHTML(l)+notes
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Load Request ID',expKey(l))
    +axField(AX_ICO.fUser,'Cardholder',ccE(l.name)+' <span class="ax-sub">'+ccE(l.empId||'')+(l.dept?' · '+ccE(l.dept):'')+'</span>')
    +axField(AX_ICO.fBox,'Card',c?'<button class="att-link" onclick="ccOpenCardUI('+c.id+')">'+ccE(ccCardLabel(c))+'</button> <span class="ax-sub">'+ccE(c.status)+'</span>':'—')
    +axField(AX_ICO.fTag,'Card Programme',ccE(p?p.key+' · '+p.name:''))
    +axField(AX_ICO.fTag,'Wallet',ccE(wbTypeName(l.wallet))+' <span class="ax-sub">'+(l.benefit?'benefit wallet':'corporate')+'</span>')
    +axField(AX_ICO.fCash,'Load Amount',ccE(expMoney(l.amount,l.currency))+(l.fxCard?' <span class="ax-sub">'+ccE(expMoney(l.cardAmount,l.cardCurrency)+' · '+ccFxText(l.fxCard))+'</span>':''))
    +axField(AX_ICO.fCash,'Funding Source',src?ccE(src.key+' · '+src.name)+(l.fxSrc?' <span class="ax-sub">'+ccE(expMoney(l.srcAmount,l.srcCurrency)+' · '+ccFxText(l.fxSrc))+'</span>':''):'— <span class="ax-sub">none named</span>')
    +axField(AX_ICO.fTag,'Origin',ccE(ccOriginText(l)))
    +axField(AX_ICO.fUser,'Requested By',ccE(caN(l.createdBy))+' <span class="ax-sub">'+ccE(l.createdAt)+(l.actualBy?' · through Switch User by '+ccE(caN(l.actualBy)):'')+'</span>')
    +axField(AX_ICO.fCheck,'Workflow Status',ccE(l.noEngine?'Authorized ('+(l.authorization||{}).key+')':l.status))
    +axField(AX_ICO.fCheck,'Execution Status',ex?ccE(ccLoadLabel(l))+' <span class="ax-sub">recorded '+ccE(expMoney(ex.recorded,l.currency))+(ex.reversed?' · reversed '+ccE(expMoney(ex.reversed,l.currency)):'')
      +(CC_EXEC_OPEN.indexOf(ex.status)>=0&&!ex.closed?' · '+ccE(expMoney(ccLoadRemaining(l),l.currency))+' to record':'')+'</span>':'Not authorized yet')
    +axField(AX_ICO.fCal,'Authorization',ccE(ccLoadValidityText(l))+(l.reraisedTo&&ccLoad(l.reraisedTo)?' <span class="ax-sub">re-raised as '+ccE(expKey(ccLoad(l.reraisedTo)))+'</span>':'')
      +(l.origin&&l.origin.reraiseKey?' <span class="ax-sub">re-raise of '+ccE(l.origin.reraiseKey)+'</span>':'')
      +(ccLoadChainText(l)?'<div class="ax-sub">Chain: '+ccE(ccLoadChainText(l))+'</div>':''))
    +axField(AX_ICO.fHash,'Funding Entries',postKeys.length?ccE(postKeys.join(', ')):'—')
    +axField(AX_ICO.fTag,'Load Reason',ccE(l.reason||'—')+(l.extRef?' <span class="ax-sub">reference '+ccE(l.extRef)+'</span>':''))
    +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Supporting Document',ccE(l.doc||'—'))
    +(l.dupAck?axField(EXP_ICO.note,'Not a Duplicate',ccE(l.dupAck),true):'')
    +axField(EXP_ICO.note,'Comments',ccE(l.comments||'—'),true)
    +'</div>';
}
function ccLoadExecHTML(l){
  const es=ccLoadExecsOf(l).slice().reverse();
  const head='<div class="wb-note"><div class="wb-note-sub"><b>Manually Verified</b>: provider reference and evidence, verified by a second person. '
    +'<b>'+CC_DEMO+'</b>: no money moves and nothing is posted.</div></div>';
  if(!es.length)return head+ccLoadAwaitingHTML(l)+'<div class="wb-empty-sm">'+(l.exec?'Nothing has been executed yet.':'Execution starts once the load is approved or authorized.')+'</div>';
  return head+ccLoadAwaitingHTML(l)+'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Record</th><th>Result</th><th>Amount</th><th>Source</th><th>Reference · Date</th><th>Recorded · Verified</th><th>Funding</th></tr></thead><tbody>'
    +es.map(function(e){
      const t=e.postingId?fbTxn(e.postingId):null,rs=(e.postingIds||[]).map(fbTxn).filter(Boolean);
      return '<tr><td><b>'+ccE(expKey(e))+'</b><div class="ax-sub">'+ccE(e.status)+'</div></td><td>'+ccE(e.type==='reversal'?'Reversal of '+(e.execKey||'the execution'):e.result)
        +(e.type==='execution'&&e.result==='Recorded'&&ccExecReversed(e)>0?'<div class="ax-sub">'+ccE(expMoney(ccExecReversed(e),l.currency))+' reversed · '+ccE(expMoney(ccExecReversible(e),l.currency))+' left</div>':'')+'</td><td>'+(e.amount?ccE(expMoney(e.amount,l.currency)):'—')+'</td>'
        +'<td>'+ccSrcBadge(e.source)+'</td><td>'+ccE(e.ref||'—')+'<div class="ax-sub">'+ccE(cdLabel(e.date))+'</div></td>'
        +'<td>'+ccE(caN(e.recordedBy))+(e.actual?' <span class="ax-sub">via '+ccE(caN(e.actual))+'</span>':'')+'<div class="ax-sub">'+(e.verifiedBy?'verified by '+ccE(caN(e.verifiedBy)):e.rejectedBy?'rejected by '+ccE(caN(e.rejectedBy))+': '+ccE(e.rejectReason):e.source===CC_DEMO?'no verification (illustrative)':'awaiting verification')+'</div></td>'
        +'<td>'+(t?ccE(t.key)+'<div class="ax-sub">'+ccE(expMoney(t.amount,t.currency))+' out of '+ccE((fbSource(t.sourceId)||{}).key||'')+(t.exception?' · reconciliation exception':'')+'</div>':rs.length?ccE(rs.map(function(x){return x.key;}).join(', '))+'<div class="ax-sub">reversal entries</div>':'—')+'</td></tr>';
    }).join('')+'</tbody></table></div>'
    +((l.exec&&(l.exec.posted||[]).some(function(id){const t=fbTxn(id);return t&&t.exception;}))?'<div class="wb-note is-wait"><b>Reconciliation exception</b><div class="wb-note-sub">The verified load was posted as it happened although the recorded funding (internal) of the source was short. No balance was invented; reconcile it in Funding &amp; Budgets → Corporate Funding.</div></div>':'');
}
function ccLoadWfRows(l){
  const done=(l.logs||[]).slice().reverse().map(function(x){return {title:x.status||'',user:x.user||'System',date:x.date||'',time:x.time||'',description:x.action||''};});
  const steps=[];
  if(l.status==='Draft'){
    steps.push({title:'Submit',owner:caN(l.createdBy)});
    if(!l.benefit){const rt=ccRoute(l);if(rt.wf)caActiveDefs(rt.wf).forEach(function(s){steps.push({title:'Stage '+s.n+' · '+s.name,owner:caStageWho(s)});});}
  }else if(l.wf&&l.wf.open){
    if(l.status==='Follow-Up')steps.push({title:'Respond to Follow-Up',owner:caN(l.submittedBy||l.createdBy)});
    l.wf.stages.slice(l.wf.current).forEach(function(s,i){steps.push({title:'Stage '+s.n+' · '+s.name,owner:i===0&&s.approvers.length?caNs(s.approvers):caStageWho(s)});});
  }
  if(['Draft','Awaiting Approval','Follow-Up'].indexOf(l.status)>=0||(l.exec&&CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed)){
    steps.push({title:'Record execution (provider evidence or illustrative)',owner:'Card administrator'});
    steps.push({title:'Verify execution and post to funding once',owner:'Card Load Verifiers (not the recorder, cardholder or requester)'});
  }
  return wfPlan(done,steps);
}
function ccLoadSubmitClick(id){
  const e=ccLoadSubmit(id);if(e){showToast('Not submitted','error',e);return;}
  const l=ccLoad(id),st=caActiveStage(l);renderADTPage();
  showToast(l.noEngine?'Load authorized':'Card load submitted','success',expKey(l)+(l.noEngine?' is authorized by '+l.authorization.key+' and awaits execution.':' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'. Approval authorizes execution; nothing is loaded yet.'));
}
/* The approver's context in the shared review popup. */
function ccLoadReviewInfoHTML(r){
  const c=ccCard(r.cardId),p=ccProg(r.programmeId),chk=ccLoadCheck(ccLoadData(r),{purpose:'approve',origin:r.origin.type,exceptId:r.id,period:r.period}),src=r.sourceId?fbSource(r.sourceId):null;
  return '<div class="wb-note'+(chk.errors.length?' is-bad':'')+'"><b>'+ccE(r.title)+'</b><div class="wb-note-sub">'+ccE(r.name)+' ('+ccE(r.empId||'')+') · '+ccE(c?ccCardLabel(c)+' · '+c.status:'')+' · '+ccE(p?p.code:'')
    +'<br>'+ccE(wbTypeName(r.wallet))+' · '+ccE(expMoney(r.amount,r.currency))+(r.fxCard?' = '+ccE(expMoney(r.cardAmount,r.cardCurrency)+' ('+ccFxText(r.fxCard)+')'):'')
    +'<br>Funding source: '+(src?ccE(src.key+' '+src.name)+(chk.room!=null?' · available for new commitments: '+ccE(expMoney(chk.room,src.currency)):''):'none named')
    +(chk.monthLimit!=null&&chk.monthLimit!==''?'<br>This month on the card: '+ccE(ccAmt(chk.monthUsed,r.cardCurrency))+' of '+ccE(ccAmt(chk.monthLimit,r.cardCurrency)):'')
    +'<br>Reason: '+ccE(r.reason)+(r.dupAck?'<br>Marked not a duplicate: '+ccE(r.dupAck):'')
    +'<br>Check now: '+(chk.errors.length?'<b>'+ccE(chk.errors.join(' '))+'</b>':'passes')+(chk.warnings.length?'<br>Warning: '+ccE(chk.warnings.join(' ')):'')
    +'<br>Approval authorizes execution only; nothing is loaded or debited by approval.</div></div>';
}

/* ── The load form (+ on Card Loads, New Load) ───────────────────────────── */
function ccLoadCardsPool(){return ccCards.filter(function(c){return ccCardVisible(c)&&ccCardUsable(c);});}
function ccLoadCardLabel(c){const p=ccProg(c.programmeId);return ccMask(c.last4)+' · '+expKey(c)+' · '+ccHolderName(c)+' · '+(p?p.code:'');}
function ccLoadAllocOptions(c,code,exceptId){
  if(!c||!code)return [];
  return (typeof wbBatches==='undefined'?[]:wbBatches).filter(function(b){return b.entity===c.entity&&b.status==='Approved';}).reduce(function(a,b){
    return a.concat(b.rows.filter(function(r){return r.eid===c.employeeEid&&r.walletType===code&&r.status==='Planned';}).map(function(r){return {row:r,batch:b};}));},[])
    .filter(function(al){return !ccAllocLoadable(al,c,code,exceptId)||al.row.id===(ccLoadForm&&ccLoadForm.allocId);});
}
function ccAllocLabel(al){return al.row.key+' · '+al.row.categoryName+' · '+wbPeriodLabel(al.row.period)+' · '+wbMoney(al.row.amount)+' ('+al.batch.key+')';}
function ccLoadStart(id,o){
  o=o||{};
  if(!ccCan('card.load.create')){emsDeny('create card loads');return;}
  if(id!=null){
    const l=ccLoad(id);if(!l)return;
    ccLoadForm={id:l.id,cardId:l.cardId,wallet:l.wallet,allocId:l.allocId||'',amount:String(l.amount),currency:l.currency,sourceId:l.sourceId||'',reason:l.reason,comments:l.comments,doc:l.doc,dupAck:l.dupAck};
  }else{
    const c=o.cardId?ccCard(o.cardId):null,p=c?ccProg(c.programmeId):null,f=p?ccProgFunding(p):CC_FUND_DEFAULT;
    ccLoadForm={id:null,cardId:c?c.id:'',wallet:'',allocId:'',amount:'',currency:p?p.currency:'',sourceId:f.sourceId||'',reason:'',comments:'',doc:'',dupAck:''};
    if(p){const ws=ccWalletMap(p);if(ws.length===1)ccLoadForm.wallet=ws[0].code;}
  }
  /* From a card's own panel the form opens inside its Loads tab (product owner, 11 Nov 2026). */
  if(id==null&&o.cardId&&page==='cards'&&ccPageTab==='cards'&&ccSel===Number(o.cardId)&&ccCardTab==='loads'){ccLoadForm.inPanel=true;renderADTPage();return;}
  if(page!=='cards'||ccPageTab!=='loads'){ccPageTab='loads';ccLoadSub='loads';if(page!=='cards'){navigatePage('cards');return;}}
  ccLoadSub='loads';renderADTPage();
}
function ccLoadSync(){
  const f=ccLoadForm;if(!f)return;
  const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let x;
  if(f.id==null&&(x=cs('cclf-card'))!=null){const c=ccLoadCardsPool().find(function(c){return ccLoadCardLabel(c)===x;});const v=c?c.id:'';
    if(v!==f.cardId){f.cardId=v;f.wallet='';f.allocId='';const p=c?ccProg(c.programmeId):null;if(p){f.currency=p.currency;f.sourceId=ccProgFunding(p).sourceId||f.sourceId;const ws=ccWalletMap(p);if(ws.length===1)f.wallet=ws[0].code;}}}
  const c=ccCard(f.cardId),p=c?ccProg(c.programmeId):null;
  if((x=cs('cclf-wallet'))!=null&&p){const w=ccWalletMap(p).find(function(w){return w.name===x;});const v=w?w.code:'';if(v!==f.wallet){f.wallet=v;f.allocId='';}}
  if((x=cs('cclf-alloc'))!=null){const al=ccLoadAllocOptions(c,f.wallet,f.id).find(function(a){return ccAllocLabel(a)===x;});f.allocId=al?al.row.id:'';if(al){f.amount=String(al.row.amount);f.currency=al.row.currency||'INR';}}
  if((x=cs('cclf-cur'))!=null)f.currency=x;
  if((x=cs('cclf-src'))!=null){const s=fbSourcesHere(true).find(function(s){return fbSourceLabel(s)===x;});f.sourceId=s?s.id:'';}
  [['amount','cclf-amt'],['reason','cclf-reason'],['comments','cclf-comments'],['dupAck','cclf-dup']].forEach(function(q){const v=ccVal(q[1]);if(v!=null)f[q[0]]=v;});
}
function ccLoadHook(){ccLoadSync();renderADTPage();}
function ccLoadDoc(input){const fl=input.files&&input.files[0];input.value='';if(!fl)return;if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}ccLoadSync();ccLoadForm.doc=fl.name;renderADTPage();}
function ccLoadFormClose(){ccLoadForm=null;renderADTPage();}
function ccLoadFormHTML(){
  const f=ccLoadForm,c=f.cardId?ccCard(f.cardId):null,p=c?ccProg(c.programmeId):null,pool=ccLoadCardsPool(),ws=p?ccWalletMap(p):[],w=ws.find(function(x){return x.code===f.wallet;});
  const srcs=fbSourcesHere(true),src=f.sourceId?fbSource(f.sourceId):null,track=typeof fbTrackingOn==='function'&&fbTrackingOn(ccEnt());
  const allocs=w&&w.benefit?ccLoadAllocOptions(c,w.code,f.id):[],al=f.allocId?ccAllocRow(f.allocId):null;
  const chk=c&&w&&String(f.amount||'').trim()?ccLoadCheck(f,{purpose:'submit',origin:'Individual',exceptId:f.id}):null;
  const ro=function(v){return '<input class="ep-form-input ca-ro" readonly value="'+attrSafe(v)+'">';};
  let route='';
  if(w&&!w.benefit&&p){const rt=ccRoute({kind:'card load',programmeId:p.id});route=rt.wf?'Card Load route '+caWfKey(rt.wf)+' '+rt.wf.name+': '+caActiveDefs(rt.wf).map(function(s){return 'Stage '+s.n+' '+s.name+' ('+caStageWho(s)+')';}).join(', ')+'. The cardholder and you cannot approve it.':ccE(rt.error);}
  if(w&&w.benefit)route='Authorized by the approved Wallet &amp; Benefits allocation itself: no second approval. Execution is still verified by someone else.';
  /* In a card's own panel the card and its holder are already shown above the form, so those two fields are left out. */
  const body='<div class="ep-form-grid">'
    +(f.inPanel||f.inLoad?'':ccField('Card',true,f.id!=null?ro(c?ccLoadCardLabel(c):''):axCS('cclf-card',pool.map(ccLoadCardLabel),c?ccLoadCardLabel(c):'','Search an Active card','ccLoadHook'),
      f.id==null&&!pool.length?'No Active card without a hold or a pending provider request is visible to you.':'Only Active cards without an ADT hold or a pending provider request can be loaded.')
    +ccField('Cardholder · Programme',false,ro(c?ccHolderName(c)+' · '+(p?p.key+' '+p.name:''):'')))
    +ccField('Wallet / Pocket',true,f.fixedWallet?ro(w?w.name:''):apCS('cclf-wallet',ws.map(function(x){return x.name;}),w?w.name:'','Select','ccLoadHook'),f.fixedWallet?'':'Wallets of the programme (benefit wallet types).')
    +(w&&w.benefit?ccField('Approved Allocation',true,apCS('cclf-alloc',allocs.map(ccAllocLabel),al?ccAllocLabel(al):'','Select allocation','ccLoadHook'),
        allocs.length?'From approved Wallet &amp; Benefits batches, not yet loaded. Planned allocations are not money on the card.':'No approved, unloaded allocation for this cardholder and wallet.',true):'')
    +ccField('Load Amount',true,w&&w.benefit?ro(f.amount):ccInput('cclf-amt',f.amount,'0.00'),w&&w.benefit?'Exactly the allocated amount.':'')
    +ccField('Currency',true,w&&w.benefit?ro(f.currency):apCS('cclf-cur',EXP_CURRENCIES,f.currency,'Select','ccLoadHook'),p&&f.currency&&f.currency!==p.currency?'Converted to '+p.currency+' at the ADT exchange rate in force; no 1:1 assumption.':'')
    +ccField('Funding Source',track,apCS('cclf-src',['None'].concat(srcs.map(fbSourceLabel)),src?fbSourceLabel(src):'None','Select','ccLoadHook'),
      (track?'Required: funding-source tracking is on.':'Optional: funding-source tracking is off.')+' A verified execution posts one entry to it.')
    +ccField('Load Reason',true,ccInput('cclf-reason',f.reason,'e.g. Client visit to Pune, 12-14 Nov'))
    +ccField('Supporting Document',false,f.doc?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.doc)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccLoadDoc(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span></span></label>')
    +(chk&&chk.dup?ccField('Not a Duplicate - Why',true,ccInput('cclf-dup',f.dupAck,'Why this is a separate load'),'Same card, wallet and amount as '+ccE(expKey(chk.dup))+' ('+ccE(ccLoadLabel(chk.dup))+').',true):'')
    +ccField('Comments',false,ccArea('cclf-comments',f.comments,''),'',true)
    +'<div class="ep-form-group ep-form-full">'+ccLoadAnalysisHTML(chk,p,route)+'</div></div>';
  const btns='<button class="ep-cancel-btn" onclick="ccLoadSave(false)">Save Draft</button><button class="ep-save-btn" onclick="ccLoadSave(true)">'+(f.id!=null&&ccLoad(f.id).status==='Follow-Up'?'Save changes':'Submit')+'</button>';
  if(f.inPanel||f.inLoad)return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+(f.inLoad?'Load '+ccE(c?ccMask(c.last4):'')+' · '+ccE(w?w.name:''):'New Load')+'</span></div>'+body
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="'+(f.inLoad?'ccLoadTopUpCancel()':'ccLoadFormClose()')+'">Cancel</button>'+btns+'</div>';
  return bgModal(f.id!=null?'Edit Card Load · '+expKey(ccLoad(f.id)):'New Card Load','Approval authorizes execution only. A load counts once its execution is verified; ADT never shows a card balance.',body,
    {close:'ccLoadFormClose()',btns:btns});
}
function ccLoadAnalysisHTML(chk,p,route){
  if(!chk)return '<div class="wb-note"><div class="wb-note-sub">Pick the card, wallet and amount to see the checks.</div></div>';
  const lines=[];
  if(chk.fxCard)lines.push('Card currency: '+expMoney(chk.cardAmount,p.currency)+' at '+ccFxText(chk.fxCard)+'.');
  if(chk.src&&chk.srcAmount!=null)lines.push('Funding: '+expMoney(chk.srcAmount,chk.srcCurrency)+' from '+chk.src.key+(chk.fxSrc?' at '+ccFxText(chk.fxSrc):'')+(chk.room!=null?'; available for new commitments (recorded balance, less payouts in progress and approved loads): '+expMoney(chk.room,chk.src.currency):'')+'.');
  if(chk.monthLimit!=null&&chk.monthLimit!=='')lines.push('This month on the card: '+ccAmt(chk.monthUsed,p.currency)+' of the '+ccAmt(chk.monthLimit,p.currency)+' load limit already requested or loaded.');
  return '<div class="wb-note'+(chk.errors.length?' is-bad':'')+'"><b>'+(chk.errors.length?'Cannot submit yet':'Checks pass')+'</b>'
    +(chk.errors.length?'<div class="wb-note-sub">'+ccE(chk.errors.join(' '))+'</div>':'')
    +(chk.warnings.length?'<div class="wb-note-sub"><b>Warning:</b> '+ccE(chk.warnings.join(' '))+'</div>':'')
    +(lines.length?'<div class="wb-note-sub">'+ccE(lines.join(' '))+'</div>':'')
    +(route?'<div class="wb-note-sub">'+route+'</div>':'')+'</div>';
}
function ccLoadSave(submit){
  ccLoadSync();const f=ccLoadForm;if(!f)return;
  if(!f.cardId||!f.wallet){showToast('Not saved','error','Pick the card and the wallet.');return;}
  if(f.id!=null){
    const l=ccLoad(f.id),e=ccLoadUpdate(f.id,f);if(e){showToast('Not saved','error',e);return;}
    if(submit&&l.status==='Draft'){const se=ccLoadSubmit(l.id);if(se){showToast('Saved as draft','error',se);ccLoadForm=null;renderADTPage();return;}}
    ccLoadForm=null;ccLoadSel=l.id;renderADTPage();showToast(submit&&l.status!=='Draft'?'Load submitted':'Load saved','success',expKey(l)+' · '+ccLoadLabel(l)+'.');return;
  }
  const res=ccLoadCreate(f,submit);
  if(res.error){showToast(submit?'Not submitted':'Not saved','error',res.error);return;}
  ccLoadForm=null;ccLoadSel=res.rec.id;ccLoadTab='basic-details';renderADTPage();
  const l=res.rec,st=caActiveStage(l);
  showToast(!submit?'Draft saved':l.noEngine?'Load authorized':'Card load submitted','success',expKey(l)+(!submit?' is a draft; submit it when ready.':l.noEngine?' is authorized by '+l.authorization.key+' and awaits execution.':' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'. Nothing is loaded until execution is verified.'));
}

/* ── Execution and correction popups ─────────────────────────────────── */
function ccLxOpen(act,id){
  const l=act==='reject'?ccLoad((ccLoadExec(id)||{}).loadId):act.indexOf('b-')===0?null:ccLoad(id);
  const demo=ccDemoOn()&&ccCan('card.demo.simulate');
  ccLx={act:act,id:Number(id),f:{result:'Recorded',amount:l&&l.exec?String(ccLoadRemaining(l)):'',source:l&&l.exec&&l.exec.demo===true?CC_DEMO:l&&l.exec&&l.exec.demo===false?CC_SRC_MANUAL:demo?'':CC_SRC_MANUAL,
    ref:'',evidence:'',date:wbToday(),note:'',reason:''}};
  if(act==='b-record')ccLx.f.source=demo?'':CC_SRC_MANUAL;
  if(act==='reverse'&&l){const ex=ccLoadReversibleExecs(l)[0];ccLx.f.execId=ex?ex.id:'';ccLx.f.amount=ex?String(ccExecReversible(ex)):'';}
  if(act==='late'){ccLx.f.source=CC_SRC_MANUAL;ccLx.f.lateReason='';}
  renderADTPage();
}
function ccLxClose(){ccLx=null;renderADTPage();}
function ccLxSync(){
  if(!ccLx)return;const f=ccLx.f,cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let v;
  [['result','cclx-result'],['source','cclx-source']].forEach(function(p){if((v=cs(p[1]))!=null)f[p[0]]=v;});
  [['amount','cclx-amt'],['ref','cclx-ref'],['note','cclx-note'],['reason','cclx-reason'],['date','cclx-date'],['lateReason','cclx-late']].forEach(function(p){if((v=ccVal(p[1]))!=null)f[p[0]]=v;});
  if(ccLx.act==='reverse'&&(v=cs('cclx-exec'))!=null){const l=ccLoad(ccLx.id),ex=l?ccLoadReversibleExecs(l).find(function(x){return ccExecLabel(x,l)===v;}):null;
    if(ex&&ex.id!==f.execId){f.execId=ex.id;f.amount=String(ccExecReversible(ex));}}
}
function ccExecLabel(e,l){return expKey(e)+' · '+expMoney(e.amount,l.currency)+' executed '+cdLabel(e.date)+' · '+expMoney(ccExecReversible(e),l.currency)+' left to reverse';}
function ccLxHook(){ccLxSync();renderADTPage();}
function ccLxEvidence(input){const fl=input.files&&input.files[0];input.value='';if(!fl)return;if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}ccLxSync();ccLx.f.evidence=fl.name;renderADTPage();}
function ccLxEvidenceField(f,label){
  return ccField(label||'Provider Evidence',true,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>'
    :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccLxEvidence(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · provider statement, portal screen or advice</span></span></label>','',true);
}
function ccLxHTML(){
  const a=ccLx,f=a.f,btn=function(l){return '<button class="ep-save-btn" onclick="ccLxSave()">'+l+'</button>';},close='ccLxClose()';
  const demoOk=ccDemoOn()&&ccCan('card.demo.simulate');
  if(a.act==='record'||a.act==='b-record'){
    const l=a.act==='record'?ccLoad(a.id):null,b=a.act==='b-record'?ccBulk(a.id):null,c=l?ccCard(l.cardId):null;
    const demoCard=!!c&&!ccCardEvidenced(c);
    const srcs=l&&(l.exec.demo===true||demoCard)?[CC_DEMO]:l&&l.exec.demo===false?[CC_SRC_MANUAL]:[CC_SRC_MANUAL].concat(demoOk?[CC_DEMO]:[]);
    const body='<div class="ep-form-grid">'
      +(l?ccField('Result',true,apCS('cclx-result',CC_EXEC_RESULTS,f.result,'Select','ccLxHook'),'Recorded: the provider loaded the money (all or part). Failed: it did not.'):'')
      +(l&&f.result==='Recorded'?ccField('Amount Loaded ('+ccE(l.currency)+')',true,ccInput('cclx-amt',f.amount,'0.00'),ccE(expMoney(ccLoadRemaining(l),l.currency))+' remains. Less records a partial execution.'):'')
      +(demoCard?'<div class="wb-note" style="grid-column:1/-1">'+ccE(ccCardLabel(c))+' was issued or activated only as '+CC_DEMO+': loads to it are illustrative and post nothing to Corporate Funding.</div>':'')
      +ccField('Confirmation Source',true,apCS('cclx-source',srcs,f.source,'Select','ccLxHook'),CC_SRC_PROVIDER+' comes only from a connected provider; '+ccE(ccProviderName(c?c.provider:(oncProg(ccEnt()).provider||'')))+' is not connected.')
      +(f.source===CC_SRC_MANUAL?ccField(b?'Provider Batch Reference':'Provider Reference',true,ccInput('cclx-ref',f.ref,'Reference on the provider\'s confirmation'),b?'Each load gets this reference with its row number.':'Recorded once: the same reference is never used for another load or funding entry.')
        +ccField('Executed On',true,apCD('cclx-date',f.date,'Select date'))+ccLxEvidenceField(f):'')
      +(f.source===CC_DEMO?'<div class="ep-form-group ep-form-full"><div class="wb-note"><b>'+CC_DEMO+'</b><div class="wb-note-sub">Applied at once and labelled everywhere. No money moves and nothing is posted to funding.</div></div></div>':'')
      +ccField('Note',false,ccArea('cclx-note',f.note,''),'',true)+'</div>';
    return bgModal((b?'Record Execution for '+ccE(expKey(b)):'Record Execution · '+ccE(expKey(l))),f.source===CC_SRC_MANUAL?'Recorded from the provider\'s evidence. It takes effect, and posts to funding, once another person verifies it.':'',body,
      {close:close,btns:btn(f.source===CC_DEMO?'Record Illustrative Execution':'Record for Verification')});
  }
  if(a.act==='reverse'){
    const l=ccLoad(a.id),list=ccLoadReversibleExecs(l),ex=ccLoadExec(f.execId)||list[0],demo=!!ex&&ex.source===CC_DEMO;
    const body='<div class="ep-form-grid">'
      +ccField('Execution Reversed',true,apCS('cclx-exec',list.map(function(x){return ccExecLabel(x,l);}),ex?ccExecLabel(ex,l):'','Select execution','ccLxHook'),'A reversal is linked to the execution it corrects; the execution itself is never changed.',true)
      +ccField('Amount Reversed ('+ccE(l.currency)+')',true,ccInput('cclx-amt',f.amount,'0.00'),ex?'Up to '+ccE(expMoney(ccExecReversible(ex),l.currency))+'. Less records a partial reversal; another can follow.':'')
      +(demo?'':ccField('Reversal Reference',true,ccInput('cclx-ref',f.ref,'Provider\'s reversal reference'))+ccField('Reversed On',true,apCD('cclx-date',f.date,'Select date'))+ccLxEvidenceField(f,'Reversal Evidence'))
      +ccField('Reason',true,ccArea('cclx-note',f.note,'Why the amount is reversed'),'',true)
      +(l.exec.status==='Partially Recorded'&&!l.exec.closed?'<div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">This reverses money already executed. The '+ccE(expMoney(ccLoadRemaining(l),l.currency))+' not yet executed is not affected: use Cancel Remaining for that.</div></div></div>':'')+'</div>';
    return bgModal('Reverse Load · '+ccE(expKey(l)),demo?'An illustrative reversal: nothing was posted, so nothing is reversed in funding.':'A linked correction: the execution and its funding entry stay; one reversal entry is posted on the funding source once someone else verifies it.',body,{close:close,btns:btn('Record Reversal')});
  }
  if(a.act==='late'){
    const l=ccLoad(a.id);
    const body='<div class="ep-form-grid">'
      +ccField('Amount Loaded ('+ccE(l.currency)+')',true,ccInput('cclx-amt',f.amount,'0.00'),'Up to the '+ccE(expMoney(ccLoadReraiseEligible(l),l.currency))+' left unexecuted when the authorization expired and not re-raised.')
      +ccField('Provider Reference',true,ccInput('cclx-ref',f.ref,'Reference on the provider\'s confirmation'))+ccField('Executed On',true,apCD('cclx-date',f.date,'Select date'))
      +ccLxEvidenceField(f)+ccField('Why It Is Recorded Late',true,ccArea('cclx-late',f.lateReason,'e.g. The provider executed the batch on 2 Dec and reported it on 9 Dec'),'',true)
      +ccField('Note',false,ccArea('cclx-note',f.note,''),'',true)+'</div>';
    return bgModal('Record Late Execution · '+ccE(expKey(l)),'The authorization expired on '+ccE(cdLabel(l.exec.expiresOn))+'. Money the provider actually moved is recorded as it happened - as an exception, not as authorized - once someone independent verifies it.',body,{close:close,btns:btn('Record for Verification')});
  }
  if(a.act==='reraise'){
    const l=ccLoad(a.id);
    return bgModal('Re-raise Remaining · '+ccE(expKey(l)),'A new load for the '+ccE(expMoney(ccLoadReraiseEligible(l),l.currency))+' not executed before the authorization expired'+(ccLoadReraiseKids(l).length?' and not covered by an earlier re-raise':'')+'. It is linked to '+ccE(expKey(l))+' and needs a new approval on the Card Load route.',
      '<div class="ep-form-grid">'+ccField('Why It Is Still Needed',true,ccArea('cclx-reason',f.reason,''),'',true)+'</div>',{close:close,btns:btn('Re-raise and Submit')});
  }
  if(a.act==='b-exclude'){
    return bgModal('Exclude Row '+ccE(a.row)+' · '+ccE(expKey(ccBulk(a.id))),'An excluded row is not submitted. It stays listed with the reason and can be included again before submission.',
      '<div class="ep-form-grid">'+ccField('Reason',true,ccArea('cclx-reason',f.reason,''),'',true)+'</div>',{close:close,btns:btn('Exclude Row')});
  }
  const T={process:['Mark as Sent to Provider · '+expKey(ccLoad(a.id)||{}),'Records that the load was instructed to the provider outside ADT. Nothing counts as loaded until execution is recorded and verified.','Mark as Sent'],
    cancel:[(ccLoad(a.id)&&ccLoad(a.id).status==='Draft'?'Discard Draft · ':ccLoad(a.id)&&ccLoad(a.id).exec&&ccLoad(a.id).exec.status==='Partially Recorded'?'Cancel Remaining · ':'Cancel Load · ')+expKey(ccLoad(a.id)||{}),'Nothing more will be loaded on this authorization. What is already recorded stays.','Confirm'],
    retry:['Retry Execution · '+expKey(ccLoad(a.id)||{}),'The same authorization applies. The card, cardholder and funding source are checked again.','Retry'],
    reject:['Reject Execution Record · '+expKey(ccLoadExec(a.id)||{}),'Nothing changes on the load and nothing is posted.','Reject'],
    'b-discard':['Discard '+expKey(ccBulk(a.id)||{}),'The draft file ends as Discarded; nothing was created from it.','Discard']}[a.act];
  if(!T)return '';
  const body='<div class="ep-form-grid">'+(a.act==='process'?ccField('Instruction Reference',false,ccInput('cclx-ref',f.ref,'Provider portal or file reference'))+ccField('Note',false,ccArea('cclx-note',f.note,''),'',true)
    :ccField(a.act==='retry'?'What Changed':'Reason',true,ccArea('cclx-reason',f.reason,''),'',true))+'</div>';
  return bgModal(ccE(T[0]),T[1],body,{close:close,btns:btn(T[2])});
}
function ccLxSave(){
  ccLxSync();const a=ccLx;if(!a)return;const f=a.f;let err='',ok='',res;
  if(a.act==='record'){res=ccLoadExecRecord(a.id,f);err=res.error||'';if(!err)ok=res.rec.status==='Applied'?(f.result==='Failed'?'Failure recorded':'Execution recorded')+' ('+CC_DEMO+')':expKey(res.rec)+' recorded; another person verifies it';}
  else if(a.act==='b-record'){res=ccBulkExecRecord(a.id,f);err=res.error||(res.errors.length&&!res.done.length?res.errors.join(' '):'');
    if(!err)ok=res.done.length+' load'+(res.done.length===1?'':'s')+' '+(f.source===CC_DEMO?'recorded ('+CC_DEMO+')':'recorded for verification')+(res.errors.length?'; '+res.errors.length+' not: '+res.errors.join(' '):'');}
  else if(a.act==='reverse'){res=ccLoadReverse(a.id,f);err=res.error||'';if(!err)ok=res.rec.status==='Applied'?'Load reversed ('+CC_DEMO+')':expKey(res.rec)+' recorded; another person verifies the reversal';}
  else if(a.act==='process'){err=ccLoadMarkProcessing(a.id,f);ok='Marked as sent to the provider';}
  else if(a.act==='late'){res=ccLoadExecRecord(a.id,Object.assign({},f,{late:true,result:'Recorded'}));err=res.error||'';if(!err)ok=expKey(res.rec)+' recorded as a late execution exception; someone independent verifies it';}
  else if(a.act==='reraise'){res=ccLoadReraise(a.id,{reason:f.reason});err=res.error||'';if(!err)ok=expKey(res.rec)+' raised for approval ('+ccLoadLabel(res.rec)+')';}
  else if(a.act==='cancel'){err=ccLoadCancel(a.id,f.reason);ok='Done';}
  else if(a.act==='retry'){err=ccLoadRetry(a.id,f.reason);ok='Awaiting execution again';}
  else if(a.act==='reject'){err=ccLoadExecReject(a.id,f.reason);ok='Execution record rejected';}
  else if(a.act==='b-exclude'){err=ccBulkRowExclude(a.id,a.row,true,f.reason);ok='Row '+a.row+' excluded';}
  else if(a.act==='b-discard'){err=ccBulkDiscard(a.id,f.reason);ok='File discarded';}
  if(err){showToast('Not saved','error',err);return;}
  ccLx=null;renderADTPage();showToast('Done','success',ok+'.');
}
function ccLxVerifyClick(id){const e=ccLoadExecVerify(id);if(e){showToast('Not verified','error',e);return;}renderADTPage();const x=ccLoadExec(id);showToast('Verified','success',expKey(x)+' applied'+(x.postingId?'; funding entry '+(fbTxn(x.postingId)||{}).key+' posted once':'')+'.');}

/* ── Bulk files: listing, upload, panel ─────────────────────────────── */
function ccBulkShown(kind){
  const q=String(ccBulkQ||'').trim().toLowerCase();
  return ccBulks.filter(function(b){return (!kind||b.kind===kind)&&ccBulkVisible(b)&&(!ccBulkStatusF||b.status===ccBulkStatusF)
    &&(!q||[expKey(b),b.fileName,caN(b.createdBy)].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}));});
}
function ccBulkApply(){ccBulkQ=lpSearchValue('ccb-f-q');const s=getCSValue('ccb-f-status');ccBulkStatusF=s==='All Statuses'?'':s||'';ccBulkSel=null;renderADTPage();}
function ccBulkReset(){ccBulkQ='';ccBulkStatusF='';ccBulkSel=null;renderADTPage();}
function ccBulkStat(s){ccBulkStatusF=ccBulkStatusF===s?'':s;ccBulkSel=null;renderADTPage();}
/* kind null: Bulk Files - enrollment and load files in one list, with a Type column (product owner, 11 Nov 2026). */
function ccBulkListHTML(kind){
  const def=kind?CC_BULK[kind]:{prefix:'ALL',label:'Bulk'},both=!kind,all=ccBulks.filter(function(b){return (both||b.kind===kind)&&ccBulkVisible(b);}),rows=ccBulkShown(kind);
  if(ccBulkSel!=null&&!rows.some(function(b){return b.id===ccBulkSel;}))ccBulkSel=null;
  const pgn=listPage('cards-bulk-'+def.prefix,[ccBulkQ,ccBulkStatusF].join('|'),rows.map(function(b,i){
    const s=ccBulkSummary(b);
    return '<tr class="ccb-row'+(ccBulkSel===b.id?' lp-row-selected':'')+'" id="ccb-row-'+b.id+'" style="cursor:pointer" onclick="ccBulkOpen('+b.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-main ax-c-link">'+ccE(expKey(b))+'</div><div class="lp-c-sub">'+ccE(b.fileName)+' · '+ccE(b.format)+'</div></td>'
      +(both?'<td><div class="lp-c-plain">'+(b.kind==='bulk card load'?'Card Loads':'Card Enrollment')+'</div></td>':'')
      +'<td><div class="lp-c-plain">'+s.rows+(s.rows===1?' row':' rows')+'</div><div class="lp-c-sub">'+s.valid+' valid · '+s.invalid+' invalid'+(s.created?' · '+s.created+' created':'')+(s.failed?' · '+s.failed+' failed':'')+'</div></td>'
      +(kind==='bulk card load'||both?'<td class="exp-c-amt">'+(b.kind==='bulk card load'?ccE(expMoney(s.requested,b.currency)):'<span class="wb-muted">—</span>')+'</td>':'')
      +'<td><div class="lp-c-plain">'+ccE(caN(b.createdBy))+'</div><div class="lp-c-sub">'+ccE(b.createdAt)+'</div></td>'
      +'<td>'+axBadge(statusTone(b.status),b.status)+'</td><td class="ca-c-stage">'+(b.wf&&b.wf.open?caStageCell(b):'<span class="wb-muted">—</span>')+'</td></tr>';
  }),ccEmpty(both?8:kind==='bulk card load'?7:6,both?'No bulk file yet. Upload an enrollment file or a load file.':'No '+def.label.toLowerCase()+' file yet.'));
  const cnt=function(s){return all.filter(function(b){return b.status===s;}).length;};
  const tile=function(s,tone){return caStat(s,cnt(s),ccBulkStatusF===s,'ccBulkStat(\''+s+'\')',tone);};
  const tiles=tile('Draft','idle')+tile('Awaiting Approval')+tile('Approved','ok')+tile('Partially Approved','ok')+tile('Rejected','bad');
  return ccFilterBar(lpSearchField('ccb-f-q',ccBulkQ,'Search file, ID or uploader','ccBulkApply()')
      +apCS('ccb-f-status',['Draft','Awaiting Approval','Follow-Up','Approved','Partially Approved','Processed','Rejected','Withdrawn','Discarded'],ccBulkStatusF,'All Statuses')
      +clearFiltersBtn([ccBulkQ,ccBulkStatusF],'ccBulkReset()')+'<button class="lp-pill-search" onclick="ccBulkApply()">Search</button>',tiles)
    +(both?'':'<div class="wb-note">'+(kind==='bulk card load'
      ?'Every row is checked like a single load. One file-level approval covers the rows whose own Card Load route is the same; any other row goes through its own route. Each approved row becomes its own load with its own reference, executed and verified separately. Benefit wallets load from Benefit Loads, not from a file.'
      :'Every row is checked like a single card request. An independent checker approves the file row by row; each approved row then becomes its own card request and goes through the card request route, including the employee\'s reporting manager.')+'</div>')
    +ccSplit('ccb','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>File</th>'+(both?'<th>Type</th>':'')+'<th>Rows</th>'+(kind==='bulk card load'||both?'<th>Requested</th>':'')+'<th>Uploaded By</th><th>Status</th><th>Current Stage</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,ccBulkSel!=null,renderCcbSidebar);
}
function ccBulkOpen(id,tab){
  const b=ccBulk(id);if(!b||!ccBulkVisible(b)){showToast('Not available','error','This file is outside your access.');return;}
  const want=b.kind==='bulk card load'?['loads','bulk']:['requests','bulk'];
  if(page!=='cards'||ccPageTab!==want[0]||(want[0]==='loads'?ccLoadSub:ccReqSub)!=='bulk'){ccOpenBulkUI(id,tab);return;}
  ccBulkTab=tab||sbKeepTab(ccBulkSel,ccBulkTab);ccBulkSel=b.id;
  const sb=document.getElementById('ccb-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('ccb',renderCcbSidebar);
  document.querySelectorAll('.ccb-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='ccb-row-'+id);});
}
function ccBulkClose(){ccBulkSel=null;const sb=document.getElementById('ccb-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.ccb-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccBulkNav(t){ccBulkTab=t;isbTab('ccb',renderCcbSidebar);}
function ccOpenBulkUI(id,tab){
  const b=ccBulk(id);if(!b)return;
  if(!ccBulkVisible(b)){showToast('Not available','error','This file is outside your access.');return;}
  ccCloseForms();
  if(b.kind==='bulk card load'){ccPageTab='loads';ccLoadSub='bulk';}else{ccPageTab='requests';ccReqSub='bulk';}
  ccBulkQ='';ccBulkStatusF='';ccBulkSel=b.id;ccBulkTab=tab||'basic-details';ccBulkRowF='';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function renderCcbSidebar(){
  const b=ccBulk(ccBulkSel);if(!b)return '';
  if(!ccBulkVisible(b))return '<div class="lp-isb-body"><div class="wb-empty-sm">This file is not available to you.</div></div>';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'rows',label:'Rows'},{id:'approval',label:'Approval'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  if(!tabs.some(function(t){return t.id===ccBulkTab;}))ccBulkTab='basic-details';
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(b.fileName),meta:[expKey(b),ccE(CC_BULK[b.kind].label)],status:axBadge(statusTone(b.status),b.status)});
  let body;
  if(ccBulkTab==='rows')body=hero+ccBulkRowsHTML(b);
  else if(ccBulkTab==='approval')body=hero+(b.wf?caApprovalTabHTML(b):'<div class="wb-note"><div class="wb-note-sub">'+(b.status==='Processed'?'No file-level approval: every row went through its own route.':'The file has not been submitted.')+'</div></div>');
  else if(ccBulkTab==='logs')body=lpLogsView(b.logs,'');
  else if(ccBulkTab==='history')body=sbHistoryHTML(b);
  else if(ccBulkTab==='workflow')body=wfTimelineHTML(ccWfRows(b));
  else body=hero+ccBulkBasicHTML(b);
  return axTabBar('ccb',tabs,ccBulkTab,'ccBulkNav','ccBulkClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function ccBulkActions(b){
  const out=[],add=function(l,call,pr){out.push(ccBtn(l,call,pr));},can=ccCan(CC_BULK[b.kind].perm),id=b.id,s=ccBulkSummary(b);
  if(b.status==='Draft'&&can){add('Submit','ccBulkSubmitClick('+id+')',true);add('Upload Corrected File','ccBulkStart(\''+b.kind+'\','+id+')');add('Discard','ccLxOpen(\'b-discard\','+id+')');}
  if(typeof caCanWithdraw==='function'&&b.wf&&caCanWithdraw(b))add('Withdraw','caActOpen(\'withdraw\','+id+')');
  if(can&&s.failed&&['Approved','Partially Approved','Processed'].indexOf(b.status)>=0)add('Retry Failed Rows','ccBulkRetryClick('+id+')',true);
  if(b.kind==='bulk card load'&&ccCan('card.load.create')&&(s.loads||[]).some(function(l){return l.exec&&CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed&&!ccLoadExecAwaiting(l);}))add('Record Execution for All','ccLxOpen(\'b-record\','+id+')');
  if(b.kind==='bulk card load'&&ccCan('card.load.verify')&&(s.loads||[]).some(function(l){return !!ccLoadExecAwaiting(l);}))add('Verify All Awaiting','ccBulkVerifyClick('+id+')');
  return out.join('');
}
function ccBulkBasicHTML(b){
  const s=ccBulkSummary(b),act=ccBulkActions(b),def=CC_BULK[b.kind],ld=b.kind==='bulk card load';
  const st=function(l,n,tone){return caStat(l,n,false,'',tone||'info');};
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(b.status==='Draft'&&s.invalid?'<div class="wb-note is-wait"><b>'+s.invalid+' row'+(s.invalid===1?' has':'s have')+' errors</b><div class="wb-note-sub">Invalid rows are never processed. Correct them on the Rows tab, exclude them, or upload a corrected file; valid rows can be submitted now.</div></div>':'')
    +'<div class="listing-stats exp-stats cc-bulk-stats">'+st('Rows',s.rows)+st('Valid',s.valid,'ok')+st('Invalid',s.invalid,s.invalid?'bad':'idle')+st('Excluded',s.excluded,'idle')+st('Skipped',s.skipped,'idle')
      +(b.status!=='Draft'?st('Awaiting Approval',s.pending,'wait')+st('Created',s.created,'ok')+st('Failed',s.failed,s.failed?'bad':'idle')+st('Rejected',s.rejected,s.rejected?'bad':'idle'):'')+'</div>'
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'File ID',expKey(b))
    +axField(AX_ICO.fBox,'File',ccE(b.fileName)+' <span class="ax-sub">'+ccE(b.format)+(b.uploads.length>1?' · '+b.uploads.length+' uploads':'')+'</span>')
    +axField(AX_ICO.fUser,'Uploaded By',ccE(caN(b.createdBy))+' <span class="ax-sub">'+ccE(b.createdAt)+(b.actualBy?' · through Switch User by '+ccE(caN(b.actualBy)):'')+'</span>')
    +axField(AX_ICO.fTag,'Type',ccE(def.label))
    +(ld?axField(AX_ICO.fCash,'Requested Amount',ccE(expMoney(s.requested,b.currency)))+axField(AX_ICO.fCash,'Recorded (verified)',ccE(expMoney(s.recorded,b.currency)))
      +axField(AX_ICO.fCash,CC_DEMO,ccE(expMoney(s.demo,b.currency))+' <span class="ax-sub">no money moved</span>'):axField(AX_ICO.fTag,'Default Request Reason',ccE(b.defaultReason)))
    +axField(AX_ICO.fCheck,'Status',ccE(b.status))
    +(b.checkedBy&&b.checkedBy.length?axField(AX_ICO.fUser,'Approved By',ccE(caNs(b.checkedBy))):'')
    +(b.unknownCols&&b.unknownCols.length?axField(EXP_ICO.note,'Ignored Columns',ccE(b.unknownCols.join(', ')),true):'')
    +'</div>'
    +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Upload History</span></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>File</th><th>Rows</th><th>Uploaded</th></tr></thead><tbody>'
    +b.uploads.map(function(u){return '<tr><td>'+ccE(u.file)+' <span class="ax-sub">'+ccE(u.format)+'</span></td><td>'+u.rows+'</td><td>'+ccE(caN(u.by))+' <span class="ax-sub">'+ccE(u.at)+'</span></td></tr>';}).join('')+'</tbody></table></div>';
}
function ccBulkRowCells(b,r){
  const d=r.data;
  if(b.kind==='bulk card enrollment')return '<td>'+ccE(d.empId)+'<div class="ax-sub">'+ccE(r.parsed?idEmpName(r.parsed.employeeEid):'')+'</div></td><td>'+ccE(d.programme)+'<div class="ax-sub">'+ccE(d.cardType)+' · '+ccE(d.action)+'</div></td>';
  return '<td>'+ccE(d.empId)+'<div class="ax-sub">'+ccE(d.card)+'</div></td><td>'+ccE(d.wallet)+'<div class="ax-sub">'+ccE(d.amount?d.amount+' '+d.currency:'—')+' · ref '+ccE(d.ref||'—')+'</div></td>';
}
function ccBulkRowsTable(b,rows,editable){
  if(!rows.length)return '';
  return '<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-bulk-rows"><thead><tr><th>Row</th><th>'+(b.kind==='bulk card enrollment'?'Employee':'Employee · Card')+'</th><th>'+(b.kind==='bulk card enrollment'?'Programme · Type':'Wallet · Amount')+'</th><th>Status</th><th>Detail</th>'+(editable?'<th></th>':'')+'</tr></thead><tbody>'
    +rows.map(function(r){
      const st=ccBulkRowState(b,r),ref=st.ref;
      const detail=r.errors.length&&!r.result?ccE(r.errors.join(' ')):st.ref?'<button class="att-link" onclick="'+(b.kind==='bulk card enrollment'?'ccOpenReqUI':'ccOpenLoadUI')+'('+ref.id+')">'+ccE(expKey(ref))+'</button> · '+ccE(st.detail)
        :ccE(st.detail||(r.warnings.length?'Warning: '+r.warnings.join(' '):''));
      let act='';
      if(editable&&!(r.result&&r.result.refId)){
        if(r.status!=='Excluded')act+='<button class="att-link" onclick="ccBulkRowStart('+b.id+','+r.n+')">Edit</button>';
        if(b.status==='Draft')act+=(r.status==='Excluded'?'<button class="att-link" onclick="ccBulkIncludeClick('+b.id+','+r.n+')">Include</button>':'<button class="att-link" onclick="ccLxOpenRow(\'b-exclude\','+b.id+','+r.n+')">Exclude</button>');
      }
      return '<tr'+(r.status==='Invalid'&&!r.result?' class="cc-row-bad"':'')+'><td><b>'+r.n+'</b></td>'+ccBulkRowCells(b,r)+'<td>'+axBadge(statusTone(st.status),st.status)+'</td><td>'+detail+'</td>'+(editable?'<td><div class="cc-row-acts">'+act+'</div></td>':'')+'</tr>';
    }).join('')+'</tbody></table></div>';
}
function ccBulkRowsHTML(b){
  const can=ccCan(CC_BULK[b.kind].perm),edit=can&&['Draft','Follow-Up'].indexOf(b.status)>=0;
  if(b.status==='Draft'){
    const bad=b.rows.filter(function(r){return r.status==='Invalid';}),good=b.rows.filter(function(r){return r.status==='Valid';}),other=b.rows.filter(function(r){return ['Excluded','Skipped'].indexOf(r.status)>=0;});
    return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Rows with errors ('+bad.length+')</span></div>'+(ccBulkRowsTable(b,bad,edit)||'<div class="wb-empty-sm">None.</div>')
      +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Valid rows ('+good.length+')</span></div>'+(ccBulkRowsTable(b,good,edit)||'<div class="wb-empty-sm">None yet.</div>')
      +(other.length?'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Excluded or skipped ('+other.length+')</span></div>'+ccBulkRowsTable(b,other,edit):'');
  }
  const opts=['All rows','Awaiting Approval','Created','Routed individually','Failed','Rejected','Invalid','Excluded','Skipped'];
  const rows=b.rows.filter(function(r){const s=ccBulkRowState(b,r).status;return !ccBulkRowF||ccBulkRowF==='All rows'||s===ccBulkRowF;});
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Rows</span><span>'+apCS('ccb-rowf',opts,ccBulkRowF||'All rows','All rows','ccBulkRowFilter')+'</span></div>'
    +(ccBulkRowsTable(b,rows,edit)||'<div class="wb-empty-sm">No row matches.</div>');
}
function ccBulkRowFilter(){const v=getCSValue('ccb-rowf');ccBulkRowF=v==='All rows'?'':v||'';isbTab('ccb',renderCcbSidebar);}
function ccLxOpenRow(act,id,n){ccLxOpen(act,id);ccLx.row=n;renderADTPage();}
function ccBulkIncludeClick(id,n){const e=ccBulkRowExclude(id,n,false,'');if(e){showToast('Not saved','error',e);return;}renderADTPage();showToast('Row included','success','Row '+n+' is '+ccBulk(id).rows.find(function(r){return r.n===n;}).status+'.');}
function ccBulkSubmitClick(id){
  const e=ccBulkSubmit(id);if(e){showToast('Not submitted','error',e);return;}
  const b=ccBulk(id),s=ccBulkSummary(b),st=caActiveStage(b);renderADTPage();
  showToast(b.status==='Processed'?'Rows sent on their own routes':'File submitted','success',expKey(b)+': '+(st?s.submitted+' row(s) with Stage '+st.n+' · '+caNs(st.approvers):'every row went through its own route')+(s.routed?'; '+s.routed+' row(s) on their own Card Load route':'')+'. Nothing is issued or loaded by approval.');
}
function ccBulkRetryClick(id){const r=ccBulkRetry(id);if(r.error){showToast('Not retried','error',r.error);return;}renderADTPage();showToast('Retried','success',r.made+' created, '+r.failed+' still failed (reasons on each row).');}
function ccBulkVerifyClick(id){const r=ccBulkExecVerify(id);if(r.error){showToast('Not verified','error',r.error);return;}renderADTPage();showToast('Verified','success',r.done.length+' verified'+(r.errors.length?'; '+r.errors.length+' not: '+r.errors.join(' '):'')+'.');}
/* Row correction popup. */
function ccBulkRowStart(id,n){const b=ccBulk(id),r=b&&b.rows.find(function(x){return x.n===n;});if(!r)return;ccBulkRowForm={id:id,n:n,data:Object.assign({},r.data)};renderADTPage();}
function ccBulkRowClose(){ccBulkRowForm=null;renderADTPage();}
function ccBulkRowHTML(){
  const F=ccBulkRowForm,b=ccBulk(F.id),def=CC_BULK[b.kind],r=b.rows.find(function(x){return x.n===F.n;});
  const body='<div class="ep-form-grid">'+def.cols.map(function(c){return ccField(c[1],!!c[2],ccInput('ccbr-'+c[0],F.data[c[0]],''));}).join('')
    +(r.errors.length?'<div class="ep-form-group ep-form-full"><div class="wb-note is-bad"><b>Current errors</b><div class="wb-note-sub">'+ccE(r.errors.join(' '))+'</div></div></div>':'')+'</div>';
  return bgModal('Correct Row '+F.n+' · '+expKey(b),'The row is checked again on save; the change is kept with its before and after.',body,{close:'ccBulkRowClose()',btns:'<button class="ep-save-btn" onclick="ccBulkRowSave()">Save Row</button>'});
}
function ccBulkRowSave(){
  const F=ccBulkRowForm;if(!F)return;const b=ccBulk(F.id),d={};
  CC_BULK[b.kind].cols.forEach(function(c){const v=ccVal('ccbr-'+c[0]);if(v!=null)d[c[0]]=v;});
  const e=ccBulkRowEdit(F.id,F.n,d);if(e){showToast('Not saved','error',e);return;}
  const r=b.rows.find(function(x){return x.n===F.n;});ccBulkRowForm=null;renderADTPage();
  showToast('Row '+F.n+' saved','success','Now '+r.status+(r.errors.length?': '+r.errors.join(' '):'')+'.');
}
/* Upload popup: template, default reason, file. A good file becomes a draft whose panel is the preview. */
function ccBulkStart(kind,replaceId){
  const def=CC_BULK[kind];if(!def||!ccCan(def.perm)){emsDeny('upload bulk '+(def?def.noun:'')+' files');return;}
  ccBulkForm={kind:kind,replaceId:replaceId||null,defaultReason:'',comments:'',error:'',busy:false};renderADTPage();
}
function ccBulkFormClose(){ccBulkForm=null;renderADTPage();}
function ccBulkTemplateClick(fmt){const n=ccBulkTemplate(ccBulkForm.kind,fmt);if(n)showToast('Template downloaded','success',n+(ccBulkForm.kind==='bulk card load'?' lists the cards that can be loaded now; fill the amounts you load.':'.'));}
function ccBulkFormHTML(){
  const F=ccBulkForm,def=CC_BULK[F.kind],enr=F.kind==='bulk card enrollment';
  const body='<div class="ep-form-grid">'
    +ccField('Template',false,'<span class="ca-actions">'+ccBtn('Download XLSX','ccBulkTemplateClick(\'xlsx\')')+ccBtn('Download CSV','ccBulkTemplateClick(\'csv\')')+'</span>',
      'Columns: '+def.cols.map(function(c){return c[1]+(c[2]?'*':'');}).join(', ')+'. * required.',true)
    +(enr&&!F.replaceId?ccField('Request Reason for Rows Without One',true,apCS('ccbf-reason',CC_REQ_REASONS,F.defaultReason,'Select','ccBulkFormHook')):'')
    +ccField('File',true,'<label class="att-zone ax-img-zone"><input type="file" accept=".csv,.xlsx" hidden onchange="ccBulkFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">'+(F.busy?'Reading…':'Click to upload')+'</span><span class="att-zone-hint"> · .csv or .xlsx, up to '+CC_BULK_MAX_ROWS+' rows</span></span></label>','',true)
    +(F.error?'<div class="ep-form-group ep-form-full"><div class="wb-note is-bad"><b>The file was not accepted</b><div class="wb-note-sub">'+ccE(F.error)+'</div></div></div>':'')
    +'<div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">Every row is validated first; the same file is never processed twice.</div></div></div></div>';
  return bgModal((F.replaceId?'Upload Corrected File · '+expKey(ccBulk(F.replaceId)):'Upload '+def.label+' File'),'',body,{close:'ccBulkFormClose()',btns:''});
}
function ccBulkFormHook(){if(!ccBulkForm)return;const v=document.getElementById('csw-ccbf-reason')?getCSValue('ccbf-reason'):null;if(v!=null)ccBulkForm.defaultReason=v;renderADTPage();}
function ccBulkFile(input){
  const fl=input.files&&input.files[0];input.value='';if(!fl||!ccBulkForm)return;
  const F=ccBulkForm;if(document.getElementById('csw-ccbf-reason'))F.defaultReason=getCSValue('ccbf-reason')||F.defaultReason;
  F.busy=true;F.error='';renderADTPage();
  return fl.arrayBuffer().then(function(buf){return ccBulkRead(F.kind,fl.name,buf);}).then(function(parsed){return ccBulkAccept(parsed);})
    .catch(function(err){if(ccBulkForm){ccBulkForm.busy=false;ccBulkForm.error=err&&err.message||String(err);renderADTPage();}});
}
function ccBulkAccept(parsed){
  const F=ccBulkForm;if(!F)return;F.busy=false;
  if(F.replaceId){const e=ccBulkReplace(F.replaceId,parsed);if(e){F.error=e;renderADTPage();return;}const b=ccBulk(F.replaceId);ccBulkForm=null;ccOpenBulkUI(b.id,'rows');
    const s=ccBulkSummary(b);showToast('Corrected file read','success',s.valid+' valid, '+s.invalid+' invalid row(s).');return;}
  const res=ccBulkCreate(F.kind,parsed,{defaultReason:F.defaultReason});
  if(res.error){F.error=res.error;renderADTPage();return;}
  ccBulkForm=null;ccOpenBulkUI(res.rec.id,'rows');
  const s=ccBulkSummary(res.rec);showToast('File read','success',expKey(res.rec)+': '+s.rows+' rows · '+s.valid+' valid · '+s.invalid+' invalid'+(s.skipped?' · '+s.skipped+' skipped':'')+'. Review the rows, then submit.');
}
function ccBulkReviewInfoHTML(r){
  const s=ccBulkSummary(r),inv=(r.lines||[]).map(function(l){const row=r.rows.find(function(x){return x.n===l.row;});const v=row?(r.kind==='bulk card enrollment'?ccBulkEnrRow(r,row):ccBulkLoadRow(r,row)):{errors:['missing']};
    return v.skip||v.errors.length?'Row '+l.row+': '+(v.skip||v.errors.join(' ')):'';}).filter(Boolean);
  return '<div class="wb-note'+(inv.length?' is-bad':'')+'"><b>'+ccE(r.title)+'</b><div class="wb-note-sub">'+s.submitted+' row(s) for review'+(s.invalid?'; '+s.invalid+' invalid row(s) were not submitted':'')+(s.routed?'; '+s.routed+' row(s) went through their own route':'')
    +(r.kind==='bulk card load'?' · '+ccE(expMoney((r.lines||[]).reduce(function(a,l){return a+l.amount;},0),r.currency)):'')
    +'<br>Decide the file as a whole, or each row (lines). '+(r.kind==='bulk card load'?'Each approved row becomes its own load, executed and verified separately.':'Each approved row becomes its own card request with the employee\'s reporting manager and a card approver.')
    +(inv.length?'<br><b>Check now: '+ccE(inv.join(' · '))+'</b>':'<br>Check now: every submitted row passes.')+'</div></div>';
}

/* ── Benefit Loads: approved Wallet & Benefits batches → loads, without a second approval ── */
function ccBenefitHTML(){
  const bs=ccBenefitBatches(),can=ccCan('card.load.create');
  /* Counted with the funding source the Review & Generate window proposes (the programme's default). */
  const ps=ccProgs().filter(function(p){return p.fundingMode!=='Corporate'&&ccProgFunding(p).sourceId;}),dsrc=ps.length?ccProgFunding(ps[0]).sourceId:'';
  const rows=bs.map(function(b,i){
    const plan=ccBenefitPlan(b.id,dsrc),cnt=function(s){return plan.rows?plan.rows.filter(function(x){return x.status===s;}).length:0;};
    return '<tr><td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-main">'+ccE(b.key)+'</div><div class="lp-c-sub">'+ccE(wbPeriodLabel(b.period))+' · approved by '+ccE(b.approvedBy||'')+'</div></td>'
      +'<td>'+b.rows.filter(function(r){return r.status==='Planned';}).length+'</td><td>'+cnt('Eligible')+'</td><td>'+cnt('Loaded')+'</td><td>'+cnt('Skipped')+'</td>'
      +'<td>'+(can?ccBtn('Review &amp; Generate','ccBenOpen('+b.id+')',cnt('Eligible')>0):'')+'</td></tr>';
  }).join('');
  return '<div class="wb-note">Benefit wallets are loaded only from <b>approved</b> allocation batches; each load is still executed and verified.</div>'
    +'<div class="lp-table-card" style="margin-top:14px"><table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Allocation Batch</th><th>Allocations</th><th>Ready to Load</th><th>Loaded</th><th>Skipped</th><th>Action</th></tr></thead><tbody>'
    +(rows||ccEmpty(7,'No approved allocation batch in Wallet &amp; Benefits for this entity.'))+'</tbody></table></div>';
}
function ccBenOpen(id){if(!ccCan('card.load.create')){emsDeny('create card loads');return;}const b=wbBatches.find(function(x){return x.id===id;});
  const ps=ccProgs().filter(function(p){return p.fundingMode!=='Corporate'&&ccProgFunding(p).sourceId;});ccBenForm={batchId:id,sourceId:ps.length?ccProgFunding(ps[0]).sourceId:''};renderADTPage();}
function ccBenClose(){ccBenForm=null;renderADTPage();}
function ccBenHook(){const v=document.getElementById('csw-ccben-src')?getCSValue('ccben-src'):null;if(v!=null){const s=fbSourcesHere(true).find(function(x){return fbSourceLabel(x)===v;});ccBenForm.sourceId=s?s.id:'';}renderADTPage();}
function ccBenHTML(){
  const F=ccBenForm,plan=ccBenefitPlan(F.batchId,F.sourceId),track=typeof fbTrackingOn==='function'&&fbTrackingOn(ccEnt()),srcs=fbSourcesHere(true),src=F.sourceId?fbSource(F.sourceId):null;
  if(plan.error)return bgModal('Benefit Loads',ccE(plan.error),'',{close:'ccBenClose()',btns:''});
  const b=plan.batch,el=plan.rows.filter(function(x){return x.status==='Eligible';});
  const body='<div class="ep-form-grid">'+ccField('Funding Source',track,apCS('ccben-src',['None'].concat(srcs.map(fbSourceLabel)),src?fbSourceLabel(src):'None','Select','ccBenHook'),(track?'Required: funding-source tracking is on.':'Optional.')+' A verified execution posts one entry to it.',true)+'</div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Allocation</th><th>Employee</th><th>Category · Wallet</th><th>Amount</th><th>Card</th><th>Status</th></tr></thead><tbody>'
    +plan.rows.map(function(x){return '<tr><td>'+ccE(x.row.key)+'</td><td>'+ccE(x.row.empName)+'</td><td>'+ccE(x.row.categoryName)+' <span class="ax-sub">'+ccE(x.row.walletType?wbTypeName(x.row.walletType):'claim-based')+'</span></td>'
      +'<td>'+ccE(wbMoney(x.row.amount))+'</td><td>'+ccE(x.card?ccCardLabel(x.card):'—')+'</td><td>'+axBadge(statusTone(x.status),x.status)+(x.reason?'<div class="ax-sub">'+ccE(x.reason)+'</div>':'')+'</td></tr>';}).join('')
    +'</tbody></table></div>';
  return bgModal('Benefit Loads · '+ccE(b.key)+' ('+ccE(wbPeriodLabel(b.period))+')','Approved by '+ccE(b.approvedBy||'')+'. '+el.length+' allocation(s) ready to load; each becomes its own load awaiting execution. No second approval; execution is verified separately.',body,
    {close:'ccBenClose()',btns:el.length?'<button class="ep-save-btn" onclick="ccBenSave()">Create '+el.length+' Load'+(el.length===1?'':'s')+'</button>':''});
}
function ccBenSave(){
  const F=ccBenForm;if(!F)return;
  const res=ccBenefitGenerate(F.batchId,{sourceId:F.sourceId});if(res.error){showToast('Not created','error',res.error);return;}
  ccBenForm=null;ccLoadSub='loads';renderADTPage();
  showToast(res.created.length+' benefit load'+(res.created.length===1?'':'s')+' created','success',(res.created.map(expKey).join(', ')||'None')+(res.skipped.length?'; '+res.skipped.length+' skipped (reasons in Benefit Loads)':'')+'. Each awaits execution.');
}

/* ── Card panel: the card's loads (FR-CC-13.15); employee and administrator alike. New Load opens its form in this tab
   (product owner, 11 Nov 2026); what is in each wallet is in the Wallets tab. ── */
function ccCardLoadsHTML(c){
  if(ccLoadForm&&ccLoadForm.inPanel&&ccLoadForm.cardId===c.id)return ccLoadFormHTML();
  const ls=ccLoadsOfCard(c.id).filter(ccLoadVisible),can=ccCan('card.load.create')&&ccCardUsable(c);
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Loads</span>'
      +(can?'<span class="ca-actions">'+ccBtn('New Load','ccLoadStart(null,{cardId:'+c.id+'})',true)+'</span>':'<span class="ax-count">'+ls.length+' load'+(ls.length===1?'':'s')+'</span>')+'</div>'
    +(ls.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>Load</th><th>Wallet</th><th>Amount</th><th>Status</th><th>Origin</th></tr></thead><tbody>'
      +ls.map(function(l){return '<tr><td><button class="att-link" onclick="ccOpenLoadUI('+l.id+')">'+ccE(expKey(l))+'</button><div class="ax-sub">'+ccE(l.createdAt.split(' | ')[0])+'</div></td><td>'+ccE(wbTypeName(l.wallet))+'</td>'
        +'<td>'+ccE(expMoney(l.amount,l.currency))+'</td><td>'+ccLoadBadge(l)+'</td><td>'+ccE(ccOriginText(l))+'</td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No load for this card yet.</div>');
}

/* ── Requests & Enrollment: Requests | Bulk Enrollment Files ── */
function ccReqSubs(){
  const s=[['requests',ccAdminView()?'Requests':'My Requests']];
  if(ccAdminView()&&['card.enrollment.bulk','card.view.all','card.request.approve'].some(ccCan))s.push(['bulk','Bulk Enrollment Files']);
  return s;
}
function ccReqSubPick(k){if(ccReqSub===k)return;ccCloseForms();ccReqSel=null;ccBulkSel=null;ccReqSub=k;renderADTPage();}
function ccReqSubStrip(){
  const subs=ccReqSubs();if(subs.length<2)return '';
  return ccSubStrip(subs,ccReqSub,'ccReqSubPick',ccCan('card.enrollment.bulk')?ccBtn('Upload Bulk Enrollment File','ccBulkStart(\'bulk card enrollment\')'):'');
}
function ccReqBulkPageHTML(){return '<div class="lp-page">'+dashboardBackHTML()+ccRqStrip()+ccBulkListHTML(null)+'</div>';}   // Bulk Files: enrollment and load files together

/* ── Programme form: Card Funding & Loads (FR-CC-12) ── */
function ccProgFundingFormHTML(f){
  const fd=f.funding||ccFundNorm({}),srcs=fbSourcesHere(true),src=fd.sourceId?fbSource(fd.sourceId):null,wfs=ccWfOptions('Card Load'),wf=fd.loadWorkflowId?caWfRec(Number(fd.loadWorkflowId)):null;
  const mc=typeof bgCfg==='function'?bgCfg(ccEnt()):{};
  return '<div class="ep-form-group ep-form-full"><div class="lp-sb-section-title" style="margin-top:6px">Card Funding &amp; Loads</div></div>'
    +ccField('Default Funding Source',false,apCS('ccp-fsrc',['None'].concat(srcs.map(fbSourceLabel)),src?fbSourceLabel(src):'None','Select'),'Funding source proposed on new loads. No new ledger is created.')
    +ccField('Card Load Approval Workflow',false,apCS('ccp-lwf',['Newest active Card Load route'].concat(wfs.map(function(w){return caWfKey(w)+' '+w.name;})),wf?caWfKey(wf)+' '+wf.name:'Newest active Card Load route','Select'))
    +ccField('Minimum Load',false,ccInput('ccp-fmin',fd.minLoad,'No minimum'))+ccField('Maximum Load',false,ccInput('ccp-fmax',fd.maxLoad,'No maximum'))
    +ccField('Load Authorization Validity (Days)',true,ccInput('ccp-fval',fd.validityDays==null?30:fd.validityDays,'30'),'An approved load may be executed for this many days from its final approval; then its unexecuted part expires and is no longer reserved.')
    +ccField('Monthly Load Limit per Card',false,ccInput('ccp-fmon',fd.monthlyLimit,'No limit'),'Counts loads in approval and authorized, so concurrent requests cannot pass it.')
    +ccField('Individual Loads',true,apCS('ccp-find',['Allowed','Not allowed'],fd.individual?'Allowed':'Not allowed','Select'))
    +ccField('Bulk Loads',true,apCS('ccp-fbulk',['Allowed','Not allowed'],fd.bulk?'Allowed':'Not allowed','Select'))
    +ccField('Benefit Load Authorization',true,apCS('ccp-fbauth',CC_BENEFIT_AUTH,fd.benefitAuth||'Allocation batch approval','Select'),'Allocation batch approval: the approved Wallet &amp; Benefits batch (employee, wallet, amount, period) is the load authorization. Card Load route: each benefit load is also approved on the route.')
    +ccField('Benefit Load Generation',true,apCS('ccp-fben',CC_BENEFIT_GEN,fd.benefitGen,'Select'),'On approval: an approved Wallet &amp; Benefits batch creates its benefit loads at once (with the default funding source).')
    +ccField('Maker-Checker · Provider Connection',false,'<input class="ep-form-input ca-ro" readonly value="'+attrSafe('Funding maker-checker '+(mc.fundingMakerChecker?'on':'off')+' (Funding & Budgets settings) · execution always verified by another person · provider '+ccProviderStatus(f))+'">','Read-only: from the existing financial-control configuration.',true);
}
function ccProgFundingSync(f){
  if(!f||!document.getElementById('csw-ccp-fsrc'))return;
  const fd=Object.assign({},f.funding||ccFundNorm({})),cs=function(id){return getCSValue(id);};
  const s=fbSourcesHere(true).find(function(x){return fbSourceLabel(x)===cs('ccp-fsrc');});fd.sourceId=s?s.id:'';
  const w=ccWfOptions('Card Load').find(function(x){return caWfKey(x)+' '+x.name===cs('ccp-lwf');});fd.loadWorkflowId=w?w.id:'';
  fd.minLoad=ccVal('ccp-fmin');fd.maxLoad=ccVal('ccp-fmax');fd.monthlyLimit=ccVal('ccp-fmon');{const v=ccVal('ccp-fval');if(v!=null)fd.validityDays=v;}
  fd.benefitAuth=cs('ccp-fbauth')||'Allocation batch approval';fd.individual=cs('ccp-find')!=='Not allowed';fd.bulk=cs('ccp-fbulk')!=='Not allowed';fd.benefitGen=cs('ccp-fben')||'Manual';
  f.funding=fd;
}

/* ── Modals for this stage, drawn once by the page ── */
function ccLoadModalsHTML(){
  return (ccLoadForm&&!ccLoadForm.inPanel&&!ccLoadForm.inLoad?ccLoadFormHTML():'')+(ccLx?ccLxHTML():'')+(ccBulkForm?ccBulkFormHTML():'')+(ccBulkRowForm?ccBulkRowHTML():'')+(ccBenForm?ccBenHTML():'')
    +(typeof ccTxnForm!=='undefined'&&ccTxnForm?ccTxnFormHTML():'')+(typeof ccTxnAct!=='undefined'&&ccTxnAct?ccTxnActHTML():'')
    +(typeof ccStmtForm!=='undefined'&&ccStmtForm?ccStmtFormHTML():'')+(typeof ccStmtAct!=='undefined'&&ccStmtAct?ccStmtActHTML():'');
}
/* ══ 7F · Cardholder view (FR-CC-16, FR-CC-17) ═══════════════════════════════════════════════════════
   One view of one employee's corporate-card journey, built from the shared records: the employee's own
   My Cards. Actions are offered by each person's own rights and are checked again by the rules; funding
   sources never appear here. The administrators' Cards → Cardholder View was removed (product owner,
   11 Nov 2026): they open the card itself, whose panel holds the same records, its wallet balances in the
   Wallets tab. */
let ccCardsSub='cards';
function ccAddExpenseFromCards(){navigatePage('expenses');if(typeof expSetPageTab==='function')expSetPageTab('all');if(typeof startAddExpense==='function')startAddExpense();}
/* Transactions is its own menu item under Expense Management (product owner, 10 Nov 2026: js/card-transactions-nav.js),
   no longer a Cards sub-view; it still opens here (ccCardsSub 'txns'), so every link to a transaction keeps working. */
function ccCardsSubs(){return ccAdminView()?[['cards','Cards']]:[];}
function ccCardsSubPick(k){if(ccCardsSub===k)return;ccCloseForms();ccSel=null;ccCardsSub=k;renderADTPage();}
/* A link to a person's cards: the employee's own My Cards, or for anyone else that person's current card. */
function ccOpenHolderUI(eid){
  if(!ccSeesEmp(eid)){showToast('Not available','error','This cardholder is outside your access.');return;}
  const me=ccEmpOf();
  if(!ccAdminView()&&me&&me.eid===eid){ccCloseForms();ccPageTab='cards';ccSel=null;ccCardsSub='cards';if(page!=='cards')navigatePage('cards');else renderADTPage();return;}
  const cards=ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt()&&ccCardVisible(c);});
  const c=cards.filter(function(x){return !ccCardEnded(x);}).slice(-1)[0]||cards.slice(-1)[0];
  if(!c){showToast('No card yet','info',idEmpName(eid)+' has no corporate card yet.');return;}
  ccOpenCardUI(c.id);
}
function ccHolderFig(label,v,sub){return typeof advCard==='function'?advCard(label,v,sub):'<div class="wb-proj-card"><span>'+label+'</span><b>'+v+'</b><em>'+(sub||'')+'</em></div>';}
function ccHolderProvider(c){
  const p=ccProg(c.programmeId),st=ccProviderStatus(p);
  return ccProviderName(c.provider)+': '+(st==='Configured'?'Not Connected':st)+(ccDemoOn(c.entity)?' · Illustrative':'');
}
/* Actions on one card for whoever is looking - each still checked by the rules when it is done. */
function ccHolderCardActions(c){
  const A=ccNow(),me=ccEmpOf(),own=!!me&&me.eid===c.employeeEid,out=[],add=function(l,call){out.push('<button class="att-link" onclick="'+call+'">'+l+'</button>');},id=c.id;
  add('Open','ccOpenCardUI('+id+')');
  if(!ccCardEnded(c)&&ccSafetyMay(A,c)){
    if(!(c.hold&&c.hold.active&&c.hold.type!=='Temporary'))add('Report Lost or Stolen','ccActOpen(\'lost\','+id+')');
    if(!(c.hold&&c.hold.active))add('Temporary Hold','ccActOpen(\'hold\','+id+')');
    if(c.hold&&c.hold.active&&c.hold.type==='Temporary'&&!c.hold.releaseRequest&&!ccCan('card.lifecycle.manage'))add('Request Hold Release','ccActOpen(\'release-request\','+id+')');
  }
  if(c.hold&&c.hold.active&&c.hold.type==='Temporary'&&ccCan('card.lifecycle.manage'))add('Review Hold','ccOpenCardUI('+id+')');
  if(['Not Issued','Issuance Pending','Replaced','Closed'].indexOf(c.status)<0&&!ccOpenReplacementOf(c.id)&&!ccRepMayRaise(A,c))add('Request Replacement','ccActOpen(\'replace\','+id+')');
  if(c.status==='Activation Pending'&&(own||ccCan('card.enrollment.manage')))add(own?'Send Me an Activation Reminder':'Send Activation Reminder','ccRemindClick('+id+')');
  return out.join(' · ');
}
function ccHolderTimeline(eid){
  const rows=[],push=function(rec,label,logs,n){(logs||[]).slice(0,n||6).forEach(function(x){rows.push({t:Date.parse(x.date+' '+x.time)||0,date:x.date,time:x.time,ref:label,text:x.action,status:x.status});});};
  ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt();}).forEach(function(c){push(c,ccCardLabel(c),c.logs,8);});
  ccRequests.filter(function(r){return r.employeeEid===eid&&r.entity===ccEnt();}).forEach(function(r){push(r,expKey(r),r.logs,4);});
  /* Loads: their status only - load logs name funding sources, which the cardholder does not see (FR-CC-16.11). */
  ccLoads.filter(function(l){return l.employeeEid===eid&&l.entity===ccEnt();}).forEach(function(l){const x=(l.logs||[])[0];if(!x)return;
    rows.push({t:Date.parse(x.date+' '+x.time)||0,date:x.date,time:x.time,ref:expKey(l),text:wbTypeName(l.wallet)+' load of '+expMoney(l.amount,l.currency)+': '+ccLoadLabel(l)+'.',status:ccLoadLabel(l)});});
  return rows.sort(function(a,b){return b.t-a.t;}).slice(0,12);
}
function ccCardholderHTML(eid){
  const e=idEmp(eid);if(!e)return '';
  if(!ccSeesEmp(eid))return '<div class="wb-empty-sm">This cardholder is not available to you.</div>';
  const A=ccNow(),me=ccEmpOf(),own=!!me&&me.eid===eid;
  const cards=ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt();}),live=cards.filter(function(c){return !ccCardEnded(c);});
  const reqs=ccRequests.filter(function(r){return r.employeeEid===eid&&r.entity===ccEnt();});
  const loads=ccLoads.filter(function(l){return l.employeeEid===eid&&l.entity===ccEnt();});
  const fig=ccCardholderFigures(eid),pend=ccPendingActions(eid),cur=fig.currency;
  /* Quick actions (FR-CC-16.09-10). */
  let qa='';
  if(ccProgs().some(function(p){return ccProgActive(p)&&!ccReqMayRaise(A,eid,p);}))qa+=ccBtn(own?'Request Card':'Request Card on Behalf','ccReqStart(null,{employeeEid:\''+eid+'\'})',true);
  if(own)qa+=ccBtn('Add Expense','ccAddExpenseFromCards()');
  const head='<div class="lp-sb-view-header cc-holder-head"><span class="lp-sb-section-title">'+(own?'My Corporate Cards':'Cardholder · '+ccE(e.name))+' <span class="ax-sub">'+ccE(e.empId||'')+(e.dept?' · '+ccE(e.dept):'')+'</span></span>'
    +(qa?'<span class="ca-actions">'+qa+'</span>':'')+'</div>';
  const figs='<div class="wb-proj-cards cc-holder-figs">'
    +ccHolderFig('Planned Benefit Entitlement',expMoney(fig.planned,cur),wbPeriodLabel(fig.period)+' · Wallet & Benefits, not money on the card')
    +ccHolderFig('Pending Loads',expMoney(fig.pending,cur),'awaiting approval')
    +ccHolderFig('Approved Loads',expMoney(fig.approved,cur),'authorized, not yet executed')
    +ccHolderFig('Recorded Loads',expMoney(fig.recorded,cur),'verified, net of reversals')
    +(fig.demo?ccHolderFig(CC_DEMO+' Loads',expMoney(fig.demo,cur),'illustrative only, no money moved'):'')+'</div>'
    +'<div class="wb-note"><div class="wb-note-sub">Records of entitlement and loads, not money remaining on the card.</div></div>';
  const pa='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Pending Actions ('+pend.length+')</span></div>'
    +(pend.length?'<div class="cc-holder-pend">'+pend.map(function(x){
      const go=x.open==='txn'&&x.rec?'<button class="att-link" onclick="ccOpenTxnUI('+x.rec.id+')">Open</button>':x.open==='exc'&&x.rec?'<button class="att-link" onclick="ccMxOpen(\'exc\',{key:\'txn:'+x.rec.id+'\'})">Provide Information</button>'
        :x.open==='dsp'&&x.rec?'<button class="att-link" onclick="ccOpenDisputeUI('+x.rec.id+')">Open Dispute</button>':x.open==='csxrec'&&x.rec?'<button class="att-link" onclick="ccCsxEmpRecOpen('+x.rec.id+','+x.rec.n+')">View Recovery</button>':x.open==='csx'&&x.rec?'<button class="att-link" onclick="ccCsxOpenUI('+x.rec.id+')">Open</button>':x.open==='card'&&x.rec?'<button class="att-link" onclick="ccOpenCardUI('+x.rec.id+')">Open</button>':x.open==='req'&&x.rec?'<button class="att-link" onclick="ccOpenReqUI('+x.rec.id+')">Open</button>'
        :x.open==='onc'&&own&&typeof navigatePage==='function'?'<button class="att-link" onclick="ccOpenOwnEnrollment()">Open Card Enrollment</button>':'';
      const rm=x.remind&&x.rec&&(own||ccCan('card.enrollment.manage'))?' · <button class="att-link" onclick="ccRemindClick('+x.rec.id+')">'+(own?'Send me a reminder':'Send a reminder')+'</button>':'';
      return '<div class="wb-note'+(x.kind==='action'?' is-wait':'')+'"><b>'+(x.kind==='action'?'Action needed':'In progress')+'</b><div class="wb-note-sub">'+ccE(x.text)+(go?' '+go:'')+rm+'</div></div>';}).join('')+'</div>'
      :'<div class="wb-empty-sm">Nothing is waiting for '+(own?'you':ccE(e.name))+'.</div>');
  const cardsT='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">'+(own?'My Cards':'Cards')+' ('+cards.length+')</span></div>'
    +(cards.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Card</th><th>Programme</th><th>Status</th><th>Activation</th><th>Controls in Effect</th><th>Provider</th><th>Actions</th></tr></thead><tbody>'
      +cards.map(function(c){
        const p=ccProg(c.programmeId),r=ccReq(c.requestId),s=ccCardCtl(c);
        const flags=[c.hold&&c.hold.active?(c.hold.type==='Temporary'?'temporary hold':'reported '+c.hold.reason.toLowerCase()):'',c.pending?c.pending.action.toLowerCase()+' pending':''].filter(Boolean);
        return '<tr><td><b>'+ccE(ccMask(c.last4))+'</b><div class="ax-sub">'+ccE(expKey(c))+' · '+ccE(c.type)+' · '+ccE(c.currency)+'</div></td>'
          +'<td>'+ccE(p?p.code:'')+'<div class="ax-sub">'+ccE(p?p.name:'')+'</div></td>'
          +'<td>'+axBadge(statusTone(c.status),c.status)+'<div class="ax-sub">'+ccE(c.source)+(flags.length?' · '+ccE(flags.join(', ')):'')+'</div></td>'
          +'<td>'+ccE(c.status==='Active'||c.status==='Suspended'?'Confirmed':c.status==='Activation Pending'?'Pending':ccCardEnded(c)?'—':(r&&r.enr?r.enr.activation:'Pending'))+'</td>'
          +'<td>'+ccE(s?ccCtlSummary(s,c.currency):'Not set')+'</td><td>'+ccE(ccHolderProvider(c))+'</td><td>'+ccHolderCardActions(c)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">'+(own?'You have no corporate card yet.':ccE(e.name)+' has no corporate card yet.')+'</div>');
  /* Wallet breakup across live cards: planned entitlement and loads by wallet - never a balance. */
  const wr=[];
  live.forEach(function(c){
    ccWalletEntitlements(c,fig.period).forEach(function(w){
      const ls=loads.filter(function(l){return l.cardId===c.id&&l.wallet===w.code;});
      const s=function(f){return ccM(ls.reduce(function(n,l){return n+(f(l)||0);},0));};
      wr.push({c:c,w:w,pend:s(function(l){return ['Awaiting Approval','Follow-Up'].indexOf(l.status)>=0?l.cardAmount:0;}),
        appr:s(function(l){return l.exec&&CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed&&l.exec.demo!==true?ccToCard(l,ccLoadRemaining(l)):0;}),
        rec:s(function(l){return l.exec&&l.exec.demo===false?ccToCard(l,l.exec.recorded-(l.exec.reversed||0)):0;}),
        demo:s(function(l){return l.exec&&l.exec.demo===true?ccToCard(l,l.exec.recorded-(l.exec.reversed||0)):0;})});
    });
  });
  const walletT=wr.length?'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Wallet Breakup</span></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Card · Wallet</th><th>Basis</th><th>Planned ('+ccE(wbPeriodLabel(fig.period))+')</th><th>Pending</th><th>Approved</th><th>Recorded</th></tr></thead><tbody>'
    +wr.map(function(x){return '<tr><td>'+ccE(ccMask(x.c.last4))+' · <b>'+ccE(x.w.name)+'</b></td><td>'+ccE(x.w.benefit?(x.w.cats.map(function(k){return k.name;}).join(', ')||'Benefit'):'Corporate funding')+'</td>'
      +'<td>'+(x.w.benefit?(x.w.eligible?ccE(wbMoney(x.w.planned)):'Not entitled'):'—')+'</td><td>'+ccE(expMoney(x.pend,x.c.currency))+'</td><td>'+ccE(expMoney(x.appr,x.c.currency))+'</td>'
      +'<td>'+ccE(expMoney(x.rec,x.c.currency))+(x.demo?'<div class="ax-sub">'+ccE(expMoney(x.demo,x.c.currency))+' '+CC_DEMO+'</div>':'')+'</td></tr>';}).join('')+'</tbody></table></div>':'';
  const loadT='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Loads ('+loads.length+')</span></div>'
    +(loads.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Load</th><th>Card · Wallet</th><th>Amount</th><th>Status</th><th>Requested</th></tr></thead><tbody>'
      +loads.slice(0,12).map(function(l){const c=ccCard(l.cardId);return '<tr><td>'+ccE(expKey(l))+'</td><td>'+ccE(c?ccMask(c.last4):'')+' · '+ccE(wbTypeName(l.wallet))+'</td><td>'+ccE(expMoney(l.amount,l.currency))
        +(l.exec&&l.exec.reversed?'<div class="ax-sub">'+ccE(expMoney(l.exec.reversed,l.currency))+' reversed</div>':'')+'</td><td>'+ccLoadBadge(l)+'</td><td>'+ccE(l.createdAt.split(' | ')[0])+'</td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No load yet.</div>');
  const reqT='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Card Requests ('+reqs.length+')</span></div>'
    +(reqs.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Request</th><th>Programme · Type</th><th>Status</th><th>Raised</th></tr></thead><tbody>'
      +reqs.map(function(r){const p=ccProg(r.programmeId),t=ccReqTrack(r);return '<tr><td><button class="att-link" onclick="ccOpenReqUI('+r.id+')">'+ccE(expKey(r))+'</button><div class="ax-sub">'+ccE(r.kind==='card replacement'?'Replacement':'New card')+'</div></td>'
        +'<td>'+ccE(p?p.code:'')+' · '+ccE(r.cardType)+'</td><td>'+axBadge(statusTone(t),t)+(r.enr&&['Completed','Cancelled'].indexOf(r.enr.status)<0?'<div class="ax-sub">Enrollment '+ccE(r.enr.status)+' · KYC '+ccE(r.enr.kyc)+'</div>':'')+'</td>'
        +'<td>'+ccE(r.createdAt.split(' | ')[0])+'<div class="ax-sub">'+ccE(r.mode==='On Behalf'?'by '+caN(r.createdBy):r.mode==='Automatic'?'issued automatically':'self-request')+'</div></td></tr>';}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No card request yet.</div>');
  const u=idUserOfEmp(eid),notes=(typeof notifData!=='undefined'?notifData:[]).filter(function(n){return (n.to||[]).indexOf(u)>=0&&(!n.entity||n.entity===ccEnt())&&/^(CRD|CRQ|CRP|CLD|ENR|CTL)-|card/i.test(String(n.cid||'')+' '+String(n.name||''));}).slice(0,2);
  const tl=ccHolderTimeline(eid);
  const histT='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Card History</span></div>'
    +(tl.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>Record</th><th>What Happened</th></tr></thead><tbody>'
      +tl.map(function(x){return '<tr><td>'+ccE(x.date)+'<div class="ax-sub">'+ccE(x.time)+'</div></td><td>'+ccE(x.ref)+'</td><td>'+ccE(x.text)+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="wb-empty-sm">No card history yet.</div>')
    +(notes.length?'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Recent Card Notifications</span></div>'
      +notes.map(function(n){return '<div class="wb-note"><div class="wb-note-sub">'+ccE(n.name)+(n.cid?' <span class="ax-sub">'+ccE(n.cid)+'</span>':'')+'</div></div>';}).join(''):'');
  return '<div class="cc-holder">'+head+figs+pa+cardsT+walletT+(typeof ccHolderTxnsHTML==='function'?ccHolderTxnsHTML(eid,own):'')+loadT+reqT+histT+'</div>';
}
/* The employee's own card enrollment (ONC): details and declarations are theirs to complete. */
function ccOpenOwnEnrollment(){
  const me=ccEmpOf();if(!me)return;
  const row=typeof oncEmpOf==='function'?oncEmpOf(me.eid):null;
  navigatePage('employees');
  if(row&&typeof openDeSidebar==='function'){openDeSidebar(row.id);if(typeof navDeTab==='function')navDeTab('onc-card');}
}

function ccDemoSetupBtnHTML(){
  const d=ccCfg().demoSetup;
  if(d)return '<div class="wb-note-sub">Illustrative cardholder data: loaded '+ccE(d.at)+' for '+ccE(idEmpName(d.employeeEid))+(d.incomplete?' (stopped: '+ccE(d.incomplete)+')':'')+'</div>';
  return '<div class="wb-note-sub">Illustrative cardholder data for one eligible Active employee. No funding is posted. '
    +'<button class="att-link" onclick="ccDemoSetupClick()">Load Illustrative Cardholder Data</button></div>';
}
function ccDemoSetupClick(){
  const r=ccDemoSetup();refreshCsSidebar();
  if(r.error){showToast('Not set up','error',r.error);return;}
  showToast('Illustrative data ready','success',r.employee.name+': '+r.rec.records.join(', ')+'. Open Corporate Cards → Cards → Cardholder View, or switch to Employee.');
}
/* ══ 7G · Integration screens: expense lines paid by card, exit clearance, references, authorization validity ══ */
sbToneAdd({expired:'bad',cleared:'ok','cleared-by-exception':'wait',withdrawn:'idle','exit-clearance':'wait'});
/* ── The existing expense line: Corporate Card, the card that paid and the card-funded part ── */
function ccExpCardLabel(c){return ccMask(c.last4)+' · '+expKey(c)+' · '+((ccProg(c.programmeId)||{}).code||'')+' · '+c.status;}
function ccExpLineFieldsHTML(d,cur){
  if(d.paidBy!==CC_PAID_CARD)return '';
  if(Number(d.txnId)&&typeof ccExpTxnLineHTML==='function')return ccExpTxnLineHTML(d,cur);
  const ctx=typeof expLineCtx!=='undefined'?expLineCtx:{},cards=ccExpCardsFor(ctx.eid,d.start||''),c=d.cardId?ccCard(d.cardId):null;
  const amt=parseFloat(d.amount)||0,ca=d.cardAmount===''||d.cardAmount==null?(amt?String(amt):''):String(d.cardAmount),cn=parseFloat(ca)||0;
  return '<div class="ep-form-group"><label class="ep-form-label">Corporate Card <span class="req">*</span></label>'
      +apCS('exp-l-card',cards.map(ccExpCardLabel),c?ccExpCardLabel(c):'',cards.length?'Select card':(d.start?'No card of this employee was active on that date':'Enter the Start Date first'),'expFormHook')
      +'<div class="ea-hint">The claimant\'s own cards that were active on the expense date; a card suspended or closed since then still counts for an earlier expense.</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-cardamt">Card-Funded Amount <span class="req">*</span></label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input" id="exp-l-cardamt" type="number" min="0" step="0.01" value="'+attrSafe(ca)+'" placeholder="0.00" onchange="expFormHook()"></div>'
      +'<div class="ea-hint">What the card paid. It is matched to the card transaction and is never reimbursed.</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employee-Paid Amount</label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input ca-ro" readonly value="'+(amt?expMoney(Math.max(0,Math.round((amt-cn)*100)/100)):'')+'" placeholder="Line amount minus the card-funded amount"></div>'
      +'<div class="ea-hint">Only this part can be reimbursed.</div></div>';
}
function ccExpLineSync(t){
  if(!t)return;
  if(t.paidBy!==CC_PAID_CARD){t.cardId='';t.cardAmount='';if(t.txnId){t.txnId=null;t.txnAt='';}return;}
  const ctx=typeof expLineCtx!=='undefined'?expLineCtx:{};
  if(document.getElementById('csw-exp-l-card')){const v=getCSValue('exp-l-card'),c=ccCardsOfEmp(ctx.eid).find(function(x){return ccExpCardLabel(x)===v;});t.cardId=c?c.id:'';}
  const el=document.getElementById('exp-l-cardamt');if(el)t.cardAmount=el.value.trim();
}
function ccExpLinePaidText(l,r){
  if(l.paidBy!==CC_PAID_CARD)return '';
  const ref=l.cardRef?ccMask(l.cardRef.last4)+' · '+l.cardRef.key:'card';
  return ' <span class="ax-sub">'+ccE(ref)+' · card '+expMoney(l.cardAmount,r.currency)+' · employee '+expMoney(Math.max(0,Number(l.amount)-Number(l.cardAmount||0)),r.currency)+'</span>';
}
function ccOpenExpense(id){navigatePage('expenses');if(typeof expSetPageTab==='function')expSetPageTab('all');if(typeof openExpSidebar==='function')openExpSidebar(id,'summary');}

/* ── Exit card clearance on the card panel ── */
function ccClearanceHTML(c){
  const cl=c.clearance;if(!cl)return '<div class="wb-empty-sm">No exit clearance for this card.</div>';
  const A=ccNow(),may=!ccClearanceMay(A,c),items=ccClearanceItems(c),open=items.filter(function(x){return !x.done;});
  let act='';
  if(may){
    if(c.type==='Physical'&&!cl.returned)act+=ccBtn('Record Card Return','ccActOpen(\'cl-return\','+c.id+')');
    if(ccCan('card.lifecycle.manage')&&!ccCardEnded(c)&&!(c.pending&&c.pending.action==='Close')&&ccCanMove(c,'Closed'))act+=ccBtn('Request Closure','ccActOpen(\'request\','+c.id+',\'Close\')');
    if(!open.length)act+=ccBtn('Confirm Clearance','ccActOpen(\'cl-confirm\','+c.id+')',true);
    act+=ccBtn('Record Exception','ccActOpen(\'cl-exception\','+c.id+')');
  }
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +'<div class="wb-note'+(cl.status==='Open'?' is-wait':'')+'"><b>Exit card clearance: '+ccE(cl.status)+'</b><div class="wb-note-sub">Opened '+ccE(cl.openedAt)+(cl.lwd?' · last working day '+ccE(cdLabel(cl.lwd)):'')
      +'. It never holds up the HR offboarding steps. New ordinary loads stopped when the offboarding began; the card and all its history are kept.'
      +(cl.status==='Cleared'?' Confirmed by '+ccE(caN(cl.confirmedBy))+' '+ccE(cl.confirmedAt)+'.':'')
      +(cl.exception?' Exception by '+ccE(caN(cl.exception.by))+' '+ccE(cl.exception.at)+': '+ccE(cl.exception.reason)+(cl.exception.open.length?' (open then: '+ccE(cl.exception.open.join('; '))+')':''):'')+'</div></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Requirement</th><th>State</th><th>Detail</th></tr></thead><tbody>'
    +items.map(function(x){return '<tr><td>'+ccE(x.label)+'</td><td>'+axBadge(x.done?'ok':'wait',x.done?'Done':'Open')+'</td><td>'+ccE(x.note)+'</td></tr>';}).join('')+'</tbody></table></div>';
}

/* ── References: the chain behind the card (FR-CC-27) ── */
/* The card's References tab was removed (product owner, 11 Nov 2026); ccCardRefs stays in the engine. */

/* ── The load: its authorization validity, re-raise and late execution ── */
function ccLoadValidityText(l){
  if(!l.exec||!l.exec.expiresOn)return '—';
  return (l.exec.expired?'Expired '+cdLabel(l.exec.expired.on):'Valid until '+cdLabel(l.exec.expiresOn))+' · '+l.exec.validityDays+' days from the final approval on '+cdLabel(l.exec.authAt);
}


/* ══ 7H · Reports, approved card funding on expense lines, re-raise chains ══ */
sbToneAdd({open:'wait',withdrawn:'idle','provisional':'wait'});

/* ── Expense lines paid by card: actual payment vs approved allocation (B7-N23) ── */
function ccExpLineApprovedHTML(l,r){
  if(l.paidBy!==CC_PAID_CARD)return '';
  const el=l.cardRef&&l.cardRef.elig;
  const same=el&&/became Active at (\d\d:\d\d)/.exec(el.text||'');
  let h=el?axField(AX_ICO.fCheck,'Card Eligibility',(el.provisional?'Provisional':'Checked')+' <span class="ax-sub">'+(el.provisional?(same?'card activated '+same[1]+' that day; ':'')+'confirmed by the card transaction':'at the transaction time')+'</span>'):'';
  const mh=typeof ccExpLineMatchHTML==='function'?ccExpLineMatchHTML(l,r):'';
  const s=ccLineSplit(l,r);if(!s.final)return h+mh;
  h+=axField(AX_ICO.fCash,'Approved Funding','card '+expMoney(s.approvedCard,r.currency)+' · employee '+expMoney(s.approvedEmployee,r.currency)
    +(s.unapprovedEmployee>0?' <span class="ax-sub">not approved: employee-paid '+expMoney(s.unapprovedEmployee,r.currency)+'</span>':''));
  if(s.unapprovedCard>0){
    const x=ccSpendExcOf(r.id,l.id);
    if(ccSpendVisible(r)||ccCan('card.csx.resolve')){const v=x&&typeof ccCsxAmounts==='function'?ccCsxAmounts(x):null;
      h+=axField(AX_ICO.fCash,'Card-Spend Exception',axBadge(statusTone(x?x.status:'Open'),x?x.status:'Open')+' '+ccE(x?expKey(x):'')+' · '+expMoney(s.unapprovedCard,r.currency)+' not approved'
        +' <span class="ax-sub">of '+expMoney(s.actualCard,r.currency)+' paid'+(v?'; outstanding '+expMoney(v.outstanding,r.currency)+(v.resolved?', resolved '+expMoney(v.resolved,r.currency):''):'')+'</span>'
        +(x&&typeof ccCsxOpenUI==='function'?' <button class="att-link" onclick="ccCsxOpenUI('+x.id+')">Open</button>':''));}
  }
  return h+mh;
}

/* ── Load panel: the re-raise chain ── */
function ccLoadChainText(l){
  const ch=ccLoadReraiseChain(l);if(ch.length<2)return '';
  return ch.map(function(n){return (n.depth?'→ ':'')+expKey(n.load)+' '+ccLoadLabel(n.load)+(n.load.id===l.id?' (this load)':'');}).join(' ');
}

/* ── Reports (FR-CC-21) ─────────────────────────────────────────────────── */
const CC_REPORTS=[['programmes','Card Programme Register'],['cards','Employee Card Register'],['enrollment','Card Enrollment Report'],['activation','Card Activation Report'],
  ['lifecycle','Card Lifecycle Report'],['controls','Card Limit & Controls Report'],['wallets','Wallet Mapping Report'],['loads','Individual Card Load Register'],
  ['bulk','Bulk Card Load Register'],['pending','Pending Load Approval Report'],['funding','Corporate Funding-to-Card Load Report'],['exceptions','Card Exception Report'],
  ['holders','Cardholder Status Report'],['audit','Card Audit Report']];
let ccRep='cards',ccRF=ccRepBlank();
function ccRepBlank(){return {emp:'',dept:'',prog:'',type:'',cstatus:'',enr:'',act:'',src:'',wallet:'',appr:'',lstatus:'',from:'',to:'',cur:'',card:''};}
function ccRepOk(id){
  if(!ccCan('card.report.view'))return false;
  if(id==='funding')return ccFundingVisible();
  if(id==='audit')return ccCan('card.audit.view');
  return true;
}
function ccRepList(){return CC_REPORTS.filter(function(r){return ccRepOk(r[0]);});}
function ccRepName(id){return (CC_REPORTS.find(function(r){return r[0]===id;})||[])[1]||'';}
const CC_MON={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
function ccIsoOfLabel(s){const m=/(\d{1,2}) (\w{3}) (\d{4})/.exec(String(s||''));return m&&CC_MON[m[2]]?m[3]+'-'+CC_MON[m[2]]+'-'+(m[1].length<2?'0':'')+m[1]:'';}
function ccRepEmpLabel(eid){const e=idEmp(eid);return e?e.name+' · '+(e.empId||''):(eid?idEmpName(eid)||'':'');}
function ccRepDept(eid){const e=idEmp(eid);return e?e.dept||'':'';}
function ccRepCard(c){return c?ccMask(c.last4)+' · '+expKey(c):'';}
function ccRepProg(id){const p=ccProg(id);return p?p.key+' · '+p.code:'';}
function ccRepSrcLabel(id){if(!id||!ccFundingVisible())return '';const s=fbSource(id);return s?s.key+' · '+s.name:'';}
function ccCardSince(c){const e=(c.events||[]).slice().reverse().find(function(x){return x.to===c.status;});return e?e.iso:'';}
function ccCardActivatedOn(c){const e=(c.events||[]).find(function(x){return x.to==='Active';});return e?e.iso:'';}
function ccRepEmpRow(eid){return {emp:ccRepEmpLabel(eid),dept:ccRepDept(eid)};}
/* Every row: v (cells), cur, f (filter fields), rec (the record), open (where a click goes). Scope: the entity, and the
   employees the person may see (own / team / all). Card references are masked; funding only with funding rights. */
function ccRepRows(id){
  const ent=ccEnt(),fin=ccFundingVisible(),rows=[],sees=function(eid){return ccSeesEmp(eid);};
  const cards=ccCards.filter(function(c){return c.entity===ent&&sees(c.employeeEid);});
  const loads=ccLoads.filter(function(l){return l.entity===ent&&sees(l.employeeEid);});
  const C=function(k,l,t){return [k,l,t||''];};
  let cols=[],note='';
  if(id==='programmes'){
    cols=[C('prog','Programme'),C('name','Name'),C('type','Type'),C('forms','Card Forms'),C('wallets','Wallets'),C('models','Eligible Models'),C('provider','Provider'),C('status','Status'),C('from','Effective From','d'),C('to','Effective To','d'),C('cards','Cards'),C('active','Active Cards')];
    ccProgs(ent).forEach(function(p){const pc=ccCards.filter(function(c){return c.programmeId===p.id;});
      rows.push({rec:p,cur:p.currency,open:null,f:{prog:p.key+' · '+p.code,cur:p.currency,date:p.effFrom||''},
        v:{prog:p.key+' · '+p.code,name:p.name,type:p.type+' · '+p.fundingMode,forms:p.forms.join(', '),wallets:p.wallets.map(wbTypeName).join(', '),models:p.models.join(', '),
          provider:p.provider?ccProviderName(p.provider)+' · '+ccProviderStatus(p):'None (internal records)',status:p.status,from:p.effFrom||'',to:p.effTo||'',cards:pc.length,active:pc.filter(function(c){return c.status==='Active';}).length}});});
  }else if(id==='cards'){
    cols=[C('card','Card'),C('type','Type'),C('prog','Programme'),C('emp','Cardholder'),C('dept','Department'),C('status','Card Status'),C('source','Confirmation Source'),C('evid','Issuance Evidence'),C('since','Status Since','d'),C('hold','ADT Hold'),C('clearance','Exit Clearance')];
    cards.forEach(function(c){rows.push({rec:c,cur:'',open:['card',c.id],f:Object.assign(ccRepEmpRow(c.employeeEid),{prog:ccRepProg(c.programmeId),type:c.type,cstatus:c.status,date:ccCardSince(c)}),
      v:{card:ccRepCard(c),type:c.type,prog:ccRepProg(c.programmeId),emp:ccRepEmpLabel(c.employeeEid),dept:ccRepDept(c.employeeEid),status:c.status,source:c.source||'',evid:ccCardEvidence(c),since:ccCardSince(c),
        hold:c.hold&&c.hold.active?(c.hold.type==='Temporary'?'Temporary hold':'Reported '+c.hold.reason.toLowerCase()):'',clearance:c.clearance?c.clearance.status:''}});});
  }else if(id==='enrollment'){
    cols=[C('req','Request'),C('kind','Type'),C('emp','Employee'),C('dept','Department'),C('prog','Programme'),C('ctype','Card Type'),C('mode','Raised'),C('appr','Approval Status'),C('track','Request Track'),C('enr','Enrollment'),C('kyc','KYC'),C('source','Enrollment Source'),C('date','Created','d')];
    ccRequests.filter(function(r){return r.entity===ent&&sees(r.employeeEid);}).forEach(function(r){const en=r.enr||null,d=(r.lines&&r.lines[0]&&r.lines[0].start)||ccIsoOfLabel(r.createdAt);
      rows.push({rec:r,cur:'',open:['req',r.id],f:Object.assign(ccRepEmpRow(r.employeeEid),{prog:ccRepProg(r.programmeId),type:r.cardType||'',appr:r.status,enr:en?en.status:'Not started',date:d}),
        v:{req:expKey(r),kind:r.kind==='card replacement'?'Replacement':'Card request',emp:ccRepEmpLabel(r.employeeEid),dept:ccRepDept(r.employeeEid),prog:ccRepProg(r.programmeId),ctype:r.cardType||'',
          mode:r.mode||'',appr:r.status,track:ccReqTrack(r),enr:en?en.status:'Not started',kyc:en?en.kyc||'':'',source:en?en.source||'':'',date:d}});});
  }else if(id==='activation'){
    cols=[C('card','Card'),C('emp','Cardholder'),C('prog','Programme'),C('type','Type'),C('act','Activation Status'),C('source','Confirmation Source'),C('activated','Activated On','d'),C('pending','Pending Since','d'),C('reminders','Reminders')];
    cards.filter(function(c){return ['Issuance Pending','Issued','Activation Pending','Active'].indexOf(c.status)>=0;}).forEach(function(c){
      const act=c.status==='Active'?'Activated':c.status==='Activation Pending'?'Activation Pending':'Not yet issued';
      rows.push({rec:c,cur:'',open:['card',c.id],f:Object.assign(ccRepEmpRow(c.employeeEid),{prog:ccRepProg(c.programmeId),type:c.type,cstatus:c.status,act:act,date:ccCardActivatedOn(c)||ccCardSince(c)}),
        v:{card:ccRepCard(c),emp:ccRepEmpLabel(c.employeeEid),prog:ccRepProg(c.programmeId),type:c.type,act:act,source:c.status==='Active'?c.source||'':'',activated:ccCardActivatedOn(c),
          pending:c.status==='Active'?'':ccCardSince(c),reminders:c.reminders||0}});});
  }else if(id==='lifecycle'){
    cols=[C('date','Date','d'),C('card','Card'),C('emp','Cardholder'),C('prog','Programme'),C('from','From'),C('to','To'),C('source','Source'),C('by','By'),C('via','Through Switch User'),C('note','Reference / Note')];
    cards.forEach(function(c){(c.events||[]).forEach(function(e){
      rows.push({rec:c,cur:'',open:['card',c.id],f:Object.assign(ccRepEmpRow(c.employeeEid),{prog:ccRepProg(c.programmeId),type:c.type,cstatus:e.to,date:e.iso}),
        v:{date:e.iso,card:ccRepCard(c),emp:ccRepEmpLabel(c.employeeEid),prog:ccRepProg(c.programmeId),from:e.from,to:e.to,source:e.source||'',by:caN(e.by),via:e.actual?caN(e.actual):'',note:[e.ref,e.note].filter(Boolean).join(' · ')}});});});
  }else if(id==='controls'){
    cols=[C('scope','Scope'),C('target','Programme / Card'),C('ver','Version'),C('status','Status'),C('perTxn','Per Transaction','m'),C('monthly','Monthly','m'),C('controls','Controls'),C('from','Effective From','d'),C('to','Effective To','d'),C('enf','Enforcement'),C('reason','Reason')];
    ccCtlVers.filter(function(v){return v.entity===ent;}).forEach(function(v){
      const p=ccProg(v.programmeId),c=v.scope==='card'?ccCard(v.targetId):null;if(c&&!sees(c.employeeEid))return;const cur=p?p.currency:'';
      rows.push({rec:v,cur:cur,open:c?['card',c.id]:null,f:Object.assign(c?ccRepEmpRow(c.employeeEid):{},{prog:ccRepProg(v.programmeId),type:c?c.type:'',date:v.effFrom||'',cur:cur}),
        v:{scope:v.scope==='card'?'Card restriction':'Programme default',target:c?ccRepCard(c)+' · '+ccRepEmpLabel(c.employeeEid):ccRepProg(v.programmeId),ver:'v'+v.n,status:v.status,
          perTxn:v.set&&v.set.perTxn!==''&&v.set.perTxn!=null?v.set.perTxn:'',monthly:v.set&&v.set.monthly!==''&&v.set.monthly!=null?v.set.monthly:'',controls:ccCtlSummary(v.set,cur),from:v.effFrom||'',to:v.effTo||'',
          enf:v.enforcement||'Not Connected',reason:v.reason||''}});});
    note='Controls are the intended controls recorded in ADT. No provider is connected, so none is live enforcement at a bank.';
  }else if(id==='wallets'){
    cols=[C('prog','Programme'),C('wallet','Wallet'),C('cls','Wallet Class'),C('kind','Load Basis'),C('cats','Wallet & Benefits Categories'),C('status','Programme Status')];
    ccProgs(ent).forEach(function(p){ccWalletMap(p).forEach(function(w){
      rows.push({rec:p,cur:p.currency,open:null,f:{prog:ccRepProg(p.id),wallet:w.name},
        v:{prog:ccRepProg(p.id),wallet:w.name+' ('+w.code+')',cls:w.cls||'',kind:w.benefit?'Approved Wallet & Benefits allocation (planned entitlement, not card funds)':'Corporate funding source',
          cats:(w.cats||[]).map(function(x){return x.name||x.label||'';}).filter(Boolean).join(', '),status:p.status}});});});
  }else if(id==='loads'||id==='pending'){
    cols=[C('load','Load'),C('date','Created','d'),C('card','Card'),C('emp','Cardholder'),C('prog','Programme'),C('wallet','Wallet'),C('origin','Origin'),C('amount','Amount','m'),C('appr','Approval Status')]
      .concat(id==='pending'?[C('stage','Current Stage'),C('waiting','Waiting Since','d')]:[C('lstatus','Load Status'),C('esrc','Execution Source'),C('recorded','Recorded (Verified)','m'),C('demo','Illustrative','m'),C('exc','Exception'),C('auth','Authorization')])
      .concat(fin?[C('src','Funding Source')]:[]);
    loads.filter(function(l){return id==='loads'||['Awaiting Approval','Follow-Up'].indexOf(l.status)>=0;}).forEach(function(l){
      const c=ccCard(l.cardId),ex=l.exec,net=ex?ccM(ex.recorded-(ex.reversed||0)):0,d=(l.lines&&l.lines[0]&&l.lines[0].start)||'';
      const st=l.wf&&l.wf.current!=null?l.wf.stages[l.wf.current]:null;
      rows.push({rec:l,cur:l.currency,open:['load',l.id],f:Object.assign(ccRepEmpRow(l.employeeEid),{prog:ccRepProg(l.programmeId),type:c?c.type:'',wallet:wbTypeName(l.wallet),src:ccRepSrcLabel(l.sourceId),
          appr:l.status,lstatus:ex?ccLoadLabel(l):l.status,date:d,cur:l.currency}),
        v:{load:expKey(l),date:d,card:ccRepCard(c),emp:ccRepEmpLabel(l.employeeEid),prog:ccRepProg(l.programmeId),wallet:wbTypeName(l.wallet),
          origin:ccOriginText(l)+(l.origin&&l.origin.reraiseKey?' · re-raise of '+l.origin.reraiseKey:''),amount:l.amount,appr:l.status,
          stage:st?'Stage '+st.n+' · '+st.name:'',waiting:st&&st.assignedAt?st.assignedAt:d,
          lstatus:ex?ccLoadLabel(l):'—',esrc:ccUniq(ccLoadExecs.filter(function(e){return e.loadId===l.id&&e.type==='execution'&&e.status!=='Rejected';}).map(function(e){return e.source;})).join(', '),recorded:ex&&!ex.demo?net:'',demo:ex&&ex.demo?net:'',exc:ccLoadExceptionText(l),auth:ex&&ex.expiresOn?ccLoadValidityText(l):'',src:ccRepSrcLabel(l.sourceId)}});});
    if(id==='loads')note='Each load is one authorization with its own reference (bulk rows become loads of their own). Recorded figures are internal records of verified executions, net of reversals; illustrative activity is reported apart; nothing here is a live card balance.';
  }else if(id==='bulk'){
    cols=[C('file','File'),C('fileName','File Name'),C('date','Uploaded','d'),C('fstatus','File Status'),C('row','Row'),C('emp','Cardholder'),C('card','Card'),C('amount','Amount','m'),C('valid','Row Validation'),C('result','Result'),C('load','Load'),C('lstatus','Load Status')];
    ccBulks.filter(function(b){return b.entity===ent&&b.kind==='bulk card load';}).forEach(function(b){
      const d=ccIsoOfLabel(b.createdAt);
      b.rows.forEach(function(r){
        const P=r.parsed||{},c=P.cardId?ccCard(P.cardId):null,l=r.result&&r.result.refId?ccLoad(r.result.refId):null,eid=l?l.employeeEid:c?c.employeeEid:'';
        if(eid&&!sees(eid))return;
        rows.push({rec:b,cur:P.currency||'',open:l?['load',l.id]:['bulk',b.id],f:Object.assign(eid?ccRepEmpRow(eid):{},{appr:b.status,lstatus:l?ccLoadLabel(l):'',date:d,cur:P.currency||''}),
          v:{file:expKey(b),fileName:b.fileName,date:d,fstatus:b.status,row:r.n,emp:eid?ccRepEmpLabel(eid):'',card:ccRepCard(c),amount:P.amount!=null?P.amount:'',valid:r.status,
            result:r.result?r.result.status+(r.result.reason?' · '+r.result.reason:''):(r.excluded?'Excluded':''),load:l?expKey(l):'',lstatus:l?ccLoadLabel(l):''}});});});
    note='One row per file row. Totals add the loads created from rows, never the file and its rows twice.';
  }else if(id==='funding'){
    cols=[C('txn','Funding Entry'),C('date','Date','d'),C('src','Funding Source'),C('dir','Direction'),C('amount','Amount','m'),C('status','Status'),C('load','Load'),C('card','Card'),C('emp','Cardholder'),C('exec','Execution'),C('note','Note')];
    if(typeof fbTxns!=='undefined')fbTxns.filter(function(t){return t.entity===ent&&t.origin&&t.origin.type==='card load';}).forEach(function(t){
      const l=ccLoad(t.origin.recId),c=l?ccCard(l.cardId):null;if(l&&!sees(l.employeeEid))return;
      const s=fbSource(t.sourceId);
      rows.push({rec:t,cur:t.currency,open:l?['load',l.id]:null,f:Object.assign(l?ccRepEmpRow(l.employeeEid):{},{src:s?s.key+' · '+s.name:'',wallet:l?wbTypeName(l.wallet):'',lstatus:l?ccLoadLabel(l):'',date:t.date,cur:t.currency,prog:l?ccRepProg(l.programmeId):''}),
        v:{txn:t.key,date:t.date,src:s?s.key+' · '+s.name:'',dir:t.dir<0?'Out (card load)':'In (reversal)',amount:t.amount,status:t.reversalOf?'Reversal of '+((fbTxn(t.reversalOf)||{}).key||''):t.status,
          load:l?expKey(l):(t.origin.recKey||''),card:ccRepCard(c),emp:l?ccRepEmpLabel(l.employeeEid):'',exec:t.origin.key||'',note:t.exception?'Reconciliation exception':''}});});
    note='Verified funding entries posted for card loads (one per verified execution or reversal). Illustrative activity never posts. Balances are internal records, not bank balances.';
  }else if(id==='exceptions'){
    cols=[C('type','Exception'),C('ref','Reference'),C('date','Date','d'),C('emp','Employee'),C('amount','Amount','m'),C('status','Status'),C('detail','Detail')];
    const add=function(type,ref,eid,date,amt,cur,status,detail,open,rec,extra){if(eid&&!sees(eid))return;
      rows.push({rec:rec,kind:type,cur:cur||'',open:open,f:Object.assign(eid?ccRepEmpRow(eid):{},{date:date,cur:cur||'',lstatus:status},extra||{}),v:{type:type,ref:ref,date:date,emp:eid?ccRepEmpLabel(eid):'',amount:amt===''||amt==null?'':amt,status:status,detail:detail}});};
    loads.forEach(function(l){const ex=l.exec,d=(l.lines&&l.lines[0]&&l.lines[0].start)||'';if(!ex)return;
      if(ex.status==='Failed')add('Failed load',expKey(l),l.employeeEid,d,l.amount,l.currency,ccLoadLabel(l),'The provider did not complete it; nothing was posted.',['load',l.id],l);
      if(ex.expired)add('Authorization expired',expKey(l),l.employeeEid,ex.expired.on,ex.expired.amount,l.currency,ccLoadLabel(l),'Unexecuted '+expMoney(ex.expired.amount,l.currency)+' released'+(l.reraises&&l.reraises.length?'; re-raised as '+l.reraises.map(function(x){return expKey(ccLoad(x)||{});}).join(', '):''),['load',l.id],l);
      ccLoadExecs.filter(function(e){return e.loadId===l.id&&(e.late||e.status==='Rejected');}).forEach(function(e){
        add(e.late?'Late execution':'Execution record rejected',expKey(e),l.employeeEid,e.date||d,e.amount,l.currency,e.status,(e.late?'Recorded after the authorization expired: '+(e.lateReason||''):'Rejected: '+(e.rejectReason||e.reason||''))+' ('+expKey(l)+')',['load',l.id],e);});});
    if(typeof fbTxns!=='undefined'&&fin)fbTxns.filter(function(t){return t.entity===ent&&t.exception&&t.origin&&t.origin.type==='card load';}).forEach(function(t){const l=ccLoad(t.origin.recId);
      add('Funding reconciliation',t.key,l?l.employeeEid:'',t.date,t.amount,t.currency,'Open',t.exception,l?['load',l.id]:null,t);});
    ccSpendExcs.filter(function(x){return x.entity===ent;}).forEach(function(x){const r=(typeof expensesData!=='undefined'?expensesData:[]).find(function(e){return e.id===x.claimId;});if(!ccSpendVisible(r))return;
      add('Card spend not approved',expKey(x),x.employeeEid,x.date,typeof ccCsxAmounts==='function'?ccCsxAmounts(x).outstanding:x.amount,x.currency,x.status+(typeof ccCsxPartial==='function'&&ccCsxPartial(x)?' · Partially Resolved':''),x.claimKey+' · "'+x.lineTitle+'" · card '+(x.cardRef?ccMask(x.cardRef.last4)+' · '+x.cardRef.key:'')+' paid '+expMoney(x.actualCard,x.currency)+', approved '+expMoney(x.approvedCard,x.currency)+(typeof ccCsxAmounts==='function'?'; outstanding '+expMoney(ccCsxAmounts(x).outstanding,x.currency)+' of '+expMoney(x.amount,x.currency)+(x.outcomes&&x.outcomes.length?' ('+x.outcomes.join(', ')+')':''):'')+'.',['claim',x.claimId],x);});
    ccBulks.filter(function(b){return b.entity===ent;}).forEach(function(b){const bad=b.rows.filter(function(r){return r.status==='Invalid'||(r.result&&r.result.status==='Failed');});
      if(bad.length)add('Bulk rows not processed',expKey(b),'',ccIsoOfLabel(b.createdAt),'','',b.status,bad.length+' row'+(bad.length===1?'':'s')+' invalid or failed: '+bad.slice(0,3).map(function(r){return 'row '+r.n+' '+((r.result&&r.result.reason)||r.errors.join(' '));}).join('; '),['bulk',b.id],b);});
    ccProgs(ent).filter(function(p){return p.status==='Active';}).forEach(function(p){const e=ccValidateProg(p,p.entity,p.id);if(e)add('Programme configuration',p.key,'',p.effFrom||'','','','Open',e,null,p,{prog:ccRepProg(p.id)});});
    cards.filter(function(c){return c.clearance&&c.clearance.status==='Open';}).forEach(function(c){add('Exit clearance open',expKey(c),c.employeeEid,ccIsoOfLabel(c.clearance.openedAt),'','','Open',ccClearanceOpenItems(c).map(function(x){return x.label;}).join('; '),['card',c.id],c);});
  }else if(id==='holders'){
    cols=[C('emp','Employee'),C('dept','Department'),C('cards','Cards'),C('active','Active'),C('actpend','Activation Pending'),C('susblk','Suspended / Blocked'),C('closed','Closed / Replaced'),C('reqs','Open Requests'),C('loads','Pending Loads'),C('clearance','Exit Clearance')];
    const eids=ccUniq(cards.map(function(c){return c.employeeEid;}).concat(ccRequests.filter(function(r){return r.entity===ent&&sees(r.employeeEid);}).map(function(r){return r.employeeEid;})));
    eids.forEach(function(eid){const mc=cards.filter(function(c){return c.employeeEid===eid;}),n=function(f){return mc.filter(f).length;};
      rows.push({rec:null,eid:eid,cur:'',open:null,f:ccRepEmpRow(eid),
        v:{emp:ccRepEmpLabel(eid),dept:ccRepDept(eid),cards:mc.length,active:n(function(c){return c.status==='Active';}),actpend:n(function(c){return c.status==='Activation Pending';}),
          susblk:n(function(c){return c.status==='Suspended'||c.status==='Blocked';}),closed:n(function(c){return ['Closed','Replaced','Expired','Not Issued'].indexOf(c.status)>=0;}),
          reqs:ccRequests.filter(function(r){return r.entity===ent&&r.employeeEid===eid&&(['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0||ccReqTrack(r)==='Enrollment Pending');}).length,
          loads:loads.filter(function(l){return l.employeeEid===eid&&['Awaiting Approval','Follow-Up'].indexOf(l.status)>=0;}).length,
          clearance:mc.some(function(c){return c.clearance&&c.clearance.status==='Open';})?'Open':mc.some(function(c){return c.clearance;})?'Done':''}});});
  }else if(id==='audit'){
    cols=[C('date','Date','d'),C('time','Time'),C('ref','Record'),C('type','Record Type'),C('emp','Employee'),C('status','Status'),C('action','Action'),C('user','By'),C('via','Actual User (Switch User)')];
    const fundRe=/\bFT-\d+|\bFS-\d+|funding source|recorded balance/i;let hidden=0;
    const push=function(rec,type,eid,logs){if(eid&&!sees(eid))return;(logs||[]).forEach(function(g){
      if(!fin&&fundRe.test(g.action||'')){hidden++;return;}
      rows.push({rec:rec,cur:'',open:type==='Card'?['card',rec.id]:type==='Card Request'||type==='Card Replacement'?['req',rec.id]:type==='Card Load'?['load',rec.id]:type==='Bulk File'?['bulk',rec.id]:null,
        f:Object.assign(eid?ccRepEmpRow(eid):{},{date:ccIsoOfLabel(g.date),appr:g.status||''}),
        v:{date:ccIsoOfLabel(g.date),time:g.time||'',ref:rec.key!=null&&rec.prefix?expKey(rec):rec.key||'',type:type,emp:eid?ccRepEmpLabel(eid):'',status:g.status||'',action:g.action||'',user:g.user||caN(g.userId),via:g.actualUserId?caN(g.actualUserId):''}});});};
    ccProgs(ent).forEach(function(p){push(p,'Programme','',p.logs);});
    push({key:'Corporate Cards settings'},'Settings','',ccCfg(ent).logs);
    ccRequests.filter(function(r){return r.entity===ent;}).forEach(function(r){push(r,r.kind==='card replacement'?'Card Replacement':'Card Request',r.employeeEid,r.logs);});
    ccCards.filter(function(c){return c.entity===ent;}).forEach(function(c){push(c,'Card',c.employeeEid,c.logs);});
    ccLoads.filter(function(l){return l.entity===ent;}).forEach(function(l){push(l,'Card Load',l.employeeEid,l.logs);});
    if(typeof ccTxns!=='undefined')ccTxns.filter(function(t){return t.entity===ent&&ccTxnVisible(t);}).forEach(function(t){push(t,'Card Transaction',t.employeeEid,t.logs);});
    if(typeof ccStmts!=='undefined')ccStmts.filter(function(s){return s.entity===ent&&ccStmtVisible(s);}).forEach(function(s){push(s,'Card Statement','',s.logs);});
    ccBulks.filter(function(b){return b.entity===ent;}).forEach(function(b){push(b,'Bulk File','',b.logs);});
    ccCtlChanges.filter(function(x){return x.entity===ent;}).forEach(function(x){push(x,'Control Change',x.employeeEid||'',x.logs);});
    ccSpendExcs.filter(function(x){return x.entity===ent;}).forEach(function(x){const r=(typeof expensesData!=='undefined'?expensesData:[]).find(function(e){return e.id===x.claimId;});if(ccSpendVisible(r))push(x,'Card Spend Exception',x.employeeEid,x.logs);});
    ccExportLog.filter(function(x){return x.entity===ent;}).forEach(function(x){rows.push({rec:x,cur:'',open:null,f:{date:x.iso},v:{date:x.iso,time:String(x.at).split(' | ')[1]||'',ref:x.report,type:'Report Export',emp:'',status:x.format,action:'Report exported: '+x.report+' ('+x.rows+' row'+(x.rows===1?'':'s')+', '+x.format+')',user:caN(x.by),via:x.actual?caN(x.actual):''}});});
    rows.sort(function(a,b){return (b.v.date+ccTime24(b.v.time)).localeCompare(a.v.date+ccTime24(a.v.time));});
    note=hidden?hidden+' log entr'+(hidden===1?'y mentions':'ies mention')+' company funding and '+(hidden===1?'is':'are')+' not shown (needs a card load or funding report right).':'';
  }
  return {cols:cols,rows:rows,note:note};
}
/* The summary cards (FR-CC-21): each figure counts the same records its drill-down lists. */
function ccRepSumText(list,amt){
  const by={};list.forEach(function(l){const a=amt(l);if(!(a>0))return;by[l.currency]=ccM((by[l.currency]||0)+a);});
  return Object.keys(by).sort().map(function(k){return expMoney(by[k],k);}).join(' · ');
}
function ccLoadNet(l){return l.exec?ccM(l.exec.recorded-(l.exec.reversed||0)):0;}
function ccLoadIsException(l){return !!ccLoadExceptionText(l);}
/* Why a load is under Exceptions - its own status is kept: a verified late execution is recorded money, never a failure. */
function ccLoadExceptionText(l){
  if(!l.exec)return '';const out=[];
  if(l.exec.status==='Failed')out.push('Failed execution');
  if(l.exec.expired)out.push('Authorization expired ('+expMoney(l.exec.expired.amount,l.currency)+' unexecuted)');
  ccLoadExecs.filter(function(e){return e.loadId===l.id&&e.late;}).forEach(function(e){out.push('Late execution '+expKey(e)+' ('+(e.status==='Verified'?'verified, recorded':e.status)+')');});
  return out.join('; ');
}
function ccCardIssued(c){return !!c&&c.status!=='Not Issued'&&(c.events||[]).some(function(e){return e.to==='Issued';});}
const CC_REP_CARDS=[
  ['requests','Total Card Requests','enrollment',function(x){return true;}],
  ['reqpending','Requests Pending Approval','enrollment',function(x){return ['Awaiting Approval','Follow-Up'].indexOf(x.rec.status)>=0;}],
  ['reqapproved','Approved Requests','enrollment',function(x){return ['Approved','Partially Approved'].indexOf(x.rec.status)>=0;}],
  ['cards','Total Assigned Cards','cards',function(x){return ccCardIssued(x.rec);},null,function(recs){const d=recs.filter(function(c){return ccCardEvidence(c)===CC_DEMO;}).length;return (recs.length-d)+' evidenced · '+d+' '+CC_DEMO;}],
  ['active','Active Cards','cards',function(x){return x.rec.status==='Active';},null,function(recs){const d=recs.filter(function(c){return ccCardEvidence(c)===CC_DEMO;}).length;return (recs.length-d)+' evidenced · '+d+' '+CC_DEMO;}],
  ['actpending','Activation Pending','activation',function(x){return x.rec.status==='Activation Pending';}],
  ['susblk','Suspended/Blocked Cards','cards',function(x){return x.rec.status==='Suspended'||x.rec.status==='Blocked';}],
  ['ldpending','Pending Card Loads','pending',function(x){return true;},function(l){return l.amount;}],
  ['ldawait','Approved Loads Awaiting Execution','loads',function(x){const e=x.rec.exec;return !!e&&!e.closed&&['Awaiting Execution','Processing','Partially Recorded'].indexOf(e.status)>=0;},function(l){return ccLoadRemaining(l);}],
  ['ldrec','Recorded Loads (verified)','loads',function(x){return !!x.rec.exec&&!x.rec.exec.demo&&ccLoadNet(x.rec)>0;},function(l){return ccLoadNet(l);}],
  ['lddemo','Illustrative Loads','loads',function(x){return !!x.rec.exec&&x.rec.exec.demo===true&&ccLoadNet(x.rec)>0;},function(l){return ccLoadNet(l);}],
  ['ldexc','Failed/Exception Loads','loads',function(x){return ccLoadIsException(x.rec);}],
  ['clearance','Cards Requiring Exit Clearance','cards',function(x){return !!x.rec.clearance&&x.rec.clearance.status==='Open';}],
  ['spend','Open Card-Spend Exceptions','exceptions',function(x){return x.kind==='Card spend not approved'&&(typeof ccCsxActive==='function'?ccCsxActive(x.rec):x.rec.status==='Open');},function(x){return typeof ccCsxAmounts==='function'?ccCsxAmounts(x).outstanding:x.amount;}],
  ['spendpart','Partially Resolved Card-Spend Exceptions','exceptions',function(x){return x.kind==='Card spend not approved'&&typeof ccCsxPartial==='function'&&ccCsxPartial(x.rec);},function(x){return ccCsxAmounts(x).outstanding;}]];
function ccRepCardValue(c){
  const R=ccRepRows(c[2]),hit=R.rows.filter(c[3]);
  const recs=hit.map(function(x){return x.rec;});
  return {n:hit.length,money:c[4]?ccRepSumText(recs,c[4]):c[5]&&hit.length?c[5](recs):''};
}
function ccRepCardsShown(){return CC_REP_CARDS.filter(function(c){return ccRepOk(c[2])&&(['spend','spendpart'].indexOf(c[0])<0||ccFundingVisible()||ccCan('expense.reimb.process'));});}
function ccRepCardOpen(id){const c=CC_REP_CARDS.find(function(x){return x[0]===id;});if(!c)return;ccRep=c[2];ccRF=ccRepBlank();ccRF.card=id;renderADTPage();}
function ccRepFiltered(){
  if(!ccRepOk(ccRep)){const l=ccRepList();ccRep=l.length?l[0][0]:'';}
  const R=ccRepRows(ccRep),F=ccRF,card=F.card?CC_REP_CARDS.find(function(c){return c[0]===F.card&&c[2]===ccRep;}):null;
  const rows=R.rows.filter(function(x){
    if(card&&!card[3](x))return false;
    const f=x.f||{};
    if(F.emp&&f.emp!==F.emp)return false;
    if(F.dept&&f.dept!==F.dept)return false;
    if(F.prog&&f.prog!==F.prog)return false;
    if(F.type&&f.type!==F.type)return false;
    if(F.cstatus&&f.cstatus!==F.cstatus)return false;
    if(F.enr&&f.enr!==F.enr)return false;
    if(F.act&&f.act!==F.act)return false;
    if(F.src&&f.src!==F.src)return false;
    if(F.wallet&&f.wallet!==F.wallet)return false;
    if(F.appr&&f.appr!==F.appr)return false;
    if(F.lstatus&&f.lstatus!==F.lstatus)return false;
    if(F.cur&&f.cur!==F.cur)return false;
    if(F.from&&(!f.date||f.date<F.from))return false;
    if(F.to&&(!f.date||f.date>F.to))return false;
    return true;
  });
  return {cols:R.cols,rows:rows,all:R.rows,note:R.note,card:card};
}
const CC_REP_FILTERS=[['emp','ccr-emp','All Employees'],['dept','ccr-dept','All Departments'],['prog','ccr-prog','All Programmes'],['type','ccr-type','All Card Types'],
  ['cstatus','ccr-cstatus','All Card Statuses'],['enr','ccr-enr','All Enrollment Statuses'],['act','ccr-act','All Activation Statuses'],['src','ccr-src','All Funding Sources'],
  ['wallet','ccr-wallet','All Wallets'],['appr','ccr-appr','All Approval Statuses'],['lstatus','ccr-lstatus','All Load Statuses'],['cur','ccr-cur','All Currencies']];
function ccRepApply(){
  CC_REP_FILTERS.forEach(function(d){const x=document.getElementById('csw-'+d[1])?getCSValue(d[1]):'';ccRF[d[0]]=x&&x!==d[2]?x:'';});
  ccRF.from=bgVal('ccr-from')||'';ccRF.to=bgVal('ccr-to')||'';renderADTPage();
}
function ccRepReset(){ccRF=ccRepBlank();renderADTPage();}
function ccRepPick(){const n=getCSValue('ccr-pick'),r=CC_REPORTS.find(function(x){return x[1]===n;});if(r&&r[0]!==ccRep){ccRep=r[0];ccRF=ccRepBlank();}renderADTPage();}
function ccRepCell(col,x){
  const v=x.v[col[0]];if(v===''||v==null)return '—';
  if(col[2]==='m')return expMoney(v,x.cur);
  if(col[2]==='d')return cdLabel(v);
  return ccE(v);
}
function ccRepOpen(i){
  const x=ccRepFiltered().rows[i];if(!x||!x.open)return;const o=x.open;
  if(o[0]==='card'){ccCloseForms();ccPageTab='cards';ccCardsSub='cards';ccOpenCardUI(o[1]);return;}
  if(o[0]==='req'){ccCloseForms();ccOpenReqUI(o[1]);return;}
  if(o[0]==='load'){ccCloseForms();ccOpenLoadUI(o[1]);return;}
  if(o[0]==='bulk'){ccCloseForms();ccOpenBulkUI(o[1]);return;}
  if(o[0]==='claim'){ccOpenExpense(o[1]);return;}
}
function ccReportsHTML(){
  const list=ccRepList();
  if(!list.length)return '<div class="lp-page"><div class="wb-empty"><b>Not available for your role</b><span>Card reports need card.report.view.</span></div></div>';
  const F=ccRepFiltered(),name=ccRepName(ccRep),canX=ccCan('card.report.export');
  const tiles=ccRepCardsShown().map(function(c){const v=ccRepCardValue(c);return advCard(c[1],String(v.n),v.money||'',"ccRepCardOpen('"+c[0]+"')");}).join('');
  const has=function(k){return F.all.some(function(x){return x.f&&x.f[k];});};
  const opts=function(k){const o=[];F.all.forEach(function(x){const v=x.f&&x.f[k];if(v&&o.indexOf(v)<0)o.push(v);});return o.sort();};
  const pgn=listPage('cc-report-'+ccRep,JSON.stringify(ccRF),F.rows.map(function(x,i){
    return '<tr'+(x.open?' style="cursor:pointer" onclick="ccRepOpen('+i+')"':'')+'><td class="lp-c-n">'+(i+1)+'</td>'+F.cols.map(function(c){return '<td class="'+(c[2]==='m'?'exp-c-amt ':'')+'exp-c-nw"><div class="lp-c-plain">'+ccRepCell(c,x)+'</div></td>';}).join('')+'</tr>';
  }),ccEmpty(F.cols.length+1,'No record matches this report and filter.'));
  return '<div class="lp-page">'
    +'<div class="wb-proj-cards adv-cards bg-cards cc-rep-cards">'+tiles+'</div>'
    +'<div class="wb-note">Recorded figures for '+ccE(idEntityName(ccEnt()))+'; Illustrative loads are counted apart; nothing here is a live card balance.'
      +(ccFundingVisible()?'':' Company funding sources are not shown for your role.')+'</div>'
    +ccFilterBar(apCS('ccr-pick',list.map(function(r){return r[1];}),name,'Select report','ccRepPick')
      /* Card reports keep every filter FR-CT-23.03 requires (card, merchant, status, source, employee, wallet). */
      +CC_REP_FILTERS.filter(function(d){return has(d[0]);}).map(function(d){return apCS(d[1],opts(d[0]),ccRF[d[0]],d[2]);}).join('')
      +(has('date')?apCD('ccr-from',ccRF.from,'From date')+apCD('ccr-to',ccRF.to,'To date'):'')
      +clearFiltersBtn(Object.keys(ccRF).map(function(k){return ccRF[k];}),'ccRepReset()')
      +'<button class="lp-pill-search" onclick="ccRepApply()">Search</button>')
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+ccE(name)+' <span class="ax-count">'+F.rows.length+'</span>'
      +(F.card?' <span class="adv-chip">'+ccE(F.card[1])+' <button onclick="ccRF.card=\'\';renderADTPage()" title="Remove">×</button></span>':'')+'</span>'
      +(canX?'<span class="ca-actions"><span class="ea-hint">Export Filtered (header) downloads these rows as CSV.</span>'+ccBtn('Download XLSX','ccExportXlsx()')+ccBtn('Print View','ccReportPrint()')+'</span>'
        :'<span class="ea-hint">Export needs card.report.export.</span>')+'</div>'
    +(F.note?'<div class="ea-hint" style="margin:0 0 8px">'+ccE(F.note)+'</div>':'')
    +'<div class="lp-table-card adv-report"><table class="lp-table ax-table exp-table"><thead><tr><th>S. No</th>'+F.cols.map(function(c){return '<th>'+c[1]+'</th>';}).join('')+'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager+'</div>'
    +'</div>';
}
/* Exports: exactly the rows on screen (same scope and filters), masked card references, recorded in the audit. */
function ccExportRows(){
  const F=ccRepFiltered(),money=F.cols.some(function(c){return c[2]==='m';});
  const head=['S.No','Entity'].concat(F.cols.map(function(c){return c[1];})).concat(money?['Currency']:[]);
  const rows=F.rows.map(function(x,i){return [i+1,idEntityName(ccEnt())].concat(F.cols.map(function(c){const v=x.v[c[0]];return v==null?'':v;})).concat(money?[x.cur]:[]);});
  return {F:F,head:head,rows:rows,name:ccRepName(ccRep)};
}
function ccExportGuard(){
  if(ccPageTab!=='reports'){showToast('Nothing to export','info','Export is available on the Reports tab.');return false;}
  if(!ccCan('card.report.export')){emsDeny('export card reports');return false;}
  return true;
}
function ccExport(){
  if(!ccExportGuard())return;
  const X=ccExportRows();if(!X.rows.length){showToast('Nothing to export','info','No record matches this report.');return;}
  wbCSV('cards-'+ccRep,X.head,X.rows);ccExportRecord(X.name,X.rows.length,'CSV');
  showToast('Export ready','success',X.name+': '+X.rows.length+' row'+(X.rows.length===1?'':'s')+' exported (CSV).');
}
function ccExportXlsx(){
  if(!ccExportGuard())return;
  const X=ccExportRows();if(!X.rows.length){showToast('Nothing to export','info','No record matches this report.');return;}
  tsxSave(tsxWorkbook([{name:'Report',title:X.name,meta:[idEntityName(ccEnt())+' · exported '+cdLabel(wbToday())+' by '+caN(idMe()),'Card references are masked. Internal records, not live card balances.'],
    columns:X.head.map(function(h){return {label:h,w:Math.max(10,Math.min(40,h.length+4))};}),rows:X.rows}]),'cards-'+ccRep+'-'+wbToday()+'.xlsx');
  ccExportRecord(X.name,X.rows.length,'XLSX');
  showToast('Export ready','success',X.name+': '+X.rows.length+' row'+(X.rows.length===1?'':'s')+' exported (XLSX).');
}
function ccReportPrintHTML(){
  const X=ccExportRows();
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+ccE(X.name)+'</title><style>body{font-family:Inter,Arial,sans-serif;font-size:11px;color:#0f172a;margin:24px}h1{font-size:16px;margin:0 0 4px}p{color:#475569;margin:0 0 12px}'
    +'table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f1f5f9}</style></head><body>'
    +'<h1>'+ccE(X.name)+'</h1><p>'+ccE(idEntityName(ccEnt()))+' · '+ccE(cdLabel(wbToday()))+' · '+X.rows.length+' row'+(X.rows.length===1?'':'s')+' · card references masked · internal records, not live card balances</p>'
    +'<table><thead><tr>'+X.head.map(function(h){return '<th>'+ccE(h)+'</th>';}).join('')+'</tr></thead><tbody>'
    +X.rows.map(function(r){return '<tr>'+r.map(function(v){return '<td>'+ccE(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></body></html>';
}
function ccReportPrint(){
  if(!ccExportGuard())return;
  const X=ccExportRows();if(!X.rows.length){showToast('Nothing to print','info','No record matches this report.');return;}
  const w=window.open('','_blank');
  if(!w){showToast('Print view blocked','error','Allow pop-ups for ADT to open the print view.');return;}
  w.document.write(ccReportPrintHTML());w.document.close();ccExportRecord(X.name,X.rows.length,'Print');
  try{w.focus();w.print();}catch(e){}
}


/* ══ Build 8A · Card transactions: register under Cards, card panel tab, My Cards, Company Settings timezone ══ */
sbToneAdd({'pending-authorization':'wait',posted:'ok',declined:'bad',voided:'idle','under-review':'wait',verified:'ok',rejected:'bad',unmatched:'idle','not-reconciled':'idle'});
let ccTxnSel=null,ccTxnTab='basic-details',ccTxnQ='',ccTxnStatusF='',ccTxnVerF='',ccTxnClassF='',ccTxnForm=null,ccTxnAct=null;
/* Who sees a transaction (FR-CT-07, D15): own; team corporate-expense spend only (never benefit-wallet merchant
   activity); the entity with view.all. Funding is never part of a transaction view. */
function ccTxnVisible(t){
  if(!t||t.entity!==ccEnt())return false;
  if(ccCan('card.transaction.view.all'))return true;
  const me=ccEmpOf();if(me&&me.eid===t.employeeEid&&ccCan('card.transaction.view.own'))return true;
  return ccCan('card.transaction.view.team')&&t.walletClass==='Company Expense'&&typeof caManagerOf==='function'&&caManagerOf(t.employeeEid)===idMe();
}
function ccTxnAdminView(){return ['card.transaction.view.all','card.transaction.view.team','card.transaction.record','card.transaction.verify'].some(ccCan);}
/* The Transactions page is showing (Expense Management → Transactions; internally Corporate Cards' 'txns' view). */
function ccTxnPageOn(){return typeof page!=='undefined'&&page==='cards'&&ccPageTab==='cards'&&typeof ccCardsSub!=='undefined'&&ccCardsSub==='txns'&&ccAdminView()&&ccTxnAdminView();}
function ccTxnBadge(s){return axBadge(statusTone(s),s);}
function ccTxnWhen(t){return cdLabel(t.date)+(t.time?' '+t.time+(t.tz?' ('+t.tz+')':''):'');}
function ccTxnAmt(t){return (t.direction==='Credit'?'Credit ':'')+expMoney(t.amount,t.currency)+(t.currency!==t.billCurrency?' · billed '+expMoney(t.billAmount,t.billCurrency):'');}
function ccTxnFlags(t){
  const f=[];if(t.eligibility&&t.eligibility.exception)f.push('Eligibility exception');else if(t.eligibility&&t.eligibility.provisional)f.push('Eligibility provisional');
  if(t.dupReview&&t.dupReview.status==='Open')f.push('Duplicate review');if(t.pendingPost)f.push('Posting awaits verification');
  if(ccTxnOutcomeLabel(t))f.push(ccTxnOutcomeLabel(t));if((t.discrepancies||[]).some(function(x){return x.status==='Open';}))f.push('Source discrepancy');return f;
}
function ccTxnShown(){
  const q=String(ccTxnQ||'').trim().toLowerCase();
  return ccTxns.filter(function(t){
    if(!ccTxnVisible(t))return false;
    if(q&&![expKey(t),t.merchant,t.name,t.empId,t.extRef,t.cardRef&&t.cardRef.last4,t.cardRef&&t.cardRef.key].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccTxnStatusF==='__twe__'){if(!ccTwe8H(t))return false;}
    else if(ccTxnStatusF==='__dispute__'){if(!ccDspActive8H(t).length)return false;}
    else if(ccTxnStatusF==='__exception__'){if(!(t.eligibility&&t.eligibility.exception))return false;}
    else if(ccTxnStatusF==='__review__'){if(!(t.verify.status===CCT_UNDER||t.pendingPost))return false;}
    else if(ccTxnStatusF&&t.status!==ccTxnStatusF&&ccTxnVerifyLabel(t)!==ccTxnStatusF)return false;
    if(ccTxnVerF&&ccTxnVerifyLabel(t)!==ccTxnVerF)return false;
    if(ccTxnClassF&&t.walletClass!==ccTxnClassF)return false;
    return true;
  });
}
function ccTxnApply(){ccTxnView='list';ccTxnQ=lpSearchValue('ctx-f-q');const s=getCSValue('ctx-f-status'),v=getCSValue('ctx-f-ver'),k=getCSValue('ctx-f-class');
  ccTxnStatusF=s==='All Statuses'?'':s||'';ccTxnVerF=v==='All Verification'?'':v||'';ccTxnClassF=k==='All Wallet Classes'?'':k||'';ccTxnSel=null;renderADTPage();}
function ccTxnReset(){ccTxnView='list';ccTxnQ='';ccTxnStatusF='';ccTxnVerF='';ccTxnClassF='';ccTxnSel=null;renderADTPage();}
function ccTxnStat(s){ccTxnView='list';ccTxnStatusF=ccTxnStatusF===s?'':s;ccTxnSel=null;renderADTPage();}
/* A payment's status as the screens show it (product owner, 11 Nov 2026): Dispute while a dispute on it is open, Resolved
   once it is resolved; otherwise its own status. The record's status is unchanged. */
function ccTxnDspLatest(t){return t&&t.direction!=='Credit'&&typeof ccDspOfTxn==='function'?ccDspOfTxn(t,true).filter(function(d){return d.status!=='Draft'&&ccDspVisible(d);})[0]||null:null;}
function ccTxnShownStatus(t){
  const d=ccTxnDspLatest(t);if(!d)return t.status;
  if(DSP_ACTIVE.indexOf(d.status)>=0)return 'Dispute';
  return d.status==='Withdrawn'&&!(d.closed&&/^Resolved by the cardholder/.test(d.closed.reason||''))?t.status:'Resolved';
}
function ccTxnShownBadge(t){const s=ccTxnShownStatus(t);return axBadge(s==='Dispute'?'wait':s==='Resolved'?'ok':statusTone(s),s);}
function ccTxnPageHTML(){
  const all=ccTxns.filter(ccTxnVisible),rows=ccTxnShown();
  if(ccTxnSel!=null&&!rows.some(function(t){return t.id===ccTxnSel;}))ccTxnSel=null;
  let act='';
  /* Record Transaction is the + in the top bar (ccCanAddHere / ccStartAddHere), product owner, 13 Nov 2026. */
  if(ccCan('card.demo.simulate')&&ccDemoOn()&&ccCards.some(function(c){return c.entity===ccEnt()&&ccCardEvidence(c)===CC_DEMO&&ccCardVisible(c);}))act+='<button class="att-link" onclick="ccTxnFormOpen(\'simulate\')">'+CC_ICO.plus+'Add Illustrative Transaction</button>';
  const pgn=listPage('cards-txns',[ccTxnQ,ccTxnStatusF,ccTxnVerF,ccTxnClassF].join('|'),rows.map(function(t,i){
    return '<tr class="ctx-row'+(ccTxnSel===t.id?' lp-row-selected':'')+'" id="ctx-row-'+t.id+'" style="cursor:pointer" onclick="ccTxnOpen('+t.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(expKey(t))+'</div><div class="lp-c-sub">'+ccE(ccTxnWhen(t))+(t.postDate?' · posted '+ccE(cdLabel(t.postDate)):'')+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(t.name)+'</div><div class="lp-c-sub">'+ccE(ccMask(t.cardRef.last4)+' · '+t.cardRef.key)+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(wbTypeName(t.wallet))+'</div><div class="lp-c-sub">'+ccE(t.walletClass)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(t.merchant)+'</div><div class="lp-c-sub">'+ccE([t.mcc,t.country,t.channel].filter(Boolean).join(' · '))+'</div></td>'
      +'<td class="exp-c-amt">'+ccE(expMoney(t.amount,t.currency))+(t.currency!==t.billCurrency?'<div class="lp-c-sub">billed '+ccE(expMoney(t.billAmount,t.billCurrency))+'</div>':'')+'</td>'
      +'<td>'+ccTxnShownBadge(t)+'</td>'   // the status alone, no line under it (product owner, 14 Nov 2026); Reconciliation stays in the panel
      /* Actions (product owner, 10 Nov 2026): the ☰ opens the transaction's panel, as a click on the row does. The checks
         the old Verification column listed stay in the panel and in the tiles (Awaiting Verification, Eligibility Exceptions…). */
      +'<td onclick="event.stopPropagation()"><button type="button" class="ct-dots-btn" title="View Details" aria-label="View '+attrSafe(expKey(t))+'" onclick="ccTxnOpen('+t.id+')">'+(typeof EMS_DOTS!=='undefined'?EMS_DOTS:'&#9776;')+'</button></td></tr>';
  }),ccEmpty(8,'No card transaction matches. Transactions are recorded from external evidence or created from verified card statements (Card Loads → Statements & Reconciliation).'));
  const cnt=function(f){return all.filter(f).length;};
  const tiles=caStat('Pending Authorization',cnt(function(t){return t.status==='Pending Authorization';}),ccTxnStatusF==='Pending Authorization','ccTxnStat(\'Pending Authorization\')','wait')
    +caStat('Awaiting Verification',cnt(function(t){return t.verify.status===CCT_UNDER||!!t.pendingPost;}),ccTxnStatusF==='__review__','ccTxnStat(\'__review__\')','wait')
    +caStat('Verified',cnt(function(t){return t.verify.status===CCT_VERIFIED;}),ccTxnStatusF===CCT_VERIFIED,'ccTxnStat(\''+CCT_VERIFIED+'\')','ok')
    /* Four boxes beside the filters, as on every listing (product owner, 13 Nov 2026): the Illustrative box (shown with no
       label in the presentation) and Eligibility Exceptions are left out; an exception still shows on its transaction. */
    +ccTxnKpi8H(all);   // Expense Matching is not on the Transactions screens (product owner, 11 Nov 2026): no Matching Exceptions box
  return '<div class="lp-page">'+dashboardBackHTML()+ccSubStrip([],ccCardsSub,'ccCardsSubPick',act)   // its own page: no sub-tabs; disputes are on their payments
    +ccFilterBar(lpSearchField('ctx-f-q',ccTxnQ,'Search transaction, merchant, cardholder or reference','ccTxnApply()')
      +apCS('ctx-f-status',CCT_LIFE,CCT_LIFE.indexOf(ccTxnStatusF)>=0?ccTxnStatusF:'','All Statuses')
      /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
      +(ccTxnVerF?apCS('ctx-f-ver',[CCT_UNDER,CCT_VERIFIED,CCT_REJECTED,CC_DEMO],ccTxnVerF,'All Verification'):'')
      +(ccTxnClassF?apCS('ctx-f-class',['Company Expense','Flexi Benefit'],ccTxnClassF,'All Wallet Classes'):'')
      +clearFiltersBtn([ccTxnQ,ccTxnStatusF,ccTxnVerF,ccTxnClassF],'ccTxnReset()')+'<button class="lp-pill-search" onclick="ccTxnApply()">Search</button>',tiles)
    +ccDemoNote()
    +'<div class="wb-note">Spending already paid from card funds; it never debits a funding source again. '+ccE(ccProviderName(oncProg(ccEnt()).provider||''))+' is not connected: nothing here is Provider Confirmed.</div>'
    +ccSplit('ctx',typeof ccMatchQueueVisible==='function'&&ccTxnView==='matching'&&ccMatchQueueVisible()?ccTxnMatchQueueHTML():'<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Transaction</th><th>Cardholder</th><th>Wallet</th><th>Merchant</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,ccTxnSel!=null||(typeof ccCsxSel!=='undefined'&&ccCsxSel!=null),typeof ccCsxSel!=='undefined'&&ccCsxSel!=null?renderCsxSidebar:renderCtxSidebar)
    +'</div>';
}
function ccTxnOpen(id,tab){
  if(typeof ccCsxSel!=='undefined'&&ccCsxSel!=null){ccCsxSel=null;ccTxnSel=Number(id);ccTxnTab=tab||'basic-details';renderADTPage();return;}
  const t=ccTxn(id);if(!t||!ccTxnVisible(t)){showToast('Not available','error','This transaction is outside your access.');return;}
  if(page!=='cards'||ccPageTab!=='cards'||ccCardsSub!=='txns'){ccOpenTxnUI(id,tab);return;}
  ccTxnTab=tab||sbKeepTab(ccTxnSel,ccTxnTab);ccTxnSel=t.id;
  const sb=document.getElementById('ctx-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('ctx',renderCtxSidebar);
  document.querySelectorAll('.ctx-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='ctx-row-'+id);});
}
function ccTxnClose(){ccTxnSel=null;const sb=document.getElementById('ctx-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.ctx-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccTxnNav(t){ccTxnTab=t;isbTab('ctx',renderCtxSidebar);}
/* From anywhere: administrators get the register with the panel; a cardholder gets a read-only view. */
function ccOpenTxnUI(id,tab){
  const t=ccTxn(id);if(!t)return;
  if(!ccTxnVisible(t)){showToast('Not available','error','This transaction is outside your access.');return;}
  if(!ccAdminView()||!ccTxnAdminView()){ccTxnAct={act:'view',id:t.id,f:{}};if(page!=='cards')navigatePage('cards');else renderADTPage();return;}
  ccCloseForms();ccPageTab='cards';ccCardsSub='txns';ccTxnQ='';ccTxnStatusF='';ccTxnVerF='';ccTxnClassF='';ccTxnSel=t.id;ccTxnTab=tab||'basic-details';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function ccTxnFieldsHTML(t,full){
  const c=ccCard(t.cardId),p=ccProg(t.programmeId),v=t.verify||{},el=t.eligibility||{};
  return '<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Transaction ID',ccE(expKey(t))+(t.extRef?' <span class="ax-sub">provider ref '+ccE(t.extRef)+(t.authCode?' · auth '+ccE(t.authCode):'')+'</span>':''))
    +axField(AX_ICO.fCash,'Amount',ccE(expMoney(t.amount,t.currency))+(t.currency!==t.billCurrency?' <span class="ax-sub">billed '+ccE(expMoney(t.billAmount,t.billCurrency))+' · rate '+ccE(t.rate?t.rate+' (provider-reported)':'not reported')+'</span>':''))
    +axField(AX_ICO.fBuild,'Merchant',ccE(t.merchant)+(t.mcc||t.country||t.channel?' <span class="ax-sub">'+ccE([t.mcc?'MCC '+t.mcc:'',t.country,t.channel].filter(Boolean).join(' · '))+'</span>':''))
    +axField(AX_ICO.fCal,'Transaction Time',ccE(ccTxnWhen(t))+(t.utc?' <span class="ax-sub">'+ccE(t.utc.replace('T',' ').replace(/Z$/,''))+' UTC</span>':' <span class="ax-sub">date only</span>'))
    +axField(AX_ICO.fCal,'Posting Date',t.postDate?ccE(cdLabel(t.postDate)):'<span class="wb-muted">Not posted</span>')
    +axField(AX_ICO.fCheck,'Status',ccTxnShownBadge(t)+' <span class="ax-sub">'+ccE(t.type)+' · '+ccE(t.direction)+'</span>')
    +axField(AX_ICO.fUser,'Card',(c?'<button class="att-link" onclick="ccOpenCardUI('+c.id+')">'+ccE(ccMask(t.cardRef.last4)+' · '+t.cardRef.key)+'</button>':ccE(t.cardRef.key))+' <span class="ax-sub">'+ccE(t.name)+(t.empId?' · '+ccE(t.empId):'')+'</span>')
    +axField(AX_ICO.fBox,'Programme · Wallet','<div>'+ccE(p?p.key+' · '+p.code:'')+' · '+ccE(wbTypeName(t.wallet))+' <span class="ax-sub">'+ccE(t.walletClass)+'</span></div>')
    +axField(AX_ICO.fCheck,'Source','<div>'+ccE(ccTxnSourceLabel(t))+(full&&v.by?' <span class="ax-sub">'+ccE(v.status)+' by '+ccE(caN(v.by))+' '+ccE(v.at||'')+(v.actual?' · through Switch User by '+ccE(caN(v.actual)):'')+(v.reason?' · '+ccE(v.reason):'')+'</span>':'')+'</div>')
    +axField(AX_ICO.fCheck,'Card Eligibility','<div>'+(el.exception?'<span class="wb-warn">Exception</span> <span class="ax-sub">'+ccE(el.text)+'</span>':ccE(el.provisional?'Provisional (date only)':'Active at the transaction time')+(el.provisional&&/became Active|Active until/.test(el.text||'')?' <span class="ax-sub">'+ccE(el.text)+'</span>':''))+'</div>')
    +axField(AX_ICO.fCheck,'Reconciliation','<div>'+ccE(t.reconStatus)+'</div>')   // Expense Matching is not on the Transactions screens (product owner, 11 Nov 2026)
    +(full?axField(AX_ICO.fUser,'Recorded By',ccE(caN(t.recordedBy))+' <span class="ax-sub">'+ccE(t.recordedAt)+(t.actual?' · through Switch User by '+ccE(caN(t.actual)):'')+'</span>')
      +axField(AX_ICO.fHash,'Evidence',t.evidence?ccE(t.evidence):'—')+axField(AX_ICO.fBox,'Reason',ccE(t.reason||'—')+(t.comments?' <span class="ax-sub">'+ccE(t.comments)+'</span>':''))
      +(t.dupReview?axField(AX_ICO.fCheck,'Duplicate Review',ccE(t.dupReview.status)+' <span class="ax-sub">separate from '+ccE(t.dupReview.ofKey)+': '+ccE(t.dupReview.reason)+'</span>'):'')
      +(t.pendingPost?axField(AX_ICO.fCal,'Posting Awaiting Verification',ccE(cdLabel(t.pendingPost.date))+' <span class="ax-sub">ref '+ccE(t.pendingPost.ref)+' · '+ccE(t.pendingPost.evidence)+' · recorded by '+ccE(caN(t.pendingPost.by))+'</span>'):''):'')
    +(typeof ccTxnMoreFieldsHTML==='function'?ccTxnMoreFieldsHTML(t,full):'')
    +'</div>';
}
function ccTxnActions(t){
  const A=ccNow(),out=[],add=function(l,call,pr){out.push(ccBtn(l,call,pr));},id=t.id;
  if(!t.demo&&t.verify.status===CCT_REJECTED&&ccCan('card.transaction.record')&&(typeof mcOn!=='function'||mcOn('cards')))add('Correct & Resubmit','ccTxnActOpen(\'resubmit\','+id+')',true);
  if(!t.demo&&(t.verify.status===CCT_UNDER||t.pendingPost)&&!ccTxnWhyNotVerify(t,A)){add(t.pendingPost?'Verify Posting':'Verify','ccTxnActOpen(\'verify\','+id+')',true);add('Reject','ccTxnActOpen(\'reject\','+id+')');}
  if(t.status==='Pending Authorization'&&!t.pendingPost){
    const may=t.demo?ccCan('card.demo.simulate')&&ccDemoOn():ccCan('card.transaction.record')&&t.verify.status===CCT_VERIFIED;
    if(may)add(t.demo?'Mark Posted':'Record Posting','ccTxnActOpen(\'post\','+id+')');
    if(t.demo?ccCan('card.demo.simulate')&&ccDemoOn():ccCan('card.transaction.record'))add(ccTxnOutcomeLabel(t)?'Confirm '+t.outcome.to:'Void / Decline','ccTxnActOpen(\'void\','+id+')');
  }
  return out.join('');
}
function renderCtxSidebar(){
  const t=ccTxn(ccTxnSel);if(!t)return '';
  if(!ccTxnVisible(t))return '<div class="lp-isb-body"><div class="wb-empty-sm">This transaction is not available to you.</div></div>';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'lifecycle',label:'Lifecycle'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
  if(!tabs.some(function(x){return x.id===ccTxnTab;}))ccTxnTab='basic-details';
  if(ccTxnDspAct&&(ccTxnTab!=='logs'||ccTxnDspAct.txnId!==t.id))ccTxnDspAct=null;   // a dispute action ends when the person leaves the Logs tab
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(t.merchant),meta:[expKey(t),ccE(ccMask(t.cardRef.last4)),ccE(expMoney(t.amount,t.currency))],status:ccTxnShownBadge(t)});
  const acts=ccTxnActions(t);let body;
  if(ccTxnTab==='matching')body=hero+ccTxnMatchTabHTML(t);
  else if(ccTxnTab==='lifecycle')body=hero+'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>From</th><th>To</th><th>By</th><th>Note</th></tr></thead><tbody>'
    +t.lifecycle.slice().reverse().map(function(x){return '<tr><td>'+ccE(x.at)+'</td><td>'+ccE(x.from||'—')+'</td><td>'+ccE(x.to)+'</td><td>'+ccE(caN(x.by))+(x.actual?'<div class="ax-sub">through Switch User by '+ccE(caN(x.actual))+'</div>':'')+'</td><td>'+ccE(x.note||'')+'</td></tr>';}).join('')+'</tbody></table></div>';
  else if(ccTxnTab==='logs')body=ccTxnLogsHTML(t);
  else if(ccTxnTab==='history')body=sbHistoryHTML(t);
  else body=hero+(acts?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+acts+'</span></div>':'')
    +(t.demo?'<div class="wb-note">'+CC_DEMO+': illustrative, on an illustrative card. No card was charged; nothing is posted or reconciled as genuine.</div>':'')
    +ccTxnFieldsHTML(t,true);
  return axTabBar('ctx',tabs,ccTxnTab,'ccTxnNav','ccTxnClose')+'<div class="lp-isb-body">'+body+'</div>';
}
/* ── The card panel's Transactions tab and the cardholder view ── */
/* admin: the card's own Transactions tab (product owner, 11 Nov 2026): its last column is Dispute, not Expense; the source
   stays in each transaction's panel, and the time reads without the timezone when it is the company's own. */
function ccTxnMiniTable(list,admin){
  if(!list.length)return '<div class="wb-empty-sm">No transactions.</div>';
  const when=function(t){return admin&&t.tz&&t.tz===entTimezone(t.entity)?cdLabel(t.date)+(t.time?' '+t.time:''):ccTxnWhen(t);};
  return '<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Transaction</th><th>Merchant</th><th>Wallet</th><th>Amount</th><th>Status</th>'+(admin?'':'<th>Source</th>')+'<th>'+(admin?'Dispute':'Expense')+'</th></tr></thead><tbody>'
    +list.map(function(t){return '<tr><td><button class="att-link" onclick="ccOpenTxnUI('+t.id+')">'+ccE(expKey(t))+'</button><div class="ax-sub">'+ccE(when(t))+'</div></td>'
      +'<td>'+ccE(t.merchant)+'</td><td>'+ccE(wbTypeName(t.wallet))+'<div class="ax-sub">'+ccE(t.walletClass)+'</div></td><td>'+ccE(ccTxnAmt(t))+'</td>'
      +'<td>'+(admin?ccTxnShownBadge(t):ccTxnBadge(t.status))+'</td>'+(admin?'':'<td>'+ccE(ccTxnSourceLabel(t))+'</td>')+'<td'+(admin?' style="white-space:nowrap"':'')+'>'+(admin?ccTxnDisputeCell(t):typeof ccTxnExpenseCell==='function'?ccTxnExpenseCell(t):'')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
/* The card's Transactions tab, last column (product owner, 11 Nov 2026): one Resolve Dispute button while a dispute on the
   payment is open and the person may resolve it; otherwise a dash. The Status column says Dispute, then Resolved. */
function ccTxnDisputeCell(t){
  const d=ccTxnDspLatest(t);
  if(!d||DSP_ACTIVE.indexOf(d.status)<0||ccDspMayManage(ccNow(),d))return '<span class="wb-muted">—</span>';
  return '<button class="att-link" onclick="ccDspResolveClick('+d.id+')">Mark as Resolved</button>';
}
function ccDspResolveClick(id){
  const d=ccDsp(id),e=ccDspMarkResolved(id);
  if(e){showToast('Not resolved','error',e);return;}
  renderADTPage();showToast('Dispute resolved','success',expKey(d)+' on '+d.txnKey+' is resolved.');
}
/* ── A payment's Logs tab: its log and its dispute's, and the dispute's actions (product owner, 11 Nov 2026) ──
   Select action → (a reviewer, for Reassign) → Note → Submit, in the ADT Logs format. Resolved replaces Complete Review;
   Request Information, Assign to Me / Reassign, Withdraw and Internal Note are the dispute's own actions, with their rules. */
let ccTxnDspAct=null;
function ccTxnDspMoves(d){
  if(!d||DSP_ACTIVE.indexOf(d.status)<0||ccDspMayManage(ccNow(),d))return [];
  const A=ccNow(),out=['Resolved'];
  if(['Submitted','Under Internal Review','Awaiting Provider','Raised with Provider'].indexOf(d.status)>=0)out.push('Request Information');
  if(['Submitted','Under Internal Review'].indexOf(d.status)>=0&&d.assignee!==A.who)out.push(d.assignee?'Reassign':'Assign to Me');
  if(['Submitted','Under Internal Review','More Information Required','Awaiting Provider','Raised with Provider'].indexOf(d.status)>=0)out.push('Withdraw');
  out.push('Internal Note');
  return out;
}
function ccTxnLogsHTML(t){
  const ds=t.direction==='Credit'?[]:ccDspOfTxn(t,true).filter(function(d){return d.status!=='Draft'&&ccDspVisible(d);});
  const at=function(x){return Date.parse(String(x.date||'')+' '+String(x.time||''))||0;};
  const logs=(t.logs||[]).concat([].concat.apply([],ds.map(function(d){return d.logs||[];}))).slice().sort(function(a,b){return at(b)-at(a);});
  const d=ds.find(function(x){return DSP_ACTIVE.indexOf(x.status)>=0;}),moves=ccTxnDspMoves(d);
  if(!moves.length)return lpLogsView(logs,'');
  const a=ccTxnDspAct&&ccTxnDspAct.txnId===t.id?ccTxnDspAct:null;
  const rv=a&&a.label==='Reassign'?ccDspReviewers(d).filter(function(u){return u!==d.assignee;}):[];
  const form='<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>Dispute · '+ccE(expKey(d))+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('ctxd-act-'+t.id,'Dispute',['Dispute'].concat(moves),'ccTxnDspPick')
    +(rv.length?'<div class="ep-form-grid" style="grid-template-columns:1fr;margin-bottom:4px">'+ccField('Reviewer',true,apCS('ctxd-user',rv.map(caN),a.user?caN(a.user):'','Select reviewer','ccTxnDspUser'))+'</div>':'')
    +'<div class="lp-logs-form-label">Note <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="ctxd-note" placeholder="Enter note">'+ccE(a&&a.note||'')+'</textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="ccTxnDspCancel()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="ccTxnDspSubmit('+t.id+')">Submit</button></div></div>';
  return lpLogsView(logs,form,{select:true,current:'Dispute',open:a?a.label:undefined,isBack:function(v){return /^(Withdraw)/.test(v);}});
}
function ccTxnDspPick(val,csid){
  const id=Number(String(csid||'').replace(/^ctxd-act-/,''));if(!val||val==='Dispute')return;
  const cur=ccTxnDspAct&&ccTxnDspAct.txnId===id?ccTxnDspAct:null;if(cur&&cur.label===val)return;   // the composer opening again after a redraw
  const ta=document.getElementById('ctxd-note');
  ccTxnDspAct={txnId:id,label:val,note:ta?ta.value:'',user:''};
  if(val==='Reassign'||cur&&cur.label==='Reassign')renderADTPage();   // shows (or clears) the reviewer field
}
function ccTxnDspUser(){if(!ccTxnDspAct)return;const n=getCSValue('ctxd-user'),t=ccTxn(ccTxnDspAct.txnId),d=t?ccTxnDspLatest(t):null;const u=d?ccDspReviewers(d).find(function(x){return caN(x)===n;}):null;ccTxnDspAct.user=u||'';}
function ccTxnDspCancel(){if(ccTxnDspAct){const re=ccTxnDspAct.label==='Reassign';ccTxnDspAct=null;if(re)renderADTPage();}}
/* A dispute action from a Logs composer: resolve, info, assign, reassign, withdraw or note. {err, done}. */
function ccDspDoAction(kind,d,note,uid,A){
  if(!d)return {err:'No such dispute.'};
  if(kind==='resolve')return {err:ccDspMarkResolved(d.id,A,note),done:expKey(d)+' on '+d.txnKey+' is resolved'};
  if(kind==='info')return {err:ccDspRequestInfo(d.id,note,A),done:'Information requested from '+caN(ccDspHolder(d))+' on '+expKey(d)};
  if(kind==='assign'||kind==='reassign'){
    if(kind==='reassign'&&!uid)return {err:'Pick the reviewer.'};
    let e=ccDspAssign(d.id,kind==='reassign'?uid:null,A);if(!e)e=ccDspNote(d.id,note,A)||'';
    return {err:e,done:expKey(d)+' is with '+caN(d.assignee)};
  }
  if(kind==='withdraw')return {err:ccDspWithdraw(d.id,note,A),done:expKey(d)+' is withdrawn'};
  if(kind==='note')return {err:ccDspNote(d.id,note,A),done:'Note added to '+expKey(d)};
  return {err:'Pick an action.'};
}
function ccTxnDspSubmit(id){
  const t=ccTxn(id),a=ccTxnDspAct&&ccTxnDspAct.txnId===id?ccTxnDspAct:null,d=t?ccTxnDspLatest(t):null;
  if(!a||!d){showToast('Pick an action','error','Choose what to do from Select action.');return;}
  const ta=document.getElementById('ctxd-note'),note=String(ta?ta.value:a.note||'').trim().replace(/[.\s]+$/,'');
  if(!note){if(ta)ta.classList.add('is-invalid');showToast('Note is required','error','Write a note for this action.');return;}
  let err='',done='';
  if(a.label==='Resolved'){err=ccDspMarkResolved(d.id,undefined,note);done=expKey(d)+' is resolved';}
  else if(a.label==='Request Information'){err=ccDspRequestInfo(d.id,note);done='Information requested from '+caN(ccDspHolder(d))+' on '+expKey(d);}
  else if(a.label==='Assign to Me'||a.label==='Reassign'){
    const uid=a.label==='Reassign'?a.user:null;if(a.label==='Reassign'&&!uid){showToast('Pick the reviewer','error','Choose who reviews this dispute.');return;}
    err=ccDspAssign(d.id,uid);if(!err)err=ccDspNote(d.id,note)||'';done=expKey(d)+' is with '+caN(d.assignee);}
  else if(a.label==='Withdraw'){err=ccDspWithdraw(d.id,note);done=expKey(d)+' is withdrawn';}
  else if(a.label==='Internal Note'){err=ccDspNote(d.id,note);done='Note added to '+expKey(d);}
  if(err){showToast('Not saved','error',err);return;}
  ccTxnDspAct=null;renderADTPage();showToast('Done','success',done+'.');
}
function ccCardTxnsHTML(c){
  const list=ccTxnsOfCard(c.id).filter(ccTxnVisible);
  return ccTxnMiniTable(list,true);   // no explainer note above the list (product owner, 11 Nov 2026)
}
function ccHolderTxnsHTML(eid,own){
  const list=ccTxns.filter(function(t){return t.employeeEid===eid&&t.entity===ccEnt()&&ccTxnVisible(t);});
  const corp=list.filter(function(t){return t.walletClass!=='Flexi Benefit';}),ben=list.filter(function(t){return t.walletClass==='Flexi Benefit';});
  const pend=list.filter(function(t){return t.status==='Pending Authorization';}).length;
  return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Card Transactions ('+list.length+')</span>'+(pend?'<span class="ea-hint">'+pend+' pending authorization</span>':'')+'</div>'
    +'<div class="ea-hint" style="margin:0 0 6px">Corporate Expense</div>'+ccTxnMiniTable(corp)
    +(ben.length||own?'<div class="ea-hint" style="margin:10px 0 6px">Benefit wallets</div>'+ccTxnMiniTable(ben):'');
}
/* ── Popups: record, simulate, verify, reject, post, void, view ── */
function ccTxnCardsFor(kind){return ccCards.filter(function(c){return c.entity===ccEnt()&&ccCardVisible(c)&&(kind==='simulate'?ccCardEvidence(c)===CC_DEMO:ccCardEvidenced(c));});}
function ccTxnCardLabel(c){return ccMask(c.last4)+' · '+expKey(c)+' · '+ccHolderName(c);}
function ccTxnFormOpen(kind,cardId){
  const tz=entTimezone(),list=ccTxnCardsFor(kind);
  if(!list.length){showToast('No card available','error',kind==='simulate'?'Illustrative transactions need an illustrative card in presentation mode.':'A genuine transaction needs a card whose issuance and activation are evidenced.');return;}
  const c=cardId?ccCard(cardId):list[0];
  ccTxnForm={kind:kind,f:{cardId:c.id,wallet:(ccWalletMap(ccProg(c.programmeId))[0]||{}).code||'',type:'Purchase',date:wbToday(),time:'',tz:tz,postDate:wbToday(),merchant:'',mcc:'',country:'',channel:'',
    amount:'',currency:c.currency,billAmount:'',rate:'',extRef:'',authCode:'',reason:'',comments:'',evidence:'',dupAck:''},dup:''};
  renderADTPage();
}
function ccTxnFormClose(){ccTxnForm=null;renderADTPage();}
function ccTxnFormSync(){
  const F=ccTxnForm;if(!F)return;const f=F.f,cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let v;
  if((v=cs('ctxf-card'))!=null){const c=ccTxnCardsFor(F.kind).find(function(x){return ccTxnCardLabel(x)===v;});if(c&&c.id!==f.cardId){f.cardId=c.id;f.wallet=(ccWalletMap(ccProg(c.programmeId))[0]||{}).code||'';f.currency=c.currency;}}
  if((v=cs('ctxf-wallet'))!=null){const c=ccCard(f.cardId),w=c?ccWalletMap(ccProg(c.programmeId)).find(function(x){return x.name===v;}):null;if(w)f.wallet=w.code;}
  [['type','ctxf-type'],['currency','ctxf-cur'],['tz','ctxf-tz'],['channel','ctxf-channel']].forEach(function(p){if((v=cs(p[1]))!=null&&v!=='Select')f[p[0]]=v;});
  [['time','ctxf-time'],['merchant','ctxf-merchant'],['mcc','ctxf-mcc'],['country','ctxf-country'],['amount','ctxf-amt'],['billAmount','ctxf-bill'],['rate','ctxf-rate'],
   ['extRef','ctxf-ref'],['authCode','ctxf-auth'],['reason','ctxf-reason'],['comments','ctxf-comments'],['dupAck','ctxf-dup']].forEach(function(p){if((v=ccVal(p[1]))!=null)f[p[0]]=v;});
  if((v=bgVal('ctxf-date'))!=null)f.date=v;if((v=bgVal('ctxf-post'))!=null)f.postDate=v;
}
function ccTxnFormHook(){ccTxnFormSync();renderADTPage();}
function ccTxnEvidence(input,key){const fl=input.files&&input.files[0];input.value='';if(!fl)return;if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}
  if(key==='act'){ccTxnActSync();ccTxnAct.f.evidence=fl.name;}else{ccTxnFormSync();ccTxnForm.f.evidence=fl.name;}renderADTPage();}
function ccTxnEvidenceField(f,key,label){
  return ccField(label||'Supporting Evidence',true,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>'
    :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccTxnEvidence(this,\''+key+'\')"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · statement, provider portal screen or advice (max 5 MB)</span></span></label>',
    'External evidence only. Test or sample references are never proof of a real transfer.',true);
}
function ccTxnFormHTML(){
  const F=ccTxnForm,f=F.f,sim=F.kind==='simulate',c=ccCard(f.cardId),p=c?ccProg(c.programmeId):null,ws=p?ccWalletMap(p):[];
  const foreign=c&&f.currency&&f.currency!==c.currency;
  const body='<div class="ep-form-grid">'
    +ccField('Card',true,apCS('ctxf-card',ccTxnCardsFor(F.kind).map(ccTxnCardLabel),c?ccTxnCardLabel(c):'','Select card','ccTxnFormHook'),sim?'Illustrative cards only.':'Cards whose issuance and activation are evidenced.')
    +ccField('Wallet',true,apCS('ctxf-wallet',ws.map(function(w){return w.name;}),f.wallet?wbTypeName(f.wallet):'','Select wallet','ccTxnFormHook'),p?ccE(p.key+' · '+p.code)+(f.wallet?' · '+ccE(ccTxnWalletClass(f.wallet)):''):'')
    +ccField('Transaction Type',true,apCS('ctxf-type',CCT_TYPES,f.type,'Select','ccTxnFormHook'),'Purchase: posted. Authorization: pending, not yet settled.')
    +ccField('Merchant',true,ccInput('ctxf-merchant',f.merchant,'Merchant name as on the statement'))
    +ccField('Transaction Date',true,apCD('ctxf-date',f.date,'Select date'))
    +ccField('Transaction Time',false,ccInput('ctxf-time',f.time,'HH:MM'),'Leave empty if only the date is known: card eligibility is then provisional.')
    +ccField('Timezone',false,apCS('ctxf-tz',CCT_TZ,f.tz,'Select'),'Entity timezone: '+(entTimezone()||'not set in Company Settings'))
    +(f.type==='Purchase'?ccField('Posting Date',true,apCD('ctxf-post',f.postDate,'Select date')):'')
    +ccField('Transaction Currency',true,apCS('ctxf-cur',EXP_CURRENCIES,f.currency,'Select','ccTxnFormHook'),'The currency the merchant charged.')
    +ccField('Transaction Amount',true,'<div class="ax-currency"><span>'+ccE(f.currency||'—')+'</span><input class="ep-form-input" id="ctxf-amt" type="number" min="0" step="0.01" value="'+attrSafe(f.amount)+'" placeholder="0.00"></div>','Original transaction amount.')
    +(foreign?ccField('Card Billing Amount ('+ccE(c.currency)+')',true,ccInput('ctxf-bill',f.billAmount,'As billed on the card'),'From the provider\'s record; ADT never converts it itself.')
      +ccField('Provider Exchange Rate',false,ccInput('ctxf-rate',f.rate,'If reported'),'Leave empty if the provider did not report it.'):'')
    +ccField('MCC',false,ccInput('ctxf-mcc',f.mcc,'4 digits'))+ccField('Merchant Country',false,ccInput('ctxf-country',f.country,'ISO code, e.g. IN'))
    +ccField('Channel',false,apCS('ctxf-channel',CCT_CHANNELS,f.channel,'Select'))
    +(sim?'':ccField('Provider Transaction Reference',true,ccInput('ctxf-ref',f.extRef,'From the evidence'))+ccField('Authorization Code',false,ccInput('ctxf-auth',f.authCode,''))
      +ccField('Transaction Reason',true,ccArea('ctxf-reason',f.reason,'Why it is recorded manually (e.g. not yet on a statement)'),'',true)+ccTxnEvidenceField(f,'form'))
    +ccField('Comments',false,ccArea('ctxf-comments',f.comments,''),'',true)
    +(F.dup?ccField('Duplicate Justification',true,ccArea('ctxf-dup',f.dupAck,'Why this is a separate transaction'),ccE(F.dup),true):'')
    +'</div>';
  return bgModal(sim?'Illustrative Transaction':'Record Transaction',sim?'An illustrative transaction on an illustrative card. No card is charged and nothing is posted.':'A missing external card transaction, recorded from its evidence. It counts only after someone independent verifies it.',
    body,{close:'ccTxnFormClose()',btns:'<button class="ep-save-btn" onclick="ccTxnFormSave()">'+(sim?'Create Illustrative Transaction':'Record for Verification')+'</button>'});
}
function ccTxnFormSave(){
  ccTxnFormSync();const F=ccTxnForm;if(!F)return;
  const res=F.kind==='simulate'?ccTxnSimulate(F.f):ccTxnRecord(F.f);
  if(res.error){if(res.dupOf){F.dup=res.error;renderADTPage();}showToast('Not saved','error',res.error);return;}
  ccTxnForm=null;showToast(F.kind==='simulate'?'Illustrative transaction created':'Transaction recorded','success',expKey(res.rec)+(F.kind==='simulate'?' · '+CC_DEMO:' awaits independent verification'));
  ccOpenTxnUI(res.rec.id);
}
function ccTxnActOpen(act,id){
  const t=ccTxn(id);if(!t)return;
  const f={reason:'',date:wbToday(),ref:'',evidence:'',outcome:t.outcome&&!t.outcome.confirmed?t.outcome.to:'Voided',basis:'Provider evidence',note:'',file:'',dupAck:''};
  if(act==='resubmit')['date','time','tz','postDate','merchant','mcc','country','channel','amount','currency','rate','extRef','authCode'].forEach(function(k){f[k]=t[k]==null?'':t[k];});
  if(act==='resubmit')f.billAmount=t.currency!==t.billCurrency?t.billAmount:'';
  ccTxnAct={act:act,id:Number(id),f:f};renderADTPage();
}
function ccTxnActClose(){ccTxnAct=null;renderADTPage();}
function ccTxnActSync(){
  const a=ccTxnAct;if(!a)return;const f=a.f;let v;
  if((v=ccVal('ctxa-reason'))!=null)f.reason=v;if((v=ccVal('ctxa-ref'))!=null)f.ref=v;if((v=bgVal('ctxa-date'))!=null)f.date=v;if((v=ccVal('ctxa-note'))!=null)f.note=v;
  if(document.getElementById('csw-ctxa-outcome'))f.outcome=getCSValue('ctxa-outcome')||f.outcome;
  if(document.getElementById('csw-ctxa-basis'))f.basis=getCSValue('ctxa-basis')||f.basis;
  [['merchant','ctxa-r-merchant'],['time','ctxa-r-time'],['mcc','ctxa-r-mcc'],['country','ctxa-r-country'],['amount','ctxa-r-amt'],['billAmount','ctxa-r-bill'],['rate','ctxa-r-rate'],['extRef','ctxa-r-ref'],['authCode','ctxa-r-auth'],['dupAck','ctxa-r-dup']]
    .forEach(function(p){if((v=ccVal(p[1]))!=null)f[p[0]]=v;});
  if((v=bgVal('ctxa-r-date'))!=null)f.date=v;if((v=bgVal('ctxa-r-post'))!=null)f.postDate=v;
  if(document.getElementById('csw-ctxa-r-cur'))f.currency=getCSValue('ctxa-r-cur')||f.currency;
}
function ccTxnActHook(){ccTxnActSync();renderADTPage();}
function ccTxnInfoFile(input){const fl=input.files&&input.files[0];input.value='';if(!fl)return;if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}ccTxnActSync();ccTxnAct.f.file=fl.name;renderADTPage();}
function ccTxnActHTML(){
  const a=ccTxnAct,f=a.f,t=ccTxn(a.id);if(!t)return '';const btn=function(l){return '<button class="ep-save-btn" onclick="ccTxnActSave()">'+l+'</button>';},close='ccTxnActClose()';
  if(a.act==='view'){
    const me=idMe(),mayInfo=!t.demo&&idUserOfEmp(t.employeeEid)===me&&ccTxnInfoOpen(t);
    return bgModal('Card Transaction · '+ccE(expKey(t)),ccE(ccTxnSourceLabel(t))+((t.verify||{}).status===CCT_REJECTED?' · this is not a confirmed or posted transaction for your claims until it is corrected and verified.':''),ccTxnFieldsHTML(t,false),
      {close:close,btns:(mayInfo?'<button class="ep-save-btn" onclick="ccTxnActOpen(\'info\','+t.id+')">Provide Supporting Information</button>':'')
        +(typeof ccTxnExpenseWhyNot==='function'&&!ccTxnExpenseWhyNot(t)?'<button class="ep-save-btn" onclick="ccTxnCreateExpense('+t.id+')">Create Expense</button>':'')});
  }
  if(a.act==='info')return bgModal('Supporting Information · '+ccE(expKey(t)),(t.verify||{}).status===CCT_VERIFIED?'Add a document or information for this transaction, for example the receipt that is still to come. It does not replace the expense claim; Finance sees it.':'Add information or a document Finance asked for. It does not change the verification; Finance reviews it.',
    '<div class="ep-form-grid">'+ccField('Information',true,ccArea('ctxa-note',f.note,'For example: the merchant receipt shows the correct amount'),'',true)
      +ccField('Attachment',false,f.file?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.file)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccTxnInfoFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · receipt or document (max 5 MB)</span></span></label>','',true)+'</div>',
    {close:close,btns:btn('Send to Finance')});
  if(a.act==='verify')return bgModal((t.pendingPost?'Verify Posting · ':'Verify Transaction · ')+ccE(expKey(t)),'Check the external evidence against the record. Verification is Manually Verified, never Provider Confirmed.',
    ccTxnFieldsHTML(t,true),{close:close,btns:btn(t.pendingPost?'Verify Posting':'Verify')});
  if(a.act==='reject')return bgModal('Reject · '+ccE(expKey(t)),'The record, its reference and its evidence are kept with your reason; the reference keeps blocking a second record of the same transaction.','<div class="ep-form-grid">'+ccField('Reason',true,ccArea('ctxa-reason',f.reason,''),'',true)+'</div>',{close:close,btns:btn('Reject')});
  if(a.act==='post')return bgModal((t.demo?'Mark Posted · ':'Record Posting · ')+ccE(expKey(t)),t.demo?'The illustrative authorization becomes an illustrative posted purchase.':'The provider posted the authorization. Someone independent verifies the posting.',
    '<div class="ep-form-grid">'+ccField('Posting Date',true,apCD('ctxa-date',f.date,'Select date'))+(t.demo?'':ccField('Posting Reference',true,ccInput('ctxa-ref',f.ref,'From the provider'))+ccTxnEvidenceField(f,'act','Posting Evidence'))+'</div>',
    {close:close,btns:btn(t.demo?'Mark Posted':'Record for Verification')});
  if(a.act==='void'){
    const ev=!t.demo&&f.basis==='Provider evidence';
    return bgModal((ccTxnOutcomeLabel(t)?'Confirm '+t.outcome.to+' · ':'Void / Decline · ')+ccE(expKey(t)),t.demo?'An illustrative authorization; it stays '+CC_DEMO+'.':'A pending authorization the provider voided or declined. With the provider\'s reference and evidence it becomes '+f.outcome+'; without them ADT keeps an internal, unconfirmed outcome and the authorization stays pending.',
      '<div class="ep-form-grid">'+ccField('Outcome',true,apCS('ctxa-outcome',['Voided','Declined'],f.outcome,'Select'))
        +(t.demo?'':ccField('Basis',true,apCS('ctxa-basis',['Provider evidence','Internal – not yet confirmed'],f.basis,'Select','ccTxnActHook'),ev?'Reference and evidence from the provider.':'Recorded as Unconfirmed (internal); never shown as a provider outcome.'))
        +ccField('Reference',ev,ccInput('ctxa-ref',f.ref,ev?'From the provider':'If any'))+(ev?ccTxnEvidenceField(f,'act','Outcome Evidence'):'')
        +ccField('Reason',true,ccArea('ctxa-reason',f.reason,''),'',true)+'</div>',{close:close,btns:btn(t.demo?'Confirm':ev?'Record '+f.outcome:'Record Unconfirmed Outcome')});
  }
  if(a.act==='resubmit'){
    const c=ccCard(t.cardId),foreign=c&&f.currency&&f.currency!==c.currency;
    return bgModal('Correct & Resubmit · '+ccE(expKey(t)),'The rejected record keeps its identity and history. Every change is kept with its before and after, duplicates are checked again, and someone independent of you verifies it.',
      '<div class="ep-form-grid">'
      +ccField('Merchant',true,ccInput('ctxa-r-merchant',f.merchant,''))+ccField('Transaction Date',true,apCD('ctxa-r-date',f.date,'Select date'))
      +ccField('Transaction Time',false,ccInput('ctxa-r-time',f.time,'HH:MM'))+(t.type==='Purchase'?ccField('Posting Date',true,apCD('ctxa-r-post',f.postDate,'Select date')):'')
      +ccField('Transaction Currency',true,apCS('ctxa-r-cur',EXP_CURRENCIES,f.currency,'Select','ccTxnActHook'))
      +ccField('Transaction Amount',true,ccInput('ctxa-r-amt',f.amount,'0.00'))
      +(foreign?ccField('Card Billing Amount ('+ccE(c.currency)+')',true,ccInput('ctxa-r-bill',f.billAmount,''))+ccField('Provider Exchange Rate',false,ccInput('ctxa-r-rate',f.rate,'If reported')):'')
      +ccField('Provider Transaction Reference',true,ccInput('ctxa-r-ref',f.extRef,''),'Changing it is checked against every other record.')+ccField('Authorization Code',false,ccInput('ctxa-r-auth',f.authCode,''))
      +ccField('MCC',false,ccInput('ctxa-r-mcc',f.mcc,'4 digits'))+ccField('Merchant Country',false,ccInput('ctxa-r-country',f.country,'ISO code'))
      +ccField('What Was Corrected',true,ccArea('ctxa-reason',f.reason,'What changed and why'),'Rejected because: '+ccE((t.verify||{}).reason||''),true)
      +ccTxnEvidenceField(f,'act','Corrected Evidence')
      +ccField('Duplicate Justification',false,ccArea('ctxa-r-dup',f.dupAck,'Only if asked: why this is a separate transaction'),'',true)+'</div>',
      {close:close,btns:btn('Resubmit for Verification')});
  }
  return '';
}
function ccTxnActSave(){
  ccTxnActSync();const a=ccTxnAct;if(!a)return;const f=a.f;let err='',ok='';
  if(a.act==='verify'){const t=ccTxn(a.id),pp=!!(t&&t.pendingPost);err=ccTxnVerify(a.id);ok=pp?'Posting verified':'Transaction verified (Manually Verified)';}
  else if(a.act==='reject'){err=ccTxnReject(a.id,f.reason);ok='Rejected; the record and its reference are kept';}
  else if(a.act==='post'){err=ccTxnPost(a.id,{date:f.date,ref:f.ref,evidence:f.evidence});ok=(ccTxn(a.id)||{}).demo?'Posted (Illustrative)':'Posting recorded; someone independent verifies it';}
  else if(a.act==='void'){const t=ccTxn(a.id),ev=!t.demo&&f.basis==='Provider evidence';err=ccTxnVoid(a.id,{outcome:f.outcome,reason:f.reason,ref:f.ref,evidence:ev?f.evidence:'',basis:t.demo?'':ev?'Evidenced':'Unconfirmed'});
    ok=t.demo?f.outcome+' ('+CC_DEMO+')':ev?f.outcome+' from the provider\'s evidence':f.outcome+' – Unconfirmed (internal); it stays pending';}
  else if(a.act==='resubmit'){err=ccTxnResubmit(a.id,f);ok='Corrected and resubmitted; someone independent verifies it';}
  else if(a.act==='info'){err=ccTxnAddInfo(a.id,{note:f.note,file:f.file});ok='Information sent to Finance';}
  if(err){showToast('Not saved','error',err);return;}
  ccTxnAct=null;renderADTPage();showToast(ok,'success',expKey(ccTxn(a.id)||{}));
}
/* ── Company Settings → Basic Details: Entity Timezone (Addendum G3) ── */
let ccTzEdit=false;
function ccEntTzFieldHTML(fc,icon){
  const tz=entTimezone(),can=ccCan('foundation.entity.update');
  if(can&&ccTzEdit)return fc(icon,'Entity Timezone','<div class="bg-basecur-edit">'+apCS('cc-tz',CCT_TZ,tz,'Select')
    +'<div class="bg-basecur-btns"><button class="btn btn-outline btn-sm" onclick="ccTzCancel()">Cancel</button><button class="btn btn-primary btn-sm" onclick="ccTzSave()">Save</button></div>'
    +'<div class="ea-hint">Card transaction times and claim due dates use it.</div></div>');
  return fc(icon,'Entity Timezone',(tz||'Not set')+(can?' <button class="att-link" onclick="ccTzOpen()">'+(tz?'Change':'Set')+'</button>':''));
}
function ccTzOpen(){ccTzEdit=true;refreshCsSidebar();}
function ccTzCancel(){ccTzEdit=false;refreshCsSidebar();}
function ccTzSave(){const v=getCSValue('cc-tz'),e=entSetTimezone(ccEnt(),v);if(e){showToast('Not saved','error',e);return;}ccTzEdit=false;refreshCsSidebar();showToast('Entity timezone saved','success',idEntityName(ccEnt())+' · '+v+'.');}


/* ══ Build 8B · Card Loads → Statements & Reconciliation: statement imports, Card Mapping Review, verification ══
   The fourth Card Loads view (Loads stays first). The same listing, filter, split panel, upload and row
   review patterns as Bulk Load Files. Import and verification stay apart from reconciliation. */
sbToneAdd({uploaded:'info','validation-pending':'wait','review-required':'wait','validation-completed':'ok',duplicate:'idle',linked:'ok','new':'info','not-started':'idle',returned:'bad','not-submitted':'idle'});
let ccStmtSel=null,ccStmtTab='basic-details',ccStmtQ='',ccStmtStatusF='',ccStmtProgF='',ccStmtView='list',ccStmtRowF='',ccStmtForm=null,ccStmtAct=null;
const CCS_STATES=['Uploaded','Validation Pending','Review Required','Validation Completed','Awaiting Verification','Verified','Discarded'];
const CCS_PERMS=['card.reconciliation.view','card.transaction.import','card.statement.verify'];
function ccStmtVisible(s){return !!s&&s.entity===ccEnt()&&CCS_PERMS.some(ccCan);}
function ccStmtActionsBar(){return ccCan('card.transaction.import')&&(typeof mcOn!=='function'||mcOn('cards'))?ccBtn('Import Statement','ccStmtStart()',true):'';}
function ccStmtScopeText(s){const p=ccProg(s.programmeId);return s.scope==='Card'?'Single card '+ccCardLabel(ccCard(s.cardId)):'Programme '+(p?p.key+' · '+p.code:'');}
function ccStmtSourceText(s){return s.demo?CC_DEMO+' statement':'Provider statement (uploaded by Finance; '+ccProviderName(s.provider)+' is not connected)';}
function ccStmtCounts(m){return [m.new+' new',m.linked+' linked',m.duplicate?m.duplicate+' duplicate':'',m.review?m.review+' review':'',m.invalid?m.invalid+' invalid':'',m.excluded?m.excluded+' excluded':''].filter(Boolean).join(' · ');}
function ccStmtShown(){
  const q=String(ccStmtQ||'').trim().toLowerCase();
  return ccStmts.filter(function(s){
    if(!ccStmtVisible(s))return false;
    if(q&&![expKey(s),s.fileName,s.sourceRef,caN(s.createdBy)].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccStmtStatusF===CC_DEMO){if(!s.demo)return false;}else if(ccStmtStatusF&&s.importStatus!==ccStmtStatusF)return false;
    if(ccStmtProgF&&ccProgLabel(ccProg(s.programmeId))!==ccStmtProgF)return false;
    if(ccStmtRecF==='__rcx__'){if(!ccRecBlocking(s).length)return false;}
    else if(ccStmtRecF&&ccRecShown(s)!==ccStmtRecF)return false;
    return true;
  });
}
function ccStmtApply(){ccStmtQ=lpSearchValue('cst-f-q');const s=getCSValue('cst-f-status'),p=getCSValue('cst-f-prog');ccStmtStatusF=s==='All Statuses'?'':s||'';ccStmtProgF=p==='All Programmes'?'':p||'';ccStmtSel=null;ccStmtView='list';renderADTPage();}
function ccStmtReset(){ccStmtQ='';ccStmtStatusF='';ccStmtProgF='';ccStmtRecF='';ccStmtSel=null;ccStmtView='list';renderADTPage();}
function ccStmtStat(s){ccStmtStatusF=ccStmtStatusF===s?'':s;ccStmtSel=null;ccStmtView='list';renderADTPage();}
function ccStmtMapView(){ccStmtView=ccStmtView==='mapping'?'list':'mapping';ccStmtSel=null;renderADTPage();}
/* The Card Mapping Review queue (Addendum G2 rule 3): rows across statements still being prepared. */
function ccStmtMappingRows(){
  const out=[];ccStmts.filter(function(s){return ccStmtVisible(s)&&CCS_OPEN.indexOf(s.importStatus)>=0;}).forEach(function(s){s.rows.forEach(function(r){if(!r.excluded&&r.status==='Review Required'&&r.issue&&r.issue.kind==='mapping')out.push({s:s,r:r});});});
  return out;
}
function ccStmtListHTML(){
  const all=ccStmts.filter(ccStmtVisible),rows=ccStmtShown(),mq=ccStmtMappingRows();
  if(ccStmtSel!=null&&!rows.some(function(s){return s.id===ccStmtSel;}))ccStmtSel=null;
  const cnt=function(f){return all.filter(f).length;};
  const tiles=caStat('Review Required',cnt(function(s){return s.importStatus==='Review Required';}),ccStmtStatusF==='Review Required','ccStmtStat(\'Review Required\')','wait')
    +caStat('Awaiting Verification',cnt(function(s){return s.importStatus==='Awaiting Verification';}),ccStmtStatusF==='Awaiting Verification','ccStmtStat(\'Awaiting Verification\')','wait')
    +caStat('Verified',cnt(function(s){return s.importStatus==='Verified';}),ccStmtStatusF==='Verified','ccStmtStat(\'Verified\')','ok')
    +caStat('Card Mapping Review',mq.length,ccStmtView==='mapping','ccStmtMapView()',mq.length?'bad':'idle')
    +ccRecListTiles(all)+ccRecExcTile8H(all)
    +(all.some(function(s){return s.demo;})&&!(typeof presClientHere==='function'&&presClientHere())?caStat(CC_DEMO,cnt(function(s){return s.demo;}),ccStmtStatusF===CC_DEMO,'ccStmtStat(\''+CC_DEMO+'\')','info'):'');
  const bar=ccFilterBar(lpSearchField('cst-f-q',ccStmtQ,'Search statement, file, reference or uploader','ccStmtApply()')
      +apCS('cst-f-status',CCS_STATES,CCS_STATES.indexOf(ccStmtStatusF)>=0?ccStmtStatusF:'','All Statuses')
      +apCS('cst-f-prog',ccProgs().map(ccProgLabel),ccStmtProgF,'All Programmes')
      +clearFiltersBtn([ccStmtQ,ccStmtStatusF,ccStmtProgF,ccStmtRecF],'ccStmtReset()')+'<button class="lp-pill-search" onclick="ccStmtApply()">Search</button>',tiles)
    .replace('<div class="listing-stats exp-stats">','<div class="listing-stats exp-stats cc-stmt-stats">');   // nine boxes: labels may wrap (css/cards.css)
  const note='<div class="wb-note">A statement is external evidence: its rows count only after someone independent verifies it, as Manually Verified ('
    +ccE(ccProviderName(oncProg(ccEnt()).provider||''))+' is not connected).</div>';
  if(ccStmtView==='mapping'){
    const can=ccCan('card.transaction.import');
    const t='<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Statement · Row</th><th>Statement Card Values</th><th>Transaction</th><th>Why</th><th></th></tr></thead><tbody>'
      +(mq.length?mq.map(function(x,i){const d=x.r.data;
        return '<tr><td class="lp-c-n">'+(i+1)+'</td><td><button class="att-link" onclick="ccOpenStmtUI('+x.s.id+',\'rows\')">'+ccE(expKey(x.s))+'</button><div class="lp-c-sub">row '+x.r.n+' · '+ccE(x.s.sourceRef)+'</div></td>'
          +'<td><div class="lp-c-plain">Employee ID '+ccE(d.empId||'—')+'</div><div class="lp-c-sub">'+ccE(d.programme)+' · last four '+ccE(d.last4||'—')+(d.card?' · ref '+ccE(d.card):'')+'</div></td>'
          +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(d.merchant)+'</div><div class="lp-c-sub">'+ccE(d.date)+' · '+ccE(d.amount+' '+d.currency)+'</div></td>'
          +'<td><div class="lp-c-sub" style="white-space:normal">'+ccE(x.r.issue.text)+'</div></td>'
          +'<td>'+(can?'<button class="att-link" onclick="ccStmtActOpen(\'row-map\','+x.s.id+','+x.r.n+')">Map Card</button>':'')+'</td></tr>';}).join(''):ccEmpty(6,'No statement row is waiting for card mapping.'))
      +'</tbody></table>';
    return bar+'<div class="wb-note"><b>Card Mapping Review</b><div class="wb-note-sub">Rows whose card is not identified exactly; an authorized person picks the card with a reason.</div></div>'+t;
  }
  const pgn=listPage('cards-stmts',[ccStmtQ,ccStmtStatusF,ccStmtProgF,ccStmtRecF].join('|'),rows.map(function(s,i){
    const m=ccStmtSum(s),v=s.verify||{};
    return '<tr class="cst-row'+(ccStmtSel===s.id?' lp-row-selected':'')+'" id="cst-row-'+s.id+'" style="cursor:pointer" onclick="ccStmtOpen('+s.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+ccE(expKey(s))+'</div><div class="lp-c-sub">'+ccE(s.fileName)+' · '+ccE(s.format)+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(ccStmtScopeText(s))+'</div><div class="lp-c-sub">'+ccE(s.demo?CC_DEMO:'Provider statement')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(ccStmtPeriodText(s))+'</div><div class="lp-c-sub">ref '+ccE(s.sourceRef)+'</div></td>'
      +'<td><div class="lp-c-plain">'+m.rows+(m.rows===1?' row':' rows')+'</div><div class="lp-c-sub">'+ccE(ccStmtCounts(m))+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(caN(s.createdBy))+'</div><div class="lp-c-sub">'+ccE(s.createdAt)+'</div></td>'
      +'<td>'+axBadge(statusTone(s.importStatus),s.importStatus)+(v.status==='Returned'&&s.importStatus!=='Verified'?'<div class="lp-c-sub exp-cap-over">Returned by '+ccE(caN(v.by))+'</div>':s.assignException?'<div class="lp-c-sub exp-cap-over">No eligible verifier</div>':'')+'</td>'
      +'<td>'+axBadge(ccRecTone(s.reconStatus),s.reconStatus)+(typeof ccRecAdjsPending==='function'&&ccRecAdjsPending(s).length?'<div class="lp-c-sub exp-cap-over">'+ccRecAdjsPending(s).length+' financial adjustment(s) outstanding</div>':'')+'</td></tr>';
  }),ccEmpty(8,'No card statement yet. Import Statement takes a CSV or XLSX in the standard template.'));
  return bar+ccDemoNote()+note
    +ccSplit('cst','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Statement</th><th>Scope</th><th>Period</th><th>Rows</th><th>Uploaded By</th><th>Import Status</th><th>Reconciliation</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,ccStmtSel!=null,renderCstSidebar);
}
function ccStmtOpen(id,tab){
  const s=ccStmt(id);if(!s||!ccStmtVisible(s)){showToast('Not available','error','This statement is outside your access.');return;}
  if(page!=='cards'||ccPageTab!=='loads'||ccLoadSub!=='stmts'||ccStmtView!=='list'){ccOpenStmtUI(id,tab);return;}
  ccStmtTab=tab||sbKeepTab(ccStmtSel,ccStmtTab);ccStmtSel=s.id;
  const sb=document.getElementById('cst-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('cst',renderCstSidebar);
  document.querySelectorAll('.cst-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='cst-row-'+id);});
}
function ccStmtClose(){ccStmtSel=null;const sb=document.getElementById('cst-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.cst-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccStmtNav(t){ccStmtTab=t;isbTab('cst',renderCstSidebar);}
function ccOpenStmtUI(id,tab){
  const s=ccStmt(id);if(!s)return;
  if(!ccStmtVisible(s)){showToast('Not available','error','This statement is outside your access.');return;}
  ccCloseForms();ccPageTab='loads';ccLoadSub='stmts';ccStmtView='list';ccStmtQ='';ccStmtStatusF='';ccStmtProgF='';ccStmtSel=s.id;ccStmtTab=tab||'basic-details';ccStmtRowF='';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function ccStmtActions(s){
  const A=ccNow(),out=[],add=function(l,call,pr){out.push(ccBtn(l,call,pr));},id=s.id,imp=ccCan('card.transaction.import');
  if(imp&&CCS_OPEN.indexOf(s.importStatus)>=0){add('Submit for Verification','ccStmtSubmitClick('+id+')',true);add('Upload Corrected File','ccStmtStart('+id+')');add('Correct Period','ccStmtActOpen(\'period\','+id+')');add('Discard','ccStmtActOpen(\'discard\','+id+')');}
  if(s.importStatus==='Awaiting Verification'&&!ccStmtWhyNotVerify(s,A)){add('Verify Statement','ccStmtActOpen(\'verify\','+id+')',true);add('Return for Correction','ccStmtActOpen(\'return\','+id+')');}
  return out.join('');
}
function renderCstSidebar(){
  const s=ccStmt(ccStmtSel);if(!s)return '';
  if(!ccStmtVisible(s))return '<div class="lp-isb-body"><div class="wb-empty-sm">This statement is not available to you.</div></div>';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'rows',label:'Rows'},{id:'verification',label:'Verification'}].concat(s.importStatus==='Verified'?[{id:'recon',label:'Reconciliation'}]:[],[{id:'logs',label:'Logs'},{id:'history',label:'History'}]);
  if(!tabs.some(function(t){return t.id===ccStmtTab;}))ccStmtTab='basic-details';
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(s.sourceRef),meta:[expKey(s),ccE(ccStmtPeriodText(s)),ccE(s.demo?CC_DEMO:'Provider statement')],status:axBadge(statusTone(s.importStatus),s.importStatus)});
  let body;
  if(ccStmtTab==='rows')body=hero+ccStmtRowsHTML(s);
  else if(ccStmtTab==='verification')body=hero+ccStmtVerifHTML(s);
  else if(ccStmtTab==='recon')body=hero+ccRecTabHTML(s);
  else if(ccStmtTab==='logs')body=lpLogsView(s.logs,'');
  else if(ccStmtTab==='history')body=sbHistoryHTML(s);
  else body=hero+ccStmtBasicHTML(s);
  return axTabBar('cst',tabs,ccStmtTab,'ccStmtNav','ccStmtClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function ccStmtBasicHTML(s){
  const m=ccStmtSum(s),act=ccStmtActions(s),v=s.verify||{},st=function(l,n,tone){return caStat(l,n,false,'',tone||'info');},b=s.balances||{};
  const bal=b.opening!=null||b.closing!=null?ccE([b.opening!=null?'Opening '+expMoney(b.opening,s.currency):'',b.closing!=null?'Closing '+expMoney(b.closing,s.currency):''].filter(Boolean).join(' · '))+' <span class="ax-sub">as reported on the statement; historical, not a live balance</span>'
    :'<span class="wb-muted">Not reported</span> <span class="ax-sub">ADT does not calculate a statement balance</span>';
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(CCS_OPEN.indexOf(s.importStatus)>=0&&m.open?'<div class="wb-note is-wait"><b>'+m.open+' row'+(m.open===1?' needs':'s need')+' a decision</b><div class="wb-note-sub">'+(m.mapping?m.mapping+' in Card Mapping Review. ':'')+'Correct, map, decide or exclude them on the Rows tab: every statement row is accounted for before verification.</div></div>':'')
    +(v.status==='Returned'&&CCS_OPEN.indexOf(s.importStatus)>=0?'<div class="wb-note is-bad"><b>Returned for correction by '+ccE(caN(v.by))+'</b><div class="wb-note-sub">'+ccE(v.reason||'')+'</div></div>':'')
    +(s.assignException?'<div class="wb-note is-bad"><b>Assignment exception</b><div class="wb-note-sub">'+ccE(s.assignException)+'</div></div>':'')
    +(s.demo?'<div class="wb-note">'+CC_DEMO+' statement: its rows become illustrative transactions on illustrative cards only. No card was charged; nothing is genuine.</div>':'')
    +'<div class="listing-stats exp-stats cc-bulk-stats">'+st('Rows',m.rows)+st('New',m.new,'info')+st('Linked',m.linked,'ok')+st('Duplicate',m.duplicate,'idle')+st('Review Required',m.review,m.review?'wait':'idle')+st('Invalid',m.invalid,m.invalid?'bad':'idle')+st('Excluded',m.excluded,'idle')
      +(s.importStatus==='Verified'?st('Created',m.created,'ok'):'')+'</div>'
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Statement ID',ccE(expKey(s)))
    +axField(AX_ICO.fTag,'Scope',ccE(ccStmtScopeText(s)))
    +axField(AX_ICO.fCal,'Statement Period',ccE(ccStmtPeriodText(s))+((s.periodHistory||[]).length?' <span class="ax-sub">corrected '+s.periodHistory.length+'× · first '+ccE(cdLabel(s.periodHistory[0].from)+' – '+cdLabel(s.periodHistory[0].to))+'</span>':''))
    +axField(AX_ICO.fKey,'Statement Reference',ccE(s.sourceRef)+' <span class="ax-sub">'+ccE(ccProviderName(s.provider))+'</span>')
    +axField(AX_ICO.fBuild,'Source',ccE(ccStmtSourceText(s)))
    +axField(AX_ICO.fBox,'File',ccE(s.fileName)+' <span class="ax-sub">'+ccE(s.format)+' · '+ccE(s.fileHash||'')+(s.uploads.length>1?' · '+s.uploads.length+' uploads':'')+'</span>')
    +axField(AX_ICO.fUser,'Uploaded By',ccE(caN(s.createdBy))+' <span class="ax-sub">'+ccE(s.createdAt)+(s.actualBy?' · through Switch User by '+ccE(caN(s.actualBy)):'')+'</span>')
    +axField(AX_ICO.fCheck,'Import Status',axBadge(statusTone(s.importStatus),s.importStatus)+' <span class="ax-sub">'+ccE((s.stages||[]).map(function(x){return x.to;}).filter(function(x,i,a){return i===0||a[i-1]!==x;}).join(' → '))+'</span>')
    +axField(AX_ICO.fCheck,'Verification',ccE(v.status||'Not Submitted')+(v.by&&v.status!=='Awaiting Verification'?' <span class="ax-sub">by '+ccE(caN(v.by))+' '+ccE(v.at||'')+(v.actual?' · through Switch User by '+ccE(caN(v.actual)):'')+'</span>':''))
    +axField(AX_ICO.fCheck,'Reconciliation',axBadge(ccRecTone(s.reconStatus),s.reconStatus))
    +axField(AX_ICO.fCash,'Statement-Reported Balances',bal)
    +axField(AX_ICO.fCash,'Rows Total',ccE(expMoney(m.debit,s.currency))+' debits · '+ccE(expMoney(m.credit,s.currency))+' credits <span class="ax-sub">posted rows, duplicates and excluded rows left out; not a balance</span>'+(m.outside?' <span class="ax-sub">'+m.outside+' row(s) outside the period by provider-period exception ('+ccE(expMoney(m.outsideAmt,s.currency))+' net) shown apart</span>':''))
    +((s.sensitiveCols||[]).length||(s.maskedRows||[]).length?axField(AX_ICO.fLock,'Sensitive Data',ccE([(s.sensitiveCols||[]).length?'Columns '+s.sensitiveCols.join(', ')+' ignored and not stored':'',(s.maskedRows||[]).length?'full card numbers on row(s) '+s.maskedRows.join(', ')+' masked to the last four':''].filter(Boolean).join('; ')),true):'')
    +((s.unknownCols||[]).length?axField(EXP_ICO.note,'Ignored Columns',ccE(s.unknownCols.join(', ')),true):'')
    +'</div>'
    +'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Upload History</span></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>File</th><th>Rows</th><th>Content Hash</th><th>Uploaded</th></tr></thead><tbody>'
    +s.uploads.map(function(u){return '<tr><td>'+ccE(u.file)+' <span class="ax-sub">'+ccE(u.format)+'</span></td><td>'+u.rows+'</td><td><span class="ax-sub">'+ccE(u.fileHash||u.hash)+'</span></td><td>'+ccE(caN(u.by))+' <span class="ax-sub">'+ccE(u.at)+'</span></td></tr>';}).join('')+'</tbody></table></div>';
}
function ccStmtRowState(s,r){
  if(r.result){const t=r.result.txnId?ccTxn(r.result.txnId):null;return {status:r.result.status,txn:t,detail:r.result.status==='Duplicate'?r.result.text||r.dupText:r.result.status==='Excluded'&&r.excluded?r.excluded.reason:''};}
  if(r.status==='Linked'){const t=ccTxn(r.match.txnId),m=r.match;return {status:'Linked',txn:t,detail:'Links to '+(t?expKey(t):'')+(m.rejected?' (rejected record; it stays Rejected)':'')+(m.progress?' · status → '+m.progress:'')+((m.discrepancy||m.refDiff)?' · discrepancy recorded on verification':'')};}
  if(r.status==='Invalid')return {status:'Invalid',detail:r.errors.join(' ')};
  if(r.status==='Review Required')return {status:'Review Required',detail:r.issue?r.issue.text:''};
  if(r.status==='Duplicate')return {status:'Duplicate',detail:r.dupText};
  if(r.status==='Excluded')return {status:'Excluded',detail:r.excluded?r.excluded.reason+' ('+caN(r.excluded.by)+')':''};
  return {status:r.status,detail:r.match&&r.match.sep?'Separate from '+r.match.sep.ofKey+': '+r.match.sep.reason:''};
}
function ccStmtRowCardCell(s,r){
  const d=r.data,c=r.cardId?ccCard(r.cardId):null;
  return '<td>'+ccE((d.empId||'no Employee ID')+' · '+(d.last4?'•••• '+d.last4:'no last four'))+(d.card?'<div class="ax-sub" style="white-space:normal">ref '+ccE(d.card)+'</div>':'')
    +(c?'<div class="ax-sub" style="white-space:normal">→ '+ccE(ccCardLabel(c)+' · '+ccHolderName(c))+(r.how?' ('+ccE(r.how)+')':'')+'</div>':'')+'</td>';
}
function ccStmtRowsTable(s,rows){
  if(!rows.length)return '';
  const edit=ccCan('card.transaction.import')&&CCS_OPEN.indexOf(s.importStatus)>=0;
  return '<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-bulk-rows"><thead><tr><th>Row</th><th>Card</th><th>Transaction</th><th>Status</th>'+(edit?'<th></th>':'')+'</tr></thead><tbody>'
    +rows.map(function(r){
      const st=ccStmtRowState(s,r),d=r.data,id=s.id,n=r.n;
      const det=(st.txn&&r.result?'<button class="att-link" onclick="ccOpenTxnUI('+st.txn.id+')">'+ccE(expKey(st.txn))+'</button> ':'')+ccE(st.detail||'')
        +(r.warnings.length&&!r.result?'<div class="ax-sub" style="white-space:normal">'+ccE(r.warnings.join(' '))+'</div>':'')+(r.edits.length?'<div class="ax-sub" style="white-space:normal">corrected '+r.edits.length+'×; statement values kept</div>':'')
        +(r.map?'<div class="ax-sub" style="white-space:normal">mapped by '+ccE(caN(r.map.by))+': '+ccE(r.map.reason)+'</div>':'')
        +(r.pex&&r.parsed&&r.parsed.periodException?'<div class="ax-sub" style="white-space:normal">provider-period exception ('+ccE(caN(r.pex.by))+'): '+ccE(r.pex.reason)+'; kept out of the period totals</div>':'')
        +(r.ores?'<div class="ax-sub" style="white-space:normal">recorded without an original ('+ccE(caN(r.ores.by))+'): '+ccE(r.ores.reason)+'</div>':'');
      let a='';
      if(edit&&!r.result){
        const L=function(lbl,act){a+='<button class="att-link" onclick="ccStmtActOpen(\''+act+'\','+id+','+n+')">'+lbl+'</button>';};
        if(r.status!=='Excluded'){
          const k=r.issue&&r.issue.kind;
          if(k==='mapping')L('Map Card','row-map');
          if(k==='near'){L('Link','row-link');L('Separate','row-separate');}
          if(k==='nearRow')L('Separate','row-separate');
          if(k==='conflict'&&!ccStmtHardDiff(r.issue.diffs||[]))L('Record Discrepancy & Link','row-discrepancy');
          if(k==='rejected')L('Link to Rejected Record','row-link-rejected');
          if(k==='period')L('Record Period Exception','row-period');
          if(k==='refund')L('Record Without Original','row-refund-unlinked');
          L('Edit','row-edit');L('Exclude','row-exclude');
        }else a+='<button class="att-link" onclick="ccStmtIncludeClick('+id+','+n+')">Include</button>';
      }
      return '<tr'+(r.status==='Invalid'&&!r.result?' class="cc-row-bad"':'')+'><td><b>'+n+'</b></td>'+ccStmtRowCardCell(s,r)
        +'<td>'+ccE(d.merchant||'—')+' · '+ccE((d.amount||'—')+' '+(d.currency||''))+'<div class="ax-sub" style="white-space:normal">'+ccE([d.date,d.time,d.type,d.status].filter(Boolean).join(' · '))+(d.ref?' · ref '+ccE(d.ref):'')
          +(d.billAmount?' · billed '+ccE(d.billAmount+' '+(d.billCurrency||'')):'')+'</div></td>'
        +'<td>'+axBadge(statusTone(st.status),st.status)+'<div class="ax-sub" style="white-space:normal">'+det+'</div></td>'+(edit?'<td><div class="cc-row-acts">'+a+'</div></td>':'')+'</tr>';
    }).join('')+'</tbody></table></div>';
}
function ccStmtRowsHTML(s){
  if(s.importStatus==='Verified'||s.importStatus==='Discarded'||s.importStatus==='Awaiting Verification'){
    const opts=['All rows','New','Linked','Created','Duplicate','Excluded'];
    const rows=s.rows.filter(function(r){const x=ccStmtRowState(s,r).status;return !ccStmtRowF||ccStmtRowF==='All rows'||x===ccStmtRowF||r.status===ccStmtRowF;});
    return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Rows</span><span>'+apCS('cst-rowf',opts,ccStmtRowF||'All rows','All rows','ccStmtRowFilter')+'</span></div>'+(ccStmtRowsTable(s,rows)||'<div class="wb-empty-sm">No row matches.</div>');
  }
  const sec=function(title,list,empty){return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">'+title+' ('+list.length+')</span></div>'+(ccStmtRowsTable(s,list)||'<div class="wb-empty-sm">'+(empty||'None.')+'</div>');};
  const by=function(st){return s.rows.filter(function(r){return r.status===st;});};
  const map=by('Review Required').filter(function(r){return r.issue&&r.issue.kind==='mapping';}),rev=by('Review Required').filter(function(r){return !(r.issue&&r.issue.kind==='mapping');});
  return sec('Card Mapping Review',map)+sec('Review Required',rev)+sec('Invalid',by('Invalid'))+sec('Duplicates',by('Duplicate'))
    +sec('Valid: new transactions',by('New'))+sec('Valid: matching existing transactions',by('Linked'))+(by('Excluded').length?sec('Excluded',by('Excluded')):'');
}
function ccStmtRowFilter(){const v=getCSValue('cst-rowf');ccStmtRowF=v==='All rows'?'':v||'';isbTab('cst',renderCstSidebar);}
function ccStmtVerifHTML(s){
  const v=s.verify||{},A=ccNow(),el=s.importStatus==='Awaiting Verification'?ccStmtVerifiers(s):[],why=ccStmtWhyNotVerify(s,A),mk=ccStmtMakers(s),ho=ccStmtHolders(s);
  const rounds=(s.stages||[]).filter(function(x){return ['Awaiting Verification','Verified'].indexOf(x.to)>=0||/^Returned/.test(x.note||'');});
  return '<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fCheck,'Verification',ccE(v.status||'Not Submitted')+(v.reason?' <span class="ax-sub">'+ccE(v.reason)+'</span>':''))
    +axField(AX_ICO.fUser,'Prepared, Corrected or Mapped By',ccE(caNs(mk)||'—'),true)
    +axField(AX_ICO.fUser,'Cardholders on the Statement',ccE(ho.length+' cardholder'+(ho.length===1?'':'s'))+' <span class="ax-sub">never verify their own card activity</span>')
    +(s.importStatus==='Awaiting Verification'?axField(AX_ICO.fUser,'Eligible Verifiers',el.length?ccE(caNs(el)):'<span class="wb-warn">None</span> <span class="ax-sub">'+ccE(ccStmtNoVerifierText(s))+'</span>',true)
      +axField(AX_ICO.fCheck,'You',why?'<span class="ax-sub">'+ccE(why)+'</span>':'Eligible to verify',true):'')
    +'</div>'
    +'<div class="wb-note"><div class="wb-note-sub">Verified by the Card Load Verifiers team, never by whoever uploaded, corrected or mapped it, or a cardholder on it.</div></div>'
    +(rounds.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist"><thead><tr><th>When</th><th>Step</th><th>By</th><th>Note</th></tr></thead><tbody>'
      +rounds.map(function(x){return '<tr><td>'+ccE(x.at)+'</td><td>'+ccE(x.to)+'</td><td>'+ccE(caN(x.by))+(x.actual?'<div class="ax-sub">through Switch User by '+ccE(caN(x.actual))+'</div>':'')+'</td><td>'+ccE(x.note||'')+'</td></tr>';}).join('')+'</tbody></table></div>':'');
}
/* ── Popups: import (and corrected file), row decisions, verification ── */
function ccStmtStart(replaceId){
  if(!ccCan('card.transaction.import')){emsDeny('import card statements');return;}
  const p=ccProgs()[0];
  ccStmtForm={replaceId:replaceId||null,error:'',busy:false,f:{source:'Provider statement',scope:'Programme statement',programmeId:p?p.id:null,cardId:null,periodFrom:wbToday().slice(0,8)+'01',periodTo:wbToday(),sourceRef:'',opening:'',closing:'',comments:''}};
  renderADTPage();
}
function ccStmtFormClose(){ccStmtForm=null;renderADTPage();}
function ccStmtCardOpts(p){return p?ccCards.filter(function(c){return c.entity===ccEnt()&&c.programmeId===p.id&&c.last4;}):[];}
function ccStmtFormSync(){
  const F=ccStmtForm;if(!F)return;const f=F.f,cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};let v;
  if((v=cs('cstf-src'))!=null&&v!=='Select')f.source=v;if((v=cs('cstf-scope'))!=null&&v!=='Select')f.scope=v;
  if((v=cs('cstf-prog'))!=null){const p=ccProgs().find(function(x){return ccProgLabel(x)===v;});if(p&&p.id!==f.programmeId){f.programmeId=p.id;f.cardId=null;}}
  if((v=cs('cstf-card'))!=null){const c=ccStmtCardOpts(ccProg(f.programmeId)).find(function(x){return ccTxnCardLabel(x)===v;});if(c)f.cardId=c.id;}
  if((v=bgVal('cstf-from'))!=null)f.periodFrom=v;if((v=bgVal('cstf-to'))!=null)f.periodTo=v;
  [['sourceRef','cstf-ref'],['opening','cstf-open'],['closing','cstf-close'],['comments','cstf-comments']].forEach(function(x){if((v=ccVal(x[1]))!=null)f[x[0]]=v;});
}
function ccStmtFormHook(){ccStmtFormSync();renderADTPage();}
function ccStmtFormData(f){return {programmeId:f.programmeId,scope:f.scope==='Single-card statement'?'Card':'Programme',cardId:f.cardId,periodFrom:f.periodFrom,periodTo:f.periodTo,sourceRef:f.sourceRef,
  demo:f.source!=='Provider statement',opening:f.opening,closing:f.closing,comments:f.comments};}
function ccStmtTemplateClick(fmt){const n=ccStmtTemplate(fmt);if(n)showToast('Template downloaded','success',n+': the standard card statement columns. Never enter a full card number.');}
function ccStmtFormHTML(){
  const F=ccStmtForm,f=F.f,p=ccProg(f.programmeId),single=f.scope==='Single-card statement',demoOk=ccDemoOn()&&ccCan('card.demo.simulate');
  const c=f.cardId?ccCard(f.cardId):null;
  const body='<div class="ep-form-grid">'
    +(F.replaceId?'':ccField('Source',true,apCS('cstf-src',['Provider statement'].concat(demoOk?[CC_DEMO+' statement']:[]),f.source,'Select','ccStmtFormHook'),'A provider statement uploaded by Finance; ADT is not connected to the provider.')
      +ccField('Statement Scope',true,apCS('cstf-scope',['Programme statement','Single-card statement'],f.scope,'Select','ccStmtFormHook'),'Programme: many cardholders. Single card: one card only.')
      +ccField('Card Programme',true,apCS('cstf-prog',ccProgs().map(ccProgLabel),p?ccProgLabel(p):'','Select programme','ccStmtFormHook'))
      +(single?ccField('Card',true,apCS('cstf-card',ccStmtCardOpts(p).map(ccTxnCardLabel),c?ccTxnCardLabel(c):'','Select card','ccStmtFormHook')):'')
      +ccField('Period From',true,apCD('cstf-from',f.periodFrom,'Select date'))+ccField('Period To',true,apCD('cstf-to',f.periodTo,'Select date'))
      +ccField('Statement Reference',true,ccInput('cstf-ref',f.sourceRef,'As printed on the statement'),'The provider\'s statement number or reference.')
      +ccField('Statement-Reported Opening Balance',false,ccInput('cstf-open',f.opening,'Only if printed on the statement'),'Historical figure from the statement, never a live balance.')
      +ccField('Statement-Reported Closing Balance',false,ccInput('cstf-close',f.closing,'Only if printed on the statement')))
    +ccField('Template',false,'<span class="ca-actions">'+ccBtn('Download XLSX','ccStmtTemplateClick(\'xlsx\')')+ccBtn('Download CSV','ccStmtTemplateClick(\'csv\')')+'</span>',
      'Columns: '+CCS_COLS.map(function(x){return x[1]+(x[2]?'*':'');}).join(', ')+'. * required.',true)
    +ccField('Statement File',true,'<label class="att-zone ax-img-zone"><input type="file" accept=".csv,.xlsx" hidden onchange="ccStmtFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">'+(F.busy?'Reading…':'Click to upload')+'</span><span class="att-zone-hint"> · .csv or .xlsx, up to '+CC_BULK_MAX_ROWS+' rows</span></span></label>','',true)
    +(F.error?'<div class="ep-form-group ep-form-full"><div class="wb-note is-bad"><b>The statement was not accepted</b><div class="wb-note-sub">'+ccE(F.error)+'</div></div></div>':'')
    +'<div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">Rows are validated first and a statement is never imported twice. Full card numbers, CVV, PIN and expiry are never stored.</div></div></div></div>';
  return bgModal(F.replaceId?'Upload Corrected File · '+expKey(ccStmt(F.replaceId)):'Import Card Statement','',body,{close:'ccStmtFormClose()',btns:''});
}
function ccStmtFile(input){
  const fl=input.files&&input.files[0];input.value='';if(!fl||!ccStmtForm)return;
  ccStmtFormSync();const F=ccStmtForm;
  if(!F.replaceId){const e=ccStmtFormCheck(ccStmtFormData(F.f));if(e){F.error=e;renderADTPage();return;}}
  F.busy=true;F.error='';renderADTPage();
  return fl.arrayBuffer().then(function(buf){return ccStmtRead(fl.name,buf);}).then(function(parsed){return ccStmtAccept(parsed);})
    .catch(function(err){if(ccStmtForm){ccStmtForm.busy=false;ccStmtForm.error=err&&err.message||String(err);renderADTPage();}});
}
function ccStmtAccept(parsed){
  const F=ccStmtForm;if(!F)return;F.busy=false;
  if(F.replaceId){const e=ccStmtReplace(F.replaceId,parsed);if(e){F.error=e;renderADTPage();return;}const s=ccStmt(F.replaceId);ccStmtForm=null;ccOpenStmtUI(s.id,'rows');
    const m=ccStmtSum(s);showToast('Corrected file read','success',expKey(s)+': '+ccStmtCounts(m)+'.');return;}
  const res=ccStmtCreate(parsed,ccStmtFormData(F.f));
  if(res.error){F.error=res.error;renderADTPage();return;}
  ccStmtForm=null;ccOpenStmtUI(res.rec.id,'rows');
  const m=ccStmtSum(res.rec);showToast('Statement read','success',expKey(res.rec)+': '+m.rows+' rows · '+ccStmtCounts(m)+'. Review the rows, then submit for verification.');
}
function ccStmtIncludeClick(id,n){const e=ccStmtRowExclude(id,n,false,'');if(e){showToast('Not saved','error',e);return;}renderADTPage();showToast('Row included','success','Row '+n+' is '+ccStmt(id).rows.find(function(r){return r.n===n;}).status+'.');}
function ccStmtSubmitClick(id){
  const e=ccStmtSubmit(id);if(e){showToast('Not submitted','error',e);return;}const s=ccStmt(id);renderADTPage();
  showToast('Submitted for verification','success',expKey(s)+(s.assignException?': no eligible verifier yet (see the assignment exception)':': the Card Load Verifiers team is notified')+'. Nothing is created until someone independent verifies it.');
}
function ccStmtActOpen(act,id,n){
  const s=ccStmt(id);if(!s)return;const r=n!=null?s.rows.find(function(x){return x.n===Number(n);}):null;
  ccStmtAct={act:act,id:Number(id),n:n!=null?Number(n):null,f:{reason:'',cardId:null,data:r?Object.assign({},r.data):{},periodFrom:s.periodFrom,periodTo:s.periodTo}};renderADTPage();
}
function ccStmtActClose(){ccStmtAct=null;renderADTPage();}
function ccStmtActSync(){
  const a=ccStmtAct;if(!a)return;const f=a.f;let v;if((v=ccVal('csta-reason'))!=null)f.reason=v;if((v=bgVal('csta-pfrom'))!=null)f.periodFrom=v;if((v=bgVal('csta-pto'))!=null)f.periodTo=v;
  if(document.getElementById('csw-csta-card')){const s=ccStmt(a.id),r=s.rows.find(function(x){return x.n===a.n;}),lab=getCSValue('csta-card');const c=ccStmtMapCands(s,r).find(function(x){return ccTxnCardLabel(x)===lab;});f.cardId=c?c.id:null;}
  CCS_COLS.forEach(function(c){if((v=ccVal('csta-c-'+c[0]))!=null)f.data[c[0]]=v;});
}
function ccStmtActHTML(){
  const a=ccStmtAct,f=a.f,s=ccStmt(a.id);if(!s)return '';const r=a.n!=null?s.rows.find(function(x){return x.n===a.n;}):null,close='ccStmtActClose()';
  const btn=function(l){return '<button class="ep-save-btn" onclick="ccStmtActSave()">'+l+'</button>';},reason=function(lbl,ph){return ccField(lbl||'Reason',true,ccArea('csta-reason',f.reason,ph||''),'',true);};
  const vals=r?'<div class="ep-form-group ep-form-full"><div class="wb-note"><b>Row '+r.n+' as on the statement</b><div class="wb-note-sub">Employee ID '+ccE(r.orig.empId||'—')+' · '+ccE(r.orig.programme)+' · last four '+ccE(r.orig.last4||'—')+(r.orig.card?' · ref '+ccE(r.orig.card):'')
    +' · '+ccE(r.orig.merchant)+' · '+ccE(r.orig.date)+' · '+ccE(r.orig.amount+' '+r.orig.currency)+(r.orig.ref?' · ref '+ccE(r.orig.ref):'')+(r.issue?'<br>'+ccE(r.issue.text):'')+'</div></div></div>':'';
  if(a.act==='row-edit'){
    const body='<div class="ep-form-grid">'+CCS_COLS.map(function(c){return ccField(c[1],false,ccInput('csta-c-'+c[0],f.data[c[0]],''),r.orig[c[0]]!==r.data[c[0]]?'Statement value: '+ccE(r.orig[c[0]]||'(blank)'):'');}).join('')
      +(r.errors.length?'<div class="ep-form-group ep-form-full"><div class="wb-note is-bad"><b>Current errors</b><div class="wb-note-sub">'+ccE(r.errors.join(' '))+'</div></div></div>':'')+'</div>';
    return bgModal('Correct Row '+r.n+' · '+expKey(s),'The row is validated again on save. The statement\'s original value and the before and after of every change are kept. Never enter a full card number.',body,{close:close,btns:btn('Save Row')});
  }
  if(a.act==='row-map'){
    const cands=ccStmtMapCands(s,r);
    return bgModal('Card Mapping Review · Row '+r.n,'Choose the card this statement row belongs to, and say how it was identified. ADT never maps on the last four digits alone.',
      '<div class="ep-form-grid">'+vals+ccField('Card',true,cands.length?apCS('csta-card',cands.map(ccTxnCardLabel),'','Select card'):'<span class="wb-muted">No card of this programme ends '+ccE(r.data.last4||'----')+': correct the row or exclude it.</span>','Cards of '+ccE((ccProg(s.programmeId)||{}).code||'')+' with the same last four digits.',true)
      +reason('How the card was identified','For example: provider confirmed the cardholder on its portal')+'</div>',{close:close,btns:cands.length?btn('Map Card'):''});
  }
  const dec={'row-link':['Link to Existing Transaction','The statement row is the same transaction as the one already recorded. On verification it links as statement evidence; nothing new is created.','Link'],
    'row-separate':['Separate Transaction','The row is a different transaction from the similar one. On verification it becomes its own transaction, under duplicate review.','Confirm Separate'],
    'row-discrepancy':['Record Discrepancy & Link','The row is the same transaction but its details differ. It links on verification and the discrepancy stays open for Finance review; the recorded transaction is never overwritten.','Record & Link'],
    'row-link-rejected':['Link to Rejected Record','The row carries the reference of a rejected record. It links as statement evidence; the record stays Rejected until an authorized correction and resubmission.','Link'],
    'row-period':['Provider-Period Exception','The provider reports this row outside the statement period. Document why it belongs to this statement: it is processed but kept out of the period totals, with your reason on record.','Record Exception'],
    'row-refund-unlinked':['Record Without Original','The original purchase of this refund or reversal cannot be identified reliably. It becomes a credit linked to no purchase, held for Finance refund review; it is never linked to an unrelated purchase.','Record']}[a.act];
  if(dec)return bgModal(dec[0]+' · Row '+r.n,dec[1],'<div class="ep-form-grid">'+vals+reason(a.act==='row-separate'?'Why it is a separate transaction':'Reason')+'</div>',{close:close,btns:btn(dec[2])});
  if(a.act==='period')return bgModal('Correct Statement Period · '+expKey(s),'Use the period printed on the provider statement. Every row is validated again; the earlier period and your reason are kept.',
    '<div class="ep-form-grid">'+ccField('Period From',true,apCD('csta-pfrom',f.periodFrom,'Select date'))+ccField('Period To',true,apCD('csta-pto',f.periodTo,'Select date'))+reason()+'</div>',{close:close,btns:btn('Save Period')});
  if(a.act==='row-exclude')return bgModal('Exclude Row '+r.n,'An excluded row creates nothing and stays with the statement, with your reason.','<div class="ep-form-grid">'+vals+reason()+'</div>',{close:close,btns:btn('Exclude')});
  if(a.act==='discard')return bgModal('Discard · '+expKey(s),'Nothing is created. The upload and its rows stay on record.','<div class="ep-form-grid">'+reason()+'</div>',{close:close,btns:btn('Discard')});
  if(a.act==='return')return bgModal('Return for Correction · '+expKey(s),'The preparer corrects the rows and submits again. Nothing is created.','<div class="ep-form-grid">'+reason('What must be corrected')+'</div>',{close:close,btns:btn('Return')});
  if(a.act==='verify'){
    const m=ccStmtSum(s);
    return bgModal('Verify Statement · '+expKey(s),'Check the rows against the statement '+ccE(s.sourceRef)+'. Verification creates or links card transactions as Manually Verified'+(s.demo?' ('+CC_DEMO+')':'')+'; it never posts to funding, loads a card or touches a budget.',
      '<div class="listing-stats exp-stats cc-bulk-stats">'+caStat('New',m.new,false,'','info')+caStat('Linked',m.linked,false,'','ok')+caStat('Duplicate',m.duplicate,false,'','idle')+caStat('Excluded',m.excluded,false,'','idle')+'</div>'+ccStmtRowsTable(s,s.rows.filter(function(x){return ['New','Linked'].indexOf(x.status)>=0;})),{close:close,btns:btn('Verify Statement')});
  }
  return '';
}
function ccStmtActSave(){
  ccStmtActSync();const a=ccStmtAct;if(!a)return;const f=a.f;let err='',ok='';
  if(a.act==='row-edit'){err=ccStmtRowEdit(a.id,a.n,f.data);ok='Row '+a.n+' saved';}
  else if(a.act==='row-map'){err=f.cardId?ccStmtRowMap(a.id,a.n,f.cardId,f.reason):'Pick the card.';ok='Row '+a.n+' mapped';}
  else if(a.act==='row-link'){err=ccStmtRowResolve(a.id,a.n,'link',f.reason);ok='Row '+a.n+' will link';}
  else if(a.act==='row-separate'){err=ccStmtRowResolve(a.id,a.n,'separate',f.reason);ok='Row '+a.n+' is a separate transaction';}
  else if(a.act==='row-discrepancy'){err=ccStmtRowResolve(a.id,a.n,'discrepancy',f.reason);ok='Discrepancy recorded; row '+a.n+' will link';}
  else if(a.act==='row-link-rejected'){err=ccStmtRowResolve(a.id,a.n,'link-rejected',f.reason);ok='Row '+a.n+' will link to the rejected record';}
  else if(a.act==='row-period'){err=ccStmtRowResolve(a.id,a.n,'period-exception',f.reason);ok='Row '+a.n+' documented as a provider-period exception';}
  else if(a.act==='row-refund-unlinked'){err=ccStmtRowResolve(a.id,a.n,'refund-unlinked',f.reason);ok='Row '+a.n+' recorded without an original';}
  else if(a.act==='period'){err=ccStmtPeriodEdit(a.id,f.periodFrom,f.periodTo,f.reason);ok='Statement period corrected';}
  else if(a.act==='row-exclude'){err=ccStmtRowExclude(a.id,a.n,true,f.reason);ok='Row '+a.n+' excluded';}
  else if(a.act==='discard'){err=ccStmtDiscard(a.id,f.reason);ok='Statement discarded';}
  else if(a.act==='return'){err=ccStmtReturn(a.id,f.reason);ok='Returned for correction';}
  else if(a.act==='verify'){const r=ccStmtVerify(a.id);err=r.error||'';if(!err)ok='Statement verified: '+r.created.length+' created, '+r.linked.length+' linked';}
  if(err){showToast('Not saved','error',err);return;}
  const s=ccStmt(a.id),r=a.n!=null?s.rows.find(function(x){return x.n===a.n;}):null;ccStmtAct=null;renderADTPage();
  showToast(ok,'success',expKey(s)+(r?' · row '+r.n+' is '+r.status:'')+'.');
}
/* ── The transaction panel: statement evidence, discrepancies, corrections, internal outcome (8B, B8-N05) ── */
function ccTxnMoreFieldsHTML(t,full){
  const L=t.stmtLinks||[],D=t.discrepancies||[],K=t.corrections||[],H=t.holderInfo||[],oc=ccTxnOutcomeLabel(t);
  return (oc?axField(AX_ICO.fCheck,'Internal Outcome','<span class="wb-warn">'+ccE(oc)+'</span> <span class="ax-sub">not confirmed by the provider; the authorization stays pending until evidence arrives</span>'):'')
    +(t.outcome&&t.outcome.confirmed&&t.outcome.basis==='Evidenced'?axField(AX_ICO.fCheck,'Outcome Evidence',ccE(t.outcome.to)+' <span class="ax-sub">ref '+ccE(t.outcome.ref)+' · '+ccE(t.outcome.evidence)+'</span>'):'')
    +(t.refundOf?axField(AX_ICO.fHash,'Original Transaction',(t.refundOf.id?'<button class="att-link" onclick="ccOpenTxnUI('+t.refundOf.id+')">'+ccE(t.refundOf.key)+'</button>':ccE(t.refundOf.ref))+' <span class="ax-sub">'+ccE(t.type)+'</span>'):'')
    +(full&&L.length?axField(AX_ICO.fBox,'Statement Evidence',L.map(function(x){return '<button class="att-link" onclick="ccOpenStmtUI('+x.stmtId+',\'rows\')">'+ccE(x.key+' · row '+x.row)+'</button>';}).join(' ')):'')
    +(full&&D.length?axField(AX_ICO.fCheck,'Source Discrepancies','<span class="wb-warn">'+D.filter(function(x){return x.status==='Open';}).length+' open</span> <span class="ax-sub">'+ccE(D.map(function(x){return x.key+' row '+x.row+': '+x.diffs.map(function(y){return y.field+' '+y.adt+' (ADT) vs '+y.stmt+' (statement)';}).join('; ');}).join(' | '))+'</span>',true):'')
    +(full&&K.length?axField(AX_ICO.fBox,'Corrections',ccE(K.length+' resubmission'+(K.length===1?'':'s'))+' <span class="ax-sub">last by '+ccE(caN(K[K.length-1].by))+' '+ccE(K[K.length-1].at)+': '+ccE(K[K.length-1].reason)+(t.formerRefs&&t.formerRefs.length?' · earlier reference '+ccE(t.formerRefs.join(', ')):'')+'</span>',true):'')
    +(H.length?axField(EXP_ICO.note,'Cardholder Information',ccE(H.map(function(x){return x.note+(x.file?' ('+x.file+')':'');}).join(' | ')),true):'');
}


/* ══ Build 8C · Expense creation and matching on the existing screens ═══════════════════════════════════
   Add Expense (Build 4) carries the transaction; the claim's line shows its match; the transaction panel gets
   an Expense Matching tab; Cards → Transactions gets the Matching Exceptions queue (as Card Mapping Review in
   8B); My Cards offers Create Expense. Popups use the existing modal pattern. No new page or tab. */
sbToneAdd({matched:'ok','partially-matched':'wait',suggested:'wait','suggested-match':'wait','awaiting-transaction-evidence':'wait','mismatch-exception':'bad','not-matched':'idle','linked-(draft)':'info','not-submitted':'idle',
  released:'idle',superseded:'idle',unmatched:'idle',confirmed:'ok','not-applicable':'idle'});
let ccTxnView='list',ccMxAct=null;

/* ── The expense line created from a transaction (Add Expense and the claim's line form) ── */
function ccExpTxnLineHTML(d,cur){
  const t=ccTxn(d.txnId),ctx=typeof expLineCtx!=='undefined'?expLineCtx:{};
  if(!t)return '<div class="ep-form-group ep-form-full"><div class="wb-note is-bad"><div class="wb-note-sub">The card transaction of this line is not available. <button class="att-link" onclick="ccExpTxnUnlink()">Unlink it</button></div></div></div>';
  const c=ccCard(t.cardId),amt=parseFloat(d.amount)||0,ca=d.cardAmount===''||d.cardAmount==null?'':String(d.cardAmount),cn=parseFloat(ca)||0,prov=ccTxnProvisional(t);
  const el=ccTxnEligible(t,ctx.currency||cur||t.currency),holds=el.error?[]:ccTxnHolds(t,{claimId:ctx.claimId==null?null:ctx.claimId,lineId:ctx.lineId==null?null:ctx.lineId});
  let used=ccM(holds.reduce(function(s,h){return s+h.amount;},0));
  if(ctx.claimId==null&&ccExpClaimDraft&&ccExpClaimDraft.lines)ccExpClaimDraft.lines.forEach(function(x){if(x!==d&&Number(x.txnId)===t.id)used=ccM(used+ccM(Math.min(Number(x.cardAmount)||0,Number(x.amount)||0)));});
  const rem=el.error?0:ccM(el.amount-used);
  return '<div class="ep-form-group ep-form-full"><div class="wb-note'+(prov?' is-wait':'')+'"><b>Card transaction '+ccE(expKey(t))+(prov?' · Provisional':'')+(t.demo?' · '+CC_DEMO:'')+'</b><div class="wb-note-sub">'
      +ccE(t.merchant)+' · '+ccE(ccTxnWhen(t))+' · '+ccE(ccTxnAmt(t))+' · '+ccE(t.status)+' · '+ccE(ccTxnSourceLabel(t))+'. '
      +(prov?'Provisional: '+ccE(prov)+'. It is not a settled card payment until it is posted and verified; the line waits for it. ':'')
      +(el.error?'<span class="wb-warn">'+ccE(el.error)+'</span> ':'The transaction amount is never changed by the expense. '+ccE(expMoney(rem,el.currency))+' of it is still to be claimed'+(used?' ('+ccE(expMoney(used,el.currency))+' on other items)':'')+'. ')
      +'<button class="att-link" onclick="ccExpTxnUnlink()">Unlink transaction</button></div></div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Corporate Card <span class="req">*</span></label><input class="ep-form-input ca-ro" readonly value="'+attrSafe(c?ccExpCardLabel(c):t.cardRef.key)+'">'
      +'<div class="ea-hint">The card that made '+ccE(expKey(t))+'.</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-cardamt">Card-Funded Amount <span class="req">*</span></label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input" id="exp-l-cardamt" type="number" min="0" step="0.01" value="'+attrSafe(ca)+'" placeholder="0.00" onchange="expFormHook()"></div>'
      +'<div class="ea-hint">The part of '+ccE(expKey(t))+' this item covers (at most '+ccE(expMoney(rem,el.currency||cur))+'). Split one transaction across items with Add Expense Item. Never reimbursed.</div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employee-Paid Amount</label>'
      +'<div class="ax-currency"><span>'+(cur||'—')+'</span><input class="ep-form-input ca-ro" readonly value="'+(amt?expMoney(Math.max(0,Math.round((amt-cn)*100)/100)):'')+'" placeholder="Line amount minus the card-funded amount"></div>'
      +'<div class="ea-hint">Only this part can be reimbursed: raise Amount Spent above the card-funded amount when you paid the rest yourself.</div></div>';
}
function ccExpTxnUnlink(){
  expSyncLine();if(expModalOpen)expSyncBasic();
  const t=expModalOpen?expDraft.line:expDraft;if(t){t.txnId=null;t.txnAt='';}
  expRepaintForm();
}
/* My Cards / the transaction panel → Create Expense: the existing Add Expense popup, prefilled (FR-CT-09.03). */
function ccTxnCreateExpense(id){
  const t=ccTxn(id),why=ccTxnExpenseWhyNot(t);if(why){showToast('Cannot create an expense','error',why);return;}
  ccCloseForms();
  navigatePage('expenses');if(typeof expSetPageTab==='function')expSetPageTab('all');startAddExpense();
  if(!expModalOpen||!expDraft||!expDraft.line)return;
  const own=idUserOfEmp(t.employeeEid)===idMe(),e=idEmp(t.employeeEid)||{};
  const cur=EXP_CURRENCIES.indexOf(t.currency)>=0?t.currency:t.billCurrency,f=ccTxnFree(t,cur),date=ccTxnLocalDate(t);
  Object.assign(expDraft,{claimFor:own?'Self':'Others',eid:t.employeeEid,name:e.name||t.name,currency:cur,title:t.merchant,fromTxn:t.id});
  expDraft.line=Object.assign(expBlankLine(),{title:t.merchant,amount:String(f.amount),start:date,end:date,paidBy:CC_PAID_CARD,cardId:t.cardId,cardAmount:String(f.amount),
    merchant:t.merchant,comments:t.comments||'',txnId:t.id,txnAt:ccTxnLocalTs(t)});
  renderADTPage();
  showToast('Add Expense from '+expKey(t),'info','Pick the category and sub category, attach the receipt and submit. The transaction and its amount stay as recorded'+(ccTxnProvisional(t)?'; it is provisional: '+ccTxnProvisional(t):'')+'.');
}
/* After "Add Expense Item" on an item made from a transaction, the next item continues the split. */
ccHook('expAddModalLine',null,function(){
  if(!expModalOpen||!expDraft||!expDraft.lines||!expDraft.lines.length)return undefined;
  const last=expDraft.lines[expDraft.lines.length-1],t=Number(last.txnId)?ccTxn(last.txnId):null;
  if(!t||expLineTouched(expDraft.line))return undefined;
  const el=ccTxnEligible(t,expDraft.currency);if(el.error)return undefined;
  let used=ccM(ccTxnHolds(t,{}).reduce(function(s,h){return s+h.amount;},0));
  expDraft.lines.forEach(function(x){if(Number(x.txnId)===t.id)used=ccM(used+ccM(Math.min(Number(x.cardAmount)||0,Number(x.amount)||0)));});
  const rem=ccM(el.amount-used);if(rem<=0)return undefined;
  expDraft.line=Object.assign(expBlankLine(),{title:last.title,amount:String(rem),start:last.start,end:last.end||last.start,paidBy:CC_PAID_CARD,cardId:t.cardId,cardAmount:String(rem),merchant:last.merchant,txnId:t.id,txnAt:last.txnAt||''});
  expRepaintForm();return undefined;
});
/* Editing a saved line keeps its transaction reference (the Build 4 line form copies only its own fields). */
ccHook('expStartLine',null,function(out,lineId){
  if(lineId==='new'||!expDraft)return undefined;
  const r=expRec(expSelectedId),l=r&&r.lines.find(function(x){return x.id===lineId;});
  const x=ccExpLineDraftExtra(l);if(!x.txnId)return undefined;
  Object.assign(expDraft,x);expDraftOrig=JSON.stringify(expDraft);renderADTPage();return undefined;
});

/* ── The claim's line: its card transaction match (FRD §6.2 Expense line detail) ── */
function ccExpLineMatchHTML(l,r){
  if(l.paidBy!==CC_PAID_CARD)return '';
  ccMatchSync(r.entity);
  const i=ccLineMatchInfo(r,l);if(!i)return '';
  const A=ccNow(),fin=ccCan('card.transaction.match'),own=ccMatchOwn(A,r),live=CCM_SUBMITTED.indexOf(r.status)>=0;
  const tlink=function(t){return t?'<button class="att-link" onclick="ccOpenTxnUI('+t.id+',\'matching\')">'+ccE(expKey(t))+'</button>':'';};
  let acts='';
  if(live&&i.status!=='Matched'&&(fin||own))acts+='<button class="att-link" onclick="ccMxOpen(\'find\',{claimId:'+r.id+',lineId:'+l.id+'})">Find Match</button> ';
  (i.sugg||[]).forEach(function(s){
    if(fin&&!ccMatchIndepWhy(A,r,ccTxn(s.txnId))&&!s.blocked)acts+='<button class="att-link" onclick="ccMxOpen(\'confirm\',{id:'+s.id+'})">Confirm '+ccE(s.txnKey)+'</button> ';
    if(fin||own)acts+='<button class="att-link" onclick="ccMxOpen(\'reject\',{id:'+s.id+'})">Reject '+ccE(s.txnKey)+'</button> ';
  });
  if(i.match&&fin&&!ccMatchIndepWhy(A,r,i.txn))acts+='<button class="att-link" onclick="ccMxOpen(\'unmatch\',{id:'+i.match.id+'})">Unmatch</button>';
  const m=i.match,sg=(i.sugg||[]).map(function(s){return ccE(s.txnKey)+': '+ccE(s.diffs.map(function(x){return x.field+' '+x.expense+' vs '+x.txn;}).join('; ')||'review')+(s.blocked?' <span class="wb-warn">'+ccE(s.blocked)+'</span>':'');}).join(' | ');
  let h=axField(AX_ICO.fCheck,'Card Transaction Match',axBadge(i.tone,i.status)+' '+(i.txn?tlink(i.txn)+' ':'')
    +'<span class="ax-sub">'+ccE(m?expMoney(m.amount,m.currency)+' · '+m.method+(m.compare.rounding?' · rounding '+expMoney(m.compare.rounding,m.currency):'')+(m.demo?' · '+CC_DEMO:''):i.text)+'</span>'
    +(sg?' <span class="ax-sub">'+sg+'</span>':'')+(acts?' <span class="ca-actions">'+acts+'</span>':''),true);
  if(m&&m.compare.fx&&m.compare.fx.text&&(fin||ccCan('card.transaction.view.all')))h+=axField(AX_ICO.fCash,'FX Comparison',ccE(m.compare.fx.text),true);
  const hist=ccMatchesOfLine(r.id,l.id);
  if(hist.length>1||(hist.length&&!m))h+=axField(AX_ICO.fBox,'Matching History',ccE(hist.map(function(x){return x.txnKey+' '+x.status+(x.endNote?' ('+x.endNote+')':'')+' · '+x.at;}).join(' | ')),true);
  if((l.txnRefs||[]).length)h+=axField(AX_ICO.fBox,'Earlier Transaction Reference',ccE(l.txnRefs.map(function(x){return expKey(ccTxn(x.txnId)||{})+' set aside '+x.until+' by '+caN(x.by)+': '+x.reason;}).join(' | ')),true);
  return h;
}

/* ── Transaction panel → Expense Matching (FR-CT-10.10: amount, user, time, comparison source, FX) ── */
function ccTxnMatchSummary(t){
  if(t.direction==='Credit')return ccE(t.matchStatus)+' · '+ccE(t.reconStatus)+' <span class="ax-sub">a credit is linked to its original purchase, never matched to an expense</span>';
  const c=ccTxnHolderClaim(t),vis=c&&typeof expScope==='function'&&expScope().indexOf(c)>=0;
  return ccE(t.matchStatus)+(t.matchStatus==='Partially Matched'?' <span class="ax-sub">'+ccE(expMoney(t.matchedAmount,t.matchCurrency))+' matched · '+ccE(expMoney(t.unmatchedAmount,t.matchCurrency))+' unmatched</span>':'')
    +(c?' <span class="ax-sub">'+(vis?'<button class="att-link" onclick="ccOpenExpense('+c.id+')">'+ccE(expKey(c))+'</button>':ccE(expKey(c)))+' · '+ccE(c.status)+'</span>':'')+' · '+ccE(t.reconStatus);
}
function ccTxnMatchTabHTML(t){
  ccMatchSync(t.entity);
  const A=ccNow(),fin=ccCan('card.transaction.match'),cl=ccTxnHolderClaim(t),why=ccTxnExpenseWhyNot(t,A);
  let act='';
  if(!why)act+=ccBtn('Create Expense','ccTxnCreateExpense('+t.id+')',true);
  if(fin&&t.direction!=='Credit'&&t.walletClass!=='Flexi Benefit'&&t.status==='Posted'&&t.matchStatus!=='Matched')act+=ccBtn('Match to Expense','ccMxOpen(\'find-line\',{txnId:'+t.id+'})');
  const cur=t.matchCurrency||t.currency,el=ccTxnEligible(t,cur),act2=ccMatchesOfTxn(t.id),sug=ccMatchOpenSugg(null,null,t.id),all=ccMatchesOfTxn(t.id,true);
  const st=function(l,n,tone){return caStat(l,n,false,'',tone||'info');};
  const note=t.walletClass==='Flexi Benefit'?'Benefit-wallet spending follows the Wallet & Benefits rules; it is not matched to an expense claim.'
    :t.direction==='Credit'?'A credit to the card, linked to its original purchase; it is never matched to an expense.'
    :'One transaction may cover several lines of one claim; a line links to one transaction; the matched total never exceeds the transaction. Matching is not approval and posts nothing.';
  const fx=ccFxVariance(t);
  const row=function(m){const r=expRec(m.claimId),vis=r&&typeof expScope==='function'&&expScope().indexOf(r)>=0,ind=r?ccMatchIndepWhy(A,r,t):'x';
    let a='';
    if(m.status==='Matched'&&fin&&!ind)a+='<button class="att-link" onclick="ccMxOpen(\'unmatch\',{id:'+m.id+'})">Unmatch</button>';
    if(m.status==='Suggested'){if(fin&&!ind&&!m.blocked)a+='<button class="att-link" onclick="ccMxOpen(\'confirm\',{id:'+m.id+'})">Confirm</button> ';if(fin||(r&&ccMatchOwn(A,r)))a+='<button class="att-link" onclick="ccMxOpen(\'reject\',{id:'+m.id+'})">Reject</button>';}
    return '<tr><td>'+ccE(expKey(m))+'<div class="ax-sub">'+ccE(m.at)+'</div></td><td>'+(vis?'<button class="att-link" onclick="ccOpenExpense('+m.claimId+')">'+ccE(m.lineRef)+'</button>':ccE(m.lineRef))+'<div class="ax-sub" style="white-space:normal">'+ccE(m.lineTitle)+'</div></td>'
      +'<td>'+ccE(expMoney(m.amount,m.currency))+'<div class="ax-sub" style="white-space:normal">'+ccE(m.compare.basis)+(m.compare.rounding?' · rounding '+expMoney(m.compare.rounding,m.currency):'')+'</div></td>'
      +'<td>'+axBadge(statusTone(m.status),m.status)+'<div class="ax-sub" style="white-space:normal">'+ccE(m.method)+(m.diffs.length?' · '+m.diffs.map(function(x){return x.field+' '+x.expense+' vs '+x.txn;}).join('; '):'')+(m.blocked?' · '+m.blocked:'')
        +(m.endNote?' · '+m.endNote:'')+' · '+ccE(caN(m.by))+(m.actual?' (through Switch User by '+ccE(caN(m.actual))+')':'')+'</div></td><td>'+a+'</td></tr>';};
  return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
    +(why&&!fin&&t.direction!=='Credit'?'<div class="wb-note"><div class="wb-note-sub">'+ccE(why)+'</div></div>':'')
    +'<div class="listing-stats exp-stats cc-bulk-stats">'+st('Matching',t.matchStatus,t.matchStatus==='Matched'?'ok':t.matchStatus==='Unmatched'?'idle':'wait')
      +(el.error?'':st('Transaction',expMoney(el.amount,el.currency),'info')+st('Matched',expMoney(t.matchedAmount||0,el.currency),'ok')+st('Remaining',expMoney(ccM(Math.max(0,el.amount-(t.matchedAmount||0))),el.currency),'wait'))+'</div>'
    +'<div class="wb-note"><div class="wb-note-sub">'+ccE(note)+(cl?' Claimed by '+ccE(expKey(cl))+' ('+ccE(cl.status)+').':'')+'</div></div>'
    +(fx&&(fin||ccCan('card.transaction.view.all'))?'<div class="wb-note"><b>FX</b><div class="wb-note-sub">'+ccE(fx.text)+'</div></div>':'')
    +'<div class="lp-sb-view-header" style="margin-top:10px"><span class="lp-sb-section-title">Matches and Suggestions</span><span class="ax-count">'+(act2.length+sug.length)+'</span></div>'
    +(act2.length+sug.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Match</th><th>Expense Line</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'+act2.concat(sug).map(row).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No expense line is matched to this transaction.</div>')
    +(all.length>act2.length+sug.length?'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Matching History</span></div><div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Match</th><th>Expense Line</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'
      +all.filter(function(m){return ['Matched','Suggested'].indexOf(m.status)<0;}).map(row).join('')+'</tbody></table></div>':'');
}
/* ── The Matching Exceptions queue (Cards → Transactions), beside the register as Card Mapping Review is in 8B ── */
function ccMatchQueueVisible(){return ccCan('card.transaction.view.all')||ccCan('card.transaction.match');}
function ccTxnMatchView(){ccTxnView=ccTxnView==='matching'?'list':'matching';ccTxnSel=null;renderADTPage();}
function ccMxShort(t){t=String(t||'');const m=/^(.*?[.:])(\s|$)/.exec(t);return m?m[1].replace(/:$/,''):t;}
function ccTxnMatchQueueHTML(){
  const rows=ccMatchExceptions(),A=ccNow(),fin=ccCan('card.transaction.match');
  const stack=function(a){return a?'<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px">'+a+'</div>':'';};
  const exc=function(cat,tone,status,why){return '<div class="lp-c-plain" style="white-space:normal">'+ccE(cat)+'</div><div style="margin-top:4px">'+axBadge(tone,status)+'</div>'
    +(why?'<div class="lp-c-sub" style="white-space:normal">'+ccE(why)+'</div>':'');};
  const body=rows.map(function(x,i){
    if(x.kind==='txn'){const t=x.t;
      return '<tr><td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-plain">—</div><div class="lp-c-sub">no expense line for the rest</div></td>'
        +'<td><div class="lp-c-main ax-c-link" onclick="ccTxnOpen('+t.id+',\'matching\')" style="cursor:pointer">'+ccE(expKey(t))+'</div><div class="lp-c-sub" style="white-space:normal">'+ccE(t.name+' · '+ccMask(t.cardRef.last4)+' · '+t.merchant)+'</div></td>'
        +'<td class="exp-c-amt">'+ccE(expMoney(x.amount,x.currency))+'<div class="lp-c-sub">unmatched of '+ccE(expMoney(t.matchedAmount+x.amount,x.currency))+'</div></td>'
        +'<td>'+exc(x.category,'wait','Partially Matched','')+'</td>'
        +'<td>'+stack(fin?'<button class="att-link" onclick="ccMxOpen(\'find-line\',{txnId:'+t.id+'})">Match to Expense</button>':'')+'</td></tr>';}
    const r=x.r,l=x.l,i2=x.info,t=i2.txn,ind=fin&&!ccMatchIndepWhy(A,r,t);
    let a=fin?'<button class="att-link" onclick="ccMxOpen(\'find\',{claimId:'+r.id+',lineId:'+l.id+'})">Find Match</button>':'';
    (i2.sugg||[]).forEach(function(s){if(ind&&!s.blocked)a+='<button class="att-link" onclick="ccMxOpen(\'confirm\',{id:'+s.id+'})">Confirm '+ccE(s.txnKey)+'</button>';if(fin)a+='<button class="att-link" onclick="ccMxOpen(\'reject\',{id:'+s.id+'})">Reject '+ccE(s.txnKey)+'</button>';});
    const why=i2.sugg&&i2.sugg.length?'Suggested: '+i2.sugg.map(function(s){return s.txnKey+(s.blocked?' (above the line amount)':'');}).join(', '):t?ccMxShort(i2.text):'No card transaction yet';
    return '<tr><td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link" onclick="ccOpenExpense('+r.id+')" style="cursor:pointer">'+ccE(ccLineRef(r,l))+'</div><div class="lp-c-sub" style="white-space:normal">'+ccE((r.name||idEmpName(r.employeeEid))+' · '+l.title+' · '+r.status)+'</div></td>'
      +'<td>'+(t?'<div class="lp-c-main ax-c-link" onclick="ccTxnOpen('+t.id+',\'matching\')" style="cursor:pointer">'+ccE(expKey(t))+'</div><div class="lp-c-sub" style="white-space:normal">'+ccE(t.merchant+' · '+ccTxnAmt(t))+'</div>'
        :'<div class="lp-c-plain">'+ccE(l.cardRef?ccMask(l.cardRef.last4)+' · '+l.cardRef.key:'—')+'</div><div class="lp-c-sub">no transaction linked</div>')+'</td>'
      +'<td class="exp-c-amt">'+ccE(expMoney(x.amount,x.currency))+'<div class="lp-c-sub">card-funded · '+ccE(cdLabel(l.start))+'</div></td>'
      +'<td>'+exc(x.category,i2.tone,i2.status,why)+'</td><td>'+stack(a)+'</td></tr>';
  });
  return '<div class="wb-note"><b>Matching Exceptions</b><div class="wb-note-sub">Card-paid claim lines without a confirmed match, suggested matches and mismatches.</div></div>'
    +'<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Expense Line</th><th>Card · Transaction</th><th>Amount</th><th>Exception</th><th>Actions</th></tr></thead><tbody>'
    +(body.length?body.join(''):ccEmpty(6,'No matching exception: every card-paid line of a submitted claim is matched.'))+'</tbody></table>';
}

/* ── Popups: find a match (from a line or from a transaction), confirm, reject, unmatch; provider card ID ── */
function ccMxOpen(act,o){ccMxAct=Object.assign({act:act,f:{reason:'',value:'',meaning:'',ref:'',evidence:''}},o||{});renderADTPage();}
function ccMxClose(){ccMxAct=null;renderADTPage();}
function ccMxSync(){const a=ccMxAct;if(!a)return;let v;[['reason','ccmx-reason'],['value','ccmx-value'],['meaning','ccmx-meaning'],['ref','ccmx-ref']].forEach(function(p){if((v=ccVal(p[1]))!=null)a.f[p[0]]=v;});}
function ccMxFile(input){const fl=input.files&&input.files[0];input.value='';if(!fl)return;if(fl.size>5*1024*1024){showToast('File is over 5 MB','error',fl.name);return;}ccMxSync();ccMxAct.f.evidence=fl.name;renderADTPage();}
function ccMxCands(r,l){
  return ccTxns.filter(function(t){return t.entity===(r.entity||ccEnt())&&t.employeeEid===r.employeeEid&&t.direction!=='Credit'&&t.walletClass!=='Flexi Benefit'&&ccTxnVisible(t);})
    .map(function(t){return {t:t,cmp:ccMatchCompare(r,l,t,{manual:true})};})
    .filter(function(x){return x.cmp.kind!=='Duplicate Suspected'||!x.cmp.heldBy||x.cmp.heldBy===r.id;})
    .sort(function(a,b){const g=function(x){return x.cmp.ok?0:!x.cmp.block?1:x.cmp.kind==='Amount Mismatch'?2:3;},ms=function(x){return ccMerchSimilar(l.merchant,x.t.merchant)?0:1;},
      am=function(x){return Math.abs((x.cmp.remaining!=null?x.cmp.remaining:x.t.amount)-ccLineCardAmt(l));},dt=function(x){return Math.abs(Date.parse(x.t.date)-Date.parse(l.start));};
      return g(a)-g(b)||a.cmp.diffs.length-b.cmp.diffs.length||ms(a)-ms(b)||am(a)-am(b)||dt(a)-dt(b);});
}
function ccMxLineCands(t){
  const out=[];ccClaimsOf(t.entity).forEach(function(r){if(CCM_SUBMITTED.indexOf(r.status)<0||r.employeeEid!==t.employeeEid)return;
    ccCardLines(r).forEach(function(l){if(ccMatchOfLine(r.id,l.id))return;out.push({r:r,l:l,cmp:ccMatchCompare(r,l,t,{manual:true})});});});
  return out.sort(function(a,b){return (a.cmp.ok?0:!a.cmp.block?1:2)-(b.cmp.ok?0:!b.cmp.block?1:2);});
}
function ccMxMerchNote(l,t){return l&&l.merchant&&t&&!ccMerchSimilar(l.merchant,t.merchant)?' Merchant: '+l.merchant+' on the expense, '+t.merchant+' on the transaction.':'';}
function ccMxDiffText(cmp,diffs){diffs=diffs||cmp.diffs;return cmp.block?cmp.block:diffs.length?diffs.map(function(x){return x.field+': '+x.expense+' (expense) vs '+x.txn+' (transaction)';}).join('; '):'All checks pass: card, cardholder, settled and verified, amount and date agree.';}
function ccMxHTML(){
  const a=ccMxAct,f=a.f,A=ccNow(),close='ccMxClose()',btn=function(l){return '<button class="ep-save-btn" onclick="ccMxSave()">'+l+'</button>';};
  const reason=function(lbl,ph,req){return ccField(lbl||'Reason',req!==false,ccArea('ccmx-reason',f.reason,ph||''),'',true);};
  if(a.act==='find'||a.act==='find-line'){
    const fin=ccCan('card.transaction.match');let head='',list=[],rowsH='';
    if(a.act==='find'){
      const x=ccMatchLine(a.claimId,a.lineId);if(x.error)return '';const r=x.r,l=x.l,ind=fin&&!ccMatchIndepWhy(A,r,null);
      head='<div class="wb-note"><b>'+ccE(ccLineRef(r,l))+' · '+ccE(l.title)+'</b><div class="wb-note-sub">'+ccE(r.name||idEmpName(r.employeeEid))+' · card-funded '+ccE(expMoney(ccLineCardAmt(l),r.currency))+' on '+ccE(l.cardRef?ccMask(l.cardRef.last4)+' · '+l.cardRef.key:'')+' · '+ccE(cdLabel(l.start)+(l.end&&l.end!==l.start?' – '+cdLabel(l.end):''))+' · '+ccE(r.status)+'</div></div>';
      list=ccMxCands(r,l).filter(function(c){return ccMxQ(c.t,a.q);});
      rowsH=list.map(function(c){const t=c.t,cmp=c.cmp,df=cmp.block?[]:ccMatchPairDiffs(r,l,t,cmp);
        const lab=cmp.block?'':cmp.ok&&!df.length?'Match':ind?'Confirm with Differences':'Propose Match';
        return '<tr><td><b>'+ccE(expKey(t))+'</b><div class="ax-sub">'+ccE(ccTxnWhen(t))+'</div></td><td>'+ccE(t.merchant)+'<div class="ax-sub">'+ccE(ccTxnAmt(t))+' · '+ccE(t.status)+' · '+ccE(ccTxnVerifyLabel(t))+'</div></td>'
          +'<td><div class="ax-sub" style="white-space:normal">'+ccE(ccMxDiffText(cmp,df)+ccMxMerchNote(l,t))+'</div></td><td>'+(lab?'<button class="att-link" onclick="ccMxSave('+t.id+')">'+lab+'</button>':'')+'</td></tr>';}).join('');
    }else{
      const t=ccTxn(a.txnId);if(!t)return '';
      head='<div class="wb-note"><b>'+ccE(expKey(t))+' · '+ccE(t.merchant)+'</b><div class="wb-note-sub">'+ccE(t.name+' · '+ccMask(t.cardRef.last4)+' · '+ccTxnWhen(t)+' · '+ccTxnAmt(t))+' · '+ccE(t.matchStatus)+'</div></div>';
      list=ccMxLineCands(t);
      rowsH=list.map(function(c){const r=c.r,l=c.l,cmp=c.cmp,ind=fin&&!ccMatchIndepWhy(A,r,t),df=cmp.block?[]:ccMatchPairDiffs(r,l,t,cmp);
        const lab=cmp.block?'':cmp.ok&&!df.length?'Match':ind?'Confirm with Differences':'';
        return '<tr><td><b>'+ccE(ccLineRef(r,l))+'</b><div class="ax-sub">'+ccE(r.status)+'</div></td><td>'+ccE(l.title)+'<div class="ax-sub">card-funded '+ccE(expMoney(ccLineCardAmt(l),r.currency))+' · '+ccE(cdLabel(l.start))+'</div></td>'
          +'<td><div class="ax-sub" style="white-space:normal">'+ccE(ccMxDiffText(cmp,df)+ccMxMerchNote(l,t))+(lab===''&&!cmp.block&&!ind?' Someone independent of the claim decides on differences.':'')+'</div></td><td>'+(lab?'<button class="att-link" onclick="ccMxSave(null,'+r.id+','+l.id+')">'+lab+'</button>':'')+'</td></tr>';}).join('');
    }
    return bgModal(a.act==='find'?'Find Card Transaction':'Match to Expense Line',a.act==='find'?'The card transactions of this cardholder, with every difference shown. A match never exceeds the transaction and is not an approval; differences are accepted only by an independent reviewer with a reason.'
        :'Card-paid lines of this cardholder\'s submitted claims without a match. One transaction may cover several lines of one claim.',
      '<div class="ep-form-grid"><div class="ep-form-group ep-form-full">'+head+'</div>'
        +(a.act==='find'?'<div class="ep-form-group ep-form-full"><div style="display:flex;gap:8px"><input class="ep-form-input" id="ccmx-q" value="'+attrSafe(a.q||'')+'" placeholder="Search merchant, reference, amount or date"><button class="btn-outline btn-sm" onclick="ccMxSearch()">Search</button></div></div>':'')
        +reason('Reason','Required when you accept differences or correct a reference',false)
        +'<div class="ep-form-group ep-form-full">'+(rowsH?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>'+(a.act==='find'?'Transaction':'Line')+'</th><th>Details</th><th>Comparison</th><th></th></tr></thead><tbody>'+rowsH+'</tbody></table></div>'
          :'<div class="wb-empty-sm">'+(a.act==='find'?'No card transaction of this cardholder is recorded yet: the line stays Awaiting Transaction Evidence.':'No unmatched card-paid line of this cardholder.')+'</div>')+'</div></div>',{close:close,btns:''});
  }
  const m=a.id!=null?ccMatch(a.id):null;
  if(a.act==='confirm'&&m)return bgModal('Confirm Suggested Match · '+ccE(expKey(m)),'You accept '+ccE(m.txnKey)+' as the card payment of '+ccE(m.lineRef)+'. The differences stay on record with your reason; nothing is overwritten.',
    '<div class="ep-form-grid"><div class="ep-form-group ep-form-full"><div class="wb-note is-wait"><div class="wb-note-sub">'+ccE(m.diffs.map(function(x){return x.field+': '+x.expense+' (expense) vs '+x.txn+' (transaction)';}).join('; ')||'No differences')+'</div></div></div>'+reason('Why the differences are accepted')+'</div>',{close:close,btns:btn('Confirm Match')});
  if(a.act==='reject'&&m)return bgModal('Reject Suggested Match · '+ccE(expKey(m)),'The pair is not suggested again. The line keeps waiting for its transaction.','<div class="ep-form-grid">'+reason('Why it is not a match')+'</div>',{close:close,btns:btn('Reject')});
  if(a.act==='unmatch'&&m)return bgModal('Unmatch · '+ccE(expKey(m)),'Correct an incorrect match: '+ccE(m.txnKey)+' and '+ccE(m.lineRef)+' are separated. The match and its history are kept; the pair is never matched again automatically. The claim, its approval and its reimbursement are not changed.',
    '<div class="ep-form-grid">'+reason('Why the match is incorrect')+'</div>',{close:close,btns:btn('Unmatch')});
  const c=a.cardId!=null?ccCard(a.cardId):null;
  if(a.act==='extid-record'&&c)return bgModal('Provider Card ID · '+ccE(expKey(c)),'A stable, non-sensitive identifier supplied by '+ccE(ccProviderName(c.provider))+' for this card. It is restricted, shown masked, and maps statement rows only after someone independent verifies it. Never enter the card number, CVV, PIN or an authentication token.',
    '<div class="ep-form-grid">'+ccField('Provider Card ID',true,ccInput('ccmx-value',f.value,'As supplied by the provider'))+ccField('Provider Confirmation Reference',true,ccInput('ccmx-ref',f.ref,'Letter, portal record or e-mail reference'))
      +ccField('What the ID Identifies',true,ccArea('ccmx-meaning',f.meaning,'For example: this card account on every statement'),'',true)
      +ccField('Provider Confirmation',true,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · the provider\'s confirmation (max 5 MB)</span></span></label>','',true)+'</div>',
    {close:close,btns:btn('Record for Verification')});
  if(a.act==='extid-verify'&&c){const x=c.extCardId||{};return bgModal('Verify Provider Card ID · '+ccE(expKey(c)),'Check the provider\'s confirmation. Once verified, statement rows carrying this ID map to the card automatically.',
    '<div class="lp-sb-detail-grid">'+axField(AX_ICO.fKey,'Provider Card ID',ccE(ccExtIdMask(x.value)))+axField(AX_ICO.fBox,'Identifies',ccE(x.meaning||''))+axField(AX_ICO.fHash,'Confirmation',ccE((x.ref||'')+' · '+(x.evidence||'')))+axField(AX_ICO.fUser,'Recorded By',ccE(caN(x.by))+' <span class="ax-sub">'+ccE(x.at||'')+'</span>')+'</div>',{close:close,btns:btn('Verify')});}
  if(a.act==='extid-reject'&&c)return bgModal('Reject Provider Card ID · '+ccE(expKey(c)),'The ID is not used for mapping. Any earlier confirmed ID stays in use.','<div class="ep-form-grid">'+reason()+'</div>',{close:close,btns:btn('Reject')});
  return '';
}
function ccMxSave(txnId,claimId,lineId){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f;let err='',ok='';
  if(a.act==='find'||a.act==='find-line'){
    const res=a.act==='find'?ccMatchCreate(a.claimId,a.lineId,txnId,{reason:f.reason}):ccMatchCreate(claimId,lineId,a.txnId,{reason:f.reason});
    if(res.error){showToast('Not matched','error',res.error);return;}
    ok=res.suggested?'Proposed for review':'Matched';ccMxAct=null;renderADTPage();showToast(ok,'success',expKey(res.rec)+': '+res.rec.txnKey+' ↔ '+res.rec.lineRef+(res.suggested?'; someone independent reviews the differences.':'.'));return;
  }
  if(a.act==='confirm'){err=ccMatchConfirm(a.id,f.reason);ok='Match confirmed';}
  else if(a.act==='reject'){err=ccMatchReject(a.id,f.reason);ok='Suggestion rejected';}
  else if(a.act==='unmatch'){err=ccMatchRemove(a.id,f.reason);ok='Unmatched; the history is kept';}
  else if(a.act==='extid-record'){err=ccCardExtIdRecord(a.cardId,{value:f.value,ref:f.ref,meaning:f.meaning,evidence:f.evidence});ok='Provider card ID recorded; someone independent verifies it';}
  else if(a.act==='extid-verify'){err=ccCardExtIdVerify(a.cardId);ok='Provider card ID verified';}
  else if(a.act==='extid-reject'){err=ccCardExtIdReject(a.cardId,f.reason);ok='Provider card ID rejected';}
  if(err){showToast('Not saved','error',err);return;}
  ccMxAct=null;renderADTPage();showToast(ok,'success',a.id!=null?expKey(ccMatch(a.id)||{}):a.cardId!=null?expKey(ccCard(a.cardId)||{}):'');
}
/* The popups draw on the Corporate Cards page and on the Expenses page (the claim's line). */
ccHook('ccLoadModalsHTML',null,function(out){return ccMxAct?out+ccMxHTML():undefined;});
ccHook('buildExpensesHTML',null,function(out){return ccMxAct?out+ccMxHTML():undefined;});

/* ── B8-N12: the restricted Provider Card ID on the card panel ── */
function ccCardExtIdFieldHTML(c){
  if(!ccCardExtIdSees())return '';
  const A=ccNow(),x=c.extCardId,cur=ccCardExtIdOf(c),man=ccCan('card.lifecycle.manage')&&!!c.provider;
  let v=cur?ccE(ccExtIdMask(cur))+' <span class="ax-sub">confirmed'+(x&&x.status==='Confirmed'&&x.verifiedBy?' by '+ccE(caN(x.verifiedBy)):'')+' · restricted, shown masked · used for statement mapping</span>':'<span class="wb-muted">Not recorded</span> <span class="ax-sub">optional; supplied only by the provider, never invented</span>';
  if(x&&x.status==='Awaiting Verification')v+=' <span class="ax-sub">'+ccE(ccExtIdMask(x.value))+' awaits verification (recorded by '+ccE(caN(x.by))+')</span>';
  if(x&&x.rejected&&!cur&&x.status==='Rejected')v+=' <span class="ax-sub">'+ccE(x.rejected.value)+' rejected: '+ccE(x.rejected.reason)+'</span>';
  let a='';
  if(man&&!(x&&x.status==='Awaiting Verification'))a+='<button class="att-link" onclick="ccMxOpen(\'extid-record\',{cardId:'+c.id+'})">'+(cur?'Replace':'Record')+'</button> ';
  if(x&&x.status==='Awaiting Verification'&&!ccCardExtIdWhyNot(c,A))a+='<button class="att-link" onclick="ccMxOpen(\'extid-verify\',{cardId:'+c.id+'})">Verify</button> <button class="att-link" onclick="ccMxOpen(\'extid-reject\',{cardId:'+c.id+'})">Reject</button>';
  return axField(AX_ICO.fKey,'Provider Card ID','<div>'+v+'</div>'+(a?' <span class="ca-actions">'+a+'</span>':''));
}

/* ── My Cards and the card panel's Transactions tab: the Expense column ── */
function ccTxnExpenseCell(t){
  if(t.direction==='Credit')return '<span class="ax-sub">'+ccE(String(t.type||'credit').toLowerCase())+(t.refundOf&&t.refundOf.key?' of '+ccE(t.refundOf.key):'')+'</span>';
  if(t.walletClass==='Flexi Benefit')return '<span class="ax-sub">benefit wallet</span>';
  const c=ccTxnHolderClaim(t),vis=c&&typeof expScope==='function'&&expScope().indexOf(c)>=0,why=ccTxnExpenseWhyNot(t),prov=ccTxnProvisional(t);
  return ccE(t.matchStatus)+(t.matchStatus==='Partially Matched'?'<div class="ax-sub">'+ccE(expMoney(t.unmatchedAmount,t.matchCurrency))+' unmatched</div>':'')
    +(c?'<div class="ax-sub">'+(vis?'<button class="att-link" onclick="ccOpenExpense('+c.id+')">'+ccE(expKey(c))+'</button>':ccE(expKey(c)))+' · '+ccE(c.status)+'</div>':'')
    +(!why?'<div><button class="att-link" onclick="ccTxnCreateExpense('+t.id+')">Create Expense</button>'+(prov?' <span class="ax-sub">provisional</span>':'')+'</div>':'');
}

function ccMxQ(t,q){q=String(q||'').trim().toLowerCase();if(!q)return true;return [expKey(t),t.merchant,t.extRef,String(t.amount),String(t.billAmount),t.date,cdLabel(t.date),t.postDate].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;});}
function ccMxSearch(){ccMxSync();if(ccMxAct){const el=document.getElementById('ccmx-q');ccMxAct.q=el?el.value.trim():'';}renderADTPage();}


/* ══ Build 8D · Screens: Card Programmes policy, due dates in Add Expense, card exceptions, CSX resolution ══════════
   Existing screens only: the Card Programmes tab gets the submission policy beside the programmes; the Add Expense
   transaction block shows the due date and asks for a late claim justification; Cards → Transactions → Matching
   Exceptions lists every card exception with one filter and one summary line; a CSX opens in the same side panel. */
sbToneAdd({'due':'info','due-soon':'wait','overdue':'bad','late-data':'wait','claimed':'ok','unclaimed':'wait','not-required':'idle','resolution-requested':'wait','recovery-pending':'wait','refund-pending':'wait',
  'dispute-pending':'wait','verification-pending':'wait','approved-resolution':'info','resolved':'ok','under-review':'wait','superseded-–-requires-reassessment':'idle','proof-missing':'wait','evidence-missing':'wait',
  'clarification-requested':'wait','responded':'info','awaiting-approval':'wait','pending-approval':'wait','accepted':'ok','recovered':'ok','partially-recovered':'wait','cancelled':'idle'});
let ccPolForm=null,ccExcGroupF='',ccCsxSel=null,ccCsxTab='basic-details';

/* ── Company Settings → Card Programmes: Card Expense Submission Policy ── */
function ccClaimPolSectionHTML(){
  if(!['card.programme.view','card.programme.manage'].some(ccCan))return '';
  const ent=ccEnt(),can=ccCan('card.programme.manage'),today=ccEntToday(ent),book=ccClaimPols(ent),progs=ccProgs(ent);
  const now=function(pid){const p=ccClaimPolAt(ent,pid,today);return p;};
  const next=function(scope,pid){const f=book.versions.filter(function(v){return v.scope===scope&&v.programmeId===pid&&v.effFrom>today&&!v.replaced;}).sort(function(a,b){return a.effFrom<b.effFrom?-1:1;})[0];return f?'v'+f.v+' from '+cdLabel(f.effFrom):'—';};
  const ent0=ccClaimPolPick(book.versions.filter(function(v){return v.scope==='entity'&&v.effFrom<=today;}));
  const rows=[['Entity policy',ent0?ccClaimPolText(Object.assign({configured:true},ent0)):ccClaimPolText({configured:false}),ent0?cdLabel(ent0.effFrom):'—',next('entity',null),can?'<button class="att-link" onclick="ccPolOpen(\'entity\')">Set</button>':'']]
    .concat(progs.map(function(p){const v=ccClaimPolPick(book.versions.filter(function(x){return x.scope==='programme'&&x.programmeId===p.id&&x.effFrom<=today;})),cur=now(p.id);
      return [p.key+' · '+p.code,v&&!v.inherit?'Override: '+ccClaimPolText(cur):'Uses the entity policy',v?cdLabel(v.effFrom):'—',next('programme',p.id),can?'<button class="att-link" onclick="ccPolOpen(\'programme\','+p.id+')">Override</button>':''];}));
  return '<div class="wb-proj-h">Card Expense Submission Policy</div>'
    +'<div class="wb-note"><div class="wb-note-sub">Whether a posted card transaction needs an expense claim, and by when. '+CCD_SCHED_NOTE+'</div></div>'
    +(ccPolForm?ccPolFormHTML():'')
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Applies To</th><th>In Force Today</th><th>Since</th><th>Next Version</th>'+(can?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'
    +rows.map(function(r){return '<tr><td class="csag-td">'+ccE(r[0])+'</td><td class="csag-td" style="white-space:normal">'+ccE(r[1])+'</td><td class="csag-td">'+ccE(r[2])+'</td><td class="csag-td">'+ccE(r[3])+'</td>'+(can?'<td class="csag-td csag-act">'+r[4]+'</td>':'')+'</tr>';}).join('')
    +'</tbody></table></div>'
    +(book.versions.length?'<div class="wb-proj-h">Policy history</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>Applies To</th><th>From</th><th>Policy</th><th>Set By</th></tr></thead><tbody>'
      +book.versions.slice().reverse().map(function(v){const p=v.programmeId?ccProg(v.programmeId):null;
        return '<tr><td class="csag-td">v'+v.v+(v.replaced?' <span class="lp-c-sub">replaced before it applied</span>':'')+'</td><td class="csag-td">'+ccE(p?p.key+' · '+p.code:'Entity')+'</td><td class="csag-td">'+ccE(cdLabel(v.effFrom))+'</td>'
          +'<td class="csag-td" style="white-space:normal">'+ccE(v.inherit?'Uses the entity policy':ccClaimPolText(Object.assign({configured:true},v)))+((v.benefitEvidence||[]).length?'<div class="lp-c-sub">Benefit evidence as saved in 8D ('+ccE(v.benefitEvidence.map(wbTypeName).join(', '))+'): '+(v.evMigrated?'moved to Wallet & Benefits'+(v.evMigrated.conflicts.length?' with '+v.evMigrated.conflicts.length+' conflict(s) recorded':''):'moves to Wallet & Benefits')+'</div>':'')+'<div class="lp-c-sub">'+ccE(v.reason)+'</div></td>'
          +'<td class="csag-td">'+ccE(caN(v.by))+'<div class="lp-c-sub">'+ccE(v.at)+(v.actual?' · through Switch User by '+ccE(caN(v.actual)):'')+'</div></td></tr>';}).join('')+'</tbody></table></div>':'');
}
ccHook('ccProgrammesSectionHTML',null,function(out){return out?out+ccClaimPolSectionHTML():undefined;});
function ccBenefitWallets(){return ccClaimBenefitWallets();}
function ccPolOpen(scope,pid){
  if(!ccCan('card.programme.manage')){emsDeny('change card policies');return;}
  const cur=ccClaimPolAt(ccEnt(),pid||null,ccEntToday(ccEnt()));
  ccPolForm={scope:scope,programmeId:pid||null,inherit:scope==='programme'&&cur.source!=='Programme override'?'Use the entity policy':'Override',requireClaim:cur.requireClaim===false?'No':'Yes',windowOn:cur.windowOn?'Yes':'No',
    days:cur.days||'',remind:cur.windowOn?(cur.remind||[]).join(', '):'3',overdueEvery:String(cur.overdueEvery||0),esc:cur.escalation?ccClaimEscLabel(cur.escalation):'None',escAfter:String(cur.escAfter||1),effFrom:wbAddDays(ccEntToday(ccEnt()),1),reason:''};
  refreshCsSidebar();
}
function ccPolClose(){ccPolForm=null;refreshCsSidebar();}
function ccPolSync(){
  const f=ccPolForm;if(!f)return;let v;const cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  [['days','ccpol-days'],['remind','ccpol-remind'],['overdueEvery','ccpol-overdue'],['escAfter','ccpol-escafter'],['reason','ccpol-reason']].forEach(function(p){if((v=ccVal(p[1]))!=null)f[p[0]]=v;});
  [['inherit','ccpol-inherit'],['requireClaim','ccpol-req'],['windowOn','ccpol-window'],['esc','ccpol-esc']].forEach(function(p){if((v=cs(p[1]))!=null)f[p[0]]=v;});
  if((v=bgVal('ccpol-eff'))!=null)f.effFrom=v;
}
function ccPolHook(){ccPolSync();refreshCsSidebar();}
function ccPolFormHTML(){
  const f=ccPolForm,p=f.programmeId?ccProg(f.programmeId):null,inh=f.scope==='programme'&&f.inherit==='Use the entity policy',win=f.windowOn==='Yes'&&f.requireClaim==='Yes',bw=ccBenefitWallets();
  return '<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+(p?'Programme Override · '+ccE(p.key+' '+p.code):'Entity Policy · '+ccE(idEntityName(ccEnt())))+'</span></div><div class="ep-form-grid">'
    +(f.scope==='programme'?ccField('Policy Source',true,apCS('ccpol-inherit',['Use the entity policy','Override'],f.inherit,'Select','ccPolHook')):'')
    +(inh?'':ccField('Require Card Expense Submission',true,apCS('ccpol-req',['Yes','No'],f.requireClaim,'Select','ccPolHook'),'Whether a posted corporate card transaction needs an expense claim.')
      +(f.requireClaim==='Yes'?ccField('Submission Window',true,apCS('ccpol-window',['Yes','No'],f.windowOn,'Select','ccPolHook'),'No universal deadline: off unless you enable it.'):'')
      +(win?ccField('Submission Window (Days)',true,ccInput('ccpol-days',f.days,'1 to 365','number'),'Counted from the posting date, on the entity clock ('+ccE(entTimezone()||'timezone not set')+').')
        +ccField('Reminder Schedule (days before due)',false,ccInput('ccpol-remind',f.remind,'e.g. 7, 3, 1'),'Due Soon starts at the first reminder day. Empty: no due-soon reminder. A suggested value is not active until the policy is saved.')
        +ccField('Overdue Reminder Every (days)',false,ccInput('ccpol-overdue',f.overdueEvery,'0 = once','number'))
        +ccField('Escalation Recipient',false,apCS('ccpol-esc',['None'].concat(ccClaimEscOptions().map(function(o){return o.label;})),f.esc,'Select','ccPolHook'),'The cardholder\'s reporting manager, an existing role or an RBAC team. Only this recipient is told, once per policy version.')
        +(f.esc&&f.esc!=='None'?ccField('Escalate After (days overdue)',true,ccInput('ccpol-escafter',f.escAfter,'1 to 90','number')):''):'')
      +(bw.length?ccField('Benefit Card Spend Evidence',false,'<div class="wb-note"><div class="wb-note-sub">'+ccE(ccBenefitEvidenceSummary()||'No Wallet-Funded benefit category uses these wallets yet.')+'</div></div>','Set per benefit category in Wallet & Benefits → Benefit Categories; shown here read-only.',true):''))
    +ccField('Policy Effective Date',true,apCD('ccpol-eff',f.effFrom,'Select date'),'Today or later; transactions posted before it keep the policy that applied to them.')
    +ccField('Reason',true,ccArea('ccpol-reason',f.reason,'Kept in the policy history'),'',true)
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccPolClose()">Cancel</button><button class="ep-save-btn" onclick="ccPolSave()">Save Policy</button></div></div>';
}
function ccPolSave(){
  ccPolSync();const f=ccPolForm;if(!f)return;
  const esc=ccClaimEscOptions().find(function(o){return o.label===f.esc;})||null;
  const res=ccClaimPolSave({scope:f.scope,programmeId:f.programmeId,inherit:f.scope==='programme'&&f.inherit==='Use the entity policy',requireClaim:f.requireClaim,windowOn:f.windowOn,days:f.days,remind:f.remind,
    overdueEvery:f.overdueEvery,escalation:esc?{kind:esc.kind,ref:esc.ref}:null,escAfter:f.escAfter,effFrom:f.effFrom,reason:f.reason});
  if(res.error){showToast('Not saved','error',res.error);return;}
  ccPolForm=null;refreshCsSidebar();showToast('Policy saved','success','v'+res.rec.v+' applies from '+cdLabel(res.rec.effFrom)+'.');
}

/* ── Add Expense: the due date of the transaction and the late claim justification ── */
const ccExpTxnLineHTMLBase8C=ccExpTxnLineHTML;
ccExpTxnLineHTML=function(d,cur){
  let h=ccExpTxnLineHTMLBase8C(d,cur);const t=ccTxn(d.txnId),s=t?ccTxnClaimDue(t):null;
  if(s&&['Due','Due Soon','Overdue','Late Data'].indexOf(s.state)>=0)h+='<div class="ep-form-group ep-form-full"><div class="wb-note'+(s.state==='Overdue'?' is-bad':' is-wait')+'"><b>'+ccE(s.state)+'</b><div class="wb-note-sub">'+ccE(s.text)+'</div></div></div>';
  if(s&&s.state==='Overdue')h+='<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="exp-l-late">Late Claim Justification <span class="req">*</span></label>'
    +'<textarea class="ep-form-input ax-notes" id="exp-l-late" placeholder="Why the claim is submitted after the due date">'+attrSafe(d.lateJust||'')+'</textarea><div class="ea-hint">Required to submit a late claim; it is approved as usual.</div></div>';
  return h;
};
const ccExpLineSyncBase8D=ccExpLineSync;
ccExpLineSync=function(t){ccExpLineSyncBase8D(t);const el=document.getElementById('exp-l-late');if(el&&t)t.lateJust=el.value.trim();};

/* ── Cards → Transactions → Matching Exceptions: every card exception, one filter, one summary line ── */
function ccMatchQueueVisible(){return ccCan('card.transaction.view.all')||ccCan('card.transaction.match')||ccCan('card.csx.resolve');}
function ccExcGroupPick(){const v=getCSValue('ctx-x-group');ccExcGroupF=v==='All Exceptions'?'':v||'';renderADTPage();}
function ccExcRecLink(row){
  if(row.kind==='csx')return '<div class="lp-c-main ax-c-link" onclick="ccCsxOpen('+row.x.id+')" style="cursor:pointer">'+ccE(expKey(row.x))+'</div><div class="lp-c-sub" style="white-space:normal">'+ccE(row.x.claimKey+' · '+row.x.lineTitle)+'</div>';
  if(row.r)return '<div class="lp-c-main ax-c-link" onclick="ccOpenExpense('+row.r.id+')" style="cursor:pointer">'+ccE(row.l?ccLineRef(row.r,row.l):expKey(row.r))+'</div><div class="lp-c-sub" style="white-space:normal">'+ccE((row.l?row.l.title+' · ':'')+row.r.status)+'</div>';
  return '<div class="lp-c-plain">—</div>';
}
function ccExcTxnCell(row){
  const t=row.t||(row.info&&row.info.txn)||(row.x?null:null),l=row.l;
  if(t)return '<div class="lp-c-main ax-c-link" onclick="ccTxnOpen('+t.id+',\'matching\')" style="cursor:pointer">'+ccE(expKey(t))+'</div><div class="lp-c-sub" style="white-space:normal">'+ccE(t.merchant+' · '+ccTxnAmt(t))+(t.demo?' · '+CC_DEMO:'')+'</div>';
  const ref=l&&l.cardRef?l.cardRef:row.x&&row.x.cardRef;return '<div class="lp-c-plain">'+ccE(ref?ccMask(ref.last4)+' · '+ref.key:'—')+'</div><div class="lp-c-sub">'+(row.kind==='csx'?'card spend not approved':'no transaction linked')+'</div>';
}
function ccExcActions(row){
  const A=ccNow(),fin=ccCan('card.transaction.match'),out=[],L=function(lbl,call){out.push('<button class="att-link" onclick="'+call+'">'+lbl+'</button>');};
  if(row.kind==='line'){const r=row.r,l=row.l,t=row.info.txn,ind=fin&&!ccMatchIndepWhy(A,r,t);if(fin)L('Find Match','ccMxOpen(\'find\',{claimId:'+r.id+',lineId:'+l.id+'})');
    (row.info.sugg||[]).forEach(function(s){if(ind&&!s.blocked)L('Confirm '+ccE(s.txnKey),'ccMxOpen(\'confirm\',{id:'+s.id+'})');if(fin)L('Reject '+ccE(s.txnKey),'ccMxOpen(\'reject\',{id:'+s.id+'})');});}
  if(row.kind==='unclaimed'&&!ccTxnExpenseWhyNot(row.t,A))L('Create Expense','ccTxnCreateExpense('+row.t.id+')');
  if(row.kind==='txn'&&row.group===CCX_GROUPS[2]&&fin)L('Match to Expense','ccMxOpen(\'find-line\',{txnId:'+row.t.id+'})');
  if(row.kind==='csx')L('Open','ccCsxOpen('+row.x.id+')');
  else L('Review','ccMxOpen(\'exc\',{key:\''+row.key+'\'})');
  return '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px">'+out.join('')+'</div>';
}
function ccExcSummaryHTML(rows){
  const s=ccExcSummary(rows),cur=ccProgs()[0]?ccProgs()[0].currency:'INR';
  return '<div class="wb-note"><b>Matching Exceptions</b><div class="wb-note-sub">'
    +ccE('Unclaimed '+s.unclaimed+' ('+s.overdue+' overdue) · awaiting transaction evidence '+s.awaiting+' · missing evidence '+s.evidence+' · card spend exceptions '+s.csxOpen+': outstanding '+expMoney(s.csxOutstanding,cur)+', resolved '+expMoney(s.csxResolved,cur)
      +' · under review '+s.csxReview+' · pending recovery '+s.csxRecovery+' · pending refund or dispute credit '+s.csxRefund+'.')
    +' Card exceptions close themselves when their records change; what people did about them stays on record. Drafts appear only for a missing receipt. '+ccE(CCD_SCHED_NOTE)+'</div></div>';
}
ccTxnMatchQueueHTML=function(){
  if(typeof ccClaimRemindSweep==='function')ccClaimRemindSweep();
  const CSXP='Card Spend – Partially Resolved',all=ccCardExceptions();
  const rows=ccExcGroupF===CSXP?all.filter(function(x){return x.kind==='csx'&&ccCsxPartial(x.x);}):ccExcGroupF?all.filter(function(x){return x.group===ccExcGroupF;}):all;
  const groups=CCX_GROUPS.filter(function(g){return all.some(function(x){return x.group===g;});}).concat(all.some(function(x){return x.kind==='csx'&&ccCsxPartial(x.x);})?[CSXP]:[]);
  const body=rows.map(function(x,i){
    const st=x.state&&x.state!=='Open'?'<div class="lp-c-sub">'+ccE(x.state)+'</div>':'';
    return '<tr><td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-plain" style="white-space:normal">'+ccE(x.group)+'</div><div style="margin-top:4px">'+axBadge(x.info.tone||statusTone(x.info.status),x.info.status)+'</div>'
        +'<div class="lp-c-sub" style="white-space:normal">'+ccE(ccMxShort(x.text||''))+'</div>'+st+'</td>'
      +'<td><div class="lp-c-plain">'+ccE(idEmpName(x.eid)||'—')+'</div>'+ccExcRecLink(x)+'</td><td>'+ccExcTxnCell(x)+'</td>'
      +'<td class="exp-c-amt">'+ccE(expMoney(x.amount,x.currency))+(x.due&&x.due.due?'<div class="lp-c-sub">due '+ccE(cdLabel(x.due.due))+'</div>':'')+'</td><td>'+ccExcActions(x)+'</td></tr>';
  });
  return ccExcSummaryHTML(all)
    +'<div class="cc-filter-row" style="margin:0 0 10px">'+apCS('ctx-x-group',groups,ccExcGroupF,'All Exceptions','ccExcGroupPick')+'</div>'
    +'<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Exception</th><th>Employee · Record</th><th>Card · Transaction</th><th>Amount</th><th>Actions</th></tr></thead><tbody>'
    +(body.length?body.join(''):ccEmpty(6,'No card exception.'))+'</tbody></table>';
};

/* ── The exception popup: reason, status, trail; Request Clarification, Mark for Review, Provide Information ── */
const ccMxHTMLBase8C=ccMxHTML;
ccMxHTML=function(){
  const a=ccMxAct;if(!a)return '';
  if(a.act==='exc')return ccExcPopupHTML(a);
  if(String(a.act).indexOf('csx-')===0)return ccCsxPopupHTML(a);
  return ccMxHTMLBase8C();
};
const ccMxSyncBase8C=ccMxSync;
ccMxSync=function(){ccMxSyncBase8C();const a=ccMxAct;if(!a)return;let v;
  [['amount','ccmx-amount'],['ref','ccmx-ref'],['just','ccmx-just'],['note','ccmx-note']].forEach(function(p){if((v=ccVal(p[1]))!=null)a.f[p[0]]=v;});
  if((v=bgVal('ccmx-date'))!=null)a.f.date=v;
  [['method','ccmx-method'],['kind','ccmx-kind'],['credit','ccmx-credit']].forEach(function(p){if(document.getElementById('csw-'+p[1]))a.f[p[0]]=getCSValue(p[1]);});};
function ccExcRowByKey(key){return ccCardExceptions().find(function(x){return x.key===key;})||null;}
function ccExcPopupHTML(a){
  const key=a.key,row=ccExcRowByKey(key),x=ccExc(key),A=ccNow(),fin=ccCan('card.transaction.match'),owner=ccExcOwner(key),ou=owner?idUserOfEmp(owner):'';
  const own=ou===A.who||ou===caVia(A),f=a.f,close='ccMxClose()';
  const trail=x&&x.items.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>What</th><th>By</th></tr></thead><tbody>'
    +x.items.slice().reverse().map(function(i){return '<tr><td>'+ccE(i.at)+'</td><td>'+ccE(i.type)+'<div class="ax-sub" style="white-space:normal">'+ccE(i.text||'')+(i.file?' ('+ccE(i.file)+')':'')+'</div></td><td>'+ccE(caN(i.by))+(i.actual?'<div class="ax-sub">through Switch User by '+ccE(caN(i.actual))+'</div>':'')+'</td></tr>';}).join('')+'</tbody></table></div>':'';
  const btns=(fin&&!own?'<button class="btn-outline" onclick="ccExcAct(\'clar\')">Request Clarification</button><button class="btn-outline" onclick="ccExcAct(\'review\')">Mark for Review</button>':'')
    +(own||ccCan('expense.claim.create.others')?'<button class="ep-save-btn" onclick="ccExcAct(\'respond\')">Provide Information</button>':'');
  return bgModal('Card Exception'+(row?' · '+ccE(row.group):''),row?ccE(row.text||''):'This exception is closed: its records changed.',
    '<div class="ep-form-grid"><div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">Status: '+ccE(x?x.status:'Open')+(owner?' · employee '+ccE(idEmpName(owner)):'')+'</div></div></div>'
      +(row&&row.kind==='benefit'?ccExcBenefitHTML(row,f):'')
      +ccField('Note',false,ccArea('ccmx-reason',f.reason,'What is missing, what is reviewed, or the information provided'),'',true)
      +ccField('Attachment',false,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · bill, receipt or declaration (max 5 MB)</span></span></label>','',true)
      +'<div class="ep-form-group ep-form-full">'+trail+'</div></div>',{close:close,btns:btns});
}
function ccExcAct(kind){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f,row=ccExcRowByKey(a.key);let err='',ok='';
  if(kind==='clar'){err=ccExcRequestClar(a.key,f.reason);ok='Clarification requested';}
  else if(kind==='review'){err=ccExcMarkReview(a.key,f.reason);ok='Marked for review';}
  else{err=ccExcRespond(a.key,{note:f.reason,file:f.evidence,benefit:!!(row&&row.kind==='benefit'),declare:!!f.declare});ok='Information provided';}
  if(err){showToast('Not saved','error',err);return;}
  ccMxAct=null;renderADTPage();showToast(ok,'success',a.key);
}

/* ── The CSX side panel (same split panel as a transaction) ── */
function ccCsxOpen(id,tab){
  const x=ccCsx(id);if(!x||!ccCsxVisible(x)){showToast('Not available','error','This card spend exception is outside your access.');return;}
  if(page!=='cards'||ccPageTab!=='cards'||ccCardsSub!=='txns'||!ccTxnAdminView()){ccCsxOpenUI(id,tab);return;}
  ccTxnSel=null;ccCsxSel=x.id;ccCsxTab=tab||ccCsxTab||'basic-details';renderADTPage();
}
function ccCsxOpenUI(id,tab){
  const x=ccCsx(id);if(!x)return;
  if(!ccCsxVisible(x)){showToast('Not available','error','This card spend exception is outside your access.');return;}
  if(!ccAdminView()||!ccTxnAdminView()){ccMxAct={act:'csx-view',id:x.id,f:{}};if(page!=='cards')navigatePage('cards');else renderADTPage();return;}
  ccCloseForms();ccPageTab='cards';ccCardsSub='txns';ccTxnView='matching';ccTxnSel=null;ccCsxSel=x.id;ccCsxTab=tab||'basic-details';
  if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function ccCsxOpenReq(id,tab){const q=ccCsxReq(id);if(q)ccCsxOpenUI(q.csxId,'approval');}
function ccCsxClose(){ccCsxSel=null;renderADTPage();}
function ccCsxNav(t){ccCsxTab=t;renderADTPage();}
function ccCsxActions(x){
  const A=ccNow(),may=!ccCsxMay(A,x),v=ccCsxAmounts(x),out=[],add=function(l,c,pr){out.push(ccBtn(l,c,pr));};
  if(may&&v.free>0){add('Company Acceptance','ccMxOpen(\'csx-accept\',{id:'+x.id+'})',true);add('Employee Recovery','ccMxOpen(\'csx-recover\',{id:'+x.id+'})');
    add('Refund or Dispute Credit','ccMxOpen(\'csx-credit\',{id:'+x.id+'})');}
  if(may)add('Mark for Review','ccMxOpen(\'exc\',{key:\'csx:'+x.id+'\'})');
  return out.join('');
}
function ccCsxResRowHTML(x,r){
  const A=ccNow(),may=!ccCsxMay(A,x),acts=[],L=function(l,c){acts.push('<button class="att-link" onclick="'+c+'">'+l+'</button>');};
  if(r.type==='Employee Recovery'){
    if(r.status==='Pending Approval'&&ccCan('advance.recovery.approve'))L('Approve / Reject','ccMxOpen(\'csx-recdecide\',{id:'+x.id+',n:'+r.n+'})');
    if(['Recovery Pending','Partially Recovered'].indexOf(r.status)>=0&&may)L('Record Collection','ccMxOpen(\'csx-collect\',{id:'+x.id+',n:'+r.n+'})');
    (r.collections||[]).forEach(function(c){if(c.status==='Awaiting Verification'&&ccCan('advance.recovery.approve'))L('Verify '+ccE(c.ref),'ccMxOpen(\'csx-colverify\',{id:'+x.id+',n:'+r.n+',k:'+c.k+'})');});
  }
  if(['Verified Refund','Dispute Credit'].indexOf(r.type)>=0&&['Refund Pending','Dispute Pending','Verification Pending'].indexOf(r.status)>=0&&may)L('Link Credit','ccMxOpen(\'csx-link\',{id:'+x.id+',n:'+r.n+'})');
  (r.credits||[]).forEach(function(c){if(c.status==='Awaiting Finance Review'&&ccCan('card.transaction.match')&&[c.by,c.actual].indexOf(A.who)<0)L('Review '+ccE(c.key),'ccMxOpen(\'csx-crreview\',{id:'+x.id+',n:'+r.n+',txnId:'+c.txnId+'})');});
  if(r.type!=='Company Acceptance'&&CSX_RES_OPEN.indexOf(r.status)>=0&&may)L('Cancel','ccMxOpen(\'csx-cancel\',{id:'+x.id+',n:'+r.n+'})');
  const det=[r.reason||'',r.reqKey?'request '+r.reqKey:'',r.method||'',r.ref?'ref '+r.ref:'',r.budget?'budget '+r.budget.result:'',(r.collections||[]).length?(r.collections.map(function(c){return c.ref+' '+expMoney(c.amount,x.currency)+' '+c.status;}).join('; ')):'',
    (r.credits||[]).length?r.credits.map(function(c){return c.key+' '+expMoney(ccCsxCreditAmt(c),x.currency)+(c.rate?' (at '+c.rate+')':'')+(c.status&&c.status!=='Linked'?' '+c.status:'');}).join('; '):'',(r.budgetEvents||[]).length?'budget '+r.budgetEvents.join(', '):''].filter(Boolean).join(' · ');
  return '<tr><td>'+r.n+'</td><td>'+ccE(r.type)+'<div class="ax-sub">'+ccE(caN(r.by))+' · '+ccE(r.at)+(r.actual?' · through Switch User by '+ccE(caN(r.actual)):'')+'</div></td>'
    +'<td>'+ccE(expMoney(r.amount,x.currency))+(r.resolved?'<div class="ax-sub">resolved '+ccE(expMoney(r.resolved,x.currency))+'</div>':'')+'</td><td>'+axBadge(statusTone(r.status),r.status)+'<div class="ax-sub" style="white-space:normal">'+ccE(det)+'</div></td><td><div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;white-space:nowrap">'+acts.join('')+'</div></td></tr>';
}
function ccCsxBodyHTML(x,own){
  const v=ccCsxAmounts(x),o=ccCsxLine(x),st=function(l,n,tone){return caStat(l,n,false,'',tone||'info');};
  return '<div class="listing-stats exp-stats cc-bulk-stats">'+st('Original',expMoney(v.original,x.currency))+st('Resolved',expMoney(v.resolved,x.currency),'ok')+st('In Progress',expMoney(v.pending,x.currency),'wait')+st('Outstanding',expMoney(v.outstanding,x.currency),v.outstanding?'bad':'ok')+'</div>'
    +(x.status===CSX_SUPERSEDED?'<div class="wb-note"><b>'+CSX_SUPERSEDED+'</b><div class="wb-note-sub">'+ccE(x.claimKey)+' was rejected with no approved amount, so this exception is no longer an active obligation. The card spending is reviewed as unaccounted card spend on its transaction.</div></div>':'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Card Spend Exception',ccE(expKey(x))+' '+axBadge(statusTone(x.status),x.status))
    +axField(AX_ICO.fBox,'Claim · Line',o.r&&!own?'<button class="att-link" onclick="ccOpenExpense('+o.r.id+')">'+ccE(x.claimKey)+'</button> <span class="ax-sub">'+ccE(x.lineTitle)+'</span>':ccE(x.claimKey+' · '+x.lineTitle))
    +axField(AX_ICO.fUser,'Cardholder',ccE(idEmpName(x.employeeEid)||'')+' <span class="ax-sub">'+ccE(x.cardRef?ccMask(x.cardRef.last4)+' · '+x.cardRef.key:'')+'</span>')
    +axField(AX_ICO.fCash,'Card Paid · Approved',ccE(expMoney(x.actualCard,x.currency)+' paid by card · '+expMoney(x.approvedCard,x.currency)+' approved')+' <span class="ax-sub">the card payment is never changed</span>')
    +axField(AX_ICO.fCal,'Expense Date',ccE(cdLabel(x.date)))
    +(x.outcomes&&x.outcomes.length?axField(AX_ICO.fCheck,'Outcome',ccE(x.outcomes.join(' · '))):'')
    +(ccCsxActive(x)?axField(AX_ICO.fCheck,'Resolution Progress',(ccCsxPartial(x)?axBadge('wait','Partially Resolved')+' ':'')+ccE(expMoney(v.resolved,x.currency)+' resolved of '+expMoney(v.original,x.currency)+'; '+expMoney(v.outstanding,x.currency)+' outstanding'))
      +axField(AX_ICO.fBox,'Active Resolution Method',ccE(ccCsxMethods(x).join(' · ')||'None'))
      +axField(AX_ICO.fCal,'Pending Actions',(function(){const p=ccCsxPendingActions(x);return p.length?p.map(function(a){return '<div>'+ccE(a)+'</div>';}).join(''):'None';})(),true):'')
    +'</div>';
}
function renderCsxSidebar(){
  const x=ccCsx(ccCsxSel);if(!x)return '';
  if(!ccCsxVisible(x))return '<div class="lp-isb-body"><div class="wb-empty-sm">This card spend exception is not available to you.</div></div>';
  const reqs=ccCsxReqs.filter(function(q){return q.csxId===x.id;}),own=ccCsxOwnOnly(x);
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'resolutions',label:'Resolutions'}].concat(reqs.length&&!own?[{id:'approval',label:'Approval'}]:[]).concat([{id:'logs',label:'Logs'},{id:'history',label:'History'}]);
  if(!tabs.some(function(t){return t.id===ccCsxTab;}))ccCsxTab='basic-details';
  const hero=sbHero({icon:CC_ICO.hero,name:'Card spend not approved',meta:[expKey(x),ccE(x.claimKey),ccE(expMoney(ccCsxAmounts(x).outstanding,x.currency))+' outstanding'],status:axBadge(statusTone(x.status),x.status)+(ccCsxPartial(x)?' '+axBadge('wait','Partially Resolved'):'')});
  let body;
  if(ccCsxTab==='resolutions'){const R=x.resolutions||[];
    body=hero+(own?'':'<div class="wb-note"><div class="wb-note-sub">Company acceptance follows the Budget Approvers route. Recovery needs approval and a collection verified by someone independent; nothing is deducted from payroll.</div></div>')
      +(R.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>#</th><th>Resolution</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'+R.map(function(r){return own?'<tr><td>'+r.n+'</td><td>'+ccE(r.type)+'</td><td>'+ccE(expMoney(r.amount,x.currency))+'</td><td>'+ccE(r.status)+'</td><td></td></tr>':ccCsxResRowHTML(x,r);}).join('')+'</tbody></table></div>':'<div class="wb-empty-sm">No resolution yet.</div>');}
  else if(ccCsxTab==='approval'){const q=reqs[0];body=hero+(q?'<div class="wb-note"><div class="wb-note-sub">'+ccE(expKey(q))+' · '+ccE(q.title)+'</div></div>'+caApprovalTabHTML(q):'');}
  else if(ccCsxTab==='logs')body=lpLogsView(own?x.logs.filter(function(g){return !/budget|BE-\d|FT-\d|funding/i.test(g.action||'');}):x.logs,'');
  else if(ccCsxTab==='history')body=sbHistoryHTML(x);
  else{const acts=own?'':ccCsxActions(x);body=hero+(acts?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+acts+'</span></div>':'')+ccCsxBodyHTML(x,own);}
  return axTabBar('ctx',tabs,ccCsxTab,'ccCsxNav','ccCsxClose')+'<div class="lp-isb-body">'+body+'</div>';
}

/* ── CSX popups ── */
function ccCsxPopupHTML(a){
  const x=ccCsx(a.id);if(!x)return '';const f=a.f,close='ccMxClose()',btn=function(l,c){return '<button class="ep-save-btn" onclick="'+(c||'ccCsxSave()')+'">'+l+'</button>';};
  const v=ccCsxAmounts(x),amt=function(lbl,hint){return ccField(lbl||'Amount',true,'<div class="ax-currency"><span>'+ccE(x.currency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" min="0" step="0.01" value="'+attrSafe(f.amount!=null?f.amount:v.free)+'"></div>',hint||'Up to '+ccE(expMoney(v.free,x.currency))+' (outstanding '+ccE(expMoney(v.outstanding,x.currency))+').');};
  const reason=function(lbl,ph){return ccField(lbl||'Reason',true,ccArea('ccmx-reason',f.reason||'',ph||''),'',true);};
  const file=function(lbl){return ccField(lbl||'Evidence',true,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · max 5 MB</span></span></label>','',true);};
  const r=a.n!=null?ccCsxRes(x,a.n):null;
  if(a.act==='csx-view')return bgModal('Card Spend Exception · '+ccE(expKey(x)),'Part of a card payment that was not approved as a business expense. Finance resolves it; you are told if anything is asked of you.',ccCsxBodyHTML(x,true),{close:close,btns:''});
  if(a.act==='csx-accept'){const be=ccCsxBudgetEval(x,Number(f.amount!=null?f.amount:v.free)||v.free);
    return bgModal('Company Acceptance · '+ccE(expKey(x)),'The company accepts this card spend as business expenditure. It goes to the Budget Approvers route; once approved the amount is added once to the original line\'s budget allocation. No reimbursement; the card payment is unchanged.',
      '<div class="ep-form-grid">'+amt()+reason('Why the company accepts it','For example: client entertainment approved by the director')+file('Supporting Evidence')
        +'<div class="ep-form-group ep-form-full"><div class="wb-note'+(be.result==='Blocked'?' is-bad':be.needJust?' is-wait':'')+'"><b>Budget: '+ccE(be.result||'Not Evaluated')+'</b><div class="wb-note-sub">'+ccE(be.pub||be.reason||'')+'</div></div></div>'
        +(be.needJust?ccField('Budget Justification',true,ccArea('ccmx-just',f.just||'','Why the budget warning is accepted'),'',true):'')+'</div>',{close:close,btns:btn('Send for Approval')});}
  if(a.act==='csx-recover')return bgModal('Employee Recovery · '+ccE(expKey(x)),'Finance asks the employee to repay this card spend. Someone else with the recovery approval right approves it; money counts only when a collection with reference and evidence is verified. Nothing is deducted from payroll and no advance balance changes.',
    '<div class="ep-form-grid">'+amt()+ccField('Recovery Method',true,apCS('ccmx-method',ccCsxRecMethods(),f.method||'','Select'),'Payroll deduction is not available.')+reason('Why the employee repays it')+'</div>',{close:close,btns:btn('Raise Recovery')});
  if(a.act==='csx-recdecide'&&r)return bgModal('Recovery Approval · '+ccE(expKey(x)),'Approve or reject the recovery of '+ccE(expMoney(r.amount,x.currency))+' raised by '+ccE(caN(r.by))+': '+ccE(r.reason),
    '<div class="ep-form-grid">'+ccField('Remarks',false,ccArea('ccmx-reason',f.reason||'','Required to reject'),'',true)+'</div>',{close:close,btns:'<button class="btn-outline" onclick="ccCsxSave(\'Reject\')">Reject</button>'+btn('Approve','ccCsxSave(\'Approve\')')});
  if(a.act==='csx-collect'&&r)return bgModal('Record Collection · '+ccE(expKey(x)),'Money actually received from the employee. It counts once someone independent verifies it.',
    '<div class="ep-form-grid">'+amt('Amount Received','Still to collect: '+ccE(expMoney(ccCsxRecUnpaid(r),x.currency)))+ccField('Date Received',true,apCD('ccmx-date',f.date||wbToday(),'Select date'))+ccField('Payment Reference',true,ccInput('ccmx-ref',f.ref||'','Bank or receipt reference'))+file('Payment Evidence')+'</div>',{close:close,btns:btn('Record for Verification')});
  if(a.act==='csx-colverify'&&r){const c=(r.collections||[]).find(function(y){return y.k===Number(a.k);});
    return bgModal('Verify Collection · '+ccE(expKey(x)),c?'Check the payment of '+ccE(expMoney(c.amount,x.currency))+' (ref '+ccE(c.ref)+', '+ccE(cdLabel(c.date))+', '+ccE(c.evidence)+') recorded by '+ccE(caN(c.by))+'.':'',
      '<div class="ep-form-grid">'+ccField('Remarks',false,ccArea('ccmx-reason',f.reason||'','Required to reject'),'',true)+'</div>',{close:close,btns:'<button class="btn-outline" onclick="ccCsxSave(\'Reject\')">Reject</button>'+btn('Verify','ccCsxSave(\'Verify\')')});}
  if(a.act==='csx-credit')return bgModal('Refund or Dispute Credit · '+ccE(expKey(x)),'Record an expected refund or a raised dispute. It resolves the exception only to the extent a verified credit reaches the card; a request or a favourable decision alone closes nothing.',
    '<div class="ep-form-grid">'+ccField('Type',true,apCS('ccmx-kind',['Verified Refund','Dispute Credit'],f.kind||'Verified Refund','Select'))+amt()+ccField('Reference',false,ccInput('ccmx-ref',f.ref||'','Merchant refund or dispute case reference'),'Required for a dispute.')+reason('What is expected')+'</div>',{close:close,btns:btn('Record')});
  if(a.act==='csx-link'&&r){const cs=ccCsxCreditCands(x),ct=cs.find(function(y){return String(f.credit||'').indexOf(expKey(y)+' ')===0;}),df=ct?ccCsxCreditDiff(x,ct):[];
    return bgModal('Link Credit · '+ccE(expKey(x)),'A refund, reversal or dispute credit of the cardholder. A verified credit resolves the exception up to its unallocated amount; an unverified one waits. Another currency, another card or a return to a company funding source needs its documentation and a Finance review before it counts.',
      '<div class="ep-form-grid">'+ccField('Credit Transaction',true,cs.length?apCS('ccmx-credit',cs.map(function(t){return expKey(t)+' · '+t.merchant+' · '+expMoney(ccTxnCreditFree(t),t.billCurrency)+' free · '+ccTxnVerifyLabel(t)+(t.cardId!==x.cardId?' · other card':'')+(t.refund&&t.refund.dest==='Company Funding Source'?' · funding source':'')+(ccCsxCreditDiff(x,t).indexOf('linkage')>=0?' · refund of '+(t.refundOf&&t.refundOf.key||'no identified purchase'):'');}),f.credit||'','Select credit','ccRecHook'):'<span class="wb-muted">No credit of the cardholder is free to link yet.</span>')
        +ccField('Amount to Link',true,'<div class="ax-currency"><span>'+ccE(ct?ct.billCurrency:x.currency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" min="0" step="0.01" value="'+attrSafe(f.amount!=null?f.amount:'')+'"></div>','Of the credit, in its billing currency; at most what is left of this '+ccE(r.type.toLowerCase())+'. Empty: as much as it covers.')
        +(df.indexOf('currency')>=0?ccField('Documented Exchange Rate',true,ccInput('ccmx-rate',f.rate||'','1 '+ct.billCurrency+' = ? '+x.currency,'number'),'Never 1:1.')+ccField('Rate Evidence',true,ccInput('ccmx-rateev',f.rateEv||'','Provider advice, bank statement or rate source')):'')
        +(['card','destination','linkage'].some(function(k){return df.indexOf(k)>=0;})?ccField('Linkage Reason',true,ccArea('ccmx-reason',f.reason||'','Why this credit settles the card spend'),ccE(ccCsxDiffWhy(df,x,ct))+'. A Finance review follows before it counts.',true):'')
        +'</div>',{close:close,btns:cs.length?btn('Link'):''});}
  if(a.act==='csx-cancel'&&r)return bgModal('Cancel · '+ccE(r.type),'The unresolved part returns to the outstanding amount; anything already resolved stays.','<div class="ep-form-grid">'+reason()+'</div>',{close:close,btns:btn('Cancel It')});
  return '';
}
function ccCsxSave(decision){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f;let err='',ok='';
  if(a.act==='csx-accept'){const r=ccCsxAccept(a.id,{amount:f.amount,reason:f.reason,evidence:f.evidence,just:f.just});err=r.error||'';ok='Sent to the Budget Approvers route'+(r.rec?' as '+expKey(r.rec):'');}
  else if(a.act==='csx-recover'){const r=ccCsxRecoveryRaise(a.id,{amount:f.amount,method:f.method,reason:f.reason});err=r.error||'';ok='Recovery raised; someone else approves it';}
  else if(a.act==='csx-recdecide'){err=ccCsxRecoveryDecide(a.id,a.n,decision,f.reason);ok='Recovery '+(decision==='Approve'?'approved':'rejected');}
  else if(a.act==='csx-collect'){err=ccCsxCollect(a.id,a.n,{amount:f.amount,date:f.date||wbToday(),ref:f.ref,evidence:f.evidence});ok='Collection recorded for verification';}
  else if(a.act==='csx-colverify'){err=ccCsxCollectVerify(a.id,a.n,a.k,decision,f.reason);ok='Collection '+(decision==='Reject'?'rejected':'verified');}
  else if(a.act==='csx-credit'){const r=ccCsxCreditExpect(a.id,{kind:f.kind,amount:f.amount,ref:f.ref,reason:f.reason});err=r.error||'';ok=(f.kind==='Dispute Credit'?'Dispute':'Refund')+' recorded as pending';}
  else if(a.act==='csx-link'){const x=ccCsx(a.id),t=ccCsxCreditCands(x).find(function(y){return String(f.credit||'').indexOf(expKey(y)+' ')===0;});err=t?ccCsxLinkCredit(a.id,a.n,t.id,f.amount,undefined,{rate:f.rate,rateEvidence:f.rateEv,reason:f.reason}):'Pick the credit transaction.';ok='Credit linked';}
  else if(a.act==='csx-cancel'){err=ccCsxResCancel(a.id,a.n,f.reason);ok='Cancelled';}
  if(err){showToast('Not saved','error',err);return;}
  ccMxAct=null;renderADTPage();showToast(ok,'success',expKey(ccCsx(a.id)||{}));
}

/* ── My Cards: the claim position of each transaction and what the employee can do ── */
const ccTxnExpenseCellBase8C=ccTxnExpenseCell;
ccTxnExpenseCell=function(t){
  let h=ccTxnExpenseCellBase8C(t);const s=ccTxnClaimDue(t);
  if(s&&['Due','Due Soon','Overdue','Late Data'].indexOf(s.state)>=0)h+='<div>'+axBadge(s.tone,s.state)+(s.due?' <span class="ax-sub">due '+ccE(cdLabel(s.due))+'</span>':'')+'</div>';
  const key='txn:'+t.id,st=ccExcState(key),own=idUserOfEmp(t.employeeEid)===idMe();
  if(own&&(st==='Clarification Requested'||(ccBenefitEvidenceNeed(t)&&!t.benefitEvidence)))h+='<div><button class="att-link" onclick="ccMxOpen(\'exc\',{key:\''+key+'\'})">Provide Information</button></div>';
  else if(own&&(t.verify||{}).status===CCT_VERIFIED&&ccTxnInfoOpen(t))h+='<div><button class="att-link" onclick="ccTxnActOpen(\'info\','+t.id+')">Provide Supporting Information</button>'+((t.holderInfo||[]).length?' <span class="ax-sub">sent '+ccE(t.holderInfo[t.holderInfo.length-1].at)+'</span>':'')+'</div>';
  return h;
};
ccHook('ccPendingActions',null,function(out,eid){
  if(!out)return undefined;
  ccTxns.forEach(function(t){
    if(t.employeeEid!==eid||t.entity!==ccEnt())return;
    const s=ccTxnClaimDue(t);
    if(s&&['Unclaimed','Due','Due Soon','Overdue'].indexOf(s.state)>=0)out.push({kind:'action',text:expKey(t)+' ('+t.merchant+', '+expMoney(t.amount,t.currency)+') needs an expense claim'+(s.due?' by '+cdLabel(s.due)+(s.state==='Overdue'?' – overdue; submit it with a late claim justification':''):'')+'.',rec:t,open:'txn'});
    if(ccExcState('txn:'+t.id)==='Clarification Requested')out.push({kind:'action',text:'Finance asked for information on '+expKey(t)+'.',rec:t,open:'exc'});
    if(ccBenefitEvidenceNeed(t)&&!t.benefitEvidence){const be=ccBenefitEvidenceRule(t);out.push({kind:'action',text:expKey(t)+' ('+t.merchant+'): provide '+ccBenefitEvidenceWhat(be)+', as Wallet & Benefits requires for '+be.cat.name+'.',rec:t,open:'exc'});}
  });
  ccCsxEmpRecoveries(eid).forEach(function(v){if(['Recovered','Recovery Cancelled'].indexOf(v.status)>=0)return;
    out.push({kind:v.status==='Payment Under Verification'?'wait':'action',text:'Card spend recovery '+v.ref+' ('+v.claimKey+', '+expMoney(v.due,v.currency)+' to repay): '+v.status+'. '+v.action,rec:{id:v.id,n:v.n},open:'csxrec'});});
  return undefined;
});

ccHook('bgClaimPanelHTML',null,function(out,r){
  const d=typeof ccClaimDemoRefs==='function'?ccClaimDemoRefs(r):[];if(!d.length)return undefined;
  return (out||'')+'<div class="wb-note"><b>'+CC_DEMO+' source</b><div class="wb-note-sub">Made from '+ccE(d.map(expKey).join(', '))+', an illustrative transaction on an illustrative card: not verified card spending, and nothing is posted.</div></div>';
});


/* Scheduled reminders: evaluated whenever ADT or a page is opened (CCD_SCHED_NOTE; BE-05). Idempotent per event. */
ccHook('navigatePage',null,function(){try{if(typeof mcOn!=='function'||mcOn('cards'))ccClaimRemindSweep(ccEnt());}catch(e){}return undefined;});


/* ══ Build 8E UI: refunds and reversals from the Transaction Detail panel; allocation; controls and benefit context ══
   Everything stays inside Cards → Transactions, the existing transaction panel, its popups and Matching Exceptions. */
const ccMxHTMLBase8E=ccMxHTML;
ccMxHTML=function(){const a=ccMxAct;if(a&&String(a.act).indexOf('cr-')===0)return ccCreditPopupHTML(a);return ccMxHTMLBase8E();};
const ccMxSyncBase8E=ccMxSync;
ccMxSync=function(){
  ccMxSyncBase8E();const a=ccMxAct;if(!a||String(a.act).indexOf('cr-')!==0)return;let v;
  [['bill','ccmx-bill'],['dispute','ccmx-dispute']].forEach(function(p){if((v=ccVal(p[1]))!=null)a.f[p[0]]=v;});
  if((v=bgVal('ccmx-post'))!=null)a.f.post=v;
  [['dest','ccmx-dest'],['src','ccmx-src']].forEach(function(p){if(document.getElementById('csw-'+p[1]))a.f[p[0]]=getCSValue(p[1]);});
  document.querySelectorAll('[data-crl]').forEach(function(el){a.f.lines=a.f.lines||{};a.f.lines[el.getAttribute('data-crl')]=el.value;});
  document.querySelectorAll('[data-crx]').forEach(function(el){a.f.csx=a.f.csx||{};a.f.csx[el.getAttribute('data-crx')]=el.value;});
  const nn=document.getElementById('ccmx-none');if(nn)a.f.none=nn.checked;
  const fu=document.getElementById('ccmx-full');if(fu)a.f.full=fu.checked;
};
function ccCreditHook(){ccMxSync();renderADTPage();}
function ccCreditSources(o){return (typeof fbSources==='undefined'?[]:fbSources).filter(function(s){return s.entity===o.entity&&s.status==='Active'&&s.currency===o.billCurrency;});}
function ccCreditSrcLabel(s){return s.key+' · '+s.name;}
function ccCreditPopupHTML(a){
  const close='ccMxClose()',f=a.f,btn=function(l,c){return '<button class="ep-save-btn" onclick="'+(c||'ccCreditSave()')+'">'+l+'</button>';};
  const file=function(lbl){return ccField(lbl||'Evidence',true,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>'
    :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-text"><b>Click to upload</b> · statement, provider advice or portal screen</span></label>','',true);};
  if(a.act==='cr-record'||a.act==='cr-sim'){
    const o=ccTxn(a.txnId);if(!o)return '';const fx=o.currency!==o.billCurrency,left=ccTxnRefundable(o),done=ccTxnCredited(o);
    const amt=ccField('Credited Amount',true,'<div class="ax-currency"><span>'+ccE(o.currency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" min="0" step="0.01" value="'+attrSafe(f.amount!=null?f.amount:'')+'"></div>',
      'Up to '+ccE(expMoney(left,o.billCurrency))+' still refundable of '+ccE(expMoney(o.billAmount,o.billCurrency))+(done?' ('+ccE(expMoney(done,o.billCurrency))+' already credited or awaiting verification)':'')+'.');
    const kind=ccField('Type',true,apCS('ccmx-kind',CCR_KINDS,f.kind||'Refund','Select','ccCreditHook'));
    if(a.act==='cr-sim')return bgModal('Add Illustrative Refund · '+ccE(expKey(o)),CC_DEMO+': an illustrative credit on an illustrative card. It changes only illustrative activity: no genuine credit, funding, budget or reimbursement effect.',
      '<div class="ep-form-grid">'+kind+amt+ccField('Note',false,ccArea('ccmx-reason',f.reason||'','Optional'),'',true)+'</div>',{close:close,btns:btn('Record')});
    const kd=f.kind||'Refund',dest=f.dest||'Card Wallet',srcs=ccCreditSources(o);
    return bgModal('Record Refund / Reversal · '+ccE(expKey(o)),'A linked credit event on '+ccE(expKey(o))+' ('+ccE(o.merchant)+', '+ccE(expMoney(o.amount,o.currency))+'). The original transaction stays as it is; the credit counts once someone independent verifies it. A credit to the card is not cash returned to the company.',
      '<div class="ep-form-grid">'+kind+amt
        +(fx?ccField('Credited to the Card',true,'<div class="ax-currency"><span>'+ccE(o.billCurrency)+'</span><input class="ep-form-input" id="ccmx-bill" type="number" min="0" step="0.01" value="'+attrSafe(f.bill||'')+'"></div>','As the provider reports it; the credit keeps its own provider conversion.'):'')
        +ccField('Credit Date',true,apCD('ccmx-date',f.date||wbToday(),'Select date'))+ccField('Posting Date',false,apCD('ccmx-post',f.post||f.date||wbToday(),'Select date'))
        +ccField('Provider Reference',true,ccInput('ccmx-ref',f.ref||'','Reference on the statement or advice'),'Recorded once; a reference already used is refused.')
        +(kd==='Dispute Credit'?ccField('Dispute / Case Reference',true,ccInput('ccmx-dispute',f.dispute||'','Provider case reference')):'')
        +ccField('Returned To',true,apCS('ccmx-dest',CCR_DEST,dest,'Select','ccCreditHook'),dest==='Card Wallet'?'Credited back to the card wallet (no company funding entry).':'Returned to a company funding source: one verified funding entry once verified.')
        +(dest==='Company Funding Source'?ccField('Funding Source',true,apCS('ccmx-src',srcs.map(ccCreditSrcLabel),f.src||'','Select'),srcs.length?'':'No active funding source in '+ccE(o.billCurrency)+'.'):'')
        +(kd==='Reversal'?'<div class="ep-form-group ep-form-full"><label class="onc-decl cc-check"><input type="checkbox" id="ccmx-full"'+(f.full?' checked':'')+'><span>Full reversal of the remaining '+ccE(expMoney(left,o.billCurrency))+'</span></label></div>':'')
        +file('Evidence')+ccField('Reason',true,ccArea('ccmx-reason',f.reason||'','What the credit is for'),'',true)+'</div>',{close:close,btns:btn('Record for Verification')});
  }
  if(a.act==='cr-alloc'){
    const c=ccTxn(a.id);if(!c||!c.refundOf)return '';const o=ccTxn(c.refundOf.id),T=o?ccCreditTargets(o):[];
    const rows=T.map(function(x){const room=ccLineRefundRoom(x.r,x.l,c),key=x.r.id+':'+x.l.id;
      return '<tr><td>'+ccE(ccLineRef(x.r,x.l))+'<div class="ax-sub">'+ccE(x.l.title+' · '+x.r.status)+'</div></td><td>'+ccE(expMoney(room,x.r.currency))+'</td><td><input class="ep-form-input" data-crl="'+key+'" type="number" min="0" step="0.01" value="'+attrSafe((f.lines||{})[key]||'')+'"></td></tr>';}).join('');
    const xs=T.map(function(x){return ccSpendExcOf(x.r.id,x.l.id);}).filter(function(x){return x&&ccCsxActive(x);});
    const xrows=xs.map(function(x){const v=ccCsxAmounts(x);return '<tr><td>'+ccE(expKey(x))+'<div class="ax-sub">'+ccE(x.claimKey+' · '+x.lineTitle+' · '+x.status)+'</div></td><td>'+ccE(expMoney(v.free,x.currency))+'</td><td><input class="ep-form-input" data-crx="'+x.id+'" type="number" min="0" step="0.01" value="'+attrSafe((f.csx||{})[x.id]||'')+'"></td></tr>';}).join('');
    return bgModal('Allocate Credit · '+ccE(expKey(c)),'Finance decides what the verified credit of '+ccE(expMoney(c.billAmount,c.billCurrency))+' corrects: '+ccE(c.alloc.why)+'. An approved line\'s budget utilization is reduced once on its original allocation; an open card spend exception is settled by the credit. Nothing else changes: no reimbursement, and the approved claims stay as they were.',
      '<div class="ep-form-grid"><div class="ep-form-group ep-form-full"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Expense Line</th><th>Open to Correction</th><th>Allocate</th></tr></thead><tbody>'+(rows||'<tr><td colspan="3">No expense line holds '+ccE(o?expKey(o):'the original')+'.</td></tr>')+'</tbody></table></div>'
        +(xrows?'<div class="ep-form-group ep-form-full"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Card Spend Exception</th><th>Free to Settle</th><th>Settle</th></tr></thead><tbody>'+xrows+'</tbody></table></div>':'')
        +'<div class="ep-form-group ep-form-full"><label class="onc-decl cc-check"><input type="checkbox" id="ccmx-none"'+(f.none?' checked':'')+'><span>No business adjustment (for example the credit relates to a part the company did not approve as business spend)</span></label></div>'
        +ccField('Reason',true,ccArea('ccmx-reason',f.reason||'','Why this allocation'),'',true)+'</div>',{close:close,btns:btn('Save Allocation')});
  }
  return '';
}
function ccCreditSave(){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f;let err='',ok='';
  if(a.act==='cr-record'){const o=ccTxn(a.txnId),s=o?ccCreditSources(o).find(function(x){return ccCreditSrcLabel(x)===f.src;}):null;
    const r=ccTxnCreditRecord(a.txnId,{kind:f.kind||'Refund',amount:f.amount,billAmount:f.bill,date:f.date||wbToday(),postDate:f.post||f.date||wbToday(),extRef:f.ref,evidence:f.evidence,reason:f.reason,dest:f.dest||'Card Wallet',sourceId:s?s.id:null,disputeRef:f.dispute,full:!!f.full});
    err=r.error||'';ok=r.rec?expKey(r.rec)+' recorded; someone independent verifies it':'';}
  else if(a.act==='cr-sim'){const r=ccTxnSimulateCredit(a.txnId,{kind:f.kind||'Refund',amount:f.amount,reason:f.reason});err=r.error||'';ok=r.rec?expKey(r.rec)+' recorded ('+CC_DEMO+')':'';}
  else if(a.act==='cr-alloc'){err=ccCreditAllocate(a.id,{lines:Object.keys(f.lines||{}).map(function(k){return {claimId:k.split(':')[0],lineId:k.split(':')[1],amount:f.lines[k]};}),
    csx:Object.keys(f.csx||{}).map(function(k){return {id:Number(k),amount:f.csx[k]};}),none:!!f.none,reason:f.reason});ok='Allocation saved';}
  if(err){showToast('Not saved','error',err);return;}
  ccMxClose();showToast(ok,'success');
}
/* The allocation of a credit, in words, with provider and ADT FX apart (G8). */
function ccCreditAllocText(c){
  const a=c.alloc;if(!a)return '';
  const parts=(a.lines||[]).map(function(x){return ccE(x.lineRef+' '+expMoney(x.amount,x.currency)+' – '+x.status+(x.events&&x.events.length?' ('+x.events.join(', ')+')':''))
    +(x.status===CCR_CLOSED?'<div class="ax-sub">'+ccE('Expense '+cdLabel(x.expenseDate)+', credit '+cdLabel(x.refundDate)+'; waits for an authorized closed-period process. Nothing is posted into the closed year.')+'</div>':'')
    +(x.fx?'<div class="ax-sub">'+ccE('Budget correction at ADT\'s rate '+x.fx.adtRate+': '+expMoney(x.fx.adtAmount,x.fx.budgetCurrency||'INR')+(x.fx.provider?' · provider credited '+expMoney(x.fx.provider.bill,x.fx.provider.billCurrency)+(x.fx.provider.rate?' at '+x.fx.provider.rate:'')+' (FX variance '+expMoney(Math.abs(bgM(x.fx.adtAmount-x.fx.provider.bill)),x.fx.provider.billCurrency)+', identified only)':''))+'</div>':'');})
    .concat((a.csx||[]).map(function(x){return ccE(x.key+' settled '+expMoney(x.amount,c.billCurrency)+' (verified credit)');}));
  return '<div class="ax-sub" style="white-space:normal">'+(a.why&&a.status===CCR_REVIEW?ccE(a.why)+'. ':'')+(a.note?ccE(a.note):'')+(a.reason&&a.status!==CCR_REVIEW?ccE('Reason: '+a.reason+'. '):'')+'</div>'+parts.map(function(p){return '<div>'+p+'</div>';}).join('');
}
/* The Transaction Detail panel: credits, net spending, controls at the time, benefit context. */
const ccTxnMoreFieldsHTMLBase8E=ccTxnMoreFieldsHTML;
ccTxnMoreFieldsHTML=function(t,full){
  let h=ccTxnMoreFieldsHTMLBase8E(t,full);
  if(t.direction==='Credit'&&t.refundOf){
    const o=t.refundOf.id?ccTxn(t.refundOf.id):null,r=t.refund||{},a=t.alloc;
    h+=axField(AX_ICO.fCash,'Returned To',ccE(r.dest||'Card Wallet')+(full&&r.fundingKey?' <span class="ax-sub">Funding entry '+ccE(r.fundingKey)+' on '+ccE(r.sourceKey)+'</span>':r.dest==='Company Funding Source'?'':' <span class="ax-sub">not cash returned to the company</span>'));
    h+=axField(AX_ICO.fCheck,'Refund Processing',ccE(r.processing||'—')+(r.disputeRef?' <span class="ax-sub">dispute '+ccE(r.disputeRef)+'</span>':''));
    if(a&&full)h+=axField(AX_ICO.fBox,'Business Allocation','<div style="display:flex;flex-direction:column;gap:4px;width:100%"><div>'+axBadge(statusTone(a.status),a.status)+'</div>'+ccCreditAllocText(t)+'</div>',true);
    return h;
  }
  if(t.direction!=='Credit'){
    const cr=ccCreditsOf(t);
    if(cr.length)h+=axField(AX_ICO.fCash,'Refunds & Reversals','<div style="display:flex;flex-direction:column;gap:4px;width:100%">'+cr.map(function(x){return '<div><button class="att-link" onclick="ccTxnOpen('+x.id+')">'+ccE(expKey(x))+'</button> '+ccE(x.type+' '+expMoney(x.billAmount,x.billCurrency))+' <span class="ax-sub">'+ccE(ccTxnVerifyLabel(x)+(x.alloc&&full?' · '+x.alloc.status:''))+'</span></div>';}).join('')
      +'<div class="ax-sub">'+ccE('Purchase '+expMoney(t.billAmount,t.billCurrency)+' · verified credits '+expMoney(ccTxnCredited(t,{verified:true}),t.billCurrency)+' · net card spending '+expMoney(ccTxnNetSpend(t),t.billCurrency))+'</div></div>',true);
    const ce=ccTxnControlEval(t);
    if(ce)h+=axField(AX_ICO.fCheck,'Card Controls at the Time','<div>'+axBadge(ce.status===CCX_CONTROL?'bad':ce.status==='Unable to Evaluate'?'wait':'ok',ce.status)+' <span class="ax-sub" style="white-space:normal">'+ccE(ce.text)+'</span></div>',true);
    const b=ccTxnBenefitCtx(t);
    if(b)h+=axField(AX_ICO.fBox,'Benefit Wallet',ccE(b.category+' · '+b.processing+' · '+b.period)+' <span class="ax-sub" style="white-space:normal">'+ccE((b.allocKeys.length?'Allocation '+b.allocKeys.join(', ')+' ('+expMoney(b.allocated,'INR')+')':'No allocation recorded for '+b.period)+' · recorded loads '+expMoney(b.loaded,t.billCurrency)+' · recorded spending '+expMoney(b.spent,t.billCurrency)+'. '+b.note)+'</span>'
      +(b.flags.length?'<div class="wb-warn" style="white-space:normal">'+ccE(b.flags.join(' '))+'</div>':''),true);
  }
  return h;
};
const ccTxnActionsBase8E=ccTxnActions;
ccTxnActions=function(t){
  let h=ccTxnActionsBase8E(t);const add=function(l,c){h+=ccBtn(l,c);};
  if(t.direction!=='Credit'&&!ccCreditWhyNot(t)){
    if(!t.demo&&ccCan('card.transaction.record'))add('Record Refund / Reversal','ccMxOpen(\'cr-record\',{txnId:'+t.id+'})');
    if(t.demo&&ccCan('card.demo.simulate')&&ccDemoOn())add('Add Illustrative Refund','ccMxOpen(\'cr-sim\',{txnId:'+t.id+'})');
  }
  if(t.direction==='Credit'&&t.alloc&&t.alloc.status===CCR_REVIEW&&ccCan('card.transaction.match'))add('Allocate Credit','ccMxOpen(\'cr-alloc\',{id:'+t.id+'})');
  return h;
};


/* ══ Build 8F UI · Card Loads → Statements & Reconciliation (no new module, no sixth tab) ══════════════════════════
   The statement list gains reconciliation figures and a filter; the statement panel gains a Reconciliation tab with the
   summary, the exceptions (one Resolve popup per exception), expense accountability shown apart, sign-off and
   supplementary corrections. The B8-N22 refinements change the policy form, the CSX credit link, the benefit evidence
   popup and the cardholder's recovery view. */
let ccStmtRecF='';
function ccRecShown(s){const st=s.recon?s.recon.status:'Not Started';return st==='Exceptions Pending'?'Under Reconciliation':st;}
function ccStmtRecStat(v){ccStmtRecF=ccStmtRecF===v?'':v;ccStmtSel=null;ccStmtView='list';renderADTPage();}
function ccRecListTiles(all){
  const g=all.filter(function(s){return !s.demo||ccStmtStatusF===CC_DEMO;}),f=ccRecListFigures(g);
  if(!all.some(function(s){return s.importStatus==='Verified';}))return '';
  return caStat('Ready for Sign-Off',f.ready,ccStmtRecF==='Ready for Sign-Off','ccStmtRecStat(\'Ready for Sign-Off\')',f.ready?'wait':'idle')
    +caStat('Closed Reconciliations',f.closed,ccStmtRecF==='Closed – Reconciled','ccStmtRecStat(\'Closed – Reconciled\')','ok')
    +caStat('Closed with Exceptions',f.closedEx,ccStmtRecF==='Closed with Authorized Exceptions','ccStmtRecStat(\'Closed with Authorized Exceptions\')','info');
}
function ccRecHook(){ccMxSync();renderADTPage();}
function ccRecTone(st){return {'Not Started':'idle','Under Reconciliation':'info','Exceptions Pending':'wait','Ready for Sign-Off':'wait','Closed – Reconciled':'ok','Closed with Authorized Exceptions':'info',
  'Open':'bad','Evidence Requested':'wait','Awaiting Approval':'wait','Awaiting Verification':'wait','Resolved':'ok','Carry Forward Proposed':'info','Carried Forward (Authorized)':'info','Financial Adjustment Pending':'wait'}[st]||statusTone(st);}
function ccRecStartClick(id){const e=ccRecStart(id);if(e){showToast('Not started','error',e);return;}ccStmtTab='recon';renderADTPage();showToast('Reconciliation started','success',expKey(ccStmt(id)));}
function ccRecLinkDisputeClick(id,k){const e=ccRecLinkDispute(id,k);if(e){showToast('Not linked','error',e);return;}renderADTPage();showToast('Dispute credit linked','success');}
/* The operations a Finance user can choose for an exception (one popup per exception keeps the table uncluttered). */
function ccRecOps(s,it){
  if(['Open','Evidence Requested'].indexOf(it.status)<0)return [];
  const o=[],fin=it.financial&&Math.abs(it.variance)>0.009;
  if(it.type===RC_T.so){o.push(['link','Link ADT Transaction']);o.push(['map','Resolve Card Mapping']);o.push(['record','Record Missing Transaction']);}
  if(it.type===RC_T.ref)o.push(['orig','Link Original Purchase']);
  if(it.type===RC_T.src)o.push(['evidence','Request Evidence']);
  if(fin)o.push(['adjust','Route Financial Adjustment for Approval']);
  if(!fin&&!(it.type===RC_T.src&&it.verification==='Under Review'))o.push(['resolve',it.type===RC_T.dup?'Confirm Duplicate':'Resolve (Finance)']);
  o.push(['carry','Propose Carry Forward']);
  return o;
}
function ccRecItemRef(it){
  const t=it.txnId?ccTxn(it.txnId):null;
  return [it.rowN?'row '+it.rowN:'',t?expKey(t):'',it.merchant||'',it.date?cdLabel(it.date):'',it.ref?'ref '+it.ref:''].filter(Boolean).join(' · ');
}
function ccRecAmtCell(it){
  const c=it.currency,L=function(l,v){return '<div class="ax-sub" style="white-space:nowrap">'+l+' '+ccE(expMoney(v,c))+'</div>';};
  return '<div class="lp-c-plain" style="white-space:nowrap">Statement '+ccE(expMoney(it.stmtAmt,c))+'</div>'+L('ADT',it.adtAmt)+(Math.abs(it.variance)>0.009?L('Variance',it.variance):'')+(it.pendAmt?L('Pending',it.pendAmt):'');
}
function ccRecItemRow(s,it,closed){
  const A=ccNow(),ops=closed?[]:ccRecOps(s,it),acts=[];
  if(!closed&&ccCan('card.transaction.match')&&ops.length)acts.push('<button class="att-link" onclick="ccMxOpen(\'rc-item\',{sid:'+s.id+',key:\''+it.key+'\'})">Resolve</button>');
  if(!closed&&it.status==='Awaiting Approval'&&it.adj&&ccCan('card.reconciliation.signoff')&&[it.adj.by,it.adj.actual].indexOf(A.who)<0)acts.push('<button class="att-link" onclick="ccMxOpen(\'rc-adjdec\',{sid:'+s.id+',key:\''+it.key+'\'})">Approve / Reject</button>');
  if(it.txnId)acts.push('<button class="att-link" title="Open the card transaction" onclick="ccOpenTxnUI('+it.txnId+')">View</button>');
  const res=it.resolution,later=closed&&it.status===RCX_CARRIED?ccRecLater(s,it):'';
  const who=res&&res.by&&res.by!=='System'?caN(res.by)+(res.actual?' (through Switch User by '+caN(res.actual)+')':''):'';
  const det=[res?(res.auto?'From the records: '+res.reason:(res.action||'')+(res.ref&&String(res.action||'').indexOf(res.ref)<0?' '+res.ref:'')+(who?' · '+who:'')+(res.at?' · '+res.at:'')):'',
    it.adj&&it.status==='Awaiting Approval'?'adjustment '+it.adj.ref+' awaiting approval'+(it.adj.assignException?' (no eligible approver yet)':''):it.adj&&it.adj.status==='Rejected'&&it.status==='Open'?'adjustment '+it.adj.ref+' rejected':'',
    it.mapped&&it.status!=='Resolved'?'card mapped to '+it.mapped.key:'',it.recordTxnId&&it.status==='Awaiting Verification'?'recorded as '+expKey(ccTxn(it.recordTxnId)||{})+', awaiting independent verification':'',
    it.authorized?'authorized by '+caN(it.authorized.by):'',later,closed&&typeof ccRecAdjLater==='function'?ccRecAdjLater(it):''].filter(Boolean).join(' · ');
  return '<tr><td><b>'+ccE(it.id)+'</b><div class="ax-sub">'+ccE(it.type)+'</div></td><td><div class="lp-c-plain" style="white-space:normal">'+ccE(ccRecItemRef(it))+'</div><div class="ax-sub" style="white-space:normal">'+ccE(it.text)+(it.verification?' ('+ccE(it.verification)+')':'')+'</div></td>'
    +'<td>'+ccRecAmtCell(it)+'</td><td>'+axBadge(ccRecTone(it.status),it.status)+(det?'<div class="ax-sub" style="white-space:normal">'+ccE(det)+'</div>':'')+'</td>'
    +'<td><div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;white-space:nowrap">'+acts.join('')+'</div></td></tr>';
}
function ccRecTabHTML(s){
  if(s.recon)ccRecSync(s);
  const R=s.recon,A=ccNow(),fin=ccCan('card.transaction.match'),acts=[],add=function(l,c,p){acts.push(ccBtn(l,c,p));};
  const head=function(){return acts.length?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+acts.join('')+'</span></div>':'';};
  if(!R){
    if(fin&&s.importStatus==='Verified'&&(!s.demo||ccDemoOn(s.entity)))add('Start Reconciliation','ccRecStartClick('+s.id+')',true);
    return head()+'<div class="wb-note"><b>Not Started</b><div class="wb-note-sub">Reconciliation compares each statement row with ADT\'s records and lists every difference as an exception. '
      +'Nothing is posted.'+(s.demo?' '+CC_DEMO+' statement: illustrative activity only.':'')+'</div></div>';
  }
  const closed=RC_CLOSED.indexOf(R.status)>=0,m=ccRecSummary(s),st=function(l,n,tone){return caStat(l,n,false,'',tone||'info');};
  if(!closed&&['Under Reconciliation','Exceptions Pending'].indexOf(R.status)>=0&&fin)add('Submit for Sign-Off','ccMxOpen(\'rc-submit\',{sid:'+s.id+'})',true);
  if(R.status==='Ready for Sign-Off'&&!ccRecWhyNotSignoff(s,A)){add('Sign Off','ccMxOpen(\'rc-signoff\',{sid:'+s.id+'})',true);add('Return','ccMxOpen(\'rc-return\',{sid:'+s.id+'})');}
  if(closed&&fin)add('Record Supplementary Correction','ccMxOpen(\'rc-supp\',{sid:'+s.id+'})');
  const items=closed?R.closed.items:ccRecItems(s),acc=closed?R.closed.acc:R.acc||[],sub=R.submit,so=R.signoff,ret=R.returns.length?R.returns[R.returns.length-1]:null;
  const note=closed?'<div class="wb-note is-data'+(R.status==='Closed – Reconciled'?'':' is-wait')+'"><b>'+ccE(R.status)+'</b><div class="wb-note-sub">Signed off by '+ccE(caN(so.selected))+(so.switched?' (through Switch User by '+ccE(caN(so.actual))+')':'')+' on '+ccE(so.at)+(so.notes?': '+ccE(so.notes):'')+'. '
      +(R.status==='Closed – Reconciled'?'No unresolved material difference.':m.carried+' exception(s) carried forward with authorization: not 100% reconciled; each stays traceable below.')+' A closed reconciliation is never rewritten; late provider information is a supplementary correction.</div></div>'
    :R.status==='Ready for Sign-Off'?'<div class="wb-note is-wait"><b>Ready for Sign-Off</b><div class="wb-note-sub">Submitted by '+ccE(caN(sub.by))+(sub.actual?' (through Switch User by '+ccE(caN(sub.actual))+')':'')+' on '+ccE(sub.at)+'; proposed '+ccE(sub.proposed)+(sub.carried.length?' with '+ccE(sub.carried.join(', '))+' carried forward for the checker to authorize':'')+'. Someone with card.reconciliation.signoff who did not prepare it signs off.</div></div>'
    :'<div class="wb-note'+(m.open?' is-wait':'')+'"><b>'+ccE(R.status)+'</b><div class="wb-note-sub">'+(m.open?m.open+' exception(s) to work. ':'No open exception. ')+'Each one is resolved with a reason, routed for approval when it is a financial difference, or proposed to carry forward; then submit for sign-off.</div></div>';
  const tiles='<div class="listing-stats exp-stats cc-bulk-stats">'+st('Statement Transactions',m.total)+st('Matched',m.matched,'ok')+st('Unmatched',m.unmatched,m.unmatched?'wait':'idle')+st('Open Exceptions',m.open,m.open?'bad':'idle')
    +caStat('Total Variance',ccE(expMoney(m.variance,s.currency)),false,'',Math.abs(m.variance)>0.009?'wait':'idle')+'</div>';
  const tbl='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Reconciliation Exceptions ('+items.length+')</span></div>'
    +(items.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>ID</th><th>Statement Row</th><th>Amounts</th><th>Status</th><th></th></tr></thead><tbody>'+items.map(function(it){return ccRecItemRow(s,it,closed);}).join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">No difference between the statement and ADT.</div>');
  const accT='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Expense Accountability ('+acc.length+')</span></div>'
    +'<div class="wb-note"><div class="wb-note-sub">Kept apart from reconciliation: a matched transaction can still need its expense claim.</div></div>'
    +(acc.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Item</th><th>Record</th><th>Amount</th><th></th></tr></thead><tbody>'+acc.map(function(a){
      const r=a.claimId?expRec(a.claimId):null,t=a.txnId?ccTxn(a.txnId):null;
      const go=closed?'':a.type===RC_ACC.dispute&&ccCan('card.csx.resolve')?'<button class="att-link" onclick="ccRecLinkDisputeClick('+s.id+',\''+a.k+'\')">Link to Dispute</button>':t?'<button class="att-link" title="Open the card transaction" onclick="ccOpenTxnUI('+t.id+')">View</button>':r&&typeof ccOpenExpense==='function'?'<button class="att-link" title="Open the expense claim" onclick="ccOpenExpense('+r.id+')">View</button>':'';
      return '<tr><td>'+ccE(a.type)+'<div class="ax-sub">'+ccE(a.state||'')+'</div></td><td><div class="lp-c-plain">'+ccE(t?expKey(t)+' · '+t.merchant:r?expKey(r):'')+'</div><div class="ax-sub" style="white-space:normal">'+ccE(a.text)+'</div></td><td>'+ccE(expMoney(a.amount,a.currency))+'</td><td>'+go+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="wb-empty-sm">Nothing outstanding on the expense side.</div>');
  const sup=(R.supplements||[]).length?'<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Supplementary Corrections</span></div><div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>ID</th><th>Late Provider Information</th><th>Status</th><th></th></tr></thead><tbody>'
    +R.supplements.map(function(x){const may=x.status==='Awaiting Verification'&&ccCan('card.transaction.verify')&&[x.by,x.actual].indexOf(A.who)<0;
      return '<tr><td><b>'+ccE(x.id)+'</b><div class="ax-sub">ref '+ccE(x.ref)+'</div></td><td><div class="ax-sub" style="white-space:normal">'+ccE(x.reason)+(x.item?' (about '+ccE(x.item)+')':'')+(x.amount?' · '+ccE(expMoney(x.amount,x.currency)):'')+' · '+ccE(x.evidence)+' · '+ccE(caN(x.by))+' '+ccE(x.at)+'</div></td>'
        +'<td>'+axBadge(statusTone(x.status),x.status)+(x.verifiedBy?'<div class="ax-sub">'+ccE(caN(x.verifiedBy))+'</div>':'')+'</td><td>'+(may?'<button class="att-link" onclick="ccMxOpen(\'rc-suppver\',{sid:'+s.id+',n:'+x.n+'})">Verify / Reject</button>':'')+'</td></tr>';}).join('')+'</tbody></table></div>':'';
  return head()+note+(R.assignException?'<div class="wb-note is-bad"><b>Assignment exception</b><div class="wb-note-sub">'+ccE(R.assignException)+'</div></div>':'')
    +(ret&&!closed&&R.status!=='Ready for Sign-Off'?'<div class="wb-note is-bad"><b>Returned'+(ret.by==='System'?'':' by '+ccE(caN(ret.by)))+'</b><div class="wb-note-sub">'+ccE(ret.notes)+'</div></div>':'')
    +(s.demo?'<div class="wb-note">'+CC_DEMO+' reconciliation: illustrative activity only, never genuine.</div>':'')+tiles+tbl+accT+sup;
}

/* ── Reconciliation popups ── */
function ccRecPopupHTML(a){
  const s=ccStmt(a.sid);if(!s||!s.recon)return '';
  const f=a.f,close='ccMxClose()',btn=function(l,c){return '<button class="ep-save-btn" onclick="'+(c||'ccRecSave()')+'">'+l+'</button>';};
  const area=function(lbl,ph,req){return ccField(lbl,req!==false,ccArea('ccmx-reason',f.reason||'',ph||''),'',true);};
  const file=function(lbl){return ccField(lbl||'Evidence',true,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · max 5 MB</span></span></label>','',true);};
  const m=ccRecSummary(s);
  if(a.act==='rc-item'){
    ccRecSync(s);const it=s.recon.items[a.key];if(!it)return '';const ops=ccRecOps(s,it),lab=ops.map(function(o){return o[1];});
    const op=ops.find(function(o){return o[1]===f.op;})||ops[0]||['',''];f.op=op[1];
    let fl='';
    if(op[0]==='link'){const c=ccRecLinkCands(s,it);fl=ccField('ADT Transaction',true,c.length?apCS('rcmx-txn',c.map(function(t){return expKey(t)+' · '+t.merchant+' · '+cdLabel(t.date)+' · '+expMoney(ccRecTxnAmt(t),t.billCurrency);}),f.txn||'','Select transaction'):'<span class="wb-muted">No transaction of this card is on no statement yet.</span>','Same card, direction, amount and currency; the row stays as imported.')+area('Why this row is that transaction');}
    else if(op[0]==='map'){const cs=ccRecScopeCards(s).map(ccCard).filter(function(c){return c&&(!it.last4||c.last4===it.last4);});fl=ccField('Card',true,cs.length?apCS('rcmx-card',cs.map(function(c){return expKey(c)+' · '+ccHolderName(c)+' · '+ccMask(c.last4);}),f.card||'','Select card'):'<span class="wb-muted">No card of the programme ends in '+ccE(it.last4)+'.</span>','Never on the last four digits alone: say how it was identified.')+area('How the card was identified');}
    else if(op[0]==='record')fl='<div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">Recorded from row '+it.rowN+' on '+ccE(it.mapped?it.mapped.key:'the row\'s card')+' as a manual card transaction (Record right). It is linked to the row only after someone independent verifies it.</div></div></div>'+area('Why it is missing from ADT')+ccField('Additional Evidence',false,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · the statement row is already the evidence</span></span></label>','',true);
    else if(op[0]==='orig'){const c=ccRecOrigCands(s,it);fl=ccField('Original Purchase',true,c.length?apCS('rcmx-orig',c.map(function(o){return expKey(o)+' · '+o.merchant+' · '+cdLabel(o.date)+' · '+expMoney(o.billAmount,o.billCurrency)+' ('+expMoney(ccTxnRefundable(o),o.billCurrency)+' refundable)';}),f.orig||'','Select original'):'<span class="wb-muted">No purchase of this card can take this credit.</span>','Same card; never more than what is still refundable.')+area('How the original was identified');}
    else if(op[0]==='adjust')fl='<div class="ep-form-group ep-form-full"><div class="wb-note is-wait"><b>Financial difference '+ccE(expMoney(it.variance,it.currency))+'</b><div class="wb-note-sub">Approved by someone else with card.reconciliation.signoff. Reconciliation never posts: a financial type is completed only by linking the entry its existing workflow produced.</div></div></div>'+ccField('Adjustment Type',true,apCS('rcmx-adjtype',RCA_TYPES,f.adjtype||'','Select','ccRecHook'),f.adjtype?ccE(RCA_HINT[f.adjtype]):'Pick what the difference is.',true)+area('The difference and its treatment')+file('Adjustment Evidence');
    else if(op[0]==='evidence')fl=area('Evidence needed','What the recorder or cardholder must provide');
    else if(op[0]==='carry')fl='<div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">A carried-forward exception keeps the reconciliation from closing as fully reconciled. The checker authorizes it at sign-off; it stays traceable.</div></div></div>'+area('Why it is carried forward');
    else if(op[0]==='resolve')fl=area('Resolution reason');
    const trail='<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>Status</th><th>By</th></tr></thead><tbody>'+it.history.slice().reverse().map(function(h){return '<tr><td>'+ccE(h.at)+'</td><td>'+ccE(h.to)+'<div class="ax-sub" style="white-space:normal">'+ccE(h.note||'')+'</div></td><td>'+ccE(h.by==='System'?'System':caN(h.by))+(h.actual?'<div class="ax-sub">through Switch User by '+ccE(caN(h.actual))+'</div>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';
    return bgModal(ccE(it.id)+' · '+ccE(it.type),ccE(ccRecItemRef(it))+'. '+ccE(it.text),
      '<div class="ep-form-grid"><div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">Statement '+ccE(expMoney(it.stmtAmt,it.currency))+' · ADT '+ccE(expMoney(it.adtAmt,it.currency))+' · variance '+ccE(expMoney(it.variance,it.currency))+(it.verification?' · '+ccE(it.verification):'')+' · '+ccE(it.status)+'</div></div></div>'
        +(ops.length?ccField('Resolution',true,apCS('rcmx-op',lab,f.op,'Select','ccRecHook')):'')+fl+'<div class="ep-form-group ep-form-full">'+trail+'</div></div>',{close:close,btns:ops.length?btn('Save'):''});
  }
  if(a.act==='rc-adjdec'){const it=s.recon.items[a.key];if(!it||!it.adj)return '';
    return bgModal('Approve Adjustment · '+ccE(it.adj.ref),ccE(it.id)+' '+ccE(it.type)+': '+ccE(expMoney(it.adj.amount,it.adj.currency))+' raised by '+ccE(caN(it.adj.by))+' – '+ccE(it.adj.reason)+' (evidence '+ccE(it.adj.evidence)+'). Type: '+ccE(it.adj.type)+'. Approval does not post anything'+(it.adj.financial?': the adjustment then waits for the entry its existing workflow produces.':'; it records the variance.')+'',
      '<div class="ep-form-grid">'+area('Remarks','Required')+'</div>',{close:close,btns:'<button class="btn-outline" onclick="ccRecSave(\'Reject\')">Reject</button>'+btn('Approve','ccRecSave(\'Approve\')')});}
  if(a.act==='rc-submit'){const carry=ccRecItems(s).filter(function(i){return i.status===RCX_CARRY||i.status===RCX_FINPEND;});
    return bgModal('Submit for Sign-Off · '+ccE(expKey(s)),'Proposed: '+(carry.length?'Closed with Authorized Exceptions ('+carry.map(function(i){return i.id;}).join(', ')+' carried forward)':'Closed – Reconciled')+'. '+m.matched+' of '+m.total+' rows matched, '+m.open+' open exception(s), unexplained variance '+ccE(expMoney(m.variance,s.currency))+'.',
      '<div class="ep-form-grid">'+area('Note for the checker','Optional',false)+'</div>',{close:close,btns:btn('Submit')});}
  if(a.act==='rc-signoff'){const carry=ccRecItems(s).filter(function(i){return i.status===RCX_CARRY||i.status===RCX_FINPEND;});
    return bgModal('Sign Off · '+ccE(expKey(s)),'Outcome: '+(carry.length?'Closed with Authorized Exceptions – you authorize '+carry.map(function(i){return i.id+' ('+i.type+')';}).join(', '):'Closed – Reconciled')+'. Your actual identity, the selected identity, the decision, the time and your notes are recorded. A closed reconciliation is never rewritten.',
      '<div class="ep-form-grid">'+area('Sign-off Notes',carry.length?'Required to authorize the carried-forward exceptions':'Optional',carry.length>0)+'</div>',{close:close,btns:btn('Sign Off','ccRecSave(\'Sign Off\')')});}
  if(a.act==='rc-return')return bgModal('Return · '+ccE(expKey(s)),'Back to the preparer; nothing closes.','<div class="ep-form-grid">'+area('What to review')+'</div>',{close:close,btns:btn('Return','ccRecSave(\'Return\')')});
  if(a.act==='rc-supp'){const its=s.recon.closed?s.recon.closed.items.map(function(i){return i.id+' · '+i.type;}):[];
    return bgModal('Supplementary Correction · '+ccE(expKey(s)),'Late provider information about a closed reconciliation. It is recorded with the closed reconciliation, which keeps its figures, and verified by someone independent.',
      '<div class="ep-form-grid">'+ccField('Provider Reference',true,ccInput('ccmx-ref',f.ref||'','Provider advice or case reference'))+ccField('Amount',false,'<div class="ax-currency"><span>'+ccE(s.currency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" step="0.01" value="'+attrSafe(f.amount||'')+'"></div>','Negative for a credit; blank if none.')
        +ccField('About Exception',false,apCS('rcmx-item',its,f.item||'','None'))+area('The late information and its effect')+file('Provider Evidence')+'</div>',{close:close,btns:btn('Record for Verification')});}
  if(a.act==='rc-suppver'){const x=s.recon.supplements.find(function(y){return y.n===Number(a.n);});if(!x)return '';
    return bgModal('Verify Correction · '+ccE(x.id),ccE(x.reason)+' (ref '+ccE(x.ref)+', '+ccE(x.evidence)+', recorded by '+ccE(caN(x.by))+').','<div class="ep-form-grid">'+area('Remarks','Required to reject',false)+'</div>',
      {close:close,btns:'<button class="btn-outline" onclick="ccRecSave(\'Reject\')">Reject</button>'+btn('Verify','ccRecSave(\'Verify\')')});}
  return '';
}
function ccRecSave(decision){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f,s=ccStmt(a.sid);let err='',ok='';
  if(a.act==='rc-item'){const it=s.recon.items[a.key],ops=ccRecOps(s,it),op=(ops.find(function(o){return o[1]===f.op;})||ops[0]||[''])[0];
    const pick=function(list,v){return list.find(function(t){return String(v||'').indexOf(expKey(t)+' ')===0;});};
    if(op==='link'){const t=pick(ccRecLinkCands(s,it),f.txn);err=t?ccRecLinkTxn(s.id,a.key,t.id,f.reason):'Pick the ADT transaction.';ok='Linked';}
    else if(op==='map'){const c=pick(ccRecScopeCards(s).map(ccCard).filter(Boolean),f.card);err=c?ccRecMapCard(s.id,a.key,c.id,f.reason):'Pick the card.';ok='Card mapped';}
    else if(op==='record'){err=ccRecRecordMissing(s.id,a.key,{reason:f.reason,evidence:f.evidence});ok='Recorded for independent verification';}
    else if(op==='orig'){const o=pick(ccRecOrigCands(s,it),f.orig);err=o?ccRecLinkOriginal(s.id,a.key,o.id,f.reason):'Pick the original purchase.';ok='Original linked';}
    else if(op==='adjust'){err=ccRecAdjust(s.id,a.key,{type:f.adjtype,reason:f.reason,evidence:f.evidence});ok='Routed for approval';}
    else if(op==='evidence'){err=ccRecRequestEvidence(s.id,a.key,f.reason);ok='Evidence requested';}
    else if(op==='carry'){err=ccRecCarry(s.id,a.key,f.reason);ok='Carry forward proposed';}
    else if(op==='resolve'){err=ccRecResolve(s.id,a.key,{reason:f.reason});ok='Resolved';}
    else err='Pick the resolution.';}
  else if(a.act==='rc-adjdec'){err=ccRecAdjustDecide(s.id,a.key,decision,f.reason);ok='Adjustment '+(decision==='Approve'?'approved':'rejected');}
  else if(a.act==='rc-submit'){err=ccRecSubmit(s.id,f.reason);ok='Submitted for sign-off';}
  else if(a.act==='rc-signoff'||a.act==='rc-return'){err=ccRecSignoff(s.id,{decision:decision,notes:f.reason});ok=decision==='Return'?'Returned':'Signed off';}
  else if(a.act==='rc-supp'){err=ccRecSupplement(s.id,{ref:f.ref,amount:f.amount,item:String(f.item||'').split(' · ')[0],reason:f.reason,evidence:f.evidence});ok='Recorded for verification';}
  else if(a.act==='rc-suppver'){err=ccRecSupplementVerify(s.id,a.n,decision,f.reason);ok='Correction '+(decision==='Reject'?'rejected':'verified');}
  if(err){showToast('Not saved','error',err);return;}
  ccMxAct=null;ccStmtTab='recon';renderADTPage();showToast(ok,'success',expKey(s));
}

/* ── B8-N22-08: the cardholder's recovery view (My Cards pending action and the notification) ── */
function ccCsxEmpRecOpen(id,n){ccMxAct={act:'csx-emprec',id:Number(id),n:Number(n),f:{reason:'',evidence:''}};if(page!=='cards')navigatePage('cards');else renderADTPage();}
const ccCsxOpenUIBase8F=ccCsxOpenUI;
ccCsxOpenUI=function(id,tab){
  const x=ccCsx(id);
  if(x&&!ccCsxVisible(x)){const me=ccEmpOf(),v=me?ccCsxEmpRecoveries(me.eid).filter(function(r){return r.id===x.id;}):[];if(v.length){ccCsxEmpRecOpen(x.id,v[v.length-1].n);return;}}
  return ccCsxOpenUIBase8F(id,tab);
};
function ccCsxEmpRecHTML(a){
  const me=ccEmpOf(),v=me?ccCsxEmpRecoveries(me.eid).find(function(r){return r.id===a.id&&r.n===a.n;}):null,close='ccMxClose()',f=a.f;
  if(!v)return bgModal('Card Spend Recovery','This recovery is not available to you.','',{close:close,btns:''});
  const items=((ccExcBook['csx:'+v.id]||{}).items||[]).filter(function(i){return i.type==='Information Provided'||i.type==='Clarification Requested';});
  const F=function(l,val,full){return axField(AX_ICO.fTag,l,val,full);};
  const open=['Recovered','Recovery Cancelled'].indexOf(v.status)<0;
  return bgModal('Card Spend Recovery · '+ccE(v.ref),'Part of a card payment was not approved as a business expense, and Finance approved its recovery from you. Recovered amounts count only after Finance verifies your payment evidence. Nothing is deducted from your salary.',
    '<div class="lp-sb-detail-grid">'+F('Expense',ccE(v.claimKey+' · '+v.lineTitle))+F('Card Transaction',ccE(v.txnKey||'—'))+F('Card',ccE(v.card))+F('Transaction Date',ccE(cdLabel(v.txnDate)))
      +F('Recovery Amount',ccE(expMoney(v.amount,v.currency)))+F('Recovered',ccE(expMoney(v.collected,v.currency))+' <span class="ax-sub">verified payments only'+(v.underVerification?'; '+ccE(expMoney(v.underVerification,v.currency))+' under verification':'')+'</span>')
      +F('Still to Repay',ccE(expMoney(v.due,v.currency)))+F('Repayment Method',ccE(v.method))+F('Recovery Status',axBadge(statusTone(v.status),v.status))
      +F('Business Reason',ccE(v.reason),true)+F('Action Required',ccE(v.action),true)+'</div>'
      +(items.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>Information</th></tr></thead><tbody>'+items.slice().reverse().map(function(i){return '<tr><td>'+ccE(i.at)+'</td><td>'+ccE(i.type)+'<div class="ax-sub" style="white-space:normal">'+ccE(i.text||'')+(i.file?' ('+ccE(i.file)+')':'')+'</div></td></tr>';}).join('')+'</tbody></table></div>':'')
      +(open?'<div class="ep-form-grid">'+ccField('Clarification or Evidence',false,ccArea('ccmx-reason',f.reason||'','For example: the payment reference of my bank transfer'),'',true)
        +ccField('Attachment',false,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · payment proof or document (max 5 MB)</span></span></label>','',true)+'</div>':''),
    {close:close,btns:open?'<button class="ep-save-btn" onclick="ccCsxEmpSave()">Send to Finance</button>':''});
}
function ccCsxEmpSave(){ccMxSync();const a=ccMxAct;if(!a)return;const e=ccCsxEmpRespond(a.id,a.n,{note:a.f.reason,file:a.f.evidence});if(e){showToast('Not sent','error',e);return;}ccMxAct=null;renderADTPage();showToast('Sent to Finance','success');}

/* ── B8-N22-09: Finance review of a credit link in another currency, from another card or to a funding source ── */
function ccCsxCrReviewHTML(a){
  const x=ccCsx(a.id),r=x&&ccCsxRes(x,a.n),c=r&&(r.credits||[]).find(function(y){return y.txnId===Number(a.txnId);});if(!c)return '';
  return bgModal('Finance Review · '+ccE(c.key),ccE(expMoney(c.amount,c.currency))+' of '+ccE(c.key)+' linked to '+ccE(expKey(x))+' by '+ccE(caN(c.by))+' ('+ccE(ccCsxDiffText(c.diff))+')'+(c.rate?' at '+c.rate+' ('+ccE(c.rateEvidence)+') = '+ccE(expMoney(c.csxAmount,x.currency)):'')+(c.reason?'. '+ccE(c.reason):'')+'. It counts only once accepted here and the credit is verified.',
    '<div class="ep-form-grid">'+ccField('Review Remarks',true,ccArea('ccmx-reason',a.f.reason||'','What was checked: rate source, card, destination'),'',true)+'</div>',
    {close:'ccMxClose()',btns:'<button class="btn-outline" onclick="ccCsxCrReviewSave(\'Reject\')">Reject</button><button class="ep-save-btn" onclick="ccCsxCrReviewSave(\'Approve\')">Accept</button>'});
}
function ccCsxCrReviewSave(decision){ccMxSync();const a=ccMxAct;if(!a)return;const e=ccCsxCreditReview(a.id,a.n,a.txnId,decision,a.f.reason);if(e){showToast('Not saved','error',e);return;}ccMxAct=null;renderADTPage();showToast(decision==='Approve'?'Credit link accepted':'Credit link rejected','success');}

const ccMxHTMLBase8F=ccMxHTML;
ccMxHTML=function(){
  const a=ccMxAct;if(!a)return '';
  if(String(a.act).indexOf('rc-')===0)return ccRecPopupHTML(a);
  if(a.act==='csx-emprec')return ccCsxEmpRecHTML(a);
  if(a.act==='csx-crreview')return ccCsxCrReviewHTML(a);
  return ccMxHTMLBase8F();
};
const ccMxSyncBase8F=ccMxSync;
ccMxSync=function(){
  ccMxSyncBase8F();const a=ccMxAct;if(!a)return;let v;
  if(String(a.act).indexOf('rc-')===0){
    [['op','rcmx-op'],['txn','rcmx-txn'],['card','rcmx-card'],['orig','rcmx-orig'],['item','rcmx-item']].forEach(function(p){if(document.getElementById('csw-'+p[1]))a.f[p[0]]=getCSValue(p[1]);});
    if((v=ccVal('ccmx-amount'))!=null)a.f.amount=v;
  }
  if(a.act==='csx-link'){[['rate','ccmx-rate'],['rateEv','ccmx-rateev']].forEach(function(p){if((v=ccVal(p[1]))!=null)a.f[p[0]]=v;});}
  const dc=document.getElementById('ccmx-declare');if(dc)a.f.declare=dc.checked;
};

/* The benefit evidence rule in the exception popup (Wallet & Benefits owns it). */
function ccExcBenefitHTML(row,f){
  const e=ccBenefitEvidenceRule(row.t);if(!e)return '';
  return '<div class="ep-form-group ep-form-full"><div class="wb-note is-wait"><b>'+ccE(e.rule)+'</b><div class="wb-note-sub">Set by Wallet & Benefits for '+ccE(e.cat.name)+' from '+ccE(cdLabel(e.from))+': '+ccE(ccBenefitEvidenceWhat(e))+' for each card spend from this wallet.</div></div></div>'
    +(e.declaration?'<div class="ep-form-group ep-form-full"><label class="onc-decl cc-check"><input type="checkbox" id="ccmx-declare"'+(f.declare?' checked':'')+'><span>'+ccE(ccBenefitDeclText(row.t))+'</span></label></div>':'');
}


/* ══ Build 8G UI · Corporate Cards → Cards → Disputes (a sub-view, not a sixth tab) ══════════════════════════════════════
   Raise Dispute from the cardholder's My Cards transactions and from the Transaction Detail panel; Finance works disputes in
   the Disputes sub-view with the usual table, filters, tiles, side panel, popups, Logs and History. The cardholder follows
   their own disputes in My Cards, without internal notes, full provider identifiers or funding details. */
let ccDspSel=null,ccDspTab='basic-details',ccDspQ='',ccDspStF='';
const ccCardsSubsBase8G=ccCardsSubs;
/* Disputes are no longer a separate page (product owner, 11 Nov 2026): they are on their payments - the Transactions page
   (Status Dispute, the Dispute box, the payment's Logs tab) and the card's Transactions tab. */
ccCardsSubs=function(){return ccCardsSubsBase8G();};
const ccCardsHTMLBase8G=ccCardsHTML;
ccCardsHTML=function(){if(ccCardsSub==='disputes'&&ccAdminView()&&['card.dispute.manage','card.dispute.view'].some(ccCan))return ccDspPageHTML();return ccCardsHTMLBase8G();};
function ccDspTone(st){return {'Resolved':'ok','Draft':'idle','Submitted':'info','Under Internal Review':'wait','More Information Required':'wait','Awaiting Provider':'wait','Raised with Provider':'info','Provider Outcome Recorded':'info',
  'Financial Settlement Pending':'wait','Closed':'ok','Withdrawn':'idle','Settled':'ok','Partially Settled':'wait','Pending':'wait','Resolved in Favour':'ok','Partially in Favour':'info','Resolved Against':'bad'}[st]||statusTone(st);}
function ccDspShown(){
  const q=String(ccDspQ||'').trim().toLowerCase();
  return ccDisputes.filter(function(d){
    if(!ccDspVisible(d)||d.status==='Draft'&&d.raisedBy!==idMe())return false;
    if(q&&![expKey(d),d.txnKey,d.merchant,d.name,d.reason,d.provider?d.provider.caseRef:''].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;}))return false;
    if(ccDspStF==='Unassigned')return d.status==='Submitted';
    if(ccDspStF==='Under Review')return ['Under Internal Review','More Information Required'].indexOf(d.status)>=0;
    if(ccDspStF==='With Provider')return ['Awaiting Provider','Raised with Provider'].indexOf(d.status)>=0;
    if(ccDspStF==='Settlement Pending')return d.status==='Financial Settlement Pending'||d.status==='Provider Outcome Recorded';
    if(ccDspStF==='Closed')return DSP_DONE.indexOf(d.status)>=0;
    if(ccDspStF===CC_DEMO)return d.demo;
    if(ccDspStF&&d.status!==ccDspStF)return false;
    return true;
  });
}
function ccDspStat(v){ccDspStF=ccDspStF===v?'':v;ccDspSel=null;renderADTPage();}
function ccDspApply(){ccDspQ=lpSearchValue('dsp-f-q');const s=getCSValue('dsp-f-status');ccDspStF=s==='All Statuses'?'':s||'';ccDspSel=null;renderADTPage();}
function ccDspReset(){ccDspQ='';ccDspStF='';ccDspSel=null;renderADTPage();}
function ccDspPageHTML(strip){
  const all=ccDisputes.filter(ccDspVisible),rows=ccDspShown();if(ccDspSel!=null&&!rows.some(function(d){return d.id===ccDspSel;}))ccDspSel=null;
  const n=function(f){return all.filter(f).length;};
  const tiles=caStat('Submitted – Unassigned',n(function(d){return d.status==='Submitted';}),ccDspStF==='Unassigned','ccDspStat(\'Unassigned\')','wait')
    +caStat('Under Review',n(function(d){return ['Under Internal Review','More Information Required'].indexOf(d.status)>=0;}),ccDspStF==='Under Review','ccDspStat(\'Under Review\')','wait')
    +caStat('With Provider',n(function(d){return ['Awaiting Provider','Raised with Provider'].indexOf(d.status)>=0;}),ccDspStF==='With Provider','ccDspStat(\'With Provider\')','info')
    +caStat('Settlement Pending',n(function(d){return d.status==='Financial Settlement Pending'||d.status==='Provider Outcome Recorded';}),ccDspStF==='Settlement Pending','ccDspStat(\'Settlement Pending\')','wait')
    +caStat('Closed',n(function(d){return DSP_DONE.indexOf(d.status)>=0;}),ccDspStF==='Closed','ccDspStat(\'Closed\')','ok')
    +(all.some(function(d){return d.demo;})?caStat(CC_DEMO,n(function(d){return d.demo;}),ccDspStF===CC_DEMO,'ccDspStat(\''+CC_DEMO+'\')','info'):'');
  const sts=['Submitted','Under Internal Review','More Information Required','Awaiting Provider','Raised with Provider','Provider Outcome Recorded','Financial Settlement Pending','Resolved','Closed','Withdrawn'];
  const bar=ccFilterBar(lpSearchField('dsp-f-q',ccDspQ,'Search disputes','ccDspApply()')+apCS('dsp-f-status',sts,sts.indexOf(ccDspStF)>=0?ccDspStF:'','All Statuses')
    +clearFiltersBtn([ccDspQ,ccDspStF],'ccDspReset()')+'<button class="lp-pill-search" onclick="ccDspApply()">Search</button>',tiles);
  const note='<div class="wb-note">A dispute is the cardholder\'s internal report, reviewed by Finance; '
    +ccE(ccProviderName(oncProg(ccEnt()).provider||''))+' is not connected, so nothing is Provider Confirmed. Settlement counts only verified credits.</div>';
  const pgn=listPage('cards-disputes',[ccDspQ,ccDspStF].join('|'),rows.map(function(d,i){
    return '<tr class="dsp-row'+(ccDspSel===d.id?' lp-row-selected':'')+'" id="dsp-row-'+d.id+'" style="cursor:pointer" onclick="ccDspOpen('+d.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td><td><div class="lp-c-main ax-c-link">'+ccE(expKey(d))+'</div><div class="lp-c-sub">'+ccE(String(d.submittedAt||d.raisedAt).split(' | ')[0])+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(d.merchant)+'</div><div class="lp-c-sub">'+ccE(d.txnKey+' · '+cdLabel(d.txnDate))+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(d.name)+'</div><div class="lp-c-sub">'+ccE(ccMask(d.cardRef.last4))+(d.onBehalf?' · raised by '+ccE(caN(d.raisedBy)):'')+'</div></td>'
      +'<td><div class="lp-c-plain">'+ccE(expMoney(d.amount,d.currency))+'</div><div class="lp-c-sub">of '+ccE(expMoney(d.billAmount,d.currency))+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc">'+ccE(d.reason)+'</div><div class="lp-c-sub">'+ccE(d.assignee?'reviewer '+caN(d.assignee):'unassigned')+'</div></td>'
      +'<td>'+axBadge(ccDspTone(d.status),d.status)+(d.demo?'<div class="lp-c-sub">'+CC_DEMO+'</div>':'')+'</td>'
      +'<td><div class="lp-c-plain">'+ccE(d.outcome?d.outcome.result:'—')+'</div><div class="lp-c-sub">'+ccE(ccDspSettleText(d))+'</div></td></tr>';
  }),ccEmpty(8,'No card dispute yet. A cardholder raises one from My Cards; Finance from the transaction panel.'));
  return '<div class="lp-page">'+dashboardBackHTML()+(strip!=null?strip:ccSubStrip(ccCardsSubs(),ccCardsSub,'ccCardsSubPick',''))+bar+ccDemoNote()+note
    +ccSplit('dsp','<table class="lp-table ax-table exp-table cc-table"><thead><tr><th>S. No</th><th>Dispute</th><th>Transaction</th><th>Cardholder</th><th>Disputed</th><th>Reason</th><th>Status</th><th>Outcome · Settlement</th></tr></thead><tbody>'
      +pgn.rows+'</tbody></table>'+pgn.pager,ccDspSel!=null,renderDspSidebar)+'</div>';
}
function ccDspOpen(id,tab){
  const d=ccDsp(id);if(!d||!ccDspVisible(d)){showToast('Not available','error','This dispute is outside your access.');return;}
  if(page!=='cards'||ccPageTab!=='cards'||ccCardsSub!=='disputes'){ccOpenDisputeUI(id,tab);return;}
  ccDspTab=tab||sbKeepTab(ccDspSel,ccDspTab);ccDspSel=d.id;
  const sb=document.getElementById('dsp-split-sb');if(!sb){renderADTPage();return;}
  sb.classList.add('open');isbTab('dsp',renderDspSidebar);
  document.querySelectorAll('.dsp-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='dsp-row-'+id);});
}
function ccDspPanelClose(){ccDspSel=null;const sb=document.getElementById('dsp-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.dsp-row').forEach(function(x){x.classList.remove('lp-row-selected');});}
function ccDspNav(t){ccDspTab=t;isbTab('dsp',renderDspSidebar);}
/* Notifications and links open the dispute where the reader may see it: Finance in the Disputes panel, the cardholder in My Cards. */
function ccOpenDisputeUI(id,tab){
  const d=ccDsp(id);if(!d)return;
  if(!ccDspVisible(d)){showToast('Not available','error','This dispute is outside your access.');return;}
  /* Finance and card administrators: the dispute is on its payment (product owner, 11 Nov 2026) - its Logs tab carries the
     dispute's actions. Only someone who cannot open the payment gets the older dispute view. */
  const tx=ccTxn(d.txnId);
  if(ccAdminView()&&['card.dispute.manage','card.dispute.view'].some(ccCan)&&tx&&ccTxnVisible(tx)&&typeof ccTxnAdminView==='function'&&ccTxnAdminView()){ccOpenTxnUI(tx.id,'logs');return;}
  if(ccAdminView()&&['card.dispute.manage','card.dispute.view'].some(ccCan)){ccCloseForms();ccPageTab='cards';ccCardsSub='disputes';ccDspQ='';ccDspStF='';ccDspSel=d.id;ccDspTab=tab||'basic-details';if(page!=='cards')navigatePage('cards');else renderADTPage();return;}
  ccMxAct={act:'dsp-view',id:d.id,f:{reason:'',evidence:''}};if(page!=='cards')navigatePage('cards');else renderADTPage();
}
function ccDspActions(d){
  const A=ccNow(),out=[],add=function(l,c,p){out.push(ccBtn(l,c,p));},id=d.id,man=!ccDspMayManage(A,d),o=d.outcome;
  const pv=function(x){return x&&x.verify&&x.verify.status==='Awaiting Verification'&&ccCan('card.transaction.verify')&&[x.by,x.actual].indexOf(A.who)<0&&caVia(A)!==x.by&&ccDspHolder(d)!==A.who;};
  if(man){
    if(['Submitted','Under Internal Review'].indexOf(d.status)>=0&&d.assignee!==A.who)add(d.assignee?'Reassign':'Assign to Me',d.assignee?'ccMxOpen(\'dsp-assign\',{id:'+id+'})':'ccDspDo(\'assign\','+id+')',!d.assignee);
    if(['Submitted','Under Internal Review'].indexOf(d.status)>=0)add('Complete Review','ccMxOpen(\'dsp-review\',{id:'+id+'})',!!d.assignee);
    if(['Submitted','Under Internal Review','Awaiting Provider','Raised with Provider'].indexOf(d.status)>=0)add('Request Information','ccMxOpen(\'dsp-info\',{id:'+id+'})');
    if(d.status==='Awaiting Provider')add(d.demo?'Record Illustrative Submission':'Record Provider Case','ccMxOpen(\'dsp-provider\',{id:'+id+'})',true);
    if(d.status==='Raised with Provider'&&(d.demo||(d.provider&&d.provider.verify.status==='Verified')))add(d.demo?'Record Illustrative Outcome':'Record Provider Outcome','ccMxOpen(\'dsp-outcome\',{id:'+id+'})',true);
    if(d.provider&&!d.demo&&['Raised with Provider','Provider Outcome Recorded','Financial Settlement Pending'].indexOf(d.status)>=0)add('Record Provider Update','ccMxOpen(\'dsp-provevent\',{id:'+id+'})');
    if(['Raised with Provider','Provider Outcome Recorded','Financial Settlement Pending'].indexOf(d.status)>=0&&!(o&&o.result==='Resolved Against')&&ccDspCreditCands(d).length)add('Link Credit','ccMxOpen(\'dsp-credit\',{id:'+id+'})',d.status==='Financial Settlement Pending');
    if(!d.csx&&ccDspCsxOf(d)&&ccCan('card.csx.resolve')&&!(o&&o.result==='Resolved Against'))add('Expect Credit on CSX','ccDspDo(\'csx\','+id+')');
    if(ccDspSuppNeeded(d))add('Record Supplementary Correction','ccMxOpen(\'dsp-supp\',{id:'+id+'})',true);
    if(o&&['Verified',CC_DEMO].indexOf(o.verify.status)>=0&&(o.result==='Resolved Against'||d.settlement.status==='Settled')&&!ccDspSuppNeeded(d))add('Close Dispute','ccMxOpen(\'dsp-close\',{id:'+id+'})',true);
    if(['Submitted','Under Internal Review','More Information Required','Awaiting Provider','Raised with Provider'].indexOf(d.status)>=0)add('Withdraw','ccMxOpen(\'dsp-withdraw\',{id:'+id+'})');
    add('Internal Note','ccMxOpen(\'dsp-note\',{id:'+id+'})');
  }
  if(pv(d.provider))add('Verify Provider Case','ccMxOpen(\'dsp-verify\',{id:'+id+',what:\'submission\'})',true);
  if(pv(o))add('Verify Provider Outcome','ccMxOpen(\'dsp-verify\',{id:'+id+',what:\'outcome\'})',true);
  return out.join('');
}
function ccDspSrcText(x){return !x?'—':x.source===CC_DEMO?CC_DEMO:x.source+' – '+(x.verify.status==='Verified'?'independently verified by '+caN(x.verify.by):x.verify.status==='Awaiting Verification'?'awaiting independent verification':x.verify.status);}
function renderDspSidebar(){
  const d=ccDsp(ccDspSel);if(!d)return '';if(!ccDspVisible(d))return '<div class="lp-isb-body"><div class="wb-empty-sm">This dispute is not available to you.</div></div>';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'provider',label:'Provider & Settlement'},{id:'review',label:'Review'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
  if(!tabs.some(function(t){return t.id===ccDspTab;}))ccDspTab='basic-details';
  const hero=sbHero({icon:CC_ICO.hero,name:ccE(d.reason),meta:[expKey(d),ccE(d.txnKey),ccE(expMoney(d.amount,d.currency))],status:axBadge(ccDspTone(d.status),d.status)});
  const act=ccDspActions(d),head=act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'';
  const t=ccTxn(d.txnId),o=d.outcome,P=d.provider;let body;
  if(ccDspTab==='provider'){
    body=hero+head+'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fKey,'Provider Case',P?ccE(P.caseRef)+' <span class="ax-sub">raised '+ccE(cdLabel(P.date))+' · '+ccE(P.evidence)+'</span>':'<span class="wb-muted">Not raised with the provider</span>')
      +axField(AX_ICO.fCheck,'Verification Source',ccE(ccDspSrcText(P)))
      +axField(AX_ICO.fCheck,'Provider Outcome',o?axBadge(ccDspTone(o.result),o.result)+' <span class="ax-sub">'+ccE((o.amount?expMoney(o.amount,d.currency)+' · ':'')+'decision '+o.ref+' · '+o.evidence)+'</span>':'<span class="wb-muted">Pending</span>')
      +axField(AX_ICO.fCheck,'Outcome Verification',ccE(ccDspSrcText(o)))
      +axField(AX_ICO.fCash,'Financial Settlement',axBadge(ccDspTone(d.settlement.status),d.settlement.status)+(d.settlement.settled?' <span class="ax-sub">'+ccE(expMoney(d.settlement.settled,d.currency))+' credited</span>':''),true)
      +axField(AX_ICO.fCash,'Linked Credits',(d.settlement.credits||[]).length?d.settlement.credits.map(function(c){return '<button class="att-link" onclick="ccOpenTxnUI('+c.txnId+')">'+ccE(c.key)+'</button> '+ccE(expMoney(c.amount,d.currency));}).join(' · '):'<span class="wb-muted">None</span>',true)
      +axField(AX_ICO.fTicket,'Card Spend Exception',d.csx?'<button class="att-link" onclick="ccCsxOpenUI('+d.csx.id+')">'+ccE(d.csx.key)+'</button> <span class="ax-sub">dispute credit expected '+ccE(expMoney(d.csx.amount,d.currency))+'</span>':ccDspCsxOf(d)?'<span class="wb-muted">'+(DSP_DONE.indexOf(d.status)>=0?'An open CSX on the transaction is not linked to this dispute':'Open CSX on the transaction; no dispute credit expected yet')+'</span>':'—',true)
      +axField(AX_ICO.fTicket,'Reconciliation',(d.rsc||[]).length?d.rsc.map(function(r){return ccE(r.id+' on '+r.stmtKey);}).join(', '):ccDspClosedStmt(d)?'<span class="wb-warn">'+ccE(expKey(ccDspClosedStmt(d)))+' is closed: a supplementary correction is needed once a credit is linked</span>':ccE(t?t.reconStatus||'':''),true)
      +'</div>'+((P&&P.events.length)?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>Provider</th><th>By</th></tr></thead><tbody>'+P.events.slice().reverse().map(function(e){return '<tr><td>'+ccE(e.at)+'</td><td>'+ccE(e.type)+'<div class="ax-sub" style="white-space:normal">'+ccE(e.text)+(e.evidence?' ('+ccE(e.evidence)+')':'')+'</div></td><td>'+ccE(caN(e.by))+'</td></tr>';}).join('')+'</tbody></table></div>':'');
  }else if(ccDspTab==='review'){
    const items=d.requests.map(function(q){return {at:q.at,what:'Information requested',text:q.q+(q.a?' — answered: '+q.a.note+(q.a.file?' ('+q.a.file+')':''):' — awaiting the cardholder'),by:q.by};})
      .concat(d.notes.map(function(n){return {at:n.at,what:'Internal note',text:n.text,by:n.by};}),d.review?[{at:d.review.at,what:'Review completed',text:d.review.note,by:d.review.by}]:[]);
    body=hero+head+'<div class="wb-note"><div class="wb-note-sub">Internal review. Notes are never shown to the cardholder.</div></div>'
      +(items.length?'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>When</th><th>Review</th><th>By</th></tr></thead><tbody>'+items.sort(function(a,b){return a.at<b.at?1:-1;}).map(function(x){return '<tr><td>'+ccE(x.at)+'</td><td>'+ccE(x.what)+'<div class="ax-sub" style="white-space:normal">'+ccE(x.text)+'</div></td><td>'+ccE(caN(x.by))+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="wb-empty-sm">No review entry yet.</div>');
  }else if(ccDspTab==='logs')body=lpLogsView(d.logs,'');
  else if(ccDspTab==='history')body=sbHistoryHTML(d);
  else body=hero+head+(d.demo?'<div class="wb-note">'+CC_DEMO+' dispute: provider steps are illustrative and labelled; nothing is genuine.</div>':'')
    +'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fHash,'Dispute ID',ccE(expKey(d)))
    +axField(AX_ICO.fTicket,'Transaction',t?'<button class="att-link" onclick="ccOpenTxnUI('+t.id+')">'+ccE(d.txnKey)+'</button> <span class="ax-sub">'+ccE(d.merchant+' · '+cdLabel(d.txnDate))+'</span>':ccE(d.txnKey))
    +axField(AX_ICO.fUser,'Cardholder',ccE(d.name)+' <span class="ax-sub">'+ccE(ccMask(d.cardRef.last4)+' · '+d.cardRef.key)+((ccCard(d.cardId)||{}).status&&(ccCard(d.cardId)||{}).status!=='Active'?' · card now '+ccE(ccCard(d.cardId).status):'')+'</span>')
    +axField(AX_ICO.fUser,'Raised By',ccE(caN(d.raisedBy))+' <span class="ax-sub">'+ccE(d.raisedAt)+(d.actual?' · through Switch User by '+ccE(caN(d.actual)):'')+(d.onBehalf?' · on behalf of the cardholder':'')+'</span>')
    +axField(AX_ICO.fCash,'Disputed Amount',ccE(expMoney(d.amount,d.currency))+' <span class="ax-sub">of '+ccE(expMoney(d.billAmount,d.currency))+(d.txnCurrency!==d.currency?' ('+ccE(expMoney(d.txnAmount,d.txnCurrency))+')':'')+'</span>')
    +axField(AX_ICO.fTag,'Dispute Reason',ccE(d.reason))
    +axField(AX_ICO.fUser,'Internal Reviewer',d.assignee?ccE(caN(d.assignee)):'<span class="wb-muted">Unassigned</span>')
    +axField(AX_ICO.fCheck,'Status',axBadge(ccDspTone(d.status),d.status))
    +axField(AX_ICO.fCheck,'Provider Outcome',o?ccE(o.result)+(o.amount!=null?' <span class="ax-sub">'+ccE(expMoney(o.amount,d.currency))+'</span>':''):'')
    +axField(AX_ICO.fCash,'Financial Settlement',ccDspSettleText(d)?ccE(ccDspSettleText(d)):'')
    +axField(EXP_ICO.note,'Description',ccE(d.description),true)
    +axField(AX_ICO.fBox,'Supporting Evidence',d.evidence.length?d.evidence.map(function(e){return ccE(e.file);}).join(', '):'<span class="wb-muted">None</span>',true)
    +(d.closed?axField(AX_ICO.fCheck,d.closed.type==='Withdrawn'?'Withdrawn':'Closed',ccE(d.closed.type+' · '+caN(d.closed.by)+' · '+d.closed.at+': '+d.closed.reason),true):'')
    +'</div>';
  return axTabBar('dsp',tabs,ccDspTab,'ccDspNav','ccDspPanelClose')+'<div class="lp-isb-body">'+body+'</div>';
}
function ccDspDo(what,id){
  let e='',ok='';
  if(what==='assign'){e=ccDspAssign(id);ok='Assigned to you';}
  else if(what==='csx'){e=ccDspRouteCsx(id);ok='Dispute credit expected on the card spend exception';}
  if(e){showToast('Not saved','error',e);return;}renderADTPage();showToast(ok,'success',expKey(ccDsp(id)));
}
/* ── Popups ── */
function ccDspPopupHTML(a){
  const f=a.f,close='ccMxClose()',btn=function(l,c){return '<button class="ep-save-btn" onclick="'+(c||'ccDspSave()')+'">'+l+'</button>';};
  const area=function(lbl,ph,req){return ccField(lbl,req!==false,ccArea('ccmx-reason',f.reason||'',ph||''),'',true);};
  const file=function(lbl,req,hint){return ccField(lbl||'Evidence',req!==false,f.evidence?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.evidence)+'</span></div>':'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccMxFile(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · '+(hint||'max 5 MB')+'</span></span></label>','',true);};
  if(a.act==='dsp-raise'){
    const t=ccTxn(a.txnId);if(!t)return '';const rem=ccDspRemaining(t),own=idUserOfEmp(t.employeeEid)===idMe(),rs=f.dreason||'';
    return bgModal('Raise Dispute · '+ccE(expKey(t)),(own?'Report a problem with your card transaction. ':'On behalf of '+ccE(t.name)+'. ')+'This is an internal ADT dispute: Finance reviews it first; nothing is raised with the provider, refunded or changed on the transaction by submitting it, and no approval is needed.',
      '<div class="ep-form-grid"><div class="ep-form-group ep-form-full"><div class="wb-note"><div class="wb-note-sub">'+ccE(expKey(t)+' · '+ccMask(t.cardRef.last4)+' · '+cdLabel(ccTxnLocalDate(t)||t.date)+' · '+t.merchant+' · '+expMoney(t.amount,t.currency)+(t.currency!==t.billCurrency?' (billed '+expMoney(t.billAmount,t.billCurrency)+')':''))+(t.demo?' · '+CC_DEMO:'')+'</div></div></div>'
        +ccField('Dispute Reason',true,apCS('dspx-reason',DSP_REASONS,rs,'Select','ccRecHook'),rs&&DSP_EVIDENCE[rs]?'Supporting evidence is required for this reason.':'These are ADT categories, not the provider\'s dispute codes.')
        +ccField('Disputed Amount',true,'<div class="ax-currency"><span>'+ccE(t.billCurrency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" min="0" step="0.01" value="'+attrSafe(f.amount!=null?f.amount:rem)+'"></div>','At most '+ccE(expMoney(rem,t.billCurrency))+' (less verified refunds and other disputes).')
        +area('Description',rs==='Other'?'Required: explain the dispute (at least 20 characters)':'What is wrong with the transaction')+file('Supporting Evidence',!!DSP_EVIDENCE[rs],'receipt, merchant confirmation or cancellation (max 5 MB)')+'</div>',
      {close:close,btns:'<button class="btn-outline" onclick="ccDspSave(\'draft\')">Save Draft</button>'+btn('Submit Dispute','ccDspSave(\'submit\')')});
  }
  const d=ccDsp(a.id);if(!d)return '';
  if(a.act==='dsp-view'){const v=ccDspEmpView(d),F=function(l,val,full){return axField(AX_ICO.fTag,l,val,full);};
    const canResp=d.status==='More Information Required',canW=['Draft','Submitted','Under Internal Review','More Information Required','Awaiting Provider'].indexOf(d.status)>=0;
    return bgModal('Card Dispute · '+ccE(v.ref),'Your dispute about a card transaction. Finance reviews it'+(v.demo?' ('+CC_DEMO+')':'')+'; you are told when something is needed from you.',
      '<div class="lp-sb-detail-grid">'+F('Transaction',ccE(v.txnKey+' · '+v.merchant))+F('Card',ccE(v.card))+F('Transaction Date',ccE(cdLabel(v.txnDate)))+F('Disputed Amount',ccE(expMoney(v.amount,v.currency)))
        +F('Reason',ccE(v.reason))+F('Status',axBadge(ccDspTone(v.status),v.status))+F('Provider',ccE(v.provider))+F('Outcome',ccE(v.outcome))+F('Settlement',ccE(v.settlement))+F('Action Required',ccE(v.action),true)+F('Description',ccE(v.description),true)+'</div>'
        +(canResp?'<div class="ep-form-grid">'+area('Your Response','The information Finance asked for')+file('Attachment',false)+'</div>':''),
      {close:close,btns:(d.status==='Draft'?btn('Submit Dispute','ccDspSave(\'submitdraft\')'):'')+(canResp?btn('Send to Finance','ccDspSave(\'respond\')'):'')+(canW&&!canResp&&d.status!=='Draft'?'<button class="btn-outline" onclick="ccMxOpen(\'dsp-withdraw\',{id:'+d.id+'})">Withdraw</button>':'')});}
  if(a.act==='dsp-assign'){const rv=ccDspReviewers(d);return bgModal('Assign Reviewer · '+ccE(expKey(d)),'Only the reviewer is told; the dispute is never sent to every Finance user.','<div class="ep-form-grid">'+ccField('Reviewer',true,apCS('dspx-user',rv.map(caN),f.user||'','Select'))+'</div>',{close:close,btns:btn('Assign')});}
  if(a.act==='dsp-info')return bgModal('Request Information · '+ccE(expKey(d)),'The cardholder is asked through My Cards and the notification bell.','<div class="ep-form-grid">'+area('Information Needed','What the cardholder must provide')+'</div>',{close:close,btns:btn('Send Request')});
  if(a.act==='dsp-note')return bgModal('Internal Note · '+ccE(expKey(d)),'Finance only; never shown to the cardholder.','<div class="ep-form-grid">'+area('Note')+'</div>',{close:close,btns:btn('Save Note')});
  if(a.act==='dsp-review')return bgModal('Complete Review · '+ccE(expKey(d)),'The dispute moves to Awaiting Provider. Nothing is raised with the provider until its case is recorded with evidence.','<div class="ep-form-grid">'+area('Review Conclusion')+'</div>',{close:close,btns:btn('Complete Review')});
  if(a.act==='dsp-provider')return bgModal((d.demo?'Record Illustrative Submission':'Record Provider Case')+' · '+ccE(expKey(d)),d.demo?'Illustrative: no provider is contacted.':'Record the case Finance raised with the provider: its reference and the evidence (acknowledgement, portal screen or email). Someone independent verifies it; without them the dispute stays Awaiting Provider.',
    d.demo?'':'<div class="ep-form-grid">'+ccField('Provider Case Reference',true,ccInput('ccmx-ref',f.ref||'','As given by the provider'))+ccField('Raised On',true,apCD('ccmx-date',f.date||wbToday(),'Select date'))+file('Submission Evidence')+'</div>',{close:close,btns:btn(d.demo?'Record':'Record Case')});
  if(a.act==='dsp-verify'){const x=a.what==='outcome'?d.outcome:d.provider;if(!x)return '';
    return bgModal('Verify Provider '+(a.what==='outcome'?'Outcome':'Case')+' · '+ccE(expKey(d)),a.what==='outcome'?'Check the decision '+ccE(x.ref)+' ('+ccE(x.result)+(x.amount?', '+ccE(expMoney(x.amount,d.currency)):'')+') against '+ccE(x.evidence)+', recorded by '+ccE(caN(x.by))+'.':'Check case '+ccE(x.caseRef)+' against '+ccE(x.evidence)+', recorded by '+ccE(caN(x.by))+'.',
      '<div class="ep-form-grid">'+area('Remarks','Required to reject',false)+'</div>',{close:close,btns:'<button class="btn-outline" onclick="ccDspSave(\'Reject\')">Reject</button>'+btn('Verify','ccDspSave(\'Verify\')')});}
  if(a.act==='dsp-provevent')return bgModal('Provider Update · '+ccE(expKey(d)),'A request from the provider or its response; the evidence is kept.','<div class="ep-form-grid">'+ccField('Type',true,apCS('dspx-ptype',['Provider Request','Provider Response'],f.ptype||'Provider Response','Select'))+area('Details')+file('Provider Message')+'</div>',{close:close,btns:btn('Record')});
  if(a.act==='dsp-outcome'){const r=f.result||'';
    return bgModal((d.demo?'Record Illustrative Outcome':'Record Provider Outcome')+' · '+ccE(expKey(d)),d.demo?'Illustrative outcome, labelled as such.':'The provider\'s decision, from its decision reference and evidence. Someone independent verifies it. A favourable outcome is not money: the dispute stays Financial Settlement Pending until verified credits cover it.',
      '<div class="ep-form-grid">'+ccField('Outcome',true,apCS('dspx-result',DSP_OUTCOMES,r,'Select','ccRecHook'))+(r&&r!=='Resolved Against'?ccField('Amount in the Cardholder\'s Favour',true,'<div class="ax-currency"><span>'+ccE(d.currency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" min="0" step="0.01" value="'+attrSafe(f.amount!=null?f.amount:d.amount)+'"></div>','At most the disputed '+ccE(expMoney(d.amount,d.currency))+'.'):'')
        +(d.demo?'':ccField('Decision Reference',true,ccInput('ccmx-ref',f.ref||'','Provider decision reference'))+file('Decision Evidence'))+'</div>',{close:close,btns:btn('Record Outcome')});}
  if(a.act==='dsp-credit'){const cs=ccDspCreditCands(d);
    return bgModal('Link Credit · '+ccE(expKey(d)),'A verified refund, reversal or dispute credit of '+ccE(d.txnKey)+' (recorded and verified in the transaction panel). It settles the dispute'+(d.csx?' and the dispute credit expected on '+ccE(d.csx.key):'')+' once; nothing is posted by linking.',
      '<div class="ep-form-grid">'+ccField('Credit',true,cs.length?apCS('dspx-credit',cs.map(function(c){return expKey(c)+' · '+c.type+' · '+expMoney(c.billAmount-ccDspCreditLinked(c),c.billCurrency)+' free · '+ccTxnVerifyLabel(c);}),f.credit||'','Select credit'):'<span class="wb-muted">No verified credit of the transaction yet.</span>')
        +ccField('Amount',false,'<div class="ax-currency"><span>'+ccE(d.currency)+'</span><input class="ep-form-input" id="ccmx-amount" type="number" min="0" step="0.01" value="'+attrSafe(f.amount||'')+'"></div>','Empty: as much as is still to settle.')+'</div>',{close:close,btns:cs.length?btn('Link Credit'):''});}
  if(a.act==='dsp-supp')return bgModal('Supplementary Correction · '+ccE(expKey(d)),ccE(d.txnKey)+' was reconciled in '+ccE(expKey(ccDspClosedStmt(d)||{}))+', which is closed and is not rewritten. The credit is recorded as a supplementary correction and verified by someone independent.','<div class="ep-form-grid">'+file('Provider Evidence')+'</div>',{close:close,btns:btn('Record Correction')});
  if(a.act==='dsp-close')return bgModal('Close Dispute · '+ccE(expKey(d)),d.outcome.result==='Resolved Against'?'Resolved against the cardholder: no refund, no automatic recovery. Any company-side exception follows its own authorized process.':(d.demo?'Settled by '+CC_DEMO.toLowerCase()+' credits (':'Settled by verified credits (')+ccE(expMoney(d.settlement.settled||0,d.currency))+').','<div class="ep-form-grid">'+area('Closing Note')+'</div>',{close:close,btns:btn('Close')});
  if(a.act==='dsp-withdraw')return bgModal('Withdraw Dispute · '+ccE(expKey(d)),d.status==='Raised with Provider'?'The case is with the provider: attach its confirmation that the case was withdrawn there.':'The dispute ends here; its history is kept.','<div class="ep-form-grid">'+area('Reason')+(d.status==='Raised with Provider'?file('Provider Withdrawal Confirmation'):'')+'</div>',{close:close,btns:btn('Withdraw')});
  return '';
}
function ccDspSave(decision){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f;let err='',ok='',d=a.id?ccDsp(a.id):null;
  if(a.act==='dsp-raise'){const r=ccDspCreate({txnId:a.txnId,reason:f.dreason,description:f.reason,amount:f.amount,evidence:f.evidence,submit:decision==='submit'});err=r.error||'';d=r.rec;ok=r.rec?expKey(r.rec)+(decision==='submit'?' submitted for Finance review':' saved as draft'):'';}
  else if(a.act==='dsp-view'){if(decision==='respond'){err=ccDspRespond(d.id,{note:f.reason,file:f.evidence});ok='Sent to Finance';}else if(decision==='submitdraft'){err=ccDspSubmit(d.id);ok='Dispute submitted';}}
  else if(a.act==='dsp-assign'){const u=ccDspReviewers(d).find(function(x){return caN(x)===f.user;});err=u?ccDspAssign(d.id,u):'Pick the reviewer.';ok='Reviewer assigned';}
  else if(a.act==='dsp-info'){err=ccDspRequestInfo(d.id,f.reason);ok='Information requested';}
  else if(a.act==='dsp-note'){err=ccDspNote(d.id,f.reason);ok='Note saved';}
  else if(a.act==='dsp-review'){err=ccDspReadyForProvider(d.id,f.reason);ok='Review completed';}
  else if(a.act==='dsp-provider'){err=ccDspProviderSubmit(d.id,{caseRef:f.ref,date:f.date||wbToday(),evidence:f.evidence});ok=d.demo?'Illustrative submission recorded':'Provider case recorded for verification';}
  else if(a.act==='dsp-verify'){err=ccDspVerify(d.id,a.what,decision,f.reason);ok='Evidence '+(decision==='Reject'?'rejected':'verified');}
  else if(a.act==='dsp-provevent'){err=ccDspProviderEvent(d.id,{type:f.ptype,text:f.reason,evidence:f.evidence});ok='Provider update recorded';}
  else if(a.act==='dsp-outcome'){err=ccDspOutcome(d.id,{result:f.result,amount:f.amount,ref:f.ref,evidence:f.evidence});ok=d.demo?'Illustrative outcome recorded':'Outcome recorded for verification';}
  else if(a.act==='dsp-credit'){const c=ccDspCreditCands(d).find(function(x){return String(f.credit||'').indexOf(expKey(x)+' ')===0;});err=c?ccDspLinkCredit(d.id,c.id,f.amount):'Pick the credit.';ok='Credit linked';}
  else if(a.act==='dsp-supp'){err=ccDspRecordSupplement(d.id,{evidence:f.evidence});ok='Supplementary correction recorded';}
  else if(a.act==='dsp-close'){err=ccDspClose(d.id,f.reason);ok='Dispute closed';}
  else if(a.act==='dsp-withdraw'){err=ccDspWithdraw(d.id,f.reason,undefined,{evidence:f.evidence});ok='Dispute withdrawn';}
  if(err){showToast('Not saved','error',err);return;}
  ccMxAct=null;renderADTPage();showToast(ok,'success',d?expKey(d):'');
}
/* Raise Dispute: the cardholder's My Cards transactions and the Transaction Detail panel (on behalf). */
function ccDspMayRaise(t){
  if(!t||ccDspTxnWhyNot(t)||ccDspRemaining(t)<=0.009)return false;
  const own=idUserOfEmp(t.employeeEid)===idMe();return own?ccCan('card.dispute.raise'):ccCan('card.dispute.manage');
}
const ccTxnExpenseCellBase8G=ccTxnExpenseCell;
ccTxnExpenseCell=function(t){
  let h=ccTxnExpenseCellBase8G(t);const ds=ccDspOfTxn(t,true).filter(function(d){return d.status!=='Withdrawn';});
  if(ds.length)h+='<div class="ax-sub">'+ds.map(function(d){return '<button class="att-link" onclick="ccOpenDisputeUI('+d.id+')">'+ccE(expKey(d))+'</button> '+ccE(d.status);}).join(' · ')+'</div>';
  if(idUserOfEmp(t.employeeEid)===idMe()&&ccDspMayRaise(t))h+='<div><button class="att-link" onclick="ccMxOpen(\'dsp-raise\',{txnId:'+t.id+'})">Raise Dispute</button></div>';
  return h;
};
const ccTxnActionsBase8G=ccTxnActions;
ccTxnActions=function(t){let h=ccTxnActionsBase8G(t);if(idUserOfEmp(t.employeeEid)!==idMe()&&ccDspMayRaise(t))h+=ccBtn('Raise Dispute','ccMxOpen(\'dsp-raise\',{txnId:'+t.id+'})');return h;};
const ccTxnMoreFieldsHTMLBase8G=ccTxnMoreFieldsHTML;
ccTxnMoreFieldsHTML=function(t,full){
  let h=ccTxnMoreFieldsHTMLBase8G(t,full);const ds=t.direction==='Credit'?[]:ccDspOfTxn(t,true).filter(function(d){return d.status!=='Draft'||d.raisedBy===idMe();});
  if(ds.length)h+=axField(AX_ICO.fTicket,'Disputes',ds.map(function(d){return '<b>'+ccE(expKey(d))+'</b> <span class="ax-sub">'+ccE(d.reason+' · '+expMoney(d.amount,d.currency)+' · '+d.status+(d.assignee?' · reviewer '+caN(d.assignee):''))+'</span><div class="ax-sub" style="white-space:normal">'+ccE(d.description||'')+'</div>';}).join('<br>'),true);
  return h;
};
/* My Cards: what a dispute asks of the cardholder, and their disputes (also after the card was replaced or closed, FR-CT-20.20). */
ccHook('ccPendingActions',null,function(out,eid){
  if(!out)return undefined;const add=[];
  ccDisputes.forEach(function(d){if(d.employeeEid!==eid||d.entity!==ccEnt())return;
    if(d.status==='More Information Required')add.push({kind:'action',text:expKey(d)+' ('+d.merchant+'): Finance needs more information on your dispute.',rec:{id:d.id},open:'dsp'});
    else if(d.status==='Draft'&&d.raisedBy===idMe())add.push({kind:'action',text:expKey(d)+' ('+d.merchant+'): your dispute is a draft – submit or withdraw it.',rec:{id:d.id},open:'dsp'});});
  /* Finance is waiting on the cardholder: ahead of the routine transaction reminders, after card and request items. */
  let at=out.findIndex(function(x){return x.open==='txn'||x.open==='exc';});if(at<0)at=out.length;
  out.splice.apply(out,[at,0].concat(add));
  return undefined;
});
ccHook('ccCardholderHTML',null,function(out,eid){
  if(!out)return undefined;const me=ccEmpOf(),own=!!me&&me.eid===eid;
  const ds=ccDisputes.filter(function(d){return d.employeeEid===eid&&d.entity===ccEnt()&&(own?d.status!=='Draft'||d.raisedBy===idMe():ccDspVisible(d));});
  let h='';
  if(ds.length)h+='<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">'+(own?'My Disputes':'Disputes')+' ('+ds.length+')</span></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Dispute</th><th>Transaction</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'
    +ds.map(function(d){const v=ccDspEmpView(d);return '<tr><td>'+ccE(v.ref)+'<div class="ax-sub">'+ccE(v.reason)+'</div></td><td>'+ccE(v.txnKey+' · '+v.merchant)+'<div class="ax-sub">'+ccE(v.card+' · '+cdLabel(v.txnDate))+'</div></td><td>'+ccE(expMoney(v.amount,v.currency))+'</td>'
      +'<td>'+axBadge(ccDspTone(v.status),v.status)+'<div class="ax-sub" style="white-space:normal">'+(['More Information Required','Draft'].indexOf(v.status)>=0?'Action needed – open the dispute':ccE([v.outcome!=='Pending'?v.outcome:'',v.settlement!=='—'?v.settlement:''].filter(Boolean).join(' · ')))+'</div></td><td><button class="att-link" onclick="ccOpenDisputeUI('+d.id+')">View</button></td></tr>';}).join('')+'</tbody></table></div>';
  return out+h;
});
/* ── FR-CT-21 (UAT-CT-089/090): balances never fabricated. Demo cards show an illustrative balance derived from demo records;
   genuine cards show the provider balance as Unavailable (not connected) and a statement-reported balance only from a
   verified single-card statement, with its source and as-of date. ── */
function ccDemoBalance(c,code){
  const dm=function(x){return x.demo&&x.cardId===c.id&&x.wallet===code;};
  const loads=ccM(ccLoads.filter(function(l){return l.cardId===c.id&&l.wallet===code&&l.exec&&l.exec.demo===true;}).reduce(function(s,l){return s+ccLoadNet(l);},0));
  const spent=ccM(ccTxns.filter(function(x){return dm(x)&&x.direction!=='Credit'&&x.status==='Posted';}).reduce(function(s,x){return s+x.billAmount;},0));
  const credits=ccM(ccTxns.filter(function(x){return dm(x)&&x.direction==='Credit'&&x.status==='Posted';}).reduce(function(s,x){return s+x.billAmount;},0));
  const holds=ccM(ccTxns.filter(function(x){return dm(x)&&x.direction!=='Credit'&&x.status==='Pending Authorization';}).reduce(function(s,x){return s+x.billAmount;},0));
  return {loads:loads,spent:spent,credits:credits,holds:holds,balance:ccM(loads-spent+credits)};
}
function ccStmtBalanceOf(c){
  const s=ccStmts.filter(function(x){return x.entity===c.entity&&x.scope==='Card'&&x.cardId===c.id&&x.importStatus==='Verified'&&!x.demo&&x.balances&&x.balances.closing!=null;}).sort(function(a,b){return a.periodTo<b.periodTo?1:-1;})[0];
  return s?{amount:s.balances.closing,asOf:s.periodTo,key:expKey(s),currency:s.currency}:null;
}
/* Shown to card administrators on the card record only. Build 7 (frozen) shows no balance in the cardholder's own views; whether
   a Demo cardholder sees their Demo Balance (FR-CT-21.12, US-CT-14) is a Product/BA decision for Build 8H. */
function ccCardBalanceInfo(c){
  const demo=ccCardEvidence(c)===CC_DEMO,p=ccProg(c.programmeId),out={demo:demo,provider:'Unavailable',providerNote:ccProviderName(c.provider)+' is not connected',wallets:[],statement:null};
  if(demo)ccWalletMap(p).forEach(function(w){const b=ccDemoBalance(c,w.code);if(b.loads||b.spent||b.credits||b.holds)out.wallets.push(Object.assign({code:w.code},b));});
  else out.statement=ccStmtBalanceOf(c);
  return out;
}
function ccCardBalanceHTML(c){
  const b=ccCardBalanceInfo(c),cur=c.currency;
  return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Balance Information</span></div>'
    +'<div class="wb-note"><div class="wb-note-sub">ADT never computes a real card balance from its loads and transactions. '+(b.demo?'This is an illustrative card: its figure is derived from illustrative activity only and never touches company funding.':'Only a provider-reported or statement-reported figure is shown, with its source.')+'</div></div>'
    +'<div class="lp-sb-detail-grid">'
    +(b.demo?(b.wallets.length?b.wallets.map(function(w){return axField(AX_ICO.fCash,CC_DEMO+' Balance · '+wbTypeName(w.code),'<b>'+ccE(expMoney(w.balance,cur))+'</b> <span class="ax-sub" style="white-space:normal">'+ccE('loads '+expMoney(w.loads,cur)+' − posted spending '+expMoney(w.spent,cur)+' + refunds '+expMoney(w.credits,cur)+(w.holds?'; pending holds '+expMoney(w.holds,cur)+' (not deducted)':''))+'</span>',true);}).join('')
        :axField(AX_ICO.fCash,CC_DEMO+' Balance','<span class="wb-muted">No illustrative activity yet</span>',true))
      :axField(AX_ICO.fCash,'Provider-Reported Balance','<span class="wb-muted">Unavailable</span> <span class="ax-sub">'+ccE(b.providerNote)+'</span>')
        +axField(AX_ICO.fCash,'Statement-Reported Balance',b.statement?ccE(expMoney(b.statement.amount,b.statement.currency))+' <span class="ax-sub">closing balance as of '+ccE(cdLabel(b.statement.asOf))+' · '+ccE(b.statement.key)+' · not a live balance</span>':'<span class="wb-muted">Not Reported</span>'))
    +'</div>';
}
/* Basic Details no longer carries Balance Information (product owner, 11 Nov 2026): each wallet's balance is in the card's
   Wallets tab. ccCardBalanceInfo stays for the statement and reconciliation checks. */

/* ── Reports (existing Corporate Cards Reports): disputes in the Card Exception Report, two summary cards ── */
ccHook('ccRepRows',null,function(out,id){
  if(!out||id!=='exceptions')return undefined;
  ccDisputes.filter(function(d){return d.entity===ccEnt()&&ccDspVisible(d)&&d.status!=='Draft'&&ccSeesEmp(d.employeeEid);}).forEach(function(d){
    out.rows.push({rec:d,kind:'Transaction dispute',cur:d.currency,open:['dispute',d.id],f:Object.assign(ccRepEmpRow(d.employeeEid),{date:d.txnDate,cur:d.currency,lstatus:d.status}),
      v:{type:'Transaction dispute'+(d.demo?' ('+CC_DEMO+')':''),ref:expKey(d),date:d.txnDate,emp:ccRepEmpLabel(d.employeeEid),amount:d.amount,status:d.status,detail:d.txnKey+' · '+d.reason+(d.outcome?' · '+d.outcome.result:'')+(d.settlement.status!=='Not Applicable'?' · settlement '+d.settlement.status:'')}});});
  return undefined;
});
CC_REP_CARDS.push(['dspopen','Open Transaction Disputes','exceptions',function(x){return x.kind==='Transaction dispute'&&DSP_ACTIVE.indexOf(x.rec.status)>=0;},function(d){return d.amount;}],
  ['dspsettle','Disputes – Settlement Pending','exceptions',function(x){return x.kind==='Transaction dispute'&&x.rec.status==='Financial Settlement Pending';},function(d){return ccM(d.outcome?d.outcome.amount-(d.settlement.settled||0):0);}]);
ccHook('ccRepOpen',function(i){const x=ccRepFiltered().rows[i];if(x&&x.open&&x.open[0]==='dispute'){ccOpenDisputeUI(x.open[1]);return true;}return undefined;},null);

/* ── Build 8F decisions: financial adjustments (RCA) in the Reconciliation tab; outstanding ones on the statement list ── */
function ccRecAdjTone(st){return {'Awaiting Approval':'wait','Approved – Processing Pending':'wait','Pending – Closed Period Adjustment':'wait','Completed – Linked Financial Entry':'ok','Recorded – No Financial Impact':'ok','Rejected':'bad','Cancelled':'idle'}[st]||statusTone(st);}
function ccRecAdjsHTML(s){
  const L=ccRecAdjsOf(s);if(!L.length)return '';const A=ccNow();
  return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Financial Adjustments ('+L.length+')</span></div>'
    +'<div class="wb-note"><div class="wb-note-sub">Reconciliation never posts. An adjustment is completed only by linking the entry its own workflow produced.</div></div>'
    +'<div class="sb-hist-wrap"><table class="ax-hist sb-hist cc-holder-table"><thead><tr><th>Adjustment</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>'
    +L.map(function(a){const acts=[];
      if(a.status==='Approved – Processing Pending'&&ccCan('card.transaction.match'))acts.push('<button class="att-link" onclick="ccMxOpen(\'rc-adjlink\',{sid:'+s.id+',ref:\''+a.ref+'\'})">Link Financial Entry</button>');
      if(['Awaiting Approval','Approved – Processing Pending'].indexOf(a.status)>=0&&ccCan('card.transaction.match')&&!(s.recon&&s.recon.status==='Ready for Sign-Off'))acts.push('<button class="att-link" onclick="ccMxOpen(\'rc-adjcancel\',{sid:'+s.id+',ref:\''+a.ref+'\'})">Cancel</button>');
      return '<tr><td><b>'+ccE(a.ref)+'</b><div class="ax-sub">'+ccE(a.itemId+' · '+expMoney(a.amount,a.currency))+'</div></td><td><div class="lp-c-plain" style="white-space:normal">'+ccE(a.type)+'</div><div class="ax-sub" style="white-space:normal">'+ccE(a.reason)+'</div></td>'
        +'<td>'+axBadge(ccRecAdjTone(a.status),a.status)+'<div class="ax-sub" style="white-space:normal">'+ccE(a.link?a.link.label+' · posting '+a.link.refs.join(', '):a.assignException?'no eligible approver yet':'')+'</div></td><td>'+acts.join('')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
const ccRecTabHTMLBase8G=ccRecTabHTML;
ccRecTabHTML=function(s){
  let h=ccRecTabHTMLBase8G(s);const R=s.recon;
  if(R&&R.assignException&&typeof wsOpenTemplate==='function'&&typeof emsRole==='function'&&emsRole()==='Super Admin'){const tp=(typeof rbacTemplatesData!=='undefined'?rbacTemplatesData:[]).find(function(x){return x.name==='Funding Verifier';});
    if(tp)h=h.replace('<b>Assignment exception</b>','<b>Assignment exception</b> <button class="att-link" onclick="wsOpenTemplate('+tp.id+')">Open the Funding Verifier template</button>');}
  return h+(R?ccRecAdjsHTML(s):'');
};
function ccRecAdjPopupHTML(a){
  const s=ccStmt(a.sid),x=ccRecAdj(a.ref);if(!s||!x)return '';const f=a.f,close='ccMxClose()';
  if(a.act==='rc-adjlink'){const cs=ccRecAdjCands(x);
    return bgModal('Link Financial Entry · '+ccE(x.ref),ccE(x.type)+' of '+ccE(expMoney(x.amount,x.currency))+' ('+ccE(x.itemId)+'). '+ccE(RCA_HINT[x.type]||'')+' Each entry completes one adjustment only.',
      '<div class="ep-form-grid">'+ccField('Financial Entry',true,cs.length?apCS('rcmx-entry',cs.map(function(c){return c.label;}),f.entry||'','Select entry'):'<span class="wb-muted">Nothing produced by the existing workflow yet. Process it there first (Funding, Allocate Credit or the CSX acceptance route).</span>')+'</div>',
      {close:close,btns:cs.length?'<button class="ep-save-btn" onclick="ccRecAdjSave()">Link</button>':''});}
  if(a.act==='rc-adjcancel')return bgModal('Cancel Adjustment · '+ccE(x.ref),'Nothing was posted; the exception returns to Open while the reconciliation is open.','<div class="ep-form-grid">'+ccField('Reason',true,ccArea('ccmx-reason',f.reason||'',''),'',true)+'</div>',{close:close,btns:'<button class="ep-save-btn" onclick="ccRecAdjSave()">Cancel Adjustment</button>'});
  return '';
}
function ccRecAdjSave(){
  ccMxSync();const a=ccMxAct;if(!a)return;const f=a.f,x=ccRecAdj(a.ref);let err='',ok='';
  if(a.act==='rc-adjlink'){const c=ccRecAdjCands(x).find(function(y){return y.label===f.entry;});err=c?ccRecAdjLink(x.ref,{kind:c.kind,id:c.id,n:c.n}):'Pick the entry.';ok=x.ref+' '+(x.status||'');}
  else{err=ccRecAdjCancel(x.ref,f.reason);ok=x.ref+' cancelled';}
  if(err){showToast('Not saved','error',err);return;}ccMxAct=null;ccStmtTab='recon';renderADTPage();showToast(ok,'success');
}

const ccMxHTMLBase8G=ccMxHTML;
ccMxHTML=function(){
  const a=ccMxAct;if(!a)return '';
  if(String(a.act).indexOf('dsp-')===0)return ccDspPopupHTML(a);
  if(a.act==='rc-adjlink'||a.act==='rc-adjcancel')return ccRecAdjPopupHTML(a);
  return ccMxHTMLBase8G();
};
const ccMxSyncBase8G=ccMxSync;
ccMxSync=function(){
  ccMxSyncBase8G();const a=ccMxAct;if(!a)return;let v;
  if(String(a.act).indexOf('dsp-')===0){[['dreason','dspx-reason'],['user','dspx-user'],['ptype','dspx-ptype'],['result','dspx-result'],['credit','dspx-credit']].forEach(function(p){if(document.getElementById('csw-'+p[1]))a.f[p[0]]=getCSValue(p[1]);});
    if((v=ccVal('ccmx-amount'))!=null)a.f.amount=v;if((v=ccVal('ccmx-ref'))!=null)a.f.ref=v;if((v=bgVal('ccmx-date'))!=null)a.f.date=v;}
  if(a.act==='rc-adjlink'&&document.getElementById('csw-rcmx-entry'))a.f.entry=getCSValue('rcmx-entry');
  if(a.act==='rc-item'&&document.getElementById('csw-rcmx-adjtype'))a.f.adjtype=getCSValue('rcmx-adjtype');
};

/* The settlement as one phrase: a settled dispute still waiting for its closure says so. */
function ccDspSettleText(d){
  const st=d.settlement.status;if(!st||st==='Not Applicable')return '';
  return st==='Settled'&&d.status==='Financial Settlement Pending'?'Settled – ready to close':st;
}
/* A closed reconciliation keeps the item as it was at sign-off; the row adds what became of its adjustment since then. */
function ccRecAdjLater(it){
  const ref=it&&(it.adjRef||(it.adj&&it.adj.ref)),a=ref?ccRecAdj(ref):null;if(!a||it.status!==RCX_FINPEND||a.status==='Approved – Processing Pending')return '';
  return 'Since closure: '+a.ref+' '+a.status+(a.link&&a.link.refs&&a.link.refs.length?' (posting '+a.link.refs.join(', ')+')':'');
}

/* ── Build 8H (FR-CT-23): nine transaction reports in the existing Reports picker ──
   Same page, filters, drill-down, CSV/XLSX/print exports and export audit as the 14 card reports. Every figure comes
   from the records themselves; each row keeps the scope of the record it lists (transaction, claim, statement,
   dispute or card-spend exception visibility). Debits, credits, net spending and matched amounts are separate
   columns; verified, awaiting-verification and illustrative activity are counted apart; card numbers are masked and
   company funding sources are shown only to people with funding rights. */
CC_REPORTS.push(['txns','Card Transaction Register'],['twe','Transactions Without Expense'],['ewt','Expenses Without Matching Transaction'],
  ['mexc','Transaction Matching Exceptions'],['recon','Statement Reconciliation'],['refunds','Refunds & Reversals'],['disputes','Dispute Register'],
  ['csxres','Card Spend Resolution'],['walletact','Wallet Activity']);
const CC_REP_8H={
  txns:function(){return ccTxnAdminView();},twe:function(){return ccTxnAdminView();},refunds:function(){return ccTxnAdminView();},
  ewt:function(){return ccMatchQueueVisible();},mexc:function(){return ccMatchQueueVisible();},
  recon:function(){return CCS_PERMS.some(ccCan);},
  disputes:function(){return ccCan('card.dispute.manage')||ccCan('card.dispute.view');},
  csxres:function(){return ccCan('card.csx.resolve')||ccFundingVisible()||ccCan('expense.reimb.process');},
  /* Wallet activity covers benefit wallets (personal spending): company-wide transaction rights only (FR-CT-24.05). */
  walletact:function(){return ccCan('card.transaction.view.all');}};
ccHook('ccRepOk',function(id){if(!CC_REP_8H[id])return undefined;return ccCan('card.report.view')&&!!CC_REP_8H[id]();},null);
CC_REP_FILTERS.push(['cardf','ccr-cardf','All Cards'],['merch','ccr-merch','All Merchants'],['tstatus','ccr-tstatus','All Statuses'],['esrc','ccr-esrc','All Sources'],['excat','ccr-excat','All Exception Categories']);
ccHook('ccRepBlank',null,function(out){return Object.assign(out,{cardf:'',merch:'',tstatus:'',esrc:'',excat:''});});
ccRF=ccRepBlank();
const CC_TWE_STATES=['Unclaimed','Due','Due Soon','Overdue','Late Data'];
/* Evidence basis of a transaction, as one filterable value. */
function ccEv8H(t){if(t.demo)return CC_DEMO;const s=(t.verify||{}).status;return s===CCT_VERIFIED?'Verified':s===CCT_REJECTED?'Rejected':'Awaiting Verification';}
function ccCardRef8H(ref){return ref&&ref.last4?ccMask(ref.last4)+' · '+ref.key:'';}
function ccTwe8H(t){if(t.direction==='Credit'||t.walletClass==='Flexi Benefit')return null;const s=ccTxnClaimDue(t);return s&&CC_TWE_STATES.indexOf(s.state)>=0?s:null;}
function ccDspActive8H(t){return ccDisputes.filter(function(d){return d.txnId===t.id&&DSP_ACTIVE.indexOf(d.status)>=0&&ccDspVisible(d);});}
/* Per-currency sums as text ('₹1,000.00 · $20.00'), for the totals line. */
function ccSumOr8H(rows,f){const by={};rows.forEach(function(x){const a=f(x);if(!(a>0||a<0))return;by[x.cur]=ccM((by[x.cur]||0)+a);});const k=Object.keys(by).sort();return k.length?k.map(function(c){return expMoney(by[c],c);}).join(' · '):'none';}
ccHook('ccRepRows',null,function(out,id){
  if(!out||!CC_REP_8H[id])return undefined;
  const ent=ccEnt(),fin=ccFundingVisible(),C=function(k,l,t){return [k,l,t||''];},rows=[];let cols=[],note='';
  if(id==='txns'){
    cols=[C('txn','Transaction'),C('date','Date','d'),C('post','Posted','d'),C('card','Card'),C('emp','Cardholder'),C('dept','Department'),C('prog','Programme'),C('wallet','Wallet'),C('merch','Merchant'),
      C('type','Type'),C('status','Status'),C('orig','Original Amount'),C('debit','Debit','m'),C('credit','Credit','m'),C('net','Net Spending','m'),C('matched','Matched'),C('mstatus','Matching'),C('recon','Reconciliation'),C('src','Source'),C('ver','Verification'),C('dsp','Disputes')];
    ccTxns.filter(function(t){return t.entity===ent&&ccTxnVisible(t);}).forEach(function(t){
      const cr=t.direction==='Credit',post=t.status==='Posted',ev=ccEv8H(t);
      rows.push({rec:t,cur:t.billCurrency,open:['txn',t.id],
        f:Object.assign(ccRepEmpRow(t.employeeEid),{prog:ccRepProg(t.programmeId),wallet:wbTypeName(t.wallet),cardf:ccCardRef8H(t.cardRef),merch:t.merchant,tstatus:t.status,esrc:ev,type:t.direction,cur:t.billCurrency,date:t.date}),
        v:{txn:expKey(t),date:t.date,post:t.postDate||'',card:ccCardRef8H(t.cardRef),emp:ccRepEmpLabel(t.employeeEid),dept:ccRepDept(t.employeeEid),prog:ccRepProg(t.programmeId),wallet:wbTypeName(t.wallet)+(t.walletClass?' · '+t.walletClass:''),
          merch:t.merchant,type:t.direction+' · '+t.type,status:t.status,orig:t.currency!==t.billCurrency?expMoney(t.amount,t.currency):'',
          debit:cr?'':t.billAmount,credit:cr?t.billAmount:'',net:!cr&&post&&ev!=='Rejected'?ccTxnNetSpend(t):'',
          matched:t.matchedAmount>0?expMoney(t.matchedAmount,t.matchCurrency):'',mstatus:t.matchStatus||'',recon:t.reconStatus||'',src:ccTxnSourceLabel(t),ver:ccTxnVerifyLabel(t),
          dsp:ccDspOfTxn(t).filter(ccDspVisible).map(function(d){return expKey(d)+' '+d.status;}).join(', '),bucket:ev,posted:post,credit8:cr}});});
  }else if(id==='twe'){
    cols=[C('txn','Transaction'),C('date','Date','d'),C('card','Card'),C('emp','Cardholder'),C('dept','Department'),C('merch','Merchant'),C('wallet','Wallet'),C('amount','Amount to Claim','m'),
      C('state','Claim Status'),C('due','Due Date','d'),C('over','Days Overdue'),C('src','Source'),C('detail','Detail')];
    ccTxns.filter(function(t){return t.entity===ent&&ccTxnVisible(t);}).forEach(function(t){
      const s=ccTwe8H(t);if(!s)return;const net=ccM(t.amount-ccTxnCreditedOrig(t,{verified:true}));
      rows.push({rec:t,cur:t.currency,open:['txn',t.id],
        f:Object.assign(ccRepEmpRow(t.employeeEid),{prog:ccRepProg(t.programmeId),wallet:wbTypeName(t.wallet),cardf:ccCardRef8H(t.cardRef),merch:t.merchant,tstatus:s.state,esrc:ccEv8H(t),cur:t.currency,date:t.date}),
        v:{txn:expKey(t),date:t.date,card:ccCardRef8H(t.cardRef),emp:ccRepEmpLabel(t.employeeEid),dept:ccRepDept(t.employeeEid),merch:t.merchant,wallet:wbTypeName(t.wallet),amount:net,
          state:s.state,due:s.due||'',over:s.state==='Overdue'&&s.overdue?s.overdue:'',src:ccTxnSourceLabel(t),detail:s.text||'',bucket:ccEv8H(t)}});});
  }else if(id==='ewt'||id==='mexc'){
    if(id==='ewt'){
      cols=[C('claim','Claim'),C('line','Line'),C('date','Line Date','d'),C('emp','Employee'),C('dept','Department'),C('card','Card'),C('category','Expense Category'),C('amount','Card-Funded Amount','m'),C('cstatus','Claim Status'),C('mstatus','Matching'),C('detail','Detail')];
      const me=ccEmpOf(),all=ccMatchQueueVisible();
      ccClaimsOf(ent).forEach(function(r){
        if(CCM_SUBMITTED.indexOf(r.status)<0||(!all&&!(me&&me.eid===r.employeeEid)))return;
        ccCardLines(r).forEach(function(l){const i=ccLineMatchInfo(r,l);if(!i||i.status!=='Awaiting Transaction Evidence')return;const c=ccCard(l.cardId);
          rows.push({rec:r,cur:r.currency,open:['claim',r.id],f:Object.assign(ccRepEmpRow(r.employeeEid),{cardf:c?ccRepCard(c):'',tstatus:r.status,excat:i.category||i.status,cur:r.currency,date:l.start||''}),
            v:{claim:expKey(r),line:ccLineRef(r,l)+' · '+l.title,date:l.start||'',emp:ccRepEmpLabel(r.employeeEid),dept:ccRepDept(r.employeeEid),card:c?ccRepCard(c):'',category:r.category||'',amount:ccLineCardAmt(l),
              cstatus:r.status,mstatus:i.status,detail:i.text}});});});
    }else{
      cols=[C('group','Exception Category'),C('kind','Detail Category'),C('ref','Reference'),C('date','Date','d'),C('emp','Employee'),C('card','Card'),C('amount','Amount','m'),C('unmatched','Unmatched','m'),C('status','Status'),C('src','Source'),C('detail','Detail')];
      const keep=[CCX_GROUPS[2],CCX_GROUPS[3],CCX_GROUPS[4],CCX_GROUPS[6],CCX_GROUPS[7],CCX_GROUPS[8]];
      ccCardExceptions(ent).forEach(function(x){
        if(keep.indexOf(x.group)<0)return;const t=x.t||(x.info&&x.info.txn)||null,c=t?ccCard(t.cardId):x.l?ccCard(x.l.cardId):null;
        const ref=x.kind==='line'?expKey(x.r)+' · '+ccLineRef(x.r,x.l)+(t?' ↔ '+expKey(t):''):t?expKey(t):'';
        const date=x.kind==='line'?(x.l.start||''):t?t.date:'';
        rows.push({rec:x.kind==='line'?x.r:t,cur:x.currency||'',open:x.kind==='line'?['claim',x.r.id]:t?['txn',t.id]:null,
          f:Object.assign(ccRepEmpRow(x.eid),{cardf:c?ccRepCard(c):'',tstatus:(x.info&&x.info.status)||'',excat:x.group,esrc:t?ccEv8H(t):'',cur:x.currency||'',date:date}),
          v:{group:x.group,kind:x.category||(x.info&&x.info.status)||'',ref:ref,date:date,emp:ccRepEmpLabel(x.eid),card:c?ccRepCard(c):'',amount:x.kind==='line'?x.amount:'',
            unmatched:x.group===CCX_GROUPS[2]?x.amount:'',status:(x.info&&x.info.status)||'',src:t?ccTxnSourceLabel(t):'',detail:x.text||(x.info&&x.info.text)||''}});});
    }
  }else if(id==='recon'){
    cols=[C('stmt','Statement'),C('source','Source'),C('prog','Programme'),C('scope','Scope'),C('from','Period From','d'),C('to','Period To','d'),C('ver','Verification'),C('rows','Rows'),C('matched','Matched'),C('unmatched','Unmatched'),
      C('open','Open Exceptions'),C('carried','Carried Forward'),C('sdebit','Statement Debits','m'),C('scredit','Statement Credits','m'),C('snet','Statement Net','m'),C('variance','Unexplained Variance','m'),
      C('opening','Opening Balance (reported)','m'),C('closing','Closing Balance (reported)','m'),C('recon','Reconciliation'),C('signed','Signed Off By'),C('signedOn','Signed Off','d')];
    ccStmts.filter(function(s){return s.entity===ent&&ccStmtVisible(s)&&s.importStatus!=='Discarded';}).forEach(function(s){
      const m=s.recon?ccRecSummary(s):null,v=s.verify||{},R=s.recon||{};let dr=0,cr=0;
      s.rows.forEach(function(row){if(!row.parsed||row.excluded||(row.result&&['Duplicate','Excluded','Invalid'].indexOf(row.result.status)>=0))return;const sd=ccRecRowSide(s,row);if(sd.currency!==s.currency)return;if(sd.amount<0)cr+=-sd.amount;else dr+=sd.amount;});
      const so=R.signoff||null,rst=R.status||'Not Started',src=s.demo?CC_DEMO:'Provider statement';
      rows.push({rec:s,cur:s.currency,open:['stmt',s.id],f:{prog:ccRepProg(s.programmeId),tstatus:rst,esrc:src,cur:s.currency,date:s.periodTo},
        v:{stmt:expKey(s)+' · '+s.sourceRef,source:src,prog:ccRepProg(s.programmeId),scope:ccStmtScopeText(s),from:s.periodFrom,to:s.periodTo,
          ver:s.importStatus+(v.status==='Verified'&&v.by?' · '+caN(v.by):''),rows:s.rows.length,matched:m?m.matched:'',unmatched:m?m.unmatched:'',open:m?m.open:'',carried:m?m.carried:'',
          sdebit:ccM(dr),scredit:ccM(cr),snet:ccM(dr-cr),variance:m?m.variance:'',opening:s.balances&&s.balances.opening!=null?s.balances.opening:'',closing:s.balances&&s.balances.closing!=null?s.balances.closing:'',
          recon:rst,signed:so?caN(so.selected)+(so.switched?' (actual user '+caN(so.actual)+')':''):'',signedOn:so?ccIsoOfLabel(so.at):'',bucket:s.demo?CC_DEMO:'Verified'}});});
  }else if(id==='refunds'){
    cols=[C('cr','Credit'),C('date','Date','d'),C('type','Type'),C('orig','Original Transaction'),C('card','Card'),C('emp','Cardholder'),C('merch','Merchant'),C('oamt','Original Amount','m'),C('amount','Credited','m'),
      C('total','Total Credited (verified)','m'),C('net','Net Spending','m'),C('ver','Verification'),C('proc','Refund Processing'),C('dest','Returned To'),C('alloc','Business Allocation'),C('dsp','Dispute')];
    ccTxns.filter(function(t){return t.entity===ent&&t.direction==='Credit'&&ccTxnVisible(t);}).forEach(function(c){
      const o=c.refundOf&&c.refundOf.id?ccTxn(c.refundOf.id):null,rf=c.refund||{},ev=ccEv8H(c);
      const dest=rf.dest==='Company Funding Source'?(fin?'Company funding source '+(rf.sourceKey||'')+(rf.fundingKey?' · entry '+rf.fundingKey:''):'Company funding source'):rf.dest||'Card wallet';
      const dsp=ccDisputes.filter(function(d){return ccDspVisible(d)&&(d.settlement.credits||[]).some(function(x){return x.txnId===c.id;});}).map(expKey);
      rows.push({rec:c,cur:c.billCurrency,open:['txn',c.id],
        f:Object.assign(ccRepEmpRow(c.employeeEid),{prog:ccRepProg(c.programmeId),wallet:wbTypeName(c.wallet),cardf:ccCardRef8H(c.cardRef),merch:c.merchant,type:c.type,tstatus:ccTxnVerifyLabel(c),esrc:ev,cur:c.billCurrency,date:c.date}),
        v:{cr:expKey(c),date:c.date,type:c.type,orig:o?expKey(o)+' · '+cdLabel(o.date):(c.refundOf&&c.refundOf.ref?'Not identified (reference '+c.refundOf.ref+')':'Not identified'),card:ccCardRef8H(c.cardRef),emp:ccRepEmpLabel(c.employeeEid),merch:c.merchant,
          oamt:o&&o.billCurrency===c.billCurrency?o.billAmount:'',amount:c.billAmount,total:o&&o.billCurrency===c.billCurrency?ccTxnCredited(o,{verified:true}):'',net:o&&o.billCurrency===c.billCurrency?ccTxnNetSpend(o):'',
          ver:ccTxnVerifyLabel(c),proc:rf.processing||'',dest:dest,alloc:c.alloc?c.alloc.status||'':'',dsp:[rf.disputeRef].concat(dsp).filter(Boolean).join(', '),bucket:ev}});});
  }else if(id==='disputes'){
    cols=[C('dsp','Dispute'),C('raised','Raised','d'),C('txn','Transaction'),C('tdate','Transaction Date','d'),C('card','Card'),C('emp','Cardholder'),C('merch','Merchant'),C('reason','Reason'),C('amount','Disputed','m'),
      C('status','Internal Status'),C('assignee','Assigned To'),C('provider','Provider'),C('outcome','Provider Outcome'),C('settle','Settlement'),C('settled','Settled','m'),C('credits','Linked Credits'),C('src','Source')];
    ccDisputes.filter(function(d){return d.entity===ent&&d.status!=='Draft'&&ccDspVisible(d);}).forEach(function(d){
      const o=d.outcome,ov=o&&['Verified',CC_DEMO].indexOf((o.verify||{}).status)>=0,src=d.demo?CC_DEMO:'Recorded evidence';
      rows.push({rec:d,cur:d.currency,open:['dispute',d.id],
        f:Object.assign(ccRepEmpRow(d.employeeEid),{prog:ccRepProg(d.programmeId),cardf:ccCardRef8H(d.cardRef),merch:d.merchant,tstatus:d.status,excat:d.reason,esrc:src,cur:d.currency,date:d.txnDate}),
        v:{dsp:expKey(d),raised:ccIsoOfLabel(d.raisedAt),txn:d.txnKey,tdate:d.txnDate,card:ccCardRef8H(d.cardRef),emp:ccRepEmpLabel(d.employeeEid),merch:d.merchant,reason:d.reason,amount:d.amount,status:d.status,
          assignee:d.assignee?caN(d.assignee):'',provider:d.provider?(d.demo?CC_DEMO:'Raised with provider'+(d.provider.caseRef?' · case ref '+d.provider.caseRef:'')):'Not raised',
          outcome:o?o.result+(o.amount?' · '+expMoney(o.amount,d.currency):'')+(ov?'':' · being verified'):'',settle:ccDspSettleText(d)||'',settled:d.settlement.settled||'',
          credits:(d.settlement.credits||[]).map(function(x){const c=ccTxn(x.txnId);return (c?expKey(c):'')+' '+expMoney(x.amount,d.currency);}).join(', '),src:src,bucket:d.demo?CC_DEMO:'Verified'}});});
  }else if(id==='csxres'){
    cols=[C('csx','Card Spend Exception'),C('date','Date','d'),C('claim','Claim'),C('line','Line'),C('emp','Employee'),C('dept','Department'),C('card','Card'),C('paid','Card Paid','m'),C('approved','Approved (card)','m'),
      C('orig','Exception','m'),C('resolved','Resolved','m'),C('pending','In Progress','m'),C('outstanding','Outstanding','m'),C('status','Status'),C('outcomes','Outcomes'),C('res','Resolutions')];
    ccSpendExcs.filter(function(x){return x.entity===ent&&ccCsxVisible(x);}).forEach(function(x){
      const v=ccCsxAmounts(x),st=x.status+(typeof ccCsxPartial==='function'&&ccCsxPartial(x)?' · Partially Resolved':'');
      rows.push({rec:x,cur:x.currency,open:['csx',x.id],f:Object.assign(ccRepEmpRow(x.employeeEid),{cardf:x.cardRef?ccMask(x.cardRef.last4)+' · '+x.cardRef.key:'',tstatus:x.status,excat:(x.outcomes||[]).join(', ')||'No outcome yet',cur:x.currency,date:x.date}),
        v:{csx:expKey(x),date:x.date,claim:x.claimKey,line:x.lineTitle,emp:ccRepEmpLabel(x.employeeEid),dept:ccRepDept(x.employeeEid),card:x.cardRef?ccMask(x.cardRef.last4)+' · '+x.cardRef.key:'',
          paid:x.actualCard,approved:x.approvedCard,orig:v.original,resolved:v.resolved,pending:v.pending,outstanding:v.outstanding,status:st,outcomes:(x.outcomes||[]).join(', '),
          res:(x.resolutions||[]).map(function(r){return r.type+' '+r.status;}).join('; ')}});});
  }else if(id==='walletact'){
    cols=[C('card','Card'),C('emp','Cardholder'),C('dept','Department'),C('prog','Programme'),C('wallet','Wallet'),C('cls','Wallet Class'),C('src','Source'),C('loads','Loads Recorded','m'),C('purchases','Purchases','m'),
      C('credits','Credits','m'),C('net','Net Spending','m'),C('pendauth','Pending Authorizations','m'),C('alloc','Approved Allocation','m'),C('flag','Flag')];
    ccCards.filter(function(c){return c.entity===ent&&ccSeesEmp(c.employeeEid);}).forEach(function(c){
      const p=ccProg(c.programmeId);if(!p)return;
      ccWalletMap(p).forEach(function(w){[false,true].forEach(function(demo){
        const ld=ccM(ccLoads.filter(function(l){return l.cardId===c.id&&l.wallet===w.code&&l.exec&&!!l.exec.demo===demo;}).reduce(function(s,l){return s+ccLoadNet(l);},0));
        const tx=ccTxns.filter(function(t){return t.cardId===c.id&&t.wallet===w.code&&!!t.demo===demo;}),live=function(t){return t.status==='Posted'&&(t.demo||(t.verify||{}).status===CCT_VERIFIED);};
        const pu=ccM(tx.filter(function(t){return t.direction!=='Credit'&&live(t);}).reduce(function(s,t){return s+t.billAmount;},0)),cr=ccM(tx.filter(function(t){return t.direction==='Credit'&&live(t);}).reduce(function(s,t){return s+t.billAmount;},0));
        const pa=ccM(tx.filter(function(t){return t.status==='Pending Authorization'&&(t.demo||(t.verify||{}).status!==CCT_REJECTED);}).reduce(function(s,t){return s+t.billAmount;},0));
        let al=0;if(w.benefit&&!demo&&typeof wbBatches!=='undefined')wbBatches.forEach(function(b){if(b.entity!==c.entity||['Approved','Funded'].indexOf(b.status)<0)return;(b.rows||[]).forEach(function(r){if(r.eid===c.employeeEid&&r.walletType===w.code&&r.status!=='Cancelled')al+=Number(r.amount)||0;});});
        al=ccM(al);if(!(ld||pu||cr||pa||al))return;const net=ccM(pu-cr),flags=[];
        if(net>ld+0.009)flags.push('Spending above recorded loads');if(w.benefit&&al>0&&net>al+0.009)flags.push('Spending above approved allocation');
        const src=demo?CC_DEMO:'Verified records';
        rows.push({rec:c,cur:p.currency,open:['card',c.id],f:Object.assign(ccRepEmpRow(c.employeeEid),{prog:ccRepProg(p.id),wallet:w.name,cardf:ccRepCard(c),esrc:src,tstatus:flags.length?'Flagged':'No flag',cur:p.currency}),
          v:{card:ccRepCard(c),emp:ccRepEmpLabel(c.employeeEid),dept:ccRepDept(c.employeeEid),prog:ccRepProg(p.id),wallet:w.name+' ('+w.code+')',cls:w.benefit?'Flexi Benefit':'Company Expense',src:src,
            loads:ld,purchases:pu,credits:cr,net:net,pendauth:pa,alloc:w.benefit&&!demo?al:'',flag:flags.join('; '),bucket:demo?CC_DEMO:'Verified'}});
      });});});
  }
  out.cols=cols;out.rows=rows;out.note=note;return out;
});
/* The new filters, and the totals line computed from the rows on screen (the same rows the export takes). */
ccHook('ccRepFiltered',null,function(out){
  if(!out)return undefined;const F=ccRF;
  if(F.cardf||F.merch||F.tstatus||F.esrc||F.excat)out.rows=out.rows.filter(function(x){const f=x.f||{};
    return (!F.cardf||f.cardf===F.cardf)&&(!F.merch||f.merch===F.merch)&&(!F.tstatus||f.tstatus===F.tstatus)&&(!F.esrc||f.esrc===F.esrc)&&(!F.excat||f.excat===F.excat);});
  if(CC_REP_8H[ccRep])out.note=ccRepTotals8H(ccRep,out.rows);
  return out;
});
function ccRepTotals8H(id,R){
  if(!R.length)return '';
  const B=function(b){return R.filter(function(x){return x.v.bucket===b;});},S=ccSumOr8H,n=R.length;
  if(id==='txns'){
    const line=function(L,lab){if(!L.length)return '';const pd=L.filter(function(x){return x.v.posted&&!x.v.credit8;}),pc=L.filter(function(x){return x.v.posted&&x.v.credit8;});
      return lab+': debits '+S(pd,function(x){return x.v.debit;})+'; credits '+S(pc,function(x){return x.v.credit;})+'; net spending '+S(pd,function(x){return x.v.net;})+'.';};
    return [line(B('Verified'),'Verified'),line(B('Awaiting Verification'),'Awaiting verification (not counted)'),line(B(CC_DEMO),CC_DEMO+' (reported apart)'),
      B('Rejected').length?B('Rejected').length+' rejected record(s) listed, never counted.':'',
      'Pending authorizations are not spending. A statement row that repeats a transaction links to it and is never a second row. Not a live card balance.'].filter(Boolean).join(' ');
  }
  if(id==='twe')return n+' posted corporate card transaction(s) not yet claimed: '+S(R,function(x){return x.v.amount;})+' ('+['Overdue','Due Soon','Due','Unclaimed','Late Data'].map(function(s){const k=R.filter(function(x){return x.v.state===s;}).length;return k?k+' '+s:'';}).filter(Boolean).join(', ')+'). '+(B(CC_DEMO).length?B(CC_DEMO).length+' of them '+CC_DEMO+'. ':'')+'Fully refunded transactions need no claim.';
  if(id==='ewt')return n+' card-paid expense line(s) of submitted claims without a matched transaction: '+S(R,function(x){return x.v.amount;})+'. Approval and reimbursement of the employee-paid part never wait for it; the card-funded part is never reimbursed.';
  if(id==='mexc')return n+' exception(s). Unmatched on partially matched transactions: '+S(R,function(x){return x.v.unmatched;})+'; expense amount under mismatch or review: '+S(R,function(x){return x.v.amount;})+'. A transaction split across expense lines is counted once.';
  if(id==='recon'){const st=function(s){return R.filter(function(x){return x.v.recon===s;}).length;};
    return n+' statement(s): '+st('Closed – Reconciled')+' closed – reconciled, '+st('Closed with Authorized Exceptions')+' closed with authorized exceptions, '+st('Ready for Sign-Off')+' ready for sign-off, '+(n-st('Closed – Reconciled')-st('Closed with Authorized Exceptions')-st('Ready for Sign-Off'))+' open or not started. Unexplained variance '+S(R,function(x){return x.v.variance;})+'. Balances are as the statement reported them, never live.';}
  if(id==='refunds')return 'Verified credits '+S(B('Verified'),function(x){return x.v.amount;})+'; awaiting verification '+S(B('Awaiting Verification'),function(x){return x.v.amount;})+' (not counted)'+(B(CC_DEMO).length?'; '+CC_DEMO+' '+S(B(CC_DEMO),function(x){return x.v.amount;})+' (reported apart)':'')+'. Credits never exceed the original purchase.';
  if(id==='disputes')return n+' dispute(s), '+R.filter(function(x){return DSP_ACTIVE.indexOf(x.v.status)>=0;}).length+' open: disputed '+S(R,function(x){return x.v.amount;})+'; settled by verified credits '+S(R.filter(function(x){return !x.rec.demo;}),function(x){return x.v.settled;})+(R.some(function(x){return x.rec.demo;})?'; '+CC_DEMO+' disputes settled by '+CC_DEMO.toLowerCase()+' credits '+S(R.filter(function(x){return x.rec.demo;}),function(x){return x.v.settled;})+' (reported apart)':'')+'. Raising a dispute credits nothing.';
  if(id==='csxres')return n+' card spend exception(s): outstanding '+S(R,function(x){return x.v.outstanding;})+' of '+S(R,function(x){return x.v.orig;})+' ('+S(R,function(x){return x.v.resolved;})+' resolved, '+S(R,function(x){return x.v.pending;})+' in progress).';
  if(id==='walletact')return 'ADT records (verified loads and spending), not a bank-reported wallet balance. Verified: loads '+S(B('Verified'),function(x){return x.v.loads;})+', net spending '+S(B('Verified'),function(x){return x.v.net;})+'.'+(B(CC_DEMO).length?' '+CC_DEMO+' activity reported apart: loads '+S(B(CC_DEMO),function(x){return x.v.loads;})+', net spending '+S(B(CC_DEMO),function(x){return x.v.net;})+'.':'');
  return '';
}
/* Drill-down to the source record (FR-CT-23.10). */
ccHook('ccRepOpen',function(i){
  const x=ccRepFiltered().rows[i];if(!x||!x.open)return undefined;const o=x.open;
  if(o[0]==='txn'){ccOpenTxnUI(o[1]);return true;}
  if(o[0]==='stmt'){ccOpenStmtUI(o[1]);return true;}
  if(o[0]==='csx'){ccCsxOpenUI(o[1]);return true;}
  return undefined;
},null);
/* KPI indicators (FR-CT-23): contextual tiles in the Transactions and Statements & Reconciliation views, in the same
   tile layout; they are not added to the report summary cards. Pending Transactions is the existing Pending
   Authorization tile. */
function ccTxnKpi8H(all){
  const twe=all.filter(function(t){return !!ccTwe8H(t);}).length;
  const dsp=['card.dispute.manage','card.dispute.view','card.dispute.raise'].some(ccCan)?all.filter(function(t){return ccDspActive8H(t).length>0;}).length:null;
  /* The last box is Dispute: payments with an open dispute (product owner, 11 Nov 2026). Without Expense is part of Expense
     Matching, which is not on the Transactions screens. */
  return dsp==null?'':caStat('Dispute',dsp,ccTxnStatusF==='__dispute__',"ccTxnStat('__dispute__')",dsp?'wait':'idle');
}
function ccRecExcTile8H(all){
  if(!all.some(function(s){return s.recon;}))return '';
  const n=all.filter(function(s){return !s.demo||ccStmtStatusF===CC_DEMO;}).reduce(function(a,s){return a+ccRecBlocking(s).length;},0);
  return caStat('Reconciliation Exceptions',n,ccStmtRecF==='__rcx__',"ccStmtRecStat('__rcx__')",n?'bad':'idle');
}

/* ── Build 8H UI (B8-N46 item 6): the cardholder's Expense column no longer stacks its action links. The status text
   stays; when more than one action applies (Create Expense, Provide Information, Provide Supporting Information,
   Raise Dispute) they are offered through the existing row Action menu (the menu used on Employees and record logs).
   A single action stays a link. The actions themselves are unchanged. ── */
const CC_XACT_RE=/<div><button class="att-link" onclick="([^"]*)">(Create Expense|Provide Information|Provide Supporting Information|Raise Dispute)<\/button>(.*?)<\/div>/g;
const CC_XACT_CHEV='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
const ccTxnExpenseCellBase8H=ccTxnExpenseCell;
ccTxnExpenseCell=function(t){
  const h=ccTxnExpenseCellBase8H(t),acts=[];let m;CC_XACT_RE.lastIndex=0;
  while((m=CC_XACT_RE.exec(h)))acts.push({on:m[1],label:m[2]});
  if(acts.length<2)return h;
  const rest=h.replace(CC_XACT_RE,function(all,on,label,tail){return String(tail||'').trim()?'<div>'+String(tail).trim()+'</div>':'';});
  const id='cc-xa-'+t.id;
  return rest+'<div class="ct-action-wrap"><button class="ct-action-btn" title="Actions" onclick="ccXActToggle(\''+id+'\',event)"><span>Actions</span>'+CC_XACT_CHEV+'</button>'
    +'<div class="ct-action-menu emp-act-menu" id="'+id+'">'+acts.map(function(a){return '<div class="ct-act-item emp-act-item next" onclick="ccXActClose();'+a.on+'"><span class="emp-act-label">'+a.label+'</span></div>';}).join('')+'</div></div>';
};
function ccXActClose(){document.querySelectorAll('.ct-action-menu').forEach(function(x){x.classList.remove('open');});}
function ccXActToggle(id,e){
  if(e)e.stopPropagation();const m=document.getElementById(id);if(!m)return;
  const open=!m.classList.contains('open');ccXActClose();
  if(open){m.classList.add('open');const w=e&&e.target.closest('.ct-action-wrap');if(w&&typeof placeActionMenu==='function')placeActionMenu(m,w);}
}
