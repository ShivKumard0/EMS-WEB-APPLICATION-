/* ══ CAPPING LIMIT · EXPENSE POLICIES & LIMITS (FR-EP) ══════════════════════
   Time & Pay → Expense Management → Capping Limit. The most an employee may
   claim in one expense category - per claim, per month, per quarter or per
   year - and what happens when a claim goes over: a Warning (justify and
   submit) or a Block (fix it first). Same listing kit, panel and + Add popup
   as Expenses; same precedence, versions and statuses as Wallet & Benefits.

   WHAT A POLICY IS. Category (+ optional sub category) × who it applies to
   (Category-Wide, Department, Position, Employee) × limit period × amount ×
   enforcement, with effective dates. An Employee-scoped policy is the
   exception mechanism: it beats every broader policy and carries a reason.

   PRECEDENCE: Employee > Position > Department > Category-Wide, per
   (sub category, period). The highest level decides; amounts never add. Two
   activated policies at the same level and scope whose dates overlap are a
   conflict and the second cannot be activated. Per Claim and period caps are
   different dimensions and are all evaluated.

   UTILIZATION (period caps): by line item, on the line's start date.
   Approved / Reimbursed lines are consumed, Awaiting Approval / Follow-Up are
   reserved, Draft and Rejected count nothing. A line whose dates span two
   periods is refused ("split it"). Currency is converted through the entity's
   effective-dated exchange rates; without a rate a Blocking policy blocks and
   a Warning policy asks for a justification.

   WHAT IT IS NOT. A Department cap is per employee, not a pooled budget. A
   cap is not a benefit entitlement (Wallet & Benefits): the two are shown
   side by side on the claim form and never added. Within policy never means
   approved - the approver still decides. */

/* ── Reference data ────────────────────────────────────────────────────── */
const CAP_LEVELS=['Category-Wide','Department','Position','Employee'];
const CAP_LEVEL_RANK={'Employee':4,'Position':3,'Department':2,'Category-Wide':1};
const CAP_PERIODS=['Per Claim','Monthly','Quarterly','Annual'];
const CAP_BASIS=['Financial Year (Apr–Mar)','Calendar Year (Jan–Dec)'];
const CAP_ENFORCE=['Warning','Blocking'];
const CAP_TILES=['Active','Scheduled','Draft','Inactive','Expired'];
const CAP_MOVES={'Draft':['Active','Inactive'],'Active':['Inactive'],'Inactive':['Active']};
const CAP_MOVE_LABELS={'Active':'Activate','Inactive':'Deactivate'};
const CAP_LEVEL_HINT={
  'Category-Wide':'Every eligible employee in the entity.',
  'Department':'Every employee in the department.',
  'Position':'Every employee with the position.',
  'Employee':'One employee - an exception to the broader policies. Needs a reason.'
};
function capDepts(){return typeof csDeptNames==='function'?csDeptNames():(typeof AX_DEPTS!=='undefined'?AX_DEPTS:[]);}
function capPositions(){return typeof csDesigNames==='function'?csDesigNames():(typeof EA_DESIGNATIONS!=='undefined'?EA_DESIGNATIONS:[]);}
function capCategories(){return typeof EXP_CATEGORIES!=='undefined'?EXP_CATEGORIES:[];}
function capSubCats(c){return typeof EXP_SUBCATS!=='undefined'?(EXP_SUBCATS[c]||[]):[];}
function capCurrencies(){return typeof EXP_CURRENCIES!=='undefined'?EXP_CURRENCIES:['INR','USD','EUR','GBP','AED'];}
/* The entity's people, by Employee ID (labels via expPersonLabel). */
function capPeople(){return typeof expPeople==='function'?expPeople().map(function(p){return p.eid;}):[];}
function capActorId(){return typeof idMe==='function'?idMe():'';}
function capCan(code){return typeof emsCan==='function'&&emsCan(code);}
/* Company Settings → Exchange Rates (Opendhi). */
function epCsTabs(){return capCan('expense.fx.manage')&&(typeof mcOn!=='function'||mcOn('expenses'))?[{id:'exchange-rates',label:'Exchange Rates'}]:[];}
function capDeny(what){showToast('Not permitted','error',(typeof emsRole==='function'?emsRole():'This role')+' cannot '+what+'.');return false;}
function capActor(){return typeof wbActor==='function'?wbActor():CURRENT_USER;}

/* ── Exchange rates (Company Settings → Exchange Rates, Opendhi) ───────── */
const epRates=[
  {id:1,from:'USD',to:'INR',rate:83.40,effFrom:'2026-04-01',by:'Shaun Mathew'},
  {id:2,from:'GBP',to:'INR',rate:105.20,effFrom:'2026-04-01',by:'Shaun Mathew'},
  {id:3,from:'EUR',to:'INR',rate:90.10,effFrom:'2026-04-01',by:'Shaun Mathew'},
  {id:4,from:'AED',to:'INR',rate:22.70,effFrom:'2026-04-01',by:'Shaun Mathew'}
];
let epRateNext=5,epRateForm=null;
const epRateLogs=[];
/* The rate in force on a date; the inverse of a stored pair counts too. */
function epRate(from,to,iso){
  if(from===to)return {rate:1,date:iso,id:null};
  const pick=function(a,b){
    const rs=epRates.filter(function(r){return r.from===a&&r.to===b&&r.effFrom<=iso;}).sort(function(x,y){return x.effFrom<y.effFrom?1:-1;});
    return rs[0]||null;
  };
  const d=pick(from,to);if(d)return {rate:d.rate,date:d.effFrom,id:d.id};
  const i=pick(to,from);if(i)return {rate:1/i.rate,date:i.effFrom,id:i.id,inverse:true};
  return null;
}
function epConvert(amount,from,to,iso){const r=epRate(from,to,iso);return r?{amount:amount*r.rate,rate:r.rate,date:r.date}:null;}
function epRateOpen(id){if(!capCan('expense.fx.manage')){capDeny('maintain exchange rates');return;}const r=id!=null?epRates.find(function(x){return x.id===id;}):null;epRateForm=r?{id:r.id,from:r.from,to:r.to,rate:String(r.rate),effFrom:r.effFrom}:{id:null,from:'',to:'INR',rate:'',effFrom:wbToday()};refreshCsSidebar();}
function epRateClose(){epRateForm=null;refreshCsSidebar();}
function epRateSave(){
  const f=epRateForm;if(!f)return;
  f.from=getCSValue('epr-from');f.to=getCSValue('epr-to');f.rate=(document.getElementById('epr-rate')||{}).value||'';f.effFrom=(document.getElementById('epr-eff')||{}).value||'';
  if(!f.from||!f.to){showToast('Currency pair is required','error');return;}
  if(f.from===f.to){showToast('From and To must differ','error');return;}
  const n=parseFloat(f.rate);if(!(n>0)){showToast('Rate must be more than 0','error');return;}
  if(!f.effFrom){showToast('Effective From is required','error');return;}
  const dup=epRates.find(function(x){return x.id!==f.id&&x.from===f.from&&x.to===f.to&&x.effFrom===f.effFrom;});
  if(dup){showToast('A rate already exists for this pair and date','error');return;}
  const s=stampNow();
  if(f.id!=null){const r=epRates.find(function(x){return x.id===f.id;});const was=r.rate;Object.assign(r,{from:f.from,to:f.to,rate:n,effFrom:f.effFrom,by:capActor(),byId:capActorId()});
    epRateLogs.unshift({date:s.date,time:s.time,user:capActor(),userId:capActorId(),status:'Updated',action:f.from+'→'+f.to+' from '+cdLabel(f.effFrom)+': '+was+' → '+n+'.'});}
  else{epRates.unshift({id:epRateNext++,from:f.from,to:f.to,rate:n,effFrom:f.effFrom,by:capActor(),byId:capActorId()});
    epRateLogs.unshift({date:s.date,time:s.time,user:capActor(),userId:capActorId(),status:'Added',action:f.from+'→'+f.to+' = '+n+' from '+cdLabel(f.effFrom)+'.'});}
  epRateForm=null;refreshCsSidebar();showToast('Exchange rate saved','success',f.from+'→'+f.to+' = '+n+' from '+cdLabel(f.effFrom)+'.');
}
function epRatesTabHTML(){
  if(!capCan('expense.fx.manage'))return '<div class="wb-empty-sm">Exchange rates are maintained by Opendhi.</div>';
  const curs=capCurrencies();
  const form=epRateForm?'<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+(epRateForm.id!=null?'Edit':'Add')+' Exchange Rate</span></div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">From <span class="req">*</span></label>'+apCS('epr-from',curs,epRateForm.from,'Select')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">To <span class="req">*</span></label>'+apCS('epr-to',curs,epRateForm.to,'Select')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Rate (1 From = ? To) <span class="req">*</span></label><input class="ep-form-input" id="epr-rate" type="number" min="0" step="0.0001" value="'+attrSafe(epRateForm.rate)+'"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Effective From <span class="req">*</span></label>'+apCD('epr-eff',epRateForm.effFrom,'Select date')+'</div>'
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="epRateClose()">Cancel</button><button class="ep-save-btn" onclick="epRateSave()">Save</button></div></div>'
    :'<div class="att-bar csag-bar"><div class="att-bar-actions"><button class="att-link" onclick="epRateOpen()">'+AX_ICO.plus+'Add Rate</button></div></div>';
  const rows=epRates.slice().sort(function(a,b){return (a.from+a.to+a.effFrom)<(b.from+b.to+b.effFrom)?-1:1;}).map(function(r,i){
    return '<tr'+(epRateForm&&epRateForm.id===r.id?' class="csr-editing"':'')+'><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td"><div class="lp-c-main">'+r.from+' → '+r.to+'</div></td>'
      +'<td class="csag-td">'+r.rate+'</td><td class="csag-td">'+cdLabel(r.effFrom)+'</td><td class="csag-td">'+sbEsc(r.by||'')+'</td>'
      +'<td class="csag-td csag-act"><button class="att-row-btn" title="Edit" onclick="epRateOpen('+r.id+')">'+SB_PEN+'</button></td></tr>';
  }).join('');
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Exchange Rates</span></div>'
    +'<div class="wb-note">Used when a claim\'s currency differs from a policy\'s.</div>'
    +form+'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Pair</th><th>Rate</th><th>Effective From</th><th>By</th><th class="csag-act">Action</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    ;   // its change log: Company Settings → Activity & Audit → Logs
}

