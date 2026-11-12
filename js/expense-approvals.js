/* ══ EXPENSE CLAIMS · APPROVALS & REIMBURSEMENT (FR-CA, Build 4) ══════════
   The engine behind Expenses: which approval route a claim takes, who
   approves each stage, what each decision does to the line amounts, how a
   Follow-Up comes back, and what is finally owed to the employee.
   js/expense-approvals-ui.js draws it; js/expenses.js calls into it.

   ROUTE. Approval Settings holds entity-wise workflows of 1-4 sequential
   stages. A claim takes the most specific active workflow that matches it
   (Employee > Position > Department > Entity, then sub category > category
   > all, then an amount band). Two equally specific matches are a
   configuration exception, never a guess. Amount bands convert through the
   effective-dated Exchange Rates; no rate, no route.

   APPROVERS. A stage names a Reporting Manager (read off the employee
   record), a Role (users holding it in Company Settings → Roles & Access),
   a Specific User or an RBAC Team (workspace team members whose template
   grants expense approval). The claimant and the submitter are never
   approvers. Nobody eligible → the stage's fallback → otherwise an
   assignment exception. Nothing is ever approved automatically.

   DECISIONS. Each stage decides every line still open: Approve, Partially
   Approve (lower amount + reason), Reject (reason) or Follow-Up (request).
   A later stage may confirm or reduce what an earlier one allowed, never
   raise it. The claim is final only after the last stage: Approved,
   Partially Approved or Rejected. A Super Admin (RBAC: expense.approval.
   intervene) may decide on any active stage without reassigning it first:
   an audited intervention with a reason. In an Any One stage it may complete
   the stage; in an All stage it stands in for ONE named undecided approver
   and the others still decide. Never on a claim they filed or benefit from.

   SLA. Calendar days per stage, the entity default (3) unless the stage
   sets its own; paused while the employee answers a Follow-Up. Overdue
   stages escalate to the entity's escalation authority (default: the Entity
   Super Admin), who may reassign - escalation never approves or rejects.

   MIGRATION. Claims filed before approval routes existed keep their status,
   line decisions and logs. Pending ones get a valid workflow assignment
   (none had a stage approval recorded, so they sit at Stage 1, clock started
   at migration); old Approved / Reimbursed claims keep their status and their
   settlement is flagged Pending Verification for Finance - neither paid nor
   unpaid until Finance confirms.

   FOLLOW-UP. A reply that changes nothing material goes back to the stage
   that asked. A material change (amount, category, sub category, dates,
   currency, beneficiary, Paid By, merchant/invoice, lines added or removed)
   re-runs the policy check and the route, and approval restarts at the first
   stage whose decision no longer holds - Stage 1 whenever that cannot be
   shown. Superseded decisions stay in history.

   MONEY. Payable = final approved amounts of lines the employee paid for.
   Company-paid lines are never reimbursed; Company Advance lines are held
   for advance settlement. Paid means a verified settlement was recorded -
   through Payroll (with its run reference) or a manual/external payment
   (with its reference and evidence) - never that a route was chosen. */

/* ── Identity ──────────────────────────────────────────────────────────── */
/* People are stored by ID (js/identity.js): approvers, deciders, submitters,
   notification readers and audit entries hold User IDs; a claim names its
   claimant by Employee ID (employeeEid). Names are looked up to be shown. */
function caMe(){return typeof idMe==='function'?idMe():'';}
function caRole(){return typeof emsRoleLabel==='function'?emsRoleLabel():'';}
function caCan(code){return typeof emsCan==='function'&&emsCan(code);}
/* ONE ENGINE, THREE KINDS OF REQUEST (Build 5). An expense claim, an advance
   request (js/advances.js) and an imprest funding / replenishment request
   all run through these stages, decisions, SLA and audit. What differs is
   which RBAC rights act on each kind, how it is validated before approval,
   and what final approval creates (a reimbursement payable, or a funding
   authorization - never money). */
const CA_KIND_PERMS={
  expense:{approve:'expense.claim.approve',submit:'expense.claim.submit',others:'expense.claim.create.others',withdraw:'expense.claim.withdraw',
    withdrawOthers:'expense.claim.withdraw.others',reassign:'expense.approval.reassign',intervene:'expense.approval.intervene'},
  advance:{approve:'advance.approve',submit:'advance.submit',others:'advance.create.others',withdraw:'advance.withdraw',
    withdrawOthers:'advance.withdraw.others',reassign:'advance.reassign',intervene:'advance.intervene'},
  imprest:{approve:'advance.replenish.approve',submit:'advance.replenish',others:'advance.imprest.manage',withdraw:'advance.replenish',
    withdrawOthers:'advance.imprest.manage',reassign:'advance.reassign',intervene:'advance.intervene'}
};
function caKind(r){return r&&r.kind&&CA_KIND_PERMS[r.kind]?r.kind:'expense';}
/* Imprest initial funding is raised by whoever manages the fund, not by the
   custodian; replenishment is the custodian's. Both are approved with
   advance.replenish.approve. */
const CA_IMPREST_INIT_PERMS={approve:'advance.replenish.approve',submit:'advance.imprest.manage',others:'advance.imprest.manage',withdraw:'advance.imprest.manage',
  withdrawOthers:'advance.imprest.manage',reassign:'advance.reassign',intervene:'advance.intervene'};
function caPk(r,k){
  if(r&&typeof r==='object'&&caKind(r)==='imprest'&&r.requestType==='Initial Funding')return CA_IMPREST_INIT_PERMS[k];
  return CA_KIND_PERMS[typeof r==='string'?r:caKind(r)][k];
}
/* A record of any kind by its id (ids never collide across the stores). */
function caRec(id){return expRec(id)||(typeof advEngineRec==='function'?advEngineRec(id):null)||caExtRec(id);}
function caAllRecs(){return expensesData.concat(typeof advEngineRecs==='function'?advEngineRecs():[]).concat(caExtRecs());}
/* REQUEST KINDS BEYOND EXPENSE CLAIMS plug into the one engine here:
   advances and imprest (js/advances.js) and Funding & Budgets workflows -
   budgets, revisions, transfers, exceptions, year close (js/budgets.js).
   A kind registers its route, preflight, final-approval and display hooks;
   CA_DECISION_CHECKS run before any decision is recorded, for every kind. */
const CA_EXT={};
const CA_DECISION_CHECKS=[];
const CA_ADV_EXT={route:function(r,i){return advRoute(r,i);},policySig:function(r){return advPolicySig(r);},preflight:function(r,o){return advPreflight(r,o);},
  onSubmit:function(r,A){return advOnSubmit(r,A);},allowsPartial:function(r){return advAllowsPartial(r);},partialMsg:'The advance policy does not allow partial approval of this request.',
  decisionCheck:function(r,it){return advDecisionCheck(r,it);},onFinal:function(r,A){return advOnFinal(r,A);},openFn:'advOpenRecord',
  reviewInfo:function(r){return advReviewInfoHTML(r);},workflowRows:function(r){return advWorkflowRows(r);},
  finalNote:'This authorizes funding only; nothing is issued until a disbursement is verified.'};
function caExt(r){const k=caKind(r);return CA_EXT[k]||((k==='advance'||k==='imprest')&&typeof advRoute==='function'?CA_ADV_EXT:null);}
function caExtRec(id){for(const k in CA_EXT){const f=CA_EXT[k].rec;if(f){const x=f(id);if(x)return x;}}return null;}
function caExtRecs(){const seen=[],out=[];for(const k in CA_EXT){const f=CA_EXT[k].recs;if(f&&seen.indexOf(f)<0){seen.push(f);out.push.apply(out,f());}}return out;}
/* Approver types a kind offers (a budget exception adds the Budget Owner). */
function caApproverTypes(kind){const x=CA_EXT[kind];return CA_APPROVER_TYPES.concat(x&&x.approverTypes||[]);}
function caApproverNeedsRef(type){return ['Role','Specific User','RBAC Team'].indexOf(type)>=0;}
/* Exact money: cents, never floating drift (FR-AI-25.12). */
function caMoney2(n){return Math.round((Number(n)||0)*100)/100;}
function caEntity(){return typeof idEntity==='function'?idEntity():'';}
function caEntityName(e){return idEntityName(e||caEntity());}
function caN(uid){return idName(uid);}
function caNs(list){return idNames(list);}
/* The claimant's own account, and whether the signed-in person is the claimant. */
function caClaimantUser(r){return r?idUserOfEmp(r.employeeEid):'';}
function caIsClaimant(r,who){who=who||caMe();return !!who&&who===caClaimantUser(r);}
/* Seed data names its people by email - the one unambiguous key. */
function caU(email){const u=idUserByEmail(email);return u?u.userId:'';}
function caUniq(a){return a.filter(function(x,i){return x&&a.indexOf(x)===i;});}
/* The app's date format (core.js cdLabel). */
function caDateLabel(iso){return iso?cdLabel(iso):'';}
function caDays(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5);}
/* An actor context: who, on which day, at what time. Seeds pass their own. */
function caNow(){const s=stampNow(),sw=typeof idSwitched==='function'&&idSwitched();return {who:caMe(),iso:wbToday(),date:s.date,time:s.time,actual:sw?idAuthMe():''};}
/* Who really acted, when it was not the person worked as (Switch User). '' otherwise. */
function caVia(A){return A&&A.actual&&A.actual!==A.who?A.actual:'';}
function caViaText(A){const v=caVia(A);return v?' [through Switch User by '+caN(v)+']':'';}
function caAt(who,iso,time){return {who:who,iso:iso,date:caDateLabel(iso),time:time||'10:00:00 AM',admin:false};}

/* ── Reporting managers: on the employee records ───────────────────────── */
/* An employee record names its reporting manager by Employee ID
   (managerEid); the Add Employee wizard saves the one HR picks. The demo
   people get one here, matched by name inside their entity only when exactly
   one employee carries it (js/identity.js). Anika's manager has left
   (inactive), so her claims show the stage fallback at work. */
const CA_MANAGER_SEED={'Syed Ayaz':'Prem Raj','Tarak Swain':'Prem Raj','Premnath Jayachandran':'Prem Raj','Arjun Nair':'Prem Raj',
  'Meera Iyer':'Prem Raj','Prem Raj':'Shaun Mathew','Vikram Rao':'Shaun Mathew','Antar Malhotra':'Prem Raj','Pallavi Parate':'Prem Raj',
  'Anika Shah':'Rahul Mehta','Dev Kulkarni':'Prem Raj','Karan Verma':'Prem Raj','Rajan Kumar':'Prem Raj','Neha Sharma':'Prem Raj',
  'Aman Singh':'Prem Raj','Emma Schmidt':'Prem Raj','Lucas Dubois':'Vikram Rao','Sofia Romano':'Pallavi Parate'};
function caStores(){
  return [typeof directEmpData!=='undefined'?directEmpData:[],
    typeof globalEmpData!=='undefined'?globalEmpData:[],typeof AX_EMPLOYEES!=='undefined'?AX_EMPLOYEES:[]];
}
(function(){caStores().forEach(function(list){list.forEach(function(p){
  if(p.managerEid)return;
  const want=p.manager||CA_MANAGER_SEED[p.name];if(!want)return;
  const m=idEmpByName(want,p.entityId);
  if(m)p.managerEid=m.eid;
  else idNote('Reporting manager',p.empId+' '+p.name,want,'No single employee with this name in '+idEntityName(p.entityId)+'; reporting manager left empty.','',p.entityId);
  delete p.manager;
});});})();
function caManagerEidOf(eid){const e=idEmp(eid);return e&&e.managerEid||'';}
/* The reporting manager's account - who approves a Reporting Manager stage. */
function caManagerOf(eid){return idUserOfEmp(caManagerEidOf(eid));}
/* Active = an active account holding a role in this entity. */
function caActive(uid){return !!uid&&uid!=='System'&&idInEntity(uid,caEntity());}

/* ── Approver sources: Roles, RBAC Teams, people ───────────────────────── */
/* Roles & Access roles whose holders can approve expenses (RBAC). */
function caApproverRoles(kind){
  const set=typeof CS_ROLE_SETS!=='undefined'?CS_ROLE_SETS['Client user']||[]:[];
  return set.filter(function(role){return caRoleUsers(role).some(function(n){return caPersonCan(n,caPk(kind||'expense','approve'));});});
}
/* The accounts holding a Roles & Access role in this entity. */
function caRoleUsers(role){
  const ent=caEntity();
  return caUniq((typeof csRoles!=='undefined'?csRoles:[]).filter(function(r){return r.role===role&&(r.entityId===ent||r.entityId==='*');}).map(function(r){return r.userId;})).filter(caActive);
}
/* Teams of the entity's RBAC workspace whose (active) template grants expense approval. */
function caTeamGrantsApproval(t,kind){
  const tp=typeof wsTpl==='function'?wsTpl(t):null;
  return !!(tp&&tp.status==='Active'&&tp.perms.indexOf(caPk(kind||'expense','approve'))>=0);
}
function caTeams(){const w=typeof emsWorkspace==='function'?emsWorkspace():null;return w?w.teams:[];}
/* A stage names an RBAC Team by its team ID; people read its name. */
function caTeamIds(kind){return caTeams().filter(function(t){return caTeamGrantsApproval(t,kind);}).map(function(t){return t.id;});}
function caTeamName(id){const t=caTeams().find(function(x){return x.id===Number(id);});return t?t.name:'team #'+id;}
function caTeamApprovers(id,kind){
  const t=caTeams().find(function(x){return x.id===Number(id);});
  return t&&caTeamGrantsApproval(t,kind)?caUniq(t.members).filter(caActive):[];
}
/* Does this person hold expense approval through an RBAC team? */
/* Everyone who can be named as a stage approver, fallback or escalation target. */
function caApproverPool(kind){
  kind=kind||'expense';
  let out=[];
  caApproverRoles(kind).forEach(function(r){out=out.concat(caRoleUsers(r));});
  caTeamIds(kind).forEach(function(n){out=out.concat(caTeamApprovers(n,kind));});
  idEmpsIn(caEntity()).forEach(function(p){if(p.managerEid)out.push(idUserOfEmp(p.managerEid));});
  return caUniq(out).filter(function(n){return caActive(n)&&caPersonCan(n,caPk(kind,'approve'));})
    .sort(function(a,b){return caN(a).localeCompare(caN(b));});
}
/* An account's RBAC rights (roles held here + workspace teams); the
   signed-in person's are those of the role in use. */
