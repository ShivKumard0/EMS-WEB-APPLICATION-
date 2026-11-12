/* ══ FUNDING & BUDGETS (FR-FB, Build 6) ═══════════════════════════════════════
   Expense Management → Funding & Budgets. js/budgets-ui.js draws the page;
   this file holds the rules. Four things are kept apart and never merged:

   1. CORPORATE BUDGET - what the company authorizes a business unit or
      purpose to spend: a budget per entity and financial year, divided into
      allocation lines (Department / Category / Subcategory / Cost Centre /
      Project). A line may name a Parent Allocation whose scope contains it.
   2. BUDGET UTILIZATION - what occupies that authority. Every financial
      obligation (an expense line, an advance, an imprest request or fund) is
      ONE source with ONE current classification: Pending (in approval),
      Committed (approved, not yet realized), Actual (accepted expense) or
      Funding Exposure (issued advance/imprest money not yet accounted for).
      bgSyncAll() derives each source's classification from its own record
      and posts only the differences as budget events, so moving from request
      to approval to payment reclassifies an amount instead of adding it
      again. An advance-funded expense, once accepted, moves the amount out of
      the advance's exposure into the expense's allocation (Build 5 records the
      accepted utilization; this file reads it).
   3. CORPORATE FUNDING - internal, verified records of company money per
      funding source. The "Recorded Funding Balance (Internal)" is a ledger
      position, never a bank balance; nothing here moves money.
   4. PAYMENTS - Build 4 reimbursement settlements and Build 5 disbursements,
      returns and recoveries stay where they are. A verified payment is linked
      to a funding source once; approving an expense affects the budget,
      paying it affects funding.

   Approvals reuse the Build 4 engine (js/expense-approvals.js) through its
   extension registry: budgets, revisions, transfers, exceptions and year
   close are request kinds with their own routes and RBAC rights. Builds 3-5
   are frozen; this file joins them by wrapping their service functions (the
   way js/history.js does), so their own rules run unchanged.

   Defaults confirmed by the user (7 Nov 2026): Budget Control OFF per entity
   until enabled; Warning enforcement; no automatic quarter carry-forward;
   control OFF = "Not Evaluated", control ON + no matching budget = Warning
   with justification; funding-source tracking OFF; funding maker-checker ON. */

/* ── Helpers ──────────────────────────────────────────────────────────── */
function bgCan(code){return typeof emsCan==='function'&&emsCan(code);}
function bgPCan(A,code){return caPersonCan(A.who,code);}
function bgNow(){return caNow();}
function bgEnt(){return idEntity();}
function bgM(n){return caMoney2(n);}
function bgSum(list,fn){return list.reduce(function(s,x){return s+Math.round((Number(fn(x))||0)*100);},0)/100;}
function bgStamp(A){return A.date+' | '+A.time;}
function bgPad(n){return String(n).padStart(2,'0');}
function bgLog(rec,status,action,A){
  A=A||bgNow();rec.logs=rec.logs||[];
  const via=caVia(A),row={date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:status,action:action+caViaText(A)};
  if(via)row.actualUserId=via;
  rec.logs.unshift(row);
}
function bgUniq(a){return a.filter(function(x,i){return x!=null&&x!==''&&a.indexOf(x)===i;});}
function bgActorOf(args){for(let i=args.length-1;i>=0;i--){const a=args[i];if(a&&typeof a==='object'&&a.who&&a.iso)return a;}return bgNow();}

/* ── Entity base currency (Company Settings → Basic Details) ──────────── */
/* A country's usual currency is only the starting value; each entity sets
   its own. ADT is global - nothing assumes INR. */
const BG_COUNTRY_CUR={'India':'INR','United Arab Emirates':'AED','UAE':'AED','United Kingdom':'GBP','UK':'GBP','United States':'USD','USA':'USD',
  'Germany':'EUR','France':'EUR','Italy':'EUR','Spain':'EUR','Netherlands':'EUR','Ireland':'EUR'};
function bgEntityRow(ent){return (typeof entitiesData!=='undefined'?entitiesData:[]).find(function(e){return e.entityId===ent;})||null;}
function bgBaseCurrency(ent){const e=bgEntityRow(ent||bgEnt());if(!e)return '';return e.baseCurrency||BG_COUNTRY_CUR[e.country]||'';}
function entSetBaseCurrency(ent,cur,A){
  A=A||bgNow();ent=ent||bgEnt();
  if(!bgPCan(A,'foundation.entity.update'))return caN(A.who)+' cannot change entity details (foundation.entity.update).';
  if(EXP_CURRENCIES.indexOf(cur)<0)return 'Pick the base currency.';
  const e=bgEntityRow(ent);if(!e)return 'No such entity.';
  const was=bgBaseCurrency(ent);if(was===cur)return '';
  e.baseCurrency=cur;e.logs=e.logs||[];
  bgLog(e,'Updated','Base currency changed from '+(was||'not set')+' to '+cur+' by '+caN(A.who)+'. Existing budgets keep their own currency.',A);
  return '';
}

/* ── Cost Centre and Project masters (Company Settings → Company Structure) ── */
const bgCostCentres=[],bgProjects=[];
let bgCcNext=1,bgPrjNext=1;
function bgmStore(kind){return kind==='project'?bgProjects:bgCostCentres;}
function bgmNoun(kind){return kind==='project'?'Project':'Cost Centre';}
function bgmList(kind,ent){ent=ent||bgEnt();return bgmStore(kind).filter(function(x){return x.entity===ent;});}
function bgmRec(kind,id){return bgmStore(kind).find(function(x){return x.id===Number(id);})||null;}
function bgmLabel(x){return x?x.code+' · '+x.name:'';}
/* Selectable in a new transaction: Active, and inside its dates. */
function bgmSelectable(kind,id,iso){
  const x=bgmRec(kind,id);iso=iso||wbToday();
  if(!x||x.entity!==bgEnt()||x.status!=='Active')return false;
  const from=kind==='project'?x.startDate:x.effFrom,to=kind==='project'?x.endDate:x.effTo;
  return (!from||iso>=from)&&(!to||iso<=to);
}
function bgmActive(kind,iso){return bgmList(kind).filter(function(x){return bgmSelectable(kind,x.id,iso);});}
function bgmSave(kind,d,A){
  A=A||bgNow();
  if(!bgPCan(A,'foundation.dept.manage'))return caN(A.who)+' cannot maintain Company Structure (foundation.dept.manage).';
  const noun=bgmNoun(kind),list=bgmList(kind);
  const code=String(d.code||'').trim().toUpperCase(),name=String(d.name||'').trim();
  if(!code)return noun+' Code is required.';
  if(!/^[A-Z0-9][A-Z0-9_-]{1,19}$/.test(code))return noun+' Code: 2 to 20 letters, digits, - or _.';
  if(!name)return noun+' Name is required.';
  if(list.some(function(x){return x.id!==d.id&&x.code===code;}))return 'Code '+code+' is already used by another '+noun.toLowerCase()+' in this entity.';
  if(d.dept&&(typeof csDeptNames!=='function'||csDeptNames().indexOf(d.dept)<0))return 'Pick an active department.';
  if(d.ownerUid&&!idInEntity(d.ownerUid,bgEnt()))return 'The owner must be an active user of this entity.';
  const from=kind==='project'?d.startDate:d.effFrom,to=kind==='project'?d.endDate:d.effTo;
  if(from&&to&&to<from)return (kind==='project'?'End Date cannot be before Start Date.':'Effective To cannot be before Effective From.');
  const f={code:code,name:name,dept:d.dept||'',ownerUid:d.ownerUid||'',desc:String(d.desc||'').trim()};
  if(kind==='project'){f.startDate=d.startDate||'';f.endDate=d.endDate||'';}else{f.effFrom=d.effFrom||'';f.effTo=d.effTo||'';}
  if(d.id!=null){
    const x=bgmRec(kind,d.id);if(!x||x.entity!==bgEnt())return 'No such '+noun.toLowerCase()+'.';
    const ch=Object.keys(f).filter(function(k){return String(x[k]||'')!==String(f[k]||'');});
    Object.assign(x,f);if(ch.length)bgLog(x,x.status,noun+' updated ('+ch.join(', ')+').',A);
    return '';
  }
  const x=Object.assign({id:kind==='project'?bgPrjNext++:bgCcNext++,entity:bgEnt(),status:'Active',createdBy:A.who,createdAt:bgStamp(A),logs:[]},f);
  bgmStore(kind).push(x);bgLog(x,'Active',noun+' '+code+' created.',A);
  return '';
}
function bgmSetStatus(kind,id,status,A){
  A=A||bgNow();
  if(!bgPCan(A,'foundation.dept.manage'))return caN(A.who)+' cannot maintain Company Structure.';
  const x=bgmRec(kind,id);if(!x||x.entity!==bgEnt())return 'No such record.';
  const ok=kind==='project'?['Active','Inactive','Completed']:['Active','Inactive'];
  if(ok.indexOf(status)<0||status===x.status)return 'Pick a different status.';
  const was=x.status;x.status=status;
  bgLog(x,status,'Status '+was+' → '+status+' by '+caN(A.who)+'.'+(status!=='Active'?' It can no longer be picked for new transactions; history keeps it.':''),A);
  return '';
}
/* Free-text Cost Center / Project values on Build 5 advances. They are never
   converted silently; an authorized user maps a value to a master and the
   original text stays on the record. */
function bgmFreeText(kind){
  const f=kind==='project'?'project':'costCenter',idf=kind==='project'?'projectId':'costCentreId',m={};
  advancesData.forEach(function(r){if(r.entity!==bgEnt()||r[idf])return;const t=String(r[f]||'').trim();if(t)(m[t]=m[t]||[]).push(r);});
  return Object.keys(m).sort().map(function(t){return {text:t,recs:m[t]};});
}
function bgmMapFreeText(kind,text,id,A){
  A=A||bgNow();
  if(!bgPCan(A,'foundation.dept.manage'))return caN(A.who)+' cannot map Company Structure values.';
  const x=bgmRec(kind,id);if(!x||x.entity!==bgEnt()||x.status!=='Active')return 'Pick an active '+bgmNoun(kind).toLowerCase()+'.';
  const row=bgmFreeText(kind).find(function(r){return r.text===text;});if(!row)return 'Nothing unmapped carries "'+text+'".';
  const idf=kind==='project'?'projectId':'costCentreId';
  row.recs.forEach(function(r){r[idf]=x.id;advLog(r,r.status,'Free-text '+bgmNoun(kind).toLowerCase()+' "'+text+'" mapped to '+bgmLabel(x)+' by '+caN(A.who)+'. The original text is kept.',A);});
  bgLog(x,x.status,row.recs.length+' existing record'+(row.recs.length===1?'':'s')+' with "'+text+'" mapped by '+caN(A.who)+': '+row.recs.map(expKey).join(', ')+'.',A);
  return '';
}

/* ── Settings and financial years ─────────────────────────────────────── */
const BG_ENFORCE=['Warning','Blocking'];
const bgCfgBook={},bgFyBook={};
function bgCfg(ent){
  ent=ent||bgEnt();
  return bgCfgBook[ent]||(bgCfgBook[ent]={fyStartMonth:4,control:false,enforcement:'Warning',noMatch:'Warning',quarterCarry:false,separateActivation:false,
    fundingTracking:false,fundingMakerChecker:true,fundingEvidence:true,nearEndDays:30,budgetTypes:['Operating','Department','Category'],logs:[]});
}
function bgCfgSave(o,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.manage'))return caN(A.who)+' cannot change budget settings (budget.manage).';
  const c=bgCfg(),ch=[];
  const m=parseInt(o.fyStartMonth,10);if(isNaN(m)||m<1||m>12)return 'Pick the financial year start month.';
  if(BG_ENFORCE.indexOf(o.enforcement)<0)return 'Pick the default enforcement.';
  if(BG_ENFORCE.indexOf(o.noMatch)<0)return 'Pick what happens when no budget matches.';
  const nd=parseInt(o.nearEndDays,10);if(isNaN(nd)||nd<0||nd>120)return 'Year-end reminder days must be 0 to 120.';
  const reason=String(o.reason||'').trim();
  /* Turning a control off removes enforcement - an audited action with a reason. */
  if(c.control&&!o.control&&!reason)return 'Say why Budget Control is being turned off; the reason is recorded.';
  if(c.fundingTracking&&!o.fundingTracking&&!reason)return 'Say why funding-source tracking is being turned off; the reason is recorded.';
  const set=function(k,v,label,fmt){if(c[k]!==v){ch.push(label+': '+(fmt?fmt(c[k]):c[k])+' → '+(fmt?fmt(v):v));c[k]=v;}};
  const yn=function(v){return v?'On':'Off';};
  set('fyStartMonth',m,'Financial year starts',function(v){return WB_MON?WB_MON[v-1]:v;});
  set('control',!!o.control,'Budget Control',yn);set('enforcement',o.enforcement,'Default enforcement');set('noMatch',o.noMatch,'No matching budget');
  set('quarterCarry',!!o.quarterCarry,'Quarter carry-forward',yn);set('separateActivation',!!o.separateActivation,'Separate activation step',yn);
  set('fundingTracking',!!o.fundingTracking,'Funding-source tracking',yn);set('fundingMakerChecker',!!o.fundingMakerChecker,'Funding maker-checker',yn);
  set('fundingEvidence',!!o.fundingEvidence,'Evidence required to verify funding',yn);set('nearEndDays',nd,'Year-end reminder (days)');
  if(ch.length)c.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,action:ch.join('; ')+'.'+(reason?' Reason: '+reason:'')});
  return '';
}
function bgTypeAdd(name,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.manage'))return caN(A.who)+' cannot change budget types.';
  name=String(name||'').trim();if(!name)return 'Enter the budget type.';
  const c=bgCfg();if(c.budgetTypes.some(function(t){return t.toLowerCase()===name.toLowerCase();}))return name+' already exists.';
  c.budgetTypes.push(name);c.logs.unshift({date:A.date,time:A.time,user:caN(A.who),userId:A.who,action:'Budget type "'+name+'" added.'});
  return '';
}
function bgFyRange(sy,ent){
  const m=bgCfg(ent).fyStartMonth;
  const start=sy+'-'+bgPad(m)+'-01',end=cdISO(new Date(sy+1,m-1,0));
  return {label:m===1?'FY '+sy:'FY '+sy+'-'+bgPad((sy+1)%100),start:start,end:end,startYear:sy};
}
function bgFyOf(iso,ent){const y=Number(iso.slice(0,4)),mo=Number(iso.slice(5,7)),m=bgCfg(ent).fyStartMonth;return bgFyRange(mo>=m?y:y-1,ent);}
function bgQuarterOf(iso,fyStart){
  const a=Number(fyStart.slice(0,4))*12+Number(fyStart.slice(5,7))-1,b=Number(iso.slice(0,4))*12+Number(iso.slice(5,7))-1;
  return Math.min(4,Math.max(1,Math.floor((b-a)/3)+1));
}
function bgFyOptions(){const cur=bgFyOf(wbToday());return [cur,bgFyRange(cur.startYear+1)];}
function bgFyStatus(label,ent){ent=ent||bgEnt();return (bgFyBook[ent]||{})[label]||{status:'Open'};}

/* ── Scope of an allocation ───────────────────────────────────────────── */
const BG_DIMS=['dept','category','subCat','ccId','prjId'];
function bgScopeOf(x){return {dept:x.dept||'',category:x.category||'',subCat:x.subCat||'',ccId:x.ccId||'',prjId:x.prjId||''};}
function bgScopeContains(outer,inner){return BG_DIMS.every(function(k){return !outer[k]||outer[k]===inner[k];});}
function bgScopeEqual(a,b){return BG_DIMS.every(function(k){return (a[k]||'')===(b[k]||'');});}
function bgScopeIntersects(a,b){return BG_DIMS.every(function(k){return !a[k]||!b[k]||a[k]===b[k];});}
/* A transaction matches a line when every dimension the line names is the transaction's. */
function bgMatches(line,ctx){return BG_DIMS.every(function(k){return !line[k]||line[k]===(ctx[k]||'');});}
function bgScopeLabel(x){
  const cc=x.ccId?bgmRec('cc',x.ccId):null,pj=x.prjId?bgmRec('project',x.prjId):null;
  return [x.dept||'All departments',x.category||'All categories'].concat(x.subCat?[x.subCat]:[]).concat(cc?[cc.code]:[]).concat(pj?[pj.code]:[]).join(' · ');
}

