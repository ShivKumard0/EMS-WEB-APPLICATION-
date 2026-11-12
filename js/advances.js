/* ══ ADVANCES & IMPREST (FR-AI, Build 5) ═══════════════════════════════════════
   Company money handed out before it is spent, and accounted for afterwards.
   js/advances-ui.js draws it; the approval engine is Build 4's
   (js/expense-approvals.js), which runs advance requests (kind 'advance') and
   imprest funding / replenishment requests (kind 'imprest') beside expense
   claims, with their own RBAC rights and routes.

   THREE STATUSES, NEVER MERGED.
   - Approval: Draft → Awaiting Approval / Follow-Up → Approved / Partially
     Approved / Rejected / Withdrawn, or Cancelled (approved, never issued).
   - Disbursement: Not Initiated → Ready for Disbursement → Processing →
     Partially Disbursed / Disbursed (or Failed / Cancelled instructions).
   - Settlement: Not Started → In Progress → Under Review → Partially
     Settled → Settled → Closed, with Overdue flagged beside it.

   MONEY IS EVENTS. Each advance and imprest fund keeps a ledger of financial
   events - Issuance, Replenishment, Utilization (an approved expense line's
   advance part), Return, Recovery and Reversal - each with an internal ADT
   transaction reference and, where there is one, the external reference.
   Balances are always computed from that ledger, in cents:
     Accountable = Issued − Accepted Utilization − Returns − Recoveries
     Uncommitted = Accountable − Pending allocations (claims still in approval)
     Unissued    = Approved − Issued
   Approval never counts as money; an instruction counts only once verified;
   a correction is a reversal entry, never an edit or a delete. The ledger is
   ADT's control record - it is not a bank or card balance, and nothing here
   moves money or talks to a provider.

   DISBURSEMENT is two steps - Initiate (Processing), then Verify with the
   payment date, reference and evidence - with maker-checker configurable per
   entity (Expenses & Advances → Settings → General). The person an advance is for never
   initiates, verifies, or settles it. */

/* ── Stores and keys ───────────────────────────────────────────────────── */
const advTypes=[],advPolicies=[],advancesData=[],impFunds=[],impRequests=[];
let advNextId=50001,advNextKey=1001,impNextId=60001,impNextKey=2001,irqNextId=70001,irqNextKey=3001;
let advTypeNext=1,advPolNext=1,advTxnNext=1,advDsbNext=1,advRrNext=1,advStlNext=1;
/* FR-AI-09 methods: manual/external bank transfer, plus methods the entity
   configures (Expenses & Advances → Settings → General). Payroll advance or recovery is not
   offered - Payroll does not support those transaction types. A corporate
   card or wallet needs a connected provider (FR-AI-26.03); none is. */
const ADV_BASE_METHOD='Manual/External Bank Transfer';
function advMethods(){return [ADV_BASE_METHOD].concat(advCfg().methods||[]);}
const IMP_REVIEW_FREQ=['Monthly','Quarterly','Custom'];
/* Methods that stay off until the system behind them exists (user decision 2026-11-07). */
const ADV_DISABLED_METHODS=[['Payroll Advance / Payroll Recovery','the Payroll module does not support these transaction types yet'],
  ['Corporate Card / Expense Wallet','no provider integration is connected']];
function advMethodBlocked(m){
  if(/payroll|salary/i.test(m))return '"'+m+'" is not allowed: Payroll Advance and Payroll Recovery stay disabled until '+ADV_DISABLED_METHODS[0][1].replace('the Payroll module does not','Payroll does')+'.';
  if(/card|wallet/i.test(m))return '"'+m+'" is not allowed: card and wallet funding stay disabled until a provider integration is connected.';
  return '';
}
const ADV_APPLIES=['Entity','Department','Designation','Employee'];
const ADV_APPLIES_RANK={Employee:4,Designation:3,Department:2,Entity:1};
const ADV_RESTRICTIONS=['Blocking','Warning','None'];
const ADV_SETTLE_DAYS=30;   // FR-AI-19 default: calendar days after verified issuance

function advCan(code){return typeof emsCan==='function'&&emsCan(code);}
function advPCan(A,code){return caPersonCan(A.who,code);}
function advNow(){return caNow();}
function advEnt(){return idEntity();}
function advM(n){return caMoney2(n);}
function advSum(list,fn){return list.reduce(function(s,x){return s+Math.round((Number(fn(x))||0)*100);},0)/100;}
function advStamp(A){return A.date+' | '+A.time;}
function advType(id){return advTypes.find(function(t){return t.id===Number(id);})||null;}
function advRec(id){return advancesData.find(function(r){return r.id===id;})||null;}
function impFund(id){return impFunds.find(function(f){return f.id===id;})||null;}
function impReq(id){return impRequests.find(function(r){return r.id===id;})||null;}
/* Engine hooks: the records it runs (advances + imprest requests). */
function advEngineRec(id){return advRec(id)||impReq(id);}
function advEngineRecs(){return advancesData.concat(impRequests);}
/* What holds money: an advance, or an imprest fund. */
function advHolder(id){return advRec(id)||impFund(id);}
function advRefLabel(id){const h=advHolder(id);return h?expKey(h):'unknown advance';}
function advLog(h,status,action,A){
  A=A||advNow();h.logs=h.logs||[];
  h.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:status,action:action});
}
function advFinanceTeam(){return caPermHolders('advance.disbursement.manage');}

/* ── Settings (Advance Settings → General), per entity ────────────────── */
const advCfgBook={};
function advCfg(ent){
  ent=ent||advEnt();
  return advCfgBook[ent]||(advCfgBook[ent]={makerChecker:{on:true,typeIds:[],threshold:0},eorEligible:false,reminderDays:3,methods:[],
    exposure:{amount:'',currency:'INR',enforcement:'Blocking'},logs:[]});
}
function advCfgSave(o,A){
  A=A||advNow();
  if(!advPCan(A,'advance.settings.manage'))return caN(A.who)+' cannot change advance settings.';
  const c=advCfg(),th=parseFloat(o.threshold);
  if(o.threshold!==''&&o.threshold!=null&&(isNaN(th)||th<0))return 'The amount threshold must be 0 or more.';
  const rd=parseInt(o.reminderDays,10);
  if(isNaN(rd)||rd<0||rd>30)return 'Reminder days must be 0 to 30.';
  const methods=(o.methods||[]).map(function(m){return String(m).trim();}).filter(function(m,i,a){return m&&a.indexOf(m)===i&&m!==ADV_BASE_METHOD;});
  const off=methods.map(advMethodBlocked).find(Boolean);if(off)return off;
  /* Entity-wide exposure across all advance types (optional). */
  const xo=o.exposure||c.exposure||{},xa=xo.amount===''||xo.amount==null?'':parseFloat(xo.amount);
  if(xa!==''&&(isNaN(xa)||xa<=0))return 'The entity-wide outstanding limit must be more than 0, or left empty.';
  if(xa!==''&&EXP_CURRENCIES.indexOf(xo.currency)<0)return 'Pick the currency of the entity-wide limit.';
  if(xa!==''&&['Warning','Blocking'].indexOf(xo.enforcement)<0)return 'Pick Warning or Blocking for the entity-wide limit.';
  const exposure={amount:xa===''?'':advM(xa),currency:xo.currency||'INR',enforcement:xo.enforcement||'Blocking'};
  const was=JSON.stringify([c.makerChecker,c.eorEligible,c.reminderDays,c.methods,c.exposure]);
  c.makerChecker={on:!!o.mcOn,typeIds:(o.typeIds||[]).map(Number),threshold:isNaN(th)?0:advM(th)};
  c.eorEligible=!!o.eorEligible;c.reminderDays=rd;c.methods=methods;c.exposure=exposure;
  if(was!==JSON.stringify([c.makerChecker,c.eorEligible,c.reminderDays,c.methods,c.exposure]))
    c.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,action:'Maker-checker '+(c.makerChecker.on?'on':'off')
      +(c.makerChecker.on&&c.makerChecker.typeIds.length?' for '+c.makerChecker.typeIds.map(function(i){const t=advType(i);return t?t.name:i;}).join(', '):'')
      +(c.makerChecker.on&&c.makerChecker.threshold?' from '+c.makerChecker.threshold:'')+'; EOR / Global employees '+(c.eorEligible?'eligible':'not eligible')+'; reminder '+rd+' days before due; methods: '+advMethods().join(', ')
      +'; entity-wide outstanding limit: '+(exposure.amount?expMoney(exposure.amount,exposure.currency)+' ('+exposure.enforcement+')':'none')+'.'});
  return '';
}
/* Does maker-checker apply to this funding? */
function advMcApplies(typeId,amount){
  const m=advCfg().makerChecker;
  if(!m.on)return false;
  if(m.typeIds.length&&m.typeIds.indexOf(Number(typeId))<0)return false;
  return !m.threshold||Number(amount)>=m.threshold;
}

/* ── Advance types ─────────────────────────────────────────────────────── */
function advTypeSeed(name,model,cats,wfId,o){
  o=o||{};
  const t={id:advTypeNext++,entity:ID_HOME_ENTITY,name:name,model:model,desc:o.desc||'',cats:cats||[],workflowId:wfId,settleRequired:model==='One-Time',
    settleDays:model==='One-Time'?(o.settleDays||ADV_SETTLE_DAYS):'',replenish:model==='Imprest',status:'Active',createdBy:caU('shaun@testemp.com'),createdAt:'01 Nov 2026 | 10:00:00 AM',logs:[]};
  t.key='AT-'+(100+t.id);
  advTypes.push(t);return t;
}
function advTypesHere(activeOnly){return advTypes.filter(function(t){return t.entity===advEnt()&&(!activeOnly||t.status==='Active');});}
function advTypesUsing(wfId){return advTypesHere().filter(function(t){return t.workflowId===wfId;}).map(function(t){return t.name;}).join(', ')||'Not used by an advance type yet';}
function advTypeSave(d,A){
  A=A||advNow();
  if(!advPCan(A,'advance.settings.manage'))return caN(A.who)+' cannot configure advance types.';
  const name=String(d.name||'').trim();
  if(!name)return 'Advance Type Name is required.';
  if(['One-Time','Imprest'].indexOf(d.model)<0)return 'Pick the advance model.';
  if(advTypesHere().some(function(t){return t.id!==d.id&&t.name.toLowerCase()===name.toLowerCase();}))return 'An advance type with this name already exists.';
  const wf=caWfRec(Number(d.workflowId));
  if(!wf||wf.entity!==advEnt()||caWfKindOf(wf)!==(d.model==='Imprest'?'Imprest':'Advance'))return 'Pick an '+(d.model==='Imprest'?'Imprest':'Advance')+' approval workflow of this entity.';
  let days='';
  if(d.model==='One-Time'){days=parseInt(d.settleDays,10);if(isNaN(days)||days<1||days>365)return 'Default Settlement Duration must be 1 to 365 days.';}
  const cats=(d.cats||[]).filter(function(c){return EXP_CATEGORIES.indexOf(c)>=0;});
  const f={name:name,model:d.model,desc:String(d.desc||'').trim(),cats:cats,workflowId:wf.id,settleRequired:d.model==='One-Time'?d.settleRequired!==false:false,
    settleDays:days,replenish:d.model==='Imprest'?!!d.replenish:false};
  if(d.id!=null){
    const t=advType(d.id);if(!t)return 'No such type.';
    if(t.model!==f.model&&advancesData.concat(impFunds).some(function(x){return x.typeId===t.id;}))return 'The model of a type in use cannot change.';
    Object.assign(t,f);advLog(t,t.status,'Type updated.',A);return '';
  }
  const t=Object.assign({id:advTypeNext++,entity:advEnt(),status:'Active',createdBy:A.who,createdAt:advStamp(A),logs:[]},f);
  t.key='AT-'+(100+t.id);advTypes.push(t);advLog(t,'Active','Advance type created.',A);
  return '';
}
/* Deactivating stops new requests; existing records are untouched (FR-AI-02.06). */
function advTypeToggle(id,A){
  A=A||advNow();
  if(!advPCan(A,'advance.settings.manage'))return caN(A.who)+' cannot change advance types.';
  const t=advType(id);if(!t)return 'No such type.';
  t.status=t.status==='Active'?'Inactive':'Active';
  advLog(t,t.status,t.status==='Active'?'Reactivated.':'Deactivated - no new requests; existing records continue.',A);
  return '';
}

/* ── Advance policies ──────────────────────────────────────────────────── */
function advPolShown(p){
  if(p.status!=='Active')return p.status;
  const t=wbToday();
  if(p.effFrom&&t<p.effFrom)return 'Scheduled';
  if(p.effTo&&t>p.effTo)return 'Expired';
  return 'Active';
}
function advPolInForce(p,iso){return p.status==='Active'&&p.entity===advEnt()&&(!p.effFrom||iso>=p.effFrom)&&(!p.effTo||iso<=p.effTo);}
function advPolScope(p){return p.appliesTo==='Employee'?idEmpName(p.scopeRef):p.appliesTo==='Entity'?'Whole entity':p.scopeRef;}
function advPolSeed(name,typeId,appliesTo,scopeRef,o){
  const p=Object.assign({id:advPolNext++,entity:ID_HOME_ENTITY,name:name,typeId:typeId,appliesTo:appliesTo,scopeRef:scopeRef||'',currency:'INR',
    minAmt:'',maxAmt:0,maxOpen:'',maxOutstanding:'',maxSettleDays:'',restriction:'Warning',partialApproval:true,partialDisbursement:true,requireDoc:false,
    effFrom:'2026-04-01',effTo:'',reason:'',status:'Active',createdBy:caU('shaun@testemp.com'),createdAt:'01 Nov 2026 | 10:05:00 AM',logs:[]},o||{});
  p.key='AP-'+(100+p.id);advPolicies.push(p);return p;
}
function advPolHits(p,e){
  if(p.appliesTo==='Employee')return p.scopeRef===e.eid;
  if(p.appliesTo==='Designation')return p.scopeRef===(e.jobTitle||e.desig||'');
  if(p.appliesTo==='Department')return p.scopeRef===(e.dept||'');
  return true;
}
/* The policy that governs an employee's request: the most specific in force
   (Employee > Designation > Department > Entity). Two at the same level is a
   configuration conflict, never a guess. */