function caPersonCan(uid,code){
  if(uid&&uid===caMe())return caCan(code);
  return typeof emsPersonCan==='function'&&emsPersonCan(uid,code);
}
/* Everyone in this entity who holds an RBAC right (role holders + team members). */
function caPermHolders(code){return caUniq(emsPermHolders(code)).filter(caActive);}

/* ── Approval workflows (Expenses → Approval Settings) ─────────────────── */
const CA_APPLIES=['Entity','Department','Position','Employee'];
const CA_APPLIES_RANK={'Employee':4,'Position':3,'Department':2,'Entity':1};
const CA_APPROVER_TYPES=['Reporting Manager','Role','Specific User','RBAC Team'];
const CA_RULES=['Any One','All'];
const CA_COMMENT_RULES=['Required for Reject / Follow-Up','Always required','Optional'];
const CA_SLA_DEFAULT=3;   // calendar days
/* Entity defaults (Approval Settings → Entity defaults): SLA days and the
   escalation authority ('' = the entity's Entity Super Admin). */
const caEntityCfg={};
function caCfg(ent){ent=ent||caEntity();return caEntityCfg[ent]||(caEntityCfg[ent]={sla:CA_SLA_DEFAULT,escalation:'',payrollExpenses:true,logs:[]});}
function caStageSla(st){return Number(st&&st.sla)||caCfg().sla;}
function caCfgSave(sla,esc,A){
  if(!caCan('expense.approval.config.manage'))return caRole()+' cannot change approval defaults.';
  A=A||caNow();
  const n=parseInt(sla,10);
  if(isNaN(n)||n<1||n>60)return 'The default SLA must be 1 to 60 calendar days.';
  if(esc&&caApproverPool().indexOf(esc)<0)return caN(esc)+' does not hold expense approval.';
  const c=caCfg(),was=c.sla+' days / '+(c.escalation?caN(c.escalation):'Entity Super Admin');
  c.sla=n;c.escalation=esc||'';
  c.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,action:'Defaults changed from '+was+' to '+n+' days / '+(c.escalation?caN(c.escalation):'Entity Super Admin')+'.'});
  return '';
}
const CA_MAX_STAGES=4;
/* The seeded team, by its ID in the home entity's workspace. */
function caSeedTeamId(name){
  const w=(typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).find(function(x){return x.entityId===ID_HOME_ENTITY;});
  const t=w?w.teams.find(function(x){return x.name===name;}):null;return t?t.id:'';
}
function caStageDef(n,name,type,ref,o){
  o=o||{};
  return {n:n,name:name,type:type,ref:ref||'',rule:o.rule||'Any One',fallback:o.fallback||'',sla:o.sla?Number(o.sla):'',
    escalation:o.escalation||'',comment:o.comment||CA_COMMENT_RULES[0],active:o.active!==false};
}
function caWfSeed(id,name,o,stages){
  const w=Object.assign({id:id,key:id,name:name,entity:ID_HOME_ENTITY,category:'All',subCat:'',appliesTo:'Entity',dept:'',position:'',employeeEid:'',
    minAmt:'',maxAmt:'',thrCur:'INR',effFrom:'2026-04-01',effTo:'',desc:'',status:'Active',createdBy:caU('shaun@testemp.com'),createdAt:'01 Apr 2026 | 09:30:00 AM'},o||{});
  w.stages=stages;w.version=1;
  w.versions=[{v:1,at:w.createdAt,by:w.createdBy,reason:'Created',stages:JSON.parse(JSON.stringify(stages))}];
  if(w.status!=='Draft')w.activatedOn=w.effFrom;
  return w;
}
const caWorkflows=[
  caWfSeed(1,'Default - Manager then Finance',{desc:'Every claim in the entity: the reporting manager checks the business need, Finance checks documents and the eligible amount.'},[
    caStageDef(1,'Manager review','Reporting Manager','',{fallback:caU('pallavi@testemp.com')}),
    caStageDef(2,'Finance review','Role','Finance/Billing Admin',{fallback:caU('shaun@testemp.com')})]),
  caWfSeed(2,'High-value travel - three stages',{category:'Travel Reimbursement',minAmt:'50000',thrCur:'INR',
    desc:'Travel claims of ₹50,000 or more add a budget review by the Expense Approvers team (both members must agree).'},[
    caStageDef(1,'Manager review','Reporting Manager','',{fallback:caU('pallavi@testemp.com')}),
    caStageDef(2,'Budget review','RBAC Team',String(caSeedTeamId('Expense Approvers')),{rule:'All',fallback:caU('shaun@testemp.com')}),
    caStageDef(3,'Finance review','Role','Finance/Billing Admin',{fallback:caU('shaun@testemp.com')})]),
  caWfSeed(3,'Sales - Finance only',{appliesTo:'Department',dept:'Sales',status:'Draft',createdBy:caU('pallavi@testemp.com'),createdAt:'02 Nov 2026 | 11:15:00 AM',
    desc:'Proposed: Sales claims go straight to Finance. Not active yet.'},[
    caStageDef(1,'Finance review','Role','Finance/Billing Admin',{fallback:caU('shaun@testemp.com')})])
];
let caWfNext=4;
function caWfRec(id){return caWorkflows.find(function(w){return w.id===id;})||null;}
function caWfKey(w){return 'AWF-'+w.key;}
function caWfShown(w){
  if(w.status!=='Active')return w.status;
  const t=wbToday();
  if(w.effFrom&&t<w.effFrom)return 'Scheduled';
  if(w.effTo&&t>w.effTo)return 'Expired';
  return 'Active';
}
function caWfInForce(w,iso){return w.status==='Active'&&w.entity===caEntity()&&(!w.effFrom||iso>=w.effFrom)&&(!w.effTo||iso<=w.effTo);}
function caWfPriority(w){return CA_APPLIES_RANK[w.appliesTo]*100+(w.subCat?20:(w.category!=='All'?10:0))+((w.minAmt||w.maxAmt)?1:0);}
function caWfScope(w){
  if(w.appliesTo==='Employee')return idEmpName(w.employeeEid)||'(employee not found)';
  if(w.appliesTo==='Department')return w.dept;
  if(w.appliesTo==='Position')return w.position+(w.dept?' · '+w.dept:'');
  return 'Whole entity';
}
function caWfBand(w){
  if(!w.minAmt&&!w.maxAmt)return 'Any amount';
  const f=function(v){return Number(v).toLocaleString('en-IN');};
  return (w.minAmt?f(w.minAmt):'0')+(w.maxAmt?' – '+f(w.maxAmt):' and above')+' '+w.thrCur;
}
function caStagePath(stages){return stages.filter(function(s){return s.active;}).map(function(s){return s.name;}).join(' → ');}
/* What a stage's reference names, as people read it. */
function caRefName(s){return s.type==='Specific User'?caN(s.ref):s.type==='RBAC Team'?caTeamName(s.ref):s.ref;}
function caStageWho(s){
  if(s.type==='Reporting Manager'||!caApproverNeedsRef(s.type))return s.type;
  return s.type+': '+caRefName(s)+((s.type==='Role'||s.type==='RBAC Team')?' ('+s.rule+')':'');
}

/* ── Matching a claim to a workflow ────────────────────────────────────── */
function caTotal(r){return (r.lines||[]).reduce(function(s,l){return s+(parseFloat(l.amount)||0);},0);}
/* true | false | {fx:'...'} when an amount band cannot be checked. */
function caWfKindOf(w){return w.kind||'Expense';}
function caWfMatches(w,r,iso){
  if(!caWfInForce(w,iso))return false;
  if(caWfKindOf(w)!=='Expense')return false;   // advance and imprest routes are chosen by their type (js/advances.js)
  if(w.category!=='All'&&w.category!==r.category)return false;
  if(w.subCat&&!(r.lines||[]).some(function(l){return l.subCat===w.subCat;}))return false;
  const p=typeof expPerson==='function'?expPerson(r.employeeEid):null;
  if(w.appliesTo==='Employee'&&w.employeeEid!==r.employeeEid)return false;
  if(w.appliesTo==='Department'&&(!p||p.dept!==w.dept))return false;
  if(w.appliesTo==='Position'&&(!p||p.position!==w.position||(w.dept&&p.dept!==w.dept)))return false;
  if(w.minAmt||w.maxAmt){
    const cv=epConvert(caTotal(r),r.currency,w.thrCur,iso);
    if(!cv)return {fx:'No exchange rate from '+r.currency+' to '+w.thrCur+' on '+caDateLabel(iso)+' to check the amount band of '+caWfKey(w)+'.'};
    if(w.minAmt&&cv.amount<parseFloat(w.minAmt))return false;
    if(w.maxAmt&&cv.amount>parseFloat(w.maxAmt))return false;
  }
  return true;
}
/* {wf} or {error}. Unmatched and tied routes are exceptions, never guesses. */
function caRoute(r,iso){
  if(caKind(r)!=='expense'){const ex=caExt(r);return ex&&ex.route?ex.route(r,iso):{error:'This request type has no approval route.'};}
  iso=iso||wbToday();
  const hits=[],fx=[];
  caWorkflows.forEach(function(w){const m=caWfMatches(w,r,iso);if(m===true)hits.push(w);else if(m&&m.fx)fx.push(m.fx);});
  if(fx.length)return {error:fx[0]+' The route cannot be chosen until Opendhi adds the rate.'};
  if(!hits.length)return {error:'No active approval workflow applies to this claim in '+caEntityName()+'. Contact OpenDhi to set up an approval route.'};
  hits.sort(function(a,b){return caWfPriority(b)-caWfPriority(a);});
  const tied=hits.filter(function(w){return caWfPriority(w)===caWfPriority(hits[0]);});
  if(tied.length>1)return {error:'Approval workflows '+tied.map(caWfKey).join(' and ')+' both apply with the same priority. An administrator must resolve the conflict.'};
  return {wf:hits[0]};
}

/* ── Resolving who approves a stage ─────────────────────────────────────── */
/* Never an approver: the claimant, whoever created or submitted it, and anyone
   who prepared it since (administrative edits, Follow-Up answers on behalf). */
function caExcluded(r){const ex=caExt(r),more=ex&&ex.excluded?ex.excluded(r)||[]:[];return caUniq([caClaimantUser(r),r.submittedBy,r.createdBy].concat(r.preparers||[]).concat(more));}
function caAddPreparer(r,who){if(who&&!caIsClaimant(r,who)){r.preparers=r.preparers||[];if(r.preparers.indexOf(who)<0)r.preparers.push(who);}}
function caResolve(st,r){
  const excl=caExcluded(r);
  let list=[],why='';
  const ap=caPk(r,'approve');
  if(st.type==='Reporting Manager'){
    const mEid=caManagerEidOf(r.employeeEid),m=caManagerOf(r.employeeEid);
    if(m)list=[m];
    else why=mEid?idEmpName(mEid)+', the reporting manager on '+r.name+'\'s employee record, has no ADT account':'no reporting manager on '+r.name+'\'s employee record';
  }else if(st.type==='Role'){list=caRoleUsers(st.ref);if(!list.length)why='nobody active holds the role '+st.ref+' in '+caEntityName();}
  else if(st.type==='Specific User'){list=[st.ref];}
  else if(st.type==='RBAC Team'){list=caTeamApprovers(st.ref,caKind(r));if(!list.length)why='team '+caTeamName(st.ref)+' has no active member with '+((CA_EXT[caKind(r)]&&CA_EXT[caKind(r)].approvalNoun)||'expense')+' approval';}
  else{const ex=caExt(r),fn=ex&&ex.resolveStage&&ex.resolveStage[st.type];if(fn){const res=fn(r)||{};list=res.list||[];why=res.why||'';}else why='approver type '+st.type+' is not available for this request type';}
  const valid=caUniq(list).filter(function(n){return caActive(n)&&excl.indexOf(n)<0&&caPersonCan(n,ap);});
  if(!why&&list.length&&!valid.length){
    why=list.map(function(n){return caN(n)+(caActive(n)?(excl.indexOf(n)>=0?' (the claimant or submitter)':(caPersonCan(n,ap)?'':' (no approval right in RBAC for this request type)')):' (inactive)');}).join(', ')+' cannot approve';
  }
  if(valid.length)return {approvers:valid,fallbackUsed:false,note:''};
  if(st.fallback&&caActive(st.fallback)&&excl.indexOf(st.fallback)<0&&caPersonCan(st.fallback,ap))return {approvers:[st.fallback],fallbackUsed:true,note:why};
  return {approvers:[],error:'Stage '+st.n+' ('+st.name+'): '+why+(st.fallback?'; the fallback '+caN(st.fallback)+' is not eligible either':'; no fallback approver is set')+'.'};
}

/* ── Duplicate checks (FR-CA-19) ───────────────────────────────────────── */
const CA_DUP_STATUSES=['Awaiting Approval','Follow-Up','Approved','Partially Approved','Reimbursed'];
function caNorm(v){return String(v||'').trim().toLowerCase();}
/* Lines of other claims that look like these. ctx = {eid, category, currency, lines, claimId, revisedFrom}. */
function caDupMatches(ctx){
  const out=[];
  if(ctx&&ctx.kind&&ctx.kind!=='expense')return out;
  if(!ctx||!ctx.eid)return out;
  const skip=[ctx.claimId,ctx.revisedFrom].filter(function(x){return x!=null;});
  (ctx.lines||[]).forEach(function(l,i){
    if(!(parseFloat(l.amount)>0))return;
    expensesData.forEach(function(c){
      if(skip.indexOf(c.id)>=0||c.revisedFrom!=null&&skip.indexOf(c.revisedFrom)>=0)return;
      if(c.employeeEid!==ctx.eid||CA_DUP_STATUSES.indexOf(c.status)<0||c.entity!==caEntity())return;
      c.lines.forEach(function(m){
        if(m.status==='Rejected')return;
        const same=c.category===ctx.category&&Number(m.amount)===Number(l.amount)&&c.currency===ctx.currency&&m.start===l.start;
        const receipt=caNorm(l.invoice)&&caNorm(l.merchant)&&caNorm(l.invoice)===caNorm(m.invoice)&&caNorm(l.merchant)===caNorm(m.merchant);
        if(same||receipt)out.push({idx:i,title:l.title,ref:expKey(c),claimId:c.id,lineTitle:m.title,status:c.status,
          why:receipt?'same merchant and invoice number ('+m.merchant+' · '+m.invoice+')':'same category, amount, currency and expense date'});
      });
    });
  });
  return out;
}