/* ── Budgets and allocation lines ─────────────────────────────────────── */
const bgBudgets=[];
let bgNextId=80001,bgNextKey=1001,bgAllocNext=1;
function bgRec(id){return bgBudgets.find(function(b){return b.id===id;})||null;}
function bgAlloc(aid){aid=Number(aid);for(let i=0;i<bgBudgets.length;i++){const a=bgBudgets[i].allocations.find(function(x){return x.id===aid;});if(a)return a;}return null;}
function bgAllocKey(a){return a?a.key:'';}
function bgChildren(b,aid){return b.allocations.filter(function(x){return x.parentId===aid&&x.status==='Active';});}
function bgAncestors(a){const out=[];let p=a&&a.parentId?bgAlloc(a.parentId):null,g=0;while(p&&g++<20){out.push(p);p=p.parentId?bgAlloc(p.parentId):null;}return out;}
function bgSubtreeIds(b,aid){const out=[aid];let i=0;while(i<out.length){b.allocations.forEach(function(x){if(x.parentId===out[i]&&out.indexOf(x.id)<0)out.push(x.id);});i++;}return out;}
function bgTopLevel(b){return b.allocations.filter(function(x){return !x.parentId&&x.status==='Active';});}
function bgAllocated(b){return bgSum(bgTopLevel(b),function(x){return x.amount;});}
function bgReserve(b){return bgM(b.amount-bgAllocated(b));}
function bgEnf(a,b){return (a&&a.enforcement)||b.enforcement||bgCfg(b.entity).enforcement;}
/* Who may own a budget or allocation: users RBAC authorizes to view and track budgets. */
function bgOwnerPool(ent){
  ent=ent||bgEnt();
  return idUsersIn(ent).map(function(u){return u.userId;}).filter(function(uid){const p=emsPersonPerms(uid);return idUserActive(uid)&&p['budget.view']&&p['budget.util.view'];});
}
function bgBudgetSave(d,A){
  A=A||bgNow();
  const ent=bgEnt(),cfg=bgCfg(ent),edit=d.id!=null,b=edit?bgRec(d.id):null;
  if(edit){
    if(!b||b.entity!==ent)return 'No such budget.';
    if(['Draft','Follow-Up'].indexOf(b.status)<0)return expKey(b)+' is '+b.status+'; an approved budget changes only through an approved revision.';
    const own=b.createdBy===A.who||b.submittedBy===A.who||caIsClaimant(b,A.who);
    if(!((own&&(bgPCan(A,'budget.create')||bgPCan(A,'budget.submit')))||bgPCan(A,'budget.manage')))return caN(A.who)+' cannot edit '+expKey(b)+'.';
  }else if(!bgPCan(A,'budget.create'))return caN(A.who)+' cannot create budgets (budget.create).';
  const name=String(d.name||'').trim();if(!name)return 'Budget Name is required.';
  const fy=bgFyOptions().concat(b?[{label:b.fy,start:b.fyStart,end:b.fyEnd}]:[]).find(function(f){return f.label===d.fy;});
  if(!fy)return 'Pick the financial year.';
  if(bgFyStatus(fy.label,ent).status==='Closed')return fy.label+' is closed.';
  if(cfg.budgetTypes.indexOf(d.budgetType)<0)return 'Pick the budget type.';
  if(!d.ownerUid||bgOwnerPool(ent).indexOf(d.ownerUid)<0)return 'Pick a Budget Owner whom RBAC authorizes to own budgets.';
  if(EXP_CURRENCIES.indexOf(d.currency)<0)return 'Pick the budget currency.';
  const amt=bgM(parseFloat(d.amount));if(!(amt>0))return 'Total Budget Amount must be more than 0.';
  let quarters=null;
  if(d.quarterly){
    quarters=(d.quarters||[]).slice(0,4).map(function(v){return bgM(parseFloat(v)||0);});
    if(quarters.length!==4||quarters.some(function(v){return v<0;}))return 'Enter the four quarter amounts (0 or more).';
    if(bgSum(quarters,function(v){return v;})>amt+0.001)return 'Quarter amounts total '+expMoney(bgSum(quarters,function(v){return v;}),d.currency)+'; they cannot exceed the annual budget of '+expMoney(amt,d.currency)+'.';
  }
  if(BG_ENFORCE.indexOf(d.enforcement)<0)return 'Pick Warning or Blocking.';
  const thr=d.threshold===''||d.threshold==null?'':parseFloat(d.threshold);
  if(thr!==''&&(isNaN(thr)||thr<1||thr>100))return 'Warning Threshold must be 1 to 100 %.';
  if(!d.effFrom||d.effFrom<fy.start||d.effFrom>fy.end)return 'Effective From must fall inside '+fy.label+' ('+cdLabel(fy.start)+' – '+cdLabel(fy.end)+').';
  if(d.effTo&&(d.effTo<d.effFrom||d.effTo>fy.end))return 'Effective To must be between Effective From and the end of '+fy.label+'.';
  if(b&&bgAllocated(b)>amt+0.001)return 'Allocations already total '+expMoney(bgAllocated(b),d.currency)+'; the budget cannot be smaller.';
  const owner=idEmpOfUser(d.ownerUid);
  const f={title:name,fy:fy.label,fyStart:fy.start,fyEnd:fy.end,budgetType:d.budgetType,category:d.budgetType+' Budget',ownerUid:d.ownerUid,
    employeeEid:owner?owner.eid:'',name:owner?owner.name:caN(d.ownerUid),empId:owner?owner.empId:'',email:owner?owner.email||'':'',currency:d.currency,amount:amt,
    quarterly:!!d.quarterly,quarters:quarters,enforcement:d.enforcement,threshold:thr===''?'':Math.round(thr),effFrom:d.effFrom,effTo:d.effTo||'',
    desc:String(d.desc||'').trim(),proof:d.proof||'',requireCC:!!d.requireCC,requirePrj:!!d.requirePrj};
  if(b){
    const ch=['title','amount','fy','budgetType','ownerUid','currency','enforcement','threshold','effFrom','effTo','quarterly'].filter(function(k){return String(b[k])!==String(f[k]);});
    Object.assign(b,f);b.lines[0].amount=amt;b.lines[0].start=b.effFrom;b.lines[0].end=b.effTo||b.fyEnd;
    if(ch.length){bgLog(b,b.status,'Budget edited ('+ch.join(', ')+'): '+expMoney(amt,b.currency)+'.',A);bgNotePrep(b,A);}
    return '';
  }
  const nb=Object.assign({id:bgNextId++,key:bgNextKey++,prefix:'BGT',kind:'budget',entity:ent,claimFor:'Self',status:'Draft',allocations:[],versions:[],version:0,
    createdBy:A.who,createdAt:bgStamp(A),migrated:true,idMigrated:true},f);
  nb.lines=[{id:1,title:'Budget amount',amount:amt,subCat:'Budget',start:nb.effFrom,end:nb.effTo||nb.fyEnd,status:'Pending',approved:null}];
  nb.logs=[{date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:'Draft',action:'Budget draft created: '+expMoney(amt,nb.currency)+' for '+nb.fy+'. A draft enforces nothing.'}];
  bgBudgets.unshift(nb);
  return {rec:nb};
}
/* An allocation's scope fields, checked against the masters. */
function bgCheckScope(d){
  if(d.dept&&(typeof csDeptNames!=='function'||csDeptNames().indexOf(d.dept)<0))return 'Pick an active department, or All.';
  if(d.category&&EXP_CATEGORIES.indexOf(d.category)<0)return 'Pick an expense category, or All.';
  if(d.subCat&&(!d.category||(EXP_SUBCATS[d.category]||[]).indexOf(d.subCat)<0))return 'A subcategory needs its category.';
  if(d.ccId&&!bgmSelectable('cc',d.ccId))return 'Pick an active cost centre.';
  if(d.prjId&&!bgmSelectable('project',d.prjId))return 'Pick an active project.';
  return '';
}
/* The deepest line of the budget whose scope contains this scope (the suggested parent). */
function bgSuggestParent(b,scope,exceptId){
  let best=null;
  b.allocations.forEach(function(x){
    if(x.id===exceptId||x.status!=='Active')return;
    if(bgScopeContains(x,scope)&&!bgScopeEqual(x,scope)&&(!best||bgAncestors(x).indexOf(best)>=0))best=x;
  });
  return best;
}
/* Lines whose scope lies inside this one and that would sit beside it - candidates to become its children. */
function bgAdoptable(b,scope,parentId,exceptId){
  return b.allocations.filter(function(x){return x.id!==exceptId&&x.status==='Active'&&(x.parentId||null)===(parentId||null)&&bgScopeContains(scope,x)&&!bgScopeEqual(scope,x);});
}
function bgAllocSave(bid,d,A){
  A=A||bgNow();
  const b=bgRec(bid);if(!b||b.entity!==bgEnt())return 'No such budget.';
  if(!bgPCan(A,'budget.allocate'))return caN(A.who)+' cannot configure allocations (budget.allocate).';
  if(['Draft','Follow-Up'].indexOf(b.status)<0)return 'Allocations of '+expKey(b)+' ('+b.status+') change only through an approved revision or transfer.';
  const sc=bgScopeOf(d),e1=bgCheckScope(sc);if(e1)return e1;
  const amt=bgM(parseFloat(d.amount));if(!(amt>0))return 'Allocation Amount must be more than 0.';
  const self=d.id!=null?b.allocations.find(function(x){return x.id===d.id;}):null;
  if(d.id!=null&&!self)return 'No such allocation.';
  const parent=d.parentId?b.allocations.find(function(x){return x.id===Number(d.parentId)&&x.status==='Active';}):null;
  if(d.parentId&&!parent)return 'Pick a parent allocation of this budget.';
  if(parent&&self&&(parent.id===self.id||bgAncestors(parent).indexOf(self)>=0))return 'An allocation cannot sit under itself.';
  if(parent&&(!bgScopeContains(parent,sc)||bgScopeEqual(parent,sc)))return 'The parent '+parent.key+' ('+bgScopeLabel(parent)+') must contain this scope and be wider.';
  let quarters=null;
  if(b.quarterly){
    quarters=(d.quarters||[]).slice(0,4).map(function(v){return bgM(parseFloat(v)||0);});
    if(quarters.length!==4||quarters.some(function(v){return v<0;}))return 'Enter the four quarter amounts (0 or more).';
    if(bgSum(quarters,function(v){return v;})>amt+0.001)return 'Quarter amounts cannot exceed the allocation amount.';
  }
  if(d.ownerUid&&bgOwnerPool().indexOf(d.ownerUid)<0)return 'The Allocation Owner must be authorized to own budgets.';
  if(d.enforcement&&BG_ENFORCE.indexOf(d.enforcement)<0)return 'Pick Warning, Blocking or the budget default.';
  if(b.allocations.some(function(x){return x.status==='Active'&&x!==self&&bgScopeEqual(x,sc);}))return 'An allocation for exactly this scope already exists.';
  /* Lines inside this scope that the user chose to place under it. */
  const adopt=(d.adopt||[]).map(Number).map(function(id){return b.allocations.find(function(x){return x.id===id;});}).filter(Boolean);
  if(adopt.some(function(x){return !bgScopeContains(sc,x)||bgScopeEqual(sc,x)||(self&&x.id===self.id);}))return 'Only allocations inside this scope can be placed under it.';
  /* Every other line this scope could share a transaction with must be its ancestor or descendant. */
  const pid=parent?parent.id:null,chain=parent?[parent].concat(bgAncestors(parent)):[];
  const desc=self?bgSubtreeIds(b,self.id):[];
  const amb=b.allocations.filter(function(x){
    if(x===self||x.status!=='Active'||!bgScopeIntersects(x,sc))return false;
    if(chain.indexOf(x)>=0||desc.indexOf(x.id)>=0||adopt.indexOf(x)>=0)return false;
    if(adopt.some(function(y){return bgSubtreeIds(b,y.id).indexOf(x.id)>=0;}))return false;
    return true;
  });
  if(amb.length)return 'This scope overlaps '+amb.map(function(x){return x.key+' ('+bgScopeLabel(x)+')';}).join(', ')+' with no parent-child relation, so a transaction could be charged twice. Set a parent, place the narrower line under the wider one, or narrow a scope.';
  /* Ceilings: top level within the budget, children within their parent. */
  const kids=(self?bgChildren(b,self.id):[]).concat(adopt.filter(function(x){return !self||x.parentId!==self.id;}));
  if(bgSum(kids,function(x){return x.amount;})>amt+0.001)return 'The lines under it total '+expMoney(bgSum(kids,function(x){return x.amount;}),b.currency)+'; the allocation cannot be smaller.';
  const sib=b.allocations.filter(function(x){return x.status==='Active'&&x!==self&&adopt.indexOf(x)<0&&(x.parentId||null)===pid;});
  const room=parent?parent.amount:b.amount;
  if(bgSum(sib,function(x){return x.amount;})+amt>room+0.001)return (parent?'Lines under '+parent.key:'Top-level allocations')+' would total '+expMoney(bgSum(sib,function(x){return x.amount;})+amt,b.currency)+'; '+(parent?parent.key:'the budget')+' is '+expMoney(room,b.currency)+'.';
  const f=Object.assign(sc,{parentId:pid,amount:amt,quarters:quarters,ownerUid:d.ownerUid||'',enforcement:d.enforcement||''});
  let a=self;
  if(a){Object.assign(a,f);bgLog(b,b.status,'Allocation '+a.key+' updated: '+bgScopeLabel(a)+', '+expMoney(amt,b.currency)+'.',A);}
  else{a=Object.assign({id:bgAllocNext++,budgetId:b.id,status:'Active',createdBy:A.who,createdAt:bgStamp(A)},f);a.key='AL-'+(100+a.id);b.allocations.push(a);
    bgLog(b,b.status,'Allocation '+a.key+' added: '+bgScopeLabel(a)+', '+expMoney(amt,b.currency)+(parent?' under '+parent.key:'')+'.',A);}
  adopt.forEach(function(x){x.parentId=a.id;bgLog(b,b.status,x.key+' placed under '+a.key+'.',A);});
  bgNotePrep(b,A);
  return {rec:a};
}
function bgAllocDelete(bid,aid,A){
  A=A||bgNow();
  const b=bgRec(bid);if(!b)return 'No such budget.';
  if(!bgPCan(A,'budget.allocate'))return caN(A.who)+' cannot configure allocations.';
  if(['Draft','Follow-Up'].indexOf(b.status)<0)return 'Allocations of an approved budget change only through revisions or transfers.';
  const a=b.allocations.find(function(x){return x.id===Number(aid);});if(!a)return 'No such allocation.';
  if(bgChildren(b,a.id).length)return a.key+' has lines under it; move or remove them first.';
  b.allocations.splice(b.allocations.indexOf(a),1);bgLog(b,b.status,'Allocation '+a.key+' removed.',A);
  bgNotePrep(b,A);
  return '';
}
/* Structural checks: sums, phasing, masters, ambiguity inside the budget. */
function bgValidateBudget(b){
  const act=b.allocations.filter(function(x){return x.status==='Active';});
  if(!act.length)return 'Add at least one allocation line; expenses are charged to allocations.';
  if(bgAllocated(b)>b.amount+0.001)return 'Top-level allocations total '+expMoney(bgAllocated(b),b.currency)+', more than the budget.';
  for(let i=0;i<act.length;i++){
    const a=act[i],kids=bgChildren(b,a.id);
    if(bgSum(kids,function(x){return x.amount;})>a.amount+0.001)return 'Lines under '+a.key+' exceed it.';
    if(b.quarterly&&!a.quarters)return a.key+' needs quarter amounts (the budget is phased by quarter).';
    const e=bgCheckScope(a);if(e)return a.key+': '+e;
    for(let j=i+1;j<act.length;j++){const y=act[j];
      if(bgScopeIntersects(a,y)&&bgAncestors(a).indexOf(y)<0&&bgAncestors(y).indexOf(a)<0)return a.key+' and '+y.key+' overlap without a parent-child relation.';}
  }
  if(b.quarterly&&(!b.quarters||bgSum(b.quarters,function(v){return v;})>b.amount+0.001))return 'Quarter amounts must total no more than the annual budget.';
  if(bgOwnerPool(b.entity).indexOf(b.ownerUid)<0)return caN(b.ownerUid)+' is no longer authorized to own budgets.';
  if(bgFyStatus(b.fy,b.entity).status==='Closed')return b.fy+' is closed.';
  return '';
}
/* Allocations of two live budgets that could both charge one transaction. */
function bgConflicts(b){
  const out=[];
  bgBudgets.forEach(function(o){
    if(o===b||o.entity!==b.entity||['Active','Scheduled','Approved'].indexOf(o.status)<0||o.fy!==b.fy)return;
    if(!wbOverlap(b.effFrom,b.effTo,o.effFrom,o.effTo))return;
    b.allocations.forEach(function(x){if(x.status!=='Active')return;
      o.allocations.forEach(function(y){if(y.status==='Active'&&bgScopeIntersects(x,y))out.push({mine:x,other:y,budget:o});});});
  });
  return out;
}
function bgConflictText(c){return c.slice(0,3).map(function(x){return x.mine.key+' overlaps '+x.other.key+' of '+expKey(x.budget)+' ('+bgScopeLabel(x.other)+')';}).join('; ');}
function bgSnapshot(b,reason,ref,A){
  b.versions.forEach(function(v){if(v.status==='Current')v.status='Superseded';});
  b.version=(b.version||0)+1;
  b.versions.push({v:b.version,status:'Current',at:bgStamp(A),by:A.who,reason:reason,ref:ref||'',amount:b.amount,quarters:b.quarters?b.quarters.slice():null,
    allocations:b.allocations.map(function(a){return {id:a.id,key:a.key,parentId:a.parentId,scope:bgScopeLabel(a),amount:a.amount,quarters:a.quarters?a.quarters.slice():null,status:a.status};})});
}
/* Activation: approved, effective, and no live budget overlapping it. */
function bgActivateNow(b,A,manual){
  const today=wbToday(),c=bgConflicts(b);
  if(c.length){b.status='Approved';bgLog(b,'Approved','Not activated: '+bgConflictText(c)+'. Resolve the overlap first.',A);return 'Not activated: '+bgConflictText(c)+'.';}
  if(b.effTo&&b.effTo<today){b.status='Expired';bgLog(b,'Expired','The effective period has already ended.',A);return '';}
  if(b.effFrom>today){b.status='Scheduled';bgLog(b,'Scheduled','Scheduled: becomes Active on '+cdLabel(b.effFrom)+'.',A);return '';}
  b.status='Active';b.activatedOn=today;
  bgLog(b,'Active','Budget Active'+(manual?' (activated by '+caN(A.who)+')':'')+': '+expMoney(b.amount,b.currency)+' for '+b.fy+'.',A);
  caNotify([b.ownerUid],expKey(b)+' '+b.title+' is now Active',b);
  return '';
}
function bgActivate(id,A){
  A=A||bgNow();
  const b=bgRec(id);if(!b||b.entity!==bgEnt())return 'No such budget.';
  if(!bgPCan(A,'budget.activate'))return caN(A.who)+' cannot activate budgets (budget.activate).';
  if(['Approved','Inactive'].indexOf(b.status)<0)return 'Only an approved or inactive budget is activated; this one is '+b.status+'.';
  if(b.status==='Approved'&&!b.versions.length)return 'The budget has not completed approval.';
  const e=bgValidateBudget(b);if(e)return e;
  return bgActivateNow(b,A,true);
}
function bgDeactivate(id,reason,A){
  A=A||bgNow();
  const b=bgRec(id);if(!b||b.entity!==bgEnt())return 'No such budget.';
  if(!bgPCan(A,'budget.activate'))return caN(A.who)+' cannot deactivate budgets.';
  if(['Active','Scheduled'].indexOf(b.status)<0)return 'Only an active or scheduled budget is deactivated.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  b.status='Inactive';bgLog(b,'Inactive','Deactivated by '+caN(A.who)+': '+reason+' It no longer controls new transactions; recorded utilization is kept.',A);
  return '';
}

/* ── Shared approval engine: the Funding & Budgets request kinds ──────── */
const BG_KIND_WF={'budget':'Budget','budget revision':'Budget Revision','budget transfer':'Budget Transfer','budget exception':'Budget Exception','financial year close':'Financial Year Close'};
(function(){
  const p=function(ap,sub){return {approve:ap,submit:sub,others:'budget.manage',withdraw:sub,withdrawOthers:'budget.manage',reassign:'budget.manage',intervene:'budget.approval.intervene'};};
  Object.assign(CA_KIND_PERMS,{'budget':p('budget.approve','budget.submit'),'budget revision':p('budget.revise.approve','budget.revise.request'),
    'budget transfer':p('budget.transfer.approve','budget.transfer.request'),'budget exception':p('budget.exception.approve','budget.exception.request'),
    'financial year close':p('budget.approve','budget.manage')});
  /* With the module switched off its requests leave the approval queues and cannot be decided; they come back,
     untouched, when it is switched on again (decision 5). */
  const base={rec:function(id){return bgModuleOn()?(bgRec(id)||bgChg(id)):null;},recs:function(){return bgModuleOn()?bgBudgets.concat(bgChanges):[];},
    hidden:function(){return !bgModuleOn();},
    excluded:function(r){return bgExtraExcluded(r);},reassignCheck:function(r,st,to){return bgReassignCheck(r,st,to);},
    reassignPool:function(r,st){return bgReassignPool(r,st);},finalNotice:function(r,approved){return bgFinalNotice(r,approved);},
    route:function(r,iso){return bgRoute(r,iso);},policySig:function(r){return bgSig(r);},preflight:function(r,o){return bgEnginePreflight(r,o);},
    allowsPartial:function(r){return r.kind==='budget exception';},partialMsg:'Budgets, revisions, transfers and year closes are approved in full, rejected or sent back.',
    decisionCheck:function(r,items){return bgEngineDecisionCheck(r,items);},onFinal:function(r,A){bgOnFinal(r,A);},openFn:'bgOpenRecord',
    reviewInfo:function(r){return typeof bgReviewInfoHTML==='function'?bgReviewInfoHTML(r):'';},
    workflowRows:function(r){return typeof bgWorkflowRows==='function'?bgWorkflowRows(r):wfPlan([],[]);},
    resolveStage:{'Budget Owner':function(r){return bgOwnerApprovers(r);}},approverTypes:[]};
  Object.keys(BG_KIND_WF).forEach(function(k){
    CA_EXT[k]=Object.assign({},base,{stageFit:true,approverTypes:k==='budget exception'?['Budget Owner']:[],
      decisionHint:k==='budget exception'?'Approves the requested authority. To authorize a lower amount, use Amount.'
        :'Approves the request in full. A budget, revision, transfer or year close is approved, rejected or sent back as a whole.',
      finalNote:k==='budget'?'Approval creates no money; the budget controls spending from its effective date.':'The change applies once approved; approval creates no money.'});
  });
})();
function bgSig(r){return [r.kind,caTotal(r),r.allocId||'',r.fromAllocId||'',r.toAllocId||''].join('|');}
function bgRoute(r,iso){
  iso=iso||wbToday();
  const kind=BG_KIND_WF[r.kind];
  const ws=caWorkflows.filter(function(w){return caWfKindOf(w)===kind&&caWfInForce(w,iso);}).sort(function(a,b){return b.id-a.id;});
  if(!ws.length)return {error:'No active '+kind+' approval route (Funding & Budgets → Settings → Approval Workflows).'};
  return {wf:ws[0]};
}
/* The Budget Owner stage: the owner of the allocation (else of the budget) the request concerns. */
function bgOwnerApprovers(r){
  const a=r.allocId?bgAlloc(r.allocId):null,b=r.budgetId?bgRec(r.budgetId):null;
  const uid=(a&&a.ownerUid)||(b&&b.ownerUid)||'';
  return uid?{list:[uid]}:{list:[],why:'the budget has no owner'};
}
/* Separation of duties beyond the requester (decision 7). Nobody approves a budget exception for their own claim or
   advance, whoever raised it; and a later stage is decided by someone other than whoever approved an earlier one, so
   the Finance stage is never decided by the owner or manager who approved before it. */
function bgExtraExcluded(r){
  const out=[];
  if(r.kind==='budget exception'&&r.sourceKind){
    const src=bgSrcRecord(r.sourceKind,r.sourceId);
    if(src)[caClaimantUser(src),src.createdBy,src.submittedBy].concat(src.preparers||[]).forEach(function(u){if(u)out.push(u);});
  }
  if(r.wf&&r.wf.stages)r.wf.stages.forEach(function(st){
    if(st.status!=='Approved')return;
    st.decisions.forEach(function(d){if(!d.void&&(d.decision==='Approved'||d.decision==='Partially Approved'))out.push(d.who);});
  });
  return out;
}
/* Reassignment keeps the stage's own definition: a team stage goes to another member of that team, a role stage to
   another holder of the role - never to someone outside it (decision 7: no Finance bypass). */
function bgStageEligible(r,st){
  if(st.type==='RBAC Team')return caTeamApprovers(st.ref,caKind(r));
  if(st.type==='Role')return caRoleUsers(st.ref);
  return null;
}
function bgReassignCheck(r,st,to){
  const el=bgStageEligible(r,st);
  if(el&&el.indexOf(to)<0)return caN(to)+' is not '+(st.type==='RBAC Team'?'an active member of the team '+caTeamName(st.ref):'a holder of the role '+st.ref)+', which stage '+st.n+' ('+st.name+') requires.';
  return '';
}
function bgReassignPool(r,st){const el=bgStageEligible(r,st),pool=caApproverPool(caKind(r));return el?pool.filter(function(u){return el.indexOf(u)>=0;}):pool;}
/* A claim's or advance's exception: its amount is the calculated overrun, so its requester learns only the outcome (decision 8). */
function bgFinalNotice(r){
  if(r.kind==='budget exception'&&r.sourceKey)return expKey(r)+' was '+r.status.toLowerCase()+' (for '+r.sourceRef+').';
  return null;
}
/* Whoever edits someone else's budget prepares it, and so cannot approve it (Build 4 maker-checker). */
function bgNotePrep(b,A){
  if(!b||!A||A.who===b.createdBy||caIsClaimant(b,A.who)||(b.preparers||[]).indexOf(A.who)>=0)return;
  caAddPreparer(b,A.who);bgLog(b,b.status,caN(A.who)+' edited this budget, so cannot approve it.',A);
}
function bgEnginePreflight(r,o){
  o=o||{};
  let e='';
  if(r.kind==='budget'){e=bgValidateBudget(r);if(!e){const c=bgConflicts(r);if(c.length)e='It overlaps a live budget: '+bgConflictText(c)+'.';}}
  else if(r.kind==='budget revision')e=bgValidateRevision(r);
  else if(r.kind==='budget transfer')e=bgValidateTransfer(r);
  else if(r.kind==='budget exception')e=bgValidateException(r);
  else if(r.kind==='financial year close')e=bgValidateClose(r);
  if(e)return {error:e};
  const rt=bgRoute(r,o.iso);if(rt.error)return {error:rt.error,route:true};
  const defs=caActiveDefs(rt.wf);if(!defs.length)return {error:caWfKey(rt.wf)+' has no active stage.',route:true};
  const res=defs.map(function(d){return caResolve(d,r);});
  const fail=res.find(function(x){return x.error;});
  if(fail)return {error:'Approval cannot start - '+fail.error+' Ask an administrator to fix the route.',route:true};
  return {wf:rt.wf,resolved:res};
}
/* Submit a draft budget or budget change (the actor's own rights, idempotent). */
function bgSubmit(id,A){
  A=A||bgNow();
  const r=bgRec(id)||bgChg(id);if(!r||r.entity!==bgEnt())return 'No such record.';
  if(r.status!=='Draft')return 'Only a draft is submitted; this one is '+r.status+'.';
  const own=caIsClaimant(r,A.who)||r.createdBy===A.who;
  if(!(own&&bgPCan(A,caPk(r,'submit')))&&!bgPCan(A,caPk(r,'others')))return caN(A.who)+' cannot submit this '+(BG_KIND_WF[r.kind]||'record').toLowerCase()+'.';
  const pre=bgEnginePreflight(r);if(pre.error)return pre.error;
  return caStart(r,pre,A)?'':'This record already has an approval in progress.';
}
/* Before an approving decision on a change: it must still be applicable. */
function bgEngineDecisionCheck(r,items){
  if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
  let e='';
  if(r.kind==='budget'){e=bgValidateBudget(r);}
  else if(r.kind==='budget revision')e=bgValidateRevision(r);
  else if(r.kind==='budget transfer')e=bgValidateTransfer(r);
  else if(r.kind==='financial year close')e=bgValidateClose(r);
  return e?'Cannot approve now: '+e:'';
}
function bgOnFinal(r,A){
  if(r.status==='Rejected'){
    if(r.kind==='budget')bgLog(r,'Rejected','Budget rejected; it controls nothing.',A);
    return;
  }
  if(r.kind==='budget'){
    bgSnapshot(r,'Approved','',A);
    caNotify(caPermHolders('budget.manage').concat([r.ownerUid]).filter(function(u){return u!==r.submittedBy;}),expKey(r)+' '+r.title+' approved',r);
    if(bgCfg(r.entity).separateActivation){r.status='Approved';bgLog(r,'Approved','Approved; awaiting the separate activation step (budget.activate).',A);return;}
    bgActivateNow(r,A,false);return;
  }
  if(r.kind==='budget revision'){if(r.effDate>wbToday()){bgLog(r,r.status,'Approved; applies on '+cdLabel(r.effDate)+'.',A);return;}bgApplyRevision(r,A);return;}
  if(r.kind==='budget transfer'){bgApplyTransfer(r,A);return;}
  if(r.kind==='budget exception'){
    r.approvedLimit=bgM(caApprovedTotal(r));
    bgLog(r,r.status,'Exception authorized up to '+expMoney(r.approvedLimit,r.currency)+' ('+cdLabel(r.effFrom)+' – '+cdLabel(r.effTo)+'). It does not approve any expense or advance.',A);
    return;
  }
  if(r.kind==='financial year close'){bgApplyClose(r,A);return;}
}

/* ── Utilization: one classification per source, events for changes ──── */
const bgStates={},bgEvents=[];
let bgEvtNext=1;
function bgFrozenMap(m){return !!m&&!!m.fy&&bgFyStatus(m.fy,m.entity||bgEnt()).status==='Closed';}
/* The mapping that holds an advance's or imprest fund's exposure (if any). */
function bgHolderMap(h){if(!h)return null;return h.bgt&&h.bgt.alloc?h.bgt:null;}
/* MONEY UNDER BUDGET CONTROL (decision of 7 Nov 2026: control applies to new obligations only).
   An advance, or an imprest fund funded under Budget Control, is tracked whole: its accountable
   balance is funding exposure. An existing fund that comes under control at a later replenishment
   keeps the money it already held outside the budget: spending and returns use that money first
   (first in, first out) and only money issued under control is exposure. Finance can bring the
   existing balance in with an authorized Opening Exposure mapping (bgOpeningMap). Build 5's ledger
   is read, never changed. Returns {legacy, tracked, util:{'claimId/lineId': part paid from tracked money}}. */