/* ── Policies: the records ─────────────────────────────────────────────── */
function capV(v,amount,period,enforcement,from,to,extra){return Object.assign({v:v,amount:amount,period:period,basis:period==='Quarterly'||period==='Annual'?CAP_BASIS[0]:'',enforcement:enforcement,effFrom:from,effTo:to||''},extra||{});}
function capSeed(id,key,name,level,category,dept,position,employee,currency,amount,status,by,at,desc,o){
  o=o||{};
  const from=o.effFrom||(function(){const m=String(at).match(/^(\d{1,2}) (\w{3}) (\d{4})/);return m?m[3]+'-'+String(WB_MON.indexOf(m[2])+1).padStart(2,'0')+'-'+m[1].padStart(2,'0'):wbToday();})();
  const r={id:id,key:key,entity:o.entity||ID_HOME_ENTITY,name:name,level:level==='Category'?'Category-Wide':level,category:category,subCat:o.subCat||'',dept:dept||'',position:position||'',employee:employee||'',
    currency:currency,status:status,createdBy:by,createdAt:at,desc:desc||'',reason:o.reason||'',
    versions:o.versions||[capV(1,amount,o.period||'Per Claim',o.enforcement||'Warning',from,o.effTo||'')]};
  if(status!=='Draft')r.activatedOn=from;
  capSyncDates(r);return r;
}
function capSyncDates(r){r.effFrom=r.versions[0].effFrom;r.effTo=r.versions[r.versions.length-1].effTo;r.amount=capCurV(r).amount;}
/* The ten limits the module shipped with, migrated as Per Claim + Warning
   (what they did), plus period and blocking examples. */
const cappingData=[
  capSeed(1,20,'Engineering - team outing','Department','Team Outing','Engineering','','','INR',150000,'Active','Tarak Swain','12 Mar 2026 | 11:20:05 AM','TEAM OUTING'),
  capSeed(2,19,'Finance - travel','Department','Travel Reimbursement','Finance','','','INR',100000,'Active','Tarak Swain','10 Mar 2026 | 04:02:41 PM',''),
  capSeed(3,18,'Sales - local travel','Department','Travel Reimbursement','Sales','','','INR',5000,'Active','Tarak Swain','2 Mar 2026 | 10:15:30 AM','Local travel for field sales.'),
  capSeed(4,17,'HR - accommodation','Department','Accommodation','HR','','','INR',10000,'Active','Tarak Swain','24 Feb 2026 | 12:40:00 PM',''),
  capSeed(5,16,'Operations - stationery','Department','Office Stationery','Operations','','','INR',50000,'Active','Tarak Swain','20 Feb 2026 | 09:55:12 AM',''),
  capSeed(6,15,'Admin - meal allowance','Department','Meal Allowance','Admin','','','INR',2000,'Active','Tarak Swain','18 Feb 2026 | 03:11:48 PM',''),
  capSeed(7,14,'Asst Bearer Meal','Position','Meal Allowance','','Support Specialist','','INR',2500,'Active','Syed Ayaz','5 Feb 2026 | 01:05:00 PM','Daily meal allowance on shift.'),
  capSeed(8,13,'House keeping Travelling','Department','Fuel Reimbursement','Operations','','','INR',2000,'Active','Syed Ayaz','28 Jan 2026 | 10:30:00 AM',''),
  capSeed(9,12,'Client meal - global','Category','Meal Allowance','','','','USD',150,'Inactive','Meera Iyer','14 Jan 2026 | 05:45:20 PM','Replaced by department-level meal limits.'),
  capSeed(10,11,'Senior developer fuel','Position','Fuel Reimbursement','Engineering','Senior Developer','','INR',3000,'Active','Meera Iyer','8 Jan 2026 | 11:00:00 AM','Monthly fuel for client visits.'),
  capSeed(11,21,'Meal - monthly cap','Category','Meal Allowance','','','','INR',3000,'Active','Pallavi Parate','1 Apr 2026 | 10:00:00 AM','Every employee: meals up to 3,000 a month; over that, justify.',{period:'Monthly',enforcement:'Warning',effFrom:'2026-04-01'}),
  capSeed(12,22,'Accommodation per stay','Category','Accommodation','','','','INR',10000,'Active','Pallavi Parate','1 Apr 2026 | 10:05:00 AM','Hard limit per claim for hotel stays.',{period:'Per Claim',enforcement:'Blocking',effFrom:'2026-04-01'}),
  capSeed(13,23,'Telephone - monthly cap','Category','Telephone & Internet','','','','INR',1000,'Active','Pallavi Parate','1 Apr 2026 | 10:10:00 AM','Monthly phone and broadband claim cap.',{period:'Monthly',enforcement:'Blocking',effFrom:'2026-04-01'}),
  capSeed(14,24,'Travel - annual cap','Category','Travel Reimbursement','','','','INR',50000,'Active','Pallavi Parate','1 Apr 2026 | 10:15:00 AM','Yearly travel claim ceiling.',{period:'Annual',enforcement:'Warning',effFrom:'2026-04-01'}),
  capSeed(15,25,'Meera - meal exception','Employee','Meal Allowance','','','Meera Iyer','INR',5000,'Active','Pallavi Parate','1 Nov 2026 | 09:30:00 AM','Client dinners during the design review season.',{period:'Monthly',enforcement:'Warning',effFrom:'2026-11-01',effTo:'2026-12-31',reason:'Client dinners for the Q3 design reviews, approved by the Design head.'})
];
let capNextId=16,capNextKey=26;
/* Policies belong to an entity (Entity ID) and an Employee policy names its
   employee by Employee ID (js/identity.js). The shipped policies were written
   with names: matched once, inside their entity, only when one employee has
   the name - otherwise left empty and listed for review. */
cappingData.forEach(function(r){
  r.entity=idEntityRef(r.entity)||ID_HOME_ENTITY;
  if(r.employee!=null){
    const e=r.employee?idEmpByName(r.employee,r.entity):null;
    r.employeeEid=e?e.eid:'';
    if(r.employee&&!e)idNote('Capping limit','CAP-'+r.key,r.employee,'No single employee in '+idEntityName(r.entity)+' has this name; the policy is not restricted to anyone until it is edited.','',r.entity);
    delete r.employee;
  }
  if(r.createdBy&&!r.createdById)r.createdById=idUserByName(r.createdBy,r.entity);
});

/* ── Derived values ────────────────────────────────────────────────────── */
function capRec(id){return cappingData.find(function(x){return x.id===id;})||null;}
function capKey(r){return 'CAP-'+r.key;}
function capCurV(r){const t=wbToday();return r.versions.find(function(v){return wbInRange(t,v.effFrom,v.effTo);})||r.versions.find(function(v){return v.effFrom>t;})||r.versions[r.versions.length-1];}
function capMoney(r,v){v=v||capCurV(r);return (Number(v.amount)||0).toLocaleString('en-IN',{maximumFractionDigits:2})+' '+r.currency;}
function capShown(r){
  if(r.status!=='Active')return r.status;
  const t=wbToday();
  if(r.effFrom&&t<r.effFrom)return 'Scheduled';
  if(r.effTo&&t>r.effTo)return 'Expired';
  return 'Active';
}
/* Only an activated policy is evaluated; Scheduled and Expired are dated
   views of Active and the version dates settle whether it applies today. */
function capInForce(r){return r.status==='Active'&&!!r.activatedOn;}
function capTarget(r){
  if(r.level==='Employee')return idEmpName(r.employeeEid);
  if(r.level==='Department')return r.dept;
  if(r.level==='Position')return r.position+(r.dept?' · '+r.dept:'');
  return 'Everyone';
}
function capPeriodText(v){return v.period+(v.period==='Quarterly'||v.period==='Annual'?' · '+(v.basis||CAP_BASIS[0]):'');}
function capRank(r){return r.employeeEid?4:CAP_LEVEL_RANK[r.level]||1;}