/* ── Snapshots and change classification ───────────────────────────────── */
function caLineSig(l){return [Number(l.amount),l.subCat,l.start,l.end||l.start,l.paidBy||'',caNorm(l.merchant),caNorm(l.invoice),l.advanceId||'',Number(l.advAmount)||0,
  l.paidBy==='Corporate Card'?l.cardId||'':'',l.paidBy==='Corporate Card'?Number(l.cardAmount)||0:''].join('|');}
function caPolicySig(r){
  if(caKind(r)!=='expense'){const ex=caExt(r);return ex&&ex.policySig?ex.policySig(r):'';}
  if(typeof epEvaluate!=='function')return '';
  const ev=epEvaluate(epCtxOf(r));
  return ev.results.map(function(x){return x.key+':'+x.result+':'+Math.round(x.exceeded);}).sort().join(',')+'|'+ev.split.length;
}
function caSnap(r){
  const lines={};r.lines.forEach(function(l){lines[l.id]={sig:caLineSig(l),proof:l.proof,title:l.title,comments:l.comments||''};});
  return {eid:r.employeeEid,category:r.category,currency:r.currency,title:r.title,notes:r.notes||'',lines:lines,policy:caPolicySig(r),purpose:r.purpose||''};
}
/* What changed since a snapshot: {material:[...], minor:[...], changedIds, addedIds, removedIds}. */
function caChanges(r,s){
  const mat=[],min=[],changed=[],added=[],removed=[];
  if(r.employeeEid!==s.eid)mat.push('Beneficiary '+idEmpName(s.eid)+' → '+idEmpName(r.employeeEid));
  if(r.category!==s.category)mat.push('Category '+s.category+' → '+r.category);
  if(r.currency!==s.currency)mat.push('Currency '+s.currency+' → '+r.currency);
  /* An advance's purpose decides its eligibility: a change is material. */
  if(caKind(r)!=='expense'&&(r.purpose||'')!==(s.purpose||''))mat.push('Purpose');
  if(r.title!==s.title)min.push('Title');
  if((r.notes||'')!==s.notes)min.push('Notes');
  r.lines.forEach(function(l){
    const o=s.lines[l.id];
    if(!o){added.push(l.id);mat.push('Line added: '+l.title);return;}
    if(o.sig!==caLineSig(l)){
      changed.push(l.id);
      const a=o.sig.split('|'),b=caLineSig(l).split('|');
      const names=['amount','sub category','start date','end date','Paid By','merchant','invoice number','advance reference','advance-funded amount','corporate card','card-funded amount'];
      mat.push(l.title+': '+names.filter(function(n,i){return a[i]!==b[i];}).join(', '));
    }
    if(o.proof!==l.proof)min.push(l.title+': new supporting document');
    if(o.title!==l.title||o.comments!==(l.comments||''))min.push(l.title+': description');
  });
  Object.keys(s.lines).forEach(function(id){if(!r.lines.some(function(l){return String(l.id)===id;})){removed.push(Number(id));mat.push('Line removed: '+s.lines[id].title);}});
  return {material:mat,minor:min,changedIds:changed,addedIds:added,removedIds:removed};
}

/* ── Logs and notifications ────────────────────────────────────────────── */
function caLog(r,status,action,A){
  A=A||caNow();
  if(typeof expSeedLogs==='function')expSeedLogs(r);else r.logs=r.logs||[];
  const via=caVia(A),row={date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:status,action:action+caViaText(A)};
  if(via)row.actualUserId=via;
  r.logs.unshift(row);
}
function caLineLog(r,l,status,action,A){
  A=A||caNow();
  if(typeof expSeedLineLogs==='function')expSeedLineLogs(r,l);else l.logs=l.logs||[];
  l.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:status,action:action});
}
/* The existing bell (core.js notifData). A notification names its readers by
   User ID and its entity by Entity ID; only they see it, only there. */
let caNotifSilent=false;
function caNotify(to,text,r){
  if(caNotifSilent||typeof notifData==='undefined')return;
  const list=caUniq([].concat(to||[])).filter(function(u){return u&&u!=='System';});if(!list.length)return;
  notifData.unshift({name:text,cid:r?expKey(r):'',time:'just now',pending:true,to:list,entity:(r&&r.entity)||caEntity()});
  if(typeof notifSyncBell==='function')notifSyncBell();
}
function caClaimants(r){return caUniq([caClaimantUser(r),r.submittedBy]);}

/* ── Workflow instance ─────────────────────────────────────────────────── */
function caNewStage(def,idx){
  return {n:idx+1,name:def.name,type:def.type,ref:def.ref,rule:def.rule,fallback:def.fallback,sla:def.sla?Number(def.sla):'',
    escalation:def.escalation||'',comment:def.comment||CA_COMMENT_RULES[0],approvers:[],fallbackUsed:false,note:'',exception:'',
    status:'Pending',decisions:[],reassigns:[],lineIds:[],assignedAt:'',pausedDays:0,fuStart:'',escalated:false,escalatedTo:[],completedAt:''};
}
function caActiveDefs(w){return w.stages.filter(function(s){return s.active;});}
/* Everything that must hold before a claim enters Awaiting Approval. Returns
   {error} or {wf, resolved}. r must carry name/category/currency/lines/submittedBy. */
function caPreflight(r,o){
  o=o||{};
  if(caKind(r)!=='expense'){const ex=caExt(r);return ex&&ex.preflight?ex.preflight(r,o):{error:'This request type is not available.'};}
  if(!r.lines.length)return {error:'A claim needs at least one line item before it can be submitted.'};
  /* Lines filed before Paid By existed are exempt until someone edits them. */
  const np=r.lines.find(function(l){return !l.paidBy&&!l.legacyNoPaidBy;});
  if(np&&!o.legacy)return {error:'"'+np.title+'": say who paid for it (Expense Paid By).'};
  const bad=r.lines.find(function(l){return !(parseFloat(l.amount)>0)||!l.start||(l.end&&l.end<l.start);});
  if(bad)return {error:'"'+bad.title+'": amount and dates are not valid.'};
  if(!o.legacy&&typeof epGate==='function'){
    const g=epGate(epCtxOf(r),r.policyJust);
    if(g)return {error:g,policy:true};
  }
  if(!o.legacy){
    const d=caDupMatches({eid:r.employeeEid,category:r.category,currency:r.currency,lines:r.lines,claimId:r.id,revisedFrom:r.revisedFrom});
    if(d.length&&!String(r.dupJust||'').trim())return {error:'Potential duplicate of '+d[0].ref+' ("'+d[0].lineTitle+'", '+d[0].why+'). Add a Duplicate Expense Justification to continue.',dup:true};
  }
  /* Advance-funded lines: the advance must still have the money (js/advances.js). */
  if(typeof advCheckClaimFunding==='function'){const fe=advCheckClaimFunding(r);if(fe)return {error:fe,funding:true};}
  const rt=caRoute(r,o.iso);
  if(rt.error)return {error:rt.error,route:true};
  const defs=caActiveDefs(rt.wf);
  if(!defs.length)return {error:caWfKey(rt.wf)+' has no active stage.',route:true};
  const res=defs.map(function(d){return caResolve(d,r);});
  const fail=res.find(function(x){return x.error;});
  if(fail)return {error:'Approval cannot start - '+fail.error+' Ask an administrator to fix the route or reassign.',route:true};
  return {wf:rt.wf,resolved:res};
}
function caInstance(wf){
  return {wfId:wf.id,wfKey:caWfKey(wf),wfName:wf.name,version:wf.version,stages:caActiveDefs(wf).map(caNewStage),
    current:0,round:1,open:true,superseded:[],fu:null,fuHistory:[],editSnap:null};
}
/* Put stage idx in front of its approvers. */
function caActivate(r,idx,A,why,keepStatus){
  A=A||caNow();
  const st=r.wf.stages[idx];
  const res=caResolve(st,r);
  st.approvers=res.approvers||[];st.fallbackUsed=!!res.fallbackUsed;st.note=res.note||'';st.exception=res.error||'';
  st.status='Awaiting Decision';st.assignedAt=A.iso;st.pausedDays=0;st.escalated=false;st.escalatedTo=[];st.decisions=st.decisions||[];
  st.lineIds=r.lines.filter(function(l){return caCeiling(l)>0&&l.status!=='Rejected';}).map(function(l){return l.id;});
  r.wf.current=idx;
  caLog(r,keepStatus?r.status:'Awaiting Approval',(why?why+' ':'')+'Stage '+st.n+' of '+r.wf.stages.length+' ('+st.name+') assigned to '
    +(st.approvers.length?caNs(st.approvers)+(st.rule==='All'&&st.approvers.length>1?' (all must decide)':''):'nobody')
    +(st.fallbackUsed?' - fallback, because '+st.note:'')+(st.exception?' - ASSIGNMENT EXCEPTION: '+st.exception:'')+'.',A);
  if(st.approvers.length)caNotify(st.approvers,expKey(r)+' awaits your approval - Stage '+st.n+' · '+st.name,r);
}
/* Draft → Awaiting Approval: one workflow instance, never two. */
function caStart(r,pre,A,o){
  A=A||caNow();o=o||{};
  if(r.wf&&r.wf.open)return false;
  r.entity=r.entity||caEntity();
  r.wf=caInstance(pre.wf);
  if(o.migrate){
    /* Controlled migration: status, dates and line decisions stay as they were. */
    r.submittedBy=r.submittedBy||r.createdBy;r.submittedAt=r.submittedAt||(r.appliedOn?caDateLabel(r.appliedOn):'');
    caLog(r,r.status,'Migrated to approval routing: assigned '+r.wf.wfKey+' v'+r.wf.version+' ('+r.wf.stages.map(function(s){return s.name;}).join(' → ')
      +'). No stage approval was recorded before routing existed, so the claim is at Stage 1; its status, line decisions and logs are kept. The SLA starts today.',A);
    caActivate(r,0,A,'',true);
    return true;
  }
  r.submittedBy=r.submittedBy||A.who;r.submittedAt=A.date+' | '+A.time;
  r.status='Awaiting Approval';r.appliedOn=A.iso;
  r.lines.forEach(function(l){if(l.status!=='Rejected'){l.status='Pending';l.approved=null;l.approvedAdv=null;l.reason='';}});
  if(caKind(r)!=='expense'){
    {const ex=caExt(r);if(ex&&ex.onSubmit)ex.onSubmit(r,A);}
    caLog(r,'Awaiting Approval',(o.silentSubmitLog?'':'Submitted for approval: ')+expMoney(caTotal(r),r.currency)+'. Route '+r.wf.wfKey+' v'+r.wf.version+': '+r.wf.stages.map(function(s){return s.name;}).join(' → ')+'.',A);
    caActivate(r,0,A);
    return true;
  }
  if(typeof epSnapshot==='function')epSnapshot(r);
  const dups=caDupMatches({eid:r.employeeEid,category:r.category,currency:r.currency,lines:r.lines,claimId:r.id,revisedFrom:r.revisedFrom});
  r.dupCheck={at:A.date+' | '+A.time,matches:dups,just:dups.length?String(r.dupJust||'').trim():''};
  if(!o.silentSubmitLog)caLog(r,'Awaiting Approval','Submitted for approval with '+r.lines.length+' line item'+(r.lines.length===1?'':'s')
    +' ('+expMoney(caTotal(r),r.currency)+'). Route '+r.wf.wfKey+' v'+r.wf.version+': '+r.wf.stages.map(function(s){return s.name;}).join(' → ')+'.'
    +(dups.length?' Potential duplicate of '+caUniq(dups.map(function(d){return d.ref;})).join(', ')+' - justified: "'+r.dupCheck.just+'".':''),A);
  caActivate(r,0,A);
  return true;
}

/* ── Line amounts ──────────────────────────────────────────────────────── */
/* What a line may still be approved for: its amount, or what an earlier stage allowed. */
function caCeiling(l){return l.approved!=null?Number(l.approved):Number(l.amount)||0;}
/* A line paid partly from a company advance carries a split: the advance part
   and the employee part. Each stage may confirm or reduce either part, never
   raise it; together they are what the line is approved at. */
function caIsFunded(l){return !!(l&&l.paidBy==='Company Advance'&&l.advanceId);}
function caCeilAdv(l){if(!caIsFunded(l))return 0;return l.approvedAdv!=null?Number(l.approvedAdv):caMoney2(Math.min(Number(l.advAmount)||0,Number(l.amount)||0));}
function caCeilEmp(l){return caMoney2(caCeiling(l)-caCeilAdv(l));}
function caApprovedTotal(r){return r.lines.reduce(function(s,l){return s+(l.approved!=null?Number(l.approved):0);},0);}
function caActiveStage(r){return r.wf&&r.wf.open?r.wf.stages[r.wf.current]||null:null;}