function bgTrack(h,uFrom){
  const led=(h&&h.ledger)||[],F=(h&&h.bgTrackFrom)||{idx:0,base:0},O=h&&h.bgOpening;
  const oi=O?Math.max(O.idx,F.idx):Infinity,isFund=!!(h&&h.custodianEid);
  /* legacy: held outside the budget; counted: counted in a closed year (a fund's earlier segment); tracked: counted now. */
  let legacy=Number(F.base)||0,counted=Number(F.counted)||0,tracked=0;
  const split={},util={},utilC={},utilAll={};
  /* A bucket that goes negative borrows from the others in first-in-first-out order, so the three
     always add up to the Build 5 balance (custodian reconciliation, decision 3). */
  const norm=function(){
    let neg=0;
    if(legacy<0){neg=bgM(neg+legacy);legacy=0;}
    if(counted<0){neg=bgM(neg+counted);counted=0;}
    if(tracked<0){neg=bgM(neg+tracked);tracked=0;}
    if(neg<0){let x=Math.min(legacy,-neg);legacy=bgM(legacy-x);neg=bgM(neg+x);
      x=Math.min(counted,-neg);counted=bgM(counted-x);neg=bgM(neg+x);
      x=Math.min(tracked,-neg);tracked=bgM(tracked-x);neg=bgM(neg+x);
      if(neg<0)legacy=bgM(legacy+neg);}
  };
  for(let i=F.idx;i<=led.length;i++){
    if(i===oi){tracked=bgM(tracked+legacy);legacy=0;}
    if(i===led.length)break;
    const e=led[i],amt=Number(e.amount)||0;
    if(e.type==='Issuance'||e.type==='Replenishment'){
      /* Only money issued for a budget-controlled request is counted; a top-up requested before control stays outside. */
      const q=isFund?impRequests.find(function(x){return expKey(x)===e.source;}):null;
      if(q&&!q.bgMapped)legacy=bgM(legacy+amt);
      else{tracked=bgM(tracked+amt);split[e.txn]={u:0,c:0,t:amt};}
    }else if(e.type==='Utilization'||e.type==='Return'||e.type==='Recovery'){
      const u=Math.min(Math.max(0,legacy),amt),c=Math.min(Math.max(0,counted),bgM(amt-u)),t=bgM(amt-u-c);
      legacy=bgM(legacy-u);counted=bgM(counted-c);tracked=bgM(tracked-t);split[e.txn]={u:u,c:c,t:t};
      if(e.type==='Utilization'){const k=e.claimId+'/'+e.lineId;utilAll[k]=bgM((utilAll[k]||0)+amt);if(c)utilC[k]=bgM((utilC[k]||0)+c);
        if(i>=(uFrom||0))util[k]=bgM((util[k]||0)+t);}
    }else if(e.type==='Reversal'){
      const x=split[e.of];
      if(e.ofType==='Issuance'||e.ofType==='Replenishment'){if(x)tracked=bgM(tracked-amt);else legacy=bgM(legacy-amt);}
      else if(x&&(x.u+x.c+x.t)>0){const tot=x.u+x.c+x.t,tp=bgM(amt*x.t/tot),cp=bgM(amt*x.c/tot);tracked=bgM(tracked+tp);counted=bgM(counted+cp);legacy=bgM(legacy+amt-tp-cp);}
      else legacy=bgM(legacy+amt);
    }
    norm();
  }
  return {legacy:bgM(Math.max(0,legacy)),counted:bgM(Math.max(0,counted)),tracked:bgM(Math.max(0,tracked)),util:util,utilC:utilC,utilAll:utilAll};
}
/* Claims in approval paid from a tracked advance or fund draw on its money in the order they were
   raised: first the existing balance kept outside the budget (that part is reserved on the claim's
   own line), then money already counted as exposure (that part is linked, never reserved twice). */
function bgPools(){
  const P={};
  return {take:function(h,fundH){
    const hk=expKey(h);
    if(!Object.prototype.hasOwnProperty.call(P,hk)){
      const hm=bgHolderMap(h);
      if(!hm)P[hk]=null;
      else{const t=bgTrack(h),fr=bgFrozenMap(hm);P[hk]={lr:t.legacy,c:bgM(t.counted+(fr?t.tracked:0)),t:fr?0:t.tracked};}
    }
    const p=P[hk];if(!p)return null;
    const u=Math.min(fundH,p.lr);p.lr=bgM(p.lr-u);
    const sk=Math.min(bgM(fundH-u),p.c);p.c=bgM(p.c-sk);
    const k=Math.min(bgM(fundH-u-sk),p.t);p.t=bgM(p.t-k);
    return {k:k,s:sk};
  }};
}
/* A funded line's part in its holder's currency (the rate snapshot kept with the line). */
function bgToHolder(l,cur,h,fundC){if(!(fundC>0))return 0;if(cur===h.currency)return bgM(fundC);return l.advFx&&l.advFx.rate?bgM(fundC*l.advFx.rate):0;}
/* {l: linked (already counted as exposure), s: skipped (counted in a closed year)} in the claim's currency. */
function bgLinkAmt(P,l,cur,h,fundC){
  const fundH=bgToHolder(l,cur,h,fundC);if(!(fundH>0))return {l:0,s:0};
  const t=P.take(h,fundH);if(!t)return {l:0,s:0};
  return {l:bgM(fundC*t.k/fundH),s:bgM(fundC*t.s/fundH)};
}
function bgLinkPlan(exceptClaimId){
  const P=bgPools(),links={};
  expensesData.filter(function(c){return c.id!==exceptClaimId&&['Awaiting Approval','Follow-Up'].indexOf(c.status)>=0;}).sort(function(a,b){return a.id-b.id;})
    .forEach(function(c){c.lines.forEach(function(l){if(l.status==='Rejected'||!caIsFunded(l))return;const h=advHolder(l.advanceId);if(h)links['EXP-'+c.key+'/L'+l.id]=bgLinkAmt(P,l,c.currency,h,caCeilAdv(l));});});
  return {pools:P,links:links};
}
/* A mapping's rate; a mapping without one converts only within the same currency - never a guessed 1:1 (decision 6). */
function bgRateOf(m,cur){const r=Number(m&&m.rate);if(r>0)return r;return (!m||!m.cur||m.cur===cur)?1:0;}
/* The part of an accepted funded line paid from money already counted in a closed year, in the claim's currency. */
function bgSkipPart(holder,hFrozen,l,fund){
  if(!(fund>0))return 0;
  const t=bgTrack(holder),k=l._claimId+'/'+l.id,all=t.utilAll[k]||0;if(!(all>0))return 0;
  const sk=bgM((t.utilC[k]||0)+(hFrozen?(t.util[k]||0):0));
  return bgM(Math.min(fund,fund*sk/all));
}
function bgDesired(){
  const out={},plan=bgLinkPlan(null);
  const put=function(src,m,o){
    if(!m||!m.alloc)return;
    const k=src+'@'+m.fy;
    const s=out[k]||(out[k]={key:k,src:src,entity:o.entity,budget:m.budget,alloc:m.alloc,fy:m.fy,q:m.q,date:m.date,label:o.label,kind:o.kind,recId:o.recId,
      pending:0,committed:0,actual:0,exposure:0,linked:0,comp:null,carriedFrom:m.carriedFrom||null});
    ['pending','committed','actual','exposure','linked'].forEach(function(c){if(o[c])s[c]=bgM(s[c]+o[c]);});
    if(o.comp)s.comp=o.comp;
  };
  expensesData.forEach(function(c){
    c.lines.forEach(function(l){
      const src='EXP-'+c.key+'/L'+l.id,m=l.bgt&&l.bgt.alloc?l.bgt:null;
      const pend=['Awaiting Approval','Follow-Up'].indexOf(c.status)>=0&&l.status!=='Rejected';
      const fin=['Approved','Partially Approved','Reimbursed'].indexOf(c.status)>=0&&Number(l.approved)>0;
      const funded=caIsFunded(l);
      const fund=funded?(pend?caCeilAdv(l):fin?Math.min(Number(l.approvedAdv)||0,Number(l.approved)||0):0):0;
      const holder=funded?advHolder(l.advanceId):null,hm=bgHolderMap(holder),hFrozen=bgFrozenMap(hm);
      const info={entity:c.entity,label:expKey(c)+' · '+l.title,kind:'Expense line',recId:c.id};
      if(m&&!bgFrozenMap(m)){
        const rate=bgRateOf(m,c.currency);if(!rate)return;
        if(pend){const cap=caCeiling(l),lk=plan.links[src]||{l:0,s:0};
          /* Drawn from money already counted as exposure: linked only; from money counted in a closed
             year: not counted again; anything else is reserved here. */
          put(src,m,Object.assign({pending:bgM((cap-lk.l-lk.s)*rate),linked:bgM(lk.l*rate)},info));}
        else if(fin){const sk=holder&&hm?bgSkipPart(holder,hFrozen,Object.assign({_claimId:c.id},l),fund):0;
          put(src,m,Object.assign({actual:bgM((Number(l.approved)-sk)*rate)},info));}
        else put(src,m,info);
      }else if(!m&&fin&&fund>0&&hm&&!hFrozen){
        /* Never budget-evaluated itself (no mapping of its own), but paid from tracked money: that part stays in the
           holder's allocation - counting only utilization made while the holder's current mapping applies. */
        const tk=bgTrack(holder,hm.utilFrom||0).util[c.id+'/'+l.id]||0,hr=bgRateOf(hm,holder.currency);
        if(tk>0&&hr)put(src+'#F',hm,Object.assign({actual:bgM(tk*hr)},info));
      }
    });
  });
  advancesData.forEach(function(r){
    const m=bgHolderMap(r);if(!m||bgFrozenMap(m))return;
    const rate=bgRateOf(m,r.currency),info={entity:r.entity,label:expKey(r)+' · '+r.title,kind:'Advance',recId:r.id};if(!rate)return;
    if(['Awaiting Approval','Follow-Up'].indexOf(r.status)>=0)put('ADV-'+r.key,m,Object.assign({pending:bgM(caTotal(r)*rate)},info));
    else if(['Approved','Partially Approved'].indexOf(r.status)>=0){
      const b=advBal(r);
      put('ADV-'+r.key,m,Object.assign({committed:bgM(Math.max(0,advAuthorized(r)-b.issued)*rate),exposure:bgM(bgTrack(r).tracked*rate),
        comp:{issued:bgM(b.issued*rate),accepted:bgM(b.accepted*rate),returns:bgM(b.returns*rate),recoveries:bgM(b.recoveries*rate)}},info));
    }else put('ADV-'+r.key,m,info);
  });
  impRequests.forEach(function(q){
    const m=q.bgMapped&&q.bgt&&q.bgt.alloc?q.bgt:null;if(!m||bgFrozenMap(m))return;
    const rate=bgRateOf(m,q.currency),info={entity:q.entity,label:expKey(q)+' · '+q.requestType,kind:'Imprest request',recId:q.id};if(!rate)return;
    if(['Awaiting Approval','Follow-Up'].indexOf(q.status)>=0)put('IRQ-'+q.key,m,Object.assign({pending:bgM(caTotal(q)*rate)},info));
    else if(['Approved','Partially Approved'].indexOf(q.status)>=0&&q.disb)put('IRQ-'+q.key,m,Object.assign({committed:bgM(Math.max(0,advAuthorized(q)-advReqIssued(q))*rate)},info));
    else put('IRQ-'+q.key,m,info);
  });
  impFunds.forEach(function(f){
    const m=bgHolderMap(f);if(!m||bgFrozenMap(m))return;
    const b=advBal(f),rate=bgRateOf(m,f.currency);if(!rate)return;
    put('IMP-'+f.key,m,{entity:f.entity,label:expKey(f)+' · '+f.name,kind:'Imprest fund',recId:f.id,exposure:bgM(bgTrack(f).tracked*rate),
      comp:{issued:bgM(b.issued*rate),accepted:bgM(b.accepted*rate),returns:bgM(b.returns*rate),recoveries:bgM(b.recoveries*rate)}});
  });
  return out;
}
const BG_CLASSES=['pending','committed','actual','exposure'];
const BG_CLASS_LABEL={pending:'Pending',committed:'Committed',actual:'Actual Expense',exposure:'Funding Exposure'};
function bgEventType(cls,delta,cur,want){
  if(cls==='pending')return delta>0?'Budget Reservation':'Reservation Released';
  if(cls==='committed')return delta>0?'Commitment Created':'Commitment Released';
  if(cls==='actual')return delta>0?'Actual Utilization Posted':'Actual Utilization Reduced';
  if(delta>0)return want.carriedFrom&&!cur?'Carry-Forward Continuation':'Funding Exposure Posted';
  const a=(want.comp||{}),b=(cur&&cur.comp)||{};
  const d=function(k){return bgM((a[k]||0)-(b[k]||0));};
  if(d('accepted')>0)return 'Advance Exposure Reclassified';
  if(d('returns')>0)return 'Exposure Reduced (Verified Return)';
  if(d('recoveries')>0)return 'Exposure Reduced (Recovery)';
  if(d('issued')<0)return 'Issuance Reversed';
  return 'Funding Exposure Reduced';
}
function bgEmit(s,cls,delta,type,A,note){
  const e={id:bgEvtNext++,at:bgStamp(A),iso:A.iso,by:A.who,key:s.key,src:s.src,label:s.label,entity:s.entity,budget:s.budget,alloc:s.alloc,fy:s.fy,cls:cls,delta:bgM(delta),type:type,note:note||''};
  e.ref='BE-'+String(e.id).padStart(6,'0');bgEvents.push(e);return e;
}
function bgSyncAll(A){
  A=A||bgNow();
  const want=bgDesired();
  bgUniq(Object.keys(want).concat(Object.keys(bgStates))).forEach(function(k){
    const cur=bgStates[k];
    const w=want[k]||(cur?{key:k,src:cur.src,entity:cur.entity,budget:cur.budget,alloc:cur.alloc,fy:cur.fy,q:cur.q,date:cur.date,label:cur.label,kind:cur.kind,recId:cur.recId,
      pending:0,committed:0,actual:0,exposure:0,linked:0,comp:cur.comp?{issued:0,accepted:0,returns:0,recoveries:0}:null}:null);
    if(!w)return;
    /* A closed year is frozen: its figures stay as they were at close. */
    if(cur&&cur.frozen)return;
    if(!cur){
      if(!BG_CLASSES.some(function(c){return w[c];})&&!w.linked)return;
      const s=Object.assign({},w,{created:A.iso});bgStates[k]=s;
      BG_CLASSES.forEach(function(c){if(w[c])bgEmit(s,c,w[c],bgEventType(c,w[c],null,w),A,w.carriedFrom?'Continues '+w.carriedFrom.key+' of '+w.carriedFrom.fy+'.':'');});
      return;
    }
    BG_CLASSES.forEach(function(c){const d=bgM((w[c]||0)-(cur[c]||0));if(d)bgEmit(cur,c,d,bgEventType(c,d,cur,w),A);});
    ['pending','committed','actual','exposure','linked','comp','label','q','date'].forEach(function(f){cur[f]=w[f];});
  });
  bgReleaseExceptionUses(A);
  return '';
}
/* What occupies a node: an allocation and everything under it, or the whole budget. */
function bgOcc(b,aid,opt){
  opt=opt||{};
  const ids=aid?bgSubtreeIds(b,aid):null,o={pending:0,committed:0,actual:0,exposure:0,linked:0};
  Object.keys(bgStates).forEach(function(k){
    const s=bgStates[k];
    if(s.budget!==b.id||(ids&&ids.indexOf(s.alloc)<0)||(opt.q&&s.q!==opt.q)||(opt.exclude&&opt.exclude(s)))return;
    o.pending+=s.pending;o.committed+=s.committed;o.actual+=s.actual;o.exposure+=s.exposure;o.linked+=s.linked||0;
  });
  Object.keys(o).forEach(function(k){o[k]=bgM(o[k]);});
  o.occupied=bgM(o.pending+o.committed+o.actual+o.exposure);
  return o;
}
/* The figures of a node (budget when aid is null): authority, occupancy, availability. */
function bgFigures(b,aid,opt){
  const a=aid?bgAlloc(aid):null,o=bgOcc(b,aid,opt);
  const approved=a?a.amount:b.amount;
  return Object.assign(o,{approved:approved,available:bgM(approved-o.occupied),pct:approved>0?Math.round(o.occupied/approved*1000)/10:0});
}
/* The quarter ceiling of a node, with the unspent earlier quarters added only when the entity enabled carry-forward. */
function bgQuarterLimit(b,n,q,opt){
  const qs=n.quarters;if(!qs)return null;
  let lim=qs[q-1];
  if(bgCfg(b.entity).quarterCarry)for(let i=1;i<q;i++){lim+=Math.max(0,qs[i-1]-bgOcc(b,n.id,Object.assign({},opt,{q:i})).occupied);}
  return bgM(lim);
}

/* ── Budget evaluation (claims, advances, imprest) ────────────────────── */
function bgResolve(ctx){
  const cand=bgBudgets.filter(function(b){return b.entity===ctx.entity&&b.status==='Active'&&ctx.date>=b.fyStart&&ctx.date<=b.fyEnd
    &&ctx.date>=b.effFrom&&(!b.effTo||ctx.date<=b.effTo);});
  const lines=[];
  cand.forEach(function(b){b.allocations.forEach(function(a){if(a.status==='Active'&&bgMatches(a,ctx))lines.push(a);});});
  if(!lines.length)return {none:true};
  for(let i=0;i<lines.length;i++){
    const L=lines[i],anc=bgAncestors(L);
    if(lines.every(function(M){return M===L||anc.indexOf(M)>=0;}))return {budget:bgRec(L.budgetId),leaf:L,chain:[L].concat(anc)};
  }
  return {conflict:lines};
}
/* The line a fund under control is charged to, with its ancestors (only while it can still take charges). */
function bgForcedChain(id){
  const a=bgAlloc(id),b=a?bgRec(a.budgetId):null;
  return a&&b&&a.status==='Active'&&b.status==='Active'?{budget:b,leaf:a,chain:[a].concat(bgAncestors(a))}:{none:true};
}
function bgInSubtree(b,holderAlloc,nodeId){
  if(!holderAlloc)return false;
  const h=bgAlloc(holderAlloc);if(!h||h.budgetId!==b.id)return false;
  if(nodeId==null)return true;
  return holderAlloc===nodeId||bgAncestors(h).some(function(x){return x.id===nodeId;});
}
function bgCtxLabel(ctx){return [ctx.dept||'no department',ctx.category||'all categories'].concat(ctx.subCat?[ctx.subCat]:[]).join(' · ');}
/* ctx: entity, date, dept, category, subCat, ccId, prjId, amount, currency, funded (part already in a
   tracked advance's exposure), holderAlloc, exclude(state), batch (same-request impacts), excKey. */