/* ── Periods ───────────────────────────────────────────────────────────── */
/* The bucket a date falls in for a version's period: {key,label,from,to}. */
function capBucket(v,iso){
  const y=Number(iso.slice(0,4)),m=Number(iso.slice(5,7));
  const pad=function(n){return String(n).padStart(2,'0');};
  const last=function(yy,mm){return new Date(yy,mm,0).getDate();};
  if(v.period==='Monthly')return {key:iso.slice(0,7),label:WB_MON[m-1]+' '+y,from:iso.slice(0,7)+'-01',to:iso.slice(0,7)+'-'+pad(last(y,m))};
  const fy=/^Calendar/.test(v.basis||'')?false:true;
  if(v.period==='Annual'){
    if(fy){const sy=m>=4?y:y-1;return {key:'FY'+sy,label:wbFYLabel(sy),from:sy+'-04-01',to:(sy+1)+'-03-31'};}
    return {key:'CY'+y,label:'Year '+y,from:y+'-01-01',to:y+'-12-31'};
  }
  if(v.period==='Quarterly'){
    const start=fy?4:1;const idx=Math.floor((((m-start)+12)%12)/3);
    const sm=((start-1+idx*3)%12)+1;const sy=fy&&m<4?y-1:y;const yy=sy+(fy&&sm<4?1:0);
    const em=((sm+2-1)%12)+1;const ey=yy+(em<sm?1:0);
    return {key:(fy?'FY'+sy:'CY'+y)+'-Q'+(idx+1),label:'Q'+(idx+1)+' '+(fy?wbFYLabel(sy):y),from:yy+'-'+pad(sm)+'-01',to:ey+'-'+pad(em)+'-'+pad(last(ey,em))};
  }
  return null;
}

/* ── Which policies apply ──────────────────────────────────────────────── */
function capScopeHit(r,person){
  if(!person)return r.level==='Category-Wide'&&!r.employeeEid;
  if(r.employeeEid&&r.employeeEid!==person.eid)return false;
  if(r.level==='Employee')return r.employeeEid===person.eid;
  if(r.level==='Position')return r.position===(person.position||'')&&(!r.dept||r.dept===(person.dept||''));
  if(r.level==='Department')return r.dept===(person.dept||'');
  return true;
}
/* Activated policies on a category whose current-or-dated version covers iso,
   matching the person; grouped by (subCat|period) and resolved by rank. */
function capApplicable(category,person,iso){
  const groups={};
  cappingData.forEach(function(r){
    if(r.entity!==idEntity()||!capInForce(r)||r.category!==category||!capScopeHit(r,person))return;
    const v=r.versions.find(function(x){return wbInRange(iso,x.effFrom,x.effTo)&&(!x.effTo||x.effFrom<=x.effTo);});
    if(!v)return;
    const k=(r.subCat||'*')+'|'+v.period+'|'+(v.basis||'');
    (groups[k]=groups[k]||[]).push({r:r,v:v,rank:capRank(r)});
  });
  const out=[];
  Object.keys(groups).forEach(function(k){
    const g=groups[k].sort(function(a,b){return b.rank-a.rank;});
    const top=g.filter(function(x){return x.rank===g[0].rank;});
    out.push({r:top[0].r,v:top[0].v,conflict:top.length>1?top.map(function(x){return x.r;}):null,beaten:g.slice(top.length).map(function(x){return x.r;})});
  });
  return out;
}
/* Back-compat for the old hint: the tightest per-claim policy on a category. */
function capFor(category,eid){
  const person=typeof expPerson==='function'?expPerson(eid):null;
  const hits=capApplicable(category,person,wbToday()).filter(function(h){return h.v.period==='Per Claim'&&!h.r.subCat;});
  return hits.length?hits[0].r:null;
}

/* ── Utilization ───────────────────────────────────────────────────────── */
/* What a line counts as, from the claim and line statuses. */
function capWeight(claim,line){
  if(claim.status==='Draft'||claim.status==='Rejected'||claim.status==='Withdrawn')return null;
  if(line.status==='Rejected')return null;
  if(['Approved','Partially Approved','Reimbursed'].indexOf(claim.status)>=0)return 'consumed';
  return 'reserved';   // Awaiting Approval, Follow-Up
}
/* The amount a line counts for: what is currently permitted (an approver's
   reduction releases the rest), the final approved amount once decided. */
function capLineAmount(line){return line.approved!=null?Number(line.approved):(parseFloat(line.amount)||0);}
function capLineMatches(r,line){return !r.subCat||r.subCat===line.subCat;}
/* Consumed and reserved amounts in a bucket for one person and policy, in the
   policy currency, excluding one claim (the one being evaluated). */
function capUsage(r,v,person,bucket,exceptId){
  const out={consumed:0,reserved:0,unconverted:0};
  (typeof expensesData!=='undefined'?expensesData:[]).forEach(function(c){
    if(c.id===exceptId||c.employeeEid!==person.eid||c.category!==r.category)return;
    if(c.entity&&typeof caEntity==='function'&&c.entity!==caEntity())return;
    c.lines.forEach(function(l){
      if(!capLineMatches(r,l)||!l.start||l.start<bucket.from||l.start>bucket.to)return;
      const w=capWeight(c,l);if(!w)return;
      const cv=epConvert(capLineAmount(l),c.currency,r.currency,l.start);
      if(!cv){out.unconverted++;return;}
      out[w]+=cv.amount;
    });
  });
  return out;
}

/* ── Evaluate a claim ───────────────────────────────────────────────────────
   ctx={eid (claimant's Employee ID), name, category, currency, lines:[{amount,subCat,start,end,status}], claimId}
   Returns {results:[...], blocked:bool, needJust:[policyKeys], split:[lineTitles]}.
   Each result: {r,v,key,name,period,bucket,limit,consumed,reserved,proposed,
   available,exceeded,result:'Within Limit'|'Warning'|'Blocked'|'Not evaluated',
   enforcement,justify,conflict,fx}. */
function epEvaluate(ctx){
  const person=typeof expPerson==='function'?expPerson(ctx.eid):null;
  const lines=(ctx.lines||[]).filter(function(l){return parseFloat(l.amount)>0&&l.start;});
  const res=[],split=[];let blocked=false;
  if(!ctx.category||!lines.length)return {results:res,blocked:false,needJust:[],split:split};
  const dates={};lines.forEach(function(l){dates[l.start]=1;});
  const seen={};
  Object.keys(dates).sort().forEach(function(iso){
    capApplicable(ctx.category,person,iso).forEach(function(h){
      const r=h.r,v=h.v;
      const mine=lines.filter(function(l){return capLineMatches(r,l);});
      if(!mine.length)return;
      if(v.period==='Per Claim'){
        const k=r.id+'|claim';if(seen[k])return;seen[k]=1;
        let proposed=0,fxMiss=false,fx=null;
        mine.forEach(function(l){const cv=epConvert(parseFloat(l.amount),ctx.currency,r.currency,l.start);if(!cv)fxMiss=true;else{proposed+=cv.amount;fx=cv;}});
        res.push(capResult(r,v,h,{label:'This claim'},0,0,proposed,fxMiss,fx));
        return;
      }
      const b=capBucket(v,iso);if(!b)return;
      const k=r.id+'|'+b.key;if(seen[k])return;seen[k]=1;
      let proposed=0,fxMiss=false,fx=null;
      mine.forEach(function(l){
        if(l.start<b.from||l.start>b.to)return;
        const end=l.end||l.start;
        if(end>b.to){if(split.indexOf(l.title||'line')<0)split.push(l.title||'line');}
        const cv=epConvert(parseFloat(l.amount),ctx.currency,r.currency,l.start);if(!cv)fxMiss=true;else{proposed+=cv.amount;fx=cv;}
      });
      const u=capUsage(r,v,person||{eid:ctx.eid},b,ctx.claimId);
      res.push(capResult(r,v,h,b,u.consumed,u.reserved,proposed,fxMiss||u.unconverted>0,fx));
    });
  });
  res.forEach(function(x){if(x.result==='Blocked'||(x.result==='Not evaluated'&&x.enforcement==='Blocking'))blocked=true;});
  if(split.length)blocked=true;
  const needJust=res.filter(function(x){return x.justify;}).map(function(x){return x.key;});
  return {results:res,blocked:blocked,needJust:needJust,split:split};
}
function capResult(r,v,h,bucket,consumed,reserved,proposed,fxMiss,fx){
  const limit=Number(v.amount)||0;
  const out={r:r,v:v,key:capKey(r),name:r.name,period:v.period,bucket:bucket.label,limit:limit,currency:r.currency,
    consumed:consumed,reserved:reserved,proposed:proposed,available:Math.max(0,limit-consumed-reserved),
    exceeded:Math.max(0,consumed+reserved+proposed-limit),enforcement:v.enforcement,conflict:h.conflict,fx:fx,justify:false,result:'Within Limit'};
  if(fxMiss){out.result='Not evaluated';out.justify=v.enforcement==='Warning';return out;}
  if(out.exceeded>0){out.result=v.enforcement==='Blocking'?'Blocked':'Warning';out.justify=v.enforcement==='Warning';}
  return out;
}
sbToneAdd({'within-limit':'ok',warning:'wait',blocked:'bad','not-evaluated':'idle',blocking:'bad'});
function capResultBadge(x){return axBadge(x.result==='Warning'?'wait':statusTone(x.result),x.result);}