function advPolicyFor(e,typeId,iso){
  const hits=advPolicies.filter(function(p){return p.typeId===Number(typeId)&&advPolInForce(p,iso)&&advPolHits(p,e);});
  if(!hits.length)return {policy:null};
  hits.sort(function(a,b){return ADV_APPLIES_RANK[b.appliesTo]-ADV_APPLIES_RANK[a.appliesTo];});
  const top=hits.filter(function(p){return p.appliesTo===hits[0].appliesTo;});
  if(top.length>1)return {policy:null,conflict:top};
  return {policy:hits[0]};
}
/* Two active policies of the same type, level and scope with overlapping dates. */
function advPolConflicts(p){
  return advPolicies.filter(function(q){return q!==p&&q.id!==p.id&&q.entity===p.entity&&q.status==='Active'&&q.typeId===p.typeId&&q.appliesTo===p.appliesTo
    &&q.scopeRef===p.scopeRef&&wbOverlap(p.effFrom,p.effTo,q.effFrom,q.effTo);});
}
function advPolicySave(d,A,activate){
  A=A||advNow();
  if(!advPCan(A,'advance.policy.manage'))return caN(A.who)+' cannot configure advance policies.';
  const t=advType(d.typeId);
  if(!String(d.name||'').trim())return 'Policy Name is required.';
  if(!t||t.entity!==advEnt())return 'Pick the advance type.';
  if(ADV_APPLIES.indexOf(d.appliesTo)<0)return 'Pick what the policy applies to.';
  if(d.appliesTo!=='Entity'&&!d.scopeRef)return 'Pick the '+d.appliesTo.toLowerCase()+'.';
  if(d.appliesTo==='Employee'&&!String(d.reason||'').trim())return 'An employee-specific exception needs a reason.';
  if(!d.currency)return 'Pick the currency.';
  const mx=parseFloat(d.maxAmt),mn=d.minAmt===''?null:parseFloat(d.minAmt);
  if(!(mx>0))return 'Maximum Advance Amount must be more than 0.';
  if(mn!=null&&(isNaN(mn)||mn<0||mn>mx))return 'Minimum Advance Amount must be between 0 and the maximum.';
  const num=function(v,label){if(v===''||v==null)return '';const n=parseFloat(v);return isNaN(n)||n<=0?{err:label+' must be more than 0.'}:n;};
  const mo=num(d.maxOpen,'Maximum Open Advances'),mt=num(d.maxOutstanding,'Maximum Outstanding Amount'),ms=num(d.maxSettleDays,'Maximum Settlement Duration');
  const bad=[mo,mt,ms].find(function(x){return x&&x.err;});if(bad)return bad.err;
  if(ADV_RESTRICTIONS.indexOf(d.restriction)<0)return 'Pick the outstanding advance restriction.';
  if(!d.effFrom)return 'Effective From is required.';
  if(d.effTo&&d.effTo<d.effFrom)return 'Effective To cannot be before Effective From.';
  const f={name:String(d.name).trim(),typeId:t.id,appliesTo:d.appliesTo,scopeRef:d.appliesTo==='Entity'?'':d.scopeRef,currency:d.currency,
    minAmt:mn==null?'':advM(mn),maxAmt:advM(mx),maxOpen:mo===''?'':Math.round(mo),maxOutstanding:mt===''?'':advM(mt),maxSettleDays:ms===''?'':Math.round(ms),
    restriction:d.restriction,partialApproval:!!d.partialApproval,partialDisbursement:!!d.partialDisbursement,requireDoc:!!d.requireDoc,
    effFrom:d.effFrom,effTo:d.effTo||'',reason:String(d.reason||'').trim()};
  let p;
  if(d.id!=null){p=advPolicies.find(function(x){return x.id===d.id;});if(!p)return 'No such policy.';Object.assign(p,f);advLog(p,p.status,'Policy updated.',A);}
  else{p=Object.assign({id:advPolNext++,entity:advEnt(),status:'Draft',createdBy:A.who,createdAt:advStamp(A),logs:[]},f);p.key='AP-'+(100+p.id);advPolicies.unshift(p);advLog(p,'Draft','Policy created as draft.',A);}
  if(activate&&p.status!=='Active'){const e=advPolicyActivate(p.id,A);if(e)return 'Saved as draft - '+e;}
  return '';
}
function advPolicyActivate(id,A){
  A=A||advNow();
  if(!advPCan(A,'advance.policy.manage'))return caN(A.who)+' cannot activate advance policies.';
  const p=advPolicies.find(function(x){return x.id===id;});if(!p)return 'No such policy.';
  if(p.status==='Active'){p.status='Inactive';advLog(p,'Inactive','Deactivated.',A);return '';}
  const c=advPolConflicts(p);
  if(c.length)return 'Conflicts with '+c.map(function(x){return x.key+' '+x.name;}).join(', ')+' (same type, level, scope and dates).';
  p.status='Active';advLog(p,'Active','Activated.',A);return '';
}

/* ── Eligibility and limits (FR-AI-03 / 05) ────────────────────────────── */
/* An employee's open advances: requested or authorized and not finished. */
function advOpenOf(eid,except){
  return advancesData.filter(function(r){return r.entity===advEnt()&&r.employeeEid===eid&&r.id!==except&&!r.closed
    &&['Awaiting Approval','Follow-Up','Approved','Partially Approved'].indexOf(r.status)>=0;});
}
/* Outstanding (FR-AI-25.11) is the accountable balance: verified issued −
   accepted expenses − verified returns − verified recoveries, net of
   reversals. In flight is what may still become outstanding: a request in
   approval, or an approved amount not yet issued. Limits count both, so
   requests made one after another - or at the same time - cannot pass a
   limit together; approval checks again (advDecisionCheck). */
function advExposureOf(r){
  const b=advBal(r);
  return {outstanding:Math.max(0,b.accountable),inflight:advM(['Awaiting Approval','Follow-Up'].indexOf(r.status)>=0?caTotal(r):b.unissued)};
}
/* ctx = {eid, typeId, amount, currency, iso, excludeId}. errors block; warnings need a justification;
   limits = the errors that are limits (re-checked when a stage approves). */
function advEvaluate(ctx){
  const out={errors:[],warnings:[],limits:[],policy:null,info:{open:0,outstanding:0,inflight:0,unsettled:[],overdue:[],entity:null},requireDoc:false};
  const limit=function(m){out.errors.push(m);out.limits.push(m);};
  const e=idEmp(ctx.eid);
  if(!e){out.errors.push('Pick the employee.');return out;}
  const iso=ctx.iso||wbToday();
  if(e.entityId!==advEnt())out.errors.push(e.name+' is not an employee of '+idEntityName(advEnt())+'.');
  if(!idEmpActive(e))out.errors.push(e.name+' is Inactive; a new advance cannot be requested.');
  else{try{if(typeof empState==='function'&&empState(e).phase==='off')out.errors.push(e.name+' is being offboarded; a new advance cannot be requested.');}catch(x){}}
  if(idEmpKind(e)==='ge'&&!advCfg().eorEligible)out.errors.push('EOR / Global employees are not eligible for advances in this entity (Expenses & Advances → Settings → General).');
  const t=advType(ctx.typeId);
  if(!t||t.entity!==advEnt()){out.errors.push('Pick the advance type.');return out;}
  if(t.status!=='Active')out.errors.push(t.name+' is inactive; pick an active type.');
  if(t.model!=='One-Time')out.errors.push(t.name+' is a revolving imprest type; imprest is managed under Imprest Funds.');
  const pf=advPolicyFor(e,t.id,iso);
  if(pf.conflict){out.errors.push('Advance policies '+pf.conflict.map(function(p){return p.key;}).join(' and ')+' apply at the same level. An administrator must resolve the conflict.');return out;}
  if(!pf.policy){out.errors.push('No active advance policy applies to '+e.name+' for '+t.name+'. Ask an administrator to add one in Expenses & Advances → Settings.');return out;}
  const p=out.policy=pf.policy;out.requireDoc=!!p.requireDoc;
  const conv=function(amt,cur,date){if(cur===p.currency)return advM(amt);const c=epConvert(Number(amt),cur,p.currency,date||iso);return c?advM(c.amount):null;};
  const amt=Number(ctx.amount)||0;
  if(amt>0){
    const a=conv(amt,ctx.currency);
    if(a==null)out.errors.push('No exchange rate from '+ctx.currency+' to '+p.currency+' on '+cdLabel(iso)+'; the limit cannot be checked. Opendhi must add the rate.');
    else{
      if(p.minAmt!==''&&a<Number(p.minAmt))out.errors.push('The minimum advance is '+expMoney(p.minAmt,p.currency)+' ('+p.key+').');
      if(a>Number(p.maxAmt))limit('The maximum advance is '+expMoney(p.maxAmt,p.currency)+' ('+p.key+'); '+expMoney(a,p.currency)+' was requested.');
    }
  }
  /* The policy governs its own advance type: open count and outstanding
     amount are of that type. Open = submitted or approved and not closed
     (never Draft, Rejected, Withdrawn or Cancelled). Unsettled or overdue
     advances of any type trigger the outstanding-advance restriction. */
  const open=advOpenOf(e.eid,ctx.excludeId).filter(function(r){return r.typeId===t.id;});
  out.info.open=open.length;
  if(p.maxOpen!==''&&open.length+1>Number(p.maxOpen))limit(e.name+' already has '+open.length+' open '+t.name+(open.length===1?'':'s')+'; the policy allows '+p.maxOpen+'.');
  let outT=0,flyT=0,unconv=false;const mine=[];
  advancesData.forEach(function(r){
    if(r.entity!==advEnt()||r.employeeEid!==e.eid||r.id===ctx.excludeId||r.closed)return;
    const x=advExposureOf(r);
    if(x.outstanding>0){out.info.unsettled.push(r);if(advIsOverdue(r))out.info.overdue.push(r);}
    if(x.outstanding+x.inflight>0)mine.push({r:r,x:x});
    if(r.typeId!==t.id)return;
    const o1=conv(x.outstanding,r.currency),f1=conv(x.inflight,r.currency);
    if(o1==null||f1==null)unconv=true;else{outT+=o1;flyT+=f1;}
  });
  out.info.outstanding=advM(outT);out.info.inflight=advM(flyT);
  const req=conv(amt,ctx.currency)||0;
  if(p.maxOutstanding!==''){
    if(unconv)limit('An open '+t.name+' is in another currency with no exchange rate; the outstanding limit cannot be checked. Opendhi must add the rate.');
    else if(outT+flyT+req>Number(p.maxOutstanding)+0.001)limit(t.name+'s would total '+expMoney(advM(outT+flyT+req),p.currency)+' (outstanding '+expMoney(advM(outT),p.currency)
      +' + in approval or approved and not issued '+expMoney(advM(flyT),p.currency)+' + this request '+expMoney(req,p.currency)+'); '+p.key+' allows '+expMoney(p.maxOutstanding,p.currency)+'.');
  }
  /* Entity-wide exposure across every advance type (Expenses & Advances → Settings → General). */
  const X=advCfg().exposure;
  if(X&&Number(X.amount)>0){
    const cv=function(a,cur){if(cur===X.currency)return advM(a);const c=epConvert(Number(a),cur,X.currency,iso);return c?advM(c.amount):null;};
    let o2=0,f2=0,bad=false;
    mine.forEach(function(m){const a=cv(m.x.outstanding,m.r.currency),b=cv(m.x.inflight,m.r.currency);if(a==null||b==null)bad=true;else{o2+=a;f2+=b;}});
    const q2=amt>0?cv(amt,ctx.currency):0;if(q2==null)bad=true;
    out.info.entity={outstanding:advM(o2),inflight:advM(f2),limit:Number(X.amount),currency:X.currency,enforcement:X.enforcement};
    let msg='';
    if(bad)msg='An advance is in a currency with no exchange rate to '+X.currency+'; the entity-wide outstanding limit cannot be checked. Opendhi must add the rate.';
    else if(o2+f2+q2>Number(X.amount)+0.001)msg=e.name+'\'s advances of all types would total '+expMoney(advM(o2+f2+q2),X.currency)+' (outstanding '+expMoney(advM(o2),X.currency)
      +' + in approval or approved and not issued '+expMoney(advM(f2),X.currency)+' + this request '+expMoney(q2,X.currency)+'); the entity-wide limit is '+expMoney(X.amount,X.currency)+'.';
    if(msg){if(X.enforcement==='Blocking'||bad)limit(msg);else out.warnings.push(msg+' Give a justification to continue.');}
  }
  const un=out.info.unsettled,od=out.info.overdue;
  if(un.length&&p.restriction!=='None'){
    const what=(od.length?od.length+' overdue':un.length+' unsettled')+' advance'+((od.length||un.length)===1?'':'s')+' ('+(od.length?od:un).map(expKey).join(', ')+')';
    if(p.restriction==='Blocking')out.errors.push(e.name+' has '+what+'. The policy blocks new advances until '+(od.length===1||un.length===1?'it is':'they are')+' settled.');
    else out.warnings.push(e.name+' has '+what+'. Give a justification to continue.');
  }
  return out;
}
/* The policy check stored with the request at submission (what the approver sees). */
function advEvalOf(r){return advEvaluate({eid:r.employeeEid,typeId:r.typeId,amount:caTotal(r),currency:r.currency,iso:wbToday(),excludeId:r.id});}
function advPolicySig(r){
  if(r.kind==='imprest')return [r.requestType,caTotal(r)].join('|');
  const ev=advEvalOf(r);return [(ev.policy||{}).key||'',ev.errors.length,ev.warnings.length].join('|');
}
/* At every approving decision on an advance: the limits again, at the amount
   being approved, with everything else in flight counted. */