function bgEvaluate(ctx){
  const res={result:'Not Evaluated',reason:'',pub:'',budget:null,leaf:null,chain:[],figures:null,impact:0,over:0,rate:1,rateDate:'',currency:'',
    needJust:false,blocked:false,exception:null,nearLimit:false,q:null,fy:null,noMatch:false,missingRate:false};
  /* pub: what the requester sees - the result and what to do, never budget figures (decision 8). */
  const done=function(pub){res.pub=pub||res.reason;return res;};
  if(typeof mcOn==='function'&&!mcOn('budgets')){res.reason='Funding & Budgets is switched off (Module Control).';return done();}
  const cfg=bgCfg(ctx.entity);
  if(!cfg.control){res.reason='Budget control is off for this entity.';return done();}
  const fy=bgFyOf(ctx.date,ctx.entity);res.fy=fy.label;
  /* A closed year has no budget that can take a transaction: the No Matching Budget rule applies (decision 6 -
     'Not Evaluated' is only for control or the module being off). */
  if(!ctx.alloc&&bgFyStatus(fy.label,ctx.entity).status==='Closed'){
    res.noMatch=true;res.blocked=cfg.noMatch==='Blocking';res.needJust=!res.blocked;res.result=res.blocked?'Blocked':'Warning';
    res.reason=fy.label+' is closed, so no budget can take a transaction dated in it.';
    return done('The budget year of this request is closed.'+(res.blocked?' Budget control is Blocking, so it cannot be submitted; ask Finance how to record it.':' A budget justification is required.'));
  }
  const rr=ctx.alloc?bgForcedChain(ctx.alloc):bgResolve(ctx);
  if(rr.none||rr.conflict){
    res.noMatch=true;res.blocked=cfg.noMatch==='Blocking';res.needJust=!res.blocked;res.result=res.blocked?'Blocked':'Warning';
    res.reason=rr.none?'No active budget allocation covers '+bgCtxLabel(ctx)+' in '+fy.label+'.'
      :'Allocations '+rr.conflict.map(function(a){return a.key;}).join(', ')+' overlap for '+bgCtxLabel(ctx)+' - a configuration conflict Finance must correct.';
    return done((rr.none?'No budget is set up for this request.':'The budget for this request is not set up correctly; Finance must correct it.')
      +(res.blocked?' Budget control is Blocking, so it cannot be submitted until Finance sets up the budget.':' A budget justification is required.'));
  }
  const b=rr.budget,leaf=rr.leaf;
  res.budget=b.id;res.leaf=leaf.id;res.chain=rr.chain.map(function(a){return a.id;});res.currency=b.currency;
  if(ctx.alloc)res.fy=b.fy;
  const qd=ctx.alloc?(ctx.date>b.fyEnd?b.fyEnd:ctx.date<b.fyStart?b.fyStart:ctx.date):ctx.date;
  res.q=b.quarterly?bgQuarterOf(qd,b.fyStart):null;
  let rate=1;res.rateDate=ctx.date;
  if(ctx.currency!==b.currency&&ctx.rate>0){rate=ctx.rate;res.rateDate=ctx.rateDate||ctx.date;}
  else if(ctx.currency!==b.currency){
    const c=epConvert(1,ctx.currency,b.currency,ctx.date);
    if(!c){
      /* A missing rate is a validation failure (decision 6): never 1:1, never reserved, never a warning. */
      res.result='Missing Exchange Rate';res.missingRate=true;res.blocked=true;
      res.reason='Missing exchange rate: there is no '+ctx.currency+' to '+b.currency+' rate for '+cdLabel(ctx.date)+', so the budget evaluation is unavailable. Nothing is estimated or reserved. Save it as a draft; it can be submitted once Finance configures the rate.';
      return done();
    }
    rate=c.rate;res.rateDate=c.date||ctx.date;
  }
  res.rate=rate;
  const own=bgM(((Number(ctx.amount)||0)-(Number(ctx.funded)||0))*rate),fund=bgM((Number(ctx.funded)||0)*rate);
  const nodes=rr.chain.map(function(a){return {id:a.id,amount:a.amount,quarters:a.quarters,enf:bgEnf(a,b),label:a.key+' '+bgScopeLabel(a)};})
    .concat([{id:null,amount:b.amount,quarters:b.quarterly?b.quarters:null,enf:b.enforcement,label:expKey(b)+' total'}]);
  const opt={exclude:ctx.exclude},batch=ctx.batch||{},breaches=[];
  nodes.forEach(function(n){
    const nk=(n.id||'B'+b.id),imp=bgM(own+(fund>0&&!bgInSubtree(b,ctx.holderAlloc,n.id)?fund:0));
    const occ=bgM(bgOcc(b,n.id,opt).occupied+(batch[nk]||0)),avail=bgM(n.amount-occ);
    n.imp=imp;n.occ=occ;n.avail=avail;
    /* The overrun this transaction adds: all of it once the node is already exhausted. */
    if(imp>0.001&&imp>avail+0.001)breaches.push({node:n,over:bgM(imp-Math.max(0,avail))});
    if(res.q&&n.quarters){
      const ql=bgQuarterLimit(b,n,res.q,opt),qo=bgM(bgOcc(b,n.id,Object.assign({},opt,{q:res.q})).occupied+(batch[nk+'#Q'+res.q]||0));
      n.qLimit=ql;n.qAvail=bgM(ql-qo);
      if(imp>0.001&&imp>n.qAvail+0.001)breaches.push({node:n,over:bgM(imp-Math.max(0,n.qAvail)),quarter:res.q});
    }
  });
  res.nodes=nodes;res.impact=nodes[0].imp;res.figures=bgFigures(b,leaf.id,opt);
  const thr=Number(b.threshold)||0;
  if(thr&&leaf.amount>0&&(nodes[0].occ+nodes[0].imp)/leaf.amount*100>=thr)res.nearLimit=true;
  if(!breaches.length){res.result='Within Budget';res.reason='Within '+leaf.key+' ('+bgScopeLabel(leaf)+')'+(res.nearLimit?'; near its '+thr+'% threshold':'')+'.';
    return done('Within the budget for this request.');}
  const worst=breaches.reduce(function(m,x){return x.over>m.over?x:m;});res.over=worst.over;
  const exc=bgFindException(b,rr.chain,ctx,res.over,batch,res);
  const txt='Exceeds '+worst.node.label+(worst.quarter?' (Q'+worst.quarter+')':'')+' by '+expMoney(res.over,b.currency)+'.';
  if(exc){res.result='Exception Approved';res.exception=exc.id;res.reason=txt+' Covered by approved exception '+expKey(exc)+'.';
    return done('Above the budget available for this request; covered by the approved budget exception '+expKey(exc)+'.');}
  res.blocked=breaches.some(function(x){return x.node.enf==='Blocking';});res.needJust=!res.blocked;res.result=res.blocked?'Blocked':'Warning';
  res.reason=txt+(res.blocked?' Budget control is Blocking.':' A budget justification is required.');
  return done(res.blocked?'Above the budget available for this request, and budget control is Blocking. Save it as a draft and request a budget exception, or reduce the amount.'
    :'Above the budget available for this request. A budget justification is required.');
}
function bgAddBatch(batch,ev){
  (ev.nodes||[]).forEach(function(n){const nk=(n.id||'B'+ev.budget);batch[nk]=bgM((batch[nk]||0)+n.imp);if(ev.q)batch[nk+'#Q'+ev.q]=bgM((batch[nk+'#Q'+ev.q]||0)+n.imp);});
  /* An exception drawn on by an earlier line of the same request has that much less left for the next. */
  if(ev.exception)batch['X'+ev.exception]=bgM((batch['X'+ev.exception]||0)+ev.over);
}
const BG_RANK={'Missing Exchange Rate':6,'Blocked':5,'Warning':4,'Exception Approved':3,'Not Evaluated':2,'Within Budget':1};
function bgWorst(list){return list.reduce(function(m,x){return (BG_RANK[x]||0)>(BG_RANK[m]||0)?x:m;},'Within Budget');}
function bgEmpDept(eid){const e=idEmp(eid);return e?e.dept||'':'';}
/* A claim: each line in turn, lines of the same claim adding up on shared allocations. */
function bgClaimEvals(c,amounts){
  const batch={},ex=function(s){return s.src.indexOf('EXP-'+c.key+'/')===0;},out=[];
  const P=bgLinkPlan(c.id).pools;
  c.lines.forEach(function(l){
    if(l.status==='Rejected'&&!amounts)return;
    const amt=amounts?(amounts[l.id]!=null?amounts[l.id].amount:caCeiling(l)):caCeiling(l);
    if(!(Number(amt)>0))return;
    const funded=caIsFunded(l),holder=funded?advHolder(l.advanceId):null,hm=bgHolderMap(holder),hFrozen=bgFrozenMap(hm);
    const fundC=funded?Math.min(Number(amt),amounts&&amounts[l.id]&&amounts[l.id].adv!=null?Number(amounts[l.id].adv):caCeilAdv(l)):0;
    /* Linked: drawn from money already counted as the holder's exposure. A holder frozen in a closed year was counted there. */
    const lk=hm&&fundC>0?bgLinkAmt(P,l,c.currency,holder,fundC):{l:0,s:0},linked=lk.l,skip=lk.s;
    const ev=bgEvaluate({entity:c.entity||bgEnt(),date:l.start||wbToday(),dept:bgEmpDept(c.employeeEid),category:c.category,subCat:l.subCat,ccId:c.costCentreId||'',prjId:c.projectId||'',
      amount:bgM(Number(amt)-skip),currency:c.currency,funded:linked,holderAlloc:linked>0?hm.alloc:null,exclude:ex,batch:batch,excKey:'EXP-'+c.key});
    bgAddBatch(batch,ev);out.push({line:l,ev:ev});
  });
  return out;
}
function bgAdvanceCtx(r){
  const t=advType(r.typeId);
  const cat=r.plannedCategory||(t&&t.cats.length===1?t.cats[0]:'');
  return {entity:r.entity||bgEnt(),date:r.periodFrom||r.requiredBy||wbToday(),dept:bgEmpDept(r.employeeEid),category:cat,subCat:'',ccId:r.costCentreId||'',prjId:r.projectId||'',
    amount:caTotal(r),currency:r.currency,exclude:function(s){return s.src==='ADV-'+r.key;},excKey:'ADV-'+r.key};
}
/* A replenishment is checked for its own amount: the money a fund already holds is never added (decision 3). */
function bgImprestCtx(q){
  const f=impFund(q.fundId),hm=f?bgHolderMap(f):null,live=!!(hm&&!bgFrozenMap(hm));
  /* A fund under control is charged to its mapped line, so a top-up is checked there - at the fund's booking
     rate - and reserved, committed and exposed at that same rate. */
  return {entity:q.entity||bgEnt(),date:wbToday(),dept:f?f.dept:'',category:f&&f.cats.length===1?f.cats[0]:'',subCat:'',ccId:'',prjId:'',amount:caTotal(q),currency:q.currency,
    alloc:live?hm.alloc:null,rate:live?bgRateOf(hm,q.currency):null,rateDate:live?(hm.rateDate||''):'',
    exclude:function(s){return s.src==='IRQ-'+q.key||(f&&s.src==='IMP-'+f.key&&q.requestType==='Initial Funding');},excKey:'IRQ-'+q.key};
}
/* Required dimensions of the budget a transaction lands in. */
function bgRequiredDims(ev,rec){
  const b=ev&&ev.budget?bgRec(ev.budget):null;if(!b)return '';
  if(b.requireCC&&!rec.costCentreId)return expKey(b)+' requires a Cost Centre on transactions; pick one.';
  if(b.requirePrj&&!rec.projectId)return expKey(b)+' requires a Project on transactions; pick one.';
  return '';
}
function bgMasterCheck(rec,iso){
  if(rec.costCentreId&&!bgmSelectable('cc',rec.costCentreId,iso))return bgmLabel(bgmRec('cc',rec.costCentreId))+' is inactive or out of date; pick an active cost centre.';
  if(rec.projectId&&!bgmSelectable('project',rec.projectId,iso))return bgmLabel(bgmRec('project',rec.projectId))+' is not active; pick an active project.';
  return '';
}
/* The submission gate: '' or {error, needJust}. */
/* Budget figures (allocation, amounts, what is left) are shown to people who may see that budget line,
   to Finance, and to the record's assigned approvers who hold a budget right; a requester sees the
   result and what to do (decision 8). */
function bgDetailFor(ev,rec){
  if(!ev||!ev.budget)return true;
  if(bgCan('budget.view.all'))return true;
  if(ev.leaf&&typeof bgSeesAlloc==='function'&&bgSeesAlloc(ev.leaf)&&bgSeesBreaches(ev))return true;
  return !!(rec&&rec.wf&&caInvolved(rec,caMe())&&(bgCan('budget.view')||bgCan('budget.util.view')));
}
/* The detailed text names the worst breached line or the budget total: an allocation owner sees it only when
   every breached node is within what they may see (decision 1). */
function bgBreachIds(ev){return (ev.nodes||[]).filter(function(n){return (n.imp>0.001&&n.imp>n.avail+0.001)||(n.qAvail!=null&&n.imp>0.001&&n.imp>n.qAvail+0.001);}).map(function(n){return n.id;});}
function bgSeesBreaches(ev){
  const ids=ev.nodes?bgBreachIds(ev):ev.breachIds;if(!ids)return !ev.reason||ev.result==='Within Budget';
  const b=bgRec(ev.budget);if(!b)return false;
  return ids.every(function(id){return id==null?(typeof bgFull==='function'&&bgFull(b)):bgSeesAlloc(id);});
}
function bgReasonFor(ev,rec){return bgDetailFor(ev,rec)?ev.reason:(ev.pub||ev.reason);}
function bgGate(evs,rec,just){
  const mr=evs.find(function(ev){return ev.missingRate;});
  if(mr)return {error:'Budget evaluation unavailable. '+mr.reason,budget:true,missingRate:true};
  for(let i=0;i<evs.length;i++){
    const ev=evs[i];
    if(ev.result==='Blocked')return {error:'Budget: '+(bgDetailFor(ev,rec)?ev.reason+' Save it as a draft and request a budget exception, or reduce the amount.':ev.pub),budget:true};
    const rq=bgRequiredDims(ev,rec);if(rq)return {error:rq,budget:true};
  }
  const w=evs.find(function(ev){return ev.needJust;});
  if(w&&!String(just||'').trim())return {error:'Budget justification is required: '+bgReasonFor(w,rec),needJust:true,budget:true};
  return null;
}
function bgClaimCheck(c){
  if(!bgModuleOn())return null;
  const mc=bgMasterCheck(c);if(mc)return {error:mc,budget:true};
  return bgGate(bgClaimEvals(c).map(function(x){return x.ev;}),c,c.bgJust);
}
function bgAdvanceCheck(r){
  if(!bgModuleOn())return null;
  const mc=bgMasterCheck(r);if(mc)return {error:mc,budget:true};
  return bgGate([bgEvaluate(bgAdvanceCtx(r))],r,r.bgJust);
}
function bgImprestCheck(q){return bgGate([bgEvaluate(bgImprestCtx(q))],q,q.bgJust);}
function bgMapOf(ev,rec){
  return {entity:rec.entity||bgEnt(),fy:ev.fy,budget:ev.budget,alloc:ev.leaf,q:ev.q,rate:ev.rate,rateDate:ev.rateDate,cur:ev.currency,result:ev.result,reason:ev.reason,
    exception:ev.exception,over:ev.over,at:wbToday()};
}
function bgMappable(ev){return !!ev.leaf&&ev.result!=='Not Evaluated'&&!ev.missingRate;}
function bgEvalText(ev){return ev.result+(ev.leaf?' · '+bgAllocKey(bgAlloc(ev.leaf)):'')+(ev.reason?' - '+ev.reason:'');}
function bgPubText(evs){const w=bgWorstEval(evs);return w?w.result+' - '+(w.pub||w.reason):'Not Evaluated';}
/* At submission (and after a material change): keep each obligation's allocation and result. */
function bgModuleOn(){return typeof mcOn!=='function'||mcOn('budgets');}
function bgControlActive(ent){return bgModuleOn()&&!!bgCfg(ent||bgEnt()).control;}
function bgHasMapping(r){
  const k=caKind(r);
  if(k==='expense')return (r.lines||[]).some(function(l){return l.bgt&&l.bgt.alloc;});
  if(k==='advance')return !!(r.bgt&&r.bgt.alloc);
  if(k==='imprest')return !!r.bgMapped;
  return false;
}
/* A record already in approval that was not under budget control when it was submitted stays outside it:
   control is prospective (decision 3), and its Follow-Up loop must keep working (decision 5). */
function bgPreControl(r){return !!(r&&r.wf&&!bgHasMapping(r)&&(!r.bgEval||r.bgEval.result==='Not Evaluated'));}
/* Remove this record's exception uses that its new evaluation no longer draws on (decision 4: Used never overstated). */
function bgDropStaleUses(r,keep,A){
  const k=caKind(r),own=function(x){return k==='expense'?x.indexOf('EXP-'+r.key+'/')===0:x===(k==='advance'?'ADV-':'IRQ-')+r.key;};
  bgChanges.forEach(function(e){
    if(e.kind!=='budget exception'||!e.uses)return;
    Object.keys(e.uses).forEach(function(x){if(own(x)&&!keep[x+'|'+e.id]){const u=e.uses[x];delete e.uses[x];
      bgLog(e,e.status,'Use by '+u.ref+' released ('+expMoney(u.amount,e.currency)+'): after re-evaluation the request no longer draws on this exception.',A);}});
  });
}
/* A fund whose budget mapping stayed in a closed year starts a new segment for new money (decision 3: new
   replenishments follow active budget controls). What it already holds keeps how it was counted - outside the
   budget, or in the closed year - and is used first; only money issued from now on counts in the new year. */
function bgNewSegment(f,m,A,ref){
  const t=bgTrack(f),old=f.bgt;
  if(f.bgOpening){f.bgOpeningHist=(f.bgOpeningHist||[]).concat([f.bgOpening]);f.bgOpening=null;}
  f.bgSegHist=(f.bgSegHist||[]).concat([{trackFrom:f.bgTrackFrom||null,map:old||null,until:(f.ledger||[]).length}]);
  f.bgt=Object.assign({},m);delete f.bgt.utilFrom;
  f.bgTrackFrom={idx:(f.ledger||[]).length,base:t.legacy,counted:bgM(t.counted+t.tracked),at:bgStamp(A),by:A.who,ref:ref};
  advLog(f,f.status,'Budget control continues in '+(m.fy||'the new financial year')+' from '+ref+': money issued from now on is counted there. What the fund already holds stays counted as before and is used first.',A);
  const b=bgRec(m.budget);
  if(b)bgLog(b,b.status,expKey(f)+' ('+f.name+'): new money counts in '+bgAllocKey(bgAlloc(m.alloc))+' from '+ref+'; its earlier balance stays where it was counted'+(old&&old.fy?' ('+old.fy+')':'')+'.',A);
}
/* At submission (and after a material change): keep each obligation's allocation and result. */
function bgCommitRecord(r,A,o){
  A=A||bgNow();o=o||{};
  const k=caKind(r);
  /* With Budget Control or the module off a Follow-Up answer re-evaluates nothing: what was mapped at submission
     keeps its mapping, so no obligation is dropped (decision 5). */
  if(o.resubmit&&!bgControlActive(r.entity)&&bgHasMapping(r))return;
  const keep={};
  if(k==='expense'){
    const evs=bgClaimEvals(r);
    /* Only an evaluated line is mapped: without an exchange rate nothing is counted (no guessed conversion). */
    evs.forEach(function(x){x.line.bgt=bgMappable(x.ev)?Object.assign(bgMapOf(x.ev,r),{date:x.line.start}):{result:x.ev.result,reason:x.ev.reason,at:wbToday(),noMatch:x.ev.noMatch};
      if(x.ev.exception){const uk='EXP-'+r.key+'/L'+x.line.id;keep[uk+'|'+x.ev.exception]=true;bgUseException(x.ev.exception,uk,x.ev.over,expKey(r),A);}});
    bgDropStaleUses(r,keep,A);
    const res=bgWorst(evs.map(function(x){return x.ev.result;}));
    r.bgEval={at:bgStamp(A),result:evs.length?res:'Not Evaluated',just:String(r.bgJust||'').trim(),lines:evs.map(function(x){return {lineId:x.line.id,result:x.ev.result,reason:x.ev.reason,pub:x.ev.pub,alloc:x.ev.leaf,budget:x.ev.budget,breachIds:bgBreachIds(x.ev)};})};
    if(evs.some(function(x){return x.ev.result!=='Not Evaluated';}))caLog(r,r.status,'Budget check at submission: '+bgPubText(evs.map(function(x){return x.ev;}))+(r.bgEval.just?' Budget justification: '+r.bgEval.just:''),A);
    return;
  }
  if(k==='advance'){
    const ev=bgEvaluate(bgAdvanceCtx(r));
    r.bgt=bgMappable(ev)?Object.assign(bgMapOf(ev,r),{date:bgAdvanceCtx(r).date}):null;
    r.bgEval={at:bgStamp(A),result:ev.result,reason:ev.reason,pub:ev.pub,alloc:ev.leaf,budget:ev.budget,breachIds:bgBreachIds(ev),just:String(r.bgJust||'').trim()};
    if(ev.exception){keep['ADV-'+r.key+'|'+ev.exception]=true;bgUseException(ev.exception,'ADV-'+r.key,ev.over,expKey(r),A);}
    bgDropStaleUses(r,keep,A);
    if(ev.result!=='Not Evaluated')advLog(r,r.status,'Budget check at submission: '+bgPubText([ev])+(r.bgEval.just?' Budget justification: '+r.bgEval.just:''),A);
    return;
  }
  if(k==='imprest'){
    const f=impFund(r.fundId),ev=bgEvaluate(bgImprestCtx(r));
    r.bgEval={at:bgStamp(A),result:ev.result,reason:ev.reason,pub:ev.pub,alloc:ev.leaf,budget:ev.budget,breachIds:bgBreachIds(ev),just:String(r.bgJust||'').trim()};
    if(bgMappable(ev)){
      const m=Object.assign(bgMapOf(ev,r),{date:wbToday()});
      /* Control applies from the fund's first controlled funding request. Money the fund already
         holds stays outside the budget (used first); money issued from now on is funding exposure. */
      if(f&&!f.bgt){
        f.bgt=Object.assign({},m);
        const held=Math.max(0,advBal(f).accountable);
        f.bgTrackFrom={idx:(f.ledger||[]).length,base:held,counted:0,at:bgStamp(A),by:A.who,ref:expKey(r)};
        /* The custodian reads the fund's log: it states the rule, not the budget line (decision 8). */
        advLog(f,f.status,'Budget control applies to this fund from '+expKey(r)+': money issued from now on is counted in a budget as funding exposure.'
          +(held>0?' The '+expMoney(held,f.currency)+' already with the custodian stays outside the budget and is used first; Finance can map it as Opening Exposure.':''),A);
        const b=bgRec(ev.budget);
        if(b)bgLog(b,b.status,expKey(f)+' ('+f.name+') came under budget control in '+bgAllocKey(bgAlloc(ev.leaf))+' with '+expKey(r)+'.'+(held>0?' The '+expMoney(held,f.currency)+' it already held stays outside the budget.':''),A);
      }else if(f&&bgFrozenMap(f.bgt))bgNewSegment(f,m,A,expKey(r));
      r.bgt=f&&f.bgt?Object.assign({},f.bgt,{result:ev.result,reason:ev.reason,exception:ev.exception,over:ev.over,at:wbToday()}):m;r.bgMapped=true;
      delete r.bgt.utilFrom;
    }
    if(ev.exception){keep['IRQ-'+r.key+'|'+ev.exception]=true;bgUseException(ev.exception,'IRQ-'+r.key,ev.over,expKey(r),A);}
    bgDropStaleUses(r,keep,A);
    if(ev.result!=='Not Evaluated')advLog(r,r.status,'Budget check at submission: '+bgPubText([ev])+(r.bgEval.just?' Budget justification: '+r.bgEval.just:''),A);
  }
}
/* Before an approving decision on a budget-controlled claim, advance or imprest request. */
function bgDecisionCheck(r,items,st,A){
  const k=caKind(r);
  if(['expense','advance','imprest'].indexOf(k)<0)return '';
  const ok=(items||[]).filter(function(it){return it.decision!=='Rejected';});if(!ok.length)return '';
  let evs=[];
  if(k==='expense'){
    if(!r.lines.some(function(l){return l.bgt&&l.bgt.alloc;}))return '';
    const am={};(items||[]).forEach(function(it){am[it.l.id]={amount:it.decision==='Rejected'?0:it.amount,adv:it.adv};});
    evs=bgClaimEvals(r,am).map(function(x){return x.ev;});
  }else if(k==='advance'){
    if(!r.bgt||!r.bgt.alloc)return '';
    const c=bgAdvanceCtx(r);c.amount=bgSum(ok,function(it){return it.amount;});evs=[bgEvaluate(c)];
  }else{
    if(!r.bgMapped)return '';
    const c=bgImprestCtx(r);c.amount=bgSum(ok,function(it){return it.amount;});evs=[bgEvaluate(c)];
  }
  const mr=evs.find(function(ev){return ev.missingRate;});
  /* Decision 6: submission and FINAL approval wait for the rate; earlier stages may still decide. */
  if(mr&&bgIsFinalStage(r,st))return 'Budget evaluation unavailable. '+mr.reason+' Final approval waits until the rate is configured.';
  const blk=evs.find(function(ev){return ev.result==='Blocked';});
  if(blk){
    if(!r.bgBlockNoted){r.bgBlockNoted=true;
      caNotify(caClaimants(r),expKey(r)+': approval is on hold - '+blk.pub,r);
      /* The calculation goes only to approvers who hold a budget right (decision 8, per RBAC). */
      if(st){const right=function(u){return caPersonCan(u,'budget.view')||caPersonCan(u,'budget.util.view')||caPersonCan(u,'budget.view.all');};
        const det=st.approvers.filter(right),pub=st.approvers.filter(function(u){return !right(u);});
        if(det.length)caNotify(det,expKey(r)+': approval stopped by a Blocking budget - '+blk.reason,r);
        if(pub.length)caNotify(pub,expKey(r)+': approval stopped by a Blocking budget - '+blk.pub,r);}}
    return 'Budget: '+bgReasonFor(blk,r)+' Approve a lower amount, reject, or ask for a budget exception.';
  }
  return '';
}
function bgIsFinalStage(r,st){if(!r||!r.wf||!st)return true;return !r.wf.stages.some(function(s){return s.n>st.n;});}
CA_DECISION_CHECKS.push(bgDecisionCheck);

/* ── Budget exceptions ────────────────────────────────────────────────── */
const bgChanges=[];
let bgChgNextId=90001,bgChgNextKey=1001;
function bgChg(id){return bgChanges.find(function(r){return r.id===id;})||null;}
function bgExcUsed(e,exceptKey){return bgSum(Object.keys(e.uses||{}).filter(function(k){return k!==exceptKey;}),function(k){return e.uses[k].amount;});}
function bgExcRemaining(e,exceptKey){return bgM((Number(e.approvedLimit)||0)-bgExcUsed(e,exceptKey));}
function bgExcState(e){
  if(['Approved','Partially Approved'].indexOf(e.status)<0)return e.status;
  if(e.effTo&&wbToday()>e.effTo&&!e.sourceKey)return 'Expired';
  if(e.sourceKey&&e.reeval&&!e.reeval.ok)return 'Needs Re-evaluation';
  return bgExcRemaining(e)<=0?'Consumed':'Active';
}
/* The parts of a blocked draft that need an exception: one per budget line, financial year and quarter.
   Each part's amount is what it exceeds by - calculated here, never typed by the requester (decision 8). */