/* The block under Expense Category on the claim form and in the panel:
   every applicable policy with its numbers, and a justification box per
   Warning breach. just = {policyKey: text}. */
function epFormBlockHTML(ctx,just,readOnly){
  const ev=epEvaluate(ctx);
  const benefit=typeof wbClaimHintHTML==='function'?wbClaimHintHTML(ctx.category,ctx.eid):'';
  if(!ctx.category)return '';
  if(!ev.results.length)return '<div class="ea-hint exp-cap">No capping limit applies to '+sbEsc(ctx.category)+(ctx.lines&&ctx.lines.length?'':' yet - add an item to evaluate')+'.</div>'+benefit;
  let html='<div class="ep-eval">';
  ev.results.forEach(function(x){
    html+='<div class="ep-eval-row'+(x.result==='Blocked'?' is-bad':x.result==='Warning'?' is-wait':'')+'">'
      +'<div class="ep-eval-hd"><span class="ep-eval-name">'+sbEsc(x.name)+' <span class="wb-muted">'+x.key+' · '+sbEsc(capPeriodText(x.v))+(x.r.subCat?' · '+sbEsc(x.r.subCat):'')+'</span></span>'+capResultBadge(x)+'</div>'
      +'<div class="ep-eval-nums">'
        +'<span>Limit <b>'+expMoney(x.limit,x.currency)+'</b></span>'
        +(x.period==='Per Claim'?'':'<span>'+sbEsc(x.bucket)+' used <b>'+expMoney(x.consumed,x.currency)+'</b> · reserved <b>'+expMoney(x.reserved,x.currency)+'</b> · available <b>'+expMoney(x.available,x.currency)+'</b></span>')
        +'<span>This claim <b>'+expMoney(x.proposed,x.currency)+'</b>'+(x.fx&&x.fx.rate!==1?' <span class="wb-muted">(@ '+x.fx.rate.toFixed(4)+' on '+cdLabel(x.fx.date)+')':'')+'</span>'
        +(x.exceeded>0?'<span class="exp-cap-over">Over by <b>'+expMoney(x.exceeded,x.currency)+'</b></span>':'')
      +'</div>'
      +(x.result==='Not evaluated'?'<div class="ea-hint exp-cap-over">No exchange rate from '+sbEsc(ctx.currency)+' to '+x.currency+' - the limit could not be checked.</div>':'')
      +(x.result==='Blocked'?'<div class="ea-hint exp-cap-over">The expense exceeds the applicable policy limit by '+expMoney(x.exceeded,x.currency)+'. Please revise the amount or contact an authorized administrator.</div>':'')
      +(x.conflict?'<div class="ea-hint exp-cap-over">Two policies conflict here ('+x.conflict.map(capKey).join(', ')+'); the first applies until an administrator resolves it.</div>':'')
      +(x.justify?(readOnly
          ?'<div class="ep-just"><span class="lp-sb-field-label">Policy justification</span><div>'+(just&&just[x.key]?sbEsc(just[x.key]):'<span class="wb-warn">Not provided</span>')+'</div></div>'
          :'<div class="ep-just"><label class="ep-form-label">Policy justification <span class="req">*</span></label>'
            +'<textarea class="ep-form-input ax-notes" data-epjust="'+attrSafe(x.key)+'" placeholder="'+(x.result==='Not evaluated'?'Why this claim should proceed although the limit could not be checked':'The expense exceeds the applicable policy limit by '+expMoney(x.exceeded,x.currency)+'. Please provide a justification to continue.')+'">'+sbEsc((just||{})[x.key]||'')+'</textarea></div>'):'')
      +'</div>';
  });
  if(ev.split.length)html+='<div class="ea-hint exp-cap-over">Split "'+sbEsc(ev.split.join('", "'))+'" so each part falls in one '+(ev.results.find(function(x){return x.period!=='Per Claim';})||{period:'period'}).period.toLowerCase().replace('ly','')+' - a period cap cannot be evaluated across two periods.</div>';
  html+='</div>'+benefit;
  return html;
}
/* The approver's view of what was evaluated at submission (or live, if the
   claim predates the engine). */
function epClaimEvalHTML(r){
  const snap=r.policyEval;
  const results=snap?snap.results:epEvaluate(epCtxOf(r)).results;
  if(!results.length)return '';
  const rows=results.map(function(x){
    return '<tr><td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+sbEsc(x.name)+'</div><div class="lp-c-sub">'+x.key+' · '+sbEsc(x.period)+(x.bucket&&x.period!=='Per Claim'?' · '+sbEsc(x.bucket):'')+'</div></td>'
      +'<td class="csag-td">'+capResultBadge(x)+'</td>'
      +'<td class="csag-td wb-num">'+expMoney(x.limit,x.currency)+'</td>'
      +'<td class="csag-td wb-num">'+(x.period==='Per Claim'?'—':expMoney(x.consumed+x.reserved,x.currency))+'</td>'
      +'<td class="csag-td wb-num">'+(x.exceeded>0?'<span class="exp-cap-over">'+expMoney(x.exceeded,x.currency)+'</span>':'—')+'</td>'
      +'<td class="csag-td" style="white-space:normal">'+(x.justify?sbEsc((r.policyJust||{})[x.key]||'')||'<span class="wb-warn">Not provided</span>':'—')+'</td></tr>';
  }).join('');
  return '<div class="lp-sb-view-header" style="margin-top:14px"><span class="lp-sb-section-title">Policy Evaluation</span>'
    +'<span class="wb-muted">'+(snap?'At submission · '+sbEsc(snap.at):(r.status==='Draft'?'Live · not yet submitted':'Live · no submission snapshot (filed before policy checks)'))+'</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table ep-eval-table"><thead><tr><th>Policy</th><th>Result</th><th class="wb-num">Limit</th><th class="wb-num">Used</th><th class="wb-num">Exceeded</th><th>Justification</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'';
}
function epCtxOf(r){return {name:r.name,category:r.category,currency:r.currency,lines:r.lines,claimId:r.id};}
/* Store the snapshot on a claim at submission. */
function epSnapshot(r){
  const ev=epEvaluate(epCtxOf(r));const s=stampNow();
  r.policyEval={at:s.date+' | '+s.time,results:ev.results.map(function(x){return {key:x.key,name:x.name,period:x.period,bucket:x.bucket,limit:x.limit,currency:x.currency,consumed:x.consumed,reserved:x.reserved,proposed:x.proposed,exceeded:x.exceeded,result:x.result,enforcement:x.enforcement,justify:x.justify,version:x.v.v,fx:x.fx?{rate:x.fx.rate,date:x.fx.date}:null};})};
  return ev;
}
/* Submission gate: blocked → message; warning without justification → message. '' when fine. */
function epGate(ctx,just){
  const ev=epEvaluate(ctx);
  if(ev.split.length)return 'Split "'+ev.split[0]+'" so each part falls in one period.';
  const b=ev.results.find(function(x){return x.result==='Blocked';});
  if(b)return b.name+': the expense exceeds the applicable policy limit by '+expMoney(b.exceeded,b.currency)+'. Please revise the amount or contact an authorized administrator.';
  const nb=ev.results.find(function(x){return x.result==='Not evaluated'&&x.enforcement==='Blocking';});
  if(nb)return nb.name+' could not be evaluated: no exchange rate from '+ctx.currency+' to '+nb.currency+'.';
  const nj=ev.results.find(function(x){return x.justify&&!String((just||{})[x.key]||'').trim();});
  if(nj)return 'Policy justification is required for '+nj.name+'.';
  return '';
}

/* ── State ─────────────────────────────────────────────────────────────── */
let capSelectedId=null,capTab='basic-details';
let capLevelF='',capCatF='',capPeriodF='',capEnfF='',capStatusF='',capQ='';
let capEditing=false,capDraft=null,capDraftOrig='',capModalOpen=false,capVersionOpen=false;