function advDecisionCheck(r,items){
  if(!r||r.kind!=='advance')return '';
  const ok=(items||[]).filter(function(it){return it.decision!=='Rejected'&&Number(it.amount)>0;});
  if(!ok.length)return '';
  const amt=advSum(ok,function(it){return it.amount;});
  const ev=advEvaluate({eid:r.employeeEid,typeId:r.typeId,amount:amt,currency:r.currency,iso:wbToday(),excludeId:r.id});
  return ev.limits.length?'Approving '+expMoney(amt,r.currency)+' would break a limit: '+ev.limits[0]+' Approve a lower amount, or reject.':'';
}
function advAllowsPartial(r){
  if(r.kind!=='advance')return true;
  const p=r.policyEval&&advPolicies.find(function(x){return x.key===r.policyEval.policyKey;});
  return !p||p.partialApproval!==false;
}

/* ── Routes and engine hooks ───────────────────────────────────────────── */
/* An advance takes its type's route; an imprest request takes its fund's (or
   the imprest type's). Only an active route of the right kind counts. */
function advWorkflowOf(r){
  if(r.kind==='imprest'){const f=impFund(r.fundId),t=f?advType(f.typeId):null;return caWfRec(f&&f.workflowId||(t&&t.workflowId));}
  const t=advType(r.typeId);return t?caWfRec(t.workflowId):null;
}
function advRoute(r,iso){
  iso=iso||wbToday();
  const w=advWorkflowOf(r),kind=r.kind==='imprest'?'Imprest':'Advance';
  if(!w)return {error:'No '+kind.toLowerCase()+' approval route is set for this '+(r.kind==='imprest'?'fund':'advance type')+' (Company Settings → Workflow).'};
  if(caWfKindOf(w)!==kind)return {error:caWfKey(w)+' is not an '+kind+' route.'};
  if(!caWfInForce(w,iso))return {error:caWfKey(w)+' '+w.name+' is not active on '+cdLabel(iso)+'. Ask an administrator to activate it or set another route.'};
  return {wf:w};
}
/* Everything that must hold before a request enters approval. */
function advPreflight(r,o){
  o=o||{};
  if(!r.lines.length||!(caTotal(r)>0))return {error:'The amount must be more than 0.'};
  if(r.kind==='advance'){
    const need=[['title','Advance Title'],['purpose','Business Purpose'],['requiredBy','Required By Date'],['currency','Currency']];
    for(let i=0;i<need.length;i++){if(!String(r[need[i][0]]||'').trim())return {error:need[i][1]+' is required.'};}
    if(r.periodFrom&&r.periodTo&&r.periodTo<r.periodFrom)return {error:'Expense Period To cannot be before Expense Period From.'};
    const ev=advEvalOf(r);
    if(ev.errors.length)return {error:ev.errors[0],policy:true};
    if(ev.warnings.length&&!String(r.just||'').trim())return {error:ev.warnings[0],policy:true,needJust:true};
    if(ev.requireDoc&&!r.proof)return {error:'The policy requires a supporting document.'};
  }else{
    const f=impFund(r.fundId);
    if(!f||f.entity!==advEnt())return {error:'No such imprest fund in this entity.'};
    if(!idEmpActive(idEmp(f.custodianEid)))return {error:'The custodian is not an active employee.'};
    if(r.requestType==='Initial Funding'&&f.status!=='Draft')return {error:f.key+' is already funded.'};
    if(r.requestType==='Replenishment'){
      if(impLapsed(f))return {error:f.key+'\'s custodian is no longer authorized; reassign the custodian or reconcile the fund first.'};
      if(f.status!=='Active')return {error:f.key+' is '+f.status+'; it cannot be replenished.'};
      if(!f.replenish)return {error:'Replenishment is not allowed for '+f.key+'.'};
      const room=impRoom(f,'request',r.id);
      if(caTotal(r)>room+0.001)return {error:'A top-up of '+expMoney(caTotal(r),f.currency)+' would take '+f.key+' above its float of '+expMoney(f.float,f.currency)+' (room '+expMoney(room,f.currency)+').'};
      const bad=(r.sourceLines||[]).find(function(s){return impLineTaken(f,s,r.id);});
      if(bad)return {error:'An expense in this request is already being replenished by another request.'};
    }
  }
  const rt=advRoute(r,o.iso);
  if(rt.error)return {error:rt.error,route:true};
  const defs=caActiveDefs(rt.wf);
  if(!defs.length)return {error:caWfKey(rt.wf)+' has no active stage.',route:true};
  const res=defs.map(function(d){return caResolve(d,r);});
  const fail=res.find(function(x){return x.error;});
  if(fail)return {error:'Approval cannot start - '+fail.error+' Ask an administrator to fix the route or reassign.',route:true};
  return {wf:rt.wf,resolved:res};
}
function advOnSubmit(r,A){
  if(r.kind!=='advance')return;
  const ev=advEvalOf(r);
  r.policyEval={at:advStamp(A),policyKey:ev.policy?ev.policy.key:'',policyName:ev.policy?ev.policy.name:'',
    results:[{result:ev.errors.length?'Blocked':ev.warnings.length?'Warning':'Within Limit'}],warnings:ev.warnings.slice(),
    info:{open:ev.info.open,outstanding:ev.info.outstanding,unsettled:ev.info.unsettled.map(expKey),overdue:ev.info.overdue.map(expKey)},just:r.just||''};
}
/* Final approval: a funding authorization - never money (PR-06). */
function advOnFinal(r,A){
  if(r.status==='Rejected'){if(r.kind==='imprest')advLog(impFund(r.fundId),impFund(r.fundId).status,r.requestType+' '+expKey(r)+' rejected.',A);return;}
  r.disb={status:'Ready for Disbursement',instructions:[]};
  caNotify(advFinanceTeam().filter(function(u){return !caIsClaimant(r,u);}),expKey(r)+' is approved for '+expMoney(caApprovedTotal(r),r.currency)+' - ready for disbursement',r);
  if(r.kind==='imprest'){
    const f=impFund(r.fundId);
    if(r.requestType==='Initial Funding'){f.status='Active';f.activatedOn=A.iso;}
    advLog(f,f.status,r.requestType+' '+expKey(r)+' approved for '+expMoney(caApprovedTotal(r),r.currency)+'. Nothing is issued until the disbursement is verified.',A);
  }
}

/* ── The ledger and the balances ───────────────────────────────────────── */
function advTxn(h,type,amount,o,A){
  h.ledger=h.ledger||[];
  const e=Object.assign({txn:'ADT-TXN-'+String(advTxnNext++).padStart(6,'0'),type:type,amount:advM(amount),currency:h.currency,date:A.iso,at:advStamp(A),by:A.who},o||{});
  h.ledger.push(e);return e;
}
/* A type's total less what was reversed of it. */
function advSumType(h,type){
  const L=h.ledger||[];
  return advM(advSum(L.filter(function(e){return e.type===type;}),function(e){return e.amount;})
    -advSum(L.filter(function(e){return e.type==='Reversal'&&e.ofType===type;}),function(e){return e.amount;}));
}
/* An approved expense line's advance part, in the holder's currency (the
   rate snapshot stored with the line when currencies differ). */
function advLineAmt(l,claimCur,h){
  const a=caCeilAdv(l);
  if(!(a>0))return 0;
  if(claimCur===h.currency)return advM(a);
  return l.advFx&&l.advFx.rate?advM(a*l.advFx.rate):0;
}
/* Claims in approval that draw on this holder. */
function advPendingLines(h){
  const out=[];
  expensesData.forEach(function(c){
    if(c.entity!==h.entity||['Awaiting Approval','Follow-Up'].indexOf(c.status)<0)return;
    c.lines.forEach(function(l){if(l.advanceId===h.id&&l.status!=='Rejected'){const a=advLineAmt(l,c.currency,h);if(a>0)out.push({c:c,l:l,amount:a});}});
  });
  return out;
}
function advPendingAlloc(h,exceptClaim){return advSum(advPendingLines(h).filter(function(x){return x.c.id!==exceptClaim;}),function(x){return x.amount;});}
function advAuthorized(r){return advM(caApprovedTotal(r)-(r.cancelled?r.cancelled.amount:0));}
function advProcessing(r){return advSum((r.disb&&r.disb.instructions||[]).filter(function(i){return i.status==='Processing';}),function(i){return i.amount;});}
/* Returns pending verification and recovery obligations not yet collected
   reserve the balance, so nothing is returned, recovered or spent twice. */
const ADV_REC_OPEN=['Pending Approval','Approved','Partially Collected'];
function advRecCollected(x){return advSum((x.collections||[]).filter(function(c){return !c.reversed;}),function(c){return c.amount;});}
function advRecUnpaid(x){return Math.max(0,advM(x.amount-advRecCollected(x)));}
function advRrOpen(h,exceptKey){
  return advSum((h.returns||[]).filter(function(x){return x.key!==exceptKey&&(x.type==='Return'?x.status==='Pending':ADV_REC_OPEN.indexOf(x.status)>=0);}),
    function(x){return x.type==='Return'?x.amount:advRecUnpaid(x);});
}
function advRecoveryDue(h){return advSum((h.returns||[]).filter(function(x){return x.type==='Recovery'&&['Approved','Partially Collected'].indexOf(x.status)>=0;}),advRecUnpaid);}
function advBal(h){
  const isFund=h.kind==='fund';
  const issued=advM(advSumType(h,'Issuance')+advSumType(h,'Replenishment'));
  const accepted=advSumType(h,'Utilization'),returns=advSumType(h,'Return'),recoveries=advSumType(h,'Recovery');
  const pending=advPendingAlloc(h);
  const accountable=advM(issued-accepted-returns-recoveries);
  const approved=isFund?Number(h.float):(['Approved','Partially Approved'].indexOf(h.status)>=0?advAuthorized(h):0);
  const obligations=advRrOpen(h);
  return {approved:approved,issued:issued,accepted:accepted,pending:pending,returns:returns,recoveries:recoveries,accountable:accountable,
    uncommitted:advM(accountable-pending),obligations:obligations,available:advM(accountable-pending-obligations),recoveryDue:advRecoveryDue(h),
    unissued:isFund?0:Math.max(0,advM(approved-issued)),processing:isFund?0:advProcessing(h)};
}
function advIsOverdue(h){return !!(h.dueOn&&!h.closed&&wbToday()>h.dueOn&&advBal(h).accountable>0);}
function advSettleStatus(h){
  if(h.closed)return 'Closed';
  const b=advBal(h);
  const live=(h.returns||[]).some(function(x){return x.status==='Pending'||x.status==='Pending Approval';});
  if(b.issued<=0&&!b.accepted)return 'Not Started';
  if(b.pending>0||live)return 'Under Review';
  if(b.accountable<=0)return 'Settled';
  if(b.accepted+b.returns+b.recoveries>0)return 'Partially Settled';
  return 'In Progress';
}
function advDisbStatus(r){return r.disb?r.disb.status:(r.status==='Cancelled'?'Cancelled':'Not Initiated');}

/* ── Funding expense lines (FR-AI-11 / 12) ─────────────────────────────── */
/* The advances and imprest funds an employee may charge a line to: issued,
   not closed, with money not yet accounted for or reserved. ctx = expLineCtx. */