function bgExcPortions(kind,src){
  const items=kind==='expense'?bgClaimEvals(src).map(function(x){return {lineId:x.line.id,date:x.line.start||wbToday(),ev:x.ev};})
    :[{lineId:0,date:bgAdvanceCtx(src).date,ev:bgEvaluate(bgAdvanceCtx(src))}];
  const P={};
  items.forEach(function(x){
    const ev=x.ev;if(ev.result!=='Blocked'||!ev.leaf||!(ev.over>0))return;
    const k=ev.budget+'|'+ev.leaf+'|'+ev.fy+'|'+(ev.q||0);
    const p=P[k]||(P[k]={key:k,budget:ev.budget,alloc:ev.leaf,fy:ev.fy,q:ev.q||0,lineIds:[],from:x.date,to:x.date,need:0,currency:ev.currency,srcCurrency:src.currency});
    p.lineIds.push(x.lineId);p.need=bgM(p.need+ev.over);if(x.date<p.from)p.from=x.date;if(x.date>p.to)p.to=x.date;
  });
  return Object.keys(P).map(function(k){return P[k];}).sort(function(a,b){return a.fy!==b.fy?(a.fy<b.fy?-1:1):(a.q!==b.q?a.q-b.q:(a.from<b.from?-1:a.from>b.from?1:0));});
}
function bgPortionLabel(p){const a=bgAlloc(p.alloc);return (a?bgScopeLabel(a):'')+' · '+p.fy+(p.q?' Q'+p.q:'')+' · '+cdLabel(p.from)+(p.to!==p.from?' – '+cdLabel(p.to):'');}
/* Exceptions raised for a record that are still open, or approved and still covering. */
function bgExcForSource(srcKey){return bgChanges.filter(function(e){return e.kind==='budget exception'&&e.sourceKey===srcKey;});}
/* Does an approved record exception still cover its part of the record as it is now? */
function bgExcCovers(e){
  const src=bgSrcRecord(e.sourceKind,e.sourceId);if(!src)return {ok:false,why:'its request no longer exists'};
  const items=e.sourceKind==='expense'?bgClaimEvals(src).map(function(x){return x.ev;}):[bgEvaluate(bgAdvanceCtx(src))];
  const mine=items.filter(function(ev){return ev.leaf===e.allocId&&ev.fy===e.fy&&(ev.q||0)===(e.quarter||0);});
  const over=mine.filter(function(ev){return ev.over>0||ev.result==='Exception Approved';});
  if(!over.length)return {ok:true,why:'nothing in its part exceeds the budget now'};
  const bad=over.find(function(ev){return ev.exception!==e.id;});
  if(bad)return {ok:false,why:bad.missingRate?'the exchange rate is missing':'the request changed (amount, dates, category or currency) and now needs '+(bad.result==='Exception Approved'?'another exception':'more than this exception authorizes, or falls outside it')};
  return {ok:true,why:'still covers its part'};
}
/* After a material change to a record: re-evaluate each of its approved exceptions and record the outcome. */
function bgReevaluateExceptions(src,kind,A){
  if(!src)return;
  const key=(kind==='expense'?'EXP-':'ADV-')+src.key;
  bgExcForSource(key).filter(function(e){return ['Approved','Partially Approved'].indexOf(e.status)>=0;}).forEach(function(e){
    const c=bgExcCovers(e),was=e.reeval?e.reeval.ok:true;
    e.reeval={at:bgStamp(A),ok:c.ok,why:c.why};
    if(c.ok!==was||!c.ok){
      bgLog(e,e.status,'Re-evaluated after '+expKey(src)+' changed: '+(c.ok?'it '+c.why+'.':'it no longer applies - '+c.why+'. A new exception is needed.'),A);
      (kind==='expense'?caLog:advLog)(src,src.status,'Budget exception '+expKey(e)+' re-evaluated: '+(c.ok?'still applies.':'no longer applies; a new exception is needed.'),A);
    }
  });
}
/* The approved exception that covers an overrun: one linked to this record first, else one on the allocation chain. */
function bgFindException(b,chain,ctx,over,batch,res){
  const ids=chain.map(function(a){return a.id;}),srcPrefix=ctx.excKey||'',fy=res&&res.fy,q=(res&&res.q)||0;
  const live=bgChanges.filter(function(e){return e.kind==='budget exception'&&e.entity===b.entity&&['Approved','Partially Approved'].indexOf(e.status)>=0&&e.budgetId===b.id;});
  const inPeriod=function(e){return (!e.effFrom||ctx.date>=e.effFrom)&&(!e.effTo||ctx.date<=e.effTo);};
  /* What is left for this request: unused authority, plus what this request itself drew before (it is being re-evaluated),
     less what earlier lines of this same evaluation have already drawn. */
  const mine=function(k){return !!srcPrefix&&(k===srcPrefix||k.indexOf(srcPrefix+'/')===0);};
  const fits=function(e){return bgExcRemaining(e,null)+bgSum(Object.keys(e.uses||{}).filter(mine),function(k){return e.uses[k].amount;})
    -((batch||{})['X'+e.id]||0)>=over-0.001;};
  /* A record's exception covers only its own part: the same budget line, year and quarter, the dates it was
     raised for, the record's currency, and its approved amount (decision 4). */
  const ownPart=function(e){return e.sourceKey===srcPrefix&&e.allocId===chain[0].id&&(!e.fy||e.fy===fy)&&(e.quarter||0)===q&&inPeriod(e)
    &&(!e.srcCurrency||e.srcCurrency===ctx.currency);};
  return live.find(function(e){return e.sourceKey&&ownPart(e)&&fits(e);})
    ||live.find(function(e){return !e.sourceKey&&inPeriod(e)&&(!e.effTo||wbToday()<=e.effTo)&&(!e.allocId||ids.indexOf(e.allocId)>=0)&&fits(e);})||null;
}
function bgUseException(id,key,amount,ref,A){
  const e=bgChg(id);if(!e)return;
  e.uses=e.uses||{};const was=e.uses[key]?e.uses[key].amount:null;
  e.uses[key]={amount:bgM(amount),ref:ref,at:bgStamp(A)};
  if(was!==bgM(amount))bgLog(e,e.status,'Used by '+ref+': '+expMoney(amount,e.currency)+'. Remaining '+expMoney(bgExcRemaining(e),e.currency)+'.',A);
}
/* A use is released when its record no longer occupies the budget (rejected, withdrawn, reduced to nothing). */
function bgReleaseExceptionUses(A){
  bgChanges.forEach(function(e){
    if(e.kind!=='budget exception'||!e.uses)return;
    Object.keys(e.uses).forEach(function(k){
      if(!bgUseEnded(k))return;
      const u=e.uses[k];delete e.uses[k];bgLog(e,e.status,'Use by '+u.ref+' released ('+expMoney(u.amount,e.currency)+'); the request ended without spending it.',A);
    });
  });
}
/* A use ends only when its request ends without becoming spending (rejected, withdrawn, cancelled) - not when an
   imprest top-up is paid or an advance is settled: that money still sits in the allocation (decision 4). */
function bgUseEnded(k){
  const p=String(k).split('/'),t=p[0].slice(0,3),key=Number(p[0].slice(4)),gone=['Rejected','Withdrawn','Cancelled'];
  if(t==='EXP'){const c=expensesData.find(function(x){return x.key===key;});if(!c||gone.indexOf(c.status)>=0)return true;
    const l=p[1]?c.lines.find(function(x){return x.id===Number(p[1].slice(1));}):null;return !l||l.status==='Rejected';}
  if(t==='ADV'){const r=advancesData.find(function(x){return x.key===key;});return !r||gone.indexOf(r.status)>=0;}
  if(t==='IRQ'){const q=impRequests.find(function(x){return x.key===key;});return !q||gone.indexOf(q.status)>=0;}
  return false;
}
function bgSrcRecord(kind,id){return kind==='advance'?advRec(Number(id)):kind==='expense'?expRec(Number(id)):null;}
function bgNewChange(kind,prefix,d,A){
  const me=idEmpOfUser(A.who);
  const r={id:bgChgNextId++,key:bgChgNextKey++,prefix:prefix,kind:kind,entity:bgEnt(),claimFor:'Self',status:'Draft',createdBy:A.who,createdAt:bgStamp(A),
    employeeEid:me?me.eid:'',name:me?me.name:caN(A.who),empId:me?me.empId:'',email:me?me.email||'':'',migrated:true,idMigrated:true,currency:d.currency||'INR',
    reason:String(d.reason||'').trim(),proof:d.proof||''};
  r.logs=[{date:A.date,time:A.time,user:caN(A.who),userId:A.who,status:'Draft',action:BG_KIND_WF[kind]+' drafted by '+caN(A.who)+'.'}];
  return r;
}
function bgCanSeeBudgetScope(A,b,allocIds){
  if(bgPCan(A,'budget.view.all')||bgPCan(A,'budget.manage'))return true;
  if(b.ownerUid===A.who)return true;
  return (allocIds||[]).length>0&&allocIds.every(function(id){const a=bgAlloc(id);return a&&a.ownerUid===A.who;});
}
function bgExceptionCreate(d,submit,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.exception.request'))return {error:caN(A.who)+' cannot request budget exceptions.'};
  const reason=String(d.reason||'').trim();if(!reason)return {error:'A budget exception needs a reason.'};
  let b=null,a=null,src=null,srcKey='',amt=0,part=null,nParts=0;
  if(d.sourceKind){
    src=bgSrcRecord(d.sourceKind,d.sourceId);
    if(!src||src.entity!==bgEnt())return {error:'Pick the draft claim or advance the exception is for.'};
    if(src.status!=='Draft')return {error:expKey(src)+' is '+src.status+'; an exception is requested for a blocked draft.'};
    const own=caIsClaimant(src,A.who)||src.createdBy===A.who;
    if(!own&&!bgPCan(A,'budget.manage'))return {error:caN(A.who)+' can request exceptions only for their own drafts.'};
    const items=d.sourceKind==='expense'?bgClaimEvals(src).map(function(x){return x.ev;}):[bgEvaluate(bgAdvanceCtx(src))];
    const mr=items.find(function(ev){return ev.missingRate;});
    if(mr)return {error:'An exception cannot cover a missing exchange rate. '+mr.reason};
    srcKey=(d.sourceKind==='expense'?'EXP-':'ADV-')+src.key;
    const parts=bgExcPortions(d.sourceKind,src);nParts=parts.length;
    if(!parts.length){
      const w=bgWorstEval(items);
      if(w&&w.result==='Blocked'&&!w.leaf)return {error:(bgDetailFor(w,src)?w.reason:w.pub)+' An exception is granted against a budget line, so Finance must first set one up.'};
      return {error:expKey(src)+' is not blocked by a budget; no exception is needed.'};
    }
    /* One exception per part: budget line, financial year and quarter (decision 4). */
    part=d.portion?parts.find(function(p){return p.key===d.portion;}):(parts.length===1?parts[0]:null);
    if(!part&&d.portion){
      /* The part asked for is not blocked now: say whether an approved exception already covers it. */
      const k=String(d.portion).split('|');
      const cov=bgExcForSource(srcKey).find(function(e){return String(e.allocId)===k[1]&&(e.fy||'')===k[2]&&String(e.quarter||0)===k[3]
        &&['Approved','Partially Approved'].indexOf(e.status)>=0&&bgExcCovers(e).ok;});
      return {error:cov?'An exception for this part of '+expKey(src)+' is already approved ('+expKey(cov)+').'
        :'That part of '+expKey(src)+' does not exceed the budget now; no exception is needed for it.'};
    }
    if(!part)return {error:expKey(src)+' exceeds the budget in '+parts.length+' parts (different budget lines or periods). Request an exception for each part.'};
    const dup=bgExcForSource(srcKey).find(function(e){return e.allocId===part.alloc&&(e.fy||'')===part.fy&&(e.quarter||0)===part.q
      &&(['Draft','Awaiting Approval','Follow-Up'].indexOf(e.status)>=0||(['Approved','Partially Approved'].indexOf(e.status)>=0&&bgExcCovers(e).ok));});
    if(dup)return {error:'An exception for this part of '+expKey(src)+' is already '+(['Approved','Partially Approved'].indexOf(dup.status)>=0?'approved':'requested')+' ('+expKey(dup)+').'};
    b=bgRec(part.budget);a=bgAlloc(part.alloc);amt=part.need;
  }else{
    amt=bgM(parseFloat(d.amount));if(!(amt>0))return {error:'Enter the exception amount.'};
    b=bgRec(Number(d.budgetId));a=d.allocId?bgAlloc(d.allocId):null;
    if(!b||b.entity!==bgEnt()||b.status!=='Active')return {error:'Pick an active budget.'};
    if(d.allocId&&(!a||a.budgetId!==b.id))return {error:'Pick an allocation of that budget.'};
    if(!bgCanSeeBudgetScope(A,b,a?[a.id]:[]))return {error:caN(A.who)+' can request exceptions only within budgets or allocations they own.'};
  }
  const effFrom=part?part.from:(d.effFrom||wbToday()),effTo=part?part.to:(d.effTo||b.fyEnd);
  if(effFrom<b.fyStart||effTo>b.fyEnd||effTo<effFrom)return {error:'The effective period must lie inside '+b.fy+'.'};
  const r=bgNewChange('budget exception','BEX',{currency:b.currency,reason:reason,proof:d.proof},A);
  Object.assign(r,{title:'Budget exception · '+(src?expKey(src)+' · ':'')+(a?a.key:expKey(b))+(part&&part.q?' Q'+part.q:''),category:'Budget Exception',budgetId:b.id,allocId:a?a.id:null,
    sourceKind:d.sourceKind||'',sourceId:src?src.id:null,sourceKey:srcKey,sourceRef:src?expKey(src):'',fy:b.fy,quarter:part?part.q:0,portionKey:part?part.key:'',
    lineIds:part?part.lineIds.slice():[],srcCurrency:src?src.currency:'',effFrom:effFrom,effTo:effTo,uses:{},approvedLimit:0,
    lines:[{id:1,title:part?'Required overrun (calculated)':'Requested overrun',amount:amt,subCat:'Exception',start:effFrom,end:effTo,status:'Pending',approved:null}]});
  bgChanges.unshift(r);
  if(submit){const e=bgSubmit(r.id,A);if(e){bgChanges.shift();bgChgNextId--;bgChgNextKey--;return {error:e};}}
  if(src)(d.sourceKind==='expense'?caLog:advLog)(src,src.status,'Budget exception '+expKey(r)+' requested'+(nParts>1?' for the '+part.fy+(part.q?' Q'+part.q:'')+' part of this request':'')+'. It stays a draft until the exception is decided.',A);
  return {rec:r};
}
function bgWorstEval(evs){return evs.reduce(function(m,x){return !m||(BG_RANK[x.result]||0)>(BG_RANK[m.result]||0)?x:m;},null);}
function bgValidateException(r){
  const b=bgRec(r.budgetId);if(!b||b.status!=='Active')return 'The budget is not active.';
  if(r.allocId){const a=bgAlloc(r.allocId);if(!a||a.status!=='Active')return 'The allocation is not active.';}
  if(!(caTotal(r)>0))return 'Enter the requested overrun.';
  return '';
}

/* ── Opening Exposure (decision 3) ─────────────────────────────────────── */
/* An existing imprest fund's balance outside the budget, brought in by Finance as at a cut-off
   date into a chosen allocation - with a reason, under the allocation's enforcement, fully audited.
   Build 5's ledger is not changed; the fund stays accountable exactly as before. */
function bgLedgerCut(h,iso){const led=h.ledger||[];let n=0;while(n<led.length&&String(led[n].date||'')<=iso)n++;return n;}
function bgAccountablePrefix(h,n){
  const led=(h.ledger||[]).slice(0,n);let v=0;
  led.forEach(function(e){const a=Number(e.amount)||0;
    if(e.type==='Issuance'||e.type==='Replenishment')v+=a;else if(e.type==='Utilization'||e.type==='Return'||e.type==='Recovery')v-=a;
    else if(e.type==='Reversal')v+=(e.ofType==='Issuance'||e.ofType==='Replenishment')?-a:a;});
  return bgM(v);
}
/* What an Opening Exposure mapping would bring in: the balance outside the budget as at the cut-off. */
function bgOpeningPreview(f,cutoff){
  const n=bgLedgerCut(f,cutoff),F=f.bgTrackFrom;
  const before=bgHolderMap(f)?bgTrack(f).tracked:0;
  const sim=Object.assign({},f,{bgTrackFrom:F||{idx:n,base:bgAccountablePrefix(f,n),counted:0},bgOpening:{idx:n}});
  const after=bgTrack(sim);
  /* The balance outside the budget on the cut-off date itself (an auditable as-at figure). */
  const atCutoff=F?bgM(Math.max(0,bgTrack(Object.assign({},f,{ledger:(f.ledger||[]).slice(0,Math.max(n,F.idx)),bgOpening:null})).legacy)):bgAccountablePrefix(f,n);
  return {idx:n,atCutoff:atCutoff,recognized:bgM(after.tracked-before),after:after.tracked,before:before};
}
/* Occupancy of each node of a budget in a desired-state map (B = the budget total). */
function bgNodeOccFrom(want,b){
  const o={B:0};
  Object.keys(want).forEach(function(k){const x=want[k];if(x.budget!==b.id)return;
    const v=bgM((x.pending||0)+(x.committed||0)+(x.actual||0)+(x.exposure||0));if(!v)return;
    o.B=bgM(o.B+v);const a=bgAlloc(x.alloc);if(!a)return;
    [a].concat(bgAncestors(a)).forEach(function(y){o[y.id]=bgM((o[y.id]||0)+v);});});
  return o;
}
function bgOpeningCandidates(ent){
  ent=ent||bgEnt();
  return impFunds.filter(function(f){return f.entity===ent&&!f.closed&&f.status!=='Draft'&&!f.bgOpening&&(bgHolderMap(f)?bgTrack(f).legacy>0:advBal(f).accountable>0);});
}
function bgOpeningMap(d,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.manage'))return {error:caN(A.who)+' cannot map opening exposure (budget.manage).'};
  const f=impFund(Number(d.fundId));if(!f||f.entity!==bgEnt())return {error:'Pick an imprest fund of this entity.'};
  if(f.bgOpening)return {error:expKey(f)+' already has an Opening Exposure mapping ('+f.bgOpening.ref+').'};
  if(f.closed||f.status==='Draft')return {error:expKey(f)+' is '+(f.closed?'closed':'not funded yet')+'.'};
  if(idUserOfEmp(f.custodianEid)===A.who)return {error:'Separation of duties: '+caN(A.who)+' holds '+expKey(f)+'.'};
  const reason=String(d.reason||'').trim();if(!reason)return {error:'Give the reason for the mapping; it is kept in the audit trail.'};
  const cutoff=d.cutoff||'';if(!cutoff||cutoff>wbToday())return {error:'Pick the cut-off date (today or earlier).'};
  const a=bgAlloc(Number(d.allocId)),b=a?bgRec(a.budgetId):null;
  if(!a||!b||b.entity!==f.entity||a.status!=='Active'||['Active','Scheduled','Approved'].indexOf(b.status)<0)return {error:'Pick an active allocation of an approved budget.'};
  if(cutoff<b.fyStart||cutoff>b.fyEnd||cutoff<b.effFrom||(b.effTo&&cutoff>b.effTo))return {error:'The cut-off date must fall in '+expKey(b)+'\'s effective period ('+cdLabel(b.effFrom)+' – '+cdLabel(b.effTo||b.fyEnd)+').'};
  if(bgFyStatus(b.fy,b.entity).status==='Closed')return {error:b.fy+' is closed.'};
  const hm=bgHolderMap(f);
  if(hm&&hm.alloc!==a.id)return {error:expKey(f)+' is already under budget control in '+bgAllocKey(bgAlloc(hm.alloc))+'; its opening exposure goes there.'};
  /* The cut-off must be a date the fund's ledger states a balance for. */
  const led=f.ledger||[],first=led.findIndex(function(e){return e.type==='Issuance'||e.type==='Replenishment';}),n=bgLedgerCut(f,cutoff),F=f.bgTrackFrom;
  if(first<0||n<=first)return {error:'The cut-off date is before '+expKey(f)+' was first funded'+(first>=0?' ('+cdLabel(led[first].date)+')':'')+'; pick a later date.'};
  if(F&&n<F.idx)return {error:'Budget control already applies to '+expKey(f)+' from '+(F.ref||'its first controlled request')+'; pick a cut-off on or after that date.'};
  let rate=1,rateDate=cutoff;
  if(hm){rate=bgRateOf(hm,f.currency);rateDate=hm.rateDate||cutoff;if(!rate)return {error:'Missing exchange rate for '+expKey(f)+'\'s budget mapping; nothing is estimated.'};}
  else if(f.currency!==b.currency){const c=epConvert(1,f.currency,b.currency,cutoff);if(!c)return {error:'Missing exchange rate from '+f.currency+' to '+b.currency+' for '+cdLabel(cutoff)+'; nothing is estimated. Configure the rate first.'};rate=c.rate;rateDate=c.date||cutoff;}
  const pv=bgOpeningPreview(f,cutoff);
  if(!(pv.atCutoff>0))return {error:'Nothing of '+expKey(f)+' is outside the budget as at '+cdLabel(cutoff)+'.'};
  const ref='OPX-'+f.key+'-'+cutoff;
  const save={bgt:f.bgt,tf:f.bgTrackFrom,op:f.bgOpening};
  const apply=function(){
    if(!hm){f.bgt={entity:f.entity,fy:b.fy,budget:b.id,alloc:a.id,q:b.quarterly?bgQuarterOf(cutoff,b.fyStart):null,rate:rate,rateDate:rateDate,cur:b.currency,result:'Opening Exposure',reason:reason,at:wbToday(),date:cutoff};
      f.bgTrackFrom={idx:pv.idx,base:bgAccountablePrefix(f,pv.idx),counted:0,at:bgStamp(A),by:A.who,ref:ref};}
    f.bgOpening={idx:pv.idx};
  };
  /* The whole charge the mapping causes - the balance still held plus spending since the cut-off - is what the
     budget's rule checks and what the audit trail records (decision 3, decision 5). */
  const occ0=bgNodeOccFrom(bgDesired(),b);apply();const occ1=bgNodeOccFrom(bgDesired(),b);
  f.bgt=save.bgt;f.bgTrackFrom=save.tf;f.bgOpening=save.op;
  const nodes=[a].concat(bgAncestors(a)).map(function(x){return {id:x.id,amount:x.amount,enf:bgEnf(x,b),label:x.key};}).concat([{id:null,amount:b.amount,enf:b.enforcement,label:expKey(b)+' total'}]);
  const breach=[];let blocking=false;
  nodes.forEach(function(nd){const d=bgM((occ1[nd.id==null?'B':nd.id]||0)-(occ0[nd.id==null?'B':nd.id]||0));nd.delta=d;
    if(d>0.001&&bgOcc(b,nd.id).occupied+d>nd.amount+0.001){breach.push(nd.label+(nd.enf==='Blocking'?' (Blocking)':''));if(nd.enf==='Blocking')blocking=true;}});
  const charged=nodes[nodes.length-1].delta;
  if(blocking)return {error:'Mapping would charge '+expMoney(charged,b.currency)+' and exceed '+breach.join(', ')+'. Budget control is Blocking: revise or transfer budget first.'};
  const n0=bgEvents.length;
  apply();
  f.bgOpening={idx:pv.idx,cutoff:cutoff,atCutoff:pv.atCutoff,recognized:pv.recognized,charged:charged,alloc:a.id,budget:b.id,by:A.who,at:bgStamp(A),reason:reason,ref:ref,warning:breach.length?breach.join(', '):''};
  bgSyncAll(A);
  bgEvents.slice(n0).forEach(function(e){
    if(e.src==='IMP-'+f.key&&e.cls==='exposure'&&e.delta>0)e.type='Opening Exposure Mapped';
    e.note=(e.note?e.note+' ':'')+ref+': balance outside the budget as at '+cdLabel(cutoff)+' '+expMoney(pv.atCutoff,f.currency)+'. '+reason;});
  bgLog(b,b.status,'Opening Exposure '+ref+': '+expKey(f)+' ('+f.name+') held '+expMoney(pv.atCutoff,f.currency)+' outside the budget as at '+cdLabel(cutoff)+' ('+expMoney(pv.recognized,f.currency)+' of it still held now). Mapped to '+a.key+' ('+bgScopeLabel(a)+') by '+caN(A.who)
    +'; charged to the budget: '+expMoney(charged,b.currency)+' (the balance still held, plus spending since the cut-off). Reason: '+reason+(breach.length?' Above '+breach.join(', ')+' (Warning).':'')+' The fund\'s ledger and the custodian\'s accountability are unchanged.',A);
  /* The custodian reads the fund's log: it records the mapping, not the budget line (decision 8). */
  advLog(f,f.status,'Opening Exposure '+ref+' recorded by '+caN(A.who)+' as at '+cdLabel(cutoff)+': the fund\'s balance from that date is now counted in a budget. The fund\'s ledger and the custodian\'s accountability are unchanged.',A);
  caNotify(bgUniq([b.ownerUid,a.ownerUid].concat(caPermHolders('budget.audit.view'))).filter(function(u){return u!==A.who;}),expKey(f)+': opening exposure mapped to '+a.key,null);
  return {rec:f,recognized:pv.recognized,charged:charged};
}