/* ── Filters ───────────────────────────────────────────────────────────── */
function capRows(){
  return cappingData.filter(function(r){
    if(r.entity!==idEntity())return false;
    const v=capCurV(r);
    if(capLevelF&&r.level!==capLevelF)return false;
    if(capCatF&&r.category!==capCatF)return false;
    if(capPeriodF&&v.period!==capPeriodF)return false;
    if(capEnfF&&v.enforcement!==capEnfF)return false;
    if(capStatusF&&capShown(r)!==capStatusF)return false;
    return true;
  });
}
function capToggleStat(v){capStatusF=capStatusF===v?'':v;capSelectedId=null;renderADTPage();}
function applyCapFilters(){
  const pick=function(id,all){const v=getCSValue(id);return v&&v!==all?v:'';};
  capLevelF=pick('cap-f-level','All Levels');capCatF=pick('cap-f-cat','All Categories');
  capPeriodF=pick('cap-f-period','All Periods');capEnfF=pick('cap-f-enf','All Enforcement');
  capQ=lpSearchValue('cap-f-q');capSelectedId=null;renderADTPage();
}
function resetCapFilters(){capLevelF='';capCatF='';capPeriodF='';capEnfF='';capStatusF='';capQ='';capSelectedId=null;renderADTPage();}