function advFundingSources(ctx){
  if(!ctx||!ctx.eid)return [];
  const out=[];
  const add=function(h,title){
    const own=advOwnPending(h,ctx);
    const avail=advM(advBal(h).available+own);
    out.push({ref:h.id,key:expKey(h),label:expKey(h)+' · '+title+' · '+expMoney(avail,h.currency)+' available',available:avail,availText:expMoney(avail,h.currency),holder:h});
  };
  advancesData.forEach(function(r){
    if(r.entity!==advEnt()||r.employeeEid!==ctx.eid||r.closed||['Approved','Partially Approved'].indexOf(r.status)<0)return;
    const t=advType(r.typeId);if(t&&t.cats.length&&ctx.category&&t.cats.indexOf(ctx.category)<0)return;
    const b=advBal(r);if(b.issued<=0)return;
    add(r,r.title);
  });
  impFunds.forEach(function(f){
    if(f.entity!==advEnt()||f.custodianEid!==ctx.eid||['Active','On Hold'].indexOf(f.status)<0||impLapsed(f))return;
    if(f.cats.length&&ctx.category&&f.cats.indexOf(ctx.category)<0)return;
    if(advBal(f).issued<=0)return;
    add(f,f.name);
  });
  return out.filter(function(x){return x.available>0||(ctx.lineId!=null&&advOwnPending(x.holder,ctx)>0);});
}
/* What this claim already reserves on a holder (so editing a line does not count it twice). */
function advOwnPending(h,ctx){return ctx&&ctx.claimId!=null?advSum(advPendingLines(h).filter(function(x){return x.c.id===ctx.claimId;}),function(x){return x.amount;}):0;}
/* The rate snapshot a line keeps when the claim and the advance differ in currency. */
function advLineFx(d,ctx){
  const h=advHolder(d.advanceId);if(!h||!ctx||ctx.currency===h.currency)return null;
  const c=epConvert(1,ctx.currency,h.currency,d.start||wbToday());
  return c?{from:ctx.currency,to:h.currency,rate:c.rate,date:c.date||d.start}:null;
}
function advLineCheck(d,ctx){
  if(!d.advanceId)return 'Pick the Advance Reference.';
  const h=advHolder(d.advanceId);
  if(!h||h.entity!==advEnt())return 'The advance is not in this entity.';
  const owner=h.kind==='fund'?h.custodianEid:h.employeeEid;
  if(!ctx||owner!==ctx.eid)return expKey(h)+' belongs to someone else; an expense can only use the claimant\'s own advance.';
  if(h.closed||h.status==='Closed'||h.status==='Closing')return expKey(h)+' is closed to new expenses.';
  if(h.kind==='fund'&&impLapsed(h))return expKey(h)+'\'s custodian is no longer authorized; no new expenses can be charged to it until an authorized custodian is assigned.';
  const a=parseFloat(d.advAmount),amt=parseFloat(d.amount)||0;
  if(!(a>0))return 'Enter the Advance-Funded Amount.';
  if(a>amt+0.001)return 'The Advance-Funded Amount cannot exceed the line amount ('+expMoney(amt,ctx.currency)+').';
  let inHolder=a;
  if(ctx.currency!==h.currency){const c=epConvert(a,ctx.currency,h.currency,d.start||wbToday());if(!c)return 'No exchange rate from '+ctx.currency+' to '+h.currency+' on '+cdLabel(d.start||wbToday())+'; the advance amount cannot be checked.';inHolder=advM(c.amount);}
  const avail=advM(advBal(h).available+advOwnPending(h,ctx));
  if(inHolder>avail+0.001)return expKey(h)+' has only '+expMoney(avail,h.currency)+' available; '+expMoney(inHolder,h.currency)+' was entered.';
  return '';
}
/* At submission (and resubmission): every funded line still fits, together,
   in what each advance has left - so one portion never settles two advances
   and no advance is used twice over. */
function advCheckClaimFunding(r){
  if(caKind(r)!=='expense')return '';
  const ctx={eid:r.employeeEid,currency:r.currency,category:r.category,claimId:r.id};
  const per={};
  for(let i=0;i<r.lines.length;i++){
    const l=r.lines[i];
    if(l.paidBy!=='Company Advance'||l.status==='Rejected'||l.legacyNoPaidBy)continue;
    if(!l.advanceId)return '"'+l.title+'": pick the advance that paid for it (Advance Reference).';
    const e=advLineCheck({advanceId:l.advanceId,advAmount:caCeilAdv(l)||l.advAmount,amount:l.amount,start:l.start},ctx);
    if(e)return '"'+l.title+'": '+e;
    const h=advHolder(l.advanceId);
    per[h.id]=(per[h.id]||0)+(ctx.currency===h.currency?Number(caCeilAdv(l)):advM(Number(caCeilAdv(l))*((advLineFx(l,ctx)||{}).rate||0)));
  }
  const ids=Object.keys(per);
  for(let j=0;j<ids.length;j++){
    const h=advHolder(Number(ids[j]));
    const avail=advM(advBal(h).available+advOwnPending(h,ctx));
    if(per[ids[j]]>avail+0.001)return 'Lines charged to '+expKey(h)+' total '+expMoney(per[ids[j]],h.currency)+'; only '+expMoney(avail,h.currency)+' is available.';
  }
  return '';
}
/* Final approval of a claim: each line's approved advance part becomes
   accepted utilization on its advance - once, linked to the expense line. */
function advOnClaimFinal(r,A){
  r.lines.forEach(function(l){
    if(!caIsFunded(l)||r.status==='Rejected')return;
    const h=advHolder(l.advanceId);if(!h)return;
    if((h.ledger||[]).some(function(e){return e.type==='Utilization'&&e.claimId===r.id&&e.lineId===l.id;}))return;   // idempotent
    const amt=advLineAmt(l,r.currency,h);if(!(amt>0))return;
    advTxn(h,'Utilization',amt,{claimId:r.id,claimKey:expKey(r),lineId:l.id,lineTitle:l.title,ref:expKey(r)+'/'+l.id,
      note:'Approved '+expMoney(l.approvedAdv,r.currency)+' of '+expMoney(l.advAmount,r.currency)+' advance-funded'},A);
    advLog(h,advSettleStatus(h),'Accepted utilization '+expMoney(amt,h.currency)+' from '+expKey(r)+' "'+l.title+'".',A);
  });
}

/* ── Advance requests (FR-AI-04 / 05 / 08) ─────────────────────────────── */
function advNewRecord(d,A){
  const e=idEmp(d.eid),t=advType(d.typeId);
  const r={id:advNextId++,key:advNextKey++,prefix:'ADV',kind:'advance',entity:advEnt(),claimFor:d.claimFor||'Self',employeeEid:d.eid,name:e?e.name:'',
    empId:e?e.empId:'',email:e?e.email||'':'',typeId:t?t.id:null,category:t?t.name:'',title:String(d.title||'').trim(),purpose:String(d.purpose||'').trim(),
    currency:d.currency||'INR',requiredBy:d.requiredBy||'',periodFrom:d.periodFrom||'',periodTo:d.periodTo||'',costCenter:String(d.costCenter||'').trim(),
    project:String(d.project||'').trim(),notes:String(d.notes||'').trim(),proof:d.proof||'',just:String(d.just||'').trim(),status:'Draft',
    appliedOn:'',createdBy:A.who,createdAt:advStamp(A),migrated:true,idMigrated:true,ledger:[],returns:[],extensions:[],
    lines:[{id:1,title:'Advance',amount:advM(parseFloat(d.amount)||0),subCat:t?t.name:'',start:d.requiredBy||'',end:d.periodTo||d.requiredBy||'',status:'Pending',approved:null,proof:d.proof||''}]};
  r.logs=[{date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:'Draft',action:'Advance request drafted: '+expMoney(caTotal(r),r.currency)+'.'}];
  return r;
}
function advCheckDraft(d,A){
  if(!d.eid)return 'Pick the employee.';
  const me=idEmpOfUser(A.who);
  const self=!!me&&me.eid===d.eid;
  if(!self&&!advPCan(A,'advance.create.others'))return caN(A.who)+' cannot request an advance for another employee.';
  if(self&&!advPCan(A,'advance.create'))return caN(A.who)+' cannot request advances.';
  if(!d.typeId)return 'Pick the advance type.';
  if(!String(d.title||'').trim())return 'Advance Title is required.';
  if(!(parseFloat(d.amount)>0))return 'Requested Amount must be more than 0.';
  return '';
}
/* Save as draft, or submit. Drafts reserve and issue nothing (FR-AI-04.09). */
function advCreate(d,submit,A){
  A=A||advNow();
  const err=advCheckDraft(d,A);if(err)return {error:err};
  const r=advNewRecord(d,A);
  let pre=null;
  if(submit){pre=advPreflight(r);if(pre.error){advNextId--;advNextKey--;return {error:pre.error,needJust:pre.needJust};}}
  advancesData.unshift(r);
  if(submit)caStart(r,pre,A);
  return {rec:r};
}
/* Edit a draft, or correct a request in Follow-Up (then Resubmit decides minor vs material). */
function advCanEdit(r){
  if(!r||r.kind!=='advance')return false;
  if(r.status==='Draft')return (caIsClaimant(r)||r.createdBy===caMe())&&caCan('advance.edit')||caCan('advance.create.others');
  if(r.status==='Follow-Up')return caCanRespond(r);
  return false;
}
function advUpdate(id,d,A){
  A=A||advNow();
  const r=advRec(id);if(!r)return 'No such advance.';
  if(!advCanEdit(r))return 'This advance cannot be edited now ('+r.status+').';
  const err=advCheckDraft(Object.assign({eid:r.employeeEid},d),A);if(err)return err;
  const t=advType(d.typeId);
  Object.assign(r,{typeId:t.id,category:t.name,title:String(d.title).trim(),purpose:String(d.purpose||'').trim(),currency:d.currency||r.currency,
    requiredBy:d.requiredBy||'',periodFrom:d.periodFrom||'',periodTo:d.periodTo||'',costCenter:String(d.costCenter||'').trim(),project:String(d.project||'').trim(),
    notes:String(d.notes||'').trim(),proof:d.proof||r.proof,just:String(d.just||'').trim()});
  Object.assign(r.lines[0],{amount:advM(parseFloat(d.amount)),subCat:t.name,start:r.requiredBy,end:r.periodTo||r.requiredBy,proof:r.proof});
  advLog(r,r.status,'Request edited: '+expMoney(caTotal(r),r.currency)+', '+t.name+'.',A);
  return '';
}
function advSubmit(id,A){
  A=A||advNow();
  const r=advEngineRec(id);if(!r)return 'No such request.';
  if(r.status!=='Draft')return 'Only a draft is submitted; this one is '+r.status+'.';   // idempotent: a second submit does nothing
  /* The actor's own rights, not whoever is signed in. */
  const own=caIsClaimant(r,A.who)||r.createdBy===A.who;
  if(!(own&&advPCan(A,caPk(r,'submit')))&&!advPCan(A,caPk(r,'others')))return caN(A.who)+' cannot submit this request.';
  const pre=advPreflight(r);if(pre.error)return pre.error;
  return caStart(r,pre,A)?'':'This request already has an approval in progress.';
}
/* Cancel what was approved but never issued (FR-AI-08.10). */
function advCancelAuth(id,reason,A){
  A=A||advNow();
  const r=advEngineRec(id);if(!r)return 'No such request.';
  if(!advPCan(A,'advance.cancel'))return caN(A.who)+' cannot cancel approved advances.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason for cancelling.';
  if(['Approved','Partially Approved'].indexOf(r.status)<0)return 'Only an approved request can be cancelled; this one is '+r.status+'.';
  if(advProcessing(r)>0)return 'A disbursement is still Processing; verify, fail or cancel it first.';
  const issued=r.kind==='imprest'?advReqIssued(r):advBal(r).issued;
  const left=advM(advAuthorized(r)-issued);
  if(left<=0)return 'Everything approved has been issued; nothing is left to cancel. Use returns or recoveries instead.';
  r.cancelled={amount:advM((r.cancelled?r.cancelled.amount:0)+left),by:A.who,at:advStamp(A),reason:reason};
  if(issued<=0){r.status='Cancelled';r.disb.status='Cancelled';}
  else r.disb.status='Disbursed';
  advLog(r,r.status,'Unissued authorization of '+expMoney(left,r.currency)+' cancelled by '+caN(A.who)+': '+reason,A);
  caNotify(caClaimants(r),expKey(r)+': '+expMoney(left,r.currency)+' of the approved advance was cancelled',r);
  return '';
}