/* ── Who may do what ───────────────────────────────────────────────────── */
function caSoD(r,who){
  who=who||caMe();
  if(caIsClaimant(r,who))return caN(who)+' is the claimant';
  if(who===r.submittedBy||who===r.createdBy)return caN(who)+' submitted this claim';
  if((r.preparers||[]).indexOf(who)>=0)return caN(who)+' prepared changes to this claim';
  return '';
}
function caHasApprovalRight(who,r){return caPersonCan(who||caMe(),caPk(r,'approve'));}
/* B7-N05 (7 Nov 2026): the people a stage allows, however they come to it (route, reassignment or Super
   Admin intervention). A team stage: the team's active members with the approval right. A role stage: the
   role's holders. Other stages (Reporting Manager, a named person): anyone with the approval right. */
/* B7-N05 as finalized (product owner, 7 Nov 2026): the stage-fit controls bind card and budget approvals, whose
   request types declare stageFit. Expense, advance and imprest keep their finalized Build 4/5 rules unchanged. */
function caFitKind(r){const ex=caExt(r);return !!(ex&&ex.stageFit);}
function caStageEligible(r,st){
  const ex=caExt(r);if(ex&&ex.stageEligible)return ex.stageEligible(r,st);
  if(st.type==='RBAC Team')return caTeamApprovers(st.ref,caKind(r));
  if(st.type==='Role')return caRoleUsers(st.ref);
  return null;
}
/* '' when `who` may take this stage: active, independent (separation of duties and independent stages),
   holding the approval right, and in the stage's team or role. Otherwise why not. */
function caStageFit(r,st,who){
  if(!caActive(who))return caN(who)+' is not an active user in '+caEntityName()+'.';
  const sod=caSoD(r,who);if(sod)return 'Separation of duties: '+sod+'.';
  if(caExcluded(r).indexOf(who)>=0)return 'Separation of duties: '+caN(who)+' decided an earlier stage of this request, and its stages need different approvers.';
  if(caApproverPool(caKind(r)).indexOf(who)<0)return caN(who)+' does not hold the approval right for this request type.';
  const el=caStageEligible(r,st);
  if(el&&el.indexOf(who)<0)return caN(who)+' is not '+(st.type==='RBAC Team'?'an active member of the team '+caTeamName(st.ref):'a holder of the role '+st.ref)+', which stage '+st.n+' ('+st.name+') requires.';
  return '';
}
/* The last decision each approver made on each line in this stage. */
function caStageDecided(st,who,lineId){return st.decisions.some(function(d){return d.who===who&&d.lineId===lineId&&d.decision!=='Follow-Up'&&!d.void;});}
function caCanDecide(r,who){
  who=who||caMe();
  if(!r||r.status!=='Awaiting Approval')return false;
  const st=caActiveStage(r);if(!st||st.status!=='Awaiting Decision')return false;
  if(caSoD(r,who))return false;
  /* An assigned, independent approver with the RBAC right... */
  if(st.approvers.indexOf(who)>=0&&caHasApprovalRight(who,r))
    return st.lineIds.some(function(id){return !caStageDecided(st,who,id)&&!caStageResult(st,r.lines.find(function(l){return l.id===id;}));});
  /* ...or an audited Super Admin intervention. */
  return caCanIntervene(r,who);
}
/* Approvers of a stage who have not decided anything yet. */
function caUndecided(st){return st.approvers.filter(function(n){return !st.decisions.some(function(d){return d.who===n&&!d.void&&d.decision!=='Follow-Up';});});}
function caIsIntervention(r,who){who=who||caMe();const st=caActiveStage(r);return !!st&&st.approvers.indexOf(who)<0;}
/* Intervene (RBAC expense.approval.intervene) on a stage you are not assigned to:
   Any One - while a line is open; All - while an approver is still undecided. */
function caCanIntervene(r,who){
  who=who||caMe();
  if(who!==caMe()||!caCan(caPk(r,'intervene')))return false;
  const st=caActiveStage(r);if(!st||st.approvers.indexOf(who)>=0||caSoD(r,who))return false;
  if(caFitKind(r)&&caStageFit(r,st,who))return false;   // card and budget approvals: an intervention meets the stage's own controls (B7-N05)
  const open=st.lineIds.some(function(id){return !caStageResult(st,r.lines.find(function(l){return l.id===id;}));});
  if(st.rule==='All'&&st.approvers.length>1)return open&&caUndecided(st).length>0;
  return open;
}
function caWhyNotDecide(r){
  const who=caMe();
  if(r.status!=='Awaiting Approval')return 'The claim is '+r.status+'.';
  const sod=caSoD(r,who);if(sod)return 'Separation of duties: '+sod+', so a different authorised person must approve it.';
  const st=caActiveStage(r);if(!st)return 'No stage is active.';
  if(st.approvers.indexOf(who)<0){
    const fit=caFitKind(r)&&caCan(caPk(r,'intervene'))?caStageFit(r,st,who):'';
    return 'Stage '+st.n+' is assigned to '+(caNs(st.approvers)||'nobody')+(st.rule==='All'&&st.approvers.length>1?' (all must decide)':'')+'.'
      +(fit?' You cannot decide it in their place: '+fit:'')+(caCanReassign(r)?' You can reassign it (audited).':'');
  }
  if(!caHasApprovalRight(who,r))return 'You are assigned to Stage '+st.n+' but your role has no expense approval right in RBAC.';
  return 'You have already decided every line at this stage.';
}
function caCanSubmit(r){
  if(!r||r.status!=='Draft')return false;
  const me=caMe();
  if(caIsClaimant(r,me)||r.createdBy===me)return caCan(caPk(r,'submit'));
  return caCan(caPk(r,'others'));
}
function caCanRespond(r){
  if(!r||r.status!=='Follow-Up')return false;
  const me=caMe();
  return ((caIsClaimant(r,me)||me===r.submittedBy)&&caCan(caPk(r,'submit')))||caCan(caPk(r,'withdrawOthers'));
}
function caCanWithdraw(r){
  if(!r||['Awaiting Approval','Follow-Up'].indexOf(r.status)<0)return false;
  const me=caMe();
  if((caIsClaimant(r,me)||me===r.submittedBy)&&caCan(caPk(r,'withdraw')))return true;
  return caCan(caPk(r,'withdrawOthers'));
}
function caCanReassign(r){
  const st=caActiveStage(r);
  if(!st||r.status!=='Awaiting Approval')return false;
  if(caSoD(r,caMe()))return false;   // never on a claim you filed, submitted or prepared
  if(caCan(caPk(r,'reassign')))return true;
  return st.escalated&&st.escalatedTo.indexOf(caMe())>=0;
}

/* ── Decisions ─────────────────────────────────────────────────────────── */
/* One stage's result for a line: Any One - the latest decision; All - every
   assigned approver's, the most restrictive (one rejection rejects). */
function caStageResult(st,l){
  if(!l)return null;
  const ds=st.decisions.filter(function(d){return d.lineId===l.id&&d.decision!=='Follow-Up'&&!d.void;});
  if(!ds.length)return null;
  if(st.rule!=='All'||st.approvers.length<2)return ds[ds.length-1];
  const per={};ds.forEach(function(d){per[d.who]=d;});
  const all=Object.keys(per).map(function(k){return per[k];});
  const rej=all.find(function(d){return d.decision==='Rejected';});
  if(rej)return rej;
  if(st.approvers.some(function(a){return !per[a];}))return null;
  return all.reduce(function(m,d){return d.amount<m.amount?d:m;});
}
/* p = {scope:'claim'|'lines', decision, reason, comment, lines:{id:{decision, amount, reason}}}.
   Returns '' or an error. The same function serves the Review modal, Logs
   and the row menu. */
function caDecide(id,p,A){
  const r=caRec(id);if(!r)return 'No such claim.';
  A=A||caNow();
  if(!caCanDecide(r,A.who))return caWhyNotDecide(r);
  const st=caActiveStage(r);
  /* Super Admin intervention: validated now, applied only when a decision is recorded. */
  const iv=st.approvers.indexOf(A.who)<0;
  const ivWhy=iv?String(p.why||'').trim()||String(p.comment||'').trim()||(p.scope==='claim'?String(p.reason||'').trim():''):'';
  const ivAll=iv&&st.rule==='All'&&st.approvers.length>1;
  if(iv&&!ivWhy)return 'A Super Admin intervention needs a reason - it is recorded with the decision.';
  if(ivAll&&caUndecided(st).indexOf(p.onBehalf||'')<0)return 'Pick the undecided approver this decision stands in for ('+caNs(caUndecided(st))+'). The other approvers still decide.';
  const admin=iv&&!ivAll;
  let ivDone=false;
  const commit=function(){
    if(!iv||ivDone)return;ivDone=true;
    if(ivAll){
      st.reassigns.push({from:[p.onBehalf],to:A.who,by:A.who,date:A.date,time:A.time,reason:ivWhy,intervention:true,actual:caVia(A)});
      st.approvers=st.approvers.map(function(n){return n===p.onBehalf?A.who:n;});
      caLog(r,'Awaiting Approval','Super Admin intervention by '+caN(A.who)+' at Stage '+st.n+' ('+st.name+', All): stands in for undecided approver '+caN(p.onBehalf)
        +'; '+caNs(st.approvers.filter(function(n){return n!==A.who;}))+' must still approve (a rejection by any approver rejects). Reason: '+ivWhy,A);
      caNotify([p.onBehalf],expKey(r)+': '+caN(A.who)+' (Super Admin) decided in your place at Stage '+st.n,r);
    }else{
      caLog(r,'Awaiting Approval','Super Admin intervention by '+caN(A.who)+' at Stage '+st.n+' ('+st.name+', '+st.rule+') - not an assigned approver ('+(caNs(st.approvers)||'none')+'). Reason: '+ivWhy,A);
      caNotify(st.approvers,expKey(r)+': '+caN(A.who)+' (Super Admin) decided Stage '+st.n,r);
    }
  };
  const open=st.lineIds.filter(function(lid){const l=r.lines.find(function(x){return x.id===lid;});return l&&!caStageResult(st,l)&&(admin||!caStageDecided(st,A.who,lid));});
  const rule=st.comment||CA_COMMENT_RULES[0];
  const comment=String(p.comment||'').trim();
  let items=[];
  if(p.scope==='claim'){
    const reason=String(p.reason||'').trim();
    if(['Approve','Reject','Follow-Up'].indexOf(p.decision)<0)return 'Pick a decision.';
    if(p.decision!=='Approve'&&!reason)return (p.decision==='Reject'?'A rejection reason':'A Follow-Up request')+' is required.';
    if(rule==='Always required'&&!comment&&!reason)return 'Stage '+st.n+' requires a comment on every decision.';
    if(p.decision==='Follow-Up'){commit();return caFollowUp(r,st,[],reason||comment,A);}
    items=open.map(function(lid){const l=r.lines.find(function(x){return x.id===lid;});const ok=p.decision==='Approve';
      return {l:l,decision:ok?'Approved':'Rejected',amount:ok?caCeiling(l):0,reason:p.decision==='Reject'?reason:'',
        adv:caIsFunded(l)?(ok?caCeilAdv(l):0):null,emp:caIsFunded(l)?(ok?caCeilEmp(l):0):null};});
    if(!items.length)return 'Nothing is left to decide at this stage.';
  }else{
    const fu=[];
    const ids=Object.keys(p.lines||{});
    for(let i=0;i<ids.length;i++){
      const lid=Number(ids[i]),x=p.lines[ids[i]];
      if(!x||!x.decision)continue;
      const l=r.lines.find(function(y){return y.id===lid;});
      if(!l||open.indexOf(lid)<0)return 'Line "'+(l?l.title:lid)+'" is not open for your decision at this stage.';
      const reason=String(x.reason||'').trim(),cap=caCeiling(l);
      if(x.decision==='Follow-Up'){if(!reason)return '"'+l.title+'": say what you need in the Follow-Up request.';fu.push({l:l,reason:reason});continue;}
      const fd=caIsFunded(l);
      if(x.decision==='Approve'){items.push({l:l,decision:'Approved',amount:cap,reason:'',adv:fd?caCeilAdv(l):null,emp:fd?caCeilEmp(l):null});continue;}
      if(x.decision==='Reject'){if(!reason)return '"'+l.title+'": a rejection reason is required.';items.push({l:l,decision:'Rejected',amount:0,reason:reason,adv:fd?0:null,emp:fd?0:null});continue;}
      if(x.decision==='Partially Approve'&&caKind(r)!=='expense'&&caExt(r)&&caExt(r).allowsPartial&&!caExt(r).allowsPartial(r))return caExt(r).partialMsg||'Partial approval is not allowed for this request.';
      if(x.decision==='Partially Approve'&&fd){
        /* The approver confirms both parts; neither may exceed what is permitted now. */
        const a=parseFloat(x.adv),e=parseFloat(x.emp),ca=caCeilAdv(l),ce=caCeilEmp(l);
        if(isNaN(a)||a<0||isNaN(e)||e<0)return '"'+l.title+'": enter the approved advance-funded and employee-paid amounts.';
        if(a>ca+0.001)return '"'+l.title+'": the approved advance-funded amount cannot exceed '+expMoney(ca,r.currency)+'.';
        if(e>ce+0.001)return '"'+l.title+'": the approved employee-paid amount cannot exceed '+expMoney(ce,r.currency)+'.';
        const n=caMoney2(a+e);
        if(!reason&&n<cap)return '"'+l.title+'": an adjustment reason is required for a reduction.';
        if(n>=cap){items.push({l:l,decision:'Approved',amount:cap,reason:'',adv:ca,emp:ce});continue;}
        items.push({l:l,decision:n===0?'Rejected':'Partially Approved',amount:n,reason:reason,adv:caMoney2(a),emp:caMoney2(e)});continue;
      }
      if(x.decision==='Partially Approve'){
        const n=parseFloat(x.amount);
        if(isNaN(n)||n<0)return '"'+l.title+'": enter the approved amount.';
        if(n>cap)return '"'+l.title+'": the approved amount cannot exceed '+expMoney(cap,r.currency)+' - what is currently permitted.';
        if(!reason)return '"'+l.title+'": an adjustment reason is required for a reduction.';
        if(n===cap){items.push({l:l,decision:'Approved',amount:cap,reason:''});continue;}
        items.push({l:l,decision:n===0?'Rejected':'Partially Approved',amount:Math.round(n*100)/100,reason:reason});continue;
      }
      return 'Unknown decision for "'+l.title+'".';
    }
    if(!items.length&&!fu.length)return 'Pick a decision for at least one line.';
    if(rule==='Always required'&&!comment)return 'Stage '+st.n+' requires a comment on every decision.';
    if(fu.length){
      commit();
      items.forEach(function(it){caRecord(r,st,it,comment,A,admin,ivWhy);});
      return caFollowUp(r,st,fu.map(function(x){return x.l.id;}),fu.map(function(x){return x.l.title+': '+x.reason;}).join(' · '),A);
    }
  }
  /* Advances: the limits are checked again at the amount being approved. */
  if(caKind(r)!=='expense'){const ex=caExt(r);if(ex&&ex.decisionCheck){const lim=ex.decisionCheck(r,items);if(lim)return lim;}}
  for(let ci=0;ci<CA_DECISION_CHECKS.length;ci++){const m=CA_DECISION_CHECKS[ci](r,items,st,A);if(m)return m;}
  commit();
  items.forEach(function(it){caRecord(r,st,it,comment,A,admin,ivWhy);});
  caAfterDecision(r,st,A);
  return '';
}
function caRecord(r,st,it,comment,A,admin,why){
  st.decisions.push({who:A.who,date:A.date,time:A.time,iso:A.iso,lineId:it.l.id,decision:it.decision,amount:it.amount,claimed:Number(it.l.amount),
    adv:it.adv!=null?it.adv:null,emp:it.emp!=null?it.emp:null,
    permitted:caCeiling(it.l),reason:it.reason,comment:comment,intervention:!!why,why:why||'',sig:caLineSig(it.l),round:r.wf.round,actual:caVia(A)});
  caLineLog(r,it.l,it.decision,'Stage '+st.n+' ('+st.name+'): '+it.decision+(it.decision!=='Rejected'?' at '+expMoney(it.amount,r.currency):'')
    +(it.adv!=null?' (advance '+expMoney(it.adv,r.currency)+', employee '+expMoney(it.emp,r.currency)+')':'')
    +(it.reason?' - '+it.reason:'')+(comment?' · '+comment:'')+(why?' [Super Admin intervention: '+why+']':''),A);
}
/* After any decision: complete the stage when every line has a result, then
   move on or finalise. */