/* ── Detail panel ──────────────────────────────────────────────────────── */
function capDropEdit(){capEditing=false;capDraft=null;capVersionOpen=false;}
function openCapSidebar(id,tab){
  if(capSelectedId!=null&&capSelectedId!==id&&sbLeaveGuard('cap',function(){openCapSidebar(id,tab);}))return;
  if(capSelectedId!==id)capDropEdit();
  capTab=tab||sbKeepTab(capSelectedId,capTab);capSelectedId=id;
  const sb=document.getElementById('cap-split-sb');if(sb)sb.classList.add('open');
  isbTab('cap',renderCapSidebar);
  document.querySelectorAll('.cap-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='cap-row-'+id);});
}
function closeCapSidebar(){
  if(sbLeaveGuard('cap',closeCapSidebar))return;
  capDropEdit();capSelectedId=null;
  const sb=document.getElementById('cap-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.cap-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navCapTab(t){if(capEditing&&!sbHasDraft('cap'))capDropEdit();capTab=t;isbTab('cap',renderCapSidebar);}

function capSeedLogs(r){
  const p=String(r.createdAt).split(' | ');
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:r.createdBy,status:'Draft',action:'Policy created at '+capMoney(r,r.versions[0])+' '+capPeriodText(r.versions[0])+', '+r.versions[0].enforcement+'.'}];
  if(r.activatedOn)fx.unshift({date:p[0],time:'10:00:00 AM',user:r.createdBy,status:'Active',action:'Activated.'});
  if(r.status==='Inactive')fx.unshift({date:p[0],time:'06:00:00 PM',user:'Shaun Mathew',status:'Inactive',action:r.desc||'No longer in use.'});
  return seedLogs(r,fx);
}
const CAP_STEP_TITLE={'Draft':'Policy Drafted','Active':'Policy Active','Inactive':'Policy Deactivated'};
function capWorkflow(r){
  const done=wfDoneFromLogs(capSeedLogs(r),function(st){return CAP_STEP_TITLE[st]||st;});
  const LEFT={'Draft':[{title:'Activate',owner:'HR Admin'}],'Inactive':[{title:'Reactivate',owner:'HR Admin'}]};
  return wfPlan(done,LEFT[r.status]||[]);
}
const CAP_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
};
function renderCapSidebar(){
  const r=capRec(capSelectedId);if(!r)return '';
  const v=capCurV(r);
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'utilization',label:'Utilization'},{id:'versions',label:'Versions'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const tabBar=axTabBar('cap',tabs,capTab,'navCapTab','closeCapSidebar');
  const canEdit=capCan('expense.policy.manage');
  const hero=function(editing,edit){return sbHero({icon:CAP_ICO.hero,name:r.name,meta:[capKey(r),r.level,r.category+(r.subCat?' · '+r.subCat:'')],
    status:axBadge(statusTone(capShown(r)),capShown(r)),editing:editing,onEdit:edit});};
  let body='';
  if(capTab==='basic-details'&&capEditing){
    body=hero(true)+axInlineFormHTML(capFieldsHTML(r),'capCancelEdit()','capSaveEdit()');
  }else if(capTab==='basic-details'){
    const conf=r.status==='Draft'?capConflicts(r):[];
    body=hero(false,canEdit&&r.status!=='Inactive'?'capStartEdit()':'')
      +(conf.length?'<div class="wb-note is-bad"><b>Conflict</b> · '+conf.map(function(c){return capKey(c)+' '+sbEsc(c.name);}).join(', ')+'<div class="wb-note-sub">Same level, scope, category, sub category and period with overlapping dates. End-date one or narrow its scope before activating.</div></div>':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Policy Name',sbEsc(r.name))
      +axField(AX_ICO.fBox,'Expense Category',sbEsc(r.category)+(r.subCat?' <span class="ax-sub">'+sbEsc(r.subCat)+'</span>':''))
      +axField(CAP_ICO.layers,'Applies To',r.level+' <span class="ax-sub">'+sbEsc(CAP_LEVEL_HINT[r.level])+'</span>')
      +axField(AX_ICO.fBuild,'Department',r.dept||(r.level==='Position'?'Every department':'—'))
      +axField(AX_ICO.fUser,'Position',r.position||'—')
      +axField(AX_ICO.fUser,r.level==='Employee'?'Employee':'Restricted to employee',r.employeeEid?sbEsc(idEmpName(r.employeeEid)):'Not set for one employee')
      +axField(AX_ICO.fCash,'Limit',capMoney(r,v)+' <span class="ax-sub">'+sbEsc(capPeriodText(v))+'</span>')
      +axField(AX_ICO.fTag,'Enforcement',axBadge(v.enforcement==='Blocking'?'bad':'wait',v.enforcement)+' <span class="ax-sub">'+(v.enforcement==='Blocking'?'over the limit cannot be submitted':'over the limit needs a justification')+'</span>')
      +axField(AX_ICO.fCash,'Currency',r.currency)
      +axField(AX_ICO.fCal,'Effective Period',wbRange(r.effFrom,r.effTo))
      +axField(AX_ICO.fTag,'Version','v'+v.v+' of '+r.versions.length)
      +axField(AX_ICO.fUser,'Created By',sbEsc(r.createdBy))
      +(r.level==='Employee'?axField(CAP_ICO.note,'Exception Reason',sbEsc(r.reason),true):'')
      +axField(CAP_ICO.note,'Description',sbEsc(r.desc),true)
      +'</div>';
  }else if(capTab==='utilization'){
    body=capUtilizationHTML(r);
  }else if(capTab==='versions'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Versions</span>'
      +(r.status==='Active'&&canEdit?'<button class="btn btn-outline btn-sm" onclick="capStartVersion()">New version</button>':'')+'</div>'
      +(capVersionOpen?capVersionFormHTML(r):'')
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>Limit</th><th>Period</th><th>Enforcement</th><th>Effective</th><th>Reason</th></tr></thead><tbody>'
      +r.versions.slice().reverse().map(function(x){return '<tr><td class="csag-td">v'+x.v+(x===v?' <span class="wb-muted">current</span>':'')+'</td><td class="csag-td">'+capMoney(r,x)+'</td><td class="csag-td">'+sbEsc(capPeriodText(x))+'</td><td class="csag-td">'+x.enforcement+'</td><td class="csag-td">'+wbRange(x.effFrom,x.effTo)+'</td><td class="csag-td" style="white-space:normal">'+sbEsc(x.reason||'Created')+'</td></tr>';}).join('')
      +'</tbody></table></div><div class="wb-note">An active policy changes only through a new version from a future date.</div>';
  }else if(capTab==='logs'){
    body=lpLogsView(capSeedLogs(r),capLogFormHTML(r,capCan('expense.policy.activate')?(CAP_MOVES[r.status]||[]):[]),{labels:CAP_MOVE_LABELS});
  }else if(capTab==='history'){
    body=sbHistoryHTML(r);
  }else body=wfTimelineHTML(capWorkflow(r));
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* Employee-wise usage of this policy in the current period. */
function capUtilizationHTML(r){
  if(!capCan('expense.policy.util.view'))return '<div class="wb-empty-sm">Utilization is for administrators.</div>';
  const v=capCurV(r);
  const people=(typeof expPeople==='function'?expPeople():[]).filter(function(p){return capScopeHit(r,p);});
  const today=wbToday();const b=v.period==='Per Claim'?null:capBucket(v,today);
  const rows=[];
  people.forEach(function(p){
    let consumed=0,reserved=0,breaches=0;
    if(b){const u=capUsage(r,v,p,b,null);consumed=u.consumed;reserved=u.reserved;}
    (typeof expensesData!=='undefined'?expensesData:[]).forEach(function(c){
      if(c.name!==p.name||!c.policyEval)return;
      c.policyEval.results.forEach(function(x){if(x.key===capKey(r)&&(x.result==='Warning'||x.result==='Blocked'))breaches++;});
    });
    if(!b){ // per claim: show the largest claim this month instead
      rows.push([p.name,'—','—','—',breaches]);return;
    }
    rows.push([p.name,consumed,reserved,Math.max(0,v.amount-consumed-reserved),breaches]);
  });
  const nonZero=rows.filter(function(x){return x[1]!=='—'?(x[1]||x[2]||x[4]):x[4];});
  const show=nonZero.length?nonZero:rows.slice(0,10);
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Utilization · '+(b?sbEsc(b.label):'Per claim')+'</span>'
    +(capCan('expense.policy.export')?'<button class="btn btn-outline btn-sm" onclick="capExportUtil('+r.id+')">Export</button>':'')+'</div>'
    +'<div class="wb-proj-cards"><div class="wb-proj-card"><span>In scope</span><b>'+people.length+'</b><em>employees</em></div>'
    +'<div class="wb-proj-card"><span>Limit</span><b>'+capMoney(r,v)+'</b><em>'+sbEsc(capPeriodText(v))+' · '+v.enforcement+'</em></div></div>'
    +(show.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Employee</th><th>Consumed</th><th>Reserved</th><th>Available</th><th>Breaches</th></tr></thead><tbody>'
      +show.map(function(x){return '<tr><td class="csag-td">'+sbEsc(x[0])+'</td><td class="csag-td wb-num">'+(x[1]==='—'?'—':expMoney(x[1],r.currency))+'</td><td class="csag-td wb-num">'+(x[2]==='—'?'—':expMoney(x[2],r.currency))+'</td><td class="csag-td wb-num">'+(x[3]==='—'?'—':expMoney(x[3],r.currency))+'</td><td class="csag-td">'+x[4]+'</td></tr>';}).join('')
      +'</tbody></table></div>'+(nonZero.length?'':'<div class="wb-muted">No usage yet; first 10 employees in scope shown.</div>'):'<div class="wb-empty-sm">Nobody is in scope.</div>')
    +'<div class="wb-note">Consumed: approved and paid claims. Reserved: claims in approval or Follow-Up.</div>';
}
function capExportUtil(id){
  const r=capRec(id);if(!r)return;
  const v=capCurV(r);const b=v.period==='Per Claim'?null:capBucket(v,wbToday());
  const people=(typeof expPeople==='function'?expPeople():[]).filter(function(p){return capScopeHit(r,p);});
  const rows=people.map(function(p){const u=b?capUsage(r,v,p,b,null):{consumed:'',reserved:''};return [capKey(r),r.name,p.name,p.dept,p.position,r.category,r.subCat,b?b.label:'Per Claim',v.amount,u.consumed,u.reserved,b?Math.max(0,v.amount-u.consumed-u.reserved):'',v.enforcement];});
  wbCSV('policy-utilization-'+r.key,['Policy ID','Policy','Employee','Department','Position','Category','Subcategory','Period','Limit','Consumed','Reserved','Available','Enforcement'],rows);
  showToast('Export ready','success',rows.length+' employees exported.');
}
function capExportPolicies(){
  if(!capCan('expense.policy.export')){capDeny('export policies');return;}
  const rows=lpSearchRows(capRows(),capQ);
  if(!rows.length){showToast('Nothing to export','info');return;}
  wbCSV('capping-limits',['Policy ID','Policy','Category','Subcategory','Applies To','Scope','Employee','Limit','Currency','Period','Enforcement','Effective From','Effective To','Status','Version'],
    rows.map(function(r){const v=capCurV(r);return [capKey(r),r.name,r.category,r.subCat,r.level,capTarget(r),idEmpName(r.employeeEid),v.amount,r.currency,capPeriodText(v),v.enforcement,r.effFrom,r.effTo,capShown(r),'v'+v.v];}));
  showToast('Export ready','success',rows.length+' policies exported.');
}
function capLogFormHTML(r,moves){
  return '<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+capShown(r)+'</div>'
    +'<p class="lp-logs-form-sub">Activate or deactivate this policy and say why</p>'
    +lpLogStatusField('cap-log-status-sel',r.status,[r.status].concat(moves))
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="cap-log-comment-inp" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="navCapTab(\'logs\')">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="capSaveLog('+r.id+')">Submit</button>'
    +'</div></div>';
}
/* Same-level, same-scope, same category/sub category/period, overlapping dates. */
function capConflicts(r,versions){
  const vs=versions||r.versions;const out=[];
  cappingData.forEach(function(q){
    if(q===r||q.id===r.id||q.entity!==r.entity||!capInForce(q)||q.category!==r.category||(q.subCat||'')!==(r.subCat||''))return;
    if(capRank(q)!==capRank(r)||q.level!==r.level||q.dept!==r.dept||q.position!==r.position||(q.employeeEid||'')!==(r.employeeEid||''))return;
    q.versions.forEach(function(qv){vs.forEach(function(v){
      if(qv.period===v.period&&(qv.basis||'')===(v.basis||'')&&wbOverlap(v.effFrom,v.effTo,qv.effFrom,qv.effTo)&&out.indexOf(q)<0)out.push(q);
    });});
  });
  return out;
}
function capSaveLog(id){
  const r=capRec(id);if(!r)return;
  if(!capCan('expense.policy.activate')){capDeny('activate or deactivate a policy');return;}
  const to=getCSValue('cap-log-status-sel');
  if(to==='Active'&&r.status!=='Active'){
    const conf=capConflicts(r);
    if(conf.length){showToast('Policy conflict','error',conf.map(function(c){return capKey(c)+' '+c.name;}).join(', ')+'. See Basic Details.');return;}
  }
  capSeedLogs(r);
  const was=r.status;
  if(!lpCommitLog(r,'cap-log-status-sel','cap-log-comment-inp',r.logs))return;
  if(r.status==='Active'&&was!=='Active'){r.activatedOn=r.activatedOn||wbToday();if(was==='Inactive'&&r.restore){r.versions.forEach(function(v,i){v.effTo=r.restore[i];});r.restore=null;}}
  if(r.status==='Inactive'&&was!=='Draft'){const t=wbToday();r.restore=r.versions.map(function(v){return v.effTo;});r.versions.forEach(function(v){if(v.effFrom>t)v.effTo=wbAddDays(v.effFrom,-1);else if(!v.effTo||v.effTo>t)v.effTo=t;});}
  capSyncDates(r);
  renderADTPage();
  showToast('Log added','success',capKey(r)+' is now '+capShown(r)+'.');
}

/* ── The form: panel Edit and the + Add popup share it ─────────────────── */
function capStartEdit(){
  const r=capRec(capSelectedId);if(!r)return;
  if(!capCan('expense.policy.manage')){capDeny('edit a policy');return;}
  const v=r.versions[0];
  capEditing=true;capTab='basic-details';
  capDraft={name:r.name,level:r.level,category:r.category,subCat:r.subCat,dept:r.dept,position:r.position,employeeEid:r.employeeEid,reason:r.reason,
    currency:r.currency,amount:String(v.amount),period:v.period,basis:v.basis||CAP_BASIS[0],enforcement:v.enforcement,effFrom:v.effFrom,effTo:r.versions[r.versions.length-1].effTo,desc:r.desc};
  capDraftOrig=JSON.stringify(capDraft);
  renderADTPage();
}
function capCancelEdit(){capDropEdit();renderADTPage();}
function capSync(){
  if(!capDraft)return;
  [['name','cap-e-name'],['amount','cap-e-amt'],['desc','cap-e-desc'],['reason','cap-e-reason'],['effFrom','cap-e-from'],['effTo','cap-e-to']].forEach(function(p){const el=document.getElementById(p[1]);if(el)capDraft[p[0]]=el.value.trim();});
  [['level','cap-e-level'],['category','cap-e-cat'],['subCat','cap-e-sub'],['dept','cap-e-dept'],['position','cap-e-pos'],['currency','cap-e-cur'],['period','cap-e-period'],['basis','cap-e-basis'],['enforcement','cap-e-enf']]
    .forEach(function(p){if(document.getElementById('csw-'+p[1]))capDraft[p[0]]=getCSValue(p[1]);});
  /* The picker shows names; the policy keeps the Employee ID. */
  if(document.getElementById('csw-cap-e-emp'))capDraft.employeeEid=expPersonFromLabel(getCSValue('cap-e-emp'),capPeople());
}
function capFormHook(){
  const was={level:capDraft&&capDraft.level,category:capDraft&&capDraft.category};
  capSync();
  if(capDraft&&was.category!==capDraft.category)capDraft.subCat='';
  if(capDraft&&was.level!==capDraft.level){if(capDraft.level!=='Employee')capDraft.reason='';}
  if(capModalOpen&&typeof formRepaintParts==='function'&&formRepaintParts(buildAddCapModalHTML(),['cap-m-grid']))return;
  renderADTPage();
}
function capFieldsHTML(rec){
  const d=capDraft,lv=d.level;
  const live=!!(rec&&rec.status!=='Draft');
  const deptOn=lv==='Department'||lv==='Position',posOn=lv==='Position',empOn=lv==='Employee';
  const yearOn=d.period==='Quarterly'||d.period==='Annual';
  const sel=function(id,label,opts,val,ph,req,hook){return '<div class="ep-form-group"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+apCS(id,opts,val,ph,hook)+'</div>';};
  const dim=function(on,inner,why,full){return '<div class="ep-form-group'+(on?'':' exp-dim')+(full?' ep-form-full':'')+'">'+inner+(on?'':'<div class="ea-hint">'+why+'</div>')+'</div>';};
  const ro=function(label,val){return '<div class="ep-form-group"><label class="ep-form-label">'+label+'</label><input class="ep-form-input ca-ro" readonly value="'+attrSafe(val)+'"></div>';};
  let html='<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="cap-e-name">Policy Name <span class="req">*</span></label>'
      +'<input class="ep-form-input" id="cap-e-name" value="'+attrSafe(d.name)+'" placeholder="e.g. Sales team travel"></div>';
  if(live){
    html+=ro('Expense Category',d.category+(d.subCat?' · '+d.subCat:''))+ro('Applies To',lv+(d.dept?' · '+d.dept:'')+(d.position?' · '+d.position:'')+(d.employeeEid?' · '+idEmpName(d.employeeEid):''))
      +ro('Limit',d.amount+' '+d.currency+' · '+d.period)+ro('Enforcement',d.enforcement)
      +'<div class="ep-form-group"><label class="ep-form-label">Effective To</label>'+apCD('cap-e-to',d.effTo,'Open-ended')+'</div>';
  }else{
    html+=sel('cap-e-cat','Expense Category',capCategories(),d.category,'Select Category',true,'capFormHook')
      +dim(!!d.category,'<label class="ep-form-label">Sub Category</label>'+apCS('cap-e-sub',capSubCats(d.category),d.subCat,'Whole category'),'Pick a category first.')
      +'<div class="ep-form-group"><label class="ep-form-label">Applies To <span class="req">*</span></label>'+apCS('cap-e-level',CAP_LEVELS,lv,'Select Level','capFormHook')+(lv?'<div class="ea-hint">'+CAP_LEVEL_HINT[lv]+'</div>':'')+'</div>'
      +dim(deptOn,'<label class="ep-form-label">Department'+(lv==='Department'?' <span class="req">*</span>':'')+'</label>'+apCS('cap-e-dept',capDepts(),deptOn?d.dept:'',lv==='Position'?'Every department':'Select Department'),lv?'Not used for a '+lv+' policy.':'Pick a level first.')
      +dim(posOn,'<label class="ep-form-label">Position <span class="req">*</span></label>'+axCS('cap-e-pos',capPositions(),posOn?d.position:'','Search Position'),lv?'Only for a Position policy.':'Pick a level first.')
      +'<div class="ep-form-group"><label class="ep-form-label">Employee'+(empOn?' <span class="req">*</span>':'')+'</label>'+(function(){const pool=capPeople();return axCS('cap-e-emp',pool.map(function(e){return expPersonLabel(e,pool);}),d.employeeEid?expPersonLabel(d.employeeEid,pool):'','Search Employee','capFormHook');})()
        +'<div class="ea-hint">'+(empOn?'The exception applies to this employee only.':'Optional: restrict this policy to one employee in the scope.')+'</div></div>'
      +(empOn||d.employeeEid?'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="cap-e-reason">Exception Reason <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="cap-e-reason" placeholder="Why this employee has a different limit">'+sbEsc(d.reason||'')+'</textarea></div>':'')
      +sel('cap-e-period','Limit Period',CAP_PERIODS,d.period,'Select Period',true,'capFormHook')
      +dim(yearOn,'<label class="ep-form-label">Year Basis <span class="req">*</span></label>'+apCS('cap-e-basis',CAP_BASIS,yearOn?d.basis:'','Select Basis'),'Only for Quarterly and Annual.')
      +sel('cap-e-enf','Enforcement',CAP_ENFORCE,d.enforcement,'Select',true)
      +sel('cap-e-cur','Base Currency',capCurrencies(),d.currency,'Select Currency',true)
      +'<div class="ep-form-group"><label class="ep-form-label" for="cap-e-amt">Amount Limit <span class="req">*</span></label>'
        +'<div class="ax-currency"><span>'+(d.currency||'—')+'</span><input class="ep-form-input" id="cap-e-amt" type="number" min="0" step="0.01" value="'+attrSafe(d.amount)+'" placeholder="0.00"></div></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Effective From <span class="req">*</span></label>'+apCD('cap-e-from',d.effFrom,'Select date')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Effective To</label>'+apCD('cap-e-to',d.effTo,'Open-ended')+'</div>';
  }
  html+='<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="cap-e-desc">Description</label>'
      +'<textarea class="ep-form-input ax-notes" id="cap-e-desc" placeholder="What this limit covers">'+attrSafe(d.desc||'')+'</textarea></div>'
    +(d.enforcement?'<div class="ep-form-group ep-form-full"><div class="ea-hint">'+(d.enforcement==='Blocking'?'Blocking: a claim over the limit cannot be submitted until it is revised.':'Warning: a claim over the limit needs a justification and goes to the approver.')+'</div></div>':'')
    +(live?'<div class="ep-form-group ep-form-full"><div class="ea-hint">Category, scope, limit, period and enforcement are locked on an active policy. Use Versions → New version.</div></div>':'');
  return html;
}
function capCheck(d,selfId,draftOnly){
  const need=[['name','Policy Name'],['category','Expense Category'],['level','Applies To'],['period','Limit Period'],['enforcement','Enforcement'],['currency','Base Currency'],['amount','Amount Limit'],['effFrom','Effective From']];
  if(d.level==='Department')need.push(['dept','Department']);
  if(d.level==='Position')need.push(['position','Position']);
  if(d.level==='Employee')need.push(['employeeEid','Employee'],['reason','Exception Reason']);
  if(d.employeeEid&&d.level!=='Employee')need.push(['reason','Exception Reason']);
  if(d.period==='Quarterly'||d.period==='Annual')need.push(['basis','Year Basis']);
  for(let i=0;i<need.length;i++){if(!String(d[need[i][0]]||'').trim()){showToast(need[i][1]+' is required','error');return false;}}
  const n=parseFloat(d.amount);
  if(isNaN(n)||n<=0){showToast('Amount Limit must be more than 0','error');return false;}
  if(d.effTo&&d.effTo<d.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}
  if(d.subCat&&capSubCats(d.category).indexOf(d.subCat)<0){showToast('Sub Category must belong to '+d.category,'error');return false;}
  if(d.level==='Category-Wide'){d.dept='';d.position='';}
  if(d.level==='Department')d.position='';
  if(d.level==='Employee'){d.dept='';d.position='';}
  if(d.period!=='Quarterly'&&d.period!=='Annual')d.basis='';
  return true;
}
function capRecFromDraft(d,base){
  const r=Object.assign({},base||{},{name:d.name,level:d.level,category:d.category,subCat:d.subCat||'',dept:d.dept,position:d.position,employeeEid:d.employeeEid||'',reason:d.reason||'',currency:d.currency,desc:d.desc||''});
  r.versions=[capV(1,parseFloat(d.amount),d.period,d.enforcement,d.effFrom,d.effTo||'',{basis:d.basis||''})];
  return r;
}
function capSaveEdit(){
  const r=capRec(capSelectedId);if(!r||!capDraft)return;
  capSync();
  const d=capDraft;
  if(r.status==='Draft'){
    if(!capCheck(d,r.id))return;
    const nr=capRecFromDraft(d,r);Object.assign(r,nr);capSyncDates(r);
  }else{
    if(d.effTo&&d.effTo<r.effFrom){showToast('Effective To cannot be before Effective From','error');return;}
    r.name=d.name;r.desc=d.desc||'';r.versions[r.versions.length-1].effTo=d.effTo||'';capSyncDates(r);
  }
  capDropEdit();renderADTPage();
  showToast('Capping limit updated','success',capKey(r)+' saved.');
}
/* New version: limit, period, enforcement from a future date. */
function capStartVersion(){capVersionOpen=true;isbTab('cap',renderCapSidebar);}
function capVersionFormHTML(r){
  const v=capCurV(r);
  return '<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">New version</span></div><div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Amount Limit <span class="req">*</span></label><div class="ax-currency"><span>'+r.currency+'</span><input class="ep-form-input" id="cap-v-amt" type="number" min="0" step="0.01" value="'+v.amount+'"></div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Limit Period <span class="req">*</span></label>'+apCS('cap-v-period',CAP_PERIODS,v.period,'Select')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Year Basis</label>'+apCS('cap-v-basis',CAP_BASIS,v.basis||'','Only for Quarterly / Annual')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Enforcement <span class="req">*</span></label>'+apCS('cap-v-enf',CAP_ENFORCE,v.enforcement,'Select')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Effective From <span class="req">*</span></label>'+apCD('cap-v-from',wbAddDays(wbToday(),1),'Select date')+'<div class="ea-hint">Must be in the future; the current version ends the day before.</div></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Reason for the change <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="cap-v-reason"></textarea></div>'
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="capVersionOpen=false;isbTab(\'cap\',renderCapSidebar)">Cancel</button><button class="ep-save-btn" onclick="capSubmitVersion('+r.id+')">Create Version</button></div></div>';
}
function capSubmitVersion(id){
  const r=capRec(id);if(!r)return;
  if(!capCan('expense.policy.manage')){capDeny('version a policy');return;}
  const amt=parseFloat((document.getElementById('cap-v-amt')||{}).value),period=getCSValue('cap-v-period'),basis=getCSValue('cap-v-basis'),enf=getCSValue('cap-v-enf');
  const from=(document.getElementById('cap-v-from')||{}).value||'',reason=((document.getElementById('cap-v-reason')||{}).value||'').trim();
  if(!(amt>0)){showToast('Amount Limit must be more than 0','error');return;}
  if(!period||!enf){showToast('Limit Period and Enforcement are required','error');return;}
  if((period==='Quarterly'||period==='Annual')&&!basis){showToast('Year Basis is required','error');return;}
  if(!reason){showToast('Reason for the change is required','error');return;}
  const last=r.versions[r.versions.length-1];
  if(!from||from<=wbToday()||from<=last.effFrom){showToast('A new version must start in the future','error','Claims already submitted keep the version they were evaluated against.');return;}
  const nv=capV(last.v+1,amt,period,enf,from,last.effTo&&last.effTo>=from?last.effTo:'',{basis:(period==='Quarterly'||period==='Annual')?basis:'',reason:reason,by:capActor(),byId:capActorId()});
  const conf=capConflicts(r,[nv]);
  if(conf.length){showToast('Policy conflict','error',conf.map(function(c){return capKey(c)+' '+c.name;}).join(', '));return;}
  const before=capMoney(r,last)+' '+capPeriodText(last)+' '+last.enforcement;
  last.effTo=wbAddDays(from,-1);r.versions.push(nv);capSyncDates(r);
  capSeedLogs(r);const s=stampNow();
  r.logs.unshift({date:s.date,time:s.time,user:capActor(),userId:capActorId(),status:capShown(r),action:'Version '+nv.v+' from '+cdLabel(from)+': '+before+' → '+capMoney(r,nv)+' '+capPeriodText(nv)+' '+enf+'. Reason: '+reason});
  capVersionOpen=false;renderADTPage();
  showToast('Version '+nv.v+' created','success',capKey(r)+' changes on '+cdLabel(from)+'.');
}

/* ── + Add ─────────────────────────────────────────────────────────────── */
function startAddCap(){
  if(page!=='capping-limit')navigatePage('capping-limit');
  if(!capCan('expense.policy.manage')){capDeny('add a policy');return;}
  capDropEdit();
  capDraft={name:'',level:'',category:'',subCat:'',dept:'',position:'',employeeEid:'',reason:'',currency:'INR',amount:'',period:'',basis:CAP_BASIS[0],enforcement:'Warning',effFrom:wbToday(),effTo:'',desc:''};
  capModalOpen=true;renderADTPage();
}
function cancelAddCap(){capModalOpen=false;capDraft=null;renderADTPage();}
function buildAddCapModalHTML(){
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Add Capping Limit</span>'
      +'<button class="ct-modal-close" onclick="cancelAddCap()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">The most a claim in one expense category may come to - per claim or per period - and what happens over the limit. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid" id="cap-m-grid">'+capFieldsHTML(null)+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddCap()">Cancel</button>'
      +'<button class="btn-outline" onclick="submitAddCap(false)">Save as Draft</button>'
      +'<button class="ep-save-btn" onclick="submitAddCap(true)">Save & Activate</button>'
    +'</div></div>'
    +'</div></div>';
}
function submitAddCap(activate){
  capSync();
  const d=capDraft;
  if(!capCheck(d,null))return;
  const s=stampNow();
  const r=capRecFromDraft(d,{id:capNextId++,key:capNextKey++,status:'Draft',createdBy:capActor(),createdById:capActorId(),entity:idEntity(),createdAt:axStamp()});
  capSyncDates(r);
  r.logs=[{date:s.date,time:s.time,user:capActor(),userId:capActorId(),status:'Draft',action:'Policy created at '+capMoney(r)+' '+capPeriodText(r.versions[0])+', '+d.enforcement+'.'}];
  cappingData.unshift(r);
  if(activate){
    if(!capCan('expense.policy.activate')){capDeny('activate a policy');}
    else{
      const conf=capConflicts(r);
      if(conf.length)showToast('Saved as draft','info','Policy conflict with '+conf.map(function(c){return capKey(c)+' '+c.name;}).join(', ')+'. Resolve it, then activate.');
      else{r.status='Active';r.activatedOn=wbToday();r.logs.unshift({date:s.date,time:s.time,user:capActor(),userId:capActorId(),status:'Active',action:'Activated on creation.'});}
    }
  }
  lpLanded('capping-limit',r.id);
  capModalOpen=false;capDraft=null;renderADTPage();
  showToast('Capping limit saved','success',capKey(r)+' · '+capMoney(r)+' '+capPeriodText(r.versions[0])+' · '+capShown(r)+'.');
}

/* ── Listing ───────────────────────────────────────────────────────────── */
function buildCappingLimitHTML(){
  if(!capCan('expense.policy.view'))return '<div class="lp-page"><div class="wb-empty"><b>No access</b><span>Capping Limit needs the expense.policy.view permission.</span></div></div>';
  const count=function(s){return cappingData.filter(function(r){return r.entity===idEntity()&&capShown(r)===s;}).length;};
  const shown=lpSearchRows(capRows(),capQ);
  if(capSelectedId&&!shown.some(function(r){return r.id===capSelectedId;}))capSelectedId=null;
  const pgn=listPage('capping-limit',[capLevelF,capCatF,capPeriodF,capEnfF,capStatusF,capQ].join('|'),shown.map(function(r,i){
    const v=capCurV(r);
    return '<tr class="cap-row'+(capSelectedId===r.id?' lp-row-selected':'')+'" id="cap-row-'+r.id+'" style="cursor:pointer" onclick="openCapSidebar('+r.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(r.name)+'">'+sbEsc(r.name)+'</div><div class="lp-c-sub">'+capKey(r)+' · v'+v.v+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(r.category)+'">'+sbEsc(r.category)+'</div>'+(r.subCat?'<div class="lp-c-sub">'+sbEsc(r.subCat)+'</div>':'')+'</td>'
      +'<td><div class="lp-c-plain">'+r.level+'</div><div class="lp-c-sub ax-c-trunc" title="'+attrSafe(capTarget(r))+'">'+sbEsc(capTarget(r))+(r.employeeEid&&r.level!=='Employee'?' · '+sbEsc(idEmpName(r.employeeEid)):'')+'</div></td>'
      +'<td class="cap-c-amt"><div class="lp-c-plain">'+capMoney(r,v)+'</div><div class="lp-c-sub">'+sbEsc(v.period)+' · <span class="'+(v.enforcement==='Blocking'?'exp-cap-over':'')+'">'+v.enforcement+'</span></div></td>'
      +'<td><div class="lp-c-plain">'+cdLabel(r.effFrom)+'</div><div class="lp-c-sub">'+(r.effTo?'to '+cdLabel(r.effTo):'Open-ended')+'</div></td>'
      +'<td>'+axBadge(statusTone(capShown(r)),capShown(r))+'</td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('capping-limit',r.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No capping limits match this filter.</td></tr>');
  const stat=function(s){
    return '<div class="listing-stat'+(capStatusF===s?' stat-selected':'')+'" onclick="capToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top cap-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('cap-f-q',capQ,'Search policies','applyCapFilters()')
    +apCS('cap-f-cat',capCategories(),capCatF,'All Categories')
    /* Main filters only (product owner, 10 Nov 2026): a secondary filter shows only while it is set, so nothing filters out of sight. */
    +(capLevelF?apCS('cap-f-level',CAP_LEVELS,capLevelF,'All Levels'):'')
    +(capPeriodF?apCS('cap-f-period',CAP_PERIODS,capPeriodF,'All Periods'):'')
    +(capEnfF?apCS('cap-f-enf',CAP_ENFORCE,capEnfF,'All Enforcement'):'')
    +clearFiltersBtn([capLevelF,capCatF,capPeriodF,capEnfF,capStatusF,capQ],'resetCapFilters()')
    +'<button class="lp-pill-search" onclick="applyCapFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'+CAP_TILES.map(stat).join('')+'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="cap-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table cap-table"><thead><tr><th>S. No</th><th>Policy</th><th>Category</th><th>Applies To</th>'
      +'<th>Limit</th><th>Effective</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(capSelectedId?' open':'')+'" id="cap-split-sb"><div class="lp-isb" id="cap-isb-inner">'+(capSelectedId?sbRender(renderCapSidebar,'cap'):'')+'</div></div>'
    +'</div></div>'
    +(capModalOpen?buildAddCapModalHTML():'');
}

/* ── Wiring ────────────────────────────────────────────────────────────── */
Object.assign(supportPageMeta,{'capping-limit':{title:'Capping Limit',context:'Capping Limit',filters:[],columns:[],rows:[]}});
if(typeof LP_ROW_PREFIX!=='undefined')LP_ROW_PREFIX['capping-limit']='cap';
sbDraftReg('cap',{
  dirty:function(){
    if(!capEditing||capModalOpen)return false;
    capSync();
    return JSON.stringify(capDraft)!==capDraftOrig;
  },
  drop:capDropEdit});