/* ── Disbursement: initiate → verify (FR-AI-09 / 10) ─────────────────────── */
/* What an instruction funds: the advance itself, or the imprest fund. */
function advFundsHolder(r){return r.kind==='imprest'?impFund(r.fundId):r;}
function advReqIssued(r){return advSum((r.disb&&r.disb.instructions||[]).filter(function(i){return i.status==='Verified';}),function(i){return i.verify.amount-(i.reversed?i.reversed.amount:0);});}
function advDisbRefresh(r){
  if(!r.disb)return;
  const issued=advReqIssued(r),auth=advAuthorized(r),proc=advProcessing(r);
  if(proc>0)r.disb.status='Processing';
  else if(issued>0)r.disb.status=issued>=auth-0.001?'Disbursed':'Partially Disbursed';
  else{const last=r.disb.instructions[r.disb.instructions.length-1];r.disb.status=last&&(last.status==='Failed'||last.status==='Cancelled')?last.status:r.status==='Cancelled'?'Cancelled':'Ready for Disbursement';}
}
function advTypeIdOf(r){return r.kind==='imprest'?(impFund(r.fundId)||{}).typeId:r.typeId;}
function advAllowsPartialDisb(r){
  if(r.kind!=='advance')return true;
  const p=r.policyEval&&advPolicies.find(function(x){return x.key===r.policyEval.policyKey;});
  return !p||p.partialDisbursement!==false;
}
/* Is there a verifier other than the initiator and the beneficiary? */
function advIndependentVerifiers(r,initiator){
  return caPermHolders('advance.disbursement.verify').filter(function(u){return u!==initiator&&!caIsClaimant(r,u);});
}
function advDisbInitiate(id,o,A){
  A=A||advNow();o=o||{};
  const r=advEngineRec(id);if(!r)return 'No such request.';
  if(!advPCan(A,'advance.disbursement.manage'))return caN(A.who)+' cannot initiate disbursements.';
  if(caIsClaimant(r,A.who))return 'Separation of duties: '+caN(A.who)+' is who the funds are for.';
  if(['Approved','Partially Approved'].indexOf(r.status)<0||!r.disb)return 'Only a finally approved request can be disbursed; this one is '+r.status+'.';
  const h=advFundsHolder(r);
  if(r.kind==='imprest'&&['Active'].indexOf(h.status)<0)return h.key+' is '+h.status+'; no further funding is issued.';
  if(r.kind==='imprest'&&impLapsed(h))return h.key+'\'s custodian is no longer authorized; assign an authorized custodian before issuing funds.';
  if(h.closed)return expKey(h)+' is closed.';
  const left=advM(advAuthorized(r)-advReqIssued(r)-advProcessing(r));
  const amt=advM(parseFloat(o.amount));
  if(!(amt>0))return 'Enter the disbursement amount.';
  if(advMethodBlocked(String(o.method||'')))return advMethodBlocked(String(o.method));
  if(r.kind==='imprest'){const room=impRoom(h,'issue',null);if(amt>room+0.001)return 'Issuing '+expMoney(amt,h.currency)+' would take '+h.key+' above its float of '+expMoney(h.float,h.currency)+' (room '+expMoney(room,h.currency)+').';}
  if(amt>left+0.001)return 'Only '+expMoney(left,r.currency)+' of the approved amount is left to disburse.';
  if(amt<left-0.001&&!advAllowsPartialDisb(r))return 'The advance policy does not allow partial disbursement; disburse '+expMoney(left,r.currency)+'.';
  if(advMethods().indexOf(o.method)<0)return 'Pick a disbursement method configured for this entity.';
  const i={id:advDsbNext++,amount:amt,method:o.method,account:String(o.account||'').trim(),remarks:String(o.remarks||'').trim(),status:'Processing',
    initiatedBy:A.who,initiatedAt:advStamp(A),mc:advMcApplies(advTypeIdOf(r),amt)};
  i.key='DSB-'+(5000+i.id);
  r.disb.instructions.push(i);advDisbRefresh(r);
  const indep=advIndependentVerifiers(r,A.who);
  i.mcException=i.mc&&!indep.length;
  advLog(r,r.status,'Disbursement '+i.key+' of '+expMoney(amt,r.currency)+' initiated by '+caN(A.who)+' ('+i.method+'). Processing - nothing is issued until verified.'
    +(i.mc?' Maker-checker applies: another authorised user must verify.':'')+(i.mcException?' CONFIGURATION EXCEPTION: no independent verifier holds advance.disbursement.verify.':''),A);
  if(i.mc)caNotify(indep,expKey(r)+': disbursement '+i.key+' needs verification',r);
  return '';
}
/* Verify actual payment - the only step that issues funds. */
function advDisbVerify(id,key,o,A){
  A=A||advNow();o=o||{};
  const r=advEngineRec(id);if(!r)return 'No such request.';
  const i=(r.disb&&r.disb.instructions||[]).find(function(x){return x.key===key;});
  if(!i)return 'No such disbursement.';
  if(i.status!=='Processing')return i.key+' is '+i.status+'; it cannot be verified again.';   // idempotent
  if(!advPCan(A,'advance.disbursement.verify'))return caN(A.who)+' cannot verify disbursements.';
  if(caIsClaimant(r,A.who))return 'Separation of duties: '+caN(A.who)+' is who the funds are for.';
  if(i.mc&&i.initiatedBy===A.who)return 'Maker-checker: '+caN(A.who)+' initiated '+i.key+'; another authorised user must verify it.';
  const amt=advM(parseFloat(o.amount));
  if(!(amt>0)||amt>i.amount+0.001)return 'The verified amount must be more than 0 and no more than the '+expMoney(i.amount,r.currency)+' initiated.';
  if(!o.date||o.date>wbToday())return 'Enter the actual payment date.';
  if(r.finalAt&&o.date<r.finalAt)return 'The payment date is before the request was approved.';
  const ill=o.source==='Illustrative';
  if(ill&&!(typeof ccDemoOn==='function'&&ccDemoOn(advEnt())))return 'An illustrative disbursement is recorded only in the presentation company.';
  const ref=ill?'ILLUSTRATIVE-'+i.key:String(o.ref||'').trim();
  if(!ref)return 'Enter the payment reference (UTR, cheque number or cash voucher).';
  if(advRefUsed(ref))return 'Reference '+ref+' is already recorded on another financial event.';
  if(!ill&&!o.evidence)return 'Attach the payment evidence.';
  if(r.kind==='imprest'){const fh=advFundsHolder(r),room=impRoom(fh,'issue',i.key);if(amt>room+0.001)return 'Issuing '+expMoney(amt,fh.currency)+' would take '+fh.key+' above its float of '+expMoney(fh.float,fh.currency)+' (room '+expMoney(room,fh.currency)+').';}
  i.status='Verified';
  i.verify={amount:amt,date:o.date,ref:ref,extRef:String(o.extRef||'').trim(),evidence:o.evidence,method:i.method,by:A.who,at:advStamp(A),illustrative:ill,source:ill?'Illustrative':''};
  const h=advFundsHolder(r);
  const e=advTxn(h,r.kind==='imprest'&&r.requestType==='Replenishment'?'Replenishment':'Issuance',amt,{ref:ref,extRef:i.verify.extRef,date:o.date,source:expKey(r),instr:i.key,illustrative:ill},A);
  i.txn=e.txn;
  advDisbRefresh(r);
  if(r.kind==='advance'&&!r.dueOn){r.issuedOn=o.date;r.dueOn=wbAddDays(o.date,advSettleDaysOf(r));r.settlementKey='STL-'+(7000+advStlNext++);}
  if(r.kind==='imprest'&&r.requestType==='Replenishment'&&r.disb.status==='Disbursed'){h.replenished=h.replenished||{};(r.sourceLines||[]).forEach(function(s){h.replenished[s.claimId+':'+s.lineId]=r.key;});}
  advLog(r,r.status,(ill?'Illustrative disbursement ':'Disbursement ')+i.key+' verified by '+caN(A.who)+': '+expMoney(amt,r.currency)+' paid '+cdLabel(o.date)+' ('+i.method+', ref '+ref+(i.verify.extRef?' / '+i.verify.extRef:'')+'). Ledger '+e.txn+'.'+(ill?' Illustrative: no money moved; it is not a bank-confirmed payment.':''),A);
  if(h!==r)advLog(h,h.status,(r.requestType==='Replenishment'?'Top-up':'Initial funding')+' of '+expMoney(amt,h.currency)+' issued ('+expKey(r)+', ref '+ref+').',A);
  caNotify(caClaimants(r),expKey(r)+': '+expMoney(amt,r.currency)+' issued to you'+(ill?' (Illustrative)':'')+(r.dueOn?' - settle by '+cdLabel(r.dueOn):''),r);
  return '';
}
function advSettleDaysOf(r){
  const p=r.policyEval&&advPolicies.find(function(x){return x.key===r.policyEval.policyKey;});
  const t=advType(r.typeId);
  return Number(p&&p.maxSettleDays)||Number(t&&t.settleDays)||ADV_SETTLE_DAYS;
}
function advDisbFail(id,key,reason,cancel,A){
  A=A||advNow();
  const r=advEngineRec(id);if(!r)return 'No such request.';
  const i=(r.disb&&r.disb.instructions||[]).find(function(x){return x.key===key;});
  if(!i||i.status!=='Processing')return 'Only a Processing disbursement can be '+(cancel?'cancelled':'marked failed')+'.';
  if(!advPCan(A,'advance.disbursement.manage'))return caN(A.who)+' cannot change disbursements.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  i.status=cancel?'Cancelled':'Failed';i.failReason=reason;i.failedBy=A.who;i.failedAt=advStamp(A);
  advDisbRefresh(r);
  advLog(r,r.status,'Disbursement '+i.key+' '+(cancel?'cancelled':'failed')+': '+reason+' Nothing was issued.',A);
  return '';
}
/* A verified issuance proved wrong (bounced, duplicated at the bank): a
   reversal entry, never a delete - and never below what is accounted for. */
function advDisbReverse(id,key,reason,A){
  A=A||advNow();
  const r=advEngineRec(id);if(!r)return 'No such request.';
  const i=(r.disb&&r.disb.instructions||[]).find(function(x){return x.key===key;});
  if(!i||i.status!=='Verified'||i.reversed)return 'Only a verified, unreversed disbursement can be reversed.';
  if(!advPCan(A,'advance.disbursement.verify'))return caN(A.who)+' cannot reverse disbursements.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason for the reversal.';
  const h=advFundsHolder(r),b=advBal(h);
  if(i.verify.amount>b.uncommitted+0.001)return 'Only '+expMoney(b.uncommitted,h.currency)+' of '+expKey(h)+' is not yet accounted for; reverse expenses or returns first.';
  const e=advTxn(h,'Reversal',i.verify.amount,{ofType:r.kind==='imprest'&&r.requestType==='Replenishment'?'Replenishment':'Issuance',of:i.txn,reason:reason,ref:i.verify.ref+'-REV'},A);
  i.reversed={amount:i.verify.amount,by:A.who,at:advStamp(A),reason:reason,txn:e.txn};i.status='Reversed';
  advDisbRefresh(r);
  advLog(r,r.status,'Disbursement '+i.key+' reversed by '+caN(A.who)+': '+reason+' (ledger '+e.txn+').',A);
  return '';
}
/* No financial reference is ever recorded twice in an entity (FR-AI-25.02). */
function advRefUsed(ref){
  ref=caNorm(ref);
  return advancesData.concat(impFunds).some(function(h){return h.entity===advEnt()&&(h.ledger||[]).some(function(e){return e.type!=='Utilization'&&caNorm(e.ref)===ref;});})
    ||advancesData.concat(impFunds).some(function(h){return h.entity===advEnt()&&(h.returns||[]).some(function(x){return (x.status!=='Failed'&&x.ref&&caNorm(x.ref)===ref)
      ||(x.collections||[]).some(function(c){return caNorm(c.ref)===ref;});});});
}

/* ── Returns and recoveries (FR-AI-16) ─────────────────────────────────── */
/* A return: the employee says money came back, or Finance records it;
   either way it counts only once Finance verifies receipt. A recovery:
   Finance/HR raises it with a reason; it counts only once collected. */
function advRrCreate(holderId,o,A){
  A=A||advNow();o=o||{};
  if(o.type==='Recovery')return advRecoveryRaise(holderId,o,A);
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  const isRec=false;
  const own=h.kind==='fund'?h.custodianEid===(idEmpOfUser(A.who)||{}).eid:caIsClaimant(h,A.who);
  if(isRec&&!advPCan(A,'advance.recovery.manage'))return caN(A.who)+' cannot raise recoveries.';
  if(!isRec&&!(advPCan(A,'advance.return.manage')||(own&&advPCan(A,'advance.settlement.submit'))))return caN(A.who)+' cannot record returns on this advance.';
  if(h.closed)return expKey(h)+' is closed.';
  const amt=advM(parseFloat(o.amount)),b=advBal(h);
  if(!(amt>0))return 'Enter the amount.';
  if(amt>b.available+0.001)return 'Only '+expMoney(b.available,h.currency)+' is outstanding and not reserved by expenses in review, pending returns or recoveries.';
  if(advMethods().indexOf(o.method)<0)return 'Pick a method configured for this entity.';
  if(isRec&&!String(o.reason||'').trim())return 'A recovery needs a reason.';
  if(o.ref&&advRefUsed(o.ref))return 'Reference '+String(o.ref).trim()+' is already recorded on another financial event.';
  const x={id:advRrNext++,type:isRec?'Recovery':'Return',amount:amt,currency:h.currency,method:o.method,date:o.date||'',ref:String(o.ref||'').trim(),extRef:String(o.extRef||'').trim(),
    reason:String(o.reason||'').trim(),evidence:o.evidence||'',status:'Pending',recordedBy:A.who,recordedAt:advStamp(A)};
  x.key=(isRec?'RCV-':'RTN-')+(6000+x.id);
  h.returns=h.returns||[];h.returns.push(x);
  advLog(h,advSettleStatus(h),x.type+' '+x.key+' of '+expMoney(amt,h.currency)+' recorded by '+caN(A.who)+' - Pending; it counts once verified.',A);
  return '';
}
function advRrVerify(holderId,key,o,A){
  A=A||advNow();o=o||{};
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  const x=(h.returns||[]).find(function(y){return y.key===key;});
  if(!x)return 'No such record.';
  if(x.type!=='Return')return x.key+' is a recovery; record its collections instead.';
  if(x.status!=='Pending')return x.key+' is '+x.status+'; it cannot be verified again.';
  if(!advPCan(A,x.type==='Recovery'?'advance.recovery.manage':'advance.return.manage'))return caN(A.who)+' cannot verify '+x.type.toLowerCase()+'s.';
  const own=h.kind==='fund'?h.custodianEid===(idEmpOfUser(A.who)||{}).eid:caIsClaimant(h,A.who);
  if(own)return 'Separation of duties: '+caN(A.who)+' owes the advance.';
  const amt=advM(parseFloat(o.amount!=null&&o.amount!==''?o.amount:x.amount)),b=advBal(h);
  if(!(amt>0)||amt>x.amount+0.001)return 'The verified amount must be more than 0 and no more than '+expMoney(x.amount,h.currency)+'.';
  if(amt>b.uncommitted+0.001)return 'Only '+expMoney(b.uncommitted,h.currency)+' is outstanding and not reserved.';
  const date=o.date||x.date;if(!date||date>wbToday())return 'Enter the date the money was received.';
  const ref=String(o.ref||x.ref||'').trim();if(!ref)return 'Enter the reference.';
  if(caNorm(ref)!==caNorm(x.ref)&&advRefUsed(ref))return 'Reference '+ref+' is already recorded.';
  if(!(o.evidence||x.evidence))return 'Attach the evidence of receipt.';
  x.status='Verified';x.amount=amt;x.date=date;x.ref=ref;x.evidence=o.evidence||x.evidence;x.verifiedBy=A.who;x.verifiedAt=advStamp(A);
  const e=advTxn(h,x.type,amt,{ref:ref,extRef:x.extRef,date:date,source:x.key},A);x.txn=e.txn;
  advLog(h,advSettleStatus(h),x.type+' '+x.key+' verified by '+caN(A.who)+': '+expMoney(amt,h.currency)+' received '+cdLabel(date)+' (ref '+ref+'). Ledger '+e.txn+'.',A);
  caNotify(h.kind==='fund'?[idUserOfEmp(h.custodianEid)]:caClaimants(h),expKey(h)+': '+x.type.toLowerCase()+' of '+expMoney(amt,h.currency)+' verified',h);
  return '';
}
function advRrFail(holderId,key,reason,A){
  A=A||advNow();
  const h=advHolder(holderId),x=h&&(h.returns||[]).find(function(y){return y.key===key;});
  if(!x||x.type!=='Return'||x.status!=='Pending')return 'Only a pending return can fail.';
  if(!advPCan(A,x.type==='Recovery'?'advance.recovery.manage':'advance.return.manage'))return caN(A.who)+' cannot change this record.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  x.status='Failed';x.failReason=reason;
  advLog(h,advSettleStatus(h),x.type+' '+x.key+' failed: '+reason+' Nothing was received.',A);
  return '';
}
function advRrReverse(holderId,key,reason,A){
  A=A||advNow();
  const h=advHolder(holderId),x=h&&(h.returns||[]).find(function(y){return y.key===key;});
  if(!x||x.type!=='Return'||x.status!=='Verified')return 'Only a verified return can be reversed.';
  if(!advPCan(A,x.type==='Recovery'?'advance.recovery.manage':'advance.return.manage'))return caN(A.who)+' cannot reverse this record.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason for the reversal.';
  if(h.closed)return expKey(h)+' is closed.';
  const e=advTxn(h,'Reversal',x.amount,{ofType:x.type,of:x.txn,reason:reason,ref:x.ref+'-REV'},A);
  x.status='Reversed';x.reversed={by:A.who,at:advStamp(A),reason:reason,txn:e.txn};
  advLog(h,advSettleStatus(h),x.type+' '+x.key+' reversed: '+reason+' (ledger '+e.txn+').',A);
  return '';
}