function caAfterDecision(r,st,A){
  const lines=st.lineIds.map(function(id){return r.lines.find(function(l){return l.id===id;});}).filter(Boolean);
  const done=lines.every(function(l){return caStageResult(st,l);});
  if(!done){
    caLog(r,'Awaiting Approval','Stage '+st.n+' partly decided by '+caN(A.who)+'; '+lines.filter(function(l){return !caStageResult(st,l);}).length+' line(s) still open.',A);
    return;
  }
  lines.forEach(function(l){
    const res=caStageResult(st,l);
    l.approved=res.amount;
    if(res.adv!=null)l.approvedAdv=res.adv;
    if(res.decision==='Rejected'){l.status='Rejected';l.reason=res.reason;}
    else if(res.decision==='Partially Approved')l.reason=res.reason;
  });
  const any=lines.some(function(l){return caCeiling(l)>0&&l.status!=='Rejected';});
  st.status=any?'Approved':'Rejected';st.completedAt=A.iso;
  caLog(r,'Awaiting Approval','Stage '+st.n+' ('+st.name+') '+(any?'approved':'rejected')+' by '+caN(A.who)+': '
    +lines.map(function(l){return l.title+' '+(l.status==='Rejected'?'rejected':expMoney(caCeiling(l),r.currency));}).join(', ')+'.',A);
  const next=r.wf.stages.findIndex(function(s,i){return i>st.n-1;});
  if(!any||next<0){caFinalize(r,A);return;}
  caActivate(r,next,A,'Stage '+st.n+' complete.');
}
function caFinalize(r,A){
  A=A||caNow();
  const approved=caApprovedTotal(r),claimed=caTotal(r);
  r.lines.forEach(function(l){
    if(l.approved==null)l.approved=0;
    if(caIsFunded(l)&&l.approvedAdv==null)l.approvedAdv=caMoney2(Math.min(Number(l.advAmount)||0,Number(l.approved)));
    l.status=Number(l.approved)<=0?'Rejected':Number(l.approved)>=Number(l.amount)?'Approved':'Partially Approved';
  });
  r.status=approved<=0?'Rejected':r.lines.every(function(l){return l.status==='Approved';})?'Approved':'Partially Approved';
  r.approvedAmt=approved;r.finalAt=A.iso;
  if(r.wf){r.wf.open=false;}
  const exK=caKind(r)==='expense';
  caLog(r,r.status,r.status==='Rejected'?(exK?'Claim rejected - nothing is payable.':'Request rejected - nothing is authorized.'):'Final approval complete: '+expMoney(approved,r.currency)+' of '+expMoney(claimed,r.currency)+' approved'
    +(approved<claimed?' ('+expMoney(claimed-approved,r.currency)+' reduced'+(exK?' or rejected - see the line items':'')+')':'')
    +(exK?'.':'. '+((caExt(r)&&caExt(r).finalNote)||'This authorizes funding only; nothing is issued until a disbursement is verified.')),A);
  {const ex=caExt(r),fn=ex&&ex.finalNotice?ex.finalNotice(r,approved):null;
    caNotify(caClaimants(r),fn!=null?fn:expKey(r)+' was '+r.status.toLowerCase()+(r.status!=='Rejected'?' - '+expMoney(approved,r.currency):''),r);}
  /* An advance or imprest request becomes a funding authorization, not money. */
  if(caKind(r)!=='expense'){const ex=caExt(r);if(ex&&ex.onFinal)ex.onFinal(r,A);return;}
  /* Accepted advance utilization is recorded as the claim is finalized. */
  if(typeof advOnClaimFinal==='function')advOnClaimFinal(r,A);
  if(r.status!=='Rejected')caCreatePayable(r,A);
}

/* ── Follow-Up and resubmission ────────────────────────────────────────── */
function caFollowUp(r,st,lineIds,reason,A,quiet){
  if(!reason)return 'A Follow-Up request is required.';
  r.status='Follow-Up';st.status='Follow-Up Requested';st.fuStart=A.iso;
  lineIds.forEach(function(id){const l=r.lines.find(function(x){return x.id===id;});if(l){l.status='Follow-Up';}});
  st.decisions.push({who:A.who,date:A.date,time:A.time,iso:A.iso,lineId:null,decision:'Follow-Up',reason:reason,round:r.wf.round});
  r.wf.fu={stageIdx:r.wf.current,by:A.who,date:A.date,time:A.time,iso:A.iso,reason:reason,lineIds:lineIds.slice(),snap:caSnap(r),open:true};
  if(!quiet){
    caLog(r,'Follow-Up','Follow-Up requested at Stage '+st.n+': '+reason,A);
    lineIds.forEach(function(id){const l=r.lines.find(function(x){return x.id===id;});if(l)caLineLog(r,l,'Follow-Up',reason,A);});
  }
  caNotify(caClaimants(r),'Follow-Up on '+expKey(r)+': '+reason,r);
  return '';
}
/* The first stage whose decision no longer holds after a change. Earlier
   stages are kept only when the route, the policy result and every line they
   decided are exactly as they were. */
function caFirstAffected(r,snap,ch,reqIdx,pre){
  const why=[];
  if(caPolicySig(r)!==snap.policy){why.push('the policy evaluation changed');return {idx:0,why:why};}
  if(r.employeeEid!==snap.eid||r.category!==snap.category||r.currency!==snap.currency){why.push('the claim header changed');return {idx:0,why:why};}
  if(ch.addedIds.length){why.push('a line was added that no earlier stage reviewed');return {idx:0,why:why};}
  if(pre.wf.id!==r.wf.wfId||pre.wf.version!==r.wf.version){why.push('the claim now takes route '+caWfKey(pre.wf)+' v'+pre.wf.version);return {idx:0,why:why};}
  for(let i=0;i<reqIdx;i++){
    const st=r.wf.stages[i];
    const res=pre.resolved[i];
    if(!res||res.approvers.join('|')!==st.approvers.join('|')){why.push('Stage '+(i+1)+' would now go to '+(res?caNs(res.approvers):'nobody'));return {idx:i,why:why};}
    const hit=st.decisions.find(function(d){
      if(d.decision==='Follow-Up'||d.void)return false;
      if(ch.removedIds.indexOf(d.lineId)>=0)return true;
      const l=r.lines.find(function(x){return x.id===d.lineId;});
      return !l||caLineSig(l)!==d.sig;
    });
    if(hit){why.push('Stage '+(i+1)+' decided a line that changed');return {idx:i,why:why};}
  }
  return {idx:reqIdx,why:['earlier stages decided nothing that changed']};
}
/* Restart approval at stage idx: that stage and later ones are superseded. */
function caRestart(r,idx,A,why){
  const old=r.wf.stages.slice(idx);
  old.forEach(function(st){
    const copy=JSON.parse(JSON.stringify(st));copy.status='Superseded';copy.supersededAt=A.date+' | '+A.time;copy.round=r.wf.round;
    r.wf.superseded.push(copy);
    st.decisions.forEach(function(d){d.void=true;});
  });
  const wf=caWfRec(r.wf.wfId);
  const defs=wf?caActiveDefs(wf):[];
  r.wf.stages=r.wf.stages.slice(0,idx).concat(defs.slice(idx).map(function(d,i){return caNewStage(d,idx+i);}));
  r.wf.round++;
  /* Line amounts fall back to what the kept stages allowed. */
  r.lines.forEach(function(l){
    let amt=null,res=null;
    for(let i=idx-1;i>=0&&!res;i--){res=caStageResult(r.wf.stages[i],l);}
    if(res){amt=res.amount;}
    l.approved=amt;l.approvedAdv=res&&res.adv!=null?res.adv:null;
    if(l.status!=='Rejected'||amt==null){l.status='Pending';l.reason='';}
    if(res&&res.decision==='Rejected'){l.status='Rejected';l.reason=res.reason;}
  });
  caActivate(r,idx,A,why);
}
function caResubmit(id,response,A){
  const r=caRec(id);if(!r)return 'No such claim.';
  A=A||caNow();
  if(!caCanRespond(r))return 'Only the claimant, the submitter or an authorised administrator can answer this Follow-Up.';
  const fu=r.wf&&r.wf.fu;if(!fu||!fu.open)return 'There is no open Follow-Up.';
  response=String(response||'').trim();
  if(!response)return 'Write a response to the Follow-Up.';
  const ch=caChanges(r,fu.snap);
  const material=ch.material.length>0;
  /* Validate first; a failed check leaves the claim in Follow-Up. */
  const pre=caPreflight(r);
  if(pre.error)return pre.error;
  fu.open=false;fu.response=response;fu.respondedBy=A.who;fu.respondedAt=A.date+' | '+A.time;fu.changes=ch;
  if(!caIsClaimant(r,A.who)&&A.who!==r.submittedBy)caAddPreparer(r,A.who);
  r.wf.fuHistory.push(fu);r.wf.fu=null;
  const st=r.wf.stages[fu.stageIdx];
  st.pausedDays=(st.pausedDays||0)+Math.max(0,caDays(st.fuStart||A.iso,A.iso));st.fuStart='';
  r.status='Awaiting Approval';
  if(caKind(r)==='expense'&&typeof epSnapshot==='function')epSnapshot(r);
  const dups=caKind(r)!=='expense'?[]:caDupMatches({eid:r.employeeEid,category:r.category,currency:r.currency,lines:r.lines,claimId:r.id,revisedFrom:r.revisedFrom});
  r.dupCheck={at:A.date+' | '+A.time,matches:dups,just:dups.length?String(r.dupJust||'').trim():''};
  caLog(r,'Awaiting Approval','Follow-Up answered by '+caN(A.who)+': "'+response+'"'
    +(material?' Material changes: '+ch.material.join('; ')+'.':(ch.minor.length?' Minor changes: '+ch.minor.join('; ')+'.':' No changes to the claim.')),A);
  if(!material){
    r.lines.forEach(function(l){if(l.status==='Follow-Up')l.status='Pending';});
    st.status='Awaiting Decision';
    caLog(r,'Awaiting Approval','Returned to Stage '+st.n+' ('+st.name+') - the response changes nothing material.',A);
    caNotify([fu.by].concat(st.approvers),expKey(r)+' - Follow-Up answered: back with you at Stage '+st.n,r);
    return '';
  }
  const fa=caFirstAffected(r,fu.snap,ch,fu.stageIdx,pre);
  if(pre.wf.id!==r.wf.wfId||pre.wf.version!==r.wf.version){
    r.wf.stages.forEach(function(s){const c=JSON.parse(JSON.stringify(s));c.status='Superseded';c.round=r.wf.round;r.wf.superseded.push(c);s.decisions.forEach(function(d){d.void=true;});});
    const keep=r.wf.superseded,hist=r.wf.fuHistory,round=r.wf.round;
    r.wf=caInstance(pre.wf);r.wf.superseded=keep;r.wf.fuHistory=hist;r.wf.round=round+1;
    r.lines.forEach(function(l){l.approved=null;l.status='Pending';l.reason='';});
    caActivate(r,0,A,'Material change re-routed the claim to '+caWfKey(pre.wf)+' v'+pre.wf.version+'; approval restarts at Stage 1.');
  }else{
    caRestart(r,fa.idx,A,'Material change: approval restarts at Stage '+(fa.idx+1)+' because '+fa.why.join(', ')+'.');
  }
  return '';
}
/* Super Admin's administrative edit of a claim in Awaiting Approval: the
   same revalidation and restart rules, audited. */
