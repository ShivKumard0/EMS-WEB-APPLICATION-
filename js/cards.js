/* ══ CORPORATE CARDS - the rules (FR-CC v1.0, Build 7) ══════════════════════
   Expense Management → Corporate Cards: a card reference and control layer.
   ADT records the programmes, who may hold a card, card requests and their
   approval, enrollment and card records, controls, card loads and what the
   cardholder sees. Issuance, KYC, PIN, live balances and money movement
   belong to the card provider: every provider-dependent status carries its
   source - Provider Confirmed, Manually Verified, Illustrative or
   Unconfirmed - and a demo event never counts as a genuine one.

   Reused, never duplicated: Card Programmes and the provider registry
   (js/onc-enrollment.js), ONC card enrollment, Wallet & Benefits wallets,
   Employee Management and its lifecycle, the shared approval engine
   (js/expense-approvals.js), RBAC templates and teams, Build 6 funding
   sources (js/budgets.js), Module Control (js/ems-access.js).

   Stages: 7A foundation (this file's programmes, eligibility, demo mode,
   Module Control, stores, routes); 7B requests; 7C card lifecycle;
   7D controls; 7E loads; 7F cardholder; 7G integration; 7H reports. */

const CC_FORMS=['Virtual','Physical'];
const CC_PROG_TYPES=['Corporate Expense','Multi-Wallet','Meal','Fuel','Travel','Flexi','Other'];
const CC_FUNDING_MODES=['Corporate','Benefit','Hybrid'];
const CC_MODELS=['Direct','EOR'];
/* Where a provider-dependent status came from (FR-CC-07). */
const CC_SOURCES=['Provider Confirmed','Manually Verified','Illustrative','Unconfirmed'];
const CC_DEMO='Illustrative';
/* Wallet classes a funding mode may use (Wallet & Benefits classes, not wallet codes). */
const CC_MODE_CLASSES={Corporate:['Company Expense'],Benefit:['Flexi Benefit'],Hybrid:['Company Expense','Flexi Benefit','Reimbursement']};   // a multi-wallet card may also hold the Reimbursement wallet

/* ── Small helpers ─────────────────────────────────────────────────────── */
function ccEnt(){return idEntity();}
function ccNow(){return caNow();}
function ccCan(code){return typeof emsCan==='function'&&emsCan(code);}
function ccPCan(A,code){return !!A&&typeof emsPersonCan==='function'&&emsPersonCan(A.who,code);}
function ccM(n){return Math.round((Number(n)||0)*100)/100;}
function ccStamp(A){return A.date+' | '+A.time;}
function ccUniq(a){return a.filter(function(x,i){return a.indexOf(x)===i;});}
function ccLog(rec,status,action,A){
  A=A||ccNow();rec.logs=rec.logs||[];
  const via=caVia(A),row={date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:status,action:action+caViaText(A)};
  if(via)row.actualUserId=via;
  rec.logs.unshift(row);
}
/* Wrap a function of an earlier build: before() may answer instead of it; after() sees its result.
   An error in a Corporate Cards hook never breaks the wrapped action. */
function ccHook(name,before,after){
  const orig=window[name];if(typeof orig!=='function')return;
  window[name]=function(){
    const args=arguments;
    if(before){const b=before.apply(null,args);if(b!==undefined)return b;}
    const out=orig.apply(this,args);
    if(after){try{const rep=after.apply(null,[out].concat([].slice.call(args)));if(rep!==undefined)return rep;}catch(e){if(typeof console!=='undefined')console.error('Corporate Cards hook '+name+':',e);}}
    return out;
  };
}

/* ── Per-entity settings: demo mode (decision B3 / FR-CC §40) ────────────── */
/* Demo mode lets authorized people record clearly labelled simulated provider events (issuance,
   activation, load execution). OFF by default; switched on only for an approved demonstration entity. */
const ccCfgBook={};
function ccCfg(ent){ent=ent||ccEnt();return ccCfgBook[ent]||(ccCfgBook[ent]={demoMode:false,logs:[]});}
function ccDemoOn(ent){return !!ccCfg(ent).demoMode;}
function ccSetDemoMode(on,reason,A){
  A=A||ccNow();
  if(!ccPCan(A,'card.demo.manage'))return caN(A.who)+' cannot change presentation mode (card.demo.manage).';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason; it is kept in the audit trail.';
  const c=ccCfg();if(!!c.demoMode===!!on)return 'Presentation mode is already '+(on?'on':'off')+'.';
  c.demoMode=!!on;
  ccLog(c,on?'Enabled':'Disabled','Presentation mode '+(on?'switched on':'switched off')+' for '+idEntityName(ccEnt())+': '+reason
    +(on?' Illustrative provider events can now be recorded; each is labelled '+CC_DEMO+' and never counts as genuine.':' No new illustrative provider event can be recorded; existing ones keep their label.'),A);
  return '';
}

/* ── Card programmes (FR-CC-02): under the entity's existing programme registry ─ */
/* One connected provider per entity (oncProg(ent).provider, Company Settings → Card Programmes);
   any number of programmes under it. A programme's provider is optional. */
let ccProgNext=1;
function ccProgs(ent){const p=oncProg(ent||ccEnt());return p.programmes||(p.programmes=[]);}
function ccProgAll(){return Object.keys(oncProgrammes).reduce(function(a,k){return a.concat(oncProgrammes[k].programmes||[]);},[]);}
function ccProg(id){return ccProgAll().find(function(p){return p.id===Number(id);})||null;}
function ccProgLabel(p){return p?p.key+' · '+p.name:'';}
function ccProgActive(p,iso){iso=iso||wbToday();return !!p&&p.status==='Active'&&(!p.effFrom||iso>=p.effFrom)&&(!p.effTo||iso<=p.effTo);}
function ccProvider(key){return ONC_PROVIDERS.find(function(p){return p.key===key;})||null;}
function ccProviderName(key){const p=ccProvider(key);return p?p.name:'No provider';}
/* Provider connection is never "Connected": no provider integration exists in ADT yet (FR-CC-02.12). */
function ccProviderStatus(p){
  if(!p||!p.provider)return 'Not Connected';
  const reg=ONC_PROVIDER_REG[p.provider]||{};
  return Object.keys(reg).some(function(k){return reg[k]&&reg[k].confirmed;})?'Configured':'Not Connected';
}
/* Wallet types a programme may use: active Wallet & Benefits configurations of the entity, of the
   classes its funding mode allows, supported by its provider when it has one. */
function ccWalletOptions(ent,provider,mode){
  ent=ent||ccEnt();
  const classes=CC_MODE_CLASSES[mode]||CC_MODE_CLASSES.Hybrid,prov=provider?ccProvider(provider):null;
  return ccUniq(wbWallets.filter(function(w){return w.entity===ent&&w.status==='Active';}).map(function(w){return w.type;}))
    .filter(function(code){const t=wbType(code);return t&&classes.indexOf(t.cls)>=0&&(!prov||prov.wallets.indexOf(code)>=0||!!t.custom);});   // a company's own wallet type goes on its card
}
function ccWfOptions(kind,ent){ent=ent||ccEnt();return caWorkflows.filter(function(w){return w.entity===ent&&caWfKindOf(w)===kind&&w.status==='Active';});}
function ccValidateProg(d,ent,selfId){
  if(!String(d.name||'').trim())return 'Programme Name is required.';
  const code=String(d.code||'').trim().toUpperCase();
  if(!code)return 'Programme Code is required.';
  if(!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code))return 'Programme Code: 2–24 letters, digits, - or _.';
  if(ccProgs(ent).some(function(p){return p.id!==selfId&&p.code===code;}))return 'Programme Code '+code+' is already used in this entity.';
  if(CC_PROG_TYPES.indexOf(d.type)<0)return 'Pick the programme type.';
  if(!(d.forms||[]).length||d.forms.some(function(f){return CC_FORMS.indexOf(f)<0;}))return 'Pick the card forms the programme supports (Virtual, Physical or both).';
  if(EXP_CURRENCIES.indexOf(d.currency)<0)return 'Pick the programme currency.';
  if(!(d.models||[]).length||d.models.some(function(m){return CC_MODELS.indexOf(m)<0;}))return 'Pick the eligible employment models.';
  if(d.provider){
    if(!ccProvider(d.provider))return 'Pick a provider from the registry.';
    if(oncProg(ent).provider!==d.provider)return ccProviderName(d.provider)+' is not this entity\'s connected provider. One provider per entity: enable it in Corporate Cards → Card Setup first, or leave Provider empty.';
  }
  const max=Number(d.maxCards);if(!(max>=1&&max<=5&&Math.floor(max)===max))return 'Maximum Active Cards per Employee must be a whole number from 1 to 5.';
  if(CC_FUNDING_MODES.indexOf(d.fundingMode)<0)return 'Pick the funding mode.';
  const opts=ccWalletOptions(ent,d.provider,d.fundingMode);
  if(!(d.wallets||[]).length)return 'Link at least one wallet. Wallets come from active Wallet & Benefits configurations'+(d.provider?' that '+ccProviderName(d.provider)+' supports':'')+'.';
  const bad=d.wallets.filter(function(w){return opts.indexOf(w)<0;});
  if(bad.length)return bad.map(wbTypeName).join(', ')+' cannot be linked: it needs an active Wallet & Benefits configuration in this entity'+(d.provider?', support by '+ccProviderName(d.provider):'')+' and a class the funding mode allows.';
  if(!d.selfRequest&&!d.adminRequest)return 'Allow employee self-requests, administrative requests or both.';
  if(!d.workflowId||!ccWfOptions('Card Request',ent).some(function(w){return w.id===Number(d.workflowId);}))return 'Pick an active Card Request approval workflow.';
  if(d.effTo&&d.effFrom&&d.effTo<d.effFrom)return 'Effective To cannot be before Effective From.';
  return '';
}
function ccProgSave(d,A){
  A=A||ccNow();
  if(!ccPCan(A,'card.programme.manage'))return {error:caN(A.who)+' cannot configure card programmes (card.programme.manage).'};
  const ent=ccEnt(),p=d.id!=null?ccProg(d.id):null;
  if(d.id!=null&&(!p||p.entity!==ent))return {error:'No such programme in this entity.'};
  const e=ccValidateProg(d,ent,p?p.id:null);if(e)return {error:e};
  const f={name:String(d.name).trim(),code:String(d.code).trim().toUpperCase(),provider:d.provider||'',type:d.type,forms:CC_FORMS.filter(function(x){return d.forms.indexOf(x)>=0;}),
    currency:d.currency,country:String(d.country||'').trim(),models:CC_MODELS.filter(function(x){return d.models.indexOf(x)>=0;}),depts:(d.depts||[]).slice(),
    selfRequest:!!d.selfRequest,adminRequest:!!d.adminRequest,maxCards:Number(d.maxCards),fundingMode:d.fundingMode,wallets:d.wallets.slice(),
    workflowId:Number(d.workflowId),effFrom:d.effFrom||'',effTo:d.effTo||'',desc:String(d.desc||'').trim()};
  if(d.funding!==undefined&&typeof ccFundNorm==='function'){const fn=ccFundNorm(d.funding),fe=ccFundingValidate(fn,ent);if(fe)return {error:fe};f.funding=fn;}
  if(p){
    const ch=Object.keys(f).filter(function(k){return JSON.stringify(p[k])!==JSON.stringify(f[k]);});
    if(!ch.length)return {rec:p,unchanged:true};
    const before={};ch.forEach(function(k){before[k]=p[k];});
    Object.assign(p,f);
    ccLog(p,p.status,'Programme updated ('+ch.join(', ')+'). Before: '+ch.map(function(k){return k+' '+JSON.stringify(before[k]);}).join('; ')+'.',A);
    ccLog(ccCfg(ent),'Updated',p.key+' '+p.name+' updated ('+ch.join(', ')+').',A);
    return {rec:p};
  }
  const id=ccProgNext++;
  const rec=Object.assign({id:id,key:'CPG-'+(100+id),entity:ent,status:'Active',createdBy:A.who,createdAt:ccStamp(A),controls:null,funding:null,logs:[]},f);
  ccProgs(ent).push(rec);
  ccLog(rec,'Active','Programme created: '+rec.name+' ('+rec.type+', '+rec.forms.join(' and ')+', '+rec.currency+'; wallets '+rec.wallets.map(wbTypeName).join(', ')+').'
    +(rec.provider?' Provider '+ccProviderName(rec.provider)+' - not connected; no card is issued by ADT.':' No provider: cards are internal records.'),A);
  ccLog(ccCfg(ent),'Created',rec.key+' '+rec.name+' created.',A);
  return {rec:rec};
}
/* Active ⇄ Inactive. Inactive takes no new requests, cards or loads; existing cards stay manageable. */
function ccProgSetStatus(id,status,reason,A){
  A=A||ccNow();
  if(!ccPCan(A,'card.programme.manage'))return caN(A.who)+' cannot change card programmes (card.programme.manage).';
  const p=ccProg(id);if(!p||p.entity!==ccEnt())return 'No such programme in this entity.';
  if(['Active','Inactive'].indexOf(status)<0||p.status===status)return 'Nothing to change.';
  reason=String(reason||'').trim();if(status==='Inactive'&&!reason)return 'Give the reason for deactivating the programme.';
  if(status==='Active'){const e=ccValidateProg(p,p.entity,p.id);if(e)return 'Cannot activate: '+e;}
  p.status=status;
  ccLog(p,status,'Programme '+(status==='Active'?'activated':'deactivated: '+reason+'. No new card requests, cards or loads; existing cards, requests and history are kept.'),A);
  ccLog(ccCfg(p.entity),status,p.key+' '+p.name+' '+(status==='Active'?'activated':'deactivated')+'.',A);
  return '';
}

/* ── Stores shared by every stage (7B-7H fill them) ─────────────────────── */
/* ID ranges stay clear of every other record kind, because the approval engine looks a record up by ID
   across all stores: card requests 100001+, loads 110001+, bulk files 120001+, control changes 130001+;
   card records 140001+. */
const ccRequests=[],ccCards=[],ccLoads=[],ccBulks=[],ccCtlChanges=[];
let ccReqNextId=100001,ccReqNextKey=1001,ccLoadNextId=110001,ccLoadNextKey=1001,ccBulkNextId=120001,ccBulkNextKey=1001,
  ccCtlNextId=130001,ccCtlNextKey=1001,ccCardNextId=140001,ccCardNextKey=1001;
const CC_CARD_FINAL=['Not Issued','Expired','Replaced','Closed'];
/* Cards an employee holds that still count (not expired, replaced or closed). */
function ccLiveCardsOf(eid,progId){return ccCards.filter(function(c){return c.employeeEid===eid&&(progId==null||c.programmeId===Number(progId))&&CC_CARD_FINAL.indexOf(c.status)<0;});}
/* Loads being executed: the module cannot be switched off under them (decision A2). */
function ccLoadsInFlight(ent){ent=ent||ccEnt();return ccLoads.filter(function(l){return l.entity===ent&&l.exec&&!l.exec.closed&&['Processing','Awaiting Execution','Partially Recorded'].indexOf(l.exec.status)>=0;});}
/* Mask a card reference: the last four digits only, never the full number (FR-CC-09.02). */
function ccMask(last4){return last4?'•••• '+String(last4).slice(-4):'•••• ----';}

/* ── Who may request or hold a card (FR-CC-03) ──────────────────────────── */
/* purpose: 'draft' (a preparatory draft), 'submit', 'approve', 'assign' or 'load'. Uses the employee's
   own record - entity, employment model, lifecycle state, card enrollment - never a named person. */
function ccEmpModel(e){const k=e?idEmpKind(e):'';return k==='de'?'Direct':k==='ge'?'EOR':'';}
function ccEligibility(eid,progId,purpose,exceptCardId){
  purpose=purpose||'submit';
  const out={ok:false,draftOnly:false,reasons:[]},why=function(t){out.reasons.push(t);};
  const e=idEmp(eid),p=ccProg(progId);
  if(!e){why('The employee is not on ADT Employee Management.');return out;}
  if(!p){why('Pick a card programme.');return out;}
  if(p.entity!==e.entityId||p.entity!==ccEnt())why('The programme and the employee must belong to the selected entity.');
  if(!ccProgActive(p))why(p.key+' is '+(p.status!=='Active'?p.status.toLowerCase():'outside its effective dates')+'; it takes no new '+(purpose==='load'?'loads':'requests')+'.');
  const model=ccEmpModel(e);
  if(!model)why(e.name+' has no employee record with a lifecycle (Admin Access staff cannot hold a card).');
  else if(p.models.indexOf(model)<0)why(model+' employees are not eligible for '+p.name+(model==='EOR'?' (EOR eligibility is off unless the programme enables it)':'')+'.');
  if(p.depts&&p.depts.length&&p.depts.indexOf(e.dept)<0)why(p.name+' is limited to '+p.depts.join(', ')+'.');
  if(model){
    const st=empState(e);
    if(st.status==='Inactive')why(e.name+' is inactive.');
    else if(st.phase==='off')why(e.name+' is leaving (offboarding'+(st.off&&st.off.lwd?', last working day '+cdLabel(st.off.lwd):'')+'); no new card, request or load.');
    else if(st.status!=='Active'){
      if(purpose==='draft')out.draftOnly=true;
      else why(e.name+' is '+st.status+'; only a preparatory draft is possible until the employee is Active.');
    }
    /* Direct employees use their ONC card enrollment; it must be ready for the programme's provider. */
    if(model==='Direct'&&p.provider&&purpose!=='draft'&&purpose!=='load'){
      const r=typeof oncRec==='function'?oncRec(eid):null,emp=typeof oncEmpOf==='function'?oncEmpOf(eid):null;
      const s=emp?oncStatus(emp,r):'Not Enrolled';
      if(s!=='Ready for Card Enrollment')why('Card enrollment for '+e.name+' is "'+s+'"; it must be Ready for Card Enrollment (employee details and declarations complete).');
      /* Declarations recorded through Switch User never count (EMP-N15), in any company. */
      else if(r&&r.decls&&r.decls.simulated)why(e.name+'\'s declarations were recorded only through Switch User; the employee must accept them personally.');
    }
    /* Marked on every record built on it, drafts included, so a simulation is never mistaken for consent. */
    if(model==='Direct'&&typeof oncRec==='function'){const rr=oncRec(eid);if(rr&&rr.decls&&rr.decls.simulated)out.consentSimulated=true;}
  }
  if(purpose==='submit'||purpose==='approve'||purpose==='assign'){
    const live=ccLiveCardsOf(eid,p.id).filter(function(c){return c.id!==Number(exceptCardId);}).length;   // a card being replaced does not count
    if(live>=p.maxCards)why(e.name+' already holds '+live+' card'+(live===1?'':'s')+' in '+p.name+' (maximum '+p.maxCards+').');
  }
  out.ok=!out.reasons.length;
  return out;
}

/* ── Module Control (decision A2 / FR-CC-01.04-06) ──────────────────────── */
/* Corporate Cards is its own switch, nested under Expenses: Expenses off means Corporate Cards off.
   Switching it off hides its page, actions and approvals; records are kept. It is refused while card
   loads are being executed. */
if(typeof MC_MODULES!=='undefined'&&!MC_MODULES.some(function(m){return m.key==='cards';}))
  MC_MODULES.push({key:'cards',label:'Corporate Cards',covers:'Corporate Cards page: card requests, enrollment, cards, controls, card loads, cardholder view. Requires Expenses.',active:true,parent:'expenses'});
if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE.cards='cards';
(function(){
  if(typeof mcOn!=='function')return;
  const base=mcOn;
  window.mcOn=function(key){return key==='cards'?base('expenses')&&base('cards'):base.apply(null,arguments);};
})();
ccHook('mcToggle',function(key){
  if(key==='cards'){
    if(mcStateOf().expenses===false){showToast('Switch Expenses on first','error','Corporate Cards is part of Expenses; it can be on only while Expenses is on.');return false;}
    if(mcOn('cards')&&ccLoadsInFlight().length){showToast('Card loads are being executed','error','Finish or cancel '+ccLoadsInFlight().map(expKey).join(', ')+' before switching Corporate Cards off.');return false;}
  }
  if(key==='expenses'&&mcOn('expenses')&&ccLoadsInFlight().length){
    showToast('Card loads are being executed','error','Expenses also switches Corporate Cards off. Finish or cancel '+ccLoadsInFlight().map(expKey).join(', ')+' first.');return false;}
  return undefined;
});

/* ── Approval routes (the shared engine; request kinds register in 7B) ──── */
/* Card work goes through the one Build 4 engine. Independent stages are ON for every card route: a
   later stage is decided by someone other than whoever approved an earlier one (decision A5). */
const CC_WF_KINDS=['Card Request','Card Load','Bulk Card Enrollment','Bulk Card Load','Card Control Change','Card Replacement'];
(function ccSeedRoutes(){
  if(typeof caWfSeed!=='function')return;
  const sh=(idUserByEmail('shaun@testemp.com')||{}).userId||'';
  const approvers=String(caSeedTeamId('Card Approvers'));
  const wf=function(name,kind,desc,stages){const w=caWfSeed(caWfNext++,name,{kind:kind,desc:desc,createdAt:'01 Apr 2026 | 09:00:00 AM'},stages);w.independent=true;caWorkflows.push(w);return w;};
  const fin=function(n){return caStageDef(n,'Card approver review','RBAC Team',approvers,{rule:'Any One',fallback:sh});};
  wf('Card requests - manager then card approver','Card Request','New cards: the employee\'s reporting manager, then an independent card approver.',[caStageDef(1,'Manager review','Reporting Manager','',{fallback:sh}),fin(2)]);
  wf('Card loads - card approver','Card Load','Card loads: an independent card approver. Execution is verified separately by someone else.',[fin(1)]);
  wf('Bulk card enrollment - checker','Bulk Card Enrollment','A bulk enrollment file: an independent checker validates it; each row then becomes its own card request on the card request route.',[caStageDef(1,'File checker','RBAC Team',approvers,{rule:'Any One',fallback:sh})]);
  wf('Bulk card loads - card approver','Bulk Card Load','A bulk load file: one independent approval with row-by-row review.',[fin(1)]);
  wf('Card control relaxation - manager then card approver','Card Control Change','Relaxing a card\'s controls: the cardholder\'s reporting manager, then an independent card approver.',[caStageDef(1,'Manager review','Reporting Manager','',{fallback:sh}),fin(2)]);
  wf('Card replacements - card approver','Card Replacement','Replacing a card: an independent card approver.',[fin(1)]);
})();

/* ── Demonstration data (configurable records, not rules) ───────────────── */
/* The home entity runs the RBL programme in demo mode, with two programmes. Nothing here decides
   eligibility or ownership: those come from each employee's own record. */
(function ccSeed(){
  const ent=ID_HOME_ENTITY,sh=(idUserByEmail('shaun@testemp.com')||{}).userId||'';
  if(!oncProg(ent).provider)return;
  const A=caAt(sh,'2026-10-15','10:30:00 AM');
  ccCfg(ent).demoMode=true;
  ccLog(ccCfg(ent),'Enabled','Presentation mode switched on for '+idEntityName(ent)+': the approved presentation company. Illustrative provider events are labelled '+CC_DEMO+' and never count as genuine.',A);
  const wfId=(ccWfOptions('Card Request',ent)[0]||{}).id;
  const mk=function(d){
    const id=ccProgNext++;
    const rec=Object.assign({id:id,key:'CPG-'+(100+id),entity:ent,status:'Active',createdBy:sh,createdAt:ccStamp(A),controls:null,funding:null,logs:[],country:'India',depts:[],
      selfRequest:true,adminRequest:true,maxCards:1,workflowId:wfId,effFrom:'2026-10-15',effTo:'',desc:''},d);
    ccProgs(ent).push(rec);
    ccLog(rec,'Active','Programme created: '+rec.name+' ('+rec.type+', '+rec.forms.join(' and ')+', '+rec.currency+'; wallets '+rec.wallets.map(wbTypeName).join(', ')+'). Provider '+ccProviderName(rec.provider)+' - not connected; no card is issued by ADT.',A);
    ccLog(ccCfg(ent),'Created',rec.key+' '+rec.name+' created.',A);
    return rec;
  };
  mk({name:'ONC Corporate Expense Card',code:'ONC-CORP',provider:oncProg(ent).provider,type:'Corporate Expense',forms:['Virtual','Physical'],currency:'INR',models:['Direct'],
    fundingMode:'Corporate',wallets:['CORP'],desc:'Company spend: travel, client meetings and office purchases.'});
  mk({name:'ONC Meal & Fuel Card',code:'ONC-BEN',provider:oncProg(ent).provider,type:'Meal',forms:['Virtual','Physical'],currency:'INR',models:['Direct'],
    fundingMode:'Benefit',wallets:['MEAL','FUEL'],desc:'Monthly meal and fuel benefits, loaded from approved Wallet & Benefits allocations.'});
})();

/* ══ 7B · Card requests (FR-CC-04/05/07 Track A) ══════════════════════════ */
/* A request is the employee's (or an authorized person's on their behalf); the employee is the
   beneficiary and the request's claimant, so neither the beneficiary nor the requester can approve it.
   Approval authorizes enrollment - it never issues or activates a card (FR-CC-05.12). The approval
   engine routes a request with one unit line ("1 card"); nothing is money. */
const CC_REQ_REASONS=['Role requirement','Frequent business travel','Client and vendor spend','Benefit programme enrolment','Other'];
const CC_DELIVERY=['Office (work location)','Card enrollment (KYC) address','Other address'];
const CC_KIND_WF={'card request':'Card Request','card load':'Card Load','bulk card enrollment':'Bulk Card Enrollment','bulk card load':'Bulk Card Load','card control change':'Card Control Change','card replacement':'Card Replacement'};
function ccReq(id){return ccRequests.find(function(r){return r.id===Number(id);})||null;}
function ccRecAny(id){id=Number(id);return ccReq(id)||ccLoads.find(function(x){return x.id===id;})||ccBulks.find(function(x){return x.id===id;})||ccCtlChanges.find(function(x){return x.id===id;})||null;}
/* Track A as people read it: the engine's status, then the enrollment after approval. */
function ccReqTrack(r){return ['Approved','Partially Approved'].indexOf(r.status)>=0?(r.track||'Approved'):r.status;}
function ccOpenReqsOf(eid,progId,type,exceptId){
  return ccRequests.filter(function(r){return r.kind==='card request'&&r.id!==exceptId&&r.employeeEid===eid&&r.programmeId===Number(progId)&&(!type||r.cardType===type)
    &&(['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0||ccReqTrack(r)==='Enrollment Pending');});
}
/* Who may raise it: the employee for themselves where the programme allows self-requests (card.request.create);
   an authorized person on behalf where it allows administrative requests (card.request.others). */
function ccReqMayRaise(A,eid,p){
  const me=idEmpOfUser(A.who),self=!!me&&me.eid===eid;
  if(self){
    if(!p.selfRequest)return p.name+' does not take employee self-requests; an administrator requests it for you.';
    return ccPCan(A,'card.request.create')||ccPCan(A,'card.request.others')?'':caN(A.who)+' cannot request a card (card.request.create).';
  }
  if(!p.adminRequest)return p.name+' does not take requests on an employee\'s behalf.';
  return ccPCan(A,'card.request.others')?'':caN(A.who)+' cannot request a card on someone else\'s behalf (card.request.others).';
}
function ccReqFields(d,p){
  return {programmeId:p.id,cardType:d.cardType,reason:d.reason,purpose:String(d.purpose||'').trim(),comments:String(d.comments||'').trim(),proof:d.proof||'',
    delivery:d.cardType==='Physical'?{mode:d.deliveryMode||'',text:String(d.deliveryText||'').trim()}:null,currency:p.currency,wallets:p.wallets.slice()};
}
function ccReqValidate(f,p){
  if(p.forms.indexOf(f.cardType)<0)return p.name+' issues '+p.forms.join(' and ')+' cards only.';
  if(CC_REQ_REASONS.indexOf(f.reason)<0)return 'Pick the request reason.';
  if(f.reason==='Other'&&!f.purpose)return 'Describe the business purpose when the reason is Other.';
  if(f.cardType==='Physical'){
    if(!f.delivery||CC_DELIVERY.indexOf(f.delivery.mode)<0)return 'Pick where the physical card is delivered.';
    if(f.delivery.mode==='Other address'&&f.delivery.text.length<10)return 'Enter the full delivery address (it is used for this card only; the employee record is not changed).';
  }
  return '';
}
function ccReqTitle(r){const p=ccProg(r.programmeId);return (r.kind==='card replacement'?'Replacement · ':'')+(p?p.name:'Card')+' · '+r.cardType;}
/* d: employeeEid, programmeId, cardType, reason, purpose, deliveryMode, deliveryText, comments, proof. */
function ccReqCreate(d,submit,A){
  A=A||ccNow();
  const e=idEmp(d.employeeEid),p=ccProg(d.programmeId);
  if(!e||e.entityId!==ccEnt())return {error:'Pick an employee of this entity.'};
  if(!p||p.entity!==ccEnt())return {error:'Pick a card programme.'};
  const may=ccReqMayRaise(A,e.eid,p);if(may)return {error:may};
  const el=ccEligibility(e.eid,p.id,submit?'submit':'draft');
  if(!el.ok)return {error:el.reasons.join(' ')};
  const f=ccReqFields(d,p),ve=ccReqValidate(f,p);if(ve)return {error:ve};
  const dup=ccOpenReqsOf(e.eid,p.id,f.cardType);if(dup.length)return {error:e.name+' already has '+expKey(dup[0])+' ('+ccReqTrack(dup[0])+') for a '+f.cardType.toLowerCase()+' '+p.name+'.'};
  const me=idEmpOfUser(A.who),self=!!me&&me.eid===e.eid;
  const r=Object.assign({id:ccReqNextId++,key:ccReqNextKey++,prefix:'CRQ',kind:'card request',entity:ccEnt(),claimFor:self?'Self':'Others',mode:self?'Self':'On Behalf',
    employeeEid:e.eid,name:e.name,empId:e.empId,email:e.email||'',dept:e.dept||'',designation:e.jobTitle||e.designation||'',status:'Draft',createdBy:A.who,createdAt:ccStamp(A),
    migrated:true,idMigrated:true,category:'Card Request',title:'',track:'',eligibility:{at:ccStamp(A),ok:el.ok,draftOnly:el.draftOnly,reasons:el.reasons},consentSimulated:!!el.consentSimulated,
    lines:[{id:1,title:'Card · '+f.cardType,amount:1,subCat:'Card',start:A.iso,end:A.iso,status:'Pending',approved:null}],logs:[]},f);
  r.currency='card';r.title=ccReqTitle(r);
  ccLog(r,'Draft','Card request drafted by '+caN(A.who)+(self?'':' on behalf of '+e.name)+': '+r.title+'.'+(el.draftOnly?' '+e.name+' is not yet Active: this is a preparatory draft and cannot be submitted until they are.':''),A);
  ccRequests.unshift(r);
  if(submit){const se=ccReqSubmit(r.id,A);if(se){ccRequests.shift();ccReqNextId--;ccReqNextKey--;return {error:se};}}
  return {rec:r};
}
/* Edit a draft (or a request sent back for Follow-Up, before resubmitting). */
function ccReqUpdate(id,d,A){
  A=A||ccNow();
  const r=ccReq(id);if(!r||r.entity!==ccEnt())return 'No such request.';
  if(['Draft','Follow-Up'].indexOf(r.status)<0)return expKey(r)+' is '+r.status+'; only a draft or a request sent back can be edited.';
  const own=r.createdBy===A.who||caIsClaimant(r,A.who);
  if(!(own||ccPCan(A,'card.request.others')))return caN(A.who)+' cannot edit '+expKey(r)+'.';
  const p=ccProg(d.programmeId||r.programmeId);if(!p)return 'Pick a card programme.';
  const f=ccReqFields(Object.assign({cardType:r.cardType,reason:r.reason,purpose:r.purpose,comments:r.comments,deliveryMode:r.delivery&&r.delivery.mode,deliveryText:r.delivery&&r.delivery.text},d),p);
  const ve=ccReqValidate(f,p);if(ve)return ve;
  const dup=ccOpenReqsOf(r.employeeEid,p.id,f.cardType,r.id);if(dup.length)return r.name+' already has '+expKey(dup[0])+' for this programme and card type.';
  const ch=['programmeId','cardType','reason','purpose','delivery','comments'].filter(function(k){return JSON.stringify(r[k])!==JSON.stringify(f[k]);});
  Object.assign(r,f);r.currency='card';r.title=ccReqTitle(r);r.lines[0].title='Card · '+r.cardType;
  if(ch.length){ccLog(r,r.status,'Edited by '+caN(A.who)+' ('+ch.join(', ')+').',A);if(A.who!==r.createdBy&&!caIsClaimant(r,A.who))caAddPreparer(r,A.who);}
  return '';
}
function ccReqSubmit(id,A){
  A=A||ccNow();
  const r=ccReq(id);if(!r||r.entity!==ccEnt())return 'No such request.';
  if(r.status!=='Draft')return 'Only a draft is submitted; '+expKey(r)+' is '+r.status+'.';
  const p=ccProg(r.programmeId),may=p?ccReqMayRaise(A,r.employeeEid,p):'Pick a card programme.';
  if(may)return may;
  const pre=ccReqPreflight(r);if(pre.error)return pre.error;
  r.consentSimulated=!!ccEligibility(r.employeeEid,r.programmeId,'submit').consentSimulated;
  if(!caStart(r,pre,A))return expKey(r)+' already has an approval in progress.';
  return '';
}
/* Every submission and every approving decision re-checks the employee and the programme (FR-CC-03.08). */
function ccReqPreflight(r,o){
  const el=ccEligibility(r.employeeEid,r.programmeId,'submit');
  if(!el.ok)return {error:'Not eligible: '+el.reasons.join(' ')};
  const dup=ccOpenReqsOf(r.employeeEid,r.programmeId,r.cardType,r.id).filter(function(x){return x.status!=='Draft';});
  if(dup.length)return {error:r.name+' already has '+expKey(dup[0])+' ('+ccReqTrack(dup[0])+') for this programme and card type.'};
  return ccEnginePreflight(r,o);
}
function ccRoute(r,iso){
  iso=iso||wbToday();
  const kind=CC_KIND_WF[r.kind],p=r.programmeId?ccProg(r.programmeId):null;
  const own=p&&p.workflowId&&r.kind==='card request'?caWorkflows.find(function(w){return w.id===p.workflowId&&caWfKindOf(w)===kind&&caWfInForce(w,iso);}):null;
  if(own)return {wf:own};
  const lw=p&&r.kind==='card load'&&p.funding?Number(p.funding.loadWorkflowId)||0:0;
  const ownL=lw?caWorkflows.find(function(w){return w.id===lw&&caWfKindOf(w)===kind&&caWfInForce(w,iso);}):null;
  if(ownL)return {wf:ownL};
  const ws=caWorkflows.filter(function(w){return caWfKindOf(w)===kind&&caWfInForce(w,iso);}).sort(function(a,b){return b.id-a.id;});
  if(!ws.length)return {error:'No active '+kind+' approval route.'};
  return {wf:ws[0]};
}
function ccEnginePreflight(r,o){
  o=o||{};
  const rt=ccRoute(r,o.iso);if(rt.error)return {error:rt.error,route:true};
  const defs=caActiveDefs(rt.wf);if(!defs.length)return {error:caWfKey(rt.wf)+' has no active stage.',route:true};
  const res=defs.map(function(d){return caResolve(d,r);});
  const fail=res.find(function(x){return x.error;});
  if(fail)return {error:'Approval cannot start - '+fail.error+' Ask an administrator to fix the route.',route:true};
  return {wf:rt.wf,resolved:res};
}
function ccReqDecisionCheck(r,items){
  if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
  const el=ccEligibility(r.employeeEid,r.programmeId,'approve');
  return el.ok?'':'Cannot approve '+expKey(r)+' now: '+el.reasons.join(' ');
}
/* Final approval starts enrollment (Track A → Enrollment Pending); the card record and its provider
   statuses follow in Track B (7C). */
function ccReqOnFinal(r,A){
  if(['Approved','Partially Approved'].indexOf(r.status)<0)return;
  const p=ccProg(r.programmeId);
  r.track='Enrollment Pending';
  r.enr=ccEnrNew(r,p);
  ccLog(r,'Enrollment Pending','Approved. Enrollment '+r.enr.key+' is pending'+(p&&p.provider?' with '+ccProviderName(p.provider)+' (KYC by the provider)':'')+'. No card has been issued: approval authorizes enrollment only.',A);
}
/* Independent stages: where the route asks for it, a later stage is decided by someone other than whoever
   approved an earlier one (decision A5, FR-CC-19.09). */
function ccExcluded(r){
  const out=[],w=r.wf?caWfRec(r.wf.wfId):null;
  if(w&&w.independent&&r.wf.stages)r.wf.stages.forEach(function(st){
    if(st.status!=='Approved')return;
    st.decisions.forEach(function(d){if(!d.void&&(d.decision==='Approved'||d.decision==='Partially Approved'))out.push(d.who);});
  });
  return out;
}
function ccWfRows(r){
  const done=(r.logs||[]).slice().reverse().map(function(l){return {title:l.status||'',user:l.user||'System',date:l.date||'',time:l.time||'',description:l.action||''};});
  const steps=[];
  if(r.status==='Draft'){
    steps.push({title:'Submit for Approval',owner:caN(r.createdBy)});
    const rt=ccRoute(r);if(rt.wf)caActiveDefs(rt.wf).forEach(function(s){steps.push({title:'Stage '+s.n+' · '+s.name,owner:caStageWho(s)});});
  }else if(r.wf&&r.wf.open){
    if(r.status==='Follow-Up')steps.push({title:'Respond to Follow-Up',owner:caN(r.submittedBy||r.createdBy)});
    r.wf.stages.slice(r.wf.current).forEach(function(s,i){steps.push({title:'Stage '+s.n+' · '+s.name,owner:i===0&&s.approvers.length?caNs(s.approvers):caStageWho(s)});});
  }
  if(r.kind==='card request'&&['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0)steps.push({title:'Enrollment, issuance and activation',owner:'Card administrator · provider'});
  if(r.kind==='card request'&&ccReqTrack(r)==='Enrollment Pending')steps.push({title:'Enrollment completed, card issued',owner:'Provider confirmation or illustrative'});
  return wfPlan(done,steps);
}
function ccOpenRecord(id,tab){
  if(typeof ccCtlChange==='function'&&ccCtlChange(id)&&typeof ccOpenCtlUI==='function'){ccOpenCtlUI(id);return;}   // a control change (7D)
  if(typeof ccLoad==='function'&&ccLoad(id)&&typeof ccOpenLoadUI==='function'){ccOpenLoadUI(id);return;}             // a card load (7E)
  if(typeof ccBulk==='function'&&ccBulk(id)&&typeof ccOpenBulkUI==='function'){ccOpenBulkUI(id);return;}             // a bulk file (7E)
  if(typeof ccOpenReqUI==='function')ccOpenReqUI(id,tab);
}
/* Register a card request kind on the one approval engine (hooks as in Build 6). */
function ccRegisterKind(kind,cfg){
  CA_KIND_PERMS[kind]=Object.assign({approve:'card.request.approve',submit:'card.request.create',others:'card.request.others',withdraw:'card.request.create',
    withdrawOthers:'card.request.others',reassign:'card.enrollment.manage',intervene:'card.approval.intervene'},cfg.perms||{});
  const on=function(){return typeof mcOn!=='function'||mcOn('cards');};
  CA_EXT[kind]=Object.assign({
    approvalNoun:'card',stageFit:true,
    rec:function(id){if(!on())return null;const x=ccRecAny(id);return x&&x.kind===kind?x:null;},
    recs:function(){return on()?ccRequests.concat(ccLoads,ccBulks,ccCtlChanges).filter(function(x){return x.kind===kind;}):[];},
    hidden:function(){return !on();},
    route:function(r,iso){return ccRoute(r,iso);},policySig:function(r){return [r.kind,r.programmeId,r.employeeEid,r.cardType,JSON.stringify(r.delivery||null),caTotal(r)].join('|');},
    preflight:function(r,o){return ccEnginePreflight(r,o);},allowsPartial:function(){return false;},partialMsg:'Card requests are approved in full, rejected or sent back.',
    decisionCheck:function(){return '';},onFinal:function(){},openFn:'ccOpenRecord',
    reviewInfo:function(r){return typeof ccReviewInfoHTML==='function'?ccReviewInfoHTML(r):'';},
    workflowRows:function(r){return ccWfRows(r);},resolveStage:{},approverTypes:[],
    excluded:function(r){return ccExcluded(r);},
    reassignCheck:function(r,st,to){return typeof bgReassignCheck==='function'?bgReassignCheck(r,st,to):'';},
    reassignPool:function(r,st){return typeof bgReassignPool==='function'?bgReassignPool(r,st):caApproverPool(kind);},
    finalNote:'Approval authorizes the next step only; ADT issues no card and moves no money.',
    finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+(r.status!=='Rejected'&&r.kind==='card request'?' - enrollment is pending; no card is issued yet':'')+'.';},
    decisionHint:'Approves the request as a whole. It authorizes the next step only; nothing is issued or loaded by approval.'},cfg);
  delete CA_EXT[kind].perms;
}
ccRegisterKind('card request',{preflight:function(r,o){return ccReqPreflight(r,o);},decisionCheck:function(r,items){return ccReqDecisionCheck(r,items);},onFinal:function(r,A){ccReqOnFinal(r,A);}});


/* ══ 7C · Card lifecycle (FR-CC-06 to 09; PO-1, PO-2) ═══════════════════════════════════════════
   Two tracks (FR-CC-07.01). Track A is the request: the engine, then enrollment. Track B is the card
   record. It is created when an administrator submits the enrollment to the provider, bound for good to
   the approved employee (PO-2), and moves only by recorded events: its status is the last event's
   (FR-CC-07.08), and a move the lifecycle does not allow is refused (FR-CC-07.05).
   Every provider-dependent outcome - KYC, issuance, dispatch and delivery, activation, suspension,
   reactivation, block, expiry, closure - enters through ONE entry point, ccOutcomeRecord, with its source:
     Provider Confirmed - only from a connected provider integration. None exists, so never here (BE-07).
     Manually Verified  - a reference and evidence recorded by one person, verified by another person.
     Illustrative   - demo mode on and card.demo.simulate. Labelled everywhere; never a bank event.
   Until then an outcome is Unconfirmed. Actions ADT asks of the provider (suspend, reactivate, block,
   close) stay "pending provider confirmation" until an outcome is recorded (FR-CC-09.09).
   Internal holds (a lost or stolen report, a temporary hold) act inside ADT at once - no new loads, the
   card flagged - and claim nothing at the bank. ADT never stores a full card number, CVV, PIN or expiry. */
const CC_KYC=['Not Required','Pending','Provider Review','Verified','Failed'];
const CC_DISPATCH=['Not Dispatched','Dispatched','Delivered','Failed','Returned'];
const CC_SRC_PROVIDER='Provider Confirmed',CC_SRC_MANUAL='Manually Verified',CC_SRC_NONE='Unconfirmed';
const CC_CARD_STATUSES=['Not Issued','Issuance Pending','Issued','Activation Pending','Active','Suspended','Blocked','Expired','Replaced','Closed'];
/* The moves Track B allows (FR-CC-07.05). Not Issued, Replaced and Closed are final. */
const CC_CARD_FLOW={'Issuance Pending':['Issued','Not Issued'],'Issued':['Activation Pending','Blocked','Closed','Replaced'],
  'Activation Pending':['Active','Blocked','Closed','Replaced'],'Active':['Suspended','Blocked','Expired','Closed','Replaced'],
  'Suspended':['Active','Blocked','Expired','Closed','Replaced'],'Blocked':['Expired','Closed','Replaced'],'Expired':['Closed','Replaced']};
/* Provider-dependent outcomes: what each records, its values, and the right that records and verifies it. */
const CC_OUTCOMES={
  kyc:{label:'KYC outcome',values:['Verified','Provider Review','Failed'],perm:'card.enrollment.manage'},
  issuance:{label:'Card issuance',values:['Issued','Not Issued'],perm:'card.enrollment.manage'},
  dispatch:{label:'Physical card delivery',values:['Dispatched','Delivered','Failed','Returned'],perm:'card.enrollment.manage'},
  activation:{label:'Card activation',values:['Confirmed','Failed'],perm:'card.enrollment.manage'},
  lifecycle:{label:'Provider card status',values:['Suspended','Active','Blocked','Expired','Closed'],perm:'card.lifecycle.manage'}
};
/* What ADT asks the provider to do, and the status that confirms it. */
const CC_ACTIONS={Suspend:'Suspended',Reactivate:'Active',Block:'Blocked',Close:'Closed'};
const CC_LOST_REASONS=['Lost','Stolen','Damaged','Suspected fraud'];
const CC_REPL_REASONS=['Lost','Stolen','Damaged','Expired','Suspected fraud','Name or details change','Other'];
const ccOutcomes=[];
let ccOutNextId=150001,ccOutNextKey=1001;

function ccCard(id){return ccCards.find(function(c){return c.id===Number(id);})||null;}
function ccCardOfReq(r){return r&&r.enr&&r.enr.cardId?ccCard(r.enr.cardId):null;}
function ccCardsOfEmp(eid){return ccCards.filter(function(c){return c.employeeEid===eid;});}
function ccHolderName(c){return c?idEmpName(c.employeeEid):'';}
/* Mask an external reference (provider card token, KYC or delivery reference): its last four only. */
function ccMaskRef(ref){ref=String(ref||'').replace(/\s+/g,'');return ref?(ref.length>4?'••••'+ref.slice(-4):ref):'';}
function ccCardLabel(c){return c?ccMask(c.last4)+' · '+expKey(c):'';}
function ccCardEnded(c){return ['Not Issued','Replaced','Closed'].indexOf(c.status)>=0;}
function ccCanMove(c,to){return (CC_CARD_FLOW[c.status]||[]).indexOf(to)>=0;}
/* The status as the recorded events give it (FR-CC-07.08). */
function ccCardStatusOf(c){const e=c.events[c.events.length-1];return e?e.to:'Not Issued';}
/* An ADT hold or an unconfirmed request to the provider: no new ordinary loads (FR-CC-07.06). */
function ccCardUsable(c){return !!c&&c.status==='Active'&&!(c.hold&&c.hold.active)&&!c.pending;}
function ccPeopleWith(code,ent){
  ent=ent||ccEnt();
  return idUsers.filter(function(u){return typeof idInEntity==='function'&&idInEntity(u.userId,ent)&&typeof emsPersonCan==='function'&&emsPersonCan(u.userId,code);}).map(function(u){return u.userId;});
}
/* The existing bell; a card or enrollment notice names its readers by user ID (PO-9). */
function ccNotify(to,text,rec,evt){
  if(typeof caNotifSilent!=='undefined'&&caNotifSilent||typeof notifData==='undefined')return;
  const cid=rec?expKey(rec):'',ek=evt?cid+'|'+evt:'';
  /* FR-CC-20.05: a retry of the same business event (same event key) never notifies again; a new event always does. */
  const list=ccUniq([].concat(to||[]).filter(function(u){return u&&u!=='System';})).filter(function(u){
    return !ek||!notifData.some(function(n){return n.evt===ek&&(n.to||[]).indexOf(u)>=0;});});
  if(!list.length)return;
  notifData.unshift({name:text,cid:cid,evt:ek,time:'just now',pending:true,to:list,entity:(rec&&rec.entity)||ccEnt(),go:'card-record'});
  if(typeof notifSyncBell==='function')notifSyncBell();
}
function ccHolderUser(c){return idUserOfEmp(c.employeeEid);}
/* One Track B event: the status moves, its source and the actor are kept, nothing is overwritten. */
function ccCardEvent(c,to,src,A,o){
  o=o||{};
  c.events.push({from:c.status,to:to,source:src,at:ccStamp(A),iso:A.iso,by:A.who,actual:caVia(A),ref:o.ref||'',note:o.note||'',outcome:o.outcome||''});
  c.status=to;c.source=src;c.lastChange={at:ccStamp(A),by:A.who};
  ccLog(c,to,o.log||('Status '+to+' ('+src+').'),A);
}
function ccEnrEvent(r,what,value,src,A,o){
  o=o||{};
  r.enr.events.push({what:what,value:value,source:src,at:ccStamp(A),by:A.who,actual:caVia(A),ref:o.ref||'',note:o.note||''});
  if(src&&src!==CC_SRC_NONE)r.enr.source=src;
}
/* Enrollment for an approved request (FR-CC-08 fields). KYC depends on the programme's provider. */
function ccEnrNew(r,p){
  return {key:'ENR-'+r.key,status:'Pending',kyc:p&&p.provider?'Pending':'Not Required',kycRef:'',deliveryRequired:r.cardType==='Physical',
    delivery:r.cardType==='Physical'?'Not Dispatched':'',deliveryRef:'',activation:'Pending',source:CC_SRC_NONE,events:[],cardId:null,attempts:0,reminders:0};
}
function ccEnrReq(r){return !!r&&(r.kind==='card request'||r.kind==='card replacement');}

/* ── Submit an approved enrollment to the provider: the card record is born (FR-CC-06.01-02) ── */
/* d: ref (the provider's enrollment reference, optional), note. */
function ccEnrSubmit(reqId,d,A){
  A=A||ccNow();d=d||{};
  const r=ccReq(reqId);if(!r||r.entity!==ccEnt()||!ccEnrReq(r))return 'No such request.';
  if(!ccPCan(A,'card.enrollment.manage'))return caN(A.who)+' cannot manage card enrollment (card.enrollment.manage).';
  if(!r.enr||ccReqTrack(r)!=='Enrollment Pending')return expKey(r)+' is '+ccReqTrack(r)+'; only an approved request with enrollment pending goes to the provider.';
  if(['Pending','Failed'].indexOf(r.enr.status)<0)return 'Enrollment '+r.enr.key+' is already '+r.enr.status+'.';
  const p=ccProg(r.programmeId);if(!p)return 'The card programme is missing.';
  const old=r.kind==='card replacement'?ccCard(r.cardId):null;
  if(r.kind==='card replacement'&&(!old||ccCardEnded(old)))return 'The card being replaced is '+(old?old.status:'missing')+'.';
  /* PO-3: enrollment moves only for an eligible, Active employee; the old card does not count against the limit. */
  const el=ccEligibility(r.employeeEid,r.programmeId,'assign',old?old.id:null);
  if(!el.ok)return 'Not eligible now: '+el.reasons.join(' ');
  const c={id:ccCardNextId++,key:ccCardNextKey++,prefix:'CRD',kind:'card',entity:r.entity,employeeEid:r.employeeEid,holderUser:idUserOfEmp(r.employeeEid),
    requestId:r.id,programmeId:p.id,type:r.cardType,provider:p.provider||'',providerRef:'',last4:'',currency:p.currency,issueDate:'',
    status:'Not Issued',source:CC_SRC_NONE,replacementOf:old?old.id:null,replacedBy:null,
    delivery:r.cardType==='Physical'?{status:'Not Dispatched',ref:'',address:r.delivery?JSON.parse(JSON.stringify(r.delivery)):null,history:[]}:null,
    hold:null,holds:[],pending:null,reminders:0,events:[],logs:[],createdAt:ccStamp(A),createdBy:A.who,ownerSince:ccStamp(A),idMigrated:true};
  ccCardEvent(c,'Issuance Pending',CC_SRC_NONE,A,{ref:ccMaskRef(d.ref),
    log:'Card record '+expKey(c)+' created for '+ccHolderName(c)+' from '+expKey(r)+(old?' (replacing '+ccCardLabel(old)+')':'')+'. Issuance pending with '+ccProviderName(c.provider)
      +': no card is issued until the provider confirms it.'});
  ccCards.unshift(c);
  r.enr.status='Submitted';r.enr.cardId=c.id;r.enr.attempts=(r.enr.attempts||0)+1;r.enr.providerRef=ccMaskRef(d.ref);r.enr.submittedAt=ccStamp(A);r.enr.submittedBy=A.who;
  if(r.enr.kyc==='Failed')r.enr.kyc='Pending';
  r.enr.activation='Pending';
  ccEnrEvent(r,'Enrollment','Submitted',CC_SRC_NONE,A,{ref:r.enr.providerRef,note:String(d.note||'').trim()});
  ccLog(r,'Enrollment Pending','Enrollment '+r.enr.key+' submitted to '+ccProviderName(c.provider)+' by '+caN(A.who)+(r.enr.providerRef?' (reference '+r.enr.providerRef+')':'')
    +'. Card record '+expKey(c)+' is Issuance Pending; nothing is issued until the provider confirms it.',A);
  ccNotify([idUserOfEmp(r.employeeEid)],expKey(r)+': your card enrollment was sent to '+ccProviderName(c.provider)+'. You will be told when the card is issued.',r);
  return '';
}
/* Cancel an enrollment that has not completed (Track A → Cancelled). The card record, if any, ends Not Issued. */
function ccEnrCancel(reqId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const r=ccReq(reqId);if(!r||r.entity!==ccEnt()||!r.enr)return 'No such enrollment.';
  if(!ccPCan(A,'card.enrollment.manage'))return caN(A.who)+' cannot manage card enrollment (card.enrollment.manage).';
  if(['Pending','Submitted','Failed'].indexOf(r.enr.status)<0)return 'Enrollment '+r.enr.key+' is '+r.enr.status+'; it cannot be cancelled.';
  if(!reason)return 'Say why the enrollment is cancelled.';
  const c=ccCardOfReq(r);
  if(c&&c.status==='Issuance Pending')ccCardEvent(c,'Not Issued',CC_SRC_NONE,A,{note:reason,log:'Enrollment cancelled in ADT by '+caN(A.who)+': '+reason+'. No card was issued.'});
  r.enr.status='Cancelled';r.track='Cancelled';
  ccEnrEvent(r,'Enrollment','Cancelled',CC_SRC_NONE,A,{note:reason});
  ccLog(r,'Cancelled','Enrollment '+r.enr.key+' cancelled by '+caN(A.who)+': '+reason+'.',A);
  ccNotify([idUserOfEmp(r.employeeEid)],expKey(r)+': your card enrollment was cancelled.',r);
  return '';
}

/* ── Provider outcomes: the one entry point (FR-CC-07.03, 07.09; 08.04, 08.11, 08.12) ── */
function ccOutcome(id){return ccOutcomes.find(function(o){return o.id===Number(id);})||null;}
function ccOutcomesFor(type,targetId,status){return ccOutcomes.filter(function(o){return o.type===type&&o.targetId===Number(targetId)&&(!status||o.status===status);});}
function ccOutcomesAwaiting(rec){
  return ccOutcomes.filter(function(o){return o.status==='Awaiting Verification'&&(rec.kind==='card'?o.cardId===rec.id:o.reqId===rec.id);});
}
/* Is the outcome possible now? '' or why not. */
function ccOutcomeCheck(type,targetId,value,d){
  d=d||{};
  if(type==='kyc'){
    const r=ccReq(targetId);if(!r||!r.enr)return 'No such enrollment.';
    if(r.enr.status!=='Submitted')return 'KYC is recorded once the enrollment is submitted to the provider (enrollment is '+r.enr.status+').';
    if(r.enr.kyc==='Not Required')return ccProviderName((ccProg(r.programmeId)||{}).provider)+' needs no KYC for this programme.';
    if(['Verified','Failed'].indexOf(r.enr.kyc)>=0)return 'KYC is already '+r.enr.kyc+'.';
    return '';
  }
  const c=ccCard(targetId);if(!c)return 'No such card.';
  if(type==='issuance'){
    if(c.status!=='Issuance Pending')return expKey(c)+' is '+c.status+'; issuance is recorded only while it is Issuance Pending.';
    const r=ccReq(c.requestId);
    if(value==='Issued'){
      if(r&&r.enr&&['Verified','Not Required'].indexOf(r.enr.kyc)<0)return 'KYC is '+(r.enr.kyc)+'. The provider issues a card only after KYC is verified.';
      const l4=String(d.last4==null?'':d.last4).replace(/\s+/g,'');
      if(/\d{5,}/.test(l4))return 'Enter only the last four digits. ADT never stores a full card number, CVV or PIN.';
      if(!/^\d{4}$/.test(l4))return 'Enter the last four digits of the issued card.';
    }
    return '';
  }
  if(type==='dispatch'){
    if(c.type!=='Physical')return expKey(c)+' is a virtual card; nothing is delivered.';
    if(c.status!=='Issued')return expKey(c)+' is '+c.status+'; delivery is tracked once the card is issued and before it is activated.';
    const cur=c.delivery.status;
    if(value==='Dispatched'&&['Not Dispatched','Failed','Returned'].indexOf(cur)<0)return 'The card is already '+cur+'.';
    if(value!=='Dispatched'&&cur!=='Dispatched')return 'Delivery is '+cur+'; record a dispatch first.';
    return '';
  }
  if(type==='activation'){
    if(c.status!=='Activation Pending')return expKey(c)+' is '+c.status+'; activation is recorded only while it is Activation Pending.';
    if(value==='Confirmed'){
      /* FR-CC-09.07, PO-3: still eligible when the card goes live (this card does not count against the limit). */
      const el=ccEligibility(c.employeeEid,c.programmeId,'activate',c.id);if(!el.ok)return 'Not eligible to activate: '+el.reasons.join(' ');
    }
    return '';
  }
  if(type==='lifecycle'){
    if(ccCardEnded(c))return expKey(c)+' is '+c.status+'; its lifecycle has ended.';
    if(value==='Active'&&c.status!=='Suspended')return 'Only a suspended card is reactivated'+(c.status==='Activation Pending'?'; record its activation instead':'')+'.';
    if(value==='Active'&&c.hold&&c.hold.active&&c.hold.type!=='Temporary')return 'A card reported '+c.hold.reason.toLowerCase()+' is not reactivated; block, then replace or close it.';
    if(!ccCanMove(c,value))return 'A card that is '+c.status+' cannot become '+value+'.';
    if(value==='Active'){const el=ccEligibility(c.employeeEid,c.programmeId,'activate',c.id);if(!el.ok)return 'Not eligible to reactivate: '+el.reasons.join(' ');}
    return '';
  }
  return 'Unknown outcome.';
}
/* Record an outcome. d: value, source, ref, evidence, date (ISO), note, last4. Manually Verified waits for a
   second person; Illustrative applies at once. Returns {error} or {rec}. */
function ccOutcomeRecord(type,targetId,d,A){
  A=A||ccNow();d=d||{};
  const def=CC_OUTCOMES[type];if(!def)return {error:'Unknown outcome.'};
  const rec=type==='kyc'?ccReq(targetId):ccCard(targetId);
  if(!rec||rec.entity!==ccEnt())return {error:'No such record in this entity.'};
  if(!ccPCan(A,def.perm))return {error:caN(A.who)+' cannot record '+def.label.toLowerCase()+' ('+def.perm+').'};
  if(def.values.indexOf(d.value)<0)return {error:'Pick the outcome.'};
  const src=d.source;
  if(src===CC_SRC_PROVIDER)return {error:'Provider Confirmed outcomes arrive only from a connected provider integration. '+ccProviderName(type==='kyc'?(ccProg(rec.programmeId)||{}).provider:rec.provider)+' is not connected; record Manually Verified evidence instead.'};
  if(src===CC_DEMO){
    if(!ccDemoOn(rec.entity))return {error:'Presentation mode is off for '+idEntityName(rec.entity)+'; outcomes need provider evidence (Manually Verified).'};
    if(!ccPCan(A,'card.demo.simulate'))return {error:caN(A.who)+' cannot record illustrative events (card.demo.simulate).'};
  }else if(src===CC_SRC_MANUAL){
    if(String(d.ref||'').trim().length<3)return {error:'Enter the provider\'s reference for this outcome.'};
    if(!String(d.evidence||'').trim())return {error:'Attach or describe the provider evidence (an email, a portal screen or a letter).'};
    if(!d.date||d.date>wbToday())return {error:'Enter the date the provider confirmed it (not in the future).'};
  }else return {error:'Pick the confirmation source.'};
  const why=ccOutcomeCheck(type,targetId,d.value,d);if(why)return {error:why};
  const card=type==='kyc'?null:rec,req=type==='kyc'?rec:ccReq(rec.requestId);
  if(ccOutcomes.some(function(o){return o.type===type&&o.targetId===rec.id&&o.status==='Awaiting Verification';}))
    return {error:'A '+def.label.toLowerCase()+' for '+expKey(rec)+' is already awaiting verification.'};
  const o={id:ccOutNextId++,key:ccOutNextKey++,prefix:'PEV',entity:rec.entity,type:type,targetId:rec.id,reqId:req?req.id:null,cardId:card?card.id:null,
    value:d.value,source:src,ref:ccMaskRef(d.ref),evidence:String(d.evidence||'').trim(),date:d.date||A.iso,note:String(d.note||'').trim(),
    last4:type==='issuance'&&d.value==='Issued'?String(d.last4).replace(/\s+/g,''):'',
    recordedBy:A.who,actual:caVia(A),recordedAt:ccStamp(A),status:src===CC_DEMO?'Applied':'Awaiting Verification',logs:[]};
  ccOutcomes.unshift(o);
  if(src===CC_DEMO){ccOutcomeApply(o,A);return {rec:o};}
  const what=def.label+' "'+d.value+'"';
  ccLog(rec,type==='kyc'?ccReqTrack(rec):rec.status,what+' recorded by '+caN(A.who)+' from provider evidence ('+o.ref+'). It takes effect once another person verifies it ('+expKey(o)+').',A);
  ccNotify(ccPeopleWith(def.perm,rec.entity).filter(function(u){return u!==A.who&&u!==(o.actual||'');}),expKey(o)+': '+what+' for '+expKey(rec)+' awaits your verification.',rec);
  return {rec:o};
}
/* The checker: someone other than the person who recorded it - also through Switch User. */
function ccOutcomeVerify(id,A){
  A=A||ccNow();
  const o=ccOutcome(id);if(!o||o.entity!==ccEnt())return 'No such outcome.';
  if(o.status!=='Awaiting Verification')return expKey(o)+' is '+o.status+'.';
  const def=CC_OUTCOMES[o.type];
  if(!ccPCan(A,def.perm))return caN(A.who)+' cannot verify '+def.label.toLowerCase()+' ('+def.perm+').';
  const realA=caVia(A)||A.who,realO=o.actual||o.recordedBy;
  if(A.who===o.recordedBy||realA===realO)return 'Maker-checker: '+caN(o.recordedBy)+' recorded '+expKey(o)+'; another person verifies it.';
  const why=ccOutcomeCheck(o.type,o.targetId,o.value,o);if(why)return 'Cannot apply it now: '+why;
  o.status='Verified';o.verifiedBy=A.who;o.verifiedActual=caVia(A);o.verifiedAt=ccStamp(A);
  ccOutcomeApply(o,A);
  return '';
}
function ccOutcomeReject(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const o=ccOutcome(id);if(!o||o.entity!==ccEnt())return 'No such outcome.';
  if(o.status!=='Awaiting Verification')return expKey(o)+' is '+o.status+'.';
  if(!ccPCan(A,CC_OUTCOMES[o.type].perm))return caN(A.who)+' cannot verify this outcome.';
  if(A.who===o.recordedBy)return 'Maker-checker: '+caN(o.recordedBy)+' recorded '+expKey(o)+'; another person reviews it.';
  if(!reason)return 'Say why the evidence is rejected.';
  o.status='Rejected';o.rejectedBy=A.who;o.rejectedAt=ccStamp(A);o.rejectReason=reason;
  const rec=o.type==='kyc'?ccReq(o.reqId):ccCard(o.cardId);
  ccLog(rec,o.type==='kyc'?ccReqTrack(rec):rec.status,CC_OUTCOMES[o.type].label+' "'+o.value+'" ('+expKey(o)+') rejected by '+caN(A.who)+': '+reason+'. Nothing changed.',A);
  ccNotify([o.recordedBy],expKey(o)+' was rejected: '+reason,rec);
  return '';
}
/* Apply a confirmed outcome: Track A and Track B move together, each event carrying the source. */
function ccOutcomeApply(o,A){
  const src=o.source,tag=src===CC_DEMO?' ('+CC_DEMO+': not a bank event)':' ('+src+', '+expKey(o)+')',holder=function(c){return [ccHolderUser(c)];};
  if(o.type==='kyc'){
    const r=ccReq(o.reqId);r.enr.kyc=o.value;r.enr.kycRef=o.ref;
    ccEnrEvent(r,'KYC',o.value,src,A,{ref:o.ref,note:o.note});
    ccLog(r,ccReqTrack(r),'KYC '+o.value+tag+'.',A);
    if(o.value==='Failed'){
      const c=ccCardOfReq(r);if(c&&c.status==='Issuance Pending')ccCardEvent(c,'Not Issued',src,A,{ref:o.ref,outcome:expKey(o),log:'Not issued: KYC failed at the provider'+tag+'.'});
      r.enr.status='Failed';ccEnrEvent(r,'Enrollment','Failed',src,A,{note:'KYC failed'});
      ccNotify([idUserOfEmp(r.employeeEid)],expKey(r)+': the provider could not complete your KYC. Your card administrator will contact you.',r);
    }
    return;
  }
  const c=ccCard(o.cardId),r=ccReq(c.requestId);
  if(o.type==='issuance'){
    if(o.value==='Not Issued'){
      ccCardEvent(c,'Not Issued',src,A,{ref:o.ref,outcome:expKey(o),log:'The provider did not issue the card'+tag+'.'});
      if(r&&r.enr){r.enr.status='Failed';ccEnrEvent(r,'Issuance','Not Issued',src,A,{ref:o.ref});ccLog(r,ccReqTrack(r),'Card not issued'+tag+'. Enrollment '+r.enr.key+' failed; it may be resubmitted or cancelled.',A);}
      ccNotify(holder(c),expKey(c)+': the provider did not issue your card.',c);
      return;
    }
    c.last4=o.last4;c.providerRef=o.ref;c.issueDate=o.date;
    ccCardEvent(c,'Issued',src,A,{ref:o.ref,outcome:expKey(o),log:'Issued: '+ccMask(c.last4)+tag+'. Held by '+ccHolderName(c)+' (fixed for the card\'s life).'});
    if(r&&r.enr){r.enr.status='Completed';r.track='Enrollment Completed';ccEnrEvent(r,'Issuance','Issued',src,A,{ref:o.ref});
      ccLog(r,'Enrollment Completed','Enrollment '+r.enr.key+' completed: card '+ccCardLabel(c)+' issued'+tag+'.',A);}
    /* A replacement supersedes the old card only now, when the new one is issued (FR-CC-09.05-06, 06.09). */
    const old=c.replacementOf?ccCard(c.replacementOf):null;
    if(old&&ccCanMove(old,'Replaced')){
      old.replacedBy=c.id;if(old.pending){ccLog(old,old.status,'Pending '+old.pending.action.toLowerCase()+' request closed: the card is replaced.',A);old.pending=null;}
      ccCardEvent(old,'Replaced',src,A,{ref:o.ref,outcome:expKey(o),log:'Replaced by '+ccCardLabel(c)+tag+'. Its history, loads and expense references are kept.'});
    }
    if(c.type==='Virtual')ccCardEvent(c,'Activation Pending',src,A,{log:'Virtual card issued: awaiting activation by '+ccHolderName(c)+'.'});
    ccNotify(holder(c),'Your '+c.type.toLowerCase()+' card '+ccCardLabel(c)+' was issued'+(src===CC_DEMO?' (Illustrative)':'')+'.'+(c.type==='Virtual'?' Activate it in the provider\'s app.':' It will be delivered to you.'),c);
    return;
  }
  if(o.type==='dispatch'){
    c.delivery.history.push({status:o.value,at:ccStamp(A),by:A.who,source:src,ref:o.ref,note:o.note,outcome:expKey(o)});
    c.delivery.status=o.value;if(o.value==='Dispatched')c.delivery.ref=o.ref;
    if(r&&r.enr){r.enr.delivery=o.value;r.enr.deliveryRef=c.delivery.ref;ccEnrEvent(r,'Delivery',o.value,src,A,{ref:o.ref});}
    ccLog(c,c.status,'Delivery '+o.value+tag+'.',A);
    if(o.value==='Delivered')ccCardEvent(c,'Activation Pending',src,A,{log:'Delivered: awaiting activation by '+ccHolderName(c)+'.'});
    ccNotify(holder(c),expKey(c)+': card delivery '+o.value.toLowerCase()+'.',c);
    return;
  }
  if(o.type==='activation'){
    if(r&&r.enr){r.enr.activation=o.value;ccEnrEvent(r,'Activation',o.value,src,A,{ref:o.ref});}
    if(o.value==='Confirmed'){
      ccCardEvent(c,'Active',src,A,{ref:o.ref,outcome:expKey(o),log:'Active'+tag+'.'});
      ccNotify(holder(c),'Your card '+ccCardLabel(c)+' is active'+(src===CC_DEMO?' (Illustrative)':'')+'.',c);
    }else{ccLog(c,c.status,'Activation failed'+tag+'. The card stays Activation Pending.',A);ccNotify(holder(c),expKey(c)+': card activation failed. Try again in the provider\'s app.',c);}
    return;
  }
  if(o.type==='lifecycle'){
    const pend=c.pending;
    ccCardEvent(c,o.value,src,A,{ref:o.ref,outcome:expKey(o),log:o.value+tag+(pend?' (requested by '+caN(pend.by)+': '+pend.reason+')':'')+'.'});
    if(pend){if(pend.to!==o.value)ccLog(c,c.status,'The pending '+pend.action.toLowerCase()+' request is closed: the provider reported '+o.value+'.',A);c.pending=null;}
    if(o.value==='Active'&&c.hold&&c.hold.active&&c.hold.type==='Temporary')ccHoldEnd(c,'Card reactivated',A);
    ccNotify(holder(c),'Your card '+ccCardLabel(c)+' is now '+o.value+(src===CC_DEMO?' (Illustrative)':'')+'.',c);
  }
}

/* ── Requests to the provider: suspend, reactivate, block, close (pending until confirmed) ── */
function ccCardRequest(cardId,action,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const to=CC_ACTIONS[action];if(!to)return 'Unknown action.';
  if(!ccPCan(A,'card.lifecycle.manage'))return caN(A.who)+' cannot manage card lifecycles (card.lifecycle.manage).';
  if(ccCardEnded(c))return expKey(c)+' is '+c.status+'; its lifecycle has ended.';
  if(action==='Reactivate'&&c.status!=='Suspended')return 'Only a suspended card is reactivated.';
  if(!ccCanMove(c,to))return 'A card that is '+c.status+' cannot be '+(action==='Close'?'closed':action.toLowerCase()+(action.slice(-1)==='e'?'d':'ed'))+'.';
  if(action==='Reactivate'&&c.hold&&c.hold.active&&c.hold.type!=='Temporary')return 'A card reported '+c.hold.reason.toLowerCase()+' is not reactivated; block, then replace or close it.';
  if(!reason)return 'Say why.';
  if(c.pending){
    if(c.pending.action===action)return action+' is already requested ('+c.pending.at+').';
    if(['Block','Close'].indexOf(c.pending.action)>=0&&['Suspend','Reactivate'].indexOf(action)>=0)return c.pending.action+' is already requested; it cannot be replaced by '+action.toLowerCase()+'.';
    ccLog(c,c.status,'Pending '+c.pending.action.toLowerCase()+' request replaced by '+action.toLowerCase()+'.',A);
  }
  c.pending={action:action,to:to,reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(c,c.status,action+' requested by '+caN(A.who)+': '+reason+'. Pending '+ccProviderName(c.provider)+' confirmation - ADT has not changed the card at the bank.',A);
  ccNotify([ccHolderUser(c)],expKey(c)+': '+action.toLowerCase()+' of your card was requested ('+reason+'). It takes effect when the provider confirms it.',c);
  return '';
}
function ccCardCancelPending(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!c.pending)return 'Nothing is pending for '+expKey(c)+'.';
  if(!ccPCan(A,'card.lifecycle.manage'))return caN(A.who)+' cannot manage card lifecycles (card.lifecycle.manage).';
  if(c.hold&&c.hold.active&&c.hold.type!=='Temporary'&&c.pending.action==='Block')return 'A card reported '+c.hold.reason.toLowerCase()+' keeps its block request.';
  if(!reason)return 'Say why the request is withdrawn.';
  ccLog(c,c.status,'Pending '+c.pending.action.toLowerCase()+' request withdrawn by '+caN(A.who)+': '+reason+'.',A);c.pending=null;
  return '';
}

/* ── Internal holds and safety reports (FR-CC-17 in part; act in ADT at once) ── */
/* Who may act on a card for safety: its holder, their manager (team view), or an administrator. */
function ccSafetyMay(A,c){
  if(!ccPCan(A,'card.safety.report'))return false;
  const me=idEmpOfUser(A.who);
  if(me&&me.eid===c.employeeEid)return true;
  /* Acting on someone else's card needs a card management right - seeing every card (Compliance) is not enough. */
  if(ccPCan(A,'card.lifecycle.manage')||ccPCan(A,'card.enrollment.manage'))return true;
  return ccPCan(A,'card.view.team')&&typeof caManagerOf==='function'&&caManagerOf(c.employeeEid)===A.who;
}
function ccHoldEnd(c,why,A){if(!c.hold)return;c.hold.active=false;c.hold.endedAt=ccStamp(A);c.hold.endedBy=A.who;c.hold.endReason=why;ccLog(c,c.status,c.hold.type+' hold ended: '+why+'.',A);c.hold=null;}
function ccHoldPlace(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!ccSafetyMay(A,c))return caN(A.who)+' cannot place a hold on '+expKey(c)+'.';
  if(ccCardEnded(c))return expKey(c)+' is '+c.status+'.';
  if(c.hold&&c.hold.active)return expKey(c)+' is already on hold ('+c.hold.type+').';
  if(!reason)return 'Say why the card is held.';
  c.hold={type:'Temporary',reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A),active:true};c.holds.push(c.hold);
  ccLog(c,c.status,'Temporary hold placed in ADT by '+caN(A.who)+': '+reason+'. No new card loads while it holds. This is not a freeze at the bank; '
    +'an administrator can ask the provider to suspend the card.',A);
  const to=ccPeopleWith('card.lifecycle.manage',c.entity).concat([ccHolderUser(c)]).filter(function(u){return u!==A.who;});
  ccNotify(to,expKey(c)+' ('+ccHolderName(c)+') was put on a temporary hold in ADT: '+reason,c);
  return '';
}
/* A temporary hold ends by the holder who placed it, or an administrator. A lost or stolen hold never ends:
   the card is blocked, then replaced or closed. */
function ccHoldRelease(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!c.hold||!c.hold.active)return expKey(c)+' is not on hold.';
  if(c.hold.type!=='Temporary')return 'A card reported '+c.hold.reason.toLowerCase()+' stays on hold until it is blocked and replaced or closed.';
  if(!ccPCan(A,'card.lifecycle.manage'))return 'Ending a hold needs an authorized review (card.lifecycle.manage).'+(ccSafetyMay(A,c)?' Request the release instead; a card administrator reviews it.':'');
  if(!reason)return 'Say why the hold is released.';
  const rq=c.hold.releaseRequest;
  ccHoldEnd(c,'released after review by '+caN(A.who)+(rq?' (requested by '+caN(rq.by)+')':'')+' - '+reason,A);
  ccNotify([ccHolderUser(c)].concat(rq?[rq.by]:[]).filter(function(u){return u!==A.who;}),expKey(c)+': the temporary hold on your card was released after review ('+reason+').',c);
  return '';
}
/* The cardholder (or someone else allowed to act on the card for safety) asks for the temporary hold to end. */
function ccHoldReleaseRequest(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!c.hold||!c.hold.active)return expKey(c)+' is not on hold.';
  if(c.hold.type!=='Temporary')return 'A card reported '+c.hold.reason.toLowerCase()+' stays on hold until it is blocked and replaced or closed.';
  if(!ccSafetyMay(A,c))return caN(A.who)+' cannot act on '+expKey(c)+'.';
  if(c.hold.releaseRequest)return 'Release of the hold was already requested by '+caN(c.hold.releaseRequest.by)+' ('+c.hold.releaseRequest.at+').';
  if(!reason)return 'Say why the hold can end.';
  c.hold.releaseRequest={reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(c,c.status,'Release of the temporary hold requested by '+caN(A.who)+': '+reason+'. The hold stays until a card administrator reviews it.',A);
  ccNotify(ccPeopleWith('card.lifecycle.manage',c.entity).filter(function(u){return u!==A.who;}),expKey(c)+' ('+ccHolderName(c)+'): release of the temporary hold requested - please review.',c);
  return '';
}
/* The reviewer keeps the hold: the request is declined with a reason. */
function ccHoldKeep(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!c.hold||!c.hold.active||!c.hold.releaseRequest)return 'No hold release is requested for '+expKey(c)+'.';
  if(!ccPCan(A,'card.lifecycle.manage'))return 'Reviewing a hold needs card.lifecycle.manage.';
  if(!reason)return 'Say why the hold stays.';
  const rq=c.hold.releaseRequest;c.hold.releaseRequest=null;
  ccLog(c,c.status,'Release request of '+caN(rq.by)+' declined by '+caN(A.who)+': '+reason+'. The hold stays.',A);
  ccNotify([rq.by,ccHolderUser(c)].filter(function(u,i,a){return u&&u!==A.who&&a.indexOf(u)===i;}),expKey(c)+': the temporary hold stays ('+reason+').',c);
  return '';
}
/* Report a card lost, stolen, damaged or misused: an immediate ADT hold, and a block requested from the
   provider. The cardholder is told to call the issuer's 24x7 line too: ADT cannot block a card at the bank. */
function ccReportLost(cardId,d,A){
  A=A||ccNow();d=d||{};
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!ccSafetyMay(A,c))return caN(A.who)+' cannot report '+expKey(c)+'.';
  if(ccCardEnded(c))return expKey(c)+' is '+c.status+'.';
  if(CC_LOST_REASONS.indexOf(d.reason)<0)return 'Pick what happened to the card.';
  if(c.hold&&c.hold.active&&c.hold.type!=='Temporary')return expKey(c)+' is already reported '+c.hold.reason.toLowerCase()+'.';
  const note=String(d.note||'').trim();
  if(c.hold&&c.hold.active)ccHoldEnd(c,'superseded by a '+d.reason.toLowerCase()+' report',A);
  c.hold={type:'Safety report',reason:d.reason,note:note,by:A.who,actual:caVia(A),at:ccStamp(A),active:true};c.holds.push(c.hold);
  ccLog(c,c.status,'Reported '+d.reason.toLowerCase()+' by '+caN(A.who)+(note?': '+note:'')+'. On hold in ADT at once.',A);
  if(ccCanMove(c,'Blocked')&&!(c.pending&&['Block','Close'].indexOf(c.pending.action)>=0)){
    if(c.pending)ccLog(c,c.status,'Pending '+c.pending.action.toLowerCase()+' request replaced by a block.',A);
    c.pending={action:'Block',to:'Blocked',reason:'Reported '+d.reason.toLowerCase(),by:A.who,actual:caVia(A),at:ccStamp(A),auto:true};
    ccLog(c,c.status,'Block requested from '+ccProviderName(c.provider)+'. Pending provider confirmation - ADT has not blocked the card at the bank.',A);
  }
  ccNotify(ccPeopleWith('card.lifecycle.manage',c.entity).filter(function(u){return u!==A.who&&u!==ccHolderUser(c);}),expKey(c)+' ('+ccHolderName(c)+') was reported '+d.reason.toLowerCase()+'. Block it at '+ccProviderName(c.provider)+' and record the confirmation.',c);
  /* The cardholder always gets a confirmation (UAT-CC-82): what happened in ADT, what is still pending, what to do now. */
  ccNotify([ccHolderUser(c)],'Your card '+ccCardLabel(c)+' was reported '+d.reason.toLowerCase()+(A.who===ccHolderUser(c)?'':' by '+caN(A.who))+'. It is on hold in ADT and a block was requested from '
    +ccProviderName(c.provider)+'; the block is confirmed only when they confirm it. Call their 24x7 helpline as well.',c);
  return '';
}
/* An activation reminder to the cardholder (FR-CC-08.08), through the existing bell. */
function ccActivationRemind(cardId,A){
  A=A||ccNow();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const me=idEmpOfUser(A.who),own=!!me&&me.eid===c.employeeEid&&(ccPCan(A,'card.view.own')||ccPCan(A,'card.safety.report'));
  if(!ccPCan(A,'card.enrollment.manage')&&!own)return caN(A.who)+' cannot send activation reminders (card.enrollment.manage).';
  if(c.status!=='Activation Pending')return expKey(c)+' is '+c.status+'; reminders are for cards awaiting activation.';
  c.reminders=(c.reminders||0)+1;
  ccLog(c,c.status,'Activation reminder '+c.reminders+(own&&!ccPCan(A,'card.enrollment.manage')?' requested by the cardholder':' sent to '+ccHolderName(c)+' by '+caN(A.who))+'.',A);
  ccNotify([ccHolderUser(c)],'Reminder: activate your card '+ccCardLabel(c)+' in the '+ccProviderName(c.provider)+' app. ADT cannot activate it for you.',c,'reminder-'+c.reminders);
  return '';
}

/* ── Replacement (FR-CC-09.04-09): its own request, its own route, a new card linked to the old ── */
function ccOpenReplacementOf(cardId,exceptId){
  return ccRequests.find(function(r){return r.kind==='card replacement'&&r.cardId===Number(cardId)&&r.id!==exceptId
    &&(['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0||ccReqTrack(r)==='Enrollment Pending');})||null;
}
function ccRepMayRaise(A,c){
  const me=idEmpOfUser(A.who),own=!!me&&me.eid===c.employeeEid;
  if(own)return ccPCan(A,'card.replacement.request')||ccPCan(A,'card.replacement.manage')?'':caN(A.who)+' cannot request a replacement (card.replacement.request).';
  return ccPCan(A,'card.replacement.manage')?'':caN(A.who)+' cannot request a replacement for someone else\'s card (card.replacement.manage).';
}
function ccRepValidate(c,f){
  const p=ccProg(c.programmeId);
  if(!p)return 'The card programme is missing.';
  if(p.forms.indexOf(f.cardType)<0)return p.name+' issues '+p.forms.join(' and ')+' cards only.';
  if(CC_REPL_REASONS.indexOf(f.reason)<0)return 'Pick why the card is replaced.';
  if(f.reason==='Other'&&!f.purpose)return 'Describe why when the reason is Other.';
  if(f.cardType==='Physical'){
    if(!f.delivery||CC_DELIVERY.indexOf(f.delivery.mode)<0)return 'Pick where the physical card is delivered.';
    if(f.delivery.mode==='Other address'&&f.delivery.text.length<10)return 'Enter the full delivery address.';
  }
  return '';
}
/* d: cardId, reason, purpose, cardType (default: the same), deliveryMode, deliveryText, comments. */
function ccRepCreate(d,submit,A){
  A=A||ccNow();d=d||{};
  const c=ccCard(d.cardId);if(!c||c.entity!==ccEnt())return {error:'Pick the card to replace.'};
  if(['Not Issued','Issuance Pending','Replaced','Closed'].indexOf(c.status)>=0)return {error:'A card that is '+c.status+' is not replaced.'};
  const may=ccRepMayRaise(A,c);if(may)return {error:may};
  const dup=ccOpenReplacementOf(c.id);if(dup)return {error:expKey(c)+' already has replacement '+expKey(dup)+' ('+ccReqTrack(dup)+').'};
  const p=ccProg(c.programmeId),e=idEmp(c.employeeEid);
  const f={programmeId:p.id,cardType:d.cardType||c.type,reason:d.reason,purpose:String(d.purpose||'').trim(),comments:String(d.comments||'').trim(),proof:'',
    delivery:(d.cardType||c.type)==='Physical'?{mode:d.deliveryMode||'',text:String(d.deliveryText||'').trim()}:null,currency:p.currency,wallets:p.wallets.slice()};
  const ve=ccRepValidate(c,f);if(ve)return {error:ve};
  const el=ccEligibility(c.employeeEid,p.id,submit?'submit':'draft',c.id);if(!el.ok)return {error:el.reasons.join(' ')};
  const me=idEmpOfUser(A.who),self=!!me&&me.eid===c.employeeEid;
  const r=Object.assign({id:ccReqNextId++,key:ccReqNextKey++,prefix:'CRP',kind:'card replacement',entity:ccEnt(),cardId:c.id,claimFor:self?'Self':'Others',mode:self?'Self':'On Behalf',
    employeeEid:e.eid,name:e.name,empId:e.empId,email:e.email||'',dept:e.dept||'',designation:e.jobTitle||e.designation||'',status:'Draft',createdBy:A.who,createdAt:ccStamp(A),
    migrated:true,idMigrated:true,category:'Card Replacement',title:'',track:'',eligibility:{at:ccStamp(A),ok:el.ok,draftOnly:el.draftOnly,reasons:el.reasons},consentSimulated:!!el.consentSimulated,
    lines:[{id:1,title:'Replacement · '+f.cardType,amount:1,subCat:'Card',start:A.iso,end:A.iso,status:'Pending',approved:null}],logs:[]},f);
  r.currency='card';r.title=ccReqTitle(r);
  ccLog(r,'Draft','Replacement of '+ccCardLabel(c)+' drafted by '+caN(A.who)+(self?'':' for '+e.name)+' ('+f.reason+(f.purpose?': '+f.purpose:'')+'). The current card is unchanged until the new one is issued.',A);
  ccLog(c,c.status,'Replacement '+expKey(r)+' drafted by '+caN(A.who)+' ('+f.reason+').',A);
  ccRequests.unshift(r);
  if(submit){const se=ccRepSubmit(r.id,A);if(se){ccRequests.shift();ccReqNextId--;ccReqNextKey--;c.logs.shift();return {error:se};}}
  return {rec:r};
}
function ccRepPreflight(r,o){
  const c=ccCard(r.cardId);if(!c||['Not Issued','Issuance Pending','Replaced','Closed'].indexOf(c.status)>=0)return {error:'The card being replaced is '+(c?c.status:'missing')+'.'};
  const el=ccEligibility(r.employeeEid,r.programmeId,'submit',r.cardId);if(!el.ok)return {error:'Not eligible: '+el.reasons.join(' ')};
  const dup=ccOpenReplacementOf(r.cardId,r.id);if(dup&&dup.status!=='Draft')return {error:expKey(c)+' already has replacement '+expKey(dup)+'.'};
  return ccEnginePreflight(r,o);
}
function ccRepSubmit(id,A){
  A=A||ccNow();
  const r=ccReq(id);if(!r||r.entity!==ccEnt()||r.kind!=='card replacement')return 'No such replacement request.';
  if(r.status!=='Draft')return 'Only a draft is submitted; '+expKey(r)+' is '+r.status+'.';
  const c=ccCard(r.cardId),may=c?ccRepMayRaise(A,c):'The card is missing.';if(may)return may;
  const pre=ccRepPreflight(r);if(pre.error)return pre.error;
  if(!caStart(r,pre,A))return expKey(r)+' already has an approval in progress.';
  return '';
}
function ccRepOnFinal(r,A){
  if(['Approved','Partially Approved'].indexOf(r.status)<0)return;
  const p=ccProg(r.programmeId),c=ccCard(r.cardId);
  r.track='Enrollment Pending';r.enr=ccEnrNew(r,p);
  ccLog(r,'Enrollment Pending','Approved. Enrollment '+r.enr.key+' for the replacement is pending. '+ccCardLabel(c)+' stays as it is until the new card is issued.',A);
  if(c)ccLog(c,c.status,'Replacement '+expKey(r)+' approved; the new card is pending enrollment.',A);
}
ccRegisterKind('card replacement',{
  perms:{approve:'card.request.approve',submit:'card.replacement.request',others:'card.replacement.manage',withdraw:'card.replacement.request',withdrawOthers:'card.replacement.manage'},
  preflight:function(r,o){return ccRepPreflight(r,o);},
  decisionCheck:function(r,items){
    if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
    const el=ccEligibility(r.employeeEid,r.programmeId,'approve',r.cardId);return el.ok?'':'Cannot approve '+expKey(r)+' now: '+el.reasons.join(' ');},
  onFinal:function(r,A){ccRepOnFinal(r,A);},
  finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+(r.status!=='Rejected'?' - the new card is pending enrollment; your current card is unchanged until it is issued':'')+'.';}
});
if(typeof CA_TYPE_LABEL!=='undefined')CA_TYPE_LABEL['card replacement']='Card Replacement';


/* ══ 7D · Card controls and wallet mapping (FR-CC-10, FR-CC-11; US-CC-07, US-CC-08) ═══════════════════
   Controls are the limits and restrictions ADT records for a programme (its defaults) and for one card
   (its restrictions). A card is never looser than its programme: the two merge and the stricter value
   wins (FR-CC-10.04-05). Each change is a numbered, dated version with a reason, kept with its before and
   after (FR-CC-10.07, FR-CC-22.03). A change that tightens applies at once. One that relaxes - a limit
   raised or removed; a category, channel, merchant code or country let back in; international use
   allowed - waits for approval on the shared engine (FR-CC-10.06): Card Control Change for a card (the
   cardholder's reporting manager, then a card approver) and Card Programme Control for programme defaults
   (a card approver). No provider is connected, so these are the INTENDED controls: ADT never claims the
   payment network enforces them (FR-CC-10.08-09). They are not Build 3 Capping Limits or Build 6 budgets,
   which keep working unchanged (FR-CC-10.02-03). Wallets are Build 1 wallet types; a cardholder's benefit
   wallets show the Build 1 planned entitlement, never a balance (FR-CC-11). */
const CC_CHANNELS=['Online','POS','ATM'];
const CC_LIMITS=[['perTxn','Per Transaction'],['daily','Daily'],['monthly','Monthly'],['annual','Annual']];
const CC_NONE='__none__';   // an allow-list narrowed to nothing
const ccCtlVers=[];
let ccCtlVerNext=160001;
CC_WF_KINDS.push('Card Programme Control');
CC_KIND_WF['card programme control']='Card Programme Control';

function ccCtlBlank(){return {allowedCats:[],blockedCats:[],perTxn:'',daily:'',monthly:'',annual:'',mccAllow:[],mccBlock:[],countryAllow:[],countryBlock:[],
  international:'Allow',channels:{Online:true,POS:true,ATM:true}};}
function ccCtlClone(s){return s?JSON.parse(JSON.stringify(s)):null;}
function ccLim(v){return v===''||v==null?null:Number(v);}
function ccAmt(v,cur){return v===''||v==null?'No limit':(typeof expMoney==='function'?expMoney(Number(v),cur||'INR'):String(v));}
/* The stricter of two control sets (null: nothing recorded). */
function ccCtlMerge(a,b){
  if(!a&&!b)return null;if(!a)return ccCtlClone(b);if(!b)return ccCtlClone(a);
  const o=ccCtlBlank();
  CC_LIMITS.forEach(function(l){const x=ccLim(a[l[0]]),y=ccLim(b[l[0]]);o[l[0]]=x==null?(y==null?'':y):(y==null?x:Math.min(x,y));});
  const inter=function(p,q){if(!p.length)return q.slice();if(!q.length)return p.slice();const r=p.filter(function(x){return q.indexOf(x)>=0&&x!==CC_NONE;});return r.length?r:[CC_NONE];};
  const uni=function(p,q){return ccUniq(p.concat(q));};
  o.allowedCats=inter(a.allowedCats,b.allowedCats);o.blockedCats=uni(a.blockedCats,b.blockedCats);
  o.mccAllow=inter(a.mccAllow,b.mccAllow);o.mccBlock=uni(a.mccBlock,b.mccBlock);
  o.countryAllow=inter(a.countryAllow,b.countryAllow);o.countryBlock=uni(a.countryBlock,b.countryBlock);
  o.international=a.international==='Restrict'||b.international==='Restrict'?'Restrict':'Allow';
  CC_CHANNELS.forEach(function(ch){o.channels[ch]=!!(a.channels[ch]&&b.channels[ch]);});
  return o;
}
/* What a change loosens, compared with the set in effect (FR-CC-10.06). Nothing recorded before means
   nothing was restricted, so a first set only restricts. */
function ccCtlRelax(oldS,newS,cur){
  if(!oldS||!newS)return [];
  const out=[];
  CC_LIMITS.forEach(function(l){const x=ccLim(oldS[l[0]]),y=ccLim(newS[l[0]]);
    if(x!=null&&(y==null||y>x))out.push(l[1]+' limit '+(y==null?'removed':'raised')+' ('+ccAmt(x,cur)+' → '+ccAmt(y,cur)+')');});
  const widened=function(o,n,label){if(o.length&&(!n.length||n.some(function(x){return o.indexOf(x)<0;})))
    out.push(label+' widened to '+(n.length?n.filter(function(x){return o.indexOf(x)<0;}).join(', '):'all'));};
  const unblocked=function(o,n,label){const g=o.filter(function(x){return n.indexOf(x)<0;});if(g.length)out.push(label+' unblocked: '+g.join(', '));};
  widened(oldS.allowedCats,newS.allowedCats,'Allowed categories');unblocked(oldS.blockedCats,newS.blockedCats,'Categories');
  widened(oldS.mccAllow,newS.mccAllow,'Allowed merchant codes');unblocked(oldS.mccBlock,newS.mccBlock,'Merchant codes');
  widened(oldS.countryAllow,newS.countryAllow,'Allowed countries');unblocked(oldS.countryBlock,newS.countryBlock,'Countries');
  if(oldS.international==='Restrict'&&newS.international==='Allow')out.push('International use allowed');
  CC_CHANNELS.forEach(function(ch){if(!oldS.channels[ch]&&newS.channels[ch])out.push(ch+' use enabled');});
  return out;
}
/* Form values → a control set. Lists accept commas or spaces. */
function ccCtlNorm(d){
  d=d||{};const s=ccCtlBlank();
  CC_LIMITS.forEach(function(l){const v=String(d[l[0]]==null?'':d[l[0]]).replace(/,/g,'').trim();s[l[0]]=v===''?'':Number(v);});
  const list=function(v,up){return ccUniq((Array.isArray(v)?v:String(v||'').split(/[,\s]+/)).map(function(x){return String(x).trim();}).filter(Boolean).map(function(x){return up?x.toUpperCase():x;}));};
  s.allowedCats=list(d.allowedCats);s.blockedCats=list(d.blockedCats);
  s.mccAllow=list(d.mccAllow);s.mccBlock=list(d.mccBlock);s.countryAllow=list(d.countryAllow,true);s.countryBlock=list(d.countryBlock,true);
  s.international=d.international==='Restrict'?'Restrict':'Allow';
  CC_CHANNELS.forEach(function(ch){s.channels[ch]=!!(d.channels&&d.channels[ch]);});
  return s;
}
function ccCtlValidate(s){
  for(let i=0;i<CC_LIMITS.length;i++){const k=CC_LIMITS[i][0],v=s[k];
    if(v!==''&&!(isFinite(v)&&v>0))return CC_LIMITS[i][1]+' limit must be a positive amount, or blank for no limit.';
    if(v!==''&&Math.abs(v*100-Math.round(v*100))>1e-6)return CC_LIMITS[i][1]+' limit has more than two decimals.';}
  for(let i=0;i<CC_LIMITS.length-1;i++)for(let j=i+1;j<CC_LIMITS.length;j++){const a=ccLim(s[CC_LIMITS[i][0]]),b=ccLim(s[CC_LIMITS[j][0]]);
    if(a!=null&&b!=null&&a>b)return 'The '+CC_LIMITS[i][1].toLowerCase()+' limit cannot be more than the '+CC_LIMITS[j][1].toLowerCase()+' limit.';}
  const cats=typeof EXP_CATEGORIES!=='undefined'?EXP_CATEGORIES:[];
  const bad=s.allowedCats.concat(s.blockedCats).filter(function(c){return cats.indexOf(c)<0;});if(bad.length)return bad[0]+' is not an expense category.';
  const both=function(a,b,what){const x=a.filter(function(v){return b.indexOf(v)>=0;});return x.length?x[0]+' is both allowed and blocked ('+what+').':'';};
  let e=both(s.allowedCats,s.blockedCats,'categories')||both(s.mccAllow,s.mccBlock,'merchant codes')||both(s.countryAllow,s.countryBlock,'countries');if(e)return e;
  const m=s.mccAllow.concat(s.mccBlock).find(function(x){return !/^\d{4}$/.test(x);});if(m)return 'Merchant codes are four digits (MCC); "'+m+'" is not.';
  const c=s.countryAllow.concat(s.countryBlock).find(function(x){return !/^[A-Z]{2}$/.test(x);});if(c)return 'Countries are two-letter ISO codes (for example IN, AE); "'+c+'" is not.';
  return '';
}
/* A card restriction stays inside its programme's defaults (FR-CC-10.05). Blank, ticked and "as programme"
   values inherit the programme's, so only values that would be looser are refused. */
function ccCtlCeiling(cs,ps,cur){
  if(!ps)return '';
  for(let i=0;i<CC_LIMITS.length;i++){const k=CC_LIMITS[i][0],c=ccLim(cs[k]),p=ccLim(ps[k]);
    if(c!=null&&p!=null&&c>p)return 'A card can only be stricter than its programme: the '+CC_LIMITS[i][1].toLowerCase()+' limit '+ccAmt(c,cur)+' is above the programme\'s '+ccAmt(p,cur)+'.';}
  const outside=function(c,p,what){if(!p.length||!c.length)return '';const x=c.find(function(v){return p.indexOf(v)<0;});return x?x+' is not allowed by the programme ('+what+'); a card can only narrow it.':'';};
  return outside(cs.allowedCats,ps.allowedCats,'categories')||outside(cs.mccAllow,ps.mccAllow,'merchant codes')||outside(cs.countryAllow,ps.countryAllow,'countries');
}
function ccCtlTarget(scope,id){return scope==='programme'?ccProg(id):ccCard(id);}
function ccCtlChange(id){return ccCtlChanges.find(function(r){return r.id===Number(id);})||null;}
function ccCtlVer(id){return ccCtlVers.find(function(v){return v.id===Number(id);})||null;}
function ccCtlVersOf(scope,id){return ccCtlVers.filter(function(v){return v.scope===scope&&v.targetId===Number(id);});}
/* The approved version in force on a date: the newest whose window covers it. */
function ccCtlCurrentVer(scope,id,iso){iso=iso||wbToday();
  return ccCtlVersOf(scope,id).filter(function(v){return v.status==='Approved'&&v.effFrom<=iso&&(!v.effTo||iso<=v.effTo);}).sort(function(a,b){return b.id-a.id;})[0]||null;}
function ccProgCtl(p,iso){const v=p?ccCtlCurrentVer('programme',p.id,iso):null;return v?v.set:null;}
function ccCardOwnCtl(c,iso){const v=c?ccCtlCurrentVer('card',c.id,iso):null;return v?v.set:null;}
/* What applies to a card: the programme's defaults and its own restrictions, the stricter winning. */
function ccCardCtl(c,iso){return c?ccCtlMerge(ccProgCtl(ccProg(c.programmeId),iso),ccCardOwnCtl(c,iso)):null;}
function ccCtlPendingOf(scope,id){return ccCtlChanges.find(function(r){return r.scope===scope&&r.targetId===Number(id)&&['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0;})||null;}
function ccCtlVerState(v,iso){
  iso=iso||wbToday();
  if(v.status!=='Approved'){const r=v.changeId?ccCtlChange(v.changeId):null;return r&&['Draft','Awaiting Approval','Follow-Up'].indexOf(r.status)>=0?'Pending Approval':(r?r.status:v.status);}
  if(v.effTo&&v.effTo<iso)return 'Ended';
  if(v.effFrom>iso)return 'Scheduled';
  const cur=ccCtlCurrentVer(v.scope,v.targetId,iso);return cur&&cur.id===v.id?'In Effect':'Superseded';
}
/* Provider enforcement (FR-CC-10 field). A provider whose registry details are configured is still not
   connected: ADT has no provider integration, so controls are never Pending or Confirmed at the network. */
function ccCtlEnforcement(p){return ccProviderStatus(p)==='Connected'?'Pending':'Not Connected';}
function ccCtlEnfNote(p){
  return ccCtlEnforcement(p)==='Pending'?'Recorded in ADT; enforcement at '+ccProviderName(p.provider)+' is pending its confirmation.'
    :'Recorded in ADT as the intended controls; they are not enforced at the payment network because '+ccProviderName(p&&p.provider)+' is not connected.';
}
function ccCtlLog(t,scope,text,A){ccLog(t,scope==='programme'?t.status:t.status,text,A);}
/* d: scope ('programme' | 'card'), targetId, set (form values), effFrom, effTo, reason, baseVer (the version the
   form was opened on, so a stale form never overwrites a newer change - FR-CC-10.11, 28.06). */
function ccCtlPropose(d,A){
  A=A||ccNow();d=d||{};
  if(!ccPCan(A,'card.control.manage'))return {error:caN(A.who)+' cannot change card controls (card.control.manage).'};
  const scope=d.scope==='programme'?'programme':'card',t=ccCtlTarget(scope,d.targetId);
  if(!t)return {error:'No such '+(scope==='programme'?'programme':'card')+'.'};
  if(t.entity!==ccEnt())return {error:'That '+(scope==='programme'?'programme':'card')+' belongs to another entity; its controls are changed there.'};
  if(scope==='card'&&ccCardEnded(t))return {error:expKey(t)+' is '+t.status+'; its controls no longer change.'};
  const p=scope==='programme'?t:ccProg(t.programmeId);
  const reason=String(d.reason||'').trim();if(!reason)return {error:'Give the reason for the change.'};
  const today=wbToday(),from=d.effFrom||today,to=d.effTo||'';
  if(from<today)return {error:'Controls take effect from today or a later date; past periods are not rewritten.'};
  if(to&&to<from)return {error:'The end date is before the start date.'};
  const set=ccCtlNorm(d.set),ve=ccCtlValidate(set);if(ve)return {error:ve};
  const cur=ccCtlCurrentVer(scope,t.id,today);
  if((d.baseVer==null?null:Number(d.baseVer))!==(cur?cur.id:null))return {error:'The controls changed since this form was opened'+(cur?' (now version '+cur.n+')':'')+'. Reopen it to see the current values.'};
  const pend=ccCtlPendingOf(scope,t.id);if(pend)return {error:expKey(pend)+' is already awaiting approval for these controls.'};
  const progSet=ccProgCtl(p,from);
  if(scope==='card'){const ce=ccCtlCeiling(set,progSet,p.currency);if(ce)return {error:ce};}
  const before=scope==='card'?ccCardCtl(t,today):ccCtlClone(cur?cur.set:null);
  const after=scope==='card'?ccCtlMerge(progSet,set):set;
  const relax=ccCtlRelax(before,after,p.currency);
  const n=ccCtlVersOf(scope,t.id).length+1;
  const v={id:ccCtlVerNext++,n:n,scope:scope,targetId:t.id,entity:t.entity,programmeId:p.id,set:set,before:before,after:after,effFrom:from,effTo:to,reason:reason,relax:relax,
    status:relax.length?'Pending Approval':'Approved',changeId:null,createdBy:A.who,actual:caVia(A),createdAt:ccStamp(A),approvedAt:relax.length?'':ccStamp(A),enforcement:ccCtlEnforcement(p)};
  ccCtlVers.push(v);
  const label=scope==='programme'?p.key+' programme defaults':expKey(t)+' card restrictions';
  if(!relax.length){
    ccCtlLog(t,scope,'Controls v'+n+' ('+label+') recorded by '+caN(A.who)+', effective '+cdLabel(from)+(to?' to '+cdLabel(to):'')+': '+reason+'. Stricter or unchanged, so no approval is needed. '+ccCtlEnfNote(p),A);
    if(scope==='card')ccNotify([ccHolderUser(t)],expKey(t)+': the controls on your card changed ('+reason+').',t);
    return {ver:v};
  }
  /* A relaxation: an approval request on the shared engine; the current controls stay in force meanwhile. */
  const e=scope==='card'?idEmp(t.employeeEid):null,kind=scope==='programme'?'card programme control':'card control change';
  const r={id:ccCtlNextId++,key:ccCtlNextKey++,prefix:'CTL',kind:kind,entity:t.entity,scope:scope,targetId:t.id,verId:v.id,programmeId:p.id,cardId:scope==='card'?t.id:null,
    employeeEid:e?e.eid:'',name:e?e.name:p.name,empId:e?e.empId||'':'',email:e?e.email||'':'',dept:e?e.dept||'':'',claimFor:'Others',mode:'On Behalf',status:'Draft',
    createdBy:A.who,createdAt:ccStamp(A),migrated:true,idMigrated:true,category:'Card Controls',title:'Relax '+label,relax:relax.slice(),reason:reason,
    lines:[{id:1,title:'Control relaxation',amount:1,subCat:'Card',start:A.iso,end:A.iso,status:'Pending',approved:null}],logs:[],currency:'card'};
  ccLog(r,'Draft','Requested by '+caN(A.who)+': '+relax.join('; ')+'. Reason: '+reason+'.',A);
  ccCtlChanges.unshift(r);v.changeId=r.id;
  const pre=ccEnginePreflight(r);
  if(pre.error||!caStart(r,pre,A)){ccCtlChanges.shift();ccCtlNextId--;ccCtlNextKey--;ccCtlVers.pop();ccCtlVerNext--;return {error:pre.error||'Approval could not start.'};}
  ccCtlLog(t,scope,'Controls v'+n+' ('+label+') relax: '+relax.join('; ')+'. Awaiting approval in '+expKey(r)+'; the current controls stay in force.',A);
  return {ver:v,change:r};
}
function ccCtlDecisionCheck(r,items){
  if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
  const v=ccCtlVer(r.verId),t=ccCtlTarget(r.scope,r.targetId);
  if(!v||!t)return 'Cannot approve '+expKey(r)+': the '+r.scope+' is missing.';
  if(r.scope==='card'){
    if(ccCardEnded(t))return 'Cannot approve '+expKey(r)+': '+expKey(t)+' is '+t.status+'.';
    const p=ccProg(t.programmeId),ce=ccCtlCeiling(v.set,ccProgCtl(p,v.effFrom),p.currency);if(ce)return 'Cannot approve '+expKey(r)+' now: '+ce;
  }
  return '';
}
function ccCtlOnFinal(r,A){
  const v=ccCtlVer(r.verId),t=ccCtlTarget(r.scope,r.targetId);if(!v)return;
  if(['Approved','Partially Approved'].indexOf(r.status)<0){v.status=r.status;return;}
  v.status='Approved';v.approvedAt=ccStamp(A);v.changeKey=expKey(r);
  const p=ccProg(v.programmeId);
  ccLog(r,'Approved','Approved. Controls v'+v.n+' take effect '+cdLabel(v.effFrom)+(v.effTo?' to '+cdLabel(v.effTo):'')+'. '+ccCtlEnfNote(p),A);
  if(t)ccCtlLog(t,r.scope,'Controls v'+v.n+' approved in '+expKey(r)+'; in force from '+cdLabel(v.effFrom)+(v.effTo?' to '+cdLabel(v.effTo)+', then the earlier controls apply again':'')+'.',A);
  if(r.scope==='card'&&t)ccNotify([ccHolderUser(t)],expKey(t)+': a change to your card controls was approved ('+v.relax.join('; ')+').',t);
}
['card control change','card programme control'].forEach(function(kind){
  ccRegisterKind(kind,{
    perms:{approve:'card.control.approve',submit:'card.control.manage',others:'card.control.manage',withdraw:'card.control.manage',withdrawOthers:'card.control.manage'},
    preflight:function(r,o){return ccEnginePreflight(r,o);},decisionCheck:function(r,items){return ccCtlDecisionCheck(r,items);},onFinal:function(r,A){ccCtlOnFinal(r,A);},
    finalNote:'Approval records the relaxed controls in ADT from their effective date; the provider enforces them only once connected.',
    finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+'.';},
    decisionHint:'Approves the relaxation as a whole. The controls change in ADT from the effective date; nothing is changed at the bank.'});
});
if(typeof CA_TYPE_LABEL!=='undefined'){CA_TYPE_LABEL['card control change']='Card Control Change';CA_TYPE_LABEL['card programme control']='Card Programme Control';}

/* ── Wallet mapping (FR-CC-11): Build 1 wallets and categories; planned entitlement, never a balance ── */
function ccWalletMap(p){
  return (p?p.wallets:[]).map(function(code){
    const t=wbType(code),cats=wbMine(wbCategories).filter(function(c){const w=wbWalletOf(c);return w&&w.type===code;});
    return {code:code,name:wbTypeName(code),cls:t?t.cls:'',benefit:!!t&&t.cls==='Flexi Benefit',cats:cats};
  });
}
/* For one cardholder: each programme wallet with the Build 1 planned entitlement of the period (benefit
   wallets) or its funding note (Corporate Expense). Planned is not loaded, and not a balance. */
function ccWalletEntitlements(c,period){
  const p=c?ccProg(c.programmeId):null;period=period||wbToday().slice(0,7);
  const emp=c&&typeof wbEmployees==='function'?wbEmployees().find(function(x){return x.eid===c.employeeEid;}):null;
  return ccWalletMap(p).map(function(w){
    if(!w.benefit)return Object.assign({},w,{kind:'corporate',rows:[],eligible:true,planned:0});
    const rows=emp?w.cats.map(function(cat){return wbResolve(emp,cat,period);}).filter(Boolean):[];
    const ok=rows.filter(function(r){return r.state==='Eligible'&&wbAllocatable(r);});
    return Object.assign({},w,{kind:'benefit',rows:rows,eligible:ok.length>0,planned:ok.reduce(function(s,r){return s+r.amount;},0)});
  });
}
/* Can a load go to this wallet of this card for this period? '' or why not (used by card loads, 7E). */
function ccWalletLoadable(c,code,period){
  const w=ccWalletEntitlements(c,period).find(function(x){return x.code===code;});
  if(!w)return wbTypeName(code)+' is not a wallet of this card\'s programme.';
  if(w.kind==='benefit'&&!w.eligible)return ccHolderName(c)+' has no active '+w.name+' entitlement for '+wbPeriodLabel(period||wbToday().slice(0,7))+' in Wallet & Benefits.';
  return '';
}

/* ── Control Preview (FR-CC-10.10): one made-up payment checked against the recorded controls. Non-posting:
   it creates no card transaction, spending record, funding posting or provider outcome (transactions are Build 8). ── */
/* t: amount, category, channel, international (bool), country (ISO-2), mcc. */
function ccCtlSimulate(cardId,t){
  const c=ccCard(cardId);if(!c)return {error:'No such card.'};
  t=t||{};const s=ccCardCtl(c),p=ccProg(c.programmeId),why=[];
  const amt=Number(String(t.amount||'').replace(/,/g,''));if(!(amt>0))return {error:'Enter an amount.'};
  if(c.status!=='Active')why.push('The card is '+c.status+'.');
  if(c.hold&&c.hold.active)why.push('The card is on hold in ADT.');
  if(s){
    if(s.perTxn!==''&&amt>s.perTxn)why.push('Above the per-transaction limit of '+ccAmt(s.perTxn,p.currency)+'.');
    if(t.category&&s.allowedCats.length&&s.allowedCats.indexOf(t.category)<0)why.push(t.category+' is not an allowed category.');
    if(t.category&&s.blockedCats.indexOf(t.category)>=0)why.push(t.category+' is blocked.');
    if(t.channel&&!s.channels[t.channel])why.push(t.channel+' use is not permitted.');
    if(t.international&&s.international==='Restrict')why.push('International use is restricted.');
    const cc=String(t.country||'').toUpperCase();
    if(cc&&s.countryAllow.length&&s.countryAllow.indexOf(cc)<0)why.push(cc+' is not an allowed country.');
    if(cc&&s.countryBlock.indexOf(cc)>=0)why.push(cc+' is blocked.');
    const m=String(t.mcc||'');
    if(m&&s.mccAllow.length&&s.mccAllow.indexOf(m)<0)why.push('Merchant code '+m+' is not allowed.');
    if(m&&s.mccBlock.indexOf(m)>=0)why.push('Merchant code '+m+' is blocked.');
  }
  return {pass:!why.length,reasons:why,notEvaluated:['Daily, monthly and annual limits need recorded card spending.'],
    label:'Control Preview only, non-posting: no card transaction, spending record, funding posting or provider outcome was created; no payment network authorized or declined anything, and '+ccProviderName(p.provider)+' is not connected.'};
}

/* ── Demonstration data: the routes and the programmes' default controls ── */
(function ccSeed7D(){
  if(typeof caWfSeed!=='function')return;
  const sh=(idUserByEmail('shaun@testemp.com')||{}).userId||'',team=String(caSeedTeamId('Card Approvers'));
  const w=caWfSeed(caWfNext++,'Card programme controls - card approver',{kind:'Card Programme Control',desc:'Relaxing a programme\'s default controls: an independent card approver.',
    createdAt:'01 Apr 2026 | 09:00:00 AM'},[caStageDef(1,'Card approver review','RBAC Team',team,{rule:'Any One',fallback:sh})]);
  w.independent=true;caWorkflows.push(w);
  const seed=function(key,d,reason){
    const p=ccProgs(ID_HOME_ENTITY).find(function(x){return x.code===key;});if(!p)return;
    const set=ccCtlNorm(d);
    ccCtlVers.push({id:ccCtlVerNext++,n:1,scope:'programme',targetId:p.id,entity:p.entity,programmeId:p.id,set:set,before:null,after:set,effFrom:p.effFrom||'2026-10-15',effTo:'',
      reason:reason,relax:[],status:'Approved',changeId:null,createdBy:sh,actual:'',createdAt:'15 Oct 2026 | 10:00:00 AM',approvedAt:'15 Oct 2026 | 10:00:00 AM',enforcement:ccCtlEnforcement(p)});
    p.controls='set';
  };
  seed('ONC-CORP',{perTxn:50000,daily:100000,monthly:300000,annual:'',blockedCats:['Team Outing'],international:'Restrict',channels:{Online:true,POS:true,ATM:false},mccBlock:'7995 5933'},
    'Programme launch: business spend, no cash, no gambling or pawn shops.');
  seed('ONC-BEN',{perTxn:5000,daily:'',monthly:10000,annual:'',allowedCats:['Meal Allowance','Fuel Reimbursement'],international:'Restrict',channels:{Online:true,POS:true,ATM:false},
    mccAllow:'5812 5814 5541 5542'},'Programme launch: meals and fuel only, at restaurant and fuel merchants (keeps the meal benefit tax-free).');
})();
/* ══ 7E · Corporate funding and card loads (FR-CC-12 to 15, 19, 24; WF-CC-04 to 06; US-CC-09, 10) ═══════
   A card load is an authorization first and money second, and the two are never confused:
     1. AUTHORIZATION. A corporate load goes through the shared approval engine on the Card Load route
        (independent card approver; the cardholder and the requester never approve it). A benefit load is
        authorized by the approved Wallet & Benefits allocation batch it carries: that approval already
        authorizes the same amount for the same person, so it is not approved twice (FR-CC-15, §40).
        A bulk load file takes one file-level approval with row-by-row review, but only for rows whose own
        route is the same one; a row whose route differs or is employee-specific goes through its own route.
     2. EXECUTION. Approved means "Awaiting Execution" - nothing loaded, nothing debited. Execution enters
        through one entry point with its source: Manually Verified (provider reference and evidence recorded
        by one person, verified by another - never the cardholder or the requester), Illustrative
        (demo mode, labelled everywhere, never a funding event) or Provider Confirmed (refused: no provider
        is connected). A load may be recorded in parts, fail, be cancelled, retried or reversed; nothing is
        edited after it is posted (FR-CC-13.16).
     3. FUNDING. A verified genuine execution posts ONE entry on the Build 6 funding source (idempotent
        key per execution; a reference is never used twice). A shortfall is recorded as it happened, with
        Build 6's reconciliation exception - no balance is invented. Demo executions post nothing. A card
        load is not business expenditure: it never touches Build 6 budget utilization or Build 3 limits.
   Every row of a bulk file and every benefit load passes the same check as a single load (FR-CC-14.18). */
const CC_EXEC_OPEN=['Awaiting Execution','Processing','Partially Recorded'];
const CC_EXEC_RESULTS=['Recorded','Failed'];
const CC_BENEFIT_GEN=['Manual','On allocation batch approval'];
/* Who authorizes a benefit load: the approved allocation batch (it names the employee, wallet, amount and
   period, and the programme declares that its approval covers the card load), or the Card Load route. */
const CC_BENEFIT_AUTH=['Allocation batch approval','Card Load route'];
const CC_FUND_DEFAULT={sourceId:'',minLoad:'',maxLoad:'',monthlyLimit:'',individual:true,bulk:true,loadWorkflowId:'',benefitGen:'Manual',benefitAuth:'Allocation batch approval',validityDays:30};
const ccLoadExecs=[];
let ccLexNextId=170001,ccLexNextKey=1001;

/* ── Card funding settings on the programme (FR-CC-12) ──────────────────── */
function ccProgFunding(p){return Object.assign({},CC_FUND_DEFAULT,(p&&p.funding)||{});}
function ccFundNum(v){if(v===''||v==null)return '';const n=Number(String(v).replace(/,/g,'').trim());return String(v).trim()===''?'':isFinite(n)?ccM(n):NaN;}
function ccFundNorm(f){
  f=f||{};
  return {sourceId:Number(f.sourceId)||'',minLoad:ccFundNum(f.minLoad),maxLoad:ccFundNum(f.maxLoad),monthlyLimit:ccFundNum(f.monthlyLimit),
    individual:f.individual!==false,bulk:f.bulk!==false,loadWorkflowId:Number(f.loadWorkflowId)||'',benefitGen:CC_BENEFIT_GEN.indexOf(f.benefitGen)>=0?f.benefitGen:'Manual',
    benefitAuth:CC_BENEFIT_AUTH.indexOf(f.benefitAuth)>=0?f.benefitAuth:'Allocation batch approval',
    validityDays:f.validityDays===''||f.validityDays==null?30:Number(String(f.validityDays).trim())};
}
function ccFundingValidate(f,ent){
  const src=f.sourceId?fbSource(f.sourceId):null;
  if(f.sourceId&&(!src||src.entity!==ent))return 'Default Funding Source: pick a funding source of this entity.';
  if(src&&src.status!=='Active')return 'Default Funding Source: '+src.key+' is inactive.';
  if([f.minLoad,f.maxLoad,f.monthlyLimit].some(function(x){return x!==''&&(isNaN(x)||x<0);}))return 'Load limits are amounts of zero or more.';
  if(f.minLoad!==''&&f.maxLoad!==''&&f.minLoad>f.maxLoad)return 'Minimum Load cannot exceed Maximum Load.';
  if(f.maxLoad!==''&&f.monthlyLimit!==''&&f.maxLoad>f.monthlyLimit)return 'Maximum Load cannot exceed the Monthly Load Limit per Card.';
  if(!(f.validityDays>=1&&f.validityDays<=365&&Math.floor(f.validityDays)===f.validityDays))return 'Load Authorization Validity is a whole number of days from 1 to 365.';
  if(f.loadWorkflowId&&!ccWfOptions('Card Load',ent).some(function(w){return w.id===f.loadWorkflowId;}))return 'Pick an active Card Load approval workflow, or leave it empty to use the newest active one.';
  return '';
}

/* ── Exchange rates: Company Settings → Exchange Rates, never 1:1 (FR-CC-12.11, 24.02-04) ── */
/* null: same currency, nothing to convert. false: no rate in force. Otherwise the rate as applied. */
function ccFx(from,to,iso){
  if(!from||!to||from===to)return null;
  const r=typeof epRate==='function'?epRate(from,to,iso||wbToday()):null;
  return r?{from:from,to:to,rate:r.rate,date:r.date,rateId:r.id,inverse:!!r.inverse,source:'ADT Exchange Rates'}:false;
}
function ccFxText(fx){return fx?'1 '+fx.from+' = '+(Math.round(fx.rate*1e6)/1e6)+' '+fx.to+' ('+fx.source+', effective '+cdLabel(fx.date)+')':'';}

/* ── Loads: lookups and the status people read ─────────────────────────── */
function ccLoad(id){return ccLoads.find(function(l){return l.id===Number(id);})||null;}
function ccLoadExec(id){return ccLoadExecs.find(function(e){return e.id===Number(id);})||null;}
function ccLoadsOfCard(cardId){return ccLoads.filter(function(l){return l.cardId===Number(cardId);});}
function ccLoadRemaining(l){return l.exec?ccM(l.amount-l.exec.recorded):l.amount;}
function ccToCard(l,amt){return l.fxCard?ccM(amt*l.fxCard.rate):ccM(amt);}
/* Before approval: the engine status. After it: the execution status. */
function ccLoadPhase(l){return l.exec?l.exec.status:l.status;}
function ccLoadLabel(l){
  const s=ccLoadPhase(l);if(!l.exec||!l.exec.demo)return s;
  return s==='Recorded'?CC_DEMO:s==='Partially Recorded'?'Partially Illustrative':s==='Reversed'?'Reversed (Illustrative)':s;
}
/* Still holds its authority (an allocation, a duplicate check): not ended without money. */
function ccLoadHolds(l){
  if(['Draft','Awaiting Approval','Follow-Up'].indexOf(l.status)>=0)return true;
  return !!l.exec&&['Cancelled','Reversed','Expired'].indexOf(l.exec.status)<0;
}
/* Open: may still become a load (duplicate detection). */
function ccLoadIsOpen(l){
  if(['Draft','Awaiting Approval','Follow-Up'].indexOf(l.status)>=0)return true;
  return !!l.exec&&(['Awaiting Execution','Processing','Failed'].indexOf(l.exec.status)>=0||(l.exec.status==='Partially Recorded'&&!l.exec.closed));
}
/* What a load counts against the card's monthly load limit, in the programme currency. Concurrent
   requests count while in approval, so two submissions cannot together pass the limit (FR-CC-24.07). */
function ccLoadCounted(l){
  if(['Awaiting Approval','Follow-Up'].indexOf(l.status)>=0)return l.cardAmount;
  if(!l.exec)return 0;
  const st=l.exec.status,rv=ccToCard(l,l.exec.reversed||0);
  if(['Awaiting Execution','Processing','Failed'].indexOf(st)>=0)return l.cardAmount;
  if(st==='Recorded')return Math.max(0,ccM(l.cardAmount-rv));
  if(st==='Partially Recorded')return Math.max(0,ccM((l.exec.closed?ccToCard(l,l.exec.recorded):l.cardAmount)-rv));
  return 0;
}
/* The reservation of a load on its Build 6 source: the part of its source amount authorized and not yet
   posted. Approval reserves; each verified execution releases what it posts; cancellation, failure or
   closure releases the rest. A load executed as a demonstration reserves nothing. Never an entry. */
function ccLoadSrcOpen(l){
  if(!l.sourceId||!l.exec||l.exec.closed||l.exec.demo===true||CC_EXEC_OPEN.indexOf(l.exec.status)<0)return 0;
  if(!ccCardEvidenced(ccCard(l.cardId)))return 0;
  const posted=(l.exec.posted||[]).reduce(function(s,id){const t=fbTxn(id);return s+(t?t.amount:0);},0);
  return Math.max(0,ccM((Number(l.srcAmount)||0)-posted));
}
function ccLoadsReserved(s){if(s)ccLoadsSweepExpiry(s.entity);return s?ccM(ccLoads.reduce(function(n,l){return l.sourceId===s.id?n+ccLoadSrcOpen(l):n;},0)):0;}
/* Build 6's reservations: approved card loads awaiting execution (Recorded Balance and payouts untouched). */
ccHook('fbReserved',null,function(out,s){const add=ccLoadsReserved(s);return add?ccM(out+add):undefined;});
function ccAllocRow(id){
  id=Number(id);if(!id||typeof wbBatches==='undefined')return null;
  for(let i=0;i<wbBatches.length;i++){const row=wbBatches[i].rows.find(function(r){return r.id===id;});if(row)return {row:row,batch:wbBatches[i]};}
  return null;
}
/* A benefit allocation may carry one load: approved batch, live row, this cardholder, this wallet, not flagged. */
function ccAllocLoadable(al,c,code,exceptId,alsoExcept){
  const b=al.batch,row=al.row;
  if(b.entity!==c.entity)return 'Allocation '+row.key+' belongs to another entity.';
  if(b.status!=='Approved')return 'Allocation batch '+b.key+' is '+b.status+'; only an approved batch authorizes a benefit load.';
  if(row.status!=='Planned')return 'Allocation '+row.key+' is '+row.status+'.';
  if(row.eid!==c.employeeEid)return 'Allocation '+row.key+' is '+row.empName+'\'s; '+expKey(c)+' is held by '+ccHolderName(c)+'.';
  if(row.walletType!==code)return 'Allocation '+row.key+' is for '+(row.walletType?wbTypeName(row.walletType):'a claim-based benefit')+', not '+wbTypeName(code)+'.';
  const fl=typeof wbRowFlag==='function'?wbRowFlag(row):'';if(fl)return 'Allocation '+row.key+' is flagged in Wallet & Benefits: '+fl+'.';
  const dup=ccLoads.find(function(l){return l.id!==exceptId&&(Array.isArray(alsoExcept)?alsoExcept.indexOf(l.id)<0:l.id!==alsoExcept)&&l.allocId===row.id&&ccLoadHolds(l);});
  if(dup)return 'Allocation '+row.key+' already has load '+expKey(dup)+' ('+ccLoadLabel(dup)+'); an allocation is loaded once.';
  return '';
}

/* ── The one load check (FR-CC-13.01-03, 14.18, 15.02-03, 24) ──────────── */
/* d: cardId, wallet, amount, currency, sourceId, allocId, dupAck. o: purpose ('draft', 'submit', 'approve',
   'execute'), origin ('Individual', 'Bulk', 'Benefit'), exceptId, period, iso. Returns the errors, the
   warnings and what it worked out (amounts, rates, source). Draft checks only what a draft needs. */
function ccLoadCheck(d,o){
  o=o||{};d=d||{};
  const reOfId=d.reraiseOf?Number(d.reraiseOf):(o.exceptId&&ccLoad(o.exceptId)&&ccLoad(o.exceptId).origin&&ccLoad(o.exceptId).origin.reraiseOf)||null;
  const out={errors:[],warnings:[]},err=function(t){out.errors.push(t);},iso=o.iso||wbToday(),full=o.purpose!=='draft';
  const c=ccCard(d.cardId);
  if(!c||c.entity!==ccEnt()){err('Pick a card of this entity.');return out;}
  out.card=c;
  const p=ccProg(c.programmeId);out.p=p;
  if(!p){err('The card programme is missing.');return out;}
  if(full){
    /* The card: Active, no ADT hold, no request pending at the provider (FR-CC-13.02, BR-CC-20). */
    if(c.status!=='Active')err(expKey(c)+' is '+c.status+'; only an Active card receives a new load.');
    else if(c.hold&&c.hold.active)err(expKey(c)+' is on '+(c.hold.type==='Temporary'?'a temporary hold':'hold (reported '+String(c.hold.reason).toLowerCase()+')')+' in ADT; it receives no new load.');
    else if(c.pending)err(expKey(c)+' has a pending '+c.pending.action.toLowerCase()+' request at the provider; no new load until it is resolved.');
    /* The cardholder and the programme, now - an exiting employee gets no new load (PO-5). */
    const el=ccEligibility(c.employeeEid,p.id,'load');if(!el.ok)el.reasons.forEach(err);
  }
  const w=ccWalletMap(p).find(function(x){return x.code===d.wallet;});
  if(!w){err(d.wallet?wbTypeName(d.wallet)+' is not a wallet of '+p.name+'.':'Pick the wallet.');return out;}
  out.w=w;
  const fund=ccProgFunding(p);
  if(w.benefit){
    /* A benefit wallet loads an approved Build 1 allocation, once, for its amount (FR-CC-15.02-03, 15.07). */
    const al=ccAllocRow(d.allocId);
    if(!al)err(w.name+' is a benefit wallet: it is loaded only from an approved Wallet & Benefits allocation. Pick the allocation.');
    else{
      out.alloc=al;
      const why=ccAllocLoadable(al,c,w.code,o.exceptId,reOfId?ccLoadAncestors(reOfId):null);if(why)err(why);
      else if(full){const wl=ccWalletLoadable(c,w.code,al.row.period);if(wl)err(wl);}
    }
  }else{
    if(d.allocId)err('An allocation applies only to a benefit wallet.');
    if(o.origin==='Individual'&&!fund.individual)err(p.name+' does not take individual loads.');
    if(o.origin==='Bulk'&&!fund.bulk)err(p.name+' does not take bulk loads.');
  }
  const raw=String(d.amount==null?'':d.amount).replace(/,/g,'').trim(),amt=Number(raw);
  if(!raw||!(amt>0)||!isFinite(amt)){err('Enter the load amount (more than zero).');return out;}
  if(Math.abs(amt*100-Math.round(amt*100))>1e-6){err('An amount has at most two decimals.');return out;}
  out.amount=ccM(amt);
  const cur=d.currency||p.currency;
  if(EXP_CURRENCIES.indexOf(cur)<0){err('Pick the currency.');return out;}
  out.currency=cur;
  if(out.alloc){
    if(cur!==(out.alloc.row.currency||'INR'))err('Allocation '+out.alloc.row.key+' is in '+(out.alloc.row.currency||'INR')+'; the load is in the same currency.');
    const reOf=reOfId?ccLoad(reOfId):null,due=reOf?ccLoadReraiseEligible(reOf,o.exceptId):out.alloc.row.amount;
    if(reOf&&Math.abs(out.amount-due)>0.001)err('A re-raised benefit load carries exactly what was left of '+expKey(reOf)+' ('+expMoney(due,cur)+').');
    else if(!reOf&&Math.abs(out.amount-out.alloc.row.amount)>0.001)err('Allocation '+out.alloc.row.key+' is '+expMoney(out.alloc.row.amount,out.alloc.row.currency||'INR')+'; a benefit load carries exactly the allocated amount.');
  }
  if(reOfId&&!out.alloc){const reOf=ccLoad(reOfId),due=reOf?ccLoadReraiseEligible(reOf,o.exceptId):0;
    if(out.amount>due+0.001)err('A re-raise carries at most what is left of '+(reOf?expKey(reOf):'the expired load')+' and not yet re-raised ('+expMoney(due,cur)+').');}
  const fxc=ccFx(cur,p.currency,iso);
  if(fxc===false){err('No exchange rate from '+cur+' to '+p.currency+' is in force on '+cdLabel(iso)+' (Company Settings → Exchange Rates). ADT never assumes 1:1.');return out;}
  out.fxCard=fxc;out.cardAmount=fxc?ccM(out.amount*fxc.rate):out.amount;
  /* Programme limits for corporate loads, in the programme currency (FR-CC-12 settings). */
  if(!w.benefit){
    if(fund.minLoad!==''&&out.cardAmount<fund.minLoad)err('Below '+p.code+'\'s minimum load of '+ccAmt(fund.minLoad,p.currency)+'.');
    if(fund.maxLoad!==''&&out.cardAmount>fund.maxLoad)err('Above '+p.code+'\'s maximum load of '+ccAmt(fund.maxLoad,p.currency)+'.');
    if(fund.monthlyLimit!==''&&full){
      const per=o.period||iso.slice(0,7);
      const used=ccM(ccLoadsOfCard(c.id).filter(function(l){return l.id!==o.exceptId&&!l.benefit&&(l.period||'')===per;}).reduce(function(s,l){return s+ccLoadCounted(l);},0));
      out.monthUsed=used;out.monthLimit=fund.monthlyLimit;out.period=per;
      if(used+out.cardAmount>fund.monthlyLimit+0.001)err('Above the monthly load limit per card of '+ccAmt(fund.monthlyLimit,p.currency)+': '+ccAmt(used,p.currency)+' is already requested or loaded on '+expKey(c)+' for '+wbPeriodLabel(per)+'.');
    }
  }
  /* Funding source: Build 6, never a new ledger (FR-CC-12.01-05). Required while funding-source tracking is on. */
  const src=d.sourceId?fbSource(d.sourceId):null;
  if(d.sourceId&&!src)err('The funding source does not exist.');
  if(!src&&full&&typeof fbTrackingOn==='function'&&fbTrackingOn(c.entity))err('Funding-source tracking is on: pick the funding source this load is paid from.');
  if(src){
    out.src=src;
    if(src.entity!==c.entity)err(src.key+' belongs to another entity.');
    else if(src.status!=='Active')err(src.key+' is inactive; it takes no new transactions.');
    else if((src.effFrom&&iso<src.effFrom)||(src.effTo&&iso>src.effTo))err(src.key+' is outside its effective dates.');
    const fxs=ccFx(cur,src.currency,iso);
    if(fxs===false)err('No exchange rate from '+cur+' to '+src.currency+' ('+src.key+') is in force on '+cdLabel(iso)+'. ADT never assumes 1:1.');
    else{
      out.fxSrc=fxs;out.srcAmount=fxs?ccM(out.amount*fxs.rate):out.amount;out.srcCurrency=src.currency;
      /* Build 6's own balance rule, with payouts and authorized loads already in progress (FR-CC-12.05). */
      if(full&&o.purpose!=='execute'&&!out.errors.length){
        const room=typeof fbAvailable==='function'?fbAvailable(src):ccM(fbBalance(src)-fbInflight(src));out.room=room;
        if(out.srcAmount>room+0.001){
          const msg=src.key+' has '+expMoney(room,src.currency)+' available for new commitments (recorded funding, internal, less payouts in progress and approved loads); this load is '+expMoney(out.srcAmount,src.currency)+'.';
          if(src.enforcement==='Blocking')err(msg+' The source is Blocking: record and verify funding first.');
          else if(src.enforcement==='Warning')out.warnings.push(msg);
        }
      }
    }
  }
  /* A possible duplicate of an open load (FR-CC-24.05). Bulk rows use their load reference instead. */
  if(!w.benefit&&o.origin!=='Bulk'&&full){
    const dup=ccLoads.find(function(l){return l.id!==o.exceptId&&l.cardId===c.id&&l.wallet===w.code&&l.currency===cur&&Math.abs(l.amount-out.amount)<0.005&&ccLoadIsOpen(l);});
    if(dup){out.dup=dup;if(!String(d.dupAck||'').trim())err('Possible duplicate of '+expKey(dup)+' ('+ccLoadLabel(dup)+'): same card, wallet and amount. If it is a separate load, say why.');}
  }
  /* Advisory: more than the card's recorded monthly spending limit (7D). */
  if(full&&!out.errors.length&&!w.benefit){const s=ccCardCtl(c);if(s&&s.monthly!==''&&out.cardAmount>s.monthly)out.warnings.push('Above the card\'s recorded monthly spending limit of '+ccAmt(s.monthly,p.currency)+'; the excess cannot be spent within one month under the recorded controls.');}
  return out;
}
function ccLoadData(l){return {cardId:l.cardId,wallet:l.wallet,amount:l.amount,currency:l.currency,sourceId:l.sourceId,allocId:l.allocId,dupAck:l.dupAck};}
function ccLoadTitle(l){const c=ccCard(l.cardId);return wbTypeName(l.wallet)+' load · '+expMoney(l.amount,l.currency)+' · '+(c?ccMask(c.last4):'');}
/* Copy what the check worked out (rates are retained as at submission, FR-CC-24.04). */
function ccLoadApplyChk(l,chk){
  l.amount=chk.amount;l.currency=chk.currency;l.cardAmount=chk.cardAmount;l.cardCurrency=chk.p.currency;l.fxCard=chk.fxCard||null;
  l.sourceId=chk.src?chk.src.id:'';l.srcAmount=chk.src&&chk.srcAmount!=null?chk.srcAmount:'';l.srcCurrency=chk.src?chk.src.currency:'';l.fxSrc=chk.fxSrc||null;
  l.allocId=chk.alloc?chk.alloc.row.id:null;l.allocKey=chk.alloc?chk.alloc.row.key:'';l.batchKey=chk.alloc?chk.alloc.batch.key:'';
  l.lines[0].amount=chk.amount;l.lines[0].title='Load · '+wbTypeName(l.wallet)+' · '+ccMask(chk.card.last4);l.title=ccLoadTitle(l);
}
function ccLoadNew(d,chk,origin,A){
  const c=chk.card,p=chk.p,e=idEmp(c.employeeEid)||{};
  const l={id:ccLoadNextId++,key:ccLoadNextKey++,prefix:'CLD',kind:'card load',entity:c.entity,cardId:c.id,programmeId:p.id,employeeEid:c.employeeEid,
    name:e.name||'',empId:e.empId||'',email:e.email||'',dept:e.dept||'',wallet:chk.w.code,benefit:!!chk.w.benefit,
    amount:0,currency:'',cardAmount:0,cardCurrency:p.currency,fxCard:null,sourceId:'',srcAmount:'',srcCurrency:'',fxSrc:null,allocId:null,allocKey:'',batchKey:'',
    reason:String(d.reason||'').trim(),comments:String(d.comments||'').trim(),doc:d.doc||'',dupAck:String(d.dupAck||'').trim(),extRef:String(d.ref||'').trim(),idem:d.idem||'',
    origin:origin,authorization:null,noEngine:false,period:'',exec:null,
    claimFor:'Others',mode:'On Behalf',status:'Draft',createdBy:A.who,actualBy:caVia(A),createdAt:ccStamp(A),migrated:true,idMigrated:true,category:'Card Load',title:'',
    lines:[{id:1,title:'',amount:0,subCat:'Card Load',start:A.iso,end:A.iso,status:'Pending',approved:null}],logs:[]};
  ccLoadApplyChk(l,chk);
  return l;
}
function ccLoadMay(A){return ccPCan(A,'card.load.create')?'':caN(A.who)+' cannot create card loads (card.load.create).';}

/* ── Individual loads (FR-CC-13, WF-CC-04) ─────────────────────────────── */
/* d: cardId, wallet, allocId (benefit), amount, currency, sourceId, reason, comments, doc, dupAck. */
function ccLoadCreate(d,submit,A){
  A=A||ccNow();d=d||{};
  const may=ccLoadMay(A);if(may)return {error:may};
  const chk=ccLoadCheck(d,{purpose:'draft',origin:'Individual',iso:A.iso});
  if(chk.errors.length)return {error:chk.errors.join(' ')};
  if(String(d.reason||'').trim().length<5)return {error:'Give the load reason (at least 5 characters).'};
  const l=ccLoadNew(d,chk,{type:'Individual'},A);
  ccLog(l,'Draft','Card load drafted by '+caN(A.who)+': '+l.title+' for '+l.name+'.',A);
  ccLog(chk.card,chk.card.status,'Card load '+expKey(l)+' drafted ('+expMoney(l.amount,l.currency)+', '+wbTypeName(l.wallet)+').',A);
  ccLoads.unshift(l);
  if(submit){const se=ccLoadSubmit(l.id,A);if(se){ccLoads.shift();ccLoadNextId--;ccLoadNextKey--;chk.card.logs.shift();return {error:se};}}
  return {rec:l};
}
function ccLoadUpdate(id,d,A){
  A=A||ccNow();d=d||{};
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return 'No such load.';
  if(['Draft','Follow-Up'].indexOf(l.status)<0)return expKey(l)+' is '+ccLoadLabel(l)+'; only a draft or a load sent back is edited.';
  if(!(l.createdBy===A.who||ccPCan(A,'card.load.create')))return caN(A.who)+' cannot edit '+expKey(l)+'.';
  if(l.noEngine)return expKey(l)+' was authorized by '+l.authorization.key+'; it is not edited.';
  const nd=Object.assign(ccLoadData(l),{reason:l.reason,comments:l.comments,doc:l.doc},d);
  if(nd.cardId!==l.cardId)return 'The card of a load does not change; raise a new load for another card.';
  const chk=ccLoadCheck(nd,{purpose:'draft',origin:l.origin.type,exceptId:l.id,iso:A.iso});
  if(chk.errors.length)return chk.errors.join(' ');
  if(String(nd.reason||'').trim().length<5)return 'Give the load reason (at least 5 characters).';
  const before={wallet:l.wallet,amount:l.amount,currency:l.currency,sourceId:l.sourceId,allocId:l.allocId,reason:l.reason,comments:l.comments};
  l.wallet=chk.w.code;l.benefit=!!chk.w.benefit;ccLoadApplyChk(l,chk);
  l.reason=String(nd.reason).trim();l.comments=String(nd.comments||'').trim();l.doc=nd.doc||'';l.dupAck=String(nd.dupAck||'').trim();
  const ch=Object.keys(before).filter(function(k){return JSON.stringify(before[k])!==JSON.stringify(l[k]);});
  if(ch.length){ccLog(l,l.status,'Edited by '+caN(A.who)+' ('+ch.join(', ')+'). Before: '+ch.map(function(k){return k+' '+JSON.stringify(before[k]);}).join('; ')+'.',A);
    if(A.who!==l.createdBy)caAddPreparer(l,A.who);}
  return '';
}
function ccLoadSubmit(id,A){
  A=A||ccNow();
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return 'No such load.';
  if(l.status!=='Draft')return 'Only a draft is submitted; '+expKey(l)+' is '+ccLoadLabel(l)+'.';
  const may=ccLoadMay(A);if(may)return may;
  const per=A.iso.slice(0,7);
  const chk=ccLoadCheck(ccLoadData(l),{purpose:'submit',origin:l.origin.type,exceptId:l.id,period:per,iso:A.iso});
  if(chk.errors.length)return chk.errors.join(' ');
  ccLoadApplyChk(l,chk);l.period=per;l.submittedAt=ccStamp(A);l.submittedBy=A.who;
  if(chk.warnings.length)l.warnings=chk.warnings.slice();
  if(l.benefit&&!(l.origin&&l.origin.reraiseOf)&&ccProgFunding(chk.p).benefitAuth!=='Card Load route'){
    const al=chk.alloc;
    ccLoadAuthorize(l,{type:'Benefit allocation',key:al.batch.key,by:al.batch.approvedBy||'',at:al.batch.approvedAt||'',
      text:ccAllocAuthText(al),
      why:'the approved batch already authorizes this amount for this person, so the load is not approved twice (FR-CC-15).'},A);
    return '';
  }
  const pre=ccEnginePreflight(l);if(pre.error)return pre.error;
  if(!caStart(l,pre,A))return expKey(l)+' already has an approval in progress.';
  ccLog(ccCard(l.cardId),ccCard(l.cardId).status,'Card load '+expKey(l)+' submitted for approval ('+expMoney(l.amount,l.currency)+').',A);
  if(chk.warnings.length)ccLog(l,l.status,'Submitted with warnings: '+chk.warnings.join(' '),A);
  return '';
}
/* Authorized without the card-load route: a benefit allocation, or a bulk file's approval for its row. */
function ccLoadExecInit(l,A){
  A=A||ccNow();const days=ccProgFunding(ccProg(l.programmeId)).validityDays||30;
  l.exec={status:'Awaiting Execution',recorded:0,reversed:0,demo:null,events:[],attempts:1,posted:[],closed:false,authAt:A.iso,authStamp:ccStamp(A),validityDays:days,expiresOn:wbAddDays(A.iso,days)};
}
function ccLoadAuthorize(l,auth,A){
  l.noEngine=true;l.status='Approved';l.authorization=auth;l.lines[0].status='Approved';l.lines[0].approved=l.amount;l.approvedAmt=l.amount;l.finalAt=A.iso;
  if(!l.period)l.period=A.iso.slice(0,7);
  ccLoadExecInit(l,A);
  ccLog(l,'Awaiting Execution','Authorized by '+auth.text+'. No separate card-load approval: '+auth.why+' Nothing is loaded and no funding is debited until execution is recorded and verified.',A);
  ccLoadNotifyExec(l,A);
}
function ccLoadNotifyExec(l,A){
  ccNotify(ccPeopleWith('card.load.create',l.entity).filter(function(u){return u!==A.who;}),expKey(l)+' is authorized and awaits execution ('+expMoney(l.amount,l.currency)+' to '+wbTypeName(l.wallet)+' on '+ccCardLabel(ccCard(l.cardId))+').',l);
}
function ccLoadPreflight(r,o){
  const chk=ccLoadCheck(ccLoadData(r),{purpose:'submit',origin:r.origin.type,exceptId:r.id,period:r.period||wbToday().slice(0,7)});
  if(chk.errors.length)return {error:chk.errors.join(' ')};
  return ccEnginePreflight(r,o);
}
/* Every approving decision checks the load again: a card suspended or a limit used up meanwhile stops it (FR-CC-24.08). */
function ccLoadDecisionCheck(r,items){
  if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
  const chk=ccLoadCheck(ccLoadData(r),{purpose:'approve',origin:r.origin.type,exceptId:r.id,period:r.period});
  return chk.errors.length?'Cannot approve '+expKey(r)+' now: '+chk.errors.join(' '):'';
}
function ccLoadOnFinal(r,A){
  if(['Approved','Partially Approved'].indexOf(r.status)<0)return;
  ccLoadExecInit(r,A);
  ccLog(r,'Awaiting Execution','Approved: execution is authorized. Nothing has been loaded and no funding has been debited; the load counts only once its execution is recorded and verified.',A);
  ccNotify([ccHolderUser(ccCard(r.cardId))],expKey(r)+': a load of '+expMoney(r.amount,r.currency)+' to your card was approved. It is not on the card until it is executed.',r);
  ccLoadNotifyExec(r,A);
}
ccRegisterKind('card load',{
  perms:{approve:'card.load.approve',submit:'card.load.create',others:'card.load.create',withdraw:'card.load.create',withdrawOthers:'card.load.create',reassign:'card.load.create'},
  rec:function(id){if(typeof mcOn==='function'&&!mcOn('cards'))return null;const x=ccLoad(id);return x&&!x.noEngine?x:null;},
  recs:function(){return typeof mcOn==='function'&&!mcOn('cards')?[]:ccLoads.filter(function(x){return !x.noEngine;});},
  policySig:function(r){return [r.kind,r.cardId,r.wallet,r.currency,caTotal(r),r.sourceId].join('|');},
  preflight:function(r,o){return ccLoadPreflight(r,o);},decisionCheck:function(r,items){return ccLoadDecisionCheck(r,items);},onFinal:function(r,A){ccLoadOnFinal(r,A);},
  partialMsg:'Card loads are approved in full, rejected or sent back.',
  finalNote:'Approval authorizes execution only: nothing is loaded and no funding is debited until execution is recorded and verified.',
  finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+(r.status!=='Rejected'?' - it awaits execution; nothing has been loaded yet':'')+'.';},
  decisionHint:'Approves the load as a whole. It authorizes execution only; no money moves on approval.'});
if(typeof CA_TYPE_LABEL!=='undefined')CA_TYPE_LABEL['card load']='Card Load';

/* ── Execution: one entry point, with its source (FR-CC-13.08-14, 19.11-12, 24.06) ── */
function ccLoadExecAwaiting(l){return ccLoadExecs.find(function(e){return e.loadId===l.id&&e.status==='Awaiting Verification';})||null;}
function ccLoadExecsOf(l){return ccLoadExecs.filter(function(e){return e.loadId===l.id;});}
/* A provider reference is recorded once: across card loads and Build 6 funding entries. */
function ccLoadRefUsed(ref,exceptId,ent){
  const n=caNorm(ref);if(!n)return '';
  const e=ccLoadExecs.find(function(x){return x.id!==exceptId&&x.entity===ent&&x.status!=='Rejected'&&caNorm(x.ref)===n;});
  if(e)return expKey(e)+' ('+expKey(ccLoad(e.loadId))+')';
  if(typeof fbRefUsed==='function'&&fbRefUsed(ref,null,ent)&&!fbTxns.some(function(t){return t.origin&&t.origin.type==='card load'&&caNorm(t.ref)===n;}))return 'a funding entry';
  return '';
}
/* Who verifies: card.load.verify, and none of the recorder, the cardholder or the load's requester -
   compared as the real people, so Switch User changes nothing. */
function ccLoadVerifyBar(l,e,A){
  const realA=caVia(A)||A.who,holder=caClaimantUser(l);
  if(A.who===e.recordedBy||realA===(e.actual||e.recordedBy))return 'Maker-checker: '+caN(e.recordedBy)+' recorded '+expKey(e)+'; another person verifies it.';
  if(holder&&(A.who===holder||realA===holder))return caN(holder)+' holds the card; a cardholder never verifies a load to their own card.';
  if(A.who===l.createdBy||realA===(l.actualBy||l.createdBy))return caN(l.createdBy)+' requested '+expKey(l)+'; someone independent verifies its execution.';
  return '';
}
function ccLoadVerifiers(l,e){
  return ccPeopleWith('card.load.verify',l.entity).filter(function(u){return !ccLoadVerifyBar(l,e,{who:u,actual:''});});
}
/* Mark an authorized load as instructed to the provider (outside ADT). */
function ccLoadMarkProcessing(id,d,A){
  A=A||ccNow();d=d||{};
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return 'No such load.';
  if(!ccPCan(A,'card.load.create'))return caN(A.who)+' cannot execute card loads (card.load.create).';
  if(l.exec)ccLoadExpire(l,A);
  if(l.exec&&l.exec.expired)return 'The authorization of '+expKey(l)+' expired on '+cdLabel(l.exec.expired.on)+'; re-raise the remaining amount as a new load.';
  if(!l.exec||l.exec.status!=='Awaiting Execution')return expKey(l)+' is '+ccLoadLabel(l)+'; only a load awaiting execution is sent to the provider.';
  const c=ccCard(l.cardId);
  if(!ccCardUsable(c))return ccCardLabel(c)+' is '+(c.status!=='Active'?c.status:'on hold or has a pending provider request')+'; it cannot be loaded now. Cancel the load or wait.';
  l.exec.status='Processing';l.exec.instruction={ref:String(d.ref||'').trim(),note:String(d.note||'').trim(),at:ccStamp(A),by:A.who,actual:caVia(A)};
  ccLog(l,'Processing','Instructed to '+ccProviderName(c.provider)+' outside ADT by '+caN(A.who)+(l.exec.instruction.ref?' (instruction '+l.exec.instruction.ref+')':'')
    +'. Nothing is recorded as loaded until the provider\'s confirmation is recorded and verified.',A);
  return '';
}
/* d: result ('Recorded' or 'Failed'), amount (Recorded; default all that remains), source, ref, evidence, date, note. */
function ccLoadExecRecord(id,d,A){
  A=A||ccNow();d=d||{};
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return {error:'No such load.'};
  if(!ccPCan(A,'card.load.create'))return {error:caN(A.who)+' cannot record card-load execution (card.load.create).'};
  if(d.source===CC_SRC_MANUAL||d.late){const why=ccCardDemoWhy(ccCard(l.cardId));if(why)return {error:why};}
  if(l.exec)ccLoadExpire(l,A);
  if(l.exec&&l.exec.expired){
    if(!d.late)return {error:'The authorization of '+expKey(l)+' expired on '+cdLabel(l.exec.expired.on)+'. Re-raise the remaining amount as a new load, or - if the provider actually executed it - record a late execution exception.'};
    return ccLoadLateRecord(l,d,A);
  }
  if(!l.exec||CC_EXEC_OPEN.indexOf(l.exec.status)<0||l.exec.closed)return {error:expKey(l)+' is '+ccLoadLabel(l)+'; execution is recorded only for an authorized load not yet fully recorded.'};
  const aw=ccLoadExecAwaiting(l);if(aw)return {error:expKey(aw)+' for '+expKey(l)+' already awaits verification.'};
  if(CC_EXEC_RESULTS.indexOf(d.result)<0)return {error:'Pick the execution result.'};
  const src=d.source,c=ccCard(l.cardId);
  if(src===CC_SRC_PROVIDER)return {error:'Provider Confirmed results arrive only from a connected provider integration. '+ccProviderName(c.provider)+' is not connected; record Manually Verified evidence instead.'};
  const ref=String(d.ref||'').trim();
  if(src===CC_DEMO){
    if(!ccDemoOn(l.entity))return {error:'Presentation mode is off for '+idEntityName(l.entity)+'; execution needs provider evidence (Manually Verified).'};
    if(!ccPCan(A,'card.demo.simulate'))return {error:caN(A.who)+' cannot record illustrative events (card.demo.simulate).'};
    if(l.exec.demo===false)return {error:expKey(l)+' already has genuine verified execution; the rest is not illustrative.'};
    if(!ccCardUsable(c))return {error:ccCardLabel(c)+' is '+c.status+(c.hold&&c.hold.active?' and on hold':'')+'; an illustrative load is not recorded on it.'};
  }else if(src===CC_SRC_MANUAL){
    if(l.exec.demo===true)return {error:expKey(l)+' was executed as '+CC_DEMO+'; genuine execution is never added to an illustrative load. Cancel the rest and raise a new load.'};
    if(ref.length<3)return {error:'Enter the provider\'s confirmation reference for this execution.'};
    if(!String(d.evidence||'').trim())return {error:'Attach or describe the evidence (provider statement, portal screen or advice).'};
    if(!d.date||d.date>wbToday())return {error:'Enter the date the provider executed it (not in the future).'};
    const du=ccLoadRefUsed(ref,null,l.entity);if(du)return {error:'Reference '+ref+' is already recorded on '+du+'; one external movement is recorded once.'};
  }else return {error:'Pick the confirmation source.'};
  let amt=0;
  if(d.result==='Recorded'){
    const rem=ccLoadRemaining(l),raw=d.amount==null||String(d.amount).trim()===''?String(rem):String(d.amount).replace(/,/g,'');
    amt=ccM(Number(raw));
    if(!(amt>0))return {error:'Enter the amount loaded.'};
    if(amt>rem+0.001)return {error:'Only '+expMoney(rem,l.currency)+' remains to be loaded on '+expKey(l)+'.'};
  }
  const e={id:ccLexNextId++,key:ccLexNextKey++,prefix:'LEX',entity:l.entity,loadId:l.id,type:'execution',result:d.result,amount:amt,source:src,ref:ref,
    evidence:String(d.evidence||'').trim(),date:d.date||A.iso,note:String(d.note||'').trim(),status:src===CC_DEMO?'Applied':'Awaiting Verification',
    recordedBy:A.who,actual:caVia(A),recordedAt:ccStamp(A),postingId:null};
  ccLoadExecs.unshift(e);l.exec.events.push(e.id);
  if(src===CC_DEMO){ccLoadExecApply(e,A);return {rec:e};}
  ccLog(l,ccLoadPhase(l),(d.result==='Recorded'?'Execution of '+expMoney(amt,l.currency):'Execution failure')+' recorded by '+caN(A.who)+' from provider evidence (ref '+ref+'). '
    +'It takes effect once another person verifies it ('+expKey(e)+'); no funding is posted until then.',A);
  ccNotify(ccLoadVerifiers(l,e),expKey(e)+': execution of '+expKey(l)+' ('+expMoney(amt||l.amount,l.currency)+') awaits your verification.',l);
  return {rec:e};
}
function ccLoadExecVerify(id,A){
  A=A||ccNow();
  const e=ccLoadExec(id);if(!e||e.entity!==ccEnt())return 'No such execution record.';
  if(e.status!=='Awaiting Verification')return expKey(e)+' is '+e.status+'.';
  if(!ccPCan(A,'card.load.verify'))return caN(A.who)+' cannot verify card-load execution (card.load.verify).';
  const l=ccLoad(e.loadId),bar=ccLoadVerifyBar(l,e,A);if(bar)return bar;
  if(e.type==='execution'&&e.late){
    if(!l.exec||e.amount>ccLoadRemaining(l)+0.001)return 'Cannot apply it now: only '+expMoney(ccLoadRemaining(l),l.currency)+' of '+expKey(l)+' was left unexecuted.';
  }else if(e.type==='execution'){
    if(l.exec&&l.exec.expiresOn&&e.date>l.exec.expiresOn)return 'Cannot apply it: it was executed on '+cdLabel(e.date)+', after the authorization expired on '+cdLabel(l.exec.expiresOn)+'. Reject it and record a late execution exception.';
    if(!l.exec||CC_EXEC_OPEN.indexOf(l.exec.status)<0||l.exec.closed)return 'Cannot apply it now: '+expKey(l)+' is '+ccLoadLabel(l)+'.';
    if(e.result==='Recorded'&&e.amount>ccLoadRemaining(l)+0.001)return 'Cannot apply it now: only '+expMoney(ccLoadRemaining(l),l.currency)+' remains on '+expKey(l)+'.';
  }else{
    const e0=ccLoadExec(e.execId);
    if(!e0||!l.exec||['Recorded','Partially Recorded'].indexOf(l.exec.status)<0)return 'Cannot apply it now: '+expKey(l)+' is '+ccLoadLabel(l)+'.';
    if(e.amount>ccExecReversible(e0)+0.001)return 'Cannot apply it now: only '+expMoney(ccExecReversible(e0),l.currency)+' of '+expKey(e0)+' is left to reverse.';
  }
  const du=ccLoadRefUsed(e.ref,e.id,e.entity);if(du)return 'Reference '+e.ref+' is already recorded on '+du+'; reject this record.';
  e.status='Verified';e.verifiedBy=A.who;e.verifiedActual=caVia(A);e.verifiedAt=ccStamp(A);
  ccLoadExecApply(e,A);
  return '';
}
function ccLoadExecReject(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const e=ccLoadExec(id);if(!e||e.entity!==ccEnt())return 'No such execution record.';
  if(e.status!=='Awaiting Verification')return expKey(e)+' is '+e.status+'.';
  if(!ccPCan(A,'card.load.verify'))return caN(A.who)+' cannot verify card-load execution (card.load.verify).';
  const realA=caVia(A)||A.who;if(A.who===e.recordedBy||realA===(e.actual||e.recordedBy))return 'Maker-checker: '+caN(e.recordedBy)+' recorded '+expKey(e)+'; another person reviews it.';
  if(!reason)return 'Say why the evidence is rejected.';
  e.status='Rejected';e.rejectedBy=A.who;e.rejectedAt=ccStamp(A);e.rejectReason=reason;
  const l=ccLoad(e.loadId);
  ccLog(l,ccLoadPhase(l),(e.type==='reversal'?'Reversal':'Execution')+' record '+expKey(e)+' rejected by '+caN(A.who)+': '+reason+'. Nothing changed and nothing was posted.',A);
  ccNotify([e.recordedBy],expKey(e)+' was rejected: '+reason,l);
  return '';
}
/* Apply a verified (or demo) execution: the load moves; a genuine one posts once on its Build 6 source. */
function ccLoadExecApply(e,A){
  const l=ccLoad(e.loadId),c=ccCard(l.cardId),demo=e.source===CC_DEMO,src=l.sourceId?fbSource(l.sourceId):null;
  const tag=demo?' ('+CC_DEMO+': no money moved, nothing posted to funding)':' (Manually Verified, '+expKey(e)+(e.verifiedBy?', verified by '+caN(e.verifiedBy):'')+')';
  if(e.type==='reversal'){
    /* A reversal of part or all of one execution: its own linked event; the execution and its entry stay. */
    const e0=ccLoadExec(e.execId);
    l.exec.reversed=ccM((l.exec.reversed||0)+e.amount);
    const ended=l.exec.closed||l.exec.status==='Recorded';
    if(ended&&l.exec.reversed>=l.exec.recorded-0.001){l.exec.status='Reversed';l.exec.closed=true;}
    let post=null;
    const t=!demo&&e0&&e0.postingId?fbTxn(e0.postingId):null;
    if(t){
      const done=ccLoadExecs.filter(function(x){return x.type==='reversal'&&x.execId===e0.id&&x.id!==e.id&&x.postingId&&['Verified','Applied'].indexOf(x.status)>=0;})
        .reduce(function(n,x){const q=fbTxn(x.postingId);return n+(q?q.amount:0);},0);
      const last=ccExecReversible(e0)<=0.001;
      /* In the source currency at the rate of the original entry; the last part takes exactly what is left. */
      const part=last?ccM(t.amount-done):ccM(e.amount*t.amount/e0.amount);
      post=fbPostSystem({key:t.origin.key+'#R'+expKey(e),sourceId:t.sourceId,type:'Card Load Reversal',dir:1,amount:part,date:e.date,ref:e.ref,originType:'card load',recKey:expKey(l),recId:l.id,reversalOf:last?t.id:null,
        desc:'Reversal'+(last?'':' (part)')+' of '+t.key+' - card load '+expKey(l)+', execution '+expKey(e0)+': '+expMoney(e.amount,l.currency)+(t.currency!==l.currency?' = '+expMoney(part,t.currency)+' at the rate of the original entry':'')
          +'. '+e.note+'. Reference '+e.ref+', verified by '+caN(A.who)+'.'},A);
      if(post){e.postingId=post.id;e.postingIds=[post.id];}
    }
    ccLog(l,ccLoadPhase(l),(l.exec.status==='Reversed'?'Reversed':'Partly reversed')+': '+expMoney(e.amount,l.currency)+' of '+(e0?expKey(e0):'the execution')+tag+'. Reason: '+e.note+'. '
      +expMoney(ccM(l.exec.recorded-l.exec.reversed),l.currency)+' stays recorded (net). The original execution'+(t?' and funding entry '+t.key:'')+' are unchanged'+(post?'; reversal entry '+post.key+' posted once on '+(fbSource(t.sourceId)||{}).key:'')+'.',A);
    ccLog(c,c.status,'Load '+expKey(l)+': '+expMoney(e.amount,l.currency)+' reversed'+(demo?' ('+CC_DEMO+')':'')+'.',A);
    ccNotify([ccHolderUser(c)],expKey(l)+': '+expMoney(e.amount,l.currency)+' of a load to your card was reversed'+(demo?' ('+CC_DEMO+')':'')+'.',l);
    return;
  }
  if(e.result==='Failed'){
    if(l.exec.recorded>0){l.exec.closed=true;l.exec.status='Partially Recorded';}else l.exec.status='Failed';
    ccLog(l,l.exec.status,'Execution failed'+tag+(e.note?': '+e.note:'')+'. '+(l.exec.recorded>0?'Nothing beyond the '+expMoney(l.exec.recorded,l.currency)+' already recorded was loaded; the rest is closed.':'Nothing was loaded and nothing was posted. It can be retried or cancelled.'),A);
    ccNotify(ccPeopleWith('card.load.create',l.entity).filter(function(u){return u!==A.who;}),expKey(l)+': execution failed'+(demo?' ('+CC_DEMO+')':'')+'.',l);
    return;
  }
  l.exec.demo=demo;
  l.exec.recorded=ccM(l.exec.recorded+e.amount);
  const full=l.exec.recorded>=l.amount-0.001;
  l.exec.status=full?'Recorded':'Partially Recorded';
  let post=null;
  if(!demo&&src){
    /* The last part takes what is left of the source amount, so the parts add up exactly. */
    const before=(l.exec.posted||[]).reduce(function(s,id){const t=fbTxn(id);return s+(t?t.amount:0);},0);
    const part=full?ccM(Number(l.srcAmount)-before):(l.fxSrc?ccM(e.amount*l.fxSrc.rate):e.amount);
    post=fbPostSystem({key:'CLD-'+l.key+'#'+expKey(e),sourceId:src.id,type:'Card Load',dir:-1,amount:part,date:e.date,ref:e.ref,originType:'card load',recKey:expKey(l),recId:l.id,
      desc:'Card load '+expKey(l)+': '+expMoney(e.amount,l.currency)+' to the '+wbTypeName(l.wallet)+' wallet of '+ccCardLabel(c)+' ('+ccHolderName(c)+'), executed '+cdLabel(e.date)+', reference '+e.ref
        +(l.fxSrc?', at '+ccFxText(l.fxSrc):'')+'. Verified by '+caN(A.who)+'.'},A);
    if(post){e.postingId=post.id;l.exec.posted.push(post.id);}
  }
  ccLog(l,l.exec.status,(full?'Recorded':'Partially recorded')+': '+expMoney(e.amount,l.currency)+(l.fxCard?' ('+expMoney(ccToCard(l,e.amount),l.cardCurrency)+')':'')+' loaded to '+wbTypeName(l.wallet)+' on '+ccCardLabel(c)+tag
    +(full?'.':'; '+expMoney(ccLoadRemaining(l),l.currency)+' remains.')
    +(post?' Funding entry '+post.key+' posted once on '+src.key+'.'+(post.exception?' '+post.exception:''):(!demo?' No funding source is named, so nothing is posted to funding (funding-source tracking is off).':'')),A);
  if(e.late){l.exec.lateExecutions=(l.exec.lateExecutions||0)+1;
    ccLog(l,l.exec.status,'Late execution exception '+expKey(e)+': recorded as it happened after the authorization expired on '+cdLabel(l.exec.expiresOn)+' (reason: '+e.lateReason+'). Verified independently by '+caN(A.who)+'; it was not authorized by an open authorization.',A);}
  ccLog(c,c.status,'Load '+expKey(l)+': '+expMoney(e.amount,l.currency)+' '+(demo?CC_DEMO:'recorded')+' to '+wbTypeName(l.wallet)+(e.late?' (late execution exception)':'')+'.',A);
  ccNotify([ccHolderUser(c)],expMoney(e.amount,l.currency)+' was loaded to the '+wbTypeName(l.wallet)+' wallet of your card '+ccCardLabel(c)+(demo?' ('+CC_DEMO+': no money moved)':'')+'.',l);
}
/* Cancel what has not been executed (a draft, or an authorized load before or between executions). */
function ccLoadCancel(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return 'No such load.';
  if(!(ccPCan(A,'card.load.create')||(l.status==='Draft'&&l.createdBy===A.who)))return caN(A.who)+' cannot cancel card loads (card.load.create).';
  if(!reason)return 'Say why the load is cancelled.';
  if(l.status==='Draft'){l.status='Withdrawn';ccLog(l,'Withdrawn','Draft discarded by '+caN(A.who)+': '+reason+'.',A);return '';}
  if(!l.exec)return expKey(l)+' is '+l.status+'; a load in approval is withdrawn from its Approval tab.';
  if(ccLoadExecAwaiting(l))return 'An execution record awaits verification; verify or reject it first.';
  if(l.exec.status==='Partially Recorded'&&!l.exec.closed){
    l.exec.closed=true;
    ccLog(l,'Partially Recorded','The remaining '+expMoney(ccLoadRemaining(l),l.currency)+' cancelled by '+caN(A.who)+': '+reason+'. The '+expMoney(l.exec.recorded,l.currency)+' recorded stays.',A);
    if((l.exec.reversed||0)>=l.exec.recorded-0.001){l.exec.status='Reversed';ccLog(l,'Reversed','Everything recorded was already reversed; the load ends as Reversed.',A);}
    return '';
  }
  if(['Awaiting Execution','Processing','Failed'].indexOf(l.exec.status)<0)return expKey(l)+' is '+ccLoadLabel(l)+'; it cannot be cancelled.';
  l.exec.status='Cancelled';l.exec.cancel={reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(l,'Cancelled','Cancelled by '+caN(A.who)+': '+reason+'. Nothing was loaded and nothing was posted.',A);
  return '';
}
/* Retry a failed execution: the same load, the same authorization, checked again. */
function ccLoadRetry(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return 'No such load.';
  if(!ccPCan(A,'card.load.create'))return caN(A.who)+' cannot execute card loads (card.load.create).';
  if(l.exec)ccLoadExpire(l,A);
  if(l.exec&&l.exec.expired)return 'The authorization of '+expKey(l)+' expired on '+cdLabel(l.exec.expired.on)+'; re-raise the remaining amount as a new load.';
  if(!l.exec||l.exec.status!=='Failed')return 'Only a failed load is retried.';
  if(!reason)return 'Say what changed since the failure.';
  const chk=ccLoadCheck(ccLoadData(l),{purpose:'execute',origin:l.origin.type,exceptId:l.id,period:l.period});
  if(chk.errors.length)return 'Cannot retry: '+chk.errors.join(' ');
  l.exec.status='Awaiting Execution';l.exec.attempts=(l.exec.attempts||1)+1;
  ccLog(l,'Awaiting Execution','Retry '+l.exec.attempts+' by '+caN(A.who)+': '+reason+'. The same authorization applies; nothing is posted twice.',A);
  return '';
}
/* Reverse what was recorded - a linked correction, never an edit (FR-CC-13.16, 15.11, 24.13). d: note, ref, evidence, date. */
/* What one execution has had reversed (verified or demo), and what is left to reverse. */
function ccExecReversed(e){return ccM(ccLoadExecs.filter(function(x){return x.type==='reversal'&&x.execId===e.id&&['Verified','Applied'].indexOf(x.status)>=0;}).reduce(function(n,x){return n+x.amount;},0));}
function ccExecReversible(e){return e&&e.type==='execution'&&e.result==='Recorded'&&['Verified','Applied'].indexOf(e.status)>=0?Math.max(0,ccM(e.amount-ccExecReversed(e))):0;}
function ccLoadReversibleExecs(l){return ccLoadExecsOf(l).filter(function(e){return ccExecReversible(e)>0.001;});}
/* Reverse part or all of a recorded execution - a linked correction, never an edit (FR-CC-13.16, 15.11, 24.13;
   B7-N13). d: execId (default the latest reversible execution), amount (default what is left of it), note,
   ref, evidence, date. Several partial reversals may follow until the execution is fully reversed. A
   reversal of an executed amount is not a cancellation of an unexecuted one (Cancel Remaining). */
function ccLoadReverse(id,d,A){
  A=A||ccNow();d=d||{};
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return {error:'No such load.'};
  if(!ccPCan(A,'card.load.create'))return {error:caN(A.who)+' cannot correct card loads (card.load.create).'};
  if(!l.exec||['Recorded','Partially Recorded'].indexOf(l.exec.status)<0||!(l.exec.recorded>(l.exec.reversed||0)+0.001))return {error:'Only a load with recorded, unreversed execution is reversed.'};
  const aw=ccLoadExecAwaiting(l);if(aw)return {error:expKey(aw)+' of '+expKey(l)+' awaits verification; verify or reject it before another reversal.'};
  const list=ccLoadReversibleExecs(l),e0=d.execId?ccLoadExec(d.execId):list[0];
  if(!e0||e0.loadId!==l.id||e0.type!=='execution')return {error:'Pick the execution being reversed.'};
  const room=ccExecReversible(e0);if(!(room>0.001))return {error:expKey(e0)+' has nothing left to reverse.'};
  const raw=d.amount==null||String(d.amount).trim()===''?String(room):String(d.amount).replace(/,/g,'').trim(),n=Number(raw);
  if(!(n>0)||!isFinite(n))return {error:'Enter the amount reversed (more than zero).'};
  if(Math.abs(n*100-Math.round(n*100))>1e-6)return {error:'An amount has at most two decimals.'};
  const amt=ccM(n);
  if(amt>room+0.001)return {error:'At most '+expMoney(room,l.currency)+' of '+expKey(e0)+' is left to reverse ('+expMoney(e0.amount,l.currency)+' executed, '+expMoney(ccExecReversed(e0),l.currency)+' already reversed).'};
  const note=String(d.note||'').trim();if(!note)return {error:'Say why the load is reversed.'};
  const demo=e0.source===CC_DEMO,ref=String(d.ref||'').trim();
  if(!demo){
    if(ref.length<3)return {error:'Enter the provider\'s reference for the reversal.'};
    if(!String(d.evidence||'').trim())return {error:'Attach or describe the reversal evidence.'};
    if(!d.date||d.date>wbToday())return {error:'Enter the reversal date (not in the future).'};
    if(d.date<e0.date)return {error:'A reversal is not dated before the execution it reverses ('+cdLabel(e0.date)+').'};
    const du=ccLoadRefUsed(ref,null,l.entity);if(du)return {error:'Reference '+ref+' is already recorded on '+du+'; one external movement is recorded once.'};
  }else{
    if(!ccDemoOn(l.entity))return {error:'Presentation mode is off for '+idEntityName(l.entity)+'; an illustrative execution is not reversed while it is off.'};
    if(!ccPCan(A,'card.demo.simulate'))return {error:caN(A.who)+' cannot record illustrative events (card.demo.simulate).'};
  }
  const e={id:ccLexNextId++,key:ccLexNextKey++,prefix:'LEX',entity:l.entity,loadId:l.id,type:'reversal',result:'Reversed',execId:e0.id,execKey:expKey(e0),amount:amt,
    source:demo?CC_DEMO:CC_SRC_MANUAL,ref:ref,evidence:String(d.evidence||'').trim(),date:d.date||A.iso,note:note,status:demo?'Applied':'Awaiting Verification',
    recordedBy:A.who,actual:caVia(A),recordedAt:ccStamp(A)};
  ccLoadExecs.unshift(e);l.exec.events.push(e.id);
  if(demo){ccLoadExecApply(e,A);return {rec:e};}
  ccLog(l,ccLoadPhase(l),'Reversal of '+expMoney(amt,l.currency)+' of '+expKey(e0)+' recorded by '+caN(A.who)+' (ref '+ref+'): '+note+'. It takes effect, and posts to funding, once another person verifies it ('+expKey(e)+').',A);
  ccNotify(ccLoadVerifiers(l,e),expKey(e)+': reversal of '+expMoney(amt,l.currency)+' on '+expKey(l)+' awaits your verification.',l);
  return {rec:e};
}

/* ══ Bulk card enrollment and bulk card loads (FR-CC-14, WF-CC-05, decision C2) ═══════════════════════
   Template → upload (CSV or XLSX) → every row validated with the same checks as a single request or
   load → valid and invalid rows shown apart, with row-wise errors → correct, exclude or re-upload →
   submit → approval → each approved row becomes its own record → per-row results, safe retry.
   Enrollment: an independent checker validates the file; each row then becomes its own card request on
   the card request route, so every employee's reporting-manager stage stays (§41.16).
   Loads: one file-level approval with row review, only for rows whose own route is the same; a row
   whose route differs or names its employee's manager goes through its own route. Benefit wallets
   are not loaded from a file: they load from approved Wallet & Benefits allocations (Benefit Loads). */
const CC_BULK={
  'bulk card enrollment':{prefix:'BCE',noun:'enrollment',perm:'card.enrollment.bulk',label:'Bulk Card Enrollment',file:'card-enrollment',
    cols:[['empId','Employee ID',1],['entity','Entity',1],['programme','Card Programme',1],['cardType','Card Type',1],['action','Requested Action',1],
      ['reason','Business Reason',0],['delivery','Delivery',0],['address','Delivery Address',0],['comments','Comments',0]]},
  'bulk card load':{prefix:'BCL',noun:'load',perm:'card.load.bulk',label:'Bulk Card Load',file:'card-loads',
    cols:[['empId','Employee ID',1],['card','Card Reference',1],['programme','Card Programme',1],['wallet','Wallet',1],['amount','Amount',1],['currency','Currency',1],
      ['source','Funding Source',0],['ref','Load Reference',1],['reason','Load Reason',0]]}
};
const CC_BULK_MAX_ROWS=500;
function ccBulk(id){return ccBulks.find(function(b){return b.id===Number(id);})||null;}
function ccBulkLabel(b){return b.status;}
function ccHashText(s){let h=0x811c9dc5;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return ('0000000'+h.toString(16)).slice(-8);}

/* ── Reading a file: CSV, or XLSX (stored or deflated) without a library ── */
function ccCsvGrid(text){
  const rows=[];let row=[],cell='',q=false;text=String(text||'').replace(/^﻿/,'');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;}
    else if(ch==='"')q=true;
    else if(ch===','){row.push(cell);cell='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  return rows;
}
function ccZipEntries(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)return null;
  const n=dv.getUint16(eocd+10,true),out={};let off=dv.getUint32(eocd+16,true);
  for(let k=0;k<n;k++){
    if(off+46>u8.length||dv.getUint32(off,true)!==0x02014b50)return null;
    const method=dv.getUint16(off+10,true),csize=dv.getUint32(off+20,true),nlen=dv.getUint16(off+28,true),elen=dv.getUint16(off+30,true),clen=dv.getUint16(off+32,true),lho=dv.getUint32(off+42,true);
    const name=new TextDecoder().decode(u8.subarray(off+46,off+46+nlen));
    const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true);
    out[name]={method:method,data:u8.subarray(start,start+csize)};
    off+=46+nlen+elen+clen;
  }
  return out;
}
function ccZipText(ent){
  if(!ent)return Promise.resolve(null);
  if(ent.method===0)return Promise.resolve(new TextDecoder().decode(ent.data));
  if(ent.method===8&&typeof DecompressionStream==='function')
    return new Response(new Blob([ent.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function(b){return new TextDecoder().decode(new Uint8Array(b));});
  return Promise.reject(new Error('This workbook uses a compression the browser cannot read; save it again as .xlsx or .csv.'));
}
function ccColNum(letters){let n=0;String(letters||'').toUpperCase().split('').forEach(function(ch){n=n*26+(ch.charCodeAt(0)-64);});return n;}
function ccXmlAll(doc,tag){return doc.getElementsByTagNameNS('*',tag);}
function ccXlsxGrid(u8){
  const z=ccZipEntries(u8);
  if(!z||!z['xl/workbook.xml'])return Promise.reject(new Error('This is not a valid .xlsx workbook.'));
  return Promise.all([ccZipText(z['xl/workbook.xml']),ccZipText(z['xl/_rels/workbook.xml.rels']),ccZipText(z['xl/sharedStrings.xml'])]).then(function(t){
    const P=new DOMParser(),wb=P.parseFromString(t[0],'application/xml'),sh=ccXmlAll(wb,'sheet')[0];
    if(!sh)throw new Error('The workbook has no sheet.');
    const rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let target='worksheets/sheet1.xml';
    if(t[1]){const rels=ccXmlAll(P.parseFromString(t[1],'application/xml'),'Relationship');for(let i=0;i<rels.length;i++)if(rels[i].getAttribute('Id')===rid)target=rels[i].getAttribute('Target');}
    target=target.replace(/^\//,'');if(target.indexOf('xl/')!==0)target='xl/'+target;
    const ss=[];
    if(t[2]){const si=ccXmlAll(P.parseFromString(t[2],'application/xml'),'si');for(let i=0;i<si.length;i++){const ts=ccXmlAll(si[i],'t');let s='';for(let j=0;j<ts.length;j++)s+=ts[j].textContent;ss.push(s);}}
    return ccZipText(z[target]).then(function(x){
      if(x==null)throw new Error('The first sheet could not be read.');
      const rs=ccXmlAll(P.parseFromString(x,'application/xml'),'row'),grid=[];
      for(let i=0;i<rs.length;i++){
        const rn=Number(rs[i].getAttribute('r'))||(grid.length+1),cs=ccXmlAll(rs[i],'c'),arr=[];
        for(let j=0;j<cs.length;j++){
          const col=ccColNum(String(cs[j].getAttribute('r')||'').replace(/\d+/g,''))||(j+1),tp=cs[j].getAttribute('t');let v='';
          if(tp==='inlineStr'){const ts=ccXmlAll(cs[j],'t');for(let k=0;k<ts.length;k++)v+=ts[k].textContent;}
          else{const ve=ccXmlAll(cs[j],'v')[0];v=ve?ve.textContent:'';if(tp==='s')v=ss[Number(v)]||'';else if(tp==='b')v=v==='1'?'TRUE':'FALSE';}
          arr[col-1]=v;
        }
        grid[rn-1]=arr;
      }
      for(let i=0;i<grid.length;i++)grid[i]=Array.from(grid[i]||[],function(v){return v==null?'':String(v);});
      return grid;
    });
  });
}
/* A grid into template rows: the header row is found by its labels (a template may carry a title and notes above it). */
function ccBulkGrid(kind,grid,meta){
  const def=CC_BULK[kind],norm=function(s){return String(s||'').trim().toLowerCase();};
  let h=-1;
  for(let i=0;i<Math.min(grid.length,15);i++){const r=(grid[i]||[]).map(norm);if(r.indexOf(norm(def.cols[0][1]))>=0&&r.indexOf(norm(def.cols[1][1]))>=0){h=i;break;}}
  if(h<0)throw new Error('The header row was not found: the file needs the template\'s columns ('+def.cols.filter(function(c){return c[2];}).map(function(c){return c[1];}).join(', ')+').');
  const head=grid[h].map(norm),idx={};
  def.cols.forEach(function(c){const i=head.indexOf(norm(c[1]));if(i>=0)idx[c[0]]=i;});
  const missing=def.cols.filter(function(c){return c[2]&&idx[c[0]]==null;}).map(function(c){return c[1];});
  if(missing.length)throw new Error('Missing required column'+(missing.length>1?'s':'')+': '+missing.join(', ')+'. Download the template and keep its columns.');
  const known=def.cols.map(function(c){return norm(c[1]);}),unknown=grid[h].filter(function(x){return String(x||'').trim()&&known.indexOf(norm(x))<0;});
  const rows=[];
  for(let i=h+1;i<grid.length;i++){
    const r=grid[i]||[];if(!r.some(function(v){return String(v||'').trim();}))continue;
    const data={};def.cols.forEach(function(c){data[c[0]]=idx[c[0]]!=null?String(r[idx[c[0]]]==null?'':r[idx[c[0]]]).trim():'';});
    rows.push({n:i+1,data:data});
  }
  if(rows.length>CC_BULK_MAX_ROWS)throw new Error('The file has '+rows.length+' rows; upload at most '+CC_BULK_MAX_ROWS+' per file.');
  return {kind:kind,fileName:meta.fileName,format:meta.format,rows:rows,unknown:unknown,
    hash:ccHashText(kind+'|'+JSON.stringify(rows.map(function(x){return def.cols.map(function(c){return norm(x.data[c[0]]);});})))};
}
/* name: the file name; buf: its ArrayBuffer. A promise of the parsed file (or a rejection with the reason). */
function ccBulkRead(kind,name,buf){
  if(!CC_BULK[kind])return Promise.reject(new Error('Unknown bulk type.'));
  const ext=String(name||'').split('.').pop().toLowerCase(),u8=new Uint8Array(buf);
  const g=ext==='csv'?Promise.resolve(ccCsvGrid(new TextDecoder().decode(u8))):ext==='xlsx'?ccXlsxGrid(u8):Promise.reject(new Error('Upload a .csv or .xlsx file (the template\'s formats).'));
  return g.then(function(grid){return ccBulkGrid(kind,grid,{fileName:name,format:ext.toUpperCase()});});
}

/* ── Templates (FR-CC-14.01). The load template lists the cards that can be loaded now, amounts blank. ── */
function ccBulkTemplateRows(kind){
  if(kind!=='bulk card load')return [];
  const out=[];
  ccCards.filter(function(c){return c.entity===ccEnt()&&ccCardUsable(c);}).forEach(function(c){
    const p=ccProg(c.programmeId),e=idEmp(c.employeeEid)||{},f=ccProgFunding(p),s=f.sourceId?fbSource(f.sourceId):null;
    ccWalletMap(p).filter(function(w){return !w.benefit;}).forEach(function(w){out.push([e.empId||'',expKey(c),p.code,w.code,'',p.currency,s?s.code:'','','']);});
  });
  return out;
}
function ccBulkTemplateNotes(kind){
  return kind==='bulk card load'
    ?['One row per load. Card Reference is the ADT card record (CRD-…), never a card number. Wallet: a non-benefit wallet code of the programme (e.g. CORP).',
      'Leave Amount blank on a row you do not load. Load Reference must be unique per load; it stops the same load being created twice. Funding Source: a funding source code (blank = the programme default).',
      'Benefit wallets are loaded from approved Wallet & Benefits allocations (Card Loads → Benefit Loads), not from this file.']
    :['One row per card request. Requested Action: New Card. Card Type: Virtual or Physical. Card Programme: the programme code.',
      'Business Reason: a request reason, or free text (recorded as the business purpose). Delivery (Physical cards): Office (work location), Card enrollment (KYC) address, or Other address with the Delivery Address.',
      'Each approved row becomes its own card request and goes through the card request route, including the employee\'s reporting manager.'];
}
/* format: 'csv' or 'xlsx'. Downloads the file; returns its name. */
function ccBulkTemplate(kind,format){
  const def=CC_BULK[kind];if(!def)return '';
  const head=def.cols.map(function(c){return c[1];}),rows=ccBulkTemplateRows(kind);
  if(format==='csv'){wbCSV(def.file+'-template',head,rows);return def.file+'-template.csv';}
  const progs=ccProgs().filter(function(p){return ccProgActive(p);});
  const ref={name:'Reference',title:'Allowed values',meta:['Programmes and values valid in '+idEntityName(ccEnt())+' when the template was downloaded.'],
    columns:[{label:'Programme Code',w:16},{label:'Programme',w:30},{label:'Card Types',w:18},{label:'Wallets',w:30},{label:'Currency',w:10}],
    rows:progs.map(function(p){return [p.code,p.name,p.forms.join(', '),ccWalletMap(p).map(function(w){return w.code+' ('+w.name+(w.benefit?', benefit':'')+')';}).join(', '),p.currency];})};
  const sheet={name:def.label,title:def.label+' template · '+idEntityName(ccEnt()),meta:ccBulkTemplateNotes(kind),
    columns:def.cols.map(function(c){return {label:c[1],w:c[0]==='address'||c[0]==='reason'||c[0]==='comments'?30:16};}),rows:rows};
  const name=def.file+'-template-'+wbToday()+'.xlsx';
  tsxSave(tsxWorkbook([sheet,ref]),name);
  return name;
}

/* ── Row validation: the same checks as a single request or load ─────── */
function ccPickCI(list,v){v=String(v||'').trim().toLowerCase();return list.find(function(x){return x.toLowerCase()===v;})||'';}
function ccEntMatches(text,ent){const t=String(text||'').trim().toLowerCase(),r=idEntityRec(ent);return !!t&&(t===String(ent).toLowerCase()||(r&&String(r.name||'').toLowerCase()===t));}
function ccProgByRef(ref,ent){const t=String(ref||'').trim().toLowerCase();return t?ccProgs(ent).find(function(p){return p.code.toLowerCase()===t||p.key.toLowerCase()===t||p.name.toLowerCase()===t;})||null:null;}
function ccCardByRef(ref,ent){const t=String(ref||'').trim().toUpperCase().replace(/^CRD-?/,'');return t?ccCards.find(function(c){return c.entity===ent&&String(c.key)===t;})||null:null;}
function ccWalletByRef(p,ref){const t=String(ref||'').trim().toLowerCase();return t?ccWalletMap(p).find(function(w){return w.code.toLowerCase()===t||w.name.toLowerCase()===t;})||null:null;}
function ccSourceByRef(ref,ent){const t=String(ref||'').trim().toLowerCase();return t?fbSources.find(function(s){return s.entity===ent&&(String(s.code).toLowerCase()===t||s.key.toLowerCase()===t||s.name.toLowerCase()===t);})||null:null;}
function ccBulkEnrRow(b,row){
  const d=row.data,errs=[],out={errors:errs,warnings:[]};
  const empId=String(d.empId||'').trim(),lc=empId.toLowerCase();
  const e=empId?idEmpAll().find(function(x){return x.entityId===b.entity&&String(x.empId||'').toLowerCase()===lc;}):null;
  if(!empId)errs.push('Employee ID is required.');
  else if(!e)errs.push(idEmpAll().some(function(x){return String(x.empId||'').toLowerCase()===lc;})?'Employee '+empId+' belongs to another entity.':'No employee '+empId+' in Employee Management.');
  if(!String(d.entity||'').trim())errs.push('Entity is required.');
  else if(!ccEntMatches(d.entity,b.entity))errs.push('Entity "'+d.entity+'" is not '+idEntityName(b.entity)+', where this file is uploaded.');
  const p=ccProgByRef(d.programme,b.entity);
  if(!String(d.programme||'').trim())errs.push('Card Programme is required.');else if(!p)errs.push('No card programme "'+d.programme+'" in this entity.');
  const type=ccPickCI(CC_FORMS,d.cardType);if(!type)errs.push('Card Type must be Virtual or Physical.');
  if(['new card','new','request card'].indexOf(String(d.action||'').trim().toLowerCase())<0)errs.push('Requested Action must be "New Card" (a replacement is requested from its card).');
  const rtxt=String(d.reason||'').trim(),rl=ccPickCI(CC_REQ_REASONS,rtxt);
  const reason=rtxt?(rl||'Other'):b.defaultReason,purpose=rtxt&&!rl?rtxt:'';
  const dm=type==='Physical'?ccPickCI(CC_DELIVERY,d.delivery):'';
  if(type==='Physical'&&!dm)errs.push('Delivery is required for a physical card: '+CC_DELIVERY.join(', ')+'.');
  if(e&&p&&type&&!errs.length){
    const f=ccReqFields({cardType:type,reason:reason,purpose:purpose,deliveryMode:dm,deliveryText:d.address,comments:d.comments},p);
    const ve=ccReqValidate(f,p);if(ve)errs.push(ve);
    if(!p.adminRequest)errs.push(p.name+' does not take requests on an employee\'s behalf.');
    const el=ccEligibility(e.eid,p.id,'submit');if(!el.ok)el.reasons.forEach(function(x){errs.push(x);});
    const dup=ccOpenReqsOf(e.eid,p.id,type);if(dup.length)errs.push(e.name+' already has '+expKey(dup[0])+' ('+ccReqTrack(dup[0])+') for this programme and card type.');
    out.parsed={employeeEid:e.eid,programmeId:p.id,cardType:type,reason:reason,purpose:purpose,deliveryMode:dm,deliveryText:String(d.address||'').trim(),comments:String(d.comments||'').trim()};
    out.dupKey=e.eid+'|'+p.id+'|'+type;out.capKey=e.eid+'|'+p.id;out.cap=Math.max(0,p.maxCards-ccLiveCardsOf(e.eid,p.id).length);
  }
  return out;
}
function ccBulkLoadRow(b,row){
  const d=row.data,errs=[],out={errors:errs,warnings:[]};
  if(!String(d.amount||'').trim())return {skip:'No amount: not loaded.'};
  const c=ccCardByRef(d.card,b.entity);
  if(!String(d.card||'').trim())errs.push('Card Reference is required.');else if(!c)errs.push('No card '+d.card+' in this entity.');
  let p=null,w=null,src=null;
  if(c){
    p=ccProg(c.programmeId);const e=idEmp(c.employeeEid)||{};
    if(!String(d.empId||'').trim())errs.push('Employee ID is required.');
    else if(String(e.empId||'').toLowerCase()!==String(d.empId).trim().toLowerCase())errs.push(expKey(c)+' is held by '+(e.name||'another employee')+' ('+(e.empId||'')+'), not '+d.empId+'. A card stays with its cardholder.');
    if(!String(d.programme||'').trim())errs.push('Card Programme is required.');
    else if(ccProgByRef(d.programme,b.entity)!==p)errs.push(expKey(c)+' belongs to '+(p?p.code:'another programme')+', not '+d.programme+'.');
    w=p?ccWalletByRef(p,d.wallet):null;
    if(!String(d.wallet||'').trim())errs.push('Wallet is required.');
    else if(!w)errs.push(d.wallet+' is not a wallet of '+(p?p.code:'the programme')+'.');
    else if(w.benefit)errs.push(w.name+' is a benefit wallet: it loads from approved Wallet & Benefits allocations (Card Loads → Benefit Loads), not from a bulk file.');
  }
  const cur=String(d.currency||'').trim().toUpperCase();
  if(!cur)errs.push('Currency is required.');else if(EXP_CURRENCIES.indexOf(cur)<0)errs.push('Unknown currency '+cur+'.');
  if(String(d.source||'').trim()){src=ccSourceByRef(d.source,b.entity);if(!src)errs.push('No funding source "'+d.source+'" in this entity.');}
  else if(p&&ccProgFunding(p).sourceId)src=fbSource(ccProgFunding(p).sourceId);
  const ref=String(d.ref||'').trim();if(!ref)errs.push('Load Reference is required; it keeps the same load from being created twice.');
  if(c&&w&&!w.benefit&&cur&&!errs.length){
    const chk=ccLoadCheck({cardId:c.id,wallet:w.code,amount:d.amount,currency:cur,sourceId:src?src.id:''},{purpose:'submit',origin:'Bulk'});
    chk.errors.forEach(function(x){errs.push(x);});out.warnings=chk.warnings;
    if(!chk.errors.length){
      out.parsed={cardId:c.id,wallet:w.code,amount:chk.amount,currency:cur,sourceId:src?src.id:'',ref:ref,reason:String(d.reason||'').trim(),cardAmount:chk.cardAmount,srcAmount:chk.srcAmount,
        monthUsed:chk.monthUsed,monthLimit:chk.monthLimit,room:chk.room};
      out.dupKey=[c.id,w.code,chk.amount,cur,ref.toLowerCase()].join('|');
      const ex=ccLoads.find(function(l){return l.idem===out.dupKey&&ccLoadHolds(l);});
      if(ex)errs.push('Duplicate of '+expKey(ex)+' ('+ccLoadLabel(ex)+'): same card, wallet, amount and load reference.');
    }
  }
  return out;
}
/* Validate every row not yet processed: its own checks, then the checks across rows (duplicates in the
   file, the card's monthly limit, a Blocking source's room, one currency per load file). */
function ccBulkValidate(b){
  const seen={},capUsed={},month={},room={};let fileCur='';
  b.rows.forEach(function(row){
    if(row.result&&row.result.refId)return;
    row.errors=[];row.warnings=[];row.parsed=null;row.skip='';
    if(row.excluded){row.status='Excluded';return;}
    const v=b.kind==='bulk card enrollment'?ccBulkEnrRow(b,row):ccBulkLoadRow(b,row);
    if(v.skip){row.status='Skipped';row.skip=v.skip;return;}
    row.errors=v.errors.slice();row.warnings=(v.warnings||[]).slice();row.parsed=v.parsed||null;
    if(!row.errors.length&&v.dupKey){if(seen[v.dupKey]!=null)row.errors.push('Duplicate of row '+seen[v.dupKey]+' in this file.');else seen[v.dupKey]=row.n;}
    if(!row.errors.length&&v.capKey){capUsed[v.capKey]=(capUsed[v.capKey]||0)+1;if(capUsed[v.capKey]>v.cap)row.errors.push('With the rows above, '+idEmpName(v.parsed.employeeEid)+' would exceed '+(ccProg(v.parsed.programmeId)||{}).name+'\'s maximum of '+(ccProg(v.parsed.programmeId)||{}).maxCards+' active card(s).');}
    if(!row.errors.length&&b.kind==='bulk card load'){
      const P=v.parsed,c=ccCard(P.cardId),p=ccProg(c.programmeId);
      if(!fileCur)fileCur=P.currency;else if(P.currency!==fileCur)row.errors.push('This file loads in '+fileCur+' (its first valid row); load '+P.currency+' in a separate file.');
      if(!row.errors.length&&P.monthLimit!==undefined&&P.monthLimit!==''){
        const k=c.id;month[k]=(month[k]==null?P.monthUsed||0:month[k])+P.cardAmount;
        if(month[k]>P.monthLimit+0.001)row.errors.push('With the rows above, '+expKey(c)+' would pass its monthly load limit of '+ccAmt(P.monthLimit,p.currency)+'.');
      }
      const s=P.sourceId?fbSource(P.sourceId):null;
      if(!row.errors.length&&s&&P.room!=null){
        room[s.id]=(room[s.id]==null?0:room[s.id])+P.srcAmount;
        if(room[s.id]>P.room+0.001){const msg='With the rows above, this file needs '+expMoney(room[s.id],s.currency)+' from '+s.key+', which has '+expMoney(P.room,s.currency)+' of recorded funding (internal).';
          if(s.enforcement==='Blocking')row.errors.push(msg+' The source is Blocking.');else if(s.enforcement==='Warning'&&row.warnings.indexOf(msg)<0)row.warnings.push(msg);}
      }
    }
    row.status=row.errors.length?'Invalid':'Valid';
  });
  if(b.kind==='bulk card load')b.currency=fileCur||b.currency||'';
}
function ccBulkSummary(b){
  const cnt=function(f){return b.rows.filter(f).length;},res=function(s){return cnt(function(r){return r.result&&r.result.status===s;});};
  const line=function(r){return (b.lines||[]).find(function(l){return l.row===r.n;});};
  const o={rows:b.rows.length,valid:cnt(function(r){return r.status==='Valid';}),invalid:cnt(function(r){return r.status==='Invalid';}),excluded:cnt(function(r){return r.status==='Excluded';}),
    skipped:cnt(function(r){return r.status==='Skipped';}),submitted:cnt(function(r){return !!line(r)||!!(r.result&&r.result.routed);}),
    pending:cnt(function(r){const l=line(r);return !r.result&&!!l&&l.status==='Pending';}),rejected:res('Rejected'),created:res('Created'),failed:res('Failed'),routed:cnt(function(r){return !!(r.result&&r.result.routed&&r.result.refId);})};
  o.approved=cnt(function(r){const l=line(r);return !!l&&l.status==='Approved';});
  if(b.kind==='bulk card load'){
    const loads=ccLoads.filter(function(l){return l.origin&&l.origin.fileId===b.id;});
    o.requested=ccM(b.rows.filter(function(r){return r.parsed&&['Valid'].indexOf(r.status)>=0||r.result&&r.result.refId;}).reduce(function(s,r){return s+(r.parsed?r.parsed.amount:0);},0));
    o.recorded=ccM(loads.filter(function(l){return l.exec&&!l.exec.demo;}).reduce(function(s,l){return s+l.exec.recorded-l.exec.reversed;},0));
    o.demo=ccM(loads.filter(function(l){return l.exec&&l.exec.demo;}).reduce(function(s,l){return s+l.exec.recorded-l.exec.reversed;},0));
    o.loads=loads;
  }
  return o;
}
/* Where a row stands: its validation, its approval line, then the record it became. */
function ccBulkRowState(b,row){
  if(row.result){
    if(row.result.refId){
      const rec=b.kind==='bulk card enrollment'?ccReq(row.result.refId):ccLoad(row.result.refId);
      return {status:row.result.routed?'Routed individually':'Created',ref:rec,detail:rec?(b.kind==='bulk card enrollment'?ccReqTrack(rec):ccLoadLabel(rec)):''};
    }
    return {status:row.result.status,detail:row.result.reason||''};
  }
  const ln=(b.lines||[]).find(function(l){return l.row===row.n;});
  if(ln)return {status:ln.status==='Pending'?'Awaiting Approval':ln.status,detail:''};
  return {status:row.status,detail:row.status==='Skipped'?row.skip:row.status==='Excluded'&&row.excluded?row.excluded.reason:''};
}

/* ── Upload, correct, submit ─────────────────────────────────────────── */
/* parsed: from ccBulkRead. d: defaultReason (enrollment: for rows that give none), comments. */
function ccBulkCreate(kind,parsed,d,A){
  A=A||ccNow();d=d||{};
  const def=CC_BULK[kind];if(!def)return {error:'Unknown bulk type.'};
  if(!ccPCan(A,def.perm))return {error:caN(A.who)+' cannot upload bulk '+def.noun+' files ('+def.perm+').'};
  if(!parsed||!parsed.rows||parsed.kind!==kind)return {error:'Upload a '+def.label.toLowerCase()+' file first.'};
  if(!parsed.rows.length)return {error:'The file has no data rows.'};
  const dup=ccBulks.find(function(b){return b.kind===kind&&b.entity===ccEnt()&&b.hash===parsed.hash&&['Withdrawn','Rejected','Discarded'].indexOf(b.status)<0;});
  if(dup)return {error:'The same rows were already uploaded as '+expKey(dup)+' ('+dup.status+'). A file is processed once; open '+expKey(dup)+' instead.'};
  if(kind==='bulk card enrollment'&&CC_REQ_REASONS.indexOf(d.defaultReason)<0)return {error:'Pick the request reason for rows that give none.'};
  const b={id:ccBulkNextId++,key:ccBulkNextKey++,prefix:def.prefix,kind:kind,entity:ccEnt(),fileName:String(parsed.fileName||'upload').slice(0,120),format:parsed.format,hash:parsed.hash,
    defaultReason:d.defaultReason||'',comments:String(d.comments||'').trim(),unknownCols:(parsed.unknown||[]).slice(),uploads:[{file:parsed.fileName,format:parsed.format,rows:parsed.rows.length,at:ccStamp(A),by:A.who}],
    rows:parsed.rows.map(function(r){return {n:r.n,data:Object.assign({},r.data),errors:[],warnings:[],status:'',excluded:null,result:null,edits:[]};}),
    status:'Draft',createdBy:A.who,actualBy:caVia(A),createdAt:ccStamp(A),claimFor:'Others',mode:'On Behalf',employeeEid:'',name:def.label,empId:'',
    migrated:true,idMigrated:true,category:def.label,title:def.label+' · '+String(parsed.fileName||'upload').slice(0,60),currency:kind==='bulk card load'?'':'card',lines:[],logs:[]};
  ccBulkValidate(b);
  ccBulks.unshift(b);
  const s=ccBulkSummary(b);
  ccLog(b,'Draft','Uploaded by '+caN(A.who)+': '+b.fileName+' ('+b.format+', '+s.rows+' rows: '+s.valid+' valid, '+s.invalid+' invalid'+(s.skipped?', '+s.skipped+' skipped':'')+').'
    +(b.unknownCols.length?' Columns not in the template were ignored: '+b.unknownCols.join(', ')+'.':''),A);
  return {rec:b};
}
function ccBulkMay(A,b){const def=CC_BULK[b.kind];return ccPCan(A,def.perm)?'':caN(A.who)+' cannot change bulk '+def.noun+' files ('+def.perm+').';}
/* Correct a row (FR-CC-14.08): in a draft, or in a file sent back for Follow-Up. Before and after are kept. */
function ccBulkRowEdit(id,n,data,A){
  A=A||ccNow();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return 'No such bulk file.';
  const may=ccBulkMay(A,b);if(may)return may;
  if(['Draft','Follow-Up'].indexOf(b.status)<0)return expKey(b)+' is '+b.status+'; rows are corrected only in a draft or a file sent back.';
  const row=b.rows.find(function(r){return r.n===Number(n);});if(!row)return 'No such row.';
  if(row.result&&row.result.refId)return 'Row '+row.n+' is already processed.';
  if(b.status==='Follow-Up'&&!(b.lines||[]).some(function(l){return l.row===row.n;}))return 'Only a submitted row is corrected while the file is sent back.';
  const keys=CC_BULK[b.kind].cols.map(function(c){return c[0];}),before={};
  const ch=keys.filter(function(k){return data&&k in data&&String(data[k]==null?'':data[k]).trim()!==row.data[k];});
  if(!ch.length)return 'Nothing changed.';
  ch.forEach(function(k){before[k]=row.data[k];row.data[k]=String(data[k]==null?'':data[k]).trim();});
  row.edits.push({at:ccStamp(A),by:A.who,actual:caVia(A),before:before,after:ch.reduce(function(o,k){o[k]=row.data[k];return o;},{})});
  ccBulkValidate(b);
  const ln=(b.lines||[]).find(function(l){return l.row===row.n;});
  if(ln&&row.parsed&&b.kind==='bulk card load'){ln.amount=row.parsed.amount;}
  ccLog(b,b.status,'Row '+row.n+' corrected by '+caN(A.who)+': '+ch.map(function(k){return CC_BULK[b.kind].cols.find(function(c){return c[0]===k;})[1]+' "'+before[k]+'" → "'+row.data[k]+'"';}).join('; ')+'. Now '+row.status+'.',A);
  return '';
}
function ccBulkRowExclude(id,n,on,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return 'No such bulk file.';
  const may=ccBulkMay(A,b);if(may)return may;
  if(b.status!=='Draft')return 'Rows are excluded only before the file is submitted; an approver rejects rows in review.';
  const row=b.rows.find(function(r){return r.n===Number(n);});if(!row)return 'No such row.';
  if(on&&!reason)return 'Say why the row is excluded.';
  if(!!row.excluded===!!on)return 'Nothing changed.';
  row.excluded=on?{reason:reason,by:A.who,at:ccStamp(A)}:null;
  ccBulkValidate(b);
  ccLog(b,'Draft','Row '+row.n+' '+(on?'excluded by '+caN(A.who)+': '+reason:'included again by '+caN(A.who)+' (now '+row.status+')')+'.',A);
  return '';
}
/* Upload a corrected file into the same draft. */
function ccBulkReplace(id,parsed,A){
  A=A||ccNow();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return 'No such bulk file.';
  const may=ccBulkMay(A,b);if(may)return may;
  if(b.status!=='Draft')return 'Only a draft takes a corrected file.';
  if(!parsed||parsed.kind!==b.kind||!parsed.rows.length)return 'Upload a '+CC_BULK[b.kind].label.toLowerCase()+' file with data rows.';
  const dup=ccBulks.find(function(x){return x.id!==b.id&&x.kind===b.kind&&x.entity===b.entity&&x.hash===parsed.hash&&['Withdrawn','Rejected','Discarded'].indexOf(x.status)<0;});
  if(dup)return 'The same rows were already uploaded as '+expKey(dup)+'.';
  b.rows=parsed.rows.map(function(r){return {n:r.n,data:Object.assign({},r.data),errors:[],warnings:[],status:'',excluded:null,result:null,edits:[]};});
  b.hash=parsed.hash;b.fileName=String(parsed.fileName||b.fileName).slice(0,120);b.format=parsed.format;b.unknownCols=(parsed.unknown||[]).slice();
  b.uploads.push({file:parsed.fileName,format:parsed.format,rows:parsed.rows.length,at:ccStamp(A),by:A.who});
  ccBulkValidate(b);const s=ccBulkSummary(b);
  ccLog(b,'Draft','Corrected file uploaded by '+caN(A.who)+': '+b.fileName+' ('+s.rows+' rows: '+s.valid+' valid, '+s.invalid+' invalid). The earlier upload is kept in the upload history.',A);
  return '';
}
function ccBulkDiscard(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return 'No such bulk file.';
  const may=ccBulkMay(A,b);if(may&&b.createdBy!==A.who)return may;
  if(b.status!=='Draft')return 'Only a draft is discarded; a submitted file is withdrawn from its Approval tab.';
  if(!reason)return 'Say why the file is discarded.';
  b.status='Discarded';ccLog(b,'Discarded','Discarded by '+caN(A.who)+': '+reason+'. Nothing was created.',A);
  return '';
}
/* Does the file-level approval cover this load row? Only when the row's own Card Load route has the same
   stages (in order) as the Bulk Card Load route, and none of them is employee-specific (decision C2). */
function ccStageSig(w){return caActiveDefs(w).map(function(s){return [s.type,s.ref||'',s.rule||'Any One'].join(':');});}
function ccBulkRowCovered(row){
  const c=ccCard(row.parsed.cardId);
  const ri=ccRoute({kind:'card load',programmeId:c?c.programmeId:null}),rb=ccRoute({kind:'bulk card load'});
  if(ri.error||rb.error)return false;
  if(caActiveDefs(ri.wf).some(function(s){return s.type==='Reporting Manager';}))return false;
  const si=ccStageSig(ri.wf),sb=ccStageSig(rb.wf);
  return si.length===sb.length&&si.every(function(x,i){return x===sb[i];});
}
function ccBulkSubmit(id,A){
  A=A||ccNow();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return 'No such bulk file.';
  const may=ccBulkMay(A,b);if(may)return may;
  if(b.status!=='Draft')return expKey(b)+' is '+b.status+'.';
  ccBulkValidate(b);
  const valid=b.rows.filter(function(r){return r.status==='Valid';});
  if(!valid.length)return 'No valid row to submit. Correct or exclude the invalid rows first.';
  const inv=b.rows.filter(function(r){return r.status==='Invalid';}).length;
  const mkLine=function(r,title,amt){return {id:r.n,row:r.n,title:title,amount:amt,subCat:b.kind==='bulk card enrollment'?'Card':'Card Load',start:A.iso,end:A.iso,status:'Pending',approved:null};};
  b.submittedAt=ccStamp(A);b.submittedBy=A.who;
  if(b.kind==='bulk card enrollment'){
    b.lines=valid.map(function(r){const p=ccProg(r.parsed.programmeId);return mkLine(r,'Row '+r.n+' · '+idEmpName(r.parsed.employeeEid)+' · '+(p?p.code:'')+' · '+r.parsed.cardType,1);});
    b.currency='card';
    const pre=ccEnginePreflight(b);if(pre.error){b.lines=[];return pre.error;}
    if(!caStart(b,pre,A)){b.lines=[];return expKey(b)+' already has an approval in progress.';}
    ccLog(b,b.status,'Submitted for checking: '+valid.length+' valid row'+(valid.length===1?'':'s')+(inv?'; '+inv+' invalid row'+(inv===1?' stays':'s stay')+' blocked':'')+'. Each approved row becomes its own card request on the card request route.',A);
    return '';
  }
  const cov=valid.filter(ccBulkRowCovered),ind=valid.filter(function(r){return cov.indexOf(r)<0;});
  if(cov.length){
    b.lines=cov.map(function(r){const c=ccCard(r.parsed.cardId);return mkLine(r,'Row '+r.n+' · '+ccHolderName(c)+' · '+wbTypeName(r.parsed.wallet)+' · '+ccMask(c.last4),r.parsed.amount);});
    const pre=ccEnginePreflight(b);if(pre.error){b.lines=[];return pre.error;}
    ind.forEach(function(r){ccBulkRouteRow(b,r,A);});
    if(!caStart(b,pre,A)){b.lines=[];return expKey(b)+' already has an approval in progress.';}
  }else{
    ind.forEach(function(r){ccBulkRouteRow(b,r,A);});
    b.status='Processed';
  }
  ccLog(b,b.status,'Submitted: '+cov.length+' row'+(cov.length===1?'':'s')+' for one file-level approval'+(ind.length?'; '+ind.length+' row'+(ind.length===1?'':'s')+' sent through '+(ind.length===1?'its':'their')+' own Card Load route (a different or employee-specific route)':'')
    +(inv?'; '+inv+' invalid row'+(inv===1?' stays':'s stay')+' blocked':'')+'. Nothing is loaded by approval.',A);
  return '';
}
/* A row whose route differs: its own card load, submitted on its own route. */
function ccBulkRouteRow(b,row,A){
  const P=row.parsed,chk=ccLoadCheck({cardId:P.cardId,wallet:P.wallet,amount:P.amount,currency:P.currency,sourceId:P.sourceId},{purpose:'submit',origin:'Bulk',iso:A.iso});
  if(chk.errors.length){row.result={status:'Failed',reason:chk.errors.join(' '),routed:true,attempts:((row.result&&row.result.attempts)||0)+1};return;}
  const l=ccLoadNew({reason:P.reason||'Bulk load '+P.ref+' ('+expKey(b)+' row '+row.n+')',ref:P.ref,idem:[P.cardId,P.wallet,P.amount,P.currency,P.ref.toLowerCase()].join('|')},chk,{type:'Bulk',fileId:b.id,fileKey:expKey(b),row:row.n},A);
  ccLog(l,'Draft','Created from bulk file '+expKey(b)+' row '+row.n+' (reference '+P.ref+') by '+caN(A.who)+'. Its route differs from the file\'s, so it goes through its own Card Load approval.',A);
  ccLoads.unshift(l);
  const se=ccLoadSubmit(l.id,A);
  if(se){ccLoads.shift();row.result={status:'Failed',reason:se,routed:true,attempts:((row.result&&row.result.attempts)||0)+1};return;}
  row.result={status:'Created',routed:true,refId:l.id,refKey:expKey(l)};
}
/* Approval of the file: rejected rows end; approved rows become records (decision C2). */
function ccBulkOnFinal(b,A){
  (b.lines||[]).forEach(function(ln){const row=b.rows.find(function(r){return r.n===ln.row;});if(row&&ln.status==='Rejected'&&!row.result)row.result={status:'Rejected',reason:ln.reason||'Rejected in review'};});
  if(['Approved','Partially Approved'].indexOf(b.status)<0){ccLog(b,b.status,'No row is processed.',A);return;}
  const st=b.wf&&b.wf.stages?b.wf.stages.filter(function(s){return s.status==='Approved';}):[];
  b.checkedBy=ccUniq([].concat.apply([],st.map(function(s){return s.decisions.filter(function(x){return !x.void&&x.decision!=='Rejected';}).map(function(x){return x.who;});})));
  ccBulkProcess(b,A);
}
/* Process approved rows not yet processed (or failed). Idempotent: a row that produced a record never runs again. */
function ccBulkProcess(b,A){
  const Au=Object.assign(caAt(b.createdBy,A.iso,A.time),{actual:b.actualBy||''});
  let made=0,failed=0;
  b.rows.forEach(function(row){
    if(row.result&&(row.result.refId||row.result.status==='Rejected'))return;
    if(row.result&&row.result.routed){ccBulkRouteRow(b,row,Au);if(row.result.refId)made++;else failed++;return;}
    const ln=(b.lines||[]).find(function(l){return l.row===row.n;});if(!ln||ln.status!=='Approved')return;
    const attempts=((row.result&&row.result.attempts)||0)+1;
    const v=b.kind==='bulk card enrollment'?ccBulkEnrRow(b,row):ccBulkLoadRow(b,row);
    if(v.skip||v.errors.length){row.result={status:'Failed',reason:v.skip||v.errors.join(' '),attempts:attempts};failed++;return;}
    const P=v.parsed;
    if(b.kind==='bulk card enrollment'){
      const res=ccReqCreate(Object.assign({},P),true,Au);
      if(res.error){row.result={status:'Failed',reason:res.error,attempts:attempts};failed++;return;}
      res.rec.bulk={id:b.id,key:expKey(b),row:row.n};
      ccLog(res.rec,res.rec.status,'Created from bulk file '+expKey(b)+' row '+row.n+' (checked by '+(caNs(b.checkedBy)||'the file checker')+'). It follows the card request route: the employee\'s reporting manager, then a card approver.',Au);
      row.result={status:'Created',refId:res.rec.id,refKey:expKey(res.rec),attempts:attempts};made++;return;
    }
    const chk=ccLoadCheck({cardId:P.cardId,wallet:P.wallet,amount:P.amount,currency:P.currency,sourceId:P.sourceId},{purpose:'approve',origin:'Bulk',iso:A.iso});
    if(chk.errors.length){row.result={status:'Failed',reason:chk.errors.join(' '),attempts:attempts};failed++;return;}
    const l=ccLoadNew({reason:P.reason||'Bulk load '+P.ref+' ('+expKey(b)+' row '+row.n+')',ref:P.ref,idem:v.dupKey},chk,{type:'Bulk',fileId:b.id,fileKey:expKey(b),row:row.n},Au);
    ccLog(l,'Draft','Created from bulk file '+expKey(b)+' row '+row.n+' (reference '+P.ref+').',Au);
    ccLoads.unshift(l);
    ccLoadAuthorize(l,{type:'Bulk file',key:expKey(b),by:caNs(b.checkedBy),at:ccStamp(A),text:'bulk file '+expKey(b)+' row '+row.n+', approved by '+(caNs(b.checkedBy)||'the card approver'),
      why:'the file-level approval covers this row on the same Card Load route.'},A);
    row.result={status:'Created',refId:l.id,refKey:expKey(l),attempts:attempts};made++;
  });
  const s=ccBulkSummary(b);
  ccLog(b,b.status,'Processed: '+made+' record'+(made===1?'':'s')+' created'+(failed?', '+failed+' row'+(failed===1?'':'s')+' failed (reasons on each row; they can be retried)':'')+'. Totals: '+s.created+' created, '+s.rejected+' rejected, '+s.failed+' failed, '+s.invalid+' invalid, '+s.skipped+' skipped.',A);
  ccNotify([b.createdBy],expKey(b)+' processed: '+s.created+' created, '+s.failed+' failed, '+s.rejected+' rejected.',b);
  return {made:made,failed:failed};
}
/* Safe retry of failed rows (FR-CC-14.13-14): the same checks again; nothing is created twice. */
function ccBulkRetry(id,A){
  A=A||ccNow();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return {error:'No such bulk file.'};
  const may=ccBulkMay(A,b);if(may)return {error:may};
  if(['Approved','Partially Approved','Processed'].indexOf(b.status)<0)return {error:expKey(b)+' is '+b.status+'; rows are retried after approval.'};
  const n=b.rows.filter(function(r){return r.result&&r.result.status==='Failed';}).length;
  if(!n)return {error:'No failed row to retry.'};
  ccLog(b,b.status,'Retry of '+n+' failed row'+(n===1?'':'s')+' by '+caN(A.who)+'.',A);
  return ccBulkProcess(b,A);
}
/* Execute every authorized load of a file in one action - the same single-load service per row. */
function ccBulkExecRecord(id,d,A){
  A=A||ccNow();d=d||{};
  const b=ccBulk(id);if(!b||b.entity!==ccEnt()||b.kind!=='bulk card load')return {error:'No such bulk load file.'};
  const ls=ccLoads.filter(function(l){return l.origin&&l.origin.fileId===b.id&&l.exec&&CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed&&!ccLoadExecAwaiting(l);});
  if(!ls.length)return {error:'No load of '+expKey(b)+' awaits execution.'};
  const done=[],errors=[];
  ls.forEach(function(l){
    const res=ccLoadExecRecord(l.id,{result:'Recorded',source:d.source,ref:d.source===CC_DEMO?'':String(d.ref||'').trim()+'/'+l.origin.row,evidence:d.evidence,date:d.date,note:d.note},A);
    if(res.error)errors.push(expKey(l)+': '+res.error);else done.push(res.rec);
  });
  return {done:done,errors:errors};
}
function ccBulkExecVerify(id,A){
  A=A||ccNow();
  const b=ccBulk(id);if(!b||b.entity!==ccEnt())return {error:'No such bulk file.'};
  const es=ccLoadExecs.filter(function(e){const l=ccLoad(e.loadId);return e.status==='Awaiting Verification'&&l&&l.origin&&l.origin.fileId===b.id;});
  if(!es.length)return {error:'Nothing of '+expKey(b)+' awaits verification.'};
  const done=[],errors=[];
  es.forEach(function(e){const x=ccLoadExecVerify(e.id,A);if(x)errors.push(expKey(e)+': '+x);else done.push(e);});
  return {done:done,errors:errors};
}
/* Rows still in review are checked again at every approving decision (FR-CC-14.11, 24.08). */
function ccBulkDecisionCheck(b,items){
  for(let i=0;i<(items||[]).length;i++){
    const it=items[i];if(it.decision==='Rejected')continue;
    const row=b.rows.find(function(r){return r.n===it.l.row;});if(!row)continue;
    const v=b.kind==='bulk card enrollment'?ccBulkEnrRow(b,row):ccBulkLoadRow(b,row);
    if(v.skip||v.errors.length)return 'Row '+row.n+' can no longer be approved: '+(v.skip||v.errors.join(' '))+' Reject that row.';
  }
  return '';
}
/* Nobody approves a file that carries a card request or a load for themselves. */
function ccBulkBeneficiaries(b){
  return ccUniq((b.lines||[]).map(function(ln){const row=b.rows.find(function(r){return r.n===ln.row;});if(!row||!row.parsed)return '';
    return idUserOfEmp(b.kind==='bulk card enrollment'?row.parsed.employeeEid:(ccCard(row.parsed.cardId)||{}).employeeEid);}).filter(Boolean));
}
['bulk card enrollment','bulk card load'].forEach(function(kind){
  const def=CC_BULK[kind];
  ccRegisterKind(kind,{
    perms:{approve:kind==='bulk card load'?'card.load.approve':'card.request.approve',submit:def.perm,others:def.perm,withdraw:def.perm,withdrawOthers:def.perm,reassign:def.perm},
    policySig:function(r){return [r.kind,r.hash,(r.lines||[]).map(function(l){return l.row+':'+l.amount;}).join(',')].join('|');},
    preflight:function(r,o){ccBulkValidate(r);const bad=(r.lines||[]).filter(function(l){const row=r.rows.find(function(x){return x.n===l.row;});return !row||row.status!=='Valid';});
      if(bad.length)return {error:'Row'+(bad.length>1?'s ':' ')+bad.map(function(l){return l.row;}).join(', ')+' '+(bad.length>1?'are':'is')+' no longer valid; correct '+(bad.length>1?'them':'it')+' first.'};return ccEnginePreflight(r,o);},
    decisionCheck:function(r,items){return ccBulkDecisionCheck(r,items);},
    onFinal:function(r,A){ccBulkOnFinal(r,A);},
    excluded:function(r){return ccExcluded(r).concat(ccBulkBeneficiaries(r));},
    partialMsg:'Rows are approved or rejected one by one; an approver does not reduce an amount.',
    finalNote:kind==='bulk card load'?'Approval authorizes the approved rows only; each becomes its own load, executed and verified separately.':'Approval passes the checked rows on; each becomes its own card request with its own approvals.',
    finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+'.';},
    decisionHint:'Decide the file as a whole, or row by row (Approve or Reject each line). Nothing is issued or loaded by this approval.'});
  if(typeof CA_TYPE_LABEL!=='undefined')CA_TYPE_LABEL[kind]=def.label;
});

/* ══ Benefit loads from approved Wallet & Benefits allocations (FR-CC-15, WF-CC-06) ═══════════════════ */
function ccBenefitBatches(){return typeof wbBatches==='undefined'?[]:wbBatches.filter(function(b){return b.entity===ccEnt()&&b.status==='Approved';});}
/* What a batch can load: each live allocation row with a card that has its wallet - or why not. */
function ccBenefitPlan(batchId,sourceId){
  const b=typeof wbBatches==='undefined'?null:wbBatches.find(function(x){return x.id===Number(batchId);});
  if(!b||b.entity!==ccEnt())return {error:'Pick an allocation batch of this entity.'};
  if(b.status!=='Approved')return {error:b.key+' is '+b.status+'; only an approved batch authorizes benefit loads.'};
  const rows=[];
  b.rows.filter(function(r){return r.status==='Planned';}).forEach(function(row){
    const base={row:row};
    if(!row.walletType){rows.push(Object.assign(base,{status:'Not card-backed',reason:'Claim-based benefit: no wallet.'}));return;}
    const done=ccLoads.find(function(l){return l.allocId===row.id&&ccLoadHolds(l);});
    if(done){rows.push(Object.assign(base,{status:'Loaded',load:done,card:ccCard(done.cardId),reason:expKey(done)+' · '+ccLoadLabel(done)}));return;}
    const cards=ccCards.filter(function(c){const p=ccProg(c.programmeId);return c.entity===b.entity&&c.employeeEid===row.eid&&CC_CARD_FINAL.indexOf(c.status)<0&&p&&p.wallets.indexOf(row.walletType)>=0&&p.fundingMode!=='Corporate';});
    if(!cards.length){rows.push(Object.assign(base,{status:'Skipped',reason:'No card with a '+wbTypeName(row.walletType)+' wallet.'}));return;}
    const card=cards.find(ccCardUsable)||cards[0];
    const chk=ccLoadCheck({cardId:card.id,wallet:row.walletType,amount:row.amount,currency:row.currency||'INR',allocId:row.id,sourceId:sourceId||''},{purpose:'submit',origin:'Benefit'});
    rows.push(Object.assign(base,{card:card,chk:chk,status:chk.errors.length?'Skipped':'Eligible',reason:chk.errors.join(' '),warnings:chk.warnings}));
  });
  return {batch:b,rows:rows};
}
/* d: sourceId, rowIds (optional: allocation row IDs to load; default every eligible row). o.system: automatic generation. */
function ccBenefitGenerate(batchId,d,A,o){
  A=A||ccNow();d=d||{};o=o||{};
  if(!o.system&&!ccPCan(A,'card.load.create'))return {error:caN(A.who)+' cannot create card loads (card.load.create).'};
  const plan=ccBenefitPlan(batchId,d.sourceId);if(plan.error)return {error:plan.error};
  const b=plan.batch,created=[],skipped=[];
  plan.rows.forEach(function(x){
    if(d.rowIds&&d.rowIds.indexOf(x.row.id)<0)return;
    if(x.status!=='Eligible'&&x.status!=='Skipped'||!x.card){if(x.status==='Skipped')skipped.push(x);return;}
    /* Checked one by one, so loads created a moment ago count against the source's room. */
    const chk=ccLoadCheck({cardId:x.card.id,wallet:x.row.walletType,amount:x.row.amount,currency:x.row.currency||'INR',allocId:x.row.id,sourceId:d.sourceId||''},{purpose:'submit',origin:'Benefit',iso:A.iso});
    if(chk.errors.length){skipped.push(Object.assign({},x,{status:'Skipped',reason:chk.errors.join(' ')}));return;}
    const l=ccLoadNew({reason:'Wallet & Benefits allocation '+x.row.key+' ('+x.row.categoryName+', '+wbPeriodLabel(x.row.period)+')'},chk,{type:'Benefit',batchId:b.id,batchKey:b.key,allocKey:x.row.key},A);
    ccLog(l,'Draft','Created from approved allocation '+x.row.key+' of '+b.key+(o.system?' automatically, on the batch\'s approval (programme setting)':' by '+caN(A.who))+'.',A);
    ccLoads.unshift(l);
    if(ccProgFunding(chk.p).benefitAuth==='Card Load route'){
      /* The programme does not treat the batch approval as the load authorization: the Card Load route decides. */
      l.period=A.iso.slice(0,7);const pre=ccEnginePreflight(l);
      if(pre.error||!caStart(l,pre,A)){ccLoads.splice(ccLoads.indexOf(l),1);skipped.push(Object.assign({},x,{status:'Skipped',reason:pre.error||'Approval could not start.'}));return;}
      created.push(l);return;
    }
    ccLoadAuthorize(l,{type:'Benefit allocation',key:b.key,by:b.approvedBy||'',at:b.approvedAt||'',text:ccAllocAuthText({row:x.row,batch:b}),
      why:'the approved batch already authorizes this amount for this person, so the load is not approved twice (FR-CC-15).'},A);
    created.push(l);
  });
  if(created.length&&typeof wbLog==='function')b.logs.unshift(wbLog(A.date,A.time,caN(A.who),b.status,created.length+' card load'+(created.length===1?'':'s')+' created from this batch ('+created.map(expKey).join(', ')
    +'). Planned allocations are not loaded money: each load is executed and verified separately.'));
  return {created:created,skipped:skipped,batch:b};
}
/* FR-CC-15.05: where a programme says so, an approved allocation batch generates its card loads at once. */
function ccBenefitAuto(b){
  if(!b||b.status!=='Approved')return;
  const progs=ccProgs(b.entity).filter(function(p){return ccProgActive(p)&&ccProgFunding(p).benefitGen==='On allocation batch approval';});
  if(!progs.length)return;
  const ids=progs.map(function(p){return p.id;}),A=caAt('System',wbToday(),stampNow().time);
  progs.forEach(function(p){
    const rows=b.rows.filter(function(r){return r.status==='Planned'&&ccCards.some(function(c){return c.employeeEid===r.eid&&ids.indexOf(c.programmeId)>=0&&c.programmeId===p.id&&p.wallets.indexOf(r.walletType)>=0;});}).map(function(r){return r.id;});
    if(rows.length)ccBenefitGenerate(b.id,{sourceId:ccProgFunding(p).sourceId,rowIds:rows},A,{system:true});
  });
}
ccHook('wbApply',null,function(out,kind,r,to){if(kind==='a'&&to==='Approved'&&(typeof mcOn!=='function'||mcOn('cards')))ccBenefitAuto(r);return undefined;});
/* ══ 7F · The employee cardholder (FR-CC-16, FR-CC-17; US-CC-11, US-CC-12) ═══════════════════════════════
   The cardholder works through the existing Employee access: Corporate Cards → My Cards. Everything here
   reads the same records administrators use - cards, requests, loads, controls, Wallet & Benefits - and
   shows only the employee's own. No balance is calculated: until a provider or Build 8 card transactions
   exist, the employee sees planned entitlement and pending, approved and recorded load amounts, each
   named for what it is (FR-CC-16 balance display rules). Funding sources and company balances are never
   shown to the cardholder (FR-CC-16.11). */

/* What an allocation authorizes, said explicitly: who, which wallet, how much, which period, by whom. */
function ccAllocAuthText(al){
  const r=al.row,b=al.batch;
  return 'Wallet & Benefits allocation '+r.key+' in batch '+b.key+' ('+wbPeriodLabel(b.period)+'): '+r.empName+', '+wbTypeName(r.walletType)+' wallet ('+r.categoryName+'), '
    +expMoney(r.amount,r.currency||'INR')+', approved by '+(b.approvedBy||'Finance')+(b.approvedAt?' on '+b.approvedAt.split(' | ')[0]:'')
    +'. The programme declares that this approval authorizes the card load';
}

/* The employee's pending actions and what they are waiting for (FR-CC-16 Pending Actions, FR-CC-16.07). */
function ccPendingActions(eid){
  const out=[],e=idEmp(eid);if(!e)return out;
  const add=function(kind,text,o){out.push(Object.assign({kind:kind,text:text},o||{}));};
  ccRequests.filter(function(r){return r.employeeEid===eid&&r.entity===ccEnt();}).forEach(function(r){
    const t=ccReqTrack(r);
    if(r.status==='Draft')add('action',expKey(r)+' is a draft: submit it when you are ready.',{rec:r,open:'req'});
    else if(r.status==='Follow-Up')add('action',expKey(r)+' was sent back for Follow-Up: answer it from its Approval tab.',{rec:r,open:'req'});
    else if(r.status==='Awaiting Approval'){const st=caActiveStage(r);add('wait',expKey(r)+' awaits approval'+(st?' at Stage '+st.n+' ('+st.name+')':'')+'.',{rec:r,open:'req'});}
    else if(t==='Enrollment Pending'&&r.enr){
      if(r.enr.status==='Pending')add('wait','Enrollment '+r.enr.key+': the card administrator sends it to the provider next.',{rec:r,open:'req'});
      else if(r.enr.status==='Submitted'&&['Pending','Provider Review'].indexOf(r.enr.kyc)>=0)
        add('action','Enrollment '+r.enr.key+': complete KYC with '+ccProviderName((ccProg(r.programmeId)||{}).provider)+' when they contact you.',{rec:r,open:'req'});
      else if(r.enr.status==='Failed')add('wait','Enrollment '+r.enr.key+' failed at the provider; your card administrator will follow up.',{rec:r,open:'req'});
    }
  });
  ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt();}).forEach(function(c){
    if(c.status==='Activation Pending')add('action','Activate '+ccCardLabel(c)+' in the '+ccProviderName(c.provider)+' app. ADT cannot activate it for you.',{rec:c,open:'card',remind:true});
    if(c.type==='Physical'&&c.status==='Issued'&&c.delivery)add('wait',ccCardLabel(c)+': physical card '+c.delivery.status.toLowerCase()+'.',{rec:c,open:'card'});
    if(c.hold&&c.hold.active)add(c.hold.type==='Temporary'?'wait':'action',ccCardLabel(c)+' is on hold in ADT ('+(c.hold.type==='Temporary'?'temporary: '+c.hold.reason:'reported '+c.hold.reason.toLowerCase())+')'
      +(c.hold.releaseRequest?'; release requested, awaiting review':'')+(c.hold.type!=='Temporary'?'. Call the issuer\'s 24x7 line if you have not already; a replacement can be requested.':'.'),{rec:c,open:'card'});
    if(c.pending)add('wait',ccCardLabel(c)+': '+c.pending.action.toLowerCase()+' requested from '+ccProviderName(c.provider)+'; pending provider confirmation.',{rec:c,open:'card'});
    if(c.clearance&&c.clearance.status==='Open')add('action',ccCardLabel(c)+': exit card clearance is open'+(c.type==='Physical'&&!c.clearance.returned?' - return the card to HR or Finance':'')+'.',{rec:c,open:'card'});
  });
  /* Card enrollment details and declarations are the employee's own to complete (personal consent, decision C1). */
  const withProv=ccProgs().filter(function(p){return ccProgActive(p)&&p.provider&&p.selfRequest;});
  if(withProv.length&&ccEmpModel(e)==='Direct'&&typeof oncStatus==='function'&&!ccCardsOfEmp(eid).length){
    const emp=oncEmpOf(eid),st=emp?oncStatus(emp,oncRec(eid)):'Not Enrolled';
    if(st!=='Ready for Card Enrollment')add('action','Card enrollment is "'+st+'". Complete your details and accept the declarations yourself before a card can be requested.',{open:'onc'});
  }
  return out;
}

/* The cardholder's figures - each named for what it is, none of them a balance (FR-CC-16 balance rules). */
function ccCardholderFigures(eid,period){
  period=period||wbToday().slice(0,7);if(typeof ccLoadsSweepExpiry==='function')ccLoadsSweepExpiry();
  const cards=ccCardsOfEmp(eid).filter(function(c){return c.entity===ccEnt();}),ls=ccLoads.filter(function(l){return l.employeeEid===eid&&l.entity===ccEnt();});
  const sum=function(f){return ccM(ls.reduce(function(n,l){return n+(f(l)||0);},0));};
  const p0=cards.length?ccProg(cards[0].programmeId):null;
  const o={currency:p0?p0.currency:'INR',period:period,
    pending:sum(function(l){return ['Awaiting Approval','Follow-Up'].indexOf(l.status)>=0?l.cardAmount:0;}),
    approved:sum(function(l){return l.exec&&CC_EXEC_OPEN.indexOf(l.exec.status)>=0&&!l.exec.closed&&l.exec.demo!==true?ccToCard(l,ccLoadRemaining(l)):0;}),
    recorded:sum(function(l){return l.exec&&l.exec.demo===false?ccToCard(l,l.exec.recorded-(l.exec.reversed||0)):0;}),
    demo:sum(function(l){return l.exec&&l.exec.demo===true?ccToCard(l,l.exec.recorded-(l.exec.reversed||0)):0;}),planned:0,plannedRows:[]};
  const seen={};
  cards.filter(function(c){return CC_CARD_FINAL.indexOf(c.status)<0;}).forEach(function(c){
    ccWalletEntitlements(c,period).forEach(function(w){if(w.kind!=='benefit'||seen[w.code])return;seen[w.code]=1;o.planned+=w.planned;o.plannedRows.push(w);});
  });
  o.planned=ccM(o.planned);
  return o;
}

/* ── Cardholder demonstration data (product owner, 8 Nov 2026): optional, controlled, demo entity only ──
   One run sets up linked records for one eligible Active employee, chosen by rule (never by name), through
   the normal services: card requests on the shared engine, enrollment, Illustrative provider events,
   card controls and card loads. No verified financial posting is made and no rule is bypassed: if a record
   cannot be created normally, the run stops and says why. The full journey stays available live. */
function ccDemoLast4(c){return String(1000+((c.key*7919)%9000));}
function ccDemoApprove(r,A,tag){
  let g=0;
  while(r.wf&&r.wf.open&&g++<6){
    const st=caActiveStage(r);if(!st)break;
    const who=st.approvers.find(function(u){return caCanDecide(r,u);});
    if(!who)throw new Error(expKey(r)+' Stage '+st.n+' has no approver who may decide it.');
    const e=caDecide(r.id,{scope:'claim',decision:'Approve',comment:tag},caAt(who,A.iso,A.time));
    if(e)throw new Error(expKey(r)+': '+e);
  }
  if(['Approved','Partially Approved'].indexOf(r.status)<0)throw new Error(expKey(r)+' was not approved ('+r.status+').');
}
function ccDemoSetup(A){
  A=A||ccNow();
  const ent=ccEnt(),cfg=ccCfg(ent);
  if(!ccPCan(A,'card.demo.manage'))return {error:caN(A.who)+' cannot load illustrative data (card.demo.manage).'};
  if(!ccDemoOn(ent))return {error:'Presentation mode is off for '+idEntityName(ent)+'. Illustrative data is loaded only in a presentation company.'};
  if(cfg.demoSetup)return {error:'Illustrative cardholder data was already loaded on '+cfg.demoSetup.at+' for '+idEmpName(cfg.demoSetup.employeeEid)+' ('+cfg.demoSetup.records.join(', ')+'). It is set up once per session.'};
  const progs=ccProgs(ent).filter(function(p){return ccProgActive(p);});
  const corp=progs.find(function(p){return p.fundingMode==='Corporate';}),ben=progs.find(function(p){return p.fundingMode!=='Corporate'&&ccWalletMap(p).some(function(w){return w.benefit;});});
  if(!corp&&!ben)return {error:'No active card programme in '+idEntityName(ent)+'.'};
  const okFor=function(e,p){return !p||ccEligibility(e.eid,p.id,'submit').ok;};
  const emp=idEmpAll().filter(function(e){return e.entityId===ent&&ccEmpModel(e);}).find(function(e){
    return okFor(e,corp)&&okFor(e,ben)&&!ccCardsOfEmp(e.eid).length&&!ccRequests.some(function(r){return r.employeeEid===e.eid&&['Rejected','Withdrawn','Cancelled'].indexOf(ccReqTrack(r))<0;});});
  if(!emp)return {error:'No employee is eligible for illustrative data: it needs an Active Direct employee with no card yet and a card enrollment Ready for Card Enrollment (details and declarations completed by the employee).'};
  const tag='Illustrative data loaded by '+caN(A.who)+' (Illustrative provider events; no verified funding).';
  const made=[],note=function(r){made.push(expKey(r));};
  const card=function(p,reason,activate){
    const res=ccReqCreate({employeeEid:emp.eid,programmeId:p.id,cardType:'Virtual',reason:reason,comments:tag},true,A);if(res.error)throw new Error(res.error);
    const r=res.rec;note(r);ccDemoApprove(r,A,tag);
    const se=ccEnrSubmit(r.id,{note:tag},A);if(se)throw new Error(se);
    const c=ccCardOfReq(r);note(c);
    const ev=function(type,id,value,x){const o=ccOutcomeRecord(type,id,Object.assign({value:value,source:CC_DEMO,note:tag},x||{}),A);if(o.error)throw new Error(o.error);};
    if(r.enr.kyc==='Pending')ev('kyc',r.id,'Verified');
    ev('issuance',c.id,'Issued',{last4:ccDemoLast4(c)});
    if(activate)ev('activation',c.id,'Confirmed');
    return c;
  };
  try{
    if(corp){
      const c=card(corp,'Role requirement',true);
      /* A card restriction stricter than the programme: applies at once, as any tightening does. */
      const pc=ccProgCtl(corp),set=ccCtlBlank(),lim=pc&&pc.perTxn!==''?Math.min(25000,pc.perTxn):25000;set.perTxn=lim;
      const cv=ccCtlPropose({scope:'card',targetId:c.id,set:set,effFrom:A.iso,reason:'A lower per-transaction limit for a new cardholder.',baseVer:null},A);if(cv.error)throw new Error(cv.error);
      const w=ccWalletMap(corp).find(function(x){return !x.benefit;}),f=ccProgFunding(corp),track=typeof fbTrackingOn==='function'&&fbTrackingOn(ent);
      if(w&&(!track||f.sourceId)){
        const ld=function(amt,why){const res=ccLoadCreate({cardId:c.id,wallet:w.code,amount:String(amt),currency:corp.currency,sourceId:track?f.sourceId:'',reason:why,comments:tag},true,A);if(res.error)throw new Error(res.error);note(res.rec);return res.rec;};
        ld(15000,'Client visit to Pune next week');
        ccDemoApprove(ld(8000,'Conference registration'),A,tag);
        const l3=ld(12000,'Monthly travel float');ccDemoApprove(l3,A,tag);
        const x=ccLoadExecRecord(l3.id,{result:'Recorded',source:CC_DEMO,note:tag},A);if(x.error)throw new Error(x.error);
      }
    }
    /* The benefit card stays Activation Pending: the employee's next action, and a step to show live. */
    if(ben)card(ben,'Benefit programme enrolment',false);
  }catch(err){
    cfg.demoSetup={at:ccStamp(A),by:A.who,employeeEid:emp.eid,records:made,incomplete:err.message};
    ccLog(cfg,'Illustrative data','Illustrative cardholder data for '+emp.name+' stopped: '+err.message+' Created so far: '+(made.join(', ')||'nothing')+'.',A);
    return {error:'Stopped: '+err.message+(made.length?' Created so far: '+made.join(', ')+'.':'')};
  }
  cfg.demoSetup={at:ccStamp(A),by:A.who,employeeEid:emp.eid,records:made};
  ccLog(cfg,'Illustrative data','Illustrative cardholder data loaded by '+caN(A.who)+' for '+emp.name+': '+made.join(', ')+'. Provider events are '+CC_DEMO+'; no verified funding was posted.',A);
  return {rec:cfg.demoSetup,employee:emp};
}
/* ══ 7G · Integration (FR-CC-18, FR-CC-25, FR-CC-27; product owner's decisions of 8 Nov 2026) ═══════════
   1. Load authorization validity: an approved load may be executed for a configured number of days
      (default 30) from its final approval. Then its unexecuted part expires: no longer reserved, no longer
      executable; what was executed stays. Expiry is evaluated whenever loads, funding sources or approvals
      are looked at - the prototype has no background scheduler, and says so. The rest can be re-raised as
      a new linked load with its own approval; money the provider moved after expiry is recorded only as a
      late-execution exception, verified independently.
   2. Expenses: Corporate Card is a Paid By of the existing expense line, with the card that paid and the
      card-funded part; only the employee-paid part can be reimbursed. Budget and Capping Limit see the
      expense once, as before. The card reference is kept for Build 8 transaction matching.
   3. Exit: when an employee's offboarding starts, every card they hold gets a card clearance - closure
      confirmed by the provider, a physical card returned, no open loads - confirmed by Finance or a card
      administrator, or closed by an audited exception. It never holds up the HR offboarding steps.
   4. References: each card shows the chain request → approval → enrollment → card → wallets → loads →
      funding entries → expenses → reimbursement. */

/* ── 1. Authorization validity ─────────────────────────────────────────── */
const CC_EXPIRY_STATES=['Awaiting Execution','Processing','Partially Recorded','Failed'];
function ccLoadExpiryDue(l,iso){
  return !!(l&&l.exec&&l.exec.expiresOn&&!l.exec.expired&&!l.exec.closed&&(iso||wbToday())>l.exec.expiresOn&&CC_EXPIRY_STATES.indexOf(l.exec.status)>=0&&!ccLoadExecAwaiting(l));
}
/* Expire one load's unexecuted authorization - once. Verified executions are never touched. */
function ccLoadExpire(l,A){
  A=A||caAt('System',wbToday(),stampNow().time);
  if(!ccLoadExpiryDue(l,A.iso))return false;
  const rem=ccLoadRemaining(l),was=l.exec.status;
  l.exec.expired={on:l.exec.expiresOn,at:ccStamp(A),by:A.who,amount:rem,status:was};
  l.exec.closed=true;
  if(!(l.exec.recorded>0))l.exec.status='Expired';
  ccLog(l,l.exec.status,'Authorization expired: valid until '+cdLabel(l.exec.expiresOn)+' ('+l.exec.validityDays+' days from the final approval on '+cdLabel(l.exec.authAt)+'). '
    +(l.exec.recorded>0?'The '+expMoney(l.exec.recorded,l.currency)+' already executed stays recorded; the unexecuted ':'The unexecuted ')+expMoney(rem,l.currency)
    +' is no longer reserved and cannot be executed. Re-raise it as a new load if it is still needed.',A);
  ccNotify(ccUniq([l.createdBy].concat(ccPeopleWith('card.load.create',l.entity))).filter(function(u){return u!=='System';}),expKey(l)+': the authorization expired; '+expMoney(rem,l.currency)+' was not executed.',l,'expired-'+l.exec.expiresOn);
  return true;
}
function ccLoadsSweepExpiry(ent){
  ent=ent||ccEnt();let A=null;
  ccLoads.forEach(function(l){if(l.entity===ent&&ccLoadExpiryDue(l)){A=A||caAt('System',wbToday(),stampNow().time);ccLoadExpire(l,A);}});
}
/* The open re-raise of a load, if any (7G screens). */
function ccLoadReraiseOpen(l){return ccLoadReraiseActive(l);}
/* The remaining amount of an expired load as a new, linked load - with a new approval on the Card Load route.
   Repeatable (7H): while an uncovered amount is left, one re-raise at a time, never more than what is left. */
function ccLoadReraise(id,d,A){
  A=A||ccNow();d=d||{};
  const l=ccLoad(id);if(!l||l.entity!==ccEnt())return {error:'No such load.'};
  if(!ccPCan(A,'card.load.create'))return {error:caN(A.who)+' cannot create card loads (card.load.create).'};
  ccLoadExpire(l,A);
  if(!l.exec||!l.exec.expired)return {error:'The authorization of '+expKey(l)+' has not expired; it can still be executed.'};
  if(!(ccLoadRemaining(l)>0.001))return {error:'Nothing of '+expKey(l)+' is left to re-raise.'};
  const open=ccLoadReraiseActive(l);
  if(open)return {error:expKey(l)+' is already re-raised as '+expKey(open)+' ('+ccLoadLabel(open)+'). One re-raise is active at a time; if it expires unexecuted, re-raise it in turn.'};
  const rem=ccLoadReraiseEligible(l);
  if(!(rem>0.001)){const kids=ccLoadReraiseKids(l).filter(function(x){return !ccLoadNeverAuthorized(x);});
    return {error:'The unexecuted '+expMoney(ccLoadRemaining(l),l.currency)+' of '+expKey(l)+' is already covered by '+kids.map(expKey).join(', ')+'. If that authorization expired too, re-raise from it.'};}
  const reason=String(d.reason||'').trim();if(reason.length<5)return {error:'Say why the remaining amount is still needed.'};
  const data={cardId:l.cardId,wallet:l.wallet,amount:rem,currency:l.currency,sourceId:l.sourceId,allocId:l.allocId,reraiseOf:l.id,dupAck:'Re-raise of '+expKey(l)};
  const origin={type:l.origin&&l.origin.type==='Benefit'?'Benefit':'Individual',reraiseOf:l.id,reraiseKey:expKey(l)};
  const chk=ccLoadCheck(data,{purpose:'submit',origin:origin.type,iso:A.iso});
  if(chk.errors.length)return {error:chk.errors.join(' ')};
  const n=ccLoadNew({reason:'Re-raised from '+expKey(l)+' (authorization expired '+cdLabel(l.exec.expired.on)+'): '+reason,ref:l.extRef,dupAck:data.dupAck},chk,origin,A);
  ccLog(n,'Draft','Re-raised by '+caN(A.who)+' from '+expKey(l)+': the remaining '+expMoney(rem,l.currency)+' after its authorization expired. It needs a new approval.',A);
  ccLoads.unshift(n);l.reraises=(l.reraises||(l.reraisedTo?[l.reraisedTo]:[])).concat([n.id]);l.reraisedTo=n.id;
  const se=ccLoadSubmit(n.id,A);
  if(se){ccLoads.shift();ccLoadNextId--;ccLoadNextKey--;l.reraises.pop();l.reraisedTo=l.reraises.length?l.reraises[l.reraises.length-1]:null;return {error:se};}
  ccLog(l,ccLoadPhase(l),'The remaining '+expMoney(rem,l.currency)+' was re-raised as '+expKey(n)+' by '+caN(A.who)+(l.reraises.length>1?' (re-raise '+l.reraises.length+' of this load; earlier ones: '+l.reraises.slice(0,-1).map(function(x){const y=ccLoad(x);return y?expKey(y)+' '+ccLoadLabel(y):'';}).join(', ')+')':'')+'.',A);
  return {rec:n};
}
/* Money the provider moved after the authorization expired (or reported only then): recorded as it happened,
   as an exception - never as authorized, never as a demo - and only once someone independent verifies it. */
function ccLoadLateRecord(l,d,A){
  const aw=ccLoadExecAwaiting(l);if(aw)return {error:expKey(aw)+' for '+expKey(l)+' already awaits verification.'};
  if(d.source!==CC_SRC_MANUAL)return {error:'A late execution is recorded only from the provider\'s evidence (Manually Verified). Illustrative activity is never recorded late.'};
  const why=String(d.lateReason||'').trim();if(why.length<10)return {error:'Explain why the execution is recorded after the authorization expired (at least 10 characters).'};
  const ref=String(d.ref||'').trim();
  if(ref.length<3)return {error:'Enter the provider\'s confirmation reference for this execution.'};
  if(!String(d.evidence||'').trim())return {error:'Attach or describe the evidence (provider statement, portal screen or advice).'};
  if(!d.date||d.date>wbToday())return {error:'Enter the date the provider executed it (not in the future).'};
  const du=ccLoadRefUsed(ref,null,l.entity);if(du)return {error:'Reference '+ref+' is already recorded on '+du+'; one external movement is recorded once.'};
  const rem=ccLoadRemaining(l),raw=d.amount==null||String(d.amount).trim()===''?String(rem):String(d.amount).replace(/,/g,''),amt=ccM(Number(raw));
  if(!(amt>0))return {error:'Enter the amount the provider loaded.'};
  if(amt>rem+0.001)return {error:'Only '+expMoney(rem,l.currency)+' of '+expKey(l)+' was left unexecuted.'};
  {const el=ccLoadReraiseEligible(l);if(amt>el+0.001){const k=ccLoadReraiseKids(l).filter(function(x){return !ccLoadNeverAuthorized(x);});
    return {error:expMoney(ccM(rem-el),l.currency)+' of '+expKey(l)+' is re-raised as '+k.map(expKey).join(', ')+'. Money moved for that amount is recorded against the re-raised load, not as a late execution here.'};}}
  const e={id:ccLexNextId++,key:ccLexNextKey++,prefix:'LEX',entity:l.entity,loadId:l.id,type:'execution',result:'Recorded',late:true,lateReason:why,amount:amt,source:CC_SRC_MANUAL,ref:ref,
    evidence:String(d.evidence||'').trim(),date:d.date,note:String(d.note||'').trim(),status:'Awaiting Verification',recordedBy:A.who,actual:caVia(A),recordedAt:ccStamp(A),postingId:null};
  ccLoadExecs.unshift(e);l.exec.events.push(e.id);
  ccLog(l,ccLoadPhase(l),'Late execution exception recorded by '+caN(A.who)+': the provider loaded '+expMoney(amt,l.currency)+' (ref '+ref+', '+cdLabel(e.date)+') after the authorization expired on '+cdLabel(l.exec.expiresOn)
    +'. Reason: '+why+'. It is not treated as authorized: it is recorded, and posted to funding, only once someone independent verifies it ('+expKey(e)+').',A);
  ccNotify(ccUniq(ccLoadVerifiers(l,e).concat(ccPeopleWith('card.load.approve',l.entity))).filter(function(u){return u!==A.who;}),expKey(e)+': late execution exception on '+expKey(l)+' awaits verification.',l);
  return {rec:e};
}

/* ── 2. Expenses paid by corporate card (FR-CC-18) ──────────────────────── */
const CC_PAID_CARD='Corporate Card';
function ccPaidByOptions(){
  const base=typeof CA_PAID_BY!=='undefined'?CA_PAID_BY.slice():['Employee','Company','Company Advance'];
  return typeof mcOn==='function'&&!mcOn('cards')?base:base.concat([CC_PAID_CARD]);
}
/* Card status at the start of a day, and whether the card was usable at some time that day (day granularity). */
function ccCardStatusAt(c,iso){let st='Not Issued';(c.events||[]).forEach(function(e){if((e.iso||'')<iso)st=e.to;});return st;}
function ccCardActiveOn(c,iso){
  if(!c||!iso)return false;
  if(ccCardStatusAt(c,iso)==='Active')return true;
  return (c.events||[]).some(function(e){return e.iso===iso&&e.to==='Active';});
}
/* The employee's cards that were active on the expense date - a card closed since still counts for it. */
function ccExpCardsFor(eid,iso){return ccCards.filter(function(c){return c.entity===ccEnt()&&c.employeeEid===eid&&(!iso||ccCardActiveOn(c,iso));});}
function ccExpLineCheck(d,ctx){
  ctx=ctx||{};
  if(typeof mcOn==='function'&&!mcOn('cards'))return 'Corporate Cards is switched off for this entity.';
  const c=ccCard(d.cardId);if(!c||c.entity!==ccEnt())return 'Pick the corporate card that paid.';
  if(c.employeeEid!==ctx.eid)return ccCardLabel(c)+' is held by '+ccHolderName(c)+': a card-paid expense is claimed for its own cardholder.';
  {const el=ccCardEligibility(c,d.start,d.txnAt||''),tx=d.txnId&&typeof ccTxn==='function'?ccTxn(d.txnId):null;
    /* Build 8C: a line made from a transaction with an eligibility exception is reviewed at matching, not refused (FR-CT-08.13). */
    if(!el.ok&&!(tx&&tx.cardId===c.id&&tx.eligibility&&tx.eligibility.exception))return el.text;}
  const amt=Number(d.amount),raw=String(d.cardAmount==null?'':d.cardAmount).replace(/,/g,'').trim(),cd=Number(raw);
  if(!raw||!(cd>0))return 'Enter the card-funded amount.';
  if(Math.abs(cd*100-Math.round(cd*100))>1e-6)return 'The card-funded amount has at most two decimals.';
  if(cd>amt+0.001)return 'The card-funded amount cannot exceed the line amount ('+expMoney(amt,ctx.currency||'')+').';
  if(d.txnId&&typeof ccExpTxnCheck==='function'){const te=ccExpTxnCheck(d,ctx,cd);if(te)return te;}
  return '';
}
/* What a saved line keeps: the card, its masked reference (for Build 8 matching) and the card-funded part. */
function ccExpLineCardFields(d){
  if(!d||d.paidBy!==CC_PAID_CARD)return {};
  const c=ccCard(d.cardId);
  const tx=d.txnId&&typeof ccTxn==='function'?ccTxn(d.txnId):null;
  return {txnId:tx?tx.id:null,txnAt:tx?(d.txnAt||''):'',txnKey:tx?expKey(tx):'',cardId:c?c.id:'',cardAmount:ccM(Number(String(d.cardAmount==null?'':d.cardAmount).replace(/,/g,''))||0),cardRef:c?{key:expKey(c),last4:c.last4,programmeId:c.programmeId,elig:(function(){const e=ccCardEligibility(c,d.start,d.txnAt||'');return {basis:e.basis,provisional:!!e.provisional,text:e.text};})()}:null};
}
function ccExpensesOfCard(c){return (typeof expensesData==='undefined'?[]:expensesData).filter(function(r){return (r.lines||[]).some(function(l){return l.paidBy===CC_PAID_CARD&&l.cardId===c.id;});});}
/* The payable never includes a card-funded part (Build 4's split, read by caCreatePayable). */
function ccCardSplitOf(r){
  const o={card:0,employee:0};
  (r.lines||[]).forEach(function(l){if(l.paidBy!==CC_PAID_CARD)return;const a=l.approved!=null?Number(l.approved):0;if(a<=0)return;const cd=Math.min(Number(l.cardAmount)||0,a);o.card+=cd;o.employee+=a-cd;});
  o.card=ccM(o.card);o.employee=ccM(o.employee);return o;
}

/* ── 3. Exit card clearance (FR-CC-25, PO-5) ───────────────────────────── */
function ccClearanceItems(c){
  const out=[],prov=ccProviderName(c.provider),closed=['Closed','Replaced','Not Issued','Expired'].indexOf(c.status)>=0;
  out.push({key:'closure',label:(c.type==='Virtual'?'Virtual card closed':'Card closed')+(c.provider?' at '+prov+' (confirmed)':' (recorded; no provider connected)'),done:closed,
    note:closed?c.status+' ('+c.source+')':c.pending&&c.pending.action==='Close'?'Closure requested; pending provider confirmation':'Request closure, then record the provider\'s confirmation'});
  if(c.type==='Physical'){const r=c.clearance&&c.clearance.returned;out.push({key:'return',label:'Physical card returned',done:!!r||c.status==='Not Issued',note:r?'Returned '+cdLabel(r.date)+' · '+r.note:'Record the return'});}
  const open=ccLoadsOfCard(c.id).filter(function(l){return ccLoadIsOpen(l)||!!ccLoadExecAwaiting(l);});
  out.push({key:'loads',label:'No open card loads',done:!open.length,note:open.length?open.map(function(l){return expKey(l)+' '+ccLoadLabel(l);}).join(', ')+': execute, cancel or let them expire':'None open'});
  const pend=!!c.pending&&c.pending.action!=='Close';
  out.push({key:'provider',label:'No other provider request pending',done:!pend,note:pend?c.pending.action+' requested; pending provider confirmation':'None'});
  return out;
}
function ccClearanceOpenItems(c){return ccClearanceItems(c).filter(function(x){return !x.done;});}
/* Open card clearance for cards of employees who are leaving; withdraw it if the offboarding is cancelled. */
function ccClearanceSync(ent){
  ent=ent||ccEnt();let A=null;
  ccCards.forEach(function(c){
    if(c.entity!==ent)return;
    const e=idEmp(c.employeeEid);if(!e||typeof empState!=='function')return;
    let st;try{st=empState(e);}catch(x){return;}
    const leaving=st.phase==='off',gone=st.status==='Inactive';
    if((leaving||gone)&&!c.clearance){
      if(ccCardEnded(c)&&!ccLoadsOfCard(c.id).some(ccLoadIsOpen))return;
      A=A||caAt('System',wbToday(),stampNow().time);
      c.clearance={status:'Open',openedAt:ccStamp(A),lwd:st.off&&st.off.lwd||'',returned:null,confirmedBy:'',exception:null};
      ccLog(c,c.status,'Exit card clearance opened: '+ccHolderName(c)+(gone?' has left':' is leaving')+(c.clearance.lwd?' (last working day '+cdLabel(c.clearance.lwd)+')':'')
        +'. New ordinary loads stop. To clear: '+ccClearanceOpenItems(c).map(function(x){return x.label;}).join('; ')+'. HR offboarding steps are not held up by it.',A);
      ccNotify(ccUniq(ccPeopleWith('card.clearance.manage',ent).concat(ccPeopleWith('card.lifecycle.manage',ent))).filter(function(u){return u!==ccHolderUser(c);}),
        expKey(c)+' ('+ccHolderName(c)+'): exit card clearance is open.',c,'clearance-'+(c.clearance&&c.clearance.openedAt||''));
      ccNotify([ccHolderUser(c)],'Your corporate card '+ccCardLabel(c)+' needs exit clearance'+(c.type==='Physical'?': please return the card.':'.'),c,'clearance-'+(c.clearance&&c.clearance.openedAt||''));
    }else if(!leaving&&!gone&&c.clearance&&c.clearance.status==='Open'){
      A=A||caAt('System',wbToday(),stampNow().time);
      c.clearance.status='Withdrawn';c.clearance.withdrawnAt=ccStamp(A);
      ccLog(c,c.status,'Exit card clearance withdrawn: the offboarding of '+ccHolderName(c)+' was cancelled.',A);
    }
  });
}
function ccClearanceMay(A,c){
  if(!ccPCan(A,'card.clearance.manage'))return caN(A.who)+' cannot record card clearance (card.clearance.manage).';
  const real=caVia(A)||A.who,h=ccHolderUser(c);if(A.who===h||real===h)return 'A cardholder does not clear their own card.';
  if(!c.clearance||c.clearance.status!=='Open')return expKey(c)+' has no open exit clearance.';
  return '';
}
/* d: date (ISO), note (who received it, condition). */
function ccClearanceReturn(cardId,d,A){
  A=A||ccNow();d=d||{};
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const m=ccClearanceMay(A,c);if(m)return m;
  if(c.type!=='Physical')return expKey(c)+' is a virtual card: it is closed, not returned.';
  if(c.clearance.returned)return 'The return was already recorded ('+cdLabel(c.clearance.returned.date)+').';
  if(!d.date||d.date>wbToday())return 'Enter the date the card was returned (not in the future).';
  const note=String(d.note||'').trim();if(note.length<3)return 'Say who received the card and its condition.';
  c.clearance.returned={date:d.date,note:note,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(c,c.status,'Physical card returned on '+cdLabel(d.date)+', recorded by '+caN(A.who)+': '+note+'.',A);
  return '';
}
function ccClearanceConfirm(cardId,note,A){
  A=A||ccNow();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const m=ccClearanceMay(A,c);if(m)return m;
  const open=ccClearanceOpenItems(c);
  if(open.length)return 'Not yet clear: '+open.map(function(x){return x.label+' ('+x.note+')';}).join('; ')+'. Resolve them, or record an exception with the reason.';
  c.clearance.status='Cleared';c.clearance.confirmedBy=A.who;c.clearance.confirmedActual=caVia(A);c.clearance.confirmedAt=ccStamp(A);c.clearance.note=String(note||'').trim();
  ccLog(c,c.status,'Exit card clearance confirmed by '+caN(A.who)+(c.clearance.note?': '+c.clearance.note:'')+'. The card and all its history are kept.',A);
  ccNotify(ccPeopleWith('card.clearance.manage',c.entity).filter(function(u){return u!==A.who;}),expKey(c)+' ('+ccHolderName(c)+'): exit card clearance completed.',c);
  return '';
}
function ccClearanceException(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();
  const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const m=ccClearanceMay(A,c);if(m)return m;
  if(reason.length<10)return 'Give the reason for the exception (at least 10 characters); it is kept in the audit trail.';
  const open=ccClearanceOpenItems(c).map(function(x){return x.label+' ('+x.note+')';});
  c.clearance.status='Cleared by Exception';c.clearance.exception={reason:reason,open:open,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(c,c.status,'Exit card clearance closed by exception by '+caN(A.who)+': '+reason+'.'+(open.length?' Still open at the time: '+open.join('; ')+'.':''),A);
  ccNotify(ccUniq(ccPeopleWith('card.clearance.manage',c.entity).concat(ccPeopleWith('card.lifecycle.manage',c.entity))).filter(function(u){return u!==A.who;}),expKey(c)+' ('+ccHolderName(c)+'): exit card clearance closed by exception.',c);
  return '';
}
/* The employee lifecycle starts or cancels an offboarding: card clearance follows at once. */
ccHook('empPushLog',null,function(out,emp,entry){if(entry&&['offboarding','cancel-off','inactive','mark-inactive'].indexOf(entry.type)>=0&&emp)ccClearanceSync(emp.entityId||ccEnt());return undefined;});
/* The employee's lifecycle Workflow shows card clearance beside the exit clearances - as a step that does not hold up the exit. */
ccHook('empWorkflowSteps',null,function(out,emp){
  if(!out||!emp||(typeof mcOn==='function'&&!mcOn('cards')))return undefined;
  ccClearanceSync(emp.entityId||ccEnt());
  const cs=ccCardsOfEmp(emp.eid).filter(function(c){return c.clearance&&c.clearance.status!=='Withdrawn';});if(!cs.length)return undefined;
  const open=cs.filter(function(c){return c.clearance.status==='Open';});
  out.push(open.length?{title:'Corporate Card Clearance (does not hold up the exit)',state:'todo',owner:'Finance / Card Administrator',
      description:open.map(function(c){return ccCardLabel(c)+': '+(ccClearanceOpenItems(c).map(function(x){return x.label;}).join(', ')||'ready to confirm');}).join(' · ')}
    :{title:'Corporate Card Clearance',user:caN(cs[0].clearance.confirmedBy||(cs[0].clearance.exception||{}).by||'System'),date:'',time:'',
      description:cs.map(function(c){return ccCardLabel(c)+': '+c.clearance.status;}).join(' · ')});
  return out;
});

/* ── 4. References: the chain behind a card (FR-CC-27, FR-CC-22) ───────── */
function ccCardRefs(c){
  const r=ccReq(c.requestId);
  return {request:r,enrollment:r&&r.enr?r.enr:null,replacementOf:c.replacementOf?ccCard(c.replacementOf):null,replacedBy:c.replacedBy?ccCard(c.replacedBy):null,
    replacements:ccRequests.filter(function(x){return x.kind==='card replacement'&&x.cardId===c.id;}),
    controls:ccCtlVers.filter(function(v){return v.scope==='card'&&v.targetId===c.id;}),
    loads:ccLoadsOfCard(c.id),expenses:ccExpensesOfCard(c)};
}


/* ══ 7H · Final Build 7 validation ═══════════════════════════════════════════════════════════════
   Product-owner rulings of 8 Nov 2026:
   1. B7-N23: on a card-paid line the actual payment never changes. Approval decides the allowable expense and
      the reimbursement: the approved card part is the lesser of the card payment and the approved amount, the
      rest of the approved amount is the employee's. A card payment above the approved amount is an outstanding
      card-spend exception, kept for Build 8 reconciliation or an authorized recovery - never rewritten here.
   2. B7-N24: card eligibility is read at the transaction time when one is known; with only the expense date it is
      PROVISIONAL (the card was Active at some time that day) and never treated as proof that the provider
      processed the transaction. Build 8 matches against the provider's timestamps.
   3. Re-raise is repeatable: while an unexecuted, uncovered amount remains, one re-raise at a time, each with
      a fresh approval, never more than what is left.
   4. Notifications: one notice per event and recipient (FR-CC-20.05). Report exports are recorded (FR-CC-22). */

/* ── 1. Card-paid lines: actual funding vs approved allocation ───────────── */
const ccSpendExcs=[];
let ccSpendNextId=180001,ccSpendNextKey=1001;
/* The figures of one card-paid line. Actual: what was paid. Approved: what approval allowed (null until final). */
function ccLineSplit(l,r){
  const amt=ccM(Number(l.amount)||0),card=ccM(Math.min(Number(l.cardAmount)||0,amt)),emp=ccM(amt-card);
  const o={amount:amt,actualCard:card,actualEmployee:emp,approved:null,approvedCard:null,approvedEmployee:null,unapprovedCard:0,unapprovedEmployee:0,final:false};
  const fin=!!r&&['Approved','Partially Approved','Rejected'].indexOf(r.status)>=0&&l.approved!=null;
  if(!fin)return o;
  const a=Math.max(0,Math.min(ccM(Number(l.approved)||0),amt));
  o.final=true;o.approved=a;o.approvedCard=ccM(Math.min(card,a));o.approvedEmployee=ccM(a-o.approvedCard);
  o.unapprovedCard=ccM(card-o.approvedCard);o.unapprovedEmployee=ccM(emp-o.approvedEmployee);
  return o;
}
function ccSpendExcOf(claimId,lineId){return ccSpendExcs.find(function(x){return x.claimId===claimId&&x.lineId===lineId;})||null;}
/* Who sees a card-spend exception: Finance, the claim's approvers, card load staff and Super Admin (rule 7). */
function ccSpendVisible(r){
  if(['expense.reimb.process','card.load.verify','card.load.approve','card.load.create','funding.report.view'].some(ccCan))return true;
  const me=typeof idMe==='function'?idMe():'';
  return !!(r&&r.wf&&me&&r.wf.stages.some(function(s){return (s.approvers||[]).indexOf(me)>=0||(s.decisions||[]).some(function(d){return d.by===me;});}));
}
/* Run when a claim is finalized: store the approved allocation on each card-paid line, and open (or update) the
   card-spend exception for a card payment the approval did not cover. Never touches the actual amounts. */
function ccCardSplitSync(r,A){
  if(!r||!(r.lines||[]).some(function(l){return l.paidBy===CC_PAID_CARD;}))return;
  A=A||ccNow();
  r.lines.forEach(function(l){
    if(l.paidBy!==CC_PAID_CARD)return;
    const s=ccLineSplit(l,r);if(!s.final)return;
    l.cardSplit={actualCard:s.actualCard,actualEmployee:s.actualEmployee,approved:s.approved,approvedCard:s.approvedCard,approvedEmployee:s.approvedEmployee,
      unapprovedCard:s.unapprovedCard,unapprovedEmployee:s.unapprovedEmployee,at:ccStamp(A)};
    let x=ccSpendExcOf(r.id,l.id);
    if(s.unapprovedCard>0.001){
      if(x&&x.status==='Open'&&Math.abs(x.amount-s.unapprovedCard)<0.001){l.cardSplit.excId=x.id;return;}
      if(x&&x.status==='Open'){x.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:'Open',action:'Unapproved card portion changed from '+expMoney(x.amount,x.currency)+' to '+expMoney(s.unapprovedCard,r.currency)+' after the claim was decided again.'});x.amount=s.unapprovedCard;x.approvedCard=s.approvedCard;l.cardSplit.excId=x.id;return;}
      const c=ccCard(l.cardId);
      x={id:ccSpendNextId++,key:ccSpendNextKey++,prefix:'CSX',kind:'card spend exception',entity:r.entity,claimId:r.id,claimKey:expKey(r),lineId:l.id,lineTitle:l.title,cardId:l.cardId,
        cardRef:l.cardRef||(c?{key:expKey(c),last4:c.last4,programmeId:c.programmeId}:null),employeeEid:r.employeeEid||(c?c.employeeEid:''),date:l.start,currency:r.currency,
        actualCard:s.actualCard,approvedCard:s.approvedCard,amount:s.unapprovedCard,status:'Open',stage:'Awaiting statement reconciliation or authorized recovery',
        createdAt:ccStamp(A),iso:A.iso,by:A.who,actual:caVia(A),logs:[]};
      ccSpendExcs.unshift(x);l.cardSplit.excId=x.id;
      const t=expKey(x)+': '+expMoney(x.amount,x.currency)+' of the corporate card payment on "'+l.title+'" ('+expKey(r)+') was not approved. The card payment of '+expMoney(s.actualCard,r.currency)
        +' stands as it happened; it is an outstanding card-spend exception for statement reconciliation or an authorized recovery. Nothing was reversed or rewritten.';
      ccLog(x,'Open',t,A);
      if(typeof caLog==='function')caLog(r,r.status,t,A);
      ccNotify(ccUniq(ccPeopleWith('expense.reimb.process',r.entity).concat(ccPeopleWith('card.load.verify',r.entity))).filter(function(u){return u!==A.who;}),t,x,'open');
    }else if(x&&x.status==='Open'){
      x.status='Withdrawn';x.amount=0;
      ccLog(x,'Withdrawn','The claim was decided again and now covers the whole card payment; nothing is outstanding.',A);
    }
  });
}
ccHook('caFinalize',null,function(out,r,A){if(r&&(typeof caKind!=='function'||caKind(r)==='expense'))ccCardSplitSync(r,A);return undefined;});

/* ── 2. Card eligibility at the transaction time, or provisionally on the date ── */
function ccTime24(t){
  const m=/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(String(t||''));if(!m)return '00:00:00';
  let h=Number(m[1]);if(m[4])h=h%12+(/pm/i.test(m[4])?12:0);
  return (h<10?'0':'')+h+':'+m[2]+':'+(m[3]||'00');
}
function ccEvTs(e){return (e.iso||'')+'T'+ccTime24(String(e.at||'').split(' | ')[1]||'');}
function ccCardStatusAtTs(c,ts){let st='Not Issued';(c.events||[]).forEach(function(e){if(ccEvTs(e)<=ts)st=e.to;});return st;}
/* ts = 'YYYY-MM-DDTHH:MM[:SS]' when the transaction time is known (Build 8), else '' (the expense form: date only). */
function ccCardEligibility(c,date,ts){
  if(!c)return {ok:false,basis:'',text:'No card.'};
  if(ts){
    const t=ts.length===16?ts+':00':ts,st=ccCardStatusAtTs(c,t);
    return {ok:st==='Active',basis:'Transaction time',provisional:false,at:t,text:st==='Active'?'Active at the transaction time ('+t.replace('T',' ')+')':ccCardLabel(c)+' was '+st+' at '+t.replace('T',' ')+'.'};
  }
  if(!date)return {ok:false,basis:'',text:'Enter the Start Date first: the card must have been active on it.'};
  if(!ccCardActiveOn(c,date))return {ok:false,basis:'Expense date',text:ccCardLabel(c)+' was not active on '+cdLabel(date)+' (it was '+ccCardStatusAt(c,date)+').'};
  const same=(c.events||[]).filter(function(e){return e.iso===date;}),startActive=ccCardStatusAt(c,date)==='Active';
  let note='Provisional: the card was Active on '+cdLabel(date)+'; it is confirmed against the provider\'s transaction time.';
  const on=same.find(function(e){return e.to==='Active';}),off=same.filter(function(e){return e.from==='Active'&&e.to!=='Active';}).pop();
  if(!startActive&&on)note='Provisional: the card became Active at '+ccTime24(String(on.at||'').split(' | ')[1]||'').slice(0,5)+' on '+cdLabel(date)+'. An expense earlier that day is not verified by this; the card transaction time confirms it.';
  else if(off)note='Provisional: the card was Active until '+ccTime24(String(off.at||'').split(' | ')[1]||'').slice(0,5)+' on '+cdLabel(date)+' (then '+off.to+'); the card transaction time confirms it.';
  return {ok:true,basis:'Expense date',provisional:true,text:note};
}

/* ── 3. Re-raise chains ─────────────────────────────────────────────────── */
function ccLoadReraiseKids(l){return ccLoads.filter(function(x){return x.origin&&x.origin.reraiseOf===l.id;}).sort(function(a,b){return a.id-b.id;});}
/* A re-raise that never became an authorization (rejected or withdrawn) covers nothing. */
function ccLoadNeverAuthorized(x){return !x.exec&&['Rejected','Withdrawn','Cancelled'].indexOf(x.status)>=0;}
function ccLoadReraiseActive(l,exceptId){return ccLoadReraiseKids(l).find(function(x){return x.id!==exceptId&&ccLoadIsOpen(x);})||null;}
/* What may still be re-raised from an expired load: its unexecuted remainder less every re-raise that covers it
   (pending, approved, executed or itself expired - an expired re-raise is re-raised from itself, not again from here). */
function ccLoadReraiseEligible(l,exceptId){
  if(!l||!l.exec||!l.exec.expired)return 0;
  const cov=ccLoadReraiseKids(l).filter(function(x){return x.id!==exceptId&&!ccLoadNeverAuthorized(x);}).reduce(function(s,x){return s+x.amount;},0);
  return Math.max(0,ccM(ccLoadRemaining(l)-cov));
}
function ccLoadAncestors(id){const out=[];let x=id?ccLoad(id):null;while(x&&out.indexOf(x.id)<0){out.push(x.id);x=x.origin&&x.origin.reraiseOf?ccLoad(x.origin.reraiseOf):null;}return out;}
function ccLoadReraiseChain(l){
  let root=l;while(root.origin&&root.origin.reraiseOf&&ccLoad(root.origin.reraiseOf))root=ccLoad(root.origin.reraiseOf);
  const out=[],walk=function(x,d){out.push({load:x,depth:d});ccLoadReraiseKids(x).forEach(function(k){walk(k,d+1);});};walk(root,0);return out;
}

/* ── 4. Report exports are audit events (FR-CC-22) ─────────────────────── */
const ccExportLog=[];
function ccExportRecord(report,rows,format,A){
  A=A||ccNow();
  ccExportLog.unshift({entity:ccEnt(),report:report,rows:rows,format:format,by:A.who,actual:caVia(A),at:ccStamp(A),iso:A.iso});
}
/* Who sees company funding figures in card screens and reports: load staff, approvers, verifiers, funding report readers. */
function ccFundingVisible(){return ['card.load.create','card.load.approve','card.load.verify','funding.report.view'].some(ccCan);}


/* ── 7H final check (product owner, 8 Nov 2026): demo cards never carry genuine money ──────────────────
   A card issued or activated only as Illustrative is not a genuinely issued external card. Loads to it are
   demonstrations: executed only as Illustrative (non-posting) and never reserving Corporate Funding. A genuine
   (Manually Verified) execution needs a card whose issuance, activation and current status are evidenced. */
function ccCardEvidenced(c){
  if(!c)return false;
  const ev=c.events||[],ok=function(e){return !!e&&(e.source===CC_SRC_MANUAL||e.source===CC_SRC_PROVIDER);};
  const iss=ev.filter(function(e){return e.to==='Issued';}).pop(),act=ev.find(function(e){return e.to==='Active';});
  return ok(iss)&&ok(act);
}
function ccCardEvidence(c){return !c?'':ccCardEvidenced(c)?'Evidenced':(c.events||[]).some(function(e){return e.source===CC_DEMO&&['Issued','Active'].indexOf(e.to)>=0;})||c.source===CC_DEMO?CC_DEMO:'Not yet evidenced';}
function ccCardDemoWhy(c){
  if(!c)return '';
  if(ccCardEvidenced(c)){return c.source===CC_DEMO?ccCardLabel(c)+'\'s current status ('+c.status+') was recorded only as '+CC_DEMO+'; record the provider\'s evidence of it before any genuine execution.':'';}
  return ccCardLabel(c)+' was issued or activated only as '+CC_DEMO+' (or is not yet evidenced): it is not a genuinely issued card, so no genuine money can reach it. '
    +'Record this load as '+CC_DEMO+' (it posts nothing), or first record the provider\'s evidence of issuance and activation (Manually Verified, verified by a second person).';
}


/* ══ Build 8 · FR-CT · Card & wallet transactions ═══════════════════════════════════════════════════════
   8A: the transaction record (CTX), its sources and verification, the lifecycle, duplicates, eligibility at
   the transaction time, demo transactions, and the entity timezone (Addendum G3). Separate status dimensions
   (FRD §8.6): lifecycle, verification, expense matching, reconciliation, dispute. Nothing here posts to funding:
   the load already did (BR-CT-02). Card references stay masked; no PAN, PIN or CVV is held. */
const ccTxns=[];
let ccTxnNextId=190001,ccTxnNextKey=1001;
const CCT_LIFE=['Pending Authorization','Posted','Declined','Voided'];
const CCT_TYPES=['Purchase','Authorization'];
const CCT_CHANNELS=['POS','E-commerce','Contactless','ATM','Other'];
const CCT_ENTRY_MANUAL='Manual Entry';
const CCT_UNDER='Under Review',CCT_VERIFIED='Verified',CCT_REJECTED='Rejected';
const CCT_TZ=['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Europe/London','Europe/Dublin','Europe/Paris','Europe/Berlin','Europe/Amsterdam','Europe/Madrid','Europe/Rome',
  'America/New_York','America/Chicago','America/Los_Angeles','Australia/Sydney','UTC'];
function ccTxn(id){return ccTxns.find(function(t){return t.id===Number(id);})||null;}
function ccTxnsOfCard(cardId){return ccTxns.filter(function(t){return t.cardId===Number(cardId);});}

/* ── Entity timezone (Addendum G3): Company Settings, standard identifier, never assumed for other entities ── */
function ccTzValid(tz){if(!tz)return false;try{new Intl.DateTimeFormat('en-GB',{timeZone:tz});return true;}catch(e){return false;}}
function entTimezone(ent){const e=(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(x){return x.entityId===(ent||ccEnt());});return e&&e.timezone||'';}
function entSetTimezone(ent,tz,A){
  A=A||ccNow();ent=ent||ccEnt();
  if(!ccPCan(A,'foundation.entity.update'))return caN(A.who)+' cannot change entity details (foundation.entity.update).';
  if(!ccTzValid(tz))return 'Pick a standard timezone (for example Asia/Kolkata).';
  const e=(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(x){return x.entityId===ent;});if(!e)return 'No such entity.';
  const was=e.timezone||'';if(was===tz)return '';
  e.timezone=tz;e.logs=e.logs||[];
  ccLog(e,'Updated','Entity timezone changed from '+(was||'not set')+' to '+tz+' by '+caN(A.who)+'. Card transaction times and claim due dates use it.',A);
  return '';
}
/* The India demo entity starts with Asia/Kolkata (Addendum G3); every other entity is configured by its admin. */
(function(){(typeof entitiesData!=='undefined'?entitiesData:[]).forEach(function(e){if(!e.timezone&&e.country==='India'&&typeof oncProg==='function'&&oncProg(e.entityId).provider)e.timezone='Asia/Kolkata';});})();
/* Local wall time in a timezone ↔ UTC. 'YYYY-MM-DDTHH:MM' strings; no 1:1 guesses when the zone is unknown. */
function ccTzOffsetMin(tz,utcMs){
  const f=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const p={};f.formatToParts(new Date(utcMs)).forEach(function(x){p[x.type]=x.value;});
  const asUtc=Date.UTC(+p.year,+p.month-1,+p.day,+(p.hour==='24'?0:p.hour),+p.minute,+p.second);
  return Math.round((asUtc-utcMs)/60000);
}
function ccLocalToUtc(local,tz){
  if(!local||!ccTzValid(tz))return '';
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);if(!m)return '';
  const guess=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);let off=ccTzOffsetMin(tz,guess);off=ccTzOffsetMin(tz,guess-off*60000);
  return new Date(guess-off*60000).toISOString().slice(0,16)+'Z';
}
function ccUtcToLocal(utc,tz){
  if(!utc||!ccTzValid(tz))return '';const ms=Date.parse(utc.replace(/Z?$/,'Z'));if(isNaN(ms))return '';
  return new Date(ms+ccTzOffsetMin(tz,ms)*60000).toISOString().slice(0,16);
}

/* ── Labels for the separate dimensions ── */
function ccTxnSourceLabel(t){
  if(t.demo)return CC_DEMO;
  const v=t.verify||{};
  if(t.entry===CCT_ENTRY_MANUAL)return v.status===CCT_VERIFIED?(v.via?'Manual Transaction – Verified with Independently Verified Statement Evidence':'Manual Transaction – Independently Verified with Evidence'):v.status===CCT_REJECTED?'Manual Transaction – Verification Rejected (Unverified)':'Manual Transaction – Awaiting Verification';
  if(t.entry==='Statement Import')return v.status===CCT_VERIFIED?'Statement Import – Independently Verified':'Statement Import – '+(v.status||'');
  return t.entry||'';
}
function ccTxnVerifyLabel(t){return t.demo?CC_DEMO:(t.verify||{}).status||'';}
function ccTxnNet(t){return t.status==='Posted'?(t.direction==='Credit'?-t.billAmount:t.billAmount):0;}
function ccTxnWalletClass(code){const w=typeof wbType==='function'?wbType(code):null;return w?w.cls:'';}

/* ── Who may verify: the permission, active, independent of the recorder and of the cardholder (G9) ── */
function ccTxnVerifiers(t){
  const holder=idUserOfEmp(t.employeeEid),rec=t.pendingPost?t.pendingPost.by:t.recordedBy,act=t.pendingPost?t.pendingPost.actual:t.actual,fix=t.pendingPost?null:ccTxnLastFix(t);
  return ccPeopleWith('card.transaction.verify',t.entity).filter(function(u){return u!==rec&&u!==act&&u!==holder&&!(fix&&(u===fix.by||u===fix.actual))&&(typeof caActive!=='function'||caActive(u));});
}
function ccTxnWhyNotVerify(t,A){
  if(!t)return 'No such transaction.';
  if(!ccPCan(A,'card.transaction.verify'))return caN(A.who)+' cannot verify card transactions (card.transaction.verify).';
  const holder=idUserOfEmp(t.employeeEid),rec=t.pendingPost?t.pendingPost.by:t.recordedBy,act=t.pendingPost?t.pendingPost.actual:t.actual,via=caVia(A);
  if(A.who===rec||via===rec||(act&&(A.who===act||via===act)))return 'Maker-checker: '+caN(rec)+' recorded this evidence; someone else verifies it.';
  const fix=t.pendingPost?null:ccTxnLastFix(t);
  if(fix&&(A.who===fix.by||via===fix.by||(fix.actual&&(A.who===fix.actual||via===fix.actual))))return 'Maker-checker: '+caN(fix.by)+' corrected and resubmitted this record; someone else verifies it.';
  if(A.who===holder||via===holder)return caN(holder)+' holds the card; the cardholder never verifies their own transaction evidence.';
  if(typeof caActive==='function'&&!caActive(A.who))return caN(A.who)+' is not an active user.';
  return '';
}

/* ── Checks shared by manual recording and demo simulation ── */
function ccTxnCheck(d,o){
  o=o||{};d=d||{};
  const out={errors:[],warnings:[]},err=function(x){out.errors.push(x);};
  if(typeof mcOn==='function'&&!mcOn('cards')){err('Corporate Cards is switched off for this entity: transactions are kept, nothing new is recorded.');return out;}
  const c=ccCard(d.cardId);if(!c||c.entity!==ccEnt()){err('Pick a card of this entity.');return out;}
  out.card=c;const p=ccProg(c.programmeId);out.p=p;
  if(o.demo){
    if(!ccDemoOn(c.entity))err('Presentation mode is off for '+idEntityName(c.entity)+': illustrative transactions are not available.');
    if(ccCardEvidence(c)!==CC_DEMO)err(ccCardLabel(c)+' is not an illustrative card: illustrative transactions are created only on illustrative cards, never mixed with genuine card activity.');
  }else if(!ccCardEvidenced(c))err(ccCardLabel(c)+' was issued or activated only as Illustrative (or is not yet evidenced): no genuine transaction can be recorded on it. Use Add Illustrative Transaction in presentation mode, or first record the provider\'s evidence of issuance and activation.');
  const w=ccWalletMap(p).find(function(x){return x.code===d.wallet;});if(!w){err(d.wallet?wbTypeName(d.wallet)+' is not a wallet of '+(p?p.name:'this programme')+'.':'Pick the wallet.');return out;}
  out.w=w;
  if(CCT_TYPES.indexOf(d.type)<0)err('Pick the transaction type: Purchase (posted) or Authorization (pending).');
  const today=wbToday();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date||'')))err('Enter the transaction date.');else if(d.date>today)err('The transaction date cannot be in the future.');
  if(d.time&&!/^\d{2}:\d{2}$/.test(d.time))err('Enter the transaction time as HH:MM.');
  const tz=d.tz||entTimezone(c.entity);out.tz=tz;
  if(d.time&&!ccTzValid(tz))err('Pick the timezone of the transaction time ('+idEntityName(c.entity)+' has no timezone in Company Settings).');
  if(d.type==='Purchase'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d.postDate||'')))err('Enter the posting date of the purchase.');
    else if(d.postDate>today)err('The posting date cannot be in the future.');
    else if(d.date&&d.postDate<d.date)err('The posting date cannot be before the transaction date.');
  }else if(d.postDate)err('A pending authorization has no posting date yet.');
  const merchant=String(d.merchant||'').trim();if(merchant.length<2)err('Enter the merchant.');out.merchant=merchant;
  if(d.mcc&&!/^\d{4}$/.test(String(d.mcc)))err('MCC is four digits.');
  if(d.country&&!/^[A-Z]{2,3}$/.test(String(d.country).toUpperCase()))err('Country is an ISO code (for example IN or IND).');
  if(d.channel&&CCT_CHANNELS.indexOf(d.channel)<0)err('Pick a channel from the list.');
  const amt=Number(String(d.amount==null?'':d.amount).replace(/,/g,''));
  if(!(amt>0)||!isFinite(amt))err('Enter the transaction amount (more than zero).');else if(Math.abs(amt*100-Math.round(amt*100))>1e-6)err('An amount has at most two decimals.');
  out.amount=ccM(amt);
  const cur=d.currency||c.currency;if(EXP_CURRENCIES.indexOf(cur)<0)err('Pick the transaction currency.');out.currency=cur;
  /* Original vs billing (Addendum G8): kept apart; the provider's rate is never replaced by ADT's. */
  if(cur===c.currency){out.billAmount=out.amount;out.billCurrency=c.currency;out.rate=null;}
  else{
    const ba=Number(String(d.billAmount==null?'':d.billAmount).replace(/,/g,''));
    if(!(ba>0))err('The card is billed in '+c.currency+': enter the billing amount from the provider\'s record (ADT never assumes 1:1 or its own rate).');
    out.billAmount=ccM(ba);out.billCurrency=c.currency;
    const r=d.rate===''||d.rate==null?null:Number(d.rate);
    if(r!=null&&!(r>0))err('The provider\'s exchange rate must be more than zero.');
    if(r>0&&ba>0&&Math.abs(ccM(out.amount*r)-out.billAmount)>0.01+1e-9)err('The billing amount '+expMoney(out.billAmount,c.currency)+' does not equal '+expMoney(out.amount,cur)+' × '+r+' (only rounding to the minor unit is allowed). Enter the figures as the provider reports them.');
    out.rate=r>0?r:null;
  }
  return out;
}
/* Transaction time on the entity's clock, for eligibility against the card's status history (B7-N24, FR-CT-08.11). */
function ccTxnEntityLocal(d,tz,ent){
  if(!d.time)return '';const local=d.date+'T'+d.time,etz=entTimezone(ent);
  if(!etz||etz===tz)return local;const utc=ccLocalToUtc(local,tz);return utc?ccUtcToLocal(utc,etz):local;
}
function ccTxnDupOf(t0,ent){
  const ref=String(t0.extRef||'').trim().toLowerCase();
  const byRef=ref?ccTxns.find(function(t){return t.entity===ent&&t.id!==t0.id&&t.provider===t0.provider&&String(t.extRef||'').trim().toLowerCase()===ref;}):null;
  const merchant=String(t0.merchant||'').trim().toLowerCase();
  const near=ccTxns.find(function(t){return t.entity===ent&&t.id!==t0.id&&(t.direction||'Debit')===(t0.direction||'Debit')&&t.cardId===t0.cardId&&t.amount===t0.amount&&t.currency===t0.currency&&t.date===t0.date
    &&String(t.merchant||'').trim().toLowerCase()===merchant&&(t.verify||{}).status!==CCT_REJECTED&&['Declined','Voided'].indexOf(t.status)<0;});
  return {byRef:byRef,near:near};
}
function ccTxnNew(chk,d,o,A){
  const c=chk.card,e=idEmp(c.employeeEid)||{},local=d.time?d.date+'T'+d.time:'';
  const t={id:ccTxnNextId++,key:ccTxnNextKey++,prefix:'CTX',kind:'card transaction',entity:c.entity,cardId:c.id,programmeId:c.programmeId,employeeEid:c.employeeEid,
    name:e.name||'',empId:e.empId||'',provider:c.provider||'',wallet:chk.w.code,walletClass:ccTxnWalletClass(chk.w.code),direction:'Debit',type:d.type,
    status:d.type==='Authorization'?'Pending Authorization':'Posted',date:d.date,time:d.time||'',local:local,tz:local?chk.tz:'',utc:local?ccLocalToUtc(local,chk.tz):'',
    postDate:d.type==='Purchase'?d.postDate:'',merchant:chk.merchant,mcc:String(d.mcc||''),country:String(d.country||'').toUpperCase(),channel:d.channel||'',
    amount:chk.amount,currency:chk.currency,billAmount:chk.billAmount,billCurrency:chk.billCurrency,rate:chk.rate,rateSource:chk.rate?'Provider-reported':'',
    extRef:String(d.extRef||'').trim(),authCode:String(d.authCode||'').trim(),entry:o.demo?CC_DEMO:CCT_ENTRY_MANUAL,demo:!!o.demo,
    verify:o.demo?{status:CC_DEMO,source:CC_DEMO}:{status:CCT_UNDER,source:'',by:'',at:''},
    reason:String(d.reason||'').trim(),comments:String(d.comments||'').trim(),evidence:String(d.evidence||'').trim(),
    matchStatus:'Unmatched',reconStatus:'Not Reconciled',disputes:[],lifecycle:[],
    recordedBy:A.who,actual:caVia(A),recordedAt:ccStamp(A),iso:A.iso,logs:[]};
  t.cardRef={key:expKey(c),last4:c.last4};
  const el=ccCardEligibility(c,d.date,ccTxnEntityLocal(d,chk.tz,c.entity));
  t.eligibility={ok:el.ok,basis:el.basis||'',provisional:!!el.provisional,text:el.text,exception:!el.ok};
  t.lifecycle.push({to:t.status,at:ccStamp(A),by:A.who,actual:caVia(A),note:'Recorded'});
  return t;
}

/* ── FR-CT-04: a missing external transaction, from evidence, awaiting an independent verifier ── */
function ccTxnRecord(d,A){
  A=A||ccNow();d=d||{};
  if(!ccPCan(A,'card.transaction.record'))return {error:caN(A.who)+' cannot record card transactions (card.transaction.record).'};
  const chk=ccTxnCheck(d,{});if(chk.errors.length)return {error:chk.errors.join(' ')};
  if(String(d.extRef||'').trim().length<3)return {error:'Enter the provider\'s transaction reference from the evidence.'};
  if(!String(d.evidence||'').trim())return {error:'Attach the external evidence (statement, provider portal screen or advice). A transaction without evidence cannot go to verification.'};
  if(String(d.reason||'').trim().length<5)return {error:'Say why this transaction is recorded manually.'};
  const t=ccTxnNew(chk,d,{},A),dup=ccTxnDupOf(t,t.entity);
  if(dup.byRef){ccTxnNextId--;ccTxnNextKey--;const rj=(dup.byRef.verify||{}).status===CCT_REJECTED;
    return {error:'Reference '+t.extRef+' is already recorded on '+expKey(dup.byRef)+(rj?' (verification rejected)':'')+' for '+ccProviderName(t.provider||'')+'; one external transaction is recorded once.'
      +(rj?' Rejection does not change the transaction\'s identity: correct and resubmit '+expKey(dup.byRef)+' instead.':'')};}
  if(dup.near){
    const ack=String(d.dupAck||'').trim();
    if(ack.length<10){ccTxnNextId--;ccTxnNextKey--;return {error:'Possible duplicate of '+expKey(dup.near)+' (same card, merchant, date, amount and currency). If it is a separate transaction, say why (at least 10 characters).',dupOf:dup.near.id};}
    t.dupReview={of:dup.near.id,ofKey:expKey(dup.near),reason:ack,status:'Open'};
  }
  ccTxns.unshift(t);
  ccLog(t,t.status,'Recorded manually by '+caN(A.who)+' from external evidence ('+t.evidence+'): '+t.merchant+', '+expMoney(t.amount,t.currency)
    +(t.currency!==t.billCurrency?' billed '+expMoney(t.billAmount,t.billCurrency)+(t.rate?' at the provider\'s rate '+t.rate:''):'')+', reference '+t.extRef+'. Reason: '+t.reason
    +'. Awaiting verification by someone independent; it is not a provider confirmation.'+(t.dupReview?' Duplicate review: separate from '+t.dupReview.ofKey+' because '+t.dupReview.reason+'.':'')
    +(t.eligibility.exception?' Eligibility exception: '+t.eligibility.text:''),A);
  ccNotify(ccTxnVerifiers(t),expKey(t)+': a manually recorded card transaction ('+t.merchant+', '+expMoney(t.amount,t.currency)+') awaits your verification.',t,'verify');
  ccNotify([idUserOfEmp(t.employeeEid)],'A card transaction was recorded on your card '+ccMask(t.cardRef.last4)+': '+t.merchant+', '+expMoney(t.amount,t.currency)+' ('+t.status+'). It awaits verification.',t,'recorded');
  return {rec:t};
}
function ccTxnVerify(id,A){
  A=A||ccNow();const t=ccTxn(id);if(!t||t.entity!==ccEnt())return 'No such transaction.';
  if(t.demo)return expKey(t)+' is an illustrative transaction; it is never verified as genuine.';
  const why=ccTxnWhyNotVerify(t,A);if(why)return why;
  if(t.pendingPost){
    const pp=t.pendingPost;t.pendingPost=null;const was=t.status;t.status='Posted';t.postDate=pp.date;if(ccTxnOutcomeLabel(t)){t.outcome.closed=ccStamp(A);t.outcome.by2='Posting '+pp.ref;}
    t.lifecycle.push({from:was,to:'Posted',at:ccStamp(A),by:A.who,actual:caVia(A),note:'Posting '+pp.ref+' recorded by '+caN(pp.by)+', verified',ref:pp.ref});
    ccLog(t,'Posted','Posting verified by '+caN(A.who)+': posted on '+cdLabel(pp.date)+' (reference '+pp.ref+', evidence '+pp.evidence+', recorded by '+caN(pp.by)+').',A);
    ccNotify([idUserOfEmp(t.employeeEid)],expKey(t)+': your card transaction at '+t.merchant+' is now posted.',t,'posted');
    return '';
  }
  if(t.verify.status!==CCT_UNDER)return expKey(t)+' is '+t.verify.status+'; only a transaction under review is verified.';
  if(!t.evidence)return 'Verification is blocked: '+expKey(t)+' has no external evidence.';
  t.verify={status:CCT_VERIFIED,source:CC_SRC_MANUAL,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(t,t.status,'Verified by '+caN(A.who)+' from the external evidence (Manually Verified). This is not a provider confirmation: '+ccProviderName(t.provider||'')+' is not connected.',A);
  return '';
}
function ccTxnReject(id,reason,A){
  A=A||ccNow();const t=ccTxn(id);if(!t||t.entity!==ccEnt())return 'No such transaction.';
  if(t.demo)return expKey(t)+' is an illustrative transaction.';
  const why=ccTxnWhyNotVerify(t,A);if(why)return why;
  reason=String(reason||'').trim();if(reason.length<5)return 'Say why the evidence is rejected.';
  if(t.pendingPost){const pp=t.pendingPost;t.pendingPost=null;
    ccLog(t,t.status,'Posting '+pp.ref+' rejected by '+caN(A.who)+': '+reason+'. The transaction stays '+t.status+'.',A);
    ccNotify([pp.by],expKey(t)+': the posting you recorded was rejected: '+reason,t,'post-rejected-'+t.logs.length);return '';}
  if(t.verify.status!==CCT_UNDER)return expKey(t)+' is '+t.verify.status+'.';
  t.verify={status:CCT_REJECTED,source:'',by:A.who,actual:caVia(A),at:ccStamp(A),reason:reason};
  ccLog(t,t.status,'Verification rejected by '+caN(A.who)+': '+reason+'. The record and its evidence are kept.',A);
  ccNotify([t.recordedBy],expKey(t)+': the transaction you recorded was rejected at verification: '+reason,t,'rejected');
  return '';
}
/* Lifecycle (FR-CT-03.01, 03.09): a pending authorization is posted, declined or voided. Genuine postings are
   evidenced and verified by someone else; a demo transaction moves at once and stays Illustrative. */
function ccTxnPost(id,d,A){
  A=A||ccNow();d=d||{};const t=ccTxn(id);if(!t||t.entity!==ccEnt())return 'No such transaction.';
  if(t.status!=='Pending Authorization')return expKey(t)+' is '+t.status+'; only a pending authorization is posted.';
  if(!d.date||d.date>wbToday()||d.date<t.date)return 'Enter the posting date (on or after the transaction date, not in the future).';
  if(t.demo){
    if(!ccPCan(A,'card.demo.simulate')||!ccDemoOn(t.entity))return 'Illustrative transactions move only in presentation mode, with card.demo.simulate.';
    t.status='Posted';t.postDate=d.date;t.lifecycle.push({from:'Pending Authorization',to:'Posted',at:ccStamp(A),by:A.who,actual:caVia(A),note:CC_DEMO});
    ccLog(t,'Posted','Posted (Illustrative) by '+caN(A.who)+' on '+cdLabel(d.date)+'. No money moved.',A);return '';
  }
  if(!ccPCan(A,'card.transaction.record'))return caN(A.who)+' cannot record card transactions (card.transaction.record).';
  if(t.verify.status!==CCT_VERIFIED)return expKey(t)+' must be verified before its posting is recorded.';
  if(t.pendingPost)return 'A posting of '+expKey(t)+' already awaits verification.';
  const ref=String(d.ref||'').trim();if(ref.length<3)return 'Enter the provider\'s posting reference.';
  if(!String(d.evidence||'').trim())return 'Attach the evidence of posting.';
  t.pendingPost={date:d.date,ref:ref,evidence:String(d.evidence).trim(),by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(t,t.status,'Posting recorded by '+caN(A.who)+' (posted '+cdLabel(d.date)+', reference '+ref+'); it awaits verification by someone independent.',A);
  ccNotify(ccTxnVerifiers(t),expKey(t)+': a posting awaits your verification.',t,'post-verify-'+t.logs.length);
  return '';
}
/* B8-N05 A: a non-financial status update needs no second person, but an external fact needs evidence.
   With the provider's reference and evidence the authorization becomes Voided/Declined; without them ADT keeps
   an internal Unconfirmed outcome and the authorization stays Pending Authorization. Demo stays Illustrative. */
function ccTxnVoid(id,d,A){
  A=A||ccNow();d=d||{};const t=ccTxn(id);if(!t||t.entity!==ccEnt())return 'No such transaction.';
  const to=d.outcome==='Declined'?'Declined':'Voided';
  if(t.status!=='Pending Authorization')return expKey(t)+' is '+t.status+'; only a pending authorization is '+to.toLowerCase()+'.';
  if(t.demo){if(!ccPCan(A,'card.demo.simulate')||!ccDemoOn(t.entity))return 'Illustrative transactions move only in presentation mode, with card.demo.simulate.';}
  else if(!ccPCan(A,'card.transaction.record'))return caN(A.who)+' cannot record card transactions (card.transaction.record).';
  const reason=String(d.reason||'').trim();if(reason.length<5)return 'Say why the authorization was '+to.toLowerCase()+'.';
  if(t.pendingPost)return 'A posting awaits verification; reject it first.';
  const ref=String(d.ref||'').trim(),ev=String(d.evidence||'').trim();
  if(t.demo){
    t.status=to;t.lifecycle.push({from:'Pending Authorization',to:to,at:ccStamp(A),by:A.who,actual:caVia(A),note:reason+(ref?' · '+ref:'')+' · '+CC_DEMO});
    ccLog(t,to,to+' by '+caN(A.who)+' ('+CC_DEMO+'): '+reason+(ref?' (reference '+ref+')':'')+'. It was never settled: no business expense arises from it.',A);
    return '';
  }
  const basis=d.basis||(ref&&ev?'Evidenced':'Unconfirmed');
  if(basis==='Evidenced'){
    if(ref.length<3)return 'Enter the provider\'s reference for the '+to.toLowerCase()+' (from its record or statement).';
    if(!ev)return 'Attach the evidence of the '+to.toLowerCase()+' (provider record, statement or advice). Without it, record an internal unconfirmed outcome.';
    const was=ccTxnOutcomeLabel(t)?t.outcome:null;
    t.status=to;t.outcome={to:to,confirmed:true,basis:'Evidenced',ref:ref,evidence:ev,reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A),earlier:was};
    t.lifecycle.push({from:'Pending Authorization',to:to,at:ccStamp(A),by:A.who,actual:caVia(A),note:reason+' · '+ref+' · '+ev});
    ccLog(t,to,to+' by the provider, recorded by '+caN(A.who)+' from its evidence ('+ev+', reference '+ref+'): '+reason+'.'+(was?' It confirms the internal unconfirmed outcome recorded by '+caN(was.by)+'.':'')
      +' The authorization was never settled: no expense, reimbursement, funding or budget effect arises from it.',A);
    return '';
  }
  if(ccTxnOutcomeLabel(t))return expKey(t)+' already has an internal unconfirmed '+t.outcome.to.toLowerCase()+' outcome; confirm it with the provider\'s reference and evidence when they arrive.';
  t.outcome={to:to,confirmed:false,basis:'Internal – Unconfirmed',ref:ref,reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccLog(t,t.status,'Internal outcome recorded by '+caN(A.who)+': '+to+' – Unconfirmed ('+reason+(ref?', reference '+ref:'')+'). There is no provider evidence yet, so the authorization stays Pending Authorization and is not shown as '+to.toLowerCase()+' by the provider. No expense, reimbursement, funding or budget effect arises.',A);
  return '';
}
/* FR-CT-26: a demonstration transaction, only on an illustrative card, in demo mode, never posting. */
function ccTxnSimulate(d,A){
  A=A||ccNow();d=d||{};
  if(!ccPCan(A,'card.demo.simulate'))return {error:caN(A.who)+' cannot record illustrative card activity (card.demo.simulate).'};
  const chk=ccTxnCheck(d,{demo:true});if(chk.errors.length)return {error:chk.errors.join(' ')};
  const t=ccTxnNew(chk,Object.assign({},d,{extRef:d.extRef||''}),{demo:true},A);
  ccTxns.unshift(t);
  ccLog(t,t.status,'Illustrative transaction created by '+caN(A.who)+': '+t.merchant+', '+expMoney(t.amount,t.currency)+'. No card was charged and nothing is posted.'+(t.eligibility.exception?' Eligibility exception: '+t.eligibility.text:''),A);
  ccNotify([idUserOfEmp(t.employeeEid)],'An illustrative transaction was added on your card '+ccMask(t.cardRef.last4)+': '+t.merchant+', '+expMoney(t.amount,t.currency)+'. No money moved.',t,'recorded');
  return {rec:t};
}


/* ══ Build 8A corrections (B8-N05, 8 Nov 2026) ═════════════════════════════════════════════════════════
   A. Void/Decline: an internal update never claims a provider outcome. With the provider's reference and
      evidence the authorization becomes Voided/Declined; without them it stays Pending Authorization with an
      internal Unconfirmed outcome, confirmed later by evidence (or a verified statement).
   B. Rejection changes verification eligibility, not identity: a rejected record keeps its reference for
      duplicate detection and is corrected and resubmitted (before/after kept, duplicates re-checked).
   C. The cardholder sees their rejected record as Verification Rejected (Unverified), never the verifier's
      notes, and may add supporting information. */
function ccTxnOutcomeLabel(t){return t&&t.outcome&&!t.outcome.confirmed&&!t.outcome.closed?t.outcome.to+' – Unconfirmed (internal)':'';}
function ccTxnLastFix(t){return t&&t.corrections&&t.corrections.length?t.corrections[t.corrections.length-1]:null;}
/* Correct and resubmit a rejected record (FR-CT-04, B8-N05 B). */
function ccTxnResubmit(id,d,A){
  A=A||ccNow();d=d||{};const t=ccTxn(id);if(!t||t.entity!==ccEnt())return 'No such transaction.';
  if(!ccPCan(A,'card.transaction.record'))return caN(A.who)+' cannot record card transactions (card.transaction.record).';
  if(t.demo||(t.verify||{}).status!==CCT_REJECTED)return expKey(t)+' is '+ccTxnVerifyLabel(t)+'; only a rejected record is corrected and resubmitted.';
  if(typeof mcOn==='function'&&!mcOn('cards'))return 'Corporate Cards is switched off for this entity: transactions are kept, nothing is resubmitted.';
  const F=['date','time','tz','postDate','merchant','mcc','country','channel','amount','currency','billAmount','rate','extRef','authCode'];
  const cur={date:t.date,time:t.time,tz:t.tz,postDate:t.postDate,merchant:t.merchant,mcc:t.mcc,country:t.country,channel:t.channel,amount:t.amount,currency:t.currency,
    billAmount:t.currency!==t.billCurrency?t.billAmount:'',rate:t.rate==null?'':t.rate,extRef:t.extRef,authCode:t.authCode};
  const nx=Object.assign({},cur);F.forEach(function(k){if(d[k]!=null)nx[k]=d[k];});
  const reason=String(d.reason||'').trim();if(reason.length<5)return 'Say what was corrected and why.';
  const ev=String(d.evidence||'').trim();if(!ev)return 'Attach the corrected or additional evidence.';
  const chk=ccTxnCheck(Object.assign({cardId:t.cardId,wallet:t.wallet,type:t.type},nx),{});if(chk.errors.length)return chk.errors.join(' ');
  const ref=String(nx.extRef||'').trim();if(ref.length<3)return 'Enter the provider\'s transaction reference from the evidence.';
  const dup=ccTxnDupOf({id:t.id,provider:t.provider,extRef:ref,cardId:t.cardId,amount:chk.amount,currency:chk.currency,date:nx.date,merchant:chk.merchant,direction:t.direction},t.entity);
  if(dup.byRef)return 'Duplicate revalidation: reference '+ref+' is already recorded on '+expKey(dup.byRef)+'. One external transaction is recorded once.';
  let dupRev=null;
  if(dup.near){const ack=String(d.dupAck||'').trim();if(ack.length<10)return 'Duplicate revalidation: possible duplicate of '+expKey(dup.near)+' (same card, merchant, date, amount and currency). If it is a separate transaction, say why (at least 10 characters).';
    dupRev={of:dup.near.id,ofKey:expKey(dup.near),reason:ack,status:'Open'};}
  const after={date:nx.date,time:String(nx.time||''),tz:nx.time?chk.tz:'',postDate:t.type==='Purchase'?String(nx.postDate||''):'',merchant:chk.merchant,mcc:String(nx.mcc||''),country:String(nx.country||'').toUpperCase(),
    channel:String(nx.channel||''),amount:chk.amount,currency:chk.currency,billAmount:chk.billAmount,billCurrency:chk.billCurrency,rate:chk.rate,extRef:ref,authCode:String(nx.authCode||'').trim()};
  const before={},ch=[];
  Object.keys(after).forEach(function(k){const a=t[k]==null?'':t[k],b=after[k]==null?'':after[k];if(String(a)!==String(b)){before[k]=t[k];ch.push(k);}});
  ch.forEach(function(k){t[k]=after[k];});
  t.local=t.time?t.date+'T'+t.time:'';t.utc=t.local?ccLocalToUtc(t.local,t.tz):'';t.rateSource=t.rate?'Provider-reported':'';
  if(ch.indexOf('extRef')>=0){t.formerRefs=(t.formerRefs||[]).concat([before.extRef]);}
  t.corrections=t.corrections||[];t.corrections.push({at:ccStamp(A),by:A.who,actual:caVia(A),before:before,after:ch.reduce(function(o,k){o[k]=after[k];return o;},{}),reason:reason,evidenceBefore:t.evidence,evidence:ev});
  t.evidence=ev;t.verifyHistory=(t.verifyHistory||[]).concat([t.verify]);t.verify={status:CCT_UNDER,source:'',by:'',at:''};
  if(dupRev)t.dupReview=dupRev;
  const c=ccCard(t.cardId),el=ccCardEligibility(c,t.date,ccTxnEntityLocal({date:t.date,time:t.time},t.tz,t.entity));
  t.eligibility={ok:el.ok,basis:el.basis||'',provisional:!!el.provisional,text:el.text,exception:!el.ok};
  ccLog(t,t.status,'Corrected and resubmitted by '+caN(A.who)+' after the rejection ('+reason+'): '+(ch.length?ch.map(function(k){return k+' "'+(before[k]==null?'':before[k])+'" → "'+(after[k]==null?'':after[k])+'"';}).join('; '):'no field changed, new evidence only')
    +'. Evidence: '+ev+'. Its identity, reference history and the rejection are kept; it awaits verification by someone independent of the recorder and the corrector.'+(t.eligibility.exception?' Eligibility exception: '+t.eligibility.text:''),A);
  ccNotify(ccTxnVerifiers(t),expKey(t)+': a corrected card transaction ('+t.merchant+', '+expMoney(t.amount,t.currency)+') awaits your verification.',t,'verify-'+t.corrections.length);
  return '';
}
/* The cardholder adds supporting information (B8-N05 C): it never changes the verification. */
function ccTxnAddInfo(id,d,A){
  A=A||ccNow();d=d||{};const t=ccTxn(id);if(!t||t.entity!==ccEnt())return 'No such transaction.';
  const holder=idUserOfEmp(t.employeeEid);if(A.who!==holder)return 'Only the cardholder adds supporting information to their own transaction.';
  if(t.demo)return expKey(t)+' is an illustrative transaction.';
  if(!ccTxnInfoOpen(t))return 'Supporting information is added while a transaction is under review, after its verification was rejected, or while it still needs an expense claim.';
  const note=String(d.note||'').trim();if(note.length<5)return 'Describe the information you are adding.';
  t.holderInfo=t.holderInfo||[];t.holderInfo.push({note:note,file:String(d.file||'').trim(),by:A.who,actual:caVia(A),at:ccStamp(A)});
  ccLog(t,t.status,'Supporting information added by the cardholder '+caN(A.who)+': '+note+(d.file?' (attachment '+d.file+')':'')+'. It does not change the verification; Finance reviews it.',A);
  ccNotify(ccUniq([t.recordedBy].concat(ccTxnVerifiers(t),(t.verify||{}).status===CCT_VERIFIED?ccPeopleWith('card.transaction.match',t.entity):[])).filter(function(u){return u&&u!==A.who;}),expKey(t)+': the cardholder added supporting information.',t,'info-'+t.holderInfo.length);
  return '';
}

/* ══ Build 8B · FR-CT-05, 06 · Card statements: import, validation, Card Mapping Review, independent verification ══
   A statement is external evidence that Finance uploads (no bank connection, BR-CT-13). Each row is checked
   against the existing Card, Employee, Programme and Wallet records with the 8A transaction checks. A card is
   mapped only when the reference identifies exactly one card, never on the last four digits alone (Addendum
   G2); unresolved rows wait in Card Mapping Review. Nothing becomes a card transaction until someone
   independent verifies the statement; verified rows are Manually Verified, never Provider Confirmed.
   Import never debits funding, never loads a card, never touches a budget and never states a balance it
   was not given (FR-CT-05.15, 05.17). Import and verification are kept apart from reconciliation. */
const ccStmts=[];let ccStmtNextId=200001,ccStmtNextKey=1001;
/* [key, template label, header required] — the documented standard template (FR-CT-05.02, 05.16). */
const CCS_COLS=[['empId','Employee ID',0],['programme','Card Programme',1],['card','Card Reference',0],['last4','Last Four',1],['wallet','Wallet',1],
  ['ref','Transaction Reference',1],['authCode','Authorization Code',0],['date','Transaction Date',1],['time','Transaction Time',0],['tz','Timezone',0],['postDate','Posting Date',0],
  ['merchant','Merchant',1],['mcc','MCC',0],['country','Merchant Country',0],['channel','Channel',0],['type','Transaction Type',1],['status','Transaction Status',1],
  ['amount','Original Amount',1],['currency','Original Currency',1],['billAmount','Billing Amount',0],['billCurrency','Billing Currency',0],['rate','Provider FX Rate',0],
  ['origRef','Original Reference',0],['description','Description',0]];
const CCS_TYPES=['Purchase','Refund','Reversal'],CCS_STATUS=['Posted','Pending','Declined','Voided'];
const CCS_ENTRY='Statement Import';
const CCS_OPEN=['Uploaded','Validation Pending','Review Required','Validation Completed'];
const CCS_SENSITIVE=/card\s*number|^pan$|^card\s*no|cvv|cvc|^pin$|expiry|exp\.?\s*date|valid\s*thru/i;
const CCS_NOTES=['One row per card transaction as the provider reports it. Never enter a full card number, CVV, PIN or expiry: Last Four holds the last four digits only, and any column not in this template is ignored and not stored.',
  'Card mapping: Card Reference (the ADT card record CRD-…, or the provider card ID once it is confirmed on the card record), or Employee ID + Card Programme + Last Four. The last four digits alone never identify a card; a row that none of these identifies uniquely goes to Card Mapping Review.',
  'Billing Amount is required when the Original Currency is not the card currency (ADT never converts at its own rate). Refund and Reversal rows give the Original Reference. Leave Transaction Time blank when the provider does not report it.'];
function ccStmt(id){return ccStmts.find(function(s){return s.id===Number(id);})||null;}
function ccHashBytes(u8){let h=0x811c9dc5;for(let i=0;i<u8.length;i++){h^=u8[i];h=Math.imul(h,0x01000193)>>>0;}return ('0000000'+h.toString(16)).slice(-8);}
/* A full card number is never kept: a 13–19 digit run becomes •••• + its last four. */
function ccPanMask(v){const m=String(v==null?'':v).replace(/[\s-]/g,'').match(/\d{13,19}/);return m?'••••'+m[0].slice(-4):null;}
function ccStmtDate(v){
  v=String(v==null?'':v).trim();if(!v)return '';let iso=null,m;
  if((m=/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(v)))iso=m[1]+'-'+m[2]+'-'+m[3];
  else if((m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(v)))iso=m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  else if(/^\d{5}(\.\d+)?$/.test(v)){const n=Math.floor(Number(v));if(n>30000&&n<80000)iso=new Date(Date.UTC(1899,11,30)+n*86400000).toISOString().slice(0,10);}
  if(!iso)return null;const ms=Date.parse(iso+'T00:00:00Z');return !isNaN(ms)&&new Date(ms).toISOString().slice(0,10)===iso?iso:null;
}
function ccStmtTime(v){
  v=String(v==null?'':v).trim();if(!v)return '';let m=/^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v);
  if(!m&&/^0?\.\d+$/.test(v)){const mins=Math.round(Number(v)*1440);m=[0,String(Math.floor(mins/60)),String(mins%60)];}
  if(!m||+m[1]>23||+m[2]>59)return null;return ('0'+m[1]).slice(-2)+':'+('0'+m[2]).slice(-2);
}
function ccStmtLife(d){
  const ty=ccPickCI(CCS_TYPES,d.type),st=ccPickCI(CCS_STATUS,d.status);
  return {type:ty,status:st,credit:ty==='Refund'||ty==='Reversal',chkType:st==='Posted'?'Purchase':'Authorization',
    life:st==='Posted'?'Posted':st==='Pending'?'Pending Authorization':st==='Declined'?'Declined':st==='Voided'?'Voided':''};
}

/* ── Reading the file: the Build 7 CSV/XLSX reader, then the statement template (FR-CT-05.01, 05.05) ── */
function ccStmtGrid(grid,meta){
  const norm=function(s){return String(s||'').trim().toLowerCase();};
  let h=-1;
  for(let i=0;i<Math.min(grid.length,15);i++){const r=(grid[i]||[]).map(norm);if(r.indexOf('transaction reference')>=0&&r.indexOf('transaction date')>=0){h=i;break;}}
  if(h<0)throw new Error('This is not a card statement in the standard template: no header row with Transaction Reference and Transaction Date was found. Download the template and keep its columns.');
  const head=grid[h].map(norm),idx={};
  CCS_COLS.forEach(function(c){const i=head.indexOf(norm(c[1]));if(i>=0)idx[c[0]]=i;});
  const missing=CCS_COLS.filter(function(c){return c[2]&&idx[c[0]]==null;}).map(function(c){return c[1];});
  if(missing.length)throw new Error('Missing required column'+(missing.length>1?'s':'')+': '+missing.join(', ')+'. Download the template and keep its columns.');
  const known=CCS_COLS.map(function(c){return norm(c[1]);});
  const extra=grid[h].map(function(x){return String(x||'').trim();}).filter(function(x){return x&&known.indexOf(norm(x))<0;});
  const rows=[],masked=[];
  for(let i=h+1;i<grid.length;i++){
    const r=grid[i]||[];if(!r.some(function(v){return String(v||'').trim();}))continue;
    const data={};CCS_COLS.forEach(function(c){data[c[0]]=idx[c[0]]!=null?String(r[idx[c[0]]]==null?'':r[idx[c[0]]]).trim():'';});
    ['card','last4','merchant','description','empId'].forEach(function(k){const m=ccPanMask(data[k]);if(m){data[k]=k==='last4'?m.slice(-4):m;masked.push(i+1);}});
    rows.push({n:i+1,data:data});
  }
  if(!rows.length)throw new Error('The statement has no data rows under its header.');
  if(rows.length>CC_BULK_MAX_ROWS)throw new Error('The statement has '+rows.length+' rows; import at most '+CC_BULK_MAX_ROWS+' per file (split it by period or card).');
  return {kind:'card statement',fileName:meta.fileName,format:meta.format,fileHash:meta.fileHash||'',rows:rows,
    unknown:extra.filter(function(x){return !CCS_SENSITIVE.test(x);}),sensitive:extra.filter(function(x){return CCS_SENSITIVE.test(x);}),masked:ccUniq(masked),
    hash:ccHashText('card statement|'+JSON.stringify(rows.map(function(x){return CCS_COLS.map(function(c){return norm(x.data[c[0]]);});})))};
}
function ccStmtRead(name,buf){
  const ext=String(name||'').split('.').pop().toLowerCase();
  if(['csv','xlsx'].indexOf(ext)<0)return Promise.reject(new Error('Upload a .csv or .xlsx statement (the template\'s formats).'));
  const u8=new Uint8Array(buf);
  const fh=(typeof crypto!=='undefined'&&crypto.subtle&&typeof crypto.subtle.digest==='function'
    ?crypto.subtle.digest('SHA-256',u8).then(function(d){return 'SHA-256 '+Array.from(new Uint8Array(d)).map(function(b){return ('0'+b.toString(16)).slice(-2);}).join('');})
    :Promise.reject(new Error('no digest'))).catch(function(){return 'FNV-1a '+ccHashBytes(u8);});
  const g=ext==='csv'?Promise.resolve(ccCsvGrid(new TextDecoder().decode(u8))):ccXlsxGrid(u8);
  return Promise.all([g,fh]).then(function(x){return ccStmtGrid(x[0],{fileName:name,format:ext.toUpperCase(),fileHash:x[1]});});
}
/* The documented standard template (FR-CT-05.02): columns, notes and allowed values; no card list. */
function ccStmtTemplate(format){
  const head=CCS_COLS.map(function(c){return c[1];});
  if(format==='csv'){wbCSV('card-statement-template',head,[]);return 'card-statement-template.csv';}
  const progs=ccProgs();
  const ref={name:'Programmes',title:'Card programmes and wallets',meta:['Valid in '+idEntityName(ccEnt())+' when the template was downloaded.'],
    columns:[{label:'Card Programme',w:16},{label:'Programme',w:30},{label:'Wallets',w:34},{label:'Card Currency',w:14}],
    rows:progs.map(function(p){return [p.code,p.name,ccWalletMap(p).map(function(w){return w.code+' ('+w.name+')';}).join(', '),p.currency];})};
  const vals={name:'Values',title:'Allowed values',meta:['Columns marked required must be present; the header row is found by its labels.'],columns:[{label:'Column',w:22},{label:'Allowed values',w:70}],
    rows:[['Transaction Type',CCS_TYPES.join(', ')],['Transaction Status',CCS_STATUS.join(', ')],['Channel',CCT_CHANNELS.join(', ')],
      ['Timezone','A standard identifier, e.g. '+(entTimezone()||'Asia/Kolkata')+'; blank = the entity timezone (Company Settings)'],['Dates','YYYY-MM-DD or DD-MM-YYYY'],['Transaction Time','HH:MM (24-hour); blank if not reported'],
      ['Required columns',CCS_COLS.filter(function(c){return c[2];}).map(function(c){return c[1];}).join(', ')]]};
  const sheet={name:'Card Statement',title:'Card statement template · '+idEntityName(ccEnt()),meta:CCS_NOTES,
    columns:CCS_COLS.map(function(c){return {label:c[1],w:c[0]==='merchant'||c[0]==='description'?28:15};}),rows:[]};
  const name='card-statement-template-'+wbToday()+'.xlsx';tsxSave(tsxWorkbook([sheet,ref,vals]),name);return name;
}

/* ── Card mapping (Addendum G2) ── */
function ccStmtCards(s){return ccCards.filter(function(c){return c.entity===s.entity&&c.programmeId===s.programmeId&&c.last4;});}
function ccStmtCandidates(s,d){
  const ref=String(d.card||'').trim(),l4=String(d.last4||'').replace(/\D/g,''),emp=String(d.empId||'').trim().toLowerCase();
  if(ref&&/^CRD-?\d+$/i.test(ref)){const c=ccCardByRef(ref,s.entity);return {how:'ADT Card Reference',list:c?[c]:[],ref:true};}
  /* B8-N12: a provider card ID maps a row only when it is confirmed on the card, for the statement's provider, entity and programme. */
  if(ref&&ref.indexOf('•')<0){const t=ccCards.filter(function(c){const v=typeof ccCardExtIdOf==='function'?ccCardExtIdOf(c):'';return c.entity===s.entity&&c.provider===s.provider&&c.programmeId===s.programmeId&&!!v&&v.toLowerCase()===ref.toLowerCase();});
    if(t.length)return {how:'Provider Card ID',list:t,ref:true};}
  const byL4=ccStmtCards(s).filter(function(c){return l4.length===4&&c.last4===l4;});
  if(!emp)return {how:'',list:[],noEmp:true,suggest:byL4};
  return {how:'Employee ID + Programme + Last Four',list:byL4.filter(function(c){return String((idEmp(c.employeeEid)||{}).empId||'').toLowerCase()===emp;}),suggest:byL4};
}
/* Cards a reviewer may choose in Card Mapping Review: the statement's programme and the row's last four. */
function ccStmtMapCands(s,row){const l4=String(row.data.last4||'').replace(/\D/g,'');return l4.length===4?ccStmtCards(s).filter(function(c){return c.last4===l4&&(s.scope!=='Card'||c.id===s.cardId);}):[];}

/* ── One row: mapping, then the 8A transaction checks (FR-CT-05.06) ── */
function ccStmtRowCheck(s,row){
  const d=row.data,errs=[],warn=[],out={errors:errs,warnings:warn,issue:null,cardId:null,how:''},p=ccProg(s.programmeId);
  if(!String(d.programme||'').trim())errs.push('Card Programme is empty.');
  else if(ccProgByRef(d.programme,s.entity)!==p)errs.push('The row is for programme '+d.programme+'; this statement is for '+(p?p.code:'another programme')+'.');
  const l4=String(d.last4||'').trim(),l4d=l4.replace(/\D/g,'');if(l4&&l4d.length!==4)errs.push('Last Four must be four digits (masked references only).');
  const lf=ccStmtLife(d);
  if(!lf.type)errs.push('Transaction Type must be '+CCS_TYPES.join(', ')+'.');
  if(!lf.status)errs.push('Transaction Status must be '+CCS_STATUS.join(', ')+'.');
  if(lf.credit&&lf.status&&lf.status!=='Posted')errs.push('A '+lf.type.toLowerCase()+' is reported as Posted.');
  if(lf.credit&&!String(d.origRef||'').trim())errs.push('A '+lf.type.toLowerCase()+' needs the Original Reference of the transaction it reverses.');
  let c=null;
  if(row.map){c=ccCard(row.map.cardId);if(!c||c.entity!==s.entity||c.programmeId!==s.programmeId||(l4d&&c.last4!==l4d)){row.map=null;c=null;}else out.how='Card Mapping Review';}
  if(!c){
    const k=ccStmtCandidates(s,d);
    if(k.ref&&!k.list.length)errs.push('No ADT card '+d.card+' in this entity.');
    else if(k.list.length===1){c=k.list[0];out.how=k.how;}
    else if(k.list.length>1)out.issue={kind:'mapping',text:k.list.length+' cards match the '+k.how+' — ambiguous. Card Mapping Review decides; ADT never picks one.',cands:k.list.map(function(x){return x.id;})};
    else if(!l4d)errs.push('Last Four is empty: the card cannot be identified (and never from the last four alone).');
    else if(k.noEmp)out.issue={kind:'mapping',text:((k.suggest||[]).length>1?k.suggest.length+' cards of '+(p?p.code:'the programme')+' end '+l4d+' (ambiguous) and the statement gives no Employee ID':'The statement gives no Employee ID')+': Card Mapping Review decides the card, never the last four digits alone.',cands:(k.suggest||[]).map(function(x){return x.id;})};
    else out.issue={kind:'mapping',text:'No card of '+(p?p.code:'the programme')+' matches Employee ID '+d.empId+' with last four '+l4d+'. Card Mapping Review decides, or correct the row.',cands:(k.suggest||[]).map(function(x){return x.id;})};
  }
  if(c){
    const e=idEmp(c.employeeEid)||{};
    if(c.programmeId!==s.programmeId)errs.push(expKey(c)+' belongs to '+((ccProg(c.programmeId)||{}).code||'another programme')+', not to this statement\'s programme.');
    if(l4d&&c.last4!==l4d)errs.push(expKey(c)+' ends '+c.last4+', not '+l4d+'.');
    if(String(d.empId||'').trim()&&String(e.empId||'').toLowerCase()!==String(d.empId).trim().toLowerCase())errs.push(expKey(c)+' is held by '+(e.name||'another employee')+' ('+(e.empId||'')+'), not '+d.empId+'.');
    if(s.scope==='Card'&&c.id!==s.cardId)errs.push('This is a single-card statement for '+expKey(ccCard(s.cardId))+'; the row is for '+expKey(c)+'.');
  }
  out.cardId=c?c.id:null;
  if(!c||!p||!lf.type||!lf.status)return out;
  const w=ccWalletByRef(p,d.wallet);
  if(!String(d.wallet||'').trim())errs.push('Wallet is empty.');else if(!w)errs.push(d.wallet+' is not a wallet of '+p.code+'.');
  const date=ccStmtDate(d.date),post=ccStmtDate(d.postDate),time=ccStmtTime(d.time);
  if(date===null)errs.push('Transaction Date "'+d.date+'" is not a date (YYYY-MM-DD or DD-MM-YYYY).');
  if(post===null)errs.push('Posting Date "'+d.postDate+'" is not a date.');
  if(time===null)errs.push('Transaction Time "'+d.time+'" is not a time (HH:MM).');
  const tz=String(d.tz||'').trim();if(tz&&!ccTzValid(tz))errs.push('Timezone '+tz+' is not a standard timezone (for example Asia/Kolkata).');
  const ch=String(d.channel||'').trim(),chan=ch?ccPickCI(CCT_CHANNELS,ch):'';if(ch&&!chan)errs.push('Channel must be '+CCT_CHANNELS.join(', ')+'.');
  if(lf.status==='Pending'&&post)errs.push('A pending authorization has no posting date yet.');
  const bc=String(d.billCurrency||'').trim().toUpperCase();if(bc&&bc!==c.currency)errs.push('The card is billed in '+c.currency+'; billing currency '+bc+' is not its currency.');
  if(!w||errs.length)return out;
  const abs=function(v){v=String(v==null?'':v).trim();return lf.credit?v.replace(/^-/,''):v;};
  const dd={cardId:c.id,wallet:w.code,type:lf.chkType,date:date,time:time||'',tz:tz,postDate:lf.status==='Posted'?post:'',merchant:d.merchant,mcc:d.mcc,country:d.country,channel:chan,
    amount:abs(d.amount),currency:String(d.currency||'').trim().toUpperCase(),billAmount:abs(d.billAmount),rate:d.rate};
  const chk=ccTxnCheck(dd,{demo:s.demo});
  chk.errors.forEach(function(x){
    if(/issued or activated only as Illustrative/.test(x))errs.push(expKey(c)+' was issued or activated only as '+CC_DEMO+' (or is not yet evidenced): a genuine statement row cannot be recorded on it. Illustrative activity is imported only as an '+CC_DEMO+' statement.');
    else if(/not an illustrative card/.test(x))errs.push('This is an illustrative statement and '+expKey(c)+' is a genuine card: illustrative activity is never mixed with genuine card activity.');
    else errs.push(x);
  });
  if(errs.length)return out;
  const el=ccCardEligibility(c,date,ccTxnEntityLocal(dd,chk.tz,c.entity));
  out.parsed={cardId:c.id,wallet:w.code,walletClass:ccTxnWalletClass(w.code),lf:lf,date:date,time:time||'',tz:time?chk.tz:'',postDate:dd.postDate,merchant:chk.merchant,
    mcc:String(d.mcc||''),country:String(d.country||'').toUpperCase(),channel:chan,amount:chk.amount,currency:chk.currency,billAmount:chk.billAmount,billCurrency:chk.billCurrency,rate:chk.rate,
    ref:String(d.ref||'').trim(),authCode:String(d.authCode||'').trim(),origRef:String(d.origRef||'').trim(),description:String(d.description||'').trim(),elig:el};
  /* B8-N09 C: the posting date places a posted row in the statement period; the transaction date (on the entity's
     clock) places a row that was never posted. The provider's own date, time and timezone are kept. */
  {const ld=typeof ccStmtLocalDate==='function'?ccStmtLocalDate(dd,chk.tz,c.entity):date,inP=function(x){return x>=s.periodFrom&&x<=s.periodTo;};
    out.parsed.localDate=ld;
    const prov=ld!==date?' (provider date '+cdLabel(date)+(time?' '+time:'')+(tz?' '+tz:'')+')':'';
    if(lf.status==='Posted'){
      if(!inP(dd.postDate))out.period='Posting date '+cdLabel(dd.postDate)+' is outside the statement period '+ccStmtPeriodText(s)+' (transaction date '+cdLabel(ld)+prov+'). It is not counted in the period totals: correct the statement period, exclude the row with a reason, or document a provider-period exception.';
      else if(!inP(ld))warn.push('Transaction date '+cdLabel(ld)+prov+' is before the statement period; it was posted on '+cdLabel(dd.postDate)+', within the period, so the row is processed on its posting date.');
    }else if(!inP(ld))out.period=lf.life+' row dated '+cdLabel(ld)+prov+' is outside the statement period '+ccStmtPeriodText(s)+' and has no posting date within it: correct the statement period, exclude the row with a reason, or document a provider-period exception.';}
  if(!el.ok)warn.push('Eligibility exception: '+el.text);
  if(!out.parsed.ref)warn.push('No transaction reference: duplicates are checked on card, merchant, date, amount and currency.');
  return out;
}
function ccStmtPeriodText(s){return cdLabel(s.periodFrom)+' – '+cdLabel(s.periodTo);}
function ccStmtProgress(t,life){if(t.status===life)return '';if(t.status==='Pending Authorization'&&['Posted','Declined','Voided'].indexOf(life)>=0)return life;return null;}
/* The row against an existing transaction with the same reference (FR-CT-06.06-07; B8-N05 B). */
function ccStmtCompare(s,row,t,viaNear){
  const P=row.parsed,res=row.res,diffs=[],add=function(f,a,b){diffs.push({field:f,adt:a,stmt:b});};
  if(t.verify&&t.verify.status===CCT_REJECTED){
    if(res&&res.kind==='link-rejected'&&res.txnId===t.id)return {status:'Linked',txnId:t.id,rejected:true};
    return {status:'Review Required',issue:{kind:'rejected',txnId:t.id,text:'Same reference as '+expKey(t)+', whose verification was rejected. Rejection does not change the transaction\'s identity: link this row to '+expKey(t)+' as statement evidence (it stays Rejected until it is corrected and resubmitted), or exclude the row.'}};
  }
  if(!!t.demo!==!!s.demo)add('Source',t.demo?CC_DEMO:'Genuine',s.demo?CC_DEMO:'Genuine');
  if(t.cardId!==P.cardId)add('Card',t.cardRef.key,expKey(ccCard(P.cardId)));
  if((t.direction||'Debit')!==(P.lf.credit?'Credit':'Debit'))add('Direction',t.direction||'Debit',P.lf.credit?'Credit':'Debit');
  if(t.wallet!==P.wallet)add('Wallet',wbTypeName(t.wallet),wbTypeName(P.wallet));
  if(t.amount!==P.amount||t.currency!==P.currency)add('Amount',expMoney(t.amount,t.currency),expMoney(P.amount,P.currency));
  else if(t.billAmount!==P.billAmount)add('Billing Amount',expMoney(t.billAmount,t.billCurrency),expMoney(P.billAmount,P.billCurrency));
  if(t.date!==P.date)add('Transaction Date',cdLabel(t.date),cdLabel(P.date));
  const prog=ccStmtProgress(t,P.lf.life);if(prog===null)add('Status',t.status,P.lf.life);
  if(viaNear&&String(t.extRef||'').toLowerCase()!==P.ref.toLowerCase())add('Reference',t.extRef||'—',P.ref||'—');
  const hard=diffs.filter(function(x){return x.field!=='Reference';});
  if(!hard.length)return {status:'Linked',txnId:t.id,progress:prog||'',refDiff:diffs.length?diffs:null};
  if(res&&res.kind==='discrepancy'&&res.txnId===t.id&&!ccStmtHardDiff(diffs))return {status:'Linked',txnId:t.id,discrepancy:diffs,progress:''};
  return {status:'Review Required',issue:{kind:'conflict',txnId:t.id,diffs:diffs,text:'Conflicts with '+expKey(t)+' ('+ccTxnVerifyLabel(t)+'): '+diffs.map(function(x){return x.field+' '+x.adt+' in ADT, '+x.stmt+' on the statement';}).join('; ')
    +'. ADT never overwrites a recorded transaction: Finance records the discrepancy and links the row, corrects the row, or excludes it.'}};
}
function ccStmtHardDiff(diffs){return diffs.some(function(x){return ['Source','Card','Direction'].indexOf(x.field)>=0;});}
/* A row of another statement not yet verified (an overlapping period, FR-CT-05.12). */
function ccStmtOtherRow(s,pred){
  for(let i=0;i<ccStmts.length;i++){const o=ccStmts[i];if(o===s||o.entity!==s.entity||o.importStatus==='Discarded')continue;
    const r=o.rows.find(function(x){return !x.result&&['New','Linked','Review Required'].indexOf(x.status)>=0&&x.parsed&&pred(x);});if(r)return {s:o,r:r};}
  return null;
}
function ccStmtMatch(s,row,seenRef,seenNear){
  const P=row.parsed,ref=P.ref.toLowerCase(),dir=P.lf.credit?'Credit':'Debit',res=row.res;
  const nk=[P.cardId,dir,String(P.merchant).toLowerCase(),P.date,P.amount,P.currency].join('|'),prevNear=seenNear[nk];
  if(prevNear==null)seenNear[nk]={n:row.n,ref:ref};
  if(ref){
    if(seenRef[ref]!=null)return {status:'Duplicate',text:'Same transaction reference as row '+seenRef[ref]+' in this file: it is imported once.'};
    seenRef[ref]=row.n;
    const t=ccTxns.find(function(x){return x.entity===s.entity&&x.provider===s.provider&&String(x.extRef||'').trim().toLowerCase()===ref;});
    if(t){
      if((t.stmtLinks||[]).length){const L=t.stmtLinks[0];return {status:'Duplicate',txnId:t.id,text:'Already imported as '+expKey(t)+' ('+L.key+' row '+L.row+'). Nothing new is created.'};}
      return ccStmtCompare(s,row,t,false);
    }
    const o=ccStmtOtherRow(s,function(x){return x.parsed.ref.toLowerCase()===ref;});
    if(o)return {status:'Duplicate',text:'Same reference as '+expKey(o.s)+' row '+o.r.n+' ('+o.s.importStatus+'): it is imported once.'};
  }
  /* Composite candidate key (FR-CT-06.03-04): a similar existing transaction is reviewed, never deleted. */
  const near=ccTxns.find(function(t){return t.entity===s.entity&&t.cardId===P.cardId&&(t.direction||'Debit')===dir&&t.amount===P.amount&&t.currency===P.currency&&t.date===P.date
    &&String(t.merchant||'').trim().toLowerCase()===String(P.merchant).toLowerCase()&&(t.verify||{}).status!==CCT_REJECTED&&['Declined','Voided'].indexOf(t.status)<0&&(!ref||!(t.stmtLinks||[]).length);});
  if(near){
    if(res&&res.kind==='link'&&res.txnId===near.id)return ccStmtCompare(s,row,near,true);
    if(res&&res.kind==='separate')return {status:'New',sep:res};
    return {status:'Review Required',issue:{kind:'near',txnId:near.id,text:'Possible duplicate of '+expKey(near)+' (same card, merchant, date, amount and currency'+(near.extRef?'; its reference is '+near.extRef:'')+'). Link the row to it, or confirm it is a separate transaction.'}};
  }
  if(prevNear!=null&&(!ref||!prevNear.ref)){
    if(res&&res.kind==='separate')return {status:'New',sep:res};
    return {status:'Review Required',issue:{kind:'nearRow',row:prevNear.n,text:'Same card, merchant, date, amount and currency as row '+prevNear.n+', without distinct references. Confirm a separate transaction, or exclude the row.'}};
  }
  return {status:'New'};
}
/* A refund or reversal links to its original (FR-CT-06.09): in ADT on the same card, or earlier in this file. */
function ccStmtOriginal(s,row){
  const P=row.parsed,o=P.origRef.toLowerCase();
  const t=ccTxns.find(function(x){return x.entity===s.entity&&x.cardId===P.cardId&&(x.direction||'Debit')==='Debit'&&String(x.extRef||'').trim().toLowerCase()===o&&(x.verify||{}).status!==CCT_REJECTED;});
  if(t)return {txnId:t.id,key:expKey(t),amt:t.billAmount};
  const r=s.rows.find(function(x){return x.n<row.n&&x.parsed&&x.parsed.cardId===P.cardId&&!x.parsed.lf.credit&&x.parsed.ref.toLowerCase()===o&&['New','Linked'].indexOf(x.status)>=0;});
  return r?{row:r.n,key:'row '+r.n,amt:r.parsed.billAmount}:null;
}
function ccStmtValidate(s){
  const seenRef={},seenNear={};
  s.rows.forEach(function(row){
    if(row.result)return;
    row.errors=[];row.warnings=[];row.issue=null;row.parsed=null;row.cardId=null;row.match=null;row.how='';row.dupText='';
    if(row.excluded){row.status='Excluded';return;}
    const v=ccStmtRowCheck(s,row);
    row.errors=v.errors;row.warnings=v.warnings;row.cardId=v.cardId;row.how=v.how||'';row.parsed=v.parsed||null;
    if(row.errors.length){row.status='Invalid';return;}
    if(v.issue){row.issue=v.issue;row.status='Review Required';return;}
    const P=row.parsed;
    /* B8-N09 C: outside the period by its posting date: reviewed, never silently counted in the period. */
    if(v.period){if(row.pex)P.periodException=row.pex;else{row.issue={kind:'period',text:v.period};row.status='Review Required';return;}}
    if(P.lf.credit){
      if(row.ores){P.orig=null;P.unlinked=row.ores;}
      else{
        const o=ccStmtOriginal(s,row);
        /* B8-N09 D: an original that cannot be identified reliably holds the credit for review; never another card's or an unrelated purchase. */
        if(!o){const other=ccTxns.find(function(x){return x.entity===s.entity&&x.cardId!==P.cardId&&String(x.extRef||'').trim().toLowerCase()===P.origRef.toLowerCase();});
          row.issue={kind:'refund',text:'Original Reference '+P.origRef+' is not '+(other?'a transaction of this card: it is '+expKey(other)+' on '+other.cardRef.key+', and a '+P.lf.type.toLowerCase()+' is never linked to another card\'s purchase':'a debit transaction on '+expKey(ccCard(P.cardId))+' in ADT or earlier in this file')
            +'. The '+P.lf.type.toLowerCase()+' is held for review: correct the Original Reference, exclude the row with a reason, or record it without an original for Finance refund review.'};row.status='Review Required';return;}
        if(P.billAmount>o.amt+0.001){row.errors.push('The '+P.lf.type.toLowerCase()+' of '+expMoney(P.billAmount,P.billCurrency)+' is more than its original ('+o.key+', '+expMoney(o.amt,P.billCurrency)+').');row.status='Invalid';return;}
        const prior=typeof ccStmtRefundsOf==='function'?ccStmtRefundsOf(s,row,o):0;
        if(ccM(prior+P.billAmount)>o.amt+0.001){row.issue={kind:'refundDup',text:'Refunds and reversals of '+o.key+' would total '+expMoney(ccM(prior+P.billAmount),P.billCurrency)+', more than the original '+expMoney(o.amt,P.billCurrency)+' ('+expMoney(prior,P.billCurrency)+' already refunded or earlier in this file): possibly a duplicate refund. Correct the row or exclude it.'};row.status='Review Required';return;}
        P.orig=o;
      }
    }
    const m=ccStmtMatch(s,row,seenRef,seenNear);
    row.match=m;row.status=m.status;if(m.issue)row.issue=m.issue;if(m.status==='Duplicate')row.dupText=m.text||'';
  });
}
function ccStmtSum(s){
  const o={rows:s.rows.length,new:0,linked:0,duplicate:0,review:0,mapping:0,invalid:0,excluded:0,created:0,debit:0,credit:0,outside:0,outsideAmt:0};
  s.rows.forEach(function(r){
    if(r.status==='New')o.new++;else if(r.status==='Linked')o.linked++;else if(r.status==='Duplicate')o.duplicate++;else if(r.status==='Review Required'){o.review++;if(r.issue&&r.issue.kind==='mapping')o.mapping++;}
    else if(r.status==='Invalid')o.invalid++;else if(r.status==='Excluded')o.excluded++;
    if(r.result&&r.result.status==='Created')o.created++;
    if(['New','Linked'].indexOf(r.status)>=0&&r.parsed&&r.parsed.lf.life==='Posted'){if(r.parsed.periodException){o.outside++;o.outsideAmt+=(r.parsed.lf.credit?-1:1)*r.parsed.billAmount;}else if(r.parsed.lf.credit)o.credit+=r.parsed.billAmount;else o.debit+=r.parsed.billAmount;}
  });
  o.debit=ccM(o.debit);o.credit=ccM(o.credit);o.outsideAmt=ccM(o.outsideAmt);o.open=o.review+o.invalid;return o;
}
function ccStmtStage(s,to,A,note){s.stages=s.stages||[];s.stages.push({to:to,at:ccStamp(A),by:A.who,actual:caVia(A),note:note||''});s.importStatus=to;s.status=to;}
/* Validate again; a statement still being prepared moves between Review Required and Validation Completed. */
function ccStmtRefresh(s,A,note){
  ccStmtValidate(s);
  if(CCS_OPEN.indexOf(s.importStatus)>=0){const to=ccStmtSum(s).open?'Review Required':'Validation Completed';if(s.importStatus!==to)ccStmtStage(s,to,A,note||'');}
}
function ccStmtRowNew(r){return {n:r.n,orig:Object.assign({},r.data),data:Object.assign({},r.data),edits:[],status:'',errors:[],warnings:[],issue:null,map:null,res:null,excluded:null,result:null,cardId:null,parsed:null,match:null,pex:null,ores:null};}
function ccStmtSnapshot(parsed,A){return {file:parsed.fileName,format:parsed.format,rows:parsed.rows.length,hash:parsed.hash,fileHash:parsed.fileHash||'',at:ccStamp(A),by:A.who,actual:caVia(A),
  unknown:(parsed.unknown||[]).slice(),sensitive:(parsed.sensitive||[]).slice(),masked:(parsed.masked||[]).slice(),snapshot:parsed.rows.map(function(r){return {n:r.n,data:Object.assign({},r.data)};})};}

/* ── Upload (FR-CT-05.03-05, 05.10-11, 05.14) ── */
function ccStmtFormCheck(d,A){
  A=A||ccNow();d=d||{};
  if(!ccPCan(A,'card.transaction.import'))return caN(A.who)+' cannot import card statements (card.transaction.import).';
  if(typeof mcOn==='function'&&!mcOn('cards'))return 'Corporate Cards is switched off for this entity: statements are kept, nothing new is imported.';
  const p=ccProg(d.programmeId);if(!p||!ccProgs().some(function(x){return x.id===p.id;}))return 'Pick the card programme of the statement.';
  if(d.scope==='Card'){const c=ccCard(d.cardId);if(!c||c.entity!==ccEnt()||c.programmeId!==p.id)return 'Pick the card of this single-card statement (a card of '+p.code+').';}
  const f=ccStmtDate(d.periodFrom),t=ccStmtDate(d.periodTo);
  if(!f||!t)return 'Enter the statement period (from and to).';if(f>t)return 'The statement period ends before it starts.';if(t>wbToday())return 'The statement period cannot end in the future.';
  if(String(d.sourceRef||'').trim().length<3)return 'Enter the provider\'s statement reference (as printed on the statement).';
  if(d.demo){if(!ccDemoOn())return 'Presentation mode is off for '+idEntityName(ccEnt())+': an illustrative statement is not available.';if(!ccPCan(A,'card.demo.simulate'))return caN(A.who)+' cannot record illustrative card activity (card.demo.simulate).';}
  const bad=['opening','closing'].filter(function(k){const v=String(d[k]==null?'':d[k]).replace(/,/g,'').trim();return v&&!isFinite(Number(v));});
  if(bad.length)return 'A statement-reported balance is a number as printed on the statement, or blank.';
  return '';
}
function ccStmtCreate(parsed,d,A){
  A=A||ccNow();d=d||{};
  const why=ccStmtFormCheck(d,A);if(why)return {error:why};
  if(!parsed||parsed.kind!=='card statement'||!parsed.rows||!parsed.rows.length)return {error:'Upload a card statement file with data rows first.'};
  const dup=ccStmts.find(function(s){return s.entity===ccEnt()&&s.hash===parsed.hash&&s.importStatus!=='Discarded';});
  if(dup)return {error:'The same statement rows were already imported as '+expKey(dup)+' ('+dup.importStatus+'). A statement is imported once: open '+expKey(dup)+' instead. Nothing new was created.',dupOf:dup.id};
  const p=ccProg(d.programmeId),num=function(v){v=String(v==null?'':v).replace(/,/g,'').trim();return v?ccM(Number(v)):null;};
  const s={id:ccStmtNextId++,key:ccStmtNextKey++,prefix:'STM',kind:'card statement',entity:ccEnt(),programmeId:p.id,scope:d.scope==='Card'?'Card':'Programme',cardId:d.scope==='Card'?Number(d.cardId):null,
    provider:p.provider||'',currency:p.currency,periodFrom:ccStmtDate(d.periodFrom),periodTo:ccStmtDate(d.periodTo),sourceRef:String(d.sourceRef).trim(),demo:!!d.demo,
    balances:{opening:num(d.opening),closing:num(d.closing)},comments:String(d.comments||'').trim(),
    fileName:String(parsed.fileName||'statement').slice(0,120),format:parsed.format,hash:parsed.hash,fileHash:parsed.fileHash||'',unknownCols:(parsed.unknown||[]).slice(),sensitiveCols:(parsed.sensitive||[]).slice(),maskedRows:(parsed.masked||[]).slice(),
    uploads:[ccStmtSnapshot(parsed,A)],rows:parsed.rows.map(ccStmtRowNew),importStatus:'',status:'',stages:[],verify:{status:'Not Submitted'},rounds:0,reconStatus:'Not Started',assignException:'',
    createdBy:A.who,actualBy:caVia(A),createdAt:ccStamp(A),name:'Card statement',title:'Card statement '+String(d.sourceRef).trim(),logs:[]};
  ccStmtStage(s,'Uploaded',A,s.fileName);
  ccLog(s,'Uploaded','Statement '+s.sourceRef+' ('+ccStmtPeriodText(s)+', '+(s.scope==='Card'?'single card '+ccCardLabel(ccCard(s.cardId)):'programme '+p.code)+') uploaded by '+caN(A.who)+': '+s.fileName+' ('+s.format+', '+s.rows.length+' rows, '+s.fileHash+').'
    +(s.demo?' '+CC_DEMO+' statement: its rows can only become illustrative transactions on illustrative cards.':'')
    +(s.sensitiveCols.length?' Columns '+s.sensitiveCols.join(', ')+' were ignored and not stored: ADT never keeps full card numbers, CVV, PIN or expiry.':'')
    +(s.maskedRows.length?' Full card numbers on row(s) '+s.maskedRows.join(', ')+' were masked to the last four digits; the full number was not stored.':'')
    +(s.unknownCols.length?' Columns not in the template were ignored: '+s.unknownCols.join(', ')+'.':''),A);
  ccStmtStage(s,'Validation Pending',A,'Rows checked against the card, employee, programme and wallet records');
  ccStmtValidate(s);const m=ccStmtSum(s);
  ccStmtStage(s,m.open?'Review Required':'Validation Completed',A,'');
  ccLog(s,s.importStatus,'Validated: '+m.new+' new, '+m.linked+' matching existing transactions, '+m.duplicate+' duplicate(s), '+m.review+' for review'+(m.mapping?' ('+m.mapping+' in Card Mapping Review)':'')+', '+m.invalid+' invalid.',A);
  ccStmts.unshift(s);
  return {rec:s};
}
function ccStmtMayEdit(s,A){
  if(!ccPCan(A,'card.transaction.import'))return caN(A.who)+' cannot change card statements (card.transaction.import).';
  if(CCS_OPEN.indexOf(s.importStatus)<0)return expKey(s)+' is '+s.importStatus+'; rows are changed only while the statement is being prepared.';
  return '';
}
function ccStmtGet(id){const s=ccStmt(id);return s&&s.entity===ccEnt()?s:null;}
/* Row correction with before and after (FR-CT-05.09); the statement's own values stay in row.orig. */
function ccStmtRowEdit(id,n,data,A){
  A=A||ccNow();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;
  const row=s.rows.find(function(r){return r.n===Number(n);});if(!row)return 'No such row.';
  data=data||{};
  if(['card','last4','merchant','description','empId'].some(function(k){return data[k]!=null&&ccPanMask(data[k]);}))return 'A full card number is never entered or stored: use the last four digits only.';
  const ch=CCS_COLS.map(function(c){return c[0];}).filter(function(k){return data[k]!=null&&String(data[k]).trim()!==row.data[k];});
  if(!ch.length)return 'Nothing changed.';
  const before={},after={};ch.forEach(function(k){before[k]=row.data[k];row.data[k]=String(data[k]).trim();after[k]=row.data[k];});
  if(ch.some(function(k){return ['empId','programme','card','last4'].indexOf(k)>=0;}))row.map=null;
  row.res=null;row.pex=null;row.ores=null;row.edits.push({at:ccStamp(A),by:A.who,actual:caVia(A),before:before,after:after});
  ccStmtRefresh(s,A,'Row '+row.n+' corrected');
  const lab=function(k){return CCS_COLS.find(function(c){return c[0]===k;})[1];};
  ccLog(s,s.importStatus,'Row '+row.n+' corrected by '+caN(A.who)+': '+ch.map(function(k){return lab(k)+' "'+before[k]+'" → "'+after[k]+'"';}).join('; ')+'. The statement\'s original value is kept. Now '+row.status+'.',A);
  return '';
}
function ccStmtRowExclude(id,n,on,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;
  const row=s.rows.find(function(r){return r.n===Number(n);});if(!row)return 'No such row.';
  if(on&&reason.length<5)return 'Say why the row is excluded; it stays with the statement.';
  if(!!row.excluded===!!on)return 'Nothing changed.';
  row.excluded=on?{reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)}:null;
  ccStmtRefresh(s,A,'Row '+row.n+(on?' excluded':' included'));
  ccLog(s,s.importStatus,'Row '+row.n+' '+(on?'excluded by '+caN(A.who)+': '+reason+'. It creates nothing and stays on record':'included again by '+caN(A.who)+' (now '+row.status+')')+'.',A);
  return '';
}
/* Card Mapping Review (Addendum G2 rules 3-5, 8): an authorized person decides, with a reason, among the
   cards that agree with the statement values; never at random, never on the last four alone. */
function ccStmtRowMap(id,n,cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;
  const row=s.rows.find(function(r){return r.n===Number(n);});if(!row)return 'No such row.';
  if(!(row.issue&&row.issue.kind==='mapping')&&!row.map)return 'Row '+row.n+' is not in Card Mapping Review.';
  const c=ccStmtMapCands(s,row).find(function(x){return x.id===Number(cardId);});
  if(!c)return 'Pick one of the cards of this programme ending '+(String(row.data.last4||'').replace(/\D/g,'')||'----')+' (the card must agree with the statement values).';
  const e=idEmp(c.employeeEid)||{};
  if(String(row.data.empId||'').trim()&&String(e.empId||'').toLowerCase()!==String(row.data.empId).trim().toLowerCase())return 'The statement names Employee ID '+row.data.empId+'; '+expKey(c)+' is held by '+(e.name||'another employee')+' ('+(e.empId||'')+'). Correct the row if the statement value is wrong.';
  if(reason.length<5)return 'Say how the card was identified (for example the provider\'s cardholder confirmation).';
  row.map={cardId:c.id,by:A.who,actual:caVia(A),at:ccStamp(A),reason:reason};row.res=null;
  ccStmtRefresh(s,A,'Row '+row.n+' mapped');
  ccLog(s,s.importStatus,'Card Mapping Review: row '+row.n+' mapped to '+ccCardLabel(c)+' ('+(e.name||'')+') by '+caN(A.who)+': '+reason+'. The statement\'s own values are kept unchanged. Now '+row.status+'.',A);
  return '';
}
/* Decisions on a possible duplicate, a conflict or a rejected record's reference. */
function ccStmtRowResolve(id,n,kind,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;
  const row=s.rows.find(function(r){return r.n===Number(n);});if(!row)return 'No such row.';
  const is=row.issue;if(!is||is.kind==='mapping')return 'Row '+row.n+' has no '+(is?'decision of this kind (use Card Mapping Review)':'open decision')+'.';
  if(reason.length<(kind==='separate'?10:5))return kind==='separate'?'Say why it is a separate transaction (at least 10 characters).':'Give the reason for the decision.';
  /* B8-N09 C and D: a documented provider-period exception; a credit recorded without an identifiable original. */
  if(kind==='period-exception'||kind==='refund-unlinked'){
    if(kind==='period-exception'&&is.kind!=='period')return 'A provider-period exception applies to a row outside the statement period.';
    if(kind==='refund-unlinked'&&is.kind!=='refund')return 'This applies to a refund or reversal whose original transaction cannot be identified.';
    if(reason.length<10)return 'Document the reason (at least 10 characters); it stays with the row.';
    const x={kind:kind,reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)};if(kind==='period-exception')row.pex=x;else row.ores=x;
    ccStmtRefresh(s,A,'Row '+row.n+' decided');
    ccLog(s,s.importStatus,'Row '+row.n+' '+(kind==='period-exception'?'documented as a provider-period exception by '+caN(A.who)+': '+reason+'. It is processed but kept out of the period totals'
      :'recorded without an original transaction by '+caN(A.who)+': '+reason+'. It is linked to no purchase and held for Finance refund review')+'. Now '+row.status+'.',A);
    return '';
  }
  let res=null;
  if(kind==='link'){if(is.kind!=='near')return 'Link applies to a possible duplicate.';res={kind:'link',txnId:is.txnId};}
  else if(kind==='separate'){if(['near','nearRow'].indexOf(is.kind)<0)return 'Separate applies to a possible duplicate.';res={kind:'separate',ofKey:is.kind==='near'?expKey(ccTxn(is.txnId)):'row '+is.row};}
  else if(kind==='discrepancy'){if(is.kind!=='conflict')return 'A discrepancy is recorded for a conflicting row.';
    if(ccStmtHardDiff(is.diffs||[]))return 'A different card, direction or source is not the same transaction: correct the row or exclude it.';res={kind:'discrepancy',txnId:is.txnId};}
  else if(kind==='link-rejected'){if(is.kind!=='rejected')return 'This applies to a row with the reference of a rejected record.';res={kind:'link-rejected',txnId:is.txnId};}
  else return 'Unknown decision.';
  res.reason=reason;res.by=A.who;res.actual=caVia(A);res.at=ccStamp(A);row.res=res;
  ccStmtRefresh(s,A,'Row '+row.n+' decided');
  const txt={link:'linked to '+(is.txnId?expKey(ccTxn(is.txnId)):''),separate:'confirmed as a separate transaction from '+res.ofKey,discrepancy:'linked to '+(is.txnId?expKey(ccTxn(is.txnId)):'')+' with the discrepancy recorded for Finance review (nothing is overwritten)',
    'link-rejected':'linked to the rejected '+(is.txnId?expKey(ccTxn(is.txnId)):'')+' as statement evidence (it stays Rejected)'}[kind];
  ccLog(s,s.importStatus,'Row '+row.n+' '+txt+' by '+caN(A.who)+': '+reason+'. Now '+row.status+'.',A);
  return '';
}
/* Safe re-upload into the same statement (FR-CT-05.09, 05.11): the earlier upload and its rows are kept. */
function ccStmtReplace(id,parsed,A){
  A=A||ccNow();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;
  if(!parsed||parsed.kind!=='card statement'||!parsed.rows.length)return 'Upload a card statement file with data rows.';
  if(parsed.hash===s.hash)return 'This is the same content as the current upload of '+expKey(s)+'.';
  const dup=ccStmts.find(function(x){return x!==s&&x.entity===s.entity&&x.hash===parsed.hash&&x.importStatus!=='Discarded';});
  if(dup)return 'The same statement rows were already imported as '+expKey(dup)+'.';
  s.uploads.push(ccStmtSnapshot(parsed,A));
  s.rows=parsed.rows.map(ccStmtRowNew);s.hash=parsed.hash;s.fileHash=parsed.fileHash||'';s.fileName=String(parsed.fileName||s.fileName).slice(0,120);s.format=parsed.format;
  s.unknownCols=(parsed.unknown||[]).slice();s.sensitiveCols=(parsed.sensitive||[]).slice();s.maskedRows=(parsed.masked||[]).slice();
  ccStmtStage(s,'Validation Pending',A,'Corrected file');ccStmtValidate(s);const m=ccStmtSum(s);ccStmtStage(s,m.open?'Review Required':'Validation Completed',A,'');
  ccLog(s,s.importStatus,'Corrected file uploaded by '+caN(A.who)+': '+s.fileName+' ('+m.rows+' rows: '+m.new+' new, '+m.linked+' matching, '+m.duplicate+' duplicate, '+m.review+' review, '+m.invalid+' invalid). The earlier upload and its rows are kept in the upload history.',A);
  return '';
}
function ccStmtDiscard(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;if(reason.length<5)return 'Say why the statement is discarded.';
  ccStmtStage(s,'Discarded',A,reason);ccLog(s,'Discarded','Discarded by '+caN(A.who)+': '+reason+'. Nothing was created; the upload and its rows stay on record.',A);
  return '';
}

/* ── Independent verification (FR-CT-05.13; Addendum G9): Card Load Verifiers with card.statement.verify ── */
function ccStmtMakers(s){
  const u=[s.createdBy,s.actualBy];
  (s.uploads||[]).forEach(function(x){u.push(x.by,x.actual);});(s.periodHistory||[]).forEach(function(x){u.push(x.by,x.actual);});
  s.rows.forEach(function(r){(r.edits||[]).forEach(function(e){u.push(e.by,e.actual);});if(r.map)u.push(r.map.by,r.map.actual);if(r.res)u.push(r.res.by,r.res.actual);if(r.excluded)u.push(r.excluded.by,r.excluded.actual);if(r.pex)u.push(r.pex.by,r.pex.actual);if(r.ores)u.push(r.ores.by,r.ores.actual);
    if(r.status==='Linked'&&r.match&&!r.match.rejected){const t=ccTxn(r.match.txnId);if(t&&t.verify&&t.verify.status===CCT_UNDER){u.push(t.recordedBy,t.actual);const k=ccTxnLastFix(t);if(k)u.push(k.by,k.actual);}}});
  if(s.verify&&s.verify.submittedBy)u.push(s.verify.submittedBy,s.verify.actual);
  return ccUniq(u.filter(Boolean));
}
function ccStmtHolders(s){return ccUniq(s.rows.filter(function(r){return r.cardId&&!r.excluded;}).map(function(r){return idUserOfEmp((ccCard(r.cardId)||{}).employeeEid);}).filter(Boolean));}
function ccStmtVerifiers(s){
  const mk=ccStmtMakers(s),ho=ccStmtHolders(s);
  return ccPeopleWith('card.statement.verify',s.entity).filter(function(u){return mk.indexOf(u)<0&&ho.indexOf(u)<0&&(typeof caActive!=='function'||caActive(u));});
}
function ccStmtWhyNotVerify(s,A){
  if(!s)return 'No such statement.';
  if(!ccPCan(A,'card.statement.verify'))return caN(A.who)+' cannot verify card statements (card.statement.verify).';
  const via=caVia(A),mk=ccStmtMakers(s),ho=ccStmtHolders(s);
  if(mk.indexOf(A.who)>=0||(via&&mk.indexOf(via)>=0))return 'Maker-checker: '+caN(mk.indexOf(A.who)>=0?A.who:via)+' prepared, corrected or mapped this statement (or recorded a transaction it verifies); someone independent verifies it.';
  if(ho.indexOf(A.who)>=0||(via&&ho.indexOf(via)>=0))return caN(ho.indexOf(A.who)>=0?A.who:via)+' holds a card on this statement; a cardholder never verifies their own card activity.';
  if(typeof caActive==='function'&&!caActive(A.who))return caN(A.who)+' is not an active user.';
  return '';
}
function ccStmtNoVerifierText(s){return 'No eligible statement verifier: give card.statement.verify (through the Card Load Verifiers team) to an active user who did not prepare, correct or map this statement and holds no card on it.';}
function ccStmtSubmit(id,A){
  A=A||ccNow();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  if(!ccPCan(A,'card.transaction.import'))return caN(A.who)+' cannot import card statements (card.transaction.import).';
  if(['Validation Completed','Review Required'].indexOf(s.importStatus)<0)return expKey(s)+' is '+s.importStatus+'.';
  ccStmtRefresh(s,A);const m=ccStmtSum(s);
  if(m.open)return expKey(s)+' cannot go to verification: '+[m.review?m.review+' row(s) need a decision'+(m.mapping?' ('+m.mapping+' in Card Mapping Review)':''):'',m.invalid?m.invalid+' row(s) are invalid':''].filter(Boolean).join(' and ')
    +'. Correct, map, decide or exclude them first: every statement row is accounted for.';
  if(!m.new&&!m.linked)return 'No row would create or link a transaction (every row is a duplicate or excluded). Discard the statement instead.';
  s.rounds++;s.verify={status:'Awaiting Verification',submittedBy:A.who,actual:caVia(A),at:ccStamp(A)};
  ccStmtStage(s,'Awaiting Verification',A,'Submitted for verification');
  const v=ccStmtVerifiers(s);s.assignException=v.length?'':ccStmtNoVerifierText(s);
  ccLog(s,'Awaiting Verification','Submitted for independent verification by '+caN(A.who)+': '+m.new+' new, '+m.linked+' linked to existing transactions, '+m.duplicate+' duplicate(s), '+m.excluded+' excluded.'+(s.assignException?' '+s.assignException:''),A);
  ccNotify(v,expKey(s)+': card statement '+s.sourceRef+' ('+m.rows+' rows) awaits your independent verification.',s,'verify-'+s.rounds);
  return '';
}
function ccStmtTxnOfRow(s,n){const r=s.rows.find(function(x){return x.n===n;});return r&&r.result&&r.result.txnId?ccTxn(r.result.txnId):null;}
function ccStmtTxnNew(s,row,A){
  const P=row.parsed,c=ccCard(P.cardId),e=idEmp(c.employeeEid)||{},local=P.time?P.date+'T'+P.time:'';
  const t={id:ccTxnNextId++,key:ccTxnNextKey++,prefix:'CTX',kind:'card transaction',entity:s.entity,cardId:c.id,programmeId:c.programmeId,employeeEid:c.employeeEid,name:e.name||'',empId:e.empId||'',
    provider:c.provider||s.provider||'',wallet:P.wallet,walletClass:P.walletClass,direction:P.lf.credit?'Credit':'Debit',type:P.lf.credit?P.lf.type:(P.lf.life==='Posted'?'Purchase':'Authorization'),
    status:P.lf.life,date:P.date,time:P.time,local:local,tz:local?P.tz:'',utc:local?ccLocalToUtc(local,P.tz):'',postDate:P.lf.life==='Posted'?P.postDate:'',
    merchant:P.merchant,mcc:P.mcc,country:P.country,channel:P.channel,amount:P.amount,currency:P.currency,billAmount:P.billAmount,billCurrency:P.billCurrency,rate:P.rate,rateSource:P.rate?'Provider-reported':'',
    extRef:P.ref,authCode:P.authCode,entry:s.demo?CC_DEMO:CCS_ENTRY,demo:!!s.demo,
    verify:s.demo?{status:CC_DEMO,source:CC_DEMO}:{status:CCT_VERIFIED,source:CC_SRC_MANUAL,by:A.who,actual:caVia(A),at:ccStamp(A),via:expKey(s)},
    reason:'From statement '+s.sourceRef,comments:P.description,evidence:'Statement '+expKey(s)+' · '+s.fileName+' · row '+row.n,
    stmtLinks:[{stmtId:s.id,key:expKey(s),row:row.n,at:ccStamp(A)}],matchStatus:'Unmatched',reconStatus:'Not Reconciled',disputes:[],lifecycle:[],
    recordedBy:s.createdBy,actual:s.actualBy||'',recordedAt:s.createdAt,iso:A.iso,logs:[]};
  t.cardRef={key:expKey(c),last4:c.last4};
  const el=P.elig;t.eligibility={ok:el.ok,basis:el.basis||'',provisional:!!el.provisional,text:el.text,exception:!el.ok};
  if(row.match&&row.match.sep)t.dupReview={of:null,ofKey:row.match.sep.ofKey,reason:row.match.sep.reason,status:'Open'};
  if(P.lf.credit&&P.orig){const o=P.orig.txnId?ccTxn(P.orig.txnId):ccStmtTxnOfRow(s,P.orig.row);t.refundOf={id:o?o.id:null,key:o?expKey(o):'',ref:P.origRef};t.refund={processing:'Not Processed'};}
  else if(P.lf.credit&&P.unlinked){t.refundOf={id:null,key:'',ref:P.origRef,unlinked:true,reason:P.unlinked.reason};t.refund={processing:'Not Processed – Original Not Identified'};}
  if(P.periodException)t.stmtLinks[0].periodException=P.periodException.reason;
  t.lifecycle.push({to:t.status,at:ccStamp(A),by:A.who,actual:caVia(A),note:'From '+expKey(s)+' row '+row.n});
  ccTxns.unshift(t);
  ccLog(t,t.status,'From statement '+expKey(s)+' ('+s.sourceRef+', '+s.fileName+', row '+row.n+') prepared by '+caN(s.createdBy)+' and verified by '+caN(A.who)
    +(s.demo?' ('+CC_DEMO+'; no card was charged)':' (Manually Verified from the statement; not a provider confirmation)')+': '+t.merchant+', '+expMoney(t.amount,t.currency)
    +(t.currency!==t.billCurrency?' billed '+expMoney(t.billAmount,t.billCurrency):'')+(t.extRef?', reference '+t.extRef:'')+'.'+(t.refundOf?' '+t.type+' of '+(t.refundOf.key||t.refundOf.ref)+(t.refundOf.unlinked?' (original not identified; linked to no purchase)':'')+'; refund processing has not started, nothing is adjusted.':'')
    +(t.dupReview?' Duplicate review: separate from '+t.dupReview.ofKey+' because '+t.dupReview.reason+'.':'')+(t.eligibility.exception?' Eligibility exception: '+t.eligibility.text:''),A);
  ccNotify([idUserOfEmp(t.employeeEid)],'A card transaction from your card statement was recorded on '+ccMask(t.cardRef.last4)+': '+t.merchant+', '+expMoney(t.amount,t.currency)+' ('+t.status+').',t,'recorded');
  return t;
}
function ccStmtLinkTxn(s,row,A){
  const m=row.match,t=ccTxn(m.txnId),P=row.parsed,L={stmtId:s.id,key:expKey(s),row:row.n,at:ccStamp(A)};
  t.stmtLinks=t.stmtLinks||[];t.stmtLinks.push(L);
  if(m.rejected){
    ccLog(t,t.status,'Statement evidence '+L.key+' row '+L.row+' linked (verified by '+caN(A.who)+'). The record stays Verification Rejected; it is used only after an authorized correction and resubmission.',A);
    ccNotify([t.recordedBy],expKey(t)+' (rejected): statement '+L.key+' row '+L.row+' carries the same reference. Correct and resubmit it if the rejection no longer applies.',t,'stmt-'+L.key+'-'+L.row);return;
  }
  const dis=(m.discrepancy||[]).concat(m.refDiff||[]);let note='';
  if(dis.length){t.discrepancies=t.discrepancies||[];t.discrepancies.push({key:L.key,row:L.row,diffs:dis,reason:(row.res||{}).reason||'',by:(row.res||{}).by||'',status:'Open',at:ccStamp(A)});}
  /* B8-N09 A: one verified evidence event. The verified statement completes the pending manual verification only when
     every identifying field agrees and its verifier is independent of the recorder, any corrector, the statement
     preparer and the cardholder; any material difference keeps the record Under Review for Finance. */
  if(!t.demo&&t.verify.status===CCT_UNDER){
    const why=ccTxnWhyNotVerify(t,A);
    if(dis.length)note+=' The manual record stays Under Review: the statement differs ('+dis.map(function(x){return x.field;}).join(', ')+'), so it does not complete the verification. Finance reviews the field-level difference and corrects or rejects the record; nothing was overwritten.';
    else if(why)note+=' The manual record stays Under Review: '+why;
    else{t.verifyHistory=(t.verifyHistory||[]).concat([t.verify]);t.verify={status:CCT_VERIFIED,source:CC_SRC_MANUAL,by:A.who,actual:caVia(A),at:ccStamp(A),via:L.key,basis:'Independently verified statement evidence'};
      note+=' The manual record was under review: verified using the independently verified statement evidence ('+L.key+' row '+L.row+') by '+caN(A.who)+', who is independent of its recorder, any corrector, the statement preparer and the cardholder. Card, cardholder, reference, type, amount, currency and date agree; the manual evidence and the statement reference are both kept.';}
  }
  if(m.progress&&(t.demo||t.verify.status===CCT_VERIFIED)&&!t.pendingPost){
    const was=t.status;t.status=m.progress;if(m.progress==='Posted')t.postDate=P.postDate;
    t.lifecycle.push({from:was,to:t.status,at:ccStamp(A),by:A.who,actual:caVia(A),note:'Statement '+L.key+' row '+L.row,ref:P.ref});
    if(ccTxnOutcomeLabel(t)){const same=t.outcome.to===m.progress;note+=' The internal unconfirmed '+t.outcome.to.toLowerCase()+' outcome is '+(same?'confirmed':'superseded')+' by the statement.';t.outcome.confirmed=same;t.outcome.closed=ccStamp(A);t.outcome.by2=L.key;}
    note+=' Status '+was+' → '+t.status+' from the verified statement.';
  }else if(m.progress)note+=' The statement shows '+m.progress+'; the record stays '+t.status+' until its own verification'+(t.pendingPost?' of the recorded posting':'')+' is complete.';
  ccLog(t,t.status,'Statement evidence '+L.key+' row '+L.row+' linked (verified by '+caN(A.who)+'); the earlier record and its verification history are kept.'+note
    +(dis.length?' Source discrepancy for Finance review: '+dis.map(function(x){return x.field+' '+x.adt+' (ADT) vs '+x.stmt+' (statement)';}).join('; ')+'. Nothing was overwritten.':''),A);
  ccNotify([t.recordedBy],expKey(t)+': statement '+L.key+' row '+L.row+' was linked to the transaction you recorded'+(dis.length?', with a discrepancy for review':'')+'.',t,'stmt-'+L.key+'-'+L.row);
}
function ccStmtVerify(id,A){
  A=A||ccNow();const s=ccStmtGet(id);if(!s)return {error:'No such statement.'};
  if(s.importStatus!=='Awaiting Verification')return {error:expKey(s)+' is '+s.importStatus+'; only a statement awaiting verification is verified.'};
  const why=ccStmtWhyNotVerify(s,A);if(why)return {error:why};
  if(s.demo&&!ccDemoOn(s.entity))return {error:'Presentation mode is off: an illustrative statement is not processed.'};
  ccStmtValidate(s);const m=ccStmtSum(s);
  if(m.open||(!m.new&&!m.linked)){
    s.verify=Object.assign({},s.verify,{status:'Returned',by:A.who,actual:caVia(A),at:ccStamp(A),reason:'Validation changed after submission'});ccStmtStage(s,m.open?'Review Required':'Validation Completed',A,'Validation changed after submission');
    ccLog(s,s.importStatus,'Verification stopped: the rows no longer validate as submitted ('+m.review+' for review, '+m.invalid+' invalid). Back with the preparer; nothing was created.',A);
    return {error:'The rows changed since submission ('+m.review+' for review, '+m.invalid+' invalid): '+expKey(s)+' is back with its preparer. Nothing was created.'};
  }
  const out={created:[],linked:[],dups:0,excluded:0};
  s.rows.forEach(function(row){
    if(row.result)return;
    if(row.status==='Excluded'){row.result={status:'Excluded'};out.excluded++;return;}
    if(row.status==='Duplicate'){row.result={status:'Duplicate',text:row.dupText||''};out.dups++;return;}
    if(row.status==='New'){const t=ccStmtTxnNew(s,row,A);row.result={status:'Created',txnId:t.id};out.created.push(t);return;}
    if(row.status==='Linked'){ccStmtLinkTxn(s,row,A);row.result={status:'Linked',txnId:row.match.txnId};out.linked.push(ccTxn(row.match.txnId));}
  });
  s.verify=Object.assign({},s.verify,{status:'Verified',by:A.who,actual:caVia(A),at:ccStamp(A)});s.assignException='';
  ccStmtStage(s,'Verified',A,'Independently verified');
  ccLog(s,'Verified','Verified by '+caN(A.who)+' against the statement: '+out.created.length+' card transaction(s) created, '+out.linked.length+' existing transaction(s) linked, '+out.dups+' duplicate(s) and '+out.excluded+' excluded row(s) created nothing. '
    +(s.demo?'Every row is '+CC_DEMO+'.':'Rows are Manually Verified from the statement, not Provider Confirmed.')+' No funding, card load, budget or reimbursement entry was made. Reconciliation has not started.',A);
  ccNotify([s.createdBy],expKey(s)+': your statement '+s.sourceRef+' was verified by '+caN(A.who)+' ('+out.created.length+' created, '+out.linked.length+' linked).',s,'verified');
  return {rec:s,created:out.created,linked:out.linked};
}
function ccStmtReturn(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  if(s.importStatus!=='Awaiting Verification')return expKey(s)+' is '+s.importStatus+'.';
  const why=ccStmtWhyNotVerify(s,A);if(why)return why;if(reason.length<5)return 'Say what the preparer must correct.';
  s.verify=Object.assign({},s.verify,{status:'Returned',by:A.who,actual:caVia(A),at:ccStamp(A),reason:reason});
  ccStmtValidate(s);ccStmtStage(s,ccStmtSum(s).open?'Review Required':'Validation Completed',A,'Returned: '+reason);
  ccLog(s,s.importStatus,'Returned for correction by '+caN(A.who)+': '+reason+'. Nothing was created.',A);
  ccNotify([s.createdBy],expKey(s)+': your statement was returned for correction: '+reason,s,'returned-'+s.rounds);
  return '';
}


/* ══ Build 8C · FR-CT-09, 10, 11, 13 · Transaction-to-expense matching ═════════════════════════════════════
   Product-owner decisions of 8 Nov 2026 ("FR-CT Build 8B Acceptance and 8C Direction"):
   1. The existing Build 4 Add Expense form creates an expense from a card transaction: the line keeps the
      transaction reference; the card and the card-funded amount come from the transaction; the employee-paid
      part uses the existing split. No other expense form, no other approval engine.
   2. Approval never waits for the card transaction (G1). A card-paid line without one stays Awaiting
      Transaction Evidence and is listed for Finance; reimbursement of the employee-paid part goes on as before.
   3. Matching compares the line's ACTUAL card-funded amount (never the approved amount, never the employee
      part) with the transaction: Level 1 reference, Level 2 exact (unique both ways), Level 3 documented FX
      (the provider's billing amount, only minor-unit rounding of the provider's own conversion), Level 4
      suggested (differences shown, confirmed or rejected by an authorized, independent person).
      No percentage tolerance. ADT's exchange rate never rewrites the provider's billed amount (G8).
   4. One transaction may match several lines of ONE claim; a line matches one transaction at most; matched
      amounts never exceed the transaction; a remaining unmatched amount stays visible (FR-CT-11).
   5. Matching is not approval and posts nothing: no funding, card load, budget or reimbursement entry.
      Every match, rejection and unmatch is kept with its actor, time and reason (FR-CT-10.10, 10.13). */
const ccMatches=[];let ccMatchNextId=210001,ccMatchNextKey=1001;
const CCM_LIVE=['Draft','Awaiting Approval','Follow-Up','Approved','Partially Approved','Reimbursed'];
const CCM_SUBMITTED=['Awaiting Approval','Follow-Up','Approved','Partially Approved','Reimbursed'];
function ccMatch(id){return ccMatches.find(function(m){return m.id===Number(id);})||null;}
function ccClaimsOf(ent){ent=ent||ccEnt();return (typeof expensesData==='undefined'?[]:expensesData).filter(function(r){return (typeof caKind!=='function'||caKind(r)==='expense')&&(r.entity?r.entity===ent:ent===ccEnt());});}
function ccCardLines(r){return (r.lines||[]).filter(function(l){return l.paidBy===CC_PAID_CARD&&l.cardId;});}
/* The line's actual card-funded part (B7-N23: never the approved amount). */
function ccLineCardAmt(l){return ccM(Math.min(Number(l.cardAmount)||0,Number(l.amount)||0));}
function ccLineRef(r,l){return expKey(r)+'-L'+l.id;}
/* The transaction's time and date on the entity's clock (G3): eligibility and date checks use it. */
function ccTxnLocalTs(t){const etz=entTimezone(t.entity);if(t.utc&&etz){const x=ccUtcToLocal(t.utc,etz);if(x)return x;}return t.local||'';}
function ccTxnLocalDate(t){const ts=ccTxnLocalTs(t);return ts?ts.slice(0,10):t.date;}
/* The provider's own conversion explains a total only within the rounding of amount × provider rate. */
function ccFxRoundOk(t,total){return t.rate>0&&Math.abs(total-t.amount*t.rate)<=0.005+1e-6;}
/* What a claim in currency cur is compared with (G8). Original currency: the original amount. Card billing
   currency: the provider's billing amount, with one minor unit of rounding only when the provider reported its
   rate. Any other currency has no evidenced conversion: ADT does not convert the provider amount itself. */
function ccTxnEligible(t,cur){
  if(!t)return {error:'No such transaction.',kind:'none'};
  if(t.direction==='Credit')return {error:expKey(t)+' is a '+String(t.type||'credit').toLowerCase()+' (a credit to the card): refunds and reversals are linked to their original purchase, never matched as an expense.',kind:'credit'};
  if(cur===t.currency)return {amount:t.amount,currency:cur,basis:'Original transaction amount',allowance:0,fx:false};
  if(t.currency!==t.billCurrency&&cur===t.billCurrency){
    if(!(t.billAmount>0))return {error:'FX information missing: '+expKey(t)+' has no provider billing amount in '+cur+'. Matching is blocked until the provider\'s figures are recorded.',kind:'fx'};
    if(t.rate>0&&Math.abs(ccM(t.amount*t.rate)-t.billAmount)>0.01+1e-9)return {error:'Invalid FX information on '+expKey(t)+': '+expMoney(t.amount,t.currency)+' × '+t.rate+' is not '+expMoney(t.billAmount,t.billCurrency)+' within rounding to the minor unit. Matching is blocked until the transaction record is corrected.',kind:'fx'};
    return {amount:t.billAmount,currency:cur,basis:'Provider billing amount',rate:t.rate||null,allowance:t.rate>0?0.01:0,fx:true};
  }
  return {error:'FX information missing: '+expKey(t)+' was charged in '+t.currency+(t.billCurrency!==t.currency?' and billed in '+t.billCurrency:'')+'; a claim in '+cur+' has no evidenced provider conversion. ADT never converts the provider\'s amount at its own exchange rate: the claim is made in '
    +ccUniq([t.currency,t.billCurrency]).join(' or ')+'.',kind:'fx'};
}
/* Provider billing conversion against ADT's exchange rate on the transaction date (G8): shown, never posted. */
function ccFxVariance(t){
  if(!t||t.currency===t.billCurrency||!(t.billAmount>0))return null;
  const r=typeof epRate==='function'?epRate(t.currency,t.billCurrency,t.date):null;
  if(!r)return {adtRate:null,adtAmount:null,variance:null,text:'ADT has no '+t.currency+'→'+t.billCurrency+' exchange rate on '+cdLabel(t.date)+' (Company Settings → Exchange Rates): no budget conversion is assumed, never 1:1.'};
  const a=ccM(t.amount*r.rate),v=ccM(t.billAmount-a);
  return {adtRate:ccM(r.rate*1e6)/1e6,adtAmount:a,variance:v,text:'Provider billed '+expMoney(t.billAmount,t.billCurrency)+(t.rate?' at its rate '+t.rate:'')+'; ADT\'s rate '+(Math.round(r.rate*1e6)/1e6)+' gives '+expMoney(a,t.billCurrency)
    +': FX variance '+expMoney(v,t.billCurrency)+' (identified only; nothing is posted for it).'};
}
function ccMatchActive(m){return !!m&&m.status==='Matched';}
function ccMatchesOfTxn(id,all){return ccMatches.filter(function(m){return m.txnId===Number(id)&&(all||ccMatchActive(m));});}
function ccMatchOfLine(claimId,lineId){return ccMatches.find(function(m){return m.claimId===claimId&&m.lineId===lineId&&ccMatchActive(m);})||null;}
function ccMatchesOfLine(claimId,lineId){return ccMatches.filter(function(m){return m.claimId===claimId&&m.lineId===lineId;});}
function ccMatchOpenSugg(claimId,lineId,txnId){return ccMatches.filter(function(m){return m.status==='Suggested'&&(claimId==null||m.claimId===claimId)&&(lineId==null||m.lineId===lineId)&&(txnId==null||m.txnId===txnId);});}
/* What already holds a transaction: its active matches, and live lines that reference it without a match yet
   (a draft, or a transaction not yet posted or verified). except = {claimId, lineId} (the line being checked). */
function ccTxnHolds(t,except){
  except=except||{};const out=[];
  ccMatchesOfTxn(t.id).forEach(function(m){if(m.claimId===except.claimId&&m.lineId===except.lineId)return;out.push({claimId:m.claimId,lineId:m.lineId,amount:m.amount,currency:m.currency,match:m});});
  ccClaimsOf(t.entity).forEach(function(r){
    if(CCM_LIVE.indexOf(r.status)<0)return;
    ccCardLines(r).forEach(function(l){
      if(Number(l.txnId)!==t.id||(r.id===except.claimId&&l.id===except.lineId)||ccMatchOfLine(r.id,l.id))return;
      out.push({claimId:r.id,lineId:l.id,amount:ccLineCardAmt(l),currency:r.currency,ref:true});
    });
  });
  return out;
}
function ccTxnHolderClaim(t){const h=ccTxnHolds(t,{});return h.length?expRec(h[0].claimId):null;}
/* One line against one transaction. o.manual: a person (or the line's own reference) chose the pair, so a part
   of the transaction may be matched; otherwise the automatic exact rule needs the whole transaction. */
function ccMatchCompare(r,l,t,o){
  o=o||{};const out={diffs:[],block:'',kind:'',level:0,method:'',ok:false,wait:false,amount:ccLineCardAmt(l),rounding:0};
  const add=function(f,e,x,soft){out.diffs.push({field:f,expense:e,txn:x,soft:!!soft});};
  if(!t||t.entity!==(r.entity||ccEnt())){out.block='No such transaction in this entity.';out.kind='Expense Without Matching Transaction';return out;}
  if(t.walletClass==='Flexi Benefit'){out.block=expKey(t)+' was spent from the '+wbTypeName(t.wallet)+' benefit wallet: benefit spending follows the Wallet & Benefits rules and is not claimed as a corporate expense.';out.kind='Benefit Wallet Transaction';return out;}
  const el=ccTxnEligible(t,r.currency);out.el=el;
  if(el.error){out.block=el.error;out.kind=el.kind==='fx'?'Currency/FX Mismatch':'Refund or Reversal';return out;}
  if(Number(l.cardId)!==t.cardId)add('Card',l.cardRef?ccMask(l.cardRef.last4)+' · '+l.cardRef.key:'—',ccMask(t.cardRef.last4)+' · '+t.cardRef.key);
  if(r.employeeEid!==t.employeeEid)add('Employee',idEmpName(r.employeeEid)||r.name||'—',t.name||'—');
  if(out.diffs.length){out.block='Card ownership mismatch: '+out.diffs.map(function(x){return x.field+' '+x.expense+' on the expense, '+x.txn+' on '+expKey(t);}).join('; ')+'. A card payment is matched only to its own cardholder\'s expense on that card.';out.kind='Card Ownership Mismatch';return out;}
  /* B8-N16 F: a third currency is compared only at ADT's rate and never matched without Finance's confirmation. */
  if(el.assisted)add('Currency',r.currency+' claim','charged '+t.currency+(t.billCurrency!==t.currency?', billed '+t.billCurrency:'')+'; compared at '+el.basis,true);
  if(t.status==='Declined'||t.status==='Voided'){out.block=expKey(t)+' was '+t.status.toLowerCase()+': it was never settled, so it is not evidence of a card payment.';out.kind='Expense Without Matching Transaction';return out;}
  if(t.status!=='Posted'){out.block=expKey(t)+' is a pending authorization, not a settled purchase: the line stays Awaiting Transaction Evidence until it is posted.';out.kind='Pending Transaction';out.wait=true;return out;}
  const vs=(t.verify||{}).status;
  if(!t.demo&&vs!==CCT_VERIFIED){out.block=expKey(t)+(vs===CCT_REJECTED?' is a record whose verification was rejected (unverified)':' awaits independent verification')+': it is not verified transaction evidence.';out.kind='Unverified Transaction Evidence';out.wait=vs===CCT_UNDER;return out;}
  const holds=ccTxnHolds(t,{claimId:r.id,lineId:l.id}),other=holds.find(function(h){return h.claimId!==r.id;});
  if(other){const oc=expRec(other.claimId);out.block=expKey(t)+' is already claimed by '+(oc?expKey(oc):'another claim')+': one card transaction matches lines of one claim only.';out.kind='Duplicate Suspected';out.heldBy=other.claimId;return out;}
  const td=ccTxnLocalDate(t),end=l.end||l.start;
  if(!(typeof ccLineCoversTxn==='function'?ccLineCoversTxn(l,t):td>=l.start&&td<=end))add('Transaction Date',cdLabel(l.start)+(end!==l.start?' – '+cdLabel(end):''),cdLabel(td),true);
  if(t.eligibility&&t.eligibility.exception)add('Card Eligibility','Card used for the expense',t.eligibility.text,true);
  const used=ccM(holds.reduce(function(s,h){return s+h.amount;},0)),rem=ccM(el.amount-used),amt=out.amount;
  out.used=used;out.remaining=rem;out.eligible=el.amount;
  const ref=Number(l.txnId)===t.id,part=ref||!!o.manual;
  if(amt>rem+1e-9){
    if(!(el.allowance&&amt<=rem+el.allowance+1e-9&&ccFxRoundOk(t,ccM(used+amt)))){
      add('Amount',expMoney(amt,r.currency),expMoney(rem,r.currency)+(used?' left of '+expMoney(el.amount,r.currency):''));
      out.block='The card-funded amount '+expMoney(amt,r.currency)+' is more than '+(used?'what remains of ':'')+expKey(t)+' ('+expMoney(rem,r.currency)+(used?' of '+expMoney(el.amount,r.currency):'')+'): a match never exceeds the transaction.';out.kind='Amount Mismatch';return out;}
    out.rounding=ccM(used+amt-el.amount);
  }
  if(!ref&&o.manual){
    const d=ccM(rem-amt);
    if(Math.abs(d)>1e-9&&!(el.allowance&&Math.abs(d)<=el.allowance+1e-9&&ccFxRoundOk(t,ccM(used+amt))))
      add('Amount',expMoney(amt,r.currency),expMoney(rem,r.currency)+(used?' left of '+expMoney(el.amount,r.currency):'')+' ('+expMoney(Math.abs(d),r.currency)+(d>0?' would stay unmatched)':' over)'),true);
    else if(Math.abs(d)>1e-9)out.rounding=ccM(used+amt-el.amount);
  }
  if(!part){
    if(used>0)add('Amount',expMoney(amt,r.currency),expMoney(rem,r.currency)+' left of '+expMoney(el.amount,r.currency)+' (partly matched)',true);
    else if(Math.abs(amt-el.amount)>1e-9&&!(el.allowance&&Math.abs(amt-el.amount)<=el.allowance+1e-9&&ccFxRoundOk(t,amt)))add('Amount',expMoney(amt,r.currency),expMoney(el.amount,r.currency)+(el.fx?' ('+el.basis.toLowerCase()+')':''),true);
    else if(Math.abs(amt-el.amount)>1e-9)out.rounding=ccM(amt-el.amount);
  }
  if(out.diffs.length){out.level=4;out.method='Suggested';const f=out.diffs[0].field;out.kind=f==='Amount'?'Amount Mismatch':f==='Transaction Date'?'Transaction Date Mismatch':f==='Currency'?'Currency/FX Mismatch':'Card Eligibility Exception';return out;}
  out.ok=true;out.level=ref?1:part?0:el.fx?3:2;out.method=ref?'Reference':part?'Manual':el.fx?'Documented FX':'Exact';
  return out;
}
function ccMatchConfidence(m){return {Reference:'Confirmed reference match with financial validation','Exact':'Unique exact match','Documented FX':'Documented FX / rounding match',Manual:'Validated manual match','Confirmed Suggestion':'Suggested match confirmed by an authorized reviewer',Suggested:'Suggested match requiring review'}[m.method]||m.method;}
/* A line's own snapshot: what a confirmed suggestion accepted (a later change asks for confirmation again). */
function ccLineSnap(r,l){return [r.currency,l.cardId,ccLineCardAmt(l),l.start,l.end||l.start,Number(l.txnId)||0].join('|');}
function ccMatchPairBarred(r,l,t){return ccMatches.some(function(m){return m.claimId===r.id&&m.lineId===l.id&&m.txnId===t.id&&(m.status==='Rejected'||m.status==='Unmatched');});}
function ccMatchNew(r,l,t,cmp,status,A,o){
  o=o||{};
  const m={id:ccMatchNextId++,key:ccMatchNextKey++,prefix:'MTX',kind:'transaction match',entity:t.entity,txnId:t.id,txnKey:expKey(t),claimId:r.id,claimKey:expKey(r),lineId:l.id,lineRef:ccLineRef(r,l),lineTitle:l.title,
    employeeEid:r.employeeEid,cardId:t.cardId,amount:cmp.amount,currency:r.currency,method:o.method||cmp.method,level:cmp.level,status:status,demo:!!t.demo,
    compare:{basis:cmp.el?cmp.el.basis:'',eligible:cmp.el?cmp.el.amount:null,remainingBefore:cmp.remaining,txnAmount:t.amount,txnCurrency:t.currency,billAmount:t.billAmount,billCurrency:t.billCurrency,rate:t.rate||null,rounding:cmp.rounding||0,
      txnDate:ccTxnLocalDate(t),lineDates:l.start+(l.end&&l.end!==l.start?' – '+l.end:''),fx:ccFxVariance(t)},
    diffs:(o.diffs||cmp.diffs||[]).slice(),blocked:status==='Suggested'?cmp.block||'':'',accepted:o.accepted||null,reason:o.reason||'',proposedBy:o.proposedBy||'',auto:!!o.auto,by:A.who,actual:caVia(A),at:ccStamp(A),iso:A.iso,history:[],logs:[]};
  m.confidence=ccMatchConfidence(m);
  m.history.push({at:ccStamp(A),by:A.who,actual:caVia(A),to:status,note:o.note||(o.auto?'Automatic':'')+(o.reason?(o.auto?' · ':'')+o.reason:'')});
  ccMatches.unshift(m);
  const what=status==='Matched'?'matched':'suggested for review',dtxt=m.diffs.length?' Differences: '+m.diffs.map(function(x){return x.field+' '+x.expense+' (expense) vs '+x.txn+' (transaction)';}).join('; ')+'.':'';
  const txt=expKey(m)+': '+expKey(t)+' '+what+' to line "'+l.title+'" ('+m.lineRef+') — '+expMoney(m.amount,m.currency)+' of the card-funded amount, '+m.confidence.toLowerCase()+' ('+m.compare.basis.toLowerCase()+').'+(m.compare.rounding?' Documented minor-unit rounding '+expMoney(m.compare.rounding,m.currency)+' of the provider\'s conversion.':'')+dtxt
    +(m.demo?' '+CC_DEMO+': the transaction is illustrative; this match is not genuine evidence.':'')+(o.reason?' Reason: '+o.reason+'.':'')+' Matching is not approval and posts nothing.';
  /* System-made matches are kept on the match and the claim; the transaction's Logs keep what people did to it
     (its Expense Matching tab shows every match, automatic or not). */
  ccLog(m,status,txt,A);if(!o.auto)ccLog(t,t.status,txt,A);if(typeof caLog==='function')caLog(r,r.status,txt,A);
  return m;
}
function ccMatchEnd(m,to,note,A){
  m.status=to;m.endedAt=ccStamp(A);m.endedBy=A.who;m.endNote=note;
  m.history.push({at:ccStamp(A),by:A.who,actual:caVia(A),to:to,note:note});
  const t=ccTxn(m.txnId),r=expRec(m.claimId),txt=expKey(m)+' ('+m.txnKey+' ↔ '+m.lineRef+', '+expMoney(m.amount,m.currency)+') '+to.toLowerCase()+': '+note+'.';
  ccLog(m,to,txt,A);if(t&&A.who!=='System')ccLog(t,t.status,txt,A);if(r&&typeof caLog==='function')caLog(r,r.status,txt,A);
}
/* The transaction's matching dimension (FRD §8.6): kept apart from lifecycle, verification and reconciliation. */
function ccTxnMatchSet(t){
  if(t.direction==='Credit')return;
  if(t.walletClass==='Flexi Benefit'){t.matchStatus='Not Applicable';t.matchedAmount=0;t.unmatchedAmount=0;return;}
  const act=ccMatchesOfTxn(t.id);
  if(act.length){
    const el=ccTxnEligible(t,act[0].currency),sum=ccM(act.reduce(function(s,m){return s+m.amount;},0)),amt=el.error?sum:el.amount;
    t.matchStatus=sum>=amt-1e-9||(el.allowance&&Math.abs(sum-amt)<=el.allowance+1e-9)?'Matched':'Partially Matched';
    t.matchedAmount=sum;t.matchCurrency=act[0].currency;t.unmatchedAmount=t.matchStatus==='Matched'?0:ccM(amt-sum);
  }else{t.matchStatus=ccMatchOpenSugg(null,null,t.id).length?'Suggested':'Unmatched';t.matchedAmount=0;t.matchCurrency='';t.unmatchedAmount=0;}
}
function ccMerchNorm(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function ccMerchSimilar(a,b){a=ccMerchNorm(a);b=ccMerchNorm(b);return !!a&&!!b&&(a===b||(a.length>=4&&b.indexOf(a)>=0)||(b.length>=4&&a.indexOf(b)>=0));}
/* Candidates for a line without a reference: the same card and cardholder, settled, verified, corporate. */
function ccMatchCandTxns(r,l){
  return ccTxns.filter(function(t){return t.entity===(r.entity||ccEnt())&&t.cardId===Number(l.cardId)&&t.employeeEid===r.employeeEid&&t.direction!=='Credit'&&t.walletClass!=='Flexi Benefit'&&t.status==='Posted'&&(t.demo||(t.verify||{}).status===CCT_VERIFIED);});
}
/* Re-evaluate every card-paid line and transaction of the entity. Idempotent: run after any claim or transaction
   event and on access; it only writes when something changed. Draft claims hold their references but are matched
   when submitted; rejected and withdrawn claims release their matches (the transaction can be claimed again). */
let ccMatchBusy=false;
function ccMatchSync(ent,A){
  if(ccMatchBusy||typeof expensesData==='undefined')return;
  ccMatchBusy=true;
  try{
    ent=ent||ccEnt();
    let At=null;const sys=function(){return A||At||(At=caAt('System',wbToday(),stampNow().time));};
    /* 1. Existing matches and open suggestions. */
    ccMatches.filter(function(m){return m.entity===ent&&(m.status==='Matched'||m.status==='Suggested');}).forEach(function(m){
      const r=expRec(m.claimId),l=r&&(r.lines||[]).find(function(x){return x.id===m.lineId;}),t=ccTxn(m.txnId),act=m.status==='Matched';
      let why='';
      if(!r||!l)why='the expense line no longer exists';
      else if(['Rejected','Withdrawn'].indexOf(r.status)>=0)why='the claim was '+r.status.toLowerCase()+'; the transaction is free to be claimed again';
      else if(r.status==='Draft')why='the claim is back in draft';
      else if(l.paidBy!==CC_PAID_CARD||!l.cardId)why='the line is no longer paid by corporate card';
      else if(Number(l.txnId)&&Number(l.txnId)!==m.txnId)why='the line now references '+expKey(ccTxn(l.txnId)||{});
      else if(!act&&ccMatchOfLine(r.id,l.id))why='the line was matched to '+((ccTxn(ccMatchOfLine(r.id,l.id).txnId)||{}).key?expKey(ccTxn(ccMatchOfLine(r.id,l.id).txnId)):'another transaction');
      if(why){ccMatchEnd(m,act?'Released':'Superseded',why,sys());return;}
      const cmp=ccMatchCompare(r,l,t,{manual:m.method!=='Exact'&&m.method!=='Documented FX'});
      if(!act){
        if(cmp.block&&cmp.kind!=='Amount Mismatch'){ccMatchEnd(m,'Superseded','no longer a candidate: '+cmp.block,sys());return;}
        if(cmp.ok&&Number(l.txnId)===t.id&&!m.proposedBy){ccMatchEnd(m,'Superseded','the differences are gone; matched by reference',sys());return;}
        if(!cmp.ok)m.diffs=cmp.diffs.slice();m.blocked=cmp.block||'';m.amount=cmp.amount;return;
      }
      if(cmp.block){ccMatchEnd(m,'Released','re-evaluated after a change: '+cmp.block,sys());return;}
      if(m.accepted){if(m.accepted.snap!==ccLineSnap(r,l)){ccMatchEnd(m,'Released','the line changed after its differences were accepted; it is reviewed again',sys());}return;}
      if(!cmp.ok){ccMatchEnd(m,'Released','re-evaluated after a change: '+cmp.diffs.map(function(x){return x.field+' '+x.expense+' vs '+x.txn;}).join('; '),sys());return;}
      if(Math.abs(m.amount-cmp.amount)>1e-9){const was=m.amount;m.amount=cmp.amount;m.compare.rounding=cmp.rounding||0;const S=sys();
        m.history.push({at:ccStamp(S),by:S.who,actual:caVia(S),to:'Matched',note:'Card-funded amount re-evaluated '+expMoney(was,m.currency)+' → '+expMoney(m.amount,m.currency)});
        ccLog(m,'Matched','Re-evaluated after a claim change: matched amount '+expMoney(was,m.currency)+' → '+expMoney(m.amount,m.currency)+'.',S);}
    });
    /* 2. Lines without a match: their reference first, then the unique exact rule, then suggestions. */
    const free=[];
    ccClaimsOf(ent).forEach(function(r){
      if(CCM_SUBMITTED.indexOf(r.status)<0)return;
      ccCardLines(r).forEach(function(l){
        if(ccMatchOfLine(r.id,l.id))return;
        if(Number(l.txnId)){
          const t=ccTxn(l.txnId);if(!t||ccMatchPairBarred(r,l,t))return;
          const cmp=ccMatchCompare(r,l,t,{manual:true});
          if(cmp.ok)ccMatchNew(r,l,t,cmp,'Matched',sys(),{auto:true,note:'Automatic: the expense was created from '+expKey(t)});
          else if(!cmp.block&&!ccMatchOpenSugg(r.id,l.id,t.id).length)ccMatchNew(r,l,t,cmp,'Suggested',sys(),{auto:true,note:'The expense was created from '+expKey(t)+' but differs from it'});
          return;
        }
        free.push({r:r,l:l});
      });
    });
    /* Suggestions are for genuinely similar pairs, never "same card, same day": the amount and date agree but card
       eligibility needs review, or the merchant agrees and the date is in the line's range (any amount, shown as
       the difference). A similar pair is suggested only when it is unique both ways. */
    const byTxn={},softBy={};
    free.forEach(function(x){
      x.exact=[];x.soft=[];
      ccMatchCandTxns(x.r,x.l).forEach(function(t){
        if(ccMatchPairBarred(x.r,x.l,t))return;
        const cmp=ccMatchCompare(x.r,x.l,t,{});
        if(cmp.ok){x.exact.push({t:t,cmp:cmp});(byTxn[t.id]=byTxn[t.id]||[]).push(x);return;}
        if(cmp.block&&cmp.kind!=='Amount Mismatch')return;
        const onlyElig=!cmp.block&&cmp.diffs.length&&cmp.diffs.every(function(d){return d.field==='Card Eligibility';});
        const dateOk=!cmp.diffs.some(function(d){return d.field==='Transaction Date';});
        const otherDay=!cmp.block&&cmp.diffs.length===1&&cmp.diffs[0].field==='Transaction Date';
        if(onlyElig||otherDay||(dateOk&&ccMerchSimilar(x.l.merchant,t.merchant))){x.soft.push({t:t,cmp:cmp});(softBy[t.id]=softBy[t.id]||[]).push(x);}
      });
    });
    free.forEach(function(x){
      if(x.exact.length===1&&(byTxn[x.exact[0].t.id]||[]).length===1){
        const t=x.exact[0].t,cmp=ccMatchCompare(x.r,x.l,t,{});
        if(cmp.ok){ccMatchOpenSugg(x.r.id,x.l.id,null).forEach(function(s){ccMatchEnd(s,'Superseded','matched exactly to '+expKey(t),sys());});ccMatchNew(x.r,x.l,t,cmp,'Matched',sys(),{auto:true,note:'Automatic: the only transaction that matches exactly, and this the only line it matches'});return;}
      }
      const s1=x.soft.length===1?x.soft[0].t.id:null;
      const list=x.exact.length?x.exact:s1&&(softBy[s1]||[]).length===1&&!(byTxn[s1]||[]).length?x.soft:[];
      list.forEach(function(c){
        if(ccMatchOpenSugg(x.r.id,x.l.id,c.t.id).length)return;
        const cmp=ccMatchCompare(x.r,x.l,c.t,{});if(cmp.block&&cmp.kind!=='Amount Mismatch')return;
        if(cmp.ok){cmp.level=4;cmp.method='Suggested';cmp.diffs=[{field:'Ambiguous',expense:x.exact.length+' transaction(s) match this line exactly',txn:(byTxn[c.t.id]||[]).length+' line(s) match '+expKey(c.t)+' exactly',soft:true}];}
        const m=ccMatchNew(x.r,x.l,c.t,cmp,'Suggested',sys(),{auto:true,note:x.exact.length?'Ambiguous exact candidates: a person decides':'Similar but not identical'});
        ccNotify(ccPeopleWith('card.transaction.match',ent).filter(function(u){return u!==idUserOfEmp(x.r.employeeEid);}),expKey(m)+': a suggested match ('+expKey(c.t)+' ↔ '+ccLineRef(x.r,x.l)+') needs review.',m,'suggested');
      });
    });
    ccTxns.forEach(function(t){if(t.entity===ent)ccTxnMatchSet(t);});
  }finally{ccMatchBusy=false;}
}
/* The line's matching status (FRD §8.6 Expense Matching; G1 Awaiting Transaction Evidence). */
function ccLineMatchInfo(r,l){
  if(!l||l.paidBy!==CC_PAID_CARD)return null;
  const m=ccMatchOfLine(r.id,l.id),sug=ccMatchOpenSugg(r.id,l.id,null),t=Number(l.txnId)?ccTxn(l.txnId):null;
  if(m){const mt=ccTxn(m.txnId);return {status:'Matched',tone:'ok',match:m,txn:mt,category:'',text:'Matched to '+m.txnKey+' · '+expMoney(m.amount,m.currency)+' · '+m.confidence+(m.demo?' ('+CC_DEMO+')':'')};}
  if(['Rejected','Withdrawn'].indexOf(r.status)>=0)return {status:'Not Matched',tone:'idle',txn:t,category:'',text:'The claim was '+r.status.toLowerCase()+': no card transaction is held for it.'};
  if(r.status==='Draft'){
    if(!t)return {status:'Not Submitted',tone:'idle',category:'',text:'Matched to a card transaction once the claim is submitted.'};
    const prov=ccTxnProvisional(t);
    return {status:'Linked (Draft)',tone:'info',txn:t,category:'',text:'Created from '+expKey(t)+(prov?' – provisional: '+prov:'')+'. It is matched when the claim is submitted.'};
  }
  if(sug.length)return {status:'Suggested Match',tone:'wait',sugg:sug,txn:t,category:'Suggested Match Requires Review',text:sug.length+' suggested match'+(sug.length===1?'':'es')+' await review: '+sug.map(function(s){return s.txnKey;}).join(', ')+'.'};
  if(t){const cmp=ccMatchCompare(r,l,t,{manual:true});
    if(cmp.block)return {status:cmp.wait?'Awaiting Transaction Evidence':'Mismatch Exception',tone:cmp.wait?'wait':'bad',txn:t,category:cmp.kind,text:cmp.block};
    return {status:'Awaiting Transaction Evidence',tone:'wait',txn:t,category:'Expense Without Matching Transaction',text:'Created from '+expKey(t)+'; it is matched on the next check.'};}
  return {status:'Awaiting Transaction Evidence',tone:'wait',category:'Expense Without Matching Transaction',text:'No card transaction matches this line yet. Approval and reimbursement of the employee-paid part continue; the card-funded part is never reimbursed and is matched when the transaction reaches ADT.'};
}
/* Finance's matching exceptions (FR-CT-13, G1 rule 7): card-paid lines of submitted claims without a match, and
   matched transactions with an unmatched remainder. Drafts are the employee's own work in progress. */
function ccMatchExceptions(ent){
  ent=ent||ccEnt();ccMatchSync(ent);const out=[];
  ccClaimsOf(ent).forEach(function(r){
    if(CCM_SUBMITTED.indexOf(r.status)<0)return;
    ccCardLines(r).forEach(function(l){const i=ccLineMatchInfo(r,l);if(i&&i.status!=='Matched')out.push({kind:'line',r:r,l:l,info:i,category:i.category,amount:ccLineCardAmt(l),currency:r.currency});});
  });
  ccTxns.forEach(function(t){if(t.entity===ent&&t.matchStatus==='Partially Matched')out.push({kind:'txn',t:t,category:'Partially Matched',amount:t.unmatchedAmount,currency:t.matchCurrency,info:{status:'Partially Matched',tone:'wait',text:expMoney(t.unmatchedAmount,t.matchCurrency)+' of '+expKey(t)+' is not matched to any expense line.'}});});
  return out;
}
/* ── Who matches: Finance with card.transaction.match, or the claimant who holds the card (own claims, validated
   matches only); confirming differences and unmatching need card.transaction.match and independence ── */
function ccMatchOwn(A,r){const u=idUserOfEmp(r.employeeEid),via=caVia(A);return !!u&&(A.who===u||via===u);}
function ccMatchIndepWhy(A,r,t){
  const via=caVia(A),bad=ccUniq([idUserOfEmp(r.employeeEid),t?idUserOfEmp(t.employeeEid):'',r.createdBy,r.submittedBy].filter(Boolean));
  const hit=bad.find(function(u){return u===A.who||u===via;});
  return hit?caN(hit)+' is the claimant, cardholder or filer of this expense: someone independent with card.transaction.match decides on its differences.':'';
}
function ccMatchLine(claimId,lineId){const r=expRec(Number(claimId));if(!r||(r.entity&&r.entity!==ccEnt()))return {error:'No such claim.'};const l=(r.lines||[]).find(function(x){return x.id===Number(lineId);});
  if(!l||l.paidBy!==CC_PAID_CARD||!l.cardId)return {error:'Only a line paid by corporate card is matched to a card transaction.'};return {r:r,l:l};}
/* The differences a person accepts for a pair: today's comparison and those an open suggestion showed for it
   (an ambiguity between equal candidates is not a difference). */
function ccMatchPairDiffs(r,l,t,cmp){
  const out=(cmp.diffs||[]).slice(),seen={};out.forEach(function(d){seen[d.field]=1;});
  ccMatchOpenSugg(r.id,l.id,t.id).forEach(function(s){(s.diffs||[]).forEach(function(d){if(d.field!=='Ambiguous'&&!seen[d.field]){seen[d.field]=1;out.push(d);}});});
  return out;
}
/* d: {reason}. A validated pair is matched; a pair with differences is confirmed by an independent matcher with a
   reason, or proposed as a suggestion when the claimant (or a non-independent person) chose it. */
function ccMatchCreate(claimId,lineId,txnId,d,A){
  A=A||ccNow();d=d||{};
  const x=ccMatchLine(claimId,lineId);if(x.error)return x;const r=x.r,l=x.l;
  const fin=ccPCan(A,'card.transaction.match'),own=ccMatchOwn(A,r);
  if(!fin&&!own)return {error:caN(A.who)+' cannot match card transactions (card.transaction.match).'};
  if(CCM_SUBMITTED.indexOf(r.status)<0)return {error:r.status==='Draft'?expKey(r)+' is a draft: it is matched when submitted (create the expense from the transaction, or edit the line).':expKey(r)+' is '+r.status+'; its lines are not matched.'};
  ccMatchSync(r.entity);
  const cur=ccMatchOfLine(r.id,l.id);if(cur)return {error:ccLineRef(r,l)+' is already matched to '+cur.txnKey+': a line links to one card transaction at most. Unmatch it first to correct it.'};
  const t=ccTxn(txnId);if(!t||t.entity!==(r.entity||ccEnt()))return {error:'No such transaction.'};
  if(Number(l.txnId)&&Number(l.txnId)!==t.id){
    if(!fin)return {error:ccLineRef(r,l)+' was created from '+expKey(ccTxn(l.txnId)||{})+'. Finance corrects a wrong reference.'};
    if(String(d.reason||'').trim().length<10)return {error:ccLineRef(r,l)+' references '+expKey(ccTxn(l.txnId)||{})+': say why the line belongs to '+expKey(t)+' instead (at least 10 characters).'};
  }
  const cmp=ccMatchCompare(r,Object.assign({},l,{txnId:Number(l.txnId)===t.id?l.txnId:null}),t,{manual:true});
  if(cmp.block)return {error:cmp.block,kind:cmp.kind};
  const reason=String(d.reason||'').trim(),retarget=Number(l.txnId)&&Number(l.txnId)!==t.id,diffs=ccMatchPairDiffs(r,l,t,cmp);
  const setRef=function(){if(retarget){l.txnRefs=(l.txnRefs||[]).concat([{txnId:Number(l.txnId),until:ccStamp(A),by:A.who,reason:reason}]);l.txnId=t.id;}};
  const decided=function(){ccMatchOpenSugg(r.id,l.id,t.id).forEach(function(s){ccMatchEnd(s,'Superseded','decided directly by '+caN(A.who),A);});};
  if(cmp.ok&&!diffs.length){decided();setRef();const m=ccMatchNew(r,l,t,cmp,'Matched',A,{method:Number(l.txnId)===t.id&&!retarget?'Reference':'Manual',reason:reason});ccMatchSync(r.entity);return {rec:m};}
  if(fin&&!ccMatchIndepWhy(A,r,t)){
    if(reason.length<10)return {error:'The match has differences ('+diffs.map(function(y){return y.field+': '+y.expense+' vs '+y.txn;}).join('; ')+'). Give the reason for accepting them (at least 10 characters).',diffs:diffs};
    decided();setRef();const m=ccMatchNew(r,l,t,cmp,'Matched',A,{method:'Confirmed Suggestion',reason:reason,diffs:diffs,accepted:{reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A),snap:ccLineSnap(r,l),diffs:diffs.slice()}});
    ccMatchSync(r.entity);return {rec:m};
  }
  if(ccMatchOpenSugg(r.id,l.id,t.id).length)return {error:'This pair is already suggested for review.'};
  const m=ccMatchNew(r,l,t,cmp,'Suggested',A,{proposedBy:A.who,reason:reason,note:'Proposed by '+caN(A.who)+' with differences'});
  ccNotify(ccPeopleWith('card.transaction.match',r.entity||ccEnt()).filter(function(u){return !ccMatchIndepWhy({who:u},r,t);}),expKey(m)+': '+caN(A.who)+' proposed matching '+expKey(t)+' to '+ccLineRef(r,l)+'; the differences need review.',m,'proposed');
  ccMatchSync(r.entity);return {rec:m,suggested:true};
}
function ccMatchConfirm(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const m=ccMatch(id);if(!m||m.entity!==ccEnt())return 'No such match.';
  if(m.status!=='Suggested')return expKey(m)+' is '+m.status+'; only a suggested match is confirmed.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot confirm matches (card.transaction.match).';
  const r=expRec(m.claimId),t=ccTxn(m.txnId),x=ccMatchLine(m.claimId,m.lineId);if(x.error)return x.error;
  const ind=ccMatchIndepWhy(A,r,t);if(ind)return ind;
  ccMatchSync(r.entity);if(m.status!=='Suggested')return expKey(m)+' is no longer open ('+m.status+(m.endNote?': '+m.endNote:'')+').';
  const cmp=ccMatchCompare(r,x.l,t,{manual:true});if(cmp.block)return 'Cannot confirm: '+cmp.block;
  const diffs=ccMatchPairDiffs(r,x.l,t,cmp);
  if(diffs.length&&reason.length<10)return 'Say why the differences are accepted (at least 10 characters): '+diffs.map(function(y){return y.field+' '+y.expense+' vs '+y.txn;}).join('; ')+'.';
  ccMatchEnd(m,'Confirmed','confirmed by '+caN(A.who)+(reason?': '+reason:''),A);
  const n=ccMatchNew(r,x.l,t,cmp,'Matched',A,{method:diffs.length?'Confirmed Suggestion':cmp.method==='Manual'?'Manual':cmp.method,reason:reason,diffs:diffs,
    accepted:diffs.length?{reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A),snap:ccLineSnap(r,x.l),diffs:diffs.slice(),from:expKey(m)}:null,note:'Confirmed from '+expKey(m)});
  m.confirmedAs=n.id;ccMatchOpenSugg(r.id,x.l.id,null).forEach(function(s){ccMatchEnd(s,'Superseded','the line was matched to '+n.txnKey,A);});
  ccMatchSync(r.entity);return '';
}
function ccMatchReject(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const m=ccMatch(id);if(!m||m.entity!==ccEnt())return 'No such match.';
  if(m.status!=='Suggested')return expKey(m)+' is '+m.status+'; only a suggested match is rejected.';
  const r=expRec(m.claimId);if(!r)return 'No such claim.';
  if(!ccPCan(A,'card.transaction.match')&&!ccMatchOwn(A,r))return caN(A.who)+' cannot decide on matches (card.transaction.match).';
  if(reason.length<5)return 'Say why it is not a match.';
  ccMatchEnd(m,'Rejected','rejected by '+caN(A.who)+': '+reason+'. The pair is not suggested again',A);
  ccMatchSync(r.entity);return '';
}
/* Correct an incorrect match (FR-CT-10.13, 11.10): the match is ended with its history; a wrong reference on the
   line is set aside (kept in the line's history); the pair is never matched again automatically. */
function ccMatchRemove(id,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const m=ccMatch(id);if(!m||m.entity!==ccEnt())return 'No such match.';
  if(m.status!=='Matched')return expKey(m)+' is '+m.status+'; it was already '+(m.status==='Unmatched'?'unmatched':'ended')+'.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot unmatch card transactions (card.transaction.match).';
  const r=expRec(m.claimId),t=ccTxn(m.txnId),ind=r?ccMatchIndepWhy(A,r,t):'';if(ind)return ind;
  if(reason.length<10)return 'Say why the match is incorrect (at least 10 characters); the match and its history are kept.';
  ccMatchEnd(m,'Unmatched','unmatched by '+caN(A.who)+': '+reason,A);
  const l=r&&(r.lines||[]).find(function(x){return x.id===m.lineId;});
  if(l&&Number(l.txnId)===m.txnId){l.txnRefs=(l.txnRefs||[]).concat([{txnId:m.txnId,until:ccStamp(A),by:A.who,reason:reason}]);l.txnId=null;}
  ccMatchSync(m.entity);return '';
}

/* ── Create Expense from a card transaction (FR-CT-09, WF-CT-03) ── */
function ccTxnProvisional(t){
  if(!t||t.demo)return '';
  if(t.status==='Pending Authorization')return 'pending authorization, not yet settled';
  if((t.verify||{}).status===CCT_UNDER)return 'the transaction awaits independent verification';
  return '';
}
/* What of a transaction is still free to claim, in its own currency (one claim per transaction). */
function ccTxnFree(t,cur){
  const el=ccTxnEligible(t,cur||t.currency);if(el.error)return {error:el.error};
  const h=ccTxnHolds(t,{}),claim=h.length?expRec(h[0].claimId):null;
  const used=ccM(h.filter(function(x){return x.currency===el.currency;}).reduce(function(s,x){return s+x.amount;},0));
  return {amount:ccM(Math.max(0,el.amount-used)),eligible:el.amount,used:used,claim:claim,currency:el.currency};
}
function ccTxnExpenseWhyNot(t,A){
  A=A||ccNow();
  if(!t||t.entity!==ccEnt())return 'No such transaction.';
  if(typeof mcOn==='function'&&(!mcOn('cards')||!mcOn('expenses')))return 'Expenses or Corporate Cards is switched off for this entity.';
  if(t.walletClass==='Flexi Benefit')return expKey(t)+' was spent from the '+wbTypeName(t.wallet)+' benefit wallet: benefit spending follows the Wallet & Benefits rules; no expense claim is created for it.';
  if(t.direction==='Credit')return expKey(t)+' is a '+String(t.type||'credit').toLowerCase()+': refunds and reversals are linked to their original purchase, not claimed.';
  if(t.status==='Declined'||t.status==='Voided')return expKey(t)+' was '+t.status.toLowerCase()+': it was never settled, so there is nothing to claim.';
  if(!t.demo&&(t.verify||{}).status===CCT_REJECTED)return expKey(t)+' is Verification Rejected (Unverified): it is not evidence of a card payment until it is corrected and verified.';
  const f=ccTxnFree(t,t.currency);if(f.error)return f.error;
  if(f.claim&&CCM_LIVE.indexOf(f.claim.status)>=0&&f.amount<=0)return expKey(t)+' is fully claimed by '+expKey(f.claim)+'.';
  if(f.claim)return expKey(t)+' is already claimed by '+expKey(f.claim)+' ('+f.claim.status+'): one transaction belongs to one claim. Split it by adding lines to '+expKey(f.claim)+'.';
  const own=idUserOfEmp(t.employeeEid)===A.who;
  if(own){if(!ccPCan(A,'expense.claim.submit'))return caN(A.who)+' cannot file expense claims (expense.claim.submit).';}
  else if(!ccPCan(A,'expense.claim.create.others'))return 'Only the cardholder files an expense for their own card transaction (or someone with expense.claim.create.others, on their behalf).';
  return '';
}
/* A line in the Add Expense form that carries a transaction reference (FR-CT-09.04-05, 11.03). */
function ccExpTxnCheck(d,ctx,cardAmt){
  ctx=ctx||{};const t=ccTxn(d.txnId);if(!t||t.entity!==ccEnt())return 'The card transaction of this line is not available.';
  if(Number(d.cardId)!==t.cardId)return 'The line was created from '+expKey(t)+' on '+t.cardRef.key+': its card cannot change. Unlink the transaction to claim on another card.';
  if(t.employeeEid!==ctx.eid)return expKey(t)+' is '+t.name+'\'s card transaction: it is claimed for its own cardholder.';
  const w=ccTxnExpenseWhyNotBasic(t);if(w)return w;
  const el=ccTxnEligible(t,ctx.currency||t.currency);if(el.error)return el.error;
  const td=ccTxnLocalDate(t);if(d.start&&!(td>=d.start&&td<=(d.end||d.start)))return expKey(t)+' is dated '+cdLabel(td)+': the line\'s Start and End Date must include it.';
  const holds=ccTxnHolds(t,{claimId:ctx.claimId==null?null:ctx.claimId,lineId:ctx.lineId==null?null:ctx.lineId}),other=holds.find(function(h){return h.claimId!==ctx.claimId;});
  if(other)return expKey(t)+' is already claimed by '+expKey(expRec(other.claimId)||{})+': one card transaction belongs to one claim.';
  let used=ccM(holds.reduce(function(s,h){return s+h.amount;},0));
  /* Other items of the same new claim in the Add Expense popup (while an item is checked, expDraft is that item). */
  const cd=ctx.claimId==null&&typeof expModalOpen!=='undefined'&&expModalOpen?ccExpClaimDraft:null;
  if(cd&&cd.lines)cd.lines.forEach(function(x){if(x!==d&&Number(x.txnId)===t.id)used=ccM(used+ccM(Math.min(Number(x.cardAmount)||0,Number(x.amount)||0)));});
  const rem=ccM(el.amount-used);
  if(cardAmt>rem+1e-9&&!(el.allowance&&cardAmt<=rem+el.allowance+1e-9&&ccFxRoundOk(t,ccM(used+cardAmt))))
    return 'The card-funded amount cannot exceed what remains of '+expKey(t)+': '+expMoney(rem,el.currency)+(used?' of '+expMoney(el.amount,el.currency):'')+'. The transaction amount itself is never changed.';
  return '';
}
function ccTxnExpenseWhyNotBasic(t){
  if(t.walletClass==='Flexi Benefit')return expKey(t)+' was spent from a benefit wallet: it is not claimed as a corporate expense.';
  if(t.direction==='Credit')return expKey(t)+' is a '+String(t.type||'credit').toLowerCase()+', not a purchase.';
  if(t.status==='Declined'||t.status==='Voided')return expKey(t)+' was '+t.status.toLowerCase()+' and never settled.';
  if(!t.demo&&(t.verify||{}).status===CCT_REJECTED)return expKey(t)+' is Verification Rejected (Unverified).';
  return '';
}
/* The claim being filed in the Add Expense popup (expDraft points at the item while an item is checked). */
let ccExpClaimDraft=null;
ccHook('startAddExpense',null,function(){ccExpClaimDraft=typeof expModalOpen!=='undefined'&&expModalOpen?expDraft:null;return undefined;});
/* Extra fields a line keeps when it was created from a transaction (read by the line form when editing). */
function ccExpLineDraftExtra(l){return l&&Number(l.txnId)?{txnId:Number(l.txnId),txnAt:l.txnAt||''}:{};}

/* ── B8-N12: External Provider Card ID on the existing Card Record (restricted; optional; additive) ──
   A stable, non-sensitive identifier SUPPLIED by the provider, recorded from its confirmation and verified by
   someone independent before it maps statement rows. Never a card number, CVV, PIN or authentication token;
   never invented; never shown in full; the masked card reference stays the display reference. */
function ccExtIdMask(v){v=String(v||'');return v.length>6?v.slice(0,2)+'••••'+v.slice(-4):'••••';}
function ccCardExtIdOf(c){const x=c&&c.extCardId;if(!x)return '';if(x.status==='Confirmed')return x.value;return x.prev&&x.prev.status==='Confirmed'?x.prev.value:'';}
function ccCardExtIdSees(){return ['card.lifecycle.manage','card.transaction.import','card.transaction.verify'].some(ccCan);}
function ccCardExtIdVerifiers(c){const x=c.extCardId||{},h=idUserOfEmp(c.employeeEid);return ccPeopleWith('card.transaction.verify',c.entity).filter(function(u){return u!==x.by&&u!==x.actual&&u!==h&&(typeof caActive!=='function'||caActive(u));});}
function ccCardExtIdRecord(cardId,d,A){
  A=A||ccNow();d=d||{};const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  if(!ccPCan(A,'card.lifecycle.manage'))return caN(A.who)+' cannot change card records (card.lifecycle.manage).';
  if(!c.provider)return expKey(c)+' has no provider: a provider card ID is supplied only by the issuing provider.';
  if(c.extCardId&&c.extCardId.status==='Awaiting Verification')return 'A provider card ID for '+expKey(c)+' already awaits verification.';
  const v=String(d.value||'').trim();
  if(ccPanMask(v))return 'That looks like a full card number. The provider card ID is a separate, non-sensitive identifier: never enter the card number, CVV, PIN or an authentication token.';
  if(!/^[A-Za-z0-9][A-Za-z0-9._:\-]{5,63}$/.test(v))return 'Enter the provider card ID exactly as the provider supplied it (6 to 64 letters, digits, dot, dash, colon or underscore).';
  if(/^CRD-?\d+$/i.test(v))return v+' is an ADT card record ID, not an identifier from the provider.';
  if(ccCardExtIdOf(c).toLowerCase()===v.toLowerCase())return 'This is already the confirmed provider card ID of '+expKey(c)+'.';
  const dup=ccCards.find(function(x){return x.id!==c.id&&x.provider===c.provider&&x.programmeId===c.programmeId&&x.extCardId&&['Confirmed','Awaiting Verification'].indexOf(x.extCardId.status)>=0&&String(x.extCardId.value).toLowerCase()===v.toLowerCase();});
  if(dup)return 'This provider card ID is already recorded on '+expKey(dup)+' for '+(ccProg(c.programmeId)||{}).code+': an ID identifies one card of the programme.';
  const meaning=String(d.meaning||'').trim(),ref=String(d.ref||'').trim(),ev=String(d.evidence||'').trim();
  if(meaning.length<5)return 'Say what the provider confirms the ID identifies (for example: this card account on every statement).';
  if(ref.length<3)return 'Enter the provider\'s reference for its confirmation (letter, portal record or e-mail).';
  if(!ev)return 'Attach the provider\'s confirmation of the ID and its meaning.';
  const prev=c.extCardId?(c.extCardId.status==='Confirmed'?c.extCardId:c.extCardId.prev||null):null;
  c.extCardId={value:v,status:'Awaiting Verification',meaning:meaning,ref:ref,evidence:ev,source:'Provider-supplied',by:A.who,actual:caVia(A),at:ccStamp(A),prev:prev,
    history:((c.extCardId&&c.extCardId.history)||[]).concat([{at:ccStamp(A),by:A.who,to:'Awaiting Verification',value:ccExtIdMask(v)}])};
  ccLog(c,c.status,'Provider card ID recorded by '+caN(A.who)+' (restricted; '+ccExtIdMask(v)+') from '+ccProviderName(c.provider)+'\'s confirmation ('+ref+', '+ev+'): '+meaning+'. It maps statement rows only after someone independent verifies it.'+(prev?' The confirmed ID '+ccExtIdMask(prev.value)+' stays in use until then.':''),A);
  ccNotify(ccCardExtIdVerifiers(c),expKey(c)+': a provider card ID awaits your verification.',c,'extid-'+c.extCardId.history.length);
  return '';
}
function ccCardExtIdWhyNot(c,A){
  const x=c&&c.extCardId;if(!x||x.status!=='Awaiting Verification')return 'No provider card ID awaits verification on this card.';
  if(!ccPCan(A,'card.transaction.verify'))return caN(A.who)+' cannot verify card evidence (card.transaction.verify).';
  const via=caVia(A),h=idUserOfEmp(c.employeeEid);
  if(A.who===x.by||via===x.by||(x.actual&&(A.who===x.actual||via===x.actual)))return 'Maker-checker: '+caN(x.by)+' recorded this ID; someone else verifies it.';
  if(A.who===h||via===h)return caN(h)+' holds the card and does not verify its identifiers.';
  return '';
}
function ccCardExtIdVerify(cardId,A){
  A=A||ccNow();const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const w=ccCardExtIdWhyNot(c,A);if(w)return w;const x=c.extCardId;
  x.status='Confirmed';x.verifiedBy=A.who;x.verifiedActual=caVia(A);x.verifiedAt=ccStamp(A);x.history.push({at:ccStamp(A),by:A.who,to:'Confirmed',value:ccExtIdMask(x.value)});
  ccLog(c,c.status,'Provider card ID '+ccExtIdMask(x.value)+' verified by '+caN(A.who)+' against the provider\'s confirmation. Statement rows that carry it map to '+expKey(c)+' automatically.',A);
  return '';
}
function ccCardExtIdReject(cardId,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const c=ccCard(cardId);if(!c||c.entity!==ccEnt())return 'No such card.';
  const w=ccCardExtIdWhyNot(c,A);if(w)return w;if(reason.length<5)return 'Say why the ID is rejected.';
  const x=c.extCardId,hist=x.history.concat([{at:ccStamp(A),by:A.who,to:'Rejected',value:ccExtIdMask(x.value),reason:reason}]);
  c.extCardId=x.prev?Object.assign({},x.prev,{history:hist}):{value:'',status:'Rejected',history:hist,rejected:{value:ccExtIdMask(x.value),reason:reason,by:A.who,at:ccStamp(A)}};
  ccLog(c,c.status,'Provider card ID '+ccExtIdMask(x.value)+' rejected by '+caN(A.who)+': '+reason+'.'+(x.prev?' The confirmed ID '+ccExtIdMask(x.prev.value)+' stays in use.':' No provider card ID is used for this card.'),A);
  return '';
}

/* ── B8-N09 C: correct the statement period while it is prepared (before and after kept) ── */
function ccStmtPeriodEdit(id,from,to,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  const may=ccStmtMayEdit(s,A);if(may)return may;
  const f=ccStmtDate(from),t=ccStmtDate(to);
  if(!f||!t)return 'Enter the statement period (from and to).';if(f>t)return 'The statement period ends before it starts.';if(t>wbToday())return 'The statement period cannot end in the future.';
  if(f===s.periodFrom&&t===s.periodTo)return 'Nothing changed.';
  if(reason.length<5)return 'Say why the statement period is corrected (for example: as printed on the provider statement).';
  const was=ccStmtPeriodText(s);s.periodHistory=(s.periodHistory||[]).concat([{from:s.periodFrom,to:s.periodTo,newFrom:f,newTo:t,reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A)}]);
  s.periodFrom=f;s.periodTo=t;ccStmtRefresh(s,A,'Statement period corrected');
  ccLog(s,s.importStatus,'Statement period corrected by '+caN(A.who)+': '+was+' → '+ccStmtPeriodText(s)+'. Reason: '+reason+'. Every row was validated again.',A);
  return '';
}
function ccStmtLocalDate(dd,tz,ent){if(!dd.time)return dd.date;const x=ccTxnEntityLocal(dd,tz,ent);return x?x.slice(0,10):dd.date;}
/* Refunds already claimed against an original (B8-N09 D): verified credits linked to it, and earlier rows here. */
function ccStmtRefundsOf(s,row,o){
  const P=row.parsed,ref=P.ref.toLowerCase();let sum=0;
  if(o.txnId)ccTxns.forEach(function(t){if(t.direction==='Credit'&&t.refundOf&&t.refundOf.id===o.txnId&&(t.verify||{}).status!==CCT_REJECTED&&String(t.extRef||'').toLowerCase()!==ref)sum+=t.billAmount;});
  s.rows.forEach(function(x){if(x.n<row.n&&x.parsed&&x.parsed.lf.credit&&x.parsed.orig&&(!ref||x.parsed.ref.toLowerCase()!==ref)&&['New','Linked','Review Required'].indexOf(x.status)>=0&&(o.txnId?x.parsed.orig.txnId===o.txnId:x.parsed.orig.row===o.row))sum+=x.parsed.billAmount;});
  return ccM(sum);
}

/* ── Matching follows every claim and transaction event (the claim itself is never changed by it) ── */
['submitAddExpense','expSaveLine','expSaveEdit','caStart','caDecide','caWithdraw','caResubmit','caFollowUp','caAdminEditDone',
 'ccTxnRecord','ccTxnVerify','ccTxnReject','ccTxnPost','ccTxnVoid','ccTxnSimulate','ccTxnResubmit','ccStmtVerify'].forEach(function(fn){
  ccHook(fn,null,function(){try{ccMatchSync();}catch(e){if(typeof console!=='undefined')console.error('Card matching',e);}return undefined;});
});


/* ══ Build 8D · FR-CT-12, 13, 14, 22 · Claim policy, reminders, missing evidence, card spend exceptions ══════════
   Product-owner decisions of 8 Nov 2026 ("FR-CT Build 8C Acceptance and 8D Direction"), B8-N16:
   A. A claim may be submitted from a pending or unverified transaction; the transaction is never treated as
      verified evidence; a posting at a different amount, a void or a decline raises a Finance exception and never
      rewrites the claim or the transaction.
   B. A draft keeps a provisional transaction reference but never reserves the transaction; everything is
      revalidated on submission.
   C. A rejected or withdrawn claim releases its matches; a CSX computed for a claim rejected without any approved
      amount is superseded (Requires Reassessment), never left as an active obligation; a partially approved
      claim keeps its CSX; an approved claim keeps its matches.
   E. Suggestions also allow posting-date differences, merchant-description variations and an exact amount on
      another date; Find Match searches every eligible transaction of the cardholder.
   F. A claim in a third currency is never blocked; it stays unmatched until Finance compares it at ADT's own
      exchange rate (never 1:1, never Exact or FX Matched). */

/* ── B8-N16 B: only submitted claims hold a transaction; a draft's reference is provisional ── */
function ccTxnHolds(t,except){
  except=except||{};const out=[];
  ccMatchesOfTxn(t.id).forEach(function(m){if(m.claimId===except.claimId&&m.lineId===except.lineId)return;out.push({claimId:m.claimId,lineId:m.lineId,amount:m.amount,currency:m.currency,match:m});});
  ccClaimsOf(t.entity).forEach(function(r){
    if(CCM_SUBMITTED.indexOf(r.status)<0)return;
    ccCardLines(r).forEach(function(l){
      if(Number(l.txnId)!==t.id||(r.id===except.claimId&&l.id===except.lineId)||ccMatchOfLine(r.id,l.id))return;
      out.push({claimId:r.id,lineId:l.id,amount:ccLineCardAmt(l),currency:r.currency,ref:true});
    });
  });
  return out;
}
/* Lines of the same claim (a draft being edited, or the claim on submission) that reference the transaction. */
function ccClaimTxnUse(r,t,exceptLineId){
  return r?ccM(ccCardLines(r).filter(function(l){return Number(l.txnId)===t.id&&l.id!==exceptLineId&&!ccMatchOfLine(r.id,l.id);}).reduce(function(s,l){return s+ccLineCardAmt(l);},0)):0;
}

/* The Add Expense check of a line made from a transaction (8C), now with B8-N16: drafts reserve nothing, so the
   claim's own lines are added explicitly; a third currency is never refused (it stays for Finance comparison);
   an overdue transaction needs a late claim justification at submission (FR-CT-12.07). */
function ccExpTxnCheck(d,ctx,cardAmt,o){
  ctx=ctx||{};o=o||{};const t=ccTxn(d.txnId);if(!t||t.entity!==ccEnt())return 'The card transaction of this line is not available.';
  if(Number(d.cardId)!==t.cardId)return 'The line was created from '+expKey(t)+' on '+t.cardRef.key+': its card cannot change. Unlink the transaction to claim on another card.';
  if(t.employeeEid!==ctx.eid)return expKey(t)+' is '+t.name+'\'s card transaction: it is claimed for its own cardholder.';
  const w=ccTxnExpenseWhyNotBasic(t);if(w)return w;
  if(d.start&&!ccLineCoversTxn(d,t))return expKey(t)+' is dated '+cdLabel(ccTxnLocalDate(t))+(t.postDate&&t.postDate!==ccTxnLocalDate(t)?' (posted '+cdLabel(t.postDate)+')':'')+': the line\'s Start and End Date must include it.';
  const holds=ccTxnHolds(t,{claimId:ctx.claimId==null?null:ctx.claimId,lineId:ctx.lineId==null?null:ctx.lineId}),other=holds.find(function(h){return h.claimId!==ctx.claimId;});
  if(other)return expKey(t)+' is already claimed by '+expKey(expRec(other.claimId)||{})+' ('+((expRec(other.claimId)||{}).status||'')+'): one card transaction belongs to one claim.';
  const el=ccTxnEligible(t,ctx.currency||t.currency);
  if(!el.error&&!el.assisted){
    let used=ccM(holds.reduce(function(s,h){return s+h.amount;},0));
    const cr=ctx.claim||(ctx.claimId!=null?expRec(ctx.claimId):null);
    if(cr&&CCM_SUBMITTED.indexOf(cr.status)<0)used=ccM(used+ccClaimTxnUse(cr,t,ctx.lineId));
    const cd=ctx.claimId==null&&!ctx.claim&&typeof expModalOpen!=='undefined'&&expModalOpen?ccExpClaimDraft:null;
    if(cd&&cd.lines)cd.lines.forEach(function(x){if(x!==d&&Number(x.txnId)===t.id)used=ccM(used+ccM(Math.min(Number(x.cardAmount)||0,Number(x.amount)||0)));});
    const rem=ccM(el.amount-used);
    if(cardAmt>rem+1e-9&&!(el.allowance&&cardAmt<=rem+el.allowance+1e-9&&ccFxRoundOk(t,ccM(used+cardAmt))))
      return 'The card-funded amount cannot exceed what remains of '+expKey(t)+': '+expMoney(rem,el.currency)+(used?' of '+expMoney(el.amount,el.currency):'')+'. The transaction amount itself is never changed.';
  }
  if(o.submit||!ccDraftSaving){const ln=ccLineLateNeed(d,ctx);
    if(ln&&String(d.lateJust||'').trim().length<10)return 'Late claim: '+expKey(t)+' was due on '+cdLabel(ln.due)+' ('+ln.policy.days+' days after posting). Give the Late Claim Justification (at least 10 characters); the claim is then accepted and approved as usual.';}
  return '';
}
/* ── B8-N16 F: a third currency is compared only at ADT's own rate, by Finance, never automatically ── */
const ccTxnEligibleBase=ccTxnEligible;
ccTxnEligible=function(t,cur){
  const el=ccTxnEligibleBase(t,cur);
  if(!el.error||el.kind!=='fx'||!t||cur===t.currency||cur===t.billCurrency)return el;
  const r=typeof epRate==='function'?epRate(t.billCurrency,cur,t.date):null;
  if(!r)return {error:'No conversion basis: '+expKey(t)+' was billed in '+t.billCurrency+' and the claim is in '+cur+'; ADT has no '+t.billCurrency+'→'+cur+' exchange rate on '+cdLabel(t.date)+' (Company Settings → Exchange Rates). Nothing is assumed 1:1; the line stays unmatched.',kind:'fx'};
  return {amount:ccM(t.billAmount*r.rate),currency:cur,basis:'ADT exchange rate '+(Math.round(r.rate*1e6)/1e6)+' (Finance-assisted comparison)',allowance:0,fx:false,assisted:true,adtRate:r.rate};
};

/* ── B8-N16 E: what counts as similar ── */
const CCM_GENERIC=['store','stores','hotel','hotels','india','private','limited','services','service','retail','online','payments','restaurant','the','and','pvt','ltd','company','shop'];
function ccMerchSimilar(a,b){
  a=ccMerchNorm(a);b=ccMerchNorm(b);if(!a||!b)return false;
  if(a===b||(a.length>=4&&b.indexOf(a)>=0)||(b.length>=4&&a.indexOf(b)>=0))return true;
  /* A merchant-description variation keeps the brand: the first significant word must agree (exactly, or on its first five
     letters), so "Uber India" ~ "Uber Trip" and "The Leela Palace" ~ "Leela Palace Hotel", but "Chai Point" is not "Fuel Point". */
  const sig=function(x){return x.split(' ').filter(function(w){return w.length>=3&&CCM_GENERIC.indexOf(w)<0;});},ta=sig(a),tb=sig(b);
  if(!ta.length||!tb.length)return false;const w=ta[0],v=tb[0];
  return w===v||(w.length>=5&&v.length>=5&&w.slice(0,5)===v.slice(0,5));
}
/* A line's dates may hold the transaction date or its posting date (B8-N16 E: valid posting-date differences). */
function ccLineCoversTxn(l,t){const s=l.start,e=l.end||l.start,td=ccTxnLocalDate(t);return (td>=s&&td<=e)||(!!t.postDate&&t.postDate>=s&&t.postDate<=e);}

/* ── B8-N16 A: a pending authorization posted at a different final amount (8A posting, 8B statement) ── */
const ccTxnPostBase=ccTxnPost;
ccTxnPost=function(id,d,A){
  d=d||{};const t=ccTxn(id);
  const raw=String(d.amount==null?'':d.amount).replace(/,/g,'').trim();
  if(!t||!raw)return ccTxnPostBase(id,d,A);
  const amt=Number(raw);
  if(!(amt>0)||Math.abs(amt*100-Math.round(amt*100))>1e-6)return 'Enter the posted amount as the provider reports it (more than zero, at most two decimals).';
  if(t.currency!==t.billCurrency){const ba=Number(String(d.billAmount==null?'':d.billAmount).replace(/,/g,''));if(!(ba>0))return 'Enter the posted billing amount in '+t.billCurrency+' as the provider reports it.';}
  const out=ccTxnPostBase(id,d,A);
  if(!out&&t.pendingPost){t.pendingPost.amount=ccM(amt);if(t.currency!==t.billCurrency)t.pendingPost.billAmount=ccM(Number(String(d.billAmount).replace(/,/g,'')));}
  else if(!out&&t.demo&&ccM(amt)!==t.amount)ccTxnSettleAmount(t,{amount:ccM(amt),billAmount:t.currency===t.billCurrency?ccM(amt):ccM(Number(String(d.billAmount||amt).replace(/,/g,'')))},A||ccNow(),'Illustrative posting');
  return out;
};
/* The authorization amount is kept; the transaction is the settled amount the provider reported. */
function ccTxnSettleAmount(t,s,A,why){
  if(!s||s.amount==null||(ccM(s.amount)===t.amount&&(s.billAmount==null||ccM(s.billAmount)===t.billAmount)))return;
  t.authAmount=t.authAmount!=null?t.authAmount:t.amount;t.authBillAmount=t.authBillAmount!=null?t.authBillAmount:t.billAmount;
  const was=t.amount;t.amount=ccM(s.amount);t.billAmount=t.currency===t.billCurrency?t.amount:ccM(s.billAmount!=null?s.billAmount:t.billAmount);
  t.lifecycle.push({from:'Pending Authorization',to:'Posted',at:ccStamp(A),by:A.who,actual:caVia(A),note:'Authorized '+expMoney(was,t.currency)+'; posted '+expMoney(t.amount,t.currency)+' ('+why+')'});
  ccLog(t,t.status,'Posted at '+expMoney(t.amount,t.currency)+(t.currency!==t.billCurrency?' (billed '+expMoney(t.billAmount,t.billCurrency)+')':'')+'; the authorization was '+expMoney(was,t.currency)+' ('+why+'). The authorization amount is kept; any claim made from it is re-evaluated and a difference goes to Finance.',A);
  if(typeof ccMatchSync==='function')ccMatchSync(t.entity);
}
const ccTxnVerifyBase=ccTxnVerify;
ccTxnVerify=function(id,A){
  const t=ccTxn(id),pp=t&&t.pendingPost?Object.assign({},t.pendingPost):null;
  const out=ccTxnVerifyBase(id,A);
  if(!out&&pp&&pp.amount!=null)ccTxnSettleAmount(t,{amount:pp.amount,billAmount:pp.billAmount},A||ccNow(),'posting '+pp.ref+' verified');
  return out;
};
/* A verified statement row posting a verified authorization at another amount is its settlement, not a conflict. */
const ccStmtCompareBase=ccStmtCompare;
ccStmtCompare=function(s,row,t,viaNear){
  const P=row.parsed,settling=!s.demo===!t.demo&&t.status==='Pending Authorization'&&P.lf.life==='Posted'&&!P.lf.credit&&t.currency===P.currency&&t.cardId===P.cardId
    &&(t.demo||(t.verify||{}).status===CCT_VERIFIED)&&(t.amount!==P.amount||t.billAmount!==P.billAmount);
  if(!settling)return ccStmtCompareBase(s,row,t,viaNear);
  const keep={amount:t.amount,billAmount:t.billAmount};t.amount=P.amount;t.billAmount=P.billAmount;
  let m;try{m=ccStmtCompareBase(s,row,t,viaNear);}finally{t.amount=keep.amount;t.billAmount=keep.billAmount;}
  if(m.status==='Linked'&&m.progress==='Posted')m.settle={amount:P.amount,billAmount:P.billAmount,from:keep.amount};
  return m;
};
const ccStmtLinkTxnBase=ccStmtLinkTxn;
ccStmtLinkTxn=function(s,row,A){
  const m=row.match,t=m?ccTxn(m.txnId):null,before=t?t.status:'';
  ccStmtLinkTxnBase(s,row,A);
  if(m&&m.settle&&t&&before==='Pending Authorization'&&t.status==='Posted')ccTxnSettleAmount(t,m.settle,A,'statement '+expKey(s)+' row '+row.n);
};

/* ══ FR-CT-12 · Claim policy (Company Settings → Card Programmes) ══════════════════════════════════════════════
   Entity policy with optional programme overrides, effective-dated and versioned. Not configured = claims expected
   (FR-CT-13.01 visibility) but no window, no due date, no reminder (rules 1, 2). The policy in force on a
   transaction's posting date applies to it, so a later change never reaches back (rules 9, 10). */
const ccClaimPolBook={};
function ccClaimPols(ent){ent=ent||ccEnt();return ccClaimPolBook[ent]||(ccClaimPolBook[ent]={versions:[],nextV:1,logs:[]});}
const CCP_DEFAULT={requireClaim:true,windowOn:false,days:null,remind:[],overdueEvery:0,escalation:null,configured:false};
function ccClaimPolPick(list){return list.slice().sort(function(a,b){return a.effFrom<b.effFrom?1:a.effFrom>b.effFrom?-1:b.v-a.v;})[0]||null;}
function ccClaimPolAt(ent,programmeId,iso){
  const vs=ccClaimPols(ent).versions.filter(function(v){return v.effFrom<=iso;});
  const po=ccClaimPolPick(vs.filter(function(v){return v.scope==='programme'&&v.programmeId===programmeId;}));
  if(po&&!po.inherit)return Object.assign({},po,{source:'Programme override',configured:true});
  const en=ccClaimPolPick(vs.filter(function(v){return v.scope==='entity';}));
  return en?Object.assign({},en,{source:'Entity policy',configured:true}):Object.assign({},CCP_DEFAULT,{source:'Not configured'});
}
function ccClaimPolText(p){
  if(!p.configured)return 'Not configured: claims are expected, with no submission window, due date or reminder.';
  if(!p.requireClaim)return 'No card expense claim required.';
  return 'Claim required'+(p.windowOn?' within '+p.days+' day'+(p.days===1?'':'s')+' of posting'+(p.remind.length?'; reminders '+p.remind.join(', ')+' day'+(p.remind.length===1&&p.remind[0]===1?'':'s')+' before':'; no due-soon reminder')
    +(p.overdueEvery?'; overdue reminder every '+p.overdueEvery+' days':'')+(p.escalation?'; escalates to '+ccClaimEscLabel(p.escalation)+' after '+(p.escAfter||1)+' day'+((p.escAfter||1)===1?'':'s')+' overdue':''):'; no submission window');
}
/* Escalation recipient: an existing role (Company Settings → Roles & Access) or an RBAC workspace team. */
/* Escalation recipient (B8-N22-04, 8 Nov 2026): the cardholder's reporting manager, an existing role (Company Settings →
   Roles & Access) or an RBAC workspace team. Only the configured recipient is told; nobody else is escalated to. */
function ccClaimEscOptions(){
  const roles=ccUniq((typeof csRoles!=='undefined'?csRoles:[]).filter(function(r){return r.entityId===ccEnt()||r.entityId==='*';}).map(function(r){return r.role;})).sort();
  const teams=typeof caTeams==='function'?caTeams():[];
  return [{kind:'manager',ref:'manager',label:'Reporting Manager of the cardholder'}]
    .concat(roles.map(function(r){return {kind:'role',ref:r,label:'Role: '+r};}),teams.map(function(t){return {kind:'team',ref:t.id,label:'Team: '+t.name};}));
}
function ccClaimEscLabel(e){return !e?'':e.kind==='manager'?'Reporting Manager of the cardholder':e.kind==='role'?'Role: '+e.ref:'Team: '+(typeof caTeamName==='function'?caTeamName(e.ref):e.ref);}
function ccClaimEscPeople(e,ent,t){
  if(!e)return [];
  const act=function(u){return !!u&&u!=='System'&&(typeof caActive!=='function'||caActive(u));};
  if(e.kind==='manager'){const m=t&&typeof caManagerOf==='function'?caManagerOf(t.employeeEid):'';return act(m)?[m]:[];}
  if(e.kind==='role')return (typeof caRoleUsers==='function'?caRoleUsers(e.ref):[]).filter(act);
  const tm=(typeof caTeams==='function'?caTeams():[]).find(function(x){return x.id===Number(e.ref);});
  return tm?ccUniq(tm.members||[]).filter(act):[];
}
/* The entity's calendar date at a UTC instant (G3); without one, today on the entity clock (test clocks follow wbToday). */
function ccEntToday(ent,atUtc){
  const tz=entTimezone(ent);
  if(atUtc){const ms=Date.parse(atUtc);if(!isNaN(ms)&&ccTzValid(tz))return new Date(ms+ccTzOffsetMin(tz,ms)*60000).toISOString().slice(0,10);}
  const now=Date.now(),loc=new Date(now-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),shift=Math.round((Date.parse(wbToday())-Date.parse(loc))/86400000);
  const base=ccTzValid(tz)?new Date(now+ccTzOffsetMin(tz,now)*60000).toISOString().slice(0,10):loc;
  return shift?wbAddDays(base,shift):base;
}
function ccDaysBetween(a,b){return Math.round((Date.parse(b)-Date.parse(a))/86400000);}
/* d: {scope:'entity'|'programme', programmeId, inherit, requireClaim, windowOn, days, remind:'7,3,1', overdueEvery, escalation:{kind,ref}, effFrom, reason} */
function ccClaimBenefitWallets(){return ccUniq([].concat.apply([],ccProgs().map(function(p){return p.wallets||[];}))).filter(function(c){return ccTxnWalletClass(c)==='Flexi Benefit';});}
/* d: {scope:'entity'|'programme', programmeId, inherit, requireClaim, windowOn, days, remind:'7,3,1', overdueEvery, escalation:{kind,ref}, escAfter, effFrom, reason}.
   Benefit card spend evidence is owned by Wallet & Benefits (B8-N22, 8 Nov 2026): the card policy only shows it. */
function ccClaimPolSave(d,A){
  A=A||ccNow();d=d||{};const ent=ccEnt();
  if(!ccPCan(A,'card.programme.manage'))return {error:caN(A.who)+' cannot change card policies (card.programme.manage).'};
  const scope=d.scope==='programme'?'programme':'entity',p=scope==='programme'?ccProg(d.programmeId):null;
  if(scope==='programme'&&(!p||p.entity!==ent))return {error:'Pick the programme the override applies to.'};
  if(Array.isArray(d.benefitEvidence)&&d.benefitEvidence.length)return {error:'Benefit card spend evidence is set in Wallet & Benefits → Benefit Categories (per category, effective-dated); the card policy only shows it.'};
  const eff=ccStmtDate(d.effFrom),today=ccEntToday(ent);
  if(!eff)return {error:'Enter the Policy Effective Date.'};
  if(eff<today)return {error:'The Policy Effective Date cannot be in the past: a policy applies from its date onwards, never to transactions already posted.'};
  const reason=String(d.reason||'').trim();if(reason.length<5)return {error:'Say why the policy is set or changed; it is kept in the policy history.'};
  const v={v:0,scope:scope,programmeId:p?p.id:null,inherit:scope==='programme'&&!!d.inherit,requireClaim:true,windowOn:false,days:null,remind:[],overdueEvery:0,escalation:null,escAfter:null,effFrom:eff,reason:reason,by:A.who,actual:caVia(A),at:ccStamp(A),iso:A.iso};
  if(!v.inherit){
    v.requireClaim=d.requireClaim!==false&&d.requireClaim!=='No';
    v.windowOn=v.requireClaim&&(d.windowOn===true||d.windowOn==='Yes');
    if(v.windowOn){
      const n=Number(d.days);if(!(n>=1&&n<=365)||Math.round(n)!==n)return {error:'Submission Window is a whole number of days (1 to 365).'};v.days=n;
      if(!ccTzValid(entTimezone(ent)))return {error:idEntityName(ent)+' has no Entity Timezone (Company Settings → Basic Details): set it before enabling a submission window.'};
      const rs=String(d.remind==null?'':d.remind).split(/[,\s]+/).filter(Boolean).map(Number);
      if(rs.some(function(x){return !(x>=1)||Math.round(x)!==x||x>=n;}))return {error:'Reminder Schedule lists whole days before the due date, each less than the window (for example 7, 3, 1).'};
      v.remind=ccUniq(rs).sort(function(a,b){return b-a;});
      const oe=Number(d.overdueEvery||0);if(!(oe>=0&&oe<=30)||Math.round(oe)!==oe)return {error:'Overdue Reminder Every is 0 (once) to 30 days.'};v.overdueEvery=oe;
      if(d.escalation){
        const ok=ccClaimEscOptions().some(function(o){return o.kind===d.escalation.kind&&String(o.ref)===String(d.escalation.ref);});
        if(!ok)return {error:'Pick the escalation recipient: the reporting manager of the cardholder, or one of the existing roles and teams.'};
        v.escalation={kind:d.escalation.kind,ref:d.escalation.kind==='team'?Number(d.escalation.ref):d.escalation.ref};
        const ea=d.escAfter==null||String(d.escAfter).trim()===''?1:Number(d.escAfter);
        if(!(ea>=1&&ea<=90)||Math.round(ea)!==ea)return {error:'Escalate After is a whole number of days overdue (1 to 90).'};v.escAfter=ea;
      }
    }
  }
  const book=ccClaimPols(ent),same=book.versions.find(function(x){return x.scope===scope&&x.programmeId===v.programmeId&&x.effFrom===eff&&!x.replaced;});
  if(same){if(same.effFrom<=today)return {error:'A policy already took effect on '+cdLabel(eff)+' for this scope: give a later Effective Date.'};same.replaced={by:A.who,at:ccStamp(A)};}
  v.v=book.nextV++;book.versions.push(v);
  const who=scope==='programme'?p.key+' '+p.code+' override':'Entity policy';
  ccLog(book,'Saved',who+' v'+v.v+' from '+cdLabel(eff)+': '+(v.inherit?'uses the entity policy again':ccClaimPolText(Object.assign({configured:true},v)))+'. Reason: '+reason+'.'+(same?' It replaces the version not yet in effect from the same date.':'')+' Transactions posted before '+cdLabel(eff)+' keep the policy that applied to them.',A);
  ccLog(ccCfg(ent),'Updated','Card expense submission policy: '+who+' v'+v.v+' from '+cdLabel(eff)+'.',A);
  return {rec:v};
}

/* ── Due dates (FR-CT-12.03-06, 12.11; rules 3, 4, 9, 11) ── */
function ccTxnAvailableOn(t){
  if(t.demo)return t.iso||'';
  const v=t.verify||{},d=v.at&&typeof ccIsoOfLabel==='function'?ccIsoOfLabel(String(v.at).split(' | ')[0]):'';
  return d||t.iso||'';
}
/* The claim position of one transaction: whether a claim is expected, by when, and whether it is late. at = optional UTC instant. */
function ccTxnClaimDue(t,at){
  if(!t||t.direction==='Credit'||t.walletClass==='Flexi Benefit')return null;
  if(t.status==='Declined'||t.status==='Voided')return null;
  const base={txn:t};
  if(t.status!=='Posted')return Object.assign(base,{state:'Pending Authorization',tone:'idle',text:'Not yet posted: no claim deadline is calculated from a pending authorization.'});
  if(!t.demo&&(t.verify||{}).status!==CCT_VERIFIED)return Object.assign(base,{state:'Awaiting Verification',tone:'idle',text:'Not yet verified: no claim deadline until it is.'});
  const pol=ccClaimPolAt(t.entity,t.programmeId,t.postDate),hold=ccTxnHolderClaim(t);base.policy=pol;
  if(!pol.requireClaim)return Object.assign(base,{state:'Not Required',tone:'idle',text:'The card policy does not require an expense claim for it.'});
  const due=pol.windowOn?wbAddDays(t.postDate,pol.days):'',avail=ccTxnAvailableOn(t);base.due=due;base.availableOn=avail;
  if(hold){
    const sub=hold.submittedAt?ccIsoOfLabel(String(hold.submittedAt).split(' | ')[0]):'',late=due&&sub&&sub>due;
    return Object.assign(base,{state:'Claimed',tone:'ok',claim:hold,late:late,text:'Claimed by '+expKey(hold)+(late?' after the due date '+cdLabel(due)+(ccClaimLateJust(hold,t)?' (justified)':''):'')+'.'});
  }
  if(!due)return Object.assign(base,{state:'Unclaimed',tone:'wait',text:'Needs an expense claim. '+(pol.configured?'No submission window applies.':'No claim policy is configured: no due date.')});
  const today=ccEntToday(t.entity,at),left=ccDaysBetween(today,due);base.today=today;base.left=left;
  if(avail&&avail>due)return Object.assign(base,{state:'Late Data',tone:'wait',lateData:true,text:'Reached ADT on '+cdLabel(avail)+', after the due date '+cdLabel(due)+' (statement or provider data arrived late). Not treated as the employee\'s delay; Finance reviews it.'});
  if(left<0)return Object.assign(base,{state:'Overdue',tone:'bad',overdue:-left,text:'Overdue by '+(-left)+' day'+(left===-1?'':'s')+' (due '+cdLabel(due)+'). A claim can still be submitted with a late claim justification.'});
  const soon=pol.remind.length>0&&left<=pol.remind[0];   // B8-N22-02: Due Soon only from a configured reminder day
  return Object.assign(base,{state:soon?'Due Soon':'Due',tone:soon?'wait':'info',text:'Claim due by '+cdLabel(due)+' ('+(left===0?'today':left+' day'+(left===1?'':'s')+' left')+').'});
}
function ccClaimLateJust(r,t){return (r.lines||[]).some(function(l){return Number(l.txnId)===t.id&&l.lateJust;});}
/* A line made from an overdue transaction needs a late claim justification at submission (FR-CT-12.07; WF-CT-05.7). */
function ccLineLateNeed(d,ctx){
  const t=Number(d.txnId)?ccTxn(d.txnId):null;if(!t)return null;
  const s=ccTxnClaimDue(t);return s&&s.state==='Overdue'?s:null;
}

/* ── Reminders and escalation (FR-CT-22; evaluated on access until a backend scheduler exists, BE-05) ── */
const CCD_SCHED_NOTE='Reminders are evaluated when ADT is opened or refreshed (front-end limitation; no backend scheduler yet).';
/* Event identity (B8-N22-02/04/12, 8 Nov 2026): one notice per distinct event. A reminder is the transaction, the policy
   version and the reminder occurrence; Due Soon only from a configured reminder day; overdue repeats as configured;
   one escalation per policy version, to the configured recipient only, after the configured days overdue; Late Data is
   a Finance exception and never escalates the employee; nothing more once the claim is submitted. */
function ccClaimRemindSweep(ent,at){
  ent=ent||ccEnt();const out={sent:0};
  if(typeof notifData==='undefined')return out;
  if(typeof ccBenefitEvidenceMigrate==='function')ccBenefitEvidenceMigrate(ent);
  const before=notifData.length;let sysA=null;const sys=function(){return sysA||(sysA=caAt('System',wbToday(),stampNow().time));};
  ccTxns.forEach(function(t){
    if(t.entity!==ent)return;
    const s=ccTxnClaimDue(t,at),u=idUserOfEmp(t.employeeEid),demo=t.demo?' ('+CC_DEMO+')':'';
    const live=t.direction!=='Credit'&&t.status==='Posted'&&(t.demo||(t.verify||{}).status===CCT_VERIFIED);
    if(live&&(!s||s.state==='Not Required'))ccNotify([u],'New card transaction '+expKey(t)+demo+' on your card: '+t.merchant+', '+expMoney(t.amount,t.currency)+'.'+(s?' No expense claim is required for it.':''),t,'new');
    const be=live&&typeof ccBenefitEvidenceRule==='function'?ccBenefitEvidenceRule(t):null;
    if(be&&!t.benefitEvidence)
      ccNotify([u],'Missing supporting evidence: Wallet & Benefits ('+be.cat.name+') requires '+ccBenefitEvidenceWhat(be)+' for '+expKey(t)+demo+' ('+t.merchant+', '+expMoney(t.amount,t.currency)+'). Provide it from My Cards.',t,'benefit-evidence');
    if(!s||['Unclaimed','Due','Due Soon','Overdue','Late Data'].indexOf(s.state)<0)return;
    const pv='v'+((s.policy&&s.policy.v)||0);
    if(s.state!=='Late Data')ccNotify([u],'Your card transaction '+expKey(t)+demo+' at '+t.merchant+' ('+expMoney(t.amount,t.currency)+') needs an expense claim'+(s.due?' by '+cdLabel(s.due):'')+'. Open My Cards → Create Expense.',t,'needs-expense');
    if(s.state==='Due Soon'){
      const th=s.policy.remind.filter(function(d){return s.left<=d;}).pop();
      if(th!=null)ccNotify([u],'Reminder: the expense claim for '+expKey(t)+demo+' ('+t.merchant+') is due on '+cdLabel(s.due)+' ('+(s.left===0?'today':s.left+' day'+(s.left===1?'':'s')+' left')+').',t,'due-'+pv+'-'+th);
    }
    if(s.state==='Overdue'){
      const k=s.policy.overdueEvery?Math.floor((s.overdue-1)/s.policy.overdueEvery):0;
      ccNotify([u],'Overdue: the expense claim for '+expKey(t)+demo+' ('+t.merchant+', '+expMoney(t.amount,t.currency)+') was due on '+cdLabel(s.due)+'. You can still submit it with a late claim justification.',t,'overdue-'+pv+'-'+k);
      const e=s.policy.escalation,ek='overdue-esc-'+pv;
      if(e&&s.overdue>=(s.policy.escAfter||1)&&!(t.claimEsc||[]).some(function(x){return x.evt===ek;})){
        const to=ccClaimEscPeople(e,ent,t).filter(function(x){return x!==u;}),A=sys();
        t.claimEsc=(t.claimEsc||[]).concat([{evt:ek,v:s.policy.v,recipient:ccClaimEscLabel(e),to:to,at:ccStamp(A),overdue:s.overdue}]);
        if(to.length)ccNotify(to,'Overdue card expense escalated to you ('+ccClaimEscLabel(e)+'): '+expKey(t)+demo+' of '+t.name+' ('+expMoney(t.amount,t.currency)+') was due on '+cdLabel(s.due)+' and is not claimed.',t,ek);
        ccLog(t,t.status,to.length?'Claim deadline escalation (policy v'+s.policy.v+', '+ccClaimEscLabel(e)+'): '+to.map(caN).join(', ')+' told that the claim due on '+cdLabel(s.due)+' is '+s.overdue+' day'+(s.overdue===1?'':'s')+' overdue.'
          :'Claim deadline escalation not delivered: no active '+ccClaimEscLabel(e).toLowerCase()+' for '+t.name+' (policy v'+s.policy.v+'). Set the recipient in Corporate Cards → Card Setup; nobody else was escalated to.',A);
      }
    }
    if(s.state==='Late Data')ccNotify(ccPeopleWith('card.transaction.match',ent),'Late transaction data: '+expKey(t)+' of '+t.name+' reached ADT on '+cdLabel(s.availableOn)+', after its claim due date '+cdLabel(s.due)+'. Not treated as the employee\'s delay.',t,'late-data');
  });
  out.sent=notifData.length-before;return out;
}


/* ══ FR-CT-13 · Missing expenses, receipts and matching exceptions ═══════════════════════════════════════════════
   One list over the same records, grouped as the product owner listed them. Most exceptions are derived from the
   records and close themselves when the underlying state changes (FR-CT-13.10); what people do about them
   (clarification requested and answered, marked for review) is kept per exception and never disappears because a
   notice was dismissed (FR-CT-13.11). Submitted claims keep the Build 4 proof rule (G10). */
const CCX_GROUPS=['Transaction Without Expense Claim','Awaiting Transaction Evidence','Partially Matched Transaction','Amount/Currency/Date Mismatch','Suggested Match Requires Review',
  'Missing or Invalid Evidence','Duplicate or Suspicious Transaction','Card Eligibility Exception','Pending/Unverified Transaction','Card Spend Above Approved Expense','Benefit Wallet Evidence Missing'];
function ccLineGroup(i){
  const c=i&&i.category;
  if(c==='Suggested Match Requires Review')return CCX_GROUPS[4];
  if(c==='Pending Transaction'||c==='Unverified Transaction Evidence')return CCX_GROUPS[8];
  if(c==='Duplicate Suspected')return CCX_GROUPS[6];
  if(c==='Card Eligibility Exception')return CCX_GROUPS[7];
  if(c==='Expense Without Matching Transaction')return CCX_GROUPS[1];
  return CCX_GROUPS[3];
}
const ccExcBook={};
function ccExc(key){return ccExcBook[key]||null;}
function ccExcGet(key,ent){return ccExcBook[key]||(ccExcBook[key]={key:key,entity:ent||ccEnt(),status:'Open',items:[]});}
function ccExcState(key){const x=ccExcBook[key];return x?x.status:'Open';}
function ccExcKeyOf(row){return row.kind==='txn'||row.kind==='benefit'||row.kind==='unclaimed'?'txn:'+row.t.id:row.kind==='csx'?'csx:'+row.x.id:'line:'+row.r.id+':'+row.l.id;}
/* The employee an exception is about (its owner), and the record to write the trail on. */
function ccExcOwner(key){
  const p=String(key).split(':');
  if(p[0]==='txn'){const t=ccTxn(p[1]);return t?t.employeeEid:'';}
  if(p[0]==='csx'){const x=ccSpendExcs.find(function(y){return y.id===Number(p[1]);});return x?x.employeeEid:'';}
  const r=expRec(Number(p[1]));return r?r.employeeEid:'';
}
function ccExcRecord(key){
  const p=String(key).split(':');
  if(p[0]==='txn')return {rec:ccTxn(p[1]),type:'txn'};
  if(p[0]==='csx')return {rec:ccSpendExcs.find(function(y){return y.id===Number(p[1]);}),type:'csx'};
  return {rec:expRec(Number(p[1])),type:'claim',lineId:Number(p[2])};
}
function ccExcTrail(key,text,A){
  const o=ccExcRecord(key);if(!o.rec)return;
  if(o.type==='claim'&&typeof caLog==='function')caLog(o.rec,o.rec.status,text,A);else ccLog(o.rec,o.rec.status,text,A);
}
function ccExcMay(A){return ccPCan(A,'card.transaction.match');}
/* Finance asks the employee for missing information or clarification (FR-CT-13.06; FR-CT-22 Missing Receipt). */
function ccExcRequestClar(key,text,A){
  A=A||ccNow();text=String(text||'').trim();
  if(!ccExcMay(A))return caN(A.who)+' cannot follow up card exceptions (card.transaction.match).';
  const owner=ccExcOwner(key),u=owner?idUserOfEmp(owner):'';if(!u)return 'No employee to ask.';
  if(u===A.who||u===caVia(A))return 'You cannot request clarification from yourself.';
  if(text.length<10)return 'Say what is missing or needs clarification (at least 10 characters).';
  const x=ccExcGet(key);
  if(x.status==='Clarification Requested')return 'A clarification is already awaited from '+caN(u)+'.';
  x.status='Clarification Requested';x.items.push({type:'Clarification Requested',text:text,by:A.who,actual:caVia(A),at:ccStamp(A),to:u});
  ccExcTrail(key,'Clarification requested by '+caN(A.who)+' from '+caN(u)+': '+text,A);
  const o=ccExcRecord(key);
  ccNotify([u],'Missing information requested'+(o.rec?' on '+expKey(o.rec):'')+': '+text,o.rec,'clar-'+x.items.length);
  return '';
}
/* The employee answers or provides missing information (note and/or a document). */
/* The employee answers or provides missing information (note and/or a document). For a benefit-wallet spend the
   Wallet & Benefits rule says what is needed: a receipt or bill, an employee declaration, or both. */
function ccExcRespond(key,d,A){
  A=A||ccNow();d=d||{};
  const owner=ccExcOwner(key),u=owner?idUserOfEmp(owner):'';
  const onBehalf=!(A.who===u||caVia(A)===u);
  if(onBehalf&&!ccPCan(A,'expense.claim.create.others'))return 'Only '+caN(u)+' provides this information (or someone filing on their behalf).';
  const note=String(d.note||'').trim(),file=String(d.file||'').trim(),o=ccExcRecord(key);
  const be=o.type==='txn'&&o.rec&&d.benefit&&typeof ccBenefitEvidenceRule==='function'?ccBenefitEvidenceRule(o.rec):null;
  if(be){
    if(be.receipt&&!file)return 'Wallet & Benefits ('+be.cat.name+') requires a receipt or bill for this card spend: attach it.';
    if(be.declaration&&!d.declare)return 'Wallet & Benefits ('+be.cat.name+') requires the employee declaration for this card spend: confirm it.';
  }else if(note.length<5&&!file)return 'Add the information (at least 5 characters) or attach a document.';
  const x=ccExcGet(key);x.items.push({type:'Information Provided',text:note||(be&&be.declaration?'Employee declaration confirmed':''),file:file,by:A.who,actual:caVia(A),at:ccStamp(A),onBehalf:onBehalf});
  const asked=x.items.filter(function(i){return i.type==='Clarification Requested';}).map(function(i){return i.by;});
  x.status=x.status==='Clarification Requested'?'Responded':x.status;
  if(o.type==='txn'&&o.rec&&d.benefit){o.rec.benefitEvidence={file:file,note:note,declaration:be&&be.declaration?{text:ccBenefitDeclText(o.rec),by:A.who,actual:caVia(A),at:ccStamp(A)}:null,rule:be?be.rule:'',category:be?be.cat.key:'',by:A.who,actual:caVia(A),at:ccStamp(A)};}
  ccExcTrail(key,'Information provided by '+caN(A.who)+(onBehalf?' on behalf of '+caN(u):'')+': '+(note||'')+(file?' ('+file+')':'')+(be&&be.declaration?' Employee declaration confirmed.':'')+'.',A);
  ccNotify(ccUniq(asked.length?asked:ccPeopleWith('card.transaction.match',x.entity)).filter(function(v){return v!==A.who;}),'Information provided'+(o.rec?' on '+expKey(o.rec):'')+' by '+caN(A.who)+'.',o.rec,'resp-'+x.items.length);
  return '';
}
function ccExcMarkReview(key,note,A){
  A=A||ccNow();note=String(note||'').trim();
  if(!ccExcMay(A))return caN(A.who)+' cannot follow up card exceptions (card.transaction.match).';
  if(note.length<5)return 'Say what is being reviewed.';
  const x=ccExcGet(key);if(x.status==='Under Review'&&x.items.length&&x.items[x.items.length-1].text===note)return 'Already under review.';
  x.status='Under Review';x.items.push({type:'Marked for Review',text:note,by:A.who,actual:caVia(A),at:ccStamp(A)});
  ccExcTrail(key,'Marked for review by '+caN(A.who)+': '+note,A);
  const o=ccExcRecord(key);if(o.type==='csx'&&o.rec&&typeof ccCsxRefresh==='function'){o.rec.reviewed={by:A.who,at:ccStamp(A),note:note};ccCsxRefresh(o.rec,A);}
  return '';
}

/* ── B8-N22-11 (8 Nov 2026): the frozen Build 4 draft validation applies unchanged - a draft needs its receipt, also for a card
   line made from a transaction. The transaction stays Needs an Expense and the cardholder can add transaction-level supporting
   information. ccDraftSaving only tells the late-claim check that a draft is being saved (the justification is asked at submission). ── */
let ccDraftSaving=false;
ccHook('submitAddExpense',function(submit){ccDraftSaving=submit===false;return undefined;},function(){ccDraftSaving=false;return undefined;});

/* ── The exception rows (Finance sees the entity; an employee sees their own) ── */
function ccCardExceptions(ent,o){
  ent=ent||ccEnt();o=o||{};ccMatchSync(ent);if(typeof ccCsxSync==='function')ccCsxSync(ent);
  /* Finance-side roles (the matching queue) see the entity's exceptions; anyone else only their own (FR-CT-24). */
  let own=o.eid||'';if(!own&&typeof ccMatchQueueVisible==='function'&&!ccMatchQueueVisible()){const me=typeof ccEmpOf==='function'?ccEmpOf():null;own=me?me.eid:'-';}
  const out=[],add=function(row){if(own&&row.eid!==own)return;row.key=ccExcKeyOf(row);row.state=ccExcState(row.key);out.push(row);};
  ccClaimsOf(ent).forEach(function(r){
    if(CCM_SUBMITTED.indexOf(r.status)>=0)ccCardLines(r).forEach(function(l){
      const i=ccLineMatchInfo(r,l);if(i&&i.status!=='Matched')add({kind:'line',group:ccLineGroup(i),r:r,l:l,info:i,eid:r.employeeEid,amount:ccLineCardAmt(l),currency:r.currency,text:i.text,category:i.category});
      const st=ccExcState('line:'+r.id+':'+l.id);
      if(st==='Clarification Requested'||st==='Responded')add({kind:'evidence',group:CCX_GROUPS[5],r:r,l:l,eid:r.employeeEid,amount:Number(l.amount),currency:r.currency,
        info:{status:st,tone:st==='Responded'?'info':'wait'},text:st==='Responded'?'The employee answered the clarification request; Finance reviews it.':'Finance asked for missing or corrected evidence.'});
    });
  });
  ccTxns.forEach(function(t){
    if(t.entity!==ent||!ccTxnVisible(t))return;
    if(t.direction!=='Credit'&&t.walletClass!=='Flexi Benefit'){
      if(t.matchStatus==='Partially Matched')add({kind:'txn',group:CCX_GROUPS[2],category:'Partially Matched',t:t,eid:t.employeeEid,amount:t.unmatchedAmount,currency:t.matchCurrency,info:{status:'Partially Matched',tone:'wait',text:expMoney(t.unmatchedAmount,t.matchCurrency)+' of '+expKey(t)+' is not matched to any expense line.'},text:expMoney(t.unmatchedAmount,t.matchCurrency)+' of '+expKey(t)+' is not matched to any expense line.'});
      const s=ccTxnClaimDue(t);
      if(s&&['Unclaimed','Due','Due Soon','Overdue','Late Data'].indexOf(s.state)>=0){
        const rj=ccClaimsOf(ent).find(function(r){return ['Rejected','Withdrawn'].indexOf(r.status)>=0&&ccCardLines(r).some(function(l){return Number(l.txnId)===t.id||ccMatchesOfLine(r.id,l.id).some(function(m){return m.txnId===t.id;});});});
        add({kind:'unclaimed',group:CCX_GROUPS[0],t:t,eid:t.employeeEid,amount:t.amount,currency:t.currency,due:s,info:{status:s.state,tone:s.tone},
          text:s.text+(rj?' Its earlier claim '+expKey(rj)+' was '+rj.status.toLowerCase()+': the card spending is unaccounted until claimed again or resolved.':'')});
      }
      if(t.dupReview&&t.dupReview.status==='Open')add({kind:'txn',group:CCX_GROUPS[6],t:t,eid:t.employeeEid,amount:t.amount,currency:t.currency,info:{status:'Duplicate Review',tone:'wait'},text:'Kept as separate from '+t.dupReview.ofKey+': '+t.dupReview.reason});
      if(t.eligibility&&t.eligibility.exception&&!ccMatchesOfTxn(t.id).some(function(m){return m.accepted&&m.accepted.diffs.some(function(d){return d.field==='Card Eligibility';});}))
        add({kind:'txn',group:CCX_GROUPS[7],t:t,eid:t.employeeEid,amount:t.amount,currency:t.currency,info:{status:'Eligibility Exception',tone:'bad'},text:t.eligibility.text});
    }
    const be=typeof ccBenefitEvidenceNeed==='function'?ccBenefitEvidenceNeed(t):null;
    if(be&&!t.benefitEvidence)add({kind:'benefit',group:CCX_GROUPS[10],t:t,eid:t.employeeEid,amount:t.amount,currency:t.currency,info:{status:'Evidence Missing',tone:'wait'},text:be});
  });
  if(typeof ccCsxActive==='function')ccSpendExcs.forEach(function(x){
    if(x.entity!==ent||!ccCsxActive(x)||!ccCsxVisible(x))return;
    const v=ccCsxAmounts(x);add({kind:'csx',group:CCX_GROUPS[9],x:x,eid:x.employeeEid,amount:v.outstanding,currency:x.currency,info:{status:x.status+(ccCsxPartial(x)?' · Partially Resolved':''),tone:'wait'},
      text:expMoney(v.outstanding,x.currency)+' outstanding of '+expMoney(v.original,x.currency)+(v.resolved?' ('+expMoney(v.resolved,x.currency)+' resolved)':'')+(v.pending?'; '+expMoney(v.pending,x.currency)+' in progress':'')+'.'});
  });
  return o.group?out.filter(function(x){return x.group===o.group;}):out;
}
/* Back-compatible name used by the 8C screens and tests. */
function ccMatchExceptions(ent){return ccCardExceptions(ent).filter(function(x){return x.kind==='line'||(x.kind==='txn'&&x.group===CCX_GROUPS[2]);});}
/* The figures Finance needs on one line (section 4E), from the same rows: no new dashboard. */
function ccExcSummary(rows){
  const n=function(g){return rows.filter(function(x){return x.group===g;}).length;};
  const cs=ccSpendExcs.filter(function(x){return x.entity===ccEnt()&&typeof ccCsxVisible==='function'&&ccCsxVisible(x);}),tot={open:0,resolved:0,outstanding:0,review:0,recovery:0,refund:0};
  cs.forEach(function(x){if(['Withdrawn','Superseded – Requires Reassessment'].indexOf(x.status)>=0)return;const v=ccCsxAmounts(x);tot.resolved+=v.resolved;tot.outstanding+=v.outstanding;
    if(x.status==='Under Review')tot.review++;if(x.status==='Recovery Pending')tot.recovery++;if(x.status==='Refund Pending'||x.status==='Dispute Pending'||x.status==='Verification Pending')tot.refund++;});
  return {unclaimed:n(CCX_GROUPS[0]),overdue:rows.filter(function(x){return x.due&&x.due.state==='Overdue';}).length,awaiting:n(CCX_GROUPS[1])+n(CCX_GROUPS[8]),evidence:n(CCX_GROUPS[5])+n(CCX_GROUPS[10]),
    csxOpen:rows.filter(function(x){return x.kind==='csx';}).length,csxOutstanding:ccM(tot.outstanding),csxResolved:ccM(tot.resolved),csxReview:tot.review,csxRecovery:tot.recovery,csxRefund:tot.refund};
}


/* ══ FR-CT-14 · Card spend exception (CSX) resolution on the Build 7 records ═════════════════════════════════════
   The CSX stays the one record (no new exception master). Resolutions are linked events with their own amounts:
   1 Company Acceptance - a request on the shared engine through the existing Budget Exception route (budget owner,
     then the Budget Approvers team); the Build 6 budget check applies; once approved the accepted amount is added
     to the original line's allocation by Build 6's own difference-based derivation, exactly once; a closed year
     leaves it Pending – Closed Period Adjustment (G5).
   2 Employee Recovery - the Build 5 recovery pattern: raised by Finance, approved by someone else with the recovery
     approval right, collected with reference and evidence, and verified by someone independent. No payroll method,
     no advance or imprest balance.
   3 Verified Refund and 4 Dispute Credit - resolved only by a verified credit on the card, up to its evidenced amount.
   The resolved amount never exceeds the original; the outstanding amount stays visible. Nothing rewrites the claim
   or the card transaction; nothing is reimbursed. */
const CSX_SUPERSEDED='Superseded – Requires Reassessment';
const CSX_DONE=['Resolved','Withdrawn',CSX_SUPERSEDED];
const CSX_RES_OPEN=['Awaiting Approval','Approved – Pending Closed Period Adjustment','Pending Approval','Recovery Pending','Partially Recovered','Refund Pending','Verification Pending','Dispute Pending'];
const CSX_OUTCOME={'Company Acceptance':'Accepted by Company','Employee Recovery':'Recovered','Verified Refund':'Closed by Verified Refund','Dispute Credit':'Closed by Successful Dispute Credit'};
const ccCsxReqs=[];let ccCsxReqNextId=220001,ccCsxReqNextKey=1001;
function ccCsx(id){return ccSpendExcs.find(function(x){return x.id===Number(id);})||null;}
function ccCsxGet(id){const x=ccCsx(id);return x&&x.entity===ccEnt()?x:null;}
function ccCsxActive(x){return !!x&&CSX_DONE.indexOf(x.status)<0;}
/* Finance, the claim's approvers and card staff see a CSX (Build 7, B7-N23). The cardholder is shown their own only
   once a recovery is approved, because something is then asked of them (FR-CT-14.20); never another employee's. */
function ccCsxEmployeeAsked(x){return (x.resolutions||[]).some(function(r){return r.type==='Employee Recovery'&&['Recovery Pending','Partially Recovered','Recovered'].indexOf(r.status)>=0;});}
/* Build 7 rule kept (B8-N22-08, 8 Nov 2026): Finance, the claim's approvers and card staff see a CSX; the cardholder never
   sees the internal record. Once a formal recovery is approved the cardholder is told and gets an employee-facing recovery
   view instead (ccCsxEmpRecoveries): no budget, funding or internal notes. */
function ccCsxVisible(x){
  if(!x||x.entity!==ccEnt())return false;
  return !!(ccCan('card.csx.resolve')||ccSpendVisible(expRec(x.claimId)));
}
/* The cardholder sees their own CSX: amounts, status and what is asked of them; never budget, funding or approval internals (FR-CT-14.20). */
function ccCsxOwnOnly(x){return !(ccCan('card.csx.resolve')||ccSpendVisible(expRec(x.claimId)));}
function ccCsxAmounts(x){
  const R=x.resolutions||[],orig=ccM(x.amount);let resolved=0,pending=0;
  R.forEach(function(r){resolved+=r.resolved||0;if(CSX_RES_OPEN.indexOf(r.status)>=0)pending+=Math.max(0,ccM(r.amount-(r.resolved||0)));});
  resolved=ccM(resolved);pending=ccM(pending);
  return {original:orig,resolved:resolved,pending:pending,outstanding:ccM(Math.max(0,orig-resolved)),free:ccM(Math.max(0,orig-resolved-pending))};
}
function ccCsxRes(x,n){return (x.resolutions||[]).find(function(r){return r.n===Number(n);})||null;}
function ccCsxResHist(r,A,to,note){r.history.push({at:ccStamp(A),by:A.who,actual:caVia(A),to:to,note:note||''});r.status=to;}
function ccCsxRefresh(x,A){
  if(!x||x.status==='Withdrawn'||x.status===CSX_SUPERSEDED)return;
  const v=ccCsxAmounts(x),R=x.resolutions||[],has=function(s){return R.some(function(r){return s.indexOf(r.status)>=0;});},was=x.status;
  let st;
  if(R.length&&v.outstanding<=0)st='Resolved';
  else if(has(['Awaiting Approval','Pending Approval']))st='Resolution Requested';
  else if(has(['Recovery Pending','Partially Recovered']))st='Recovery Pending';
  else if(has(['Verification Pending']))st='Verification Pending';
  else if(has(['Refund Pending']))st='Refund Pending';
  else if(has(['Dispute Pending']))st='Dispute Pending';
  else if(has(['Approved – Pending Closed Period Adjustment']))st='Approved Resolution';
  else if(x.reviewed)st='Under Review';
  else st='Open';
  x.status=st;x.outcomes=R.filter(function(r){return r.resolved>0;}).map(function(r){return CSX_OUTCOME[r.type]+' '+expMoney(r.resolved,x.currency);});
  x.stage=st==='Resolved'?'Resolved: '+x.outcomes.join(' · '):st==='Open'?(v.resolved>0?'Partially resolved: '+expMoney(v.resolved,x.currency)+' resolved, '+expMoney(v.outstanding,x.currency)+' outstanding':'Awaiting a resolution'):st;
  if(A&&st!==was)ccLog(x,st,'Status '+was+' → '+st+'. Original '+expMoney(v.original,x.currency)+', resolved '+expMoney(v.resolved,x.currency)+', outstanding '+expMoney(v.outstanding,x.currency)+'.',A);
}
function ccCsxResolvers(x,except){return ccPeopleWith('card.csx.resolve',x.entity).filter(function(u){return (except||[]).indexOf(u)<0&&u!==idUserOfEmp(x.employeeEid);});}
function ccCsxMay(A,x){
  if(!x)return 'No such card spend exception.';
  if(!ccPCan(A,'card.csx.resolve'))return caN(A.who)+' cannot resolve card spend exceptions (card.csx.resolve).';
  const h=idUserOfEmp(x.employeeEid),via=caVia(A);if(A.who===h||via===h)return caN(h)+' holds the card: a cardholder never resolves their own card spend exception.';
  if(!ccCsxActive(x))return expKey(x)+' is '+x.status+'.';
  return '';
}
function ccCsxNewRes(x,type,amount,o,A){
  x.resolutions=x.resolutions||[];
  const r=Object.assign({n:x.resolutions.length+1,type:type,amount:ccM(amount),resolved:0,status:'',by:A.who,actual:caVia(A),at:ccStamp(A),history:[]},o||{});
  x.resolutions.push(r);return r;
}
function ccCsxAmountCheck(x,amount){
  const a=Number(String(amount==null?'':amount).replace(/,/g,'')),v=ccCsxAmounts(x);
  if(!(a>0)||Math.abs(a*100-Math.round(a*100))>1e-6)return {error:'Enter an amount (more than zero, at most two decimals).'};
  if(a>v.free+1e-9)return {error:'Only '+expMoney(v.free,x.currency)+' of '+expKey(x)+' is free to resolve ('+expMoney(v.outstanding,x.currency)+' outstanding, '+expMoney(v.pending,x.currency)+' already in progress). A CSX is never over-settled.'};
  return {amount:ccM(a)};
}
function ccCsxLine(x){const r=expRec(x.claimId),l=r&&(r.lines||[]).find(function(y){return y.id===x.lineId;});return {r:r,l:l};}
/* The original line's budget context (G6): its allocation, financial year and rate; the acceptance amount on top. */
function ccCsxBudgetEval(x,amount){
  const o=ccCsxLine(x);if(!o.r||!o.l||typeof bgEvaluate!=='function')return {result:'Not Evaluated',reason:'No budget context.'};
  return bgEvaluate({entity:x.entity,date:o.l.start||x.date,dept:bgEmpDept(o.r.employeeEid),category:o.r.category,subCat:o.l.subCat,ccId:o.r.costCentreId||'',prjId:o.r.projectId||'',
    amount:ccM(amount),currency:o.r.currency,funded:0,holderAlloc:null,exclude:function(s){return String(s.src).indexOf('CSX-'+x.key+'/')===0;},batch:{},excKey:'CSX-'+x.key});
}
function ccCsxClosedFy(x){const o=ccCsxLine(x),d=(o.l&&o.l.start)||x.date;return typeof bgFyStatus==='function'&&bgFyStatus(bgFyOf(d,x.entity).label,x.entity).status==='Closed';}

/* ── 1. Company Acceptance (G6; FR-CT-14.04-06) ── d: {amount, reason, evidence, just} ── */
function ccCsxAccept(id,d,A){
  A=A||ccNow();d=d||{};const x=ccCsxGet(id),may=ccCsxMay(A,x);if(may)return {error:may};
  const c=ccCsxAmountCheck(x,d.amount);if(c.error)return c;
  const reason=String(d.reason||'').trim(),ev=String(d.evidence||'').trim(),just=String(d.just||'').trim();
  if(reason.length<10)return {error:'Say why the company accepts this card spend (at least 10 characters).'};
  if(!ev)return {error:'Attach the supporting evidence (for example the receipt or the business justification document).'};
  const be=ccCsxBudgetEval(x,c.amount);
  if(be.missingRate)return {error:'Budget evaluation unavailable: '+be.reason+' Nothing is assumed 1:1.'};
  if(be.result==='Blocked')return {error:'The budget blocks this acceptance: '+(be.pub||be.reason)+' Raise a budget revision or transfer first; ADT never accepts spend that a blocking budget refuses.',budget:true};
  if(be.needJust&&just.length<10)return {error:'Budget warning: '+(be.pub||be.reason)+' Give the budget justification (at least 10 characters).',needJust:true,budget:true};
  const o=ccCsxLine(x),e=idEmp(x.employeeEid)||{},m=o.l&&o.l.bgt&&o.l.bgt.alloc?o.l.bgt:null;
  const q={id:ccCsxReqNextId++,key:ccCsxReqNextKey++,prefix:'CSA',kind:'card spend acceptance',entity:x.entity,csxId:x.id,employeeEid:x.employeeEid,name:e.name||'',empId:e.empId||'',email:e.email||'',dept:e.dept||'',
    claimFor:'Others',mode:'On Behalf',status:'Draft',createdBy:A.who,createdAt:ccStamp(A),migrated:true,idMigrated:true,category:'Card Spend Acceptance',title:'Accept '+expMoney(c.amount,x.currency)+' of '+expKey(x),
    currency:x.currency,budgetId:m?m.budget:null,allocId:m?m.alloc:null,
    lines:[{id:1,title:'Company acceptance of card spend ('+x.claimKey+' · '+x.lineTitle+')',amount:c.amount,subCat:'',start:x.date,end:x.date,status:'Pending',approved:null}],logs:[]};
  const pre=ccEnginePreflight(q);if(pre.error){ccCsxReqNextId--;ccCsxReqNextKey--;return {error:pre.error};}
  ccCsxReqs.unshift(q);
  const r=ccCsxNewRes(x,'Company Acceptance',c.amount,{reason:reason,evidence:ev,reqId:q.id,reqKey:expKey(q),budget:{result:be.result,reason:be.pub||be.reason||'',just:just}},A);
  ccCsxResHist(r,A,'Awaiting Approval','Proposed: '+reason);
  ccLog(q,'Draft','Company acceptance of '+expMoney(c.amount,x.currency)+' of '+expKey(x)+' proposed by '+caN(A.who)+': '+reason+'. Evidence '+ev+'. Budget: '+be.result+(just?' – '+just:'')+'.',A);
  if(!caStart(q,pre,A)){ccCsxReqs.shift();x.resolutions.pop();ccCsxReqNextId--;ccCsxReqNextKey--;return {error:'Approval cannot start.'};}
  ccLog(x,x.status,'Company acceptance of '+expMoney(c.amount,x.currency)+' proposed by '+caN(A.who)+' ('+expKey(q)+', budget '+be.result+'): '+reason+'. It goes to the Budget Approvers route; nothing is posted or reimbursed until it is approved.',A);
  ccCsxRefresh(x,A);
  ccNotify(ccCsxResolvers(x,[A.who]),expKey(x)+': company acceptance of '+expMoney(c.amount,x.currency)+' requested ('+expKey(q)+').',x,'res-'+r.n);
  return {rec:q,res:r};
}
function ccCsxReq(id){return ccCsxReqs.find(function(q){return q.id===Number(id);})||null;}
function ccCsxAcceptFinal(q,A){
  const x=ccCsx(q.csxId),r=x&&(x.resolutions||[]).find(function(y){return y.reqId===q.id;});if(!x||!r||CSX_RES_OPEN.indexOf(r.status)<0)return;
  if(q.status==='Rejected'){ccCsxResHist(r,A,'Rejected','Not approved ('+expKey(q)+')');ccLog(x,x.status,'Company acceptance '+expKey(q)+' was not approved. The amount stays outstanding.',A);}
  else{
    const appr=ccM(Math.min(r.amount,caApprovedTotal(q)));if(appr<r.amount)r.amount=appr;
    if(ccCsxClosedFy(x)){ccCsxResHist(r,A,'Approved – Pending Closed Period Adjustment','Approved; the financial year of the expense is closed: the budget adjustment waits for an authorized closed-period process (G5).');
      ccLog(x,x.status,'Company acceptance '+expKey(q)+' approved for '+expMoney(r.amount,x.currency)+', but the financial year of '+x.claimKey+' is closed: Pending – Closed Period Adjustment. Nothing is posted into the closed year; the year is not reopened.',A);}
    else{
      const o=ccCsxLine(x);r.budgetMap=o.l&&o.l.bgt&&o.l.bgt.alloc?Object.assign({},o.l.bgt):null;r.resolved=r.amount;ccCsxResHist(r,A,'Accepted','Approved through '+expKey(q));
      if(typeof bgSyncAll==='function')bgSyncAll(A);
      const evs=typeof bgEvents!=='undefined'?bgEvents.filter(function(e){return String(e.src).indexOf('CSX-'+x.key+'/A'+r.n)===0;}).map(function(e){return e.ref;}):[];r.budgetEvents=evs;
      ccLog(x,x.status,'Accepted by Company: '+expMoney(r.amount,x.currency)+' approved through '+expKey(q)+'. '+(r.budgetMap?'Recorded once as additional authorized expenditure on the original line\'s budget allocation ('+(evs.join(', ')||'no change')+').':'The original line has no budget allocation (budget control did not apply): nothing to post.')
        +' No reimbursement is created and the card payment is unchanged.',A);
    }
  }
  ccCsxRefresh(x,A);
  ccNotify(ccUniq([r.by].concat(ccCsxResolvers(x))).filter(function(u){return u!==A.who;}),expKey(x)+': company acceptance '+expKey(q)+' '+(q.status==='Rejected'?'was rejected':'was approved')+'.',x,'res-'+r.n+'-'+r.status);
}
ccRegisterKind('card spend acceptance',{
  perms:{approve:'budget.exception.approve',submit:'card.csx.resolve',others:'card.csx.resolve',withdraw:'card.csx.resolve',withdrawOthers:'card.csx.resolve',reassign:'budget.manage',intervene:'budget.approval.intervene'},
  approvalNoun:'card spend acceptance',
  rec:function(id){return typeof mcOn==='function'&&!mcOn('cards')?null:ccCsxReq(id);},recs:function(){return typeof mcOn==='function'&&!mcOn('cards')?[]:ccCsxReqs;},
  policySig:function(r){return [r.kind,r.csxId,caTotal(r)].join('|');},
  resolveStage:{'Budget Owner':function(r){return typeof bgOwnerApprovers==='function'?bgOwnerApprovers(r):{list:[]};}},approverTypes:['Budget Owner'],
  decisionCheck:function(r,items){
    /* Maker-checker also through Switch User (global access model): whoever raised the acceptance, or holds the card, never decides it as someone else. */
    const A=ccNow(),xc=ccCsx(r.csxId),hold=xc?idUserOfEmp(xc.employeeEid):'';
    if(A.actual&&(A.actual===r.createdBy||A.actual===hold))return 'Maker-checker: '+caN(A.actual)+(A.actual===r.createdBy?' raised this card spend acceptance':' holds the card')+', so they never decide it, also not through Switch User.';
    if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
    const x=ccCsx(r.csxId);if(!x||!ccCsxActive(x))return 'The card spend exception is no longer open.';
    const res=(x.resolutions||[]).find(function(y){return y.reqId===r.id;}),v=ccCsxAmounts(x);
    if(res&&res.amount>v.outstanding+1e-9)return 'Only '+expMoney(v.outstanding,x.currency)+' of '+expKey(x)+' is still outstanding.';
    const be=ccCsxBudgetEval(x,res?res.amount:caTotal(r));
    if(be.result==='Blocked')return 'The budget now blocks this acceptance: '+(be.pub||be.reason);
    if(be.missingRate)return 'Budget evaluation unavailable: '+be.reason;
    return '';},
  onFinal:function(r,A){ccCsxAcceptFinal(r,A);},openFn:'ccCsxOpenReq',
  excluded:function(r){const x=ccCsx(r.csxId);return ccUniq([r.createdBy,x?idUserOfEmp(x.employeeEid):''].filter(Boolean));},
  finalNote:'Approval accepts the card spend as company expenditure; it creates no reimbursement and never changes the card payment.',
  finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+'.';},
  decisionHint:'Approves accepting this unapproved card spend as company expenditure. The budget effect is applied once, on the original allocation.',
  reviewInfo:function(r){const x=ccCsx(r.csxId);return x?'<div class="wb-note"><div class="wb-note-sub">'+ccE(expKey(x)+' · '+x.claimKey+' · "'+x.lineTitle+'" · card paid '+expMoney(x.actualCard,x.currency)+', approved '+expMoney(x.approvedCard,x.currency))+'</div></div>':'';}});
CC_KIND_WF['card spend acceptance']='Budget Exception';
if(typeof CA_TYPE_LABEL!=='undefined')CA_TYPE_LABEL['card spend acceptance']='Card Spend Acceptance';
/* The accepted amount joins Build 6's own derivation: one state per acceptance, so a re-sync never posts it twice. */
ccHook('bgDesired',null,function(out){
  if(!out)return undefined;
  ccSpendExcs.forEach(function(x){(x.resolutions||[]).forEach(function(r){
    if(r.type!=='Company Acceptance'||r.status!=='Accepted'||!r.budgetMap)return;
    const m=r.budgetMap;if(typeof bgFrozenMap==='function'&&bgFrozenMap(m))return;
    const rate=bgRateOf(m,x.currency);if(!rate)return;
    const src='CSX-'+x.key+'/A'+r.n,k=src+'@'+m.fy;
    out[k]={key:k,src:src,entity:x.entity,budget:m.budget,alloc:m.alloc,fy:m.fy,q:m.q,date:m.date,label:expKey(x)+' · company acceptance of card spend',kind:'Card spend acceptance',recId:x.id,
      pending:0,committed:0,actual:bgM(r.amount*rate),exposure:0,linked:0,comp:null,carriedFrom:null};
  });});
  return undefined;
});

/* ── 2. Employee Recovery (Build 5 pattern; FR-CT-14.07-10) ── */
function ccCsxRecMethods(){return typeof advMethods==='function'?advMethods().filter(function(m){return !/payroll|salary|card|wallet/i.test(m);}):['Manual/External Bank Transfer'];}
function ccCsxRecApprovers(x,r){const h=idUserOfEmp(x.employeeEid);return ccPeopleWith('advance.recovery.approve',x.entity).filter(function(u){return u!==r.by&&u!==r.actual&&u!==h&&(typeof caActive!=='function'||caActive(u));});}
function ccCsxRecoveryRaise(id,d,A){
  A=A||ccNow();d=d||{};const x=ccCsxGet(id),may=ccCsxMay(A,x);if(may)return {error:may};
  const c=ccCsxAmountCheck(x,d.amount);if(c.error)return c;
  const method=String(d.method||'');if(ccCsxRecMethods().indexOf(method)<0)return {error:'Pick a recovery method from the configured methods (payroll deduction is not available; nothing is deducted automatically).'};
  const reason=String(d.reason||'').trim();if(reason.length<10)return {error:'Say why the employee repays this card spend (at least 10 characters).'};
  const r=ccCsxNewRes(x,'Employee Recovery',c.amount,{method:method,reason:reason,collections:[]},A);ccCsxResHist(r,A,'Pending Approval','Raised: '+reason);
  ccLog(x,x.status,'Employee recovery of '+expMoney(c.amount,x.currency)+' raised by '+caN(A.who)+' ('+method+'): '+reason+'. It needs approval by someone else with the recovery approval right; raising it is not a collection and nothing is deducted from payroll.',A);
  ccCsxRefresh(x,A);
  const ap=ccCsxRecApprovers(x,r);
  ccNotify(ap,expKey(x)+': employee recovery of '+expMoney(c.amount,x.currency)+' awaits your approval.',x,'rec-'+r.n);
  return {rec:x,res:r,noApprover:!ap.length};
}
function ccCsxRecoveryDecide(id,n,decision,remarks,A){
  A=A||ccNow();remarks=String(remarks||'').trim();const x=ccCsxGet(id);if(!x)return 'No such card spend exception.';
  const r=ccCsxRes(x,n);if(!r||r.type!=='Employee Recovery'||r.status!=='Pending Approval')return 'No recovery awaits approval here.';
  if(!ccPCan(A,'advance.recovery.approve'))return caN(A.who)+' cannot approve recoveries (advance.recovery.approve).';
  const via=caVia(A),h=idUserOfEmp(x.employeeEid);
  if([r.by,r.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(r.by)+' raised this recovery; someone else approves it.';
  if(A.who===h||via===h)return 'The cardholder never approves their own recovery.';
  if(decision!=='Approve'&&decision!=='Reject')return 'Approve or Reject.';
  if(decision==='Reject'&&remarks.length<5)return 'Say why the recovery is rejected.';
  r.approval={by:A.who,actual:via,at:ccStamp(A),decision:decision,remarks:remarks};
  ccCsxResHist(r,A,decision==='Approve'?'Recovery Pending':'Rejected',remarks);
  ccLog(x,x.status,'Employee recovery '+(decision==='Approve'?'approved':'rejected')+' by '+caN(A.who)+(remarks?': '+remarks:'')+'.'+(decision==='Approve'?' It is Recovery Pending until a collection is recorded and independently verified; approval is not a collection.':' The amount stays outstanding.'),A);
  ccCsxRefresh(x,A);
  ccNotify(ccUniq([r.by].concat(ccCsxResolvers(x))).filter(function(u){return u!==A.who;}),expKey(x)+': employee recovery '+(decision==='Approve'?'approved':'rejected')+'.',x,'rec-'+r.n+'-'+decision);
  if(decision==='Approve')ccNotify([h],'Card spend recovery approved: '+expMoney(r.amount,x.currency)+' of the card payment on "'+x.lineTitle+'" ('+x.claimKey+') was not approved as a business expense. Open it to see what is asked of you ('+r.method+'); nothing is deducted from your salary.',x,'rec-'+r.n+'-employee');
  return '';
}
function ccCsxRefUsed(ref){ref=String(ref||'').trim().toLowerCase();return ccSpendExcs.some(function(x){return (x.resolutions||[]).some(function(r){return (r.collections||[]).some(function(c){return c.status!=='Rejected'&&String(c.ref).toLowerCase()===ref;});});})||(typeof advRefUsed==='function'&&advRefUsed(ref));}
function ccCsxRecUnpaid(r){return ccM(r.amount-(r.collections||[]).filter(function(c){return c.status!=='Rejected';}).reduce(function(s,c){return s+c.amount;},0));}
/* d: {amount, date, ref, evidence} - actual money received; verified by someone independent before it counts. */
function ccCsxCollect(id,n,d,A){
  A=A||ccNow();d=d||{};const x=ccCsxGet(id),may=ccCsxMay(A,x);if(may)return may;
  const r=ccCsxRes(x,n);if(!r||r.type!=='Employee Recovery'||['Recovery Pending','Partially Recovered'].indexOf(r.status)<0)return 'Record a collection against an approved recovery.';
  const a=Number(String(d.amount==null?'':d.amount).replace(/,/g,''));const un=ccCsxRecUnpaid(r);
  if(!(a>0))return 'Enter the amount received.';if(a>un+1e-9)return 'Only '+expMoney(un,x.currency)+' of this recovery is still to be collected.';
  if(!d.date||d.date>wbToday())return 'Enter the date the money was received (not in the future).';
  const ref=String(d.ref||'').trim();if(ref.length<3)return 'Enter the payment reference (bank or receipt reference).';if(ccCsxRefUsed(ref))return 'Reference '+ref+' is already recorded on another collection.';
  if(!String(d.evidence||'').trim())return 'Attach the evidence of payment.';
  r.collections.push({k:r.collections.length+1,amount:ccM(a),date:d.date,ref:ref,evidence:String(d.evidence).trim(),by:A.who,actual:caVia(A),at:ccStamp(A),status:'Awaiting Verification'});
  ccLog(x,x.status,'Collection of '+expMoney(a,x.currency)+' recorded by '+caN(A.who)+' (ref '+ref+', '+cdLabel(d.date)+'). It counts only after someone independent verifies it.',A);
  ccNotify(ccCsxRecApprovers(x,{by:A.who,actual:caVia(A)}),expKey(x)+': a recovery collection of '+expMoney(a,x.currency)+' awaits verification.',x,'col-'+r.n+'-'+r.collections.length);
  return '';
}
function ccCsxCollectVerify(id,n,k,decision,remarks,A){
  A=A||ccNow();const x=ccCsxGet(id);if(!x)return 'No such card spend exception.';
  const r=ccCsxRes(x,n),c=r&&(r.collections||[]).find(function(y){return y.k===Number(k);});if(!c||c.status!=='Awaiting Verification')return 'No collection awaits verification here.';
  if(!ccPCan(A,'advance.recovery.approve'))return caN(A.who)+' cannot verify recoveries (advance.recovery.approve).';
  const via=caVia(A),h=idUserOfEmp(x.employeeEid);
  if([c.by,c.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(c.by)+' recorded this collection; someone else verifies it.';
  if(A.who===h||via===h)return 'The cardholder never verifies their own repayment.';
  if(decision==='Reject'&&String(remarks||'').trim().length<5)return 'Say why the collection is rejected.';
  c.status=decision==='Reject'?'Rejected':'Verified';c.verifiedBy=A.who;c.verifiedActual=via;c.verifiedAt=ccStamp(A);c.remarks=String(remarks||'').trim();
  if(c.status==='Verified'){r.resolved=ccM((r.resolved||0)+c.amount);ccCsxResHist(r,A,r.resolved>=r.amount-1e-9?'Recovered':'Partially Recovered','Collection '+c.ref+' verified');}
  ccLog(x,x.status,'Collection '+c.ref+' of '+expMoney(c.amount,x.currency)+' '+(c.status==='Verified'?'verified':'rejected')+' by '+caN(A.who)+(c.remarks?': '+c.remarks:'')+'.'+(c.status==='Verified'?' Recovered so far '+expMoney(r.resolved,x.currency)+' of '+expMoney(r.amount,x.currency)+'.':''),A);
  ccCsxRefresh(x,A);
  ccNotify(ccUniq([c.by,idUserOfEmp(x.employeeEid)]).filter(function(u){return u!==A.who;}),expKey(x)+': repayment of '+expMoney(c.amount,x.currency)+' '+(c.status==='Verified'?'verified':'not accepted')+'.',x,'col-'+r.n+'-'+c.k+'-'+c.status);
  return '';
}
/* The unpaid part of a recovery is cancelled; what was collected stays. */
function ccCsxResCancel(id,n,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const x=ccCsxGet(id),may=ccCsxMay(A,x);if(may)return may;
  const r=ccCsxRes(x,n);if(!r||CSX_RES_OPEN.indexOf(r.status)<0||r.type==='Company Acceptance')return 'Nothing to cancel here (a company acceptance is decided on its approval route).';
  if(reason.length<5)return 'Say why it is cancelled.';
  if(r.type==='Employee Recovery'&&(r.collections||[]).some(function(c){return c.status==='Awaiting Verification';}))return 'A collection awaits verification: verify or reject it first.';
  const done=ccM(r.resolved||0);r.amount=done;
  ccCsxResHist(r,A,done>0?(r.type==='Employee Recovery'?'Recovered':CSX_OUTCOME[r.type]):'Cancelled','Cancelled: '+reason);
  ccLog(x,x.status,r.type+' '+(done>0?'closed at '+expMoney(done,x.currency)+' (the rest cancelled)':'cancelled')+' by '+caN(A.who)+': '+reason+'. The rest stays outstanding.',A);
  ccCsxRefresh(x,A);return '';
}

/* ── 3, 4. Verified Refund and Dispute Credit (FR-CT-14.11-14) ── */
function ccTxnCreditFree(t){return ccM((t.billAmount||0)-(t.csxAllocs||[]).reduce(function(s,a){return s+a.amount;},0));}
/* Credits that may settle a CSX (B8-N22-09, 8 Nov 2026): a posted, genuine, not rejected credit of the same cardholder with an
   unallocated amount - on the CSX card or a replacement card, in its currency or another, credited to the card or returned to
   a company funding source. Anything but the same card, currency and card wallet needs its documentation and a Finance review. */
function ccCsxCreditCands(x){
  return ccTxns.filter(function(t){return t.entity===x.entity&&t.employeeEid===x.employeeEid&&t.direction==='Credit'&&t.status==='Posted'&&!t.demo&&ccTxnCreditFree(t)>0&&(t.verify||{}).status!==CCT_REJECTED;});
}
/* d: {kind:'Verified Refund'|'Dispute Credit', amount, ref, reason} - pending until a verified credit is linked. */
function ccCsxCreditExpect(id,d,A){
  A=A||ccNow();d=d||{};const x=ccCsxGet(id),may=ccCsxMay(A,x);if(may)return {error:may};
  const kind=d.kind==='Dispute Credit'?'Dispute Credit':'Verified Refund',c=ccCsxAmountCheck(x,d.amount);if(c.error)return c;
  const ref=String(d.ref||'').trim(),reason=String(d.reason||'').trim();
  if(kind==='Dispute Credit'&&ref.length<3)return {error:'Enter the dispute or provider case reference.'};
  if(reason.length<5)return {error:'Say what is expected (for example the merchant agreed to refund the excess).'};
  const r=ccCsxNewRes(x,kind,c.amount,{ref:ref,reason:reason,credits:[]},A);ccCsxResHist(r,A,kind==='Dispute Credit'?'Dispute Pending':'Refund Pending',reason);
  ccNotify(ccCsxResolvers(x,[A.who]),expKey(x)+': '+(kind==='Dispute Credit'?'dispute credit':'verified refund')+' of '+expMoney(c.amount,x.currency)+' expected ('+reason+'); it resolves the exception only when a verified credit arrives.',x,'res-'+r.n);
  ccLog(x,x.status,(kind==='Dispute Credit'?'Dispute raised':'Refund expected')+' for '+expMoney(c.amount,x.currency)+' by '+caN(A.who)+(ref?' (ref '+ref+')':'')+': '+reason+'. It resolves the CSX only to the extent a verified credit arrives on the card; '+(kind==='Dispute Credit'?'a raised dispute or a favourable decision alone closes nothing.':'a refund request alone closes nothing.'),A);
  ccCsxRefresh(x,A);return {rec:x,res:r};
}
/* Link a credit transaction of the card; a verified credit resolves up to its unallocated amount, an unverified one waits. */
/* Link a credit to a pending refund or dispute of a CSX. amount: what is used of the credit, in its billing currency.
   o: {rate (1 credit currency = rate CSX currency, documented, never 1:1), rateEvidence, reason, reviewed, reviewNote}.
   A verified, reviewed credit resolves up to its unallocated amount; anything else waits; nothing is resolved twice or beyond. */
/* The card transaction of a CSX: the line's own transaction or the one matched to it. */
function ccCsxTxnOf(x){const l=ccCsxLine(x).l,m=typeof ccMatchOfLine==='function'?ccMatchOfLine(x.claimId,x.lineId):null;return Number(l&&l.txnId)||(m?m.txnId:null);}
function ccCsxCreditDiff(x,t){
  const d=[],tx=ccCsxTxnOf(x);
  if(t.billCurrency!==x.currency)d.push('currency');if(t.cardId!==x.cardId)d.push('card');if(t.refund&&t.refund.dest==='Company Funding Source')d.push('destination');
  if(!(t.refundOf&&t.refundOf.id&&t.refundOf.id===tx))d.push('linkage');
  return d;
}
const CSX_DIFF_LABEL={currency:'another currency',card:'another card of the cardholder',destination:'returned to a company funding source',linkage:'not a refund of the exception\'s card transaction'};
function ccCsxDiffText(d){return d.map(function(k){return CSX_DIFF_LABEL[k]||k;}).join(', ');}
function ccCsxDiffWhy(diff,x,t){
  const o=ccCsxTxnOf(x),out=[];
  if(diff.indexOf('linkage')>=0)out.push('it is not a refund of '+(o?expKey(ccTxn(o)):'a card transaction of this exception')+(t.refundOf&&t.refundOf.key?' (it refunds '+t.refundOf.key+')':''));
  if(diff.indexOf('card')>=0)out.push('it is on '+(t.cardRef?t.cardRef.key:'another card')+', not '+(x.cardRef?x.cardRef.key:'the card of the exception'));
  if(diff.indexOf('destination')>=0)out.push('it was returned to the company funding source '+((t.refund||{}).sourceKey||''));
  return expKey(t)+': '+out.join('; ');
}
function ccCsxCreditAmt(c){return c.csxAmount!=null?c.csxAmount:c.amount;}
function ccCsxLinkCredit(id,n,txnId,amount,A,o){
  A=A||ccNow();o=o||{};const x=ccCsxGet(id),may=ccCsxMay(A,x);if(may)return may;
  const r=ccCsxRes(x,n);if(!r||['Verified Refund','Dispute Credit'].indexOf(r.type)<0||['Refund Pending','Dispute Pending','Verification Pending'].indexOf(r.status)<0)return 'Link a credit to a pending refund or dispute of this CSX.';
  const t=ccTxn(txnId);if(!t||ccCsxCreditCands(x).indexOf(t)<0)return 'Pick a credit (refund, reversal or dispute credit) posted on a card of '+caN(idUserOfEmp(x.employeeEid))+' with an unallocated amount.';
  if((r.credits||[]).some(function(c){return c.txnId===t.id&&c.status!=='Rejected';}))return expKey(t)+' is already linked to this '+r.type.toLowerCase()+': a credit settles it once.';
  const diff=ccCsxCreditDiff(x,t);let rate=1;
  if(diff.indexOf('currency')>=0){
    rate=Number(String(o.rate==null?'':o.rate).replace(/,/g,''));
    if(!(rate>0))return expKey(t)+' is in '+t.billCurrency+' and '+expKey(x)+' in '+x.currency+': enter the documented exchange rate (1 '+t.billCurrency+' = ? '+x.currency+'). Currencies are never converted 1:1.';
    if(rate===1)return 'A documented exchange rate between '+t.billCurrency+' and '+x.currency+' is required; currencies are never converted 1:1.';
    if(!String(o.rateEvidence||'').trim())return 'Attach the evidence of the exchange rate (provider advice, bank statement or rate source).';
  }
  const why=String(o.reason||'').trim();
  if(['card','destination','linkage'].some(function(k){return diff.indexOf(k)>=0;})&&why.length<10)
    return ccCsxDiffWhy(diff,x,t)+'. Confirm the linkage: say why it settles this card spend (at least 10 characters).';
  const left=ccM(r.amount-(r.credits||[]).filter(function(c){return c.status!=='Rejected';}).reduce(function(s,c){return s+ccCsxCreditAmt(c);},0));
  const free=ccTxnCreditFree(t);let a=amount==null||String(amount).trim()===''?NaN:Number(String(amount).replace(/,/g,''));
  if(!(a>0))a=left/rate;a=ccM(Math.min(a,free));let ca=ccM(a*rate);
  if(ca>left+1e-9){ca=left;a=ccM(Math.min(free,left/rate));}
  if(!(a>0)||!(ca>0))return 'Nothing left to link.';
  const pend=diff.length&&!o.reviewed;
  const link={txnId:t.id,key:expKey(t),amount:a,currency:t.billCurrency,csxAmount:ca,rate:diff.indexOf('currency')>=0?rate:null,rateEvidence:String(o.rateEvidence||'').trim(),reason:why,diff:diff,
    review:diff.length?(pend?{status:'Awaiting Finance Review'}:{status:'Reviewed',by:A.who,actual:caVia(A),at:ccStamp(A),note:o.reviewNote||'Finance allocation review'}):null,
    status:pend?'Awaiting Finance Review':'Linked',at:ccStamp(A),by:A.who,actual:caVia(A)};
  t.csxAllocs=(t.csxAllocs||[]).concat([{csxId:x.id,key:expKey(x),n:r.n,amount:a,csxAmount:ca,rate:link.rate,at:ccStamp(A),by:A.who}]);
  if(t.refund)t.refund.csx=(t.refund.csx||[]).concat([expKey(x)]);
  r.credits.push(link);
  const fx=link.rate?' at the documented rate '+rate+' ('+link.rateEvidence+') = '+expMoney(ca,x.currency):'';
  ccLog(t,t.status,expMoney(a,t.billCurrency)+' of this credit linked to '+expKey(x)+' ('+r.type+')'+fx+' by '+caN(A.who)+'.'+(why?' Reason: '+why+'.':'')+(pend?' It counts only after a Finance review ('+ccCsxDiffText(diff)+').':'')+' It settles the card spend exception only; no reimbursement, budget or funding entry is created for it.',A);
  ccCsxCreditRefresh(x,r,A);
  ccLog(x,x.status,'Credit '+expKey(t)+' ('+expMoney(a,t.billCurrency)+fx+', '+ccTxnVerifyLabel(t)+') linked by '+caN(A.who)+'. '+(pend?'Awaiting Finance review ('+ccCsxDiffText(diff)+') before it counts.':r.resolved>0?'Resolved so far '+expMoney(r.resolved,x.currency)+'.':'It counts once the credit is verified.'),A);
  ccNotify(ccUniq([r.by].concat(ccCsxResolvers(x))).filter(function(u){return u!==A.who;}),expKey(x)+': '+r.type.toLowerCase()+' credit '+expKey(t)+' ('+expMoney(ca,x.currency)+') linked; '+(pend?'awaiting Finance review':r.resolved>0?'resolved '+expMoney(r.resolved,x.currency)+' of '+expMoney(r.amount,x.currency):'it counts once the credit is verified')+'.',x,'credit-'+r.n+'-'+t.id);
  if(pend)ccNotify(ccCsxCreditReviewers(x,link),expKey(x)+': a credit link ('+expKey(t)+', '+ccCsxDiffText(diff)+') needs your Finance review.',x,'crreview-'+r.n+'-'+t.id);
  ccCsxRefresh(x,A);return '';
}
function ccCsxCreditRefresh(x,r,A){
  const live=(r.credits||[]).filter(function(c){return c.status!=='Rejected';});
  const ok=live.filter(function(c){const t=ccTxn(c.txnId);return t&&t.status==='Posted'&&(t.verify||{}).status===CCT_VERIFIED&&!(c.review&&c.review.status==='Awaiting Finance Review');});
  const ver=ccM(ok.reduce(function(s,c){return s+ccCsxCreditAmt(c);},0)),all=ccM(live.reduce(function(s,c){return s+ccCsxCreditAmt(c);},0)),was=r.resolved||0;r.resolved=ccM(Math.min(ver,r.amount));
  const to=r.resolved>=r.amount-1e-9?CSX_OUTCOME[r.type]:all>r.resolved+1e-9?'Verification Pending':r.type==='Dispute Credit'?'Dispute Pending':'Refund Pending';
  if(to!==r.status||r.resolved!==was)ccCsxResHist(r,A,to,'Verified credit '+expMoney(r.resolved,x.currency)+' of '+expMoney(r.amount,x.currency));
}

/* ── Sync: rejected claims (B8-N16 C, Case 1), credits verified since, statuses ── */
function ccCsxSync(ent,A){
  ent=ent||ccEnt();let At=null;const sys=function(){return A||At||(At=caAt('System',wbToday(),stampNow().time));};
  ccSpendExcs.forEach(function(x){
    if(x.entity!==ent)return;
    const r=expRec(x.claimId);
    if(x.status==='Open'&&!(x.resolutions||[]).length&&r&&r.status==='Rejected'){
      const S=sys();x.status=CSX_SUPERSEDED;x.superseded={at:ccStamp(S),by:S.who,why:'claim rejected without any approved amount'};x.stage='Superseded: '+x.claimKey+' was rejected with no approved amount';
      ccLog(x,CSX_SUPERSEDED,x.claimKey+' was rejected before any valid partial approval, so this exception was calculated from an approved amount that does not exist. It is kept for audit and no longer an active obligation: the card spending is reviewed as unaccounted card spend on its transaction (claim it again or resolve it through the card exceptions).',S);
      ccNotify(ccPeopleWith('card.csx.resolve',ent),expKey(x)+' superseded: '+x.claimKey+' was rejected; review the card spending as unaccounted card spend.',x,'superseded');
      return;
    }
    (x.resolutions||[]).forEach(function(rr){if(rr.credits&&['Verification Pending','Refund Pending','Dispute Pending'].indexOf(rr.status)>=0){const w=rr.resolved;ccCsxCreditRefresh(x,rr,sys());if(rr.resolved!==w)ccLog(x,x.status,'Verified credit now '+expMoney(rr.resolved,x.currency)+' ('+rr.type+').',sys());}});
    ccCsxRefresh(x,A||null);
  });
}
ccHook('caFinalize',null,function(out,r,A){
  if(!r||(typeof caKind==='function'&&caKind(r)!=='expense'))return undefined;
  ccCsxSync(r.entity,A);
  /* Missing Transaction Match (FR-CT-22): an approved card-paid line still without its transaction. */
  if(['Approved','Partially Approved'].indexOf(r.status)>=0)ccCardLines(r).forEach(function(l){
    if(Number(l.approved)>0&&!ccMatchOfLine(r.id,l.id))ccNotify(ccPeopleWith('card.transaction.match',r.entity),expKey(r)+' approved; line "'+l.title+'" ('+expMoney(ccLineCardAmt(l),r.currency)+' on the card) has no matching card transaction yet.',r,'nomatch-'+l.id);});
  return undefined;
});
ccHook('ccTxnVerify',null,function(){try{ccCsxSync();}catch(e){}return undefined;});
ccHook('ccStmtVerify',null,function(){try{ccCsxSync();}catch(e){}return undefined;});

/* ── Submission revalidates every card line (B8-N16 B; G10; FR-CT-12.07) ── */
function ccClaimCardRevalidate(r){
  const errs=[];
  ccCardLines(r).forEach(function(l){
    if(!Number(l.txnId))return;
    if(!String(l.proof||'').trim())errs.push('Expense Proof is required on "'+l.title+'" before the claim is submitted (a draft may wait for the receipt; a submitted claim may not).');
    const t=ccTxn(l.txnId);if(!t)return;
    const e=ccExpTxnCheck(l,{eid:r.employeeEid,currency:r.currency,claimId:r.id,lineId:l.id,claim:r},ccLineCardAmt(l),{submit:true});if(e)errs.push(e);
  });
  return errs.join(' ');
}
ccHook('caPreflight',function(r){
  if(!r||(typeof caKind==='function'&&caKind(r)!=='expense')||!(r.lines||[]).some(function(l){return Number(l.txnId);}))return undefined;
  const e=ccClaimCardRevalidate(r);return e?{error:e}:undefined;
},null);
/* Late Expense Submitted (FR-CT-22): Finance and the escalation recipients hear of a justified late claim. */
ccHook('caStart',null,function(out,r){
  if(!r||(typeof caKind==='function'&&caKind(r)!=='expense'))return undefined;
  ccCardLines(r).forEach(function(l){
    if(!l.lateJust)return;const t=ccTxn(l.txnId),s=t?ccTxnClaimDue(t):null,pol=s&&s.policy;
    ccNotify(ccUniq(ccClaimEscPeople(pol&&pol.escalation,r.entity).concat(ccPeopleWith('card.transaction.match',r.entity))).filter(function(u){return u!==idUserOfEmp(r.employeeEid);}),
      'Late card expense submitted: '+expKey(r)+' line "'+l.title+'" for '+(t?expKey(t):'a card transaction')+' (due '+(s&&s.due?cdLabel(s.due):'—')+'). Justification: '+l.lateJust,r,'late-'+l.id);
  });
  return undefined;
});

/* ── Benefit-wallet evidence, where the card policy requires it (FR-CT-13; G10) ── */
/* ── Benefit-wallet evidence (B8-N22, 8 Nov 2026): Wallet & Benefits owns the rule, per benefit category and effective-dated
   (wbCatEvidenceAt). A card spend from the wallet of a Wallet-Funded category reads the rule in force on its transaction
   date; Claim-Based benefits keep the Build 4 expense receipt rules. ── */
function ccTxnBenefitCat(t,day){
  if(typeof wbCategories==='undefined'||typeof wbWalletOf!=='function')return null;
  const cs=wbCategories.filter(function(c){const w=wbWalletOf(c);return c.entity===t.entity&&c.status!=='Draft'&&w&&w.type===t.wallet&&c.effFrom<=day&&(!c.effTo||c.effTo>=day);});
  return cs.sort(function(a,b){return a.effFrom<b.effFrom?1:-1;})[0]||null;
}
function ccBenefitEvidenceRule(t){
  if(!t||t.walletClass!=='Flexi Benefit'||t.direction==='Credit'||t.status!=='Posted'||(!t.demo&&(t.verify||{}).status!==CCT_VERIFIED))return null;
  if(typeof wbCatEvidenceAt!=='function')return null;
  const day=ccTxnLocalDate(t)||t.date,cat=ccTxnBenefitCat(t,day);if(!cat||cat.processing!=='Wallet-Funded')return null;
  const e=wbCatEvidenceAt(cat,day);if(!e||e.none||e.rule===WB_EVIDENCE[0])return null;
  return {cat:cat,rule:e.rule,from:e.effFrom,receipt:/Receipt/.test(e.rule),declaration:/Declaration/.test(e.rule)};
}
/* During an unresolved evidence configuration conflict (final decision 8 Nov 2026): an existing unambiguous Wallet & Benefits rule
   keeps applying; where no authoritative rule exists the card spend is flagged for configuration review - the less restrictive
   requirement is never chosen silently, and nothing new is invented for the cardholder. */
function ccBenefitEvidenceReview(t){
  if(!t||t.walletClass!=='Flexi Benefit'||t.direction==='Credit'||t.status!=='Posted'||(!t.demo&&(t.verify||{}).status!==CCT_VERIFIED))return null;
  if(typeof wbEvConflictFor!=='function')return null;
  const day=ccTxnLocalDate(t)||t.date,cf=wbEvConflictFor(t.entity,t.wallet,day);if(!cf)return null;
  const cat=ccTxnBenefitCat(t,day),e=cat&&cat.processing==='Wallet-Funded'?wbCatEvidenceAt(cat,day):null;
  return !e||e.none||(cf.case==='C'&&e.migratedFrom)?cf:null;
}
function ccBenefitEvidenceWhat(e){return e.receipt&&e.declaration?'a receipt or bill and the employee declaration':e.receipt?'a receipt or bill':'the employee declaration';}
function ccBenefitEvidenceNeed(t){
  const e=ccBenefitEvidenceRule(t);if(!e)return '';
  return 'Wallet & Benefits ('+e.cat.name+', from '+cdLabel(e.from)+') requires '+ccBenefitEvidenceWhat(e)+' for each card spend from the '+wbTypeName(t.wallet)+' wallet. Provide it from My Cards.';
}
function ccBenefitDeclText(t){
  const c=ccTxnBenefitCat(t,ccTxnLocalDate(t)||t.date);
  return 'I declare that this '+(c?c.name:wbTypeName(t.wallet))+' card spend of '+expMoney(t.amount,t.currency)+' at '+t.merchant+' on '+cdLabel(ccTxnLocalDate(t)||t.date)+' was for the benefit purpose and is not claimed elsewhere.';
}
/* What the card policy screen shows, read-only. */
function ccBenefitEvidenceSummary(){
  if(typeof wbCategories==='undefined'||typeof wbCatEvidenceText!=='function')return '';
  const codes=ccClaimBenefitWallets();
  return wbCategories.filter(function(c){const w=typeof wbWalletOf==='function'?wbWalletOf(c):null;return c.entity===ccEnt()&&c.processing==='Wallet-Funded'&&c.status!=='Inactive'&&w&&codes.indexOf(w.type)>=0;})
    .map(function(c){return c.name+': '+wbCatEvidenceText(c);}).join(' · ');
}
/* One-time move of 8D card-policy benefit evidence to Wallet & Benefits (B8-N22, 8 Nov 2026). The saved values and their dates
   are kept on the card policy versions for audit; each entity-level change becomes an effective-dated category rule with its
   source reference. Wallet & Benefits is authoritative: where it already has its own rule from that date, or a programme
   override would differ per programme, nothing conflicting is written and the conflict is recorded. Idempotent. */
/* One-time move of 8D card-policy benefit evidence to Wallet & Benefits (final decision 8 Nov 2026). The saved values stay on the card
   policy versions. A: one Wallet-Funded category, no Wallet & Benefits rule in the way → a category rule from the original date with
   its source. B: Wallet & Benefits already has a different rule → it stays, a conflict is recorded. C: no single category → a conflict,
   no category is picked. D: a programme-level value differs from the category rule → a conflict (no second rule under Card
   Programmes). Conflicts wait in Wallet & Benefits → Categories for an authorized administrator. Idempotent. */
function ccBenefitEvidenceMigrate(ent){
  ent=ent||ccEnt();const book=ccClaimPolBook[ent],out={moved:[],conflicts:[]};
  if(!book||typeof wbCatEvidencePush!=='function'||typeof wbEvConflictAdd!=='function')return out;
  if(!book.versions.some(function(v){return (v.benefitEvidence||[]).length;}))return out;
  const todo=book.versions.filter(function(v){return !v.evMigrated&&Array.isArray(v.benefitEvidence);});if(!todo.length)return out;
  const ord=function(a,b){return a.effFrom<b.effFrom?-1:a.effFrom>b.effFrom?1:a.v-b.v;},at=ccStamp(caAt('System',wbToday(),stampNow().time));
  const codes=ccUniq([].concat.apply([],book.versions.map(function(v){return v.benefitEvidence||[];})));
  const catsOf=function(code){return (typeof wbCategories==='undefined'?[]:wbCategories).filter(function(c){const w=typeof wbWalletOf==='function'?wbWalletOf(c):null;return c.entity===ent&&c.processing==='Wallet-Funded'&&c.status!=='Inactive'&&w&&w.type===code;});};
  todo.sort(ord).forEach(function(v){
    const p=v.programmeId?ccProg(v.programmeId):null,src='card policy v'+v.v+' ('+(v.scope==='programme'?'programme override '+(p?p.key+' '+p.code:''):'entity policy')+', from '+cdLabel(v.effFrom)+', set by '+caN(v.by)+' '+v.at+')',m={at:at,rules:[],conflicts:[]};
    if(v.replaced){m.note='Replaced before it applied: nothing to move.';v.evMigrated=m;return;}
    codes.forEach(function(code){
      const want=(v.benefitEvidence||[]).indexOf(code)>=0?'Receipt/Bill Required':WB_EVIDENCE[0],cats=catsOf(code);
      if(v.scope==='programme'&&want===WB_EVIDENCE[0])return;
      const C=function(cs,cur,curFrom,text){const x=wbEvConflictAdd({entity:ent,case:cs,walletCode:code,categoryIds:cats.map(function(c){return c.id;}),legacyRule:want,legacyFrom:v.effFrom,legacySource:src,programmeId:v.programmeId||null,currentRule:cur||'',currentFrom:curFrom||'',text:text});
        m.conflicts.push(x.key);out.conflicts.push(x.key+' '+x.case);};
      if(cats.length!==1){if(want!==WB_EVIDENCE[0])C('C','','',cats.length?cats.length+' Wallet-Funded categories use the '+wbTypeName(code)+' wallet: none is picked.':'No Wallet-Funded category uses the '+wbTypeName(code)+' wallet.');return;}
      const c=cats[0],from=v.effFrom>c.effFrom?v.effFrom:c.effFrom,cur=wbCatEvidenceAt(c,from);
      if(v.scope==='programme'){if(cur.rule!==want)C('D',cur.none?'':cur.rule,cur.effFrom,'Programme '+(p?p.key:'')+' required '+want+' for '+c.name+'; the category rule is '+cur.rule+'.');return;}
      const own=!cur.none&&!cur.migratedFrom?cur:(c.evidenceRules||[]).find(function(x){return !x.replaced&&!x.migratedFrom&&x.effFrom===from;});
      if(own){if(own.rule!==want)C('B',own.rule,own.effFrom,'Wallet & Benefits rule kept for '+c.name+'.');return;}
      if(cur.rule===want)return;
      const r=wbCatEvidencePush(c,{rule:want,effFrom:from,reason:'Moved from the card policy, where it was recorded before benefit evidence moved to Wallet & Benefits ('+(v.reason||'')+'). The card policy asked for "a bill or declaration"; mapped to '+want+'.',source:'Migrated from the card policy',by:'System',at:at,migratedFrom:src});
      m.rules.push(c.key+' v'+r.v+' '+want+' from '+wbDate(from));out.moved.push(m.rules[m.rules.length-1]);
    });
    v.evMigrated=m;
  });
  if(out.moved.length||out.conflicts.length)ccLog(book,'Migrated','Benefit card spend evidence moved to Wallet & Benefits (the source of truth): '+(out.moved.join('; ')||'no rule written')+'.'+(out.conflicts.length?' Conflicts for review in Wallet & Benefits → Categories: '+out.conflicts.join(', ')+'.':'')+' The card policy versions keep their saved values for audit.',caAt('System',wbToday(),stampNow().time));
  return out;
}

/* ── Notifications open their record (FR-CT-22.07) ── */
function ccOpenByKey(cid){
  const m=/^([A-Z]+)-(\d+)$/.exec(String(cid||''));if(!m)return false;
  const p=m[1],k=Number(m[2]),byKey=function(list){return list.find(function(x){return x.key===k&&(x.prefix||p)===p;});};
  let x;
  if(p==='CTX'&&(x=byKey(ccTxns))){ccOpenTxnUI(x.id);return true;}
  if(p==='MTX'&&(x=byKey(ccMatches))){ccOpenTxnUI(x.txnId,'matching');return true;}
  if(p==='CSX'&&(x=byKey(ccSpendExcs))&&typeof ccCsxOpenUI==='function'){ccCsxOpenUI(x.id);return true;}
  if(p==='CSA'&&(x=byKey(ccCsxReqs))&&typeof ccCsxOpenUI==='function'){ccCsxOpenUI(x.csxId,'approval');return true;}
  if(p==='STM'&&(x=byKey(ccStmts))&&typeof ccOpenStmtUI==='function'){ccOpenStmtUI(x.id);return true;}
  if(p==='CRD'&&(x=byKey(ccCards))&&typeof ccOpenCardUI==='function'){ccOpenCardUI(x.id);return true;}
  if(['CRQ','CRP'].indexOf(p)>=0&&(x=ccRequests.find(function(y){return y.key===k&&y.prefix===p;}))&&typeof ccOpenReqUI==='function'){ccOpenReqUI(x.id);return true;}
  if(p==='CLD'&&(x=byKey(ccLoads))&&typeof ccOpenLoadUI==='function'){ccOpenLoadUI(x.id);return true;}
  if(p==='EXP'&&(x=(typeof expensesData!=='undefined'?expensesData:[]).find(function(y){return y.key===k;}))&&typeof ccOpenExpense==='function'){ccOpenExpense(x.id);return true;}
  return false;
}
ccHook('atReqOpenFromNotif',function(i){
  const n=typeof notifData!=='undefined'?notifData[i]:null;if(!n||n.go!=='card-record')return undefined;
  n.pending=false;if(typeof notifOpen!=='undefined')notifOpen=false;if(typeof renderNotif==='function')renderNotif();
  ccOpenByKey(n.cid);return true;
},null);


/* ── Safeguard B: a claim made from an illustrative transaction keeps its demo source everywhere it goes ── */
function ccClaimDemoRefs(r){return ccCardLines(r||{}).map(function(l){return Number(l.txnId)?ccTxn(l.txnId):null;}).filter(function(t){return t&&t.demo;});}
ccHook('caCreatePayable',null,function(out,r){
  if(out&&r&&!out.demoSource&&ccClaimDemoRefs(r).length){out.demoSource=true;out.events.unshift({type:'Illustrative Source',by:'System',date:out.events[0]?out.events[0].date:'',time:'',amount:out.payable,
    remarks:CC_DEMO+' source: '+ccClaimDemoRefs(r).map(expKey).join(', ')+'. This reimbursement is illustrative and is not externally verified card spending.'});}
  return undefined;
});
ccHook('bgDesired',null,function(out){
  if(!out)return undefined;
  Object.keys(out).forEach(function(k){const s=out[k];if(s.kind!=='Expense line')return;const r=expRec(s.recId);if(r&&ccClaimDemoRefs(r).length){s.demoSource=true;if(String(s.label).indexOf(CC_DEMO)<0)s.label+=' ('+CC_DEMO+' source)';}});
  return undefined;
});

/* The saved line keeps its late claim justification; the line form keeps it when the line is edited. */
const ccExpLineCardFieldsBase8D=ccExpLineCardFields;
ccExpLineCardFields=function(d){const o=ccExpLineCardFieldsBase8D(d);if(o&&o.txnId&&d&&String(d.lateJust||'').trim())o.lateJust=String(d.lateJust).trim();return o;};
function ccExpLineDraftExtra(l){return l&&Number(l.txnId)?{txnId:Number(l.txnId),txnAt:l.txnAt||'',lateJust:l.lateJust||''}:{};}


/* ── Partially resolved CSX (B8-N22 A, approved 8 Nov 2026): the status stays Open (or the active resolution's status)
   with a visible Partially Resolved indicator; resolved only when nothing is outstanding and nothing is pending. ── */
function ccCsxPartial(x){if(!x||!ccCsxActive(x))return false;const v=ccCsxAmounts(x);return v.resolved>0&&v.outstanding>0;}
function ccCsxMethods(x){return ccUniq((x.resolutions||[]).filter(function(r){return CSX_RES_OPEN.indexOf(r.status)>=0;}).map(function(r){return r.type;}));}
function ccCsxPendingActions(x){
  if(!x||!ccCsxActive(x))return [];
  const out=[],cur=x.currency,R=x.resolutions||[];
  R.forEach(function(r){
    if(r.type==='Company Acceptance'&&r.status==='Awaiting Approval')out.push('Approval of '+(r.reqKey||'the acceptance')+' ('+expMoney(r.amount,cur)+') on the Budget Approvers route');
    if(r.status==='Approved – Pending Closed Period Adjustment')out.push('Closed-period budget adjustment of '+expMoney(r.amount,cur)+' (authorized process)');
    if(r.type==='Employee Recovery'&&r.status==='Pending Approval')out.push('Approval of the employee recovery ('+expMoney(r.amount,cur)+') by an independent approver');
    if(r.type==='Employee Recovery'&&['Recovery Pending','Partially Recovered'].indexOf(r.status)>=0){
      const un=ccCsxRecUnpaid(r);if(un>0)out.push('Collection of '+expMoney(un,cur)+' from the employee ('+r.method+')');
      (r.collections||[]).forEach(function(c){if(c.status==='Awaiting Verification')out.push('Independent verification of collection '+c.ref+' ('+expMoney(c.amount,cur)+')');});
    }
    if(['Refund Pending','Dispute Pending','Verification Pending'].indexOf(r.status)>=0){
      const left=ccM(r.amount-(r.resolved||0));
      out.push((r.status==='Verification Pending'?'Verification of the linked credit':'A verified '+(r.type==='Dispute Credit'?'dispute':'refund')+' credit on the card')+' ('+expMoney(left,cur)+(r.ref?', ref '+r.ref:'')+')');
    }
  });
  const v=ccCsxAmounts(x);if(v.free>0)out.push('Choose a resolution for '+expMoney(v.free,cur)+': company acceptance, employee recovery, refund or dispute credit');
  return out;
}


/* ══ Build 8E · Refunds, reversals, financial adjustments, benefit-wallet spending and historical controls ══════════
   (FR-CT-15, 16, 17, 08.01-06; Addendum G5, G6, G8, G9; product decisions of 8 Nov 2026)
   A refund, reversal or credit is its own Card Transaction (direction Credit) linked to the original purchase, which
   never changes. Credits never exceed what was spent. A credit to the card is not cash returned to the company: only a
   verified return to a company funding source posts one Build 6 funding entry. A credit that clearly belongs to one
   approved card-funded expense line reduces that line's budget utilization once (difference-based, on the original
   allocation); anything ambiguous goes to Finance for allocation; a closed year waits as Pending - Closed Period
   Adjustment. No reimbursement is ever created or changed. Demo credits stay demo activity. */
const CCR_KINDS=['Refund','Reversal','Wallet Credit','Dispute Credit'];
const CCR_DEST=['Card Wallet','Company Funding Source'];
const CCR_REVIEW='Finance Allocation Review',CCR_CLOSED='Pending – Closed Period Adjustment';
const CCX_REFUND='Refund Allocation Review',CCX_CONTROL='Control Exception',CCX_BENEFIT='Benefit Wallet Policy Exception';
if(typeof CCX_GROUPS!=='undefined')[CCX_REFUND,CCX_CONTROL,CCX_BENEFIT].forEach(function(g){if(CCX_GROUPS.indexOf(g)<0)CCX_GROUPS.push(g);});

/* Credits linked to an original (rejected ones never count; o.verified: only verified or demo credits). */
function ccCreditsOf(t,o){o=o||{};return ccTxns.filter(function(x){return x.direction==='Credit'&&x.refundOf&&x.refundOf.id===t.id&&(x.verify||{}).status!==CCT_REJECTED&&(!o.verified||x.demo||(x.verify||{}).status===CCT_VERIFIED);});}
function ccTxnCredited(t,o){return ccM(ccCreditsOf(t,o).reduce(function(s,x){return s+x.billAmount;},0));}
function ccTxnCreditedOrig(t,o){return ccM(ccCreditsOf(t,o).reduce(function(s,x){return s+(x.currency===t.currency?x.amount:0);},0));}
function ccTxnRefundable(t){return ccM(Math.max(0,t.billAmount-ccTxnCredited(t)));}
/* Net card spending: the posted amount less verified credits (billing currency). */
function ccTxnNetSpend(t){return ccM(Math.max(0,t.billAmount-ccTxnCredited(t,{verified:true})));}
function ccCreditWhyNot(o){
  if(!o||o.direction==='Credit')return 'A refund or reversal is recorded against the original purchase.';
  if(o.status==='Pending Authorization')return expKey(o)+' is a pending authorization: if the provider released it, record it as voided (Void / Decline). Nothing was spent, so nothing is refunded.';
  if(['Declined','Voided'].indexOf(o.status)>=0)return expKey(o)+' was '+o.status.toLowerCase()+': nothing was spent, so nothing is refunded.';
  if(!o.demo&&(o.verify||{}).status!==CCT_VERIFIED)return expKey(o)+' is not verified: a refund or reversal links to verified spending only.';
  if(ccTxnRefundable(o)<=0)return expKey(o)+' is fully refunded or reversed already ('+expMoney(ccTxnCredited(o),o.billCurrency)+' of '+expMoney(o.billAmount,o.billCurrency)+').';
  return '';
}
const ccCrNum=function(v){return Number(String(v==null?'':v).replace(/,/g,'').trim());},ccCr2=function(n){return Math.abs(n*100-Math.round(n*100))<1e-6;};
/* The credit as a card transaction on the original's card and wallet (shared by recording and demo simulation). */
function ccCreditNew(o,f,A){
  const t={id:ccTxnNextId++,key:ccTxnNextKey++,prefix:'CTX',kind:'card transaction',entity:o.entity,cardId:o.cardId,programmeId:o.programmeId,employeeEid:o.employeeEid,
    name:o.name,empId:o.empId,provider:o.provider,wallet:o.wallet,walletClass:o.walletClass,direction:'Credit',type:f.kind,status:'Posted',
    date:f.date,time:'',local:'',tz:'',utc:'',postDate:f.post,merchant:o.merchant,mcc:o.mcc||'',country:o.country||'',channel:o.channel||'',
    amount:f.amt,currency:o.currency,billAmount:f.bill,billCurrency:o.billCurrency,rate:f.rate,rateSource:f.rate?'Provider-reported':'',
    extRef:f.ref,authCode:'',entry:f.demo?CC_DEMO:CCT_ENTRY_MANUAL,demo:!!f.demo,
    verify:f.demo?{status:CC_DEMO,source:CC_DEMO}:{status:CCT_UNDER,source:'',by:'',at:''},
    reason:f.reason,comments:'',evidence:f.ev,matchStatus:'Not Applicable',reconStatus:'Not Reconciled',disputes:[],lifecycle:[],
    recordedBy:A.who,actual:caVia(A),recordedAt:ccStamp(A),iso:A.iso,logs:[],cardRef:Object.assign({},o.cardRef),
    eligibility:{ok:true,basis:'Credit of '+expKey(o),provisional:false,text:'',exception:false},
    refundOf:{id:o.id,key:expKey(o),ref:o.extRef||''},
    refund:{processing:f.demo?CC_DEMO:'Awaiting Verification',dest:f.dest,sourceId:f.src?f.src.id:null,sourceKey:f.src?f.src.key:'',disputeRef:f.disputeRef||'',full:!!f.full,manual:true}};
  ccTxns.unshift(t);return t;
}
/* FR-CT-15: Finance records a refund, reversal or credit from its evidence; it counts once someone independent verifies it. */
function ccTxnCreditRecord(origId,d,A){
  A=A||ccNow();d=d||{};const o=ccTxn(origId);
  if(!o||o.entity!==ccEnt())return {error:'No such transaction.'};
  if(o.demo)return {error:'An illustrative transaction is refunded only with Add Illustrative Refund in presentation mode; nothing genuine is recorded for it.'};
  if(!ccPCan(A,'card.transaction.record'))return {error:caN(A.who)+' cannot record card transactions (card.transaction.record).'};
  const why=ccCreditWhyNot(o);if(why)return {error:why};
  const kind=CCR_KINDS.indexOf(d.kind)>=0?d.kind:'';if(!kind)return {error:'Pick the type: Refund, Reversal, Wallet Credit or Dispute Credit.'};
  const amt=ccCrNum(d.amount);if(!(amt>0)||!ccCr2(amt))return {error:'Enter the credited amount (more than zero, at most two decimals).'};
  const fx=o.currency!==o.billCurrency;let bill=amt;
  if(fx){bill=ccCrNum(d.billAmount);if(!(bill>0)||!ccCr2(bill))return {error:'Enter the amount credited to the card in '+o.billCurrency+' as the provider reports it; the credit keeps its own provider conversion (never ADT\'s rate).'};}
  const left=ccTxnRefundable(o),leftO=ccM(o.amount-ccTxnCreditedOrig(o));
  if(bill>left+1e-9)return {error:'Only '+expMoney(left,o.billCurrency)+' of '+expKey(o)+' is still refundable ('+expMoney(ccTxnCredited(o),o.billCurrency)+' already credited or awaiting verification). Credits never exceed what was spent.'};
  if(fx&&amt>leftO+1e-9)return {error:'Only '+expMoney(leftO,o.currency)+' of the original '+expMoney(o.amount,o.currency)+' is still refundable.'};
  if(d.full&&Math.abs(bill-left)>1e-9)return {error:'A full '+kind.toLowerCase()+' credits the whole remaining '+expMoney(left,o.billCurrency)+'.'};
  const ref=String(d.extRef||'').trim();if(ref.length<3)return {error:'Enter the provider\'s reference of the credit (from the statement, advice or portal).'};
  const dup=ccTxns.find(function(x){return x.entity===o.entity&&x.provider===o.provider&&String(x.extRef||'').toLowerCase()===ref.toLowerCase();});
  if(dup)return {error:'Reference '+ref+' is already recorded on '+expKey(dup)+((dup.verify||{}).status===CCT_REJECTED?' (verification rejected: correct and resubmit that record instead)':'')+'; one external credit is recorded once.'};
  if(typeof fbRefUsed==='function'&&fbRefUsed(ref))return {error:'Reference '+ref+' is already recorded as a funding entry; one external credit is recorded once.'};
  const ev=String(d.evidence||'').trim();if(!ev)return {error:'Attach the evidence of the credit (statement, provider advice or portal screen).'};
  const reason=String(d.reason||'').trim();if(reason.length<5)return {error:'Say what the credit is for (for example the merchant refunded a cancelled night).'};
  const today=wbToday(),date=String(d.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)return {error:'Enter the credit date (not in the future).'};
  if(date<o.date)return {error:'A credit cannot be dated before the original transaction ('+cdLabel(o.date)+').'};
  const post=String(d.postDate||date);if(post<date||post>today)return {error:'The posting date is on or after the credit date and not in the future.'};
  if(kind==='Dispute Credit'&&String(d.disputeRef||'').trim().length<3)return {error:'Enter the dispute or provider case reference.'};
  const dest=d.dest==='Company Funding Source'?d.dest:'Card Wallet';let src=null;
  if(dest==='Company Funding Source'){
    src=typeof fbSource==='function'?fbSource(d.sourceId):null;
    if(!src||src.entity!==o.entity||src.status!=='Active')return {error:'Pick the active company funding source the money was returned to.'};
    if(src.currency!==o.billCurrency)return {error:src.key+' is kept in '+src.currency+'; the credit is in '+o.billCurrency+'. Nothing is converted at ADT\'s rate.'};
  }
  const t=ccCreditNew(o,{kind:kind,amt:ccM(amt),bill:ccM(bill),rate:fx?Math.round(bill/amt*1e6)/1e6:null,date:date,post:post,ref:ref,ev:ev,reason:reason,dest:dest,src:src,disputeRef:String(d.disputeRef||'').trim(),full:!!d.full},A);
  const what=kind+' of '+expMoney(amt,o.currency)+(fx?' (credited '+expMoney(bill,o.billCurrency)+')':'');
  ccLog(t,'Posted',what+' on '+expKey(o)+' recorded by '+caN(A.who)+' from '+ev+' (reference '+ref+'), '+(dest==='Company Funding Source'?'returned to '+src.key:'credited to the card wallet')+': '+reason+'. It counts only after someone independent verifies it.',A);
  ccLog(o,o.status,what+' recorded as '+expKey(t)+' (awaiting verification). This transaction is unchanged.',A);
  ccNotify(ccPeopleWith('card.refund.verify',o.entity).filter(function(u){return u!==A.who&&u!==caVia(A)&&u!==idUserOfEmp(o.employeeEid);}),expKey(t)+': '+what+' on '+expKey(o)+' awaits verification.',t,'verify');
  return {rec:t};
}
/* Demo: a refund of a Simulated - Demo transaction, in demo mode, never genuine and never posting. */
function ccTxnSimulateCredit(origId,d,A){
  A=A||ccNow();d=d||{};const o=ccTxn(origId);
  if(!o||o.entity!==ccEnt())return {error:'No such transaction.'};
  if(!o.demo)return {error:'Only a '+CC_DEMO+' transaction is refunded as illustrative activity; a genuine refund is recorded from its evidence.'};
  if(!ccPCan(A,'card.demo.simulate')||!ccDemoOn(o.entity))return {error:'Illustrative refunds need presentation mode and card.demo.simulate.'};
  const why=ccCreditWhyNot(o);if(why)return {error:why};
  const kind=CCR_KINDS.indexOf(d.kind)>=0?d.kind:'Refund',amt=ccCrNum(d.amount);
  if(!(amt>0)||!ccCr2(amt))return {error:'Enter the amount.'};
  if(amt>ccTxnRefundable(o)+1e-9)return {error:'Only '+expMoney(ccTxnRefundable(o),o.billCurrency)+' of '+expKey(o)+' is still refundable.'};
  const t=ccCreditNew(o,{kind:kind,amt:ccM(amt),bill:ccM(amt),rate:null,date:wbToday(),post:wbToday(),ref:'ILLUSTRATIVE-'+ccTxnNextKey,ev:'',reason:String(d.reason||'Illustrative refund').trim(),dest:'Card Wallet',src:null,demo:true},A);
  ccLog(t,'Posted',CC_DEMO+' '+kind.toLowerCase()+' of '+expMoney(amt,o.currency)+' on '+expKey(o)+' by '+caN(A.who)+'. Illustrative activity only: no genuine credit, funding, budget or reimbursement effect.',A);
  ccCreditApply(t,A);
  return {rec:t};
}

/* The approved expense lines an original purchase is matched to (its business context). */
function ccCreditTargets(o){
  return ccMatchesOfTxn(o.id).map(function(m){const r=expRec(m.claimId),l=r&&(r.lines||[]).find(function(x){return x.id===m.lineId;});return r&&l?{m:m,r:r,l:l}:null;}).filter(Boolean);
}
function ccCreditInCur(c,cur){return cur===c.currency?c.amount:cur===c.billCurrency?c.billAmount:null;}
/* Card-funded amount of a line still open to refund corrections: approved card part less earlier corrections. */
function ccLineRefundRoom(r,l,except){
  const ap=l.cardSplit&&l.cardSplit.approvedCard!=null?l.cardSplit.approvedCard:ccLineCardAmt(l);
  const used=ccTxns.reduce(function(s,c){if(c===except||!c.alloc||!c.alloc.lines)return s;return s+c.alloc.lines.filter(function(x){return x.claimId===r.id&&x.lineId===l.id;}).reduce(function(a,x){return a+x.amount;},0);},0);
  return ccM(Math.max(0,ap-used));
}
function ccLineClosedFy(l,r){const d=l.start||r.appliedOn||'';return !!d&&typeof bgFyStatus==='function'&&bgFyStatus(bgFyOf(d,r.entity).label,r.entity).status==='Closed';}
/* Book line corrections (and CSX settlements) for a verified credit, once. */
function ccCreditBook(c,lines,csxParts,o,A){
  const out=[];
  lines.forEach(function(x){
    const r=expRec(x.claimId),l=r.lines.find(function(y){return y.id===x.lineId;}),m=l.bgt&&l.bgt.alloc?Object.assign({},l.bgt):null;
    const closed=ccLineClosedFy(l,r),rate=m&&typeof bgRateOf==='function'?bgRateOf(m,r.currency):null;
    const row={claimId:r.id,claimKey:expKey(r),lineId:l.id,lineRef:ccLineRef(r,l),amount:ccM(x.amount),currency:r.currency,budgetMap:m,expenseDate:l.start,refundDate:c.date,
      status:closed?CCR_CLOSED:m?'Applied':'Applied – No Budget Allocation',events:[]};
    if(m&&rate)row.fx={adtRate:rate,adtAmount:bgM(row.amount*rate),budgetCurrency:m.currency||'',provider:c.currency!==c.billCurrency?{bill:c.billAmount,billCurrency:c.billCurrency,rate:c.rate}:null};
    out.push(row);
  });
  c.alloc=Object.assign(c.alloc||{},{status:out.some(function(x){return x.status===CCR_CLOSED;})?CCR_CLOSED:o.auto?'Applied':'Allocated',lines:out,csx:[],by:A.who,actual:caVia(A),at:ccStamp(A),reason:o.reason||'',auto:!!o.auto});
  (csxParts||[]).forEach(function(p){
    const x=ccCsx(p.id),rr=ccCsxCreditExpect(x.id,{kind:c.type==='Dispute Credit'?'Dispute Credit':'Verified Refund',amount:p.amount,ref:c.extRef,reason:'Allocated from '+expKey(c)+': '+(o.reason||'')},A);
    if(rr.error){c.alloc.csxError=rr.error;return;}
    const e=ccCsxLinkCredit(x.id,rr.res.n,c.id,p.amount,A,{reason:'Finance allocation of '+expKey(c)+': '+(o.reason||''),reviewed:true,reviewNote:'Finance allocation review of '+expKey(c)});c.alloc.csx.push({id:x.id,key:expKey(x),n:rr.res.n,amount:ccM(p.amount),error:e||''});
  });
  if(typeof bgSyncAll==='function')bgSyncAll(A);
  c.alloc.lines.forEach(function(x,i){if(x.status!=='Applied'||typeof bgEvents==='undefined')return;x.events=bgEvents.filter(function(e){return String(e.src).indexOf('CTXR-'+c.key+'/'+(i+1))===0;}).map(function(e){return e.ref;});});
  const txt=c.alloc.lines.map(function(x){return x.lineRef+' '+expMoney(x.amount,x.currency)+' – '+(x.status==='Applied'?'budget utilization reduced once on the original allocation'+(x.events.length?' ('+x.events.join(', ')+')':''):x.status===CCR_CLOSED?'the financial year of the expense is closed: Pending – Closed Period Adjustment (nothing posted into the closed year)':'no budget allocation on the line, nothing to post');}).join('; ')
    +(c.alloc.csx.length?(c.alloc.lines.length?'; ':'')+c.alloc.csx.map(function(x){return expKey(ccCsx(x.id))+' settled '+expMoney(x.amount,c.billCurrency)+' (verified refund)';}).join('; '):'');
  ccLog(c,c.status,'Business allocation '+c.alloc.status+(o.auto?' (automatic: the credit clearly belongs to one approved card-funded line)':' by '+caN(A.who))+': '+(txt||'no business adjustment')+'. No reimbursement is created or changed; the approved claim stays as it was.',A);
  c.alloc.lines.forEach(function(x){const r=expRec(x.claimId);if(r&&typeof caLog==='function')caLog(r,r.status,'Card credit '+expKey(c)+' ('+expMoney(x.amount,x.currency)+') on '+x.lineRef+': '+(x.status==='Applied'?'budget utilization reduced once':x.status)+'. The approved claim, its approval and its reimbursement are unchanged.',A);});
}
function ccCreditReview(c,why,A){
  c.alloc={status:CCR_REVIEW,why:why,lines:[],csx:[],at:ccStamp(A)};
  ccLog(c,c.status,'Sent to Finance allocation review: '+why+'. Nothing is distributed automatically.',A);
  ccNotify(ccPeopleWith('card.transaction.match',c.entity).filter(function(u){return u!==A.who;}),expKey(c)+': card credit of '+expMoney(c.billAmount,c.billCurrency)+' needs an allocation decision ('+why+').',c,'alloc');
}
/* After a credit is verified (or a demo credit is simulated): where the money went, and its business effect. Idempotent. */
function ccCreditApply(c,A){
  if(!c||c.direction!=='Credit'||!c.refund||c.refund.applied)return;
  A=A||ccNow();c.refund.applied=true;c.refund.appliedAt=ccStamp(A);
  const o=c.refundOf&&c.refundOf.id?ccTxn(c.refundOf.id):null;
  if(c.demo){c.refund.processing=CC_DEMO;c.alloc={status:'Illustrative',lines:[],csx:[],note:CC_DEMO+' credit: illustrative activity only; no budget, funding or reimbursement effect.'};if(o)ccTxnMatchSet(o);return;}
  if(!o){c.alloc={status:'Under Review – Original Not Identified',lines:[],csx:[]};return;}   // the 8B processing label is kept
  if(c.refund.dest==='Company Funding Source'&&typeof fbPostSystem==='function'){
    const f=fbPostSystem({sourceId:c.refund.sourceId,type:'Funding In',dir:1,amount:c.billAmount,date:c.date,ref:c.extRef,extRef:c.extRef,
      desc:c.type+' '+expKey(c)+' of card transaction '+expKey(o)+' returned to the company funding source (verified card credit)',evidence:c.evidence,status:'Verified',
      originType:'card refund',key:'CTXR-'+c.key+'/funding',recId:c.id,recKey:expKey(c)},A);
    if(f){f.recordedBy=c.recordedBy;if(c.actual)f.recordedActual=c.actual;f.verifiedBy=A.who;if(caVia(A))f.verifiedActual=caVia(A);c.refund.fundingKey=f.key;c.refund.fundingId=f.id;
      ccLog(c,c.status,'Returned to '+c.refund.sourceKey+': one verified funding entry '+f.key+' ('+expMoney(c.billAmount,c.billCurrency)+').',A);}
  }
  c.refund.processing=c.refund.dest==='Company Funding Source'?'Verified – Returned to Funding Source':'Verified – Credited to Card Wallet';
  ccCreditDecide(c,o,A);
  ccTxnMatchSet(o);
  ccLog(o,o.status,'Verified '+c.type.toLowerCase()+' '+expKey(c)+' of '+expMoney(c.billAmount,c.billCurrency)+': net card spending now '+expMoney(ccTxnNetSpend(o),o.billCurrency)+' of '+expMoney(o.billAmount,o.billCurrency)+'. This transaction is unchanged.',A);
}
function ccCreditDecide(c,o,A){
  if(o.walletClass==='Flexi Benefit'){c.alloc={status:'Not Applicable',lines:[],csx:[],note:'Benefit-wallet credit: linked to the original spend; no entitlement or allocation is created and no expense or reimbursement is affected.'};return;}
  const T=ccCreditTargets(o);
  if(!T.length){c.alloc={status:'Not Applicable',lines:[],csx:[],note:'No expense claim holds '+expKey(o)+': the credit reduces its net card spending; any claim is for the net amount.'};return;}
  if(T.length>1)return ccCreditReview(c,'it relates to '+T.length+' expense lines ('+T.map(function(x){return ccLineRef(x.r,x.l);}).join(', ')+')',A);
  const x=T[0],r=x.r,l=x.l;
  if(['Approved','Partially Approved'].indexOf(r.status)<0)return ccCreditReview(c,expKey(r)+' is '+r.status+', not yet decided',A);
  const csx=typeof ccSpendExcOf==='function'?ccSpendExcOf(r.id,l.id):null;
  if(csx&&typeof ccCsxActive==='function'&&ccCsxActive(csx))return ccCreditReview(c,expKey(csx)+' is open on '+ccLineRef(r,l)+': Finance decides whether the credit settles the unapproved card spend or reduces the approved expense',A);
  const amt=ccCreditInCur(c,r.currency);
  if(amt==null)return ccCreditReview(c,expKey(r)+' is in '+r.currency+' and the credit is in '+c.currency+(c.billCurrency!==c.currency?'/'+c.billCurrency:'')+': the business amount is decided by Finance (never at an assumed rate)',A);
  const room=ccLineRefundRoom(r,l,c);
  if(amt>room+1e-9)return ccCreditReview(c,'the credit ('+expMoney(amt,r.currency)+') is more than the approved card-funded amount left on '+ccLineRef(r,l)+' ('+expMoney(room,r.currency)+')',A);
  ccCreditBook(c,[{claimId:r.id,lineId:l.id,amount:amt}],[],{auto:true,reason:'Clearly belongs to '+ccLineRef(r,l)},A);
}
/* Finance's allocation decision (FR-CT-16.10; G6): lines of the original's claims and/or its open CSX; or no business adjustment. */
function ccCreditAllocate(id,d,A){
  A=A||ccNow();d=d||{};const c=ccTxn(id);
  if(!c||c.entity!==ccEnt()||c.direction!=='Credit')return 'No such credit.';
  if(!c.alloc||c.alloc.status!==CCR_REVIEW)return expKey(c)+' does not await an allocation decision ('+(c.alloc?c.alloc.status:'not yet verified')+').';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot allocate card credits (card.transaction.match).';
  const via=caVia(A),hold=idUserOfEmp(c.employeeEid);
  if([c.recordedBy,c.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(c.recordedBy)+' recorded this credit; someone else decides its allocation.';
  if(A.who===hold||via===hold)return 'The cardholder never allocates their own card credits.';
  const reason=String(d.reason||'').trim();if(reason.length<10)return 'Give the reason for the allocation (at least 10 characters).';
  const o=ccTxn(c.refundOf.id),T=ccCreditTargets(o);
  const lines=[],parts=[];let total=0;
  for(let i=0;i<(d.lines||[]).length;i++){
    const q=d.lines[i],a=ccCrNum(q.amount);if(!(a>0))continue;
    const x=T.find(function(y){return y.r.id===Number(q.claimId)&&y.l.id===Number(q.lineId);});
    if(!x)return 'Line '+q.claimId+'/'+q.lineId+' is not an expense line of '+expKey(o)+'.';
    if(['Approved','Partially Approved'].indexOf(x.r.status)<0)return expKey(x.r)+' is '+x.r.status+': only an approved expense is adjusted.';
    const cv=ccCreditInCur(c,x.r.currency);if(cv==null)return expKey(x.r)+' is in '+x.r.currency+'; enter the allocation in the credit\'s currency only when the claim uses it.';
    if(!ccCr2(a))return 'Amounts have at most two decimals.';
    const room=ccLineRefundRoom(x.r,x.l,c);if(a>room+1e-9)return 'Only '+expMoney(room,x.r.currency)+' of '+ccLineRef(x.r,x.l)+' is open to a refund correction.';
    lines.push({claimId:x.r.id,lineId:x.l.id,amount:ccM(a)});total+=a*(c.amount/cv);
  }
  for(let i=0;i<(d.csx||[]).length;i++){
    const q=d.csx[i],a=ccCrNum(q.amount);if(!(a>0))continue;const x=ccCsx(q.id);
    if(!x||!T.some(function(y){return y.r.id===x.claimId&&y.l.id===x.lineId;}))return 'That card spend exception is not on a line of '+expKey(o)+'.';
    const may=ccCsxMay(A,x);if(may)return may;
    const v=ccCsxAmounts(x);if(a>v.free+1e-9)return 'Only '+expMoney(v.free,x.currency)+' of '+expKey(x)+' is free to settle.';
    if(x.currency!==c.billCurrency)return expKey(x)+' is in '+x.currency+'; the card credit is in '+c.billCurrency+'. Settle it from the card spend exception (Link Credit) with the documented exchange rate and its evidence; Finance reviews it there.';
    parts.push({id:x.id,amount:ccM(a)});total+=a*(c.amount/c.billAmount);
  }
  if(total>c.amount+0.01)return 'The allocation ('+expMoney(ccM(total),c.currency)+') is more than the credit ('+expMoney(c.amount,c.currency)+').';
  if(!lines.length&&!parts.length){
    if(!d.none)return 'Allocate the credit to an approved line or an open card spend exception, or record that it needs no business adjustment.';
    c.alloc=Object.assign(c.alloc,{status:'Closed – No Business Adjustment',by:A.who,actual:via,at:ccStamp(A),reason:reason});
    ccLog(c,c.status,'Allocation decided by '+caN(A.who)+': no business adjustment ('+reason+'). The credit stays recorded as net card spending.',A);return '';
  }
  ccCreditBook(c,lines,parts,{reason:reason},A);return '';
}
/* Refund corrections join Build 6's own derivation: one negative state per corrected line, so a re-sync never posts twice. */
ccHook('bgDesired',null,function(out){
  if(!out)return undefined;
  ccTxns.forEach(function(c){
    if(c.direction!=='Credit'||c.demo||!c.alloc||!c.alloc.lines)return;
    c.alloc.lines.forEach(function(x,i){
      if(x.status!=='Applied'||!x.budgetMap)return;const m=x.budgetMap;
      if(typeof bgFrozenMap==='function'&&bgFrozenMap(m))return;
      const rate=bgRateOf(m,x.currency);if(!rate)return;
      const src='CTXR-'+c.key+'/'+(i+1),k=src+'@'+m.fy;
      out[k]={key:k,src:src,entity:c.entity,budget:m.budget,alloc:m.alloc,fy:m.fy,q:m.q,date:m.date,label:expKey(c)+' · card refund correction ('+x.lineRef+')',kind:'Card refund correction',recId:c.id,
        pending:0,committed:0,actual:-bgM(x.amount*rate),exposure:0,linked:0,comp:null,carriedFrom:null};
    });
  });
  return undefined;
});
/* Verification: a manual credit needs the explicit refund-verification right (G9); then it is applied once. */
ccHook('ccTxnWhyNotVerify',function(t,A){
  if(t&&t.direction==='Credit'&&t.refund&&t.refund.manual&&!t.demo&&!ccPCan(A||ccNow(),'card.refund.verify'))return caN((A||ccNow()).who)+' cannot verify card refunds and reversals (card.refund.verify).';
  return undefined;
});
const ccTxnVerifyBase8E=ccTxnVerify;
ccTxnVerify=function(id,A){
  const out=ccTxnVerifyBase8E(id,A),t=ccTxn(id);
  if(!out&&t&&t.direction==='Credit'&&(t.verify||{}).status===CCT_VERIFIED)ccCreditApply(t,A||ccNow());
  return out;
};
/* Statement credits (8B) take the same path once their statement is verified. */
ccHook('ccStmtVerify',null,function(out,id,A){
  if(!out||out.error)return undefined;
  ccTxns.forEach(function(c){if(c.direction==='Credit'&&!c.demo&&(c.verify||{}).status===CCT_VERIFIED&&c.refund&&!c.refund.applied){
    if(!c.refund.dest)c.refund.dest='Card Wallet';ccCreditApply(c,A||ccNow());}});
  return undefined;
});
/* Matching and claims see net spending: verified credits reduce what is unmatched and what can still be claimed. */
const ccTxnMatchSetBase8E=ccTxnMatchSet;
ccTxnMatchSet=function(t){
  ccTxnMatchSetBase8E(t);if(!t||t.direction==='Credit')return;
  const cr=ccTxnCredited(t,{verified:true});t.creditedAmount=cr;
  if(!(cr>0)||t.walletClass==='Flexi Benefit')return;
  if(t.matchStatus==='Partially Matched'){const left=ccM(t.unmatchedAmount-(t.matchCurrency===t.currency?ccTxnCreditedOrig(t,{verified:true}):cr));
    if(left<=0.009){t.matchStatus='Matched';t.unmatchedAmount=0;}else t.unmatchedAmount=left;}
  else if((t.matchStatus==='Unmatched'||t.matchStatus==='Suggested')&&ccTxnNetSpend(t)<=0.009)t.matchStatus='Fully Refunded';
};
ccHook('ccTxnClaimDue',null,function(out,t){
  if(!out||!t||['Unclaimed','Due','Due Soon','Overdue','Late Data'].indexOf(out.state)<0)return undefined;
  if(ccTxnNetSpend(t)<=0.009)return Object.assign({},out,{state:'Not Required',tone:'idle',text:'Fully refunded or reversed: no expense claim is needed.'});
  return undefined;
});
ccHook('ccTxnExpenseWhyNot',null,function(out,t){
  if(out||!t||t.direction==='Credit')return undefined;
  if(ccTxnNetSpend(t)<=0.009&&ccTxnCredited(t,{verified:true})>0)return expKey(t)+' was fully refunded or reversed: there is no card spending left to claim.';
  return undefined;
});
/* A claim made after a verified credit claims at most the net spending (G6; FR-CT-15.12). */
const ccExpTxnCheckBase8E=ccExpTxnCheck;
ccExpTxnCheck=function(d,ctx,cardAmt,o){
  const out=ccExpTxnCheckBase8E(d,ctx,cardAmt,o);if(out)return out;
  const t=d&&Number(d.txnId)?ccTxn(d.txnId):null;if(!t)return out;
  const cr=ccTxnCredited(t,{verified:true});if(!(cr>0))return out;
  const cur=(ctx&&ctx.currency)||t.currency,net=cur===t.currency?ccM(t.amount-ccTxnCreditedOrig(t,{verified:true})):cur===t.billCurrency?ccTxnNetSpend(t):null;
  if(net==null)return out;
  const others=(typeof ccTxnHolds==='function'?ccTxnHolds(t,{claimId:ctx&&ctx.claimId,lineId:d.id}):[]).reduce(function(s,h){return s+(h.currency===cur?h.amount:0);},0);
  if(Number(cardAmt)>ccM(net-others)+1e-9)return 'The card-funded amount cannot exceed what remains of '+expKey(t)+' after its verified credits: '+expMoney(Math.max(0,ccM(net-others)),cur)+' (credited '+expMoney(cur===t.currency?ccTxnCreditedOrig(t,{verified:true}):cr,cur)+').';
  return out;
};

/* ── Benefit-wallet spending (FR-CT-17): the Build 1 context of each spend, never a claim, never a second allocation ── */
function ccTxnBenefitCtx(t){
  if(!t||t.walletClass!=='Flexi Benefit')return null;
  const cats=(typeof wbCategories!=='undefined'?wbCategories:[]).filter(function(c){const w=typeof wbWalletOf==='function'?wbWalletOf(c):null;return c.entity===t.entity&&w&&w.type===t.wallet;});
  const cat=cats.find(function(c){return c.status==='Active';})||cats[0]||null;
  const period=(ccTxnLocalDate(t)||t.date).slice(0,7);
  const rows=[];(typeof wbBatches!=='undefined'?wbBatches:[]).forEach(function(b){if(b.entity!==t.entity||['Approved','Funded'].indexOf(b.status)<0)return;
    (b.rows||[]).forEach(function(r){if(r.eid===t.employeeEid&&r.walletType===t.wallet&&String(r.period||b.period||'').slice(0,7)===period&&r.status!=='Cancelled')rows.push(r);});});
  const same=function(x){return x.cardId===t.cardId&&x.wallet===t.wallet&&!!x.demo===!!t.demo;};
  const loaded=ccM(ccLoads.filter(function(l){return same({cardId:l.cardId,wallet:l.wallet,demo:!!(l.exec&&l.exec.demo)})&&l.exec;}).reduce(function(s,l){return s+(typeof ccLoadNet==='function'?ccLoadNet(l):0);},0));
  const live=function(x){return x.status==='Posted'&&(x.demo||(x.verify||{}).status===CCT_VERIFIED);};
  const spends=ccTxns.filter(function(x){return same(x)&&x.direction!=='Credit'&&live(x);}),credits=ccTxns.filter(function(x){return same(x)&&x.direction==='Credit'&&live(x);});
  const spent=ccM(spends.reduce(function(s,x){return s+x.billAmount;},0)-credits.reduce(function(s,x){return s+x.billAmount;},0));
  const inPeriod=ccM(spends.filter(function(x){return (ccTxnLocalDate(x)||x.date).slice(0,7)===period;}).reduce(function(s,x){return s+x.billAmount;},0)-credits.filter(function(x){return (ccTxnLocalDate(x)||x.date).slice(0,7)===period;}).reduce(function(s,x){return s+x.billAmount;},0));
  const allocated=ccM(rows.reduce(function(s,r){return s+(Number(r.amount)||0);},0));
  const flags=[];
  if(spent>loaded+0.009)flags.push('Recorded spending on this wallet ('+expMoney(spent,t.billCurrency)+') is above its recorded loads ('+expMoney(loaded,t.billCurrency)+'): review the missing load or statement data.');
  if(rows.length&&inPeriod>allocated+0.009)flags.push('Spending in '+period+' ('+expMoney(inPeriod,t.billCurrency)+') is above the recorded allocation ('+expMoney(allocated,'INR')+', '+rows.map(function(r){return r.key;}).join(', ')+').');
  return {category:cat?cat.name:wbTypeName(t.wallet),code:cat?cat.code:t.wallet,processing:cat?cat.processing:'Wallet-Funded',period:period,allocKeys:rows.map(function(r){return r.key;}),allocated:allocated,
    loaded:loaded,spent:spent,inPeriod:inPeriod,flags:flags,note:'ADT records (recorded loads and verified spending), not a bank-reported wallet balance'+(t.demo?' – '+CC_DEMO+' activity only':'')+'.'};
}

/* ── Historical card controls (FR-CT-08.01-06): the controls in force when the payment happened; never a network block ── */
function ccTxnOrderKey(x){return (x.utc||((ccTxnLocalDate(x)||x.date)+'T'+(x.time||'23:59')))+'#'+String(1e9+x.id);}
function ccTxnClaimCategory(t){const m=ccMatchesOfTxn(t.id)[0],r=m?expRec(m.claimId):null;return r?r.category:'';}
function ccTxnControlEval(t){
  if(!t||t.direction==='Credit'||t.status!=='Posted')return null;
  const c=ccCard(t.cardId);if(!c)return null;
  const day=ccTxnLocalDate(t)||t.date,s=ccCardCtl(c,day),p=ccProg(c.programmeId),cur=t.billCurrency;
  if(!s)return {status:'No Controls Recorded',breaches:[],unable:[],day:day,text:'No card controls were recorded for '+cdLabel(day)+'.'};
  const br=[],un=[],lim=function(v){return ccLim(v);};
  if(lim(s.perTxn)!=null&&t.billAmount>lim(s.perTxn)+1e-9)br.push('Above the per-transaction limit of '+ccAmt(s.perTxn,cur)+' ('+expMoney(t.billAmount,cur)+').');
  const me=ccTxnOrderKey(t),pool=ccTxns.filter(function(x){return x.cardId===t.cardId&&x.direction!=='Credit'&&x.status==='Posted'&&!!x.demo===!!t.demo&&(x.demo||(x.verify||{}).status===CCT_VERIFIED)&&ccTxnOrderKey(x)<=me;});
  [['daily',function(d){return d===day;},'daily'],['monthly',function(d){return d.slice(0,7)===day.slice(0,7);},'monthly'],['annual',function(d){return d.slice(0,4)===day.slice(0,4);},'annual']].forEach(function(k){
    const L=lim(s[k[0]]);if(L==null)return;const tot=ccM(pool.filter(function(x){return k[1](ccTxnLocalDate(x)||x.date);}).reduce(function(a,x){return a+x.billAmount;},0));
    if(tot>L+1e-9)br.push('Card spending of '+expMoney(tot,cur)+' up to this payment is above the '+k[2]+' limit of '+ccAmt(L,cur)+'.');});
  const off=CC_CHANNELS.filter(function(ch){return !s.channels[ch];});
  if(off.length){if(!t.channel)un.push('channel ('+off.join(', ')+' not permitted)');else if(!s.channels[t.channel])br.push(t.channel+' use was not permitted.');}
  const cc=String(t.country||'').toUpperCase();
  if(s.countryAllow.length||s.countryBlock.length){if(!cc)un.push('country');else{if(s.countryAllow.length&&s.countryAllow.indexOf(cc)<0)br.push(cc+' was not an allowed country.');if(s.countryBlock.indexOf(cc)>=0)br.push(cc+' was blocked.');}}
  if(s.international&&s.international!=='Allow'&&!s.countryAllow.length)un.push('international use (no home country is recorded to compare '+(cc||'the country')+' with)');
  const m=String(t.mcc||'');
  if(s.mccAllow.length||s.mccBlock.length){if(!m)un.push('merchant code (MCC)');else{if(s.mccAllow.length&&s.mccAllow.indexOf(m)<0)br.push('Merchant code '+m+' was not allowed.');if(s.mccBlock.indexOf(m)>=0)br.push('Merchant code '+m+' was blocked.');}}
  if(s.allowedCats.length||s.blockedCats.length){const k=ccTxnClaimCategory(t);if(!k)un.push('expense category (known once the payment is claimed)');else{if(s.allowedCats.length&&s.allowedCats.indexOf(k)<0)br.push(k+' was not an allowed category.');if(s.blockedCats.indexOf(k)>=0)br.push(k+' was blocked.');}}
  const status=br.length?CCX_CONTROL:un.length?'Unable to Evaluate':'Within Controls';
  return {status:status,breaches:br,unable:un,day:day,
    text:status===CCX_CONTROL?'Recorded controls on '+cdLabel(day)+' were not met: '+br.join(' ')+(un.length?' Not evaluated for lack of data: '+un.join(', ')+'.':'')+' The provider authorized the payment; ADT does not claim it was blocked and does not suspend the card for it.'
      :status==='Unable to Evaluate'?'Not enough data to evaluate: '+un.join(', ')+'. It is not treated as compliant.':'Within the controls recorded for '+cdLabel(day)+'.'};
}

/* ── Exceptions: refund allocation reviews, control exceptions and benefit-wallet policy exceptions (existing view) ── */
ccHook('ccCardExceptions',null,function(out,ent,o){
  if(!out)return undefined;ent=ent||ccEnt();o=o||{};
  let own=o.eid||'';if(!own&&typeof ccMatchQueueVisible==='function'&&!ccMatchQueueVisible()){const me=typeof ccEmpOf==='function'?ccEmpOf():null;own=me?me.eid:'-';}
  const add=function(row){if(own&&row.eid!==own)return;if(o.group&&row.group!==o.group)return;row.key=ccExcKeyOf(row);row.state=ccExcState(row.key);out.push(row);};
  ccTxns.forEach(function(t){
    if(t.entity!==ent||!ccTxnVisible(t))return;
    if(t.direction==='Credit'&&!t.demo){
      const a=t.alloc,st=a?a.status:'',pr=t.refund&&t.refund.processing;
      if(st===CCR_REVIEW||st===CCR_CLOSED||st==='Under Review – Original Not Identified'||(!a&&pr&&/Original Not Identified/.test(pr)&&(t.verify||{}).status===CCT_VERIFIED))
        add({kind:'txn',group:CCX_REFUND,category:st||pr,t:t,eid:t.employeeEid,amount:t.billAmount,currency:t.billCurrency,info:{status:st||pr,tone:'wait'},
          text:st===CCR_REVIEW?'Card credit of '+(t.refundOf&&t.refundOf.key?t.refundOf.key:'an unidentified purchase')+': '+a.why+'.':st===CCR_CLOSED?'Budget correction waits for an authorized closed-period process: '+a.lines.filter(function(x){return x.status===CCR_CLOSED;}).map(function(x){return x.lineRef+' (expense '+cdLabel(x.expenseDate)+', credit '+cdLabel(x.refundDate)+', '+expMoney(x.amount,x.currency)+')';}).join('; ')+'.'
            :'The original purchase is not identified: the verified credit is kept as recorded money movement and allocated to nothing until Finance identifies it.'});
      return;
    }
    if(t.direction!=='Credit'&&!t.demo){
      const ce=ccTxnControlEval(t);
      if(ce&&ce.status===CCX_CONTROL)add({kind:'txn',group:CCX_CONTROL,category:CCX_CONTROL,t:t,eid:t.employeeEid,amount:t.billAmount,currency:t.billCurrency,info:{status:CCX_CONTROL,tone:'bad'},text:ce.text});
    }
    if(t.walletClass==='Flexi Benefit'&&t.direction!=='Credit'&&t.status==='Posted'&&(t.demo||(t.verify||{}).status===CCT_VERIFIED)){
      const b=ccTxnBenefitCtx(t);if(b&&b.flags.length&&!out.some(function(x){return x.group===CCX_BENEFIT&&x.t&&x.t.cardId===t.cardId&&x.t.wallet===t.wallet;}))
        add({kind:'txn',group:CCX_BENEFIT,category:CCX_BENEFIT,t:t,eid:t.employeeEid,amount:b.spent,currency:t.billCurrency,info:{status:'Review',tone:'wait'},text:b.flags.join(' ')+' '+b.note});
    }
  });
  return undefined;
});

/* A credit settled against a card spend exception through the CSX panel (8D) closes its allocation review. */
ccHook('ccCsxLinkCredit',null,function(out,id,n,txnId){
  if(out)return undefined;const c=ccTxn(txnId);
  if(c&&c.alloc&&c.alloc.status===CCR_REVIEW&&typeof ccTxnCreditFree==='function'&&ccTxnCreditFree(c)<=0.009){
    c.alloc.status='Allocated';c.alloc.csx=(c.csxAllocs||[]).map(function(a){return {id:a.csxId,key:a.key,n:a.n,amount:a.amount};});
    ccLog(c,c.status,'Allocated in full to '+c.alloc.csx.map(function(a){return a.key;}).join(', ')+' (card spend exception settled by this verified credit).',ccNow());
  }
  return undefined;
});

/* ── Employee-facing recovery view (B8-N22-08, 8 Nov 2026): the cardholder is told once a formal recovery is approved and
   sees, for that recovery only: the expense and transaction reference, the masked card, the transaction date, the recovery
   amount, the business reason, its status and the action required. No budget, funding or internal notes; approved is not
   collected - collected changes only after verified payment evidence; no payroll deduction. ── */
const CSX_EMP_REC=['Recovery Pending','Partially Recovered','Recovered','Cancelled'];
function ccCsxEmpRecStatus(r){
  if(r.status==='Recovered')return 'Recovered';
  if(r.status==='Cancelled')return 'Recovery Cancelled';
  if((r.collections||[]).some(function(c){return c.status==='Awaiting Verification';}))return 'Payment Under Verification';
  if(r.status==='Partially Recovered')return 'Partially Recovered';
  return 'Recovery Approved – Awaiting Payment';
}
function ccCsxEmpRecView(x,r){
  const o=ccCsxLine(x),l=o.l,t=l&&Number(l.txnId)?ccTxn(l.txnId):null,coll=ccM(r.resolved||0),st=ccCsxEmpRecStatus(r);
  const due=st==='Recovery Cancelled'?0:ccM(Math.max(0,r.amount-coll));
  const under=ccM((r.collections||[]).filter(function(c){return c.status==='Awaiting Verification';}).reduce(function(s,c){return s+c.amount;},0));
  return {id:x.id,n:r.n,ref:expKey(x)+'/'+r.n,claimKey:x.claimKey,lineTitle:x.lineTitle,txnKey:t?expKey(t):'',card:ccMask(x.cardRef&&x.cardRef.last4),txnDate:t?(ccTxnLocalDate(t)||t.date):x.date,
    amount:ccM(r.amount),collected:coll,due:due,underVerification:under,currency:x.currency,method:r.method,reason:r.reason,status:st,approvedAt:r.approval?r.approval.at:'',
    action:st==='Recovered'||st==='Recovery Cancelled'?'None.':st==='Payment Under Verification'?'None for now: Finance is verifying the payment you made.':'Repay '+expMoney(due,x.currency)+' to the company ('+r.method+') and share the payment reference with Finance. Nothing is deducted from your salary.'};
}
function ccCsxEmpRecoveries(eid,ent){
  ent=ent||ccEnt();const out=[];
  ccSpendExcs.forEach(function(x){if(x.entity!==ent||x.employeeEid!==eid)return;
    (x.resolutions||[]).forEach(function(r){if(r.type==='Employee Recovery'&&r.approval&&r.approval.decision==='Approve'&&CSX_EMP_REC.indexOf(r.status)>=0)out.push(ccCsxEmpRecView(x,r));});});
  return out;
}
/* Clarification or evidence from the cardholder on an approved recovery, through the existing exception workflow. */
function ccCsxEmpRespond(id,n,d,A){
  A=A||ccNow();d=d||{};const x=ccCsx(id);if(!x||x.entity!==ccEnt())return 'No such recovery.';
  if(!ccCsxEmpRecoveries(x.employeeEid,x.entity).some(function(v){return v.id===x.id&&v.n===Number(n);}))return 'There is no approved recovery to respond to.';
  const e=ccExcRespond('csx:'+x.id,{note:d.note,file:d.file},A);if(e)return e;
  ccNotify(ccCsxResolvers(x,[A.who]),expKey(x)+': the cardholder sent information on the approved recovery '+expKey(x)+'/'+n+'.',x,'emprec-'+n+'-'+ccExcGet('csx:'+x.id).items.length);
  return '';
}
/* Finance review of a credit link in another currency, from another card or returned to a funding source (B8-N22-09). */
function ccCsxCreditReviewers(x,c){const h=idUserOfEmp(x.employeeEid);return ccPeopleWith('card.transaction.match',x.entity).filter(function(u){return u!==c.by&&u!==c.actual&&u!==h&&(typeof caActive!=='function'||caActive(u));});}
function ccCsxCreditReview(id,n,txnId,decision,remarks,A){
  A=A||ccNow();remarks=String(remarks||'').trim();const x=ccCsxGet(id);if(!x)return 'No such card spend exception.';
  const r=ccCsxRes(x,n),c=r&&(r.credits||[]).find(function(y){return y.txnId===Number(txnId)&&y.status==='Awaiting Finance Review';});
  if(!c)return 'No credit link awaits Finance review here.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot review card credits (card.transaction.match).';
  const via=caVia(A),h=idUserOfEmp(x.employeeEid);
  if([c.by,c.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(c.by)+' linked this credit; someone else in Finance reviews it.';
  if(A.who===h||via===h)return 'The cardholder never reviews credits on their own card spend.';
  if(decision!=='Approve'&&decision!=='Reject')return 'Approve or Reject.';
  if(remarks.length<5)return 'Give the review remarks (what was checked: rate, card or destination).';
  const t=ccTxn(c.txnId);
  c.review={status:decision==='Approve'?'Reviewed':'Rejected',by:A.who,actual:via,at:ccStamp(A),note:remarks};
  if(decision==='Reject'){c.status='Rejected';if(t)t.csxAllocs=(t.csxAllocs||[]).filter(function(a){return !(a.csxId===x.id&&a.n===r.n);});}else c.status='Linked';
  ccCsxCreditRefresh(x,r,A);
  ccLog(x,x.status,'Credit link '+c.key+' ('+ccCsxDiffText(c.diff)+') '+(decision==='Approve'?'reviewed and accepted':'rejected')+' by '+caN(A.who)+': '+remarks+'.'+(decision==='Approve'?(r.resolved>0?' Resolved so far '+expMoney(r.resolved,x.currency)+'.':' It counts once the credit is verified.'):' The credit is free again; the amount stays outstanding.'),A);
  if(t)ccLog(t,t.status,'Link to '+expKey(x)+' '+(decision==='Approve'?'accepted at Finance review':'rejected at Finance review; the amount is unallocated again')+' by '+caN(A.who)+': '+remarks+'.',A);
  ccNotify(ccUniq([c.by,r.by]).filter(function(u){return u!==A.who;}),expKey(x)+': credit link '+c.key+' '+(decision==='Approve'?'accepted':'rejected')+' at Finance review.',x,'crreview-'+r.n+'-'+c.txnId+'-'+decision);
  ccCsxRefresh(x,A);return '';
}
/* B8-N22-11: the cardholder's transaction-level supporting information also while the transaction still needs an expense
   claim (the frozen Build 4 draft validation is unchanged: a draft needs its receipt). */
function ccTxnInfoOpen(t){
  if(!t||t.demo)return false;
  if([CCT_REJECTED,CCT_UNDER].indexOf((t.verify||{}).status)>=0)return true;
  const s=typeof ccTxnClaimDue==='function'?ccTxnClaimDue(t):null;return !!s&&['Unclaimed','Due','Due Soon','Overdue','Late Data'].indexOf(s.state)>=0;
}


/* ══ Build 8F · Statement reconciliation (FR-CT-18, 19; relevant FR-CT-05/06, 10/13, 15/16, 24, 25; Addendum G9;
   product decisions of 8 Nov 2026, "FR-CT Build 8E Acceptance and 8F Direction") ════════════════════════════════
   An independently verified statement (8B) enters reconciliation; verification itself never reconciles. The
   reconciliation compares the statement with ADT's own records and lists every difference as an exception with
   its own ID; expense accountability (unclaimed transactions, claims awaiting transaction evidence, control
   exceptions, dispute credits) is shown separately and never blocks or is settled by reconciliation; nothing is
   created automatically. Every resolution is traceable (actor, actual actor, time, reason, adjustment reference);
   nothing is overwritten. Financial differences need an approval route or an independent verification. The
   preparer never signs off: someone else with card.reconciliation.signoff (given through the Funding Verifiers
   team once a Super Admin configures it, G9) signs off, also not through Switch User; without one the
   reconciliation stays pending with an assignment exception. A closed reconciliation is never rewritten: late
   provider information becomes a supplementary correction, independently verified. No funding debit, card load,
   claim, reimbursement, refund or budget entry is created here; demo statements reconcile demo activity only. */
const RC_ST=['Not Started','Under Reconciliation','Exceptions Pending','Ready for Sign-Off','Closed – Reconciled','Closed with Authorized Exceptions'];
const RC_CLOSED=['Closed – Reconciled','Closed with Authorized Exceptions'];
const RC_T={so:'Statement-Only Transaction',ao:'ADT-Only Transaction',amt:'Amount Mismatch',fx:'Currency/FX Mismatch',data:'Date/Status Mismatch',dup:'Duplicate Statement Row',
  pend:'Pending Authorization',src:'Missing/Invalid Source Evidence',ref:'Refund/Reversal Mismatch'};
const RC_ACC={unclaimed:'Unclaimed Transaction',awaitTxn:'Claim Awaiting Transaction Evidence',control:'Control Exception',dispute:'Dispute Credit'};
const RCX_BLOCK=['Open','Evidence Requested','Awaiting Approval','Awaiting Verification'];
const RCX_CARRY='Carry Forward Proposed',RCX_CARRIED='Carried Forward (Authorized)';
let ccRecAdjNext=1001;
function ccRecScopeCards(s){return ccCards.filter(function(c){return c.entity===s.entity&&(s.scope==='Card'?c.id===s.cardId:c.programmeId===s.programmeId);}).map(function(c){return c.id;});}
function ccRecInPeriod(s,t){const d=t.status==='Posted'?(t.postDate||t.date):t.date;return !!d&&d>=s.periodFrom&&d<=s.periodTo;}
function ccRecNum(v){v=String(v==null?'':v).replace(/,/g,'').trim();return v&&isFinite(Number(v))?ccM(Number(v)):0;}
/* The statement side of a row, in the billing currency; credits negative. */
function ccRecRowSide(s,row){
  const P=row.parsed,d=row.data||{};
  if(P)return {amount:ccM((P.lf.credit?-1:1)*P.billAmount),currency:P.billCurrency,orig:P.amount,origCur:P.currency,credit:!!P.lf.credit,date:P.date,merchant:P.merchant,ref:P.ref,last4:String(d.last4||'')};
  const ty=ccPickCI(CCS_TYPES,d.type),cr=ty==='Refund'||ty==='Reversal',amt=ccRecNum(d.billAmount)||ccRecNum(d.amount);
  return {amount:ccM((cr?-1:1)*amt),currency:d.billCurrency||d.currency||s.currency,orig:ccRecNum(d.amount),origCur:d.currency||'',credit:cr,date:d.date||'',merchant:d.merchant||'',ref:d.ref||'',last4:String(d.last4||'')};
}
function ccRecTxnAmt(t){return ccM((t.direction==='Credit'?-1:1)*t.billAmount);}
/* What the records show now: exceptions, matched rows and expense accountability. */
function ccRecDerive(s){
  const items=[],acc=[],matched=[],key=expKey(s),seen={},cards=ccRecScopeCards(s),demo=!!s.demo,R=s.recon||{};
  const I=function(o,b){items.push(Object.assign({},b,o));};   /* the exception's own fields win over the row's */
  const recording={};Object.keys(R.items||{}).forEach(function(k){const it=R.items[k];if(it.recordTxnId)recording[it.recordTxnId]=1;});
  s.rows.forEach(function(row){
    const res=row.result||{},side=ccRecRowSide(s,row),base={rowN:row.n,stmtAmt:side.amount,currency:side.currency,ref:side.ref,merchant:side.merchant,date:side.date,last4:side.last4};
    if(res.status==='Excluded'){I({k:'row:'+row.n+':so',type:RC_T.so,adtAmt:0,financial:true,text:'On the statement, not in ADT: the row was excluded at import'+(row.excluded&&row.excluded.reason?' ('+row.excluded.reason+')':'')+'.'},base);return;}
    if(res.status==='Duplicate'){I({k:'row:'+row.n+':dup',type:RC_T.dup,adtAmt:0,stmtAmt:0,dupAmt:side.amount,txnId:res.txnId||null,financial:false,text:(res.text||row.dupText||'Same reference as another row or transaction')+' Not counted twice.'},base);return;}
    const t=res.txnId?ccTxn(res.txnId):null;if(!t)return;seen[t.id]=1;base.txnId=t.id;base.ref=t.extRef||side.ref;base.merchant=t.merchant;base.date=t.date;base.currency=t.billCurrency;
    const life=row.parsed?row.parsed.lf.life:t.status;let ex=false;
    if((row.match&&row.match.rejected)||(t.verify||{}).status===CCT_REJECTED){I({k:'row:'+row.n+':src',type:RC_T.src,adtAmt:0,financial:true,verification:'Rejected',text:'Linked to '+expKey(t)+', whose verification was rejected: it is not a valid ADT record until it is corrected and verified.'},base);return;}
    if(!t.demo&&(t.verify||{}).status===CCT_UNDER){I({k:'row:'+row.n+':src',type:RC_T.src,adtAmt:ccRecTxnAmt(t),stmtAmt:side.amount,financial:false,verification:'Under Review',text:expKey(t)+' is still Under Review: the statement did not complete its verification (an independent verifier, or a field difference). Request the evidence or verify it.'},base);return;}
    if(life==='Pending Authorization'||t.status==='Pending Authorization'){I({k:'row:'+row.n+':pend',type:RC_T.pend,adtAmt:0,stmtAmt:0,pendAmt:ccRecTxnAmt(t),financial:false,text:'Pending authorization: it is not reconciled as posted. It reconciles when a later statement shows it posted, declined or voided.'},base);return;}
    (t.discrepancies||[]).filter(function(d){return d.key===key&&d.row===row.n&&d.status==='Open';}).forEach(function(d){
      const am=d.diffs.filter(function(x){return x.field==='Amount'||x.field==='Billing Amount';}),oth=d.diffs.filter(function(x){return ['Amount','Billing Amount','Reference'].indexOf(x.field)<0;});
      const txt=function(L){return L.map(function(x){return x.field+': '+x.adt+' in ADT, '+x.stmt+' on the statement';}).join('; ')+'.';};
      if(am.length){const fx=am.some(function(x){return x.field==='Billing Amount';})||(row.parsed&&row.parsed.currency!==t.currency);
        I({k:'row:'+row.n+':'+(fx?'fx':'amt'),type:fx?RC_T.fx:RC_T.amt,adtAmt:ccRecTxnAmt(t),financial:true,text:txt(am)+(fx?' Provider and ADT exchange rates are kept apart; nothing is converted 1:1.':'')},base);ex=true;}
      if(oth.length){I({k:'row:'+row.n+':data',type:RC_T.data,adtAmt:ccRecTxnAmt(t),stmtAmt:ccRecTxnAmt(t),financial:false,text:txt(oth)},base);ex=true;}
    });
    if(t.direction==='Credit'&&t.refundOf&&!t.refundOf.id){I({k:'row:'+row.n+':ref',type:RC_T.ref,adtAmt:ccRecTxnAmt(t),financial:true,text:t.type+' '+expKey(t)+' has no identified original purchase'+(t.refundOf.ref?' (Original Reference '+t.refundOf.ref+')':'')+': link it to its original so refund processing applies once.'},base);ex=true;}
    if(!ex)matched.push({rowN:row.n,txnId:t.id,amount:ccRecTxnAmt(t),currency:t.billCurrency});
  });
  ccTxns.forEach(function(t){
    if(t.entity!==s.entity||cards.indexOf(t.cardId)<0||!!t.demo!==demo||seen[t.id]||recording[t.id])return;
    if(['Declined','Voided'].indexOf(t.status)>=0||(t.verify||{}).status===CCT_REJECTED||(t.stmtLinks||[]).length||!ccRecInPeriod(s,t))return;
    const base={txnId:t.id,ref:t.extRef,merchant:t.merchant,date:t.date,currency:t.billCurrency,stmtAmt:0};
    if(t.status==='Pending Authorization'){I({k:'txn:'+t.id+':pend',type:RC_T.pend,adtAmt:0,pendAmt:ccRecTxnAmt(t),financial:false,text:'Pending authorization in ADT, not on this statement: not reconciled as posted.'},base);return;}
    if(!t.demo&&(t.verify||{}).status===CCT_UNDER){I({k:'txn:'+t.id+':src',type:RC_T.src,adtAmt:ccRecTxnAmt(t),financial:true,verification:'Under Review',text:'Recorded in ADT, not verified and not on this statement: its source evidence is missing.'},base);return;}
    const man=!t.demo&&(t.verify||{}).source===CC_SRC_MANUAL;
    I({k:'txn:'+t.id+':ao',type:RC_T.ao,adtAmt:ccRecTxnAmt(t),financial:true,verification:t.demo?CC_DEMO:man?'Manually Verified – awaiting statement confirmation':ccTxnVerifyLabel(t),
      text:man?'Manually verified in ADT, not on this statement: awaiting statement confirmation.':'In ADT, not on this statement.'},base);
  });
  /* Expense accountability: separate, never settled or blocked by reconciliation (8F direction). */
  Object.keys(seen).forEach(function(id){
    const t=ccTxn(id);if(!t||t.status!=='Posted')return;
    if(t.direction!=='Credit'){
      const d=ccTxnClaimDue(t);if(d&&['Unclaimed','Due','Due Soon','Overdue','Late Data'].indexOf(d.state)>=0)acc.push({k:'acc:'+t.id+':unclaimed',type:RC_ACC.unclaimed,txnId:t.id,amount:ccRecTxnAmt(t),currency:t.billCurrency,state:d.state,text:d.text});
      const ce=typeof ccTxnControlEval==='function'?ccTxnControlEval(t):null;if(ce&&(ce.breaches||[]).length)acc.push({k:'acc:'+t.id+':control',type:RC_ACC.control,txnId:t.id,amount:ccRecTxnAmt(t),currency:t.billCurrency,state:'Control Exception',text:ce.breaches.join(' ')});
    }else{
      const o=t.refundOf&&t.refundOf.id?ccTxn(t.refundOf.id):null;if(!o)return;
      ccSpendExcs.forEach(function(x){const l=ccCsxLine(x).l;if(!l||Number(l.txnId)!==o.id||!ccCsxActive(x))return;
        (x.resolutions||[]).forEach(function(r){if(r.type==='Dispute Credit'&&['Dispute Pending','Verification Pending'].indexOf(r.status)>=0&&!(r.credits||[]).some(function(c){return c.txnId===t.id&&c.status!=='Rejected';}))
          acc.push({k:'acc:'+t.id+':dispute:'+x.id+':'+r.n,type:RC_ACC.dispute,txnId:t.id,csxId:x.id,resN:r.n,amount:ccRecTxnAmt(t),currency:t.billCurrency,state:r.status,text:'Credit '+expKey(t)+' may be the dispute credit awaited by '+expKey(x)+(r.ref?' (case '+r.ref+')':'')+': link it to the dispute.'});});});
    }
  });
  if(!demo)ccClaimsOf(s.entity).forEach(function(r){
    if(CCM_SUBMITTED.indexOf(r.status)<0)return;
    ccCardLines(r).forEach(function(l){const d=l.start||'';if(cards.indexOf(Number(l.cardId))<0||ccMatchOfLine(r.id,l.id)||d<s.periodFrom||d>s.periodTo)return;
      acc.push({k:'acc:line:'+r.id+':'+l.id,type:RC_ACC.awaitTxn,claimId:r.id,lineId:l.id,amount:ccLineCardAmt(l),currency:r.currency,state:'Awaiting Transaction Evidence',text:'Card-paid line "'+l.title+'" of '+expKey(r)+' ('+r.status+') has no matched transaction: Awaiting Transaction Evidence. Approval never waits for it.'});});
  });
  return {items:items,acc:acc,matched:matched};
}
function ccRecItems(s){return s&&s.recon?Object.keys(s.recon.items).map(function(k){return s.recon.items[k];}).sort(function(a,b){return a.n-b.n;}):[];}
function ccRecBlocking(s){return ccRecItems(s).filter(function(i){return RCX_BLOCK.indexOf(i.status)>=0;});}
function ccRecHist(it,A,to,note,o){it.history.push(Object.assign({at:ccStamp(A),by:A.who,actual:caVia(A),from:it.status,to:to,note:note||''},o||{}));it.status=to;}
function ccRecPrep(s,A){const R=s.recon;[A.who,caVia(A)].filter(function(u){return u&&u!=='System';}).forEach(function(u){if(R.preparers.indexOf(u)<0)R.preparers.push(u);});}
/* Why an exception disappeared from the records (auto-resolution keeps the reason). */
function ccRecGoneWhy(s,it){
  const t=it.txnId?ccTxn(it.txnId):null;if(!t)return 'The underlying records changed.';
  const L=(t.stmtLinks||[]).slice(-1)[0];
  if(L)return L.stmtId===s.id?'Linked to row '+L.row+' of this statement'+(L.via?' ('+L.via+')':'')+'.':'Confirmed by statement '+L.key+' row '+L.row+'.';
  if(it.type===RC_T.src&&(t.verify||{}).status===CCT_VERIFIED)return expKey(t)+' was verified by '+caN(t.verify.by)+'.';
  if(it.type===RC_T.pend&&t.status!=='Pending Authorization')return expKey(t)+' is now '+t.status+'.';
  if(it.type===RC_T.ref&&t.refundOf&&t.refundOf.id)return 'Original '+t.refundOf.key+' linked.';
  return 'The underlying records changed ('+expKey(t)+' is '+t.status+', '+ccTxnVerifyLabel(t)+').';
}
/* Merge what the records show with what people decided; IDs stay stable. A closed reconciliation is never re-derived. */
function ccRecSync(s,A){
  const R=s&&s.recon;if(!R||RC_CLOSED.indexOf(R.status)>=0)return R;
  A=A||caAt('System',wbToday(),stampNow().time);const d=ccRecDerive(s),now={};
  d.items.forEach(function(x){
    now[x.k]=1;let it=R.items[x.k];
    if(!it){it=R.items[x.k]={key:x.k,n:R.nextN,id:'RCX-'+s.key+'-'+R.nextN,status:'Open',history:[],detectedAt:ccStamp(A)};R.nextN++;it.history.push({at:ccStamp(A),by:'System',to:'Open',note:'Detected: '+x.text});}
    else if(it.status==='Resolved'&&it.resolution&&it.resolution.auto){ccRecHist(it,caAt('System',wbToday(),stampNow().time),'Open','Detected again: '+x.text);it.resolution=null;}
    Object.assign(it,{type:x.type,rowN:x.rowN||null,txnId:x.txnId||null,stmtAmt:x.stmtAmt,adtAmt:x.adtAmt,variance:ccM(x.stmtAmt-x.adtAmt),pendAmt:x.pendAmt||0,dupAmt:x.dupAmt||0,currency:x.currency||s.currency,
      ref:x.ref||'',merchant:x.merchant||'',date:x.date||'',last4:x.last4||'',text:x.text,financial:!!x.financial,verification:x.verification||'',live:true});
  });
  ccRecItems(s).forEach(function(it){
    if(it.recordTxnId&&it.status==='Awaiting Verification'){
      const t=ccTxn(it.recordTxnId);
      if(t&&(t.verify||{}).status===CCT_VERIFIED){
        t.stmtLinks=(t.stmtLinks||[]).concat([{stmtId:s.id,key:expKey(s),row:it.rowN,at:ccStamp(A),via:it.id}]);
        ccLog(t,t.status,'Linked to statement '+expKey(s)+' row '+it.rowN+' by reconciliation exception '+it.id+' after its independent verification by '+caN(t.verify.by)+'.',A);
        it.resolution={action:'Missing transaction recorded and independently verified',ref:expKey(t),by:'System',actual:'',event:'Verification of '+expKey(t)+' by '+caN(t.verify.by),at:ccStamp(A),reason:'Recorded by '+caN(t.recordedBy)+', verified by '+caN(t.verify.by)+'; linked to row '+it.rowN+' from the records.'};
        ccRecHist(it,A,'Resolved',it.resolution.reason,{by:'System'});
      }else if(t&&(t.verify||{}).status===CCT_REJECTED){ccRecHist(it,A,'Open','The recorded transaction '+expKey(t)+' was rejected at verification: '+(t.verify.reason||''),{by:'System'});it.recordTxnId=null;}
    }
    if(now[it.key])return;it.live=false;
    if(['Open','Evidence Requested'].indexOf(it.status)>=0){it.resolution={action:'Records changed',auto:true,reason:ccRecGoneWhy(s,it),by:'System',at:ccStamp(A)};ccRecHist(it,A,'Resolved',it.resolution.reason,{by:'System'});}
  });
  R.acc=d.acc;R.matched=d.matched;
  if(['Under Reconciliation','Exceptions Pending'].indexOf(R.status)>=0){const to=ccRecBlocking(s).length?'Exceptions Pending':'Under Reconciliation';if(R.status!==to){R.history.push({at:ccStamp(A),by:A.who,from:R.status,to:to});R.status=to;s.reconStatus=to;}}
  return R;
}
function ccRecSyncAll(ent){ccStmts.forEach(function(s){if(s.recon&&s.entity===(ent||ccEnt()))ccRecSync(s);});if(typeof ccRecAdjRefresh==='function')ccRecAdjRefresh();}
/* The figures the existing view shows (8F direction section 9). */
function ccRecSummary(s){
  const R=s.recon;
  if(R&&R.closed)return R.closed.summary;
  const items=ccRecItems(s),rowsTx=s.rows.length,matched=R?R.matched.length:0;
  const open=items.filter(function(i){return RCX_BLOCK.indexOf(i.status)>=0;}).length,carry=items.filter(function(i){return [RCX_CARRY,RCX_CARRIED,RCX_FINPEND].indexOf(i.status)>=0;}).length;
  const unexplained=ccM(items.filter(function(i){return RCX_BLOCK.indexOf(i.status)>=0||[RCX_CARRY,RCX_CARRIED,RCX_FINPEND].indexOf(i.status)>=0;}).reduce(function(a,i){return a+i.variance;},0));
  return {total:rowsTx,matched:matched,unmatched:Math.max(0,rowsTx-matched),open:open,carried:carry,variance:unexplained,gross:ccM(items.reduce(function(a,i){return a+Math.abs(i.variance);},0)),
    adtOnly:items.filter(function(i){return i.type===RC_T.ao&&RCX_BLOCK.indexOf(i.status)>=0;}).length,acc:R?R.acc.length:0,currency:s.currency};
}
function ccRecListFigures(list){
  const o={ready:0,closed:0,closedEx:0,under:0};
  list.forEach(function(s){const st=s.recon?s.recon.status:'Not Started';if(st==='Ready for Sign-Off')o.ready++;else if(st==='Closed – Reconciled')o.closed++;else if(st==='Closed with Authorized Exceptions')o.closedEx++;else if(s.recon)o.under++;});
  return o;
}

/* ── Start (FR-CT-18.01): Finance with card.transaction.match, on a verified statement ── */
function ccRecStart(id,A){
  A=A||ccNow();const s=ccStmtGet(id);if(!s)return 'No such statement.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot reconcile card statements (card.transaction.match).';
  if(s.importStatus!=='Verified')return expKey(s)+' is '+s.importStatus+': only an independently verified statement enters reconciliation (verification itself does not reconcile).';
  if(s.recon)return expKey(s)+' is already '+s.recon.status+'.';
  if(s.demo&&!ccDemoOn(s.entity))return 'Presentation mode is off: an illustrative statement is not reconciled.';
  const ho=ccStmtHolders(s),via=caVia(A);if(ho.indexOf(A.who)>=0||(via&&ho.indexOf(via)>=0))return 'A cardholder on this statement never reconciles it.';
  s.recon={status:'Under Reconciliation',items:{},nextN:1,preparers:[],acc:[],matched:[],history:[{at:ccStamp(A),by:A.who,actual:via,to:'Under Reconciliation'}],returns:[],supplements:[],
    startedBy:A.who,startedActual:via,startedAt:ccStamp(A),demo:!!s.demo};
  ccRecPrep(s,A);ccRecSync(s,A);s.reconStatus=s.recon.status;
  const m=ccRecSummary(s);
  ccLog(s,s.importStatus,'Reconciliation started by '+caN(A.who)+': '+m.total+' statement row(s), '+m.matched+' matched, '+m.open+' open exception(s), unexplained variance '+expMoney(m.variance,s.currency)+'; '+m.acc+' expense accountability item(s) listed apart. '
    +'Matching expense claims is separate: an unclaimed transaction keeps its own exception. Nothing is posted or created.'+(s.demo?' '+CC_DEMO+' activity only.':''),A);
  return '';
}
function ccRecMay(A,s,it,o){
  o=o||{};
  if(!s||!s.recon)return 'Start the reconciliation first.';
  if(RC_CLOSED.indexOf(s.recon.status)>=0)return expKey(s)+' is '+s.recon.status+': a closed reconciliation is never changed. Record a supplementary correction instead.';
  if(s.recon.status==='Ready for Sign-Off')return expKey(s)+' awaits sign-off: it is returned before an exception changes.';
  if(!ccPCan(A,o.right||'card.transaction.match'))return caN(A.who)+' cannot work card reconciliation exceptions ('+(o.right||'card.transaction.match')+').';
  const via=caVia(A),t=it&&it.txnId?ccTxn(it.txnId):null,hu=t?idUserOfEmp(t.employeeEid):'';
  if(hu&&(A.who===hu||via===hu))return 'A cardholder never reconciles their own card activity.';
  if(it&&o.open!==false&&['Open','Evidence Requested'].indexOf(it.status)<0)return it.id+' is '+it.status+'.';
  return '';
}
function ccRecGet(id,key){const s=ccStmtGet(id);if(s&&s.recon)ccRecSync(s);return {s:s,it:s&&s.recon?s.recon.items[key]||null:null};}
function ccRecDone(s,it,A,to,res,note){
  it.resolution=res?Object.assign({by:A.who,actual:caVia(A),at:ccStamp(A)},res):it.resolution;ccRecHist(it,A,to,note||(res&&res.reason)||'');ccRecPrep(s,A);
  ccLog(s,s.importStatus,it.id+' ('+it.type+') '+to.toLowerCase()+' by '+caN(A.who)+': '+(note||(res&&((res.action?res.action+'. ':'')+(res.reason||'')))||'')+(res&&res.ref?' Reference '+res.ref+'.':''),A);
  ccRecSync(s,A);
}
/* Non-financial resolution by Finance (dates/status, duplicates, pending, evidence), with a reason. */
function ccRecResolve(id,key,d,A){
  A=A||ccNow();d=d||{};const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  const reason=String(d.reason||'').trim();if(reason.length<10)return 'Give the reason for the resolution (at least 10 characters); it is kept with the exception.';
  if(it.financial&&Math.abs(it.variance)>0.009)return it.id+' is a financial difference of '+expMoney(it.variance,it.currency)+': route a financial adjustment for approval, link or record the transaction, or carry it forward with a reason.';
  if(it.type===RC_T.src&&it.verification==='Under Review'&&!d.confirm)return it.id+': the transaction is still Under Review. Request the evidence or have it verified independently; it resolves itself once verified.';
  const act=it.type===RC_T.dup?'Duplicate confirmed':it.type===RC_T.pend?'Pending authorization reviewed':'Resolved by Finance';
  ccRecDone(s,it,A,'Resolved',{action:act,reason:reason});return '';
}
function ccRecCarry(id,key,reason,A){
  A=A||ccNow();const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  reason=String(reason||'').trim();if(reason.length<10)return 'Say why it is carried forward (at least 10 characters). The checker authorizes it at sign-off.';
  ccRecDone(s,it,A,RCX_CARRY,{action:'Carry forward proposed',reason:reason});return '';
}
function ccRecRequestEvidence(id,key,note,A){
  A=A||ccNow();const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  note=String(note||'').trim();if(note.length<10)return 'Say what evidence is needed (at least 10 characters).';
  const t=it.txnId?ccTxn(it.txnId):null;it.requested={note:note,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccRecDone(s,it,A,'Evidence Requested',null,'Evidence requested: '+note);
  if(t)ccNotify(ccUniq([t.recordedBy,idUserOfEmp(t.employeeEid)]).filter(function(u){return u&&u!==A.who;}),expKey(s)+' reconciliation ('+it.id+'): evidence requested for '+expKey(t)+': '+note,t,'rc-ev-'+it.id);
  return '';
}
/* Statement-only row: link it to an ADT transaction of the same card, direction, amount and currency, on no statement yet. */
function ccRecLinkCands(s,it){
  const cards=ccRecScopeCards(s),row=s.rows.find(function(r){return r.n===it.rowN;}),side=row?ccRecRowSide(s,row):null;
  return ccTxns.filter(function(t){return t.entity===s.entity&&cards.indexOf(t.cardId)>=0&&!!t.demo===!!s.demo&&!(t.stmtLinks||[]).length&&(t.verify||{}).status!==CCT_REJECTED&&['Declined','Voided'].indexOf(t.status)<0
    &&(!it.mapped||t.cardId===it.mapped.cardId)&&(!side||!side.last4||((ccCard(t.cardId)||{}).last4===side.last4));});
}
function ccRecLinkTxn(id,key,txnId,reason,A){
  A=A||ccNow();const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  if(it.type!==RC_T.so)return 'Link a transaction to a statement-only row.';
  const t=ccTxn(txnId);if(!t||ccRecLinkCands(s,it).indexOf(t)<0)return 'Pick an ADT transaction of this statement\'s card that is on no statement yet.';
  const h=idUserOfEmp(t.employeeEid),via=caVia(A);if(A.who===h||via===h)return 'A cardholder never reconciles their own card activity.';
  if(Math.abs(ccRecTxnAmt(t)-it.stmtAmt)>0.009)return expKey(t)+' is '+expMoney(ccRecTxnAmt(t),t.billCurrency)+'; the row is '+expMoney(it.stmtAmt,it.currency)+'. Different amounts are not linked silently: route the difference as a financial adjustment instead.';
  reason=String(reason||'').trim();if(reason.length<10)return 'Say why this row is that transaction (at least 10 characters).';
  t.stmtLinks=(t.stmtLinks||[]).concat([{stmtId:s.id,key:expKey(s),row:it.rowN,at:ccStamp(A),via:it.id,by:A.who}]);
  ccLog(t,t.status,'Linked to statement '+expKey(s)+' row '+it.rowN+' by '+caN(A.who)+' (reconciliation exception '+it.id+'): '+reason+'. The statement row was excluded at import and stays as imported; nothing was overwritten.',A);
  ccRecDone(s,it,A,'Resolved',{action:'Linked to '+expKey(t),ref:expKey(t),reason:reason});return '';
}
/* Card mapping for a statement-only row (Addendum G2): an authorized choice, with a reason; never the last four alone. */
function ccRecMapCard(id,key,cardId,reason,A){
  A=A||ccNow();const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  if(it.type!==RC_T.so)return 'Card mapping applies to a statement-only row.';
  const c=ccCard(cardId),cards=ccRecScopeCards(s);if(!c||cards.indexOf(c.id)<0)return 'Pick a card of this statement\'s programme.';
  if(it.last4&&c.last4!==it.last4)return 'The statement shows last four '+it.last4+'; '+ccCardLabel(c)+' ends in '+c.last4+'.';
  const h=idUserOfEmp(c.employeeEid),via=caVia(A);if(A.who===h||via===h)return 'A cardholder never maps a statement row to their own card.';
  reason=String(reason||'').trim();if(reason.length<10)return 'Say how the card was identified (at least 10 characters); the last four digits alone are never enough.';
  it.mapped={cardId:c.id,key:expKey(c),by:A.who,actual:via,at:ccStamp(A),reason:reason};
  it.history.push({at:ccStamp(A),by:A.who,actual:via,from:it.status,to:it.status,note:'Card mapped to '+expKey(c)+' ('+ccHolderName(c)+'): '+reason});ccRecPrep(s,A);
  ccLog(s,s.importStatus,it.id+': card mapped to '+expKey(c)+' by '+caN(A.who)+': '+reason+'. The row still needs its transaction.',A);
  return '';
}
/* A transaction missing from ADT: recorded from the statement row as an 8A record (card.transaction.record), verified by someone independent
   (card.transaction.verify); once verified it is linked to the row. */
function ccRecRecordMissing(id,key,d,A){
  A=A||ccNow();d=d||{};const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it,{right:'card.transaction.record'});if(may)return may;
  if(it.type!==RC_T.so)return 'Record a missing transaction for a statement-only row.';
  const row=s.rows.find(function(r){return r.n===it.rowN;}),dd=row?row.data:{},cands=ccRecScopeCards(s).map(ccCard).filter(function(c){return c&&(!it.last4||c.last4===it.last4);});
  const card=it.mapped?ccCard(it.mapped.cardId):cands.length===1&&(!dd.empId||(idEmp(cands[0].employeeEid)||{}).empId===dd.empId)?cands[0]:null;
  if(!card)return 'The card of row '+it.rowN+' is not identified exactly: resolve the card mapping first.';
  const reason=String(d.reason||'').trim();if(reason.length<10)return 'Say why the transaction is missing from ADT (at least 10 characters).';
  const life=ccStmtLife(dd);if(life.credit)return 'Row '+it.rowN+' is a '+life.type.toLowerCase()+': record it from its original transaction (Record Refund / Reversal) so it is linked to the purchase.';
  const post=life.life!=='Pending Authorization',r=ccTxnRecord({cardId:card.id,wallet:dd.wallet||'CORP',type:post?'Purchase':'Authorization',date:dd.date,time:dd.time||'',tz:dd.tz||'',postDate:post?dd.postDate||dd.date:'',merchant:dd.merchant,mcc:dd.mcc||'',country:dd.country||'',channel:dd.channel||'',
    amount:dd.amount,currency:dd.currency,billAmount:dd.billAmount||'',rate:dd.rate||'',extRef:dd.ref,authCode:dd.authCode||'',reason:'Missing from ADT; on statement '+expKey(s)+' row '+it.rowN+' ('+it.id+'): '+reason,
    evidence:'Statement '+expKey(s)+' · '+s.fileName+' · row '+it.rowN+(d.evidence?' · '+d.evidence:'')},A);
  if(r.error)return r.error;
  r.rec.recFor={stmtId:s.id,item:it.key,id:it.id};it.recordTxnId=r.rec.id;
  ccRecDone(s,it,A,'Awaiting Verification',null,'Missing transaction recorded as '+expKey(r.rec)+' ('+reason+'); it is linked to the row only after someone independent verifies it.');
  return '';
}
/* A statement refund or reversal whose original was not identified: link it to the original purchase of the same card; 8E refund processing then applies once. */
function ccRecOrigCands(s,it){const c=it.txnId?ccTxn(it.txnId):null;if(!c)return [];return ccTxns.filter(function(o){return o.entity===c.entity&&o.cardId===c.cardId&&o.direction!=='Credit'&&o.status==='Posted'&&!!o.demo===!!c.demo&&(o.verify||{}).status!==CCT_REJECTED&&ccTxnRefundable(o)>=c.billAmount-1e-9&&o.date<=c.date;});}
function ccRecLinkOriginal(id,key,origId,reason,A){
  A=A||ccNow();const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  if(it.type!==RC_T.ref)return 'Link an original to a refund or reversal without one.';
  const c=ccTxn(it.txnId),o=ccTxn(origId);if(!c||!o||ccRecOrigCands(s,it).indexOf(o)<0)return 'Pick the original purchase on the same card, with at least '+expMoney(c?c.billAmount:0,c?c.billCurrency:'')+' not yet refunded.';
  if(c.alloc&&['Under Review – Original Not Identified'].indexOf(c.alloc.status)<0&&c.refund&&c.refund.applied)return expKey(c)+' was already processed ('+c.alloc.status+'): it is never processed twice.';
  reason=String(reason||'').trim();if(reason.length<10)return 'Say how the original was identified (at least 10 characters).';
  const was=Object.assign({},c.refundOf);c.refundOf={id:o.id,key:expKey(o),ref:o.extRef||'',linkedBy:A.who,linkedActual:caVia(A),linkedAt:ccStamp(A),via:it.id,former:was};
  c.refund=Object.assign(c.refund||{},{applied:false,dest:(c.refund&&c.refund.dest)||'Card Wallet'});
  ccLog(c,c.status,'Original identified by '+caN(A.who)+' in reconciliation '+it.id+': '+expKey(o)+' ('+reason+'). Refund processing applies once from here; the earlier "original not identified" record is kept.',A);
  ccCreditApply(c,A);
  ccRecDone(s,it,A,'Resolved',{action:'Original '+expKey(o)+' linked',ref:expKey(o),reason:reason});return '';
}
/* A dispute credit on the statement linked to the dispute it settles (8D CSX dispute resolution). */
function ccRecLinkDispute(id,accKey,A){
  A=A||ccNow();const s=ccStmtGet(id);if(!s||!s.recon)return 'Start the reconciliation first.';ccRecSync(s);
  const a=(s.recon.acc||[]).find(function(x){return x.k===accKey&&x.type===RC_ACC.dispute;});if(!a)return 'No dispute credit to link here.';
  const e=ccCsxLinkCredit(a.csxId,a.resN,a.txnId,null,A,{reason:'Dispute credit on statement '+expKey(s)});if(e)return e;
  ccRecPrep(s,A);ccLog(s,s.importStatus,'Dispute credit '+expKey(ccTxn(a.txnId))+' linked to '+expKey(ccCsx(a.csxId))+' by '+caN(A.who)+' (expense accountability; the reconciliation itself is unchanged).',A);
  ccRecSync(s,A);return '';
}
/* Financial differences go to an approval route (8F direction): approved by someone else with card.reconciliation.signoff;
   it records the accepted difference with its reference and posts nothing. */
function ccRecAdjApprovers(s,adj){const h=ccStmtHolders(s);return ccPeopleWith('card.reconciliation.signoff',s.entity).filter(function(u){return u!==adj.by&&u!==adj.actual&&h.indexOf(u)<0&&(typeof caActive!=='function'||caActive(u));});}
/* Reconciliation adjustments (final decision 8 Nov 2026): reconciliation never posts. An RCA records one financial difference and its
   type. "No Financial Impact" only records the variance once approved. A financial RCA is approved by someone independent and is
   then completed only by linking the entry an existing authorized workflow produced: a funding entry (return to a funding
   source, authorized write-off), an 8E refund budget correction, or a CSX company acceptance. One underlying event, one RCA; one
   financial entry, one RCA. An RCA is never proof of a posting by itself. */
const RCA_TYPES=['No Financial Impact – Record Variance','Funding Source Return','Refund Budget Correction','CSX Company Acceptance','Authorized Write-off'];
const RCA_HINT={'No Financial Impact – Record Variance':'Records the difference; nothing is posted (for example a timing or provider-data difference).',
  'Funding Source Return':'Completed by linking the verified credit returned to a company funding source (its entry in Funding).',
  'Refund Budget Correction':'Completed by linking the verified refund credit whose budget correction was applied on the original allocation.',
  'CSX Company Acceptance':'Completed by linking the approved company acceptance of the card spend exception (Budget Approvers route).',
  'Authorized Write-off':'Completed by linking a funding Adjustment recorded and independently verified in Funding.'};
const RCA_OPEN=['Awaiting Approval','Approved – Processing Pending','Pending – Closed Period Adjustment'];
const RCX_FINPEND='Financial Adjustment Pending';
const ccRecAdjs=[];
function ccRecAdj(ref){return ccRecAdjs.find(function(a){return a.ref===ref;})||null;}
function ccRecAdjHist(a,A,to,note,o){a.history.push(Object.assign({at:ccStamp(A),by:A.who,actual:caVia(A),from:a.status,to:to,note:note||''},o||{}));a.status=to;}
function ccRecAdjSource(s,it){return it.txnId?'txn:'+it.txnId:'stmt:'+s.id+':row:'+it.rowN;}
function ccRecAdjust(id,key,d,A){
  A=A||ccNow();d=d||{};const g=ccRecGet(id,key),s=g.s,it=g.it,may=ccRecMay(A,s,it);if(may)return may;
  if(!it.financial||Math.abs(it.variance)<0.01)return it.id+' has no financial difference to adjust.';
  const type=RCA_TYPES.indexOf(d.type)>=0?d.type:'';if(!type)return 'Pick the adjustment type ('+RCA_TYPES.join(', ')+').';
  const reason=String(d.reason||'').trim(),ev=String(d.evidence||'').trim();
  if(reason.length<10)return 'Explain the financial difference and its treatment (at least 10 characters).';if(!ev)return 'Attach the evidence for the adjustment.';
  const src=ccRecAdjSource(s,it),dup=ccRecAdjs.find(function(a){return a.source===src&&['Rejected','Cancelled'].indexOf(a.status)<0;});
  if(dup)return dup.ref+' ('+dup.status+') already covers this event: the same financial difference is never adjusted twice.';
  const a={ref:'RCA-'+(ccRecAdjNext++),entity:s.entity,stmtId:s.id,stmtKey:expKey(s),itemKey:it.key,itemId:it.id,type:type,financial:type!==RCA_TYPES[0],amount:it.variance,currency:it.currency,
    reason:reason,evidence:ev,source:src,txnId:it.txnId||null,demo:!!s.demo,by:A.who,actual:caVia(A),at:ccStamp(A),status:'Awaiting Approval',history:[],link:null};
  ccRecAdjHist(a,A,'Awaiting Approval','Requested ('+type+'): '+reason);ccRecAdjs.unshift(a);it.adj=a;it.adjRef=a.ref;
  const ap=ccRecAdjApprovers(s,a);a.assignException=ap.length?'':'No eligible approver: give card.reconciliation.signoff (RBAC → Templates → Funding Verifier) to someone who did not raise it and holds no card on the statement. It stays pending.';
  ccRecDone(s,it,A,'Awaiting Approval',null,'Adjustment '+a.ref+' ('+type+', '+expMoney(a.amount,a.currency)+') routed for approval: '+reason+(a.assignException?' '+a.assignException:''));
  ccNotify(ap,expKey(s)+' reconciliation: adjustment '+a.ref+' ('+it.id+', '+type+', '+expMoney(a.amount,a.currency)+') awaits your approval.',s,'rc-adj-'+a.ref);
  return '';
}
function ccRecAdjustDecide(id,key,decision,remarks,A){
  A=A||ccNow();remarks=String(remarks||'').trim();const g=ccRecGet(id,key),s=g.s,it=g.it;
  if(!it||!it.adj||it.adj.status!=='Awaiting Approval'||it.status!=='Awaiting Approval')return 'No adjustment awaits approval here.';
  if(s.recon.status==='Ready for Sign-Off'||RC_CLOSED.indexOf(s.recon.status)>=0)return expKey(s)+' is '+s.recon.status+'.';
  if(!ccPCan(A,'card.reconciliation.signoff'))return caN(A.who)+' cannot approve reconciliation adjustments (card.reconciliation.signoff).';
  const via=caVia(A),adj=it.adj;
  if([adj.by,adj.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(adj.by)+' raised '+adj.ref+'; someone else approves it, also not through Switch User.';
  if(ccStmtHolders(s).some(function(u){return u===A.who||u===via;}))return 'A cardholder on this statement never approves its adjustments.';
  if(decision!=='Approve'&&decision!=='Reject')return 'Approve or Reject.';
  if(remarks.length<5)return 'Give the approval remarks.';
  adj.decidedBy=A.who;adj.decidedActual=via;adj.decidedAt=ccStamp(A);adj.remarks=remarks;adj.assignException='';
  if(decision==='Reject'){ccRecAdjHist(adj,A,'Rejected',remarks,{check:true});ccRecHist(it,A,'Open','Adjustment '+adj.ref+' rejected: '+remarks,{check:true});}
  else if(!adj.financial){ccRecAdjHist(adj,A,'Recorded – No Financial Impact',remarks,{check:true});
    it.resolution={action:'Variance recorded – no financial impact',ref:adj.ref,adjRef:adj.ref,by:A.who,actual:via,at:ccStamp(A),reason:adj.reason+' Approved: '+remarks};ccRecHist(it,A,'Resolved',it.resolution.reason,{check:true});}
  else{ccRecAdjHist(adj,A,'Approved – Processing Pending',remarks+'. To be completed through '+(RCA_HINT[adj.type]||'its existing workflow'),{check:true});
    it.resolution={action:'Financial adjustment approved – processing pending',ref:adj.ref,adjRef:adj.ref,by:A.who,actual:via,at:ccStamp(A),reason:adj.reason+' Approved: '+remarks};ccRecHist(it,A,RCX_FINPEND,it.resolution.reason,{check:true});}
  adj.status=adj.status;   // the RCA keeps its own status; the exception follows it
  ccLog(s,s.importStatus,'Adjustment '+adj.ref+' ('+adj.type+', '+it.id+', '+expMoney(adj.amount,adj.currency)+') '+(decision==='Approve'?'approved':'rejected')+' by '+caN(A.who)+': '+remarks+'. '
    +(decision==='Approve'&&adj.financial?'It is not posted by reconciliation: it is completed only when the entry produced by the existing workflow is linked.':'Nothing is posted.'),A);
  ccNotify(ccUniq([adj.by].concat(s.recon.preparers)).filter(function(u){return u!==A.who;}),expKey(s)+': adjustment '+adj.ref+' '+(decision==='Approve'?(adj.financial?'approved – processing pending':'approved (no financial impact)'):'rejected')+'.',s,'rc-adj-'+adj.ref+'-'+decision);
  ccRecSync(s,A);return '';
}

/* ── Sign-off (G9): preparer ≠ checker by actual actor; not a cardholder on the statement; never automatic ── */
function ccRecPreparers(s){
  const R=s.recon,u=(R.preparers||[]).slice();
  ccRecItems(s).forEach(function(it){(it.history||[]).forEach(function(h){if(h.check||!h.by||h.by==='System')return;u.push(h.by);if(h.actual)u.push(h.actual);});if(it.adj){u.push(it.adj.by,it.adj.actual);}if(it.mapped){u.push(it.mapped.by,it.mapped.actual);}
    if(it.recordTxnId){const t=ccTxn(it.recordTxnId);if(t)u.push(t.recordedBy,t.actual);}});
  (R.submits||[]).forEach(function(x){u.push(x.by,x.actual);});
  return ccUniq(u.filter(function(x){return x&&x!=='System';}));
}
function ccRecCheckers(s){const pre=ccRecPreparers(s),ho=ccStmtHolders(s);return ccPeopleWith('card.reconciliation.signoff',s.entity).filter(function(u){return pre.indexOf(u)<0&&ho.indexOf(u)<0&&(typeof caActive!=='function'||caActive(u));});}
function ccRecNoCheckerText(){return 'No eligible reconciliation checker. The sign-off permission (Card statements → "Sign off reconciliation", card.reconciliation.signoff) is not given automatically: a Super Admin or Entity Administrator adds it to the Funding Verifier template in RBAC → Templates, and the Funding Verifiers team in RBAC → Workspaces then carries it. The checker must not have prepared this reconciliation and must hold no card on the statement. It stays pending; nothing closes automatically.';}
function ccRecSubmit(id,note,A){
  A=A||ccNow();const s=ccStmtGet(id),R=s&&s.recon;if(!R)return 'Start the reconciliation first.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot submit card reconciliations (card.transaction.match).';
  if(['Under Reconciliation','Exceptions Pending'].indexOf(R.status)<0)return expKey(s)+' is '+R.status+'.';
  ccRecSync(s,A);const open=ccRecBlocking(s);
  if(open.length)return open.length+' exception'+(open.length===1?' is':'s are')+' still open ('+open.slice(0,3).map(function(i){return i.id+' '+i.type+' – '+i.status;}).join('; ')+(open.length>3?'; …':'')+'): resolve each, finish its approval or verification, or propose to carry it forward with a reason.';
  const carry=ccRecItems(s).filter(function(i){return i.status===RCX_CARRY||i.status===RCX_FINPEND;});
  const sub={by:A.who,actual:caVia(A),at:ccStamp(A),note:String(note||'').trim(),proposed:carry.length?'Closed with Authorized Exceptions':'Closed – Reconciled',carried:carry.map(function(i){return i.id;})};
  R.submits=(R.submits||[]).concat([sub]);R.submit=sub;ccRecPrep(s,A);
  const ck=ccRecCheckers(s);R.assignException=ck.length?'':ccRecNoCheckerText();
  R.history.push({at:ccStamp(A),by:A.who,actual:caVia(A),from:R.status,to:'Ready for Sign-Off'});R.status='Ready for Sign-Off';s.reconStatus=R.status;
  ccLog(s,s.importStatus,'Reconciliation submitted for sign-off by '+caN(A.who)+' (proposed: '+sub.proposed+(carry.length?', '+carry.length+' carried-forward exception(s) for the checker to authorize: '+sub.carried.join(', '):'')+').'+(R.assignException?' '+R.assignException:''),A);
  ccNotify(ck,expKey(s)+': card statement reconciliation awaits your independent sign-off ('+sub.proposed+').',s,'rc-signoff-'+R.submits.length);
  return '';
}
function ccRecWhyNotSignoff(s,A){
  if(!s||!s.recon)return 'No reconciliation.';
  if(s.recon.status!=='Ready for Sign-Off')return expKey(s)+' is '+s.recon.status+'.';
  if(!ccPCan(A,'card.reconciliation.signoff'))return caN(A.who)+' cannot sign off card reconciliations (card.reconciliation.signoff, given through the Funding Verifiers team).';
  const via=caVia(A),pre=ccRecPreparers(s),ho=ccStmtHolders(s);
  if(pre.indexOf(A.who)>=0||(via&&pre.indexOf(via)>=0)){const p=pre.indexOf(via)>=0?via:A.who;return 'Maker-checker: '+caN(p)+' prepared this reconciliation'+(via&&p===via?', acting now through Switch User as '+caN(A.who):'')+'; someone independent signs it off.';}
  if(ho.indexOf(A.who)>=0||(via&&ho.indexOf(via)>=0))return 'A cardholder on this statement never signs off its reconciliation.';
  if(typeof caActive==='function'&&!caActive(A.who))return caN(A.who)+' is not an active user.';
  return '';
}
/* d: {decision:'Sign Off'|'Return', notes}. Closing freezes the summary and the exceptions; carried items stay traceable. */
function ccRecSignoff(id,d,A){
  A=A||ccNow();d=d||{};const s=ccStmtGet(id),why=ccRecWhyNotSignoff(s,A);if(why)return why;
  const R=s.recon,notes=String(d.notes||'').trim(),via=caVia(A);
  if(d.decision==='Return'){
    if(notes.length<5)return 'Say what the preparer must review.';
    R.returns.push({by:A.who,actual:via,at:ccStamp(A),notes:notes});R.history.push({at:ccStamp(A),by:A.who,actual:via,from:R.status,to:'Under Reconciliation',note:'Returned: '+notes});
    R.status='Under Reconciliation';R.submit=null;R.assignException='';ccRecSync(s,A);s.reconStatus=R.status;
    ccLog(s,s.importStatus,'Reconciliation returned by '+caN(A.who)+': '+notes+'. Nothing was closed.',A);
    ccNotify(R.preparers.filter(function(u){return u!==A.who;}),expKey(s)+': the reconciliation was returned: '+notes,s,'rc-return-'+R.returns.length);
    return '';
  }
  if(d.decision!=='Sign Off')return 'Sign Off or Return.';
  /* Anything new since submission sends it back to the preparer (the records changed). */
  const before=ccRecItems(s).length;ccRecSync(s,A);
  const open=ccRecBlocking(s);
  if(open.length||ccRecItems(s).length!==before){const to=open.length?'Exceptions Pending':'Under Reconciliation';
    R.returns.push({by:'System',at:ccStamp(A),notes:'The records changed after submission'});R.history.push({at:ccStamp(A),by:'System',from:R.status,to:to});R.status=to;R.submit=null;s.reconStatus=to;
    ccLog(s,s.importStatus,'Sign-off stopped: '+(open.length?open.length+' exception(s) opened':'new exceptions were detected')+' after submission. Back with the preparer; nothing was closed.',A);
    return 'The records changed after submission ('+open.map(function(i){return i.id;}).join(', ')+'): '+expKey(s)+' is back with its preparer. Nothing was closed.';}
  const carry=ccRecItems(s).filter(function(i){return i.status===RCX_CARRY||i.status===RCX_FINPEND;});
  if(carry.length&&notes.length<10)return 'Authorizing '+carry.length+' carried-forward exception'+(carry.length===1?'':'s')+' ('+carry.map(function(i){return i.id;}).join(', ')+'): give the sign-off notes (at least 10 characters).';
  const to=carry.length?'Closed with Authorized Exceptions':'Closed – Reconciled';
  if(to==='Closed – Reconciled'&&Math.abs(ccRecSummary(s).variance)>0.009)return 'An unexplained variance remains: it cannot close as fully reconciled.';
  carry.forEach(function(i){i.authorized={by:A.who,actual:via,at:ccStamp(A),notes:notes};ccRecHist(i,A,i.status===RCX_FINPEND?RCX_FINPEND:RCX_CARRIED,'Authorized at sign-off: '+notes+(i.status===RCX_FINPEND?' (the approved financial adjustment stays outstanding until its entry is linked)':''),{check:true});});
  const m=ccRecSummary(s);
  R.signoff={decision:'Signed Off',outcome:to,selected:A.who,actual:via||A.who,switched:!!via,at:ccStamp(A),notes:notes,preparers:ccRecPreparers(s)};
  R.closed={status:to,at:ccStamp(A),summary:m,items:JSON.parse(JSON.stringify(ccRecItems(s))),matched:R.matched.slice(),acc:JSON.parse(JSON.stringify(R.acc||[]))};
  R.history.push({at:ccStamp(A),by:A.who,actual:via,from:'Ready for Sign-Off',to:to,note:notes});R.status=to;s.reconStatus=to;R.assignException='';
  R.matched.forEach(function(x){const t=ccTxn(x.txnId);if(t)t.reconStatus='Reconciled ('+expKey(s)+')';});
  ccRecItems(s).forEach(function(i){const t=i.txnId?ccTxn(i.txnId):null;if(t&&i.status===RCX_CARRIED)t.reconStatus='Carried Forward ('+i.id+')';else if(t&&i.status==='Resolved')t.reconStatus='Reconciled ('+expKey(s)+')';});
  ccLog(s,s.importStatus,'Reconciliation signed off by '+caN(A.who)+': '+to+'. '+m.matched+' matched, '+m.carried+' carried forward'+(m.carried?' (not 100% reconciled; each stays traceable)':'')+', unexplained variance '+expMoney(m.variance,s.currency)+'.'+(notes?' Notes: '+notes:'')
    +' Closed: never rewritten; late provider information is recorded as a supplementary correction. No funding, budget, claim or reimbursement entry was made.',A);
  ccNotify(R.preparers.filter(function(u){return u!==A.who;}),expKey(s)+': reconciliation signed off ('+to+') by '+caN(A.who)+'.',s,'rc-closed');
  return '';
}
/* What happened later to an exception carried forward from a closed reconciliation (shown, never written into the closed record). */
function ccRecLater(s,it){const t=it.txnId?ccTxn(it.txnId):null;if(!t)return '';const L=(t.stmtLinks||[]).find(function(x){return x.stmtId!==s.id;});return L?'Later confirmed by '+L.key+' row '+L.row:t.status!=='Pending Authorization'&&it.type===RC_T.pend?'Now '+t.status:'';}

/* ── Supplementary correction (late provider information): a linked record on the closed reconciliation, independently verified ── */
function ccRecSupplement(id,d,A){
  A=A||ccNow();d=d||{};const s=ccStmtGet(id),R=s&&s.recon;
  if(!R||RC_CLOSED.indexOf(R.status)<0)return 'A supplementary correction is recorded on a closed reconciliation only; an open one is corrected through its exceptions.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot record reconciliation corrections (card.transaction.match).';
  const reason=String(d.reason||'').trim(),ev=String(d.evidence||'').trim(),ref=String(d.ref||'').trim();
  if(ref.length<3)return 'Enter the provider\'s reference for the late information.';if(reason.length<10)return 'Describe the late provider information and its effect (at least 10 characters).';if(!ev)return 'Attach the provider evidence.';
  const amt=d.amount==null||String(d.amount).trim()===''?0:Number(String(d.amount).replace(/,/g,''));if(!isFinite(amt))return 'The amount is a number (negative for a credit) or blank.';
  const it=d.item?ccRecItems(s).find(function(i){return i.id===d.item;}):null;if(d.item&&!it)return 'No exception '+d.item+' on this reconciliation.';
  const x={n:R.supplements.length+1,id:'RSC-'+s.key+'-'+(R.supplements.length+1),ref:ref,reason:reason,evidence:ev,amount:ccM(amt),currency:s.currency,item:it?it.id:'',by:A.who,actual:caVia(A),at:ccStamp(A),status:'Awaiting Verification'};
  R.supplements.push(x);
  ccLog(s,s.importStatus,'Supplementary correction '+x.id+' recorded by '+caN(A.who)+' (late provider information '+ref+(it?', about '+it.id:'')+(x.amount?', '+expMoney(x.amount,s.currency):'')+'): '+reason+'. The closed reconciliation ('+R.status+') is not rewritten; someone independent verifies the correction.',A);
  ccNotify(ccRecSuppVerifiers(s,x),expKey(s)+': supplementary reconciliation correction '+x.id+' awaits your verification.',s,'rc-sup-'+x.n);
  return '';
}
function ccRecSuppVerifiers(s,x){const h=ccStmtHolders(s);return ccPeopleWith('card.transaction.verify',s.entity).filter(function(u){return u!==x.by&&u!==x.actual&&h.indexOf(u)<0&&(typeof caActive!=='function'||caActive(u));});}
function ccRecSupplementVerify(id,n,decision,remarks,A){
  A=A||ccNow();remarks=String(remarks||'').trim();const s=ccStmtGet(id),R=s&&s.recon,x=R&&R.supplements.find(function(y){return y.n===Number(n);});
  if(!x||x.status!=='Awaiting Verification')return 'No supplementary correction awaits verification here.';
  if(!ccPCan(A,'card.transaction.verify'))return caN(A.who)+' cannot verify reconciliation corrections (card.transaction.verify).';
  const via=caVia(A);if([x.by,x.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(x.by)+' recorded '+x.id+'; someone else verifies it.';
  if(ccStmtHolders(s).some(function(u){return u===A.who||u===via;}))return 'A cardholder on this statement never verifies its corrections.';
  if(decision!=='Verify'&&decision!=='Reject')return 'Verify or Reject.';if(decision==='Reject'&&remarks.length<5)return 'Say why it is rejected.';
  x.status=decision==='Verify'?'Verified':'Rejected';x.verifiedBy=A.who;x.verifiedActual=via;x.verifiedAt=ccStamp(A);x.remarks=remarks;
  ccLog(s,s.importStatus,'Supplementary correction '+x.id+' '+(x.status==='Verified'?'verified':'rejected')+' by '+caN(A.who)+(remarks?': '+remarks:'')+'. The closed reconciliation keeps its original figures; the correction is shown with it.',A);
  return '';
}
/* Statement verification (8B) never reconciles; reconciliation exceptions follow later records (another statement, a verification). */
ccHook('ccStmtVerify',null,function(out){if(out&&!out.error)ccRecSyncAll();return undefined;});
ccHook('ccTxnVerify',null,function(out){if(!out)ccRecSyncAll();return undefined;});

/* ── Completing a financial RCA from the existing workflow's own record (never posted here) ── */
function ccRecAdjCands(a){
  const out=[],t=a.txnId?ccTxn(a.txnId):null,orig=t&&t.direction==='Credit'&&t.refundOf&&t.refundOf.id?t.refundOf.id:t?t.id:null;
  const credits=ccTxns.filter(function(c){return c.entity===a.entity&&c.direction==='Credit'&&(c.id===a.txnId||(orig&&c.refundOf&&c.refundOf.id===orig))&&(c.verify||{}).status===CCT_VERIFIED;});
  if(a.type==='Funding Source Return')credits.forEach(function(c){if(c.refund&&c.refund.dest==='Company Funding Source'&&c.refund.fundingKey)out.push({kind:'credit',id:c.id,label:expKey(c)+' · returned to '+c.refund.sourceKey+' · funding entry '+c.refund.fundingKey,refs:[c.refund.fundingKey],key:'fb:'+c.refund.fundingKey});});
  if(a.type==='Refund Budget Correction')credits.forEach(function(c){const al=c.alloc||{};if((al.lines||[]).length)out.push({kind:'credit',id:c.id,label:expKey(c)+' · '+al.status+' · '+al.lines.map(function(x){return x.lineRef+' '+x.status;}).join(', '),
    refs:[].concat.apply([],al.lines.map(function(x){return (x.events||[]).length?x.events:['CTXR-'+c.key];})),key:'cr:'+c.id,closed:al.lines.some(function(x){return x.status===CCR_CLOSED;})});});
  if(a.type==='CSX Company Acceptance')ccSpendExcs.forEach(function(x){if(x.entity!==a.entity||ccCsxTxnOf(x)!==orig)return;(x.resolutions||[]).forEach(function(r){
    if(r.type==='Company Acceptance'&&['Accepted','Approved – Pending Closed Period Adjustment'].indexOf(r.status)>=0)out.push({kind:'csx',id:x.id,n:r.n,label:expKey(x)+' · '+(r.reqKey||'acceptance')+' · '+r.status,refs:(r.budgetEvents||[]).length?r.budgetEvents:[r.reqKey||expKey(x)],key:'csx:'+x.id+':'+r.n,closed:r.status!=='Accepted'});});});
  if(a.type==='Authorized Write-off'&&typeof fbTxns!=='undefined')fbTxns.forEach(function(f){if(f.entity===a.entity&&f.type==='Adjustment'&&f.status==='Verified')out.push({kind:'funding',id:f.id,label:f.key+' · Adjustment '+(f.dir>0?'increase':'decrease')+' '+expMoney(f.amount,f.currency)+(f.ref?' · ref '+f.ref:''),refs:[f.key],key:'fb:'+f.key});});
  return out.filter(function(c){return !ccRecAdjs.some(function(b){return b!==a&&b.link&&b.link.key===c.key&&['Rejected','Cancelled'].indexOf(b.status)<0;});});
}
function ccRecAdjLink(ref,o,A){
  A=A||ccNow();o=o||{};const a=ccRecAdj(ref);if(!a||a.entity!==ccEnt())return 'No such adjustment.';
  if(a.status!=='Approved – Processing Pending')return a.ref+' is '+a.status+': only an approved financial adjustment is completed by linking its entry.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot complete reconciliation adjustments (card.transaction.match).';
  const s=ccStmt(a.stmtId),via=caVia(A);if(ccStmtHolders(s).some(function(u){return u===A.who||u===via;}))return 'A cardholder on this statement never completes its adjustments.';
  const all=ccRecAdjs.reduce(function(m,b){if(b!==a&&b.link&&['Rejected','Cancelled'].indexOf(b.status)<0)m[b.link.key]=b.ref;return m;},{});
  const c=ccRecAdjCands(Object.assign({},a,{ref:a.ref})).concat([]).find(function(x){return x.kind===o.kind&&x.id===Number(o.id)&&(x.n==null||x.n===Number(o.n));});
  if(!c){const k=o.kind==='funding'&&typeof fbTxns!=='undefined'?'fb:'+((fbTxns.find(function(f){return f.id===Number(o.id);})||{}).key):'';
    return all[k]?'That entry is already linked to '+all[k]+': one financial entry, one adjustment; it is never posted twice.':'Pick the entry the existing workflow produced for this '+a.type.toLowerCase()+' (it must exist, be verified or approved, and belong to this difference).';}
  a.link={kind:c.kind,id:c.id,n:c.n==null?null:c.n,key:c.key,label:c.label,refs:c.refs,by:A.who,actual:via,at:ccStamp(A)};
  const to=c.closed?'Pending – Closed Period Adjustment':'Completed – Linked Financial Entry';
  ccRecAdjHist(a,A,to,'Linked '+c.label+' (posting '+c.refs.join(', ')+')');
  const it=s.recon&&s.recon.items[a.itemKey];
  if(it&&RC_CLOSED.indexOf(s.recon.status)<0&&it.status===RCX_FINPEND&&to==='Completed – Linked Financial Entry'){it.resolution=Object.assign({},it.resolution,{action:'Financial adjustment completed',ref:c.refs.join(', '),postingRefs:c.refs,by:A.who,actual:via,at:ccStamp(A)});ccRecHist(it,A,'Resolved','Completed by '+c.label);}
  ccLog(s,s.importStatus,'Adjustment '+a.ref+' '+(to==='Completed – Linked Financial Entry'?'completed':'linked, the financial year is closed')+': '+c.label+' (posting '+c.refs.join(', ')+'), linked by '+caN(A.who)+'. Reconciliation posted nothing itself'+(RC_CLOSED.indexOf((s.recon||{}).status)>=0?'; the closed reconciliation is not rewritten.':'.'),A);
  if(s.recon)ccRecSync(s,A);return '';
}
function ccRecAdjCancel(ref,reason,A){
  A=A||ccNow();reason=String(reason||'').trim();const a=ccRecAdj(ref);if(!a||a.entity!==ccEnt())return 'No such adjustment.';
  if(['Awaiting Approval','Approved – Processing Pending'].indexOf(a.status)<0)return a.ref+' is '+a.status+'.';
  if(!ccPCan(A,'card.transaction.match'))return caN(A.who)+' cannot cancel reconciliation adjustments (card.transaction.match).';
  if(reason.length<10)return 'Say why the adjustment is cancelled (at least 10 characters).';
  const s=ccStmt(a.stmtId);if(RC_CLOSED.indexOf((s.recon||{}).status)<0&&s.recon.status==='Ready for Sign-Off')return expKey(s)+' awaits sign-off: return it first.';
  ccRecAdjHist(a,A,'Cancelled',reason);const it=s.recon&&s.recon.items[a.itemKey];
  if(it&&RC_CLOSED.indexOf(s.recon.status)<0&&[RCX_FINPEND,'Awaiting Approval'].indexOf(it.status)>=0){ccRecHist(it,A,'Open','Adjustment '+a.ref+' cancelled: '+reason);}
  ccLog(s,s.importStatus,'Adjustment '+a.ref+' cancelled by '+caN(A.who)+': '+reason+'. Nothing was posted.',A);
  if(s.recon)ccRecSync(s,A);return '';
}
/* An RCA waiting on a closed financial year completes when its linked record is finally accepted (re-checked with the records). */
function ccRecAdjRefresh(){
  ccRecAdjs.forEach(function(a){if(a.status!=='Pending – Closed Period Adjustment'||!a.link)return;
    if(a.link.kind==='csx'){const x=ccCsx(a.link.id),r=x&&ccCsxRes(x,a.link.n);if(r&&r.status==='Accepted'){const S=caAt('System',wbToday(),stampNow().time);a.link.refs=(r.budgetEvents||[]).length?r.budgetEvents:a.link.refs;ccRecAdjHist(a,S,'Completed – Linked Financial Entry','The closed-period adjustment was posted ('+a.link.refs.join(', ')+')');}}
    if(a.link.kind==='credit'){const c=ccTxn(a.link.id),al=c&&c.alloc;if(al&&(al.lines||[]).length&&!al.lines.some(function(x){return x.status===CCR_CLOSED;})){const S=caAt('System',wbToday(),stampNow().time);ccRecAdjHist(a,S,'Completed – Linked Financial Entry','The closed-period correction was posted');}}
  });
}
function ccRecAdjsOf(s){return ccRecAdjs.filter(function(a){return a.stmtId===s.id;});}
function ccRecAdjsPending(s){return ccRecAdjsOf(s).filter(function(a){return RCA_OPEN.indexOf(a.status)>=0;});}

/* Finance sees card spends whose evidence rule is under configuration review (never the cardholder). */
ccHook('ccCardExceptions',null,function(out,ent,o){
  o=o||{};if(!out||!ccCan('card.transaction.match')||typeof ccBenefitEvidenceReview!=='function'||(o.group&&o.group!==CCX_GROUPS[10]))return undefined;
  ccTxns.forEach(function(t){if(t.entity!==(ent||ccEnt())||(o.eid&&t.employeeEid!==o.eid))return;const cf=ccBenefitEvidenceReview(t);if(!cf)return;
    out.push({kind:'txn',key:'txn:'+t.id,state:ccExcState('txn:'+t.id),group:CCX_GROUPS[10],category:'Evidence Rule Under Review',t:t,eid:t.employeeEid,amount:t.amount,currency:t.currency,info:{status:'Configuration Review',tone:'wait'},
      text:'No authoritative Wallet & Benefits evidence rule for this '+wbTypeName(t.wallet)+' card spend ('+cf.key+': '+(WB_EVC_CASE[cf.case]||'')+'). An authorized Wallet & Benefits administrator resolves it in Categories; nothing is asked of the cardholder meanwhile.'});});
  return undefined;
});


/* ══ Build 8G · FR-CT-20 · Transaction disputes (with FR-CT-14, 15, 16, 18/19, 21, 22, 24, 25; product decisions of 8 Nov 2026,
   "FR-CT Build 8F Acceptance and 8G Direction") ═══════════════════════════════════════════════════════════════════════════
   A dispute (DSP) is the cardholder's internal report about one posted, verified card transaction; Finance reviews it in
   Corporate Cards → Cards → Disputes. Three things stay apart: the internal workflow status, the provider outcome (only from
   authoritative evidence, verified by someone independent when entered manually, or Illustrative) and the financial
   settlement (only verified credits, 8E records, linked once). Raising one needs no approval, changes no transaction and
   creates no credit; a favourable outcome is not money; an outcome against the cardholder recovers nothing automatically.
   Credits settle a linked CSX through its own resolution; a closed statement gets a supplementary correction. Nothing here
   posts funding, budget, claims or reimbursements: 8E does that for verified credits, once. No provider is connected, so
   no issuer submission is ever simulated as genuine. */
const DSP_REASONS=['Unrecognized Transaction','Duplicate Charge','Incorrect Amount','Goods/Services Not Received','Refund Not Received','Cancelled Transaction Charged','Lost/Stolen Card Related Transaction','Other'];
/* Supporting evidence required by reason (configurable here until a settings screen exists; FR-CT-20 field "Configurable"). */
const DSP_EVIDENCE={'Duplicate Charge':true,'Incorrect Amount':true,'Goods/Services Not Received':true,'Refund Not Received':true,'Cancelled Transaction Charged':true};
const DSP_ACTIVE=['Submitted','Under Internal Review','More Information Required','Awaiting Provider','Raised with Provider','Provider Outcome Recorded','Financial Settlement Pending'];
const DSP_DONE=['Closed','Withdrawn','Resolved'];   // Resolved: marked resolved in one click (product owner, 11 Nov 2026)
const DSP_OUTCOMES=['Resolved in Favour','Partially in Favour','Resolved Against'];
const ccDisputes=[];let ccDspNextId=410001,ccDspNextKey=1001;
function ccDsp(id){return ccDisputes.find(function(d){return d.id===Number(id);})||null;}
function ccDspGet(id){const d=ccDsp(id);return d&&d.entity===ccEnt()?d:null;}
function ccDspOfTxn(t,all){return ccDisputes.filter(function(d){return d.txnId===t.id&&(all||d.status!=='Withdrawn'&&d.status!=='Draft');});}
function ccDspHist(d,A,to,note,o){d.timeline.push(Object.assign({at:ccStamp(A),by:A.who,actual:caVia(A),from:d.status,to:to,note:note||''},o||{}));d.status=to;}
function ccDspHolder(d){return idUserOfEmp(d.employeeEid);}
function ccDspPeople(d,extra){return ccUniq([ccDspHolder(d),d.raisedBy].concat(d.assignee?[d.assignee]:[],extra||[])).filter(function(u){return u&&u!=='System';});}
function ccDspNotify(d,to,text,evt,A){ccNotify(ccUniq(to).filter(function(u){return u&&(!A||u!==A.who);}),expKey(d)+': '+text,d,evt);}
/* What can still be disputed: the billed amount, less verified credits not already inside a dispute, less what other disputes cover. */
function ccDspCreditLinked(c){return ccM((c.dspAllocs||[]).reduce(function(s,a){return s+a.amount;},0));}
function ccDspRemaining(t,exceptId){
  const cr=ccCreditsOf(t,{verified:true}).reduce(function(s,c){return s+Math.max(0,c.billAmount-ccDspCreditLinked(c));},0);
  const ds=ccDisputes.filter(function(d){return d.txnId===t.id&&d.id!==exceptId&&['Draft','Withdrawn'].indexOf(d.status)<0;}).reduce(function(s,d){return s+d.amount;},0);
  return ccM(Math.max(0,t.billAmount-cr-ds));
}
function ccDspTxnWhyNot(t){
  if(!t||t.entity!==ccEnt())return 'Pick a card transaction of this entity.';
  if(t.direction==='Credit')return expKey(t)+' is a credit (refund or reversal): it is not disputed; dispute the original purchase.';
  if(t.status!=='Posted'||(!t.demo&&(t.verify||{}).status!==CCT_VERIFIED))
    return expKey(t)+' is '+(t.status!=='Posted'?t.status:ccTxnVerifyLabel(t))+': a formal dispute needs a posted, verified transaction. Until then use Provide Supporting Information (or Finance\'s transaction review); no issuer dispute is claimed for it.';
  return '';
}
/* d: {txnId, reason, description, amount, evidence, submit} - the cardholder for their own transaction, or Finance on behalf. */
function ccDspCreate(o,A){
  A=A||ccNow();o=o||{};const t=ccTxn(o.txnId),why=ccDspTxnWhyNot(t);if(why)return {error:why};
  const holder=idUserOfEmp(t.employeeEid),via=caVia(A),own=A.who===holder||via===holder;
  if(own&&!ccPCan(A,'card.dispute.raise'))return {error:caN(A.who)+' cannot raise card disputes (card.dispute.raise).'};
  if(!own&&!ccPCan(A,'card.dispute.manage'))return {error:'Only the cardholder raises a dispute on their own transaction'+(ccPCan(A,'card.dispute.raise')?': '+expKey(t)+' is on '+caN(holder)+'\'s card.':'.')+' Finance can raise one on their behalf.'};
  if(t.demo&&!ccDemoOn(t.entity))return {error:'Presentation mode is off: an illustrative transaction is not disputed.'};
  const reason=DSP_REASONS.indexOf(o.reason)>=0?o.reason:'';if(!reason)return {error:'Pick the dispute reason.'};
  const desc=String(o.description||'').trim();if(desc.length<(reason==='Other'?20:10))return {error:reason==='Other'?'Explain the dispute (at least 20 characters) – required for Other.':'Describe what is wrong (at least 10 characters).'};
  const ev=String(o.evidence||'').trim();if(DSP_EVIDENCE[reason]&&!ev)return {error:reason+' needs supporting evidence (for example the receipt, the merchant\'s confirmation or the cancellation).'};
  const amt=Number(String(o.amount==null?'':o.amount).replace(/,/g,''));const rem=ccDspRemaining(t);
  if(!(amt>0))return {error:'Enter the disputed amount.'};if(Math.round(amt*100)!==amt*100)return {error:'The amount has at most two decimals.'};
  if(amt>rem+1e-9)return {error:'Only '+expMoney(rem,t.billCurrency)+' of '+expKey(t)+' can still be disputed (billed '+expMoney(t.billAmount,t.billCurrency)+', less verified refunds and other disputes).'};
  const e=idEmp(t.employeeEid)||{},c=ccCard(t.cardId);
  const d={id:ccDspNextId++,key:ccDspNextKey++,prefix:'DSP',kind:'card dispute',entity:t.entity,txnId:t.id,txnKey:expKey(t),cardId:t.cardId,cardRef:{key:t.cardRef?t.cardRef.key:'',last4:t.cardRef?t.cardRef.last4:''},
    cardStatus:c?c.status:'',programmeId:t.programmeId,employeeEid:t.employeeEid,name:e.name||t.name||'',empId:e.empId||'',merchant:t.merchant,txnDate:ccTxnLocalDate(t)||t.date,
    txnAmount:t.amount,txnCurrency:t.currency,billAmount:t.billAmount,currency:t.billCurrency,amount:ccM(amt),reason:reason,description:desc,evidence:ev?[{file:ev,by:A.who,actual:via,at:ccStamp(A)}]:[],
    demo:!!t.demo,raisedBy:A.who,actual:via,onBehalf:!own,raisedAt:ccStamp(A),iso:A.iso,status:'Draft',assignee:'',notes:[],requests:[],
    provider:null,outcome:null,settlement:{status:'Not Applicable',credits:[]},csx:null,rsc:[],timeline:[],logs:[]};
  ccDisputes.unshift(d);t.disputes=(t.disputes||[]).concat([expKey(d)]);
  ccLog(d,'Draft','Dispute raised by '+caN(A.who)+(d.onBehalf?' on behalf of '+caN(holder):'')+' on '+expKey(t)+' ('+t.merchant+', '+expMoney(t.billAmount,t.billCurrency)+', card '+ccMask(d.cardRef.last4)+'): '+reason+', '+expMoney(d.amount,d.currency)+'. '+desc+(ev?' Evidence: '+ev+'.':'')+(d.demo?' '+CC_DEMO+' transaction: the dispute is illustrative activity only.':''),A);
  ccLog(t,t.status,'Dispute '+expKey(d)+' raised ('+reason+', '+expMoney(d.amount,d.currency)+'). The transaction is unchanged; nothing is refunded or credited by raising it.',A);
  ccDspHist(d,A,'Draft','Raised'+(d.onBehalf?' on behalf of '+caN(holder):''));
  if(o.submit!==false){const er=ccDspSubmit(d.id,A);if(er)return {error:er,rec:d};}
  return {rec:d};
}
function ccDspSubmit(id,A){
  A=A||ccNow();const d=ccDspGet(id);if(!d)return 'No such dispute.';
  if(d.status!=='Draft')return expKey(d)+' is '+d.status+'.';
  const via=caVia(A);if(![d.raisedBy,ccDspHolder(d)].some(function(u){return u===A.who||u===via;})&&!ccPCan(A,'card.dispute.manage'))return 'Only '+caN(d.raisedBy)+' or the cardholder submits this draft.';
  const t=ccTxn(d.txnId),why=ccDspTxnWhyNot(t);if(why)return why;
  const rem=ccDspRemaining(t,d.id);if(d.amount>rem+1e-9)return 'Only '+expMoney(rem,d.currency)+' of '+expKey(t)+' can still be disputed: another dispute or a verified refund covers the rest.';
  ccDspHist(d,A,'Submitted','Submitted internally to ADT (not to the provider)');d.submittedAt=ccStamp(A);
  ccLog(d,'Submitted','Submitted by '+caN(A.who)+' for Finance\'s internal review. No issuer dispute has been raised: that happens only when Finance records the provider case with its evidence.',A);
  ccDspNotify(d,[ccDspHolder(d),d.raisedBy],'dispute submitted for internal review ('+d.reason+', '+expMoney(d.amount,d.currency)+'). Finance reviews it; nothing has been raised with the provider yet.','dsp-submitted',null);
  return '';
}
function ccDspMayManage(A,d){
  if(!d)return 'No such dispute.';
  if(!ccPCan(A,'card.dispute.manage'))return caN(A.who)+' cannot manage card disputes (card.dispute.manage).';
  const h=ccDspHolder(d),via=caVia(A);if(A.who===h||via===h)return 'A cardholder never manages a dispute on their own transaction.';
  if(DSP_DONE.indexOf(d.status)>=0)return expKey(d)+' is '+d.status+'.';
  if(d.status==='Draft')return expKey(d)+' is still a draft of '+caN(d.raisedBy)+'.';
  if(d.demo&&!ccDemoOn(d.entity))return 'Presentation mode is off: '+CC_DEMO+' disputes are not processed.';
  return '';
}
function ccDspReviewers(d){const h=ccDspHolder(d);return ccPeopleWith('card.dispute.manage',d.entity).filter(function(u){return u!==h&&(typeof caActive!=='function'||caActive(u));});}
/* Assign an internal reviewer (the existing assignment pattern): only the assignee is told, never every Finance user. */
function ccDspAssign(id,uid,A){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  uid=uid||A.who;if(ccDspReviewers(d).indexOf(uid)<0)return caN(uid)+' cannot review this dispute (card.dispute.manage; never the cardholder).';
  const was=d.assignee;d.assignee=uid;
  if(['Submitted'].indexOf(d.status)>=0)ccDspHist(d,A,'Under Internal Review','Assigned to '+caN(uid));else d.timeline.push({at:ccStamp(A),by:A.who,actual:caVia(A),from:d.status,to:d.status,note:'Assigned to '+caN(uid)});
  ccLog(d,d.status,'Assigned for review to '+caN(uid)+' by '+caN(A.who)+(was?' (was '+caN(was)+')':'')+'.',A);
  ccDspNotify(d,[uid],'assigned to you for review ('+d.reason+', '+expMoney(d.amount,d.currency)+').','dsp-assigned-'+uid+'-'+d.timeline.length,A);
  return '';
}
function ccDspNote(id,text,A){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  text=String(text||'').trim();if(text.length<5)return 'Write the internal note.';
  d.notes.push({text:text,by:A.who,actual:caVia(A),at:ccStamp(A)});
  ccLog(d,d.status,'Internal note by '+caN(A.who)+' (not shown to the cardholder).',A);return '';
}
function ccDspRequestInfo(id,text,A){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(['Submitted','Under Internal Review','Awaiting Provider','Raised with Provider'].indexOf(d.status)<0)return expKey(d)+' is '+d.status+'.';
  text=String(text||'').trim();if(text.length<10)return 'Say what information is needed (at least 10 characters).';
  if(!d.assignee)d.assignee=A.who;
  d.requests.push({q:text,by:A.who,actual:caVia(A),at:ccStamp(A),back:d.status,a:null});
  ccDspHist(d,A,'More Information Required',text);
  ccLog(d,d.status,'More information requested from the cardholder by '+caN(A.who)+': '+text,A);
  ccDspNotify(d,[ccDspHolder(d),d.onBehalf?null:d.raisedBy],'more information is needed: '+text,'dsp-info-'+d.requests.length,A);
  return '';
}
function ccDspRespond(id,o,A){
  A=A||ccNow();o=o||{};const d=ccDspGet(id);if(!d)return 'No such dispute.';
  const h=ccDspHolder(d),via=caVia(A);if(!(A.who===h||via===h||(d.onBehalf&&ccPCan(A,'card.dispute.manage')&&A.who!==h)))return 'Only '+caN(h)+' answers on their own dispute (or Finance filing on their behalf).';
  if(d.status!=='More Information Required')return expKey(d)+' is '+d.status+': no information is asked.';
  const note=String(o.note||'').trim(),file=String(o.file||'').trim();if(note.length<5&&!file)return 'Add the information (at least 5 characters) or attach a document.';
  const q=d.requests[d.requests.length-1];q.a={note:note,file:file,by:A.who,actual:via,at:ccStamp(A)};if(file)d.evidence.push({file:file,by:A.who,actual:via,at:ccStamp(A)});
  ccDspHist(d,A,q.back==='Submitted'?'Under Internal Review':q.back,'Information provided');
  ccLog(d,d.status,'Information provided by '+caN(A.who)+': '+note+(file?' ('+file+')':'')+'.',A);
  ccDspNotify(d,[q.by,d.assignee],'the cardholder responded to the information request.','dsp-resp-'+d.requests.length,A);
  return '';
}
/* Internal review complete: ready to raise with the provider (nothing is raised yet). */
function ccDspReadyForProvider(id,note,A){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(['Submitted','Under Internal Review'].indexOf(d.status)<0)return expKey(d)+' is '+d.status+'.';
  note=String(note||'').trim();if(note.length<10)return 'Record the review conclusion (at least 10 characters).';
  if(!d.assignee)d.assignee=A.who;d.review={note:note,by:A.who,actual:caVia(A),at:ccStamp(A)};
  ccDspHist(d,A,'Awaiting Provider','Internal review complete: '+note);
  ccLog(d,d.status,'Internal review completed by '+caN(A.who)+': '+note+'. Awaiting the provider case: nothing has been raised with '+ccProviderName((ccCard(d.cardId)||{}).provider||'')+' yet.',A);
  return '';
}
/* Provider submission: only with the provider's case reference and evidence (FR-CT-20.08); manual evidence is verified by someone else. */
function ccDspProviderSubmit(id,o,A){
  A=A||ccNow();o=o||{};const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(d.status!=='Awaiting Provider')return expKey(d)+' is '+d.status+': complete the internal review first.';
  if(d.demo){if(!ccPCan(A,'card.demo.simulate'))return caN(A.who)+' cannot record illustrative card activity (card.demo.simulate).';
    d.provider={caseRef:'ILLUSTRATIVE-'+expKey(d),date:wbToday(),evidence:CC_DEMO,source:CC_DEMO,by:A.who,actual:caVia(A),at:ccStamp(A),verify:{status:CC_DEMO},events:[]};
    ccDspHist(d,A,'Raised with Provider',CC_DEMO+': no provider was contacted');ccLog(d,d.status,'Illustrative provider submission recorded by '+caN(A.who)+' ('+CC_DEMO+'): no provider was contacted.',A);
    ccDspNotify(d,[ccDspHolder(d)],'illustrative provider submission recorded ('+CC_DEMO+').','dsp-provider',A);return '';}
  const ref=String(o.caseRef||'').trim(),ev=String(o.evidence||'').trim(),dt=String(o.date||'');
  if(ref.length<3||!ev)return 'Raised with Provider needs the provider\'s case reference and the evidence of the submission (acknowledgement, portal screen or email); without them the dispute stays Awaiting Provider.';
  if(!dt||dt>wbToday())return 'Enter the date the case was raised with the provider (not in the future).';
  if(ccDisputes.some(function(x){return x!==d&&x.provider&&String(x.provider.caseRef).toLowerCase()===ref.toLowerCase();}))return 'Provider case '+ref+' is already recorded on another dispute.';
  d.provider={caseRef:ref,date:dt,evidence:ev,source:'Manual External Evidence',by:A.who,actual:caVia(A),at:ccStamp(A),verify:{status:'Awaiting Verification'},events:[]};
  ccDspHist(d,A,'Raised with Provider','Provider case '+ref+' (manual evidence '+ev+', awaiting independent verification)');
  ccLog(d,d.status,'Provider case '+ref+' recorded by '+caN(A.who)+' from '+ev+' (raised on '+cdLabel(dt)+'). Manual external evidence: it is not a provider confirmation and someone independent verifies it.',A);
  ccNotify(ccDspVerifiers(d,d.provider),expKey(d)+': the provider case evidence awaits your verification.',d,'dsp-provver');
  ccDspNotify(d,[ccDspHolder(d)],'raised with the provider (case recorded by Finance).','dsp-provider',A);
  return '';
}
function ccDspVerifiers(d,x){const h=ccDspHolder(d);return ccPeopleWith('card.transaction.verify',d.entity).filter(function(u){return u!==x.by&&u!==x.actual&&u!==h&&(typeof caActive!=='function'||caActive(u));});}
/* Independent verification of manually entered provider evidence (submission or outcome). */
function ccDspVerify(id,what,decision,remarks,A){
  A=A||ccNow();remarks=String(remarks||'').trim();const d=ccDspGet(id);if(!d)return 'No such dispute.';
  const x=what==='outcome'?d.outcome:d.provider;if(!x||!x.verify||x.verify.status!=='Awaiting Verification')return 'No provider '+(what==='outcome'?'outcome':'submission')+' awaits verification here.';
  if(!ccPCan(A,'card.transaction.verify'))return caN(A.who)+' cannot verify provider evidence (card.transaction.verify).';
  const via=caVia(A),h=ccDspHolder(d);
  if([x.by,x.actual].filter(Boolean).some(function(u){return u===A.who||u===via;}))return 'Maker-checker: '+caN(x.by)+' recorded this provider evidence; someone else verifies it, also not through Switch User.';
  if(A.who===h||via===h)return 'The cardholder never verifies evidence on their own dispute.';
  if(decision!=='Verify'&&decision!=='Reject')return 'Verify or Reject.';if(decision==='Reject'&&remarks.length<5)return 'Say why the evidence is rejected.';
  x.verify={status:decision==='Verify'?'Verified':'Rejected',by:A.who,actual:via,at:ccStamp(A),remarks:remarks};
  if(decision==='Reject'){
    if(what==='outcome'){d.outcomeHistory=(d.outcomeHistory||[]).concat([d.outcome]);d.outcome=null;ccDspHist(d,A,'Raised with Provider','Outcome evidence rejected: '+remarks);}
    else{d.providerHistory=(d.providerHistory||[]).concat([d.provider]);d.provider=null;ccDspHist(d,A,'Awaiting Provider','Submission evidence rejected: '+remarks);}
  }else if(what==='outcome')ccDspOutcomeApply(d,A);
  ccLog(d,d.status,'Provider '+(what==='outcome'?'outcome':'submission')+' evidence '+(decision==='Verify'?'independently verified':'rejected')+' by '+caN(A.who)+(remarks?': '+remarks:'')+'.',A);
  ccNotify([x.by].concat(d.assignee?[d.assignee]:[]).filter(function(u){return u!==A.who;}),expKey(d)+': provider '+(what==='outcome'?'outcome':'submission')+' evidence '+(decision==='Verify'?'verified':'rejected')+'.',d,'dsp-'+what+'-'+decision+'-'+d.timeline.length);
  return '';
}
/* Provider requests and responses on the case (tracked, evidence kept). */
function ccDspProviderEvent(id,o,A){
  A=A||ccNow();o=o||{};const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(!d.provider)return 'Record the provider case first.';
  const type=o.type==='Provider Request'?'Provider Request':'Provider Response',text=String(o.text||'').trim(),ev=String(o.evidence||'').trim();
  if(text.length<10)return 'Describe the provider\'s '+(type==='Provider Request'?'request':'response')+' (at least 10 characters).';if(!ev&&!d.demo)return 'Attach the provider\'s message or portal screen.';
  d.provider.events.push({type:type,text:text,evidence:ev,by:A.who,actual:caVia(A),at:ccStamp(A)});
  ccLog(d,d.status,type+' recorded by '+caN(A.who)+': '+text+(ev?' ('+ev+')':'')+'.',A);
  ccDspNotify(d,[ccDspHolder(d)],'the provider '+(type==='Provider Request'?'asked for information':'responded')+'; Finance follows it up.','dsp-provresp-'+d.provider.events.length,A);
  return '';
}
/* o: {result, amount, ref, evidence, date} - the provider's decision; never without authoritative evidence (FR-CT-20.10). */
function ccDspOutcome(id,o,A){
  A=A||ccNow();o=o||{};const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(d.status!=='Raised with Provider')return expKey(d)+' is '+d.status+': an outcome follows a provider case.';
  if(!d.provider||(!d.demo&&(d.provider.verify||{}).status!=='Verified'))return 'The provider case evidence is not independently verified yet: no outcome is recorded before it is.';
  const res=DSP_OUTCOMES.indexOf(o.result)>=0?o.result:'';if(!res)return 'Pick the provider outcome.';
  const amt=res==='Resolved Against'?0:o.amount==null||String(o.amount).trim()===''?(res==='Resolved in Favour'?d.amount:NaN):Number(String(o.amount).replace(/,/g,''));
  if(res!=='Resolved Against'&&!(amt>0&&amt<=d.amount+1e-9))return 'The amount in the cardholder\'s favour is more than 0 and at most the disputed '+expMoney(d.amount,d.currency)+'.';
  if(res==='Partially in Favour'&&amt>=d.amount-1e-9)return 'Partially in Favour is less than the disputed amount; use Resolved in Favour for all of it.';
  const ev=String(o.evidence||'').trim(),ref=String(o.ref||'').trim();
  if(!d.demo&&(!ev||ref.length<3))return 'A provider outcome needs the provider\'s decision reference and its evidence (decision letter, portal screen or email). Without them nothing is recorded.';
  if(d.demo&&!ccPCan(A,'card.demo.simulate'))return caN(A.who)+' cannot record illustrative card activity (card.demo.simulate).';
  d.outcome={result:res,amount:ccM(amt),ref:d.demo?'ILLUSTRATIVE-'+expKey(d):ref,evidence:d.demo?CC_DEMO:ev,date:o.date||wbToday(),source:d.demo?CC_DEMO:'Manual External Evidence',by:A.who,actual:caVia(A),at:ccStamp(A),verify:{status:d.demo?CC_DEMO:'Awaiting Verification'}};
  ccDspHist(d,A,'Provider Outcome Recorded',res+(amt?' '+expMoney(amt,d.currency):'')+(d.demo?' ('+CC_DEMO+')':' – awaiting independent verification'));
  ccLog(d,d.status,'Provider outcome '+res+(amt?' ('+expMoney(amt,d.currency)+')':'')+' recorded by '+caN(A.who)+(d.demo?' ('+CC_DEMO+'; no provider decided anything)':' from '+ev+' (decision '+ref+'); someone independent verifies it')+'. A favourable outcome is not money received.',A);
  if(d.demo)ccDspOutcomeApply(d,A);else ccNotify(ccDspVerifiers(d,d.outcome),expKey(d)+': the provider outcome evidence awaits your verification.',d,'dsp-outver');
  ccDspNotify(d,[ccDspHolder(d)],'provider outcome recorded: '+res+(d.demo?' ('+CC_DEMO+')':' (being verified)')+'.','dsp-outcome',A);
  return '';
}
/* A verified outcome moves the settlement: in favour → Financial Settlement Pending until verified credits cover it; against → nothing
   is refunded or recovered, and a dispute credit expected on a CSX is released back to its outstanding amount. */
function ccDspOutcomeApply(d,A){
  const o=d.outcome;
  if(o.result==='Resolved Against'){
    d.settlement.status='Not Applicable';
    if(d.csx){const x=ccCsx(d.csx.id),r=x&&ccCsxRes(x,d.csx.n);
      if(r&&['Dispute Pending','Verification Pending'].indexOf(r.status)>=0&&!(r.resolved>0)){const S=caAt('System',wbToday(),stampNow().time);r.amount=ccM(r.resolved||0);ccCsxResHist(r,S,'Cancelled','Dispute '+expKey(d)+' resolved against the cardholder');
        ccLog(x,x.status,'Dispute credit expected from '+expKey(d)+' released: the provider decided against the cardholder. The amount stays outstanding for its existing resolution (company acceptance or employee recovery, each on its own approval); nothing is recovered automatically.',S);ccCsxRefresh(x,S);}}
    ccLog(d,d.status,'Resolved against the cardholder: no refund is expected; the card spending stands. No salary or payroll recovery is created; any company-side exception follows its own authorized process.',A);
  }else{ccDspSettleRefresh(d,A);}
}
function ccDspSettleRefresh(d,A){
  const o=d.outcome,linked=ccM((d.settlement.credits||[]).filter(function(c){const t=ccTxn(c.txnId);return t&&(t.demo||(t.verify||{}).status===CCT_VERIFIED);}).reduce(function(s,c){return s+c.amount;},0));
  const target=o&&o.result!=='Resolved Against'&&['Verified',CC_DEMO].indexOf(o.verify.status)>=0?o.amount:null;
  const was=d.settlement.status;d.settlement.settled=linked;
  d.settlement.status=target==null?(linked>0?'Credit Received – Outcome Pending':'Not Applicable'):linked>=target-1e-9?'Settled':linked>0?'Partially Settled':'Pending';
  if(target!=null&&d.settlement.status!=='Settled'&&d.status==='Provider Outcome Recorded')ccDspHist(d,A,'Financial Settlement Pending',expMoney(ccM(target-linked),d.currency)+' still to be credited');
  if(target!=null&&d.settlement.status!==was&&d.settlement.status!=='Settled')ccDspNotify(d,[ccDspHolder(d)],'outcome in your favour; the credit of '+expMoney(ccM(target-linked),d.currency)+' is still pending (Financial Settlement Pending).','dsp-settle-'+d.settlement.status,A);
}
/* Link a verified credit of the disputed transaction (8E record); it settles the dispute and, when one is expected, the CSX dispute credit. */
function ccDspCreditCands(d){const t=ccTxn(d.txnId);return t?ccCreditsOf(t).filter(function(c){return (c.demo||(c.verify||{}).status===CCT_VERIFIED)&&c.billAmount-ccDspCreditLinked(c)>0.009&&!(d.settlement.credits||[]).some(function(x){return x.txnId===c.id;});}):[];}
function ccDspLinkCredit(id,creditId,amount,A){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(['Raised with Provider','Provider Outcome Recorded','Financial Settlement Pending'].indexOf(d.status)<0)return expKey(d)+' is '+d.status+': credits are linked once the case is with the provider.';
  if(d.outcome&&d.outcome.result==='Resolved Against')return 'The provider decided against the cardholder: no dispute credit is expected.';
  const c=ccTxn(creditId);if(!c||ccDspCreditCands(d).indexOf(c)<0)return 'Pick a verified refund, reversal or dispute credit of '+d.txnKey+' that is not already linked.';
  const cap=d.outcome&&['Verified',CC_DEMO].indexOf(d.outcome.verify.status)>=0?d.outcome.amount:d.amount;
  const done=ccM((d.settlement.credits||[]).reduce(function(s,x){return s+x.amount;},0)),left=ccM(cap-done),free=ccM(c.billAmount-ccDspCreditLinked(c));
  let a=amount==null||String(amount).trim()===''?Math.min(left,free):Number(String(amount).replace(/,/g,''));
  if(!(a>0))return 'Enter the amount of the credit that settles the dispute.';if(a>free+1e-9)return 'Only '+expMoney(free,c.billCurrency)+' of '+expKey(c)+' is not linked yet.';
  if(a>left+1e-9)return 'Only '+expMoney(left,d.currency)+' is still to settle'+(d.outcome?' (the outcome is '+expMoney(cap,d.currency)+')':' (the disputed amount)')+': a dispute is never settled above it.';
  a=ccM(a);c.dspAllocs=(c.dspAllocs||[]).concat([{dspId:d.id,key:expKey(d),amount:a,at:ccStamp(A),by:A.who}]);
  d.settlement.credits.push({txnId:c.id,key:expKey(c),amount:a,at:ccStamp(A),by:A.who,actual:caVia(A)});
  if(c.refund&&!c.refund.disputeRef)c.refund.disputeRef=d.provider?d.provider.caseRef:expKey(d);
  ccLog(c,c.status,expMoney(a,c.billCurrency)+' of this credit linked to dispute '+expKey(d)+' by '+caN(A.who)+'. The refund processing of the credit applies as recorded (once); linking posts nothing.',A);
  let csxNote='';
  if(d.csx){const x=ccCsx(d.csx.id),r=x&&ccCsxRes(x,d.csx.n);
    if(r&&['Dispute Pending','Verification Pending'].indexOf(r.status)>=0){const e=ccCsxLinkCredit(x.id,r.n,c.id,a,A,{reason:'Credit of dispute '+expKey(d)});csxNote=e?' The CSX dispute credit was not linked: '+e:' Also linked to '+expKey(x)+' (dispute credit).';}}
  ccDspSettleRefresh(d,A);
  ccLog(d,d.status,'Credit '+expKey(c)+' ('+expMoney(a,d.currency)+', '+ccTxnVerifyLabel(c)+') linked by '+caN(A.who)+'. Settled '+expMoney(d.settlement.settled,d.currency)+' of '+expMoney(cap,d.currency)+' – '+d.settlement.status+'.'+csxNote+(ccDspSuppNeeded(d)?' The original transaction is in a closed statement reconciliation: a supplementary correction is required.':''),A);
  ccDspNotify(d,[ccDspHolder(d)],'a verified credit of '+expMoney(a,d.currency)+' was linked ('+d.settlement.status+').','dsp-credit-'+c.id,A);
  return '';
}
/* Expect the dispute credit on the CSX of the disputed transaction (8D resolution, the existing route; card.csx.resolve). */
function ccDspCsxOf(d){const t=ccTxn(d.txnId);return t?ccSpendExcs.find(function(x){return x.entity===d.entity&&ccCsxActive(x)&&ccCsxTxnOf(x)===t.id;})||null:null;}
function ccDspRouteCsx(id,A){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  if(d.csx)return expKey(d)+' already expects its credit on '+expKey(ccCsx(d.csx.id)||{})+'.';
  const x=ccDspCsxOf(d);if(!x)return 'No open card spend exception holds '+d.txnKey+'.';
  if(x.currency!==d.currency)return expKey(x)+' is in '+x.currency+' and the dispute in '+d.currency+': record the dispute credit on the card spend exception with its documented rate.';
  const v=ccCsxAmounts(x),amt=Math.min(v.free,d.amount);if(!(amt>0))return expKey(x)+' has nothing free to settle.';
  const r=ccCsxCreditExpect(x.id,{kind:'Dispute Credit',amount:amt,ref:d.provider?d.provider.caseRef:expKey(d),reason:'Dispute '+expKey(d)+' ('+d.reason+')'},A);if(r.error)return r.error;
  d.csx={id:x.id,key:expKey(x),n:r.res.n,amount:ccM(amt)};
  ccLog(d,d.status,'Dispute credit of '+expMoney(amt,d.currency)+' expected on '+expKey(x)+' (resolution '+r.res.n+'); it settles the card spend exception only when a verified credit arrives.',A);
  return '';
}
/* A credit for a transaction already reconciled in a closed statement: the closed reconciliation is never rewritten (8F). */
function ccDspClosedStmt(d){const t=ccTxn(d.txnId);if(!t)return null;const L=(t.stmtLinks||[]).find(function(x){const s=ccStmt(x.stmtId);return s&&s.recon&&RC_CLOSED.indexOf(s.recon.status)>=0;});return L?ccStmt(L.stmtId):null;}
function ccDspSuppNeeded(d){return !!ccDspClosedStmt(d)&&(d.settlement.credits||[]).length>0&&!(d.rsc||[]).length;}
function ccDspRecordSupplement(id,o,A){
  A=A||ccNow();o=o||{};const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  const s=ccDspClosedStmt(d);if(!s)return d.txnKey+' is not in a closed statement reconciliation.';if(!(d.settlement.credits||[]).length)return 'Link the verified credit first.';
  const before=(s.recon.supplements||[]).length;
  const e=ccRecSupplement(s.id,{ref:d.provider?d.provider.caseRef:expKey(d),amount:-ccM(d.settlement.credits.reduce(function(a,c){return a+c.amount;},0)),reason:'Dispute '+expKey(d)+' credit on '+d.txnKey+' ('+d.settlement.credits.map(function(c){return c.key;}).join(', ')+') after the reconciliation closed',evidence:String(o.evidence||'').trim()||(d.outcome?d.outcome.evidence:'')},A);
  if(e)return e;const x=s.recon.supplements[before];d.rsc.push({stmtId:s.id,stmtKey:expKey(s),id:x.id,at:ccStamp(A),by:A.who});
  ccLog(d,d.status,'Supplementary reconciliation correction '+x.id+' recorded on '+expKey(s)+' by '+caN(A.who)+'; the closed reconciliation is unchanged.',A);
  return '';
}
function ccDspWithdraw(id,reason,A,o){
  A=A||ccNow();o=o||{};reason=String(reason||'').trim();const d=ccDspGet(id);if(!d)return 'No such dispute.';
  const h=ccDspHolder(d),via=caVia(A),own=A.who===h||via===h||A.who===d.raisedBy,fin=ccPCan(A,'card.dispute.manage')&&A.who!==h&&via!==h;
  if(!own&&!fin)return 'Only the cardholder, whoever raised it, or Finance withdraws this dispute.';
  if(['Draft','Submitted','Under Internal Review','More Information Required','Awaiting Provider'].indexOf(d.status)<0&&!(fin&&d.status==='Raised with Provider'))
    return expKey(d)+' is '+d.status+': '+(d.status==='Raised with Provider'?'the case is with the provider; Finance withdraws it there and records the withdrawal.':'it can no longer be withdrawn.');
  if(reason.length<5)return 'Say why the dispute is withdrawn.';
  if(d.status==='Raised with Provider'&&!d.demo&&!String(o.evidence||'').trim())return 'The case is with the provider: attach the confirmation from the provider that it was withdrawn there.';
  ccDspHist(d,A,'Withdrawn',reason);d.closed={type:'Withdrawn',by:A.who,actual:via,at:ccStamp(A),reason:reason,evidence:String(o.evidence||'').trim()};
  ccLog(d,'Withdrawn','Withdrawn by '+caN(A.who)+': '+reason+'.',A);
  ccDspNotify(d,ccDspPeople(d),'withdrawn: '+reason,'dsp-withdrawn',A);
  return '';
}
/* Mark as Resolved (product owner, 11 Nov 2026): Finance or a card administrator closes an open dispute as Resolved in one
   click - for example the merchant corrected the charge. Never the cardholder (they resolve their own from My Cards). The
   dispute's log and the transaction's log record who resolved it and when; the cardholder is told. Nothing is credited. */
function ccDspMarkResolved(id,A,text){
  A=A||ccNow();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  const note='Marked resolved by '+caN(A.who)+(String(text||'').trim()?': '+String(text).trim().replace(/[.\s]+$/,''):'');
  ccDspHist(d,A,'Resolved',note);d.closed={type:'Resolved',by:A.who,actual:caVia(A),at:ccStamp(A),reason:note};
  ccLog(d,'Resolved',note+'.',A);
  const t=ccTxn(d.txnId);if(t)ccLog(t,t.status,'Dispute '+expKey(d)+' marked resolved by '+caN(A.who)+'.',A);
  ccDspNotify(d,ccDspPeople(d),'marked resolved.','dsp-resolved',A);
  return '';
}
/* Close: the outcome verified, and in favour only after verified credits settle it (and a closed statement got its correction). */
function ccDspClose(id,note,A){
  A=A||ccNow();note=String(note||'').trim();const d=ccDspGet(id),may=ccDspMayManage(A,d);if(may)return may;
  const o=d.outcome;if(!o||['Verified',CC_DEMO].indexOf(o.verify.status)<0)return 'The provider outcome is not recorded and verified yet: the dispute stays open.';
  if(o.result!=='Resolved Against'&&d.settlement.status!=='Settled')return 'Financial Settlement Pending: '+expMoney(ccM(o.amount-(d.settlement.settled||0)),d.currency)+' is still to be credited. A favourable outcome is not money received; the dispute closes after verified settlement.';
  if(ccDspSuppNeeded(d))return 'The original transaction is in a closed statement reconciliation: record the supplementary correction first.';
  if(note.length<5)return 'Add the closing note.';
  const type=o.result==='Resolved Against'?'Closed – Resolved Against':d.demo?'Closed – '+CC_DEMO:'Closed after verified settlement';
  ccDspHist(d,A,'Closed',type+': '+note);d.closed={type:type,by:A.who,actual:caVia(A),at:ccStamp(A),reason:note};
  ccLog(d,'Closed',type+' by '+caN(A.who)+': '+note+'.',A);
  ccDspNotify(d,ccDspPeople(d),'closed ('+type+').','dsp-closed',A);
  return '';
}
/* What the cardholder sees (FR-CT-20.12): status, action required, outcome; no internal notes, no full provider identifiers, no funding. */
function ccDspEmpView(d){
  const o=d.outcome,ov=o&&['Verified',CC_DEMO].indexOf(o.verify.status)>=0;
  const action=d.status==='Draft'?'Submit the dispute (or discard it).':d.status==='More Information Required'?'Provide the information Finance asked for: '+d.requests[d.requests.length-1].q:DSP_DONE.indexOf(d.status)>=0?'None.':'None for now: Finance is handling it.';
  return {ref:expKey(d),txnKey:d.txnKey,card:ccMask(d.cardRef.last4),merchant:d.merchant,txnDate:d.txnDate,amount:d.amount,currency:d.currency,reason:d.reason,description:d.description,status:d.status,
    provider:d.provider?(d.demo?CC_DEMO:'Case with the provider'+(d.provider.caseRef?' (ref ••••'+String(d.provider.caseRef).slice(-4)+')':'')):'Not raised with the provider',
    outcome:o?(ov?o.result+(o.amount?' – '+expMoney(o.amount,d.currency):''):'Outcome being verified'):'Pending',settlement:d.settlement.status==='Not Applicable'?'—':d.settlement.status+(d.settlement.settled?' ('+expMoney(d.settlement.settled,d.currency)+' credited)':''),
    action:action,demo:d.demo};
}
function ccDspVisible(d){
  if(!d||d.entity!==ccEnt())return false;
  if(['card.dispute.manage','card.dispute.view'].some(ccCan))return true;
  const me=ccEmpOf();return !!me&&me.eid===d.employeeEid;
}
/* Notifications open their dispute (FR-CT-22.07). */
ccHook('ccOpenByKey',function(cid){
  const m=/^DSP-(\d+)$/.exec(String(cid||''));if(!m)return undefined;const d=ccDisputes.find(function(x){return x.key===Number(m[1]);});
  if(d&&typeof ccOpenDisputeUI==='function'){ccOpenDisputeUI(d.id);return true;}return false;
},null);
/* Reconciliation (8F) accountability: a statement credit of a disputed transaction not linked to its dispute. */
ccHook('ccRecDerive',null,function(out,s){
  if(!out)return undefined;
  s.rows.forEach(function(row){const t=row.result&&row.result.txnId?ccTxn(row.result.txnId):null;if(!t||t.direction!=='Credit'||!t.refundOf||!t.refundOf.id)return;
    ccDisputes.filter(function(d){return d.txnId===t.refundOf.id&&['Raised with Provider','Provider Outcome Recorded','Financial Settlement Pending'].indexOf(d.status)>=0&&!(d.settlement.credits||[]).some(function(c){return c.txnId===t.id;});}).forEach(function(d){
      out.acc.push({k:'acc:'+t.id+':dsp:'+d.id,type:RC_ACC.dispute,txnId:t.id,dspId:d.id,amount:ccRecTxnAmt(t),currency:t.billCurrency,state:d.status,text:'Credit '+expKey(t)+' on the statement may settle dispute '+expKey(d)+' ('+d.reason+'): link it to the dispute.'});});});
  return undefined;
});

/* ── Build 8H: the FR-CT-22 notification matrix completed, through the existing in-app notifications ──
   Seven events had no notice of their own: Dispute Raised (to the reviewers), Refund Recorded (to the cardholder),
   Refund Verified, Card Control Exception, Duplicate Transaction Detected, Transaction Mismatch and Reconciliation
   Exception Created. Each notice has its own event key, so one business event notifies once and a different event
   notifies again (FR-CT-22.04/05). Recipients come from permissions and the record, never from named people
   (FR-CT-22.02/03). The cardholder is never told about company funding sources (FR-CT-22.06), and illustrative
   records say so (FR-CT-22.11). Exceptions derived from the records are announced when ADT is opened or refreshed
   (no backend scheduler yet, CCD_SCHED_NOTE). */
function ccTag8H(r){return r&&r.demo?' ('+CC_DEMO+')':'';}
/* Dispute Raised → Card Administrator / Finance (the dispute reviewers, never the cardholder). */
ccHook('ccDspSubmit',null,function(out,id,A){
  if(out)return undefined;const d=ccDsp(id);if(!d)return undefined;
  ccDspNotify(d,ccDspReviewers(d),'dispute raised by '+(d.onBehalf?caN(d.raisedBy)+' for ':'')+d.name+' ('+d.reason+', '+expMoney(d.amount,d.currency)+') awaits internal review'+ccTag8H(d)+'.','dsp-raised',A||ccNow());
  return undefined;
});
/* Refund Recorded → the cardholder (Finance is already told by the verification request). No funding source is named. */
function ccRefundRecordedNotify8H(out,A){
  if(!out||!out.rec)return;const t=out.rec,h=idUserOfEmp(t.employeeEid);A=A||ccNow();
  if(!h||h===A.who||h===caVia(A))return;
  ccNotify([h],t.type+' of '+expMoney(t.amount,t.currency)+' recorded on your card transaction '+t.refundOf.key+' ('+t.merchant+')'+ccTag8H(t)+(t.demo?'. No money moved.':'. It counts once someone independent verifies it.'),t,'refund-recorded');
}
ccHook('ccTxnCreditRecord',null,function(out,origId,d,A){ccRefundRecordedNotify8H(out,A);return undefined;});
ccHook('ccTxnSimulateCredit',null,function(out,origId,d,A){ccRefundRecordedNotify8H(out,A);return undefined;});
/* Refund Verified → the cardholder and the person who recorded it (net spending changed). */
ccHook('ccCreditApply',null,function(out,c,A){
  if(!c||c.demo||!c.refund||!c.refund.applied||(c.verify||{}).status!==CCT_VERIFIED)return undefined;
  A=A||ccNow();const o=c.refundOf&&c.refundOf.id?ccTxn(c.refundOf.id):null;
  ccNotify(ccUniq([idUserOfEmp(c.employeeEid),c.recordedBy]).filter(function(u){return u&&u!==A.who&&u!==caVia(A);}),
    c.type+' '+expKey(c)+' of '+expMoney(c.billAmount,c.billCurrency)+' verified'+(o?' on '+expKey(o)+' ('+o.merchant+'): net card spending is now '+expMoney(ccTxnNetSpend(o),o.billCurrency)+'.':'.'),c,'refund-verified');
  return undefined;
});
/* Statement Closed with Exceptions → also the other reconciliation controllers (the preparers are told already). */
ccHook('ccRecSignoff',null,function(out,id,d,A){
  if(out)return undefined;const s=ccStmt(id);if(!s||!s.recon||s.recon.status!=='Closed with Authorized Exceptions')return undefined;
  A=A||ccNow();const ho=ccStmtHolders(s),done=[A.who,caVia(A)].concat(s.recon.preparers||[]);
  ccNotify(ccPeopleWith('card.reconciliation.signoff',s.entity).filter(function(u){return done.indexOf(u)<0&&ho.indexOf(u)<0;}),
    expKey(s)+': reconciliation closed with authorized exceptions by '+caN(A.who)+' ('+ccRecItems(s).filter(function(i){return i.status===RCX_CARRIED||i.status===RCX_FINPEND;}).length+' carried forward).',s,'rc-closed-exc');
  return undefined;
});
/* Exceptions derived from the records, announced with the reminders when ADT is opened or refreshed. */
ccHook('ccClaimRemindSweep',null,function(out,ent){
  ent=ent||ccEnt();if(typeof notifData==='undefined')return undefined;
  const before=notifData.length,fin=ccPeopleWith('card.transaction.match',ent),cadm=ccUniq(ccPeopleWith('card.control.manage',ent).concat(fin));
  ccTxns.forEach(function(t){
    if(t.entity!==ent)return;const h=idUserOfEmp(t.employeeEid),others=function(L){return L.filter(function(u){return u!==h;});};
    const live=t.direction!=='Credit'&&t.status==='Posted'&&(t.demo||(t.verify||{}).status===CCT_VERIFIED);
    /* Card Control Exception → Card Administrator / Finance */
    if(live&&typeof ccTxnControlEval==='function'){const ce=ccTxnControlEval(t);
      if(ce&&(ce.breaches||[]).length)ccNotify(others(cadm),'Card control exception'+ccTag8H(t)+': '+expKey(t)+' of '+t.name+' ('+t.merchant+', '+expMoney(t.amount,t.currency)+'). '+ce.breaches.join(' '),t,'control-exception');}
    /* Duplicate Transaction Detected → the reviewers (card.transaction.match) */
    if(t.dupReview&&t.dupReview.status==='Open')ccNotify(others(fin),'Possible duplicate'+ccTag8H(t)+': '+expKey(t)+' was kept apart from '+t.dupReview.ofKey+' and needs review.',t,'dup-review');
  });
  /* Transaction Mismatch → authorized Finance */
  ccClaimsOf(ent).forEach(function(r){
    if(CCM_SUBMITTED.indexOf(r.status)<0)return;const h=idUserOfEmp(r.employeeEid);
    ccCardLines(r).forEach(function(l){const i=ccLineMatchInfo(r,l);if(!i||i.status!=='Mismatch Exception')return;
      ccNotify(fin.filter(function(u){return u!==h;}),'Transaction mismatch'+(i.txn?ccTag8H(i.txn):'')+': line "'+l.title+'" of '+expKey(r)+(i.txn?' and '+expKey(i.txn):'')+' – '+(i.category||'mismatch')+'. '+i.text,i.txn||r,'mismatch-'+r.id+'-'+l.id);});
  });
  /* Reconciliation Exception Created → Finance (never a cardholder on the statement) */
  ccStmts.forEach(function(s){
    if(s.entity!==ent||!s.recon)return;const ho=ccStmtHolders(s);
    ccRecItems(s).forEach(function(it){if(RCX_BLOCK.indexOf(it.status)<0||it.live===false)return;
      ccNotify(fin.filter(function(u){return ho.indexOf(u)<0;}),expKey(s)+' reconciliation exception '+it.id+(s.demo?' ('+CC_DEMO+')':'')+': '+it.type+'. '+it.text,s,'rcx-'+it.id);});
  });
  if(out&&typeof out.sent==='number')out.sent+=notifData.length-before;
  return undefined;
});