/* ── Recovery (user decision 2026-11-07) ───────────────────────────────── */
/* Finance raises a recovery with a reason; someone else holding
   advance.recovery.approve authorizes it - only then is it a recovery
   obligation (Recovery Due). Each collection is verified with its date,
   reference and evidence, and only that reduces the accountable balance.
   An overdue balance is never treated as recovery on its own, and nothing
   is deducted from payroll. */
function advRecFind(h,key){return (h.returns||[]).find(function(x){return x.key===key&&x.type==='Recovery';})||null;}
function advRecStatusOf(x){
  if(['Pending Approval','Rejected','Cancelled'].indexOf(x.status)>=0)return x.status;
  const c=advRecCollected(x);return c<=0?'Approved':c>=x.amount-0.001?'Collected':'Partially Collected';
}
function advRecApprovers(h,x){return caPermHolders('advance.recovery.approve').filter(function(u){return u!==x.recordedBy&&u!==advOwner(h);});}
function advRecoveryRaise(holderId,o,A){
  A=A||advNow();o=o||{};
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  if(!advPCan(A,'advance.recovery.manage'))return caN(A.who)+' cannot raise recoveries.';
  if(advOwner(h)===A.who)return 'Separation of duties: '+caN(A.who)+' owes '+expKey(h)+'.';
  if(h.closed)return expKey(h)+' is closed.';
  const amt=advM(parseFloat(o.amount)),b=advBal(h);
  if(!(amt>0))return 'Enter the amount to recover.';
  if(amt>b.available+0.001)return 'Only '+expMoney(b.available,h.currency)+' is accountable and not already reserved by expenses in review, pending returns or other recoveries.';
  if(advMethods().indexOf(o.method)<0)return 'Pick a method configured for this entity.';
  const reason=String(o.reason||'').trim();if(!reason)return 'A recovery needs a reason.';
  const x={id:advRrNext++,type:'Recovery',amount:amt,currency:h.currency,method:o.method,reason:reason,status:'Pending Approval',
    recordedBy:A.who,recordedAt:advStamp(A),collections:[],ref:'',extRef:'',date:'',evidence:''};
  x.key='RCV-'+(6000+x.id);
  h.returns=h.returns||[];h.returns.push(x);
  advLog(h,advSettleStatus(h),'Recovery '+x.key+' of '+expMoney(amt,h.currency)+' raised by '+caN(A.who)+': '+reason+'. Pending approval - nothing is due until it is authorized, and nothing is deducted from payroll.',A);
  caNotify(advRecApprovers(h,x),expKey(h)+': recovery '+x.key+' of '+expMoney(amt,h.currency)+' needs approval',h);
  return '';
}
function advRecoveryDecide(holderId,key,decision,remarks,A){
  A=A||advNow();
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  const x=advRecFind(h,key);if(!x)return 'No such recovery.';
  if(x.status!=='Pending Approval')return x.key+' is '+x.status+'; it has already been decided.';
  if(!advPCan(A,'advance.recovery.approve'))return caN(A.who)+' cannot approve recoveries.';
  if(A.who===x.recordedBy)return 'Maker-checker: '+caN(A.who)+' raised '+x.key+'; someone else must approve it.';
  if(advOwner(h)===A.who)return 'Separation of duties: '+caN(A.who)+' owes '+expKey(h)+'.';
  remarks=String(remarks||'').trim();
  if(['Approve','Reject'].indexOf(decision)<0)return 'Pick Approve or Reject.';
  if(decision==='Reject'&&!remarks)return 'A rejection needs a reason.';
  if(decision==='Approve'){const b=advBal(h),room=advM(b.uncommitted-advRrOpen(h,x.key));
    if(x.amount>room+0.001)return 'Only '+expMoney(room,h.currency)+' is accountable now (expenses or returns changed it). Reject this recovery and raise the right amount.';}
  x.status=decision==='Approve'?'Approved':'Rejected';x.approval={by:A.who,at:advStamp(A),decision:decision,remarks:remarks};
  advLog(h,advSettleStatus(h),'Recovery '+x.key+' '+(decision==='Approve'?'authorized':'rejected')+' by '+caN(A.who)+(remarks?': '+remarks+'.':'.')
    +(decision==='Approve'?' '+expMoney(x.amount,h.currency)+' is due; the balance falls only as collections are verified.':''),A);
  caNotify((decision==='Approve'?[advOwner(h)]:[]).concat([x.recordedBy]),expKey(h)+': recovery '+x.key+' of '+expMoney(x.amount,h.currency)+' '
    +(decision==='Approve'?'authorized - repay by '+x.method:'rejected'),h);
  return '';
}
function advRecoveryCollect(holderId,key,o,A){
  A=A||advNow();o=o||{};
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  const x=advRecFind(h,key);if(!x)return 'No such recovery.';
  if(['Approved','Partially Collected'].indexOf(x.status)<0)return x.status==='Pending Approval'?x.key+' is not authorized yet; nothing can be collected against it.':x.key+' is '+x.status+'.';
  if(!advPCan(A,'advance.recovery.manage'))return caN(A.who)+' cannot record recovery collections.';
  if(advOwner(h)===A.who)return 'Separation of duties: '+caN(A.who)+' owes '+expKey(h)+'.';
  const unpaid=advRecUnpaid(x),b=advBal(h),amt=advM(parseFloat(o.amount));
  if(!(amt>0)||amt>unpaid+0.001)return 'The amount collected must be more than 0 and no more than the '+expMoney(unpaid,h.currency)+' still due.';
  if(amt>b.uncommitted+0.001)return 'Only '+expMoney(b.uncommitted,h.currency)+' is accountable and not reserved by expenses in review.';
  if(!o.date||o.date>wbToday())return 'Enter the date the money was received.';
  const ref=String(o.ref||'').trim();if(!ref)return 'Enter the transaction reference.';
  if(advRefUsed(ref))return 'Reference '+ref+' is already recorded on another financial event.';
  if(!o.evidence)return 'Attach the evidence of collection.';
  const extRef=String(o.extRef||'').trim();
  const e=advTxn(h,'Recovery',amt,{ref:ref,extRef:extRef,date:o.date,source:x.key},A);
  x.collections.push({amount:amt,date:o.date,ref:ref,extRef:extRef,evidence:o.evidence,by:A.who,at:advStamp(A),txn:e.txn});
  x.status=advRecStatusOf(x);
  advLog(h,advSettleStatus(h),'Recovery '+x.key+': '+expMoney(amt,h.currency)+' collected '+cdLabel(o.date)+' (ref '+ref+(extRef?' / '+extRef:'')+'), verified by '+caN(A.who)
    +'. Ledger '+e.txn+'. '+(x.status==='Collected'?'Fully collected.':expMoney(advRecUnpaid(x),h.currency)+' still due.'),A);
  caNotify([advOwner(h)],expKey(h)+': '+expMoney(amt,h.currency)+' received against recovery '+x.key,h);
  return '';
}
/* What is still due is cancelled (with a reason); what was collected stays. */
function advRecoveryCancel(holderId,key,reason,A){
  A=A||advNow();
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  const x=advRecFind(h,key);if(!x)return 'No such recovery.';
  if(ADV_REC_OPEN.indexOf(x.status)<0)return x.key+' is '+x.status+'; nothing is left to cancel.';
  if(!advPCan(A,'advance.recovery.manage'))return caN(A.who)+' cannot cancel recoveries.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  const left=advRecUnpaid(x);
  x.cancelled={by:A.who,at:advStamp(A),reason:reason,unpaid:left};x.status='Cancelled';
  advLog(h,advSettleStatus(h),'Recovery '+x.key+' cancelled by '+caN(A.who)+' ('+expMoney(left,h.currency)+' no longer due'+(advRecCollected(x)?'; '+expMoney(advRecCollected(x),h.currency)+' collected stays recorded':'')+'): '+reason,A);
  return '';
}
/* A collection that proved wrong (bounced): a reversal entry; the amount is due again. */
function advRecoveryReverse(holderId,key,reason,A){
  A=A||advNow();
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  const x=advRecFind(h,key);if(!x)return 'No such recovery.';
  const c=(x.collections||[]).slice().reverse().find(function(y){return !y.reversed;});
  if(!c)return 'No verified collection to reverse on '+x.key+'.';
  if(!advPCan(A,'advance.recovery.manage'))return caN(A.who)+' cannot reverse recovery collections.';
  if(h.closed)return expKey(h)+' is closed.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason for the reversal.';
  const e=advTxn(h,'Reversal',c.amount,{ofType:'Recovery',of:c.txn,reason:reason,ref:c.ref+'-REV'},A);
  c.reversed={by:A.who,at:advStamp(A),reason:reason,txn:e.txn};
  x.status=advRecStatusOf(x);
  advLog(h,advSettleStatus(h),'Recovery '+x.key+': collection '+c.ref+' of '+expMoney(c.amount,h.currency)+' reversed by '+caN(A.who)+': '+reason+' (ledger '+e.txn+').'
    +(x.status!=='Cancelled'?' '+expMoney(advRecUnpaid(x),h.currency)+' is due again.':''),A);
  return '';
}

/* ── Settlement review, extension and closure (FR-AI-14 / 19 / 20) ─────── */
function advOwner(h){return h.kind==='fund'?idUserOfEmp(h.custodianEid):caClaimantUser(h);}
function advReview(holderId,remarks,A){
  A=A||advNow();
  const h=advHolder(holderId);if(!h)return 'No such advance.';
  if(!advPCan(A,'advance.settlement.review'))return caN(A.who)+' cannot review settlements.';
  if(advOwner(h)===A.who)return 'Separation of duties: '+caN(A.who)+' owes the advance.';
  remarks=String(remarks||'').trim();if(!remarks)return 'Add the review remarks.';
  const b=advBal(h);
  const accepted=b.accountable<=0&&b.pending<=0&&b.obligations<=0&&!(h.returns||[]).some(function(x){return x.status==='Pending'||x.status==='Pending Approval';});
  h.reviews=h.reviews||[];
  h.reviews.unshift({by:A.who,at:advStamp(A),remarks:remarks,accepted:accepted,snapshot:b});
  advLog(h,advSettleStatus(h),'Settlement reviewed by '+caN(A.who)+(accepted?' - accepted: everything issued is accounted for.':' - '+expMoney(b.accountable,h.currency)+' still accountable'+(b.pending?', '+expMoney(b.pending,h.currency)+' in expenses under review':'')+'.')+' '+remarks,A);
  return '';
}
function advExtendDue(id,date,reason,A){
  A=A||advNow();
  const r=advRec(id);if(!r)return 'No such advance.';
  if(!advPCan(A,'advance.settlement.review'))return caN(A.who)+' cannot extend settlement dates.';
  if(caIsClaimant(r,A.who))return 'Separation of duties: '+caN(A.who)+' owes the advance.';
  if(!r.dueOn)return 'The advance has not been issued yet.';
  if(!date||date<=r.dueOn)return 'The new due date must be after '+cdLabel(r.dueOn)+'.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason for the extension.';
  r.extensions.push({from:r.dueOn,to:date,by:A.who,at:advStamp(A),reason:reason});
  advLog(r,r.status,'Settlement due date extended by '+caN(A.who)+' from '+cdLabel(r.dueOn)+' to '+cdLabel(date)+': '+reason,A);
  r.dueOn=date;r.overdueFor='';r.remindedFor='';
  return '';
}
/* Closure: nothing left to account for, nothing pending, a Finance review that accepted it. */
function advCloseCheck(h){
  const b=advBal(h);
  if(h.closed)return 'Already closed.';
  if(h.kind==='advance'&&['Approved','Partially Approved','Cancelled'].indexOf(h.status)<0)return 'Only an approved advance is closed; this one is '+h.status+'.';
  if(b.accountable>0)return expMoney(b.accountable,h.currency)+' is still accountable.';
  if(b.pending>0)return expMoney(b.pending,h.currency)+' is in expenses still under review.';
  if((h.returns||[]).some(function(x){return x.type==='Return'?x.status==='Pending':ADV_REC_OPEN.indexOf(x.status)>=0;}))return 'A return or recovery is still open (pending, or authorized and not fully collected).';
  if(h.kind==='advance'&&advProcessing(h)>0)return 'A disbursement is still Processing.';
  if(h.kind==='advance'&&b.unissued>0)return expMoney(b.unissued,h.currency)+' is approved but unissued; cancel it first.';
  if(h.kind==='fund'&&impRequests.some(function(q){return q.fundId===h.id&&(['Awaiting Approval','Follow-Up'].indexOf(q.status)>=0||(q.disb&&q.disb.status==='Processing'));}))return 'A funding request is still open.';
  if(!(h.reviews||[]).some(function(v){return v.accepted;}))return 'A Finance review must accept the settlement first.';
  return '';
}
function advClose(holderId,remarks,A){
  A=A||advNow();
  const h=advHolder(holderId);if(!h)return 'No such record.';
  if(!advPCan(A,'advance.close'))return caN(A.who)+' cannot close advances or funds.';
  if(advOwner(h)===A.who)return 'Separation of duties: '+caN(A.who)+' owes it.';
  const e=advCloseCheck(h);if(e)return e;
  h.closed={by:A.who,at:advStamp(A),remarks:String(remarks||'').trim()};
  if(h.kind==='fund')h.status='Closed';
  advLog(h,'Closed','Closed by '+caN(A.who)+'. Nothing is outstanding; history is kept.'+(remarks?' '+remarks:''),A);
  return '';
}