function caAdminEditStart(r){if(r&&r.status==='Awaiting Approval'&&r.wf)r.wf.editSnap=caSnap(r);}
function caAdminEditDone(r,A){
  if(!r||r.status!=='Awaiting Approval'||!r.wf||!r.wf.editSnap)return '';
  A=A||caNow();
  const snap=r.wf.editSnap;r.wf.editSnap=null;
  const ch=caChanges(r,snap);
  if(!ch.material.length){
    if(ch.minor.length)caLog(r,'Awaiting Approval','Administrative edit by '+caN(A.who)+' (no financial impact): '+ch.minor.join('; ')+'.',A);
    return '';
  }
  const pre=caPreflight(r);
  if(pre.error){caLog(r,'Awaiting Approval','Administrative edit by '+caN(A.who)+' needs attention: '+pre.error,A);return pre.error;}
  caAddPreparer(r,A.who);
  caLog(r,'Awaiting Approval','Administrative edit by '+caN(A.who)+' - material changes: '+ch.material.join('; ')+'.',A);
  if(pre.wf.id!==r.wf.wfId||pre.wf.version!==r.wf.version){
    r.wf.stages.forEach(function(s){const c=JSON.parse(JSON.stringify(s));c.status='Superseded';r.wf.superseded.push(c);s.decisions.forEach(function(d){d.void=true;});});
    const keep=r.wf.superseded,hist=r.wf.fuHistory,round=r.wf.round;
    r.wf=caInstance(pre.wf);r.wf.superseded=keep;r.wf.fuHistory=hist;r.wf.round=round+1;
    r.lines.forEach(function(l){l.approved=null;l.status='Pending';l.reason='';});
    caActivate(r,0,A,'Re-routed to '+caWfKey(pre.wf)+'.');
  }else{
    const fa=caFirstAffected(r,snap,ch,r.wf.current,pre);
    caRestart(r,fa.idx,A,'Approval restarts at Stage '+(fa.idx+1)+' because '+fa.why.join(', ')+'.');
  }
  if(typeof epSnapshot==='function')epSnapshot(r);
  return '';
}

/* ── Withdrawal and reassignment ───────────────────────────────────────── */
function caWithdraw(id,reason,A){
  const r=caRec(id);if(!r)return 'No such claim.';
  A=A||caNow();
  if(!caCanWithdraw(r))return r&&['Awaiting Approval','Follow-Up'].indexOf(r.status)<0?'A '+r.status+' claim cannot be withdrawn.':'You cannot withdraw this claim.';
  reason=String(reason||'').trim();if(!reason)return 'Say why the claim is withdrawn.';
  const st=caActiveStage(r);
  const was=st?st.approvers.slice():[];
  if(st)st.status='Closed - Withdrawn';
  if(r.wf){r.wf.open=false;if(r.wf.fu)r.wf.fu.open=false;}
  r.status='Withdrawn';r.withdrawnBy=A.who;r.withdrawnAt=A.date+' | '+A.time;
  caLog(r,'Withdrawn','Withdrawn by '+caN(A.who)+(!caIsClaimant(r,A.who)?' on behalf of '+r.name:'')+': '+reason+(caKind(r)==='expense'?' Reserved policy utilisation'+(r.lines.some(function(l){return l.advanceId;})?' and advance allocation are':' is')+' released.':' Nothing was authorized or issued.'),A);
  caNotify(was.concat(caClaimants(r).filter(function(n){return n!==A.who;})),expKey(r)+' was withdrawn',r);
  return '';
}
function caReassign(id,to,reason,A,from){
  const r=caRec(id);if(!r)return 'No such claim.';
  A=A||caNow();
  if(!caCanReassign(r))return 'You cannot reassign this approval.';
  const st=caActiveStage(r);
  reason=String(reason||'').trim();
  if(!to)return 'Pick the new approver.';
  if(to===A.who)return 'You cannot reassign a stage to yourself. A Super Admin decides directly from Review (an audited intervention).';
  if(!reason)return 'Say why the approval is reassigned.';
  /* Card and budget approvals (B7-N05): the new approver fits the stage - active, independent, the approval right, its team or role. */
  if(caFitKind(r)){const fit=caStageFit(r,st,to);if(fit)return fit;}
  if(!caActive(to))return caN(to)+' is not an active user in '+caEntityName()+'.';
  if(caExcluded(r).indexOf(to)>=0)return 'Separation of duties: '+caN(to)+' is the claimant or submitter.';
  if(caApproverPool(caKind(r)).indexOf(to)<0)return caN(to)+' does not hold the approval right for this request type.';
  {const ex=caExt(r);if(ex&&ex.reassignCheck){const m=ex.reassignCheck(r,st,to);if(m)return m;}}
  if(st.approvers.indexOf(to)>=0)return caN(to)+' already approves this stage.';
  /* A stage with several approvers keeps its Any One / All rule: one named
     approver is replaced. One who has already decided cannot be. */
  if(st.approvers.length>1){
    if(!from||st.approvers.indexOf(from)<0)return 'Pick the approver being replaced.';
    if(st.decisions.some(function(d){return d.who===from&&!d.void&&d.decision!=='Follow-Up';}))return caN(from)+' has already decided at this stage and cannot be replaced.';
  }else from=st.approvers[0]||'';
  st.reassigns.push({from:from?[from]:[],to:to,by:A.who,date:A.date,time:A.time,reason:reason,actual:caVia(A)});
  st.approvers=st.approvers.length>1?st.approvers.map(function(n){return n===from?to:n;}):[to];
  st.exception='';st.assignedAt=A.iso;st.pausedDays=0;st.escalated=false;st.escalatedTo=[];
  caLog(r,'Awaiting Approval','Stage '+st.n+' reassigned '+(from?'from '+caN(from)+' ':'')+'to '+caN(to)+' by '+caN(A.who)+' ('+st.rule+' rule kept): '+reason,A);
  caNotify([to],expKey(r)+' was reassigned to you - Stage '+st.n+' · '+st.name,r);
  return '';
}

/* ── SLA and escalation ────────────────────────────────────────────────── */
function caDue(st){return st&&st.assignedAt?wbAddDays(st.assignedAt,caStageSla(st)+(st.pausedDays||0)):'';}
function caOverdue(r,st){
  st=st||caActiveStage(r);
  return !!(st&&r.status==='Awaiting Approval'&&st.status==='Awaiting Decision'&&caDue(st)&&wbToday()>caDue(st));
}
/* Overdue goes to the escalation authority: the stage's own target, else the
   entity's, else the Entity Super Admin(s) - never the claimant or submitter;
   the stage fallback only when nobody else is eligible. */
function caEscalationTargets(r,idx){
  const st=r.wf.stages[idx],excl=caExcluded(r);
  /* Active, independent and authorised (may reassign or approve expenses). */
  const ok=function(l){return l.filter(function(n){return n&&caActive(n)&&excl.indexOf(n)<0&&(caPersonCan(n,caPk(r,'reassign'))||caPersonCan(n,caPk(r,'approve')));});};
  let t=ok(st.escalation?[st.escalation]:[]);
  if(!t.length)t=ok(caCfg(r.entity).escalation?[caCfg(r.entity).escalation]:[]);
  if(!t.length)t=ok(caRoleUsers('Entity Super Admin'));
  if(!t.length)t=ok(caRoleUsers('Opendhi Super Admin'));   // a company without its own administrator: OpenDhi
  if(!t.length&&st.fallback)t=[st.fallback].filter(function(n){return caActive(n)&&excl.indexOf(n)<0&&caPersonCan(n,caPk(r,'approve'));});
  return t;
}
/* Everyone who may resolve an escalation administratively (reassign right). */
function caResolvers(r){return caPermHolders(caPk(r,'reassign')).filter(function(n){return caExcluded(r).indexOf(n)<0;});}
function caTick(){
  caAllRecs().forEach(function(r){
    if(r.entity!==caEntity())return;   // targets resolve against this entity's roles and teams
    const st=caActiveStage(r);
    if(!st||!caOverdue(r,st)||st.escalated)return;
    st.escalated=true;st.escalatedTo=caEscalationTargets(r,r.wf.current);
    const A=caAt('System',wbToday(),'08:00:00 AM');
    if(!st.escalatedTo.length){
      st.escalationFlag=true;
      caLog(r,'Awaiting Approval','Stage '+st.n+' is overdue (due '+caDateLabel(caDue(st))+'). No active, independent and authorised escalation authority or fallback is available - flagged for administrative resolution (reassign). Escalation never approves or rejects.',A);
      caNotify(caResolvers(r),'Escalation needs resolution: '+expKey(r)+' - Stage '+st.n+' overdue with no escalation authority',r);
      return;
    }
    caLog(r,'Awaiting Approval','Stage '+st.n+' is overdue (due '+caDateLabel(caDue(st))+', '+caStageSla(st)+' calendar days). Escalated to '+(caNs(st.escalatedTo)||'nobody - no escalation authority is available')
      +', who may reassign it. Escalation does not approve or reject.',A);
    caNotify(st.escalatedTo.concat(st.approvers),'Approval overdue: '+expKey(r)+' - Stage '+st.n+' was due '+caDateLabel(caDue(st)),r);
  });
}

/* ── Reimbursement ─────────────────────────────────────────────────────── */
const CA_PAY_STATUSES=['Not Ready','Pending Verification','Ready for Payment','Processing','On Hold','Partially Paid','Paid','Failed','Cancelled','Not Applicable'];
/* Open payroll runs of the existing Payroll module (core.js payrollRecords)
   for this entity and currency. A run is where a reimbursement is paid; it
   is not proof that it was. */