/* ── Budget revisions ─────────────────────────────────────────────────── */
/* d: budgetId, proposedAmount, changes [{allocId, amount, quarters}], newLines [{scope.., parentId, amount, quarters}], effDate, reason. */
function bgRevisionCreate(d,submit,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.revise.request'))return {error:caN(A.who)+' cannot request budget revisions.'};
  const b=bgRec(Number(d.budgetId));
  if(!b||b.entity!==bgEnt()||['Active','Scheduled','Approved'].indexOf(b.status)<0)return {error:'Pick an approved budget; a draft is edited directly.'};
  const changes=(d.changes||[]).filter(function(c){return c&&c.allocId;}).map(function(c){return {allocId:Number(c.allocId),amount:bgM(parseFloat(c.amount)),quarters:c.quarters||null};});
  if(!bgCanSeeBudgetScope(A,b,changes.map(function(c){return c.allocId;})))return {error:caN(A.who)+' can request revisions only within budgets or allocations they own.'};
  const reason=String(d.reason||'').trim();if(!reason)return {error:'Every revision needs a reason.'};
  const prop=bgM(parseFloat(d.proposedAmount));if(!(prop>0))return {error:'Enter the proposed budget amount.'};
  const r=bgNewChange('budget revision','BRV',{currency:b.currency,reason:reason,proof:d.proof},A);
  Object.assign(r,{title:'Budget revision · '+expKey(b),category:'Budget Revision',budgetId:b.id,currentAmount:b.amount,proposedAmount:prop,change:bgM(prop-b.amount),
    changes:changes.map(function(c){const a=bgAlloc(c.allocId);return Object.assign(c,{from:a?a.amount:0,key:a?a.key:''});}),
    newLines:(d.newLines||[]).map(function(n){return Object.assign(bgScopeOf(n),{parentId:n.parentId?Number(n.parentId):null,amount:bgM(parseFloat(n.amount)),quarters:n.quarters||null,ownerUid:n.ownerUid||'',enforcement:n.enforcement||''});}),
    effDate:d.effDate||wbToday(),
    lines:[{id:1,title:'Proposed budget',amount:prop,subCat:'Revision',start:d.effDate||wbToday(),end:b.fyEnd,status:'Pending',approved:null}]});
  if(r.effDate<b.fyStart||r.effDate>b.fyEnd)return {error:'The effective date must fall inside '+b.fy+'.'};
  const e=bgValidateRevision(r);if(e)return {error:e};
  bgChanges.unshift(r);
  if(submit){const se=bgSubmit(r.id,A);if(se){bgChanges.shift();bgChgNextId--;bgChgNextKey--;return {error:se};}}
  return {rec:r};
}
/* The budget as it would be after the revision: every ceiling and every occupied amount must still fit. */
function bgValidateRevision(r){
  const b=bgRec(r.budgetId);if(!b)return 'No such budget.';
  if(['Active','Scheduled','Approved'].indexOf(b.status)<0)return expKey(b)+' is '+b.status+'.';
  const amt={};b.allocations.forEach(function(a){amt[a.id]=a.amount;});
  for(let i=0;i<r.changes.length;i++){const c=r.changes[i],a=bgAlloc(c.allocId);
    if(!a||a.budgetId!==b.id)return 'Pick allocations of '+expKey(b)+'.';
    if(!(c.amount>=0))return a.key+': enter the new amount.';amt[a.id]=c.amount;}
  const occB=bgOcc(b,null).occupied;
  if(r.proposedAmount<occB-0.001)return 'The revised budget ('+expMoney(r.proposedAmount,b.currency)+') would be below what is already occupied ('+expMoney(occB,b.currency)+'), creating a deficit. Reduce less, or resolve the obligations first.';
  for(let i=0;i<r.changes.length;i++){const c=r.changes[i],a=bgAlloc(c.allocId),o=bgOcc(b,a.id).occupied;
    if(c.amount<o-0.001)return a.key+' would fall to '+expMoney(c.amount,b.currency)+', below the '+expMoney(o,b.currency)+' already occupied (pending, committed and actual).';
    if(c.quarters&&bgSum(c.quarters,function(v){return Number(v)||0;})>c.amount+0.001)return a.key+': quarter amounts exceed the new amount.';}
  for(let i=0;i<r.newLines.length;i++){const n=r.newLines[i],e=bgCheckScope(n);if(e)return 'New line: '+e;if(!(n.amount>0))return 'New line: enter its amount.';
    if(b.allocations.some(function(x){return x.status==='Active'&&bgScopeEqual(x,n);}))return 'A line for '+bgScopeLabel(n)+' already exists.';
    const p=n.parentId?bgAlloc(n.parentId):null;if(n.parentId&&(!p||p.budgetId!==b.id||!bgScopeContains(p,n)))return 'New line: the parent must be a wider line of this budget.';
    const amb=b.allocations.filter(function(x){return x.status==='Active'&&bgScopeIntersects(x,n)&&!(p&&(x===p||bgAncestors(p).indexOf(x)>=0));});
    if(amb.length)return 'New line '+bgScopeLabel(n)+' overlaps '+amb.map(function(x){return x.key;}).join(', ')+' without a parent-child relation.';}
  const top=bgSum(b.allocations.filter(function(a){return a.status==='Active'&&!a.parentId;}),function(a){return amt[a.id];})+bgSum(r.newLines.filter(function(n){return !n.parentId;}),function(n){return n.amount;});
  if(top>r.proposedAmount+0.001)return 'Top-level allocations would total '+expMoney(top,b.currency)+', more than the revised budget.';
  const bad=b.allocations.find(function(a){return a.status==='Active'&&bgSum(bgChildren(b,a.id),function(x){return amt[x.id];})+bgSum(r.newLines.filter(function(n){return n.parentId===a.id;}),function(n){return n.amount;})>amt[a.id]+0.001;});
  if(bad)return 'Lines under '+bad.key+' would exceed it.';
  return '';
}
function bgApplyRevision(r,A){
  const e=bgValidateRevision(r);
  if(e){r.applyError=e;bgLog(r,r.status,'Approved but not applied: '+e+' Cancel it or raise a new revision.',A);caNotify(caClaimants(r),expKey(r)+' could not be applied: '+e,r);return;}
  const b=bgRec(r.budgetId),was=b.amount;
  b.amount=r.proposedAmount;
  r.changes.forEach(function(c){const a=bgAlloc(c.allocId);a.amount=c.amount;if(c.quarters)a.quarters=c.quarters.map(function(v){return bgM(parseFloat(v)||0);});});
  r.newLines.forEach(function(n){const a=Object.assign({id:bgAllocNext++,budgetId:b.id,status:'Active',createdBy:r.createdBy,createdAt:bgStamp(A)},n);a.key='AL-'+(100+a.id);b.allocations.push(a);});
  bgSnapshot(b,'Revision '+expKey(r)+': '+r.reason,expKey(r),A);
  r.status='Applied';r.appliedAt=bgStamp(A);
  bgLog(b,b.status,'Revision '+expKey(r)+' applied: '+expMoney(was,b.currency)+' → '+expMoney(b.amount,b.currency)+(r.changes.length?'; '+r.changes.map(function(c){return c.key+' '+expMoney(c.from,b.currency)+' → '+expMoney(c.amount,b.currency);}).join(', '):'')
    +(r.newLines.length?'; '+r.newLines.length+' new line(s)':'')+'. Version '+b.version+'.',A);
  bgLog(r,'Applied','Applied to '+expKey(b)+' (version '+b.version+').',A);
  caNotify(bgUniq([b.ownerUid].concat(b.allocations.map(function(a){return a.ownerUid;}))),expKey(b)+' revised by '+expKey(r),b);
}

/* ── Budget transfers ─────────────────────────────────────────────────── */
/* d: budgetId, fromAllocId ('' = unallocated reserve), toAllocId ('' = reserve), amount, quarter (phased budgets), reason. */
function bgTransferCreate(d,submit,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.transfer.request'))return {error:caN(A.who)+' cannot request budget transfers.'};
  const b=bgRec(Number(d.budgetId));if(!b||b.entity!==bgEnt()||b.status!=='Active')return {error:'Pick an active budget.'};
  const from=d.fromAllocId?Number(d.fromAllocId):null,to=d.toAllocId?Number(d.toAllocId):null;
  if(from===to)return {error:'Pick different source and destination.'};
  if(!bgCanSeeBudgetScope(A,b,[from,to].filter(Boolean)))return {error:caN(A.who)+' can request transfers only within budgets or allocations they own.'};
  const reason=String(d.reason||'').trim();if(!reason)return {error:'Give the reason for the transfer.'};
  const amt=bgM(parseFloat(d.amount));if(!(amt>0))return {error:'Transfer Amount must be more than 0.'};
  const r=bgNewChange('budget transfer','BTR',{currency:b.currency,reason:reason,proof:d.proof},A);
  const fa=from?bgAlloc(from):null,ta=to?bgAlloc(to):null;
  Object.assign(r,{title:'Budget transfer · '+(fa?fa.key:'Reserve')+' → '+(ta?ta.key:'Reserve'),category:'Budget Transfer',budgetId:b.id,fromAllocId:from,toAllocId:to,
    fromLabel:fa?fa.key+' '+bgScopeLabel(fa):'Unallocated reserve',toLabel:ta?ta.key+' '+bgScopeLabel(ta):'Unallocated reserve',amount:amt,quarter:b.quarterly?Number(d.quarter)||0:0,
    lines:[{id:1,title:'Transfer amount',amount:amt,subCat:'Transfer',start:wbToday(),end:wbToday(),status:'Pending',approved:null}]});
  const e=bgValidateTransfer(r);if(e)return {error:e};
  bgChanges.unshift(r);
  if(submit){const se=bgSubmit(r.id,A);if(se){bgChanges.shift();bgChgNextId--;bgChgNextKey--;return {error:se};}}
  return {rec:r};
}
function bgValidateTransfer(r){
  const b=bgRec(r.budgetId);if(!b||b.status!=='Active')return 'The budget is not active.';
  const fa=r.fromAllocId?bgAlloc(r.fromAllocId):null,ta=r.toAllocId?bgAlloc(r.toAllocId):null;
  if((r.fromAllocId&&(!fa||fa.budgetId!==b.id||fa.status!=='Active'))||(r.toAllocId&&(!ta||ta.budgetId!==b.id||ta.status!=='Active')))return 'Source and destination must be active allocations of '+expKey(b)+' (or its reserve).';
  if(b.quarterly&&!(r.quarter>=1&&r.quarter<=4))return 'Pick the quarter the amount moves in (the budget is phased).';
  const amt=r.amount,q=r.quarter;
  if(!fa){if(bgReserve(b)<amt-0.001)return 'The unallocated reserve is '+expMoney(bgReserve(b),b.currency)+'; it cannot give '+expMoney(amt,b.currency)+'.';}
  else{
    const o=bgOcc(b,fa.id).occupied,kids=bgSum(bgChildren(b,fa.id),function(x){return x.amount;});
    const room=bgM(fa.amount-Math.max(o,kids));
    if(room<amt-0.001)return fa.key+' can transfer at most '+expMoney(Math.max(0,room),b.currency)+' (it holds '+expMoney(fa.amount,b.currency)+'; '+expMoney(o,b.currency)+' is occupied and '+expMoney(kids,b.currency)+' sits in lines under it).';
    if(q&&fa.quarters&&fa.quarters[q-1]<amt-0.001)return fa.key+' has only '+expMoney(fa.quarters[q-1],b.currency)+' in Q'+q+'.';
  }
  if(ta){
    const p=ta.parentId?bgAlloc(ta.parentId):null;
    if(p){const sib=bgSum(bgChildren(b,p.id),function(x){return x.amount;})+amt-(fa&&fa.parentId===p.id?amt:0)+(fa&&fa.id===p.id?amt:0);
      if(sib>p.amount-(fa&&fa.id===p.id?amt:0)+0.001)return ta.key+' sits under '+p.key+'; lines under it would exceed it.';}
    else if(fa&&fa.parentId){/* moving from a child line to the top level */const top=bgAllocated(b)+amt;if(top>b.amount+0.001)return 'Top-level allocations would exceed the budget.';}
  }else if(fa&&fa.parentId)return 'A line under a parent gives to the reserve through its parent; pick the parent or another line.';
  return '';
}
function bgApplyTransfer(r,A){
  const e=bgValidateTransfer(r);
  if(e){r.applyError=e;bgLog(r,r.status,'Approved but not applied: '+e+' Cancel it or raise a new transfer.',A);caNotify(caClaimants(r),expKey(r)+' could not be applied: '+e,r);return;}
  const b=bgRec(r.budgetId),fa=r.fromAllocId?bgAlloc(r.fromAllocId):null,ta=r.toAllocId?bgAlloc(r.toAllocId):null,q=r.quarter;
  if(fa){fa.amount=bgM(fa.amount-r.amount);if(q&&fa.quarters)fa.quarters[q-1]=bgM(fa.quarters[q-1]-r.amount);}
  if(ta){ta.amount=bgM(ta.amount+r.amount);if(q&&ta.quarters)ta.quarters[q-1]=bgM(ta.quarters[q-1]+r.amount);}
  bgSnapshot(b,'Transfer '+expKey(r)+': '+r.reason,expKey(r),A);
  r.status='Applied';r.appliedAt=bgStamp(A);
  bgLog(b,b.status,'Transfer '+expKey(r)+' applied: '+expMoney(r.amount,b.currency)+' from '+r.fromLabel+' to '+r.toLabel+(q?' (Q'+q+')':'')+'. The budget total is unchanged ('+expMoney(b.amount,b.currency)+'). Version '+b.version+'.',A);
  bgLog(r,'Applied','Applied to '+expKey(b)+' (version '+b.version+').',A);
  caNotify(bgUniq([b.ownerUid,fa&&fa.ownerUid,ta&&ta.ownerUid]),expKey(b)+': '+expMoney(r.amount,b.currency)+' transferred ('+expKey(r)+')',b);
}
/* Cancel a draft change, or an approved one that could not be applied. */
function bgChangeCancel(id,reason,A){
  A=A||bgNow();
  const r=bgChg(id);if(!r||r.entity!==bgEnt())return 'No such change.';
  if(!(r.createdBy===A.who||bgPCan(A,'budget.manage')))return caN(A.who)+' cannot cancel this change.';
  if(!(r.status==='Draft'||(['Approved','Partially Approved'].indexOf(r.status)>=0&&r.kind!=='budget exception'&&r.applyError)
    ||(r.kind==='budget revision'&&r.status==='Approved'&&!r.appliedAt)))return 'Only a draft, or an approved change not yet applied, is cancelled.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  r.status='Cancelled';bgLog(r,'Cancelled','Cancelled by '+caN(A.who)+': '+reason,A);
  return '';
}

/* ── Financial year close ─────────────────────────────────────────────── */
/* What is still open in a year: pending (must be resolved), committed (must be
   carried forward explicitly) and funding exposure (stays accountable; carried only by choice). */
const BG_CLOSABLE=['Approved','Scheduled','Active','Inactive','Expired'];
function bgCloseReview(fy,ent){
  ent=ent||bgEnt();
  const ids=bgBudgets.filter(function(b){return b.entity===ent&&b.fy===fy;}).map(function(b){return b.id;});
  return Object.keys(bgStates).map(function(k){return bgStates[k];}).filter(function(s){return ids.indexOf(s.budget)>=0&&!s.frozen&&(s.pending||s.committed||s.exposure);})
    .map(function(s){return {key:s.key,src:s.src,label:s.label,kind:s.kind,alloc:s.alloc,pending:s.pending,committed:s.committed,exposure:s.exposure};});
}
function bgNextFy(fy,ent){const b=bgBudgets.find(function(x){return x.fy===fy&&x.entity===(ent||bgEnt());});const sy=b?Number(b.fyStart.slice(0,4)):bgFyOf(wbToday(),ent).startYear;return bgFyRange(sy+1,ent);}
/* d: fy, items [{key, action:'carry'|'keep', target}], reason. */
function bgCloseCreate(d,submit,A){
  A=A||bgNow();
  if(!bgPCan(A,'budget.manage'))return {error:caN(A.who)+' cannot close financial years (budget.manage).'};
  if(bgFyStatus(d.fy).status==='Closed')return {error:d.fy+' is already closed.'};
  const buds=bgBudgets.filter(function(b){return b.entity===bgEnt()&&b.fy===d.fy&&BG_CLOSABLE.indexOf(b.status)>=0;});
  if(!buds.length)return {error:'No approved budget exists for '+d.fy+'.'};
  if(bgChanges.some(function(c){return c.entity===bgEnt()&&c.kind==='financial year close'&&c.fy===d.fy&&['Draft','Awaiting Approval','Follow-Up'].indexOf(c.status)>=0;}))return {error:'A close request for '+d.fy+' is already open.'};
  const reason=String(d.reason||'').trim();if(!reason)return {error:'Give the reason for closing.'};
  const r=bgNewChange('financial year close','FYC',{currency:buds[0].currency,reason:reason},A);
  const total=bgSum(buds,function(b){return b.amount;});
  Object.assign(r,{title:'Close '+d.fy,category:'Financial Year Close',fy:d.fy,budgetIds:buds.map(function(b){return b.id;}),items:(d.items||[]).map(function(i){return {key:i.key,action:i.action==='carry'?'carry':'keep',target:i.target?Number(i.target):null};}),
    lines:[{id:1,title:'Budgets of '+d.fy,amount:total,subCat:'Year close',start:wbToday(),end:wbToday(),status:'Pending',approved:null}]});
  const e=bgValidateClose(r);if(e)return {error:e};
  bgChanges.unshift(r);
  if(submit){const se=bgSubmit(r.id,A);if(se){bgChanges.shift();bgChgNextId--;bgChgNextKey--;return {error:se};}}
  return {rec:r};
}
/* The record behind a utilization source key. */
function bgSrcRecOf(src){
  const p=String(src).split('@')[0],t=p.slice(0,3),key=Number(p.slice(4));
  if(t==='ADV')return advancesData.find(function(x){return x.key===key;})||null;
  if(t==='IMP')return impFunds.find(function(x){return x.key===key;})||null;
  if(t==='IRQ')return impRequests.find(function(x){return x.key===key;})||null;
  return null;
}
/* The rate a carried amount converts at into the target budget's currency - never a copied or guessed one (decision 6). */
function bgCarryRate(src,tb){
  const rec=bgSrcRecOf(src),m=rec&&rec.bgt;if(!rec)return {rate:1,rateDate:tb.fyStart};
  if(m&&m.cur===tb.currency&&Number(m.rate)>0)return {rate:Number(m.rate),rateDate:m.rateDate||''};
  if(rec.currency===tb.currency)return {rate:1,rateDate:tb.fyStart};
  const c=epConvert(1,rec.currency,tb.currency,tb.fyStart);
  return c?{rate:c.rate,rateDate:c.date||tb.fyStart}:{error:'Missing exchange rate from '+rec.currency+' to '+tb.currency+' for '+cdLabel(tb.fyStart)+'; nothing is estimated. Configure the rate before closing.'};
}
function bgValidateClose(r){
  if(bgFyStatus(r.fy,r.entity).status==='Closed')return r.fy+' is already closed.';
  /* Nothing of the year may still be in approval: budgets, or changes to them. */
  const inAppr=bgBudgets.filter(function(b){return b.entity===r.entity&&b.fy===r.fy&&['Awaiting Approval','Follow-Up'].indexOf(b.status)>=0;});
  if(inAppr.length)return 'Decide the budgets still in approval first: '+inAppr.map(expKey).join(', ')+'.';
  const chg=bgChanges.filter(function(c){return c.entity===r.entity&&c.kind!=='financial year close'&&['Awaiting Approval','Follow-Up'].indexOf(c.status)>=0&&(bgRec(c.budgetId)||{}).fy===r.fy;});
  if(chg.length)return 'Decide the budget changes still in approval first: '+chg.map(expKey).join(', ')+'.';
  const open=bgCloseReview(r.fy,r.entity),next=bgNextFy(r.fy,r.entity);
  const pend=open.filter(function(x){return x.pending>0;});
  if(pend.length)return 'Resolve what is still in approval first: '+pend.slice(0,5).map(function(x){return x.label;}).join('; ')+(pend.length>5?' and '+(pend.length-5)+' more':'')+'.';
  for(let i=0;i<open.length;i++){
    const x=open[i],it=(r.items||[]).find(function(y){return y.key===x.key;});
    if(x.committed>0&&(!it||it.action!=='carry'))return x.label+' is committed (approved, not yet issued): carry it forward to a '+next.label+' allocation, or cancel its authorization first.';
    if(it&&it.action==='carry'){
      const t=it.target?bgAlloc(it.target):null,tb=t?bgRec(t.budgetId):null;
      if(!t||!tb||tb.entity!==r.entity||tb.fy!==next.label||['Active','Scheduled','Approved'].indexOf(tb.status)<0||t.status!=='Active')return x.label+': pick an active '+next.label+' allocation to carry it into.';
      const fx=bgCarryRate(x.src,tb);if(fx.error)return x.label+': '+fx.error;
    }
  }
  /* A carried top-up and its fund go to the same line, so the payment lands where the commitment was. */
  const its=r.items||[];
  for(let i=0;i<its.length;i++){const it=its[i];if(it.action!=='carry'||String(it.key).indexOf('IRQ-')!==0)continue;
    const q=bgSrcRecOf(it.key),f=q?impFund(q.fundId):null;if(!f)continue;
    const fi=its.find(function(y){return String(y.key).split('@')[0]==='IMP-'+f.key&&y.action==='carry';});
    if(fi&&Number(fi.target)!==Number(it.target))return expKey(q)+' must be carried into the same line as its fund '+expKey(f)+'.';}
  return '';
}
function bgApplyClose(r,A){
  const e=bgValidateClose(r);
  if(e){r.applyError=e;bgLog(r,r.status,'Approved but not applied: '+e,A);return;}
  const ent=r.entity;bgFyBook[ent]=bgFyBook[ent]||{};
  const items=r.items||[],carried=[];
  bgSyncAll(A);
  Object.keys(bgStates).forEach(function(k){
    const s=bgStates[k];if(r.budgetIds.indexOf(s.budget)<0||s.frozen)return;
    const it=items.find(function(y){return y.key===k;});
    if(it&&it.action==='carry'&&(s.committed||s.exposure)){
      const t=bgAlloc(it.target),tb=bgRec(t.budgetId);
      s.carriedOut={committed:s.committed,exposure:s.exposure,to:t.key,toBudget:tb.id};
      if(s.committed)bgEmit(s,'committed',-s.committed,'Carried Forward Out',A,'To '+t.key+' of '+tb.fy+'.');
      if(s.exposure)bgEmit(s,'exposure',-s.exposure,'Carried Forward Out',A,'To '+t.key+' of '+tb.fy+'.');
      s.committed=0;s.exposure=0;
      const cf={fy:s.fy,alloc:s.alloc,key:s.src};
      const fx=bgCarryRate(s.src,tb);
      const m={entity:ent,fy:tb.fy,budget:tb.id,alloc:t.id,q:tb.quarterly?1:null,rate:fx.rate||0,rateDate:fx.rateDate||tb.fyStart,cur:tb.currency,date:tb.fyStart,result:'Carried Forward',reason:'Carried forward from '+s.fy+' by '+expKey(r)+'.',at:wbToday(),carriedFrom:cf};
      const src=s.src;
      /* A carried advance or fund counts in the new year only the utilization made after the close (no double count). */
      if(src.indexOf('ADV-')===0){const rec=advancesData.find(function(x){return 'ADV-'+x.key===src;});if(rec){m.utilFrom=(rec.ledger||[]).length;rec.bgt=m;advLog(rec,rec.status,'Budget carried forward from '+s.fy+' to '+t.key+' ('+tb.fy+') by '+expKey(r)+'.',A);}}
      else if(src.indexOf('IMP-')===0){const f=impFunds.find(function(x){return 'IMP-'+x.key===src;});if(f){m.utilFrom=(f.ledger||[]).length;f.bgt=m;advLog(f,f.status,'Budget exposure carried forward into '+tb.fy+' by '+expKey(r)+'.',A);}}
      else if(src.indexOf('IRQ-')===0){const q=impRequests.find(function(x){return 'IRQ-'+x.key===src;});if(q){q.bgt=m;
        /* Its fund was kept in the closed year: new money from this top-up counts where the top-up was carried. */
        const f=impFund(q.fundId),fk=f?'IMP-'+f.key:'';
        if(f&&!items.some(function(y){return y.action==='carry'&&String(y.key).split('@')[0]===fk;})&&!(f.bgt&&f.bgt.fy===tb.fy))bgNewSegment(f,Object.assign({},m,{carriedFrom:null}),A,expKey(r));}}
      carried.push(s.label+' → '+t.key);
    }
    s.frozen=true;
  });
  bgBudgets.forEach(function(b){if(r.budgetIds.indexOf(b.id)>=0&&b.status!=='Closed'){b.statusBeforeClose=b.status;b.status='Closed';bgLog(b,'Closed',r.fy+' closed by '+expKey(r)+'. Figures are frozen.',A);}});
  bgFyBook[ent][r.fy]={status:'Closed',by:r.submittedBy,at:bgStamp(A),ref:expKey(r)};
  r.status='Applied';r.appliedAt=bgStamp(A);
  bgLog(r,'Applied',r.fy+' closed.'+(carried.length?' Carried forward: '+carried.join('; ')+'.':' Nothing carried forward.')+' Open advances and imprest funds stay accountable under Advances & Imprest until settled.',A);
  bgSyncAll(A);
}