/* ── Imprest funds (FR-AI-17 / 18) ─────────────────────────────────────── */
/* An imprest custodian: an active employee of the entity with an ADT account
   whom RBAC authorizes to request replenishment (advance.replenish through a
   role or a workspace team such as Imprest Custodians). */
function impCustodianIssue(eid){
  const e=idEmp(eid);
  if(!e||e.entityId!==advEnt()||!idEmpActive(e))return 'Pick an active employee of this entity as custodian.';
  try{if(typeof empState==='function'&&empState(e).phase==='off')return e.name+' is being offboarded and cannot hold an imprest fund.';}catch(x){}
  const uid=idUserOfEmp(e.eid);if(!uid)return e.name+' has no ADT account, so cannot be a custodian.';
  if(!(typeof emsPersonPerms==='function'&&emsPersonPerms(uid)['advance.replenish']))return e.name+' is not authorized as an imprest custodian: no role or RBAC team gives advance.replenish in '+idEntityName(advEnt())+'. Add them to the Imprest Custodians team (RBAC Workspaces) first.';
  return '';
}
/* Room under a fund's float. 'request': float − accountable − other
   requests in approval − approved amounts not yet issued. 'issue': float −
   accountable − instructions still processing (except the one being verified). */
function impRoom(f,mode,except){
  let fly=0;
  impRequests.forEach(function(q){
    if(q.fundId!==f.id)return;
    if(mode==='request'){
      if(q.id===except)return;
      if(['Awaiting Approval','Follow-Up'].indexOf(q.status)>=0)fly+=caTotal(q);
      else if(['Approved','Partially Approved'].indexOf(q.status)>=0&&q.disb)fly+=Math.max(0,advM(advAuthorized(q)-advReqIssued(q)));
    }else (q.disb&&q.disb.instructions||[]).forEach(function(i){if(i.status==='Processing'&&i.key!==except)fly+=i.amount;});
  });
  return Math.max(0,advM(f.float-advBal(f).accountable-fly));
}
/* A custodian whose authorization ends (removed from the Imprest Custodians
   team, template or workspace deactivated, employee inactive) keeps the
   fund's accountability - balances, expenses, returns and recoveries stay
   with them. New spending and new funding stop until an authorized custodian
   is assigned (Transfer Custodian) or the fund is reconciled and closed. */
const IMP_OPEN=['Active','On Hold','Closing'];
function impLapsed(f){return !!f&&!f.closed&&IMP_OPEN.indexOf(f.status)>=0&&!!impCustodianIssue(f.custodianEid);}
function impLapseScan(cause,A){
  A=A||advNow();const flagged=[];
  impFunds.forEach(function(f){
    if(f.entity!==advEnt()||f.closed||IMP_OPEN.indexOf(f.status)<0)return;
    const lapsed=impLapsed(f);
    if(lapsed&&!f.lapse){
      const b=advBal(f),who=idEmpName(f.custodianEid);
      f.lapse={since:A.iso,cause:cause||'Custodian authorization ended',balance:b.accountable};flagged.push(f);
      advLog(f,f.status,'Custodian authorization ended ('+f.lapse.cause+'): '+who+' is no longer an authorized imprest custodian. The accountable balance of '
        +expMoney(b.accountable,f.currency)+' stays with '+who+'. New spending and funding stop until an authorized custodian is assigned, or the fund is reconciled and closed.',A);
      caNotify(caPermHolders('advance.imprest.manage').concat([idUserOfEmp(f.custodianEid)]),f.key+': custodian authorization ended - reassign the custodian or reconcile ('+expMoney(b.accountable,f.currency)+' accountable)',f);
    }else if(!lapsed&&f.lapse){
      advLog(f,f.status,'Custodian authorization in place again for '+idEmpName(f.custodianEid)+'; spending and funding resume.',A);f.lapse=null;
    }
  });
  return flagged;
}
function impNewRequest(f,type,amount,o,A){
  const e=idEmp(f.custodianEid);
  const q={id:irqNextId++,key:irqNextKey++,prefix:'IRQ',kind:'imprest',fundId:f.id,requestType:type,entity:f.entity,claimFor:'Others',employeeEid:f.custodianEid,
    name:e?e.name:'',empId:e?e.empId:'',email:e?e.email||'':'',category:'Imprest · '+type,title:f.name+' · '+type,purpose:String(o.purpose||'').trim(),
    currency:f.currency,status:'Draft',appliedOn:'',createdBy:A.who,createdAt:advStamp(A),migrated:true,idMigrated:true,sourceLines:o.sourceLines||[],
    lines:[{id:1,title:type,amount:advM(amount),subCat:type,start:wbToday(),end:wbToday(),status:'Pending',approved:null}]};
  q.logs=[{date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:'Draft',action:type+' request drafted for '+f.key+': '+expMoney(amount,f.currency)+'.'}];
  impRequests.unshift(q);return q;
}
function impFundCreate(d,A){
  A=A||advNow();
  if(!advPCan(A,'advance.imprest.manage'))return {error:caN(A.who)+' cannot create imprest funds.'};
  const e=idEmp(d.custodianEid);
  if(!String(d.name||'').trim())return {error:'Fund Name is required.'};
  const ci=impCustodianIssue(d.custodianEid);if(ci)return {error:ci};
  if(!String(d.purpose||'').trim())return {error:'Fund Purpose is required.'};
  const fl=parseFloat(d.float);if(!(fl>0))return {error:'Authorized Float Amount must be more than 0.'};
  const t=advType(d.typeId);if(!t||t.model!=='Imprest'||t.status!=='Active')return {error:'Pick an active imprest type.'};
  if(IMP_REVIEW_FREQ.indexOf(d.reviewFreq)<0)return {error:'Pick the review frequency.'};
  const wf=d.workflowId?caWfRec(Number(d.workflowId)):caWfRec(t.workflowId);
  if(!wf||wf.entity!==advEnt()||caWfKindOf(wf)!=='Imprest')return {error:'Pick an Imprest approval workflow of this entity.'};
  if(!d.effFrom)return {error:'Effective From is required.'};
  if(d.effTo&&d.effTo<d.effFrom)return {error:'Effective To cannot be before Effective From.'};
  const f={id:impNextId++,key:impNextKey++,prefix:'IMP',kind:'fund',entity:advEnt(),name:String(d.name).trim(),custodianEid:e.eid,dept:e.dept||'',
    purpose:String(d.purpose).trim(),float:advM(fl),currency:d.currency||'INR',cats:(d.cats||[]).slice(),replenish:d.replenish!==false&&t.replenish,typeId:t.id,
    workflowId:wf.id,reviewFreq:d.reviewFreq,reviewNote:String(d.reviewNote||'').trim(),effFrom:d.effFrom,effTo:d.effTo||'',status:'Draft',createdBy:A.who,createdAt:advStamp(A),
    ledger:[],returns:[],transfers:[],replenished:{},logs:[]};
  advLog(f,'Draft','Imprest fund created for '+e.name+' with a float of '+expMoney(f.float,f.currency)+'. Initial funding needs approval and a verified disbursement.',A);
  impFunds.unshift(f);
  const q=impNewRequest(f,'Initial Funding',f.float,{purpose:'Initial float for '+f.name},A);
  return {fund:f,request:q};
}
/* Accepted expense lines on a fund not yet replenished or claimed by a live request. */
function impLineTaken(f,s,exceptReq){
  if(f.replenished&&f.replenished[s.claimId+':'+s.lineId])return true;
  return impRequests.some(function(q){return q.id!==exceptReq&&q.fundId===f.id&&q.requestType==='Replenishment'
    &&['Rejected','Withdrawn','Cancelled'].indexOf(q.status)<0
    &&(q.sourceLines||[]).some(function(x){return x.claimId===s.claimId&&x.lineId===s.lineId;});});
}
function impEligibleLines(f){
  return (f.ledger||[]).filter(function(e){return e.type==='Utilization';}).map(function(e){return {claimId:e.claimId,claimKey:e.claimKey,lineId:e.lineId,lineTitle:e.lineTitle,amount:e.amount};})
    .filter(function(s){return !impLineTaken(f,s);});
}
/* Initial funding again, after a rejected or withdrawn request (the fund stays Draft until funded). */
function impInitialRequest(fundId,A){
  A=A||advNow();
  const f=impFund(fundId);if(!f)return {error:'No such fund.'};
  if(!advPCan(A,'advance.imprest.manage'))return {error:caN(A.who)+' cannot request imprest funding.'};
  if(f.status!=='Draft')return {error:f.key+' is already funded.'};
  if(impRequests.some(function(q){return q.fundId===f.id&&q.requestType==='Initial Funding'&&['Rejected','Withdrawn','Cancelled'].indexOf(q.status)<0;}))return {error:'An initial funding request for '+f.key+' is already open.'};
  const q=impNewRequest(f,'Initial Funding',f.float,{purpose:'Initial float for '+f.name},A);
  advLog(f,f.status,'New initial funding request '+expKey(q)+' drafted.',A);
  return {request:q};
}
function impReplenishCreate(fundId,picks,justification,A,why){
  A=A||advNow();
  const f=impFund(fundId);if(!f)return {error:'No such fund.'};
  /* The fund's assigned, authorized custodian asks for a top-up. Whoever holds
     advance.replenish.others (Super Admin) may ask on the custodian's behalf
     with a recorded reason. Either way someone else approves it
     (advance.replenish.approve) and the disbursement follows maker-checker. */
  const me=idEmpOfUser(A.who),own=!!me&&me.eid===f.custodianEid;
  let behalf=null;
  if(own){if(!advPCan(A,'advance.replenish'))return {error:caN(A.who)+' is not authorized to request replenishment (advance.replenish).'};}
  else if(advPCan(A,'advance.replenish.others')){
    why=String(why||'').trim();
    if(!why)return {error:'Say why you are requesting on behalf of '+idEmpName(f.custodianEid)+'; the reason is recorded.'};
    behalf={by:A.who,at:advStamp(A),reason:why};
  }
  else return {error:'Only the assigned custodian of '+f.key+' ('+idEmpName(f.custodianEid)+') can request its replenishment.'};
  const ci=impCustodianIssue(f.custodianEid);if(ci)return {error:behalf?idEmpName(f.custodianEid)+' is no longer an authorized custodian; reassign the custodian or reconcile '+f.key+' before any top-up.':ci};
  if(f.status!=='Active')return {error:f.key+' is '+f.status+'; it cannot be replenished.'};
  if(!f.replenish)return {error:'Replenishment is not allowed for '+f.key+'.'};
  const today=wbToday();
  if(f.effFrom&&today<f.effFrom)return {error:f.key+' is effective from '+cdLabel(f.effFrom)+'.'};
  if(f.effTo&&today>f.effTo)return {error:f.key+' expired on '+cdLabel(f.effTo)+'; it cannot be replenished.'};
  const el=impEligibleLines(f);
  const sel=el.filter(function(s){return (picks||[]).some(function(p){return p===s.claimId+':'+s.lineId;});});
  if(!sel.length)return {error:'Pick the accepted expenses to replenish.'};
  if(!String(justification||'').trim())return {error:'Give the justification.'};
  const amt=advSum(sel,function(s){return s.amount;});
  const room=impRoom(f,'request');
  if(amt>room+0.001)return {error:'A top-up of '+expMoney(amt,f.currency)+' would exceed the float of '+expMoney(f.float,f.currency)+' ('+expMoney(room,f.currency)+' of room after funding already in flight).'};
  const q=impNewRequest(f,'Replenishment',amt,{purpose:justification,sourceLines:sel},A);
  if(behalf)q.onBehalf=behalf;
  const pre=advPreflight(q);
  if(pre.error){impRequests.shift();irqNextId--;irqNextKey--;return {error:pre.error};}
  if(behalf)advLog(q,'Draft','Requested by '+caN(A.who)+' on behalf of custodian '+idEmpName(f.custodianEid)+': '+behalf.reason+'. '+caN(A.who)+' cannot approve it.',A);
  caStart(q,pre,A);
  advLog(f,f.status,'Replenishment '+expKey(q)+' of '+expMoney(amt,f.currency)+' requested'+(behalf?' by '+caN(A.who)+' on behalf of '+idEmpName(f.custodianEid)+' ('+behalf.reason+')':'')
    +' for '+sel.length+' accepted expense'+(sel.length===1?'':'s')+'.',A);
  if(behalf)caNotify([idUserOfEmp(f.custodianEid)],f.key+': '+caN(A.who)+' requested a top-up of '+expMoney(amt,f.currency)+' on your behalf',f);
  return {request:q};
}
function impFundSet(fundId,to,reason,A){
  A=A||advNow();
  const f=impFund(fundId);if(!f)return 'No such fund.';
  if(!advPCan(A,'advance.imprest.manage'))return caN(A.who)+' cannot change imprest funds.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  const ok={'On Hold':['Active'],'Active':['On Hold'],'Closing':['Active','On Hold']};
  if(!ok[to]||ok[to].indexOf(f.status)<0)return f.key+' cannot move from '+f.status+' to '+to+'.';
  const was=f.status;f.status=to;
  advLog(f,to,'Status '+was+' → '+to+' by '+caN(A.who)+': '+reason+(to==='On Hold'?' No further funding is issued.':to==='Closing'?' No new expenses or funding; settle the balance, then close.':''),A);
  return '';
}
/* A new custodian takes over the accountable balance - explicitly, with a reason. */
function impTransfer(fundId,eid,reason,A){
  A=A||advNow();
  const f=impFund(fundId);if(!f)return 'No such fund.';
  if(!advPCan(A,'advance.imprest.manage'))return caN(A.who)+' cannot transfer custodianship.';
  const e=idEmp(eid);
  const ci=impCustodianIssue(eid);if(ci)return ci;
  if(e.eid===f.custodianEid)return e.name+' is already the custodian.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason for the transfer.';
  const b=advBal(f);
  if(b.pending>0)return expMoney(b.pending,f.currency)+' is in expenses under review; settle them before handing over.';
  if(b.obligations>0)return 'A return or recovery on '+f.key+' is still open; finish it before handing over.';
  if(impRequests.some(function(q){return q.fundId===f.id&&['Awaiting Approval','Follow-Up'].indexOf(q.status)>=0;}))return 'A funding request is in approval; finish it first.';
  f.transfers.push({from:f.custodianEid,to:e.eid,by:A.who,at:advStamp(A),reason:reason,balance:b.accountable});
  const from=idEmpName(f.custodianEid);f.custodianEid=e.eid;f.dept=e.dept||f.dept;
  if(f.lapse){f.transfers[f.transfers.length-1].lapse=f.lapse;f.lapse=null;}
  advLog(f,f.status,'Custodian changed from '+from+' to '+e.name+' by '+caN(A.who)+'. Accountable balance handed over: '+expMoney(b.accountable,f.currency)+'. Reason: '+reason,A);
  caNotify([idUserOfEmp(e.eid)],f.key+': you are now the custodian ('+expMoney(b.accountable,f.currency)+' handed over)',f);
  return '';
}