function caPayrollRuns(r,all){
  if(typeof payrollRecords==='undefined')return [];
  return Object.keys(payrollRecords).map(function(k){return payrollRecords[k];}).filter(function(p){
    /* Payroll runs name their entity as text; match the entity's name. */
    return (all||p.status!=='Inactive')&&String(p.entity||'').indexOf(caEntityName())===0&&(!r||p.currency===r.currency);
  }).map(function(p){return p.payrollId;});
}
const CA_PAID_BY=['Employee','Company','Company Advance'];
const CA_ROUTES=['Payroll','Manual/External Payment'];
let caPayNext=1;
/* Company Settings → Payroll → Include Approved Expenses in Payroll, per entity. */
function caPayrollOn(){return caCfg().payrollExpenses!==false;}
function caPayrollToggle(on){
  if(!caCan('expense.reimb.process')){showToast('Not permitted','error','Payroll settings need the RBAC right to process reimbursements.');renderADTPage();return;}
  caCfg().payrollExpenses=!!on;
  showToast('Payroll setting saved','success',on?'Approved expenses can be routed through Payroll.':'Payroll is no longer offered as a reimbursement route.');
}
function caSplit(r){
  const o={employee:0,company:0,advance:0,unknown:0,funded:0,card:0};
  r.lines.forEach(function(l){
    const a=l.approved!=null?Number(l.approved):0;if(a<=0)return;
    if(l.paidBy==='Employee')o.employee+=a;else if(l.paidBy==='Company')o.company+=a;
    else if(caIsFunded(l)){const adv=Math.min(Number(l.approvedAdv)||0,a);o.funded+=adv;o.employee+=caMoney2(a-adv);}   // advance part settles the advance; the rest is the employee's
    else if(l.paidBy==='Company Advance')o.advance+=a;
    else if(l.paidBy==='Corporate Card'){const cd=Math.min(Number(l.cardAmount)||0,a);o.card+=cd;o.employee+=caMoney2(a-cd);}   // Build 7: the card paid that part; only the rest is the employee's
    else o.unknown+=a;
  });
  Object.keys(o).forEach(function(k){o[k]=caMoney2(o[k]);});
  return o;
}
function caCreatePayable(r,A){
  if(r.pay)return r.pay;
  A=A||caNow();
  const s=caSplit(r);
  const p={id:caPayNext++,payable:s.employee,settled:0,route:'',status:'',holdReason:'',prev:'',events:[],payrollRef:'',legacy:false};
  p.key='RMB-'+String(1000+p.id);
  if(s.unknown>0){p.status='On Hold';p.holdReason='Expense Paid By is not recorded on '+expMoney(s.unknown,r.currency)+' of approved lines - verify the funding source before payment.';}
  else p.status=s.employee>0?'Ready for Payment':'Not Applicable';
  r.pay=p;
  p.events.push({type:'Created',by:A.who,date:A.date,time:A.time,amount:p.payable,remarks:p.status==='Not Applicable'?'Nothing is owed to the employee (company-paid, advance-funded or card-funded).':'Payable '+expMoney(p.payable,r.currency)
    +(s.company?' · company-paid '+expMoney(s.company,r.currency)+' not reimbursed':'')+(s.funded?' · '+expMoney(s.funded,r.currency)+' settled from company advances, not reimbursed':'')+(s.card?' · '+expMoney(s.card,r.currency)+' paid by corporate card, not reimbursed':'')+(s.advance?' · '+expMoney(s.advance,r.currency)+' held for advance settlement':'')});
  caLog(r,r.status,'Reimbursement '+p.key+': '+p.status+' - payable '+expMoney(p.payable,r.currency)+'.',A);
  if(p.status==='Ready for Payment')caNotify(caPermHolders('expense.reimb.process'),'Reimbursement ready: '+expKey(r)+' · '+expMoney(p.payable,r.currency),r);
  return p;
}
function caOutstanding(r){return r.pay&&r.pay.status!=='Pending Verification'?Math.max(0,Math.round((r.pay.payable-r.pay.settled)*100)/100):0;}
function caPayStatus(r){
  if(r.pay)return r.pay.status;
  if(['Approved','Partially Approved'].indexOf(r.status)>=0)return 'Not Ready';
  if(r.status==='Rejected'||r.status==='Withdrawn')return 'Not Applicable';
  return 'Not Ready';
}
function caPayEvent(r,type,o,A){
  A=A||caNow();
  r.pay.events.unshift(Object.assign({type:type,by:A.who,date:A.date,time:A.time},o||{}));
}
function caPayGuard(r,A){
  if(!r||!r.pay)return 'This claim has no reimbursement record.';
  if(!caPersonCan(A?A.who:caMe(),'expense.reimb.process'))return caN(A?A.who:caMe())+' has no RBAC right to process reimbursements.';
  return '';
}
function caPaySetRoute(id,route,ref,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;const p=r.pay;
  if(['Ready for Payment','Failed','Cancelled'].indexOf(p.status)<0)return 'A route is chosen when the reimbursement is Ready for Payment (or after a failed/cancelled instruction). It is '+p.status+'.';
  if(CA_ROUTES.indexOf(route)<0)return 'Pick a payment route.';
  if(p.settled>0&&p.route&&route!==p.route)return 'Part of this reimbursement was settled through '+p.route+'; the rest must use the same route.';
  if(route==='Payroll'&&!caPayrollOn())return 'Payroll does not take expenses for this entity (Company Settings → Payroll → Include Approved Expenses in Payroll).';
  ref=String(ref||'').trim();
  if(route==='Payroll'&&!ref)return 'Pick the payroll run the reimbursement is handed to.';
  if(route==='Payroll'&&caPayrollRuns(r).indexOf(ref)<0)return ref+' is not an open '+r.currency+' payroll run of '+caEntityName()+' (Payroll module).';
  if(caOutstanding(r)<=0)return 'Nothing is outstanding.';
  p.route=route;p.prev=p.status;p.status='Processing';p.payrollRef=route==='Payroll'?ref:'';
  caPayEvent(r,route==='Payroll'?'Payroll hand-off':'Manual payment initiated',{ref:ref,remarks:route==='Payroll'?'Queued in payroll run '+ref+'. Not paid until the settlement is confirmed.':'Awaiting the verified payment record.'},A);
  caLog(r,r.status,'Reimbursement '+p.key+' routed to '+route+(ref?' ('+ref+')':'')+' - Processing.',A);
  return '';
}
/* A verified settlement: never more than is outstanding, never twice with the same reference. */
/* D9: an illustrative payment is possible only in the presentation company. */
function caIllustrativeOn(ent){return typeof ccDemoOn==='function'&&ccDemoOn(ent);}
function caPaySettle(id,o,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;const p=r.pay;
  if(!caPersonCan(A.who,'expense.reimb.settle'))return caN(A.who)+' has no RBAC right to record settlements.';
  if(['Processing','Partially Paid'].indexOf(p.status)<0)return 'A settlement is recorded while the reimbursement is Processing or Partially Paid. It is '+p.status+'.';
  if(caSoD(r,A.who))return 'Separation of duties: '+caSoD(r,A.who)+'; another Finance user records the settlement.';
  const amt=parseFloat(o.amount),out=caOutstanding(r);
  if(!(amt>0))return 'Enter the amount settled.';
  if(amt>out+0.001)return 'Only '+expMoney(out,r.currency)+' is outstanding.';
  if(!o.date)return 'Enter the actual payment date.';
  if(o.date>wbToday())return 'The payment date cannot be in the future.';
  if(r.finalAt&&o.date<r.finalAt)return 'The payment date is before the claim was approved.';
  const ill=o.source==='Illustrative';
  if(ill&&!caIllustrativeOn(r.entity))return 'An illustrative payment is recorded only in the presentation company.';
  const ref=ill?'ILLUSTRATIVE-'+p.key+'-S'+(p.events.filter(function(e){return e.type==='Settlement';}).length+1):String(o.ref||'').trim();
  if(!ref)return p.route==='Payroll'?'Enter the payroll reference confirming the payment.':'Enter the payment reference / UTR.';
  if(p.events.some(function(e){return e.type==='Settlement'&&caNorm(e.ref)===caNorm(ref);}))return 'Reference '+ref+' is already recorded on this reimbursement.';
  if(!ill&&p.route==='Payroll'&&caPayrollRuns(r,true).indexOf(ref)<0)return ref+' is not a payroll run of '+caEntityName()+'.';
  if(!ill&&!o.evidence)return p.route==='Payroll'?'Attach the payroll confirmation (payslip or payroll register line).':'Attach the settlement evidence (bank advice or payment confirmation).';
  p.settled=Math.round((p.settled+amt)*100)/100;
  p.status=caOutstanding(r)<=0?'Paid':'Partially Paid';
  caPayEvent(r,'Settlement',{amount:amt,ref:ref,route:p.route,payDate:o.date,evidence:o.evidence||'',remarks:o.remarks||'',verified:!ill,source:ill?'Illustrative':'',illustrative:ill},A);
  if(ill)p.illustrative=true;
  if(p.status==='Paid'&&!p.illustrative)r.reimbursedOn=o.date;
  caLog(r,r.status,(ill?'Illustrative settlement of ':'Settlement of ')+expMoney(amt,r.currency)+' recorded ('+p.route+', ref '+ref+', paid '+caDateLabel(o.date)+'). Reimbursement is '+p.status+'.'+(ill?' Illustrative: no money moved; it is not a bank-confirmed payment.':''),A);
  caNotify(caClaimants(r),(ill?'Illustrative payment recorded on ':'Payment recorded on ')+expKey(r)+': '+expMoney(amt,r.currency)+' ('+p.status+')',r);
  return '';
}
function caPayHold(id,reason,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;const p=r.pay;reason=String(reason||'').trim();
  if(['Ready for Payment','Processing','Partially Paid'].indexOf(p.status)<0)return 'Only a payable that is waiting or in progress can be put on hold.';
  if(!reason)return 'Say why the payment is on hold.';
  p.prev=p.status;p.status='On Hold';p.holdReason=reason;
  caPayEvent(r,'On Hold',{remarks:reason},A);caLog(r,r.status,'Reimbursement on hold: '+reason,A);
  return '';
}
function caPayResume(id,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;const p=r.pay;
  if(p.status!=='On Hold')return 'The reimbursement is not on hold.';
  if(r.lines.some(function(l){return Number(l.approved)>0&&!l.paidBy;}))return 'Verify who paid for each approved line first.';
  p.status=p.prev&&p.prev!=='On Hold'?p.prev:(p.payable>0?'Ready for Payment':'Not Applicable');p.holdReason='';
  caPayEvent(r,'Resumed',{remarks:'Back to '+p.status},A);caLog(r,r.status,'Reimbursement resumed - '+p.status+'.',A);
  return '';
}
function caPayFail(id,reason,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;const p=r.pay;reason=String(reason||'').trim();
  if(['Processing','Partially Paid'].indexOf(p.status)<0)return 'Only a payment in progress can fail.';
  if(!reason)return 'Say what failed.';
  p.prev=p.status;p.status='Failed';
  caPayEvent(r,'Failed',{remarks:reason},A);caLog(r,r.status,'Payment failed: '+reason+' It can be retried.',A);
  caNotify(caPermHolders('expense.reimb.process'),'Payment failed: '+expKey(r)+' - '+reason,r);
  return '';
}
function caPayCancel(id,reason,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;const p=r.pay;reason=String(reason||'').trim();
  if(['Processing','Failed','On Hold'].indexOf(p.status)<0||p.settled>0&&p.status!=='Failed')return 'Only an unsettled payment instruction can be cancelled.';
  if(!reason)return 'Say why the instruction is cancelled.';
  p.prev=p.status;p.status='Cancelled';
  caPayEvent(r,'Cancelled',{remarks:reason+(p.route==='Payroll'?' (removed from payroll run '+p.payrollRef+')':'')},A);
  caLog(r,r.status,'Payment instruction cancelled: '+reason+' A new route can be chosen.',A);
  return '';
}
/* Claims approved before settlements were tracked: Finance confirms who paid
   each line and whether the employee was actually paid - with the payroll
   run or payment reference and its evidence - before the record counts as
   Paid. Until then it is Pending Verification: neither paid nor unpaid.
   o = {map:{lineId:paidBy}, state:'paid'|'unpaid', route, ref, amount, date, evidence, remarks} */
function caPayVerify(id,o,A){
  A=A||caNow();const r=caRec(id);const g=caPayGuard(r,A);if(g)return g;o=o||{};
  const p=r.pay;
  const todo=r.lines.filter(function(l){return Number(l.approved)>0&&!l.paidBy;});
  if(p.status!=='Pending Verification'&&!todo.length)return 'Nothing to verify.';
  const map=o.map||{};
  const miss=todo.find(function(l){return CA_PAID_BY.indexOf(map[l.id])<0;});
  if(miss)return '"'+miss.title+'": pick who paid.';
  const sp=function(){const s={employee:0};r.lines.forEach(function(l){const a=Number(l.approved)||0;if(a>0&&(l.paidBy||map[l.id])==='Employee')s.employee+=a;});return s.employee;};
  const payable=sp();
  if(p.status==='Pending Verification'){
    if(['paid','unpaid'].indexOf(o.state)<0)return 'Say whether the employee was paid.';
    if(o.state==='paid'){
      if(!caPersonCan(A.who,'expense.reimb.settle'))return caN(A.who)+' has no RBAC right to record settlements.';
      if(caSoD(r,A.who))return 'Separation of duties: '+caSoD(r,A.who)+'.';
      if(payable<=0)return 'Nothing was payable to the employee on these lines; choose Not paid.';
      if(CA_ROUTES.indexOf(o.route)<0)return 'Pick how it was paid.';
      const amt=parseFloat(o.amount);
      if(!(amt>0)||amt>payable+0.001)return 'The amount paid must be between 0 and '+expMoney(payable,r.currency)+'.';
      if(!o.date||o.date>wbToday())return 'Enter the actual payment date.';
      const ref=String(o.ref||'').trim();
      if(!ref)return o.route==='Payroll'?'Pick the payroll run it was paid in.':'Enter the payment reference / UTR.';
      if(o.route==='Payroll'&&caPayrollRuns(r,true).indexOf(ref)<0)return ref+' is not a payroll run of '+caEntityName()+'.';
      if(!o.evidence)return 'Attach the evidence of payment.';
      todo.forEach(function(l){l.paidBy=map[l.id];});
      p.payable=payable;p.route=o.route;p.payrollRef=o.route==='Payroll'?ref:'';p.settled=Math.round(amt*100)/100;
      p.status=caOutstanding(r)<=0?'Paid':'Partially Paid';p.legacy=false;p.verified=true;
      caPayEvent(r,'Settlement',{amount:amt,ref:ref,route:o.route,payDate:o.date,evidence:o.evidence,remarks:'Verified by Finance: '+(o.remarks||p.reported||''),verified:true},A);
      r.reimbursedOn=o.date;
      caLog(r,r.status,'Settlement verified by '+caN(A.who)+': '+expMoney(amt,r.currency)+' paid '+caDateLabel(o.date)+' via '+o.route+' (ref '+ref+', evidence '+o.evidence+'). Reimbursement is '+p.status+'.',A);
      return '';
    }
    if(r.status==='Reimbursed'&&!String(o.correction||'').trim())return 'This claim is marked Reimbursed. Give the reason for correcting it to Approved - it is kept in History.';
    todo.forEach(function(l){l.paidBy=map[l.id];});
    p.payable=payable;p.legacy=false;p.verified=true;
    p.status=payable>0?'Ready for Payment':'Not Applicable';
    caPayEvent(r,'Verified unpaid',{remarks:(o.remarks?o.remarks+' · ':'')+'No settlement was made; payable '+expMoney(payable,r.currency)},A);
    let note='';
    if(r.status==='Reimbursed'){
      r.statusCorrection={from:'Reimbursed',to:'Approved',reason:String(o.correction).trim(),by:A.who,at:A.date+' | '+A.time};
      r.status='Approved';r.reimbursedOn='';
      note=' Claim status corrected from Reimbursed to Approved by '+caN(A.who)+'. Reason: '+r.statusCorrection.reason+'.';
    }
    caLog(r,r.status,'Settlement verified by '+caN(A.who)+': not paid. Reimbursement is '+p.status+'.'+note,A);
    if(p.status==='Ready for Payment')caNotify(caPermHolders('expense.reimb.process'),'Reimbursement ready: '+expKey(r),r);
    return '';
  }
  /* A newer claim held only because Paid By is missing. */
  todo.forEach(function(l){l.paidBy=map[l.id];});
  p.payable=payable;
  caPayEvent(r,'Funding verified',{remarks:todo.map(function(l){return l.title+': '+l.paidBy;}).join(', ')},A);
  caLog(r,r.status,'Funding source verified by '+caN(A.who)+': '+todo.map(function(l){return l.title+' - '+l.paidBy;}).join(', ')+'. Payable '+expMoney(payable,r.currency)+'.',A);
  if(p.status==='On Hold'){p.status=payable>0?'Ready for Payment':'Not Applicable';p.holdReason='';}
  return '';
}

/* ── Scope: which claims a role sees ───────────────────────────────────── */
function caInvolved(r,who){
  if(!r.wf)return false;
  return r.wf.stages.concat(r.wf.superseded||[]).some(function(s){return s.approvers.indexOf(who)>=0||s.escalatedTo.indexOf(who)>=0||s.decisions.some(function(d){return d.who===who;});});
}
/* Reporting Manager: their team's claims, claims assigned to them, and their own. */
function caScopeClaims(list){
  const ent=caEntity();
  list=list.filter(function(r){return r.entity===ent;});
  /* RBAC decides the scope: every claim, the team's claims, or one's own. */
  if(caCan('expense.claim.view.all'))return list;
  const me=caMe(),team=caCan('expense.claim.view.team');
  return list.filter(function(r){return caIsClaimant(r,me)||r.submittedBy===me||r.createdBy===me||(team&&caManagerOf(r.employeeEid)===me)||caInvolved(r,me);});
}
function caOwnScope(){return !caCan('expense.claim.view.all')&&!caCan('expense.claim.view.team');}
/* The approval queue: what this person can decide now (Super Admin: every pending claim). */
function caQueue(all){
  const me=caMe();
  return caAllRecs().filter(function(r){
    if(r.status!=='Awaiting Approval'||!r.wf||r.entity!==caEntity())return false;
    if(all&&caCan(caPk(r,'reassign')))return true;
    const st=caActiveStage(r);
    if(all&&caCanDecide(r))return true;   // Super Admin interventions live under "All pending"
    return (st&&st.approvers.indexOf(me)>=0&&caCanDecide(r))||(st&&st.escalated&&st.escalatedTo.indexOf(me)>=0);
  });
}