/* ── Corporate funding: sources and the internal ledger ──────────────── */
const FB_TYPES=['External Bank-Referenced','Cash','Other Internal'];
const FB_ENFORCE=['Warning','Blocking','Informational'];
const fbSources=[],fbTxns=[];
let fbSrcNext=1,fbTxnNext=1;
function fbSource(id){return fbSources.find(function(s){return s.id===Number(id);})||null;}
function fbTxn(id){return fbTxns.find(function(t){return t.id===Number(id);})||null;}
function fbSourcesHere(activeOnly){return fbSources.filter(function(s){return s.entity===bgEnt()&&(!activeOnly||s.status==='Active');});}
function fbMask(ref){const t=String(ref||'').replace(/\s+/g,'');if(!t)return '';const d=t.replace(/[^0-9A-Za-z]/g,'');return 'XXXX'+d.slice(-4);}
function fbTrackingOn(ent){return (typeof mcOn!=='function'||mcOn('budgets'))&&bgCfg(ent).fundingTracking;}
/* Recorded Funding Balance (Internal): verified entries only - never a bank balance. */
function fbBalance(s,exceptId){
  return bgSum(fbTxns.filter(function(t){return t.sourceId===s.id&&t.id!==exceptId&&['Verified','Reversed'].indexOf(t.status)>=0;}),function(t){return t.dir*t.amount;});
}
/* Approved commitments against a source that are not yet executed (card loads, Build 7). They are not
   entries: the Recorded Balance (Internal) never includes them. Modules that reserve add theirs here. */
function fbReserved(s){return 0;}
/* Available for new commitments: recorded balance, less payouts in progress, less reservations. */
function fbAvailable(s){return bgM(fbBalance(s)-fbInflight(s)-fbReserved(s));}
/* Payouts instructed against a source but not yet verified. */
function fbInflight(s){
  let n=0;
  advancesData.concat(impRequests).forEach(function(r){(r.disb&&r.disb.instructions||[]).forEach(function(i){if(i.status==='Processing'&&i.sourceId===s.id)n+=i.amount;});});
  expensesData.forEach(function(c){const p=c.pay;if(p&&p.sourceId===s.id&&['Processing','Partially Paid'].indexOf(p.status)>=0)n+=caOutstanding(c);});
  return bgM(n);
}
function fbSourceSave(d,A){
  A=A||bgNow();
  if(!bgPCan(A,'funding.source.manage'))return caN(A.who)+' cannot configure funding sources (funding.source.manage).';
  const name=String(d.name||'').trim(),code=String(d.code||'').trim().toUpperCase();
  if(!name)return 'Funding Source Name is required.';
  if(FB_TYPES.indexOf(d.type)<0)return 'Pick the source type.';
  if(EXP_CURRENCIES.indexOf(d.currency)<0)return 'Pick the currency.';
  if(!code)return 'Internal Source Code is required.';
  if(fbSourcesHere().some(function(s){return s.id!==d.id&&s.code===code;}))return 'Code '+code+' is already used in this entity.';
  const bankRef=d.type==='External Bank-Referenced';
  if(bankRef&&!String(d.bank||'').trim())return 'Bank / Financial Institution is required for a bank-referenced source.';
  const ex=d.id!=null?fbSource(d.id):null;
  const masked=d.maskedRef?fbMask(d.maskedRef):(ex?ex.maskedRef:'');
  if(bankRef&&!masked)return 'Enter the account reference; only its last four characters are kept.';
  if(!d.ownerUid||!idInEntity(d.ownerUid,bgEnt())||!(emsPersonPerms(d.ownerUid)['funding.source.manage']||emsPersonPerms(d.ownerUid)['funding.transaction.create']))return 'Pick a Responsible Finance Owner who manages funding.';
  if(FB_ENFORCE.indexOf(d.enforcement)<0)return 'Pick the balance enforcement.';
  if(d.effFrom&&d.effTo&&d.effTo<d.effFrom)return 'Effective To cannot be before Effective From.';
  const f={name:name,type:d.type,currency:d.currency,bank:String(d.bank||'').trim(),maskedRef:masked,code:code,ownerUid:d.ownerUid,desc:String(d.desc||'').trim(),
    effFrom:d.effFrom||'',effTo:d.effTo||'',enforcement:d.enforcement};
  if(ex){
    if(ex.entity!==bgEnt())return 'No such source.';
    if(ex.currency!==f.currency&&fbTxns.some(function(t){return t.sourceId===ex.id;}))return 'The currency of a source with entries cannot change.';
    const ch=Object.keys(f).filter(function(k){return String(ex[k]||'')!==String(f[k]||'');});
    Object.assign(ex,f);if(ch.length)bgLog(ex,ex.status,'Source updated ('+ch.join(', ')+').',A);
    return '';
  }
  const s=Object.assign({id:fbSrcNext++,entity:bgEnt(),status:'Active',createdBy:A.who,createdAt:bgStamp(A),logs:[]},f);
  s.key='FS-'+(100+s.id);fbSources.push(s);bgLog(s,'Active','Funding source created ('+s.type+', '+s.currency+'). Its balance is internal: verified entries only.',A);
  return {rec:s};
}
function fbSourceSetStatus(id,status,reason,A){
  A=A||bgNow();
  if(!bgPCan(A,'funding.source.manage'))return caN(A.who)+' cannot change funding sources.';
  const s=fbSource(id);if(!s||s.entity!==bgEnt())return 'No such source.';
  if(['Active','Inactive'].indexOf(status)<0||s.status===status)return 'Pick a different status.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  s.status=status;bgLog(s,status,'Status '+(status==='Active'?'Inactive → Active':'Active → Inactive')+' by '+caN(A.who)+': '+reason+(status==='Inactive'?' It takes no new ordinary transactions; its history stays.':''),A);
  return '';
}
function fbRefUsed(ref,exceptId,ent){
  ref=caNorm(ref);if(!ref)return false;
  return fbTxns.some(function(t){return t.id!==exceptId&&t.entity===(ent||bgEnt())&&['Rejected','Failed'].indexOf(t.status)<0&&caNorm(t.ref)===ref;});
}
/* A manual funding entry: Funding In or an Adjustment (+/-). It counts once verified. */
function fbTxnCreate(d,A){
  A=A||bgNow();
  if(!bgPCan(A,'funding.transaction.create'))return {error:caN(A.who)+' cannot record funding entries (funding.transaction.create).'};
  const s=fbSource(d.sourceId);if(!s||s.entity!==bgEnt())return {error:'Pick a funding source of this entity.'};
  if(s.status!=='Active')return {error:s.key+' is inactive; it takes no new entries.'};
  if(['Funding In','Adjustment'].indexOf(d.type)<0)return {error:'Pick Funding In or Adjustment.'};
  const dir=d.type==='Adjustment'&&d.direction==='Decrease'?-1:1;
  const amt=bgM(parseFloat(d.amount));if(!(amt>0))return {error:'Enter the amount.'};
  if(!d.date||d.date>wbToday())return {error:'Enter the transaction date (not in the future).'};
  const ill=d.source==='Illustrative';
  if(ill&&!(typeof ccDemoOn==='function'&&ccDemoOn(bgEnt())))return {error:'Illustrative funding is recorded only in the presentation company.'};
  if(ill&&d.type!=='Funding In')return {error:'Only Funding In is recorded as illustrative.'};
  const ref=ill?'ILLUSTRATIVE-FT-'+(1000+fbTxnNext):String(d.ref||'').trim();
  if(!ill&&s.type==='External Bank-Referenced'&&d.type==='Funding In'&&!ref)return {error:'Enter the source reference (bank transfer reference).'};
  if(ref&&fbRefUsed(ref))return {error:'Reference '+ref+' is already recorded; the same funding is never recorded twice.'};
  const desc=String(d.desc||'').trim();if(!desc)return {error:'Funding Description is required.'};
  const t={id:fbTxnNext++,entity:bgEnt(),sourceId:s.id,type:d.type,dir:dir,amount:amt,currency:s.currency,date:d.date,ref:ref,extRef:String(d.extRef||'').trim(),erpRef:String(d.erpRef||'').trim(),
    desc:desc,evidence:d.evidence||'',status:d.draft?'Draft':'Pending Verification',verification:ill?'Illustrative':'Manual',illustrative:ill,origin:{type:'manual',key:''},recordedBy:A.who,recordedAt:bgStamp(A),logs:[]};
  t.key='FT-'+(1000+t.id);fbTxns.push(t);
  bgLog(t,t.status,t.type+(t.type==='Adjustment'?' ('+(dir>0?'increase':'decrease')+')':'')+' of '+expMoney(amt,t.currency)+' recorded by '+caN(A.who)+' on '+s.key+(ill?' as Illustrative: no money moved, and it never enters the recorded balance.':'. It is not part of the recorded balance until verified.'),A);
  if(t.status==='Pending Verification')fbNotifyVerifiers(t,A);
  return {rec:t};
}
function fbNotifyVerifiers(t,A){caNotify(caPermHolders('funding.transaction.verify').filter(function(u){return u!==t.recordedBy;}),t.key+' needs funding verification ('+expMoney(t.amount,t.currency)+')',null);}
function fbTxnSubmit(id,A){
  A=A||bgNow();const t=fbTxn(id);if(!t||t.entity!==bgEnt())return 'No such entry.';
  if(t.status!=='Draft')return 'Only a draft is submitted.';
  if(t.recordedBy!==A.who&&!bgPCan(A,'funding.source.manage'))return caN(A.who)+' cannot submit this entry.';
  t.status='Pending Verification';bgLog(t,t.status,'Submitted for verification.',A);fbNotifyVerifiers(t,A);return '';
}
function fbTxnVerify(id,o,A){
  A=A||bgNow();o=o||{};
  const t=fbTxn(id);if(!t||t.entity!==bgEnt())return 'No such entry.';
  if(t.status!=='Pending Verification')return t.key+' is '+t.status+'; it cannot be verified again.';
  if(!bgPCan(A,'funding.transaction.verify'))return caN(A.who)+' cannot verify funding entries (funding.transaction.verify).';
  if(bgCfg(t.entity).fundingMakerChecker&&t.recordedBy===A.who)return 'Maker-checker: '+caN(A.who)+' recorded '+t.key+'; another authorized user verifies it.';
  const ev=o.evidence||t.evidence;
  if(bgCfg(t.entity).fundingEvidence&&!ev&&t.origin.type==='manual'&&!t.illustrative)return 'Attach the evidence before verifying.';
  if(t.ref&&fbRefUsed(t.ref,t.id))return 'Reference '+t.ref+' is already recorded on another entry.';
  t.status=t.illustrative?'Verified – Illustrative':'Verified';t.evidence=ev;t.verifiedBy=A.who;t.verifiedAt=bgStamp(A);
  if(t.reversalOf){const o2=fbTxn(t.reversalOf);if(o2){o2.status='Reversed';o2.reversedBy=t.key;bgLog(o2,'Reversed','Reversed by '+t.key+' (verified by '+caN(A.who)+').',A);}}
  bgLog(t,t.status,'Verified by '+caN(A.who)+(t.illustrative?'. Illustrative: not part of the recorded balance':'')+'. Recorded balance of '+fbSource(t.sourceId).key+' is now '+expMoney(fbBalance(fbSource(t.sourceId)),t.currency)+' (internal).',A);
  const s=fbSource(t.sourceId);caNotify([s.ownerUid],t.key+' verified on '+s.key+' ('+expMoney(t.amount,t.currency)+')',null);
  return '';
}
function fbTxnReject(id,reason,A){
  A=A||bgNow();const t=fbTxn(id);if(!t||t.entity!==bgEnt())return 'No such entry.';
  if(t.status!=='Pending Verification')return 'Only an entry pending verification is rejected.';
  if(!bgPCan(A,'funding.transaction.verify'))return caN(A.who)+' cannot verify funding entries.';
  reason=String(reason||'').trim();if(!reason)return 'Give the reason.';
  t.status='Rejected';t.rejectReason=reason;bgLog(t,'Rejected','Rejected by '+caN(A.who)+': '+reason+' It never entered the balance.',A);return '';
}
/* A correction: a reversal entry for a verified manual entry (system entries are reversed through their payment). */
function fbTxnReverse(id,reason,A){
  A=A||bgNow();const t=fbTxn(id);if(!t||t.entity!==bgEnt())return {error:'No such entry.'};
  if(!bgPCan(A,'funding.transaction.reverse'))return {error:caN(A.who)+' cannot reverse funding entries (funding.transaction.reverse).'};
  if(t.status!=='Verified'||t.reversalOf)return {error:'Only a verified entry is reversed.'};
  if(t.origin.type!=='manual')return {error:t.key+' comes from '+t.origin.key+'; it is reversed through that payment record.'};
  if(fbTxns.some(function(x){return x.reversalOf===t.id&&['Rejected','Failed'].indexOf(x.status)<0;}))return {error:'A reversal of '+t.key+' is already recorded.'};
  reason=String(reason||'').trim();if(!reason)return {error:'Give the reason for the reversal.'};
  const r={id:fbTxnNext++,entity:t.entity,sourceId:t.sourceId,type:'Reversal',dir:-t.dir,amount:t.amount,currency:t.currency,date:wbToday(),ref:'',extRef:'',erpRef:'',desc:'Reversal of '+t.key+': '+reason,
    evidence:'',status:'Pending Verification',verification:'Manual',origin:{type:'manual',key:''},reversalOf:t.id,recordedBy:A.who,recordedAt:bgStamp(A),logs:[]};
  r.key='FT-'+(1000+r.id);fbTxns.push(r);
  bgLog(r,r.status,'Reversal of '+t.key+' recorded by '+caN(A.who)+': '+reason+'. It takes effect once verified.',A);
  bgLog(t,t.status,'Reversal '+r.key+' recorded (pending verification).',A);
  fbNotifyVerifiers(r,A);caNotify(caPermHolders('budget.audit.view'),t.key+' is being reversed ('+r.key+')',null);
  return {rec:r};
}
/* System entries from verified payments: posted once per payment event (origin key). */
function fbPostSystem(o,A){
  if(fbTxns.some(function(t){return t.origin&&t.origin.key===o.key;}))return null;
  const s=fbSource(o.sourceId);if(!s)return null;
  const before=fbBalance(s);
  const t={id:fbTxnNext++,entity:s.entity,sourceId:s.id,type:o.type,dir:o.dir,amount:bgM(o.amount),currency:s.currency,date:o.date||wbToday(),ref:o.ref||'',extRef:o.extRef||'',erpRef:'',
    desc:o.desc,evidence:o.evidence||'',status:o.status||'Verified',verification:'Manual',origin:{type:o.originType,key:o.key,recId:o.recId,recKey:o.recKey},reversalOf:o.reversalOf||null,
    recordedBy:A.who,recordedAt:bgStamp(A),verifiedBy:o.status==='Pending Verification'?'':A.who,verifiedAt:o.status==='Pending Verification'?'':bgStamp(A),logs:[]};
  t.key='FT-'+(1000+t.id);
  if(t.dir<0&&t.status==='Verified'&&before<t.amount-0.001){
    t.exception='Reconciliation exception: the recorded balance of '+s.key+' was '+expMoney(before,s.currency)+' before this verified payment of '+expMoney(t.amount,s.currency)+'. The payment is recorded as it happened; the source records may be incomplete.';
    caNotify(bgUniq([s.ownerUid].concat(caPermHolders('funding.transaction.verify'))),s.key+': reconciliation exception on '+o.recKey,null);
  }
  fbTxns.push(t);
  bgLog(t,t.status,o.desc+(t.exception?' '+t.exception:''),A);
  if(o.reversalOf){const x=fbTxn(o.reversalOf);if(x){x.status='Reversed';x.reversedBy=t.key;bgLog(x,'Reversed','Reversed by '+t.key+'.',A);}}
  return t;
}
/* At payout initiation: tracking on → a valid source; its balance rule applies. */
function fbPayoutCheck(sourceId,amount,currency,ent){
  ent=ent||bgEnt();
  if(!fbTrackingOn(ent))return {};
  const s=fbSource(sourceId);
  if(!s)return {error:'Funding-source tracking is on: pick the funding source this payment comes from.'};
  if(s.entity!==ent||s.status!=='Active')return {error:s.key+' is not an active funding source of this entity.'};
  const today=wbToday();if((s.effFrom&&today<s.effFrom)||(s.effTo&&today>s.effTo))return {error:s.key+' is outside its effective dates.'};
  if(s.currency!==currency)return {error:s.key+' is a '+s.currency+' source; this payment is in '+currency+'.'};
  const res=fbReserved(s),room=bgM(fbBalance(s)-fbInflight(s)-res);
  if(Number(amount)>room+0.001){
    const msg=s.key+' has '+expMoney(room,s.currency)+' of recorded funding (internal) after payments in progress'+(res?' and '+expMoney(res,s.currency)+' reserved for approved commitments':'')+'; this payment is '+expMoney(amount,currency)+'.';
    if(s.enforcement==='Blocking')return {error:msg+' The source is Blocking: record and verify funding first.'};
    if(s.enforcement==='Warning')return {warn:msg};
  }
  return {};
}
/* The source an advance's or imprest fund's money came from (latest verified, unreversed instruction). */
function fbHolderSource(h){
  const reqs=h.kind==='fund'?impRequests.filter(function(q){return q.fundId===h.id;}):[h];
  let src=null;
  reqs.forEach(function(r){(r.disb&&r.disb.instructions||[]).forEach(function(i){if(i.status==='Verified'&&i.sourceId)src=i.sourceId;});});
  return src;
}
/* Verified payouts with no funding entry: legacy disbursements, payroll settlements, manual payments made before tracking. */
function fbUnlinked(ent){
  ent=ent||bgEnt();const has=function(k){return fbTxns.some(function(t){return t.origin&&t.origin.key===k&&['Rejected','Failed'].indexOf(t.status)<0;});};
  const out=[];
  advancesData.concat(impRequests).forEach(function(r){if(r.entity!==ent)return;(r.disb&&r.disb.instructions||[]).forEach(function(i){
    if(i.status!=='Verified'||has(i.key))return;
    out.push({key:i.key,kind:r.kind==='imprest'?'Imprest '+r.requestType:'Advance disbursement',recKey:expKey(r),recId:r.id,amount:i.verify.amount,currency:r.currency,date:i.verify.date,payRef:i.verify.ref,route:i.method});});});
  expensesData.forEach(function(c){if(c.entity!==ent||!c.pay)return;let n=0;bgSettlements(c.pay).forEach(function(e){n++;const k=c.pay.key+'#S'+n;
    if(has(k))return;out.push({key:k,kind:'Reimbursement ('+(e.route||c.pay.route)+')',recKey:expKey(c),recId:c.id,amount:e.amount,currency:c.currency,date:e.payDate,payRef:e.ref,route:e.route||c.pay.route,payroll:(e.route||c.pay.route)==='Payroll'});});});
  return out;
}
/* Reconcile a verified payout to a source after the fact - a pending entry someone else verifies. */
function fbLinkPayout(key,sourceId,A){
  A=A||bgNow();
  if(!bgPCan(A,'funding.transaction.create'))return {error:caN(A.who)+' cannot record funding entries.'};
  const p=fbUnlinked().find(function(x){return x.key===key;});if(!p)return {error:'That payout is already linked or does not exist.'};
  const s=fbSource(sourceId);if(!s||s.entity!==bgEnt()||s.status!=='Active')return {error:'Pick an active funding source.'};
  if(s.currency!==p.currency)return {error:s.key+' is a '+s.currency+' source; the payout is in '+p.currency+'.'};
  const t=fbPostSystem({key:key,sourceId:s.id,type:'Outflow',dir:-1,amount:p.amount,date:p.date,ref:'',extRef:'',status:'Pending Verification',originType:'reconciliation',recKey:p.recKey,recId:p.recId,
    desc:'Reconciled payout '+key+' ('+p.kind+', '+p.recKey+', paid '+cdLabel(p.date)+', ref '+p.payRef+') to '+s.key+' by '+caN(A.who)+'. It debits the source once verified.'},A);
  if(t)fbNotifyVerifiers(t,A);
  return {rec:t};
}