/* ── Scope (who sees what) ─────────────────────────────────────────────── */
function advMyEid(){const e=typeof emsActorRecord==='function'?emsActorRecord():null;return e?e.eid:'';}
function advScope(list){
  const ent=advEnt();list=list.filter(function(r){return r.entity===ent;});
  if(caCan('advance.view.all'))return list;
  const me=caMe(),my=advMyEid();
  const team=caCan('advance.view.team')?idEmpsIn(ent,true).filter(function(e){return my&&e.managerEid===my;}).map(function(e){return e.eid;}):[];
  return list.filter(function(r){return r.employeeEid===my||r.createdBy===me||team.indexOf(r.employeeEid)>=0||caInvolved(r,me);});
}
function impScope(list){
  const ent=advEnt();list=list.filter(function(f){return f.entity===ent;});
  if(caCan('advance.view.all')||caCan('advance.imprest.manage'))return list;
  const my=advMyEid();return list.filter(function(f){return f.custodianEid===my;});
}

/* ── Overdue, reminders and exits (FR-AI-19 / 20) ──────────────────────── */
function advTick(){
  const today=wbToday(),ent=advEnt(),cfg=advCfg(),A=caAt('System',today,'08:00:00 AM');
  const oversight=caPermHolders('advance.view.all').filter(function(u){return caPersonCan(u,'advance.settlement.review')||caPersonCan(u,'advance.recovery.manage')||caPersonCan(u,'advance.create.others');});
  advancesData.forEach(function(h){
    if(h.entity!==ent||h.closed||!h.dueOn)return;
    const b=advBal(h);if(b.accountable<=0)return;
    if(h.remindedFor!==h.dueOn&&today>=wbAddDays(h.dueOn,-cfg.reminderDays)&&today<=h.dueOn){
      h.remindedFor=h.dueOn;advLog(h,h.status,'Reminder sent: settle '+expMoney(b.accountable,h.currency)+' by '+cdLabel(h.dueOn)+'.',A);
      caNotify(caClaimants(h),'Reminder: '+expKey(h)+' - '+expMoney(b.accountable,h.currency)+' to settle by '+cdLabel(h.dueOn),h);
    }
    if(today>h.dueOn&&h.overdueFor!==h.dueOn){
      h.overdueFor=h.dueOn;
      advLog(h,h.status,'Settlement overdue: '+expMoney(b.accountable,h.currency)+' unaccounted since '+cdLabel(h.dueOn)+'. Escalated to Finance and HR. No deduction is made automatically.',A);
      caNotify(caClaimants(h).concat(oversight.filter(function(u){return !caIsClaimant(h,u);})),'Overdue: '+expKey(h)+' - '+expMoney(b.accountable,h.currency)+' not settled (due '+cdLabel(h.dueOn)+')',h);
    }
  });
  impLapseScan('Custodian authorization ended',A);
  /* People leaving with money out: once, to Finance and HR. */
  advancesData.concat(impFunds).forEach(function(h){
    if(h.entity!==ent||h.closed||h.exitFlagged)return;
    const eid=h.kind==='fund'?h.custodianEid:h.employeeEid,e=idEmp(eid);if(!e)return;
    let leaving=!idEmpActive(e);try{if(!leaving&&typeof empState==='function'&&empState(e).phase==='off')leaving=true;}catch(x){}
    if(!leaving)return;
    const b=advBal(h);if(b.accountable<=0&&b.unissued<=0)return;
    h.exitFlagged=today;
    advLog(h,h.status||advSettleStatus(h),'Exit review: '+e.name+' is leaving with '+expMoney(b.accountable,h.currency)+' accountable'+(b.unissued?' and '+expMoney(b.unissued,h.currency)+' approved but unissued':'')+'. Settle, recover or cancel through the authorised process.',A);
    caNotify(oversight,'Exit review: '+e.name+' - '+expKey(h)+' has open balances',h);
  });
}
function advExitReview(h){return !!h.exitFlagged&&!h.closed;}

/* ── Seed: the shipped configuration and a few requests, through the real flow ── */
(function(){
  const sh=caU('shaun@testemp.com'),pal=caU('pallavi@testemp.com');
  const wfA=caWfSeed(caWfNext++,'Advance - Manager then Finance',{kind:'Advance',desc:'Every advance request: the reporting manager confirms the business need, Finance authorizes the amount.'},[
    caStageDef(1,'Manager review','Reporting Manager','',{fallback:pal}),
    caStageDef(2,'Finance review','Role','Finance/Billing Admin',{fallback:sh})]);
  const wfI=caWfSeed(caWfNext++,'Imprest - Finance',{kind:'Imprest',desc:'Imprest initial funding and replenishments are authorized by Finance.'},[
    caStageDef(1,'Finance review','Role','Finance/Billing Admin',{fallback:sh})]);
  caWorkflows.push(wfA,wfI);
  const tTravel=advTypeSeed('Travel Advance','One-Time',['Travel Reimbursement','Accommodation','Meal Allowance'],wfA.id,{desc:'Funds for planned business travel.'});
  const tBiz=advTypeSeed('Business Expense Advance','One-Time',[],wfA.id,{desc:'Funds for business meetings, purchases or activities.'});
  advTypeSeed('Employee Expense Advance','One-Time',[],wfA.id,{desc:'General approved expense funding.'});
  const tImp=advTypeSeed('Petty Cash / Imprest','Imprest',[],wfI.id,{desc:'A revolving amount held by a custodian.'});
  /* Petty cash is handed over in cash against a signed voucher: configured for this entity. */
  advCfgSave({mcOn:true,typeIds:[],threshold:'',eorEligible:false,reminderDays:3,methods:['Cash']},caAt(sh,'2026-11-01','10:10:00 AM'));
  advPolSeed('Travel advances - entity',tTravel.id,'Entity','',{minAmt:1000,maxAmt:20000,maxOpen:2,maxOutstanding:40000,maxSettleDays:30,restriction:'Warning'});
  advPolSeed('Sales travel advances',tTravel.id,'Department','Sales',{maxAmt:30000,maxOpen:3,maxOutstanding:60000,restriction:'Warning'});
  advPolSeed('Business expense advances - entity',tBiz.id,'Entity','',{maxAmt:10000,maxOpen:1,restriction:'Blocking',partialDisbursement:false});
  advPolSeed('Employee expense advances - entity',advTypes[2].id,'Entity','',{maxAmt:5000,maxOpen:1,restriction:'Blocking'});
  const vk=caU('vikram.rao@opendhi.com');
  /* Each stage is decided by whoever the engine assigned to it - nobody is named here. */
  const approveAll=function(r,iso){
    let guard=0;
    while(r&&r.wf&&r.wf.open&&guard++<6){const st=caActiveStage(r);if(!st||!st.approvers.length)break;
      const e=caDecide(r.id,{scope:'claim',decision:'Approve',comment:''},caAt(st.approvers[0],iso));if(e)break;}
    return r&&['Approved','Partially Approved'].indexOf(r.status)>=0;
  };
  const mk=function(email,o,iso){const u=idUserByEmail(email);return advCreate(Object.assign({eid:u.eid,claimFor:'Self',currency:'INR'},o),true,caAt(u.userId,iso,'09:30:00 AM')).rec;};
  caNotifSilent=true;
  /* 1. Issued, being spent: Tarak's roadshow travel advance. */
  const a1=mk('tarak.swain@maaserp.com',{typeId:tTravel.id,title:'Client roadshow - Mumbai and Pune',purpose:'Hotels and local travel for three client meetings.',amount:15000,requiredBy:'2026-10-18',periodFrom:'2026-10-20',periodTo:'2026-10-24'},'2026-10-10');
  if(a1&&a1.wf&&approveAll(a1,'2026-10-12')){
    advDisbInitiate(a1.id,{amount:15000,method:ADV_BASE_METHOD,account:'Salary account on file'},caAt(vk,'2026-10-13'));
    advDisbVerify(a1.id,a1.disb.instructions[0].key,{amount:15000,date:'2026-10-14',ref:'UTRN2026101400731',evidence:'bank-advice-adv1001.pdf'},caAt(sh,'2026-10-14'));}
  /* 2. With the manager: Meera's business expense advance. */
  mk('meera@testemp.com',{typeId:tBiz.id,title:'Design research workshop',purpose:'Venue booking and materials for the user-research workshop.',amount:5000,requiredBy:'2026-11-20'},'2026-11-05');
  /* 3. Approved, waiting for Finance to pay: Syed's travel advance. */
  const a3=mk('syed.ayaz@opendhi.com',{typeId:tTravel.id,title:'Chennai vendor audit follow-up',purpose:'Flights and hotel for the second audit visit.',amount:8000,requiredBy:'2026-11-15'},'2026-11-03');
  if(a3&&a3.wf)approveAll(a3,'2026-11-05');
  /* 4. Issued in September and never accounted for: overdue. */
  const a4=mk('arjun.nair@maaserp.com',{typeId:advTypes[2].id,title:'Conference registration and travel',purpose:'Developer conference registration and local travel.',amount:3000,requiredBy:'2026-09-18'},'2026-09-14');
  if(a4&&a4.wf&&approveAll(a4,'2026-09-16')){
    advDisbInitiate(a4.id,{amount:3000,method:ADV_BASE_METHOD},caAt(vk,'2026-09-17'));
    advDisbVerify(a4.id,a4.disb.instructions[0].key,{amount:3000,date:'2026-09-18',ref:'UTRN2026091800155',evidence:'bank-advice-adv1004.pdf'},caAt(sh,'2026-09-18'));}
  /* 5. The Hyderabad office petty cash, held by HR. */
  const fr=impFundCreate({name:'Hyderabad office petty cash',custodianEid:idUserByEmail('pallavi@testemp.com').eid,purpose:'Courier, stationery and small office purchases.',
    float:10000,currency:'INR',cats:['Office Stationery','Meal Allowance'],typeId:tImp.id,reviewFreq:'Monthly',effFrom:'2026-10-01'},caAt(vk,'2026-10-01'));
  if(fr.request){const q=fr.request;advSubmit(q.id,caAt(vk,'2026-10-01'));
    if(approveAll(q,'2026-10-02'))advDisbInitiate(q.id,{amount:10000,method:'Cash',account:'Office cash box'},caAt(vk,'2026-10-02'));
    if(q.disb&&q.disb.instructions.length)advDisbVerify(q.id,q.disb.instructions[0].key,{amount:10000,date:'2026-10-02',ref:'CV-2026-1002-01',evidence:'cash-voucher-acknowledged.pdf'},caAt(sh,'2026-10-02'));}
  caNotifSilent=false;
})();
advTick();