/* ── Migration of the claims the module shipped with ───────────────────── */
/* Controlled, not a restart:
   - every status, line decision, line detail and log is kept;
   - Awaiting Approval / Follow-Up claims get a valid workflow assignment.
     None had a stage approval recorded before routing existed, so each sits
     at Stage 1 of its route, with the SLA clock starting at migration. A
     line decision recorded by someone who is a valid Stage 1 approver is
     carried over as that approver's Stage 1 decision; any other stays
     visible as history. No route → a migration exception for Super Admin;
   - Approved and Reimbursed claims keep their status; their settlement is
     Pending Verification for Finance - never assumed paid or unpaid. */
function caLegacyPayable(r,A){
  const p={id:caPayNext++,payable:0,settled:0,route:'',status:'Pending Verification',legacy:true,verified:false,holdReason:'',prev:'',payrollRef:'',events:[]};
  p.key='RMB-'+String(1000+p.id);
  p.reported=r.status==='Reimbursed'?'Marked Reimbursed'+(r.reimbursedOn?' on '+caDateLabel(r.reimbursedOn):'')+' before settlements were tracked; no payment reference or evidence is on file.'
    :'Approved before settlements were tracked; whether it was paid is not recorded.';
  p.events.push({type:'Migrated',by:'System',date:A.date,time:A.time,remarks:p.reported+' Flagged for Finance verification.'});
  r.pay=p;
  return p;
}
/* Claims filed before IDs: the entity by its ID; the claimant by email, then
   Employee Code, then a name only one employee in the entity carries; the
   creator by the only account with that name. Anything else stays unmatched
   - the name is kept for reading, nobody is guessed, and it is flagged. */
function caMigrateIds(r){
  if(r.idMigrated)return;
  r.idMigrated=true;
  r.entity=idEntityRef(r.entity)||caEntity();
  const ref=expKey(r);
  if(!r.employeeEid){
    const e=idEmpByEmail(r.email,r.entity)||idEmpByCode(r.empId,r.entity)||idEmpByName(r.name,r.entity);
    if(e)r.employeeEid=e.eid;
    else{r.employeeEid='';idNote('Expense claimant',ref,r.name,'No single employee in '+idEntityName(r.entity)+' matches this claimant; left unmatched.','',r.entity);}
  }
  ['createdBy','submittedBy'].forEach(function(k){
    const v=r[k];if(!v||idUser(v))return;
    r[k+'Name']=v;r[k]=idUserByName(v,r.entity,{kind:'Expense '+(k==='createdBy'?'creator':'submitter'),ref:ref});
  });
}
function caMigrate(){
  caNotifSilent=true;
  const A=caAt('System',wbToday(),'06:00:00 AM');
  expensesData.forEach(caMigrateIds);
  expensesData.forEach(function(r){
    if(r.wf||r.migrated)return;
    r.migrated=true;r.entity=r.entity||caEntity();
    if(typeof expSeedLogs==='function')expSeedLogs(r);
    r.lines.forEach(function(l){
      if(typeof expSeedLineLogs==='function')expSeedLineLogs(r,l);
      if(l.paidBy==null)l.paidBy='';
      if(!l.paidBy)l.legacyNoPaidBy=true;
      l.merchant=l.merchant||'';l.invoice=l.invoice||'';
    });
    r.migration={at:A.date+' | '+A.time,status:r.status,lines:r.lines.map(function(l){return l.title+': '+l.status;})};
    if(r.status!=='Draft')r.submittedBy=r.submittedBy||r.createdBy;
    if(['Approved','Reimbursed','Rejected'].indexOf(r.status)>=0){
      r.lines.forEach(function(l){if(l.approved==null)l.approved=(r.status==='Rejected'||l.status==='Rejected')?0:Number(l.amount);});
      r.approvedAmt=caApprovedTotal(r);r.finalAt=r.appliedOn;
      if(r.status!=='Rejected')caLegacyPayable(r,A);
      caLog(r,r.status,'Migrated: status '+r.status+', line decisions and logs kept as they were.'
        +(r.status!=='Rejected'?' Settlement '+(r.status==='Reimbursed'?'reported but ':'')+'not verified - flagged Pending Verification for Finance.':''),A);
      return;
    }
    if(r.status==='Awaiting Approval'||r.status==='Follow-Up'){
      r.lines.forEach(function(l){if(l.status==='Rejected')l.approved=0;});
      const pre=caPreflight(r,{legacy:true});
      if(pre.error){
        r.wf={open:false,exception:pre.error,stages:[],superseded:[],fuHistory:[],migration:true};
        caLog(r,r.status,'Migration could not assign a workflow: '+pre.error+' A Super Admin must assign one (Approval tab).',A);
        return;
      }
      caStart(r,pre,A,{migrate:true});
      const st=caActiveStage(r);
      /* Carry over line decisions a valid Stage 1 approver had already made. */
      r.lines.forEach(function(l){
        if(['Approved','Rejected'].indexOf(l.status)<0)return;
        const L=(l.logs||[]).find(function(x){return x.status===l.status;});
        const Lu=L?(L.userId||idUserByName(L.user,r.entity)):'';
        if(Lu&&st.approvers.indexOf(Lu)>=0)st.decisions.push({who:Lu,date:L.date,time:L.time,iso:A.iso,lineId:l.id,decision:l.status,
          amount:l.status==='Rejected'?0:Number(l.amount),claimed:Number(l.amount),permitted:Number(l.amount),reason:l.status==='Rejected'?L.action:'',comment:'Carried over at migration',legacy:true,sig:caLineSig(l),round:1});
      });
      if(r.status==='Follow-Up'){
        const L=(r.logs||[]).find(function(x){return x.status==='Follow-Up';});
        const fuLines=r.lines.filter(function(l){return l.status==='Follow-Up';}).map(function(l){return l.id;});
        caFollowUp(r,st,fuLines,L?L.action:'Please respond to the approver\'s query.',Object.assign({},A,{who:L?(L.userId||idUserByName(L.user,r.entity)||'System'):'System'}),true);
        if(L){r.wf.fu.date=L.date;r.wf.fu.time=L.time;}
      }
    }
  });
  caNotifSilent=false;
}
/* A Super Admin assigns a route to a migrated claim that had none. */
function caAssignWorkflow(id,A){
  const r=caRec(id);if(!r)return 'No such claim.';
  if(!caCan(caPk(r,'reassign')))return caRole()+' cannot assign approval routes.';
  if(!r.wf||r.wf.open||!r.wf.exception)return 'This claim already has a route.';
  A=A||caNow();
  const pre=caPreflight(r,{legacy:true});
  if(pre.error)return pre.error;
  r.wf=null;
  caStart(r,pre,A,{migrate:true});
  caLog(r,r.status,'Route assigned by '+caN(A.who)+'.',A);
  return '';
}

/* ── Demo claims that show the engine at work ──────────────────────────── */
function caSeedClaim(o){
  const u=idUser(caU(o.email)),p=expPerson(u?u.eid:'')||{};
  const r={id:expNextId++,key:expNextKey++,title:o.title,claimFor:o.claimFor||'Self',employeeEid:p.eid||'',name:p.name||'',empId:p.empId||'',email:p.email||'',
    category:o.category,currency:'INR',appType:'Reimbursement',travelMode:o.travelMode||'None',notes:o.notes||'',status:'Draft',
    appliedOn:o.on,reimbursedOn:'',createdBy:u?u.userId:'',createdAt:caDateLabel(o.on)+' | 09:30:00 AM',policyJust:{},migrated:true,idMigrated:true,
    entity:ID_HOME_ENTITY,lines:o.lines.map(function(l,i){return {id:i+1,title:l[0],amount:l[1],subCat:l[2],start:l[3],end:l[3],proof:l[4]||'receipt-'+(i+1)+'.pdf',proofUrl:'',
      comments:'',cols:{},status:'Pending',paidBy:l[5]||'Employee',merchant:l[6]||'',invoice:l[7]||'',approved:null};})};
  r.logs=[{date:caDateLabel(o.on),time:'09:30:00 AM',user:caN(r.createdBy),userId:r.createdBy,status:'Draft',action:'Expense drafted.'}];
  if(typeof epEvaluate==='function'){
    const ev=epEvaluate(epCtxOf(r));
    ev.needJust.forEach(function(k){r.policyJust[k]=o.just||'Business need confirmed with the reporting manager before travel.';});
  }
  expensesData.unshift(r);
  const pre=caPreflight(r,{iso:o.on});
  if(pre.error){r.seedError=pre.error;return r;}
  caStart(r,pre,caAt(r.createdBy,o.on,'09:35:00 AM'));
  return r;
}
function caSeedDemo(){
  caNotifSilent=true;
  /* 1. Three-stage travel route, overdue at the manager - escalated to the budget team. */
  caSeedClaim({email:'tarak.swain@maaserp.com',title:'Client roadshow - Mumbai and Pune',category:'Travel Reimbursement',travelMode:'Flight',on:'2026-10-27',
    just:'Roadshow approved by the Sales head; three client meetings in two cities.',
    lines:[['Flight Hyderabad to Mumbai',18500,'Intercity Travel - Air','2026-10-20','boarding-hyd-bom.pdf','Employee','IndiGo','6E-55120'],
      ['Train Mumbai to Pune',2400,'Intercity Travel - Train','2026-10-22','irctc-ticket.pdf','Employee','IRCTC','PNR4411902'],
      ['Flight Pune to Hyderabad',31600,'Intercity Travel - Air','2026-10-24','boarding-pnq-hyd.pdf','Employee','Air India','AI-77310']]});
  /* 2. Manager has left: the fallback (HR) holds Stage 1. */
  caSeedClaim({email:'anika@testemp.com',title:'Sprint planning dinner',category:'Meal Allowance',on:'2026-11-03',
    lines:[['Team dinner - sprint 42',1800,'Dinner','2026-11-02','dinner-bill.jpg','Employee','Paradise Biryani','PB-20931']]});
  /* 3. Manager reduced a line; Finance now sees the lower ceiling. */
  const c3=caSeedClaim({email:'premnath.jayachandran@opendhi.com',title:'Bangalore client workshop stay',category:'Accommodation',on:'2026-11-03',
    lines:[['Hotel - 2 nights',6000,'Accommodation','2026-10-29','hotel-invoice.pdf','Employee','Lemon Tree','LT-88213'],
      ['Extra night (company booked)',3500,'Accommodation','2026-10-31','company-booking.pdf','Company','Lemon Tree','LT-88214']]});
  if(c3.wf)caDecide(c3.id,{scope:'lines',lines:{1:{decision:'Partially Approve',amount:5000,reason:'City hotel cap is 2,500 a night.'},2:{decision:'Approve'}},comment:''},caAt(caU('prem.raj@maaserp.com'),'2026-11-04','11:20:00 AM'));
  /* 4. The FRD example: final Partially Approved, payable 7,500 (company-paid train excluded). */
  const c4=caSeedClaim({email:'syed.ayaz@opendhi.com',title:'Chennai vendor audit',category:'Travel Reimbursement',travelMode:'Flight',on:'2026-10-14',
    lines:[['Flight Hyderabad to Chennai',6000,'Intercity Travel - Air','2026-10-12','flight-maa.pdf','Employee','IndiGo','6E-40218'],
      ['Train Chennai to Hyderabad',5000,'Intercity Travel - Train','2026-10-13','train-company.pdf','Company','IRCTC','PNR5521093'],
      ['Airport cab',2000,'One Way','2026-10-12','cab-receipt.pdf','Employee','Ola','OLA-99812']]});
  if(c4.wf){
    caDecide(c4.id,{scope:'claim',decision:'Approve',comment:'Audit was planned.'},caAt(caU('prem.raj@maaserp.com'),'2026-10-15','10:05:00 AM'));
    caDecide(c4.id,{scope:'lines',lines:{1:{decision:'Approve'},2:{decision:'Approve'},3:{decision:'Partially Approve',amount:1500,reason:'Airport cab capped at the metered fare.'}},comment:''},caAt(caU('vikram.rao@opendhi.com'),'2026-10-16','04:40:00 PM'));
  }
  /* 5. Fully paid through a verified manual payment. */
  const c5=caSeedClaim({email:'prem.raj@maaserp.com',title:'Site visits - October fuel',category:'Fuel Reimbursement',on:'2026-10-19',
    just:'Four site visits to the Shamshabad warehouse.',
    lines:[['Fuel - site visits',2800,'Car','2026-10-18','fuel-bills.pdf','Employee','HP Petrol','HP-30019']]});
  if(c5.wf){
    caDecide(c5.id,{scope:'claim',decision:'Approve',comment:''},caAt(caU('shaun@testemp.com'),'2026-10-20','10:00:00 AM'));
    caDecide(c5.id,{scope:'claim',decision:'Approve',comment:'Receipts match.'},caAt(caU('vikram.rao@opendhi.com'),'2026-10-21','12:15:00 PM'));
    const F=caAt(caU('vikram.rao@opendhi.com'),'2026-10-25','05:20:00 PM');
    caPaySetRoute(c5.id,'Manual/External Payment','',F);
    caPaySettle(c5.id,{amount:2800,date:'2026-10-25',ref:'UTRN2026102500418',evidence:'bank-advice-oct.pdf',remarks:'NEFT from the operating account.'},F);
  }
  /* 6. The employee persona's claim, sent back for the GST invoice. */
  const c6=caSeedClaim({email:'meera@testemp.com',title:'UX research handbook',category:'Books & Learning',on:'2026-11-02',
    lines:[['Book - Observing the User Experience',1450,'Books','2026-10-30','order-confirmation.pdf','Employee','Sapna Book House','SBH-55120']]});
  if(c6.wf)caDecide(c6.id,{scope:'claim',decision:'Follow-Up',reason:'Please attach the GST invoice; the file uploaded is an order confirmation.'},caAt(caU('prem.raj@maaserp.com'),'2026-11-04','02:10:00 PM'));
  caNotifSilent=false;
}

/* ── Load ──────────────────────────────────────────────────────────────── */
caMigrate();
caSeedDemo();
caTick();