/* ── Joining Builds 3-5 (their rules run unchanged) ───────────────────── */
function bgHook(name,before,after){
  const orig=window[name];if(typeof orig!=='function')return;
  window[name]=function(){
    const args=arguments;
    if(before){const b=before.apply(null,args);if(b!==undefined)return b;}
    const out=orig.apply(this,args);
    if(after){try{const rep=after.apply(null,[out].concat([].slice.call(args)));if(rep!==undefined)return rep;}catch(e){if(typeof console!=='undefined')console.error('Funding & Budgets hook '+name+':',e);}}
    return out;
  };
}
/* Advance requests carry the budget dimensions (Planned Sub Category, Cost Centre,
   Project) and the budget justification. Build 5's free-text Cost Center and Project are
   no longer asked on the form (10 Nov 2026); values typed before stay on the record. */
function bgAdvFields(d){
  const o={};
  if('plannedCategory' in d)o.plannedCategory=EXP_CATEGORIES.indexOf(d.plannedCategory)>=0?d.plannedCategory:'';
  if('costCentreId' in d)o.costCentreId=Number(d.costCentreId)||'';
  if('projectId' in d)o.projectId=Number(d.projectId)||'';
  if('bgJust' in d)o.bgJust=String(d.bgJust||'').trim();
  return o;
}
bgHook('advNewRecord',null,function(r,d){if(r&&d)Object.assign(r,bgAdvFields(d));});
bgHook('advUpdate',null,function(out,id,d){const r=advRec(id);if(out===''&&r&&d)Object.assign(r,bgAdvFields(d));});
/* Budget checks at submission, re-submission and administrative edits. */
bgHook('caPreflight',null,function(out,r){if(out&&!out.error&&caKind(r)==='expense'&&!bgPreControl(r)){const g=bgClaimCheck(r);if(g)return g;}});
bgHook('advPreflight',null,function(out,r){if(out&&!out.error&&!bgPreControl(r)){const g=r.kind==='imprest'?bgImprestCheck(r):bgAdvanceCheck(r);if(g)return g;}});
bgHook('caStart',null,function(out,r,pre,A,o){if(out===true&&!(o&&o.migrate)&&['expense','advance','imprest'].indexOf(caKind(r))>=0){bgCommitRecord(r,A||bgNow());bgSyncAll(A||bgNow());}});
['caResubmit','caAdminEditDone'].forEach(function(n){bgHook(n,null,function(out,x){const r=typeof x==='object'?x:caRec(x);
  if(out===''&&r&&['expense','advance','imprest'].indexOf(caKind(r))>=0&&['Awaiting Approval','Follow-Up'].indexOf(r.status)>=0&&!bgPreControl(r))bgCommitRecord(r,bgActorOf([].slice.call(arguments,1)),{resubmit:true});bgSyncAll(bgActorOf([].slice.call(arguments,1)));});});
bgHook('expSaveLine',null,function(){const r=expRec(expSelectedId);if(r)bgReevaluateExceptions(r,'expense',bgNow());});
bgHook('expSaveEdit',null,function(){const r=expRec(expSelectedId);if(r)bgReevaluateExceptions(r,'expense',bgNow());});
bgHook('advUpdate',null,function(out,id,d,A){if(out==='')bgReevaluateExceptions(advRec(id),'advance',A||bgNow());});
['caDecide','caWithdraw','advDisbFail','advCancelAuth','advClose','advUpdate','expSaveLine','expSaveEdit','caAssignWorkflow','advSubmit','impReplenishCreate']
  .forEach(function(n){bgHook(n,null,function(){bgSyncAll(bgActorOf([].slice.call(arguments,1)));});});
/* Funding sources on Build 5 disbursements, returns and recoveries. */
bgHook('advDisbInitiate',function(id,o,A){
  const r=advEngineRec(id);if(!r||!o||!fbTrackingOn(r.entity))return undefined;
  if(!advPCan(A||bgNow(),'advance.disbursement.manage'))return undefined;   // Build 5 gives its own answer
  const c=fbPayoutCheck(o.sourceId,parseFloat(o.amount)||0,r.currency,r.entity);
  if(c.error)return c.error;
  r._fbWarn=c.warn||'';return undefined;
},function(out,id,o,A){
  const r=advEngineRec(id);if(out!==''||!r)return;
  if(o&&o.sourceId&&fbTrackingOn(r.entity)){const i=r.disb.instructions[r.disb.instructions.length-1];i.sourceId=Number(o.sourceId);
    advLog(r,r.status,'Funding source for '+i.key+': '+fbSource(i.sourceId).key+' '+fbSource(i.sourceId).name+'.',A||bgNow());
    if(r._fbWarn){const fs=fbSource(i.sourceId);bgLog(fs,fs.status,'Payout '+i.key+' of '+expKey(r)+' initiated above the recorded funding (Warning rule): '+r._fbWarn,A||bgNow());}}
  r._fbWarn='';bgSyncAll(A||bgNow());
});
bgHook('advDisbVerify',null,function(out,id,key,o,A){
  A=A||bgNow();const r=advEngineRec(id);
  if(out===''&&r){const i=r.disb.instructions.find(function(x){return x.key===key;});
    if(i&&i.sourceId&&!(i.verify&&i.verify.illustrative))fbPostSystem({key:i.key,sourceId:i.sourceId,type:'Outflow',dir:-1,amount:i.verify.amount,date:i.verify.date,ref:i.verify.ref,extRef:i.verify.extRef,originType:'disbursement',recKey:expKey(r),recId:r.id,
      desc:(r.kind==='imprest'?'Imprest '+r.requestType:'Advance disbursement')+' '+i.key+' of '+expKey(r)+' verified by '+caN(i.verify.by)+' (ref '+i.verify.ref+').'},A);}
  bgSyncAll(A);
});
bgHook('advDisbReverse',null,function(out,id,key,reason,A){
  A=A||bgNow();const r=advEngineRec(id);
  if(out===''&&r){const i=r.disb.instructions.find(function(x){return x.key===key;}),orig=fbTxns.find(function(t){return t.origin&&t.origin.key===key;});
    if(i&&orig)fbPostSystem({key:key+'#REV',sourceId:orig.sourceId,type:'Reversal',dir:1,amount:i.reversed.amount,date:wbToday(),ref:'',originType:'disbursement reversal',recKey:expKey(r),recId:r.id,reversalOf:orig.id,
      desc:'Disbursement '+key+' reversed by '+caN(A.who)+': '+i.reversed.reason+' (the debit on the source is reversed).'},A);}
  bgSyncAll(A);
});
bgHook('advRrVerify',null,function(out,hid,key,o,A){
  A=A||bgNow();const h=advHolder(hid);
  if(out===''&&h){const x=(h.returns||[]).find(function(y){return y.key===key;}),src=fbHolderSource(h);
    if(x&&src)fbPostSystem({key:x.key,sourceId:src,type:'Inflow (Return)',dir:1,amount:x.amount,date:x.date,ref:x.ref,extRef:x.extRef,originType:'return',recKey:expKey(h),recId:h.id,
      desc:'Verified return '+x.key+' on '+expKey(h)+' credited back ('+x.ref+').'},A);}
  bgSyncAll(A);
});
bgHook('advRrReverse',null,function(out,hid,key,reason,A){
  A=A||bgNow();const h=advHolder(hid),orig=fbTxns.find(function(t){return t.origin&&t.origin.key===key;});
  if(out===''&&h&&orig)fbPostSystem({key:key+'#REV',sourceId:orig.sourceId,type:'Reversal',dir:-1,amount:orig.amount,date:wbToday(),originType:'return reversal',recKey:expKey(h),recId:h.id,reversalOf:orig.id,
    desc:'Return '+key+' reversed: '+String(reason||'')+'.'},A);
  bgSyncAll(A);
});
bgHook('advRecoveryCollect',null,function(out,hid,key,o,A){
  A=A||bgNow();const h=advHolder(hid);
  if(out===''&&h){const x=advRecFind(h,key),c=x&&x.collections[x.collections.length-1],src=fbHolderSource(h);
    if(c&&src)fbPostSystem({key:x.key+'#C'+x.collections.length,sourceId:src,type:'Inflow (Recovery)',dir:1,amount:c.amount,date:c.date,ref:c.ref,extRef:c.extRef,originType:'recovery',recKey:expKey(h),recId:h.id,
      desc:'Verified recovery collection on '+x.key+' ('+expKey(h)+') credited back ('+c.ref+').'},A);}
  bgSyncAll(A);
});
bgHook('advRecoveryReverse',null,function(out,hid,key,reason,A){
  A=A||bgNow();const h=advHolder(hid);
  if(out===''&&h){const x=advRecFind(h,key);if(x){x.collections.forEach(function(c,i){if(!c.reversed)return;const k=x.key+'#C'+(i+1),orig=fbTxns.find(function(t){return t.origin&&t.origin.key===k;});
    if(orig)fbPostSystem({key:k+'#REV',sourceId:orig.sourceId,type:'Reversal',dir:-1,amount:orig.amount,date:wbToday(),originType:'recovery reversal',recKey:expKey(h),recId:h.id,reversalOf:orig.id,desc:'Recovery collection '+k+' reversed: '+c.reversed.reason+'.'},A);});}}
  bgSyncAll(A);
});
/* Build 4: the manual route names the source; the verified settlement debits it once. Payroll never does. */
bgHook('caPaySetRoute',function(id,route,ref,A,sourceId){
  const r=caRec(id);if(!r||route==='Payroll'||!fbTrackingOn(r.entity))return undefined;
  const c=fbPayoutCheck(sourceId,caOutstanding(r),r.currency,r.entity);
  if(c.error)return c.error;r._fbWarn=c.warn||'';return undefined;
},function(out,id,route,ref,A,sourceId){
  const r=caRec(id);if(out!==''||!r)return;
  if(route!=='Payroll'&&sourceId&&fbTrackingOn(r.entity)){r.pay.sourceId=Number(sourceId);caLog(r,r.status,'Funding source for '+r.pay.key+': '+fbSource(sourceId).key+'.',A||bgNow());
    if(r._fbWarn){const fs=fbSource(sourceId);bgLog(fs,fs.status,'Payout '+r.pay.key+' of '+expKey(r)+' routed above the recorded funding (Warning rule): '+r._fbWarn,A||bgNow());}}
  r._fbWarn='';
});
/* Build 4 keeps payment events newest first; settlements are numbered oldest first so a key never moves. */
function bgSettlements(p){return (p&&p.events||[]).slice().reverse().filter(function(e){return e.type==='Settlement';});}
function bgPostSettlement(r,A){
  const p=r.pay;if(!p||!p.sourceId)return;
  let n=0;bgSettlements(p).forEach(function(e){n++;
    if((e.route||p.route)==='Payroll'||e.illustrative)return;   // D9: an illustrative payment never posts
    fbPostSystem({key:p.key+'#S'+n,sourceId:p.sourceId,type:'Outflow',dir:-1,amount:e.amount,date:e.payDate,ref:e.ref,originType:'reimbursement',recKey:expKey(r),recId:r.id,
      desc:'Reimbursement '+p.key+' of '+expKey(r)+' paid '+cdLabel(e.payDate)+' (ref '+e.ref+').'},A);});
}
bgHook('caPaySettle',null,function(out,id,o,A){if(out==='')bgPostSettlement(caRec(id),A||bgNow());});
bgHook('caPayVerify',function(id,o,A){
  const r=caRec(id);if(!r||!o||o.state!=='paid'||o.route==='Payroll'||!fbTrackingOn(r.entity))return undefined;
  const c=fbPayoutCheck(o.sourceId,parseFloat(o.amount)||0,r.currency,r.entity);if(c.error)return c.error;return undefined;
},function(out,id,o,A){const r=caRec(id);if(out===''&&r&&o&&o.state==='paid'&&o.route!=='Payroll'&&o.sourceId&&fbTrackingOn(r.entity)){r.pay.sourceId=Number(o.sourceId);bgPostSettlement(r,A||bgNow());}});
/* The Budget Justification field on the replenishment popup and the imprest fund form: shown while Budget Control
   applies, required only when the budget check gives a Warning. It shows no budget figures. */
function bgImpJustFieldHTML(h,a,prefix){
  if(!bgControlActive((h&&h.entity)||bgEnt()))return '';
  return '<div class="ep-form-group ep-form-full"><label class="ep-form-label">Budget Justification</label><textarea class="ep-form-input ax-notes" id="'+(prefix||'adva')+'-bgjust" placeholder="Required if the budget check gives a Warning">'+sbEsc(a&&a.bgJust||'')+'</textarea>'
    +'<div class="ea-hint">Required only when the request is above the budget available (Warning).</div></div>';
}
bgHook('advActSync',null,function(){if(typeof advAct!=='undefined'&&advAct&&advAct.kind==='replenish'){const el=document.getElementById('adva-bgjust');if(el)advAct.bgJust=el.value;}});
bgHook('impFormSync',null,function(){if(typeof impForm!=='undefined'&&impForm){const el=document.getElementById('impf-bgjust');if(el)impForm.bgJust=el.value;}});
bgHook('impNewRequest',null,function(q,f,type){
  if(!q)return;
  if(type==='Replenishment'&&typeof advAct!=='undefined'&&advAct&&advAct.kind==='replenish')q.bgJust=String(advAct.bgJust||'').trim();
  if(type==='Initial Funding'&&typeof impForm!=='undefined'&&impForm)q.bgJust=String(impForm.bgJust||'').trim();
});
/* Module Control: the module cannot be switched off while Budget Control enforces. */
if(typeof MC_MODULES!=='undefined'&&!MC_MODULES.some(function(m){return m.key==='budgets';}))
  MC_MODULES.push({key:'budgets',label:'Funding & Budgets',covers:'Funding & Budgets page, budget checks on claims and advances, corporate funding sources',active:true});
if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE.budgets='budgets';
bgHook('mcToggle',function(key){
  if(key!=='budgets'||!emsCan('platform.module.control')||!mcOn('budgets'))return undefined;
  const c=bgCfg(),on=[c.control?'Budget Control':'',c.fundingTracking?'Funding-source tracking':''].filter(Boolean);
  if(on.length){
    renderADTPage();   // puts the switch back
    showToast('Turn '+on.join(' and ')+' off first','error',on.join(' and ')+(on.length>1?' are':' is')+' enforcing controls in '+idEntityName(bgEnt())
      +'. Switch '+(on.length>1?'them':'it')+' off in Funding & Budgets → Settings (with a reason, audited) before disabling the module. Records are kept either way.');
    return true;
  }
  return undefined;
});

/* ── Daily work: activation, expiry, scheduled revisions, alerts ─────── */
function bgTick(){
  const today=wbToday(),ent=bgEnt(),A=caAt('System',today,'08:00:00 AM'),cfg=bgCfg(ent);
  const finance=caPermHolders('budget.manage');
  bgBudgets.forEach(function(b){
    if(b.entity!==ent)return;
    if(b.status==='Scheduled'&&b.effFrom<=today)bgActivateNow(b,A,false);
    if(b.status==='Active'&&((b.effTo&&today>b.effTo)||today>b.fyEnd)){b.status='Expired';bgLog(b,'Expired','The effective period ended; recorded utilization is kept.',A);}
    if(b.status!=='Active')return;
    if(cfg.nearEndDays&&today>=wbAddDays(b.fyEnd,-cfg.nearEndDays)&&!b.nearEndNoted){b.nearEndNoted=today;caNotify(bgUniq([b.ownerUid].concat(finance)),expKey(b)+': '+b.fy+' ends '+cdLabel(b.fyEnd),b);}
    [null].concat(b.allocations.filter(function(a){return a.status==='Active';})).forEach(function(a){
      const fg=bgFigures(b,a?a.id:null),node=a||b,owner=(a&&a.ownerUid)||b.ownerUid,label=a?a.key:expKey(b),thr=Number(b.threshold)||0;
      if(thr&&fg.pct>=thr&&!node.thrNoted){node.thrNoted=today;bgLog(b,b.status,label+' reached '+fg.pct+'% of its budget (threshold '+thr+'%).',A);caNotify(bgUniq([owner].concat(finance)),label+' reached '+fg.pct+'% of budget (threshold '+thr+'%)',b);}
      if(fg.occupied>fg.approved+0.001&&!node.overNoted){node.overNoted=today;bgLog(b,b.status,label+' is over budget by '+expMoney(fg.occupied-fg.approved,b.currency)+'.',A);caNotify(bgUniq([owner].concat(finance)),label+' is over budget by '+expMoney(fg.occupied-fg.approved,b.currency),b);}
    });
  });
  bgChanges.forEach(function(r){if(r.entity===ent&&r.kind==='budget revision'&&r.status==='Approved'&&!r.appliedAt&&!r.applyError&&r.effDate<=today)bgApplyRevision(r,A);});
}

/* ── Seed: masters, routes, a budget approved through the engine, funding ── */
(function(){
  const sh=caU('shaun@testemp.com'),vk=caU('vikram.rao@opendhi.com'),pal=caU('pallavi@testemp.com'),pr=caU('prem.raj@maaserp.com');
  const at=function(uid,iso,t){return caAt(uid,iso,t||'10:00:00 AM');};
  caNotifSilent=true;
  /* Masters - Company Structure. */
  [['SAL-FLD','Sales Field Operations','Sales',pr],['HR-OPS','People Operations','HR',pal],['ENG-DLV','Engineering Delivery','Engineering',pr]].forEach(function(c){
    bgmSave('cc',{code:c[0],name:c[1],dept:c[2],ownerUid:c[3],effFrom:'2026-04-01'},at(sh,'2026-04-01'));});
  bgmSave('cc',{code:'MKT-OLD',name:'Legacy Marketing',dept:'Sales',effFrom:'2025-04-01'},at(sh,'2026-04-01'));bgmSetStatus('cc',4,'Inactive',at(sh,'2026-04-01'));
  bgmSave('project',{code:'RDS-FY27',name:'Client Roadshow FY27',dept:'Sales',ownerUid:pr,startDate:'2026-04-01',endDate:'2027-03-31'},at(sh,'2026-04-01'));
  bgmSave('project',{code:'HIRE-26',name:'Campus Hiring 2026',dept:'HR',ownerUid:pal,startDate:'2026-06-01',endDate:'2026-12-31'},at(sh,'2026-04-01'));
  bgmSave('project',{code:'ERP-25',name:'ERP Migration 2025',dept:'Finance',startDate:'2025-04-01',endDate:'2026-03-31'},at(sh,'2026-04-01'));bgmSetStatus('project',3,'Completed',at(sh,'2026-04-01'));
  /* Approval routes - the shared engine; Finance stages resolve through the Budget Approvers team. */
  const team=String(caSeedTeamId('Budget Approvers'));
  const wf=function(name,kind,desc,stages){const w=caWfSeed(caWfNext++,name,{kind:kind,desc:desc,createdAt:'01 Apr 2026 | 09:00:00 AM'},stages);caWorkflows.push(w);return w;};
  wf('Budget - owner\'s manager then Finance','Budget','Budgets: the budget owner\'s reporting manager, then an independent Finance budget approver.',
    [caStageDef(1,'Manager review','Reporting Manager','',{fallback:sh}),caStageDef(2,'Finance review','RBAC Team',team,{rule:'Any One',fallback:sh})]);
  wf('Budget revisions - Finance','Budget Revision','Revisions: an assigned independent Finance approver.',[caStageDef(1,'Finance review','RBAC Team',team,{rule:'Any One',fallback:sh})]);
  wf('Budget transfers - Finance','Budget Transfer','Transfers: an assigned independent Finance approver.',[caStageDef(1,'Finance review','RBAC Team',team,{rule:'Any One',fallback:sh})]);
  wf('Budget exceptions - owner then Finance','Budget Exception','Exceptions: the owner of the budget or allocation, then Finance.',
    [caStageDef(1,'Budget owner review','Budget Owner','',{fallback:sh}),caStageDef(2,'Finance review','RBAC Team',team,{rule:'Any One',fallback:sh})]);
  wf('Financial year close - Finance','Financial Year Close','Closing a financial year: an independent Finance budget approver.',[caStageDef(1,'Finance review','RBAC Team',team,{rule:'Any One',fallback:sh})]);
  /* FY 2026-27 corporate budget, prepared by Finance and approved through the engine. */
  const b=bgBudgetSave({name:'FY 2026-27 Corporate Expense Budget',fy:'FY 2026-27',budgetType:'Operating',ownerUid:vk,currency:bgBaseCurrency(ID_HOME_ENTITY)||'INR',amount:2000000,
    enforcement:'Warning',threshold:80,effFrom:'2026-04-01',desc:'Company-wide operating expense authority for the year.'},at(vk,'2026-04-01')).rec;
  const al=function(d){return bgAllocSave(b.id,d,at(vk,'2026-04-01')).rec;};
  const sales=al({dept:'Sales',amount:600000});
  al({dept:'Sales',category:'Travel Reimbursement',amount:400000,parentId:sales.id});
  al({dept:'HR',amount:200000,ownerUid:pal});
  al({dept:'Operations',amount:300000,ownerUid:pr});
  al({dept:'Engineering',amount:300000});
  al({dept:'Design',amount:50000});
  bgSubmit(b.id,at(vk,'2026-04-01','11:00:00 AM'));
  let g=0;while(b.wf&&b.wf.open&&g++<4){const st=caActiveStage(b);if(!st||!st.approvers.length)break;if(caDecide(b.id,{scope:'claim',decision:'Approve',comment:'Approved for FY 2026-27.'},at(st.approvers[0],'2026-04-02')))break;}
  /* A draft not yet submitted (another department's planning). */
  const d=bgBudgetSave({name:'FY 2026-27 Marketing Events Budget',fy:'FY 2026-27',budgetType:'Category',ownerUid:vk,currency:'INR',amount:250000,enforcement:'Blocking',threshold:90,
    effFrom:'2026-12-01',desc:'Events and sponsorships - under preparation.'},at(vk,'2026-11-02')).rec;
  bgAllocSave(d.id,{dept:'Product',category:'Office Events',amount:150000},at(vk,'2026-11-02'));
  /* HR asks to move reserve into its allocation - with Finance. */
  const hr=b.allocations.find(function(a){return a.dept==='HR'&&!a.category;});
  bgTransferCreate({budgetId:b.id,fromAllocId:'',toAllocId:hr.id,amount:50000,reason:'Campus hiring drive travel and venue costs.'},true,at(pal,'2026-11-04'));
  /* Funding sources and verified funding (maker: Finance; checker: someone else). */
  const s1=fbSourceSave({name:'Operations Current Account',type:'External Bank-Referenced',currency:'INR',bank:'HDFC Bank',maskedRef:'50200012344521',code:'OPS-BANK',ownerUid:vk,enforcement:'Warning',
    desc:'Main operating account; entries are recorded from bank advices.',effFrom:'2026-04-01'},at(sh,'2026-04-01')).rec;
  const s2=fbSourceSave({name:'Head Office Petty Cash',type:'Cash',currency:'INR',code:'HO-CASH',ownerUid:vk,enforcement:'Blocking',desc:'Cash held at the head office.',effFrom:'2026-04-01'},at(sh,'2026-04-01')).rec;
  const t1=fbTxnCreate({sourceId:s1.id,type:'Funding In',amount:500000,date:'2026-10-01',ref:'HDFC-TRF-20261001-01',desc:'Monthly operating funding transfer from the treasury account.',evidence:'treasury-advice-oct.pdf'},at(vk,'2026-10-01')).rec;
  fbTxnVerify(t1.id,{},at(sh,'2026-10-01','04:00:00 PM'));
  const t2=fbTxnCreate({sourceId:s2.id,type:'Funding In',amount:25000,date:'2026-10-03',ref:'CASH-WDL-1003',desc:'Cash withdrawn for head office petty cash.',evidence:'cash-withdrawal-slip.pdf'},at(vk,'2026-10-03')).rec;
  fbTxnVerify(t2.id,{},at(sh,'2026-10-03','04:00:00 PM'));
  caNotifSilent=false;
  bgSyncAll(at('System',wbToday(),'08:00:00 AM'));
})();
bgTick();
